import React, { useEffect } from 'react'
import styles from './GameStartingOverlay.module.css'

/**
 * Full-screen cinematic overlay shown when AI GM generates the game.
 * Displays theme title + synopsis, then fades out.
 */
export default function GameStartingOverlay({ theme, synopsis, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 6000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.gmLabel}>🤖 AI GAME MASTER</div>
        <h1 className={styles.theme}>{theme}</h1>
        <p className={styles.synopsis}>{synopsis}</p>
        <div className={styles.loading}>
          <span /><span /><span />
        </div>
        <p className={styles.hint}>Assigning roles...</p>
      </div>
    </div>
  )
}
