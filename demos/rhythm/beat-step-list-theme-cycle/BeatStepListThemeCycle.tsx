// beat-step-list-theme-cycle（bear 22.3–24.6s）
// 深色场形容词列表逐拍步进：每拍列表上移一行 + 选中胶囊跳到下一行并换色
// （绿→紫→红），整场底色同步换（深棕→深紫→深藏青）。
// 一拍之内"行、色、场"三通道同步跳变，~0.6s 一拍。
// 质感：场不是平涂——底色 + 胶囊同色相的柔光晕 + 暗角 + 颗粒，三者都跟同一个拍内时钟换色；
// 胶囊有上亮下暗的微渐变、顶部内高光与同色辉光阴影；列表按与视口中心的距离做
// 透明度 / 字号衰减（滚轮式景深），拍头 6f 跳变带按速度计算的竖向运动模糊。
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { FONT, Grain, SpeedBlur, Vignette, tracking, velocity } from '../../_fixtures/Polish';

export const BEAT_STEP_LIST_THEME_CYCLE_DURATION = 110; // 铺垫 30f + 3 拍 × 18f + 末拍后 hold 38f

const ROW_H = 150;
const FONT_SIZE = 92;
// 上方垫两行、下方垫两行未选中词：起拍时 modern 在视口中心，末拍停在 seamless 下面仍有词垫着
const WORDS = ['minimal', 'bold', 'modern', 'playful', 'expressive', 'seamless', 'intuitive', 'refined'];
const START_IDX = 2; // modern

// 拍点：~0.6s 一拍 = 18 帧
const BEAT_LEN = 18;
const FIRST_BEAT = 30; // 前 1s 静置铺垫
const N_BEATS = 3;
const JUMP = 6; // 跳变窗：拍头 6f，其余 12f 完全静置

// 每拍的（胶囊色 / 场底色 / 胶囊上的字色）——起始态 + 三拍；相邻底色同明度不同色相
const THEMES = [
  { pill: '#e7e3da', bg: '#1d1712', ink: '#231b14' }, // modern：暖灰白胶囊 / 深浓缩咖啡场
  { pill: '#3fb46a', bg: '#121c15', ink: '#ffffff' }, // playful：绿 / 深松绿
  { pill: '#8a6cf0', bg: '#19152c', ink: '#ffffff' }, // expressive：紫 / 深茄紫
  { pill: '#e5484d', bg: '#111a2b', ink: '#ffffff' }, // seamless：红 / 深藏青
];

// 拍内跳变：陡 ease-out（指数 3.2），6 帧内完成
const snap = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3.2);

const hex = (a: string) => [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
const mixRgb = (a: string, b: string, t: number) => {
  const pa = hex(a);
  const pb = hex(b);
  return pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
};
const css = (c: number[], a = 1) => (a >= 1 ? `rgb(${c.join(',')})` : `rgba(${c.join(',')},${a})`);
const lighten = (c: number[], k: number) => c.map((v) => Math.round(v + (255 - v) * k));
const darken = (c: number[], k: number) => c.map((v) => Math.round(v * (1 - k)));

// 一个时钟：已触发拍数 + 拍内进度（跳变只占拍头 JUMP 帧）
const clock = (frame: number) => {
  const raw = (frame - FIRST_BEAT) / BEAT_LEN;
  const beat = Math.min(N_BEATS, Math.max(0, Math.floor(raw) + 1));
  const beatStart = FIRST_BEAT + (beat - 1) * BEAT_LEN;
  const tInBeat = beat === 0 ? 1 : snap((frame - beatStart) / JUMP);
  const step = beat === 0 ? 0 : beat - 1 + tInBeat; // 连续步进量
  return { beat, tInBeat, step };
};

export const BeatStepListThemeCycle: React.FC = () => {
  const frame = useCurrentFrame();
  const { beat, tInBeat, step } = clock(frame);

  // 三通道 —— 1) 列表上移一行
  const listY = -step * ROW_H;
  const vy = velocity((f) => -clock(f).step * ROW_H, frame); // px/帧，喂运动模糊

  // 2) 胶囊 / 3) 场底色：同一个 tInBeat 逐通道 cross-mix
  const themePrev = THEMES[Math.max(0, beat - 1)];
  const themeNow = THEMES[beat];
  const mixT = beat === 0 ? 1 : tInBeat;
  const pill = mixRgb(themePrev.pill, themeNow.pill, mixT);
  const bg = mixRgb(themePrev.bg, themeNow.bg, mixT);
  const bgColor = css(bg);

  // 胶囊每拍落位时 squash 弹一下（1.12→0.97→1，随拍头 6f 走完）
  const pop = beat === 0 ? 1 : interpolate(tInBeat, [0, 0.6, 1], [1.12, 0.97, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // 落位瞬间辉光略涨再收，强调"接住"
  const glowK = beat === 0 ? 0 : 1 - tInBeat;

  // 选中行判定跟整数拍走（避免半白半灰的中间态）
  const selectedIdx = START_IDX + beat;
  const selInk = beat === 0 ? THEMES[0].ink : '#ffffff';
  const listPos = START_IDX + step; // 视口中心对应的连续行号

  return (
    <AbsoluteFill style={{ background: bgColor, fontFamily: FONT.sans, overflow: 'hidden' }}>
      {/* 场：胶囊同色相的柔光晕，跟底色同拍换色 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 46% 40% at 50% 50%, ${css(pill, 0.2 + 0.08 * glowK)} 0%, ${css(pill, 0.05)} 55%, ${css(pill, 0)} 100%)`,
        }}
      />
      {/* 中央固定胶囊（列表在其下滚动，视觉上"胶囊跳到下一行"） */}
      <div style={{
        position: 'absolute', left: '50%', top: 540 - ROW_H / 2 + 10,
        width: 900, height: ROW_H - 20, transform: `translateX(-50%) scale(${pop})`,
        borderRadius: 999,
        background: `linear-gradient(180deg, ${css(lighten(pill, 0.14))} 0%, ${css(pill)} 52%, ${css(darken(pill, 0.08))} 100%)`,
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,0.45)',
          'inset 0 -2px 6px rgba(0,0,0,0.10)',
          '0 2px 4px rgba(0,0,0,0.30)',
          `0 22px 60px -14px ${css(darken(pill, 0.2), 0.62 + 0.2 * glowK)}`,
        ].join(', '),
      }} />
      {/* 词列表：拍头跳变带竖向运动模糊，静置帧不挂滤镜 */}
      <SpeedBlur vx={0} vy={vy} amount={0.14} max={7} style={{ zIndex: 2 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 540 - ROW_H / 2 - START_IDX * ROW_H,
          transform: `translateY(${listY}px)`,
        }}>
          {WORDS.map((w, i) => {
            const isSel = i === selectedIdx;
            const d = Math.abs(i - listPos); // 离视口中心几行
            const op = isSel ? 1 : Math.max(0.06, 0.4 - 0.13 * Math.max(0, d - 1));
            const sc = isSel ? 1 : 1 - Math.min(0.12, 0.045 * d);
            return (
              <div key={w} style={{
                height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: FONT_SIZE, fontWeight: 700, letterSpacing: tracking(FONT_SIZE), lineHeight: 1,
                  color: isSel ? selInk : `rgba(255,255,255,${op.toFixed(3)})`,
                  transform: `scale(${sc.toFixed(4)})`, display: 'inline-block',
                }}>{w}</span>
              </div>
            );
          })}
        </div>
      </SpeedBlur>
      {/* 视口上下羽化：颜色跟 bgColor 实时同步，换场不穿帮 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 300, background: `linear-gradient(${bgColor}, ${css(bg, 0)})`, zIndex: 3 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: `linear-gradient(${css(bg, 0)}, ${bgColor})`, zIndex: 3 }} />
      <Vignette strength={0.42} inner={0.42} color="#050608" style={{ zIndex: 4 }} />
      <Grain opacity={0.09} blend="soft-light" style={{ zIndex: 5 }} />
    </AbsoluteFill>
  );
};
