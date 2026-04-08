package com.verdict.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateRoomRequest {

    @NotBlank(message = "Host player ID is required")
    private String hostPlayerId;

    @NotBlank(message = "Host display name is required")
    @Size(min = 2, max = 20, message = "Name must be 2–20 characters")
    private String hostName;

    private int maxPlayers = 8;
}
