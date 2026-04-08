package com.verdict.controller;

import com.verdict.entity.GameSession;
import com.verdict.repository.GameSessionRepository;
import com.verdict.service.GameMasterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Phase 2 — Game Controller
 * Handles the host triggering game start → AI GM generates the setup.
 */
@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
@Slf4j
public class GameController {

    private final GameSessionRepository sessionRepo;
    private final GameMasterService gameMasterService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * POST /api/game/{roomCode}/start
     * Host calls this. AI GM generates roles and broadcasts to all players.
     */
    @PostMapping("/{roomCode}/start")
    public ResponseEntity<Map<String, String>> startGame(
            @PathVariable String roomCode,
            @RequestBody Map<String, Object> body) {

        GameSession session = sessionRepo.findByRoomCode(roomCode)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        if (session.getStatus() != GameSession.GameStatus.WAITING) {
            return ResponseEntity.badRequest().body(Map.of("error", "Game already started"));
        }

        String requestingPlayerId = (String) body.get("playerId");
        if (!session.getHostPlayerId().equals(requestingPlayerId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only the host can start the game"));
        }

        if (session.getPlayerIds().size() < 4) {
            return ResponseEntity.badRequest().body(Map.of("error", "Need at least 4 players"));
        }

        // Update status
        session.setStatus(GameSession.GameStatus.IN_PROGRESS);
        sessionRepo.save(session)
        ;

        // Generate AI game setup (async feel — runs in request thread for now)
        log.info("AI GM generating setup for room {} with {} players", roomCode, session.getPlayerIds().size());
        var setup = gameMasterService.generateGameSetup(
                session.getPlayerIds().size(),
                session.getPlayerIds() // Phase 3: replace with actual display names from Redis
        );

        // Broadcast GAME_STARTING event to all players in the lobby
        messagingTemplate.convertAndSend("/topic/lobby/" + roomCode, Map.of(
                "type", "GAME_STARTING",
                "roomCode", roomCode,
                "theme", setup.getTheme(),
                "synopsis", setup.getSynopsis()
        ));

        // Broadcast individual role reveals (each player gets their own)
        setup.getRoles().forEach(role -> {
            messagingTemplate.convertAndSendToUser(
                    role.getPlayerName(),
                    "/queue/role",
                    role
            );
        });

        log.info("Game started for room {} — theme: '{}'", roomCode, setup.getTheme());
        return ResponseEntity.ok(Map.of(
                "status", "started",
                "theme", setup.getTheme()
        ));
    }
}
