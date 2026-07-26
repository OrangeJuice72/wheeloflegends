import { describe, expect, it } from 'vitest';
import { applyBattleRecords } from './records';
import { emptyRecords } from '../core/Save';
import type { UnitResultStats } from './events';

const unit = (defId: string, over: Partial<UnitResultStats> = {}): UnitResultStats => ({
  uid: 'p0', defId, side: 'player', damageDealt: 0, healingDone: 0, kills: 0, dodges: 0, alive: true, hpPct: 1, ...over,
});

const nameOf = (id: string) => id.toUpperCase();

describe('personal records', () => {
  it('captures single-legend and team bests with who set them', () => {
    const records = emptyRecords();
    const beaten = applyBattleRecords(records, [
      unit('goku', { damageDealt: 50000, healingDone: 0, dodges: 1 }),
      unit('elsa', { damageDealt: 20000, healingDone: 8000, dodges: 4 }),
    ], nameOf);

    expect(records.legendDamage).toEqual({ value: 50000, detail: 'GOKU' });
    expect(records.teamDamage).toEqual({ value: 70000, detail: 'GOKU · ELSA' });
    expect(records.legendHeals).toEqual({ value: 8000, detail: 'ELSA' });
    expect(records.legendDodges).toEqual({ value: 4, detail: 'ELSA' });
    expect(beaten).toContain('legendDamage');
  });

  it('only overwrites when a battle beats the standing record', () => {
    const records = emptyRecords();
    applyBattleRecords(records, [unit('goku', { damageDealt: 80000 })], nameOf);
    const beaten = applyBattleRecords(records, [unit('pikachu', { damageDealt: 40000 })], nameOf);

    expect(records.legendDamage).toEqual({ value: 80000, detail: 'GOKU' }); // unchanged
    expect(beaten).not.toContain('legendDamage');
  });

  it('ignores an empty player side', () => {
    const records = emptyRecords();
    expect(applyBattleRecords(records, [], nameOf)).toEqual([]);
    expect(records.teamDamage.value).toBe(0);
  });
});
