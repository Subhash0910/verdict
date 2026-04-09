import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SoundProvider } from './context/SoundContext'
import { initPwaIcons } from './utils/pwaIcons'
import './index.css'

// Register SW, then generate + cache icons
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => initPwaIcons())
    .catch(err => console.warn('SW registration failed:', err))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SoundProvider>
      <App />
    </SoundProvider>
  </React.StrictMode>
)
