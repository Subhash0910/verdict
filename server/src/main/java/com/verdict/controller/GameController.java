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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
@Slf4j
public class GameController {

    private static final int MIN_PLAYERS = 4;
    private static final int MAX_PLAYERS = 6;
    private static final int ROLE_REVEAL_SECONDS = 22;
    private static final int OPERATION_SECONDS = 40;
    private static final int DISCUSSION_SECONDS = 70;
    private static final int TRIBUNAL_SECONDS = 25;

    private final GameSessionRepository sessionRepo;
    private final GameMasterService gameMasterService;
    private final GameStateService gameStateService;
    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, Object> startLocks = new ConcurrentHashMap<>();

    @PostMapping("/{roomCode}/start")
    public ResponseEntity<Map<String, String>> startGame(
            @PathVariable String roomCode,
            @RequestBody Map<String, Object> body
    ) {
        Object roomLock = startLocks.computeIfAbsent(roomCode, ignored -> new Object());
        synchronized (roomLock) {
            GameSession session = sessionRepo.findByRoomCode(roomCode).orElse(null);
            if (session == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Room not found: " + roomCode));
            }

            String requestingPlayerId = (String) body.get("playerId");
            if (!session.getHostPlayerId().equals(requestingPlayerId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Only the host can start this room."));
            }
            if (session.getStatus() == GameSession.GameStatus.IN_PROGRESS) {
                return ResponseEntity.ok(Map.of("status", "already-started"));
            }
            if (session.getPlayerIds().size() < MIN_PLAYERS) {
                return ResponseEntity.badRequest().body(Map.of("error", "Need at least " + MIN_PLAYERS + " players."));
            }
            if (session.getPlayerIds().size() > MAX_PLAYERS) {
                return ResponseEntity.badRequest().body(Map.of("error", "VERDICT v1 supports up to " + MAX_PLAYERS + " players."));
            }

            session.setStatus(GameSession.GameStatus.IN_PROGRESS);
            session.setStartedAt(LocalDateTime.now());
            sessionRepo.save(session);

            List<String> displayNames = session.getPlayerIds().stream()
                    .map(session::getDisplayName)
                    .toList();

            GameMasterService.GeneratedScenario scenario = gameMasterService.generateScenario(displayNames.size(), displayNames);
            gameStateService.storeScenario(roomCode, scenario);

            messagingTemplate.convertAndSend("/topic/lobby/" + roomCode, Map.of(
                    "type", "GAME_STARTING",
                    "theme", scenario.getThemeTitle(),
                    "synopsis", scenario.getSynopsis(),
                    "themePresetId", scenario.getThemePresetId()
            ));

            new Thread(() -> {
                try {
                    Thread.sleep(1500);
                    for (GameMasterService.GeneratedScenario.PlayerRole role : scenario.getRoleAssignments()) {
                        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/role/" + role.getPlayerName(), Map.of(
                                "type", "ROLE_REVEAL",
                                "roleName", role.getRoleName(),
                                "roleChassisId", role.getRoleChassisId(),
                                "alignment", role.getAlignment(),
                                "factionLabel", role.getFactionLabel(),
                                "flavorText", role.getFlavorText(),
                                "winCondition", role.getWinCondition(),
                                "ability", role.getAbility(),
                                "restriction", role.getRestriction()
                        ));
                    }

                    Thread.sleep(ROLE_REVEAL_SECONDS * 1000L);
                    broadcastRoundStart(roomCode);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
            }).start();

            log.info("Game started: room={} theme='{}' preset={}", roomCode, scenario.getThemeTitle(), scenario.getThemePresetId());
            return ResponseEntity.ok(Map.of("status", "started", "theme", scenario.getThemeTitle()));
        }
    }

    @PostMapping("/{roomCode}/reset")
    public ResponseEntity<Map<String, String>> resetGame(
            @PathVariable String roomCode,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        GameSession session = sessionRepo.findByRoomCode(roomCode).orElse(null);
        if (session == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Room not found"));
        }

        gameStateService.clearState(roomCode);
        session.setStatus(GameSession.GameStatus.WAITING);
        sessionRepo.save(session);

        messagingTemplate.convertAndSend("/topic/lobby/" + roomCode, Map.of("type", "GAME_RESET"));
        log.info("Game reset: room={}", roomCode);
        return ResponseEntity.ok(Map.of("status", "reset"));
    }

    @PostMapping("/{roomCode}/ability")
    public ResponseEntity<Map<String, String>> useAbility(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body
    ) {
        String playerName = body.get("playerName");
        String targetName = body.get("targetName");
        String action = body.get("action");

        if ("skip".equalsIgnoreCase(action)) {
            gameStateService.markAbilityPhaseSkipped(roomCode, playerName);
            messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                    "playerName", "System",
                    "text", playerName + " stayed quiet during the operation phase.",
                    "isSystem", true
            ));
        } else {
            GameStateService.AbilityOutcome outcome = gameStateService.useAbility(roomCode, playerName, targetName);
            if (outcome == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ability already used"));
            }
            messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                    "playerName", "System",
                    "text", outcome.publicText(),
                    "isSystem", true,
                    "targetPlayer", outcome.targetPlayer(),
                    "trustDelta", outcome.trustDelta()
            ));
            if (outcome.directives() != null) {
                for (String directive : outcome.directives()) {
                    messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                            "playerName", "System",
                            "text", directive,
                            "isSystem", true
                    ));
                }
            }
            messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                    "type", "TRUST_UPDATE",
                    "scores", gameStateService.getTrustScores(roomCode)
            ));
        }

        if (gameStateService.allPlayersActed(roomCode)) {
            broadcastDiscussionStart(roomCode, false);
        }

        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @PostMapping("/{roomCode}/operation/timeout")
    public ResponseEntity<Map<String, String>> operationTimeout(@PathVariable String roomCode) {
        var state = gameStateService.getState(roomCode);
        if (state == null || !"OPERATION".equals(state.phase)) {
            return ResponseEntity.ok(Map.of("status", "ignored"));
        }
        gameStateService.forceOperationTimeout(roomCode);
        broadcastDiscussionStart(roomCode, true);
        return ResponseEntity.ok(Map.of("status", "discussion_started"));
    }

    @PostMapping("/{roomCode}/discussion/timeout")
    public ResponseEntity<Map<String, String>> discussionTimeout(@PathVariable String roomCode) {
        var state = gameStateService.getState(roomCode);
        if (state == null || !"DISCUSSION".equals(state.phase)) {
            return ResponseEntity.ok(Map.of("status", "ignored"));
        }
        String target = gameStateService.chooseTribunalTarget(roomCode);
        if (target == null) {
            return ResponseEntity.ok(Map.of("status", "no-target"));
        }
        broadcastTribunalStart(roomCode, target, null, true);
        return ResponseEntity.ok(Map.of("status", "tribunal_started"));
    }

    @PostMapping("/{roomCode}/tribunal/timeout")
    public ResponseEntity<Map<String, String>> tribunalTimeout(@PathVariable String roomCode) {
        var state = gameStateService.getState(roomCode);
        if (state == null || !"TRIBUNAL".equals(state.phase)) {
            return ResponseEntity.ok(Map.of("status", "ignored"));
        }
        gameStateService.forceTribunalTimeout(roomCode);
        finishTribunal(roomCode);
        return ResponseEntity.ok(Map.of("status", "resolved"));
    }

    @PostMapping("/{roomCode}/chat")
    public ResponseEntity<Map<String, String>> chatMessage(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body
    ) {
        String playerName = body.get("playerName");
        String text = body.get("text");
        if (playerName == null || text == null || text.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid message"));
        }

        gameStateService.trackMessage(roomCode, playerName);
        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                "playerName", playerName,
                "text", text
        ));
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @PostMapping("/{roomCode}/accuse")
    public ResponseEntity<Map<String, String>> accuse(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body
    ) {
        String accuserName = body.get("accuserName");
        String targetName = body.get("targetName");
        if (accuserName != null && accuserName.equals(targetName)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot accuse yourself"));
        }

        var state = gameStateService.getState(roomCode);
        if (state == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Room not found"));
        }
        if (!gameStateService.canAccuse(roomCode, accuserName, targetName)) {
            return ResponseEntity.badRequest().body(Map.of("error", "That accusation is blocked this round."));
        }

        gameStateService.trackAccusation(roomCode, accuserName, targetName);
        int trustPenalty = gameStateService.getAccusationTrustPenalty(roomCode, accuserName, targetName);
        int currentTrust = state.trustScores.getOrDefault(targetName, 50);
        state.trustScores.put(targetName, Math.max(0, currentTrust - trustPenalty));

        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                "playerName", "System",
                "text", accuserName + " dragged " + targetName + " into tribunal.",
                "isSystem", true,
                "targetPlayer", targetName,
                "trustDelta", -trustPenalty
        ));
        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type", "TRUST_UPDATE",
                "scores", gameStateService.getTrustScores(roomCode)
        ));

        broadcastTribunalStart(roomCode, targetName, accuserName, false);
        return ResponseEntity.ok(Map.of("status", "tribunal_started"));
    }

    @PostMapping("/{roomCode}/vote")
    public ResponseEntity<Map<String, Object>> castVote(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body
    ) {
        String voterId = body.get("voterId");
        String choice = body.get("choice");
        var state = gameStateService.getState(roomCode);
        if (state == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Room not found"));
        }
        if (!"TRIBUNAL".equals(state.phase)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Room is not in tribunal."));
        }
        if (state.nominatedPlayer != null && state.nominatedPlayer.equals(voterId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "The accused cannot vote in their own tribunal."));
        }

        String normalizedChoice = choice == null ? "" : choice.trim().toUpperCase();
        if (!List.of("CONDEMN", "SPARE").contains(normalizedChoice)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Vote choice must be CONDEMN or SPARE."));
        }

        GameStateService.TribunalVoteResult result = gameStateService.castTribunalVote(roomCode, voterId, normalizedChoice);
        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type", "TRIBUNAL_UPDATE",
                "tallies", result.tallies(),
                "accusedPlayer", state.nominatedPlayer
        ));

        if (result.allVoted()) {
            finishTribunal(roomCode);
        }

        return ResponseEntity.ok(Map.of("status", "vote_cast"));
    }

    @PostMapping("/{roomCode}/spirit")
    public ResponseEntity<Map<String, String>> spiritMessage(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body
    ) {
        String message = body.get("message");
        gameStateService.addSpiritMessage(roomCode, message);
        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                "playerName", "Unknown",
                "text", message,
                "isSpirit", true
        ));
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @GetMapping("/{roomCode}/state")
    public ResponseEntity<Object> getState(@PathVariable String roomCode) {
        return ResponseEntity.ok(gameStateService.getState(roomCode));
    }

    private void broadcastRoundStart(String roomCode) {
        var state = gameStateService.getState(roomCode);
        if (state == null || "GAME_OVER".equals(state.phase)) {
            return;
        }
        GameMasterService.RoundOperation operation = gameStateService.prepareOperationPhase(roomCode);
        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type", "ROUND_START",
                "round", state.round,
                "maxRounds", state.maxRounds,
                "themeTitle", state.theme,
                "themePresetId", state.themePresetId,
                "operationTitle", operation.getTitle()
        ));
        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type", "OPERATION_START",
                "round", state.round,
                "maxRounds", state.maxRounds,
                "durationSeconds", OPERATION_SECONDS,
                "operation", operation
        ));
    }

    private void broadcastDiscussionStart(String roomCode, boolean forced) {
        var state = gameStateService.getState(roomCode);
        if (state == null) {
            return;
        }
        List<String> directives = gameStateService.startDiscussion(roomCode);
        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type", "DISCUSSION_START",
                "round", state.round,
                "maxRounds", state.maxRounds,
                "durationSeconds", DISCUSSION_SECONDS,
                "operation", state.currentOperation,
                "directives", directives,
                "forced", forced
        ));

        if (!directives.isEmpty()) {
            for (String directive : directives) {
                messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                        "playerName", "System",
                        "text", directive,
                        "isSystem", true
                ));
            }
        }

        if (state.currentOperation != null && state.currentOperation.getPrimaryTarget() != null) {
            new Thread(() -> {
                try {
                    Thread.sleep(18000);
                    var freshState = gameStateService.getState(roomCode);
                    if (freshState != null && "DISCUSSION".equals(freshState.phase)) {
                        String observerNote = gameMasterService.generateObserverNote(freshState.theme, gameStateService.getAbilityLog(roomCode));
                        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                                "playerName", "Observer",
                                "text", observerNote,
                                "isObserver", true
                        ));
                    }
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
            }).start();
        }

        new Thread(() -> {
            try {
                Thread.sleep(35000);
                var freshState = gameStateService.getState(roomCode);
                if (freshState != null && "DISCUSSION".equals(freshState.phase)) {
                    messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                            "playerName", "System",
                            "text", "PRESSURE RISING: nobody is forced to stay idle. Push a read, call for a confession, or hit ACCUSE to open tribunal.",
                            "isSystem", true
                    ));
                }

                Thread.sleep(23000);
                freshState = gameStateService.getState(roomCode);
                if (freshState != null && "DISCUSSION".equals(freshState.phase)) {
                    messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
                            "playerName", "System",
                            "text", "FINAL CALL: if no accusation lands, the timer will auto-call the room's most suspicious player.",
                            "isSystem", true
                    ));
                }
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }

    private void broadcastTribunalStart(String roomCode, String accusedPlayer, String calledBy, boolean forced) {
        GameStateService.TribunalStart tribunalStart = gameStateService.startTribunal(roomCode, accusedPlayer, calledBy, forced);
        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type", "TRIBUNAL_START",
                "accusedPlayer", tribunalStart.accusedPlayer(),
                "eligibleVoterIds", tribunalStart.eligibleVoterIds(),
                "round", tribunalStart.round(),
                "forced", tribunalStart.forced(),
                "calledBy", calledBy,
                "durationSeconds", TRIBUNAL_SECONDS
        ));
    }

    private void finishTribunal(String roomCode) {
        GameStateService.TribunalResolution resolution = gameStateService.resolveTribunal(roomCode);
        if (resolution.eliminated()) {
            messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                    "type", "ELIMINATION",
                    "accusedPlayer", resolution.accusedPlayer(),
                    "condemnVotes", resolution.condemnVotes(),
                    "spareVotes", resolution.spareVotes(),
                    "eliminatedId", resolution.eliminatedId(),
                    "eliminatedRole", resolution.eliminatedRole(),
                    "alignment", resolution.alignment(),
                    "gameOver", resolution.gameOver(),
                    "winner", resolution.winner(),
                    "round", resolution.nextRound()
            ));
        } else {
            messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                    "type", "TRIBUNAL_RESULT",
                    "accusedPlayer", resolution.accusedPlayer(),
                    "condemnVotes", resolution.condemnVotes(),
                    "spareVotes", resolution.spareVotes(),
                    "survivedTrial", true,
                    "gameOver", resolution.gameOver(),
                    "winner", resolution.winner(),
                    "round", resolution.nextRound()
            ));
        }

        if (resolution.gameOver()) {
            new Thread(() -> {
                try {
                    Thread.sleep(3500);
                    var state = gameStateService.getState(roomCode);
                    if (state == null) {
                        return;
                    }
                    String traitorName = resolution.traitorName();
                    String traitorRole = state.roles.containsKey(traitorName) ? state.roles.get(traitorName).getRoleName() : "Unknown";
                    String caseFile = gameMasterService.generateCaseFile(
                            state.theme,
                            state.caseFileTone,
                            state.allPlayers,
                            traitorName,
                            traitorRole,
                            resolution.winner(),
                            resolution.eliminationOrder()
                    );
                    List<Map<String, Object>> stats = gameStateService.buildStats(roomCode);
                    messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                            "type", "CASE_FILE",
                            "text", caseFile,
                            "winner", resolution.winner(),
                            "stats", stats
                    ));
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
            }).start();
        } else {
            new Thread(() -> {
                try {
                    Thread.sleep(2500);
                    broadcastRoundStart(roomCode);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
            }).start();
        }
    }
}
