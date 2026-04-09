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

      // When a new SW is found, wait for it to install then reload
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          // New SW installed and ready — if there's already a controller
          // (i.e. this isn't the very first load), reload to get fresh files
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version available — reloading...')
            window.location.reload()
          }
        })
      })
    })
    .catch(err => console.warn('SW registration failed:', err))

  // Also handle the case where the SW took over after a skipWaiting()
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    console.log('[SW] Controller changed — reloading for fresh cache')
    window.location.reload()
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SoundProvider>
      <App />
    </SoundProvider>
  </React.StrictMode>
)
