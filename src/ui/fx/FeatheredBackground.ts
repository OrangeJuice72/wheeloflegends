import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { H, Palette, W } from '../theme';

/** One proportional cover image sized to the actual visible design viewport. */
export class FeatheredBackground extends Container {
  readonly art: Sprite;
  baseScale = 1;
  private readonly backing = new Graphics();
  private readonly texture: Texture;
  private readonly overscan: number;
  private readonly alignY: number;

  constructor(
    texture: Texture,
    alpha = 1,
    _featherAlpha = 0,
    overscan = 1.04,
    viewportW = W,
    viewportH = H,
    alignY = 0.5,
  ) {
    super();
    this.eventMode = 'none';
    this.texture = texture;
    this.overscan = overscan;
    this.alignY = alignY;
    this.addChild(this.backing);
    this.art = new Sprite(texture);
    this.art.anchor.set(0.5);
    this.art.alpha = alpha;
    this.addChild(this.art);
    this.resize(viewportW, viewportH);
  }

  resize(viewportW: number, viewportH: number): void {
    const visibleLeft = (W - viewportW) / 2;
    const visibleTop = (H - viewportH) / 2;
    this.backing.clear().rect(visibleLeft, visibleTop, viewportW, viewportH).fill(Palette.bg);
    this.baseScale = Math.max(viewportW / this.texture.width, viewportH / this.texture.height) * this.overscan;
    this.art.scale.set(this.baseScale);
    const displayedHeight = this.texture.height * this.baseScale;
    this.art.position.set(
      W / 2,
      visibleTop + displayedHeight / 2 + (viewportH - displayedHeight) * this.alignY,
    );
  }
}