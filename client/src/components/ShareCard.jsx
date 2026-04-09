import React, { useRef, useState } from 'react'
import styles from './ShareCard.module.css'

// Load html2canvas once
let html2canvasPromise = null
function loadHtml2Canvas() {
  if (html2canvasPromise) return html2canvasPromise
  html2canvasPromise = new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve(window.html2canvas)
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    s.onload = () => resolve(window.html2canvas)
    s.onerror = reject
    document.head.appendChild(s)
  })
  return html2canvasPromise
}

const ALIGNMENT_GRADIENTS = {
  evil: { bg: 'linear-gradient(135deg, #1a0005 0%, #0d0010 60%, #080810 100%)', accent: '#e63946', label: '\u2620 ANTAGONIST' },
  good: { bg: 'linear-gradient(135deg, #00101a 0%, #000d14 60%, #080810 100%)', accent: '#00b4d8', label: '\u2726 COOPERATOR' },
}

export default function ShareCard({ theme, caseFile, myRoleName, winner, myAlignment, roomCode }) {
  const cardRef = useRef(null)
  const [capturing, setCapturing] = useState(false)
  const [done, setDone] = useState(false)

  const alignData = ALIGNMENT_GRADIENTS[myAlignment] || ALIGNMENT_GRADIENTS.good
  const isWinner = winner === (myAlignment || 'good')
  const winLabel = isWinner ? '\ud83c\udfc6 YOUR SIDE WON' : '\ud83d\udc80 ELIMINATED'
  const winColor = isWinner ? '#f7b731' : '#e63946'

  async function handleCapture() {
    if (capturing) return
    setCapturing(true)
    try {
      const h2c = await loadHtml2Canvas()
      const canvas = await h2c(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      })
      canvas.toBlob(async blob => {
        const file = new File([blob], 'verdict-result.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'VERDICT — My Result',
            text: `I played as ${myRoleName} in a game of VERDICT. ${isWinner ? 'We won! 🏆' : 'We lost. 💀'}`,
          })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'verdict-result.png'; a.click()
          URL.revokeObjectURL(url)
        }
        setDone(true)
        setTimeout(() => setDone(false), 3000)
      }, 'image/png')
    } catch (e) {
      console.error('Share failed:', e)
    } finally {
      setCapturing(false)
    }
  }

  // Truncate caseFile for the card (max ~280 chars looks clean)
  const previewText = caseFile?.length > 280 ? caseFile.slice(0, 277) + '\u2026' : caseFile

  return (
    <div className={styles.wrapper}>

      {/* ---- CAPTURABLE CARD ---- */}
      <div
        ref={cardRef}
        className={styles.card}
        style={{ background: alignData.bg, '--accent': alignData.accent }}
      >
        {/* Noise overlay for texture */}
        <div className={styles.noise} />

        {/* Top bar */}
        <div className={styles.topBar}>
          <span className={styles.logo}>VERDICT</span>
          <span className={styles.themePill}>{theme || 'UNKNOWN THEME'}</span>
        </div>

        {/* Win/Lose banner */}
        <div className={styles.resultBanner} style={{ color: winColor, borderColor: winColor }}>
          {winLabel}
        </div>

        {/* Role badge */}
        <div className={styles.roleBadge} style={{ borderColor: alignData.accent, color: alignData.accent }}>
          <span className={styles.roleLabel}>PLAYED AS</span>
          <span className={styles.roleName}>{myRoleName || '???'}</span>
          <span className={styles.alignLabel}>{alignData.label}</span>
        </div>

        {/* Case file excerpt */}
        <div className={styles.caseSection}>
          <div className={styles.caseHeading}>\u2014 CASE FILE \u2014</div>
          <div className={styles.caseText}>{previewText}</div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.footerLeft}>
            {roomCode ? `ROOM ${roomCode}` : 'VERDICT'}
          </span>
          <span className={styles.footerRight}>verdict.gg</span>
        </div>
      </div>

      {/* ---- SHARE BUTTON ---- */}
      <button
        className={`${styles.shareBtn} ${done ? styles.shareDone : ''}`}
        onClick={handleCapture}
        disabled={capturing}
        style={{ '--accent': alignData.accent }}
      >
        {capturing ? '\u23f3 Capturing...' : done ? '\u2705 Saved!' : '\ud83d\udcf8 Save & Share Result'}
      </button>
    </div>
  )
}
