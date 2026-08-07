import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SlideFrame} from '../shared/SlideFrame';

type ProblemProps = {
  problem: string;
  slideImage: string;
  durationInFrames: number;
};

export const Problem: React.FC<ProblemProps> = ({problem, slideImage, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const panelProgress = spring({
    fps,
    frame: frame - 8,
    config: {damping: 20, stiffness: 105, mass: 0.9},
  });
  const imageProgress = spring({
    fps,
    frame: frame - 22,
    config: {damping: 22, stiffness: 95},
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#071019', color: '#f7f4ed', fontFamily: 'Inter, PingFang SC, sans-serif'}}>
      <div
        style={{
          position: 'absolute',
          right: 86,
          top: 95,
          width: 930,
          height: 770,
          borderRadius: 28,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 36px 90px rgba(0,0,0,0.45)',
          opacity: imageProgress,
          transform: `translateX(${interpolate(imageProgress, [0, 1], [100, 0])}px) rotate(1.5deg)`,
        }}
      >
        <SlideFrame src={slideImage} durationInFrames={durationInFrames} dim={0.08} imageStyle={{objectFit: 'contain', backgroundColor: '#f6f2e7'}} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 96,
          top: 172,
          width: 760,
          padding: '62px 66px 68px',
          borderRadius: 30,
          background: 'linear-gradient(145deg, rgba(17,32,43,0.96), rgba(8,18,28,0.91))',
          border: '1px solid rgba(140,230,212,0.28)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.42)',
          opacity: panelProgress,
          transform: `translateY(${interpolate(panelProgress, [0, 1], [76, 0])}px)`,
        }}
      >
        <div style={{fontSize: 20, fontWeight: 700, letterSpacing: 4, color: '#8ce6d4', marginBottom: 28}}>01 · 核心问题</div>
        <div style={{fontSize: 46, lineHeight: 1.43, fontWeight: 650, letterSpacing: -1.2}}>{problem}</div>
        <div style={{marginTop: 46, height: 4, width: `${interpolate(frame, [28, 150], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}%`, background: 'linear-gradient(90deg, #8ce6d4, #d8b86c)'}} />
      </div>
    </AbsoluteFill>
  );
};
