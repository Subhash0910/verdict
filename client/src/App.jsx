import React, { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'

/**
 * Simple screen-based router (no React Router needed for Phase 1).
 * screens: 'home' | 'lobby'
 */
export default function App() {
  const [screen, setScreen] = useState('home')
  const [roomData, setRoomData] = useState(null)
  const [playerData, setPlayerData] = useState(null)

  const goToLobby = (room, player) => {
    setRoomData(room)
    setPlayerData(player)
    setScreen('lobby')
  }

  const goHome = () => {
    setRoomData(null)
    setPlayerData(null)
    setScreen('home')
  }

  return (
    <>
      {screen === 'home' && <HomeScreen onEnterLobby={goToLobby} />}
      {screen === 'lobby' && (
        <LobbyScreen
          roomData={roomData}
          playerData={playerData}
          onLeave={goHome}
        />
      )}
    </>
  )
}
