import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { createRoom, joinRoom } from '../api/roomApi'
import styles from './HomeScreen.module.css'

export default function HomeScreen({ onEnterLobby }) {
  const [mode, setMode] = useState(null) // 'create' | 'join'
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const playerId = React.useMemo(() => {
    let id = localStorage.getItem('verdict_player_id')
    if (!id) { id = uuidv4(); localStorage.setItem('verdict_player_id', id) }
    return id
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return setError('Enter your name')
    setLoading(true); setError('')
    try {
      const res = await createRoom(playerId, name.trim())
      onEnterLobby(res.data, { playerId, playerName: name.trim(), isHost: true })
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create room')
    } finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (!name.trim()) return setError('Enter your name')
    if (!roomCode.trim()) return setError('Enter a room code')
    setLoading(true); setError('')
    try {
      const res = await joinRoom(roomCode.toUpperCase().trim(), playerId, name.trim())
      onEnterLobby(res.data, { playerId, playerName: name.trim(), isHost: false })
    } catch (e) {
      setError(e.response?.data?.error || 'Room not found or full')
    } finally { setLoading(false) }
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.badge}>AI-POWERED</div>
        <h1 className={styles.title}>VERDICT</h1>
        <p className={styles.subtitle}>Social deduction. AI Game Master. No two games alike.</p>
      </div>

      <div className={styles.card}>
        {!mode ? (
          <div className={styles.actions}>
            <button className="verdict-btn verdict-btn-primary" onClick={() => setMode('create')}>
              🎮 Create Room
            </button>
            <button className="verdict-btn verdict-btn-secondary" onClick={() => setMode('join')}>
              🔗 Join Room
            </button>
          </div>
        ) : (
          <div className={styles.form}>
            <button className={styles.back} onClick={() => { setMode(null); setError('') }}>← Back</button>
            <h2>{mode === 'create' ? 'Create a Room' : 'Join a Room'}</h2>

            <input
              className="verdict-input"
              placeholder="Your display name"
              value={name}
              maxLength={20}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
            />

            {mode === 'join' && (
              <input
                className="verdict-input"
                placeholder="Room code (e.g. AB3K9Z)"
                value={roomCode}
                maxLength={8}
                style={{ textTransform: 'uppercase', letterSpacing: '4px' }}
                onChange={e => setRoomCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            )}

            {error && <p className={styles.error}>{error}</p>}

            <button
              className="verdict-btn verdict-btn-primary"
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading ? 'Loading...' : mode === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
