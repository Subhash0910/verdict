import React, { useState, useRef, useEffect } from 'react'
import styles from './DiscussionPhase.module.css'
import TrustMeter from './TrustMeter'
import EvidenceBoard from './EvidenceBoard'
import { ConfessionDemand, ConfessionPrompt } from './ConfessionBooth'
import { SFX, screenShake, flashScreen } from '../hooks/useSound'

const ALIGNMENT_COLOR = { evil: '#e63946', good: '#00b4d8' }

export default function DiscussionPhase({
  theme, myRole, players, messages, timer,
  isEliminated, onSendChat, onAccuse, onDemandConfession,
  confessionRequest, onAnswerConfession, trustScores, evidenceEvents
}) {
  const [input, setInput] = useState('')
  const [showConfessionBooth, setShowConfessionBooth] = useState(false)
  const [usedConfession, setUsedConfession] = useState(false)
  const chatRef = useRef(null)
  const prevTimer = useRef(timer)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    SFX.tick()
  }, [messages])

  useEffect(() => {
    if (timer <= 10 && timer > 0 && timer !== prevTimer.current) {
      SFX.heartbeat()
    }
    prevTimer.current = timer
  }, [timer])

  const mins = String(Math.floor(timer / 60)).padStart(2, '0')
  const secs = String(timer % 60).padStart(2, '0')
  const isUrgent = timer > 0 && timer <= 30
  const roleName = myRole?.roleName || '???'
  const accentColor = ALIGNMENT_COLOR[myRole?.alignment] || '#7b2d8b'

  function send() {
    const t = input.trim()
    if (!t) return
    onSendChat(t)
    setInput('')
  }

  function handleAccuse(playerName) {
    SFX.accusation()
    flashScreen('rgba(230,57,70,0.4)', 200)
    screenShake(10, 400)
    onAccuse(playerName)
  }

  function handleConfessionDemand(target, question) {
    setUsedConfession(true)
    setShowConfessionBooth(false)
    onDemandConfession(target, question)
  }

  return (
    <div className={styles.container}>

      {/* Confession demand panel */}
      {showConfessionBooth && !usedConfession && (
        <ConfessionDemand
          players={players}
          myPlayerName={myRole?.playerName}
          used={usedConfession}
          onDemand={handleConfessionDemand}
        />
      )}

      {/* Forced confession — answered here, result sent via onAnswerConfession */}
      {confessionRequest && (
        <ConfessionPrompt
          confession={{ targetName: myRole?.playerName, askerName: confessionRequest.from, question: confessionRequest.question }}
          myPlayerName={myRole?.playerName}
          onAnswer={(ans) => {
            onAnswerConfession(ans)
          }}
        />
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.themeTitle}>{theme || 'VERDICT'}</div>
        <div className={`${styles.timer} ${isUrgent ? styles.urgent : ''}`}>
          {timer > 0 ? `${mins}:${secs}` : '🗳 VOTE NOW'}
        </div>
      </div>

      {/* Trust meters */}
      <TrustMeter
        players={players.filter(p => p.isAlive !== false)}
        trustScores={trustScores || {}}
        myPlayerName={myRole?.playerName}
      />

      {/* 3-column body (desktop) / stacked (mobile) */}
      <div className={styles.body}>

        {/* Evidence board — left / hidden on mobile */}
        <div className={styles.evidenceCol}>
          <EvidenceBoard events={evidenceEvents || []} />
        </div>

        {/* Chat — center */}
        <div className={styles.chatPanel}>
          <div className={styles.chatMessages} ref={chatRef}>
            {messages.length === 0 && (
              <div className={styles.emptyChat}>
                The room is silent...<br />
                <span style={{fontSize:'12px',color:'#2a2a3a'}}>Someone make a move.</span>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`
                ${styles.message}
                ${m.isSpirit ? styles.spiritMsg : ''}
                ${m.isSystem ? styles.systemMsg : ''}
                ${m.isObserver ? styles.observerMsg : ''}
                ${m.isConfession ? styles.confessionMsg : ''}
              `}>
                <span className={styles.msgName}>{m.playerName}</span>
                <span className={styles.msgText}>{m.text}</span>
              </div>
            ))}
          </div>

          <div className={styles.inputRow}>
            {isEliminated && (
              <div className={styles.spiritBanner}>
                👻 You are a Spirit — message anonymous
              </div>
            )}
            <div className={styles.inputArea}>
              <input
                className={styles.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={isEliminated ? 'Whisper from beyond...' : 'Speak your truth...'}
                maxLength={200}
              />
              <button className={styles.sendBtn} onClick={send}>Send</button>
            </div>
          </div>
        </div>

        {/* Players + role — right / bottom on mobile */}
        <div className={styles.sidePanel}>
          <div className={styles.sideLabel}>PLAYERS</div>
          {players.filter(p => p.isAlive !== false).map(p => {
            const isMe = p.playerName === myRole?.playerName
            return (
              <div key={p.playerName} className={styles.playerRow}>
                <div className={styles.playerAvatar}>{p.playerName[0]?.toUpperCase()}</div>
                <div className={styles.playerName}>
                  {p.playerName}
                  {isMe && <span className={styles.youBadge}> you</span>}
                </div>
                {!isMe && !isEliminated && (
                  <button
                    className={styles.accuseBtn}
                    onClick={() => handleAccuse(p.playerName)}
                    title="Formally accuse — triggers vote"
                  >
                    ⚠️
                  </button>
                )}
              </div>
            )
          })}

          {/* Confession booth button */}
          {!isEliminated && (
            <button
              className={`${styles.confessionBtn} ${usedConfession ? styles.used : ''}`}
              onClick={() => !usedConfession && setShowConfessionBooth(v => !v)}
              disabled={usedConfession}
            >
              {usedConfession ? '🎤 Confession Used' : '🎤 Demand Confession'}
            </button>
          )}

          {/* My role card */}
          {myRole && (
            <div className={styles.myRoleCard} style={{ '--role-color': accentColor }}>
              <div className={styles.myRoleLabel}>YOUR ROLE</div>
              <div className={styles.myRoleName}>{roleName}</div>
              <div className={styles.myRoleAlignment}>
                {myRole.alignment === 'evil' ? '☠️ Antagonist' : '✦ Cooperator'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
