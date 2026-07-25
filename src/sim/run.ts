/**
 * RunState: everything about the current climb — roster, team, gold, spins,
 * relics, floor. Serializable at all times; owns the run's RNG streams.
 */

import { Rng } from '../core/Rng';
import { Balance } from '../data/balance';
import { CHARACTERS, getCharacter } from '../data/characters';
import type { CharacterDef, Rarity } from '../data/types';
import { effectiveItemBoosts, getShopItem, ITEM_SPIN_PRICES, ITEM_SPIN_WEIGHTS, MYSTERY_ITEM_WEIGHTS, SHOP_ITEMS } from '../data/items';
import type { ItemBoosts, ItemTier, ShopItemDef } from '../data/items';
import type { ModifierId } from '../data/modifiers';
import type { CombatantSpec } from './battle';
import type { BattleResult } from './events';
import { generateConquestNode, generateFloor, type FloorInfo } from './tower';
import type { Difficulty } from '../core/Save';

/** Run structure. 'tower' is the endless climb; 'conquest' is a universe ladder. */
export type GameMode = 'tower' | 'conquest';

export interface RunOptions {
  mode?: GameMode;
  /** Draft recruiting: choose 1 of several offers instead of a random pull. */
  draft?: boolean;
}

export interface RosterEntry {
  defId: string;
  level: number;
  hpPct: number; // persistent health across floors (the roguelite pressure)
  heldItemId: string | null;
}

/** Universes that actually have recruitable legends, in stable roster order. */
export function populatedFranchises(): string[] {
  return [...new Set(CHARACTERS.map((c) => c.franchise))];
}

/**
 * Ground-truth probability of each rarity for a given recruit pool under the
 * universe-first summon: every populated universe is equally likely, then
 * rarity is drawn by the intended weights renormalized over the tiers that
 * universe actually offers. The spin logic and the on-screen SUMMON RATES
 * both read from this, so the displayed odds can never drift from reality.
 */
export function summonRarityOddsForPool(pool: readonly CharacterDef[]): Record<Rarity, number> {
  const franchises = [...new Set(pool.map((c) => c.franchise))];
  const odds: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0, supreme: 0, godlike: 0 };
  if (franchises.length === 0) return odds;
  for (const franchise of franchises) {
    const rarities = [...new Set(pool.filter((c) => c.franchise === franchise).map((c) => c.rarity))];
    const totalWeight = rarities.reduce((sum, r) => sum + Balance.rarity.weights[r], 0);
    for (const r of rarities) odds[r] += (1 / franchises.length) * (Balance.rarity.weights[r] / totalWeight);
  }
  return odds;
}

/** Default summon odds over the full roster (no modifiers). */
export function summonRarityOdds(): Record<Rarity, number> {
  return summonRarityOddsForPool(CHARACTERS);
}

export interface RewardChoice {
  id: string;
  title: string;
  desc: string;
  icon: string;
  tier: 'common' | 'rare' | 'epic';
  category: 'coins' | 'recovery' | 'power' | 'gear';
  apply: (run: RunState) => void | string | string[];
}

export class RunState {
  readonly seed: number;
  readonly rng: Rng; // recruit + reward stream
  private readonly battleRng: Rng; // independent stream: battles stay deterministic

  floor = 1;
  gold: number = Balance.economy.startingGold;
  spins: number = Balance.economy.startingSpins;
  spinsBought = 0;
  roster: RosterEntry[] = [];
  /** team[slot] = roster index or null; slots 0..2 front, 3..4 back. */
  team: (number | null)[] = [null, null, null, null, null];
  relicAtk = 0;
  relicHp = 0;
  goldEarned = 0;
  lastBattleCoins = 0;
  kills = 0;
  lastBattle: BattleResult | null = null;
  inventory: string[] = [];
  teamCostCap: number = Balance.team.costCap;
  teamCostUpgrades = 0;
  /** Arena chosen by the pre-battle convergence rail. */
  battlefieldId: string | null = null;
  difficulty: Difficulty;

  /** Active run modifiers (mutators). Empty for a standard climb. */
  readonly modifiers: ReadonlySet<ModifierId>;
  /** When Mono-Universe is active, the single universe summons are locked to. */
  readonly monoFranchise: string | null;
  /** Run structure: endless tower or a fixed universe-conquest ladder. */
  readonly mode: GameMode;
  /** Draft recruiting instead of random pulls. */
  readonly draft: boolean;
  /** Universes to conquer, in order (conquest mode only). */
  readonly conquestOrder: readonly string[];

  constructor(seed: number, difficulty: Difficulty = 'normal', modifiers: readonly ModifierId[] = [], options: RunOptions = {}) {
    this.seed = seed;
    this.difficulty = difficulty;
    this.modifiers = new Set(modifiers);
    this.mode = options.mode ?? 'tower';
    this.draft = options.draft ?? false;
    const root = new Rng(seed);
    this.rng = root.fork();
    this.battleRng = root.fork();
    // Meta draws on their own stream so they never disturb recruit/battle sequences.
    const meta = root.fork();
    this.monoFranchise = this.modifiers.has('mono-universe') ? meta.pick(populatedFranchises()) : null;
    this.conquestOrder = this.mode === 'conquest' ? meta.shuffle(populatedFranchises()) : [];
  }

  // ── conquest ───────────────────────────────────────────────────────────
  isConquest(): boolean {
    return this.mode === 'conquest';
  }

  /** Universe the current node fights, or null once every universe is conquered. */
  conquestTarget(): string | null {
    return this.conquestOrder[this.floor - 1] ?? null;
  }

  /** True once the final universe has been cleared (floor advanced past the ladder). */
  conquestComplete(): boolean {
    return this.mode === 'conquest' && this.floor > this.conquestOrder.length;
  }

  hasModifier(id: ModifierId): boolean {
    return this.modifiers.has(id);
  }

  // ── recruiting ─────────────────────────────────────────────────────────
  get spinCost(): number {
    return Balance.economy.spinBaseCost + Balance.economy.spinCostGrowth * this.spinsBought;
  }

  get canSpin(): boolean {
    return this.spins > 0 || this.gold >= this.spinCost;
  }

  /** Characters a summon may yield, after modifier constraints. */
  eligibleRecruitPool(): CharacterDef[] {
    let pool: CharacterDef[] = CHARACTERS;
    if (this.monoFranchise) pool = pool.filter((c) => c.franchise === this.monoFranchise);
    if (this.hasModifier('underdog')) pool = pool.filter((c) => c.rarity === 'common' || c.rarity === 'rare');
    return pool;
  }

  /** True summon odds for THIS run (honors modifiers), shown on the altar. */
  summonOdds(): Record<Rarity, number> {
    return summonRarityOddsForPool(this.eligibleRecruitPool());
  }

  /** Consumes a free spin, else gold. Throws if neither is available. */
  payForRecruit(): void {
    if (this.spins > 0) {
      this.spins--;
      return;
    }
    if (this.gold < this.spinCost) throw new Error('Cannot afford spin');
    this.gold -= this.spinCost;
    this.spinsBought++;
  }

  /** One universe-first draw from a pool (no payment, no side effects). */
  private drawRecruit(pool: readonly CharacterDef[]): CharacterDef {
    // Universe first — every populated universe (within the pool) is equally likely.
    const franchises = [...new Set(pool.map((c) => c.franchise))];
    const franchise = this.rng.pick(franchises);
    const inFranchise = pool.filter((c) => c.franchise === franchise);
    // Rarity — intended weights, renormalized over the tiers this universe offers.
    const availableRarities = [...new Set(inFranchise.map((c) => c.rarity))];
    const rarity = this.rng.weighted(availableRarities, (r) => Balance.rarity.weights[r]);
    // Character — uniform among this universe's legends of that rarity.
    return this.rng.pick(inFranchise.filter((c) => c.rarity === rarity));
  }

  /** Consumes a free spin or gold. Returns the recruited character. */
  spin(): CharacterDef {
    this.payForRecruit();
    return this.drawRecruit(this.eligibleRecruitPool());
  }

  /** Distinct draft offers for the pick-one recruiting style (no payment). */
  rollDraftOptions(count: number): CharacterDef[] {
    const pool = this.eligibleRecruitPool();
    const distinctIds = new Set(pool.map((c) => c.id));
    const target = Math.min(count, distinctIds.size);
    const offers: CharacterDef[] = [];
    const chosen = new Set<string>();
    let guard = 0;
    while (offers.length < target && guard++ < 500) {
      const pick = this.drawRecruit(pool);
      if (chosen.has(pick.id)) continue;
      chosen.add(pick.id);
      offers.push(pick);
    }
    return offers;
  }

  /** Add to roster; duplicates become +1 level (returns 'leveled'). */
  addRecruit(def: CharacterDef): 'new' | 'leveled' | 'maxed' {
    const existing = this.roster.find((r) => r.defId === def.id);
    if (existing) {
      if (existing.level >= Balance.level.max) return 'maxed';
      existing.level++;
      existing.hpPct = 1;
      return 'leveled';
    }
    this.roster.push({ defId: def.id, level: 1, hpPct: 1, heldItemId: null });
    // Auto-place into the first open team slot if cost allows.
    const idx = this.roster.length - 1;
    const slot = this.team.indexOf(null);
    if (slot >= 0 && this.teamCost() + Balance.rarity.cost[def.rarity] <= this.teamCostCap) {
      this.team[slot] = idx;
    }
    return 'new';
  }

  // ── team management ────────────────────────────────────────────────────
  teamCost(): number {
    let cost = 0;
    for (const idx of this.team) {
      if (idx === null) continue;
      const entry = this.roster[idx];
      if (entry) cost += Balance.rarity.cost[getCharacter(entry.defId).rarity];
    }
    return cost;
  }

  teamSize(): number {
    return this.team.filter((s) => s !== null).length;
  }

  /** Place a benched roster member into a slot (swapping anyone there out). */
  assign(rosterIdx: number, slot: number): boolean {
    if (slot < 0 || slot >= this.team.length) return false;
    const entry = this.roster[rosterIdx];
    if (!entry) return false;
    const currentSlot = this.team.indexOf(rosterIdx);
    if (currentSlot === slot) return true;
    if (currentSlot >= 0) {
      // Already fielded: swap positions within the team.
      this.team[currentSlot] = this.team[slot] ?? null;
      this.team[slot] = rosterIdx;
      return true;
    }
    const displaced = this.team[slot];
    const newCost =
      this.teamCost() -
      (displaced !== null && displaced !== undefined ? Balance.rarity.cost[getCharacter(this.roster[displaced]!.defId).rarity] : 0) +
      Balance.rarity.cost[getCharacter(entry.defId).rarity];
    if (newCost > this.teamCostCap) return false;
    this.team[slot] = rosterIdx;
    return true;
  }

  removeFromTeam(slot: number): void {
    if (slot >= 0 && slot < this.team.length) this.team[slot] = null;
  }

  teamDefs(): CharacterDef[] {
    return this.team
      .filter((idx): idx is number => idx !== null)
      .map((idx) => getCharacter(this.roster[idx]!.defId));
  }

  // ── battle ─────────────────────────────────────────────────────────────
  currentFloor(): FloorInfo {
    // Node/floor layout is a pure function of (seed, floor) so re-entry is stable.
    const rng = new Rng((this.seed ^ (this.floor * 0x9e3779b9)) >>> 0);
    const generated = this.mode === 'conquest'
      ? generateConquestNode(this.floor, this.conquestTarget() ?? this.conquestOrder[this.conquestOrder.length - 1]!, this.conquestOrder.length, rng)
      : generateFloor(this.floor, rng);
    const difficultyScale = Balance.difficulty[this.difficulty];
    const levelBonus = Balance.difficultyLevelBonus[this.difficulty];
    return {
      ...generated,
      enemies: generated.enemies.map((enemy) => ({
        ...enemy,
        level: Math.max(1, Math.min(Balance.level.max, enemy.level + levelBonus)),
        statScale: enemy.statScale * difficultyScale,
      })),
    };
  }

  nextBattleSeed(): number {
    return Math.floor(this.battleRng.next() * 4294967296);
  }

  /** Per-stat deltas from modifiers, applied on top of items and synergies. */
  private modifierStatBoosts(): ItemBoosts | undefined {
    if (!this.hasModifier('glass-cannon')) return undefined;
    return { atk: 0.4, hp: -0.35 };
  }

  playerSpecs(): CombatantSpec[] {
    const specs: CombatantSpec[] = [];
    const extraBoosts = this.modifierStatBoosts();
    for (let slot = 0; slot < this.team.length; slot++) {
      const idx = this.team[slot];
      if (idx === null || idx === undefined) continue;
      const entry = this.roster[idx]!;
      // statScale multiplies both HP and ATK in the sim; fold both relic
      // types into it as an average so each purchase always matters.
      const relicScale = 1 + (this.relicAtk + this.relicHp) / 2;
      specs.push({
        defId: entry.defId,
        level: entry.level,
        slot,
        hpPct: Math.max(0.05, entry.hpPct),
        statScale: relicScale,
        itemId: entry.heldItemId ?? undefined,
        itemBoosts: entry.heldItemId
          ? effectiveItemBoosts(getShopItem(entry.heldItemId), getCharacter(entry.defId))
          : undefined,
        extraBoosts,
      });
    }
    return specs;
  }

  /** Fold a finished battle back into the run. Returns true on victory. */
  applyBattleResult(result: BattleResult): boolean {
    this.lastBattle = result;
    for (const u of result.units) {
      if (u.side !== 'player') continue;
      const slot = Number(u.uid.slice(1));
      const specIdx = this.playerSpecIndexBySlotOrder(slot);
      if (specIdx === null) continue;
      const entry = this.roster[specIdx];
      if (!entry) continue;
      // Survivors keep their remaining HP; the fallen are patched up — but only
      // to a sliver under Sudden Death, where recovery is scarce.
      const revivePct = this.hasModifier('sudden-death') ? 0.1 : 0.2;
      entry.hpPct = u.alive ? Math.max(0.05, u.hpPct) : revivePct;
      this.kills += u.kills;
    }
    if (result.winner === 'player') {
      const R = Balance.rewards;
      const playerUnits = result.units.filter((unit) => unit.side === 'player');
      const survivors = playerUnits.filter((unit) => unit.alive).length;
      const flawless = playerUnits.length > 0 && playerUnits.every((unit) => unit.alive && unit.hpPct >= 0.75);
      const baseReward = R.battleBase + this.floor * R.battlePerFloor + survivors * R.survivorBonus + (this.currentFloor().isBoss ? R.bossBonus : 0) + (flawless ? R.flawlessBonus : 0);
      const reward = Math.round(baseReward * Balance.difficultyReward[this.difficulty]);
      this.lastBattleCoins = reward;
      this.gold += reward;
      this.goldEarned += reward;
        return true;
    }
    return false;
  }

  /** Map a battle uid index (order within playerSpecs) back to roster index. */
  private playerSpecIndexBySlotOrder(orderIndex: number): number | null {
    let i = 0;
    for (const idx of this.team) {
      if (idx === null) continue;
      if (i === orderIndex) return idx;
      i++;
    }
    return null;
  }

  advanceFloor(): void {
    this.floor++;
  }

  // -- store ---------------------------------------------------------------
  get nextTeamCostUpgradePrice(): number {
    return Balance.team.costUpgradeBasePrice + this.teamCostUpgrades * Balance.team.costUpgradePriceGrowth;
  }

  buyTeamCostUpgrade(): 'bought' | 'poor' | 'maxed' {
    if (this.teamCostCap >= Balance.team.maxCostCap) return 'maxed';
    const price = this.nextTeamCostUpgradePrice;
    if (this.gold < price) return 'poor';
    this.gold -= price;
    this.teamCostUpgrades++;
    this.teamCostCap = Math.min(Balance.team.maxCostCap, this.teamCostCap + Balance.team.costUpgradeSize);
    return 'bought';
  }

  rollMysteryItem(): ShopItemDef {
    // Only roll among tiers that actually have equipment, so content edits
    // that empty a tier can never crash a reward.
    const tiers = (Object.keys(MYSTERY_ITEM_WEIGHTS) as ItemTier[]).filter((tier) =>
      SHOP_ITEMS.some((item) => item.kind === 'equipment' && item.tier === tier),
    );
    if (tiers.length === 0) throw new Error('No mystery equipment registered at all');
    const tier = this.rng.weighted(tiers, (candidate) => MYSTERY_ITEM_WEIGHTS[candidate]);
    return this.rng.pick(SHOP_ITEMS.filter((item) => item.kind === 'equipment' && item.tier === tier));
  }

  rollItemSpin(spinTier: ItemTier): ShopItemDef {
    const equipment = SHOP_ITEMS.filter((item) => item.kind === 'equipment');
    const tiers = (Object.keys(ITEM_SPIN_WEIGHTS[spinTier]) as ItemTier[]).filter((tier) =>
      equipment.some((item) => item.tier === tier),
    );
    if (tiers.length === 0) throw new Error('No equipment registered for Store spins');
    const resultTier = this.rng.weighted(tiers, (tier) => ITEM_SPIN_WEIGHTS[spinTier][tier]);
    return this.rng.pick(equipment.filter((item) => item.tier === resultTier));
  }

  buyItemSpin(spinTier: ItemTier): { status: 'bought'; item: ShopItemDef } | { status: 'poor' } {
    const price = ITEM_SPIN_PRICES[spinTier];
    if (this.gold < price) return { status: 'poor' };
    this.gold -= price;
    const item = this.rollItemSpin(spinTier);
    this.inventory.push(item.id);
    return { status: 'bought', item };
  }

  unequipItem(rosterIndex: number): boolean {
    const entry = this.roster[rosterIndex];
    if (!entry?.heldItemId) return false;
    this.inventory.push(entry.heldItemId);
    entry.heldItemId = null;
    return true;
  }

  equipInventoryItem(inventoryIndex: number, rosterIndex: number): boolean {
    const id = this.inventory[inventoryIndex];
    const entry = this.roster[rosterIndex];
    if (!id || !entry || getShopItem(id).kind !== 'equipment') return false;
    this.inventory.splice(inventoryIndex, 1);
    if (entry.heldItemId) this.inventory.push(entry.heldItemId);
    entry.heldItemId = id;
    return true;
  }

  // ── rewards ────────────────────────────────────────────────────────────
  trainingCost(rosterIndex: number): number {
    const entry = this.roster[rosterIndex];
    if (!entry) return 0;
    const rarity = getCharacter(entry.defId).rarity;
    return Balance.level.trainingBaseCost
      + entry.level * Balance.level.trainingPerLevel
      + Balance.rarity.cost[rarity] * Balance.level.trainingRarityCost;
  }

  /** Spend coins to gain a level. Training always fully restores that legend. */
  trainRosterMember(rosterIndex: number): 'trained' | 'poor' | 'maxed' | 'missing' {
    const entry = this.roster[rosterIndex];
    if (!entry) return 'missing';
    if (entry.level >= Balance.level.max) return 'maxed';
    const cost = this.trainingCost(rosterIndex);
    if (this.gold < cost) return 'poor';
    this.gold -= cost;
    entry.level++;
    entry.hpPct = 1;
    return 'trained';
  }
  generateRewards(): RewardChoice[] {
    const R = Balance.rewards;
    const floorBonus = this.floor * R.goldPerFloor;
    const boss = this.currentFloor().isBoss;
    const economy: RewardChoice[] = [
      { id: 'coin-cache', title: `${R.goldSmall + floorBonus} Coins`, desc: 'A reliable purse for training, equipment, or another pull.', icon: '\u{1FA99}', tier: 'common', category: 'coins', apply: (run) => { const amount = R.goldSmall + floorBonus; run.gold += amount; run.goldEarned += amount; } },
      { id: 'coin-vault', title: `${R.goldLarge + floorBonus} Coins`, desc: 'A rare vault large enough to fund premium equipment.', icon: '\u{1F4B0}', tier: 'epic', category: 'coins', apply: (run) => { const amount = R.goldLarge + floorBonus; run.gold += amount; run.goldEarned += amount; } },
      { id: 'free-spin', title: boss ? 'Two Free Pulls' : 'Free Pull', desc: 'Recruit without spending coins.', icon: '\u{1F3AB}', tier: boss ? 'epic' : 'rare', category: 'coins', apply: (run) => { run.spins += boss ? 2 : 1; } },
      { id: 'supply-drop', title: 'Supply Drop', desc: `${R.goldSmall + floorBonus} coins plus one free legend pull.`, icon: '\u{1F4E6}', tier: 'rare', category: 'coins', apply: (run) => { const amount = R.goldSmall + floorBonus; run.gold += amount; run.goldEarned += amount; run.spins++; } },
    ];
    const recovery: RewardChoice[] = [
      { id: 'field-hospital', title: 'Field Hospital', desc: `Restore ${Math.round(R.healPct * 100)}% HP to every roster member.`, icon: '\u2764\uFE0F', tier: 'common', category: 'recovery', apply: (run) => { for (const entry of run.roster) entry.hpPct = Math.min(1, entry.hpPct + R.healPct); } },
      { id: 'full-recovery', title: 'Miracle Recovery', desc: 'Fully restore every legend in your roster.', icon: '\u2728', tier: 'epic', category: 'recovery', apply: (run) => { for (const entry of run.roster) entry.hpPct = R.fullHealPct; } },
      { id: 'frontline-care', title: 'Frontline Care', desc: 'Fully restore every legend currently in your formation.', icon: '\u{1F6E1}\uFE0F', tier: 'rare', category: 'recovery', apply: (run) => { for (const index of run.team) if (index !== null && run.roster[index]) run.roster[index]!.hpPct = 1; } },
    ];
    const gear: RewardChoice[] = [
      { id: 'mystery-relic', title: 'Mystery Equipment', desc: 'Receive a weighted equipment spin, with every rarity possible.', icon: '\u{1F381}', tier: 'rare', category: 'gear', apply: (run) => { const item = run.rollMysteryItem(); run.inventory.push(item.id); return item.id; } },
      { id: 'gear-cache', title: 'Double Gear Cache', desc: 'Receive two mystery items for your Formation Bag.', icon: '\u{1F9F0}', tier: 'epic', category: 'gear', apply: (run) => { const first = run.rollMysteryItem(); const second = run.rollMysteryItem(); run.inventory.push(first.id, second.id); return [first.id, second.id]; } },
    ];
    const power: RewardChoice[] = [
      { id: 'relic-atk', title: 'Relic of Fury', desc: `Your team gains +${Math.round(R.relicAtk * 100)}% run-wide attack power.`, icon: '\u2694\uFE0F', tier: 'rare', category: 'power', apply: (run) => { run.relicAtk += R.relicAtk; } },
      { id: 'relic-hp', title: 'Relic of Vitality', desc: `Your team gains +${Math.round(R.relicHp * 100)}% run-wide vitality.`, icon: '\u{1F48E}', tier: 'rare', category: 'power', apply: (run) => { run.relicHp += R.relicHp; } },
      { id: 'twin-relic', title: 'Balanced Relic', desc: 'Gain +4% run-wide attack and vitality.', icon: '\u2696\uFE0F', tier: 'epic', category: 'power', apply: (run) => { run.relicAtk += 0.04; run.relicHp += 0.04; } },
    ];
    if (this.roster.some((entry) => entry.level < Balance.level.max)) {
      power.push({ id: 'training', title: 'Focused Training', desc: 'The lowest-level legend gains +1 level and fully restores HP.', icon: '\u{1F4C8}', tier: 'rare', category: 'power', apply: (run) => { const eligible = run.roster.filter((entry) => entry.level < Balance.level.max); const minLevel = Math.min(...eligible.map((entry) => entry.level)); const candidates = eligible.filter((entry) => entry.level === minLevel); const chosen = candidates.length > 0 ? run.rng.pick(candidates) : undefined; if (chosen) { chosen.level++; chosen.hpPct = 1; } } });
      power.push({ id: 'squad-drills', title: 'Squad Drills', desc: 'Two lowest-level legends gain +1 level and fully restore HP.', icon: '\u{1F396}\uFE0F', tier: 'epic', category: 'power', apply: (run) => { const eligible = run.roster.filter((entry) => entry.level < Balance.level.max).sort((a, b) => a.level - b.level); for (const entry of eligible.slice(0, 2)) { entry.level++; entry.hpPct = 1; } } });
    }
    if (this.teamCostCap < Balance.team.maxCostCap) power.push({ id: 'command-emblem', title: 'Command Emblem', desc: 'Permanently gain +1 formation cost capacity this run.', icon: '\u{1F451}', tier: 'epic', category: 'power', apply: (run) => { run.teamCostCap = Math.min(Balance.team.maxCostCap, run.teamCostCap + 1); } });

    // Sudden Death removes the whole recovery category; the slot is topped up
    // from the other pools so the player still gets a full spread of choices.
    const suddenDeath = this.hasModifier('sudden-death');
    const categories = suddenDeath ? [economy, power, gear] : [economy, recovery, power, gear];
    const target = boss ? R.bossChoices : R.choices;

    const choices: RewardChoice[] = [];
    const used = new Set<string>();
    const takeFrom = (pool: RewardChoice[]): void => {
      const available = pool.filter((choice) => !used.has(choice.id));
      if (available.length === 0) return;
      const pick = this.rng.pick(available);
      choices.push(pick);
      used.add(pick.id);
    };
    for (const pool of categories) takeFrom(pool);
    const fillPool = [economy, power, gear, ...(suddenDeath ? [] : [recovery])].flat();
    while (choices.length < target && fillPool.some((choice) => !used.has(choice.id))) takeFrom(fillPool);

    return this.rng.shuffle(choices).slice(0, target);
  }
}
