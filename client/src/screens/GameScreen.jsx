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

const PHASE_DURATIONS = {
  OPERATION: 40,
  DISCUSSION: 70,
  VOTING: 25,
}

export default function GameScreen({
  roomCode: rc,
  playerId: pid,
  playerName: pn,
  roomData,
  playerData,
  initialTheme,
  isSpectator,
  onExit,
  onPlayAgain,
}) {
  const roomCode = rc || roomData?.roomCode
  const playerId = pid || playerData?.playerId
  const playerName = pn || playerData?.playerName

  const clientRef = useRef(null)
  const timerRef = useRef(null)
  const timeoutSentRef = useRef(new Set())

  const [phase, setPhase] = useState('LOADING')
  const [theme, setTheme] = useState(initialTheme || '')
  const [themePresetId, setThemePresetId] = useState('')
  const [myRole, setMyRole] = useState(null)
  const [players, setPlayers] = useState([])
  const [votes, setVotes] = useState({})
  const [elimination, setElimination] = useState(null)
  const [gameResult, setGameResult] = useState(null)
  const [caseFile, setCaseFile] = useState('')
  const [gameStats, setGameStats] = useState(null)
  const [timer, setTimer] = useState(0)
  const [messages, setMessages] = useState([])
  const [worldEvent, setWorldEvent] = useState(null)
  const [isEliminated, setIsEliminated] = useState(false)
  const [nominatedPlayer, setNominatedPlayer] = useState(null)
  const [trustScores, setTrustScores] = useState({})
  const [confessionRequest, setConfessionRequest] = useState(null)
  const [evidenceEvents, setEvidenceEvents] = useState([])
  const [resetting, setResetting] = useState(false)
  const [spectatorCount, setSpectatorCount] = useState(1)
  const [operation, setOperation] = useState(null)
  const [roundInfo, setRoundInfo] = useState({ round: 1, maxRounds: 3 })

  useGameTheme(theme, themePresetId)

  useEffect(() => {
    fetch(`/api/game/${roomCode}/state`)
      .then((response) => response.json())
      .then((state) => {
        if (!state) {
          setPhase(isSpectator ? 'SPECTATOR_WAITING' : 'ROLE_REVEAL')
          return
        }

        if (state.theme) setTheme(state.theme)
        if (state.themePresetId) setThemePresetId(state.themePresetId)
        if (state.currentOperation) setOperation(state.currentOperation)
        setRoundInfo({
          round: state.round || 1,
          maxRounds: state.maxRounds || 3,
        })

        if (!isSpectator) {
          const myRoleData = state.roles?.[playerName]
          if (myRoleData) setMyRole({ ...myRoleData, playerName })
        }

        if (state.allPlayers) {
          setPlayers(state.allPlayers.map((name) => ({
            playerId: name,
            playerName: name,
            isAlive: state.alivePlayers?.includes(name) ?? true,
          })))
        }
        if (state.trustScores) setTrustScores(state.trustScores)
        if (state.nominatedPlayer) setNominatedPlayer(state.nominatedPlayer)
        if (state.trialVotes) {
          const condemnVotes = Object.values(state.trialVotes).filter((choice) => choice === 'CONDEMN').length
          const spareVotes = Object.values(state.trialVotes).filter((choice) => choice === 'SPARE').length
          setVotes({ CONDEMN: condemnVotes, SPARE: spareVotes })
        }

        const restoredPhase = state.phase
        if (restoredPhase === 'DISCUSSION') {
          setPhase('DISCUSSION')
          startTimer(PHASE_DURATIONS.DISCUSSION)
        } else if (restoredPhase === 'OPERATION') {
          setPhase(isSpectator ? 'SPECTATOR_OPERATION_WATCH' : 'OPERATION')
          startTimer(PHASE_DURATIONS.OPERATION)
        } else if (restoredPhase === 'TRIBUNAL') {
          setPhase('VOTING')
          startTimer(PHASE_DURATIONS.VOTING)
        } else if (restoredPhase === 'GAME_OVER') {
          setPhase('GAME_OVER')
        } else {
          setPhase(isSpectator ? 'SPECTATOR_WAITING' : 'ROLE_REVEAL')
        }
      })
      .catch(() => setPhase(isSpectator ? 'SPECTATOR_WAITING' : 'AWAITING_ROLE'))
  }, [isSpectator, playerName, roomCode])

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/game/${roomCode}`, (message) => handleGameEvent(JSON.parse(message.body)))

        client.subscribe(`/topic/lobby/${roomCode}`, (message) => {
          const data = JSON.parse(message.body)
          if (data.type === 'GAME_RESET') {
            clearInterval(timerRef.current)
            const handler = onPlayAgain || onExit
            handler?.()
          }
          if (data.type === 'SPECTATOR_JOINED') {
            setSpectatorCount(data.spectatorCount || 1)
          }
        })

        if (!isSpectator) {
          client.subscribe(`/topic/game/${roomCode}/role/${playerName}`, (message) => {
            const data = JSON.parse(message.body)
            if (data.type === 'ROLE_REVEAL') {
              setMyRole({
                roleName: data.roleName,
                roleChassisId: data.roleChassisId,
                alignment: data.alignment,
                factionLabel: data.factionLabel,
                flavorText: data.flavorText,
                winCondition: data.winCondition,
                ability: data.ability,
                restriction: data.restriction,
                playerName,
              })
              setPhase('ROLE_REVEAL')
            }
          })

          client.subscribe(`/topic/game/${roomCode}/confess/${playerName}`, (message) => {
            const data = JSON.parse(message.body)
            setConfessionRequest({ from: data.from, question: data.question })
          })
        }

        client.subscribe(`/topic/game/${roomCode}/chat`, (message) => {
          const payload = JSON.parse(message.body)
          setMessages((prev) => [...prev, payload])
          if (payload.isConfession || payload.isSystem || payload.isObserver) {
            setEvidenceEvents((prev) => [...prev, {
              type: payload.isConfession ? 'confession' : payload.isObserver ? 'observer' : 'system',
              text: payload.text,
              player: payload.playerName,
              ts: Date.now(),
            }])
          }
          if (payload.trustDelta && payload.targetPlayer) {
            setTrustScores((prev) => ({
              ...prev,
              [payload.targetPlayer]: Math.max(0, Math.min(100, (prev[payload.targetPlayer] ?? 50) + payload.trustDelta)),
            }))
          }
        })
      },
    })

    client.activate()
    clientRef.current = client
    return () => {
      client.deactivate()
      clearInterval(timerRef.current)
    }
  }, [isSpectator, onExit, onPlayAgain, playerName, roomCode])

  useEffect(() => {
    if (timer > 0 || isSpectator) return

    const timeoutKey = `${phase}-${roundInfo.round}`
    if (timeoutSentRef.current.has(timeoutKey)) return

    let endpoint = ''
    if (phase === 'OPERATION') endpoint = 'operation/timeout'
    if (phase === 'DISCUSSION') endpoint = 'discussion/timeout'
    if (phase === 'VOTING') endpoint = 'tribunal/timeout'
    if (!endpoint) return

    timeoutSentRef.current.add(timeoutKey)
    fetch(`/api/game/${roomCode}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch((error) => console.warn('Phase timeout failed', error))
  }, [isSpectator, phase, roomCode, roundInfo.round, timer])

  function handleGameEvent(data) {
    switch (data.type) {
      case 'ROUND_START':
        setRoundInfo({
          round: data.round || 1,
          maxRounds: data.maxRounds || 3,
        })
        if (data.themeTitle) setTheme(data.themeTitle)
        if (data.themePresetId) setThemePresetId(data.themePresetId)
        break
      case 'OPERATION_START':
        setRoundInfo({
          round: data.round || roundInfo.round,
          maxRounds: data.maxRounds || roundInfo.maxRounds,
        })
        setOperation(data.operation || null)
        setVotes({})
        setNominatedPlayer(null)
        setPhase(isSpectator ? 'SPECTATOR_OPERATION_WATCH' : 'OPERATION')
        startTimer(data.durationSeconds || PHASE_DURATIONS.OPERATION)
        break
      case 'DISCUSSION_START':
        setOperation(data.operation || operation)
        setRoundInfo({
          round: data.round || roundInfo.round,
          maxRounds: data.maxRounds || roundInfo.maxRounds,
        })
        setPhase('DISCUSSION')
        startTimer(data.durationSeconds || PHASE_DURATIONS.DISCUSSION)
        break
      case 'TRIBUNAL_START':
        setNominatedPlayer(data.accusedPlayer || null)
        setVotes({ CONDEMN: 0, SPARE: 0 })
        setPhase('VOTING')
        startTimer(data.durationSeconds || PHASE_DURATIONS.VOTING)
        break
      case 'TRIBUNAL_UPDATE':
        setVotes(data.tallies || {})
        break
      case 'TRUST_UPDATE':
        setTrustScores(data.scores || {})
        break
      case 'TRIBUNAL_RESULT':
      case 'ELIMINATION':
        clearInterval(timerRef.current)
        if (!isSpectator && data.eliminatedId === playerName) {
          setIsEliminated(true)
        }
        if (data.eliminatedId) {
          setPlayers((prev) => prev.map((player) => (
            player.playerName === data.eliminatedId ? { ...player, isAlive: false } : player
          )))
        }
        setElimination(data)
        setPhase(data.gameOver ? 'GAME_OVER_PENDING' : 'ELIMINATION')
        if (data.gameOver) setGameResult({ winner: data.winner })
        break
      case 'CASE_FILE':
        setCaseFile(data.text || '')
        if (data.stats) setGameStats(data.stats)
        setPhase('GAME_OVER')
        break
      case 'WORLD_EVENT':
        setWorldEvent({ title: data.title, description: data.description, effect: data.effect })
        break
      default:
        break
    }
  }

  function startTimer(seconds) {
    setTimer(seconds)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer((current) => {
        if (current <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return current - 1
      })
    }, 1000)
  }

  function handleUseAbility(targetName) {
    fetch(`/api/game/${roomCode}/ability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, targetName, action: 'use' }),
    })
  }

  function handleSkipAbility() {
    fetch(`/api/game/${roomCode}/ability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, action: 'skip' }),
    })
  }

  function handleAccuse(targetName) {
    if (isSpectator || targetName === playerName) return
    fetch(`/api/game/${roomCode}/accuse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accuserName: playerName, targetName }),
    })
  }

  function handleDemandConfession(targetName, question) {
    if (isSpectator) return
    fetch(`/api/game/${roomCode}/confess/demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: playerName, to: targetName, question }),
    })
  }

  function handleAnswerConfession(answer) {
    if (isSpectator) return
    fetch(`/api/game/${roomCode}/confess/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName,
        answer,
        question: confessionRequest?.question,
        from: confessionRequest?.from,
      }),
    })
    setConfessionRequest(null)
  }

  function sendChat(text) {
    if (isSpectator) return
    if (isEliminated) {
      fetch(`/api/game/${roomCode}/spirit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      return
    }
    fetch(`/api/game/${roomCode}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, text }),
    })
  }

  function castVote(choice) {
    if (isSpectator || !choice) return
    fetch(`/api/game/${roomCode}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId: playerName, choice }),
    })
  }

  async function handlePlayAgain() {
    if (resetting) return
    setResetting(true)
    try {
      await fetch(`/api/game/${roomCode}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
    } catch (error) {
      console.warn('Reset failed', error)
    }
    const handler = onPlayAgain || onExit
    handler?.()
  }

  if (phase === 'SPECTATOR_WAITING') {
    return (
      <div className={styles.screen}>
        <SpectatorBanner spectatorCount={spectatorCount} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: '#888', letterSpacing: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
            Waiting for game to start...
          </div>
          <div style={{ color: '#666', fontSize: '10px', letterSpacing: '2px' }}>You are in spectator mode</div>
        </div>
      </div>
    )
  }

  if (phase === 'SPECTATOR_OPERATION_WATCH') {
    return (
      <div className={styles.screen}>
        <SpectatorBanner spectatorCount={spectatorCount} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginTop: '60px' }}>
          <div style={{ color: '#888', letterSpacing: '5px', fontSize: '10px', textTransform: 'uppercase' }}>
            Operation Phase
          </div>
          <div style={{ color: '#ddd', fontSize: '24px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            {operation?.title || 'Operation live'}
          </div>
          <div style={{ color: '#777', maxWidth: '420px', textAlign: 'center', lineHeight: 1.6 }}>
            {operation?.briefing || 'The room is making its first dangerous move.'}
          </div>
          <div style={{ color: '#7b2d8b', fontSize: '28px', fontWeight: 900, letterSpacing: '3px' }}>
            {timer > 0 ? timer : ''}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'LOADING') {
    return (
      <div className={styles.screen}>
        <div style={{ color: '#888', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      {isSpectator && <SpectatorBanner spectatorCount={spectatorCount} />}
      {worldEvent && <WorldEvent event={worldEvent} onDismiss={() => setWorldEvent(null)} />}

      {!isSpectator && (phase === 'ROLE_REVEAL' || phase === 'AWAITING_ROLE') && (
        myRole ? (
          <RoleRevealCard
            roleName={myRole.roleName}
            alignment={myRole.alignment}
            factionLabel={myRole.factionLabel}
            flavorText={myRole.flavorText}
            winCondition={myRole.winCondition}
            ability={myRole.ability}
            restriction={myRole.restriction}
            onReady={() => setPhase('AWAITING_OPERATION')}
          />
        ) : (
          <div className={styles.screen}>
            <div style={{ color: '#888', letterSpacing: '3px', fontSize: '13px' }}>Waiting for your role...</div>
          </div>
        )
      )}

      {!isSpectator && phase === 'AWAITING_OPERATION' && (
        <div className={styles.screen}>
          <div style={{ color: '#888', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase' }}>Waiting for the operation to begin...</div>
        </div>
      )}

      {!isSpectator && phase === 'OPERATION' && (
        <AbilityPhase
          myRole={{ ...myRole, playerName }}
          players={players.filter((player) => player.isAlive !== false)}
          timer={timer}
          operation={operation}
          round={roundInfo.round}
          maxRounds={roundInfo.maxRounds}
          onUse={handleUseAbility}
          onSkip={handleSkipAbility}
        />
      )}

      {phase === 'DISCUSSION' && (
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
          currentOperation={operation}
          roundInfo={roundInfo}
          onSendChat={isSpectator ? () => {} : sendChat}
          onAccuse={isSpectator ? () => {} : handleAccuse}
          onDemandConfession={isSpectator ? () => {} : handleDemandConfession}
          confessionRequest={isSpectator ? null : confessionRequest}
          onAnswerConfession={isSpectator ? () => {} : handleAnswerConfession}
        />
      )}

      {phase === 'VOTING' && !isSpectator && (
        <VotingPhase
          votes={votes}
          myPlayerId={playerName}
          nominatedPlayer={nominatedPlayer}
          canVote={nominatedPlayer !== playerName}
          onVote={castVote}
        />
      )}

      {phase === 'VOTING' && isSpectator && (
        <div className={styles.screen} style={{ flexDirection: 'column', gap: '16px' }}>
          <SpectatorBanner spectatorCount={spectatorCount} />
          <div style={{ color: '#888', letterSpacing: '5px', fontSize: '10px', textTransform: 'uppercase', marginTop: '60px' }}>
            Tribunal in progress
          </div>
          <div style={{ color: '#ddd', fontSize: '30px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
            {nominatedPlayer}
          </div>
          <div style={{ color: '#aaa', fontSize: '13px', letterSpacing: '2px' }}>
            Condemn: <span style={{ color: '#e63946', fontWeight: 900 }}>{votes.CONDEMN || 0}</span>
          </div>
          <div style={{ color: '#aaa', fontSize: '13px', letterSpacing: '2px' }}>
            Spare: <span style={{ color: '#00b4d8', fontWeight: 900 }}>{votes.SPARE || 0}</span>
          </div>
        </div>
      )}

      {phase === 'ELIMINATION' && elimination && (
        <EliminationScreen
          elimination={elimination}
          onContinue={() => {
            if (isSpectator) {
              setPhase('SPECTATOR_OPERATION_WATCH')
            } else {
              setPhase('OPERATION')
            }
          }}
        />
      )}

      {(phase === 'GAME_OVER' || phase === 'GAME_OVER_PENDING') && (
        <GameOverScreen
          result={gameResult}
          myRole={myRole}
          caseFile={caseFile}
          theme={theme}
          themePresetId={themePresetId}
          roomCode={roomCode}
          stats={gameStats}
          myPlayerName={playerName}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {resetting && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          color: '#888',
          letterSpacing: '5px',
          fontSize: '12px',
          textTransform: 'uppercase',
        }}>
          Resetting...
        </div>
      )}
    </div>
  )
}
