import React, { useState } from 'react'
import styles from './AbilityPhase.module.css'

export default function AbilityPhase({ myRole, players, timer, operation, round, maxRounds, onUse, onSkip }) {
  const [target, setTarget] = useState(null)
  const [acted, setActed] = useState(false)
  const [activating, setActivating] = useState(false)

  const mins = String(Math.floor(timer / 60)).padStart(2, '0')
  const secs = String(timer % 60).padStart(2, '0')
  const isUrgent = timer > 0 && timer <= 12
  const roleName = myRole?.roleName || 'Unknown Role'
  const accentColor = myRole?.alignment === 'evil' ? 'var(--theme-accent-evil)' : 'var(--theme-accent-good)'
  const outcomePreview = getOutcomePreview(myRole, target)

  function handleUse() {
    if (!target || acted) return
    setActivating(true)
    setTimeout(() => {
      setActivating(false)
      setActed(true)
      onUse(target)
    }, 1200)
  }

  function handleSkip() {
    if (acted) return
    setActed(true)
    onSkip()
  }

  const others = players.filter((player) => player.playerName !== myRole?.playerName && player.isAlive !== false)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <div className={styles.phase}>Operation Phase</div>
          <div className={styles.roundMeta}>Round {round || 1} / {maxRounds || 3}</div>
        </div>
        <div className={`${styles.timer} ${isUrgent ? styles.timerUrgent : ''}`}>{mins}:{secs}</div>
      </div>

      <div className={styles.body}>
        {operation && (
          <div className={styles.operationCard}>
            <div className={styles.operationLabel}>Tonight's Operation</div>
            <div className={styles.operationTitle}>{operation.title}</div>
            <div className={styles.operationText}>{operation.briefing}</div>
            <div className={styles.operationPrompt}>{operation.discussionPrompt}</div>
            {(operation.primaryTarget || operation.secondaryTarget) && (
              <div className={styles.operationTargets}>
                Focus:
                {operation.primaryTarget && <span>{operation.primaryTarget}</span>}
                {operation.secondaryTarget && operation.secondaryTarget !== operation.primaryTarget && <span>{operation.secondaryTarget}</span>}
              </div>
            )}
          </div>
        )}

        <div className={styles.abilityCard} style={{ '--accent': accentColor }}>
          <div className={styles.roleLabel}>{roleName}</div>
          <div className={styles.abilityLabel}>Your Public Power <span className={styles.once}>once per match</span></div>
          <div className={styles.abilityText}>{myRole?.ability || 'No ability assigned.'}</div>
          <div className={styles.restrictionLabel}>Restriction</div>
          <div className={styles.restrictionText}>{myRole?.restriction || 'None'}</div>
          {target && !acted && !activating && (
            <div className={styles.outcomePreview}>
              <div className={styles.outcomeLabel}>What This Will Trigger</div>
              <div className={styles.outcomeText}>{outcomePreview}</div>
            </div>
          )}
        </div>

        {activating && (
          <div className={styles.activatingOverlay}>
            <div className={styles.spinRing} style={{ '--accent': accentColor }} />
            <div className={styles.activatingText} style={{ color: accentColor }}>Deploying operation...</div>
            <div className={styles.activatingTarget}>Target: {target}</div>
          </div>
        )}

        {!acted && !activating ? (
          <>
            <div className={styles.targetLabel}>Choose who your move pressures this round</div>
            <div className={styles.playerGrid}>
              {others.map((player) => (
                <button
                  key={player.playerId}
                  className={`${styles.targetBtn} ${target === player.playerName ? styles.selected : ''}`}
                  onClick={() => setTarget(player.playerName)}
                  style={target === player.playerName ? { '--accent': accentColor } : {}}
                >
                  <span className={styles.avatar}>{player.playerName[0].toUpperCase()}</span>
                  <span className={styles.pname}>{player.playerName}</span>
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
                Use power on {target || '...'}
              </button>
              <button className={styles.skipBtn} onClick={handleSkip}>
                Hold your move
              </button>
            </div>
          </>
        ) : acted ? (
          <div className={styles.actedMsg}>
            <div className={styles.actedIcon}>+</div>
            <div className={styles.actedTitle}>Move Locked</div>
            <div className={styles.actedSub}>
              {outcomePreview}
              <br />
              <span>The system will surface the fallout in discussion. Others may still be making their move.</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function getOutcomePreview(role, target) {
  if (!target) return 'Choose a player to see the pressure this move creates.'

  switch (role?.roleChassisId) {
    case 'archivist':
      return `${target}'s power title will be exposed to the whole room.`
    case 'witness':
      return `${target} will have to confirm or deny using their power this round.`
    case 'cipher':
      return `The room will get a public VERIFIED or UNSTABLE read on ${target}.`
    case 'handler':
      return `${target} will be forced to say who they would spare right now.`
    case 'specter':
      return `${target} will lose the right to call tribunal this round.`
    case 'broker':
      return `${target} will be pushed into a public side-by-side answer check.`
    case 'phantom':
      return `${target} will have to answer a direct yes-or-no question in public.`
    case 'saboteur':
      return `${target} will have to name who they trust most, out loud.`
    case 'shade':
      return `The next accusation against ${target} will hit harder than normal.`
    default:
      return `${target} will be pressured in discussion and their trust will move.`
  }
}
