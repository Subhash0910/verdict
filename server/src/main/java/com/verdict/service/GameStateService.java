package com.verdict.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class GameStateService {

    private final Map<String, GameState> states = new ConcurrentHashMap<>();
    private final GameMasterService gameMasterService;

    public GameStateService(GameMasterService gameMasterService) {
        this.gameMasterService = gameMasterService;
    }

    public void storeScenario(String roomCode, GameMasterService.GeneratedScenario scenario) {
        GameState state = new GameState();
        state.theme = scenario.getThemeTitle();
        state.themePresetId = scenario.getThemePresetId();
        state.synopsis = scenario.getSynopsis();
        state.caseFileTone = scenario.getCaseFileTone();
        state.phase = "ROLE_REVEAL";
        state.maxRounds = scenario.getMaxRounds() == null ? 3 : scenario.getMaxRounds();
        state.winConditions = scenario.getWinConditions();
        state.factionLabels.putAll(scenario.getFactionLabels() == null ? Map.of() : scenario.getFactionLabels());
        state.operationDeck.addAll(scenario.getOperationDeck() == null ? List.of() : scenario.getOperationDeck());

        for (GameMasterService.GeneratedScenario.PlayerRole role : scenario.getRoleAssignments()) {
            state.roles.put(role.getPlayerName(), role);
            state.alivePlayers.add(role.getPlayerName());
            state.allPlayers.add(role.getPlayerName());
            state.trustScores.put(role.getPlayerName(), 50);
            state.accusationCounts.put(role.getPlayerName(), 0);
            state.accusationsMade.put(role.getPlayerName(), 0);
            state.messageCounts.put(role.getPlayerName(), 0);
            state.votesReceived.put(role.getPlayerName(), 0);
        }

        states.put(roomCode, state);
        log.info("Stored scenario for room {}: preset={}, theme='{}'", roomCode, state.themePresetId, state.theme);
    }

    public void clearState(String roomCode) {
        states.remove(roomCode);
        log.info("Cleared game state for room {}", roomCode);
    }

    public GameMasterService.RoundOperation prepareOperationPhase(String roomCode) {
        GameState state = getOrThrow(roomCode);
        resetRoundTransientState(state);
        state.phase = "OPERATION";
        state.currentOperation = gameMasterService.buildRoundOperation(state.scenarioView(), state.round, new ArrayList<>(state.alivePlayers));
        return state.currentOperation;
    }

    public List<String> startDiscussion(String roomCode) {
        GameState state = getOrThrow(roomCode);
        state.phase = "DISCUSSION";
        List<String> directives = new ArrayList<>();
        directives.add("TRIBUNAL RULE: Hit ACCUSE on a player to open tribunal now. If nobody does, the timer will auto-call the most suspicious player.");
        GameMasterService.RoundOperation operation = state.currentOperation;
        if (operation != null) {
            switch (operation.getOperationId()) {
                case "scan" -> directives.add("SCAN ORDER: " + operation.getPrimaryTarget() + " must answer yes or no before anyone accuses.");
                case "leak" -> directives.add("LEAK ORDER: " + operation.getPrimaryTarget() + " is the subject of tonight's leak. Pressure them for specifics.");
                case "lockdown" -> directives.add("LOCKDOWN PAIR: " + operation.getPrimaryTarget() + " and " + operation.getSecondaryTarget() + " must both speak before any accusation lands.");
                case "signal" -> directives.add("SIGNAL PRIORITY: " + operation.getPrimaryTarget() + " carries amplified accusation weight this round.");
                case "intercept" -> directives.add("INTERCEPT ORDER: " + operation.getPrimaryTarget() + " cannot call tribunal this round.");
                default -> { }
            }
        }
        if (!state.abilityLog.isEmpty()) {
            directives.addAll(state.abilityLog);
        }
        return directives;
    }

    public void forceOperationTimeout(String roomCode) {
        GameState state = getOrThrow(roomCode);
        for (String player : state.alivePlayers) {
            if (!state.abilityUsed.contains(player)) {
                state.abilitySkipped.add(player);
            }
        }
    }

    public boolean canAccuse(String roomCode, String accuserName, String targetName) {
        GameState state = getOrThrow(roomCode);
        if (!state.alivePlayers.contains(accuserName) || !state.alivePlayers.contains(targetName)) {
            return false;
        }
        if (state.blockedAccusers.contains(accuserName)) {
            return false;
        }
        GameMasterService.RoundOperation operation = state.currentOperation;
        if (operation != null && "intercept".equals(operation.getOperationId())
                && targetName != null && accuserName != null
                && accuserName.equals(operation.getPrimaryTarget())) {
            return false;
        }
        return true;
    }

    public int getAccusationTrustPenalty(String roomCode, String accuserName, String targetName) {
        GameState state = getOrThrow(roomCode);
        int penalty = 15 + state.accusationPenaltyBonus.getOrDefault(targetName, 0);
        if (state.currentOperation != null
                && "signal".equals(state.currentOperation.getOperationId())
                && accuserName != null
                && accuserName.equals(state.currentOperation.getPrimaryTarget())) {
            penalty += 7;
        }
        return penalty;
    }

    public void trackAccusation(String roomCode, String accuserName, String targetName) {
        GameState state = getOrThrow(roomCode);
        state.accusationCounts.merge(targetName, 1, Integer::sum);
        state.accusationsMade.merge(accuserName, 1, Integer::sum);
    }

    public TribunalStart startTribunal(String roomCode, String accusedPlayer, String calledBy, boolean forced) {
        GameState state = getOrThrow(roomCode);
        state.phase = "TRIBUNAL";
        state.nominatedPlayer = accusedPlayer;
        state.trialVotes.clear();
        state.lastAccuser = calledBy;
        state.trialForced = forced;
        state.lastSparedPlayer = null;
        List<String> eligibleVoters = state.alivePlayers.stream()
                .filter(player -> !player.equals(accusedPlayer))
                .toList();
        return new TribunalStart(accusedPlayer, eligibleVoters, state.round, forced);
    }

    public String chooseTribunalTarget(String roomCode) {
        GameState state = getOrThrow(roomCode);
        return state.alivePlayers.stream()
                .min(Comparator
                        .comparingInt((String player) -> state.trustScores.getOrDefault(player, 50))
                        .thenComparing(Comparator.comparingInt((String player) -> -state.accusationCounts.getOrDefault(player, 0)))
                        .thenComparing(Comparator.comparingInt((String player) -> -state.messageCounts.getOrDefault(player, 0))))
                .orElse(null);
    }

    public TribunalVoteResult castTribunalVote(String roomCode, String voterId, String choice) {
        GameState state = getOrThrow(roomCode);
        String normalizedChoice = choice == null ? "" : choice.trim().toUpperCase();
        String previous = state.trialVotes.put(voterId, normalizedChoice);
        if ("CONDEMN".equals(previous) && !"CONDEMN".equals(normalizedChoice)) {
            state.votesReceived.computeIfPresent(state.nominatedPlayer, (key, value) -> Math.max(0, value - 1));
        }
        if ("CONDEMN".equals(normalizedChoice) && !"CONDEMN".equals(previous)) {
            state.votesReceived.merge(state.nominatedPlayer, 1, Integer::sum);
        }

        Map<String, Long> tallies = buildTribunalTallies(state);
        boolean allVoted = state.trialVotes.size() >= eligibleVoterCount(state);
        return new TribunalVoteResult(tallies, allVoted);
    }

    public TribunalVoteResult forceTribunalTimeout(String roomCode) {
        GameState state = getOrThrow(roomCode);
        for (String player : state.alivePlayers) {
            if (!player.equals(state.nominatedPlayer)) {
                state.trialVotes.putIfAbsent(player, "SPARE");
            }
        }
        return new TribunalVoteResult(buildTribunalTallies(state), true);
    }

    public TribunalResolution resolveTribunal(String roomCode) {
        GameState state = getOrThrow(roomCode);
        String accused = state.nominatedPlayer;
        Map<String, Long> tallies = buildTribunalTallies(state);
        int condemnVotes = tallies.getOrDefault("CONDEMN", 0L).intValue();
        int spareVotes = tallies.getOrDefault("SPARE", 0L).intValue();

        String clutchVoter = null;
        if (condemnVotes > spareVotes) {
            int runningCondemn = 0;
            for (Map.Entry<String, String> entry : state.trialVotes.entrySet()) {
                if ("CONDEMN".equals(entry.getValue())) {
                    runningCondemn++;
                    if (runningCondemn > spareVotes) {
                        clutchVoter = entry.getKey();
                        break;
                    }
                }
            }
            state.lastClutchVoter = clutchVoter;
            return eliminateAfterTribunal(state, accused, condemnVotes, spareVotes);
        }

        state.lastSparedPlayer = accused;
        int trust = state.trustScores.getOrDefault(accused, 50);
        state.trustScores.put(accused, Math.max(0, trust - 12));
        boolean gameOver = state.round >= state.maxRounds || isParityReached(state);
        String winner = gameOver ? "evil" : "";
        if (gameOver) {
            state.phase = "GAME_OVER";
        } else {
            state.round += 1;
            state.phase = "ROUND_COMPLETE";
        }
        clearPostTribunalTransientState(state);
        return new TribunalResolution(
                false,
                accused,
                condemnVotes,
                spareVotes,
                null,
                null,
                null,
                gameOver,
                winner,
                findAntagonist(state),
                new ArrayList<>(state.eliminationOrder),
                clutchVoter,
                state.round
        );
    }

    private TribunalResolution eliminateAfterTribunal(GameState state, String accused, int condemnVotes, int spareVotes) {
        GameMasterService.GeneratedScenario.PlayerRole role = state.roles.get(accused);
        state.alivePlayers.remove(accused);
        state.eliminatedPlayers.add(accused);
        state.eliminationOrder.add(accused);

        boolean gameOver = isGoodVictory(state) || isParityReached(state) || state.round >= state.maxRounds;
        String winner;
        if (isGoodVictory(state)) {
            winner = "good";
            state.phase = "GAME_OVER";
        } else if (isParityReached(state) || state.round >= state.maxRounds) {
            winner = "evil";
            state.phase = "GAME_OVER";
        } else {
            winner = "";
            state.round += 1;
            state.phase = "ROUND_COMPLETE";
        }

        clearPostTribunalTransientState(state);
        return new TribunalResolution(
                true,
                accused,
                condemnVotes,
                spareVotes,
                accused,
                role != null ? role.getRoleName() : "Unknown",
                role != null ? role.getAlignment() : "unknown",
                gameOver,
                winner,
                findAntagonist(state),
                new ArrayList<>(state.eliminationOrder),
                state.lastClutchVoter,
                state.round
        );
    }

    public AbilityOutcome useAbility(String roomCode, String playerName, String targetName) {
        GameState state = getOrThrow(roomCode);
        if (state.abilityUsed.contains(playerName)) {
            return null;
        }
        state.abilityUsed.add(playerName);
        state.playersWhoUsedAbility.add(playerName);
        GameMasterService.GeneratedScenario.PlayerRole role = state.roles.get(playerName);
        String abilityName = role != null ? role.getAbility() : "their power";
        String roleId = role != null ? role.getRoleChassisId() : "";
        GameMasterService.GeneratedScenario.PlayerRole targetRole = state.roles.get(targetName);
        int trustDelta = "leak".equals(state.currentOperation != null ? state.currentOperation.getOperationId() : "")
                && targetName != null
                && targetName.equals(state.currentOperation.getPrimaryTarget()) ? -12 : -8;

        List<String> directives = new ArrayList<>();
        String publicText;

        switch (roleId) {
            case "archivist" -> {
                String revealedPower = targetRole != null ? targetRole.getRoleName() : "Unknown";
                publicText = "ARCHIVE REVEAL: " + playerName + " exposed " + targetName + " as carrying the [" + revealedPower + "] file.";
                trustDelta = targetRole != null && "evil".equals(targetRole.getAlignment()) ? -14 : 4;
                directives.add("ARCHIVE PRESSURE: " + targetName + " now has to explain what that public power means for the room.");
            }
            case "witness" -> {
                publicText = "WITNESS ORDER: " + playerName + " put " + targetName + " on the record.";
                trustDelta = -6;
                directives.add("WITNESS CHECK: " + targetName + " must answer plainly: did you use your power this round?");
            }
            case "cipher" -> {
                boolean verified = targetRole != null && "good".equals(targetRole.getAlignment());
                publicText = "CIPHER READ: " + playerName + " tagged " + targetName + " as " + (verified ? "VERIFIED" : "UNSTABLE") + ".";
                trustDelta = verified ? 8 : -12;
                directives.add("CIPHER PRESSURE: challenge " + playerName + " on why this read should shape tribunal.");
            }
            case "handler" -> {
                publicText = "HANDLER ORDER: " + playerName + " forced " + targetName + " into the spotlight.";
                trustDelta = -7;
                directives.add("HANDLER CHECK: " + targetName + " must say who they would spare right now.");
            }
            case "specter" -> {
                publicText = "SPECTER LOCK: " + playerName + " jammed " + targetName + "'s accusation channel.";
                trustDelta = -4;
                state.blockedAccusers.add(targetName);
                directives.add("SPECTER EFFECT: " + targetName + " cannot call tribunal this round.");
            }
            case "broker" -> {
                String pairedPlayer = selectBrokerPair(state, playerName, targetName);
                publicText = "BROKER PAIR: " + playerName + " forced " + targetName + " into a side-by-side answer check.";
                trustDelta = -6;
                if (pairedPlayer != null) {
                    directives.add("BROKER ORDER: " + targetName + " and " + pairedPlayer + " must answer the same question: who feels safest right now?");
                } else {
                    directives.add("BROKER ORDER: " + targetName + " must explain who feels safest right now and why.");
                }
            }
            case "phantom" -> {
                publicText = "PHANTOM PRESSURE: " + playerName + " forced a direct answer out of " + targetName + ".";
                trustDelta = -9;
                directives.add("PHANTOM CHECK: " + targetName + " must answer yes or no: did you use your power this round?");
            }
            case "saboteur" -> {
                publicText = "SABOTEUR SPOTLIGHT: " + playerName + " made " + targetName + " declare a public trust read.";
                trustDelta = -10;
                directives.add("SABOTEUR ORDER: " + targetName + " must name who they trust most right now.");
            }
            case "shade" -> {
                publicText = "SHADE MARK: " + playerName + " marked " + targetName + " for a harsher tribunal hit.";
                trustDelta = -9;
                state.accusationPenaltyBonus.merge(targetName, 10, Integer::sum);
                directives.add("SHADE EFFECT: the next accusation against " + targetName + " hits harder.");
            }
            default -> {
                publicText = playerName + " used [" + abilityName + "] on " + targetName + ".";
                directives.add(playerName + " put pressure on " + targetName + " with [" + abilityName + "].");
            }
        }

        if (targetName != null && !targetName.isBlank()) {
            int current = state.trustScores.getOrDefault(targetName, 50);
            state.trustScores.put(targetName, Math.max(0, Math.min(100, current + trustDelta)));
        }

        state.abilityLog.addAll(directives);
        return new AbilityOutcome(publicText, targetName, trustDelta, directives);
    }

    public void markAbilityPhaseSkipped(String roomCode, String playerName) {
        getOrThrow(roomCode).abilitySkipped.add(playerName);
    }

    public boolean allPlayersActed(String roomCode) {
        GameState state = getOrThrow(roomCode);
        Set<String> acted = new HashSet<>(state.abilityUsed);
        acted.addAll(state.abilitySkipped);
        return acted.containsAll(state.alivePlayers);
    }

    public void trackMessage(String roomCode, String playerName) {
        GameState state = states.get(roomCode);
        if (state == null) {
            return;
        }
        state.messageCounts.merge(playerName, 1, Integer::sum);
    }

    public List<Map<String, Object>> buildStats(String roomCode) {
        GameState state = getOrThrow(roomCode);
        Map<String, List<String>> receipts = buildReceipts(state);
        List<Map<String, Object>> list = new ArrayList<>();

        for (String player : state.allPlayers) {
            GameMasterService.GeneratedScenario.PlayerRole role = state.roles.get(player);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("playerName", player);
            entry.put("roleName", role != null ? role.getRoleName() : "?");
            entry.put("alignment", role != null ? role.getAlignment() : "?");
            entry.put("factionLabel", role != null ? role.getFactionLabel() : "");
            entry.put("accusationsReceived", state.accusationCounts.getOrDefault(player, 0));
            entry.put("accusationsMade", state.accusationsMade.getOrDefault(player, 0));
            entry.put("votesReceived", state.votesReceived.getOrDefault(player, 0));
            entry.put("messagesSent", state.messageCounts.getOrDefault(player, 0));
            entry.put("abilityUsed", state.abilityUsed.contains(player) || state.playersWhoUsedAbility.contains(player));
            entry.put("finalTrust", state.trustScores.getOrDefault(player, 50));
            entry.put("survived", state.alivePlayers.contains(player));
            entry.put("receipts", receipts.getOrDefault(player, List.of()));
            list.add(entry);
        }

        list.sort((left, right) -> Integer.compare(
                ((Number) right.getOrDefault("accusationsReceived", 0)).intValue(),
                ((Number) left.getOrDefault("accusationsReceived", 0)).intValue()
        ));

        return list;
    }

    private Map<String, List<String>> buildReceipts(GameState state) {
        Map<String, List<String>> receipts = new LinkedHashMap<>();
        state.allPlayers.forEach(player -> receipts.put(player, new ArrayList<>()));

        String mostTrusted = state.allPlayers.stream()
                .max(Comparator.comparingInt(player -> state.trustScores.getOrDefault(player, 0)))
                .orElse(null);
        String mostSuspected = state.allPlayers.stream()
                .max(Comparator.comparingInt(player -> state.accusationCounts.getOrDefault(player, 0)))
                .orElse(null);
        String chaosAgent = state.allPlayers.stream()
                .max(Comparator.comparingInt(player -> state.accusationsMade.getOrDefault(player, 0)))
                .orElse(null);

        String bestLiar = state.allPlayers.stream()
                .filter(player -> {
                    var role = state.roles.get(player);
                    return role != null && "evil".equals(role.getAlignment());
                })
                .findFirst()
                .filter(state.alivePlayers::contains)
                .orElse(mostSuspected);

        if (bestLiar != null) {
            receipts.get(bestLiar).add("Best Liar");
        }
        if (mostTrusted != null) {
            receipts.get(mostTrusted).add("Most Trusted");
        }
        if (mostSuspected != null) {
            receipts.get(mostSuspected).add("Most Suspected");
        }
        if (state.lastClutchVoter != null && receipts.containsKey(state.lastClutchVoter)) {
            receipts.get(state.lastClutchVoter).add("Clutch Vote");
        }
        if (chaosAgent != null) {
            receipts.get(chaosAgent).add("Chaos Agent");
        }

        return receipts;
    }

    public Map<String, Integer> getTrustScores(String roomCode) {
        return getOrThrow(roomCode).trustScores;
    }

    public List<String> getAbilityLog(String roomCode) {
        return getOrThrow(roomCode).abilityLog;
    }

    public void addSpiritMessage(String roomCode, String message) {
        getOrThrow(roomCode).spiritMessages.add(message);
    }

    public GameState getState(String roomCode) {
        return states.get(roomCode);
    }

    private Map<String, Long> buildTribunalTallies(GameState state) {
        Map<String, Long> tallies = new LinkedHashMap<>();
        tallies.put("CONDEMN", state.trialVotes.values().stream().filter("CONDEMN"::equals).count());
        tallies.put("SPARE", state.trialVotes.values().stream().filter("SPARE"::equals).count());
        return tallies;
    }

    private int eligibleVoterCount(GameState state) {
        return Math.max(0, (int) state.alivePlayers.stream().filter(player -> !player.equals(state.nominatedPlayer)).count());
    }

    private void resetRoundTransientState(GameState state) {
        state.nominatedPlayer = null;
        state.trialForced = false;
        state.trialVotes.clear();
        state.abilityUsed.clear();
        state.abilitySkipped.clear();
        state.abilityLog.clear();
        state.confessionUsed.clear();
        state.currentOperation = null;
        state.lastAccuser = null;
        state.lastClutchVoter = null;
        state.lastSparedPlayer = null;
        state.blockedAccusers.clear();
        state.accusationPenaltyBonus.clear();
    }

    private void clearPostTribunalTransientState(GameState state) {
        state.nominatedPlayer = null;
        state.trialForced = false;
        state.trialVotes.clear();
        state.abilityUsed.clear();
        state.abilitySkipped.clear();
        state.abilityLog.clear();
        state.confessionUsed.clear();
        state.currentOperation = null;
        state.lastAccuser = null;
        state.blockedAccusers.clear();
        state.accusationPenaltyBonus.clear();
    }

    private String selectBrokerPair(GameState state, String actor, String targetName) {
        return state.alivePlayers.stream()
                .filter(player -> !player.equals(actor))
                .filter(player -> !player.equals(targetName))
                .max(Comparator.comparingInt(player -> state.trustScores.getOrDefault(player, 50)))
                .orElse(null);
    }

    private boolean isGoodVictory(GameState state) {
        return state.alivePlayers.stream()
                .noneMatch(player -> {
                    var role = state.roles.get(player);
                    return role != null && "evil".equals(role.getAlignment());
                });
    }

    private boolean isParityReached(GameState state) {
        long evilAlive = state.alivePlayers.stream()
                .filter(player -> {
                    var role = state.roles.get(player);
                    return role != null && "evil".equals(role.getAlignment());
                })
                .count();
        long goodAlive = state.alivePlayers.stream()
                .filter(player -> {
                    var role = state.roles.get(player);
                    return role != null && "good".equals(role.getAlignment());
                })
                .count();
        return evilAlive >= goodAlive;
    }

    private String findAntagonist(GameState state) {
        return state.allPlayers.stream()
                .filter(player -> {
                    var role = state.roles.get(player);
                    return role != null && "evil".equals(role.getAlignment());
                })
                .findFirst()
                .orElse("Unknown");
    }

    private GameState getOrThrow(String roomCode) {
        GameState state = states.get(roomCode);
        if (state == null) {
            throw new IllegalStateException("No game state for room: " + roomCode);
        }
        return state;
    }

    public static class GameState {
        public String theme;
        public String themePresetId;
        public String synopsis;
        public String caseFileTone;
        public String phase;
        public int round = 1;
        public int maxRounds = 3;
        public String nominatedPlayer;
        public boolean trialForced;
        public String lastAccuser;
        public String lastClutchVoter;
        public String lastSparedPlayer;
        public GameMasterService.GeneratedScenario.WinConditions winConditions;
        public GameMasterService.RoundOperation currentOperation;
        public Map<String, String> factionLabels = new LinkedHashMap<>();
        public Map<String, GameMasterService.GeneratedScenario.PlayerRole> roles = new LinkedHashMap<>();
        public Set<String> alivePlayers = new LinkedHashSet<>();
        public Set<String> eliminatedPlayers = new LinkedHashSet<>();
        public List<String> allPlayers = new ArrayList<>();
        public List<String> eliminationOrder = new ArrayList<>();
        public Map<String, String> trialVotes = new LinkedHashMap<>();
        public List<String> spiritMessages = new ArrayList<>();
        public Set<String> abilityUsed = new LinkedHashSet<>();
        public Set<String> abilitySkipped = new LinkedHashSet<>();
        public Set<String> playersWhoUsedAbility = new LinkedHashSet<>();
        public List<String> abilityLog = new ArrayList<>();
        public Set<String> confessionUsed = new LinkedHashSet<>();
        public Set<String> blockedAccusers = new LinkedHashSet<>();
        public Map<String, Integer> trustScores = new LinkedHashMap<>();
        public Map<String, Integer> accusationPenaltyBonus = new LinkedHashMap<>();
        public Map<String, Integer> accusationCounts = new LinkedHashMap<>();
        public Map<String, Integer> accusationsMade = new LinkedHashMap<>();
        public Map<String, Integer> messageCounts = new LinkedHashMap<>();
        public Map<String, Integer> votesReceived = new LinkedHashMap<>();
        public List<GameMasterService.OperationTemplate> operationDeck = new ArrayList<>();

        public GameMasterService.GeneratedScenario scenarioView() {
            return GameMasterService.GeneratedScenario.builder()
                    .themePresetId(themePresetId)
                    .themeTitle(theme)
                    .synopsis(synopsis)
                    .factionLabels(factionLabels)
                    .roleAssignments(new ArrayList<>(roles.values()))
                    .operationDeck(operationDeck)
                    .caseFileTone(caseFileTone)
                    .winConditions(winConditions)
                    .maxRounds(maxRounds)
                    .build();
        }
    }

    public record TribunalStart(String accusedPlayer, List<String> eligibleVoterIds, int round, boolean forced) { }
    public record TribunalVoteResult(Map<String, Long> tallies, boolean allVoted) { }
    public record AbilityOutcome(String publicText, String targetPlayer, int trustDelta, List<String> directives) { }
    public record TribunalResolution(
            boolean eliminated,
            String accusedPlayer,
            int condemnVotes,
            int spareVotes,
            String eliminatedId,
            String eliminatedRole,
            String alignment,
            boolean gameOver,
            String winner,
            String traitorName,
            List<String> eliminationOrder,
            String clutchVoter,
            int nextRound
    ) { }
}
