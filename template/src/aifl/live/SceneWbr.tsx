import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { PageCam, CamKey } from './PageCam';
import layout from '../live-layout.json';

type Block = { x: number; y: number; w: number; h: number; tag: string };
const blocks = layout.wbr.blocks as Block[];
const leftRail = layout.wbr.leftRail;
const rightRail = layout.wbr.rightRail;
const PAGE_H = layout.wbr.pageH;

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const PAPER = '#fdfcfa';
const AMBER_WASH = 'oklch(95% 0.05 85)';

// editor-title close-up → ease out to the whole page (both rails on camera)
// → tiny breathing hold.
const CAM_KEYS: CamKey[] = [
  { frame: 0, cx: 920, cy: 280, zoom: 1.25 },
  { frame: 22, cx: 920, cy: 310, zoom: 1.21 }, // slow push while the title writes in
  { frame: 64, cx: 960, cy: 540, zoom: 0.997 }, // whole page, rails fully in frame
  { frame: 78, cx: 960, cy: 540, zoom: 1.003 }, // micro-breath
  { frame: 102, cx: 960, cy: 540, zoom: 0.995 }, // exhale — whole-page reading hold
];

const REVEAL_EASE = Easing.bezier(0.4, 0, 0.6, 1);

// 20 content blocks would overshoot the 70-frame reveal budget one-by-one, so
// blocks are revealed two at a time: pair g starts at 6 + g*3.5, 8 frames each
// (last pair done by ~49, well before the frame-64 full-page settle).
const cueFor = (i: number) => 6 + Math.floor(i / 2) * 3.5;
const WIPE = 8;

// ---- past weeks stack into the left rail: the captured texture only holds
// the live W28 entry, so W27…W22 drop in from above one after another (list
// stacking, same vocabulary as the papers shot), landing below it. ----
const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
/** One past week per line: `week|date|title` */
const PAST_WEEKS_DSL = [
  '2026 第 27 周|7月3日|2026-W27 · Foundation Lab Weekly',
  '2026 第 26 周|6月26日|2026-W26 · Foundation Lab Weekly',
  '2026 第 25 周|6月19日|2026-W25 · Foundation Lab Weekly',
  '2026 第 24 周|6月12日|2026-W24 · Foundation Lab Weekly',
  '2026 第 23 周|6月5日|2026-W23 · Foundation Lab Weekly',
  '2026 第 22 周|5月29日|2026-W22 · Foundation Lab Weekly',
].join('\n');
const parsePastWeeks = (dsl: string) =>
  dsl
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [week = '', date = '', title = ''] = l.split('|').map((s) => s.trim());
      return { week, date, title };
    });

/** Context-level defaults (kicker copy / past-week list / palette), editable per clip in the workbench. */
export const SCENE_WBR_DEFAULTS = {
  kicker: 'Weekly Brief · 2026-W28',
  kickerSize: 24,
  pastWeeks: PAST_WEEKS_DSL,
  amber: '#955905',  // oklch(52% 0.115 65)
  muted: '#65635f',  // oklch(50% 0.006 82)
};
type SceneWbrProps = Partial<typeof SCENE_WBR_DEFAULTS>;
const WEEK_Y0 = 228; // just under the baked-in W28 entry
const WEEK_H = 56;
const WEEK_CUE = (i: number) => 58 + i * 5; // after the left rail wipes on (46–56)
const WEEK_DROP = Easing.bezier(0.2, 1.15, 0.3, 1); // drop with a light bounce

// member-name headings (tag=h2) get the @-mention amber wash; the pinned
// "Jackie's Download" digest heading (the first h2) is not a member name.
const memberH2 = new Set<number>();
{
  let seenH2 = 0;
  blocks.forEach((b, i) => {
    if (b.tag === 'h2' && seenH2++ > 0) memberH2.add(i);
  });
}

/** Weekly brief: the full report is "written" in block by block (paper mask
 * wipes left→right behind an amber caret), member names get an @-mention amber
 * wash, then the week list (left) and comment sidebar (right) wipe on stage —
 * the whole page, both rails included, settles into frame. */
export const SceneWbr: React.FC<SceneWbrProps> = (props) => {
  const { kicker, kickerSize, pastWeeks, amber: AMBER, muted } = { ...SCENE_WBR_DEFAULTS, ...props };
  const PAST_WEEKS = parsePastWeeks(pastWeeks);
  const frame = useCurrentFrame();

  // screen-space kicker stamps in
  const kick = interpolate(frame, [8, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // caret follows only the newest block still being written
  let caretIdx = -1;
  blocks.forEach((_, i) => {
    if (frame >= cueFor(i) && frame <= cueFor(i) + WIPE + 2) caretIdx = i;
  });

  return (
    <>
      <PageCam src="textures/live/wbr-full.png" pageH={PAGE_H} keys={CAM_KEYS} ease={Easing.bezier(0.33, 0, 0.15, 1)}>
        {blocks.map((p, i) => {
          const cue = cueFor(i);
          // paper cover wipes away left→right (anchored right, width 100%→0)
          const coverT = interpolate(frame, [cue, cue + WIPE], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: REVEAL_EASE,
          });
          // li boxes exclude their ::marker dot (drawn ~22px left of the text),
          // so bullet covers extend left to hide the dot until the wipe.
          const bx = p.tag === 'li' ? p.x - 28 : p.x - 4;
          const by = p.y - 3;
          const bw = p.w + (p.tag === 'li' ? 34 : 10);
          const bh = p.h + 6;

          // caret rides the reveal front edge (left edge of the cover)
          const caretX = bx + bw * (1 - coverT);
          const caretH = Math.min(20, p.h - 2);

          // member-name @-mention wash, 4 frames after the wipe completes,
          // sized to the heading's true text width
          const nameCue = cue + WIPE + 4;
          const nameGrow = memberH2.has(i)
            ? interpolate(frame, [nameCue, nameCue + 8], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.bezier(0.3, 0, 0.2, 1),
              })
            : 0;

          return (
            <div key={i}>
              {/* @-mention wash on the member name (under the cover) */}
              {nameGrow > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: p.x - 3,
                    top: p.y - 1,
                    width: (p.w + 8) * nameGrow,
                    height: p.h + 2,
                    background: AMBER_WASH,
                    opacity: 0.7,
                    borderRadius: 3,
                    pointerEvents: 'none',
                  }}
                />
              ) : null}

              {/* paper cover that wipes off to reveal the "written" text */}
              {coverT > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: bx,
                    top: by,
                    width: bw,
                    height: bh,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: `${coverT * 100}%`,
                      background: PAPER,
                    }}
                  />
                </div>
              ) : null}

              {/* amber caret at the writing front — newest block only */}
              {i === caretIdx ? (
                <div
                  style={{
                    position: 'absolute',
                    left: caretX,
                    top: p.y + (p.h - caretH) / 2,
                    width: 2,
                    height: caretH,
                    background: AMBER,
                    opacity:
                      coverT > 0
                        ? 1
                        : interpolate(frame, [cue + WIPE, cue + WIPE + 2], [1, 0], {
                            extrapolateLeft: 'clamp',
                            extrapolateRight: 'clamp',
                          }),
                    pointerEvents: 'none',
                  }}
                />
              ) : null}
            </div>
          );
        })}

        {/* side-rail entrances: each rail hides under a paper patch, then wipes
            on top→bottom while its inner edge lights up amber and fades. */}
        {[
          { rail: leftRail, cue: 46, inner: 'right' as const },
          { rail: rightRail, cue: 54, inner: 'left' as const },
        ].map(({ rail, cue, inner }, i) => {
          const t = interpolate(frame, [cue, cue + 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.3, 0, 0.2, 1),
          });
          const lineFade = interpolate(frame, [cue + 10, cue + 24], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div key={`rail${i}`}>
              {/* paper patch shrinking downward = rail revealed top→bottom */}
              {t < 1 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: rail.x,
                    top: rail.y + rail.h * t,
                    width: rail.w,
                    height: rail.h * (1 - t),
                    background: PAPER,
                    pointerEvents: 'none',
                  }}
                />
              ) : null}
              {/* inner-edge amber line: grows with the wipe, then fades */}
              {frame >= cue && lineFade > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: inner === 'right' ? rail.x + rail.w - 1.5 : rail.x,
                    top: rail.y,
                    width: 1.5,
                    height: rail.h * t,
                    background: AMBER,
                    opacity: lineFade,
                    pointerEvents: 'none',
                  }}
                />
              ) : null}
            </div>
          );
        })}
        {/* past weeks drop into the left rail from above, stacking in order */}
        {PAST_WEEKS.map((w, i) => {
          const cue = WEEK_CUE(i);
          if (frame < cue) return null;
          const t = interpolate(frame, [cue, cue + 8], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: WEEK_DROP,
          });
          const appear = interpolate(frame, [cue, cue + 3], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const air = Math.max(0, 1 - t);
          return (
            <div
              key={w.week}
              style={{
                position: 'absolute',
                left: 4,
                top: WEEK_Y0 + i * WEEK_H,
                width: leftRail.w - 8,
                height: WEEK_H,
                transform: `translateY(${-44 * air}px)`,
                opacity: appear,
                boxShadow: air > 0.02 ? `0 ${10 * air}px ${20 * air}px rgba(30,25,18,${0.16 * air})` : 'none',
                background: PAPER,
                borderBottom: '1px solid rgba(31,41,55,0.07)',
                padding: '8px 10px 0',
                boxSizing: 'border-box',
                fontFamily: SANS,
                pointerEvents: 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>{w.week}</span>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>{w.date}</span>
              </div>
              <div style={{ marginTop: 2, fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {w.title}
              </div>
            </div>
          );
        })}
      </PageCam>

      {/* screen-space kicker, top-right */}
      <div
        style={{
          position: 'absolute',
          top: 16, // inside the page's empty top-nav band at full-page framing,
          right: 96, // clear of the comment rail's own header

          textAlign: 'right',
          fontFamily: MONO,
          fontSize: kickerSize,
          letterSpacing: '0.14em',
          color: muted,
          textTransform: 'uppercase',
          opacity: kick,
          pointerEvents: 'none',
        }}
      >
        {kicker}
      </div>
    </>
  );
};
