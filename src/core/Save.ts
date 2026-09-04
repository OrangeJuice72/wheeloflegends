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

export interface CareerStats {
  battlesPlayed: number;
  battlesWon: number;
  battlesLost: number;
  bossesDefeated: number;
  ultimatesUsed: number;
  totalGoldEarned: number;
  currentWinStreak: number;
  longestWinStreak: number;
  /** Deployment count powers the Codex's favorite-legend statistic. */
  legendDeployments: Record<string, number>;
}

export interface MetaSave {
  version: 2;
  bestFloor: number;
  totalRuns: number;
  totalKills: number;
  audioMuted: boolean;
  reducedEffects: boolean;
  recruitStyle: 'wheel' | 'slots';
  difficulty: Difficulty;
  defaultAutoBattle: boolean;
  defaultBattleSpeed: BattleSpeed;
  records: RunRecords;
  career: CareerStats;
  discoveredLegendIds: string[];
  discoveredRelicIds: string[];
  defeatedBossIds: string[];
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

export function emptyCareerStats(): CareerStats {
  return {
    battlesPlayed: 0,
    battlesWon: 0,
    battlesLost: 0,
    bossesDefeated: 0,
    ultimatesUsed: 0,
    totalGoldEarned: 0,
    currentWinStreak: 0,
    longestWinStreak: 0,
    legendDeployments: {},
  };
}

const DEFAULTS: MetaSave = {
  version: 2,
  bestFloor: 0,
  totalRuns: 0,
  totalKills: 0,
  audioMuted: false,
  reducedEffects: false,
  recruitStyle: 'wheel',
  difficulty: 'normal',
  defaultAutoBattle: false,
  defaultBattleSpeed: 1,
  records: emptyRecords(),
  career: emptyCareerStats(),
  discoveredLegendIds: [],
  discoveredRelicIds: [],
  defeatedBossIds: [],
};

export function loadMeta(): MetaSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, records: emptyRecords(), career: emptyCareerStats(), discoveredLegendIds: [], discoveredRelicIds: [], defeatedBossIds: [] };
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    // Merge forward so saves from before records existed gain the new fields.
    return {
      ...DEFAULTS,
      ...parsed,
      version: 2,
      records: { ...emptyRecords(), ...(parsed.records ?? {}) },
      career: {
        ...emptyCareerStats(),
        ...(parsed.career ?? {}),
        legendDeployments: { ...(parsed.career?.legendDeployments ?? {}) },
      },
      discoveredLegendIds: [...new Set(parsed.discoveredLegendIds ?? [])],
      discoveredRelicIds: [...new Set(parsed.discoveredRelicIds ?? [])],
      defeatedBossIds: [...new Set(parsed.defeatedBossIds ?? [])],
    };
  } catch {
    return { ...DEFAULTS, records: emptyRecords(), career: emptyCareerStats(), discoveredLegendIds: [], discoveredRelicIds: [], defeatedBossIds: [] };
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
const RUN_BACKUP_KEY = `${RUN_KEY}.backup`;

/** Reject broken saves before they replace a recoverable climb. */
export function isValidRunSave(value: unknown): value is import('../sim/run').RunSave {
  if (!value || typeof value !== 'object') return false;
  const run = value as Record<string, unknown>;
  const finite = (key: string, min = 0) => typeof run[key] === 'number' && Number.isFinite(run[key]) && (run[key] as number) >= min;
  if (run.v !== 1 || !finite('seed') || !finite('floor', 1) || !Number.isInteger(run.floor)) return false;
  if (!['easy', 'normal', 'hard'].includes(String(run.difficulty)) || !['tower', 'conquest'].includes(String(run.mode))) return false;
  if (!['gold', 'spins', 'spinsBought', 'relicAtk', 'relicHp', 'goldEarned', 'lastBattleCoins', 'kills', 'teamCostCap', 'teamCostUpgrades', 'rngState', 'battleRngState'].every(key => finite(key))) return false;
  if (!Array.isArray(run.roster) || !run.roster.every(entry => entry && typeof entry.defId === 'string'
    && Number.isInteger(entry.level) && entry.level >= 1
    && Number.isFinite(entry.hpPct) && entry.hpPct >= 0 && entry.hpPct <= 1)) return false;
  if (!Array.isArray(run.team) || run.team.length !== 5 || !run.team.every(slot => slot === null || (Number.isInteger(slot) && slot >= 0 && slot < (run.roster as unknown[]).length))) return false;
  return ['inventory', 'modifiers', 'conquestOrder'].every(key => Array.isArray(run[key]) && (run[key] as unknown[]).every(item => typeof item === 'string'))
    && (run.relicIds === undefined || (Array.isArray(run.relicIds) && run.relicIds.every(id => typeof id === 'string')));
}

function readValidRun(key: string): import('../sim/run').RunSave | null {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isValidRunSave(parsed) ? parsed : null;
  } catch { return null; }
}

/** Persist the active climb. Accepts the plain object from RunState.toSave(). */
export function saveRunState(save: unknown): boolean {
  if (!isValidRunSave(save)) return false;
  try {
    const previous = readValidRun(RUN_KEY);
    // A corrupt primary must never displace the last valid backup.
    if (previous) localStorage.setItem(RUN_BACKUP_KEY, JSON.stringify(previous));
    localStorage.setItem(RUN_KEY, JSON.stringify(save));
    return true;
  } catch {
    // Out of quota or storage disabled — play continues, just without resume.
    return false;
  }
}

/** Raw saved climb, or null when there is nothing to resume. */
export function loadRunState<T>(): T | null {
  return (readValidRun(RUN_KEY) ?? readValidRun(RUN_BACKUP_KEY)) as T | null;
}

export function clearRunState(): void {
  try {
    localStorage.removeItem(RUN_KEY);
    localStorage.removeItem(RUN_BACKUP_KEY);
  } catch {
    // Nothing to do — a stale save is harmless.
  }
}
