/**
 * Where a floor sends the player. Combat rooms go to Formation; event rooms
 * resolve on their own screen. Kept separate from the scenes themselves to
 * avoid an import cycle between RewardScene, EventScene, and TeamScene.
 */

import type { Game } from '../../app/Game';
import { ConquestMapScene } from './ConquestMapScene';
import { EventScene } from './EventScene';
import { TeamScene } from './TeamScene';

/** Send the player into the floor they are currently standing on. */
export function enterCurrentFloor(game: Game): void {
  const run = game.run;
  if (!run) return;
  if (run.isConquest()) {
    game.goto(new ConquestMapScene(game));
    return;
  }
  game.goto(run.isEventFloor() ? new EventScene(game) : new TeamScene(game));
}

/** Step to the next floor and route into it. */
export function advanceToNextFloor(game: Game): void {
  game.run?.advanceFloor();
  enterCurrentFloor(game);
}
