// Web Audio API sound engine — zero files needed, all synthesized
let ctx = null
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

function tone(freq, duration, type = 'sine', gain = 0.3, delay = 0) {
  try {
    const c = getCtx()
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.type = type; o.frequency.value = freq
    g.gain.setValueAtTime(0, c.currentTime + delay)
    g.gain.linearRampToValueAtTime(gain, c.currentTime + delay + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration)
    o.start(c.currentTime + delay)
    o.stop(c.currentTime + delay + duration + 0.05)
  } catch(e) {}
}

function noise(duration, gain = 0.15) {
  try {
    const c = getCtx()
    const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    const g = c.createGain()
    src.buffer = buf; src.connect(g); g.connect(c.destination)
    g.gain.setValueAtTime(gain, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    src.start()
  } catch(e) {}
}

export const SFX = {
  // Role reveal — typewriter tick
  tick: () => tone(800, 0.04, 'square', 0.08),

  // Role card slam
  cardSlam: () => {
    noise(0.12, 0.25)
    tone(120, 0.3, 'sine', 0.4)
  },

  // Phase transition whoosh
  whoosh: () => {
    const c = getCtx()
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(600, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.4)
    g.gain.setValueAtTime(0.2, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
    o.start(); o.stop(c.currentTime + 0.45)
  },

  // Evidence slam — 3 impacts
  evidenceSlam: (i = 0) => {
    noise(0.08, 0.3)
    tone(200 - i * 40, 0.25, 'square', 0.25, 0)
  },

  // Accusation — alarm
  accuse: () => {
    tone(880, 0.15, 'square', 0.3, 0)
    tone(660, 0.15, 'square', 0.3, 0.18)
    tone(880, 0.15, 'square', 0.3, 0.36)
  },

  // Confession gavel
  gavel: () => {
    noise(0.05, 0.5)
    tone(150, 0.4, 'sine', 0.5)
  },

  // Vote card flip
  cardFlip: () => {
    noise(0.06, 0.2)
    tone(400, 0.1, 'triangle', 0.15)
  },

  // Heartbeat during vote
  heartbeat: () => {
    tone(80, 0.08, 'sine', 0.4, 0)
    tone(70, 0.1, 'sine', 0.4, 0.1)
  },

  // Elimination — dramatic sting
  elimination: () => {
    noise(0.2, 0.4)
    tone(55, 1.2, 'sawtooth', 0.35)
    tone(110, 0.6, 'sine', 0.2, 0.3)
  },

  // World event slam
  worldEvent: () => {
    noise(0.1, 0.6)
    tone(60, 0.8, 'sine', 0.5)
    tone(180, 0.3, 'square', 0.2, 0.1)
  },

  // Trust drop
  trustDrop: () => {
    tone(440, 0.1, 'sine', 0.2, 0)
    tone(330, 0.1, 'sine', 0.2, 0.1)
    tone(220, 0.2, 'sine', 0.2, 0.2)
  },

  // Trust rise
  trustRise: () => {
    tone(330, 0.1, 'sine', 0.15, 0)
    tone(440, 0.1, 'sine', 0.15, 0.1)
    tone(550, 0.2, 'sine', 0.15, 0.2)
  },

  // Game over
  gameOver: () => {
    tone(440, 0.3, 'sine', 0.3, 0)
    tone(370, 0.3, 'sine', 0.3, 0.3)
    tone(220, 0.8, 'sine', 0.4, 0.6)
  },

  // Case file typewriter
  caseFileTick: () => tone(600, 0.03, 'square', 0.06),

  // Observer note drop
  observerNote: () => {
    tone(220, 0.4, 'sine', 0.15, 0)
    tone(277, 0.4, 'sine', 0.1, 0.2)
  }
}

export function screenShake(intensity = 8, duration = 400) {
  const el = document.getElementById('game-root') || document.body
  let start = null
  function step(ts) {
    if (!start) start = ts
    const progress = ts - start
    if (progress > duration) { el.style.transform = ''; return }
    const remaining = 1 - progress / duration
    const x = (Math.random() - 0.5) * intensity * remaining
    const y = (Math.random() - 0.5) * intensity * remaining
    el.style.transform = `translate(${x}px, ${y}px)`
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export function flashScreen(color = 'rgba(255,255,255,0.85)', duration = 120) {
  const el = document.createElement('div')
  el.style.cssText = `position:fixed;inset:0;background:${color};z-index:9999;pointer-events:none;transition:opacity ${duration}ms ease`
  document.body.appendChild(el)
  requestAnimationFrame(() => {
    el.style.opacity = '1'
    setTimeout(() => {
      el.style.opacity = '0'
      setTimeout(() => el.remove(), duration)
    }, 30)
  })
}
