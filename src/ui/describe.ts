/** Human-readable text generated straight from ability/passive data — the UI
 * never hand-writes descriptions, so text can never drift from behavior. */

import type { AbilityDef, EffectDef, PassiveDef, TargetMode } from '../data/types';

const TARGET_NAME: Record<TargetMode, string> = {
  'enemy-front': 'the front enemy',
  'enemy-lowest': 'the weakest enemy',
  'enemy-back': 'the enemy back line',
  'enemy-random': 'a random enemy',
  'enemy-all': 'ALL enemies',
  self: 'self',
  'ally-lowest': 'the most wounded ally',
  'ally-all': 'all allies',
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function describeEffect(eff: EffectDef): string {
  switch (eff.kind) {
    case 'damage': {
      const hits = eff.hits && eff.hits > 1 ? ` ×${eff.hits}` : '';
      let s = `Deals ${pct(eff.mult)} ATK${hits} to ${TARGET_NAME[eff.target]}`;
      if (eff.lifesteal) s += `, healing ${pct(eff.lifesteal)} of damage dealt`;
      if (eff.executeBelow) s += `; always crits below ${pct(eff.executeBelow)} HP`;
      return s;
    }
    case 'heal':
      return `Heals ${TARGET_NAME[eff.target]} for ${pct(eff.mult)} ATK`;
    case 'shield':
      return `Shields ${TARGET_NAME[eff.target]} for ${pct(eff.mult)} ATK (${eff.duration}s)`;
    case 'status': {
      const t = TARGET_NAME[eff.target];
      switch (eff.status) {
        case 'burn':
          return `Burns ${t} for ${pct(eff.power ?? 0)} ATK/s (${eff.duration}s)`;
        case 'shock':
          return `Shocks ${t}: ${pct(eff.power ?? 0)} ATK/s and −20% SPD (${eff.duration}s)`;
        case 'stun':
          return `Stuns ${t} (${eff.duration}s)`;
        case 'freeze':
          return `Freezes ${t} (${eff.duration}s)`;
        case 'regen':
          return `Grants ${t} ${pct(eff.power ?? 0)} max-HP regen/s (${eff.duration}s)`;
        case 'taunt':
          return `Taunts: draws enemy attacks (${eff.duration}s)`;
      }
      break;
    }
    case 'buff':
      return `+${pct(eff.amount)} ${eff.stat.toUpperCase()} to ${TARGET_NAME[eff.target]} (${eff.duration}s)`;
    case 'debuff':
      return `−${pct(eff.amount)} ${eff.stat.toUpperCase()} on ${TARGET_NAME[eff.target]} (${eff.duration}s)`;
  }
  return '';
}

export function describeAbility(ability: AbilityDef): string {
  return ability.effects.map(describeEffect).join(' · ');
}

export function abilitySlotLabel(ability: AbilityDef): string {
  if (ability.slot === 'basic') return 'BASIC · builds energy';
  if (ability.slot === 'skill') return `SKILL · ${ability.cooldown}s cooldown`;
  return 'ULTIMATE · at full energy';
}

export function describePassive(p: PassiveDef): string {
  switch (p.kind) {
    case 'prep':
      return `Prep Time — at battle start: ${p.effects.map(describeEffect).join(' · ')}`;
    case 'transform':
      return `At ${pct(p.atHpPct)} HP transforms — ${p.name} (+${pct(p.atk)} ATK, +${pct(p.spd)} SPD${p.healPct ? `, heals ${pct(p.healPct)}` : ''})`;
    case 'regen':
      return `Regenerates ${pct(p.pctPerSec)} max HP per second`;
    case 'dodge':
      return `${pct(p.chance)} chance to dodge attacks`;
    case 'rage':
      return `+${pct(p.atkPerHitTaken)} ATK each time struck (max +${pct(p.cap)})`;
  }
}
