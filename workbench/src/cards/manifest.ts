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
  /** 版本号（可选）。给了就作为「这是不是同一版成片」的判据；不给则按清单内容哈希
   *  （时间表 / label / props / 单元→卡的分组拓扑 / 组件 displayName / 音效表），任一处变了都算新版本 */
  revision?: string;
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

export const UNIT_KINDS = ["shot", "transition", "caption", "overlay"] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];

export const unitsOf = (m: WorkbenchManifest, kind: UnitKind): ManifestUnit[] =>
  kind === "shot" ? m.shots : (m[`${kind}s`] ?? []);

/** 单元 → 卡 id 的分组：显式 cardId 优先；否则同一组件**引用**共用一张卡，卡 id 取该组首个单元的 id
 *  （`proj:<kind>:<cardId|首个 unit id>`）。projectCards 建卡与下面的内容哈希共用这一份，
 *  所以「某单元换了组件」这类只体现在引用关系上的变化（多数组件没有 displayName）也会改变哈希，
 *  旧存档里指向老卡的 clip 不会被继续沿用去渲错组件 */
export const groupUnits = (m: WorkbenchManifest): Map<ManifestUnit, string> => {
  const out = new Map<ManifestUnit, string>();
  for (const kind of UNIT_KINDS) {
    const groups = new Map<unknown, ManifestUnit[]>();
    for (const u of unitsOf(m, kind)) {
      const k = u.cardId ?? u.component;
      const g = groups.get(k);
      if (g) g.push(u);
      else groups.set(k, [u]);
    }
    // 一组一个 id。显式 cardId 与另一组「首个单元 id」撞名、或单元 id 重复时，后出现的组按顺序加
    // `~2`/`~3` 后缀（命名仍是清单的确定函数，哈希稳定），并在控制台提醒作者改 id
    const used = new Set<string>();
    for (const units of groups.values()) {
      const base = `proj:${kind}:${units[0].cardId ?? units[0].id}`;
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}~${n}`;
      if (id !== base)
        console.warn(`[workbench] 清单卡 id 撞名：${base} 已被另一组单元占用，本组改用 ${id}——建议给单元换 id 或写显式 cardId`);
      used.add(id);
      for (const u of units) out.set(u, id);
    }
  }
  return out;
};

/** FNV-1a 32 位，输出 8 位 hex——够用来判"内容变没变"，不做安全用途 */
const fnv1a = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

/** 清单可序列化部分的规范化串——凡是会被复制进 ClipData 或决定 clip 指向哪张卡的信息都在内：
 *  时间 / label / props / durationProp / 分组后的卡 id（见 groupUnits）/ 音频表。
 *  组件本身只取显式 displayName（.name 会被 HMR / 压缩改写，纳入会让同一版成片在 dev / build 间
 *  被误判为新版本、白白丢掉用户改动）；组件引用的变化靠卡 id 拓扑体现 */
const canonical = (m: WorkbenchManifest): string => {
  const cardOf = groupUnits(m);
  const unit = (u: ManifestUnit) =>
    [
      cardOf.get(u) ?? "", u.id, u.label ?? "", u.from, u.duration, u.durationProp ?? "",
      (u.component as { displayName?: string }).displayName ?? "", JSON.stringify(u.props ?? {}),
    ].join("|");
  const audio = (kind: string, a: ManifestAudio) => [kind, a.from, a.duration ?? "", a.src, a.volume, a.label ?? ""].join("|");
  return [
    m.name, m.fps, m.width, m.height, m.total, m.background ?? "", (m.order ?? []).join(","),
    ...UNIT_KINDS.flatMap((kind) => unitsOf(m, kind).map(unit)),
    ...(m.sfx ?? []).map((a) => audio("sfx", a)),
    ...(m.bgm ?? []).map((a) => audio("bgm", a)),
  ].join("\n");
};

/** 「哪一版成片」的稳定标识：存进 ProjectData.source，`?import=project` 用它判断存档是否过期 */
export const manifestKey = (m: WorkbenchManifest) =>
  `${m.name}@${m.total}f#${m.revision ?? fnv1a(canonical(m))}`;
