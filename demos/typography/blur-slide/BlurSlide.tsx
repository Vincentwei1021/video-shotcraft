// blur-slide — Blur Slide 逐词入场（motion-lab 定稿转原生 Remotion）
// 标题逐词入场：y 40→0 + blur 10→0 + opacity 0→1，词间 stagger 极短（1 帧量级），
// easeOutCubic——y/blur/opacity 三通道同缓动同步收敛的"专业文字 reveal"；副标题随后同法跟进。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const BLUR_SLIDE_DURATION = 114; // 3800ms @30fps

// 占位文案：词数与字长贴近原稿，替换时保持 4 词 / 5 词以维持 stagger 节奏
const H1_WORDS = 'Your headline goes here'.split(' ');
const H2_WORDS = 'Short supporting subtitle for placeholders'.split(' ');

// 单行逐词渲染：tLine 是该行的归一化进度，gap 为词间 stagger，dy 为入场位移
const Line: React.FC<{
  words: string[];
  tLine: number;
  gap: number;
  dy: number;
  style: React.CSSProperties;
}> = ({ words, tLine, gap, dy, style }) => (
  <div style={{ display: 'flex', gap: '0.32em', ...style }}>
    {words.map((w, i) => {
      const p = seg(tLine, i * gap, i * gap + 0.32, E.outCubic);
      return (
        <span
          key={i}
          style={{
            opacity: p,
            transform: `translateY(${lerp(p, dy, 0)}px)`,
            filter: `blur(${(1 - p) * 10}px)`,
          }}
        >
          {w}
        </span>
      );
    })}
  </div>
);

export const BlurSlide: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#0a0b10">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          overflow: 'hidden',
        }}
      >
        {/* 主标题先入场，副标题时间窗错后跟进 */}
        <Line
          words={H1_WORDS}
          tLine={seg(t, 0.06, 0.62)}
          gap={0.055}
          dy={40}
          style={{
            fontWeight: 800,
            fontSize: 34,
            lineHeight: 1.15,
            fontFamily: '-apple-system,sans-serif',
            color: '#eef1fa',
            letterSpacing: '-0.5px',
          }}
        />
        <Line
          words={H2_WORDS}
          tLine={seg(t, 0.34, 0.9)}
          gap={0.04}
          dy={26}
          style={{
            fontWeight: 400,
            fontSize: 14,
            lineHeight: 1.4,
            fontFamily: '-apple-system,sans-serif',
            color: '#7d86a3',
          }}
        />
      </div>
    </DesignStage>
  );
};
