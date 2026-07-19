import { Container, Graphics, Text } from 'pixi.js';
import type { Game } from '../../app/Game';
import type { BattleSpeed, Difficulty } from '../../core/Save';
import { Button } from './Button';
import { H, Palette, Type, W } from '../theme';

const PANEL_W = 600;
const PANEL_H = 570;

interface Choice<T> {
  label: string;
  value: T;
}

export class SettingsModal extends Container {
  private readonly sheet = new Container();

  constructor(private readonly game: Game, private readonly onClose: () => void) {
    super();
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.78 });
    dim.eventMode = 'static';
    dim.cursor = 'pointer';
    dim.on('pointerdown', () => this.close());
    this.sheet.position.set((W - PANEL_W) / 2, (H - PANEL_H) / 2);
    this.sheet.eventMode = 'static';
    this.addChild(dim, this.sheet);
    this.render();
  }

  private render(): void {
    this.sheet.removeChildren().forEach((child) => child.destroy({ children: true }));

    const bg = new Graphics()
      .roundRect(0, 0, PANEL_W, PANEL_H, 20)
      .fill({ color: Palette.panel, alpha: 0.99 })
      .stroke({ color: Palette.gold, width: 3 })
      .roundRect(5, 5, PANEL_W - 10, 72, 16)
      .fill({ color: Palette.panelLight, alpha: 0.9 });
    const title = new Text({ text: 'SETTINGS', style: Type.h1() });
    title.anchor.set(0.5, 0);
    title.position.set(PANEL_W / 2, 20);
    const subtitle = new Text({ text: 'Saved automatically for future battles', style: Type.small() });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(PANEL_W / 2, 55);
    this.sheet.addChild(bg, title, subtitle);

    this.addChoiceRow(
      'SOUND',
      'Music and combat effects',
      [{ label: 'ON', value: false }, { label: 'OFF', value: true }],
      this.game.meta.audioMuted,
      94,
      (muted) => {
        this.game.meta.audioMuted = muted;
        this.game.sfx.setMuted(muted);
      },
    );

    this.addChoiceRow<Difficulty>(
      'DIFFICULTY',
      'Enemy power/level; coin payout',
      [
        { label: 'EASY', value: 'easy' },
        { label: 'NORMAL', value: 'normal' },
        { label: 'HARD', value: 'hard' },
      ],
      this.game.meta.difficulty,
      194,
      (difficulty) => {
        this.game.meta.difficulty = difficulty;
        if (this.game.run) this.game.run.difficulty = difficulty;
      },
    );

    this.addChoiceRow(
      'DEFAULT BATTLE',
      'Manual commands or automatic combat',
      [{ label: 'MANUAL', value: false }, { label: 'AUTO', value: true }],
      this.game.meta.defaultAutoBattle,
      294,
      (auto) => {
        this.game.meta.defaultAutoBattle = auto;
      },
    );

    this.addChoiceRow<BattleSpeed>(
      'DEFAULT SPEED',
      'Starting speed for each battle',
      [{ label: '1x', value: 1 }, { label: '2x', value: 2 }, { label: '3x', value: 3 }],
      this.game.meta.defaultBattleSpeed,
      394,
      (speed) => {
        this.game.meta.defaultBattleSpeed = speed;
      },
    );

    const close = new Button('DONE', this.game.sfx, {
      width: 220,
      height: 52,
      onClick: () => this.close(),
    });
    close.position.set(PANEL_W / 2, 526);
    this.sheet.addChild(close);
  }

  private addChoiceRow<T>(
    label: string,
    description: string,
    choices: Choice<T>[],
    current: T,
    y: number,
    onChoose: (value: T) => void,
  ): void {
    const row = new Graphics().roundRect(22, y, PANEL_W - 44, 88, 12)
      .fill({ color: Palette.black, alpha: 0.34 })
      .stroke({ color: Palette.border, width: 1 });
    const heading = new Text({ text: label, style: Type.h3() });
    heading.position.set(38, y + 16);
    const detail = new Text({ text: description, style: Type.small() });
    detail.position.set(38, y + 42);
    this.sheet.addChild(row, heading, detail);

    const gap = 8;
    const choiceAreaW = 316;
    const buttonW = (choiceAreaW - gap * (choices.length - 1)) / choices.length;
    choices.forEach((choice, index) => {
      const selected = choice.value === current;
      const button = new Button(choice.label, this.game.sfx, {
        width: buttonW,
        height: 42,
        variant: selected ? 'primary' : 'secondary',
        onClick: () => {
          onChoose(choice.value);
          this.game.saveMeta();
          this.render();
        },
      });
      button.position.set(252 + buttonW / 2 + index * (buttonW + gap), y + 44);
      this.sheet.addChild(button);
    });
  }

  private close(): void {
    this.game.sfx.click();
    this.onClose();
  }
}