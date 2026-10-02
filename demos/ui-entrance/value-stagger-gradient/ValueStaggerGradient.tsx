// value-stagger-gradient — Value Stagger 数值梯度（motion-lab 定稿转原生 Remotion）
// stagger 不只错开时间，还把属性值在 N 个元素上铺成梯度：16 根柱入场时
// delay=stagger(时间)，同时高度/色相/模糊都是 stagger([from,to]) 的数值梯度；
// 第二拍换 from:'center'，脉冲幅度以中心为原点重新铺开。
// 设计坐标 480×270（DesignStage zoom 放大，按目标分辨率栅格化），参数表数值以此坐标系标定。
// 质感改版：
// - 柱子改用 height 生长（底部锚定）而非 scaleY，圆角不再被压扁；顶部受光高光 + 地面倒影 + 基线刻度；
// - 代码字幕做成语法着色的代码条（≥38px 输出字高），两拍之间上下交叉换句，不再硬切；
// - 柱群与代码条整体居中构图；带色相的深底 + 柱群下方柔光 + 暗角 + 颗粒（原生分辨率）。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { EASE, FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const VALUE_STAGGER_GRADIENT_DURATION = 150; // 5000ms @30fps

// 数值梯度 util（等价 stagger([a,b]) 的 value 模式）
const staggerVal = (i: number, n: number, a: number, b: number, ease?: (x: number) => number) => {
  let k = n <= 1 ? 0 : i / (n - 1);
  if (ease) k = ease(k);
  return lerp(k, a, b);
};

const N = 16;
const C = (N - 1) / 2;
const BARS = Array.from({ length: N }, (_, i) => ({
  i,
  hue: staggerVal(i, N, 200, 320), // 数值梯度：色相铺开
  hMax: staggerVal(i, N, 92, 32), // 数值梯度：高度 1→0.35
  distC: Math.abs(i - C) / C,
}));

const BASE_Y = 196; // 基线（设计 px）
const SWITCH = 0.52; // 两拍之间换代码句

// 语法着色片段：[文本, 颜色]
const KEY = '#9aa3bd';
const FN = '#c9b3ff';
const NUM = '#86d4ff';
const STR = '#f3b58c';
const PUN = '#5f6782';
type Tok = [string, string];
const LINE1: Tok[] = [
  ['scale', KEY], [': ', PUN], ['stagger', FN], ['([', PUN], ['1', NUM], [', ', PUN], ['0.35', NUM], ['])', PUN],
  ['   hue', KEY], [': ', PUN], ['stagger', FN], ['([', PUN], ['200', NUM], [', ', PUN], ['320', NUM], ['])', PUN],
];
const LINE2: Tok[] = [
  ['pulse', KEY], [': ', PUN], ['stagger', FN], ['([', PUN], ['.06', NUM], [', ', PUN], ['.42', NUM], ['], { ', PUN],
  ['from', KEY], [': ', PUN], ["'center'", STR], [' })', PUN],
];

const Code: React.FC<{ toks: Tok[]; style: React.CSSProperties }> = ({ toks, style }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', whiteSpace: 'pre', ...style }}>
    {toks.map(([s, c], k) => (
      <span key={k} style={{ color: c }}>{s}</span>
    ))}
  </div>
);

export const ValueStaggerGradient: React.FC = () => {
  const t = useT();
  // 代码条：入场淡入上浮；两拍间旧句上移淡出、新句自下而上替入（≈5f 交叉）
  const capIn = seg(t, 0.03, 0.12, EASE.out);
  const sw = seg(t, SWITCH - 0.018, SWITCH + 0.022, EASE.smooth);
  // 柱群下方的柔光随第一拍铺开、第二拍脉冲略增
  const pulseC = Math.sin(seg(t, 0.56, 0.74) * Math.PI);
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0e0f15 0%, #0a0b0f 100%)' }}>
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 46% 34% at 50% 66%, rgba(120,110,255,0.16), rgba(120,110,255,0) 70%)',
          opacity: 0.35 + 0.65 * seg(t, 0.06, 0.5) + pulseC * 0.3,
        }}
      />
      <DesignStage bg="transparent" raster="zoom">
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: FONT.mono }}>
          {/* 代码条 */}
          <div
            style={{
              position: 'absolute', left: '50%', top: 40, height: 22, width: 316, marginLeft: -158, borderRadius: 7,
              background: 'rgba(255,255,255,0.035)', boxShadow: 'inset 0 0 0 0.25px rgba(255,255,255,0.12), inset 0 0.25px 0 rgba(255,255,255,0.08)',
              overflow: 'hidden', opacity: capIn, transform: `translateY(${lerp(capIn, 4, 0).toFixed(3)}px)`,
            }}
          >
            <Code toks={LINE1} style={{ top: 5.6, fontSize: 9.5, lineHeight: '11px', opacity: 1 - sw, transform: `translateY(${(-sw * 12).toFixed(3)}px)` }} />
            <Code toks={LINE2} style={{ top: 5.6, fontSize: 9.5, lineHeight: '11px', opacity: sw, transform: `translateY(${((1 - sw) * 12).toFixed(3)}px)` }} />
          </div>
          {/* 基线 + 刻度 */}
          <div style={{ position: 'absolute', left: '7%', right: '7%', top: BASE_Y + 0.5, height: 0.3, background: 'rgba(255,255,255,0.12)', opacity: seg(t, 0.02, 0.1) }} />
          {BARS.map(({ i, hue, hMax, distC }) => {
            // 拍一：时间 stagger（linear from first）× 数值梯度（y/blur 同时铺开）
            const d = i * 0.02;
            const e = seg(t, 0.06 + d, 0.28 + d, E.outCubic);
            const y0 = staggerVal(i, N, 46, 14); // 位移量本身也是梯度
            const b0 = staggerVal(i, N, 8, 2); // 模糊量梯度
            // 拍二：from:'center' —— 波与幅度都以中心为原点铺开
            const w = seg(t, 0.56 + distC * 0.13, 0.74 + distC * 0.13);
            const pulse = Math.sin(w * Math.PI);
            const amp = lerp(1 - distC, 0.06, 0.42); // 幅度梯度：中心最大
            const h = hMax * e * (1 + pulse * amp);
            const x = `${8 + i * 5.4}%`;
            const blur = (1 - e) * b0;
            const bright = 1 + pulse * 0.55;
            const body = `linear-gradient(180deg, hsl(${hue},80%,70%) 0%, hsl(${hue},72%,56%) 45%, hsl(${hue},66%,40%) 100%)`;
            return (
              <React.Fragment key={i}>
                {/* 刻度 */}
                <div style={{ position: 'absolute', top: BASE_Y + 3, left: `${8 + i * 5.4 + 1.7}%`, width: 0.3, height: 2.5, background: 'rgba(255,255,255,0.18)', opacity: seg(t, 0.02, 0.1) }} />
                {/* 柱体（底部锚定，height 生长） */}
                <div
                  style={{
                    position: 'absolute',
                    top: BASE_Y - h,
                    left: x,
                    width: '3.4%',
                    height: h,
                    borderRadius: 4,
                    background: body,
                    boxShadow: `inset 0 0.5px 0 rgba(255,255,255,0.45), inset 0 0 0 0.25px rgba(255,255,255,0.10), 0 0 10px hsla(${hue},85%,58%,${(0.18 + pulse * 0.22).toFixed(3)})`,
                    opacity: e,
                    filter: `${blur > 0.02 ? `blur(${blur.toFixed(2)}px) ` : ''}brightness(${bright.toFixed(3)})`,
                    transform: `translateY(${((1 - e) * y0).toFixed(3)}px)`,
                    overflow: 'hidden',
                  }}
                >
                  {/* 左侧受光条 */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '34%', background: 'linear-gradient(90deg, rgba(255,255,255,0.16), rgba(255,255,255,0))' }} />
                </div>
                {/* 地面倒影：翻转、渐隐、略糊 */}
                <div
                  style={{
                    position: 'absolute',
                    top: BASE_Y + 1.5,
                    left: x,
                    width: '3.4%',
                    height: h * 0.45,
                    borderRadius: 4,
                    background: `linear-gradient(180deg, hsla(${hue},70%,52%,0.32), hsla(${hue},70%,40%,0))`,
                    opacity: e * 0.8,
                    filter: `blur(${(0.8 + blur).toFixed(2)}px) brightness(${bright.toFixed(3)})`,
                    transform: `translateY(${((1 - e) * y0 * 0.4).toFixed(3)}px)`,
                  }}
                />
              </React.Fragment>
            );
          })}
        </div>
      </DesignStage>
      <Vignette strength={0.5} color="#000000" inner={0.45} />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
