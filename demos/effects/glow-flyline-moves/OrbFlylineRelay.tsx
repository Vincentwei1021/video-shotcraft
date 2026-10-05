// orb-flyline-relay｜光斑飞线接力——氛围层（光斑）与事件层（飞线）同帧共振：飞线落点那一帧，
// 节点背后的光斑一起涨亮一拍，背景给前景"搭腔"。
//
// 第二轮重设计（午夜接力 · 三颗玻璃节点）：
// - look = midnight（深蓝夜 · 电光蓝 · 青）。三张灰卡换成 video-shotcraft 出片流程的三颗 240px 玻璃节点
//   「Brief → Storyboard → Ship」（品牌轮由语音 AI「Tessel」的 Listen → Understand → Act 换来），横向起伏排布（中间高、两边低），飞线是节点之间的
//   一跳一跳的弧——读作"接力"而不是连线图。每颗节点背后各有一团 720–820px 的光斑（电光蓝 / 青 / 堇蓝），
//   连同节点一起轻微漂移。
// - 共振（组合命门）：飞线落点帧 = 节点点亮帧 = 背后光斑 surge 起点帧（同一个常量），光斑 5f 涨到
//   1+1.6 倍亮度并放大 12%、15f 消散；节点同帧描边脉冲 + 一圈冲击环。错开 ≥2f 就读不出"搭腔"。
// - 飞线：白芯 + 青蓝两层辉光，亮头领跑带彗尾，生长曲线起步蓄力、进站减速；到站 4f 后整条线 14f 消散
//   成一串细点虚线（能量已经交出去，只留下路径），与 flyline-arc 的"常驻线"区分。
// - 收束：C 点亮后 72px 标题「Say it once. video-shotcraft does the rest.」逐词升起（品牌名用青色），
//   光斑 110–140f out-sine 收敛冻结，末 25f 真静止。
// - 镜头：全程 1→1.04 极缓推进，焦点随接力从 A 漂到 C（起止无速度突变）。
//
// 时间表（30fps，共 165f）：
//   0–20     光斑亮起，三颗节点错峰升起（0 / 4 / 8f）；A 10f 点亮（自带光斑）
//   22–48    线 1 A→B（26f）
//   48       B 点亮 = B 光斑 surge（同帧）
//   58–82    线 2 B→C（24f）
//   82       C 点亮 = C 光斑 surge（同帧）
//   92–122   标题逐词升起；两条线已消散为细点虚线
//   110–140  光斑漂移 out-sine 收敛冻结
//   140–165  真静止 hold
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';
import { BRAND } from '../../_fixtures/Brand';

export const ORB_FLYLINE_RELAY_DURATION = 165; // 5.5s：动作 f98 前结束、光斑 f140 冻结、末 25f 真静止

const L = LOOKS.midnight;
const TAU = Math.PI * 2;

type Pt = { x: number; y: number };
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};
const grow = bezier(0.45, 0, 0.2, 1);

// 漂移时间：0–110 同速，110–140 out-sine 收敛（起始斜率 = 1），之后冻结
const T0 = 110, TS = 30;
const drift = (f: number) => (f <= T0 ? f : T0 + (2 * TS / Math.PI) * Math.sin((Math.PI / 2) * Math.min(1, (f - T0) / TS)));

// ───────────── 节点 ─────────────
const R = 120;
const LIT_B = 48; // 线 1 落点 = B 点亮 = B 光斑 surge
const LIT_C = 82; // 线 2 落点 = C 点亮 = C 光斑 surge

type NodeDef = { x: number; y: number; label: string; sub: string; litAt: number; inAt: number; orb: string; orbSize: number; seed: number; icon: React.ReactNode };
const ICON_STROKE = { fill: 'none', strokeWidth: 7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const NODES: NodeDef[] = [
  {
    x: 400, y: 470, label: 'Brief', sub: 'One prompt · 1 page', litAt: 10, inAt: 0, orb: '#3d63ff', orbSize: 820, seed: 1,
    icon: <g {...ICON_STROKE}><rect x={-18} y={-44} width={36} height={60} rx={18} /><path d="M-34 0 C -34 22 -18 34 0 34 C 18 34 34 22 34 0 M0 34 V48" /></g>,
  },
  {
    x: 960, y: 380, label: 'Storyboard', sub: '8 shots · beat-synced', litAt: LIT_B, inAt: 4, orb: L.accent2, orbSize: 760, seed: 2,
    icon: <g {...ICON_STROKE}><path d="M0 -44 C 4 -14 14 -4 44 0 C 14 4 4 14 0 44 C -4 14 -14 4 -44 0 C -14 -4 -4 -14 0 -44 Z" /><path d="M30 -38 v14 M23 -31 h14" /></g>,
  },
  {
    x: 1520, y: 470, label: 'Ship', sub: 'launch-film.mp4', litAt: LIT_C, inAt: 8, orb: '#7f74ff', orbSize: 720, seed: 3,
    icon: <g {...ICON_STROKE}><path d="M-40 4 L 38 -34 L 14 40 L 2 12 Z M2 12 L 38 -34" /></g>,
  },
];

// 涨亮一拍：5f out 起升，15f 消散
const surge = (f: number, at: number) => (f < at ? 0 : f <= at + 5 ? ramp(f, at, 5, EASE.out) : 1 - ramp(f, at + 5, 15, EASE.swift));

const edge = (n: NodeDef, deg: number): Pt => ({ x: n.x + R * Math.cos((deg * Math.PI) / 180), y: n.y + R * Math.sin((deg * Math.PI) / 180) });

const LINES = [
  { start: LIT_B - 26, dur: 26, p0: edge(NODES[0], -48), p3: edge(NODES[1], 200), lift: 170 },
  { start: LIT_C - 24, dur: 24, p0: edge(NODES[1], -20), p3: edge(NODES[2], 228), lift: 170 },
].map((l) => {
  const dx = l.p3.x - l.p0.x;
  const top = Math.min(l.p0.y, l.p3.y) - l.lift;
  return { ...l, p1: { x: l.p0.x + dx * 0.22, y: top }, p2: { x: l.p0.x + dx * 0.78, y: top } };
});

const N = 80;
const Flyline: React.FC<{ f: number; ln: typeof LINES[number] }> = ({ f, ln }) => {
  const { start, dur, p0, p1, p2, p3 } = ln;
  if (f < start) return null;
  const e = grow(Math.min(1, (f - start) / dur));
  const growing = f < start + dur;
  const fade = 1 - ramp(f, start + dur + 4, 14, EASE.swift); // 到站 4f 后整条消散
  const dots = ramp(f, start + dur + 6, 14, EASE.out); // 留下细点虚线路径
  const pts: Pt[] = [];
  const n = Math.max(2, Math.ceil(e * N) + 1);
  for (let i = 0; i < n; i++) pts.push(bez(p0, p1, p2, p3, Math.min(i / N, e)));
  const head = bez(p0, p1, p2, p3, e);
  pts[pts.length - 1] = head;
  const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const segs = [];
  if (fade > 0) {
    for (let i = 0; i < pts.length - 1; i++) {
      const k = Math.min(i / N, e) / Math.max(e, 0.001);
      segs.push(<line key={i} x1={pts[i].x} y1={pts[i].y} x2={pts[i + 1].x} y2={pts[i + 1].y} stroke="#f2f7ff" strokeWidth={3.2} strokeLinecap="butt" strokeOpacity={(0.12 + 0.88 * k * k) * fade} />);
    }
  }
  const comet = pts.slice(Math.max(0, pts.length - 9)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const full = Array.from({ length: 23 }, (_, i) => bez(p0, p1, p2, p3, (i + 1) / 24));
  return (
    <g>
      {dots > 0 && full.map((p, i) => <circle key={`d${i}`} cx={p.x} cy={p.y} r={2.6} fill={L.accent} opacity={dots * 0.55} />)}
      {fade > 0 && (
        <g>
          <polyline points={poly} fill="none" stroke={L.accent} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.12 * fade} />
          <polyline points={poly} fill="none" stroke={L.accent2} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.3 * fade} />
          {segs}
        </g>
      )}
      {growing && (
        <g>
          <polyline points={comet} fill="none" stroke="#ffffff" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.6} />
          <circle cx={head.x} cy={head.y} r={44} fill="url(#relayHalo)" />
          <circle cx={head.x} cy={head.y} r={7.5} fill="#ffffff" />
        </g>
      )}
    </g>
  );
};

const Node: React.FC<{ f: number; n: NodeDef; ox: number; oy: number }> = ({ f, n, ox, oy }) => {
  const enter = ramp(f, n.inAt, 22, EASE.snappy);
  const lit = ramp(f, n.litAt, 8, EASE.out);
  const pulse = f < n.litAt ? 0 : f <= n.litAt + 6 ? ramp(f, n.litAt, 6, EASE.out) : mix(1, 0.35, ramp(f, n.litAt + 6, 16, EASE.out));
  const ring = n.litAt > 20 ? ramp(f, n.litAt, 20, EASE.linear) : 0;
  const x = n.x + ox, y = n.y + oy + (1 - enter) * 40;
  const c = n.orb;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity: enter }}>
      {/* 冲击环 */}
      {ring > 0 && ring < 1 && (
        <div style={{
          position: 'absolute', left: x, top: y, width: 0, height: 0,
        }}>
          <div style={{
            position: 'absolute', left: -R * mix(1, 2.3, EASE.snappy(ring)), top: -R * mix(1, 2.3, EASE.snappy(ring)),
            width: 2 * R * mix(1, 2.3, EASE.snappy(ring)), height: 2 * R * mix(1, 2.3, EASE.snappy(ring)), borderRadius: '50%',
            border: `${mix(4, 1, ring).toFixed(2)}px solid ${alpha('#e9f6ff', 0.8 * (1 - ring))}`, boxSizing: 'border-box',
          }} />
        </div>
      )}
      {/* 玻璃节点 */}
      <div style={{
        position: 'absolute', left: x - R, top: y - R, width: 2 * R, height: 2 * R, borderRadius: '50%',
        background: `radial-gradient(circle at 50% 28%, ${alpha('#2a3a66', 0.92)} 0%, ${alpha('#121a30', 0.94)} 62%, ${alpha('#0b1122', 0.96)} 100%)`,
        boxShadow: `inset 0 0 0 1.5px ${alpha(lit > 0 ? c : '#a0beff', 0.14 + 0.66 * pulse)}, inset 0 2px 0 rgba(255,255,255,0.12), ` +
          `inset 0 0 ${(50 * lit).toFixed(1)}px ${alpha(c, 0.28 * lit)}, 0 0 ${(70 * pulse).toFixed(1)}px ${alpha(c, 0.5 * pulse)}, 0 40px 80px -30px rgba(0,0,0,0.9)`,
      }}>
        <svg width={2 * R} height={2 * R} viewBox="-120 -120 240 240" style={{ position: 'absolute', inset: 0 }}>
          <g stroke={lit > 0.5 ? '#ffffff' : L.ink3} style={{ filter: lit > 0.5 ? `drop-shadow(0 0 10px ${alpha(c, 0.8)})` : undefined }}>{n.icon}</g>
        </svg>
      </div>
      {/* 标签 */}
      <div style={{ position: 'absolute', left: x - 260, width: 520, top: y + R + 34, textAlign: 'center' }}>
        <div style={{ ...type(52, 650), color: lit > 0.5 ? L.ink : L.ink3 }}>{n.label}</div>
        <div style={{ ...type(32, 450), color: lit > 0.5 ? L.ink2 : alpha(L.ink3, 0.7), marginTop: 10, ...(n.label === 'Ship' ? { fontFamily: FONT.mono, letterSpacing: '0em' } : null) }}>{n.sub}</div>
      </div>
    </div>
  );
};

export const OrbFlylineRelay: React.FC = () => {
  const f = useCurrentFrame();
  const t = drift(f);
  const cam = 1 + 0.04 * ramp(f, 0, 140, EASE.smooth);
  const fx = mix(700, 1200, ramp(f, 10, 100, EASE.smooth));
  const orbIn = 0.3 + 0.7 * ramp(f, 0, 20, EASE.out);

  // 节点与光斑一起轻漂（节点漂得少 = 视差：光斑在后）
  const offs = NODES.map((n) => {
    const a = h(n.seed * 7 + 1) * TAU, b = h(n.seed * 7 + 2) * TAU;
    return {
      ox: 120 * Math.sin((TAU * t) / (118 + n.seed * 9) + a), oy: 90 * Math.sin((TAU * t) / (134 - n.seed * 11) + b),
    };
  });

  const nodeOffs = offs.map((o) => ({ ox: o.ox * 0.22, oy: o.oy * 0.22 })); // 节点只漂 22%：光斑在后、节点在前的视差

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: -0.05 }} fill={null} intensity={0.8} />

      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${fx}px 470px` }}>
        {/* 光斑：每颗节点背后一团；点亮后常亮，落点帧同帧 surge */}
        {NODES.map((n, i) => {
          const s = surge(f, n.litAt);
          const base = n.litAt <= 10 ? 0.4 + 0.6 * ramp(f, n.litAt, 10, EASE.out) : 0.35 + 0.65 * ramp(f, n.litAt, 8, EASE.out);
          const k = (0.5 * base) * (1 + 1.6 * s);
          const sz = n.orbSize * (1 + 0.12 * s);
          const x = n.x + offs[i].ox, y = n.y + offs[i].oy;
          return (
            <div key={i} style={{
              position: 'absolute', left: x - sz / 2, top: y - sz / 2, width: sz, height: sz, borderRadius: '50%', mixBlendMode: 'screen', opacity: orbIn,
              background: `radial-gradient(circle closest-side, ${alpha(n.orb, Math.min(1, k))} 0%, ${alpha(n.orb, Math.min(1, k * 0.55))} 25%, ${alpha(n.orb, k * 0.22)} 52%, ${alpha(n.orb, k * 0.06)} 76%, ${alpha(n.orb, 0)} 100%)`,
            }} />
          );
        })}

        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <radialGradient id="relayHalo">
              <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
              <stop offset="30%" stopColor={alpha(L.accent2, 0.35)} />
              <stop offset="100%" stopColor={alpha(L.accent, 0)} />
            </radialGradient>
          </defs>
          {/* 飞线坐标跟随节点漂移：端点按节点偏移整体平移 */}
          {LINES.map((ln, i) => {
            const a = nodeOffs[i], b = nodeOffs[i + 1];
            const shift = (p: Pt, w: number) => ({ x: p.x + mix(a.ox, b.ox, w), y: p.y + mix(a.oy, b.oy, w) });
            const moved = { ...ln, p0: shift(ln.p0, 0), p1: shift(ln.p1, 0.25), p2: shift(ln.p2, 0.75), p3: shift(ln.p3, 1) };
            return <Flyline key={i} f={f} ln={moved} />;
          })}
        </svg>

        {NODES.map((n, i) => <Node key={i} f={f} n={n} ox={nodeOffs[i].ox} oy={nodeOffs[i].oy} />)}
      </AbsoluteFill>

      {/* 收束标题（不随镜头推进，稳在画面下缘） */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 862, textAlign: 'center' }}>
        <TextReveal text={`Say it once. ${BRAND.name} does the rest.`} by="word" variant="rise" start={92} each={18} gap={3.5}
          style={{ ...type(72, 700), color: L.ink }}
          unitStyle={(i) => (i === 3 ? { color: L.accent2 } : {})} />
      </div>
    </AbsoluteFill>
  );
};
