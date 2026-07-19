/** The one true button: gradient fill, hover lift, press squash, click SFX. */

import { Container, Graphics, Text } from 'pixi.js';
import { Tweens, Easing } from '../../core/Tween';
import type { Sfx } from '../../audio/Sfx';
import { mix, Palette, Type } from '../theme';

export interface ButtonOpts {
  width?: number;
  height?: number;
  variant?: 'primary' | 'secondary' | 'ghost' | 'transparent';
  onClick: () => void;
}

export class Button extends Container {
  private bg = new Graphics();
  private labelText: Text;
  private opts: Required<Omit<ButtonOpts, 'onClick'>> & { onClick: () => void };
  private enabled = true;
  private hovered = false;

  constructor(label: string, sfx: Sfx, opts: ButtonOpts) {
    super();
    this.opts = {
      width: opts.width ?? 220,
      height: opts.height ?? 52,
      variant: opts.variant ?? 'primary',
      onClick: opts.onClick,
    };
    this.labelText = new Text({
      text: label,
      style: this.opts.variant === 'primary' ? Type.button() : Type.buttonSecondary(),
    });
    this.labelText.anchor.set(0.5);
    this.addChild(this.bg, this.labelText);
    this.redraw();
    this.pivot.set(this.opts.width / 2, this.opts.height / 2);
    this.labelText.position.set(this.opts.width / 2, this.opts.height / 2);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerover', () => {
      if (!this.enabled) return;
      this.hovered = true;
      sfx.hover();
      Tweens.to(this.scale, { x: 1.04, y: 1.04 }, { duration: 0.12, ease: Easing.quadOut });
      this.redraw();
    });
    this.on('pointerout', () => {
      this.hovered = false;
      Tweens.to(this.scale, { x: 1, y: 1 }, { duration: 0.15, ease: Easing.quadOut });
      this.redraw();
    });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      Tweens.to(this.scale, { x: 0.96, y: 0.96 }, { duration: 0.06, ease: Easing.quadOut });
    });
    this.on('pointerup', () => {
      if (!this.enabled) return;
      Tweens.to(this.scale, { x: this.hovered ? 1.04 : 1, y: this.hovered ? 1.04 : 1 }, { duration: 0.12, ease: Easing.backOut });
      sfx.click();
      this.opts.onClick();
    });
    this.on('pointerupoutside', () => {
      Tweens.to(this.scale, { x: 1, y: 1 }, { duration: 0.12 });
    });
  }

  setLabel(text: string): void {
    this.labelText.text = text;
    this.labelText.scale.set(1);
    const available = this.opts.width - 18;
    if (this.labelText.width > available) this.labelText.scale.set(available / this.labelText.width);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.eventMode = on ? 'static' : 'none';
    this.cursor = on ? 'pointer' : 'default';
    this.alpha = on ? 1 : 0.45;
  }

  private redraw(): void {
    const { width: w, height: h, variant } = this.opts;
    const r = 12;
    this.bg.clear();
    if (variant === 'primary') {
      const base = this.hovered ? mix(Palette.gold, Palette.white, 0.12) : Palette.gold;
      this.bg
        .roundRect(0, 3, w, h, r)
        .fill({ color: Palette.goldDark, alpha: 0.9 }) // bottom edge = depth
        .roundRect(0, 0, w, h - 2, r)
        .fill(base)
        .roundRect(2, 2, w - 4, (h - 2) * 0.45, r - 3)
        .fill({ color: Palette.white, alpha: 0.22 }); // gloss
    } else if (variant === 'secondary') {
      const base = this.hovered ? Palette.panelLight : Palette.panel;
      this.bg
        .roundRect(0, 0, w, h, r)
        .fill(base)
        .stroke({ color: this.hovered ? Palette.gold : Palette.borderLight, width: 1.5 })
        .roundRect(2, 2, w - 4, h * 0.4, r - 3)
        .fill({ color: Palette.white, alpha: 0.05 });
    } else if (variant === 'ghost') {
      this.bg
        .roundRect(0, 0, w, h, r)
        .fill({ color: Palette.white, alpha: this.hovered ? 0.08 : 0.001 })
        .stroke({ color: this.hovered ? Palette.textDim : Palette.border, width: 1 });
    } else {
      this.bg
        .roundRect(0, 0, w, h, r)
        .fill({ color: Palette.white, alpha: this.hovered ? 0.055 : 0.001 });
    }
  }
}
