import React, { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'

export default function App() {
  const [screen, setScreen]       = useState('home')
  const [roomData, setRoomData]   = useState(null)
  const [playerData, setPlayerData] = useState(null)
  const [gameTheme, setGameTheme] = useState('')

  function handleEnterLobby(room, player) {
    setRoomData(room)
    setPlayerData(player)
    setScreen('lobby')
  }

  function handleGameStart(theme) {
    setGameTheme(theme)
    setScreen('game')
  }

  function handleLeave() {
    setRoomData(null); setPlayerData(null); setScreen('home')
  }

  if (screen === 'home')  return <HomeScreen onEnterLobby={handleEnterLobby} />
  if (screen === 'lobby') return (
    <LobbyScreen
      roomData={roomData}
      playerData={playerData}
      onLeave={handleLeave}
      onGameStart={handleGameStart}
    />
  )
  if (screen === 'game')  return (
    <GameScreen
      roomCode={roomData?.roomCode}
      playerId={playerData?.playerId}
      playerName={playerData?.playerName}  /* real display name */
      initialTheme={gameTheme}
      onExit={handleLeave}
    />
  )
  return null
}
