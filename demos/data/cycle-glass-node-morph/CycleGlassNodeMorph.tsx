// cycle-glass-node-morph — 单主体缩入机制图，循环标签随后被上升的玻璃节点接管。
// 运动顺序：上下文主体 → 对角擦除 → 循环箭头与标签 → 连续推近 → 节点托起 → 诊断标记。
import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { DesignStage, E, lerp } from '../../_fixtures/Motion';

export const CYCLE_GLASS_NODE_MORPH_DURATION = 257;

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const frameSeg = (frame: number, start: number, end: number, ease: (t: number) => number = E.linear) =>
  ease(Math.min(1, Math.max(0, (frame - start) / Math.max(1, end - start))));

// Monotone cubic Hermite interpolation keeps the recorded camera key states while
// sharing one non-zero velocity at each interior keyframe. This avoids the visible
// stop/restart that three separately eased interpolate() calls would introduce.
const smoothCamera = (frame: number, values: readonly number[]) => {
  const frames = [176, 180, 190, 198] as const;
  if (frame <= frames[0]) return values[0];
  if (frame >= frames[frames.length - 1]) return values[values.length - 1];

  const widths = frames.slice(1).map((value, index) => value - frames[index]);
  const secants = widths.map((width, index) => (values[index + 1] - values[index]) / width);
  const tangents = [secants[0]];
  for (let index = 1; index < values.length - 1; index++) {
    const before = secants[index - 1];
    const after = secants[index];
    if (before * after <= 0) {
      tangents.push(0);
      continue;
    }
    const beforeWidth = widths[index - 1];
    const afterWidth = widths[index];
    const w1 = 2 * afterWidth + beforeWidth;
    const w2 = afterWidth + 2 * beforeWidth;
    tangents.push((w1 + w2) / (w1 / before + w2 / after));
  }
  tangents.push(secants[secants.length - 1]);

  const segment = frame <= frames[1] ? 0 : frame <= frames[2] ? 1 : 2;
  const width = widths[segment];
  const t = (frame - frames[segment]) / width;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return (
    h00 * values[segment] +
    h10 * width * tangents[segment] +
    h01 * values[segment + 1] +
    h11 * width * tangents[segment + 1]
  );
};

const quadraticPoint = (
  from: readonly [number, number],
  control: readonly [number, number],
  to: readonly [number, number],
  t: number,
) => {
  const oneMinus = 1 - t;
  const x = oneMinus * oneMinus * from[0] + 2 * oneMinus * t * control[0] + t * t * to[0];
  const y = oneMinus * oneMinus * from[1] + 2 * oneMinus * t * control[1] + t * t * to[1];
  const dx = 2 * (oneMinus * (control[0] - from[0]) + t * (to[0] - control[0]));
  const dy = 2 * (oneMinus * (control[1] - from[1]) + t * (to[1] - control[1]));
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
};

const cycleLabelOpacity = (frame: number, start: number) => {
  const local = frame - start;
  if (local < 0) return 0;
  if (local === 0 || local === 3) return 1;
  if (local === 1 || local === 2) return 0;
  if (local === 4 || local === 6) return 0.42;
  return 1;
};

const GlassNode: React.FC<{
  frame: number;
  start: number;
  end: number;
  left: number;
  top: number;
  label: string;
}> = ({ frame, start, end, left, top, label }) => {
  const k = frameSeg(frame, start, end, E.outBack);
  const opacity = frameSeg(frame, start, start + 2, E.outQuad);
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'rgba(64,64,68,.88)',
        border: '1px solid rgba(255,255,255,.48)',
        boxShadow: '0 10px 24px rgba(18,18,20,.18), inset 0 1px 6px rgba(255,255,255,.28)',
        backdropFilter: 'blur(10px)',
        opacity,
        transform: `translate(-50%, ${lerp(k, 86, -32)}px) scale(${lerp(k, 0.82, 1)})`,
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontFamily: 'Arial, sans-serif',
        fontSize: 8.5,
        fontWeight: 850,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </div>
  );
};

const Marker: React.FC<{ frame: number; start: number; end: number; left: number; top: number; rotate: number }> = ({
  frame,
  start,
  end,
  left,
  top,
  rotate,
}) => {
  const k = frameSeg(frame, start, end, E.outBack);
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: 0,
        height: 0,
        borderLeft: '4px solid transparent',
        borderRight: '4px solid transparent',
        borderTop: '7px solid #5a5a5e',
        opacity: Math.min(1, k * 2),
        transform: `translateY(${lerp(k, -12, 0)}px) rotate(${lerp(k, rotate - 22, rotate)}deg) scale(${lerp(
          k,
          0.72,
          1,
        )})`,
      }}
    />
  );
};

export const CycleGlassNodeMorph: React.FC = () => {
  const frame = useCurrentFrame();
  const wipe = frameSeg(frame, 66, 90, E.inOutCubic);
  const vehicle = frameSeg(frame, 62, 94, E.inOutCubic);
  const disk = frameSeg(frame, 66, 110, E.outCubic);
  const title = frameSeg(frame, 84, 90, E.outCubic);
  const arrows = frameSeg(frame, 127, 176, E.inOutCubic);
  const camScale = smoothCamera(frame, [0.61, 0.659, 0.935, 1]);
  const camX = smoothCamera(frame, [6, 5.5, 1, 0]);
  const camY = smoothCamera(frame, [-51, -44, -9, 0]);
  const topArrow = quadraticPoint([68, 98], [185, 4], [302, 98], arrows);
  const bottomArrow = quadraticPoint([302, 100], [185, 190], [68, 100], arrows);
  const wipeStop = interpolate(wipe, [0, 1], [-40, 140]);

  const labelData = [
    { label: 'SENSE', left: 147, top: 92, start: 124 },
    { label: 'MODEL', left: 240, top: 63, start: 129 },
    { label: 'ACT', left: 333, top: 92, start: 134 },
  ];

  return (
    <DesignStage bg="#f5f5f2" raster="zoom">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          isolation: 'isolate',
          background: `linear-gradient(135deg, #f5f5f2 0%, #f5f5f2 ${wipeStop}%, #c8c8c5 ${
            wipeStop + 0.2
          }%, #c8c8c5 100%)`,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 36,
            right: 36,
            top: 13,
            height: 47,
            background: '#a4a4a1',
            display: 'grid',
            placeItems: 'center',
            color: '#f8f8f6',
            fontSize: 15,
            fontWeight: 850,
            letterSpacing: 1,
            opacity: 1 - wipe,
          }}
        >
          CONTEXT
        </div>

        <div
          style={{
            position: 'absolute',
            left: 240,
            top: 143,
            width: 218,
            height: 218,
            borderRadius: '50%',
            background: '#cececb',
            opacity: disk,
            transform: `translate(-50%,-50%) scale(${lerp(disk, 0.3, 1)})`,
            transformOrigin: '50% 50%',
            zIndex: 2,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 240,
            top: 112,
            width: 118,
            height: 14,
            background: '#999996',
            opacity: title * (1 - frameSeg(frame, 176, 192, E.outQuad)),
            transform: `translate(-50%, ${lerp(title, 8, 0)}px)`,
            display: 'grid',
            placeItems: 'center',
            color: '#f7f7f5',
            fontSize: 8.5,
            fontWeight: 850,
            letterSpacing: 0.8,
            zIndex: 4,
          }}
        >
          SYSTEM LOOP
        </div>

        <svg
          viewBox="0 0 332 134"
          style={{
            position: 'absolute',
            left: 240,
            top: 154,
            width: interpolate(vehicle, [0, 1], [332, 154]),
            height: interpolate(vehicle, [0, 1], [134, 62]),
            transform: `translate(-50%, -50%) translateY(${interpolate(vehicle, [0, 1], [25, 15])}px)`,
            zIndex: 7,
            overflow: 'visible',
          }}
        >
          <polygon points="56,27 96,0 236,0 276,27 332,47 332,134 0,134 0,47" fill="#5a5a5d" />
          <text
            x="166"
            y="82"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontFamily="Arial, sans-serif"
            fontSize="18"
            fontWeight="850"
          >
            SUBJECT
          </text>
        </svg>

        <div
          style={{
            position: 'absolute',
            left: 240,
            top: 151,
            width: 370,
            height: 226,
            transform: `translate(-50%,-50%) translate(${camX}px,${camY}px) scale(${camScale})`,
            transformOrigin: '50% 50%',
            zIndex: 6,
          }}
        >
          <svg viewBox="0 0 370 226" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path
              d="M68 98 Q185 4 302 98"
              fill="none"
              stroke="#4d4d50"
              strokeWidth="1.3"
              strokeDasharray="300"
              strokeDashoffset={300 * (1 - arrows)}
            />
            <path
              d="M302 100 Q185 190 68 100"
              fill="none"
              stroke="#4d4d50"
              strokeWidth="1.3"
              strokeDasharray="300"
              strokeDashoffset={300 * (1 - arrows)}
            />
            <path
              d="M-9 -5 L0 0 L-9 5"
              fill="none"
              stroke="#4d4d50"
              strokeWidth="1.3"
              opacity={frameSeg(arrows, 0.02, 0.08, E.outQuad)}
              transform={`translate(${topArrow.x} ${topArrow.y}) rotate(${topArrow.angle})`}
            />
            <path
              d="M-9 -5 L0 0 L-9 5"
              fill="none"
              stroke="#4d4d50"
              strokeWidth="1.3"
              opacity={frameSeg(arrows, 0.02, 0.08, E.outQuad)}
              transform={`translate(${bottomArrow.x} ${bottomArrow.y}) rotate(${bottomArrow.angle})`}
            />
          </svg>

          {labelData.map((item, i) => {
            const opacity = cycleLabelOpacity(frame, item.start);
            const drift = frameSeg(frame, item.start, 160, E.outCubic);
            const nodeTarget = frameSeg(frame, 176, 198, E.inOutCubic);
            const nodeTakeover = frameSeg(frame, 184 + i * 8, 192 + i * 8, E.outCubic);
            return (
              <div
                key={item.label}
                style={{
                  position: 'absolute',
                  left: item.left - 55 + (i - 1) * lerp(drift, 8, 0),
                  top: item.top,
                  width: 110,
                  textAlign: 'center',
                  color: '#353538',
                  fontSize: 10,
                  fontWeight: 850,
                  opacity: opacity * (1 - nodeTakeover),
                  transform: `translateY(${lerp(nodeTarget, 0, -4)}px)`,
                }}
              >
                {item.label}
              </div>
            );
          })}

          <GlassNode frame={frame} start={184} end={192} left={92} top={98} label="SENSE" />
          <GlassNode frame={frame} start={192} end={200} left={185} top={69} label="MODEL" />
          <GlassNode frame={frame} start={200} end={208} left={278} top={98} label="ACT" />

          <Marker frame={frame} start={208} end={214} left={48} top={119} rotate={-90} />
          <Marker frame={frame} start={213} end={218} left={181} top={30} rotate={0} />
          <Marker frame={frame} start={217} end={222} left={314} top={119} rotate={90} />
        </div>
      </div>
    </DesignStage>
  );
};
