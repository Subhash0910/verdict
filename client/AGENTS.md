# VERDICT Client — Agent Notes

## Scope
This folder contains the React + Vite + Phaser frontend for VERDICT.

## Current Structure
- `src/App.jsx` handles top-level screen switching between home, lobby, and game.
- `src/screens/` contains React screen-level UI.
- `src/components/` contains reusable game-phase and overlay components.
- `src/hooks/useLobbySocket.js` manages lobby WebSocket subscriptions.
- `src/phaser/` contains the lobby canvas integration and scene code.

## Frontend Rules
- React controls routing, phase transitions, overlays, and authoritative UI state.
- Phaser is presentation-first here. Keep game rules and networking out of Phaser scenes unless you are intentionally restructuring the architecture.
- Use `useRef` guards for one-shot WebSocket side effects, especially when timers or navigation are involved.
- Prefer CSS modules over shared global styling for component work.
- Avoid inline styles except for clearly dynamic values that are awkward to express otherwise.
- Preserve UTF-8 text and emoji in JSX and user-facing strings.
- Keep new UI responsive for mobile widths.
- Respect the existing Vite proxy setup for `/api` and `/ws`.

## Styling Guidance
- Prefer existing theme tokens and shared styling patterns before introducing new visual primitives.
- If you introduce more colors, centralize them instead of scattering hardcoded values.
- Avoid growing the current amount of one-off inline styling in screen components.

## Build And Verification
```powershell
cd client
npm install
npm run dev
npm run build
```

Manual checks:
- home screen create/join/watch flows
- lobby updates over WebSocket
- game start transition only firing once
- spectator view behavior
- play-again reset returning users to lobby cleanly

## Important Context
- `vite.config.js` injects `__BUILD_TIME__` for cache invalidation. Keep that behavior unless you replace it with an equivalent system.
- The production bundle is already large, so prefer code-splitting or incremental imports when adding heavy dependencies.
- If Phaser expands beyond the lobby, introduce a more explicit lifecycle manager instead of spawning loosely managed game instances from React components.
