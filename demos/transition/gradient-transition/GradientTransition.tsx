// gradient-transition — Gradient Transition 渐变过渡（motion-lab 定稿转原生 Remotion）
// 背景在三类 CSS 渐变之间平滑过渡：linear 段插值角度+色标，radial 段插值中心+半径，
// conic 段旋转彩虹；等价"解析 gradient 字符串逐参数插值"的配方，中央 pill 标注当前段。
// 设计坐标 480×270（DesignStage 等比放大，raster="zoom" 让 pill 文字按成片尺寸栅格化），
// 参数表数值以此坐标系标定。
// 质感层：linear 段叠一处缓慢游走的柔光斑，避免两色标的死平；radial 段修正了无效的
// `circle <百分比>` 半径写法（原版整段渲成纯黑）；conic 段压一档饱和度 + 轻度虚化抹掉色环
// 中心的尖点与色带；全片暗角 + 颗粒防 h264 色带。pill 改成玻璃质感、随层交叉淡化换字，
// 并实时读出正在插值的参数（角度 / 半径 / 起始角）。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const GRADIENT_TRANSITION_DURATION = 180; // 6000ms @30fps

const hsl = (h: number, s: number, l: number) => `hsl(${h},${s}%,${l}%)`;
type H3 = [number, number, number];
// hsl 三元组按分量插值
const mixH = (a: H3, b: H3, k: number): H3 => [lerp(k, a[0], b[0]), lerp(k, a[1], b[1]), lerp(k, a[2], b[2])];

const layerStyle = (background: string, opacity: number, extra?: React.CSSProperties): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  background,
  opacity,
  ...extra,
});

// radial 半径：参数表的 45%→85% 按设计稿宽 480 的 ~83%（=400px）为 100% 换算成 px
// （CSS 的 circle 半径只接受长度，百分比整条渐变失效）
const R_BASE = 400;

export const GradientTransition: React.FC = () => {
  const t = useT();

  // Phase 1: linear —— 角度 40°→230°，两组色标 hsl 插值
  const p1 = seg(t, 0, 0.4, E.inOutQuad);
  const ang = lerp(p1, 40, 230);
  const l1c1 = mixH([340, 88, 60], [160, 78, 52], p1);
  const l1c2 = mixH([265, 80, 52], [205, 92, 58], p1);
  const bg1 = `linear-gradient(${ang}deg, ${hsl(...l1c1)}, ${hsl(...l1c2)})`;
  // 柔光斑：沿与渐变角相反的方向缓慢游走（受光点，不抢色）
  const gx = 30 + 40 * p1, gy = 24 + 30 * Math.sin(p1 * Math.PI);
  const glow1 = `radial-gradient(ellipse 60% 70% at ${gx}% ${gy}%, rgba(255,255,255,0.22), rgba(255,255,255,0) 70%)`;

  // Phase 2: radial —— 中心 (28%,66%)→(72%,32%)，半径 45%→85%
  const p2 = seg(t, 0.33, 0.7, E.inOutQuad);
  const cx = lerp(p2, 28, 72), cy = lerp(p2, 66, 32), rr = lerp(p2, 45, 85);
  const l2c1 = mixH([45, 95, 62], [285, 85, 58], p2);
  const l2c2 = mixH([220, 60, 14], [230, 55, 10], p2);
  const rpx = (rr / 100) * R_BASE;
  const bg2 = `radial-gradient(circle ${rpx.toFixed(1)}px at ${cx}% ${cy}%, ${hsl(...l2c1)} 0%, ` +
    `${hsl(l2c1[0], l2c1[1] * 0.9, l2c1[2] * 0.62)} 34%, ${hsl(...l2c2)} 100%)`;

  // Phase 3: conic —— from 角度旋转的彩虹环（首尾同色可无缝循环）；饱和度压到 72–76%
  const p3 = seg(t, 0.66, 1, E.inOutQuad);
  const from = p3 * 300;
  const bg3 = `conic-gradient(from ${from}deg at 50% 50%,
    hsl(0,76%,60%), hsl(60,76%,62%), hsl(120,66%,55%), hsl(180,72%,55%),
    hsl(240,76%,63%), hsl(300,74%,61%), hsl(0,76%,60%))`;

  // 三层交叉淡化权重（同一组权重驱动 pill 换字）
  const w1 = 1 - seg(t, 0.3, 0.38);
  const w2 = seg(t, 0.3, 0.38) - seg(t, 0.63, 0.71);
  const w3 = seg(t, 0.63, 0.71);
  const labels: [string, string, number][] = [
    ['LINEAR', `${Math.round(ang)}°`, w1],
    ['RADIAL', `r ${Math.round(rr)}%`, w2],
    ['CONIC', `${Math.round(from)}°`, w3],
  ];

  return (
    <AbsoluteFill style={{ background: '#0a0b10' }}>
      <DesignStage bg="#0a0b10" raster="zoom">
        {/* 三层渐变依次交叉淡入淡出 */}
        <div style={layerStyle(bg1, w1)}>
          <div style={layerStyle(glow1, 1)} />
        </div>
        <div style={layerStyle(bg2, w2)} />
        {/* conic 层外扩 12px 再虚化：抹掉色环中心尖点与相邻色标间的硬带，边缘不露黑 */}
        <div style={layerStyle(bg3, w3, { inset: -12, filter: 'blur(5px)' })}>
          <div style={layerStyle('radial-gradient(circle 120px at 50% 50%, rgba(255,255,255,0.16), rgba(255,255,255,0) 100%)', 1)} />
        </div>
        {/* 中央玻璃 pill：标注当前渐变类型 + 正在插值的参数 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 128,
            height: 30,
            borderRadius: 999,
            background: 'linear-gradient(180deg, rgba(14,15,22,0.5), rgba(8,9,14,0.62))',
            boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.22), inset 0 0.5px 0 rgba(255,255,255,0.3), 0 6px 18px -6px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
            fontFamily: FONT.sans,
          }}
        >
          {labels.map(([name, val, wl]) => {
            // 换字不叠影：出场字在权重过半前淡完、入场字过半后才出现
            const w = Math.min(1, Math.max(0, (wl - 0.5) * 2.5));
            return w > 0.01 ? (
              <div key={name} style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: w, transform: `translateY(${((1 - w) * 3).toFixed(2)}px)`,
              }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.2em', color: '#fff' }}>{name}</span>
                <span style={{ width: 0.5, height: 10, background: 'rgba(255,255,255,0.3)' }} />
                <span style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,0.72)', fontVariantNumeric: 'tabular-nums', minWidth: 30 }}>{val}</span>
              </div>
            ) : null;
          })}
        </div>
      </DesignStage>
      <Vignette strength={0.3} inner={0.5} color="#05060a" />
      <Grain opacity={0.06} blend="soft-light" />
    </AbsoluteFill>
  );
};
