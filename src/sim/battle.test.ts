import { describe, expect, it } from 'vitest';
import { simulateBattle, type CombatantSpec } from './battle';
import { Balance } from '../data/balance';
import { CHARACTERS } from '../data/characters';
import { characterPowerScore, exploitsWeakness } from '../data/characterRules';

function spec(defId: string, slot: number, overrides: Partial<CombatantSpec> = {}): CombatantSpec {
  return { defId, level: 1, slot, hpPct: 1, statScale: 1, ...overrides };
}

const TEAM_A = [spec('shrek', 0), spec('captain-america', 1), spec('mario', 2), spec('pikachu', 3), spec('zelda', 4)];
const TEAM_B = [spec('bowser', 0), spec('patrick', 1), spec('link', 2), spec('sonic', 3), spec('spongebob', 4)];

describe('battle determinism', () => {
  it('same seed produces byte-identical event streams', () => {
    const a = simulateBattle(TEAM_A, TEAM_B, 12345);
    const b = simulateBattle(TEAM_A, TEAM_B, 12345);
    expect(JSON.stringify(a.events)).toEqual(JSON.stringify(b.events));
    expect(a.winner).toEqual(b.winner);
  });

  it('different seeds diverge', () => {
    const a = simulateBattle(TEAM_A, TEAM_B, 1);
    const b = simulateBattle(TEAM_A, TEAM_B, 2);
    expect(JSON.stringify(a.events)).not.toEqual(JSON.stringify(b.events));
  });
});

describe('battle structure', () => {
  it('always terminates within the time limit and emits a single end event', () => {
    for (let seed = 0; seed < 25; seed++) {
      const r = simulateBattle(TEAM_A, TEAM_B, seed);
      expect(r.duration).toBeLessThanOrEqual(Balance.battle.timeLimit + 1);
      const ends = r.events.filter((e) => e.kind === 'end');
      expect(ends).toHaveLength(1);
      expect(['player', 'enemy']).toContain(r.winner);
    }
  });

  it('evenly-matched battles land in the 15–120s pacing window', () => {
    let total = 0;
    const seeds = 20;
    for (let seed = 100; seed < 100 + seeds; seed++) {
      total += simulateBattle(TEAM_A, TEAM_B, seed).duration;
    }
    const avg = total / seeds;
    expect(avg).toBeGreaterThan(15);
    expect(avg).toBeLessThan(120);
  });

  it('a hopeless matchup is actually hopeless (identity is preserved)', () => {
    // SpongeBob + Patrick vs the full Justice League — heroes win every time.
    const minnows = [spec('spongebob', 0), spec('patrick', 1)];
    const league = [spec('superman', 0), spec('wonder-woman', 1), spec('batman', 3)];
    let leagueWins = 0;
    for (let seed = 0; seed < 10; seed++) {
      if (simulateBattle(league, minnows, seed).winner === 'player') leagueWins++;
    }
    expect(leagueWins).toBe(10);
  });

  it('every damage event keeps hp non-negative and deaths are terminal', () => {
    const r = simulateBattle(TEAM_A, TEAM_B, 777);
    const dead = new Set<string>();
    for (const e of r.events) {
      if (e.kind === 'damage') {
        expect(e.hpAfter).toBeGreaterThanOrEqual(0);
        expect(dead.has(e.target)).toBe(false);
      }
      if (e.kind === 'death') {
        expect(dead.has(e.uid)).toBe(false);
        dead.add(e.uid);
      }
    }
  });

  it('boss scaling makes the same character measurably stronger', () => {
    const normal = simulateBattle([spec('godzilla', 0)], [spec('godzilla', 0)], 42);
    const bossed = simulateBattle([spec('godzilla', 0)], [spec('godzilla', 0, { boss: true })], 42);
    // Against a boss-scaled mirror, the plain copy must lose.
    expect(normal.duration).toBeGreaterThan(0);
    expect(bossed.winner).toBe('enemy');
  });

  it('goku transforms when dropped below half health', () => {
    const r = simulateBattle([spec('goku', 0)], [spec('superman', 0)], 5);
    const transforms = r.events.filter((e) => e.kind === 'transform');
    expect(transforms.length).toBeGreaterThanOrEqual(1);
  });
});

describe('manual battle decisions', () => {
  it('stops at a player turn and reports affordable moves', () => {
    const result = simulateBattle([spec('pikachu', 0)], [spec('bowser', 0)], 91, { manual: true });
    const choice = result.pendingChoice;
    expect(choice).toBeDefined();
    expect(result.events.at(-1)?.kind).toBe('choice');
    expect(result.events.some((event) => event.kind === 'end')).toBe(false);
    expect(choice?.options.find((option) => option.slot === 'basic')?.available).toBe(true);
    expect(choice?.options.find((option) => option.slot === 'charge')?.available).toBe(true);
    expect(choice?.options.find((option) => option.slot === 'ult')?.available).toBe(choice!.energy >= Balance.battle.energyMax);
  });

  it('deterministically resumes with the selected ability', () => {
    const first = simulateBattle([spec('pikachu', 0)], [spec('bowser', 0)], 92, { manual: true });
    const uid = first.pendingChoice!.uid;
    const choices = [{ uid, slot: 'basic' as const }];
    const resumed = simulateBattle([spec('pikachu', 0)], [spec('bowser', 0)], 92, { manual: true, choices });
    const repeated = simulateBattle([spec('pikachu', 0)], [spec('bowser', 0)], 92, { manual: true, choices });
    const firstPlayerAct = resumed.events.find((event) => event.kind === 'act' && event.uid === uid);
    expect(firstPlayerAct?.kind === 'act' && firstPlayerAct.slot).toBe('basic');
    expect(JSON.stringify(resumed.events)).toBe(JSON.stringify(repeated.events));
  });

  it('rejects a move that the character cannot afford', () => {
    const first = simulateBattle([spec('pikachu', 0)], [spec('bowser', 0)], 93, { manual: true });
    const choice = first.pendingChoice!;
    const unavailable = choice.options.find((option) => !option.available);
    expect(unavailable).toBeDefined();
    expect(() => simulateBattle([spec('pikachu', 0)], [spec('bowser', 0)], 93, {
      manual: true,
      choices: [{ uid: choice.uid, slot: unavailable!.slot }],
    })).toThrow(/cannot use/);
  });
});
describe('weaknesses, charge, and equipment effects', () => {
  it('charge skips the attack and adds a large energy burst', () => {
    const first = simulateBattle([spec('pikachu', 0)], [spec('bowser', 0)], 194, { manual: true });
    const choice = first.pendingChoice!;
    const resumed = simulateBattle([spec('pikachu', 0)], [spec('bowser', 0)], 194, {
      manual: true,
      choices: [{ uid: choice.uid, slot: 'charge' }],
    });
    const charge = resumed.events.find((event) => event.kind === 'act' && event.uid === choice.uid && event.slot === 'charge');
    expect(charge).toBeDefined();
    expect(resumed.events.some((event) =>
      event.kind === 'tick'
      && event.t >= charge!.t
      && event.units.some((unit) => unit.uid === choice.uid && unit.energy >= Math.min(Balance.battle.energyMax, choice.energy + Balance.battle.energyPerCharge)),
    )).toBe(true);
  });

  it('applies the weakness damage multiplier when an attacker has the right threat type', () => {
    const strongest = [...CHARACTERS].sort((a, b) => characterPowerScore(b) - characterPowerScore(a));
    const attacker = strongest.find((candidate) => CHARACTERS.some((target) => target !== candidate && exploitsWeakness(candidate, target)))!;
    const defender = [...strongest].reverse().find((candidate) => candidate !== attacker && exploitsWeakness(attacker, candidate))!;
    const result = simulateBattle([spec(attacker.id, 0)], [spec(defender.id, 0)], 195);
    expect(result.events.some((event) => event.kind === 'damage' && event.source === 'p0' && event.weakness)).toBe(true);
  });

  it('makes the Chaos Emerald grant Sonic extra actions but not an ordinary holder', () => {
    const sonic = simulateBattle([spec('sonic', 0, { itemId: 'chaos-emerald' })], [spec('bowser', 0)], 196);
    expect(sonic.events.some((event) => event.kind === 'item' && event.uid === 'p0')).toBe(true);
    expect(sonic.events.some((event) => event.kind === 'itemProc' && event.uid === 'p0')).toBe(true);

    const mario = simulateBattle([spec('mario', 0, { itemId: 'chaos-emerald' })], [spec('bowser', 0)], 196);
    expect(mario.events.some((event) => event.kind === 'itemProc' && event.uid === 'p0')).toBe(false);
  });

  it('grants a resonant holder the artifact skill as the ITEM action', () => {
    // Mario + Fire Flower: the ITEM option appears, is usable, and casts Fireball Barrage
    const manual = simulateBattle([spec('mario', 0, { itemId: 'firepower' })], [spec('bowser', 0)], 197, { manual: true });
    const choice = manual.events.find((event) => event.kind === 'choice');
    expect(choice).toBeDefined();
    const itemOption = choice!.options.find((option) => option.slot === 'item');
    expect(itemOption?.ability).toBe('Fireball Barrage');
    expect(itemOption?.available).toBe(true);

    const resolved = simulateBattle([spec('mario', 0, { itemId: 'firepower' })], [spec('bowser', 0)], 197, {
      manual: true,
      choices: [{ uid: 'p0', slot: 'item' }],
    });
    expect(resolved.events.some((event) => event.kind === 'act' && event.slot === 'item' && event.ability === 'Fireball Barrage')).toBe(true);

    // A non-resonant holder (Sonic isn't from the Mushroom Kingdom) never sees the option
    const outsider = simulateBattle([spec('sonic', 0, { itemId: 'firepower' })], [spec('bowser', 0)], 197, { manual: true });
    const outsiderChoice = outsider.events.find((event) => event.kind === 'choice');
    expect(outsiderChoice!.options.some((option) => option.slot === 'item')).toBe(false);
  });
});