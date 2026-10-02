// counter-confetti — Counter Confetti 数字冲刺纸屑（motion-lab 定稿转原生 Remotion）
// 大数字 0 → 1000 用 easeOutQuart 冲刺，scale 走 [0.2,1.3,1.3,1] 过冲；数字到位前
// 5 帧就从两侧 burst 出 8 色纸屑，带重力下落与自转飘散。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
//
// 质感升级：背景换带色相的深蓝黑 + 地平柔光 + 暗角 + 颗粒；数字 tabular-nums 不抖、计数快段按速度
// 纵向虚化（数字在"滚"），落定后清晰；纸屑从平面色块升级为"真纸片"：线性空气阻力（上抛顶点更低、
// 下落趋于终速）、绕自身轴翻转（宽度随 cos 压扁、背面变暗）、下落时左右飘摆；调色板降一档饱和度
// 但保留 8 色演出彩纸；冲击环改为细亮环 + 外圈柔光两层、边宽随扩散变细，到位瞬间数字后一记柔闪。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const COUNTER_CONFETTI_DURATION = 138; // 4600ms @30fps

// 演出彩纸 8 色：保持多色，饱和度降一档（不再是荧光彩虹）
const PAL = ['#ff7a93', '#ffb057', '#ffd966', '#7fe0a8', '#6fd0f2', '#7f96ff', '#b48cff', '#f39ad8'];
const BURST = 0.52; // 计数到位(0.56)前"抢拍"
const DRAG = 0.5; // 线性空气阻力系数（1/s）：横向行程约为无阻力的 77%，仍能冲进画面中部

// 52 片纸屑的静态参数（种子与 effect.js 一致，确定性可复现）
const BITS = Array.from({ length: 52 }, (_, i) => {
  const isRect = rand(i * 3) > 0.4;
  const w = 5 + rand(i + 2) * 6;
  const h = isRect ? 8 + rand(i + 5) * 7 : w * 0.72; // 圆片做成小亮片，别像波点
  const side = i % 2 ? 1 : -1;
  return {
    w: isRect ? w : w * 0.72,
    h,
    isRect,
    color: PAL[i % 8],
    x0: side * 250, // 从画面两侧出发（px，相对中心）
    y0: (rand(i + 30) - 0.5) * 60,
    vx: -side * (150 + rand(i * 5 + 1) * 300), // 向画面中间冲
    vy: -(230 + rand(i * 7 + 3) * 220),
    g: 900 + rand(i + 60) * 520,
    spin: (rand(i + 90) - 0.5) * 1500,
    flip: 5 + rand(i + 150) * 9, // 翻转角速度（rad/s）
    sway: 6 + rand(i + 170) * 10, // 下落飘摆幅度（px）
    phase: rand(i + 190) * 6.28,
    d: rand(i + 120) * 0.06, // 每片略微错峰
    // 景深：约 30% 远景（小、暗、微虚）/ 约 18% 近景（大、明显虚焦，从镜头前掠过）/ 其余在焦平面
    depth: rand(i + 210) < 0.3 ? 0 : rand(i + 210) > 0.82 ? 2 : 1,
  };
});

// 带线性阻力的抛体：x = x0 + vx(1-e^{-kt})/k；y = y0 + (g/k)t + (vy - g/k)(1-e^{-kt})/k
const ballistic = (p0: number, v0: number, g: number, t: number) => {
  const e = (1 - Math.exp(-DRAG * t)) / DRAG;
  return p0 + (g / DRAG) * t + (v0 - g / DRAG) * e;
};

export const CounterConfetti: React.FC = () => {
  const t = useT();
  // 计数：easeOutQuart 冲刺
  const p = seg(t, 0.06, 0.56, E.outQuart);
  const val = Math.round(p * 1000);
  // 计数速度（每帧数值增量）→ 纵向"滚动"虚化，到位后归零
  const dp = (seg(t + 0.004, 0.06, 0.56, E.outQuart) - seg(t - 0.004, 0.06, 0.56, E.outQuart)) / 0.008; // 1/t
  const rollBlur = Math.min(1.6, dp * 0.42);
  // scale 过冲 [0.2,1.3,1.3,1]
  const s1 = seg(t, 0.06, 0.3, E.outCubic);
  const s2 = seg(t, 0.56, 0.72, E.outBack);
  const sc = lerp(s1, 0.2, 1.3) + s2 * (1 - 1.3);
  // 到位冲击环 + 数字后柔闪
  const rp = seg(t, 0.545, 0.75, E.outQuart);
  const flash = seg(t, 0.55, 0.57, E.outCubic) * (1 - seg(t, 0.57, 0.7, E.outCubic));
  const labelP = seg(t, 0.62, 0.82, E.outCubic);
  return (
    <AbsoluteFill style={{ background: '#080a12' }}>
      <DesignStage raster="zoom" bg="radial-gradient(90% 80% at 50% 42%,#1a1f33 0%,#0d1020 48%,#070810 100%)">
        {/* 地平柔光：画面下方一条很淡的冷色光带，给深色背景一点空间感 */}
        <div
          style={{
            position: 'absolute',
            left: -40,
            right: -40,
            top: 150,
            height: 160,
            background: 'radial-gradient(50% 40% at 50% 50%, rgba(110,130,220,0.12), rgba(110,130,220,0) 100%)',
          }}
        />
        {/* 中心辉光 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '47%',
            width: 340,
            height: 340,
            margin: -170,
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(120,150,255,.26),rgba(120,150,255,0) 66%)',
            opacity: 0.35 + seg(t, 0.5, 0.62, E.outCubic) * 0.65 - seg(t, 0.72, 1, E.inOutQuad) * 0.45,
          }}
        />
        {/* 到位柔闪：只在数字后方，一次 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '47%',
            width: 220,
            height: 120,
            margin: '-60px -110px',
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(200,215,255,0.55), rgba(200,215,255,0))',
            opacity: flash,
          }}
        />
        {/* 到位冲击环：外圈柔光 + 细亮环，边宽随扩散变细 */}
        {rp > 0 && rp < 1 && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '47%',
                width: 120,
                height: 120,
                margin: -60,
                borderRadius: '50%',
                boxShadow: '0 0 16px 4px rgba(130,160,255,0.35), inset 0 0 16px 2px rgba(130,160,255,0.25)',
                opacity: (1 - rp) * 0.8,
                transform: `scale(${0.35 + rp * 2.6})`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '47%',
                width: 120,
                height: 120,
                margin: -60,
                borderRadius: '50%',
                border: `${lerp(rp, 1.6, 0.4).toFixed(2)}px solid rgba(190,210,255,0.9)`,
                boxSizing: 'border-box',
                opacity: (1 - rp) * 0.9,
                transform: `scale(${0.35 + rp * 2.6})`,
              }}
            />
          </>
        )}
        {/* 大数字（渐变填充文字，外层 scale 过冲） */}
        <div style={{ position: 'absolute', left: '50%', top: '47%', transformOrigin: '50% 50%', transform: `scale(${sc})`, zIndex: 1 }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: 'translate(-50%,-50%)',
              whiteSpace: 'nowrap',
              fontWeight: 760,
              fontSize: 74,
              lineHeight: 1,
              fontFamily: FONT.sans,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.035em',
              background: 'linear-gradient(180deg,#ffffff 20%,#b9c6ff 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: `drop-shadow(0 0 14px rgba(130,160,255,.32))${rollBlur > 0.05 ? ` blur(${(rollBlur * 0.35).toFixed(2)}px)` : ''}`,
              opacity: Math.min(1, seg(t, 0.02, 0.12, E.outCubic) * 1.2),
            }}
          >
            {val.toLocaleString('en-US')}
          </div>
        </div>
        {/* 底部标签：淡入 + letter-spacing 收拢 + 上移 4px 落座 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '70%',
            transform: `translate(-50%,${lerp(labelP, 4, 0)}px)`,
            fontWeight: 650,
            fontSize: 10,
            lineHeight: 1,
            fontFamily: FONT.sans,
            whiteSpace: 'nowrap',
            color: '#8f9ac0',
            opacity: seg(t, 0.62, 0.78, E.outCubic),
            letterSpacing: lerp(labelP, 11, 5),
          }}
        >
          NEW TEAMS THIS WEEK
        </div>
        {/* 纸屑：抢拍 burst + 阻力抛体 + 自转 + 翻转 + 飘摆 */}
        {BITS.map((b, i) => {
          const u = seg(t, BURST + b.d, 1);
          if (u <= 0) return null;
          const life = u * 1.1; // 秒级时间尺度
          const fall = seg(life, 0.35, 0.9, E.inOutQuad); // 过了顶点后才开始飘摆
          const x = ballistic(b.x0, b.vx, 0, life) + Math.sin(life * 5.2 + b.phase) * b.sway * fall;
          const y = ballistic(b.y0, b.vy, b.g, life);
          const flip = Math.cos(life * b.flip + b.phase); // 翻转：-1..1
          const shade = (0.62 + 0.38 * Math.abs(flip)) * (b.depth === 0 ? 0.72 : 1); // 侧面/背面变暗，远景再压暗
          const dScale = b.depth === 0 ? 0.62 : b.depth === 2 ? 1.55 : 1;
          const dBlur = b.depth === 0 ? 0.25 : b.depth === 2 ? 1.1 : 0;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: b.w,
                height: b.h,
                background: b.color,
                borderRadius: b.isRect ? 1.2 : '50%',
                filter: `brightness(${shade.toFixed(3)})${dBlur ? ` blur(${dBlur}px)` : ''}`,
                zIndex: b.depth === 2 ? 3 : b.depth === 0 ? 0 : 2,
                opacity: Math.min(1, u * 8) * (1 - seg(u, 0.74, 1) * 0.95),
                transform:
                  `translate(calc(-50% + ${x.toFixed(2)}px),calc(-50% + ${y.toFixed(2)}px)) rotate(${(b.spin * life).toFixed(2)}deg) ` +
                  `scale(${((0.8 + (1 - u) * 0.35) * dScale).toFixed(3)}) scaleY(${b.isRect ? Math.max(0.08, Math.abs(flip)).toFixed(3) : 1})`,
              }}
            />
          );
        })}
        <Vignette strength={0.45} inner={0.5} color="#020308" />
      </DesignStage>
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
