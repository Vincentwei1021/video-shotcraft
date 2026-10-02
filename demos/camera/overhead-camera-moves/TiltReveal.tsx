// tilt-reveal｜俯仰揭示
// 开场俯视 dashboard 顶部（rotateX 平躺、只露顶栏一条透视窄带），机位抬头回正，
// 内容一排排涌入视野——像掀开桌上的图纸。
// 节拍：0–25 俯角定格（极缓 creep：-80°→-77°，画面不死）→ 25–68 抬头（不对称 in-out：
// 起步柔、中段快，冲到 +2.6° 过冲顶点时速度归零）→ 68–76 软回 0° → 76–145 真静止。
// 质感：纸面受光随俯角变化（平躺时掠射光偏暗、远端更暗，回正后均匀受光）；图纸在桌面上
// 投两层软影；背景柔光渐变 + 暗角 + 颗粒替代死平灰底；抬头最快的几帧给竖向运动模糊。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, SpeedBlur, mix, ramp, softShadow } from '../../_fixtures/Polish';

export const TILT_REVEAL_DURATION = 145; // 76f 动作 + 69f 真静止

const HOLD = 25; // 俯角定格
const MOVE = 43; // 主抬升 f25→68
const SETTLE = 8; // 过冲回落 f68→76，全部动画在 f76 结束
const FROM = -80; // 平躺俯角
const CREEP = 0.0375; // 定格段先抬 3°（-80°→-77°）
const OVER = 1.0325; // 主抬升冲到 +2.6°（80°×3.25%）

// 时间→姿态（纯函数，速度用中心差分求）。主抬升 EASE.swift（零速起步、中段快、末端零速），
// 到 f68 恰好在过冲顶点、速度为 0，再 smooth 软回 0°——两段接缝处速度连续
const poseAt = (f: number) => {
  const creep = ramp(f, 0, HOLD, EASE.smooth) * CREEP;
  const q = mix(creep, OVER, ramp(f, HOLD, MOVE, EASE.swift)) - (OVER - 1) * ramp(f, HOLD + MOVE, SETTLE, EASE.smooth);
  const rotX = FROM * (1 - q); // 过冲时 q>1 → rotX 略为正
  // 缩放 / 位移 / 透视用不过冲的同步曲线（否则 scale<1 会露出页边）
  const p = mix(creep, 1, ramp(f, HOLD, MOVE, EASE.swift));
  return {
    rotX,
    scale: mix(3.2, 1, p),
    ty: mix(200, 0, p),
    persp: mix(600, 1200, p),
    perspY: mix(5, 40, p),
  };
};

export const TiltReveal: React.FC = () => {
  const f = useCurrentFrame();
  const { rotX, scale, ty, persp, perspY } = poseAt(f);
  // 抬头角速度（°/帧）→ 画面竖向位移近似（页面中段每度 ~9px），只在快段生效
  const vRot = poseAt(f + 0.5).rotX - poseAt(f - 0.5).rotX;
  const vy = -vRot * 9;
  // 受光：平躺 → 暗；回正 → 均匀
  const flat = Math.min(1, Math.abs(rotX) / 80);

  // Q2 清晰度：放大不走 transform scale（会按 1x 栅格化再放大 3.2 倍，窄带里的字全是锯齿），
  // 改为 CSS zoom 按放大后尺寸布局栅格化。原式 scale(s)·rotateX(r) 的 2D scale 不放大 z，
  // 等价换算为：在 s 倍布局的平面上 rotateX(r')·scaleY(k)，tan r' = tan r / s，
  // k = √(s²cos²r + sin²r) / s（k ≤ 1，只缩不放，不损锐度）——投影与原式逐像素一致。
  const rad = (rotX * Math.PI) / 180;
  const rEq = (Math.atan2(Math.sin(rad), scale * Math.cos(rad)) * 180) / Math.PI;
  const kEq = Math.sqrt(scale * scale * Math.cos(rad) ** 2 + Math.sin(rad) ** 2) / scale;
  // 抗锯齿预滤波：平躺时纵向被压到 1/6 以下，Chromium 无 mipmap，行与字会碎成锯齿/闪烁。
  // 按纵向压缩比在平面本地做"只竖向"的高斯预模糊（σ≈0.55/压缩比，再乘透视远端系数 1.6），
  // 抬到能读之前（σ<0.5）自动关掉，读的时候绝对清晰。
  const vScale = kEq * Math.abs(Math.cos((rEq * Math.PI) / 180));
  const sigma = vScale > 0.6 ? 0 : (0.55 / Math.max(0.05, vScale)) * 1.6 - 1.2;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.12 }} vignette={0.18} grain={0.045} />
      <SpeedBlur vx={0} vy={vy} amount={0.22} max={10}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            perspective: persp,
            perspectiveOrigin: `50% ${perspY}%`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 960 - 960 * scale,
              top: 0,
              width: 1920 * scale,
              height: 1080 * scale,
              transformOrigin: '50% 0%', // 画面上缘
              transform: `translateY(${ty}px) rotateX(${rEq}deg) scaleY(${kEq})`,
              boxShadow: softShadow((6 + flat * 20) * scale, { strength: 0.9 }),
              overflow: 'hidden',
            }}
          >
            {sigma > 0.5 && (
              <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
                <filter id="tilt-aa" x="0" y="-5%" width="100%" height="110%" colorInterpolationFilters="sRGB">
                  <feGaussianBlur stdDeviation={`0 ${sigma.toFixed(2)}`} />
                </filter>
              </svg>
            )}
            <div style={{ width: 1920, height: 1080, zoom: scale, filter: sigma > 0.5 ? 'url(#tilt-aa)' : undefined }}>
              <FakeDashboard variant="A" />
            </div>
            {/* 纸面受光：掠射角越大整体越暗（近端轻、远端重）；远端再罩一层与背景同色的薄雾，
                平躺时远处被压成 1–2px 的行会闪烁，雾把它们化进背景（空气透视） */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: `linear-gradient(180deg, rgba(24,26,34,${(0.03 * flat).toFixed(3)}) 0%, rgba(24,26,34,${(0.1 * flat).toFixed(3)}) 45%, rgba(236,236,232,${(0.85 * flat ** 2).toFixed(3)}) 100%)`,
              }}
            />
          </div>
        </div>
      </SpeedBlur>
    </AbsoluteFill>
  );
};
