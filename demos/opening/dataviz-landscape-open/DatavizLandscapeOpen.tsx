import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {EASE, FONT, Grain, Vignette, ramp} from '../../_fixtures/Polish';

/**
 * DatavizLandscapeOpen — 暗场支流线束地景开场
 * 配方卡: references/shots/opening/dataviz-landscape-open.md
 *
 * 隐喻: 无数团队工作流(支流)汇成一个产品(主干)。
 * 三层景深: 近景大虚焦流过 / 中景标签清晰可读 / 远景渐隐。
 * 相机: 低速匀稳横移 + 视差 + 极缓 zoom, 收尾不急刹。
 * 质感: 带冷色相的深场 + 冷白线 + 唯一强调色(主干/汇点/图钉);
 *   支流沿流向渐亮(源头淡、汇入处亮), 生长期线头带一颗小光点;
 *   标签 = 图钉弹出 + 深色胶囊衬底的等宽 ID (衬底压住穿过的线, 保可读)。
 */

const W = 1920;
const H = 1080;
const DUR = 165; // 5.5s @30fps
export const DATAVIZ_LANDSCAPE_OPEN_DURATION = DUR;
const WORLD_W = 4200;

// ---------- palette ----------
const BG_DEEP = '#05070c'; // 带冷色相的深场底 (替代 #050505 纯中性黑)
const INK = '#e2e8ff'; // 冷白线色
const ACCENT = '#9aabff'; // 唯一强调色: 柔和长春花蓝
const ACCENT_RGB = '154,171,255';

// ---------- easing ----------
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const growth = (frame: number, start: number, dur: number) => {
  const t = Math.min(1, Math.max(0, (frame - start) / dur));
  return outCubic(t);
};

// ---------- geometry ----------
type Pt = {x: number; y: number};

// 主干: 缓和的水系曲线 (世界坐标)
const trunkY = (x: number) => 480 + 55 * Math.sin((x - 300) / 1050);
const trunkSlope = (x: number) => (55 / 1050) * Math.cos((x - 300) / 1050);
const TRUNK_X0 = -300;
const TRUNK_X1 = WORLD_W + 100;

const trunkPath = () => {
  const pts: string[] = [];
  for (let x = TRUNK_X0; x <= TRUNK_X1; x += 50) {
    pts.push(`${x === TRUNK_X0 ? 'M' : 'L'} ${x} ${trunkY(x).toFixed(1)}`);
  }
  return pts.join(' ');
};

// 三次贝塞尔求值 (用于把标签钉在线上)
const cubicAt = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

// 弧长表: draw-on 用 pathLength=1 按弧长推进, 线头光点必须按同一弧长取点才贴住笔尖
const arcTable = (at: (t: number) => Pt, n = 160) => {
  const pts = Array.from({length: n + 1}, (_, i) => at(i / n));
  const cum = [0];
  for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = cum[n];
  return (frac: number): Pt => {
    const L = Math.min(1, Math.max(0, frac)) * total;
    let i = 1;
    while (i < n && cum[i] < L) i++;
    const k = (L - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    return {x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k};
  };
};

// 支流: 起点在深处四散, 以切向汇入主干 (切线连续)
type Trib = {p0: Pt; p1: Pt; p2: Pt; p3: Pt; opacity: number; growStart: number; growDur: number};

const makeTrib = (
  start: Pt,
  mergeX: number,
  opacity: number,
  growStart: number,
  growDur: number,
): Trib => {
  const end: Pt = {x: mergeX, y: trunkY(mergeX)};
  const slope = trunkSlope(mergeX);
  const len = Math.hypot(1, slope);
  // P2 沿主干切线反向后退 => 到达时切线连续
  const p2: Pt = {x: end.x - (330 * 1) / len, y: end.y - (330 * slope) / len};
  const p1: Pt = {
    x: start.x + (end.x - start.x) * 0.35,
    y: start.y + (end.y - start.y) * 0.12,
  };
  return {p0: start, p1, p2, p3: end, opacity, growStart, growDur};
};

// 中景支流 6 条 (主角层), 错峰 4–6f
const MID_TRIBS: Trib[] = [
  makeTrib({x: -380, y: 130}, 1020, 0.62, 6, 32),
  makeTrib({x: -260, y: 880}, 1180, 0.55, 10, 32),
  makeTrib({x: -60, y: 40}, 1330, 0.7, 15, 32),
  makeTrib({x: 60, y: 960}, 1500, 0.5, 19, 32),
  makeTrib({x: 320, y: 210}, 1680, 0.6, 24, 32),
  makeTrib({x: 420, y: 790}, 1840, 0.55, 30, 32),
];
const TRIB_ARC = MID_TRIBS.map((t) => arcTable((u) => cubicAt(t.p0, t.p1, t.p2, t.p3, u)));
const TRUNK_ARC = arcTable((u) => {
  const x = TRUNK_X0 + (TRUNK_X1 - TRUNK_X0) * u;
  return {x, y: trunkY(x)};
});

const tribPath = (t: Trib) =>
  `M ${t.p0.x} ${t.p0.y} C ${t.p1.x} ${t.p1.y}, ${t.p2.x} ${t.p2.y}, ${t.p3.x} ${t.p3.y}`;

// 远景 4 条: 更细更暗, 向更深处的远点收拢
// (控制点形式, 供节点标记取样——卡"视差可见性": 特征点穿过画面)
type FarLine = {p0: Pt; p1: Pt; p2: Pt; p3: Pt; growStart: number; growDur: number; op: number};
const FAR_LINES: FarLine[] = [
  {p0: {x: -300, y: 260}, p1: {x: 700, y: 250}, p2: {x: 2400, y: 330}, p3: {x: 3400, y: 490}, growStart: 12, growDur: 36, op: 0.3},
  {p0: {x: -200, y: 700}, p1: {x: 800, y: 690}, p2: {x: 2500, y: 610}, p3: {x: 3450, y: 492}, growStart: 16, growDur: 36, op: 0.26},
  {p0: {x: -350, y: 400}, p1: {x: 900, y: 390}, p2: {x: 2600, y: 420}, p3: {x: 3500, y: 493}, growStart: 22, growDur: 36, op: 0.33},
  {p0: {x: -250, y: 590}, p1: {x: 850, y: 600}, p2: {x: 2650, y: 560}, p3: {x: 3520, y: 494}, growStart: 27, growDur: 36, op: 0.24},
];
const farPath = (l: FarLine) =>
  `M ${l.p0.x} ${l.p0.y} C ${l.p1.x} ${l.p1.y}, ${l.p2.x} ${l.p2.y}, ${l.p3.x} ${l.p3.y}`;
// 远景节点标记: 每条线 3 枚暗点, 随层平移穿过画面 → 视差可辨
const FAR_NODE_TS = [0.28, 0.55, 0.82];

// 近景: 大虚焦斜向流过前景 (与横移运动方向成明显角度——
// 卡"视差可见性": 平行于运动方向的线沿自身滑动不可见)
const NEAR_LINES = [
  {d: 'M 130 1270 C 480 830, 880 360, 1290 -130', growStart: 2, growDur: 40, op: 0.2, w: 9},
  {d: 'M 1480 1240 C 1830 800, 2180 330, 2540 -110', growStart: 10, growDur: 40, op: 0.16, w: 7},
];

// ---------- 标签 (中景层, 全部虚构 ID) ----------
type LabelSpec = {trib: number; t: number; id: string; appear: number; above: boolean};

// 错峰间隔非等差 (8/10/8/10/9/10f); 最后一枚 f103, 距交棒帧 (f120) ≥15f 无新增
const LABELS: LabelSpec[] = [
  {trib: 0, t: 0.62, id: 'OKR-1024', appear: 48, above: true},
  {trib: 1, t: 0.58, id: 'TEAM-4417', appear: 56, above: false},
  {trib: 2, t: 0.66, id: 'KR-2093', appear: 66, above: true},
  {trib: 3, t: 0.6, id: 'SYNC-3308', appear: 74, above: false},
  {trib: 4, t: 0.68, id: 'OBJ-2471', appear: 84, above: true},
  {trib: 5, t: 0.64, id: 'PLAN-9124', appear: 93, above: false},
  {trib: 4, t: 0.86, id: 'GOAL-7752', appear: 103, above: true},
];

// 汇点 (偏画面一侧, 收尾亮部引导视线)
const CONV: Pt = {x: 1850, y: trunkY(1850)};

// 生长线头: 一颗小核 + 柔晕, 只在生长期可见, 到达终点前 15% 行程内淡出
const GrowHead: React.FC<{p: Pt; g: number; r?: number; strength?: number}> = ({p, g, r = 3, strength = 1}) => {
  const vis = g <= 0.001 ? 0 : interpolate(g, [0, 0.06, 0.85, 1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (vis <= 0.001) return null;
  return (
    <g opacity={vis * strength}>
      <circle cx={p.x} cy={p.y} r={r * 6} fill="url(#dv-head-halo)" />
      <circle cx={p.x} cy={p.y} r={r} fill="#ffffff" />
    </g>
  );
};

// ---------- component ----------
export const DatavizLandscapeOpen: React.FC = () => {
  const frame = useCurrentFrame();

  // 相机: 匀稳横移 3.2px/f (2–5 区间), 全程斜率恒定 (不急刹)——氛围段刻意匀速
  const camX = frame * 3.2;
  // 极缓 zoom 1.0 → 1.06
  const zoom = interpolate(frame, [0, DUR - 1], [1, 1.06], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // 视差: 近 1.4× / 中 1× / 远 0.6×
  const farX = -camX * 0.6;
  const midX = -camX * 1.0;
  const nearX = -camX * 1.4;

  // 主干先行: f0–38 out-cubic
  const trunkGrow = growth(frame, 0, 38);

  // 流动感 (卡"流动感"行): draw-on 完成后, 虚线相位低速漂向汇点
  // 速度 1.5px/f (卡 1–2), 叠加透明度 ≤0.3; 生长完成后才淡入
  const flowOffset = -frame * 1.5; // dashoffset 递减 = 相位沿画线方向(向汇点)漂移
  const flowDash = '14 56'; // 世界像素单位
  const flowIn = (gEnd: number) => ramp(frame, gEnd, 20, EASE.smooth);

  // 收尾亮部 (交棒段 f118+ 缓升, 引导视线向汇点/右侧)
  const handoffGlow = ramp(frame, 118, 42, EASE.swift) * 0.42;
  // 开场从深场里浮出 (前 10f 整体亮度 0.4→1), 不硬切进第一帧
  const fadeUp = ramp(frame, 0, 12, EASE.out);

  const layerStyle = (tx: number): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: WORLD_W,
    height: H,
    transform: `translateX(${tx}px)`,
  });

  return (
    <AbsoluteFill style={{backgroundColor: BG_DEEP, overflow: 'hidden'}}>
      {/* zoom 容器: 以画面中心为原点 */}
      <AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: '50% 50%', opacity: 0.4 + 0.6 * fadeUp}}>
        {/* 底色: 冷色相深场 + 汇点方向一团极淡的蓝色地光, 远处更深 (空间感来自明暗梯度) */}
        <AbsoluteFill
          style={{
            background:
              `radial-gradient(70% 60% at 68% 47%, rgba(${ACCENT_RGB},0.07) 0%, rgba(${ACCENT_RGB},0) 70%), ` +
              'radial-gradient(120% 90% at 60% 45%, #0d111b 0%, #080a11 52%, #05070b 100%)',
          }}
        />

        {/* ---- 远景层 (视差 0.6×) ---- */}
        <div style={{...layerStyle(farX), filter: 'blur(0.6px)'}}>
          <svg width={WORLD_W} height={H} style={{position: 'absolute'}}>
            {FAR_LINES.map((l, i) => {
              const g = growth(frame, l.growStart, l.growDur);
              return (
                <g key={i}>
                  <path
                    d={farPath(l)}
                    fill="none"
                    stroke={INK}
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    opacity={l.op}
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1 - g}
                  />
                  {/* 节点标记: 可见特征点穿过画面, 让 0.6× 层位移可辨 */}
                  {FAR_NODE_TS.map((t, j) => {
                    const p = cubicAt(l.p0, l.p1, l.p2, l.p3, t);
                    return (
                      <circle
                        key={j}
                        cx={p.x}
                        cy={p.y}
                        r={2.6}
                        fill={INK}
                        opacity={t <= g ? l.op + 0.1 : 0}
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        {/* ---- 中景层 (主角层, 视差 1×) ---- */}
        <div style={layerStyle(midX)}>
          <svg width={WORLD_W} height={H} style={{position: 'absolute', overflow: 'visible'}}>
            <defs>
              {/* 支流沿流向渐亮: 源头 0.22 → 汇入处 1 (读作"往主干流") */}
              {MID_TRIBS.map((t, i) => (
                <linearGradient key={i} id={`dv-trib-${i}`} gradientUnits="userSpaceOnUse" x1={t.p0.x} y1={t.p0.y} x2={t.p3.x} y2={t.p3.y}>
                  <stop offset="0" stopColor={INK} stopOpacity={0.22} />
                  <stop offset="0.55" stopColor={INK} stopOpacity={0.75} />
                  <stop offset="1" stopColor={INK} stopOpacity={1} />
                </linearGradient>
              ))}
              {/* 主干: 冷白 → 汇点往后染一点强调色 */}
              <linearGradient id="dv-trunk" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={WORLD_W} y2={0}>
                <stop offset="0" stopColor={INK} stopOpacity={0.7} />
                <stop offset={CONV.x / WORLD_W} stopColor="#f2f4ff" stopOpacity={1} />
                <stop offset="1" stopColor={ACCENT} stopOpacity={0.9} />
              </linearGradient>
              <radialGradient id="dv-head-halo">
                <stop offset="0" stopColor={`rgb(${ACCENT_RGB})`} stopOpacity={0.55} />
                <stop offset="0.35" stopColor={`rgb(${ACCENT_RGB})`} stopOpacity={0.16} />
                <stop offset="1" stopColor={`rgb(${ACCENT_RGB})`} stopOpacity={0} />
              </radialGradient>
            </defs>
            {/* 微辉光垫层: 1–2px soft glow 压出"发光线"(卡坑注, Q4 单点许可内), 主干带强调色 */}
            <g style={{filter: 'blur(4px)'}}>
              <path
                d={trunkPath()}
                fill="none"
                stroke={ACCENT}
                strokeWidth={9}
                strokeLinecap="round"
                opacity={0.22}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - trunkGrow}
              />
              {MID_TRIBS.map((t, i) => (
                <path
                  key={i}
                  d={tribPath(t)}
                  fill="none"
                  stroke={`url(#dv-trib-${i})`}
                  strokeWidth={5.5}
                  strokeLinecap="round"
                  opacity={t.opacity * 0.2}
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - growth(frame, t.growStart, t.growDur)}
                />
              ))}
            </g>
            {/* 主干 (唯一) */}
            <path
              d={trunkPath()}
              fill="none"
              stroke="url(#dv-trunk)"
              strokeWidth={2.8}
              strokeLinecap="round"
              opacity={0.88}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - trunkGrow}
            />
            {/* 支流, 错峰生长 */}
            {MID_TRIBS.map((t, i) => (
              <path
                key={i}
                d={tribPath(t)}
                fill="none"
                stroke={`url(#dv-trib-${i})`}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={Math.min(1, t.opacity + 0.18)}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - growth(frame, t.growStart, t.growDur)}
              />
            ))}
            {/* 流动感: 虚线相位沿线漂向汇点 (1.5px/f, 叠加透明度 ≤0.3) */}
            <path
              d={trunkPath()}
              fill="none"
              stroke="#ffffff"
              strokeWidth={2.8}
              strokeLinecap="round"
              opacity={0.3 * flowIn(38)}
              strokeDasharray={flowDash}
              strokeDashoffset={flowOffset}
            />
            {MID_TRIBS.map((t, i) => (
              <path
                key={`flow-${i}`}
                d={tribPath(t)}
                fill="none"
                stroke={`url(#dv-trib-${i})`}
                strokeWidth={2.2}
                strokeLinecap="round"
                opacity={0.28 * flowIn(t.growStart + t.growDur)}
                strokeDasharray={flowDash}
                strokeDashoffset={flowOffset}
              />
            ))}
            {/* 生长线头: 笔尖一颗小光点 (按弧长取点, 与 draw-on 同步) */}
            <GrowHead p={TRUNK_ARC(trunkGrow)} g={trunkGrow} r={3.4} />
            {MID_TRIBS.map((t, i) => {
              const g = growth(frame, t.growStart, t.growDur);
              return <GrowHead key={`head-${i}`} p={TRIB_ARC[i](g)} g={g} r={2.6} strength={0.85} />;
            })}
          </svg>

          {/* 标签: 图钉先弹出 (overshoot), 胶囊 ID 晚 3f 跟上 (上浮 + 去模糊), 落定后沿线微漂 */}
          {LABELS.map((l) => {
            const trib = MID_TRIBS[l.trib];
            const base = cubicAt(trib.p0, trib.p1, trib.p2, trib.p3, l.t);
            const pinP = ramp(frame, l.appear, 10, EASE.overshoot);
            const pinOp = ramp(frame, l.appear, 5, EASE.out);
            const tagP = ramp(frame, l.appear + 3, 14, EASE.snappy);
            // 图钉外圈: 出现时扩一圈再收成常驻细环
            const ringP = ramp(frame, l.appear, 18, EASE.out);
            // 沿线微漂: 出现后沿切线方向缓移 ~6px
            const drift = interpolate(frame, [l.appear, DUR - 1], [0, 6], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const ahead = cubicAt(trib.p0, trib.p1, trib.p2, trib.p3, Math.min(1, l.t + 0.02));
            const dx = ahead.x - base.x;
            const dy = ahead.y - base.y;
            const dl = Math.hypot(dx, dy) || 1;
            const px = base.x + (dx / dl) * drift;
            const py = base.y + (dy / dl) * drift;
            // 图钉锚在线上 (中心 = 线上取样点, 卡坑注: 钉线分离读作浮尘);
            // 胶囊沿垂直方向偏移, 避开线体; 入场从线的方向往外浮 10px
            const tagH = 36;
            const tagTop = l.above ? py - 22 - tagH : py + 18;
            const rise = (1 - tagP) * (l.above ? 10 : -10);
            return (
              <React.Fragment key={l.id}>
                {/* 外圈细环 */}
                <div
                  style={{
                    position: 'absolute',
                    left: px - 15,
                    top: py - 15,
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    boxSizing: 'border-box',
                    border: `1px solid rgba(${ACCENT_RGB},0.7)`,
                    opacity: pinOp * (0.95 - 0.55 * ringP),
                    transform: `scale(${0.5 + 0.7 * ringP - 0.2 * ringP * ringP})`,
                  }}
                />
                {/* 图钉核 */}
                <div
                  style={{
                    position: 'absolute',
                    left: px - 6.5,
                    top: py - 6.5,
                    width: 13,
                    height: 13,
                    borderRadius: 3,
                    background: '#f4f6ff',
                    boxShadow: `0 0 0 3px rgba(5,7,12,0.9), 0 0 14px rgba(${ACCENT_RGB},0.55)`,
                    opacity: pinOp,
                    transform: `scale(${pinP})`,
                  }}
                />
                {/* ID 胶囊: 深色半透明衬底 + 发丝线, 压住背后穿过的线 */}
                <div
                  style={{
                    position: 'absolute',
                    left: px + 12,
                    top: tagTop + rise,
                    height: tagH,
                    padding: '0 12px 0 10px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    borderRadius: 8,
                    background: 'rgba(12,15,24,0.78)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.45)',
                    opacity: tagP,
                    filter: tagP < 0.98 ? `blur(${((1 - tagP) * 6).toFixed(2)}px)` : undefined,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{width: 6, height: 6, borderRadius: 3, background: ACCENT, opacity: 0.9}} />
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 23,
                      fontWeight: 500,
                      letterSpacing: '0.06em',
                      color: '#e9edf8',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {l.id}
                  </span>
                </div>
              </React.Fragment>
            );
          })}

          {/* 交棒亮部: 汇点方向留亮 (冷白核 + 强调色外晕), 引导视线接下一镜头 */}
          <div
            style={{
              position: 'absolute',
              left: CONV.x - 460,
              top: CONV.y - 280,
              width: 920,
              height: 560,
              background:
                `radial-gradient(50% 50% at 50% 50%, rgba(240,244,255,0.5) 0%, rgba(${ACCENT_RGB},0.16) 40%, rgba(${ACCENT_RGB},0) 72%)`,
              opacity: handoffGlow,
              filter: 'blur(18px)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* ---- 近景层 (大虚焦, 视差 1.4×) ---- */}
        <div style={{...layerStyle(nearX), filter: 'blur(14px)'}}>
          <svg width={WORLD_W} height={H} style={{position: 'absolute'}}>
            {NEAR_LINES.map((l, i) => (
              <path
                key={i}
                d={l.d}
                fill="none"
                stroke={i === 0 ? INK : ACCENT}
                strokeWidth={l.w}
                strokeLinecap="round"
                opacity={l.op}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - growth(frame, l.growStart, l.growDur)}
              />
            ))}
          </svg>
        </div>
      </AbsoluteFill>

      {/* 屏幕空间的暗角 + 颗粒 (不随 zoom), 收住四角、防大面积暗部色带 */}
      <Vignette strength={0.55} inner={0.42} color="#010207" cy={0.47} />
      <Grain opacity={0.09} blend="soft-light" />
    </AbsoluteFill>
  );
};
