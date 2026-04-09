import axios from 'axios'

const BASE = '/api/rooms'

export const createRoom = (hostPlayerId, hostDisplayName, maxPlayers = 8) =>
  axios.post(`${BASE}/create`, { hostPlayerId, hostDisplayName, maxPlayers })

export const joinRoom = (roomCode, playerId, displayName) =>
  axios.post(`${BASE}/${roomCode}/join`, { playerId, displayName })

/** Join as spectator — works mid-game too */
export const spectateRoom = (roomCode, playerId, displayName) =>
  axios.post(`${BASE}/${roomCode}/spectate`, { playerId, displayName })

export const getRoom = (roomCode) =>
  axios.get(`${BASE}/${roomCode}`)
