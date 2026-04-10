import React, { useState, useEffect } from 'react'
import styles from './StatsScreen.module.css'

const BADGES = [
  { key: 'accusationsReceived', label: '🔴 Most Accused',    desc: 'accusations received' },
  { key: 'accusationsMade',     label: '🦹 Most Paranoid',   desc: 'accusations made' },
  { key: 'votesReceived',       label: '🗳 Most Voted',      desc: 'votes received' },
  { key: 'messagesSent',        label: '💬 Most Chatty',     desc: 'messages sent' },
]

function AnimatedNumber({ value, delay = 0 }) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => {
    if (!value) return
    const t = setTimeout(() => {
      let start = 0
      const step = Math.ceil(value / 20)
      const iv = setInterval(() => {
        start = Math.min(start + step, value)
        setDisplayed(start)
        if (start >= value) clearInterval(iv)
      }, 40)
      return () => clearInterval(iv)
    }, delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return <span>{displayed}</span>
}

function TrustBar({ value }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 200)
    return () => clearTimeout(t)
  }, [value])
  const color = value >= 60 ? '#00b4d8' : value >= 35 ? '#f7b731' : '#e63946'
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
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  if (!stats.length) {
    return (
      <div className={styles.empty}>
        <span>No stats available for this game.</span>
      </div>
    )
  }

  // Find badge winners
  const badgeMap = {}
  BADGES.forEach(b => {
    const top = [...stats].sort((x, y) => (y[b.key] || 0) - (x[b.key] || 0))[0]
    if (top && (top[b.key] || 0) > 0) badgeMap[top.playerName] = badgeMap[top.playerName] || []
    if (top && (top[b.key] || 0) > 0) badgeMap[top.playerName].push(b.label)
  })

  // Find the villain (evil alignment)
  const villain = stats.find(s => s.alignment === 'evil')

  return (
    <div className={`${styles.container} ${visible ? styles.visible : ''}`}>
      <div className={styles.header}>
        <div className={styles.title}>GAME STATS</div>
        <div className={styles.subtitle}>
          {winner === 'good' ? '✦ Cooperators won this round' : '☠ Antagonist was victorious'}
        </div>
      </div>

      {/* Villain reveal banner */}
      {villain && (
        <div className={`${styles.villainBanner} ${winner === 'evil' ? styles.villainWon : ''}`}>
          <span className={styles.villainLabel}>THE ANTAGONIST WAS</span>
          <span className={styles.villainName}>{villain.playerName}</span>
          <span className={styles.villainRole}>{villain.roleName}</span>
          <span className={styles.villainOutcome}>
            {villain.survived ? '😈 Survived' : '💀 Eliminated'}
          </span>
        </div>
      )}

      {/* Player stat cards */}
      <div className={styles.grid}>
        {stats.map((p, i) => {
          const isMe = p.playerName === myPlayerName
          const isVillain = p.alignment === 'evil'
          const myBadges = badgeMap[p.playerName] || []

          return (
            <div
              key={p.playerName}
              className={`${styles.card} ${isMe ? styles.myCard : ''} ${isVillain ? styles.villainCard : ''} ${i === 0 ? styles.topCard : ''}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Rank */}
              <div className={styles.rank}>#{i + 1}</div>

              {/* Name + role */}
              <div className={styles.nameRow}>
                <span className={styles.avatar}>{p.playerName?.[0]?.toUpperCase()}</span>
                <div className={styles.nameBlock}>
                  <span className={styles.playerName}>
                    {p.playerName}
                    {isMe && <span className={styles.youTag}> (you)</span>}
                  </span>
                  <span className={`${styles.roleTag} ${isVillain ? styles.roleEvil : styles.roleGood}`}>
                    {isVillain ? '☠' : '✦'} {p.roleName}
                  </span>
                </div>
                <span className={`${styles.outcome} ${p.survived ? styles.survived : styles.eliminated}`}>
                  {p.survived ? 'Survived' : 'Eliminated'}
                </span>
              </div>

              {/* Stat row */}
              <div className={styles.statRow}>
                <div className={styles.stat}>
                  <span className={styles.statNum}><AnimatedNumber value={p.accusationsReceived || 0} delay={i * 80 + 200} /></span>
                  <span className={styles.statLabel}>Accused</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}><AnimatedNumber value={p.votesReceived || 0} delay={i * 80 + 280} /></span>
                  <span className={styles.statLabel}>Votes</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}><AnimatedNumber value={p.messagesSent || 0} delay={i * 80 + 360} /></span>
                  <span className={styles.statLabel}>Messages</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{p.abilityUsed ? '⚡' : '—'}</span>
                  <span className={styles.statLabel}>Ability</span>
                </div>
              </div>

              {/* Trust bar */}
              <div className={styles.trustRow}>
                <span className={styles.trustLabel}>FINAL TRUST</span>
                <TrustBar value={p.finalTrust || 0} />
              </div>

              {/* Achievement badges */}
              {myBadges.length > 0 && (
                <div className={styles.badges}>
                  {myBadges.map(b => <span key={b} className={styles.badge}>{b}</span>)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
