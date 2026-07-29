/** Meta-progression + settings persistence (localStorage, versioned, crash-safe). */

export type Difficulty = 'easy' | 'normal' | 'hard';
export type BattleSpeed = 1 | 2 | 3;

/** One all-time personal best: a value plus who/what set it. */
export interface StatRecord {
  value: number;
  detail: string; // legend name, team roster, etc.
}

/** All-time hall-of-records, persisted across every run. */
export interface RunRecords {
  legendDamage: StatRecord; // most damage by a single legend in one battle
  teamDamage: StatRecord; // most total damage by the team in one battle
  legendHeals: StatRecord; // most healing by a single legend in one battle
  legendDodges: StatRecord; // most dodges by a single legend in one battle
}

export interface MetaSave {
  version: 2;
  bestFloor: number;
  totalRuns: number;
  totalKills: number;
  audioMuted: boolean;
  recruitStyle: 'wheel' | 'slots';
  difficulty: Difficulty;
  defaultAutoBattle: boolean;
  defaultBattleSpeed: BattleSpeed;
  records: RunRecords;
}

const KEY = 'wheel-of-legends.meta';

export function emptyRecords(): RunRecords {
  return {
    legendDamage: { value: 0, detail: '' },
    teamDamage: { value: 0, detail: '' },
    legendHeals: { value: 0, detail: '' },
    legendDodges: { value: 0, detail: '' },
  };
}

const DEFAULTS: MetaSave = {
  version: 2,
  bestFloor: 0,
  totalRuns: 0,
  totalKills: 0,
  audioMuted: false,
  recruitStyle: 'wheel',
  difficulty: 'normal',
  defaultAutoBattle: false,
  defaultBattleSpeed: 1,
  records: emptyRecords(),
};

export function loadMeta(): MetaSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, records: emptyRecords() };
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    // Merge forward so saves from before records existed gain the new fields.
    return {
      ...DEFAULTS,
      ...parsed,
      version: 2,
      records: { ...emptyRecords(), ...(parsed.records ?? {}) },
    };
  } catch {
    return { ...DEFAULTS, records: emptyRecords() };
  }
}

export function saveMeta(meta: MetaSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    // Storage unavailable (private mode etc.) — the game must keep playing.
  }
}

// ── in-progress run ───────────────────────────────────────────────────────
// Stored separately from meta so a corrupt run never costs the player their
// records, and clearing one never touches the other.
const RUN_KEY = 'wheel-of-legends.run';

/** Persist the active climb. Accepts the plain object from RunState.toSave(). */
export function saveRunState(save: unknown): void {
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify(save));
  } catch {
    // Out of quota or storage disabled — play continues, just without resume.
  }
}

/** Raw saved climb, or null when there is nothing to resume. */
export function loadRunState<T>(): T | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearRunState(): void {
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {
    // Nothing to do — a stale save is harmless.
  }
}
