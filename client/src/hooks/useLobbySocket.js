import { useEffect, useRef, useState, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

/**
 * Lobby socket hook.
 * Handles: PLAYER_JOINED, PLAYER_LEFT, GAME_STARTING, GAME_RESET, SPECTATOR_JOINED
 * Returns: { players, spectatorCount, connected, gameEvent, sendPing }
 */
export default function useLobbySocket(roomCode, playerId) {
  const clientRef = useRef(null)
  const [connected, setConnected]       = useState(false)
  const [players, setPlayers]           = useState([])
  const [spectatorCount, setSpectatorCount] = useState(0)
  const [gameEvent, setGameEvent]       = useState(null)

  useEffect(() => {
    if (!roomCode || !playerId) return

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        client.subscribe(`/topic/lobby/${roomCode}`, (msg) => {
          const data = JSON.parse(msg.body)

          // Player list update
          if (data.players) setPlayers(data.players)

          switch (data.type) {
            case 'GAME_STARTING':
              setGameEvent({ type: 'GAME_STARTING', theme: data.theme, synopsis: data.synopsis })
              break

            case 'GAME_RESET':
              // Host called Play Again — everyone returns to lobby
              setGameEvent({ type: 'GAME_RESET' })
              break

            case 'SPECTATOR_JOINED':
              setSpectatorCount(data.spectatorCount || 0)
              break

            case 'SPECTATOR_LEFT':
              setSpectatorCount(prev => Math.max(0, prev - 1))
              break

            default:
              break
          }
        })

        client.publish({
          destination: `/app/lobby/${roomCode}/ping`,
          body: JSON.stringify({ playerId }),
        })
      },
      onDisconnect: () => setConnected(false),
    })

    client.activate()
    clientRef.current = client
    return () => client.deactivate()
  }, [roomCode, playerId])

  const sendPing = useCallback(() => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: `/app/lobby/${roomCode}/ping`,
        body: JSON.stringify({ playerId }),
      })
    }
  }, [roomCode, playerId])

  return { players, spectatorCount, connected, gameEvent, sendPing }
}
