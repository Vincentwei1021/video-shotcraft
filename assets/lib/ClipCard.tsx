import React from 'react';
import {
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ClipCard — wraps an external video clip (mp4) into a "card hero" that shot
// recipes designed for DOM/SVG subjects (spotlight-hero-card,
// magician-card-flourish, neon-frame-orbit-drop, quad-split-parallel-scenes…)
// can drive directly. Fills the library gap where every card assumes generated
// DOM content or page screenshots, never real footage.
//
// Battle-tested in a delivered 39s promo (spotlight push-in at zoom 1.7 on a
// 512×512 clip; 3-up quad-split with 32px captions after a Q11 readability
// review finding — small cards need captionSize raised to keep ≥32px on-screen).
//
// Crossfade loop: OffthreadVideo (as of 4.0.484) has no `loop` prop and freezes
// past media end. Pass `loopDurationInFrames` to enable a seamless dissolve
// loop — each next pass fades in over the previous tail. The effective step is
// `loopDurationInFrames - startFrom` (a `startFrom` trim shortens the playable
// media), and layer count is derived from the enclosing shot's duration, not
// the Composition's, so a short shot inside a long composition doesn't spawn
// invisible layers. Layer audio is crossfaded with complementary `volume`
// curves so an unmuted loop doesn't stack two full-volume tracks.

const ACCENT = '#4da3ff';

// Each loop layer crossfades BOTH its audio and its opacity at its edges:
// an incoming fade 0→1 over `fadeIn` frames at the layer start, a steady body,
// then an outgoing fade 1→0 over `fadeOut` frames ending at `step` — the frame
// where the NEXT layer starts. Adjacent layers therefore overlap for exactly
// `crossfade` frames and their envelopes are complementary (sum to 1), so an
// unmuted loop never stacks two full-volume tracks; visual dissolve and audio
// crossfade stay in sync since they share the same envelope.
const LoopLayer: React.FC<{
  src: string;
  size: number;
  muted: boolean;
  startFrom: number;
  fadeIn: number;
  fadeOut: number;
  step: number;
}> = ({ src, size, muted, startFrom, fadeIn, fadeOut, step }) => {
  const frame = useCurrentFrame();

  // envelope(f): 0 at f=0 (unless fadeIn=0 → 1), 1 through the body, 0 at
  // f=step+fadeOut. Adjacent layers are spaced `step` apart and each fades
  // out over `fadeOut` into the next one's `fadeIn` window.
  let envelope: number;
  if (frame <= fadeIn) {
    envelope = fadeIn === 0 ? 1 : interpolate(frame, [0, fadeIn], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  } else if (frame <= step) {
    envelope = 1;
  } else {
    envelope = interpolate(frame, [step, step + fadeOut], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }

  const opacity = Math.max(0, Math.min(1, envelope));
  const volume = muted ? 1 : opacity;

  return (
    <OffthreadVideo
      src={staticFile(src)}
      muted={muted}
      volume={volume}
      startFrom={startFrom}
      style={{
        position: 'absolute',
        inset: 0,
        width: size,
        height: size,
        objectFit: 'cover',
        opacity,
      }}
    />
  );
};

export const ClipCard: React.FC<{
  src: string; // path under public/
  caption?: string; // monospace caption bar under the clip
  size?: number; // card edge (square clips)
  radius?: number;
  muted?: boolean;
  captionSize?: number; // default 17 — raise on small/far cards to keep ≥32px on-screen text
  startFrom?: number; // trim: play the clip from this frame
  style?: React.CSSProperties;
  loopDurationInFrames?: number; // playable clip length in comp frames → enables crossfade loop
  loopCrossfadeInFrames?: number; // default 8
  durationInFrames?: number; // enclosing shot duration — loop layer count is derived from this,
  // not the Composition duration (a short shot in a long composition)
}> = ({
  src,
  caption,
  size = 560,
  radius = 20,
  muted = true,
  startFrom = 0,
  style,
  captionSize = 17,
  loopDurationInFrames,
  loopCrossfadeInFrames = 8,
  durationInFrames,
}) => {
  const { durationInFrames: compDuration } = useVideoConfig();
  const capH = caption ? Math.round(captionSize * 2.6) : 0;

  let video: React.ReactNode;
  // Guard: a startFrom trim that reaches or exceeds the playable media (or any
  // degenerate step) must NOT loop — falling back to a plain single pass keeps
  // a visible, audible clip instead of a layer that instantly fades to 0.
  // step must also be >= crossfade, else >2 layers overlap at once and the
  // complementary envelopes no longer sum to 1 (visual/audio stack past full).
  const step = loopDurationInFrames
    ? loopDurationInFrames - startFrom - loopCrossfadeInFrames
    : 0;
  const canLoop =
    !!loopDurationInFrames &&
    loopDurationInFrames > loopCrossfadeInFrames &&
    step >= loopCrossfadeInFrames;
  if (canLoop) {
    const shotFrames = durationInFrames ?? compDuration;
    const n = Math.max(1, Math.ceil(shotFrames / step));
    video = (
      <div style={{ position: 'relative', width: size, height: size }}>
        {Array.from({ length: n }, (_, i) => (
          <Sequence
            key={i}
            from={i * step}
            durationInFrames={loopDurationInFrames}
            layout="none"
          >
            <LoopLayer
              src={src}
              size={size}
              muted={muted}
              startFrom={startFrom}
              fadeIn={i === 0 ? 0 : loopCrossfadeInFrames}
              fadeOut={loopCrossfadeInFrames}
              step={step}
            />
          </Sequence>
        ))}
      </div>
    );
  } else {
    video = (
      <OffthreadVideo
        src={staticFile(src)}
        muted={muted}
        startFrom={startFrom}
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size + capH,
        borderRadius: radius,
        background: '#111116',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {video}
      {caption ? (
        <div
          style={{
            height: capH,
            display: 'flex',
            alignItems: 'center',
            padding: '0 18px',
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: captionSize,
            color: 'rgba(255,255,255,0.72)',
            letterSpacing: 0.5,
            borderTop: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <span style={{ color: ACCENT, marginRight: 10 }}>▸</span>
          {caption}
        </div>
      ) : null}
    </div>
  );
};
