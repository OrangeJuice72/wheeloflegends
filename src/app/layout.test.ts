import { describe, expect, it } from 'vitest';
import { fitDesignSpace } from './layout';

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
