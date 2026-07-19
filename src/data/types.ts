/**
 * Content type definitions. Characters are pure data that parameterize reusable
 * ability/passive components — the sim knows components, never characters.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'supreme' | 'godlike';

export type WeaknessType = 'magic' | 'technology' | 'speed' | 'power' | 'energy' | 'precision';

export type Tag =
  | 'hero'
  | 'villain'
  | 'anime'
  | 'movie'
  | 'cartoon'
  | 'video-game'
  | 'monster'
  | 'magic'
  | 'sci-fi'
  | 'robot'
  | 'alien'
  | 'detective'
  | 'assassin'
  | 'royal'
  | 'warrior'
  | 'justice-league'
  | 'avenger'
  | 'saiyan'
  | 'tmnt';

/** Who an effect is aimed at, resolved by the sim's targeting rules. */
export type TargetMode =
  | 'enemy-front' // taunt > front row > back row (standard attack)
  | 'enemy-lowest' // lowest HP% enemy
  | 'enemy-back' // back row first (assassin dives)
  | 'enemy-random'
  | 'enemy-all'
  | 'self'
  | 'ally-lowest'
  | 'ally-all';

export type StatusKind = 'burn' | 'shock' | 'stun' | 'freeze' | 'regen' | 'taunt';

export type BuffStat = 'atk' | 'def' | 'spd' | 'crit';

export type EffectDef =
  | {
      kind: 'damage';
      target: TargetMode;
      mult: number; // of attacker ATK, per hit
      hits?: number; // multi-hit (default 1)
      lifesteal?: number; // fraction of damage healed back
      executeBelow?: number; // guaranteed crit vs targets under this HP%
    }
  | { kind: 'heal'; target: 'self' | 'ally-lowest' | 'ally-all'; mult: number }
  | { kind: 'shield'; target: 'self' | 'ally-lowest' | 'ally-all'; mult: number; duration: number }
  | { kind: 'status'; target: TargetMode; status: StatusKind; duration: number; power?: number }
  | { kind: 'buff'; target: 'self' | 'ally-all'; stat: BuffStat; amount: number; duration: number }
  | { kind: 'debuff'; target: TargetMode; stat: BuffStat; amount: number; duration: number };

/** Visual identity of an ability, consumed only by the presentation layer. */
export type AbilityFx = 'strike' | 'beam' | 'burst' | 'nova' | 'bolt' | 'glow' | 'wave';

export interface AbilityDef {
  id: string;
  name: string;
  slot: 'basic' | 'skill' | 'ult';
  cooldown?: number; // seconds (skills only)
  effects: EffectDef[];
  fx: AbilityFx;
  color: number; // signature FX color
}

export type PassiveDef =
  | { kind: 'prep'; effects: EffectDef[] } // fires once at battle start (Batman)
  | { kind: 'transform'; atHpPct: number; name: string; atk: number; spd: number; healPct?: number }
  | { kind: 'regen'; pctPerSec: number }
  | { kind: 'dodge'; chance: number }
  | { kind: 'rage'; atkPerHitTaken: number; cap: number };

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spd: number; // action meter gain/sec; acts at 100
  crit: number; // 0..1
  critDmg: number; // multiplier, e.g. 1.5
}

export interface CharacterDef {
  id: string;
  name: string;
  epithet: string; // card flavor line, e.g. "The Dark Knight"
  franchise: string; // id into FRANCHISES (reel 1 of the recruit slots)
  rarity: Rarity;
  weakness?: WeaknessType;
  tags: Tag[];
  stats: Stats;
  abilities: AbilityDef[]; // exactly one basic, one skill, one ult
  passives: PassiveDef[];
  portrait: { glyph: string; colorA: number; colorB: number };
}

export interface SynergyDef {
  id: string;
  name: string;
  tag: Tag;
  icon: string;
  /** Sorted ascending by count. */
  thresholds: { count: number; desc: string; bonus: SynergyBonus }[];
}

export interface SynergyBonus {
  atk?: number; // fractional, e.g. 0.12 = +12%
  hp?: number;
  spd?: number;
  def?: number;
  crit?: number; // additive, e.g. 0.10
  energyGain?: number; // fractional boost to energy generation
  regenPerSec?: number; // % max HP per second
}
