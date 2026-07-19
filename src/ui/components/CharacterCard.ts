/**
 * The character card — the visual heart of the game. One component serves
 * roster, formation, wheel-reveal, and battle contexts via `mode`.
 */

import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Tweens, Easing } from '../../core/Tween';
import { Balance } from '../../data/balance';
import { getShopItem } from '../../data/items';
import { strengthSummary, WEAKNESS_LABEL } from '../../data/characterRules';
import type { CharacterDef, StatusKind } from '../../data/types';
import { mix, Palette, RarityColor, RarityLabel, RarityTier, Type } from '../theme';
import { glowTexture } from '../fx/textures';
import { buildPortrait } from '../portraits';
import { buildItemIcon } from './ItemIcon';
import { buildRarityIcon } from './RarityIcon';

export const CARD_W = 150;
export const CARD_H = 205;

const STATUS_GLYPH: Record<StatusKind, string> = {
  burn: '🔥',
  shock: '⚡',
  stun: '💫',
  freeze: '❄️',
  regen: '💚',
  taunt: '🛡️',
};

export interface CardOpts {
  mode: 'battle' | 'roster';
  level?: number;
  showCost?: boolean;
  /** Roster mode: show remaining health as a thin strip when damaged. */
  hpPct?: number;
  /** Flip the portrait horizontally (enemy side faces the player). */
  mirror?: boolean;
  /** Equipment currently held by this roster card. */
  heldItemId?: string | null;
  /** Optional dossier action shown as a tappable info badge. */
  onInspect?: () => void;
}

export class CharacterCard extends Container {
  readonly def: CharacterDef;
  private glowSprite: Sprite;
  private frame = new Graphics();
  private hpFill = new Graphics();
  private energyFill = new Graphics();
  private hpText: Text | null = null;
  private statusRow = new Container();
  private deadOverlay: Container | null = null;
  private flashRect = new Graphics();
  private levelBadgeText: Text | null = null;
  private maxHp = 1;
  private shownHp = 1;
  private pulseTime = 0;
  private legendary: boolean;
  private readonly rarityTier: number;
  private readonly fireFrame: boolean;
  private animatedFrameLayer = new Container();
  private framePulse = new Graphics();
  private energyHalo = new Graphics();
  private heatHaze = new Graphics();
  private orbitMotes: Graphics[] = [];
  private fireMotes: Graphics[] = [];
  private battlePose: { x: number; y: number; scale: number; rotation: number } | null = null;
  private motionActive = false;

  constructor(def: CharacterDef, opts: CardOpts) {
    super();
    this.def = def;
    const rarityTier = RarityTier[def.rarity];
    this.rarityTier = rarityTier;
    this.legendary = rarityTier >= 3;
    this.fireFrame = def.id === 'charizard' || def.abilities.some((ability) =>
      ability.effects.some((effect) => effect.kind === 'status' && effect.status === 'burn'));
    const rc = RarityColor[def.rarity];

    // outer glow for epic+ cards
    this.glowSprite = new Sprite(glowTexture());
    this.glowSprite.anchor.set(0.5);
    this.glowSprite.tint = rc;
    this.glowSprite.position.set(CARD_W / 2, CARD_H / 2);
    this.glowSprite.scale.set(1.05);
    this.glowSprite.alpha = rarityTier === 2 ? 0.28 : rarityTier >= 3 ? 0.4 + (rarityTier - 3) * 0.08 : 0;
    this.glowSprite.blendMode = 'add';
    // The halo extends well past the frame; without this it silently widens
    // the card's clickable area and steals clicks from neighbors.
    this.glowSprite.eventMode = 'none';
    this.addChild(this.glowSprite);

    // Supreme and Godlike cards carry a large rotating energy seal behind the frame.
    if (rarityTier >= 4) {
      this.energyHalo
        .ellipse(0, 0, CARD_W / 2 + 9, CARD_H / 2 + 12)
        .stroke({ color: rc, width: rarityTier === 5 ? 2.5 : 2, alpha: 0.58 })
        .poly([0, -CARD_H / 2 - 17, 5, -CARD_H / 2 - 10, 0, -CARD_H / 2 - 4, -5, -CARD_H / 2 - 10])
        .fill({ color: rarityTier === 5 ? Palette.white : rc, alpha: 0.9 });
      if (rarityTier === 5) {
        this.energyHalo.ellipse(0, 0, CARD_W / 2 + 15, CARD_H / 2 + 5)
          .stroke({ color: Palette.white, width: 1.4, alpha: 0.42 });
      }
      this.energyHalo.position.set(CARD_W / 2, CARD_H / 2);
      this.energyHalo.blendMode = 'add';
      this.energyHalo.eventMode = 'none';
      this.addChild(this.energyHalo);
    }

    // ornate frame + body
    const dark = mix(rc, Palette.black, 0.72);
    const metal = mix(rc, Palette.white, 0.28);
    this.frame
      .roundRect(0, 0, CARD_W, CARD_H, 10)
      .fill(dark)
      .stroke({ color: mix(rc, Palette.black, 0.45), width: 5 })
      .roundRect(2.5, 2.5, CARD_W - 5, CARD_H - 5, 8)
      .stroke({ color: rc, width: 2 })
      .roundRect(5, 5, CARD_W - 10, CARD_H - 10, 6)
      .stroke({ color: metal, width: 1, alpha: 0.55 });
    // corner accents (heavier metalwork on higher rarities)
    const accent = this.legendary || def.rarity === 'epic' ? metal : mix(rc, Palette.white, 0.1);
    const cornerLen = 14;
    for (const [cx, cy, sx, sy] of [
      [3, 3, 1, 1],
      [CARD_W - 3, 3, -1, 1],
      [3, CARD_H - 3, 1, -1],
      [CARD_W - 3, CARD_H - 3, -1, -1],
    ] as const) {
      this.frame
        .moveTo(cx, cy + cornerLen * sy)
        .lineTo(cx, cy)
        .lineTo(cx + cornerLen * sx, cy)
        .stroke({ color: accent, width: 2.5 });
    }
    this.addChild(this.frame);

    // Each rarity has its own frame silhouette and ornament language.
    const ornaments = new Graphics();
    if (rarityTier === 0) {
      for (const [x, y] of [[8, 8], [CARD_W - 8, 8], [8, CARD_H - 8], [CARD_W - 8, CARD_H - 8]] as const) {
        ornaments.circle(x, y, 2.4).fill({ color: metal, alpha: 0.8 });
      }
    } else if (rarityTier === 1) {
      ornaments.moveTo(10, 30).lineTo(3, 22).lineTo(10, 14).stroke({ color: rc, width: 3 });
      ornaments.moveTo(CARD_W - 10, 30).lineTo(CARD_W - 3, 22).lineTo(CARD_W - 10, 14).stroke({ color: rc, width: 3 });
    } else if (rarityTier === 2) {
      for (const y of [28, 52, 76]) {
        ornaments.poly([3, y, 8, y + 6, 3, y + 12]).fill({ color: rc, alpha: 0.85 });
        ornaments.poly([CARD_W - 3, y, CARD_W - 8, y + 6, CARD_W - 3, y + 12]).fill({ color: rc, alpha: 0.85 });
      }
    } else if (rarityTier === 3) {
      ornaments.poly([CARD_W / 2 - 22, 6, CARD_W / 2 - 10, 16, CARD_W / 2, 4, CARD_W / 2 + 10, 16, CARD_W / 2 + 22, 6])
        .stroke({ color: metal, width: 3 }).circle(CARD_W / 2, 7, 3).fill(rc);
    } else if (rarityTier === 4) {
      ornaments.moveTo(18, 4).lineTo(38, 4).lineTo(45, 11).moveTo(CARD_W - 18, 4).lineTo(CARD_W - 38, 4).lineTo(CARD_W - 45, 11)
        .moveTo(18, CARD_H - 4).lineTo(38, CARD_H - 4).lineTo(45, CARD_H - 11)
        .moveTo(CARD_W - 18, CARD_H - 4).lineTo(CARD_W - 38, CARD_H - 4).lineTo(CARD_W - 45, CARD_H - 11)
        .stroke({ color: rc, width: 3 });
      ornaments.circle(CARD_W / 2, 6, 4).fill(Palette.white).circle(CARD_W / 2, 6, 7).stroke({ color: rc, width: 2 });
    } else {
      ornaments.poly([CARD_W / 2, 1, CARD_W / 2 + 15, 12, CARD_W / 2, 25, CARD_W / 2 - 15, 12])
        .stroke({ color: Palette.white, width: 2 }).poly([CARD_W / 2, 5, CARD_W / 2 + 9, 12, CARD_W / 2, 20, CARD_W / 2 - 9, 12])
        .fill({ color: rc, alpha: 0.9 });
      ornaments.roundRect(-3, -3, CARD_W + 6, CARD_H + 6, 13).stroke({ color: rc, width: 2, alpha: 0.7 });
    }
    for (let i = 0; i <= rarityTier; i++) {
      const x = CARD_W / 2 + (i - rarityTier / 2) * 11;
      ornaments.poly([x, 111, x + 4, 114, x, 117, x - 4, 114]).fill({ color: i === rarityTier ? Palette.white : rc, alpha: 0.9 });
    }
    ornaments.eventMode = 'none';
    this.addChild(ornaments);

    // portrait window (painted image if provided, else layered vector emblem)
    const portrait = buildPortrait(def, CARD_W - 12, 108, opts.mirror ?? false);
    portrait.position.set(6, 6);
    const pMask = new Graphics().roundRect(6, 6, CARD_W - 12, 108, 7).fill(Palette.white);
    portrait.mask = pMask;
    this.addChild(portrait, pMask);

    // gloss sheen across the portrait's upper half
    const sheen = new Graphics().poly([6, 6, CARD_W - 6, 6, CARD_W - 6, 30, 6, 58]).fill({ color: Palette.white, alpha: 0.06 });
    this.addChild(sheen);

    // name band with gold rules
    const nameBand = new Graphics()
      .roundRect(6, 116, CARD_W - 12, 22, 5)
      .fill({ color: Palette.black, alpha: 0.62 })
      .moveTo(10, 116)
      .lineTo(CARD_W - 10, 116)
      .stroke({ color: metal, width: 1, alpha: 0.5 })
      .moveTo(10, 138)
      .lineTo(CARD_W - 10, 138)
      .stroke({ color: metal, width: 1, alpha: 0.35 });
    const name = new Text({ text: def.name.toUpperCase(), style: Type.cardName() });
    name.anchor.set(0.5);
    name.position.set(CARD_W / 2, 127);
    if (name.width > CARD_W - 20) name.scale.set((CARD_W - 20) / name.width);
    this.addChild(nameBand, name);

    // level badge
    const level = opts.level ?? 1;
    const badge = new Graphics().roundRect(6, 6, 30, 20, 5).fill({ color: Palette.black, alpha: 0.65 }).stroke({ color: rc, width: 1 });
    this.levelBadgeText = new Text({ text: `${level}`, style: Type.number() });
    this.levelBadgeText.style.fontSize = 14;
    this.levelBadgeText.style.stroke = { color: Palette.black, width: 2 };
    this.levelBadgeText.anchor.set(0.5);
    this.levelBadgeText.position.set(21, 16);
    this.addChild(badge, this.levelBadgeText);

    // Shared dropped-in rarity art (top-right badge).
    const rarityBadge = buildRarityIcon(def.rarity, 34, 27);
    rarityBadge.position.set(CARD_W - 22, 18);
    this.addChild(rarityBadge);

    if (opts.heldItemId) {
      const held = getShopItem(opts.heldItemId);
      const itemBadge = new Graphics().roundRect(CARD_W - 43, 88, 34, 25, 8)
        .fill({ color: Palette.black, alpha: 0.86 })
        .stroke({ color: Palette.gold, width: 1.2 });
      const itemIcon = buildItemIcon(held, 22);
      itemIcon.position.set(CARD_W - 26, 100);
      this.addChild(itemBadge, itemIcon);
    }


    if (opts.onInspect) {
      const info = new Container();
      const infoBg = new Graphics().circle(0, 0, 11).fill({ color: Palette.black, alpha: 0.84 }).stroke({ color: rc, width: 1.5 });
      const infoText = new Text({ text: 'i', style: { fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 'bold', fill: Palette.white } });
      infoText.anchor.set(0.5);
      info.addChild(infoBg, infoText);
      info.position.set(CARD_W - 18, 100);
      info.eventMode = 'static';
      info.cursor = 'pointer';
      info.on('pointerover', () => info.scale.set(1.12));
      info.on('pointerout', () => info.scale.set(1));
      info.on('pointerdown', (event) => {
        event.stopPropagation();
        opts.onInspect?.();
      });
      this.addChild(info);
    }

    if (opts.mode === 'battle') {
      this.buildBattleBars();
    } else {
      this.buildRosterFooter(opts.showCost ?? true);
      const hpPct = opts.hpPct ?? 1;
      if (hpPct < 0.999) {
        const strip = new Graphics()
          .roundRect(10, 140, CARD_W - 20, 4, 2)
          .fill({ color: Palette.black, alpha: 0.7 })
          .roundRect(10, 140, Math.max(3, (CARD_W - 20) * hpPct), 4, 2)
          .fill(hpPct > 0.5 ? Palette.hp : Palette.hpLow);
        this.addChild(strip);
      }
    }

    this.statusRow.position.set(10, 96);
    this.addChild(this.statusRow);

    this.buildAnimatedRarityFrame(rc);

    this.flashRect.roundRect(0, 0, CARD_W, CARD_H, 10).fill(Palette.white);
    this.flashRect.alpha = 0;
    this.flashRect.eventMode = 'none';
    this.addChild(this.flashRect);

    this.pivot.set(CARD_W / 2, CARD_H / 2);
  }

  private buildAnimatedRarityFrame(rc: number): void {
    this.animatedFrameLayer.eventMode = 'none';

    // Every step above Common adds another visual layer without obscuring card data.
    if (this.rarityTier >= 1) {
      this.framePulse.roundRect(-1, -1, CARD_W + 2, CARD_H + 2, 12)
        .stroke({ color: rc, width: this.rarityTier >= 3 ? 2.4 : 1.5, alpha: 0.9 });
      if (this.rarityTier >= 2) {
        this.framePulse.roundRect(4, 4, CARD_W - 8, CARD_H - 8, 8)
          .stroke({ color: this.rarityTier === 5 ? Palette.white : rc, width: 1.2, alpha: 0.5 });
      }
      if (this.rarityTier === 5) {
        this.framePulse.roundRect(-4, -4, CARD_W + 8, CARD_H + 8, 14)
          .stroke({ color: Palette.white, width: 1.2, alpha: 0.45 });
      }
      this.framePulse.blendMode = 'add';
      this.framePulse.eventMode = 'none';
      this.animatedFrameLayer.addChild(this.framePulse);
    }

    if (this.rarityTier >= 3) {
      const moteCount = 5 + (this.rarityTier - 3) * 3;
      for (let i = 0; i < moteCount; i++) {
        const size = 1.7 + (i % 3) * 0.45 + (this.rarityTier - 3) * 0.25;
        const mote = new Graphics()
          .circle(0, 0, size + 2).fill({ color: rc, alpha: 0.18 })
          .circle(0, 0, size).fill({ color: this.rarityTier === 5 && i % 2 === 0 ? Palette.white : rc, alpha: 0.92 });
        mote.blendMode = 'add';
        mote.eventMode = 'none';
        this.orbitMotes.push(mote);
        this.animatedFrameLayer.addChild(mote);
      }
    }

    // Fire-aligned Epic+ legends get embers and a subtle heat-haze crown.
    if (this.fireFrame && this.rarityTier >= 2) {
      for (let i = 0; i < 8; i++) {
        const flame = new Graphics()
          .poly([0, -6, 3.6, 1.5, 0, 5, -3.6, 1.5]).fill({ color: i % 3 === 0 ? 0xffe06a : 0xff6a24, alpha: 0.9 })
          .circle(0, 1, 1.6).fill({ color: Palette.white, alpha: 0.7 });
        flame.blendMode = 'add';
        flame.eventMode = 'none';
        this.fireMotes.push(flame);
        this.animatedFrameLayer.addChild(flame);
      }
      for (const x of [28, 74, 120]) {
        this.heatHaze.moveTo(x - 7, 1)
          .bezierCurveTo(x - 13, -7, x + 10, -12, x + 4, -21)
          .stroke({ color: 0xffc15a, width: 2, alpha: 0.35 });
      }
      this.heatHaze.blendMode = 'add';
      this.heatHaze.eventMode = 'none';
      this.animatedFrameLayer.addChild(this.heatHaze);
    }

    this.addChild(this.animatedFrameLayer);
  }

  private buildBattleBars(): void {
    const barX = 10;
    const barW = CARD_W - 20;
    this.hpText = new Text({ text: '', style: Type.number() });
    this.hpText.style.fontSize = 14;
    this.hpText.style.stroke = { color: Palette.black, width: 2 };
    this.hpText.anchor.set(0.5);
    this.hpText.position.set(CARD_W / 2, 150);
    const hpBg = new Graphics().roundRect(barX, 160, barW, 11, 4).fill({ color: Palette.black, alpha: 0.7 }).stroke({ color: Palette.border, width: 1 });
    const enBg = new Graphics().roundRect(barX, 176, barW, 7, 3).fill({ color: Palette.black, alpha: 0.7 }).stroke({ color: Palette.border, width: 1 });
    this.addChild(this.hpText, hpBg, this.hpFill, enBg, this.energyFill);
    this.redrawHp(1);
    this.redrawEnergy(0);
  }

  private buildRosterFooter(showCost: boolean): void {
    const rc = RarityColor[this.def.rarity];
    const rarity = new Text({ text: RarityLabel[this.def.rarity], style: Type.tiny() });
    rarity.style.fontSize = 10;
    rarity.style.fill = rc;
    rarity.anchor.set(0.5, 0);
    rarity.position.set(CARD_W / 2, 144);
    const epithet = new Text({ text: this.def.epithet, style: Type.small() });
    epithet.style.fontSize = 11;
    epithet.style.fill = Palette.text;
    epithet.anchor.set(0.5, 0);
    epithet.position.set(CARD_W / 2, 157);
    if (epithet.width > CARD_W - 12) epithet.scale.set((CARD_W - 12) / epithet.width);
    const strength = new Text({ text: `STR: ${strengthSummary(this.def)}`, style: Type.tiny() });
    strength.style.fontSize = 9;
    strength.style.fill = Palette.success;
    strength.anchor.set(0.5, 0);
    strength.position.set(CARD_W / 2, 171);
    if (strength.width > CARD_W - 10) strength.scale.set((CARD_W - 10) / strength.width);
    const cost = showCost ? ` · COST ${Balance.rarity.cost[this.def.rarity]}` : '';
    const weakness = new Text({ text: `WEAK: ${WEAKNESS_LABEL[this.def.weakness!]}${cost}`, style: Type.tiny() });
    weakness.style.fontSize = 9;
    weakness.style.fill = Palette.danger;
    weakness.anchor.set(0.5, 0);
    weakness.position.set(CARD_W / 2, 185);
    if (weakness.width > CARD_W - 10) weakness.scale.set((CARD_W - 10) / weakness.width);
    this.addChild(rarity, epithet, strength, weakness);
  }
  // ── battle-mode API ─────────────────────────────────────────────────────
  setBattlePose(x: number, y: number, scale: number): void {
    this.battlePose = { x, y, scale, rotation: this.rotation };
    this.position.set(x, y);
    this.scale.set(scale);
  }

  private restoreBattlePose(): void {
    if (!this.battlePose) return;
    this.position.set(this.battlePose.x, this.battlePose.y);
    this.scale.set(this.battlePose.scale);
    this.rotation = this.battlePose.rotation;
    this.alpha = 1;
  }

  initHp(current: number, max: number): void {
    this.maxHp = max;
    this.shownHp = current;
    this.redrawHp(current / max);
  }

  setHp(value: number): void {
    const target = Math.max(0, value);
    const start = this.shownHp;
    Tweens.run({
      duration: 0.25,
      ease: Easing.quadOut,
      onUpdate: (t) => {
        this.shownHp = start + (target - start) * t;
        this.redrawHp(this.shownHp / this.maxHp);
      },
    });
  }

  setEnergy(value: number): void {
    this.redrawEnergy(Math.max(0, Math.min(1, value / Balance.battle.energyMax)));
  }

  setLevel(level: number): void {
    if (this.levelBadgeText) this.levelBadgeText.text = `${level}`;
  }

  private redrawHp(pct: number): void {
    const p = Math.max(0, Math.min(1, pct));
    const color = p > 0.5 ? Palette.hp : mix(Palette.hpLow, Palette.hp, p * 2);
    const barW = CARD_W - 22;
    this.hpFill.clear();
    if (p > 0.001) {
      this.hpFill
        .roundRect(11, 161, barW * p, 9, 3)
        .fill(color)
        .roundRect(11, 161, barW * p, 4, 2)
        .fill({ color: Palette.white, alpha: 0.22 });
      // segment ticks every 10% (mockup-style pips)
      for (let i = 1; i < 10; i++) {
        const x = 11 + (barW * i) / 10;
        if (x < 11 + barW * p) this.hpFill.rect(x, 161, 1, 9).fill({ color: Palette.black, alpha: 0.4 });
      }
    }
    if (this.hpText) {
      this.hpText.text = `${Math.round(this.shownHp).toLocaleString('en-US')} / ${this.maxHp.toLocaleString('en-US')}`;
      if (this.hpText.width > CARD_W - 14) this.hpText.scale.set((CARD_W - 14) / this.hpText.width);
    }
  }

  private redrawEnergy(pct: number): void {
    // ten discrete pips that light up as energy builds; all gold at full ult
    const barW = CARD_W - 22;
    const gap = 2;
    const pipW = (barW - gap * 9) / 10;
    const lit = Math.floor(Math.min(1, pct) * 10);
    this.energyFill.clear();
    for (let i = 0; i < lit; i++) {
      this.energyFill.roundRect(11 + i * (pipW + gap), 177, pipW, 5, 2).fill(pct >= 1 ? Palette.gold : Palette.energy);
    }
  }

  setStatuses(kinds: StatusKind[]): void {
    this.statusRow.removeChildren().forEach((c) => c.destroy());
    kinds.slice(0, 5).forEach((kind, i) => {
      const icon = new Text({ text: STATUS_GLYPH[kind], style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 13 } });
      icon.position.set(i * 17, 0);
      this.statusRow.addChild(icon);
    });
  }

  /** Impact flash only; movement belongs to guarded battle-pose animations. */
  flashHit(color: number = Palette.white): void {
    this.flashRect.tint = color;
    this.flashRect.alpha = 0.85;
    Tweens.to(this.flashRect, { alpha: 0 }, { duration: 0.28, ease: Easing.quadOut });
  }

  playHeal(): void {
    this.flashRect.tint = Palette.success;
    this.flashRect.alpha = 0.4;
    Tweens.to(this.flashRect, { alpha: 0 }, { duration: 0.5, ease: Easing.quadOut });
    const start = this.glowSprite.alpha;
    this.glowSprite.tint = Palette.success;
    Tweens.to(this.glowSprite, { alpha: 0.58 }, {
      duration: 0.16,
      onComplete: () => Tweens.to(this.glowSprite, { alpha: start }, {
        duration: 0.34,
        onComplete: () => { this.glowSprite.tint = RarityColor[this.def.rarity]; },
      }),
    });
  }

  /** Ability-aware motion; cards always return to their contained battle pose. */
  playAct(direction = 1, ultimate = false, fx: import('../../data/types').AbilityFx = 'strike'): void {
    if (this.motionActive) return;
    const pose = this.battlePose ?? { x: this.x, y: this.y, scale: this.scale.x, rotation: this.rotation };
    this.motionActive = true;
    this.restoreBattlePose();
    const ranged = fx === 'beam' || fx === 'bolt' || fx === 'glow';
    const area = fx === 'nova' || fx === 'wave';
    const reach = ranged ? -7 : area ? 8 : ultimate ? 38 : 24;
    const lift = area ? (ultimate ? 18 : 12) : ultimate ? 9 : 4;
    const pop = ultimate ? 1.16 : ranged ? 1.12 : 1.08;
    const turn = area ? direction * (ultimate ? 0.08 : 0.045) : ranged ? -direction * 0.025 : direction * 0.018;
    Tweens.to(this.scale, { x: pose.scale * pop, y: pose.scale * pop }, { duration: 0.12, ease: Easing.backOut });
    Tweens.to(this, { x: pose.x + direction * reach, y: pose.y - lift, rotation: pose.rotation + turn }, {
      duration: 0.12,
      ease: Easing.quadOut,
      onComplete: () => {
        Tweens.to(this, { x: pose.x, y: pose.y, rotation: pose.rotation }, { duration: 0.2, ease: Easing.backOut });
        Tweens.to(this.scale, { x: pose.scale, y: pose.scale }, {
          duration: 0.2,
          ease: Easing.quadOut,
          onComplete: () => {
            this.restoreBattlePose();
            this.motionActive = false;
          },
        });
      },
    });
  }

  playDodge(direction: number): void {
    if (this.motionActive) return;
    const pose = this.battlePose ?? { x: this.x, y: this.y, scale: this.scale.x };
    this.motionActive = true;
    this.restoreBattlePose();
    Tweens.to(this, { x: pose.x + direction * 34, y: pose.y - 8, alpha: 0.5 }, {
      duration: 0.1,
      ease: Easing.quadOut,
      onComplete: () => Tweens.to(this, { x: pose.x, y: pose.y, alpha: 1 }, {
        duration: 0.2,
        ease: Easing.backOut,
        onComplete: () => {
          this.restoreBattlePose();
          this.motionActive = false;
        },
      }),
    });
  }

  playShield(): void {
    this.flashRect.tint = Palette.shield;
    this.flashRect.alpha = 0.52;
    Tweens.to(this.flashRect, { alpha: 0 }, { duration: 0.55, ease: Easing.quadOut });
    const start = this.glowSprite.alpha;
    this.glowSprite.tint = Palette.shield;
    Tweens.to(this.glowSprite, { alpha: 0.72 }, {
      duration: 0.16,
      ease: Easing.quadOut,
      onComplete: () => Tweens.to(this.glowSprite, { alpha: start }, {
        duration: 0.4,
        ease: Easing.quadOut,
        onComplete: () => { this.glowSprite.tint = RarityColor[this.def.rarity]; },
      }),
    });
  }

  playTransform(): void {
    if (this.motionActive) return;
    const pose = this.battlePose ?? { x: this.x, y: this.y, scale: this.scale.x };
    this.motionActive = true;
    this.restoreBattlePose();
    const startRotation = this.rotation;
    Tweens.to(this.scale, { x: pose.scale * 1.2, y: pose.scale * 1.2 }, { duration: 0.24, ease: Easing.backOut });
    Tweens.run({
      duration: 0.62,
      ease: Easing.quadOut,
      onUpdate: (t) => {
        this.rotation = startRotation + Math.sin(t * Math.PI * 8) * 0.025 * (1 - t);
      },
      onComplete: () => {
        this.rotation = startRotation;
        Tweens.to(this.scale, { x: pose.scale, y: pose.scale }, {
          duration: 0.3,
          ease: Easing.elasticOut,
          onComplete: () => {
            this.restoreBattlePose();
            this.motionActive = false;
          },
        });
      },
    });
  }

  setDead(): void {
    if (this.deadOverlay) return;
    this.setStatuses([]);
    const overlay = new Container();
    const shade = new Graphics().roundRect(0, 0, CARD_W, CARD_H, 10).fill({ color: Palette.black, alpha: 0.68 });
    const skull = new Text({ text: '💀', style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 44 } });
    skull.anchor.set(0.5);
    skull.position.set(CARD_W / 2, CARD_H / 2 - 10);
    overlay.addChild(shade, skull);
    overlay.alpha = 0;
    this.deadOverlay = overlay;
    this.addChild(overlay);
    this.glowSprite.alpha = 0;
    this.energyHalo.alpha = 0;
    this.framePulse.alpha = 0;
    this.heatHaze.alpha = 0;
    for (const mote of [...this.orbitMotes, ...this.fireMotes]) mote.alpha = 0;
    Tweens.to(overlay, { alpha: 1 }, { duration: 0.4 });
    Tweens.to(this, { rotation: (Math.random() - 0.5) * 0.06 }, { duration: 0.3 });
  }

  /** Rarity and signature frame animation. Call from the owning scene's update. */
  updatePulse(dt: number): void {
    if (this.deadOverlay || this.rarityTier === 0) return;
    this.pulseTime += dt;
    const wave = (Math.sin(this.pulseTime * 2.2) + 1) / 2;

    if (this.rarityTier >= 2) {
      const baseGlow = this.rarityTier === 2 ? 0.24 : 0.36 + (this.rarityTier - 3) * 0.07;
      this.glowSprite.alpha = baseGlow + wave * (this.rarityTier === 2 ? 0.1 : 0.16);
    }
    this.framePulse.alpha = 0.3 + wave * (0.22 + this.rarityTier * 0.055);

    if (this.rarityTier >= 4) {
      this.energyHalo.rotation += dt * (this.rarityTier === 5 ? 0.34 : 0.22);
      this.energyHalo.alpha = 0.34 + wave * (this.rarityTier === 5 ? 0.42 : 0.26);
      const haloScale = 0.985 + wave * (this.rarityTier === 5 ? 0.04 : 0.025);
      this.energyHalo.scale.set(haloScale);
    }

    const orbitSpeed = 0.46 + this.rarityTier * 0.065;
    this.orbitMotes.forEach((mote, i) => {
      const angle = this.pulseTime * orbitSpeed + (i / this.orbitMotes.length) * Math.PI * 2;
      mote.position.set(
        CARD_W / 2 + Math.cos(angle) * (CARD_W / 2 + 5),
        CARD_H / 2 + Math.sin(angle) * (CARD_H / 2 + 6),
      );
      mote.alpha = 0.42 + 0.5 * ((Math.sin(angle * 2.5 + this.pulseTime) + 1) / 2);
      const moteScale = 0.72 + 0.34 * ((Math.sin(angle * 3 - this.pulseTime * 2) + 1) / 2);
      mote.scale.set(moteScale);
    });

    this.fireMotes.forEach((flame, i) => {
      const progress = (this.pulseTime * 0.34 + i / this.fireMotes.length) % 1;
      const side = i % 2 === 0 ? -1 : 1;
      flame.position.set(
        side < 0 ? -2 + Math.sin(this.pulseTime * 5 + i) * 3 : CARD_W + 2 + Math.sin(this.pulseTime * 5 + i) * 3,
        CARD_H - 4 - progress * (CARD_H + 3),
      );
      flame.alpha = 0.18 + Math.sin(progress * Math.PI) * 0.78;
      const flameScale = 0.62 + (1 - progress) * 0.72;
      flame.scale.set(flameScale, flameScale * (0.9 + wave * 0.25));
      flame.rotation = Math.sin(this.pulseTime * 3.5 + i) * 0.22;
    });
    if (this.fireMotes.length > 0) {
      this.heatHaze.x = Math.sin(this.pulseTime * 1.9) * 2.5;
      this.heatHaze.alpha = 0.16 + wave * 0.32;
    }
  }
}
