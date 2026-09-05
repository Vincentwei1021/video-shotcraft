import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "./types";
import { FONT_STACK, lerp, power2Out, power3Out, power4Out, tw } from "./shared";

// text-basic · 通用文字卡 —— 工作台原生卡：内容/字号/颜色/入场动画全部属性化
const FPS = 30;

interface Props {
  content?: string;
  fontSize?: number;
  color?: string;
  bg?: string;
  transparentBg?: boolean;
  fontWeight?: string;
  letterSpacing?: number;
  align?: string;
  anim?: string;
  delay?: number;
  animDur?: number;
}

const TextBasic: React.FC<Props> = ({
  content = "在这里输入文字",
  fontSize = 64,
  color = "#1d1d1f",
  bg = "#ffffff",
  transparentBg = false,
  fontWeight = "700",
  letterSpacing = 0,
  align = "center",
  anim = "fade-up",
  delay = 0.3,
  animDur = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;
  const lines = String(content).split("\n");

  let opacity = 1;
  let transform = "";
  let clipPath: string | undefined;
  if (anim === "fade-up") {
    const p = tw(t, delay, animDur, power3Out);
    opacity = p;
    transform = `translateY(${lerp(24, 0, p)}px)`;
  } else if (anim === "slam") {
    const p = tw(t, delay, animDur, power4Out);
    opacity = p;
    transform = `scale(${lerp(1.12, 1, p)})`;
  } else if (anim === "mask") {
    const p = tw(t, delay, animDur, power3Out);
    clipPath = `inset(0 ${lerp(100, 0, p)}% 0 0)`;
  } else if (anim === "typewriter") {
    const total = String(content).length || 1;
    const shown = Math.floor(tw(t, delay, animDur, (x) => x) * total);
    const remain = String(content).slice(0, shown);
    const tLines = remain.split("\n");
    return (
      <AbsoluteFill
        style={{
          background: transparentBg ? "transparent" : bg,
          display: "flex",
          alignItems: "center",
          justifyContent:
            align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
          padding: "0 72px",
          fontFamily: FONT_STACK,
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight: Number(fontWeight),
            color,
            letterSpacing,
            lineHeight: 1.3,
            textAlign: align as React.CSSProperties["textAlign"],
            whiteSpace: "pre-wrap",
          }}
        >
          {tLines.join("\n")}
        </div>
      </AbsoluteFill>
    );
  } else if (anim === "fade") {
    opacity = tw(t, delay, animDur, power2Out);
  }

  return (
    <AbsoluteFill
      style={{
        background: transparentBg ? "transparent" : bg,
        display: "flex",
        alignItems: "center",
        justifyContent:
          align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        padding: "0 72px",
        fontFamily: FONT_STACK,
      }}
    >
      <div
        style={{
          fontSize,
          fontWeight: Number(fontWeight),
          color,
          letterSpacing,
          lineHeight: 1.3,
          opacity,
          transform,
          clipPath,
          textAlign: align as React.CSSProperties["textAlign"],
          whiteSpace: "pre-wrap",
        }}
      >
        {lines.join("\n")}
      </div>
    </AbsoluteFill>
  );
};

export const textBasicCard: CardDef = {
  id: "text-basic",
  name: "通用文字",
  category: "工作台",
  durationInFrames: 120,
  accent: "#0a84ff",
  component: TextBasic as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "content", label: "文字内容", default: "在这里输入文字" },
    { type: "slider", key: "fontSize", label: "字号", default: 64, min: 16, max: 180, step: 1, unit: "px" },
    { type: "color", key: "color", label: "文字颜色", default: "#1d1d1f" },
    {
      type: "select", key: "fontWeight", label: "字重", default: "700",
      options: [
        { value: "400", label: "常规 400" },
        { value: "600", label: "半粗 600" },
        { value: "700", label: "加粗 700" },
        { value: "900", label: "特粗 900" },
      ],
    },
    { type: "slider", key: "letterSpacing", label: "字距", default: 0, min: -4, max: 24, step: 0.5, unit: "px" },
    {
      type: "select", key: "align", label: "对齐", default: "center",
      options: [
        { value: "left", label: "左对齐" },
        { value: "center", label: "居中" },
        { value: "right", label: "右对齐" },
      ],
    },
    {
      type: "select", key: "anim", label: "入场动画", default: "fade-up",
      options: [
        { value: "fade-up", label: "淡入上浮" },
        { value: "slam", label: "砸出" },
        { value: "mask", label: "遮罩揭示" },
        { value: "typewriter", label: "打字机" },
        { value: "fade", label: "纯淡入" },
        { value: "none", label: "无" },
      ],
    },
    { type: "slider", key: "delay", label: "入场延迟", default: 0.3, min: 0, max: 3, step: 0.05, unit: "s" },
    { type: "slider", key: "animDur", label: "动画时长", default: 0.4, min: 0.1, max: 2, step: 0.05, unit: "s" },
    { type: "color", key: "bg", label: "背景色", default: "#ffffff" },
    { type: "boolean", key: "transparentBg", label: "透明背景", default: false },
  ],
};
