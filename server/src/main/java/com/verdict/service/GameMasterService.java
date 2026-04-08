package com.verdict.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GameMasterService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=";

    // ── Game Setup ─────────────────────────────────────────────────────────

    public GameSetup generateGameSetup(int playerCount, List<String> playerNames) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.warn("GEMINI_API_KEY not set — using mock");
            return mockGameSetup(playerNames);
        }
        try {
            String prompt = buildSetupPrompt(playerCount, playerNames);
            String raw = callGemini(prompt);
            GameSetup setup = objectMapper.readValue(clean(raw), GameSetup.class);
            log.info("AI generated theme: '{}'", setup.getTheme());
            return setup;
        } catch (Exception e) {
            log.error("Gemini setup failed: {}", e.getMessage());
            return mockGameSetup(playerNames);
        }
    }

    // ── World Event ────────────────────────────────────────────────────────

    public WorldEvent generateWorldEvent(String theme, List<String> alivePlayers) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return new WorldEvent("Power Surge", "The lights flicker. Someone moved when they shouldn't have.", "All players must reveal their location.");
        }
        try {
            String prompt = buildWorldEventPrompt(theme, alivePlayers);
            String raw = callGemini(prompt);
            return objectMapper.readValue(clean(raw), WorldEvent.class);
        } catch (Exception e) {
            log.error("World event generation failed: {}", e.getMessage());
            return new WorldEvent("Static Interference", "Communications go dark for 10 seconds.", "No chat for the next 15 seconds.");
        }
    }

    // ── Case File ──────────────────────────────────────────────────────────

    public String generateCaseFile(String theme, List<String> playerNames,
                                    String traitorName, String traitorRole,
                                    String winner, List<String> eliminationOrder) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return "The truth was hiding in plain sight. " + traitorName + " played the perfect game until the very end. Nobody saw it coming.";
        }
        try {
            String prompt = buildCaseFilePrompt(theme, playerNames, traitorName, traitorRole, winner, eliminationOrder);
            return clean(callGemini(prompt));
        } catch (Exception e) {
            log.error("Case file generation failed: {}", e.getMessage());
            return "The game ended. The truth was revealed. " + traitorName + " was among you all along.";
        }
    }

    // ── Prompts ────────────────────────────────────────────────────────────

    private String buildSetupPrompt(int playerCount, List<String> playerNames) {
        String themes = "heist / paranoia / conspiracy / prophecy / betrayal";
        return """
                You are the Game Master for VERDICT, an AI social deduction game.
                Generate a unique game setup for %d players: %s

                Pick one theme from: %s — make it dramatic and specific.

                Respond ONLY with valid JSON, no markdown:
                {
                  "theme": "short dramatic title e.g. 'The Midnight Heist'",
                  "synopsis": "2 sentences, atmospheric, read aloud before game starts",
                  "roles": [
                    {
                      "playerName": "<exact name from list>",
                      "roleName": "dramatic one-word role name",
                      "alignment": "good|evil",
                      "winCondition": "specific, personal win condition for this role",
                      "ability": "one active ability, usable ONCE per game — make it interesting",
                      "restriction": "one restriction that adds tension — what they CANNOT do"
                    }
                  ],
                  "winConditions": {
                    "good": "how cooperators win",
                    "evil": "how antagonists win"
                  }
                }

                Critical rules:
                - Exactly %d antagonist(s): %s for <6 players, 2 for 6+. Make the line between good and evil BLURRY.
                - Each role must feel completely unique — no two roles can have the same ability
                - Win conditions must be SPECIFIC and achievable, not just "survive"
                - Abilities should create interesting social dynamics (e.g. "Force one player to answer one yes/no question truthfully")
                - Restrictions add tension (e.g. "Cannot vote in the first round")
                - Keep it Gen Z, dramatic, and screenshot-worthy
                """.formatted(
                        playerCount,
                        String.join(", ", playerNames),
                        themes,
                        playerCount < 6 ? 1 : 2,
                        playerCount < 6 ? "1 antagonist" : "2 antagonists"
                );
    }

    private String buildWorldEventPrompt(String theme, List<String> alivePlayers) {
        return """
                You are the Game Master for VERDICT. Theme: "%s". Alive players: %s.

                Generate ONE world event that interrupts the game RIGHT NOW.
                It should be chaotic, unexpected, and clip-worthy.

                Respond ONLY with valid JSON, no markdown:
                {
                  "title": "2-3 word dramatic title e.g. 'POWER FAILURE'",
                  "description": "1-2 sentences describing what just happened to everyone",
                  "effect": "1 sentence — the actual game rule change this causes (specific, immediate)"
                }

                Make it thematic to '%s'. Examples of good effects:
                - "All players must publicly reveal their ability name (not how they used it)"
                - "The player with the most votes right now is immune from elimination this round"
                - "One random player (chosen by GM) must change their vote"
                - "No chat for the next 20 seconds — silent panic"
                """.formatted(theme, String.join(", ", alivePlayers), theme);
    }

    private String buildCaseFilePrompt(String theme, List<String> allPlayers,
                                        String traitorName, String traitorRole,
                                        String winner, List<String> eliminationOrder) {
        return """
                You are the Game Master for VERDICT. Write the post-game Case File.

                Game info:
                - Theme: %s
                - Players: %s
                - The antagonist was: %s (%s)
                - Winner: %s side
                - Elimination order: %s

                Write EXACTLY 3 dramatic sentences using the ACTUAL player names.
                Style: cinematic, past tense, like a true crime documentary narrator.
                Make it sound like something players would screenshot and post.
                No JSON. Just the 3 sentences. Nothing else.
                """.formatted(
                        theme,
                        String.join(", ", allPlayers),
                        traitorName, traitorRole,
                        winner,
                        String.join(" → ", eliminationOrder)
                );
    }

    // ── Gemini call ────────────────────────────────────────────────────────

    private String callGemini(String prompt) {
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );
        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.postForObject(
                GEMINI_URL + geminiApiKey, requestBody, Map.class);
        @SuppressWarnings("unchecked")
        var candidates = (List<Map<String, Object>>) response.get("candidates");
        @SuppressWarnings("unchecked")
        var content = (Map<String, Object>) candidates.get(0).get("content");
        @SuppressWarnings("unchecked")
        var parts = (List<Map<String, Object>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }

    private String clean(String raw) {
        return raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
    }

    // ── Mock fallback ──────────────────────────────────────────────────────

    private GameSetup mockGameSetup(List<String> playerNames) {
        List<GameSetup.PlayerRole> roles = new java.util.ArrayList<>();
        for (int i = 0; i < playerNames.size(); i++) {
            boolean evil = i == 0;
            roles.add(GameSetup.PlayerRole.builder()
                    .playerName(playerNames.get(i))
                    .roleName(evil ? "Phantom" : i == 1 ? "Archivist" : "Witness")
                    .alignment(evil ? "evil" : "good")
                    .winCondition(evil ? "Eliminate all Archivists before round 3 ends" : "Collect 3 secrets and vote out the Phantom")
                    .ability(evil ? "Once: Force one player to skip their vote" : i == 1 ? "Once: Ask any player one yes/no question they must answer" : "Once: Reveal your role to one player privately")
                    .restriction(evil ? "Cannot vote in round 1" : "Cannot accuse the same player twice")
                    .build());
        }
        return GameSetup.builder()
                .theme("The Last Signal")
                .synopsis("A distress signal from an abandoned station. One of you sent it. One of you wishes you hadn't come.")
                .roles(roles)
                .winConditions(GameSetup.WinConditions.builder()
                        .good("Vote out all antagonists before time runs out")
                        .evil("Reach majority before the Archivists complete their mission")
                        .build())
                .build();
    }

    // ── DTOs ───────────────────────────────────────────────────────────────

    @lombok.Data @lombok.Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
    public static class GameSetup {
        private String theme;
        private String synopsis;
        private List<PlayerRole> roles;
        private WinConditions winConditions;

        @lombok.Data @lombok.Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
        public static class PlayerRole {
            private String playerName;
            private String roleName;
            private String alignment;
            private String winCondition;
            private String ability;
            private String restriction;
        }

        @lombok.Data @lombok.Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
        public static class WinConditions {
            private String good;
            private String evil;
        }
    }

    @lombok.Data @lombok.NoArgsConstructor @lombok.AllArgsConstructor
    public static class WorldEvent {
        private String title;
        private String description;
        private String effect;
    }
}
