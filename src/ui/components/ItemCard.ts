/** Equipment card with the same visual grammar as a legend card. */

import { Container, Graphics, Text } from 'pixi.js';
import type { ShopItemDef } from '../../data/items';
import { ITEM_TIER_COLOR, itemBoostSummary } from '../../data/items';
import { mix, Palette, Type } from '../theme';
import { buildItemIcon } from './ItemIcon';
import { buildRarityIcon } from './RarityIcon';

export const ITEM_CARD_W = 150;
export const ITEM_CARD_H = 205;

export interface ItemCardOpts {
  selected?: boolean;
  footer?: string;
}

export class ItemCard extends Container {
  constructor(readonly item: ShopItemDef, opts: ItemCardOpts = {}) {
    super();
    const color = ITEM_TIER_COLOR[item.tier];
    const dark = mix(color, Palette.black, 0.76);
    const metal = mix(color, Palette.white, 0.28);

    const frame = new Graphics()
      .roundRect(0, 0, ITEM_CARD_W, ITEM_CARD_H, 10)
      .fill(dark)
      .stroke({ color: opts.selected ? Palette.gold : mix(color, Palette.black, 0.35), width: opts.selected ? 5 : 4 })
      .roundRect(3, 3, ITEM_CARD_W - 6, ITEM_CARD_H - 6, 8)
      .stroke({ color, width: 2 })
      .roundRect(6, 6, ITEM_CARD_W - 12, ITEM_CARD_H - 12, 6)
      .stroke({ color: metal, width: 1, alpha: 0.65 });
    for (const [x, y, sx, sy] of [
      [5, 5, 1, 1],
      [ITEM_CARD_W - 5, 5, -1, 1],
      [5, ITEM_CARD_H - 5, 1, -1],
      [ITEM_CARD_W - 5, ITEM_CARD_H - 5, -1, -1],
    ] as const) {
      frame.moveTo(x, y + 14 * sy).lineTo(x, y).lineTo(x + 14 * sx, y).stroke({ color: metal, width: 2.5 });
    }

    const artBg = new Graphics()
      .roundRect(7, 7, ITEM_CARD_W - 14, 106, 7)
      .fill({ color: Palette.black, alpha: 0.52 })
      .circle(ITEM_CARD_W / 2, 57, 45)
      .fill({ color, alpha: 0.12 });
    const icon = buildItemIcon(item, 84);
    icon.position.set(ITEM_CARD_W / 2, 58);
    const rarity = buildRarityIcon(item.tier, 34, 27);
    rarity.position.set(ITEM_CARD_W - 22, 18);

    const band = new Graphics()
      .roundRect(7, 116, ITEM_CARD_W - 14, 23, 5)
      .fill({ color: Palette.black, alpha: 0.72 })
      .stroke({ color: metal, width: 1, alpha: 0.55 });
    const name = new Text({ text: item.name.toUpperCase(), style: Type.cardName() });
    name.anchor.set(0.5);
    name.position.set(ITEM_CARD_W / 2, 127);
    if (name.width > ITEM_CARD_W - 20) name.scale.set((ITEM_CARD_W - 20) / name.width);

    const tier = new Text({ text: item.tier.toUpperCase(), style: Type.tiny() });
    tier.style.fontSize = 11;
    tier.style.fill = color;
    tier.anchor.set(0.5, 0);
    tier.position.set(ITEM_CARD_W / 2, 145);

    const boosts = itemBoostSummary(item);
    const effect = new Text({ text: boosts || item.description, style: Type.small() });
    effect.style.fontSize = 11;
    effect.style.fill = Palette.text;
    effect.style.align = 'center';
    effect.style.wordWrap = true;
    effect.style.wordWrapWidth = ITEM_CARD_W - 18;
    effect.anchor.set(0.5, 0);
    effect.position.set(ITEM_CARD_W / 2, 160);
    if (effect.height > 28) effect.scale.set(Math.min(1, 28 / effect.height));

    const footer = new Text({ text: opts.footer ?? (item.affinity ? 'RESONANCE AVAILABLE' : 'EQUIPMENT'), style: Type.tiny() });
    footer.style.fontSize = 9;
    footer.style.fill = item.affinity ? Palette.success : Palette.textDim;
    footer.anchor.set(0.5, 0);
    footer.position.set(ITEM_CARD_W / 2, 190);
    if (footer.width > ITEM_CARD_W - 16) footer.scale.set((ITEM_CARD_W - 16) / footer.width);

    this.addChild(frame, artBg, icon, rarity, band, name, tier, effect, footer);
    this.pivot.set(ITEM_CARD_W / 2, ITEM_CARD_H / 2);
  }
}