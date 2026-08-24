/** Data-driven tower-guardian rules used by the deterministic battle sim. */

export type BossMechanicKind = 'backline-fallout' | 'frontline-lava' | 'psychic-barrier';

export interface BossPhaseDef {
  /** Phase begins when current HP reaches this percentage. */
  atHpPct: number;
  name: string;
  short: string;
  color: number;
  atk?: number;
  spd?: number;
  shieldMult?: number;
  pulse?: 'front' | 'back' | 'all';
  pulseMult?: number;
  burn?: boolean;
}

export interface BossMechanicDef {
  characterId: string;
  name: string;
  short: string;
  kind: BossMechanicKind;
  firstAt: number;
  interval: number;
  color: number;
  phases: readonly BossPhaseDef[];
}

export const BOSS_MECHANICS: readonly BossMechanicDef[] = [
  {
    characterId: 'godzilla',
    name: 'Atomic Fallout',
    short: 'Scorches the back line, then enters Radiation Storm and Meltdown.',
    kind: 'backline-fallout',
    firstAt: 7,
    interval: 12,
    color: 0x52f3ff,
    phases: [
      { atHpPct: 0.7, name: 'Radiation Storm', short: 'Atomic pressure rises; the back line is scorched.', color: 0x7bfff2, atk: 0.16, spd: 0.10, pulse: 'back', pulseMult: 0.55, burn: true },
      { atHpPct: 0.35, name: 'Core Meltdown', short: 'Godzilla erupts across the entire formation.', color: 0xff5f45, atk: 0.24, spd: 0.18, pulse: 'all', pulseMult: 0.48, burn: true },
    ],
  },
  {
    characterId: 'bowser',
    name: 'Lava Surge',
    short: 'Erupts beneath the front line, then collapses the castle around you.',
    kind: 'frontline-lava',
    firstAt: 6,
    interval: 11,
    color: 0xff632e,
    phases: [
      { atHpPct: 0.7, name: 'Castle Collapse', short: 'Falling stone crushes the front line.', color: 0xff9a38, atk: 0.14, shieldMult: 1.2, pulse: 'front', pulseMult: 0.62 },
      { atHpPct: 0.35, name: 'Fury Shell', short: 'Bowser becomes dramatically faster and stronger.', color: 0xff3434, atk: 0.26, spd: 0.28, pulse: 'front', pulseMult: 0.52, burn: true },
    ],
  },
  {
    characterId: 'mewtwo',
    name: 'Psychic Barrier',
    short: 'Raises psychic barriers, then evolves through two dangerous phases.',
    kind: 'psychic-barrier',
    firstAt: 8,
    interval: 14,
    color: 0xb96cff,
    phases: [
      { atHpPct: 0.7, name: 'Mega Evolution', short: 'Mewtwo evolves and surrounds itself with psychic armor.', color: 0xd58cff, atk: 0.14, spd: 0.16, shieldMult: 2.0 },
      { atHpPct: 0.35, name: 'Mind Break', short: 'A psychic wave strikes the entire formation.', color: 0xff63e6, atk: 0.22, spd: 0.24, shieldMult: 1.4, pulse: 'all', pulseMult: 0.42 },
    ],
  },
];

const BY_CHARACTER = new Map(BOSS_MECHANICS.map((mechanic) => [mechanic.characterId, mechanic]));

export function getBossMechanic(characterId: string): BossMechanicDef | undefined {
  return BY_CHARACTER.get(characterId);
}
