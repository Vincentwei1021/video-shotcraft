// 文字沿曲线流入（text-on-path）——字符沿一条上升贝塞尔曲线（像图表增长线）
// 鱼贯滑入，行进中按切线角旋转；到达各自终点后再从"贴线姿态"lerp 到水平基线位
// 拼成正常标题。曲线本身随字符前进同步 evolve（dashoffset 生长）。
//
// 质感升级（原版字符各自起跑、后面的字要追越前面的字，曲线低段挤成一团）：
// - 整串字像一列火车沿弧长刚性推进（字间距 = 字的真实步进），行进中就能读出 "GROWTH ALL THE WAY"；
//   车头（末字）领跑，曲线 evolve 与车头同步生长。
// - 到达后停 8f，再从左到右错峰 12f inOut 摆正到水平基线；终位按实测字宽排版（不再用 46px 估宽）。
// - 曲线做成图表增长线：强调色 4px 圆头描边 + 线下渐变面积 + 车头光点 + 4 条发丝网格线与刻度。
// - 柔光 Backdrop，系统 SF 栈 700；去掉调试标题；补导出时长 150f。
// 关键帧：0–56 整串沿线推进（out cubic）→ 停 8f → 64 起逐字 1.5f 错峰、12f 摆正 →
// 末字约 f101 落定 → 101–150 真静止。
import React, { useLayoutEffect, useRef, useState } from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, ramp } from '../../_fixtures/Polish';

export const TEXT_ON_PATH_DURATION = 150;

// 上升贝塞尔：左下 → 右上，先缓后陡（增长线形状）
const P0 = { x: 200, y: 860 };
const P1 = { x: 760, y: 850 };
const P2 = { x: 1240, y: 700 };
const P3 = { x: 1640, y: 400 };

const bez = (t: number) => {
  const u = 1 - t;
  return {
    x: u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x,
    y: u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y,
  };
};
// 切线角（度）
const tangent = (t: number) => {
  const u = 1 - t;
  const dx = 3 * u * u * (P1.x - P0.x) + 6 * u * t * (P2.x - P1.x) + 3 * t * t * (P3.x - P2.x);
  const dy = 3 * u * u * (P1.y - P0.y) + 6 * u * t * (P2.y - P1.y) + 3 * t * t * (P3.y - P2.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};

// 弧长表：s(t) 采样 + 反查 t(s)
const SAMPLES = 240;
const ARC: number[] = (() => {
  const a = [0];
  let prev = bez(0);
  for (let k = 1; k <= SAMPLES; k++) {
    const p = bez(k / SAMPLES);
    a.push(a[k - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  return a;
})();
const LEN = ARC[SAMPLES];
const tAtS = (s: number) => {
  const v = Math.max(0, Math.min(LEN, s));
  let lo = 0;
  let hi = SAMPLES;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ARC[mid] < v) lo = mid;
    else hi = mid;
  }
  const seg = ARC[hi] - ARC[lo] || 1;
  return (lo + (v - ARC[lo]) / seg) / SAMPLES;
};

const TEXT = 'GROWTH ALL THE WAY';
const N = TEXT.length;
const FS = 68;
const CHAR_W = 44; // 实测前的兜底字宽
const FINAL_Y = 290; // 水平基线（标题最终落位，字心 y）
const TRAVEL = 56; // 整串沿线推进时长
const HOLD = 8; // 到达后停顿
const SETTLE = 12; // 摆正时长
const SETTLE_STAG = 1.5; // 摆正逐字错峰
const END_S = LEN * 0.9; // 车头（末字字心）最终停在弧长 90% 处

// 网格线（y）与刻度标签
const GRID = [400, 553, 706, 860];
const TICKS = ['$40k', '$30k', '$20k', '$10k'];

export const TextOnPath: React.FC = () => {
  const frame = useCurrentFrame();

  // 实测每个字符的步进（字心相对整串左缘的偏移 + 整串宽）
  const measRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ centers: number[]; width: number }>(() => ({
    centers: TEXT.split('').map((_, i) => i * CHAR_W + CHAR_W / 2),
    width: N * CHAR_W,
  }));
  useLayoutEffect(() => {
    const el = measRef.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const centers = kids.map((k) => k.offsetLeft + k.offsetWidth / 2);
    const width = el.offsetWidth;
    if (width > 0) setLayout({ centers, width });
  }, []);
  const { centers, width } = layout;
  const finalX0 = 960 - width / 2;

  // 车头沿弧长推进：从"整串都还在起点之前"到 END_S
  const head = interpolate(frame, [0, TRAVEL], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const lastC = centers[N - 1];
  const headS = -12 + (END_S + 12) * head; // 车头字心弧长
  // 曲线 evolve：与车头同步生长（略领先半个字宽），到达后补完余下的线
  const tail = ramp(frame, TRAVEL - 6, 30, EASE.out);
  const evolveS = Math.min(LEN, Math.max(headS + FS * 0.4, 0) * (1 - tail) + LEN * tail);
  const evolveFrac = evolveS / LEN; // dash 按弧长比例
  const tip = bez(tAtS(evolveS));

  const pathD = `M ${P0.x} ${P0.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${P3.x} ${P3.y}`;
  const areaD = `${pathD} L ${P3.x} ${GRID[3]} L ${P0.x} ${GRID[3]} Z`;
  const gridIn = ramp(frame, 0, 24, EASE.out);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.22 }} accent="#5b63d3" grain={0.045} vignette={0.12} />
      {/* 隐藏量宽行（与终态同字体字距） */}
      <div
        ref={measRef}
        style={{
          position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', display: 'flex',
          fontFamily: FONT.sans, fontWeight: 700, fontSize: FS, letterSpacing: '0.04em',
        }}
      >
        {TEXT.split('').map((ch, i) => (
          <span key={i}>{ch === ' ' ? ' ' : ch}</span>
        ))}
      </div>

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="top-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={G.accent} stopOpacity={0.16} />
            <stop offset="1" stopColor={G.accent} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="top-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#9aa0ea" />
            <stop offset="1" stopColor={G.accent} />
          </linearGradient>
          <clipPath id="top-reveal">
            <rect x={0} y={0} width={tip.x} height={1080} />
          </clipPath>
        </defs>
        {/* 发丝网格 + 刻度 */}
        <g opacity={gridIn}>
          {GRID.map((y, k) => (
            <g key={y}>
              <line x1={200} x2={1720} y1={y} y2={y} stroke="rgba(20,22,28,0.08)" strokeWidth={1} strokeDasharray={k === 3 ? undefined : '4 8'} />
              <text x={1734} y={y + 7} fontFamily={FONT.sans} fontSize={20} fill={G.ink3} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {TICKS[k]}
              </text>
            </g>
          ))}
        </g>
        {/* 线下面积：随曲线生长揭开 */}
        <path d={areaD} fill="url(#top-area)" clipPath="url(#top-reveal)" />
        <path
          d={pathD}
          fill="none" stroke="url(#top-line)" strokeWidth={4} strokeLinecap="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - evolveFrac}
        />
        {/* 车头光点 */}
        {evolveFrac > 0.002 && (
          <g>
            <circle cx={tip.x} cy={tip.y} r={16} fill={G.accent} opacity={0.14} />
            <circle cx={tip.x} cy={tip.y} r={7} fill="#ffffff" stroke={G.accent} strokeWidth={3} />
          </g>
        )}
      </svg>

      {TEXT.split('').map((ch, i) => {
        if (ch === ' ') return null;
        // 本字字心的弧长：车头弧长 - 与末字的真实步进差
        const s = headS - (lastC - centers[i]);
        const t = tAtS(s);
        const onPath = bez(t);
        // 弧长 <0 的部分还没上线：沿起点切线方向退在线外，并淡出
        const pre = Math.min(0, s);
        const ang0 = tangent(0) * (Math.PI / 180);
        const px = onPath.x + Math.cos(ang0) * pre;
        const py = onPath.y + Math.sin(ang0) * pre;
        const angOnCurve = tangent(t);
        // 到达后停 HOLD 帧，再从左到右错峰摆正到水平基线
        const st = TRAVEL + HOLD + i * SETTLE_STAG;
        const settle = interpolate(frame, [st, st + SETTLE], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          easing: Easing.inOut(Easing.cubic),
        });
        const x = px + (finalX0 + centers[i] - px) * settle;
        const y = py + (FINAL_Y - py) * settle;
        const ang = angOnCurve * (1 - settle);
        const op = interpolate(s, [-FS * 0.8, 0], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, opacity: op,
            // 字形底边贴线：先把字心抬到线上方半个字高再转
            transform: `translate(-50%, -50%) rotate(${ang.toFixed(3)}deg) translateY(${(-0.42 * FS * (1 - settle)).toFixed(2)}px)`,
            fontFamily: FONT.sans, fontWeight: 700, letterSpacing: '0.04em',
            fontSize: FS, color: G.ink1, lineHeight: 1,
            whiteSpace: 'pre',
          }}>
            {ch}
          </div>
        );
      })}
    </div>
  );
};
