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
import { floorKind, generateConquestNode, generateFloor, isCombatFloor, routeChoices, type FloorInfo, type FloorKind } from './tower';
import type { Difficulty } from '../core/Save';
import { getRelic, relicCombatBonuses, relicRunTotals, RELICS } from '../data/relics';

/** Run structure. 'tower' is the endless climb; 'conquest' is a universe ladder. */
export type GameMode = 'tower' | 'conquest';

export interface RunOptions {
  mode?: GameMode;
  /** Draft recruiting: choose 1 of several offers instead of a random pull. */
  draft?: boolean;
  /** Chosen universe for Mono-Universe; null/undefined or unknown id = random. */
  monoFranchise?: string | null;
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

export interface EventChoice {
  id: string;
  title: string;
  desc: string;
  icon: string;
  available: boolean;
}

export interface EventResult {
  icon: string;
  title: string;
  detail: string;
  itemId?: string;
}

/** A run frozen to plain JSON so a climb survives closing the tab. */
export interface RunSave {
  v: 1;
  seed: number;
  difficulty: Difficulty;
  mode: GameMode;
  draft: boolean;
  modifiers: ModifierId[];
  monoFranchise: string | null;
  conquestOrder: string[];
  floor: number;
  gold: number;
  spins: number;
  spinsBought: number;
  roster: RosterEntry[];
  team: (number | null)[];
  relicAtk: number;
  relicHp: number;
  /** Named build-defining relics; optional for saves made before this system. */
  relicIds?: string[];
  goldEarned: number;
  lastBattleCoins: number;
  kills: number;
  inventory: string[];
  teamCostCap: number;
  teamCostUpgrades: number;
  battlefieldId: string | null;
  /** Player-selected room type for the current tower floor. */
  selectedFloorKind?: FloorKind | null;
  previousFloorKind?: FloorKind;
  eventResolvedFloor?: number | null;
  /** Stream positions so resuming never replays the same draws. */
  rngState: number;
  battleRngState: number;
  /** Last battle without its event log (kept small); powers the run summary. */
  lastBattle: Pick<BattleResult, 'winner' | 'duration' | 'units'> | null;
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
  /** team[slot] = roster index or null; slots 0..1 front, 2..4 back. */
  team: (number | null)[] = [null, null, null, null, null];
  relicAtk = 0;
  relicHp = 0;
  relicIds: string[] = [];
  goldEarned = 0;
  lastBattleCoins = 0;
  kills = 0;
  lastBattle: BattleResult | null = null;
  inventory: string[] = [];
  teamCostCap: number = Balance.team.costCap;
  teamCostUpgrades = 0;
  /** Arena chosen by the pre-battle convergence rail. */
  battlefieldId: string | null = null;
  selectedFloorKind: FloorKind | null = null;
  previousFloorKind: FloorKind = 'battle';
  eventResolvedFloor: number | null = null;
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
    const universes = populatedFranchises();
    const chosen = options.monoFranchise;
    this.monoFranchise = this.modifiers.has('mono-universe')
      ? (chosen && universes.includes(chosen) ? chosen : meta.pick(universes))
      : null;
    this.conquestOrder = this.mode === 'conquest' ? meta.shuffle(universes) : [];
  }

  // ── persistence ────────────────────────────────────────────────────────
  /** Freeze the whole climb to plain JSON (drops the bulky battle event log). */
  toSave(): RunSave {
    return {
      v: 1,
      seed: this.seed,
      difficulty: this.difficulty,
      mode: this.mode,
      draft: this.draft,
      modifiers: [...this.modifiers],
      monoFranchise: this.monoFranchise,
      conquestOrder: [...this.conquestOrder],
      floor: this.floor,
      gold: this.gold,
      spins: this.spins,
      spinsBought: this.spinsBought,
      roster: this.roster.map((entry) => ({ ...entry })),
      team: [...this.team],
      relicAtk: this.relicAtk,
      relicHp: this.relicHp,
      relicIds: [...this.relicIds],
      goldEarned: this.goldEarned,
      lastBattleCoins: this.lastBattleCoins,
      kills: this.kills,
      inventory: [...this.inventory],
      teamCostCap: this.teamCostCap,
      teamCostUpgrades: this.teamCostUpgrades,
      battlefieldId: this.battlefieldId,
      selectedFloorKind: this.selectedFloorKind,
      previousFloorKind: this.previousFloorKind,
      eventResolvedFloor: this.eventResolvedFloor,
      rngState: this.rng.streamState,
      battleRngState: this.battleRng.streamState,
      lastBattle: this.lastBattle
        ? { winner: this.lastBattle.winner, duration: this.lastBattle.duration, units: this.lastBattle.units }
        : null,
    };
  }

  /** Rebuild a climb from a save; returns null if the data is unusable. */
  static fromSave(save: RunSave): RunState | null {
    try {
      if (!save || save.v !== 1) return null;
      const run = new RunState(save.seed, save.difficulty, save.modifiers ?? [], {
        mode: save.mode,
        draft: save.draft,
        monoFranchise: save.monoFranchise,
      });
      const writable = run as unknown as { conquestOrder: readonly string[]; battleRng: Rng };
      if (save.conquestOrder) writable.conquestOrder = [...save.conquestOrder];
      run.floor = save.floor;
      run.gold = save.gold;
      run.spins = save.spins;
      run.spinsBought = save.spinsBought;
      // Drop roster entries whose character no longer exists (roster edits between builds).
      run.roster = (save.roster ?? []).filter((entry) => CHARACTERS.some((c) => c.id === entry.defId));
      const dropped = (save.roster ?? []).length !== run.roster.length;
      run.team = dropped
        ? [null, null, null, null, null]
        : (save.team ?? [null, null, null, null, null]).map((slot) => (slot !== null && slot < run.roster.length ? slot : null));
      run.relicAtk = save.relicAtk;
      run.relicHp = save.relicHp;
      run.relicIds = [...new Set(save.relicIds ?? [])].filter((id) => RELICS.some((relic) => relic.id === id));
      run.goldEarned = save.goldEarned;
      run.lastBattleCoins = save.lastBattleCoins;
      run.kills = save.kills;
      run.inventory = (save.inventory ?? []).filter((id) => SHOP_ITEMS.some((item) => item.id === id));
      run.teamCostCap = save.teamCostCap;
      run.teamCostUpgrades = save.teamCostUpgrades;
      run.battlefieldId = save.battlefieldId;
      run.selectedFloorKind = save.selectedFloorKind ?? null;
      run.previousFloorKind = save.previousFloorKind ?? 'battle';
      run.eventResolvedFloor = save.eventResolvedFloor ?? null;
      run.rng.streamState = save.rngState;
      writable.battleRng.streamState = save.battleRngState;
      run.lastBattle = save.lastBattle ? { ...save.lastBattle, events: [] } : null;
      return run;
    } catch {
      return null; // corrupt save — the player starts fresh rather than crashing
    }
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
      : generateFloor(this.floor, rng, this.selectedFloorKind ?? floorKind(this.floor, this.seed));
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

  /** True when this floor is an event room rather than a fight. */
  isEventFloor(): boolean {
    return !isCombatFloor(this.currentFloor().kind);
  }

  routeChoicesForCurrentFloor(): FloorKind[] {
    if (this.mode === 'conquest') return ['battle'];
    return routeChoices(this.floor, this.seed, this.previousFloorKind);
  }

  chooseRoute(kind: FloorKind): boolean {
    if (!this.routeChoicesForCurrentFloor().includes(kind)) return false;
    this.selectedFloorKind = kind;
    return true;
  }

  eventChoices(): EventChoice[] {
    if (this.eventResolvedFloor === this.floor) return [];
    const kind = this.currentFloor().kind;
    if (kind === 'treasure') return [
      { id: 'open-cache', title: 'Open the Cache', desc: 'Gain mystery equipment and a modest coin purse.', icon: '💎', available: true },
      { id: 'sell-cache', title: 'Sell the Cache', desc: 'Take a large guaranteed coin payment instead.', icon: '🪙', available: true },
      { id: 'break-seal', title: 'Break the Seal', desc: 'Gain two items, but every legend loses 20% current HP.', icon: '⚠️', available: true },
    ];
    if (kind === 'rest') return [
      { id: 'full-rest', title: 'Rest Together', desc: 'Fully restore the entire roster.', icon: '🔥', available: true },
      { id: 'focused-drill', title: 'Focused Drills', desc: 'A lowest-level legend gains a level and fully recovers.', icon: '📈', available: this.roster.some((entry) => entry.level < Balance.level.max) },
      { id: 'battle-meditation', title: 'Battle Meditation', desc: 'Restore 35% HP and gain +5% run-wide attack.', icon: '✨', available: true },
    ];
    const gearCost = 120 + this.floor * 8;
    const contractCost = 90 + this.floor * 5;
    return [
      { id: 'merchant-gear', title: `Mystery Gear · ${gearCost}`, desc: 'Buy one weighted equipment spin.', icon: '🧰', available: this.gold >= gearCost },
      { id: 'merchant-contract', title: `Recruit Contract · ${contractCost}`, desc: 'Buy two free legend pulls.', icon: '🎟️', available: this.gold >= contractCost },
      { id: 'merchant-tip', title: 'Trade Battlefield Intel', desc: 'Earn coins and learn from the wandering trader.', icon: '🗺️', available: true },
    ];
  }

  /**
   * Apply a non-combat room's reward and describe it for the event screen.
   * Safe to call once per floor — the caller advances afterwards.
   */
  resolveEventChoice(choiceId: string): EventResult {
    if (this.eventResolvedFloor === this.floor) throw new Error('This event room was already resolved');
    const finish = (result: EventResult): EventResult => {
      this.eventResolvedFloor = this.floor;
      return result;
    };
    const kind = this.currentFloor().kind;
    if (kind === 'treasure') {
      if (choiceId === 'sell-cache') {
        const coins = 260 + this.floor * Balance.rewards.goldPerFloor * 2;
        this.gold += coins;
        this.goldEarned += coins;
        return finish({ icon: '🪙', title: 'CACHE SOLD', detail: `A collector pays ${coins.toLocaleString('en-US')} coins for the sealed cache.` });
      }
      const item = this.rollMysteryItem();
      this.inventory.push(item.id);
      if (choiceId === 'break-seal') {
        const second = this.rollMysteryItem();
        this.inventory.push(second.id);
        for (const entry of this.roster) entry.hpPct = Math.max(0.05, entry.hpPct * 0.8);
        return finish({ icon: '⚠️', title: 'THE SEAL BREAKS', detail: `${item.name} and ${second.name} join your Bag, but the released force wounds the roster.`, itemId: item.id });
      }
      const coins = 60 + this.floor * Balance.rewards.goldPerFloor;
      this.gold += coins;
      this.goldEarned += coins;
      return finish({
        icon: '💎', title: 'TREASURE VAULT',
        detail: `You uncover ${item.name} and ${coins.toLocaleString('en-US')} coins.`,
        itemId: item.id,
      });
    }
    if (kind === 'rest') {
      if (choiceId === 'focused-drill') {
        const eligible = this.roster.filter((entry) => entry.level < Balance.level.max).sort((a, b) => a.level - b.level);
        const trainee = eligible[0];
        if (!trainee) throw new Error('No legend can train');
        trainee.level++;
        trainee.hpPct = 1;
        return finish({ icon: '📈', title: 'FOCUSED DRILLS', detail: `${getCharacter(trainee.defId).name} reaches level ${trainee.level} and fully recovers.` });
      }
      if (choiceId === 'battle-meditation') {
        for (const entry of this.roster) entry.hpPct = Math.min(1, entry.hpPct + 0.35);
        this.relicAtk += 0.05;
        return finish({ icon: '✨', title: 'BATTLE MEDITATION', detail: 'The roster restores 35% HP and gains +5% run-wide attack.' });
      }
      for (const entry of this.roster) entry.hpPct = 1;
      return finish({ icon: '🔥', title: 'CAMPFIRE', detail: 'Your legends rest. The whole roster is fully restored.' });
    }
    const gearCost = 120 + this.floor * 8;
    const contractCost = 90 + this.floor * 5;
    if (choiceId === 'merchant-gear') {
      if (this.gold < gearCost) throw new Error('Not enough coins for gear');
      this.gold -= gearCost;
      const item = this.rollMysteryItem();
      this.inventory.push(item.id);
      return finish({ icon: '🧰', title: 'GEAR PURCHASED', detail: `${item.name} was added to your Formation Bag.`, itemId: item.id });
    }
    if (choiceId === 'merchant-contract') {
      if (this.gold < contractCost) throw new Error('Not enough coins for contract');
      this.gold -= contractCost;
      this.spins += 2;
      return finish({ icon: '🎟️', title: 'CONTRACT SIGNED', detail: 'Two free legend pulls were added to your run.' });
    }
    const coins = 150 + this.floor * Balance.rewards.goldPerFloor * 2;
    this.gold += coins;
    this.goldEarned += coins;
    this.spins += 1;
    return finish({
      icon: '🛒', title: 'WANDERING MERCHANT',
      detail: `A trader pays well for tower relics: ${coins.toLocaleString('en-US')} coins and a free pull.`,
    });
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
      const character = getCharacter(entry.defId);
      const relics = relicCombatBonuses(this.relicIds, character, slot);
      const combinedExtra: ItemBoosts = { ...(extraBoosts ?? {}) };
      for (const [key, value] of Object.entries(relics.boosts) as Array<[keyof ItemBoosts, number]>) {
        combinedExtra[key] = (combinedExtra[key] ?? 0) + value;
      }
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
          ? effectiveItemBoosts(getShopItem(entry.heldItemId), character)
          : undefined,
        extraBoosts: Object.keys(combinedExtra).length > 0 ? combinedExtra : undefined,
        startingEnergy: relics.startingEnergy,
        lifesteal: relics.lifesteal,
      });
    }
    return specs;
  }

  /** Fold a finished battle back into the run. Returns true on victory. */
  applyBattleResult(result: BattleResult): boolean {
    this.lastBattle = result;
    const relicTotals = relicRunTotals(this.relicIds);
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
    if (relicTotals.postBattleHeal > 0) {
      for (const entry of this.roster) entry.hpPct = Math.min(1, entry.hpPct + relicTotals.postBattleHeal);
    }
    if (result.winner === 'player') {
      const R = Balance.rewards;
      const playerUnits = result.units.filter((unit) => unit.side === 'player');
      const survivors = playerUnits.filter((unit) => unit.alive).length;
      const flawless = playerUnits.length > 0 && playerUnits.every((unit) => unit.alive && unit.hpPct >= 0.75);
      const baseReward = R.battleBase + this.floor * R.battlePerFloor + survivors * R.survivorBonus + (this.currentFloor().isBoss ? R.bossBonus : 0) + (flawless ? R.flawlessBonus : 0);
      const reward = Math.round(baseReward * Balance.difficultyReward[this.difficulty] * (1 + relicTotals.goldBonus));
      this.lastBattleCoins = reward;
      this.gold += reward;
      this.goldEarned += reward;
        return true;
    }
    return false;
  }

  addRelic(id: string): boolean {
    getRelic(id);
    if (this.relicIds.includes(id)) return false;
    this.relicIds.push(id);
    return true;
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
    this.previousFloorKind = this.currentFloor().kind;
    this.floor++;
    this.selectedFloorKind = null;
    this.eventResolvedFloor = null;
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
    const unownedRelics = this.rng.shuffle(RELICS.filter((relic) => !this.relicIds.includes(relic.id)));
    const relicChoices: RewardChoice[] = unownedRelics.slice(0, boss ? 2 : 1).map((relic) => ({
      id: `run-relic-${relic.id}`,
      title: relic.name,
      desc: relic.description,
      icon: relic.icon,
      tier: relic.tier,
      category: 'power',
      apply: (run) => { run.addRelic(relic.id); },
    }));
    const power: RewardChoice[] = [
      ...relicChoices,
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
    // Elites are harder than a normal room, so they pay out like a boss.
    const elite = this.currentFloor().kind === 'elite';
    const target = boss || elite ? R.bossChoices : R.choices;

    const choices: RewardChoice[] = [];
    const used = new Set<string>();
    const takeFrom = (pool: RewardChoice[]): void => {
      const available = pool.filter((choice) => !used.has(choice.id));
      if (available.length === 0) return;
      const pick = this.rng.pick(available);
      choices.push(pick);
      used.add(pick.id);
    };
    for (const pool of categories) {
      // Every victory exposes at least one build-defining relic until the set
      // is complete; the remaining slots still vary by economy/recovery/gear.
      if (pool === power && relicChoices[0]) {
        choices.push(relicChoices[0]);
        used.add(relicChoices[0].id);
      } else {
        takeFrom(pool);
      }
    }
    const fillPool = [economy, power, gear, ...(suddenDeath ? [] : [recovery])].flat();
    while (choices.length < target && fillPool.some((choice) => !used.has(choice.id))) takeFrom(fillPool);

    return this.rng.shuffle(choices).slice(0, target);
  }
}
