/**
 * InstallBanner — bottom slide-up banner prompting PWA install.
 * Only shown when:
 *  - Browser supports beforeinstallprompt (canInstall = true)
 *  - User hasn't permanently dismissed it (localStorage flag)
 */
import React, { useState, useEffect } from 'react'
import useInstallPrompt from '../hooks/useInstallPrompt'
import styles from './InstallBanner.module.css'

const DISMISSED_KEY = 'verdict_install_dismissed'

export default function InstallBanner() {
  const { canInstall, triggerInstall } = useInstallPrompt()
  const [dismissed, setDismissed]     = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === 'true' } catch { return false }
  })
  const [visible, setVisible]         = useState(false)

  // Delay show slightly so it doesn't flash on load
  useEffect(() => {
    if (canInstall && !dismissed) {
      const t = setTimeout(() => setVisible(true), 2500)
      return () => clearTimeout(t)
    }
  }, [canInstall, dismissed])

  const handleInstall = async () => {
    const outcome = await triggerInstall()
    if (outcome === 'accepted') {
      setVisible(false)
    }
  }

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
    try { localStorage.setItem(DISMISSED_KEY, 'true') } catch {}
  }

  if (!visible) return null

  return (
    <div className={`${styles.banner} ${visible ? styles.show : ''}`}>
      <div className={styles.left}>
        <span className={styles.icon}>⚖️</span>
        <div className={styles.text}>
          <span className={styles.title}>Add VERDICT to Home Screen</span>
          <span className={styles.sub}>Play instantly, even offline</span>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.installBtn} onClick={handleInstall}>Install</button>
        <button className={styles.dismissBtn} onClick={handleDismiss} title="Dismiss">×</button>
      </div>
    </div>
  )
}
