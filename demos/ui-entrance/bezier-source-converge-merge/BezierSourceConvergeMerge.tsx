// bezier-source-converge-merge — 左侧四个来源节点各有一条贝塞尔光路连向右侧同一汇聚点：光路先错峰由左向右
// draw-on，强调色数据包沿路径滑行；随后节点沿自己的曲线滑向汇聚点、三段式加速缩小并化成光点被吸进去，
// 汇聚点每吞一路亮一级；吞并完成后光路从左端反向擦除，相机平移把徽标收到画面正中，只留徽标 + 结论句。
//
// 第二轮重设计（极光 · 数据汇流）：
// - look = aurora（紫粉夜）。来源是 128px 的玻璃应用砖（深色带色相面 + 发丝边 + 顶部内高光 + 线性图标），
//   左侧配 40px 名称 + mono 规模注记；汇聚点是 168px 的极光渐变徽标 + 两圈慢转细环 + 大面积泛光。
// - 光路：2px 渐变描边（来源端暗紫 → 汇聚端亮粉）+ 同路径 10px 低透明度柔光底；数据包是带 12 段彗尾的亮点。
// - 节奏「接通—流动—吞并 ×4—收」：四路依次 5f 错峰汇入（不是一起到），徽标被连打四下、每下更亮——
//   da-da-da-DUM；最后一下给涟漪 + 光晕峰值，然后擦线、相机平移、结论句升起。
//
// 时间表（30fps，共 168f）：
//   0–20    来源砖 3f 错峰 overshoot 弹出、名称升起；徽标 14–32 snappy 0.6→1
//   6–44    四条光路 5f 错峰 draw-on（各 26f，out）
//   24–104  数据包沿路径循环（两个整数周期，相位各偏 0.13）
//   52+5i → 108+5i  节点沿真实曲线汇入（56f，inOutCubic）：前 75% 行程 128→44px 慢瘦身、后 25% 44→0 吸入；
//                   中段起砖面被强调色光"点燃"，读作化成光
//   108/113/118/123 徽标四次接收脉冲（每次 +7%，亮度逐级抬高），123 起涟漪
//   114–134 光路从左端反向擦除；118–146 相机平移 480px + 推近 1.1（smooth）把徽标收到正中
//   128–150 结论句 "One source of truth." 逐词升起、副句跟随；146–168 hold
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { E } from '../../_fixtures/Motion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const BEZIER_SOURCE_CONVERGE_MERGE_DURATION = 168; // 5600ms @30fps

const L = LOOKS.aurora;
const W = 1920;
const H = 1080;
const NODE_X = 540; // 来源砖中心 x（直线段终点）
const START_X = -40; // 路径起点在画框外
const XC = 1440, YC = 540; // 汇聚点
const NODE = 128; // 来源砖边长
const BADGE = 168;
const PAN = XC - W / 2; // 结尾相机平移量

type Src = { y: number; name: string; meta: string; icon: 'db' | 'cloud' | 'sheet' | 'api' };
const SRCS: Src[] = [
  { y: 300, name: 'Warehouse', meta: '1.2B rows', icon: 'db' },
  { y: 470, name: 'Object storage', meta: '84 TB', icon: 'cloud' },
  { y: 640, name: 'Spreadsheets', meta: '3,410 files', icon: 'sheet' },
  { y: 810, name: 'Events API', meta: '22k / sec', icon: 'api' },
];

const ICON: Record<Src['icon'], React.ReactNode> = {
  db: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.6" />
      <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
      <path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
    </>
  ),
  cloud: <path d="M7.2 18.5h9.6a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 6.9 9.4a4.6 4.6 0 0 0 .3 9.1Z" />,
  sheet: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2.4" />
      <path d="M4.5 9.5h15M4.5 14.5h15M10 9.5v10" />
    </>
  ),
  api: (
    <>
      <path d="M8.5 7 3.8 12l4.7 5M15.5 7l4.7 5-4.7 5" />
      <path d="M13.2 5.5 10.8 18.5" />
    </>
  ),
};

type Pt = { x: number; y: number };
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// cubic：P0=(NODE_X,y0) P1=(NODE_X+400,y0) P2=(XC-460,YC) P3=(XC,YC)——水平出、水平入，四路曲率天然不同
const cubic = (y0: number, u: number): Pt => {
  const v = 1 - u;
  const x0 = NODE_X, x1 = NODE_X + 400, x2 = XC - 460, x3 = XC;
  return {
    x: v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
    y: v * v * v * y0 + 3 * v * v * u * y0 + 3 * v * u * u * YC + u * u * u * YC,
  };
};
const pathD = (y0: number) => `M ${START_X},${y0} L ${NODE_X},${y0} C ${NODE_X + 400},${y0} ${XC - 460},${YC} ${XC},${YC}`;

// 弧长参数化：直线段（定长）+ cubic 1600 段累积弧长表，二分反查；模块级预计算，无 DOM 依赖
const SAMPLES = 1600;
const LINE_LEN = NODE_X - START_X;
const mkGeom = (y0: number) => {
  const cum: number[] = [0];
  let px = NODE_X, py = y0, acc = 0;
  for (let k = 1; k <= SAMPLES; k++) {
    const p = cubic(y0, k / SAMPLES);
    acc += Math.hypot(p.x - px, p.y - py);
    cum.push(acc);
    px = p.x; py = p.y;
  }
  const len = LINE_LEN + acc;
  const pointAt = (s: number): Pt => {
    const sc = Math.max(0, Math.min(len, s));
    if (sc <= LINE_LEN) return { x: START_X + sc, y: y0 };
    const target = sc - LINE_LEN;
    let lo = 0, hi = SAMPLES;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1; else hi = mid;
    }
    const i = Math.max(1, lo);
    const s0 = cum[i - 1], s1 = cum[i];
    return cubic(y0, (i - 1 + (s1 > s0 ? (target - s0) / (s1 - s0) : 0)) / SAMPLES);
  };
  return { len, pointAt, f0: LINE_LEN / len };
};
const GEOMS = SRCS.map((s) => mkGeom(s.y));

const CONV0 = 52; // 第一路开始汇入
const CONV_GAP = 5; // 四路错峰
const CONV_DUR = 56;
const arrive = (i: number) => CONV0 + i * CONV_GAP + CONV_DUR;
const convOf = (f: number, i: number) => ramp(f, CONV0 + i * CONV_GAP, CONV_DUR, E.inOutCubic);

const TAIL = 12;
const TAIL_GAP = 0.006;

export const BezierSourceConvergeMerge: React.FC = () => {
  const f = useCurrentFrame();
  const erase = ramp(f, 114, 20, EASE.swift);
  const pan = ramp(f, 118, 28, EASE.smooth);
  const zoom = mix(1, 1.1, pan);
  const pkCycle = (ramp(f, 24, 80, EASE.linear) * 2) % 1;
  const pkOn = ramp(f, 24, 8, EASE.out) * (1 - ramp(f, 98, 8, EASE.out));

  // 徽标：入场 + 四次接收脉冲（每次 +7%，亮度逐级抬高）+ 末次涟漪
  const bIn = ramp(f, 14, 18, EASE.snappy);
  const kicks = SRCS.reduce((k, _, i) => k + Math.sin(clamp01((f - arrive(i)) / 10) * Math.PI) * (i === 3 ? 1.6 : 1), 0);
  const absorbed = SRCS.reduce((n, _, i) => n + ramp(f, arrive(i) - 2, 6, EASE.out), 0); // 0→4
  const badgeScale = mix(0.6, 1, bIn) * (1 + kicks * 0.07) * mix(1, 1.08, pan);
  const energy = 0.35 + absorbed * 0.16; // 泛光强度随吞并逐级抬高
  const ripple = ramp(f, arrive(3), 24, EASE.out);
  const spin = f * 0.6;

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: mix(0.75, 0.5, pan), y: 0.5 }} fill={{ x: 0.12, y: 0.95 }} intensity={0.7 + absorbed * 0.06} breathe={0.4}>
        <Dust look={L} count={30} seed={4} drift={0.2} opacity={0.4} />
      </Stage>

      {/* 相机：结尾平移 + 推近，把徽标收到画面正中 */}
      <AbsoluteFill style={{ transform: `translateX(${(-pan * PAN).toFixed(2)}px) scale(${zoom.toFixed(4)})`, transformOrigin: `${XC}px ${YC}px` }}>
        {/* 汇聚点背后的大面积极光泛光 */}
        <div style={{
          position: 'absolute', left: XC - 520, top: YC - 520, width: 1040, height: 1040, borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(L.accent2, 0.32 * energy)} 0%, ${alpha(L.accent, 0.22 * energy)} 22%, ${alpha(L.accent, 0)} 60%)`,
          opacity: bIn,
        }} />

        {/* 光路：柔光底 + 渐变细线；dashoffset 正向 draw-on，erase 阶段取负值从起点退走 */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <linearGradient id="bscm-line" gradientUnits="userSpaceOnUse" x1={START_X} y1={0} x2={XC} y2={0}>
              <stop offset="0" stopColor={L.ink3} stopOpacity={0.5} />
              <stop offset="0.45" stopColor={L.accent} stopOpacity={0.85} />
              <stop offset="1" stopColor={L.accent2} />
            </linearGradient>
          </defs>
          {SRCS.map((s, i) => {
            const { len } = GEOMS[i];
            const draw = ramp(f, 6 + i * 5, 26, EASE.out);
            const off = erase > 0 ? -erase * len : len * (1 - draw);
            const op = clamp01(draw * 3) * (1 - clamp01((erase - 0.85) / 0.15));
            return (
              <g key={i} opacity={op}>
                <path d={pathD(s.y)} fill="none" stroke={L.accent} strokeOpacity={0.12} strokeWidth={12} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={off} />
                <path d={pathD(s.y)} fill="none" stroke="url(#bscm-line)" strokeWidth={2.4} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={off} />
              </g>
            );
          })}
        </svg>

        {SRCS.map((s, i) => {
          const { len, pointAt, f0 } = GEOMS[i];
          const conv = convOf(f, i);
          const pt = pointAt(len * (f0 + (1 - f0) * conv));
          // 三段式缩小：前 75% 行程 128→44（慢瘦身），后 25% 44→0（吸入）
          const size = conv < 0.75 ? mix(NODE, 44, conv / 0.75) : mix(44, 0, (conv - 0.75) / 0.25);
          const pop = ramp(f, i * 3, 16, EASE.overshoot);
          const popOp = ramp(f, i * 3, 6, EASE.out);
          const ignite = ramp(conv, 0.35, 0.5, EASE.linear); // 中段起被强调色"点燃"
          const k = size / NODE;
          const vis = conv >= 1 ? 0 : 1;
          // 名称：汇入一开始就退场（向左 + 淡出）
          const labelOut = ramp(f, CONV0 + i * CONV_GAP, 14, EASE.exit);
          const labelIn = ramp(f, 4 + i * 3, 18, EASE.snappy);
          // 数据包
          const ph = (pkCycle + i * 0.13) % 1;
          const pkOp = pkOn * (1 - Math.abs(ph - 0.5) * 0.7);
          return (
            <React.Fragment key={i}>
              {pkOp > 0.01 && Array.from({ length: TAIL + 1 }, (_, j) => TAIL - j).map((j) => {
                const pj = ph - j * TAIL_GAP;
                if (pj < 0) return null;
                const q = pointAt(len * (f0 + (1 - f0) * pj));
                const r = j === 0 ? 7 : 5 * (1 - j / (TAIL + 1));
                return (
                  <div key={j} style={{
                    position: 'absolute', left: q.x - r, top: q.y - r, width: r * 2, height: r * 2, borderRadius: '50%',
                    background: j === 0 ? '#ffffff' : L.accent2,
                    opacity: (j === 0 ? pkOp : pkOp * 0.5 * (1 - j / (TAIL + 1))).toFixed(3),
                    boxShadow: j === 0 ? `0 0 12px 3px ${alpha(L.accent2, 0.8)}, 0 0 34px 8px ${alpha(L.accent, 0.5)}` : undefined,
                  }} />
                );
              })}

              {/* 规模注记（mono 眉题）+ 名称：叠在直线段上方 */}
              <div style={{
                position: 'absolute', left: 120, top: s.y - 118,
                opacity: labelIn * (1 - labelOut),
                transform: `translate(${(-labelOut * 40).toFixed(1)}px, ${((1 - labelIn) * 24).toFixed(1)}px)`,
                filter: labelOut > 0.02 ? `blur(${(labelOut * 6).toFixed(2)}px)` : undefined,
              }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.12em', color: L.ink3, textTransform: 'uppercase' }}>{s.meta}</div>
                <div style={{ ...type(40, 600), color: L.ink, lineHeight: 1.2, marginTop: 6 }}>{s.name}</div>
              </div>

              {/* 来源砖：玻璃面 → 汇入中段被点燃成光点 */}
              {vis > 0 && size > 0.5 && (
                <div style={{
                  position: 'absolute', left: pt.x - size / 2, top: pt.y - size / 2, width: size, height: size,
                  borderRadius: size * mix(0.26, 0.5, ignite), opacity: popOp, transform: `scale(${pop.toFixed(4)})`,
                  background: `linear-gradient(160deg, ${L.surface2} 0%, ${L.surface} 100%)`,
                  border: `1px solid ${alpha('#ffffff', 0.12)}`, boxSizing: 'border-box',
                  boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.14)}, 0 ${(18 * k).toFixed(1)}px ${(40 * k).toFixed(1)}px -10px ${alpha(L.shadow, 0.9)}, 0 0 ${(30 * ignite).toFixed(1)}px ${(10 * ignite).toFixed(1)}px ${alpha(L.accent2, 0.6 * ignite)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  <svg width={size * 0.44} height={size * 0.44} viewBox="0 0 24 24" fill="none" stroke={L.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 1 - ignite }}>
                    {ICON[s.icon]}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle, #ffffff 0%, ${L.accent2} 45%, ${L.accent} 100%)`, opacity: ignite }} />
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* 接收涟漪：末次吸入一圈细环扩散 */}
        {ripple > 0 && ripple < 1 && (
          <div style={{
            position: 'absolute', left: XC - BADGE / 2, top: YC - BADGE / 2, width: BADGE, height: BADGE, borderRadius: '50%',
            border: `2px solid ${L.accent2}`, transform: `scale(${mix(1, 3.2, ripple)})`, opacity: (1 - ripple) * 0.7,
          }} />
        )}

        {/* 汇聚点徽标：两圈慢转细环 + 极光渐变圆 + 白色四角星 */}
        <div style={{ position: 'absolute', left: XC, top: YC, width: 0, height: 0, opacity: bIn, transform: `scale(${badgeScale.toFixed(4)})` }}>
          <svg width={360} height={360} viewBox="-180 -180 360 360" style={{ position: 'absolute', left: -180, top: -180, overflow: 'visible' }}>
            <circle r={128} fill="none" stroke={alpha(L.ink, 0.16)} strokeWidth={1.5} strokeDasharray="2 10" transform={`rotate(${spin})`} />
            <circle r={150} fill="none" stroke={alpha(L.accent, 0.28)} strokeWidth={1.5} strokeDasharray="60 18" transform={`rotate(${-spin * 0.7})`} />
            {/* 吞并进度：外圈四段弧，每吞一路点亮一段 */}
            {SRCS.map((_, i) => {
              const on = ramp(f, arrive(i) - 2, 8, EASE.out);
              const a0 = -90 + i * 90 + 6, a1 = -90 + (i + 1) * 90 - 6;
              const r = 104;
              const p0 = [r * Math.cos((a0 * Math.PI) / 180), r * Math.sin((a0 * Math.PI) / 180)];
              const p1 = [r * Math.cos((a1 * Math.PI) / 180), r * Math.sin((a1 * Math.PI) / 180)];
              return (
                <path key={i} d={`M ${p0[0]} ${p0[1]} A ${r} ${r} 0 0 1 ${p1[0]} ${p1[1]}`} fill="none" stroke={on > 0.01 ? L.accent2 : alpha(L.ink, 0.12)}
                  strokeOpacity={0.3 + 0.7 * on} strokeWidth={4} strokeLinecap="round" style={on > 0.01 ? { filter: `drop-shadow(0 0 6px ${alpha(L.accent2, on)})` } : undefined} />
              );
            })}
          </svg>
          <div style={{
            position: 'absolute', left: -BADGE / 2, top: -BADGE / 2, width: BADGE, height: BADGE, borderRadius: '50%',
            background: `radial-gradient(120% 110% at 30% 18%, #e9d8ff 0%, ${L.accent} 45%, #6d3fd6 78%, ${L.accent2} 120%)`,
            boxShadow: `inset 0 2px 0 ${alpha('#ffffff', 0.45)}, inset 0 -18px 40px ${alpha(L.accent2, 0.45)}, 0 0 ${(40 + 50 * energy).toFixed(0)}px ${alpha(L.accent2, 0.35 + 0.3 * energy)}, 0 30px 60px -20px ${alpha(L.shadow, 0.9)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={72} height={72} viewBox="0 0 24 24">
              <path d="M12 0.8 L14.3 9.7 L23.2 12 L14.3 14.3 L12 23.2 L9.7 14.3 L0.8 12 L9.7 9.7 Z" fill="#ffffff" />
            </svg>
          </div>
        </div>
      </AbsoluteFill>

      {/* 结论句：相机落定后在画面正中徽标下方升起（不随相机） */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 790, textAlign: 'center' }}>
        <div style={{ ...type(96, 700), color: L.ink }}>
          <TextReveal text="One source of truth." by="word" variant="rise" start={128} each={18} gap={3} />
        </div>
        <div style={{ ...type(36, 450), color: L.ink2, marginTop: 22, opacity: ramp(f, 140, 14, EASE.out), transform: `translateY(${(1 - ramp(f, 140, 18, EASE.snappy)) * 18}px)` }}>
          Four sources. One live graph. Zero pipelines to babysit.
        </div>
      </div>

      {/* 画框装饰：眉题 + 状态 */}
      <div style={{ position: 'absolute', left: 120, top: 96, display: 'flex', alignItems: 'center', gap: 14, opacity: ramp(f, 0, 12, EASE.out) * (1 - pan) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.16em', color: L.ink2 }}>CONFLUX · SOURCES</div>
      </div>
      <div style={{ position: 'absolute', right: 120, top: 96, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.16em', color: L.ink3, opacity: ramp(f, 4, 12, EASE.out) }}>
        <span style={{ color: absorbed >= 3.99 ? L.accent2 : L.ink }}>{`${Math.round(absorbed)} / 4`}</span> SYNCED
      </div>
    </AbsoluteFill>
  );
};
