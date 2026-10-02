// 频闪黑帧（strobe-black-frames）——节奏剪辑｜预告片 strobe / 剪映闪黑。
//
// 第二轮重设计（预告片倒数 · 黑与信号红）：
// - look = custom（graphite 底改成带一点暖紫的近黑 + 信号红 #ff2e3d）。画面是一张院线预告片式的发布海报：
//   2.39:1 遮幅黑边、居中 210px 超粗大写字标「PARALLAX」（虚构相机引擎），蓄压段只是一道白色空心描边——"还没来"。
// - 手法：全屏黑帧按写死帧号表闪现（每次 2f，间隔 8f→3f 收敛）；每闪一次右上角倒数 T–10 → T–01 跳一格，
//   频闪本身就是倒计时。压强随闪次逐级加码：暗角收紧、字标背后的红色变形镜头光条（anamorphic streak）越拉越长越亮。
// - 落锤：末闪掀开的那一帧同时发生四件事——构图零补间硬切 1.35×（CSS zoom 按目标尺寸栅格化，Q2）、
//   遮幅黑边消失、空心字变实心白、红光条炸满全宽；2f 压暗脉冲当锤点。之后元素层依次落定，镜头只做 2% 极缓推进。
//
// 时间表（30fps，共 150f）：
//   0–30    预备：眉题字距由宽收紧、空心字标 track 入场、倒数 T–10 淡入；全程 1.0→1.06 ease-in 蓄压推近
//   44–85   频闪窗：黑闪 [44,52,59,65,70,74,77,80,83] 各 2f（间隔 8,7,6,5,4,3,3,3）
//   85      落锤硬切（85–86 压暗 0.82）；光条 1.0 → 18f 衰减到 0.45
//   91–110  「AVAILABLE NOW」升起 → 三项规格错峰升起（97f 起，每项 4f）
//   110–150 hold 40f：极缓 2% 推进 ease-out 到 140f 定住
// 光敏警示：实战须配乐渐强同步，全片 ≤1 次。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Look, Stage, alpha, type } from '../../_fixtures/Look';

export const STROBE_BLACK_FRAMES_DURATION = 150; // 蓄压 85f + 落锤后 65f（含 40f hold）

// 自定义 look：石墨暗场 + 信号红（强调色只给光条、倒数和落锤后的副标）
const L: Look = {
  ...LOOKS.graphite,
  bg: ['#141114', '#0c0a0c', '#060506'],
  light: '#ff2e3d',
  accent: '#ff2e3d',
  accent2: '#ffffff',
  shadow: '#020001',
};

const FLASHES = [44, 52, 59, 65, 70, 74, 77, 80, 83]; // 写死帧号表，间隔必须收敛
const SLAM = 85;
const PUNCH = 1.35;
const ORIGIN_X = 960; // 落点 = 字标中心
const ORIGIN_Y = 540;
const BAR = 138; // 2.39:1 遮幅黑边高度（1080 − 1920/2.39 ≈ 277 → 上下各 ~138）

const isBlack = (f: number) => FLASHES.some((f0) => f >= f0 && f <= f0 + 1);
const flashesSoFar = (f: number) => FLASHES.filter((f0) => f >= f0).length;
const pushAt = (f: number) => (f < SLAM ? mix(1.0, 1.06, ramp(f, 0, SLAM - 1, (t) => t * t)) : mix(1, 1.02, ramp(f, SLAM, 55, EASE.out)));

const SPECS = [
  ['8K', 'RAW capture'],
  ['240', 'fps slow-mo'],
  ['0.9', 'kg body'],
] as const;

// 空心字标：系统字体的粗体字形轮廓互相重叠，直接 -webkit-text-stroke 会把内部重叠线也描出来。
// 改用 SVG 遮罩只留"外轮廓"：遮罩 = 白色描边字 − 黑色实心字（字身内部的重叠线被实心盖掉），只剩外侧半圈描边。
const HollowWord: React.FC<{ tracking: number; opacity: number }> = ({ tracking, opacity }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const t: React.SVGProps<SVGTextElement> = {
    x: 960, y: 540 + 75, textAnchor: 'middle', fontSize: 210, fontWeight: 900, fontFamily: FONT.sans,
    style: { letterSpacing: `${tracking.toFixed(4)}em` },
  };
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity }}>
      <defs>
        <mask id={`hw${id}`} maskUnits="userSpaceOnUse" x={0} y={0} width={1920} height={1080}>
          <text {...t} fill="#fff" stroke="#fff" strokeWidth={5} strokeLinejoin="round">PARALLAX</text>
          <text {...t} fill="#000">PARALLAX</text>
        </mask>
      </defs>
      <rect width={1920} height={1080} fill={L.ink} mask={`url(#hw${id})`} />
    </svg>
  );
};

export const StrobeBlackFrames: React.FC = () => {
  const frame = useCurrentFrame();
  const black = isBlack(frame);
  const slammed = frame >= SLAM;
  const zoom = slammed ? PUNCH : 1;
  const push = pushAt(frame);

  // 压强 0→1：按已闪次数逐级加码（每闪一次憋紧一档），落锤即释放
  const n = flashesSoFar(frame);
  const press = slammed ? 0 : Math.pow(n / FLASHES.length, 0.85);
  const tick = n > 0 && !slammed ? ramp(frame, FLASHES[n - 1] + 2, 5, EASE.out) : 1; // 每闪后光条先缩一下再长回（呼吸）
  const pulse = frame >= SLAM && frame <= SLAM + 1 ? 0.82 : 1;

  // 入场
  const eyebrowIn = ramp(frame, 2, 26, EASE.snappy);
  const nameIn = ramp(frame, 0, 30, EASE.snappy);
  const countIn = ramp(frame, 8, 14, EASE.out);
  // 落锤后的元素层
  const flare = slammed ? mix(1, 0.45, ramp(frame, SLAM, 18, EASE.out)) : mix(0.14, 0.62, press) * mix(0.8, 1, tick);
  const nowIn = ramp(frame, SLAM + 6, 14, EASE.snappy);

  const countdown = slammed ? 0 : 10 - n;

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.5 }} fill={null} intensity={slammed ? 0.5 : mix(0.25, 0.5, press)} grain={0} vignette={slammed ? 0.6 : mix(0.5, 0.92, press)} />

      {/* ───── 海报（被推近 / 被硬切放大的整层） ───── */}
      <div style={{
        position: 'absolute', inset: 0, filter: pulse < 1 ? `brightness(${pulse})` : undefined,
        transform: `scale(${push.toFixed(5)})`, transformOrigin: `${ORIGIN_X}px ${ORIGIN_Y}px`,
      }}>
        <div style={{
          position: 'absolute', width: 1920, height: 1080, zoom,
          left: ORIGIN_X / zoom - ORIGIN_X, top: ORIGIN_Y / zoom - ORIGIN_Y,
        }}>
          {/* 变形镜头光条：字标背后一道横向红光，蓄压段随压强拉长，落锤炸满全宽 */}
          <div style={{
            position: 'absolute', left: 960 - 980 * mix(0.35, 1, flare), width: 1960 * mix(0.35, 1, flare), top: 540 - 70, height: 140,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent, 0.55 * flare)} 0%, ${alpha(L.accent, 0.18 * flare)} 40%, ${alpha(L.accent, 0)} 72%)`,
            mixBlendMode: 'screen',
          }} />
          <div style={{
            position: 'absolute', left: 960 - 960 * mix(0.3, 1, flare), width: 1920 * mix(0.3, 1, flare), top: 540 - 2, height: 4,
            background: `linear-gradient(90deg, ${alpha(L.accent, 0)} 0%, ${alpha('#ffd3d6', 0.9 * flare)} 50%, ${alpha(L.accent, 0)} 100%)`,
            filter: 'blur(1.5px)', mixBlendMode: 'screen',
          }} />

          {/* 眉题 */}
          <div style={{
            position: 'absolute', top: 368, width: '100%', textAlign: 'center',
            ...type(28, 600, { caps: true }), letterSpacing: `${mix(1.1, 0.42, eyebrowIn).toFixed(3)}em`,
            color: slammed ? L.ink : L.ink2, opacity: eyebrowIn,
          }}>
            The new camera engine
          </div>

          {/* 字标：蓄压段空心描边 → 落锤实心 */}
          {slammed ? (
            <div style={{
              position: 'absolute', top: 540 - 108, width: '100%', textAlign: 'center',
              fontSize: 210, fontWeight: 900, lineHeight: 1.03, letterSpacing: '-0.035em',
              color: L.ink, textShadow: `0 0 40px ${alpha(L.accent, 0.35 * flare)}`,
            }}>
              PARALLAX
            </div>
          ) : (
            <HollowWord tracking={mix(0.12, -0.035, nameIn)} opacity={nameIn * mix(0.6, 1, press)} />
          )}

          {/* 蓄压段副标：日期（落锤后换成 AVAILABLE NOW） */}
          {!slammed && (
            <div style={{
              position: 'absolute', top: 700, width: '100%', textAlign: 'center',
              ...type(32, 500, { caps: true, mono: true }), letterSpacing: '0.3em', color: L.ink3, opacity: eyebrowIn,
            }}>
              11 · 04 · 2026
            </div>
          )}
          {slammed && (
            <>
              <div style={{
                position: 'absolute', top: 690, width: '100%', textAlign: 'center',
                ...type(40, 800, { caps: true }), letterSpacing: '0.36em', color: L.accent,
                opacity: nowIn, transform: `translateY(${mix(18, 0, nowIn)}px)`,
              }}>
                Available now
              </div>
              <div style={{ position: 'absolute', top: 770, width: '100%', display: 'flex', justifyContent: 'center', gap: 64 }}>
                {SPECS.map(([big, small], i) => {
                  const p = ramp(frame, SLAM + 12 + i * 4, 14, EASE.snappy);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, opacity: p, transform: `translateY(${mix(14, 0, p)}px)` }}>
                      <span style={{ ...type(40, 700, { mono: true }), color: L.ink }}>{big}</span>
                      <span style={{ ...type(28, 500, { caps: true }), letterSpacing: '0.14em', color: L.ink2 }}>{small}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ───── 遮幅黑边 + 倒数（蓄压段才有；落锤一帧撤掉） ───── */}
      {!slammed && (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: BAR, background: '#050405' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR, background: '#050405' }} />
          <div style={{ position: 'absolute', left: 120, top: BAR + 40, ...type(24, 600, { caps: true }), letterSpacing: '0.3em', color: L.ink3, opacity: countIn }}>
            Teaser · 02
          </div>
          <div style={{ position: 'absolute', right: 120, top: BAR + 26, display: 'flex', alignItems: 'baseline', gap: 10, opacity: countIn }}>
            <span style={{ ...type(30, 600, { mono: true }), color: L.ink3 }}>T–</span>
            <span style={{ ...type(64, 700, { mono: true }), color: n > 0 ? L.accent : L.ink, letterSpacing: '-0.02em' }}>
              {String(countdown).padStart(2, '0')}
            </span>
          </div>
          {/* 倒数刻度：每闪点亮一格 */}
          <div style={{ position: 'absolute', right: 120, top: BAR + 112, display: 'flex', gap: 6, opacity: countIn }}>
            {FLASHES.map((_, i) => (
              <div key={i} style={{ width: 18, height: 4, borderRadius: 2, background: i < n ? L.accent : alpha(L.ink, 0.16) }} />
            ))}
          </div>
        </>
      )}

      <Grain opacity={0.07 + 0.04 * press} blend="soft-light" />

      {/* 全屏黑闪层：每次 2f；带色相的近黑 + 颗粒，不是死平色块 */}
      {black && (
        <AbsoluteFill style={{ background: '#060406' }}>
          <Grain opacity={0.06} blend="screen" />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
