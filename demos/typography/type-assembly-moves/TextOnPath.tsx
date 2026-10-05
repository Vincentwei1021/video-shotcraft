// 文字沿曲线流入（text-on-path）——字符沿一条上升曲线（图表增长线）鱼贯流入，行进中按切线角旋转；
// 到达后逐字从"贴线姿态"抬升摆正成水平标题。曲线随车头字符同步 evolve。
//
// 第二轮重设计（midnight · 暗场数据发布会）：
// - look = midnight（深蓝夜 · 电光蓝 · 青色点缀）。主角是一条占满画面的营收增长线：电光蓝 5px 圆头描边 +
//   线下纵向渐变面积 + 外发光，车头是一颗青色光点；背景是 4 条发丝网格线 + mono 刻度（纹理级）。
// - 文案「UP AND TO THE RIGHT」92px / 800 字重全大写——字面意思就是这条线，字沿线走 = 字与数据同框叙事。
//   整串按真实步进沿弧长刚性推进（末字领跑、切线角旋转，行进中可读），按速度加横向拖影。
// - 摆正不再是原地 lerp：每个字沿一条"先抬起、后横移"的弧线飞到左上标题位（y 用 snappy、x 用 swift，
//   两条曲线错开 → 轨迹是弧），从左到右 1.1f 错峰，落位带 ≤一次的轻微过冲。
// - 余波：车头光点落在线顶 → 一枚数值牌「$48.6M ARR」+「▲ 312%」弹出（弹簧），眉题与副句逐词升起；
//   hold 段整画面 1.5% 极缓推近。
//
// 时间表（30fps，共 160f）：
//   0–16    网格线自左擦入、刻度淡入；舞台光（第 1 帧即有网格起始态）
//   4–64    整串沿线推进 60f（缓起、长 ease-out），曲线与车头同步生长
//   64–72   停 8f：整句挂在线上可读
//   72–110  逐字抬升摆正（18f/字，1.1f 错峰），曲线补完、面积淡满
//   92–110  副句 / 眉题升起；98 数值牌弹出（弹簧）；100 起季度标记逐个点亮
//   108–160 hold（极缓推近 1.5%）
import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, glow, springAt, type } from '../../_fixtures/Look';

export const TEXT_ON_PATH_DURATION = 160;

const L = LOOKS.midnight;

// 增长曲线：左下 → 右上（先缓后陡，但拐弯半径够大，92px 字不互相啃角）
const P0 = { x: 150, y: 930 };
const P1 = { x: 860, y: 920 };
const P2 = { x: 1300, y: 780 };
const P3 = { x: 1700, y: 400 };

const bez = (t: number) => {
  const u = 1 - t;
  return {
    x: u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x,
    y: u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y,
  };
};
const tangent = (t: number) => {
  const u = 1 - t;
  const dx = 3 * u * u * (P1.x - P0.x) + 6 * u * t * (P2.x - P1.x) + 3 * t * t * (P3.x - P2.x);
  const dy = 3 * u * u * (P1.y - P0.y) + 6 * u * t * (P2.y - P1.y) + 3 * t * t * (P3.y - P2.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};

// 弧长表：s(t) 采样 + 反查 t(s)
const SAMPLES = 300;
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

const TEXT = 'UP AND TO THE RIGHT';
const N = TEXT.length;
const FS = 92;
const TRACK = '-0.01em';
const CHAR_W = 60; // 实测前的兜底字宽
const FINAL = { x: 150, y: 250 }; // 标题落位：左缘 x、字心 y
const T0 = 4; // 起跑
const TRAVEL = 60; // 沿线推进
const HOLD = 8; // 挂线停顿
const SETTLE = 18; // 每字摆正
const SETTLE_STAG = 1.1;
const END_S = LEN * 0.94; // 车头字心最终停在弧长 94% 处
const TRAVEL_EASE = bezier(0.42, 0, 0.12, 1); // 缓起、长 ease-out
const LIFT_EASE = bezier(0.3, 1.22, 0.6, 1); // 抬升：快到、过冲 ~4% 回落（抬升行程大，8% 会顶进眉题）

// 网格（y）与刻度
const GRID = [400, 577, 753, 930];
const TICKS = ['$60M', '$40M', '$20M', '$0'];
const QUARTERS: [number, string][] = [[0.42, 'Q2 · $11M'], [0.66, 'Q3 · $24M'], [0.85, 'Q4 · $37M']];
const MONTHS = ['JAN', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV'];

export const TextOnPath: React.FC = () => {
  const frame = useCurrentFrame();

  // 实测每个字符的字心（相对整串左缘）
  const measRef = useRef<HTMLDivElement>(null);
  const [centers, setCenters] = useState<number[]>(() => TEXT.split('').map((_, i) => i * CHAR_W + CHAR_W / 2));
  useLayoutEffect(() => {
    const el = measRef.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const c = kids.map((k) => k.offsetLeft + k.offsetWidth / 2);
    if (el.offsetWidth > 0) setCenters(c);
  }, []);
  const lastC = centers[N - 1];

  // 车头沿弧长推进
  const headAt = (f: number) => -24 + (END_S + 24) * ramp(f, T0, TRAVEL, TRAVEL_EASE);
  const headS = headAt(frame);
  const headV = Math.abs(velocity(headAt, frame)); // px/帧
  // 曲线 evolve：与车头同步（略领先），到达后补完余下的线
  const tail = ramp(frame, T0 + TRAVEL - 4, 30, EASE.out);
  const evolveS = Math.min(LEN, Math.max(headS + FS * 0.45, 0) * (1 - tail) + LEN * tail);
  const tip = bez(tAtS(evolveS));
  const evolveFrac = evolveS / LEN;

  const pathD = `M ${P0.x} ${P0.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${P3.x} ${P3.y}`;
  const areaD = `${pathD} L ${P3.x} ${GRID[3]} L ${P0.x} ${GRID[3]} Z`;
  const areaFull = ramp(frame, 70, 34, EASE.out);

  // hold 段极缓推近（以曲线顶点附近为目标）
  const push = 1 + 0.015 * ramp(frame, 100, 60, EASE.swift);
  // 数值牌
  const badge = springAt(frame, 98, { damping: 15, stiffness: 190 });
  const badgeIn = ramp(frame, 98, 8, EASE.out);
  const pulse = ramp(frame, T0 + TRAVEL + 2, 24, EASE.out); // 光点到顶的一圈脉冲

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.78, y: 0.28 }} fill={{ x: 0.12, y: 0.95 }} breathe={0.6} />
      {/* 隐藏量宽行（与终态同字体字距） */}
      <div ref={measRef} style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', display: 'flex', ...type(FS, 800, { caps: true }), letterSpacing: TRACK }}>
        {TEXT.split('').map((ch, i) => <span key={i}>{ch === ' ' ? ' ' : ch}</span>)}
      </div>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})`, transformOrigin: '70% 40%' }}>
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="top-area" x1="0" y1={400} x2="0" y2={930} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={L.accent} stopOpacity={0.34} />
              <stop offset="0.6" stopColor={L.accent} stopOpacity={0.08} />
              <stop offset="1" stopColor={L.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="top-line" x1={P0.x} y1="0" x2={P3.x} y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={alpha(L.accent, 0.35)} />
              <stop offset="0.55" stopColor={L.accent} />
              <stop offset="1" stopColor="#9fc0ff" />
            </linearGradient>
            <clipPath id="top-reveal"><rect x={0} y={0} width={tip.x} height={1080} /></clipPath>
            <filter id="top-glow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="10" /></filter>
          </defs>
          {/* 发丝网格 + 刻度（纹理级） */}
          {GRID.map((y, k) => {
            const g = ramp(frame, k * 3, 18, EASE.out);
            return (
              <g key={y} opacity={0.4 + 0.6 * g}>
                <line x1={150} x2={150 + 1560 * g} y1={y} y2={y} stroke={k === 3 ? alpha(L.ink, 0.22) : L.line} strokeWidth={1.5} strokeDasharray={k === 3 ? undefined : '2 10'} />
                <text x={1740} y={y + 8} fontFamily={FONT.mono} fontSize={22} fill={L.ink3} opacity={g}>{TICKS[k]}</text>
              </g>
            );
          })}
          {MONTHS.map((m, k) => (
            <text key={m} x={150 + k * 300} y={980} fontFamily={FONT.mono} fontSize={22} letterSpacing="0.12em" fill={L.ink3} opacity={ramp(frame, 6 + k * 2, 16, EASE.out)}>{m}</text>
          ))}
          {/* 线下面积：随曲线生长揭开，到顶后加满 */}
          <path d={areaD} fill="url(#top-area)" clipPath="url(#top-reveal)" opacity={0.55 + 0.45 * areaFull} />
          {/* 外发光 + 主线 */}
          <path d={pathD} fill="none" stroke={L.accent} strokeWidth={14} strokeLinecap="round" opacity={0.55} filter="url(#top-glow)"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - evolveFrac} />
          <path d={pathD} fill="none" stroke="url(#top-line)" strokeWidth={5} strokeLinecap="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - evolveFrac} />
          {/* 季度标记：曲线画过之后逐个点亮（纹理级标签） */}
          {QUARTERS.map(([tq, lab], k) => {
            const q = bez(tq);
            const on = ramp(frame, 100 + k * 4, 12, EASE.overshoot);
            if (evolveFrac < tq || on <= 0) return null;
            return (
              <g key={lab} opacity={Math.min(1, on)}>
                <line x1={q.x} x2={q.x} y1={q.y + 14} y2={GRID[3]} stroke={alpha(L.accent, 0.25)} strokeWidth={1.5} strokeDasharray="2 6" />
                <circle cx={q.x} cy={q.y} r={7 * on} fill={L.bg[1]} stroke={L.accent} strokeWidth={3} />
                <text x={q.x + 16} y={q.y + 34} fontFamily={FONT.mono} fontSize={22} fill={L.ink2}>{lab}</text>
              </g>
            );
          })}
          {/* 车头光点 + 到顶脉冲 */}
          {evolveFrac > 0.002 && (
            <g>
              {pulse > 0 && pulse < 1 && <circle cx={tip.x} cy={tip.y} r={12 + 60 * pulse} fill="none" stroke={L.accent2} strokeWidth={2} opacity={1 - pulse} />}
              <circle cx={tip.x} cy={tip.y} r={22} fill={L.accent2} opacity={0.18} />
              <circle cx={tip.x} cy={tip.y} r={9} fill={L.ink} stroke={L.accent2} strokeWidth={4} />
            </g>
          )}
        </svg>

        {/* 数值牌：钉在线顶左下方 */}
        <div style={{
          position: 'absolute', left: P3.x - 56, top: P3.y - 168, transform: `translateX(-100%) translateY(${((1 - badge) * 30).toFixed(2)}px) scale(${(0.9 + 0.1 * badge).toFixed(4)})`,
          transformOrigin: '100% 100%', opacity: badgeIn, textAlign: 'right',
        }}>
          <div style={{ ...type(84, 760), color: L.ink, textShadow: glow(L.accent, 0.35) }}>$48.6M</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 18, marginTop: 10, alignItems: 'baseline' }}>
            <span style={{ ...type(32, 500), color: L.ink2 }}>ARR</span>
            <span style={{ ...type(32, 700), color: L.accent2 }}>▲ 312%</span>
          </div>
        </div>

        {/* 眉题 + 副句 */}
        <div style={{ position: 'absolute', left: FINAL.x + 4, top: FINAL.y - 112, ...type(26, 700, { caps: true, mono: true }), letterSpacing: '0.18em', color: L.accent }}>
          <TextReveal text="FY2026 · Annual report" start={96} by="word" variant="rise" each={14} gap={3} />
        </div>
        <div style={{ position: 'absolute', left: FINAL.x + 4, top: FINAL.y + 70, ...type(40, 450), color: L.ink2 }}>
          <TextReveal text="Every quarter beat the last one." start={92} by="word" variant="blur" each={16} gap={2.5} />
        </div>

        {/* 字符：沿线推进 → 抬升摆正 */}
        {TEXT.split('').map((ch, i) => {
          if (ch === ' ') return null;
          const s = headS - (lastC - centers[i]);
          const onPath = bez(tAtS(s));
          const pre = Math.min(0, s); // 还没上线的字沿起点切线退在线外
          const ang0 = tangent(0) * (Math.PI / 180);
          const px = onPath.x + Math.cos(ang0) * pre;
          const py = onPath.y + Math.sin(ang0) * pre;
          const angOnCurve = tangent(tAtS(s));
          const st = T0 + TRAVEL + HOLD + i * SETTLE_STAG;
          const sx = ramp(frame, st, SETTLE, EASE.swift); // 横移（in-out）
          const sy = ramp(frame, st, SETTLE, LIFT_EASE); // 抬升先到（带 ~4% 轻微过冲）
          const sr = ramp(frame, st + 2, SETTLE, EASE.out); // 旋转晚 2f 收敛
          const x = mix(px, FINAL.x + centers[i], sx);
          const y = mix(py, FINAL.y, sy);
          const ang = angOnCurve * (1 - sr);
          const lift = -0.4 * FS * (1 - Math.min(1, sy)); // 字底贴线 → 字心
          const op = ramp(s, -FS * 0.9, FS * 0.9, EASE.linear);
          // 行进中按速度横向拖影（文字自身的 blur 只在快速段）
          const moving = frame < st ? Math.min(6, headV * 0.12) : 0;
          return (
            <div key={i} style={{
              position: 'absolute', left: x, top: y, opacity: op,
              transform: `translate(-50%, -50%) rotate(${ang.toFixed(3)}deg) translateY(${lift.toFixed(2)}px)`,
              ...type(FS, 800, { caps: true }), letterSpacing: TRACK, lineHeight: 1, color: L.ink, whiteSpace: 'pre',
              textShadow: `${(-moving * 1.4).toFixed(1)}px 0 ${(moving * 2).toFixed(1)}px ${alpha(L.accent, 0.5)}, 0 0 24px ${alpha(L.accent, 0.25)}`,
            }}>
              {ch}
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
