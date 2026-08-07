import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SlideFrame} from '../shared/SlideFrame';

type OpeningProps = {
  company: string;
  oneLinePosition: string;
  slideImage: string;
  durationInFrames: number;
};

export const Opening: React.FC<OpeningProps> = ({
  company,
  oneLinePosition,
  slideImage,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleProgress = spring({
    fps,
    frame: frame - 10,
    config: {damping: 18, stiffness: 90, mass: 0.8},
  });
  const lineOpacity = interpolate(frame, [34, 58], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ruleWidth = interpolate(frame, [18, 72], [0, 720], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#071019', color: '#f5f2ea', fontFamily: 'Inter, PingFang SC, sans-serif'}}>
      <SlideFrame src={slideImage} durationInFrames={durationInFrames} dim={0.35} />
      <AbsoluteFill style={{padding: '92px 112px', justifyContent: 'space-between'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, fontSize: 22, letterSpacing: 4, color: '#8ce6d4'}}>
          <div style={{width: 46, height: 3, backgroundColor: '#8ce6d4'}} />
          PRIVATE INVESTMENT BRIEF
        </div>

        <div style={{marginBottom: 95}}>
          <div
            style={{
              fontSize: 104,
              fontWeight: 760,
              letterSpacing: -5,
              lineHeight: 1.02,
              transform: `translateY(${interpolate(titleProgress, [0, 1], [70, 0])}px)`,
              opacity: titleProgress,
              textShadow: '0 10px 45px rgba(0,0,0,0.4)',
            }}
          >
            {company}
          </div>
          <div style={{height: 3, width: ruleWidth, margin: '32px 0 30px', background: 'linear-gradient(90deg, #8ce6d4, rgba(140,230,212,0))'}} />
          <div style={{maxWidth: 1160, fontSize: 38, lineHeight: 1.45, fontWeight: 440, opacity: lineOpacity, color: '#e8ece9'}}>
            {oneLinePosition}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
