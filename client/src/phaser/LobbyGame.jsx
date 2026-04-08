import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import LobbyScene from './scenes/LobbyScene'

/**
 * Mounts a Phaser 3 canvas into the React tree.
 * Passes player data to the scene via the game registry.
 */
export default function LobbyGame({ players }) {
  const containerRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: window.innerWidth - 300, // leave room for HUD sidebar
      height: window.innerHeight,
      backgroundColor: '#0a0a0f',
      scene: [LobbyScene],
    }

    gameRef.current = new Phaser.Game(config)

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  // Update scene with fresh player list whenever it changes
  useEffect(() => {
    if (!gameRef.current) return
    const scene = gameRef.current.scene.getScene('LobbyScene')
    if (scene) scene.updatePlayers(players)
  }, [players])

  return <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0 }} />
}
