// flip-grid-reflow —— 网格 FLIP 重排
// 6 张 Card 初始横排一行（marquee 式，屏心）静止 30f，节拍点集体换位：
// 每卡沿直线飞向 3×2 网格目标位（预写两套坐标表），scale 1→1.28，
// delay = 卡索引×1.5f 微错峰，16f inOut(cubic) + 落定 3f 过冲 1.02。
// 全部落定后卡片层加深脉冲收束。收尾真静止 ≥40f。
// 质感：调试标题 "FLIP GRID REFLOW" 换成页面头（Projects + 计数副标题 + Row/Grid 视图切换），
// 切换器的滑块在节拍点同拍滑到 Grid，给重排一个界面上的"因"；卡片飞行中抬升
// （两层软阴影随飞行弧变大变虚）+ 按速度的方向性运动模糊，落地收回；柔光背景替代平灰底。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, SpeedBlur, mix, ramp, softShadow, tracking, velocity } from '../../_fixtures/Polish';

export const FLIP_GRID_REFLOW_DURATION = 145; // 静止 30f + 飞行落定 27f + 脉冲 7f + 真静止 81f

const CARD_W = 280;
const CARD_H = 170;
const N = 6;

// ---- 坐标表 A：横排一行（卡间 24px，屏心）----
// 总宽 6*280 + 5*24 = 1800，x0 = 60；中心 y = 540（与网格同心，上下轨迹对称）
const ROW_Y = 540;
const ROW_CENTERS: Array<[number, number]> = Array.from({ length: N }, (_, i) => [
  60 + CARD_W / 2 + i * (CARD_W + 24),
  ROW_Y,
]); // x: 200, 504, 808, 1112, 1416, 1720

// ---- 坐标表 B：3×2 网格（卡放大 1.28 → 358.4×217.6，网格间距 30px）----
// 网格总宽 3*358.4 + 2*30 = 1135.2 → x0 = 392.4；总高 2*217.6 + 30 = 465.2 → y0 = 307.4
const GC = [571.6, 960, 1348.4]; // 列中心
const GR = [416.2, 663.8]; // 行中心
// 交错映射：偶数索引去上排、奇数去下排（每卡直线飞行、互不对穿）
const GRID_CENTERS: Array<[number, number]> = [
  [GC[0], GR[0]], // card0 → 上左
  [GC[0], GR[1]], // card1 → 下左
  [GC[1], GR[0]], // card2 → 上中
  [GC[1], GR[1]], // card3 → 下中
  [GC[2], GR[0]], // card4 → 上右
  [GC[2], GR[1]], // card5 → 下右
];

const BEAT = 30; // 节拍点
const STAGGER = 1.5; // 每卡延迟
const MOVE = 16; // 飞行帧数
const SETTLE = 3; // 落定过冲帧数
const SCALE_END = 1.28;
const OVERSHOOT = 1.02;

// 加深脉冲：f58 → f61 谷值 → f64 回正（谷值 brightness 0.86，只压卡片层：整屏压暗读作闪屏）
const PULSE_IN = 58;
const PULSE_MID = 61;
const PULSE_OUT = 64;

const moveEase = Easing.inOut(Easing.cubic);
const cl = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 卡片中心位置（frame 的函数，供速度求导）
const posAt = (i: number, frame: number): [number, number] => {
  const t0 = BEAT + i * STAGGER;
  const [x0, y0] = ROW_CENTERS[i];
  const [x1, y1] = GRID_CENTERS[i];
  return [
    interpolate(frame, [t0, t0 + MOVE], [x0, x1], { easing: moveEase, ...cl }),
    interpolate(frame, [t0, t0 + MOVE], [y0, y1], { easing: moveEase, ...cl }),
  ];
};

const FlipCard: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const t0 = BEAT + i * STAGGER;
  const [x, y] = posAt(i, frame);
  const vx = velocity((f) => posAt(i, f)[0], frame);
  const vy = velocity((f) => posAt(i, f)[1], frame);

  // scale：16f 冲到 1.28*1.02，随后 3f 回落到 1.28
  const sUp = interpolate(frame, [t0, t0 + MOVE], [1, SCALE_END * OVERSHOOT], { easing: moveEase, ...cl });
  const sBack = interpolate(frame, [t0 + MOVE, t0 + MOVE + SETTLE], [SCALE_END * OVERSHOOT, SCALE_END], {
    easing: Easing.out(Easing.cubic), ...cl,
  });
  const s = frame < t0 + MOVE ? sUp : sBack;

  // 飞行抬升：沿飞行进度走一条正弦弧，峰值离地 ~30px（阴影变大变虚），落地回到静置 4
  const flight = Math.min(1, Math.max(0, (frame - t0) / MOVE));
  const elev = 4 + 30 * Math.sin(Math.PI * flight);

  return (
    <SpeedBlur vx={vx} vy={vy} amount={0.22} max={12} style={{ zIndex: flight > 0 && flight < 1 ? 10 + i : i }}>
      <div
        style={{
          position: 'absolute',
          left: x - CARD_W / 2,
          top: y - CARD_H / 2,
          width: CARD_W,
          height: CARD_H,
          transform: `scale(${s})`,
          transformOrigin: '50% 50%',
          borderRadius: 14,
          boxShadow: softShadow(elev),
        }}
      >
        <Card w={CARD_W} h={CARD_H} seed={i + 1} />
      </div>
    </SpeedBlur>
  );
};

// Row / Grid 视图切换器：滑块在节拍点同拍滑到 Grid
const ViewToggle: React.FC<{ frame: number }> = ({ frame }) => {
  const k = ramp(frame, BEAT - 2, 9, EASE.snappy); // 比卡片起飞早 2f——先按下，再重排
  const segW = 132;
  const icon = (grid: boolean, on: boolean) => (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={on ? G.ink1 : G.ink3} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={grid ? 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' : 'M4 6h16M4 12h16M4 18h16'} />
    </svg>
  );
  return (
    <div style={{
      position: 'relative', display: 'flex', padding: 5, borderRadius: 14, background: 'rgba(20,22,28,0.05)',
      boxShadow: `inset 0 0 0 1px ${G.hairline}`,
    }}>
      <div style={{
        position: 'absolute', top: 5, left: 5 + segW * k, width: segW, height: 54, borderRadius: 10,
        background: '#ffffff', boxShadow: `inset 0 1px 0 #ffffff, ${softShadow(3)}`,
      }} />
      {['Row', 'Grid'].map((label, j) => {
        const on = j === 0 ? k < 0.5 : k >= 0.5;
        return (
          <div key={label} style={{
            position: 'relative', width: segW, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 30, fontWeight: on ? 600 : 500, color: on ? G.ink1 : G.ink3, letterSpacing: tracking(30),
          }}>
            {icon(j === 1, on)}
            {label}
          </div>
        );
      })}
    </div>
  );
};

export const FlipGridReflow: React.FC = () => {
  const frame = useCurrentFrame();

  // 加深脉冲：只作用卡片层，仅脉冲窗口内挂载 filter，窗口外完全不挂（摘罩）
  const pulsing = frame >= PULSE_IN && frame <= PULSE_OUT;
  const bright = pulsing ? interpolate(frame, [PULSE_IN, PULSE_MID, PULSE_OUT], [1, 0.86, 1], cl) : 1;

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.3 }} accent={G.accent} vignette={0.16} />
      {/* 页面头：标题 + 计数副标题 + 视图切换 */}
      <div style={{ position: 'absolute', left: 96, right: 96, top: 72, display: 'flex', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 60, fontWeight: 700, color: G.ink1, letterSpacing: tracking(60), lineHeight: 1.05 }}>Projects</div>
          <div style={{ marginTop: 10, fontSize: 32, color: G.ink3, letterSpacing: tracking(32) }}>6 active · updated just now</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <ViewToggle frame={frame} />
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, ...(pulsing ? { filter: `brightness(${bright})` } : {}) }}>
        {Array.from({ length: N }).map((_, i) => (
          <FlipCard key={i} i={i} frame={frame} />
        ))}
      </div>
    </div>
  );
};
