/**
 * pwaIcons.js — Generates PWA icon PNGs at runtime via canvas and registers
 * them as service worker cached assets so the manifest icon check passes.
 *
 * Call initPwaIcons() once from main.jsx.
 * This avoids needing to commit binary PNG files to the repo.
 */
export function drawVerdictIcon(canvas) {
  const s = canvas.width
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const r = s * 0.188

  // Rounded rect background
  ctx.beginPath()
  ctx.moveTo(r, 0); ctx.lineTo(s - r, 0)
  ctx.quadraticCurveTo(s, 0, s, r)
  ctx.lineTo(s, s - r); ctx.quadraticCurveTo(s, s, s - r, s)
  ctx.lineTo(r, s); ctx.quadraticCurveTo(0, s, 0, s - r)
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fillStyle = '#0a0a0f'
  ctx.fill()

  // Glow ring
  ctx.beginPath()
  ctx.arc(s / 2, s / 2, s * 0.39, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(123,45,139,0.45)'
  ctx.lineWidth = s * 0.012
  ctx.stroke()

  const sc = s / 512

  ctx.fillStyle = '#7b2d8b'
  // Beam
  ctx.beginPath(); ctx.roundRect(236 * sc, 148 * sc, 40 * sc, 10 * sc, 5 * sc); ctx.fill()
  // Pillar
  ctx.beginPath(); ctx.roundRect(251 * sc, 155 * sc, 10 * sc, 130 * sc, 5 * sc); ctx.fill()
  // Base
  ctx.beginPath(); ctx.roundRect(196 * sc, 285 * sc, 120 * sc, 10 * sc, 5 * sc); ctx.fill()

  // Scale arms
  ctx.strokeStyle = '#9b59b6'; ctx.lineWidth = 3 * sc; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(240 * sc, 152 * sc); ctx.lineTo(178 * sc, 158 * sc); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(272 * sc, 152 * sc); ctx.lineTo(334 * sc, 145 * sc); ctx.stroke()

  // Chains
  ctx.strokeStyle = 'rgba(123,45,139,0.8)'; ctx.lineWidth = 3 * sc
  ctx.beginPath(); ctx.moveTo(178 * sc, 155 * sc); ctx.lineTo(178 * sc, 210 * sc); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(334 * sc, 155 * sc); ctx.lineTo(334 * sc, 195 * sc); ctx.stroke()

  // Left pan (purple)
  ctx.strokeStyle = '#c77dff'; ctx.lineWidth = 3 * sc
  ctx.beginPath(); ctx.ellipse(178 * sc, 222 * sc, 46 * sc, 12 * sc, 0, 0, Math.PI * 2); ctx.stroke()

  // Right pan (red)
  ctx.strokeStyle = '#e63946'; ctx.lineWidth = 3 * sc
  ctx.beginPath(); ctx.ellipse(334 * sc, 207 * sc, 46 * sc, 12 * sc, 0, 0, Math.PI * 2); ctx.stroke()

  // VERDICT text
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 ${Math.round(52 * sc)}px system-ui,-apple-system,sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText('VERDICT', s / 2, 350 * sc)

  // Subtitle
  ctx.fillStyle = 'rgba(123,45,139,0.85)'
  ctx.font = `${Math.round(18 * sc)}px system-ui,-apple-system,sans-serif`
  ctx.fillText('SOCIAL DEDUCTION', s / 2, 385 * sc)
}

/**
 * Registers canvas-generated icons into the SW cache so manifest validation passes.
 * Must be called after the SW is registered.
 */
export async function initPwaIcons() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const sizes = [192, 512]
  for (const size of sizes) {
    const path = `/icons/icon-${size}.png`
    // Only generate if not already cached
    if ('caches' in window) {
      const cache = await caches.open('verdict-v1').catch(() => null)
      if (cache) {
        const existing = await cache.match(path).catch(() => null)
        if (existing) continue
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        drawVerdictIcon(canvas)
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
        if (blob) {
          const response = new Response(blob, { headers: { 'Content-Type': 'image/png' } })
          await cache.put(path, response).catch(() => {})
        }
      }
    }
  }
}
