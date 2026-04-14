import React, { useMemo, useState } from 'react'
import styles from './VotingPhase.module.css'
import { useSound } from '../hooks/useSound'

export default function VotingPhase({ votes, myPlayerId, nominatedPlayer, canVote = true, onVote }) {
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [confirmingChoice, setConfirmingChoice] = useState(null)
  const sound = useSound()

  const condemnVotes = Number(votes?.CONDEMN || 0)
  const spareVotes = Number(votes?.SPARE || 0)
  const totalVotes = condemnVotes + spareVotes
  const verdictLead = condemnVotes === spareVotes ? 'Deadlocked' : condemnVotes > spareVotes ? 'Condemn leading' : 'Spare leading'

  const options = useMemo(() => ([
    {
      key: 'CONDEMN',
      label: 'Condemn',
      description: 'Remove the accused from the room now.',
      count: condemnVotes,
      accentClass: styles.condemn,
    },
    {
      key: 'SPARE',
      label: 'Spare',
      description: 'Keep the accused alive and carry the risk.',
      count: spareVotes,
      accentClass: styles.spare,
    },
  ]), [condemnVotes, spareVotes])

  function selectChoice(choice) {
    if (!canVote || selectedChoice) return
    setConfirmingChoice(choice)
  }

  function confirmChoice() {
    if (!confirmingChoice) return
    setSelectedChoice(confirmingChoice)
    setConfirmingChoice(null)
    sound.playGavel()
    onVote(confirmingChoice)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Tribunal</div>
        <div className={styles.caseLabel}>Case File Under Review</div>
        <div className={styles.nominatedName}>{nominatedPlayer}</div>
        <div className={styles.subtitle}>
          {!canVote
            ? 'You are under tribunal. The room decides your fate.'
            : selectedChoice
              ? 'Your vote is locked.'
              : 'Choose whether the room condemns or spares the accused.'}
        </div>
      </div>

      {confirmingChoice && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmTitle}>Lock Verdict</div>
            <div className={styles.confirmChoice}>{confirmingChoice === 'CONDEMN' ? 'Condemn' : 'Spare'}</div>
            <div className={styles.confirmSub}>This choice cannot be changed this round.</div>
            <div className={styles.confirmBtns}>
              <button className={styles.confirmYes} onClick={confirmChoice}>Lock it</button>
              <button className={styles.confirmNo} onClick={() => setConfirmingChoice(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.accusedCard}>
        <div className={styles.accusedStamp}>Under Review</div>
        <div className={styles.accusedAvatar}>{nominatedPlayer?.[0]?.toUpperCase() || '?'}</div>
        <div className={styles.accusedName}>{nominatedPlayer}</div>
        <div className={styles.accusedMeta}>{verdictLead}</div>
      </div>

      <div className={styles.optionGrid}>
        {options.map((option) => {
          const pct = totalVotes > 0 ? (option.count / totalVotes) * 100 : 0
          const isSelected = selectedChoice === option.key
          return (
            <button
              key={option.key}
              className={`${styles.optionCard} ${option.accentClass} ${isSelected ? styles.optionSelected : ''}`}
              onClick={() => selectChoice(option.key)}
              disabled={!canVote || !!selectedChoice}
            >
              <div className={styles.optionHeader}>
                <span className={styles.optionName}>{option.label}</span>
                <span className={styles.optionCount}>{option.count}</span>
              </div>
              <div className={styles.optionDescription}>{option.description}</div>
              <div className={styles.optionBar}>
                <div className={styles.optionFill} style={{ width: `${pct}%` }} />
              </div>
              <div className={styles.optionFoot}>
                {isSelected ? 'Locked in' : !canVote ? 'Unavailable' : 'Tap to choose'}
              </div>
            </button>
          )
        })}
      </div>

      {!canVote && (
        <div className={styles.waitMsg}>The room is deciding whether you stay or fall.</div>
      )}

      {canVote && selectedChoice && (
        <div className={styles.waitMsg}>Waiting for the remaining votes to land...</div>
      )}
    </div>
  )
}
