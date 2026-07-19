/** Run over: the tower wins — show the story of the climb and invite another. */

import { Container, Text } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { randomSeed } from '../../core/Rng';
import { Tweens, Easing } from '../../core/Tween';
import { getCharacter } from '../../data/characters';
import { RunState } from '../../sim/run';
import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { Palette, Type, W } from '../theme';
import { MenuScene } from './MenuScene';
import { SlotScene } from './SlotScene';

export class SummaryScene extends Scene {
  constructor(game: Game) {
    super(game);
  }

  onEnter(): void {
    const run = this.game.run;
    if (!run) {
      this.game.goto(new MenuScene(this.game));
      return;
    }
    const newBest = run.floor >= this.game.meta.bestFloor && run.floor > 1;

    const banner = new Text({ text: 'THE TOWER CLAIMS YOU', style: Type.banner(Palette.danger) });
    banner.anchor.set(0.5);
    banner.position.set(W / 2, 100);
    this.addChild(banner);

    const floorText = new Text({ text: `FELL ON FLOOR ${run.floor}`, style: Type.h1() });
    floorText.anchor.set(0.5);
    floorText.position.set(W / 2, 170);
    this.addChild(floorText);

    if (newBest) {
      const best = new Text({ text: '★  NEW BEST CLIMB  ★', style: Type.h2() });
      best.style.fill = Palette.gold;
      best.anchor.set(0.5);
      best.position.set(W / 2, 214);
      this.addChild(best);
      Tweens.to(best.scale, { x: 1.12, y: 1.12 }, { duration: 0.5, ease: Easing.sineInOut });
      Tweens.to(best.scale, { x: 1, y: 1 }, { duration: 0.5, delay: 0.5, ease: Easing.sineInOut });
    }

    // the numbers of the run
    const stats = new Panel(360, 190, 'The Climb');
    stats.position.set(W / 2 - 380, 260);
    const lines = [
      `Floors conquered      ${run.floor - 1}`,
      `Coins earned          ${run.goldEarned.toLocaleString('en-US')}`,
      `Enemies defeated      ${run.kills}`,
      `Legends recruited     ${run.roster.length}`,
    ];
    lines.forEach((text, i) => {
      const line = new Text({ text, style: Type.body() });
      line.position.set(20, 16 + i * 30);
      stats.content.addChild(line);
    });
    this.addChild(stats);

    // damage leaders from the final stand
    const leaders = new Panel(360, 190, 'Final Stand — Damage Leaders');
    leaders.position.set(W / 2 + 20, 260);
    const playerUnits = (run.lastBattle?.units ?? [])
      .filter((u) => u.side === 'player')
      .sort((a, b) => b.damageDealt - a.damageDealt)
      .slice(0, 4);
    playerUnits.forEach((u, i) => {
      const def = getCharacter(u.defId);
      const row = new Container();
      const glyph = new Text({ text: def.portrait.glyph, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 20 } });
      const name = new Text({ text: def.name, style: Type.body() });
      name.position.set(34, 2);
      const dmg = new Text({ text: u.damageDealt.toLocaleString('en-US'), style: Type.number() });
      dmg.style.fill = Palette.gold;
      dmg.anchor.set(1, 0);
      dmg.position.set(320, 4);
      row.position.set(20, 12 + i * 32);
      row.addChild(glyph, name, dmg);
      leaders.content.addChild(row);
    });
    this.addChild(leaders);

    const again = new Button('🎰   CLIMB AGAIN', this.game.sfx, {
      width: 280,
      height: 60,
      onClick: () => {
        this.game.run = new RunState(randomSeed(), this.game.meta.difficulty);
        this.game.meta.totalRuns++;
        this.game.saveMeta();
        this.game.goto(new SlotScene(this.game));
      },
    });
    again.position.set(W / 2 - 160, 560);
    const menu = new Button('MAIN MENU', this.game.sfx, {
      width: 220,
      height: 54,
      variant: 'secondary',
      onClick: () => {
        this.game.run = null;
        this.game.goto(new MenuScene(this.game));
      },
    });
    menu.position.set(W / 2 + 160, 560);
    this.addChild(again, menu);

    banner.alpha = 0;
    Tweens.to(banner, { alpha: 1 }, { duration: 0.6 });
  }
}
