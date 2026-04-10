import React, { useState, useEffect } from 'react'
import styles from './AbilityPhase.module.css'

export default function AbilityPhase({ myRole, players, timer, onUse, onSkip }) {
  const [target, setTarget] = useState(null)
  const [acted, setActed] = useState(false)
  const [activating, setActivating] = useState(false) // spinner state

  const mins = String(Math.floor(timer / 60)).padStart(2, '0')
  const secs = String(timer % 60).padStart(2, '0')
  const isUrgent = timer > 0 && timer <= 15
  const roleName = myRole?.roleName || '???'
  const accentColor = myRole?.alignment === 'evil' ? '#e63946' : '#00b4d8'

  function handleUse() {
    if (!target || acted) return
    setActivating(true)
    // Short activation delay for drama before marking as acted
    setTimeout(() => {
      setActivating(false)
      setActed(true)
      onUse(target)
    }, 1400)
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
        <div className={`${styles.timer} ${isUrgent ? styles.timerUrgent : ''}`}>{mins}:{secs}</div>
      </div>

      <div className={styles.body}>
        <div className={styles.abilityCard} style={{ '--accent': accentColor }}>
          <div className={styles.roleLabel}>{roleName}</div>
          <div className={styles.abilityLabel}>YOUR ABILITY <span className={styles.once}>once per game</span></div>
          <div className={styles.abilityText}>{myRole?.ability || 'No ability'}</div>
          <div className={styles.restrictionLabel}>⛔ RESTRICTION</div>
          <div className={styles.restrictionText}>{myRole?.restriction || 'None'}</div>
        </div>

        {/* Activating spinner */}
        {activating && (
          <div className={styles.activatingOverlay}>
            <div className={styles.spinRing} style={{ '--accent': accentColor }} />
            <div className={styles.activatingText} style={{ color: accentColor }}>
              Activating ability...
            </div>
            <div className={styles.activatingTarget}>Target: {target}</div>
          </div>
        )}

        {!acted && !activating ? (
          <>
            <div className={styles.targetLabel}>Choose a target to use your ability</div>
            <div className={styles.playerGrid}>
              {others.map(p => (
                <button
                  key={p.playerId}
                  className={`${styles.targetBtn} ${target === p.playerName ? styles.selected : ''}`}
                  onClick={() => setTarget(p.playerName)}
                  style={target === p.playerName ? { '--accent': accentColor } : {}}
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
                Skip — forfeit ability forever
              </button>
            </div>
          </>
        ) : acted ? (
          <div className={styles.actedMsg}>
            <div className={styles.actedIcon}>✅</div>
            <div className={styles.actedTitle}>Ability Deployed</div>
            <div className={styles.actedSub}>
              Results will surface in the discussion chat.<br />
              <span style={{color:'#666'}}>Others are still taking actions...</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
