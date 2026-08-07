import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SlideFrame} from '../shared/SlideFrame';

type ThesisProps = {
  thesisPoints: [string, string, string];
  slideImage: string;
  durationInFrames: number;
};

const ThesisCard: React.FC<{index: number; point: string}> = ({index, point}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = spring({
    fps,
    frame,
    config: {damping: 19, stiffness: 110, mass: 0.85},
  });

  return (
    <div
      style={{
        width: 485,
        minHeight: 292,
        padding: '40px 42px',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.16)',
        background: index === 1 ? 'linear-gradient(150deg, rgba(31,78,75,0.96), rgba(12,35,40,0.96))' : 'linear-gradient(150deg, rgba(21,35,48,0.96), rgba(8,19,29,0.96))',
        boxShadow: '0 30px 60px rgba(0,0,0,0.34)',
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [72, 0])}px) scale(${interpolate(progress, [0, 1], [0.94, 1])})`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32}}>
        <div style={{fontSize: 22, letterSpacing: 3, fontWeight: 700, color: '#8ce6d4'}}>THESIS {String(index + 1).padStart(2, '0')}</div>
        <div style={{fontSize: 52, fontWeight: 760, color: 'rgba(255,255,255,0.14)'}}>0{index + 1}</div>
      </div>
      <div style={{fontSize: 35, lineHeight: 1.48, fontWeight: 580, color: '#f2f1eb'}}>{point}</div>
    </div>
  );
};

export const Thesis: React.FC<ThesisProps> = ({thesisPoints, slideImage, durationInFrames}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{backgroundColor: '#071019', color: '#f7f4ed', fontFamily: 'Inter, PingFang SC, sans-serif', overflow: 'hidden'}}>
      <SlideFrame src={slideImage} durationInFrames={durationInFrames} dim={0.74} imageStyle={{filter: 'saturate(0.65)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 85% 20%, rgba(84,173,157,0.18), transparent 38%)'}} />
      <div style={{position: 'absolute', top: 82, left: 112, right: 112, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between'}}>
        <div>
          <div style={{fontSize: 21, fontWeight: 700, letterSpacing: 4, color: '#8ce6d4', marginBottom: 17}}>02 · INVESTMENT THESIS</div>
          <div style={{fontSize: 68, fontWeight: 740, letterSpacing: -2.5}}>三条判断，逐项验证</div>
        </div>
        <div style={{fontSize: 21, color: 'rgba(255,255,255,0.64)', marginBottom: 10}}>40 秒投资摘要 · 结构化证据</div>
      </div>

      <div style={{position: 'absolute', left: 112, right: 112, top: 282, display: 'flex', gap: 38}}>
        {thesisPoints.map((point, index) => (
          <Sequence key={point} from={index * 48} durationInFrames={durationInFrames - index * 48}>
            <ThesisCard index={index} point={point} />
          </Sequence>
        ))}
      </div>

      <div style={{position: 'absolute', left: 112, bottom: 78, width: 1696, height: 3, backgroundColor: 'rgba(255,255,255,0.12)'}}>
        <div style={{width: `${interpolate(frame, [0, durationInFrames], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}%`, height: '100%', background: 'linear-gradient(90deg, #8ce6d4, #d7b76b)'}} />
      </div>
    </AbsoluteFill>
  );
};
