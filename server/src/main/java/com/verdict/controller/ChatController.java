package com.verdict.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

/**
 * WebSocket chat controller.
 * Clients send to /app/game/{roomCode}/chat
 * Server broadcasts to /topic/game/{roomCode}/chat
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/game/{roomCode}/chat")
    public void handleChat(
            @DestinationVariable String roomCode,
            @Payload Map<String, Object> message) {
        log.debug("Chat in {}: {}", roomCode, message.get("text"));
        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", message);
    }
}
