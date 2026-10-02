// speed-ramp 变速——真实卡片流帧号 remap：快 → 0.2x 凝视窗 → 快 → 刹停。
//
// 第二轮重设计（「时间重映射」剪辑台 · aurora 紫夜）：
// - look = aurora（紫黑舞台 · 薰衣草主光 · 粉色速率）。主角仍是产品真实的项目卡流（2x 截图纹理，
//   Q1），但舞台换成暗场展台：卡片立在一条有倒影的玻璃导轨上，背后一道地平线光带；
//   快段背景里有随速度出现的横向光痕（速度线），慢窗里光痕消失、画面"安静下来"。
// - 手法可读化：左下一只 150px 的速率读数「2.6×」实时跟着 remap 斜率变（慢窗里变粉 + 泛光），
//   右下一张时间重映射曲线（速率 vs 帧，和剪辑软件里的 speed ramp 曲线同一语义），
//   播放头走过的部分点亮——观众同时"看见"变速和"读到"变速。
// - 凝视：慢窗里目标卡（Dialect-robust speech recognition）被拾起（抬高 22px、放大 5%、粉色轮廓光），
//   其余卡退暗、相机极缓推近 2.5%，卡上方挂一枚「0.2× · IN FOCUS」标签。
// - 速度门控模糊：按 remap 后的实际速度给方向性模糊（|v|<8px/f 裸渲），快糊-慢清的反差是手法的一半。
//
// 时间表（30fps，共 170f）：
//   0–30    快段 2.6×（≈57px/f，导轨糊、光痕满屏）——开场第 1 帧就在冲
//   30–48   刹车：smoothstep 18f 降到 0.2×（不是折线突变）
//   48–96   凝视窗 0.2×（48f ≥ 40f）：72f 目标卡过屏中，拾起 + 标签 + 读数变粉
//   96–110  油门：14f 回到 2.6×，标签与拾起先收
//   110–124 快段 2.6×
//   124–148 刹停：smoothstep 24f 2.6→0，落点让一张卡正好停在屏中
//   148–170 hold 22f：静止海报（曲线完整、读数 0.0×）
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, FONT, SpeedBlur, mix, ramp, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const SPEEDRAMP_DUR = 170;

const L = LOOKS.aurora;
const PINK = L.accent2; // 速率强调色（慢窗专用）

const CARD_W = 600;
const GAP = 48;
const PITCH = CARD_W + GAP;
const RAIL = layout.projects.cards; // 10 张真实卡片纹理
const RAIL_TOP = 232;
const TARGET_K = 4; // 导轨上第 4 张 = 目标卡
const TARGET_FILE = 'card7.png'; // Dialect-robust speech recognition
const SHIFT = RAIL.findIndex((c) => c.file === TARGET_FILE) - TARGET_K;
const fileOf = (k: number) => RAIL[(((k + SHIFT) % RAIL.length) + RAIL.length) % RAIL.length].file;
const cardH = (file: string) => (file === 'card1.png' || file === 'card2.png' ? (CARD_W * 576) / 716 : (CARD_W * 624) / 716);

// ───────────── 速率曲线（三处 smoothstep 换挡）与其闭式积分 ─────────────
const FAST = 2.6;
const SLOW = 0.2;
const A1 = 30, W1 = 18; // 刹车
const A2 = 96, W2 = 14; // 油门
const A3 = 124, W3 = 24; // 刹停

const ss = (f: number, a: number, w: number) => {
  const t = Math.min(1, Math.max(0, (f - a) / w));
  return t * t * (3 - 2 * t);
};
// smoothstep 从 a 起、宽 w 的积分：0 → w(t³ − t⁴/2) → w/2 + 线性
const intS = (f: number, a: number, w: number) => {
  if (f <= a) return 0;
  if (f >= a + w) return w * 0.5 + (f - a - w);
  const t = (f - a) / w;
  return w * (t * t * t - 0.5 * t * t * t * t);
};
const rateAt = (f: number) => FAST + (SLOW - FAST) * ss(f, A1, W1) + (FAST - SLOW) * ss(f, A2, W2) - FAST * ss(f, A3, W3);
const srcAt = (f: number) => {
  const x = Math.max(0, Math.min(SPEEDRAMP_DUR, f));
  return FAST * x + (SLOW - FAST) * intS(x, A1, W1) + (FAST - SLOW) * intS(x, A2, W2) - FAST * intS(x, A3, W3);
};

// 凝视窗中点目标卡过屏中；每源帧位移 PX 取整到"刹停时恰好又有一张卡停在屏中"
const MID = (A1 + W1 + A2) / 2; // 72
const N_TO_END = Math.round((22 * (srcAt(SPEEDRAMP_DUR) - srcAt(MID))) / PITCH);
const PX = (N_TO_END * PITCH) / (srcAt(SPEEDRAMP_DUR) - srcAt(MID)); // ≈22px / 源帧
const OFFSET = 960 - (TARGET_K * PITCH + CARD_W / 2) + srcAt(MID) * PX;
const railX = (f: number) => OFFSET - srcAt(f) * PX;

// 凝视量：只在刹车→油门之间为 1（刹停段不算）
const gazeAt = (f: number) => ss(f, A1 + 4, W1) * (1 - ss(f, A2 - 6, W2));

// ───────────── 背景速度光痕（确定性） ─────────────
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const STREAKS = Array.from({ length: 16 }, (_, i) => ({
  y: 150 + hash(i * 3.1) * 640,
  len: 240 + hash(i * 5.7) * 520,
  par: 1.25 + hash(i * 7.3) * 0.9, // 视差倍率（比导轨更快 = 更近）
  phase: hash(i * 9.9) * 3000,
  w: 1 + Math.round(hash(i * 2.3) * 2),
}));

// ───────────── 右下：时间重映射曲线 ─────────────
const GX = 640, GY = 880, GW = 1184, GH = 120;
const gx = (f: number) => GX + (f / SPEEDRAMP_DUR) * GW;
const gy = (r: number) => GY + GH - (r / FAST) * GH;
const curvePath = (() => {
  const pts: string[] = [];
  for (let f = 0; f <= SPEEDRAMP_DUR; f += 1) pts.push(`${gx(f).toFixed(1)} ${gy(rateAt(f)).toFixed(1)}`);
  return `M ${pts.join(' L ')}`;
})();

const RemapGraph: React.FC<{ frame: number; id: string }> = ({ frame, id }) => {
  const head = Math.min(SPEEDRAMP_DUR, frame);
  const hx = gx(head);
  const hy = gy(rateAt(head));
  const g = gazeAt(frame);
  const intro = ramp(frame, 0, 14, EASE.out);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: intro }}>
      <defs>
        <clipPath id={`past${id}`}>
          <rect x={0} y={0} width={hx} height={1080} />
        </clipPath>
        <clipPath id={`win${id}`}>
          <rect x={gx(A1 + 8)} y={0} width={gx(A2 + 8) - gx(A1 + 8)} height={1080} />
        </clipPath>
        <linearGradient id={`fill${id}`} x1="0" y1={GY} x2="0" y2={GY + GH} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={L.accent} stopOpacity={0.28} />
          <stop offset="1" stopColor={L.accent} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* 刻度：基线 + 1.0× 参考线 + 每 30f 一格 */}
      <line x1={GX} y1={GY + GH} x2={GX + GW} y2={GY + GH} stroke={alpha(L.ink, 0.16)} strokeWidth={1.5} />
      <line x1={GX} y1={gy(1)} x2={GX + GW} y2={gy(1)} stroke={alpha(L.ink, 0.1)} strokeWidth={1} strokeDasharray="4 8" />
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1={gx(i * 30)} y1={GY + GH} x2={gx(i * 30)} y2={GY + GH + 10} stroke={alpha(L.ink, 0.22)} strokeWidth={1.5} />
      ))}
      {/* 凝视窗底色 */}
      <rect x={gx(A1 + W1)} y={GY - 6} width={gx(A2) - gx(A1 + W1)} height={GH + 6} rx={6} fill={alpha(PINK, 0.06 + 0.06 * g)} />
      {/* 未播部分：暗线；已播部分：亮线 + 渐变填充 */}
      <path d={curvePath} fill="none" stroke={alpha(L.ink, 0.16)} strokeWidth={3} strokeLinejoin="round" />
      <g clipPath={`url(#past${id})`}>
        <path d={`${curvePath} L ${gx(SPEEDRAMP_DUR)} ${GY + GH} L ${GX} ${GY + GH} Z`} fill={`url(#fill${id})`} />
        <path d={curvePath} fill="none" stroke={L.accent} strokeWidth={4} strokeLinejoin="round" />
</g>
      {/* 凝视窗段落单独描粉（已播 ∩ 凝视窗） */}
      <g clipPath={`url(#past${id})`}>
        <g clipPath={`url(#win${id})`}>
          <path d={curvePath} fill="none" stroke={PINK} strokeWidth={5} strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 8px ${alpha(PINK, 0.7)})` }} />
        </g>
      </g>
      {/* 播放头 */}
      <line x1={hx} y1={GY - 18} x2={hx} y2={GY + GH + 14} stroke={alpha(L.ink, 0.55)} strokeWidth={1.5} />
      <circle cx={hx} cy={hy} r={9} fill={g > 0.5 ? PINK : L.ink} style={{ filter: `drop-shadow(0 0 10px ${alpha(g > 0.5 ? PINK : L.accent, 0.9)})` }} />
      <text x={GX} y={GY - 26} fill={alpha(L.ink, 0.5)} style={{ ...type(22, 600, { mono: true }), letterSpacing: '0.16em' }}>
        TIME REMAP · RATE / FRAME
      </text>
      <text x={gx(A1 + W1) + 14} y={GY + 22} fill={alpha(PINK, 0.55 + 0.45 * g)} style={{ ...type(22, 700, { mono: true }), letterSpacing: '0.12em' }}>
        0.2× · 48f
      </text>
    </svg>
  );
};

export const SpeedRampReal: React.FC = () => {
  const frame = useCurrentFrame();
  const gid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const x0 = railX(frame);
  const v = velocity(railX, frame); // px/帧（负 = 向左）
  const speed = Math.abs(v);
  // 模糊门限：|v| < 8px/f 完全裸渲；之上按超出量给方向性模糊
  const blurV = Math.sign(v) * Math.max(0, speed - 8);
  const rate = rateAt(frame);
  const gaze = gazeAt(frame);

  // 目标卡拾起量：靠近屏中 × 凝视量（位置先到、拾起晚一点收敛）
  const tx = x0 + TARGET_K * PITCH + CARD_W / 2;
  const near = Math.max(0, 1 - Math.abs(tx - 960) / 700);
  const lift = EASE.smooth(near) * gaze;
  // 相机：凝视窗极缓推近 2.5%
  const cam = 1 + 0.025 * EASE.smooth(gaze);
  const streakA = Math.min(1, Math.max(0, (speed - 14) / 36));
  const tag = ramp(frame, 56, 12, EASE.snappy) * (1 - ramp(frame, 92, 8, EASE.exit));

  const cards: React.ReactNode[] = [];
  const reflections: React.ReactNode[] = [];
  for (let k = -2; k < 26; k++) {
    const left = x0 + k * PITCH;
    if (left > 2000 || left + CARD_W < -80) continue;
    const file = fileOf(k);
    const isT = k === TARGET_K;
    const l = isT ? lift : 0;
    const h = cardH(file);
    const dim = isT ? 0 : 0.62 * gaze;
    const common: React.CSSProperties = {
      position: 'absolute',
      left: k * PITCH,
      width: CARD_W,
      height: h,
      borderRadius: 18,
      overflow: 'hidden',
    };
    cards.push(
      <div
        key={k}
        style={{
          ...common,
          top: 0,
          transform: `translateY(${(-22 * l).toFixed(2)}px) scale(${(1 + 0.05 * l).toFixed(4)})`,
          boxShadow: isT
            ? `0 0 0 ${(2 * l).toFixed(2)}px ${alpha(PINK, 0.9 * l)}, 0 0 ${(70 * l).toFixed(1)}px ${alpha(PINK, 0.32 * l)}, 0 ${(30 + 20 * l).toFixed(0)}px ${(70 + 30 * l).toFixed(0)}px -20px rgba(0,0,0,0.75)`
            : '0 30px 70px -20px rgba(0,0,0,0.75)',
          zIndex: isT ? 2 : 1,
        }}
      >
        <Img src={staticFile(`textures/live/${file}`)} style={{ width: '100%', height: '100%', display: 'block' }} />
        {/* 退暗层：带色相的紫黑，不是灰 */}
        {dim > 0.002 && <div style={{ position: 'absolute', inset: 0, background: alpha('#0b0716', dim) }} />}
      </div>,
    );
    // 玻璃导轨倒影：翻转 + 渐隐（只取卡片上 40%）
    reflections.push(
      <div
        key={`r${k}`}
        style={{
          ...common,
          top: 0,
          transform: 'translateY(14px) scaleY(-1)',
          transformOrigin: '50% 100%',
          opacity: isT ? 0.26 : 0.26 * (1 - 0.6 * gaze),
          WebkitMaskImage: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 15%)',
          maskImage: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 15%)',
        }}
      >
        <Img src={staticFile(`textures/live/${file}`)} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>,
    );
  }

  const readColor = gaze > 0.02 ? PINK : L.ink;
  // 刹停后读数退成弱字，尾帧让曲线当海报主角
  const settle = ramp(frame, A3 + 10, 20, EASE.out);
  const tH = cardH(TARGET_FILE);

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={{ x: 0.5, y: 0.92 }} horizon={0.69} breathe={0.4}>
        {/* 速度光痕：快段满屏、慢窗消失 */}
        {streakA > 0.01 &&
          STREAKS.map((s, i) => {
            const x = ((((x0 * s.par + s.phase) % 2800) + 2800) % 2800) - 440;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: s.y,
                  width: s.len,
                  height: s.w,
                  borderRadius: 2,
                  opacity: streakA * 0.55,
                  background: `linear-gradient(90deg, ${alpha(L.light, 0)} 0%, ${alpha('#d9ccff', 0.9)} 70%, ${alpha('#ffffff', 0)} 100%)`,
                }}
              />
            );
          })}
      </Stage>

      {/* 顶部：产品名 + 页面位置（导轨所在的真实页面） */}
      <div style={{ position: 'absolute', left: 96, top: 74, display: 'flex', alignItems: 'baseline', gap: 22, opacity: ramp(frame, 0, 12, EASE.out) }}>
        <span style={{ ...type(36, 700), color: L.ink }}>Pallas</span>
        <span style={{ ...type(32, 450), color: L.ink3 }}>/</span>
        <span style={{ ...type(32, 500), color: L.ink2 }}>All projects</span>
      </div>
      <div style={{ position: 'absolute', right: 96, top: 80, ...type(24, 600, { mono: true }), letterSpacing: '0.14em', color: L.ink3 }}>
        10 ACTIVE · SORTED BY UPDATE
      </div>

      {/* 导轨 + 倒影：同一份速度模糊；相机推近 */}
      <AbsoluteFill style={{ transform: `scale(${cam.toFixed(4)})`, transformOrigin: '50% 46%' }}>
        {/* 玻璃导轨的前沿发丝高光 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: RAIL_TOP + (CARD_W * 624) / 716 + 7,
            height: 1.5,
            background: `linear-gradient(90deg, ${alpha(L.accent, 0)} 0%, ${alpha('#d9ccff', 0.35)} 50%, ${alpha(L.accent, 0)} 100%)`,
          }}
        />
        <SpeedBlur vx={blurV} amount={0.32} max={26}>
          <div style={{ position: 'absolute', left: 0, top: RAIL_TOP, transform: `translateX(${x0.toFixed(2)}px)` }}>
            {reflections}
            {cards}
          </div>
        </SpeedBlur>
        {/* 凝视标签：挂在目标卡上方 */}
        {tag > 0.001 && (
          <div
            style={{
              position: 'absolute',
              left: tx - CARD_W / 2,
              top: RAIL_TOP - 22 * lift - 66,
              opacity: tag,
              transform: `translateY(${mix(14, 0, tag).toFixed(2)}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              ...type(26, 700, { mono: true }),
              letterSpacing: '0.12em',
              color: PINK,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 5, background: PINK, boxShadow: `0 0 14px ${PINK}` }} />
            0.2× · IN FOCUS
          </div>
        )}
        {/* 目标卡底部投在导轨上的粉色余光 */}
        <div
          style={{
            position: 'absolute',
            left: tx - 420,
            top: RAIL_TOP + tH - 10,
            width: 840,
            height: 90,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(PINK, 0.3 * lift)} 0%, ${alpha(PINK, 0)} 70%)`,
            pointerEvents: 'none',
          }}
        />
      </AbsoluteFill>

      {/* 左下：速率读数 */}
      <div style={{ position: 'absolute', left: 96, top: 830, opacity: ramp(frame, 0, 10, EASE.out) }}>
        <div style={{ ...type(22, 600, { mono: true }), letterSpacing: '0.18em', color: alpha(L.ink, 0.5), marginBottom: 6 }}>PLAYBACK RATE</div>
        <div
          style={{
            ...type(150, 760),
            letterSpacing: '-0.045em',
            color: readColor,
            textShadow: gaze > 0.02 ? `0 0 40px ${alpha(PINK, 0.45 * gaze)}` : undefined,
            opacity: (gaze > 0.02 ? 0.55 + 0.45 * gaze : 1) * (1 - 0.6 * settle),
          }}
        >
          {rate.toFixed(1)}
          <span style={{ fontSize: 96, fontWeight: 500, marginLeft: 4, color: alpha(readColor, 0.7) }}>×</span>
        </div>
      </div>

      <RemapGraph frame={frame} id={gid} />
    </AbsoluteFill>
  );
};
