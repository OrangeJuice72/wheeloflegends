/** Full equipment dossier opened from the Formation Bag. */

import { Container, Graphics, Text } from 'pixi.js';
import type { Sfx } from '../../audio/Sfx';
import { Tweens, Easing } from '../../core/Tween';
import { getCharacter } from '../../data/characters';
import { getFranchise } from '../../data/franchises';
import type { ItemBoosts, ShopItemDef } from '../../data/items';
import { ITEM_TIER_COLOR, itemBoostSummary, itemPowerScore } from '../../data/items';
import { describeAbility } from '../describe';
import { H, mix, Palette, Type, W } from '../theme';
import { ItemCard } from './ItemCard';
import { buildRarityIcon } from './RarityIcon';

const PANEL_W = 960;
const PANEL_H = 560;
const BOOST_LABEL: Record<keyof ItemBoosts, string> = {
  hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD', crit: 'CRIT', energyGain: 'ENERGY GAIN',
};

export class ItemInfoModal extends Container {
  constructor(item: ShopItemDef, sfx: Sfx, onClose: () => void) {
    super();
    const color = ITEM_TIER_COLOR[item.tier];
    const px = (W - PANEL_W) / 2;
    const py = (H - PANEL_H) / 2;
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.76 });
    dim.eventMode = 'static';
    dim.cursor = 'pointer';
    dim.on('pointerdown', () => { sfx.click(); onClose(); });
    const panel = new Graphics()
      .roundRect(px, py, PANEL_W, PANEL_H, 18)
      .fill({ color: Palette.panel, alpha: 0.99 })
      .stroke({ color, width: 3 })
      .roundRect(px + 4, py + 4, PANEL_W - 8, 72, 14)
      .fill({ color: mix(color, Palette.black, 0.76), alpha: 0.94 });
    panel.eventMode = 'static';
    this.addChild(dim, panel);

    const rarity = buildRarityIcon(item.tier, 42, 33);
    rarity.position.set(px + 42, py + 35);
    const name = new Text({ text: item.name.toUpperCase(), style: Type.h1() });
    name.position.set(px + 72, py + 15);
    const sub = new Text({
      text: `${item.tier.toUpperCase()} EQUIPMENT · POWER ${itemPowerScore(item).toLocaleString('en-US')} · STORE VALUE ${item.price} COINS${item.minFloor ? ` · FLOOR ${item.minFloor}+` : ''}`,
      style: Type.small(),
    });
    sub.style.fill = color;
    sub.style.fontWeight = 'bold';
    sub.position.set(px + 30, py + 52);
    const close = new Text({ text: '✕', style: Type.h2() });
    close.anchor.set(0.5);
    close.position.set(px + PANEL_W - 30, py + 29);
    close.eventMode = 'static';
    close.cursor = 'pointer';
    close.on('pointerdown', () => { sfx.click(); onClose(); });
    this.addChild(rarity, name, sub, close);

    const card = new ItemCard(item, { footer: 'ITEM DOSSIER' });
    card.scale.set(1.55);
    card.position.set(px + 150, py + 255);
    this.addChild(card);

    const baseBox = new Graphics().roundRect(px + 25, py + 430, 250, 96, 12)
      .fill({ color: Palette.black, alpha: 0.52 })
      .stroke({ color, width: 1.4 });
    const baseTitle = new Text({ text: 'BASE EFFECT', style: Type.tiny() });
    baseTitle.style.fill = color;
    baseTitle.position.set(px + 40, py + 442);
    const base = new Text({ text: item.description, style: Type.body() });
    base.style.fontSize = 14;
    base.style.wordWrap = true;
    base.style.wordWrapWidth = 220;
    base.position.set(px + 40, py + 464);
    this.addChild(baseBox, baseTitle, base);

    const statX = px + 310;
    const statY = py + 100;
    const boosts = Object.entries(item.boosts ?? {}) as Array<[keyof ItemBoosts, number]>;
    const statEntries = boosts.length > 0 ? boosts : ([['hp', 0]] as Array<[keyof ItemBoosts, number]>);
    statEntries.forEach(([stat, value], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const cell = new Container();
      const bg = new Graphics().roundRect(0, 0, 194, 64, 9)
        .fill({ color: Palette.black, alpha: 0.48 })
        .stroke({ color, width: 1.2 });
      const label = new Text({ text: BOOST_LABEL[stat], style: Type.tiny() });
      label.position.set(12, 9);
      const valueText = new Text({ text: value > 0 ? `+${Math.round(value * 100)}%` : 'UTILITY', style: Type.h2() });
      valueText.style.fill = value > 0 ? Palette.success : Palette.text;
      valueText.position.set(12, 27);
      cell.addChild(bg, label, valueText);
      cell.position.set(statX + col * 204, statY + row * 74);
      this.addChild(cell);
    });

    const summary = new Text({ text: itemBoostSummary(item), style: Type.h3() });
    summary.style.fill = Palette.success;
    summary.position.set(statX, statY + 150);
    this.addChild(summary);

    const resonanceY = statY + 192;
    const resonanceBox = new Graphics().roundRect(statX, resonanceY, 602, 220, 12)
      .fill({ color: Palette.black, alpha: 0.42 })
      .stroke({ color: item.affinity ? Palette.gold : Palette.border, width: 1.5 });
    const resonanceTitle = new Text({ text: item.affinity ? `RESONANCE ×${item.affinity.multiplier.toFixed(2)}` : 'UNIVERSAL EQUIPMENT', style: Type.h3() });
    resonanceTitle.style.fill = item.affinity ? Palette.gold : Palette.textDim;
    resonanceTitle.position.set(statX + 18, resonanceY + 14);
    this.addChild(resonanceBox, resonanceTitle);

    if (item.affinity) {
      const homes = [
        ...item.affinity.franchises.map((id) => getFranchise(id).name),
        ...(item.affinity.characterIds ?? []).map((id) => getCharacter(id).name),
      ];
      const users = new Text({ text: `STRONGEST WITH: ${homes.join(', ').toUpperCase() || 'SPECIAL HOLDER'}`, style: Type.tiny() });
      users.style.fill = Palette.success;
      users.position.set(statX + 18, resonanceY + 48);
      const desc = new Text({ text: item.affinity.description, style: Type.body() });
      desc.style.fontSize = 15;
      desc.style.wordWrap = true;
      desc.style.wordWrapWidth = 560;
      desc.position.set(statX + 18, resonanceY + 72);
      this.addChild(users, desc);
      let detailY = resonanceY + 116;
      if (item.affinity.extraActions) {
        const action = new Text({ text: `◆ ${item.affinity.extraActions + 1} ACTIONS PER TURN WHILE RESONANT`, style: Type.small() });
        action.style.fill = Palette.energy;
        action.position.set(statX + 18, detailY);
        this.addChild(action);
        detailY += 24;
      }
      if (item.affinity.ability) {
        const ability = new Text({ text: `GRANTED SKILL · ${item.affinity.ability.name}`, style: Type.h3() });
        ability.style.fontSize = 17;
        ability.position.set(statX + 18, detailY);
        const abilityDesc = new Text({ text: describeAbility(item.affinity.ability), style: Type.small() });
        abilityDesc.style.fontSize = 13;
        abilityDesc.style.wordWrap = true;
        abilityDesc.style.wordWrapWidth = 555;
        abilityDesc.position.set(statX + 18, detailY + 23);
        this.addChild(ability, abilityDesc);
      }
    } else {
      const universal = new Text({ text: 'Provides its full listed bonuses to every legend.', style: Type.body() });
      universal.position.set(statX + 18, resonanceY + 58);
      this.addChild(universal);
    }

    this.alpha = 0;
    Tweens.to(this, { alpha: 1 }, { duration: 0.18 });
    card.scale.set(0.9);
    Tweens.to(card.scale, { x: 1.55, y: 1.55 }, { duration: 0.3, ease: Easing.backOut });
  }
}