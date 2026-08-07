// radial-ripple-phone-chips — Radial Ripple Chips 同心波纹手机（motion-lab 定稿转原生 Remotion）
// 浅灰底同心圆多层错相呼吸如水波，中央手机 mockup 屏内 feed 缓慢自动滚动，
// 两侧白色 chip 先后 spring pop 入场并悬浮。配色是灰阶骨架 + 单一强调色
//（ACCENT 变量），落地时按项目品牌色替换。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const RADIAL_RIPPLE_PHONE_CHIPS_DURATION = 168; // 5600ms @30fps

// 模板强调色：实际使用时按项目品牌色替换这一个变量
const ACCENT_RGB = '122,134,153'; // = #7a8699，中性蓝灰做默认演示色
const SANS = '-apple-system,BlinkMacSystemFont,sans-serif';

// 同心圆（深灰→浅灰，从大到小叠放），phase 错相
const RCOL = ['#d7dbe1', '#e0e4e9', '#e8ebef', '#eef0f3'];
const RSZ = [560, 440, 320, 210];
const RINGS = RSZ.map((size, i) => ({ size, color: RCOL[i], phase: i * 1.7 }));

// feed 卡片骨架：渐变图占位 + 两条 rand 定宽的文字条（种子与 effect.js 一致）
const CARDS = Array.from({ length: 8 }, (_, i) => ({
  imgGrad: `linear-gradient(120deg,rgba(${ACCENT_RGB},${(0.5 - i * 0.04).toFixed(2)}),rgba(${ACCENT_RGB},${(0.8 - i * 0.05).toFixed(2)}))`,
  l1w: `${62 + rand(i) * 28}%`,
  l2w: `${34 + rand(i + 40) * 30}%`,
}));

export const RadialRipplePhoneChips: React.FC = () => {
  const t = useT();
  // chip 先后 pop：scale 0.8→1 过冲 + 淡入，随后轻浮动
  const chipStyle = (t0: number, ph: number): React.CSSProperties => {
    const p = seg(t, t0, t0 + 0.12, E.outBack);
    const fl = Math.sin(t * Math.PI * 2 * 2 + ph) * 3 * seg(t, t0 + 0.12, t0 + 0.3);
    return {
      opacity: seg(t, t0, t0 + 0.08),
      transform: `scale(${lerp(p, 0.8, 1)}) translateY(${fl}px)`,
    };
  };
  const chipBase: React.CSSProperties = {
    position: 'absolute',
    padding: '10px 18px',
    borderRadius: 999,
    background: '#fff',
    color: '#2c3038',
    font: `600 13px ${SANS}`,
    whiteSpace: 'nowrap',
    boxShadow: '0 10px 26px rgba(58,64,74,.22)',
  };
  return (
    <DesignStage bg="#f2f3f5">
      <div style={{ position: 'absolute', inset: 0, background: '#f2f3f5', overflow: 'hidden' }}>
        {/* 同心圆各层错相极缓呼吸 */}
        {RINGS.map(({ size, color, phase }, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: size,
              height: size,
              margin: `${-size / 2}px 0 0 ${-size / 2}px`,
              borderRadius: '50%',
              background: color,
              transform: `scale(${1 + 0.06 * Math.sin(t * Math.PI * 2 * 1.5 + phase)})`,
            }}
          />
        ))}

        {/* 手机 mockup：屏内 feed 缓慢自动滚动 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 132,
            height: 264,
            margin: '-132px 0 0 -66px',
            borderRadius: 22,
            background: '#1b1c22',
            padding: 7,
            // 原渲染无全局 border-box：132px 是内容宽，padding 外扩（Remotion 注入
            // 了 * { box-sizing:border-box }，这里显式还原 content-box 才对得上原片）
            boxSizing: 'content-box',
            boxShadow: '0 24px 50px rgba(58,64,74,.35)',
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16, background: '#fff', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                transform: `translateY(${-seg(t, 0.08, 0.98) * 150}px)`,
              }}
            >
              {CARDS.map(({ imgGrad, l1w, l2w }, i) => (
                <div key={i} style={{ position: 'relative', margin: '8px 8px 0', padding: 7, borderRadius: 8, background: '#f4f4f7' }}>
                  <div style={{ height: 34, borderRadius: 5, background: imgGrad }} />
                  <div style={{ marginTop: 6, height: 5, width: l1w, borderRadius: 3, background: '#c9cad3' }} />
                  <div style={{ marginTop: 4, height: 5, width: l2w, borderRadius: 3, background: '#dedfe6' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 两侧 chip：左先右后 spring pop */}
        <div style={{ ...chipBase, top: '38%', right: 'calc(50% + 86px)', ...chipStyle(0.22, 0) }}>Feature one</div>
        <div style={{ ...chipBase, top: '56%', left: 'calc(50% + 86px)', ...chipStyle(0.4, 1.8) }}>Feature detail</div>
      </div>
    </DesignStage>
  );
};
