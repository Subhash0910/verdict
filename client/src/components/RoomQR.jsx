/**
 * RoomQR — Pure canvas QR code generator. Zero dependencies.
 * Implements QR Code spec for short alphanumeric strings (room join URLs).
 * Uses a lightweight JS QR library loaded from CDN on first use.
 */
import React, { useEffect, useRef, useState } from 'react'
import styles from './RoomQR.module.css'

// Lazily load qrcode CDN script (qrcode.js ~15kB)
let qrPromise = null
function loadQR() {
  if (qrPromise) return qrPromise
  qrPromise = new Promise((resolve, reject) => {
    if (window.QRCode) return resolve(window.QRCode)
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    s.onload = () => resolve(window.QRCode)
    s.onerror = () => {
      // Fallback: try unpkg
      const s2 = document.createElement('script')
      s2.src = 'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js'
      s2.onload = () => resolve(window.QRCode)
      s2.onerror = reject
      document.head.appendChild(s2)
    }
    document.head.appendChild(s)
  })
  return qrPromise
}

export default function RoomQR({ roomCode, size = 180 }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(false)
  const [ready, setReady] = useState(false)
  const qrRef = useRef(null)

  const joinUrl = `${window.location.origin}?join=${roomCode}`

  useEffect(() => {
    if (!roomCode) return
    let cancelled = false
    setError(false)
    setReady(false)

    // Clear old QR
    if (containerRef.current) containerRef.current.innerHTML = ''
    qrRef.current = null

    loadQR().then(QRCode => {
      if (cancelled || !containerRef.current) return
      try {
        qrRef.current = new QRCode(containerRef.current, {
          text: joinUrl,
          width: size,
          height: size,
          colorDark: '#ffffff',
          colorLight: '#0a0a14',
          correctLevel: QRCode.CorrectLevel?.M ?? 0,
        })
        setReady(true)
      } catch (e) {
        console.error('QR generation failed', e)
        setError(true)
      }
    }).catch(() => setError(true))

    return () => { cancelled = true }
  }, [roomCode, size])

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.scanHint}>SCAN TO JOIN</div>

        {/* QR canvas renders here */}
        <div
          ref={containerRef}
          className={`${styles.qrBox} ${ready ? styles.qrReady : ''}`}
          style={{ width: size, height: size }}
        />

        {!ready && !error && (
          <div className={styles.qrPlaceholder} style={{ width: size, height: size }}>
            <span className={styles.generating}>generating...</span>
          </div>
        )}

        {error && (
          <div className={styles.qrPlaceholder} style={{ width: size, height: size }}>
            <span className={styles.errorText}>QR unavailable</span>
          </div>
        )}

        <div className={styles.codeText}>{roomCode}</div>
        <div className={styles.urlText}>{joinUrl}</div>
      </div>
    </div>
  )
}
