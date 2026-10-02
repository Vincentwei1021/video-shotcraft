import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { FakeDashboard, Card, G } from '../../_fixtures/Fixtures';
import { EASE, ramp } from '../../_fixtures/Polish';

// invisible-cut：前景遮挡隐形切——一张放大到超出画幅的卡片带重运动模糊
// 从左侧贴脸扫过，糊满屏幕的瞬间背景从 A 无痕换成 B，卡片飞出右侧时
// 观众以为还是同一镜。（invisible-cut + foreground-occlusion-swipe）
//
// 质感升级：
// - 遮挡卡用深色版（离镜头最近、不受光的前景物读作暗剪影），失焦糊满时
//   画面是一拍"被挡住"的暗，而不是一片发灰的白——遮挡感更真，切点更隐形；
// - 前景卡前缘带一条宽软投影扫过背景（近物遮光），卖"贴着镜头掠过"的距离感；
// - 背景页左右各接 64px 延展边（左接侧栏深色、右接顶栏+内容区底色）：±40px 带风推挤
//   不再露出画外底色（旧版切后左缘露出一条米灰缝）；
// - 全程一条慢速相机横移（-18px，smooth 缓动）贯穿切点：切前切后是同一个运动，
//   "一条 take"的错觉更牢；切后 13f 回稳、85f 前全部停稳，留 15f 静止收尾。
export const INVISIBLE_CUT_DURATION = 100; // 前态 40 + 横扫 14 + 回稳/静止 46

const SW_START = 40; // 卡片入场
const SW_END = 54; // 卡片出场（14f 横扫）
const CUT = 47; // 硬切点：扫掠中点，卡片完全糊满画面的那一帧
const BLEED = 64; // 页面左右延展边宽度 > 推挤 40 + 横移 18

// 卡片中扫掠曲线上的水平位置（容器 left，未缩放坐标）
const xAt = (f: number) =>
  // 卡片 scale(1.6) 后半宽 1280：起点右缘 -120 / 终点左缘 2120，均完全出画；
  // 中点 f47 覆盖 -280..2280，糊满整个 1920 画幅
  interpolate(f, [SW_START, SW_END], [-2200, 2600], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.7, 1),
  });

const Occluder: React.FC<{ left: number; transform: string; opacity?: number; filter: string; main?: boolean }> = ({
  left, transform, opacity = 1, filter, main,
}) => (
  <div
    style={{
      position: 'absolute', left, top: 40, width: 1600, height: 1000,
      transform, opacity, filter, borderRadius: 20,
      boxShadow: main ? '0 40px 120px rgba(6,7,10,0.45)' : undefined,
    }}
  >
    <Card w={1600} h={1000} seed={9} tone="dark" style={{ width: '100%', height: '100%', borderRadius: 20 }} />
  </div>
);

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const x = xAt(frame);
  // 瞬时速度（px/帧），驱动斜切与残影强度
  const v = xAt(frame + 0.5) - xAt(frame - 0.5);
  const sweeping = frame > SW_START - 2 && frame < SW_END + 3;
  // 背景被"带风"轻推：A 被拖向左，切成 B 后从右侧回稳——卖同一镜错觉
  const shove =
    frame < CUT
      ? interpolate(frame, [SW_START, CUT], [0, -40], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.in(Easing.quad),
        })
      : interpolate(frame, [CUT, CUT + 13], [40, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
  // 贯穿切点的慢速相机横移：0–85f 共 -18px（对称 in-out，起止无速度突变）
  const drift = -18 * ramp(frame, 0, 85, EASE.smooth);
  // 前景卡前缘（视觉右缘）位置：投影带贴在它前方
  const lead = x + 1600 + 480;
  const shadowA = sweeping ? 0.32 : 0;
  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      {/* 背景层：硬切藏在遮挡帧内 */}
      <div
        style={{
          position: 'absolute', inset: 0,
          transform: `translateX(${(shove + drift).toFixed(2)}px)`,
        }}
      >
        {frame < CUT ? <FakeDashboard variant="A" /> : <FakeDashboard variant="B" />}
        {/* 延展边：与 fixture 侧栏 / 顶栏 / 内容区同色，推挤时补进画面 */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: -BLEED, width: BLEED, background: 'linear-gradient(180deg, #1c1d22 0%, #16171b 100%)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 1920, width: BLEED, background: 'linear-gradient(180deg, #f4f4f2 0%, #eeeeeb 100%)' }}>
          <div style={{ height: 72, background: '#fafaf9', borderBottom: `1px solid ${G.hairline}`, boxSizing: 'border-box' }} />
        </div>
      </div>
      {/* 近物遮光：前景卡前方一条 900px 宽的软投影，随卡扫过背景 */}
      {sweeping && (
        <div
          style={{
            position: 'absolute', top: 0, bottom: 0, left: lead - 520, width: 900,
            background: 'linear-gradient(90deg, rgba(8,9,12,0.9) 0%, rgba(8,9,12,0.35) 45%, rgba(8,9,12,0) 100%)',
            opacity: shadowA,
          }}
        />
      )}
      {/* 手动残影：4 层拖尾（在主卡身后），保证遮挡窗口糊满全屏 */}
      {sweeping &&
        [4, 3, 2, 1].map((i) => (
          <Occluder
            key={i}
            left={xAt(frame - i * 0.55)}
            transform="scale(1.6)"
            opacity={[0, 0.35, 0.22, 0.13, 0.07][i]}
            filter="blur(14px)"
          />
        ))}
      {/* 主卡：1600x1000 放大 1.6 倍（2560x1600 超出画幅），自带 blur 加强糊感（失焦前景） */}
      {sweeping && (
        <Occluder left={x} transform={`scale(1.6) skewX(${-v * 0.018}deg)`} filter="blur(8px)" main />
      )}
    </AbsoluteFill>
  );
};

export const InvisibleCut: React.FC = () => (
  <CameraMotionBlur shutterAngle={300} samples={12}>
    <Scene />
  </CameraMotionBlur>
);
