import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { DigitRoll } from './DigitRoll';

const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/** Context-level defaults (copy size / palette). Exposed as props so the
 * workbench can edit them per clip; the motion timing stays fixed. Hex values
 * are the sRGB renderings of the original oklch tokens. */
export const TITLE_CARD_DEFAULTS = {
  fontSize: 116,
  ink: '#13110f',    // oklch(18% 0.006 82)
  accent: '#955905', // oklch(52% 0.115 65)
  muted: '#65635f',  // oklch(50% 0.006 82)
  paper: '#f9f6f1',  // oklch(97.5% 0.008 82)
};

/**
 * Paper title card: warm paper field, serif statement letterpressed word by
 * word, amber italic accent word, amber underline growing beneath.
 */
export const PaperTitleCard: React.FC<{
  duration: number;
  words: { text: string; accent?: boolean }[];
  sub?: string;
  subDigits?: string;
  fontSize?: number;
  ink?: string;
  accent?: string;
  muted?: string;
  paper?: string;
}> = ({
  duration, words, sub, subDigits,
  fontSize = TITLE_CARD_DEFAULTS.fontSize,
  ink = TITLE_CARD_DEFAULTS.ink,
  accent = TITLE_CARD_DEFAULTS.accent,
  muted = TITLE_CARD_DEFAULTS.muted,
  paper = TITLE_CARD_DEFAULTS.paper,
}) => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [duration - 8, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const underline = interpolate(frame, [16, 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const subT = interpolate(frame, [10, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: paper,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeOut,
        backgroundImage: 'radial-gradient(1100px 750px at 50% 42%, oklch(99.3% 0.014 88 / 0.85), transparent 65%)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 1500 }}>
        <div
          style={{
            fontFamily: SERIF, fontSize, fontWeight: 600, lineHeight: 1.14,
            color: ink, letterSpacing: '-0.012em',
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.26em',
          }}
        >
          {words.map((w, i) => {
            const delay = 4 + i * 4;
            const t = interpolate(frame, [delay, delay + 9], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.bezier(0.2, 0.75, 0.3, 1),
            });
            return (
              <span
                key={i}
                style={{
                  opacity: t,
                  transform: `scale(${1.28 - 0.28 * t})`,
                  filter: `blur(${(1 - t) * 7}px)`,
                  display: 'inline-block',
                  fontStyle: w.accent ? 'italic' : 'normal',
                  color: w.accent ? accent : undefined,
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
        <div
          style={{
            height: 6, width: 220, margin: '38px auto 0', borderRadius: 3,
            background: accent, transform: `scaleX(${underline})`,
          }}
        />
        {sub ? (
          <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: '0.12em', color: muted, marginTop: 34, opacity: subT, textTransform: 'uppercase', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '0.5em' }}>
            {subDigits ? <DigitRoll value={subDigits} delay={12} fontSize={26} color={accent} /> : null}
            <span>{sub}</span>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
