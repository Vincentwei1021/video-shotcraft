// unit-dot-swarm-regroup-v2 —— 单位点阵重组：320 个点（每点 ≈ 40 次渲染）三幕迁徙——
// 散布 → 按片型聚成三簇 → 列队成柱 → 拼成大数字「12,847」。同一批点，观众能跟着某一颗看它归队。
//
// 第二轮重设计（瓷白 · 信息图发布镜头）：
// - look = porcelain（冷白 · 钴蓝）。三组配色只用一个强调色：Promo 雾蓝灰 / Launch film 钴蓝（主角）/ Explainer 深海军蓝。
// - 点改成 20px 实心小珠（顶部受光微渐变 + 贴地软影），高速迁徙时按速度沿运动方向拉成胶囊（速度感），停下变回圆。
// - 文字层级：左上眉题（video-shotcraft 标志 + 字标 · Renders · Q3 2026）+ 84px 叙事标题，每幕换一句
//   （Every dot is 40 renders → Split by format → Stacked by format → Total renders），旧句上推出、新句从线下升起；
//   簇标签 / 柱顶数值 60px，片型名 32px。
// - 终幕：数字点按弧长连续分配给三组（Promo 拼出 12,8 / Launch film 接上 4 / Explainer 收尾 7），
//   数字本身就是一根构成条；下方三枚图例把颜色含义留在海报上。
//
// 时间表（30fps，共 192f）：
//   0–20    开场：点从画面中心向外逐颗弹出（按距中心错峰，先密后疏）并缓慢漂浮；标题升起
//   24–48   第一幕迁徙 → 三簇（随机错峰 8f，spring stiffness 150 / damping 13）；38f 起簇标签浮现
//   62–86   第二幕 → 三根柱（按行自底向上码放，越往上越快）；76f 起柱顶数值 + 套餐名
//   100–128 第三幕 → 数字（按目标 x 自左向右扫入）；118f 起图例与标题落定
//   128–192 hold 64f：极缓推镜 1 → 1.02
import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame } from 'remotion';
import { EASE, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const UNIT_DOT_SWARM_REGROUP_V2_DURATION = 192;

const L = LOOKS.porcelain;
const N = 320;
const R = 10; // 点半径

const M1 = 24;
const M2 = 62;
const M3 = 100;
const DUR = 24;
const STAG = 8;

// 三组：Promo 180 / Launch film 102 / Explainer 38
const GROUP_N = [180, 102, 38];
const GROUP_NAME = ['Promo', 'Launch film', 'Explainer'];
const GROUP_VAL = ['7,210', '4,102', '1,535'];
const COL: Array<[string, string]> = [
  ['#b9c3da', '#97a3c0'], // Promo：雾蓝灰
  ['#5b80ff', '#2348e8'], // Launch film：钴蓝（主角）
  ['#2b3554', '#121a33'], // Explainer：深海军蓝
];
const groupOf = (i: number) => (i < 180 ? 0 : i < 282 ? 1 : 2);
const idxIn = (i: number) => (i < 180 ? i : i < 282 ? i - 180 : i - 282);

const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
type P2 = [number, number];

// 第 0 幕：散布（中心略密）
const scatter = (i: number): P2 => [
  200 + ((rnd(i, 1) + rnd(i, 11)) / 2) * 1520,
  330 + ((rnd(i, 2) + rnd(i, 12)) / 2) * 640,
];
const drift = (i: number, f: number): P2 => [9 * Math.sin(f / 21 + rnd(i, 8) * 6.28), 7 * Math.cos(f / 27 + rnd(i, 9) * 6.28)];

// 第 1 幕：三簇（向日葵螺旋紧密排布：等面积、不重叠，读起来是"一团被码好的人"）
const CC: P2[] = [[520, 650], [1000, 650], [1420, 650]];
const VOGEL = 12.6; // r_k = VOGEL·√k ≈ 每点占 500px²
const CR = GROUP_N.map((n) => VOGEL * Math.sqrt(n) + R);
const cluster = (i: number): P2 => {
  const g = groupOf(i);
  const k = idxIn(i) + 0.5;
  const r = VOGEL * Math.sqrt(k);
  const a = k * 2.39996 + g;
  return [CC[g][0] + r * Math.cos(a), CC[g][1] + r * Math.sin(a)];
};

// 第 2 幕：三根柱（8 列网格自底向上）
const BASE = 900;
const BX = [520, 1000, 1420];
const SP = 23;
const row = (i: number) => Math.floor(idxIn(i) / 8);
const bar = (i: number): P2 => [BX[groupOf(i)] + ((idxIn(i) % 8) - 3.5) * SP, BASE - R - row(i) * SP];
const barTop = (g: number) => BASE - R - (Math.ceil(GROUP_N[g] / 8) - 1) * SP;

// 第 3 幕：数字 "12,847" —— 单线骨架等弧长 160 采样 → 法向 ±10.5 双排 = 320 点
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 48): P2[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
const GS = 1.08; // 字形放大
const GLYPHS: Array<{ x0: number; strokes: P2[][] }> = [
  { x0: 0, strokes: [[[58, 64], [112, 22], [112, 258]], [[52, 258], [172, 258]]] },
  { x0: 228, strokes: [[...arc(100, 86, 64, 198, 378), [36, 258], [172, 258]]] },
  { x0: 462, strokes: [[[22, 236], [4, 290]]] },
  { x0: 540, strokes: [arc(100, 76, 53, -90, 270, 56), arc(100, 198, 62, -90, 270, 64)] },
  { x0: 772, strokes: [[[142, 258], [142, 22], [26, 188], [118, 188]], [[164, 188], [200, 188]]] },
  { x0: 1004, strokes: [[[26, 24], [176, 24], [84, 258]]] },
];
const GW = (1004 + 200) * GS;
const GX = (1920 - GW) / 2;
const GY = 372;
const DIGIT: P2[] = (() => {
  const segs: Array<{ a: P2; b: P2; len: number }> = [];
  GLYPHS.forEach(({ x0, strokes }) =>
    strokes.forEach((s) => {
      for (let k = 0; k < s.length - 1; k++) {
        const a: P2 = [GX + (x0 + s[k][0]) * GS, GY + s[k][1] * GS];
        const b: P2 = [GX + (x0 + s[k + 1][0]) * GS, GY + s[k + 1][1] * GS];
        segs.push({ a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) });
      }
    }),
  );
  const total = segs.reduce((s, x) => s + x.len, 0);
  const out: P2[] = [];
  const half = N / 2;
  let si = 0;
  let acc = 0;
  for (let k = 0; k < half; k++) {
    const target = ((k + 0.5) / half) * total;
    while (si < segs.length - 1 && acc + segs[si].len < target) acc += segs[si++].len;
    const { a, b, len } = segs[si];
    const u = len > 0 ? (target - acc) / len : 0;
    const nx = -(b[1] - a[1]) / (len || 1);
    const ny = (b[0] - a[0]) / (len || 1);
    const x = a[0] + (b[0] - a[0]) * u;
    const y = a[1] + (b[1] - a[1]) * u;
    out.push([x + nx * 10.5, y + ny * 10.5], [x - nx * 10.5, y - ny * 10.5]);
  }
  return out;
})();

const mixHex = (a: string, b: string, t: number) => {
  const q = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const A = q(a);
  const B = q(b);
  return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * t)).join(',')})`;
};
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// 每颗点每幕的错峰
const stagOf = (i: number, phase: 0 | 1 | 2) => {
  if (phase === 0) return rnd(i, 7) * STAG;
  if (phase === 1) {
    const rows = Math.ceil(GROUP_N[groupOf(i)] / 8);
    return Math.sqrt(row(i) / Math.max(1, rows - 1)) * STAG + rnd(i, 13) * 2;
  }
  return ((DIGIT[i][0] - GX) / GW) * (STAG + 4) + rnd(i, 14) * 1.5;
};

const posAt = (i: number, f: number): P2 => {
  const mig = (start: number, phase: 0 | 1 | 2) =>
    spring({ frame: f - start - stagOf(i, phase), fps: 30, config: { damping: 13, stiffness: 150, mass: 0.8 }, durationInFrames: DUR, durationRestThreshold: 0.0001 });
  const d = drift(i, f);
  const s = scatter(i);
  let p: P2 = [s[0] + d[0], s[1] + d[1]];
  p = lerp2(p, cluster(i), mig(M1, 0));
  p = lerp2(p, bar(i), mig(M2, 1));
  p = lerp2(p, DIGIT[i], mig(M3, 2));
  return p;
};

// 开场弹出顺序：按距中心
const popDelay = (i: number) => {
  const s = scatter(i);
  const d = Math.hypot(s[0] - 960, (s[1] - 650) * 1.6) / 900;
  return EASE.out(Math.min(1, d)) * 10;
};

// 一段叙事标题：in 帧升起、out 帧上推出
const Headline: React.FC<{ text: string; inF: number; outF?: number }> = ({ text, inF, outF }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap' }}>
    <TextReveal text={text} by="word" variant="rise" start={inF} each={16} gap={3} out={outF !== undefined ? { start: outF, dur: 10 } : undefined} />
  </div>
);

export const UnitDotSwarmRegroupV2: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = mix(1, 1.02, ramp(frame, M3 + 20, UNIT_DOT_SWARM_REGROUP_V2_DURATION - M3 - 20, EASE.smooth));

  const clusterOp = Math.min(ramp(frame, 38, 12, EASE.out), 1 - ramp(frame, M2 - 2, 8, EASE.exit));
  const barOp = Math.min(ramp(frame, 78, 12, EASE.out), 1 - ramp(frame, M3 - 2, 8, EASE.exit));
  const legendIn = (k: number) => ramp(frame, 120 + k * 4, 14, EASE.snappy);

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.3 }} fill={null} />

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: '50% 52%' }}>
        {/* 眉题 + 叙事标题 */}
        <div style={{ position: 'absolute', left: 96, top: 92, display: 'flex', alignItems: 'center', gap: 12, ...type(32, 650, { caps: true }), color: L.ink3, opacity: ramp(frame, 0, 12, EASE.out) }}>
          <ShotcraftMark size={38} tone="light" style={{ marginTop: -2 }} />
          <span style={{ fontFamily: BRAND.font, fontWeight: 700, textTransform: 'none', letterSpacing: '0.03em', color: L.ink }}>{BRAND.name}</span>
          <span>· Renders · Q3 2026</span>
        </div>
        <div style={{ position: 'absolute', left: 90, top: 152, ...type(84, 760), color: L.ink }}>
          <Headline text="Every dot is 40 renders" inF={2} outF={M1 + 4} />
          <Headline text="Split by format" inF={M1 + 14} outF={M2 + 2} />
          <Headline text="Stacked by format" inF={M2 + 12} outF={M3 + 2} />
          <Headline text="Total renders" inF={M3 + 14} />
        </div>

        {/* 簇标签 */}
        {clusterOp > 0.01 && GROUP_NAME.map((n, g) => (
          <div key={n} style={{
            position: 'absolute', left: CC[g][0] - 200, top: CC[g][1] - CR[g] - 128, width: 400, textAlign: 'center',
            opacity: clusterOp, transform: `translateY(${mix(14, 0, ramp(frame, 38 + g * 3, 14, EASE.snappy)).toFixed(2)}px)`,
          }}>
            <div style={{ ...type(32, 650, { caps: true }), color: g === 1 ? L.accent : L.ink2 }}>{n}</div>
            <div style={{ ...type(60, 750), color: g === 1 ? L.accent : L.ink, marginTop: 4 }}>{GROUP_VAL[g]}</div>
          </div>
        ))}

        {/* 柱：基线 + 柱顶数值 + 套餐名 */}
        <div style={{
          position: 'absolute', left: 300, width: 1340, top: BASE + 2, height: 3, borderRadius: 2, background: L.ink,
          transform: `scaleX(${Math.min(ramp(frame, M2 + 4, 18, EASE.snappy), 1 - ramp(frame, M3 - 2, 10, EASE.exit))})`, transformOrigin: '0% 50%',
          opacity: 0.85,
        }} />
        {barOp > 0.01 && GROUP_NAME.map((n, g) => (
          <React.Fragment key={n}>
            <div style={{
              position: 'absolute', left: BX[g] - 200, top: barTop(g) - R - 92, width: 400, textAlign: 'center', ...type(60, 750),
              color: g === 1 ? L.accent : L.ink, opacity: barOp, transform: `translateY(${mix(16, 0, ramp(frame, 78 + g * 3, 14, EASE.snappy)).toFixed(2)}px)`,
            }}>{GROUP_VAL[g]}</div>
            <div style={{
              position: 'absolute', left: BX[g] - 200, top: BASE + 22, width: 400, textAlign: 'center', ...type(32, 650, { caps: true }),
              color: g === 1 ? L.accent : L.ink2, opacity: barOp,
            }}>{n}</div>
          </React.Fragment>
        ))}

        {/* 点 */}
        {Array.from({ length: N }, (_, i) => {
          const p = posAt(i, frame);
          const q = posAt(i, frame - 1);
          const vx = p[0] - q[0];
          const vy = p[1] - q[1];
          const sp = Math.hypot(vx, vy);
          const stretch = Math.min(sp * 0.45, 20); // 速度拉伸（px）
          const ang = (Math.atan2(vy, vx) * 180) / Math.PI;
          const pop = spring({ frame: frame - popDelay(i), fps: 30, config: { damping: 12, stiffness: 200 } });
          const g = groupOf(i);
          const w = 2 * R + stretch;
          // 落进数字后统一收拢成钴蓝（数字是终幕主角；构成信息交给下方图例）
          const land = ramp(frame, M3 + stagOf(i, 2) + 10, 12, EASE.out);
          const c0 = land > 0 ? mixHex(COL[g][0], '#6a8bff', land) : COL[g][0];
          const c1 = land > 0 ? mixHex(COL[g][1], '#2348e8', land) : COL[g][1];
          return (
            <div key={i} style={{
              position: 'absolute', left: p[0] - w / 2, top: p[1] - R, width: w, height: 2 * R, borderRadius: R,
              background: `linear-gradient(180deg, ${c0}, ${c1})`,
              boxShadow: `0 ${(2 + stretch * 0.05).toFixed(1)}px ${(4 + stretch * 0.1).toFixed(1)}px ${alpha(L.shadow, 0.16)}, inset 0 1px 0 rgba(255,255,255,0.35)`,
              transform: `rotate(${sp > 0.3 ? ang.toFixed(2) : 0}deg) scale(${pop.toFixed(4)}, ${(pop * (1 - Math.min(stretch / 120, 0.18))).toFixed(4)})`,
            }} />
          );
        })}

        {/* 图例 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 790, display: 'flex', justifyContent: 'center', gap: 64 }}>
          {GROUP_NAME.map((n, g) => (
            <div key={n} style={{
              display: 'flex', alignItems: 'center', gap: 16, opacity: legendIn(g),
              transform: `translateY(${mix(18, 0, legendIn(g)).toFixed(2)}px)`,
            }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: `linear-gradient(180deg, ${COL[g][0]}, ${COL[g][1]})` }} />
              <span style={{ ...type(36, 650), color: g === 1 ? L.accent : L.ink }}>{n}</span>
              <span style={{ ...type(36, 450), color: L.ink2 }}>{GROUP_VAL[g]}</span>
            </div>
          ))}
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 862, textAlign: 'center', ...type(32, 500), color: L.ink3,
          opacity: ramp(frame, 132, 14, EASE.out),
        }}>
          Each dot ≈ 40 renders
        </div>
      </div>
    </AbsoluteFill>
  );
};
