import React, { useEffect, useState } from 'react'
import styles from './StatsScreen.module.css'

function AnimatedNumber({ value, delay = 0 }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!value) return
      let current = 0
      const step = Math.max(1, Math.ceil(value / 20))
      const interval = setInterval(() => {
        current = Math.min(current + step, value)
        setDisplayed(current)
        if (current >= value) clearInterval(interval)
      }, 36)
      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(timeout)
  }, [delay, value])

  return <span>{displayed}</span>
}

function TrustBar({ value }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => setWidth(value), 180)
    return () => clearTimeout(timeout)
  }, [value])

  const color = value >= 60 ? 'var(--theme-accent-good)' : value >= 35 ? '#f7b731' : 'var(--theme-accent-evil)'

  return (
    <div className={styles.trustBarBg}>
      <div
        className={styles.trustBarFill}
        style={{ width: `${width}%`, background: color, transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
      <span className={styles.trustNum}>{value}</span>
    </div>
  )
}

export default function StatsScreen({ stats = [], winner, myPlayerName }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timeout)
  }, [])

  if (!stats.length) {
    return (
      <div className={styles.empty}>
        <span>No receipts survived this case.</span>
      </div>
    )
  }

  const villain = stats.find((player) => player.alignment === 'evil')

  return (
    <div className={`${styles.container} ${visible ? styles.visible : ''}`}>
      <div className={styles.header}>
        <div className={styles.title}>Case Receipts</div>
        <div className={styles.subtitle}>
          {winner === 'good' ? 'Cooperators closed the case.' : 'The antagonist escaped the room.'}
        </div>
      </div>

      {villain && (
        <div className={`${styles.villainBanner} ${winner === 'evil' ? styles.villainWon : ''}`}>
          <span className={styles.villainLabel}>Hidden Antagonist</span>
          <span className={styles.villainName}>{villain.playerName}</span>
          <span className={styles.villainRole}>{villain.roleName}</span>
          <span className={styles.villainOutcome}>{villain.survived ? 'Stayed standing' : 'Taken down in tribunal'}</span>
        </div>
      )}

      <div className={styles.grid}>
        {stats.map((player, index) => {
          const isMe = player.playerName === myPlayerName
          const isVillain = player.alignment === 'evil'
          const receipts = player.receipts || []

          return (
            <div
              key={player.playerName}
              className={`${styles.card} ${isMe ? styles.myCard : ''} ${isVillain ? styles.villainCard : ''} ${index === 0 ? styles.topCard : ''}`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className={styles.rank}>#{index + 1}</div>

              <div className={styles.nameRow}>
                <span className={styles.avatar}>{player.playerName?.[0]?.toUpperCase()}</span>
                <div className={styles.nameBlock}>
                  <span className={styles.playerName}>
                    {player.playerName}
                    {isMe && <span className={styles.youTag}> (you)</span>}
                  </span>
                  <span className={`${styles.roleTag} ${isVillain ? styles.roleEvil : styles.roleGood}`}>
                    {player.factionLabel || (isVillain ? 'Antagonist' : 'Cooperator')} / {player.roleName}
                  </span>
                </div>
                <span className={`${styles.outcome} ${player.survived ? styles.survived : styles.eliminated}`}>
                  {player.survived ? 'Survived' : 'Eliminated'}
                </span>
              </div>

              <div className={styles.statRow}>
                <div className={styles.stat}>
                  <span className={styles.statNum}><AnimatedNumber value={player.accusationsReceived || 0} delay={index * 80 + 180} /></span>
                  <span className={styles.statLabel}>Suspected</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}><AnimatedNumber value={player.votesReceived || 0} delay={index * 80 + 260} /></span>
                  <span className={styles.statLabel}>Condemn</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}><AnimatedNumber value={player.messagesSent || 0} delay={index * 80 + 340} /></span>
                  <span className={styles.statLabel}>Messages</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{player.abilityUsed ? 'Yes' : 'No'}</span>
                  <span className={styles.statLabel}>Power</span>
                </div>
              </div>

              <div className={styles.trustRow}>
                <span className={styles.trustLabel}>Final Trust</span>
                <TrustBar value={player.finalTrust || 0} />
              </div>

              {receipts.length > 0 && (
                <div className={styles.badges}>
                  {receipts.map((receipt) => (
                    <span key={receipt} className={styles.badge}>{receipt}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
