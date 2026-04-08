package com.verdict.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class LobbyWebSocketController {

    /**
     * Client sends to /app/lobby/{roomCode}/ping
     * Server broadcasts to  /topic/lobby/{roomCode}
     * Used for presence heartbeats in Phase 1.
     */
    @MessageMapping("/lobby/{roomCode}/ping")
    @SendTo("/topic/lobby/{roomCode}")
    public Map<String, String> handlePing(
            @DestinationVariable String roomCode,
            Map<String, String> payload) {
        log.debug("Ping in room {}: {}", roomCode, payload);
        return Map.of(
                "type", "PONG",
                "roomCode", roomCode,
                "playerId", payload.getOrDefault("playerId", "unknown")
        );
    }
}
