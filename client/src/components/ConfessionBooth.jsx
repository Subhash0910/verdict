import React, { useState, useEffect } from 'react'
import styles from './ConfessionBooth.module.css'
import { useSound } from '../hooks/useSound'

// Shown to the DEMANDER — pick a target + type a yes/no question
export function ConfessionDemand({ players, myPlayerName, onDemand, used }) {
  const [target, setTarget] = useState(null)
  const [question, setQuestion] = useState('')
  const [sent, setSent] = useState(false)
  const sound = useSound()
  const others = players.filter(p => p.playerName !== myPlayerName && p.isAlive !== false)

  function submit() {
    if (!target || !question.trim() || sent || used) return
    sound.play('gavel')
    setSent(true)
    onDemand(target, question.trim())
  }

  if (used || sent) return (
    <div className={styles.usedBadge}>🏛️ Confession used this round</div>
  )

  return (
    <div className={styles.demandWrap}>
      <div className={styles.demandTitle}>🏛️ DEMAND CONFESSION</div>
      <div className={styles.targetRow}>
        {others.map(p => (
          <button
            key={p.playerName}
            className={`${styles.targetChip} ${target === p.playerName ? styles.chipSelected : ''}`}
            onClick={() => setTarget(p.playerName)}
          >
            {p.playerName}
          </button>
        ))}
      </div>
      <div className={styles.questionRow}>
        <input
          className={styles.questionInput}
          placeholder="Ask a YES or NO question..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          maxLength={80}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <button
          className={styles.demandBtn}
          disabled={!target || !question.trim()}
          onClick={submit}
        >
          Demand
        </button>
      </div>
    </div>
  )
}

// Full-screen overlay shown to the player being FORCED to confess
export function ConfessionPrompt({ confession, myPlayerName, onAnswer }) {
  const [answered, setAnswered] = useState(false)
  const sound = useSound()

  useEffect(() => {
    if (confession?.targetName === myPlayerName) {
      sound.play('gavel')
      // Vibrate if mobile
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
    }
  }, [confession])

  if (!confession || confession.targetName !== myPlayerName || answered) return null

  function answer(val) {
    sound.play('slam')
    setAnswered(true)
    onAnswer(val)
  }

  return (
    <div className={styles.promptOverlay}>
      <div className={styles.promptCard}>
        <div className={styles.promptHeader}>🏛️ YOU HAVE BEEN CALLED TO CONFESS</div>
        <div className={styles.promptAsker}>{confession.askerName} demands to know:</div>
        <div className={styles.promptQuestion}>“{confession.question}”</div>
        <div className={styles.promptSubtext}>Everyone is watching. Answer honestly.</div>
        <div className={styles.answerBtns}>
          <button className={`${styles.answerBtn} ${styles.yes}`} onClick={() => answer('YES')}>
            ✅ YES
          </button>
          <button className={`${styles.answerBtn} ${styles.no}`} onClick={() => answer('NO')}>
            ❌ NO
          </button>
        </div>
      </div>
    </div>
  )
}
