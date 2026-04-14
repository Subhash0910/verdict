package com.verdict.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@Slf4j
public class GameMasterService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Random random = new Random();
    private final Deque<String> recentThemePresetIds = new ArrayDeque<>();
    private final Deque<String> recentRoleMixes = new ArrayDeque<>();

    private static final int MAX_RECENT_THEME_HISTORY = 3;
    private static final int MAX_RECENT_ROLE_HISTORY = 3;

    private static final Map<String, ThemePreset> THEME_PRESETS = createThemePresets();
    private static final Map<String, FactionTemplate> FACTION_TEMPLATES = createFactionTemplates();
    private static final Map<String, RoleChassis> ROLE_CHASSIS = createRoleChassis();
    private static final List<OperationTemplate> OPERATION_TEMPLATES = createOperationTemplates();
    private static final Map<Integer, List<List<String>>> ROLE_MIXES = createRoleMixes();

    public synchronized GeneratedScenario generateScenario(int playerCount, List<String> playerNames) {
        ThemePreset themePreset = chooseThemePreset();
        FactionTemplate factionTemplate = FACTION_TEMPLATES.get(themePreset.getFactionTemplateId());
        List<RoleChassis> roleMix = chooseRoleMix(playerCount);
        List<OperationTemplate> operationDeck = chooseOperationDeck();

        ScenarioFlavor flavor = generateScenarioFlavor(themePreset, factionTemplate, roleMix, playerNames);
        Map<String, RoleFlavor> flavorByRoleId = new HashMap<>();
        if (flavor != null && flavor.getRoleFlavor() != null) {
            for (RoleFlavor roleFlavor : flavor.getRoleFlavor()) {
                if (roleFlavor != null && roleFlavor.getRoleChassisId() != null) {
                    flavorByRoleId.put(roleFlavor.getRoleChassisId(), roleFlavor);
                }
            }
        }

        List<RoleChassis> shuffledRoles = new ArrayList<>(roleMix);
        Collections.shuffle(shuffledRoles, random);

        String themeTitle = firstNonBlank(
                flavor != null ? flavor.getThemeTitle() : null,
                themePreset.getDefaultTitle()
        );
        String synopsis = firstNonBlank(
                flavor != null ? flavor.getSynopsis() : null,
                themePreset.getDefaultSynopsis()
        );
        String caseFileTone = firstNonBlank(
                flavor != null ? flavor.getCaseFileTone() : null,
                themePreset.getCaseFileTone()
        );

        Map<String, String> factionLabels = new LinkedHashMap<>();
        factionLabels.put("good", firstNonBlank(
                flavor != null && flavor.getFactionLabels() != null ? flavor.getFactionLabels().get("good") : null,
                factionTemplate.getGoodLabel()
        ));
        factionLabels.put("evil", firstNonBlank(
                flavor != null && flavor.getFactionLabels() != null ? flavor.getFactionLabels().get("evil") : null,
                factionTemplate.getEvilLabel()
        ));

        List<GeneratedScenario.PlayerRole> roles = new ArrayList<>();
        for (int i = 0; i < playerNames.size(); i++) {
            RoleChassis chassis = shuffledRoles.get(i);
            RoleFlavor roleFlavor = flavorByRoleId.get(chassis.getId());
            roles.add(GeneratedScenario.PlayerRole.builder()
                    .playerName(playerNames.get(i))
                    .roleChassisId(chassis.getId())
                    .roleName(firstNonBlank(roleFlavor != null ? roleFlavor.getRoleName() : null, chassis.getBaseName()))
                    .alignment(chassis.getAlignment())
                    .flavorText(firstNonBlank(roleFlavor != null ? roleFlavor.getFlavorText() : null, chassis.getDefaultFlavor()))
                    .winCondition(firstNonBlank(roleFlavor != null ? roleFlavor.getWinCondition() : null, chassis.getDefaultWinCondition()))
                    .ability(chassis.getAbility())
                    .restriction(chassis.getRestriction())
                    .factionLabel(factionLabels.get(chassis.getAlignment()))
                    .build());
        }

        recordThemeAndRoleHistory(themePreset.getId(), roles);

        return GeneratedScenario.builder()
                .themePresetId(themePreset.getId())
                .themeTitle(themeTitle)
                .synopsis(synopsis)
                .factionLabels(factionLabels)
                .roleAssignments(roles)
                .operationDeck(operationDeck)
                .caseFileTone(caseFileTone)
                .winConditions(GeneratedScenario.WinConditions.builder()
                        .good("Expose the hidden " + factionLabels.get("evil") + " before the end of round 3.")
                        .evil("Survive through round 3 or reach parity with the room.")
                        .build())
                .maxRounds(3)
                .build();
    }

    public RoundOperation buildRoundOperation(GeneratedScenario scenario, int round, List<String> alivePlayers) {
        List<OperationTemplate> operationDeck = scenario.getOperationDeck() == null || scenario.getOperationDeck().isEmpty()
                ? OPERATION_TEMPLATES
                : scenario.getOperationDeck();
        OperationTemplate template = operationDeck.get((Math.max(round, 1) - 1) % operationDeck.size());
        List<String> shuffled = new ArrayList<>(alivePlayers);
        Collections.shuffle(shuffled, random);
        String primaryTarget = shuffled.isEmpty() ? null : shuffled.get(0);
        String secondaryTarget = shuffled.size() > 1 ? shuffled.get(1) : primaryTarget;

        return RoundOperation.builder()
                .operationId(template.getId())
                .title(template.getTitle())
                .briefing(template.getBriefing())
                .discussionPrompt(template.getDiscussionPrompt())
                .effectText(template.getEffectText())
                .primaryTarget(primaryTarget)
                .secondaryTarget(secondaryTarget)
                .build();
    }

    public String generateObserverNote(String theme, List<String> abilityLog) {
        if (abilityLog == null || abilityLog.isEmpty()) {
            return "The dossier stays quiet. Someone is still hiding the most important detail.";
        }
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return "Observer note: the loudest story in the room still does not explain every move that happened.";
        }
        try {
            String prompt = """
                    You are writing a one-line observer note for VERDICT.
                    Theme: "%s"
                    Ability log: %s

                    Return one sentence only.
                    Make it suspicious, readable by teenagers, and useful for debate.
                    Do not reveal the hidden antagonist directly.
                    """.formatted(theme, String.join("; ", abilityLog));
            return clean(callGemini(prompt));
        } catch (Exception e) {
            log.warn("Observer note fallback: {}", e.getMessage());
            return "Observer note: one public story still does not match the evidence trail.";
        }
    }

    public String generateCaseFile(String theme, String caseFileTone, List<String> playerNames,
                                   String traitorName, String traitorRole,
                                   String winner, List<String> eliminationOrder) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return "%s broke under pressure, but %s owned the story until the room finally turned. The case closed with %s walking away in the chaos. Everyone left with a different version of what really happened."
                    .formatted(
                            eliminationOrder != null && !eliminationOrder.isEmpty() ? eliminationOrder.get(0) : "Someone",
                            traitorName,
                            "evil".equalsIgnoreCase(winner) ? traitorName : "the cooperators"
                    );
        }
        try {
            String prompt = """
                    You are writing the post-game case file for VERDICT.
                    Theme: %s
                    Tone: %s
                    Players: %s
                    Hidden antagonist: %s (%s)
                    Winner: %s
                    Eliminations: %s

                    Write exactly 3 dramatic sentences.
                    Requirements:
                    - Use real player names.
                    - Sound like a social thriller recap, not fantasy prose.
                    - Make it screenshot-worthy.
                    - Mention the winning side in the final sentence.
                    """.formatted(
                    theme,
                    caseFileTone,
                    String.join(", ", playerNames),
                    traitorName,
                    traitorRole,
                    winner,
                    eliminationOrder == null || eliminationOrder.isEmpty() ? "none" : String.join(" -> ", eliminationOrder)
            );
            return clean(callGemini(prompt));
        } catch (Exception e) {
            log.warn("Case file fallback: {}", e.getMessage());
            return "The room spent the whole night chasing half-truths until " + traitorName + " was dragged into the light. By the time the dust settled, the " + winner + " side had already rewritten the story for themselves. Nobody left that tribunal trusting the same person they trusted at the start.";
        }
    }

    public String generateCaseFile(String theme, List<String> playerNames,
                                   String traitorName, String traitorRole,
                                   String winner, List<String> eliminationOrder) {
        return generateCaseFile(theme, "tense social thriller", playerNames, traitorName, traitorRole, winner, eliminationOrder);
    }

    private ScenarioFlavor generateScenarioFlavor(ThemePreset themePreset,
                                                  FactionTemplate factionTemplate,
                                                  List<RoleChassis> roleMix,
                                                  List<String> playerNames) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.warn("GEMINI_API_KEY not set - using curated scenario flavor");
            return null;
        }

        try {
            String roles = roleMix.stream()
                    .map(role -> role.getId() + "=" + role.getAlignment() + " / base role name: " + role.getBaseName()
                            + " / ability: " + role.getAbility() + " / restriction: " + role.getRestriction())
                    .collect(Collectors.joining("; "));

            String prompt = """
                    You are the AI director for VERDICT, a friend-group social thriller.
                    You are NOT designing rules. The rules are locked.

                    Theme preset:
                    - preset id: %s
                    - vibe: %s
                    - visual family: %s
                    - default title: %s
                    - default synopsis: %s

                    Factions:
                    - good side label base: %s
                    - evil side label base: %s

                    Role chassis in this match:
                    %s

                    Players:
                    %s

                    Return valid JSON only:
                    {
                      "themeTitle": "short dramatic title",
                      "synopsis": "2 short sentences, high tension, easy to read aloud",
                      "caseFileTone": "short phrase describing the recap tone",
                      "factionLabels": {
                        "good": "renamed label for the good side",
                        "evil": "renamed label for the evil side"
                      },
                      "roleFlavor": [
                        {
                          "roleChassisId": "exact chassis id",
                          "roleName": "short dramatic role name",
                          "flavorText": "one sentence in second person",
                          "winCondition": "specific personal objective"
                        }
                      ]
                    }

                    Hard rules:
                    - Keep exactly one evil role.
                    - Do not invent abilities or restrictions.
                    - Do not rename player names.
                    - Make the writing modern, social, and screenshot-worthy.
                    """.formatted(
                    themePreset.getId(),
                    themePreset.getVibe(),
                    themePreset.getVisualFamily(),
                    themePreset.getDefaultTitle(),
                    themePreset.getDefaultSynopsis(),
                    factionTemplate.getGoodLabel(),
                    factionTemplate.getEvilLabel(),
                    roles,
                    String.join(", ", playerNames)
            );

            ScenarioFlavor flavor = objectMapper.readValue(clean(callGemini(prompt)), ScenarioFlavor.class);
            return isValidFlavor(flavor, roleMix) ? flavor : null;
        } catch (Exception e) {
            log.warn("Scenario flavor fallback: {}", e.getMessage());
            return null;
        }
    }

    private boolean isValidFlavor(ScenarioFlavor flavor, List<RoleChassis> roleMix) {
        if (flavor == null || flavor.getRoleFlavor() == null) {
            return false;
        }
        var expectedIds = roleMix.stream().map(RoleChassis::getId).collect(Collectors.toCollection(LinkedHashSet::new));
        var actualIds = flavor.getRoleFlavor().stream()
                .filter(Objects::nonNull)
                .map(RoleFlavor::getRoleChassisId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return expectedIds.equals(actualIds);
    }

    private synchronized ThemePreset chooseThemePreset() {
        List<ThemePreset> available = THEME_PRESETS.values().stream()
                .filter(preset -> !recentThemePresetIds.contains(preset.getId()))
                .toList();
        List<ThemePreset> pool = available.isEmpty() ? new ArrayList<>(THEME_PRESETS.values()) : available;
        return pool.get(random.nextInt(pool.size()));
    }

    private List<RoleChassis> chooseRoleMix(int playerCount) {
        List<List<String>> mixes = ROLE_MIXES.getOrDefault(playerCount, ROLE_MIXES.get(4));
        List<List<String>> available = mixes.stream()
                .filter(mix -> !recentRoleMixes.contains(roleMixKey(mix)))
                .toList();
        List<String> chosen = (available.isEmpty() ? mixes : available).get(random.nextInt((available.isEmpty() ? mixes : available).size()));
        return chosen.stream().map(ROLE_CHASSIS::get).toList();
    }

    private List<OperationTemplate> chooseOperationDeck() {
        List<OperationTemplate> pool = new ArrayList<>(OPERATION_TEMPLATES);
        Collections.shuffle(pool, random);
        return new ArrayList<>(pool.subList(0, Math.min(3, pool.size())));
    }

    private void recordThemeAndRoleHistory(String themePresetId, List<GeneratedScenario.PlayerRole> roles) {
        recentThemePresetIds.addLast(themePresetId);
        while (recentThemePresetIds.size() > MAX_RECENT_THEME_HISTORY) {
            recentThemePresetIds.removeFirst();
        }

        String roleKey = roleMixKey(roles.stream()
                .map(GeneratedScenario.PlayerRole::getRoleChassisId)
                .sorted()
                .toList());
        recentRoleMixes.addLast(roleKey);
        while (recentRoleMixes.size() > MAX_RECENT_ROLE_HISTORY) {
            recentRoleMixes.removeFirst();
        }
    }

    private String roleMixKey(List<String> roleIds) {
        return String.join("|", roleIds);
    }

    private String callGemini(String prompt) {
        Map<String, Object> req = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );
        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                + geminiModel + ":generateContent?key=" + geminiApiKey;
        @SuppressWarnings("unchecked")
        Map<String, Object> resp = restTemplate.postForObject(endpoint, req, Map.class);
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

    private String firstNonBlank(String preferred, String fallback) {
        return preferred != null && !preferred.isBlank() ? preferred : fallback;
    }

    private static Map<String, ThemePreset> createThemePresets() {
        Map<String, ThemePreset> presets = new LinkedHashMap<>();
        presets.put("signal-breach", new ThemePreset("signal-breach", "space", "abandoned relay station panic", "Signal Breach", "A dead station woke up and called all of you back. Someone in the room already knows why.", "forensic panic with static and suspicion", "space-fleet"));
        presets.put("glasshouse", new ThemePreset("glasshouse", "corporate", "elite friends trapped in a public scandal spiral", "Glasshouse Protocol", "A private crisis went public before anyone was ready. Now every statement sounds like evidence.", "slick corporate disaster recap", "corporate-board"));
        presets.put("velvet-noose", new ThemePreset("velvet-noose", "noir", "luxury party, sabotage, and whispered betrayal", "Velvet Noose", "The invite list was exclusive, but the panic is public now. One of you came here planning to burn the night down.", "tabloid true-crime scandal", "court-cabal"));
        presets.put("mirrorhouse", new ThemePreset("mirrorhouse", "horror", "ritual paranoia in a haunted safehouse", "Mirrorhouse", "The house keeps replaying the worst version of every choice. One of you wants that loop to finish the job.", "haunted dossier with witness testimony", "occult-coven"));
        presets.put("red-market", new ThemePreset("red-market", "cyber", "leaks, sabotage, and teenage hacker bravado", "Red Market", "The drop was supposed to stay anonymous. Instead, the whole circle is here and the leak already has a pulse.", "digital sting recap", "cyber-cell"));
        presets.put("ash-court", new ThemePreset("ash-court", "medieval", "royal succession panic in a locked court", "Ash Court", "The throne room sealed before the truth could escape. Every vow sounds noble until someone has to prove it.", "royal scandal chronicle", "court-cabal"));
        presets.put("saint-zero", new ThemePreset("saint-zero", "default", "urban legend energy with modern paranoia", "Saint Zero", "A myth was supposed to stay online. Tonight it is standing in the room with all of you.", "urban conspiracy recap", "public-inquiry"));
        presets.put("black-vault", new ThemePreset("black-vault", "default", "secret archive collapse and missing evidence", "Black Vault", "The archive lost power at the exact worst moment. Whatever vanished was worth betraying the room for.", "sealed government memo", "public-inquiry"));
        return presets;
    }

    private static Map<String, FactionTemplate> createFactionTemplates() {
        Map<String, FactionTemplate> templates = new LinkedHashMap<>();
        templates.put("space-fleet", new FactionTemplate("space-fleet", "Crew", "Saboteur"));
        templates.put("corporate-board", new FactionTemplate("corporate-board", "Insiders", "Leakmaster"));
        templates.put("court-cabal", new FactionTemplate("court-cabal", "Loyalists", "Usurper"));
        templates.put("occult-coven", new FactionTemplate("occult-coven", "Witnesses", "Marked One"));
        templates.put("cyber-cell", new FactionTemplate("cyber-cell", "Operators", "Ghost"));
        templates.put("public-inquiry", new FactionTemplate("public-inquiry", "Investigators", "Inside Threat"));
        return templates;
    }

    private static Map<String, RoleChassis> createRoleChassis() {
        Map<String, RoleChassis> roles = new LinkedHashMap<>();
        roles.put("phantom", new RoleChassis("phantom", "Phantom", "evil",
                "Force one player to publicly answer yes or no: did you use your power this round?",
                "Cannot call the first tribunal of the match.",
                "Survive through the third tribunal or reach parity with the room.",
                "You always seem calm right before things go wrong."));
        roles.put("saboteur", new RoleChassis("saboteur", "Saboteur", "evil",
                "Pick one player to publicly state who they trust most right now.",
                "Cannot target the same player twice.",
                "Break the room's trust long enough to leave with the win.",
                "You do not need the room to like you. You only need them to guess wrong."));
        roles.put("shade", new RoleChassis("shade", "Shade", "evil",
                "Mark one player so the next accusation against them hits harder.",
                "Cannot use your power in round 1.",
                "Stay hidden until the room runs out of safe choices.",
                "You win by making certainty feel impossible."));
        roles.put("archivist", new RoleChassis("archivist", "Archivist", "good",
                "Reveal one player's power title to everyone.",
                "Cannot accuse in the same round you reveal.",
                "Build a public trail strong enough to expose the hidden threat.",
                "You remember details nobody else even noticed."));
        roles.put("witness", new RoleChassis("witness", "Witness", "good",
                "Force one player to publicly confirm or deny that they acted this round.",
                "Must send at least one discussion message before tribunal.",
                "Stay alive long enough to point the room at the truth.",
                "You saw something real, but nobody knows if they should trust your version of it."));
        roles.put("cipher", new RoleChassis("cipher", "Cipher", "good",
                "Announce one player's read as either VERIFIED or UNSTABLE.",
                "Cannot target a player who targeted you last round.",
                "Turn the room's noise into one clear answer before time runs out.",
                "Patterns make sense to you before people do."));
        roles.put("handler", new RoleChassis("handler", "Handler", "good",
                "Force one player to publicly say who they would spare right now.",
                "Must vote in every tribunal or lose your power.",
                "Keep the room moving until the antagonist makes a mistake.",
                "You know how panic spreads, and you know how to weaponize that."));
        roles.put("specter", new RoleChassis("specter", "Specter", "good",
                "Block one player's accusation for this round.",
                "Cannot use your power in the final round.",
                "Keep the room alive long enough to corner the real threat.",
                "Nobody is fully sure which side of the glass you are standing on."));
        roles.put("broker", new RoleChassis("broker", "Broker", "good",
                "Make two players publicly answer the same question one after the other.",
                "Cannot target the same pair twice.",
                "Force contradictions into the open before the antagonist can coast.",
                "You do not chase truth quietly. You drag it into the middle of the room."));
        return roles;
    }

    private static List<OperationTemplate> createOperationTemplates() {
        return List.of(
                new OperationTemplate("scan", "Scan Order",
                        "A live scan has flagged one player for immediate scrutiny.",
                        "The scanned player must answer with a clear yes or no before anyone accuses.",
                        "The room gets one forced binary answer before tribunal."),
                new OperationTemplate("leak", "Leak Order",
                        "A fragment of the case has surfaced and points at one player.",
                        "The leaked player must explain why the room should still trust them.",
                        "A trust clue is dropped into the evidence board."),
                new OperationTemplate("lockdown", "Lockdown Pair",
                        "Two players are trapped in the same line of questioning.",
                        "The paired players must each post one statement before accusing anyone.",
                        "The room watches for contradictions between the pair."),
                new OperationTemplate("signal", "Signal Priority",
                        "One player has temporary speaking authority for this round.",
                        "Their accusation hits harder if they decide to call tribunal.",
                        "The room is pushed toward one louder voice."),
                new OperationTemplate("intercept", "Intercept Order",
                        "One player's accusation channel has been jammed.",
                        "The intercepted player cannot call tribunal this round.",
                        "The room must work around a missing accusation option.")
        );
    }

    private static Map<Integer, List<List<String>>> createRoleMixes() {
        Map<Integer, List<List<String>>> mixes = new LinkedHashMap<>();
        mixes.put(4, List.of(
                List.of("phantom", "archivist", "witness", "handler"),
                List.of("saboteur", "cipher", "specter", "broker"),
                List.of("shade", "archivist", "cipher", "witness")
        ));
        mixes.put(5, List.of(
                List.of("phantom", "archivist", "witness", "handler", "cipher"),
                List.of("saboteur", "broker", "cipher", "specter", "witness"),
                List.of("shade", "archivist", "broker", "handler", "specter")
        ));
        mixes.put(6, List.of(
                List.of("phantom", "archivist", "witness", "handler", "cipher", "specter"),
                List.of("saboteur", "broker", "cipher", "specter", "witness", "handler"),
                List.of("shade", "archivist", "broker", "handler", "witness", "cipher")
        ));
        return mixes;
    }

    @Data
    @AllArgsConstructor
    public static class ThemePreset {
        private String id;
        private String visualFamily;
        private String vibe;
        private String defaultTitle;
        private String defaultSynopsis;
        private String caseFileTone;
        private String factionTemplateId;
    }

    @Data
    @AllArgsConstructor
    public static class FactionTemplate {
        private String id;
        private String goodLabel;
        private String evilLabel;
    }

    @Data
    @AllArgsConstructor
    public static class RoleChassis {
        private String id;
        private String baseName;
        private String alignment;
        private String ability;
        private String restriction;
        private String defaultWinCondition;
        private String defaultFlavor;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OperationTemplate {
        private String id;
        private String title;
        private String briefing;
        private String discussionPrompt;
        private String effectText;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoundOperation {
        private String operationId;
        private String title;
        private String briefing;
        private String discussionPrompt;
        private String effectText;
        private String primaryTarget;
        private String secondaryTarget;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeneratedScenario {
        private String themePresetId;
        private String themeTitle;
        private String synopsis;
        private Map<String, String> factionLabels;
        private List<PlayerRole> roleAssignments;
        private List<OperationTemplate> operationDeck;
        private String caseFileTone;
        private WinConditions winConditions;
        private Integer maxRounds;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class PlayerRole {
            private String playerName;
            private String roleChassisId;
            private String roleName;
            private String alignment;
            private String flavorText;
            private String winCondition;
            private String ability;
            private String restriction;
            private String factionLabel;
        }

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class WinConditions {
            private String good;
            private String evil;
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScenarioFlavor {
        private String themeTitle;
        private String synopsis;
        private String caseFileTone;
        private Map<String, String> factionLabels;
        private List<RoleFlavor> roleFlavor;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleFlavor {
        private String roleChassisId;
        private String roleName;
        private String flavorText;
        private String winCondition;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorldEvent {
        private String title;
        private String description;
        private String effect;
    }
}
