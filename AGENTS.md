# VERDICT — Agent Instructions

## Project Overview
VERDICT is an AI-powered social deduction browser game with a full-stack monorepo:
- `server/`: Spring Boot 3, Java 17, REST + STOMP/WebSocket backend
- `client/`: React 18, Vite 5, Phaser 3.80 frontend

Current repo reality:
- AI generation is handled by `GameMasterService.java` using the Gemini API directly.
- Gameplay state currently lives in the in-memory `GameStateService` map.
- Room/session metadata is persisted through JPA/PostgreSQL.
- Redis dependencies exist in the backend, but live gameplay state has not been migrated there yet.

Target direction:
- Keep the AI layer provider-agnostic when refactoring. If an `AIService` interface and `GeminiService` implementation are introduced later, do not hardcode provider-specific logic into controllers.
- Move room/game state to Redis with TTL once the persistence migration is implemented.

## Architecture Rules
- Preserve the monorepo split: browser/game UI in `client`, game orchestration and persistence in `server`.
- Keep gameplay state ownership on the backend. The frontend should render and react to server state, not invent authoritative game outcomes locally.
- Treat `GameStateService` as the current source of truth for round flow until a Redis migration happens.
- Do not spread Gemini-specific request logic beyond `GameMasterService` unless you are explicitly doing an AI-layer refactor.
- Keep WebSocket usage explicit and topic-based. Current repo topics include:
  - `/topic/lobby/{roomCode}`
  - `/topic/game/{roomCode}`
  - `/topic/game/{roomCode}/chat`
  - `/topic/game/{roomCode}/role/{playerName}`
  - `/topic/game/{roomCode}/confess/{playerName}`
- If you evolve the event model, prefer adding new typed events over overloading one payload shape.

## Frontend Rules
- React owns navigation, overlays, and game-phase UI.
- Phaser is currently used for the animated lobby presentation. Do not let Phaser become the source of truth for room or game state.
- Any WebSocket-driven `useEffect` that can trigger navigation, timers, or one-shot transitions must use `useRef` guards to prevent duplicate firing.
- Prefer CSS modules for component styling.
- Avoid inline styles except when values are truly dynamic and not practical in CSS modules.
- Prefer literal UTF-8 emoji in JSX instead of Unicode escape sequences.
- Mobile behavior matters. New UI should include responsive behavior for small screens.
- The service worker cache-busting flow in `client/vite.config.js` is intentional. Do not remove `__BUILD_TIME__` unless replacing it with an equivalent cache invalidation strategy.
- If you expand Phaser usage, introduce a stable lifecycle boundary. Avoid creating unmanaged `new Phaser.Game()` instances across multiple React mounts.

## Backend Rules
- Room/lobby operations belong under `/api/rooms/**`.
- Gameplay actions belong under `/api/game/**`.
- Keep secrets in environment variables only.
- Keep `@EnableJpaRepositories` on `VerdictApplication` unless the persistence setup is being intentionally redesigned.
- Keep eager loading on `GameSession` collections unless you fully address the original lazy-init behavior.
- If you touch game-state persistence, document whether the change affects only process-local play or multi-instance durability.
- Be careful with identity keys. The current code often uses player display names inside runtime state and private topics; avoid making that coupling worse.

## How To Run
Backend:
```powershell
cd server
$env:DB_URL="jdbc:postgresql://localhost:5433/verdict"
$env:DB_USER="verdict"
$env:DB_PASS="verdict"
$env:GEMINI_API_KEY="your-key"
mvn spring-boot:run
```

Frontend:
```powershell
cd client
npm install
npm run dev
```

Database:
```powershell
docker run -d --name verdict-pg `
  -e POSTGRES_USER=verdict `
  -e POSTGRES_PASSWORD=verdict `
  -e POSTGRES_DB=verdict `
  -p 5433:5432 postgres:16-alpine
```

## Testing And Verification
- There is no meaningful automated gameplay test suite yet.
- Minimum manual verification flow:
  - create room
  - join from another client
  - start game
  - verify role reveal
  - verify ability phase
  - verify discussion/chat/confession flow
  - verify voting and elimination
  - verify game over and play-again reset
- Frontend production sanity check:
  - `cd client`
  - `npm run build`
- Backend sanity check:
  - `cd server`
  - `mvn test`
- Note: backend tests currently expect a local database profile and may fail on a clean machine if Postgres is not running.

## Known Context
- `MIN_PLAYERS` currently differs between frontend and backend. Frontend lobby uses `4`, backend start gate currently allows lower values. Align them deliberately if you change this.
- Game state is not Redis-backed yet despite project direction comments.
- Confession flow is handled through discussion-phase UI and private confession topics.
- Spectator mode is implemented and should not receive playable roles.
- The current bundle is fairly large in production, so new frontend work should avoid unnecessary bundle growth.

## Git Conventions
- Use one logical change per commit.
- Prefer commit messages like:
  - `feat: ...`
  - `fix: ...`
  - `polish: ...`
- Do not bundle unrelated fixes into the same change.
- Before starting a substantial Codex task, inspect git state so you do not overwrite unrelated local work.
