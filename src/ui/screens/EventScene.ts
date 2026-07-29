/**
 * A non-combat room (treasure / campfire / merchant). Resolves the floor's
 * reward, shows what happened, then continues the climb.
 */

import { Graphics, Sprite, Text } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { Tweens, Easing } from '../../core/Tween';
import { getShopItem } from '../../data/items';
import { Button } from '../components/Button';
import { buildItemIcon } from '../components/ItemIcon';
import { FxLayer } from '../fx/effects';
import { glowTexture } from '../fx/textures';
import { H, mix, Palette, Type, W } from '../theme';
import { advanceToNextFloor } from './floorRouter';

export class EventScene extends Scene {
  private fx = new FxLayer();

  constructor(game: Game) {
    super(game);
  }

  private get run() {
    const run = this.game.run;
    if (!run) throw new Error('EventScene requires an active run');
    return run;
  }

  onEnter(): void {
    const run = this.run;
    const result = run.resolveEventFloor();
    const accent = result.icon === '💎' ? Palette.blue : result.icon === '🔥' ? Palette.gold : Palette.success;

    const backdrop = new Graphics().rect(0, 0, W, H).fill(Palette.bg);
    const wash = new Sprite(glowTexture());
    wash.anchor.set(0.5);
    wash.tint = accent;
    wash.alpha = 0.24;
    wash.width = W * 1.1;
    wash.height = H * 1.2;
    wash.position.set(W / 2, H / 2);
    this.addChild(backdrop, wash);

    const floorLabel = new Text({ text: `FLOOR ${run.floor}`, style: Type.tiny() });
    floorLabel.style.fill = Palette.textDim;
    floorLabel.anchor.set(0.5);
    floorLabel.position.set(W / 2, 96);
    this.addChild(floorLabel);

    const panel = new Graphics()
      .roundRect(W / 2 - 380, 130, 760, 360, 22)
      .fill({ color: Palette.panel, alpha: 0.95 })
      .stroke({ color: accent, width: 3 });
    this.addChild(panel);

    const icon = new Text({ text: result.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 84 } });
    icon.anchor.set(0.5);
    icon.position.set(W / 2, 218);
    const title = new Text({ text: result.title, style: Type.banner(accent) });
    title.anchor.set(0.5);
    title.position.set(W / 2, 306);
    if (title.width > 700) title.scale.set(700 / title.width);
    const detail = new Text({ text: result.detail, style: Type.body() });
    detail.style.wordWrap = true;
    detail.style.wordWrapWidth = 620;
    detail.style.align = 'center';
    detail.anchor.set(0.5, 0);
    detail.position.set(W / 2, 350);
    this.addChild(icon, title, detail);

    // Show the actual artifact when a treasure room granted one.
    if (result.itemId) {
      const item = getShopItem(result.itemId);
      const well = new Graphics()
        .roundRect(W / 2 - 52, 404, 104, 68, 12)
        .fill({ color: Palette.black, alpha: 0.45 })
        .stroke({ color: mix(accent, Palette.black, 0.3), width: 1.5 });
      const art = buildItemIcon(item, 56);
      art.position.set(W / 2, 438);
      this.addChild(well, art);
    }

    const wallet = new Text({ text: `🪙 ${run.gold.toLocaleString('en-US')}     🎟 ${run.spins}`, style: Type.h3() });
    wallet.anchor.set(0.5);
    wallet.position.set(W / 2, 528);
    this.addChild(wallet);

    const onward = new Button('CONTINUE THE CLIMB', this.game.sfx, {
      width: 340,
      height: 56,
      variant: 'primary',
      onClick: () => advanceToNextFloor(this.game),
    });
    onward.position.set(W / 2, H - 78);
    this.addChild(onward);

    this.addChild(this.fx);
    this.game.sfx.coin();
    this.fx.burst(W / 2, 218, { color: accent, count: 26, speed: 300, size: 0.45 });
    icon.scale.set(0.4);
    Tweens.to(icon.scale, { x: 1, y: 1 }, { duration: 0.45, ease: Easing.backOut });
    title.alpha = 0;
    Tweens.to(title, { alpha: 1 }, { duration: 0.35, delay: 0.12 });
  }

  override update(dt: number): void {
    this.fx.update(dt);
  }
}
