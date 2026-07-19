import type { AbilityDef, CharacterDef, EffectDef, Rarity, Stats, WeaknessType } from './types';

export const WEAKNESS_LABEL: Record<WeaknessType, string> = {
  magic: 'Magic', technology: 'Technology', speed: 'Speed', power: 'Brute Force', energy: 'Energy', precision: 'Precision',
};

/**
 * Rarity reflects capability, narrative importance, and uniqueness inside the
 * character's own universe. It is deliberately not a percentile of the full roster.
 */
export const CURATED_RARITY: Readonly<Record<string, Rarity>> = {
  // DC
  superman: 'supreme', batman: 'legendary', 'wonder-woman': 'legendary', flash: 'supreme',
  'green-lantern': 'legendary', joker: 'epic', aquaman: 'epic', darkseid: 'godlike', 'harley-quinn': 'rare',
  // Anime
  goku: 'godlike', luffy: 'supreme', nami: 'rare', naruto: 'supreme', saitama: 'godlike', 'yuji-itadori': 'epic',
  // Pokémon
  mewtwo: 'supreme', charizard: 'epic', venusaur: 'rare', blastoise: 'rare', gengar: 'rare', pikachu: 'common',
  // Cinema
  godzilla: 'supreme', 'john-wick': 'epic', gandalf: 'godlike', 'indiana-jones': 'common', 'king-kong': 'legendary',
  robocop: 'epic', terminator: 'legendary', zorro: 'common',
  // Star Wars
  'darth-vader': 'supreme', chewbacca: 'common', 'luke-skywalker': 'supreme', 'princess-leia': 'epic',
  'r2-d2': 'common', yoda: 'godlike',
  // Marvel
  thor: 'supreme', 'iron-man': 'legendary', 'captain-america': 'legendary', 'black-panther': 'common',
  'doctor-strange': 'supreme', hulk: 'supreme', loki: 'legendary', 'scarlet-witch': 'supreme',
  spiderman: 'legendary', thanos: 'godlike', wolverine: 'legendary',
  // Disney
  elsa: 'legendary', ariel: 'epic', genie: 'supreme', hercules: 'legendary', hook: 'rare', mulan: 'epic',
  olaf: 'common', simba: 'common', 'tinker-bell': 'rare',
  // Mario
  bowser: 'legendary', mario: 'supreme', luigi: 'epic', peach: 'epic', daisy: 'rare', rosalina: 'legendary',
  toad: 'common', yoshi: 'common', 'king-boo': 'rare',
  // Toons / Nintendo
  sonic: 'supreme', shrek: 'common', aang: 'supreme', 'danny-phantom': 'common',
  link: 'supreme', zelda: 'legendary',
  // SpongeBob
  spongebob: 'legendary', patrick: 'epic', gary: 'common', 'mr-krabs': 'rare', 'sandy-cheeks': 'common', squidward: 'rare',
  // TMNT
  leonardo: 'legendary', raphael: 'epic', donatello: 'epic', michelangelo: 'epic',
};

const WEAKNESS_OVERRIDES: Partial<Record<string, WeaknessType>> = {
  superman: 'magic', batman: 'power', flash: 'precision', sonic: 'precision', goku: 'precision', godzilla: 'energy',
  'iron-man': 'magic', robocop: 'magic', terminator: 'magic', 'scarlet-witch': 'technology', gandalf: 'technology', 'king-kong': 'speed',
};

interface StatBand {
  hp: readonly [number, number]; atk: readonly [number, number]; def: readonly [number, number];
  spd: readonly [number, number]; crit: readonly [number, number]; critDmg: readonly [number, number];
}

const STAT_BANDS: Record<Rarity, StatBand> = {
  common:    { hp: [85000, 110000], atk: [7500, 11000], def: [28, 58], spd: [22, 44], crit: [0.06, 0.18], critDmg: [1.4, 1.65] },
  rare:      { hp: [95000, 128000], atk: [9000, 12800], def: [34, 68], spd: [27, 46], crit: [0.08, 0.21], critDmg: [1.45, 1.7] },
  epic:      { hp: [108000, 152000], atk: [10600, 14600], def: [40, 76], spd: [30, 48], crit: [0.1, 0.24], critDmg: [1.5, 1.8] },
  legendary: { hp: [124000, 178000], atk: [12200, 16600], def: [46, 84], spd: [32, 50], crit: [0.12, 0.27], critDmg: [1.55, 1.9] },
  supreme:   { hp: [142000, 208000], atk: [14200, 19200], def: [54, 92], spd: [35, 52], crit: [0.15, 0.3], critDmg: [1.6, 2] },
  godlike:   { hp: [178000, 240000], atk: [16800, 22000], def: [66, 95], spd: [38, 52], crit: [0.2, 0.32], critDmg: [1.7, 2.2] },
};

const TARGET_POWER: Record<Rarity, number> = {
  common: 58000, rare: 68000, epic: 78000, legendary: 88000, supreme: 98000, godlike: 110000,
};
const TIER_INDEX: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3, supreme: 4, godlike: 5 };
const balancedCharacters = new WeakSet<CharacterDef>();

function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function round(value: number, digits = 3): number { const n = 10 ** digits; return Math.round(value * n) / n; }

function targetWeight(effect: EffectDef): number {
  if ('target' in effect && (effect.target === 'enemy-all' || effect.target === 'ally-all')) return 1.7;
  if ('target' in effect && (effect.target === 'enemy-back' || effect.target === 'enemy-lowest')) return 1.15;
  return 1;
}

function effectPower(effect: EffectDef): number {
  const weight = targetWeight(effect);
  if (effect.kind === 'damage') return effect.mult * (effect.hits ?? 1) * weight * 3600;
  if (effect.kind === 'heal' || effect.kind === 'shield') return effect.mult * weight * 3000;
  if (effect.kind === 'status') return (2200 + (effect.power ?? 0) * 12000) * weight;
  if (effect.kind === 'buff' || effect.kind === 'debuff') return Math.abs(effect.amount) * effect.duration * weight * 1900;
  return 0;
}

/** Comparable battle power used to keep the curated tier and actual kit aligned. */
export function characterPowerScore(def: CharacterDef): number {
  const stats = def.stats;
  let score = stats.hp * 0.07 + stats.atk * 1.8 + stats.def * 130 + stats.spd * 180;
  score += stats.crit * 20000 + (stats.critDmg - 1) * 8000;
  for (const ability of def.abilities) {
    const cooldownFactor = ability.slot === 'skill' ? Math.max(0.65, 8 / (ability.cooldown ?? 8)) : ability.slot === 'ult' ? 0.7 : 1;
    score += ability.effects.reduce((sum, effect) => sum + effectPower(effect), 0) * cooldownFactor;
  }
  for (const passive of def.passives) {
    if (passive.kind === 'transform') score += (passive.atk + passive.spd + (passive.healPct ?? 0)) * 15000;
    else if (passive.kind === 'regen') score += passive.pctPerSec * 300000;
    else if (passive.kind === 'dodge') score += passive.chance * 22000;
    else if (passive.kind === 'rage') score += passive.cap * 15000;
    else score += 5000;
  }
  return score;
}

export function inferWeakness(def: CharacterDef): WeaknessType {
  const override = WEAKNESS_OVERRIDES[def.id];
  if (override) return override;
  if (def.tags.includes('robot') || def.tags.includes('sci-fi')) return 'magic';
  if (def.tags.includes('magic')) return 'technology';
  if (def.stats.spd >= 42) return 'precision';
  if (def.tags.includes('alien') || def.tags.includes('saiyan') || def.tags.includes('monster')) return 'energy';
  if (def.stats.def < 40) return 'power';
  if (def.stats.hp >= 155000 || def.stats.def >= 68) return 'speed';
  if (def.tags.includes('detective') || def.tags.includes('assassin')) return 'power';
  return 'precision';
}

export function threatTypes(def: CharacterDef): Set<WeaknessType> {
  const types = new Set<WeaknessType>();
  if (def.tags.includes('magic')) types.add('magic');
  if (def.tags.includes('robot') || def.tags.includes('sci-fi') || def.tags.includes('detective')) types.add('technology');
  if (def.stats.spd >= 40) types.add('speed');
  if (def.tags.includes('monster') || def.tags.includes('warrior') || def.stats.atk >= 14000) types.add('power');
  if (def.tags.includes('alien') || def.tags.includes('saiyan') || def.abilities.some((ability) => ['beam', 'bolt', 'nova'].includes(ability.fx))) types.add('energy');
  if (def.tags.includes('assassin') || def.tags.includes('detective') || def.stats.crit >= 0.18) types.add('precision');
  if (types.size === 0) types.add(def.stats.atk >= 12500 ? 'power' : 'precision');
  return types;
}

export function strengthTypes(def: CharacterDef): WeaknessType[] { return [...threatTypes(def)]; }
export function strengthSummary(def: CharacterDef, limit = 2): string {
  return strengthTypes(def).slice(0, limit).map((type) => WEAKNESS_LABEL[type]).join(' · ');
}
export function exploitsWeakness(attacker: CharacterDef, defender: CharacterDef): boolean {
  return defender.weakness !== undefined && threatTypes(attacker).has(defender.weakness);
}

function getAbility(def: CharacterDef, id: string): AbilityDef {
  const ability = def.abilities.find((candidate) => candidate.id === id);
  if (!ability) throw new Error(`Missing curated ability ${id} for ${def.id}`);
  return ability;
}

function setDamage(def: CharacterDef, abilityId: string, mult: number): void {
  const effect = getAbility(def, abilityId).effects.find((candidate) => candidate.kind === 'damage');
  if (effect?.kind === 'damage') effect.mult = mult;
}

/** Hand-authored corrections for the clearest old tier/kit mismatches. */
function applySignatureCorrections(def: CharacterDef): void {
  if (def.id === 'captain-america') {
    Object.assign(def.stats, { hp: 148000, atk: 13200, def: 82, spd: 36, crit: 0.16, critDmg: 1.7 } satisfies Stats);
    setDamage(def, 'ca-basic', 1.15);
    const command = getAbility(def, 'ca-skill');
    const shield = command.effects.find((effect) => effect.kind === 'shield');
    if (shield?.kind === 'shield') shield.mult = 1.15;
    if (!command.effects.some((effect) => effect.kind === 'buff')) command.effects.push({ kind: 'buff', target: 'ally-all', stat: 'def', amount: 0.16, duration: 5 });
    setDamage(def, 'ca-ult', 1.05);
    const ricochet = getAbility(def, 'ca-ult').effects.find((effect) => effect.kind === 'damage');
    if (ricochet?.kind === 'damage') ricochet.hits = 4;
  } else if (def.id === 'leonardo') {
    Object.assign(def.stats, { hp: 142000, atk: 13600, def: 70, spd: 39, crit: 0.18, critDmg: 1.75 } satisfies Stats);
    setDamage(def, 'le-basic', 0.62);
    setDamage(def, 'le-skill', 1.2);
    const commandBuff = getAbility(def, 'le-skill').effects.find((effect) => effect.kind === 'buff');
    if (commandBuff?.kind === 'buff') commandBuff.amount = 0.16;
    setDamage(def, 'le-ult', 3.25);
    const ultBuff = getAbility(def, 'le-ult').effects.find((effect) => effect.kind === 'buff');
    if (ultBuff?.kind === 'buff') ultBuff.amount = 0.16;
    if (!def.passives.some((passive) => passive.kind === 'dodge')) def.passives.push({ kind: 'dodge', chance: 0.1 });
  } else if (def.id === 'pikachu') {
    Object.assign(def.stats, { hp: 90000, atk: 9000, def: 32, spd: 40, crit: 0.12, critDmg: 1.5 } satisfies Stats);
    setDamage(def, 'pk-skill', 1.2);
    const shock = getAbility(def, 'pk-skill').effects.find((effect) => effect.kind === 'status');
    if (shock?.kind === 'status') { shock.duration = 2; shock.power = 0.08; }
    setDamage(def, 'pk-ult', 2.35);
  } else if (def.id === 'nami') {
    Object.assign(def.stats, { hp: 98000, atk: 10400, def: 36, spd: 40, crit: 0.17, critDmg: 1.6 } satisfies Stats);
    setDamage(def, 'nam-skill', 1.3);
    setDamage(def, 'nam-ult', 1.25);
  } else if (def.id === 'sandy-cheeks') {
    Object.assign(def.stats, { hp: 104000, atk: 9400, def: 52, spd: 33, crit: 0.1, critDmg: 1.5 } satisfies Stats);
    setDamage(def, 'sc-skill', 1.25);
    setDamage(def, 'sc-ult', 0.9);
    const teamSpeed = getAbility(def, 'sc-ult').effects.find((effect) => effect.kind === 'buff');
    if (teamSpeed?.kind === 'buff') teamSpeed.amount = 0.08;
    const dodge = def.passives.find((passive) => passive.kind === 'dodge');
    if (dodge?.kind === 'dodge') dodge.chance = 0.07;
  }
}

function fitStatsToTier(def: CharacterDef): void {
  const band = STAT_BANDS[def.rarity];
  def.stats.hp = Math.round(clamp(def.stats.hp, ...band.hp));
  def.stats.atk = Math.round(clamp(def.stats.atk, ...band.atk));
  def.stats.def = round(clamp(def.stats.def, ...band.def), 1);
  def.stats.spd = round(clamp(def.stats.spd, ...band.spd), 1);
  def.stats.crit = round(clamp(def.stats.crit, ...band.crit));
  def.stats.critDmg = round(clamp(def.stats.critDmg, ...band.critDmg), 2);
}

function fitMovesToTier(def: CharacterDef): void {
  const scale = clamp(TARGET_POWER[def.rarity] / characterPowerScore(def), 0.82, 1.22);
  const utilityScale = Math.sqrt(scale);
  for (const ability of def.abilities) {
    if (ability.slot === 'skill' && ability.cooldown !== undefined) {
      const tierShift = TIER_INDEX[def.rarity] <= 1 ? 1 : TIER_INDEX[def.rarity] >= 4 ? -1 : 0;
      ability.cooldown = clamp(ability.cooldown + tierShift, 5, 10);
    }
    for (const effect of ability.effects) {
      if (effect.kind === 'damage' || effect.kind === 'heal' || effect.kind === 'shield') effect.mult = round(effect.mult * scale);
      else if (effect.kind === 'status' && effect.power !== undefined) effect.power = round(effect.power * utilityScale);
      else if (effect.kind === 'buff' || effect.kind === 'debuff') effect.amount = round(effect.amount * utilityScale);
    }
  }
}

/** Apply curated universe-relative rarity and make combat numbers support it. */
export function applyCharacterRules(characters: CharacterDef[]): void {
  for (const character of characters) {
    if (balancedCharacters.has(character)) continue;
    character.rarity = CURATED_RARITY[character.id] ?? character.rarity;
    applySignatureCorrections(character);
    fitStatsToTier(character);
    fitMovesToTier(character);
    character.weakness = inferWeakness(character);
    balancedCharacters.add(character);
  }
}