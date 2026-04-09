/**
 * SoundContext — global mute toggle with localStorage persistence.
 *
 * Usage:
 *   const { isMuted, toggleMute } = useSoundContext()
 *
 * Wrap your app in <SoundProvider>.
 * useSound.js reads window.__verdictMuted to gate all SFX calls.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'verdict_muted'

const SoundContext = createContext({ isMuted: false, toggleMute: () => {} })

export function SoundProvider({ children }) {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Keep window flag in sync — useSound.js reads this synchronously
  useEffect(() => {
    window.__verdictMuted = isMuted
    try { localStorage.setItem(STORAGE_KEY, String(isMuted)) } catch {}
  }, [isMuted])

  // Set flag immediately on first mount (before any effect)
  if (typeof window !== 'undefined') {
    window.__verdictMuted = isMuted
  }

  const toggleMute = useCallback(() => setIsMuted(m => !m), [])

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute }}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSoundContext() {
  return useContext(SoundContext)
}
