/** Design tokens. No hex literal is allowed outside this file. */

import { TextStyle, type TextStyleOptions } from 'pixi.js';
import type { Rarity } from '../data/types';

export const W = 1280;
export const H = 720;

export const Palette = {
  bg: 0x07080f,
  bgGlowA: 0x142042,
  bgGlowB: 0x2a1042,
  panel: 0x121420,
  panelLight: 0x1a1d2e,
  border: 0x2a2f45,
  borderLight: 0x3d4463,
  gold: 0xf5c542,
  goldDark: 0xb8860b,
  blue: 0x35c8ff,
  text: 0xe8ecf8,
  textDim: 0x8a92a6,
  textFaint: 0x565e75,
  success: 0x42d77d,
  danger: 0xff4a5a,
  hp: 0x42d77d,
  hpLow: 0xff4a5a,
  energy: 0x35c8ff,
  shield: 0x9fb8d8,
  white: 0xffffff,
  black: 0x000000,
} as const;

export const RarityColor: Record<Rarity, number> = {
  common: 0x9aa4b8,
  rare: 0x35a8ff,
  epic: 0xb04aff,
  legendary: 0xffb02e,
  supreme: 0xc51f3a,
  godlike: 0xff4fd8,
};

export const RarityLabel: Record<Rarity, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
  supreme: 'SUPREME',
  godlike: 'GODLIKE',
};

export const RarityTier: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  supreme: 4,
  godlike: 5,
};

const SERIF = 'Cambria, "Times New Roman", Georgia, serif';
const SANS = 'Bahnschrift, "Arial Narrow", "Segoe UI", sans-serif';

function style(opts: TextStyleOptions): TextStyle {
  return new TextStyle(opts);
}

export const Fonts = { SERIF, SANS };

export const Type = {
  logo: () =>
    style({
      fontFamily: SERIF,
      fontSize: 72,
      fontWeight: 'bold',
      fill: Palette.gold,
      letterSpacing: 4,
      dropShadow: { color: Palette.black, blur: 12, distance: 4, alpha: 0.8, angle: Math.PI / 2 },
    }),
  h1: () => style({ fontFamily: SERIF, fontSize: 32, fontWeight: 'bold', fill: Palette.gold, letterSpacing: 1.5, stroke: { color: Palette.black, width: 2 }, dropShadow: { color: Palette.black, blur: 5, distance: 2, alpha: 0.75, angle: Math.PI / 2 } }),
  h2: () => style({ fontFamily: SERIF, fontSize: 22, fontWeight: 'bold', fill: Palette.text, letterSpacing: 1.2, dropShadow: { color: Palette.black, blur: 4, distance: 1, alpha: 0.7, angle: Math.PI / 2 } }),
  h3: () => style({ fontFamily: SANS, fontSize: 17, fontWeight: 'bold', fill: Palette.text, letterSpacing: 0.6 }),
  body: () => style({ fontFamily: SANS, fontSize: 14, fill: Palette.text }),
  bodyDim: () => style({ fontFamily: SANS, fontSize: 14, fill: Palette.textDim }),
  small: () => style({ fontFamily: SANS, fontSize: 12, fill: Palette.textDim }),
  tiny: () => style({ fontFamily: SANS, fontSize: 10, fontWeight: 'bold', fill: Palette.textDim, letterSpacing: 0.9 }),
  button: () => style({ fontFamily: SANS, fontSize: 17, fontWeight: 'bold', fill: Palette.black, letterSpacing: 1.1 }),
  buttonSecondary: () => style({ fontFamily: SERIF, fontSize: 15, fontWeight: 'bold', fill: Palette.text, letterSpacing: 1.25, dropShadow: { color: Palette.black, blur: 3, distance: 1, alpha: 0.7, angle: Math.PI / 2 } }),
  cardName: () => style({ fontFamily: SANS, fontSize: 14, fontWeight: 'bold', fill: Palette.white, letterSpacing: 0.3, stroke: { color: Palette.black, width: 2 } }),
  number: () => style({ fontFamily: SANS, fontSize: 12, fontWeight: 'bold', fill: Palette.text }),
  damage: (color: number, big: boolean) =>
    style({
      fontFamily: SANS,
      fontSize: big ? 34 : 22,
      fontWeight: 'bold',
      fill: color,
      stroke: { color: Palette.black, width: 4 },
      dropShadow: { color: Palette.black, blur: 4, distance: 2, alpha: 0.6, angle: Math.PI / 2 },
    }),
  banner: (color: number) =>
    style({
      fontFamily: SERIF,
      fontSize: 44,
      fontWeight: 'bold',
      fill: color,
      letterSpacing: 3,
      stroke: { color: Palette.black, width: 5 },
      dropShadow: { color, blur: 18, distance: 0, alpha: 0.55, angle: 0 },
    }),
} as const;

/** Mix two colors (0..1). Cosmetic helper for gradients and pulses. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
