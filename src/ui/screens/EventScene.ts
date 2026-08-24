/** Interactive treasure, rest, and merchant rooms with explicit risk/reward choices. */

import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import type { EventChoice, EventResult } from '../../sim/run';
import { getShopItem } from '../../data/items';
import { Button } from '../components/Button';
import { buildItemIcon } from '../components/ItemIcon';
import { FxLayer } from '../fx/effects';
import { H, mix, Palette, Type, W } from '../theme';
import { advanceToNextFloor } from './floorRouter';

const ROOM_THEME = {
  treasure: { icon: '💎', title: 'TREASURE VAULT', color: 0x9b72ff },
  rest: { icon: '🔥', title: 'CAMPFIRE', color: Palette.gold },
  merchant: { icon: '🛒', title: 'WANDERING MERCHANT', color: Palette.success },
} as const;

export class EventScene extends Scene {
  private fx = new FxLayer();
  private choiceLayer = new Container();
  private resolved = false;

  constructor(game: Game) {
    super(game);
  }

  private get run() {
    const run = this.game.run;
    if (!run) throw new Error('EventScene requires an active run');
    return run;
  }

  onEnter(): void {
    const kind = this.run.currentFloor().kind;
    if (kind === 'battle' || kind === 'elite') throw new Error('EventScene cannot open for combat');
    const theme = ROOM_THEME[kind];
    const backdrop = new Graphics().rect(0, 0, W, H).fill(Palette.bg);
    const aura = new Graphics().circle(W / 2, 340, 420).fill({ color: theme.color, alpha: 0.08 });
    this.addChild(backdrop, aura);

    const floor = new Text({ text: `FLOOR ${this.run.floor}`, style: Type.tiny() });
    floor.style.fill = Palette.textDim;
    floor.anchor.set(0.5);
    floor.position.set(W / 2, 46);
    const title = new Text({ text: `${theme.icon}  ${theme.title}`, style: Type.banner(theme.color) });
    title.anchor.set(0.5);
    title.position.set(W / 2, 92);
    const subtitle = new Text({ text: 'CHOOSE ONE — EVERY OPTION CHANGES THE RUN', style: Type.h3() });
    subtitle.style.fill = Palette.textDim;
    subtitle.anchor.set(0.5);
    subtitle.position.set(W / 2, 140);
    this.addChild(floor, title, subtitle, this.choiceLayer);
    this.buildChoices(this.run.eventChoices(), theme.color);
    this.addChild(this.fx);
  }

  private buildChoices(choices: readonly EventChoice[], accent: number): void {
    const cardW = 330;
    const gap = 30;
    const total = choices.length * cardW + (choices.length - 1) * gap;
    choices.forEach((choice, index) => {
      const x = (W - total) / 2 + index * (cardW + gap);
      const card = new Container();
      card.position.set(x, 190);
      card.alpha = choice.available ? 1 : 0.48;
      const plate = new Graphics()
        .roundRect(0, 0, cardW, 350, 20)
        .fill({ color: Palette.panel, alpha: 0.96 })
        .stroke({ color: choice.available ? accent : Palette.border, width: 2.5 });
      const icon = new Text({ text: choice.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 64 } });
      icon.anchor.set(0.5);
      icon.position.set(cardW / 2, 68);
      const name = new Text({ text: choice.title.toUpperCase(), style: Type.h2() });
      name.style.fill = choice.available ? accent : Palette.textFaint;
      name.anchor.set(0.5);
      name.position.set(cardW / 2, 132);
      if (name.width > cardW - 32) name.scale.set((cardW - 32) / name.width);
      const desc = new Text({ text: choice.desc, style: Type.body() });
      desc.style.wordWrap = true;
      desc.style.wordWrapWidth = cardW - 48;
      desc.style.align = 'center';
      desc.anchor.set(0.5, 0);
      desc.position.set(cardW / 2, 172);
      const button = new Button(choice.available ? 'TAKE THIS PATH' : 'NOT AVAILABLE', this.game.sfx, {
        width: cardW - 48,
        height: 50,
        variant: 'primary',
        onClick: () => this.resolve(choice.id, accent),
      });
      button.position.set(cardW / 2, 306);
      button.setEnabled(choice.available);
      card.addChild(plate, icon, name, desc, button);
      this.choiceLayer.addChild(card);
    });
    const wallet = new Text({ text: `🪙 ${this.run.gold.toLocaleString('en-US')}     🎟 ${this.run.spins}`, style: Type.h3() });
    wallet.anchor.set(0.5);
    wallet.position.set(W / 2, H - 72);
    this.choiceLayer.addChild(wallet);
  }

  private resolve(choiceId: string, accent: number): void {
    if (this.resolved) return;
    let result: EventResult;
    try {
      result = this.run.resolveEventChoice(choiceId);
    } catch (error) {
      console.error(`Failed to resolve event choice ${choiceId}`, error);
      this.game.toast('That choice is no longer available.', Palette.danger);
      return;
    }
    this.resolved = true;
    this.game.saveRun();
    this.choiceLayer.visible = false;
    this.showResult(result, accent);
  }

  private showResult(result: EventResult, accent: number): void {
    const panel = new Graphics()
      .roundRect(W / 2 - 390, 180, 780, 350, 24)
      .fill({ color: Palette.panel, alpha: 0.98 })
      .stroke({ color: accent, width: 3 });
    const icon = new Text({ text: result.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 82 } });
    icon.anchor.set(0.5);
    icon.position.set(W / 2, 250);
    const title = new Text({ text: result.title, style: Type.banner(accent) });
    title.anchor.set(0.5);
    title.position.set(W / 2, 330);
    const detail = new Text({ text: result.detail, style: Type.body() });
    detail.style.wordWrap = true;
    detail.style.wordWrapWidth = 650;
    detail.style.align = 'center';
    detail.anchor.set(0.5, 0);
    detail.position.set(W / 2, 374);
    this.addChild(panel, icon, title, detail);
    if (result.itemId) {
      const item = getShopItem(result.itemId);
      const well = new Graphics().roundRect(W / 2 - 48, 438, 96, 70, 12)
        .fill({ color: Palette.black, alpha: 0.55 })
        .stroke({ color: mix(accent, Palette.white, 0.18), width: 2 });
      const art = buildItemIcon(item, 58);
      art.position.set(W / 2, 473);
      this.addChild(well, art);
    }
    const onward = new Button('CONTINUE TO ROUTE MAP', this.game.sfx, {
      width: 340,
      height: 56,
      variant: 'primary',
      onClick: () => advanceToNextFloor(this.game),
    });
    onward.position.set(W / 2, H - 78);
    this.addChild(onward);
    this.game.sfx.coin();
    this.fx.burst(W / 2, 250, { color: accent, count: 30, speed: 320, size: 0.46 });
  }

  override update(dt: number): void {
    this.fx.update(dt);
  }
}
