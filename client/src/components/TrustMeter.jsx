import React, { useEffect, useRef, useState } from 'react'
import styles from './TrustMeter.module.css'
import { useSound } from '../hooks/useSound'

export default function TrustMeter({ players, trustScores, myPlayerName }) {
  const sound = useSound()
  const prevScores = useRef({})

  useEffect(() => {
    players.forEach(p => {
      const prev = prevScores.current[p.playerName] ?? 50
      const curr = trustScores[p.playerName] ?? 50
      if (curr < prev - 2) sound.play('trust_drop')
      else if (curr > prev + 2) sound.play('trust_rise')
      prevScores.current[p.playerName] = curr
    })
  }, [trustScores])

  return (
    <div className={styles.container}>
      <div className={styles.label}>TRUST</div>
      {players.filter(p => p.isAlive !== false).map(p => {
        const score = trustScores[p.playerName] ?? 50
        const isMe = p.playerName === myPlayerName
        const danger = score < 30
        const safe = score > 70
        return (
          <div key={p.playerName} className={styles.row}>
            <div className={`${styles.name} ${isMe ? styles.me : ''}`}>
              {p.playerName}{isMe ? ' ●' : ''}
            </div>
            <div className={styles.barWrap}>
              <div
                className={`${styles.bar} ${danger ? styles.danger : safe ? styles.safe : ''}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className={`${styles.score} ${danger ? styles.dangerText : ''}`}>
              {score}
            </div>
          </div>
        )
      })}
    </div>
  )
}
