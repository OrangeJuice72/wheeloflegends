import type { CharacterDef } from './types';

/** Characters whose portrait art has been added to the drop-in asset folders. */
export const NEW_CHARACTERS: CharacterDef[] = [
  {
    id: 'luffy', franchise: 'anime', name: 'Monkey D. Luffy', epithet: 'Future King of the Pirates', rarity: 'supreme',
    tags: ['hero', 'anime', 'warrior'],
    stats: { hp: 164000, atk: 14600, def: 58, spd: 41, crit: 0.2, critDmg: 1.7 },
    abilities: [
      { id: 'luf-basic', name: 'Gum-Gum Pistol', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0xff5d4a },
      { id: 'luf-skill', name: 'Gum-Gum Gatling', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.42, hits: 5 }], fx: 'burst', color: 0xff8a5f },
      { id: 'luf-ult', name: 'Gear Fifth', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 2 }, { kind: 'buff', target: 'self', stat: 'spd', amount: 0.3, duration: 6 }], fx: 'nova', color: 0xffffff },
    ],
    passives: [{ kind: 'dodge', chance: 0.16 }], portrait: { glyph: 'L', colorA: 0x7d2020, colorB: 0xffd65a },
  },
  {
    id: 'nami', franchise: 'anime', name: 'Nami', epithet: 'Cat Burglar Navigator', rarity: 'epic',
    tags: ['hero', 'anime'],
    stats: { hp: 104000, atk: 12300, def: 40, spd: 43, crit: 0.24, critDmg: 1.75 },
    abilities: [
      { id: 'nam-basic', name: 'Clima-Tact Strike', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0xff9a48 },
      { id: 'nam-skill', name: 'Thunderbolt Tempo', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-random', mult: 1.65 }, { kind: 'status', target: 'enemy-random', status: 'shock', duration: 3, power: 0.14 }], fx: 'bolt', color: 0xffe45e },
      { id: 'nam-ult', name: 'Zeus Storm', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 1.75 }, { kind: 'debuff', target: 'enemy-all', stat: 'spd', amount: 0.13, duration: 5 }], fx: 'nova', color: 0x8fdcff },
    ],
    passives: [{ kind: 'dodge', chance: 0.14 }], portrait: { glyph: 'N', colorA: 0xc05224, colorB: 0x56b9e8 },
  },
  {
    id: 'naruto', franchise: 'anime', name: 'Naruto Uzumaki', epithet: 'Seventh Hokage', rarity: 'supreme',
    tags: ['hero', 'anime', 'warrior', 'magic'],
    stats: { hp: 154000, atk: 15100, def: 55, spd: 44, crit: 0.21, critDmg: 1.7 },
    abilities: [
      { id: 'nar-basic', name: 'Shadow Clone Combo', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 0.54, hits: 2 }], fx: 'strike', color: 0xff9a32 },
      { id: 'nar-skill', name: 'Rasengan', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 1.9 }, { kind: 'debuff', target: 'enemy-lowest', stat: 'def', amount: 0.12, duration: 4 }], fx: 'burst', color: 0x61c9ff },
      { id: 'nar-ult', name: 'Six Paths Sage Mode', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 2.1 }, { kind: 'heal', target: 'ally-all', mult: 0.9 }], fx: 'nova', color: 0xffd33d },
    ],
    passives: [{ kind: 'regen', pctPerSec: 0.009 }], portrait: { glyph: 'N', colorA: 0xe65f1f, colorB: 0x3a78c2 },
  },
  {
    id: 'saitama', franchise: 'anime', name: 'Saitama', epithet: 'Caped Baldy', rarity: 'godlike',
    tags: ['hero', 'anime', 'warrior'],
    stats: { hp: 225000, atk: 19000, def: 88, spd: 39, crit: 0.25, critDmg: 2 },
    abilities: [
      { id: 'sai-basic', name: 'Normal Punch', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.15 }], fx: 'strike', color: 0xffd542 },
      { id: 'sai-skill', name: 'Consecutive Normal Punches', slot: 'skill', cooldown: 7, effects: [{ kind: 'damage', target: 'enemy-front', mult: 0.7, hits: 4 }], fx: 'burst', color: 0xfff19a },
      { id: 'sai-ult', name: 'Serious Punch', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 3 }], fx: 'nova', color: 0xffffff },
    ],
    passives: [], portrait: { glyph: 'S', colorA: 0xe0b827, colorB: 0xd94b3c },
  },
  {
    id: 'yuji-itadori', franchise: 'anime', name: 'Yuji Itadori', epithet: "Sukuna's Vessel", rarity: 'legendary',
    tags: ['hero', 'anime', 'warrior', 'magic'],
    stats: { hp: 142000, atk: 14900, def: 58, spd: 42, crit: 0.22, critDmg: 1.75 },
    abilities: [
      { id: 'yji-basic', name: 'Divergent Fist', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 0.62, hits: 2 }], fx: 'strike', color: 0xff5a68 },
      { id: 'yji-skill', name: 'Black Flash', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 2.05, executeBelow: 0.3 }], fx: 'burst', color: 0x2b182d },
      { id: 'yji-ult', name: 'Cursed Energy Rush', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.78, hits: 4 }, { kind: 'buff', target: 'self', stat: 'crit', amount: 0.2, duration: 5 }], fx: 'nova', color: 0xc42b56 },
    ],
    passives: [{ kind: 'rage', atkPerHitTaken: 0.022, cap: 0.18 }], portrait: { glyph: 'YI', colorA: 0x5b2538, colorB: 0xe86a7d },
  },  {
    id: 'chewbacca', franchise: 'star-wars', name: 'Chewbacca', epithet: 'Loyal Wookiee Warrior', rarity: 'epic',
    tags: ['hero', 'alien', 'warrior', 'sci-fi', 'movie'],
    stats: { hp: 148000, atk: 12800, def: 58, spd: 31, crit: 0.16, critDmg: 1.65 },
    abilities: [
      { id: 'ch-basic', name: 'Wookiee Slam', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0x9a6a42 },
      { id: 'ch-skill', name: 'Bowcaster Burst', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.62, hits: 3 }], fx: 'bolt', color: 0x65d8ff },
      { id: 'ch-ult', name: 'Wookiee Rage', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-front', mult: 2.7 }, { kind: 'buff', target: 'self', stat: 'atk', amount: 0.22, duration: 5 }], fx: 'burst', color: 0xd99052 },
    ],
    passives: [{ kind: 'rage', atkPerHitTaken: 0.025, cap: 0.2 }], portrait: { glyph: 'CH', colorA: 0x4d2f20, colorB: 0xb47a4b },
  },
  {
    id: 'luke-skywalker', franchise: 'star-wars', name: 'Luke Skywalker', epithet: 'Return of the Jedi', rarity: 'legendary',
    tags: ['hero', 'warrior', 'magic', 'sci-fi', 'movie'],
    stats: { hp: 128000, atk: 14300, def: 55, spd: 39, crit: 0.2, critDmg: 1.7 },
    abilities: [
      { id: 'ls-basic', name: 'Lightsaber Slash', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0x55ff88 },
      { id: 'ls-skill', name: 'Force Push', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-all', mult: 0.72 }, { kind: 'debuff', target: 'enemy-all', stat: 'spd', amount: 0.1, duration: 4 }], fx: 'wave', color: 0xaeeeff },
      { id: 'ls-ult', name: 'Jedi Resolve', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 3.1 }, { kind: 'shield', target: 'self', mult: 1, duration: 5 }], fx: 'glow', color: 0x72ff9c },
    ],
    passives: [{ kind: 'dodge', chance: 0.13 }], portrait: { glyph: 'LS', colorA: 0x17231b, colorB: 0x55ff88 },
  },
  {
    id: 'princess-leia', franchise: 'star-wars', name: 'Princess Leia', epithet: 'Hope of the Rebellion', rarity: 'epic',
    tags: ['hero', 'royal', 'sci-fi', 'movie'],
    stats: { hp: 112000, atk: 11600, def: 48, spd: 38, crit: 0.2, critDmg: 1.65 },
    abilities: [
      { id: 'pl-basic', name: 'Blaster Shot', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'bolt', color: 0xff5268 },
      { id: 'pl-skill', name: 'Rebel Command', slot: 'skill', cooldown: 7, effects: [{ kind: 'buff', target: 'ally-all', stat: 'atk', amount: 0.14, duration: 5 }, { kind: 'buff', target: 'ally-all', stat: 'spd', amount: 0.1, duration: 5 }], fx: 'glow', color: 0x7fb8ff },
      { id: 'pl-ult', name: 'For the Rebellion', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 1.45 }, { kind: 'heal', target: 'ally-all', mult: 0.9 }], fx: 'nova', color: 0xffe5c2 },
    ],
    passives: [], portrait: { glyph: 'LE', colorA: 0x3d2630, colorB: 0xf3dfc4 },
  },
  {
    id: 'r2-d2', franchise: 'star-wars', name: 'R2-D2', epithet: 'Astromech Hero', rarity: 'rare',
    tags: ['hero', 'robot', 'sci-fi', 'movie'],
    stats: { hp: 118000, atk: 9300, def: 64, spd: 34, crit: 0.1, critDmg: 1.5 },
    abilities: [
      { id: 'r2-basic', name: 'Arc Prod', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }, { kind: 'status', target: 'enemy-front', status: 'shock', duration: 2, power: 0.08 }], fx: 'bolt', color: 0x57bfff },
      { id: 'r2-skill', name: 'Emergency Repair', slot: 'skill', cooldown: 7, effects: [{ kind: 'heal', target: 'ally-lowest', mult: 1.5 }, { kind: 'shield', target: 'ally-lowest', mult: 0.7, duration: 5 }], fx: 'glow', color: 0xddeeff },
      { id: 'r2-ult', name: 'System Override', slot: 'ult', effects: [{ kind: 'status', target: 'enemy-all', status: 'shock', duration: 4, power: 0.13 }, { kind: 'buff', target: 'ally-all', stat: 'spd', amount: 0.16, duration: 5 }], fx: 'nova', color: 0x4da8ff },
    ],
    passives: [], portrait: { glyph: 'R2', colorA: 0x1b4d87, colorB: 0xe8f5ff },
  },
  {
    id: 'yoda', franchise: 'star-wars', name: 'Yoda', epithet: 'Grand Master of the Jedi', rarity: 'supreme',
    tags: ['hero', 'alien', 'warrior', 'magic', 'sci-fi', 'movie'],
    stats: { hp: 122000, atk: 14700, def: 58, spd: 44, crit: 0.24, critDmg: 1.75 },
    abilities: [
      { id: 'yd-basic', name: 'Ataru Strike', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 0.56, hits: 2 }], fx: 'strike', color: 0x7dff62 },
      { id: 'yd-skill', name: 'The Force', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-back', mult: 1.65 }, { kind: 'debuff', target: 'enemy-back', stat: 'atk', amount: 0.14, duration: 4 }], fx: 'wave', color: 0xb8ffd2 },
      { id: 'yd-ult', name: 'Do, or Do Not', slot: 'ult', effects: [{ kind: 'heal', target: 'ally-all', mult: 1.2 }, { kind: 'buff', target: 'ally-all', stat: 'spd', amount: 0.22, duration: 6 }, { kind: 'buff', target: 'ally-all', stat: 'atk', amount: 0.12, duration: 6 }], fx: 'nova', color: 0xb7ff8f },
    ],
    passives: [{ kind: 'dodge', chance: 0.18 }], portrait: { glyph: 'Y', colorA: 0x294a20, colorB: 0xa8dd72 },
  },
  {
    id: 'gandalf', franchise: 'cinema', name: 'Gandalf', epithet: 'The White Wizard', rarity: 'supreme',
    tags: ['hero', 'magic', 'warrior', 'movie'],
    stats: { hp: 142000, atk: 14800, def: 62, spd: 34, crit: 0.18, critDmg: 1.7 },
    abilities: [
      { id: 'ga-basic', name: 'Glamdring', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0xe6f2ff },
      { id: 'ga-skill', name: 'You Shall Not Pass', slot: 'skill', cooldown: 8, effects: [{ kind: 'status', target: 'enemy-all', status: 'stun', duration: 1 }, { kind: 'shield', target: 'ally-all', mult: 0.95, duration: 5 }], fx: 'nova', color: 0xffffff },
      { id: 'ga-ult', name: 'Light of the Istari', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 1.75 }, { kind: 'heal', target: 'ally-all', mult: 1.15 }], fx: 'nova', color: 0xfff4c2 },
    ],
    passives: [{ kind: 'regen', pctPerSec: 0.008 }], portrait: { glyph: 'G', colorA: 0x4a5262, colorB: 0xf4edcf },
  },
  {
    id: 'indiana-jones', franchise: 'cinema', name: 'Indiana Jones', epithet: 'Raiders Never Quit', rarity: 'epic',
    tags: ['hero', 'detective', 'movie'],
    stats: { hp: 110000, atk: 12100, def: 44, spd: 38, crit: 0.25, critDmg: 1.75 },
    abilities: [
      { id: 'ij-basic', name: 'Bullwhip Crack', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0xc88a4a },
      { id: 'ij-skill', name: 'Fortune and Glory', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 1.55 }, { kind: 'debuff', target: 'enemy-lowest', stat: 'def', amount: 0.14, duration: 4 }], fx: 'burst', color: 0xe1b46f },
      { id: 'ij-ult', name: 'Temple Escape', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.76, hits: 4 }, { kind: 'buff', target: 'self', stat: 'spd', amount: 0.2, duration: 5 }], fx: 'burst', color: 0xffcc77 },
    ],
    passives: [{ kind: 'dodge', chance: 0.13 }], portrait: { glyph: 'IJ', colorA: 0x4b2d1a, colorB: 0xb8793c },
  },
  {
    id: 'king-kong', franchise: 'cinema', name: 'King Kong', epithet: 'Eighth Wonder of the World', rarity: 'legendary',
    tags: ['monster', 'movie'],
    stats: { hp: 205000, atk: 15300, def: 72, spd: 25, crit: 0.12, critDmg: 1.65 },
    abilities: [
      { id: 'kk-basic', name: 'Titan Fist', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0x8c735e },
      { id: 'kk-skill', name: 'Chest-Beating Roar', slot: 'skill', cooldown: 8, effects: [{ kind: 'status', target: 'self', status: 'taunt', duration: 3 }, { kind: 'buff', target: 'self', stat: 'atk', amount: 0.22, duration: 5 }], fx: 'wave', color: 0xb59a7f },
      { id: 'kk-ult', name: 'Skull Island Slam', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 1.9 }, { kind: 'status', target: 'enemy-front', status: 'stun', duration: 1.5 }], fx: 'nova', color: 0xd1b18e },
    ],
    passives: [{ kind: 'rage', atkPerHitTaken: 0.02, cap: 0.2 }], portrait: { glyph: 'KK', colorA: 0x27221f, colorB: 0x8a715f },
  },
  {
    id: 'robocop', franchise: 'cinema', name: 'RoboCop', epithet: 'Part Man, Part Machine', rarity: 'epic',
    tags: ['hero', 'robot', 'sci-fi', 'movie'],
    stats: { hp: 152000, atk: 12400, def: 78, spd: 25, crit: 0.18, critDmg: 1.65 },
    abilities: [
      { id: 'rc-basic', name: 'Auto-9 Burst', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 0.52, hits: 2 }], fx: 'bolt', color: 0xa6c9e8 },
      { id: 'rc-skill', name: 'Targeting Directive', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 1.7, executeBelow: 0.3 }, { kind: 'buff', target: 'self', stat: 'crit', amount: 0.16, duration: 5 }], fx: 'beam', color: 0xff5b5b },
      { id: 'rc-ult', name: 'Dead or Alive', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.68, hits: 5 }], fx: 'burst', color: 0xd7ebff },
    ],
    passives: [], portrait: { glyph: 'RC', colorA: 0x3d4855, colorB: 0xb8cedd },
  },
  {
    id: 'terminator', franchise: 'cinema', name: 'The Terminator', epithet: 'Cyberdyne Hunter-Killer', rarity: 'legendary',
    tags: ['villain', 'robot', 'sci-fi', 'assassin', 'movie'],
    stats: { hp: 174000, atk: 14500, def: 76, spd: 29, crit: 0.2, critDmg: 1.75 },
    abilities: [
      { id: 'tr-basic', name: 'Endoskeleton Strike', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0xaeb6bf },
      { id: 'tr-skill', name: 'Hunter-Killer', slot: 'skill', cooldown: 7, effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 2, executeBelow: 0.32 }], fx: 'beam', color: 0xff3030 },
      { id: 'tr-ult', name: "I'll Be Back", slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 1.65 }, { kind: 'shield', target: 'self', mult: 1.5, duration: 6 }], fx: 'nova', color: 0xff5544 },
    ],
    passives: [{ kind: 'regen', pctPerSec: 0.01 }], portrait: { glyph: 'T', colorA: 0x20252a, colorB: 0xd94137 },
  },
  {
    id: 'zorro', franchise: 'cinema', name: 'Zorro', epithet: 'The Masked Fox', rarity: 'rare',
    tags: ['hero', 'assassin', 'movie'],
    stats: { hp: 102000, atk: 11900, def: 42, spd: 43, crit: 0.28, critDmg: 1.8 },
    abilities: [
      { id: 'zr-basic', name: 'Rapier Slash', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0xe5e5e5 },
      { id: 'zr-skill', name: 'Mark of Z', slot: 'skill', cooldown: 5, effects: [{ kind: 'damage', target: 'enemy-back', mult: 1.65 }, { kind: 'debuff', target: 'enemy-back', stat: 'def', amount: 0.12, duration: 4 }], fx: 'strike', color: 0xffffff },
      { id: 'zr-ult', name: 'Fox in the Night', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-random', mult: 0.62, hits: 5 }, { kind: 'buff', target: 'self', stat: 'crit', amount: 0.2, duration: 5 }], fx: 'burst', color: 0xd6d6d6 },
    ],
    passives: [{ kind: 'dodge', chance: 0.18 }], portrait: { glyph: 'Z', colorA: 0x171717, colorB: 0xd9d9d9 },
  },
  {
    id: 'gary', franchise: 'spongebob', name: 'Gary', epithet: 'The Snail Who Knows Best', rarity: 'common',
    tags: ['cartoon'], stats: { hp: 98000, atk: 8500, def: 50, spd: 27, crit: 0.1, critDmg: 1.5 },
    abilities: [
      { id: 'gy-basic', name: 'Shell Bash', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0x6ecb8f },
      { id: 'gy-skill', name: 'Snail Trail', slot: 'skill', cooldown: 7, effects: [{ kind: 'debuff', target: 'enemy-all', stat: 'spd', amount: 0.12, duration: 5 }], fx: 'wave', color: 0x85e0b0 },
      { id: 'gy-ult', name: 'Meow of Wisdom', slot: 'ult', effects: [{ kind: 'heal', target: 'ally-all', mult: 1.3 }, { kind: 'shield', target: 'ally-lowest', mult: 0.8, duration: 5 }], fx: 'glow', color: 0xf4a0c8 },
    ],
    passives: [{ kind: 'regen', pctPerSec: 0.012 }], portrait: { glyph: 'G', colorA: 0x8f5b75, colorB: 0x76cf9b },
  },
  {
    id: 'mr-krabs', franchise: 'spongebob', name: 'Mr. Krabs', epithet: 'Owner of the Krusty Krab', rarity: 'rare',
    tags: ['cartoon'], stats: { hp: 132000, atk: 10100, def: 68, spd: 27, crit: 0.12, critDmg: 1.55 },
    abilities: [
      { id: 'mk-basic', name: 'Claw Clamp', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0xe54848 },
      { id: 'mk-skill', name: 'Money Shield', slot: 'skill', cooldown: 7, effects: [{ kind: 'shield', target: 'ally-all', mult: 0.82, duration: 5 }], fx: 'glow', color: 0xffd33d },
      { id: 'mk-ult', name: 'Krabby Patty Empire', slot: 'ult', effects: [{ kind: 'heal', target: 'ally-all', mult: 1.15 }, { kind: 'buff', target: 'ally-all', stat: 'def', amount: 0.14, duration: 5 }], fx: 'nova', color: 0xffb52e },
    ],
    passives: [], portrait: { glyph: '$', colorA: 0x8f2929, colorB: 0xffcf3e },
  },
  {
    id: 'sandy-cheeks', franchise: 'spongebob', name: 'Sandy Cheeks', epithet: 'Texas Tough', rarity: 'epic',
    tags: ['hero', 'cartoon', 'warrior', 'sci-fi'], stats: { hp: 116000, atk: 12700, def: 55, spd: 39, crit: 0.19, critDmg: 1.7 },
    abilities: [
      { id: 'sc-basic', name: 'Karate Chop', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'strike', color: 0xd8a25a },
      { id: 'sc-skill', name: 'Texas Roundhouse', slot: 'skill', cooldown: 6, effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 1.7 }, { kind: 'status', target: 'enemy-lowest', status: 'stun', duration: 1 }], fx: 'burst', color: 0xffc66b },
      { id: 'sc-ult', name: 'Science Rodeo', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 1.45 }, { kind: 'buff', target: 'ally-all', stat: 'spd', amount: 0.14, duration: 5 }], fx: 'nova', color: 0x78d8ff },
    ],
    passives: [{ kind: 'dodge', chance: 0.12 }], portrait: { glyph: 'SC', colorA: 0x6e4a2c, colorB: 0xdcb26f },
  },
  {
    id: 'squidward', franchise: 'spongebob', name: 'Squidward', epithet: 'Clarinet Virtuoso', rarity: 'rare',
    tags: ['cartoon'], stats: { hp: 104000, atk: 9800, def: 44, spd: 31, crit: 0.13, critDmg: 1.55 },
    abilities: [
      { id: 'sq-basic', name: 'Clarinet Note', slot: 'basic', effects: [{ kind: 'damage', target: 'enemy-front', mult: 1 }], fx: 'wave', color: 0x72c8c8 },
      { id: 'sq-skill', name: 'Dissonant Solo', slot: 'skill', cooldown: 6, effects: [{ kind: 'debuff', target: 'enemy-all', stat: 'atk', amount: 0.13, duration: 5 }, { kind: 'damage', target: 'enemy-all', mult: 0.55 }], fx: 'wave', color: 0x9be4dd },
      { id: 'sq-ult', name: 'Bold and Brash', slot: 'ult', effects: [{ kind: 'damage', target: 'enemy-all', mult: 1.5 }, { kind: 'debuff', target: 'enemy-all', stat: 'def', amount: 0.12, duration: 5 }], fx: 'nova', color: 0xc69ad8 },
    ],
    passives: [], portrait: { glyph: 'SQ', colorA: 0x356c73, colorB: 0x8ed2ca },
  },
];