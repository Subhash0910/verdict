import React, { useState, useRef, useEffect } from 'react'
import styles from './DiscussionPhase.module.css'

export default function DiscussionPhase({ theme, myRole, players, messages, timer, onSendChat }) {
  const [input, setInput] = useState('')
  const chatRef = useRef(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const mins = String(Math.floor(timer / 60)).padStart(2, '0')
  const secs = String(timer % 60).padStart(2, '0')
  const isUrgent = timer > 0 && timer <= 30

  function send() {
    const t = input.trim()
    if (!t) return
    onSendChat(t)
    setInput('')
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.themeTitle}>{theme}</div>
        <div className={`${styles.timer} ${isUrgent ? styles.urgent : ''}`}>
          {timer > 0 ? `${mins}:${secs}` : 'VOTE NOW'}
        </div>
      </div>

      {/* Role badge */}
      <div className={styles.roleBadge}>
        <span>You are: <strong>{myRole?.role}</strong></span>
        <span className={styles.missionHint} title={myRole?.secretMission}>🎯 Mission active</span>
      </div>

      {/* Chat */}
      <div className={styles.chat} ref={chatRef}>
        {messages.length === 0 && (
          <div className={styles.emptyChat}>Discussion begins... say something suspicious 👀</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={styles.message}>
            <span className={styles.msgName}>{m.playerName}</span>
            <span className={styles.msgText}>{m.text}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Say something..."
          maxLength={200}
        />
        <button className={styles.sendBtn} onClick={send}>Send</button>
      </div>
    </div>
  )
}
