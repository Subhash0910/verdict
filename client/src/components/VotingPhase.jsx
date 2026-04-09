import React, { useState, useEffect, useRef } from 'react'
import styles from './VotingPhase.module.css'
import { useSound } from '../hooks/useSound'

export default function VotingPhase({ players, votes, myPlayerId, nominatedPlayer, onVote }) {
  const [voted, setVoted] = useState(false)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState([])
  const [showResult, setShowResult] = useState(false)
  const [confirming, setConfirming] = useState(null) // playerName being confirmed
  const sound = useSound()
  const allPlayers = players
  const allVoted = Object.keys(votes).length >= (players.length + 1)

  // Sequential dramatic reveal when all voted
  useEffect(() => {
    if (!allVoted || revealed.length > 0) return
    allPlayers.forEach((p, i) => {
      setTimeout(() => {
        sound.playVoteFlip()
        setRevealed(prev => [...prev, p.playerName || p.playerId])
      }, i * 480) // slightly slower = more dramatic
    })
    setTimeout(() => setShowResult(true), allPlayers.length * 480 + 500)
  }, [allVoted])

  function confirmVote(id) {
    if (voted || id === myPlayerId) return
    setConfirming(id)
  }

  function finalVote() {
    if (!confirming) return
    setSelected(confirming)
    setVoted(true)
    setConfirming(null)
    sound.playGavel()
    onVote(confirming)
  }

  const totalVotes = Object.values(votes).reduce((a, b) => Number(a) + Number(b), 0)

  // Position players in a circle
  const circleRadius = Math.min(160, 30 + allPlayers.length * 16)
  function getCirclePos(index, total, radius) {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>THE TRIBUNAL</div>
        {nominatedPlayer && (
          <div className={styles.nominated}>
            <span className={styles.nominatedLabel}>ACCUSED</span>
            <span className={styles.nominatedName}>{nominatedPlayer}</span>
          </div>
        )}
        <div className={styles.subtitle}>
          {voted ? '✅ Vote cast' : 'Tap a player to cast your verdict'}
        </div>
      </div>

      {/* Confirm vote dialog */}
      {confirming && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmTitle}>🗳️ FINAL VERDICT</div>
            <div className={styles.confirmName}>{confirming}</div>
            <div className={styles.confirmSub}>This cannot be undone.</div>
            <div className={styles.confirmBtns}>
              <button className={styles.confirmYes} onClick={finalVote}>⚔️ Eliminate</button>
              <button className={styles.confirmNo} onClick={() => setConfirming(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Circle layout */}
      {!allVoted && (
        <div className={styles.circleWrap}>
          <div
            className={styles.circle}
            style={{ width: circleRadius * 2 + 80, height: circleRadius * 2 + 80 }}
          >
            {allPlayers.map((p, i) => {
              const id = p.playerName || p.playerId
              const pos = getCirclePos(i, allPlayers.length, circleRadius)
              const isSelected = selected === id
              const hasVotes = Number(votes[id] || 0) > 0
              return (
                <button
                  key={id}
                  className={`${styles.circlePlayer} ${isSelected ? styles.circleSelected : ''} ${hasVotes ? styles.hasVotes : ''}`}
                  style={{
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                    '--accent': isSelected ? '#e63946' : '#7b2d8b'
                  }}
                  onClick={() => !voted && confirmVote(id)}
                  disabled={voted}
                >
                  <div className={styles.circleAvatar}>{id[0]?.toUpperCase()}</div>
                  <div className={styles.circleName}>{id.length > 7 ? id.slice(0, 7) + '…' : id}</div>
                  {hasVotes && (
                    <div className={styles.voteCount}>{votes[id]}</div>
                  )}
                </button>
              )
            })}
            {/* Center label */}
            <div className={styles.circleCenter}>
              {voted ? '✅' : '🗳️'}
            </div>
          </div>
        </div>
      )}

      {/* Live vote bars */}
      {Object.keys(votes).length > 0 && !allVoted && (
        <div className={styles.liveBars}>
          {allPlayers.map(p => {
            const id = p.playerName || p.playerId
            const count = Number(votes[id] || 0)
            const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0
            return (
              <div key={id} className={styles.barRow}>
                <span className={styles.barName}>{id}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${pct}%` }} />
                </div>
                <span className={styles.barCount}>{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Sequential flip reveal when all voted */}
      {allVoted && (
        <div className={styles.flipGrid}>
          {allPlayers.map((p) => {
            const id = p.playerName || p.playerId
            const isRevealed = revealed.includes(id)
            const voteCount = Number(votes[id] || 0)
            const isMax = voteCount === Math.max(...allPlayers.map(pp => Number(votes[pp.playerName || pp.playerId] || 0)))
            return (
              <div key={id} className={`${styles.flipCard} ${isRevealed ? styles.flipped : ''} ${isMax && isRevealed ? styles.flipMax : ''}`}>
                <div className={styles.flipFront}><span className={styles.flipQ}>?</span></div>
                <div className={styles.flipBack}>
                  <div className={styles.flipName}>{id}</div>
                  <div className={`${styles.flipVotes} ${isMax ? styles.flipVotesMax : ''}`}>{voteCount}</div>
                  <div className={styles.flipLabel}>vote{voteCount !== 1 ? 's' : ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {voted && !allVoted && (
        <div className={styles.waitMsg}>
          <span className={styles.heartbeat}>♥</span>
          Waiting for others to vote...
        </div>
      )}
      {showResult && <div className={styles.resultMsg}>🗡️ Verdict incoming...</div>}
    </div>
  )
}
