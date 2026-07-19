/** Item icon: dropped-in art from src/assets/items/<id>.png, emoji fallback. */

import { Container, Sprite, Text } from 'pixi.js';
import type { ShopItemDef } from '../../data/items';
import { itemTexture } from '../portraits';

/** Returns a container centered on (0,0) fitting inside a size×size box. */
export function buildItemIcon(item: ShopItemDef, size: number): Container {
  const wrap = new Container();
  const texture = itemTexture(item.id);
  if (texture) {
    const sprite = new Sprite(texture);
    const scale = Math.min(size / texture.width, size / texture.height);
    sprite.anchor.set(0.5);
    sprite.scale.set(scale);
    wrap.addChild(sprite);
  } else {
    const glyph = new Text({
      text: item.icon,
      style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: Math.round(size * 0.64) },
    });
    glyph.anchor.set(0.5);
    wrap.addChild(glyph);
  }
  return wrap;
}
