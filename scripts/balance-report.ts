/** Headless roster report. Run: npm run balance -- --samples=4 --mode=5v5 [--json] */

import { Balance } from '../src/data/balance';
import { CHARACTERS } from '../src/data/characters';
import { characterPowerScore, RARITY_POWER_BUDGET, rarityBudgetStatus } from '../src/data/rarityBudget';
import type { CharacterDef, Rarity } from '../src/data/types';
import { simulateBattle, type CombatantSpec } from '../src/sim/battle';

const sampleArg = process.argv.find((arg) => arg.startsWith('--samples='));
const modeArg = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1];
const samples = Math.max(2, Number(sampleArg?.split('=')[1] ?? 4) || 4);
const mode: '1v1' | '5v5' = modeArg === '1v1' ? '1v1' : '5v5';
const asJson = process.argv.includes('--json');

const costOf = (character: CharacterDef): number => Balance.rarity.cost[character.rarity];
const stableHash = (text: string): number => {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
};

function buildTeam(anchor: CharacterDef, salt: number): CharacterDef[] {
  if (mode === '1v1') return [anchor];
  const team = [anchor];
  let cost = costOf(anchor);
  const candidates = CHARACTERS
    .filter((candidate) => candidate.id !== anchor.id)
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((tag) => anchor.tags.includes(tag)).length;
      const affinity = candidate.franchise === anchor.franchise ? 5 : sharedTags * 2;
      return { candidate, affinity, order: stableHash(`${anchor.id}:${candidate.id}:${salt}`) };
    })
    .sort((a, b) => b.affinity - a.affinity || a.order - b.order);
  for (const { candidate } of candidates) {
    if (team.length >= Balance.team.maxSize) break;
    const candidateCost = costOf(candidate);
    if (cost + candidateCost > Balance.team.costCap) continue;
    team.push(candidate);
    cost += candidateCost;
  }
  for (const candidate of [...CHARACTERS].sort((a, b) => costOf(a) - costOf(b) || a.id.localeCompare(b.id))) {
    if (team.length >= Balance.team.maxSize) break;
    if (team.some((member) => member.id === candidate.id)) continue;
    if (cost + costOf(candidate) > Balance.team.costCap) continue;
    team.push(candidate);
    cost += costOf(candidate);
  }
  return team;
}

function specs(team: readonly CharacterDef[]): CombatantSpec[] {
  const ordered = [...team].sort((a, b) =>
    (b.stats.hp * (100 + b.stats.def)) - (a.stats.hp * (100 + a.stats.def)));
  return ordered.map((character, slot) => ({
    defId: character.id,
    level: 1,
    slot,
    hpPct: 1,
    statScale: 1,
  }));
}

interface CharacterBalanceRow {
  id: string;
  name: string;
  rarity: Rarity;
  cost: number;
  powerScore: number;
  budgetStatus: 'low' | 'within' | 'high';
  wins: number;
  games: number;
  winRate: number;
}

const rows: CharacterBalanceRow[] = CHARACTERS.map((character, characterIndex) => {
  const cost = costOf(character);
  const comparable = CHARACTERS.filter((candidate) =>
    candidate.id !== character.id && Math.abs(costOf(candidate) - cost) <= 1);
  let wins = 0;
  let games = 0;
  for (let sample = 0; sample < samples; sample++) {
    const opponent = comparable[(characterIndex * 17 + sample * 31) % comparable.length]!;
    const candidateTeam = specs(buildTeam(character, sample * 2));
    const opponentTeam = specs(buildTeam(opponent, sample * 2 + 1));
    const seed = ((characterIndex + 1) * 100003 + sample * 7919) >>> 0;
    const first = simulateBattle(candidateTeam, opponentTeam, seed);
    const second = simulateBattle(opponentTeam, candidateTeam, seed ^ 0x9e3779b9);
    wins += first.winner === 'player' ? 1 : 0;
    wins += second.winner === 'enemy' ? 1 : 0;
    games += 2;
  }
  return {
    id: character.id, name: character.name, rarity: character.rarity, cost,
    powerScore: characterPowerScore(character), budgetStatus: rarityBudgetStatus(character),
    wins, games, winRate: wins / games,
  };
});

const rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'supreme', 'godlike'];
const raritySummary = rarities.map((rarity) => {
  const group = rows.filter((row) => row.rarity === rarity);
  const average = group.length ? group.reduce((sum, row) => sum + row.winRate, 0) / group.length : 0;
  const averagePower = group.length ? group.reduce((sum, row) => sum + row.powerScore, 0) / group.length : 0;
  return { rarity, characters: group.length, averageWinRate: average, averagePower, budget: RARITY_POWER_BUDGET[rarity] };
});
const outliers = rows.filter((row) => row.winRate < 0.3 || row.winRate > 0.7);
const budgetOutliers = rows.filter((row) => row.budgetStatus !== 'within');
const duplicateIds = [...new Set(CHARACTERS.map((character) => character.id).filter((id, index, all) => all.indexOf(id) !== index))];

const report = {
  generatedAt: new Date().toISOString(), mode,
  samplesPerCharacter: samples * 2,
  characters: rows.length,
  duplicateIds,
  raritySummary,
  strongest: [...rows].sort((a, b) => b.winRate - a.winRate || b.powerScore - a.powerScore).slice(0, 12),
  weakest: [...rows].sort((a, b) => a.winRate - b.winRate || a.powerScore - b.powerScore).slice(0, 12),
  outliers,
  budgetOutliers,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  console.log('# Wheel of Legends Balance Report\n');
  console.log(`- ${report.characters} characters`);
  console.log(`- ${report.samplesPerCharacter} mirrored ${mode} matchups per character`);
  console.log(`- ${report.duplicateIds.length} duplicate character IDs`);
  console.log(`- ${report.outliers.length} preliminary 30–70% win-rate outliers`);
  console.log(`- ${report.budgetOutliers.length} rarity-budget warnings\n`);
  console.log('| Rarity | Characters | Avg win rate | Avg power | Target budget |');
  console.log('|---|---:|---:|---:|---:|');
  for (const row of raritySummary) {
    console.log(`| ${row.rarity} | ${row.characters} | ${pct(row.averageWinRate)} | ${row.averagePower.toFixed(1)} | ${row.budget.min}–${row.budget.max} |`);
  }
  console.log('\n## Strongest preliminary outliers\n');
  for (const row of report.strongest) console.log(`- ${row.name} (${row.rarity}, cost ${row.cost}, power ${row.powerScore}): ${pct(row.winRate)}`);
  console.log('\n## Weakest preliminary outliers\n');
  for (const row of report.weakest) console.log(`- ${row.name} (${row.rarity}, cost ${row.cost}, power ${row.powerScore}): ${pct(row.winRate)}`);
  console.log('\nUse this as a screening report, then playtest the flagged teams and character roles before changing data.');
}
