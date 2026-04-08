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
            String raw = callGemini(buildSetupPrompt(playerCount, playerNames));
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
        if (geminiApiKey == null || geminiApiKey.isBlank())
            return new WorldEvent("Power Surge", "The lights flicker. Someone moved when they shouldn't have.", "All players must reveal their location.");
        try {
            return objectMapper.readValue(clean(callGemini(buildWorldEventPrompt(theme, alivePlayers))), WorldEvent.class);
        } catch (Exception e) {
            log.error("World event failed: {}", e.getMessage());
            return new WorldEvent("Static Interference", "Communications go dark.", "No chat for the next 15 seconds.");
        }
    }

    // ── Observer Note ──────────────────────────────────────────────────────

    public String generateObserverNote(String theme, List<String> abilityLog) {
        if (geminiApiKey == null || geminiApiKey.isBlank())
            return "Someone used an ability this round that they haven't mentioned.";
        try {
            String prompt = """
                    You are the Observer in VERDICT, a social deduction game. Theme: "%s".
                    Abilities used this round: %s

                    Write ONE cryptic hint for the discussion phase.
                    Rules:
                    - Do NOT name the player directly
                    - Make it suspicious but not definitive — players should debate it
                    - 1 sentence only
                    - Style: mysterious, like a surveillance report
                    - Example: "Someone's ability result contradicts what they claimed in the lobby."
                    Just the sentence. Nothing else.
                    """.formatted(theme, String.join("; ", abilityLog));
            return clean(callGemini(prompt));
        } catch (Exception e) {
            return "The Observer notes: not everything that happened this round has been mentioned.";
        }
    }

    // ── Case File ──────────────────────────────────────────────────────────

    public String generateCaseFile(String theme, List<String> playerNames,
                                    String traitorName, String traitorRole,
                                    String winner, List<String> eliminationOrder) {
        if (geminiApiKey == null || geminiApiKey.isBlank())
            return "The truth was hiding in plain sight. " + traitorName + " played the perfect game until the very end. Nobody saw it coming.";
        try {
            return clean(callGemini(buildCaseFilePrompt(theme, playerNames, traitorName, traitorRole, winner, eliminationOrder)));
        } catch (Exception e) {
            return "The game ended. " + traitorName + " was among you all along.";
        }
    }

    // ── Prompts ────────────────────────────────────────────────────────────

    private String buildSetupPrompt(int playerCount, List<String> playerNames) {
        return """
                You are the Game Master for VERDICT, an AI social deduction game.
                Generate a unique game setup for %d players: %s

                Pick one theme from: heist / paranoia / conspiracy / prophecy / betrayal — make it dramatic and specific.

                Respond ONLY with valid JSON, no markdown:
                {
                  "theme": "short dramatic title e.g. 'The Midnight Heist'",
                  "synopsis": "2 sentences, atmospheric, read aloud before game starts",
                  "roles": [
                    {
                      "playerName": "<exact name from list>",
                      "roleName": "dramatic one-word role name",
                      "alignment": "good|evil",
                      "winCondition": "specific, personal win condition — not just 'survive'",
                      "ability": "ONE active ability usable once per game — must target another player, creates public information (e.g. 'Force one player to publicly answer yes or no: are you on the evil side?')",
                      "restriction": "one restriction that adds tension (e.g. 'Cannot vote in round 1')"
                    }
                  ],
                  "winConditions": {
                    "good": "how cooperators win",
                    "evil": "how antagonists win"
                  }
                }

                Critical rules:
                - Exactly %s antagonist(s). Make the line between good and evil BLURRY.
                - Abilities MUST create public information when used — this is what discussion is based on
                - Each ability should be unique across all roles
                - Keep it Gen Z, dramatic, screenshot-worthy
                """.formatted(
                        playerCount, String.join(", ", playerNames),
                        playerCount < 6 ? "1" : "2"
                );
    }

    private String buildWorldEventPrompt(String theme, List<String> alivePlayers) {
        return """
                You are the Game Master for VERDICT. Theme: "%s". Alive players: %s.
                Generate ONE world event that interrupts the game RIGHT NOW.
                Respond ONLY with valid JSON, no markdown:
                {
                  "title": "2-3 word dramatic title e.g. 'POWER FAILURE'",
                  "description": "1-2 sentences describing what just happened to everyone",
                  "effect": "the actual game rule change — specific and immediate"
                }
                """.formatted(theme, String.join(", ", alivePlayers));
    }

    private String buildCaseFilePrompt(String theme, List<String> allPlayers,
                                        String traitorName, String traitorRole,
                                        String winner, List<String> eliminationOrder) {
        return """
                You are the Game Master for VERDICT. Write the post-game Case File.
                Theme: %s | Players: %s | Antagonist: %s (%s) | Winner: %s side | Eliminations: %s
                Write EXACTLY 3 dramatic sentences using actual player names.
                Style: cinematic, past tense, true crime documentary narrator.
                Make it screenshot-worthy. No JSON. Just 3 sentences.
                """.formatted(theme, String.join(", ", allPlayers), traitorName, traitorRole,
                        winner, String.join(" → ", eliminationOrder));
    }

    // ── Gemini call ────────────────────────────────────────────────────────

    private String callGemini(String prompt) {
        Map<String, Object> req = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );
        @SuppressWarnings("unchecked")
        Map<String, Object> resp = restTemplate.postForObject(GEMINI_URL + geminiApiKey, req, Map.class);
        @SuppressWarnings("unchecked")
        var candidates = (List<Map<String, Object>>) resp.get("candidates");
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
                    .winCondition(evil ? "Eliminate all Archivists before round 3" : "Vote out the Phantom")
                    .ability(evil ? "Force one player to publicly answer: are you on the evil side?" : "Reveal one player's ability name to the group")
                    .restriction(evil ? "Cannot vote in round 1" : "Cannot accuse the same player twice")
                    .build());
        }
        return GameSetup.builder()
                .theme("The Last Signal")
                .synopsis("A distress signal from an abandoned station. One of you sent it. One of you wishes you hadn't come.")
                .roles(roles)
                .winConditions(GameSetup.WinConditions.builder()
                        .good("Vote out all antagonists")
                        .evil("Reach majority before cooperators complete their mission")
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
