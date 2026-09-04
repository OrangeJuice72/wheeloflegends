import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRunState, isValidRunSave, loadMeta, loadRunState, saveMeta, saveRunState } from './Save';
import { RunState, type RunSave } from '../sim/run';
import { Game } from '../app/Game';

describe('recoverable run saves', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('does not erase a climb when the title screen autosaves with no active run', () => {
    const saved = new RunState(321).toSave();
    saveRunState(saved);
    const titleGame = Object.create(Game.prototype) as Game;
    titleGame.run = null;
    titleGame.saveRun();
    expect(loadRunState()).toEqual(saved);
  });

  it('returns to the menu without discarding the current run', () => {
    const game = Object.create(Game.prototype) as Game;
    game.run = new RunState(322);
    game.meta = loadMeta();
    const saved = game.run.toSave();
    expect(game.suspendRun()).toBe(true);
    expect(game.run).toBeNull();
    game.saveRun();
    expect(loadRunState()).toEqual(saved);
  });

  it('recovers the previous valid save after JSON corruption', () => {
    const run = new RunState(323);
    saveRunState(run.toSave());
    const earlier = run.toSave();
    run.gold += 100;
    saveRunState(run.toSave());
    values.set('wheel-of-legends.run', '{broken');
    expect(loadRunState()).toEqual(earlier);
  });

  it('rejects invalid fields without overwriting the valid save', () => {
    const valid = new RunState(324).toSave();
    saveRunState(valid);
    for (const corrupted of [{ ...valid, gold: NaN }, { ...valid, floor: -1 }, { ...valid, team: [99] }, { ...valid, relicIds: 42 }]) {
      expect(isValidRunSave(corrupted)).toBe(false);
      expect(saveRunState(corrupted)).toBe(false);
      expect(loadRunState()).toEqual(valid);
    }
  });

  it('removes both save copies when a run is abandoned', () => {
    saveRunState(new RunState(325).toSave());
    saveRunState(new RunState(325).toSave());
    clearRunState();
    expect(loadRunState<RunSave>()).toBeNull();
    expect(values.has('wheel-of-legends.run.backup')).toBe(false);
  });

  it('reports storage failure instead of claiming a successful save', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('quota'); } });
    expect(saveRunState(new RunState(326).toSave())).toBe(false);
  });

  it('preserves reduced-effects preferences and defaults older saves to full effects', () => {
    expect(loadMeta().reducedEffects).toBe(false);
    saveMeta({ ...loadMeta(), reducedEffects: true });
    expect(loadMeta().reducedEffects).toBe(true);
  });
});
