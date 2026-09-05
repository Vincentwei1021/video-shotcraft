import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";

// 暖白闪转场 —— 参数化版（源出 template/src/aifl/FlashCut.tsx）
// 跨骑硬切两侧各 5f 的暖白 bloom：峰值在 40% 处（FIXED）；开放峰值不透明度与暖色。

interface Props {
  peak?: number;
  color?: string;
  duration?: number;
}

const FlashCut: React.FC<Props> = ({ peak = 0.85, color = "#fff8eb", duration = 10 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, duration * 0.4, duration], [0, peak, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity: o,
        background: `radial-gradient(ellipse at 50% 45%, ${color}, ${color}8c 55%, transparent 80%)`,
      }}
    />
  );
};

export const flashCutCard: CardDef = {
  id: "inkpress-flash-cut",
  name: "暖白闪转场",
  category: "工作台",
  durationInFrames: 10,
  accent: "#f7c948",
  durationProp: "duration",
  component: FlashCut as React.ComponentType<Record<string, unknown>>,
  summary: "放在硬切点前 5 帧、跨骑两侧各 5 帧；只盖接缝，不当装饰光效",
  schema: [
    { type: "slider", key: "peak", label: "峰值不透明度", default: 0.85, min: 0.2, max: 1, step: 0.05 },
    { type: "color", key: "color", label: "暖白色", default: "#fff8eb" },
  ],
};
