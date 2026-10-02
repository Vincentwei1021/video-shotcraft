// blinds-slice｜百叶窗切条错峰擦除
// FakeDashboard A → B。12 根 160px 竖条，从左到右 delay=列号×2f，
// 每条 10f 内完成翻换：条内 A scaleX 1→0（origin 左缘）与 B scaleX 0→1
// （origin 右缘）共用同一进度 p（Easing.in(cubic)），交接缝恒等于
// x+160(1-p)，数学上无露底。缝上亮线（柔光+暗描边+白核）随波扫过。
// 波 20–52f；52f 起摘罩（整页 B 直出、条结构与亮线全部卸载），
// 52–150f 真静止 98f ≥ 40f。帧确定，无随机源。
//
// 质感升级（让"叶片翻面"有体积，而不是两张图在横向挤压）：
// - 叶片受光：翻走的 A 面随 √p 转暗（√ 让 ease-in 慢起段也看得出在转），翻来的 B 面从暗处转亮；
//   阴影沿叶宽横向渐变（A 远端右缘最深 0.34、B 远端左缘最深 0.32），主光从屏幕正前方打来——
//   压扁的切片读作"绕铰边侧过去的叶片"，不是一块块灰罩；
// - 翻换中的叶片两缘各一根 1px 发丝分隔（叶片之间的缝），只在该条翻换时出现；
// - 缝亮线三层参数照旧（白底判例），只把暗描边色从纯黑换成带色相的深色。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';

export const BLINDS_SLICE_DURATION = 150;

const STRIPS = 12;
// 叶片背光面的阴影（带色相的深色 #10121a，不用纯黑）：沿叶宽横向渐变——
// 绕铰边转动时远离观众的一侧更暗；a0/a1 为左/右缘不透明度，k 为整体强度
const shadeGrad = (a0: number, a1: number, k: number) =>
  `linear-gradient(90deg, rgba(16,18,26,${(a0 * k).toFixed(3)}) 0%, rgba(16,18,26,${(a1 * k).toFixed(3)}) 100%)`;
const W = 160; // 每条宽 12×160 = 1920
const WAVE_START = 20;
const STAGGER = 2; // 列号 × 2f
const FLIP = 10; // 每条 10f 完成翻换
const WAVE_END = WAVE_START + (STRIPS - 1) * STAGGER + FLIP; // 52

// 条内某页的切片：外层 160 宽裁剪，内层整页 1920 负 margin 对位
const Slice: React.FC<{ x: number; variant: 'A' | 'B' }> = ({ x, variant }) => (
  <div style={{ width: 1920, height: 1080, marginLeft: -x }}>
    <FakeDashboard variant={variant} />
  </div>
);

export const BlindsSlice: React.FC = () => {
  const frame = useCurrentFrame();

  // 摘罩：波完成后条结构全部卸载，B 整页直出
  if (frame >= WAVE_END) {
    return (
      <AbsoluteFill style={{ background: '#ececea' }}>
        <FakeDashboard variant="B" />
      </AbsoluteFill>
    );
  }

  const seams: { x: number; opacity: number }[] = [];

  const strips = Array.from({ length: STRIPS }).map((_, i) => {
    const x = i * W;
    const start = WAVE_START + i * STAGGER;
    const end = start + FLIP;

    // 未开始：纯 A 切片；已完成：纯 B 切片
    if (frame < start) {
      return (
        <div key={i} style={{ position: 'absolute', left: x, top: 0, width: W, height: 1080, overflow: 'hidden' }}>
          <Slice x={x} variant="A" />
        </div>
      );
    }
    if (frame >= end) {
      return (
        <div key={i} style={{ position: 'absolute', left: x, top: 0, width: W, height: 1080, overflow: 'hidden' }}>
          <Slice x={x} variant="B" />
        </div>
      );
    }

    // 翻换中：A、B 共用同一进度 p——A 宽 160(1-p) 靠左，B 宽 160p 靠右，
    // 交接点恒为 x+160(1-p)，无露底
    const p = interpolate(frame, [start, end], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    });

    // 缝亮线：进出各 2f 线性淡入淡出
    const seamOpacity = Math.min(
      interpolate(frame, [start, start + 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      interpolate(frame, [end - 2, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    );
    seams.push({ x: x + W * (1 - p), opacity: seamOpacity });

    return (
      <div key={i} style={{ position: 'absolute', left: x, top: 0, width: W, height: 1080, overflow: 'hidden' }}>
        {/* A：向左缘收缩，转离主光逐渐变暗 */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: `scaleX(${1 - p})`, transformOrigin: '0% 50%' }}>
          <Slice x={x} variant="A" />
          <div style={{ position: 'absolute', inset: 0, background: shadeGrad(0.08, 0.34, Math.sqrt(p)) }} />
        </div>
        {/* B：从右缘展开，从暗处转向主光 */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: `scaleX(${p})`, transformOrigin: '100% 50%' }}>
          <Slice x={x} variant="B" />
          <div style={{ position: 'absolute', inset: 0, background: shadeGrad(0.32, 0.06, 1 - p) }} />
        </div>
        {/* 叶片缝：翻换中两缘各 1px 发丝分隔 */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 1, background: 'rgba(16,18,26,0.22)', opacity: seamOpacity }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 1, background: 'rgba(16,18,26,0.22)', opacity: seamOpacity }} />
      </div>
    );
  });

  return (
    <AbsoluteFill style={{ background: '#ececea' }}>
      {strips}
      {/* 缝亮线：白底判例——纯提亮不可见，柔光 + 暗描边 + 白核三层 */}
      {seams.length > 0 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {seams.map((s, i) => (
            <g key={i} opacity={s.opacity}>
              <line x1={s.x} y1={0} x2={s.x} y2={1080} stroke="rgba(255,255,255,0.45)" strokeWidth={16} />
              <line x1={s.x} y1={0} x2={s.x} y2={1080} stroke="rgba(10,11,18,0.55)" strokeWidth={6} />
              <line x1={s.x} y1={0} x2={s.x} y2={1080} stroke="rgba(255,255,255,0.95)" strokeWidth={3} />
            </g>
          ))}
        </svg>
      )}
    </AbsoluteFill>
  );
};
