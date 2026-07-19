/** Every tunable number in one place. Balance passes edit this file only. */

import type { Rarity } from './types';

export const Balance = {
  team: {
    maxSize: 5,
    costCap: 20,
    costUpgradeSize: 2,
    maxCostCap: 30,
    costUpgradeBasePrice: 160,
    costUpgradePriceGrowth: 90,
    frontSlots: 3, // slots 0..2 are the front row
  },
  rarity: {
    weights: { common: 40, rare: 30, epic: 17, legendary: 8, supreme: 4, godlike: 1 } as Record<Rarity, number>,
    cost: { common: 2, rare: 3, epic: 4, legendary: 6, supreme: 8, godlike: 10 } as Record<Rarity, number>,
  },
  economy: {
    startingGold: 225,
    startingSpins: 3,
    spinBaseCost: 90,
    spinCostGrowth: 12, // +gold per purchased spin this run
    duplicateLevelUp: true, // duplicate recruit → +1 level
  },
  difficulty: {
    easy: 0.72,
    normal: 1,
    hard: 1.4,
  },
  difficultyLevelBonus: {
    easy: -1,
    normal: 0,
    hard: 1,
  },
  difficultyReward: {
    easy: 0.9,
    normal: 1,
    hard: 1.25,
  },
  level: {
    statGainPerLevel: 0.08, // +8% ATK & HP per level above 1
    max: 10,
    trainingBaseCost: 70,
    trainingPerLevel: 35,
    trainingRarityCost: 15,
  },
  battle: {
    tickSeconds: 0.1,
    timeLimit: 120,
    actionMeterMax: 100,
    energyMax: 100,
    energyPerBasic: 25,
    energyPerCharge: 50,
    skillEnergyCost: 50,
    energyPerSecond: 8,
    energyWhenStruck: 10,
    damageVariance: 0.05,
    weaknessDamageMult: 1.25,
    defenseScale: 100, // damage *= scale / (scale + def)
    statusTickSeconds: 1,
  },
  tower: {
    scalePerFloor: 0.1, // enemy hp/atk ×(1 + rate·(floor−1))
    bossEvery: 5,
    bossStatMult: 1.35, // boss unit's extra multiplier
    budgetBase: 8, // enemy team cost budget at floor 1
    budgetPerFloor: 1.4,
  },
  rewards: {
    choices: 4,
    bossChoices: 5,
    battleBase: 55,
    battlePerFloor: 14,
    bossBonus: 140,
    survivorBonus: 12,
    flawlessBonus: 35,
    goldSmall: 100,
    goldLarge: 220,
    goldPerFloor: 8,
    healPct: 0.35,
    fullHealPct: 1,
    relicAtk: 0.07,
    relicHp: 0.07,
  },
} as const;
