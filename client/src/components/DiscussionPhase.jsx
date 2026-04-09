import React, { useState, useRef, useEffect } from 'react'
import styles from './DiscussionPhase.module.css'
import TrustMeter from './TrustMeter'
import EvidenceBoard from './EvidenceBoard'
import { ConfessionDemand, ConfessionPrompt } from './ConfessionBooth'
import { SFX, screenShake, flashScreen } from '../hooks/useSound'

const ALIGNMENT_COLOR = { evil: 'var(--theme-accent-evil, #e63946)', good: 'var(--theme-accent-good, #00b4d8)' }
const QUICK_REACTIONS = ['👀', '🔥', '💀', '🤔', '✅']

export default function DiscussionPhase({
  theme, myRole, players, messages, timer,
  isEliminated, onSendChat, onAccuse, onDemandConfession,
  confessionRequest, onAnswerConfession, trustScores, evidenceEvents
}) {
  const [input, setInput] = useState('')
  const [showConfessionBooth, setShowConfessionBooth] = useState(false)
  const [usedConfession, setUsedConfession] = useState(false)
  const [reactions, setReactions] = useState({}) // { msgIndex: { emoji: count } }
  const [hoveredMsg, setHoveredMsg] = useState(null)
  const chatRef = useRef(null)
  const prevTimer = useRef(timer)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    SFX.tick()
  }, [messages])

  useEffect(() => {
    if (timer <= 10 && timer > 0 && timer !== prevTimer.current) SFX.heartbeat()
    prevTimer.current = timer
  }, [timer])

  const mins = String(Math.floor(timer / 60)).padStart(2, '0')
  const secs = String(timer % 60).padStart(2, '0')
  const isUrgent = timer > 0 && timer <= 30
  const roleName = myRole?.roleName || '???'
  const accentColor = ALIGNMENT_COLOR[myRole?.alignment] || 'var(--theme-accent-primary, #7b2d8b)'

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

  function addReaction(msgIndex, emoji) {
    setReactions(prev => {
      const msgReactions = prev[msgIndex] || {}
      return {
        ...prev,
        [msgIndex]: {
          ...msgReactions,
          [emoji]: (msgReactions[emoji] || 0) + 1
        }
      }
    })
    setHoveredMsg(null)
  }

  return (
    <div className={styles.container}>

      {showConfessionBooth && !usedConfession && (
        <ConfessionDemand
          players={players}
          myPlayerName={myRole?.playerName}
          used={usedConfession}
          onDemand={handleConfessionDemand}
        />
      )}

      {confessionRequest && (
        <ConfessionPrompt
          confession={{ targetName: myRole?.playerName, askerName: confessionRequest.from, question: confessionRequest.question }}
          myPlayerName={myRole?.playerName}
          onAnswer={(ans) => onAnswerConfession(ans)}
        />
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.themeTitle}>{theme || 'VERDICT'}</div>
        <div className={`${styles.timer} ${isUrgent ? styles.urgent : ''}`}>
          {timer > 0 ? `${mins}:${secs}` : '🗳 VOTE NOW'}
        </div>
      </div>

      <TrustMeter
        players={players.filter(p => p.isAlive !== false)}
        trustScores={trustScores || {}}
        myPlayerName={myRole?.playerName}
      />

      <div className={styles.body}>
        {/* Evidence board — left / hidden on mobile */}
        <div className={styles.evidenceCol}>
          <EvidenceBoard events={evidenceEvents || []} />
        </div>

        {/* Chat */}
        <div className={styles.chatPanel}>
          <div className={styles.chatMessages} ref={chatRef}>
            {messages.length === 0 && (
              <div className={styles.emptyChat}>
                The room is silent...<br />
                <span style={{fontSize:'12px',color:'#2a2a3a'}}>Someone make a move.</span>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`
                  ${styles.message}
                  ${m.isSpirit ? styles.spiritMsg : ''}
                  ${m.isSystem ? styles.systemMsg : ''}
                  ${m.isObserver ? styles.observerMsg : ''}
                  ${m.isConfession ? styles.confessionMsg : ''}
                `}
                onMouseEnter={() => setHoveredMsg(i)}
                onMouseLeave={() => setHoveredMsg(null)}
              >
                <span className={styles.msgName}>{m.playerName}</span>
                <span className={styles.msgText}>{m.text}</span>

                {/* Reaction bar — shows on hover */}
                {hoveredMsg === i && !m.isSystem && (
                  <div className={styles.reactionBar}>
                    {QUICK_REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        className={styles.reactionBtn}
                        onClick={() => addReaction(i, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Show accumulated reactions */}
                {reactions[i] && Object.keys(reactions[i]).length > 0 && (
                  <div className={styles.reactionChips}>
                    {Object.entries(reactions[i]).map(([emoji, count]) => (
                      <span
                        key={emoji}
                        className={styles.reactionChip}
                        onClick={() => addReaction(i, emoji)}
                      >
                        {emoji} {count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.inputRow}>
            {isEliminated && (
              <div className={styles.spiritBanner}>👻 You are a Spirit — message anonymous</div>
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

        {/* Players + role — right */}
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
                  >⚠️</button>
                )}
              </div>
            )
          })}

          {!isEliminated && (
            <button
              className={`${styles.confessionBtn} ${usedConfession ? styles.used : ''}`}
              onClick={() => !usedConfession && setShowConfessionBooth(v => !v)}
              disabled={usedConfession}
            >
              {usedConfession ? '🎤 Confession Used' : '🎤 Demand Confession'}
            </button>
          )}

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
