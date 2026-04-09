/**
 * useGameTheme — maps AI-generated theme string to a CSS variable palette.
 * Call applyTheme(themeStr) to inject vars into :root.
 * Call clearTheme() to restore defaults.
 *
 * Themes are matched by keyword scanning the theme string (case-insensitive).
 * Falls back to DEFAULT if no keyword matches.
 */

const THEMES = {
  // ---- CYBERPUNK / TECH ----
  cyber: {
    keywords: ['cyber', 'hack', 'neon', 'corp', 'tech', 'digital', 'matrix', 'network', 'ai', 'robot'],
    vars: {
      '--theme-bg-primary':    '#050510',
      '--theme-bg-secondary':  '#080820',
      '--theme-bg-card':       '#0a0a25',
      '--theme-accent-primary':'#00f5ff',
      '--theme-accent-evil':   '#ff003c',
      '--theme-accent-good':   '#00f5ff',
      '--theme-border':        '#0a2a3e',
      '--theme-text-primary':  '#e0f8ff',
      '--theme-text-muted':    '#2a6a7a',
      '--theme-glow-primary':  '0 0 30px rgba(0,245,255,0.15)',
      '--theme-font':          "'Courier New', monospace",
      '--theme-title-spacing': '6px',
    }
  },

  // ---- MEDIEVAL / FANTASY ----
  medieval: {
    keywords: ['medieval', 'castle', 'knight', 'king', 'queen', 'court', 'throne', 'sword', 'plague', 'royal', 'empire'],
    vars: {
      '--theme-bg-primary':    '#0a0600',
      '--theme-bg-secondary':  '#120a00',
      '--theme-bg-card':       '#1a1000',
      '--theme-accent-primary':'#c9a227',
      '--theme-accent-evil':   '#8b0000',
      '--theme-accent-good':   '#c9a227',
      '--theme-border':        '#2a1e00',
      '--theme-text-primary':  '#f5e6c8',
      '--theme-text-muted':    '#7a6040',
      '--theme-glow-primary':  '0 0 30px rgba(201,162,39,0.12)',
      '--theme-font':          "'Palatino Linotype', 'Book Antiqua', serif",
      '--theme-title-spacing': '4px',
    }
  },

  // ---- NOIR / DETECTIVE ----
  noir: {
    keywords: ['noir', 'detective', 'murder', 'crime', 'mystery', 'investigat', 'suspect', 'alibi', 'witness', 'mafia', 'mob', 'gang'],
    vars: {
      '--theme-bg-primary':    '#080808',
      '--theme-bg-secondary':  '#101010',
      '--theme-bg-card':       '#181818',
      '--theme-accent-primary':'#d4a843',
      '--theme-accent-evil':   '#cc3333',
      '--theme-accent-good':   '#d4a843',
      '--theme-border':        '#282828',
      '--theme-text-primary':  '#e8e0d0',
      '--theme-text-muted':    '#666',
      '--theme-glow-primary':  '0 0 20px rgba(212,168,67,0.08)',
      '--theme-font':          "'Georgia', serif",
      '--theme-title-spacing': '5px',
    }
  },

  // ---- CORPORATE / ESPIONAGE ----
  corporate: {
    keywords: ['corporate', 'espionage', 'office', 'ceo', 'boardroom', 'executive', 'company', 'business', 'spy', 'leak', 'whistleblow'],
    vars: {
      '--theme-bg-primary':    '#060608',
      '--theme-bg-secondary':  '#0c0c10',
      '--theme-bg-card':       '#121218',
      '--theme-accent-primary':'#4a9eff',
      '--theme-accent-evil':   '#e63946',
      '--theme-accent-good':   '#4a9eff',
      '--theme-border':        '#1a1a28',
      '--theme-text-primary':  '#dde8ff',
      '--theme-text-muted':    '#445',
      '--theme-glow-primary':  '0 0 24px rgba(74,158,255,0.10)',
      '--theme-font':          "'Segoe UI', system-ui, sans-serif",
      '--theme-title-spacing': '8px',
    }
  },

  // ---- SPACE / SCI-FI ----
  space: {
    keywords: ['space', 'galaxy', 'alien', 'ship', 'crew', 'station', 'planet', 'asteroid', 'mars', 'orbit', 'cosmos', 'astronaut'],
    vars: {
      '--theme-bg-primary':    '#02020a',
      '--theme-bg-secondary':  '#050514',
      '--theme-bg-card':       '#08081e',
      '--theme-accent-primary':'#9b5de5',
      '--theme-accent-evil':   '#ff6b35',
      '--theme-accent-good':   '#9b5de5',
      '--theme-border':        '#1a1a3e',
      '--theme-text-primary':  '#e8deff',
      '--theme-text-muted':    '#4a3a6a',
      '--theme-glow-primary':  '0 0 40px rgba(155,93,229,0.12)',
      '--theme-font':          "'Segoe UI', system-ui, sans-serif",
      '--theme-title-spacing': '6px',
    }
  },

  // ---- HORROR / OCCULT ----
  horror: {
    keywords: ['horror', 'cult', 'demon', 'witch', 'haunted', 'ghost', 'ritual', 'curse', 'blood', 'occult', 'vampire', 'undead', 'coven'],
    vars: {
      '--theme-bg-primary':    '#050005',
      '--theme-bg-secondary':  '#0a000a',
      '--theme-bg-card':       '#100010',
      '--theme-accent-primary':'#9d0208',
      '--theme-accent-evil':   '#9d0208',
      '--theme-accent-good':   '#c77dff',
      '--theme-border':        '#2a0028',
      '--theme-text-primary':  '#f0e0f0',
      '--theme-text-muted':    '#5a3a5a',
      '--theme-glow-primary':  '0 0 30px rgba(157,2,8,0.15)',
      '--theme-font':          "'Palatino Linotype', serif",
      '--theme-title-spacing': '4px',
    }
  },

  // ---- FANTASY / MAGIC ----
  fantasy: {
    keywords: ['fantasy', 'magic', 'wizard', 'dragon', 'elf', 'enchant', 'spell', 'potion', 'dungeon', 'quest', 'mage', 'sorcerer'],
    vars: {
      '--theme-bg-primary':    '#030a05',
      '--theme-bg-secondary':  '#060f08',
      '--theme-bg-card':       '#0a1a0c',
      '--theme-accent-primary':'#4ecb71',
      '--theme-accent-evil':   '#9d4edd',
      '--theme-accent-good':   '#4ecb71',
      '--theme-border':        '#0e2a14',
      '--theme-text-primary':  '#e0f5e8',
      '--theme-text-muted':    '#3a6a44',
      '--theme-glow-primary':  '0 0 30px rgba(78,203,113,0.10)',
      '--theme-font':          "'Palatino Linotype', 'Book Antiqua', serif",
      '--theme-title-spacing': '4px',
    }
  },

  // ---- DEFAULT (fallback) ----
  default: {
    keywords: [],
    vars: {
      '--theme-bg-primary':    '#080810',
      '--theme-bg-secondary':  '#0c0c18',
      '--theme-bg-card':       '#0f0f1c',
      '--theme-accent-primary':'#7b2d8b',
      '--theme-accent-evil':   '#e63946',
      '--theme-accent-good':   '#00b4d8',
      '--theme-border':        '#2a2a3e',
      '--theme-text-primary':  '#f0f0f0',
      '--theme-text-muted':    '#888',
      '--theme-glow-primary':  '0 0 30px rgba(123,45,139,0.12)',
      '--theme-font':          "'Segoe UI', system-ui, sans-serif",
      '--theme-title-spacing': '4px',
    }
  }
}

/**
 * Detect which theme bucket a theme string belongs to.
 */
export function detectTheme(themeStr) {
  if (!themeStr) return 'default'
  const lower = themeStr.toLowerCase()
  for (const [key, def] of Object.entries(THEMES)) {
    if (key === 'default') continue
    if (def.keywords.some(kw => lower.includes(kw))) return key
  }
  return 'default'
}

/**
 * Apply theme CSS variables to :root.
 */
export function applyTheme(themeStr) {
  const key = detectTheme(themeStr)
  const vars = THEMES[key].vars
  const root = document.documentElement
  Object.entries(vars).forEach(([prop, val]) => root.style.setProperty(prop, val))
  // Also tag body with theme class for any global overrides
  document.body.setAttribute('data-theme', key)
  return key
}

/**
 * Remove theme vars (restore CSS defaults).
 */
export function clearTheme() {
  const root = document.documentElement
  const defaultVars = THEMES.default.vars
  Object.keys(defaultVars).forEach(prop => root.style.removeProperty(prop))
  document.body.removeAttribute('data-theme')
}

/**
 * React hook — call in a component to apply theme on mount.
 */
import { useEffect } from 'react'
export function useGameTheme(themeStr) {
  useEffect(() => {
    if (!themeStr) return
    const key = applyTheme(themeStr)
    return () => clearTheme()
  }, [themeStr])
}
