# VERDICT 🎮

> **Among Us × AI Game Master** — An AI-powered social deduction game for Gen Z.

4–8 players join via a shared link. The AI generates unique roles, secret missions, and win conditions every single game. The AI-written "case file" at the end is the screenshot players share.

## Stack

| Layer | Tech |
|---|---|
| Backend | Spring Boot 3 + WebSocket (STOMP) |
| Frontend | Vite + React 18 + Phaser 3 |
| AI Game Master | Google Gemini API |
| Session State | Upstash Redis |
| Persistence | PostgreSQL (Render free tier) |
| Deployment | Railway (backend) + Vercel (frontend) |

## Cost

**₹0/month** until you have real users with real money.

## Monorepo Structure

```
verdict/
├── server/          # Spring Boot backend
├── client/          # Vite + React + Phaser 3 frontend
├── .gitignore
└── README.md
```

## Phases

- **Phase 1** ✅ — Room creation + WebSocket lobby + Phaser lobby screen
- **Phase 2** — AI Game Master role generation (Gemini API)
- **Phase 3** — In-game mechanics (voting, accusations, missions)
- **Phase 4** — AI case file end screen (shareable image)
- **Phase 5** — Polish, deployment, go live

## Getting Started

### Backend
```bash
cd server
./mvnw spring-boot:run
```

### Frontend
```bash
cd client
npm install
npm run dev
```

Backend runs on `http://localhost:8080`, frontend on `http://localhost:5173`.
