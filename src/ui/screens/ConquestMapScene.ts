/**
 * Universe Conquest map: the ladder of universes to subdue. Shown at the start
 * of a conquest run and between nodes, then leads into the recruiting hub.
 */

import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { Tweens, Easing } from '../../core/Tween';
import { getFranchise } from '../../data/franchises';
import { Button } from '../components/Button';
import { SettingsModal } from '../components/SettingsModal';
import { FxLayer } from '../fx/effects';
import { FeatheredBackground } from '../fx/FeatheredBackground';
import { backgroundTexture, franchiseTexture } from '../portraits';
import { H, mix, Palette, Type, W } from '../theme';
import { SlotScene } from './SlotScene';
import { SummaryScene } from './SummaryScene';

const COLS = 6;
const CELL_W = 176;
const CELL_H = 168;

export class ConquestMapScene extends Scene {
  private fx = new FxLayer();
  private background?: FeatheredBackground;

  constructor(game: Game) {
    super(game);
  }

  private get run() {
    const run = this.game.run;
    if (!run || !run.isConquest()) throw new Error('ConquestMapScene requires a conquest run');
    return run;
  }

  onEnter(): void {
    const run = this.run;
    // The ladder is finished — send the player to the victory summary.
    if (run.conquestComplete()) {
      this.game.goto(new SummaryScene(this.game));
      return;
    }

    const texture = backgroundTexture('recruitment-backdrop-v4') ?? backgroundTexture('recruitment-backdrop-v3');
    if (texture) {
      this.background = new FeatheredBackground(texture, 1, 0, 1.02, this.game.visibleDesignWidth, this.game.visibleDesignHeight);
      this.addChild(this.background);
    }
    this.addChild(new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.5 }));

    const title = new Text({ text: 'UNIVERSE CONQUEST', style: Type.logo() });
    title.style.fontSize = 52;
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 34);
    this.addChild(title);

    const conquered = run.floor - 1;
    const total = run.conquestOrder.length;
    const target = run.conquestTarget();
    const sub = new Text({
      text: target
        ? `${conquered} / ${total} UNIVERSES CONQUERED      NEXT: ${getFranchise(target).name}`
        : `${conquered} / ${total} UNIVERSES CONQUERED`,
      style: Type.h3(),
    });
    sub.style.fill = Palette.gold;
    sub.anchor.set(0.5, 0);
    sub.position.set(W / 2, 104);
    this.addChild(sub);

    const rows = Math.ceil(total / COLS);
    const gridW = Math.min(COLS, total) * CELL_W;
    const startX = (W - gridW) / 2 + CELL_W / 2;
    const startY = 168 + (rows === 1 ? CELL_H / 2 : 0);
    run.conquestOrder.forEach((universe, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const x = startX + col * CELL_W;
      const y = startY + row * CELL_H;
      const state = index < conquered ? 'done' : index === conquered ? 'current' : 'locked';
      this.addChild(this.buildNode(universe, index + 1, state, x, y));
    });

    const enter = new Button('⚔  ENTER THE ALTAR', this.game.sfx, {
      width: 340,
      height: 56,
      variant: 'primary',
      onClick: () => this.game.goto(new SlotScene(this.game)),
    });
    enter.position.set(W / 2 - 130, H - 46);
    const settings = new Button('⚙  SETTINGS', this.game.sfx, {
      width: 180,
      height: 52,
      variant: 'secondary',
      onClick: () => this.openSettings(),
    });
    settings.position.set(W / 2 + 170, H - 46);
    this.addChild(enter, settings);

    this.addChild(this.fx);
    if (target) this.fx.burst(W / 2, 120, { color: getFranchise(target).color, count: 20, speed: 260, size: 0.4 });
  }

  private buildNode(universe: string, nodeNumber: number, state: 'done' | 'current' | 'locked', x: number, y: number): Container {
    const wrap = new Container();
    wrap.position.set(x, y);
    const fr = getFranchise(universe);
    const accent = state === 'done' ? Palette.success : state === 'current' ? Palette.gold : Palette.borderLight;
    const dim = state === 'locked';

    const panelW = 150;
    const panelH = 112;
    const panel = new Graphics()
      .roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 12)
      .fill({ color: mix(fr.color, Palette.black, dim ? 0.86 : 0.62), alpha: dim ? 0.6 : 0.95 })
      .stroke({ color: accent, width: state === 'current' ? 3 : 2 });
    wrap.addChild(panel);

    const logo = franchiseTexture(universe);
    if (logo) {
      const sprite = new Sprite(logo);
      const scale = Math.min((panelW - 26) / logo.width, (panelH - 34) / logo.height);
      sprite.anchor.set(0.5);
      sprite.scale.set(scale);
      sprite.position.set(0, -8);
      sprite.alpha = dim ? 0.4 : 1;
      const mask = new Graphics().roundRect(-panelW / 2 + 8, -panelH / 2 + 8, panelW - 16, panelH - 30, 8).fill(Palette.white);
      sprite.mask = mask;
      wrap.addChild(sprite, mask);
    } else {
      const name = new Text({ text: fr.name, style: Type.h3() });
      name.style.fill = dim ? Palette.textFaint : fr.color;
      name.anchor.set(0.5);
      name.position.set(0, -8);
      if (name.width > panelW - 18) name.scale.set((panelW - 18) / name.width);
      wrap.addChild(name);
    }

    const badgeText = state === 'done' ? '✓ CONQUERED' : state === 'current' ? '▶ NEXT' : `SEALED`;
    const badge = new Text({ text: badgeText, style: Type.tiny() });
    badge.style.fill = accent;
    badge.anchor.set(0.5);
    badge.position.set(0, panelH / 2 - 12);
    wrap.addChild(badge);

    const num = new Text({ text: `${nodeNumber}`, style: Type.tiny() });
    num.style.fill = Palette.textDim;
    num.anchor.set(0.5);
    num.position.set(-panelW / 2 + 12, -panelH / 2 + 12);
    wrap.addChild(num);

    if (state === 'current') {
      Tweens.to(panel, { alpha: 0.72 }, { duration: 0.8, ease: Easing.sineInOut });
      Tweens.to(panel, { alpha: 0.95 }, { duration: 0.8, delay: 0.8, ease: Easing.sineInOut });
    }
    return wrap;
  }

  private openSettings(): void {
    const modal = new SettingsModal(this.game, () => {
      this.removeChild(modal);
      modal.destroy({ children: true });
    });
    this.addChild(modal);
  }

  override onResize(viewportW: number, viewportH: number): void {
    this.background?.resize(viewportW, viewportH);
  }

  override update(dt: number): void {
    this.fx.update(dt);
  }
}
