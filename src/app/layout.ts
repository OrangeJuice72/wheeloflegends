import { H, W } from '../ui/theme';

export interface FittedFrame {
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
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
