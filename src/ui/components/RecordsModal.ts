/** Hall of Records: all-time personal bests, read from the meta save. */

import { Container, Graphics, Text } from 'pixi.js';
import type { Game } from '../../app/Game';
import { Button } from './Button';
import { H, mix, Palette, Type, W } from '../theme';
import { CHARACTERS_BY_ID } from '../../data/characters';

const PANEL_W = 900;
const PANEL_H = 630;
const ROW_H = 94;

interface Row {
  icon: string;
  label: string;
  value: string;
  detail: string;
}

export class RecordsModal extends Container {
  private readonly sheet = new Container();

  constructor(private readonly game: Game, private readonly onClose: () => void) {
    super();
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.8 });
    dim.eventMode = 'static';
    dim.cursor = 'pointer';
    dim.on('pointerdown', () => this.close());
    this.sheet.position.set((W - PANEL_W) / 2, (H - PANEL_H) / 2);
    this.sheet.eventMode = 'static';
    this.addChild(dim, this.sheet);
    this.render();
  }

  private render(): void {
    const meta = this.game.meta;
    const records = meta.records;
    const career = meta.career;

    const bg = new Graphics()
      .roundRect(0, 0, PANEL_W, PANEL_H, 20)
      .fill({ color: Palette.panel, alpha: 0.99 })
      .stroke({ color: Palette.gold, width: 3 })
      .roundRect(5, 5, PANEL_W - 10, 70, 16)
      .fill({ color: Palette.panelLight, alpha: 0.9 });
    const title = new Text({ text: '🏆  HALL OF RECORDS', style: Type.h1() });
    title.anchor.set(0.5, 0);
    title.position.set(PANEL_W / 2, 18);
    const subtitle = new Text({ text: `${meta.totalRuns} runs  ·  ${meta.totalKills.toLocaleString('en-US')} enemies defeated  ·  ${career.totalGoldEarned.toLocaleString('en-US')} battle coins`, style: Type.small() });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(PANEL_W / 2, 50);
    this.sheet.addChild(bg, title, subtitle);

    const fmt = (n: number) => n.toLocaleString('en-US');
    const favoriteEntry = Object.entries(career.legendDeployments).sort((a, b) => b[1] - a[1])[0];
    const favorite = favoriteEntry ? CHARACTERS_BY_ID.get(favoriteEntry[0]) : undefined;
    const winRate = career.battlesPlayed > 0 ? Math.round((career.battlesWon / career.battlesPlayed) * 100) : 0;
    const rows: Row[] = [
      { icon: '🗼', label: 'HIGHEST CLIMB', value: meta.bestFloor > 0 ? `Floor ${meta.bestFloor}` : '—', detail: 'Deepest floor reached' },
      { icon: '⚔️', label: 'BATTLE RECORD', value: career.battlesPlayed ? `${career.battlesWon}–${career.battlesLost}` : '—', detail: career.battlesPlayed ? `${winRate}% win rate` : 'No recorded battles' },
      { icon: '👑', label: 'BOSSES DEFEATED', value: fmt(career.bossesDefeated), detail: `${meta.defeatedBossIds.length} unique guardians conquered` },
      { icon: '🔥', label: 'LONGEST STREAK', value: career.longestWinStreak ? `${career.longestWinStreak} wins` : '—', detail: `Current streak: ${career.currentWinStreak}` },
      { icon: '⭐', label: 'FAVORITE LEGEND', value: favorite?.name ?? '—', detail: favoriteEntry ? `${favoriteEntry[1]} battles deployed` : 'Recruit and field legends to track this' },
      { icon: '💫', label: 'ULTIMATES USED', value: fmt(career.ultimatesUsed), detail: 'Player ultimates unleashed' },
      { icon: '⚔️', label: 'LEGEND DAMAGE', value: records.legendDamage.value ? fmt(records.legendDamage.value) : '—', detail: records.legendDamage.detail || 'Most damage in one battle' },
      { icon: '💥', label: 'TEAM DAMAGE', value: records.teamDamage.value ? fmt(records.teamDamage.value) : '—', detail: records.teamDamage.detail || 'Most team damage in one battle' },
      { icon: '❤️', label: 'LEGEND HEALS', value: records.legendHeals.value ? fmt(records.legendHeals.value) : '—', detail: records.legendHeals.detail || 'Most healing in one battle' },
      { icon: '💨', label: 'MOST DODGES', value: records.legendDodges.value ? fmt(records.legendDodges.value) : '—', detail: records.legendDodges.detail || 'Most dodges in one battle' },
    ];

    rows.forEach((row, index) => {
      const col = index % 2;
      const gridRow = Math.floor(index / 2);
      const cardW = (PANEL_W - 66) / 2;
      const x = 22 + col * (cardW + 22);
      const y = 88 + gridRow * ROW_H;
      const card = new Graphics()
        .roundRect(x, y, cardW, ROW_H - 12, 12)
        .fill({ color: Palette.black, alpha: 0.34 })
        .stroke({ color: mix(Palette.gold, Palette.black, 0.35), width: 1 });
      const icon = new Text({ text: row.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 26 } });
      icon.anchor.set(0.5);
      icon.position.set(x + 30, y + (ROW_H - 12) / 2);
      const label = new Text({ text: row.label, style: Type.tiny() });
      label.style.fill = Palette.gold;
      label.position.set(x + 58, y + 12);
      const detail = new Text({ text: row.detail, style: Type.small() });
      detail.style.fill = Palette.textDim;
      detail.position.set(x + 58, y + 34);
      if (detail.width > cardW - 74) detail.scale.set((cardW - 74) / detail.width);
      const value = new Text({ text: row.value, style: Type.h2() });
      value.style.fill = Palette.text;
      value.anchor.set(1, 0);
      value.position.set(x + cardW - 16, y + 10);
      if (value.width > 150) value.scale.set(150 / value.width);
      this.sheet.addChild(card, icon, label, detail, value);
    });

    const close = new Button('DONE', this.game.sfx, {
      width: 220,
      height: 52,
      onClick: () => this.close(),
    });
    close.position.set(PANEL_W / 2, PANEL_H - 34);
    this.sheet.addChild(close);
  }

  private close(): void {
    this.game.sfx.click();
    this.onClose();
  }
}
