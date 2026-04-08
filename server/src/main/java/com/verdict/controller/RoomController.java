package com.verdict.controller;

import com.verdict.dto.*;
import com.verdict.entity.GameSession;
import com.verdict.repository.GameSessionRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Random;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@Slf4j
public class RoomController {

    private final GameSessionRepository sessionRepo;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * POST /api/rooms/create
     * Creates a new game room and returns the room code.
     */
    @PostMapping("/create")
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody CreateRoomRequest req) {
        String roomCode = generateUniqueRoomCode();

        GameSession session = GameSession.builder()
                .roomCode(roomCode)
                .hostPlayerId(req.getHostPlayerId())
                .status(GameSession.GameStatus.WAITING)
                .maxPlayers(req.getMaxPlayers())
                .playerIds(List.of(req.getHostPlayerId()))
                .build();

        session = sessionRepo.save(session);
        log.info("Room created: {} by host {}", roomCode, req.getHostPlayerId());

        return ResponseEntity.ok(toResponse(session));
    }

    /**
     * POST /api/rooms/{roomCode}/join
     * Adds a player to an existing WAITING room.
     */
    @PostMapping("/{roomCode}/join")
    public ResponseEntity<RoomResponse> joinRoom(
            @PathVariable String roomCode,
            @Valid @RequestBody JoinRoomRequest req) {

        GameSession session = sessionRepo.findByRoomCode(roomCode)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomCode));

        if (session.getStatus() != GameSession.GameStatus.WAITING) {
            return ResponseEntity.badRequest().build();
        }
        if (session.getPlayerIds().size() >= session.getMaxPlayers()) {
            return ResponseEntity.badRequest().build();
        }
        if (session.getPlayerIds().contains(req.getPlayerId())) {
            return ResponseEntity.ok(toResponse(session)); // already in room
        }

        session.getPlayerIds().add(req.getPlayerId());
        session = sessionRepo.save(session);
        log.info("Player {} joined room {}", req.getPlayerId(), roomCode);

        // Broadcast lobby update over WebSocket
        broadcastLobbyUpdate(session, "PLAYER_JOINED");

        return ResponseEntity.ok(toResponse(session));
    }

    /**
     * GET /api/rooms/{roomCode}
     * Fetch room info (for reconnect / initial load).
     */
    @GetMapping("/{roomCode}")
    public ResponseEntity<RoomResponse> getRoom(@PathVariable String roomCode) {
        return sessionRepo.findByRoomCode(roomCode)
                .map(s -> ResponseEntity.ok(toResponse(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void broadcastLobbyUpdate(GameSession session, String type) {
        LobbyUpdateMessage msg = LobbyUpdateMessage.builder()
                .type(type)
                .roomCode(session.getRoomCode())
                .maxPlayers(session.getMaxPlayers())
                .players(session.getPlayerIds().stream()
                        .map(pid -> LobbyUpdateMessage.PlayerInfo.builder()
                                .playerId(pid)
                                .playerName(pid) // Phase 2: replace with real name from Redis
                                .isHost(pid.equals(session.getHostPlayerId()))
                                .build())
                        .toList())
                .build();

        messagingTemplate.convertAndSend("/topic/lobby/" + session.getRoomCode(), msg);
    }

    private String generateUniqueRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
        Random rnd = new Random();
        String code;
        do {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) sb.append(chars.charAt(rnd.nextInt(chars.length())));
            code = sb.toString();
        } while (sessionRepo.existsByRoomCode(code));
        return code;
    }

    private RoomResponse toResponse(GameSession s) {
        return RoomResponse.builder()
                .sessionId(s.getId())
                .roomCode(s.getRoomCode())
                .hostPlayerId(s.getHostPlayerId())
                .status(s.getStatus())
                .playerIds(s.getPlayerIds())
                .maxPlayers(s.getMaxPlayers())
                .currentPlayers(s.getPlayerIds().size())
                .build();
    }
}
