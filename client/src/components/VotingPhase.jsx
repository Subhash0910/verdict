import React, { useState } from 'react'
import styles from './VotingPhase.module.css'

export default function VotingPhase({ players, votes, myPlayerId, onVote }) {
  const [voted, setVoted] = useState(false)
  const [selected, setSelected] = useState(null)

  function confirmVote(id) {
    if (voted) return
    setSelected(id)
    setVoted(true)
    onVote(id)
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>CAST YOUR VOTE</div>
      <div className={styles.subtitle}>Who do you think is the traitor?</div>

      <div className={styles.grid}>
        {players
          .filter(p => p.playerId !== myPlayerId)
          .map(p => (
            <button
              key={p.playerId}
              className={`${styles.voteCard} ${selected === p.playerId ? styles.selected : ''} ${voted && selected !== p.playerId ? styles.dimmed : ''}`}
              onClick={() => confirmVote(p.playerId)}
              disabled={voted}
            >
              <div className={styles.avatar}>{p.playerName?.[0]?.toUpperCase()}</div>
              <div className={styles.name}>{p.playerName}</div>
              {votes[p.playerId] > 0 && (
                <div className={styles.voteCount}>{votes[p.playerId]} vote{votes[p.playerId] > 1 ? 's' : ''}</div>
              )}
            </button>
          ))}
      </div>

      {voted && (
        <div className={styles.votedMsg}>Vote cast — waiting for others...</div>
      )}
    </div>
  )
}
