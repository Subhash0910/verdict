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
        });
        states.put(roomCode, state);
        log.info("Stored game state for room {}: {} players, theme: '{}'",
                roomCode, state.alivePlayers.size(), state.theme);
    }

    public VoteResult castVote(String roomCode, String voterId, String targetId) {
        var state = getOrThrow(roomCode);
        state.votes.put(voterId, targetId);
        Map<String, Long> counts = new HashMap<>();
        state.votes.values().forEach(t -> counts.merge(t, 1L, Long::sum));
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

        long evilAlive = state.alivePlayers.stream()
                .filter(p -> "evil".equals(state.roles.get(p).getAlignment())).count();
        long goodAlive = state.alivePlayers.stream()
                .filter(p -> "good".equals(state.roles.get(p).getAlignment())).count();

        boolean gameOver = evilAlive == 0 || evilAlive >= goodAlive;
        String winner = gameOver ? (evilAlive == 0 ? "good" : "evil") : "";
        if (gameOver) state.phase = "GAME_OVER";
        else state.phase = "DISCUSSION";

        String traitorName = state.allPlayers.stream()
                .filter(p -> "evil".equals(state.roles.get(p).getAlignment()))
                .findFirst().orElse("Unknown");

        return new EliminationResult(
                eliminated,
                role != null ? role.getRoleName() : "Unknown",
                role != null ? role.getAlignment() : "unknown",
                gameOver, winner, traitorName,
                state.eliminationOrder
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

    // ── Types ───────────────────────────────────────────────────────────────

    public static class GameState {
        public String theme;
        public String synopsis;
        public String phase;
        public GameMasterService.GameSetup.WinConditions winConditions;
        public Map<String, GameMasterService.GameSetup.PlayerRole> roles = new LinkedHashMap<>();
        public Set<String> alivePlayers = new LinkedHashSet<>();
        public Set<String> eliminatedPlayers = new LinkedHashSet<>();
        public List<String> allPlayers = new ArrayList<>();
        public List<String> eliminationOrder = new ArrayList<>();
        public Map<String, String> votes = new LinkedHashMap<>();
        public List<String> spiritMessages = new ArrayList<>();
    }

    public record VoteResult(Map<String, Long> voteCounts, boolean allVoted) {}

    public record EliminationResult(
            String eliminatedId, String role, String alignment,
            boolean gameOver, String winner,
            String traitorName, List<String> eliminationOrder
    ) {}
}
