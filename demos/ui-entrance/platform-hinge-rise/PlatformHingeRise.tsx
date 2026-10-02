// platform-hinge-rise — 平台建立后，两块主体从相邻底部铰点反向翻起，最后结论台升入。
// 从独立 motion-blocking 研究中整理为纯 DOM/SVG 的通用 Remotion demo。
// 质感层（改版）：灰块 + 大写占位字（SUBJECT / CONTEXT / OUTCOME）换成一组可读的"方案对比"内容
// （两张方案卡 + 背景语境盘 + 结论台），几何、铰点与全部时间轴不变；
// 主体改为从平台**后方**翻起（裁切线对齐平台上缘、平台压在主体之上），不再盖在平台上；
// 材质：石墨渐变卡面 + 顶部受光沿 + drop-shadow（clipPath 会吞掉 box-shadow），平台/结论台为
// 浅石材渐变 + 上缘高光 + 落地接触影；翻起段按速度加纵向运动模糊；主体落定时平台有 0.6px 承重下沉；
// 背景换柔光底 + 颗粒。
import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { DesignStage } from '../../_fixtures/Motion';
import { Backdrop, FONT, Grain, SpeedBlur, velocity } from '../../_fixtures/Polish';

export const PLATFORM_HINGE_RISE_DURATION = 104;

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ACCENT = '#5b63d3';
const PLATFORM_TOP = 174; // 平台上缘：主体从它后面翻起

const ease = (frame: number, start: number, end: number, from = 0, to = 1) =>
  interpolate(frame, [start, Math.max(start + 1, end)], [from, to], {
    ...CLAMP,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

const hingeEase = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, Math.max(start + 1, end)], [0, 1], {
    ...CLAMP,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

const dampedWobble = (frame: number, start: number, duration: number, amplitude: number) => {
  if (frame <= start || frame >= start + duration) return 0;
  const p = (frame - start) / duration;
  return amplitude * Math.sin(p * Math.PI * 3) * Math.pow(1 - p, 2);
};

// 两张方案卡的内容（左：自建，右：云端——结论指向右）
const PLANS = {
  left: { tag: 'OPTION A', name: 'Self-hosted', cost: '$18.4k', bars: [0.5, 0.58, 0.66, 0.62, 0.8, 0.96] },
  right: { tag: 'OPTION B', name: 'Managed cloud', cost: '$11.4k', bars: [0.92, 0.82, 0.74, 0.66, 0.58, 0.5] },
};

const SubjectPanel: React.FC<{
  side: 'left' | 'right';
  progress: number;
  wobble: number;
}> = ({ side, progress, wobble }) => {
  const isLeft = side === 'left';
  const x = isLeft ? 165 : 249;
  const w = isLeft ? 92 : 78;
  const h = isLeft ? 72 : 59;
  const top = isLeft ? 108 : 117; // 两块底边都略低于平台上缘，被平台压住
  const rise = isLeft ? 112 : 90;
  const startRotation = isLeft ? -18 : 18;
  const plan = PLANS[side];
  const s = isLeft ? 1 : 0.86; // 右块内容随尺寸缩一档，保持不对称轮廓
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top,
        width: w,
        height: h,
        transformOrigin: isLeft ? '100% 100%' : '0% 100%',
        transform: `translateY(${interpolate(progress, [0, 1], [rise, 0]).toFixed(3)}px) rotate(${(interpolate(
          progress,
          [0, 1],
          [startRotation, 0],
        ) + wobble).toFixed(4)}deg)`,
        // clipPath 会裁掉 box-shadow，投影挂在外层 drop-shadow 上
        filter: 'drop-shadow(0 0.6px 0.8px rgba(14,16,24,0.25)) drop-shadow(0 5px 7px rgba(14,16,24,0.16))',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: 'polygon(8% 10%,92% 0,100% 100%,0 100%)',
          background: isLeft
            ? 'linear-gradient(170deg, #3a3c44 0%, #24262c 100%)'
            : 'linear-gradient(170deg, #4a4d58 0%, #31333b 100%)',
          fontFamily: FONT.sans,
          color: '#f3f4f7',
        }}
      >
        {/* 顶部受光沿（沿梯形上边的斜线） */}
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
          <line
            x1={isLeft ? w * 0.08 : w * 0.08}
            y1={h * 0.1 + 0.25}
            x2={w * 0.92}
            y2={0.25}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={0.5}
          />
        </svg>
        <div style={{ position: 'absolute', left: 11 * s, top: 13 * s + (isLeft ? 1 : 0), fontSize: 4.6 * s, fontWeight: 650, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)' }}>
          {plan.tag}
        </div>
        <div style={{ position: 'absolute', left: 11 * s, top: 20 * s + (isLeft ? 1 : 0), fontSize: 7.4 * s, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          {plan.name}
        </div>
        <div style={{ position: 'absolute', left: 11 * s, top: 31 * s + (isLeft ? 1 : 0), fontSize: 14 * s, fontWeight: 700, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {plan.cost}
          <span style={{ fontSize: 4.8 * s, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginLeft: 1.5 * s, letterSpacing: 0 }}>/mo</span>
        </div>
        {/* 月度成本小柱：左增右减（右块用强调色） */}
        <div style={{ position: 'absolute', left: 11 * s, bottom: 9 * s, display: 'flex', alignItems: 'flex-end', gap: 2 * s, height: 13 * s }}>
          {plan.bars.map((b, i) => (
            <div
              key={i}
              style={{
                width: 4 * s,
                height: `${b * 100}%`,
                borderRadius: 1,
                background: isLeft ? 'rgba(255,255,255,0.32)' : i === plan.bars.length - 1 ? '#8e95f0' : 'rgba(142,149,240,0.45)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// 浅石材梯形（平台 / 结论台共用质感）
const stone = (top: string, bottom: string): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`,
});

export const PlatformHingeRise: React.FC = () => {
  const frame = useCurrentFrame();
  const platform = ease(frame, 0, 15, 0.012, 1);
  const context = ease(frame, 12, 32);
  const left = hingeEase(frame, 14, 30);
  const right = hingeEase(frame, 14, 30);
  const conclusion = ease(frame, 52, 74);
  const leftWobble = dampedWobble(frame, 30, 16, 1.5);
  const rightWobble = dampedWobble(frame, 31, 16, -1.2);
  // 翻起段纵向速度（设计 px/帧，取左块行程）→ 运动模糊；静止为 0
  const riseV = velocity((f) => 112 * (1 - hingeEase(f, 14, 30)), frame);
  // 承重：主体落定瞬间平台下沉 0.6px 再回弹
  const press = interpolate(frame, [29, 32, 38], [0, 0.6, 0], { ...CLAMP, easing: Easing.inOut(Easing.sin) });

  return (
    <DesignStage bg="#f2f2ef" raster="zoom">
      <Backdrop tone="light" light={{ x: 0.5, y: 0.22 }} grain={0} vignette={0.12} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          fontFamily: FONT.sans,
        }}
      >
        {/* 背景语境盘：极淡的强调色圆 + 发丝环 + 小标签（低能量背景层） */}
        <div
          style={{
            position: 'absolute',
            left: 190,
            top: 65,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 30%, rgba(91,99,211,0.10) 0%, rgba(91,99,211,0.05) 60%, rgba(91,99,211,0.03) 100%)',
            boxShadow: 'inset 0 0 0 0.3px rgba(91,99,211,0.22)',
            opacity: context,
            transform: `translateY(${interpolate(context, [0, 1], [18, 0]).toFixed(3)}px) scale(${interpolate(
              context,
              [0, 1],
              [0.88, 1],
            ).toFixed(4)})`,
            display: 'grid',
            placeItems: 'start center',
            paddingTop: 16,
            boxSizing: 'border-box',
            color: 'rgba(60,66,140,0.62)',
            fontSize: 5,
            fontWeight: 650,
            letterSpacing: '0.14em',
          }}
        >
          INFRA REVIEW · Q3
        </div>

        {/* 主体：裁切线对齐平台上缘，从平台后方翻起 */}
        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 ${270 - PLATFORM_TOP}px 0)` }}>
          <SpeedBlur vx={0} vy={riseV} amount={0.1} max={2.4}>
            <SubjectPanel side="left" progress={left} wobble={leftWobble} />
            <SubjectPanel side="right" progress={right} wobble={rightWobble} />
          </SpeedBlur>
        </div>

        {/* 平台落地接触影：随平台建立横向铺开 */}
        <div
          style={{
            position: 'absolute',
            left: 149,
            top: 186,
            width: 182,
            height: 10,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(20,22,30,0.22), rgba(20,22,30,0))',
            transform: `scaleX(${platform.toFixed(4)})`,
            opacity: Math.min(1, platform * 1.4),
          }}
        />
        {/* 平台：浅石材梯形 + 上缘高光，压在主体底部之上 */}
        <div
          style={{
            position: 'absolute',
            left: 149,
            top: PLATFORM_TOP,
            width: 182,
            height: 16,
            transformOrigin: '50% 50%',
            transform: `translateY(${press.toFixed(3)}px) scaleX(${platform.toFixed(4)})`,
          }}
        >
          <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(5% 0,95% 0,100% 100%,0 100%)', ...stone('#b9b9b5', '#8f8f8b') }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 0.5, background: 'rgba(255,255,255,0.75)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0.5, height: 3, background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0))' }} />
          </div>
        </div>

        {/* 结论台：总结层，对比低于两张方案卡 */}
        <div
          style={{
            position: 'absolute',
            left: 108,
            top: 205,
            width: 264,
            height: 74,
            opacity: interpolate(conclusion, [0, 0.18, 1], [0, 0.45, 1], CLAMP),
            transform: `translateY(${interpolate(conclusion, [0, 1], [96, 0]).toFixed(3)}px)`,
            filter: 'drop-shadow(0 -0.5px 0 rgba(255,255,255,0.9)) drop-shadow(0 -3px 6px rgba(20,22,30,0.06))',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: 'polygon(18% 0,82% 0,100% 100%,0 100%)',
              ...stone('#e6e6e2', '#d4d4cf'),
              display: 'grid',
              placeItems: 'start center',
              paddingTop: 14,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 0.5, background: 'rgba(255,255,255,0.9)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.025em', color: '#33353c' }}>
                Cloud saves <span style={{ color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>38%</span>
              </div>
              <div style={{ marginTop: 3, fontSize: 5.2, fontWeight: 500, color: '#7c7e85', letterSpacing: '0.01em' }}>
                12-month total cost vs. self-hosted
              </div>
            </div>
          </div>
        </div>
      </div>
      <Grain opacity={0.05} scale={0.25} />
    </DesignStage>
  );
};
