import { type Aim } from './camera';
import { type CamKey, type CamState } from './camera';
import { type CursorKey } from './Cursor';
import { type Cut } from './ScreenStage';
import { type DriveFn } from './HtmlSnap';

// choreo.ts — 镜头编排：把"光标移动→点击→切状态→相机推近"写成声明式脚本。
// 帧号均为场景本地帧。产出直接喂给 ScreenStage。

export class Shot {
  cuts: Cut[] = [];
  camKeys: CamKey[] = [];
  curKeys: CursorKey[] = [];
  clicks: number[] = [];
  private lastCur: { x: number; y: number } | null = null;

  constructor(slot: string, cam0: CamState, opts: { patchCss?: string; drive?: DriveFn } = {}) {
    this.cuts.push({ from: 0, slot, patchCss: opts.patchCss, drive: opts.drive });
    this.camKeys.push({ f: 0, ...cam0 });
  }

  /** 硬切到新素材状态 */
  cut(f: number, slot: string, opts: { patchCss?: string; drive?: DriveFn } = {}) {
    this.cuts.push({ from: f, slot, patchCss: opts.patchCss, drive: opts.drive });
    return this;
  }

  /** 相机关键帧（到 f 帧时到达该状态） */
  cam(f: number, state: CamState) {
    this.camKeys.push({ f, ...state });
    return this;
  }

  /** 相机：f 帧时保持当前值（打段落桩，避免被后续 key 提前拉动） */
  camHold(f: number) {
    const last = this.camKeys[this.camKeys.length - 1];
    this.camKeys.push({ f, cx: last.cx, cy: last.cy, z: last.z });
    return this;
  }

  /** 光标路径点：f 帧到达 aim（可加偏移） */
  cur(f: number, aim: Aim | { cx: number; cy: number }, dx = 0, dy = 0) {
    const x = aim.cx + dx;
    const y = aim.cy + dy;
    this.curKeys.push({ f, x, y });
    this.lastCur = { x, y };
    return this;
  }

  /** 光标：f 帧保持原地（停顿桩） */
  curHold(f: number) {
    if (this.lastCur) this.curKeys.push({ f, ...this.lastCur });
    return this;
  }

  /** 在当前光标位置点击；可选延迟 cutDelay 帧后切素材（模拟响应） */
  click(f: number, opts: { cut?: string; cutDelay?: number; patchCss?: string; drive?: DriveFn } = {}) {
    this.clicks.push(f);
    this.curHold(f);
    if (opts.cut) this.cut(f + (opts.cutDelay ?? 5), opts.cut, { patchCss: opts.patchCss, drive: opts.drive });
    return this;
  }
}

/** 常用相机位：整页首屏 overview（1920 宽页面在任意 stage 下都成立） */
export const OVERVIEW: CamState = { cx: 960, cy: 512, z: 1.0 };
export const overviewAt = (z: number): CamState => ({ cx: 960, cy: 512, z });
