import React, { useState, useEffect } from 'react'
import styles from './GameOverScreen.module.css'
import ShareCard from './ShareCard'
import StatsScreen from './StatsScreen'
import { useSound } from '../hooks/useSound'

export default function GameOverScreen({ result, myRole, caseFile, theme, roomCode, stats, myPlayerName, onPlayAgain }) {
  const [displayed, setDisplayed]       = useState('')
  const [caseFileDone, setCaseFileDone] = useState(false)
  const [showShare, setShowShare]       = useState(false)
  const [activeTab, setActiveTab]       = useState('case') // 'case' | 'stats'
  const sound = useSound()

  const isWinner    = result?.winner === (myRole?.alignment || 'good')
  const accentColor = myRole?.alignment === 'evil' ? '#e63946' : '#00b4d8'

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
          ? <span className={styles.win}>🏆 YOUR SIDE WON</span>
          : <span className={styles.lose}>💀 ELIMINATED</span>
        }
        <div className={styles.roleLine}>
          You played as <span style={{ color: accentColor }}>{myRole?.roleName || '???'}</span>
          <span className={`${styles.alignPill} ${myRole?.alignment === 'evil' ? styles.pillEvil : styles.pillGood}`}>
            {myRole?.alignment === 'evil' ? '☠ Antagonist' : '✦ Cooperator'}
          </span>
        </div>
      </div>

      {/* Tab switcher — only show Stats tab if data exists */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'case' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('case')}
        >
          🗂 Case File
        </button>
        {stats && stats.length > 0 && (
          <button
            className={`${styles.tab} ${activeTab === 'stats' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 Stats
          </button>
        )}
      </div>

      {/* Case File tab */}
      {activeTab === 'case' && (
        <>
          <div className={styles.caseFileBox}>
            <div className={styles.caseLabel}>&mdash; CASE FILE &mdash;</div>
            <div className={styles.caseText}>
              {displayed}<span className={`${styles.cursor} ${caseFileDone ? styles.cursorHide : ''}`}>|</span>
            </div>
          </div>

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
        </>
      )}

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <StatsScreen
          stats={stats || []}
          winner={result?.winner}
          myPlayerName={myPlayerName}
        />
      )}

      <button className={styles.playAgainBtn} onClick={onPlayAgain}>
        🔁 Play Again
      </button>
    </div>
  )
}
