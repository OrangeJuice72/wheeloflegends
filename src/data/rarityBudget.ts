/** A transparent content budget for screening rarity assignments. */

import type { CharacterDef, EffectDef, PassiveDef, Rarity } from './types';

export interface RarityBudget {
  min: number;
  target: number;
  max: number;
}

export const RARITY_POWER_BUDGET: Record<Rarity, RarityBudget> = {
  common: { min: 38, target: 49, max: 60 },
  rare: { min: 46, target: 58, max: 70 },
  epic: { min: 54, target: 67, max: 80 },
  legendary: { min: 62, target: 76, max: 90 },
  supreme: { min: 70, target: 86, max: 102 },
  godlike: { min: 80, target: 98, max: 120 },
};

function effectPower(effect: EffectDef): number {
  switch (effect.kind) {
    case 'damage': return effect.mult * (effect.hits ?? 1) * 2.4 + (effect.lifesteal ?? 0) * 12 + (effect.executeBelow ?? 0) * 8;
    case 'heal': return effect.mult * 2.2;
    case 'shield': return effect.mult * 1.7 + effect.duration * 0.18;
    case 'status': return effect.duration * (0.45 + (effect.power ?? 0) * 2.5);
    case 'buff': return effect.amount * effect.duration * 3.2;
    case 'debuff': return effect.amount * effect.duration * 3.4;
  }
}

function passivePower(passive: PassiveDef): number {
  switch (passive.kind) {
    case 'prep': return passive.effects.reduce((sum, effect) => sum + effectPower(effect), 0) * 0.7;
    case 'transform': return 5 + passive.atk * 12 + passive.spd * 10 + (passive.healPct ?? 0) * 10;
    case 'regen': return passive.pctPerSec * 120;
    case 'dodge': return passive.chance * 28;
    case 'rage': return passive.cap * 12 + passive.atkPerHitTaken * 18;
  }
}

export function characterPowerScore(character: CharacterDef): number {
  const stats = character.stats;
  const statPower = stats.hp / 10000 * 0.9
    + stats.atk / 1000 * 1.2
    + stats.def / 10
    + stats.spd * 0.35
    + stats.crit * 20
    + Math.max(0, stats.critDmg - 1) * 8;
  const abilityPower = character.abilities.reduce((sum, ability) => {
    const slotWeight = ability.slot === 'basic' ? 0.75 : ability.slot === 'skill' ? 0.9 : 0.7;
    const cooldownWeight = ability.slot === 'skill' ? Math.min(1.15, 8 / Math.max(4, ability.cooldown ?? 8)) : 1;
    return sum + ability.effects.reduce((effectSum, effect) => effectSum + effectPower(effect), 0) * slotWeight * cooldownWeight;
  }, 0);
  const passivePowerTotal = character.passives.reduce((sum, passive) => sum + passivePower(passive), 0);
  return Math.round((statPower + abilityPower + passivePowerTotal) * 10) / 10;
}

export function rarityBudgetStatus(character: CharacterDef): 'low' | 'within' | 'high' {
  const score = characterPowerScore(character);
  const budget = RARITY_POWER_BUDGET[character.rarity];
  return score < budget.min ? 'low' : score > budget.max ? 'high' : 'within';
}
