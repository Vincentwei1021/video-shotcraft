// stroke-segment-build —— 断笔成字（《异形》式）
// "SHIP" 拆成 16 段互不相连的粗线段，按乱序表逐段点亮。
// 前 70%（11 段）读不出字，最后 3 段落位瞬间突然可读；
// 末段落位帧整字轻微 scale 脉冲（1→1.06→1）。
// 每段入场：opacity 0→1 + 沿笔画方向 12px 滑入（out 缓动），6f。
// f0–14 静置空场；末段落位于 f110，脉冲至 f118，真静止 ≥32f（150f 总长）。
// 质感：深场换成带冷色相的柔光暗底（替代 #2f2f2f 平灰）；悬念期每段落位时短促"点燃"
// （亮到纯白 + 小辉光，4f 内回落到 0.8 的暖灰白），整词处在"半亮碎片"状态；末段落位帧
// 全部笔画一起升到满亮 + 柔和泛光——意义成立的那一刻用光来"啪"一下；
// 调试占位标题去掉，改为落位后浮出的一行副题（只在揭晓后出现，不提前泄底）。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Backdrop, EASE, FONT, Grain, ramp } from '../../_fixtures/Polish';

export const STROKE_SEGMENT_BUILD_DURATION = 150;

// "SHIP" 手工笔画段。坐标系：每字 200 宽、320 高，字间距 60。
// 段 = {x1,y1,x2,y2}，线宽 44，方形端帽（不连续感更强）。
type Seg = { x1: number; y1: number; x2: number; y2: number };

const K = 200; // 字宽
const H = 320; // 字高
const ADV = K + 60;

// S：4 段（上横、左上竖、中横、右下竖+下横 → 拆成 5 也行，取 4）
// H：3 段（左竖、右竖、中横）
// I：3 段（上横、中竖、下横）
// P：4 段（左竖、上横、右短竖、中横）—— 共 14 段；S 再拆 2 段成 16
const SEGS: Seg[] = [
  // S (x offset 0) —— 6 段
  { x1: 30, y1: 22, x2: 185, y2: 22 },     // 0 上横
  { x1: 22, y1: 44, x2: 22, y2: 130 },     // 1 左上竖
  { x1: 30, y1: 152, x2: 175, y2: 152 },   // 2 中横
  { x1: 178, y1: 174, x2: 178, y2: 276 },  // 3 右下竖
  { x1: 15, y1: 298, x2: 170, y2: 298 },   // 4 下横
  { x1: 22, y1: 240, x2: 22, y2: 276 },    // 5 左下小竖（S 尾钩）
  // H (x offset ADV) —— 3 段
  { x1: ADV + 22, y1: 22, x2: ADV + 22, y2: 298 },   // 6 左竖
  { x1: ADV + 178, y1: 22, x2: ADV + 178, y2: 298 }, // 7 右竖
  { x1: ADV + 44, y1: 160, x2: ADV + 156, y2: 160 }, // 8 中横
  // I (x offset ADV*2) —— 3 段
  { x1: ADV * 2 + 40, y1: 22, x2: ADV * 2 + 160, y2: 22 },   // 9 上横
  { x1: ADV * 2 + 100, y1: 44, x2: ADV * 2 + 100, y2: 276 }, // 10 中竖
  { x1: ADV * 2 + 40, y1: 298, x2: ADV * 2 + 160, y2: 298 }, // 11 下横
  // P (x offset ADV*3) —— 4 段
  { x1: ADV * 3 + 22, y1: 22, x2: ADV * 3 + 22, y2: 298 },   // 12 左竖
  { x1: ADV * 3 + 44, y1: 22, x2: ADV * 3 + 165, y2: 22 },   // 13 上横
  { x1: ADV * 3 + 178, y1: 44, x2: ADV * 3 + 178, y2: 140 }, // 14 右短竖
  { x1: ADV * 3 + 44, y1: 162, x2: ADV * 3 + 165, y2: 162 }, // 15 中横
];

// 乱序点亮表：刻意打散——前 13 段跨字乱跳（读不出），
// 最后 3 段（8 中横 / 10 I 竖 / 12 P 左竖）落位瞬间补全可读性。
const ORDER = [3, 9, 6, 15, 1, 11, 14, 4, 0, 7, 13, 2, 5, 8, 10, 12];

const FIRST = 14; // 首段起始帧
const STEP = 6; // 段间隔
const SEG_IN = 6; // 单段入场时长
const LAST_LAND = FIRST + 15 * STEP + SEG_IN; // = 110，末段落位
const PULSE_END = LAST_LAND + 8;

const WORD_W = ADV * 3 + K; // 980
const OX = (1920 - WORD_W) / 2;
const OY = (1080 - H) / 2 + 20;

const LIT = [242, 239, 232]; // 揭晓后的暖白
const rgb = (k: number) => `rgb(${LIT.map((v) => Math.round(v * k)).join(',')})`;

export const StrokeSegmentBuild: React.FC = () => {
  const frame = useCurrentFrame();

  // 末段落位：整字脉冲 1 → 1.06 → 1（8f）
  const pulse = interpolate(
    frame,
    [LAST_LAND, LAST_LAND + 3, PULSE_END],
    [1, 1.06, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  // 揭晓：全部笔画从 0.8 亮度一起升到满亮，泛光同步升起再收成常驻微光
  const reveal = ramp(frame, LAST_LAND - 1, 6, EASE.snappy);
  const bloom = interpolate(frame, [LAST_LAND - 1, LAST_LAND + 3, LAST_LAND + 24], [0, 1, 0.35], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const kicker = ramp(frame, LAST_LAND + 6, 16, EASE.out);

  const segs = SEGS.map((seg, i) => {
    const rank = ORDER.indexOf(i);
    const start = FIRST + rank * STEP;
    if (frame < start) return null; // 未开始的段不渲染
    const t = ramp(frame, start, SEG_IN, EASE.snappy);
    // 沿笔画方向滑入 12px
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const len = Math.hypot(dx, dy) || 1;
    const slide = 12 * (1 - t);
    const ox = (-dx / len) * slide;
    const oy = (-dy / len) * slide;
    // 点燃：落位瞬间亮到 1.0，4f 内回落到 0.8（悬念期的碎片是"半亮"的）；揭晓后统一满亮
    const ignite = interpolate(frame, [start, start + 2, start + SEG_IN + 4], [0.6, 1, 0.8], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const k = ignite + (1 - ignite) * reveal;
    const flash = interpolate(frame, [start, start + 2, start + SEG_IN + 4], [0, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { i, x1: OX + seg.x1 + ox, y1: OY + seg.y1 + oy, x2: OX + seg.x2 + ox, y2: OY + seg.y2 + oy, t, k, flash };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <AbsoluteFill style={{ background: '#0d0e12', overflow: 'hidden' }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.42 }} grain={0} vignette={0.6} />
      {/* 揭晓泛光：字后一团极淡的暖光，随 bloom 升起 */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 40% 34% at 50% 52%, rgba(255,236,210,0.16) 0%, rgba(255,236,210,0) 70%)',
          opacity: bloom,
        }}
      />
      <svg
        width={1920}
        height={1080}
        style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${pulse})`, transformOrigin: '50% 55%' }}
      >
        <defs>
          <filter id="ssb-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        {/* 辉光层：单段点燃时一下 + 揭晓时整词一下（同一形状模糊垫底） */}
        <g filter="url(#ssb-glow)">
          {segs.map((g) => {
            const a = Math.max(g.flash * 0.55, bloom * 0.5) * g.t;
            if (a < 0.01) return null;
            return (
              <line key={g.i} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="#fff3e2" strokeWidth={44} strokeLinecap="butt" opacity={a} />
            );
          })}
        </g>
        {segs.map((g) => (
          <line
            key={g.i}
            x1={g.x1}
            y1={g.y1}
            x2={g.x2}
            y2={g.y2}
            stroke={g.flash > 0.5 ? '#ffffff' : rgb(g.k)}
            strokeWidth={44}
            strokeLinecap="butt"
            opacity={g.t}
          />
        ))}
      </svg>
      {/* 揭晓后的副题：只在落位之后出现 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: OY + H + 70,
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: '0.2em',
          color: 'rgba(225,228,236,0.72)',
          opacity: kicker,
          transform: `translateY(${(1 - kicker) * 12}px)`,
        }}
      >
        VERSION 4.0 · AVAILABLE TODAY
      </div>
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
