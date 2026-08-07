import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SlideFrame} from '../shared/SlideFrame';

type VerdictProps = {
  oneLinePosition: string;
  risks: [string, string];
  nextDiligence: string;
  slideImage: string;
  durationInFrames: number;
};

const RiskPanel: React.FC<{risks: [string, string]}> = ({risks}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = spring({fps, frame, config: {damping: 20, stiffness: 100}});

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 17, opacity: progress, transform: `translateX(${interpolate(progress, [0, 1], [60, 0])}px)`}}>
      {risks.map((risk, index) => (
        <div key={risk} style={{display: 'grid', gridTemplateColumns: '56px 1fr', gap: 18, alignItems: 'start', padding: '23px 26px', borderRadius: 20, backgroundColor: 'rgba(127,49,48,0.28)', border: '1px solid rgba(235,141,127,0.28)'}}>
          <div style={{fontSize: 20, fontWeight: 760, color: '#f2a69b'}}>R{index + 1}</div>
          <div style={{fontSize: 27, lineHeight: 1.42, fontWeight: 520}}>{risk}</div>
        </div>
      ))}
    </div>
  );
};

export const Verdict: React.FC<VerdictProps> = ({
  oneLinePosition,
  risks,
  nextDiligence,
  slideImage,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#071019', color: '#f7f4ed', fontFamily: 'Inter, PingFang SC, sans-serif'}}>
      <SlideFrame src={slideImage} durationInFrames={durationInFrames} dim={0.78} imageStyle={{filter: 'saturate(0.55)'}} />
      <AbsoluteFill style={{padding: '72px 102px 62px', opacity}}>
        <div style={{fontSize: 20, fontWeight: 700, letterSpacing: 4, color: '#8ce6d4', marginBottom: 19}}>03 · VERDICT & NEXT STEP</div>
        <div style={{fontSize: 48, fontWeight: 720, lineHeight: 1.34, maxWidth: 1580, letterSpacing: -1.2}}>{oneLinePosition}</div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 42, marginTop: 44}}>
          <div style={{padding: '32px 34px', borderRadius: 24, backgroundColor: 'rgba(8,24,31,0.9)', border: '1px solid rgba(140,230,212,0.24)'}}>
            <div style={{fontSize: 19, letterSpacing: 3, color: '#8ce6d4', fontWeight: 700, marginBottom: 20}}>下一步尽调</div>
            <div style={{fontSize: 31, lineHeight: 1.5, fontWeight: 580}}>{nextDiligence}</div>
          </div>

          <Sequence from={30} durationInFrames={240}>
            <RiskPanel risks={risks} />
          </Sequence>
        </div>

        <div style={{marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, color: 'rgba(255,255,255,0.58)', letterSpacing: 1.5}}>
          <div>LOCAL MVP · SOURCE-BOUNDED</div>
          <div style={{padding: '10px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)'}}>内部研究演示 · 非投资建议</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
