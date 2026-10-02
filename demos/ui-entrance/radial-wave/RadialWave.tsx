// radial-wave — Grid Radial Wave 点阵涟漪（motion-lab 定稿转原生 Remotion）
// 17×9 圆点阵列，波从中心向外按欧氏距离 stagger 扩散：每点 scale 0→1.5→1 +
// 亮度脉冲，波前过后留下常亮点阵；第二道波反向收拢，汇到中心时放出一圈回执涟漪。
// offset = k·dist(cell, origin)。
// 质感改版：改为 1920×1080 原生 SVG 作画（正方格距 100px，发光按目标分辨率光栅化，不再被
// DesignStage 放大成方块光晕）；未通电的点是一枚暗"插座"，阵列规模从第 0 帧就交代清楚；
// 波前自带亮边（单点行程中段提亮），第二道波颜色/光晕连续插值，不再阈值硬切。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { E, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, EASE, Grain } from '../../_fixtures/Polish';

export const RADIAL_WAVE_DURATION = 114; // 3800ms @30fps

const COLS = 17;
const ROWS = 9;
const CX = (COLS - 1) / 2;
const CY = (ROWS - 1) / 2;
const MAX_D = Math.hypot(CX, CY);
const PITCH = 100; // 格距（px），行列等距 → 波前是正圆
const OX = 960 - CX * PITCH;
const OY = 540 - CY * PITCH;
const R = 15; // 点半径（落定态）

// 第二道波时间表：外圈 0.57 起，最内圈 0.75 起，单点窗 0.12 → 中心 0.87 走完，尾段 ~15f 静止落定
const W2_START = 0.57;
const W2_SPREAD = 0.18;
const W2_WIN = 0.12;
const T_CONVERGE = W2_START + W2_SPREAD + W2_WIN / 2; // 中心脉冲峰值

const DOTS = Array.from({ length: ROWS * COLS }, (_, i) => {
  const r = Math.floor(i / COLS);
  const c = i % COLS;
  return { x: OX + c * PITCH, y: OY + r * PITCH, dist: Math.hypot(c - CX, r - CY) / MAX_D };
});

// 颜色插值（hex → rgb 混合）
const hex = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const BASE = hex('#6c84ff'); // 常亮色
const FRONT = hex('#b4c4ff'); // 第一道波前的提亮
const PEAK = hex('#c4f2ff'); // 第二道波峰值
const mixRgb = (a: number[], b: number[], k: number) => a.map((v, j) => Math.round(v + (b[j] - v) * k));
const css = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

export const RadialWave: React.FC = () => {
  const t = useT();
  // 起手爆发：中心地面辉光随第一道波亮起再衰减；汇聚时再轻亮一次
  const burst = Math.sin(seg(t, 0, 0.42) * Math.PI) ** 1.4;
  const converge = Math.exp(-(((t - T_CONVERGE) / 0.05) ** 2));
  // 回执涟漪：中心脉冲峰值后一圈细环外扩淡出
  const ring = seg(t, T_CONVERGE - 0.01, T_CONVERGE + 0.12, EASE.out);
  return (
    <AbsoluteFill>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.5 }} accent="#5f7bff" grain={0} vignette={0.62} />
      {/* 中心能量辉光（只照亮背景，不罩在点上） */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 46% 52% at 50% 50%, rgba(108,132,255,0.22), rgba(108,132,255,0) 70%)',
          opacity: 0.25 + burst * 0.75 + converge * 0.45,
        }}
      />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="rw-glow">
            <stop offset="0" stopColor="#9fe6ff" stopOpacity={0.55} />
            <stop offset="0.35" stopColor="#7fd8ff" stopOpacity={0.22} />
            <stop offset="1" stopColor="#7fd8ff" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="rw-front">
            <stop offset="0" stopColor="#9db0ff" stopOpacity={0.4} />
            <stop offset="1" stopColor="#9db0ff" stopOpacity={0} />
          </radialGradient>
          {/* 点的受光：左上一点高光，让圆点有球面感 */}
          <radialGradient id="rw-shade" cx="0.36" cy="0.32" r="0.75">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.42} />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="1" stopColor="#0a0f2a" stopOpacity={0.28} />
          </radialGradient>
        </defs>
        {/* 未通电的插座：恒定暗点 + 发丝环 */}
        {DOTS.map(({ x, y }, i) => (
          <circle key={`s${i}`} cx={x} cy={y} r={4} fill="rgba(150,165,220,0.16)" stroke="rgba(150,165,220,0.10)" strokeWidth={1} />
        ))}
        {DOTS.map(({ x, y, dist }, i) => {
          // 第一道波：扩散点亮；第二道波：反向脉冲
          const w1 = seg(t, dist * 0.35, dist * 0.35 + 0.18, E.outCubic);
          const w2 = seg(t, W2_START + (1 - dist) * W2_SPREAD, W2_START + (1 - dist) * W2_SPREAD + W2_WIN);
          const pulse2 = Math.sin(w2 * Math.PI);
          const f1 = Math.sin(w1 * Math.PI); // 波前亮边（单点行程中段最亮）
          const s = w1 * (1 + 0.5 * f1) + pulse2 * 0.8;
          if (s < 0.01) return null;
          const col = mixRgb(mixRgb(BASE, FRONT, f1 * 0.7), PEAK, pulse2);
          const op = Math.min(1, 0.25 + w1 * 0.5 + pulse2 * 0.25 + f1 * 0.15);
          return (
            <g key={i}>
              {f1 > 0.02 && <circle cx={x} cy={y} r={R * 2.6 * s} fill="url(#rw-front)" opacity={f1 * 0.7} />}
              {pulse2 > 0.02 && <circle cx={x} cy={y} r={R * 2.3 * s} fill="url(#rw-glow)" opacity={pulse2 * 0.75} />}
              <circle cx={x} cy={y} r={R * s} fill={css(col)} opacity={op} />
              <circle cx={x} cy={y} r={R * s} fill="url(#rw-shade)" opacity={op} />
            </g>
          );
        })}
        {/* 回执涟漪 */}
        {ring > 0 && ring < 1 && (
          <circle
            cx={960}
            cy={540}
            r={R * 1.6 + ring * 260}
            fill="none"
            stroke="#bfefff"
            strokeWidth={3 * (1 - ring) + 0.8}
            opacity={(1 - ring) ** 1.3 * 0.85}
          />
        )}
      </svg>
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
