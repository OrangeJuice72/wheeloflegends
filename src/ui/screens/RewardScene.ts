/** Post-victory reward draft: three choices, one pick, on to the next floor. */

import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { Tweens, Easing } from '../../core/Tween';
import type { RewardChoice } from '../../sim/run';
import { getShopItem, ITEM_TIER_COLOR, SHOP_ITEMS } from '../../data/items';
import type { ItemTier } from '../../data/items';
import { isBossFloor } from '../../sim/tower';
import { FxLayer } from '../fx/effects';
import { H, Palette, RarityColor, Type, W } from '../theme';
import { TeamScene } from './TeamScene';
import { buildRarityIcon } from '../components/RarityIcon';

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
    const boss = isBossFloor(run.floor);

    const banner = new Text({ text: boss ? `👑  BOSS FLOOR ${run.floor} CLEARED  👑` : `FLOOR ${run.floor} CLEARED`, style: Type.banner(Palette.gold) });
    banner.anchor.set(0.5);
    banner.position.set(W / 2, 110);
    if (banner.width > 900) banner.scale.set(900 / banner.width);
    this.addChild(banner);

    const sub = new Text({ text: 'CHOOSE YOUR SPOILS', style: Type.h3() });
    sub.style.fill = Palette.textDim;
    sub.anchor.set(0.5);
    sub.position.set(W / 2, 154);
    const payout = new Text({ text: `BATTLE PAYOUT  +${run.lastBattleCoins.toLocaleString('en-US')} COINS`, style: Type.h3() });
    payout.style.fill = Palette.success;
    payout.anchor.set(0.5);
    payout.position.set(W / 2, 190);
    this.addChild(payout);
    this.addChild(sub);

    const gold = new Text({ text: `🪙 ${run.gold.toLocaleString('en-US')}     🎟 ${run.spins}`, style: Type.h3() });
    gold.anchor.set(0.5);
    gold.position.set(W / 2, H - 40);
    this.addChild(gold);

    const choices = run.generateRewards();
    const cardW = choices.length > 3 ? 230 : 270;
    const gap = choices.length > 3 ? 20 : 40;
    const totalW = choices.length * cardW + (choices.length - 1) * gap;
    choices.forEach((choice, i) => {
      const x = W / 2 - totalW / 2 + i * (cardW + gap);
      this.buildChoice(choice, x, 225, cardW, 310, i);
    });

    this.addChild(this.fx);
    banner.alpha = 0;
    banner.y = 90;
    Tweens.to(banner, { alpha: 1, y: 110 }, { duration: 0.4, ease: Easing.backOut });
    this.fx.burst(W / 2, 110, { color: Palette.gold, count: 24, speed: 300, size: 0.4 });
  }

  private buildChoice(choice: RewardChoice, x: number, y: number, w: number, h: number, index: number): void {
    const wrap = new Container();
    const tierColor = RarityColor[choice.tier];
    const bg = new Graphics()
      .roundRect(0, 0, w, h, 16)
      .fill({ color: Palette.panel, alpha: 0.95 })
      .stroke({ color: tierColor, width: 2 });
    const tier = new Text({ text: `${choice.tier.toUpperCase()} \u2022 ${choice.category.toUpperCase()}`, style: Type.tiny() });
    tier.style.fill = tierColor;
    tier.anchor.set(0.5);
    tier.position.set(w / 2, 22);
    const rarityBadge = buildRarityIcon(choice.tier, 34, 27);
    rarityBadge.position.set(22, 22);
    const icon = new Text({ text: choice.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 64 } });
    icon.anchor.set(0.5);
    icon.position.set(w / 2, 84);
    const title = new Text({ text: choice.title, style: Type.h2() });
    title.anchor.set(0.5);
    title.position.set(w / 2, 168);
    if (title.width > w - 24) title.scale.set((w - 24) / title.width);
    const desc = new Text({ text: choice.desc, style: Type.bodyDim() });
    desc.style.wordWrap = true;
    desc.style.wordWrapWidth = w - 44;
    desc.style.align = 'center';
    desc.anchor.set(0.5, 0);
    desc.position.set(w / 2, 200);
    wrap.addChild(bg, rarityBadge, tier, icon, title, desc);
    wrap.position.set(x, y + 30);
    wrap.alpha = 0;
    wrap.pivot.set(0, 0);
    this.addChild(wrap);
    Tweens.to(wrap, { alpha: 1, y }, { duration: 0.4, delay: 0.15 + index * 0.12, ease: Easing.backOut });

    wrap.eventMode = 'static';
    wrap.cursor = 'pointer';
    wrap.on('pointerover', () => {
      if (this.picked) return;
      this.game.sfx.hover();
      Tweens.to(wrap, { y: y - 10 }, { duration: 0.15, ease: Easing.quadOut });
      bg.clear()
        .roundRect(0, 0, w, h, 16)
        .fill({ color: Palette.panelLight, alpha: 0.98 })
        .stroke({ color: Palette.gold, width: 2.5 });
    });
    wrap.on('pointerout', () => {
      if (this.picked) return;
      Tweens.to(wrap, { y }, { duration: 0.18 });
      bg.clear()
        .roundRect(0, 0, w, h, 16)
        .fill({ color: Palette.panel, alpha: 0.95 })
        .stroke({ color: tierColor, width: 2 });
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
        this.game.goto(new TeamScene(this.game));
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

  private showMysterySpin(itemId: string, onComplete: () => void): void {
    const result = getShopItem(itemId);
    const overlay = new Container();
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.9 });
    const panel = new Graphics().roundRect(250, 145, 780, 420, 22)
      .fill({ color: Palette.panel, alpha: 0.99 })
      .stroke({ color: ITEM_TIER_COLOR[result.tier], width: 3 });
    const title = new Text({ text: 'MYSTERY EQUIPMENT SPIN', style: Type.h1() });
    title.anchor.set(0.5);
    title.position.set(W / 2, 190);
    const odds = new Text({ text: 'COMMON 54%  -  RARE 25%  -  EPIC 15%  -  LEGENDARY 3%  -  SUPREME 2%  -  GODLIKE 1%', style: Type.tiny() });
    odds.anchor.set(0.5);
    odds.position.set(W / 2, 225);
    overlay.addChild(dim, panel, title, odds);

    const viewport = new Container();
    viewport.position.set(340, 260);
    const railMask = new Graphics().roundRect(0, 0, 600, 150, 14).fill(Palette.white);
    const railBg = new Graphics().roundRect(0, 0, 600, 150, 14)
      .fill({ color: Palette.black, alpha: 0.72 })
      .stroke({ color: Palette.borderLight, width: 2 });
    const track = new Container();
    const visualPool = SHOP_ITEMS.filter((item) => item.kind === 'equipment');
    const sequence = Array.from({ length: 22 }, () => visualPool[Math.floor(Math.random() * visualPool.length)]!);
    sequence.push(result);
    sequence.push(visualPool[Math.floor(Math.random() * visualPool.length)]!, visualPool[Math.floor(Math.random() * visualPool.length)]!);
    sequence.forEach((item, index) => {
      const cell = new Container();
      const color = ITEM_TIER_COLOR[item.tier];
      const bg = new Graphics().roundRect(0, 0, 108, 126, 12)
        .fill({ color: Palette.panelLight, alpha: 1 })
        .stroke({ color, width: 2 });
      const icon = new Text({ text: item.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 40 } });
      icon.anchor.set(0.5);
      icon.position.set(54, 46);
      const tier = new Text({ text: item.tier.toUpperCase(), style: Type.tiny() });
      tier.style.fill = color;
      tier.anchor.set(0.5);
      tier.position.set(54, 82);
      const rarityBadge = buildRarityIcon(item.tier, 24, 19);
      rarityBadge.position.set(92, 17);
      const name = new Text({ text: item.name.toUpperCase(), style: Type.tiny() });
      name.anchor.set(0.5);
      name.position.set(54, 105);
      if (name.width > 96) name.scale.set(96 / name.width);
      cell.addChild(bg, icon, rarityBadge, tier, name);
      cell.position.set(index * 130 + 11, 12);
      track.addChild(cell);
    });
    track.mask = railMask;
    viewport.addChild(railBg, track, railMask);
    const marker = new Graphics()
      .poly([W / 2 - 12, 248, W / 2 + 12, 248, W / 2, 260]).fill(Palette.gold)
      .poly([W / 2 - 12, 422, W / 2 + 12, 422, W / 2, 410]).fill(Palette.gold);
    overlay.addChild(viewport, marker);

    const resultText = new Text({ text: '', style: Type.h2() });
    resultText.anchor.set(0.5);
    resultText.position.set(W / 2, 485);
    overlay.addChild(resultText);
    this.addChild(overlay);
    overlay.alpha = 0;
    Tweens.to(overlay, { alpha: 1 }, { duration: 0.2 });
    track.x = 300;
    const finalIndex = 22;
    const targetX = 300 - (finalIndex * 130 + 65);
    Tweens.to(track, { x: targetX }, {
      duration: 2.5,
      ease: Easing.quadOut,
      onComplete: () => {
        const tierOrder: ItemTier[] = ['common', 'rare', 'epic', 'legendary', 'supreme', 'godlike'];
        const color = ITEM_TIER_COLOR[result.tier];
        resultText.text = `${result.tier.toUpperCase()} - ${result.name.toUpperCase()}`;
        resultText.style.fill = color;
        panel.clear().roundRect(250, 145, 780, 420, 22)
          .fill({ color: Palette.panel, alpha: 0.99 })
          .stroke({ color, width: 4 });
        this.fx.flash(color, result.tier === 'godlike' ? 0.35 : 0.18);
        this.fx.burst(W / 2, 335, { color, count: 28 + tierOrder.indexOf(result.tier) * 8, speed: 340, size: 0.42 });
        const revealTier = tierOrder.indexOf(result.tier) as 0 | 1 | 2 | 3 | 4 | 5;
        this.game.sfx.reelStop();
        this.game.sfx.reveal(revealTier);
        Tweens.delay(1.15, onComplete);
      },
    });
  }

  override update(dt: number): void {
    this.fx.update(dt);
  }
}
