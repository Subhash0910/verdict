import React, { useEffect, useRef } from 'react'
import styles from './EvidenceBoard.module.css'
import { SFX } from '../hooks/useSound'

export default function EvidenceBoard({ events }) {
  const prevLen = useRef(0)

  useEffect(() => {
    if (events.length > prevLen.current) {
      SFX.evidenceSlam(events.length - 1)
    }
    prevLen.current = events.length
  }, [events])

  if (events.length === 0) return (
    <div className={styles.container}>
      <div className={styles.label}>EVIDENCE</div>
      <div className={styles.empty}>No moves made yet...</div>
    </div>
  )

  return (
    <div className={styles.container}>
      <div className={styles.label}>EVIDENCE</div>
      <div className={styles.list}>
        {events.map((e, i) => (
          <div key={i} className={`${styles.item} ${styles[e.type] || ''}`}
            style={{ animationDelay: `${i * 80}ms` }}>
            <span className={styles.icon}>{e.icon}</span>
            <span className={styles.text}>{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
