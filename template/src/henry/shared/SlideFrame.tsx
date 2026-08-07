import type {CSSProperties} from 'react';
import {Img, interpolate, useCurrentFrame} from 'remotion';

type SlideFrameProps = {
  src: string;
  durationInFrames: number;
  style?: CSSProperties;
  imageStyle?: CSSProperties;
  dim?: number;
};

export const SlideFrame: React.FC<SlideFrameProps> = ({
  src,
  durationInFrames,
  style,
  imageStyle,
  dim = 0.16,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(progress, [0, 1], [1.025, 1.085]);
  const translateX = interpolate(progress, [0, 1], [-1.4, 1.4]);
  const translateY = interpolate(progress, [0, 1], [0.8, -0.8]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: '#071019',
        ...style,
      }}
    >
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
          ...imageStyle,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(120deg, rgba(4, 10, 18, ${Math.min(dim + 0.42, 0.92)}), rgba(4, 10, 18, ${dim}))`,
        }}
      />
    </div>
  );
};
