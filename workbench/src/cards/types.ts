import type React from "react";

/** 属性面板控件描述——卡片用它声明自己有哪些可调属性 */
export type PropField =
  | { type: "text"; key: string; label: string; default: string }
  | { type: "textarea"; key: string; label: string; default: string }
  | {
      type: "number";
      key: string;
      label: string;
      default: number;
      min?: number;
      max?: number;
      step?: number;
      /** 展示单位，如 "s" / "px" */
      unit?: string;
    }
  | {
      type: "slider";
      key: string;
      label: string;
      default: number;
      min: number;
      max: number;
      step: number;
      unit?: string;
    }
  | { type: "color"; key: string; label: string; default: string }
  | {
      type: "select";
      key: string;
      label: string;
      default: string;
      options: { value: string; label: string }[];
    }
  | { type: "boolean"; key: string; label: string; default: boolean };

export interface CardDef {
  id: string;
  /** 中文名（面板展示） */
  name: string;
  category: string;
  /** "audio"/"video"：媒体卡——不包 TimeRemap（Freeze 会掐死原生播放），
   *  裁入/变速经 props 传入，由卡内 trimBefore/playbackRate 实现；
   *  video 保留图层包裹（透明度/缩放/位移），audio 无视觉 */
  kind?: "visual" | "audio" | "video";
  /** 卡片原始时长（帧，按 sourceFps 计）——新 clip 的默认时长 */
  durationInFrames: number;
  /** 卡片编排帧率：durationInFrames 与卡内时序都按它计。缺省 CARD_FPS（demo / 原生卡）；
   *  成片单元卡 = 成片清单的 fps */
  sourceFps?: number;
  /** 时间语义（缺省 "frames"）：
   *  - "frames"：组件按 sourceFps 逐帧编排，工程 fps 不同时换算 clip 时长并反向变速，播放速度不变
   *  - "realtime"：媒体（视频 / 音频 / 静态图）按墙钟走，durationInFrames 只是 30fps 口径下的默认长度，
   *    换算时长、不变速（inOffset / speed 直接是 trimBefore / playbackRate） */
  timing?: "frames" | "realtime";
  /** 卡片设计画布（缺省 1920×1080；素材库/Studio 预览按它建合成） */
  width?: number;
  height?: number;
  component: React.ComponentType<Record<string, unknown>>;
  schema: PropField[];
  /** 素材库色签 */
  accent?: string;
  /** 把 clip 的源时长（帧）注入到该 prop——成片组件用 `duration`/`dur` 算出场淡出时，
   *  clip 拉长/裁短后淡出跟着挪，而不是定格在原时长处 */
  durationProp?: string;
  /** 素材库预览视频（public/ 下路径；缺省用 Player 实时循环） */
  preview?: string;
  /** 一句话说明（素材库 tooltip） */
  summary?: string;
}

/** 卡片库（demo / 原生卡）统一按 30fps 编排：durationInFrames 与内部时序都以它为准。
 *  工程 fps 不同时，store.addClip 按 clipDefaultsFor 换算 clip 时长并反向变速，播放速度不变 */
export const CARD_FPS = 30;

/** 卡片编排帧率（缺省 CARD_FPS） */
export const cardFps = (card: CardDef) => card.sourceFps ?? CARD_FPS;

/** 卡片在工程 fps 下的源长度（帧）：realtime 卡把 30fps 口径的默认长度换成工程帧数；
 *  frames 卡的源帧就是它自己的帧（变速由 speed 表达） */
export const sourceLength = (card: CardDef, projectFps: number) =>
  card.timing === "realtime"
    ? Math.max(2, Math.round((card.durationInFrames * projectFps) / cardFps(card)))
    : card.durationInFrames;

/** clip.inOffset 的计量帧率：frames 卡的裁入点是**卡片源帧**（Freeze frame = inOffset + f×speed，
 *  时间轨左拖 / 分割也按 speed 换算成源帧），realtime 媒体卡的裁入点直接是 trimBefore（工程帧）。
 *  属性面板 / 时间轨徽标把它换成秒时必须除以这个帧率，否则卡片帧率≠工程帧率时显示与录入都会错 */
export const inOffsetFps = (card: CardDef | undefined, projectFps: number) =>
  !card || card.timing === "realtime" ? projectFps : cardFps(card);

/** 新 clip 的默认时长 / 变速：`sourceFrames`（缺省卡片原始时长）按卡片帧率计。
 *  frames 卡：时长 × (工程fps / 卡片fps)、speed = 卡片fps / 工程fps，卡内逐帧动画的墙钟节奏不变
 *  （注意 Freeze 不改 useVideoConfig().fps，卡内若用 spring({fps}) 等按秒计时，节奏仍会随工程 fps 偏移，
 *  属性面板会提示）；realtime 卡：时长换算、speed 恒为 1 */
export const clipDefaultsFor = (card: CardDef, projectFps: number, sourceFrames = card.durationInFrames) => {
  const scale = projectFps / cardFps(card);
  const realtime = card.timing === "realtime";
  return {
    duration: Math.max(2, Math.round(sourceFrames * scale)),
    speed: realtime || scale === 1 ? 1 : 1 / scale,
  };
};

export const defaultsOf = (card: CardDef): Record<string, unknown> =>
  Object.fromEntries(card.schema.map((f) => [f.key, f.default]));

export const cardSize = (card: CardDef) => ({
  width: card.width ?? 1920,
  height: card.height ?? 1080,
});
