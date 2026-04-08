package com.verdict.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory game state per room.
 * Tracks: roles, alive players, votes, phase.
 * Phase 4: migrate to Redis for multi-instance support.
 */
@Service
@Slf4j
public class GameStateService {

    // roomCode -> GameState
    private final Map<String, GameState> states = new ConcurrentHashMap<>();

    public void storeSetup(String roomCode, GameMasterService.GameSetup setup) {
        var state = new GameState();
        state.theme = setup.getTheme();
        state.synopsis = setup.getSynopsis();
        state.phase = "ROLE_REVEAL";
        setup.getRoles().forEach(r -> {
            state.roles.put(r.getPlayerName(), r);
            state.alivePlayers.add(r.getPlayerName());
        });
        states.put(roomCode, state);
        log.info("Stored game state for room {}: {} players", roomCode, state.alivePlayers.size());
    }

    public VoteResult castVote(String roomCode, String voterId, String targetId) {
        var state = getOrThrow(roomCode);
        state.votes.put(voterId, targetId);
        log.info("Vote cast in {}: {} -> {}", roomCode, voterId, targetId);

        Map<String, Long> counts = new HashMap<>();
        state.votes.values().forEach(t -> counts.merge(t, 1L, Long::sum));

        boolean allVoted = state.votes.size() >= state.alivePlayers.size();
        return new VoteResult(counts, allVoted);
    }

    public EliminationResult resolveElimination(String roomCode) {
        var state = getOrThrow(roomCode);

        // Find most-voted player
        Map<String, Long> counts = new HashMap<>();
        state.votes.values().forEach(t -> counts.merge(t, 1L, Long::sum));
        String eliminated = counts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElseThrow();

        var role = state.roles.get(eliminated);
        state.alivePlayers.remove(eliminated);
        state.eliminatedPlayers.add(eliminated);
        state.votes.clear();

        // Check win conditions
        long traitors = state.alivePlayers.stream()
                .filter(p -> "evil".equals(state.roles.get(p).getAlignment()))
                .count();
        long good = state.alivePlayers.stream()
                .filter(p -> "good".equals(state.roles.get(p).getAlignment()))
                .count();

        boolean gameOver = traitors == 0 || traitors >= good;
        String winner = "";
        if (gameOver) {
            winner = traitors == 0 ? "good" : "evil";
            state.phase = "GAME_OVER";
        } else {
            state.phase = "DISCUSSION";
        }

        log.info("Eliminated {} ({}) from room {}. Game over: {}", eliminated, role.getRole(), roomCode, gameOver);
        return new EliminationResult(
                eliminated,
                role != null ? role.getRole() : "Unknown",
                role != null ? role.getAlignment() : "unknown",
                gameOver,
                winner
        );
    }

    public GameState getState(String roomCode) {
        return states.get(roomCode);
    }

    private GameState getOrThrow(String roomCode) {
        var s = states.get(roomCode);
        if (s == null) throw new RuntimeException("No game state for room: " + roomCode);
        return s;
    }

    // ── Inner types ──────────────────────────────────────────────────────────

    public static class GameState {
        public String theme;
        public String synopsis;
        public String phase;
        public Map<String, GameMasterService.GameSetup.PlayerRole> roles = new LinkedHashMap<>();
        public Set<String> alivePlayers = new LinkedHashSet<>();
        public Set<String> eliminatedPlayers = new LinkedHashSet<>();
        public Map<String, String> votes = new LinkedHashMap<>();
    }

    public record VoteResult(Map<String, Long> voteCounts, boolean allVoted) {}

    public record EliminationResult(
            String eliminatedId,
            String role,
            String alignment,
            boolean gameOver,
            String winner
    ) {}
}
