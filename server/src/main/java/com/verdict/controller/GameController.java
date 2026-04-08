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

import java.util.Map;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
@Slf4j
public class GameController {

    private final GameSessionRepository sessionRepo;
    private final GameMasterService gameMasterService;
    private final GameStateService gameStateService;
    private final SimpMessagingTemplate messagingTemplate;

    private static final int MIN_PLAYERS = 1; // dev: 1, prod: 4

    @PostMapping("/{roomCode}/start")
    public ResponseEntity<Map<String, String>> startGame(
            @PathVariable String roomCode,
            @RequestBody Map<String, Object> body) {

        GameSession session = sessionRepo.findByRoomCode(roomCode)
                .orElse(null);
        if (session == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Room not found: " + roomCode));
        }

        String requestingPlayerId = (String) body.get("playerId");
        log.info("Start request: room={} requestingPlayer={} hostPlayer={} status={}",
                roomCode, requestingPlayerId, session.getHostPlayerId(), session.getStatus());

        if (!session.getHostPlayerId().equals(requestingPlayerId)) {
            log.warn("Not host! sent={} actual={}", requestingPlayerId, session.getHostPlayerId());
            return ResponseEntity.status(403).body(Map.of(
                "error", "Only the host can start. You sent: " + requestingPlayerId + ", host is: " + session.getHostPlayerId()));
        }

        // Allow restart if already IN_PROGRESS (dev convenience)
        if (session.getStatus() == GameSession.GameStatus.ENDED) {
            return ResponseEntity.badRequest().body(Map.of("error", "Game already ended"));
        }

        if (session.getPlayerIds().size() < MIN_PLAYERS) {
            return ResponseEntity.badRequest().body(Map.of("error",
                "Need at least " + MIN_PLAYERS + " player(s). Currently: " + session.getPlayerIds().size()));
        }

        session.setStatus(GameSession.GameStatus.IN_PROGRESS);
        sessionRepo.save(session);

        log.info("AI GM generating setup for room {} with {} players: {}",
                roomCode, session.getPlayerIds().size(), session.getPlayerIds());
        var setup = gameMasterService.generateGameSetup(
                session.getPlayerIds().size(),
                session.getPlayerIds()
        );

        gameStateService.storeSetup(roomCode, setup);

        messagingTemplate.convertAndSend("/topic/lobby/" + roomCode, Map.of(
                "type", "GAME_STARTING",
                "theme", setup.getTheme(),
                "synopsis", setup.getSynopsis()
        ));

        new Thread(() -> {
            try { Thread.sleep(1500); } catch (InterruptedException ignored) {}
            setup.getRoles().forEach(role ->
                messagingTemplate.convertAndSend(
                    "/topic/game/" + roomCode + "/role/" + role.getPlayerName(),
                    Map.of(
                        "type", "ROLE_REVEAL",
                        "role", role.getRole(),
                        "alignment", role.getAlignment(),
                        "secretMission", role.getSecretMission()
                    )
                )
            );
            try { Thread.sleep(8000); } catch (InterruptedException ignored) {}
            messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type", "DISCUSSION_START",
                "durationSeconds", 180
            ));
        }).start();

        log.info("Game started for room {} — theme: '{}'", roomCode, setup.getTheme());
        return ResponseEntity.ok(Map.of("status", "started", "theme", setup.getTheme()));
    }

    @PostMapping("/{roomCode}/vote")
    public ResponseEntity<Map<String, Object>> castVote(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body) {

        String voterId = body.get("voterId");
        String targetId = body.get("targetId");
        var result = gameStateService.castVote(roomCode, voterId, targetId);

        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type", "VOTE_UPDATE",
                "votes", result.voteCounts()
        ));

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
        }

        return ResponseEntity.ok(Map.of("status", "vote_cast"));
    }

    @GetMapping("/{roomCode}/state")
    public ResponseEntity<Object> getState(@PathVariable String roomCode) {
        return ResponseEntity.ok(gameStateService.getState(roomCode));
    }
}
