import React from "react";
import { AbsoluteFill } from "remotion";
import type { CardDef } from "./types";

// —— 预设背景：静态幕底，铺在最底轨。组件不依赖 useCurrentFrame，素材库缩略图可原样渲染 ——
// 色值取 Ink Press 模板（纸底 #f2eee6 / 墨黑）与 synapse 系深底 #0a0908。

const Solid: React.FC<{ color?: string }> = ({ color = "#f2eee6" }) => (
  <AbsoluteFill style={{ background: color }} />
);

const solidCard = (id: string, name: string, color: string, accent: string): CardDef => ({
  id,
  name,
  category: "背景",
  durationInFrames: 300,
  accent,
  component: Solid as React.ComponentType<Record<string, unknown>>,
  schema: [{ type: "color", key: "color", label: "底色", default: color }],
});

/** 暖纸底 + 中心亮斑（PaperTitleCard 同款 radial 提亮） */
const Paper: React.FC<{ color?: string; glow?: number }> = ({ color = "#f2eee6", glow = 0.85 }) => (
  <AbsoluteFill
    style={{
      background: color,
      backgroundImage: `radial-gradient(1100px 750px at 50% 42%, rgba(255,252,244,${glow}), transparent 65%)`,
    }}
  />
);

export const BG_CARDS: CardDef[] = [
  solidCard("bg-paper", "纸底 · 暖白", "#f2eee6", "#e6dfd0"),
  solidCard("bg-white", "纯白", "#ffffff", "#e8e8ea"),
  solidCard("bg-ink", "墨黑", "#0a0908", "#3a3a3f"),
  {
    id: "bg-paper-glow",
    name: "纸底 · 中心提亮",
    category: "背景",
    durationInFrames: 300,
    accent: "#e6dfd0",
    component: Paper as React.ComponentType<Record<string, unknown>>,
    schema: [
      { type: "color", key: "color", label: "底色", default: "#f2eee6" },
      { type: "slider", key: "glow", label: "亮斑强度", default: 0.85, min: 0, max: 1, step: 0.05 },
    ],
  },
];
