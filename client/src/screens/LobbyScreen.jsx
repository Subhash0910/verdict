import React, { useEffect, useState } from 'react'
import axios from 'axios'
import useLobbySocket from '../hooks/useLobbySocket'
import LobbyGame from '../phaser/LobbyGame'
import GameStartingOverlay from '../components/GameStartingOverlay'
import styles from './LobbyScreen.module.css'

const MIN_PLAYERS = 1

export default function LobbyScreen({ roomData, playerData, onLeave, onGameStart }) {
  const { players, connected, gameEvent } = useLobbySocket(roomData?.roomCode, playerData?.playerId)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [capturedEvent, setCapturedEvent] = useState(null)

  /**
   * Player list resolution priority:
   * 1. WebSocket broadcast (real-time, has real names from server)
   * 2. roomData.playerNames map (from REST response on join/create, has real names)
   * 3. Nothing — never fall back to raw UUIDs
   */
  const displayPlayers = players.length > 0
    ? players  // WebSocket already sends real display names from server
    : (roomData?.playerIds || []).map(id => ({
        playerId: id,
        // Use playerNames map from RoomResponse — server-side resolved names
        playerName: roomData?.playerNames?.[id] || playerData?.playerName || id.slice(-6),
        isHost: id === roomData?.hostPlayerId,
      }))

  useEffect(() => {
    if (gameEvent?.type === 'GAME_STARTING') {
      setCapturedEvent(gameEvent)
      setStarting(true)
      setTimeout(() => onGameStart(gameEvent.theme, gameEvent.synopsis), 6500)
    }
  }, [gameEvent])

  const handleStartGame = async () => {
    setStartError('')
    try {
      await axios.post(`/api/game/${roomData.roomCode}/start`, {
        playerId: playerData.playerId,
      })
    } catch (e) {
      const msg = e.response?.data?.error || e.message
      setStartError(msg)
    }
  }

  const canStart = displayPlayers.length >= MIN_PLAYERS
  const waiting = MIN_PLAYERS - displayPlayers.length

  return (
    <div className={styles.container}>
      <LobbyGame players={displayPlayers} />
      {starting && capturedEvent && (
        <GameStartingOverlay theme={capturedEvent.theme} synopsis={capturedEvent.synopsis} onDone={() => setStarting(false)} />
      )}
      <div className={styles.hud}>
        <div className={styles.roomInfo}>
          <span className={styles.label}>ROOM CODE</span>
          <span className={styles.code}>{roomData?.roomCode}</span>
          <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(roomData?.roomCode)}>📋 Copy</button>
        </div>
        <div className={styles.status}>
          <span className={`${styles.dot} ${connected ? styles.connected : styles.disconnected}`} />
          {connected ? 'Live' : 'Connecting...'}
        </div>
        <div className={styles.players}>
          <div className={styles.playersHeader}>Players — {displayPlayers.length} / {roomData?.maxPlayers}</div>
          {displayPlayers.map(p => (
            <div key={p.playerId} className={styles.playerRow}>
              <span className={styles.avatar}>{p.playerName?.[0]?.toUpperCase() ?? '?'}</span>
              <span className={styles.playerName}>
                {p.playerName}
                {p.isHost && <span className={styles.hostBadge}> 👑</span>}
                {p.playerId === playerData?.playerId && <span className={styles.youBadge}> (you)</span>}
              </span>
            </div>
          ))}
        </div>
        {playerData?.isHost && (
          <>
            <button className="verdict-btn verdict-btn-primary" disabled={!canStart} onClick={handleStartGame}>
              {canStart ? '🚀 Start Game' : `Waiting for ${waiting} more…`}
            </button>
            {startError && <p style={{ color: '#e63946', fontSize: '12px', marginTop: '6px', textAlign: 'center' }}>⚠️ {startError}</p>}
          </>
        )}
        <button className="verdict-btn verdict-btn-secondary" onClick={onLeave}>Leave Room</button>
      </div>
    </div>
  )
}
