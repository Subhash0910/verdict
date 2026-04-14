import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SoundProvider } from './context/SoundContext'
import { initPwaIcons } from './utils/pwaIcons'
import './index.css'

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // ── PRODUCTION only: register SW for offline + PWA support ──────────────
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        initPwaIcons()

        // Only reload when a REAL new version is waiting.
        // navigator.serviceWorker.controller is null on first-ever install,
        // so this guard prevents any reload on initial page load.
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version ready — reloading for fresh cache')
              window.location.reload()
            }
          })
        })
      })
      .catch(err => console.warn('[SW] Registration failed:', err))
  } else {
    // ── DEV mode: unregister any leftover SW from previous sessions ──────────
    // This cleans up any broken/stale worker that might have been registered
    // before this fix, preventing phantom reloads during development.
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(r => {
        r.unregister()
        console.log('[SW] Unregistered stale SW in dev mode:', r.scope)
      })
    })
  }
}

const RootWrapper = import.meta.env.DEV ? React.Fragment : React.StrictMode

ReactDOM.createRoot(document.getElementById('root')).render(
  <RootWrapper>
    <SoundProvider>
      <App />
    </SoundProvider>
  </RootWrapper>
)
