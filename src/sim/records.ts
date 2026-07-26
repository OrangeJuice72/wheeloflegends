/** Fold a finished battle's player stats into the all-time personal records. */

import type { RunRecords } from '../core/Save';
import type { UnitResultStats } from './events';

export type RecordKey = keyof RunRecords;

/**
 * Update `records` in place from a battle's player-side unit stats. `nameOf`
 * resolves a defId to a display name. Returns the keys that were beaten so the
 * UI can celebrate a new record.
 */
export function applyBattleRecords(
  records: RunRecords,
  playerUnits: readonly UnitResultStats[],
  nameOf: (defId: string) => string,
): RecordKey[] {
  const beaten: RecordKey[] = [];
  const bump = (key: RecordKey, value: number, detail: string): void => {
    if (value > records[key].value) {
      records[key] = { value, detail };
      beaten.push(key);
    }
  };

  let teamTotal = 0;
  for (const unit of playerUnits) {
    teamTotal += unit.damageDealt;
    bump('legendDamage', unit.damageDealt, nameOf(unit.defId));
    bump('legendHeals', unit.healingDone, nameOf(unit.defId));
    bump('legendDodges', unit.dodges, nameOf(unit.defId));
  }
  if (playerUnits.length > 0) {
    bump('teamDamage', teamTotal, playerUnits.map((u) => nameOf(u.defId)).join(' · '));
  }
  return beaten;
}
