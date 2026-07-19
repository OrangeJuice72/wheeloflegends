/**
 * App bootstrap: Pixi application, design-space scaling, scene transitions,
 * screen shake, toasts, and the shared ticker driving tweens + scenes.
 */

import { Application, Container, Graphics, Text } from 'pixi.js';
import { Tweens, Easing } from '../core/Tween';
import { loadMeta, saveMeta, type MetaSave } from '../core/Save';
import { Sfx } from '../audio/Sfx';
import type { RunState } from '../sim/run';
import { AmbientBackground } from '../ui/fx/AmbientBackground';
import { preloadPortraits } from '../ui/portraits';
import { H, Palette, Type, W } from '../ui/theme';
import type { Scene } from './Scene';
import { fitDesignSpace } from './layout';

export class Game {
  readonly app = new Application();
  readonly sfx = new Sfx();
  meta: MetaSave = loadMeta();
  run: RunState | null = null;

  readonly bg = new AmbientBackground();
  /** Scaled/centered 1280×720 design space. */
  readonly frame = new Container();
  /** Screen-shake wrapper inside the frame; scenes mount here. */
  readonly shaker = new Container();
  private readonly overlay = new Graphics();

  private scene: Scene | null = null;
  private shakeTime = 0;
  private shakeDuration = 0;
  private shakeMag = 0;
  private transitioning = false;
  private readonly toastAnimations = new Map<Container, Array<ReturnType<typeof Tweens.to>>>();
  private viewportDesignWidth = W;
  private viewportDesignHeight = H;

  get visibleDesignWidth(): number {
    return this.viewportDesignWidth;
  }

  get visibleDesignHeight(): number {
    return this.viewportDesignHeight;
  }

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      background: Palette.bg,
      resizeTo: host,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.canvas);
    this.sfx.setMuted(this.meta.audioMuted);
    await preloadPortraits();

    this.app.stage.addChild(this.bg);
    this.frame.addChild(this.shaker);
    this.app.stage.addChild(this.frame);
    this.overlay.rect(0, 0, W, H).fill(Palette.black);
    this.overlay.alpha = 0;
    this.overlay.eventMode = 'none';
    this.frame.addChild(this.overlay);

    let lastW = 0;
    let lastH = 0;
    const layout = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      const fitted = fitDesignSpace(w, h);
      this.frame.scale.set(fitted.scale);
      this.frame.position.set(fitted.x, fitted.y);
      this.viewportDesignWidth = w / Math.max(fitted.scale, 0.0001);
      this.viewportDesignHeight = h / Math.max(fitted.scale, 0.0001);
      this.overlay.clear()
        .rect((W - this.viewportDesignWidth) / 2, (H - this.viewportDesignHeight) / 2, this.viewportDesignWidth, this.viewportDesignHeight)
        .fill(Palette.black);
      this.bg.resize(w, h);
      this.scene?.onResize(this.viewportDesignWidth, this.viewportDesignHeight);
    };
    layout();

    this.app.ticker.add((ticker) => {
      layout(); // no-op unless the window changed size
      const dt = Math.min(ticker.deltaMS / 1000, 0.1);
      Tweens.update(dt);
      this.bg.update(dt);
      this.scene?.update(dt);
      this.updateShake(dt);
    });

    // Portrait mode is an orientation gate, not a squeezed live game. Pause the
    // simulation until the device returns to the intended landscape layout.
    const landscape = window.matchMedia('(orientation: landscape)');
    const syncOrientation = () => landscape.matches ? this.app.ticker.start() : this.app.ticker.stop();
    landscape.addEventListener('change', syncOrientation);
    syncOrientation();
  }

  /** Fade to black, swap scenes, fade back. */
  goto(next: Scene): void {
    if (this.transitioning) return;
    this.transitioning = true;
    Tweens.to(this.overlay, { alpha: 1 }, {
      duration: 0.22,
      ease: Easing.quadIn,
      onComplete: () => {
        if (this.scene) {
          this.clearToasts();
          this.scene.onExit();
          this.shaker.removeChild(this.scene);
          this.scene.destroy({ children: true });
          // Kill anything still animating objects from the dead scene.
          Tweens.clear();
        }
        this.scene = next;
        this.shaker.addChild(next);
        next.onEnter();
        next.onResize(this.viewportDesignWidth, this.viewportDesignHeight);
        Tweens.to(this.overlay, { alpha: 0 }, {
          duration: 0.28,
          ease: Easing.quadOut,
          onComplete: () => {
            this.transitioning = false;
          },
        });
      },
    });
  }

  shake(magnitude: number, duration: number): void {
    // A stronger incoming shake overrides; a weaker one won't cut a big one short.
    if (magnitude >= this.shakeMag || this.shakeTime >= this.shakeDuration) {
      this.shakeMag = magnitude;
      this.shakeTime = 0;
      this.shakeDuration = duration;
    }
  }

  private updateShake(dt: number): void {
    if (this.shakeTime < this.shakeDuration) {
      this.shakeTime += dt;
      const falloff = 1 - this.shakeTime / this.shakeDuration;
      const mag = this.shakeMag * falloff * falloff;
      this.shaker.position.set((Math.random() - 0.5) * 2 * mag, (Math.random() - 0.5) * 2 * mag);
    } else {
      this.shaker.position.set(0, 0);
      this.shakeMag = 0;
    }
  }

  /** Small transient message near the bottom of the screen. */
  toast(message: string, color: number = Palette.gold): void {
    this.clearToasts();
    const label = new Text({ text: message, style: Type.h3() });
    label.style.fill = color;
    label.anchor.set(0.5);
    const pad = 14;
    const box = new Graphics()
      .roundRect(-label.width / 2 - pad, -label.height / 2 - 8, label.width + pad * 2, label.height + 16, 10)
      .fill({ color: Palette.panel, alpha: 0.95 })
      .stroke({ color, width: 1.5, alpha: 0.7 });
    const wrap = new Container();
    wrap.addChild(box, label);
    wrap.position.set(W / 2, H - 90);
    wrap.alpha = 0;
    wrap.eventMode = 'none';
    this.frame.addChild(wrap);
    const enter = Tweens.to(wrap, { alpha: 1, y: H - 104 }, { duration: 0.2, ease: Easing.backOut });
    const exit = Tweens.to(wrap, { alpha: 0 }, {
      duration: 0.3,
      delay: 1.6,
      onComplete: () => this.removeToast(wrap),
    });
    this.toastAnimations.set(wrap, [enter, exit]);
  }

  private removeToast(wrap: Container): void {
    const animations = this.toastAnimations.get(wrap);
    if (!animations) return;
    this.toastAnimations.delete(wrap);
    for (const animation of animations) Tweens.cancel(animation);
    if (wrap.parent) wrap.parent.removeChild(wrap);
    wrap.destroy({ children: true });
  }

  private clearToasts(): void {
    for (const toast of [...this.toastAnimations.keys()]) this.removeToast(toast);
  }

  saveMeta(): void {
    saveMeta(this.meta);
  }
}
