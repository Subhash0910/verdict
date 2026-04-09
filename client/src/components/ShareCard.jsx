import React, { useRef } from 'react'
import styles from './ShareCard.module.css'

export default function ShareCard({ theme, caseFile, myRoleName, winner, roomCode }) {
  const cardRef = useRef(null)

  async function handleShare() {
    try {
      // Dynamically load html2canvas from CDN
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
          s.onload = resolve; s.onerror = reject
          document.head.appendChild(s)
        })
      }
      const canvas = await window.html2canvas(cardRef.current, {
        backgroundColor: '#080810', scale: 2
      })
      canvas.toBlob(async blob => {
        const file = new File([blob], 'verdict-case-file.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'VERDICT — Case File' })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url
          a.download = 'verdict-case-file.png'; a.click()
          URL.revokeObjectURL(url)
        }
      })
    } catch (e) { console.error('Share failed:', e) }
  }

  return (
    <div className={styles.wrapper}>
      {/* The card that gets captured */}
      <div ref={cardRef} className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logo}>VERDICT</span>
          <span className={styles.tag}>CASE FILE</span>
        </div>
        <div className={styles.theme}>{theme}</div>
        <div className={styles.caseText}>{caseFile}</div>
        <div className={styles.footer}>
          <span className={styles.role}>Played as: {myRoleName}</span>
          <span className={styles.site}>verdict.gg</span>
        </div>
      </div>

      <button className={styles.shareBtn} onClick={handleShare}>
        📸 Share This
      </button>
    </div>
  )
}
