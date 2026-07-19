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
];
