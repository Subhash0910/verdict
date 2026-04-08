package com.verdict.dto;

import com.verdict.entity.GameSession;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RoomResponse {
    private String sessionId;
    private String roomCode;
    private String hostPlayerId;
    private GameSession.GameStatus status;
    private List<String> playerIds;
    private int maxPlayers;
    private int currentPlayers;
}
