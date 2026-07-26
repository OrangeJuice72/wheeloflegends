/**
 * GameGenie Override Layer — the runtime bridge for games whose layout is
 * computed in code (not stored as data). Instead of GameGenie rendering the
 * scene, your game keeps doing its own layout, and then asks GameGenie for an
 * optional override per element:
 *
 *   const gg = await loadOverrides("/gamegenie.scene.json");
 *   // in your layout code, for each element you want to be adjustable:
 *   if (!gg.apply(this.playButton, "menu.newRun", { anchor: 0.5, size: true })) {
 *     ...your normal computed positioning...
 *   }
 *   // live-reload while editing in GameGenie (dev only):
 *   watchOverrides("/gamegenie.scene.json", gg, () => this.relayout());
 *
 * The override file is an ordinary GameGenie scene JSON. Each element you tag by
 * name (e.g. a hitbox named "menu.newRun") becomes an override: its x/y/size/
 * rotation in the 1280×720 design space is applied to your live game object.
 *
 * Self-contained — no imports. Works with any Pixi DisplayObject (or anything
 * exposing position/scale/rotation/width/height).
 */

export interface Transformable {
  position: { x: number; y: number; set(x: number, y: number): void };
  scale: { x: number; y: number; set(x: number, y: number): void };
  rotation: number;
  width: number;
  height: number;
}

interface GGNodeT {
  name: string;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  width?: number;
  height?: number;
  children?: GGNodeT[];
}
interface GGSceneT {
  meta?: { width?: number; height?: number };
  root?: GGNodeT;
}

export interface ApplyOptions {
  /** Anchor within the override box that the element's origin sits at (0..1). Use 0.5 for centered elements. */
  anchor?: number;
  anchorY?: number;
  /** Also drive the element's width/height from the override box. */
  size?: boolean;
}

interface Captured {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  anchor: number;
  anchorY: number;
}

export class GGOverrides {
  private byName = new Map<string, GGNodeT>();
  private captured = new Map<string, Captured>();

  constructor(data?: GGSceneT) {
    if (data) this.setData(data);
  }

  setData(data: GGSceneT) {
    this.byName.clear();
    const walk = (n: GGNodeT) => {
      if (n.name) this.byName.set(n.name, n);
      n.children?.forEach(walk);
    };
    data.root?.children?.forEach(walk);
  }

  has(key: string): boolean {
    return this.byName.has(key);
  }

  /**
   * Apply the override for `key` to `el`. Returns true if an override existed and
   * was applied (so your code can skip its own positioning), false otherwise.
   */
  apply(el: Transformable, key: string, opts: ApplyOptions = {}): boolean {
    const ax = opts.anchor ?? 0;
    const ay = opts.anchorY ?? opts.anchor ?? 0;
    // record the code-computed baseline once, for seeding GameGenie later
    if (!this.captured.has(key)) {
      this.captured.set(key, {
        x: el.position.x,
        y: el.position.y,
        width: safeNum(el.width),
        height: safeNum(el.height),
        rotation: el.rotation,
        anchor: ax,
        anchorY: ay,
      });
    }
    const o = this.byName.get(key);
    if (!o) return false;

    const w = o.width ?? safeNum(el.width);
    const h = o.height ?? safeNum(el.height);
    el.position.set((o.x ?? 0) + w * ax, (o.y ?? 0) + h * ay);
    if (o.rotation != null) el.rotation = o.rotation;
    if (opts.size) {
      if (o.width != null) el.width = o.width;
      if (o.height != null) el.height = o.height;
    } else if (o.scaleX != null || o.scaleY != null) {
      el.scale.set(o.scaleX ?? el.scale.x, o.scaleY ?? el.scale.y);
    }
    return true;
  }

  /** Build a GameGenie scene JSON seeded with the code-computed positions of every
   *  tagged element, so you can open it in GameGenie and tweak from the real layout. */
  toSceneJSON(opts: { name?: string; backdrop?: string; width?: number; height?: number } = {}): object {
    const children = [...this.captured.entries()].map(([name, c]) => ({
      id: "gg_" + name.replace(/[^a-z0-9]+/gi, "_"),
      type: "hitbox",
      name,
      // convert the recorded anchor-point back to a top-left box (GameGenie convention)
      x: Math.round(c.x - c.width * c.anchor),
      y: Math.round(c.y - c.height * c.anchorY),
      width: Math.round(c.width) || 100,
      height: Math.round(c.height) || 40,
      rotation: c.rotation || 0,
      shape: "rect",
      tag: "",
    }));
    return {
      version: 1,
      meta: {
        name: opts.name ?? "Scene",
        width: opts.width ?? 1280,
        height: opts.height ?? 720,
        background: "#12131f",
        backgroundAsset: opts.backdrop ?? null,
      },
      assets: {},
      root: { id: "root", type: "container", name: "Root", children },
    };
  }

  /** Dev helper: download the seed scene JSON to drop into your project (e.g. public/). */
  download(filename = "gamegenie.scene.json", opts?: Parameters<GGOverrides["toSceneJSON"]>[0]) {
    const blob = new Blob([JSON.stringify(this.toSceneJSON(opts), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Fetch a GameGenie override file. Missing/empty file is fine — returns a no-op set. */
export async function loadOverrides(url: string): Promise<GGOverrides> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (res.ok) return new GGOverrides(await res.json());
  } catch {
    /* file may not exist yet */
  }
  return new GGOverrides();
}

/** Poll the override file during development; on change, update data and re-run layout. */
export function watchOverrides(url: string, gg: GGOverrides, reapply: () => void, intervalMs = 700): () => void {
  let last = "";
  const timer = setInterval(async () => {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) return;
      const text = await res.text();
      if (text !== last) {
        last = text;
        gg.setData(JSON.parse(text));
        reapply();
      }
    } catch {
      /* ignore */
    }
  }, intervalMs);
  return () => clearInterval(timer);
}

function safeNum(n: number): number {
  return isFinite(n) ? n : 0;
}

/* ==================================================================== */
/* Scene capture — dump a live Pixi scene into a GameGenie layout file   */
/* ==================================================================== */

// Minimal structural view of the Pixi objects we read (avoids a hard dep).
interface PixiLike {
  label?: string | null;
  visible?: boolean;
  alpha?: number;
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  width: number;
  height: number;
  children?: PixiLike[];
  texture?: { label?: string; source?: { label?: string; resource?: { src?: string } } };
  anchor?: { x: number; y: number };
  text?: unknown;
  style?: Record<string, any>;
  getLocalBounds?: () => { x: number; y: number; width: number; height: number };
}

/** Derive a scene key from a Scene instance, e.g. MenuScene -> "menu". */
export function sceneKey(scene: object): string {
  const n = (scene as { constructor?: { name?: string } })?.constructor?.name ?? "scene";
  return (n.replace(/Scene$/, "") || n).replace(/^./, (c) => c.toLowerCase());
}

/** Canonical override-file URL for a scene: /gg/<key>.gg.json */
export function ggSceneUrl(scene: object): string {
  return `/gg/${sceneKey(scene)}.gg.json`;
}

/**
 * Walk a live Pixi container and produce a GameGenie scene JSON describing every
 * element (sprites, text, containers, and other display objects as boxes) in the
 * 1280×720 design space. Sprites reference their image by filename stem, which
 * matches how GameGenie keys folder assets.
 */
export function captureScene(
  container: PixiLike,
  opts: { name?: string; width?: number; height?: number } = {}
): object {
  let counter = 0;
  const capture = (child: PixiLike): any => {
    const id = "cap_" + (counter++).toString(36) + Math.random().toString(36).slice(2, 6);
    const name = (child.label && String(child.label)) || `${typeGuess(child)}_${counter}`;
    const base: any = {
      id,
      name,
      x: round(child.position.x),
      y: round(child.position.y),
      rotation: round(child.rotation || 0, 5),
      alpha: round(child.alpha ?? 1, 3),
      visible: child.visible ?? true,
    };

    if (isTextLike(child)) {
      const s = child.style ?? {};
      return {
        ...base,
        type: "text",
        text: String(child.text ?? ""),
        scaleX: 1,
        scaleY: 1,
        anchorX: child.anchor?.x ?? 0,
        anchorY: child.anchor?.y ?? 0,
        style: {
          fill: colorToHex(s.fill) ?? "#ffffff",
          fontSize: typeof s.fontSize === "number" ? s.fontSize : 36,
          fontFamily: typeof s.fontFamily === "string" ? s.fontFamily : "Arial",
          fontWeight: s.fontWeight ?? "normal",
          align: s.align ?? "left",
        },
      };
    }

    if (isSpriteLike(child)) {
      return {
        ...base,
        type: "sprite",
        asset: assetStem(child),
        scaleX: 1,
        scaleY: 1,
        width: round(Math.abs(child.width)),
        height: round(Math.abs(child.height)),
        anchorX: child.anchor?.x ?? 0,
        anchorY: child.anchor?.y ?? 0,
      };
    }

    if (child.children && child.children.length) {
      return {
        ...base,
        type: "container",
        scaleX: round(child.scale?.x ?? 1, 5),
        scaleY: round(child.scale?.y ?? 1, 5),
        children: child.children.map(capture),
      };
    }

    // leaf graphics / unknown -> a hitbox box from its local bounds
    const lb = child.getLocalBounds?.() ?? { x: 0, y: 0, width: child.width || 0, height: child.height || 0 };
    const sx = child.scale?.x ?? 1;
    const sy = child.scale?.y ?? 1;
    return {
      ...base,
      type: "hitbox",
      shape: "rect",
      x: round(child.position.x + lb.x * sx),
      y: round(child.position.y + lb.y * sy),
      width: round(Math.abs(lb.width * sx)),
      height: round(Math.abs(lb.height * sy)),
    };
  };

  const children = (container.children ?? []).map(capture);
  return {
    version: 1,
    meta: {
      name: opts.name ?? "Captured Scene",
      width: opts.width ?? 1280,
      height: opts.height ?? 720,
      background: "#12131f",
      backgroundAsset: null,
    },
    assets: {},
    root: { id: "root", type: "container", name: "Root", children },
  };
}

function typeGuess(c: PixiLike): string {
  if (isTextLike(c)) return "text";
  if (isSpriteLike(c)) return "sprite";
  if (c.children && c.children.length) return "group";
  return "element";
}
function isTextLike(c: PixiLike): boolean {
  return typeof c.text === "string";
}
function isSpriteLike(c: PixiLike): boolean {
  return !isTextLike(c) && c.texture !== undefined && c.anchor !== undefined;
}
function assetStem(c: PixiLike): string | null {
  const src =
    c.texture?.source?.label || c.texture?.label || c.texture?.source?.resource?.src || "";
  const m = /([^/\\]+)\.(png|jpe?g|webp|gif|svg|bmp|avif)(\?|$)/i.exec(src);
  return m ? m[1] ?? null : null;
}
function colorToHex(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number") return "#" + v.toString(16).padStart(6, "0");
  return null;
}
function round(v: number, dp = 2): number {
  const m = 10 ** dp;
  return Math.round((v || 0) * m) / m;
}

/**
 * Send a captured scene to the game's dev server (`POST /__gg/write`, provided by
 * the ggWriter Vite plugin) so it lands in `public/gg/<name>.gg.json`. Falls back
 * to a browser download if the endpoint isn't available.
 */
export async function saveCapture(name: string, scene: object): Promise<string> {
  const json = JSON.stringify(scene, null, 2);
  try {
    const res = await fetch("/__gg/write", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, json }),
    });
    if (res.ok) {
      const j = await res.json();
      return j.path ?? `public/gg/${name}.gg.json`;
    }
  } catch {
    /* dev writer not installed — fall back to download */
  }
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.gg.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return `downloaded ${name}.gg.json`;
}

/**
 * Install a small dev-only "Capture layout" button that dumps the current scene
 * to `public/gg/<key>.gg.json`. `getScene` returns the active scene container.
 */
export function installCaptureButton(getScene: () => PixiLike | null): () => void {
  const btn = document.createElement("button");
  btn.textContent = "⧉ Capture layout";
  Object.assign(btn.style, {
    position: "fixed",
    right: "12px",
    bottom: "12px",
    zIndex: "99999",
    padding: "8px 12px",
    background: "#5b8cff",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    font: "600 13px system-ui, sans-serif",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(0,0,0,.4)",
  });
  btn.onclick = async () => {
    const scene = getScene();
    if (!scene) {
      btn.textContent = "no active scene";
      return;
    }
    const key = sceneKey(scene as any);
    btn.textContent = "capturing…";
    try {
      const data = captureScene(scene, { name: key });
      const where = await saveCapture(key, data);
      btn.textContent = "✓ " + where;
    } catch (e) {
      btn.textContent = "capture failed";
      console.error(e);
    }
    setTimeout(() => (btn.textContent = "⧉ Capture layout"), 2500);
  };
  document.body.appendChild(btn);
  return () => btn.remove();
}
