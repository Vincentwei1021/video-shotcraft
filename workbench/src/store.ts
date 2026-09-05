import { create } from "zustand";
import type { ClipData, ProjectData, TrackData } from "./types";
import { uid } from "./types";
import { CARDS } from "./cards/registry";
import { clipDefaultsFor } from "./cards/types";
import { demoProject } from "./demoProject";
import { MANIFEST } from "./cards/projectCards";
import { manifestKey } from "./cards/manifest";
import { buildProjectFromManifest } from "./projectImport";

export { projectDuration } from "./types";

const STORAGE_KEY = "shotcraft-workbench-project-v1";

const loadSaved = (): ProjectData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as ProjectData;
      if (p && Array.isArray(p.tracks)) return p;
    }
  } catch {
    /* 损坏的存档直接回退 */
  }
  return null;
};

/** 初始工程：
 *  - URL 带 `?import=project`（scripts/open.mjs 交付后打开时加）且已链接成片：
 *    存档不是这一版成片（清单内容哈希不同，见 manifestKey）就按清单重新导入，
 *    旧存档压进撤销栈（⌘Z 可找回改动）；是这一版的保留用户改动
 *  - 否则读存档；没有存档时用演示工程 */
const loadInitial = (): { project: ProjectData; past: ProjectData[]; imported: boolean } => {
  const saved = loadSaved();
  const params = new URLSearchParams(window.location.search);
  if (params.get("import") === "project" && MANIFEST) {
    window.history.replaceState(null, "", window.location.pathname);
    if (saved?.source !== manifestKey(MANIFEST))
      return { project: buildProjectFromManifest(MANIFEST), past: saved ? [saved] : [], imported: true };
  }
  return { project: saved ?? demoProject(), past: [], imported: false };
};
const initial = loadInitial();

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export const findClip = (
  project: ProjectData,
  clipId: string,
): { track: TrackData; clip: ClipData } | null => {
  for (const track of project.tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) return { track, clip };
  }
  return null;
};

/** 素材库点击预览：卡片走 Player 实时预览，文件走原生 video/img/audio */
export type PreviewItem =
  | { kind: "card"; cardId: string }
  | { kind: "video" | "image" | "audio"; file: string; label: string }
  | null;

interface WorkbenchState {
  project: ProjectData;
  selectedClipId: string | null;
  playhead: number;
  playing: boolean;
  pxPerFrame: number;
  previewItem: PreviewItem;
  past: ProjectData[];
  future: ProjectData[];

  /** 一次编辑手势开始前调用：压入撤销快照 */
  commit: () => void;
  undo: () => void;
  redo: () => void;

  setProject: (p: ProjectData) => void;
  select: (id: string | null) => void;
  setPlayhead: (f: number) => void;
  setPlaying: (b: boolean) => void;
  setZoom: (pxPerFrame: number) => void;
  setPreview: (p: PreviewItem) => void;

  addTrack: () => void;
  removeTrack: (trackId: string) => void;
  toggleTrackHidden: (trackId: string) => void;
  /** 拖拽排序：把轨道移到插入位 toIndex（按原数组下标：0 = 最上层，tracks.length = 最下层） */
  moveTrack: (trackId: string, toIndex: number) => void;

  addClip: (
    cardId: string,
    trackId?: string,
    at?: number,
    extra?: { props?: Record<string, unknown>; label?: string; duration?: number },
  ) => void;
  updateClip: (clipId: string, patch: Partial<ClipData>) => void;
  updateClipProps: (clipId: string, propPatch: Record<string, unknown>) => void;
  removeClip: (clipId: string) => void;
  splitClip: (clipId: string, atFrame: number) => void;
  duplicateClip: (clipId: string) => void;
  moveClipToTrack: (clipId: string, trackId: string) => void;
}

const mutateProject = (
  project: ProjectData,
  fn: (draft: ProjectData) => void,
): ProjectData => {
  const draft = clone(project);
  fn(draft);
  return draft;
};

export const useStore = create<WorkbenchState>((set, get) => ({
  project: initial.project,
  selectedClipId: null,
  playhead: 0,
  playing: false,
  pxPerFrame: 2,
  previewItem: null,
  past: initial.past,
  future: [],

  commit: () =>
    set((s) => ({ past: [...s.past.slice(-49), clone(s.project)], future: [] })),

  undo: () =>
    set((s) => {
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return {
        project: prev,
        past: s.past.slice(0, -1),
        future: [clone(s.project), ...s.future.slice(0, 49)],
        selectedClipId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return s;
      const next = s.future[0];
      return {
        project: next,
        past: [...s.past.slice(-49), clone(s.project)],
        future: s.future.slice(1),
        selectedClipId: null,
      };
    }),

  setProject: (p) => {
    get().commit();
    set({ project: p, selectedClipId: null });
  },
  select: (id) => set({ selectedClipId: id }),
  setPlayhead: (f) => set({ playhead: Math.max(0, Math.round(f)) }),
  setPlaying: (b) => set({ playing: b }),
  setZoom: (pxPerFrame) =>
    set({ pxPerFrame: Math.min(10, Math.max(0.3, pxPerFrame)) }),
  setPreview: (p) => set({ previewItem: p }),

  addTrack: () => {
    get().commit();
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        d.tracks.unshift({ id: uid("track"), name: `轨道 ${d.tracks.length + 1}`, clips: [] });
      }),
    }));
  },

  removeTrack: (trackId) => {
    get().commit();
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        d.tracks = d.tracks.filter((t) => t.id !== trackId);
      }),
      selectedClipId: null,
    }));
  },

  toggleTrackHidden: (trackId) => {
    get().commit();
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const t = d.tracks.find((t) => t.id === trackId);
        if (t) t.hidden = !t.hidden;
      }),
    }));
  },

  moveTrack: (trackId, toIndex) => {
    const tracks = get().project.tracks;
    const from = tracks.findIndex((t) => t.id === trackId);
    const to = Math.max(0, Math.min(tracks.length, Math.round(toIndex)));
    // 插到自己前面或紧跟自己后面 = 原位，不记撤销
    if (from < 0 || to === from || to === from + 1) return;
    get().commit();
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const [t] = d.tracks.splice(from, 1);
        d.tracks.splice(to > from ? to - 1 : to, 0, t);
      }),
    }));
  },

  addClip: (cardId, trackId, at, extra) => {
    const card = CARDS[cardId];
    if (!card) return;
    get().commit();
    const newId = uid("clip");
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const track =
          d.tracks.find((t) => t.id === trackId) ?? d.tracks[d.tracks.length - 1];
        if (!track) return;
        // 卡片按自己的 sourceFps 编排（卡片库 30、成片单元 = 清单 fps）；工程 fps 不同时换算时长 +
        // 反向变速，播放速度不变；媒体卡（realtime）只换算时长、不变速。
        // 拖拽负载里的 duration（素材库给视频 / 音频的默认长度）与 durationInFrames 同口径，一并换算
        const { duration, speed } = clipDefaultsFor(card, d.fps, extra?.duration);
        track.clips.push({
          id: newId,
          cardId,
          start: Math.max(0, Math.round(at ?? s.playhead)),
          duration,
          inOffset: 0,
          speed,
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          props: extra?.props ?? {},
          label: extra?.label,
        });
      }),
      selectedClipId: newId,
    }));
  },

  updateClip: (clipId, patch) =>
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const hit = findClip(d, clipId);
        if (hit) Object.assign(hit.clip, patch);
      }),
    })),

  updateClipProps: (clipId, propPatch) =>
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const hit = findClip(d, clipId);
        if (hit) hit.clip.props = { ...hit.clip.props, ...propPatch };
      }),
    })),

  removeClip: (clipId) => {
    get().commit();
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        for (const t of d.tracks) t.clips = t.clips.filter((c) => c.id !== clipId);
      }),
      selectedClipId:
        s.selectedClipId === clipId ? null : s.selectedClipId,
    }));
  },

  splitClip: (clipId, atFrame) => {
    const hit = findClip(get().project, clipId);
    if (!hit) return;
    const { clip } = hit;
    const local = Math.round(atFrame - clip.start);
    if (local <= 0 || local >= clip.duration) return;
    get().commit();
    const rightId = uid("clip");
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const h = findClip(d, clipId);
        if (!h) return;
        const left = h.clip;
        const right: ClipData = {
          ...clone(left),
          id: rightId,
          start: left.start + local,
          duration: left.duration - local,
          inOffset: left.inOffset + local * left.speed,
        };
        left.duration = local;
        h.track.clips.push(right);
      }),
      selectedClipId: rightId,
    }));
  },

  duplicateClip: (clipId) => {
    const hit = findClip(get().project, clipId);
    if (!hit) return;
    get().commit();
    const newId = uid("clip");
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const h = findClip(d, clipId);
        if (!h) return;
        const copy: ClipData = {
          ...clone(h.clip),
          id: newId,
          start: h.clip.start + h.clip.duration,
        };
        h.track.clips.push(copy);
      }),
      selectedClipId: newId,
    }));
  },

  moveClipToTrack: (clipId, trackId) =>
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const hit = findClip(d, clipId);
        const target = d.tracks.find((t) => t.id === trackId);
        if (!hit || !target || hit.track.id === trackId) return;
        hit.track.clips = hit.track.clips.filter((c) => c.id !== clipId);
        target.clips.push(hit.clip);
      }),
    })),
}));

// —— 自动保存：每次改动 800ms 防抖落 localStorage；关页/切后台时立即落盘 ——
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const flushSave = () => {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(useStore.getState().project));
  } catch {
    /* 存储满/隐私模式：忽略 */
  }
};
useStore.subscribe((s, prev) => {
  if (s.project === prev.project) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 800);
});
window.addEventListener("beforeunload", flushSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushSave();
});
// 按清单重新导入的工程立即落盘：否则不改任何东西就刷新会退回旧存档
if (initial.imported) flushSave();

export const resetProject = () => {
  useStore.getState().setProject(demoProject());
};

/** 按已链接成片工程的清单重新导入（一步撤销） */
export const importProject = () => {
  if (!MANIFEST) return;
  useStore.getState().setProject(buildProjectFromManifest(MANIFEST));
};
