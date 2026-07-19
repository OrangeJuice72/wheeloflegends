/** Targeted equipment spins. Equipment management lives exclusively in Formation. */

import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { Tweens, Easing } from '../../core/Tween';
import { Balance } from '../../data/balance';
import {
  ITEM_SPIN_PRICES,
  ITEM_SPIN_WEIGHTS,
  ITEM_TIER_COLOR,
  ITEM_TIER_ORDER,
  SHOP_ITEMS,
  type ItemTier,
  type ShopItemDef,
} from '../../data/items';
import { Button } from '../components/Button';
import { buildItemIcon } from '../components/ItemIcon';
import { buildRarityIcon } from '../components/RarityIcon';
import { FeatheredBackground } from '../fx/FeatheredBackground';
import { backgroundTexture } from '../portraits';
import { H, Palette, Type, W } from '../theme';
import { SlotScene } from './SlotScene';

const TIER_LABEL: Record<ItemTier, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
  supreme: 'SUPREME',
  godlike: 'GODLIKE',
};

const ODDS_ABBR: Record<ItemTier, string> = {
  common: 'C',
  rare: 'R',
  epic: 'E',
  legendary: 'L',
  supreme: 'S',
  godlike: 'G',
};

export class ShopScene extends Scene {
  private goldText!: Text;
  private capacityText!: Text;
  private capacityBtn!: Button;
  private spinButtons: Button[] = [];
  private background?: FeatheredBackground;

  constructor(game: Game) {
    super(game);
  }

  private get run() {
    const run = this.game.run;
    if (!run) throw new Error('ShopScene requires an active run');
    return run;
  }

  onEnter(): void {
    const texture = backgroundTexture('recruitment-backdrop-v3');
    if (texture) {
      this.background = new FeatheredBackground(
        texture,
        1,
        0,
        1.025,
        this.game.visibleDesignWidth,
        this.game.visibleDesignHeight,
      );
      this.addChild(this.background);
    }
    const shade = new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.55 });
    this.addChild(shade);

    const title = new Text({ text: 'ITEM SPIN STORE', style: Type.h1() });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 18);
    const sub = new Text({ text: 'CHOOSE A TIER · BETTER SPINS COST MORE · EVERY RARITY CAN DROP', style: Type.h3() });
    sub.style.fill = Palette.textDim;
    sub.style.fontSize = 13;
    sub.anchor.set(0.5, 0);
    sub.position.set(W / 2, 60);

    const wallet = new Graphics().roundRect(22, 20, 190, 54, 14)
      .fill({ color: Palette.black, alpha: 0.72 })
      .stroke({ color: Palette.goldDark, width: 1.5 });
    const walletLabel = new Text({ text: 'COIN PURSE', style: Type.tiny() });
    walletLabel.style.fill = Palette.gold;
    walletLabel.position.set(38, 27);
    this.goldText = new Text({ text: '', style: Type.h2() });
    this.goldText.position.set(38, 42);

    const capacityBox = new Graphics().roundRect(226, 20, 250, 54, 14)
      .fill({ color: Palette.black, alpha: 0.72 })
      .stroke({ color: Palette.blue, width: 1.5, alpha: 0.8 });
    const capacityLabel = new Text({ text: 'COMMAND LIMIT', style: Type.tiny() });
    capacityLabel.style.fill = Palette.blue;
    capacityLabel.position.set(240, 27);
    this.capacityText = new Text({ text: '', style: Type.h3() });
    this.capacityText.position.set(240, 44);
    this.capacityBtn = new Button('EXPAND', this.game.sfx, {
      width: 112,
      height: 40,
      variant: 'secondary',
      onClick: () => {
        const result = this.run.buyTeamCostUpgrade();
        if (result === 'poor') {
          this.game.sfx.error();
          this.game.toast('Not enough coins for a command expansion', Palette.danger);
          return;
        }
        if (result === 'maxed') return;
        this.game.sfx.reveal(2);
        this.game.toast('Team cost limit increased by 2', Palette.blue);
        this.refreshHud();
      },
    });
    this.capacityBtn.position.set(416, 47);

    const back = new Button('‹  BACK TO RECRUIT', this.game.sfx, {
      width: 210,
      height: 46,
      variant: 'secondary',
      onClick: () => this.game.goto(new SlotScene(this.game)),
    });
    back.position.set(W - 128, 47);

    this.addChild(title, sub, wallet, walletLabel, this.goldText, capacityBox, capacityLabel, this.capacityText, this.capacityBtn, back);
    this.buildSpinCards();
    this.refreshHud();
  }

  override onResize(viewportW: number, viewportH: number): void {
    this.background?.resize(viewportW, viewportH);
  }

  private refreshHud(): void {
    this.goldText.text = '🪙 ' + this.run.gold.toLocaleString('en-US');
    this.capacityText.text = 'COST ' + this.run.teamCostCap;
    const capMaxed = this.run.teamCostCap >= Balance.team.maxCostCap;
    this.capacityBtn.setLabel(capMaxed ? 'MAXED' : '+2 · ' + this.run.nextTeamCostUpgradePrice);
    this.capacityBtn.setEnabled(!capMaxed && this.run.gold >= this.run.nextTeamCostUpgradePrice);
    ITEM_TIER_ORDER.forEach((tier, index) => {
      this.spinButtons[index]?.setEnabled(this.run.gold >= ITEM_SPIN_PRICES[tier]);
    });
  }

  private buildSpinCards(): void {
    const cardW = 380;
    const cardH = 242;
    const xPositions = [30, 450, 870];
    const yPositions = [106, 372];

    ITEM_TIER_ORDER.forEach((tier, index) => {
      const color = ITEM_TIER_COLOR[tier];
      const x = xPositions[index % 3]!;
      const y = yPositions[Math.floor(index / 3)]!;
      const card = new Container();
      card.position.set(x, y);

      const bg = new Graphics().roundRect(0, 0, cardW, cardH, 18)
        .fill({ color: Palette.panel, alpha: 0.96 })
        .stroke({ color, width: 2.5 });
      const glow = new Graphics().circle(cardW / 2, 62, 47)
        .fill({ color, alpha: 0.11 })
        .stroke({ color, width: 3, alpha: 0.55 });
      const rarityBadge = buildRarityIcon(tier, 96, 76);
      rarityBadge.position.set(cardW / 2, 62);

      const name = new Text({ text: TIER_LABEL[tier] + ' SPIN', style: Type.h2() });
      name.style.fill = color;
      name.anchor.set(0.5);
      name.position.set(cardW / 2, 119);

      const targetChance = ITEM_SPIN_WEIGHTS[tier][tier];
      const pitch = new Text({
        text: targetChance + '% ' + TIER_LABEL[tier] + ' TARGET CHANCE',
        style: Type.small(),
      });
      pitch.style.fill = Palette.text;
      pitch.anchor.set(0.5);
      pitch.position.set(cardW / 2, 145);

      const odds = ITEM_TIER_ORDER
        .map((resultTier) => ODDS_ABBR[resultTier] + ' ' + ITEM_SPIN_WEIGHTS[tier][resultTier] + '%')
        .join('  ·  ');
      const oddsText = new Text({ text: odds, style: Type.tiny() });
      oddsText.style.fill = Palette.textDim;
      oddsText.anchor.set(0.5);
      oddsText.position.set(cardW / 2, 167);
      if (oddsText.width > cardW - 24) oddsText.scale.set((cardW - 24) / oddsText.width);

      const spin = new Button('SPIN · ' + ITEM_SPIN_PRICES[tier] + ' 🪙', this.game.sfx, {
        width: 260,
        height: 48,
        variant: 'primary',
        onClick: () => this.spinForItem(tier),
      });
      spin.position.set(cardW / 2, 211);
      this.spinButtons.push(spin);

      card.addChild(bg, glow, rarityBadge, name, pitch, oddsText, spin);
      this.addChild(card);
    });

    const legend = new Text({
      text: 'ODDS:  C COMMON  ·  R RARE  ·  E EPIC  ·  L LEGENDARY  ·  S SUPREME  ·  G GODLIKE',
      style: Type.tiny(),
    });
    legend.anchor.set(0.5);
    legend.position.set(W / 2, 692);
    this.addChild(legend);
  }

  private spinForItem(tier: ItemTier): void {
    const result = this.run.buyItemSpin(tier);
    if (result.status === 'poor') {
      this.game.sfx.error();
      this.game.toast('You need ' + ITEM_SPIN_PRICES[tier] + ' coins for this spin', Palette.danger);
      return;
    }
    this.game.sfx.coin();
    this.refreshHud();
    this.showSpinResult(result.item, tier);
  }

  private showSpinResult(item: ShopItemDef, chosenTier: ItemTier): void {
    const modal = new Container();
    const scrim = new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.88 });
    scrim.eventMode = 'static';

    const panel = new Graphics().roundRect(42, 92, W - 84, 548, 24)
      .fill({ color: Palette.panel, alpha: 0.99 })
      .stroke({ color: ITEM_TIER_COLOR[chosenTier], width: 3 });
    const chosenBadge = buildRarityIcon(chosenTier, 58, 46);
    chosenBadge.position.set(W / 2 - 245, 132);
    const title = new Text({ text: TIER_LABEL[chosenTier] + ' ITEM ROULETTE', style: Type.h1() });
    title.style.fill = ITEM_TIER_COLOR[chosenTier];
    title.anchor.set(0.5);
    title.position.set(W / 2, 128);

    const oddsLine = ITEM_TIER_ORDER
      .map((tier) => TIER_LABEL[tier] + ' ' + ITEM_SPIN_WEIGHTS[chosenTier][tier] + '%')
      .join('  ·  ');
    const odds = new Text({ text: oddsLine, style: Type.tiny() });
    odds.anchor.set(0.5);
    odds.position.set(W / 2, 166);
    if (odds.width > W - 150) odds.scale.set((W - 150) / odds.width);

    const TILE_W = 158;
    const TILE_H = 210;
    const GAP = 18;
    const STEP = TILE_W + GAP;
    const VIEW_X = 104;
    const VIEW_Y = 198;
    const VIEW_W = W - VIEW_X * 2;
    const VIEW_H = TILE_H + 24;
    const viewport = new Container();
    viewport.position.set(VIEW_X, VIEW_Y);
    const rail = new Container();
    viewport.addChild(rail);
    const railMask = new Graphics().roundRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H, 18).fill(Palette.white);
    viewport.mask = railMask;

    // The visible filler rail mirrors the chosen spin's actual weight table.
    // Exact quota allocation guarantees, for example, that Common visibly
    // dominates a Common spin while every awarded result remains honest.
    const visualTiers = this.buildVisualTierSequence(chosenTier, 36);
    const sequence = visualTiers.map((tier) => this.pickVisualItem(tier));
    const landingIndex = sequence.length;
    sequence.push(item);
    for (let index = 0; index < 4; index++) {
      sequence.push(this.pickVisualItem(this.pickVisualTier(chosenTier)));
    }
    sequence.forEach((candidate, index) => {
      const tile = this.buildSpinTile(candidate, TILE_W, TILE_H);
      tile.position.set(index * STEP, 12);
      rail.addChild(tile);
    });

    const selector = new Graphics()
      .roundRect(VIEW_X + VIEW_W / 2 - TILE_W / 2 - 7, VIEW_Y + 5, TILE_W + 14, TILE_H + 14, 18)
      .stroke({ color: Palette.gold, width: 4 });
    const topMarker = new Graphics()
      .poly([W / 2 - 12, VIEW_Y - 5, W / 2 + 12, VIEW_Y - 5, W / 2, VIEW_Y + 9])
      .fill(Palette.gold);
    const bottomMarker = new Graphics()
      .poly([W / 2 - 12, VIEW_Y + VIEW_H + 5, W / 2 + 12, VIEW_Y + VIEW_H + 5, W / 2, VIEW_Y + VIEW_H - 9])
      .fill(Palette.gold);

    const resultText = new Text({ text: 'SPINNING FOR EQUIPMENT…', style: Type.h2() });
    resultText.anchor.set(0.5);
    resultText.position.set(W / 2, 472);
    const resultDetail = new Text({ text: 'The center selector determines your item.', style: Type.bodyDim() });
    resultDetail.anchor.set(0.5);
    resultDetail.position.set(W / 2, 505);

    const close = new Button('CONTINUE', this.game.sfx, {
      width: 230,
      height: 52,
      variant: 'primary',
      onClick: () => {
        this.removeChild(modal);
        modal.destroy({ children: true });
      },
    });
    close.position.set(W / 2, 575);
    close.alpha = 0;
    close.setEnabled(false);

    modal.addChild(
      scrim,
      panel,
      chosenBadge,
      title,
      odds,
      viewport,
      railMask,
      selector,
      topMarker,
      bottomMarker,
      resultText,
      resultDetail,
      close,
    );
    this.addChild(modal);
    modal.alpha = 0;
    Tweens.to(modal, { alpha: 1 }, { duration: 0.18 });

    const startX = VIEW_W / 2 - TILE_W / 2;
    const targetX = VIEW_W / 2 - (landingIndex * STEP + TILE_W / 2);
    rail.x = startX;
    let lastTick = 0;
    Tweens.to(rail, { x: targetX }, {
      duration: 3.55,
      ease: Easing.quartOut,
      onUpdate: () => {
        const centered = Math.max(0, Math.round((VIEW_W / 2 - rail.x - TILE_W / 2) / STEP));
        if (centered !== lastTick) {
          lastTick = centered;
          this.game.sfx.wheelTick(0.85 + Math.random() * 0.2);
        }
      },
      onComplete: () => {
        const color = ITEM_TIER_COLOR[item.tier];
        const revealTier = ITEM_TIER_ORDER.indexOf(item.tier) as 0 | 1 | 2 | 3 | 4 | 5;
        this.game.sfx.reelStop();
        this.game.sfx.reveal(revealTier);
        resultText.text = TIER_LABEL[item.tier] + ' · ' + item.name.toUpperCase();
        resultText.style.fill = color;
        resultDetail.text = item.description + '  Added to your Formation Bag.';
        resultDetail.style.fill = Palette.success;
        selector.clear()
          .roundRect(VIEW_X + VIEW_W / 2 - TILE_W / 2 - 7, VIEW_Y + 5, TILE_W + 14, TILE_H + 14, 18)
          .stroke({ color, width: 5 });
        selector.alpha = 0.55;
        Tweens.to(selector, { alpha: 1 }, { duration: 0.24, ease: Easing.quadOut });
        close.setEnabled(true);
        Tweens.to(close, { alpha: 1 }, { duration: 0.24, ease: Easing.backOut });
      },
    });
  }

  private buildVisualTierSequence(spinTier: ItemTier, count: number): ItemTier[] {
    const allocations = ITEM_TIER_ORDER.map((tier) => {
      const exact = ITEM_SPIN_WEIGHTS[spinTier][tier] * count / 100;
      return { tier, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    let remaining = count - allocations.reduce((sum, entry) => sum + entry.count, 0);
    const byRemainder = [...allocations].sort((a, b) => b.remainder - a.remainder);
    for (let index = 0; index < remaining; index++) byRemainder[index % byRemainder.length]!.count++;

    const result = allocations.flatMap((entry) => Array.from({ length: entry.count }, () => entry.tier));
    for (let index = result.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap]!, result[index]!];
    }
    return result;
  }

  private pickVisualTier(spinTier: ItemTier): ItemTier {
    const roll = Math.random() * 100;
    let cursor = 0;
    for (const tier of ITEM_TIER_ORDER) {
      cursor += ITEM_SPIN_WEIGHTS[spinTier][tier];
      if (roll <= cursor) return tier;
    }
    return spinTier;
  }

  private pickVisualItem(tier: ItemTier): ShopItemDef {
    const pool = SHOP_ITEMS.filter((item) => item.kind === 'equipment' && item.tier === tier);
    if (pool.length === 0) {
      const fallback = SHOP_ITEMS.filter((item) => item.kind === 'equipment');
      return fallback[Math.floor(Math.random() * fallback.length)]!;
    }
    return pool[Math.floor(Math.random() * pool.length)]!;
  }

  private buildSpinTile(item: ShopItemDef, width: number, height: number): Container {
    const tile = new Container();
    const color = ITEM_TIER_COLOR[item.tier];
    const bg = new Graphics().roundRect(0, 0, width, height, 14)
      .fill({ color: Palette.panelLight, alpha: 1 })
      .stroke({ color, width: 2.5 });
    const icon = buildItemIcon(item, 104);
    icon.position.set(width / 2, 65);
    const rarity = buildRarityIcon(item.tier, 30, 24);
    rarity.position.set(width - 20, 19);
    const name = new Text({ text: item.name.toUpperCase(), style: Type.h3() });
    name.anchor.set(0.5);
    name.position.set(width / 2, 132);
    if (name.width > width - 18) name.scale.set((width - 18) / name.width);
    const tier = new Text({ text: TIER_LABEL[item.tier], style: Type.tiny() });
    tier.style.fill = color;
    tier.anchor.set(0.5);
    tier.position.set(width / 2, 158);
    const description = new Text({ text: item.description, style: Type.small() });
    description.style.fontSize = 10;
    description.style.wordWrap = true;
    description.style.wordWrapWidth = width - 18;
    description.style.align = 'center';
    description.anchor.set(0.5, 0);
    description.position.set(width / 2, 174);
    tile.addChild(bg, icon, rarity, name, tier, description);
    return tile;
  }
}