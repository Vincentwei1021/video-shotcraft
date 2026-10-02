// 里程表数字滚动大字报（odometer-digit-roll）——声画钩子 / Vercel Ship 指标段。
// 全屏巨号 "99.98%"（190px fw800 tabular-nums），四个数位各是一条 0–9 纵向
// strip（overflow:hidden 数位盒），高速滚动后逐位停稳：位 i 在 20+i*7f 开始
// 减速（Easing.out(cubic)），过冲半格再 6f 弹回锁定。滚动期每位叠 2 个错帧
// 残影副本（拖在运动方向后方 0.28/0.56 行，opacity 0.25/0.12），按帧速度门控，停稳即摘。
// 小数点与 % 不滚动，一直驻场。
// 关键帧：0–8 四位从静止加速到全速（0.85 行/帧）→ 20/27/34/41 逐位开始减速（各 16f
// 减速 + 6f 回弹，锁定于 42/49/56/63）→ 63–71 整体加深脉冲（ink→近黑→ink，
// 附 1.035 微缩放加码）→ 66–88 下方标签两行错峰淡入 → 88–150 全静止（62f ≥45f）。
//
// 质感升级：去掉调试标题，换成小号大写眉标；平灰底换柔光亮场 + 颗粒；数位盒上下沿加渐隐遮罩
// （读作里程表的视窗，邻位数字不再被硬切成半截）；滚动期按速度给纵向运动模糊，残影改为拖在后方；
// 每位滚动中是次级灰、锁定瞬间转主墨色（"哒"可见），% 在合计确认时转强调色；灰色骨架标签条换成
// 真实标签与副标；系统字体栈替代 Helvetica 回退。
import React from 'react';
import { useCurrentFrame, interpolate, interpolateColors, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, Grain, SpeedBlur, mix, ramp, tracking } from '../../_fixtures/Polish';

export const ODOMETER_DIGIT_ROLL_DURATION = 150; // 滚动+锁定 63f + 脉冲 8f + hold，5s @30fps

const ROW = 230; // 数位行高（overflow 盒高，比字号高出一截给上下渐隐留位）
const DW = 124; // 数位盒宽
const FS = 190; // 字号
const SPIN = 0.85; // 高速滚动速度：行/帧
const SPINUP = 8; // 起步加速帧数：0→全速
const DIGITS = [9, 9, 9, 8]; // 目标数位（"99.98" 中可滚的四位）
const LOCK = 63; // 末位锁定帧 = 合计确认

const INK = G.ink1; // 锁定后的主墨色
const INK_ROLL = '#4a4c55'; // 滚动中的次级墨色
const INK_DEEP = '#08090b'; // 合计脉冲峰值

// 匀加速起步：f<SPINUP 时 p=SPIN·f²/(2·SPINUP)，之后匀速；在 SPINUP 处位置、速度都连续
const spinPos = (f: number) => {
  const x = Math.max(f, 0);
  return x < SPINUP ? (SPIN * x * x) / (2 * SPINUP) : SPIN * (x - SPINUP / 2);
};

// 位 i 的 strip 位置（单位：行，连续值）。纯帧函数，天然确定性。
const posAt = (f: number, i: number): number => {
  const d = DIGITS[i];
  const s = 20 + i * 7; // 开始减速帧
  const p0 = spinPos(s);
  // 最小再走 6 行后，落在个位 = d 的最近整数位置
  const T = Math.ceil((p0 + 6 - d) / 10) * 10 + d;
  if (f < s) return spinPos(f);
  if (f < s + 16)
    return interpolate(f, [s, s + 16], [p0, T + 0.5], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
  if (f < s + 22)
    return interpolate(f, [s + 16, s + 22], [T + 0.5, T], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
  return T;
};

const glyph: React.CSSProperties = {
  height: ROW,
  lineHeight: `${ROW}px`,
  textAlign: 'center',
  fontSize: FS,
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.02em',
};

// 一条 0–9 纵列 strip（两轮 20 格，容过冲跨界）
const Strip: React.FC<{ pos: number; color: string; opacity?: number; dy?: number }> = ({
  pos,
  color,
  opacity = 1,
  dy = 0,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: DW,
      transform: `translateY(${(-(pos % 10) * ROW + dy).toFixed(2)}px)`,
      opacity,
    }}
  >
    {Array.from({ length: 20 }).map((_, k) => (
      <div key={k} style={{ ...glyph, width: DW, color }}>
        {k % 10}
      </div>
    ))}
  </div>
);

// 里程表视窗遮罩：上下各 ~17% 渐隐，邻位数字滑进滑出而不是被硬切
const WINDOW_MASK = 'linear-gradient(180deg, transparent 0%, #000 17%, #000 83%, transparent 100%)';

// 单个数位盒：本体 strip + 滚动期 2 个拖尾残影（速度门控，停稳即摘）+ 纵向运动模糊
const DigitReel: React.FC<{ frame: number; i: number; pulseInk: string }> = ({ frame, i, pulseInk }) => {
  const pos = posAt(frame, i);
  const speed = Math.abs(pos - posAt(frame - 1, i)); // 行/帧
  const gate = interpolate(speed, [0.06, 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lockF = 20 + i * 7 + 22;
  // 滚动中次级灰 → 锁定瞬间 4f 转主墨色；全体锁定后跟随合计脉冲
  const lockK = interpolate(frame, [lockF - 4, lockF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const color = frame >= LOCK ? pulseInk : interpolateColors(lockK, [0, 1], [INK_ROLL, INK]);
  return (
    <div
      style={{
        position: 'relative',
        width: DW,
        height: ROW,
        overflow: 'hidden',
        WebkitMaskImage: WINDOW_MASK,
        maskImage: WINDOW_MASK,
      }}
    >
      {/* strip 向上走（translateY 越来越负），残影拖在下方 = 运动方向后方 */}
      <SpeedBlur vx={0} vy={speed * ROW} amount={0.05} max={9}>
        {gate > 0.001 && (
          <>
            <Strip pos={pos} color={color} opacity={0.25 * gate} dy={ROW * 0.28} />
            <Strip pos={pos} color={color} opacity={0.12 * gate} dy={ROW * 0.56} />
          </>
        )}
        <Strip pos={pos} color={color} />
      </SpeedBlur>
    </div>
  );
};

// 不滚动的静态字符（小数点 / %），一直驻场
const StaticGlyph: React.FC<{ ch: string; color: string; w?: number }> = ({ ch, color, w }) => (
  <div style={{ ...glyph, width: w, color }}>{ch}</div>
);

export const OdometerDigitRoll: React.FC = () => {
  const frame = useCurrentFrame();
  // 全位锁定于 63f：整体加深脉冲 ink→近黑→ink（8f），附微缩放加码可感性
  const pulseInk = interpolateColors(frame, [LOCK, LOCK + 4, LOCK + 8], [INK, INK_DEEP, INK]);
  const pulseScale = interpolate(frame, [LOCK, LOCK + 4, LOCK + 8], [1, 1.035, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
  // % 在合计确认时转强调色（一次，落定后保持）
  const pctInk = interpolateColors(frame, [LOCK, LOCK + 8], [INK, G.accent]);
  // 开场：整排数字 0–10f 淡入并从 0.97 收到 1
  const enter = ramp(frame, 0, 12, EASE.out);
  // 眉标与标签两行错峰
  const eyebrow = ramp(frame, 2, 16, EASE.out);
  const l1 = ramp(frame, 66, 18, EASE.snappy);
  const l2 = ramp(frame, 71, 18, EASE.snappy);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.3 }} accent={G.accent} vignette={0.16} grain={0} />
      {/* 眉标：替代调试标题，小号大写 + 强调色短线 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: 1920,
          top: 300,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 18,
          opacity: eyebrow,
          transform: `translateY(${mix(8, 0, eyebrow).toFixed(2)}px)`,
        }}
      >
        <div style={{ width: 28, height: 3, borderRadius: 2, background: G.accent }} />
        <div
          style={{
            fontSize: 32,
            fontWeight: 650,
            letterSpacing: tracking(32, true),
            textTransform: 'uppercase',
            color: G.ink2,
          }}
        >
          Q3 Reliability Report
        </div>
      </div>
      {/* 数字主体 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 372,
          width: 1920,
          display: 'flex',
          justifyContent: 'center',
          opacity: enter,
          transform: `scale(${(pulseScale * mix(0.97, 1, enter)).toFixed(4)})`,
          transformOrigin: `960px ${ROW / 2}px`,
          filter: 'drop-shadow(0 22px 34px rgba(16,18,26,0.10))',
        }}
      >
        <DigitReel frame={frame} i={0} pulseInk={pulseInk} />
        <DigitReel frame={frame} i={1} pulseInk={pulseInk} />
        <StaticGlyph ch="." color={frame >= LOCK ? pulseInk : INK} w={62} />
        <DigitReel frame={frame} i={2} pulseInk={pulseInk} />
        <DigitReel frame={frame} i={3} pulseInk={pulseInk} />
        <StaticGlyph ch="%" color={pctInk} />
      </div>
      {/* 下方标签：全部锁定后两行错峰上浮淡入 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 646,
          width: 1920,
          textAlign: 'center',
          fontSize: 48,
          fontWeight: 600,
          letterSpacing: tracking(48),
          color: G.ink1,
          opacity: l1,
          transform: `translateY(${mix(14, 0, l1).toFixed(2)}px)`,
        }}
      >
        API uptime across 14 regions
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 718,
          width: 1920,
          textAlign: 'center',
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: tracking(34),
          color: G.ink3,
          fontVariantNumeric: 'tabular-nums',
          opacity: l2,
          transform: `translateY(${mix(14, 0, l2).toFixed(2)}px)`,
        }}
      >
        Trailing 90 days · 26 min total downtime
      </div>
      <Grain opacity={0.05} />
    </div>
  );
};
