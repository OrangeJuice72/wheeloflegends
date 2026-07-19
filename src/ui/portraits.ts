/**
 * Character portraits. Two tiers:
 *  1. Image portraits — drop a PNG at src/assets/portraits/<characterId>.png
 *     and it is bundled + used automatically (the path to shipped painted art).
 *  2. Procedural emblem portraits — hand-built vector crests per character with
 *     layered lighting, used whenever no image exists. Every character has one.
 */

import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { CharacterDef } from '../data/types';
import { mix, Palette } from './theme';
import { glowTexture } from './fx/textures';

// ── image override pipeline ───────────────────────────────────────────────
// Drop-in art folders (filename = id, bundled + used automatically):
//   src/assets/portraits/<characterId>.png   card portrait windows
//   src/assets/franchises/<franchiseId>.png  slot reel 1 (universe logos)
//   src/assets/rarities/<rarity>.png         shared rarity badges across the UI
function collectUrls(globbed: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [path, url] of Object.entries(globbed)) {
    map.set(path.split('/').pop()!.replace(/\.(png|jpg|jpeg|webp)$/i, ''), url);
  }
  return map;
}

const portraitUrls = collectUrls(
  import.meta.glob('../assets/portraits/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
);
const franchiseUrls = collectUrls(
  import.meta.glob('../assets/franchises/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
);
const rarityUrls = collectUrls(
  import.meta.glob('../assets/rarities/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
);
const backgroundUrls = collectUrls(
  import.meta.glob('../assets/backgrounds/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
);
const battlefieldUrls = collectUrls(
  import.meta.glob('../assets/battlefields/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
);
const itemUrls = collectUrls(
  import.meta.glob('../assets/items/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
);

const textureById = new Map<string, Texture>();
const franchiseTexById = new Map<string, Texture>();
const rarityTexById = new Map<string, Texture>();
const backgroundTexById = new Map<string, Texture>();
const battlefieldTexById = new Map<string, Texture>();
const itemTexById = new Map<string, Texture>();

async function loadInto(urls: Map<string, string>, store: Map<string, Texture>): Promise<void> {
  for (const [id, url] of urls) {
    try {
      store.set(id, await Assets.load<Texture>(url));
    } catch {
      // Missing/corrupt art falls back to the procedural rendering.
    }
  }
}

/** Call once at boot; resolves instantly when no art has been dropped in. */
export async function preloadPortraits(): Promise<void> {
  await loadInto(portraitUrls, textureById);
  await loadInto(franchiseUrls, franchiseTexById);
  await loadInto(rarityUrls, rarityTexById);
  await loadInto(backgroundUrls, backgroundTexById);
  await loadInto(battlefieldUrls, battlefieldTexById);
  await loadInto(itemUrls, itemTexById);
}

export function portraitTexture(characterId: string): Texture | undefined {
  return textureById.get(characterId);
}
export function franchiseTexture(franchiseId: string): Texture | undefined {
  return franchiseTexById.get(franchiseId);
}
export function rarityTexture(rarity: string): Texture | undefined {
  return rarityTexById.get(rarity);
}
export function backgroundTexture(name: string): Texture | undefined {
  return backgroundTexById.get(name);
}
export function battlefieldTexture(name: string): Texture | undefined {
  return battlefieldTexById.get(name);
}
export function battlefieldTextureIds(): string[] {
  return [...battlefieldTexById.keys()];
}
export function itemTexture(itemId: string): Texture | undefined {
  return itemTexById.get(itemId);
}

// ── small drawing helpers ─────────────────────────────────────────────────
function starPoints(cx: number, cy: number, outer: number, inner: number, points: number, rot = -Math.PI / 2): number[] {
  const pts: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

function glyphText(text: string, size: number, color: number, family = 'Georgia, serif'): Text {
  const t = new Text({ text, style: { fontFamily: family, fontSize: size, fontWeight: 'bold', fill: color } });
  t.anchor.set(0.5);
  return t;
}

// ── per-character emblems (drawn in a ~100×100 box centered on 0,0) ───────
type EmblemFn = (def: CharacterDef) => Container;

const EMBLEMS: Record<string, EmblemFn> = {
  superman: () => {
    const c = new Container();
    const g = new Graphics();
    g.poly([0, -40, 38, -14, 22, 22, 0, 40, -22, 22, -38, -14]).fill(0xf5c542).stroke({ color: 0xc61f2e, width: 5 });
    c.addChild(g, glyphText('S', 46, 0xc61f2e));
    return c;
  },
  batman: () => {
    const c = new Container();
    const oval = new Graphics().ellipse(0, 0, 46, 30).fill(0xf5c542).stroke({ color: 0x14161f, width: 3 });
    const bat = new Graphics()
      .poly([-40, 0, -26, -10, -16, -5, -8, -16, -3, -7, 3, -7, 8, -16, 16, -5, 26, -10, 40, 0, 26, 8, 12, 5, 0, 17, -12, 5, -26, 8])
      .fill(0x14161f);
    c.addChild(oval, bat);
    return c;
  },
  'wonder-woman': () => {
    const c = new Container();
    const g = new Graphics();
    g.poly(starPoints(0, -22, 13, 5.5, 5)).fill(0xffd23a);
    g.moveTo(-36, -4).lineTo(-18, 24).lineTo(0, -4).lineTo(18, 24).lineTo(36, -4).stroke({ color: 0xffd23a, width: 8, join: 'round', cap: 'round' });
    g.moveTo(-30, 14).lineTo(-18, 34).lineTo(0, 14).lineTo(18, 34).lineTo(30, 14).stroke({ color: 0xd8a012, width: 6, join: 'round', cap: 'round' });
    c.addChild(g);
    return c;
  },
  goku: () => {
    const c = new Container();
    const g = new Graphics();
    g.circle(0, 0, 42).fill(0xe8621a).stroke({ color: 0x8a3208, width: 4 });
    g.circle(0, 0, 32).fill(0xfff2dd);
    c.addChild(g, glyphText('悟', 40, 0x232a4a, '"Segoe UI", "Yu Gothic", sans-serif'));
    return c;
  },
  'darth-vader': () => {
    const c = new Container();
    const blade = new Container();
    const glow = new Sprite(glowTexture());
    glow.anchor.set(0.5);
    glow.tint = 0xff2222;
    glow.width = 110;
    glow.height = 34;
    const core = new Graphics().roundRect(-44, -3.5, 78, 7, 3.5).fill(0xffdddd);
    const hilt = new Graphics()
      .roundRect(34, -6, 26, 12, 3)
      .fill(0x9aa4b8)
      .rect(38, -6, 3, 12)
      .fill(0x2a2f45)
      .rect(46, -6, 3, 12)
      .fill(0x2a2f45);
    blade.addChild(glow, core, hilt);
    blade.rotation = -Math.PI / 4;
    c.addChild(blade);
    return c;
  },
  thor: () => {
    const c = new Container();
    const g = new Graphics();
    g.poly([-6, -34, 10, -20, 2, -16, 12, 0, -4, -12, 2, 24]).stroke({ color: 0xbde4ff, width: 4, join: 'round' });
    g.roundRect(-30, -26, 60, 30, 5).fill(0x8a92a6).stroke({ color: 0x565e75, width: 3 });
    g.roundRect(-30, -26, 60, 10, 5).fill(0xb8c2d8);
    g.roundRect(-5, 4, 10, 34, 4).fill(0x6b4a2a).stroke({ color: 0x4a3018, width: 2 });
    g.roundRect(-5, 28, 10, 8, 3).fill(0x9aa4b8);
    c.addChild(g);
    return c;
  },
  godzilla: () => {
    const c = new Container();
    const g = new Graphics();
    g.poly([-44, 30, -34, 6, -26, 30, -18, -8, -8, 30, 2, -24, 14, 30, 24, -10, 34, 30, 44, 8, 48, 30])
      .fill(0xbdf6ec)
      .stroke({ color: 0x2ee8ff, width: 3 });
    c.addChild(g);
    return c;
  },
  elsa: () => {
    const c = new Container();
    const g = new Graphics();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      g.moveTo(0, 0).lineTo(dx * 40, dy * 40);
      for (const t of [0.55, 0.78]) {
        const bx = dx * 40 * t;
        const by = dy * 40 * t;
        const b1 = a + Math.PI / 5;
        const b2 = a - Math.PI / 5;
        g.moveTo(bx, by).lineTo(bx + Math.cos(b1) * 10, by + Math.sin(b1) * 10);
        g.moveTo(bx, by).lineTo(bx + Math.cos(b2) * 10, by + Math.sin(b2) * 10);
      }
    }
    g.stroke({ color: 0xdff6ff, width: 4, cap: 'round' });
    g.circle(0, 0, 6).fill(0xffffff);
    c.addChild(g);
    return c;
  },
  'john-wick': () => {
    const c = new Container();
    const g = new Graphics();
    g.circle(0, 0, 34).stroke({ color: 0xe8e8e8, width: 4 });
    for (const [x1, y1, x2, y2] of [
      [0, -44, 0, -26],
      [0, 26, 0, 44],
      [-44, 0, -26, 0],
      [26, 0, 44, 0],
    ] as const) {
      g.moveTo(x1, y1).lineTo(x2, y2);
    }
    g.stroke({ color: 0xe8e8e8, width: 4, cap: 'round' });
    g.circle(0, 0, 5).fill(0xff4a5a);
    g.circle(14, -10, 2.5).fill(0xe8e8e8);
    g.circle(-8, 14, 2.5).fill(0xe8e8e8);
    c.addChild(g);
    return c;
  },
  'iron-man': () => {
    const c = new Container();
    const halo = new Sprite(glowTexture());
    halo.anchor.set(0.5);
    halo.tint = 0x7fd8ff;
    halo.scale.set(0.62);
    const g = new Graphics();
    g.circle(0, 0, 36).stroke({ color: 0x9fe8ff, width: 5 });
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI * 2) / 10;
      g.moveTo(Math.cos(a) * 24, Math.sin(a) * 24).lineTo(Math.cos(a) * 31, Math.sin(a) * 31);
    }
    g.stroke({ color: 0x9fe8ff, width: 4 });
    g.poly([0, -14, 13, 9, -13, 9]).fill(0xe8fbff);
    c.addChild(halo, g);
    return c;
  },
  bowser: () => {
    const c = new Container();
    const g = new Graphics();
    g.moveTo(-38, 18).arc(0, 18, 38, Math.PI, 0).lineTo(38, 18).fill(0x54c437).stroke({ color: 0xffe9c8, width: 4 });
    for (const [x, y] of [
      [-24, -12],
      [0, -22],
      [24, -12],
    ] as const) {
      g.poly([x - 9, y + 7, x, y - 14, x + 9, y + 7]).fill(0xffe9c8).stroke({ color: 0xc88a2e, width: 2 });
    }
    g.roundRect(-42, 16, 84, 10, 5).fill(0x3d8a26);
    c.addChild(g);
    return c;
  },
  pikachu: () => {
    const c = new Container();
    const g = new Graphics()
      .poly([-6, -42, 16, -42, 4, -8, 24, -8, -12, 44, -2, 2, -22, 2])
      .fill(0xffe345)
      .stroke({ color: 0xb8860b, width: 3 });
    c.addChild(g);
    return c;
  },
  sonic: () => {
    const c = new Container();
    const g = new Graphics();
    for (let i = 0; i < 3; i++) {
      g.moveTo(-14 - i * 12, -18 + i * 4).arc(-14 - i * 12, 0, 18 - i * 4, -Math.PI / 2, Math.PI / 2, false);
    }
    g.stroke({ color: 0x6fb8ff, width: 5, cap: 'round' });
    g.circle(16, 0, 18).fill(0x2456c9).stroke({ color: 0x35c8ff, width: 3 });
    g.poly([8, -6, 30, -12, 26, -2]).fill(0x123a9e);
    c.addChild(g);
    return c;
  },
  'captain-america': () => {
    const c = new Container();
    const g = new Graphics();
    g.circle(0, 0, 40).fill(0xd23a3a);
    g.circle(0, 0, 30).fill(0xf0f0f0);
    g.circle(0, 0, 20).fill(0xd23a3a);
    g.circle(0, 0, 13).fill(0x1c3f8f);
    g.poly(starPoints(0, 0, 11, 4.5, 5)).fill(0xffffff);
    c.addChild(g);
    return c;
  },
  link: () => {
    const c = new Container();
    const g = new Graphics();
    const s = 22;
    const tri = (cx: number, cy: number) =>
      g.poly([cx, cy - s, cx + s * 0.866, cy + s / 2, cx - s * 0.866, cy + s / 2]).fill(0xffd23a).stroke({ color: 0xb8860b, width: 2 });
    tri(0, -20);
    tri(-19, 13);
    tri(19, 13);
    c.addChild(g);
    return c;
  },
  mario: () => {
    const c = new Container();
    const g = new Graphics();
    g.moveTo(-34, 6).arc(0, 6, 34, Math.PI, 0).lineTo(34, 6).fill(0xd42222).stroke({ color: 0x8a1414, width: 3 });
    g.circle(0, -18, 9).fill(0xfff2dd);
    g.circle(-20, -6, 7).fill(0xfff2dd);
    g.circle(20, -6, 7).fill(0xfff2dd);
    g.roundRect(-16, 6, 32, 22, 8).fill(0xfff2dd).stroke({ color: 0xc8a878, width: 2 });
    c.addChild(g);
    return c;
  },
  zelda: () => {
    const c = new Container();
    const g = new Graphics();
    g.poly([-26, -18, -16, -30, -6, -20, 0, -34, 6, -20, 16, -30, 26, -18, 22, -8, -22, -8]).fill(0xffd23a).stroke({ color: 0xb8860b, width: 2 });
    const s = 15;
    const tri = (cx: number, cy: number) =>
      g.poly([cx, cy - s, cx + s * 0.866, cy + s / 2, cx - s * 0.866, cy + s / 2]).fill(0xffe9a0).stroke({ color: 0xb8860b, width: 2 });
    tri(0, 10);
    tri(-13, 32);
    tri(13, 32);
    c.addChild(g);
    return c;
  },
  spongebob: () => {
    const c = new Container();
    const g = new Graphics();
    g.roundRect(-32, -36, 64, 72, 10).fill(0xffe345).stroke({ color: 0xc8a800, width: 3 });
    for (const [x, y, r] of [
      [-16, -20, 6],
      [12, -24, 5],
      [18, 2, 7],
      [-14, 10, 5],
      [0, 26, 6],
      [-22, 28, 4],
    ] as const) {
      g.circle(x, y, r).fill(0xd8b800);
    }
    c.addChild(g);
    return c;
  },
  patrick: () => {
    const c = new Container();
    const g = new Graphics().poly(starPoints(0, 0, 42, 19, 5)).fill(0xff8fa0).stroke({ color: 0xb04a5a, width: 4 });
    c.addChild(g);
    return c;
  },
  luigi: () => {
    const c = new Container();
    const g = new Graphics();
    g.circle(0, 0, 34).fill(0xfff2dd).stroke({ color: 0x1e7a3a, width: 6 });
    c.addChild(g, glyphText('L', 40, 0x1e7a3a));
    return c;
  },
  shrek: () => {
    const c = new Container();
    const g = new Graphics();
    g.ellipse(0, 8, 26, 32).fill(0xcfe85a).stroke({ color: 0x4a6b1e, width: 3 });
    g.moveTo(0, -40).quadraticCurveTo(8, -22, 4, -22).quadraticCurveTo(0, -30, -4, -22).quadraticCurveTo(-8, -22, 0, -40).fill(0x8fbf2e);
    g.moveTo(-12, -14).quadraticCurveTo(-16, 8, -10, 34).stroke({ color: 0x8fbf2e, width: 2.5 });
    g.moveTo(0, -18).lineTo(0, 38).stroke({ color: 0x8fbf2e, width: 2.5 });
    g.moveTo(12, -14).quadraticCurveTo(16, 8, 10, 34).stroke({ color: 0x8fbf2e, width: 2.5 });
    c.addChild(g);
    return c;
  },
};

/** Standalone emblem (wheel segments, lists). `size` is the box edge. */
export function buildEmblem(def: CharacterDef, size: number): Container {
  const maker = EMBLEMS[def.id];
  const c = maker ? maker(def) : new Container();
  if (!maker) c.addChild(glyphText(def.portrait.glyph, 60, Palette.white, '"Segoe UI Emoji", sans-serif'));
  c.scale.set(size / 100);
  return c;
}

/**
 * Full portrait composition for a card window of w×h: painted image if one
 * exists, else layered backdrop + key light + emblem + vignette.
 * `mirror` flips painted art horizontally (enemy side faces the player);
 * procedural emblems stay unflipped so lettered crests never read backwards —
 * only the key light swaps sides.
 */
export function buildPortrait(def: CharacterDef, w: number, h: number, mirror = false): Container {
  const root = new Container();

  const image = textureById.get(def.id);
  if (image) {
    const sprite = new Sprite(image);
    const scale = Math.max(w / image.width, h / image.height);
    sprite.anchor.set(0.5);
    sprite.scale.set(mirror ? -scale : scale, scale);
    sprite.position.set(w / 2, h / 2);
    root.addChild(sprite);
  } else {
    const bg = new Graphics().rect(0, 0, w, h).fill(mix(def.portrait.colorA, Palette.black, 0.45));
    root.addChild(bg);

    // atmosphere: color wash + key light from upper-left
    const wash = new Sprite(glowTexture());
    wash.anchor.set(0.5);
    wash.tint = def.portrait.colorB;
    wash.position.set(w / 2, h * 0.42);
    wash.width = w * 1.5;
    wash.height = h * 1.6;
    wash.alpha = 0.7;
    const key = new Sprite(glowTexture());
    key.anchor.set(0.5);
    key.tint = Palette.white;
    key.position.set(mirror ? w * 0.76 : w * 0.24, h * 0.14);
    key.width = w * 1.1;
    key.height = h * 0.9;
    key.alpha = 0.16;
    root.addChild(wash, key);

    // grounding shadow + emblem with its own glow
    const shadow = new Graphics().ellipse(w / 2, h * 0.86, w * 0.3, h * 0.08).fill({ color: Palette.black, alpha: 0.45 });
    const emGlow = new Sprite(glowTexture());
    emGlow.anchor.set(0.5);
    emGlow.tint = def.portrait.colorB;
    emGlow.blendMode = 'add';
    emGlow.position.set(w / 2, h * 0.5);
    emGlow.scale.set(0.5);
    emGlow.alpha = 0.55;
    const emblem = buildEmblem(def, Math.min(w, h) * 0.78);
    emblem.position.set(w / 2, h * 0.5);
    root.addChild(shadow, emGlow, emblem);

    // vignette: darker floor + top edge for depth
    const vig = new Graphics()
      .rect(0, h * 0.72, w, h * 0.28)
      .fill({ color: Palette.black, alpha: 0.28 })
      .rect(0, 0, w, h * 0.1)
      .fill({ color: Palette.black, alpha: 0.18 });
    root.addChild(vig);
  }

  return root;
}
