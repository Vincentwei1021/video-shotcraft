// flyline-arc —— 飞线连接
// FakeDashboard A 微暗化(brightness 0.92)，左上卡→右下卡一条贝塞尔弧线
// "打"过去(22f, out-cubic 生长)，亮点头部领跑、亮头暗尾拖尾；到达帧目标卡
// 3px+ ink 描边脉冲 + 加深脉冲(白底禁提亮)。随后第二条线接力打到上中卡。
// 收尾真静止：全部动画在 f86 前结束，之后所有元素冻结。
import React, { useId } from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';

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

// 卡片几何（FakeDashboard variant A 实测网格）
const CARD_LT = { x: 256, y: 108, w: 524, h: 454, cx: 518, cy: 335 }; // 左上
const CARD_RB = { x: 1360, y: 590, w: 524, h: 454, cx: 1622, cy: 817 }; // 右下
const CARD_TM = { x: 808, y: 108, w: 524, h: 454, cx: 1070, cy: 335 }; // 上中

// 一条飞线：深色衬底 + 亮头暗尾白线分段 + 光头领跑（条件挂载）
const Flyline: React.FC<{
  frame: number;
  start: number; // 生长起始帧
  haloId: string; // 光头径向渐变 ID（父组件按实例生成）
  p0: Pt; p1: Pt; p2: Pt; p3: Pt;
}> = ({ frame, start, haloId, p0, p1, p2, p3 }) => {
  const DUR = 22;
  if (frame < start) return null;
  const e = interpolate(frame, [start, start + DUR], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const growing = frame < start + DUR;
  // 到达后 10f 内尾部亮度线性抹匀 → 之后完全静止
  const settle = interpolate(frame, [start + DUR, start + DUR + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pts: Pt[] = [];
  const nDrawn = Math.max(2, Math.ceil(e * N) + 1);
  for (let i = 0; i < nDrawn; i++) {
    const t = Math.min((i / N), e);
    pts.push(bez(p0, p1, p2, p3, t));
  }
  const head = bez(p0, p1, p2, p3, e);
  pts[pts.length - 1] = head;

  const underlay = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // 亮头暗尾：每段按"离头距离"给 opacity；到达后 settle 抹匀到 1
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const tSeg = Math.min(i / N, e) / Math.max(e, 0.001); // 0 尾 → 1 头
    const grad = 0.4 + 0.6 * tSeg * tSeg;
    const op = grad + (1 - grad) * settle;
    segs.push(
      <line
        key={i}
        x1={pts[i].x} y1={pts[i].y} x2={pts[i + 1].x} y2={pts[i + 1].y}
        stroke="#fafafa" strokeWidth={4.5} strokeLinecap="round" strokeOpacity={op}
      />
    );
  }

  return (
    <g>
      {/* 深色衬底：保证浅底可见 */}
      <polyline
        points={underlay} fill="none" stroke="#2f2f2f"
        strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.92}
      />
      {segs}
      {/* 光头：仅生长期挂载，摘罩即真静止 */}
      {growing && (
        <g>
          <circle cx={head.x} cy={head.y} r={26} fill={`url(#${haloId})`} />
          <circle cx={head.x} cy={head.y} r={9} fill="#ffffff" stroke="#2f2f2f" strokeWidth={3} />
        </g>
      )}
    </g>
  );
};

// 目标卡脉冲：3px+ ink 描边 + 加深罩(白底不许提亮) —— 条件挂载
const CardPulse: React.FC<{
  frame: number;
  at: number; // 触发帧
  rect: { x: number; y: number; w: number; h: number };
}> = ({ frame, at, rect }) => {
  if (frame < at || frame > at + 18) return null;
  // 扩散(起升)用 out-cubic 6f，消散用线性 12f
  const amp =
    frame <= at + 6
      ? interpolate(frame, [at, at + 6], [0, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : interpolate(frame, [at + 6, at + 18], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  return (
    <g>
      <rect
        x={rect.x + 2} y={rect.y + 2} width={rect.w - 4} height={rect.h - 4}
        rx={14} fill={`rgba(0,0,0,${(0.16 * amp).toFixed(3)})`}
      />
      <rect
        x={rect.x + 2} y={rect.y + 2} width={rect.w - 4} height={rect.h - 4}
        rx={14} fill="none" stroke="#2f2f2f" strokeWidth={4} strokeOpacity={amp}
      />
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
    <div style={{ width: 1920, height: 1080, position: 'relative', background: '#e0e0de' }}>
      {/* 背景微暗化 0.92，常量、不动画 */}
      <div style={{ filter: 'brightness(0.92)' }}>
        <FakeDashboard variant="A" />
      </div>
      <svg
        width={1920} height={1080} viewBox="0 0 1920 1080"
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          <radialGradient id={haloId}>
            <stop offset="0%" stopColor="rgba(0,0,0,0.38)" />
            <stop offset="55%" stopColor="rgba(0,0,0,0.18)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <CardPulse frame={frame} at={32} rect={CARD_RB} />
        <CardPulse frame={frame} at={68} rect={CARD_TM} />
        <Flyline frame={frame} start={10} haloId={haloId} {...L1} />
        <Flyline frame={frame} start={46} haloId={haloId} {...L2} />
      </svg>
    </div>
  );
};
