import React, { useState, useRef, useEffect } from 'react'
import styles from './DiscussionPhase.module.css'

const ALIGNMENT_COLOR = { evil: '#e63946', good: '#00b4d8' }

export default function DiscussionPhase({
  theme, myRole, players, messages, timer, isEliminated, onSendChat, onAccuse
}) {
  const [input, setInput] = useState('')
  const [accused, setAccused] = useState(null)
  const chatRef = useRef(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const mins = String(Math.floor(timer / 60)).padStart(2, '0')
  const secs = String(timer % 60).padStart(2, '0')
  const isUrgent = timer > 0 && timer <= 30
  const roleName = myRole?.roleName || myRole?.role || '???'
  const accentColor = ALIGNMENT_COLOR[myRole?.alignment] || '#7b2d8b'

  function send() {
    const t = input.trim()
    if (!t) return
    onSendChat(t)
    setInput('')
  }

  function handleAccuse(playerName) {
    setAccused(playerName)
    onSendChat?.(`🔴 I accuse ${playerName} — they're not who they say they are.`)
  }

  return (
    <div className={styles.container}>

      {/* ── Top bar ── */}
      <div className={styles.header}>
        <div className={styles.themeTitle}>{theme || 'VERDICT'}</div>
        <div className={`${styles.timer} ${isUrgent ? styles.urgent : ''}`}>
          {timer > 0 ? `${mins}:${secs}` : '🗳 VOTE NOW'}
        </div>
      </div>

      {/* ── Body: players left | chat right ── */}
      <div className={styles.body}>

        {/* Left — players + accuse */}
        <div className={styles.sidebar}>
          <div className={styles.sideLabel}>PLAYERS</div>
          {players.length === 0 && (
            <div className={styles.noPlayers}>Waiting for player list...</div>
          )}
          {players.map(p => {
            const isMe = p.playerName === (myRole?.playerName)
            const dead = p.isAlive === false
            return (
              <div key={p.playerId}
                className={`${styles.playerCard} ${dead ? styles.dead : ''} ${accused === p.playerName ? styles.accused : ''}`}
              >
                <div className={styles.playerAvatar}>
                  {dead ? '👻' : p.playerName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>
                    {p.playerName}
                    {isMe && <span className={styles.youBadge}> you</span>}
                  </div>
                  <div className={styles.playerStatus}>{dead ? 'eliminated' : 'alive'}</div>
                </div>
                {!isMe && !dead && !isEliminated && (
                  <button
                    className={`${styles.accuseBtn} ${accused === p.playerName ? styles.accuseActive : ''}`}
                    onClick={() => handleAccuse(p.playerName)}
                    title="Accuse this player"
                  >
                    {accused === p.playerName ? '🔴' : '⚠️'}
                  </button>
                )}
              </div>
            )
          })}

          {/* My role card in sidebar */}
          {myRole && (
            <div className={styles.myRoleCard} style={{ '--role-color': accentColor }}>
              <div className={styles.myRoleLabel}>YOUR ROLE</div>
              <div className={styles.myRoleName}>{roleName}</div>
              <div className={styles.myRoleAlignment}>
                {myRole.alignment === 'evil' ? '☠️ Antagonist' : '✦ Cooperator'}
              </div>
              <div className={styles.myRoleMission}>{myRole.winCondition || myRole.secretMission}</div>
            </div>
          )}
        </div>

        {/* Right — chat */}
        <div className={styles.chatPanel}>
          <div className={styles.chatMessages} ref={chatRef}>
            {messages.length === 0 && (
              <div className={styles.emptyChat}>
                Discussion begins...<br />
                <span style={{fontSize:'12px',color:'#333'}}>Debate, accuse, defend. Timer runs out → vote.</span>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`${styles.message} ${m.isSpirit ? styles.spiritMsg : ''}`}>
                <span className={styles.msgName} style={m.isSpirit ? {color:'#555',fontStyle:'italic'} : {}}>
                  {m.playerName}
                </span>
                <span className={styles.msgText}>{m.text}</span>
              </div>
            ))}
          </div>

          <div className={styles.inputRow}>
            {isEliminated && (
              <div className={styles.spiritBanner}>
                👻 You are a Spirit — your message will be anonymous
              </div>
            )}
            <div className={styles.inputArea}>
              <input
                className={styles.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={isEliminated ? 'Send anonymous message...' : 'Say something...'}
                maxLength={200}
              />
              <button className={styles.sendBtn} onClick={send}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
