package com.verdict.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JoinRoomRequest {
    @NotBlank
    private String playerId;

    @NotBlank
    private String displayName;
}
