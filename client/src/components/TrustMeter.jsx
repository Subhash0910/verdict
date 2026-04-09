import React, { useEffect, useRef, useState } from 'react'
import styles from './TrustMeter.module.css'
import { SFX } from '../hooks/useSound'

export default function TrustMeter({ players, trustScores, myPlayerName }) {
  const prevScores = useRef({})

  useEffect(() => {
    players.forEach(p => {
      const prev = prevScores.current[p.playerName] ?? 50
      const curr = trustScores[p.playerName] ?? 50
      if (curr < prev - 2) SFX.trustDrop()
      else if (curr > prev + 2) SFX.trustRise()
    })
    prevScores.current = { ...trustScores }
  }, [trustScores])

  return (
    <div className={styles.container}>
      <div className={styles.label}>TRUST</div>
      {players.filter(p => p.isAlive !== false).map(p => {
        const score = trustScores[p.playerName] ?? 50
        const isMe = p.playerName === myPlayerName
        const danger = score < 25
        const high = score > 70
        return (
          <div key={p.playerName} className={styles.row}>
            <div className={styles.name} title={p.playerName}>
              {isMe ? <b>{p.playerName}</b> : p.playerName}
            </div>
            <div className={styles.barTrack}>
              <div
                className={`${styles.barFill} ${danger ? styles.danger : high ? styles.high : ''}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className={`${styles.score} ${danger ? styles.dangerText : ''}`}>{score}</div>
          </div>
        )
      })}
    </div>
  )
}
