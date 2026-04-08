import React, { useEffect, useState } from 'react'
import axios from 'axios'
import useLobbySocket from '../hooks/useLobbySocket'
import LobbyGame from '../phaser/LobbyGame'
import GameStartingOverlay from '../components/GameStartingOverlay'
import styles from './LobbyScreen.module.css'

export default function LobbyScreen({ roomData, playerData, onLeave }) {
  const { players, connected, gameEvent } = useLobbySocket(roomData?.roomCode, playerData?.playerId)
  const [starting, setStarting] = useState(false)

  const displayPlayers = players.length > 0
    ? players
    : (roomData?.playerIds || []).map(id => ({
        playerId: id,
        playerName: id === playerData?.playerId ? playerData.playerName : id,
        isHost: id === roomData?.hostPlayerId,
      }))

  useEffect(() => {
    if (gameEvent?.type === 'GAME_STARTING') {
      setStarting(true)
    }
  }, [gameEvent])

  const handleStartGame = async () => {
    try {
      await axios.post(`/api/game/${roomData.roomCode}/start`, {
        playerId: playerData.playerId,
      })
    } catch (e) {
      console.error('Failed to start game:', e)
    }
  }

  return (
    <div className={styles.container}>
      <LobbyGame players={displayPlayers} />

      {starting && gameEvent && (
        <GameStartingOverlay
          theme={gameEvent.theme}
          synopsis={gameEvent.synopsis}
          onDone={() => setStarting(false)} // Phase 3: navigate to game screen
        />
      )}

      <div className={styles.hud}>
        <div className={styles.roomInfo}>
          <span className={styles.label}>ROOM CODE</span>
          <span className={styles.code}>{roomData?.roomCode}</span>
          <button
            className={styles.copyBtn}
            onClick={() => navigator.clipboard.writeText(roomData?.roomCode)}
          >📋 Copy</button>
        </div>

        <div className={styles.status}>
          <span className={`${styles.dot} ${connected ? styles.connected : styles.disconnected}`} />
          {connected ? 'Live' : 'Connecting...'}
        </div>

        <div className={styles.players}>
          <div className={styles.playersHeader}>
            Players — {displayPlayers.length} / {roomData?.maxPlayers}
          </div>
          {displayPlayers.map(p => (
            <div key={p.playerId} className={styles.playerRow}>
              <span className={styles.avatar}>{p.playerName?.[0]?.toUpperCase() ?? '?'}</span>
              <span className={styles.playerName}>
                {p.playerName}
                {p.isHost && <span className={styles.hostBadge}> 👑</span>}
              </span>
            </div>
          ))}
        </div>

        {playerData?.isHost && (
          <button
            className="verdict-btn verdict-btn-primary"
            disabled={displayPlayers.length < 4}
            onClick={handleStartGame}
            title={displayPlayers.length < 4 ? 'Need at least 4 players' : 'Start!'}
          >
            {displayPlayers.length < 4
              ? `Waiting for ${4 - displayPlayers.length} more…`
              : '🚀 Start Game'}
          </button>
        )}

        <button className="verdict-btn verdict-btn-secondary" onClick={onLeave}>
          Leave Room
        </button>
      </div>
    </div>
  )
}
