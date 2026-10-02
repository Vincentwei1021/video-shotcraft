// assemble-then-type-flyin — 先骨架后文字：页面"自己长出来"
//
// 第二轮重设计（石墨暗场 · 胶片金 · 调色软件发布页）：
// - look = graphite（近单色暗场，accent2 胶片金作唯一强调色）。成形后的画面是虚构调色软件「Obscura 3」的
//   发布页：玻璃导航条、112px 衬线大标题「Grade every frame / like it was film.」（film. 为金色斜体）、
//   说明句、金色 CTA + 描边次按钮、三枚指标块；右侧是一张 640×760 的「调色台」卡（上半是一帧胶片画面，
//   下半是 LIFT / GAMMA / GAIN 三只色轮）。
// - 两段式手法不变、维度分开：
//   ① 骨架段 6–50f：10 个无字骨架件（框、色块、分隔线、色轮圈）从画外 120–420px 平面飞入，
//      overshoot 过冲贴合 + ±7° 旋转回正，按真实速度给方向性运动模糊；开场画面里先有 12 栏版式参考线。
//   ② 文字段 58–128f：每个字符带确定性种子的 dx ±260 / dy ±200 / dz −200→−760 / rotateX/Y/Z ±120–190°，
//      perspective(900px) 下翻滚着落位，远处虚近处实；先大标题、后导航与说明、最后 mono 小标注。
//      块内字间隔按字数自适应，保证全部在 128f 前落定。
// - 收尾一笔（落定后的"定稿"信号）：CTA 由描边通电成金色实底；胶片画面从扁平的 log 灰片被一道竖向
//   擦除线"调色"成暖金成片 —— 呼应标题。
//
// 时间表（30fps，共 168f）：
//   0–8     版式参考线就位（第 1 帧即有画面）
//   6–50    骨架飞入（10 件，起飞间隔先密后疏）
//   50–58   停半拍：骨架齐了、参考线退淡（两段之间的语义断点）
//   58–128  文字 3D 逐字落位（大字 58/66 → 导航/说明 76–92 → 指标 96–102 → 小标注 104–114）
//   118–146 CTA 通电、胶片画面调色擦除（124–146），色轮控制点同步从中性推到偏色位
//   128–168 hold（40f）：整页 1.5% 极缓推近
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, ramp } from '../../_fixtures/Polish';
import { LOOKS, SERIF, Stage, alpha, type } from '../../_fixtures/Look';

export const ASSEMBLE_THEN_TYPE_FLYIN_DURATION = 168;

const L = LOOKS.graphite;
const GOLD = L.accent2;

const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ───────────── 骨架件（无字）：from = 飞入起点位移，rot = 起始旋转，at = 起飞帧 ─────────────
type Shell = { from: [number, number]; rot: number; at: number };
const SHELL_DUR = 16;
const SH: Record<string, Shell> = {
  nav: { from: [0, -180], rot: 0, at: 6 },
  card: { from: [420, 40], rot: 6, at: 10 },
  logo: { from: [-220, -80], rot: -7, at: 15 },
  wheels: { from: [260, 220], rot: 5, at: 19 },
  divider: { from: [-320, 0], rot: 0, at: 23 },
  cta: { from: [-160, 200], rot: -5, at: 27 },
  ghost: { from: [120, 220], rot: 4, at: 31 },
  stat1: { from: [-240, 260], rot: -6, at: 35 },
  stat2: { from: [0, 300], rot: 3, at: 39 },
  stat3: { from: [220, 280], rot: 6, at: 44 },
};

// ───────────── 文字块：逐字 3D 落位 ─────────────
type Seg = { s: string; color?: string; italic?: boolean };
type Block = { x: number; y: number; start: number; style: React.CSSProperties; segs: Seg[]; w?: number; align?: 'center' | 'right' };
const MONO = FONT.mono;
const BLOCKS: Block[] = [
  { x: 120, y: 298, start: 58, style: { fontFamily: SERIF, fontSize: 112, fontWeight: 400, letterSpacing: '-0.025em', color: L.ink, lineHeight: 1 }, segs: [{ s: 'Grade every frame' }] },
  { x: 120, y: 424, start: 66, style: { fontFamily: SERIF, fontSize: 112, fontWeight: 400, letterSpacing: '-0.025em', color: L.ink, lineHeight: 1, fontStyle: 'italic' }, segs: [{ s: 'like it was ' }, { s: 'film.', color: GOLD }] },
  { x: 196, y: 82, start: 76, style: { ...type(34, 700), color: L.ink }, segs: [{ s: 'Obscura' }] },
  { x: 1060, y: 86, start: 79, style: { ...type(28, 500), color: L.ink2 }, segs: [{ s: 'Features' }] },
  { x: 1215, y: 86, start: 80, style: { ...type(28, 500), color: L.ink2 }, segs: [{ s: 'Film stocks' }] },
  { x: 1405, y: 86, start: 81, style: { ...type(28, 500), color: L.ink2 }, segs: [{ s: 'Pricing' }] },
  { x: 1574, y: 86, w: 202, align: 'center', start: 84, style: { ...type(28, 650), color: L.ink }, segs: [{ s: 'Download' }] },
  { x: 120, y: 246, start: 86, style: { fontFamily: MONO, fontSize: 24, fontWeight: 600, letterSpacing: '0.12em', color: GOLD }, segs: [{ s: 'OBSCURA 3 · PUBLIC BETA' }] },
  { x: 120, y: 604, start: 88, style: { ...type(36, 400), color: L.ink2 }, segs: [{ s: 'Print-film color science for any timeline.' }] },
  { x: 120, y: 719, w: 320, align: 'center', start: 92, style: { ...type(32, 650), color: '#16120a' }, segs: [{ s: 'Start grading' }] },
  { x: 466, y: 719, w: 320, align: 'center', start: 95, style: { ...type(32, 550), color: L.ink }, segs: [{ s: 'Watch the film' }] },
  { x: 150, y: 862, start: 96, style: { ...type(56, 750), color: L.ink }, segs: [{ s: '12-bit' }] },
  { x: 488, y: 862, start: 99, style: { ...type(56, 750), color: L.ink }, segs: [{ s: '4K 120' }] },
  { x: 826, y: 862, start: 102, style: { ...type(56, 750), color: L.ink }, segs: [{ s: '0.8 ms' }] },
  { x: 150, y: 934, start: 104, style: { fontFamily: MONO, fontSize: 22, letterSpacing: '0.12em', color: L.ink3 }, segs: [{ s: 'COLOR PIPELINE' }] },
  { x: 488, y: 934, start: 106, style: { fontFamily: MONO, fontSize: 22, letterSpacing: '0.12em', color: L.ink3 }, segs: [{ s: 'LIVE PLAYBACK' }] },
  { x: 826, y: 934, start: 108, style: { fontFamily: MONO, fontSize: 22, letterSpacing: '0.12em', color: L.ink3 }, segs: [{ s: 'PER FRAME' }] },
  { x: 1196, y: 252, start: 110, style: { fontFamily: MONO, fontSize: 22, letterSpacing: '0.1em', color: alpha('#ffffff', 0.85) }, segs: [{ s: 'FRAME 0412 · OB-50' }] },
  { x: 1160, y: 908, w: 213, align: 'center', start: 112, style: { fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em', color: L.ink2 }, segs: [{ s: 'LIFT' }] },
  { x: 1373, y: 908, w: 214, align: 'center', start: 113, style: { fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em', color: L.ink2 }, segs: [{ s: 'GAMMA' }] },
  { x: 1587, y: 908, w: 213, align: 'center', start: 114, style: { fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em', color: L.ink2 }, segs: [{ s: 'GAIN' }] },
];
const TEXT_END = 128; // 每块最后一字落定上限
const CHAR_DUR = 16;

type CharP = { dx: number; dy: number; dz: number; rx: number; ry: number; rz: number };
let seedK = 0;
const CHAR_PARAMS: CharP[][][] = BLOCKS.map((b) =>
  b.segs.map((sg) =>
    Array.from(sg.s, () => {
      const k = seedK++;
      return {
        dx: (rand(k) - 0.5) * 520, dy: (rand(k + 50) - 0.5) * 400, dz: -200 - rand(k + 99) * 560,
        rx: (rand(k + 7) - 0.5) * 340, ry: (rand(k + 13) - 0.5) * 380, rz: (rand(k + 23) - 0.5) * 240,
      };
    }),
  ),
);

const FlyBlock: React.FC<{ b: Block; bi: number; frame: number }> = ({ b, bi, frame }) => {
  const n = CHAR_PARAMS[bi].reduce((a, s) => a + s.length, 0);
  const step = Math.min(1.6, Math.max(0.35, (TEXT_END - b.start - CHAR_DUR) / n));
  let ci = 0;
  return (
    <div style={{
      position: 'absolute', left: b.x, top: b.y, width: b.w, textAlign: b.align, whiteSpace: 'nowrap', ...b.style,
    }}>
      {b.segs.map((sg, si) => (
        <span key={si} style={{ color: sg.color, fontStyle: sg.italic ? 'italic' : undefined }}>
          {Array.from(sg.s, (ch, k) => {
            const c = CHAR_PARAMS[bi][si][k];
            const ft = b.start + ci++ * step;
            const a = ramp(frame, ft, CHAR_DUR, EASE.snappy);
            const far = (1 - a) * (1 - a);
            const blur = far * (1 + (-c.dz / 760) * 7);
            const glyph = ch === ' ' ? '\u00a0' : ch; // 空格塞成不换行空格，否则 inline-block 空 span 宽度归零
            return (
              <span key={k} style={{
                display: 'inline-block', opacity: a > 0 ? Math.min(1, a * 1.8) : 0,
                filter: a > 0 && a < 1 && blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : undefined,
                transform: a >= 1 ? 'none' :
                  `perspective(900px) translate3d(${((1 - a) * c.dx).toFixed(1)}px,${((1 - a) * c.dy).toFixed(1)}px,${((1 - a) * c.dz).toFixed(1)}px) ` +
                  `rotateX(${((1 - a) * c.rx).toFixed(1)}deg) rotateY(${((1 - a) * c.ry).toFixed(1)}deg) rotateZ(${((1 - a) * c.rz).toFixed(1)}deg)`,
              }}>
                {glyph}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
};

// 面板材质：带色相的深色 + 低透明度白描边 + 顶部内高光 + 两层软阴影
const PANEL: React.CSSProperties = {
  background: 'linear-gradient(180deg, #1d1e22 0%, #16171a 100%)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 4px rgba(0,0,0,0.5), 0 30px 60px -24px rgba(0,0,0,0.85)',
};

// 胶片画面：暮色天空 + 低悬的太阳 + 三层山影 + 水面反光（纯渐变 / SVG，graded 控制 log 灰片 ↔ 成片）
const FilmStill: React.FC<{ graded: boolean }> = ({ graded }) => (
  <div style={{
    position: 'absolute', inset: 0,
    filter: graded ? 'saturate(1.15) contrast(1.08)' : 'saturate(0.12) contrast(0.62) brightness(1.18)',
    background: 'linear-gradient(180deg, #1c2a3a 0%, #6b5a5a 38%, #e09a52 60%, #f2c27a 66%, #3a2a22 67%, #1a1410 100%)',
  }}>
    <div style={{ position: 'absolute', left: 300, top: 196, width: 120, height: 120, borderRadius: 60, background: 'radial-gradient(circle, #fff1cf 0%, #ffd58a 45%, rgba(255,190,110,0) 72%)' }} />
    <svg width={640} height={500} viewBox="0 0 640 500" style={{ position: 'absolute', left: 0, top: 0 }}>
      <path d="M0 300 L80 262 L150 284 L240 236 L330 276 L420 244 L520 280 L640 250 L640 340 L0 340 Z" fill="#7a5040" opacity={0.7} />
      <path d="M0 322 L110 292 L210 314 L300 286 L400 318 L500 296 L640 318 L640 340 L0 340 Z" fill="#4a3028" />
      <rect x={0} y={334} width={640} height={166} fill={`url(#water${graded ? 'g' : 'l'})`} />
      <defs>
        <linearGradient id={`water${graded ? 'g' : 'l'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c47a3c" />
          <stop offset="0.25" stopColor="#4a3226" />
          <stop offset="1" stopColor="#120d0a" />
        </linearGradient>
      </defs>
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={338 - i * 6} y={346 + i * 18} width={44 + i * 12} height={3} rx={1.5} fill="#ffd9a0" opacity={0.55 - i * 0.07} />
      ))}
    </svg>
  </div>
);

const Wheel: React.FC<{ cx: number; hue: string; dot: [number, number]; k: number }> = ({ cx, hue, dot, k }) => (
  <div style={{ position: 'absolute', left: cx - 74, top: 0, width: 148, height: 148 }}>
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      background: `conic-gradient(from 90deg, #c95a5a, #c9b25a, #5ac97a, #5ab2c9, #6a5ac9, #c95ab2, #c95a5a)`, opacity: 0.55,
      WebkitMaskImage: 'radial-gradient(circle, transparent 54%, #000 56%, #000 70%, transparent 71%)',
      maskImage: 'radial-gradient(circle, transparent 54%, #000 56%, #000 70%, transparent 71%)',
    }} />
    <div style={{ position: 'absolute', inset: 26, borderRadius: '50%', background: 'radial-gradient(circle, #2a2b30 0%, #1a1b1f 100%)', border: '1px solid rgba(255,255,255,0.08)' }} />
    <div style={{ position: 'absolute', left: 74 + dot[0] * k - 9, top: 74 + dot[1] * k - 9, width: 18, height: 18, borderRadius: 9, background: hue, boxShadow: `0 0 0 3px rgba(0,0,0,0.5), 0 0 12px ${hue}` }} />
  </div>
);

export const AssembleThenTypeFlyin: React.FC = () => {
  const frame = useCurrentFrame();

  const shellAt = (s: Shell, f: number) => {
    const a = ramp(f, s.at, SHELL_DUR, EASE.overshoot);
    return { x: (1 - a) * s.from[0], y: (1 - a) * s.from[1], r: (1 - ramp(f, s.at, SHELL_DUR + 4, EASE.snappy)) * s.rot };
  };
  const shelled = (s: Shell, style: React.CSSProperties, children?: React.ReactNode) => {
    if (frame < s.at) return null;
    const p = shellAt(s, frame);
    const p0 = shellAt(s, frame - 0.5);
    const p1 = shellAt(s, frame + 0.5);
    const op = Math.min(1, ramp(frame, s.at, 6, EASE.out) * 1.2);
    return (
      <SpeedBlur vx={p1.x - p0.x} vy={p1.y - p0.y} amount={0.32} max={18}>
        <div style={{ position: 'absolute', opacity: op, transform: `translate(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px) rotate(${p.r.toFixed(2)}deg)`, ...style }}>
          {children}
        </div>
      </SpeedBlur>
    );
  };

  const guides = 1 - 0.75 * ramp(frame, 48, 14, EASE.out);
  const ctaOn = ramp(frame, 118, 14, EASE.out);
  const wipe = ramp(frame, 124, 22, EASE.swift); // 胶片调色擦除 0→1（左→右）
  const push = 1 + 0.015 * ramp(frame, 120, 48, EASE.smooth);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans, background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.05 }} fill={{ x: 0.85, y: 0.55 }} intensity={0.75} breathe={0.3}>
        {/* 12 栏版式参考线：第 1 帧就在，骨架齐后退淡 */}
        <div style={{ position: 'absolute', inset: 0, opacity: guides }}>
          {Array.from({ length: 13 }, (_, i) => (
            <div key={i} style={{ position: 'absolute', left: 120 + i * 140, top: 0, width: 1, height: 1080, background: 'rgba(255,255,255,0.045)' }} />
          ))}
          {[64, 220, 600, 840, 990].map((y) => (
            <div key={y} style={{ position: 'absolute', left: 0, top: y, width: 1920, height: 1, background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 50%' }}>
        {/* ── 骨架段 ── */}
        {shelled(SH.nav, { ...PANEL, left: 120, top: 64, width: 1680, height: 80, borderRadius: 24, background: 'linear-gradient(180deg, rgba(40,41,46,0.75), rgba(26,27,30,0.75))' },
          <div style={{
            position: 'absolute', right: 12, top: 12, width: 202, height: 56, borderRadius: 16, boxSizing: 'border-box',
            border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)',
          }} />,
        )}
        {shelled(SH.logo, { left: 140, top: 84, width: 40, height: 40 },
          [0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              position: 'absolute', width: 16, height: 16, borderRadius: 8, left: (i % 2) * 24, top: (i >> 1) * 24,
              background: i === 3 ? GOLD : L.ink, boxShadow: i === 3 ? `0 0 10px ${alpha(GOLD, 0.6)}` : 'none',
            }} />
          )),
        )}
        {shelled(SH.card, { ...PANEL, left: 1160, top: 220, width: 640, height: 760, borderRadius: 30, overflow: 'hidden' }, <>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 640, height: 500, overflow: 'hidden' }}>
            <FilmStill graded={false} />
            <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${((1 - wipe) * 100).toFixed(2)}% 0 0)` }}>
              <FilmStill graded />
            </div>
            {wipe > 0 && wipe < 1 && (
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: wipe * 640 - 1, width: 2, background: GOLD, boxShadow: `0 0 18px ${alpha(GOLD, 0.9)}` }} />
            )}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120, background: 'linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0))' }} />
          </div>
          <div style={{ position: 'absolute', left: 0, top: 500, width: 640, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </>)}
        {shelled(SH.wheels, { left: 1160, top: 744, width: 640, height: 150 }, <>
          {/* 色轮控制点：log 灰片时居中（中性），调色擦除时同步推到各自的偏色位置 */}
          <Wheel cx={106} hue="#7fb2ff" dot={[-16, 22]} k={wipe} />
          <Wheel cx={320} hue="#f2d9a8" dot={[12, -10]} k={wipe} />
          <Wheel cx={534} hue={GOLD} dot={[24, -20]} k={wipe} />
        </>)}
        {shelled(SH.divider, { left: 120, top: 572, width: 980, height: 1, background: `linear-gradient(90deg, rgba(255,255,255,0.22), rgba(255,255,255,0))` })}
        {shelled(SH.cta, {
          left: 120, top: 700, width: 320, height: 80, borderRadius: 40, boxSizing: 'border-box',
          border: `1.5px solid ${alpha(GOLD, 0.5 + 0.5 * ctaOn)}`,
          background: `linear-gradient(180deg, ${alpha('#f0d6a2', 0.06 + 0.94 * ctaOn)}, ${alpha(GOLD, 0.04 + 0.96 * ctaOn)})`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,${(0.1 + 0.35 * ctaOn).toFixed(2)}), 0 16px 40px -14px ${alpha(GOLD, 0.55 * ctaOn)}`,
        })}
        {shelled(SH.ghost, { left: 466, top: 700, width: 320, height: 80, borderRadius: 40, boxSizing: 'border-box', border: '1.5px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.03)' })}
        {(['stat1', 'stat2', 'stat3'] as const).map((k, i) =>
          <React.Fragment key={k}>{shelled(SH[k], { ...PANEL, left: 120 + i * 338, top: 836, width: 314, height: 144, borderRadius: 22 })}</React.Fragment>,
        )}

        {/* ── 文字段：逐字 3D 翻滚落位 ── */}
        {BLOCKS.map((b, bi) => {
          const text = bi === 9 ? { ...b, style: { ...b.style, color: ctaOn > 0.5 ? '#16120a' : '#f0d6a2' } } : b; // CTA 字随通电由金转深
          return <FlyBlock key={bi} b={text} bi={bi} frame={frame} />;
        })}
      </div>
    </div>
  );
};
