import React, { useState, useEffect, useRef } from 'react'
import styles from './VotingPhase.module.css'
import { useSound } from '../hooks/useSound'

export default function VotingPhase({ players, votes, myPlayerId, nominatedPlayer, onVote }) {
  const [voted, setVoted] = useState(false)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState([])
  const [showResult, setShowResult] = useState(false)
  const sound = useSound()
  const allVoted = Object.keys(votes).length >= players.length

  // When all voted — flip cards one by one
  useEffect(() => {
    if (!allVoted || revealed.length > 0) return
    players.forEach((p, i) => {
      setTimeout(() => {
        sound.playVoteFlip()
        setRevealed(prev => [...prev, p.playerName || p.playerId])
      }, i * 350)
    })
    setTimeout(() => setShowResult(true), players.length * 350 + 400)
  }, [allVoted])

  function confirmVote(id) {
    if (voted) return
    setSelected(id)
    setVoted(true)
    sound.playGavel()
    onVote(id)
  }

  const totalVotes = Object.values(votes).reduce((a, b) => Number(a) + Number(b), 0)

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
      </div>

      {/* Vote bars — fill in real time */}
      {Object.keys(votes).length > 0 && (
        <div className={styles.liveBars}>
          {players.map(p => {
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

      {/* Vote cards */}
      {!allVoted && (
        <div className={styles.grid}>
          {players
            .filter(p => (p.playerName || p.playerId) !== myPlayerId)
            .map(p => {
              const id = p.playerName || p.playerId
              return (
                <button
                  key={id}
                  className={`${styles.voteCard} ${selected === id ? styles.selected : ''} ${voted && selected !== id ? styles.dimmed : ''}`}
                  onClick={() => confirmVote(id)}
                  disabled={voted}
                >
                  <div className={styles.avatar}>{id[0]?.toUpperCase()}</div>
                  <div className={styles.name}>{id}</div>
                </button>
              )
            })}
        </div>
      )}

      {/* Flip reveal */}
      {allVoted && (
        <div className={styles.flipGrid}>
          {players.map((p, i) => {
            const id = p.playerName || p.playerId
            const isRevealed = revealed.includes(id)
            const voteCount = Number(votes[id] || 0)
            return (
              <div key={id}
                className={`${styles.flipCard} ${isRevealed ? styles.flipped : ''}`}
              >
                <div className={styles.flipFront}>
                  <span className={styles.flipQ}>?</span>
                </div>
                <div className={styles.flipBack}>
                  <div className={styles.flipName}>{id}</div>
                  <div className={styles.flipVotes}>{voteCount} vote{voteCount !== 1 ? 's' : ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {voted && !allVoted && (
        <div className={styles.waitMsg}>
          <span className={styles.heartbeat}>♥</span>
          Vote cast — waiting for others...
        </div>
      )}

      {showResult && (
        <div className={styles.resultMsg}>
          Votes counted — verdict incoming...
        </div>
      )}
    </div>
  )
}
