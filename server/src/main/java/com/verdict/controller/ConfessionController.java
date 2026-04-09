package com.verdict.controller;

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
public class ConfessionController {

    private final SimpMessagingTemplate messagingTemplate;
    private final GameStateService gameStateService;

    /** POST /api/game/{roomCode}/confession/demand
     *  Body: { askerName, targetName, question }
     *  Broadcasts to everyone so target sees the overlay
     */
    @PostMapping("/{roomCode}/confession/demand")
    public ResponseEntity<Map<String,String>> demand(
            @PathVariable String roomCode,
            @RequestBody Map<String,String> body) {

        String askerName  = body.get("askerName");
        String targetName = body.get("targetName");
        String question   = body.get("question");

        // Announce in evidence channel
        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/evidence", Map.of(
            "type",  "confession",
            "text",  askerName + " demands a confession from " + targetName
        ));

        // Broadcast confession request to ALL (target reacts to it)
        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
            "type",       "CONFESSION_DEMAND",
            "askerName",  askerName,
            "targetName", targetName,
            "question",   question
        ));

        log.info("Confession demanded: {} → {} in room {}", askerName, targetName, roomCode);
        return ResponseEntity.ok(Map.of("status", "demanded"));
    }

    /** POST /api/game/{roomCode}/confession/answer
     *  Body: { targetName, answer (YES|NO), question, askerName }
     *  Broadcasts answer as a dramatic chat event
     */
    @PostMapping("/{roomCode}/confession/answer")
    public ResponseEntity<Map<String,String>> answer(
            @PathVariable String roomCode,
            @RequestBody Map<String,String> body) {

        String targetName = body.get("targetName");
        String answer     = body.get("answer");
        String question   = body.get("question");
        String askerName  = body.get("askerName");

        String answerEmoji = "YES".equals(answer) ? "✅" : "❌";
        String chatText = targetName + " answered \"" + question + "\" — " + answerEmoji + " " + answer;

        // Into chat as a dramatic event
        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
            "playerName", "🏛️ Confession",
            "text",       chatText,
            "isConfession", true
        ));

        // Into evidence board
        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/evidence", Map.of(
            "type", "confession",
            "text", chatText
        ));

        // Clear the overlay for everyone
        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
            "type", "CONFESSION_ANSWERED",
            "targetName", targetName,
            "answer",     answer
        ));

        // Update trust — YES raises trust for target, NO drops it
        var state = gameStateService.getState(roomCode);
        if (state != null) {
            int delta = "YES".equals(answer) ? 8 : -12;
            state.trustScores.merge(targetName, 50, Integer::sum);
            int newScore = Math.max(0, Math.min(100, (state.trustScores.get(targetName) + delta)));
            state.trustScores.put(targetName, newScore);
            messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type",   "TRUST_UPDATE",
                "scores", state.trustScores
            ));
        }

        return ResponseEntity.ok(Map.of("status", "answered"));
    }

    /** POST /api/game/{roomCode}/trust/update
     *  Body: { playerName, delta }
     *  Called when player is accused, defended, etc.
     */
    @PostMapping("/{roomCode}/trust/update")
    public ResponseEntity<Map<String,String>> updateTrust(
            @PathVariable String roomCode,
            @RequestBody Map<String,Object> body) {

        String playerName = (String) body.get("playerName");
        int delta = (int) body.get("delta");
        var state = gameStateService.getState(roomCode);
        if (state == null) return ResponseEntity.badRequest().body(Map.of("error","room not found"));

        state.trustScores.merge(playerName, 50, Integer::sum);
        int newScore = Math.max(0, Math.min(100, state.trustScores.get(playerName) + delta));
        state.trustScores.put(playerName, newScore);

        messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
            "type",   "TRUST_UPDATE",
            "scores", state.trustScores
        ));
        return ResponseEntity.ok(Map.of("status","updated"));
    }
}