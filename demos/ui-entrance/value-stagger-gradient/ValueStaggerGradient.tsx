// value-stagger-gradient — Value Stagger 数值梯度（motion-lab 定稿转原生 Remotion）
// stagger 不只错开时间，还把属性值在 N 个元素上铺成梯度：16 根柱入场时
// delay=stagger(时间)，同时高度/色相/模糊都是 stagger([from,to]) 的数值梯度；
// 第二拍换 from:'center'，脉冲幅度以中心为原点重新铺开。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

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

export const ValueStaggerGradient: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#0a0b10">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0a0b10',
          overflow: 'hidden',
          fontFamily: '"SF Mono",Menlo,monospace',
        }}
      >
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
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: 'absolute',
                  bottom: '22%',
                  left: `${8 + i * 5.4}%`,
                  width: '3.4%',
                  height: hMax,
                  borderRadius: 5,
                  transformOrigin: '50% 100%',
                  background: `linear-gradient(180deg,hsl(${hue},85%,66%),hsl(${hue},70%,42%))`,
                  boxShadow: `0 0 12px hsla(${hue},85%,58%,.25)`,
                  opacity: e,
                  filter: `blur(${(1 - e) * b0}px) brightness(${1 + pulse * 0.55})`,
                  transform: `translateY(${(1 - e) * y0}px) scaleY(${e * (1 + pulse * amp)})`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '17%',
                  left: `${8 + i * 5.4 + 1.2}%`,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: `hsl(${hue},70%,55%)`,
                  opacity: 0.35,
                }}
              />
            </React.Fragment>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '9%',
            transform: 'translateX(-50%)',
            color: '#5b6480',
            fontSize: 10,
            letterSpacing: '1.5px',
            whiteSpace: 'nowrap',
            opacity: 0.5 + 0.5 * seg(t, 0.04, 0.12),
          }}
        >
          {t < 0.52
            ? 'scale: stagger([1, 0.35])  hue: stagger([200, 320])'
            : "pulse: stagger([.06, .42], { from: 'center' })"}
        </div>
      </div>
    </DesignStage>
  );
};
