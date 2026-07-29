/**
 * Art pipeline: drop PNGs into src/assets/**, then run `npm run assets`.
 *
 * Every PNG is converted to a right-sized WebP beside it, which is what the
 * game actually bundles (see src/ui/portraits.ts). The PNGs stay put as
 * untouched masters — they are never shipped. Conversion is incremental, so
 * re-running only processes art that is new or has changed.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets');

// maxWidth ≈ 2× the largest on-screen size, for retina headroom.
const RULES = {
  portraits: { maxWidth: 552, quality: 82 },
  battlefields: { maxWidth: 1920, quality: 80 },
  backgrounds: { maxWidth: 1920, quality: 82 },
  items: { maxWidth: 384, quality: 84 },
  franchises: { maxWidth: 384, quality: 86 },
  rarities: { maxWidth: 320, quality: 86 },
};

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.png$/i.test(entry.name)) out.push(full);
  }
  return out;
}

const force = process.argv.includes('--force');
let converted = 0;
let skipped = 0;
let before = 0;
let after = 0;

for (const [folder, rule] of Object.entries(RULES)) {
  for (const file of walk(path.join(ROOT, folder))) {
    const outPath = file.replace(/\.png$/i, '.webp');
    const fresh = fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs >= fs.statSync(file).mtimeMs;
    if (fresh && !force) {
      skipped++;
      continue;
    }
    const src = sharp(file);
    const meta = await src.metadata();
    await src
      .resize({ width: Math.min(meta.width ?? rule.maxWidth, rule.maxWidth), withoutEnlargement: true })
      .webp({ quality: rule.quality, effort: 5 })
      .toFile(outPath);
    before += fs.statSync(file).size;
    after += fs.statSync(outPath).size;
    converted++;
  }
}

const mb = (bytes) => (bytes / 1048576).toFixed(1);
if (converted === 0) {
  console.log(`Assets already up to date (${skipped} files).`);
} else {
  console.log(
    `Converted ${converted} file(s) — ${mb(before)} MB → ${mb(after)} MB ` +
    `(${Math.round((1 - after / before) * 100)}% smaller). ${skipped} already current.`,
  );
}

// Warn about orphans: a WebP whose master PNG is gone would still ship.
for (const folder of Object.keys(RULES)) {
  const dir = path.join(ROOT, folder);
  if (!fs.existsSync(dir)) continue;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.webp$/i.test(entry.name) && !fs.existsSync(full.replace(/\.webp$/i, '.png'))) {
        console.warn(`  orphan (no source PNG): ${path.relative(ROOT, full)}`);
      }
    }
  }
}
