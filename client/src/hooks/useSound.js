// Web Audio API sound engine — zero files needed, all generated tones
const ctx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null

function play(type) {
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()
  const g = ctx.createGain()
  g.connect(ctx.destination)

  switch (type) {

    case 'tick': {
      const o = ctx.createOscillator()
      o.connect(g); g.gain.setValueAtTime(0.08, ctx.currentTime)
      o.type = 'sine'; o.frequency.setValueAtTime(1200, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      o.start(); o.stop(ctx.currentTime + 0.05)
      break
    }

    case 'whoosh': {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
      const s = ctx.createBufferSource(); s.buffer = buf
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 800
      s.connect(f); f.connect(g)
      g.gain.setValueAtTime(0.3, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      s.start(); s.stop(ctx.currentTime + 0.3)
      break
    }

    case 'slam': {
      const o = ctx.createOscillator()
      o.connect(g); g.gain.setValueAtTime(0.6, ctx.currentTime)
      o.type = 'sine'; o.frequency.setValueAtTime(120, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      o.start(); o.stop(ctx.currentTime + 0.25)
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
      const s = ctx.createBufferSource(); s.buffer = buf
      const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.4, ctx.currentTime)
      s.connect(g2); g2.connect(ctx.destination)
      s.start(); s.stop(ctx.currentTime + 0.08)
      break
    }

    case 'heartbeat': {
      const beat = (t) => {
        const o = ctx.createOscillator()
        const g2 = ctx.createGain()
        o.connect(g2); g2.connect(ctx.destination)
        o.type = 'sine'; o.frequency.setValueAtTime(60, t)
        g2.gain.setValueAtTime(0, t)
        g2.gain.linearRampToValueAtTime(0.5, t + 0.04)
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
        o.start(t); o.stop(t + 0.18)
      }
      beat(ctx.currentTime)
      beat(ctx.currentTime + 0.22)
      break
    }

    case 'gavel': {
      const o = ctx.createOscillator()
      o.connect(g); g.gain.setValueAtTime(0.7, ctx.currentTime)
      o.type = 'sawtooth'; o.frequency.setValueAtTime(200, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      o.start(); o.stop(ctx.currentTime + 0.3)
      break
    }

    case 'boom':
    case 'elimination': {
      [220, 277, 330].forEach((freq, i) => {
        const o = ctx.createOscillator()
        const g2 = ctx.createGain()
        o.connect(g2); g2.connect(ctx.destination)
        o.type = 'sine'; o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08)
        g2.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.08)
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
        o.start(ctx.currentTime + i * 0.08)
        o.stop(ctx.currentTime + 1.5)
      })
      break
    }

    case 'reveal': {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = ctx.createOscillator()
        const g2 = ctx.createGain()
        o.connect(g2); g2.connect(ctx.destination)
        o.type = 'sine'; o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12)
        g2.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12)
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4)
        o.start(ctx.currentTime + i * 0.12)
        o.stop(ctx.currentTime + i * 0.12 + 0.4)
      })
      break
    }

    case 'ding': {
      const o = ctx.createOscillator()
      o.connect(g); g.gain.setValueAtTime(0.3, ctx.currentTime)
      o.type = 'sine'; o.frequency.setValueAtTime(1047, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      o.start(); o.stop(ctx.currentTime + 0.5)
      break
    }

    case 'trust_drop': {
      const o = ctx.createOscillator()
      o.connect(g); g.gain.setValueAtTime(0.3, ctx.currentTime)
      o.type = 'sine'; o.frequency.setValueAtTime(440, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      o.start(); o.stop(ctx.currentTime + 0.3)
      break
    }

    case 'trust_rise': {
      const o = ctx.createOscillator()
      o.connect(g); g.gain.setValueAtTime(0.2, ctx.currentTime)
      o.type = 'sine'; o.frequency.setValueAtTime(440, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.2)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      o.start(); o.stop(ctx.currentTime + 0.2)
      break
    }

    case 'vote_flip': {
      const o = ctx.createOscillator()
      o.connect(g); g.gain.setValueAtTime(0.15, ctx.currentTime)
      o.type = 'triangle'; o.frequency.setValueAtTime(800, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
      o.start(); o.stop(ctx.currentTime + 0.1)
      break
    }

    case 'accusation': {
      [0, 0.15, 0.3].forEach(t => {
        const o = ctx.createOscillator()
        const g2 = ctx.createGain()
        o.connect(g2); g2.connect(ctx.destination)
        o.type = 'square'; o.frequency.setValueAtTime(880, ctx.currentTime + t)
        g2.gain.setValueAtTime(0.15, ctx.currentTime + t)
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12)
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.12)
      })
      break
    }

    default: break
  }
}

// ── Convenience helpers ─────────────────────────────────────────────────────

/** screenShake — CSS translate shake on document.body */
export function screenShake(intensity = 8, duration = 400) {
  if (typeof document === 'undefined') return
  const el = document.body
  const start = performance.now()
  function frame(now) {
    const elapsed = now - start
    if (elapsed >= duration) { el.style.transform = ''; return }
    const dx = (Math.random() - 0.5) * intensity * (1 - elapsed / duration)
    const dy = (Math.random() - 0.5) * intensity * (1 - elapsed / duration)
    el.style.transform = `translate(${dx}px,${dy}px)`
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

/** flashScreen — brief colour flash overlay */
export function flashScreen(color = 'rgba(255,255,255,0.4)', duration = 150) {
  if (typeof document === 'undefined') return
  const div = document.createElement('div')
  div.style.cssText = `position:fixed;inset:0;z-index:9999;background:${color};pointer-events:none;transition:opacity ${duration}ms ease`
  document.body.appendChild(div)
  requestAnimationFrame(() => {
    div.style.opacity = '0'
    setTimeout(() => div.remove(), duration + 50)
  })
}

// Main hook — call useSound() to get all play methods
export const sound = { play }

export const SFX = {
  tick:       () => play('tick'),
  whoosh:     () => play('whoosh'),
  slam:       () => play('slam'),
  heartbeat:  () => play('heartbeat'),
  gavel:      () => play('gavel'),
  boom:       () => play('boom'),
  elimination:() => play('elimination'),
  reveal:     () => play('reveal'),
  ding:       () => play('ding'),
  trustDrop:  () => play('trust_drop'),
  trustRise:  () => play('trust_rise'),
  voteFlip:   () => play('vote_flip'),
  accusation: () => play('accusation'),
}

export function useSound() {
  return {
    play,
    playTick:      () => play('tick'),
    playWhoosh:    () => play('whoosh'),
    playSlam:      () => play('slam'),
    playHeartbeat: () => play('heartbeat'),
    playGavel:     () => play('gavel'),
    playBoom:      () => play('boom'),
    playElimination:()=> play('elimination'),
    playReveal:    () => play('reveal'),
    playDing:      () => play('ding'),
    playTrustDrop: () => play('trust_drop'),
    playTrustRise: () => play('trust_rise'),
    playVoteFlip:  () => play('vote_flip'),
    playAccusation:() => play('accusation'),
  }
}
