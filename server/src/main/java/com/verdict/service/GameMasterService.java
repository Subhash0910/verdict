package com.verdict.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

/**
 * Phase 2 — AI Game Master Service
 * Calls Gemini API to generate unique roles, missions, and win conditions.
 * Set GEMINI_API_KEY env var to activate. Falls back to mock data if not set.
 */
@Service
@Slf4j
public class GameMasterService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=";

    public GameSetup generateGameSetup(int playerCount, List<String> playerNames) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.warn("GEMINI_API_KEY not set — using mock game setup");
            return mockGameSetup(playerNames);
        }

        String prompt = buildPrompt(playerCount, playerNames);
        try {
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", prompt)))
                    )
            );

            String url = GEMINI_URL + geminiApiKey;
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);
            String raw = extractText(response);
            return parseGameSetup(raw, playerNames);
        } catch (Exception e) {
            log.error("Gemini API call failed: {}", e.getMessage());
            return mockGameSetup(playerNames);
        }
    }

    private String buildPrompt(int playerCount, List<String> playerNames) {
        return """
                You are the Game Master for VERDICT, an AI-powered social deduction game.
                Generate a unique game setup for %d players: %s

                Respond ONLY with valid JSON in this exact format:
                {
                  "theme": "a short dramatic theme title (e.g. 'The Heist at Midnight')",
                  "synopsis": "2-3 sentence atmospheric intro read aloud before the game",
                  "roles": [
                    {
                      "playerName": "<name from the list>",
                      "role": "Civilian|Traitor|Detective|Medic|Witness",
                      "secretMission": "a unique secret objective for this player",
                      "alignment": "good|evil"
                    }
                  ],
                  "winConditions": {
                    "good": "how the good team wins",
                    "evil": "how the evil team wins"
                  }
                }

                Rules:
                - Exactly 1-2 Traitors depending on player count (1 traitor for <6 players, 2 for 6+)
                - Every role must have a creative, specific secret mission
                - Theme must be unique and dramatic
                - Keep it fun and Gen Z appropriate
                """.formatted(playerCount, String.join(", ", playerNames));
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        var candidates = (List<Map<String, Object>>) response.get("candidates");
        var content = (Map<String, Object>) candidates.get(0).get("content");
        var parts = (List<Map<String, Object>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }

    private GameSetup parseGameSetup(String raw, List<String> playerNames) {
        try {
            String cleaned = raw.replaceAll("```json", "").replaceAll("```", "").trim();
            return objectMapper.readValue(cleaned, GameSetup.class);
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getMessage());
            return mockGameSetup(playerNames);
        }
    }

    private GameSetup mockGameSetup(List<String> playerNames) {
        List<GameSetup.PlayerRole> roles = new java.util.ArrayList<>();
        for (int i = 0; i < playerNames.size(); i++) {
            boolean isTraitor = i == 0;
            roles.add(GameSetup.PlayerRole.builder()
                    .playerName(playerNames.get(i))
                    .role(isTraitor ? "Traitor" : i == 1 ? "Detective" : "Civilian")
                    .secretMission(isTraitor
                            ? "Eliminate all Detectives before sunrise"
                            : "Find and vote out the Traitor")
                    .alignment(isTraitor ? "evil" : "good")
                    .build());
        }
        return GameSetup.builder()
                .theme("The Last Signal")
                .synopsis("A distress signal from an abandoned station. One of you sent it. One of you wishes you hadn't come.")
                .roles(roles)
                .winConditions(GameSetup.WinConditions.builder()
                        .good("Vote out all Traitors before time runs out")
                        .evil("Eliminate enough players to take majority")
                        .build())
                .build();
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class GameSetup {
        private String theme;
        private String synopsis;
        private List<PlayerRole> roles;
        private WinConditions winConditions;

        @lombok.Data
        @lombok.Builder
        @lombok.NoArgsConstructor
        @lombok.AllArgsConstructor
        public static class PlayerRole {
            private String playerName;
            private String role;
            private String secretMission;
            private String alignment;
        }

        @lombok.Data
        @lombok.Builder
        @lombok.NoArgsConstructor
        @lombok.AllArgsConstructor
        public static class WinConditions {
            private String good;
            private String evil;
        }
    }
}
