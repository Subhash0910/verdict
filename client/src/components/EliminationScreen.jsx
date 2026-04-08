import React, { useEffect, useState } from 'react'
import styles from './EliminationScreen.module.css'

export default function EliminationScreen({ elimination, onContinue }) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const isTraitor = elimination.alignment === 'evil'

  return (
    <div className={styles.container}>
      <div className={styles.dramaticText}>THE VERDICT IS IN</div>
      <div className={styles.name}>{elimination.eliminatedId}</div>
      <div className={styles.subtext}>has been eliminated</div>

      {revealed && (
        <>
          <div className={`${styles.roleReveal} ${isTraitor ? styles.evil : styles.good}`}>
            {isTraitor ? '🗡️ TRAITOR' : '👤 INNOCENT'}
          </div>
          <div className={styles.roleName}>{elimination.eliminatedRole}</div>

          {!elimination.gameOver && (
            <button className={styles.continueBtn} onClick={onContinue}>
              Continue Game →
            </button>
          )}
        </>
      )}
    </div>
  )
}
