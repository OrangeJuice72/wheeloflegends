/** Validate newly dropped character, item, rarity, franchise, and arena content. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BATTLEFIELDS } from '../src/data/battlefields';
import { BOSS_MECHANICS } from '../src/data/bosses';
import { CHARACTERS } from '../src/data/characters';
import { FRANCHISES } from '../src/data/franchises';
import { SHOP_ITEMS } from '../src/data/items';
import { characterPowerScore, RARITY_POWER_BUDGET, rarityBudgetStatus } from '../src/data/rarityBudget';
import { RELICS } from '../src/data/relics';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'src', 'assets');
const errors: string[] = [];
const warnings: string[] = [];

const duplicateValues = (values: readonly string[]): string[] =>
  [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
const exists = (...parts: string[]): boolean => fs.existsSync(path.join(ASSETS, ...parts));
const assetIds = (folder: string): string[] => {
  const root = path.join(ASSETS, folder);
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.webp$/i.test(entry.name)) files.push(path.basename(entry.name, path.extname(entry.name)));
    }
  };
  walk(root);
  return files;
};

for (const id of duplicateValues(CHARACTERS.map((character) => character.id))) errors.push(`Duplicate character id: ${id}`);
for (const id of duplicateValues(CHARACTERS.flatMap((character) => character.abilities.map((ability) => ability.id)))) errors.push(`Duplicate ability id: ${id}`);
for (const character of CHARACTERS) {
  if (!FRANCHISES[character.franchise]) errors.push(`${character.id}: unknown franchise ${character.franchise}`);
  if (!character.weakness) errors.push(`${character.id}: missing weakness`);
  const slots = character.abilities.map((ability) => ability.slot).sort().join(',');
  if (slots !== 'basic,skill,ult') errors.push(`${character.id}: needs exactly one basic, skill, and ult (found ${slots})`);
  if (Object.values(character.stats).some((value) => !Number.isFinite(value) || value <= 0)) errors.push(`${character.id}: stats must be finite and positive`);
  if (!exists('portraits', character.franchise, `${character.id}.webp`) && !exists('portraits', `${character.id}.webp`)) {
    errors.push(`${character.id}: missing WebP portrait in its franchise folder`);
  }
  const budgetStatus = rarityBudgetStatus(character);
  if (budgetStatus !== 'within') {
    const score = characterPowerScore(character);
    const budget = RARITY_POWER_BUDGET[character.rarity];
    warnings.push(`${character.id}: power ${score} is ${budgetStatus} for ${character.rarity} (${budget.min}–${budget.max})`);
  }
}

const characterIds = new Set(CHARACTERS.map((character) => character.id));
for (const id of assetIds('portraits')) if (!characterIds.has(id)) warnings.push(`Portrait has no character definition: ${id}`);

for (const id of duplicateValues(SHOP_ITEMS.map((item) => item.id))) errors.push(`Duplicate item id: ${id}`);
for (const item of SHOP_ITEMS) {
  if (item.kind === 'equipment' && !exists('items', `${item.id}.webp`)) errors.push(`${item.id}: missing equipment WebP`);
  if (item.kind === 'equipment' && !item.boosts) errors.push(`${item.id}: equipment has no battle boosts`);
}
const itemIds = new Set(SHOP_ITEMS.map((item) => item.id));
for (const id of assetIds('items')) if (!itemIds.has(id)) warnings.push(`Item art has no item definition: ${id}`);

for (const id of duplicateValues(RELICS.map((relic) => relic.id))) errors.push(`Duplicate relic id: ${id}`);
for (const mechanic of BOSS_MECHANICS) {
  if (!characterIds.has(mechanic.characterId)) errors.push(`Boss mechanic references unknown character: ${mechanic.characterId}`);
  if (mechanic.phases.length < 2) warnings.push(`${mechanic.characterId}: boss has fewer than two phases`);
}

for (const franchise of Object.values(FRANCHISES)) {
  if (!exists('franchises', `${franchise.id}.webp`)) errors.push(`${franchise.id}: missing franchise logo WebP`);
}
for (const rarity of Object.keys(RARITY_POWER_BUDGET)) {
  if (!exists('rarities', `${rarity}.webp`)) errors.push(`${rarity}: missing rarity art WebP`);
}

for (const battlefield of BATTLEFIELDS) {
  const pngPath = path.join(ASSETS, 'battlefields', `${battlefield.texture}.png`);
  const webpPath = path.join(ASSETS, 'battlefields', `${battlefield.texture}.webp`);
  if (!fs.existsSync(webpPath)) {
    errors.push(`${battlefield.id}: missing battlefield WebP`);
    continue;
  }
  if (!fs.existsSync(pngPath)) {
    warnings.push(`${battlefield.id}: missing editable PNG master`);
    continue;
  }
  const meta = await sharp(pngPath).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 1280 || height < 720) warnings.push(`${battlefield.id}: arena master is only ${width}×${height}`);
  if (height > 0 && Math.abs(width / height - 16 / 9) > 0.025) warnings.push(`${battlefield.id}: arena master is not 16:9 (${width}×${height})`);
}

console.log('# Content Validation\n');
console.log(`- ${CHARACTERS.length} characters`);
console.log(`- ${SHOP_ITEMS.filter((item) => item.kind === 'equipment').length} equipment items`);
console.log(`- ${RELICS.length} run relics`);
console.log(`- ${BATTLEFIELDS.length} configured battlefields`);
console.log(`- ${errors.length} errors · ${warnings.length} warnings`);
if (errors.length) {
  console.log('\n## Errors');
  errors.forEach((message) => console.log(`- ${message}`));
}
if (warnings.length) {
  console.log('\n## Warnings');
  warnings.forEach((message) => console.log(`- ${message}`));
}
if (errors.length) process.exitCode = 1;
