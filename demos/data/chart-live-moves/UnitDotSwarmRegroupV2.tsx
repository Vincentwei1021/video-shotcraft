// unit-dot-swarm-regroup-v2 —— 单位点阵重组 v2（批次 6 "改改再看" 重做）
// 相对 v1 的加码：点数 200→320、点径 7→9；真实叙事语境：图例 "Each dot ≈ 40 customers"，
// 聚簇时每簇上方浮真标签（Free · 7,210 / Pro · 4,102 / Enterprise · 1,535，Pro 琥珀主角色），
// 列队成柱时柱底浮真轴标 + 基线；终幕点阵聚成 "12,847"，
// 下方浮 "Total customers"。阶段间 hold 更短（14/38/36f 间隔）、迁徙 spring 更冲
// （stiffness 110→150、DUR 26→20）。收尾 f126 后真静止 44f。
// 帧确定性：伪随机全用 sin 散列，无 Math.random / Date.now。
//
// 质感升级：调试标题换成页面级标题；柔光背景 + 颗粒；点改为带受光高光的小球 + 统一接触影；
// 开场点群淡入并缓慢漂浮（不是死点阵）；三次迁徙各有方向性的错峰（簇按随机、柱按行自底向上、
// 数字按目标 x 自左向右扫），高速段每颗点拖一条按速度计算的拖影；终幕数字从方块位图换成
// 单线骨架等弧长采样的双排点（恰好 320 颗，无重叠），落位时颜色收拢成同一墨色，
// 下方 "Total customers" + 三段构成条把三组颜色的含义留在画面里。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, Grain, mix, ramp, tracking } from '../../_fixtures/Polish';

export const UNIT_DOT_SWARM_REGROUP_V2_DURATION = 170; // f126 后真静止 44f

const AMBER = '#d97706';
const FPS = 30;
const N = 320;
const DOT_R = 9;

const M1 = 12; // 聚簇
const M2 = 48; // 列队成柱
const M3 = 84; // 收拢成 12,847
const DUR = 20;
const STAG = 8;

// 三组配色：Free 冷灰 / Pro 琥珀（主角）/ Enterprise 墨色；[亮面, 暗面]
const COLORS: Array<[string, string]> = [
  ['#c3c6cf', '#9a9ea9'],
  ['#f6a53a', '#c86a04'],
  ['#4a4d57', '#25272e'],
];
const INK_DOT: [string, string] = ['#3d4049', '#1b1c21']; // 终幕数字统一墨色

// 帧确定伪随机
const rnd = (i: number, salt: number): number => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// —— 阶段 0：散布（中心略密的星群：两次均匀取平均 ≈ 三角分布） ——
const scatter = (i: number): [number, number] => [
  300 + ((rnd(i, 1) + rnd(i, 11)) / 2) * 1320,
  340 + ((rnd(i, 2) + rnd(i, 12)) / 2) * 600,
];
// 开场漂浮：每颗点独立的慢速小幅漂移（迁徙开始后被 lerp 带走）
const drift = (i: number, f: number): [number, number] => [
  7 * Math.sin(f / 23 + rnd(i, 8) * 6.28),
  6 * Math.cos(f / 29 + rnd(i, 9) * 6.28),
];

// —— 分组：Free 180 / Pro 102 / Enterprise 38（每点 ≈ 40 customers） ——
const groupOf = (i: number): number => (i < 180 ? 0 : i < 282 ? 1 : 2);
const idxInGroup = (i: number): number => (i < 180 ? i : i < 282 ? i - 180 : i - 282);
const GROUP_N = [180, 102, 38];
const GROUP_NAME = ['Free', 'Pro', 'Enterprise'];
const GROUP_VAL = ['7,210', '4,102', '1,535'];

// —— 阶段 1：三簇（圆盘散布，sqrt 半径均匀） ——
const CLUSTER_C: [number, number][] = [
  [520, 640],
  [980, 590],
  [1400, 660],
];
const CLUSTER_R = GROUP_N.map((n) => 58 + n * 0.46); // 141 / 105 / 75
const cluster = (i: number): [number, number] => {
  const g = groupOf(i);
  const r = Math.sqrt(rnd(i, 3)) * CLUSTER_R[g];
  const a = rnd(i, 4) * Math.PI * 2;
  return [CLUSTER_C[g][0] + r * Math.cos(a), CLUSTER_C[g][1] + r * Math.sin(a)];
};

// —— 阶段 2：三根柱（8 点宽网格自底向上码放，底边对齐） ——
const BAR_BASE = 860;
const BAR_X = [520, 980, 1400];
const SPACING = 20;
const barRow = (i: number) => Math.floor(idxInGroup(i) / 8);
const bar = (i: number): [number, number] => {
  const g = groupOf(i);
  const col = idxInGroup(i) % 8;
  return [BAR_X[g] + (col - 3.5) * SPACING, BAR_BASE - barRow(i) * SPACING];
};
const BAR_TOP = (g: number) => BAR_BASE - (Math.ceil(GROUP_N[g] / 8) - 1) * SPACING;

// —— 阶段 3：数字 "12,847" —— 单线骨架（每字 200×280 局部坐标）→ 等弧长 160 个采样 → 法向 ±9.5 双排 = 320 点
type P2 = [number, number];
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 48): P2[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
const GLYPHS: Array<{ x0: number; strokes: P2[][] }> = [
  { x0: 335, strokes: [[[58, 64], [112, 22], [112, 258]], [[52, 258], [172, 258]]] }, // 1
  { x0: 575, strokes: [[...arc(100, 86, 64, 198, 378), [36, 258], [172, 258]]] }, // 2
  { x0: 820, strokes: [[[22, 236], [4, 290]]] }, // ,
  { x0: 905, strokes: [arc(100, 76, 53, -90, 270, 56), arc(100, 198, 62, -90, 270, 64)] }, // 8
  { x0: 1145, strokes: [[[142, 258], [142, 22], [26, 188], [118, 188]], [[166, 188], [186, 188]]] }, // 4（横笔在竖笔前断开，避免交叉处堆点）
  { x0: 1385, strokes: [[[26, 24], [176, 24], [84, 258]]] }, // 7
];
const Y0 = 380;
const DIGIT_PTS: P2[] = (() => {
  // 展平所有笔画（世界坐标）+ 累积弧长；笔画之间不相连（跳过空隙）
  const segs: Array<{ a: P2; b: P2; len: number }> = [];
  GLYPHS.forEach(({ x0, strokes }) =>
    strokes.forEach((s) => {
      for (let k = 0; k < s.length - 1; k++) {
        const a: P2 = [x0 + s[k][0], Y0 + s[k][1]];
        const b: P2 = [x0 + s[k + 1][0], Y0 + s[k + 1][1]];
        segs.push({ a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) });
      }
    }),
  );
  const L = segs.reduce((s, x) => s + x.len, 0);
  const out: P2[] = [];
  const M = N / 2;
  let si = 0;
  let acc = 0;
  for (let k = 0; k < M; k++) {
    const target = ((k + 0.5) / M) * L;
    while (si < segs.length - 1 && acc + segs[si].len < target) acc += segs[si++].len;
    const { a, b, len } = segs[si];
    const u = len > 0 ? (target - acc) / len : 0;
    const nx = -(b[1] - a[1]) / (len || 1);
    const ny = (b[0] - a[0]) / (len || 1);
    const x = a[0] + (b[0] - a[0]) * u;
    const y = a[1] + (b[1] - a[1]) * u;
    out.push([x + nx * 9.5, y + ny * 9.5], [x - nx * 9.5, y - ny * 9.5]);
  }
  return out;
})();
const digit = (i: number): P2 => DIGIT_PTS[i];
// 终幕扫入顺序：按目标 x 自左向右（0..1）
const DIGIT_X_MIN = 335;
const DIGIT_X_SPAN = 1385 + 200 - 335;

const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const fade = (frame: number, inA: number, inB: number, outA?: number, outB?: number): number => {
  const fi = ramp(frame, inA, inB - inA, EASE.out);
  if (outA === undefined || outB === undefined) return fi;
  return Math.min(fi, 1 - ramp(frame, outA, outB - outA, EASE.exit));
};

// 每颗点每次迁徙的错峰（帧）：簇=随机；柱=按行自底向上（越往上越快，发牌式）；数字=按目标 x 自左向右
const stagOf = (i: number, phase: 0 | 1 | 2) => {
  if (phase === 0) return rnd(i, 7) * STAG;
  if (phase === 1) {
    const rows = Math.ceil(GROUP_N[groupOf(i)] / 8);
    return Math.sqrt(barRow(i) / Math.max(1, rows - 1)) * STAG + rnd(i, 13) * 2;
  }
  return ((digit(i)[0] - DIGIT_X_MIN) / DIGIT_X_SPAN) * (STAG + 2) + rnd(i, 14) * 1.5;
};

const posAt = (i: number, f: number): { p: P2; m3: number } => {
  const mig = (start: number, phase: 0 | 1 | 2) =>
    spring({
      frame: f - start - stagOf(i, phase),
      fps: FPS,
      config: { damping: 11.5, stiffness: 150, mass: 0.8 },
      durationInFrames: DUR,
      durationRestThreshold: 0.0001,
    });
  const d = drift(i, f);
  let p: P2 = [scatter(i)[0] + d[0], scatter(i)[1] + d[1]];
  p = lerp2(p, cluster(i), mig(M1, 0));
  p = lerp2(p, bar(i), mig(M2, 1));
  const m3 = mig(M3, 2);
  p = lerp2(p, digit(i), m3);
  return { p, m3 };
};

const hexMix = (a: string, b: string, t: number) => {
  const q = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const A = q(a);
  const B = q(b);
  return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * Math.min(1, Math.max(0, t)))).join(',')})`;
};

export const UnitDotSwarmRegroupV2: React.FC = () => {
  const frame = useCurrentFrame();

  const dots = Array.from({ length: N }, (_, i) => {
    const { p, m3 } = posAt(i, frame);
    const prev = posAt(i, frame - 1).p;
    const g = groupOf(i);
    const ink = ramp(m3, 0.55, 0.45, EASE.out); // 落位过半后颜色收拢成墨色
    const pop = ramp(frame, rnd(i, 10) * 10, 8, EASE.overshoot); // 开场逐颗冒出
    return { p, prev, g, ink, pop };
  });

  // 各阶段标签透明度（迁徙完成后浮现，下一次迁徙启动即撤）
  const clusterLabelOp = fade(frame, 38, 46, M2, M2 + 8);
  const barLabelOp = fade(frame, 72, 80, M3, M3 + 8);
  const captionOp = fade(frame, 114, 126);
  const headIn = ramp(frame, 0, 14, EASE.out);

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.35 }} />

      {/* 页面标题 */}
      <div style={{ position: 'absolute', left: 120, top: 92, opacity: headIn, transform: `translateY(${mix(10, 0, headIn)}px)` }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: G.ink3, letterSpacing: tracking(20, true), textTransform: 'uppercase' }}>
          Customers · Q3 2026
        </div>
        <div style={{ marginTop: 8, fontSize: 56, fontWeight: 700, color: G.ink1, letterSpacing: tracking(56), lineHeight: 1.05 }}>
          Plan mix
        </div>
      </div>

      {/* 图例：每点的含义（全程挂角） */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          bottom: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 24,
          fontWeight: 500,
          color: G.ink2,
          opacity: headIn,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: `radial-gradient(circle at 35% 30%, ${COLORS[0][0]}, ${COLORS[0][1]})`,
            boxShadow: '0 1px 2px rgba(16,18,26,0.18)',
          }}
        />
        Each dot ≈ 40 customers
      </div>

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          {[...COLORS, INK_DOT].map(([hi, lo], k) => (
            <radialGradient key={k} id={`uds${k}`} cx="0.36" cy="0.3" r="0.75">
              <stop offset="0" stopColor={hi} />
              <stop offset="1" stopColor={lo} />
            </radialGradient>
          ))}
          <filter id="udsShadow" x="-10%" y="-10%" width="120%" height="125%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" floodColor="#10121a" floodOpacity="0.2" />
          </filter>
        </defs>
        {/* 拖影：按本帧位移画一段同色圆头线（静止时长度 0 不画） */}
        <g opacity={0.24}>
          {dots.map(({ p, prev, g, ink }, i) => {
            const dx = p[0] - prev[0];
            const dy = p[1] - prev[1];
            const sp = Math.hypot(dx, dy);
            if (sp < 6) return null;
            const k = 0.75; // 拖影长度 = 0.75 帧位移
            return (
              <line
                key={`s${i}`}
                x1={p[0] - dx * k}
                y1={p[1] - dy * k}
                x2={p[0]}
                y2={p[1]}
                stroke={hexMix(COLORS[g][1], INK_DOT[1], ink)}
                strokeWidth={DOT_R * 1.7}
                strokeLinecap="round"
              />
            );
          })}
        </g>
        <g filter="url(#udsShadow)">
          {dots.map(({ p, g, ink, pop }, i) => (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r={DOT_R * pop} fill={`url(#uds${g})`} />
              {ink > 0 && <circle cx={p[0]} cy={p[1]} r={DOT_R * pop} fill="url(#uds3)" opacity={ink} />}
            </g>
          ))}
        </g>
      </svg>

      {/* 阶段 1：簇标签（名称 + 真人数，Pro 琥珀） */}
      {clusterLabelOp > 0 &&
        CLUSTER_C.map((c, g) => (
          <div
            key={`cl${g}`}
            style={{
              position: 'absolute',
              left: c[0] - 200,
              top: c[1] - CLUSTER_R[g] - 92,
              width: 400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              opacity: clusterLabelOp,
              transform: `translateY(${mix(10, 0, clusterLabelOp)}px)`,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 600, color: g === 1 ? '#b45309' : G.ink2, letterSpacing: tracking(22, true), textTransform: 'uppercase' }}>
              {GROUP_NAME[g]}
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: g === 1 ? '#b45309' : G.ink1, letterSpacing: tracking(40), fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {GROUP_VAL[g]}
            </div>
          </div>
        ))}

      {/* 阶段 2：柱顶数值 + 柱底基线 + 真轴标 */}
      {barLabelOp > 0 && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 380,
              width: 1160 * barLabelOp,
              top: BAR_BASE + 18,
              height: 1.5,
              background: G.hairlineStrong,
            }}
          />
          {BAR_X.map((x, g) => (
            <React.Fragment key={`bl${g}`}>
              <div
                style={{
                  position: 'absolute',
                  left: x - 150,
                  top: BAR_TOP(g) - 58,
                  width: 300,
                  textAlign: 'center',
                  fontSize: 28,
                  fontWeight: 650,
                  color: g === 1 ? '#b45309' : G.ink1,
                  fontVariantNumeric: 'tabular-nums',
                  opacity: barLabelOp,
                  transform: `translateY(${mix(8, 0, barLabelOp)}px)`,
                }}
              >
                {GROUP_VAL[g]}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: x - 150,
                  top: BAR_BASE + 34,
                  width: 300,
                  textAlign: 'center',
                  fontSize: 26,
                  fontWeight: g === 1 ? 650 : 500,
                  color: g === 1 ? '#b45309' : G.ink2,
                  opacity: barLabelOp,
                }}
              >
                {GROUP_NAME[g]}
              </div>
            </React.Fragment>
          ))}
        </>
      )}

      {/* 终幕：数字下方真文案 + 三段构成条（留住三种颜色的含义） */}
      {captionOp > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: 1920,
            top: Y0 + 280 + 76,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            opacity: captionOp,
            transform: `translateY(${mix(12, 0, captionOp)}px)`,
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 600, color: G.ink2, letterSpacing: tracking(34, false) }}>Total customers</div>
          <div style={{ display: 'flex', gap: 4, width: 520 * mix(0.6, 1, captionOp), height: 8 }}>
            {GROUP_N.map((n, g) => (
              <div
                key={g}
                style={{
                  flex: n,
                  borderRadius: 4,
                  background: `linear-gradient(180deg, ${COLORS[g][0]}, ${COLORS[g][1]})`,
                }}
              />
            ))}
          </div>
        </div>
      )}
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
