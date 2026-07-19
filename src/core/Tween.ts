/**
 * Minimal, allocation-light tween engine. One global manager updated by the app
 * ticker drives every animation in the game (buttons, cards, wheel, FX).
 */

export type Ease = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  quadIn: (t: number) => t * t,
  quadOut: (t: number) => t * (2 - t),
  quadInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  cubicOut: (t: number) => 1 + --t * t * t,
  cubicInOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 + (t - 1) * (2 * t - 2) * (2 * t - 2)),
  quartOut: (t: number) => 1 - --t * t * t * t,
  expoOut: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  sineInOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  backOut: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  elasticOut: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  bounceOut: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
} as const satisfies Record<string, Ease>;

export interface TweenOpts {
  duration: number; // seconds
  delay?: number;
  ease?: Ease;
  onUpdate?: (t: number) => void;
  onComplete?: () => void;
}

interface Active {
  target: Record<string, number> | null; // null for pure-callback tweens
  from: Record<string, number>;
  to: Record<string, number>;
  elapsed: number;
  duration: number;
  delay: number;
  ease: Ease;
  onUpdate?: ((t: number) => void) | undefined;
  onComplete?: (() => void) | undefined;
  done: boolean;
}

export class TweenManager {
  private active: Active[] = [];

  /** Tween numeric properties of any object (e.g. sprite, sprite.scale, sprite.position). */
  to(target: object, props: Record<string, number>, opts: TweenOpts): Active {
    const from: Record<string, number> = {};
    const to: Record<string, number> = {};
    const t = target as Record<string, number>;
    for (const key of Object.keys(props)) {
      from[key] = t[key] as number;
      to[key] = props[key] as number;
    }
    const tw: Active = {
      target: target as unknown as Record<string, number>,
      from,
      to,
      elapsed: 0,
      duration: Math.max(opts.duration, 0.0001),
      delay: opts.delay ?? 0,
      ease: opts.ease ?? Easing.quadOut,
      onUpdate: opts.onUpdate,
      onComplete: opts.onComplete,
      done: false,
    };
    this.active.push(tw);
    return tw;
  }

  /** Drive a 0→1 callback over time (for custom interpolation). */
  run(opts: TweenOpts): Active {
    const tw: Active = {
      target: null,
      from: {},
      to: {},
      elapsed: 0,
      duration: Math.max(opts.duration, 0.0001),
      delay: opts.delay ?? 0,
      ease: opts.ease ?? Easing.linear,
      onUpdate: opts.onUpdate,
      onComplete: opts.onComplete,
      done: false,
    };
    this.active.push(tw);
    return tw;
  }

  /** Fire a callback after `seconds`. */
  delay(seconds: number, fn: () => void): Active {
    return this.run({ duration: seconds, onComplete: fn });
  }

  cancel(tw: Active): void {
    tw.done = true;
  }

  /** Cancel every active tween (used on scene transitions to avoid orphans). */
  clear(): void {
    for (const tw of this.active) tw.done = true;
    this.active.length = 0;
  }

  update(dt: number): void {
    // Iterate over a snapshot so onComplete callbacks may safely add tweens.
    const list = this.active;
    for (let i = 0; i < list.length; i++) {
      const tw = list[i] as Active;
      if (tw.done) continue;
      if (tw.delay > 0) {
        tw.delay -= dt;
        if (tw.delay > 0) continue;
      }
      tw.elapsed += dt;
      const raw = Math.min(tw.elapsed / tw.duration, 1);
      const t = tw.ease(raw);
      if (tw.target) {
        for (const key of Object.keys(tw.to)) {
          const a = tw.from[key] as number;
          const b = tw.to[key] as number;
          tw.target[key] = a + (b - a) * t;
        }
      }
      tw.onUpdate?.(t);
      if (raw >= 1) {
        tw.done = true;
        tw.onComplete?.();
      }
    }
    this.active = this.active.filter((t) => !t.done);
  }
}

/** The single global tween manager, updated by the app ticker each frame. */
export const Tweens = new TweenManager();
