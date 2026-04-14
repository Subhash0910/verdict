import React, { useEffect, useRef, useState } from 'react'
import styles from './DiscussionPhase.module.css'
import TrustMeter from './TrustMeter'
import EvidenceBoard from './EvidenceBoard'
import { ConfessionDemand, ConfessionPrompt } from './ConfessionBooth'
import { SFX, flashScreen, screenShake } from '../hooks/useSound'

const ALIGNMENT_COLOR = { evil: 'var(--theme-accent-evil, #e63946)', good: 'var(--theme-accent-good, #00b4d8)' }
const QUICK_REACTIONS = ['👀', '🔥', '💀', '🤨', '✅']

export default function DiscussionPhase({
  theme,
  myRole,
  players,
  messages,
  timer,
  isEliminated,
  onSendChat,
  onAccuse,
  onDemandConfession,
  confessionRequest,
  onAnswerConfession,
  trustScores,
  evidenceEvents,
  currentOperation,
  roundInfo,
  readOnly = false,
}) {
  const [input, setInput] = useState('')
  const [showConfessionBooth, setShowConfessionBooth] = useState(false)
  const [usedConfession, setUsedConfession] = useState(false)
  const [reactions, setReactions] = useState({})
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
  const timerLabel = timer > 0 ? `${mins}:${secs}` : 'AUTO TRIBUNAL'
  const discussionPrompts = getDiscussionPrompts(currentOperation)

  function send() {
    const text = input.trim()
    if (!text || readOnly) return
    onSendChat(text)
    setInput('')
  }

  function handleAccuse(playerName) {
    if (readOnly) return
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
    setReactions((prev) => {
      const msgReactions = prev[msgIndex] || {}
      return {
        ...prev,
        [msgIndex]: {
          ...msgReactions,
          [emoji]: (msgReactions[emoji] || 0) + 1,
        },
      }
    })
    setHoveredMsg(null)
  }

  return (
    <div className={styles.container}>
      {showConfessionBooth && !usedConfession && !readOnly && (
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
          onAnswer={(answer) => onAnswerConfession(answer)}
        />
      )}

      <div className={styles.header}>
        <div className={styles.themeTitle}>{theme || 'VERDICT'}</div>
        <div className={`${styles.timer} ${isUrgent ? styles.urgent : ''}`}>{timerLabel}</div>
      </div>

      <TrustMeter
        players={players.filter((player) => player.isAlive !== false)}
        trustScores={trustScores || {}}
        myPlayerName={myRole?.playerName}
      />

      {currentOperation && (
        <div className={styles.operationStrip}>
          <div className={styles.operationMeta}>Round {roundInfo?.round || 1} / {roundInfo?.maxRounds || 3}</div>
          <div className={styles.operationTitle}>{currentOperation.title}</div>
          <div className={styles.operationPrompt}>{currentOperation.discussionPrompt}</div>
        </div>
      )}

      <div className={styles.pressurePanel}>
        <div className={styles.pressureCard}>
          <div className={styles.pressureLabel}>Tribunal Flow</div>
          <div className={styles.pressureValue}>Use <span>ACCUSE</span> on a player row to open tribunal right now.</div>
          <div className={styles.pressureHint}>If nobody does, the timer auto-calls the most suspicious player.</div>
        </div>
        <div className={styles.pressureCard}>
          <div className={styles.pressureLabel}>Room Pressure</div>
          <div className={styles.pressureValue}>
            {currentOperation?.primaryTarget ? `${currentOperation.primaryTarget} is under the main spotlight.` : 'Nobody owns the spotlight yet.'}
          </div>
          <div className={styles.pressureHint}>
            {currentOperation?.secondaryTarget ? `${currentOperation.secondaryTarget} is tied into this operation too.` : 'Push a read, demand a confession, or force a contradiction.'}
          </div>
        </div>
      </div>

      {!readOnly && !isEliminated && discussionPrompts.length > 0 && (
        <div className={styles.promptRail}>
          {discussionPrompts.map((prompt) => (
            <button
              key={prompt}
              className={styles.promptChip}
              onClick={() => setInput(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.evidenceCol}>
          <EvidenceBoard events={evidenceEvents || []} />
        </div>

        <div className={styles.chatPanel}>
          <div className={styles.chatMessages} ref={chatRef}>
            {messages.length === 0 && (
              <div className={styles.emptyChat}>
                The room is silent...
                <br />
                <span className={styles.emptyHint}>Someone needs to push the room before the room pushes back.</span>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`
                  ${styles.message}
                  ${message.isSpirit ? styles.spiritMsg : ''}
                  ${message.isSystem ? styles.systemMsg : ''}
                  ${message.isObserver ? styles.observerMsg : ''}
                  ${message.isConfession ? styles.confessionMsg : ''}
                `}
                onMouseEnter={() => setHoveredMsg(index)}
                onMouseLeave={() => setHoveredMsg(null)}
              >
                <span className={styles.msgName}>{message.playerName}</span>
                <span className={styles.msgText}>{message.text}</span>

                {hoveredMsg === index && !message.isSystem && (
                  <div className={styles.reactionBar}>
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        className={styles.reactionBtn}
                        onClick={() => addReaction(index, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {reactions[index] && Object.keys(reactions[index]).length > 0 && (
                  <div className={styles.reactionChips}>
                    {Object.entries(reactions[index]).map(([emoji, count]) => (
                      <span
                        key={emoji}
                        className={styles.reactionChip}
                        onClick={() => addReaction(index, emoji)}
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
              <div className={styles.spiritBanner}>Spirit mode active. Your messages land anonymously.</div>
            )}
            <div className={styles.inputArea}>
              <input
                className={styles.input}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && send()}
                placeholder={isEliminated ? 'Whisper from beyond...' : 'Speak your truth...'}
                maxLength={200}
                disabled={readOnly}
              />
              <button className={styles.sendBtn} onClick={send} disabled={readOnly}>Send</button>
            </div>
          </div>
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.sideLabel}>PLAYERS</div>
          {players.filter((player) => player.isAlive !== false).map((player) => {
            const isMe = player.playerName === myRole?.playerName
            return (
              <div key={player.playerName} className={styles.playerRow}>
                <div className={styles.playerAvatar}>{player.playerName[0]?.toUpperCase()}</div>
                <div className={styles.playerName}>
                  {player.playerName}
                  {isMe && <span className={styles.youBadge}> you</span>}
                </div>
                {!isMe && !isEliminated && !readOnly && (
                  <button
                    className={styles.accuseBtn}
                    onClick={() => handleAccuse(player.playerName)}
                    title="Formally accuse and open tribunal"
                  >
                    Accuse
                  </button>
                )}
              </div>
            )
          })}

          {!isEliminated && !readOnly && (
            <button
              className={`${styles.confessionBtn} ${usedConfession ? styles.used : ''}`}
              onClick={() => !usedConfession && setShowConfessionBooth((value) => !value)}
              disabled={usedConfession}
            >
              {usedConfession ? 'Confession Used' : 'Demand Confession'}
            </button>
          )}

          {myRole && (
            <div className={styles.myRoleCard} style={{ '--role-color': accentColor }}>
              <div className={styles.myRoleLabel}>YOUR ROLE</div>
              <div className={styles.myRoleName}>{roleName}</div>
              <div className={styles.myRoleAlignment}>
                {myRole.alignment === 'evil' ? 'Antagonist' : 'Cooperator'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getDiscussionPrompts(operation) {
  const prompts = [
    'Why should the room trust you right now?',
    'Who benefits most if tribunal starts now?',
    'State your read in one sentence.',
  ]

  if (!operation?.operationId) {
    return prompts
  }

  switch (operation.operationId) {
    case 'scan':
      return [`${operation.primaryTarget}, answer yes or no: did you act?`, ...prompts]
    case 'leak':
      return [`${operation.primaryTarget}, explain why the leak points at you.`, ...prompts]
    case 'lockdown':
      return [`${operation.primaryTarget} and ${operation.secondaryTarget}, post your statements now.`, ...prompts]
    case 'signal':
      return [`${operation.primaryTarget}, use your authority: who should face tribunal?`, ...prompts]
    case 'intercept':
      return [`${operation.primaryTarget} is blocked from accusing. Who steps up instead?`, ...prompts]
    default:
      return prompts
  }
}
