import React from 'react'
import styles from './GameOverScreen.module.css'

export default function GameOverScreen({ result, myRole, onPlayAgain }) {
  const iWon = (result?.winner === 'good' && myRole?.alignment === 'good')
            || (result?.winner === 'evil' && myRole?.alignment === 'evil')

  return (
    <div className={styles.container}>
      <div className={styles.verdict}>
        {iWon ? '🏆 VICTORY' : '💀 DEFEATED'}
      </div>
      <div className={`${styles.winner} ${result?.winner === 'evil' ? styles.evil : styles.good}`}>
        {result?.winner === 'evil' ? 'The Traitors win' : 'The Innocents prevail'}
      </div>
      <div className={styles.myRole}>
        You were: <strong>{myRole?.role}</strong>
      </div>
      <div className={styles.mission}>
        Your mission: <em>{myRole?.secretMission}</em>
      </div>
      <button className={styles.playAgainBtn} onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  )
}
