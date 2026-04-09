import React, { useState, useEffect } from 'react'
import styles from './GameOverScreen.module.css'
import ShareCard from './ShareCard'
import { useSound } from '../hooks/useSound'

export default function GameOverScreen({ result, myRole, caseFile, theme, roomCode, onPlayAgain }) {
  const [displayed, setDisplayed]   = useState('')
  const [caseFileDone, setCaseFileDone] = useState(false)
  const [showShare, setShowShare]   = useState(false)
  const sound = useSound()

  const isWinner = result?.winner === (myRole?.alignment || 'good')
  const accentColor = myRole?.alignment === 'evil' ? '#e63946' : '#00b4d8'

  // Typewriter for case file
  useEffect(() => {
    if (!caseFile) return
    let i = 0
    setCaseFileDone(false)
    setShowShare(false)
    const iv = setInterval(() => {
      if (i >= caseFile.length) {
        clearInterval(iv)
        setCaseFileDone(true)
        setTimeout(() => setShowShare(true), 600)
        return
      }
      sound.playTick()
      setDisplayed(caseFile.slice(0, ++i))
    }, 28)
    return () => clearInterval(iv)
  }, [caseFile])

  return (
    <div className={styles.container}>

      {/* WIN / LOSE banner */}
      <div className={styles.resultBanner} style={{ '--accent': accentColor }}>
        {isWinner
          ? <span className={styles.win}>\ud83c\udfc6 YOUR SIDE WON</span>
          : <span className={styles.lose}>\ud83d\udc80 ELIMINATED</span>
        }
        <div className={styles.roleLine}>
          You played as <span style={{ color: accentColor }}>{myRole?.roleName || '???'}</span>
          <span className={`${styles.alignPill} ${myRole?.alignment === 'evil' ? styles.pillEvil : styles.pillGood}`}>
            {myRole?.alignment === 'evil' ? '\u2620 Antagonist' : '\u2726 Cooperator'}
          </span>
        </div>
      </div>

      {/* Case file box */}
      <div className={styles.caseFileBox}>
        <div className={styles.caseLabel}>\u2014 CASE FILE \u2014</div>
        <div className={styles.caseText}>
          {displayed}<span className={`${styles.cursor} ${caseFileDone ? styles.cursorHide : ''}`}>|</span>
        </div>
      </div>

      {/* Share card — slides in after case file finishes */}
      {showShare && caseFile && (
        <div className={styles.shareSlideIn}>
          <ShareCard
            theme={theme || 'VERDICT'}
            caseFile={caseFile}
            myRoleName={myRole?.roleName || '???'}
            myAlignment={myRole?.alignment || 'good'}
            winner={result?.winner}
            roomCode={roomCode}
          />
        </div>
      )}

      <button className={styles.playAgainBtn} onClick={onPlayAgain}>
        \ud83d\udd01 Play Again
      </button>
    </div>
  )
}
