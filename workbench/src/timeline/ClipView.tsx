import React from "react";
import type { ClipData } from "../types";
import { CARDS } from "../cards/registry";
import { useStore } from "../store";

const SNAP_PX = 6;

/** 吸附候选：其他 clip 的首尾 + 播放头（帧） */
const collectSnaps = (excludeClipId: string): number[] => {
  const s = useStore.getState();
  const out: number[] = [s.playhead, 0];
  for (const t of s.project.tracks)
    for (const c of t.clips) {
      if (c.id === excludeClipId) continue;
      out.push(c.start, c.start + c.duration);
    }
  return out;
};

export const ClipView: React.FC<{
  clip: ClipData;
  trackId: string;
  trackIdAt: (clientY: number) => string | null;
}> = ({ clip, trackId, trackIdAt }) => {
  const ppf = useStore((s) => s.pxPerFrame);
  const selected = useStore((s) => s.selectedClipId === clip.id);
  const select = useStore((s) => s.select);
  const commit = useStore((s) => s.commit);
  const updateClip = useStore((s) => s.updateClip);
  const moveClipToTrack = useStore((s) => s.moveClipToTrack);

  const card = CARDS[clip.cardId];

  const applySnap = (frame: number, dur: number): number => {
    const tol = SNAP_PX / ppf;
    for (const snap of collectSnaps(clip.id)) {
      if (Math.abs(frame - snap) < tol) return Math.round(snap);
      if (Math.abs(frame + dur - snap) < tol) return Math.round(snap - dur);
    }
    return frame;
  };

  const onBodyDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    select(clip.id);
    commit();
    const startX = e.clientX;
    const orig = { start: clip.start, duration: clip.duration };
    let curTrack = trackId;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      moved = true;
      const df = (ev.clientX - startX) / ppf;
      let ns = Math.max(0, Math.round(orig.start + df));
      ns = Math.max(0, applySnap(ns, orig.duration));
      updateClip(clip.id, { start: ns });
      const tid = trackIdAt(ev.clientY);
      if (tid && tid !== curTrack) {
        moveClipToTrack(clip.id, tid);
        curTrack = tid;
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      if (!moved) return;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const onTrimDown = (side: "left" | "right") => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    select(clip.id);
    commit();
    const startX = e.clientX;
    const orig = {
      start: clip.start,
      duration: clip.duration,
      inOffset: clip.inOffset,
      speed: clip.speed,
    };
    const onMove = (ev: PointerEvent) => {
      const df = Math.round((ev.clientX - startX) / ppf);
      if (side === "left") {
        let d = df;
        d = Math.max(d, -orig.start); // 不越过时间轴 0 点
        d = Math.max(d, Math.ceil(-orig.inOffset / orig.speed)); // 裁入点不为负
        d = Math.min(d, orig.duration - 2);
        updateClip(clip.id, {
          start: orig.start + d,
          duration: orig.duration - d,
          inOffset: Math.max(0, orig.inOffset + d * orig.speed),
        });
      } else {
        const d = Math.max(df, 2 - orig.duration);
        updateClip(clip.id, { duration: orig.duration + d });
      }
    };
    const onUp = () => window.removeEventListener("pointermove", onMove);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const accent = card?.accent ?? "#666";
  const durSec = (clip.duration / 30).toFixed(1);

  return (
    <div
      className={`clip${selected ? " selected" : ""}`}
      style={{
        left: clip.start * ppf,
        width: Math.max(8, clip.duration * ppf),
        borderLeftColor: accent,
      }}
      onPointerDown={onBodyDown}
    >
      <div className="clip-label">
        <span className="clip-name">{clip.label ?? card?.name ?? clip.cardId}</span>
        <span className="clip-meta">
          {durSec}s
          {clip.speed !== 1 && <em className="badge">{clip.speed}×</em>}
          {clip.inOffset > 0 && <em className="badge">✂{(clip.inOffset / 30).toFixed(1)}s</em>}
          {clip.opacity < 1 && <em className="badge">{Math.round(clip.opacity * 100)}%</em>}
        </span>
      </div>
      <div className="trim trim-l" onPointerDown={onTrimDown("left")} />
      <div className="trim trim-r" onPointerDown={onTrimDown("right")} />
    </div>
  );
};
