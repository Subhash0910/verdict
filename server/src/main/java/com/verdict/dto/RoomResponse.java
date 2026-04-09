package com.verdict.dto;

import com.verdict.entity.GameSession;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class RoomResponse {
    private String sessionId;
    private String roomCode;
    private String hostPlayerId;
    private GameSession.GameStatus status;
    private List<String> playerIds;
    private Map<String, String> playerNames; // playerId -> displayName
    private int maxPlayers;
    private int currentPlayers;
}
