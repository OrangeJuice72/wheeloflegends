/** Run-defining relics. Unlike equipment, relics affect the whole formation. */

import { Balance } from './balance';
import type { ItemBoosts } from './items';
import type { CharacterDef, Rarity } from './types';

export type RelicTier = 'common' | 'rare' | 'epic';

export interface RelicEffect {
  boosts?: ItemBoosts;
  frontBoosts?: ItemBoosts;
  backBoosts?: ItemBoosts;
  rarity?: Rarity;
  rarityBoosts?: ItemBoosts;
  startingEnergy?: number;
  lifesteal?: number;
  postBattleHeal?: number;
  goldBonus?: number;
}

export interface RelicDef {
  id: string;
  name: string;
  icon: string;
  tier: RelicTier;
  description: string;
  effect: RelicEffect;
}

export const RELICS: readonly RelicDef[] = [
  {
    id: 'underdog-crown', name: 'Underdog Crown', icon: '♟️', tier: 'rare',
    description: 'Common legends gain +16% HP and ATK.',
    effect: { rarity: 'common', rarityBoosts: { hp: 0.16, atk: 0.16 } },
  },
  {
    id: 'vanguard-oath', name: 'Vanguard Oath', icon: '⚔️', tier: 'rare',
    description: 'Front-line legends gain +14% ATK and +10% DEF.',
    effect: { frontBoosts: { atk: 0.14, def: 0.10 } },
  },
  {
    id: 'guardian-lantern', name: 'Guardian Lantern', icon: '🏮', tier: 'rare',
    description: 'Back-line legends gain +16% DEF and +18% energy generation.',
    effect: { backBoosts: { def: 0.16, energyGain: 0.18 } },
  },
  {
    id: 'quicksilver-hourglass', name: 'Quicksilver Hourglass', icon: '⌛', tier: 'rare',
    description: 'The entire formation gains +12% speed.',
    effect: { boosts: { spd: 0.12 } },
  },
  {
    id: 'precision-sigil', name: 'Precision Sigil', icon: '🎯', tier: 'common',
    description: 'The entire formation gains +7% critical chance.',
    effect: { boosts: { crit: 0.07 } },
  },
  {
    id: 'unity-standard', name: 'Unity Standard', icon: '🚩', tier: 'epic',
    description: 'Every legend gains +8% HP and ATK.',
    effect: { boosts: { hp: 0.08, atk: 0.08 } },
  },
  {
    id: 'mana-prism', name: 'Mana Prism', icon: '🔷', tier: 'epic',
    description: 'Every legend begins battle with 30 energy.',
    effect: { startingEnergy: 30 },
  },
  {
    id: 'soul-siphon', name: 'Soul Siphon', icon: '🩸', tier: 'epic',
    description: 'Legends heal for 8% of the damage they deal.',
    effect: { lifesteal: 0.08 },
  },
  {
    id: 'phoenix-feather', name: 'Phoenix Feather', icon: '🪶', tier: 'epic',
    description: 'After every battle, the roster recovers 12% HP.',
    effect: { postBattleHeal: 0.12 },
  },
  {
    id: 'gilded-compass', name: 'Gilded Compass', icon: '🧭', tier: 'common',
    description: 'Battle payouts are increased by 18%.',
    effect: { goldBonus: 0.18 },
  },
] as const;

const BY_ID = new Map(RELICS.map((relic) => [relic.id, relic]));

export function getRelic(id: string): RelicDef {
  const relic = BY_ID.get(id);
  if (!relic) throw new Error(`Unknown relic: ${id}`);
  return relic;
}

function addBoosts(target: ItemBoosts, source?: ItemBoosts): void {
  if (!source) return;
  for (const [key, value] of Object.entries(source) as Array<[keyof ItemBoosts, number]>) {
    target[key] = (target[key] ?? 0) + value;
  }
}

export interface RelicCombatBonuses {
  boosts: ItemBoosts;
  startingEnergy: number;
  lifesteal: number;
}

export function relicCombatBonuses(ids: readonly string[], character: CharacterDef, slot: number): RelicCombatBonuses {
  const result: RelicCombatBonuses = { boosts: {}, startingEnergy: 0, lifesteal: 0 };
  for (const id of ids) {
    const effect = getRelic(id).effect;
    addBoosts(result.boosts, effect.boosts);
    addBoosts(result.boosts, slot < Balance.team.frontSlots ? effect.frontBoosts : effect.backBoosts);
    if (effect.rarity === character.rarity) addBoosts(result.boosts, effect.rarityBoosts);
    result.startingEnergy += effect.startingEnergy ?? 0;
    result.lifesteal += effect.lifesteal ?? 0;
  }
  return result;
}

export function relicRunTotals(ids: readonly string[]): { postBattleHeal: number; goldBonus: number } {
  return ids.reduce((total, id) => {
    const effect = getRelic(id).effect;
    total.postBattleHeal += effect.postBattleHeal ?? 0;
    total.goldBonus += effect.goldBonus ?? 0;
    return total;
  }, { postBattleHeal: 0, goldBonus: 0 });
}
