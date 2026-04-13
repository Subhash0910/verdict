# VERDICT — Core Design Document
> Version 1.0 | Status: LOCKED FOUNDATION

---

## 1. What Is VERDICT?

VERDICT is a **social thriller** for 4–6 players where AI generates the world, the factions, and the pressure — but the fun comes from **human paranoia, bluffing, and public consequences**.

AI is not the game. **AI is the director.**

Every match drops players into a dramatic scenario. Every player gets a secret identity with a personal objective. The room is forced into arguments, suspicion, alliances, and betrayals. The game produces stories people want to talk about after.

---

## 2. What VERDICT Is NOT

- Not "AI Among Us"
- Not a task-completion game
- Not a movement/map game
- Not a bot-vs-bot experience

**The difference from Among Us:**

| Dimension | Among Us | VERDICT |
|---|---|---|
| Core mechanic | Movement + task faking | Persuasion + accusation |
| Alibi system | Physical location | Social argument |
| Player info | Private mostly | Public abilities, visible trust |
| Feel | Spaceship mystery | Social tribunal / political thriller |
| Match story | Map-based | Episode-based, narrative-driven |
| AI role | None | World director / flavor engine |

---

## 3. The Three Player Emotions

Every design decision must protect these three feelings:

1. **Paranoia** — "I don't know who to trust."
2. **Power** — "My move just changed everything."
3. **Story** — "I can't believe what just happened."

If a feature doesn't serve at least one of these, it is cut.

---

## 4. The Fixed Core Loop (AI Does NOT Change This)

```
MATCH START
 └─ AI generates: theme, scenario intro, faction names, role flavor, case file
 └─ Server assigns: roles, factions, objectives (from library)

ROUND (repeat 1–3 rounds)
 ├─ PHASE 1 — EVENT
 │   └─ AI generates 1 dramatic event that shifts suspicion
 │   └─ Players may use 1 passive ability in reaction
 │
 ├─ PHASE 2 — DEBATE
 │   └─ Open accusation window (timer-based)
 │   └─ Each player may accuse ONE other player
 │   └─ Accused player defends publicly
 │
 ├─ PHASE 3 — TRIBUNAL VOTE
 │   └─ Players vote to eliminate or acquit
 │   └─ Majority eliminates; tie = no elimination
 │   └─ Eliminated player role revealed
 │
 └─ PHASE 4 — CONSEQUENCE
     └─ AI generates flavor text for what the elimination means
     └─ Trust scores update
     └─ Round ends

MATCH END
 └─ Win conditions checked
 └─ AI generates a dramatic post-match verdict summary
 └─ Roles and full story revealed to all
```

**Match length:** 15–25 minutes
**Rounds:** 3 max
**Accusations per round:** 1 per player
**Eliminations per round:** 0 or 1

---

## 5. Faction System (Handcrafted Skeleton, AI Renames)

### Base Factions (always these three archetypes):

| Archetype | Role | Win Condition |
|---|---|---|
| **Loyalist** | Protect the group, find the threat | Eliminate all antagonists |
| **Infiltrator** | Avoid detection, sabotage consensus | Survive to final round OR get innocents eliminated |
| **Wildcard** | Personal hidden agenda | Unique per role |

### AI Reskinning Examples:

| Theme | Loyalist Name | Infiltrator Name | Wildcard Name |
|---|---|---|---|
| Space Horror | Crew | Phantom | Signal-Bound |
| Royal Court | Loyalists | Usurper | Oracle |
| Cyber Conspiracy | Analysts | Ghost | Mole |
| Corporate Scandal | Board | Saboteur | Whistleblower |
| Ancient Cult | Faithful | Heretic | Prophet |

AI never invents new faction mechanics. It only renames and writes flavor.

---

## 6. Role Library (Handcrafted, AI Reflavors)

Minimum viable set: **8–12 roles**. Each role has:
- A faction alignment
- 1 active OR passive ability
- A win objective

### Core Roles (v1 Locked Set):

| Role | Faction | Ability | Win Condition |
|---|---|---|---|
| **Sentinel** | Loyalist | Once per game: reveal if a player's last accusation was truthful or deflected | Eliminate infiltrator |
| **Advocate** | Loyalist | Can grant 1 player immunity from vote this round | Eliminate infiltrator |
| **Witness** | Loyalist | Sees a partial clue each round | Eliminate infiltrator |
| **Shadow** | Infiltrator | Once per game: redirect an accusation to another player | Survive + loyalist eliminated |
| **Deceiver** | Infiltrator | Can publicly claim any role once (bluff) | Survive to final round |
| **Architect** | Wildcard | Wins if a specific player (unknown to others) is eliminated | Get target eliminated |
| **Martyr** | Wildcard | Wins if they themselves are eliminated by vote | Get voted out |
| **Broker** | Wildcard | Can offer a visible "deal" publicly; if accepted, both parties get a clue | Broker 2 successful deals |

AI renames and writes backstory for each role to match the theme. The mechanics never change.

---

## 7. Theme Library (Handcrafted Frames, AI Expands Flavor)

Minimum: **6–10 themes** before launch.

Each theme has:
- Setting (1 sentence)
- Stakes (1 sentence)  
- Faction default names
- Suggested event types

### Starter Themes:

1. **Space Horror** — Crew aboard a dying vessel, one of them is not human
2. **Royal Court** — A king is dead, someone in the court is responsible
3. **Cyber Conspiracy** — A corporate server breach, one analyst is the mole
4. **Ancient Cult** — A ritual went wrong, a heretic walks among the faithful
5. **Corporate Scandal** — A whistleblower threatens to expose everything
6. **Political Tribunal** — A senator is accused; someone in the inner circle planted the evidence

AI generates: scenario intro text, case file, event text, post-match verdict.  
AI does NOT generate: mechanics, win conditions, or phase structure.

---

## 8. AI Boundaries — What Gemini CAN and CANNOT Do

### ✅ Gemini CAN:
- Generate theme intro / scenario framing
- Write the "case file" players receive at match start
- Name factions based on theme
- Write role flavor text (name, backstory, in-world description)
- Generate round event text (dramatic plot twist)
- Write post-match verdict summary
- Expand event descriptions from a template prompt

### ❌ Gemini CANNOT:
- Define win conditions
- Decide role assignments
- Determine who gets eliminated
- Invent new mechanics mid-game
- Generate role abilities
- Decide match structure or phase order

**Rule:** If Gemini's output is removed, the game must still function. Structure is never delegated.

---

## 9. Anti-Repeat Logic (Required Before Beta)

- No same theme twice in a row per lobby
- No same exact role combination twice in 3 consecutive matches
- Role pool shuffled with weighting to ensure variety
- Wildcard roles capped at 1 per match in v1

---

## 10. Golden Path — v1 Scope

Build this version before anything else:

- **Players:** 4–6
- **Factions:** Loyalist × Infiltrator (Wildcard optional in later patch)
- **Rounds:** 3
- **Roles:** 8 locked roles
- **Themes:** 6 locked themes
- **Match time:** ~20 minutes
- **Accusation:** 1 per player per round
- **Vote:** Majority eliminates

Do not add 3D, spectator modes, cosmetics, or new mechanics until this version produces genuinely fun matches.

---

## 11. Roadmap (What to Build Next)

### Phase 1 — Foundation Lock
- [ ] Freeze core loop in server (phases, voting, elimination)
- [ ] Build role library (8 roles, server-side, no AI dependency)
- [ ] Build theme library (6 themes, JSON/DB seeded)
- [ ] Restrict Gemini to flavor-only prompts

### Phase 2 — Playable v1
- [ ] Full match flow: lobby → roles → rounds → tribunal → verdict
- [ ] Trust score system (visible, updates per round)
- [ ] Accusation + defense UI
- [ ] Post-match story reveal

### Phase 3 — Polish & Anti-Repeat
- [ ] Anti-repeat theme/role logic
- [ ] Role balance testing (5+ matches per role)
- [ ] Gemini prompt hardening (structured output, fallback if malformed)

### Phase 4 — Expand
- [ ] Wildcard faction introduction
- [ ] Add 4 more themes
- [ ] Add 4 more roles
- [ ] Spectator / observer mode

---

## 12. The One-Sentence Pitch

> "VERDICT is a social thriller where every match is an episode — AI writes the world, but humans write the story."

---

*This document is the source of truth for VERDICT's design. Any feature that contradicts this doc requires an explicit design decision and update here first.*
