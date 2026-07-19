/** Framed panel with optional header — the container idiom for every screen. */

import { Container, Graphics, Text } from 'pixi.js';
import { Palette, Type } from '../theme';

export class Panel extends Container {
  readonly content = new Container();
  private bg = new Graphics();

  constructor(w: number, h: number, title?: string) {
    super();
    const headerH = title ? 34 : 0;
    this.bg
      .roundRect(0, 0, w, h, 14)
      .fill({ color: Palette.panel, alpha: 0.92 })
      .stroke({ color: Palette.border, width: 1.5 })
      .roundRect(1.5, 1.5, w - 3, Math.min(h * 0.35, 90), 12)
      .fill({ color: Palette.white, alpha: 0.025 });
    this.addChild(this.bg);
    if (title) {
      const label = new Text({ text: title.toUpperCase(), style: Type.tiny() });
      label.style.fill = Palette.gold;
      label.position.set(14, 12);
      const rule = new Graphics().moveTo(12, headerH).lineTo(w - 12, headerH).stroke({ color: Palette.border, width: 1 });
      this.addChild(label, rule);
    }
    this.content.position.set(0, headerH);
    this.addChild(this.content);
  }
}
