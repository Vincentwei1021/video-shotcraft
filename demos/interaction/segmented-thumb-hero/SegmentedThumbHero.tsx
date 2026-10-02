// segmented-thumb-hero —— 分段控件 thumb 位移当叙事主角拍特写
// 源：perplexity-promo 2.3–5s。胶囊分段控件（Ask/Computer）带阴影浮入，
// 超大描边箭头光标从画外滑入点击，白 thumb 左→右 ~8f ease-out 滑动，
// 到位瞬间新选项前弹出小图标、旧图标收起。
// 质感升级：柔光纸面底 + 暗角颗粒；轨道做成下凹槽（内阴影 + 发丝线），thumb 是受光的凸起件
// （顶沿高光 + 近实远虚两层影）；thumb 8f 内前缘先走、后缘跟随的橡皮筋拉伸 + 速度拖影，
// 到位后 1.5% 过冲回弹；段标签颜色随 thumb 位置连续过渡；新图标带强调色笑脸；
// 光标起点挪到真正画外，两层投影；涟漪换强调色细环。时间轴不变。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, FONT, SpeedBlur, mix, velocity } from '../../_fixtures/Polish';

export const SEGMENTED_THUMB_HERO_DURATION = 110; // 浮入 18f + 光标 24f + 点击 + 滑动 8f + 弹出 + hold 50f

const INK = G.ink1;
const DIM = '#8e9097';

// 超大描边箭头光标（白芯墨描边，两层投影：近地实、远地虚）
const ArrowCursor: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <svg
    width={130}
    height={150}
    viewBox="0 0 26 30"
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `scale(${1 - press * 0.14})`,
      transformOrigin: '15% 10%',
      filter: `drop-shadow(0 ${2 - press}px ${3 - press}px rgba(16,18,24,0.22)) drop-shadow(0 ${12 - press * 6}px ${18 - press * 6}px rgba(16,18,24,0.20))`,
    }}
  >
    <path
      d="M4 2 L4 24 L9.5 18.5 L13 27 L16.8 25.4 L13.3 17 L21 17 Z"
      fill="#fff"
      stroke={INK}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  </svg>
);

// 新身份图标：带表情的笔记本（表情用唯一强调色，是"奖励感"的一半）
const SmileLaptop: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <rect x={7} y={7.5} width={26} height={18.5} rx={3.5} fill="none" stroke={INK} strokeWidth={2.8} />
    <circle cx={15.5} cy={14.5} r={1.9} fill={G.accent} />
    <circle cx={24.5} cy={14.5} r={1.9} fill={G.accent} />
    <path d="M14.8 19 Q20 23.2 25.2 19" stroke={G.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    <path d="M4.5 31 L35.5 31" stroke={INK} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

const AskIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <circle cx={20} cy={20} r={13} fill="none" stroke={INK} strokeWidth={2.8} />
    <path d="M16 17 q0-5 4.5-5 q4.5 0 4.5 4.2 q0 3-3.4 4.4 q-1.6 0.7-1.6 2.6" stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    <circle cx={20} cy={28} r={1.8} fill={INK} />
  </svg>
);

// 颜色插值（#rrggbb）
const lerpHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};

export const SegmentedThumbHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ---- 时间轴 ----
  const FLOAT_IN = 0; // 控件浮入 0–18
  const CURSOR_IN = 20; // 光标滑入 20–44
  const CLICK = 48; // 按下
  const SLIDE = 52; // thumb 开始滑 52–60 (~8f)
  const SLIDE_END = 60;

  // 控件浮入：从下 200px 带阴影弹簧浮入
  const floatT = spring({ frame: frame - FLOAT_IN, fps, config: { damping: 14, stiffness: 120, mass: 0.9 } });
  const ctrlY = interpolate(floatT, [0, 1], [200, 0]);

  // 控件几何（特写尺寸）
  const CW = 1080; // 控件宽
  const CH = 220;
  const PAD = 16;
  const SEGW = (CW - PAD * 2) / 2;
  const TH = CH - PAD * 2; // thumb 高

  // 光标滑入：ease-out 从右下画外（整只光标在画框外）飘到 Computer 段上
  const curT = interpolate(frame, [CURSOR_IN, CURSOR_IN + 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const curX = interpolate(curT, [0, 1], [2020, 1210]);
  const curY = interpolate(curT, [0, 1], [1200, 590]);
  // 点击点 = 光标尖端（svg 内 (4,2)×5 → +20,+10），换算到控件 padding 盒坐标（控件左上 (420,430)，1px 边）
  const TIP = { x: 1210 + 20 - 420 - 1, y: 590 + 10 - 430 - 1 };
  // 按下动作
  const press = interpolate(frame, [CLICK, CLICK + 3, CLICK + 7], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // thumb 位移：~8f ease-out（主曲线），前缘略快、后缘略慢 → 滑动中被拉长 ~10%，到位收回；
  // 到位后 1.5% 过冲回弹（6f 内收敛），给"落定"一个物理感
  const slide = (f: number, ease: (x: number) => number) =>
    interpolate(f, [SLIDE, SLIDE_END], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const thumbT = slide(frame, Easing.out(Easing.cubic));
  const settle = (f: number) =>
    f < SLIDE_END ? 0 : 0.015 * Math.sin(Math.min(1, (f - SLIDE_END) / 6) * Math.PI) * (1 - Math.min(1, (f - SLIDE_END) / 6));
  const leadAt = (f: number) => slide(f, Easing.out(Easing.poly(4))) + settle(f);
  const trailAt = (f: number) => slide(f, Easing.out(Easing.quad)) + settle(f);
  const thumbL = PAD + trailAt(frame) * SEGW; // 后缘（左）
  const thumbR = PAD + SEGW + leadAt(frame) * SEGW; // 前缘（右）
  const thumbV = velocity((f) => PAD + slide(f, Easing.out(Easing.cubic)) * SEGW, frame);

  // 到位瞬间：Computer 图标弹出（过冲），Ask 图标收起
  const iconIn = spring({ frame: frame - SLIDE_END, fps, config: { damping: 10, stiffness: 220, mass: 0.6 } });
  const laptopScale = frame >= SLIDE_END ? iconIn : 0;
  const askScale = interpolate(frame, [SLIDE, SLIDE + 6], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });

  // 点击涟漪
  const rippleT = interpolate(frame, [CLICK, CLICK + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  const labelStyle = (activeAmt: number): React.CSSProperties => ({
    fontFamily: FONT.sans,
    fontWeight: 650,
    fontSize: 72,
    letterSpacing: '-0.025em',
    color: lerpHex(DIM, INK, activeAmt),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    width: SEGW,
    height: TH,
    position: 'relative',
    zIndex: 2,
  });

  // 标签激活度跟着 thumb 位置连续变（不再在 0.5 处硬跳色）
  const compAmt = Math.min(1, Math.max(0, (thumbT - 0.2) / 0.6));

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.3 }} accent={G.accent} />
      {/* 控件身下的接触光池：浮入落定后把控件"放"在台面上 */}
      <div
        style={{
          position: 'absolute',
          left: 960 - 700,
          top: 540 + 40,
          width: 1400,
          height: 260,
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 70%)',
          opacity: floatT,
        }}
      />
      {/* 分段控件：下凹轨道 */}
      <div
        style={{
          width: CW,
          height: CH,
          borderRadius: CH / 2,
          background: 'linear-gradient(180deg, #e2e2df 0%, #e9e9e6 100%)',
          border: '1px solid rgba(20,22,28,0.09)',
          boxShadow: [
            'inset 0 2px 5px rgba(16,18,24,0.08)',
            'inset 0 -1px 0 rgba(255,255,255,0.7)',
            '0 1px 0 rgba(255,255,255,0.9)',
            `0 ${mix(30, 14, floatT).toFixed(1)}px ${mix(80, 44, floatT).toFixed(1)}px -18px rgba(16,18,24,${mix(0.32, 0.2, floatT).toFixed(3)})`,
          ].join(', '),
          transform: `translateY(${ctrlY}px)`,
          opacity: Math.min(1, floatT * 1.5),
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          padding: PAD,
          boxSizing: 'border-box',
        }}
      >
        {/* 白色 thumb：受光凸起件，滑动中前后缘错开形成拉伸 + 速度拖影 */}
        <SpeedBlur vx={thumbV} amount={0.06} max={6} style={{ zIndex: 1 }}>
          <div
            style={{
              position: 'absolute',
              left: thumbL,
              top: PAD,
              width: thumbR - thumbL,
              height: TH,
              borderRadius: TH / 2,
              background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)',
              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,1), 0 0 0 1px rgba(20,22,28,0.06), 0 2px 4px rgba(16,18,24,0.08), 0 12px 28px -8px rgba(16,18,24,0.20)',
            }}
          />
        </SpeedBlur>
        {/* 点击涟漪（圆心锁点击点，压在 thumb 之上） */}
        {rippleT > 0 && rippleT < 1 && (
          <div
            style={{
              position: 'absolute',
              left: TIP.x - 130 * rippleT,
              top: TIP.y - 130 * rippleT,
              width: 260 * rippleT,
              height: 260 * rippleT,
              borderRadius: '50%',
              boxSizing: 'border-box',
              border: `3px solid ${G.accent}`,
              background: 'radial-gradient(circle, rgba(91,99,211,0) 50%, rgba(91,99,211,0.12) 100%)',
              opacity: (1 - rippleT) * 0.9,
              zIndex: 3,
            }}
          />
        )}
        {/* Ask 段 */}
        <div style={labelStyle(1 - compAmt)}>
          <span
            style={{
              display: 'inline-flex',
              transform: `scale(${askScale})`,
              width: askScale < 0.05 ? 0 : 78,
              overflow: 'visible',
            }}
          >
            <AskIcon size={78} />
          </span>
          Ask
        </div>
        {/* Computer 段 */}
        <div style={labelStyle(compAmt)}>
          <span
            style={{
              display: 'inline-flex',
              transform: `scale(${laptopScale})`,
              width: laptopScale < 0.05 ? 0 : 78,
              overflow: 'visible',
            }}
          >
            <SmileLaptop size={78} />
          </span>
          Computer
        </div>
      </div>
      <ArrowCursor x={curX} y={curY} press={press} />
    </AbsoluteFill>
  );
};
