import React, { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [roomData, setRoomData] = useState(null)
  const [playerData, setPlayerData] = useState(null)

  const goToLobby = (room, player) => {
    setRoomData(room)
    setPlayerData(player)
    setScreen('lobby')
  }

  const goToGame = () => setScreen('game')

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
          onGameStart={goToGame}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          roomCode={roomData?.roomCode}
          playerId={playerData?.playerId}
          playerName={playerData?.playerName}
          onExit={goHome}
        />
      )}
    </>
  )
}
