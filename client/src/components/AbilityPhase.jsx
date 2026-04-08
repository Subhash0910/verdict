import React, { useState, useEffect } from 'react'
import styles from './AbilityPhase.module.css'

export default function AbilityPhase({ myRole, players, timer, onUse, onSkip }) {
  const [target, setTarget] = useState(null)
  const [acted, setActed] = useState(false)

  const mins = String(Math.floor(timer / 60)).padStart(2, '0')
  const secs = String(timer % 60).padStart(2, '0')
  const roleName = myRole?.roleName || '???'
  const accentColor = myRole?.alignment === 'evil' ? '#e63946' : '#00b4d8'

  function handleUse() {
    if (!target || acted) return
    setActed(true)
    onUse(target)
  }

  function handleSkip() {
    if (acted) return
    setActed(true)
    onSkip()
  }

  const others = players.filter(p => p.playerName !== myRole?.playerName && p.isAlive !== false)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.phase}>⚡ ABILITY PHASE</div>
        <div className={styles.timer}>{mins}:{secs}</div>
      </div>

      <div className={styles.body}>
        <div className={styles.abilityCard} style={{ '--accent': accentColor }}>
          <div className={styles.roleLabel}>{roleName}</div>
          <div className={styles.abilityLabel}>YOUR ABILITY <span className={styles.once}>once per game</span></div>
          <div className={styles.abilityText}>{myRole?.ability || 'No ability'}</div>
          <div className={styles.restrictionLabel}>⛔ RESTRICTION</div>
          <div className={styles.restrictionText}>{myRole?.restriction || 'None'}</div>
        </div>

        {!acted ? (
          <>
            <div className={styles.targetLabel}>Choose a target (required to use ability)</div>
            <div className={styles.playerGrid}>
              {others.map(p => (
                <button
                  key={p.playerId}
                  className={`${styles.targetBtn} ${target === p.playerName ? styles.selected : ''}`}
                  onClick={() => setTarget(p.playerName)}
                >
                  <span className={styles.avatar}>{p.playerName[0].toUpperCase()}</span>
                  <span className={styles.pname}>{p.playerName}</span>
                </button>
              ))}
            </div>

            <div className={styles.actions}>
              <button
                className={styles.useBtn}
                disabled={!target}
                onClick={handleUse}
                style={{ '--accent': accentColor }}
              >
                ⚡ Use Ability on {target || '...'}
              </button>
              <button className={styles.skipBtn} onClick={handleSkip}>
                Skip — save for later (lost forever)
              </button>
            </div>
          </>
        ) : (
          <div className={styles.actedMsg}>
            ✅ Action submitted — waiting for others...<br />
            <span style={{fontSize:'13px',color:'#555',marginTop:'8px',display:'block'}}>
              Results will appear in discussion chat
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
