/** Shared rarity badge: dropped-in art with a procedural fallback. */

import { Container, Graphics, Sprite } from 'pixi.js';
import type { Rarity } from '../../data/types';
import { rarityTexture } from '../portraits';
import { mix, Palette, RarityColor } from '../theme';

export function buildRarityIcon(rarity: Rarity, width: number, height = width): Container {
  const wrap = new Container();
  const texture = rarityTexture(rarity);
  if (texture) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.scale.set(Math.min(width / texture.width, height / texture.height));
    wrap.addChild(sprite);
    return wrap;
  }

  const color = RarityColor[rarity];
  const halfW = width / 2;
  const halfH = height / 2;
  const gem = new Graphics()
    .poly([0, -halfH, halfW, 0, 0, halfH, -halfW, 0])
    .fill(color)
    .stroke({ color: mix(color, Palette.white, 0.4), width: Math.max(1, width * 0.04) })
    .poly([0, -halfH, halfW, 0, 0, 0])
    .fill({ color: Palette.white, alpha: 0.25 });
  wrap.addChild(gem);
  return wrap;
}
