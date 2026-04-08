package com.verdict.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    @ElementCollection
    @CollectionTable(name = "session_players", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "player_id")
    private List<String> playerIds = new ArrayList<>();

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

    public enum GameStatus {
        WAITING,
        IN_PROGRESS,
        ENDED
    }
}
