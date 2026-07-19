# Wheel of Legends — Technical Design & Stack Decision

**Status:** Approved (studio decision, pre-production)
**Last updated:** 2026-07-17

## 1. What kind of game is this, technically?

Strip away theme and Wheel of Legends is:

- A **2D interface-driven game**: every screen is UI — cards, panels, wheels, bars, logs.
- An **event-replay presentation** over a **deterministic simulation**: battles are computed
  instantly, then *performed* for the player at 1x/2x/3x with pause.
- A **data-driven content system**: characters, abilities, synergies, floors, and rewards are
  content records, not code.
- A **juice-heavy product**: tweens, particles, screen shake, damage numbers, reveal
  cinematics. Polish *is* the game.

The engine decision must optimize for those four properties — not for 3D scenes, physics,
or level editing, none of which this game uses.

## 2. Stack decision

| Layer | Choice | Version |
|---|---|---|
| Language | **TypeScript (strict)** | 5.x |
| Rendering | **PixiJS (WebGL/WebGPU scene graph)** | 8.x |
| Build/dev | **Vite** | 7.x |
| Testing | **Vitest** (simulation + probability tests) | 3.x |
| Audio | **WebAudio, procedurally synthesized SFX** | native |
| Persistence | localStorage (meta), JSON save schema | native |
| Desktop shipping (M5) | **Tauri** (small native wrapper) | 2.x |

### Why this stack wins for *this* game

1. **The simulation stays pure.** The battle engine is plain TypeScript with no rendering
   imports. It takes `(playerTeam, enemyTeam, seed)` and returns a winner plus a timestamped
   event stream. That gives us: unit tests for every formula, determinism (same seed = same
   battle, which makes bug reports reproducible), instant simulation for balance tooling
   (run 10,000 battles headless in seconds), and trivially correct pause/2x/3x — the
   presentation layer just replays events at a different clock rate.

2. **PixiJS is the best-in-class renderer for exactly this aesthetic.** Glossy card games
   live on gradients, glows, blend modes, particles layered over UI, and thousands of
   animated display objects. Pixi's batched WebGL renderer handles that at 60fps trivially,
   and its filter/shader pipeline gives us the "rich lighting" look (bloom-style glows,
   animated card shines) without fighting a 3D engine's UI system.

3. **Iteration speed compounds into polish.** Vite hot-reloads a change in under a second.
   When the mandate is "polish over quantity," the team that can try 40 easing curves an
   hour ships a better-feeling game than the team that can try 6. This is the single
   biggest predictor of juice quality.

4. **Data-driven by default.** Character/ability/synergy definitions are typed TS/JSON
   records validated at load. Swapping the prototype roster for original IP later is a
   content change, not a refactor.

5. **Ships everywhere.** The same build runs in any browser during development (and for
   playtesters via a URL), then wraps in Tauri for a ~5 MB Steam-ready desktop binary.
   No porting milestone.

### Alternatives considered — and why they lost

- **Godot 4 (runner-up).** Genuinely strong 2D and a good Control/Theme UI system, and it
  would be the pick if this game had a world to walk around in. It loses here on: UI-heavy
  games fight Godot's Control layout system once designs get as bespoke as slot machines
  and radial wheels; scene-file (.tscn) content is harder to diff/generate/validate than
  typed data records; the sim would live inside engine nodes unless we deliberately firewall
  it (in TS the firewall is free — it's just a folder with no `pixi` import); and iteration
  on shader/tween polish is slower than Vite HMR. For an interface game, Pixi's "everything
  is a display object you own" model is a better fit than a scene-tree editor we'd barely use.
- **Unity.** Pays constant overhead (editor weight, UI Toolkit/UGUI friction, licensing,
  build times) for 3D capabilities we never use. Wrong tool class.
- **Phaser.** Closer, but it's a game framework (arcade scenes, physics, input helpers)
  around a renderer, and we'd bypass most of the framework. Pixi is the renderer directly,
  with a cleaner v8 API and better filter pipeline.
- **DOM/CSS UI + canvas FX hybrid.** Tempting for text-heavy screens, but split rendering
  domains make layered effects (particles *over* UI, shakes affecting everything, shaders on
  cards) painful, and game-feel timing across DOM and canvas clocks drifts. One scene graph,
  one clock.

**Rejected reasoning we explicitly did not use:** familiarity or ease. Godot would have been
*easier* to get a passable result; the stack above produces the *better* result for an
interface-driven battler and a testable simulation core.

## 3. Non-negotiable technical principles

1. **Sim/render firewall.** `src/sim/` and `src/data/` never import from `src/ui/`,
   `src/audio/`, or `pixi.js`. Enforced by review + a lint check in CI script.
2. **Determinism.** All gameplay randomness flows through a seeded RNG owned by the run.
   `Math.random()` is allowed only for cosmetic effects (particle jitter).
3. **Events, not queries.** The battle emits a typed event stream; presentation subscribes.
   The sim never knows a battle is being watched.
4. **Content is data.** Adding a character touches only `src/data/`. If it needs new code,
   the new code is a reusable ability *component*, not a character special-case.
5. **No placeholder systems pretending to work.** A feature is in a build only when its
   real data path exists end-to-end. Fake buttons are cut, not stubbed.
6. **Every milestone builds and is played before the next begins** (`npm run check` =
   typecheck + tests must pass; manual playthrough of the milestone script must pass).

## 4. Performance budget

- 60 fps on integrated graphics at 1080p; battle scene worst case (10 cards, particles,
  shake, numbers) must not exceed ~2k draw-calls-worth of batched sprites — Pixi batches
  this comfortably.
- Cold load < 2s: no runtime network fetches, fonts bundled, textures generated once at
  boot and cached.
- Sim: a full battle computes in < 5 ms (it must, for headless balance runs).
