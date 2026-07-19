/** Tower floor generation: enemy team composition and scaling per floor. */

import type { Rng } from '../core/Rng';
import { Balance } from '../data/balance';
import { CHARACTERS } from '../data/characters';
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
