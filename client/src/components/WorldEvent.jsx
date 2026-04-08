import React, { useEffect, useState } from 'react'
import styles from './WorldEvent.module.css'

export default function WorldEvent({ event, onDismiss }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 400)
    }, 6000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`${styles.overlay} ${!visible ? styles.exit : ''}`}>
      <div className={styles.flash} />
      <div className={styles.card}>
        <div className={styles.gmLabel}>⚡ WORLD EVENT</div>
        <div className={styles.title}>{event.title}</div>
        <div className={styles.description}>{event.description}</div>
        <div className={styles.effectLabel}>EFFECT</div>
        <div className={styles.effect}>{event.effect}</div>
      </div>
    </div>
  )
}
