/** Tower floor generation: enemy team composition and scaling per floor. */

import type { Rng } from '../core/Rng';
import { Balance } from '../data/balance';
import { CHARACTERS } from '../data/characters';
import { characterPowerScore } from '../data/characterRules';
import { getFranchise } from '../data/franchises';
import type { CharacterDef } from '../data/types';
import type { CombatantSpec } from './battle';

export interface FloorInfo {
  floor: number;
  isBoss: boolean;
  title: string;
  enemies: CombatantSpec[];
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

/** Assign slots so beefy units land in the front row (0..2), squishy in back. */
function assignSlots(defs: CharacterDef[]): { def: CharacterDef; slot: number }[] {
  const byBulk = [...defs].sort((a, b) => b.stats.hp * (100 + b.stats.def) - a.stats.hp * (100 + a.stats.def));
  const order = [0, 1, 2, 3, 4]; // bulkiest three take the front
  return byBulk.map((def, i) => ({ def, slot: order[i] ?? i }));
}

export function generateFloor(floor: number, rng: Rng): FloorInfo {
  const boss = isBossFloor(floor);
  const budget = Balance.tower.budgetBase + Balance.tower.budgetPerFloor * (floor - 1);
  const scale = floorScale(floor);

  const picked: CharacterDef[] = [];
  let spent = 0;

  let bossDef: CharacterDef | null = null;
  if (boss) {
    bossDef = rng.pick(CHARACTERS.filter((c) => c.rarity === 'legendary' || c.rarity === 'supreme' || c.rarity === 'godlike'));
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

  const level = 1 + Math.floor((floor - 1) / 3);
  const enemies: CombatantSpec[] = assignSlots(picked).map(({ def, slot }) => ({
    defId: def.id,
    level: Math.min(level, Balance.level.max),
    slot,
    hpPct: 1,
    statScale: scale,
    boss: boss && def.id === bossDef?.id,
  }));

  const title = boss
    ? `${bossDef?.name.toUpperCase()} — TOWER GUARDIAN`
    : (FLOOR_TITLES[(floor - 1) % FLOOR_TITLES.length] as string);

  return { floor, isBoss: boss, title, enemies };
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

  const level = 1 + Math.floor((nodeIndex - 1) / 3);
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
  return { floor: nodeIndex, isBoss: isFinal, title, enemies };
}
