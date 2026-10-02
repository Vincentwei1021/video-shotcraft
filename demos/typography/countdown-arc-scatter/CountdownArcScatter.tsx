// countdown-arc-scatter — Countdown Arc 表盘数字扫过（motion-lab 定稿转原生 Remotion）
// 白底表盘：等大深色数字沿同一大弧切向排布，整盘扫过 ~96° 减速急停（数字随位置角在
// 弧两端淡入/淡出），短刻度线同步回正；"5" 停上弧顶后落位成标题首字符，
// "min / to / install" 逐词模糊淡入，结尾整词转强调色（末双字母收尾的染色手法保留）。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 质感层（改版）：pivot 下移到 70% 让整条弧完整入画，"5" 落位时整组同曲线上抬 24px、
// 右移 32px，让标题落在画面正中；盘面加一圈随盘转的细刻度（每 6° 一根、数字位加长）；扫动快速段
// 每个数字按切向速度做方向性运动模糊；近白径向底 + 极弱颗粒；强调色统一为批次靛蓝。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { FONT, Grain, SpeedBlur } from '../../_fixtures/Polish';

export const COUNTDOWN_ARC_SCATTER_DURATION = 33; // 1100ms @30fps

const INK = '#17181c';
const ACCENT_RGB = [91, 99, 211]; // #5b63d3（批次统一强调色）
const R0 = 150; // 弧半径
const SP = 24; // 相邻数字角距
// i=6 是 "5"，落位时角度归零停在弧顶
const NUMS = [45, 35, 28, 22, 17, 10, 5, 4, 3];
// "5" 落位的目标点（相对 pivot）
const TARGET = { x: -148, y: -30 };
const PIVOT_TOP = 189; // 70%：弧顶数字上沿离画框 ≥15px
const LIFT = 24; // 落位同时整组上抬：标题中心 189−30−24 = 135（画面正中）
const SHIFT_X = 32; // 同时右移：标题（−160..+96）的视觉中心回到画面中线
const DT = 1 / (COUNTDOWN_ARC_SCATTER_DURATION - 1); // 一帧对应的 t 步长

// 数字/标题共用的字形
const NUM_FONT: React.CSSProperties = {
  color: INK,
  fontFamily: FONT.sans,
  fontWeight: 600,
  fontSize: 40,
  letterSpacing: '-0.02em',
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
};

// 逐词模糊淡入的时间窗：min → to → install
const WORDS: { text: string; mr: number; win: [number, number] }[] = [
  { text: 'min', mr: 11, win: [0.54, 0.68] },
  { text: 'to', mr: 11, win: [0.62, 0.78] },
  { text: 'install', mr: 0, win: [0.7, 0.9] },
];

const mix = (k: number, a: number, b: number) => Math.round(lerp(k, a, b));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// 整盘扫过：+96° → 0°，outCubic 减速急停
const rotAt = (t: number) => lerp(seg(t, 0, 0.52, E.outCubic), 96, 0);

// 第 i 个数字在 t 时刻的位置（相对 pivot）/ 自转 / 透明度
const numState = (i: number, t: number) => {
  const pa = (i - 6) * SP + rotAt(t); // 当前位置角
  const rad = (pa * Math.PI) / 180;
  let x = Math.sin(rad) * R0;
  let y = -Math.cos(rad) * R0;
  let rSelf = pa; // 切向排布：随位置角自转
  let op = clamp01((70 - Math.abs(pa)) / 22); // 弧两端淡入淡出
  if (NUMS[i] === 5) {
    const hand = seg(t, 0.52, 0.7, E.inOutCubic); // "5" 落位平移
    x = lerp(hand, x, TARGET.x);
    y = lerp(hand, y, TARGET.y);
    rSelf *= 1 - hand;
  } else {
    op *= 1 - seg(t, 0.5, 0.7, E.inQuad);
  }
  return { x, y, rSelf, op };
};

// 盘面细刻度：每 6° 一根，数字位（每 24°）加长加深；随盘转（rot），可视角窗与数字一致
const TICKS = Array.from({ length: 41 }, (_, k) => (k - 20) * 6 - 24); // 覆盖 −144°..+96° 的盘面角

export const CountdownArcScatter: React.FC = () => {
  const t = useT();
  const rot = rotAt(t);
  const hand = seg(t, 0.52, 0.7, E.inOutCubic);
  const out = seg(t, 0.5, 0.7, E.inQuad); // 其余数字原地淡出
  // 结尾整词（末双字母收尾）转强调色 #17181c → ACCENT
  const bl = seg(t, 0.84, 0.98);
  const lift = -LIFT * hand;
  const shiftX = SHIFT_X * hand;
  return (
    <>
      {/* 近白径向底：中心纯白，四角落到 #f1f1ef，保持白底的干净 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 85% at 50% 42%, #ffffff 0%, #fbfbfa 45%, #f1f1ef 100%)',
        }}
      />
      <DesignStage bg="transparent">
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* pivot：所有元素都以它为原点定位；落位时整组上抬 */}
          <div style={{ position: 'absolute', left: 240 + shiftX, top: PIVOT_TOP + lift, width: 0, height: 0 }}>
            {/* 盘面细刻度（随盘转，和数字同速） */}
            {TICKS.map((a, k) => {
              const pa = a + rot;
              const major = ((a % 24) + 24) % 24 === 0;
              const op = clamp01((70 - Math.abs(pa)) / 22) * (1 - out);
              if (op <= 0) return null;
              const len = major ? 9 : 5;
              return (
                <div
                  key={k}
                  style={{
                    position: 'absolute',
                    left: -0.5,
                    top: -118,
                    width: 1,
                    height: len,
                    borderRadius: 1,
                    background: INK,
                    opacity: op * (major ? 0.42 : 0.2),
                    transformOrigin: '0.5px 118px',
                    transform: `rotate(${pa}deg)`,
                  }}
                />
              );
            })}

            {NUMS.map((n, i) => {
              const s = numState(i, t);
              if (s.op <= 0.001) return null;
              const a = numState(i, t - DT / 2);
              const b = numState(i, t + DT / 2);
              const is5 = n === 5;
              return (
                // 每个数字一个 160×100 的局部盒，切向速度驱动方向性模糊（只在快速段生效）
                <div
                  key={i}
                  style={{ position: 'absolute', left: s.x - 80, top: s.y - 50, width: 160, height: 100 }}
                >
                  <SpeedBlur vx={b.x - a.x} vy={b.y - a.y} amount={0.08} max={3}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 80,
                        top: 50,
                        ...NUM_FONT,
                        opacity: s.op,
                        transform: `translate(-50%,-50%) rotate(${s.rSelf}deg)`,
                        // "5" 不模糊；其余数字随淡出同步糊化
                        filter: is5 || out <= 0 ? undefined : `blur(${out * 3}px)`,
                      }}
                    >
                      {n}
                    </div>
                  </SpeedBlur>
                </div>
              );
            })}
            {/* 短刻度指针（深色细线，0.35 倍差速回正——"盘 vs 指针"） */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                transform: `rotate(${rot * 0.35}deg)`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -1.5,
                  top: -101,
                  width: 3,
                  height: 26,
                  borderRadius: 2,
                  background: `linear-gradient(180deg, ${INK} 0%, rgba(23,24,28,0.55) 100%)`,
                  opacity: 1 - out,
                }}
              />
            </div>
            {/* 标题（相对 pivot 定位，中性占位文案），"5" 落到其左端 */}
            <div
              style={{
                position: 'absolute',
                left: -124,
                top: -30,
                transform: 'translateY(-50%)',
                ...NUM_FONT,
              }}
            >
              {WORDS.map(({ text, mr, win }, k) => {
                const p = seg(t, win[0], win[1], E.outCubic);
                const isLast = k === WORDS.length - 1;
                return (
                  <span
                    key={k}
                    style={{
                      display: 'inline-block',
                      marginRight: mr || undefined,
                      opacity: p,
                      filter: p >= 0.999 ? undefined : `blur(${(1 - p) * 6}px)`,
                      color: isLast
                        ? `rgb(${mix(bl, 23, ACCENT_RGB[0])},${mix(bl, 24, ACCENT_RGB[1])},${mix(bl, 28, ACCENT_RGB[2])})`
                        : undefined,
                    }}
                  >
                    {text}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </DesignStage>
      <Grain opacity={0.035} />
    </>
  );
};
