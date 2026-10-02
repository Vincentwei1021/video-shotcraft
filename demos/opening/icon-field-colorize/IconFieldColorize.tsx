// icon-field-colorize —— 灰阶图标原野错峰浮现（错峰淡入+微弹），停一拍后
// 蓝色整场极快扫翻，随后橙/绿/红三道色波依次向下扫过，终态四色横带。
// 对标 bear-app.mp4 0–3s（密帧核实：非同帧硬翻，是极快多道波纹翻色）。
//
// 质感升级：图标装进 app 图标式圆角方块（灰阶态 = 浅灰磨砂底 + 灰字形；点亮态 = 品牌色渐变底 +
// 白字形 + 同色投影），翻色是"整块被点亮"而不是字形换色；浮现批次按离画面中心的距离分组（+噪声），
// 读作从中心向外铺开；四道色波换成克制的品牌色板（靛/琥珀/青绿/珊瑚）并带 ±4% 明度微差；
// 柔光浅底 + 极淡暗角/颗粒；全程极缓推近 2.5%。
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Backdrop, EASE, Grain, mix, ramp, softShadow, Vignette } from '../../_fixtures/Polish';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// 16 个简笔图标（viewBox 0 0 24 24，纯填充），求可辨认不求精致
const SHAPES: ((c: string, k: string) => React.ReactNode)[] = [
  (c, k) => <path fill={c} d="M12 21s-7.5-4.7-9.6-9C.9 8.7 2.7 5 6.2 5c2 0 3.3 1 4 2.1h3.6C14.5 6 15.8 5 17.8 5c3.5 0 5.3 3.7 3.8 7-2.1 4.3-9.6 9-9.6 9z" transform="scale(0.92) translate(1,0)" />,
  (c, k) => <path fill={c} d="M12 2l2.7 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.2 6.1 19.8l1.6-6.6L2.5 8.8l6.8-.5z" />,
  (c, k) => <path fill={c} d="M13 2L4 14h6l-1 8 9-12h-6z" />,
  (c, k) => <circle fill={c} cx="12" cy="12" r="9" />,
  (c, k) => <path fill={c} d="M9 3v12.3A3.5 3.5 0 1 0 11 18V7h7v6.3A3.5 3.5 0 1 0 20 16V3z" transform="scale(0.85) translate(1.5,1.5)" />,
  (c, k) => <path fill={c} d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2z" transform="scale(0.85) translate(2,2)" />,
  (c, k) => <><rect fill={c} x="3" y="6" width="18" height="13" rx="2.5" /><circle fill={k} cx="12" cy="12.5" r="3.6" /><rect fill={c} x="8" y="3.5" width="8" height="4" rx="1.5" /></>,
  (c, k) => <path fill={c} d="M6.5 19a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 17.8 8.7 4.2 4.2 0 0 1 17.5 19z" />,
  (c, k) => <path fill={c} d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" transform="scale(0.9) translate(1.2,0.5)" />,
  (c, k) => <path fill={c} d="M3.5 10L12 3l8.5 7V21h-6v-6h-5v6h-6z" />,
  (c, k) => <><rect fill={c} x="3" y="8" width="18" height="4" rx="1" /><rect fill={c} x="5" y="12" width="14" height="9" rx="1" /><rect fill={k} x="10.9" y="8" width="2.2" height="13" /></>,
  (c, k) => <path fill={c} d="M9.4 20.6l-1 1.9 7.2-.1 4.9-8.5-2.2.1-2 3.4L13 4.5h-2.1L7.6 17.3z" transform="scale(0.9) translate(1,1)" />,
  (c, k) => <path fill={c} d="M20.3 6.7L9.6 17.4l-5.9-5.9 2.1-2.1 3.8 3.8 8.6-8.6z" />,
  (c, k) => <path fill={c} d="M21.5 15.5L14 12V5.5a2 2 0 1 0-4 0V12l-7.5 3.5v2l7.5-2v4l-2.5 2v1.5l4.5-1 4.5 1V21.5l-2.5-2v-4l7.5 2z" transform="scale(0.85) translate(1.8,1.8)" />,
  (c, k) => <><circle fill={c} cx="12" cy="12" r="4" /><path fill={c} d="M12 1.5l1.4 3.6h-2.8zM12 22.5l-1.4-3.6h2.8zM1.5 12l3.6-1.4v2.8zM22.5 12l-3.6 1.4v-2.8zM4.6 4.6l3.5 1.5-2 2zM19.4 19.4l-3.5-1.5 2-2zM19.4 4.6l-1.5 3.5-2-2zM4.6 19.4l1.5-3.5 2 2z" /></>,
  (c, k) => <path fill={c} d="M20 4C10 4 4.5 9 4 15.7 3.9 17.5 4 20 4 20s2.7-.2 4.4-.3C15 19.2 20 13.5 20 4zM6.8 17.2C10 11 15 8 15 8s-5.5 1.5-8.8 8z" />,
];


export const ICON_FIELD_COLORIZE_DURATION = 150; // 浮现 ~50f + 静置 ~27f + 翻色 ~42f + 终态 hold ~30f

const COLS = 17, ROWS = 10;
const CELL_X = 106, CELL_Y = 104; // 格距（行间半格错位）
const TILE = 60; // 图标方块边长
const GLYPH = 30; // 字形边长
const X0 = (1920 - ((COLS - 1) * CELL_X + CELL_X / 2 + TILE)) / 2; // 整场水平居中
const Y0 = (1080 - ((ROWS - 1) * CELL_Y + TILE)) / 2; // 整场垂直居中
// 灰阶 4 档字形色（冷灰，避免纯中性灰发脏）
const GRAYS = ['#a3a6ae', '#8e9199', '#b4b6bd', '#9a9da5'];
// 四道色波：靛覆盖全场，琥珀/青绿/珊瑚依次覆盖更低的行带 → 终态四色横带（克制饱和度的品牌色板）
const WAVES = [
  { color: [91, 99, 211], fromRow: 0, start: 78 },
  { color: [224, 154, 62], fromRow: 3, start: 90 },
  { color: [47, 158, 120], fromRow: 6, start: 100 },
  { color: [224, 98, 110], fromRow: 9, start: 110 },
];
type RGB = number[];
const shadeRGB = (c: RGB, k: number) => c.map((v) => Math.round(Math.max(0, Math.min(255, v + k * 255))));
const css = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// 单块图标：tint=null 为灰阶态，否则为点亮态（品牌色渐变底 + 白字形 + 同色投影）
const Tile: React.FC<{ shape: (c: string, k: string) => React.ReactNode; gray: string; tint: RGB | null }> = ({ shape, gray, tint }) => {
  const lit = tint !== null;
  const top = lit ? shadeRGB(tint, 0.07) : null;
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 17,
      background: lit ? `linear-gradient(180deg, ${css(top!)} 0%, ${css(tint)} 100%)` : 'linear-gradient(180deg, #f7f7f8 0%, #ececef 100%)',
      boxShadow: lit
        ? `inset 0 1px 0 rgba(255,255,255,0.28), inset 0 0 0 1px ${css(shadeRGB(tint, -0.08), 0.5)}, 0 1px 2px ${css(shadeRGB(tint, -0.25), 0.25)}, 0 8px 18px -6px ${css(tint, 0.45)}`
        : `inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(20,22,28,0.06), ${softShadow(2)}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg viewBox="0 0 24 24" width={GLYPH} height={GLYPH} style={{ display: 'block' }}>
        {shape(lit ? '#ffffff' : gray, lit ? css(tint) : '#efeff2')}
      </svg>
    </div>
  );
};

export const IconFieldColorize: React.FC = () => {
  const frame = useCurrentFrame();
  const rand = mulberry32(20260718);
  const icons: React.ReactNode[] = [];
  const maxD = Math.hypot(960, 540);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const r1 = rand(), r2 = rand(), r3 = rand();
      const x = X0 + c * CELL_X + (r % 2) * (CELL_X / 2);
      const y = Y0 + r * CELL_Y;
      // —— 错峰浮现：分 10 批（批间 4f + 批内 ≤3f 抖动）；批次 = 离中心距离 70% + 噪声 30%，从中心向外铺开
      const d = Math.hypot(x + TILE / 2 - 960, y + TILE / 2 - 540) / maxD;
      const batch = Math.min(9, Math.floor((d * 0.75 + r1 * 0.35) * 10));
      const t0 = 4 + batch * 4 + r2 * 3;
      const op = ramp(frame, t0, 7, EASE.out);
      if (op <= 0) continue;
      // 微弹：0.55 → ~1.07 → 1（overshoot 曲线一次过冲回落）
      const appearScale = mix(0.55, 1, ramp(frame, t0, 12, EASE.overshoot));
      // 浮现时自下方 10px 轻轻浮起（随缩放同曲线）
      const lift = (1 - ramp(frame, t0, 12, EASE.snappy)) * 10;

      // —— 色波：每道波从起始行向下快扫（行 1.4 帧 + 列微倾 0.25f + 抖动 ≤1.5f）
      const gray = GRAYS[Math.floor(r2 * GRAYS.length)];
      const jitterL = (r1 - 0.5) * 0.08; // 同色带内 ±4% 明度微差，色带不死平
      let prev: RGB | null = null; // 翻色前的状态（灰 or 上一道波色）
      let cur: RGB | null = null;
      let p = 0; // 最近一次翻色的进行度
      for (const w of WAVES) {
        if (r < w.fromRow) continue;
        const arrive = w.start + (r - w.fromRow) * 1.4 + c * 0.25 + r3 * 1.5;
        const q = interpolate(frame, [arrive, arrive + 3], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        if (q > 0) { prev = cur; cur = shadeRGB(w.color, jitterL); p = q; }
      }
      // 翻色 pop：1.22x 正弦鼓包 3f（波前沿的"啪"）
      const flipPop = p > 0 && p < 1 ? 1 + Math.sin(p * Math.PI) * 0.22 : 1;

      const shape = SHAPES[Math.floor(r3 * SHAPES.length) % SHAPES.length];
      icons.push(
        <div key={`${r}-${c}`} style={{
          position: 'absolute', left: x, top: y + lift, width: TILE, height: TILE,
          opacity: op, transform: `scale(${appearScale * flipPop})`,
        }}>
          <Tile shape={shape} gray={gray} tint={p > 0 && p < 1 ? prev : cur} />
          {p > 0 && p < 1 && (
            // 新色层 1.5f 内盖满（不让两色半透明叠出浑浊的中间色）
            <div style={{ position: 'absolute', inset: 0, opacity: Math.min(1, p * 2) }}>
              <Tile shape={shape} gray={gray} tint={cur} />
            </div>
          )}
        </div>,
      );
    }
  }

  // 全程极缓推近（不起止急变）：让"铺满→点亮"有一点呼吸
  const push = 1 + 0.025 * ramp(frame, 0, ICON_FIELD_COLORIZE_DURATION, EASE.smooth);
  return (
    <AbsoluteFill style={{ background: '#f2f2f0', overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.3 }} grain={0} vignette={0} />
      <AbsoluteFill style={{ transform: `scale(${push})` }}>{icons}</AbsoluteFill>
      <Vignette strength={0.12} inner={0.5} color="#2a2c36" />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};
