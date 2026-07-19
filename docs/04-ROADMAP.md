# Wheel of Legends — Milestone Roadmap

Every milestone ends in a **playable build** with a green `npm run check` and a passed
manual playtest script. No milestone starts before the previous one is verified.

## M0 — Foundation *(bundled into M1 for the slice)*
Project scaffold, strict TS, Vite, Vitest, theme tokens, SceneManager, tween engine,
seeded RNG, WebAudio synth, CI check script.
**Playable:** animated main menu with responsive buttons and SFX.

## M1 — Vertical Slice ("the loop exists and feels good") ◄ CURRENT
- Full loop: Menu → Spin wheel → Recruit → Team/Formation → Auto-battle → Reward choice
  → next floor → defeat → run summary → meta best-floor.
- ~20 data-driven characters across 4 rarities; 8 synergies; boss floors 5/10/…
- Battle presentation: cards, HP/energy bars, floating damage, crits, shake, status
  icons, ability banners, combat log, pause/1x/2x/3x.
- Wheel with real easing physics, tick SFX, rarity reveal ceremony.
- Synthesized SFX throughout; every button tweens.
**Playtest script:** finish 2 runs; reach floor 6+; verify one Legendary reveal ceremony;
verify pause/3x mid-battle; verify defeat summary and best-floor persistence.

## M2 — Depth ("runs feel different")
~~Slot-machine recruit mode~~ *(shipped early by user request — slots replaced the
wheel as the primary recruiter, with franchise/rarity/character reels)* · floor-type
deck: elites, treasure, mystery events, merchant, healing rooms · relic system with
build-arounds · equipment drops ·
formation tactics (row targeting, taunt front-liners) · counter-picking UI (enemy team
preview) · duplicate → level pipeline surfaced in UI.
**Playtest:** two consecutive runs that play out with different floor decks and builds.

## M3 — Meta & Ascension ("reasons to come back")
Permanent progression tree (spend tower shards) · unlockable characters · ascension
difficulty modifiers · character weakness/counter events (Kryptonite floors) · full
save/resume mid-run · settings screen · stats/records screen.

## M4 — Cinematic polish pass ("screenshot bait")
Animated parallax backgrounds per tower biome · ultimate cut-in cinematics · shader work
(bloom, card foil, heat distortion) · full audio pass (music loops, per-character impact
palettes) · reveal ceremonies per rarity tier · menu ambience.

## M5 — Content, balance, ship
Balance from headless 10k-battle sim runs · roster to 30+ · achievement hooks ·
Tauri desktop wrapper, icon, installer · performance audit (60fps integrated GPU) ·
Steam-page-ready capture kit.

## Risk register
- **IP roster is dev-only.** All identity lives in `src/data/`; replacement is a content
  task before any public release. Tracked as a ship-blocker in M5.
- **Scope creep in M2.** Floor-type deck is capped at 6 types until M5.
- **OneDrive dev folder**: node_modules excluded via `.gitignore` + advise moving the
  repo out of OneDrive sync if file-lock issues appear.
