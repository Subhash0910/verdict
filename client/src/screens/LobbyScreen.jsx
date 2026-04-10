import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import useLobbySocket from '../hooks/useLobbySocket'
import LobbyGame from '../phaser/LobbyGame'
import GameStartingOverlay from '../components/GameStartingOverlay'
import RoomQR from '../components/RoomQR'
import { useSoundContext } from '../context/SoundContext'
import styles from './LobbyScreen.module.css'

const MIN_PLAYERS = 4

export default function LobbyScreen({ roomData, playerData, onLeave, onGameStart }) {
  const { players, spectatorCount, connected, gameEvent } = useLobbySocket(roomData?.roomCode, playerData?.playerId)
  const [starting, setStarting]           = useState(false)
  const [startError, setStartError]       = useState('')
  const [capturedEvent, setCapturedEvent] = useState(null)
  const [copied, setCopied]               = useState(false)
  const [showQR, setShowQR]               = useState(false)
  const { isMuted, toggleMute }           = useSoundContext()

  // Refs to prevent multiple firings
  const hasStarted    = useRef(false)   // guard: GAME_STARTING only fires once
  const onGameStartRef = useRef(onGameStart)
  const startTimerRef  = useRef(null)

  // Keep ref in sync with latest prop without re-running the effect
  useEffect(() => { onGameStartRef.current = onGameStart }, [onGameStart])

  const displayPlayers = players.length > 0
    ? players
    : (roomData?.playerIds || []).map(id => ({
        playerId: id,
        playerName: roomData?.playerNames?.[id] || playerData?.playerName || id.slice(-6),
        isHost: id === roomData?.hostPlayerId,
      }))

  useEffect(() => {
    if (!gameEvent) return

    if (gameEvent.type === 'GAME_STARTING') {
      // Guard: only ever run this once per lobby session
      if (hasStarted.current) return
      hasStarted.current = true

      setCapturedEvent(gameEvent)
      setStarting(true)

      // Clear any previous timer just in case
      if (startTimerRef.current) clearTimeout(startTimerRef.current)

      startTimerRef.current = setTimeout(() => {
        onGameStartRef.current?.(gameEvent.theme, gameEvent.synopsis)
      }, 6500)
    }

    if (gameEvent.type === 'GAME_RESET') {
      // Reset everything including the guard so Play Again works
      hasStarted.current = false
      if (startTimerRef.current) clearTimeout(startTimerRef.current)
      setStarting(false)
      setCapturedEvent(null)
      setStartError('')
    }

    // Cleanup timer on unmount
    return () => {
      if (startTimerRef.current) clearTimeout(startTimerRef.current)
    }
  }, [gameEvent])

  const handleStartGame = async () => {
    setStartError('')
    try {
      await axios.post(`/api/game/${roomData.roomCode}/start`, { playerId: playerData.playerId })
    } catch (e) {
      setStartError(e.response?.data?.error || e.message)
    }
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}?join=${roomData?.roomCode}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const canStart = displayPlayers.length >= MIN_PLAYERS
  const waiting  = MIN_PLAYERS - displayPlayers.length

  const initialSpectators = (roomData?.spectatorIds || []).map(id => ({
    spectatorId: id,
    spectatorName: roomData?.spectatorNames?.[id] || id.slice(-6),
  }))
  const liveSpectatorCount = spectatorCount > 0 ? spectatorCount : initialSpectators.length

  return (
    <div className={styles.container}>
      <LobbyGame players={displayPlayers} />
      {starting && capturedEvent && (
        <GameStartingOverlay
          theme={capturedEvent.theme}
          synopsis={capturedEvent.synopsis}
          onDone={() => setStarting(false)}
        />
      )}

      <div className={styles.hud}>
        <div className={styles.roomInfo}>
          <span className={styles.label}>ROOM CODE</span>
          <span className={styles.code}>{roomData?.roomCode}</span>

          <div className={styles.shareRow}>
            <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(roomData?.roomCode)}>
              📋 Copy Code
            </button>
            <button className={`${styles.copyBtn} ${styles.shareLink}`} onClick={handleCopyLink}>
              {copied ? '✅ Link Copied!' : '🔗 Share Link'}
            </button>
            <button
              className={`${styles.copyBtn} ${showQR ? styles.qrActive : ''}`}
              onClick={() => setShowQR(v => !v)}
              title="Show QR code"
            >
              {showQR ? '❌ Hide QR' : '📷 QR Code'}
            </button>
          </div>

          {showQR && <RoomQR roomCode={roomData?.roomCode} size={180} />}
        </div>

        <div className={styles.status}>
          <span className={`${styles.dot} ${connected ? styles.connected : styles.disconnected}`} />
          {connected ? 'Live' : 'Connecting...'}
          <button
            className={`${styles.muteBtn} ${isMuted ? styles.mutedActive : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {isMuted ? '🔇 Muted' : '🔊 Sound On'}
          </button>
        </div>

        <div className={styles.players}>
          <div className={styles.playersHeader}>
            Players — {displayPlayers.length} / {roomData?.maxPlayers}
            {liveSpectatorCount > 0 && (
              <span className={styles.spectatorBadge}>
                &nbsp;· 👁 {liveSpectatorCount} watching
              </span>
            )}
          </div>

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

          {initialSpectators.length > 0 && (
            <div className={styles.spectatorDivider}>── watching ──</div>
          )}
          {initialSpectators.map(s => (
            <div key={s.spectatorId} className={`${styles.playerRow} ${styles.spectatorRow}`}>
              <span className={styles.avatar} style={{ opacity: 0.35 }}>👁</span>
              <span className={styles.playerName} style={{ opacity: 0.35 }}>
                {s.spectatorName}
                {s.spectatorId === playerData?.playerId && <span className={styles.youBadge}> (you)</span>}
              </span>
            </div>
          ))}

          {!canStart && waiting > 0 && (
            <div className={styles.waitingHint}>
              Waiting for {waiting} more player{waiting > 1 ? 's' : ''}...<br />
              <span className={styles.waitingSub}>Share the link or QR above ⬆️</span>
            </div>
          )}
        </div>

        {playerData?.isHost && !playerData?.isSpectator && (
          <>
            <button className="verdict-btn verdict-btn-primary" disabled={!canStart} onClick={handleStartGame}>
              {canStart ? '🚀 Start Game' : `Need ${waiting} more player${waiting > 1 ? 's' : ''}`}
            </button>
            {startError && (
              <p style={{ color: '#e63946', fontSize: '12px', marginTop: '6px', textAlign: 'center' }}>⚠️ {startError}</p>
            )}
          </>
        )}

        <button className="verdict-btn verdict-btn-secondary" onClick={onLeave}>Leave Room</button>
      </div>
    </div>
  )
}
