// spectrum-morph-ui —— 频谱化 UI
//
// 第二轮重设计（暖沙唱片封套 · 瑞士网格）：
// - look = sand（米色 · 墨 · 赤陶，点缀靛蓝）。画面是一张唱片封套式的「正在播放」页（虚构电台 Lowlight FM）：
//   左对齐瑞士网格，200px 超粗标题「Night Shift」，下面一道 14px 粗的赤陶色标题线（1000px）——
//   观众先把它读作排版里的那条粗线；右侧一张黑胶唱片随播放转动（33⅓ 转 ≈ 6.7°/帧），唱臂搭在盘面。
// - 手法：标题线被音乐借用两小节——26f 裂成 32 根竖条（gap 0→8px），底边锁死在原线上只向上长，
//   按伪频谱跳动 64f：每 16f 一记底鼓（低频端冲高后指数衰减）、每 8f 反拍一记镲（高频端闪一下）、
//   再叠每 4f 换挡的 seed 抖动与低高频包络；每根条带一枚靛蓝峰值帽（过去 12 帧最大值减重力衰减）。
//   90f 起 12f 收拢，条宽 + gap 恰好拼回 1000px 整线，之后条件挂载回整条直线（摘罩，不是条高归零）。
// - 唱片与时间码只在"播放"时走：0–20f 起转，收拢时 18f 刹停——借用结束，整个画面一起"停播"。
//
// 时间表（30fps，共 150f）：
//   0–24    入场：唱片由右侧滑入并起转；眉题淡入、标题逐词从线下升起（3f 起）、标题线由左向右画出（8–24f）
//   26–34   裂开：gap 0→8、幅度 out-cubic 爬升
//   34–90   跳动（底鼓 16f / 反拍镲 8f）
//   90–102  收拢回整线；唱片 90–108 刹停
//   102–150 hold 48f：整幅 1.5% 极缓推进（ease-out），线与条组像素级归位
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const SPECTRUM_MORPH_UI_DURATION = 150; // 入场 26f + 裂开/跳动 64f + 收拢 12f + hold 48f

const L = LOOKS.sand;

const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const LEFT = 160; // 网格左缘
const LINE_W = 1000;
const LINE_H = 14;
const LINE_BOTTOM = 630; // 标题线底边 y（条从这里向上长）

const N_BARS = 32;
const GAP_MAX = 8;

const SPLIT = 26;
const SPLIT_DUR = 8;
const DANCE = 64;
const COLLAPSE_START = SPLIT + DANCE; // 90
const COLLAPSE_DUR = 12;
const COLLAPSE_END = COLLAPSE_START + COLLAPSE_DUR; // 102

const AMP = 115; // 封顶 14 + 115 = 129px：条顶最高到 y≈501，刚好不碰标题 g 的降部
const BEAT = 16; // 底鼓间隔
const C = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 低频端高、高频端矮
const env = (i: number) => 0.35 + 0.65 * Math.pow(1 - i / (N_BARS - 1), 1.2);

const ampAt = (f: number) =>
  interpolate(f, [SPLIT, SPLIT + SPLIT_DUR], [0, 1], { ...C, easing: Easing.out(Easing.cubic) }) *
  interpolate(f, [COLLAPSE_START, COLLAPSE_END], [1, 0], { ...C, easing: Easing.out(Easing.cubic) });

// 伪频谱：底鼓（低频）+ 反拍镲（高频）+ 摆动 + 每 4f 换挡抖动
const barHAt = (i: number, f: number) => {
  const t = f - SPLIT;
  const sinceKick = ((t % BEAT) + BEAT) % BEAT;
  const sinceHat = (((t - BEAT / 2) % BEAT) + BEAT) % BEAT;
  const kick = Math.exp(-sinceKick / 5);
  const hat = Math.exp(-sinceHat / 2.5);
  const low = 1 - i / (N_BARS - 1);
  const wobble = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.7 + f * 0.29));
  const jitter = 0.45 + 0.55 * h(i * 13 + Math.floor(f / 4));
  const e = env(i) * (0.22 + 0.9 * kick * low + 0.75 * hat * (1 - low));
  return LINE_H + AMP * Math.min(1, wobble * jitter * e * 1.6) * ampAt(f);
};

const peakAt = (i: number, f: number) => {
  let p = 0;
  for (let k = 0; k <= 12; k++) {
    if (f - k < SPLIT) break;
    p = Math.max(p, barHAt(i, f - k) - 0.9 * k * k);
  }
  return Math.max(p, barHAt(i, f));
};

// 唱片转角：0–20f 起转、跳动段匀速 33⅓（6.67°/帧）、90–108f 刹停（积分出角度，帧确定）
const SPIN = 6.67;
const spinRate = (f: number) =>
  f < 20 ? SPIN * EASE.out(f / 20) : f < COLLAPSE_START ? SPIN : SPIN * (1 - ramp(f, COLLAPSE_START, 18, EASE.out));
const angleAt = (f: number) => {
  let a = 0;
  for (let k = 0; k < Math.min(f, 120); k++) a += spinRate(k);
  return a;
};

const Vinyl: React.FC<{ angle: number }> = ({ angle }) => (
  <div style={{ position: 'relative', width: 640, height: 640 }}>
    {/* 投影 */}
    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: `0 40px 80px -30px ${alpha(L.shadow, 0.55)}, 0 8px 18px -8px ${alpha(L.shadow, 0.4)}` }} />
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '50%', transform: `rotate(${angle.toFixed(2)}deg)`,
      background: `repeating-radial-gradient(circle at 50% 50%, #1d1712 0px, #1d1712 2px, #2a221b 3px, #1d1712 4px)`,
    }}>
      {/* 中心标签（随盘转） */}
      <div style={{
        position: 'absolute', left: 320 - 112, top: 320 - 112, width: 224, height: 224, borderRadius: '50%',
        background: L.accent, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: `inset 0 0 0 10px ${alpha('#000', 0.08)}`,
      }}>
        <div style={{ ...type(22, 800, { caps: true }), letterSpacing: '0.22em', color: L.onAccent }}>Lowlight FM</div>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: L.bg[1], margin: '18px 0' }} />
        <div style={{ ...type(18, 600, { caps: true, mono: true }), letterSpacing: '0.16em', color: alpha(L.onAccent, 0.8) }}>Side A · 33⅓</div>
      </div>
    </div>
    {/* 静止的盘面反光（不随盘转，转动时唱纹在光下流动） */}
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '50%', mixBlendMode: 'screen',
      background: `conic-gradient(from 20deg, transparent 0deg, ${alpha('#fff3df', 0.16)} 30deg, transparent 70deg, transparent 180deg, ${alpha('#fff3df', 0.1)} 215deg, transparent 250deg)`,
    }} />
  </div>
);

export const SpectrumMorphUi: React.FC = () => {
  const frame = useCurrentFrame();

  const eyebrowIn = ramp(frame, 0, 16, EASE.snappy);
  const lineDraw = ramp(frame, 8, 16, EASE.swift);
  const metaIn = ramp(frame, 12, 16, EASE.out);
  const vinylIn = ramp(frame, 0, 26, EASE.snappy);
  const cam = mix(1, 1.015, ramp(frame, COLLAPSE_END, 150 - COLLAPSE_END, EASE.out));

  const amp = ampAt(frame);
  const gapIn = interpolate(frame, [SPLIT, SPLIT + SPLIT_DUR], [0, GAP_MAX], { ...C, easing: Easing.out(Easing.cubic) });
  const gapOut = interpolate(frame, [COLLAPSE_START, COLLAPSE_END], [GAP_MAX, 0], { ...C, easing: Easing.out(Easing.cubic) });
  const gap = Math.min(gapIn, gapOut);
  const barW = (LINE_W - (N_BARS - 1) * gap) / N_BARS;
  const barsActive = frame >= SPLIT && frame < COLLAPSE_END;

  // 时间码：播放时走（与唱片同一转速曲线），停播即停
  const played = angleAt(frame) / SPIN / 30; // 秒
  const tc = 12 * 60 + 41 + played;
  const mm = Math.floor(tc / 60);
  const ss = Math.floor(tc % 60);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans, background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.15 }} fill={{ x: 0.85, y: 0.85 }} />

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: '40% 55%' }}>
        {/* 黑胶：右侧，唱臂搭盘 */}
        <div style={{ position: 'absolute', left: 1180 + mix(160, 0, vinylIn), top: 230, opacity: vinylIn }}>
          <Vinyl angle={angleAt(frame)} />
          <svg width={300} height={520} style={{ position: 'absolute', left: 430, top: -90, overflow: 'visible' }}>
            <circle cx={200} cy={60} r={30} fill={L.surface} stroke={alpha(L.ink, 0.25)} strokeWidth={2} />
            <circle cx={200} cy={60} r={10} fill={L.ink2} />
            <path d="M 200 60 L 210 300 L 120 420" fill="none" stroke={L.ink2} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
            <rect x={96} y={404} width={46} height={30} rx={6} fill={L.ink} transform="rotate(-38 119 419)" />
          </svg>
        </div>

        {/* 眉题 */}
        <div style={{ position: 'absolute', left: LEFT, top: 236, display: 'flex', gap: 18, alignItems: 'center', opacity: eyebrowIn }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: L.accent, opacity: barsActive ? 1 : 0.5 }} />
          <div style={{ ...type(28, 700, { caps: true }), letterSpacing: '0.24em', color: L.ink }}>Now playing</div>
          <div style={{ ...type(28, 600, { caps: true }), letterSpacing: '0.24em', color: L.ink3 }}>Side A — 03</div>
        </div>

        {/* 标题 */}
        <div style={{ position: 'absolute', left: LEFT - 8, top: 282, ...type(200, 900), letterSpacing: '-0.055em', color: L.ink, lineHeight: 1 }}>
          <TextReveal text="Night Shift" by="word" variant="rise" start={3} each={20} gap={5} />
        </div>

        {/* 标题线 / 频谱 */}
        {!barsActive && (
          <div style={{
            position: 'absolute', left: LEFT, top: LINE_BOTTOM - LINE_H, width: LINE_W, height: LINE_H, background: L.accent,
            borderRadius: 2, transform: `scaleX(${lineDraw.toFixed(4)})`, transformOrigin: '0% 50%',
          }} />
        )}
        {barsActive &&
          Array.from({ length: N_BARS }).map((_, i) => {
            const bh = barHAt(i, frame);
            const peak = peakAt(i, frame);
            const left = LEFT + i * (barW + gap);
            const w = barW + (gap < 1 ? 0.5 : 0);
            const capLift = peak - bh;
            return (
              <React.Fragment key={i}>
                <div style={{
                  position: 'absolute', left, top: LINE_BOTTOM - bh, width: w, height: bh, borderRadius: '3px 3px 2px 2px',
                  background: `linear-gradient(180deg, #e0774c 0%, ${L.accent} 45%, #a8431f 100%)`,
                }} />
                {capLift > 6 && amp > 0.15 && (
                  <div style={{
                    position: 'absolute', left, top: LINE_BOTTOM - peak - 10, width: w, height: 5, borderRadius: 2,
                    background: L.accent2, opacity: Math.min(1, amp * 1.4) * (1 - ramp(frame, COLLAPSE_START, 5, EASE.out)), // 收拢一开始峰值帽先撤，不留悬空短线
                  }} />
                )}
              </React.Fragment>
            );
          })}

        {/* 信息行 */}
        <div style={{ position: 'absolute', left: LEFT, top: LINE_BOTTOM + 40, width: LINE_W, display: 'flex', alignItems: 'baseline', opacity: metaIn, transform: `translateY(${mix(14, 0, metaIn)}px)` }}>
          <div style={{ ...type(40, 700), color: L.ink }}>Vol. 07</div>
          <div style={{ ...type(40, 500), color: L.ink2, marginLeft: 22 }}>A 48-minute mix for deep work</div>
          <div style={{ marginLeft: 'auto', ...type(34, 600, { mono: true }), color: L.ink2 }}>
            {mm}:{String(ss).padStart(2, '0')}<span style={{ color: L.ink3 }}> / 48:00</span>
          </div>
        </div>

        {/* 底部曲目表（纹理级、降亮） */}
        <div style={{ position: 'absolute', left: LEFT, top: 840, display: 'flex', gap: 56, opacity: metaIn * 0.9 }}>
          {[['01', 'Amber Hour'], ['02', 'Low Tide'], ['03', 'Night Shift'], ['04', 'Last Train']].map(([n, t], i) => (
            <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span style={{ ...type(24, 600, { mono: true }), color: i === 2 ? L.accent : L.ink3 }}>{n}</span>
              <span style={{ ...type(32, i === 2 ? 700 : 500), color: i === 2 ? L.ink : L.ink3 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
