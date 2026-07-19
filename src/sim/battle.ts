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
import { combineBonuses, computeSynergies } from './synergy';
import type { BattleEvent, BattleResult, Side, UnitResultStats } from './events';

export interface CombatantSpec {
  defId: string;
  level: number;
  slot: number; // 0..2 front row, 3..4 back row
  hpPct: number; // carry-over health entering the battle (0..1]
  statScale: number; // floor scaling (enemy) or relic scaling (player)
  itemBoosts?: ItemBoosts;
  itemId?: string;
  boss?: boolean;
}

export type BattleAbilitySlot = AbilityDef['slot'] | 'charge' | 'item';

export interface BattleChoice {
  uid: string;
  slot: BattleAbilitySlot;
}

export interface BattleSimulationOptions {
  /** Stop before each player action that does not yet have a supplied choice. */
  manual?: boolean;
  /** Chronological player decisions already made. Used to deterministically resume. */
  choices?: readonly BattleChoice[];
}
interface StatusInst {
  kind: StatusKind;
  timeLeft: number;
  dps: number; // burn/shock damage per second (absolute)
  hps: number; // regen heal per second (absolute)
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
  kills: number;
}

const B = Balance.battle;

function makeUnit(spec: CombatantSpec, side: Side, index: number, synergyBonus: ReturnType<typeof combineBonuses>): Unit {
  const def = getCharacter(spec.defId);
  const levelMult = 1 + Balance.level.statGainPerLevel * (spec.level - 1);
  const bossMult = spec.boss ? Balance.tower.bossStatMult : 1;
  const heldItem = spec.itemId ? getShopItem(spec.itemId) : undefined;
  const item = heldItem ? effectiveItemBoosts(heldItem, def) : spec.itemBoosts ?? {};
  const hpMult = levelMult * spec.statScale * bossMult * (1 + synergyBonus.hp + (item.hp ?? 0));
  const atkMult = levelMult * spec.statScale * bossMult * (1 + synergyBonus.atk + (item.atk ?? 0));

  let regen = synergyBonus.regenPerSec;
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
  return {
    uid: `${side === 'player' ? 'p' : 'e'}${index}`,
    def,
    side,
    slot: spec.slot,
    boss: spec.boss ?? false,
    maxHp,
    hp: Math.max(1, Math.round(maxHp * spec.hpPct)),
    baseAtk: Math.round(def.stats.atk * atkMult),
    baseDef: def.stats.def * (1 + synergyBonus.def + (item.def ?? 0)),
    baseSpd: def.stats.spd * (1 + synergyBonus.spd + (item.spd ?? 0)),
    baseCrit: def.stats.crit + synergyBonus.crit + (item.crit ?? 0),
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
    energy: 0,
    skillCd: 0,
    shields: [],
    statuses: [],
    buffs: [],
    alive: true,
    damageDealt: 0,
    healingDone: 0,
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
  return u.baseAtk * Math.max(0.1, 1 + buffTotal(u, 'atk') + rage);
}
function defOf(u: Unit): number {
  return Math.max(0, u.baseDef * (1 + buffTotal(u, 'def')));
}
function spdOf(u: Unit): number {
  const shocked = u.statuses.some((s) => s.kind === 'shock') ? -0.2 : 0;
  return Math.max(1, u.baseSpd * (1 + buffTotal(u, 'spd') + shocked));
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

  function targetsFor(actor: Unit, mode: TargetMode): Unit[] {
    if (mode === 'enemy-all') return aliveOf(foesOf(actor));
    if (mode === 'ally-all') return aliveOf(alliesOf(actor));
    const single = pickSingle(actor, mode);
    return single ? [single] : [];
  }

  // ── damage / heal / shield primitives ──────────────────────────────────
  function applyDamage(source: Unit, target: Unit, raw: number, crit: boolean, weakness = false): void {
    if (!target.alive) return;
    if (target.dodgeChance > 0 && rng.chance(target.dodgeChance)) {
      emit({ t, kind: 'dodge', target: target.uid });
      return;
    }
    let amount = Math.max(1, Math.round(raw));
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
    if (target.hp <= 0) {
      target.alive = false;
      source.kills++;
      emit({ t, kind: 'death', uid: target.uid });
    } else {
      checkTransform(target);
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

  // ── effect application ─────────────────────────────────────────────────
  function applyEffects(actor: Unit, effects: readonly EffectDef[]): void {
    for (const eff of effects) {
      switch (eff.kind) {
        case 'damage': {
          const hits = eff.hits ?? 1;
          for (let h = 0; h < hits; h++) {
            for (const target of targetsFor(actor, eff.target)) {
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
          for (const target of targetsFor(actor, eff.target)) applyHeal(actor, target, atkOf(actor) * eff.mult);
          break;
        case 'shield':
          for (const target of targetsFor(actor, eff.target)) {
            const amount = Math.round(atkOf(actor) * eff.mult);
            target.shields.push({ amount, timeLeft: eff.duration });
            emit({ t, kind: 'shield', source: actor.uid, target: target.uid, amount });
          }
          break;
        case 'status':
          for (const target of targetsFor(actor, eff.target)) {
            if (!target.alive) continue;
            const power = eff.power ?? 0;
            target.statuses.push({
              kind: eff.status,
              timeLeft: eff.duration,
              dps: eff.status === 'burn' || eff.status === 'shock' ? atkOf(actor) * power : 0,
              hps: eff.status === 'regen' ? target.maxHp * power : 0,
            });
            emit({ t, kind: 'status', source: actor.uid, target: target.uid, status: eff.status, duration: eff.duration });
          }
          break;
        case 'buff':
          for (const target of targetsFor(actor, eff.target)) {
            target.buffs.push({ stat: eff.stat, amount: eff.amount, timeLeft: eff.duration });
            emit({ t, kind: 'buff', source: actor.uid, target: target.uid, stat: eff.stat, amount: eff.amount, duration: eff.duration });
          }
          break;
        case 'debuff':
          for (const target of targetsFor(actor, eff.target)) {
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

  function choiceOptions(u: Unit) {
    const slots: BattleAbilitySlot[] = ['basic', 'skill', 'ult', 'charge'];
    if (u.itemAbility) slots.push('item');
    return slots.map((slot) => ({
      slot,
      ability: slot === 'charge' ? 'Charge' : slot === 'item' ? u.itemAbility!.name : bySlot(u, slot).name,
      energyCost: energyCost(slot),
      available: canUse(u, slot),
      cooldown: slot === 'skill' ? Math.ceil(u.skillCd * 10) / 10 : slot === 'item' ? Math.ceil(u.itemCd * 10) / 10 : 0,
    }));
  }

  function automaticAbility(u: Unit): BattleAbilitySlot {
    if (canUse(u, 'ult')) return 'ult';
    if (canUse(u, 'item')) return 'item';
    if (canUse(u, 'skill')) return 'skill';
    if (u.energy < B.skillEnergyCost && u.hp / u.maxHp > 0.35) return 'charge';
    return 'basic';
  }

  function act(u: Unit): boolean {
    let slot: BattleAbilitySlot;
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
        slot = automaticAbility(u);
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
    applyEffects(u, ability.effects);
    for (let bonus = 0; bonus < u.extraActions && aliveOf(foesOf(u)).length > 0; bonus++) {
      if (u.itemName && u.itemEffect) {
        emit({ t, kind: 'itemProc', uid: u.uid, itemName: u.itemName, effect: u.itemEffect });
      }
      applyEffects(u, ability.effects);
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
  const snapshot = () => emit({ t, kind: 'tick', units: all.map((u) => ({ uid: u.uid, hp: u.hp, energy: Math.round(u.energy) })) });
  snapshot();

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
        let dot = 0;
        let regen = u.maxHp * u.regenPerSec;
        for (const s of u.statuses) {
          dot += s.dps;
          regen += s.hps;
        }
        if (dot > 0) {
          const sourceUid = u.side === 'player' ? 'e?' : 'p?';
          // DoT damage is attributed to nobody for stats; emit with synthetic source
          let amount = Math.max(1, Math.round(dot));
          u.hp = Math.max(0, u.hp - amount);
          emit({ t, kind: 'damage', source: sourceUid, target: u.uid, amount, crit: false, weakness: false, hpAfter: u.hp, shielded: false });
          if (u.hp <= 0) {
            u.alive = false;
            emit({ t, kind: 'death', uid: u.uid });
            continue;
          }
          checkTransform(u);
        }
        if (regen > 0 && u.hp < u.maxHp) {
          const amount = Math.min(Math.round(regen), u.maxHp - u.hp);
          if (amount > 0) {
            u.hp += amount;
            emit({ t, kind: 'heal', source: u.uid, target: u.uid, amount, hpAfter: u.hp });
          }
        }
      }
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
    alive: u.alive,
    hpPct: u.alive ? u.hp / u.maxHp : 0,
  }));

  return { winner, duration: t, events, units, ...(pendingChoice ? { pendingChoice } : {}) };
}
