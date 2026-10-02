// platform-hinge-rise — 平台建立后，两块主体从相邻底部铰点反向翻起，最后结论台升入。
// 舞台 → 证据 → 结论 的三段式揭示；核心是两个相邻铰点产生方向相反的展开力（像一本书向上打开）。
//
// 第二轮重设计（石墨夜场 · 荧光黄绿发布会数据台）：
// - look = lime（石墨底 + 荧光黄绿）。原生 1920 坐标重画（不再是 480×270 小画布放大）。
// - 平台是一块 1280 宽的舞台台口：先由中心向两侧拉出一条荧光边线（16f expo-out），再向下"挤出"
//   台身前脸与顶面；台口边线是全场唯一的自发光体，给翻起的两块主体打底光。
// - 两块主体是为镜头设计的大数字证据牌：左「Cold build 9.4s」（620×430）、右「Cloud cost −41%」
//   （560×390，不对称）。铰点钉在台口中心两侧相邻的下角，左块从 -34° / 右块从 +34° 被平台上缘裁住、
//   从台后翻起（in-out 22f，按速度加纵向运动模糊），落定后一次阻尼回摆（左 1.6° / 右 -1.3°，右晚 1f）；
//   数字在落定前后从旧值滚到新值（38.0→9.4s / 0→−41%），读作"证据被摆上台"。
// - 背景语境：一枚大刻度环（基准测试表盘）比主体早 2f 起、晚 2f 收，低对比；远景透视网格地面 + 地平线光带。
// - 结论台从画外升入（24f expo-out），低对比石墨台面 + 64px 结论句「Forge ships 4× faster — for less.」，
//   只有「4× faster」用荧光色；词级错峰升起。
//
// 时间表（30fps，共 124f）：
//   0–16    台口荧光线由中心拉开（首帧就有一粒中心光点）；6–22 台身挤出
//   12–36   语境刻度环 scale .9→1 + 上浮淡入
//   16–38   双主体从相邻铰点反向翻起（22f in-out）；30–48 数字滚动到新值
//   38–56   阻尼回摆（三半波，振幅 ×(1-p)²），台口承重下沉 1.5px 回弹
//   62–86   结论台升入；68–90 结论句逐词升起（证据落定与结论之间隔 ≥ 6f）
//   90–124  hold：极缓推近 1→1.02，台口光呼吸
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, mix, ramp, velocity } from '../../_fixtures/Polish';
import { GridFloor, LOOKS, Stage, TextReveal, alpha, glow, type } from '../../_fixtures/Look';

export const PLATFORM_HINGE_RISE_DURATION = 124;

const L = LOOKS.lime;
const W = 1920;
const CX = W / 2;
const DECK_Y = 652; // 台口上缘（主体从它后面翻起）
const DECK_W = 1280;
const DECK_DEPTH = 34; // 顶面透视进深
const DECK_FACE = 46; // 前脸高度

// 双主体几何：铰点在台口中心两侧相邻（缝 16px）
const GAP = 16;
const LEFT = { w: 620, h: 430, rise: 400, rot: -34, wob: 1.6, delay: 0 };
const RIGHT = { w: 560, h: 390, rise: 360, rot: 34, wob: -1.3, delay: 1 };
const HINGE0 = 16;
const HINGE_DUR = 22;

const hingeP = (f: number) => ramp(f, HINGE0, HINGE_DUR, EASE.swift);
const wobble = (f: number, start: number, dur: number, amp: number) => {
  if (f <= start || f >= start + dur) return 0;
  const p = (f - start) / dur;
  return amp * Math.sin(p * Math.PI * 3) * (1 - p) ** 2;
};

const Panel: React.FC<{
  side: 'left' | 'right'; frame: number;
}> = ({ side, frame }) => {
  const g = side === 'left' ? LEFT : RIGHT;
  const isL = side === 'left';
  const p = hingeP(frame - g.delay);
  const wob = wobble(frame, HINGE0 + HINGE_DUR + g.delay, 18, g.wob);
  const rot = mix(g.rot, 0, p) + wob;
  const ty = mix(g.rise, 0, p);
  const left = isL ? CX - GAP / 2 - g.w : CX + GAP / 2;
  // 数字滚动（落定前 8f 起，14f expo-out）
  const roll = ramp(frame, 30 + g.delay, 16, EASE.snappy);
  const pct = Math.round(mix(0, 41, roll));
  const value = isL ? `${mix(38.0, 9.4, roll).toFixed(1)}s` : `${pct > 0 ? '−' : ''}${pct}%`;
  const was = isL ? 'was 38.0s on v3' : 'per deploy vs. v3';
  // 底光：台口荧光线照亮主体下沿（越立直越亮）
  const under = Math.min(1, p * 1.2);
  return (
    <div style={{
      position: 'absolute', left, top: DECK_Y - g.h + 6, width: g.w, height: g.h,
      transformOrigin: isL ? '100% 100%' : '0% 100%',
      transform: `translateY(${ty.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)`,
      borderRadius: 18, overflow: 'hidden',
      background: `linear-gradient(170deg, #1d2118 0%, ${L.surface} 55%, #0d0f0b 100%)`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.09), inset 0 0 0 1.5px ${L.line}, 0 30px 70px rgba(0,0,0,0.55)`,
      fontFamily: FONT.sans, color: L.ink,
    }}>
      {/* 底光 */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(0deg, ${alpha(L.accent, 0.2 * under)} 0%, ${alpha(L.accent, 0.05 * under)} 22%, rgba(0,0,0,0) 45%)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: alpha(L.accent, 0.6 * under) }} />
      <div style={{ position: 'absolute', left: 48, top: 44, right: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 24, letterSpacing: '0.16em', color: L.ink2 }}>{isL ? 'COLD BUILD' : 'CLOUD COST'}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.1em', color: L.ink3 }}>{isL ? 'A' : 'B'}</span>
      </div>
      <div style={{ position: 'absolute', left: 44, top: isL ? 104 : 112, ...type(isL ? 210 : 172, 800), letterSpacing: '-0.055em', whiteSpace: 'nowrap' }}>
        {value}
      </div>
      <div style={{ position: 'absolute', left: 48, bottom: 52, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{
          ...type(28, 700), color: L.onAccent, background: L.accent, borderRadius: 99, padding: '6px 16px', letterSpacing: '-0.01em',
          opacity: roll, transform: `translateY(${((1 - roll) * 10).toFixed(2)}px)`,
        }}>
          {isL ? '4.0× faster' : 'saves $7.0k/mo'}
        </span>
        <span style={{ ...type(30, 500), color: L.ink2 }}>{was}</span>
      </div>
    </div>
  );
};

// 语境刻度环：基准测试表盘（低对比背景层）
const ContextDial: React.FC<{ p: number; frame: number }> = ({ p, frame }) => {
  const R = 400;
  const ticks = 120;
  return (
    <div style={{
      position: 'absolute', left: CX - R, top: 330 - R, width: R * 2, height: R * 2,
      opacity: p * 0.9, transform: `translateY(${((1 - p) * 30).toFixed(2)}px) scale(${mix(0.9, 1, p).toFixed(4)})`,
    }}>
      <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="phr-disc">
            <stop offset="0" stopColor={L.accent} stopOpacity={0.07} />
            <stop offset="0.7" stopColor={L.accent} stopOpacity={0.025} />
            <stop offset="1" stopColor={L.accent} stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={R} cy={R} r={R - 4} fill="url(#phr-disc)" />
        <circle cx={R} cy={R} r={R - 40} fill="none" stroke={alpha(L.ink, 0.08)} strokeWidth={1.5} />
        {Array.from({ length: ticks }, (_, i) => {
          const a = (i / ticks) * Math.PI * 2 + frame * 0.0012;
          const long = i % 10 === 0;
          const r0 = R - 40;
          const r1 = r0 - (long ? 22 : 10);
          return (
            <line key={i} x1={R + Math.cos(a) * r0} y1={R + Math.sin(a) * r0} x2={R + Math.cos(a) * r1} y2={R + Math.sin(a) * r1}
              stroke={alpha(L.ink, long ? 0.3 : 0.13)} strokeWidth={long ? 2 : 1.2} />
          );
        })}
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 18, textAlign: 'center', fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.24em', color: alpha(L.ink2, 0.75) }}>
        FORGE BENCHMARK · Q3 2026
      </div>
    </div>
  );
};

export const PlatformHingeRise: React.FC = () => {
  const frame = useCurrentFrame();
  const line = ramp(frame, 0, 16, EASE.snappy); // 台口光线拉开
  const extrude = ramp(frame, 6, 16, EASE.out); // 台身挤出
  const ctx = ramp(frame, 12, 24, EASE.out);
  const verdict = ramp(frame, 62, 24, EASE.snappy);
  const press = (() => {
    const t0 = HINGE0 + HINGE_DUR - 1;
    if (frame < t0) return 0;
    return 1.5 * Math.sin(Math.min(1, (frame - t0) / 8) * Math.PI) * Math.exp(-(frame - t0) / 10);
  })();
  const riseV = velocity((f) => LEFT.rise * (1 - hingeP(f)), frame);
  const push = 1 + 0.02 * ramp(frame, 70, 54, EASE.swift);
  const breathe = 0.85 + 0.15 * Math.sin(frame / 14);
  const lineGlow = line * (frame > 90 ? breathe : 1);

  const deckL = CX - DECK_W / 2;
  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={{ x: 0.5, y: 1.05 }} horizon={DECK_Y / 1080} intensity={0.42}>
        <GridFloor look={L} horizon={DECK_Y / 1080 + 0.02} cell={1.1} opacity={0.22} scroll={frame * 0.004} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 58%' }}>
        <ContextDial p={ctx} frame={frame} />

        {/* 主体：裁切线 = 台口上缘，从台后翻起 */}
        <AbsoluteFill style={{ clipPath: `inset(0 0 ${1080 - DECK_Y - press}px 0)` }}>
          <SpeedBlur vx={0} vy={riseV} amount={0.35} max={14}>
            <Panel side="left" frame={frame} />
            <Panel side="right" frame={frame} />
          </SpeedBlur>
        </AbsoluteFill>

        {/* 台口：顶面（透视梯形）+ 前脸 + 荧光边线 */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: 1080, transform: `translateY(${press.toFixed(3)}px)` }}>
          {/* 落地接触影 / 台口在地面上的反光 */}
          <div style={{
            position: 'absolute', left: deckL - 60, width: DECK_W + 120, top: DECK_Y + DECK_FACE - 10, height: 90, borderRadius: '50%',
            background: `radial-gradient(closest-side, ${alpha(L.accent, 0.16 * extrude)}, rgba(0,0,0,0))`, filter: 'blur(8px)',
          }} />
          {/* 顶面：从中心向两侧随光线一起展开 */}
          <div style={{
            position: 'absolute', left: deckL, top: DECK_Y - 2, width: DECK_W, height: DECK_DEPTH * extrude,
            transform: `scaleX(${line.toFixed(4)})`, transformOrigin: '50% 0%',
            clipPath: 'polygon(1.6% 0, 98.4% 0, 100% 100%, 0 100%)',
            background: `linear-gradient(180deg, #2a2f22 0%, #1a1d15 100%)`,
          }} />
          {/* 前脸 */}
          <div style={{
            position: 'absolute', left: deckL, top: DECK_Y - 2 + DECK_DEPTH * extrude, width: DECK_W, height: DECK_FACE * extrude,
            transform: `scaleX(${line.toFixed(4)})`, transformOrigin: '50% 0%',
            background: `linear-gradient(180deg, #14170f 0%, #0b0c09 100%)`,
            boxShadow: `inset 0 1px 0 ${alpha(L.accent, 0.5)}`,
          }}>
            {/* 前脸刻度（纹理） */}
            <div style={{
              position: 'absolute', inset: '14px 40px', opacity: 0.5,
              background: `repeating-linear-gradient(90deg, ${alpha(L.ink, 0.16)} 0 2px, transparent 2px 40px)`,
            }} />
          </div>
          {/* 荧光边线（台口上缘）：中心先亮，向两侧拉开 */}
          <div style={{
            position: 'absolute', left: deckL, top: DECK_Y - 3, width: DECK_W, height: 4, borderRadius: 2,
            transform: `scaleX(${Math.max(0.006, line).toFixed(4)})`, transformOrigin: '50% 50%',
            background: `linear-gradient(90deg, ${alpha(L.accent, 0)} 0%, ${L.accent} 12%, #f4ffd0 50%, ${L.accent} 88%, ${alpha(L.accent, 0)} 100%)`,
            boxShadow: glow(L.accent, 0.9 * lineGlow),
          }} />
          {/* 台口光往上的一层薄雾（照亮主体底部区域） */}
          <div style={{
            position: 'absolute', left: deckL + 80, width: DECK_W - 160, top: DECK_Y - 140, height: 140,
            background: `radial-gradient(ellipse 50% 100% at 50% 100%, ${alpha(L.accent, 0.14 * lineGlow)}, rgba(0,0,0,0) 80%)`,
            transform: `scaleX(${line.toFixed(4)})`,
          }} />
        </div>

        {/* 结论台：总结层，台面对比低于两块主体；从画外升入 */}
        <div style={{
          position: 'absolute', left: CX - 720, top: 790, width: 1440, height: 230,
          transform: `translateY(${((1 - verdict) * 320).toFixed(2)}px)`,
          opacity: Math.min(1, verdict * 2.2),
        }}>
          <div style={{
            position: 'absolute', inset: 0, clipPath: 'polygon(7% 0, 93% 0, 100% 100%, 0 100%)',
            background: `linear-gradient(180deg, ${alpha('#20241a', 0.92)} 0%, ${alpha('#0e100b', 0.6)} 100%)`,
          }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1.5, background: alpha(L.ink, 0.18) }} />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 36, textAlign: 'center' }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.28em', color: L.ink3, marginBottom: 14 }}>VERDICT</div>
            <div style={{ ...type(64, 700), color: L.ink, letterSpacing: '-0.03em' }}>
              <TextReveal text="Forge ships" by="word" variant="rise" start={68} each={16} gap={4} />{' '}
              <TextReveal text="4× faster" by="word" variant="rise" start={76} each={16} gap={4} unitStyle={() => ({ color: L.accent })} />{' '}
              <TextReveal text="— for less." by="word" variant="rise" start={84} each={16} gap={4} />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
