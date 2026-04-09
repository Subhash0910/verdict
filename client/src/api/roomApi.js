import axios from 'axios'

export const createRoom = (playerId, displayName, maxPlayers = 8) =>
  axios.post('/api/rooms/create', {
    hostPlayerId: playerId,
    hostDisplayName: displayName,
    maxPlayers,
  })

export const joinRoom = (roomCode, playerId, displayName) =>
  axios.post(`/api/rooms/${roomCode}/join`, {
    playerId,
    displayName,
  })
