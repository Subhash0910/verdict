package com.verdict.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Broadcast over WebSocket to /topic/lobby/{roomCode}
 * whenever a player joins or leaves.
 */
@Data
@Builder
public class LobbyUpdateMessage {
    private String type;          // PLAYER_JOINED | PLAYER_LEFT | GAME_STARTING
    private String roomCode;
    private List<PlayerInfo> players;
    private int maxPlayers;

    @Data
    @Builder
    public static class PlayerInfo {
        private String playerId;
        private String playerName;
        private boolean isHost;
    }
}
