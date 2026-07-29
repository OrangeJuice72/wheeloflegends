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

/** Ceilings used to draw each stat as a filled gauge (godlike band maxima). */
const STAT_CEILING = { hp: 240000, atk: 22000, def: 95, spd: 52, crit: 0.35, critDmg: 2.2 };

/**
 * Battlefield roles inferred from a legend's kit, so the sheet says what the
 * character actually *does* rather than only listing numbers.
 */
function inferRoles(def: CharacterDef): string[] {
  const roles: string[] = [];
  const effects = def.abilities.flatMap((a) => a.effects);
  const has = (kind: string) => effects.some((e) => e.kind === kind);
  const hasStatus = (...names: string[]) =>
    effects.some((e) => e.kind === 'status' && names.includes((e as { status: string }).status));

  if (has('heal') || has('shield')) roles.push('SUPPORT');
  if (def.stats.hp >= 150000 || def.stats.def >= 65) roles.push('TANK');
  if (hasStatus('stun', 'freeze', 'shock') || has('debuff')) roles.push('CONTROL');
  if (def.stats.crit >= 0.22 || def.tags.includes('assassin')) roles.push('ASSASSIN');
  if (roles.length === 0 || def.stats.atk >= 15000) roles.unshift('DAMAGE');
  return [...new Set(roles)].slice(0, 3);
}

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
      .roundRect(px + 4, py + 4, PANEL_W - 8, 86, 14)
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
    name.position.set(px + 66, py + 10);
    const rarityBadge = buildRarityIcon(def.rarity, 38, 30);
    rarityBadge.position.set(px + 40, py + 27);
    const sub = new Text({
      // Weakness and strengths get their own panels below, so the header stays
      // to identity: tier, universe, cost, level, and any held artifact.
      text: `${RarityLabel[def.rarity]} · ${getFranchise(def.franchise).name} · COST ${Balance.rarity.cost[def.rarity]} · LEVEL ${level}${heldItem ? ` · ${heldItem.name.toUpperCase()}` : ''}`,
      style: Type.small(),
    });
    sub.style.fill = rc;
    sub.style.fontSize = 14;
    sub.style.fontWeight = 'bold';
    sub.position.set(px + 26, py + 72);
    // The epithet is the character's flavour line — give it real billing.
    const epithet = new Text({ text: def.epithet, style: Type.h3() });
    epithet.style.fontSize = 15;
    epithet.style.fill = Palette.textDim;
    epithet.style.fontStyle = 'italic';
    epithet.position.set(px + 68, py + 52);
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
    this.addChild(rarityBadge, name, epithet, sub, power, close);

    // Role chips — what this legend does in a fight, right-aligned under POWER.
    const roleChips = new Container();
    let rx = 0;
    for (const role of inferRoles(def)) {
      const label = new Text({ text: role, style: Type.tiny() });
      label.style.fontSize = 10;
      label.style.fill = Palette.text;
      label.position.set(8, 4);
      const chip = new Graphics()
        .roundRect(0, 0, label.width + 16, 20, 10)
        .fill({ color: mix(rc, Palette.black, 0.55), alpha: 0.95 })
        .stroke({ color: rc, width: 1.2 });
      const wrap = new Container();
      wrap.addChild(chip, label);
      wrap.position.set(rx, 0);
      roleChips.addChild(wrap);
      rx += label.width + 24;
    }
    roleChips.position.set(px + PANEL_W - 34 - roleChips.width, py + 54);
    this.addChild(roleChips);

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

    // Synergies moved into the bottom-right section (built further down) where
    // there is room to show them as a proper panel.
    const feeds = SYNERGIES.filter((s) => (s.tag !== undefined && def.tags.includes(s.tag)) || s.franchise === def.franchise);

    // The artifact slot always shows, so the column reads as a real inventory
    // slot rather than blank space when nothing is equipped.
    if (!heldItem) {
      const empty = new Graphics().roundRect(px + 18, py + 486, 244, 66, 10)
        .fill({ color: Palette.black, alpha: 0.4 })
        .stroke({ color: Palette.border, width: 1.5 });
      const slotLabel = new Text({ text: 'ARTIFACT SLOT', style: Type.tiny() });
      slotLabel.style.fontSize = 10;
      slotLabel.style.fill = Palette.textFaint;
      slotLabel.position.set(px + 62, py + 501);
      const hint = new Text({ text: 'Empty — equip in Formation', style: Type.small() });
      hint.style.fontSize = 11;
      hint.style.fill = Palette.textFaint;
      hint.position.set(px + 62, py + 518);
      const glyph = new Text({ text: '＋', style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 22, fill: Palette.textFaint } });
      glyph.anchor.set(0.5);
      glyph.position.set(px + 42, py + 519);
      this.addChild(empty, glyph, slotLabel, hint);
    }

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
    // value, any item bonus, and how full the stat is against its ceiling
    const rows: [string, string, number, number][] = [
      ['HP', `${hp.toLocaleString('en-US')}${bonusText(boosts.hp)}`, boosts.hp ?? 0, hp / STAT_CEILING.hp],
      ['ATK', `${atk.toLocaleString('en-US')}${bonusText(boosts.atk)}`, boosts.atk ?? 0, atk / STAT_CEILING.atk],
      ['DEF', `${Math.round(defense)}${bonusText(boosts.def)}`, boosts.def ?? 0, defense / STAT_CEILING.def],
      ['SPD', `${Math.round(speed)}${bonusText(boosts.spd)}`, boosts.spd ?? 0, speed / STAT_CEILING.spd],
      ['CRIT', `${Math.round(crit * 100)}%${bonusText(boosts.crit)}`, boosts.crit ?? 0, crit / STAT_CEILING.crit],
      ['CRIT DMG', `×${def.stats.critDmg}`, 0, def.stats.critDmg / STAT_CEILING.critDmg],
    ];
    rows.forEach(([label, value, bonus, fill], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cell = new Container();
      const bg = new Graphics().roundRect(0, 0, 208, 58, 8).fill({ color: Palette.black, alpha: 0.48 }).stroke({ color: Palette.borderLight, width: 1.2 });
      const l = new Text({ text: label, style: Type.tiny() });
      l.style.fontSize = 11;
      l.position.set(11, 6);
      const v = new Text({ text: value, style: Type.h3() });
      v.style.fontSize = 19;
      v.style.fill = bonus > 0 ? Palette.success : Palette.text;
      v.anchor.set(1, 0);
      v.position.set(197, 5);
      if (v.width > 150) v.scale.set(150 / v.width);
      // Gauge: shows at a glance whether a stat is strong for its ceiling.
      const barW = 186;
      const pct = Math.max(0.04, Math.min(1, fill));
      const gauge = new Graphics()
        .roundRect(11, 38, barW, 8, 4)
        .fill({ color: Palette.black, alpha: 0.65 })
        .stroke({ color: Palette.border, width: 1 })
        .roundRect(11, 38, barW * pct, 8, 4)
        .fill(bonus > 0 ? Palette.success : rc);
      cell.addChild(bg, l, v, gauge);
      cell.position.set(statX + col * 218, statY + row * 64);
      this.addChild(cell);
    });

    // abilities — each gets a slot-coloured spine so basic/skill/ult read apart
    let ay = statY + 144;
    for (const ability of def.abilities) {
      const slotColor = ability.slot === 'ult' ? Palette.gold : ability.slot === 'skill' ? Palette.blue : Palette.textDim;
      const nameText = new Text({ text: ability.name, style: Type.h3() });
      nameText.style.fontSize = 18;
      nameText.position.set(statX + 14, ay);
      const slotText = new Text({ text: abilitySlotLabel(ability), style: Type.tiny() });
      slotText.style.fontSize = 11;
      slotText.style.fill = slotColor;
      slotText.position.set(statX + 28 + nameText.width, ay + 4);
      const desc = new Text({ text: describeAbility(ability), style: Type.small() });
      desc.style.fontSize = 14;
      desc.style.fill = Palette.text;
      desc.style.wordWrap = true;
      desc.style.wordWrapWidth = PANEL_W - 356;
      desc.position.set(statX + 14, ay + 22);
      const spine = new Graphics()
        .roundRect(statX, ay + 1, 5, 20 + desc.height, 3)
        .fill({ color: slotColor, alpha: 0.9 });
      this.addChild(spine, nameText, slotText, desc);
      ay += 34 + desc.height;
    }

    // passives — only as far as the matchup section below leaves room
    const kitFloor = py + PANEL_H - 158;
    if (def.passives.length > 0 && ay + 24 < kitFloor) {
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
        line.style.wordWrapWidth = PANEL_W - 356;
        line.position.set(statX, ay);
        if (ay + line.height > kitFloor) break;
        this.addChild(line);
        ay += line.height + 6;
      }
    }

    // ── bottom of the right column: matchup + team bonds ────────────────────
    // Anchored to the panel floor so it stays put however long the kit text runs.
    const sectionY = py + PANEL_H - 148;
    const colW = 318;
    const gap = 18;

    const matchup = (label: string, value: string, color: number, x: number, y: number, h: number) => {
      const box = new Graphics()
        .roundRect(x, y, colW, h, 10)
        .fill({ color: Palette.black, alpha: 0.5 })
        .stroke({ color: mix(color, Palette.black, 0.25), width: 1.5 });
      const l = new Text({ text: label, style: Type.tiny() });
      l.style.fontSize = 10;
      l.style.fill = color;
      l.position.set(x + 12, y + 9);
      const v = new Text({ text: value, style: Type.h3() });
      v.style.fontSize = 15;
      v.style.fill = Palette.text;
      v.position.set(x + 12, y + 26);
      if (v.width > colW - 24) v.scale.set((colW - 24) / v.width);
      this.addChild(box, l, v);
    };

    matchup('STRONG AGAINST', strengthSummary(def, 3).toUpperCase() || '—', Palette.success, statX, sectionY, 54);
    matchup('WEAK TO', WEAKNESS_LABEL[def.weakness!].toUpperCase(), Palette.danger, statX, sectionY + 62, 54);

    // Team bonds this legend contributes to.
    const bondsX = statX + colW + gap;
    const bondsH = 116;
    const bondsBox = new Graphics()
      .roundRect(bondsX, sectionY, colW, bondsH, 10)
      .fill({ color: Palette.black, alpha: 0.5 })
      .stroke({ color: mix(Palette.gold, Palette.black, 0.3), width: 1.5 });
    const bondsLabel = new Text({ text: 'TEAM BONDS', style: Type.tiny() });
    bondsLabel.style.fontSize = 10;
    bondsLabel.style.fill = Palette.gold;
    bondsLabel.position.set(bondsX + 12, sectionY + 9);
    this.addChild(bondsBox, bondsLabel);

    if (feeds.length === 0) {
      const none = new Text({ text: 'A lone wolf — no shared bonds.', style: Type.small() });
      none.style.fontSize = 12;
      none.style.fill = Palette.textFaint;
      none.position.set(bondsX + 12, sectionY + 30);
      this.addChild(none);
    } else {
      feeds.slice(0, 3).forEach((syn, i) => {
        const y = sectionY + 28 + i * 28;
        const line = new Text({ text: `${syn.icon}  ${syn.name}`, style: Type.small() });
        line.style.fontSize = 13;
        line.style.fill = Palette.text;
        line.position.set(bondsX + 12, y);
        // The first threshold tells the player what to build toward.
        const need = new Text({ text: syn.thresholds[0] ? `${syn.thresholds[0].count}+` : '', style: Type.tiny() });
        need.style.fontSize = 11;
        need.style.fill = syn.franchise !== undefined ? Palette.gold : Palette.textDim;
        need.anchor.set(1, 0);
        need.position.set(bondsX + colW - 12, y + 2);
        this.addChild(line, need);
      });
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
