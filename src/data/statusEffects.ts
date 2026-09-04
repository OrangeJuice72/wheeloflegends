import type { StatusKind } from './types';

/** Effects shown on battle cards and in the optional battle glossary. */
export type CombatEffectKind = StatusKind | 'shield' | 'empower' | 'fortify' | 'focus';

export interface StatusEffectDef {
  name: string;
  icon: string;
  color: number;
  beneficial: boolean;
  description: string;
  /** Used when a status is authored without an explicit power value. */
  defaultPower?: number;
}

export const STATUS_EFFECTS: Record<CombatEffectKind, StatusEffectDef> = {
  burn: {
    name: 'Burn', icon: '🔥', color: 0xff713d, beneficial: false,
    description: 'Takes damage every second. Reapplying Burn refreshes its duration.',
  },
  shock: {
    name: 'Shock', icon: '⚡', color: 0x49cfff, beneficial: false, defaultPower: 0.2,
    description: 'Takes damage every second and loses 20% Speed.',
  },
  bleed: {
    name: 'Bleed', icon: '🩸', color: 0xd92f52, beneficial: false,
    description: 'Takes damage every second that bypasses Defense and shields.',
  },
  stun: {
    name: 'Stun', icon: '💫', color: 0xffd85b, beneficial: false,
    description: 'Cannot act while Stunned.',
  },
  freeze: {
    name: 'Freeze', icon: '❄️', color: 0x8de7ff, beneficial: false,
    description: 'Cannot act while Frozen.',
  },
  regen: {
    name: 'Regen', icon: '💚', color: 0x55e889, beneficial: true,
    description: 'Restores a percentage of maximum health every second.',
  },
  taunt: {
    name: 'Taunt', icon: '🛡️', color: 0xf4c95d, beneficial: true,
    description: 'Draws eligible single-target enemy attacks.',
  },
  haste: {
    name: 'Haste', icon: '⏩', color: 0x55e4ff, beneficial: true, defaultPower: 0.25,
    description: 'Increases Speed, causing the unit to act more frequently.',
  },
  slow: {
    name: 'Slow', icon: '🐌', color: 0x8093bd, beneficial: false, defaultPower: 0.25,
    description: 'Reduces Speed and delays upcoming turns.',
  },
  weaken: {
    name: 'Weaken', icon: '📉', color: 0xe28578, beneficial: false, defaultPower: 0.2,
    description: 'Reduces damage dealt by lowering Attack.',
  },
  vulnerable: {
    name: 'Vulnerable', icon: '🎯', color: 0xff5f7d, beneficial: false, defaultPower: 0.2,
    description: 'Takes increased damage from all direct attacks.',
  },
  shield: {
    name: 'Shield', icon: '🔷', color: 0x58bfff, beneficial: true,
    description: 'Absorbs incoming damage before health is lost.',
  },
  empower: {
    name: 'Empower', icon: '⚔️', color: 0xffb957, beneficial: true,
    description: 'Attack is temporarily increased.',
  },
  fortify: {
    name: 'Fortify', icon: '🏰', color: 0x9fc4ff, beneficial: true,
    description: 'Defense is temporarily increased.',
  },
  focus: {
    name: 'Focus', icon: '✨', color: 0xe6a7ff, beneficial: true,
    description: 'Critical-hit chance is temporarily increased.',
  },
};

export const STATUS_EFFECT_ORDER = Object.keys(STATUS_EFFECTS) as CombatEffectKind[];

export function statusPower(kind: StatusKind, authored = 0): number {
  return authored || STATUS_EFFECTS[kind].defaultPower || 0;
}

export function combatEffectForBuff(stat: 'atk' | 'def' | 'spd' | 'crit', amount: number): CombatEffectKind {
  if (amount < 0) {
    if (stat === 'spd') return 'slow';
    if (stat === 'atk') return 'weaken';
    return 'vulnerable';
  }
  if (stat === 'spd') return 'haste';
  if (stat === 'def') return 'fortify';
  if (stat === 'crit') return 'focus';
  return 'empower';
}
