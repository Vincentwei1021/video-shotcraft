// aurora-bloom-bg-flip — 极光升腾 · 底色反转
//
// 第二轮重设计（北境极光 · 雾白 → 极夜，自定义配色）：
// - 光色整组换成真实极光的青绿 / 冷青 / 紫（不是紫橙）：雾白底上从画框底部升起青绿 + 紫的柔焦光团，
//   酝酿 3s；随后 11f（≈0.37s）内整个底色从 #e9edf0 压到带蓝相的极夜 #05080e —— 全片重音。
//   反转瞬间光团组轻收 6%（overshoot）压成余晖，白色融边层同步收掉；
//   暗场里同时"显影"出一排极光帘幕（18 条竖向渐变光带，沿正弦带状排布、各自缓慢摆动与明灭）和细碎星点，
//   让反转后的画面不是"变黑了"而是"天黑了、极光出来了"。
// - 文案改成真正的转折句，字号拉到 92 / 140px：
//   A「For years, forecasts were guesses.」开场逐词 blur-in → 酝酿期极缓推近 → 逐词 blur-out（inQuad，被光吞掉）；
//   空档 ≈0.9s 无字（含 11f 反转，不 cross-fade）；B「See it coming.」逐词 outQuint blur-in + 上浮，
//   落定后由极光青收色成白（定稿信号），最后一行品牌落款字距收拢浮现。
// - 光团全部用径向渐变本身的软边（不用整屏 filter: blur），极光帘幕用渐变 + 遮罩，渲染开销可控。
//
// 时间表（30fps，共 172f）：
//   0–14    A 句逐词浮现；光团已在画框底部露头
//   6–96    极光升起（outCubic，translateY 34%→−6% + scale 1→1.25），A 句 1→1.035 极缓推近
//   62–92   A 句逐词 blur-out（stagger 4f、各 14f、inQuad）
//   96–107  底色反转（11f，inOutQuad）+ 光团组轻收；帘幕与星点显影（104–134）
//   92–118  无字空档（含 96–107 的反转）
//   118–146 B 句逐词 blur-in（stagger 6f、各 16f），每词落定后 10f 内青→白
//   140–156 品牌落款浮现
//   156–172 hold：帘幕摆动、星点明灭
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, ramp } from '../../_fixtures/Polish';
import { TextReveal } from '../../_fixtures/Look';

export const AURORA_BLOOM_BG_FLIP_DURATION = 172;

// ── 自定义配色（custom：极光本体光色）──
const LIGHT = [233, 237, 240]; // 雾白
const DARK = [5, 8, 14]; // 极夜（带蓝相，不是纯黑）
const INK = [18, 24, 30];
const AURORA = [93, 255, 196]; // 极光青绿（B 句收色前的字色）
const WHITE = [244, 248, 250];
const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixRGB = (a: number[], b: number[], k: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;

const RISE0 = 6, RISE1 = 96;
const FLIP0 = 96, FLIP1 = 107; // 命门：≈0.37s
const A_OUT = 62;
const B_IN = 118;
const WA = 'For years, forecasts were guesses.'.split(' ');
const WB = 'See it coming.'.split(' ');

const inOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const inQuad = (t: number) => t * t;
const outQuint = (t: number) => 1 - Math.pow(1 - t, 5);

const hash = (n: number) => {
  const x = Math.sin(n * 91.345 + 47.853) * 43758.5453;
  return x - Math.floor(x);
};
const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: hash(i) * 1920, y: hash(i + 100) * 560, s: 1.2 + hash(i + 200) * 2.2, ph: hash(i + 300) * 6.28, sp: 9 + hash(i + 400) * 14,
}));

// 柔光团：径向渐变自带软边（色心 → 透明），不用 filter
const blob = (left: string, bottom: string, w: string, h: string, c: number[], a: number, extra?: React.CSSProperties): React.CSSProperties => ({
  position: 'absolute', left, bottom, width: w, height: h, borderRadius: '50%',
  background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${rgba(c, a)} 0%, ${rgba(c, a * 0.55)} 34%, ${rgba(c, 0)} 70%)`,
  ...extra,
});

export const AuroraBloomBgFlip: React.FC = () => {
  const f = useCurrentFrame();
  const rise = ramp(f, RISE0, RISE1 - RISE0, outCubic);
  const flip = ramp(f, FLIP0, FLIP1 - FLIP0, inOutQuad);
  const squash = ramp(f, FLIP0, FLIP1 - FLIP0 + 10, EASE.overshoot);
  const night = ramp(f, FLIP1 - 3, 30, EASE.out); // 帘幕 / 星点显影：底色压到位后才"天黑了、极光出来了"
  const drift = Math.sin(f / 30);
  const drift2 = Math.sin(f / 23 + 1.1);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans, background: mixRGB(LIGHT, DARK, flip) }}>
      {/* 亮场顶部天光（反转时收掉）/ 暗场深蓝天顶（反转后出现） */}
      <div style={{ position: 'absolute', inset: 0, opacity: 1 - flip, background: 'radial-gradient(ellipse 70% 60% at 50% 4%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: flip, background: 'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(30,52,96,0.55) 0%, rgba(30,52,96,0) 70%)' }} />

      {/* 星点：反转后显影、各自明灭 */}
      {night > 0 && STARS.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: s.x, top: s.y, width: s.s, height: s.s, borderRadius: '50%', background: '#e8f4ff',
          opacity: night * (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(f / s.sp + s.ph))) * (1 - s.y / 700),
        }} />
      ))}

      {/* 极光帘幕：18 条竖向光带沿正弦带排布，紫顶 → 青绿身 → 透明脚；各自摆动、明灭 */}
      {night > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: night * 0.9, mixBlendMode: 'screen' }}>
          {Array.from({ length: 18 }, (_, i) => {
            const x = -60 + i * 116 + 30 * Math.sin(i * 0.8 + f / 45);
            const top = 150 + 90 * Math.sin(i * 0.42 + 0.6) + 14 * Math.sin(f / 37 + i);
            const h = 520 + 160 * Math.sin(i * 0.9 + 2);
            const flick = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(f / 11 + i * 1.7)) * (0.6 + 0.4 * Math.sin(i * 2.3));
            const skew = `skewX(${(10 * Math.sin(f / 40 + i * 0.6)).toFixed(2)}deg)`;
            return (
              <React.Fragment key={i}>
              <div style={{
                position: 'absolute', left: x, top, width: 220, height: h, opacity: flick,
                transform: skew,
                background: 'linear-gradient(180deg, rgba(150,90,255,0) 0%, rgba(150,90,255,0.45) 16%, rgba(70,240,190,0.75) 48%, rgba(40,200,170,0.25) 78%, rgba(40,200,170,0) 100%)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 45%, #000 55%, transparent 100%)',
                maskImage: 'linear-gradient(90deg, transparent 0%, #000 45%, #000 55%, transparent 100%)',
              }} />
              {/* 帘幕亮芯：更窄、更亮，给光带一条清晰的"褶" */}
              <div style={{
                position: 'absolute', left: x + 80 + 12 * Math.sin(f / 19 + i), top: top + h * 0.12, width: 60, height: h * 0.7,
                opacity: flick * (0.5 + 0.5 * Math.sin(f / 14 + i * 2.1)), transform: skew,
                background: 'linear-gradient(180deg, rgba(180,140,255,0) 0%, rgba(160,255,220,0.75) 40%, rgba(80,240,190,0.4) 70%, rgba(80,240,190,0) 100%)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 50%, transparent 100%)',
                maskImage: 'linear-gradient(90deg, transparent 0%, #000 50%, transparent 100%)',
              }} />
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* 柔焦光团组：整体升起 + 放大；反转后压成余晖（opacity 1→0.4，轻收 6%） */}
      <div style={{
        position: 'absolute', inset: '-10%',
        transform: `translateY(${(34 + (-6 - 34) * rise).toFixed(3)}%) scale(${((1 + 0.25 * rise) * (1 - 0.06 * squash)).toFixed(4)})`,
        opacity: 1 - 0.6 * flip,
      }}>
        {/* 主层：极光青绿 */}
        <div style={blob('-2%', '-34%', '104%', '104%', [46, 214, 160], 0.9)} />
        {/* 过渡层：冷青（青绿与紫之间，防两色硬拼出灰带） */}
        <div style={blob('14%', '-24%', '72%', '76%', [56, 180, 230], 0.65, { transform: `translateX(${(drift2 * 6).toFixed(2)}%)` })} />
        {/* 紫色核：横向慢漂，比主层略高，升起时先露头 */}
        <div style={blob('28%', '-6%', '50%', '58%', [132, 92, 255], 0.8, { transform: `translateX(${(drift * 8).toFixed(2)}%)` })} />
        {/* 白色融边：只在亮场成立，反转时收掉 */}
        <div style={{ ...blob('-14%', '-40%', '66%', '62%', [255, 255, 255], 0.85), opacity: 1 - flip }} />
      </div>

      {/* 文案 A：开场逐词浮现 → 极缓推近 → 逐词 blur-out */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          fontSize: 92, fontWeight: 560, letterSpacing: '-0.035em', color: mixRGB(INK, INK, 0), whiteSpace: 'nowrap',
          transform: `scale(${(1 + 0.035 * ramp(f, 0, A_OUT + 20, EASE.swift)).toFixed(4)})`,
        }}>
          {WA.map((w, i) => {
            const inn = ramp(f, i * 2.5, 14, EASE.snappy);
            const out = ramp(f, A_OUT + i * 4, 14, inQuad);
            if (out >= 1) return <span key={i} style={{ display: 'inline-block', margin: '0 0.13em', opacity: 0 }}>{w}</span>;
            return (
              <span key={i} style={{
                display: 'inline-block', margin: '0 0.13em', opacity: inn * (1 - out),
                filter: (1 - inn) * 12 + out * 14 > 0.1 ? `blur(${((1 - inn) * 12 + out * 14).toFixed(2)}px)` : undefined,
                transform: `translateY(${((1 - inn) * 18 - out * 22).toFixed(2)}px)`,
              }}>{w}</span>
            );
          })}
        </div>
      </div>

      {/* 文案 B：空档后逐词 blur-in + 上浮，落定后青→白收色；下方品牌落款 */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 140, fontWeight: 720, letterSpacing: '-0.045em', whiteSpace: 'nowrap', lineHeight: 1, marginTop: 96 }}>
          {WB.map((w, i) => {
            const d0 = B_IN + i * 6;
            const a = ramp(f, d0, 16, outQuint);
            const c = ramp(f, d0 + 9, 10, EASE.out);
            return (
              <span key={i} style={{
                display: 'inline-block', margin: '0 0.12em', opacity: a,
                filter: a > 0 && a < 0.995 ? `blur(${((1 - a) * 16).toFixed(2)}px)` : undefined,
                transform: `translateY(${((1 - a) * 24).toFixed(2)}px)`,
                color: mixRGB(AURORA, WHITE, c),
                textShadow: `0 0 ${(30 * (1 - c) + 8).toFixed(1)}px ${rgba(AURORA, 0.5 * a * (1 - c) + 0.08 * a)}`,
              }}>{w}</span>
            );
          })}
        </div>
        <div style={{ height: 40, marginTop: 56, whiteSpace: 'nowrap' }}>
          {f >= 140 && (
            <TextReveal
              text="BOREAL · LIVE SKY FORECASTS" by="char" variant="track" start={140} each={16} gap={0.25}
              style={{ fontSize: 30, fontWeight: 600, letterSpacing: '0.32em', color: rgba([180, 230, 215], 0.85) }}
            />
          )}
        </div>
      </div>

      <Vignette strength={0.14 * (1 - flip)} inner={0.45} color="#7d8894" />
      <Vignette strength={0.55 * flip} inner={0.42} color="#02040a" />
      <Grain opacity={0.05 + 0.05 * flip} blend="soft-light" />
    </div>
  );
};
