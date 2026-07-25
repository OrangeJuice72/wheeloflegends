/** Pre-run setup: choose a mode, a recruit style, and any challenge modifiers. */

import { Container, Graphics, Text } from 'pixi.js';
import type { Sfx } from '../../audio/Sfx';
import { MODIFIERS, type ModifierId } from '../../data/modifiers';
import type { GameMode } from '../../sim/run';
import { Button } from './Button';
import { H, mix, Palette, Type, W } from '../theme';

const PANEL_W = 680;
const PANEL_H = 574;
const MOD_ROW_H = 62;

export interface RunConfig {
  mode: GameMode;
  draft: boolean;
  modifiers: ModifierId[];
}

interface Segment<T> {
  label: string;
  value: T;
}

export class RunSetupModal extends Container {
  private readonly sheet = new Container();
  private mode: GameMode;
  private draft: boolean;
  private readonly selected: Set<ModifierId>;

  constructor(
    private readonly sfx: Sfx,
    initial: RunConfig,
    private readonly onStart: (config: RunConfig) => void,
    private readonly onClose: () => void,
  ) {
    super();
    this.mode = initial.mode;
    this.draft = initial.draft;
    this.selected = new Set(initial.modifiers);
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: Palette.black, alpha: 0.8 });
    dim.eventMode = 'static';
    dim.cursor = 'pointer';
    dim.on('pointerdown', () => this.cancel());
    this.sheet.position.set((W - PANEL_W) / 2, (H - PANEL_H) / 2);
    this.sheet.eventMode = 'static';
    this.addChild(dim, this.sheet);
    this.render();
  }

  private render(): void {
    this.sheet.removeChildren().forEach((child) => child.destroy({ children: true }));

    const bg = new Graphics()
      .roundRect(0, 0, PANEL_W, PANEL_H, 20)
      .fill({ color: Palette.panel, alpha: 0.99 })
      .stroke({ color: Palette.gold, width: 3 })
      .roundRect(5, 5, PANEL_W - 10, 66, 16)
      .fill({ color: Palette.panelLight, alpha: 0.9 });
    const title = new Text({ text: 'NEW RUN', style: Type.h1() });
    title.anchor.set(0.5, 0);
    title.position.set(PANEL_W / 2, 18);
    const subtitle = new Text({ text: 'Pick a mode, a recruit style, and any modifiers', style: Type.small() });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(PANEL_W / 2, 48);
    this.sheet.addChild(bg, title, subtitle);

    this.segmentRow<GameMode>(
      'MODE', 'Tower: endless climb   ·   Conquest: universe ladder', 84,
      [{ label: 'TOWER', value: 'tower' }, { label: 'CONQUEST', value: 'conquest' }],
      this.mode,
      (value) => { this.mode = value; this.render(); },
    );
    this.segmentRow<boolean>(
      'RECRUIT', 'Summon: random pulls   ·   Draft: choose 1 of 3', 156,
      [{ label: 'SUMMON', value: false }, { label: 'DRAFT', value: true }],
      this.draft,
      (value) => { this.draft = value; this.render(); },
    );

    const modsLabel = new Text({ text: 'MODIFIERS', style: Type.tiny() });
    modsLabel.style.fill = Palette.gold;
    modsLabel.position.set(30, 232);
    this.sheet.addChild(modsLabel);

    MODIFIERS.forEach((mod, index) => {
      const on = this.selected.has(mod.id);
      const y = 250 + index * MOD_ROW_H;
      const row = new Graphics()
        .roundRect(22, y, PANEL_W - 44, MOD_ROW_H - 10, 10)
        .fill({ color: on ? mix(Palette.gold, Palette.black, 0.82) : Palette.black, alpha: on ? 0.9 : 0.32 })
        .stroke({ color: on ? Palette.gold : Palette.border, width: on ? 2 : 1 });
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.on('pointerdown', () => this.toggle(mod.id));

      const icon = new Text({ text: mod.icon, style: { fontFamily: '"Segoe UI Emoji", sans-serif', fontSize: 24 } });
      icon.anchor.set(0.5);
      icon.position.set(50, y + (MOD_ROW_H - 10) / 2);
      const name = new Text({ text: mod.name.toUpperCase(), style: Type.h3() });
      name.style.fontSize = 15;
      name.style.fill = on ? Palette.gold : Palette.text;
      name.position.set(76, y + 8);
      const desc = new Text({ text: mod.short, style: Type.small() });
      desc.style.fontSize = 11;
      desc.style.fill = Palette.textDim;
      desc.position.set(76, y + 28);
      if (desc.width > PANEL_W - 200) desc.scale.set((PANEL_W - 200) / desc.width);

      const toggle = new Button(on ? 'ON' : 'OFF', this.sfx, {
        width: 80,
        height: 34,
        variant: on ? 'primary' : 'secondary',
        onClick: () => this.toggle(mod.id),
      });
      toggle.position.set(PANEL_W - 66, y + (MOD_ROW_H - 10) / 2);
      this.sheet.addChild(row, icon, name, desc, toggle);
    });

    const label = this.mode === 'conquest' ? 'BEGIN CONQUEST' : 'BEGIN CLIMB';
    const begin = new Button(label, this.sfx, {
      width: 320,
      height: 52,
      variant: 'primary',
      onClick: () => {
        this.sfx.click();
        this.onStart({ mode: this.mode, draft: this.draft, modifiers: [...this.selected] });
      },
    });
    begin.position.set(PANEL_W / 2 - 118, PANEL_H - 38);
    const cancel = new Button('CANCEL', this.sfx, {
      width: 150,
      height: 52,
      variant: 'secondary',
      onClick: () => this.cancel(),
    });
    cancel.position.set(PANEL_W / 2 + 160, PANEL_H - 38);
    this.sheet.addChild(begin, cancel);
  }

  private segmentRow<T>(label: string, description: string, y: number, segments: Segment<T>[], current: T, onPick: (value: T) => void): void {
    const row = new Graphics()
      .roundRect(22, y, PANEL_W - 44, 60, 12)
      .fill({ color: Palette.black, alpha: 0.34 })
      .stroke({ color: Palette.border, width: 1 });
    const heading = new Text({ text: label, style: Type.h3() });
    heading.position.set(38, y + 12);
    const detail = new Text({ text: description, style: Type.small() });
    detail.style.fontSize = 11;
    detail.position.set(38, y + 36);
    this.sheet.addChild(row, heading, detail);

    const gap = 8;
    const areaW = 260;
    const buttonW = (areaW - gap * (segments.length - 1)) / segments.length;
    segments.forEach((segment, index) => {
      const selected = segment.value === current;
      const button = new Button(segment.label, this.sfx, {
        width: buttonW,
        height: 40,
        variant: selected ? 'primary' : 'secondary',
        onClick: () => { this.sfx.hover(); onPick(segment.value); },
      });
      button.position.set(PANEL_W - 44 - areaW + buttonW / 2 + index * (buttonW + gap), y + 30);
      this.sheet.addChild(button);
    });
  }

  private toggle(id: ModifierId): void {
    this.sfx.hover();
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
    this.render();
  }

  private cancel(): void {
    this.sfx.click();
    this.onClose();
  }
}
