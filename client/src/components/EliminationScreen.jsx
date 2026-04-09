import React, { useEffect, useRef, useState } from 'react'
import styles from './EliminationScreen.module.css'
import { useSound } from '../hooks/useSound'

export default function EliminationScreen({ elimination, onContinue }) {
  const [step, setStep] = useState(0)
  // 0=black, 1=spotlight, 2=role slam, 3=ai line, 4=continue
  const sound = useSound()
  const timerRef = useRef(null)

  useEffect(() => {
    sound.playBoom()
    // step 0: 2s black silence
    timerRef.current = setTimeout(() => {
      setStep(1) // spotlight
      setTimeout(() => {
        sound.playSlam()
        setStep(2) // role card slams up
        setTimeout(() => {
          sound.playDing()
          setStep(3) // AI line
          setTimeout(() => setStep(4), 2500)
        }, 1200)
      }, 1500)
    }, 2000)
    return () => clearTimeout(timerRef.current)
  }, [])

  const isEvil = elimination?.alignment === 'evil'
  const accentColor = isEvil ? '#e63946' : '#00b4d8'
  const initial = elimination?.eliminatedId?.[0]?.toUpperCase() ?? '?'

  return (
    <div className={styles.overlay}>
      {/* Step 0: pure black */}
      {step === 0 && <div className={styles.blackScreen} />}

      {/* Step 1+: spotlight */}
      {step >= 1 && (
        <div className={styles.spotlight}>
          <div className={styles.avatarRing} style={{ '--color': accentColor }}>
            <div className={styles.avatar}>{initial}</div>
          </div>
          <div className={styles.playerName}>{elimination?.eliminatedId}</div>
        </div>
      )}

      {/* Step 2+: role card slams up */}
      {step >= 2 && (
        <div className={styles.roleCard} style={{ '--color': accentColor }}>
          <div className={styles.wasLabel}>WAS THE</div>
          <div className={styles.roleName}>{elimination?.eliminatedRole?.toUpperCase()}</div>
          <div className={styles.alignment}>
            {isEvil ? '☠️ ANTAGONIST' : '✦ COOPERATOR'}
          </div>
        </div>
      )}

      {/* Step 3+: particle burst effect + AI line */}
      {step >= 3 && (
        <div className={styles.particles}>
          {[...Array(20)].map((_, i) => (
            <div key={i} className={styles.particle}
              style={{
                '--angle': `${(i / 20) * 360}deg`,
                '--color': accentColor,
                '--delay': `${i * 30}ms`
              }}
            />
          ))}
        </div>
      )}

      {/* Step 4: continue */}
      {step >= 4 && (
        <div className={styles.continueArea}>
          {elimination?.gameOver ? (
            <div className={styles.gameOverTag}>GAME OVER</div>
          ) : (
            <div className={styles.nextRound}>Round continues...</div>
          )}
          <button className={styles.continueBtn} onClick={onContinue}>
            {elimination?.gameOver ? 'See Case File →' : 'Next Round →'}
          </button>
        </div>
      )}
    </div>
  )
}
