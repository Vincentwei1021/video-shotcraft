// cursor-flyover — Cursor Flyover 四角巡览指点（motion-lab 定稿转原生 Remotion）
// 产品截图平铺，相机先整体俯瞰淡入，再依次飞到四个角落 zoom-in 特写；一枚带阴影
// 的 SVG 光标跟到对应区域指点并留下点击涟漪。每步过渡+停留等长。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 升级：
// - 占位四象限换成出版级深色 dashboard（指标卡 / 面积折线 / 柱状图 / 表格），四个光标落点
//   各对准一个真实控件，点击即有界面响应（选中描边 / 数据点 tooltip / 高亮柱 / 选中行）——
//   "指哪、点哪、哪里亮"。
// - 相机：不对称 in-out（起步干脆、落位很软）+ 过渡途中轻微拉远 ~9% 再推回（hop，途中看得到
//   全局位置关系）+ 按屏幕速度的方向性运动模糊；光标走一条轻弧线（真人手腕轨迹）、与相机同时到位，
//   按下 3f 缩到 0.86 再回弹。背景改暗场柔光 + 颗粒，窗口两层深色软影。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { DesignStage, seg } from '../../_fixtures/Motion';
import { Backdrop, FONT, SpeedBlur, bezier, mix, ramp } from '../../_fixtures/Polish';

export const CURSOR_FLYOVER_DURATION = 180; // 6000ms @30fps

// 关键帧累加器：base 起步，每段 [at0,at1] 内朝 to 推进（效果源文件级共享 helper）
type Vec = Record<string, number>;
const acc = (t: number, base: Vec, kfs: { at: number[]; to: Vec }[], keys: string[], ease: (x: number) => number) => {
  const out: Vec = {};
  for (const k of keys) out[k] = base[k];
  let prev = base;
  for (const kf of kfs) {
    const u = seg(t, kf.at[0], kf.at[1], ease);
    for (const k of keys) out[k] += u * (kf.to[k] - prev[k]);
    prev = kf.to;
  }
  return out;
};

// 相机 Step：overview + 四角；光标目标（world %）——四个落点各对准一个控件（见下方布局推算）
const CAM = [
  { tx: 50, ty: 50, s: 0.8,  cx: 56.8, cy: 52.3 }, // 俯瞰时光标停在四象限中缝，不压任何文字
  { tx: 37, ty: 32, s: 1.72, cx: 41, cy: 38 },
  { tx: 77, ty: 32, s: 1.72, cx: 82, cy: 36 },
  { tx: 77, ty: 72, s: 1.72, cx: 71, cy: 76 },
  { tx: 37, ty: 72, s: 1.72, cx: 33, cy: 78 },
];
const WIN = [[0.20, 0.32], [0.40, 0.52], [0.60, 0.72], [0.79, 0.91]];
const KEY = ['tx', 'ty', 's', 'cx', 'cy'];
const CAM_EASE = bezier(0.55, 0, 0.18, 1); // 起步干脆、落位很软
const HOP = 0.09; // 过渡途中拉远比例

// 相机 + 光标姿态（t 的纯函数：给速度/运动模糊求导用）
const poseAt = (t: number): { tx: number; ty: number; s: number; cx: number; cy: number } => {
  const v = acc(t, CAM[0], WIN.map((w, i) => ({ at: w, to: CAM[i + 1] })), KEY, CAM_EASE);
  let hop = 0;
  let arcX = 0;
  let arcY = 0;
  for (let i = 0; i < WIN.length; i++) {
    const u = seg(t, WIN[i][0], WIN[i][1], CAM_EASE);
    if (u <= 0 || u >= 1) continue;
    const bump = Math.sin(Math.PI * u);
    if (i > 0) hop = HOP * bump; // 第一段是从俯瞰推进，本身就是推近，不再 hop
    // 光标轻弧：垂直于本段位移方向偏出 ~2.5%（world %），起止为 0，到位与相机同时
    const a = CAM[i], b = CAM[i + 1];
    const dx = b.cx - a.cx, dy = b.cy - a.cy;
    const len = Math.max(1e-6, Math.hypot(dx, dy));
    arcX = (-dy / len) * 2.5 * bump;
    arcY = (dx / len) * 2.5 * bump;
  }
  // 开场俯瞰：0.76 → 0.8 随淡入落定
  const settle = mix(0.95, 1, seg(t, 0, 0.16, (x) => 1 - Math.pow(1 - x, 3)));
  return { tx: v.tx, ty: v.ty, s: v.s * (1 - hop) * settle, cx: v.cx + arcX, cy: v.cy + arcY };
};

// ───────── 深色产品 UI 令牌 ─────────
const C = {
  win: '#111318',
  bar: '#15171d',
  side: '#13151a',
  panel: '#181a21',
  tile: '#1e2129',
  line: 'rgba(255,255,255,0.065)',
  lineStrong: 'rgba(255,255,255,0.1)',
  ink1: '#eceef5',
  ink2: '#9ba1b3',
  ink3: '#5f6578',
  accent: '#8b8cff',
  accentSoft: 'rgba(139,140,255,0.16)',
  up: '#5fd4a0',
};
const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

// 四象限面板（窗口内百分比定位；内部按 px 设计坐标排版）
const Quad: React.FC<{ x: number; y: number; w: number; h: number; title: string; meta: string; children?: React.ReactNode }> = ({
  x, y, w, h, title, meta, children,
}) => (
  <div
    style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`,
      borderRadius: 7, background: `linear-gradient(180deg, ${C.panel}, #16181e)`,
      border: `0.5px solid ${C.line}`, boxSizing: 'border-box',
      boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.05), 0 2px 6px rgba(0,0,0,0.25)',
      overflow: 'hidden',
    }}
  >
    <div style={{ position: 'absolute', left: 8, top: 6.5, font: `600 5.2px/1 ${FONT.sans}`, color: C.ink1, letterSpacing: '-0.005em' }}>{title}</div>
    <div style={{ position: 'absolute', right: 8, top: 6.5, font: `500 4.4px/1 ${FONT.sans}`, color: C.ink3, letterSpacing: '0.01em' }}>{meta}</div>
    {children}
  </div>
);

// 左上：三张指标卡（第 2 张在 [60,108]×[24,76] 内被点中，quad 内落点 ≈ (98,55)）
const TILES = [
  { v: '12.4k', l: 'Active users', d: '+8.2%' },
  { v: '+38%', l: 'Conversion', d: '+4.1%' },
  { v: '4.1s', l: 'p95 load', d: '−0.6s' },
];
const SPARK = [
  [6, 5, 7, 6, 8, 7, 9, 10],
  [4, 5, 5, 7, 6, 8, 9, 11],
  [9, 8, 8, 7, 7, 6, 5, 5],
];

// 右上：面积折线（13 点，第 9 点恰在 quad 内落点 (113.9,49.6)）
const LX = (i: number) => 10 + i * 11.544;
const LY = [62, 58, 60, 53, 56, 50, 54, 57, 52, 49.6, 55, 48, 45];
const smoothPath = (pts: [number, number][]) => {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0]},${p2[1]}`;
  }
  return d;
};
const LINE_PTS = LY.map((y, i) => [LX(i), y] as [number, number]);
const LINE_D = smoothPath(LINE_PTS);

// 右下：9 根柱（第 4 根中心 x=60.9，落点 y=58.1 在柱内）
const BARS = [30, 38, 26, 44, 34, 22, 28, 36, 31];
const BAR_X = (i: number) => 13.2 + i * 15.9;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

// 左下：表格（第 4 行 [57,69] 含落点 y=63.4）
const ROWS = [
  { n: 'Organic search', v: '4,812', p: 0.82 },
  { n: 'Direct', v: '3,206', p: 0.58 },
  { n: 'Referral', v: '1,944', p: 0.4 },
  { n: 'Newsletter', v: '1,327', p: 0.3 },
  { n: 'Paid social', v: '868', p: 0.19 },
];

const NAV = ['Overview', 'Traffic', 'Revenue', 'Cohorts', 'Alerts'];

export const CursorFlyover: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const tOf = (f: number) => Math.min(1, Math.max(0, f / Math.max(1, durationInFrames - 1)));
  const t = tOf(frame);
  const v = poseAt(t);
  const fade = seg(t, 0, 0.14, (x) => 1 - Math.pow(1 - x, 3));

  // 屏幕速度（1920 坐标 px/帧）：world 中心点的屏幕位置差分
  const scr = (f: number) => {
    const p = poseAt(tOf(f));
    return { x: (50 - p.tx * p.s + 50 * p.s) * 19.2, y: (50 - p.ty * p.s + 50 * p.s) * 10.8 };
  };
  const a = scr(frame + 0.5), b = scr(frame - 0.5);

  // 点击：每段落位瞬间（WIN[i][1]）。press 0→1→0 用于光标按下，clicked[i] 为该控件被点后的选中进度
  let ripple = -1;
  let press = 0;
  const clicked = WIN.map((w) => ramp(frame, w[1] * (durationInFrames - 1), 8, bezier(0.16, 1, 0.3, 1)));
  for (let i = 0; i < WIN.length; i++) {
    const c = seg(t, WIN[i][1], WIN[i][1] + 0.055, (x) => x);
    if (c > 0 && c < 1) ripple = c;
    const pf = frame - WIN[i][1] * (durationInFrames - 1);
    if (pf > -1.5 && pf < 6) press = Math.max(press, pf < 1.5 ? ramp(pf, -1.5, 3, (x) => x) : 1 - ramp(pf, 1.5, 4.5, bezier(0.34, 1.45, 0.64, 1)));
  }
  // 当前（最近一次）被点过的控件之前的选中态在离开时淡出：只保留"当前这一站"的高亮
  const active = (i: number) => clicked[i] * (1 - (i < WIN.length - 1 ? ramp(frame, WIN[i + 1][0] * (durationInFrames - 1), 10, (x) => x) : 0) * 0.6);

  const rEase = 1 - Math.pow(1 - Math.max(0, ripple), 3);

  return (
    <AbsoluteFill style={{ background: '#0a0b10' }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.3 }} accent="#6a5cff" vignette={0.55} grain={0.07} />
      <SpeedBlur vx={a.x - b.x} vy={a.y - b.y} amount={0.18} max={10}>
        <DesignStage bg="transparent" raster="zoom">
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* world：相机 translate+scale 的载体，淡入由 opacity 承担 */}
            <div
              style={{
                position: 'absolute', inset: 0, transformOrigin: '0 0',
                transform: `translate(${50 - v.tx * v.s}%,${50 - v.ty * v.s}%) scale(${v.s})`,
                opacity: fade,
              }}
            >
              {/* ---- 产品窗口 ---- */}
              <div
                style={{
                  position: 'absolute', left: '4%', top: '5%', width: '92%', height: '90%',
                  borderRadius: 10, background: C.win, overflow: 'hidden',
                  border: `0.5px solid ${C.lineStrong}`, boxSizing: 'border-box',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 22px 60px -10px rgba(0,0,0,0.7), inset 0 0.5px 0 rgba(255,255,255,0.08)',
                  filter: fade < 1 ? `blur(${(1 - fade) * 5}px)` : undefined,
                  fontFamily: FONT.sans,
                }}
              >
                {/* 顶栏：红黄绿灯 + URL 胶囊 + 右侧成员头像 */}
                <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '9%', background: C.bar, borderBottom: `0.5px solid ${C.line}` }}>
                  {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                    <div key={c} style={{ position: 'absolute', left: 8 + i * 10, top: '50%', width: 5.5, height: 5.5, marginTop: -2.75, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 0.4px rgba(0,0,0,0.25)' }} />
                  ))}
                  <div
                    style={{
                      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', height: 12,
                      padding: '0 10px', borderRadius: 6, background: '#0d0f13', border: `0.5px solid ${C.line}`,
                      display: 'flex', alignItems: 'center', gap: 4, color: C.ink2, font: `500 5.6px/1 ${FONT.sans}`, letterSpacing: '0.01em',
                    }}
                  >
                    <svg width={5} height={6} viewBox="0 0 10 12"><rect x={1} y={5} width={8} height={6.5} rx={1.5} fill={C.ink3} /><path d="M3 5V3.5a2 2 0 0 1 4 0V5" stroke={C.ink3} strokeWidth={1.4} fill="none" /></svg>
                    app.example.com/overview
                  </div>
                  {['#c9a7ff', '#8fd0ff', '#ffc38f'].map((c, i) => (
                    <div key={c} style={{ position: 'absolute', right: 10 + i * 7, top: '50%', marginTop: -4, width: 8, height: 8, borderRadius: '50%', background: c, border: `1px solid ${C.bar}` }} />
                  ))}
                </div>
                {/* 侧栏导航 */}
                <div style={{ position: 'absolute', left: 0, top: '9%', width: '15%', height: '91%', background: C.side, borderRight: `0.5px solid ${C.line}` }}>
                  <div style={{ position: 'absolute', left: 8, top: 9, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2.5, background: `linear-gradient(135deg, ${C.accent}, #5a4fd6)` }} />
                    <div style={{ font: `650 5.6px/1 ${FONT.sans}`, color: C.ink1, letterSpacing: '-0.01em' }}>Northwind</div>
                  </div>
                  {NAV.map((s, i) => (
                    <div
                      key={s}
                      style={{
                        position: 'absolute', left: 5, right: 5, top: 28 + i * 15, height: 11, borderRadius: 3.5,
                        display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4,
                        background: i === 0 ? 'rgba(255,255,255,0.06)' : 'transparent',
                        font: `${i === 0 ? 600 : 500} 5.2px/1 ${FONT.sans}`, color: i === 0 ? C.ink1 : C.ink3,
                      }}
                    >
                      <div style={{ width: 4.5, height: 4.5, borderRadius: 1.2, border: `0.7px solid ${i === 0 ? C.accent : C.ink3}` }} />
                      {s}
                    </div>
                  ))}
                  <div style={{ position: 'absolute', left: 8, bottom: 9, display: 'flex', alignItems: 'center', gap: 4, font: `500 4.6px/1 ${FONT.sans}`, color: C.ink3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2a2d38', color: C.ink2, font: `600 3.6px/8px ${FONT.sans}`, textAlign: 'center' }}>JL</div>
                    Jamie Lee
                  </div>
                </div>

                {/* 左上：指标卡 */}
                <Quad x={18} y={14} w={38} h={36} title="Key metrics" meta="Last 30 days">
                  {TILES.map((tl, i) => {
                    const sel = i === 1 ? active(0) : 0;
                    return (
                      <div
                        key={tl.l}
                        style={{
                          position: 'absolute', left: 8 + i * 52.3, top: 22, width: 47.3, height: 56, borderRadius: 5,
                          background: C.tile, boxSizing: 'border-box', padding: '6px 0 0 6px',
                          boxShadow: `inset 0 0 0 ${0.5 + sel * 0.5}px ${sel > 0.01 ? `rgba(139,140,255,${(0.15 + 0.75 * sel).toFixed(3)})` : C.line}, 0 0 ${8 * sel}px rgba(139,140,255,${(0.25 * sel).toFixed(3)})`,
                        }}
                      >
                        <div style={{ font: `500 4.4px/1 ${FONT.sans}`, color: C.ink2 }}>{tl.l}</div>
                        <div style={{ marginTop: 5, font: `700 12px/1 ${FONT.sans}`, letterSpacing: '-0.03em', color: C.ink1, ...num }}>{tl.v}</div>
                        <div style={{ marginTop: 4, font: `600 4.2px/1 ${FONT.sans}`, color: C.up, ...num }}>{tl.d}</div>
                        <svg viewBox="0 0 70 14" style={{ position: 'absolute', left: 6, bottom: 5, width: 35, height: 8 }}>
                          <polyline
                            points={SPARK[i].map((y, k) => `${k * 10},${14 - y}`).join(' ')}
                            fill="none" stroke={i === 1 ? C.accent : '#4b5063'} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    );
                  })}
                </Quad>

                {/* 右上：面积折线 + 被点数据点 tooltip */}
                <Quad x={59} y={14} w={37} h={36} title="Sessions" meta="Sep">
                  <svg viewBox="0 0 163.4 87.5" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="cf-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={C.accent} stopOpacity={0.32} />
                        <stop offset="1" stopColor={C.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    {[34, 50, 66].map((y) => <line key={y} x1={10} x2={149} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />)}
                    <path d={`${LINE_D} L${LX(12)},74 L${LX(0)},74 Z`} fill="url(#cf-area)" />
                    <path d={LINE_D} fill="none" stroke={C.accent} strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" />
                    {/* 选中：竖向引导线 + 数据点 */}
                    <line x1={LX(9)} x2={LX(9)} y1={22} y2={74} stroke={C.accent} strokeWidth={0.5} strokeDasharray="1.5 1.5" opacity={active(1) * 0.8} />
                    <circle cx={LX(9)} cy={LY[9]} r={1.6 + active(1) * 0.8} fill={C.win} stroke={C.accent} strokeWidth={1.1} />
                    {['Sep 1', 'Sep 15', 'Sep 30'].map((m, i) => (
                      <text key={m} x={10 + i * 69.5} y={82} fill={C.ink3} fontSize={4.2} fontFamily={FONT.sans} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>{m}</text>
                    ))}
                  </svg>
                  <div
                    style={{
                      position: 'absolute', left: LX(9) - 22, top: LY[9] - 26, width: 44, height: 17, borderRadius: 4,
                      background: '#262935', border: `0.5px solid ${C.lineStrong}`, boxSizing: 'border-box', padding: '3.5px 5px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.45)',
                      opacity: active(1), transform: `translateY(${(1 - clicked[1]) * 3}px) scale(${0.92 + 0.08 * clicked[1]})`,
                    }}
                  >
                    <div style={{ font: `500 3.8px/1 ${FONT.sans}`, color: C.ink3 }}>Sep 21</div>
                    <div style={{ marginTop: 2, font: `700 5.4px/1 ${FONT.sans}`, color: C.ink1, ...num }}>4,812 <span style={{ color: C.up, fontWeight: 600, fontSize: 4 }}>+12%</span></div>
                  </div>
                </Quad>

                {/* 右下：柱状图（第 4 根被点亮） */}
                <Quad x={59} y={55} w={37} h={34} title="Revenue" meta="$48.2k YTD">
                  {BARS.map((hgt, i) => {
                    const sel = i === 3 ? active(2) : 0;
                    return (
                      <React.Fragment key={i}>
                        <div
                          style={{
                            position: 'absolute', left: BAR_X(i) - 4.5, top: 70 - hgt, width: 9, height: hgt, borderRadius: '2px 2px 0.5px 0.5px',
                            background: sel > 0.01
                              ? `linear-gradient(180deg, rgba(178,160,255,${0.55 + 0.45 * sel}), rgba(110,96,230,${0.55 + 0.45 * sel}))`
                              : 'linear-gradient(180deg, #3a3e4e, #2b2e3a)',
                          }}
                        />
                        <div style={{ position: 'absolute', left: BAR_X(i) - 6, top: 73, width: 12, textAlign: 'center', font: `500 3.6px/1 ${FONT.sans}`, color: i === 3 && sel > 0.5 ? C.ink2 : C.ink3 }}>{MONTHS[i]}</div>
                      </React.Fragment>
                    );
                  })}
                  <div
                    style={{
                      position: 'absolute', left: BAR_X(3) - 11, top: 70 - BARS[3] - 11, width: 22, textAlign: 'center',
                      font: `700 4.8px/1 ${FONT.sans}`, color: C.ink1, opacity: active(2), ...num,
                      transform: `translateY(${(1 - clicked[2]) * 2.5}px)`,
                    }}
                  >
                    $6.9k
                  </div>
                </Quad>

                {/* 左下：渠道表（第 4 行被选中） */}
                <Quad x={18} y={55} w={38} h={34} title="Top channels" meta="Visits">
                  {ROWS.map((r, i) => {
                    const sel = i === 3 ? active(3) : 0;
                    return (
                      <div
                        key={r.n}
                        style={{
                          position: 'absolute', left: 5, right: 5, top: 21 + i * 12, height: 12, borderRadius: 3,
                          background: sel > 0.01 ? `rgba(139,140,255,${(0.16 * sel).toFixed(3)})` : 'transparent',
                          boxShadow: sel > 0.01 ? `inset 0 0 0 0.5px rgba(139,140,255,${(0.45 * sel).toFixed(3)})` : undefined,
                          borderTop: i > 0 ? `0.5px solid ${C.line}` : '0.5px solid transparent',
                          display: 'flex', alignItems: 'center', padding: '0 4px', gap: 5, boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ width: 4, height: 4, borderRadius: 1.2, background: ['#8b8cff', '#5fd4a0', '#ffb86b', '#7cc4ff', '#ff8fb3'][i] }} />
                        <div style={{ flex: 1, font: `${sel > 0.5 ? 600 : 500} 4.8px/1 ${FONT.sans}`, color: sel > 0.5 ? C.ink1 : C.ink2 }}>{r.n}</div>
                        <div style={{ width: 38, height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ width: `${r.p * 100}%`, height: '100%', background: i === 3 && sel > 0.01 ? C.accent : '#454a5c' }} />
                        </div>
                        <div style={{ width: 22, textAlign: 'right', font: `600 4.8px/1 ${FONT.sans}`, color: C.ink1, ...num }}>{r.v}</div>
                      </div>
                    );
                  })}
                </Quad>
              </div>

              {/* ---- 点击涟漪（world 内锚定，反缩放保持屏幕尺寸）：细环扩散 + 软光盘 ---- */}
              {ripple >= 0 && (
                <>
                  <div
                    style={{
                      position: 'absolute', left: `${v.cx}%`, top: `${v.cy}%`, width: 26, height: 26, borderRadius: '50%',
                      border: `1.2px solid ${C.accent}`, transformOrigin: '50% 50%', zIndex: 39,
                      opacity: (1 - rEase) * 0.9,
                      transform: `translate(-50%,-50%) scale(${(0.3 + rEase * 1.6) / v.s})`,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute', left: `${v.cx}%`, top: `${v.cy}%`, width: 18, height: 18, borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(170,170,255,0.45), rgba(139,140,255,0) 70%)',
                      transformOrigin: '50% 50%', zIndex: 38, opacity: 1 - rEase,
                      transform: `translate(-50%,-50%) scale(${(0.6 + rEase * 0.8) / v.s})`,
                    }}
                  />
                </>
              )}
              {/* ---- 光标（world 内锚定，逐帧反缩放保持屏幕尺寸；按下缩到 0.86） ---- */}
              <svg
                viewBox="0 0 24 24"
                style={{
                  position: 'absolute', left: `${v.cx}%`, top: `${v.cy}%`, width: 20, height: 20, transformOrigin: '0 0',
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5)) drop-shadow(0 3px 5px rgba(0,0,0,0.45))', pointerEvents: 'none', zIndex: 40,
                  transform: `scale(${(1 - 0.14 * press) / v.s}) translate(-1.2px,-0.6px)`,
                }}
              >
                <path
                  d="M4.5 2.5 L4.5 19.2 L8.9 15 L11.9 21.6 L14.9 20.3 L11.9 13.8 L18.2 13.4 Z"
                  fill="#ffffff" stroke="#14161c" strokeWidth={1.2} strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </DesignStage>
      </SpeedBlur>
    </AbsoluteFill>
  );
};
