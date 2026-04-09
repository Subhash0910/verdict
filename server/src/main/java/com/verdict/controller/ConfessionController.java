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

    private final GameStateService gameStateService;
    private final SimpMessagingTemplate messagingTemplate;

    /** One player demands confession from another */
    @PostMapping("/{roomCode}/confess/demand")
    public ResponseEntity<Map<String, String>> demandConfession(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body) {

        String from     = body.get("from");
        String to       = body.get("to");
        String question = body.get("question");

        // Check: only one confession per round per player
        var state = gameStateService.getState(roomCode);
        if (state == null) return ResponseEntity.badRequest().body(Map.of("error","Room not found"));
        if (state.confessionUsed.contains(from))
            return ResponseEntity.badRequest().body(Map.of("error","Already used confession this round"));
        state.confessionUsed.add(from);

        // Broadcast to target's private channel — forces UI overlay
        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/confess/" + to, Map.of(
            "from", from,
            "question", question
        ));

        // Tell everyone a confession was demanded (without revealing question)
        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
            "playerName", "🎤 Confession",
            "text", from + " demanded a confession from " + to + "!",
            "isSystem", true,
            "targetPlayer", to,
            "trustDelta", -10  // Being interrogated drops trust slightly
        ));

        log.info("Confession demanded: {} → {} in room {}", from, to, roomCode);
        return ResponseEntity.ok(Map.of("status","demanded"));
    }

    /** Target answers the confession */
    @PostMapping("/{roomCode}/confess/answer")
    public ResponseEntity<Map<String, String>> answerConfession(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> body) {

        String playerName = body.get("playerName");
        String answer     = body.get("answer");   // YES or NO
        String question   = body.get("question");
        String from       = body.get("from");

        // Slam the answer into evidence for everyone
        String text = "🎤 " + playerName + " confessed: \"" + question + "\" → " + answer;
        messagingTemplate.convertAndSend("/topic/game/" + roomCode + "/chat", Map.of(
            "playerName", "🎤 Confession",
            "text", text,
            "isConfession", true,
            "targetPlayer", playerName,
            "trustDelta", answer.equals("YES") ? 5 : -5
        ));

        // Trust update broadcast
        var state = gameStateService.getState(roomCode);
        if (state != null) {
            int current = state.trustScores.getOrDefault(playerName, 50);
            int delta = answer.equals("YES") ? 5 : -5;
            state.trustScores.put(playerName, Math.max(0, Math.min(100, current + delta)));
            messagingTemplate.convertAndSend("/topic/game/" + roomCode, Map.of(
                "type", "TRUST_UPDATE",
                "scores", state.trustScores
            ));
        }

        log.info("Confession answered: {} said {} in room {}", playerName, answer, roomCode);
        return ResponseEntity.ok(Map.of("status","answered"));
    }
}
