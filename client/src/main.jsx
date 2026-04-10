import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SoundProvider } from './context/SoundContext'
import { initPwaIcons } from './utils/pwaIcons'
import './index.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      initPwaIcons()

      // Only reload when a genuine NEW version is waiting (not first install).
      // We check navigator.serviceWorker.controller — if it's null this is the
      // very first SW install, no need to reload.
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // A real update is ready — show a toast or just reload once
            console.log('[SW] New version ready — reloading once for fresh cache')
            window.location.reload()
          }
        })
      })
    })
    .catch(err => console.warn('[SW] Registration failed:', err))
  // NOTE: No controllerchange listener — that was causing the infinite reload loop.
  // The updatefound handler above is sufficient and safe.
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SoundProvider>
      <App />
    </SoundProvider>
  </React.StrictMode>
)
