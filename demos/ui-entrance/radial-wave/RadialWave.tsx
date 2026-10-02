// radial-wave — 点阵按到波源的距离错峰点亮：每点过冲鼓起再落回常亮，第一道波扫完后
// 第二道反向脉冲从外圈收拢回中心，汇到中心时放出回执——"系统上电"的一拍。
//
// 第二轮重设计（极光夜 · 透视 LED 地面）：
// - look = aurora（深紫夜 + 紫光 + 粉色点缀）。点阵不再是正视的 17×9 平面，而是一张铺向地平线的
//   透视 LED 地面（81×31 网格，裁掉画外的点约 2,100 枚，最远几排渐隐进地平线），按真实透视算每点的屏幕位置与大小（近大远小）。
// - 波是真的"波"：波前经过时点被抬起（地面上的位移 crest，近处最高 ~60px）+ 尺寸过冲 1→1.5→1 + 提亮到近白，
//   波前之后留在常亮紫（离源头越近越亮）；源头附近 8 格内地面画一圈透视椭圆光环（读作涟漪从源头放出）。
// - 波源是地面中央的一枚能量核：开场 0–8f 先蓄能（预备），8f 放出第一道波（速度 1.3f/格，先密后疏的外扩）。
// - 第二道波：外圈 70f 起粉色脉冲向内收拢（速度更快 0.9f/格，越收越急），~107f 汇到中心——核爆亮、
//   一道竖向光柱 + 一圈外扩回执环；随后天空区标题「Every node, online.」逐词由虚到实、等宽副标计数到 2,048。
//
// 时间表（30fps，共 156f）：
//   0–8     预备：暗插座点阵（交代规模）+ 能量核蓄能（首帧即有）
//   8–84    第一道波外扩（单点行程 18f，过冲 + 抬起 + 亮边），掠过全场后常亮
//   70–107  第二道波由外向内收拢（单点行程 14f，粉色脉冲，不留状态）
//   104–130 汇聚：核闪 + 光柱 + 回执环；106–126 标题逐词揭示、副标计数
//   126–156 hold 30f：点阵极缓呼吸，干净定格
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, glow, type } from '../../_fixtures/Look';

export const RADIAL_WAVE_DURATION = 156;

const L = LOOKS.aurora;

// ───────────── 透视地面 ─────────────
// 世界坐标：地面 X（左右，格）× Z（纵深，格，0 = 最近一排）；屏幕 = 960 + X·S/(Z+Z0)，HY + C/(Z+Z0)
const Z0 = 6;
const HY = 250; // 地平线
const C = (1130 - HY) * Z0; // 最近一排落在画面下沿之外一点
const S = 420; // 横向尺度（最近一排格距 ≈ 70px）
const ZC = 9; // 波源所在纵深
const COLS = 40; // X ∈ [-40, 40]
const ROWS = 30; // Z ∈ [0, 30]（最远 6 排渐隐进地平线雾里）

const proj = (x: number, z: number, lift = 0) => {
  const k = 1 / (z + Z0);
  return { sx: 960 + x * S * k, sy: HY + C * k - lift * S * k, k };
};
const SRC = proj(0, ZC);

type Dot = { sx: number; sy: number; k: number; d: number; x: number; z: number; seed: number };
const DOTS: Dot[] = [];
for (let zi = ROWS; zi >= 0; zi--) {
  for (let xi = -COLS; xi <= COLS; xi++) {
    const p = proj(xi, zi);
    if (p.sx < -40 || p.sx > 1960 || p.sy > 1120) continue;
    DOTS.push({ ...p, d: Math.hypot(xi, zi - ZC), x: xi, z: zi, seed: (xi * 73856093) ^ (zi * 19349663) });
  }
}

// 第一道波：起点 = 8 + d·1.3（f），单点行程 18f；第二道：起点 = 70 + (R2 - d)·0.9，单点 14f
const W1_START = 8;
const W1_SPEED = 1.3;
const W1_DUR = 18;
const R2 = 34; // 第二道波起始半径（格）
const W2_START = 70;
const W2_SPEED = 0.9;
const W2_DUR = 14;
const CONVERGE = W2_START + R2 * W2_SPEED + W2_DUR / 2; // ≈ 107：中心脉冲峰值

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const SOCKET = hexRgb('#3a2f5c');
const LIT = hexRgb('#9d83ff');
const FRONT = hexRgb('#f1ecff');
const PINK = hexRgb('#ff8fcf');
const mixC = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
const rgb = (c: number[]) => `rgb(${c.map((v) => Math.round(v)).join(',')})`;

// 地面上的透视圆（波前光环）
const ringPath = (r: number) => {
  let d = '';
  let pen = false;
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const z = ZC + Math.sin(a) * r;
    if (z < -Z0 + 0.6) { pen = false; continue; } // 镜头后方：断开
    const p = proj(Math.cos(a) * r, z);
    d += `${pen ? 'L' : 'M'}${p.sx.toFixed(1)},${p.sy.toFixed(1)} `;
    pen = true;
  }
  return d;
};

export const RadialWave: React.FC = () => {
  const frame = useCurrentFrame();

  // 能量核：蓄能 → 放波 → 平稳 → 汇聚爆亮
  const charge = ramp(frame, 0, 8, EASE.exit);
  const fire = Math.exp(-Math.max(0, frame - W1_START) / 6) * (frame >= W1_START ? 1 : 0);
  const conv = frame < CONVERGE - 4 ? 0 : Math.exp(-Math.max(0, frame - CONVERGE) / 9) * ramp(frame, CONVERGE - 4, 4, EASE.out);
  const coreGlow = 0.35 + 0.4 * charge + 0.9 * fire + 1.2 * conv;

  // 波前半径（格）
  const r1 = (frame - W1_START) / W1_SPEED;
  const r2 = R2 - (frame - W2_START) / W2_SPEED;
  const echo = ramp(frame, CONVERGE, 26, EASE.out); // 回执环 0→1
  const breathe = frame > 120 ? 0.06 * Math.sin((frame - 120) / 10) : 0;

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: HY / 1080 + 0.1 }} fill={{ x: 0.5, y: 1.1 }} horizon={HY / 1080 + 0.04} intensity={0.55 + 0.25 * conv} />

      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="rw-halo">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.55} />
            <stop offset="0.3" stopColor={L.accent} stopOpacity={0.32} />
            <stop offset="1" stopColor={L.accent} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="rw-halo2">
            <stop offset="0" stopColor="#ffd6ee" stopOpacity={0.6} />
            <stop offset="0.35" stopColor={L.accent2} stopOpacity={0.3} />
            <stop offset="1" stopColor={L.accent2} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="rw-core">
            <stop offset="0" stopColor="#ffffff" stopOpacity={1} />
            <stop offset="0.25" stopColor="#d9ccff" stopOpacity={0.8} />
            <stop offset="1" stopColor={L.accent} stopOpacity={0} />
          </radialGradient>
          {/* 光柱：底部最亮，向上与向两侧同时衰减（软边，不是硬矩形） */}
          <radialGradient id="rw-beam" cx="0.5" cy="1" r="1" gradientTransform="translate(0.5 1) scale(0.5 1) translate(-0.5 -1)">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="0.25" stopColor="#ffc2e6" stopOpacity={0.5} />
            <stop offset="0.6" stopColor={L.accent2} stopOpacity={0.14} />
            <stop offset="1" stopColor={L.accent2} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* 波前光环（地面透视椭圆）：只在源头附近可见（近源画小环，外扩后交给点阵本身表达波前） */}
        {r1 > 0.5 && r1 < 9 && (
          <path d={ringPath(r1)} fill="none" stroke="#e6dcff" strokeWidth={2} opacity={0.5 * (1 - r1 / 9)} />
        )}
        {frame >= W2_START && r2 > 0.4 && r2 < 8 && (
          <path d={ringPath(r2)} fill="none" stroke={L.accent2} strokeWidth={2.5} opacity={0.6 * clamp01(r2 / 3) * clamp01((8 - r2) / 3)} />
        )}
        {echo > 0 && echo < 1 && (
          <path d={ringPath(1 + echo * 26)} fill="none" stroke="#ffe3f3" strokeWidth={3.5 * (1 - echo) + 0.8} opacity={(1 - echo) ** 1.4 * 0.9} />
        )}

        {/* 点阵（远 → 近绘制） */}
        {DOTS.map((p, i) => {
          const w1 = clamp01((frame - (W1_START + p.d * W1_SPEED)) / W1_DUR);
          const e1 = EASE.out(w1);
          const f1 = Math.sin(w1 * Math.PI); // 波前（单点行程中段最强）
          const w2 = frame < W2_START ? 0 : clamp01((frame - (W2_START + Math.max(0, R2 - p.d) * W2_SPEED)) / W2_DUR);
          const f2 = p.d <= R2 ? Math.sin(w2 * Math.PI) : 0;
          const lift = 0.9 * f1 + 0.45 * f2;
          const q = lift > 0.001 ? proj(p.x, p.z, lift) : p;
          const scale = 1 + 0.5 * f1 + 0.6 * f2 + breathe * e1;
          const r = 0.13 * S * p.k * scale;
          // 远处降对比（大气透视）
          const fog = (0.45 + 0.55 * clamp01((p.k * Z0 - 0.22) / 0.78)) * clamp01((ROWS - p.z) / 7);
          if (fog < 0.02) return null;
          // 常亮态按到源头的距离衰减：源头附近更亮，形成视觉重心
          const focus = 0.62 + 0.38 * Math.exp(-p.d / 11);
          let col = mixC(SOCKET, LIT, e1);
          col = mixC(col, FRONT, f1 * 0.85);
          col = mixC(col, PINK, f2);
          const op = (0.5 + 0.5 * e1 * focus + 0.2 * f2) * fog;
          return (
            <g key={i}>
              {f1 > 0.05 && <circle cx={q.sx} cy={q.sy} r={r * 3.2} fill="url(#rw-halo)" opacity={f1 * 0.8 * fog} />}
              {f2 > 0.05 && <circle cx={q.sx} cy={q.sy} r={r * 3.4} fill="url(#rw-halo2)" opacity={f2 * 0.85 * fog} />}
              <circle cx={q.sx} cy={q.sy} r={Math.max(0.9, r)} fill={rgb(col)} opacity={op} />
            </g>
          );
        })}

        {/* 汇聚光柱 */}
        {conv > 0.01 && (
          <>
            <rect x={SRC.sx - 70 * (0.5 + conv)} y={SRC.sy - 640} width={140 * (0.5 + conv)} height={640} fill="url(#rw-beam)" opacity={conv * 0.8} />
            <rect x={SRC.sx - 2} y={SRC.sy - 520 * conv} width={4} height={520 * conv} fill="url(#rw-beam)" opacity={conv} />
          </>
        )}
        {/* 能量核 */}
        <ellipse cx={SRC.sx} cy={SRC.sy} rx={70 * (0.6 + 0.4 * coreGlow)} ry={30 * (0.6 + 0.4 * coreGlow)} fill="url(#rw-core)" opacity={Math.min(1, coreGlow)} />
        <circle cx={SRC.sx} cy={SRC.sy - 4} r={9 + 4 * fire + 6 * conv} fill="#ffffff" opacity={0.6 + 0.4 * Math.min(1, coreGlow)} />
      </svg>

      {/* 天空区：标题 + 副标（汇聚后揭示） */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 92, textAlign: 'center' }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: '0.3em', color: L.ink2, opacity: ramp(frame, 112, 14, EASE.out) }}>
          <span style={{ color: L.accent2 }}>●</span>&nbsp; MESH ·{' '}
          <span style={{ color: L.ink, fontVariantNumeric: 'tabular-nums' }}>{Math.round(2048 * ramp(frame, 110, 20, EASE.snappy)).toLocaleString('en-US')}</span>
          {' '}/ 2,048 NODES
        </div>
        <div style={{ ...type(120, 700), color: L.ink, marginTop: 22, letterSpacing: '-0.045em', textShadow: glow(L.accent, 0.35) }}>
          <TextReveal text="Every node, online." by="word" variant="blur" start={106} each={18} gap={5} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

