import { Game } from './app/Game';
import { resolveVisibleViewport } from './app/layout';
import { MenuScene } from './ui/screens/MenuScene';

function installMobileViewport(shell: HTMLElement): void {
  let scheduled = false;
  const sync = () => {
    scheduled = false;
    const visual = window.visualViewport;
    const viewport = resolveVisibleViewport(
      window.innerWidth,
      window.innerHeight,
      visual ? {
        width: visual.width,
        height: visual.height,
        offsetLeft: visual.offsetLeft,
        offsetTop: visual.offsetTop,
      } : null,
    );
    shell.style.width = `${viewport.width}px`;
    shell.style.height = `${viewport.height}px`;
    shell.style.transform = `translate3d(${viewport.left}px, ${viewport.top}px, 0)`;
  };
  const scheduleSync = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  };

  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('orientationchange', scheduleSync, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleSync, { passive: true });
  window.visualViewport?.addEventListener('scroll', scheduleSync, { passive: true });
  sync();
}

async function boot(): Promise<void> {
  const shell = document.getElementById('app');
  const host = document.getElementById('game');
  if (!shell || !host) throw new Error('#app shell or #game host element missing');
  installMobileViewport(shell);
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
