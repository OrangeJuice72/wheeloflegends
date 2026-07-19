import { H, W } from '../ui/theme';

export interface FittedFrame {
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisibleViewport {
  width: number;
  height: number;
  left: number;
  top: number;
}

export interface VisualViewportLike {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}

/**
 * Prefer the browser's actually visible viewport over the layout viewport.
 * Mobile browser chrome can shrink or offset this area without immediately
 * changing `innerHeight`, especially while rotating or hiding the address bar.
 */
export function resolveVisibleViewport(
  innerWidth: number,
  innerHeight: number,
  visualViewport?: VisualViewportLike | null,
): VisibleViewport {
  return {
    width: Math.max(1, visualViewport?.width ?? innerWidth),
    height: Math.max(1, visualViewport?.height ?? innerHeight),
    left: Math.max(0, visualViewport?.offsetLeft ?? 0),
    top: Math.max(0, visualViewport?.offsetTop ?? 0),
  };
}

/** Fit the fixed 16:9 design space wholly inside an available viewport. */
export function fitDesignSpace(viewWidth: number, viewHeight: number): FittedFrame {
  const safeWidth = Math.max(1, viewWidth);
  const safeHeight = Math.max(1, viewHeight);
  const scale = Math.min(safeWidth / W, safeHeight / H);
  const width = W * scale;
  const height = H * scale;
  return {
    scale,
    x: (safeWidth - width) / 2,
    y: (safeHeight - height) / 2,
    width,
    height,
  };
}
