import React, { useEffect, useRef } from 'react'
import styles from './EvidenceBoard.module.css'
import { useSound } from '../hooks/useSound'

const ICONS = {
  ability:   '⚡',
  shadow:    '❓',
  alliance:  '🤝',
  observer:  '🔍',
  accusation:'🔴',
  confession:'🏛️',
  system:    '⚡',
}

export default function EvidenceBoard({ events }) {
  const sound = useSound()
  const prevLen = useRef(0)

  useEffect(() => {
    if (events.length > prevLen.current) {
      sound.play('whoosh')
      prevLen.current = events.length
    }
  }, [events.length])

  return (
    <div className={styles.board}>
      <div className={styles.label}>EVIDENCE</div>
      {events.length === 0 && (
        <div className={styles.empty}>No moves yet...<br/><span>Abilities used this round will appear here</span></div>
      )}
      {[...events].reverse().map((e, i) => (
        <div key={i} className={`${styles.card} ${styles[e.type] || ''}`}>
          <span className={styles.icon}>{ICONS[e.type] || '•'}</span>
          <span className={styles.text}>{e.text}</span>
        </div>
      ))}
    </div>
  )
}
