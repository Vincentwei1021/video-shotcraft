// crash-impact 急推撞停——同 crash-zoom 的急推，到位瞬间不回弹而是
// 撞停震屏：高频抖 + 指数衰减 6f，然后真静止。对比点：重量感 vs 弹性感。
// 节拍：0–32 全景 hold（极缓 creep 1→1.02）→ 32–40 预备回拉 ~3% → 40–46 急推 6f
// （强 ease-in，速度峰值砸在到位帧）→ 46 撞停：位移高频交替抖 + 微旋转（≤0.35°），
// 包络 14px·e^(−t/1.8)，首拍沿冲击方向"下沉"，~6f 收干 → 52–120 真静止。
// 运动模糊：自写时间采样只给急推段（子帧数按位移自适应）；震屏段保持清晰抖动。
// 重量的落点：撞停瞬间暗角猛压一拍再退、周边页面轻压暗（目标卡不浮起——是"砸实"不是"弹起"）。
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, Vignette, mix, ramp } from '../../_fixtures/Polish';

export const CRASHIMPACT_DUR = 120;

const CARD = layout.projects.cards[3];
const TARGET = { cx: CARD.x + CARD.w / 2, cy: CARD.y + CARD.h / 2 };
const VIEW_Y = 180;
const CARD_R = 8.5; // 截图里卡片圆角（页面 px）
const PUSH = 40;
const HIT = 46;
const ZOOM = 2.5;

const camAt = (f: number) => {
  const creep = mix(1, 1.02, ramp(f, 0, 32, EASE.smooth));
  const wind = mix(creep, 0.99, ramp(f, 32, 8, EASE.smooth));
  const p = ramp(f, PUSH, HIT - PUSH, EASE.exit); // 到位即停：没有回弹段
  const zoom = f < PUSH ? wind : mix(0.99, ZOOM, p);
  const k = f < PUSH ? ramp(f, 0, 32, EASE.smooth) * 0.04 : mix(0.04, 1, p);
  return { zoom, cx: mix(960, TARGET.cx, k), cy: mix(VIEW_Y + 540, TARGET.cy, k) };
};

// 撞停震屏（屏幕空间，确定性）：cos 起相让第 0 帧取包络峰值且朝下（冲击方向延续），
// 频率 ~2.9 rad/f 使相邻帧几乎反号——高频"硬抖"而非手持晃；x 轴幅度 0.55、旋转 0.025°/px
const shakeAt = (f: number) => {
  const t = f - HIT;
  if (t < 0) return { sx: 0, sy: 0, rot: 0 };
  const env = 14 * Math.exp(-t / 1.8);
  if (env < 0.15) return { sx: 0, sy: 0, rot: 0 };
  return {
    sx: env * 0.55 * Math.sin(t * 2.4 + 0.6),
    sy: env * Math.cos(t * 2.9),
    rot: env * 0.025 * Math.sin(t * 3.7 + 1.9),
  };
};

const Page: React.FC<{ f: number; dim: number }> = ({ f, dim }) => {
  const { zoom, cx, cy } = camAt(f);
  return (
    <div
      style={{
        position: 'absolute', width: 1920, height: layout.projects.pageH,
        transform: `translate(${960 - cx * zoom}px, ${540 - cy * zoom}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      <Img src={staticFile('textures/live/projects-full.png')} style={{ position: 'absolute', width: 1920 }} />
      {/* 周边压暗：卡外大 spread 影子当遮罩（目标卡原亮度） */}
      {dim > 0.001 && (
        <div
          style={{
            position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: CARD_R,
            boxShadow: `0 0 0 4000px rgba(38,32,24,${(0.08 * dim).toFixed(3)})`,
          }}
        />
      )}
      <Img
        src={staticFile('textures/live/card4-hires.png')}
        style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: CARD_R }}
      />
    </div>
  );
};

const SHUTTER = 0.55; // 帧（≈200° 快门）
const samplesAt = (f: number) => {
  const a = camAt(f), b = camAt(f - SHUTTER);
  const edge = Math.abs(a.zoom - b.zoom) * 1100 + Math.hypot(a.cx * a.zoom - b.cx * b.zoom, a.cy * a.zoom - b.cy * b.zoom);
  return Math.max(1, Math.min(40, Math.ceil(edge / 14)));
};

export const CrashImpactReal: React.FC = () => {
  const frame = useCurrentFrame();
  const { sx, sy, rot } = shakeAt(frame);
  const dim = ramp(frame, HIT, 8, EASE.out);
  // 暗角：急推加深 → 撞停帧顶到 0.3（重量的"一沉"）→ 16f 退到 0.12
  const vig = frame < HIT
    ? 0.08 + 0.14 * ramp(frame, PUSH, HIT - PUSH, EASE.exit)
    : mix(0.3, 0.12, ramp(frame, HIT, 16, EASE.out));
  // blur 只包急推段；撞停震屏段保持清晰抖动
  const n = frame >= PUSH && frame < HIT ? samplesAt(frame) : 1;
  return (
    <AbsoluteFill style={{ backgroundColor: '#f9f6f1', overflow: 'hidden' }}>
      {/* 震屏层：整页 + 遮罩一起抖（2.5x 下页面远超画框，抖动不会露边） */}
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) rotate(${rot}deg)` }}>
        {n > 1 ? (
          Array.from({ length: n }, (_, i) => (
            <AbsoluteFill key={i} style={{ opacity: 1 / (i + 1) }}>
              <Page f={frame - (SHUTTER * i) / (n - 1)} dim={dim} />
            </AbsoluteFill>
          ))
        ) : (
          <Page f={frame} dim={dim} />
        )}
      </AbsoluteFill>
      <Vignette strength={vig} inner={0.42} color="#2a2218" cy={0.5} />
    </AbsoluteFill>
  );
};
