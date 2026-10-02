// beat-cut-accelerando（A 递进硬切串）—— 同一产品的六个构图按 16→12→8→6→4 帧递减间隔全屏硬切，
// 加速逼近；末刀戛然回到主画面并慢推收住。真硬切：frame 落在哪个区间就渲染哪个视图，无任何过渡帧。
//
// 第二轮重设计（赛道遥测 · 冲刺最后一圈）：
// - look = ember（暖黑 · 橙 · 琥珀）。产品是一块赛车遥测大屏「Pitwall」：260px 车速、档位与转速灯条、
//   赛道图上跑动的车点、120px 圈速差、三段计时、底部油门 / 刹车曲线。整块屏是"活"的——车点一直在跑、
//   车速一路爬到 312、圈速差越拉越大——所以六个硬切是同一段时间里的六个机位，切点之间内容是连续的。
// - 切点叙事：全景（建立）→ 赛道图（在哪）→ 车速（多快）→ 圈速差（快多少）→ 油门曲线（怎么开）→
//   车点特写（相机锁住车，赛道线从身边掠过）→ 末刀回全景，「FASTEST LAP」徽章弹出 = 加速冲向的结论。
// - 加速感三层叠：切点间隔 16→12→8→6→4（减半律）；段内微推速率逐段加快；车速数字同步爬升。
// - 切帧快门感：切入那 1f 亮度 +6% + 6% 暖白层（是"咔"不是闪光灯），新视图带 4f 的 1.03→1 微回弹。
// - 放大走 CSS zoom（布局级缩放，Q2：特写字按目标尺寸栅格化不糊）。
//
// 时间表（30fps，共 140f）：
//   0–48    v0 全景建立 49f，1→1.02 极缓推近（先认清"这是谁"）
//   49 / 65 / 77 / 85 / 91   五连切（间隔 16→12→8→6→4）
//   95      末刀回全景：1→1.06 缓出慢推 22f 后静止
//   99–112  FASTEST LAP 徽章弹簧弹出（damping 16，一次可见过冲）
//   112–140 hold：车点继续跑、灯条呼吸，尾帧是完整的遥测海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, alpha, springAt, type } from '../../_fixtures/Look';

export const BEAT_CUT_ACCELERANDO_DURATION = 140; // 建立 49f + 五连切 46f + 定格 hold 45f

const L = LOOKS.ember;
const CUTS = [0, 49, 65, 77, 85, 91, 95];
const FINAL = 95;
const DRIFT = [0, 0.0018, 0.0026, 0.0034, 0.0044, 0.0056]; // 段内微推速率（每帧 scale 增量），逐段加快

// ───────────── 活数据（全是帧的纯函数） ─────────────
const lapP = (f: number) => 0.16 + f * 0.0036; // 车在赛道上的进度（圈）
const speedAt = (f: number) => Math.round(mix(281, 312, ramp(f, 0, 100, EASE.swift)));
const gearAt = (f: number) => (f < 58 ? 6 : 7);
const deltaAt = (f: number) => -mix(0.118, 0.284, ramp(f, 0, 100, EASE.out));

// 赛道：参数化闭合曲线（长直道 + 左侧减速弯 + 底部大弧），按 215px/单位放进赛道图面板
const MAP = { cx: 1034, cy: 402, k: 215 };
const trackPt = (t: number) => {
  const th = t * Math.PI * 2;
  const x = Math.cos(th) + 0.32 * Math.cos(2 * th + 0.6) - 0.1 * Math.sin(3 * th);
  const y = 0.72 * Math.sin(th) + 0.28 * Math.sin(2 * th) - 0.12 * Math.cos(3 * th + 0.4);
  return [MAP.cx + MAP.k * x, MAP.cy + MAP.k * y] as const;
};
const trackPath = (t0: number, t1: number, n = 120) => {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const [x, y] = trackPt(t0 + ((t1 - t0) * i) / n);
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
};
const SECTORS = [
  { t0: 0, t1: 0.36, c: alpha(L.ink, 0.55) },
  { t0: 0.36, t1: 0.7, c: L.accent2 },
  { t0: 0.7, t1: 1, c: L.accent },
];

// 油门 / 刹车：按"距离"采样的确定性曲线，随车前进向左滚动
const throttle = (s: number) => {
  const brake = Math.max(0, Math.sin(s * 0.9 + 0.4)) ** 14; // 偶发重刹
  return { th: Math.max(0, Math.min(1, 0.92 - brake * 1.4 + 0.06 * Math.sin(s * 3.1))), br: brake };
};

// ───────────── 遥测大屏（1920×1080 主画面坐标） ─────────────
const panel = (x: number, y: number, w: number, h: number): React.CSSProperties => ({
  position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 30, boxSizing: 'border-box',
  background: `linear-gradient(180deg, ${L.surface2} 0%, ${L.surface} 100%)`,
  boxShadow: `inset 0 0 0 1.5px ${L.line}, inset 0 1px 0 rgba(255,230,210,0.08), 0 30px 60px -30px rgba(0,0,0,0.8)`,
});
const label: React.CSSProperties = { ...type(24, 700, { caps: true }), letterSpacing: '0.18em', color: L.ink3 };

const Board: React.FC<{ f: number; badge: number }> = ({ f, badge }) => {
  const sp = speedAt(f);
  const gear = gearAt(f);
  const rpm = gear === 6 ? 0.55 + 0.45 * ramp(f, 0, 58, EASE.linear) : 0.62 + 0.36 * ramp(f, 58, 50, EASE.out);
  const dl = deltaAt(f);
  const p = lapP(f);
  const [carX, carY] = trackPt(p % 1);
  const dist = f * 0.16;
  const traceW = 1600, traceH = 200;
  let thD = '', brD = `M0 ${traceH}`;
  for (let i = 0; i <= 160; i++) {
    const x = (i / 160) * traceW;
    const v = throttle(dist + i * 0.06);
    thD += `${i ? 'L' : 'M'}${x.toFixed(1)} ${(traceH - v.th * (traceH - 16) - 8).toFixed(1)}`;
    brD += `L${x.toFixed(1)} ${(traceH - v.br * 120).toFixed(1)}`;
  }
  brD += `L${traceW} ${traceH}Z`;
  const live = 0.5 + 0.5 * Math.sin(f / 5);
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT.sans, color: L.ink,
      background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${alpha(L.light, 0.16)} 0%, rgba(0,0,0,0) 70%), linear-gradient(180deg, ${L.bg[0]} 0%, ${L.bg[1]} 55%, ${L.bg[2]} 100%)` }}>
      {/* 顶栏 */}
      <div style={{ position: 'absolute', left: 96, top: 62, display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width={40} height={40} viewBox="0 0 40 40"><path d="M6 30 L18 10 L24 20 L28 14 L36 30" fill="none" stroke={L.accent} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" /></svg>
        <div style={{ fontFamily: FONT.mono, fontSize: 32, fontWeight: 800, letterSpacing: '0.14em' }}>PITWALL</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center', ...label, opacity: 1 - Math.min(1, badge * 1.6) }}>Kessler Ring · Race · Car 44</div>
      <div style={{ position: 'absolute', right: 96, top: 60, display: 'flex', alignItems: 'center', gap: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...type(24, 750, { caps: true }), letterSpacing: '0.16em', color: L.accent }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent, opacity: 0.4 + 0.6 * live, boxShadow: `0 0 12px ${L.accent}` }} />Live
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 36, fontWeight: 700 }}>LAP 42<span style={{ color: L.ink3 }}>/58</span></div>
      </div>

      {/* 车速 */}
      <div style={panel(96, 160, 680, 480)}>
        <div style={{ position: 'absolute', left: 44, top: 40, ...label }}>Speed</div>
        <div style={{ position: 'absolute', left: 30, top: 100, ...type(244, 800), letterSpacing: '-0.06em', lineHeight: 1 }}>{sp}</div>
        <div style={{ position: 'absolute', left: 48, top: 356, ...type(32, 600), color: L.ink2 }}>km/h</div>
        <div style={{ position: 'absolute', right: 36, top: 36, width: 112, height: 136, borderRadius: 22, background: alpha(L.accent, 0.12), boxShadow: `inset 0 0 0 2px ${alpha(L.accent, 0.5)}`, textAlign: 'center' }}>
          <div style={{ ...label, fontSize: 20, marginTop: 16, color: L.accent }}>Gear</div>
          <div style={{ ...type(84, 800), lineHeight: 1, marginTop: 4, color: L.ink }}>{gear}</div>
        </div>
        {/* 转速灯条 */}
        <div style={{ position: 'absolute', left: 44, right: 44, bottom: 40, display: 'flex', gap: 7 }}>
          {Array.from({ length: 18 }, (_, i) => {
            const on = i / 18 < rpm;
            const c = i < 10 ? L.ink2 : i < 15 ? L.accent2 : L.accent;
            return <div key={i} style={{ flex: 1, height: 26, borderRadius: 6, background: on ? c : 'rgba(255,230,210,0.07)', boxShadow: on && i >= 15 ? `0 0 14px ${alpha(L.accent, 0.8)}` : undefined }} />;
          })}
        </div>
      </div>

      {/* 赛道图 */}
      <div style={panel(812, 160, 540, 480)}>
        <div style={{ position: 'absolute', left: 40, top: 40, ...label }}>Track</div>
        <div style={{ position: 'absolute', right: 40, top: 38, fontFamily: FONT.mono, fontSize: 26, color: L.ink2 }}>S{p % 1 < 0.36 ? 1 : p % 1 < 0.7 ? 2 : 3}</div>
      </div>
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <path d={trackPath(0, 1, 240)} stroke="rgba(255,230,210,0.08)" strokeWidth={22} fill="none" strokeLinejoin="round" />
        {SECTORS.map((s, i) => <path key={i} d={trackPath(s.t0, s.t1)} stroke={s.c} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
        {/* 起跑线 */}
        {(() => { const [x, y] = trackPt(0); return <rect x={x - 3} y={y - 16} width={6} height={32} fill={L.ink} />; })()}
        <circle cx={carX} cy={carY} r={26} fill={alpha(L.accent, 0.25)} />
        <circle cx={carX} cy={carY} r={11} fill={L.accent} stroke="#fff" strokeWidth={3} />
        <text x={carX + 20} y={carY - 20} fill={L.ink} fontFamily={FONT.mono} fontSize={20} fontWeight={700}>44</text>
      </svg>

      {/* 圈速差 */}
      <div style={panel(1388, 160, 436, 480)}>
        <div style={{ position: 'absolute', left: 40, top: 40, ...label }}>Delta · best lap</div>
        <div style={{ position: 'absolute', left: 34, top: 98, ...type(108, 800), letterSpacing: '-0.05em', color: L.accent, fontVariantNumeric: 'tabular-nums' }}>
          −{Math.abs(dl).toFixed(3)}
        </div>
        {[['S1', '28.412', false], ['S2', '33.106', true], ['S3', f >= FINAL ? '29.686' : '—', f >= FINAL]].map(([s, t, best], i) => (
          <div key={i} style={{ position: 'absolute', left: 40, right: 40, top: 262 + i * 66, display: 'flex', alignItems: 'center', gap: 18, borderTop: `1.5px solid ${L.line}`, paddingTop: 14 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 28, color: L.ink3, width: 54 }}>{s}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 36, fontWeight: 650 }}>{t}</div>
            {best && <div style={{ marginLeft: 'auto', width: 14, height: 14, borderRadius: 7, background: L.accent2, boxShadow: `0 0 10px ${L.accent2}` }} />}
          </div>
        ))}
      </div>

      {/* 油门 / 刹车曲线 */}
      <div style={panel(96, 676, 1728, 324)}>
        <div style={{ position: 'absolute', left: 44, top: 34, display: 'flex', gap: 36, ...label }}>
          <span style={{ color: L.accent2 }}>— Throttle</span><span style={{ color: L.accent }}>■ Brake</span>
        </div>
        <div style={{ position: 'absolute', right: 44, top: 32, fontFamily: FONT.mono, fontSize: 26, color: L.ink3 }}>{(4.21 + p * 1.8).toFixed(2)} km</div>
        <svg width={traceW} height={traceH} style={{ position: 'absolute', left: 64, top: 92 }}>
          {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={traceW} y1={traceH * g} y2={traceH * g} stroke="rgba(255,230,210,0.06)" strokeWidth={1.5} />)}
          <path d={brD} fill={alpha(L.accent, 0.55)} />
          <path d={thD} stroke={L.accent2} strokeWidth={4} fill="none" strokeLinejoin="round" />
        </svg>
      </div>

      {/* FASTEST LAP 徽章（末刀之后的结论） */}
      {badge > 0.001 && (
        <div style={{ position: 'absolute', left: 960, top: 50, transform: `translate(-50%, ${((1 - badge) * -24).toFixed(2)}px) scale(${(0.7 + 0.3 * badge).toFixed(4)})`, opacity: Math.min(1, badge * 2),
          display: 'flex', alignItems: 'center', gap: 18, padding: '12px 30px', borderRadius: 999, background: L.accent, color: L.onAccent,
          boxShadow: `0 20px 50px -14px ${alpha(L.accent, 0.9)}, inset 0 1.5px 0 rgba(255,255,255,0.35)`, whiteSpace: 'nowrap' }}>
          <div style={{ ...type(30, 800, { caps: true }), letterSpacing: '0.14em' }}>Fastest lap</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 36, fontWeight: 800 }}>1:31.204</div>
        </div>
      )}
    </div>
  );
};

// 一个视图 = 缩放 + 对焦点（被推到屏幕中心的主画面坐标）；follow = 相机锁住车点
type View = { scale: number; cx: number; cy: number; follow?: boolean };
const VIEWS: View[] = [
  { scale: 1, cx: 960, cy: 540 }, //          v0 全景（建立）
  { scale: 1.9, cx: 1082, cy: 410 }, //       v1 赛道图
  { scale: 2.4, cx: 420, cy: 400 }, //        v2 车速
  { scale: 2.6, cx: 1551, cy: 330 }, //       v3 圈速差
  { scale: 2.0, cx: 640, cy: 810 }, //        v4 油门 / 刹车曲线（带图例与一次重刹）
  { scale: 3.4, cx: 0, cy: 0, follow: true }, // v5 车点特写（跟车）
];

const ViewShot: React.FC<{ view: View; push: number; f: number; badge: number }> = ({ view, push, f, badge }) => {
  const s = view.scale;
  let { cx, cy } = view;
  if (view.follow) {
    const [x, y] = trackPt(lapP(f) % 1);
    cx = x; cy = y;
  }
  // 视口不出画：焦点钳在 [960/s, 1920−960/s] × [540/s, 1080−540/s]
  cx = Math.min(1920 - 960 / s, Math.max(960 / s, cx));
  cy = Math.min(1080 - 540 / s, Math.max(540 / s, cy));
  return (
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '960px 540px', transform: `scale(${push.toFixed(5)})` }}>
      {/* zoom 会连 left/top 一起放大：left = 960/s − cx ⇒ 焦点落在屏幕中心 */}
      <div style={{ position: 'absolute', left: 960 / s - cx, top: 540 / s - cy, width: 1920, height: 1080, zoom: s }}>
        <Board f={f} badge={badge} />
      </div>
    </div>
  );
};

export const BeatCutAccelerando: React.FC = () => {
  const frame = useCurrentFrame();
  let seg = 0;
  for (let i = 0; i < CUTS.length; i++) if (frame >= CUTS[i]) seg = i;
  const isFinal = seg === CUTS.length - 1;
  const view = isFinal ? VIEWS[0] : VIEWS[seg];

  let push: number;
  if (isFinal) push = mix(1, 1.06, ramp(frame, FINAL, 22, EASE.out));
  else if (seg === 0) push = mix(1, 1.02, ramp(frame, 0, 49, EASE.smooth));
  else push = 1 + DRIFT[seg] * (frame - CUTS[seg]);
  // 切入微回弹：新视图 1.03→1 走 4f（不是过渡，是"咔"之后的惯性）
  const sinceCut = frame - CUTS[seg];
  if (seg > 0 && sinceCut < 4) push *= 1 + 0.03 * (1 - EASE.out(sinceCut / 4));

  const badge = frame < FINAL + 4 ? 0 : springAt(frame, FINAL + 4, { damping: 16, stiffness: 190 });
  const isCutFrame = CUTS.some((c, i) => i > 0 && frame === c);

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, filter: isCutFrame ? 'brightness(1.06)' : undefined }}>
        <ViewShot view={view} push={push} f={frame} badge={badge} />
      </div>
      {/* 越近的特写暗角越重，把视线收向焦点 */}
      <Vignette strength={0.42 + 0.14 * Math.min(1, (view.scale - 1) / 2.4)} inner={0.45} color={L.shadow} />
      <Grain opacity={0.08} blend="soft-light" />
      {isCutFrame && <AbsoluteFill style={{ background: '#fff2e6', opacity: 0.06 }} />}
    </AbsoluteFill>
  );
};
