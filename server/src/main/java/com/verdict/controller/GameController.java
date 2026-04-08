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
    // World event fires between 45-90s into discussion
    private static final int WORLD_EVENT_MIN_DELAY_MS = 45_000;
    private static final int WORLD_EVENT_RANGE_MS     = 45_000;

    /** POST /api/game/{roomCode}/start */
    @PostMapping("/{roomCode}/start")
    public ResponseEntity<Map<String, String>> startGame(
            @PathVariable String roomCode,
            @RequestBody Map<String, Object> body) {

        GameSession session = sessionRepo.findByRoomCode(roomCode).orElse(null);
        if (session == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Room not found: " + roomCode));

        String requestingPlayerId = (String) body.get("playerId");
        log.info("Start: room={} requesting={} host={} status={}",
                roomCode, requestingPlayerId, session.getHostPlayerId(), session.getStatus());

        if (!session.getHostPlayerId().equals(requestingPlayerId))
            return ResponseEntity.status(403).body(Map.of("error",
                    "Only host can start. Sent: " + requestingPlayerId + ", host: " + session.getHostPlayerId()));

        if (session.getStatus() == GameSession.GameStatus.ENDED)
            return ResponseEntity.badRequest().body(Map.of("error", "Game already ended"));

        if (session.getPlayerIds().size() < MIN_PLAYERS)
            return ResponseEntity.badRequest().body(Map.of("error", "Need at least " + MIN_PLAYERS + " player(s)"));

        session.setStatus(GameSession.GameStatus.IN_PROGRESS);
        sessionRepo.save(session);

        // Use display names if available from request body, fallback to playerIds
        @SuppressWarnings("unchecked")
        List<String> displayNames = body.get("playerNames") instanceof List
                ? (List<String>) body.get("playerNames")
                : session.getPlayerIds();

        var setup = gameMasterService.generateGameSetup(displayNames.size(), displayNames);
        gameStateService.storeSetup(roomCode, setup);

        // Broadcast GAME_STARTING to lobby channel
        messagingTemplate.convertAndSend("/topic/lobby/" + roomCode, Map.of(
                "type", "GAME_STARTING",
                "theme", setup.getTheme(),
                "synopsis", setup.getSynopsis()
        ));

        // Sequence: roles after 1.5s → discussion after 35s (30s read time) → world event → vote after 180s
        new Thread(() -> {
            try {
                Thread.sleep(1500);
                // Send each player their private role
                setup.getRoles().forEach(role ->
                    messagingTemplate.convertAndSend(
                        "/topic/game/" + roomCode + "/role/" + role.getPlayerName(),
                        Map.of(
                            "type", "ROLE_REVEAL",
                            "roleName", role.getRoleName(),
                            "alignment", role.getAlignment(),
                            "winCondition", role.getWinCondition(),
                            "ability", role.getAbility(),
                            "restriction", role.getRestriction()
                        )
                    )
                );

                // 30s role reading silence, then discussion
                Thread.sleep(30_000);
                messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                    "type", "DISCUSSION_START",
                    "durationSeconds", 180
                ));

                // Fire world event at random point during discussion (45-90s in)
                int eventDelay = WORLD_EVENT_MIN_DELAY_MS + new Random().nextInt(WORLD_EVENT_RANGE_MS);
                Thread.sleep(eventDelay);
                var state = gameStateService.getState(roomCode);
                if (state != null && "DISCUSSION".equals(state.phase)) {
                    var event = gameMasterService.generateWorldEvent(
                            setup.getTheme(),
                            new java.util.ArrayList<>(state.alivePlayers)
                    );
                    messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                        "type", "WORLD_EVENT",
                        "title", event.getTitle(),
                        "description", event.getDescription(),
                        "effect", event.getEffect()
                    ));
                }

                // Voting starts after full 180s discussion
                Thread.sleep(Math.max(0, 180_000 - eventDelay));
                if (state != null && "DISCUSSION".equals(state.phase)) {
                    state.phase = "VOTING";
                    messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                        "type", "VOTING_START"
                    ));
                }

            } catch (InterruptedException ignored) {}
        }).start();

        log.info("Game started for room {} — theme: '{}'", roomCode, setup.getTheme());
        return ResponseEntity.ok(Map.of("status", "started", "theme", setup.getTheme()));
    }

    /** POST /api/game/{roomCode}/vote */
    @PostMapping("/{roomCode}/vote")
    public ResponseEntity<Map<String, Object>> castVote(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body) {

        String voterId = body.get("voterId");
        String targetId = body.get("targetId");
        var result = gameStateService.castVote(roomCode, voterId, targetId);

        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type", "VOTE_UPDATE", "votes", result.voteCounts()));

        if (result.allVoted()) {
            var elim = gameStateService.resolveElimination(roomCode);
            messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type", "ELIMINATION",
                "eliminatedId", elim.eliminatedId(),
                "eliminatedRole", elim.role(),
                "alignment", elim.alignment(),
                "gameOver", elim.gameOver(),
                "winner", elim.winner()
            ));

            // If game over, generate case file
            if (elim.gameOver()) {
                var state = gameStateService.getState(roomCode);
                new Thread(() -> {
                    try {
                        Thread.sleep(4000); // after elimination reveal
                        String caseFile = gameMasterService.generateCaseFile(
                                state.theme,
                                state.allPlayers,
                                elim.traitorName(),
                                elim.role(),
                                elim.winner(),
                                elim.eliminationOrder()
                        );
                        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                            "type", "CASE_FILE",
                            "text", caseFile,
                            "winner", elim.winner()
                        ));
                    } catch (InterruptedException ignored) {}
                }).start();
            }
        }
        return ResponseEntity.ok(Map.of("status", "vote_cast"));
    }

    /** POST /api/game/{roomCode}/spirit — dead player sends anonymous message */
    @PostMapping("/{roomCode}/spirit")
    public ResponseEntity<Map<String, String>> spiritMessage(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body) {
        String message = body.get("message");
        gameStateService.addSpiritMessage(roomCode, message);
        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
            "playerName", "👻 Unknown",
            "text", message,
            "isSpirit", true
        ));
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    /** GET /api/game/{roomCode}/state */
    @GetMapping("/{roomCode}/state")
    public ResponseEntity<Object> getState(@PathVariable String roomCode) {
        return ResponseEntity.ok(gameStateService.getState(roomCode));
    }
}
