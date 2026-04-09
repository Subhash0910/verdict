import React, { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useGameTheme } from '../hooks/useGameTheme'
import RoleRevealCard from '../components/RoleRevealCard'
import AbilityPhase from '../components/AbilityPhase'
import DiscussionPhase from '../components/DiscussionPhase'
import VotingPhase from '../components/VotingPhase'
import EliminationScreen from '../components/EliminationScreen'
import GameOverScreen from '../components/GameOverScreen'
import WorldEvent from '../components/WorldEvent'
import styles from './GameScreen.module.css'

/**
 * GameScreen accepts either flat props (roomCode, playerId, playerName)
 * or object props (roomData, playerData) from App.jsx.
 */
export default function GameScreen({ roomCode: rc, playerId: pid, playerName: pn, roomData, playerData, initialTheme, onExit, onPlayAgain }) {
  // Resolve props — accept both flat and object form
  const roomCode   = rc   || roomData?.roomCode
  const playerId   = pid  || playerData?.playerId
  const playerName = pn   || playerData?.playerName

  const clientRef = useRef(null)
  const timerRef  = useRef(null)

  const [phase, setPhase]                   = useState('LOADING')
  const [theme, setTheme]                   = useState(initialTheme || '')
  const [myRole, setMyRole]                 = useState(null)
  const [players, setPlayers]               = useState([])
  const [votes, setVotes]                   = useState({})
  const [elimination, setElimination]       = useState(null)
  const [gameResult, setGameResult]         = useState(null)
  const [caseFile, setCaseFile]             = useState('')
  const [gameStats, setGameStats]           = useState(null)   // ← new: stats from CASE_FILE
  const [timer, setTimer]                   = useState(0)
  const [messages, setMessages]             = useState([])
  const [worldEvent, setWorldEvent]         = useState(null)
  const [isEliminated, setIsEliminated]     = useState(false)
  const [nominatedPlayer, setNominatedPlayer] = useState(null)
  const [trustScores, setTrustScores]       = useState({})
  const [confessionRequest, setConfessionRequest] = useState(null)
  const [evidenceEvents, setEvidenceEvents] = useState([])
  const [resetting, setResetting]           = useState(false)

  useGameTheme(theme)

  useEffect(() => {
    fetch(`/api/game/${roomCode}/state`)
      .then(r => r.json())
      .then(state => {
        if (!state) { setPhase('ROLE_REVEAL'); return }
        if (state.theme) setTheme(state.theme)
        const myRoleData = state.roles?.[playerName]
        if (myRoleData) setMyRole({ ...myRoleData, playerName })
        if (state.allPlayers) {
          setPlayers(state.allPlayers.map(name => ({
            playerId: name, playerName: name,
            isAlive: state.alivePlayers?.includes(name) ?? true
          })))
        }
        if (state.trustScores) setTrustScores(state.trustScores)
        if (state.phase === 'DISCUSSION') { setPhase('DISCUSSION'); startTimer(90) }
        else if (state.phase === 'ABILITY') { setPhase('ABILITY'); startTimer(60) }
        else setPhase(myRoleData ? 'ROLE_REVEAL' : 'AWAITING_ROLE')
      })
      .catch(() => setPhase('AWAITING_ROLE'))
  }, [])

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/game/${roomCode}`, msg => handleGameEvent(JSON.parse(msg.body)))

        client.subscribe(`/topic/game/${roomCode}/role/${playerName}`, msg => {
          const d = JSON.parse(msg.body)
          if (d.type === 'ROLE_REVEAL') {
            setMyRole({ roleName: d.roleName, alignment: d.alignment, flavorText: d.flavorText, winCondition: d.winCondition, ability: d.ability, restriction: d.restriction, playerName })
            setPhase('ROLE_REVEAL')
          }
        })

        client.subscribe(`/topic/game/${roomCode}/chat`, msg => {
          const m = JSON.parse(msg.body)
          setMessages(prev => [...prev, m])
          if (m.isConfession || m.isSystem || m.isObserver) {
            setEvidenceEvents(prev => [...prev, {
              type: m.isConfession ? 'confession' : m.isObserver ? 'observer' : 'system',
              text: m.text, player: m.playerName, ts: Date.now()
            }])
          }
          if (m.trustDelta && m.targetPlayer) {
            setTrustScores(prev => ({
              ...prev,
              [m.targetPlayer]: Math.max(0, Math.min(100, (prev[m.targetPlayer] ?? 50) + m.trustDelta))
            }))
          }
        })

        client.subscribe(`/topic/game/${roomCode}/confess/${playerName}`, msg => {
          const d = JSON.parse(msg.body)
          setConfessionRequest({ from: d.from, question: d.question })
        })
      }
    })
    client.activate()
    clientRef.current = client
    return () => { client.deactivate(); clearInterval(timerRef.current) }
  }, [roomCode, playerName])

  function handleGameEvent(data) {
    switch (data.type) {
      case 'ABILITY_PHASE_START':
        setPhase('ABILITY'); startTimer(data.durationSeconds || 60); break
      case 'DISCUSSION_START':
        setPhase('DISCUSSION'); startTimer(90)
        if (data.abilityLog?.length > 0) {
          setMessages(prev => [
            ...data.abilityLog.map(t => ({ playerName: '\u26A1 System', text: t, isSystem: true })),
            ...prev
          ])
        }
        break
      case 'WORLD_EVENT':
        setWorldEvent({ title: data.title, description: data.description, effect: data.effect }); break
      case 'VOTING_START':
        setNominatedPlayer(data.nominatedPlayer || null)
        setPhase('VOTING'); setVotes({}); break
      case 'VOTE_UPDATE':
        setVotes(data.votes); break
      case 'TRUST_UPDATE':
        setTrustScores(data.scores); break
      case 'ELIMINATION':
        clearInterval(timerRef.current)
        if (data.eliminatedId === playerName) setIsEliminated(true)
        setElimination(data)
        setPlayers(prev => prev.map(p =>
          p.playerName === data.eliminatedId ? { ...p, isAlive: false } : p
        ))
        setPhase(data.gameOver ? 'GAME_OVER_PENDING' : 'ELIMINATION')
        if (data.gameOver) setGameResult({ winner: data.winner })
        break
      case 'CASE_FILE':
        // Capture stats alongside case file text
        setCaseFile(data.text || '')
        if (data.stats) setGameStats(data.stats)
        setPhase('GAME_OVER')
        break
      default: break
    }
  }

  function startTimer(seconds) {
    setTimer(seconds)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0 } return t - 1 })
    }, 1000)
  }

  function handleUseAbility(targetName) {
    fetch(`/api/game/${roomCode}/ability`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, targetName, action: 'use' })
    })
  }

  function handleSkipAbility() {
    fetch(`/api/game/${roomCode}/ability`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, action: 'skip' })
    })
  }

  function handleAccuse(targetName) {
    if (targetName === playerName) return
    fetch(`/api/game/${roomCode}/accuse`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accuserName: playerName, targetName })
    })
  }

  function handleDemandConfession(targetName, question) {
    fetch(`/api/game/${roomCode}/confess/demand`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: playerName, to: targetName, question })
    })
  }

  function handleAnswerConfession(answer) {
    fetch(`/api/game/${roomCode}/confess/answer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, answer, question: confessionRequest?.question, from: confessionRequest?.from })
    })
    setConfessionRequest(null)
  }

  // Chat now goes through REST so messages are counted for stats
  function sendChat(text) {
    if (isEliminated) {
      fetch(`/api/game/${roomCode}/spirit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })
    } else {
      fetch(`/api/game/${roomCode}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, text })
      })
    }
  }

  function castVote(targetId) {
    if (targetId === playerName) return
    fetch(`/api/game/${roomCode}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId: playerName, targetId })
    })
  }

  // Play Again: call /reset, server broadcasts GAME_RESET to lobby topic,
  // then navigate back to lobby (don't go all the way to HomeScreen)
  async function handlePlayAgain() {
    if (resetting) return
    setResetting(true)
    try {
      await fetch(`/api/game/${roomCode}/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      })
    } catch (e) {
      console.warn('Reset failed, going home anyway', e)
    }
    // onPlayAgain goes back to lobby; onExit goes all the way to HomeScreen
    const handler = onPlayAgain || onExit
    handler?.()
  }

  if (phase === 'LOADING') return (
    <div className={styles.screen}>
      <div style={{ color: '#333', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )

  return (
    <div className={styles.screen}>
      {worldEvent && <WorldEvent event={worldEvent} onDismiss={() => setWorldEvent(null)} />}

      {(phase === 'ROLE_REVEAL' || phase === 'AWAITING_ROLE') && (
        myRole
          ? <RoleRevealCard
              roleName={myRole.roleName}
              alignment={myRole.alignment}
              flavorText={myRole.flavorText}
              winCondition={myRole.winCondition}
              ability={myRole.ability}
              restriction={myRole.restriction}
              onReady={() => setPhase('ABILITY')}
            />
          : <div className={styles.screen}>
              <div style={{ color: '#444', letterSpacing: '3px', fontSize: '13px' }}>\u23F3 Waiting for your role...</div>
            </div>
      )}

      {phase === 'ABILITY' && (
        <AbilityPhase
          myRole={{ ...myRole, playerName }}
          players={players.filter(p => p.isAlive !== false)}
          timer={timer}
          onUse={handleUseAbility}
          onSkip={handleSkipAbility}
        />
      )}

      {(phase === 'DISCUSSION' || phase === 'AWAITING_DISCUSSION') && (
        <DiscussionPhase
          theme={theme}
          myRole={{ ...myRole, playerName }}
          players={players}
          messages={messages}
          timer={timer}
          isEliminated={isEliminated}
          trustScores={trustScores}
          evidenceEvents={evidenceEvents}
          onSendChat={sendChat}
          onAccuse={handleAccuse}
          onDemandConfession={handleDemandConfession}
          confessionRequest={confessionRequest}
          onAnswerConfession={handleAnswerConfession}
        />
      )}

      {phase === 'VOTING' && (
        <VotingPhase
          players={players.filter(p => p.isAlive !== false && p.playerName !== playerName)}
          votes={votes}
          myPlayerId={playerName}
          nominatedPlayer={nominatedPlayer}
          onVote={castVote}
        />
      )}

      {phase === 'ELIMINATION' && elimination && (
        <EliminationScreen
          elimination={elimination}
          onContinue={() => { setPhase('ABILITY'); startTimer(60) }}
        />
      )}

      {(phase === 'GAME_OVER' || phase === 'GAME_OVER_PENDING') && (
        <GameOverScreen
          result={gameResult}
          myRole={myRole}
          caseFile={caseFile}
          theme={theme}
          roomCode={roomCode}
          stats={gameStats}
          myPlayerName={playerName}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Resetting overlay */}
      {resetting && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, color: '#333', letterSpacing: '5px', fontSize: '12px', textTransform: 'uppercase'
        }}>
          Resetting...
        </div>
      )}
    </div>
  )
}
