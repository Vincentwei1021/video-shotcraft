import type React from "react";
import type { PropField } from "./types";

/** 成片工程接入清单——工程在 `src/workbench.ts` 里 `export const WORKBENCH: WorkbenchManifest`，
 *  工作台据此把成片拆成多轨 clip（镜头 / 转场 / 字幕 / 叠加层 / 音效 / 音乐）。
 *  结构是纯数据 + 组件引用，工程文件不需要 import 本文件（结构兼容即可）。
 *  时间量一律用**绝对帧**，与 Main.tsx 里 <Sequence from durationInFrames> 一一对应。 */

export type ManifestUnit = {
  /** 唯一 id（镜头 id / 转场序号…），导入后作为 clip 标签的一部分 */
  id: string;
  /** 时间轨上显示名（缺省 id） */
  label?: string;
  /** 绝对起帧 */
  from: number;
  /** 帧数 */
  duration: number;
  component: React.ComponentType<Record<string, unknown>>;
  /** 成片里实际传入的 props（= 该 clip 的属性初值） */
  props?: Record<string, unknown>;
  /** 可编辑属性；缺省为空 = 该单元只能动时间/变速/图层 */
  schema?: PropField[];
  /** 注入 clip 源时长的 prop 名（如 "duration" / "dur"），见 CardDef.durationProp */
  durationProp?: string;
  /** 共用同一张卡的单元写同一个 cardId（如四张字卡都是 PaperTitleCard）；缺省按 component 引用分组 */
  cardId?: string;
  /** 卡名（素材库展示，同 cardId 的单元取第一个非空值） */
  cardName?: string;
  accent?: string;
};

export type ManifestAudio = {
  from: number;
  /** 帧数；缺省 90（与 Main.tsx 里 SFX Sequence 默认长度对齐） */
  duration?: number;
  /** public/ 下的路径，如 "audio/whoosh-big.mp3" */
  src: string;
  volume: number;
  label?: string;
};

export type WorkbenchManifest = {
  name: string;
  fps: number;
  width: number;
  height: number;
  /** 成片总帧数 */
  total: number;
  /** 舞台底色（Main 最外层 AbsoluteFill 的 background） */
  background?: string;
  shots: ManifestUnit[];
  /** 转场层（闪白 / 光条…） */
  transitions?: ManifestUnit[];
  /** 字幕 / 解说条 */
  captions?: ManifestUnit[];
  /** 全片常驻叠加层（网格 / 暗角 / 水印…） */
  overlays?: ManifestUnit[];
  sfx?: ManifestAudio[];
  bgm?: ManifestAudio[];
  /** 叠加各层的 z 序（从上到下）；缺省 transitions > captions > overlays，与 Ink Press 模板一致 */
  order?: ("transitions" | "captions" | "overlays")[];
  /** 原成片合成（整条 Main）——Studio 里注册为 ProjOriginal，供逐帧对照导入结果 */
  original?: React.ComponentType<Record<string, unknown>>;
};

export const manifestKey = (m: WorkbenchManifest) => `${m.name}@${m.total}f`;
