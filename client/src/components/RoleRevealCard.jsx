import React, { useState } from 'react'
import styles from './RoleRevealCard.module.css'

const ROLE_COLORS = {
  Traitor:   { bg: '#1a0000', accent: '#e63946', glow: '#e63946' },
  Detective: { bg: '#000d1a', accent: '#00b4d8', glow: '#00b4d8' },
  Medic:     { bg: '#001a0d', accent: '#2dc653', glow: '#2dc653' },
  Witness:   { bg: '#0d0d1a', accent: '#9b5de5', glow: '#9b5de5' },
  Civilian:  { bg: '#111118', accent: '#aaaaaa', glow: '#aaaaaa' },
}

const ROLE_ICONS = {
  Traitor:   '🗡️',
  Detective: '🔍',
  Medic:     '💉',
  Witness:   '👁️',
  Civilian:  '👤',
}

export default function RoleRevealCard({ role, alignment, secretMission, onReady }) {
  const [flipped, setFlipped] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const colors = ROLE_COLORS[role] || ROLE_COLORS.Civilian

  function handleFlip() {
    if (!flipped) {
      setFlipped(true)
      setTimeout(() => setRevealed(true), 400)
    }
  }

  return (
    <div className={styles.scene}>
      <div className={styles.header}>
        <span className={styles.label}>YOUR ROLE</span>
      </div>

      <div
        className={`${styles.card} ${flipped ? styles.flipped : ''}`}
        onClick={handleFlip}
        style={{ '--accent': colors.accent, '--glow': colors.glow, '--bg': colors.bg }}
      >
        <div className={styles.cardFront}>
          <div className={styles.cardBack_pattern} />
          <span className={styles.tapHint}>TAP TO REVEAL</span>
        </div>
        <div className={styles.cardBack}>
          {revealed && (
            <>
              <div className={styles.roleIcon}>{ROLE_ICONS[role] ?? '❓'}</div>
              <div className={styles.roleName}>{role}</div>
              <div className={`${styles.alignment} ${alignment === 'evil' ? styles.evil : styles.good}`}>
                {alignment === 'evil' ? '☠️ TRAITOR SIDE' : '✔️ GOOD SIDE'}
              </div>
              <div className={styles.missionLabel}>SECRET MISSION</div>
              <div className={styles.mission}>{secretMission}</div>
            </>
          )}
        </div>
      </div>

      {revealed && (
        <button className={styles.readyBtn} onClick={onReady}>
          I understand my role →
        </button>
      )}
    </div>
  )
}
