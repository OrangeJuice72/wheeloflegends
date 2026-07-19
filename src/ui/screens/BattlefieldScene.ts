/** Pre-battle horizontal battlefield draw. */
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Scene } from '../../app/Scene';
import type { Game } from '../../app/Game';
import { getBattlefield, type BattlefieldDef } from '../../data/battlefields';
import { getFranchise } from '../../data/franchises';
import { Tweens, Easing } from '../../core/Tween';
import { Button } from '../components/Button';
import { battlefieldTexture, battlefieldTextureIds } from '../portraits';
import { H, Palette, Type, W } from '../theme';
import { BattleScene } from './BattleScene';

const TILE_W = 330;
const TILE_H = 190;
const GAP = 24;

export class BattlefieldScene extends Scene {
  private enterButton!: Button;

  constructor(game: Game) { super(game); }

  private get run() {
    const run = this.game.run;
    if (!run) throw new Error('BattlefieldScene requires an active run');
    return run;
  }

  onEnter(): void {
    const pool = battlefieldTextureIds().map(getBattlefield);
    const chosen = this.run.rng.pick(pool);
    this.run.battlefieldId = chosen.id;
    this.addChild(new Graphics().rect(0, 0, W, H).fill({ color: Palette.bg, alpha: 0.94 }));

    const title = new Text({ text: 'BATTLEFIELD CONVERGENCE', style: Type.h1() });
    title.anchor.set(0.5);
    title.position.set(W / 2, 62);
    const subtitle = new Text({ text: 'The arena will choose who answers with greater power.', style: Type.bodyDim() });
    subtitle.anchor.set(0.5);
    subtitle.position.set(W / 2, 100);
    this.addChild(title, subtitle);

    const viewport = new Container();
    const mask = new Graphics().roundRect(54, 150, W - 108, 260, 22).fill(Palette.white);
    viewport.mask = mask;
    this.addChild(mask, viewport);

    const rail = new Container();
    viewport.addChild(rail);
    // Filler tiles are pure theater — cosmetic randomness must never consume
    // the run's gameplay RNG stream (recruit/reward outcomes would shift).
    const PRE_TILES = 13;
    const POST_TILES = 3;
    const sequence: BattlefieldDef[] = [];
    for (let i = 0; i < PRE_TILES; i++) sequence.push(pool[Math.floor(Math.random() * pool.length)]!);
    const landingIndex = sequence.length;
    sequence.push(chosen);
    for (let i = 0; i < POST_TILES; i++) sequence.push(pool[Math.floor(Math.random() * pool.length)]!);
    /** Rail-local x of a tile's center — selector and landing derive from this. */
    const tileCenter = (index: number) => 54 + index * (TILE_W + GAP) + TILE_W / 2;
    sequence.forEach((field, index) => {
      const tile = this.buildTile(field);
      tile.position.set(tileCenter(index) - TILE_W / 2, 172);
      rail.addChild(tile);
    });

    const selector = new Graphics()
      .roundRect(W / 2 - TILE_W / 2 - 7, 165, TILE_W + 14, TILE_H + 14, 20)
      .stroke({ color: Palette.gold, width: 4 });
    this.addChild(selector);

    const resultName = new Text({ text: '', style: Type.h2() });
    resultName.anchor.set(0.5);
    resultName.position.set(W / 2, 458);
    const affinity = new Text({ text: '', style: Type.body() });
    affinity.anchor.set(0.5);
    affinity.position.set(W / 2, 493);
    this.addChild(resultName, affinity);

    this.enterButton = new Button('ENTER BATTLE', this.game.sfx, {
      width: 330,
      height: 62,
      onClick: () => this.game.goto(new BattleScene(this.game)),
    });
    this.enterButton.position.set(W / 2, H - 90);
    this.enterButton.setEnabled(false);
    this.addChild(this.enterButton);

    // Land the CHOSEN tile (mid-strip, with tiles continuing past it) exactly
    // on the selector: both use tileCenter(), so they cannot drift apart.
    Tweens.to(rail, { x: W / 2 - tileCenter(landingIndex) }, {
      duration: 2.45,
      ease: Easing.quartOut,
      onComplete: () => {
        this.game.sfx.reelStop();
        resultName.text = chosen.name.toUpperCase();
        resultName.style.fill = chosen.accent;
        const worlds = chosen.affinityFranchises.map((id) => getFranchise(id).name).join(' · ');
        affinity.text = `${chosen.tier.toUpperCase()} · +${Math.round(chosen.boost * 100)}% HP & ATTACK: ${worlds}`;
        affinity.style.fill = Palette.success;
        this.enterButton.setEnabled(true);
        selector.alpha = 0.7;
        Tweens.to(selector, { alpha: 1 }, { duration: 0.2, ease: Easing.quadOut });
      },
    });
  }

  private buildTile(field: BattlefieldDef): Container {
    const tile = new Container();
    const texture = battlefieldTexture(field.texture);
    if (texture) {
      const image = new Sprite(texture);
      image.anchor.set(0.5);
      image.position.set(TILE_W / 2, TILE_H / 2);
      image.scale.set(Math.max(TILE_W / texture.width, TILE_H / texture.height));
      const imageMask = new Graphics().roundRect(0, 0, TILE_W, TILE_H, 16).fill(Palette.white);
      image.mask = imageMask;
      tile.addChild(image, imageMask);
    }
    const shade = new Graphics()
      .roundRect(0, 0, TILE_W, TILE_H, 16).fill({ color: Palette.black, alpha: 0.18 })
      .roundRect(0, TILE_H - 54, TILE_W, 54, 16).fill({ color: Palette.black, alpha: 0.78 })
      .roundRect(0, 0, TILE_W, TILE_H, 16).stroke({ color: field.accent, width: 2 });
    const tier = new Text({ text: `${field.tier.toUpperCase()} · +${Math.round(field.boost * 100)}%`, style: Type.tiny() });
    tier.style.fill = field.accent;
    tier.anchor.set(0.5);
    tier.position.set(TILE_W / 2, TILE_H - 45);
    const name = new Text({ text: field.name.toUpperCase(), style: Type.h3() });
    name.anchor.set(0.5);
    name.position.set(TILE_W / 2, TILE_H - 22);
    tile.addChild(shade, tier, name);
    return tile;
  }
}
