/**
 * useInstallPrompt — captures the browser's beforeinstallprompt event.
 * Returns { canInstall, triggerInstall }.
 *
 * canInstall is true only when:
 *  - Browser fired beforeinstallprompt (Chrome/Edge Android, some desktop)
 *  - App is not already running in standalone mode
 */
import { useState, useEffect } from 'react'

export default function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [canInstall, setCanInstall]         = useState(false)

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     window.navigator.standalone === true)

  useEffect(() => {
    if (isStandalone) return

    function handleBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const triggerInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setCanInstall(false)
    return outcome // 'accepted' | 'dismissed'
  }

  return { canInstall, triggerInstall }
}
