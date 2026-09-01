// platform-hinge-rise — 平台建立后，两块主体从相邻底部铰点反向翻起，最后结论台升入。
// 从独立 motion-blocking 研究中整理为纯 DOM/SVG 的通用 Remotion demo。
import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { DesignStage } from '../../_fixtures/Motion';

export const PLATFORM_HINGE_RISE_DURATION = 104;

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

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

const SubjectPanel: React.FC<{
  side: 'left' | 'right';
  progress: number;
  wobble: number;
}> = ({ side, progress, wobble }) => {
  const isLeft = side === 'left';
  const x = isLeft ? 165 : 249;
  const w = isLeft ? 92 : 78;
  const h = isLeft ? 72 : 59;
  const rise = isLeft ? 112 : 90;
  const startRotation = isLeft ? -18 : 18;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 108,
        width: w,
        height: h,
        clipPath: 'polygon(8% 10%,92% 0,100% 100%,0 100%)',
        background: isLeft ? '#5f6064' : '#77787c',
        boxShadow: '0 10px 22px rgba(0,0,0,.12)',
        transformOrigin: isLeft ? '100% 100%' : '0% 100%',
        transform: `translateY(${interpolate(progress, [0, 1], [rise, 0])}px) rotate(${interpolate(
          progress,
          [0, 1],
          [startRotation, 0],
        ) + wobble}deg)`,
        display: 'grid',
        placeItems: 'center',
        color: '#f7f7f5',
        fontFamily: 'Arial, sans-serif',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1,
      }}
    >
      SUBJECT
    </div>
  );
};

export const PlatformHingeRise: React.FC = () => {
  const frame = useCurrentFrame();
  const platform = ease(frame, 0, 15, 0.012, 1);
  const context = ease(frame, 12, 32);
  const left = hingeEase(frame, 14, 30);
  const right = hingeEase(frame, 14, 30);
  const conclusion = ease(frame, 52, 74);
  const leftWobble = dampedWobble(frame, 30, 16, 1.5);
  const rightWobble = dampedWobble(frame, 31, 16, -1.2);

  return (
    <DesignStage bg="#f4f4f1" raster="zoom">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 190,
            top: 65,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: '#d2d2cf',
            opacity: context,
            transform: `translateY(${interpolate(context, [0, 1], [18, 0])}px) scale(${interpolate(
              context,
              [0, 1],
              [0.88, 1],
            )})`,
            display: 'grid',
            placeItems: 'start center',
            paddingTop: 17,
            boxSizing: 'border-box',
            color: '#77787a',
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: 0.8,
          }}
        >
          CONTEXT
        </div>

        <div
          style={{
            position: 'absolute',
            left: 149,
            top: 174,
            width: 182,
            height: 16,
            clipPath: 'polygon(5% 0,95% 0,100% 100%,0 100%)',
            background: '#92928f',
            transformOrigin: '50% 50%',
            transform: `scaleX(${platform})`,
          }}
        />

        <div style={{ position: 'absolute', inset: 0, clipPath: 'inset(0 0 79px 0)' }}>
          <SubjectPanel side="left" progress={left} wobble={leftWobble} />
          <SubjectPanel side="right" progress={right} wobble={rightWobble} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 108,
            top: 205,
            width: 264,
            height: 74,
            clipPath: 'polygon(18% 0,82% 0,100% 100%,0 100%)',
            background: '#d9d9d6',
            opacity: interpolate(conclusion, [0, 0.18, 1], [0, 0.45, 1], CLAMP),
            transform: `translateY(${interpolate(conclusion, [0, 1], [96, 0])}px)`,
            display: 'grid',
            placeItems: 'start center',
            paddingTop: 19,
            boxSizing: 'border-box',
            color: '#4f5053',
            fontSize: 20,
            fontWeight: 850,
            letterSpacing: 1.8,
          }}
        >
          OUTCOME
        </div>
      </div>
    </DesignStage>
  );
};
