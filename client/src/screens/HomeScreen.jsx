import React, { useState, useMemo, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { createRoom, joinRoom, spectateRoom } from '../api/roomApi'
import styles from './HomeScreen.module.css'

const HOW_TO_PLAY_STEPS = [
  { emoji: '\uD83C\uDFAD', title: 'Secret Roles', desc: 'Everyone gets a unique AI-generated role \u2014 Cooperator or Antagonist. Only you see yours.' },
  { emoji: '\u26A1',       title: 'Use Your Ability', desc: 'Each role has a special one-time ability. Spy on someone, plant evidence, swap votes \u2014 use it wisely.' },
  { emoji: '\uD83D\uDCAC', title: 'Discuss & Deceive', desc: 'Chat with everyone. Accuse suspects. Demand confessions. Watch the Trust Meter shift in real-time.' },
  { emoji: '\uD83D\uDDF3\uFE0F', title: 'Vote & Win', desc: 'Nominate and vote out players. Cooperators win by removing all Antagonists. Antagonists win by surviving.' }
]

export default function HomeScreen({ onRoomReady, onEnterLobby }) {
  const handleRoomReady = onRoomReady || onEnterLobby

  const [mode, setMode]           = useState(null)   // 'create' | 'join'
  const [joinType, setJoinType]   = useState('play')  // 'play' | 'watch'
  const [name, setName]           = useState('')
  const [roomCode, setRoomCode]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [showHowTo, setShowHowTo] = useState(false)
  const [howToStep, setHowToStep] = useState(0)

  useEffect(() => {
    const ssJoin   = sessionStorage.getItem('verdict_autojoin')
    const ssAction = sessionStorage.getItem('verdict_autoaction')

    if (ssJoin) {
      setRoomCode(ssJoin.toUpperCase())
      setMode('join')
      sessionStorage.removeItem('verdict_autojoin')
      return
    }
    if (ssAction === 'create') { setMode('create'); sessionStorage.removeItem('verdict_autoaction'); return }
    if (ssAction === 'join')   { setMode('join');   sessionStorage.removeItem('verdict_autoaction'); return }

    const params = new URLSearchParams(window.location.search)
    const code = params.get('join')
    if (code) { setRoomCode(code.toUpperCase()); setMode('join') }
  }, [])

  const playerId = useMemo(() => {
    let id = localStorage.getItem('verdict_player_id')
    if (!id) { id = uuidv4(); localStorage.setItem('verdict_player_id', id) }
    return id
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return setError('Enter your name')
    setLoading(true); setError('')
    try {
      const res = await createRoom(playerId, name.trim())
      handleRoomReady(res.data, { playerId, playerName: name.trim(), isHost: true, isSpectator: false })
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create room')
    } finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (!name.trim()) return setError('Enter your name')
    if (!roomCode.trim()) return setError('Enter a room code')
    setLoading(true); setError('')
    try {
      if (joinType === 'watch') {
        const res = await spectateRoom(roomCode.toUpperCase().trim(), playerId, name.trim())
        handleRoomReady(res.data, { playerId, playerName: name.trim(), isHost: false, isSpectator: true })
      } else {
        const res = await joinRoom(roomCode.toUpperCase().trim(), playerId, name.trim())
        handleRoomReady(res.data, { playerId, playerName: name.trim(), isHost: false, isSpectator: false })
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Room not found or full')
    } finally { setLoading(false) }
  }

  return (
    <div className={styles.container}>
      {showHowTo && (
        <div className={styles.modalOverlay} onClick={() => setShowHowTo(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalStep}>
              <div className={styles.stepEmoji}>{HOW_TO_PLAY_STEPS[howToStep].emoji}</div>
              <div className={styles.stepTitle}>{HOW_TO_PLAY_STEPS[howToStep].title}</div>
              <div className={styles.stepDesc}>{HOW_TO_PLAY_STEPS[howToStep].desc}</div>
            </div>
            <div className={styles.stepDots}>
              {HOW_TO_PLAY_STEPS.map((_, i) => (
                <span key={i} className={`${styles.dot} ${i === howToStep ? styles.dotActive : ''}`} onClick={() => setHowToStep(i)} />
              ))}
            </div>
            <div className={styles.modalActions}>
              {howToStep > 0 && <button className={styles.modalBack} onClick={() => setHowToStep(s => s - 1)}>← Back</button>}
              {howToStep < HOW_TO_PLAY_STEPS.length - 1
                ? <button className="verdict-btn verdict-btn-primary" onClick={() => setHowToStep(s => s + 1)}>Next \u2192</button>
                : <button className="verdict-btn verdict-btn-primary" onClick={() => setShowHowTo(false)}>Let's Play \uD83D\uDD25</button>
              }
            </div>
          </div>
        </div>
      )}

      <div className={styles.hero}>
        <div className={styles.badge}>AI-POWERED</div>
        <h1 className={styles.title}>VERDICT</h1>
        <p className={styles.subtitle}>Social deduction. AI Game Master. No two games alike.</p>
        <button className={styles.howToBtn} onClick={() => { setShowHowTo(true); setHowToStep(0) }}>
          \u2753 How to Play
        </button>
      </div>

      <div className={styles.card}>
        {!mode ? (
          <div className={styles.actions}>
            <button className="verdict-btn verdict-btn-primary" onClick={() => setMode('create')}>
              \uD83C\uDFAE Create Room
            </button>
            <button className="verdict-btn verdict-btn-secondary" onClick={() => setMode('join')}>
              \uD83D\uDD17 Join Room
            </button>
          </div>
        ) : (
          <div className={styles.form}>
            <button className={styles.back} onClick={() => { setMode(null); setError(''); setJoinType('play') }}>← Back</button>
            <h2>{mode === 'create' ? 'Create a Room' : 'Join a Room'}</h2>

            {/* Play / Watch toggle — only in join mode */}
            {mode === 'join' && (
              <div className={styles.joinTypeRow}>
                <button
                  className={`${styles.joinTypeBtn} ${joinType === 'play' ? styles.joinTypeActive : ''}`}
                  onClick={() => setJoinType('play')}
                >
                  \uD83C\uDFAE Play
                </button>
                <button
                  className={`${styles.joinTypeBtn} ${joinType === 'watch' ? styles.joinTypeActive : ''}`}
                  onClick={() => setJoinType('watch')}
                >
                  \uD83D\uDC41 Watch
                </button>
              </div>
            )}

            <input
              className="verdict-input"
              placeholder="Your display name"
              value={name}
              maxLength={20}
              autoFocus
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
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            )}

            {error && <p className={styles.error}>{error}</p>}

            <button
              className="verdict-btn verdict-btn-primary"
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading
                ? 'Loading...'
                : mode === 'create'
                  ? 'Create Room'
                  : joinType === 'watch' ? '\uD83D\uDC41 Watch Game' : 'Join Room'
              }
            </button>

            {mode === 'join' && joinType === 'watch' && (
              <p className={styles.watchNote}>
                You'll observe the game live without playing a role.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
