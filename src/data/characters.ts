/**
 * Prototype roster (development-only names — see docs/04-ROADMAP.md risk register).
 * Characters are authentic to who they are; balance comes from rarity, cost,
 * counters, and synergies — never from flattening identity.
 */

import type { CharacterDef } from './types';
import { applyCharacterRules } from './characterRules';
import { NEW_CHARACTERS } from './newCharacters';

export const CHARACTERS: CharacterDef[] = [
  // ───────────────────────────── LEGENDARY ─────────────────────────────
  {
    id: 'superman',
    franchise: 'dc',
    name: 'Superman',
    epithet: 'The Man of Steel',
    rarity: 'godlike',
    tags: ['hero', 'justice-league', 'alien', 'movie'],
    stats: { hp: 195000, atk: 16500, def: 70, spd: 34, crit: 0.12, critDmg: 1.5 },
    abilities: [
      { id: 'sm-basic', name: 'Steel Fist', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x3b6fe0 },
      { id: 'sm-skill', name: 'Speed Blitz', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-front', mult: 0.85, hits: 2 }], fx: 'burst', color: 0xd23a3a },
      {
        id: 'sm-ult',
        name: 'Heat Vision',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-front', mult: 4.4 },
          { kind: 'status', target: 'enemy-front', status: 'burn', duration: 3, power: 0.25 },
        ],
        fx: 'beam',
        color: 0xff3524,
      },
    ],
    passives: [],
    portrait: { glyph: '🦸', colorA: 0x1c47b8, colorB: 0xc61f2e },
  },
  {
    id: 'goku',
    franchise: 'anime',
    name: 'Goku',
    epithet: 'Saiyan Raised on Earth',
    rarity: 'godlike',
    tags: ['hero', 'anime', 'saiyan', 'alien'],
    stats: { hp: 160000, atk: 15000, def: 55, spd: 42, crit: 0.18, critDmg: 1.6 },
    abilities: [
      { id: 'gk-basic', name: 'Combo Rush', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xffa022 },
      { id: 'gk-skill', name: 'Ki Barrage', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.55, hits: 3 }], fx: 'bolt', color: 0x53c7ff },
      { id: 'gk-ult', name: 'Kamehameha', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 1.9 }], fx: 'beam', color: 0x3fb8ff },
    ],
    passives: [{ kind: 'transform', atHpPct: 0.5, name: 'SUPER SAIYAN!', atk: 0.4, spd: 0.3 }],
    portrait: { glyph: '🥋', colorA: 0xe8621a, colorB: 0x2456c9 },
  },
  {
    id: 'mewtwo',
    franchise: 'pokemon',
    name: 'Mewtwo',
    epithet: 'The Genetic Pokémon',
    rarity: 'supreme',
    tags: ['anime', 'video-game', 'monster', 'sci-fi'],
    stats: { hp: 138000, atk: 15800, def: 52, spd: 39, crit: 0.18, critDmg: 1.7 },
    abilities: [
      { id: 'mt-basic', name: 'Psycho Cut', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xc88cff },
      {
        id: 'mt-skill',
        name: 'Psychic',
        slot: 'skill',
        cooldown: 7,
        effects: [
          { kind: 'damage', target: 'enemy-back', mult: 1.8 },
          { kind: 'debuff', target: 'enemy-back', stat: 'def', amount: 0.15, duration: 4 },
        ],
        fx: 'glow',
        color: 0xb04aff,
      },
      { id: 'mt-ult', name: 'Psystrike', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 2.15 }], fx: 'nova', color: 0xe1b2ff },
    ],
    passives: [{ kind: 'dodge', chance: 0.12 }],
    portrait: { glyph: '◈', colorA: 0x36205f, colorB: 0xc88cff },
  },  {
    id: 'godzilla',
    franchise: 'cinema',
    name: 'Godzilla',
    epithet: 'King of the Monsters',
    rarity: 'supreme',
    tags: ['monster', 'movie'],
    stats: { hp: 260000, atk: 12500, def: 85, spd: 22, crit: 0.05, critDmg: 1.5 },
    abilities: [
      { id: 'gz-basic', name: 'Tail Swipe', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x37d6b0 },
      {
        id: 'gz-skill',
        name: 'Terrifying Roar',
        slot: 'skill',
        cooldown: 9,
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 0.45 },
          { kind: 'debuff', target: 'enemy-all', stat: 'atk', amount: 0.12, duration: 4 },
        ],
        fx: 'wave',
        color: 0x63e0c8,
      },
      { id: 'gz-ult', name: 'Atomic Breath', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 2.4 }], fx: 'beam', color: 0x2ee8ff },
    ],
    passives: [{ kind: 'regen', pctPerSec: 0.008 }],
    portrait: { glyph: '🦖', colorA: 0x14524a, colorB: 0x2ee8ff },
  },
  {
    id: 'darth-vader',
    franchise: 'star-wars',
    name: 'Darth Vader',
    epithet: 'Dark Lord of the Sith',
    rarity: 'legendary',
    tags: ['villain', 'movie', 'sci-fi'],
    stats: { hp: 175000, atk: 15500, def: 65, spd: 30, crit: 0.14, critDmg: 1.6 },
    abilities: [
      { id: 'dv-basic', name: 'Saber Strike', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xff2222 },
      {
        id: 'dv-skill',
        name: 'Force Choke',
        slot: 'skill',
        cooldown: 8,
        effects: [
          { kind: 'damage', target: 'enemy-back', mult: 1.5 },
          { kind: 'status', target: 'enemy-back', status: 'stun', duration: 1.5 },
        ],
        fx: 'glow',
        color: 0x9b30ff,
      },
      { id: 'dv-ult', name: 'Force Crush', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-front', mult: 3.8, lifesteal: 0.35 }], fx: 'burst', color: 0xd42222 },
    ],
    passives: [],
    portrait: { glyph: '🌑', colorA: 0x1a1a24, colorB: 0xc41818 },
  },
  {
    id: 'thor',
    franchise: 'marvel',
    name: 'Thor',
    epithet: 'God of Thunder',
    rarity: 'supreme',
    tags: ['hero', 'avenger', 'magic', 'movie'],
    stats: { hp: 185000, atk: 15800, def: 68, spd: 32, crit: 0.15, critDmg: 1.5 },
    abilities: [
      { id: 'th-basic', name: 'Mjolnir Strike', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x9ecbff },
      {
        id: 'th-skill',
        name: 'Lightning Bolt',
        slot: 'skill',
        cooldown: 7,
        effects: [
          { kind: 'damage', target: 'enemy-random', mult: 1.8 },
          { kind: 'status', target: 'enemy-random', status: 'shock', duration: 3, power: 0.12 },
        ],
        fx: 'bolt',
        color: 0x8fd4ff,
      },
      {
        id: 'th-ult',
        name: 'Bring the Thunder',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 2.0 },
          { kind: 'status', target: 'enemy-all', status: 'shock', duration: 3, power: 0.1 },
        ],
        fx: 'nova',
        color: 0xbde4ff,
      },
    ],
    passives: [],
    portrait: { glyph: '🔨', colorA: 0x27427a, colorB: 0xd8e8ff },
  },

  // ─────────────────────────────── EPIC ───────────────────────────────
  {
    id: 'charizard',
    franchise: 'pokemon',
    name: 'Charizard',
    epithet: 'The Flame Pokémon',
    rarity: 'epic',
    tags: ['anime', 'video-game', 'monster'],
    stats: { hp: 145000, atk: 13600, def: 52, spd: 34, crit: 0.14, critDmg: 1.6 },
    abilities: [
      { id: 'cz-basic', name: 'Fire Fang', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xff7a2e },
      {
        id: 'cz-skill',
        name: 'Flamethrower',
        slot: 'skill',
        cooldown: 7,
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 0.65 },
          { kind: 'status', target: 'enemy-all', status: 'burn', duration: 3, power: 0.12 },
        ],
        fx: 'wave',
        color: 0xff6a1a,
      },
      {
        id: 'cz-ult',
        name: 'Blast Burn',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-front', mult: 3.4 },
          { kind: 'status', target: 'enemy-front', status: 'burn', duration: 4, power: 0.18 },
        ],
        fx: 'burst',
        color: 0xffb02e,
      },
    ],
    passives: [{ kind: 'rage', atkPerHitTaken: 0.025, cap: 0.2 }],
    portrait: { glyph: '🔥', colorA: 0x713014, colorB: 0xff8a2e },
  },
  {
    id: 'venusaur',
    franchise: 'pokemon',
    name: 'Venusaur',
    epithet: 'The Seed Pokémon',
    rarity: 'epic',
    tags: ['anime', 'video-game', 'monster'],
    stats: { hp: 172000, atk: 10900, def: 70, spd: 27, crit: 0.08, critDmg: 1.5 },
    abilities: [
      { id: 'vn-basic', name: 'Vine Whip', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x54c437 },
      {
        id: 'vn-skill',
        name: 'Leech Seed',
        slot: 'skill',
        cooldown: 8,
        effects: [
          { kind: 'damage', target: 'enemy-front', mult: 1.25, lifesteal: 0.5 },
          { kind: 'status', target: 'self', status: 'regen', duration: 4, power: 0.04 },
        ],
        fx: 'glow',
        color: 0x42d77d,
      },
      { id: 'vn-ult', name: 'Solar Beam', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 1.85 }], fx: 'beam', color: 0xb8ff75 },
    ],
    passives: [{ kind: 'regen', pctPerSec: 0.006 }],
    portrait: { glyph: '🌿', colorA: 0x245c34, colorB: 0xe95b8d },
  },  {
    id: 'batman',
    franchise: 'dc',
    name: 'Batman',
    epithet: 'The World’s Greatest Detective',
    rarity: 'epic',
    tags: ['hero', 'justice-league', 'detective', 'movie'],
    stats: { hp: 118000, atk: 12000, def: 55, spd: 36, crit: 0.22, critDmg: 1.7 },
    abilities: [
      { id: 'bm-basic', name: 'Combat Mastery', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x8f9bb3 },
      { id: 'bm-skill', name: 'Batarang Volley', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.5, hits: 3 }], fx: 'burst', color: 0xf5c542 },
      {
        id: 'bm-ult',
        name: 'The Master Plan',
        slot: 'ult',
        effects: [
          { kind: 'shield', target: 'ally-all', mult: 1.6, duration: 8 },
          { kind: 'buff', target: 'ally-all', stat: 'crit', amount: 0.15, duration: 6 },
        ],
        fx: 'glow',
        color: 0xf5c542,
      },
    ],
    passives: [{ kind: 'prep', effects: [{ kind: 'shield', target: 'ally-all', mult: 1.0, duration: 8 }] }],
    portrait: { glyph: '🦇', colorA: 0x14161f, colorB: 0xf5c542 },
  },
  {
    id: 'wonder-woman',
    franchise: 'dc',
    name: 'Wonder Woman',
    epithet: 'Princess of Themyscira',
    rarity: 'epic',
    tags: ['hero', 'justice-league', 'warrior', 'magic', 'movie'],
    stats: { hp: 145000, atk: 13200, def: 70, spd: 33, crit: 0.14, critDmg: 1.5 },
    abilities: [
      { id: 'ww-basic', name: 'Sword of Athena', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xffd23a },
      {
        id: 'ww-skill',
        name: 'Lasso of Truth',
        slot: 'skill',
        cooldown: 7,
        effects: [
          { kind: 'damage', target: 'enemy-front', mult: 1.4 },
          { kind: 'status', target: 'enemy-front', status: 'stun', duration: 1.5 },
        ],
        fx: 'wave',
        color: 0xffc21e,
      },
      {
        id: 'ww-ult',
        name: 'Amazonian Onslaught',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-front', mult: 2.8 },
          { kind: 'buff', target: 'self', stat: 'atk', amount: 0.2, duration: 5 },
        ],
        fx: 'burst',
        color: 0xff4a4a,
      },
    ],
    passives: [],
    portrait: { glyph: '⚔️', colorA: 0x8c1f2e, colorB: 0xffd23a },
  },
  {
    id: 'elsa',
    franchise: 'disney',
    name: 'Elsa',
    epithet: 'The Snow Queen',
    rarity: 'epic',
    tags: ['royal', 'magic', 'movie'],
    stats: { hp: 125000, atk: 12800, def: 50, spd: 31, crit: 0.12, critDmg: 1.5 },
    abilities: [
      { id: 'el-basic', name: 'Ice Shard', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'bolt', color: 0x9be8ff },
      { id: 'el-skill', name: 'Frozen Armor', slot: 'skill', cooldown: 8, effects: [{ kind: 'shield', target: 'ally-lowest', mult: 2.0, duration: 6 }], fx: 'glow', color: 0xc8f2ff },
      {
        id: 'el-ult',
        name: 'Eternal Winter',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 1.6 },
          { kind: 'status', target: 'enemy-all', status: 'freeze', duration: 2 },
        ],
        fx: 'nova',
        color: 0xaef0ff,
      },
    ],
    passives: [],
    portrait: { glyph: '❄️', colorA: 0x1e5f8a, colorB: 0xbdf0ff },
  },
  {
    id: 'john-wick',
    franchise: 'cinema',
    name: 'John Wick',
    epithet: 'Baba Yaga',
    rarity: 'epic',
    tags: ['assassin', 'movie'],
    stats: { hp: 105000, atk: 13800, def: 40, spd: 40, crit: 0.35, critDmg: 2.0 },
    abilities: [
      { id: 'jw-basic', name: 'Double Tap', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 0.55, hits: 2, executeBelow: 0.25 }], fx: 'strike', color: 0xcfcfcf },
      { id: 'jw-skill', name: 'Focused Fire', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 1.8, executeBelow: 0.25 }], fx: 'bolt', color: 0xffffff },
      { id: 'jw-ult', name: 'Consequences', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.85, hits: 5, executeBelow: 0.3 }], fx: 'burst', color: 0xd8d8d8 },
    ],
    passives: [],
    portrait: { glyph: '🕴', colorA: 0x17181d, colorB: 0x8a92a6 },
  },
  {
    id: 'iron-man',
    franchise: 'marvel',
    name: 'Iron Man',
    epithet: 'Genius, Billionaire, Philanthropist',
    rarity: 'epic',
    tags: ['hero', 'avenger', 'sci-fi', 'robot', 'movie'],
    stats: { hp: 135000, atk: 13000, def: 60, spd: 34, crit: 0.15, critDmg: 1.5 },
    abilities: [
      { id: 'im-basic', name: 'Repulsor Blast', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'bolt', color: 0x7fd8ff },
      { id: 'im-skill', name: 'Missile Barrage', slot: 'skill', cooldown: 7, effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.6, hits: 3 }], fx: 'burst', color: 0xffb03a },
      { id: 'im-ult', name: 'Unibeam', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-front', mult: 3.4 }], fx: 'beam', color: 0x9fe8ff },
    ],
    passives: [],
    portrait: { glyph: '🤖', colorA: 0x8c1a1a, colorB: 0xffc73a },
  },
  {
    id: 'bowser',
    franchise: 'mario',
    name: 'Bowser',
    epithet: 'King of the Koopas',
    rarity: 'epic',
    tags: ['villain', 'video-game', 'monster', 'royal'],
    stats: { hp: 190000, atk: 11500, def: 80, spd: 24, crit: 0.08, critDmg: 1.5 },
    abilities: [
      { id: 'bw-basic', name: 'Claw Swipe', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xffa32e },
      {
        id: 'bw-skill',
        name: 'Shell Guard',
        slot: 'skill',
        cooldown: 8,
        effects: [
          { kind: 'status', target: 'self', status: 'taunt', duration: 4 },
          { kind: 'shield', target: 'self', mult: 1.8, duration: 5 },
        ],
        fx: 'glow',
        color: 0x54c437 ,
      },
      {
        id: 'bw-ult',
        name: 'Fire Breath',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 1.7 },
          { kind: 'status', target: 'enemy-all', status: 'burn', duration: 3, power: 0.15 },
        ],
        fx: 'wave',
        color: 0xff6a1a,
      },
    ],
    passives: [],
    portrait: { glyph: '🐢', colorA: 0x2d5f1e, colorB: 0xffa32e },
  },

  // ─────────────────────────────── RARE ───────────────────────────────
  {
    id: 'blastoise',
    franchise: 'pokemon',
    name: 'Blastoise',
    epithet: 'The Shellfish Pokémon',
    rarity: 'rare',
    tags: ['anime', 'video-game', 'monster'],
    stats: { hp: 158000, atk: 10800, def: 74, spd: 27, crit: 0.08, critDmg: 1.5 },
    abilities: [
      { id: 'bl-basic', name: 'Water Gun', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'bolt', color: 0x35a8ff },
      {
        id: 'bl-skill',
        name: 'Shell Guard',
        slot: 'skill',
        cooldown: 8,
        effects: [
          { kind: 'status', target: 'self', status: 'taunt', duration: 4 },
          { kind: 'shield', target: 'self', mult: 1.6, duration: 5 },
        ],
        fx: 'glow',
        color: 0x4ab8ff,
      },
      { id: 'bl-ult', name: 'Hydro Pump', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-front', mult: 3.0 }], fx: 'beam', color: 0x7fd8ff },
    ],
    passives: [],
    portrait: { glyph: '💧', colorA: 0x163d73, colorB: 0x48bfff },
  },
  {
    id: 'gengar',
    franchise: 'pokemon',
    name: 'Gengar',
    epithet: 'The Shadow Pokémon',
    rarity: 'rare',
    tags: ['anime', 'video-game', 'monster', 'magic'],
    stats: { hp: 90000, atk: 12500, def: 32, spd: 44, crit: 0.2, critDmg: 1.7 },
    abilities: [
      { id: 'ge-basic', name: 'Shadow Claw', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x9250d8 },
      {
        id: 'ge-skill',
        name: 'Hypnosis',
        slot: 'skill',
        cooldown: 7,
        effects: [
          { kind: 'damage', target: 'enemy-random', mult: 1.15 },
          { kind: 'status', target: 'enemy-random', status: 'stun', duration: 1.25 },
        ],
        fx: 'glow',
        color: 0xb04aff,
      },
      { id: 'ge-ult', name: 'Shadow Ball', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 3.0, executeBelow: 0.3 }], fx: 'bolt', color: 0xd39cff },
    ],
    passives: [{ kind: 'dodge', chance: 0.15 }],
    portrait: { glyph: '👻', colorA: 0x2d1748, colorB: 0x9b5de5 },
  },  {
    id: 'pikachu',
    franchise: 'pokemon',
    name: 'Pikachu',
    epithet: 'Electric Mouse Pokémon',
    rarity: 'rare',
    tags: ['anime', 'video-game', 'monster'],
    stats: { hp: 98000, atk: 11000, def: 38, spd: 41, crit: 0.15, critDmg: 1.6 },
    abilities: [
      { id: 'pk-basic', name: 'Quick Attack', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xffe345 },
      {
        id: 'pk-skill',
        name: 'Thunder Shock',
        slot: 'skill',
        cooldown: 6,
        effects: [
          { kind: 'damage', target: 'enemy-random', mult: 1.5 },
          { kind: 'status', target: 'enemy-random', status: 'shock', duration: 3, power: 0.12 },
        ],
        fx: 'bolt',
        color: 0xffe345,
      },
      {
        id: 'pk-ult',
        name: 'Thunder',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-front', mult: 3.2 },
          { kind: 'status', target: 'enemy-front', status: 'stun', duration: 1 },
        ],
        fx: 'bolt',
        color: 0xfff06e,
      },
    ],
    passives: [],
    portrait: { glyph: '⚡', colorA: 0xb8860b, colorB: 0xffe345 },
  },
  {
    id: 'sonic',
    franchise: 'toons',
    name: 'Sonic',
    epithet: 'The Fastest Thing Alive',
    rarity: 'rare',
    tags: ['video-game', 'hero'],
    stats: { hp: 92000, atk: 10500, def: 35, spd: 48, crit: 0.18, critDmg: 1.6 },
    abilities: [
      { id: 'sn-basic', name: 'Spin Dash', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x2e6fff },
      { id: 'sn-skill', name: 'Homing Attack', slot: 'skill', cooldown: 5, effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 1.5 }], fx: 'bolt', color: 0x4a8cff },
      { id: 'sn-ult', name: 'Sonic Boom', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.7, hits: 4 }], fx: 'burst', color: 0x6fb8ff },
    ],
    passives: [{ kind: 'dodge', chance: 0.2 }],
    portrait: { glyph: '🦔', colorA: 0x123a9e, colorB: 0x35c8ff },
  },
  {
    id: 'captain-america',
    franchise: 'marvel',
    name: 'Captain America',
    epithet: 'The First Avenger',
    rarity: 'rare',
    tags: ['hero', 'avenger', 'movie'],
    stats: { hp: 125000, atk: 9800, def: 72, spd: 30, crit: 0.12, critDmg: 1.5 },
    abilities: [
      { id: 'ca-basic', name: 'Shield Bash', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x4a8cff },
      {
        id: 'ca-skill',
        name: 'Hold the Line',
        slot: 'skill',
        cooldown: 8,
        effects: [
          { kind: 'status', target: 'self', status: 'taunt', duration: 3 },
          { kind: 'shield', target: 'ally-all', mult: 0.8, duration: 5 },
        ],
        fx: 'glow',
        color: 0x7fb8ff,
      },
      { id: 'ca-ult', name: 'Shield Ricochet', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.9, hits: 3 }], fx: 'burst', color: 0xd23a3a },
    ],
    passives: [],
    portrait: { glyph: '🛡️', colorA: 0x1c3f8f, colorB: 0xd23a3a },
  },
  {
    id: 'link',
    franchise: 'nintendo',
    name: 'Link',
    epithet: 'Hero of Hyrule',
    rarity: 'rare',
    tags: ['hero', 'video-game', 'warrior'],
    stats: { hp: 108000, atk: 10800, def: 52, spd: 35, crit: 0.15, critDmg: 1.5 },
    abilities: [
      { id: 'lk-basic', name: 'Sword Slash', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x54d437 },
      { id: 'lk-skill', name: 'Spin Attack', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-all', mult: 0.8 }], fx: 'wave', color: 0x7fe85a },
      { id: 'lk-ult', name: 'Master Sword Beam', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-front', mult: 3.0 }], fx: 'beam', color: 0xb0ff8f },
    ],
    passives: [],
    portrait: { glyph: '🗡️', colorA: 0x1e6b1e, colorB: 0xffe98f },
  },
  {
    id: 'mario',
    franchise: 'mario',
    name: 'Mario',
    epithet: 'The Super Plumber',
    rarity: 'rare',
    tags: ['hero', 'video-game'],
    stats: { hp: 105000, atk: 10600, def: 48, spd: 36, crit: 0.13, critDmg: 1.5 },
    abilities: [
      { id: 'mr-basic', name: 'Jump Stomp', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xff4a3a },
      {
        id: 'mr-skill',
        name: 'Fire Flower',
        slot: 'skill',
        cooldown: 6,
        effects: [
          { kind: 'damage', target: 'enemy-random', mult: 1.3 },
          { kind: 'status', target: 'enemy-random', status: 'burn', duration: 3, power: 0.15 },
        ],
        fx: 'bolt',
        color: 0xff7a2e,
      },
      {
        id: 'mr-ult',
        name: 'Super Star',
        slot: 'ult',
        effects: [
          { kind: 'buff', target: 'self', stat: 'atk', amount: 0.3, duration: 6 },
          { kind: 'buff', target: 'self', stat: 'spd', amount: 0.3, duration: 6 },
          { kind: 'damage', target: 'enemy-front', mult: 1.8 },
        ],
        fx: 'glow',
        color: 0xffe345,
      },
    ],
    passives: [],
    portrait: { glyph: '🍄', colorA: 0xc42222, colorB: 0x2456c9 },
  },
  {
    id: 'zelda',
    franchise: 'nintendo',
    name: 'Zelda',
    epithet: 'Princess of Hyrule',
    rarity: 'rare',
    tags: ['royal', 'magic', 'video-game'],
    stats: { hp: 95000, atk: 10200, def: 45, spd: 32, crit: 0.1, critDmg: 1.5 },
    abilities: [
      { id: 'zd-basic', name: 'Light Arrow', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'bolt', color: 0xffe9a0 },
      { id: 'zd-skill', name: "Nayru's Love", slot: 'skill', cooldown: 7, effects: [{ kind: 'shield', target: 'ally-lowest', mult: 1.8, duration: 6 }], fx: 'glow', color: 0x8fd4ff },
      {
        id: 'zd-ult',
        name: 'Triforce of Wisdom',
        slot: 'ult',
        effects: [
          { kind: 'heal', target: 'ally-all', mult: 1.6 },
          { kind: 'buff', target: 'ally-all', stat: 'atk', amount: 0.1, duration: 5 },
        ],
        fx: 'nova',
        color: 0xffe345,
      },
    ],
    passives: [],
    portrait: { glyph: '🔮', colorA: 0x6a3fa0, colorB: 0xffe9a0 },
  },

  // ────────────────────────────── COMMON ──────────────────────────────
  {
    id: 'spongebob',
    franchise: 'spongebob',
    name: 'SpongeBob',
    epithet: 'Employee of the Month ×374',
    rarity: 'common',
    tags: ['cartoon', 'hero'],
    stats: { hp: 100000, atk: 8600, def: 35, spd: 33, crit: 0.1, critDmg: 1.5 },
    abilities: [
      { id: 'sb-basic', name: 'Bubble Blast', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'bolt', color: 0x7fd8ff },
      { id: 'sb-skill', name: 'Krabby Patty Power', slot: 'skill', cooldown: 7, effects: [{ kind: 'heal', target: 'ally-lowest', mult: 1.6 }], fx: 'glow', color: 0xffc73a },
      { id: 'sb-ult', name: 'IMAGINATION!', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 1.5 }], fx: 'nova', color: 0xffe98f },
    ],
    passives: [{ kind: 'regen', pctPerSec: 0.015 }],
    portrait: { glyph: '🧽', colorA: 0xc8a800, colorB: 0xfff06e },
  },
  {
    id: 'patrick',
    franchise: 'spongebob',
    name: 'Patrick',
    epithet: 'Lives Under a Rock',
    rarity: 'common',
    tags: ['cartoon'],
    stats: { hp: 120000, atk: 8800, def: 45, spd: 26, crit: 0.08, critDmg: 1.5 },
    abilities: [
      { id: 'pt-basic', name: 'Belly Bump', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xff8fa0 },
      {
        id: 'pt-skill',
        name: 'Rock Solid',
        slot: 'skill',
        cooldown: 7,
        effects: [
          { kind: 'status', target: 'self', status: 'taunt', duration: 3 },
          { kind: 'shield', target: 'self', mult: 1.5, duration: 5 },
        ],
        fx: 'glow',
        color: 0xffb0be,
      },
      {
        id: 'pt-ult',
        name: "Who You Callin' Pinhead?",
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-front', mult: 2.6 },
          { kind: 'status', target: 'enemy-front', status: 'stun', duration: 1.5 },
        ],
        fx: 'burst',
        color: 0xff6a8a,
      },
    ],
    passives: [],
    portrait: { glyph: '⭐', colorA: 0xb04a5a, colorB: 0xffb0be },
  },
  {
    id: 'luigi',
    franchise: 'mario',
    name: 'Luigi',
    epithet: 'The Year of Luigi Continues',
    rarity: 'common',
    tags: ['hero', 'video-game'],
    stats: { hp: 96000, atk: 9200, def: 42, spd: 34, crit: 0.12, critDmg: 1.5 },
    abilities: [
      { id: 'lg-basic', name: 'Jump Punch', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x54d437 },
      { id: 'lg-skill', name: 'Poltergust', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-back', mult: 1.4 }], fx: 'wave', color: 0xa88fff },
      { id: 'lg-ult', name: 'Green Missile', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-front', mult: 2.8 }], fx: 'burst', color: 0x7fe85a },
    ],
    passives: [{ kind: 'dodge', chance: 0.15 }],
    portrait: { glyph: '👻', colorA: 0x1e7a3a, colorB: 0xb8ffb0 },
  },
  {
    id: 'shrek',
    franchise: 'toons',
    name: 'Shrek',
    epithet: 'Get Out of His Swamp',
    rarity: 'common',
    tags: ['monster', 'movie'],
    stats: { hp: 135000, atk: 9000, def: 60, spd: 27, crit: 0.1, critDmg: 1.5 },
    abilities: [
      { id: 'sh-basic', name: 'Ogre Smash', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x9ccf3a },
      { id: 'sh-skill', name: 'Mighty Roar', slot: 'skill', cooldown: 8, effects: [{ kind: 'debuff', target: 'enemy-all', stat: 'atk', amount: 0.1, duration: 4 }], fx: 'wave', color: 0xbce85a },
      {
        id: 'sh-ult',
        name: 'Swamp Slam',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 1.4 },
          { kind: 'status', target: 'self', status: 'taunt', duration: 3 },
        ],
        fx: 'nova',
        color: 0x8fbf2e,
      },
    ],
    passives: [],
    portrait: { glyph: '🧅', colorA: 0x4a6b1e, colorB: 0xcfe85a },
  },
];

CHARACTERS.push(
  // ─────────────────────── AVATAR / TMNT / NICKTOONS WAVE ───────────────────────
  {
    id: 'aang',
    franchise: 'toons',
    name: 'Aang',
    epithet: 'The Last Airbender',
    rarity: 'legendary',
    tags: ['hero', 'cartoon', 'magic'],
    stats: { hp: 150000, atk: 14200, def: 60, spd: 44, crit: 0.15, critDmg: 1.5 },
    abilities: [
      { id: 'aa-basic', name: 'Air Jab', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x9be8ff },
      { id: 'aa-skill', name: 'Gale Sweep', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-all', mult: 0.75 }], fx: 'wave', color: 0xbdf0ff },
      { id: 'aa-ult', name: 'Elemental Convergence', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 2.0 }], fx: 'nova', color: 0x8fd4ff },
    ],
    passives: [
      { kind: 'dodge', chance: 0.25 },
      { kind: 'transform', atHpPct: 0.35, name: 'AVATAR STATE!', atk: 0.5, spd: 0.4 },
    ],
    portrait: { glyph: '🌪', colorA: 0x2a6b8a, colorB: 0xffc06e },
  },
  {
    id: 'danny-phantom',
    franchise: 'toons',
    name: 'Danny Phantom',
    epithet: 'Halfa Hero of Amity Park',
    rarity: 'epic',
    tags: ['hero', 'cartoon'],
    stats: { hp: 115000, atk: 12600, def: 48, spd: 38, crit: 0.18, critDmg: 1.6 },
    abilities: [
      { id: 'dp-basic', name: 'Ecto Blast', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'bolt', color: 0x54ffb0 },
      {
        id: 'dp-skill',
        name: 'Overshadow',
        slot: 'skill',
        cooldown: 7,
        effects: [
          { kind: 'damage', target: 'enemy-back', mult: 1.6 },
          { kind: 'status', target: 'enemy-back', status: 'stun', duration: 1 },
        ],
        fx: 'glow',
        color: 0x8fffce,
      },
      {
        id: 'dp-ult',
        name: 'Ghostly Wail',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 1.8 },
          { kind: 'debuff', target: 'enemy-all', stat: 'atk', amount: 0.1, duration: 4 },
        ],
        fx: 'wave',
        color: 0x54ffb0,
      },
    ],
    passives: [{ kind: 'dodge', chance: 0.22 }],
    portrait: { glyph: '👻', colorA: 0x123a2e, colorB: 0x54ffb0 },
  },
  {
    id: 'leonardo',
    franchise: 'tmnt',
    name: 'Leonardo',
    epithet: 'Leads the Team',
    rarity: 'rare',
    tags: ['hero', 'cartoon', 'tmnt', 'warrior'],
    stats: { hp: 110000, atk: 10400, def: 55, spd: 34, crit: 0.14, critDmg: 1.5 },
    abilities: [
      { id: 'le-basic', name: 'Twin Katana', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 0.52, hits: 2 }], fx: 'strike', color: 0x4a8cff },
      {
        id: 'le-skill',
        name: "Leader's Command",
        slot: 'skill',
        cooldown: 7,
        effects: [
          { kind: 'buff', target: 'ally-all', stat: 'atk', amount: 0.1, duration: 4 },
          { kind: 'damage', target: 'enemy-front', mult: 0.9 },
        ],
        fx: 'glow',
        color: 0x7fb8ff,
      },
      {
        id: 'le-ult',
        name: 'Bushido Strike',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-front', mult: 2.8 },
          { kind: 'buff', target: 'ally-all', stat: 'atk', amount: 0.1, duration: 5 },
        ],
        fx: 'burst',
        color: 0x4a8cff,
      },
    ],
    passives: [],
    portrait: { glyph: '🗡', colorA: 0x1e5a2e, colorB: 0x4a8cff },
  },
  {
    id: 'raphael',
    franchise: 'tmnt',
    name: 'Raphael',
    epithet: 'Cool but Rude',
    rarity: 'rare',
    tags: ['hero', 'cartoon', 'tmnt', 'warrior'],
    stats: { hp: 105000, atk: 11200, def: 45, spd: 36, crit: 0.22, critDmg: 1.7 },
    abilities: [
      { id: 'ra-basic', name: 'Sai Jab', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 0.55, hits: 2 }], fx: 'strike', color: 0xff4a5a },
      { id: 'ra-skill', name: 'Hot-Headed Rush', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 1.6 }], fx: 'burst', color: 0xff6a5a },
      { id: 'ra-ult', name: 'Fury Unleashed', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.8, hits: 4 }], fx: 'burst', color: 0xff4a5a },
    ],
    passives: [{ kind: 'rage', atkPerHitTaken: 0.03, cap: 0.6 }],
    portrait: { glyph: '🔱', colorA: 0x1e5a2e, colorB: 0xff4a5a },
  },
  {
    id: 'donatello',
    franchise: 'tmnt',
    name: 'Donatello',
    epithet: 'Does Machines',
    rarity: 'rare',
    tags: ['hero', 'cartoon', 'tmnt', 'sci-fi'],
    stats: { hp: 98000, atk: 9800, def: 48, spd: 33, crit: 0.12, critDmg: 1.5 },
    abilities: [
      { id: 'do-basic', name: 'Bo Strike', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xb04aff },
      { id: 'do-skill', name: 'Gadget Shield', slot: 'skill', cooldown: 7, effects: [{ kind: 'shield', target: 'ally-lowest', mult: 1.7, duration: 6 }], fx: 'glow', color: 0xc88aff },
      {
        id: 'do-ult',
        name: 'Tech Overload',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 1.3 },
          { kind: 'debuff', target: 'enemy-all', stat: 'def', amount: 0.15, duration: 4 },
        ],
        fx: 'nova',
        color: 0xb04aff,
      },
    ],
    passives: [],
    portrait: { glyph: '🥢', colorA: 0x1e5a2e, colorB: 0xb04aff },
  },
  {
    id: 'michelangelo',
    franchise: 'tmnt',
    name: 'Michelangelo',
    epithet: 'Party Dude',
    rarity: 'common',
    tags: ['hero', 'cartoon', 'tmnt'],
    stats: { hp: 95000, atk: 8800, def: 40, spd: 40, crit: 0.15, critDmg: 1.5 },
    abilities: [
      { id: 'mi-basic', name: 'Nunchaku Flurry', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 0.5, hits: 2 }], fx: 'strike', color: 0xffa32e },
      { id: 'mi-skill', name: 'Cowabunga Skate', slot: 'skill', cooldown: 5, effects: [{ kind: 'damage', target: 'enemy-random', mult: 1.3 }], fx: 'burst', color: 0xffc06e },
      {
        id: 'mi-ult',
        name: 'Pizza Time',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-random', mult: 0.6, hits: 3 },
          { kind: 'heal', target: 'ally-all', mult: 0.6 },
        ],
        fx: 'burst',
        color: 0xffa32e,
      },
    ],
    passives: [],
    portrait: { glyph: '🍕', colorA: 0x1e5a2e, colorB: 0xffa32e },
  },
);


CHARACTERS.push(
  // ───────────────────────── MARIO UNIVERSE EXPANSION ─────────────────────────
  {
    id: 'peach',
    franchise: 'mario',
    name: 'Princess Peach',
    epithet: 'Radiant Ruler of the Mushroom Kingdom',
    rarity: 'epic',
    tags: ['hero', 'video-game', 'royal', 'magic'],
    stats: { hp: 116000, atk: 10600, def: 50, spd: 35, crit: 0.12, critDmg: 1.5 },
    abilities: [
      { id: 'pe-basic', name: 'Royal Scepter', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'bolt', color: 0xff8fcf },
      {
        id: 'pe-skill',
        name: 'Toadstool Remedy',
        slot: 'skill',
        cooldown: 7,
        effects: [
          { kind: 'heal', target: 'ally-lowest', mult: 1.9 },
          { kind: 'shield', target: 'ally-lowest', mult: 1.1, duration: 5 },
        ],
        fx: 'glow',
        color: 0xffa8dd,
      },
      {
        id: 'pe-ult',
        name: 'Peach Blossom',
        slot: 'ult',
        effects: [
          { kind: 'heal', target: 'ally-all', mult: 1.2 },
          { kind: 'buff', target: 'ally-all', stat: 'def', amount: 0.18, duration: 6 },
        ],
        fx: 'nova',
        color: 0xff72c6,
      },
    ],
    passives: [{ kind: 'regen', pctPerSec: 0.008 }],
    portrait: { glyph: '👑', colorA: 0xff77b7, colorB: 0xffd5ed },
  },
  {
    id: 'daisy',
    franchise: 'mario',
    name: 'Princess Daisy',
    epithet: 'Sarasaland’s Spirited Champion',
    rarity: 'rare',
    tags: ['hero', 'video-game', 'royal'],
    stats: { hp: 108000, atk: 11100, def: 47, spd: 38, crit: 0.15, critDmg: 1.55 },
    abilities: [
      { id: 'da-basic', name: 'Flower Strike', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xffb12e },
      {
        id: 'da-skill',
        name: 'Royal Rally',
        slot: 'skill',
        cooldown: 6,
        effects: [
          { kind: 'damage', target: 'enemy-lowest', mult: 1.55 },
          { kind: 'buff', target: 'self', stat: 'spd', amount: 0.18, duration: 5 },
        ],
        fx: 'burst',
        color: 0xffd34e,
      },
      {
        id: 'da-ult',
        name: 'Blooming Blitz',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 1.5 },
          { kind: 'buff', target: 'self', stat: 'crit', amount: 0.15, duration: 6 },
        ],
        fx: 'nova',
        color: 0xff9f24,
      },
    ],
    passives: [],
    portrait: { glyph: '🌼', colorA: 0xff8c24, colorB: 0xffe96a },
  },
  {
    id: 'rosalina',
    franchise: 'mario',
    name: 'Rosalina',
    epithet: 'Watcher of the Cosmos',
    rarity: 'supreme',
    tags: ['hero', 'video-game', 'royal', 'magic'],
    stats: { hp: 148000, atk: 13800, def: 60, spd: 40, crit: 0.17, critDmg: 1.6 },
    abilities: [
      { id: 'ro-basic', name: 'Star Bit', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'beam', color: 0x72e8ff },
      {
        id: 'ro-skill',
        name: 'Luma Guardian',
        slot: 'skill',
        cooldown: 8,
        effects: [{ kind: 'shield', target: 'ally-all', mult: 1.4, duration: 6 }],
        fx: 'glow',
        color: 0xa9f4ff,
      },
      {
        id: 'ro-ult',
        name: 'Grand Star Convergence',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 2.0 },
          { kind: 'status', target: 'enemy-all', status: 'freeze', duration: 1 },
        ],
        fx: 'nova',
        color: 0x52f3ff,
      },
    ],
    passives: [{ kind: 'regen', pctPerSec: 0.012 }],
    portrait: { glyph: '🌟', colorA: 0x3aa5bf, colorB: 0xd8fbff },
  },
  {
    id: 'toad',
    franchise: 'mario',
    name: 'Toad',
    epithet: 'Fearless Mushroom Retainer',
    rarity: 'common',
    tags: ['hero', 'video-game'],
    stats: { hp: 92000, atk: 8200, def: 43, spd: 37, crit: 0.1, critDmg: 1.5 },
    abilities: [
      { id: 'to-basic', name: 'Mushroom Bonk', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x4a8cff },
      { id: 'to-skill', name: 'Super Mushroom', slot: 'skill', cooldown: 6, effects: [{ kind: 'heal', target: 'ally-lowest', mult: 1.6 }], fx: 'glow', color: 0xffe9c4 },
      {
        id: 'to-ult',
        name: 'Mushroom Brigade',
        slot: 'ult',
        effects: [
          { kind: 'heal', target: 'ally-all', mult: 0.9 },
          { kind: 'buff', target: 'ally-all', stat: 'spd', amount: 0.15, duration: 5 },
        ],
        fx: 'wave',
        color: 0xff4a4a,
      },
    ],
    passives: [],
    portrait: { glyph: '🍄', colorA: 0xc92e2e, colorB: 0xffffff },
  },
  {
    id: 'yoshi',
    franchise: 'mario',
    name: 'Yoshi',
    epithet: 'Hero of Yoshi’s Island',
    rarity: 'rare',
    tags: ['hero', 'video-game', 'monster'],
    stats: { hp: 112000, atk: 10600, def: 46, spd: 40, crit: 0.14, critDmg: 1.55 },
    abilities: [
      { id: 'yo-basic', name: 'Tongue Lash', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x65d84a },
      { id: 'yo-skill', name: 'Egg Barrage', slot: 'skill', cooldown: 5, effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.55, hits: 3 }], fx: 'burst', color: 0xb8f06a },
      { id: 'yo-ult', name: 'Stampede', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 1.65, lifesteal: 0.18 }], fx: 'wave', color: 0x54c437 },
    ],
    passives: [{ kind: 'dodge', chance: 0.12 }],
    portrait: { glyph: '🥚', colorA: 0x2b8f3d, colorB: 0xc9ff8a },
  },
  {
    id: 'king-boo',
    franchise: 'mario',
    name: 'King Boo',
    epithet: 'Crowned Master of Mischief',
    rarity: 'epic',
    tags: ['villain', 'video-game', 'monster', 'magic'],
    stats: { hp: 123000, atk: 12400, def: 52, spd: 35, crit: 0.18, critDmg: 1.6 },
    abilities: [
      { id: 'kb-basic', name: 'Spectral Bite', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0xb56cff },
      {
        id: 'kb-skill',
        name: 'Haunting Ambush',
        slot: 'skill',
        cooldown: 7,
        effects: [
          { kind: 'damage', target: 'enemy-back', mult: 1.55 },
          { kind: 'status', target: 'enemy-back', status: 'stun', duration: 1.2 },
        ],
        fx: 'glow',
        color: 0xd19aff,
      },
      {
        id: 'kb-ult',
        name: 'Paranormal Dominion',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 1.65 },
          { kind: 'debuff', target: 'enemy-all', stat: 'atk', amount: 0.15, duration: 5 },
        ],
        fx: 'nova',
        color: 0x9e4aff,
      },
    ],
    passives: [{ kind: 'dodge', chance: 0.16 }],
    portrait: { glyph: '👻', colorA: 0x57308f, colorB: 0xe4c8ff },
  },
);

CHARACTERS.push(
  // DC UNIVERSE EXPANSION
  {
    id: 'flash',
    franchise: 'dc',
    name: 'The Flash',
    epithet: 'The Fastest Man Alive',
    rarity: 'legendary',
    tags: ['hero', 'justice-league', 'sci-fi'],
    stats: { hp: 130000, atk: 14800, def: 50, spd: 55, crit: 0.24, critDmg: 1.7 },
    abilities: [
      { id: 'fl-basic', name: 'Lightning Jab', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'bolt', color: 0xffd22e },
      { id: 'fl-skill', name: 'Speed Force Barrage', slot: 'skill', cooldown: 5, effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.46, hits: 4 }], fx: 'burst', color: 0xffe86b },
      {
        id: 'fl-ult',
        name: 'Infinite Mass Punch',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-front', mult: 3.7 },
          { kind: 'buff', target: 'self', stat: 'spd', amount: 0.25, duration: 6 },
        ],
        fx: 'burst',
        color: 0xff432e,
      },
    ],
    passives: [{ kind: 'dodge', chance: 0.24 }],
    portrait: { glyph: 'F', colorA: 0xa91020, colorB: 0xffd22e },
  },
  {
    id: 'green-lantern',
    franchise: 'dc',
    name: 'Green Lantern',
    epithet: 'Emerald Knight of Sector 2814',
    rarity: 'legendary',
    tags: ['hero', 'justice-league', 'alien', 'sci-fi'],
    stats: { hp: 155000, atk: 13800, def: 68, spd: 34, crit: 0.16, critDmg: 1.6 },
    abilities: [
      { id: 'gl-basic', name: 'Hard-Light Fist', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.0 }], fx: 'strike', color: 0x35e879 },
      { id: 'gl-skill', name: 'Construct Barrier', slot: 'skill', cooldown: 7, effects: [{ kind: 'shield', target: 'ally-all', mult: 1.3, duration: 6 }], fx: 'glow', color: 0x7dffab },
      {
        id: 'gl-ult',
        name: 'Emerald Will',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 1.8 },
          { kind: 'buff', target: 'ally-all', stat: 'def', amount: 0.15, duration: 6 },
        ],
        fx: 'beam',
        color: 0x20e86b,
      },
    ],
    passives: [{ kind: 'prep', effects: [{ kind: 'shield', target: 'ally-all', mult: 0.8, duration: 7 }] }],
    portrait: { glyph: 'GL', colorA: 0x083f2d, colorB: 0x35e879 },
  },
  {
    id: 'joker',
    franchise: 'dc',
    name: 'The Joker',
    epithet: 'The Clown Prince of Crime',
    rarity: 'epic',
    tags: ['villain', 'detective', 'movie'],
    stats: { hp: 105000, atk: 13000, def: 39, spd: 38, crit: 0.25, critDmg: 1.8 },
    abilities: [
      { id: 'jk-basic', name: 'Trick Shot', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 1.0 }], fx: 'bolt', color: 0x8fe33d },
      {
        id: 'jk-skill',
        name: 'Laughing Gas',
        slot: 'skill',
        cooldown: 8,
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 0.55 },
          { kind: 'status', target: 'enemy-all', status: 'stun', duration: 0.8 },
        ],
        fx: 'wave',
        color: 0x9aef50,
      },
      {
        id: 'jk-ult',
        name: 'The Last Laugh',
        slot: 'ult',
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 1.4 },
          { kind: 'status', target: 'enemy-all', status: 'burn', duration: 4, power: 0.15 },
        ],
        fx: 'nova',
        color: 0xb14cff,
      },
    ],
    passives: [],
    portrait: { glyph: 'J', colorA: 0x492067, colorB: 0x9aef50 },
  },
);

const CROSS_UNIVERSE_EXPANSION: CharacterDef[] = [
  {
    "id": "ariel",
    "franchise": "disney",
    "name": "Ariel",
    "epithet": "The Little Mermaid",
    "rarity": "rare",
    "tags": [
      "hero",
      "royal",
      "magic",
      "movie"
    ],
    "stats": {
      "hp": 105000,
      "atk": 9800,
      "def": 44,
      "spd": 38,
      "crit": 0.13,
      "critDmg": 1.5
    },
    "abilities": [
      {
        "id": "ar-basic",
        "name": "Siren Song",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "wave",
        "color": 6545407
      },
      {
        "id": "ar-skill",
        "name": "Ocean's Embrace",
        "slot": "skill",
        "cooldown": 6,
        "effects": [
          {
            "kind": "heal",
            "target": "ally-lowest",
            "mult": 1.7
          }
        ],
        "fx": "glow",
        "color": 7729919
      },
      {
        "id": "ar-ult",
        "name": "Tidal Chorus",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 1.35
          },
          {
            "kind": "buff",
            "target": "ally-all",
            "stat": "spd",
            "amount": 0.15,
            "duration": 5
          }
        ],
        "fx": "nova",
        "color": 2936810
      }
    ],
    "passives": [
      {
        "kind": "dodge",
        "chance": 0.1
      }
    ],
    "portrait": {
      "glyph": "A",
      "colorA": 1207953,
      "colorB": 6545407
    }
  },
  {
    "id": "genie",
    "franchise": "disney",
    "name": "Genie",
    "epithet": "Phenomenal Cosmic Power",
    "rarity": "legendary",
    "tags": [
      "hero",
      "magic",
      "movie"
    ],
    "stats": {
      "hp": 142000,
      "atk": 14200,
      "def": 58,
      "spd": 41,
      "crit": 0.18,
      "critDmg": 1.6
    },
    "abilities": [
      {
        "id": "ge-basic",
        "name": "Cosmic Snap",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-random",
            "mult": 1
          }
        ],
        "fx": "bolt",
        "color": 5691903
      },
      {
        "id": "ge-skill",
        "name": "Three Wishes",
        "slot": "skill",
        "cooldown": 8,
        "effects": [
          {
            "kind": "shield",
            "target": "ally-all",
            "mult": 1.2,
            "duration": 6
          },
          {
            "kind": "heal",
            "target": "ally-all",
            "mult": 0.7
          }
        ],
        "fx": "glow",
        "color": 9169151
      },
      {
        "id": "ge-ult",
        "name": "Phenomenal Cosmic Power",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 2.1
          },
          {
            "kind": "status",
            "target": "enemy-all",
            "status": "stun",
            "duration": 0.8
          }
        ],
        "fx": "nova",
        "color": 3522559
      }
    ],
    "passives": [
      {
        "kind": "regen",
        "pctPerSec": 0.01
      }
    ],
    "portrait": {
      "glyph": "G",
      "colorA": 1332392,
      "colorB": 5691903
    }
  },
  {
    "id": "hercules",
    "franchise": "disney",
    "name": "Hercules",
    "epithet": "True Hero of Olympus",
    "rarity": "epic",
    "tags": [
      "hero",
      "warrior",
      "movie"
    ],
    "stats": {
      "hp": 155000,
      "atk": 13200,
      "def": 66,
      "spd": 34,
      "crit": 0.17,
      "critDmg": 1.6
    },
    "abilities": [
      {
        "id": "he-basic",
        "name": "Heroic Punch",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 14919242
      },
      {
        "id": "he-skill",
        "name": "Heroic Might",
        "slot": "skill",
        "cooldown": 7,
        "effects": [
          {
            "kind": "buff",
            "target": "self",
            "stat": "atk",
            "amount": 0.25,
            "duration": 6
          },
          {
            "kind": "buff",
            "target": "self",
            "stat": "def",
            "amount": 0.2,
            "duration": 6
          }
        ],
        "fx": "glow",
        "color": 16765802
      },
      {
        "id": "he-ult",
        "name": "Olympian Smash",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 1.7
          },
          {
            "kind": "status",
            "target": "enemy-front",
            "status": "stun",
            "duration": 1.2
          }
        ],
        "fx": "burst",
        "color": 16758589
      }
    ],
    "passives": [
      {
        "kind": "rage",
        "atkPerHitTaken": 0.025,
        "cap": 0.45
      }
    ],
    "portrait": {
      "glyph": "H",
      "colorA": 8075303,
      "colorB": 16762970
    }
  },
  {
    "id": "hook",
    "franchise": "disney",
    "name": "Captain Hook",
    "epithet": "Scourge of Neverland",
    "rarity": "rare",
    "tags": [
      "villain",
      "movie",
      "warrior"
    ],
    "stats": {
      "hp": 103000,
      "atk": 11100,
      "def": 45,
      "spd": 37,
      "crit": 0.2,
      "critDmg": 1.65
    },
    "abilities": [
      {
        "id": "hk-basic",
        "name": "Hook and Saber",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 14468988
      },
      {
        "id": "hk-skill",
        "name": "Cheap Shot",
        "slot": "skill",
        "cooldown": 6,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-back",
            "mult": 1.5
          },
          {
            "kind": "status",
            "target": "enemy-back",
            "status": "stun",
            "duration": 0.8
          }
        ],
        "fx": "burst",
        "color": 16734279
      },
      {
        "id": "hk-ult",
        "name": "Crocodile Panic",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-random",
            "mult": 0.7,
            "hits": 4
          }
        ],
        "fx": "burst",
        "color": 13186357
      }
    ],
    "passives": [
      {
        "kind": "dodge",
        "chance": 0.1
      }
    ],
    "portrait": {
      "glyph": "C",
      "colorA": 8001318,
      "colorB": 15258778
    }
  },
  {
    "id": "mulan",
    "franchise": "disney",
    "name": "Mulan",
    "epithet": "Warrior of Honor",
    "rarity": "epic",
    "tags": [
      "hero",
      "warrior",
      "movie"
    ],
    "stats": {
      "hp": 122000,
      "atk": 12400,
      "def": 56,
      "spd": 40,
      "crit": 0.2,
      "critDmg": 1.65
    },
    "abilities": [
      {
        "id": "mu-basic",
        "name": "Sword Dance",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 15228253
      },
      {
        "id": "mu-skill",
        "name": "Tactical Strike",
        "slot": "skill",
        "cooldown": 6,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-lowest",
            "mult": 1.6
          },
          {
            "kind": "buff",
            "target": "self",
            "stat": "atk",
            "amount": 0.15,
            "duration": 5
          }
        ],
        "fx": "burst",
        "color": 16747103
      },
      {
        "id": "mu-ult",
        "name": "Honor to Us All",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 1.55
          },
          {
            "kind": "buff",
            "target": "ally-all",
            "stat": "def",
            "amount": 0.12,
            "duration": 6
          }
        ],
        "fx": "wave",
        "color": 16760942
      }
    ],
    "passives": [],
    "portrait": {
      "glyph": "M",
      "colorA": 9052204,
      "colorB": 16757358
    }
  },
  {
    "id": "olaf",
    "franchise": "disney",
    "name": "Olaf",
    "epithet": "Warm Hugs Expert",
    "rarity": "common",
    "tags": [
      "hero",
      "magic",
      "movie"
    ],
    "stats": {
      "hp": 93000,
      "atk": 7900,
      "def": 42,
      "spd": 34,
      "crit": 0.09,
      "critDmg": 1.5
    },
    "abilities": [
      {
        "id": "ol-basic",
        "name": "Snowball",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "bolt",
        "color": 12449023
      },
      {
        "id": "ol-skill",
        "name": "Warm Hug",
        "slot": "skill",
        "cooldown": 6,
        "effects": [
          {
            "kind": "heal",
            "target": "ally-lowest",
            "mult": 1.5
          }
        ],
        "fx": "glow",
        "color": 16777215
      },
      {
        "id": "ol-ult",
        "name": "Worth Melting For",
        "slot": "ult",
        "effects": [
          {
            "kind": "heal",
            "target": "ally-all",
            "mult": 0.85
          },
          {
            "kind": "buff",
            "target": "ally-all",
            "stat": "def",
            "amount": 0.1,
            "duration": 5
          }
        ],
        "fx": "glow",
        "color": 14219519
      }
    ],
    "passives": [
      {
        "kind": "regen",
        "pctPerSec": 0.006
      }
    ],
    "portrait": {
      "glyph": "O",
      "colorA": 8178659,
      "colorB": 16777215
    }
  },
  {
    "id": "simba",
    "franchise": "disney",
    "name": "Simba",
    "epithet": "The Lion King",
    "rarity": "rare",
    "tags": [
      "hero",
      "royal",
      "movie"
    ],
    "stats": {
      "hp": 118000,
      "atk": 10800,
      "def": 52,
      "spd": 38,
      "crit": 0.17,
      "critDmg": 1.6
    },
    "abilities": [
      {
        "id": "si-basic",
        "name": "Royal Claw",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 15180604
      },
      {
        "id": "si-skill",
        "name": "King's Roar",
        "slot": "skill",
        "cooldown": 7,
        "effects": [
          {
            "kind": "debuff",
            "target": "enemy-all",
            "stat": "atk",
            "amount": 0.12,
            "duration": 5
          }
        ],
        "fx": "wave",
        "color": 16763480
      },
      {
        "id": "si-ult",
        "name": "Circle of Life",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 1.4
          },
          {
            "kind": "heal",
            "target": "ally-all",
            "mult": 0.7
          }
        ],
        "fx": "nova",
        "color": 15775807
      }
    ],
    "passives": [],
    "portrait": {
      "glyph": "S",
      "colorA": 7815967,
      "colorB": 15775807
    }
  },
  {
    "id": "tinker-bell",
    "franchise": "disney",
    "name": "Tinker Bell",
    "epithet": "Light of Neverland",
    "rarity": "epic",
    "tags": [
      "hero",
      "magic",
      "movie"
    ],
    "stats": {
      "hp": 101000,
      "atk": 11900,
      "def": 44,
      "spd": 45,
      "crit": 0.22,
      "critDmg": 1.7
    },
    "abilities": [
      {
        "id": "tb-basic",
        "name": "Pixie Spark",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "bolt",
        "color": 14679907
      },
      {
        "id": "tb-skill",
        "name": "Faith, Trust, and Pixie Dust",
        "slot": "skill",
        "cooldown": 7,
        "effects": [
          {
            "kind": "buff",
            "target": "ally-all",
            "stat": "spd",
            "amount": 0.18,
            "duration": 5
          },
          {
            "kind": "shield",
            "target": "ally-lowest",
            "mult": 1.2,
            "duration": 5
          }
        ],
        "fx": "glow",
        "color": 15990666
      },
      {
        "id": "tb-ult",
        "name": "Neverland Starfall",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 1.7
          },
          {
            "kind": "buff",
            "target": "ally-all",
            "stat": "crit",
            "amount": 0.12,
            "duration": 5
          }
        ],
        "fx": "nova",
        "color": 13631301
      }
    ],
    "passives": [
      {
        "kind": "dodge",
        "chance": 0.18
      }
    ],
    "portrait": {
      "glyph": "T",
      "colorA": 4818731,
      "colorB": 15269736
    }
  },
  {
    "id": "black-panther",
    "franchise": "marvel",
    "name": "Black Panther",
    "epithet": "King of Wakanda",
    "rarity": "epic",
    "tags": [
      "hero",
      "avenger",
      "royal",
      "movie"
    ],
    "stats": {
      "hp": 137000,
      "atk": 13000,
      "def": 67,
      "spd": 41,
      "crit": 0.22,
      "critDmg": 1.7
    },
    "abilities": [
      {
        "id": "bp-basic",
        "name": "Vibranium Claws",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 10319103
      },
      {
        "id": "bp-skill",
        "name": "Kinetic Armor",
        "slot": "skill",
        "cooldown": 7,
        "effects": [
          {
            "kind": "shield",
            "target": "self",
            "mult": 2,
            "duration": 6
          },
          {
            "kind": "status",
            "target": "self",
            "status": "taunt",
            "duration": 3
          }
        ],
        "fx": "glow",
        "color": 12822527
      },
      {
        "id": "bp-ult",
        "name": "Wakanda Forever",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 1.65
          },
          {
            "kind": "buff",
            "target": "ally-all",
            "stat": "def",
            "amount": 0.15,
            "duration": 6
          }
        ],
        "fx": "burst",
        "color": 9065960
      }
    ],
    "passives": [
      {
        "kind": "dodge",
        "chance": 0.15
      }
    ],
    "portrait": {
      "glyph": "BP",
      "colorA": 2169651,
      "colorB": 10319103
    }
  },
  {
    "id": "doctor-strange",
    "franchise": "marvel",
    "name": "Doctor Strange",
    "epithet": "Master of the Mystic Arts",
    "rarity": "supreme",
    "tags": [
      "hero",
      "avenger",
      "magic",
      "movie"
    ],
    "stats": {
      "hp": 144000,
      "atk": 15100,
      "def": 60,
      "spd": 39,
      "crit": 0.2,
      "critDmg": 1.65
    },
    "abilities": [
      {
        "id": "ds-basic",
        "name": "Mystic Bolt",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "bolt",
        "color": 16751672
      },
      {
        "id": "ds-skill",
        "name": "Mirror Dimension",
        "slot": "skill",
        "cooldown": 7,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-back",
            "mult": 1.45
          },
          {
            "kind": "status",
            "target": "enemy-back",
            "status": "stun",
            "duration": 1.4
          }
        ],
        "fx": "glow",
        "color": 16760922
      },
      {
        "id": "ds-ult",
        "name": "Eye of Agamotto",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 2
          },
          {
            "kind": "status",
            "target": "enemy-all",
            "status": "freeze",
            "duration": 1.3
          }
        ],
        "fx": "nova",
        "color": 6678783
      }
    ],
    "passives": [
      {
        "kind": "prep",
        "effects": [
          {
            "kind": "shield",
            "target": "ally-all",
            "mult": 0.75,
            "duration": 7
          }
        ]
      }
    ],
    "portrait": {
      "glyph": "DS",
      "colorA": 8133670,
      "colorB": 16753722
    }
  },
  {
    "id": "hulk",
    "franchise": "marvel",
    "name": "Hulk",
    "epithet": "The Strongest One There Is",
    "rarity": "legendary",
    "tags": [
      "hero",
      "avenger",
      "monster",
      "movie"
    ],
    "stats": {
      "hp": 225000,
      "atk": 14800,
      "def": 78,
      "spd": 26,
      "crit": 0.1,
      "critDmg": 1.6
    },
    "abilities": [
      {
        "id": "hu-basic",
        "name": "Hulk Smash",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 7985232
      },
      {
        "id": "hu-skill",
        "name": "Thunderclap",
        "slot": "skill",
        "cooldown": 8,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 0.8
          },
          {
            "kind": "debuff",
            "target": "enemy-all",
            "stat": "atk",
            "amount": 0.1,
            "duration": 4
          }
        ],
        "fx": "wave",
        "color": 10940527
      },
      {
        "id": "hu-ult",
        "name": "Worldbreaker",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 2.1
          },
          {
            "kind": "buff",
            "target": "self",
            "stat": "atk",
            "amount": 0.2,
            "duration": 6
          }
        ],
        "fx": "burst",
        "color": 6670657
      }
    ],
    "passives": [
      {
        "kind": "rage",
        "atkPerHitTaken": 0.035,
        "cap": 0.7
      }
    ],
    "portrait": {
      "glyph": "H",
      "colorA": 3234602,
      "colorB": 7985232
    }
  },
  {
    "id": "loki",
    "franchise": "marvel",
    "name": "Loki",
    "epithet": "God of Mischief",
    "rarity": "legendary",
    "tags": [
      "villain",
      "magic",
      "alien",
      "movie"
    ],
    "stats": {
      "hp": 128000,
      "atk": 14500,
      "def": 53,
      "spd": 42,
      "crit": 0.24,
      "critDmg": 1.7
    },
    "abilities": [
      {
        "id": "lo-basic",
        "name": "Scepter Strike",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 9365341
      },
      {
        "id": "lo-skill",
        "name": "Illusory Ambush",
        "slot": "skill",
        "cooldown": 6,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-back",
            "mult": 1.45
          },
          {
            "kind": "status",
            "target": "enemy-back",
            "status": "stun",
            "duration": 1.2
          }
        ],
        "fx": "glow",
        "color": 12189560
      },
      {
        "id": "lo-ult",
        "name": "Glorious Purpose",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 1.75
          },
          {
            "kind": "debuff",
            "target": "enemy-all",
            "stat": "atk",
            "amount": 0.15,
            "duration": 5
          }
        ],
        "fx": "nova",
        "color": 8047172
      }
    ],
    "passives": [
      {
        "kind": "dodge",
        "chance": 0.22
      }
    ],
    "portrait": {
      "glyph": "L",
      "colorA": 2182698,
      "colorB": 14136668
    }
  },
  {
    "id": "scarlet-witch",
    "franchise": "marvel",
    "name": "Scarlet Witch",
    "epithet": "The Chaos Nexus",
    "rarity": "supreme",
    "tags": [
      "hero",
      "avenger",
      "magic",
      "movie"
    ],
    "stats": {
      "hp": 134000,
      "atk": 15800,
      "def": 51,
      "spd": 41,
      "crit": 0.24,
      "critDmg": 1.75
    },
    "abilities": [
      {
        "id": "sw-basic",
        "name": "Hex Bolt",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "bolt",
        "color": 16727922
      },
      {
        "id": "sw-skill",
        "name": "Chaos Hex",
        "slot": "skill",
        "cooldown": 7,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-random",
            "mult": 0.7,
            "hits": 3
          },
          {
            "kind": "debuff",
            "target": "enemy-all",
            "stat": "def",
            "amount": 0.12,
            "duration": 4
          }
        ],
        "fx": "glow",
        "color": 16738449
      },
      {
        "id": "sw-ult",
        "name": "Reality Fracture",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 2
          },
          {
            "kind": "status",
            "target": "enemy-all",
            "status": "stun",
            "duration": 0.9
          }
        ],
        "fx": "nova",
        "color": 15150438
      }
    ],
    "passives": [
      {
        "kind": "dodge",
        "chance": 0.16
      }
    ],
    "portrait": {
      "glyph": "SW",
      "colorA": 6821166,
      "colorB": 16727922
    }
  },
  {
    "id": "spiderman",
    "franchise": "marvel",
    "name": "Spider-Man",
    "epithet": "Your Friendly Neighborhood Hero",
    "rarity": "epic",
    "tags": [
      "hero",
      "avenger",
      "movie"
    ],
    "stats": {
      "hp": 112000,
      "atk": 12800,
      "def": 48,
      "spd": 47,
      "crit": 0.24,
      "critDmg": 1.7
    },
    "abilities": [
      {
        "id": "sp-basic",
        "name": "Web Strike",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 4892159
      },
      {
        "id": "sp-skill",
        "name": "Web Snare",
        "slot": "skill",
        "cooldown": 6,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-back",
            "mult": 1.3
          },
          {
            "kind": "status",
            "target": "enemy-back",
            "status": "stun",
            "duration": 1.3
          }
        ],
        "fx": "wave",
        "color": 14479359
      },
      {
        "id": "sp-ult",
        "name": "Great Responsibility",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-random",
            "mult": 0.65,
            "hits": 4
          },
          {
            "kind": "buff",
            "target": "self",
            "stat": "spd",
            "amount": 0.2,
            "duration": 6
          }
        ],
        "fx": "burst",
        "color": 15746116
      }
    ],
    "passives": [
      {
        "kind": "dodge",
        "chance": 0.25
      }
    ],
    "portrait": {
      "glyph": "SP",
      "colorA": 10297384,
      "colorB": 2652616
    }
  },
  {
    "id": "thanos",
    "franchise": "marvel",
    "name": "Thanos",
    "epithet": "The Mad Titan",
    "rarity": "godlike",
    "tags": [
      "villain",
      "alien",
      "movie"
    ],
    "stats": {
      "hp": 245000,
      "atk": 17300,
      "def": 82,
      "spd": 29,
      "crit": 0.16,
      "critDmg": 1.7
    },
    "abilities": [
      {
        "id": "tn-basic",
        "name": "Titan Fist",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 10185932
      },
      {
        "id": "tn-skill",
        "name": "Power Stone",
        "slot": "skill",
        "cooldown": 8,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 2.15
          },
          {
            "kind": "status",
            "target": "enemy-front",
            "status": "stun",
            "duration": 1
          }
        ],
        "fx": "burst",
        "color": 11894015
      },
      {
        "id": "tn-ult",
        "name": "The Snap",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 2.6
          },
          {
            "kind": "debuff",
            "target": "enemy-all",
            "stat": "atk",
            "amount": 0.18,
            "duration": 6
          }
        ],
        "fx": "nova",
        "color": 16759117
      }
    ],
    "passives": [
      {
        "kind": "regen",
        "pctPerSec": 0.01
      }
    ],
    "portrait": {
      "glyph": "T",
      "colorA": 5059183,
      "colorB": 13804378
    }
  },
  {
    "id": "wolverine",
    "franchise": "marvel",
    "name": "Wolverine",
    "epithet": "The Best There Is",
    "rarity": "epic",
    "tags": [
      "hero",
      "warrior",
      "movie"
    ],
    "stats": {
      "hp": 132000,
      "atk": 13500,
      "def": 56,
      "spd": 42,
      "crit": 0.28,
      "critDmg": 1.8
    },
    "abilities": [
      {
        "id": "wv-basic",
        "name": "Adamantium Claws",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 0.52,
            "hits": 2
          }
        ],
        "fx": "strike",
        "color": 15326293
      },
      {
        "id": "wv-skill",
        "name": "Berserker Lunge",
        "slot": "skill",
        "cooldown": 6,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-lowest",
            "mult": 1.75
          }
        ],
        "fx": "burst",
        "color": 16767306
      },
      {
        "id": "wv-ult",
        "name": "Weapon X Fury",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-random",
            "mult": 0.72,
            "hits": 5,
            "lifesteal": 0.2
          }
        ],
        "fx": "burst",
        "color": 15124539
      }
    ],
    "passives": [
      {
        "kind": "regen",
        "pctPerSec": 0.018
      }
    ],
    "portrait": {
      "glyph": "W",
      "colorA": 3096939,
      "colorB": 15326293
    }
  },
  {
    "id": "aquaman",
    "franchise": "dc",
    "name": "Aquaman",
    "epithet": "King of Atlantis",
    "rarity": "legendary",
    "tags": [
      "hero",
      "justice-league",
      "royal",
      "movie"
    ],
    "stats": {
      "hp": 172000,
      "atk": 14200,
      "def": 72,
      "spd": 33,
      "crit": 0.15,
      "critDmg": 1.6
    },
    "abilities": [
      {
        "id": "aq-basic",
        "name": "Trident Strike",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 4577477
      },
      {
        "id": "aq-skill",
        "name": "Tidal Command",
        "slot": "skill",
        "cooldown": 7,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 0.8
          },
          {
            "kind": "debuff",
            "target": "enemy-all",
            "stat": "def",
            "amount": 0.12,
            "duration": 5
          }
        ],
        "fx": "wave",
        "color": 6811356
      },
      {
        "id": "aq-ult",
        "name": "Wrath of the Seven Seas",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 1.9
          },
          {
            "kind": "status",
            "target": "enemy-all",
            "status": "stun",
            "duration": 1
          }
        ],
        "fx": "nova",
        "color": 3065782
      }
    ],
    "passives": [
      {
        "kind": "regen",
        "pctPerSec": 0.008
      }
    ],
    "portrait": {
      "glyph": "AQ",
      "colorA": 1199720,
      "colorB": 4577477
    }
  },
  {
    "id": "darkseid",
    "franchise": "dc",
    "name": "Darkseid",
    "epithet": "Lord of Apokolips",
    "rarity": "godlike",
    "tags": [
      "villain",
      "alien",
      "sci-fi"
    ],
    "stats": {
      "hp": 250000,
      "atk": 17800,
      "def": 84,
      "spd": 27,
      "crit": 0.14,
      "critDmg": 1.7
    },
    "abilities": [
      {
        "id": "dk-basic",
        "name": "Omega Strike",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 15944515
      },
      {
        "id": "dk-skill",
        "name": "Omega Beams",
        "slot": "skill",
        "cooldown": 8,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 2.3
          },
          {
            "kind": "status",
            "target": "enemy-front",
            "status": "burn",
            "duration": 4,
            "power": 0.2
          }
        ],
        "fx": "beam",
        "color": 16726578
      },
      {
        "id": "dk-ult",
        "name": "Anti-Life Equation",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 2.5
          },
          {
            "kind": "status",
            "target": "enemy-all",
            "status": "stun",
            "duration": 1.2
          }
        ],
        "fx": "nova",
        "color": 14826807
      }
    ],
    "passives": [
      {
        "kind": "regen",
        "pctPerSec": 0.009
      }
    ],
    "portrait": {
      "glyph": "D",
      "colorA": 3948119,
      "colorB": 15944515
    }
  },
  {
    "id": "harley-quinn",
    "franchise": "dc",
    "name": "Harley Quinn",
    "epithet": "Cupid of Crime",
    "rarity": "epic",
    "tags": [
      "villain",
      "assassin",
      "movie"
    ],
    "stats": {
      "hp": 106000,
      "atk": 12700,
      "def": 42,
      "spd": 43,
      "crit": 0.28,
      "critDmg": 1.8
    },
    "abilities": [
      {
        "id": "hq-basic",
        "name": "Mallet Swing",
        "slot": "basic",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-front",
            "mult": 1
          }
        ],
        "fx": "strike",
        "color": 16735114
      },
      {
        "id": "hq-skill",
        "name": "Pop! Pop!",
        "slot": "skill",
        "cooldown": 5,
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-random",
            "mult": 0.55,
            "hits": 3
          }
        ],
        "fx": "bolt",
        "color": 7393279
      },
      {
        "id": "hq-ult",
        "name": "Total Mayhem",
        "slot": "ult",
        "effects": [
          {
            "kind": "damage",
            "target": "enemy-all",
            "mult": 1.5
          },
          {
            "kind": "buff",
            "target": "self",
            "stat": "crit",
            "amount": 0.2,
            "duration": 6
          }
        ],
        "fx": "burst",
        "color": 16729980
      }
    ],
    "passives": [
      {
        "kind": "dodge",
        "chance": 0.16
      }
    ],
    "portrait": {
      "glyph": "HQ",
      "colorA": 8659774,
      "colorB": 5815784
    }
  }
];

CHARACTERS.push(...CROSS_UNIVERSE_EXPANSION, ...NEW_CHARACTERS);
applyCharacterRules(CHARACTERS);

export const CHARACTERS_BY_ID: ReadonlyMap<string, CharacterDef> = new Map(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id: string): CharacterDef {
  const def = CHARACTERS_BY_ID.get(id);
  if (!def) throw new Error(`Unknown character: ${id}`);
  return def;
}
