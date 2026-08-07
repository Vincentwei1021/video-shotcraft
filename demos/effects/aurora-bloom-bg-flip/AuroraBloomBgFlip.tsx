// aurora-bloom-bg-flip — Aurora Bloom 极光升腾底色反转（motion-lab 定稿转原生 Remotion）
// 浅灰底从底部升起紫橙柔焦 blob，随后整个底色 0.35s 内压暗到近黑、blob 压成余晖；
// 文案同步 blur-out → 换句 blur-in（强调色→白收色），换句间留空档不 cross-fade。
// 文案为中性占位；blob/文字的紫橙是这个效果本体的光色（DEEPP 常量），落地时可整组换成项目色。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const AURORA_BLOOM_BG_FLIP_DURATION = 156; // 5200ms @30fps

// RGB 三元组插值 → CSS 颜色（effect.js 文件级共享 mix，此处内联）
const mix = (a: number[], b: number[], k: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
const DEEPP = [124, 92, 255]; // 效果本体光色（深紫）
const WHITE = [245, 245, 250];
const LIGHT = [236, 236, 236]; // 亮场底色
const DARK = [10, 10, 18]; // 暗场底色

// 占位文案（词数/字长贴近原片，逐词错相节奏依赖这个）
const WA = 'For many years'.split(' ');
const WB = 'everything changed'.split(' ');

const FONT = '600 26px -apple-system,system-ui,sans-serif';

export const AuroraBloomBgFlip: React.FC = () => {
  const t = useT();
  // blob 升起 + 放大
  const rise = seg(t, 0.04, 0.62, E.outCubic);
  const flip = seg(t, 0.63, 0.7, E.inOutQuad); // 快速压暗，故意只 ~0.35s

  return (
    <DesignStage bg={mix(LIGHT, DARK, flip)}>
      {/* 柔焦 blob 组：整体 translateY 升起 + scale 放大，flip 后压成余晖 */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          transform: `translateY(${lerp(rise, 32, -6)}%) scale(${lerp(rise, 1, 1.25)})`,
          opacity: lerp(flip, 1, 0.4),
        }}
      >
        {/* 紫色主 blob */}
        <div
          style={{
            position: 'absolute',
            borderRadius: '50%',
            filter: 'blur(60px)',
            left: '8%',
            bottom: '-45%',
            width: '90%',
            height: '85%',
            background: 'radial-gradient(circle,rgba(107,79,224,.85) 0%,rgba(107,79,224,0) 68%)',
          }}
        />
        {/* 橙色核心：横向慢漂 */}
        <div
          style={{
            position: 'absolute',
            borderRadius: '50%',
            filter: 'blur(60px)',
            left: '32%',
            bottom: '-32%',
            width: '44%',
            height: '46%',
            background: 'radial-gradient(circle,rgba(217,122,74,.9) 0%,rgba(217,122,74,0) 66%)',
            transform: `translateX(${Math.sin(t * Math.PI * 2.2) * 8}%)`,
          }}
        />
        {/* 白色融边：暗场里收掉 */}
        <div
          style={{
            position: 'absolute',
            borderRadius: '50%',
            filter: 'blur(60px)',
            left: '-12%',
            bottom: '-40%',
            width: '64%',
            height: '60%',
            background: 'radial-gradient(circle,rgba(255,255,255,.8) 0%,rgba(255,255,255,0) 62%)',
            opacity: 1 - flip,
          }}
        />
      </div>
      {/* 文案行：flex 居中，两句各自绝对定位（同点居中，互不占位） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: FONT,
        }}
      >
        {/* 文案 A：blob 上升期逐词 blur-out */}
        <div style={{ position: 'absolute' }}>
          {WA.map((w, i) => {
            const out = seg(t, 0.46 + i * 0.04, 0.56 + i * 0.04, E.inQuad);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  margin: '0 .18em',
                  color: '#1a1a1a',
                  opacity: 1 - out,
                  filter: `blur(${out * 8}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        {/* 空档后文案 B：逐词 blur-in + 紫→白收色 */}
        <div style={{ position: 'absolute' }}>
          {WB.map((w, i) => {
            const d0 = 0.76 + i * 0.06;
            const a = seg(t, d0, d0 + 0.11, E.outQuint);
            const c = seg(t, d0 + 0.1, d0 + 0.26, E.outQuad);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  margin: '0 .18em',
                  opacity: a,
                  filter: `blur(${(1 - a) * 8}px)`,
                  color: mix(DEEPP, WHITE, c),
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </DesignStage>
  );
};
