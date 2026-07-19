/** Living background: gradient depths, drifting embers, slow-breathing glows. */

import { Container, Graphics, Sprite } from 'pixi.js';
import { Palette } from '../theme';
import { glowTexture } from './textures';

interface Ember {
  sprite: Sprite;
  vx: number;
  vy: number;
  pulse: number;
  pulseSpeed: number;
  baseAlpha: number;
}

export class AmbientBackground extends Container {
  private fill = new Graphics();
  private glows: Sprite[] = [];
  private embers: Ember[] = [];
  private w = 1280;
  private h = 720;
  private time = 0;

  constructor() {
    super();
    this.addChild(this.fill);
    const tex = glowTexture();

    for (const [tint, scale] of [
      [Palette.bgGlowA, 4.5],
      [Palette.bgGlowB, 3.6],
      [Palette.bgGlowA, 2.8],
    ] as const) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.tint = tint;
      s.alpha = 0.5;
      s.scale.set(scale);
      this.glows.push(s);
      this.addChild(s);
    }

    // Cosmetic randomness — Math.random is allowed here by design rule #2.
    for (let i = 0; i < 36; i++) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.tint = Math.random() < 0.6 ? Palette.gold : Palette.blue;
      s.blendMode = 'add';
      const size = 0.008 + Math.random() * 0.02;
      s.scale.set(size);
      const ember: Ember = {
        sprite: s,
        vx: (Math.random() - 0.5) * 6,
        vy: -4 - Math.random() * 10,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 1.2,
        baseAlpha: 0.25 + Math.random() * 0.4,
      };
      this.embers.push(ember);
      this.addChild(s);
    }
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.fill.clear();
    this.fill.rect(0, 0, w, h).fill(Palette.bg);
    // Vignette: darker corners via four corner glows in multiply-ish overlay.
    this.fill.rect(0, 0, w, h).fill({ color: Palette.black, alpha: 0.0 });
    const positions = [
      [w * 0.25, h * 0.3],
      [w * 0.75, h * 0.65],
      [w * 0.55, h * 0.15],
    ];
    this.glows.forEach((g, i) => {
      const p = positions[i] ?? [w / 2, h / 2];
      g.position.set(p[0]!, p[1]!);
    });
    for (const e of this.embers) {
      e.sprite.position.set(Math.random() * w, Math.random() * h);
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.glows.forEach((g, i) => {
      g.alpha = 0.4 + 0.15 * Math.sin(this.time * 0.3 + i * 2.1);
    });
    for (const e of this.embers) {
      e.pulse += e.pulseSpeed * dt;
      e.sprite.alpha = e.baseAlpha * (0.6 + 0.4 * Math.sin(e.pulse));
      e.sprite.x += e.vx * dt;
      e.sprite.y += e.vy * dt;
      if (e.sprite.y < -20) {
        e.sprite.y = this.h + 20;
        e.sprite.x = Math.random() * this.w;
      }
      if (e.sprite.x < -20) e.sprite.x = this.w + 20;
      if (e.sprite.x > this.w + 20) e.sprite.x = -20;
    }
  }
}
