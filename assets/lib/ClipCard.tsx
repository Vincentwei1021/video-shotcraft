import React from 'react';
import { OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

// ClipCard — wraps an external video clip (mp4) into a "card hero" that shot
// recipes designed for DOM/SVG subjects (spotlight-hero-card,
// magician-card-flourish, neon-frame-orbit-drop, quad-split…) can drive
// directly. Fills the library gap where every card assumes generated DOM
// content or page screenshots, never real footage.
//
// Battle-tested in a delivered 39s promo (spotlight push-in at zoom 1.7 on a
// 512×512 clip; 3-up quad-split with 32px captions after a Q11 readability
// review finding — small cards need captionSize raised to keep ≥32px).
//
// Crossfade loop: OffthreadVideo (as of 4.0.410) has no `loop` prop and
// freezes past media end. Set `loopDurationInFrames` to the clip's length in
// composition frames and each next pass fades in `loopCrossfadeInFrames`
// early over the previous tail — reads as a seamless dissolve, not a jump cut.
// Layer count derives from the enclosing Sequence duration automatically.

const ACCENT = '#4da3ff'; // swap for your brand accent

const LoopLayer: React.FC<{
  src: string; size: number; muted: boolean; startFrom: number; fadeIn: number;
}> = ({ src, size, muted, startFrom, fadeIn }) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn > 0
    ? interpolate(frame, [0, fadeIn], [0, 1], { extrapolateRight: 'clamp' })
    : 1;
  return (
    <OffthreadVideo
      src={staticFile(src)} muted={muted} startFrom={startFrom}
      style={{ position: 'absolute', inset: 0, width: size, height: size, objectFit: 'cover', opacity }}
    />
  );
};

export const ClipCard: React.FC<{
  src: string;              // path under public/
  caption?: string;         // monospace caption bar under the clip
  size?: number;            // card edge (square clips)
  radius?: number;
  muted?: boolean;
  captionSize?: number;     // default 17 — raise on small/far cards to keep ≥32px on-screen text
  startFrom?: number;
  style?: React.CSSProperties;
  loopDurationInFrames?: number;   // clip length in comp frames → enables crossfade loop
  loopCrossfadeInFrames?: number;  // default 8
}> = ({
  src, caption, size = 560, radius = 20, muted = true, startFrom = 0, style,
  captionSize = 17, loopDurationInFrames, loopCrossfadeInFrames = 8,
}) => {
  const { durationInFrames } = useVideoConfig();
  const capH = caption ? Math.round(captionSize * 2.6) : 0;

  let video: React.ReactNode;
  if (loopDurationInFrames && loopDurationInFrames > loopCrossfadeInFrames) {
    const step = loopDurationInFrames - loopCrossfadeInFrames;
    const n = Math.max(1, Math.ceil(durationInFrames / step));
    video = (
      <div style={{ position: 'relative', width: size, height: size }}>
        {Array.from({ length: n }, (_, i) => (
          <Sequence key={i} from={i * step} durationInFrames={loopDurationInFrames} layout="none">
            <LoopLayer
              src={src} size={size} muted={muted} startFrom={startFrom}
              fadeIn={i === 0 ? 0 : loopCrossfadeInFrames}
            />
          </Sequence>
        ))}
      </div>
    );
  } else {
    video = (
      <OffthreadVideo
        src={staticFile(src)} muted={muted} startFrom={startFrom}
        style={{ width: size, height: size, objectFit: 'cover', display: 'block' }}
      />
    );
  }

  return (
    <div
      style={{
        width: size, height: size + capH, borderRadius: radius,
        background: '#111116', border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.55)', overflow: 'hidden', ...style,
      }}
    >
      {video}
      {caption ? (
        <div style={{
          height: capH, display: 'flex', alignItems: 'center', padding: '0 18px',
          fontFamily: 'ui-monospace, Menlo, monospace', fontSize: captionSize,
          color: 'rgba(255,255,255,0.72)', letterSpacing: 0.5,
          borderTop: '1px solid rgba(255,255,255,0.10)',
        }}>
          <span style={{ color: ACCENT, marginRight: 10 }}>▸</span>{caption}
        </div>
      ) : null}
    </div>
  );
};
