/** Every tunable number in one place. Balance passes edit this file only. */

import type { Rarity } from './types';

export const Balance = {
  team: {
    maxSize: 5,
    costCap: 22,
    costUpgradeSize: 2,
    maxCostCap: 32,
    costUpgradeBasePrice: 150,
    costUpgradePriceGrowth: 85,
    frontSlots: 2, // slots 0..1 are front; slots 2..4 are back
  },
  rarity: {
    weights: { common: 40, rare: 30, epic: 17, legendary: 8, supreme: 4, godlike: 1 } as Record<Rarity, number>,
    cost: { common: 2, rare: 3, epic: 4, legendary: 6, supreme: 8, godlike: 10 } as Record<Rarity, number>,
  },
  economy: {
    startingGold: 320,
    startingSpins: 5,
    spinBaseCost: 70,
    spinCostGrowth: 10, // +gold per purchased spin this run
    duplicateLevelUp: true, // duplicate recruit → +1 level
  },
  difficulty: {
    easy: 0.82,
    normal: 1,
    hard: 1.28,
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
    statGainPerLevel: 0.1, // +10% ATK & HP per level above 1
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
    frontAttackBonus: 0.08, // front line deals +8% damage
    backDefenseBonus: 0.12, // back line gains +12% defense
    statusTickSeconds: 1,
  },
  tower: {
    scalePerFloor: 0.04, // enemy hp/atk ×(1 + rate·(floor−1))
    bossEvery: 5,
    bossStatMult: 1.2, // boss unit's extra multiplier
    budgetBase: 7, // enemy team cost budget at floor 1
    budgetPerFloor: 0.6,
  },
  rewards: {
    choices: 4,
    bossChoices: 5,
    battleBase: 60,
    battlePerFloor: 18,
    bossBonus: 140,
    survivorBonus: 12,
    flawlessBonus: 35,
    goldSmall: 110,
    goldLarge: 240,
    goldPerFloor: 10,
    healPct: 0.4,
    fullHealPct: 1,
    relicAtk: 0.11,
    relicHp: 0.11,
  },
} as const;
