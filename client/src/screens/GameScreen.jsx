import React, { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import RoleRevealCard from '../components/RoleRevealCard'
import DiscussionPhase from '../components/DiscussionPhase'
import VotingPhase from '../components/VotingPhase'
import EliminationScreen from '../components/EliminationScreen'
import GameOverScreen from '../components/GameOverScreen'
import styles from './GameScreen.module.css'

/**
 * Master game screen — orchestrates all phases via WebSocket events.
 * Phases: ROLE_REVEAL → DISCUSSION → VOTING → ELIMINATION → (repeat or GAME_OVER)
 */
export default function GameScreen({ roomCode, playerId, playerName, onExit }) {
  const clientRef = useRef(null)
  const [phase, setPhase] = useState('WAITING') // WAITING | ROLE_REVEAL | DISCUSSION | VOTING | ELIMINATION | GAME_OVER
  const [theme, setTheme] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [myRole, setMyRole] = useState(null)     // { role, alignment, secretMission }
  const [players, setPlayers] = useState([])
  const [votes, setVotes] = useState({})
  const [elimination, setElimination] = useState(null)
  const [gameResult, setGameResult] = useState(null)
  const [timer, setTimer] = useState(0)
  const [messages, setMessages] = useState([])
  const timerRef = useRef(null)

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 3000,
      onConnect: () => {
        // Main game channel
        client.subscribe(`/topic/game/${roomCode}`, (msg) => {
          const data = JSON.parse(msg.body)
          handleGameEvent(data)
        })
        // Private role channel
        client.subscribe(`/topic/game/${roomCode}/role/${playerName}`, (msg) => {
          const data = JSON.parse(msg.body)
          if (data.type === 'ROLE_REVEAL') {
            setMyRole({ role: data.role, alignment: data.alignment, secretMission: data.secretMission })
            setPhase('ROLE_REVEAL')
          }
        })
        // Chat channel
        client.subscribe(`/topic/game/${roomCode}/chat`, (msg) => {
          const data = JSON.parse(msg.body)
          setMessages(prev => [...prev, data])
        })
      },
    })
    client.activate()
    clientRef.current = client
    return () => {
      client.deactivate()
      clearInterval(timerRef.current)
    }
  }, [roomCode, playerName])

  function handleGameEvent(data) {
    switch (data.type) {
      case 'GAME_STARTING':
        setTheme(data.theme)
        setSynopsis(data.synopsis)
        setPhase('CINEMATIC')
        break
      case 'DISCUSSION_START':
        setPhase('DISCUSSION')
        startTimer(data.durationSeconds)
        break
      case 'VOTING_START':
        setPhase('VOTING')
        setVotes({})
        break
      case 'VOTE_UPDATE':
        setVotes(data.votes)
        break
      case 'ELIMINATION':
        clearInterval(timerRef.current)
        setElimination(data)
        setPhase(data.gameOver ? 'GAME_OVER' : 'ELIMINATION')
        if (data.gameOver) setGameResult({ winner: data.winner, eliminatedRole: data.eliminatedRole })
        break
      default:
        break
    }
  }

  function startTimer(seconds) {
    setTimer(seconds)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setPhase('VOTING')
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  function sendChat(text) {
    clientRef.current?.publish({
      destination: `/app/game/${roomCode}/chat`,
      body: JSON.stringify({ playerName, text, timestamp: Date.now() }),
    })
  }

  function castVote(targetId) {
    fetch(`/api/game/${roomCode}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId: playerId, targetId }),
    })
  }

  return (
    <div className={styles.screen}>
      {phase === 'CINEMATIC' && (
        <div className={styles.cinematic}>
          <div className={styles.cinematicLabel}>🤖 AI GAME MASTER</div>
          <h1 className={styles.cinematicTheme}>{theme}</h1>
          <p className={styles.cinematicSynopsis}>{synopsis}</p>
          <p className={styles.hint}>Preparing your role...</p>
        </div>
      )}

      {phase === 'ROLE_REVEAL' && myRole && (
        <RoleRevealCard
          role={myRole.role}
          alignment={myRole.alignment}
          secretMission={myRole.secretMission}
          onReady={() => setPhase('AWAITING_DISCUSSION')}
        />
      )}

      {(phase === 'AWAITING_DISCUSSION' || phase === 'DISCUSSION') && (
        <DiscussionPhase
          theme={theme}
          myRole={myRole}
          players={players}
          messages={messages}
          timer={timer}
          onSendChat={sendChat}
        />
      )}

      {phase === 'VOTING' && (
        <VotingPhase
          players={players}
          votes={votes}
          myPlayerId={playerId}
          onVote={castVote}
        />
      )}

      {phase === 'ELIMINATION' && elimination && (
        <EliminationScreen
          elimination={elimination}
          onContinue={() => setPhase('DISCUSSION')}
        />
      )}

      {phase === 'GAME_OVER' && (
        <GameOverScreen
          result={gameResult}
          myRole={myRole}
          onPlayAgain={onExit}
        />
      )}
    </div>
  )
}
