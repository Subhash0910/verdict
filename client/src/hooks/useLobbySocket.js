import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

/**
 * Connects to the VERDICT WebSocket and subscribes to a room lobby.
 * Returns: { players, connected, sendPing }
 */
export default function useLobbySocket(roomCode, playerId) {
  const clientRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [players, setPlayers] = useState([])

  useEffect(() => {
    if (!roomCode || !playerId) return

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        client.subscribe(`/topic/lobby/${roomCode}`, (msg) => {
          const data = JSON.parse(msg.body)
          if (data.players) setPlayers(data.players)
        })
        // Send initial ping so server knows we're here
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

  const sendPing = () => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: `/app/lobby/${roomCode}/ping`,
        body: JSON.stringify({ playerId }),
      })
    }
  }

  return { players, connected, sendPing }
}
