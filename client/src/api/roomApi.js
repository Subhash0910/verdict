import axios from 'axios'

const BASE = '/api/rooms'

export const createRoom = (hostPlayerId, hostName, maxPlayers = 8) =>
  axios.post(`${BASE}/create`, { hostPlayerId, hostName, maxPlayers })

export const joinRoom = (roomCode, playerId, playerName) =>
  axios.post(`${BASE}/${roomCode}/join`, { playerId, playerName })

export const getRoom = (roomCode) =>
  axios.get(`${BASE}/${roomCode}`)
