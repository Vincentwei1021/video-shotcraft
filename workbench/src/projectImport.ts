import type { ClipData, ProjectData, TrackData } from "./types";
import { uid } from "./types";
import type { ManifestAudio, WorkbenchManifest } from "./cards/manifest";
import { manifestKey } from "./cards/manifest";
import { MANIFEST, cardIdOfUnit, unitsOf } from "./cards/projectCards";

const baseClip = (): Omit<ClipData, "id" | "cardId" | "start" | "duration"> => ({
  inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props: {},
});

/** 音效使用次数（素材库「本片音效」列的 ×N） */
export const sfxUsage = (m: WorkbenchManifest | null): Map<string, number> => {
  const out = new Map<string, number>();
  for (const s of m?.sfx ?? []) out.set(s.src, (out.get(s.src) ?? 0) + 1);
  return out;
};

const shortName = (src: string) => src.split("/").pop()!.replace(/\.[^.]+$/, "");

/** 音频 cue → clip，贪心装箱进若干互不重叠的轨（同轨不重叠，便于单独挪动） */
const packAudio = (cues: ManifestAudio[], trackName: string, defaultDuration: number, total: number): TrackData[] => {
  const lanes: { end: number; clips: ClipData[] }[] = [];
  for (const c of [...cues].sort((a, b) => a.from - b.from)) {
    const start = Math.max(0, Math.round(c.from));
    // 原片里 <Sequence> 超出合成尾部的部分被合成时长截掉；导出按最晚 clip 结束算时长，所以这里也截到 total
    const duration = Math.max(2, Math.min(Math.round(c.duration ?? defaultDuration), total - start));
    let lane = lanes.find((l) => l.end <= start);
    if (!lane) {
      lane = { end: 0, clips: [] };
      lanes.push(lane);
    }
    lane.clips.push({
      ...baseClip(),
      id: uid("clip"),
      cardId: "audio-clip",
      start,
      duration,
      props: { file: c.src, volume: c.volume },
      label: c.label ?? shortName(c.src),
    });
    lane.end = start + duration;
  }
  return lanes.map((lane, i) => ({
    id: uid("track"),
    name: lanes.length > 1 ? `${trackName} ${i + 1}` : trackName,
    clips: lane.clips,
  }));
};

/** 把成片按清单拆成独立单元：字幕 / 转场 / 叠加层 / 镜头 / 音乐 / 音效。
 *  每个单元的 start/duration 与 Main.tsx 里的 <Sequence> 逐帧一致，导入后先不改任何东西
 *  渲出来就是原片。 */
export const buildProjectFromManifest = (m: WorkbenchManifest = MANIFEST!): ProjectData => {
  const unitTrack = (kind: "shot" | "transition" | "caption" | "overlay", name: string): TrackData | null => {
    const units = unitsOf(m, kind);
    if (!units.length) return null;
    return {
      id: uid("track"),
      name,
      clips: units.map((u) => ({
        ...baseClip(),
        id: uid("clip"),
        cardId: cardIdOfUnit(u),
        start: Math.max(0, Math.round(u.from)),
        duration: Math.max(2, Math.min(Math.round(u.duration), m.total - Math.max(0, Math.round(u.from)))),
        props: { ...(u.props ?? {}) },
        label: u.label ?? u.id,
      })),
    };
  };

  const order = m.order ?? ["transitions", "captions", "overlays"];
  const NAMES = { transitions: "转场", captions: "字幕", overlays: "叠加层" } as const;
  const upper = order
    .map((k) => unitTrack(k.slice(0, -1) as "transition" | "caption" | "overlay", NAMES[k]))
    .filter((t): t is TrackData => !!t);

  const tracks: TrackData[] = [
    // tracks[0] 为最上层，对应原片 z 序：转场 > 字幕 > 叠加层 > 镜头（缺省序，清单 order 可改）
    ...upper,
    unitTrack("shot", "镜头")!,
    ...(m.bgm?.length ? packAudio(m.bgm, "音乐", m.total, m.total) : []),
    ...(m.sfx?.length ? packAudio(m.sfx, "音效", 90, m.total) : []),
  ];

  return {
    name: m.name,
    fps: m.fps,
    width: m.width,
    height: m.height,
    background: m.background,
    source: manifestKey(m),
    tracks,
  };
};
