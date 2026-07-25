/** Post-victory reward draft: three choices, one pick, on to the next floor. */

import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { Tweens, Easing } from '../../core/Tween';
import type { RewardChoice } from '../../sim/run';
import { getShopItem, itemBoostSummary, ITEM_TIER_COLOR, SHOP_ITEMS } from '../../data/items';
import { getFranchise } from '../../data/franchises';
import type { ItemTier } from '../../data/items';
import { isBossFloor } from '../../sim/tower';
import { ConquestMapScene } from './ConquestMapScene';
import { FxLayer } from '../fx/effects';
import { glowTexture } from '../fx/textures';
import { H, mix, Palette, RarityColor, Type, W } from '../theme';
import { TeamScene } from './TeamScene';
import { buildRarityIcon } from '../components/RarityIcon';
import { buildItemIcon } from '../components/ItemIcon';

const CATEGORY_LABEL: Record<RewardChoice['category'], string> = {
  coins: 'ECONOMY', recovery: 'RECOVERY', power: 'RELIC', gear: 'EQUIPMENT',
};

export class RewardScene extends Scene {
  private fx = new FxLayer();
  private picked = false;

  constructor(game: Game) {
    super(game);
  }

  private get run() {
    const run = this.game.run;
    if (!run) throw new Error('RewardScene requires an active run');
    return run;
  }

  onEnter(): void {
    const run = this.run;
    const conquestUniverse = run.isConquest() ? run.conquestTarget() : null;
    const boss = conquestUniverse ? run.currentFloor().isBoss : isBossFloor(run.floor);
    const accent = boss ? RarityColor.legendary : Palette.gold;

    // Header plate keeps the banner, payout, and wallet in one framed cluster.
    const plate = new Graphics()
      .roundRect(W / 2 - 470, 62, 940, 108, 18)
      .fill({ color: Palette.panel, alpha: 0.66 })
      .stroke({ color: mix(accent, Palette.black, 0.35), width: 2 });
    plate.moveTo(W / 2 - 250, 150).lineTo(W / 2 + 250, 150).stroke({ color: mix(accent, Palette.black, 0.4), width: 1, alpha: 0.6 });
    this.addChild(plate);

    const bannerText = conquestUniverse
      ? `${getFranchise(conquestUniverse).name.toUpperCase()} CONQUERED`
      : boss ? `\u{1F451}  BOSS FLOOR ${run.floor} CLEARED  \u{1F451}` : `FLOOR ${run.floor} CLEARED`;
    const banner = new Text({ text: bannerText, style: Type.banner(accent) });
    banner.anchor.set(0.5);
    banner.position.set(W / 2, 108);
    if (banner.width > 900) banner.scale.set(900 / banner.width);
    this.addChild(banner);

    const payout = new Text({ text: `BATTLE PAYOUT  +${run.lastBattleCoins.toLocaleString('en-US')} COINS`, style: Type.h3() });
    payout.style.fill = Palette.success;
    payout.anchor.set(0.5);
    payout.position.set(W / 2, 156);
    this.addChild(payout);

    const sub = new Text({ text: 'CHOOSE YOUR SPOILS', style: Type.h3() });
    sub.style.fill = Palette.textDim;
    sub.style.letterSpacing = 4;
    sub.anchor.set(0.5);
    sub.position.set(W / 2, 200);
    this.addChild(sub);

    const wallet = new Graphics()
      .roundRect(W / 2 - 130, H - 58, 260, 36, 12)
      .fill({ color: Palette.panel, alpha: 0.7 })
      .stroke({ color: Palette.border, width: 1.5 });
    const gold = new Text({ text: `\u{1FA99} ${run.gold.toLocaleString('en-US')}      \u{1F3AB} ${run.spins}`, style: Type.h3() });
    gold.anchor.set(0.5);
    gold.position.set(W / 2, H - 40);
    this.addChild(wallet, gold);

    const choices = run.generateRewards();
    const cardW = choices.length > 3 ? 230 : 270;
    const gap = choices.length > 3 ? 20 : 40;
    const totalW = choices.length * cardW + (choices.length - 1) * gap;
    choices.forEach((choice, i) => {
      const x = W / 2 - totalW / 2 + i * (cardW + gap);
      this.buildChoice(choice, x, 236, cardW, 316, i);
    });

    this.addChild(this.fx);
    banner.alpha = 0;
    banner.y = 88;
    Tweens.to(banner, { alpha: 1, y: 108 }, { duration: 0.4, ease: Easing.backOut });
    this.fx.burst(W / 2, 108, { color: accent, count: 26, speed: 300, size: 0.42 });
  }

  private buildChoice(choice: RewardChoice, x: number, y: number, w: number, h: number, index: number): void {
    const wrap = new Container();
    const tierColor = RarityColor[choice.tier];
    const dark = mix(tierColor, Palette.black, 0.74);
    const metal = mix(tierColor, Palette.white, 0.28);

    // Layered metal frame — same grammar as an equipment card.
    const frame = new Graphics();
    const paintFrame = (border: number, borderWidth: number, fill: number) => {
      frame.clear()
        .roundRect(0, 0, w, h, 14).fill({ color: fill, alpha: 0.96 })
        .stroke({ color: border, width: borderWidth })
        .roundRect(4, 4, w - 8, h - 8, 11).stroke({ color: tierColor, width: 1.5, alpha: 0.85 });
      for (const [cx, cy, sx, sy] of [
        [7, 7, 1, 1], [w - 7, 7, -1, 1], [7, h - 7, 1, -1], [w - 7, h - 7, -1, -1],
      ] as const) {
        frame.moveTo(cx, cy + 16 * sy).lineTo(cx, cy).lineTo(cx + 16 * sx, cy).stroke({ color: metal, width: 2.5, alpha: 0.9 });
      }
    };
    paintFrame(mix(tierColor, Palette.black, 0.3), 3, dark);

    // Category chip.
    const chipW = 96;
    const chip = new Graphics()
      .roundRect(w / 2 - chipW / 2, 14, chipW, 22, 11)
      .fill({ color: mix(tierColor, Palette.black, 0.55), alpha: 0.95 })
      .stroke({ color: tierColor, width: 1.5 });
    const cat = new Text({ text: CATEGORY_LABEL[choice.category], style: Type.tiny() });
    cat.style.fill = mix(tierColor, Palette.white, 0.45);
    cat.anchor.set(0.5);
    cat.position.set(w / 2, 25);

    const rarityBadge = buildRarityIcon(choice.tier, 34, 27);
    rarityBadge.position.set(24, 26);

    // Art well: tinted glow behind the reward glyph.
    const well = new Graphics()
      .roundRect(14, 48, w - 28, 108, 10)
      .fill({ color: Palette.black, alpha: 0.5 })
      .stroke({ color: mix(tierColor, Palette.black, 0.2), width: 1, alpha: 0.7 });
    const glow = new Sprite(glowTexture());
    glow.anchor.set(0.5);
    glow.tint = tierColor;
    glow.blendMode = 'add';
    glow.alpha = 0.55;
    glow.width = w * 0.8;
    glow.height = 120;
    glow.position.set(w / 2, 102);
    const icon = new Text({ text: choice.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 62 } });
    icon.anchor.set(0.5);
    icon.position.set(w / 2, 102);

    const title = new Text({ text: choice.title, style: Type.h2() });
    title.anchor.set(0.5);
    title.position.set(w / 2, 182);
    if (title.width > w - 24) title.scale.set((w - 24) / title.width);

    const rule = new Graphics().moveTo(w / 2 - 40, 202).lineTo(w / 2 + 40, 202).stroke({ color: metal, width: 1, alpha: 0.5 });

    const desc = new Text({ text: choice.desc, style: Type.bodyDim() });
    desc.style.wordWrap = true;
    desc.style.wordWrapWidth = w - 44;
    desc.style.align = 'center';
    desc.anchor.set(0.5, 0);
    desc.position.set(w / 2, 214);

    const hint = new Text({ text: 'CLICK TO CLAIM', style: Type.tiny() });
    hint.style.fill = Palette.textFaint;
    hint.anchor.set(0.5);
    hint.position.set(w / 2, h - 18);

    wrap.addChild(frame, well, glow, icon, chip, cat, rarityBadge, title, rule, desc, hint);
    wrap.position.set(x, y + 30);
    wrap.alpha = 0;
    this.addChild(wrap);
    Tweens.to(wrap, { alpha: 1, y }, { duration: 0.4, delay: 0.15 + index * 0.12, ease: Easing.backOut });

    wrap.eventMode = 'static';
    wrap.cursor = 'pointer';
    wrap.on('pointerover', () => {
      if (this.picked) return;
      this.game.sfx.hover();
      Tweens.to(wrap, { y: y - 12 }, { duration: 0.15, ease: Easing.quadOut });
      Tweens.to(glow, { alpha: 0.85 }, { duration: 0.15 });
      hint.style.fill = Palette.gold;
      paintFrame(Palette.gold, 3.5, mix(tierColor, Palette.black, 0.62));
    });
    wrap.on('pointerout', () => {
      if (this.picked) return;
      Tweens.to(wrap, { y }, { duration: 0.18 });
      Tweens.to(glow, { alpha: 0.55 }, { duration: 0.18 });
      hint.style.fill = Palette.textFaint;
      paintFrame(mix(tierColor, Palette.black, 0.3), 3, dark);
    });
    wrap.on('pointerdown', () => {
      if (this.picked) return;
      this.picked = true;
      this.game.sfx.click();
      this.game.sfx.coin();
      let applied: void | string | string[];
      try {
        applied = choice.apply(this.run);
      } catch (error) {
        console.error(`Failed to apply reward ${choice.id}`, error);
        this.picked = false;
        this.game.toast('That reward could not be applied. Please choose again.', Palette.danger);
        return;
      }
      this.fx.burst(x + w / 2, y + h / 2, { color: Palette.gold, count: 26, speed: 320, size: 0.45 });
      Tweens.to(wrap.scale, { x: 1.06, y: 1.06 }, { duration: 0.18, ease: Easing.backOut });
      const continueRun = () => {
        this.run.advanceFloor();
        // Conquest returns to the map (which routes to victory once every
        // universe falls); the tower proceeds straight to formation.
        this.game.goto(this.run.isConquest() ? new ConquestMapScene(this.game) : new TeamScene(this.game));
      };
      const itemIds = typeof applied === 'string' ? [applied] : Array.isArray(applied) ? applied : [];
      if (itemIds.length === 0) {
        Tweens.delay(0.55, continueRun);
        return;
      }
      try {
        itemIds.forEach((itemId) => getShopItem(itemId));
        this.showMysterySpins(itemIds, continueRun);
      } catch (error) {
        console.error(`Reward ${choice.id} returned invalid equipment`, error);
        this.game.toast('Reward granted; its reveal was skipped.', Palette.gold);
        Tweens.delay(0.75, continueRun);
      }
    });
  }


  private showMysterySpins(itemIds: readonly string[], onComplete: () => void): void {
    const [nextItemId, ...remaining] = itemIds;
    if (!nextItemId) {
      onComplete();
      return;
    }
    this.showMysterySpin(nextItemId, () => this.showMysterySpins(remaining, onComplete));
  }

  /** One reel cell showing real equipment art on a tier-tinted plate. */
  private buildReelCell(item: (typeof SHOP_ITEMS)[number]): Container {
    const cell = new Container();
    const color = ITEM_TIER_COLOR[item.tier];
    const bg = new Graphics()
      .roundRect(0, 0, 108, 126, 12)
      .fill(mix(color, Palette.black, 0.7))
      .stroke({ color, width: 2 })
      .roundRect(3, 3, 102, 120, 10)
      .stroke({ color: mix(color, Palette.white, 0.25), width: 1, alpha: 0.6 });
    const artWell = new Graphics()
      .roundRect(9, 9, 90, 74, 8)
      .fill({ color: Palette.black, alpha: 0.5 })
      .circle(54, 46, 34)
      .fill({ color, alpha: 0.14 });
    const icon = buildItemIcon(item, 62);
    icon.position.set(54, 46);
    const rarityBadge = buildRarityIcon(item.tier, 24, 19);
    rarityBadge.position.set(92, 16);
    const tier = new Text({ text: item.tier.toUpperCase(), style: Type.tiny() });
    tier.style.fill = color;
    tier.anchor.set(0.5);
    tier.position.set(54, 94);
    const name = new Text({ text: item.name.toUpperCase(), style: Type.tiny() });
    name.style.fill = Palette.text;
    name.anchor.set(0.5);
    name.position.set(54, 111);
    if (name.width > 98) name.scale.set(98 / name.width);
    cell.addChild(bg, artWell, icon, rarityBadge, tier, name);
    return cell;
  }

  private showMysterySpin(itemId: string, onComplete: () => void): void {
    const result = getShopItem(itemId);
    const overlay = new Container();
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.9 });
    const panel = new Graphics().roundRect(250, 130, 780, 452, 22)
      .fill({ color: Palette.panel, alpha: 0.99 })
      .stroke({ color: ITEM_TIER_COLOR[result.tier], width: 3 });
    const title = new Text({ text: 'MYSTERY EQUIPMENT SPIN', style: Type.h1() });
    title.anchor.set(0.5);
    title.position.set(W / 2, 172);
    const odds = new Text({ text: 'COMMON 54%  -  RARE 25%  -  EPIC 15%  -  LEGENDARY 3%  -  SUPREME 2%  -  GODLIKE 1%', style: Type.tiny() });
    odds.anchor.set(0.5);
    odds.position.set(W / 2, 204);
    overlay.addChild(dim, panel, title, odds);

    const viewport = new Container();
    viewport.position.set(340, 232);
    const railMask = new Graphics().roundRect(0, 0, 600, 150, 14).fill(Palette.white);
    const railBg = new Graphics().roundRect(0, 0, 600, 150, 14)
      .fill({ color: Palette.black, alpha: 0.72 })
      .stroke({ color: Palette.borderLight, width: 2 });
    const track = new Container();
    const visualPool = SHOP_ITEMS.filter((item) => item.kind === 'equipment');
    const sequence = Array.from({ length: 22 }, () => visualPool[Math.floor(Math.random() * visualPool.length)]!);
    sequence.push(result);
    sequence.push(visualPool[Math.floor(Math.random() * visualPool.length)]!, visualPool[Math.floor(Math.random() * visualPool.length)]!);
    const cells: Container[] = [];
    sequence.forEach((item, index) => {
      const cell = this.buildReelCell(item);
      cell.position.set(index * 130 + 11, 12);
      track.addChild(cell);
      cells.push(cell);
    });
    track.mask = railMask;
    viewport.addChild(railBg, track, railMask);
    const marker = new Graphics()
      .poly([W / 2 - 12, 220, W / 2 + 12, 220, W / 2, 232]).fill(Palette.gold)
      .poly([W / 2 - 12, 394, W / 2 + 12, 394, W / 2, 382]).fill(Palette.gold);
    const selector = new Graphics()
      .roundRect(W / 2 - 61, 231, 122, 152, 14)
      .stroke({ color: Palette.gold, width: 3, alpha: 0.9 });
    overlay.addChild(viewport, marker, selector);

    // Reveal cluster (art + name + boosts) fades in once the reel locks.
    const reveal = new Container();
    reveal.position.set(W / 2, 470);
    reveal.alpha = 0;
    const chipRing = new Graphics();
    const artChip = buildItemIcon(result, 58);
    artChip.position.set(-232, 24);
    const resultText = new Text({ text: '', style: Type.h2() });
    resultText.anchor.set(0, 0.5);
    resultText.position.set(-188, 8);
    const boostText = new Text({ text: '', style: Type.body() });
    boostText.style.fill = Palette.success;
    boostText.anchor.set(0, 0.5);
    boostText.position.set(-188, 36);
    reveal.addChild(chipRing, artChip, resultText, boostText);
    overlay.addChild(reveal);

    this.addChild(overlay);
    overlay.alpha = 0;
    Tweens.to(overlay, { alpha: 1 }, { duration: 0.2 });
    track.x = 300;
    const finalIndex = 22;
    const targetX = 300 - (finalIndex * 130 + 65);
    let lastTick = -1;
    Tweens.to(track, { x: targetX }, {
      duration: 2.5,
      ease: Easing.quadOut,
      onUpdate: () => {
        const centered = Math.max(0, Math.round((300 - track.x - 65) / 130));
        if (centered !== lastTick) {
          lastTick = centered;
          this.game.sfx.wheelTick(0.85 + Math.random() * 0.2);
        }
      },
      onComplete: () => {
        const tierOrder: ItemTier[] = ['common', 'rare', 'epic', 'legendary', 'supreme', 'godlike'];
        const color = ITEM_TIER_COLOR[result.tier];
        const boosts = itemBoostSummary(result);
        resultText.text = `${result.tier.toUpperCase()} · ${result.name.toUpperCase()}`;
        resultText.style.fill = color;
        boostText.text = boosts ? `${boosts}   •   Added to your Formation Bag` : 'Added to your Formation Bag';
        chipRing.clear()
          .roundRect(-262, -6, 60, 60, 12)
          .fill({ color: Palette.black, alpha: 0.55 })
          .stroke({ color, width: 2 });
        panel.clear().roundRect(250, 130, 780, 452, 22)
          .fill({ color: Palette.panel, alpha: 0.99 })
          .stroke({ color, width: 4 });
        selector.clear().roundRect(W / 2 - 61, 231, 122, 152, 14).stroke({ color, width: 4 });
        // Pop the winning cell so the eye lands on the art.
        const winner = cells[finalIndex];
        if (winner) {
          winner.pivot.set(54, 63);
          winner.position.set(finalIndex * 130 + 11 + 54, 12 + 63);
          Tweens.to(winner.scale, { x: 1.14, y: 1.14 }, { duration: 0.24, ease: Easing.backOut });
        }
        Tweens.to(reveal, { alpha: 1 }, { duration: 0.3 });
        this.fx.flash(color, result.tier === 'godlike' ? 0.35 : 0.18);
        this.fx.burst(W / 2, 307, { color, count: 28 + tierOrder.indexOf(result.tier) * 8, speed: 340, size: 0.42 });
        const revealTier = tierOrder.indexOf(result.tier) as 0 | 1 | 2 | 3 | 4 | 5;
        this.game.sfx.reelStop();
        this.game.sfx.reveal(revealTier);
        Tweens.delay(1.35, onComplete);
      },
    });
  }

  override update(dt: number): void {
    this.fx.update(dt);
  }
}
