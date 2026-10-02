// neon-triple-marquee —— clickup-30 61–64.5s
// 三行霓虹描边巨字 BETTER/FASTER/STRONGER 满屏排布，
// 奇偶行反向匀速无限滚动（marquee 允许 linear），
// 三行明暗轮流脉冲（一行亮时其余压暗），结尾整组淡出。
// 质感升级：灯管两层结构——外层彩色玻璃管（常亮的暗态）+ 内层近白"热芯"只在通电时亮，
// 读作真霓虹而不是彩色描边；亮行把同色光溢到身后墙面（一条随亮度呼吸的色带）；
// 词距按字体实测宽度排（canvas measureText），每个词与分隔点等距；
// 开场 10f 是确定性的通电闪烁，结尾 20f 先断电降亮再整组淡出。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, Grain, Vignette, ramp } from '../../_fixtures/Polish';

export const NEON_TRIPLE_MARQUEE_DURATION = 150; // 10f 淡入 + 循环体 + 20f 淡出

const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const FONT_SIZE = 300;
const GAP = FONT_SIZE * 0.42; // 词与分隔点之间的间隔

// 实测文本宽度（浏览器 canvas，同字体同字号，确定性）；无 DOM 时退回保守估宽
const widthCache = new Map<string, number>();
const measure = (text: string, size: number) => {
  const key = `${text}|${size}`;
  const hit = widthCache.get(key);
  if (hit !== undefined) return hit;
  let w = text.length * size * 0.92;
  if (typeof document !== 'undefined') {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = `900 ${size}px ${FONT}`;
      w = ctx.measureText(text).width + Math.max(0, text.length - 1) * 2; // letterSpacing 2px
    }
  }
  widthCache.set(key, w);
  return w;
};

// 开场通电闪烁：前 10f 的亮度门（确定性序列），之后恒为 1
const FLICKER = [0, 0.55, 0.1, 0.0, 0.8, 0.35, 0.95, 0.7, 1, 1];

// 单行 marquee：副本按实测 unitW 等距绝对定位，平移取模 → 回绕无缝。
const MarqueeRow: React.FC<{
  word: string;
  color: string;
  core: string; // 通电热芯色（同色相的近白）
  dir: 1 | -1;
  speed: number; // px/frame
  frame: number;
  y: number;
  brightness: number; // 0..1 脉冲亮度
  power: number; // 0..1 整组供电（通电闪烁 / 断电）
}> = ({ word, color, core, dir, speed, frame, y, brightness, power }) => {
  const wordW = measure(word, FONT_SIZE);
  const dotW = measure('•', FONT_SIZE);
  const unitW = wordW + GAP + dotW + GAP; // 词 + 间隔 + 分隔点 + 间隔
  const copies = Math.ceil(1920 / unitW) + 3;
  const offsetRaw = (frame * speed) % unitW;
  const offset = dir === 1 ? -unitW * 1.5 + offsetRaw : -unitW * 0.5 - offsetRaw;
  const b = brightness * power;

  const base: React.CSSProperties = {
    position: 'absolute',
    top: y,
    left: 0,
    width: '100%',
    height: FONT_SIZE * 1.1,
    transform: `translateX(${offset.toFixed(2)}px)`,
    fontFamily: FONT,
    fontWeight: 900,
    fontSize: FONT_SIZE,
    letterSpacing: 2,
    lineHeight: 1,
    color: 'transparent',
  };
  const text = Array.from({ length: copies }).map((_, i) => (
    <span key={i} style={{ position: 'absolute', left: i * unitW, top: 0, whiteSpace: 'nowrap' }}>
      {word}
      <span style={{ position: 'absolute', left: wordW + GAP }}>{'•'}</span>
    </span>
  ));

  return (
    <>
      {/* 外层玻璃管：彩色描边，暗态 0.35 常亮，通电时加粗并带双层辉光 */}
      <div
        style={{
          ...base,
          WebkitTextStroke: `${(5 + b * 3).toFixed(2)}px ${color}`,
          opacity: (0.35 + b * 0.65) * (0.25 + 0.75 * power),
          filter: `drop-shadow(0 0 ${(8 + b * 22).toFixed(1)}px ${color}) drop-shadow(0 0 ${(20 + b * 50).toFixed(1)}px ${color})`,
        }}
      >
        {text}
      </div>
      {/* 内层热芯：近白细线，只在通电时亮——这是"霓虹"而不是"彩色描边"的关键 */}
      {b > 0.02 && (
        <div style={{ ...base, WebkitTextStroke: `${(1.2 + b * 1.4).toFixed(2)}px ${core}`, opacity: Math.min(1, b * 1.15) }}>
          {text}
        </div>
      )}
    </>
  );
};

export const NeonTripleMarquee: React.FC = () => {
  const f = useCurrentFrame();

  // 三行轮流脉冲：周期 45 帧，每行占 1/3 相位，余弦软脉冲
  const pulse = (idx: number) => {
    const period = 45;
    const phase = (((f - idx * (period / 3)) % period) + period) % period;
    const t = phase / period;
    if (t < 1 / 3) return 0.5 - 0.5 * Math.cos(t * 3 * Math.PI * 2);
    return 0;
  };

  // 供电：0–10f 通电闪烁；128–140f 断电降亮（ease-in）
  const powerOn = f < FLICKER.length ? FLICKER[Math.max(0, Math.floor(f))] : 1;
  const powerOff = 1 - 0.6 * ramp(f, 128, 12, EASE.exit);
  const power = powerOn * powerOff;
  // 整组淡入 + 结尾整组淡出（入 10f / 出 20f）
  const groupOpacity = ramp(f, 0, 10, EASE.out) * (1 - ramp(f, 128, 20, EASE.exit));

  const rows: { word: string; color: string; core: string; dir: 1 | -1; speed: number }[] = [
    { word: 'BETTER', color: '#4d9fff', core: '#e6f1ff', dir: 1, speed: 14 },
    { word: 'FASTER', color: '#ff4dd2', core: '#ffe8f8', dir: -1, speed: 17 },
    { word: 'STRONGER', color: '#ffb347', core: '#fff4e2', dir: 1, speed: 14 },
  ];
  const ROW_Y = (i: number) => 40 + i * 350;

  return (
    <AbsoluteFill style={{ background: '#07060b', overflow: 'hidden' }}>
      {/* 墙面：极暗的冷紫纵向渐变（不是死平的黑） */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0b0a12 0%, #07060b 55%, #050408 100%)' }} />
      <div style={{ opacity: groupOpacity, position: 'absolute', inset: 0 }}>
        {/* 墙面溢光：亮行身后一条同色柔光带，随亮度呼吸 */}
        {rows.map((r, i) => {
          const b = pulse(i) * power;
          return (
            <div
              key={`spill-${r.word}`}
              style={{
                position: 'absolute', left: -300, right: -300, top: ROW_Y(i) - 260, height: FONT_SIZE + 520,
                background: `radial-gradient(ellipse 55% 46% at 50% 50%, ${r.color} 0%, rgba(0,0,0,0) 72%)`,
                opacity: 0.03 + b * 0.085,
              }}
            />
          );
        })}
        {rows.map((r, i) => (
          <MarqueeRow
            key={r.word}
            word={r.word}
            color={r.color}
            core={r.core}
            dir={r.dir}
            speed={r.speed}
            frame={f}
            y={ROW_Y(i)}
            brightness={pulse(i)}
            power={power}
          />
        ))}
      </div>
      <Vignette strength={0.6} inner={0.38} color="#000000" />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
