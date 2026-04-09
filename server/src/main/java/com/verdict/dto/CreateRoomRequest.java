package com.verdict.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateRoomRequest {
    @NotBlank
    private String hostPlayerId;

    @NotBlank
    private String hostDisplayName;

    private int maxPlayers = 8;
}
