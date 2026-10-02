// outro-group-photo-launch —— 全片元素四方飞来围住字标合影，crane 落机位 + 舞台光 +
// 金尘做成发布会收场。outro/品牌收尾，多功能产品"全家福"式终镜，能量推到全片最高。
// 参考实现从 template SceneOutroLive 剥离（self-contained）：
// 9 个页面元素从四方带旋转飞入（cue 4 起每 3f 一个，飞 12f，bezier y1>1 真过冲，
// 渲染顺序=cue 顺序后到者叠上），落地强调色 glow（0.35→0）；字标 letterpress 逐字
// 登场（delay=42+i·1.8）全员退后排（opacity −12% / saturate −8%）；rule 长出 +
// 190px 延长线射出；crane 运镜 perspective rotateX(4°→0) + scale 落下后缓推；
// 发布会三件套：开场光带扫过、字标背后舞台光、20 颗确定性金尘上飘；背景页 blur 化
// 景深；落定后 sign-off hold 30f。outro 不加解说 caption 保持干净。
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D } from '../../_fixtures/PageCam2D';
import { EASE, Grain, SpeedBlur, ramp, velocity } from '../../_fixtures/Polish';
import layout from '../../_textures/live-layout.json';

export const OUTRO_GROUP_PHOTO_LAUNCH_DURATION = 145;

const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const LETTERS = 'AI Foundation Lab'.split('');
const PAGE_H = layout.projects.pageH;
const WBR_PAGE_H = layout.wbr.pageH;

const FLY_EASE = Easing.bezier(0.34, 1.4, 0.44, 1);
const CRANE_EASE = Easing.bezier(0.3, 0, 0.2, 1);

type FlyEl = {
  key: string;
  file: string;
  w: number;
  h: number;
  cx: number;
  cy: number;
  scale: number;
  rot: number;
  dx: number;
  dy: number;
  radius: number;
  cue: number;
  wbrCrop?: boolean;
};

// render order = cue order, so later arrivals stack on top
const ELS: FlyEl[] = [
  { key: 'nav', file: 'nav.png', w: 1920, h: 61, cx: 960, cy: 84, scale: 0.62, rot: 0, dx: 0, dy: -120, radius: 10, cue: 4 },
  { key: 'card4', file: 'card4-hires.png', w: 358, h: 312, cx: 280, cy: 300, scale: 0.72, rot: -5, dx: -500, dy: 0, radius: 16, cue: 7 },
  { key: 'card1', file: 'card1.png', w: 358, h: 288, cx: 1640, cy: 318, scale: 0.68, rot: 4, dx: 500, dy: 0, radius: 16, cue: 10 },
  { key: 'paper1', file: 'paper1.png', w: 1104, h: 225, cx: 1460, cy: 730, scale: 0.5, rot: -3, dx: 450, dy: 260, radius: 12, cue: 13 },
  { key: 'card7', file: 'card7.png', w: 358, h: 312, cx: 260, cy: 800, scale: 0.6, rot: 3, dx: -400, dy: 300, radius: 16, cue: 16 },
  { key: 'paper3', file: 'paper3.png', w: 1104, h: 225, cx: 620, cy: 930, scale: 0.48, rot: 2, dx: 0, dy: 320, radius: 12, cue: 19 },
  { key: 'search', file: 'float-search.png', w: 1016, h: 44, cx: 760, cy: 180, scale: 0.55, rot: -1.5, dx: 0, dy: -240, radius: 10, cue: 22 },
  { key: 'stats', file: 'float-stats.png', w: 315, h: 56, cx: 1560, cy: 950, scale: 0.9, rot: -2, dx: 380, dy: 0, radius: 10, cue: 25 },
  { key: 'wbr', file: 'wbr-full.png', w: 688, h: 54, cx: 1620, cy: 170, scale: 0.8, rot: 2.5, dx: 360, dy: -200, radius: 8, cue: 28, wbrCrop: true },
];

// 20 gold dust motes, all parameters index-derived (deterministic)
// 质感：每颗带一圈暖光晕（亮场上才看得见"金"），另加 6 颗前景失焦大光斑（bokeh）做景深层
const DUST = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 439 + 137) % 1920,
  y0: (i * 613 + 271) % 1080,
  rise: 0.3 + (i % 5) * 0.11,
  swayAmp: 9 + (i % 4) * 5,
  swayFreq: 0.022 + (i % 3) * 0.008,
  phase: (i * 0.83) % (Math.PI * 2),
  size: 2.4 + (i % 3) * 0.9,
  opacity: 0.35 + ((i * 7) % 5) * 0.09,
}));
const BOKEH = Array.from({ length: 6 }, (_, i) => ({
  x: (i * 701 + 260) % 1920,
  y0: (i * 389 + 640) % 1080,
  rise: 0.55 + (i % 3) * 0.2,
  size: 14 + (i % 3) * 7,
  opacity: 0.1 + (i % 2) * 0.06,
}));

export const OutroGroupPhotoLaunch: React.FC = () => {
  const frame = useCurrentFrame();
  const duration = OUTRO_GROUP_PHOTO_LAUNCH_DURATION;

  const blur = interpolate(frame, [0, 24], [0, 14], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.4, 1),
  });
  const rule = interpolate(frame, [58, 70], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const tag = ramp(frame, 68, 12, EASE.out);
  // 收尾淡到暖墨色（显式底色，不淡到透明），ease-in：先慢后快地"熄灯"
  const fadeOut = 1 - ramp(frame, duration - 12, 11, EASE.exit); // 末帧恰好全暗，定格尾帧干净
  const recede = interpolate(frame, [42, 50], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // crane on the whole group-photo layer
  const craneT = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: CRANE_EASE,
  });
  // 缓推从零速起步（与 crane 的减速收尾衔接，避免 f40 处速度突变）
  const pushT = ramp(frame, 36, duration - 36, EASE.smooth);
  const camScale = 1.06 - 0.06 * craneT + 0.035 * pushT;
  const camTilt = 4 * (1 - craneT);

  // opening light sweep
  const sweepX = interpolate(frame, [2, 14], [-700, 2020], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.6, 1),
  });
  const sweepOpacity = interpolate(frame, [2, 5, 11, 14], [0, 0.12, 0.12, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // stage light behind the wordmark
  const stageLight = interpolate(frame, [42, 50, 58], [0, 0.55, 0.32], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const vignette = interpolate(frame, [42, 54], [0, 0.1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // rule extension lines
  const ruleExt = interpolate(frame, [58, 66], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const ruleExtFade = interpolate(frame, [66, 72], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // one breath of letter-spacing once the wordmark is fully set
  const wordSpacing = interpolate(frame, [62, 66], [-0.01, 0.005], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
  });

  return (
    <AbsoluteFill style={{ background: '#0f0d0a' }}>
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* group-photo layer under a slow crane-in camera */}
      <AbsoluteFill
        style={{
          transform: `perspective(1400px) rotateX(${camTilt}deg) scale(${camScale})`,
          transformOrigin: '50% 45%',
        }}
      >
        {/* blur 只作用背景页：PageCam2D 自闭合，飞入元素放在未过滤的兄弟层
            （屏幕空间坐标，与 template SceneOutroLive 同构）——放进 children
            会连"合影元素"一起糊掉，只剩字标清晰 */}
        <PageCam2D src="textures/live/projects-full.png" pageH={PAGE_H} keys={[{ frame: 0, cx: 960, cy: 700, zoom: 0.75 }]} blur={blur} />
        {/* warm scrim under the flying elements */}
        <AbsoluteFill style={{ background: 'radial-gradient(1200px 800px at 50% 48%, rgba(250,247,242,0.82), rgba(250,247,242,0.55) 60%, rgba(250,247,242,0.35))', pointerEvents: 'none' }} />

        {/* group photo: elements fly in from all sides and settle around the wordmark */}
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {ELS.map((el) => {
            if (frame < el.cue) return null;
            const t = interpolate(frame, [el.cue, el.cue + 12], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: FLY_EASE,
            });
            const opacity = interpolate(frame, [el.cue, el.cue + 3], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            const x = el.dx * (1 - t);
            const y = el.dy * (1 - t);
            const rot = el.rot * (2 - t);
            const scale = el.scale * (1.12 - 0.12 * t);
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
            // 方向性运动模糊：按屏幕速度（px/帧）沿飞行方向拖影，落地后为 0（替代滞后 ghost 残影）
            const posAt = (fr: number) => {
              const tt = interpolate(fr, [el.cue, el.cue + 12], [0, 1], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: FLY_EASE,
              });
              return [el.dx * (1 - tt), el.dy * (1 - tt)];
            };
            const vx = velocity((fr) => posAt(fr)[0], frame);
            const vy = velocity((fr) => posAt(fr)[1], frame);
            // 落地压实：过冲回落的那 4f 里接触影收紧、元素 1.5% 轻压
            const land = interpolate(frame, [el.cue + 9, el.cue + 12, el.cue + 16], [0, 1, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });

            return (
              <SpeedBlur key={el.key} vx={vx} vy={vy} amount={0.3} max={22}>
                <div
                  style={{
                    position: 'absolute', left: el.cx - el.w / 2, top: el.cy - el.h / 2,
                    width: el.w, height: el.h,
                    transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale * (1 - 0.015 * land)})`,
                    transformOrigin: 'center center', borderRadius: el.radius, overflow: 'hidden',
                    boxShadow: land > 0.01 ? `0 ${10 - 5 * land}px ${24 - 12 * land}px rgba(30,25,18,${0.16 + 0.06 * land}), 0 2px 6px rgba(30,25,18,${0.08 + 0.06 * land})` : shadow,
                    opacity: settledOpacity, filter: `saturate(${saturate})`, ...texture,
                  }}
                >
                  {el.wbrCrop ? null : (
                    <Img src={staticFile(`textures/live/${el.file}`)} style={{ position: 'absolute', inset: 0, width: el.w, height: el.h, display: 'block' }} />
                  )}
                </div>
              </SpeedBlur>
            );
          })}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* gold dust drifting up in front of the group photo */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {DUST.map((d, i) => {
          const y = (((d.y0 - frame * d.rise) % 1080) + 1080) % 1080;
          const x = d.x + Math.sin(frame * d.swayFreq + d.phase) * d.swayAmp;
          const twinkle = 0.7 + 0.3 * Math.sin(frame * 0.21 + d.phase * 3);
          return (
            <div
              key={i}
              style={{
                position: 'absolute', left: x, top: y, width: d.size, height: d.size,
                borderRadius: '50%', background: 'oklch(78% 0.085 80)', opacity: d.opacity * twinkle,
                boxShadow: `0 0 ${d.size * 2.5}px ${d.size * 0.6}px oklch(84% 0.08 82 / 0.6)`,
              }}
            />
          );
        })}
        {/* 前景失焦光斑：大而虚、上飘更快，压在合影最前面做景深 */}
        {BOKEH.map((b, i) => {
          const y = (((b.y0 - frame * b.rise) % 1180) + 1180) % 1180 - 50;
          return (
            <div
              key={`b${i}`}
              style={{
                position: 'absolute', left: b.x, top: y, width: b.size, height: b.size, borderRadius: '50%',
                background: 'radial-gradient(circle, oklch(86% 0.1 82 / 0.9) 0%, oklch(86% 0.1 82 / 0.35) 55%, oklch(86% 0.1 82 / 0) 72%)',
                opacity: b.opacity, filter: 'blur(2px)',
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* opening light sweep */}
      {sweepOpacity > 0 ? (
        <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay' }}>
          <div
            style={{
              position: 'absolute', top: 0, bottom: 0, left: sweepX - 300, width: 600,
              background: 'linear-gradient(90deg, rgba(255,244,224,0), rgba(255,244,224,1) 50%, rgba(255,244,224,0))',
              opacity: sweepOpacity,
            }}
          />
        </AbsoluteFill>
      ) : null}

      {/* stage light behind the wordmark */}
      {stageLight > 0 ? (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: 'radial-gradient(700px 360px at 960px 470px, rgba(255,246,228,0.95), rgba(255,246,228,0.35) 55%, rgba(255,246,228,0) 75%)',
            opacity: stageLight,
          }}
        />
      ) : null}

      {/* closing vignette */}
      {vignette > 0 ? (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: 'radial-gradient(1400px 900px at 50% 50%, rgba(62,48,32,0) 55%, rgba(62,48,32,0.7) 100%)',
            opacity: vignette,
          }}
        />
      ) : null}

      {/* wordmark sign-off */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: SERIF, fontSize: 148, fontWeight: 600, color: 'oklch(18% 0.006 82)', letterSpacing: `${wordSpacing}em`, display: 'flex',
            // letterpress：下沿 1px 纸面高光 + 一层极软的环境影，让字标"压"在合影之上而不是浮在纸上
            textShadow: '0 1px 0 rgba(255,253,248,0.75), 0 14px 36px rgba(60,44,24,0.14)',
          }}>
            {LETTERS.map((ch, i) => {
              const delay = Math.round(42 + i * 1.8);
              const t = interpolate(frame, [delay, delay + 8], [0, 1], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.75, 0.3, 1),
              });
              return (
                <span
                  key={i}
                  style={{
                    opacity: t, transform: `translateY(${(1 - t) * 28}px) scale(${1.35 - 0.35 * t})`,
                    filter: `blur(${(1 - t) * 8}px)`, display: 'inline-block', whiteSpace: 'pre',
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          <div style={{ position: 'relative', height: 6, width: 260, margin: '34px auto 0' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 3, background: 'oklch(52% 0.115 65)', transform: `scaleX(${rule})` }} />
            {ruleExt > 0 && ruleExtFade > 0 ? (
              <>
                <div style={{ position: 'absolute', top: 2.5, height: 1, right: '100%', width: 190 * ruleExt, background: 'oklch(52% 0.115 65)', opacity: ruleExtFade }} />
                <div style={{ position: 'absolute', top: 2.5, height: 1, left: '100%', width: 190 * ruleExt, background: 'oklch(52% 0.115 65)', opacity: ruleExtFade }} />
              </>
            ) : null}
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 32, letterSpacing: '0.16em', color: 'oklch(42% 0.008 82)', marginTop: 30, textTransform: 'uppercase',
            opacity: tag, transform: `translateY(${(1 - tag) * 6}px)`,
          }}>
            Team Research Console
          </div>
        </div>
      </AbsoluteFill>
      {/* 极弱胶片颗粒：大面积奶白纸面防色带 */}
      <Grain opacity={0.045} />
    </AbsoluteFill>
    </AbsoluteFill>
  );
};
