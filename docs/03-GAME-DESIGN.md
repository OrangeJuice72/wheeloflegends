# Wheel of Legends — Game Design Numbers (living document)

**Status:** v1 for the vertical slice · **Last updated:** 2026-07-17

Design pillars: **"one more floor"** pull · characters feel *authentic*, not flattened ·
balance via rarity/cost/counters/synergy, never by nerfing identity · polish over quantity.

## Rarity & recruiting

| Rarity | Weight | Team cost | Stat identity |
|---|---|---|---|
| Common | 47% | 2 | honest role-players (SpongeBob, Patrick) |
| Rare | 33% | 3 | strong specialists (Pikachu, Sonic, Cap) |
| Epic | 16% | 4 | famous powerhouses (Batman, Vader†, Elsa) |
| Legendary | 4% | 6 | reality-benders (Superman, Goku, Godzilla) |

- Team cap: **5 characters and 20 cost** → a full-Legendary team is impossible; drafting
  around cost is the balance valve that lets Superman stay Superman.
- Recruiting is a **three-reel slot machine**: reel 1 = franchise/universe, reel 2 =
  rarity, reel 3 = the character. Outcome is decided by the sim at pull time; reel
  drama scales with rarity (epic+ get suspense crawls, legendaries get a spotlight
  blackout). The original wheel may return later as a cosmetic alternative sharing
  the same probability table.
- Run economy: start with **3 free spins + 150 gold**; spins cost 100 gold (+15/purchase);
  duplicates convert to +1 level for that character (+8% ATK/HP per level).

## Character authenticity (examples shipped in slice)

- **Superman (L):** extreme ATK/HP/SPD; Heat Vision ult hits hardest single number in the
  game. Counterplay: costs 6, Kryptonite Exposure debuff on some floors/enemies (M3).
- **Batman (E):** human HP, but Prep Time grants the team shields+crit at battle start and
  his crits are guaranteed vs stunned/frozen targets — tactics, not stats.
- **Godzilla (L):** enormous HP, slow SPD, Atomic Breath AoE, passive regeneration.
- **Goku (L):** fast energy generation; at 50% HP transforms (Super Saiyan: +ATK/+SPD).
- **John Wick (E):** modest HP, extreme crit rate/damage, executes low-HP targets.
- **SpongeBob (C):** absurd regen, low ATK, ability picks a random silly effect.

## Battle tuning targets

- Duration 30–90 s at 1x (fixed-tick sim; 120 s hard cap).
- Damage: `atk · mult · 100/(100+def)`; crit ×(1.5 + bonus); ±5% variance.
- Energy: +25 per basic, +8/s trickle, +10 when struck. Ult at 100.
- Front row soaks single-target hits; back row for glass cannons — formation matters.

## Synergies (slice set — data-driven, trivially extensible)

| Synergy | Tags | Thresholds |
|---|---|---|
| Justice League | justice-league | 2: +12% ATK · 3: +20% ATK, +10% HP |
| Heroic Resolve | hero | 3: +10% HP · 5: +18% HP |
| Rogues' Gallery | villain | 2: +12% ATK |
| Anime Protagonists | anime | 2: +10% crit |
| Player Characters | video-game | 2: +8% SPD · 4: +15% SPD |
| Monster Mash | monster | 2: +2%/s regen aura |
| Arcane Circle | magic | 2: +25% energy gain |
| Toon Force | cartoon | 2: +15% max HP |

## Tower (slice: floors 1–∞, content depth grows in M2/M3)

- Enemy teams generated from the same roster; budget rises per floor; stats scale
  ×(1 + 0.10·(floor−1)) with a jump on boss floors.
- **Boss every 5 floors** (named, buffed, unique intro banner). Elites/events/merchants/
  treasure/healing rooms arrive in M2 as floor-type deck.
- Rewards after every victory: choose 1 of 3 (gold, free spin, heal 40%, run-relic
  +ATK/+HP%, character +1 level). Boss floors: rarer pool + first-clear bonus.
- Defeat = run over → summary (floor, damage leaders, gold earned) → meta best-floor.

## The "one more floor" checklist (every build must preserve)

1. Next-floor button visible on reward screen with floor number and boss-proximity hint.
2. A run always ends with a near-miss story (summary shows what *almost* worked).
3. Reward choices telegraph next floor's threat (counter-drafting).
4. Recruit moments are the dopamine peaks: rare+ reveals get full-screen ceremony.
