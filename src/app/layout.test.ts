import { describe, expect, it } from 'vitest';
import { fitDesignSpace, resolveVisibleViewport } from './layout';

describe('mobile landscape layout', () => {
  it.each([
    [667, 375],
    [812, 375],
    [844, 390],
    [740, 330],
  ])('contains the full stage inside %ix%i', (width, height) => {
    const frame = fitDesignSpace(width, height);
    expect(frame.x).toBeGreaterThanOrEqual(0);
    expect(frame.y).toBeGreaterThanOrEqual(0);
    expect(frame.x + frame.width).toBeLessThanOrEqual(width + 0.001);
    expect(frame.y + frame.height).toBeLessThanOrEqual(height + 0.001);
    expect(frame.scale).toBeGreaterThan(0);
  });

  it('letterboxes extra-wide phones instead of clipping the stage', () => {
    const frame = fitDesignSpace(844, 390);
    expect(frame.height).toBeCloseTo(390);
    expect(frame.x).toBeGreaterThan(0);
  });
});

describe('mobile browser viewport', () => {
  it('uses the visible viewport when mobile browser chrome reduces the page', () => {
    expect(resolveVisibleViewport(844, 430, {
      width: 844,
      height: 390,
      offsetLeft: 0,
      offsetTop: 20,
    })).toEqual({ width: 844, height: 390, left: 0, top: 20 });
  });

  it('falls back to the layout viewport on browsers without visualViewport', () => {
    expect(resolveVisibleViewport(667, 375)).toEqual({ width: 667, height: 375, left: 0, top: 0 });
  });

  it('never produces an unusable zero-sized game shell', () => {
    expect(resolveVisibleViewport(0, 0, { width: 0, height: 0, offsetLeft: -4, offsetTop: -8 }))
      .toEqual({ width: 1, height: 1, left: 0, top: 0 });
  });
});