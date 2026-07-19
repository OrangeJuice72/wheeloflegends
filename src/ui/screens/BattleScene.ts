/**
 * Battle stage: replays the pre-computed BattleEvent stream on a scaled clock.
 * Pause/1x/2x/3x only change the clock rate — outcomes were decided by the sim.
 */

import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { Tweens, Easing } from '../../core/Tween';
import { Balance } from '../../data/balance';
import { getCharacter } from '../../data/characters';
import { WEAKNESS_LABEL } from '../../data/characterRules';
import { getFranchise } from '../../data/franchises';
import { getBattlefield } from '../../data/battlefields';
import type { BattleAbilitySlot, BattleChoice, CombatantSpec } from '../../sim/battle';
import type { CharacterDef, StatusKind } from '../../data/types';
import { simulateBattle } from '../../sim/battle';
import type { BattleEvent, BattleResult, Side } from '../../sim/events';
import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { CharacterCard } from '../components/CharacterCard';
import { FxLayer } from '../fx/effects';
import { BattleBackdrop } from '../fx/BattleBackdrop';
import { Fonts, mix, Palette, Type } from '../theme';
import { RewardScene } from './RewardScene';
import { buildPortrait } from '../portraits';
import { SummaryScene } from './SummaryScene';

const CARD_SCALE = 0.82;
const FRONT_YS = [198, 368, 538];
const BACK_YS = [283, 453];
const PLAYER_FRONT_X = 475;
const PLAYER_BACK_X = 340;
const ENEMY_FRONT_X = 805;
const ENEMY_BACK_X = 940;

interface UnitView {
  uid: string;
  card: CharacterCard;
  name: string;
  def: CharacterDef;
  side: Side;
  statuses: { kind: StatusKind; until: number }[];
  alive: boolean;
}

export class BattleScene extends Scene {
  private fx = new FxLayer();
  private result!: BattleResult;
  private views = new Map<string, UnitView>();
  private clock = -1.0; // intro delay before t=0
  private speed = 1;
  private pausedSpeed: number | null = null;
  private eventIndex = 0;
  private finished = false;
  private activeAttack = new Map<string, { fx: string; color: number }>();
  private logPanel!: Panel;
  private logLines: Container[] = [];
  private banner: Container | null = null;
  private speedButtons: Button[] = [];
  private autoButton!: Button;
  private autoMode = false;
  private playerSpecs: CombatantSpec[] = [];
  private enemySpecs: CombatantSpec[] = [];
  private battleSeed = 0;
  private choices: BattleChoice[] = [];
  private handledPlayerTurns = 0;
  private pendingDecision: { event: Extract<BattleEvent, { kind: 'choice' }>; eventIndex: number; resumeSpeed: number } | null = null;
  private decisionPanel = new Container();
  private decisionTitle!: Text;
  private decisionButtons = new Map<BattleAbilitySlot, Button>();
  private decisionMeta = new Map<BattleAbilitySlot, Text>();
  private cardLayer = new Container();
  private backdrop!: BattleBackdrop;

  constructor(game: Game) {
    super(game);
  }

  private get run() {
    const run = this.game.run;
    if (!run) throw new Error('BattleScene requires an active run');
    return run;
  }

  onEnter(): void {
    this.speed = this.game.meta.defaultBattleSpeed;
    this.autoMode = this.game.meta.defaultAutoBattle;
    const run = this.run;
    const floor = run.currentFloor();
    const field = getBattlefield(run.battlefieldId ?? 'sky-garden');
    const empower = (spec: CombatantSpec): CombatantSpec => {
      const franchise = getCharacter(spec.defId).franchise;
      return field.affinityFranchises.includes(franchise)
        ? { ...spec, statScale: spec.statScale * (1 + field.boost) }
        : spec;
    };
    this.playerSpecs = run.playerSpecs().map(empower);
    this.enemySpecs = floor.enemies.map(empower);
    this.battleSeed = run.nextBattleSeed();
    this.result = this.simulateCurrentBattle();
    this.game.sfx.battleStart(floor.isBoss);

    this.backdrop = new BattleBackdrop(field, floor.isBoss, this.game.visibleDesignWidth, this.game.visibleDesignHeight);
    this.addChild(this.backdrop);

    // header
    const title = new Text({ text: `TOWER CLIMB — FLOOR ${run.floor}`, style: Type.h2() });
    title.anchor.set(0.5, 0);
    title.position.set(640, 14);
    const sub = new Text({ text: `${floor.title}  ·  ${field.name}`, style: Type.small() });
    sub.anchor.set(0.5, 0);
    sub.style.fill = floor.isBoss ? Palette.danger : Palette.textDim;
    sub.position.set(640, 46);
    this.addChild(title, sub);

    // decade progress pips (floor N within its block of ten)
    const pips = new Graphics();
    const decadeStart = Math.floor((run.floor - 1) / 10) * 10;
    for (let i = 1; i <= 10; i++) {
      const floorNum = decadeStart + i;
      const x = 640 + (i - 5.5) * 30;
      const y = 78;
      const isCurrent = floorNum === run.floor;
      const isBossPip = floorNum % Balance.tower.bossEvery === 0;
      const done = floorNum < run.floor;
      pips
        .circle(x, y, isCurrent ? 10 : 7)
        .fill(isCurrent ? Palette.gold : done ? mix(Palette.gold, Palette.black, 0.45) : Palette.panel)
        .stroke({ color: isBossPip ? Palette.danger : Palette.borderLight, width: isCurrent ? 2 : 1.2 });
      if (i < 10) pips.moveTo(x + (isCurrent ? 10 : 7), y).lineTo(x + 30 - 7, y).stroke({ color: Palette.border, width: 1.2 });
      const num = new Text({ text: `${floorNum}`, style: Type.tiny() });
      num.style.fill = isCurrent ? Palette.black : Palette.textDim;
      num.anchor.set(0.5);
      num.position.set(x, y);
      this.addChild(num);
    }
    this.addChildAt(pips, this.children.indexOf(this.backdrop) + 1);

    this.addChild(this.cardLayer);

    // speed controls
    const speeds: { label: string; value: number }[] = [
      { label: '⏸', value: -1 },
      { label: '1×', value: 1 },
      { label: '2×', value: 2 },
      { label: '3×', value: 3 },
    ];
    speeds.forEach((s, i) => {
      const btn = new Button(s.label, this.game.sfx, {
        width: 52,
        height: 44,
        variant: 'ghost',
        onClick: () => this.setSpeed(s.value),
      });
      btn.position.set(1046 + i * 60, 44);
      this.speedButtons.push(btn);
      this.addChild(btn);
    });
    this.refreshSpeedButtons();

    this.autoButton = new Button('AUTO OFF', this.game.sfx, {
      width: 116,
      height: 44,
      variant: 'secondary',
      onClick: () => this.setAutoMode(!this.autoMode),
    });
    this.autoButton.position.set(950, 44);
    this.addChild(this.autoButton);
    this.refreshAutoButton();

    // combat log
    this.logPanel = new Panel(258, 520, 'Live Combat Feed');
    this.logPanel.position.set(1012, 84);
    this.addChild(this.logPanel);

    // player synergy chips
    const synergies = this.result.events.filter((e): e is Extract<BattleEvent, { kind: 'synergy' }> => e.kind === 'synergy' && e.side === 'player');
    if (synergies.length > 0) {
      const panel = new Panel(258, 40 + synergies.length * 40, 'Synergy');
      panel.position.set(12, 84);
      synergies.forEach((syn, i) => {
        const icon = new Text({ text: syn.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 18 } });
        icon.position.set(14, 12 + i * 40);
        const name = new Text({ text: syn.name, style: Type.body() });
        name.position.set(44, 10 + i * 40);
        const desc = new Text({ text: syn.desc, style: Type.small() });
        desc.style.fill = Palette.success;
        desc.position.set(44, 28 + i * 40);
        panel.content.addChild(icon, name, desc);
      });
      this.addChild(panel);
    }

    // spawn cards from spawn events
    for (const e of this.result.events) {
      if (e.kind !== 'spawn') continue;
      const def = getCharacter(e.defId);
      const card = new CharacterCard(def, { mode: 'battle', level: e.level, mirror: e.side === 'enemy' });
      const pos = this.slotPos(e.side, e.slot);
      card.setBattlePose(pos.x, pos.y, CARD_SCALE * (e.boss ? 1.12 : 1));
      card.initHp(e.hp, e.maxHp);
      this.cardLayer.addChild(card);
      this.views.set(e.uid, { uid: e.uid, card, name: def.name, def, side: e.side, statuses: [], alive: true });

      // entrance: slide in from the side
      const fromX = e.side === 'player' ? pos.x - 260 : pos.x + 260;
      card.x = fromX;
      card.alpha = 0;
      Tweens.to(card, { x: pos.x, alpha: 1 }, { duration: 0.45, delay: 0.08 * e.slot + (e.side === 'enemy' ? 0.15 : 0), ease: Easing.backOut });
    }

    this.addChild(this.fx);
    this.buildDecisionPanel();

    if (floor.isBoss) {
      Tweens.delay(0.55, () => this.showBanner(floor.title, Palette.danger));
    }
  }

  private slotPos(side: Side, slot: number): { x: number; y: number } {
    const front = slot < 3;
    if (side === 'player') {
      return front ? { x: PLAYER_FRONT_X, y: FRONT_YS[slot]! } : { x: PLAYER_BACK_X, y: BACK_YS[slot - 3]! };
    }
    return front ? { x: ENEMY_FRONT_X, y: FRONT_YS[slot]! } : { x: ENEMY_BACK_X, y: BACK_YS[slot - 3]! };
  }


  private simulateCurrentBattle(): BattleResult {
    return simulateBattle(this.playerSpecs, this.enemySpecs, this.battleSeed, {
      manual: !this.autoMode,
      choices: this.choices,
    });
  }

  private setAutoMode(on: boolean): void {
    const replayIndex = this.pendingDecision?.eventIndex ?? this.eventIndex;
    const resumeSpeed = this.pendingDecision?.resumeSpeed ?? (this.speed || 1);
    this.autoMode = on;
    this.result = this.simulateCurrentBattle();
    this.eventIndex = replayIndex;
    this.pendingDecision = null;
    this.decisionPanel.visible = false;
    this.speed = resumeSpeed;
    this.pausedSpeed = null;
    this.refreshAutoButton();
    this.refreshSpeedButtons();
    this.log(on ? 'Auto battle enabled' : 'Manual commands enabled', on ? Palette.blue : Palette.gold, 'system');
  }

  private refreshAutoButton(): void {
    if (!this.autoButton) return;
    this.autoButton.setLabel(this.autoMode ? 'AUTO ON' : 'AUTO OFF');
    this.autoButton.alpha = this.autoMode ? 1 : 0.72;
  }

  private buildDecisionPanel(): void {
    const width = 880;
    const bg = new Graphics()
      .roundRect(0, 0, width, 102, 16)
      .fill({ color: Palette.black, alpha: 0.9 })
      .stroke({ color: Palette.gold, width: 2 })
      .roundRect(5, 5, width - 10, 92, 12)
      .stroke({ color: Palette.borderLight, width: 1 });
    this.decisionTitle = new Text({ text: '', style: Type.h3() });
    this.decisionTitle.anchor.set(0.5, 0);
    this.decisionTitle.position.set(width / 2, 8);
    this.decisionPanel.addChild(bg, this.decisionTitle);

    const slots: BattleAbilitySlot[] = ['basic', 'skill', 'ult', 'charge', 'item'];
    slots.forEach((slot, index) => {
      const button = new Button(slot.toUpperCase(), this.game.sfx, {
        width: 156,
        height: 44,
        variant: slot === 'ult' ? 'primary' : 'secondary',
        onClick: () => this.chooseAbility(slot),
      });
      button.position.set(100 + index * 170, 74);
      const meta = new Text({ text: '', style: Type.tiny() });
      meta.anchor.set(0.5);
      meta.position.set(100 + index * 170, 42);
      this.decisionButtons.set(slot, button);
      this.decisionMeta.set(slot, meta);
      this.decisionPanel.addChild(meta, button);
    });

    this.decisionPanel.position.set(200, 614);
    this.decisionPanel.visible = false;
    this.addChild(this.decisionPanel);
  }

  private showDecision(event: Extract<BattleEvent, { kind: 'choice' }>): void {
    const view = this.views.get(event.uid);
    if (!view) return;
    this.pendingDecision = { event, eventIndex: this.eventIndex, resumeSpeed: this.speed || 1 };
    this.speed = 0;
    this.pausedSpeed = null;
    this.decisionTitle.text = `${view.name.toUpperCase()}'S TURN  ·  ${event.energy} ENERGY`;
    // The ARTIFACT slot only exists for resonant item holders.
    const offered = new Set(event.options.map((option) => option.slot));
    const itemButton = this.decisionButtons.get('item')!;
    const itemMeta = this.decisionMeta.get('item')!;
    itemButton.visible = offered.has('item');
    itemMeta.visible = offered.has('item');
    for (const option of event.options) {
      const button = this.decisionButtons.get(option.slot)!;
      const meta = this.decisionMeta.get(option.slot)!;
      button.setLabel(option.ability.toUpperCase());
      if (option.slot === 'basic') meta.text = `BASIC  ·  BUILDS ${Balance.battle.energyPerBasic}`;
      else if (option.slot === 'charge') meta.text = `CHARGE  ·  +${Balance.battle.energyPerCharge} ENERGY`;
      else if (option.slot === 'item') meta.text = option.cooldown > 0 ? `ARTIFACT  ·  ${option.cooldown.toFixed(1)}s COOLDOWN` : 'ARTIFACT  ·  READY';
      else if (option.cooldown > 0) meta.text = `SKILL  ·  ${option.cooldown.toFixed(1)}s COOLDOWN`;
      else meta.text = `${option.slot.toUpperCase()}  ·  ${option.energyCost} ENERGY`;
      meta.style.fill = option.available ? option.slot === 'ult' ? Palette.gold : option.slot === 'item' ? Palette.blue : Palette.text : Palette.textFaint;
      button.setEnabled(option.available);
    }
    this.decisionPanel.visible = true;
    this.refreshSpeedButtons();
  }

  private chooseAbility(slot: BattleAbilitySlot): void {
    const pending = this.pendingDecision;
    if (!pending) return;
    const option = pending.event.options.find((candidate) => candidate.slot === slot);
    if (!option?.available) return;
    this.choices.push({ uid: pending.event.uid, slot });
    this.result = this.simulateCurrentBattle();
    this.eventIndex = pending.eventIndex;
    this.pendingDecision = null;
    this.decisionPanel.visible = false;
    this.speed = pending.resumeSpeed;
    this.refreshSpeedButtons();
  }
  private setSpeed(value: number): void {
    if (this.pendingDecision) return;
    if (value === -1) {
      if (this.pausedSpeed === null) {
        this.pausedSpeed = this.speed || 1;
        this.speed = 0;
      } else {
        this.speed = this.pausedSpeed;
        this.pausedSpeed = null;
      }
    } else {
      this.speed = value;
      this.pausedSpeed = null;
    }
    this.refreshSpeedButtons();
  }

  private refreshSpeedButtons(): void {
    const labels = ['⏸', '1×', '2×', '3×'];
    const values = [-1, 1, 2, 3];
    this.speedButtons.forEach((btn, i) => {
      const active = values[i] === -1 ? this.pausedSpeed !== null : this.speed === values[i];
      btn.setLabel(values[i] === -1 && this.pausedSpeed !== null ? '▶' : labels[i]!);
      btn.setEnabled(!this.pendingDecision);
      btn.alpha = this.pendingDecision ? 0.35 : active ? 1 : 0.55;
    });
  }

  private log(
    text: string,
    color: number = Palette.textDim,
    kind: 'action' | 'damage' | 'status' | 'system' = 'action',
  ): void {
    const row = new Container();
    const iconMap = { action: '>', damage: '!', status: '+', system: '#' } as const;
    const label = new Text({ text, style: Type.small() });
    label.style.fill = color;
    label.style.wordWrap = true;
    label.style.wordWrapWidth = 164;
    label.position.set(48, 7);
    const time = new Text({ text: `${Math.max(0, this.clock).toFixed(1)}s`, style: Type.tiny() });
    time.style.fill = Palette.textFaint;
    time.position.set(8, 9);
    const icon = new Text({ text: iconMap[kind], style: Type.h3() });
    icon.style.fill = color;
    icon.anchor.set(0.5);
    icon.position.set(39, 16);
    const height = Math.max(32, label.height + 14);
    const bg = new Graphics().roundRect(0, 0, 226, height, 7)
      .fill({ color: kind === 'system' ? mix(color, Palette.black, 0.82) : Palette.black, alpha: kind === 'system' ? 0.62 : 0.35 })
      .rect(0, 0, 3, height).fill({ color, alpha: 0.85 });
    row.addChild(bg, time, icon, label);
    this.logLines.unshift(row);
    this.logPanel.content.addChild(row);
    if (this.logLines.length > 11) {
      const old = this.logLines.pop()!;
      this.logPanel.content.removeChild(old);
      old.destroy({ children: true });
    }
    let y = 8;
    for (const line of this.logLines) {
      line.position.set(14, y);
      y += line.height + 5;
    }
  }

  private specialFont(def: CharacterDef): string {
    if (def.tags.includes('magic') || def.tags.includes('royal')) return Fonts.SERIF;
    return Fonts.SANS;
  }

  private showBanner(text: string, color: number, view?: UnitView, subtitle = 'SPECIAL'): void {
    if (this.banner) {
      this.removeChild(this.banner);
      this.banner.destroy({ children: true });
    }
    const wrap = new Container();
    const accent = view ? mix(color, getFranchise(view.def.franchise).color, 0.35) : color;
    const bg = new Graphics()
      .poly([-390, -58, 350, -58, 390, -30, 390, 58, -350, 58, -390, 30])
      .fill({ color: Palette.black, alpha: 0.9 })
      .stroke({ color: accent, width: 3, alpha: 0.95 })
      .poly([-380, -48, 342, -48, 374, -25])
      .stroke({ color: mix(accent, Palette.white, 0.35), width: 1.5, alpha: 0.7 })
      .poly([350, -58, 390, -30, 365, -22, 332, -48]).fill({ color: accent, alpha: 0.7 })
      .poly([-350, 58, -390, 30, -365, 22, -332, 48]).fill({ color: accent, alpha: 0.45 });
    wrap.addChild(bg);

    if (view) {
      const portrait = buildPortrait(view.def, 118, 104, view.side === 'enemy');
      portrait.position.set(-374, -52);
      const mask = new Graphics().roundRect(-374, -52, 118, 104, 8).fill(Palette.white);
      portrait.mask = mask;
      const frame = new Graphics().roundRect(-374, -52, 118, 104, 8)
        .stroke({ color: accent, width: 3 })
        .roundRect(-369, -47, 108, 94, 6).stroke({ color: Palette.white, width: 1, alpha: 0.35 });
      const name = new Text({ text: view.name.toUpperCase(), style: Type.tiny() });
      name.style.fill = accent;
      name.position.set(-238, -42);
      const franchise = new Text({ text: getFranchise(view.def.franchise).name, style: Type.tiny() });
      franchise.style.fill = Palette.textDim;
      franchise.anchor.set(1, 0);
      franchise.position.set(334, -42);
      const label = new Text({
        text,
        style: {
          fontFamily: this.specialFont(view.def),
          fontSize: 34,
          fontWeight: '900',
          fontStyle: view.def.tags.includes('magic') ? 'italic' : 'normal',
          fill: Palette.white,
          letterSpacing: view.def.tags.includes('sci-fi') ? 3 : 1,
          stroke: { color: mix(accent, Palette.black, 0.3), width: 4 },
          dropShadow: { color: accent, blur: 12, distance: 0, alpha: 0.55, angle: 0 },
        },
      });
      label.position.set(-238, -14);
      if (label.width > 565) label.scale.set(565 / label.width);
      const slot = new Text({ text: subtitle, style: Type.tiny() });
      slot.style.fill = accent;
      slot.position.set(-236, 30);
      const energyRule = new Graphics().rect(-238, 47, 570, 3).fill({ color: accent, alpha: 0.85 });
      for (let n = 0; n < 5; n++) energyRule.poly([270 + n * 15, 27, 276 + n * 15, 33, 270 + n * 15, 39, 264 + n * 15, 33]).fill({ color: n === 4 ? Palette.white : accent, alpha: 0.9 });
      wrap.addChild(portrait, mask, frame, name, franchise, label, slot, energyRule);
    } else {
      const label = new Text({ text, style: Type.banner(accent) });
      label.anchor.set(0.5);
      if (label.width > 680) label.scale.set(680 / label.width);
      wrap.addChild(label);
    }

    wrap.position.set(640, 300);
    wrap.alpha = 0;
    wrap.scale.set(0.72);
    wrap.eventMode = 'none';
    this.banner = wrap;
    this.addChild(wrap);
    Tweens.to(wrap, { alpha: 1 }, { duration: 0.14 });
    Tweens.to(wrap.scale, { x: 1, y: 1 }, { duration: 0.32, ease: Easing.backOut });
    Tweens.to(wrap, { alpha: 0 }, {
      duration: 0.32,
      delay: view ? 1.25 : 1.0,
      onComplete: () => {
        if (this.banner === wrap) this.banner = null;
        this.removeChild(wrap);
        wrap.destroy({ children: true });
      },
    });
  }

  // -- event handling ──────────────────────────────────────────────────────
  private handle(e: BattleEvent): void {
    switch (e.kind) {
      case 'start':
        this.log('Battle engaged - combatants ready', Palette.gold, 'system');
        break;
      case 'spawn':
      case 'synergy':
        break;
      case 'item': {
        const view = this.views.get(e.uid);
        if (view) this.log(`${view.name} holds ${e.itemName}: ${e.effect}`, Palette.success, 'system');
        break;
      }
      case 'itemProc': {
        const view = this.views.get(e.uid);
        if (!view) break;
        this.fx.focusPulse(view.card.x, view.card.y, Palette.energy);
        this.fx.floatText(view.card.x, view.card.y - 58, 'EXTRA ACTION', { color: Palette.energy, big: true });
        this.log(`${e.itemName} gave ${view.name} an extra action`, Palette.energy, 'system');
        break;
      }
      case 'choice':
        this.showDecision(e);
        break;
      case 'act': {
        const view = this.views.get(e.uid);
        if (!view) break;
        if (view.side === 'player') {
          if (this.choices.length === this.handledPlayerTurns) this.choices.push({ uid: e.uid, slot: e.slot });
          this.handledPlayerTurns++;
        }
        if (e.slot === 'charge') {
          view.card.playShield();
          this.fx.focusPulse(view.card.x, view.card.y, Palette.energy);
          this.fx.floatText(view.card.x, view.card.y - 55, `+${Balance.battle.energyPerCharge} ENERGY`, { color: Palette.energy });
          this.log(`${view.name} skipped the turn and charged energy`, Palette.energy, 'action');
          break;
        }
        view.card.playAct(view.side === 'player' ? 1 : -1, e.slot === 'ult', e.fx);
        this.fx.cast(view.card.x, view.card.y, view.side === 'player' ? 1 : -1, e.fx, e.color, e.slot === 'ult');
        this.activeAttack.set(e.uid, { fx: e.fx, color: e.color });
        this.game.sfx.whoosh(e.slot === 'ult' ? 1.35 : e.slot === 'skill' ? 1 : 0.72);
        if (e.slot === 'ult') {
          this.showBanner(e.ability.toUpperCase(), e.color, view, 'ULTIMATE');
          this.fx.flash(e.color, 0.14);
          this.fx.focusPulse(view.card.x, view.card.y, e.color);
          this.game.sfx.ultBanner();
          this.game.shake(5, 0.3);
          this.log(`${view.name} unleashed ${e.ability}`, mix(e.color, Palette.white, 0.35), 'action');
        } else if (e.slot === 'item') {
          this.showBanner(e.ability.toUpperCase(), e.color, view, 'ARTIFACT');
          this.fx.flash(e.color, 0.1);
          this.fx.focusPulse(view.card.x, view.card.y, e.color);
          this.game.shake(4, 0.25);
          this.log(`${view.name} unleashed the artifact: ${e.ability}`, mix(e.color, Palette.white, 0.35), 'action');
        } else if (e.slot === 'skill') {
          this.log(`${view.name} used ${e.ability}`, Palette.text, 'action');
        }
        if (e.fx === 'beam' || e.fx === 'bolt') {
          if (e.fx === 'beam') this.game.sfx.beam();
          else this.game.sfx.bolt();
        } else if (e.fx === 'nova' || e.fx === 'wave') {
          this.game.sfx.nova();
          const view2 = this.views.get(e.uid);
          if (view2) this.fx.burst(view2.card.x, view2.card.y, { color: e.color, count: 26, speed: 380, size: 0.5 });
        }
        break;
      }
      case 'damage': {
        const target = this.views.get(e.target);
        if (!target) break;
        const source = this.views.get(e.source);
        const hitColor = e.weakness ? Palette.danger : e.crit ? Palette.gold : Palette.white;
        target.card.setHp(e.hpAfter);
        target.card.flashHit(hitColor);
        const attack = source ? this.activeAttack.get(e.source) : undefined;
        if (attack && source && (attack.fx === 'beam' || attack.fx === 'bolt')) {
          if (attack.fx === 'beam') this.fx.beam(source.card.x, source.card.y, target.card.x, target.card.y, attack.color);
          else this.fx.projectile(source.card.x, source.card.y, target.card.x, target.card.y, attack.color);
        } else {
          if (attack && (attack.fx === 'strike' || attack.fx === 'burst')) {
            this.fx.slash(target.card.x, target.card.y, attack.color, target.side === 'player');
          }
          this.fx.burst(target.card.x, target.card.y, { color: hitColor, count: e.crit || e.weakness ? 16 : 8, speed: 220, size: 0.34 });
        }
        this.fx.impactRing(target.card.x, target.card.y, hitColor, e.crit || e.weakness);
        const sub = e.crit && e.weakness ? 'CRITICAL WEAKNESS!' : e.crit ? 'CRITICAL!' : e.weakness ? 'WEAKNESS!' : undefined;
        this.fx.floatText(target.card.x, target.card.y - 50, `-${e.amount.toLocaleString('en-US')}`, {
          color: e.weakness ? Palette.danger : e.crit ? Palette.gold : e.shielded ? Palette.shield : Palette.white,
          big: e.crit || e.weakness,
          ...(sub ? { sub } : {}),
        });
        if (e.weakness) {
          const weakness = WEAKNESS_LABEL[target.def.weakness!];
          this.log(`${e.crit ? 'CRITICAL ' : ''}WEAKNESS: ${source?.name ?? 'Attack'} exploited ${target.name}'s ${weakness}`, Palette.danger, 'damage');
          this.game.shake(e.crit ? 5 : 4, 0.24);
        } else if (e.crit) {
          this.log(`CRITICAL: ${source?.name ?? 'Attack'} dealt ${e.amount.toLocaleString('en-US')} to ${target.name}`, Palette.gold, 'damage');
          this.game.shake(4, 0.22);
        }
        if (e.crit) this.game.sfx.crit();
        else this.game.sfx.hit();
        break;
      }      case 'dodge': {
        const target = this.views.get(e.target);
        if (target) {
          target.card.playDodge(target.side === 'player' ? -1 : 1);
          this.fx.floatText(target.card.x, target.card.y - 50, 'DODGE', { color: Palette.blue });
          this.fx.impactRing(target.card.x, target.card.y, Palette.blue);
          this.log(`${target.name} dodged the attack`, Palette.blue, 'status');
          this.game.sfx.dodge();
        }
        break;
      }
      case 'heal': {
        const target = this.views.get(e.target);
        if (!target) break;
        target.card.setHp(e.hpAfter);
        if (e.amount > 500) {
          target.card.playHeal();
          this.fx.impactRing(target.card.x, target.card.y, Palette.success);
          this.fx.floatText(target.card.x, target.card.y - 50, `+${e.amount.toLocaleString('en-US')}`, { color: Palette.success });
          this.log(`${target.name} recovered ${e.amount.toLocaleString('en-US')} HP`, Palette.success, 'status');
          if (e.source !== e.target) this.game.sfx.heal();
        }
        break;
      }
      case 'shield': {
        const target = this.views.get(e.target);
        if (!target) break;
        target.card.playShield();
        this.fx.impactRing(target.card.x, target.card.y, Palette.shield, true);
        this.fx.floatText(target.card.x, target.card.y - 50, 'SHIELD', { color: Palette.shield });
        this.log(`${target.name} gained a shield`, Palette.shield, 'status');
        this.game.sfx.shield();
        break;
      }
      case 'status': {
        const target = this.views.get(e.target);
        if (!target) break;
        target.statuses.push({ kind: e.status, until: e.t + e.duration });
        this.refreshStatuses(target);
        const src = this.views.get(e.source);
        if (src && (e.status === 'stun' || e.status === 'freeze')) {
          this.log(`${target.name} is ${e.status === 'stun' ? 'stunned' : 'frozen'}`, Palette.blue, 'status');
        }
        break;
      }
      case 'buff': {
        const target = this.views.get(e.target);
        if (!target) break;
        const sign = e.amount >= 0 ? '+' : '';
        this.fx.floatText(target.card.x, target.card.y - 30, `${sign}${Math.round(e.amount * 100)}% ${e.stat.toUpperCase()}`, {
          color: e.amount >= 0 ? Palette.success : Palette.danger,
        });
        break;
      }
      case 'transform': {
        const view = this.views.get(e.uid);
        if (!view) break;
        this.showBanner(e.name.toUpperCase(), Palette.gold, view, 'TRANSFORMATION');
        view.card.playTransform();
        this.fx.flash(Palette.gold, 0.22);
        this.fx.focusPulse(view.card.x, view.card.y, Palette.gold);
        this.fx.impactRing(view.card.x, view.card.y, Palette.gold, true);
        this.fx.burst(view.card.x, view.card.y, { color: Palette.gold, count: 30, speed: 380, size: 0.5 });
        this.game.shake(7, 0.4);
        this.game.sfx.transform();
        this.log(`${view.name} transformed: ${e.name}`, Palette.gold, 'system');
        break;
      }
      case 'death': {
        const view = this.views.get(e.uid);
        if (!view) break;
        view.alive = false;
        view.card.setDead();
        this.fx.impactRing(view.card.x, view.card.y, Palette.danger, true);
        this.fx.burst(view.card.x, view.card.y, { color: Palette.danger, count: 20, speed: 260, size: 0.45 });
        this.game.sfx.death();
        this.game.shake(6, 0.3);
        this.log(`${view.name} has fallen`, Palette.danger, 'damage');
        break;
      }
      case 'tick': {
        for (const snap of e.units) {
          const view = this.views.get(snap.uid);
          if (!view || !view.alive) continue;
          view.card.setHp(snap.hp);
          view.card.setEnergy(snap.energy);
          this.refreshStatuses(view);
        }
        break;
      }
      case 'end':
        this.log(e.winner === 'player' ? 'Victory confirmed' : 'Party defeated', e.winner === 'player' ? Palette.gold : Palette.danger, 'system');
        this.finish(e.winner);
        break;
    }
  }

  private refreshStatuses(view: UnitView): void {
    view.statuses = view.statuses.filter((s) => s.until > this.clock);
    view.card.setStatuses(view.statuses.map((s) => s.kind));
  }

  private finish(winner: Side): void {
    if (this.finished) return;
    this.finished = true;
    const victory = winner === 'player';
    Tweens.delay(0.7, () => {
      this.showBanner(victory ? '⚔  VICTORY  ⚔' : 'DEFEAT', victory ? Palette.gold : Palette.danger);
      if (victory) {
        this.game.sfx.victory();
        this.fx.burst(640, 300, { color: Palette.gold, count: 40, speed: 420, size: 0.5 });
      } else {
        this.game.sfx.defeat();
      }
    });
    Tweens.delay(2.2, () => {
      const run = this.run;
      const won = run.applyBattleResult(this.result);
      if (won) {
        this.game.goto(new RewardScene(this.game));
      } else {
        this.game.meta.bestFloor = Math.max(this.game.meta.bestFloor, run.floor);
        this.game.meta.totalKills += run.kills;
        this.game.saveMeta();
        this.game.goto(new SummaryScene(this.game));
      }
    });
  }

  override onResize(viewportW: number, viewportH: number): void {
    this.backdrop?.resize(viewportW, viewportH);
  }

  override update(dt: number): void {
    this.fx.update(dt);
    this.backdrop.update(dt);
    for (const view of this.views.values()) {
      view.card.updatePulse(dt);
    }
    if (this.finished && this.eventIndex >= this.result.events.length) return;
    this.clock += dt * this.speed;
    const events = this.result.events;
    while (this.eventIndex < events.length && events[this.eventIndex]!.t <= this.clock) {
      this.handle(events[this.eventIndex]!);
      this.eventIndex++;
    }
  }
}
