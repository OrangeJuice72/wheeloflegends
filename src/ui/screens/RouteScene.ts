/** Branching tower route choice shown between completed floors. */

import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import type { FloorKind } from '../../sim/tower';
import { Button } from '../components/Button';
import { H, mix, Palette, Type, W } from '../theme';

const ROUTE_INFO: Record<FloorKind, { title: string; icon: string; desc: string; risk: string; color: number }> = {
  battle: { title: 'Battle', icon: '⚔️', desc: 'A standard enemy squad blocks the ascent.', risk: 'STEADY RISK · FULL REWARD', color: Palette.blue },
  elite: { title: 'Elite Battle', icon: '💀', desc: 'A stronger squad led by an afflicted champion.', risk: 'HIGH RISK · EXTRA CHOICES', color: Palette.danger },
  treasure: { title: 'Treasure Vault', icon: '💎', desc: 'Choose between equipment, wealth, or a dangerous seal.', risk: 'NO COMBAT · BUILD POWER', color: 0x9b72ff },
  rest: { title: 'Campfire', icon: '🔥', desc: 'Recover, train a legend, or meditate for power.', risk: 'NO COMBAT · RECOVERY', color: Palette.gold },
  merchant: { title: 'Merchant', icon: '🛒', desc: 'Spend coins on gear or recruiting contracts.', risk: 'NO COMBAT · SHOP', color: Palette.success },
};

export class RouteScene extends Scene {
  constructor(game: Game, private readonly onChosen: () => void) {
    super(game);
  }

  private get run() {
    const run = this.game.run;
    if (!run) throw new Error('RouteScene requires an active run');
    return run;
  }

  onEnter(): void {
    const bg = new Graphics().rect(0, 0, W, H).fill(Palette.bg);
    const glow = new Graphics().circle(W / 2, 350, 370).fill({ color: Palette.blue, alpha: 0.06 });
    this.addChild(bg, glow);
    const floor = new Text({ text: `CHOOSE THE PATH TO FLOOR ${this.run.floor}`, style: Type.h1() });
    floor.anchor.set(0.5);
    floor.position.set(W / 2, 70);
    const sub = new Text({ text: 'The tower reveals several routes. Your choice determines the next room.', style: Type.bodyDim() });
    sub.anchor.set(0.5);
    sub.position.set(W / 2, 112);
    this.addChild(floor, sub);

    const choices = this.run.routeChoicesForCurrentFloor();
    const cardW = choices.length === 1 ? 400 : 300;
    const gap = 28;
    const total = choices.length * cardW + (choices.length - 1) * gap;
    choices.forEach((kind, index) => {
      const info = ROUTE_INFO[kind];
      const x = (W - total) / 2 + index * (cardW + gap);
      const card = new Container();
      card.position.set(x, 170);
      const plate = new Graphics()
        .roundRect(0, 0, cardW, 380, 20)
        .fill({ color: mix(info.color, Palette.black, 0.82), alpha: 0.96 })
        .stroke({ color: info.color, width: 3 })
        .roundRect(8, 8, cardW - 16, 364, 15)
        .stroke({ color: mix(info.color, Palette.white, 0.3), width: 1, alpha: 0.55 });
      const icon = new Text({ text: info.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 76 } });
      icon.anchor.set(0.5);
      icon.position.set(cardW / 2, 78);
      const title = new Text({ text: info.title.toUpperCase(), style: Type.h2() });
      title.style.fill = info.color;
      title.anchor.set(0.5);
      title.position.set(cardW / 2, 148);
      const desc = new Text({ text: info.desc, style: Type.body() });
      desc.style.wordWrap = true;
      desc.style.wordWrapWidth = cardW - 48;
      desc.style.align = 'center';
      desc.anchor.set(0.5, 0);
      desc.position.set(cardW / 2, 190);
      const risk = new Text({ text: info.risk, style: Type.tiny() });
      risk.style.fill = info.color;
      risk.anchor.set(0.5);
      risk.position.set(cardW / 2, 282);
      const choose = new Button(kind === 'battle' && choices.length === 1 ? 'FACE THE GUARDIAN' : 'CHOOSE PATH', this.game.sfx, {
        width: cardW - 48,
        height: 52,
        variant: 'primary',
        onClick: () => {
          if (!this.run.chooseRoute(kind)) return;
          this.game.saveRun();
          this.onChosen();
        },
      });
      choose.position.set(cardW / 2, 336);
      card.addChild(plate, icon, title, desc, risk, choose);
      this.addChild(card);
    });

    const wallet = new Text({ text: `🪙 ${this.run.gold.toLocaleString('en-US')}     🎟 ${this.run.spins}`, style: Type.h3() });
    wallet.anchor.set(0.5);
    wallet.position.set(W / 2, H - 70);
    this.addChild(wallet);
  }
}
