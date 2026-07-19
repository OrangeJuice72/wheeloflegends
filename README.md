# Wheel of Legends

A roguelite tower-climbing team battler. Pull the Legend Slots — universe, rarity,
character — recruit who lands on the payline, build a team around cost and
synergies, and climb an endless tower of auto-battles — one more floor, always.

**Prototype notice:** the roster uses recognizable fictional characters for
development/testing only. All character identity lives in `src/data/` and must be
replaced with original IP before any public release (tracked as an M5 ship-blocker).

## Quick start

```bash
npm install
npm run dev      # play at http://localhost:5173
npm run check    # typecheck + simulation test suite (the merge gate)
npm run build    # production build
```

## Documentation

| Doc | Contents |
|---|---|
| [docs/01-TECH-DESIGN.md](docs/01-TECH-DESIGN.md) | Stack decision (TS + PixiJS 8 + Vite) and why it beat Godot/Unity |
| [docs/02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md) | Layer map, sim/render firewall, battle event pipeline |
| [docs/03-GAME-DESIGN.md](docs/03-GAME-DESIGN.md) | Rarities, economy, synergies, tower scaling, tuning targets |
| [docs/04-ROADMAP.md](docs/04-ROADMAP.md) | Milestones M0–M5, playtest scripts, risk register |

## Architecture in one paragraph

Battles are computed instantly by a **pure, deterministic simulation**
(`src/sim/`, zero rendering imports) that emits a timestamped event stream; the
PixiJS presentation layer (`src/ui/`) *performs* that stream on a scaled clock,
which is why pause/2×/3× can never change an outcome and why every battle is
reproducible from its seed. Characters, abilities, synergies, and tuning are
data (`src/data/`); audio is synthesized at runtime (`src/audio/`, no binary
assets). `src/core/` holds the seeded RNG, tween engine, and save layer.

## Portrait art pipeline

Every character renders a hand-built **vector emblem portrait** (bat-signal,
S-crest, arc reactor, Triforce, kanji patch…) with layered card lighting. To
upgrade any character to painted art, drop a PNG named after its id into
`src/assets/portraits/` (e.g. `superman.png`) — it is bundled automatically and
replaces the emblem on every card surface. See
[src/assets/portraits/README.md](src/assets/portraits/README.md).

## Current state — Milestone 1 (vertical slice) ✅

Full loop: menu → wheel recruiting with rarity reveal ceremonies → formation
with team-cost cap and live synergies → auto-battle with FX/SFX/log and speed
controls → reward drafts → persistent-HP climbing → defeat summary → best-floor
meta persistence. 21 characters, 10 synergies, boss floors every 5.

Next: M2 — slot-machine recruit mode, floor-type variety (elites, events,
merchants), relic build-arounds, equipment. See the roadmap.
