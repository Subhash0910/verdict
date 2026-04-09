import React, { useEffect, useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'
import InstallBanner from './components/InstallBanner'

function App() {
  const [screen, setScreen]         = useState('home')
  const [roomData, setRoomData]     = useState(null)
  const [playerData, setPlayerData] = useState(null)
  const [gameTheme, setGameTheme]   = useState('')

  // Deep link query param handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')
    const action   = params.get('action')
    if (joinCode) {
      sessionStorage.setItem('verdict_autojoin', joinCode)
      window.history.replaceState({}, '', '/')
    }
    if (action) {
      sessionStorage.setItem('verdict_autoaction', action)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  function handleRoomReady(room, player) {
    setRoomData(room)
    setPlayerData(player)
    setScreen('lobby')
  }

  function handleGameStart(theme, synopsis) {
    setGameTheme(theme || '')
    setScreen('game')
  }

  // Play Again: server reset already called by GameScreen.
  // Just return to lobby — room + players are still joined.
  function handlePlayAgain() {
    setScreen('lobby')
  }

  function handleLeave() {
    setRoomData(null)
    setPlayerData(null)
    setGameTheme('')
    setScreen('home')
  }

  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          onRoomReady={handleRoomReady}
        />
      )}

      {screen === 'lobby' && (
        <LobbyScreen
          roomData={roomData}
          playerData={playerData}
          onLeave={handleLeave}
          onGameStart={handleGameStart}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          roomData={roomData}
          playerData={playerData}
          initialTheme={gameTheme}
          onPlayAgain={handlePlayAgain}
          onExit={handleLeave}
        />
      )}

      <InstallBanner />
    </>
  )
}

export default App
