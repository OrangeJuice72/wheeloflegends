import { Game } from './app/Game';
import { resolveVisibleViewport } from './app/layout';
import { MenuScene } from './ui/screens/MenuScene';
import { installCaptureButton } from './gg/overrides';

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

  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderStatus = document.getElementById('loader-status');

  const game = new Game();
  await game.init(host, (loaded, total) => {
    const pct = total > 0 ? Math.round((loaded / total) * 100) : 100;
    if (loaderBar) loaderBar.style.width = `${pct}%`;
    if (loaderStatus) loaderStatus.textContent = `LOADING ${pct}%`;
  });
  game.goto(new MenuScene(game));

  // Reveal the game and retire the pre-loader.
  if (loader) {
    loader.classList.add('loaded');
    setTimeout(() => loader.remove(), 550);
  }

  if (import.meta.env.DEV) {
    const w = window as unknown as Record<string, unknown>;
    w.__game = game;
    w.__data = { CHARACTERS: (await import('./data/characters')).CHARACTERS };
    // GameGenie: floating "Capture layout" button dumps the active scene's live
    // element tree to public/gg/<scene>.gg.json so you can edit it in GameGenie.
    installCaptureButton((() => (game as unknown as { scene?: unknown }).scene ?? null) as never);
  }
}

void boot().catch((error: unknown) => {
  console.error('Game startup failed', error);
  const loader = document.getElementById('loader');
  const status = document.getElementById('loader-status');
  if (loader) loader.classList.remove('loaded');
  if (status) status.textContent = 'Unable to start the game. Check your connection, then retry.';
  const retry = document.createElement('button');
  retry.textContent = 'RETRY';
  retry.style.cssText = 'padding:14px 36px;border:1px solid #79dcff;border-radius:12px;background:#142042;color:#fff;font:600 16px sans-serif;cursor:pointer';
  retry.addEventListener('click', () => window.location.reload());
  (loader ?? document.body).appendChild(retry);
});
