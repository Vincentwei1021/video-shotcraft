import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, Grain, SpeedBlur, mix, ramp, tracking, velocity } from '../../_fixtures/Polish';

// versus-slam 对撞开屏：左右两个半屏画面（带 78° 斜切边）从画外加速对冲，
// 沿斜缝砰地撞合；撞击帧白闪 + 整机震屏指数衰减 + "VS" 字块盖章压出，结尾静止 hold。
//
// 质感升级：
// - 两半屏做出"两方对峙"：左半深色版 dashboard（旧方案）、右半浅色版（新方案），
//   一明一暗撞在一起，不再是同一张浅灰页的两种裁切；各带一枚方名标签（撞后错峰 4f 滑入）；
// - 建立段不再是一整屏空米灰：暗场柔光背景上，斜缝位置一根冷白细光从中点向两端长出、
//   随两半逼近逐渐变亮（预备），撞合瞬间被实缝替代；
// - 对冲段按速度给两半屏横向运动模糊（末速约 360px/帧，封顶 36px），撞前一帧糊成一道；
// - 撞合实缝从 12px 实心黑条改为"撞击光缝"：2px 冷白光芯 + 外发光，撞击帧最亮、14f 收敛到常亮；
//   两侧各压一道窄暗影，把明暗两半分开；
// - VS 字块从白底黑框改为深色圆章：强调色渐变描边 + 顶部内高光 + 深投影，白色斜体重字；
//   撞击帧同发一圈冲击波环（单次，14f 外扩淡出）。
export const VERSUS_SLAM_DURATION = 100; // 建立 20 + 对冲 10 + 撞后呼吸 70

const IMPACT = 30; // 撞击帧（前 20f 建立 hold + 10f ease-in 对冲）

// 斜缝几何：78° 斜边 → 1080 高度上水平偏移 1080/tan(78°) ≈ 230px，中线 x=960 ±115
const SEAM_TOP_X = 1075; // 缝顶端 x
const SEAM_BOT_X = 845; // 缝底端 x
// CSS 旋转顺时针为正：缝顶端偏右（1075 > 845）→ 正角度 ≈ +12°
const SEAM_DEG = (Math.atan2(SEAM_TOP_X - SEAM_BOT_X, 1080) * 180) / Math.PI;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 两半屏对冲：ease-in 加速，10f 从 ±1200px 冲到位
const leftXAt = (f: number) => interpolate(f, [20, IMPACT], [-1200, 0], { ...clamp, easing: Easing.in(Easing.cubic) });

// 方名标签：撞后滑入
const SideTag: React.FC<{ side: 'left' | 'right'; title: string; meta: string; k: number }> = ({ side, title, meta, k }) => {
  const dark = side === 'left';
  const dir = side === 'left' ? -1 : 1;
  return (
    <div
      style={{
        position: 'absolute', bottom: 64, ...(side === 'left' ? { left: 284 } : { right: 64 }),
        display: 'flex', alignItems: 'baseline', gap: 16, padding: '18px 28px', borderRadius: 18,
        background: dark ? 'rgba(24,25,30,0.86)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : G.hairlineStrong}`,
        boxShadow: dark
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 48px -12px rgba(0,0,0,0.7)'
          : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 18px 48px -14px rgba(16,18,24,0.28)',
        backdropFilter: 'blur(10px)',
        opacity: k, transform: `translateX(${(dir * (1 - k) * 36).toFixed(2)}px)`,
        fontFamily: FONT.sans,
      }}
    >
      <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: tracking(48), color: dark ? '#f1f1f4' : G.ink1 }}>{title}</span>
      <span style={{ fontSize: 32, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.5)' : G.ink2, fontVariantNumeric: 'tabular-nums' }}>{meta}</span>
    </div>
  );
};

export const VersusSlam: React.FC = () => {
  const frame = useCurrentFrame();

  const leftX = leftXAt(frame);
  const rightX = -leftX;
  const v = velocity(leftXAt, frame); // 对冲速度（px/帧），驱动运动模糊

  // 撞击帧起：整机震屏 12px 指数衰减（约 5f 收干）
  const since = frame - IMPACT;
  const env = since >= 0 ? 12 * Math.exp(-since / 1.6) : 0;
  const shakeX = env * Math.sin(since * 3.4);
  const shakeY = env * 0.6 * Math.sin(since * 4.1 + 0.7);

  // 白闪：撞击帧 0.9 → 0，3f 收掉（撞前为 0——旧版左侧钳位让 0–29f 整段是 0.9 白屏）
  const flash = frame < IMPACT ? 0 : interpolate(frame, [IMPACT, IMPACT + 3], [0.9, 0], clamp);

  // "VS" 盖章：scale 1.6 → 1 带 back overshoot，6f 压出
  const vsScale = interpolate(frame, [IMPACT, IMPACT + 6], [1.6, 1], { ...clamp, easing: Easing.out(Easing.back(2.6)) });
  const vsOpacity = interpolate(frame, [IMPACT, IMPACT + 2], [0, 1], clamp);

  const impacted = frame >= IMPACT;

  // 建立段预示光缝：0–14f 从中点向两端长出，逼近时变亮
  const preGrow = ramp(frame, 2, 14, EASE.snappy);
  const preGlow = 0.35 + 0.65 * ramp(frame, 18, IMPACT - 18, EASE.exit);
  // 撞击光缝：撞击帧最亮，14f 收敛到常亮 0.4
  const seamHot = impacted ? mix(0.4, 1, 1 - ramp(frame, IMPACT, 14, EASE.out)) : 0;
  // 冲击波环：单次，14f 外扩淡出
  const wave = ramp(frame, IMPACT, 14, EASE.out);
  // 方名标签：撞后 8f / 12f 错峰滑入
  const tagL = ramp(frame, IMPACT + 8, 14, EASE.snappy);
  const tagR = ramp(frame, IMPACT + 12, 14, EASE.snappy);

  const seamLine = (opacity: number, scaleY: number, glow: number) => (
    <div
      style={{
        position: 'absolute', left: 960 - 1, top: 540 - 700, width: 2, height: 1400,
        transform: `rotate(${SEAM_DEG}deg) scaleY(${scaleY})`,
        background: 'linear-gradient(180deg, rgba(235,238,255,0) 0%, rgba(235,238,255,0.95) 18%, #ffffff 50%, rgba(235,238,255,0.95) 82%, rgba(235,238,255,0) 100%)',
        boxShadow: `0 0 ${(10 + glow * 30).toFixed(1)}px ${(1 + glow * 3).toFixed(1)}px rgba(150,160,255,${(0.35 + glow * 0.5).toFixed(3)})`,
        opacity,
      }}
    />
  );

  return (
    <AbsoluteFill style={{ background: G.dark, overflow: 'hidden' }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.42 }} accent={G.accent} grain={0} />
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${shakeX}px, ${shakeY}px)` }}>
        {/* 建立段的斜缝光线预示（撞合后被实缝替代） */}
        {!impacted && seamLine(preGlow, preGrow, preGlow * 0.6)}
        {/* 左半屏：深色版 dashboard A 裁左半，斜边 78°，对冲期横向运动模糊 */}
        <SpeedBlur vx={v} amount={0.1} max={36}>
          <div style={{
            position: 'absolute', inset: 0,
            transform: `translateX(${leftX}px)`,
            clipPath: `polygon(0px 0px, ${SEAM_TOP_X}px 0px, ${SEAM_BOT_X}px 1080px, 0px 1080px)`,
          }}>
            <FakeDashboard variant="A" tone="dark" />
            <SideTag side="left" title="Legacy" meta="v1.8" k={tagL} />
          </div>
        </SpeedBlur>
        {/* 右半屏：浅色版 dashboard B 裁右半 */}
        <SpeedBlur vx={-v} amount={0.1} max={36}>
          <div style={{
            position: 'absolute', inset: 0,
            transform: `translateX(${rightX}px)`,
            clipPath: `polygon(${SEAM_TOP_X}px 0px, 1920px 0px, 1920px 1080px, ${SEAM_BOT_X}px 1080px)`,
          }}>
            <FakeDashboard variant="B" />
            <SideTag side="right" title="Next" meta="v2.0" k={tagR} />
          </div>
        </SpeedBlur>
        {/* 撞合后的撞击光缝：两侧窄暗影 + 冷白光芯 */}
        {impacted && (
          <>
            <div style={{
              position: 'absolute', left: 960 - 14, top: 540 - 700, width: 28, height: 1400,
              transform: `rotate(${SEAM_DEG}deg)`,
              background: 'linear-gradient(90deg, rgba(6,7,10,0) 0%, rgba(6,7,10,0.45) 42%, rgba(6,7,10,0.45) 58%, rgba(6,7,10,0) 100%)',
            }} />
            {seamLine(1, 1, seamHot)}
          </>
        )}
        {/* 冲击波环：撞击帧同发，单次 */}
        {impacted && wave < 1 && (
          <div style={{
            position: 'absolute', left: 960, top: 540, width: 0, height: 0,
          }}>
            <div style={{
              position: 'absolute', left: -mix(130, 560, wave), top: -mix(130, 560, wave),
              width: mix(260, 1120, wave), height: mix(260, 1120, wave), borderRadius: '50%',
              border: `${mix(6, 1, wave).toFixed(2)}px solid rgba(225,230,255,${(0.7 * (1 - wave)).toFixed(3)})`,
              boxShadow: `0 0 40px rgba(150,160,255,${(0.4 * (1 - wave)).toFixed(3)})`,
            }} />
          </div>
        )}
        {/* "VS" 圆章盖章：贴缝、随缝倾斜 */}
        {impacted && (
          <div style={{
            position: 'absolute', left: 960, top: 540,
            transform: `translate(-50%, -50%) rotate(${SEAM_DEG}deg) scale(${vsScale})`,
            opacity: vsOpacity,
            width: 236, height: 236, borderRadius: '50%', padding: 4, boxSizing: 'border-box',
            background: `linear-gradient(150deg, #9aa0f5 0%, ${G.accent} 55%, #3a40a8 100%)`,
            boxShadow: '0 30px 70px -10px rgba(4,5,10,0.75), 0 8px 18px rgba(4,5,10,0.45)',
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 28%, #2c2e38 0%, #17181d 62%, #0e0f13 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -10px 24px rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT.sans, fontSize: 108, fontWeight: 900, fontStyle: 'italic',
              letterSpacing: '-0.05em', color: '#f6f6fa', paddingRight: 6, boxSizing: 'border-box',
              textShadow: '0 2px 0 rgba(0,0,0,0.35)',
            }}>
              VS
            </div>
          </div>
        )}
      </div>
      {/* 撞击白闪（不随震屏位移） */}
      <AbsoluteFill style={{ background: '#ffffff', opacity: flash, pointerEvents: 'none' }} />
      <Grain opacity={0.05} step={2} blend="soft-light" />
    </AbsoluteFill>
  );
};
