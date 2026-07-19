import { Game } from './app/Game';
import { MenuScene } from './ui/screens/MenuScene';

async function boot(): Promise<void> {
  const host = document.getElementById('game');
  if (!host) throw new Error('#game host element missing');
  const game = new Game();
  await game.init(host);
  game.goto(new MenuScene(game));
  if (import.meta.env.DEV) {
    const w = window as unknown as Record<string, unknown>;
    w.__game = game;
    w.__data = { CHARACTERS: (await import('./data/characters')).CHARACTERS };
  }
}

void boot();
