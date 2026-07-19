/**
 * The battle event stream — the only interface between simulation and
 * presentation. Every event is timestamped in battle-seconds; the UI replays
 * them on a scaled clock (pause/2x/3x change the clock, never the outcome).
 */

import type { AbilityFx, StatusKind, BuffStat } from '../data/types';

export type Side = 'player' | 'enemy';

export interface BattleChoiceOption {
  slot: 'basic' | 'skill' | 'ult' | 'charge' | 'item';
  ability: string;
  energyCost: number;
  available: boolean;
  cooldown: number;
}

export interface UnitSnapshot {
  uid: string;
  hp: number;
  energy: number;
}

export type BattleEvent =
  | { t: number; kind: 'start' }
  | { t: number; kind: 'spawn'; uid: string; defId: string; side: Side; slot: number; maxHp: number; hp: number; level: number; boss: boolean }
  | { t: number; kind: 'synergy'; side: Side; name: string; icon: string; desc: string }
  | { t: number; kind: 'item'; uid: string; itemName: string; effect: string }
  | { t: number; kind: 'itemProc'; uid: string; itemName: string; effect: string }
  | { t: number; kind: 'act'; uid: string; ability: string; slot: 'basic' | 'skill' | 'ult' | 'charge' | 'item'; fx: AbilityFx; color: number }
  | { t: number; kind: 'choice'; uid: string; energy: number; options: BattleChoiceOption[] }
  | { t: number; kind: 'damage'; source: string; target: string; amount: number; crit: boolean; weakness: boolean; hpAfter: number; shielded: boolean }
  | { t: number; kind: 'dodge'; target: string }
  | { t: number; kind: 'heal'; source: string; target: string; amount: number; hpAfter: number }
  | { t: number; kind: 'shield'; source: string; target: string; amount: number }
  | { t: number; kind: 'status'; source: string; target: string; status: StatusKind; duration: number }
  | { t: number; kind: 'buff'; source: string; target: string; stat: BuffStat; amount: number; duration: number }
  | { t: number; kind: 'transform'; uid: string; name: string }
  | { t: number; kind: 'death'; uid: string }
  | { t: number; kind: 'tick'; units: UnitSnapshot[] }
  | { t: number; kind: 'end'; winner: Side; duration: number };

export interface UnitResultStats {
  uid: string;
  defId: string;
  side: Side;
  damageDealt: number;
  healingDone: number;
  kills: number;
  alive: boolean;
  hpPct: number;
}

export interface BattleResult {
  winner: Side;
  duration: number;
  events: BattleEvent[];
  units: UnitResultStats[];
  pendingChoice?: Extract<BattleEvent, { kind: 'choice' }>;
}
