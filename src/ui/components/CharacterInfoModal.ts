/**
 * Full character sheet modal: big card, stats at the inspected level,
 * data-generated ability text, passives, and the synergies this legend feeds.
 * Opened from the formation screen; click anywhere outside to close.
 */

import { Container, Graphics, Text } from 'pixi.js';
import type { Sfx } from '../../audio/Sfx';
import { Tweens, Easing } from '../../core/Tween';
import { Balance } from '../../data/balance';
import { SYNERGIES } from '../../data/synergies';
import type { CharacterDef } from '../../data/types';
import { getFranchise } from '../../data/franchises';
import { effectiveItemBoosts, getShopItem, itemBattleSummary } from '../../data/items';
import { strengthSummary, WEAKNESS_LABEL } from '../../data/characterRules';
import { abilitySlotLabel, describeAbility, describePassive } from '../describe';
import { H, mix, Palette, RarityColor, RarityLabel, Type, W } from '../theme';
import { CharacterCard } from './CharacterCard';
import { buildRarityIcon } from './RarityIcon';
import { Button } from './Button';

const PANEL_W = 1040;
const PANEL_H = 600;

export interface CharacterTrainingOptions {
  cost: number;
  canAfford: boolean;
  atMax: boolean;
  onTrain: () => void;
}

export class CharacterInfoModal extends Container {
  constructor(def: CharacterDef, level: number, sfx: Sfx, onClose: () => void, heldItemId: string | null = null, training: CharacterTrainingOptions | null = null) {
    super();
    const rc = RarityColor[def.rarity];
    const heldItem = heldItemId ? getShopItem(heldItemId) : null;
    const boosts = heldItem ? effectiveItemBoosts(heldItem, def) : {};

    const dim = new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.72 });
    dim.eventMode = 'static';
    dim.cursor = 'pointer';
    dim.on('pointerdown', () => {
      sfx.click();
      onClose();
    });
    this.addChild(dim);

    const px = (W - PANEL_W) / 2;
    const py = (H - PANEL_H) / 2;
    const panel = new Graphics()
      .roundRect(px, py, PANEL_W, PANEL_H, 18)
      .fill({ color: Palette.panel, alpha: 0.98 })
      .stroke({ color: rc, width: 3 })
      .roundRect(px + 4, py + 4, PANEL_W - 8, 70, 14)
      .fill({ color: mix(rc, Palette.black, 0.75), alpha: 0.9 });
    panel.eventMode = 'static'; // swallow clicks inside the sheet
    this.addChild(panel);

    const close = new Text({ text: '✕', style: Type.h2() });
    close.anchor.set(0.5);
    close.position.set(px + PANEL_W - 30, py + 28);
    close.eventMode = 'static';
    close.cursor = 'pointer';
    close.on('pointerdown', () => {
      sfx.click();
      onClose();
    });

    const name = new Text({ text: def.name.toUpperCase(), style: Type.h1() });
    name.position.set(px + 66, py + 14);
    const rarityBadge = buildRarityIcon(def.rarity, 38, 30);
    rarityBadge.position.set(px + 40, py + 31);
    const sub = new Text({
      text: `${RarityLabel[def.rarity]} · ${getFranchise(def.franchise).name} · WEAK: ${WEAKNESS_LABEL[def.weakness!].toUpperCase()} · COST ${Balance.rarity.cost[def.rarity]} · LEVEL ${level}${heldItem ? ` · ${heldItem.name.toUpperCase()}` : ''}`,
      style: Type.small(),
    });
    sub.style.fill = rc;
    sub.style.fontSize = 14;
    sub.style.fontWeight = 'bold';
    sub.position.set(px + 26, py + 50);
    const strengths = new Text({ text: `STRENGTHS: ${strengthSummary(def, 3).toUpperCase()}`, style: Type.tiny() });
    strengths.style.fontSize = 11;
    strengths.style.fill = Palette.success;
    strengths.position.set(px + 310, py + 78);
    const levelMult = 1 + Balance.level.statGainPerLevel * (level - 1);
    const hp = Math.round(def.stats.hp * levelMult * (1 + (boosts.hp ?? 0)));
    const atk = Math.round(def.stats.atk * levelMult * (1 + (boosts.atk ?? 0)));
    const defense = def.stats.def * (1 + (boosts.def ?? 0));
    const speed = def.stats.spd * (1 + (boosts.spd ?? 0));
    const crit = Math.min(1, def.stats.crit + (boosts.crit ?? 0));
    const combatPower = Math.round(hp / 20 + atk * 2.5 + defense * 180 + speed * 160 + crit * 30000);
    const power = new Text({ text: `POWER ${combatPower.toLocaleString('en-US')}`, style: Type.h3() });
    power.style.fill = rc;
    power.anchor.set(1, 0);
    power.position.set(px + PANEL_W - 58, py + 22);
    this.addChild(rarityBadge, name, sub, strengths, power, close);

    // left column: the card + epithet + tags
    const card = new CharacterCard(def, { mode: 'roster', level, showCost: false, heldItemId });
    card.scale.set(1.45);
    card.position.set(px + 145, py + 248);
    this.addChild(card);

    const tagWrap = new Container();
    let tx = 0;
    for (const tag of def.tags) {
      const label = new Text({ text: tag.toUpperCase(), style: Type.tiny() });
      label.style.fontSize = 11;
      const chip = new Graphics()
        .roundRect(-6, -4, label.width + 12, 20, 9)
        .fill({ color: Palette.black, alpha: 0.5 })
        .stroke({ color: Palette.borderLight, width: 1 });
      const wrap = new Container();
      wrap.addChild(chip, label);
      wrap.position.set(tx, 0);
      tagWrap.addChild(wrap);
      tx += label.width + 22;
    }
    tagWrap.position.set(px + 145 - tagWrap.width / 2, py + 414);
    this.addChild(tagWrap);

    // synergies this character feeds
    const feeds = SYNERGIES.filter((s) => def.tags.includes(s.tag));
    feeds.slice(0, 3).forEach((syn, i) => {
      const line = new Text({ text: `${syn.icon} ${syn.name}`, style: Type.small() });
      line.style.fontSize = 13;
      line.style.fill = Palette.text;
      line.anchor.set(0.5, 0);
      line.position.set(px + 145, py + 445 + i * 22);
      this.addChild(line);
    });

    if (heldItem) {
      const gear = new Graphics().roundRect(px + 18, py + 486, 244, 66, 10)
        .fill({ color: Palette.black, alpha: 0.62 })
        .stroke({ color: rc, width: 1.5 });
      const gearIcon = new Text({ text: heldItem.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 24 } });
      gearIcon.anchor.set(0.5);
      gearIcon.position.set(px + 42, py + 519);
      const gearName = new Text({ text: `HELD · ${heldItem.name.toUpperCase()}`, style: Type.tiny() });
      gearName.style.fill = rc;
      gearName.position.set(px + 62, py + 493);
      const gearEffect = new Text({ text: itemBattleSummary(heldItem, def), style: Type.small() });
      gearEffect.style.fontSize = 11;
      gearEffect.style.fill = Palette.success;
      gearEffect.style.wordWrap = true;
      gearEffect.style.wordWrapWidth = 188;
      gearEffect.position.set(px + 62, py + 510);
      this.addChild(gear, gearIcon, gearName, gearEffect);
    }

    // right column: stats
    const statX = px + 310;
    const statY = py + 96;
    const bonusText = (bonus: number | undefined) => bonus ? `  ▲${Math.round(bonus * 100)}%` : '';
    const rows: [string, string, number][] = [
      ['HP', `${hp.toLocaleString('en-US')}${bonusText(boosts.hp)}`, boosts.hp ?? 0],
      ['ATK', `${atk.toLocaleString('en-US')}${bonusText(boosts.atk)}`, boosts.atk ?? 0],
      ['DEF', `${Math.round(defense)}${bonusText(boosts.def)}`, boosts.def ?? 0],
      ['SPD', `${Math.round(speed)}${bonusText(boosts.spd)}`, boosts.spd ?? 0],
      ['CRIT', `${Math.round(crit * 100)}%${bonusText(boosts.crit)}`, boosts.crit ?? 0],
      ['CRIT DMG', `×${def.stats.critDmg}`, 0],
    ];
    rows.forEach(([label, value, bonus], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cell = new Container();
      const bg = new Graphics().roundRect(0, 0, 208, 52, 8).fill({ color: Palette.black, alpha: 0.48 }).stroke({ color: Palette.borderLight, width: 1.2 });
      const l = new Text({ text: label, style: Type.tiny() });
      l.style.fontSize = 11;
      l.position.set(11, 7);
      const v = new Text({ text: value, style: Type.h3() });
      v.style.fontSize = 19;
      v.style.fill = bonus > 0 ? Palette.success : Palette.text;
      v.position.set(11, 23);
      if (v.width > 186) v.scale.set(186 / v.width);
      cell.addChild(bg, l, v);
      cell.position.set(statX + col * 218, statY + row * 60);
      this.addChild(cell);
    });

    // abilities
    let ay = statY + 136;
    for (const ability of def.abilities) {
      const slotColor = ability.slot === 'ult' ? Palette.gold : ability.slot === 'skill' ? Palette.blue : Palette.textDim;
      const nameText = new Text({ text: ability.name, style: Type.h3() });
      nameText.style.fontSize = 18;
      nameText.position.set(statX, ay);
      const slotText = new Text({ text: abilitySlotLabel(ability), style: Type.tiny() });
      slotText.style.fontSize = 11;
      slotText.style.fill = slotColor;
      slotText.position.set(statX + nameText.width + 14, ay + 4);
      const desc = new Text({ text: describeAbility(ability), style: Type.small() });
      desc.style.fontSize = 14;
      desc.style.fill = Palette.text;
      desc.style.wordWrap = true;
      desc.style.wordWrapWidth = PANEL_W - 340;
      desc.position.set(statX, ay + 22);
      this.addChild(nameText, slotText, desc);
      ay += 34 + desc.height;
    }

    // passives
    if (def.passives.length > 0) {
      const header = new Text({ text: 'PASSIVES', style: Type.tiny() });
      header.style.fontSize = 11;
      header.style.fill = Palette.gold;
      header.position.set(statX, ay + 4);
      this.addChild(header);
      ay += 24;
      for (const p of def.passives) {
        const line = new Text({ text: `◆ ${describePassive(p)}`, style: Type.small() });
        line.style.fontSize = 14;
        line.style.fill = Palette.text;
        line.style.wordWrap = true;
        line.style.wordWrapWidth = PANEL_W - 340;
        line.position.set(statX, ay);
        this.addChild(line);
        ay += line.height + 6;
      }
    }

    if (training) {
      const label = training.atMax ? 'MAX LEVEL' : `TRAIN +1  ·  ${training.cost} COINS`;
      const train = new Button(label, sfx, { width: 244, height: 38, variant: 'secondary', onClick: training.onTrain });
      train.position.set(px + 140, py + 576);
      train.setEnabled(!training.atMax && training.canAfford);
      this.addChild(train);
    }
    // entrance
    this.alpha = 0;
    Tweens.to(this, { alpha: 1 }, { duration: 0.18 });
    card.scale.set(0.9);
    Tweens.to(card.scale, { x: 1.45, y: 1.45 }, { duration: 0.3, ease: Easing.backOut });
  }
}
