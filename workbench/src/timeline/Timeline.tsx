import React, { useRef, useState } from "react";
import { projectDuration, useStore } from "../store";
import { Ruler } from "./Ruler";
import { ClipView } from "./ClipView";
import { DRAG_MIME, readDragPayload } from "../dnd";

const HEADER_W = 140;

/** 播放头竖线：唯一订阅 playhead 的时间轨组件——播放中每帧只动它 */
const PlayheadLine: React.FC = () => {
  const playhead = useStore((s) => s.playhead);
  const ppf = useStore((s) => s.pxPerFrame);
  return (
    <div className="playhead" style={{ left: HEADER_W + playhead * ppf }}>
      <div className="playhead-cap" />
    </div>
  );
};

export const Timeline: React.FC = () => {
  const project = useStore((s) => s.project);
  const ppf = useStore((s) => s.pxPerFrame);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const setZoom = useStore((s) => s.setZoom);
  const select = useStore((s) => s.select);
  const addTrack = useStore((s) => s.addTrack);
  const removeTrack = useStore((s) => s.removeTrack);
  const toggleTrackHidden = useStore((s) => s.toggleTrackHidden);
  const moveTrack = useStore((s) => s.moveTrack);
  const splitClip = useStore((s) => s.splitClip);
  const duplicateClip = useStore((s) => s.duplicateClip);
  const removeClip = useStore((s) => s.removeClip);
  const addClip = useStore((s) => s.addClip);

  const duration = projectDuration(project);
  const contentW = Math.ceil(duration * ppf) + 240;
  const laneRefs = useRef(new Map<string, HTMLDivElement>());
  const scrollerRef = useRef<HTMLDivElement>(null);

  const trackIdAt = (clientY: number): string | null => {
    for (const [id, el] of laneRefs.current) {
      const r = el.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) return id;
    }
    return null;
  };

  const fit = () => {
    const w = scrollerRef.current?.clientWidth;
    if (w) setZoom((w - HEADER_W - 80) / duration);
  };

  // —— 轨道拖拽排序：按住轨道头上下拖，蓝线标出插入位，松手落位（一步撤销）——
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  /** 拖动中：被拖轨道 id + 目标插入位（原数组下标，0..tracks.length） */
  const [trackDrag, setTrackDrag] = useState<{ id: string; to: number } | null>(null);

  const onTrackHeadDown = (trackId: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return; // 👁 / ✕ 照常点击
    e.preventDefault();
    const startY = e.clientY;
    const from = useStore.getState().project.tracks.findIndex((t) => t.id === trackId);
    if (from < 0) return;
    let to = from;
    let dragging = false;
    const onMove = (ev: PointerEvent) => {
      if (!dragging) {
        if (Math.abs(ev.clientY - startY) < 4) return; // 抖动阈值：点一下不算拖
        dragging = true;
        setTrackDrag({ id: trackId, to });
      }
      // 插入位 = 中线在指针上方的轨道数
      let idx = 0;
      for (const t of useStore.getState().project.tracks) {
        const el = rowRefs.current.get(t.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (ev.clientY > r.top + r.height / 2) idx++;
      }
      // 指针贴近时间轨上下边时自动滚动，轨道多时能拖到看不见的位置
      const sc = scrollerRef.current;
      if (sc) {
        const r = sc.getBoundingClientRect();
        if (ev.clientY < r.top + 40) sc.scrollTop -= 10;
        else if (ev.clientY > r.bottom - 30) sc.scrollTop += 10;
      }
      if (idx !== to) {
        to = idx;
        setTrackDrag({ id: trackId, to: idx });
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      setTrackDrag(null);
      if (dragging) moveTrack(trackId, to); // 原位落下时 store 内部忽略
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  /** 插入线在 tl-content 内的 top；落回原位时不画 */
  const dropLineTop = (): number | null => {
    if (!trackDrag) return null;
    const tracks = project.tracks;
    const from = tracks.findIndex((t) => t.id === trackDrag.id);
    if (trackDrag.to === from || trackDrag.to === from + 1) return null;
    if (trackDrag.to < tracks.length) {
      const el = rowRefs.current.get(tracks[trackDrag.to].id);
      return el ? el.offsetTop : null;
    }
    const last = tracks.length ? rowRefs.current.get(tracks[tracks.length - 1].id) : null;
    return last ? last.offsetTop + last.offsetHeight : null;
  };
  const dropTop = dropLineTop();

  return (
    <div className={`timeline${trackDrag ? " track-dragging" : ""}`}>
      <div className="tl-toolbar">
        <button
          className="btn"
          disabled={!selectedClipId}
          title="在播放头处分割选中片段（S）"
          onClick={() =>
            selectedClipId && splitClip(selectedClipId, useStore.getState().playhead)
          }
        >
          ✂ 分割
        </button>
        <button
          className="btn"
          disabled={!selectedClipId}
          title="复制选中片段（⌘D）"
          onClick={() => selectedClipId && duplicateClip(selectedClipId)}
        >
          ⧉ 复制
        </button>
        <button
          className="btn"
          disabled={!selectedClipId}
          title="删除选中片段（Delete）"
          onClick={() => selectedClipId && removeClip(selectedClipId)}
        >
          🗑 删除
        </button>
        <span className="tl-sep" />
        <button className="btn" onClick={addTrack} title="新增一条轨道（加在最上层）">
          ＋ 轨道
        </button>
        <span style={{ marginLeft: "auto" }} />
        <button className="btn" onClick={fit} title="缩放到适配全部内容">
          ⤢ 适配
        </button>
        <span className="dim">缩放</span>
        <input
          type="range"
          min={0.3}
          max={8}
          step={0.1}
          value={ppf}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ width: 120 }}
        />
      </div>

      <div className="tl-scroller" ref={scrollerRef}>
        <div className="tl-content" style={{ width: contentW + HEADER_W }}>
          <div className="tl-ruler-row">
            <div className="tl-corner" style={{ width: HEADER_W }} />
            <Ruler durationFrames={duration} contentW={contentW} />
          </div>

          {project.tracks.map((track) => (
            <div
              className={`tl-row${trackDrag?.id === track.id ? " dragging" : ""}`}
              key={track.id}
              ref={(el) => {
                if (el) rowRefs.current.set(track.id, el);
                else rowRefs.current.delete(track.id);
              }}
            >
              <div
                className="tl-track-head"
                style={{ width: HEADER_W }}
                title="按住上下拖动调整轨道层序（上层盖住下层）"
                onPointerDown={onTrackHeadDown(track.id)}
              >
                <span className="track-grip" aria-hidden>
                  ⋮⋮
                </span>
                <span className="track-name" title={track.name}>
                  {track.name}
                </span>
                <span className="track-actions">
                  <button
                    className="mini"
                    title={track.hidden ? "显示轨道" : "隐藏轨道"}
                    onClick={() => toggleTrackHidden(track.id)}
                  >
                    {track.hidden ? "🚫" : "👁"}
                  </button>
                  <button
                    className="mini"
                    title="删除轨道"
                    onClick={() => {
                      if (
                        track.clips.length === 0 ||
                        window.confirm(`删除轨道「${track.name}」及其 ${track.clips.length} 个片段？`)
                      )
                        removeTrack(track.id);
                    }}
                  >
                    ✕
                  </button>
                </span>
              </div>
              <div
                className={`tl-lane${track.hidden ? " hidden-track" : ""}`}
                ref={(el) => {
                  if (el) laneRefs.current.set(track.id, el);
                  else laneRefs.current.delete(track.id);
                }}
                style={{ width: contentW }}
                onPointerDown={() => select(null)}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(DRAG_MIME)) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }
                }}
                onDrop={(e) => {
                  const payload = readDragPayload(e);
                  if (!payload) return;
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const frame = Math.max(0, Math.round((e.clientX - rect.left) / ppf));
                  addClip(payload.cardId, track.id, frame, {
                    props: payload.props,
                    label: payload.label,
                    duration: payload.duration,
                  });
                }}
              >
                {track.clips.map((clip) => (
                  <ClipView key={clip.id} clip={clip} trackId={track.id} trackIdAt={trackIdAt} />
                ))}
              </div>
            </div>
          ))}

          {dropTop !== null && <div className="track-drop-line" style={{ top: dropTop - 1 }} />}
          <PlayheadLine />
        </div>
      </div>
    </div>
  );
};
