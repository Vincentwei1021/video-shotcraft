// orb-flyline-relay｜光斑飞线接力
// 组合变异 = glow-orb-ambient + flyline-arc。
// 近黑底（#1d1d1b）+ 两团 blur(100px) 灰亮光斑多正弦漂移当氛围层；
// 三张深色描边卡三角布局、初始半暗(0.55)。飞线 A→B 落点帧：卡 B 亮起
// (opacity→1 + 描边亮白脉冲) 且邻近光斑同帧涨亮一拍（组合共振证明点）；
// 线二 B→C 接力，C 亮起收束。光斑 95–120f out-sine 减速收敛，
// 全部动画 f120 前结束，末 35f 真静止。
import React, { useId } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';

// 库内标准伪随机（帧确定）
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const TAU = Math.PI * 2;

type Pt = { x: number; y: number };

// 手写 cubic bezier 采样
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

const N = 100;

// ===== 布局：三张 420×250 深色卡呈三角 =====
const CARD_W = 420;
const CARD_H = 250;
const CARDS = {
  A: { x: 230, y: 170 },   // 左上（center 440, 295）
  B: { x: 1270, y: 300 },  // 右中（center 1480, 425）
  C: { x: 700, y: 740 },   // 下中（center 910, 865）
};
const center = (c: { x: number; y: number }) => ({ x: c.x + CARD_W / 2, y: c.y + CARD_H / 2 });

// ===== 光斑（氛围层）=====
type Orb = {
  size: number; peak: number;
  bx: number; by: number;
  p1: number; p2: number;
  ax1: number; ax2: number; ay1: number; ay2: number;
  seed: number;
  surgeAt: number; // 与哪个落点帧共振
};
const ORBS: Orb[] = [
  // 邻近卡 B —— 线1落点(f42)同帧涨亮
  { size: 720, peak: 0.26, bx: 1500, by: 330, p1: 104, p2: 138, ax1: 130, ax2: 95, ay1: 120, ay2: 92, seed: 1, surgeAt: 42 },
  // 邻近卡 C —— 线2落点(f76)同帧涨亮
  { size: 640, peak: 0.2, bx: 900, by: 830, p1: 122, p2: 94, ax1: 125, ax2: 88, ay1: 128, ay2: 90, seed: 2, surgeAt: 76 },
];

const orbPos = (o: Orb, t: number) => {
  const f1 = h(o.seed * 7 + 1) * TAU;
  const f2 = h(o.seed * 7 + 2) * TAU;
  const f3 = h(o.seed * 7 + 3) * TAU;
  const f4 = h(o.seed * 7 + 4) * TAU;
  const x = o.bx + o.ax1 * Math.sin((TAU * t) / o.p1 + f1) + o.ax2 * Math.sin((TAU * t) / o.p2 + f2);
  const y = o.by + o.ay1 * Math.sin((TAU * t) / o.p2 + f3) + o.ay2 * Math.sin((TAU * t) / o.p1 + f4);
  return { x, y };
};

// 涨亮一拍：起升 5f out-cubic，消散 15f 线性 → 落点帧 +20f 内结束
const surge = (frame: number, at: number) => {
  if (frame < at || frame > at + 20) return 0;
  return frame <= at + 5
    ? interpolate(frame, [at, at + 5], [0, 1], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : interpolate(frame, [at + 5, at + 20], [1, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
};

// ===== 发光飞线：亮头领跑 + 渐隐尾，到达后整线线性消散并摘罩 =====
const Flyline: React.FC<{
  frame: number;
  start: number; // 生长起始帧
  haloId: string; // 光头径向渐变 ID（父组件按实例生成）
  p0: Pt; p1: Pt; p2: Pt; p3: Pt;
}> = ({ frame, start, haloId, p0, p1, p2, p3 }) => {
  const DUR = 24;      // 生长
  const HOLD = 4;      // 到达后停一拍
  const FADE = 14;     // 消散（线性，帧时间解耦）
  if (frame < start || frame >= start + DUR + HOLD + FADE) return null; // 条件挂载=摘罩

  const e = interpolate(frame, [start, start + DUR], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const growing = frame < start + DUR;
  const fade = interpolate(frame, [start + DUR + HOLD, start + DUR + HOLD + FADE], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const pts: Pt[] = [];
  const nDrawn = Math.max(2, Math.ceil(e * N) + 1);
  for (let i = 0; i < nDrawn; i++) {
    const t = Math.min(i / N, e);
    pts.push(bez(p0, p1, p2, p3, t));
  }
  const head = bez(p0, p1, p2, p3, e);
  pts[pts.length - 1] = head;

  const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // 亮头暗尾：段 opacity 随离头距离衰减（渐隐尾）
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const tSeg = Math.min(i / N, e) / Math.max(e, 0.001); // 0 尾 → 1 头
    const grad = 0.12 + 0.88 * tSeg * tSeg;
    segs.push(
      <line
        key={i}
        x1={pts[i].x} y1={pts[i].y} x2={pts[i + 1].x} y2={pts[i + 1].y}
        stroke="#f4f4f0" strokeWidth={5} strokeLinecap="round"
        strokeOpacity={grad * fade}
      />
    );
  }

  return (
    <g>
      {/* 宽幅低透明白 = 辉光衬底（暗底上可见） */}
      <polyline
        points={poly} fill="none" stroke="#e8e8e4"
        strokeWidth={14} strokeLinecap="round" strokeLinejoin="round"
        strokeOpacity={0.18 * fade}
      />
      {segs}
      {/* 亮点头领跑：仅生长期挂载 */}
      {growing && (
        <g>
          <circle cx={head.x} cy={head.y} r={34} fill={`url(#${haloId})`} />
          <circle cx={head.x} cy={head.y} r={8} fill="#ffffff" />
        </g>
      )}
    </g>
  );
};

// ===== 深色描边卡：半暗 → 落点帧亮起 + 描边亮白脉冲 =====
const DarkCard: React.FC<{
  frame: number;
  litAt: number; // 亮起帧（Infinity = 一直半暗；A 用 8 表示开场自亮）
  x: number; y: number; seed: number;
}> = ({ frame, litAt, x, y, seed }) => {
  const lit = interpolate(frame, [litAt, litAt + 8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const op = 0.55 + 0.45 * lit;
  // 描边亮白脉冲：起升 6f out-cubic → 消散 16f 线性，残余 0.3 常量
  const pulse =
    frame < litAt
      ? 0
      : frame <= litAt + 6
        ? interpolate(frame, [litAt, litAt + 6], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          })
        : interpolate(frame, [litAt + 6, litAt + 22], [1, 0.3], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
  const borderCol = `rgba(${Math.round(90 + 165 * pulse)},${Math.round(90 + 165 * pulse)},${Math.round(88 + 164 * pulse)},1)`;
  const glow = pulse > 0 ? `0 0 ${24 * pulse}px ${6 * pulse}px rgba(255,255,255,${(0.3 * pulse).toFixed(3)})` : 'none';
  const titleW = 45 + ((seed * 37) % 40);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: CARD_W, height: CARD_H,
        boxSizing: 'border-box', background: '#262624',
        border: `1.5px solid ${borderCol}`, borderRadius: 14,
        boxShadow: glow, opacity: op,
        padding: 24, display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ height: 15, width: `${titleW}%`, background: '#4a4a48', borderRadius: 8 }} />
      <div style={{ height: 10, width: '80%', background: '#383836', borderRadius: 5 }} />
      <div style={{ height: 10, width: '62%', background: '#383836', borderRadius: 5 }} />
      <div style={{ marginTop: 'auto', display: 'flex', gap: 9, alignItems: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: 12, background: '#4a4a48' }} />
        <div style={{ height: 10, width: 78, background: '#383836', borderRadius: 5 }} />
      </div>
    </div>
  );
};

export const OrbFlylineRelay: React.FC = () => {
  const frame = useCurrentFrame();
  // 渐变 ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const haloId = `orbHeadHalo-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // 光斑有效时间：0–95f 匀速漂移，95–120f out-sine 减速收敛，f≥120 恒定 → 末 35f 真静止
  const t =
    frame <= 95
      ? frame
      : 95 +
        interpolate(frame, [95, 120], [0, 15], {
          easing: Easing.out(Easing.sin),
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });

  // 光斑淡入 0–18f
  const fadeIn = interpolate(frame, [0, 18], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // 时间轴：卡A f8 自亮(发起) → 线1 f18–42 A→B → f42 卡B亮+光斑1涨 →
  // 线2 f52–76 B→C → f76 卡C亮+光斑2涨 → 全部动画 f98 前结束，光斑 f120 冻结
  const cA = center(CARDS.A);
  const cB = center(CARDS.B);
  const cC = center(CARDS.C);
  const L1 = { p0: cA, p1: { x: 820, y: 90 }, p2: { x: 1300, y: 180 }, p3: cB };
  const L2 = { p0: cB, p1: { x: 1620, y: 820 }, p2: { x: 1240, y: 1000 }, p3: cC };

  return (
    <AbsoluteFill style={{ background: '#1d1d1b', overflow: 'hidden' }}>
      {/* 氛围层：两团大 blur 光斑，落点帧同帧涨亮（组合共振） */}
      {ORBS.map((o, i) => {
        const pos = orbPos(o, t);
        const s = surge(frame, o.surgeAt);
        const a = Math.min(0.85, o.peak * (1 + 1.6 * s));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: pos.x - o.size / 2,
              top: pos.y - o.size / 2,
              width: o.size,
              height: o.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(234,234,230,${a.toFixed(3)}) 0%, rgba(234,234,230,${(a * 0.5).toFixed(3)}) 42%, rgba(234,234,230,0) 70%)`,
              filter: 'blur(100px)',
              opacity: fadeIn,
            }}
          />
        );
      })}

      {/* 三张深色描边卡：A 开场自亮发起，B/C 随落点亮起 */}
      <DarkCard frame={frame} litAt={8} x={CARDS.A.x} y={CARDS.A.y} seed={1} />
      <DarkCard frame={frame} litAt={42} x={CARDS.B.x} y={CARDS.B.y} seed={2} />
      <DarkCard frame={frame} litAt={76} x={CARDS.C.x} y={CARDS.C.y} seed={3} />

      {/* 飞线接力层 */}
      <svg
        width={1920} height={1080} viewBox="0 0 1920 1080"
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          <radialGradient id={haloId}>
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <Flyline frame={frame} start={18} haloId={haloId} {...L1} />
        <Flyline frame={frame} start={52} haloId={haloId} {...L2} />
      </svg>
    </AbsoluteFill>
  );
};
