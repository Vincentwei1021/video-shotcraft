// blur-slide — Blur Slide 逐词入场（motion-lab 定稿转原生 Remotion）
// 标题逐词入场：y 40→0 + blur 10→0 + opacity 0→1，词间 stagger 约 3f，
// easeOutCubic——y/blur/opacity 三通道同缓动同步收敛的"专业文字 reveal"；副标题随后同法跟进。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 质感层（改版）：暗场柔光 Backdrop + 颗粒；标题竖向微渐变 + 字距按字号收紧；
// 整组极缓推近 1.000→1.018（smooth，尾段速度归零），副标题 ~88f 落定后留满 25f 呼吸。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, EASE, FONT, Grain, ramp } from '../../_fixtures/Polish';

export const BLUR_SLIDE_DURATION = 114; // 3800ms @30fps

// 占位文案：词数贴近原稿（主 4 词 / 副 5 词），替换时保持词数以维持 stagger 节奏
const H1_WORDS = 'Make every launch count'.split(' ');
const H2_WORDS = 'Plan, review and ship together'.split(' ');

// 时间窗（归一化 t，114f）：主 0.05→0.56（≈6f→63f），副 0.29→0.78（≈33f→88f），重叠 30f 读作一句话
const H1_WIN: [number, number] = [0.05, 0.56];
const H2_WIN: [number, number] = [0.29, 0.78];

// 单行逐词渲染：tLine 是该行的归一化进度，gap 为词间 stagger，dy 为入场位移；
// 三通道（opacity / y / blur）共用同一个 p——"从虚焦里浮出来"的来源，不可拆
const Line: React.FC<{
  words: string[];
  tLine: number;
  gap: number;
  dy: number;
  blur: number;
  style: React.CSSProperties;
  wordStyle?: React.CSSProperties;
}> = ({ words, tLine, gap, dy, blur, style, wordStyle }) => (
  <div style={{ display: 'flex', gap: '0.28em', ...style }}>
    {words.map((w, i) => {
      const p = seg(tLine, i * gap, i * gap + 0.32, E.outCubic);
      return (
        <span
          key={i}
          style={{
            display: 'inline-block',
            opacity: p,
            transform: `translateY(${lerp(p, dy, 0)}px)`,
            filter: p >= 0.999 ? undefined : `blur(${(1 - p) * blur}px)`,
            ...wordStyle,
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
  const frame = useCurrentFrame();
  // 整组极缓推近：全程 smooth，起止速度为 0，尾段几乎静止（不破坏收尾 hold）
  const push = lerp(ramp(frame, 0, 100, EASE.smooth), 1, 1.018);
  return (
    <>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.34 }} accent="#5b63d3" vignette={0.55} grain={0} />
      <DesignStage bg="transparent">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            overflow: 'hidden',
            transform: `scale(${push})`,
          }}
        >
          {/* 主标题先入场，副标题时间窗错后跟进 */}
          <Line
            words={H1_WORDS}
            tLine={seg(t, H1_WIN[0], H1_WIN[1])}
            gap={0.055}
            dy={40}
            blur={10}
            style={{
              fontWeight: 700,
              fontSize: 34,
              lineHeight: 1.15,
              fontFamily: FONT.sans,
              letterSpacing: '-0.035em',
            }}
            // 竖向微渐变：上沿受光、下沿略压，比平涂白更像印刷标题
            wordStyle={{
              backgroundImage: 'linear-gradient(180deg, #f7f8fb 0%, #e6e8ef 55%, #c3c7d4 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              paddingBottom: 2,
            }}
          />
          <Line
            words={H2_WORDS}
            tLine={seg(t, H2_WIN[0], H2_WIN[1])}
            gap={0.04}
            dy={26}
            blur={8}
            style={{
              fontWeight: 400,
              fontSize: 14,
              lineHeight: 1.4,
              fontFamily: FONT.sans,
              letterSpacing: '-0.005em',
              color: '#8b91a8',
            }}
          />
        </div>
      </DesignStage>
      <Grain opacity={0.07} blend="soft-light" />
    </>
  );
};
