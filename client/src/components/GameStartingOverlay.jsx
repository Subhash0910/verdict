import React, { useEffect } from 'react'
import styles from './GameStartingOverlay.module.css'

export default function GameStartingOverlay({ theme, synopsis, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 6000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.gmLabel}>AI DIRECTOR</div>
        <h1 className={styles.theme}>{theme}</h1>
        <p className={styles.synopsis}>{synopsis}</p>
        <div className={styles.loading}>
          <span /><span /><span />
        </div>
        <p className={styles.hint}>Building the case...</p>
      </div>
    </div>
  )
}
