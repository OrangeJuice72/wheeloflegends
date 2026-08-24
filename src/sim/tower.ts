/** Tower floor generation: enemy team composition and scaling per floor. */

import { Rng } from '../core/Rng';
import { Balance } from '../data/balance';
import { CHARACTERS } from '../data/characters';
import { characterPowerScore } from '../data/characterRules';
import { AFFIXES } from '../data/affixes';
import { BOSS_MECHANICS } from '../data/bosses';
import { getFranchise } from '../data/franchises';
import type { CharacterDef } from '../data/types';
import type { CombatantSpec } from './battle';

/**
 * What kind of room a floor is. `battle`/`elite` are fought; the rest resolve
 * as events so a climb isn't an unbroken chain of identical fights.
 */
export type FloorKind = 'battle' | 'elite' | 'treasure' | 'rest' | 'merchant';

export interface FloorInfo {
  floor: number;
  isBoss: boolean;
  kind: FloorKind;
  title: string;
  enemies: CombatantSpec[];
}

/** True when the room is resolved by fighting rather than by an event screen. */
export function isCombatFloor(kind: FloorKind): boolean {
  return kind === 'battle' || kind === 'elite';
}

const KIND_WEIGHTS: [FloorKind, number][] = [
  ['battle', 54],
  ['elite', 16],
  ['treasure', 12],
  ['rest', 10],
  ['merchant', 8],
];

/** Deterministic route offers for a floor the player is about to enter. */
export function routeChoices(floor: number, seed: number, previousKind: FloorKind): FloorKind[] {
  if (floor <= 1 || isBossFloor(floor)) return ['battle'];
  const rng = new Rng((seed ^ (floor * 0x27d4eb2d) ^ 0xa5a5a5a5) >>> 0);
  const choices: FloorKind[] = ['battle'];
  const candidates = KIND_WEIGHTS
    .filter(([kind]) => kind !== 'battle' && (isCombatFloor(previousKind) || isCombatFloor(kind)))
    .map(([kind, weight]) => ({ kind, weight }));
  while (choices.length < 3 && candidates.length > 0) {
    const picked = rng.weighted(candidates, (candidate) => candidate.weight);
    choices.push(picked.kind);
    candidates.splice(candidates.indexOf(picked), 1);
  }
  return choices;
}

/**
 * A floor's room type — a pure function of (floor, seed) so re-entering a floor
 * is always stable. Floor 1 and boss floors are always fights, and two event
 * rooms never appear back to back (which also guarantees event chains end).
 */
function rollKind(floor: number, seed: number): FloorKind {
  if (floor <= 1 || isBossFloor(floor)) return 'battle';
  const roll = new Rng((seed ^ (floor * 0x85ebca6b)) >>> 0).next();
  const total = KIND_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  let cursor = roll * total;
  for (const [candidate, weight] of KIND_WEIGHTS) {
    cursor -= weight;
    if (cursor <= 0) return candidate;
  }
  return 'battle';
}

export function floorKind(floor: number, seed: number): FloorKind {
  const kind = rollKind(floor, seed);
  // Never two event rooms back to back — compares against the neighbour's raw
  // roll so this stays O(1) rather than walking the whole tower.
  if (!isCombatFloor(kind) && !isCombatFloor(rollKind(floor - 1, seed))) return 'battle';
  return kind;
}

const FLOOR_TITLES = [
  'The Ashen Gate',
  'Hall of Echoes',
  'The Shattered Court',
  'Gallery of Chains',
  'The Ember Steps',
  'Vault of Whispers',
  'The Frozen Landing',
  'Sanctum of Sparks',
  'The Obsidian Walk',
  'Throne of Storms',
];

export function isBossFloor(floor: number): boolean {
  return floor % Balance.tower.bossEvery === 0;
}

export function floorScale(floor: number): number {
  return 1 + Balance.tower.scalePerFloor * (floor - 1);
}

/** Assign slots so the two bulkiest units hold the front and three allies form the back line. */
function assignSlots(defs: CharacterDef[]): { def: CharacterDef; slot: number }[] {
  const byBulk = [...defs].sort((a, b) => b.stats.hp * (100 + b.stats.def) - a.stats.hp * (100 + a.stats.def));
  const order = [0, 1, 2, 3, 4]; // bulkiest two take the front
  return byBulk.map((def, i) => ({ def, slot: order[i] ?? i }));
}

export function generateFloor(floor: number, rng: Rng, kind: FloorKind = 'battle'): FloorInfo {
  const boss = isBossFloor(floor);
  const elite = kind === 'elite';
  // Elites field a slightly richer squad and hit harder than a normal room.
  const budget = Balance.tower.budgetBase + Balance.tower.budgetPerFloor * (floor - 1) + (elite ? 3 : 0);
  const scale = floorScale(floor) * (elite ? 1.12 : 1);

  const picked: CharacterDef[] = [];
  let spent = 0;

  let bossDef: CharacterDef | null = null;
  if (boss) {
    const guardianIndex = Math.max(0, Math.floor(floor / Balance.tower.bossEvery) - 1) % BOSS_MECHANICS.length;
    const guardianId = BOSS_MECHANICS[guardianIndex]?.characterId;
    bossDef = CHARACTERS.find((character) => character.id === guardianId)
      ?? rng.pick(CHARACTERS.filter((c) => c.rarity === 'legendary' || c.rarity === 'supreme' || c.rarity === 'godlike'));
    picked.push(bossDef);
    spent += Balance.rarity.cost[bossDef.rarity];
  }

  while (picked.length < Balance.team.maxSize) {
    const affordable = CHARACTERS.filter((c) => !picked.includes(c) && Balance.rarity.cost[c.rarity] <= budget - spent);
    if (affordable.length === 0) break;
    const choice = rng.weighted(affordable, (c) => Balance.rarity.weights[c.rarity]);
    picked.push(choice);
    spent += Balance.rarity.cost[choice.rarity];
  }
  // A floor always fields at least two enemies.
  while (picked.length < 2) {
    const commons = CHARACTERS.filter((c) => c.rarity === 'common' && !picked.includes(c));
    if (commons.length === 0) break;
    picked.push(rng.pick(commons));
  }

  const level = 1 + Math.floor((floor - 1) / 4);
  // An elite room is led by one modified enemy — the affix, not the numbers,
  // is what makes the fight memorable.
  const eliteAffix = elite ? rng.pick(AFFIXES).id : undefined;
  const seats = assignSlots(picked);
  const championId = elite ? seats[0]?.def.id : undefined;
  const enemies: CombatantSpec[] = seats.map(({ def, slot }) => ({
    defId: def.id,
    level: Math.min(level, Balance.level.max),
    slot,
    hpPct: 1,
    statScale: scale,
    ...(eliteAffix && def.id === championId ? { affix: eliteAffix } : {}),
    boss: boss && def.id === bossDef?.id,
  }));

  const title = boss
    ? `${bossDef?.name.toUpperCase()} — TOWER GUARDIAN`
    : elite
      ? `ELITE — ${FLOOR_TITLES[(floor - 1) % FLOOR_TITLES.length]}`
      : (FLOOR_TITLES[(floor - 1) % FLOOR_TITLES.length] as string);

  return { floor, isBoss: boss, kind, title, enemies };
}

/**
 * A conquest node: an enemy squad drawn entirely from one universe, built within
 * the same cost budget and scaling as a tower floor of the same depth so each
 * node is a fair themed fight rather than a wall of the universe's best. Only the
 * final node of the ladder is a boss floor, led by that universe's champion.
 */
export function generateConquestNode(nodeIndex: number, universe: string, totalNodes: number, rng: Rng): FloorInfo {
  const roster = CHARACTERS.filter((c) => c.franchise === universe);
  const scale = floorScale(nodeIndex);
  const isFinal = nodeIndex >= totalNodes;
  const budget = Balance.tower.budgetBase + Balance.tower.budgetPerFloor * (nodeIndex - 1);

  const champion = [...roster].sort((a, b) => characterPowerScore(b) - characterPowerScore(a))[0]!;
  const picked: CharacterDef[] = [];
  let spent = 0;
  // The universe's champion headlines only the climactic final node, as a boss.
  if (isFinal) {
    picked.push(champion);
    spent += Balance.rarity.cost[champion.rarity];
  }

  while (picked.length < Balance.team.maxSize) {
    const affordable = roster.filter((c) => !picked.includes(c) && Balance.rarity.cost[c.rarity] <= budget - spent);
    if (affordable.length === 0) break;
    const choice = rng.weighted(affordable, (c) => Balance.rarity.weights[c.rarity]);
    picked.push(choice);
    spent += Balance.rarity.cost[choice.rarity];
  }
  // Field at least two defenders even when the budget only bought one.
  while (picked.length < 2 && picked.length < roster.length) {
    const cheapest = roster
      .filter((c) => !picked.includes(c))
      .sort((a, b) => Balance.rarity.cost[a.rarity] - Balance.rarity.cost[b.rarity])[0];
    if (!cheapest) break;
    picked.push(cheapest);
  }

  const level = 1 + Math.floor((nodeIndex - 1) / 4);
  const enemies: CombatantSpec[] = assignSlots(picked).map(({ def, slot }) => ({
    defId: def.id,
    level: Math.min(level, Balance.level.max),
    slot,
    hpPct: 1,
    statScale: scale,
    boss: isFinal && def.id === champion.id,
  }));

  const universeName = getFranchise(universe).name.toUpperCase();
  const title = isFinal ? `${universeName} — FINAL STAND` : `${universeName} STRONGHOLD`;
  // Conquest is a fixed ladder of themed fights — no event rooms.
  return { floor: nodeIndex, isBoss: isFinal, kind: 'battle', title, enemies };
}
