/** Full-art start menu with an interactive hotspot over the painted PLAY panel. */

import { Graphics, Text } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { randomSeed } from '../../core/Rng';
import { Tweens, Easing } from '../../core/Tween';
import { RunState } from '../../sim/run';
import { Button } from '../components/Button';
import { backgroundTexture } from '../portraits';
import { H, Palette, Type, W } from '../theme';
import { SlotScene } from './SlotScene';
import { FeatheredBackground } from '../fx/FeatheredBackground';
import { SettingsModal } from '../components/SettingsModal';

export class MenuScene extends Scene {
  private background?: FeatheredBackground;
  private playHotspot?: Graphics;

  constructor(game: Game) {
    super(game);
  }

  onEnter(): void {
    const texture = backgroundTexture('start-menu');
    if (texture) {
      this.background = new FeatheredBackground(
        texture,
        1,
        0,
        1.01,
        this.game.visibleDesignWidth,
        this.game.visibleDesignHeight,
        1,
      );
      this.addChild(this.background);
    }

    // The button is part of the painting. This transparent control precisely
    // overlays it, adding hover/touch feedback without covering the artwork.
    const play = new Graphics()
      .roundRect(-120, -38, 240, 76, 12)
      .fill({ color: Palette.gold, alpha: 0.02 })
      .stroke({ color: Palette.white, width: 3, alpha: 0.85 });
    this.playHotspot = play;
    this.alignPlayHotspot();
    play.alpha = 0.02;
    play.eventMode = 'static';
    play.cursor = 'pointer';
    play.on('pointerover', () => {
      this.game.sfx.hover();
      Tweens.to(play, { alpha: 0.7 }, { duration: 0.16, ease: Easing.quadOut });
    });
    play.on('pointerout', () => {
      Tweens.to(play, { alpha: 0.02 }, { duration: 0.18, ease: Easing.quadOut });
    });
    play.on('pointerdown', () => Tweens.to(play, { alpha: 0.9 }, { duration: 0.06 }));
    play.on('pointerup', () => {
      this.game.sfx.click();
      this.startRun();
    });
    this.addChild(play);

    if (this.game.meta.bestFloor > 0) {
      const best = new Text({ text: `BEST CLIMB — FLOOR ${this.game.meta.bestFloor}`, style: Type.h3() });
      best.style.fill = Palette.gold;
      best.position.set(22, H - 32);
      this.addChild(best);
    }

    const muteBtn = new Button(this.game.meta.audioMuted ? '🔇' : '🔊', this.game.sfx, {
      width: 52,
      height: 44,
      variant: 'ghost',
      onClick: () => {
        this.game.meta.audioMuted = !this.game.meta.audioMuted;
        this.game.sfx.setMuted(this.game.meta.audioMuted);
        this.game.saveMeta();
        muteBtn.setLabel(this.game.meta.audioMuted ? '🔇' : '🔊');
      },
    });
    muteBtn.position.set(W - 42, 44);
    const settingsBtn = new Button('⚙  SETTINGS', this.game.sfx, {
      width: 150,
      height: 44,
      variant: 'ghost',
      onClick: () => this.openSettings(),
    });
    settingsBtn.position.set(W - 155, 44);
    this.addChild(settingsBtn, muteBtn);
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
    this.alignPlayHotspot();
  }

  /** Follow the painted button inside the cover-scaled background artwork. */
  private alignPlayHotspot(): void {
    if (!this.playHotspot) return;
    if (!this.background) {
      this.playHotspot.position.set(W / 2, 655);
      this.playHotspot.scale.set(1);
      return;
    }
    const art = this.background.art;
    this.playHotspot.position.set(art.x, art.y + 316 * art.scale.y);
    this.playHotspot.scale.set(art.scale.x, art.scale.y);
  }

  private startRun(): void {
    this.game.run = new RunState(randomSeed(), this.game.meta.difficulty);
    this.game.meta.totalRuns++;
    this.game.saveMeta();
    this.game.goto(new SlotScene(this.game));
  }
}
