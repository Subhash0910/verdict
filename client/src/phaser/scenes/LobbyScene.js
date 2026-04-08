import Phaser from 'phaser'

/**
 * Phase 1 Lobby Scene
 * - Animated starfield background
 * - Floating player tokens arranged in a circle
 * - Reacts to updatePlayers() calls from React
 */
export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' })
    this.playerTokens = []
    this.players = []
  }

  preload() {
    // Phase 2 will load actual sprites — for now we draw procedurally
  }

  create() {
    const { width, height } = this.scale

    // ── Starfield ──────────────────────────────────────────────────────────
    this.stars = []
    for (let i = 0; i < 200; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.FloatBetween(0.5, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.1, 0.8)
      )
      this.stars.push(star)
    }

    // ── WAITING text ──────────────────────────────────────────────────────
    this.waitingText = this.add.text(width / 2, height * 0.15, 'WAITING FOR PLAYERS', {
      fontFamily: 'Segoe UI, system-ui',
      fontSize: '16px',
      color: '#888888',
      letterSpacing: 4,
    }).setOrigin(0.5)

    // ── Verdict title ─────────────────────────────────────────────────────
    this.add.text(width / 2, height * 0.08, 'VERDICT', {
      fontFamily: 'Segoe UI, system-ui',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5)

    // ── Pulsing ring ──────────────────────────────────────────────────────
    this.ring = this.add.circle(width / 2, height / 2, 180, 0x000000, 0)
    this.ring.setStrokeStyle(1, 0x7b2d8b, 0.5)

    this.tweens.add({
      targets: this.ring,
      scaleX: 1.05,
      scaleY: 1.05,
      alpha: 0.3,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // ── Twinkle stars ─────────────────────────────────────────────────────
    this.stars.forEach(star => {
      this.tweens.add({
        targets: star,
        alpha: 0,
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
        ease: 'Sine.easeInOut',
      })
    })
  }

  /**
   * Called from React (LobbyGame.jsx) when player list changes.
   * Redraws tokens around a circle.
   */
  updatePlayers(players = []) {
    this.players = players
    const { width, height } = this.scale
    const cx = width / 2
    const cy = height / 2
    const radius = 160

    // Clear old tokens
    this.playerTokens.forEach(t => t.destroy())
    this.playerTokens = []

    if (players.length === 0) return

    const angleStep = (2 * Math.PI) / players.length

    players.forEach((p, i) => {
      const angle = angleStep * i - Math.PI / 2
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius

      // Outer glow ring for host
      if (p.isHost) {
        const glow = this.add.circle(x, y, 28, 0xe63946, 0.2)
        this.playerTokens.push(glow)
        this.tweens.add({
          targets: glow,
          scaleX: 1.3, scaleY: 1.3,
          alpha: 0,
          duration: 1200,
          yoyo: true,
          repeat: -1,
        })
      }

      // Token circle
      const color = p.isHost ? 0xe63946 : 0x7b2d8b
      const circle = this.add.circle(x, y, 22, color, 0.9)
      this.playerTokens.push(circle)

      // Initial letter
      const letter = this.add.text(x, y, (p.playerName?.[0] ?? '?').toUpperCase(), {
        fontFamily: 'Segoe UI, system-ui',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5)
      this.playerTokens.push(letter)

      // Name label
      const label = this.add.text(x, y + 36, p.playerName ?? '', {
        fontFamily: 'Segoe UI, system-ui',
        fontSize: '11px',
        color: '#cccccc',
      }).setOrigin(0.5)
      this.playerTokens.push(label)

      // Float animation
      this.tweens.add({
        targets: [circle, letter, label],
        y: `+=${Phaser.Math.Between(4, 8)}`,
        duration: Phaser.Math.Between(1800, 2400),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 120,
      })
    })
  }

  update() {
    // Slowly drift stars for parallax feel
    this.stars.forEach((star, i) => {
      star.x -= 0.05 + (i % 3) * 0.02
      if (star.x < 0) star.x = this.scale.width
    })
  }
}
