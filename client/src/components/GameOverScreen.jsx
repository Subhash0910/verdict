import React, { useState, useEffect } from 'react'
import styles from './GameOverScreen.module.css'

function useTypewriter(text, delay = 40) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!text) return
    setDisplayed('')
    setDone(false)
    let i = 0
    const t = setInterval(() => {
      setDisplayed(text.slice(0, ++i))
      if (i >= text.length) { clearInterval(t); setDone(true) }
    }, delay)
    return () => clearInterval(t)
  }, [text])
  return { displayed, done }
}

export default function GameOverScreen({ result, myRole, caseFile, onPlayAgain }) {
  const iWon = (result?.winner === 'good' && myRole?.alignment === 'good')
            || (result?.winner === 'evil' && myRole?.alignment === 'evil')
  const { displayed: caseText, done: caseDone } = useTypewriter(caseFile || '', 38)

  return (
    <div className={styles.container}>
      <div className={styles.verdict}>
        {iWon ? '🏆 VICTORY' : '💀 DEFEATED'}
      </div>

      <div className={`${styles.winner} ${result?.winner === 'evil' ? styles.evil : styles.good}`}>
        {result?.winner === 'evil' ? 'The Antagonists win' : 'The Cooperators prevail'}
      </div>

      <div className={styles.myRole}>
        You were: <strong>{myRole?.roleName || myRole?.role}</strong>
      </div>

      {caseFile && (
        <div className={styles.caseFile}>
          <div className={styles.caseLabel}>📋 CASE FILE</div>
          <p className={styles.caseText}>
            {caseText}
            {!caseDone && <span className={styles.cursor}>|</span>}
          </p>
        </div>
      )}

      {caseDone && (
        <button className={styles.playAgainBtn} onClick={onPlayAgain}>
          Play Again
        </button>
      )}
    </div>
  )
}
