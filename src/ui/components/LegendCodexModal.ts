/** Paginated collection browser for discovered and undiscovered legends. */

import { Container, Graphics, Text } from 'pixi.js';
import type { Game } from '../../app/Game';
import { CHARACTERS } from '../../data/characters';
import { FRANCHISES } from '../../data/franchises';
import { RELICS } from '../../data/relics';
import type { Rarity } from '../../data/types';
import { Button } from './Button';
import { CARD_H, CARD_W, CharacterCard } from './CharacterCard';
import { CharacterInfoModal } from './CharacterInfoModal';
import { H, Palette, RarityColor, Type, W } from '../theme';

const PANEL_W = 1180;
const PANEL_H = 650;
const PAGE_SIZE = 16;
const RARITIES: Array<Rarity | 'all'> = ['all', 'common', 'rare', 'epic', 'legendary', 'supreme', 'godlike'];
const FRANCHISE_FILTERS = ['all', ...Object.keys(FRANCHISES)];

export class LegendCodexModal extends Container {
  private readonly sheet = new Container();
  private readonly grid = new Container();
  private page = 0;
  private rarityIndex = 0;
  private franchiseIndex = 0;
  private rarityButton!: Button;
  private franchiseButton!: Button;
  private pageText!: Text;
  private countText!: Text;

  constructor(private readonly game: Game, private readonly onClose: () => void) {
    super();
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.88 });
    dim.eventMode = 'static';
    dim.on('pointerdown', () => this.close());
    this.sheet.position.set((W - PANEL_W) / 2, (H - PANEL_H) / 2);
    this.sheet.eventMode = 'static';
    this.addChild(dim, this.sheet);
    this.buildChrome();
    this.renderGrid();
  }

  private buildChrome(): void {
    const bg = new Graphics()
      .roundRect(0, 0, PANEL_W, PANEL_H, 22)
      .fill({ color: Palette.panel, alpha: 0.995 })
      .stroke({ color: Palette.gold, width: 3 })
      .roundRect(5, 5, PANEL_W - 10, 74, 17)
      .fill({ color: Palette.panelLight, alpha: 0.94 });
    const title = new Text({ text: '✦  LEGEND CODEX  ✦', style: Type.h1() });
    title.anchor.set(0.5, 0);
    title.position.set(PANEL_W / 2, 16);
    this.countText = new Text({ text: '', style: Type.small() });
    this.countText.anchor.set(0.5, 0);
    this.countText.position.set(PANEL_W / 2, 50);
    this.sheet.addChild(bg, title, this.countText, this.grid);

    this.rarityButton = new Button('RARITY · ALL', this.game.sfx, {
      width: 190, height: 42, variant: 'secondary', onClick: () => {
        this.rarityIndex = (this.rarityIndex + 1) % RARITIES.length;
        this.page = 0;
        this.renderGrid();
      },
    });
    this.rarityButton.position.set(165, 99);
    this.franchiseButton = new Button('UNIVERSE · ALL', this.game.sfx, {
      width: 230, height: 42, variant: 'secondary', onClick: () => {
        this.franchiseIndex = (this.franchiseIndex + 1) % FRANCHISE_FILTERS.length;
        this.page = 0;
        this.renderGrid();
      },
    });
    this.franchiseButton.position.set(390, 99);
    const previous = new Button('◀  PREV', this.game.sfx, {
      width: 145, height: 44, variant: 'ghost', onClick: () => {
        this.page = Math.max(0, this.page - 1);
        this.renderGrid();
      },
    });
    previous.position.set(700, 605);
    const next = new Button('NEXT  ▶', this.game.sfx, {
      width: 145, height: 44, variant: 'ghost', onClick: () => {
        const pages = Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE));
        this.page = Math.min(pages - 1, this.page + 1);
        this.renderGrid();
      },
    });
    next.position.set(855, 605);
    const done = new Button('DONE', this.game.sfx, { width: 145, height: 44, onClick: () => this.close() });
    done.position.set(1060, 605);
    this.pageText = new Text({ text: '', style: Type.h3() });
    this.pageText.anchor.set(0.5);
    this.pageText.position.set(560, 605);
    this.sheet.addChild(this.rarityButton, this.franchiseButton, previous, next, done, this.pageText);
  }

  private filtered() {
    const rarity = RARITIES[this.rarityIndex]!;
    const franchise = FRANCHISE_FILTERS[this.franchiseIndex]!;
    return CHARACTERS.filter((character) =>
      (rarity === 'all' || character.rarity === rarity)
      && (franchise === 'all' || character.franchise === franchise));
  }

  private renderGrid(): void {
    this.grid.removeChildren().forEach((child) => child.destroy({ children: true }));
    const discovered = new Set(this.game.meta.discoveredLegendIds);
    const filtered = this.filtered();
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    this.page = Math.min(this.page, pages - 1);
    const visible = filtered.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE);
    const rarity = RARITIES[this.rarityIndex]!;
    const franchise = FRANCHISE_FILTERS[this.franchiseIndex]!;
    this.rarityButton.setLabel(`RARITY · ${rarity.toUpperCase()}`);
    this.franchiseButton.setLabel(`UNIVERSE · ${franchise === 'all' ? 'ALL' : FRANCHISES[franchise]!.name}`);
    this.pageText.text = `PAGE ${this.page + 1} / ${pages}`;
    this.countText.text = `${discovered.size} / ${CHARACTERS.length} legends discovered   ·   ${this.game.meta.discoveredRelicIds.length} / ${RELICS.length} relics   ·   ${this.game.meta.defeatedBossIds.length} / 3 guardians`;

    const scale = 0.58;
    visible.forEach((def, index) => {
      const col = index % 8;
      const row = Math.floor(index / 8);
      const card = new CharacterCard(def, { mode: 'roster', level: 1, showCost: true });
      card.scale.set(scale);
      card.position.set(94 + col * 142, 230 + row * 178);
      if (discovered.has(def.id)) {
        card.eventMode = 'static';
        card.cursor = 'pointer';
        card.on('pointerdown', () => this.openInfo(def.id));
      } else {
        const veil = new Graphics()
          .roundRect(0, 0, CARD_W, CARD_H, 10)
          .fill({ color: Palette.black, alpha: 0.88 })
          .stroke({ color: RarityColor[def.rarity], width: 3, alpha: 0.5 });
        const unknown = new Text({ text: '?', style: Type.banner(RarityColor[def.rarity]) });
        unknown.anchor.set(0.5);
        unknown.position.set(CARD_W / 2, CARD_H / 2 - 8);
        const hint = new Text({ text: 'UNDISCOVERED', style: Type.tiny() });
        hint.anchor.set(0.5);
        hint.position.set(CARD_W / 2, CARD_H - 22);
        card.addChild(veil, unknown, hint);
      }
      this.grid.addChild(card);
    });
  }

  private openInfo(id: string): void {
    const def = CHARACTERS.find((character) => character.id === id);
    if (!def) return;
    let modal: CharacterInfoModal;
    modal = new CharacterInfoModal(def, 1, this.game.sfx, () => {
      this.removeChild(modal);
      modal.destroy({ children: true });
    });
    this.addChild(modal);
  }

  private close(): void {
    this.game.sfx.click();
    this.onClose();
  }
}
