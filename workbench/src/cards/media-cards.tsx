import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, staticFile } from "remotion";
import type { CardDef } from "./types";

// —— 媒体卡：视频 / 图片 / 音频文件直接上轨（成片工程 public/ 与仓库音效库都走它们）——
// 视频/音频卡 kind:"video"/"audio"：裁入=trimBefore、变速=playbackRate（不能包 Freeze，会掐死原生播放）

const VideoClip: React.FC<{
  file?: string;
  fit?: string;
  muted?: boolean;
  volume?: number;
  inOffset?: number;
  speed?: number;
}> = ({ file = "", fit = "contain", muted = false, volume = 1, inOffset = 0, speed = 1 }) => {
  if (!file) return null;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo
        src={staticFile(file)}
        trimBefore={Math.round(inOffset)}
        playbackRate={speed}
        muted={muted}
        volume={volume}
        style={{ width: "100%", height: "100%", objectFit: fit as React.CSSProperties["objectFit"] }}
      />
    </AbsoluteFill>
  );
};

export const videoClipCard: CardDef = {
  id: "video-clip",
  name: "Видео",
  category: "素材",
  kind: "video",
  timing: "realtime",
  durationInFrames: 150,
  accent: "#30d158",
  component: VideoClip as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "file", label: "Файл (в public/)", default: "" },
    {
      type: "select", key: "fit", label: "Заполнение", default: "contain",
      options: [
        { value: "contain", label: "Показать целиком" },
        { value: "cover", label: "Заполнить с обрезкой" },
      ],
    },
    { type: "boolean", key: "muted", label: "Без звука", default: false },
    { type: "slider", key: "volume", label: "Громкость", default: 1, min: 0, max: 1, step: 0.01 },
  ],
};

const ImageClip: React.FC<{ file?: string; fit?: string }> = ({ file = "", fit = "contain" }) => {
  if (!file) return null;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Img
        src={staticFile(file)}
        style={{ width: "100%", height: "100%", objectFit: fit as React.CSSProperties["objectFit"] }}
      />
    </AbsoluteFill>
  );
};

export const imageClipCard: CardDef = {
  id: "image-clip",
  name: "Изображение",
  category: "素材",
  timing: "realtime",
  durationInFrames: 90,
  accent: "#64d2ff",
  component: ImageClip as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "file", label: "Файл (в public/)", default: "" },
    {
      type: "select", key: "fit", label: "Заполнение", default: "contain",
      options: [
        { value: "contain", label: "Показать целиком" },
        { value: "cover", label: "Заполнить с обрезкой" },
      ],
    },
  ],
};

/** 音频卡（BGM / 音效通用）：裁入=trimBefore、变速=playbackRate，裁剪变速不哑音 */
const AudioClip: React.FC<{ file?: string; volume?: number; inOffset?: number; speed?: number }> =
  ({ file = "", volume = 1, inOffset = 0, speed = 1 }) => {
    if (!file) return null;
    return (
      <Audio
        src={staticFile(file)}
        volume={volume}
        trimBefore={Math.round(inOffset)}
        playbackRate={speed}
      />
    );
  };

export const audioClipCard: CardDef = {
  id: "audio-clip",
  name: "Аудио",
  category: "音频",
  kind: "audio",
  timing: "realtime",
  durationInFrames: 90,
  accent: "#ff9f0a",
  component: AudioClip as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "file", label: "Файл (в public/)", default: "" },
    { type: "slider", key: "volume", label: "Громкость", default: 1, min: 0, max: 1, step: 0.01 },
  ],
};
