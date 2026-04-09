import React, { useEffect, useState } from 'react'
import axios from 'axios'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'
import InstallBanner from './components/InstallBanner'

function App() {
  const [screen, setScreen]       = useState('home')
  const [roomData, setRoomData]   = useState(null)
  const [playerData, setPlayerData] = useState(null)

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err =>
        console.warn('SW registration failed:', err)
      )
    }
  }, [])

  // Handle ?join=ROOMCODE deep link (from QR or share link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')
    const action   = params.get('action')
    if (joinCode) {
      // Pre-fill join code — HomeScreen reads this via props or sessionStorage
      sessionStorage.setItem('verdict_autojoin', joinCode)
      window.history.replaceState({}, '', '/')
    }
    if (action === 'create') {
      sessionStorage.setItem('verdict_autoaction', 'create')
      window.history.replaceState({}, '', '/')
    }
    if (action === 'join') {
      sessionStorage.setItem('verdict_autoaction', 'join')
      window.history.replaceState({}, '', '/')
    }
  }, [])

  function handleRoomReady(room, player) {
    setRoomData(room)
    setPlayerData(player)
    setScreen('lobby')
  }

  function handleGameStart(theme, synopsis) {
    setScreen('game')
  }

  function handleLeave() {
    setRoomData(null)
    setPlayerData(null)
    setScreen('home')
  }

  return (
    <>
      {screen === 'home'  && <HomeScreen onRoomReady={handleRoomReady} />}
      {screen === 'lobby' && (
        <LobbyScreen
          roomData={roomData}
          playerData={playerData}
          onLeave={handleLeave}
          onGameStart={handleGameStart}
        />
      )}
      {screen === 'game'  && (
        <GameScreen
          roomData={roomData}
          playerData={playerData}
          onLeave={handleLeave}
        />
      )}
      {/* PWA install banner — shown only when browser fires beforeinstallprompt */}
      <InstallBanner />
    </>
  )
}

export default App
