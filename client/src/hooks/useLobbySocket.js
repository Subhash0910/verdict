import { useEffect, useRef, useState, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

/**
 * Phase 2 — Enhanced lobby socket hook.
 * Handles: PLAYER_JOINED, PLAYER_LEFT, GAME_STARTING events.
 * Returns: { players, connected, gameEvent, sendPing }
 */
export default function useLobbySocket(roomCode, playerId) {
  const clientRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [players, setPlayers] = useState([])
  const [gameEvent, setGameEvent] = useState(null) // { type, theme, synopsis }

  useEffect(() => {
    if (!roomCode || !playerId) return

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        client.subscribe(`/topic/lobby/${roomCode}`, (msg) => {
          const data = JSON.parse(msg.body)

          if (data.players) {
            setPlayers(data.players)
          }

          if (data.type === 'GAME_STARTING') {
            setGameEvent({ type: 'GAME_STARTING', theme: data.theme, synopsis: data.synopsis })
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

  return { players, connected, gameEvent, sendPing }
}
