import { useEffect } from 'react'

const PRESET_THEMES = {
  'signal-breach': {
    vars: {
      '--theme-bg-primary': '#050510',
      '--theme-bg-secondary': '#080820',
      '--theme-bg-card': '#0a0a25',
      '--theme-accent-primary': '#7a9cff',
      '--theme-accent-evil': '#ff6b35',
      '--theme-accent-good': '#7a9cff',
      '--theme-border': '#1a2250',
      '--theme-text-primary': '#e7ebff',
      '--theme-text-muted': '#5e6a92',
      '--theme-glow-primary': '0 0 30px rgba(122,156,255,0.14)',
      '--theme-font': "'IBM Plex Sans', 'Segoe UI', sans-serif",
      '--theme-font-mono': "'IBM Plex Mono', 'Courier New', monospace",
      '--theme-font-typewriter': "'Special Elite', 'Courier New', monospace",
      '--theme-title-spacing': '6px',
    }
  },
  'glasshouse': {
    vars: {
      '--theme-bg-primary': '#071019',
      '--theme-bg-secondary': '#0d1622',
      '--theme-bg-card': '#101c2b',
      '--theme-accent-primary': '#63c7ff',
      '--theme-accent-evil': '#ff5d73',
      '--theme-accent-good': '#63c7ff',
      '--theme-border': '#1f3445',
      '--theme-text-primary': '#e7f2ff',
      '--theme-text-muted': '#7088a1',
      '--theme-glow-primary': '0 0 30px rgba(99,199,255,0.12)',
      '--theme-font': "'Manrope', 'Segoe UI', sans-serif",
      '--theme-font-mono': "'IBM Plex Mono', 'Courier New', monospace",
      '--theme-font-typewriter': "'Space Mono', 'Courier New', monospace",
      '--theme-title-spacing': '7px',
    }
  },
  'velvet-noose': {
    vars: {
      '--theme-bg-primary': '#120b12',
      '--theme-bg-secondary': '#1a111a',
      '--theme-bg-card': '#221523',
      '--theme-accent-primary': '#d7b673',
      '--theme-accent-evil': '#ff4d64',
      '--theme-accent-good': '#d7b673',
      '--theme-border': '#3a273d',
      '--theme-text-primary': '#f2e8db',
      '--theme-text-muted': '#8f7b74',
      '--theme-glow-primary': '0 0 28px rgba(215,182,115,0.10)',
      '--theme-font': "'Cormorant Garamond', Georgia, serif",
      '--theme-font-mono': "'IBM Plex Mono', 'Courier New', monospace",
      '--theme-font-typewriter': "'Special Elite', 'Courier New', monospace",
      '--theme-title-spacing': '4px',
    }
  },
  'mirrorhouse': {
    vars: {
      '--theme-bg-primary': '#0c0610',
      '--theme-bg-secondary': '#140a18',
      '--theme-bg-card': '#1a0f20',
      '--theme-accent-primary': '#c58cff',
      '--theme-accent-evil': '#ff5678',
      '--theme-accent-good': '#c58cff',
      '--theme-border': '#382145',
      '--theme-text-primary': '#f2e6ff',
      '--theme-text-muted': '#836d93',
      '--theme-glow-primary': '0 0 36px rgba(197,140,255,0.12)',
      '--theme-font': "'Spectral', Georgia, serif",
      '--theme-font-mono': "'IBM Plex Mono', 'Courier New', monospace",
      '--theme-font-typewriter': "'Special Elite', 'Courier New', monospace",
      '--theme-title-spacing': '5px',
    }
  },
  'red-market': {
    vars: {
      '--theme-bg-primary': '#08070f',
      '--theme-bg-secondary': '#0f0c18',
      '--theme-bg-card': '#141122',
      '--theme-accent-primary': '#00d9ff',
      '--theme-accent-evil': '#ff315c',
      '--theme-accent-good': '#00d9ff',
      '--theme-border': '#213051',
      '--theme-text-primary': '#e5fbff',
      '--theme-text-muted': '#5a7692',
      '--theme-glow-primary': '0 0 32px rgba(0,217,255,0.14)',
      '--theme-font': "'Space Grotesk', 'Segoe UI', sans-serif",
      '--theme-font-mono': "'IBM Plex Mono', 'Courier New', monospace",
      '--theme-font-typewriter': "'IBM Plex Mono', 'Courier New', monospace",
      '--theme-title-spacing': '6px',
    }
  },
  'ash-court': {
    vars: {
      '--theme-bg-primary': '#130d09',
      '--theme-bg-secondary': '#1a120d',
      '--theme-bg-card': '#231810',
      '--theme-accent-primary': '#d4b16c',
      '--theme-accent-evil': '#d05757',
      '--theme-accent-good': '#d4b16c',
      '--theme-border': '#413025',
      '--theme-text-primary': '#f1e6d4',
      '--theme-text-muted': '#8d7761',
      '--theme-glow-primary': '0 0 28px rgba(212,177,108,0.10)',
      '--theme-font': "'Cormorant Garamond', Georgia, serif",
      '--theme-font-mono': "'IBM Plex Mono', 'Courier New', monospace",
      '--theme-font-typewriter': "'Special Elite', 'Courier New', monospace",
      '--theme-title-spacing': '4px',
    }
  },
  'saint-zero': {
    vars: {
      '--theme-bg-primary': '#0b0c12',
      '--theme-bg-secondary': '#131620',
      '--theme-bg-card': '#1a1e2a',
      '--theme-accent-primary': '#89b8ff',
      '--theme-accent-evil': '#ff5f69',
      '--theme-accent-good': '#89b8ff',
      '--theme-border': '#2d3347',
      '--theme-text-primary': '#eef2ff',
      '--theme-text-muted': '#7a839f',
      '--theme-glow-primary': '0 0 28px rgba(137,184,255,0.12)',
      '--theme-font': "'Inter Tight', 'Segoe UI', sans-serif",
      '--theme-font-mono': "'IBM Plex Mono', 'Courier New', monospace",
      '--theme-font-typewriter': "'Space Mono', 'Courier New', monospace",
      '--theme-title-spacing': '6px',
    }
  },
  'black-vault': {
    vars: {
      '--theme-bg-primary': '#08090d',
      '--theme-bg-secondary': '#101216',
      '--theme-bg-card': '#171a1f',
      '--theme-accent-primary': '#8fd8b5',
      '--theme-accent-evil': '#ff6f61',
      '--theme-accent-good': '#8fd8b5',
      '--theme-border': '#2a3035',
      '--theme-text-primary': '#eef2ef',
      '--theme-text-muted': '#7a8881',
      '--theme-glow-primary': '0 0 30px rgba(143,216,181,0.10)',
      '--theme-font': "'Sora', 'Segoe UI', sans-serif",
      '--theme-font-mono': "'IBM Plex Mono', 'Courier New', monospace",
      '--theme-font-typewriter': "'Special Elite', 'Courier New', monospace",
      '--theme-title-spacing': '5px',
    }
  },
  default: {
    vars: {
      '--theme-bg-primary': '#080810',
      '--theme-bg-secondary': '#0c0c18',
      '--theme-bg-card': '#0f0f1c',
      '--theme-accent-primary': '#7b2d8b',
      '--theme-accent-evil': '#e63946',
      '--theme-accent-good': '#00b4d8',
      '--theme-border': '#2a2a3e',
      '--theme-text-primary': '#f0f0f0',
      '--theme-text-muted': '#888',
      '--theme-glow-primary': '0 0 30px rgba(123,45,139,0.12)',
      '--theme-font': "'Segoe UI', system-ui, sans-serif",
      '--theme-font-mono': "'IBM Plex Mono', 'Courier New', monospace",
      '--theme-font-typewriter': "'Special Elite', 'Courier New', monospace",
      '--theme-title-spacing': '4px',
    }
  }
}

const LEGACY_KEYWORDS = {
  cyber: ['cyber', 'hack', 'neon', 'corp', 'tech', 'digital', 'matrix', 'network'],
  space: ['space', 'galaxy', 'alien', 'ship', 'crew', 'station', 'planet', 'orbit'],
  noir: ['noir', 'detective', 'murder', 'crime', 'mystery', 'suspect'],
  horror: ['horror', 'cult', 'demon', 'witch', 'haunted', 'ghost', 'ritual'],
  medieval: ['medieval', 'castle', 'knight', 'king', 'queen', 'court', 'throne'],
}

function detectLegacyTheme(themeStr) {
  if (!themeStr) return 'default'
  const lower = themeStr.toLowerCase()
  if (LEGACY_KEYWORDS.space.some((keyword) => lower.includes(keyword))) return 'signal-breach'
  if (LEGACY_KEYWORDS.cyber.some((keyword) => lower.includes(keyword))) return 'red-market'
  if (LEGACY_KEYWORDS.noir.some((keyword) => lower.includes(keyword))) return 'velvet-noose'
  if (LEGACY_KEYWORDS.horror.some((keyword) => lower.includes(keyword))) return 'mirrorhouse'
  if (LEGACY_KEYWORDS.medieval.some((keyword) => lower.includes(keyword))) return 'ash-court'
  return 'default'
}

export function detectTheme(themeStr, themePresetId) {
  if (themePresetId && PRESET_THEMES[themePresetId]) return themePresetId
  return detectLegacyTheme(themeStr)
}

export function applyTheme(themeStr, themePresetId) {
  const key = detectTheme(themeStr, themePresetId)
  const vars = PRESET_THEMES[key]?.vars || PRESET_THEMES.default.vars
  const root = document.documentElement
  Object.entries(vars).forEach(([prop, val]) => root.style.setProperty(prop, val))
  document.body.setAttribute('data-theme', key)
  return key
}

export function clearTheme() {
  const root = document.documentElement
  Object.keys(PRESET_THEMES.default.vars).forEach((prop) => root.style.removeProperty(prop))
  document.body.removeAttribute('data-theme')
}

export function useGameTheme(themeStr, themePresetId) {
  useEffect(() => {
    if (!themeStr && !themePresetId) return
    applyTheme(themeStr, themePresetId)
    return () => clearTheme()
  }, [themeStr, themePresetId])
}
