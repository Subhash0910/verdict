import React, { useState, useEffect } from 'react'
import styles from './RoleRevealCard.module.css'

const ALIGNMENT_COLORS = {
  evil: { bg: '#1a0005', accent: '#e63946', glow: '#e63946' },
  good: { bg: '#000d1a', accent: '#00b4d8', glow: '#00b4d8' },
}

function useTypewriter(text, delay = 30, startNow = false) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    if (!startNow || !text) return
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, ++i))
      if (i >= text.length) clearInterval(interval)
    }, delay)
    return () => clearInterval(interval)
  }, [text, startNow])
  return displayed
}

export default function RoleRevealCard({ roleName, alignment, winCondition, ability, restriction, onReady }) {
  const [step, setStep] = useState(0) // 0=front, 1=name, 2=win, 3=ability, 4=restriction, 5=done
  const [showParticles, setShowParticles] = useState(false)
  const colors = ALIGNMENT_COLORS[alignment] || ALIGNMENT_COLORS.good

  const twName        = useTypewriter(roleName,     28, step >= 1)
  const twWin         = useTypewriter(winCondition, 22, step >= 2)
  const twAbility     = useTypewriter(ability,      22, step >= 3)
  const twRestriction = useTypewriter(restriction,  22, step >= 4)

  useEffect(() => {
    if (step === 0) return
    const delays = [0, 800, 1200 + (roleName?.length || 0) * 28, 1200 + (winCondition?.length || 0) * 22, 1200 + (ability?.length || 0) * 22]
    if (step < 5) {
      const t = setTimeout(() => setStep(s => s + 1), delays[step] || 1200)
      return () => clearTimeout(t)
    }
  }, [step])

  function handleReveal() {
    if (step !== 0) return
    // Fire particle burst on tap
    setShowParticles(true)
    setTimeout(() => setShowParticles(false), 900)
    setStep(1)
  }

  const particleCount = 24
  const particleColor = colors.accent

  return (
    <div className={styles.scene} style={{ '--accent': colors.accent, '--glow': colors.glow, '--bg': colors.bg }}>
      <div className={styles.label}>YOUR ROLE — READ CAREFULLY</div>

      {/* Particle burst on flip */}
      {showParticles && (
        <div className={styles.particleWrap}>
          {[...Array(particleCount)].map((_, i) => (
            <div
              key={i}
              className={styles.particle}
              style={{
                '--angle': `${(i / particleCount) * 360}deg`,
                '--color': particleColor,
                '--delay': `${i * 20}ms`
              }}
            />
          ))}
        </div>
      )}

      <div className={styles.cardScene}>
        <div
          className={`${styles.card} ${step > 0 ? styles.revealed : ''}`}
          onClick={handleReveal}
        >
          {/* FRONT */}
          <div className={styles.front}>
            <div className={styles.pattern} />
            <div className={styles.tapIcon}>🎭</div>
            <span className={styles.tapHint}>TAP TO REVEAL</span>
          </div>

          {/* BACK */}
          <div className={styles.back}>
            <div className={`${styles.alignBadge} ${styles[alignment]}`}>
              {alignment === 'evil' ? '☠ ANTAGONIST' : '✦ COOPERATOR'}
            </div>

            {step >= 1 && (
              <div className={styles.roleName}>{twName}<span className={styles.cursor}>|</span></div>
            )}

            {step >= 2 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>🎯 WIN CONDITION</div>
                <div className={styles.sectionText}>{twWin}</div>
              </div>
            )}

            {step >= 3 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>⚡ ABILITY <span className={styles.once}>once per game</span></div>
                <div className={styles.sectionText}>{twAbility}</div>
              </div>
            )}

            {step >= 4 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>🚫 RESTRICTION</div>
                <div className={styles.sectionText}>{twRestriction}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {step >= 5 && (
        <button className={styles.readyBtn} onClick={onReady}>
          I understand — Let’s play →
        </button>
      )}

      <div className={styles.timer}>
        {step === 0 ? 'Others cannot see your role' : step < 5 ? 'Reading your role...' : '🔥 You’re ready. Don’t reveal your role.'}
      </div>
    </div>
  )
}
