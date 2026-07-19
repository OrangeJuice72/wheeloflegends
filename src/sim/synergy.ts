/** Synergy resolution: which team bonuses are active for a set of characters. */

import type { CharacterDef, SynergyBonus, SynergyDef } from '../data/types';
import { SYNERGIES } from '../data/synergies';

export interface ActiveSynergy {
  def: SynergyDef;
  count: number; // distinct characters carrying the tag
  tierIndex: number; // index into def.thresholds of the active tier
  bonus: SynergyBonus;
  desc: string;
}

/** Distinct-character tag counts (duplicates of one character never stack tags). */
export function computeSynergies(team: readonly CharacterDef[]): ActiveSynergy[] {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const c of team) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    for (const tag of c.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const active: ActiveSynergy[] = [];
  for (const def of SYNERGIES) {
    const count = counts.get(def.tag) ?? 0;
    let tierIndex = -1;
    for (let i = 0; i < def.thresholds.length; i++) {
      if (count >= (def.thresholds[i]?.count ?? Infinity)) tierIndex = i;
    }
    if (tierIndex >= 0) {
      const tier = def.thresholds[tierIndex]!;
      active.push({ def, count, tierIndex, bonus: tier.bonus, desc: tier.desc });
    }
  }
  return active;
}

/** Sum of all active bonuses, ready to bake into unit stats. */
export function combineBonuses(active: readonly ActiveSynergy[]): Required<SynergyBonus> {
  const total: Required<SynergyBonus> = { atk: 0, hp: 0, spd: 0, def: 0, crit: 0, energyGain: 0, regenPerSec: 0 };
  for (const a of active) {
    total.atk += a.bonus.atk ?? 0;
    total.hp += a.bonus.hp ?? 0;
    total.spd += a.bonus.spd ?? 0;
    total.def += a.bonus.def ?? 0;
    total.crit += a.bonus.crit ?? 0;
    total.energyGain += a.bonus.energyGain ?? 0;
    total.regenPerSec += a.bonus.regenPerSec ?? 0;
  }
  return total;
}
