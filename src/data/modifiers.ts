/**
 * Run modifiers ("mutators"): optional rules layered on a climb for extra
 * challenge and replayability. Each one is honored by the sim/run — see the
 * hook noted on every entry. They stack freely.
 */

export type ModifierId = 'glass-cannon' | 'sudden-death' | 'underdog' | 'mono-universe';

export interface ModifierDef {
  id: ModifierId;
  name: string;
  icon: string;
  /** One-line effect shown in the picker and the run HUD. */
  short: string;
}

export const MODIFIERS: readonly ModifierDef[] = [
  // hook: RunState.playerSpecs → extraBoosts
  { id: 'glass-cannon', name: 'Glass Cannon', icon: '💥', short: 'Your team: +40% ATK, −35% HP.' },
  // hook: RunState.generateRewards (no recovery) + applyBattleResult (10% revive)
  { id: 'sudden-death', name: 'Sudden Death', icon: '💀', short: 'No healing rewards; the fallen revive at only 10% HP.' },
  // hook: RunState.eligibleRecruitPool
  { id: 'underdog', name: 'Underdog', icon: '🐣', short: 'Summon only Common and Rare legends.' },
  // hook: RunState.eligibleRecruitPool (+ monoFranchise chosen at run start)
  { id: 'mono-universe', name: 'Mono-Universe', icon: '🌌', short: 'Summons are locked to one random universe.' },
];

const BY_ID: ReadonlyMap<ModifierId, ModifierDef> = new Map(MODIFIERS.map((m) => [m.id, m]));

export function getModifier(id: ModifierId): ModifierDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown modifier: ${id}`);
  return def;
}
