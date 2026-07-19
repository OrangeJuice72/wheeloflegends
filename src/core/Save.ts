/** Meta-progression + settings persistence (localStorage, versioned, crash-safe). */

export type Difficulty = 'easy' | 'normal' | 'hard';
export type BattleSpeed = 1 | 2 | 3;

export interface MetaSave {
  version: 1;
  bestFloor: number;
  totalRuns: number;
  totalKills: number;
  audioMuted: boolean;
  recruitStyle: 'wheel' | 'slots';
  difficulty: Difficulty;
  defaultAutoBattle: boolean;
  defaultBattleSpeed: BattleSpeed;
}

const KEY = 'wheel-of-legends.meta';

const DEFAULTS: MetaSave = {
  version: 1,
  bestFloor: 0,
  totalRuns: 0,
  totalKills: 0,
  audioMuted: false,
  recruitStyle: 'wheel',
  difficulty: 'normal',
  defaultAutoBattle: false,
  defaultBattleSpeed: 1,
};

export function loadMeta(): MetaSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    return { ...DEFAULTS, ...parsed, version: 1 };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveMeta(meta: MetaSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    // Storage unavailable (private mode etc.) — the game must keep playing.
  }
}
