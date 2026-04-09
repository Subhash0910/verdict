import React, { useState } from 'react'
import styles from './ConfessionBooth.module.css'
import { SFX, screenShake, flashScreen } from '../hooks/useSound'

export default function ConfessionBooth({ players, myPlayerName, usedConfession, onDemand, onClose }) {
  const [target, setTarget] = useState(null)
  const [question, setQuestion] = useState('')
  const [step, setStep] = useState('pick') // pick | question

  const others = players.filter(p => p.playerName !== myPlayerName && p.isAlive !== false)

  function handleDemand() {
    if (!target || !question.trim()) return
    SFX.gavel()
    flashScreen('rgba(230,57,70,0.3)', 200)
    screenShake(6, 300)
    onDemand(target, question.trim())
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>🎤 CONFESSION BOOTH</div>
          <div className={styles.subtitle}>Force someone to answer publicly. One use per game.</div>
        </div>

        {step === 'pick' && (
          <>
            <div className={styles.sectionLabel}>Who do you want to put on the stand?</div>
            <div className={styles.playerGrid}>
              {others.map(p => (
                <button
                  key={p.playerName}
                  className={`${styles.playerBtn} ${target === p.playerName ? styles.selected : ''}`}
                  onClick={() => { setTarget(p.playerName); setStep('question') }}
                >
                  <span className={styles.avatar}>{p.playerName[0].toUpperCase()}</span>
                  <span>{p.playerName}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'question' && (
          <>
            <div className={styles.sectionLabel}>
              Ask <strong style={{color:'#e63946'}}>{target}</strong> a yes/no question:
            </div>
            <input
              className={styles.questionInput}
              placeholder="Are you working against us?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDemand()}
              autoFocus
              maxLength={80}
            />
            <div className={styles.hint}>They MUST answer YES or NO. Publicly. No skipping.</div>
            <div className={styles.actions}>
              <button className={styles.backBtn} onClick={() => setStep('pick')}>← Back</button>
              <button
                className={styles.demandBtn}
                disabled={!question.trim()}
                onClick={handleDemand}
              >
                🔨 Demand Confession
              </button>
            </div>
          </>
        )}

        <button className={styles.closeBtn} onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}
