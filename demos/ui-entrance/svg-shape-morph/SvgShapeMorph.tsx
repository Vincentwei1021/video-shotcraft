// svg-shape-morph — Shape Morph 轮廓变形（motion-lab 定稿转原生 Remotion）
// 一个 SVG 轮廓平滑变形为另一个再变回：两条闭合轮廓先重采样到相同点数
// （极坐标 140 点），逐点插值 + inOutCubic，变形中段加轻微 scale 呼吸与
// 色相漂移，得到有机的流动感。
// 质感改版：
// - 改为 1920×1080 原生坐标作画（参数表的 480×270 数值统一 ×4 换算），140 个采样点用闭合
//   Catmull-Rom 转三次贝塞尔连成光滑曲线（不再是 L 折线）；
// - 形体有体积：左上受光的径向渐变填充 + 内核柔光（滞后 5f 跟随变形，读作"里面的流体慢半拍"）+
//   渐变描边 + 外圈辉光，背景随色相染一层柔光；
// - 去掉调试字幕 morphTo(shapeA/B)。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { E, lerp, seg } from '../../_fixtures/Motion';
import { Grain, Vignette } from '../../_fixtures/Polish';

export const SVG_SHAPE_MORPH_DURATION = 156; // 5200ms @30fps

const K = 4; // 设计坐标 → 输出像素
const CX = 240 * K;
const CY = 138 * K;
const N = 140;
const BASE = 76 * K;

// 两个形状：同一采样点数（等价 morphTo 的点数对齐）
const rA = (th: number) => BASE * (1 + 0.3 * Math.cos(th * 3) + 0.05 * Math.sin(th * 7 + 0.8));
const rB = (th: number) => BASE * (1 + 0.26 * Math.sin(th * 5 + 1.2) + 0.06 * Math.cos(th * 2));
const RAD_A: number[] = [];
const RAD_B: number[] = [];
for (let i = 0; i < N; i++) {
  const th = (i / N) * Math.PI * 2;
  RAD_A.push(rA(th));
  RAD_B.push(rB(th));
}

// 按混合系数 m 逐点插值两条轮廓（角度恒定，只插半径），闭合 Catmull-Rom → 贝塞尔
const build = (m: number, k = 1) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const r = lerp(m, RAD_A[i], RAD_B[i]) * k;
    pts.push([CX + Math.cos(th) * r, CY + Math.sin(th) * r]);
  }
  const P = (j: number) => pts[(j + N) % N];
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d +=
      `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ` +
      `${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ` +
      `${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
};

// 归一化进度（末帧恰为 1）下的形态系数：0=A 1=B
const morphAt = (t: number) => seg(t, 0.08, 0.42, E.inOutCubic) - seg(t, 0.58, 0.92, E.inOutCubic);

export const SvgShapeMorph: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const T = (f: number) => Math.min(1, Math.max(0, f / Math.max(1, durationInFrames - 1)));
  const t = T(frame);
  const m1 = seg(t, 0.08, 0.42, E.inOutCubic); // A → B
  const m2 = seg(t, 0.58, 0.92, E.inOutCubic); // B → A
  const m = m1 - m2; // 0=A 1=B
  const mLag = morphAt(T(frame - 5)); // 内核滞后 5f：跟随而非同步
  const d = build(m);
  const dCore = build(mLag, 0.58);
  const hue = lerp(m, 185, 305);
  // 变形中段的 scale 呼吸 + 缓慢自转
  const breath = 1 + 0.045 * (Math.sin(m1 * Math.PI) + Math.sin(m2 * Math.PI));
  const rot = Math.sin(t * Math.PI * 2) * 4;
  // 变形中途形体"最不稳定"，光也最盛一点
  const energy = Math.sin(m1 * Math.PI) + Math.sin(m2 * Math.PI);
  const g = `translate(${CX},${CY}) scale(${breath.toFixed(5)}) rotate(${rot.toFixed(3)}) translate(${-CX},${-CY})`;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0d0e14 0%, #090a0e 100%)' }}>
      {/* 随色相染色的环境柔光（形体照亮空间） */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 42% 48% at 50% 51%, hsla(${hue},70%,52%,${(0.16 + energy * 0.04).toFixed(3)}), hsla(${hue},70%,40%,0) 72%)`,
        }}
      />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="ssm-bloom" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={46} />
          </filter>
          <filter id="ssm-core" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={30} />
          </filter>
          {/* 主光左上：填充从受光面亮到背光面暗 */}
          <radialGradient id="ssm-fill" cx={CX - BASE * 0.35} cy={CY - BASE * 0.4} r={BASE * 1.6} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={`hsl(${hue + 8},85%,72%)`} stopOpacity={0.36} />
            <stop offset="0.55" stopColor={`hsl(${hue},80%,52%)`} stopOpacity={0.16} />
            <stop offset="1" stopColor={`hsl(${hue - 10},75%,36%)`} stopOpacity={0.08} />
          </radialGradient>
          <linearGradient id="ssm-rim" x1={CX - BASE} y1={CY - BASE} x2={CX + BASE} y2={CY + BASE} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={`hsl(${hue + 12},95%,86%)`} />
            <stop offset="0.5" stopColor={`hsl(${hue},85%,68%)`} />
            <stop offset="1" stopColor={`hsl(${hue - 12},80%,56%)`} />
          </linearGradient>
          <clipPath id="ssm-clip">
            <path d={d} />
          </clipPath>
        </defs>
        <g transform={g}>
          {/* 外圈辉光 */}
          <path d={d} fill={`hsla(${hue},85%,58%,${(0.28 + energy * 0.06).toFixed(3)})`} filter="url(#ssm-bloom)" />
          {/* 体积填充 */}
          <path d={d} fill="url(#ssm-fill)" />
          {/* 内核柔光：滞后跟随，裁在轮廓内 */}
          <g clipPath="url(#ssm-clip)">
            <path d={dCore} fill={`hsla(${hue + 6},90%,74%,0.30)`} filter="url(#ssm-core)" />
          </g>
          {/* 描边：渐变主描边 + 内侧细高光 */}
          <path d={d} fill="none" strokeWidth={6} strokeLinejoin="round" stroke="url(#ssm-rim)" />
          <g clipPath="url(#ssm-clip)">
            <path d={d} fill="none" strokeWidth={7} strokeLinejoin="round" stroke="rgba(255,255,255,0.22)" />
          </g>
        </g>
      </svg>
      <Vignette strength={0.5} color="#000000" inner={0.42} />
      <Grain opacity={0.09} blend="soft-light" />
    </AbsoluteFill>
  );
};
