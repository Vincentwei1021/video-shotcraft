import { createRef } from "react";
import type { PlayerRef } from "@remotion/player";

/** 全局共享的 Player 句柄：时间轴 seek / 快捷键播放控制都走这里 */
export const playerRef = createRef<PlayerRef>();

export const seekTo = (frame: number) => {
  playerRef.current?.seekTo(Math.max(0, Math.round(frame)));
};

export const togglePlay = () => {
  const p = playerRef.current;
  if (!p) return;
  if (p.isPlaying()) p.pause();
  else p.play();
};
