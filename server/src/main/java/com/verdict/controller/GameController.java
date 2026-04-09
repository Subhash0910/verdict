package com.verdict.controller;

import com.verdict.entity.GameSession;
import com.verdict.repository.GameSessionRepository;
import com.verdict.service.GameMasterService;
import com.verdict.service.GameStateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
@Slf4j
public class GameController {

    private final GameSessionRepository sessionRepo;
    private final GameMasterService gameMasterService;
    private final GameStateService gameStateService;
    private final SimpMessagingTemplate messagingTemplate;

    private static final int MIN_PLAYERS = 1;

    @PostMapping("/{roomCode}/start")
    public ResponseEntity<Map<String, String>> startGame(
            @PathVariable String roomCode,
            @RequestBody Map<String, Object> body) {

        GameSession session = sessionRepo.findByRoomCode(roomCode).orElse(null);
        if (session == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Room not found: " + roomCode));

        String requestingPlayerId = (String) body.get("playerId");
        if (!session.getHostPlayerId().equals(requestingPlayerId))
            return ResponseEntity.status(403).body(Map.of("error",
                    "Only host can start. Sent: " + requestingPlayerId + ", host: " + session.getHostPlayerId()));

        if (session.getStatus() == GameSession.GameStatus.ENDED)
            return ResponseEntity.badRequest().body(Map.of("error", "Game already ended"));

        if (session.getPlayerIds().size() < MIN_PLAYERS)
            return ResponseEntity.badRequest().body(Map.of("error", "Need at least " + MIN_PLAYERS + " player(s)"));

        session.setStatus(GameSession.GameStatus.IN_PROGRESS);
        sessionRepo.save(session);

        @SuppressWarnings("unchecked")
        List<String> displayNames = body.get("playerNames") instanceof List
                ? (List<String>) body.get("playerNames")
                : session.getPlayerIds();

        var setup = gameMasterService.generateGameSetup(displayNames.size(), displayNames);
        gameStateService.storeSetup(roomCode, setup);

        messagingTemplate.convertAndSend("/topic/lobby/" + roomCode, Map.of(
                "type", "GAME_STARTING",
                "theme", setup.getTheme(),
                "synopsis", setup.getSynopsis()
        ));

        new Thread(() -> {
            try {
                Thread.sleep(1500);
                setup.getRoles().forEach(role ->
                    messagingTemplate.convertAndSend(
                        "/topic/game/" + roomCode + "/role/" + role.getPlayerName(),
                        Map.of("type","ROLE_REVEAL",
                               "roleName",role.getRoleName(),
                               "alignment",role.getAlignment(),
                               "winCondition",role.getWinCondition(),
                               "ability",role.getAbility(),
                               "restriction",role.getRestriction())
                    )
                );

                Thread.sleep(30_000);
                var state = gameStateService.getState(roomCode);
                if (state != null) state.phase = "ABILITY";
                messagingTemplate.convertAndSend("/topic/game/" + roomCode,
                    Map.of("type","ABILITY_PHASE_START","durationSeconds",60));

                Thread.sleep(60_000);
                if (state != null) state.phase = "DISCUSSION";
                messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                    "type","DISCUSSION_START",
                    "durationSeconds", 90,
                    "abilityLog", gameStateService.getAbilityLog(roomCode)
                ));

                // Observer note at 45s into discussion
                Thread.sleep(45_000);
                if (state != null && "DISCUSSION".equals(state.phase)) {
                    List<String> log = gameStateService.getAbilityLog(roomCode);
                    if (!log.isEmpty()) {
                        String note = gameMasterService.generateObserverNote(setup.getTheme(), log);
                        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                            "playerName","🔍 Observer","text",note,"isObserver",true));
                    }
                }

                // World event between 45-90s into discussion
                Thread.sleep(new Random().nextInt(45_000));
                if (state != null && "DISCUSSION".equals(state.phase)) {
                    var event = gameMasterService.generateWorldEvent(
                            setup.getTheme(), new java.util.ArrayList<>(state.alivePlayers));
                    messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                        "type","WORLD_EVENT",
                        "title",event.getTitle(),
                        "description",event.getDescription(),
                        "effect",event.getEffect()
                    ));
                }

                // Voting after 90s discussion
                Thread.sleep(Math.max(0, 45_000 - new Random().nextInt(20_000)));
                if (state != null && "DISCUSSION".equals(state.phase)) {
                    state.phase = "VOTING";
                    messagingTemplate.convertAndSend("/topic/game/" + roomCode,
                        Map.of("type","VOTING_START"));
                }

            } catch (InterruptedException ignored) {}
        }).start();

        log.info("Game started: room={} theme='{}'", roomCode, setup.getTheme());
        return ResponseEntity.ok(Map.of("status","started","theme",setup.getTheme()));
    }

    @PostMapping("/{roomCode}/ability")
    public ResponseEntity<Map<String, String>> useAbility(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body) {

        String playerName = body.get("playerName");
        String targetName = body.get("targetName");
        String action     = body.get("action");

        if ("skip".equals(action)) {
            gameStateService.markAbilityPhaseSkipped(roomCode, playerName);
            messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                "playerName","⚡ System",
                "text", playerName + " chose not to use their ability.",
                "isSystem",true));
        } else {
            String event = gameStateService.useAbility(roomCode, playerName, targetName);
            if (event == null)
                return ResponseEntity.badRequest().body(Map.of("error","Ability already used"));
            messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                "playerName","⚡ System","text",event,"isSystem",true,
                "targetPlayer",targetName,"trustDelta",-8));
            // Also broadcast trust update
            messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type","TRUST_UPDATE",
                "scores", gameStateService.getTrustScores(roomCode)
            ));
        }

        if (gameStateService.allPlayersActed(roomCode)) {
            var state = gameStateService.getState(roomCode);
            if (state != null) state.phase = "DISCUSSION";
            messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type","DISCUSSION_START","durationSeconds",90,
                "abilityLog",gameStateService.getAbilityLog(roomCode)));
        }

        return ResponseEntity.ok(Map.of("status","ok"));
    }

    @PostMapping("/{roomCode}/accuse")
    public ResponseEntity<Map<String, String>> accuse(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body) {

        String accuserName = body.get("accuserName");
        String targetName  = body.get("targetName");
        var state = gameStateService.getState(roomCode);
        if (state == null) return ResponseEntity.badRequest().body(Map.of("error","Room not found"));

        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
            "playerName","🔴 Accusation",
            "text", accuserName + " formally accuses " + targetName + " — a vote has been called!",
            "isSystem",true,
            "targetPlayer",targetName,"trustDelta",-15));

        // Trust update
        int curr = state.trustScores.getOrDefault(targetName, 50);
        state.trustScores.put(targetName, Math.max(0, curr - 15));
        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
            "type","TRUST_UPDATE","scores",state.trustScores));

        state.phase = "VOTING";
        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
            "type","VOTING_START",
            "nominatedPlayer",targetName,
            "calledBy",accuserName));
        return ResponseEntity.ok(Map.of("status","vote_called"));
    }

    @PostMapping("/{roomCode}/vote")
    public ResponseEntity<Map<String, Object>> castVote(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body) {

        String voterId  = body.get("voterId");
        String targetId = body.get("targetId");
        var result = gameStateService.castVote(roomCode, voterId, targetId);

        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
            "type","VOTE_UPDATE","votes",result.voteCounts()));
        // Trust update after vote
        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
            "type","TRUST_UPDATE","scores",gameStateService.getTrustScores(roomCode)));

        if (result.allVoted()) {
            var elim = gameStateService.resolveElimination(roomCode);
            messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type","ELIMINATION",
                "eliminatedId",elim.eliminatedId(),
                "eliminatedRole",elim.role(),
                "alignment",elim.alignment(),
                "gameOver",elim.gameOver(),
                "winner",elim.winner()));

            if (elim.gameOver()) {
                var state = gameStateService.getState(roomCode);
                new Thread(() -> {
                    try {
                        Thread.sleep(4000);
                        String cf = gameMasterService.generateCaseFile(
                                state.theme, state.allPlayers,
                                elim.traitorName(), elim.role(),
                                elim.winner(), elim.eliminationOrder());
                        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                            "type","CASE_FILE","text",cf,"winner",elim.winner()));
                    } catch (InterruptedException ignored) {}
                }).start();
            }
        }
        return ResponseEntity.ok(Map.of("status","vote_cast"));
    }

    @PostMapping("/{roomCode}/spirit")
    public ResponseEntity<Map<String, String>> spiritMessage(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body) {
        String message = body.get("message");
        gameStateService.addSpiritMessage(roomCode, message);
        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
            "playerName","👻 Unknown","text",message,"isSpirit",true));
        return ResponseEntity.ok(Map.of("status","sent"));
    }

    @GetMapping("/{roomCode}/state")
    public ResponseEntity<Object> getState(@PathVariable String roomCode) {
        return ResponseEntity.ok(gameStateService.getState(roomCode));
    }
}
