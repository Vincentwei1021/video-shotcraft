import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";

// 解说字幕条 · Ink Press —— 参数化版（源出 template/src/aifl/Caption.tsx）
// 屏幕空间等宽小字 + 琥珀方点，8f 上浮入场、尾 8f 淡出（FIXED）。开放文案 / 底距 / 字号 / 颜色。

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

interface Props {
  text?: string;
  bottom?: number;
  fontSize?: number;
  color?: string;
  accent?: string;
  uppercase?: boolean;
  duration?: number;
}

const CaptionStrip: React.FC<Props> = ({
  text = "SEARCH · FILTER · OPEN",
  bottom = 72,
  fontSize = 22,
  color = "#615c54",
  accent = "#b5651d",
  uppercase = true,
  duration = 60,
}) => {
  const frame = useCurrentFrame();
  const inT = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outT = interpolate(frame, [duration - 8, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom,
          display: "flex",
          justifyContent: "center",
          alignItems: "baseline",
          gap: 14,
          fontFamily: MONO,
          fontSize,
          letterSpacing: "0.14em",
          textTransform: uppercase ? "uppercase" : "none",
          color,
          opacity: inT * outT,
          transform: `translateY(${(1 - inT) * 8}px)`,
        }}
      >
        <span style={{ width: 6, height: 6, background: accent, display: "inline-block" }} />
        <span>{text}</span>
      </div>
    </AbsoluteFill>
  );
};

export const captionStripCard: CardDef = {
  id: "inkpress-caption",
  name: "解说字幕条",
  category: "工作台",
  durationInFrames: 60,
  accent: "#34c759",
  durationProp: "duration",
  component: CaptionStrip as React.ComponentType<Record<string, unknown>>,
  summary: "底部通栏等宽解说条，琥珀方点引导；透明底，叠在任何镜头上",
  schema: [
    { type: "text", key: "text", label: "文案", default: "SEARCH · FILTER · OPEN" },
    { type: "slider", key: "bottom", label: "底距", default: 72, min: 20, max: 400, step: 2, unit: "px" },
    { type: "slider", key: "fontSize", label: "字号", default: 22, min: 14, max: 48, step: 1, unit: "px" },
    { type: "color", key: "color", label: "文字色", default: "#615c54" },
    { type: "color", key: "accent", label: "方点色", default: "#b5651d" },
    { type: "boolean", key: "uppercase", label: "全大写", default: true },
  ],
};
