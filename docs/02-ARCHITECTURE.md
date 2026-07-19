# Wheel of Legends — Architecture

**Status:** Approved · **Last updated:** 2026-07-17

## 1. Layer map

```
src/
  core/     Engine-agnostic utilities. No gameplay knowledge.
            Rng (seeded), Tween engine + easings, Save (localStorage).
  data/     Content and its types. Pure records, no logic beyond validation.
            characters, abilities (as data using ability components), synergies,
            rarities, floors/tower scaling, reward tables, balance constants.
  sim/      Deterministic gameplay logic. Imports core + data ONLY.
            Battle simulation → BattleEvent[], RunState (roster/gold/floor/relics),
            TowerGen (enemy teams per floor), Recruit (weighted pools), Rewards,
            Synergy resolution, damage formulas.
  audio/    WebAudio SFX synthesis. Imports nothing above core.
  ui/       Everything the player sees. Imports all other layers.
    theme.ts        Design tokens: palette, gradients, text styles, spacing.
    components/     Button, Panel, CharacterCard, HpBar, ResourceBar, chips…
    fx/             Particles, screen shake, damage numbers, flashes, beams.
    screens/        Menu, Recruit (wheel), Team/Formation, Battle, Rewards, Summary.
  app/      Bootstrap + SceneManager (fade transitions, ticker, resize).
  main.ts   Entry point.
```

**Dependency rule (enforced):** `core ← data ← sim` and `core ← audio`; `ui`/`app` may
import anything; nothing imports `ui` except `app`. `sim` and `data` never touch pixi,
DOM, or audio.

## 2. The battle pipeline (heart of the game)

```
RunState ──► TowerGen ──► simulateBattle(player, enemy, seed)
                              │  pure, instant (<5ms), deterministic
                              ▼
                       BattleResult { winner, events: BattleEvent[] (timestamped) }
                              │
                              ▼
                 BattleScene replays events on a scaled clock
                 (pause / 1x / 2x / 3x = clock rate only)
                              │
                              ▼
              cards animate · damage numbers · shake · sfx · combat log
```

`BattleEvent` is a discriminated union: `spawn, act, damage, heal, shield, status,
energy, transform, death, synergy, end`. The presentation layer is a dumb performer:
it can drop or speed effects without ever changing an outcome.

### Simulation model
- Fixed-tick (100 ms) time-stepped auto-battle, hard cap 120 s (timeout → attacker of
  record loses ties by remaining HP%).
- Each unit: action meter fills by SPD; on full, act: **ultimate** if energy ≥ 100 →
  **skill** if off cooldown → **basic** (basic grants energy).
- Abilities are compositions of reusable **effect components**
  (damage single/AoE/random/multi-hit, heal, shield, buff, debuff, status, taunt,
  transform, ramp) — characters are data that parameterize components.
- Statuses tick once per second: burn/shock (DoT), stun/freeze (skip), regen, shield
  absorb, atk/def modifiers.
- Targeting: taunt > front row > ability preference (e.g. `lowestHp`, `backline`, `all`).
- Damage: `atk · mult · 100/(100+def)`, crit multiplies, ±5% seeded variance.

## 3. Run & meta state

- `RunState`: seed, floor, gold, spins, roster (team ≤ 5 + bench), team-cost cap,
  per-run relic modifiers, levels. Serializable to JSON at all times (save-anywhere).
- Meta (localStorage): best floor, lifetime stats, unlocks (M4), settings (audio, speed,
  recruit style preference).

## 4. Scene flow

```
Menu ─ new run ─► Recruit (wheel/slots) ─► Team & Formation ─► Battle ─► Rewards ─┐
  ▲                     ▲                                        │ defeat          │
  └── Run Summary ◄─────┴────────────────────────────────────────┘     next floor ─┘
```

SceneManager owns one active scene + fade transitions; scenes are display containers
with `enter/exit/update(dt)` lifecycles. A shared ticker drives tweens, particles, and
battle playback.

## 5. Presentation systems

- **Tween engine** (core): eased property animation with chaining/delays; every button,
  card, panel, and number uses it. One global timescale hook (pause-safe).
- **FX layer**: pooled particle emitter (textures generated at boot from Graphics),
  camera-shake container wrapping each scene, floating damage numbers, beam/impact
  primitives, rarity glow pulses.
- **Audio**: synthesized SFX (clicks, wheel ticks, whooshes, impacts, crits, reveal
  stings, victory/defeat motifs) through a master gain; no binary assets, no licensing
  risk, instant load.
- **Theme**: single source of design tokens; no hex literal outside `theme.ts`.

## 6. Testing strategy

- **Vitest** on `sim/` + `data/`: determinism (same seed ⇒ identical event streams),
  formula unit tests, synergy thresholds, recruit distribution (χ²-style tolerance on
  10k draws), tower scaling monotonicity, data validation (every character's abilities
  resolve, every tag used by a synergy exists).
- `npm run check` = `tsc --noEmit` + `vitest run` + sim/ui import-firewall grep.
  Green `check` is the merge gate for every milestone.
- Manual playtest script per milestone (documented in ROADMAP).
