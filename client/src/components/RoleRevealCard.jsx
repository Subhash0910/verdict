import React, { useState, useEffect } from 'react'
import styles from './RoleRevealCard.module.css'

const ALIGNMENT_COLORS = {
  evil: { bg: 'var(--theme-bg-primary, #1a0005)', accent: 'var(--theme-accent-evil, #e63946)', glow: '#e63946' },
  good: { bg: 'var(--theme-bg-primary, #000d1a)', accent: 'var(--theme-accent-good, #00b4d8)', glow: '#00b4d8' },
}

// Deterministic rarity from role name hash
function getRarity(roleName) {
  if (!roleName) return 'COMMON'
  let hash = 0
  for (let i = 0; i < roleName.length; i++) hash = roleName.charCodeAt(i) + ((hash << 5) - hash)
  const val = Math.abs(hash) % 100
  if (val < 50) return 'COMMON'
  if (val < 75) return 'RARE'
  if (val < 92) return 'LEGENDARY'
  return 'MYTHIC'
}

const RARITY_STYLES = {
  COMMON:    { color: '#888',    glow: 'none',                          label: 'COMMON' },
  RARE:      { color: '#4a9eff', glow: '0 0 10px rgba(74,158,255,0.5)',  label: '\u2726 RARE' },
  LEGENDARY: { color: '#f7b731', glow: '0 0 14px rgba(247,183,49,0.6)',  label: '\u2605 LEGENDARY' },
  MYTHIC:    { color: '#c77dff', glow: '0 0 18px rgba(199,125,255,0.7)', label: '\u25c6 MYTHIC' },
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

/**
 * Step sequence:
 * 0 = pre-flip (tap to reveal)
 * 1 = role name types out
 * 2 = flavor text types out  ← NEW
 * 3 = win condition types out
 * 4 = ability types out
 * 5 = restriction types out
 * 6 = ready button appears
 */
export default function RoleRevealCard({ roleName, alignment, flavorText, winCondition, ability, restriction, onReady }) {
  const [step, setStep] = useState(0)
  const [showParticles, setShowParticles] = useState(false)
  const colors = ALIGNMENT_COLORS[alignment] || ALIGNMENT_COLORS.good
  const rarity = getRarity(roleName)
  const rarityStyle = RARITY_STYLES[rarity]

  const twName    = useTypewriter(roleName,     28, step >= 1)
  const twFlavor  = useTypewriter(flavorText,   18, step >= 2)
  const twWin     = useTypewriter(winCondition, 22, step >= 3)
  const twAbility = useTypewriter(ability,      22, step >= 4)
  const twRestrict= useTypewriter(restriction,  22, step >= 5)

  // Auto-advance steps after each typewriter finishes
  useEffect(() => {
    if (step === 0) return
    const durations = [
      0,
      800 + (roleName?.length   || 0) * 28,   // after name
      600 + (flavorText?.length || 0) * 18,   // after flavor
      600 + (winCondition?.length || 0) * 22, // after win
      600 + (ability?.length    || 0) * 22,   // after ability
      600 + (restriction?.length|| 0) * 22,   // after restriction
    ]
    if (step <= 5) {
      const t = setTimeout(() => setStep(s => s + 1), durations[step] || 800)
      return () => clearTimeout(t)
    }
  }, [step])

  function handleReveal() {
    if (step !== 0) return
    setShowParticles(true)
    setTimeout(() => setShowParticles(false), 900)
    setStep(1)
  }

  const particleCount = 24

  return (
    <div
      className={styles.scene}
      style={{
        '--accent': colors.accent,
        '--glow': colors.glow,
        '--bg': colors.bg,
        background: `radial-gradient(ellipse at 50% 40%, var(--theme-bg-secondary, #18002a) 0%, var(--theme-bg-primary, #060608) 70%)`
      }}
    >
      <div className={styles.label}>YOUR ROLE — READ CAREFULLY</div>

      {showParticles && (
        <div className={styles.particleWrap}>
          {[...Array(particleCount)].map((_, i) => (
            <div key={i} className={styles.particle}
              style={{ '--angle': `${(i / particleCount) * 360}deg`, '--color': colors.glow, '--delay': `${i * 20}ms` }}
            />
          ))}
        </div>
      )}

      <div className={styles.cardScene}>
        <div className={`${styles.card} ${step > 0 ? styles.revealed : ''}`} onClick={handleReveal}>

          {/* FRONT */}
          <div className={styles.front}>
            <div className={styles.pattern} />
            <div className={styles.tapIcon}>🎭</div>
            <span className={styles.tapHint}>TAP TO REVEAL</span>
          </div>

          {/* BACK */}
          <div className={styles.back}>
            {/* Rarity badge */}
            <div
              className={styles.rarityBadge}
              style={{ color: rarityStyle.color, boxShadow: rarityStyle.glow, borderColor: rarityStyle.color }}
            >
              {rarityStyle.label}
            </div>

            {/* Alignment badge */}
            <div className={`${styles.alignBadge} ${styles[alignment]}`}>
              {alignment === 'evil' ? '☠ ANTAGONIST' : '✦ COOPERATOR'}
            </div>

            {/* Step 1: Role name */}
            {step >= 1 && (
              <div className={styles.roleName}>
                {twName}<span className={step >= 2 ? styles.cursorHide : styles.cursor}>|</span>
              </div>
            )}

            {/* Step 2: Flavor text — NEW */}
            {step >= 2 && flavorText && (
              <div className={styles.flavorText}>
                “{twFlavor}{step < 3 && <span className={styles.cursor}>|</span>}”
              </div>
            )}

            {/* Step 3: Win condition */}
            {step >= 3 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>🎯 WIN CONDITION</div>
                <div className={styles.sectionText}>{twWin}{step < 4 && <span className={styles.cursor}>|</span>}</div>
              </div>
            )}

            {/* Step 4: Ability */}
            {step >= 4 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>⚡ ABILITY <span className={styles.once}>once per game</span></div>
                <div className={styles.sectionText}>{twAbility}{step < 5 && <span className={styles.cursor}>|</span>}</div>
              </div>
            )}

            {/* Step 5: Restriction */}
            {step >= 5 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>🚫 RESTRICTION</div>
                <div className={styles.sectionText}>{twRestrict}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ready button */}
      {step >= 6 && (
        <button className={styles.readyBtn} onClick={onReady}>
          I understand — Let's play →
        </button>
      )}

      <div className={styles.timer}>
        {step === 0
          ? 'Others cannot see your role'
          : step < 6
          ? 'Reading your role...'
          : '\ud83d\udd25 You\'re ready. Don\'t reveal your role.'}
      </div>
    </div>
  )
}
