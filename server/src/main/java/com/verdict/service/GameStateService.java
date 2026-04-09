package com.verdict.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class GameStateService {

    private final Map<String, GameState> states = new ConcurrentHashMap<>();

    public void storeSetup(String roomCode, GameMasterService.GameSetup setup) {
        var state = new GameState();
        state.theme = setup.getTheme();
        state.synopsis = setup.getSynopsis();
        state.phase = "ROLE_REVEAL";
        state.winConditions = setup.getWinConditions();
        setup.getRoles().forEach(r -> {
            state.roles.put(r.getPlayerName(), r);
            state.alivePlayers.add(r.getPlayerName());
            state.allPlayers.add(r.getPlayerName());
            state.trustScores.put(r.getPlayerName(), 50);
            state.accusationCounts.put(r.getPlayerName(), 0);
            state.accusationsMade.put(r.getPlayerName(), 0);
            state.messageCounts.put(r.getPlayerName(), 0);
            state.votesReceived.put(r.getPlayerName(), 0);
        });
        states.put(roomCode, state);
        log.info("Stored game state for room {}: {} players, theme: '{}'",
                roomCode, state.alivePlayers.size(), state.theme);
    }

    // ── Stat tracking ───────────────────────────────────────────────────────────────────

    /** Called when a player is formally accused by another player */
    public void trackAccusation(String roomCode, String accuserName, String targetName) {
        var state = getOrThrow(roomCode);
        state.accusationCounts.merge(targetName,  1, Integer::sum);
        state.accusationsMade.merge(accuserName,  1, Integer::sum);
    }

    /** Called for every chat message sent during discussion */
    public void trackMessage(String roomCode, String playerName) {
        var state = states.get(roomCode);
        if (state == null) return;
        state.messageCounts.merge(playerName, 1, Integer::sum);
    }

    /** Build full stats payload for CASE_FILE broadcast */
    public List<Map<String, Object>> buildStats(String roomCode) {
        var state = getOrThrow(roomCode);
        List<Map<String, Object>> list = new ArrayList<>();
        for (String player : state.allPlayers) {
            var role = state.roles.get(player);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("playerName",        player);
            entry.put("roleName",          role != null ? role.getRoleName()  : "?");
            entry.put("alignment",         role != null ? role.getAlignment() : "?");
            entry.put("accusationsReceived",state.accusationCounts.getOrDefault(player, 0));
            entry.put("accusationsMade",    state.accusationsMade.getOrDefault(player, 0));
            entry.put("votesReceived",      state.votesReceived.getOrDefault(player, 0));
            entry.put("messagesSent",       state.messageCounts.getOrDefault(player, 0));
            entry.put("abilityUsed",        state.abilityUsed.contains(player));
            entry.put("finalTrust",         state.trustScores.getOrDefault(player, 50));
            entry.put("survived",           state.alivePlayers.contains(player));
            list.add(entry);
        }
        // Sort by most suspicious (accusations received desc)
        list.sort((a, b) -> Integer.compare(
            (int) b.getOrDefault("accusationsReceived", 0),
            (int) a.getOrDefault("accusationsReceived", 0)
        ));
        return list;
    }

    // ── Existing methods ──────────────────────────────────────────────────────────────────

    public String useAbility(String roomCode, String playerName, String targetName) {
        var state = getOrThrow(roomCode);
        if (state.abilityUsed.contains(playerName)) return null;
        state.abilityUsed.add(playerName);
        var role = state.roles.get(playerName);
        String abilityName = role != null ? role.getAbility() : "their ability";
        state.abilityLog.add(playerName + " used [" + abilityName + "] on " + targetName);
        int current = state.trustScores.getOrDefault(targetName, 50);
        state.trustScores.put(targetName, Math.max(0, current - 8));
        return playerName + " used their ability on " + targetName;
    }

    public boolean hasUsedAbility(String roomCode, String playerName) {
        return getOrThrow(roomCode).abilityUsed.contains(playerName);
    }

    public List<String> getAbilityLog(String roomCode) {
        return getOrThrow(roomCode).abilityLog;
    }

    public Map<String, Integer> getTrustScores(String roomCode) {
        return getOrThrow(roomCode).trustScores;
    }

    public void markAbilityPhaseSkipped(String roomCode, String playerName) {
        getOrThrow(roomCode).abilitySkipped.add(playerName);
    }

    public boolean allPlayersActed(String roomCode) {
        var state = getOrThrow(roomCode);
        Set<String> acted = new HashSet<>();
        acted.addAll(state.abilityUsed);
        acted.addAll(state.abilitySkipped);
        return acted.containsAll(state.alivePlayers);
    }

    public VoteResult castVote(String roomCode, String voterId, String targetId) {
        var state = getOrThrow(roomCode);
        state.votes.put(voterId, targetId);
        // Track votes received
        state.votesReceived.merge(targetId, 1, Integer::sum);
        Map<String, Long> counts = new HashMap<>();
        state.votes.values().forEach(t -> counts.merge(t, 1L, Long::sum));
        int curr = state.trustScores.getOrDefault(targetId, 50);
        state.trustScores.put(targetId, Math.max(0, curr - 5));
        boolean allVoted = state.votes.size() >= state.alivePlayers.size();
        return new VoteResult(counts, allVoted);
    }

    public EliminationResult resolveElimination(String roomCode) {
        var state = getOrThrow(roomCode);
        Map<String, Long> counts = new HashMap<>();
        state.votes.values().forEach(t -> counts.merge(t, 1L, Long::sum));

        String eliminated = counts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElseThrow();

        var role = state.roles.get(eliminated);
        state.alivePlayers.remove(eliminated);
        state.eliminatedPlayers.add(eliminated);
        state.eliminationOrder.add(eliminated);
        state.votes.clear();
        state.abilityUsed.clear();
        state.abilitySkipped.clear();
        state.abilityLog.clear();
        state.confessionUsed.clear();

        long evilAlive = state.alivePlayers.stream()
                .filter(p -> "evil".equals(state.roles.get(p).getAlignment())).count();
        long goodAlive = state.alivePlayers.stream()
                .filter(p -> "good".equals(state.roles.get(p).getAlignment())).count();

        boolean gameOver = evilAlive == 0 || evilAlive >= goodAlive;
        String winner = gameOver ? (evilAlive == 0 ? "good" : "evil") : "";
        if (gameOver) state.phase = "GAME_OVER";
        else state.phase = "ABILITY";

        String traitorName = state.allPlayers.stream()
                .filter(p -> "evil".equals(state.roles.get(p).getAlignment()))
                .findFirst().orElse("Unknown");

        return new EliminationResult(
                eliminated, role != null ? role.getRoleName() : "Unknown",
                role != null ? role.getAlignment() : "unknown",
                gameOver, winner, traitorName, state.eliminationOrder
        );
    }

    public void addSpiritMessage(String roomCode, String message) {
        getOrThrow(roomCode).spiritMessages.add(message);
    }

    public List<String> getSpiritMessages(String roomCode) {
        return getOrThrow(roomCode).spiritMessages;
    }

    public GameState getState(String roomCode) { return states.get(roomCode); }

    private GameState getOrThrow(String roomCode) {
        var s = states.get(roomCode);
        if (s == null) throw new RuntimeException("No game state for room: " + roomCode);
        return s;
    }

    // ─ Types ──────────────────────────────────────────────────────────────────────

    public static class GameState {
        public String theme;
        public String synopsis;
        public String phase;
        public GameMasterService.GameSetup.WinConditions winConditions;
        public Map<String, GameMasterService.GameSetup.PlayerRole> roles   = new LinkedHashMap<>();
        public Set<String>  alivePlayers      = new LinkedHashSet<>();
        public Set<String>  eliminatedPlayers  = new LinkedHashSet<>();
        public List<String> allPlayers         = new ArrayList<>();
        public List<String> eliminationOrder   = new ArrayList<>();
        public Map<String, String>  votes      = new LinkedHashMap<>();
        public List<String> spiritMessages     = new ArrayList<>();
        public Set<String>  abilityUsed        = new LinkedHashSet<>();
        public Set<String>  abilitySkipped     = new LinkedHashSet<>();
        public List<String> abilityLog         = new ArrayList<>();
        public Set<String>  confessionUsed     = new LinkedHashSet<>();
        public Map<String, Integer> trustScores       = new LinkedHashMap<>();
        // ─ Stat tracking fields (new) ─────────────────────────────────────────────
        public Map<String, Integer> accusationCounts  = new LinkedHashMap<>();  // received
        public Map<String, Integer> accusationsMade   = new LinkedHashMap<>();  // fired
        public Map<String, Integer> messageCounts     = new LinkedHashMap<>();
        public Map<String, Integer> votesReceived     = new LinkedHashMap<>();
    }

    public record VoteResult(Map<String, Long> voteCounts, boolean allVoted) {}
    public record EliminationResult(
            String eliminatedId, String role, String alignment,
            boolean gameOver, String winner,
            String traitorName, List<String> eliminationOrder
    ) {}
}
