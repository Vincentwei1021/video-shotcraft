// aurora-bloom-bg-flip — Aurora Bloom 极光升腾底色反转（motion-lab 定稿转原生 Remotion）
// 浅灰底从底部升起紫橙柔焦 blob，随后整个底色 0.35s 内压暗到近黑、blob 压成余晖；
// 文案同步 blur-out → 换句 blur-in（强调色→白收色），换句间留空档不 cross-fade。
// 文案为中性占位；blob/文字的紫橙是这个效果本体的光色（DEEPP 常量），落地时可整组换成项目色。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
//
// 质感升级：极光拆成"主紫 + 橙核 + 品红过渡 + 白色融边"四层、各自有相对漂移，橙核真正透出来；
// 反转瞬间 blob 组轻收（scale −6%）读作"被压成余晖"，暗场余晖靠品红过渡层保住色相不发灰；
// 亮场顶部柔光 / 暗场冷色天光让两种底色都不是死平；全程颗粒防大面积渐变色带。
// 文案：A 句静置期极缓推近（不死帧），blur-out 时随光上浮；B 句 blur-in 带 6px 上浮落位；
// 时间轴整体前移 ≈0.06，B 句收色在 t≈0.90 完成，尾段留 ≈0.5s 定稿静止（原版末字到片尾仍是紫色）。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { EASE, FONT as PF, Grain, Vignette } from '../../_fixtures/Polish';

export const AURORA_BLOOM_BG_FLIP_DURATION = 156; // 5200ms @30fps

// RGB 三元组插值 → CSS 颜色（effect.js 文件级共享 mix，此处内联）
const mix = (a: number[], b: number[], k: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
const DEEPP = [124, 92, 255]; // 效果本体光色（深紫）
const WHITE = [245, 245, 250];
const LIGHT = [236, 236, 236]; // 亮场底色
const DARK = [10, 10, 18]; // 暗场底色
const INK = [22, 23, 28]; // 亮场文字（带冷调的近黑）

// 占位文案（词数/字长贴近原片，逐词错相节奏依赖这个）
const WA = 'For many years'.split(' ');
const WB = 'everything changed'.split(' ');

// 时间轴（归一化 t）
const RISE: [number, number] = [0.04, 0.56]; // 极光升起
const FLIP: [number, number] = [0.57, 0.64]; // 底色反转 ≈0.36s（命门）
const A_OUT = 0.4; // A 句首词开始 blur-out（stagger 0.04、各 0.10）→ 0.58 收完
const B_IN = 0.7; // B 句首词 blur-in（stagger 0.05、各 0.11）；0.12 ≈ 0.6s 无字空档

export const AuroraBloomBgFlip: React.FC = () => {
  const t = useT();
  // blob 升起 + 放大
  const rise = seg(t, RISE[0], RISE[1], E.outCubic);
  const flip = seg(t, FLIP[0], FLIP[1], E.inOutQuad); // 快速压暗，故意只 ~0.35s
  // 反转时 blob 组轻收：压成余晖的"收"，带一点阻尼回弹（overshoot 读作被按下去又稳住）
  const squash = seg(t, FLIP[0], FLIP[1] + 0.06, EASE.overshoot);
  // 橙核 / 品红层的相对漂移（不同频、不同相，blob 内部有流动而不是整块升降）
  const drift = Math.sin(t * Math.PI * 2.2);
  const drift2 = Math.sin(t * Math.PI * 1.6 + 1.1);

  const blob = (style: React.CSSProperties, color: string, stop = 68): React.CSSProperties => ({
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(60px)',
    background: `radial-gradient(circle,${color} 0%,${color.replace(/[\d.]+\)$/, '0)')} ${stop}%)`,
    ...style,
  });

  return (
    <DesignStage bg={mix(LIGHT, DARK, flip)}>
      {/* 亮场顶部柔光（反转时收掉）+ 暗场冷色天光（反转后出现），两种底色都有方向光 */}
      <div
        style={{
          position: 'absolute', inset: 0, opacity: 1 - flip,
          background: 'radial-gradient(ellipse 70% 60% at 50% 8%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0, opacity: flip,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(70,72,120,0.22) 0%, rgba(70,72,120,0) 70%)',
        }}
      />
      {/* 柔焦 blob 组：整体 translateY 升起 + scale 放大，flip 后压成余晖 */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          transform: `translateY(${lerp(rise, 32, -6)}%) scale(${lerp(rise, 1, 1.25) * (1 - 0.06 * squash)})`,
          opacity: lerp(flip, 1, 0.4),
        }}
      >
        {/* 紫色主 blob */}
        <div style={blob({ left: '8%', bottom: '-45%', width: '90%', height: '85%' }, 'rgba(107,79,224,.85)')} />
        {/* 品红过渡层：紫与橙之间的中间色，避免两色硬拼出灰带 */}
        <div
          style={blob(
            { left: '22%', bottom: '-36%', width: '60%', height: '58%', transform: `translateX(${drift2 * 6}%)` },
            'rgba(176,86,170,.6)', 64,
          )}
        />
        {/* 橙色核心：横向慢漂，比主层略高，升起时先露头 */}
        <div
          style={blob(
            { left: '32%', bottom: '-18%', width: '44%', height: '46%', transform: `translateX(${drift * 8}%)` },
            'rgba(217,122,74,.9)', 66,
          )}
        />
        {/* 白色融边：暗场里收掉 */}
        <div
          style={{
            ...blob({ left: '-12%', bottom: '-40%', width: '64%', height: '60%' }, 'rgba(255,255,255,.8)', 62),
            opacity: 1 - flip,
          }}
        />
      </div>

      {/* 文案行：flex 居中，两句各自绝对定位（同点居中，互不占位） */}
      <div
        style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: PF.sans, fontWeight: 600, fontSize: 26, letterSpacing: '-0.022em',
        }}
      >
        {/* 文案 A：静置期极缓推近，blob 上升期逐词 blur-out（被光吞掉时随光上浮） */}
        <div style={{ position: 'absolute', transform: `scale(${lerp(seg(t, 0, A_OUT + 0.18, EASE.swift), 1, 1.035)})` }}>
          {WA.map((w, i) => {
            const out = seg(t, A_OUT + i * 0.04, A_OUT + 0.1 + i * 0.04, E.inQuad);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  margin: '0 .16em',
                  color: mix(INK, INK, 0), // 亮场文字色
                  opacity: 1 - out,
                  filter: out > 0.005 ? `blur(${out * 8}px)` : 'none',
                  transform: `translateY(${-out * 5}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        {/* 空档后文案 B：逐词 blur-in + 上浮落位 + 紫→白收色（落定瞬间转白 = 定稿） */}
        <div style={{ position: 'absolute' }}>
          {WB.map((w, i) => {
            const d0 = B_IN + i * 0.05;
            const a = seg(t, d0, d0 + 0.11, E.outQuint);
            const c = seg(t, d0 + 0.06, d0 + 0.15, E.outQuad);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  margin: '0 .16em',
                  opacity: a,
                  filter: a < 0.995 ? `blur(${(1 - a) * 8}px)` : 'none',
                  transform: `translateY(${(1 - a) * 6}px)`,
                  color: mix(DEEPP, WHITE, c),
                  // 收色前的紫字带一点自发光，转白后收掉
                  textShadow: `0 0 ${10 * (1 - c)}px rgba(124,92,255,${(0.45 * a * (1 - c)).toFixed(3)})`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </div>

      <Vignette strength={lerp(flip, 0.07, 0.55)} inner={0.45} color="#0c0c16" />
      <Grain opacity={lerp(flip, 0.05, 0.09)} blend="soft-light" scale={0.25} />
    </DesignStage>
  );
};
