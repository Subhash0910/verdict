import React, { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import RoleRevealCard from '../components/RoleRevealCard'
import DiscussionPhase from '../components/DiscussionPhase'
import VotingPhase from '../components/VotingPhase'
import EliminationScreen from '../components/EliminationScreen'
import GameOverScreen from '../components/GameOverScreen'
import styles from './GameScreen.module.css'

export default function GameScreen({ roomCode, playerId, playerName, initialTheme, initialSynopsis, onExit }) {
  const clientRef = useRef(null)
  const [phase, setPhase] = useState('LOADING')
  const [theme, setTheme] = useState(initialTheme || '')
  const [myRole, setMyRole] = useState(null)
  const [players, setPlayers] = useState([])
  const [votes, setVotes] = useState({})
  const [elimination, setElimination] = useState(null)
  const [gameResult, setGameResult] = useState(null)
  const [timer, setTimer] = useState(0)
  const [messages, setMessages] = useState([])
  const timerRef = useRef(null)

  // On mount: fetch current game state from API to recover role if WS message was missed
  useEffect(() => {
    fetch(`/api/game/${roomCode}/state`)
      .then(r => r.json())
      .then(state => {
        if (!state) return
        if (state.theme) setTheme(state.theme)
        // Find my role from state
        const myRoleData = state.roles?.[playerName]
        if (myRoleData) {
          setMyRole({
            role: myRoleData.role,
            alignment: myRoleData.alignment,
            secretMission: myRoleData.secretMission,
          })
        }
        // Set phase based on current game phase
        if (state.phase === 'ROLE_REVEAL') {
          setPhase(myRoleData ? 'ROLE_REVEAL' : 'AWAITING_ROLE')
        } else if (state.phase === 'DISCUSSION') {
          setPhase('DISCUSSION')
          // Remaining timer unknown on refresh — start at 3 mins
          startTimer(180)
        } else {
          setPhase('ROLE_REVEAL')
        }
      })
      .catch(() => setPhase('ROLE_REVEAL')) // fallback
  }, [])

  // WebSocket setup
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/game/${roomCode}`, (msg) => {
          handleGameEvent(JSON.parse(msg.body))
        })
        client.subscribe(`/topic/game/${roomCode}/role/${playerName}`, (msg) => {
          const data = JSON.parse(msg.body)
          if (data.type === 'ROLE_REVEAL') {
            setMyRole({ role: data.role, alignment: data.alignment, secretMission: data.secretMission })
            setPhase('ROLE_REVEAL')
          }
        })
        client.subscribe(`/topic/game/${roomCode}/chat`, (msg) => {
          setMessages(prev => [...prev, JSON.parse(msg.body)])
        })
      },
    })
    client.activate()
    clientRef.current = client
    return () => { client.deactivate(); clearInterval(timerRef.current) }
  }, [roomCode, playerName])

  function handleGameEvent(data) {
    switch (data.type) {
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
        if (data.gameOver) setGameResult({ winner: data.winner })
        break
      default: break
    }
  }

  function startTimer(seconds) {
    setTimer(seconds)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current); setPhase('VOTING'); return 0 }
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

  if (phase === 'LOADING') {
    return (
      <div className={styles.screen}>
        <div style={{ color: '#555', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase' }}>
          Loading game...
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      {(phase === 'ROLE_REVEAL' || phase === 'AWAITING_ROLE') && (
        myRole
          ? <RoleRevealCard
              role={myRole.role}
              alignment={myRole.alignment}
              secretMission={myRole.secretMission}
              onReady={() => setPhase('AWAITING_DISCUSSION')}
            />
          : <div className={styles.screen}>
              <div style={{ color: '#555', letterSpacing: '3px', fontSize: '13px' }}>
                ⏳ Waiting for your role...
              </div>
            </div>
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
