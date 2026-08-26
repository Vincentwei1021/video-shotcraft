import { MATERIALS, type MatEl } from './materials.gen';
import { keyframes, type Key } from './motion';

// camera.ts — 页面坐标系相机。
// 相机状态 {cx, cy, z}：页面点 (cx,cy) 映射到屏幕盒中心，内容缩放 s0*z（s0=盒宽/页宽）。

export type CamState = { cx: number; cy: number; z: number };
export type CamKey = Key<CamState>;

export const cameraAt = (
  keys: CamKey[],
  frame: number,
  easing?: (v: number) => number,
): CamState => keyframes(keys, frame, easing);

/** 相机状态 → CSS transform（作用于以页面原始尺寸挂载的内容层） */
export const camTransform = (
  cam: CamState,
  stage: { w: number; h: number },
  pageW: number,
): { transform: string; scale: number } => {
  const s0 = stage.w / pageW;
  const s = s0 * cam.z;
  const tx = stage.w / 2 - cam.cx * s;
  const ty = stage.h / 2 - cam.cy * s;
  return { transform: `translate(${tx}px, ${ty}px) scale(${s})`, scale: s };
};

/** 视野约束：给定 z，把 (cx,cy) 夹到不露黑边的范围 */
export const clampCam = (
  cam: CamState,
  stage: { w: number; h: number },
  pageW: number,
  pageH: number,
): CamState => {
  const s = (stage.w / pageW) * cam.z;
  const halfW = stage.w / 2 / s;
  const halfH = stage.h / 2 / s;
  return {
    z: cam.z,
    cx: Math.min(Math.max(cam.cx, halfW), Math.max(pageW - halfW, halfW)),
    cy: Math.min(Math.max(cam.cy, halfH), Math.max(pageH - halfH, halfH)),
  };
};

// ---- 元素定位（供光标/相机瞄准）----

export type Aim = { x: number; y: number; w: number; h: number; cx: number; cy: number };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** 在素材元数据里找元素：按文本包含匹配（可加 tag 约束/序号） */
export const findEl = (
  slot: string,
  textMatch: string,
  opts: { tag?: string; nth?: number } = {},
): Aim => {
  const meta = MATERIALS[slot];
  if (!meta) throw new Error(`findEl: unknown slot ${slot}`);
  const needle = norm(textMatch);
  const hits = meta.els.filter((e: MatEl) => {
    if (opts.tag && e.tag !== opts.tag) return false;
    return norm(e.text).includes(needle);
  });
  // 文本最短者最贴近真实控件
  hits.sort((a: MatEl, b: MatEl) => a.text.length - b.text.length);
  const el = hits[opts.nth ?? 0];
  if (!el) throw new Error(`findEl: no match "${textMatch}" in ${slot}`);
  return { x: el.x, y: el.y, w: el.w, h: el.h, cx: el.x + el.w / 2, cy: el.y + el.h / 2 };
};

/** 直接给页面坐标 */
export const at = (cx: number, cy: number): Aim => ({ x: cx, y: cy, w: 0, h: 0, cx, cy });
