package com.verdict.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class JoinRoomRequest {

    @NotBlank(message = "Player ID is required")
    private String playerId;

    @NotBlank(message = "Display name is required")
    @Size(min = 2, max = 20, message = "Name must be 2–20 characters")
    private String playerName;
}
