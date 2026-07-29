/**
 * Elite affixes: modifiers carried by elite-room leaders so a hard floor is
 * memorable rather than just numerically bigger. Each maps onto mechanics the
 * battle sim already understands (stat deltas, shields, regen, lifesteal).
 */

import type { ItemBoosts } from './items';

export type AffixId = 'shielded' | 'enraged' | 'regenerating' | 'vampiric' | 'swift' | 'armored';

export interface AffixDef {
  id: AffixId;
  name: string;
  icon: string;
  /** One line shown on the enemy scouting report. */
  short: string;
  /** Flat stat deltas folded in alongside items. */
  boosts?: ItemBoosts;
  /** Fraction of max HP restored per second. */
  regenPerSec?: number;
  /** Fraction of damage dealt returned as healing. */
  lifesteal?: number;
  /** Battle-start shield as a fraction of the unit's ATK. */
  shieldMult?: number;
}

export const AFFIXES: readonly AffixDef[] = [
  {
    id: 'shielded', name: 'Shielded', icon: '🛡',
    short: 'Enters battle behind a heavy barrier.',
    shieldMult: 2.4,
  },
  {
    id: 'enraged', name: 'Enraged', icon: '💢',
    short: 'Strikes far harder, but is more fragile.',
    boosts: { atk: 0.35, hp: -0.12 },
  },
  {
    id: 'regenerating', name: 'Regenerating', icon: '♻',
    short: 'Continuously knits its wounds shut.',
    regenPerSec: 0.02,
  },
  {
    id: 'vampiric', name: 'Vampiric', icon: '🩸',
    short: 'Heals for a share of all damage it deals.',
    lifesteal: 0.3,
  },
  {
    id: 'swift', name: 'Swift', icon: '💨',
    short: 'Acts noticeably more often than it should.',
    boosts: { spd: 0.3, crit: 0.08 },
  },
  {
    id: 'armored', name: 'Armored', icon: '⛓',
    short: 'Plated against everything you can throw at it.',
    boosts: { def: 0.45, hp: 0.15 },
  },
];

const BY_ID: ReadonlyMap<AffixId, AffixDef> = new Map(AFFIXES.map((a) => [a.id, a]));

export function getAffix(id: AffixId): AffixDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown affix: ${id}`);
  return def;
}
