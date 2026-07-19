/**
 * Procedurally synthesized SFX via WebAudio — zero binary assets, zero
 * licensing risk, instant load. Each sound is built from tone/noise
 * primitives with tight envelopes so clicks feel crisp, not beepy.
 */

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;

  /** Must be called from a user gesture at least once (browser policy). */
  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.muted ? null : this.ctx;
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; vol?: number; delay?: number; slideTo?: number; attack?: number } = {},
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t0 + dur);
    const gain = ctx.createGain();
    const vol = opts.vol ?? 0.2;
    const attack = opts.attack ?? 0.005;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, opts: { vol?: number; delay?: number; filterFrom?: number; filterTo?: number; q?: number } = {}): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuffer) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = opts.q ?? 0.9;
    filter.frequency.setValueAtTime(opts.filterFrom ?? 1200, t0);
    if (opts.filterTo !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.filterTo), t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(opts.vol ?? 0.18, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // ── UI ────────────────────────────────────────────────────────────────
  click(): void {
    this.tone(660, 0.06, { type: 'triangle', vol: 0.15 });
    this.noise(0.03, { vol: 0.06, filterFrom: 3200 });
  }
  hover(): void {
    this.tone(880, 0.03, { type: 'sine', vol: 0.05 });
  }
  error(): void {
    this.tone(180, 0.12, { type: 'square', vol: 0.1 });
    this.tone(140, 0.16, { type: 'square', vol: 0.1, delay: 0.08 });
  }
  coin(): void {
    this.tone(1320, 0.07, { type: 'square', vol: 0.08 });
    this.tone(1760, 0.18, { type: 'square', vol: 0.08, delay: 0.06 });
  }

  // ── recruit machine ───────────────────────────────────────────────────
  wheelTick(pitch = 1): void {
    this.tone(520 * pitch, 0.035, { type: 'triangle', vol: 0.12 });
    this.noise(0.02, { vol: 0.05, filterFrom: 5000 });
  }
  spinStart(): void {
    this.noise(0.5, { vol: 0.14, filterFrom: 400, filterTo: 2600 });
  }
  /** Heavy mechanical clunk when a reel locks in. */
  reelStop(): void {
    this.tone(150, 0.1, { type: 'sine', vol: 0.24, slideTo: 90 });
    this.noise(0.06, { vol: 0.14, filterFrom: 1600, filterTo: 500 });
  }
  /** Rising suspense sweep under the final reel's crawl. */
  riser(duration: number): void {
    this.tone(180, duration, { type: 'sawtooth', vol: 0.05, slideTo: 760, attack: duration * 0.5 });
    this.noise(duration, { vol: 0.05, filterFrom: 500, filterTo: 3200, q: 2 });
  }
  /** Low double-thump for legendary suspense. */
  heartbeat(): void {
    this.tone(62, 0.14, { type: 'sine', vol: 0.3 });
    this.tone(56, 0.18, { type: 'sine', vol: 0.26, delay: 0.22 });
  }
  /** The final reel slams onto the character. */
  slam(): void {
    this.tone(70, 0.3, { type: 'sine', vol: 0.34, slideTo: 40 });
    this.noise(0.24, { vol: 0.28, filterFrom: 2400, filterTo: 200 });
    this.tone(1240, 0.12, { type: 'triangle', vol: 0.1, delay: 0.03 });
  }

  reveal(tier: 0 | 1 | 2 | 3 | 4 | 5): void {
    const roots = [392, 440, 523, 659, 784, 988] as const;
    const root = roots[tier];
    const intervals = [0, 4, 7, 12, 16] as const;
    const notes = Math.min(tier + 2, intervals.length);
    for (let i = 0; i < notes; i++) {
      this.tone(root * Math.pow(2, intervals[i]! / 12), 0.35, {
        type: 'triangle',
        vol: 0.14,
        delay: i * 0.09,
      });
    }
    if (tier >= 2) this.noise(0.7, { vol: 0.1, filterFrom: 2000, filterTo: 6000 });
    if (tier >= 3) {
      this.tone(root * 2, 1.1, { type: 'sine', vol: 0.12, delay: notes * 0.09, attack: 0.05 });
      this.tone(root * 3, 1.0, { type: 'sine', vol: 0.06, delay: notes * 0.09 + 0.05, attack: 0.05 });
    }
  }

  // ── battle ────────────────────────────────────────────────────────────
  /** Low ceremonial swell as both teams enter the arena. */
  battleStart(boss = false): void {
    const root = boss ? 48 : 62;
    this.tone(root, 0.75, { type: 'sine', vol: boss ? 0.3 : 0.22, slideTo: 38, attack: 0.03 });
    this.noise(0.65, { vol: boss ? 0.16 : 0.1, filterFrom: 180, filterTo: 900, q: 0.7 });
    this.tone(boss ? 196 : 262, 0.55, { type: 'triangle', vol: 0.08, delay: 0.18, slideTo: boss ? 147 : 196 });
  }

  /** Layered air displacement for attacks; power controls the weight. */
  whoosh(power = 1): void {
    const p = Math.max(0.5, Math.min(1.5, power));
    this.noise(0.13 + p * 0.08, { vol: 0.1 * p, filterFrom: 4200, filterTo: 420, q: 1.2 });
    this.tone(220 * p, 0.15, { type: 'triangle', vol: 0.055 * p, slideTo: 90 });
  }

  dodge(): void {
    this.noise(0.16, { vol: 0.11, filterFrom: 5200, filterTo: 1300, q: 2.2 });
    this.tone(980, 0.12, { type: 'sine', vol: 0.045, slideTo: 1480 });
  }

  transform(): void {
    this.tone(82, 0.8, { type: 'sawtooth', vol: 0.1, slideTo: 330, attack: 0.2 });
    this.tone(440, 0.7, { type: 'triangle', vol: 0.1, delay: 0.18, slideTo: 880 });
    this.tone(1320, 0.5, { type: 'sine', vol: 0.07, delay: 0.42, slideTo: 1760 });
    this.noise(0.9, { vol: 0.12, filterFrom: 260, filterTo: 6200, q: 1.8 });
  }

  hit(): void {
    this.noise(0.12, { vol: 0.2, filterFrom: 900, filterTo: 200 });
    this.tone(120, 0.12, { type: 'sine', vol: 0.22, slideTo: 60 });
  }
  crit(): void {
    this.noise(0.16, { vol: 0.26, filterFrom: 1400, filterTo: 240 });
    this.tone(90, 0.16, { type: 'sine', vol: 0.3, slideTo: 45 });
    this.tone(1560, 0.1, { type: 'triangle', vol: 0.1, delay: 0.02 });
  }
  beam(): void {
    this.noise(0.5, { vol: 0.16, filterFrom: 500, filterTo: 3600, q: 2.5 });
    this.tone(220, 0.5, { type: 'sawtooth', vol: 0.07, slideTo: 880 });
  }
  nova(): void {
    this.noise(0.6, { vol: 0.22, filterFrom: 3000, filterTo: 300 });
    this.tone(160, 0.5, { type: 'sine', vol: 0.2, slideTo: 60 });
  }
  bolt(): void {
    this.noise(0.14, { vol: 0.2, filterFrom: 6000, filterTo: 1200, q: 1.5 });
    this.tone(1200, 0.1, { type: 'sawtooth', vol: 0.07, slideTo: 300 });
  }
  heal(): void {
    this.tone(660, 0.2, { type: 'sine', vol: 0.09 });
    this.tone(880, 0.25, { type: 'sine', vol: 0.09, delay: 0.07 });
  }
  shield(): void {
    this.tone(1040, 0.16, { type: 'triangle', vol: 0.1 });
    this.tone(780, 0.2, { type: 'triangle', vol: 0.08, delay: 0.03 });
  }
  death(): void {
    this.tone(300, 0.45, { type: 'sawtooth', vol: 0.12, slideTo: 60 });
    this.noise(0.3, { vol: 0.12, filterFrom: 800, filterTo: 120 });
  }
  ultBanner(): void {
    this.tone(196, 0.3, { type: 'sawtooth', vol: 0.1 });
    this.tone(392, 0.4, { type: 'triangle', vol: 0.12, delay: 0.05 });
    this.noise(0.35, { vol: 0.1, filterFrom: 900, filterTo: 4000 });
  }

  victory(): void {
    const seq = [523, 659, 784, 1047];
    seq.forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.14, delay: i * 0.12 }));
    this.tone(1047, 0.8, { type: 'triangle', vol: 0.12, delay: 0.55, attack: 0.03 });
  }
  defeat(): void {
    const seq = [440, 415, 349, 262];
    seq.forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', vol: 0.12, delay: i * 0.22 }));
  }
}
