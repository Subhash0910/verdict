package com.verdict.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "game_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false, length = 8)
    private String roomCode;

    @Column(nullable = false)
    private String hostPlayerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GameStatus status;

    // ─ Players (participate in game, get roles) ────────────────────────────────
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "session_players", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "player_id")
    private List<String> playerIds = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "session_player_names", joinColumns = @JoinColumn(name = "session_id"))
    @MapKeyColumn(name = "player_id")
    @Column(name = "display_name")
    @Builder.Default
    private Map<String, String> playerDisplayNames = new HashMap<>();

    // ─ Spectators (watch only, never get roles) ────────────────────────────
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "session_spectators", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "spectator_id")
    @Builder.Default
    private List<String> spectatorIds = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "session_spectator_names", joinColumns = @JoinColumn(name = "session_id"))
    @MapKeyColumn(name = "spectator_id")
    @Column(name = "display_name")
    @Builder.Default
    private Map<String, String> spectatorDisplayNames = new HashMap<>();

    @Column
    private int maxPlayers = 8;

    @Column
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime startedAt;

    @Column
    private LocalDateTime endedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = GameStatus.WAITING;
    }

    public String getDisplayName(String playerId) {
        String name = playerDisplayNames.get(playerId);
        if (name != null && !name.isBlank()) return name;
        return playerId.length() > 6 ? playerId.substring(playerId.length() - 6) : playerId;
    }

    public String getSpectatorName(String spectatorId) {
        String name = spectatorDisplayNames.get(spectatorId);
        if (name != null && !name.isBlank()) return name;
        return spectatorId.length() > 6 ? spectatorId.substring(spectatorId.length() - 6) : spectatorId;
    }

    public int getSpectatorCount() {
        return spectatorIds == null ? 0 : spectatorIds.size();
    }

    public boolean isSpectator(String id) {
        return spectatorIds != null && spectatorIds.contains(id);
    }

    public enum GameStatus {
        WAITING,
        IN_PROGRESS,
        ENDED
    }
}
