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

import java.util.*;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@Slf4j
public class RoomController {

    private final GameSessionRepository sessionRepo;
    private final SimpMessagingTemplate messagingTemplate;

    @PostMapping("/create")
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody CreateRoomRequest req) {
        String roomCode = generateUniqueRoomCode();

        Map<String, String> names = new HashMap<>();
        names.put(req.getHostPlayerId(), req.getHostDisplayName());

        GameSession session = GameSession.builder()
                .roomCode(roomCode)
                .hostPlayerId(req.getHostPlayerId())
                .status(GameSession.GameStatus.WAITING)
                .maxPlayers(req.getMaxPlayers())
                .playerIds(new ArrayList<>(List.of(req.getHostPlayerId())))
                .playerDisplayNames(names)
                .build();

        session = sessionRepo.save(session);
        log.info("Room created: {} by '{}' ({})", roomCode, req.getHostDisplayName(), req.getHostPlayerId());
        return ResponseEntity.ok(toResponse(session));
    }

    @PostMapping("/{roomCode}/join")
    public ResponseEntity<RoomResponse> joinRoom(
            @PathVariable String roomCode,
            @Valid @RequestBody JoinRoomRequest req) {

        GameSession session = sessionRepo.findByRoomCode(roomCode)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomCode));

        if (session.getStatus() != GameSession.GameStatus.WAITING)
            return ResponseEntity.badRequest().build();
        if (session.getPlayerIds().size() >= session.getMaxPlayers())
            return ResponseEntity.badRequest().build();
        if (session.getPlayerIds().contains(req.getPlayerId()))
            return ResponseEntity.ok(toResponse(session));

        session.getPlayerIds().add(req.getPlayerId());
        session.getPlayerDisplayNames().put(req.getPlayerId(), req.getDisplayName());
        session = sessionRepo.save(session);
        log.info("Player '{}' ({}) joined room {}", req.getDisplayName(), req.getPlayerId(), roomCode);

        broadcastLobbyUpdate(session, "PLAYER_JOINED");
        return ResponseEntity.ok(toResponse(session));
    }

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
                                .playerName(session.getDisplayName(pid))
                                .isHost(pid.equals(session.getHostPlayerId()))
                                .build())
                        .toList())
                .build();
        messagingTemplate.convertAndSend("/topic/lobby/" + session.getRoomCode(), msg);
    }

    private String generateUniqueRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
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
        // Build a full playerId -> displayName map for the response
        Map<String, String> names = new HashMap<>();
        s.getPlayerIds().forEach(pid -> names.put(pid, s.getDisplayName(pid)));

        return RoomResponse.builder()
                .sessionId(s.getId())
                .roomCode(s.getRoomCode())
                .hostPlayerId(s.getHostPlayerId())
                .status(s.getStatus())
                .playerIds(s.getPlayerIds())
                .playerNames(names)
                .maxPlayers(s.getMaxPlayers())
                .currentPlayers(s.getPlayerIds().size())
                .build();
    }
}
