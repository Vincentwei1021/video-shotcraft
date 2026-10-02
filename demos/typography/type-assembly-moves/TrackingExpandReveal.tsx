// 字距呼吸展开（tracking-expand-reveal）——电影片头字幕惯用的 letter-spacing 入场。
// 标题 "BREATHE"（150px）出场时字符几乎叠压（相当于 letter-spacing -0.42em），
// 50 帧内展开到 0.14em，同步 blur 10px→0、opacity 0.6→1、scaleX 0.92→1。
// 不动 letter-spacing 本身（逐帧重排会抖）：容器常量 letterSpacing 0.14em 定终位，
// 逐字符 span 用 translateX 手动插值——第 i 字起始位移 = (i - 中心) × 每缝差值 84px，
// 全部挤向词心，位移只与字缝有关、与字宽无关，天然对中。
// 关键帧：0–50 展开（Easing.out(poly(5)))＋去糊提亮 → 35–58 副标题淡入（≈主词展开 70% 时点）
// → 58–130 全静止（≥72f，滤镜彻底摘除）。
//
// 质感升级：去掉调试标题；柔光 Backdrop（主光在词心上方）；系统 SF 栈 700、带色相近黑墨色；
// 展开时字下方一层柔影随清晰度同步浮现（字从雾里"落"到纸面）；副标题 32px 三级灰、
// 淡入附 8px 上浮；补导出时长 130f（原工作台按 56f 推断，副标题刚出来就切走）。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, FONT } from '../../_fixtures/Polish';

export const TRACKING_EXPAND_REVEAL_DURATION = 130;

const WORD = 'BREATHE';
const FS = 150; // 主词字号
// 每个字缝的起始-终点差：(-0.42em) - (0.14em) = -0.56em = -84px @150px
const GAP_DELTA = -0.56 * FS;

export const TrackingExpandReveal: React.FC = () => {
  const frame = useCurrentFrame();
  // 展开进度 0→1（0–50f，out poly(5)）
  const p = interpolate(frame, [0, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.poly(5)),
  });
  const blur = 10 * (1 - p);
  const op = interpolate(p, [0, 1], [0.6, 1]);
  const sx = interpolate(p, [0, 1], [0.92, 1]);
  // 副标题：主词时间轴走到 70%（帧 35）起淡入
  const subOp = interpolate(frame, [35, 58], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  const N = WORD.length;
  const center = (N - 1) / 2;
  const settled = frame >= 50; // 展开完成后摘掉一切滤镜/变换，保证逐帧完全相同

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.36 }} accent="#5b63d3" grain={0.045} vignette={0.13} />

      {/* 主词：容器 letterSpacing 恒为 0.14em（终态），字符仅做 translateX */}
      <div
        style={{
          position: 'absolute',
          top: 430,
          left: 0,
          width: 1920,
          display: 'flex',
          justifyContent: 'center',
          transform: settled ? undefined : `scaleX(${sx})`,
          filter: settled ? undefined : `blur(${blur}px)`,
          opacity: settled ? 1 : op,
        }}
      >
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 700,
            fontSize: FS,
            color: G.ink1,
            letterSpacing: '0.14em',
            // 柔影随清晰度浮现：展开完成后定格为静态值（无逐帧变化）
            textShadow: `0 ${(14 * p).toFixed(2)}px ${(36 * p).toFixed(2)}px rgba(20,22,32,${(0.12 * p).toFixed(3)})`,
            whiteSpace: 'pre',
            // letter-spacing 只加在字后，整体左移半个缝宽找回视觉对中
            marginLeft: 0.14 * FS * 0.5,
          }}
        >
          {WORD.split('').map((ch, i) => {
            const tx = (1 - p) * (i - center) * GAP_DELTA;
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  transform: settled ? undefined : `translateX(${tx}px)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      </div>

      {/* 副标题：主词展开 70% 时点淡入 */}
      <div
        style={{
          position: 'absolute',
          top: 630,
          left: 0,
          width: 1920,
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: 32,
          color: G.ink3,
          letterSpacing: '0.32em',
          // letter-spacing 只加在字后，补半个字距找回视觉对中
          paddingLeft: '0.32em',
          opacity: frame >= 58 ? 1 : subOp,
          transform: frame >= 58 ? undefined : `translateY(${((1 - subOp) * 8).toFixed(2)}px)`,
        }}
      >
        A CINEMATIC TITLE ENTRANCE
      </div>
    </div>
  );
};
