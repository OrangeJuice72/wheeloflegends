/**
 * Painted battle arena blended into the UI with vignette, light, fog and embers.
 */

import { Container, Graphics, Sprite } from 'pixi.js';
import { battlefieldTexture } from '../portraits';
import type { BattlefieldDef } from '../../data/battlefields';
import { H, Palette, W } from '../theme';
import { glowTexture } from './textures';

export class BattleBackdrop extends Container {
  private readonly backing = new Graphics();
  private art: Sprite | null = null;
  private artBaseScale = 1;
  private fog: Sprite[] = [];
  private rays: Sprite[] = [];
  private embers: { sprite: Sprite; drift: number; phase: number }[] = [];
  private time = 0;

  constructor(field: BattlefieldDef, bossFloor: boolean, viewportW = W, viewportH = H) {
    super();
    this.eventMode = 'none';
    const emberTint = bossFloor ? 0xff5a3a : Palette.gold;
    this.addChild(this.backing);

    const texture = battlefieldTexture(field.texture);
    if (texture) {
      this.artBaseScale = Math.max(viewportW / texture.width, viewportH / texture.height) * 1.075;
      const art = new Sprite(texture);
      art.anchor.set(0.5);
      art.scale.set(this.artBaseScale);
      art.position.set(W / 2, H / 2);
      art.alpha = bossFloor ? 0.9 : 0.86;
      this.art = art;
      this.addChild(art);
    }

    const centralGlow = new Sprite(glowTexture());
    centralGlow.anchor.set(0.5);
    centralGlow.tint = emberTint;
    centralGlow.position.set(W / 2, H * 0.68);
    centralGlow.width = 760;
    centralGlow.height = 390;
    centralGlow.alpha = bossFloor ? 0.18 : 0.12;
    centralGlow.blendMode = 'add';
    this.addChild(centralGlow);

    for (const [x, rot] of [
      [W / 2 - 200, -0.32],
      [W / 2, 0],
      [W / 2 + 200, 0.32],
    ] as const) {
      const ray = new Sprite(glowTexture());
      ray.anchor.set(0.5, 0.1);
      ray.tint = Palette.white;
      ray.position.set(x, -40);
      ray.width = 130;
      ray.height = 640;
      ray.rotation = rot;
      ray.alpha = 0.035;
      ray.blendMode = 'add';
      this.rays.push(ray);
      this.addChild(ray);
    }

    const pool = new Sprite(glowTexture());
    pool.anchor.set(0.5);
    pool.tint = emberTint;
    pool.position.set(W / 2, H - 60);
    pool.width = 760;
    pool.height = 220;
    pool.alpha = 0.11;
    this.addChild(pool);

    for (const [y, scale, alpha] of [
      [520, 1.2, 0.07],
      [620, 1.6, 0.09],
    ] as const) {
      const bank = new Sprite(glowTexture());
      bank.anchor.set(0.5);
      bank.tint = 0x8a92c8;
      bank.position.set(W / 2, y);
      bank.width = 900 * scale;
      bank.height = 150;
      bank.alpha = alpha;
      this.fog.push(bank);
      this.addChild(bank);
    }

    for (let i = 0; i < 18; i++) {
      const ember = new Sprite(glowTexture());
      ember.anchor.set(0.5);
      ember.tint = i % 4 === 0 ? Palette.blue : emberTint;
      ember.blendMode = 'add';
      ember.scale.set(0.018 + Math.random() * 0.018);
      ember.position.set(70 + Math.random() * (W - 140), 180 + Math.random() * (H - 220));
      ember.alpha = 0.08 + Math.random() * 0.16;
      this.embers.push({ sprite: ember, drift: 6 + Math.random() * 10, phase: Math.random() * Math.PI * 2 });
      this.addChild(ember);
    }

    this.resize(viewportW, viewportH);
  }

  resize(viewportW: number, viewportH: number): void {
    this.backing.clear()
      .rect((W - viewportW) / 2, (H - viewportH) / 2, viewportW, viewportH)
      .fill(Palette.black);
    if (this.art) {
      this.artBaseScale = Math.max(viewportW / this.art.texture.width, viewportH / this.art.texture.height) * 1.075;
      this.art.scale.set(this.artBaseScale);
      this.art.position.set(W / 2, H / 2);
    }
  }

  update(dt: number): void {
    this.time += dt;
    if (this.art) {
      const breathe = 1 + Math.sin(this.time * 0.18) * 0.0025;
      this.art.scale.set(this.artBaseScale * breathe);
      this.art.position.set(W / 2 + Math.sin(this.time * 0.11) * 5, H / 2 + Math.cos(this.time * 0.09) * 3);
    }
    this.fog.forEach((bank, i) => {
      bank.x = W / 2 + Math.sin(this.time * 0.08 + i * 2.4) * 90;
    });
    this.rays.forEach((ray, i) => {
      ray.alpha = 0.025 + 0.018 * Math.sin(this.time * 0.4 + i * 1.7);
    });
    this.embers.forEach((ember, i) => {
      ember.sprite.y -= ember.drift * dt;
      ember.sprite.x += Math.sin(this.time * 0.55 + ember.phase) * dt * 4;
      ember.sprite.alpha = 0.1 + 0.08 * Math.sin(this.time * 1.4 + ember.phase);
      if (ember.sprite.y < 120) {
        ember.sprite.y = H - 30;
        ember.sprite.x = 70 + ((i * 73 + this.time * 11) % (W - 140));
      }
    });
  }
}
