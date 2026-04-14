import React, { useEffect, useRef, useState } from 'react'
import styles from './EliminationScreen.module.css'
import { useSound } from '../hooks/useSound'

export default function EliminationScreen({ elimination, onContinue }) {
  const [step, setStep] = useState(0)
  const sound = useSound()
  const timerRef = useRef(null)

  useEffect(() => {
    sound.playBoom()
    timerRef.current = setTimeout(() => {
      setStep(1)
      setTimeout(() => {
        sound.playSlam()
        setStep(2)
        setTimeout(() => {
          sound.playDing()
          setStep(3)
          setTimeout(() => setStep(4), 2200)
        }, 900)
      }, 1000)
    }, 900)

    return () => clearTimeout(timerRef.current)
  }, [sound])

  const survivedTrial = Boolean(elimination?.survivedTrial)
  const isEvil = elimination?.alignment === 'evil'
  const accentColor = survivedTrial
    ? 'var(--theme-accent-good)'
    : isEvil
      ? 'var(--theme-accent-evil)'
      : 'var(--theme-accent-good)'

  const focusName = elimination?.eliminatedId || elimination?.accusedPlayer || 'Unknown'
  const initial = focusName?.[0]?.toUpperCase() ?? '?'

  return (
    <div className={styles.overlay}>
      {step === 0 && <div className={styles.blackScreen} />}

      {step >= 1 && (
        <div className={styles.spotlight}>
          <div className={styles.avatarRing} style={{ '--color': accentColor }}>
            <div className={styles.avatar}>{initial}</div>
          </div>
          <div className={styles.playerName}>{focusName}</div>
        </div>
      )}

      {step >= 2 && (
        <div className={styles.roleCard} style={{ '--color': accentColor }}>
          {survivedTrial ? (
            <>
              <div className={styles.wasLabel}>TRIBUNAL RESULT</div>
              <div className={styles.roleName}>SPARED</div>
              <div className={styles.alignment}>
                {elimination?.spareVotes} spare / {elimination?.condemnVotes} condemn
              </div>
            </>
          ) : (
            <>
              <div className={styles.wasLabel}>WAS THE</div>
              <div className={styles.roleName}>{elimination?.eliminatedRole?.toUpperCase()}</div>
              <div className={styles.alignment}>
                {isEvil ? 'ANTAGONIST EXPOSED' : 'COOPERATOR LOST'}
              </div>
            </>
          )}
        </div>
      )}

      {step >= 3 && (
        <div className={styles.particles}>
          {[...Array(20)].map((_, index) => (
            <div
              key={index}
              className={styles.particle}
              style={{
                '--angle': `${(index / 20) * 360}deg`,
                '--color': accentColor,
                '--delay': `${index * 30}ms`,
              }}
            />
          ))}
        </div>
      )}

      {step >= 4 && (
        <div className={styles.continueArea}>
          {elimination?.gameOver ? (
            <div className={styles.gameOverTag}>Case Closed</div>
          ) : (
            <div className={styles.nextRound}>
              {survivedTrial ? 'The room carries the risk into the next round.' : 'The next round begins.'}
            </div>
          )}
          <button className={styles.continueBtn} onClick={onContinue}>
            {elimination?.gameOver ? 'See Case File ->' : 'Next Round ->'}
          </button>
        </div>
      )}
    </div>
  )
}
