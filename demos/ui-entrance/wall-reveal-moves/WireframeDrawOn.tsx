import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, glow } from '../../_fixtures/Look';

// wireframe-draw-on〔入场退场〕：界面先以蓝图细线分组描画成形，随后一条发光竖线从左向右扫过，
// 扫过之处线框实体化成真实界面。
//
// 第二轮重设计（石墨制图台 · 从设计稿到产品）：
// - look = graphite（近单色暗场，香槟金为唯一强调）。主体是一扇 1600×880 的虚构产品「Tessera」营收页窗口，
//   为镜头设计：侧栏 5 项导航（30px）、60px 页标题、128px 主数字 $4.82M、三枚 52px KPI 块、一张占满下半区的面积图。
// - 线框与实体同源：所有方块 / 文字 / 图表都来自同一张几何表——线框层把方块画成 SVG 描线
//   （pathLength=1 + dashoffset），文字画成同位置的空心描边字（-webkit-text-stroke）并像笔一样从左往右写出；
//   实体层用同一坐标填色。扫描线扫过时不可能"跳位"。
// - 蓝图语言：铅笔灰细线（外框 1.6px / 内件 1.2px）+ 24px 点阵 + 窗口四角裁切标记 + 尺寸标注（1600 / 880 / 56，
//   等宽小字，纹理级），尺寸标注在扫描线经过时熄灭。
// - 扫描：3px 白芯 + 香槟金辉光竖线，前沿身后 300px 一段渐隐暖光（刚显影的余温），竖线与 clip 前沿同一 scan 值驱动；
//   扫描前沿正前方的线框先被照亮一点（预照明）。图表的金色线与面积在实体层里随扫描显影。
//
// 时间表（30fps，共 150f）：
//   0–14    建立：点阵与四角裁切标记淡入（第 1 帧就有裁切标记）
//   8–38    窗口外框 + 标题栏描线（30f）
//   18–60   分组错峰：侧栏 18f 起（逐项 +4f）→ 页头 28f → 主数字 / KPI 36f → 图表网格 44f、曲线 50f
//   56–84   尺寸标注逐个出现；84–92 喘息（线框完整画好、静止一拍）
//   92–124  扫描实体化 32f，bezier(0.55,0,0.25,1)；竖线 90–96 淡入、120–128 淡出
//   0–150   相机全程 1.000 → 1.03 极缓推进（smooth，到 132f 收住）；132–150 静止收尾
export const WIREFRAME_DRAW_ON_DURATION = 150;

const L = LOOKS.graphite;
const GOLD = L.accent2; // 香槟金：唯一强调色
const WIRE = 'rgba(206,210,220,0.62)';
const WIRE_DIM = 'rgba(206,210,220,0.38)';
const SCAN0 = 92;
const SCAN_DUR = 32;
const SCAN_X0 = 120;
const SCAN_X1 = 1800;

// ───────────── 同源几何表 ─────────────
const WIN = { x: 160, y: 100, w: 1600, h: 880, r: 28 };
const BAR_H = 64;
const SIDE_W = 300;
const MX = WIN.x + SIDE_W + 56; // 主区左缘 516

type Box = { x: number; y: number; w: number; h: number; r: number; t0: number; outer?: boolean; solid: React.CSSProperties };
type Txt = { x: number; y: number; size: number; weight: number; text: string; t0: number; color: string; mono?: boolean; caps?: boolean; ls?: string };

const NAV = ['Overview', 'Revenue', 'Customers', 'Reports', 'Settings'];
const KPIS = [
  { k: 'MRR', v: '$402k' },
  { k: 'Churn', v: '1.8%' },
  { k: 'NRR', v: '124%' },
];

const BOXES: Box[] = [
  // 窗口与分区
  { x: WIN.x, y: WIN.y, w: WIN.w, h: WIN.h, r: WIN.r, t0: 8, outer: true, solid: {} },
  // 侧栏
  { x: WIN.x + 36, y: WIN.y + 98, w: 44, h: 44, r: 12, t0: 18, solid: { background: `linear-gradient(150deg, #f4e1b8, ${GOLD} 60%, #b8964f)` } },
  { x: WIN.x + 24, y: 290 + 68 - 14, w: 252, h: 56, r: 14, t0: 24, solid: { background: 'rgba(255,255,255,0.065)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' } },
  ...NAV.map((_, i): Box => ({
    x: WIN.x + 42, y: 290 + i * 68, w: 28, h: 28, r: 8, t0: 22 + i * 4,
    solid: { background: i === 1 ? GOLD : 'rgba(255,255,255,0.14)' },
  })),
  { x: WIN.x + 24, y: 856, w: 252, h: 96, r: 16, t0: 42, solid: { background: '#1b1c20', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)' } },
  { x: WIN.x + 46, y: 912, w: 208, h: 8, r: 4, t0: 46, solid: { background: 'rgba(255,255,255,0.1)' } },
  { x: WIN.x + 46, y: 912, w: 150, h: 8, r: 4, t0: 50, solid: { background: GOLD } },
  // 页头分段控件
  { x: 1376, y: 210, w: 328, h: 56, r: 14, t0: 30, solid: { background: '#1c1d21', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)' } },
  { x: 1376 + 4 + 2 * 108, y: 214, w: 104, h: 48, r: 11, t0: 34, solid: { background: '#2c2e33', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.4)' } },
  // KPI 块
  ...KPIS.map((_, k): Box => ({
    x: 1080 + k * 212, y: 304, w: 196, h: 172, r: 18, t0: 38 + k * 4,
    solid: { background: 'linear-gradient(180deg, #1f2024, #18191c)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 1px rgba(255,255,255,0.06)' },
  })),
];

const TEXTS: Txt[] = [
  { x: WIN.x + 96, y: WIN.y + 104, size: 32, weight: 700, text: 'Tessera', t0: 20, color: L.ink },
  ...NAV.map((n, i): Txt => ({ x: WIN.x + 88, y: 290 + i * 68 - 1, size: 30, weight: i === 1 ? 650 : 500, text: n, t0: 24 + i * 4, color: i === 1 ? L.ink : L.ink2 })),
  { x: WIN.x + 46, y: 878, size: 22, weight: 650, text: 'Plan · Pro', t0: 44, color: L.ink2, caps: true, ls: '0.12em' },
  { x: MX, y: 206, size: 60, weight: 720, text: 'Revenue', t0: 28, color: L.ink, ls: '-0.03em' },
  ...['7D', '30D', '90D'].map((s, k): Txt => ({ x: 1376 + 4 + k * 108 + (k === 0 ? 38 : 30), y: 224, size: 24, weight: 640, text: s, t0: 32 + k * 2, color: k === 2 ? L.ink : L.ink3 })),
  { x: MX - 6, y: 300, size: 128, weight: 720, text: '$4.82M', t0: 36, color: L.ink, ls: '-0.045em' },
  { x: MX, y: 450, size: 32, weight: 560, text: '+18.4% vs last quarter', t0: 44, color: GOLD },
  ...KPIS.flatMap((p, k): Txt[] => [
    { x: 1080 + k * 212 + 24, y: 304 + 28, size: 22, weight: 700, text: p.k, t0: 40 + k * 4, color: L.ink3, caps: true, ls: '0.16em' },
    { x: 1080 + k * 212 + 22, y: 304 + 86, size: 52, weight: 700, text: p.v, t0: 42 + k * 4, color: L.ink, ls: '-0.03em' },
  ]),
  { x: 827, y: WIN.y + 22, size: 20, weight: 500, text: 'app.tessera.io/revenue', t0: 14, color: L.ink3, mono: true },
];

// 图表
const CH = { x: MX, y: 540, w: 1188, h: 340 };
const DATA = [0.18, 0.24, 0.21, 0.33, 0.3, 0.42, 0.38, 0.5, 0.47, 0.58, 0.55, 0.66, 0.72, 0.69, 0.82, 0.9];
const smooth = (pts: [number, number][]) => {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};
const PTS = DATA.map((v, i) => [CH.x + (i / (DATA.length - 1)) * CH.w, CH.y + CH.h - v * CH.h] as [number, number]);
const LINE_D = smooth(PTS);
const AREA_D = `${LINE_D} L${CH.x + CH.w},${CH.y + CH.h} L${CH.x},${CH.y + CH.h} Z`;
const MONTHS = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'];

const drawT = (frame: number, t0: number, dur = 24) => ramp(frame, t0, dur, bezier(0.4, 0, 0.3, 1));

const txtStyle = (t: Txt): React.CSSProperties => ({
  position: 'absolute', left: t.x, top: t.y, fontSize: t.size, fontWeight: t.weight, lineHeight: `${t.size}px`, whiteSpace: 'nowrap',
  fontFamily: t.mono ? FONT.mono : FONT.sans, letterSpacing: t.ls ?? (t.size >= 50 ? '-0.03em' : '-0.01em'),
  textTransform: t.caps ? 'uppercase' : undefined, fontVariantNumeric: 'tabular-nums',
});

// ───────────── 实体层 ─────────────
const SolidScreen: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0 }}>
    {/* 窗口：深石墨面板 + 发丝边 + 顶部内高光 + 两层落影 */}
    <div style={{
      position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: WIN.r, overflow: 'hidden',
      background: 'linear-gradient(180deg, #17181b 0%, #121315 100%)',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.08), 0 4px 10px rgba(0,0,0,0.5), 0 60px 120px -30px rgba(0,0,0,0.85)`,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: BAR_H, background: '#141518', borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', left: 0, top: BAR_H, width: SIDE_W, bottom: 0, background: '#0f1012', borderRight: '1px solid rgba(255,255,255,0.06)' }} />
      {/* 主区顶部一抹金色余光 */}
      <div style={{ position: 'absolute', left: SIDE_W, right: 0, top: BAR_H, height: 420, background: `radial-gradient(ellipse 50% 70% at 30% 0%, ${alpha(GOLD, 0.07)}, ${alpha(GOLD, 0)} 70%)` }} />
    </div>
    {[0, 1, 2].map((k) => (
      <div key={k} style={{ position: 'absolute', left: WIN.x + 28 + k * 24 - 7, top: WIN.y + 32 - 7, width: 14, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.16)' }} />
    ))}
    <div style={{ position: 'absolute', left: 800, top: WIN.y + 14, width: 320, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)' }} />
    {BOXES.slice(1).map((b, i) => (
      <div key={i} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: b.r, ...b.solid }} />
    ))}
    {/* 图表：网格 + 金色面积 + 线 + 末端点 */}
    {[0, 1, 2, 3].map((k) => (
      <div key={k} style={{ position: 'absolute', left: CH.x, width: CH.w, top: CH.y + (k * CH.h) / 3, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    ))}
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id="wdoArea" x1="0" y1={CH.y} x2="0" y2={CH.y + CH.h} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={GOLD} stopOpacity={0.3} />
          <stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={AREA_D} fill="url(#wdoArea)" />
      <path d={LINE_D} fill="none" stroke={GOLD} strokeWidth={3.5} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${alpha(GOLD, 0.45)})` }} />
      <circle cx={PTS[PTS.length - 1][0]} cy={PTS[PTS.length - 1][1]} r={9} fill={GOLD} />
      <circle cx={PTS[PTS.length - 1][0]} cy={PTS[PTS.length - 1][1]} r={20} fill="none" stroke={GOLD} strokeOpacity={0.35} strokeWidth={2} />
    </svg>
    {MONTHS.map((m, k) => (
      <div key={m} style={{ position: 'absolute', left: CH.x + (k / (MONTHS.length - 1)) * CH.w - 40, width: 80, textAlign: 'center', top: CH.y + CH.h + 22, fontFamily: FONT.mono, fontSize: 20, color: L.ink3 }}>{m}</div>
    ))}
    {TEXTS.map((t, i) => <div key={i} style={{ ...txtStyle(t), color: t.color }}>{t.text}</div>)}
  </div>
);

// ───────────── 线框层 ─────────────
const WireScreen: React.FC<{ frame: number; scanX: number }> = ({ frame, scanX }) => {
  // 预照明：扫描前沿正前方 0–220px 内的线更亮
  const pre = (x: number) => (scanX > SCAN_X0 ? Math.max(0, 1 - Math.abs(x - scanX - 80) / 220) : 0);
  const strokeProps = (t: number, w: number, color = WIRE): React.SVGAttributes<SVGElement> => ({
    fill: 'none', stroke: color, strokeWidth: w, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - t,
    strokeLinecap: 'round', strokeLinejoin: 'round', opacity: t > 0 ? 1 : 0,
  });
  const tWin = drawT(frame, 8, 30);
  const tBar = drawT(frame, 14, 26);
  const tSide = drawT(frame, 18, 30);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {/* 窗口外框 + 标题栏 + 侧栏分隔 */}
        <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx={WIN.r} {...strokeProps(tWin, 1.6)} />
        <line x1={WIN.x} y1={WIN.y + BAR_H} x2={WIN.x + WIN.w} y2={WIN.y + BAR_H} {...strokeProps(tBar, 1.2)} />
        <line x1={WIN.x + SIDE_W} y1={WIN.y + BAR_H} x2={WIN.x + SIDE_W} y2={WIN.y + WIN.h} {...strokeProps(tSide, 1.2)} />
        {[0, 1, 2].map((k) => <circle key={k} cx={WIN.x + 28 + k * 24} cy={WIN.y + 32} r={7} {...strokeProps(drawT(frame, 12 + k * 2, 12), 1.2)} />)}
        <rect x={800} y={WIN.y + 14} width={320} height={36} rx={10} {...strokeProps(drawT(frame, 16, 20), 1.2, WIRE_DIM)} />
        {BOXES.slice(1).map((b, i) => {
          const glowK = pre(b.x + b.w / 2);
          return (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={b.r}
              {...strokeProps(drawT(frame, b.t0), 1.2, glowK > 0.02 ? `rgba(240,226,196,${(0.62 + 0.38 * glowK).toFixed(3)})` : WIRE)} />
          );
        })}
        {/* 图表：网格（虚线）+ 曲线 + 面积下缘 */}
        {[0, 1, 2, 3].map((k) => (
          <line key={k} x1={CH.x} x2={CH.x + CH.w} y1={CH.y + (k * CH.h) / 3} y2={CH.y + (k * CH.h) / 3}
            stroke={WIRE_DIM} strokeWidth={1} strokeDasharray="6 8" opacity={drawT(frame, 44 + k * 2, 16)} />
        ))}
        <path d={LINE_D} {...strokeProps(drawT(frame, 50, 30), 1.8)} />
        {PTS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={4} fill="none" stroke={WIRE} strokeWidth={1.2} opacity={ramp(frame, 52 + i * 1.6, 6, EASE.out)} />
        ))}
      </svg>
      {/* 空心描边字：与实体字同位置，像笔一样从左往右写出 */}
      {TEXTS.map((t, i) => {
        const p = ramp(frame, t.t0 + 2, Math.max(10, t.text.length * 1.2), EASE.swift);
        return (
          <div key={i} style={{
            ...txtStyle(t), color: 'transparent', WebkitTextStroke: `${t.size >= 60 ? 1.6 : 1.1}px ${pre(t.x) > 0.02 ? 'rgba(240,226,196,0.9)' : WIRE}`,
            clipPath: `inset(-20% ${((1 - p) * 100).toFixed(2)}% -20% -2%)`, opacity: p > 0 ? 1 : 0,
          }}>{t.text}</div>
        );
      })}
      {MONTHS.map((m, k) => (
        <div key={m} style={{
          position: 'absolute', left: CH.x + (k / (MONTHS.length - 1)) * CH.w - 40, width: 80, textAlign: 'center', top: CH.y + CH.h + 22,
          fontFamily: FONT.mono, fontSize: 20, color: WIRE_DIM, opacity: ramp(frame, 56 + k * 2, 8, EASE.out),
        }}>{m}</div>
      ))}
    </div>
  );
};

// 尺寸标注（纹理级等宽小字）：扫描线经过时熄灭
const Dim: React.FC<{ frame: number; t0: number; scanX: number; x1: number; y1: number; x2: number; y2: number; label: string }> = ({ frame, t0, scanX, x1, y1, x2, y2, label }) => {
  const p = ramp(frame, t0, 14, EASE.out);
  const off = ramp(scanX, Math.min(x1, x2) - 40, 80, EASE.linear);
  const o = p * (1 - off);
  if (o <= 0.01) return null;
  const vert = x1 === x2;
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: o, overflow: 'visible' }}>
        <line x1={x1} y1={y1} x2={vert ? x2 : x1 + (x2 - x1) * p} y2={vert ? y1 + (y2 - y1) * p : y2} stroke={alpha(GOLD, 0.7)} strokeWidth={1} />
        {vert
          ? [y1, y2].map((y) => <line key={y} x1={x1 - 7} x2={x1 + 7} y1={y} y2={y} stroke={alpha(GOLD, 0.7)} strokeWidth={1} />)
          : [x1, x2].map((x) => <line key={x} x1={x} x2={x} y1={y1 - 7} y2={y1 + 7} stroke={alpha(GOLD, 0.7)} strokeWidth={1} />)}
      </svg>
      <div style={{
        position: 'absolute', left: cx - 60, width: 120, top: cy - 12, textAlign: 'center', opacity: o,
        fontFamily: FONT.mono, fontSize: 18, color: alpha(GOLD, 0.9), letterSpacing: '0.06em',
        transform: vert ? 'rotate(-90deg)' : undefined,
      }}>
        <span style={{ background: '#0e0f11', padding: '0 8px' }}>{label}</span>
      </div>
    </>
  );
};

export const WireframeDrawOn: React.FC = () => {
  const frame = useCurrentFrame();
  const scanP = ramp(frame, SCAN0, SCAN_DUR, bezier(0.55, 0, 0.25, 1));
  const scanX = SCAN_X0 + (SCAN_X1 - SCAN_X0) * scanP;
  const scanning = frame >= SCAN0 - 2;
  const lineO = Math.min(ramp(frame, SCAN0 - 2, 6, EASE.out), 1 - ramp(frame, SCAN0 + SCAN_DUR - 4, 8, EASE.out));
  const cam = 1 + 0.03 * ramp(frame, 0, 132, EASE.smooth);
  const intro = ramp(frame, 0, 14, EASE.out);
  const done = ramp(frame, SCAN0 + SCAN_DUR - 6, 20, EASE.out);
  // 窗口四角裁切标记
  const crops: [number, number, number, number][] = [
    [WIN.x - 18, WIN.y - 18, 1, 1], [WIN.x + WIN.w + 18, WIN.y - 18, -1, 1],
    [WIN.x - 18, WIN.y + WIN.h + 18, 1, -1], [WIN.x + WIN.w + 18, WIN.y + WIN.h + 18, -1, -1],
  ];
  const clipRight = scanning ? Math.max(0, 1920 - scanX) : 1920;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: -0.1 }} fill={{ x: 0.2, y: 1.0 }} intensity={0.7 + 0.3 * done}>
        {/* 制图台点阵 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: intro * (1 - 0.6 * done),
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.11) 1px, rgba(0,0,0,0) 1.5px)', backgroundSize: '24px 24px',
        }} />
      </Stage>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: '960px 540px' }}>
        {/* 裁切标记 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: intro * (1 - done) }}>
          {crops.map(([x, y, sx, sy], k) => (
            <path key={k} d={`M${x},${y + sy * 30} L${x},${y} L${x + sx * 30},${y}`} fill="none" stroke={WIRE} strokeWidth={1.4} />
          ))}
        </svg>
        <WireScreen frame={frame} scanX={scanning ? scanX : -999} />
        <Dim frame={frame} t0={58} scanX={scanning ? scanX : -999} x1={WIN.x} y1={WIN.y - 40} x2={WIN.x + WIN.w} y2={WIN.y - 40} label="1600" />
        <Dim frame={frame} t0={64} scanX={scanning ? scanX : -999} x1={WIN.x - 52} y1={WIN.y} x2={WIN.x - 52} y2={WIN.y + WIN.h} label="880" />
        <Dim frame={frame} t0={70} scanX={scanning ? scanX : -999} x1={WIN.x + SIDE_W} y1={512} x2={MX} y2={512} label="56" />
        {/* 实体层：clip 前沿 = scanX */}
        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(-10% ${clipRight.toFixed(2)}px -10% -10%)` }}>
          <SolidScreen />
          {/* 前沿余温：刚显影的一段暖光，向左渐隐 */}
          {scanP > 0 && scanP < 1 && (
            <div style={{
              position: 'absolute', top: WIN.y, height: WIN.h, left: scanX - 300, width: 300, pointerEvents: 'none', mixBlendMode: 'screen',
              background: `linear-gradient(90deg, ${alpha(GOLD, 0)} 0%, ${alpha(GOLD, 0.05)} 60%, ${alpha(GOLD, 0.13)} 100%)`,
              WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 12%, #000 88%, transparent 100%)',
            }} />
          )}
        </div>
        {/* 扫描竖线：白芯 + 香槟金辉光 */}
        {lineO > 0.01 && (
          <div style={{ position: 'absolute', left: scanX - 1.5, top: WIN.y - 60, width: 3, height: WIN.h + 120, opacity: lineO }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 2,
              background: `linear-gradient(180deg, ${alpha('#fff6e2', 0)} 0%, #fff6e2 14%, #ffffff 50%, #fff6e2 86%, ${alpha('#fff6e2', 0)} 100%)`,
              boxShadow: glow(GOLD, 1.1),
            }} />
            <div style={{ position: 'absolute', left: -40, width: 83, top: 0, bottom: 0, background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(GOLD, 0.22)}, ${alpha(GOLD, 0)} 70%)` }} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
