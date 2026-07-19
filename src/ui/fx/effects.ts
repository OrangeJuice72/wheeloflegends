/**
 * Battle & ceremony FX: particle bursts, floating damage numbers, beams,
 * full-screen flashes. One FxLayer per scene, updated from the scene ticker.
 */

import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Tweens, Easing } from '../../core/Tween';
import type { AbilityFx } from '../../data/types';
import { H, Palette, Type, W } from '../theme';
import { dotTexture, glowTexture } from './textures';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  gravity: number;
  spin: number;
}

export class FxLayer extends Container {
  private particles: Particle[] = [];
  private pool: Sprite[] = [];

  constructor() {
    super();
    this.eventMode = 'none';
  }

  burst(
    x: number,
    y: number,
    opts: { color?: number; count?: number; speed?: number; life?: number; size?: number; gravity?: number } = {},
  ): void {
    const count = opts.count ?? 16;
    for (let i = 0; i < count; i++) {
      const sprite = this.pool.pop() ?? new Sprite(dotTexture());
      sprite.texture = dotTexture();
      sprite.anchor.set(0.5);
      sprite.blendMode = 'add';
      sprite.tint = opts.color ?? Palette.gold;
      sprite.position.set(x, y);
      sprite.visible = true;
      const angle = Math.random() * Math.PI * 2;
      const speed = (opts.speed ?? 260) * (0.35 + Math.random() * 0.65);
      const size = (opts.size ?? 0.45) * (0.5 + Math.random() * 0.8);
      sprite.scale.set(size);
      sprite.alpha = 1;
      this.addChild(sprite);
      this.particles.push({
        sprite,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: (opts.life ?? 0.6) * (0.6 + Math.random() * 0.6),
        gravity: opts.gravity ?? 420,
        spin: (Math.random() - 0.5) * 6,
      });
    }
  }

  floatText(x: number, y: number, text: string, opts: { color?: number; big?: boolean; sub?: string } = {}): void {
    const wrap = new Container();
    const label = new Text({ text, style: Type.damage(opts.color ?? Palette.white, opts.big ?? false) });
    label.anchor.set(0.5);
    wrap.addChild(label);
    if (opts.sub) {
      const sub = new Text({ text: opts.sub, style: Type.damage(opts.color ?? Palette.white, false) });
      sub.style.fontSize = 14;
      sub.anchor.set(0.5);
      sub.position.set(0, 22);
      wrap.addChild(sub);
    }
    wrap.position.set(x + (Math.random() - 0.5) * 30, y);
    wrap.scale.set(0.3);
    this.addChild(wrap);
    Tweens.to(wrap.scale, { x: 1, y: 1 }, { duration: 0.18, ease: Easing.backOut });
    Tweens.to(wrap, { y: y - 58, alpha: 0 }, {
      duration: 1.0,
      delay: 0.25,
      ease: Easing.quadIn,
      onComplete: () => {
        this.removeChild(wrap);
        wrap.destroy({ children: true });
      },
    });
  }

  /** Glowing energy beam between two points (ranged ults). */
  beam(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const wrap = new Container();
    wrap.position.set(x1, y1);
    wrap.rotation = Math.atan2(dy, dx);

    const outer = new Sprite(glowTexture());
    outer.anchor.set(0, 0.5);
    outer.width = dist;
    outer.height = 64;
    outer.tint = color;
    outer.blendMode = 'add';
    outer.alpha = 0.85;
    const core = new Graphics().roundRect(0, -5, dist, 10, 5).fill({ color: Palette.white, alpha: 0.95 });
    core.blendMode = 'add';
    const muzzle = new Sprite(glowTexture());
    muzzle.anchor.set(0.5);
    muzzle.tint = color;
    muzzle.blendMode = 'add';
    muzzle.scale.set(0.6);
    wrap.addChild(outer, core, muzzle);
    this.addChild(wrap);

    wrap.scale.set(1, 0.1);
    Tweens.to(wrap.scale, { y: 1 }, { duration: 0.08, ease: Easing.quadOut });
    Tweens.to(wrap, { alpha: 0 }, {
      duration: 0.3,
      delay: 0.22,
      onComplete: () => {
        this.removeChild(wrap);
        wrap.destroy({ children: true });
      },
    });
    this.burst(x2, y2, { color, count: 14, speed: 220, size: 0.4 });
  }

  impactRing(x: number, y: number, color: number, big = false): void {
    const ring = new Graphics()
      .circle(0, 0, big ? 24 : 15)
      .stroke({ color, width: big ? 5 : 3, alpha: 0.9 });
    ring.position.set(x, y);
    ring.scale.set(0.35);
    ring.blendMode = 'add';
    this.addChild(ring);
    Tweens.to(ring.scale, { x: big ? 2.8 : 2.2, y: big ? 2.8 : 2.2 }, { duration: 0.28, ease: Easing.quadOut });
    Tweens.to(ring, { alpha: 0 }, {
      duration: 0.3,
      ease: Easing.quadOut,
      onComplete: () => {
        this.removeChild(ring);
        ring.destroy();
      },
    });
  }

  slash(x: number, y: number, color: number, mirror = false): void {
    const mark = new Graphics()
      .moveTo(-34, -22)
      .quadraticCurveTo(0, 2, 34, 22)
      .stroke({ color: Palette.white, width: 5, alpha: 0.95, cap: 'round' })
      .moveTo(-30, -28)
      .quadraticCurveTo(0, -4, 30, 17)
      .stroke({ color, width: 12, alpha: 0.45, cap: 'round' });
    mark.position.set(x, y);
    mark.rotation = mirror ? -0.35 : 0.35;
    mark.scale.set(0.3);
    mark.blendMode = 'add';
    this.addChild(mark);
    Tweens.to(mark.scale, { x: 1.18, y: 1.18 }, { duration: 0.11, ease: Easing.backOut });
    Tweens.to(mark, { alpha: 0 }, {
      duration: 0.24,
      delay: 0.08,
      onComplete: () => {
        this.removeChild(mark);
        mark.destroy();
      },
    });
  }


  /** Ability-specific casting language driven by each ability's fx field. */
  cast(x: number, y: number, direction: number, fx: AbilityFx, color: number, ultimate = false): void {
    const power = ultimate ? 1.45 : 1;
    if (fx === 'strike' || fx === 'burst') {
      const streaks = new Graphics();
      for (let i = 0; i < (ultimate ? 7 : 4); i++) {
        const yy = (i - 3) * 8;
        streaks.moveTo(-direction * (45 + i * 7), yy).lineTo(direction * (10 + i * 3), yy - direction * 4)
          .stroke({ color: i % 2 ? color : Palette.white, width: ultimate ? 4 : 2, alpha: 0.72 });
      }
      streaks.position.set(x, y);
      streaks.blendMode = 'add';
      this.addChild(streaks);
      Tweens.to(streaks, { x: x + direction * 52, alpha: 0 }, {
        duration: 0.24,
        ease: Easing.quadOut,
        onComplete: () => { this.removeChild(streaks); streaks.destroy(); },
      });
      if (fx === 'burst') this.burst(x + direction * 20, y, { color, count: ultimate ? 20 : 10, speed: 230 * power, gravity: 0, size: 0.3 });
      return;
    }
    if (fx === 'nova') {
      this.impactRing(x, y, color, true);
      this.burst(x, y, { color, count: ultimate ? 34 : 20, speed: 300 * power, gravity: 0, size: 0.42 });
      return;
    }
    if (fx === 'wave') {
      const wave = new Graphics().ellipse(0, 0, 36, 15).stroke({ color, width: ultimate ? 7 : 4, alpha: 0.9 });
      wave.position.set(x, y);
      wave.scale.set(0.3);
      wave.blendMode = 'add';
      this.addChild(wave);
      Tweens.to(wave.scale, { x: 4.2 * power, y: 2.4 * power }, { duration: 0.38, ease: Easing.quadOut });
      Tweens.to(wave, { alpha: 0 }, {
        duration: 0.4,
        onComplete: () => { this.removeChild(wave); wave.destroy(); },
      });
      return;
    }
    this.focusPulse(x, y, color);
    if (fx === 'glow') {
      this.impactRing(x, y, color, ultimate);
      this.burst(x, y, { color, count: ultimate ? 24 : 12, speed: 140, gravity: -80, life: 0.8, size: 0.28 });
    } else {
      this.burst(x + direction * 18, y, { color, count: ultimate ? 18 : 8, speed: 150, gravity: 0, size: 0.26 });
    }
  }

  /** A traveling energy shot, visually distinct from sustained beams. */
  projectile(x1: number, y1: number, x2: number, y2: number, color: number, ultimate = false): void {
    const shot = new Container();
    const tail = new Sprite(glowTexture());
    tail.anchor.set(1, 0.5);
    tail.tint = color;
    tail.blendMode = 'add';
    tail.width = ultimate ? 90 : 58;
    tail.height = ultimate ? 42 : 28;
    const core = new Graphics().circle(0, 0, ultimate ? 9 : 6).fill(Palette.white).circle(0, 0, ultimate ? 18 : 12).stroke({ color, width: 4, alpha: 0.8 });
    core.blendMode = 'add';
    shot.addChild(tail, core);
    shot.position.set(x1, y1);
    shot.rotation = Math.atan2(y2 - y1, x2 - x1);
    this.addChild(shot);
    Tweens.to(shot, { x: x2, y: y2 }, {
      duration: ultimate ? 0.2 : 0.15,
      ease: Easing.quadIn,
      onComplete: () => {
        this.removeChild(shot);
        shot.destroy({ children: true });
        this.impactRing(x2, y2, color, ultimate);
        this.burst(x2, y2, { color, count: ultimate ? 22 : 12, speed: ultimate ? 300 : 210, gravity: 0, size: 0.35 });
      },
    });
  }

  focusPulse(x: number, y: number, color: number): void {
    const halo = new Sprite(glowTexture());
    halo.anchor.set(0.5);
    halo.tint = color;
    halo.blendMode = 'add';
    halo.position.set(x, y);
    halo.scale.set(0.35);
    halo.alpha = 0.8;
    this.addChild(halo);
    Tweens.to(halo.scale, { x: 1.8, y: 1.8 }, { duration: 0.42, ease: Easing.quadOut });
    Tweens.to(halo, { alpha: 0 }, {
      duration: 0.48,
      ease: Easing.quadOut,
      onComplete: () => {
        this.removeChild(halo);
        halo.destroy();
      },
    });
  }

  /** Full-screen tinted flash (ults, legendary reveals). Keep alpha subtle. */
  flash(color: number, alpha = 0.25): void {
    const rect = new Graphics().rect(-200, -200, W + 400, H + 400).fill(color);
    rect.alpha = alpha;
    rect.eventMode = 'none';
    this.addChild(rect);
    Tweens.to(rect, { alpha: 0 }, {
      duration: 0.4,
      ease: Easing.quadOut,
      onComplete: () => {
        this.removeChild(rect);
        rect.destroy();
      },
    });
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life += dt;
      const t = p.life / p.maxLife;
      if (t >= 1) {
        p.sprite.visible = false;
        this.removeChild(p.sprite);
        this.pool.push(p.sprite);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.rotation += p.spin * dt;
      p.sprite.alpha = 1 - t * t;
    }
  }
}
