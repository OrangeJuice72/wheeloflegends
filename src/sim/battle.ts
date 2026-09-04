/**
 * Deterministic battle simulation with optional player decision checkpoints.
 * No imports from ui/audio/pixi — enforced by the check script.
 */

import { Rng } from '../core/Rng';
import { Balance } from '../data/balance';
import { getCharacter } from '../data/characters';
import { exploitsWeakness } from '../data/characterRules';
import type { AbilityDef, CharacterDef, EffectDef, StatusKind, TargetMode } from '../data/types';
import { effectiveItemBoosts, getShopItem, itemBattleSummary, itemExtraActions, itemGrantedAbility } from '../data/items';
import type { ItemBoosts } from '../data/items';
import { getAffix, type AffixId } from '../data/affixes';
import { getBossMechanic } from '../data/bosses';
import { combatEffectForBuff, statusPower, type CombatEffectKind } from '../data/statusEffects';
import { combineBonuses, computeSynergies } from './synergy';
import type { ActiveEffectSnapshot, BattleEvent, BattleResult, EnemyIntentSnapshot, Side, UnitResultStats } from './events';

export interface CombatantSpec {
  defId: string;
  level: number;
  slot: number; // 0..1 front row, 2..4 back row
  hpPct: number; // carry-over health entering the battle (0..1]
  statScale: number; // floor scaling (enemy) or relic scaling (player)
  itemBoosts?: ItemBoosts;
  itemId?: string;
  /** Always-applied per-stat deltas from run modifiers; stacks on top of items. */
  extraBoosts?: ItemBoosts;
  /** Elite modifier carried by this unit (elite rooms only). */
  affix?: AffixId;
  /** Run relic effects that cannot be represented as ordinary stat boosts. */
  startingEnergy?: number;
  lifesteal?: number;
  boss?: boolean;
}

export type BattleAbilitySlot = AbilityDef['slot'] | 'charge' | 'item';

export interface BattleChoice {
  uid: string;
  slot: BattleAbilitySlot;
  /** Optional explicit target for single-target actions. */
  targetUid?: string;
}

export type AutoStrategy = 'balanced' | 'aggressive' | 'defensive' | 'conserve';

export interface BattleSimulationOptions {
  /** Stop before each player action that does not yet have a supplied choice. */
  manual?: boolean;
  /** Chronological player decisions already made. Used to deterministically resume. */
  choices?: readonly BattleChoice[];
  /** Player-side automatic decision policy. Enemies always use balanced AI. */
  autoStrategy?: AutoStrategy;
}
interface StatusInst {
  kind: StatusKind;
  timeLeft: number;
  dps: number; // burn/shock damage per second (absolute)
  hps: number; // regen heal per second (absolute)
  power: number;
  sourceUid: string;
}

interface BuffInst {
  stat: 'atk' | 'def' | 'spd' | 'crit';
  amount: number; // fractional for atk/def/spd, additive for crit; negative = debuff
  timeLeft: number;
}

interface Unit {
  uid: string;
  def: CharacterDef;
  side: Side;
  slot: number;
  boss: boolean;
  bossPhaseIndex: number;
  maxHp: number;
  hp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  baseCrit: number;
  critDmg: number;
  energyGainMult: number;
  itemName?: string;
  itemEffect?: string;
  itemAbility?: AbilityDef; // granted by a resonant artifact (the ITEM action)
  itemCd: number;
  extraActions: number;
  affix?: AffixId; // elite modifier, if any
  affixLifesteal: number; // fraction of damage dealt healed back (Vampiric)
  regenPerSec: number; // fraction of maxHp per second (passive + synergy)
  dodgeChance: number;
  ragePerHit: number;
  rageCap: number;
  rageStacks: number;
  transformed: boolean;
  meter: number;
  energy: number;
  skillCd: number;
  shields: { amount: number; timeLeft: number }[];
  statuses: StatusInst[];
  buffs: BuffInst[];
  alive: boolean;
  // result stats
  damageDealt: number;
  healingDone: number;
  dodges: number;
  kills: number;
}

const B = Balance.battle;

function makeUnit(spec: CombatantSpec, side: Side, index: number, synergyBonus: ReturnType<typeof combineBonuses>): Unit {
  const def = getCharacter(spec.defId);
  const levelMult = 1 + Balance.level.statGainPerLevel * (spec.level - 1);
  const bossMult = spec.boss ? Balance.tower.bossStatMult : 1;
  const heldItem = spec.itemId ? getShopItem(spec.itemId) : undefined;
  const item = heldItem ? effectiveItemBoosts(heldItem, def) : spec.itemBoosts ?? {};
  // Run-modifier deltas and any elite affix stack on the same channel.
  const affix = spec.affix ? getAffix(spec.affix) : undefined;
  const runBoosts = spec.extraBoosts ?? {};
  const affixBoosts = affix?.boosts ?? {};
  const extra = (key: keyof ItemBoosts): number => (runBoosts[key] ?? 0) + (affixBoosts[key] ?? 0);
  const isFront = spec.slot < Balance.team.frontSlots;
  const hpMult = levelMult * spec.statScale * bossMult * Math.max(0.1, 1 + synergyBonus.hp + (item.hp ?? 0) + extra('hp'));
  const atkMult = levelMult * spec.statScale * bossMult
    * (1 + synergyBonus.atk + (item.atk ?? 0) + extra('atk'))
    * (isFront ? 1 + B.frontAttackBonus : 1);

  let regen = synergyBonus.regenPerSec + (affix?.regenPerSec ?? 0);
  let dodge = 0;
  let ragePerHit = 0;
  let rageCap = 0;
  for (const p of def.passives) {
    if (p.kind === 'regen') regen += p.pctPerSec;
    if (p.kind === 'dodge') dodge = Math.max(dodge, p.chance);
    if (p.kind === 'rage') {
      ragePerHit = p.atkPerHitTaken;
      rageCap = p.cap;
    }
  }

  const maxHp = Math.round(def.stats.hp * hpMult);
  const baseAtk = Math.round(def.stats.atk * atkMult);
  return {
    uid: `${side === 'player' ? 'p' : 'e'}${index}`,
    def,
    side,
    slot: spec.slot,
    boss: spec.boss ?? false,
    bossPhaseIndex: 0,
    affix: spec.affix,
    affixLifesteal: (affix?.lifesteal ?? 0) + (spec.lifesteal ?? 0),
    maxHp,
    hp: Math.max(1, Math.round(maxHp * spec.hpPct)),
    baseAtk,
    baseDef: def.stats.def
      * (1 + synergyBonus.def + (item.def ?? 0) + extra('def'))
      * (isFront ? 1 : 1 + B.backDefenseBonus),
    baseSpd: def.stats.spd * (1 + synergyBonus.spd + (item.spd ?? 0) + extra('spd')),
    baseCrit: def.stats.crit + synergyBonus.crit + (item.crit ?? 0) + extra('crit'),
    critDmg: def.stats.critDmg,
    energyGainMult: 1 + synergyBonus.energyGain + (item.energyGain ?? 0),
    itemName: heldItem?.name,
    itemEffect: heldItem ? itemBattleSummary(heldItem, def) : undefined,
    itemAbility: heldItem ? itemGrantedAbility(heldItem, def) : undefined,
    itemCd: 0,
    extraActions: heldItem ? itemExtraActions(heldItem, def) : 0,
    regenPerSec: regen,
    dodgeChance: dodge,
    ragePerHit,
    rageCap,
    rageStacks: 0,
    transformed: false,
    meter: 0,
    energy: Math.min(B.energyMax, Math.max(0, spec.startingEnergy ?? 0)),
    skillCd: 0,
    // A Shielded elite starts the fight already behind its barrier.
    shields: affix?.shieldMult ? [{ amount: Math.round(baseAtk * affix.shieldMult), timeLeft: Number.POSITIVE_INFINITY }] : [],
    statuses: [],
    buffs: [],
    alive: true,
    damageDealt: 0,
    healingDone: 0,
    dodges: 0,
    kills: 0,
  };
}

function buffTotal(u: Unit, stat: BuffInst['stat']): number {
  let sum = 0;
  for (const b of u.buffs) if (b.stat === stat) sum += b.amount;
  return sum;
}

function atkOf(u: Unit): number {
  const rage = Math.min(u.rageStacks * u.ragePerHit, u.rageCap);
  const weaken = Math.max(0, ...u.statuses.filter((s) => s.kind === 'weaken').map((s) => s.power));
  return u.baseAtk * Math.max(0.1, 1 + buffTotal(u, 'atk') + rage - weaken);
}
function defOf(u: Unit): number {
  return Math.max(0, u.baseDef * (1 + buffTotal(u, 'def')));
}
function spdOf(u: Unit): number {
  const shocked = u.statuses.some((s) => s.kind === 'shock') ? -0.2 : 0;
  const haste = Math.max(0, ...u.statuses.filter((s) => s.kind === 'haste').map((s) => s.power));
  const slow = Math.max(0, ...u.statuses.filter((s) => s.kind === 'slow').map((s) => s.power));
  return Math.max(1, u.baseSpd * (1 + buffTotal(u, 'spd') + shocked + haste - slow));
}
function critOf(u: Unit): number {
  return Math.min(1, Math.max(0, u.baseCrit + buffTotal(u, 'crit')));
}
function hasStatus(u: Unit, kind: StatusKind): boolean {
  return u.statuses.some((s) => s.kind === kind);
}
function isCrowdControlled(u: Unit): boolean {
  return hasStatus(u, 'stun') || hasStatus(u, 'freeze');
}

export function simulateBattle(
  playerSpecs: CombatantSpec[],
  enemySpecs: CombatantSpec[],
  seed: number,
  options: BattleSimulationOptions = {},
): BattleResult {
  const rng = new Rng(seed);
  const events: BattleEvent[] = [];
  let t = 0;
  let choiceIndex = 0;
  let pendingChoice: Extract<BattleEvent, { kind: 'choice' }> | undefined;
  const emit = (e: BattleEvent) => events.push(e);

  const build = (specs: CombatantSpec[], side: Side) => {
    const defs = specs.map((s) => getCharacter(s.defId));
    const active = computeSynergies(defs);
    const bonus = combineBonuses(active);
    for (const a of active) {
      emit({ t, kind: 'synergy', side, name: a.def.name, icon: a.def.icon, desc: a.desc });
    }
    return specs.map((s, i) => {
      const u = makeUnit(s, side, i, bonus);
      emit({ t, kind: 'spawn', uid: u.uid, defId: u.def.id, side, slot: u.slot, maxHp: u.maxHp, hp: u.hp, level: s.level, boss: u.boss });
      if (u.itemName && u.itemEffect) {
        emit({ t, kind: 'item', uid: u.uid, itemName: u.itemName, effect: u.itemEffect });
      }
      return u;
    });
  };

  emit({ t, kind: 'start' });
  const player = build(playerSpecs, 'player');
  const enemy = build(enemySpecs, 'enemy');
  const all = [...player, ...enemy];
  const foesOf = (u: Unit) => (u.side === 'player' ? enemy : player);
  const alliesOf = (u: Unit) => (u.side === 'player' ? player : enemy);

  // ── targeting ──────────────────────────────────────────────────────────
  const aliveOf = (units: Unit[]) => units.filter((x) => x.alive);

  function pickSingle(actor: Unit, mode: TargetMode): Unit | null {
    const foes = aliveOf(foesOf(actor));
    const allies = aliveOf(alliesOf(actor));
    if (foes.length === 0 && mode.startsWith('enemy')) return null;
    switch (mode) {
      case 'enemy-front': {
        const taunters = foes.filter((f) => hasStatus(f, 'taunt'));
        if (taunters.length > 0) return rng.pick(taunters);
        const front = foes.filter((f) => f.slot < Balance.team.frontSlots);
        return rng.pick(front.length > 0 ? front : foes);
      }
      case 'enemy-back': {
        const back = foes.filter((f) => f.slot >= Balance.team.frontSlots);
        return rng.pick(back.length > 0 ? back : foes);
      }
      case 'enemy-lowest': {
        return foes.reduce((min, f) => (f.hp / f.maxHp < min.hp / min.maxHp ? f : min));
      }
      case 'enemy-random': {
        const taunters = foes.filter((f) => hasStatus(f, 'taunt'));
        return rng.pick(taunters.length > 0 ? taunters : foes);
      }
      case 'self':
        return actor;
      case 'ally-lowest': {
        if (allies.length === 0) return null;
        return allies.reduce((min, a) => (a.hp / a.maxHp < min.hp / min.maxHp ? a : min));
      }
      default:
        return null;
    }
  }

  function validManualTargets(actor: Unit, mode: TargetMode): Unit[] {
    const foes = aliveOf(foesOf(actor));
    const allies = aliveOf(alliesOf(actor));
    if (mode === 'ally-lowest') return allies;
    if (mode === 'enemy-front') {
      const taunters = foes.filter((target) => hasStatus(target, 'taunt'));
      if (taunters.length > 0) return taunters;
      const front = foes.filter((target) => target.slot < Balance.team.frontSlots);
      return front.length > 0 ? front : foes;
    }
    if (mode === 'enemy-back') {
      const back = foes.filter((target) => target.slot >= Balance.team.frontSlots);
      return back.length > 0 ? back : foes;
    }
    if (mode === 'enemy-lowest' || mode === 'enemy-random') return foes;
    return [];
  }

  function targetsFor(actor: Unit, mode: TargetMode, explicitTarget?: Unit): Unit[] {
    if (mode === 'enemy-all') return aliveOf(foesOf(actor));
    if (mode === 'ally-all') return aliveOf(alliesOf(actor));
    if (explicitTarget && validManualTargets(actor, mode).includes(explicitTarget)) return [explicitTarget];
    const single = pickSingle(actor, mode);
    return single ? [single] : [];
  }

  // ── damage / heal / shield primitives ──────────────────────────────────
  function applyDamage(source: Unit, target: Unit, raw: number, crit: boolean, weakness = false): void {
    if (!target.alive) return;
    if (target.dodgeChance > 0 && rng.chance(target.dodgeChance)) {
      target.dodges++;
      emit({ t, kind: 'dodge', target: target.uid });
      return;
    }
    const vulnerable = Math.max(0, ...target.statuses.filter((s) => s.kind === 'vulnerable').map((s) => s.power));
    let amount = Math.max(1, Math.round(raw * (1 + vulnerable)));
    let shielded = false;
    for (const sh of target.shields) {
      if (amount <= 0) break;
      const absorbed = Math.min(sh.amount, amount);
      if (absorbed > 0) {
        sh.amount -= absorbed;
        amount -= absorbed;
        shielded = true;
      }
    }
    target.shields = target.shields.filter((s) => s.amount > 0);
    target.hp = Math.max(0, target.hp - amount);
    source.damageDealt += amount;
    target.energy = Math.min(B.energyMax, target.energy + B.energyWhenStruck * target.energyGainMult);
    if (target.ragePerHit > 0) target.rageStacks++;
    emit({ t, kind: 'damage', source: source.uid, target: target.uid, amount, crit, weakness, hpAfter: target.hp, shielded });
    // Vampiric elites drink from every blow they land.
    if (source.affixLifesteal > 0 && amount > 0 && source.alive) applyHeal(source, source, amount * source.affixLifesteal);
    if (target.hp <= 0) {
      target.alive = false;
      source.kills++;
      emit({ t, kind: 'death', uid: target.uid });
    } else {
      checkTransform(target);
      checkBossPhases(target);
    }
  }

  function applyHeal(source: Unit, target: Unit, raw: number): void {
    if (!target.alive) return;
    const amount = Math.min(Math.max(0, Math.round(raw)), target.maxHp - target.hp);
    if (amount <= 0) return;
    target.hp += amount;
    source.healingDone += amount;
    emit({ t, kind: 'heal', source: source.uid, target: target.uid, amount, hpAfter: target.hp });
  }

  /** Statuses do not stack with themselves: the stronger application wins and duration refreshes. */
  function applyStatus(source: Unit, target: Unit, kind: StatusKind, duration: number, authoredPower = 0): void {
    if (!target.alive) return;
    const power = statusPower(kind, authoredPower);
    const dps = kind === 'burn' || kind === 'shock' || kind === 'bleed' ? atkOf(source) * power : 0;
    const hps = kind === 'regen' ? target.maxHp * power : 0;
    const current = target.statuses.find((status) => status.kind === kind);
    if (current) {
      current.timeLeft = Math.max(current.timeLeft, duration);
      if (power >= current.power) {
        current.power = power;
        current.dps = dps;
        current.hps = hps;
        current.sourceUid = source.uid;
      }
    } else {
      target.statuses.push({ kind, timeLeft: duration, dps, hps, power, sourceUid: source.uid });
    }
    emit({ t, kind: 'status', source: source.uid, target: target.uid, status: kind, duration });
  }

  function checkTransform(u: Unit): void {
    if (u.transformed) return;
    for (const p of u.def.passives) {
      if (p.kind === 'transform' && u.hp / u.maxHp <= p.atHpPct) {
        u.transformed = true;
        u.buffs.push({ stat: 'atk', amount: p.atk, timeLeft: Infinity });
        u.buffs.push({ stat: 'spd', amount: p.spd, timeLeft: Infinity });
        if (p.healPct) u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * p.healPct));
        emit({ t, kind: 'transform', uid: u.uid, name: p.name });
      }
    }
  }

  function checkBossPhases(u: Unit): void {
    if (!u.boss || !u.alive) return;
    const mechanic = getBossMechanic(u.def.id);
    if (!mechanic) return;
    while (u.bossPhaseIndex < mechanic.phases.length) {
      const phase = mechanic.phases[u.bossPhaseIndex]!;
      if (u.hp / u.maxHp > phase.atHpPct) break;
      u.bossPhaseIndex++;
      emit({
        t, kind: 'bossPhase', uid: u.uid, phase: u.bossPhaseIndex,
        name: phase.name, effect: phase.short, color: phase.color,
      });
      if (phase.atk) {
        u.buffs.push({ stat: 'atk', amount: phase.atk, timeLeft: Infinity });
        emit({ t, kind: 'buff', source: u.uid, target: u.uid, stat: 'atk', amount: phase.atk, duration: B.timeLimit });
      }
      if (phase.spd) {
        u.buffs.push({ stat: 'spd', amount: phase.spd, timeLeft: Infinity });
        emit({ t, kind: 'buff', source: u.uid, target: u.uid, stat: 'spd', amount: phase.spd, duration: B.timeLimit });
      }
      if (phase.shieldMult) {
        const amount = Math.round(atkOf(u) * phase.shieldMult);
        u.shields.push({ amount, timeLeft: 8 });
        emit({ t, kind: 'shield', source: u.uid, target: u.uid, amount });
      }
      if (phase.pulse && phase.pulseMult) {
        const foes = aliveOf(foesOf(u));
        const preferred = phase.pulse === 'all' ? foes : foes.filter((target) =>
          phase.pulse === 'front'
            ? target.slot < Balance.team.frontSlots
            : target.slot >= Balance.team.frontSlots);
        for (const target of preferred.length > 0 ? preferred : foes) {
          applyDamage(u, target, atkOf(u) * phase.pulseMult, false);
          if (phase.burn && target.alive) {
            applyStatus(u, target, 'burn', 3, 0.08);
          }
        }
      }
    }
  }

  // ── effect application ─────────────────────────────────────────────────
  function applyEffects(actor: Unit, effects: readonly EffectDef[], explicitTarget?: Unit): void {
    for (const eff of effects) {
      switch (eff.kind) {
        case 'damage': {
          const hits = eff.hits ?? 1;
          for (let h = 0; h < hits; h++) {
            for (const target of targetsFor(actor, eff.target, explicitTarget)) {
              const variance = 1 + rng.float(-B.damageVariance, B.damageVariance);
              const reduction = B.defenseScale / (B.defenseScale + defOf(target));
              const execute = eff.executeBelow !== undefined && target.hp / target.maxHp < eff.executeBelow;
              const crit = execute || rng.chance(critOf(actor));
              let dmg = atkOf(actor) * eff.mult * reduction * variance;
              if (crit) dmg *= actor.critDmg;
              const weakness = exploitsWeakness(actor.def, target.def);
              if (weakness) dmg *= B.weaknessDamageMult;
              applyDamage(actor, target, dmg, crit, weakness);
              if (eff.lifesteal) applyHeal(actor, actor, dmg * eff.lifesteal);
            }
          }
          break;
        }
        case 'heal':
          for (const target of targetsFor(actor, eff.target, explicitTarget)) applyHeal(actor, target, atkOf(actor) * eff.mult);
          break;
        case 'shield':
          for (const target of targetsFor(actor, eff.target, explicitTarget)) {
            const amount = Math.round(atkOf(actor) * eff.mult);
            target.shields.push({ amount, timeLeft: eff.duration });
            emit({ t, kind: 'shield', source: actor.uid, target: target.uid, amount });
          }
          break;
        case 'status':
          for (const target of targetsFor(actor, eff.target, explicitTarget)) {
            applyStatus(actor, target, eff.status, eff.duration, eff.power ?? 0);
          }
          break;
        case 'buff':
          for (const target of targetsFor(actor, eff.target, explicitTarget)) {
            target.buffs.push({ stat: eff.stat, amount: eff.amount, timeLeft: eff.duration });
            emit({ t, kind: 'buff', source: actor.uid, target: target.uid, stat: eff.stat, amount: eff.amount, duration: eff.duration });
          }
          break;
        case 'debuff':
          for (const target of targetsFor(actor, eff.target, explicitTarget)) {
            target.buffs.push({ stat: eff.stat, amount: -eff.amount, timeLeft: eff.duration });
            emit({ t, kind: 'buff', source: actor.uid, target: target.uid, stat: eff.stat, amount: -eff.amount, duration: eff.duration });
          }
          break;
      }
    }
  }

  const bySlot = (u: Unit, slot: AbilityDef['slot']): AbilityDef => {
    const ability = u.def.abilities.find((candidate) => candidate.slot === slot);
    if (!ability) throw new Error(`${u.def.id} has no ${slot} ability`);
    return ability;
  };

  const energyCost = (slot: BattleAbilitySlot): number => {
    if (slot === 'ult') return B.energyMax;
    if (slot === 'skill') return B.skillEnergyCost;
    return 0; // basic, charge, and artifact skills cost no energy
  };

  const canUse = (u: Unit, slot: BattleAbilitySlot): boolean => {
    if (slot === 'basic' || slot === 'charge') return true;
    if (slot === 'item') return u.itemAbility !== undefined && u.itemCd <= 0;
    if (u.energy < energyCost(slot)) return false;
    return slot !== 'skill' || u.skillCd <= 0;
  };

  const abilityForSlot = (u: Unit, slot: BattleAbilitySlot): AbilityDef | undefined =>
    slot === 'charge' ? undefined : slot === 'item' ? u.itemAbility : bySlot(u, slot);

  const targetUidsFor = (u: Unit, ability: AbilityDef | undefined): string[] => {
    if (!ability) return [];
    const targetMode = ability.effects
      .map((effect) => effect.target)
      .find((mode) => mode !== 'self' && mode !== 'enemy-all' && mode !== 'ally-all');
    return targetMode ? validManualTargets(u, targetMode).map((target) => target.uid) : [];
  };

  function choiceOptions(u: Unit) {
    const slots: BattleAbilitySlot[] = ['basic', 'skill', 'ult', 'charge'];
    if (u.itemAbility) slots.push('item');
    return slots.map((slot) => ({
      slot,
      ability: slot === 'charge' ? 'Charge' : slot === 'item' ? u.itemAbility!.name : bySlot(u, slot).name,
      energyCost: energyCost(slot),
      available: canUse(u, slot),
      cooldown: slot === 'skill' ? Math.ceil(u.skillCd * 10) / 10 : slot === 'item' ? Math.ceil(u.itemCd * 10) / 10 : 0,
      targetUids: targetUidsFor(u, abilityForSlot(u, slot)),
    }));
  }

  function automaticAbility(u: Unit, strategy: AutoStrategy = 'balanced'): BattleAbilitySlot {
    const support = (slot: BattleAbilitySlot): boolean => {
      const ability = abilityForSlot(u, slot);
      return ability?.effects.some((effect) => effect.kind === 'heal' || effect.kind === 'shield' || effect.kind === 'buff' || (effect.kind === 'status' && effect.status === 'regen')) ?? false;
    };
    if (strategy === 'aggressive') {
      if (canUse(u, 'ult')) return 'ult';
      if (canUse(u, 'item')) return 'item';
      if (canUse(u, 'skill')) return 'skill';
      return 'basic';
    }
    if (strategy === 'defensive') {
      if (canUse(u, 'ult') && support('ult')) return 'ult';
      if (canUse(u, 'item') && support('item')) return 'item';
      if (canUse(u, 'skill') && support('skill')) return 'skill';
      if (u.hp / u.maxHp < 0.45 && u.energy < B.energyMax) return 'charge';
    }
    if (strategy === 'conserve') {
      if (canUse(u, 'ult') && aliveOf(foesOf(u)).length <= 1) return 'ult';
      if (canUse(u, 'item')) return 'item';
      if (canUse(u, 'skill')) return 'skill';
      return 'basic';
    }
    if (canUse(u, 'ult')) return 'ult';
    if (canUse(u, 'item')) return 'item';
    if (canUse(u, 'skill')) return 'skill';
    if (u.energy < B.skillEnergyCost && u.hp / u.maxHp > 0.35) return 'charge';
    return 'basic';
  }

  function previewTargets(actor: Unit, ability: AbilityDef | undefined): { uids: string[]; mode: string } {
    if (!ability) return { uids: [actor.uid], mode: 'self' };
    const modes = [...new Set(ability.effects.map((effect) => effect.target))];
    const targetUids = new Set<string>();
    const label: TargetMode = modes.find((mode) => mode.startsWith('enemy')) ?? modes[0] ?? 'self';
    for (const mode of [label]) {
      if (mode === 'self') targetUids.add(actor.uid);
      else if (mode === 'enemy-all') aliveOf(foesOf(actor)).forEach((unit) => targetUids.add(unit.uid));
      else if (mode === 'ally-all') aliveOf(alliesOf(actor)).forEach((unit) => targetUids.add(unit.uid));
      else if (mode === 'enemy-random') validManualTargets(actor, mode).forEach((unit) => targetUids.add(unit.uid));
      else {
        const candidates = validManualTargets(actor, mode);
        if (mode === 'enemy-lowest' || mode === 'ally-lowest') {
          const lowest = candidates.reduce<Unit | undefined>((best, unit) =>
            !best || unit.hp / unit.maxHp < best.hp / best.maxHp ? unit : best, undefined);
          if (lowest) targetUids.add(lowest.uid);
        } else if (candidates[0]) {
          // Front/back attacks pick randomly from this legal row. Showing every
          // candidate is more honest than claiming an exact target prematurely.
          candidates.forEach((unit) => targetUids.add(unit.uid));
        }
      }
    }
    return { uids: [...targetUids], mode: label };
  }

  function intentFor(u: Unit): EnemyIntentSnapshot {
    const slot = automaticAbility(u);
    const ability = abilityForSlot(u, slot);
    const targets = previewTargets(u, ability);
    const effects = ability?.effects ?? [];
    const controls = effects.some((effect) => effect.kind === 'debuff'
      || (effect.kind === 'status' && ['stun', 'freeze', 'shock', 'slow', 'weaken', 'vulnerable'].includes(effect.status)));
    const supports = effects.some((effect) => effect.kind === 'heal' || effect.kind === 'shield' || effect.kind === 'buff'
      || (effect.kind === 'status' && ['regen', 'taunt', 'haste'].includes(effect.status)));
    const kind = slot === 'ult' ? 'ultimate'
      : slot === 'charge' ? 'charge'
        : controls ? 'control'
          : supports && !effects.some((effect) => effect.kind === 'damage') ? 'support'
            : 'attack';
    return {
      slot,
      ability: slot === 'charge' ? 'Charge' : ability?.name ?? 'Basic Attack',
      kind,
      targetUids: targets.uids,
      targetMode: targets.mode,
    };
  }

  function act(u: Unit): boolean {
    let slot: BattleAbilitySlot;
    let explicitTarget: Unit | undefined;
    if (u.side === 'player') {
      const supplied = options.choices?.[choiceIndex];
      if (supplied) {
        if (supplied.uid !== u.uid) {
          throw new Error(`Choice ${choiceIndex} belongs to ${supplied.uid}; expected ${u.uid}`);
        }
        if (!canUse(u, supplied.slot)) {
          throw new Error(`${u.def.name} cannot use ${supplied.slot} with ${Math.round(u.energy)} energy`);
        }
        slot = supplied.slot;
        const option = choiceOptions(u).find((candidate) => candidate.slot === slot)!;
        if (supplied.targetUid) {
          if (!option.targetUids.includes(supplied.targetUid)) throw new Error(`${supplied.targetUid} is not a valid target for ${u.def.name}'s ${slot}`);
          explicitTarget = all.find((candidate) => candidate.uid === supplied.targetUid);
        }
        choiceIndex++;
      } else if (options.manual) {
        pendingChoice = {
          t,
          kind: 'choice',
          uid: u.uid,
          energy: Math.round(u.energy),
          options: choiceOptions(u),
        };
        emit(pendingChoice);
        return false;
      } else {
        slot = automaticAbility(u, options.autoStrategy ?? 'balanced');
      }
    } else {
      slot = automaticAbility(u);
    }

    if (slot === 'charge') {
      u.energy = Math.min(B.energyMax, u.energy + B.energyPerCharge * u.energyGainMult);
      emit({ t, kind: 'act', uid: u.uid, ability: 'Charge', slot, fx: 'glow', color: 0x35c8ff });
      return true;
    }

    const ability = slot === 'item' ? u.itemAbility! : bySlot(u, slot);
    if (slot === 'ult') u.energy = 0;
    else if (slot === 'skill') {
      u.energy = Math.max(0, u.energy - B.skillEnergyCost);
      u.skillCd = ability.cooldown ?? 0;
    } else if (slot === 'item') {
      u.itemCd = ability.cooldown ?? 10;
      if (u.itemName && u.itemEffect) {
        emit({ t, kind: 'itemProc', uid: u.uid, itemName: u.itemName, effect: u.itemEffect });
      }
    } else {
      u.energy = Math.min(B.energyMax, u.energy + B.energyPerBasic * u.energyGainMult);
    }
    emit({ t, kind: 'act', uid: u.uid, ability: ability.name, slot, fx: ability.fx, color: ability.color });
    applyEffects(u, ability.effects, explicitTarget);
    for (let bonus = 0; bonus < u.extraActions && aliveOf(foesOf(u)).length > 0; bonus++) {
      if (u.itemName && u.itemEffect) {
        emit({ t, kind: 'itemProc', uid: u.uid, itemName: u.itemName, effect: u.itemEffect });
      }
      applyEffects(u, ability.effects, explicitTarget);
    }
    return true;
  }
  // ── battle-start passives (prep) ───────────────────────────────────────
  for (const u of all) {
    for (const p of u.def.passives) {
      if (p.kind === 'prep' && u.alive) applyEffects(u, p.effects);
    }
  }

  // ── main loop ──────────────────────────────────────────────────────────
  const activeEffectsOf = (unit: Unit): ActiveEffectSnapshot[] => {
    const effects = new Map<CombatEffectKind, ActiveEffectSnapshot>();
    const add = (kind: CombatEffectKind, remaining: number, value?: number) => {
      const current = effects.get(kind);
      if (!current || remaining > current.remaining || (value ?? 0) > (current.value ?? 0)) {
        effects.set(kind, { kind, remaining, ...(value !== undefined ? { value } : {}) });
      }
    };
    unit.statuses.forEach((status) => add(status.kind, status.timeLeft, status.power));
    unit.buffs.forEach((buff) => add(combatEffectForBuff(buff.stat, buff.amount), buff.timeLeft, Math.abs(buff.amount)));
    if (unit.shields.length > 0) {
      add('shield', Math.max(...unit.shields.map((shield) => shield.timeLeft)), unit.shields.reduce((sum, shield) => sum + shield.amount, 0));
    }
    return [...effects.values()];
  };

  const forecastTurnOrder = (living: Unit[], count = 8): string[] => {
    const eligible = living.filter((unit) => !isCrowdControlled(unit));
    const meters = new Map(eligible.map((unit) => [unit.uid, unit.meter]));
    const order: string[] = [];
    while (eligible.length > 0 && order.length < count) {
      const next = [...eligible].sort((a, b) => {
        const aWait = Math.max(0, B.actionMeterMax - (meters.get(a.uid) ?? 0)) / spdOf(a);
        const bWait = Math.max(0, B.actionMeterMax - (meters.get(b.uid) ?? 0)) / spdOf(b);
        return aWait - bWait || a.uid.localeCompare(b.uid);
      })[0]!;
      const wait = Math.max(0, B.actionMeterMax - (meters.get(next.uid) ?? 0)) / spdOf(next);
      for (const unit of eligible) meters.set(unit.uid, Math.min(B.actionMeterMax, (meters.get(unit.uid) ?? 0) + spdOf(unit) * wait));
      meters.set(next.uid, 0);
      order.push(next.uid);
    }
    return order;
  };

  const snapshot = () => {
    const living = all.filter((unit) => unit.alive);
    const turnOrder = forecastTurnOrder(living);
    emit({
      t,
      kind: 'tick',
      turnOrder,
      units: all.map((unit) => ({
        uid: unit.uid,
        hp: unit.hp,
        energy: Math.round(unit.energy),
        meter: Math.round(unit.meter),
        effects: activeEffectsOf(unit),
        ...(unit.side === 'enemy' && unit.alive ? { intent: intentFor(unit) } : {}),
      })),
    });
  };
  snapshot();

  const bossTimers = new Map<string, number>();
  for (const unit of enemy) {
    const mechanic = unit.boss ? getBossMechanic(unit.def.id) : undefined;
    if (mechanic) bossTimers.set(unit.uid, mechanic.firstAt);
  }

  let statusAccum = 0;
  let snapshotAccum = 0;
  const dt = B.tickSeconds;

  while (t < B.timeLimit) {
    t = Math.round((t + dt) * 1000) / 1000;

    // durations
    for (const u of all) {
      if (!u.alive) continue;
      u.skillCd = Math.max(0, u.skillCd - dt);
      u.itemCd = Math.max(0, u.itemCd - dt);
      for (const s of u.statuses) s.timeLeft -= dt;
      u.statuses = u.statuses.filter((s) => s.timeLeft > 0);
      for (const b of u.buffs) b.timeLeft -= dt;
      u.buffs = u.buffs.filter((b) => b.timeLeft > 0);
      for (const sh of u.shields) sh.timeLeft -= dt;
      u.shields = u.shields.filter((sh) => sh.timeLeft > 0 && sh.amount > 0);
      u.energy = Math.min(B.energyMax, u.energy + B.energyPerSecond * u.energyGainMult * dt);
    }

    // periodic status ticks (dots, regen) once per second
    statusAccum += dt;
    if (statusAccum >= B.statusTickSeconds - 1e-9) {
      statusAccum = 0;
      for (const u of all) {
        if (!u.alive) continue;
        let regen = u.maxHp * u.regenPerSec;
        for (const s of u.statuses) {
          regen += s.hps;
          if (s.dps <= 0 || !u.alive) continue;
          const amount = Math.max(1, Math.round(s.dps));
          const source = all.find((candidate) => candidate.uid === s.sourceUid);
          u.hp = Math.max(0, u.hp - amount);
          if (source) source.damageDealt += amount;
          emit({ t, kind: 'damage', source: s.sourceUid, target: u.uid, amount, crit: false, weakness: false, hpAfter: u.hp, shielded: false });
          if (u.hp <= 0) {
            u.alive = false;
            if (source) source.kills++;
            emit({ t, kind: 'death', uid: u.uid });
            break;
          }
          checkTransform(u);
          checkBossPhases(u);
        }
        if (!u.alive) continue;
        if (regen > 0 && u.hp < u.maxHp) {
          const amount = Math.min(Math.round(regen), u.maxHp - u.hp);
          if (amount > 0) {
            u.hp += amount;
            emit({ t, kind: 'heal', source: u.uid, target: u.uid, amount, hpAfter: u.hp });
          }
        }
      }
    }

    // Named guardians bend the rules on a readable, repeating cadence.
    for (const boss of enemy) {
      const mechanic = boss.boss && boss.alive ? getBossMechanic(boss.def.id) : undefined;
      const due = bossTimers.get(boss.uid);
      if (!mechanic || due === undefined || t + 1e-9 < due) continue;
      emit({ t, kind: 'bossMechanic', uid: boss.uid, name: mechanic.name, effect: mechanic.short, color: mechanic.color });
      if (mechanic.kind === 'psychic-barrier') {
        const amount = Math.round(atkOf(boss) * 2.2);
        boss.shields.push({ amount, timeLeft: 7 });
        emit({ t, kind: 'shield', source: boss.uid, target: boss.uid, amount });
      } else {
        const wantsBack = mechanic.kind === 'backline-fallout';
        const preferred = aliveOf(player).filter((target) => wantsBack
          ? target.slot >= Balance.team.frontSlots
          : target.slot < Balance.team.frontSlots);
        const targets = preferred.length > 0 ? preferred : aliveOf(player);
        for (const target of targets) {
          applyDamage(boss, target, atkOf(boss) * 0.58, false);
          if (target.alive) {
            applyStatus(boss, target, 'burn', 3, 0.08);
          }
        }
      }
      const phaseCadence = Math.max(0.55, 1 - boss.bossPhaseIndex * 0.2);
      bossTimers.set(boss.uid, due + mechanic.interval * phaseCadence);
    }

    // action meters
    for (const u of all) {
      if (!u.alive || isCrowdControlled(u)) continue;
      u.meter += spdOf(u) * dt;
      if (u.meter >= B.actionMeterMax) {
        u.meter = 0;
        if (!act(u)) break;
      }
      if (aliveOf(player).length === 0 || aliveOf(enemy).length === 0) break;
    }

    if (pendingChoice) break;

    snapshotAccum += dt;
    if (snapshotAccum >= 0.5 - 1e-9) {
      snapshotAccum = 0;
      snapshot();
    }

    if (aliveOf(player).length === 0 || aliveOf(enemy).length === 0) break;
  }

  // ── resolve winner ─────────────────────────────────────────────────────
  const hpPctOf = (units: Unit[]) => units.reduce((s, u) => s + (u.alive ? u.hp / u.maxHp : 0), 0);
  let winner: Side;
  if (aliveOf(enemy).length === 0 && aliveOf(player).length > 0) winner = 'player';
  else if (aliveOf(player).length === 0 && aliveOf(enemy).length > 0) winner = 'enemy';
  else winner = hpPctOf(player) >= hpPctOf(enemy) ? 'player' : 'enemy'; // timeout
  if (!pendingChoice) {
    snapshot();
    emit({ t, kind: 'end', winner, duration: t });
  }

  const units: UnitResultStats[] = all.map((u) => ({
    uid: u.uid,
    defId: u.def.id,
    side: u.side,
    damageDealt: Math.round(u.damageDealt),
    healingDone: Math.round(u.healingDone),
    kills: u.kills,
    dodges: u.dodges,
    alive: u.alive,
    hpPct: u.alive ? u.hp / u.maxHp : 0,
  }));

  return { winner, duration: t, events, units, ...(pendingChoice ? { pendingChoice } : {}) };
}
