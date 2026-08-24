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
npm run content  # validate new roster/item/arena art and definitions
npm run balance  # full-team matchup and rarity-budget audit
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

## Current state

The complete run loop now includes wheel or draft recruiting, formation bonuses,
equipment and a persistent bag, manual targeted commands or configurable auto-AI,
turn-order and enemy-intent previews, animated battles, expanded reward drafts,
branching tower routes, choice-based rest/treasure/merchant events, and distinct
multi-phase Godzilla, Bowser, and Mewtwo boss mechanics. Named run relics now
enable formation, rarity, energy, lifesteal, recovery, and economy builds. The
Legend Codex tracks collection discoveries while the Record Hall stores career
statistics. The roster currently contains 155 characters and can keep growing
through the data-driven asset folders.

Gameplay art is staged after the menu so the start screen appears quickly. Run
`npm run balance -- --samples=8 --mode=5v5` after roster or stat changes to screen
full-team mirrored matchups, rarity budgets, duplicate IDs, and win-rate outliers
before playtesting. `npm run content` reports missing definitions or art, invalid
moves and weaknesses, duplicate IDs, arena dimensions, and unmatched new assets.
