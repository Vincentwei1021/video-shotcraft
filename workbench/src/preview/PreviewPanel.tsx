import React, { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { MainComposition } from "./Composition";
import { playerRef, seekTo, togglePlay } from "../playerRef";
import { projectDuration, useStore } from "../store";
import type { PreviewItem } from "../store";
import { fmtFrames } from "../time";
import { CARDS } from "../cards/registry";
import { cardFps, cardSize, defaultsOf } from "../cards/types";

/** 素材库点击预览：占据画面区，循环播放；主工程 Player 保持挂载（display:none） */
const ItemPreview: React.FC<{ item: NonNullable<PreviewItem>; onClose: () => void }> = ({
  item,
  onClose,
}) => {
  let body: React.ReactNode = null;
  let title = "";
  if (item.kind === "card") {
    const card = CARDS[item.cardId];
    title = card?.name ?? item.cardId;
    if (card && card.kind !== "audio") {
      const { width, height } = cardSize(card);
      body = (
        <Player
          component={card.component}
          inputProps={defaultsOf(card)}
          durationInFrames={Math.max(2, card.durationInFrames)}
          compositionWidth={width}
          compositionHeight={height}
          fps={cardFps(card)}
          autoPlay
          loop
          controls={false}
          clickToPlay
          numberOfSharedAudioTags={32}
          style={{ width: "100%", height: "100%" }}
          acknowledgeRemotionLicense
        />
      );
    } else {
      body = <div className="preview-audio">🔊 音频卡</div>;
    }
  } else {
    title = item.label;
    if (item.kind === "video")
      body = <video className="preview-media" src={`/${item.file}`} controls autoPlay loop />;
    else if (item.kind === "image")
      body = <img className="preview-media" src={`/${item.file}`} />;
    else
      body = (
        <div className="preview-audio">
          🔊 {item.label}
          <audio src={`/${item.file}`} controls autoPlay />
        </div>
      );
  }
  return (
    <>
      <div className="preview-stage">{body}</div>
      <div className="transport">
        <span className="preview-tag">素材预览</span>
        <b>{title}</b>
        <span className="dim">拖拽素材到时间轨即可添加</span>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={onClose}>
          ✕ 返回工程
        </button>
      </div>
    </>
  );
};

/** 走带控制：唯一订阅 playhead 的预览端组件——播放中每帧只重渲染它，
 *  不能让 frameupdate 波及包含 <Player> 的父组件。 */
const Transport: React.FC<{
  duration: number;
  fps: number;
  loop: boolean;
  setLoop: (b: boolean) => void;
  sizeLabel: string;
}> = ({ duration, fps, loop, setLoop, sizeLabel }) => {
  const playhead = useStore((s) => s.playhead);
  const playing = useStore((s) => s.playing);
  const setPlayhead = useStore((s) => s.setPlayhead);
  const setPlaying = useStore((s) => s.setPlaying);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setPlayhead(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, [setPlayhead, setPlaying]);

  return (
    <div className="transport">
      <button className="btn" title="回到开头" onClick={() => seekTo(0)}>
        ⏮
      </button>
      <button className="btn btn-play" title="播放/暂停（空格）" onClick={togglePlay}>
        {playing ? "⏸" : "▶"}
      </button>
      <span className="timecode">
        {fmtFrames(playhead, fps)} <span className="dim">/ {fmtFrames(duration, fps)}</span>
      </span>
      <label className="loop-toggle">
        <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
        循环
      </label>
      <span className="dim" style={{ marginLeft: "auto" }}>
        {sizeLabel}
      </span>
    </div>
  );
};

export const PreviewPanel: React.FC = () => {
  const project = useStore((s) => s.project);
  const previewItem = useStore((s) => s.previewItem);
  const setPreview = useStore((s) => s.setPreview);
  const [loop, setLoop] = useState(true);

  const duration = projectDuration(project);
  const inputProps = useMemo(() => ({ project }), [project]);

  return (
    <div className="preview-panel">
      {previewItem && <ItemPreview item={previewItem} onClose={() => setPreview(null)} />}
      <div className="preview-stage" style={previewItem ? { display: "none" } : undefined}>
        <Player
          ref={playerRef}
          component={MainComposition}
          inputProps={inputProps}
          durationInFrames={duration}
          compositionWidth={project.width}
          compositionHeight={project.height}
          fps={project.fps}
          loop={loop}
          controls={false}
          clickToPlay
          numberOfSharedAudioTags={32}
          style={{ width: "100%", height: "100%" }}
          acknowledgeRemotionLicense
        />
      </div>
      {!previewItem && (
        <Transport
          duration={duration}
          fps={project.fps}
          loop={loop}
          setLoop={setLoop}
          sizeLabel={`${project.width}×${project.height} · ${project.fps}fps`}
        />
      )}
    </div>
  );
};
