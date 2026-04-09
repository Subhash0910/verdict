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
import SpectatorBanner from '../components/SpectatorBanner'
import styles from './GameScreen.module.css'

export default function GameScreen({ roomCode: rc, playerId: pid, playerName: pn, roomData, playerData, initialTheme, isSpectator, onExit, onPlayAgain }) {
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
  const [gameStats, setGameStats]           = useState(null)
  const [timer, setTimer]                   = useState(0)
  const [messages, setMessages]             = useState([])
  const [worldEvent, setWorldEvent]         = useState(null)
  const [isEliminated, setIsEliminated]     = useState(false)
  const [nominatedPlayer, setNominatedPlayer] = useState(null)
  const [trustScores, setTrustScores]       = useState({})
  const [confessionRequest, setConfessionRequest] = useState(null)
  const [evidenceEvents, setEvidenceEvents] = useState([])
  const [resetting, setResetting]           = useState(false)
  const [spectatorCount, setSpectatorCount] = useState(1)

  useGameTheme(theme)

  useEffect(() => {
    fetch(`/api/game/${roomCode}/state`)
      .then(r => r.json())
      .then(state => {
        if (!state) { setPhase(isSpectator ? 'SPECTATOR_WAITING' : 'ROLE_REVEAL'); return }
        if (state.theme) setTheme(state.theme)
        if (!isSpectator) {
          const myRoleData = state.roles?.[playerName]
          if (myRoleData) setMyRole({ ...myRoleData, playerName })
        }
        if (state.allPlayers) {
          setPlayers(state.allPlayers.map(name => ({
            playerId: name, playerName: name,
            isAlive: state.alivePlayers?.includes(name) ?? true
          })))
        }
        if (state.trustScores) setTrustScores(state.trustScores)
        if (isSpectator) {
          const p = state.phase
          if (p === 'DISCUSSION') { setPhase('DISCUSSION'); startTimer(90) }
          else if (p === 'ABILITY') { setPhase('SPECTATOR_ABILITY_WATCH'); startTimer(60) }
          else if (p === 'VOTING')  { setPhase('VOTING') }
          else if (p === 'GAME_OVER') { setPhase('GAME_OVER') }
          else setPhase('SPECTATOR_WAITING')
        } else {
          const myRoleData = state.roles?.[playerName]
          if (state.phase === 'DISCUSSION') { setPhase('DISCUSSION'); startTimer(90) }
          else if (state.phase === 'ABILITY') { setPhase('ABILITY'); startTimer(60) }
          else setPhase(myRoleData ? 'ROLE_REVEAL' : 'AWAITING_ROLE')
        }
      })
      .catch(() => setPhase(isSpectator ? 'SPECTATOR_WAITING' : 'AWAITING_ROLE'))
  }, [])

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 3000,
      onConnect: () => {
        // Main game topic
        client.subscribe(`/topic/game/${roomCode}`, msg => handleGameEvent(JSON.parse(msg.body)))

        // Lobby topic — needed for GAME_RESET (spectators + players both need this)
        client.subscribe(`/topic/lobby/${roomCode}`, msg => {
          const d = JSON.parse(msg.body)
          if (d.type === 'GAME_RESET') {
            // Host pressed Play Again — navigate everyone back to lobby
            clearInterval(timerRef.current)
            const handler = onPlayAgain || onExit
            handler?.()
          }
          if (d.type === 'SPECTATOR_JOINED') {
            setSpectatorCount(d.spectatorCount || 1)
          }
        })

        // Role reveal (players only)
        if (!isSpectator) {
          client.subscribe(`/topic/game/${roomCode}/role/${playerName}`, msg => {
            const d = JSON.parse(msg.body)
            if (d.type === 'ROLE_REVEAL') {
              setMyRole({ roleName: d.roleName, alignment: d.alignment, flavorText: d.flavorText, winCondition: d.winCondition, ability: d.ability, restriction: d.restriction, playerName })
              setPhase('ROLE_REVEAL')
            }
          })

          client.subscribe(`/topic/game/${roomCode}/confess/${playerName}`, msg => {
            const d = JSON.parse(msg.body)
            setConfessionRequest({ from: d.from, question: d.question })
          })
        }

        // Chat — everyone sees messages
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
      }
    })
    client.activate()
    clientRef.current = client
    return () => { client.deactivate(); clearInterval(timerRef.current) }
  }, [roomCode, playerName, isSpectator])

  function handleGameEvent(data) {
    switch (data.type) {
      case 'ABILITY_PHASE_START':
        setPhase(isSpectator ? 'SPECTATOR_ABILITY_WATCH' : 'ABILITY')
        startTimer(data.durationSeconds || 60); break
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
        if (!isSpectator && data.eliminatedId === playerName) setIsEliminated(true)
        setElimination(data)
        setPlayers(prev => prev.map(p =>
          p.playerName === data.eliminatedId ? { ...p, isAlive: false } : p
        ))
        setPhase(data.gameOver ? 'GAME_OVER_PENDING' : 'ELIMINATION')
        if (data.gameOver) setGameResult({ winner: data.winner })
        break
      case 'CASE_FILE':
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
    if (isSpectator || targetName === playerName) return
    fetch(`/api/game/${roomCode}/accuse`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accuserName: playerName, targetName })
    })
  }

  function handleDemandConfession(targetName, question) {
    if (isSpectator) return
    fetch(`/api/game/${roomCode}/confess/demand`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: playerName, to: targetName, question })
    })
  }

  function handleAnswerConfession(answer) {
    if (isSpectator) return
    fetch(`/api/game/${roomCode}/confess/answer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, answer, question: confessionRequest?.question, from: confessionRequest?.from })
    })
    setConfessionRequest(null)
  }

  function sendChat(text) {
    if (isSpectator) return
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
    if (isSpectator || targetId === playerName) return
    fetch(`/api/game/${roomCode}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId: playerName, targetId })
    })
  }

  async function handlePlayAgain() {
    if (resetting) return
    setResetting(true)
    try {
      await fetch(`/api/game/${roomCode}/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      })
      // GAME_RESET broadcast handles navigation for everyone else
    } catch (e) {
      console.warn('Reset failed', e)
    }
    const handler = onPlayAgain || onExit
    handler?.()
  }

  if (phase === 'SPECTATOR_WAITING') return (
    <div className={styles.screen}>
      <SpectatorBanner spectatorCount={spectatorCount} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ color: '#333', letterSpacing: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
          Waiting for game to start...
        </div>
        <div style={{ color: '#1a1a2e', fontSize: '10px', letterSpacing: '2px' }}>You are in spectator mode</div>
      </div>
    </div>
  )

  if (phase === 'SPECTATOR_ABILITY_WATCH') return (
    <div className={styles.screen}>
      <SpectatorBanner spectatorCount={spectatorCount} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '60px' }}>
        <div style={{ color: '#2a2a3e', letterSpacing: '5px', fontSize: '10px', textTransform: 'uppercase' }}>\u26A1 Ability Phase</div>
        <div style={{ color: '#1a1a2e', letterSpacing: '3px', fontSize: '9px' }}>Players are using their abilities...</div>
        <div style={{ color: '#7b2d8b', fontSize: '28px', fontWeight: 900, letterSpacing: '3px' }}>{timer > 0 ? timer : ''}</div>
      </div>
    </div>
  )

  if (phase === 'LOADING') return (
    <div className={styles.screen}>
      <div style={{ color: '#333', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )

  return (
    <div className={styles.screen}>
      {isSpectator && <SpectatorBanner spectatorCount={spectatorCount} />}
      {worldEvent && <WorldEvent event={worldEvent} onDismiss={() => setWorldEvent(null)} />}

      {!isSpectator && (phase === 'ROLE_REVEAL' || phase === 'AWAITING_ROLE') && (
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

      {!isSpectator && phase === 'ABILITY' && (
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
          myRole={isSpectator ? { roleName: 'Observer', alignment: 'spectator', playerName } : { ...myRole, playerName }}
          players={players}
          messages={messages}
          timer={timer}
          isEliminated={isSpectator ? true : isEliminated}
          readOnly={isSpectator}
          trustScores={trustScores}
          evidenceEvents={evidenceEvents}
          onSendChat={isSpectator ? () => {} : sendChat}
          onAccuse={isSpectator ? () => {} : handleAccuse}
          onDemandConfession={isSpectator ? () => {} : handleDemandConfession}
          confessionRequest={isSpectator ? null : confessionRequest}
          onAnswerConfession={isSpectator ? () => {} : handleAnswerConfession}
        />
      )}

      {phase === 'VOTING' && !isSpectator && (
        <VotingPhase
          players={players.filter(p => p.isAlive !== false && p.playerName !== playerName)}
          votes={votes}
          myPlayerId={playerName}
          nominatedPlayer={nominatedPlayer}
          onVote={castVote}
        />
      )}

      {phase === 'VOTING' && isSpectator && (
        <div className={styles.screen} style={{ flexDirection: 'column', gap: '16px' }}>
          <SpectatorBanner spectatorCount={spectatorCount} />
          <div style={{ color: '#2a2a3e', letterSpacing: '5px', fontSize: '10px', textTransform: 'uppercase', marginTop: '60px' }}>
            \uD83D\uDDF3 Voting in progress
          </div>
          {Object.entries(votes).map(([target, count]) => (
            <div key={target} style={{ color: '#333', fontSize: '13px', letterSpacing: '2px' }}>
              {target}: <span style={{ color: '#e63946', fontWeight: 900 }}>{count}</span> vote{count !== 1 ? 's' : ''}
            </div>
          ))}
        </div>
      )}

      {phase === 'ELIMINATION' && elimination && (
        <EliminationScreen
          elimination={elimination}
          onContinue={() => {
            if (isSpectator) setPhase('SPECTATOR_ABILITY_WATCH')
            else { setPhase('ABILITY'); startTimer(60) }
          }}
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
