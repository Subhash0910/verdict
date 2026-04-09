import React, { useState } from 'react'
import styles from './ConfessionPrompt.module.css'
import { SFX, screenShake, flashScreen } from '../hooks/useSound'

export default function ConfessionPrompt({ from, question, onAnswer }) {
  const [answered, setAnswered] = useState(false)

  function answer(val) {
    if (answered) return
    setAnswered(true)
    SFX.gavel()
    flashScreen('rgba(255,255,255,0.5)', 150)
    screenShake(10, 400)
    onAnswer(val)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.icon}>🔨</div>
        <div className={styles.from}>{from} demands your confession</div>
        <div className={styles.question}>"{question}"</div>
        <div className={styles.rule}>Answer YES or NO. Everyone is watching. No skipping.</div>
        {!answered ? (
          <div className={styles.buttons}>
            <button className={`${styles.btn} ${styles.yes}`} onClick={() => answer('YES')}>
              ✅ YES
            </button>
            <button className={`${styles.btn} ${styles.no}`} onClick={() => answer('NO')}>
              ❌ NO
            </button>
          </div>
        ) : (
          <div className={styles.submitted}>Answer submitted.</div>
        )}
      </div>
    </div>
  )
}
