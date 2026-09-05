/** 工程数据模型：Project → Track → Clip。所有时间量以时间轴帧为单位（默认 30fps）。 */

export interface ClipData {
  id: string;
  cardId: string;
  /** 时间轴上的起点（帧） */
  start: number;
  /** 时间轴上占据的长度（帧）——可短于/长于卡片原始时长（裁剪/定格延长） */
  duration: number;
  /** 裁入点：从卡片素材的第几帧开始播（源帧），控制动效的进场时机 */
  inOffset: number;
  /** 变速倍率：每走 1 时间轴帧，源时间前进 speed 帧 */
  speed: number;
  /** 图层不透明度 0–1 */
  opacity: number;
  /** 图层整体缩放 */
  scale: number;
  /** 图层位移（px，合成坐标系） */
  x: number;
  y: number;
  /** 卡片专属属性覆盖（缺省值来自卡片 schema） */
  props: Record<string, unknown>;
  /** 时间轨上显示的自定义标签（缺省显示卡片名）——导入成片时的镜头/音效用它标注 */
  label?: string;
}

export interface TrackData {
  id: string;
  name: string;
  hidden?: boolean;
  clips: ClipData[];
}

export interface ProjectData {
  name: string;
  fps: number;
  width: number;
  height: number;
  /** 舞台底色（成片工程 AbsoluteFill 的 background；缺省近黑） */
  background?: string;
  /** 由哪个成片清单导入（清单 name + total）——`?import=project` 用它判断是否需要重新导入 */
  source?: string;
  tracks: TrackData[];
}

let seq = 0;
export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`;

/** 内容精确结束帧（最晚 clip 结束；导出成片用，不带余量） */
export const projectEndFrame = (project: ProjectData): number => {
  let end = 0;
  for (const t of project.tracks)
    for (const c of t.clips) end = Math.max(end, c.start + c.duration);
  return end;
};

/** 工程总时长（帧）：最晚 clip 结束 + 1s 余量，最短 5s（编辑预览用；按工程 fps 换算） */
export const projectDuration = (project: ProjectData): number =>
  Math.max(5 * project.fps, projectEndFrame(project) + project.fps);
