// spectrum-morph-ui —— 频谱化 UI
// 标题 "LAUNCH WEEK" 下方 8px 下划线（720px）。25f 起裂成 28 根竖条
// （20px 宽、6px 间隙），条高按伪 FFT 跳动 64f（低频端高、高频端矮的包络），
// 条底对齐原线、向上生长。两小节后 12f 收拢回 8px 直线，收线后真静止 39f。
// 质感：深色章节页（冷调深底 + 柔光 + 暗角 + 颗粒），标题系统字体 800 字重收紧字距、
// 上方日期眉题、下方一句副题，先 14f 上浮入场、下划线 6f 后由中心向两侧画出——
// 观众先认出"这是下划线"再看它变；条是强调色竖向渐变（顶亮底实），每根条带一枚
// 经典均衡器的"峰值帽"（按过去 12 帧最大值减重力衰减求得，纯函数帧确定）；
// 条组背后一团随平均响度呼吸的柔光（只在跳动段挂载，收线后摘除）；颗粒在收线帧冻结，
// 收尾 39f 像素级 diff 为零。
import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Backdrop, EASE, FONT, Grain, mix, ramp, tracking } from '../../_fixtures/Polish';

export const SPECTRUM_MORPH_UI_DURATION = 140; // 入场 25f + 裂开 8f + 跳动 64f（含裂开）+ 收拢 12f + 真静止 39f

// 库内标准 seed hash（帧确定，无 Math.random）
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const LINE_W = 720;
const LINE_H = 8;
const LINE_X = (1920 - LINE_W) / 2; // 600
const LINE_BOTTOM = 620; // 下划线底边 y（条从这里向上长）

const N_BARS = 28;
const GAP_MAX = 6;

const SPLIT = 25; // 裂开起点
const SPLIT_DUR = 8; // 裂开 & 幅度爬升
const DANCE = 64; // 跳动两小节
const COLLAPSE_START = SPLIT + DANCE; // 89
const COLLAPSE_DUR = 12;
const COLLAPSE_END = COLLAPSE_START + COLLAPSE_DUR; // 101 → 之后真静止 39f

const AMP = 92; // 理论峰值 8 + 92 = 100px；wobble×jitter×env 很少同时取满，实测峰值 ~80px

const INK = '#eef0f8'; // 标题近白（带冷调，不用纯白）
const ACC = '#7c84f0'; // 下划线/频谱强调色（深底上提亮一档的靛蓝）
const ACC_DEEP = '#5b63d3';

// 低频端高、高频端矮的包络
const env = (i: number) => 0.4 + 0.6 * Math.pow(1 - i / (N_BARS - 1), 1.1);

const C = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 幅度包络：裂开 out-cubic 爬升 × 收拢 out-cubic 归零
const ampAt = (f: number) =>
  interpolate(f, [SPLIT, SPLIT + SPLIT_DUR], [0, 1], { ...C, easing: Easing.out(Easing.cubic) }) *
  interpolate(f, [COLLAPSE_START, COLLAPSE_END], [1, 0], { ...C, easing: Easing.out(Easing.cubic) });

// 伪 FFT 条高：|sin| 摆动 × 每 4 帧换挡的 seed 随机 × 频段包络 × 幅度包络
const barHAt = (i: number, f: number) => {
  const wobble = Math.abs(Math.sin(i * 0.7 + f * 0.31));
  const jitter = 0.4 + 0.6 * h(i * 13 + Math.floor(f / 4));
  return LINE_H + AMP * wobble * jitter * env(i) * ampAt(f);
};

// 峰值帽：过去 12 帧的条高减重力衰减（0.9·k²）取最大——峰值弹上去、慢慢落回
const peakAt = (i: number, f: number) => {
  let p = 0;
  for (let k = 0; k <= 12; k++) {
    if (f - k < SPLIT) break;
    p = Math.max(p, barHAt(i, f - k) - 0.9 * k * k);
  }
  return Math.max(p, barHAt(i, f));
};

export const SpectrumMorphUi: React.FC = () => {
  const frame = useCurrentFrame();

  // 入场：眉题 → 标题 → 副题错峰 3f 上浮（snappy），下划线 6f 后由中心画出（swift）
  const eyebrowIn = ramp(frame, 0, 16, EASE.snappy);
  const titleIn = ramp(frame, 3, 16, EASE.snappy);
  const subIn = ramp(frame, 9, 16, EASE.out);
  const lineDraw = ramp(frame, 6, 14, EASE.swift);

  const amp = ampAt(frame);

  // 间隙：裂开时 0→6，收拢时 6→0（收拢结束恰好合成整线）
  const gapIn = interpolate(frame, [SPLIT, SPLIT + SPLIT_DUR], [0, GAP_MAX], { ...C, easing: Easing.out(Easing.cubic) });
  const gapOut = interpolate(frame, [COLLAPSE_START, COLLAPSE_END], [GAP_MAX, 0], { ...C, easing: Easing.out(Easing.cubic) });
  const gap = Math.min(gapIn, gapOut);
  const barW = (LINE_W - (N_BARS - 1) * gap) / N_BARS; // gap=6 时 ≈20px

  // 条形阶段以外条件挂载整线（摘罩=条件挂载，保证收尾像素级静止）
  const barsActive = frame >= SPLIT && frame < COLLAPSE_END;

  // 平均响度 → 背后柔光强度
  let loud = 0;
  if (barsActive) {
    for (let i = 0; i < N_BARS; i++) loud += barHAt(i, frame) - LINE_H;
    loud = loud / N_BARS / AMP;
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.4 }} accent={ACC_DEEP} grain={0} vignette={0.55} />

      {/* 条组背后的柔光：随平均响度呼吸（跳动段才挂载） */}
      {barsActive && (
        <div
          style={{
            position: 'absolute',
            left: LINE_X - 140,
            top: LINE_BOTTOM - 210,
            width: LINE_W + 280,
            height: 300,
            background: `radial-gradient(ellipse 50% 50% at 50% 66%, rgba(124,132,240,${(0.28 * Math.min(1, loud * 2.4)).toFixed(3)}) 0%, rgba(124,132,240,0) 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 眉题 */}
      <div
        style={{
          position: 'absolute',
          top: 262,
          width: '100%',
          textAlign: 'center',
          opacity: eyebrowIn,
          transform: `translateY(${mix(18, 0, eyebrowIn)}px)`,
          fontSize: 34,
          fontWeight: 600,
          letterSpacing: '0.16em',
          color: ACC,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        OCT 14 — 18
      </div>

      {/* 标题 */}
      <div
        style={{
          position: 'absolute',
          top: 322,
          width: '100%',
          textAlign: 'center',
          opacity: titleIn,
          transform: `translateY(${mix(26, 0, titleIn)}px)`,
          fontWeight: 800,
          fontSize: 132,
          lineHeight: 1,
          color: INK,
          letterSpacing: tracking(132, true),
        }}
      >
        LAUNCH WEEK
      </div>

      {/* 副题 */}
      <div
        style={{
          position: 'absolute',
          top: LINE_BOTTOM + 52,
          width: '100%',
          textAlign: 'center',
          opacity: subIn,
          transform: `translateY(${mix(16, 0, subIn)}px)`,
          fontSize: 38,
          fontWeight: 500,
          color: 'rgba(238,240,248,0.56)',
          letterSpacing: tracking(38),
        }}
      >
        Five days. Five releases.
      </div>

      {!barsActive && (
        <div
          style={{
            position: 'absolute',
            left: LINE_X,
            top: LINE_BOTTOM - LINE_H,
            width: LINE_W,
            height: LINE_H,
            background: ACC,
            borderRadius: 4,
            transform: `scaleX(${lineDraw})`,
            transformOrigin: '50% 50%',
          }}
        />
      )}

      {barsActive &&
        Array.from({ length: N_BARS }).map((_, i) => {
          const barH = barHAt(i, frame);
          const peak = peakAt(i, frame);
          const left = LINE_X + i * (barW + gap);
          const w = barW + (gap < 1 ? 0.5 : 0); // gap 收到 0 时补 0.5px 防细缝
          // 峰值帽：离条顶 ≥5px 才画（贴着条顶时并入条身，不叠出亮边）
          const capLift = peak - barH;
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: 'absolute',
                  left,
                  top: LINE_BOTTOM - barH, // 底边对齐原线，向上长
                  width: w,
                  height: barH,
                  background: `linear-gradient(180deg, #a5abff 0%, ${ACC} 38%, ${ACC_DEEP} 100%)`,
                  borderRadius: 3,
                }}
              />
              {capLift > 5 && amp > 0.15 && (
                <div
                  style={{
                    position: 'absolute',
                    left,
                    top: LINE_BOTTOM - peak - 7,
                    width: w,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(214,218,255,0.9)',
                    opacity: Math.min(1, amp * 1.4),
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

      {/* 颗粒：收线后冻结在 COLLAPSE_END 那一帧，保证"归还"后像素级真静止 */}
      <Freeze frame={COLLAPSE_END} active={frame >= COLLAPSE_END}>
        <Grain opacity={0.08} blend="soft-light" />
      </Freeze>
    </AbsoluteFill>
  );
};
