/**
 * Formation screen: front/back rows, bench, live synergy readout, enemy
 * scouting report, and the door to battle.
 */

import { Circle, Container, Graphics, Rectangle, Text, type FederatedPointerEvent } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { Tweens, Easing } from '../../core/Tween';
import { Balance } from '../../data/balance';
import { getCharacter } from '../../data/characters';
import { getShopItem } from '../../data/items';
import { computeSynergies } from '../../sim/synergy';
import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { CharacterCard, CARD_W, CARD_H } from '../components/CharacterCard';
import { CharacterInfoModal } from '../components/CharacterInfoModal';
import { ItemCard, ITEM_CARD_H, ITEM_CARD_W } from '../components/ItemCard';
import { ItemInfoModal } from '../components/ItemInfoModal';
import { SettingsModal } from '../components/SettingsModal';
import type { CharacterDef } from '../../data/types';
import { H, Palette, RarityTier, Type, W } from '../theme';
import { BattlefieldScene } from './BattlefieldScene';
import { SlotScene } from './SlotScene';

const SLOT_SCALE = 0.85;
const SLOT_W = CARD_W * SLOT_SCALE;
const SLOT_H = CARD_H * SLOT_SCALE;
const FRONT_Y = 240;
const BACK_Y = 448;
const SLOT_XS_FRONT = [420, 570, 720];
const SLOT_XS_BACK = [495, 645];

export class TeamScene extends Scene {
  private slotLayer = new Container();
  private benchLayer = new Container();
  private dragLayer = new Container();
  private dragRosterIdx: number | null = null;
  private dragFromSlot: number | null = null;
  private dragCard: CharacterCard | null = null;
  private synergyPanel!: Panel;
  private battleBtn!: Button;
  private costText!: Text;
  private selectedBench: number | null = null; // roster index awaiting placement
  private selectedSlot: number | null = null; // fielded slot awaiting swap
  private legendaryCards: CharacterCard[] = [];
  private scoutCards: CharacterCard[] = [];
  private bagLayer = new Container();
  private bagPanel!: Panel;
  private selectedInventory: number | null = null;
  private bagPage = 0;
  private threatText!: Text;

  constructor(game: Game) {
    super(game);
  }

  private get run() {
    const run = this.game.run;
    if (!run) throw new Error('TeamScene requires an active run');
    return run;
  }

  onEnter(): void {
    const floor = this.run.currentFloor();
    this.eventMode = 'static';
    this.hitArea = new Rectangle(0, 0, W, H);
    this.on('globalpointermove', (event: FederatedPointerEvent) => {
      if (!this.dragCard) return;
      const point = event.getLocalPosition(this.dragLayer);
      this.dragCard.position.set(point.x, point.y);
    });
    const finishDrag = (event: FederatedPointerEvent) => {
      if (this.dragCard) this.finishCardDrag(event);
    };
    this.on('pointerup', finishDrag);
    this.on('pointerupoutside', finishDrag);

    const title = new Text({ text: `FORMATION — FLOOR ${this.run.floor}`, style: Type.h1() });
    title.anchor.set(0.5, 0);
    title.position.set(570, 20);
    this.addChild(title);
    if (floor.isBoss) {
      const warn = new Text({ text: `⚠ BOSS FLOOR — ${floor.title}`, style: Type.h3() });
      warn.style.fill = Palette.danger;
      warn.anchor.set(0.5, 0);
      warn.position.set(570, 58);
      this.addChild(warn);
      Tweens.to(warn, { alpha: 0.5 }, { duration: 0.6, ease: Easing.sineInOut });
      Tweens.to(warn, { alpha: 1 }, { duration: 0.6, delay: 0.6 });
    } else {
      const sub = new Text({ text: floor.title, style: Type.h3() });
      sub.style.fill = Palette.textDim;
      sub.anchor.set(0.5, 0);
      sub.position.set(570, 58);
      this.addChild(sub);
    }

    // row labels
    const frontLabel = new Text({ text: 'FRONT LINE — takes the hits', style: Type.tiny() });
    frontLabel.anchor.set(0.5);
    frontLabel.position.set(570, FRONT_Y - SLOT_H / 2 - 16);
    const backLabel = new Text({ text: 'BACK LINE — protected', style: Type.tiny() });
    backLabel.anchor.set(0.5);
    backLabel.position.set(570, BACK_Y - SLOT_H / 2 - 16);
    this.addChild(frontLabel, backLabel, this.slotLayer);

    // Enemy scouting report uses the same real cards the player fields.
    const scout = new Panel(250, 420, floor.isBoss ? 'Boss Encounter' : 'Enemy Scouts');
    scout.position.set(20, 100);
    this.scoutCards = [];
    const scoutScale = 0.45;
    floor.enemies.forEach((spec, i) => {
      const def = getCharacter(spec.defId);
      const card = new CharacterCard(def, {
        mode: 'roster',
        level: spec.level,
        showCost: false,
        onInspect: () => this.openEnemyInfo(def, spec.level),
      });
      card.scale.set(scoutScale * (spec.boss ? 1.06 : 1));
      card.position.set(62 + (i % 2) * 112, 62 + Math.floor(i / 2) * 104);
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.on('pointerdown', () => this.openEnemyInfo(def, spec.level));
      scout.content.addChild(card);
      this.scoutCards.push(card);
    });
    const threat = new Text({
      text: this.threatLabel(),
      style: Type.small(),
    });
    threat.position.set(14, 356);
    this.threatText = threat;
    scout.content.addChild(threat);
    this.addChild(scout);
    // Synergy and Bag panels share the right command column.
    this.synergyPanel = new Panel(330, 250, 'Team Synergies');
    this.synergyPanel.position.set(930, 100);
    this.addChild(this.synergyPanel);

    this.costText = new Text({ text: '', style: Type.h3() });
    this.costText.position.set(950, 365);
    this.addChild(this.costText);

    this.bagPanel = new Panel(330, 210, 'Bag');
    this.bagPanel.position.set(930, 400);
    this.bagLayer.position.set(8, 4);
    this.bagPanel.content.addChild(this.bagLayer);
    this.addChild(this.bagPanel);

    const settingsBtn = new Button('⚙', this.game.sfx, {
      width: 52,
      height: 42,
      variant: 'ghost',
      onClick: () => this.openSettings(),
    });
    settingsBtn.position.set(W - 36, 38);

    const recruitBtn = new Button('🎰  RECRUIT', this.game.sfx, {
      width: 145,
      height: 50,
      variant: 'secondary',
      onClick: () => this.game.goto(new SlotScene(this.game)),
    });
    recruitBtn.position.set(1005, 660);

    this.battleBtn = new Button('⚔  BATTLE', this.game.sfx, {
      width: 170,
      height: 54,
      onClick: () => this.game.goto(new BattlefieldScene(this.game)),
    });
    this.battleBtn.position.set(1170, 660);
    this.addChild(settingsBtn, recruitBtn, this.battleBtn);

    this.benchLayer.position.set(30, H - 130);
    this.addChild(this.benchLayer, this.dragLayer);
    this.rebuild();
  }

  private rebuild(): void {
    const run = this.run;
    this.legendaryCards = [];
    this.slotLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.benchLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.dragLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.drawBag();

    // slots
    for (let slot = 0; slot < Balance.team.maxSize; slot++) {
      const front = slot < Balance.team.frontSlots;
      const x = front ? SLOT_XS_FRONT[slot]! : SLOT_XS_BACK[slot - Balance.team.frontSlots]!;
      const y = front ? FRONT_Y : BACK_Y;
      const rosterIdx = run.team[slot];

      const outline = new Graphics()
        .roundRect(x - SLOT_W / 2, y - SLOT_H / 2, SLOT_W, SLOT_H, 10)
        .fill({ color: Palette.panel, alpha: rosterIdx === null ? 0.5 : 0.001 })
        .stroke({
          color: this.selectedSlot === slot ? Palette.gold : this.selectedBench !== null ? Palette.blue : Palette.border,
          width: this.selectedSlot === slot || this.selectedBench !== null ? 2.5 : 1.5,
        });
      outline.eventMode = 'static';
      outline.cursor = 'pointer';
      outline.on('pointerdown', () => this.onSlotClick(slot));
      this.slotLayer.addChild(outline);

      if (rosterIdx === null || rosterIdx === undefined) {
        const plus = new Text({ text: '+', style: Type.h1() });
        plus.style.fill = Palette.textFaint;
        plus.anchor.set(0.5);
        plus.position.set(x, y);
        plus.eventMode = 'none';
        this.slotLayer.addChild(plus);
      } else {
        const entry = run.roster[rosterIdx]!;
        const def = getCharacter(entry.defId);
        const card = new CharacterCard(def, { mode: 'roster', level: entry.level, hpPct: entry.hpPct, heldItemId: entry.heldItemId });
        card.scale.set(SLOT_SCALE);
        card.position.set(x, y);
        card.eventMode = 'static';
        card.cursor = 'pointer';
        card.on('pointerdown', (event: FederatedPointerEvent) => {
          if (this.selectedInventory !== null) {
            event.stopPropagation();
            this.equipSelectedItem(rosterIdx);
            return;
          }
          this.beginCardDrag(card, rosterIdx, slot, event);
        });
        if (RarityTier[def.rarity] >= 1) this.legendaryCards.push(card);
        this.slotLayer.addChild(card);
        this.attachInfoChip(card, def, entry.level, this.slotLayer);
        this.attachHeldItemControl(card, rosterIdx, this.slotLayer);

        const remove = new Text({ text: '✖', style: Type.small() });
        remove.style.fill = Palette.danger;
        remove.anchor.set(0.5);
        remove.position.set(x + SLOT_W / 2 - 12, y - SLOT_H / 2 + 12);
        remove.eventMode = 'static';
        remove.cursor = 'pointer';
        remove.on('pointerdown', (e) => {
          e.stopPropagation();
          this.game.sfx.click();
          run.removeFromTeam(slot);
          this.clearSelection();
          this.rebuild();
        });
        this.slotLayer.addChild(remove);
      }
    }

    // bench
    const benched = run.roster.map((entry, idx) => ({ entry, idx })).filter(({ idx }) => !run.team.includes(idx));
    const benchDrop = new Graphics()
      .roundRect(-10, -28, 850, 126, 14)
      .fill({ color: Palette.panel, alpha: 0.42 })
      .stroke({ color: Palette.borderLight, width: 1.5 });
    const benchTitle = new Text({ text: 'BENCH  -  DRAG ACTIVE LEGENDS HERE', style: Type.tiny() });
    benchTitle.style.fill = Palette.gold;
    benchTitle.position.set(0, -19);
    this.benchLayer.addChild(benchDrop, benchTitle);
    const bScale = 0.48;
    benched.forEach(({ entry, idx }, i) => {
      const def = getCharacter(entry.defId);
      const card = new CharacterCard(def, { mode: 'roster', level: entry.level, hpPct: entry.hpPct, showCost: true, heldItemId: entry.heldItemId });
      card.scale.set(bScale);
      card.position.set((CARD_W * bScale) / 2 + i * (CARD_W * bScale + 10), (CARD_H * bScale) / 2);
      if (RarityTier[def.rarity] >= 1) this.legendaryCards.push(card);
      card.eventMode = 'static';
      card.cursor = 'pointer';
      if (this.selectedBench === idx) {
        const ring = new Graphics().roundRect(-4, -4, CARD_W + 8, CARD_H + 8, 12).stroke({ color: Palette.gold, width: 5 });
        card.addChild(ring);
      }
      card.on('pointerdown', (event: FederatedPointerEvent) => {
        if (this.selectedInventory !== null) {
          event.stopPropagation();
          this.equipSelectedItem(idx);
          return;
        }
        this.beginCardDrag(card, idx, null, event);
      });
      this.benchLayer.addChild(card);
      this.attachInfoChip(card, def, entry.level, this.benchLayer);
      this.attachHeldItemControl(card, idx, this.benchLayer);
    });

    // synergies
    this.synergyPanel.content.removeChildren().forEach((c) => c.destroy({ children: true }));
    const active = computeSynergies(run.teamDefs());
    if (active.length === 0) {
      const none = new Text({ text: 'No active synergies yet.\nShared tags unlock team bonuses.', style: Type.bodyDim() });
      none.position.set(16, 16);
      this.synergyPanel.content.addChild(none);
    }
    active.slice(0, 6).forEach((syn, i) => {
      const row = new Container();
      const icon = new Text({ text: syn.def.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 20 } });
      const name = new Text({ text: `${syn.def.name}  ${syn.count}/${syn.def.thresholds[syn.tierIndex]?.count}`, style: Type.h3() });
      name.position.set(34, 0);
      const desc = new Text({ text: syn.desc, style: Type.small() });
      desc.style.fill = Palette.success;
      desc.position.set(34, 20);
      row.position.set(16, 14 + i * 42);
      row.addChild(icon, name, desc);
      this.synergyPanel.content.addChild(row);
    });

    const cost = run.teamCost();
    this.costText.text = `TEAM COST  ${cost} / ${run.teamCostCap}     ·     ${run.teamSize()}/5`;
    this.costText.style.fill = cost >= run.teamCostCap ? Palette.danger : Palette.text;
    this.battleBtn.setEnabled(run.teamSize() > 0);
  }

  private drawBag(): void {
    this.bagLayer.removeChildren().forEach((child) => child.destroy({ children: true }));
    if (this.selectedInventory !== null && this.selectedInventory >= this.run.inventory.length) this.selectedInventory = null;

    const pageSize = 4;
    const maxPage = Math.max(0, Math.ceil(this.run.inventory.length / pageSize) - 1);
    this.bagPage = Math.min(this.bagPage, maxPage);
    const hint = new Text({
      text: this.run.inventory.length === 0
        ? 'Purchased equipment appears here.'
        : this.selectedInventory === null
          ? 'TAP CARD TO EQUIP · TAP i FOR STATS'
          : 'GEAR SELECTED · TAP A LEGEND TO EQUIP',
      style: Type.small(),
    });
    hint.style.fill = this.selectedInventory === null ? Palette.textDim : Palette.gold;
    hint.position.set(4, 1);
    if (hint.width > 306) hint.scale.set(306 / hint.width);
    this.bagLayer.addChild(hint);

    const scale = 0.44;
    const start = this.bagPage * pageSize;
    this.run.inventory.slice(start, start + pageSize).forEach((id, visibleIndex) => {
      const inventoryIndex = start + visibleIndex;
      const item = getShopItem(id);
      const selected = this.selectedInventory === inventoryIndex;
      const card = new ItemCard(item, { selected, footer: selected ? 'SELECTED' : 'TAP TO EQUIP' });
      card.scale.set(scale);
      card.position.set(38 + visibleIndex * 76, 80);
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.on('pointerdown', (event) => {
        event.stopPropagation();
        this.game.sfx.click();
        this.selectedInventory = selected ? null : inventoryIndex;
        this.drawBag();
      });
      this.bagLayer.addChild(card);

      const info = new Container();
      const infoBg = new Graphics().circle(0, 0, 10).fill({ color: Palette.black, alpha: 0.9 }).stroke({ color: Palette.gold, width: 1.4 });
      const infoText = new Text({ text: 'i', style: { fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 'bold', fill: Palette.gold } });
      infoText.anchor.set(0.5);
      info.addChild(infoBg, infoText);
      info.position.set(
        card.x + (ITEM_CARD_W / 2 - 13) * scale,
        card.y - (ITEM_CARD_H / 2 - 13) * scale,
      );
      info.eventMode = 'static';
      info.cursor = 'pointer';
      info.on('pointerdown', (event) => {
        event.stopPropagation();
        this.game.sfx.click();
        this.openItemInfo(item);
      });
      this.bagLayer.addChild(info);
    });

    if (maxPage > 0) {
      const page = new Text({ text: `PAGE ${this.bagPage + 1}/${maxPage + 1}`, style: Type.tiny() });
      page.anchor.set(0.5);
      page.position.set(254, 151);
      const prev = new Button('‹', this.game.sfx, {
        width: 34, height: 28, variant: 'ghost',
        onClick: () => { this.bagPage = Math.max(0, this.bagPage - 1); this.selectedInventory = null; this.drawBag(); },
      });
      prev.position.set(204, 151);
      prev.setEnabled(this.bagPage > 0);
      const next = new Button('›', this.game.sfx, {
        width: 34, height: 28, variant: 'ghost',
        onClick: () => { this.bagPage = Math.min(maxPage, this.bagPage + 1); this.selectedInventory = null; this.drawBag(); },
      });
      next.position.set(304, 151);
      next.setEnabled(this.bagPage < maxPage);
      this.bagLayer.addChild(prev, page, next);
    }
  }

  private equipSelectedItem(rosterIdx: number): void {
    if (this.selectedInventory === null) return;
    const id = this.run.inventory[this.selectedInventory];
    if (!id) return;
    const item = getShopItem(id);
    const def = getCharacter(this.run.roster[rosterIdx]!.defId);
    if (!this.run.equipInventoryItem(this.selectedInventory, rosterIdx)) return;
    this.game.sfx.reveal(1);
    this.game.toast(`${def.name} equipped ${item.name}`, Palette.gold);
    this.selectedInventory = null;
    this.rebuild();
  }

  private attachHeldItemControl(card: CharacterCard, rosterIdx: number, layer: Container): void {
    const entry = this.run.roster[rosterIdx];
    if (!entry?.heldItemId) return;
    const item = getShopItem(entry.heldItemId);
    const control = new Container();
    const bg = new Graphics().circle(0, 0, 12)
      .fill({ color: Palette.black, alpha: 0.9 })
      .stroke({ color: Palette.gold, width: 1.5 });
    const icon = new Text({ text: '↩', style: Type.h3() });
    icon.style.fontSize = 13;
    icon.style.fill = Palette.gold;
    icon.anchor.set(0.5);
    control.addChild(bg, icon);
    control.position.set(
      card.x - (CARD_W / 2 - 13) * card.scale.x,
      card.y - (CARD_H / 2 - 13) * card.scale.y,
    );
    control.eventMode = 'static';
    control.cursor = 'pointer';
    control.on('pointerdown', (event) => {
      event.stopPropagation();
      if (!this.run.unequipItem(rosterIdx)) return;
      this.game.sfx.click();
      this.game.toast(`${item.name} returned to the Bag`, Palette.success);
      this.selectedInventory = null;
      this.rebuild();
    });
    layer.addChild(control);
  }
  private beginCardDrag(card: CharacterCard, rosterIdx: number, fromSlot: number | null, event: FederatedPointerEvent): void {
    event.stopPropagation();
    if (this.dragRosterIdx !== null) return;
    this.game.sfx.click();
    const local = this.dragLayer.toLocal(card.getGlobalPosition());
    this.dragLayer.addChild(card);
    card.position.copyFrom(local);
    card.alpha = 0.92;
    card.cursor = 'grabbing';
    this.dragRosterIdx = rosterIdx;
    this.dragFromSlot = fromSlot;
    this.dragCard = card;
  }

  private finishCardDrag(event: FederatedPointerEvent): void {
    const rosterIdx = this.dragRosterIdx;
    const fromSlot = this.dragFromSlot;
    if (rosterIdx === null) return;
    const point = event.getLocalPosition(this);
    let targetSlot = -1;
    for (let slot = 0; slot < Balance.team.maxSize; slot++) {
      const front = slot < Balance.team.frontSlots;
      const x = front ? SLOT_XS_FRONT[slot]! : SLOT_XS_BACK[slot - Balance.team.frontSlots]!;
      const y = front ? FRONT_Y : BACK_Y;
      if (Math.abs(point.x - x) <= SLOT_W / 2 + 18 && Math.abs(point.y - y) <= SLOT_H / 2 + 18) {
        targetSlot = slot;
        break;
      }
    }
    if (fromSlot !== null && point.y >= H - 176) {
      this.run.removeFromTeam(fromSlot);
      this.game.toast('Legend moved to the bench', Palette.gold);
    } else if (targetSlot >= 0 && !this.run.assign(rosterIdx, targetSlot)) {
      this.game.sfx.error();
      this.game.toast('Over the cost cap - bench another legend first', Palette.danger);
    }
    this.dragRosterIdx = null;
    this.dragFromSlot = null;
    this.dragCard = null;
    this.clearSelection();
    this.rebuild();
  }

  private onSlotClick(slot: number): void {
    const run = this.run;
    if (this.selectedBench !== null) {
      if (run.assign(this.selectedBench, slot)) {
        this.game.sfx.click();
      } else {
        this.game.sfx.error();
        this.game.toast('Over the cost cap — remove someone first', Palette.danger);
      }
      this.clearSelection();
      this.rebuild();
      return;
    }
    if (this.selectedSlot !== null && this.selectedSlot !== slot) {
      const idx = run.team[this.selectedSlot];
      if (idx !== null && idx !== undefined) run.assign(idx, slot);
      this.game.sfx.click();
      this.clearSelection();
      this.rebuild();
      return;
    }
    if (run.team[slot] !== null) {
      this.game.sfx.click();
      this.selectedSlot = this.selectedSlot === slot ? null : slot;
      this.selectedBench = null;
      this.rebuild();
    }
  }

  private clearSelection(): void {
    this.selectedBench = null;
    this.selectedSlot = null;
  }

  /**
   * Small ⓘ chip at a card's portrait corner that opens the full character
   * sheet. Added as a SIBLING above the card (not a child): nested interactive
   * containers lose the hit-test to the interactive card, siblings never do.
   */
  private attachInfoChip(card: CharacterCard, def: CharacterDef, level: number, layer: Container): void {
    const chip = new Container();
    const bg = new Graphics().circle(0, 0, 13).fill({ color: Palette.black, alpha: 0.72 }).stroke({ color: Palette.gold, width: 1.5 });
    const label = new Text({ text: 'i', style: { fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 'bold', fill: Palette.gold } });
    label.anchor.set(0.5);
    chip.addChild(bg, label);
    chip.position.set(
      card.x + (CARD_W - 17 - CARD_W / 2) * card.scale.x,
      card.y + (99 - CARD_H / 2) * card.scale.y,
    );
    chip.eventMode = 'static';
    chip.hitArea = new Circle(0, 0, 17);
    chip.cursor = 'pointer';
    chip.on('pointerdown', (e) => {
      e.stopPropagation();
      this.game.sfx.click();
      this.openInfo(def, level);
    });
    layer.addChild(chip);
  }

  private openItemInfo(item: ReturnType<typeof getShopItem>): void {
    const modal = new ItemInfoModal(item, this.game.sfx, () => {
      this.removeChild(modal);
      modal.destroy({ children: true });
    });
    this.addChild(modal);
  }
  private openEnemyInfo(def: CharacterDef, level: number): void {
    this.game.sfx.click();
    const modal = new CharacterInfoModal(def, level, this.game.sfx, () => {
      this.removeChild(modal);
      modal.destroy({ children: true });
    }, null);
    this.addChild(modal);
  }

  private threatLabel(): string {
    const scale = (1 + Balance.tower.scalePerFloor * (this.run.floor - 1)) * Balance.difficulty[this.run.difficulty];
    const levelDelta = Balance.difficultyLevelBonus[this.run.difficulty];
    const rewardPct = Math.round((Balance.difficultyReward[this.run.difficulty] - 1) * 100);
    const levelText = levelDelta === 0 ? '' : ` · ENEMY LV ${levelDelta > 0 ? '+' : ''}${levelDelta}`;
    const coinText = rewardPct === 0 ? '' : ` · COINS ${rewardPct > 0 ? '+' : ''}${rewardPct}%`;
    return `Enemy power x${scale.toFixed(2)} · ${this.run.difficulty.toUpperCase()}${levelText}${coinText}`;
  }
  private openSettings(): void {
    const modal = new SettingsModal(this.game, () => {
      this.removeChild(modal);
      modal.destroy({ children: true });
      this.threatText.text = this.threatLabel();
    });
    this.addChild(modal);
  }

  private openInfo(def: CharacterDef, level: number): void {
    const rosterIndex = this.run.roster.findIndex((entry) => entry.defId === def.id);
    const entry = rosterIndex >= 0 ? this.run.roster[rosterIndex] : undefined;
    const heldItemId = entry?.heldItemId ?? null;
    let modal: CharacterInfoModal;
    const close = () => {
      this.removeChild(modal);
      modal.destroy({ children: true });
    };
    modal = new CharacterInfoModal(def, level, this.game.sfx, close, heldItemId, entry ? {
      cost: this.run.trainingCost(rosterIndex),
      canAfford: this.run.gold >= this.run.trainingCost(rosterIndex),
      atMax: entry.level >= Balance.level.max,
      onTrain: () => {
        const result = this.run.trainRosterMember(rosterIndex);
        if (result !== 'trained') return;
        close();
        this.game.toast(`${def.name} reached level ${entry.level} and fully recovered`, Palette.success);
        this.rebuild();
      },
    } : null);
    this.addChild(modal);
  }
  override update(dt: number): void {
    for (const card of this.legendaryCards) card.updatePulse(dt);
    for (const card of this.scoutCards) card.updatePulse(dt);
  }
}
