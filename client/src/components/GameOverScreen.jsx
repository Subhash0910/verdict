import React, { useEffect, useMemo, useRef, useState } from 'react'
import styles from './GameOverScreen.module.css'
import ShareCard from './ShareCard'
import StatsScreen from './StatsScreen'
import { useSound } from '../hooks/useSound'

const PROFILE_KEY = 'verdict_profile_v1'

function getRank(profile) {
  const score = profile.gamesPlayed + profile.wins * 2 + profile.stamps
  if (score >= 40) return 'Myth File'
  if (score >= 26) return 'Tribunal Star'
  if (score >= 16) return 'Signal Hunter'
  if (score >= 9) return 'Case Runner'
  if (score >= 4) return 'Field Asset'
  return 'Fresh File'
}

function readProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) {
      return {
        gamesPlayed: 0,
        wins: 0,
        currentStreak: 0,
        bestStreak: 0,
        stamps: 0,
        unlockedThemes: [],
        unlockedRoles: [],
      }
    }
    return JSON.parse(raw)
  } catch {
    return {
      gamesPlayed: 0,
      wins: 0,
      currentStreak: 0,
      bestStreak: 0,
      stamps: 0,
      unlockedThemes: [],
      unlockedRoles: [],
    }
  }
}

function writeProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export default function GameOverScreen({
  result,
  myRole,
  caseFile,
  theme,
  themePresetId,
  roomCode,
  stats,
  myPlayerName,
  onPlayAgain,
}) {
  const [displayed, setDisplayed] = useState('')
  const [caseFileDone, setCaseFileDone] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [activeTab, setActiveTab] = useState('case')
  const [profile, setProfile] = useState(null)
  const sound = useSound()
  const recordedProfileRef = useRef(false)

  const isWinner = result?.winner === (myRole?.alignment || 'good')
  const accentColor = myRole?.alignment === 'evil' ? 'var(--theme-accent-evil)' : 'var(--theme-accent-good)'
  const myStats = useMemo(
    () => (stats || []).find((entry) => entry.playerName === myPlayerName),
    [myPlayerName, stats]
  )

  useEffect(() => {
    if (!caseFile) return
    let index = 0
    setDisplayed('')
    setCaseFileDone(false)
    setShowShare(false)

    const interval = setInterval(() => {
      if (index >= caseFile.length) {
        clearInterval(interval)
        setCaseFileDone(true)
        setTimeout(() => setShowShare(true), 500)
        return
      }
      sound.playTick()
      index += 1
      setDisplayed(caseFile.slice(0, index))
    }, 24)

    return () => clearInterval(interval)
  }, [caseFile, sound])

  useEffect(() => {
    if (recordedProfileRef.current || !myRole) return

    const nextProfile = readProfile()
    nextProfile.gamesPlayed += 1
    if (isWinner) {
      nextProfile.wins += 1
      nextProfile.currentStreak += 1
    } else {
      nextProfile.currentStreak = 0
    }
    nextProfile.bestStreak = Math.max(nextProfile.bestStreak, nextProfile.currentStreak)
    nextProfile.stamps += (myStats?.receipts || []).length

    const unlockedThemes = new Set(nextProfile.unlockedThemes || [])
    if (themePresetId) unlockedThemes.add(themePresetId)
    const unlockedRoles = new Set(nextProfile.unlockedRoles || [])
    if (myRole?.roleChassisId) unlockedRoles.add(myRole.roleChassisId)
    if (myRole?.roleName) unlockedRoles.add(myRole.roleName)

    nextProfile.unlockedThemes = [...unlockedThemes]
    nextProfile.unlockedRoles = [...unlockedRoles]
    nextProfile.rank = getRank(nextProfile)

    writeProfile(nextProfile)
    setProfile(nextProfile)
    recordedProfileRef.current = true
  }, [isWinner, myRole, myStats, themePresetId])

  const receipts = myStats?.receipts || []

  return (
    <div className={styles.container}>
      <div className={styles.resultBanner} style={{ '--accent': accentColor }}>
        {isWinner ? (
          <span className={styles.win}>Your side won</span>
        ) : (
          <span className={styles.lose}>Case lost</span>
        )}
        <div className={styles.roleLine}>
          You played as <span style={{ color: accentColor }}>{myRole?.roleName || 'Unknown'}</span>
          <span className={`${styles.alignPill} ${myRole?.alignment === 'evil' ? styles.pillEvil : styles.pillGood}`}>
            {myRole?.factionLabel || (myRole?.alignment === 'evil' ? 'Antagonist' : 'Cooperator')}
          </span>
        </div>
      </div>

      {profile && (
        <div className={styles.progressCard}>
          <div className={styles.progressLabel}>Dossier Progress</div>
          <div className={styles.progressRank}>{profile.rank}</div>
          <div className={styles.progressGrid}>
            <div><span>Games</span><strong>{profile.gamesPlayed}</strong></div>
            <div><span>Wins</span><strong>{profile.wins}</strong></div>
            <div><span>Streak</span><strong>{profile.currentStreak}</strong></div>
            <div><span>Best</span><strong>{profile.bestStreak}</strong></div>
            <div><span>Themes</span><strong>{profile.unlockedThemes.length}</strong></div>
            <div><span>Roles</span><strong>{profile.unlockedRoles.length}</strong></div>
          </div>
          {receipts.length > 0 && (
            <div className={styles.receiptRow}>
              {receipts.map((receipt) => <span key={receipt} className={styles.receiptChip}>{receipt}</span>)}
            </div>
          )}
        </div>
      )}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'case' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('case')}
        >
          Case File
        </button>
        {stats && stats.length > 0 && (
          <button
            className={`${styles.tab} ${activeTab === 'stats' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Receipts
          </button>
        )}
      </div>

      {activeTab === 'case' && (
        <>
          <div className={styles.caseFileBox}>
            <div className={styles.caseLabel}>Case File</div>
            <div className={styles.caseText}>
              {displayed}
              <span className={`${styles.cursor} ${caseFileDone ? styles.cursorHide : ''}`}>|</span>
            </div>
          </div>

          {showShare && caseFile && (
            <div className={styles.shareSlideIn}>
              <ShareCard
                theme={theme || 'VERDICT'}
                caseFile={caseFile}
                myRoleName={myRole?.roleName || 'Unknown'}
                myAlignment={myRole?.alignment || 'good'}
                winner={result?.winner}
                roomCode={roomCode}
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'stats' && (
        <StatsScreen
          stats={stats || []}
          winner={result?.winner}
          myPlayerName={myPlayerName}
        />
      )}

      <button className={styles.playAgainBtn} onClick={onPlayAgain}>Play Again</button>
    </div>
  )
}
