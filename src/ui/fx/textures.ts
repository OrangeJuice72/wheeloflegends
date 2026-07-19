/** Procedural textures generated once at boot (no binary assets). */

import { Texture } from 'pixi.js';

let glow: Texture | null = null;
let dot: Texture | null = null;
let battleVignette: Texture | null = null;

/** Soft radial gradient — the workhorse for glows, particles, and beams. */
export function glowTexture(): Texture {
  if (glow) return glow;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  glow = Texture.from(canvas);
  return glow;
}

/** Small hard-edged dot for spark particles. */
export function dotTexture(): Texture {
  if (dot) return dot;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  dot = Texture.from(canvas);
  return dot;
}

/** Four-sided black feather used to blend painted battle art into the UI. */
export function battleVignetteTexture(): Texture {
  if (battleVignette) return battleVignette;
  const width = 1280;
  const height = 720;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const paintEdge = (gradient: CanvasGradient) => {
    gradient.addColorStop(0, 'rgba(0,0,0,0.98)');
    gradient.addColorStop(0.42, 'rgba(0,0,0,0.58)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };

  paintEdge(ctx.createLinearGradient(0, 0, width * 0.24, 0));
  paintEdge(ctx.createLinearGradient(width, 0, width * 0.76, 0));
  paintEdge(ctx.createLinearGradient(0, 0, 0, height * 0.2));
  paintEdge(ctx.createLinearGradient(0, height, 0, height * 0.72));

  battleVignette = Texture.from(canvas);
  return battleVignette;
}
