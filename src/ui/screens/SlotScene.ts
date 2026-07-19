/**
 * The Legend Slots — two vertical constraint reels plus a horizontal character rail.
 *   Reel 1: franchise/universe · Reel 2: rarity · Rail: eligible characters.
 *
 * Information discipline: while spinning, reels show only mystery cards —
 * nothing to read. Each lock CONSTRAINS the next reel: reel 2 only ever shows
 * rarities that exist in the landed franchise, reel 3 only characters matching
 * both franchise and rarity. The machine never leaks and never lies.
 * The outcome itself is decided by the sim the instant the handle is pulled.
 */

import { Container, Graphics, Rectangle, Sprite, Text, type FederatedPointerEvent } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { Tweens, Easing } from '../../core/Tween';
import { Balance } from '../../data/balance';
import { CHARACTERS } from '../../data/characters';
import { FRANCHISES, getFranchise, type FranchiseDef } from '../../data/franchises';
import type { CharacterDef, Rarity } from '../../data/types';
import type { Sfx } from '../../audio/Sfx';
import { Button } from '../components/Button';
import { CharacterCard, CARD_W, CARD_H } from '../components/CharacterCard';
import { CharacterInfoModal } from '../components/CharacterInfoModal';
import { FxLayer } from '../fx/effects';
import { glowTexture } from '../fx/textures';
import { backgroundTexture, buildPortrait, franchiseTexture } from '../portraits';
import { H, mix, Palette, RarityColor, RarityLabel, RarityTier, Type, W } from '../theme';
import { TeamScene } from './TeamScene';
import { ShopScene } from './ShopScene';
import { FeatheredBackground } from '../fx/FeatheredBackground';
import { SettingsModal } from '../components/SettingsModal';
import { buildRarityIcon } from '../components/RarityIcon';

const REEL_W = 136;
const ITEM_H = 95;
const WINDOW_H = ITEM_H * 3;
const REEL_XS = [260, 457];
const REEL_Y = 140;
const RAIL_X = 106;
const RAIL_Y = 510;
const RAIL_W = 624;
const RAIL_H = 70;
const RAIL_ITEM_W = 142;

type RevealTier = 0 | 1 | 2 | 3 | 4 | 5;
const REVEAL_TIER: Record<Rarity, RevealTier> = { common: 0, rare: 1, epic: 2, legendary: 3, supreme: 4, godlike: 5 };

// ── one reel ──────────────────────────────────────────────────────────────
class Reel {
  readonly wrap = new Container();
  private strip = new Container();
  private hotGlow: Sprite;
  private faces: Container[] = [];
  offset = 0;
  hot = false;
  private looping = false;
  private loopSpeed = 1500;
  private tickCooldown = 0;

  constructor(private sfx: Sfx, x: number, y: number) {
    this.wrap.position.set(x, y);

    this.hotGlow = new Sprite(glowTexture());
    this.hotGlow.anchor.set(0.5);
    this.hotGlow.position.set(REEL_W / 2, WINDOW_H / 2);
    this.hotGlow.width = REEL_W * 2.4;
    this.hotGlow.height = WINDOW_H * 1.6;
    this.hotGlow.blendMode = 'add';
    this.hotGlow.alpha = 0;
    this.wrap.addChild(this.hotGlow);

    const back = new Graphics().roundRect(-4, -4, REEL_W + 8, WINDOW_H + 8, 8).fill(0x0a0b13);
    this.wrap.addChild(back, this.strip);

    const mask = new Graphics().roundRect(0, 0, REEL_W, WINDOW_H, 6).fill(Palette.white);
    this.wrap.addChild(mask);
    this.strip.mask = mask;

    const shade = new Graphics()
      .rect(0, 0, REEL_W, 44)
      .fill({ color: Palette.black, alpha: 0.55 })
      .rect(0, WINDOW_H - 44, REEL_W, 44)
      .fill({ color: Palette.black, alpha: 0.55 });
    shade.mask = mask;
    this.wrap.addChild(shade);
  }

  populate(faces: Container[], keepFraction = false): void {
    const frac = keepFraction ? this.offset % ITEM_H : 0;
    this.strip.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.faces = faces;
    faces.forEach((face, k) => {
      face.position.set(REEL_W / 2, k * ITEM_H + ITEM_H / 2);
      this.strip.addChild(face);
    });
    this.offset = frac;
    this.apply();
  }

  private apply(): void {
    this.strip.y = -this.offset;
  }

  /** Offset that centers item k on the payline. */
  static centerOffset(k: number): number {
    return (k - 1) * ITEM_H;
  }

  centerFace(): Container | null {
    const k = Math.round(this.offset / ITEM_H) + 1;
    return this.faces[k] ?? null;
  }

  /** Fast blind whir over identical mystery faces (seamless recycle). */
  startLoop(faces: Container[], speed: number): void {
    this.populate(faces);
    this.loopSpeed = speed;
    this.looping = true;
  }

  update(dt: number): void {
    if (this.looping) {
      this.offset += this.loopSpeed * dt;
      const loopSpan = Math.max(ITEM_H, (this.faces.length - 3) * ITEM_H);
      while (this.offset >= loopSpan) this.offset -= loopSpan;
      this.apply();
      this.tickCooldown -= dt;
      if (this.tickCooldown <= 0) {
        this.tickCooldown = 0.07;
        this.sfx.wheelTick(0.8 + Math.random() * 0.15);
      }
    }
  }

  /**
   * Hand off from the blind loop to a real stop: the strip becomes
   * [3 mysteries (visual continuity) + tail], then decelerates so item
   * `targetIdxInTail` lands the payline. Duration is derived from distance so
   * the deceleration starts at roughly the loop's velocity.
   */
  beginStop(tail: Container[], targetIdxInTail: number, leadIn: Container[], onComplete: () => void): void {
    this.looping = false;
    this.populate([...leadIn.slice(0, 3), ...tail], true);
    const toIndex = 3 + targetIdxInTail;
    const from = this.offset;
    const to = Reel.centerOffset(toIndex);
    const duration = Math.min(2.2, Math.max(0.6, (2 * (to - from)) / this.loopSpeed));
    let lastIdx = Math.floor(from / ITEM_H);
    Tweens.run({
      duration,
      ease: Easing.quadOut,
      onUpdate: (t) => {
        this.offset = from + (to + 12 - from) * t;
        const idx = Math.floor(this.offset / ITEM_H);
        if (idx !== lastIdx) {
          lastIdx = idx;
          this.sfx.wheelTick(0.85 + Math.random() * 0.25);
        }
        this.apply();
      },
      onComplete: () => {
        Tweens.run({
          duration: 0.14,
          ease: Easing.quadOut,
          onUpdate: (t) => {
            this.offset = to + 12 * (1 - t);
            this.apply();
          },
          onComplete,
        });
      },
    });
  }

  /** Advance exactly one item (the suspense crawl). */
  step(duration: number, onComplete: () => void): void {
    const from = this.offset;
    const to = from + ITEM_H;
    Tweens.run({
      duration,
      ease: Easing.backOut,
      onUpdate: (t) => {
        this.offset = from + (to - from) * t;
        this.apply();
      },
      onComplete,
    });
  }

  setHot(color: number, on: boolean): void {
    this.hot = on;
    this.hotGlow.tint = color;
    if (!on) this.hotGlow.alpha = 0;
  }

  updatePulse(time: number): void {
    if (this.hot) this.hotGlow.alpha = 0.3 + 0.18 * Math.sin(time * 6);
  }
}

// ── the scene ─────────────────────────────────────────────────────────────

class CharacterRail {
  readonly wrap = new Container();
  private strip = new Container();
  private faces: Container[] = [];
  private offset = 0;
  private speed = 1800;
  private hotGlow: Sprite;

  constructor(private sfx: Sfx, x: number, y: number) {
    this.wrap.position.set(x, y);
    this.hotGlow = new Sprite(glowTexture());
    this.hotGlow.anchor.set(0.5);
    this.hotGlow.position.set(RAIL_W / 2, RAIL_H / 2);
    this.hotGlow.width = RAIL_W * 1.3;
    this.hotGlow.height = RAIL_H * 2.4;
    this.hotGlow.blendMode = 'add';
    this.hotGlow.alpha = 0;
    const back = new Graphics().roundRect(-4, -4, RAIL_W + 8, RAIL_H + 8, 10).fill(0x0a0b13);
    const mask = new Graphics().roundRect(0, 0, RAIL_W, RAIL_H, 7).fill(Palette.white);
    this.strip.mask = mask;
    this.wrap.addChild(this.hotGlow, back, this.strip, mask);
  }

  populate(faces: Container[]): void {
    this.strip.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.faces = faces;
    faces.forEach((face, index) => {
      face.position.set(index * RAIL_ITEM_W + RAIL_ITEM_W / 2, RAIL_H / 2);
      this.strip.addChild(face);
    });
    this.offset = 0;
    this.apply();
  }

  private apply(): void { this.strip.x = -this.offset; }

  beginStop(faces: Container[], targetIndex: number, color: number, onComplete: () => void): void {
    this.populate(faces);
    const to = targetIndex * RAIL_ITEM_W + RAIL_ITEM_W / 2 - RAIL_W / 2;
    let last = 0;
    this.hotGlow.tint = color;
    this.hotGlow.alpha = 0.2;
    Tweens.run({
      duration: Math.min(2.7, Math.max(1.55, (2 * to) / this.speed)),
      ease: Easing.quadOut,
      onUpdate: (t) => {
        this.offset = (to + 16) * t;
        const index = Math.floor(this.offset / RAIL_ITEM_W);
        if (index !== last) {
          last = index;
          this.sfx.wheelTick(0.9 + Math.random() * 0.22);
        }
        this.apply();
      },
      onComplete: () => Tweens.run({
        duration: 0.16,
        ease: Easing.backOut,
        onUpdate: (t) => {
          this.offset = to + 16 * (1 - t);
          this.apply();
        },
        onComplete,
      }),
    });
  }

  centerFace(): Container | null {
    const index = Math.round((this.offset + RAIL_W / 2 - RAIL_ITEM_W / 2) / RAIL_ITEM_W);
    return this.faces[index] ?? null;
  }

  setHot(color: number, on: boolean): void {
    this.hotGlow.tint = color;
    this.hotGlow.alpha = on ? 0.38 : 0;
  }
}
export class SlotScene extends Scene {
  private fx = new FxLayer();
  private reels: Reel[] = [];
  private characterRail!: CharacterRail;
  private dim = new Graphics();
  private spinning = false;
  private time = 0;

  private spinBtn!: Button;
  private doneBtn!: Button;
  private storeBtn!: Button;
  private goldText!: Text;
  private spinsText!: Text;
  private rosterGrid = new Container();
  private rosterScroll = 0;
  private rosterMaxScroll = 0;
  private rosterDragY: number | null = null;
  private rosterDragScroll = 0;
  private rosterScrollbar = new Graphics();
  private costText!: Text;
  private costBar = new Graphics();
  private legendaryCards: CharacterCard[] = [];
  private background?: FeatheredBackground;

  constructor(game: Game) {
    super(game);
  }

  private get run() {
    const run = this.game.run;
    if (!run) throw new Error('SlotScene requires an active run');
    return run;
  }

  onEnter(): void {
    this.buildHubBackdrop();
    this.buildHubChrome();
    this.buildCabinet();
    this.buildSidebar();

    this.dim.rect(0, 0, W, H).fill(Palette.black);
    this.dim.alpha = 0;
    this.dim.eventMode = 'none';
    this.addChild(this.dim);

    // Two constraint reels sit above the dim layer.
    for (let i = 0; i < 2; i++) {
      const reel = new Reel(this.game.sfx, REEL_XS[i]!, REEL_Y);
      this.reels.push(reel);
      this.addChild(reel.wrap);
    }
    this.characterRail = new CharacterRail(this.game.sfx, RAIL_X, RAIL_Y);
    this.addChild(this.characterRail.wrap);
    this.idlePopulate();

    this.addChild(this.fx);
    this.refreshHud();
  }

  private buildHubBackdrop(): void {
    const texture = backgroundTexture('recruitment-backdrop-v3');
    if (!texture) return;
    this.background = new FeatheredBackground(texture, 1, 0, 1.025, this.game.visibleDesignWidth, this.game.visibleDesignHeight);
    this.addChild(this.background);
  }

  override onResize(viewportW: number, viewportH: number): void {
    this.background?.resize(viewportW, viewportH);
  }

  private buildHubChrome(): void {
    const texture = backgroundTexture('recruitment-hud-v2');
    if (!texture) return;
    const chrome = new Sprite(texture);
    chrome.anchor.set(0.5);
    chrome.position.set(W / 2, H / 2);
    chrome.width = W;
    chrome.height = H;
    this.addChild(chrome);
  }

  private buildCabinet(): void {
    const title = new Text({ text: 'WHEEL OF LEGENDS', style: Type.h1() });
    title.anchor.set(0.5, 0);
    title.position.set(451, 27);
    this.addChild(title);

    const settingsBtn = new Button('⚙  SETTINGS', this.game.sfx, {
      width: 164,
      height: 40,
      variant: 'secondary',
      onClick: () => this.openSettings(),
    });
    settingsBtn.position.set(104, 48);
    this.addChild(settingsBtn);

    const marquee = new Text({ text: 'SUMMONING ALTAR', style: Type.h2() });
    marquee.style.fill = Palette.gold;
    marquee.style.fontSize = 21;
    marquee.anchor.set(0.5);
    marquee.position.set(422, 101);
    this.addChild(marquee);

    const headers = ['UNIVERSE', 'RARITY'];
    headers.forEach((h, i) => {
      const label = new Text({ text: h, style: Type.tiny() });
      label.style.fill = Palette.gold;
      label.anchor.set(0.5);
      label.position.set(REEL_XS[i]! + REEL_W / 2, REEL_Y - 12);
      this.addChild(label);
    });
    const railLabel = new Text({ text: 'AVAILABLE LEGENDS', style: Type.tiny() });
    railLabel.style.fill = Palette.gold;
    railLabel.anchor.set(0.5);
    railLabel.position.set(RAIL_X + RAIL_W / 2, RAIL_Y - 10);
    this.addChild(railLabel);

  }

  private openSettings(): void {
    const modal = new SettingsModal(this.game, () => {
      this.removeChild(modal);
      modal.destroy({ children: true });
    });
    this.addChild(modal);
  }

  private buildSidebar(): void {
    const px = 798;
    const rosterLayer = new Container();
    rosterLayer.position.set(px, 84);

    const collectionTitle = new Text({ text: 'LEGEND ARCHIVE', style: Type.h2() });
    collectionTitle.style.fill = Palette.gold;
    collectionTitle.style.fontSize = 22;
    collectionTitle.anchor.set(0.5);
    collectionTitle.position.set(222, 31);

    const archiveHint = new Text({ text: 'SCROLL OR DRAG TO BROWSE', style: Type.tiny() });
    archiveHint.anchor.set(0.5);
    archiveHint.position.set(222, 58);

    const rosterMask = new Graphics().roundRect(18, 75, 408, 401, 10).fill(Palette.white);
    this.rosterGrid.position.set(24, 79);
    this.rosterGrid.mask = rosterMask;
    rosterLayer.eventMode = 'static';
    rosterLayer.hitArea = new Rectangle(18, 75, 408, 401);
    rosterLayer.on('wheel', (event) => this.setRosterScroll(this.rosterScroll + event.deltaY * 0.7));
    rosterLayer.on('pointerdown', (event: FederatedPointerEvent) => {
      this.rosterDragY = event.global.y;
      this.rosterDragScroll = this.rosterScroll;
    });
    rosterLayer.on('globalpointermove', (event: FederatedPointerEvent) => {
      if (this.rosterDragY === null) return;
      this.setRosterScroll(this.rosterDragScroll + (this.rosterDragY - event.global.y) / this.game.frame.scale.y);
    });
    const endRosterDrag = () => { this.rosterDragY = null; };
    rosterLayer.on('pointerup', endRosterDrag);
    rosterLayer.on('pointerupoutside', endRosterDrag);
    rosterLayer.addChild(collectionTitle, archiveHint, rosterMask, this.rosterGrid, this.rosterScrollbar);
    this.addChild(rosterLayer);

    this.costText = new Text({ text: '', style: Type.h3() });
    this.costText.style.fontSize = 14;
    this.costText.style.letterSpacing = 1.5;
    this.costText.position.set(px + 16, 562);
    this.addChild(this.costText, this.costBar);

    this.goldText = new Text({ text: '', style: Type.h3() });
    this.goldText.style.fill = Palette.gold;
    this.goldText.style.fontSize = 13;
    this.goldText.anchor.set(0.5);
    this.goldText.position.set(928, 51);
    this.spinsText = new Text({ text: '', style: Type.h3() });
    this.spinsText.style.fontSize = 13;
    this.spinsText.anchor.set(0.5);
    this.spinsText.position.set(1102, 51);
    this.addChild(this.goldText, this.spinsText);

    this.spinBtn = new Button('SUMMON', this.game.sfx, {
      width: 420,
      height: 52,
      variant: 'transparent',
      onClick: () => this.doSpin(),
    });
    this.spinBtn.position.set(357, 652);
    this.addChild(this.spinBtn);

    this.storeBtn = new Button('STORE', this.game.sfx, {
      width: 238,
      height: 52,
      variant: 'transparent',
      onClick: () => this.game.goto(new ShopScene(this.game)),
    });
    this.storeBtn.position.set(739, 652);
    this.addChild(this.storeBtn);

    this.doneBtn = new Button('FORMATION', this.game.sfx, {
      width: 264,
      height: 52,
      variant: 'transparent',
      onClick: () => this.game.goto(new TeamScene(this.game)),
    });
    this.doneBtn.position.set(1061, 652);
    this.addChild(this.doneBtn);
  }

  // ── reel faces ──────────────────────────────────────────────────────────
  private franchiseFace(fr: FranchiseDef): Container {
    const c = new Container();
    const tex = franchiseTexture(fr.id);
    if (tex) {
      // dropped-in universe logo art, cover-fit into the plaque window
      const sprite = new Sprite(tex);
      const scale = Math.max(124 / tex.width, 68 / tex.height);
      sprite.anchor.set(0.5);
      sprite.scale.set(scale);
      const mask = new Graphics().roundRect(-62, -34, 124, 68, 9).fill(Palette.white);
      sprite.mask = mask;
      const border = new Graphics().roundRect(-62, -34, 124, 68, 9).stroke({ color: fr.color, width: 2 });
      c.addChild(sprite, mask, border);
      return c;
    }
    const plaque = new Graphics()
      .roundRect(-62, -34, 124, 68, 9)
      .fill(mix(fr.color, Palette.black, 0.78))
      .stroke({ color: fr.color, width: 2 })
      .roundRect(-58, -30, 116, 26, 6)
      .fill({ color: Palette.white, alpha: 0.05 });
    const label = new Text({ text: fr.name, style: Type.h3() });
    label.style.fill = fr.color;
    label.anchor.set(0.5);
    if (label.width > 108) label.scale.set(108 / label.width);
    c.addChild(plaque, label);
    return c;
  }

  private rarityFace(rarity: Rarity): Container {
    const c = new Container();
    const rc = RarityColor[rarity];
    const rarityBadge = buildRarityIcon(rarity, 70, 56);
    rarityBadge.position.set(0, -6);
    const label = new Text({ text: RarityLabel[rarity], style: Type.tiny() });
    label.style.fill = rc;
    label.anchor.set(0.5);
    label.position.set(0, 30);
    c.addChild(rarityBadge, label);
    return c;
  }

  /** A mini portrait card: the legend reel shows real faces, not icons. */
  private characterFace(def: CharacterDef): Container {
    const c = new Container();
    const rc = RarityColor[def.rarity];
    const pw = 128;
    const ph = 52;
    const portrait = buildPortrait(def, pw, ph);
    portrait.position.set(-pw / 2, -32);
    const mask = new Graphics().roundRect(-pw / 2, -32, pw, ph, 7).fill(Palette.white);
    portrait.mask = mask;
    const border = new Graphics()
      .roundRect(-pw / 2, -32, pw, ph, 7)
      .stroke({ color: rc, width: 2 })
      .roundRect(-pw / 2, -32 + ph - 1, pw, 1, 0)
      .fill({ color: Palette.black, alpha: 0.3 });
    const band = new Graphics().roundRect(-pw / 2, 22, pw, 14, 4).fill({ color: Palette.black, alpha: 0.62 }).stroke({ color: mix(rc, Palette.black, 0.4), width: 1 });
    const label = new Text({ text: def.name.toUpperCase(), style: Type.tiny() });
    label.style.fill = Palette.text;
    label.anchor.set(0.5);
    label.position.set(0, 29);
    if (label.width > pw - 10) label.scale.set((pw - 10) / label.width);
    c.addChild(portrait, mask, border, band, label);
    return c;
  }

  private idlePopulate(): void {
    const franchises = Object.values(FRANCHISES);
    const rarities = Object.keys(Balance.rarity.weights) as Rarity[];
    this.reels[0]!.populate(Array.from({ length: Math.max(4, franchises.length) }, (_, i) => this.franchiseFace(franchises[i % franchises.length]!)));
    this.reels[1]!.populate(Array.from({ length: 8 }, (_, i) => this.rarityFace(rarities[i % rarities.length]!)));
    this.characterRail.populate(CHARACTERS.map((character) => this.characterFace(character)));
  }

  // ── HUD ─────────────────────────────────────────────────────────────────
  private refreshHud(): void {
    const run = this.run;
    this.goldText.text = `FLOOR ${run.floor}  |  ${run.gold.toLocaleString('en-US')} COINS`;
    this.spinsText.text = run.spins > 0 ? `FREE PULLS  ${run.spins}` : `NEXT SUMMON  ${run.spinCost}`;
    this.spinBtn.setLabel(run.spins > 0 ? `SUMMON - FREE x${run.spins}` : `SUMMON - ${run.spinCost} COINS`);
    this.spinBtn.setEnabled(!this.spinning && run.canSpin);
    this.doneBtn.setEnabled(!this.spinning && run.teamSize() > 0);
    this.storeBtn.setEnabled(!this.spinning);

    this.legendaryCards = [];
    this.rosterGrid.removeChildren().forEach((c) => c.destroy({ children: true }));
    const scale = 0.75;
    run.roster.forEach((entry, i) => {
      const def = CHARACTERS.find((c) => c.id === entry.defId)!;
      const card = new CharacterCard(def, { mode: 'roster', level: entry.level, hpPct: entry.hpPct, heldItemId: entry.heldItemId, onInspect: () => this.openInfo(def, entry.level) });
      card.scale.set(scale);
      const col = i % 3;
      const row = Math.floor(i / 3);
      card.position.set(col * (CARD_W * scale + 14) + (CARD_W * scale) / 2, row * (CARD_H * scale + 12) + (CARD_H * scale) / 2);
      if (RarityTier[def.rarity] >= 1) this.legendaryCards.push(card);
      this.rosterGrid.addChild(card);
    });
    if (run.roster.length === 0) {
      const hint = new Text({ text: 'Summon your first legend to begin the archive.', style: Type.bodyDim() });
      hint.position.set(10, 20);
      this.rosterGrid.addChild(hint);
    }
    const rows = Math.ceil(run.roster.length / 3);
    const contentHeight = rows > 0 ? rows * (CARD_H * scale + 12) - 12 : 0;
    this.rosterMaxScroll = Math.max(0, contentHeight - 393);
    this.setRosterScroll(Math.min(this.rosterScroll, this.rosterMaxScroll));

    const cost = run.teamCost();
    this.costText.text = `TEAM COST  ${cost} / ${run.teamCostCap}`;
    this.costBar.clear();
    this.costBar
      .roundRect(814, 586, 408, 8, 4)
      .fill({ color: Palette.black, alpha: 0.6 })
      .stroke({ color: Palette.border, width: 1 });
    if (cost > 0) {
      this.costBar
        .roundRect(814, 586, Math.min(1, cost / run.teamCostCap) * 408, 8, 4)
        .fill(cost >= run.teamCostCap ? Palette.danger : Palette.gold);
    }
  }

  // ── the pull ────────────────────────────────────────────────────────────
  private setRosterScroll(value: number): void {
    this.rosterScroll = Math.max(0, Math.min(this.rosterMaxScroll, value));
    this.rosterGrid.y = 79 - this.rosterScroll;
    this.rosterScrollbar.clear();
    if (this.rosterMaxScroll <= 0) return;
    const trackY = 79;
    const trackH = 393;
    const thumbH = Math.max(44, trackH * (trackH / (trackH + this.rosterMaxScroll)));
    const thumbY = trackY + (this.rosterScroll / this.rosterMaxScroll) * (trackH - thumbH);
    this.rosterScrollbar
      .roundRect(418, trackY, 3, trackH, 2).fill({ color: Palette.black, alpha: 0.5 })
      .roundRect(417, thumbY, 5, thumbH, 3).fill({ color: Palette.gold, alpha: 0.8 });
  }

  private doSpin(): void {
    if (this.spinning || !this.run.canSpin) return;
    this.spinning = true;

    const def = this.run.spin(); // outcome decided here
    const tier = REVEAL_TIER[def.rarity];
    const rc = RarityColor[def.rarity];
    this.refreshHud();
    this.spinBtn.setEnabled(false);
    this.doneBtn.setEnabled(false);
    this.game.sfx.spinStart();

    // constraint chain derived from the outcome
    const inFranchise = CHARACTERS.filter((c) => c.franchise === def.franchise);
    const availableRarities = [...new Set(inFranchise.map((c) => c.rarity))];
    const pool = inFranchise.filter((c) => c.rarity === def.rarity);
    const others = pool.filter((c) => c.id !== def.id);

    // The two constraint reels spin first. The character rail loads only
    // after universe and rarity have locked.
    const allFranchises = Object.values(FRANCHISES);
    const allRarities = Object.keys(Balance.rarity.weights) as Rarity[];
    this.reels[0]!.startLoop(Array.from({ length: 60 }, (_, i) => this.franchiseFace(allFranchises[i % allFranchises.length]!)), 1500);
    this.reels[1]!.startLoop(Array.from({ length: 60 }, (_, i) => this.rarityFace(allRarities[i % allRarities.length]!)), 1650);

    // ── reel 1: universe (anything is still possible) ──
    Tweens.delay(0.75, () => {
      const franchises = Object.values(FRANCHISES);
      const tail: Container[] = [];
      for (let k = 0; k < 8; k++) tail.push(this.franchiseFace(franchises[Math.floor(Math.random() * franchises.length)]!));
      tail.push(this.franchiseFace(getFranchise(def.franchise)));
      tail.push(this.franchiseFace(franchises[Math.floor(Math.random() * franchises.length)]!));
      const leadIn = Array.from({ length: 3 }, (_, i) => this.franchiseFace(franchises[i % franchises.length]!));
      this.reels[0]!.beginStop(tail, tail.length - 2, leadIn, () => {
        this.game.sfx.reelStop();
        this.game.shake(2, 0.12);
        this.stopReel2(def, tier, rc, availableRarities, others);
      });
    });
  }

  /** Reel 2 only shows rarities that actually exist in the landed franchise. */
  private stopReel2(def: CharacterDef, tier: RevealTier, rc: number, available: Rarity[], others: CharacterDef[]): void {
    Tweens.delay(0.15, () => {
      const tail: Container[] = [];
      for (let k = 0; k < 8; k++) {
        const weightedAvail = available.filter((r) => Balance.rarity.weights[r] > 0);
        const roll = weightedAvail[Math.floor(Math.random() * weightedAvail.length)]!;
        tail.push(this.rarityFace(roll));
      }
      tail.push(this.rarityFace(def.rarity));
      tail.push(this.rarityFace(available[0]!));
      const leadIn = Array.from({ length: 3 }, (_, i) => this.rarityFace(available[i % available.length]!));
      this.reels[1]!.beginStop(tail, tail.length - 2, leadIn, () => {
        this.game.sfx.reelStop();
        this.game.shake(3, 0.15);
        if (tier >= 2) {
          this.reels[1]!.setHot(rc, true);
          this.characterRail.setHot(rc, true);
          this.game.sfx.riser(1.8 + tier * 0.6);
          Tweens.to(this.dim, { alpha: tier >= 5 ? 0.78 : tier >= 4 ? 0.7 : tier === 3 ? 0.62 : 0.4 }, { duration: 0.5 });
          if (tier >= 3) this.game.sfx.heartbeat();
        }
        this.stopCharacterRail(def, tier, rc, [def, ...others]);
      });
    });
  }

  /** Load only candidates matching BOTH locked reels, then race sideways. */
  private stopCharacterRail(def: CharacterDef, tier: RevealTier, rc: number, candidates: CharacterDef[]): void {
    const dread = tier >= 2 ? 0.5 : 0.15;
    Tweens.delay(dread, () => {
      const sequence: Container[] = [];
      const rounds = Math.max(15, candidates.length * 6);
      for (let i = 0; i < rounds; i++) sequence.push(this.characterFace(candidates[i % candidates.length]!));
      sequence.push(this.characterFace(def));
      sequence.push(...candidates.slice(0, 3).map((candidate) => this.characterFace(candidate)));
      this.characterRail.beginStop(sequence, rounds, rc, () => this.slam(def, tier, rc));
    });
  }

  private slam(def: CharacterDef, tier: RevealTier, rc: number): void {
    this.game.sfx.slam();
    this.game.shake(6 + tier * 3, 0.35 + tier * 0.1);
    this.fx.flash(rc, 0.16 + tier * 0.06);
    const cx = RAIL_X + RAIL_W / 2;
    const cy = RAIL_Y + RAIL_H / 2;
    this.fx.burst(cx, cy, { color: rc, count: 20 + tier * 12, speed: 320 + tier * 80, size: 0.45 });
    const face = this.characterRail.centerFace();
    if (face) {
      Tweens.to(face.scale, { x: 1.25, y: 1.25 }, { duration: 0.14, ease: Easing.backOut });
      Tweens.to(face.scale, { x: 1, y: 1 }, { duration: 0.2, delay: 0.25 });
    }
    Tweens.delay(tier >= 2 ? 0.9 : 0.55, () => this.ceremony(def, tier, rc));
  }

  // ── reveal ceremony ─────────────────────────────────────────────────────
  private ceremony(def: CharacterDef, tier: RevealTier, rc: number): void {
    const result = this.run.addRecruit(def);
    const duplicateRefund = 35 + Balance.rarity.cost[def.rarity] * 15;
    if (result === 'maxed') {
      this.run.gold += duplicateRefund;
      this.run.goldEarned += duplicateRefund;
    }

    const overlay = new Container();
    const dimBg = new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.82 });
    dimBg.eventMode = 'static';
    overlay.addChild(dimBg);

    const halo = new Sprite(glowTexture());
    halo.anchor.set(0.5);
    halo.tint = rc;
    halo.alpha = 0;
    halo.scale.set(3);
    halo.position.set(W / 2, H / 2 - 20);
    overlay.addChild(halo);

    const rarityText = new Text({ text: `${RarityLabel[def.rarity]}!`, style: Type.banner(rc) });
    rarityText.anchor.set(0.5);
    rarityText.position.set(W / 2, 130);
    rarityText.alpha = 0;
    const rarityBadge = buildRarityIcon(def.rarity, 104, 80);
    rarityBadge.position.set(W / 2, 77);
    rarityBadge.alpha = 0;
    overlay.addChild(rarityBadge, rarityText);

    const franchiseText = new Text({ text: getFranchise(def.franchise).name, style: Type.h3() });
    franchiseText.style.fill = getFranchise(def.franchise).color;
    franchiseText.anchor.set(0.5);
    franchiseText.position.set(W / 2, 176);
    franchiseText.alpha = 0;
    overlay.addChild(franchiseText);

    const card = new CharacterCard(def, { mode: 'roster', level: this.run.roster.find((r) => r.defId === def.id)?.level ?? 1, onInspect: () => this.openInfo(def, this.run.roster.find((r) => r.defId === def.id)?.level ?? 1) });
    card.position.set(W / 2, H / 2 + 10);
    card.scale.set(0.1);
    card.alpha = 0;
    overlay.addChild(card);
    if (RarityTier[def.rarity] >= 1) this.legendaryCards.push(card);

    const note = result === 'new' ? 'NEW RECRUIT!' : result === 'leveled' ? 'DUPLICATE - LEVEL UP!' : `DUPLICATE - MAXED (+${duplicateRefund} COINS)`;
    const noteText = new Text({ text: note, style: Type.h2() });
    noteText.anchor.set(0.5);
    noteText.position.set(W / 2, H / 2 + 175);
    noteText.alpha = 0;
    overlay.addChild(noteText);

    const hint = new Text({ text: '— click to continue —', style: Type.bodyDim() });
    hint.anchor.set(0.5);
    hint.position.set(W / 2, H - 46);
    hint.alpha = 0;
    overlay.addChild(hint);

    this.addChild(overlay);
    this.game.sfx.reveal(tier);

    Tweens.to(halo, { alpha: tier >= 2 ? 0.5 : 0.3 }, { duration: 0.3 });
    Tweens.to(card, { alpha: 1 }, { duration: 0.15 });
    Tweens.to(card.scale, { x: 1.55, y: 1.55 }, { duration: 0.55, ease: Easing.elasticOut });
    Tweens.to(rarityText, { alpha: 1, y: 145 }, { duration: 0.35, delay: 0.15, ease: Easing.backOut });
    Tweens.to(rarityBadge, { alpha: 1 }, { duration: 0.3, delay: 0.1 });
    Tweens.to(franchiseText, { alpha: 1 }, { duration: 0.3, delay: 0.35 });
    Tweens.to(noteText, { alpha: 1 }, { duration: 0.3, delay: 0.45 });
    Tweens.to(hint, { alpha: 0.8 }, { duration: 0.3, delay: 0.9 });

    this.fx.burst(W / 2, H / 2, { color: rc, count: 26 + tier * 14, speed: 300 + tier * 90, size: 0.5 });
    if (tier >= 2) {
      Tweens.delay(0.2, () => this.fx.burst(W / 2, H / 2, { color: Palette.white, count: 18, speed: 420, size: 0.35 }));
    }
    if (tier >= 3) {
      this.fx.flash(rc, 0.3);
      this.game.shake(9, 0.5);
      Tweens.delay(0.5, () => this.fx.burst(W / 2, 100, { color: Palette.gold, count: 30, speed: 260, gravity: 500, life: 1.2 }));
    }

    let dismissable = false;
    Tweens.delay(0.8, () => {
      dismissable = true;
    });
    dimBg.on('pointerdown', () => {
      if (!dismissable) return;
      this.game.sfx.click();
      Tweens.to(overlay, { alpha: 0 }, {
        duration: 0.25,
        onComplete: () => {
          this.removeChild(overlay);
          overlay.destroy({ children: true });
        },
      });
      Tweens.to(this.dim, { alpha: 0 }, { duration: 0.3 });
      for (const reel of this.reels) reel.setHot(Palette.gold, false);
      this.characterRail.setHot(Palette.gold, false);
      this.spinning = false;
      this.idlePopulate();
      this.refreshHud();
    });
  }


  private openInfo(def: CharacterDef, level: number): void {
    this.game.sfx.click();
    const heldItemId = this.run.roster.find((entry) => entry.defId === def.id)?.heldItemId ?? null;
    const modal = new CharacterInfoModal(def, level, this.game.sfx, () => {
      this.removeChild(modal);
      modal.destroy({ children: true });
    }, heldItemId);
    this.addChild(modal);
  }

  override update(dt: number): void {
    this.time += dt;
    this.fx.update(dt);
    for (const card of this.legendaryCards) card.updatePulse(dt);
    for (const reel of this.reels) {
      reel.update(dt);
      reel.updatePulse(this.time);
    }
  }
}
