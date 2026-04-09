package com.verdict.dto;

import com.verdict.entity.GameSession;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomResponse {
    private String sessionId;
    private String roomCode;
    private String hostPlayerId;
    private GameSession.GameStatus status;
    private List<String> playerIds;
    private Map<String, String> playerNames;
    private List<String> spectatorIds;
    private Map<String, String> spectatorNames;
    private int maxPlayers;
    private int currentPlayers;
}
