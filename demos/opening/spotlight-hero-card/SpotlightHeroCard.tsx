// spotlight-hero-card —— 聚光灯锁定一张卡 → 斜 45° 推进 → 卡片弹起悬浮 →
// 轮廓光束两圈 → 贴回原位。单一主角式产品开场，把核心对象立成全片主角。
// 参考实现从 template SceneOpen 的 82–220 段剥离，self-contained：
// 游走聚光灯经 4 个中间站后锁定卡心（光池收拢 + 锁定脉冲 + vignette 压暗）；
// 相机全页正视 → 16f 斜侧推进（rotY 34° 主导 + rotX 8°）；卡 rise（带过冲）→
// 悬停 sin bob（54f）→ reseat（18f 落地微压）；SVG rounded-rect 轮廓光束两圈
// （lap1 快而亮 / lap2 慢而弱）；悬停期左侧 3D 注记 + 马克笔荧光条。
// 主角卡 = layout.projects.cards[3]，中心 x 恰为 960（页面中心）。
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../../_fixtures/PageCam2D';
import layout from '../../_textures/live-layout.json';

export const SPOTLIGHT_HERO_CARD_DURATION = 139; // 82–220f，落在 shot 内 offset 0

const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';
const INK = 'oklch(18% 0.006 82)';
const AMBER = 'oklch(52% 0.115 65)';
const SLOT_AMBER = 'oklch(58% 0.13 65)';
const BEAM_CORE = 'rgba(255,248,232,0.98)';
const PATCH = 'oklch(97.5% 0.008 82)';

const PAGE_H = layout.projects.pageH;
const MAIN = 3;
const CARD = layout.projects.cards[MAIN];
const MCX = CARD.x + CARD.w / 2; // ≈ 960
const MCY = CARD.y + CARD.h / 2; // 772
const RADIUS = 16;

// Camera: straight-on full page (0→32, static while the spotlight roves and
// locks), then a 16-frame push-in swinging to a LEFT-side view — rotY dominant,
// card's left edge near, right edge recedes; slight downward tilt; then held to
// the end with an almost-imperceptible pull. Focal point sits a touch LEFT of
// the card centre so the card lands slightly right of screen-centre.
const CAM_KEYS: CamKey2D[] = [
  { frame: 0, cx: 960, cy: 540, zoom: 0.78, rotX: 0, rotY: 0, rotZ: 0, persp: 1200 },
  { frame: 32, cx: 960, cy: 540, zoom: 0.78, rotX: 0, rotY: 0, rotZ: 0, persp: 1200 },
  { frame: 48, cx: MCX - 30, cy: MCY, zoom: 2.6, rotX: 8, rotY: 34, rotZ: 2, persp: 1200 },
  { frame: 138, cx: MCX - 30, cy: MCY, zoom: 2.6, rotX: 8, rotY: 34, rotZ: 2, persp: 1200 },
];
const PUSH_EASE = Easing.bezier(0.35, 0, 0.2, 1);
const POP_EASE = Easing.bezier(0.2, 1.25, 0.3, 1);
const RESEAT_EASE = Easing.bezier(0.4, 0, 0.3, 1.05);

export const SpotlightHeroCard: React.FC = () => {
  const frame = useCurrentFrame();

  // --- macro fades in (0 → 8) ---
  const macroIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
  });

  // --- roving spotlight (screen space): waypoints then locks on hero card
  // centre (50%, 67% in the straight-on view), rides the push-in ---
  const spotEase = Easing.bezier(0.4, 0, 0.3, 1);
  const spotX = interpolate(frame, [4, 8, 16, 22, 28, 48], [25, 25, 70, 42, 50, 50], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: spotEase,
  });
  const spotY = interpolate(frame, [4, 8, 16, 22, 28, 48], [30, 30, 45, 60, 67, 50], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: spotEase,
  });
  const spotOn = interpolate(frame, [2, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const poolBase = interpolate(frame, [22, 32, 48], [620, 420, 360], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.3, 1),
  });
  const poolPulse = interpolate(frame, [32, 36, 41], [0, 0.06, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const poolRx = poolBase * (1 + poolPulse);
  const poolRy = poolBase * 0.8 * (1 + poolPulse);
  const vignette = interpolate(frame, [22, 32, 48], [0.16, 0.34, 0.42], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // --- hero card pop-up: rise (48→58 overshoot), hover (58→112, 54f sin bob),
  // reseat (112→130, 18f gentle) — lock(32)→touchdown(130) ≈ 98f ≈ 3.3s ---
  const rise = interpolate(frame, [48, 58], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: POP_EASE,
  });
  const reseat = interpolate(frame, [112, 130], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: RESEAT_EASE,
  });
  const lift = rise * (1 - reseat);
  const bob = Math.sin(((frame - 58) / 40) * Math.PI * 2) * 4 * lift;
  const z = 110 * lift + bob;
  const landed = frame >= 130;
  const press = interpolate(frame, [126, 129, 130], [1, 0.997, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const shadow = `0 ${8 * lift}px ${10 + 12 * lift}px rgba(40,30,20,${0.18 * lift}), 0 ${46 * lift}px ${90 * lift}px rgba(40,30,20,${0.22 * lift})`;

  // vacated-slot amber outline: alive while airborne, brightens as it lands
  const slotVis = Math.min(1, rise * 2) * (1 - reseat);
  const landPulse = interpolate(frame, [126, 130, 134], [0, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const slotEdge = Math.min(1, 0.4 * (1 - reseat)) + landPulse * 0.6;

  // --- perimeter beam: TWO laps. Lap 1 (60→74) fast & bright; lap 2 (80→100)
  // slower & weaker; a faint amber ring lingers and fades before reseat. ---
  const beam1Prog = interpolate(frame, [60, 74], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.linear,
  });
  const beam1On = frame >= 59 && frame <= 75;
  const beam2Prog = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.4, 1),
  });
  const beam2On = frame >= 79 && frame <= 101;
  const beamTrail = interpolate(frame, [100, 112], [0.35, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const bw = CARD.w + 6;
  const bh = CARD.h + 6;

  // hi-res hero crossfades in as the push-in starts (32→38)
  const hiresIn = interpolate(frame, [32, 38], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#faf7f2' }}>
      <AbsoluteFill style={{ opacity: macroIn }}>
        <PageCam2D src="textures/live/projects-full.png" pageH={PAGE_H} keys={CAM_KEYS} ease={PUSH_EASE}>
          {/* rim light along the near (bottom) edge of the tilted plane */}
          <div
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, height: 8,
              background: 'rgba(255,255,255,0.85)', filter: 'blur(6px)',
              opacity: 0.6 * Math.min(1, lift + Math.max(0, (frame - 32) / 16)),
              pointerEvents: 'none',
            }}
          />

          {/* hero card: lifts off its slot, hovers, beam runs, settles back */}
          <div style={{ transformStyle: 'preserve-3d' }}>
            {/* vacated-slot patch + breathing amber outline */}
            {slotVis > 0.02 ? (
              <div
                style={{
                  position: 'absolute', left: CARD.x - 2, top: CARD.y - 2,
                  width: CARD.w + 4, height: CARD.h + 4, background: PATCH,
                  borderRadius: RADIUS,
                  boxShadow: `inset 0 0 26px rgba(180,120,50,${0.12 * slotEdge})`,
                  opacity: slotVis,
                }}
              >
                <div
                  style={{
                    position: 'absolute', inset: 0, borderRadius: RADIUS,
                    border: `1.5px solid ${SLOT_AMBER}`, opacity: slotEdge, pointerEvents: 'none',
                  }}
                />
              </div>
            ) : null}

            {/* the levitating card */}
            <div
              style={{
                position: 'absolute', left: CARD.x, top: CARD.y,
                width: CARD.w, height: CARD.h,
                transform: `translateZ(${z}px) scale(${press})`,
                transformOrigin: 'center center', transformStyle: 'preserve-3d',
              }}
            >
              <div
                style={{
                  position: 'absolute', inset: 0, borderRadius: RADIUS, overflow: 'hidden',
                  boxShadow: landed ? 'none' : shadow,
                }}
              >
                <Img
                  src={staticFile(`textures/live/${CARD.file}`)}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
                />
                {/* 4x hi-res capture layered on top, crisp under push-in zoom */}
                <Img
                  src={staticFile('textures/live/card4-hires.png')}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    display: 'block', opacity: hiresIn,
                  }}
                />
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(160deg, rgba(255,255,255,0.5), transparent 40%)',
                    opacity: lift, pointerEvents: 'none',
                  }}
                />
              </div>
              {/* 1px white inner stroke (lit paper edge) */}
              <div
                style={{
                  position: 'absolute', inset: 0, borderRadius: RADIUS,
                  boxShadow: `inset 0 0 0 1px rgba(255,255,255,${0.7 * lift})`, pointerEvents: 'none',
                }}
              />

              {/* perimeter beam: SVG rounded-rect, pathLength=1 travelling arc */}
              {(beam1On || beam2On) && lift > 0.4 ? (
                <svg
                  width={bw} height={bh} viewBox={`0 0 ${bw} ${bh}`}
                  style={{
                    position: 'absolute', left: -3, top: -3, overflow: 'visible', pointerEvents: 'none',
                    opacity: beam1On ? 1 : 0.62,
                    filter: `drop-shadow(0 0 6px ${AMBER}) drop-shadow(0 0 18px rgba(255,240,210,0.55))`,
                  }}
                >
                  <rect
                    x={2} y={2} width={bw - 4} height={bh - 4} rx={RADIUS} fill="none"
                    stroke={AMBER} strokeWidth={beam1On ? 5 : 3.5} strokeLinecap="round"
                    pathLength={1} strokeDasharray="0.14 1"
                    strokeDashoffset={-(beam1On ? beam1Prog : beam2Prog)}
                  />
                  <rect
                    x={2} y={2} width={bw - 4} height={bh - 4} rx={RADIUS} fill="none"
                    stroke={BEAM_CORE} strokeWidth={beam1On ? 2.5 : 1.75} strokeLinecap="round"
                    pathLength={1} strokeDasharray="0.14 1"
                    strokeDashoffset={-(beam1On ? beam1Prog : beam2Prog)}
                  />
                </svg>
              ) : null}

              {/* faint amber ring left behind, fades out */}
              {beamTrail > 0.01 ? (
                <div
                  style={{
                    position: 'absolute', inset: -3, borderRadius: RADIUS + 3,
                    border: `1.5px solid ${AMBER}`, opacity: beamTrail, pointerEvents: 'none',
                  }}
                />
              ) : null}
            </div>
          </div>

          {/* 3D floating annotation LEFT of the hovering card */}
          {frame >= 60 && frame <= 130 ? (() => {
            const noteIn = interpolate(frame, [60, 70], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.75, 0.3, 1),
            });
            const noteOut = interpolate(frame, [116, 126], [1, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            const noteVis = noteIn * noteOut;
            const noteZ = 92 + Math.sin(((frame - 60) / 44) * Math.PI * 2) * 3;
            const hl = interpolate(frame, [74, 86], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
            });
            return (
              <div style={{ transformStyle: 'preserve-3d', pointerEvents: 'none' }}>
                <div
                  style={{
                    position: 'absolute', left: 566, top: 736, width: 210, height: 74,
                    transform: 'translateZ(2px)',
                    background: 'radial-gradient(ellipse at 50% 50%, rgba(40,30,20,0.3), transparent 70%)',
                    filter: 'blur(12px)', opacity: 0.55 * noteVis,
                  }}
                />
                <div
                  style={{
                    position: 'absolute', left: 556, top: 668, width: 230,
                    transform: `translateZ(${noteZ}px) translateY(${(1 - noteIn) * 26}px)`,
                    opacity: noteVis, filter: `blur(${(1 - noteIn) * 4}px)`,
                  }}
                >
                  <div style={{ fontFamily: SERIF, fontSize: 37, fontWeight: 600, color: INK, lineHeight: 1.16, letterSpacing: '-0.012em' }}>
                    One card,
                  </div>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <div
                      style={{
                        position: 'absolute', left: -5, top: '12%', bottom: '4%',
                        width: `calc(${hl} * (100% + 10px))`,
                        background: 'oklch(88% 0.095 85)', borderRadius: 4,
                      }}
                    />
                    <div style={{ position: 'relative', fontFamily: SERIF, fontStyle: 'italic', fontSize: 37, fontWeight: 600, color: INK, lineHeight: 1.16, letterSpacing: '-0.012em' }}>
                      one project.
                    </div>
                  </div>
                </div>
              </div>
            );
          })() : null}
        </PageCam2D>

        {/* roving / locking spotlight: warm pool + dim outside */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(${poolRx}px ${poolRy}px at ${spotX}% ${spotY}%, rgba(255,241,214,0.42), rgba(255,241,214,0.10) 45%, rgba(70,56,38,${vignette * spotOn}) 100%)`,
            pointerEvents: 'none', opacity: spotOn,
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(300px 220px at ${spotX - 6}% ${spotY + 10}%, rgba(255,246,228,0.18), transparent 70%)`,
            pointerEvents: 'none', opacity: spotOn * 0.7,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
