# VERDICT Server — Agent Notes

## Scope
This folder contains the Spring Boot backend for room management, gameplay flow, WebSocket events, AI content generation, and persistence.

## Current Structure
- `controller/`
  - `RoomController`: create/join/spectate room APIs
  - `GameController`: game loop endpoints and broadcasts
  - `ConfessionController`: confession demand/answer flow
  - `LobbyWebSocketController`: lobby ping/presence plumbing
- `service/`
  - `GameMasterService`: Gemini-backed theme, role, world-event, and case-file generation
  - `GameStateService`: current in-memory gameplay state store
- `entity/GameSession`: persistent room/session metadata
- `repository/GameSessionRepository`: JPA repository

## Backend Rules
- Keep room management under `/api/rooms/**`.
- Keep gameplay endpoints under `/api/game/**`.
- Keep environment-dependent values in properties or environment variables, never hardcoded secrets.
- Keep `VerdictApplication` configured with `@EnableJpaRepositories` unless you intentionally rework repository scanning.
- Treat `GameStateService` as temporary process-local state. If you refactor it, be explicit whether you are fixing local correctness or doing the full Redis migration.
- Be careful with event timing. The current game loop uses background threads and sleeps; changes here can easily create duplicate or out-of-order phase transitions.

## Persistence And State
- PostgreSQL is the active persistence layer for `GameSession`.
- Redis libraries are present, but active gameplay state is not yet stored there.
- If you migrate gameplay state to Redis, document:
  - TTL policy
  - serialization format
  - restart behavior
  - multi-instance behavior

## Risk Areas
- Identity is currently tied too closely to display names in parts of the runtime state and private topic naming.
- Reset/start/vote endpoints should be reviewed carefully for authorization and consistency when changed.
- WebSocket event contracts are consumed directly by the frontend, so payload changes must be coordinated.

## Run And Verify
```powershell
cd server
$env:DB_URL="jdbc:postgresql://localhost:5433/verdict"
$env:DB_USER="verdict"
$env:DB_PASS="verdict"
$env:GEMINI_API_KEY="your-key"
mvn spring-boot:run
```

Tests:
```powershell
cd server
mvn test
```

Manual verification after backend changes:
- create room
- join room
- start game as host
- confirm role delivery over WebSocket
- confirm ability/discussion/voting transitions
- confirm reset flow

## Important Context
- `application-local.properties` is useful for local development but makes test execution depend on a running local Postgres instance.
- `GameMasterService` currently contains Gemini-specific HTTP calls. If you introduce an abstraction layer, keep controllers and state services provider-agnostic.
- Preserve compatibility with the current frontend event topics unless you update both sides together.
