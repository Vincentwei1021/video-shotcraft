import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam, CamKey } from './PageCam';
import { AIFL_SHOTS } from '../Main';
import layout from '../live-layout.json';
import { DigitRoll } from '../DigitRoll';

const cards = layout.papers.cards;
const PAGE_H = layout.papers.pageH;

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/** Context-level defaults (screen-space counter copy / palette), editable per clip in the workbench. */
export const SCENE_PAPERS_DEFAULTS = {
  title: 'Paper Radar',
  subtitle: 'Of 31 Fetched Today',
  counterSize: 96,
  amber: '#955905',  // oklch(52% 0.115 65)
  muted: '#65635f',  // oklch(50% 0.006 82)
};
type ScenePapersProps = Partial<typeof SCENE_PAPERS_DEFAULTS>;

// paperN.png files, one per card
const FILES = ['paper1.png', 'paper2.png', 'paper3.png', 'paper4.png', 'paper5.png'];

// each card enters at cue, staggered 12 frames, over dur=22 with overshoot ease
const CUES = [18, 30, 42, 54, 66];
const DUR = 22;
const FLY_EASE = Easing.bezier(0.45, 0.05, 0.25, 1.12);
// alternating slight tilt on entry
const TILTS = [2, -2, 2, -2, 2];

// camera reveals the header first, then follows the growing stack downward
const CAM_KEYS: CamKey[] = [
  { frame: 0, cx: 960, cy: 270, zoom: 1.35 },
  { frame: 30, cx: 960, cy: 330, zoom: 1.15 },
  { frame: 36, cx: 960, cy: 520, zoom: 1.02 },
  { frame: 74, cx: 960, cy: 820, zoom: 0.95 },
  { frame: 100, cx: 960, cy: 860, zoom: 0.9 }, // settle ≤105
];

/** Paper radar: daily paper cards stack up into place one by one (the list-stack
 * motif), each landing pressing the settled stack down and bouncing back, with
 * an amber highlight sweeping the linked-project name and a screen-space counter. */
export const ScenePapers: React.FC<ScenePapersProps> = (props) => {
  const { title, subtitle, counterSize, amber: AMBER, muted } = { ...SCENE_PAPERS_DEFAULTS, ...props };
  const frame = useCurrentFrame();

  // how many cards have already landed (t reached 1) — drives the counter
  const landedCount = CUES.filter((c) => frame >= c + DUR).length;

  // when a *later* card enters, the already-settled stack gets pressed down 6px
  // then springs back over ~8 frames. Compute cumulative press for settled cards.
  const stackPress = (settledIndex: number) => {
    let press = 0;
    for (let j = settledIndex + 1; j < CUES.length; j++) {
      const cue = CUES[j];
      // press pulse centered a touch after the later card starts arriving
      const p = interpolate(
        frame,
        [cue, cue + 4, cue + 8],
        [0, 6, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      press = Math.max(press, p);
    }
    return press;
  };

  // page-space glaze sweep once everything has landed (~frame 96)
  const glazeX = interpolate(frame, [82, 96], [-700, 2600], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.35, 1),
  });
  const glazeVis = interpolate(frame, [81, 86, 92, 95], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <>
      <PageCam src="textures/live/papers-full.png" pageH={PAGE_H} keys={CAM_KEYS} ease={Easing.bezier(0.33, 0, 0.15, 1)}>
        {/* cover the printed cards on the base page so blank slots stack in.
            The base texture already shows the cards; we lay opaque paper
            patches over their positions so the fly-in reads as "stacking". */}
        {cards.map((c, i) => (
          <div
            key={`slot-${i}`}
            style={{
              position: 'absolute',
              left: c.x - 12,
              top: c.y - 10,
              width: c.w + 24,
              height: c.h + 20,
              background: '#faf7f2',
              opacity: frame >= CUES[i] + DUR - 2 ? 0 : 1,
            }}
          />
        ))}

        {cards.map((c, i) => {
          const cue = CUES[i];
          const t = interpolate(frame, [cue, cue + DUR], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: FLY_EASE,
          });
          if (t <= 0) return null;
          const settled = t >= 0.999;
          const dy = 600 * (1 - t) + (settled ? stackPress(i) : 0);
          const rot = TILTS[i] * (1 - t);
          const scale = 1.06 - 0.06 * t;
          const shadow = settled
            ? '0 2px 8px rgba(60,45,30,.10)'
            : `0 32px 64px rgba(60,45,30,${0.22 * (1 - t) + 0.06})`;

          // amber highlight over the linked-project name, 6 frames after landing.
          // card-relative: x ~20px in, y ~72% of card height, ~40% wide.
          // fires right on landing; the last card only has ~12f before the cut,
          // so grow+fade is compressed to fit (7f grow + 5f fade).
          const hlStart = cue + DUR;
          const hlGrow = interpolate(frame, [hlStart, hlStart + 7], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
          });
          const hlFade = interpolate(frame, [hlStart + 7, hlStart + 12], [1, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });

          return (
            <div
              key={FILES[i]}
              style={{
                position: 'absolute',
                left: c.x,
                top: c.y,
                width: c.w,
                height: c.h,
                transform: `translateY(${dy}px) rotate(${rot}deg) scale(${scale})`,
                transformOrigin: 'center center',
                boxShadow: shadow,
                borderRadius: 12,
              }}
            >
              <Img
                src={staticFile(`textures/live/${FILES[i]}`)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
              />
              {/* amber highlight sweep on the linked-project name */}
              {hlGrow > 0 && hlFade > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: 20,
                    top: c.h * 0.72,
                    width: `${hlGrow * 40}%`,
                    height: 30,
                    background: 'oklch(97% 0.028 85)',
                    opacity: 0.6 * hlFade,
                    borderRight: `2px solid ${AMBER}`,
                    pointerEvents: 'none',
                  }}
                />
              ) : null}
            </div>
          );
        })}

        {/* page-space glaze sweep at the end */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            height: PAGE_H - 80,
            left: glazeX,
            width: 420,
            transform: 'rotate(14deg)',
            opacity: glazeVis * 0.5,
            mixBlendMode: 'overlay',
            background:
              'linear-gradient(90deg, transparent, rgba(255,240,214,0.9) 45%, rgba(255,240,214,0.9) 55%, transparent)',
            pointerEvents: 'none',
          }}
        />
      </PageCam>

      {/* screen-space counter, top-right */}
      <div style={{ position: 'absolute', top: 70, right: 96, textAlign: 'right', pointerEvents: 'none' }}>
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: '0.16em', color: muted, textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <DigitRoll key={landedCount} value={String(landedCount)} fontSize={counterSize} color={AMBER} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: '0.12em', color: muted, marginTop: 4, textTransform: 'uppercase' }}>
          {subtitle}
        </div>
      </div>
    </>
  );
};
