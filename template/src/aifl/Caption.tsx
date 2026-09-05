import { interpolate, useCurrentFrame } from 'remotion';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/** Context-level defaults, editable per clip in the workbench (hex = sRGB of the oklch tokens). */
export const CAPTION_DEFAULTS = {
  fontSize: 22,
  color: '#575552',  // oklch(45% 0.006 82)
  accent: '#955905', // oklch(52% 0.115 65)
};

/** Screen-space narration caption: a mono UI info-strip at the bottom of the
 * frame, led by a small amber square. Fades/rises in over 8 frames and fades
 * out over the last 8 of its window. */
export const Caption: React.FC<{
  text: string;
  duration: number;
  bottom?: number;
  fontSize?: number;
  color?: string;
  accent?: string;
}> = ({
  text,
  duration,
  bottom = 72,
  fontSize = CAPTION_DEFAULTS.fontSize,
  color = CAPTION_DEFAULTS.color,
  accent = CAPTION_DEFAULTS.accent,
}) => {
  const frame = useCurrentFrame();
  const inT = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outT = interpolate(frame, [duration - 8, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'baseline',
        gap: 14,
        fontFamily: MONO,
        fontSize,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color,
        opacity: inT * outT,
        transform: `translateY(${(1 - inT) * 8}px)`,
        pointerEvents: 'none',
      }}
    >
      <span style={{ width: 6, height: 6, background: accent, display: 'inline-block' }} />
      <span>{text}</span>
    </div>
  );
};
