import React, { useState, useEffect } from 'react'
import styles from './GameOverScreen.module.css'
import ShareCard from './ShareCard'
import { useSound } from '../hooks/useSound'

export default function GameOverScreen({ result, myRole, caseFile, theme, onPlayAgain }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const sound = useSound()

  useEffect(() => {
    if (!caseFile) return
    let i = 0
    const iv = setInterval(() => {
      if (i >= caseFile.length) { clearInterval(iv); setDone(true); return }
      sound.playTick()
      setDisplayed(caseFile.slice(0, ++i))
    }, 40)
    return () => clearInterval(iv)
  }, [caseFile])

  const isWinner = result?.winner === (myRole?.alignment || 'good')

  return (
    <div className={styles.container}>
      <div className={styles.result}>
        {isWinner
          ? <span className={styles.win}>🏆 YOUR SIDE WON</span>
          : <span className={styles.lose}>💥 YOU LOST</span>
        }
      </div>

      <div className={styles.caseFileBox}>
        <div className={styles.caseLabel}>CASE FILE</div>
        <div className={styles.caseText}>
          {displayed}<span className={styles.cursor}>|</span>
        </div>
      </div>

      {done && caseFile && (
        <ShareCard
          theme={theme || 'VERDICT'}
          caseFile={caseFile}
          myRoleName={myRole?.roleName || '???'}
          winner={result?.winner}
        />
      )}

      <button className={styles.playAgainBtn} onClick={onPlayAgain}>
        🔁 Play Again
      </button>
    </div>
  )
}
