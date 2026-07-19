/**
 * Artifact equipment + potions. Every artifact has drop-in art at
 * src/assets/items/<id>.png and can be held by ANYONE — but legends from the
 * artifact's home universe RESONATE with it: boosts are multiplied and the
 * artifact grants an extra battle skill (the 'item' action in combat).
 */

import type { AbilityDef, CharacterDef } from './types';

export interface ItemBoosts {
  hp?: number;
  atk?: number;
  def?: number;
  spd?: number;
  crit?: number;
  energyGain?: number;
}

export interface ItemAffinity {
  /** Franchise ids that resonate with this artifact. */
  franchises: string[];
  /** Optional character ids that resonate regardless of their broader recruit category. */
  characterIds?: string[];
  /** Boost multiplier while resonant. */
  multiplier: number;
  description: string;
  /** Resonant holders repeat their actions this many extra times. */
  extraActions?: number;
  /** Resonant holders gain this as an extra battle skill (the ITEM action). */
  ability?: AbilityDef;
}

export type ItemTier = 'common' | 'rare' | 'epic' | 'legendary' | 'supreme' | 'godlike';

export interface ShopItemDef {
  id: string;
  name: string;
  icon: string; // emoji fallback when no art exists
  price: number;
  kind: 'potion' | 'equipment';
  tier: ItemTier;
  description: string;
  healPct?: number;
  healMode?: 'all' | 'lowest';
  boosts?: ItemBoosts;
  affinity?: ItemAffinity;
  minFloor?: number;
}

export const ITEM_TIER_COLOR: Record<ItemTier, number> = {
  common: 0x9aa4b8,
  rare: 0x35a8ff,
  epic: 0xb04aff,
  legendary: 0xffb02e,
  supreme: 0xc51f3a,
  godlike: 0xff4fd8,
};

export const MYSTERY_ITEM_WEIGHTS: Record<ItemTier, number> = {
  common: 54,
  rare: 25,
  epic: 15,
  legendary: 3,
  supreme: 2,
  godlike: 1,
};

export const ITEM_TIER_ORDER: ItemTier[] = ['common', 'rare', 'epic', 'legendary', 'supreme', 'godlike'];

const BOOST_LABEL: Record<keyof ItemBoosts, string> = {
  hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD', crit: 'CRIT', energyGain: 'ENERGY',
};

export function itemBoostSummary(item: ShopItemDef): string {
  return (Object.entries(item.boosts ?? {}) as Array<[keyof ItemBoosts, number]>)
    .map(([stat, value]) => `+${Math.round(value * 100)}% ${BOOST_LABEL[stat]}`)
    .join(' · ');
}

export function itemPowerScore(item: ShopItemDef): number {
  const boost = item.boosts ?? {};
  let score = (boost.hp ?? 0) * 90 + (boost.atk ?? 0) * 110 + (boost.def ?? 0) * 80
    + (boost.spd ?? 0) * 130 + (boost.crit ?? 0) * 150 + (boost.energyGain ?? 0) * 100;
  if (item.affinity) {
    score *= 1 + (item.affinity.multiplier - 1) * 0.35;
    score += (item.affinity.extraActions ?? 0) * 16;
    if (item.affinity.ability) score += 8;
  }
  return Math.round(score * 10);
}
/** Coin price for each targeted Store spin. */
export const ITEM_SPIN_PRICES: Record<ItemTier, number> = {
  common: 60,
  rare: 110,
  epic: 180,
  legendary: 280,
  supreme: 420,
  godlike: 600,
};

/**
 * Every Store spin can award every equipment tier. Paying for a stronger spin
 * moves the probability peak upward instead of guaranteeing the chosen tier.
 */
export const ITEM_SPIN_WEIGHTS: Record<ItemTier, Record<ItemTier, number>> = {
  common:    { common: 70, rare: 20, epic: 7, legendary: 2, supreme: 0.8, godlike: 0.2 },
  rare:      { common: 30, rare: 50, epic: 15, legendary: 3.5, supreme: 1, godlike: 0.5 },
  epic:      { common: 14, rare: 24, epic: 48, legendary: 10, supreme: 3, godlike: 1 },
  legendary: { common: 7, rare: 12, epic: 22, legendary: 43, supreme: 12, godlike: 4 },
  supreme:   { common: 4, rare: 7, epic: 12, legendary: 24, supreme: 42, godlike: 11 },
  godlike:   { common: 2, rare: 4, epic: 7, legendary: 14, supreme: 23, godlike: 50 },
};

const skill = (a: Omit<AbilityDef, 'slot'>): AbilityDef => ({ ...a, slot: 'skill' });

export const SHOP_ITEMS: ShopItemDef[] = [
  // ── potions (consumed on purchase, no art needed) ─────────────────────
  { id: 'healing-potion', name: 'Party Potion', icon: '🧪', price: 55, kind: 'potion', tier: 'common', healPct: 0.3, healMode: 'all', description: 'Restore 30% HP to every legend.' },
  { id: 'greater-potion', name: 'Greater Potion', icon: '⚗️', price: 105, kind: 'potion', tier: 'rare', healPct: 0.6, healMode: 'all', description: 'Restore 60% HP to every legend.' },
  { id: 'phoenix-elixir', name: 'Phoenix Elixir', icon: '🔥', price: 175, kind: 'potion', tier: 'epic', healPct: 1, healMode: 'lowest', minFloor: 3, description: 'Fully restore the most injured legend.' },

  // ── artifacts (ids match src/assets/items/<id>.png) ───────────────────
  {
    id: 'firepower',
    name: 'Fire Flower',
    icon: '🌸',
    price: 120,
    kind: 'equipment',
    tier: 'common',
    boosts: { atk: 0.10 },
    affinity: {
      franchises: ['mario', 'nintendo'],
      multiplier: 1.75,
      description: 'Mushroom Kingdom legends burn brighter and learn Fireball Barrage.',
      ability: skill({
        id: 'item-fire-flower',
        name: 'Fireball Barrage',
        cooldown: 8,
        effects: [
          { kind: 'damage', target: 'enemy-random', mult: 0.55, hits: 3 },
          { kind: 'status', target: 'enemy-random', status: 'burn', duration: 3, power: 0.15 },
        ],
        fx: 'bolt',
        color: 0xff7a2e,
      }),
    },
    description: '+10% ATK while held.',
  },
  {
    id: 'pokeball',
    name: 'Poké Ball',
    icon: '⚪',
    price: 115,
    kind: 'equipment',
    tier: 'common',
    boosts: { hp: 0.06, def: 0.06 },
    affinity: {
      franchises: ['pokemon'],
      multiplier: 1.75,
      description: "Pokémon trust their trainer and learn Trainer's Command.",
      ability: skill({
        id: 'item-pokeball',
        name: "Trainer's Command",
        cooldown: 8,
        effects: [
          { kind: 'damage', target: 'enemy-front', mult: 1.5 },
          { kind: 'buff', target: 'self', stat: 'crit', amount: 0.1, duration: 4 },
        ],
        fx: 'burst',
        color: 0xff4a5a,
      }),
    },
    description: '+6% HP and +6% DEF while held.',
  },
  {
    id: 'caps-shield',
    name: "Cap's Shield",
    icon: '🛡️',
    price: 150,
    kind: 'equipment',
    tier: 'rare',
    boosts: { def: 0.12, hp: 0.08 },
    affinity: {
      franchises: ['marvel'],
      multiplier: 1.5,
      description: 'Marvel heroes wield it true and learn Shield Ricochet.',
      ability: skill({
        id: 'item-caps-shield',
        name: 'Shield Ricochet',
        cooldown: 8,
        effects: [
          { kind: 'damage', target: 'enemy-random', mult: 0.75, hits: 2 },
          { kind: 'shield', target: 'self', mult: 0.8, duration: 5 },
        ],
        fx: 'burst',
        color: 0x4a8cff,
      }),
    },
    description: '+12% DEF and +8% HP while held.',
  },
  {
    id: 'kryptonite',
    name: 'Kryptonite Shard',
    icon: '💚',
    price: 160,
    kind: 'equipment',
    tier: 'rare',
    boosts: { atk: 0.08, crit: 0.05 },
    affinity: {
      franchises: ['dc'],
      multiplier: 1.5,
      description: 'DC legends know its power and learn Kryptonite Edge.',
      ability: skill({
        id: 'item-kryptonite',
        name: 'Kryptonite Edge',
        cooldown: 9,
        effects: [{ kind: 'damage', target: 'enemy-lowest', mult: 1.6, executeBelow: 0.35 }],
        fx: 'bolt',
        color: 0x54ff6e,
      }),
    },
    description: '+8% ATK and +5% crit while held.',
    minFloor: 2,
  },
  {
    id: 'two-face-coin',
    name: "Two-Face's Coin",
    icon: '🪙',
    price: 150,
    kind: 'equipment',
    tier: 'rare',
    boosts: { crit: 0.12 },
    affinity: {
      franchises: ['dc'],
      multiplier: 1.5,
      description: 'Gotham souls trust the flip and learn Double or Nothing.',
      ability: skill({
        id: 'item-two-face-coin',
        name: 'Double or Nothing',
        cooldown: 9,
        effects: [{ kind: 'damage', target: 'enemy-random', mult: 2.3 }],
        fx: 'burst',
        color: 0xcfcfcf,
      }),
    },
    description: '+12% critical chance while held.',
  },
  {
    id: 'super-star',
    name: 'Super Star',
    icon: '⭐',
    price: 230,
    kind: 'equipment',
    tier: 'epic',
    boosts: { spd: 0.11, hp: 0.07 },
    affinity: {
      franchises: ['mario', 'nintendo'],
      multiplier: 1.75,
      description: 'Mushroom Kingdom legends turn invincible and learn Starman Rush.',
      ability: skill({
        id: 'item-super-star',
        name: 'Starman Rush',
        cooldown: 10,
        effects: [
          { kind: 'shield', target: 'self', mult: 1.6, duration: 5 },
          { kind: 'buff', target: 'self', stat: 'atk', amount: 0.25, duration: 4 },
        ],
        fx: 'glow',
        color: 0xffe345,
      }),
    },
    description: '+11% SPD and +7% HP while held.',
    minFloor: 3,
  },
  {
    id: 'arc-reactor',
    name: 'Arc Reactor',
    icon: '🔵',
    price: 240,
    kind: 'equipment',
    tier: 'epic',
    boosts: { energyGain: 0.18, atk: 0.08 },
    affinity: {
      franchises: ['marvel'],
      multiplier: 1.5,
      description: 'Marvel heroes sync with the core and learn Unibeam Pulse.',
      ability: skill({
        id: 'item-arc-reactor',
        name: 'Unibeam Pulse',
        cooldown: 9,
        effects: [{ kind: 'damage', target: 'enemy-front', mult: 1.9 }],
        fx: 'beam',
        color: 0x7fd8ff,
      }),
    },
    description: '+18% energy gain and +8% ATK while held.',
    minFloor: 3,
  },
  {
    id: 'green-lantern-ring',
    name: 'Lantern Ring',
    icon: '💍',
    price: 220,
    kind: 'equipment',
    tier: 'epic',
    boosts: { hp: 0.12, atk: 0.08 },
    affinity: {
      franchises: ['dc'],
      multiplier: 1.5,
      description: 'Great willpower answers DC legends, who learn Emerald Construct.',
      ability: skill({
        id: 'item-lantern-ring',
        name: 'Emerald Construct',
        cooldown: 10,
        effects: [{ kind: 'shield', target: 'ally-all', mult: 0.9, duration: 6 }],
        fx: 'glow',
        color: 0x54c437,
      }),
    },
    description: '+12% HP and +8% ATK while held.',
    minFloor: 3,
  },
  {
    id: 'dragon-ball',
    name: 'Dragon Ball',
    icon: '🐉',
    price: 250,
    kind: 'equipment',
    tier: 'epic',
    boosts: { hp: 0.12, energyGain: 0.12 },
    affinity: {
      franchises: [],
      characterIds: ['goku'],
      multiplier: 1.75,
      description: "Z-fighters can summon its power and learn Shenron's Blessing.",
      ability: skill({
        id: 'item-dragon-ball',
        name: "Shenron's Blessing",
        cooldown: 12,
        effects: [
          { kind: 'heal', target: 'ally-all', mult: 1.25 },
          { kind: 'buff', target: 'ally-all', stat: 'atk', amount: 0.08, duration: 4 },
        ],
        fx: 'nova',
        color: 0xffa022,
      }),
    },
    description: '+12% HP and +12% energy gain while held.',
    minFloor: 4,
  },
  {
    id: 'mjolnir',
    name: 'Mjolnir',
    icon: '🔨',
    price: 380,
    kind: 'equipment',
    tier: 'legendary',
    boosts: { atk: 0.18, hp: 0.10 },
    affinity: {
      franchises: ['marvel'],
      multiplier: 1.5,
      description: 'The worthy of Marvel command the storm and learn Summon Thunder.',
      ability: skill({
        id: 'item-mjolnir',
        name: 'Summon Thunder',
        cooldown: 11,
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 1.1 },
          { kind: 'status', target: 'enemy-all', status: 'shock', duration: 2.5, power: 0.1 },
        ],
        fx: 'bolt',
        color: 0xbde4ff,
      }),
    },
    description: '+18% ATK and +10% HP while held.',
    minFloor: 6,
  },
  {
    id: 'chaos-emerald',
    name: 'Chaos Emerald',
    icon: '💎',
    price: 460,
    kind: 'equipment',
    tier: 'supreme',
    boosts: { spd: 0.18, crit: 0.10 },
    affinity: {
      franchises: [],
      characterIds: ['sonic'],
      multiplier: 1.75,
      extraActions: 1,
      description: "Sonic's world bends time: double actions, plus Chaos Control.",
      ability: skill({
        id: 'item-chaos-emerald',
        name: 'Chaos Control',
        cooldown: 9,
        effects: [
          { kind: 'buff', target: 'self', stat: 'spd', amount: 0.3, duration: 5 },
          { kind: 'damage', target: 'enemy-front', mult: 1.2 },
        ],
        fx: 'glow',
        color: 0x52f3ff,
      }),
    },
    description: '+18% SPD and +10% crit while held.',
    minFloor: 8,
  },
  {
    id: 'infinity-stone',
    name: 'Infinity Stone',
    icon: '🌌',
    price: 650,
    kind: 'equipment',
    tier: 'godlike',
    boosts: { hp: 0.12, atk: 0.12, def: 0.12, spd: 0.12, crit: 0.12 },
    affinity: {
      franchises: ['marvel'],
      multiplier: 1.5,
      description: 'Marvel titans grasp its truth and learn Reality Fracture.',
      ability: skill({
        id: 'item-infinity-stone',
        name: 'Reality Fracture',
        cooldown: 12,
        effects: [
          { kind: 'damage', target: 'enemy-all', mult: 1.35 },
          { kind: 'debuff', target: 'enemy-all', stat: 'atk', amount: 0.12, duration: 4 },
        ],
        fx: 'nova',
        color: 0xff4fd8,
      }),
    },
    description: '+12% to every combat stat while held.',
    minFloor: 12,
  },
];

export function matchesItemAffinity(def: CharacterDef, item: ShopItemDef): boolean {
  return item.affinity !== undefined
    && (item.affinity.franchises.includes(def.franchise) || item.affinity.characterIds?.includes(def.id) === true);
}

export function effectiveItemBoosts(item: ShopItemDef, def: CharacterDef): ItemBoosts {
  const multiplier = matchesItemAffinity(def, item) ? item.affinity!.multiplier : 1;
  const result: ItemBoosts = {};
  for (const key of ['hp', 'atk', 'def', 'spd', 'crit', 'energyGain'] as const) {
    const value = item.boosts?.[key];
    if (value !== undefined) result[key] = value * multiplier;
  }
  return result;
}

export function itemExtraActions(item: ShopItemDef, def: CharacterDef): number {
  return matchesItemAffinity(def, item) ? item.affinity?.extraActions ?? 0 : 0;
}

/** The extra battle skill this item grants — only while resonant. */
export function itemGrantedAbility(item: ShopItemDef, def: CharacterDef): AbilityDef | undefined {
  return matchesItemAffinity(def, item) ? item.affinity?.ability : undefined;
}

export function itemBattleSummary(item: ShopItemDef, def: CharacterDef): string {
  if (!item.affinity) return item.description;
  const active = matchesItemAffinity(def, item);
  return active
    ? `${item.description} RESONANT: ${item.affinity.description}`
    : `${item.description} Resonance: ${item.affinity.description}`;
}

export function getShopItem(id: string): ShopItemDef {
  const item = SHOP_ITEMS.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown shop item: ${id}`);
  return item;
}
