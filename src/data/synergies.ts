import type { SynergyDef } from './types';

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'justice-league',
    name: 'Justice League',
    tag: 'justice-league',
    icon: '🛡',
    thresholds: [
      { count: 2, desc: '+12% ATK', bonus: { atk: 0.12 } },
      { count: 3, desc: '+20% ATK, +10% HP', bonus: { atk: 0.2, hp: 0.1 } },
    ],
  },
  {
    id: 'avengers',
    name: 'Avengers Assemble',
    tag: 'avenger',
    icon: '🅰',
    thresholds: [
      { count: 2, desc: '+10% ATK', bonus: { atk: 0.1 } },
      { count: 3, desc: '+18% ATK', bonus: { atk: 0.18 } },
    ],
  },
  {
    id: 'heroic-resolve',
    name: 'Heroic Resolve',
    tag: 'hero',
    icon: '✨',
    thresholds: [
      { count: 3, desc: '+10% HP', bonus: { hp: 0.1 } },
      { count: 5, desc: '+18% HP', bonus: { hp: 0.18 } },
    ],
  },
  {
    id: 'rogues-gallery',
    name: "Rogues' Gallery",
    tag: 'villain',
    icon: '💀',
    thresholds: [{ count: 2, desc: '+12% ATK', bonus: { atk: 0.12 } }],
  },
  {
    id: 'anime-protagonists',
    name: 'Anime Protagonists',
    tag: 'anime',
    icon: '🔥',
    thresholds: [{ count: 2, desc: '+10% Crit', bonus: { crit: 0.1 } }],
  },
  {
    id: 'player-characters',
    name: 'Player Characters',
    tag: 'video-game',
    icon: '🎮',
    thresholds: [
      { count: 2, desc: '+8% SPD', bonus: { spd: 0.08 } },
      { count: 4, desc: '+15% SPD', bonus: { spd: 0.15 } },
    ],
  },
  {
    id: 'monster-mash',
    name: 'Monster Mash',
    tag: 'monster',
    icon: '🦖',
    thresholds: [{ count: 2, desc: '+0.6%/s Regen', bonus: { regenPerSec: 0.006 } }],
  },
  {
    id: 'arcane-circle',
    name: 'Arcane Circle',
    tag: 'magic',
    icon: '🔮',
    thresholds: [{ count: 2, desc: '+25% Energy Gain', bonus: { energyGain: 0.25 } }],
  },
  {
    id: 'toon-force',
    name: 'Toon Force',
    tag: 'cartoon',
    icon: '🎨',
    thresholds: [{ count: 2, desc: '+15% HP', bonus: { hp: 0.15 } }],
  },
  {
    id: 'royal-court',
    name: 'Royal Court',
    tag: 'royal',
    icon: '👑',
    thresholds: [{ count: 2, desc: '+20% DEF', bonus: { def: 0.2 } }],
  },
  {
    id: 'turtle-power',
    name: 'Turtle Power',
    tag: 'tmnt',
    icon: '🐢',
    thresholds: [
      { count: 2, desc: '+10% ATK', bonus: { atk: 0.1 } },
      { count: 4, desc: '+22% ATK, +10% SPD', bonus: { atk: 0.22, spd: 0.1 } },
    ],
  },

  // ── universe bonds ──────────────────────────────────────────────────────
  // Fielding legends from one home universe pays off, so building around a
  // franchise competes with simply drafting the five strongest cards.
  {
    id: 'dc-united', name: 'DC United', franchise: 'dc', icon: '🦇',
    thresholds: [
      { count: 2, desc: '+8% ATK, +8% HP', bonus: { atk: 0.08, hp: 0.08 } },
      { count: 3, desc: '+15% ATK, +15% HP', bonus: { atk: 0.15, hp: 0.15 } },
    ],
  },
  {
    id: 'marvel-united', name: 'Marvel Alliance', franchise: 'marvel', icon: '🕸',
    thresholds: [
      { count: 2, desc: '+8% ATK, +6% Crit', bonus: { atk: 0.08, crit: 0.06 } },
      { count: 3, desc: '+15% ATK, +10% Crit', bonus: { atk: 0.15, crit: 0.1 } },
    ],
  },
  {
    id: 'anime-bond', name: 'Shonen Spirit', franchise: 'anime', icon: '🔥',
    thresholds: [
      { count: 2, desc: '+10% ATK', bonus: { atk: 0.1 } },
      { count: 3, desc: '+18% ATK, +10% SPD', bonus: { atk: 0.18, spd: 0.1 } },
    ],
  },
  {
    id: 'force-bond', name: 'The Force', franchise: 'star-wars', icon: '⚔',
    thresholds: [
      { count: 2, desc: '+10% DEF, +8% Energy', bonus: { def: 0.1, energyGain: 0.08 } },
      { count: 3, desc: '+20% DEF, +15% Energy', bonus: { def: 0.2, energyGain: 0.15 } },
    ],
  },
  {
    id: 'mushroom-crew', name: 'Mushroom Kingdom', franchise: 'mario', icon: '🍄',
    thresholds: [
      { count: 2, desc: '+10% HP, +6% SPD', bonus: { hp: 0.1, spd: 0.06 } },
      { count: 3, desc: '+18% HP, +12% SPD', bonus: { hp: 0.18, spd: 0.12 } },
    ],
  },
  {
    id: 'nintendo-allstars', name: 'Nintendo All-Stars', franchise: 'nintendo', icon: '🎮',
    thresholds: [
      { count: 2, desc: '+9% ATK, +9% DEF', bonus: { atk: 0.09, def: 0.09 } },
      { count: 3, desc: '+16% ATK, +16% DEF', bonus: { atk: 0.16, def: 0.16 } },
    ],
  },
  {
    id: 'pokemon-party', name: 'Full Party', franchise: 'pokemon', icon: '⚡',
    thresholds: [
      { count: 2, desc: '+8% ATK, +8% SPD', bonus: { atk: 0.08, spd: 0.08 } },
      { count: 3, desc: '+15% ATK, +14% SPD', bonus: { atk: 0.15, spd: 0.14 } },
    ],
  },
  {
    id: 'disney-magic', name: 'Disney Magic', franchise: 'disney', icon: '✨',
    thresholds: [
      { count: 2, desc: '+10% HP, +2%/s regen', bonus: { hp: 0.1, regenPerSec: 0.002 } },
      { count: 3, desc: '+18% HP, +4%/s regen', bonus: { hp: 0.18, regenPerSec: 0.004 } },
    ],
  },
  {
    id: 'toon-crew', name: 'Saturday Morning', franchise: 'toons', icon: '📺',
    thresholds: [
      { count: 2, desc: '+10% SPD, +5% Crit', bonus: { spd: 0.1, crit: 0.05 } },
      { count: 3, desc: '+18% SPD, +10% Crit', bonus: { spd: 0.18, crit: 0.1 } },
    ],
  },
  {
    id: 'bikini-bottom', name: 'Bikini Bottom', franchise: 'spongebob', icon: '🍍',
    thresholds: [
      { count: 2, desc: '+12% HP, +8% DEF', bonus: { hp: 0.12, def: 0.08 } },
      { count: 3, desc: '+20% HP, +16% DEF', bonus: { hp: 0.2, def: 0.16 } },
    ],
  },
  {
    id: 'silver-screen', name: 'Silver Screen', franchise: 'cinema', icon: '🎬',
    thresholds: [
      { count: 2, desc: '+8% ATK, +8% Crit', bonus: { atk: 0.08, crit: 0.08 } },
      { count: 3, desc: '+15% ATK, +14% Crit', bonus: { atk: 0.15, crit: 0.14 } },
    ],
  },
  {
    id: 'sewer-lair', name: 'Sewer Lair', franchise: 'tmnt', icon: '🍕',
    thresholds: [
      { count: 2, desc: '+10% ATK, +10% DEF', bonus: { atk: 0.1, def: 0.1 } },
      { count: 3, desc: '+18% ATK, +18% DEF', bonus: { atk: 0.18, def: 0.18 } },
    ],
  },
];
