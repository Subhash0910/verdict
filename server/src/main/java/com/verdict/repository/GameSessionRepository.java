package com.verdict.repository;

import com.verdict.entity.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GameSessionRepository extends JpaRepository<GameSession, String> {
    Optional<GameSession> findByRoomCode(String roomCode);
    boolean existsByRoomCode(String roomCode);
}
