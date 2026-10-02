// orb-flyline-relay｜光斑飞线接力
// 组合变异 = glow-orb-ambient + flyline-arc。
// 近黑底（#1d1d1b）+ 两团 blur(100px) 灰亮光斑多正弦漂移当氛围层；
// 三张深色描边卡三角布局、初始半暗(0.55)。飞线 A→B 落点帧：卡 B 亮起
// (opacity→1 + 描边亮白脉冲) 且邻近光斑同帧涨亮一拍（组合共振证明点）；
// 线二 B→C 接力，C 亮起收束。光斑 95–120f out-sine 减速收敛，
// 全部动画 f120 前结束，末 35f 真静止。
//
// 质感升级：底色换带冷色相的近黑 + 点阵台面；光斑由灰白改为靛蓝/淡紫克制色对（峰值、漂移、
// surge 节拍不变）；三张灰条骨架卡换成一条数据管线的三站（Sources → Transform → Warehouse，
// 图标 + 指标 + 状态），半暗→点亮时状态点与指标一起"通电"；飞线改为白芯 + 靛蓝辉光衬底、
// butt 端分段不再叠出珠串，光头带彗尾光晕；落点帧加一圈扩散冲击环（与卡脉冲、光斑 surge 同帧）；
// 暗角 + 颗粒防色带。
import React, { useId } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const ORB_FLYLINE_RELAY_DURATION = 155; // ~5.2s：动作 f98 前结束、光斑 f120 冻结、末 35f 真静止

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
  rgb: string; // 光色
};
const ORBS: Orb[] = [
  // 邻近卡 B —— 线1落点(f42)同帧涨亮
  { size: 720, peak: 0.26, bx: 1500, by: 330, p1: 104, p2: 138, ax1: 130, ax2: 95, ay1: 120, ay2: 92, seed: 1, surgeAt: 42, rgb: '128,138,255' },
  // 邻近卡 C —— 线2落点(f76)同帧涨亮
  { size: 640, peak: 0.2, bx: 900, by: 830, p1: 122, p2: 94, ax1: 125, ax2: 88, ay1: 128, ay2: 90, seed: 2, surgeAt: 76, rgb: '178,150,245' },
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
        stroke="#f6f6ff" strokeWidth={3.5} strokeLinecap="butt"
        strokeOpacity={grad * fade}
      />
    );
  }
  // 彗尾：光头后方一小段加粗的亮段（只在生长期）
  const tailFrom = Math.max(0, pts.length - 9);
  const comet = pts.slice(tailFrom).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <g>
      {/* 靛蓝辉光衬底：宽幅低透明 + 次宽中透明两层（暗底上读作发光而不是灰边） */}
      <polyline points={poly} fill="none" stroke="rgb(128,138,255)" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.10 * fade} />
      <polyline points={poly} fill="none" stroke="rgb(150,160,255)" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.22 * fade} />
      {segs}
      {/* 亮点头领跑 + 彗尾：仅生长期挂载 */}
      {growing && (
        <g>
          <polyline points={comet} fill="none" stroke="#ffffff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.55} />
          <circle cx={head.x} cy={head.y} r={40} fill={`url(#${haloId})`} />
          <circle cx={head.x} cy={head.y} r={7} fill="#ffffff" />
        </g>
      )}
    </g>
  );
};

// ===== 管线三站：半暗 → 落点帧亮起 + 描边亮白脉冲 =====
const STATIONS: Record<number, { title: string; sub: string; value: string; unit: string; icon: string }> = {
  1: { title: 'Sources', sub: '14 connectors', value: '12.4k', unit: 'events / s', icon: 'M3 4.5h10M3 8h10M3 11.5h6' },
  2: { title: 'Transform', sub: 'dbt · 38 models', value: '212', unit: 'ms p95', icon: 'M4 3v4.5a2 2 0 0 0 2 2h6M9.5 7 12 9.5 9.5 12' },
  3: { title: 'Warehouse', sub: 'us-east · 3 replicas', value: '4.8', unit: 'TB synced', icon: 'M3 4.5c0-1 2.2-1.8 5-1.8s5 .8 5 1.8v7c0 1-2.2 1.8-5 1.8s-5-.8-5-1.8zM3 4.5c0 1 2.2 1.8 5 1.8s5-.8 5-1.8M3 8c0 1 2.2 1.8 5 1.8s5-.8 5-1.8' },
};

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
  const st = STATIONS[seed];
  const ring = `rgba(${Math.round(255 - 60 * (1 - pulse))},${Math.round(255 - 50 * (1 - pulse))},255,${(0.08 + 0.62 * pulse).toFixed(3)})`;
  const glow = pulse > 0 ? `, 0 0 ${(28 * pulse).toFixed(1)}px ${(4 * pulse).toFixed(1)}px rgba(150,160,255,${(0.32 * pulse).toFixed(3)})` : '';
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: CARD_W, height: CARD_H,
        boxSizing: 'border-box', borderRadius: 16, opacity: op, overflow: 'hidden',
        background: 'linear-gradient(180deg, #1d1e25 0%, #15161b 100%)',
        boxShadow: `inset 0 0 0 1px ${ring}, inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 4px rgba(0,0,0,0.45), 0 26px 50px -18px rgba(0,0,0,0.75)${glow}`,
        padding: '24px 26px', display: 'flex', flexDirection: 'column', fontFamily: FONT.sans,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `rgba(128,136,240,${(0.06 + 0.1 * lit).toFixed(3)})`, boxShadow: `inset 0 0 0 1px rgba(128,136,240,${(0.12 + 0.16 * lit).toFixed(3)})`,
        }}>
          <svg width={17} height={17} viewBox="0 0 16 16" fill="none" stroke={lit > 0.5 ? '#a3aaff' : '#6f7280'} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d={st.icon} />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#ececf0', letterSpacing: '-0.01em' }}>{st.title}</div>
          <div style={{ fontSize: 13, color: '#7a7d87', marginTop: 3 }}>{st.sub}</div>
        </div>
        {/* 状态点：亮起时"通电" */}
        <div style={{
          marginLeft: 'auto', width: 9, height: 9, borderRadius: 5,
          background: lit > 0.02 ? `rgba(154,161,255,${(0.35 + 0.65 * lit).toFixed(3)})` : '#3a3b44',
          boxShadow: lit > 0.02 ? `0 0 ${(8 * lit).toFixed(1)}px rgba(154,161,255,${(0.9 * lit).toFixed(3)})` : 'none',
        }} />
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 46, fontWeight: 650, letterSpacing: '-0.035em', color: '#f1f1f4', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{st.value}</span>
        <span style={{ fontSize: 15, color: '#8a8d97' }}>{st.unit}</span>
      </div>
      {/* 吞吐条：亮起后填到位 */}
      <div style={{ marginTop: 16, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ width: `${(30 + 52 * lit + seed * 4).toFixed(1)}%`, height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, rgba(128,136,240,0.5), #9aa1ff)' }} />
      </div>
    </div>
  );
};

// 落点冲击环：落点帧起 14f 扩散变淡（与卡脉冲、光斑 surge 同帧，共振的第三个声部）
const ImpactRing: React.FC<{ frame: number; at: number; c: Pt }> = ({ frame, at, c }) => {
  if (frame < at || frame > at + 14) return null;
  const k = interpolate(frame, [at, at + 14], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <circle cx={c.x} cy={c.y} r={10 + 70 * k} fill="none" stroke="#c9ceff" strokeWidth={2.5 * (1 - k) + 0.5} strokeOpacity={0.75 * (1 - k)} />;
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
  // 飞线锚在卡片边沿（不从卡中心穿过文字）：A 上沿 → B 上沿；B 下沿 → C 右沿
  const L1 = { p0: { x: cA.x + 110, y: CARDS.A.y }, p1: { x: 820, y: 40 }, p2: { x: 1380, y: 110 }, p3: { x: cB.x, y: CARDS.B.y } };
  const L2 = { p0: { x: cB.x + 60, y: CARDS.B.y + CARD_H }, p1: { x: 1580, y: 820 }, p2: { x: 1380, y: 880 }, p3: { x: CARDS.C.x + CARD_W, y: cC.y } };

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg,#0e0f14 0%,#0a0b0f 100%)', overflow: 'hidden' }}>
      {/* 极淡点阵台面 */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.4,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1.2px)', backgroundSize: '36px 36px',
        WebkitMaskImage: 'radial-gradient(ellipse 65% 65% at 50% 50%, #000 20%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 65% 65% at 50% 50%, #000 20%, transparent 100%)',
      }} />
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
              background: `radial-gradient(circle, rgba(${o.rgb},${a.toFixed(3)}) 0%, rgba(${o.rgb},${(a * 0.5).toFixed(3)}) 42%, rgba(${o.rgb},0) 70%)`,
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
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="30%" stopColor="rgba(170,178,255,0.3)" />
            <stop offset="100%" stopColor="rgba(128,138,255,0)" />
          </radialGradient>
        </defs>
        <Flyline frame={frame} start={18} haloId={haloId} {...L1} />
        <Flyline frame={frame} start={52} haloId={haloId} {...L2} />
        <ImpactRing frame={frame} at={42} c={L1.p3} />
        <ImpactRing frame={frame} at={76} c={L2.p3} />
      </svg>

      <Vignette strength={0.55} inner={0.4} color="#030408" />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
