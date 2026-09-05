import { Img, interpolate, staticFile, useCurrentFrame, Easing, getRemotionEnvironment } from 'remotion';
import { PageCam, CamKey } from './PageCam';
import layout from '../live-layout.json';

const cards = layout.projects.cards;
const PAGE_H = layout.projects.pageH;

const HOVER_H = 40; // px above the slot (translateZ) a card hovers at mid-dive
const SETTLE_EASE = Easing.bezier(0.3, 0, 0.25, 1.15); // slight overshoot / compress
const DIVE_EASE = Easing.bezier(0.3, 0, 0.2, 1); // decelerate into the hover
const SLIDE_EASE = Easing.bezier(0.35, 0, 0.2, 1); // nano-lab card slide to the top slot

// page paper colors, sampled from the rendered projects-empty texture
const PAPER = '#f9f6f1'; // page background (bottom rows)
const FIELD = '#fefcf9'; // search-box interior

// ---- 16 "overflow" extras extend the grid DOWNWARD (no hovering, no overlap):
// fill the empty 3rd column of the y=1402 row, then five new rows below the
// texture at y=1795…3367, columns matching the real grid. ----
const COLS = [408, 781.328125, 1154.65625];
const CARD_W = 357.328125;
const EXTRA_ROWS = [1795, 2188, 2581, 2974, 3367];
const PAPER_EXT = { x: 0, y: PAGE_H, w: 1920, h: 2036 }; // paper extension below the texture (flush bottom 3782)

const extras = Array.from({ length: 16 }, (_, i) => ({
  file: `card${((i * 3 + 2) % 10) + 1}.png`, // deterministic, neighbors differ
  x: i === 0 ? COLS[2] : COLS[(i - 1) % 3],
  y: i === 0 ? 1402 : EXTRA_ROWS[Math.floor((i - 1) / 3)],
  w: CARD_W,
  h: 312,
  title: '',
}));

// ---- the DECK: all 26 cards start stacked in one pile at the page's top
// right. The shot opens on a rotating 3D close-up of the pile (0–35), pulls
// back to reveal the page (35–62), and the cards deal themselves to their
// slots in reading order (y, then x) on a hard-accelerating cadence — the gap
// between departures shrinks from 4f to 0.2f (gap_k = 4 − 0.1584k), so the
// dealing goes from deliberate to a blur. First departs at 36 (mid pull-back),
// last ≈88, lands ≈96. Pile poses carry a small deterministic jitter and each
// card keeps a stack height (top of pile = first to leave). ----
const PILE = { x: 1430, y: 240 };
const N_CARDS = 26;
const DEAL_START = 36;
const STACK_STEP = 3; // px of physical height per card — the pile reads as a real stack

// dark-metal backdrop for the opening close-up: covers everything in the page
// plane, with a warm spotlight pooled on the pile; fades out with the pull-back
const METAL_FADE = [34, 56] as const;
// Real-time preview stand-in for the metal (Player / Studio / workbench — anything that is
// not the final render). The procedural gradients below cover a 9000×9000 plane that
// Chromium has to re-rasterize every frame while PageCam's `zoom` changes; in real time
// the raster never keeps up, the plane drops in and out, and the close-up strobes between
// dark table and white page (measured: ~20 blank-outs in the first 2s). A flat fill needs
// no raster at all. Same geometry, same fade — only the paint differs; the render still
// paints the brushed metal. Tone = median of the rendered table (#373637 sampled).
const METAL_PREVIEW = '#383638';

const grid = [
  ...cards.map((c) => ({ file: c.file, x: c.x, y: c.y, w: c.w, h: c.h, title: c.title })),
  ...extras,
]
  .sort((a, b) => a.y - b.y || a.x - b.x)
  .map((c, k) => ({
    ...c,
    cue: DEAL_START + 4 * k - 0.0792 * k * (k - 1),
    // pile pose: tiny alternating offsets + roll, stacked top-down by k
    px: PILE.x + (((k * 7) % 9) - 4) * 2,
    py: PILE.y + (((k * 5) % 7) - 3) * 2,
    protZ: ((k * 11) % 7) - 3,
    pz: (N_CARDS - k) * STACK_STEP, // physical stack height; k=0 rides on top
  }));

// ---- the search target: nano-lab slides up to the first-row slot on filter ----
const nanoIdx = grid.findIndex((c) => c.title.includes('nano-lab'));
const nano = grid[nanoIdx];
const NANO_TO = { x: 408, y: 247 }; // first-row slot the filtered card slides into
const CLICK_C = { x: 586, y: 391 }; // click point on the settled result card

// filter departure rank for the 19 non-target cards (reading order)
const leaveRank = new Map<number, number>();
grid.forEach((_, i) => {
  if (i !== nanoIdx) leaveRank.set(i, leaveRank.size);
});

// search box (page-space CSS px) + typing beats
const SEARCH = { x: 408, y: 130, w: 1016, h: 44 };
/** Context-level defaults, editable per clip in the workbench. `query` is only the
 * typed text; the card that survives the filter is still the nano-lab card from layout. */
export const SCENE_FLYIN_DEFAULTS = {
  query: 'nano-lab',
  accent: '#ae6700', // oklch(58% 0.13 65)
};
type SceneFlyInProps = Partial<typeof SCENE_FLYIN_DEFAULTS>;
const TYPE_START = 128; // 3 frames per character → last char at ≈149
const FILTER_START = 160; // beat of rest after typing, then the grid filters

// pile centre for the opening close-up
const PILE_CX = PILE.x + CARD_W / 2;
const PILE_CY = PILE.y + 156;

// Narrative: the shot opens on a rotating 3D CLOSE-UP of the 26-card pile
// (orbiting from a left-oblique to a right-oblique look), pulls back to
// reveal the page as the pile starts dealing cards to their grid slots, each
// departure faster than the last, extending the grid far below the page fold
// → the camera scrolls down chasing the dealing, FASTER each leg, arriving
// straight at the bottom → rests half a second on the full board → swooshes
// back up to the search box → "nano-lab" is typed (unhurried), a breath, then
// the grid filters down to one card which slides into the first row → a click
// ripple fires and the camera pushes into the card, handing off to detail.
const CAM_KEYS: CamKey[] = [
  { frame: 0, cx: PILE_CX - 30, cy: PILE_CY + 60, zoom: 1.95, rotX: 46, rotY: -30, rotZ: 9, persp: 1100 }, // low side view of the stack, left-oblique
  { frame: 34, cx: PILE_CX + 30, cy: PILE_CY + 40, zoom: 1.85, rotX: 42, rotY: 26, rotZ: -7, persp: 1100 }, // orbit around the pile to a right-oblique
  { frame: 62, cx: 960, cy: 900, zoom: 0.88, rotX: 26, rotY: 0, rotZ: 2, persp: 1300 }, // pull back — dashboard revealed, dealing underway
  { frame: 82, cx: 950, cy: 1900, zoom: 0.78, rotX: 14, rotY: 0, rotZ: 0, persp: 1300 }, // speeding up (~50 px/f)
  { frame: 98, cx: 960, cy: 3032, zoom: 0.72, rotX: 0, rotY: 0, rotZ: 0, persp: 1300 }, // fastest leg (~70 px/f), arrives straight at the paper's flush bottom
  { frame: 113, cx: 960, cy: 3032, zoom: 0.72, rotX: 0, rotY: 0, rotZ: 0, persp: 1300 }, // 0.5s REST on the full board
  { frame: 124, cx: 960, cy: 380, zoom: 0.9, rotX: 0, rotY: 0, rotZ: 0, persp: 1300 }, // swoosh back up to the search/filter header
  { frame: 174, cx: 960, cy: 380, zoom: 0.9, rotX: 0, rotY: 0, rotZ: 0, persp: 1300 }, // hold through typing, breath, filter, slide
  { frame: 190, cx: CLICK_C.x, cy: CLICK_C.y, zoom: 2.2, rotX: 0, rotY: 0, rotZ: 0, persp: 1300 }, // push into the clicked card, carried through the white flash
];

export const SceneFlyIn: React.FC<SceneFlyInProps> = (props) => {
  const { query: QUERY, accent } = { ...SCENE_FLYIN_DEFAULTS, ...props };
  const frame = useCurrentFrame();
  const { isRendering } = getRemotionEnvironment();

  // DOF fades out over the straightening leg of the scroll (82 → 98)
  const dofStrength = interpolate(frame, [82, 98], [5, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // typed characters: one every 3 frames from TYPE_START (unhurried typing)
  const typedCount = frame < TYPE_START
    ? 0
    : Math.min(QUERY.length, Math.floor((frame - TYPE_START) / 3) + 1);
  // caret: solid while typing, then blinks on an 8-frame cycle until the click
  const caretOn =
    frame >= TYPE_START - 2 &&
    frame <= 185 &&
    (frame <= TYPE_START + 24 || Math.floor((frame - (TYPE_START + 24)) / 8) % 2 === 0);

  return (
    <PageCam
      src="textures/live/projects-empty.png"
      pageH={PAGE_H}
      keys={CAM_KEYS}
      ease={Easing.bezier(0.33, 0, 0.15, 1)}
      dof={dofStrength > 0.1 ? { focusY: 260, strength: dofStrength } : undefined}
    >
      {/* ---- dark brushed-metal table under the opening pile close-up: a huge
              plane (covers the viewport at any oblique angle) with a warm
              spotlight pooled on the stack; fades away as the camera pulls
              back and the dashboard page takes over ---- */}
      {frame < METAL_FADE[1] ? (
        <div
          style={{
            position: 'absolute',
            left: -3000,
            top: -3000,
            width: 9000,
            height: 9000,
            opacity: interpolate(frame, [METAL_FADE[0], METAL_FADE[1]], [1, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
            background: isRendering ? [
              // warm key light pooled on the pile
              `radial-gradient(1300px 900px at ${3000 + PILE_CX}px ${3000 + PILE_CY}px, rgba(255,214,150,0.20), rgba(255,190,120,0.06) 40%, transparent 68%)`,
              // brushed-metal grain: fine anisotropic streaks
              'repeating-linear-gradient(100deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 2px, transparent 7px)',
              'repeating-linear-gradient(100deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 2px, transparent 4px, transparent 13px)',
              // broad steel sheen
              'linear-gradient(115deg, #2a2d33 0%, #383c44 28%, #22242a 55%, #33363e 78%, #1d1f24 100%)',
            ].join(', ') : METAL_PREVIEW,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {/* ---- paper extension: the page grows past the texture so the three
              extra rows sit on paper, not on the void ---- */}
      <div
        style={{
          position: 'absolute',
          left: PAPER_EXT.x,
          top: PAPER_EXT.y,
          width: PAPER_EXT.w,
          height: PAPER_EXT.h,
          background: PAPER,
          pointerEvents: 'none',
        }}
      />

      {/* ---- filter clean-up: paper patch over the stale section headers /
              counts baked into the texture below y=500, revealed 84–92 ---- */}
      {frame >= FILTER_START ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 500,
            width: 1920,
            height: PAGE_H - 500,
            background: PAPER,
            opacity: interpolate(frame, [FILTER_START, FILTER_START + 8], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {/* ---- 26 cards: visible pile at top right from frame 0, each card
              deals itself to its slot (arc flight, roll resolving) on an
              accelerating cadence; on filter the 25 non-matches fade+sink
              away and nano-lab slides up to row one ---- */}
      {grid.map((c, i) => {
        const { cue } = c;
        const radius = 16;
        const isNano = i === nanoIdx;

        // --- filter fade-out for the 25 non-target cards (staggered, 5f) ---
        const outCue = isNano ? Infinity : FILTER_START + leaveRank.get(i)! * 0.4;
        if (frame >= outCue + 5) return null;
        const outT = isNano
          ? 0
          : interpolate(frame, [outCue, outCue + 5], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad),
            });

        // --- beat 1: deal (cue → cue+8): from the pile pose (px,py, stack
        // height pz, small roll) to the hover pose over the slot. The flight
        // arcs UP first (z bulge) like a card snapped off the top of a deck. ---
        const diveT = interpolate(frame, [cue, cue + 8], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: DIVE_EASE,
        });

        // --- beat 2: settle (cue+8 → cue+12): Z from HOVER_H down to 0 ---
        const settleT = interpolate(frame, [cue + 8, cue + 12], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: SETTLE_EASE,
        });

        // in-flight pose: pile → slot, roll resolving to 0 by touchdown-hover.
        const dx = (c.px - c.x) * (1 - diveT);
        const dy = (c.py - c.y) * (1 - diveT);
        const rotFlight = c.protZ * (1 - diveT);

        // depth: stack height → arc bulge (+90 at mid-flight) → hover → settle 0.
        const arc = Math.sin(diveT * Math.PI) * 90;
        const zDive = interpolate(diveT, [0, 1], [c.pz, HOVER_H]) + arc;
        const z = frame < cue ? c.pz : zDive * (1 - settleT); // pile height before the deal

        // scale: in the pile 1, snap up 1.06 mid-flight, settle back to 1
        const dealScale = 1 + Math.sin(diveT * Math.PI) * 0.06;
        const press = interpolate(frame, [cue + 10, cue + 11, cue + 12], [1, 0.996, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const scale = dealScale * press;

        // --- nano-lab slide (104 → 114): glide from (408,1402) to the first-row
        // slot with a light float (scale 1→1.02→1, small Z lift, wider shadow) ---
        const slideT = isNano
          ? interpolate(frame, [FILTER_START, FILTER_START + 10], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: SLIDE_EASE,
            })
          : 0;
        const slideDy = (NANO_TO.y - nano.y) * slideT;
        const slideDx = (NANO_TO.x - nano.x) * slideT;
        const float = Math.sin(slideT * Math.PI); // 0→1→0 across the slide
        const slideScale = 1 + 0.02 * float;
        const slideZ = 18 * float;

        // once fully settled, force an exact identity so the card sits flush
        // with its slot on the tilted board (no residual sub-px drift).
        const landed = frame >= cue + 12;
        const inPile = frame < cue;
        const transform = isNano && frame >= FILTER_START
          ? `translate3d(${slideDx}px, ${slideDy}px, ${slideZ}px) scale(${slideScale})`
          : outT > 0
            ? `translate3d(0px, ${8 * outT}px, 0px)`
            : landed
              ? 'translate3d(0px, 0px, 0px)'
              : inPile
                ? `translate3d(${c.px - c.x}px, ${c.py - c.y}px, ${c.pz}px) rotateZ(${c.protZ}deg)`
                : `translate3d(${dx}px, ${dy}px, ${z}px) rotateZ(${rotFlight}deg) scale(${scale})`;

        // shadow: stacked cards carry almost none (they sit on each other),
        // airborne large/soft, tight when flush, widening on the slide
        const shadow = isNano && frame >= FILTER_START
          ? `0 ${2 + 14 * float}px ${6 + 26 * float}px rgba(60,45,30,${0.08 + 0.1 * float})`
          : landed
            ? '0 2px 6px rgba(60,45,30,.08)'
            : inPile
              ? '0 1px 3px rgba(60,45,30,.14)'
              : `0 ${36 - 30 * settleT}px ${70 - 60 * settleT}px rgba(60,45,30,${0.3 - 0.22 * settleT})`;

        // motion-blur ghost during the deal: a faint blurred copy trailing the flight path
        const showGhost = diveT > 0.02 && diveT < 0.98;
        const ghostLagX = (c.px - c.x) * 0.05;
        const ghostLagY = (c.py - c.y) * 0.05;

        return (
          <div key={`${c.file}-${i}`} style={{ transformStyle: 'preserve-3d' }}>
            {showGhost ? (
              <div
                style={{
                  position: 'absolute',
                  left: c.x,
                  top: c.y,
                  width: c.w,
                  height: c.h,
                  transform: `translate3d(${dx + ghostLagX}px, ${dy + ghostLagY}px, ${z}px) rotateZ(${rotFlight}deg) scale(${scale})`,
                  transformOrigin: 'center center',
                  opacity: 0.25 * (1 - diveT),
                  filter: 'blur(6px)',
                  borderRadius: radius,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                }}
              >
                <Img
                  src={staticFile(`textures/live/${c.file}`)}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
                />
              </div>
            ) : null}

            <div
              style={{
                position: 'absolute',
                left: c.x,
                top: c.y,
                width: c.w,
                height: c.h,
                transform,
                transformOrigin: 'center center',
                boxShadow: shadow,
                borderRadius: radius,
                opacity: 1 - outT,
                overflow: 'hidden',
              }}
            >
              <Img
                src={staticFile(`textures/live/${c.file}`)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
              />
            </div>
          </div>
        );
      })}

      {/* ---- search box: paper patch over the placeholder text (keeps the
              magnifier icon), then "nano-lab" typed in with a blinking caret ---- */}
      {frame >= 118 ? (
        <div
          style={{
            position: 'absolute',
            left: 440,
            top: SEARCH.y + 4,
            width: SEARCH.x + SEARCH.w - 448,
            height: SEARCH.h - 8,
            background: FIELD,
            opacity: interpolate(frame, [118, 124], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {frame >= TYPE_START - 2 ? (
        <div
          style={{
            position: 'absolute',
            left: 448,
            top: SEARCH.y,
            height: SEARCH.h,
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
            fontSize: 15,
            letterSpacing: 0.2,
            color: 'oklch(25% 0.006 82)',
            pointerEvents: 'none',
          }}
        >
          <span>{QUERY.slice(0, typedCount)}</span>
          {caretOn ? (
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: 20,
                marginLeft: 2,
                background: accent,
              }}
            />
          ) : null}
        </div>
      ) : null}

      {/* ---- click ripple on the filtered card: two concentric amber rings ---- */}
      {[0, 1].map((r) => {
        const start = 176 + r * 3;
        if (frame < start || frame > start + 10) return null;
        const t = interpolate(frame, [start, start + 10], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
        });
        const rad = interpolate(t, [0, 1], [14, r === 0 ? 54 : 78]);
        return (
          <div
            key={`ripple-${r}`}
            style={{
              position: 'absolute',
              left: CLICK_C.x - rad,
              top: CLICK_C.y - rad,
              width: rad * 2,
              height: rad * 2,
              borderRadius: '50%',
              border: `2px solid ${accent}`,
              opacity: 1 - t,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* ---- selected-card amber outline, lit from the click until the cut ---- */}
      {frame >= 178 ? (
        <div
          style={{
            position: 'absolute',
            left: NANO_TO.x - 6,
            top: NANO_TO.y - 6,
            width: nano.w + 12,
            height: nano.h + 12,
            borderRadius: 16,
            border: `3px solid ${accent}`,
            boxShadow: '0 0 40px rgba(180,120,50,0.5)',
            opacity: interpolate(frame, [178, 181], [0.5, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {/* near-edge rim light along the extended board's leading (bottom) edge */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: PAPER_EXT.y + PAPER_EXT.h - 8,
          height: 8,
          background: 'rgba(255,255,255,0.85)',
          filter: 'blur(6px)',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
    </PageCam>
  );
};
