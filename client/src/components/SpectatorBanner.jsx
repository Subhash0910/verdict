import React, { useState } from 'react'
import styles from './SpectatorBanner.module.css'

export default function SpectatorBanner({ spectatorCount = 1 }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={`${styles.banner} ${collapsed ? styles.collapsed : ''}`}
      onClick={() => setCollapsed(v => !v)}
      title={collapsed ? 'Show spectator info' : 'Tap to collapse'}
    >
      <span className={styles.icon}>👁</span>
      {!collapsed && (
        <span className={styles.text}>
          SPECTATING
          {spectatorCount > 1 && (
            <span className={styles.count}> · {spectatorCount} watching</span>
          )}
        </span>
      )}
    </div>
  )
}
