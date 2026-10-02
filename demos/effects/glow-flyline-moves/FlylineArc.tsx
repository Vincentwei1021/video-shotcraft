// flyline-arc —— 飞线连接
// 暗场版 FakeDashboard A 压暗当底，左上卡→右下卡一条贝塞尔弧线"打"过去（22f, out-cubic 生长），
// 亮点头部领跑、亮头暗尾拖尾；到达帧目标卡描边脉冲点亮。随后第二条线接力打到上中卡。
// 收尾真静止：全部动画在 f86 前结束，之后所有元素冻结。
//
// 质感升级：本卡定位是暗场段落（md「库内第一张整卡住在暗场」），底图换 FakeDashboard 深色版并
// 压暗 0.65 + 暗角，飞线成为前景层；线体从"白线 + 深灰衬底"改为暗场版"白芯 + 两层靛蓝辉光"，
// butt 端分段消除珠串；光头加彗尾亮段与靛蓝光晕；起点亮起一个锚点、落点留下一个节点；
// 卡脉冲在暗场里改为提亮（强调色描边 + 外辉光 + 极淡卡面提亮），落点同帧一圈冲击环；颗粒防色带。
import React, { useId } from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { Grain, Vignette } from '../../_fixtures/Polish';

export const FLYLINE_ARC_DURATION = 140; // ~4.7s：动画 f86 前结束，末 54f 真静止

type Pt = { x: number; y: number };

// 手写 cubic bezier 采样
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

const N = 100; // 采样段数
const GLOW = '128,138,255'; // 飞线辉光色（与暗场 dashboard 的强调色同族）

// 卡片几何（FakeDashboard variant A 实测网格）
const CARD_LT = { x: 256, y: 108, w: 524, h: 454, cx: 518, cy: 335 }; // 左上
const CARD_RB = { x: 1360, y: 590, w: 524, h: 454, cx: 1622, cy: 817 }; // 右下
const CARD_TM = { x: 808, y: 108, w: 524, h: 454, cx: 1070, cy: 335 }; // 上中

const clampX = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

// 一条飞线：靛蓝辉光衬底 + 亮头暗尾白芯分段 + 光头领跑（条件挂载）
const Flyline: React.FC<{
  frame: number;
  start: number; // 生长起始帧
  haloId: string; // 光头径向渐变 ID（父组件按实例生成）
  p0: Pt; p1: Pt; p2: Pt; p3: Pt;
}> = ({ frame, start, haloId, p0, p1, p2, p3 }) => {
  const DUR = 22;
  if (frame < start) return null;
  const e = interpolate(frame, [start, start + DUR], [0, 1], { easing: Easing.out(Easing.cubic), ...clampX });
  const growing = frame < start + DUR;
  // 到达后 10f 内尾部亮度抹匀（ease-out）→ 之后完全静止
  const settle = interpolate(frame, [start + DUR, start + DUR + 10], [0, 1], { easing: Easing.out(Easing.quad), ...clampX });
  // 起点锚：生长前 6f 亮起
  const anchor = interpolate(frame, [start, start + 6], [0, 1], { easing: Easing.out(Easing.cubic), ...clampX });

  const pts: Pt[] = [];
  const nDrawn = Math.max(2, Math.ceil(e * N) + 1);
  for (let i = 0; i < nDrawn; i++) {
    const t = Math.min(i / N, e);
    pts.push(bez(p0, p1, p2, p3, t));
  }
  const head = bez(p0, p1, p2, p3, e);
  pts[pts.length - 1] = head;

  const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // 亮头暗尾：每段按"离头距离"给 opacity；到达后 settle 抹匀到 1。butt 端，相邻段不叠加出珠串
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const tSeg = Math.min(i / N, e) / Math.max(e, 0.001); // 0 尾 → 1 头
    const grad = 0.3 + 0.7 * tSeg * tSeg;
    const op = grad + (1 - grad) * settle;
    segs.push(
      <line
        key={i}
        x1={pts[i].x} y1={pts[i].y} x2={pts[i + 1].x} y2={pts[i + 1].y}
        stroke="#f6f6ff" strokeWidth={3.5} strokeLinecap="butt" strokeOpacity={op}
      />
    );
  }
  const comet = pts.slice(Math.max(0, pts.length - 9)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <g>
      {/* 起点锚 */}
      <circle cx={p0.x} cy={p0.y} r={9 * anchor} fill={`rgba(${GLOW},0.25)`} />
      <circle cx={p0.x} cy={p0.y} r={4.5 * anchor} fill="#ffffff" />
      {/* 辉光衬底：宽幅低透明 + 次宽中透明两层 */}
      <polyline points={poly} fill="none" stroke={`rgb(${GLOW})`} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.1 + 0.04 * settle} />
      <polyline points={poly} fill="none" stroke="rgb(150,160,255)" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.24} />
      {segs}
      {/* 光头 + 彗尾：仅生长期挂载，摘罩即真静止 */}
      {growing && (
        <g>
          <polyline points={comet} fill="none" stroke="#ffffff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.55} />
          <circle cx={head.x} cy={head.y} r={40} fill={`url(#${haloId})`} />
          <circle cx={head.x} cy={head.y} r={7} fill="#ffffff" />
        </g>
      )}
      {/* 落点节点：到达后常驻 */}
      {!growing && (
        <g>
          <circle cx={p3.x} cy={p3.y} r={11} fill={`rgba(${GLOW},0.22)`} />
          <circle cx={p3.x} cy={p3.y} r={5} fill="#ffffff" />
        </g>
      )}
    </g>
  );
};

// 目标卡脉冲：暗场里提亮——强调色描边 + 外辉光 + 极淡卡面提亮；落点同帧一圈冲击环 —— 条件挂载
const CardPulse: React.FC<{
  frame: number;
  at: number; // 触发帧
  rect: { x: number; y: number; w: number; h: number; cx: number; cy: number };
}> = ({ frame, at, rect }) => {
  if (frame < at) return null;
  // 扩散(起升)用 out-cubic 6f，消散 12f 到残余 0.25（被点亮的卡保持轻微描边，交代"已连接"）
  const amp =
    frame <= at + 6
      ? interpolate(frame, [at, at + 6], [0, 1], { easing: Easing.out(Easing.cubic), ...clampX })
      : interpolate(frame, [at + 6, at + 18], [1, 0.25], { easing: Easing.out(Easing.quad), ...clampX });
  const ring = interpolate(frame, [at, at + 14], [0, 1], { easing: Easing.out(Easing.cubic), ...clampX });
  return (
    <g>
      <defs>
        <filter id={`pulse-glow-${at}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={10} />
        </filter>
      </defs>
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={14} fill="none" stroke={`rgb(${GLOW})`} strokeWidth={8}
        strokeOpacity={0.5 * amp} filter={`url(#pulse-glow-${at})`} />
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={14} fill={`rgba(200,206,255,${(0.05 * amp).toFixed(3)})`} />
      <rect x={rect.x + 0.75} y={rect.y + 0.75} width={rect.w - 1.5} height={rect.h - 1.5} rx={13.5} fill="none"
        stroke="#c9ceff" strokeWidth={1.5} strokeOpacity={0.9 * amp} />
      {ring < 1 && (
        <circle cx={rect.cx} cy={rect.cy} r={12 + 80 * ring} fill="none" stroke="#c9ceff"
          strokeWidth={2.5 * (1 - ring) + 0.5} strokeOpacity={0.75 * (1 - ring)} />
      )}
    </g>
  );
};

export const FlylineArc: React.FC = () => {
  const frame = useCurrentFrame();
  // 渐变 ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const haloId = `headHalo-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // 时间轴：线1 生长 10–32f → 卡RB脉冲 32–50f；线2 生长 46–68f → 卡TM脉冲 68–86f
  // f86 后全静止（140f 总长 → 静止 54f ≥ 35f）
  const L1 = { p0: { x: CARD_LT.cx, y: CARD_LT.cy }, p1: { x: 818, y: 60 }, p2: { x: 1322, y: 380 }, p3: { x: CARD_RB.cx, y: CARD_RB.cy } };
  const L2 = { p0: { x: CARD_RB.cx, y: CARD_RB.cy }, p1: { x: 1760, y: 560 }, p2: { x: 1360, y: 150 }, p3: { x: CARD_TM.cx, y: CARD_TM.cy } };

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', background: '#0b0c10', overflow: 'hidden' }}>
      {/* 背景：深色 dashboard 压暗 0.65，常量、不动画——让飞线成为前景层 */}
      <div style={{ filter: 'brightness(0.65) saturate(0.9)' }}>
        <FakeDashboard variant="A" tone="dark" />
      </div>
      <Vignette strength={0.5} inner={0.45} color="#030408" />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <defs>
          <radialGradient id={haloId}>
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="30%" stopColor="rgba(170,178,255,0.3)" />
            <stop offset="100%" stopColor="rgba(128,138,255,0)" />
          </radialGradient>
        </defs>
        <CardPulse frame={frame} at={32} rect={CARD_RB} />
        <CardPulse frame={frame} at={68} rect={CARD_TM} />
        <Flyline frame={frame} start={10} haloId={haloId} {...L1} />
        <Flyline frame={frame} start={46} haloId={haloId} {...L2} />
      </svg>
      <Grain opacity={0.07} blend="soft-light" />
    </div>
  );
};
