/** Full-art start menu assembled from the user's background, logo, and button art. */

import { BlurFilter, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { randomSeed } from '../../core/Rng';
import { Tweens, Easing } from '../../core/Tween';
import { RunState } from '../../sim/run';
import { backgroundTexture } from '../portraits';
import { Fonts, H, Palette, W } from '../theme';
import { SlotScene } from './SlotScene';
import { ConquestMapScene } from './ConquestMapScene';
import { FeatheredBackground } from '../fx/FeatheredBackground';
import { SettingsModal } from '../components/SettingsModal';
import { RecordsModal } from '../components/RecordsModal';
import { RunSetupModal, type RunConfig } from '../components/RunSetupModal';

const ART_OVERSCAN = 1.01;
const ART_WIDTH = 1368;
const ART_HEIGHT = 768;
const REFERENCE_ART_SCALE = Math.max(W / ART_WIDTH, H / ART_HEIGHT) * ART_OVERSCAN;
const LOGO_WIDTH = 430;
const LOGO_Y = -15;
const BUTTON_WIDTH = 250;
const BUTTON_HEIGHT = 62;
const BUTTON_Y = [154, 224, 294];

class MenuActionButton extends Container {
  private readonly glow: Graphics;
  private hovered = false;

  constructor(texture: Texture, label: string, game: Game, onClick: () => void) {
    super();

    this.glow = new Graphics()
      .roundRect(-BUTTON_WIDTH / 2 - 5, -BUTTON_HEIGHT / 2 - 5, BUTTON_WIDTH + 10, BUTTON_HEIGHT + 10, 18)
      .stroke({ color: 0x79dcff, width: 7, alpha: 0.85 })
      .roundRect(-BUTTON_WIDTH / 2 - 9, -BUTTON_HEIGHT / 2 - 9, BUTTON_WIDTH + 18, BUTTON_HEIGHT + 18, 22)
      .stroke({ color: 0xa678ff, width: 5, alpha: 0.62 });
    this.glow.filters = [new BlurFilter({ strength: 9, quality: 3 })];
    this.glow.alpha = 0.28;

    const plate = new Sprite(texture);
    plate.anchor.set(0.5);
    plate.width = BUTTON_WIDTH;
    plate.height = BUTTON_HEIGHT;

    const title = new Text({
      text: label,
      style: {
        fontFamily: Fonts.SANS,
        fontSize: 19,
        fontWeight: 'bold',
        fill: 0xf5f7ff,
        letterSpacing: 2.8,
        stroke: { color: 0x050812, width: 3 },
        dropShadow: { color: 0x69d8ff, blur: 8, distance: 0, alpha: 0.72, angle: 0 },
      },
    });
    title.anchor.set(0.5);

    const hitTarget = new Graphics()
      .roundRect(-BUTTON_WIDTH / 2, -BUTTON_HEIGHT / 2, BUTTON_WIDTH, BUTTON_HEIGHT, 16)
      .fill({ color: Palette.white, alpha: 0.001 });

    this.addChild(this.glow, plate, title, hitTarget);
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerover', () => {
      this.hovered = true;
      game.sfx.hover();
      Tweens.to(this.scale, { x: 1.055, y: 1.055 }, { duration: 0.14, ease: Easing.backOut });
      Tweens.to(this.glow, { alpha: 0.9 }, { duration: 0.13, ease: Easing.quadOut });
    });
    this.on('pointerout', () => {
      this.hovered = false;
      Tweens.to(this.scale, { x: 1, y: 1 }, { duration: 0.16, ease: Easing.quadOut });
      Tweens.to(this.glow, { alpha: 0.28 }, { duration: 0.2, ease: Easing.quadOut });
    });
    this.on('pointerdown', () => {
      Tweens.to(this.scale, { x: 0.97, y: 0.97 }, { duration: 0.06, ease: Easing.quadOut });
      Tweens.to(this.glow, { alpha: 1 }, { duration: 0.06 });
    });
    this.on('pointerupoutside', () => {
      Tweens.to(this.scale, { x: 1, y: 1 }, { duration: 0.12, ease: Easing.quadOut });
      Tweens.to(this.glow, { alpha: this.hovered ? 0.9 : 0.28 }, { duration: 0.12 });
    });
    this.on('pointerup', () => {
      Tweens.to(this.scale, { x: this.hovered ? 1.055 : 1, y: this.hovered ? 1.055 : 1 }, { duration: 0.13, ease: Easing.backOut });
      game.sfx.click();
      onClick();
    });
  }

  updateGlow(time: number): void {
    if (!this.hovered) this.glow.alpha = 0.25 + Math.sin(time) * 0.06;
  }
}

export class MenuScene extends Scene {
  private background?: FeatheredBackground;
  private readonly menuLayer = new Container();
  private logoGlow?: Sprite;
  private buttons: MenuActionButton[] = [];
  private lastConfig: RunConfig = { mode: 'tower', draft: false, modifiers: [] };
  private glowTime = 0;

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
    this.addChild(this.menuLayer);

    const logoTexture = backgroundTexture('world-zero-logo');
    if (logoTexture) {
      this.logoGlow = new Sprite(logoTexture);
      this.logoGlow.anchor.set(0.5);
      this.logoGlow.tint = 0x78dfff;
      this.logoGlow.alpha = 0.25;
      this.logoGlow.filters = [new BlurFilter({ strength: 14, quality: 3 })];
      this.logoGlow.width = LOGO_WIDTH + 18;
      this.logoGlow.height = (LOGO_WIDTH / logoTexture.width) * logoTexture.height + 8;

      const logo = new Sprite(logoTexture);
      logo.anchor.set(0.5);
      logo.width = LOGO_WIDTH;
      logo.height = (LOGO_WIDTH / logoTexture.width) * logoTexture.height;
      logo.position.set(0, LOGO_Y);
      this.logoGlow.position.copyFrom(logo.position);
      this.menuLayer.addChild(this.logoGlow, logo);
    }

    const buttonTexture = backgroundTexture('start-menu-buttons');
    if (buttonTexture) {
      const entries = [
        ['NEW RUN', () => this.openSetup()],
        ['RECORD HALL', () => this.openRecords()],
        ['SETTINGS', () => this.openSettings()],
      ] as const;
      this.buttons = entries.map(([label, action]) => {
        const button = new MenuActionButton(buttonTexture, label, this.game, action);
        this.menuLayer.addChild(button);
        return button;
      });
    }
    this.alignArtwork();
  }

  override update(dt: number): void {
    this.glowTime += dt * 2.4;
    if (this.logoGlow) this.logoGlow.alpha = 0.22 + Math.sin(this.glowTime * 0.55) * 0.05;
    this.buttons.forEach((button, index) => button.updateGlow(this.glowTime + index * 0.75));
  }

  override onResize(viewportW: number, viewportH: number): void {
    this.background?.resize(viewportW, viewportH);
    this.alignArtwork();
  }

  private alignArtwork(): void {
    const art = this.background?.art;
    if (!art) {
      this.menuLayer.position.set(W / 2, H / 2);
      this.menuLayer.scale.set(1);
    } else {
      this.menuLayer.position.copyFrom(art.position);
      this.menuLayer.scale.set(art.scale.x / REFERENCE_ART_SCALE, art.scale.y / REFERENCE_ART_SCALE);
    }
    this.buttons.forEach((button, index) => {
      button.scale.set(1);
      button.position.set(0, BUTTON_Y[index] ?? BUTTON_Y[0]!);
    });
  }

  private openSetup(): void {
    const modal = new RunSetupModal(
      this.game.sfx,
      this.lastConfig,
      (config) => {
        this.lastConfig = config;
        this.removeChild(modal);
        modal.destroy({ children: true });
        this.startRun(config);
      },
      () => {
        this.removeChild(modal);
        modal.destroy({ children: true });
      },
    );
    this.addChild(modal);
  }

  private openRecords(): void {
    const modal = new RecordsModal(this.game, () => {
      this.removeChild(modal);
      modal.destroy({ children: true });
    });
    this.addChild(modal);
  }

  private openSettings(): void {
    const modal = new SettingsModal(this.game, () => {
      this.removeChild(modal);
      modal.destroy({ children: true });
    });
    this.addChild(modal);
  }

  private startRun(config: RunConfig = { mode: 'tower', draft: false, modifiers: [] }): void {
    this.game.run = new RunState(randomSeed(), this.game.meta.difficulty, config.modifiers, {
      mode: config.mode,
      draft: config.draft,
      monoFranchise: config.monoFranchise,
    });
    this.game.meta.totalRuns++;
    this.game.saveMeta();
    this.game.goto(config.mode === 'conquest' ? new ConquestMapScene(this.game) : new SlotScene(this.game));
  }
}
