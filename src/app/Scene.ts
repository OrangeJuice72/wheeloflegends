import { Container } from 'pixi.js';
import type { Game } from './Game';

/** A full-screen game state laid out in 1280×720 design space. */
export abstract class Scene extends Container {
  constructor(readonly game: Game) {
    super();
  }

  /** Called after the scene is added to the stage and faded in. */
  abstract onEnter(): void;

  /** Called before destruction. Cancel anything that outlives the scene here. */
  onExit(): void {}

  /** dt in seconds, real time. */
  update(_dt: number): void {}

  /** Called whenever the visible design-space viewport changes size. */
  onResize(_viewportW: number, _viewportH: number): void {}
}
