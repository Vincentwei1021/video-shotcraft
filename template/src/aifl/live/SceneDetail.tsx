import React from 'react';
import { interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam, CamKey } from './PageCam';
import layout from '../live-layout.json';

const DETAIL_H = layout.detail.pageH;
const rows = layout.detail.rows;

// the fly-in shot ends on the click into the nano-lab card; this shot opens
// directly on its detail page (the FlashCut transition covers the cut).
const DETAIL_CAM: CamKey[] = [
  { frame: 0, cx: 960, cy: 300, zoom: 1.1 },
  { frame: 75, cx: 960, cy: 760, zoom: 1.0 }, // 75 ≤ duration 100
];

const FLY_EASE = Easing.bezier(0.3, 0, 0.25, 1);
const detailSrc = staticFile('textures/live/detail-full.png');

/** Context-level defaults, editable per clip in the workbench. */
export const SCENE_DETAIL_DEFAULTS = {
  accent: '#ae6700', // oklch(58% 0.13 65) — embed seam colour
};
type SceneDetailProps = Partial<typeof SCENE_DETAIL_DEFAULTS>;

/** Open on the nano-lab detail page, then pan down while the
 * research-question rows fly in from the air and embed into their slots. */
export const SceneDetail: React.FC<SceneDetailProps> = (props) => {
  const { accent } = { ...SCENE_DETAIL_DEFAULTS, ...props };
  const frame = useCurrentFrame();
  const df = frame;

  return (
    <PageCam src="textures/live/detail-full.png" pageH={DETAIL_H} keys={DETAIL_CAM} ease={Easing.bezier(0.33, 0, 0.15, 1)}>
      {/* research-question rows fly in from the air and embed into their slots.
          Cue table 12+i*9: last row lands 12+36+12=60, amber seam done 68 ≤ 70. */}
      {rows.map((r, i) => {
        const cue = 12 + i * 9;
        const land = cue + 12;

        // empty-slot paper patch (under the flying row), gone 2f after landing
        const patchOpacity = interpolate(df, [land, land + 2], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const patch =
          patchOpacity > 0 ? (
            <div
              key={`patch-${i}`}
              style={{
                position: 'absolute',
                left: r.x - 8,
                top: r.y - 4,
                width: r.w + 24,
                height: r.h + 8,
                background: '#fdfcfa',
                opacity: patchOpacity,
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />
          ) : null;

        // flying row: texture-crop of the row, dropping in from the air.
        // Removed once fully embedded (press bounce done) — texture shows through.
        let flyer: React.ReactNode = null;
        if (df >= cue && df < cue + 16) {
          const p = interpolate(df, [cue, cue + 12], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: FLY_EASE,
          });
          const appear = interpolate(df, [cue, cue + 3], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          // 1.06 -> 0.995 during flight, then press-bounce back to 1
          const scale =
            df < land
              ? 1.06 - 0.065 * p
              : interpolate(df, [land, land + 4], [0.995, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: Easing.out(Easing.quad),
                });
          const air = 1 - p; // shadow / tilt fade with flight progress
          flyer = (
            <div
              key={`row-${i}`}
              style={{
                position: 'absolute',
                left: r.x,
                top: r.y,
                width: r.w,
                height: r.h,
                borderRadius: 8,
                backgroundColor: '#fff',
                backgroundImage: `url(${detailSrc})`,
                backgroundSize: `1920px ${DETAIL_H}px`,
                backgroundPosition: `-${r.x}px -${r.y}px`,
                opacity: appear,
                transform: `perspective(900px) translateY(${-120 * air}px) rotateX(${16 * air}deg) scale(${scale})`,
                boxShadow: `0 ${30 * air}px ${60 * air}px rgba(30,25,18,${0.22 * air}), 0 ${8 * air}px ${16 * air}px rgba(30,25,18,${0.12 * air})`,
                zIndex: 3,
                pointerEvents: 'none',
              }}
            />
          );
        }

        // embed flash: 2px amber seam at the row's bottom edge, expanding from
        // the center on touchdown, then fading out
        let seam: React.ReactNode = null;
        if (df >= land && df < land + 8) {
          const spread = interpolate(df, [land, land + 5], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          const seamOpacity = interpolate(df, [land, land + 2, land + 8], [1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const seamW = r.w * spread;
          seam = (
            <div
              key={`seam-${i}`}
              style={{
                position: 'absolute',
                left: r.x + (r.w - seamW) / 2,
                top: r.y + r.h - 2,
                width: seamW,
                height: 2,
                background: accent,
                boxShadow: '0 0 6px rgba(180,120,50,0.35)',
                opacity: seamOpacity,
                zIndex: 4,
                pointerEvents: 'none',
              }}
            />
          );
        }

        return (
          <React.Fragment key={i}>
            {patch}
            {flyer}
            {seam}
          </React.Fragment>
        );
      })}
    </PageCam>
  );
};
