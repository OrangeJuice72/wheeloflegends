import { describe, expect, it } from 'vitest';
import { RunState, populatedFranchises, summonRarityOdds } from './run';
import { simulateBattle, type CombatantSpec } from './battle';
import type { BattleResult } from './events';
import type { ModifierId } from '../data/modifiers';
import { Balance } from '../data/balance';
import { getShopItem, itemPowerScore, ITEM_SPIN_PRICES, ITEM_SPIN_WEIGHTS, ITEM_TIER_ORDER, matchesItemAffinity, MYSTERY_ITEM_WEIGHTS, SHOP_ITEMS } from '../data/items';
import { CHARACTERS, getCharacter } from '../data/characters';
import { generateFloor, floorScale, isBossFloor } from './tower';
import { Rng } from '../core/Rng';
import { computeSynergies, combineBonuses } from './synergy';
import type { Rarity } from '../data/types';
import { characterPowerScore, CURATED_RARITY, strengthTypes } from '../data/characterRules';
import { BATTLEFIELDS } from '../data/battlefields';

describe('recruit odds', () => {
  it('20k spins match the published summon odds within tolerance', () => {
    const run = new RunState(9001);
    run.spins = 20000;
    const counts: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0, supreme: 0, godlike: 0 };
    for (let i = 0; i < 20000; i++) counts[run.spin().rarity]++;
    const odds = summonRarityOdds();
    for (const rarity of Object.keys(counts) as Rarity[]) {
      const expected = odds[rarity];
      const actual = counts[rarity] / 20000;
      // 3.5-sigma binomial tolerance
      const sigma = Math.sqrt((expected * (1 - expected)) / 20000);
      expect(Math.abs(actual - expected), rarity).toBeLessThan(3.5 * sigma + 0.005);
    }
  });

  it('every populated universe is equally likely to appear', () => {
    const run = new RunState(4242);
    run.spins = 60000;
    const franchises = populatedFranchises();
    const counts = new Map(franchises.map((f) => [f, 0]));
    for (let i = 0; i < 60000; i++) {
      const f = run.spin().franchise;
      counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    const expected = 1 / franchises.length;
    const sigma = Math.sqrt((expected * (1 - expected)) / 60000);
    for (const f of franchises) {
      const actual = (counts.get(f) ?? 0) / 60000;
      expect(Math.abs(actual - expected), f).toBeLessThan(4 * sigma + 0.004);
    }
  });

  it('spins consume free spins first, then gold at rising prices', () => {
    const run = new RunState(1);
    const startingGold = run.gold;
    run.spins = 1;
    run.spin();
    expect(run.gold).toBe(startingGold);
    run.gold = 1000;
    const cost1 = run.spinCost;
    run.spin();
    expect(run.gold).toBe(1000 - cost1);
    expect(run.spinCost).toBeGreaterThan(cost1);
  });
});

describe('run modifiers', () => {
  const spawnMaxHp = (result: BattleResult): number => {
    const spawn = result.events.find((e) => e.kind === 'spawn' && e.side === 'player');
    return spawn && 'maxHp' in spawn ? spawn.maxHp : 0;
  };

  it('Mono-Universe locks every summon to one universe', () => {
    const run = new RunState(555, 'normal', ['mono-universe']);
    expect(run.monoFranchise).toBeTruthy();
    run.spins = 500;
    for (let i = 0; i < 500; i++) expect(run.spin().franchise).toBe(run.monoFranchise);
    const odds = run.summonOdds();
    expect(Object.values(odds).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it('Mono-Universe honors a chosen universe, and falls back to random otherwise', () => {
    const chosen = new RunState(1, 'normal', ['mono-universe'], { monoFranchise: 'pokemon' });
    expect(chosen.monoFranchise).toBe('pokemon');
    chosen.spins = 100;
    for (let i = 0; i < 100; i++) expect(chosen.spin().franchise).toBe('pokemon');

    // An unknown id or null → a valid random universe (never the bad id).
    const bogus = new RunState(1, 'normal', ['mono-universe'], { monoFranchise: 'not-a-universe' });
    expect(populatedFranchises()).toContain(bogus.monoFranchise);
    const random = new RunState(1, 'normal', ['mono-universe'], { monoFranchise: null });
    expect(populatedFranchises()).toContain(random.monoFranchise);

    // The choice is ignored unless the modifier is active.
    const off = new RunState(1, 'normal', [], { monoFranchise: 'pokemon' });
    expect(off.monoFranchise).toBeNull();
  });

  it('Underdog restricts summons to Common and Rare', () => {
    const run = new RunState(777, 'normal', ['underdog']);
    run.spins = 800;
    for (let i = 0; i < 800; i++) expect(['common', 'rare']).toContain(run.spin().rarity);
    const odds = run.summonOdds();
    expect(odds.epic + odds.legendary + odds.supreme + odds.godlike).toBe(0);
    expect(odds.common + odds.rare).toBeCloseTo(1, 5);
  });

  it('Glass Cannon lowers max HP and raises attack for the player team', () => {
    const run = new RunState(3, 'normal', ['glass-cannon']);
    run.addRecruit(getCharacter('superman'));
    expect(run.playerSpecs()[0]!.extraBoosts).toEqual({ atk: 0.4, hp: -0.35 });

    const foe: CombatantSpec = { defId: 'bowser', level: 1, slot: 0, hpPct: 1, statScale: 1 };
    const glass: CombatantSpec = { defId: 'superman', level: 1, slot: 0, hpPct: 1, statScale: 1, extraBoosts: { atk: 0.4, hp: -0.35 } };
    const plain: CombatantSpec = { defId: 'superman', level: 1, slot: 0, hpPct: 1, statScale: 1 };
    expect(spawnMaxHp(simulateBattle([glass], [foe], 1))).toBeLessThan(spawnMaxHp(simulateBattle([plain], [foe], 1)));
  });

  it('Sudden Death removes recovery rewards and revives the fallen at 10%', () => {
    const sudden = new RunState(9, 'normal', ['sudden-death']);
    for (let i = 0; i < 40; i++) {
      for (const choice of sudden.generateRewards()) expect(choice.category, choice.id).not.toBe('recovery');
    }
    const normal = new RunState(9, 'normal');
    const normalCategories = new Set<string>();
    for (let i = 0; i < 40; i++) for (const c of normal.generateRewards()) normalCategories.add(c.category);
    expect(normalCategories.has('recovery')).toBe(true);

    for (const [mods, expected] of [[['sudden-death'] as ModifierId[], 0.1], [[] as ModifierId[], 0.2]] as const) {
      const run = new RunState(1, 'normal', mods);
      run.addRecruit(getCharacter('superman'));
      const result: BattleResult = {
        winner: 'enemy', duration: 1, events: [],
        units: [{ uid: 'p0', defId: 'superman', side: 'player', damageDealt: 0, healingDone: 0, kills: 0, dodges: 0, alive: false, hpPct: 0 }],
      };
      run.applyBattleResult(result);
      expect(run.roster[0]!.hpPct).toBeCloseTo(expected, 5);
    }
  });

  it('a standard run has no modifiers and the full recruit pool', () => {
    const run = new RunState(1);
    expect(run.modifiers.size).toBe(0);
    expect(run.monoFranchise).toBeNull();
    expect(run.eligibleRecruitPool().length).toBe(CHARACTERS.length);
    expect(run.mode).toBe('tower');
    expect(run.draft).toBe(false);
  });
});

describe('draft recruiting', () => {
  it('offers the requested number of distinct candidates', () => {
    const run = new RunState(31, 'normal', [], { draft: true });
    for (let i = 0; i < 50; i++) {
      const offers = run.rollDraftOptions(3);
      expect(offers).toHaveLength(3);
      expect(new Set(offers.map((c) => c.id)).size).toBe(3);
    }
  });

  it('honors modifier constraints in the offers', () => {
    const run = new RunState(32, 'normal', ['underdog'], { draft: true });
    for (let i = 0; i < 50; i++) {
      for (const offer of run.rollDraftOptions(3)) expect(['common', 'rare']).toContain(offer.rarity);
    }
  });

  it('payment consumes a free spin, then gold', () => {
    const run = new RunState(33, 'normal', [], { draft: true });
    run.spins = 1;
    run.payForRecruit();
    expect(run.spins).toBe(0);
    run.gold = 1000;
    const cost = run.spinCost;
    run.payForRecruit();
    expect(run.gold).toBe(1000 - cost);
  });
});

describe('universe conquest', () => {
  it('builds a shuffled ladder of every populated universe', () => {
    const run = new RunState(41, 'normal', [], { mode: 'conquest' });
    expect(run.isConquest()).toBe(true);
    expect([...run.conquestOrder].sort()).toEqual([...populatedFranchises()].sort());
    expect(run.conquestTarget()).toBe(run.conquestOrder[0]);
  });

  it('fields an enemy squad drawn entirely from the target universe', () => {
    const run = new RunState(42, 'normal', [], { mode: 'conquest' });
    const byId = new Map(CHARACTERS.map((c) => [c.id, c]));
    for (let node = 1; node <= run.conquestOrder.length; node++) {
      run.floor = node;
      const info = run.currentFloor();
      const universe = run.conquestOrder[node - 1];
      expect(info.enemies.length).toBeGreaterThanOrEqual(2);
      for (const e of info.enemies) expect(byId.get(e.defId)!.franchise, `node ${node}`).toBe(universe);
    }
  });

  it('keeps early nodes within the tower cost budget (not a wall of the best)', () => {
    const run = new RunState(44, 'normal', [], { mode: 'conquest' });
    run.floor = 1; // shallow node: budget only affords a small squad
    const info = run.currentFloor();
    const cost = info.enemies.reduce((sum, e) => sum + Balance.rarity.cost[getCharacter(e.defId).rarity], 0);
    // budget at node 1 is budgetBase; allow the min-two-defenders padding to exceed slightly
    expect(info.enemies.some((e) => e.boss)).toBe(false); // no boss on a non-final node
    expect(cost).toBeLessThanOrEqual(Balance.tower.budgetBase + 12);
  });

  it('marks only the final node as a boss floor, led by the champion, and completes after it', () => {
    const run = new RunState(43, 'normal', [], { mode: 'conquest' });
    const last = run.conquestOrder.length;
    run.floor = last - 1;
    const penultimate = run.currentFloor();
    expect(penultimate.isBoss).toBe(false);
    expect(penultimate.enemies.some((e) => e.boss)).toBe(false);
    run.floor = last;
    const finalNode = run.currentFloor();
    expect(finalNode.isBoss).toBe(true);
    expect(finalNode.enemies.some((e) => e.boss)).toBe(true); // champion headlines the final stand
    expect(run.conquestComplete()).toBe(false);
    run.advanceFloor();
    expect(run.conquestComplete()).toBe(true);
  });
});

describe('roster & team', () => {
  it('duplicate recruits level up instead of stacking', () => {
    const run = new RunState(2);
    const mario = getCharacter('mario');
    expect(run.addRecruit(mario)).toBe('new');
    run.roster[0]!.hpPct = 0.2;
    expect(run.addRecruit(mario)).toBe('leveled');
    expect(run.roster).toHaveLength(1);
    expect(run.roster[0]?.level).toBe(2);
    expect(run.roster[0]?.hpPct).toBe(1);
  });

  it('team cost cap rejects an over-budget assignment', () => {
    const run = new RunState(3);
    const godlike = CHARACTERS.filter((character) => character.rarity === 'godlike');
    expect(godlike.length).toBeGreaterThanOrEqual(2);
    run.addRecruit(godlike[0]!);
    run.addRecruit(godlike[1]!);
    const benched = CHARACTERS.find((character) => !godlike.includes(character))!;
    run.addRecruit(benched);
    expect(run.teamCost()).toBe(Balance.rarity.cost.godlike * 2);
    expect(run.teamSize()).toBe(2);
    expect(run.assign(2, 4)).toBe(false);
  });
  it('swapping two fielded members keeps cost unchanged', () => {
    const run = new RunState(4);
    run.addRecruit(getCharacter('mario'));
    run.addRecruit(getCharacter('luigi'));
    const before = run.teamCost();
    expect(run.assign(0, 1)).toBe(true);
    expect(run.teamCost()).toBe(before);
  });
});

describe('tower generation', () => {
  it('scales monotonically and flags boss floors', () => {
    expect(floorScale(2)).toBeGreaterThan(floorScale(1));
    expect(isBossFloor(5)).toBe(true);
    expect(isBossFloor(6)).toBe(false);
    for (let floor = 1; floor <= 20; floor++) {
      const info = generateFloor(floor, new Rng(floor * 17));
      expect(info.enemies.length).toBeGreaterThanOrEqual(2);
      expect(info.enemies.length).toBeLessThanOrEqual(Balance.team.maxSize);
      if (info.isBoss) expect(info.enemies.some((e) => e.boss)).toBe(true);
    }
  });

  it('applies the selected run difficulty to enemy combat scaling', () => {
    const easy = new RunState(77, 'easy').currentFloor();
    const normal = new RunState(77, 'normal').currentFloor();
    const hard = new RunState(77, 'hard').currentFloor();
    expect(easy.enemies.map((enemy) => enemy.defId)).toEqual(normal.enemies.map((enemy) => enemy.defId));
    expect(easy.enemies[0]!.statScale).toBeLessThan(normal.enemies[0]!.statScale);
    expect(hard.enemies[0]!.statScale).toBeGreaterThan(normal.enemies[0]!.statScale);
  });
  it('is a pure function of its rng (stable floor re-entry)', () => {
    const a = generateFloor(7, new Rng(99));
    const b = generateFloor(7, new Rng(99));
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});

describe('synergies', () => {
  it('thresholds activate at the right counts', () => {
    const none = computeSynergies([getCharacter('batman')]);
    expect(none.find((s) => s.def.id === 'justice-league')).toBeUndefined();
    const pair = computeSynergies([getCharacter('batman'), getCharacter('superman')]);
    const jl = pair.find((s) => s.def.id === 'justice-league');
    expect(jl?.bonus.atk).toBeCloseTo(0.12);
    const trio = computeSynergies([getCharacter('batman'), getCharacter('superman'), getCharacter('wonder-woman')]);
    const jl3 = trio.find((s) => s.def.id === 'justice-league');
    expect(jl3?.bonus.atk).toBeCloseTo(0.2);
    expect(jl3?.bonus.hp).toBeCloseTo(0.1);
  });

  it('combineBonuses sums across active synergies', () => {
    const team = [getCharacter('batman'), getCharacter('superman'), getCharacter('goku'), getCharacter('pikachu')];
    const total = combineBonuses(computeSynergies(team));
    expect(total.atk).toBeGreaterThan(0); // Justice League pair
    expect(total.crit).toBeGreaterThan(0); // Anime pair (Goku + Pikachu)
  });
});

describe('data validation', () => {
  it('every character has exactly one basic, skill, and ult', () => {
    for (const c of CHARACTERS) {
      expect(c.abilities.filter((a) => a.slot === 'basic'), c.id).toHaveLength(1);
      expect(c.abilities.filter((a) => a.slot === 'skill'), c.id).toHaveLength(1);
      expect(c.abilities.filter((a) => a.slot === 'ult'), c.id).toHaveLength(1);
      const skill = c.abilities.find((a) => a.slot === 'skill');
      expect(skill?.cooldown, `${c.id} skill cooldown`).toBeGreaterThan(0);
    }
  });

  it('every character belongs to a registered franchise', async () => {
    const { FRANCHISES } = await import('../data/franchises');
    for (const c of CHARACTERS) {
      expect(FRANCHISES[c.franchise], `${c.id} franchise "${c.franchise}"`).toBeDefined();
    }
  });

  it('artifact items are well-formed: real franchises, covered tiers, valid granted skills', async () => {
    const { FRANCHISES } = await import('../data/franchises');
    const { SHOP_ITEMS, MYSTERY_ITEM_WEIGHTS } = await import('../data/items');
    for (const item of SHOP_ITEMS) {
      if (!item.affinity) continue;
      for (const franchise of item.affinity.franchises) {
        expect(FRANCHISES[franchise], `${item.id} affinity franchise "${franchise}"`).toBeDefined();
      }
      for (const characterId of item.affinity.characterIds ?? []) {
        expect(() => getCharacter(characterId), `${item.id} affinity character "${characterId}"`).not.toThrow();
      }
      if (item.affinity.ability) {
        expect(item.affinity.ability.effects.length, `${item.id} granted skill`).toBeGreaterThan(0);
        expect(item.affinity.ability.cooldown, `${item.id} granted skill cooldown`).toBeGreaterThan(0);
      }
    }
    // every mystery tier must be able to pay out equipment
    for (const tier of Object.keys(MYSTERY_ITEM_WEIGHTS)) {
      expect(
        SHOP_ITEMS.some((item) => item.kind === 'equipment' && item.tier === tier),
        `no equipment registered for tier ${tier}`,
      ).toBe(true);
    }
  });

  it('uses curated universe-relative rarities instead of global percentiles', () => {
    for (const character of CHARACTERS) {
      expect(character.weakness, character.id).toBeDefined();
      expect(CURATED_RARITY[character.id], `${character.id} missing curated rarity`).toBeDefined();
      expect(character.rarity, character.id).toBe(CURATED_RARITY[character.id]);
    }
    expect(getCharacter('captain-america').rarity).toBe('legendary');
    expect(getCharacter('leonardo').rarity).toBe('legendary');
    expect(getCharacter('pikachu').rarity).toBe('common');
    expect(getCharacter('nami').rarity).toBe('rare');
    expect(getCharacter('sandy-cheeks').rarity).toBe('common');
    const requestedCommons = [
      'simba', 'indiana-jones', 'zorro', 'toad', 'yoshi', 'black-panther',
      'r2-d2', 'chewbacca', 'danny-phantom', 'shrek',
    ];
    for (const characterId of requestedCommons) {
      expect(getCharacter(characterId).rarity, characterId).toBe('common');
    }
  });

  it('supports curated tiers with progressively stronger average battle kits', () => {
    const tiers: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'supreme', 'godlike'];
    const averages = tiers.map((rarity) => {
      const characters = CHARACTERS.filter((character) => character.rarity === rarity);
      return characters.reduce((sum, character) => sum + characterPowerScore(character), 0) / characters.length;
    });
    for (let index = 1; index < averages.length; index++) expect(averages[index]).toBeGreaterThan(averages[index - 1]!);
    expect(characterPowerScore(getCharacter('captain-america'))).toBeGreaterThan(characterPowerScore(getCharacter('sandy-cheeks')));
    expect(characterPowerScore(getCharacter('leonardo'))).toBeGreaterThan(characterPowerScore(getCharacter('pikachu')));
  });
  it('gives every character at least one battle strength and normalized stats', () => {
    for (const character of CHARACTERS) {
      expect(strengthTypes(character).length, character.id).toBeGreaterThan(0);
      expect(character.stats.hp, character.id).toBeGreaterThanOrEqual(85000);
      expect(character.stats.hp, character.id).toBeLessThanOrEqual(240000);
      expect(character.stats.atk, character.id).toBeGreaterThanOrEqual(7500);
      expect(character.stats.atk, character.id).toBeLessThanOrEqual(22000);
    }
  });

  it('keeps average equipment power increasing with item rarity', () => {
    const averages = ITEM_TIER_ORDER.map((tier) => {
      const items = SHOP_ITEMS.filter((item) => item.kind === 'equipment' && item.tier === tier);
      return items.reduce((sum, item) => sum + itemPowerScore(item), 0) / items.length;
    });
    for (let i = 1; i < averages.length; i++) expect(averages[i]).toBeGreaterThan(averages[i - 1]!);
  });

  it('balances broad battlefields below focused home-field arenas', () => {
    for (const field of BATTLEFIELDS) expect(field.boost).toBeGreaterThan(0);
    const broad = BATTLEFIELDS.filter((field) => field.affinityFranchises.length >= 4);
    const focused = BATTLEFIELDS.filter((field) => field.affinityFranchises.length === 1);
    expect(Math.max(...broad.map((field) => field.boost))).toBeLessThan(Math.min(...focused.map((field) => field.boost)));
  });

  it('has at least one character in every rarity tier', () => {
    for (const rarity of Object.keys(Balance.rarity.weights) as Rarity[]) {
      expect(CHARACTERS.some((character) => character.rarity === rarity), rarity).toBe(true);
    }
  });

  it('ids are unique and stats are sane', () => {
    const ids = new Set(CHARACTERS.map((c) => c.id));
    expect(ids.size).toBe(CHARACTERS.length);
    for (const c of CHARACTERS) {
      expect(c.stats.hp).toBeGreaterThan(0);
      expect(c.stats.atk).toBeGreaterThan(0);
      expect(c.stats.spd).toBeGreaterThan(0);
      expect(c.stats.crit).toBeGreaterThanOrEqual(0);
      expect(c.stats.crit).toBeLessThanOrEqual(1);
    }
  });
});


describe('run store', () => {
  it('defines a priced spin for every equipment tier with a chance at every result tier', () => {
    for (const spinTier of ITEM_TIER_ORDER) {
      expect(ITEM_SPIN_PRICES[spinTier]).toBeGreaterThan(0);
      const weights = ITEM_SPIN_WEIGHTS[spinTier];
      expect(Object.values(weights).reduce((sum, weight) => sum + weight, 0)).toBe(100);
      for (const resultTier of ITEM_TIER_ORDER) expect(weights[resultTier]).toBeGreaterThan(0);
      expect(weights[spinTier]).toBe(Math.max(...Object.values(weights)));
    }
    for (let index = 1; index < ITEM_TIER_ORDER.length; index++) {
      expect(ITEM_SPIN_PRICES[ITEM_TIER_ORDER[index]!]).toBeGreaterThan(
        ITEM_SPIN_PRICES[ITEM_TIER_ORDER[index - 1]!],
      );
    }
  });

  it('charges the chosen spin price and sends the result to inventory', () => {
    const run = new RunState(41);
    const price = ITEM_SPIN_PRICES.rare;
    run.gold = price - 1;
    expect(run.buyItemSpin('rare')).toEqual({ status: 'poor' });
    expect(run.inventory).toHaveLength(0);
    run.gold = price;
    const result = run.buyItemSpin('rare');
    expect(result.status).toBe('bought');
    expect(run.gold).toBe(0);
    expect(run.inventory).toHaveLength(1);
    if (result.status === 'bought') expect(result.item.kind).toBe('equipment');
  });

  it('scales battle coin payouts and offers structured reward categories', () => {
    const normal = new RunState(46);
    normal.applyBattleResult({ winner: 'player', duration: 10, events: [], units: [] });
    const normalPayout = normal.lastBattleCoins;
    const choices = normal.generateRewards();
    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((choice) => choice.category)).size).toBe(4);

    const boss = new RunState(47);
    boss.floor = 5;
    boss.applyBattleResult({ winner: 'player', duration: 10, events: [], units: [] });
    expect(boss.lastBattleCoins).toBeGreaterThan(normalPayout);
    expect(boss.generateRewards()).toHaveLength(5);
  });

  it('awards and reveals both items from a Double Gear Cache', () => {
    const run = new RunState(406);
    let cache = run.generateRewards().find((choice) => choice.id === 'gear-cache');
    for (let attempt = 0; !cache && attempt < 30; attempt++) {
      cache = run.generateRewards().find((choice) => choice.id === 'gear-cache');
    }
    expect(cache).toBeDefined();
    const before = run.inventory.length;
    const awarded = cache!.apply(run);
    if (!Array.isArray(awarded)) throw new Error('Double Gear Cache must return each awarded item separately');
    expect(awarded).toHaveLength(2);
    expect(run.inventory).toHaveLength(before + 2);
    for (const itemId of awarded) {
      expect(getShopItem(itemId).kind).toBe('equipment');
      expect(run.inventory).toContain(itemId);
    }
  });

  it('makes difficulty visibly affect enemy level, power, and coin payout', () => {
    const easy = new RunState(404, 'easy');
    const normal = new RunState(404, 'normal');
    const hard = new RunState(404, 'hard');
    // Floor 5+ so the base enemy level is ≥2 and the ±1 difficulty bonus is visible.
    easy.floor = normal.floor = hard.floor = 5;
    expect(easy.currentFloor().enemies[0]!.level).toBeLessThan(normal.currentFloor().enemies[0]!.level);
    expect(hard.currentFloor().enemies[0]!.level).toBeGreaterThan(normal.currentFloor().enemies[0]!.level);
    const win = { winner: 'player' as const, duration: 10, events: [], units: [] };
    easy.applyBattleResult(win); normal.applyBattleResult(win); hard.applyBattleResult(win);
    expect(easy.lastBattleCoins).toBeLessThan(normal.lastBattleCoins);
    expect(hard.lastBattleCoins).toBeGreaterThan(normal.lastBattleCoins);
  });

  it('lets players train with coins and fully restores health on level-up', () => {
    const run = new RunState(405);
    run.addRecruit(getCharacter('mario'));
    run.roster[0]!.hpPct = 0.2;
    const price = run.trainingCost(0);
    run.gold = price;
    expect(run.trainRosterMember(0)).toBe('trained');
    expect(run.gold).toBe(0);
    expect(run.roster[0]!.level).toBe(2);
    expect(run.roster[0]!.hpPct).toBe(1);
  });

  it('sells escalating command expansions up to the team-cost maximum', () => {
    const run = new RunState(48);
    run.gold = 5000;
    expect(run.teamCostCap).toBe(Balance.team.costCap);
    expect(run.nextTeamCostUpgradePrice).toBe(Balance.team.costUpgradeBasePrice);

    const firstPrice = run.nextTeamCostUpgradePrice;
    expect(run.buyTeamCostUpgrade()).toBe('bought');
    expect(run.teamCostCap).toBe(Balance.team.costCap + Balance.team.costUpgradeSize);
    expect(run.gold).toBe(5000 - firstPrice);
    expect(run.nextTeamCostUpgradePrice).toBe(firstPrice + Balance.team.costUpgradePriceGrowth);

    while (run.teamCostCap < Balance.team.maxCostCap) expect(run.buyTeamCostUpgrade()).toBe('bought');
    expect(run.teamCostCap).toBe(Balance.team.maxCostCap);
    expect(run.buyTeamCostUpgrade()).toBe('maxed');
  });

  it('uses purchased capacity when assigning higher-cost teams', () => {
    const run = new RunState(49);
    const godlike = CHARACTERS.filter((character) => character.rarity === 'godlike');
    const rare = CHARACTERS.find((character) => character.rarity === 'rare')!;
    run.addRecruit(godlike[0]!); // cost 10 → auto-placed
    run.addRecruit(godlike[1]!); // cost 10 → auto-placed (20 ≤ cap)
    run.addRecruit(rare); // benched: 20 + 3 would exceed the base cap
    expect(run.teamCost()).toBe(Balance.rarity.cost.godlike * 2);
    expect(run.assign(2, 2)).toBe(false);
    run.gold = 1000;
    expect(run.buyTeamCostUpgrade()).toBe('bought'); // cap += costUpgradeSize
    expect(run.assign(2, 2)).toBe(true);
    expect(run.teamCost()).toBe(Balance.rarity.cost.godlike * 2 + Balance.rarity.cost.rare);
  });

  it('equips spun gear in Formation and can return it to the Bag', () => {
    const run = new RunState(42);
    run.addRecruit(getCharacter('mario'));
    run.gold = 1000;
    expect(run.buyItemSpin('common').status).toBe('bought');
    expect(run.inventory).toHaveLength(1);
    expect(run.equipInventoryItem(0, 0)).toBe(true);
    expect(run.roster[0]?.heldItemId).toBeTruthy();
    expect(run.playerSpecs()[0]?.itemBoosts).toBeTruthy();
    const held = run.roster[0]!.heldItemId;
    expect(run.unequipItem(0)).toBe(true);
    expect(run.roster[0]?.heldItemId).toBeNull();
    expect(run.inventory).toContain(held);
  });
});

describe('mystery equipment', () => {
  it('uses the published weighted rarity table', () => {
    const run = new RunState(86420);
    const rolls = 50000;
    const counts = Object.fromEntries(
      Object.keys(MYSTERY_ITEM_WEIGHTS).map((tier) => [tier, 0]),
    ) as Record<keyof typeof MYSTERY_ITEM_WEIGHTS, number>;

    for (let i = 0; i < rolls; i++) {
      const item = run.rollMysteryItem();
      expect(item.kind).toBe('equipment');
      counts[item.tier]++;
    }

    const totalWeight = Object.values(MYSTERY_ITEM_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    for (const tier of Object.keys(MYSTERY_ITEM_WEIGHTS) as Array<keyof typeof MYSTERY_ITEM_WEIGHTS>) {
      const expected = MYSTERY_ITEM_WEIGHTS[tier] / totalWeight;
      const actual = counts[tier] / rolls;
      const sigma = Math.sqrt((expected * (1 - expected)) / rolls);
      expect(Math.abs(actual - expected), tier).toBeLessThan(4 * sigma + 0.002);
    }
  });
});

describe('universe assignments', () => {
  it('groups the requested characters into their slot universes', () => {
    expect(getCharacter('spongebob').franchise).toBe('spongebob');
    expect(getCharacter('patrick').franchise).toBe('spongebob');
    for (const id of ['goku', 'luffy', 'nami', 'naruto', 'saitama', 'yuji-itadori']) expect(getCharacter(id).franchise).toBe('anime');
    for (const id of ['aang', 'danny-phantom', 'sonic', 'shrek']) expect(getCharacter(id).franchise).toBe('toons');
    expect(getCharacter('john-wick').franchise).toBe('cinema');
    expect(getCharacter('godzilla').franchise).toBe('cinema');
    expect(getCharacter('mario').franchise).toBe('mario');
    expect(getCharacter('luigi').franchise).toBe('mario');
    expect(getCharacter('bowser').franchise).toBe('mario');
    expect(getCharacter('peach').franchise).toBe('mario');
    expect(getCharacter('daisy').franchise).toBe('mario');
    expect(getCharacter('rosalina').franchise).toBe('mario');
    expect(getCharacter('toad').franchise).toBe('mario');
    expect(getCharacter('yoshi').franchise).toBe('mario');
    expect(getCharacter('king-boo').franchise).toBe('mario');
    expect(getCharacter('flash').franchise).toBe('dc');
    expect(getCharacter('green-lantern').franchise).toBe('dc');
    expect(getCharacter('joker').franchise).toBe('dc');
    for (const id of ['ariel', 'genie', 'hercules', 'hook', 'mulan', 'olaf', 'simba', 'tinker-bell']) expect(getCharacter(id).franchise).toBe('disney');
    for (const id of ['black-panther', 'doctor-strange', 'hulk', 'loki', 'scarlet-witch', 'spiderman', 'thanos', 'wolverine']) expect(getCharacter(id).franchise).toBe('marvel');
    for (const id of ['aquaman', 'darkseid', 'harley-quinn']) expect(getCharacter(id).franchise).toBe('dc');
    for (const id of ['chewbacca', 'luke-skywalker', 'princess-leia', 'r2-d2', 'yoda']) expect(getCharacter(id).franchise).toBe('star-wars');
    for (const id of ['gandalf', 'indiana-jones', 'king-kong', 'robocop', 'terminator', 'zorro']) expect(getCharacter(id).franchise).toBe('cinema');
    for (const id of ['gary', 'mr-krabs', 'sandy-cheeks', 'squidward']) expect(getCharacter(id).franchise).toBe('spongebob');
    expect(getCharacter('link').franchise).toBe('nintendo');
    expect(getCharacter('zelda').franchise).toBe('nintendo');
  });

  it('keeps character-specific artifacts specific after category consolidation', () => {
    const emerald = getShopItem('chaos-emerald');
    expect(matchesItemAffinity(getCharacter('sonic'), emerald)).toBe(true);
    expect(matchesItemAffinity(getCharacter('shrek'), emerald)).toBe(false);
    const dragonBall = getShopItem('dragon-ball');
    expect(matchesItemAffinity(getCharacter('goku'), dragonBall)).toBe(true);
    expect(matchesItemAffinity(getCharacter('naruto'), dragonBall)).toBe(false);
  });
});