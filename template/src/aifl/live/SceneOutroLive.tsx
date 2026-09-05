import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam, CamKey } from './PageCam';
import { AIFL_SHOTS } from '../Main';
import layout from '../live-layout.json';

const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
/** Context-level defaults (copy / sizes / palette), editable per clip in the workbench. */
export const SCENE_OUTRO_DEFAULTS = {
  wordmark: 'AI Foundation Lab',
  wordmarkSize: 148,
  tagline: 'Team Research Console',
  taglineSize: 25,
  ink: '#13110f',    // oklch(18% 0.006 82)
  amber: '#955905',  // oklch(52% 0.115 65)
  muted: '#65635f',  // oklch(50% 0.006 82)
};
type SceneOutroProps = Partial<typeof SCENE_OUTRO_DEFAULTS>;
const PAGE_H = layout.projects.pageH;
const WBR_PAGE_H = layout.wbr.pageH;

// real overshoot on landing (the old bezier(0.25,0.9,0.3,1) never crossed 1)
const FLY_EASE = Easing.bezier(0.34, 1.4, 0.44, 1);
const CRANE_EASE = Easing.bezier(0.3, 0, 0.2, 1);

/** One member of the group photo: a page element flying in from off-screen
 * to its settled pose around the wordmark. Sizes are 1x CSS px (textures 2x). */
type FlyEl = {
  key: string;
  file: string;
  w: number;
  h: number;
  cx: number;
  cy: number;
  scale: number;
  rot: number; // settled rotation, deg
  dx: number; // fly-in start offset
  dy: number;
  radius: number;
  cue: number; // scene frame the 12f flight starts
  wbrCrop?: boolean; // element I: crop out of wbr-full.png as a background
};

// render order = cue order, so later arrivals stack on top
const ELS: FlyEl[] = [
  { key: 'nav', file: 'nav.png', w: 1920, h: 61, cx: 960, cy: 84, scale: 0.62, rot: 0, dx: 0, dy: -120, radius: 10, cue: 4 },
  { key: 'card4', file: 'card4-hires.png', w: 358, h: 312, cx: 300, cy: 400, scale: 0.72, rot: -5, dx: -500, dy: 0, radius: 16, cue: 7 },
  { key: 'card1', file: 'card1.png', w: 358, h: 288, cx: 1630, cy: 380, scale: 0.68, rot: 4, dx: 500, dy: 0, radius: 16, cue: 10 },
  { key: 'paper1', file: 'paper1.png', w: 1104, h: 225, cx: 1460, cy: 730, scale: 0.5, rot: -3, dx: 450, dy: 260, radius: 12, cue: 13 },
  { key: 'card7', file: 'card7.png', w: 358, h: 312, cx: 260, cy: 800, scale: 0.6, rot: 3, dx: -400, dy: 300, radius: 16, cue: 16 },
  { key: 'paper3', file: 'paper3.png', w: 1104, h: 225, cx: 620, cy: 930, scale: 0.48, rot: 2, dx: 0, dy: 320, radius: 12, cue: 19 },
  { key: 'search', file: 'float-search.png', w: 1016, h: 44, cx: 760, cy: 180, scale: 0.55, rot: -1.5, dx: 0, dy: -240, radius: 10, cue: 22 },
  { key: 'stats', file: 'float-stats.png', w: 315, h: 56, cx: 1560, cy: 950, scale: 0.9, rot: -2, dx: 380, dy: 0, radius: 10, cue: 25 },
  { key: 'wbr', file: 'wbr-full.png', w: 688, h: 54, cx: 1620, cy: 170, scale: 0.8, rot: 2.5, dx: 360, dy: -200, radius: 8, cue: 28, wbrCrop: true },
];

// 20 gold dust motes, all parameters index-derived (deterministic)
const DUST = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 439 + 137) % 1920,
  y0: (i * 613 + 271) % 1080,
  rise: 0.3 + (i % 5) * 0.11, // px/frame upward
  swayAmp: 9 + (i % 4) * 5,
  swayFreq: 0.022 + (i % 3) * 0.008,
  phase: (i * 0.83) % (Math.PI * 2),
  size: 2 + (i % 3) * 0.5, // 2–3px
  opacity: 0.15 + ((i * 7) % 5) * 0.05, // 0.15–0.35
}));

/** Sign-off reworked as a "group photo": core elements from every page fly in
 * from off-screen in staggered beats and settle in an arc around the center;
 * then the letterpressed "AI Foundation Lab" wordmark appears while the assembled
 * elements recede slightly into the background — teammates in the back row.
 * Launch-event treatment: a crane-in camera on the whole photo layer, ghost
 * trails + landing glows on the fly-ins, a stage light behind the wordmark,
 * gold dust and a single opening light sweep for atmosphere. */
export const SceneOutroLive: React.FC<SceneOutroProps> = (props) => {
  const { wordmark, wordmarkSize, tagline, taglineSize, ink, amber, muted } = { ...SCENE_OUTRO_DEFAULTS, ...props };
  const LETTERS = wordmark.split('');
  const frame = useCurrentFrame();
  const duration = AIFL_SHOTS.outro.duration; // 115

  const blur = interpolate(frame, [0, 24], [0, 14], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.4, 1),
  });
  const rule = interpolate(frame, [58, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const tag = interpolate(frame, [68, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [duration - 12, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // as the wordmark takes the stage (42–50) the assembled elements step back
  const recede = interpolate(frame, [42, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ---- camera crane on the whole group-photo layer (wordmark stays outside) ----
  // 0–40: crane down from a slight top angle onto the stage; 40–end: keep breathing in
  const craneT = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: CRANE_EASE,
  });
  const pushT = interpolate(frame, [40, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const camScale = 1.06 - 0.06 * craneT + 0.035 * pushT;
  const camTilt = 4 * (1 - craneT); // rotateX deg

  // opening light sweep: one wide, faint warm band crossing the screen, 2–14
  const sweepX = interpolate(frame, [2, 14], [-700, 2020], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.6, 1),
  });
  const sweepOpacity = interpolate(frame, [2, 5, 11, 14], [0, 0.12, 0.12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // stage light behind the wordmark: 0 → 0.5 → 0.25 across 42–58
  const stageLight = interpolate(frame, [42, 50, 58], [0, 0.5, 0.25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // closing vignette focuses the center from the wordmark beat on
  const vignette = interpolate(frame, [42, 54], [0, 0.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // rule extension lines: shoot out to ±320px (58–66), then fade over 6 frames
  const ruleExt = interpolate(frame, [58, 66], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const ruleExtFade = interpolate(frame, [66, 72], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // one breath of letter-spacing once the wordmark is fully set (62–66)
  const wordSpacing = interpolate(frame, [62, 66], [-0.01, 0.005], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });

  const CAM: CamKey[] = [{ frame: 0, cx: 960, cy: 700, zoom: 0.75 }];

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* ---- group-photo layer under a slow crane-in camera ---- */}
      <AbsoluteFill
        style={{
          transform: `perspective(1400px) rotateX(${camTilt}deg) scale(${camScale})`,
          transformOrigin: '50% 45%',
        }}
      >
        <PageCam src="textures/live/projects-full.png" pageH={PAGE_H} keys={CAM} blur={blur} saturate={0.9} />
        {/* warm scrim under the flying elements: keeps the center legible without washing them */}
        <AbsoluteFill style={{ background: 'radial-gradient(1200px 800px at 50% 48%, rgba(250,247,242,0.82), rgba(250,247,242,0.55) 60%, rgba(250,247,242,0.35))', pointerEvents: 'none' }} />

        {/* group photo: elements fly in from all sides and settle around the wordmark */}
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {ELS.map((el) => {
            if (frame < el.cue) return null;

            const t = interpolate(frame, [el.cue, el.cue + 12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: FLY_EASE,
            });
            const opacity = interpolate(frame, [el.cue, el.cue + 3], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            const x = el.dx * (1 - t);
            const y = el.dy * (1 - t);
            const rot = el.rot * (2 - t); // rot×2 in flight → rot settled
            const scale = el.scale * (1.12 - 0.12 * t);

            // shadow: big and soft while airborne, tightening to a dual layer at rest
            const air = Math.max(0, 1 - t);
            const shadow =
              air > 0.01
                ? `0 ${10 + 26 * air}px ${24 + 46 * air}px rgba(30,25,18,${0.16 + 0.1 * air}), 0 2px 6px rgba(30,25,18,.08)`
                : '0 10px 24px rgba(30,25,18,.16), 0 2px 6px rgba(30,25,18,.08)';

            const settledOpacity = opacity * (1 - 0.12 * recede);
            const saturate = 1 - 0.08 * recede;

            const texture = el.wbrCrop
              ? {
                  background: `#fff url(${staticFile(`textures/live/${el.file}`)}) -576px -173px / 1920px ${WBR_PAGE_H}px no-repeat`,
                  border: '1px solid oklch(90% .008 82)',
                }
              : null;

            // ghost trail while airborne: a blurred faint copy lagging 8% along the path
            const linT = interpolate(frame, [el.cue, el.cue + 12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const showGhost = linT > 0.05 && linT < 0.95;

            // landing glow: an amber spot blooming at the bbox center as the element sets
            const glow = interpolate(frame, [el.cue + 12, el.cue + 18], [0.35, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const showGlow = frame >= el.cue + 12 && frame < el.cue + 18;
            const glowR = el.w * el.scale * 0.5;

            return (
              <div key={el.key}>
                {showGhost ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: el.cx - el.w / 2,
                      top: el.cy - el.h / 2,
                      width: el.w,
                      height: el.h,
                      transform: `translate(${x + el.dx * 0.08}px, ${y + el.dy * 0.08}px) rotate(${rot}deg) scale(${scale})`,
                      transformOrigin: 'center center',
                      borderRadius: el.radius,
                      overflow: 'hidden',
                      opacity: 0.2 * Math.max(0, 1 - linT),
                      filter: 'blur(8px)',
                      ...texture,
                    }}
                  >
                    {el.wbrCrop ? null : (
                      <Img
                        src={staticFile(`textures/live/${el.file}`)}
                        style={{ position: 'absolute', inset: 0, width: el.w, height: el.h, display: 'block' }}
                      />
                    )}
                  </div>
                ) : null}
                <div
                  style={{
                    position: 'absolute',
                    left: el.cx - el.w / 2,
                    top: el.cy - el.h / 2,
                    width: el.w,
                    height: el.h,
                    transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
                    transformOrigin: 'center center',
                    borderRadius: el.radius,
                    overflow: 'hidden',
                    boxShadow: shadow,
                    opacity: settledOpacity,
                    filter: `saturate(${saturate})`,
                    ...texture,
                  }}
                >
                  {el.wbrCrop ? null : (
                    <Img
                      src={staticFile(`textures/live/${el.file}`)}
                      style={{ position: 'absolute', inset: 0, width: el.w, height: el.h, display: 'block' }}
                    />
                  )}
                </div>
                {showGlow ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: el.cx - glowR,
                      top: el.cy - glowR,
                      width: glowR * 2,
                      height: glowR * 2,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, oklch(78% 0.13 70 / 0.9), oklch(78% 0.13 70 / 0) 70%)',
                      opacity: glow,
                      mixBlendMode: 'multiply',
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ---- atmosphere: gold dust drifting up in front of the group photo ---- */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {DUST.map((d, i) => {
          const y = (((d.y0 - frame * d.rise) % 1080) + 1080) % 1080;
          const x = d.x + Math.sin(frame * d.swayFreq + d.phase) * d.swayAmp;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: d.size,
                height: d.size,
                borderRadius: '50%',
                background: 'oklch(75% 0.08 85)',
                opacity: d.opacity,
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* opening light sweep: one wide, faint warm band left → right (2–14) */}
      {sweepOpacity > 0 ? (
        <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: sweepX - 300,
              width: 600,
              background: 'linear-gradient(90deg, rgba(255,244,224,0), rgba(255,244,224,1) 50%, rgba(255,244,224,0))',
              opacity: sweepOpacity,
            }}
          />
        </AbsoluteFill>
      ) : null}

      {/* stage light behind the wordmark: warm top-light pooling where the logo lands */}
      {stageLight > 0 ? (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: 'radial-gradient(700px 360px at 960px 470px, rgba(255,246,228,0.95), rgba(255,246,228,0.35) 55%, rgba(255,246,228,0) 75%)',
            opacity: stageLight,
          }}
        />
      ) : null}

      {/* closing vignette: faint warm-brown corners focus the center */}
      {vignette > 0 ? (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: 'radial-gradient(1400px 900px at 50% 50%, rgba(62,48,32,0) 55%, rgba(62,48,32,0.7) 100%)',
            opacity: vignette,
          }}
        />
      ) : null}

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontSize: wordmarkSize, fontWeight: 600, color: ink, letterSpacing: `${wordSpacing}em`, display: 'flex' }}>
            {LETTERS.map((ch, i) => {
              const delay = Math.round(42 + i * 1.8);
              const t = interpolate(frame, [delay, delay + 8], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.bezier(0.2, 0.75, 0.3, 1),
              });
              return (
                <span
                  key={i}
                  style={{
                    opacity: t,
                    transform: `translateY(${(1 - t) * 28}px) scale(${1.35 - 0.35 * t})`,
                    filter: `blur(${(1 - t) * 8}px)`,
                    display: 'inline-block',
                    whiteSpace: 'pre',
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          <div style={{ position: 'relative', height: 6, width: 260, margin: '34px auto 0' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 3, background: amber, transform: `scaleX(${rule})` }} />
            {/* launch lower-third: 1px amber lines shooting out from the rule ends, then fading */}
            {ruleExt > 0 && ruleExtFade > 0 ? (
              <>
                <div style={{ position: 'absolute', top: 2.5, height: 1, right: '100%', width: 190 * ruleExt, background: amber, opacity: ruleExtFade }} />
                <div style={{ position: 'absolute', top: 2.5, height: 1, left: '100%', width: 190 * ruleExt, background: amber, opacity: ruleExtFade }} />
              </>
            ) : null}
          </div>
          <div style={{ fontFamily: MONO, fontSize: taglineSize, letterSpacing: '0.14em', color: muted, marginTop: 30, opacity: tag, textTransform: 'uppercase' }}>
            {tagline}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
