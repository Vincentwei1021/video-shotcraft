/**
 * DatavizLandscapeOpen — 暗场支流线束地景开场
 * 配方卡: references/shots/opening/dataviz-landscape-open.md
 *
 * 第二轮重设计（石墨 · 荧光黄绿 · 真透视地景）：
 * - look = lime。不再是平面 SVG 横移：整片线束画在一张真透视的地平面上（针孔投影，相机高 220、焦距 1100），
 *   一条荧光黄绿主干从镜头脚下蜿蜒奔向画面右 1/3 处的消失点（汇点），11 条灰绿支流从两侧画外切向汇入。
 *   景深 / 视差 / 雾全部由投影深度算出来：近处线条又宽又虚（按深度分进模糊层）、中景锐利、远处变细隐入地平线。
 * - 相机低空沿河道前飞 + 横向缓移（dolly + truck），整段 bezier 减速：开场即在飞、收尾缓停接字标，不急刹。
 * - 中景支流上钉 6 枚 video-shotcraft 镜头标签（立杆图钉 + 等宽镜头号胶囊 + 运镜名），随透视逐渐变大、向两侧散开；
 *   隐喻：每条支流是一个镜头，汇成主干这一支成片；
 *   生长完成后沿线有亮脉冲低速流向汇点（数据在流）。
 * - 收尾：消失点亮起一团黄绿光（交棒亮部），天空里落一行大标题「Every shot, / one film.」（眉题 video-shotcraft 字标小写），
 *   结尾帧是完整的海报。
 *
 * 时间表（30fps，共 180f）：
 *   0–10    从深场浮出（地平线光带首帧就在）
 *   0–36    主干由近及远 draw-on（out-cubic），笔尖光点
 *   8–70    支流错峰生长（每条 4–6f，近处先），笔尖光点
 *   44–104  标签非均匀错峰立起（图钉过冲 → 立杆 → 胶囊去模糊），104f 后不再新增
 *   60–180  流动脉冲；相机全程前飞，140f 后明显减速
 *   104–140 标题：眉题 + 两行逐词升起；汇点光 120f 起升亮
 *   140–180 hold：相机缓停、脉冲流动，海报落定
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {EASE, FONT, bezier, mix, ramp} from '../../_fixtures/Polish';
import {Dust, LOOKS, Stage, TextReveal, alpha, type} from '../../_fixtures/Look';
import {BRAND} from '../../_fixtures/Brand';

const DUR = 180; // 6s @30fps
export const DATAVIZ_LANDSCAPE_OPEN_DURATION = DUR;

const L = LOOKS.lime;
const HY = 420; // 地平线（屏幕 y）
const F = 1100; // 焦距
const CAM_H = 220; // 相机离地高度
const SLOPE = 0.29; // 主干总体走向（dX/dZ）→ 消失点 x = 960 + F*SLOPE ≈ 1279（右 1/3）
const VPX = 960 + F * SLOPE;

// ───────────── 相机 ─────────────
const camPath = bezier(0.3, 0.3, 0.55, 1); // 匀速起步、尾段减速缓停
const CAM_DIST = 950;
const camAt = (frame: number) => {
  const t = Math.min(1, Math.max(0, frame / (DUR - 1)));
  const z = CAM_DIST * camPath(t);
  const lat = mix(-140, 110, EASE.smooth(t)); // 横向缓移：近远景相对错动 = 视差
  return {z, x: SLOPE * z + lat};
};

type P3 = {x: number; z: number};
const project = (p: P3, cam: {x: number; z: number}) => {
  const zr = p.z - cam.z;
  return {sx: 960 + (F * (p.x - cam.x)) / zr, sy: HY + (F * CAM_H) / zr, zr};
};

// ───────────── 世界几何（地平面 X/Z）─────────────
const trunkX = (z: number) => SLOPE * z - 160 + 150 * Math.sin(z / 950);
const trunkDX = (z: number) => SLOPE + (150 / 950) * Math.cos(z / 950);

// 主干：-300 → 14000，近密远疏采样
const TRUNK: P3[] = Array.from({length: 261}, (_, i) => {
  const z = -300 + Math.pow(i / 260, 1.7) * 14300;
  return {x: trunkX(z), z};
});

// 三次贝塞尔按弧长等距重采样
const bez = (a: P3, b: P3, c: P3, d: P3, t: number): P3 => {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    z: u * u * u * a.z + 3 * u * u * t * b.z + 3 * u * t * t * c.z + t * t * t * d.z,
  };
};
const resample = (at: (t: number) => P3, n: number) => {
  const raw = Array.from({length: 241}, (_, i) => at(i / 240));
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].z - raw[i - 1].z));
  const total = cum[cum.length - 1];
  const out: P3[] = [];
  let j = 1;
  for (let k = 0; k <= n; k++) {
    const target = (k / n) * total;
    while (j < raw.length - 1 && cum[j] < target) j++;
    const f = (target - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]);
    out.push({x: mix(raw[j - 1].x, raw[j].x, f), z: mix(raw[j - 1].z, raw[j].z, f)});
  }
  return out;
};

// 支流：起点在两侧画外，切向汇入主干（汇入点切线 = 主干切线）
type TribSpec = {side: number; z0: number; off: number; zm: number; lm: number; grow: number; w: number};
const TRIB_SPECS: TribSpec[] = [
  {side: -1, z0: -260, off: 700, zm: 1500, lm: 520, grow: 8, w: 5},
  {side: 1, z0: -120, off: 900, zm: 2100, lm: 640, grow: 11, w: 5},
  {side: -1, z0: 500, off: 1500, zm: 2700, lm: 760, grow: 16, w: 4.4},
  {side: 1, z0: 800, off: 1800, zm: 3300, lm: 820, grow: 20, w: 4.4},
  {side: -1, z0: 1400, off: 2300, zm: 3900, lm: 900, grow: 25, w: 4.2},
  {side: 1, z0: 1700, off: 2500, zm: 4600, lm: 980, grow: 29, w: 4.2},
  {side: -1, z0: 2500, off: 2900, zm: 5300, lm: 1050, grow: 34, w: 4.2},
  {side: 1, z0: 3100, off: 3200, zm: 6100, lm: 1150, grow: 38, w: 4.2},
  {side: -1, z0: 4100, off: 3600, zm: 7100, lm: 1250, grow: 43, w: 4.2},
  {side: 1, z0: 5000, off: 3900, zm: 8200, lm: 1350, grow: 47, w: 4.2},
  {side: 1, z0: -420, off: 260, zm: 980, lm: 380, grow: 4, w: 6}, // 贴着镜头右下方掠过的近景支流（大虚焦）
];
const TRIBS = TRIB_SPECS.map((s) => {
  const end: P3 = {x: trunkX(s.zm), z: s.zm};
  const dx = trunkDX(s.zm);
  const dl = Math.hypot(dx, 1);
  const p2: P3 = {x: end.x - (dx / dl) * s.lm, z: end.z - (1 / dl) * s.lm};
  const p0: P3 = {x: trunkX(s.z0) + s.side * s.off, z: s.z0};
  const p1: P3 = {x: p0.x + (end.x - p0.x) * 0.12, z: p0.z + (end.z - p0.z) * 0.5};
  return {...s, pts: resample((t) => bez(p0, p1, p2, end, t), 90)};
});

// ───────────── 线段渲染：按深度分层（近虚 / 中实 / 远雾）─────────────
const smooth01 = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
type Seg = {x1: number; y1: number; x2: number; y2: number; w: number; o: number; c: string};

const emitLine = (
  pts: P3[], g: number, cam: {x: number; z: number}, opts: {w: number; color: string; base: number; ramp?: boolean; pulse: (u: number) => number},
  sharp: Seg[], near: Seg[],
) => {
  const n = pts.length - 1;
  const reach = g * n;
  const kMax = Math.min(n, Math.ceil(reach));
  for (let k = 0; k < kMax; k++) {
    const a = pts[k];
    const b0 = pts[k + 1];
    const f = Math.min(1, reach - k);
    const b = f < 1 ? {x: mix(a.x, b0.x, f), z: mix(a.z, b0.z, f)} : b0;
    if (a.z - cam.z < 70 || b.z - cam.z < 70) continue;
    const pa = project(a, cam);
    const pb = project(b, cam);
    if ((pa.sx < -200 && pb.sx < -200) || (pa.sx > 2120 && pb.sx > 2120) || (pa.sy > 1300 && pb.sy > 1300)) continue;
    const zr = (pa.zr + pb.zr) / 2;
    const u = (k + 0.5 * f) / n;
    const fog = 1 - smooth01(2600, 11000, zr); // 远处雾化
    const lift = opts.ramp ? 0.3 + 0.7 * Math.pow(u, 0.8) : 1; // 支流：源头淡、汇入处亮
    // 脉冲只在中远景显形：近处一段线在屏幕上很长，逐段明暗会读成台阶
    const pv = opts.pulse(u);
    const o = opts.base * fog * lift * mix(1, pv, smooth01(500, 1400, zr));
    if (o < 0.01) continue;
    const w = Math.max(0.9, Math.min(46, (opts.w * F) / zr));
    const nearW = 1 - smooth01(420, 1050, zr); // 近景权重 → 进模糊层
    const seg = {x1: pa.sx, y1: pa.sy, x2: pb.sx, y2: pb.sy, w, c: opts.color};
    if (nearW < 0.98) sharp.push({...seg, o: o * (1 - nearW)});
    if (nearW > 0.02) near.push({...seg, w: w * 1.3, o: o * nearW * 0.7});
  }
  // 笔尖
  if (g > 0 && g < 1) {
    const k = Math.min(n - 1, Math.floor(reach));
    const f = reach - k;
    const tip = {x: mix(pts[k].x, pts[k + 1].x, f), z: mix(pts[k].z, pts[k + 1].z, f)};
    if (tip.z - cam.z > 70) return project(tip, cam);
  }
  return null;
};

// ───────────── 标签（中景，video-shotcraft 的镜头号 + 运镜名；字数与原 issue 标签相当，投影位置不变）─────────────
// 位置按投影逐帧核过：起止两端都错开（不叠、不压汇点、不出画），近处一枚随前飞明显变大
type LabelSpec = {trib: number; u: number; id: string; note: string; appear: number};
const LABELS: LabelSpec[] = [
  {trib: 2, u: 0.6, id: 'SHOT-01', note: 'dolly in', appear: 44},
  {trib: 1, u: 0.75, id: 'SHOT-02', note: 'crash zoom', appear: 53},
  {trib: 3, u: 0.6, id: 'SHOT-03', note: 'whip pan', appear: 62},
  {trib: 6, u: 0.3, id: 'SHOT-04', note: 'beat cut', appear: 73},
  {trib: 7, u: 0.45, id: 'SHOT-05', note: 'tilt up', appear: 84},
  {trib: 8, u: 0.45, id: 'SHOT-06', note: 'lockup', appear: 96},
];
const LABEL_PTS = LABELS.map((l) => {
  const pts = TRIBS[l.trib].pts;
  return {p: pts[Math.round(l.u * (pts.length - 1))]};
});

const Label: React.FC<{spec: LabelSpec; at: P3; frame: number; cam: {x: number; z: number}}> = ({spec, at, frame, cam}) => {
  const pr = project(at, cam);
  if (pr.zr < 200) return null;
  const k = Math.min(1.7, Math.max(0.7, 1500 / pr.zr)); // 透视缩放（近大远小），钳住可读区间
  const fog = 1 - smooth01(3600, 8000, pr.zr);
  const pin = ramp(frame, spec.appear, 10, EASE.overshoot);
  const pinOp = ramp(frame, spec.appear, 4, EASE.out);
  const stem = ramp(frame, spec.appear + 2, 12, EASE.snappy);
  const tag = ramp(frame, spec.appear + 6, 14, EASE.snappy);
  // 立杆世界高度远低于相机高度 → 标签落在地平线以下、按深度上下错开（杆高≈相机高时所有标签都投影到地平线上挤成一排）
  const stemH = 44 * k;
  const fs = 25 * k;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity: fog}}>
      {/* 图钉（落在线上） */}
      <div style={{
        position: 'absolute', left: pr.sx - 6 * k, top: pr.sy - 6 * k, width: 12 * k, height: 12 * k, borderRadius: 2.5 * k,
        background: L.accent, opacity: pinOp, transform: `scale(${pin})`,
        boxShadow: `0 0 0 ${3 * k}px ${alpha(L.bg[2], 0.9)}, 0 0 ${18 * k}px ${alpha(L.accent, 0.7)}`,
      }} />
      {/* 立杆 */}
      <div style={{
        position: 'absolute', left: pr.sx - 0.75, top: pr.sy - 8 * k - stemH * stem, width: 1.5, height: stemH * stem,
        background: `linear-gradient(0deg, ${alpha(L.accent, 0.7)}, ${alpha(L.ink, 0.25)})`,
      }} />
      {/* ID 胶囊 */}
      <div style={{
        position: 'absolute', left: pr.sx - 2 * k, top: pr.sy - 8 * k - stemH - 46 * k + (1 - tag) * 14 * k,
        height: 46 * k, padding: `0 ${14 * k}px 0 ${12 * k}px`, borderRadius: 10 * k, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 10 * k, whiteSpace: 'nowrap',
        background: alpha('#141711', 0.82), border: `1px solid ${alpha(L.ink, 0.12)}`,
        boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.06)}, 0 ${10 * k}px ${28 * k}px ${alpha('#000000', 0.5)}`,
        opacity: tag, filter: tag < 0.98 ? `blur(${((1 - tag) * 6).toFixed(2)}px)` : undefined,
      }}>
        <div style={{width: 7 * k, height: 7 * k, borderRadius: 4 * k, background: L.accent}} />
        <span style={{fontFamily: FONT.mono, fontSize: fs, fontWeight: 600, color: L.ink, letterSpacing: '0.02em'}}>{spec.id}</span>
        <span style={{fontFamily: FONT.sans, fontSize: fs * 0.82, fontWeight: 500, color: L.ink3}}>{spec.note}</span>
      </div>
    </div>
  );
};

// ───────────── 组件 ─────────────
export const DatavizLandscapeOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  const fadeUp = ramp(frame, 0, 12, EASE.out);

  const sharp: Seg[] = [];
  const near: Seg[] = [];
  const tips: {sx: number; sy: number; zr: number; trunk: boolean}[] = [];

  // 流动脉冲：生长完后沿线流向汇点的亮脉冲（窄峰，低速）
  const flowIn = (end: number) => ramp(frame, end, 24, EASE.smooth);
  const pulseFn = (end: number, n: number, speed: number, seed: number) => {
    const on = flowIn(end);
    return (u: number) => {
      const ph = u * n - frame * speed + seed;
      const c = Math.cos(ph * Math.PI * 2);
      return 0.7 + on * 0.55 * Math.pow(Math.max(0, c), 4);
    };
  };

  const trunkG = ramp(frame, 0, 36, EASE.out);
  TRIBS.forEach((t, i) => {
    const g = ramp(frame, t.grow, 34, EASE.out);
    const tip = emitLine(t.pts, g, cam, {w: t.w, color: L.ink2, base: 0.62, ramp: true, pulse: pulseFn(t.grow + 34, 2.2, 0.018, i * 0.37)}, sharp, near);
    if (tip) tips.push({...tip, trunk: false});
  });
  const tTip = emitLine(TRUNK, trunkG, cam, {w: 11, color: L.accent, base: 0.95, pulse: pulseFn(36, 4, 0.022, 0)}, sharp, near);
  if (tTip) tips.push({...tTip, trunk: true});
  const trunkSegs = sharp.filter((s) => s.c === L.accent);

  // 地面点阵：与世界锁定的网格，前飞时从远处涌来
  const dots: {x: number; y: number; r: number; o: number}[] = [];
  const STEP = 420;
  const zStart = Math.ceil((cam.z + 300) / STEP) * STEP;
  for (let z = zStart; z < cam.z + 9000; z += STEP) {
    for (let x = Math.floor((cam.x - 5200) / STEP) * STEP; x < cam.x + 5200; x += STEP) {
      const pr = project({x, z}, cam);
      if (pr.sx < -20 || pr.sx > 1940 || pr.sy > 1100) continue;
      const o = 0.28 * (1 - smooth01(2000, 9000, pr.zr)) * smooth01(300, 900, pr.zr);
      if (o < 0.01) continue;
      dots.push({x: pr.sx, y: pr.sy, r: Math.max(0.8, Math.min(3.2, 2400 / pr.zr)), o});
    }
  }

  const handoff = ramp(frame, 118, 50, EASE.swift);
  const lineRender = (s: Seg, i: number) => (
    <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.c} strokeWidth={s.w} strokeOpacity={s.o} strokeLinecap="butt" />
  );

  return (
    <AbsoluteFill style={{background: L.bg[2], overflow: 'hidden'}}>
      <AbsoluteFill style={{opacity: 0.35 + 0.65 * fadeUp}}>
        <Stage look={L} keyLight={{x: VPX / 1920, y: HY / 1080}} fill={{x: 0.12, y: 0.95}} horizon={HY / 1080} intensity={0.55} grain={0.1} vignette={0.6}>
          {/* 天空里的极淡浮尘 */}
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: HY, overflow: 'hidden'}}>
            <Dust look={L} count={26} seed={7} drift={0.12} opacity={0.35} color={L.ink2} />
          </div>
          {/* 地面：地平线以下略亮一档的冷灰绿，向近处压暗 */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: HY, bottom: 0,
            background: `linear-gradient(180deg, ${alpha('#2a3122', 0.55)} 0%, ${alpha('#141811', 0.3)} 30%, ${alpha('#050604', 0)} 100%)`,
          }} />
          {/* 地平线发丝线 */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: HY - 0.5, height: 1,
            background: `linear-gradient(90deg, ${alpha(L.ink, 0)} 0%, ${alpha(L.ink, 0.16)} 40%, ${alpha(L.accent, 0.35)} 66%, ${alpha(L.ink, 0.12)} 85%, ${alpha(L.ink, 0)} 100%)`,
          }} />
        </Stage>

        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <defs>
            <filter id="dv-near" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="11" /></filter>
            <filter id="dv-glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7" /></filter>
            <radialGradient id="dv-tip">
              <stop offset="0" stopColor="#ffffff" stopOpacity={0.9} />
              <stop offset="0.3" stopColor={L.accent} stopOpacity={0.35} />
              <stop offset="1" stopColor={L.accent} stopOpacity={0} />
            </radialGradient>
          </defs>
          {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={L.ink2} fillOpacity={d.o} />)}
          {/* 主干泛光（只给主角） */}
          <g filter="url(#dv-glow)" opacity={0.75}>
            {trunkSegs.map((s, i) => <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={L.accent} strokeWidth={s.w * 3} strokeOpacity={s.o * 0.45} strokeLinecap="butt" />)}
          </g>
          {sharp.map(lineRender)}
          {tips.map((t, i) => {
            const r = Math.max(3, Math.min(18, (t.trunk ? 7000 : 4200) / t.zr));
            return (
              <g key={i}>
                <circle cx={t.sx} cy={t.sy} r={r * 5} fill="url(#dv-tip)" />
                <circle cx={t.sx} cy={t.sy} r={r * 0.6} fill="#ffffff" />
              </g>
            );
          })}
        </svg>

        {/* 汇点交棒亮部：消失点一团黄绿光，收尾升亮 */}
        <div style={{
          position: 'absolute', left: VPX - 520, top: HY - 260, width: 1040, height: 520, pointerEvents: 'none',
          background: `radial-gradient(50% 50% at 50% 50%, ${alpha('#f4ffd6', 0.55)} 0%, ${alpha(L.accent, 0.22)} 22%, ${alpha(L.accent, 0)} 70%)`,
          opacity: 0.25 + 0.75 * handoff, mixBlendMode: 'screen',
        }} />
        <div style={{
          position: 'absolute', left: VPX - 4, top: HY - 4, width: 8, height: 8, borderRadius: 4, background: '#f6ffe0',
          boxShadow: `0 0 18px 6px ${alpha(L.accent, 0.6)}`, opacity: 0.4 + 0.6 * handoff,
        }} />

        {/* 远的先画、近的后画：近处胶囊正确遮住远处图钉 */}
        {LABELS.map((l, i) => ({l, p: LABEL_PTS[i].p}))
          .sort((a, b) => b.p.z - a.p.z)
          .map(({l, p}) => (frame >= l.appear ? <Label key={l.id} spec={l} at={p} frame={frame} cam={cam} /> : null))}

        {/* 近景大虚焦层（在标签之上：前景掠过） */}
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <g filter="url(#dv-near)">{near.map(lineRender)}</g>
        </svg>
      </AbsoluteFill>

      {/* 标题：天空左上，收尾落字 */}
      <div style={{position: 'absolute', left: 120, top: 128}}>
        {/* 眉题：品牌名按字标规范全小写（不走大写科技字标） */}
        <div style={{
          fontFamily: FONT.mono, fontSize: 28, fontWeight: 600, color: L.accent, letterSpacing: '0.12em',
          opacity: ramp(frame, 104, 14, EASE.out), transform: `translateY(${(1 - ramp(frame, 104, 18, EASE.snappy)) * 12}px)`,
        }}>
          {BRAND.name} · shot recipes
        </div>
        <div style={{...type(108, 650), color: L.ink, marginTop: 26}}>
          <TextReveal text="Every shot," by="word" variant="rise" start={110} each={20} gap={5} />
        </div>
        <div style={{...type(108, 650), color: L.accent, marginTop: 4}}>
          <TextReveal text="one film." by="word" variant="rise" start={121} each={20} gap={5} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
