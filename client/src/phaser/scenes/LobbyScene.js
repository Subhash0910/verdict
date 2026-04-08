import Phaser from 'phaser'

/**
 * Phase 2 Lobby Scene
 * - Procedurally drawn animated character bodies (head + body + legs)
 * - Idle breathing animation
 * - Host has golden crown glow
 * - Particles / ambient dust
 * - Smooth add/remove transitions
 */
export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' })
    this.playerTokens = []
    this.players = []
    this.particles = []
  }

  preload() {}

  create() {
    const { width, height } = this.scale

    // ── Background gradient via graphics ─────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0a0014, 0x0a0014, 0x12001e, 0x0a0a0f, 1)
    bg.fillRect(0, 0, width, height)

    // ── Stars ─────────────────────────────────────────────────────────
    this.stars = []
    for (let i = 0; i < 220; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.FloatBetween(0.4, 2.2),
        0xffffff,
        Phaser.Math.FloatBetween(0.1, 0.9)
      )
      this.stars.push(s)
      this.tweens.add({
        targets: s,
        alpha: 0,
        duration: Phaser.Math.Between(900, 3500),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        ease: 'Sine.easeInOut',
      })
    }

    // ── Ambient floating dust particles ───────────────────────────────
    for (let i = 0; i < 30; i++) {
      const dust = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.FloatBetween(1, 3),
        Phaser.Math.Between(0) ? 0xe63946 : 0x7b2d8b,
        Phaser.Math.FloatBetween(0.05, 0.25)
      )
      this.particles.push(dust)
      this.tweens.add({
        targets: dust,
        x: dust.x + Phaser.Math.Between(-80, 80),
        y: dust.y - Phaser.Math.Between(40, 120),
        alpha: 0,
        duration: Phaser.Math.Between(4000, 9000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 5000),
        ease: 'Sine.easeIn',
        onRepeat: (tween, target) => {
          target.x = Phaser.Math.Between(0, width)
          target.y = Phaser.Math.Between(height * 0.5, height)
          target.alpha = Phaser.Math.FloatBetween(0.05, 0.25)
        },
      })
    }

    // ── Title ─────────────────────────────────────────────────────────
    this.add.text(width / 2, height * 0.07, 'VERDICT', {
      fontFamily: 'Segoe UI, system-ui',
      fontSize: '52px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#7b2d8b',
      strokeThickness: 2,
    }).setOrigin(0.5)

    this.waitingText = this.add.text(width / 2, height * 0.14, 'WAITING FOR PLAYERS', {
      fontFamily: 'Segoe UI, system-ui',
      fontSize: '13px',
      color: '#666666',
      letterSpacing: 5,
    }).setOrigin(0.5)

    // Pulse waiting text
    this.tweens.add({
      targets: this.waitingText,
      alpha: 0.3,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // ── Orbit ring ────────────────────────────────────────────────────
    this.ring = this.add.graphics()
    this._drawRing(width / 2, height / 2, 190)

    this.tweens.add({
      targets: this.ring,
      alpha: 0.25,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  _drawRing(cx, cy, r) {
    this.ring.clear()
    this.ring.lineStyle(1, 0x7b2d8b, 0.6)
    this.ring.strokeCircle(cx, cy, r)
    // tick marks
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const x1 = cx + Math.cos(a) * (r - 6)
      const y1 = cy + Math.sin(a) * (r - 6)
      const x2 = cx + Math.cos(a) * (r + 6)
      const y2 = cy + Math.sin(a) * (r + 6)
      this.ring.lineStyle(1, 0xe63946, 0.5)
      this.ring.lineBetween(x1, y1, x2, y2)
    }
  }

  /**
   * Called from React whenever player list changes.
   * Destroys old tokens and redraws animated character bodies.
   */
  updatePlayers(players = []) {
    this.players = players
    const { width, height } = this.scale
    const cx = width / 2
    const cy = height / 2
    const radius = 185

    this.playerTokens.forEach(t => { if (t && t.destroy) t.destroy() })
    this.playerTokens = []

    if (players.length === 0) return

    const angleStep = (2 * Math.PI) / players.length

    players.forEach((p, i) => {
      const angle = angleStep * i - Math.PI / 2
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius

      this._drawCharacter(x, y, p, i)
    })
  }

  _drawCharacter(x, y, player, index) {
    const isHost = player.isHost
    const bodyColor = isHost ? 0xe63946 : 0x7b2d8b
    const skinColor = 0xf4c896
    const delay = index * 150
    const floatAmt = Phaser.Math.Between(5, 10)
    const floatDur = Phaser.Math.Between(1800, 2600)

    const group = [] // collect all objects for this character

    // ── Host crown glow ──────────────────────────────────────────────
    if (isHost) {
      const glow = this.add.circle(x, y - 28, 36, 0xffd700, 0.12)
      this.tweens.add({
        targets: glow,
        scaleX: 1.4, scaleY: 1.4,
        alpha: 0,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        delay,
      })
      group.push(glow)
    }

    // ── Shadow ───────────────────────────────────────────────────────
    const shadow = this.add.ellipse(x, y + 38, 32, 8, 0x000000, 0.35)
    group.push(shadow)

    // ── Legs (two rects) ─────────────────────────────────────────────
    const legL = this.add.rectangle(x - 6, y + 18, 8, 18, bodyColor)
    const legR = this.add.rectangle(x + 6, y + 18, 8, 18, bodyColor)
    legL.setOrigin(0.5, 0)
    legR.setOrigin(0.5, 0)
    group.push(legL, legR)

    // Leg sway animation
    this.tweens.add({
      targets: legL,
      angle: 12,
      duration: floatDur * 0.4,
      yoyo: true,
      repeat: -1,
      delay,
      ease: 'Sine.easeInOut',
    })
    this.tweens.add({
      targets: legR,
      angle: -12,
      duration: floatDur * 0.4,
      yoyo: true,
      repeat: -1,
      delay: delay + floatDur * 0.2,
      ease: 'Sine.easeInOut',
    })

    // ── Body ─────────────────────────────────────────────────────────
    const body = this.add.rectangle(x, y, 28, 28, bodyColor)
    body.setOrigin(0.5, 0.5)
    group.push(body)

    // Breathing — scale Y slightly
    this.tweens.add({
      targets: body,
      scaleY: 1.08,
      duration: floatDur * 0.55,
      yoyo: true,
      repeat: -1,
      delay,
      ease: 'Sine.easeInOut',
    })

    // ── Arms ─────────────────────────────────────────────────────────
    const armL = this.add.rectangle(x - 18, y - 2, 8, 18, bodyColor)
    const armR = this.add.rectangle(x + 18, y - 2, 8, 18, bodyColor)
    armL.setOrigin(0.5, 0)
    armR.setOrigin(0.5, 0)
    group.push(armL, armR)

    this.tweens.add({
      targets: armL,
      angle: -18,
      duration: floatDur * 0.6,
      yoyo: true,
      repeat: -1,
      delay,
      ease: 'Sine.easeInOut',
    })
    this.tweens.add({
      targets: armR,
      angle: 18,
      duration: floatDur * 0.6,
      yoyo: true,
      repeat: -1,
      delay: delay + floatDur * 0.3,
      ease: 'Sine.easeInOut',
    })

    // ── Head ─────────────────────────────────────────────────────────
    const head = this.add.circle(x, y - 22, 16, skinColor)
    group.push(head)

    // Eyes
    const eyeL = this.add.circle(x - 5, y - 24, 2.5, 0x1a1a2e)
    const eyeR = this.add.circle(x + 5, y - 24, 2.5, 0x1a1a2e)
    group.push(eyeL, eyeR)

    // Blink
    this.time.addEvent({
      delay: Phaser.Math.Between(2000, 5000) + delay,
      loop: true,
      callback: () => {
        this.tweens.add({
          targets: [eyeL, eyeR],
          scaleY: 0.1,
          duration: 60,
          yoyo: true,
          ease: 'Linear',
        })
      },
    })

    // ── Crown for host ───────────────────────────────────────────────
    if (isHost) {
      const crown = this.add.text(x, y - 46, '👑', {
        fontSize: '14px',
      }).setOrigin(0.5)
      group.push(crown)
    }

    // ── Name label ───────────────────────────────────────────────────
    const label = this.add.text(x, y + 44, player.playerName ?? '', {
      fontFamily: 'Segoe UI, system-ui',
      fontSize: '12px',
      color: '#dddddd',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5)
    group.push(label)

    // ── Whole character float ─────────────────────────────────────────
    this.tweens.add({
      targets: group,
      y: `+=${floatAmt}`,
      duration: floatDur,
      yoyo: true,
      repeat: -1,
      delay,
      ease: 'Sine.easeInOut',
    })

    this.playerTokens.push(...group)
  }

  update() {
    // Slow star drift
    this.stars.forEach((s, i) => {
      s.x -= 0.04 + (i % 4) * 0.015
      if (s.x < 0) s.x = this.scale.width
    })
  }
}
