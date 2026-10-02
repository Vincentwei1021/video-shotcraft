// letterspace-materialize —— 大字距字标全字符并行连续描画结晶：所有字母同帧起笔、笔画像手写一样连续生长、
// 同帧齐收成词；氛围底景上的品牌字标显影。原片出处：superhuman-promo.mp4 ≈4.5–6.5s（手法参照，字标改为虚构品牌）。
//
// 第二轮重设计（沙 · 沙丘破晓 · 细墨线字标）：
// - look = sand（米色 + 赤陶）。底景从"暮色湖景"换成亮场的沙丘破晓：暖米色天空、低悬的白日 + 大片日晕、
//   四层程序沙丘（远淡近深的大气透视，向阳坡亮、背阴坡深，近两层山脊有一道受光脊线）、地平线薄雾带、
//   浮动的细沙微尘；相机极缓推近 + 向右横移，四层按 1.5% / 3% / 5% / 8% 不同速——视差让沙丘有纵深；
//   太阳全程缓缓升起 24px，结晶完成时日晕再亮一档（"字标点亮了天"）。
// - 字标「SOLSTICE」（虚构）：8 个单线骨架字形重绘，按光学宽度排（I 窄、O/C 圆字），字面高 103px、
//   字距 ≈0.6em、墨色细线 5px。全字符共享同一进度 p：同帧起笔、pathLength 归一 → 同帧齐收。
//   每一笔的笔尖带一小段赤陶"热墨"（刚落下的墨还是暖色，随后冷成墨色），收笔时淡掉。
// - 落版：结晶完成后一行衬线斜体副标「Your day, in better light.」由虚到实浮现；字标本身不位移。
//
// 时间表（30fps，共 120f）：
//   0–14    底景已在（第 1 帧即完整画面）、微尘浮动、相机开始推
//   14–66   描画 52f：bezier(0.5,0,0.3,1)——起笔缓、中段快、收笔略长；全字符同帧起收
//   60–84   结晶收束：热墨笔尖淡出、日晕升亮
//   72–92   副标由虚到实
//   90–120  hold 30f（R1）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { bezier, ramp, EASE, mix } from '../../_fixtures/Polish';
import { Dust, LOOKS, SERIF, Stage, alpha } from '../../_fixtures/Look';

export const LETTERSPACE_MATERIALIZE_DURATION = 120; // 静置 14f + 描画 52f + 收束/副标 24f + hold 30f

const L = LOOKS.sand;
const START = 14; // 全字符统一起画帧（无错峰）
const DUR = 52; // 全字符统一画完帧数
const strokeEase = bezier(0.5, 0, 0.3, 1);

// ───────────── 字形（单线骨架，64 高视框；x 从 0 起，w = 光学宽度）─────────────
const GLYPHS: Record<string, { d: string; w: number }> = {
  S: { d: 'M 52 13 C 41 4, 8 3, 5 15 C 2 26, 19 29, 29 31 C 40 33, 56 37, 53 48 C 50 59, 11 61, 1 50', w: 55 },
  O: { d: 'M 31 5 C 7 5, 0 20, 0 32 C 0 46, 10 59, 31 59 C 52 59, 62 46, 62 32 C 62 18, 54 5, 31 5', w: 62 },
  L: { d: 'M 0 5 L 0 59 L 44 59', w: 44 },
  T: { d: 'M 0 5 L 56 5 M 28 5 L 28 59', w: 56 },
  I: { d: 'M 0 5 L 0 59', w: 0 },
  C: { d: 'M 57 16 C 50 8, 41 5, 31 5 C 9 5, 0 20, 0 32 C 0 46, 10 59, 31 59 C 41 59, 50 56, 57 48', w: 57 },
  E: { d: 'M 46 5 L 0 5 L 0 59 L 46 59 M 0 31 L 40 31', w: 46 },
  // 以下字母本词未用，留在库里供换词复用（同一套骨架比例）
  U: { d: 'M 0 5 L 0 40 C 0 59, 54 59, 54 40 L 54 5', w: 54 },
  P: { d: 'M 0 59 L 0 5 L 32 5 C 52 5, 52 32, 32 32 L 0 32', w: 47 },
  R: { d: 'M 0 59 L 0 5 L 32 5 C 52 5, 52 31, 32 31 L 0 31 M 30 31 L 52 59', w: 52 },
  H: { d: 'M 0 5 L 0 59 M 54 5 L 54 59 M 0 31 L 54 31', w: 54 },
  M: { d: 'M 0 59 L 0 6 L 31 38 L 62 6 L 62 59', w: 62 },
  A: { d: 'M 0 59 L 32 5 L 64 59 M 10 41 L 54 41', w: 64 },
  N: { d: 'M 0 59 L 0 5 L 54 59 L 54 5', w: 54 },
};
const WORD = 'SOLSTICE';
const GAP = 40; // 字距（视框单位，≈0.6 × 字面高）
const ROUND = new Set(['O', 'C', 'S']); // 圆字光学收一点字距
const K = 1.9; // 视框 → 屏幕
const LAYOUT = (() => {
  let x = 0;
  const out: { ch: string; x: number }[] = [];
  Array.from(WORD).forEach((ch, i) => {
    if (i > 0) x += GAP - (ROUND.has(ch) || ROUND.has(WORD[i - 1]) ? 4 : 0);
    out.push({ ch, x });
    x += GLYPHS[ch].w;
  });
  return { glyphs: out, width: x };
})();
const MARK_W = LAYOUT.width * K;
const MARK_CY = 392; // 字标中心 y
const STROKE = 2.7; // 视框单位 → ~5px
const HOT = 0.07; // 热墨笔尖长度（pathLength 比例）

const Wordmark: React.FC<{ e: number; hot: number }> = ({ e, hot }) => (
  <svg
    width={MARK_W + 40} height={64 * K + 40} viewBox={`-20 -20 ${MARK_W + 40} ${64 * K + 40}`}
    style={{ position: 'absolute', left: 960 - MARK_W / 2 - 20, top: MARK_CY - 32 * K - 20, overflow: 'visible' }}
  >
    <g transform={`scale(${K})`} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={STROKE}>
      {LAYOUT.glyphs.map((g, i) => (
        <g key={i} transform={`translate(${g.x} 0)`}>
          {e > 0 && (
            <path d={GLYPHS[g.ch].d} stroke={L.ink} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - e} />
          )}
          {e > 0 && hot > 0 && (
            // 笔尖热墨：只显示 [e−HOT, e] 这一小段，盖在墨线上
            <path d={GLYPHS[g.ch].d} stroke={L.accent} strokeWidth={STROKE * 1.15} pathLength={1}
              strokeDasharray={`${HOT} 2`} strokeDashoffset={HOT - e} opacity={hot} />
          )}
        </g>
      ))}
    </g>
  </svg>
);

// ───────────── 沙丘 ─────────────
// 确定性沙丘轮廓：长波起伏 + 尖化的波峰（风积沙丘一侧缓一侧陡）
const dune = (seed: number, base: number, amp: number, lambda: number) => {
  const pts: [number, number][] = [];
  for (let x = -200; x <= 2120; x += 16) {
    const u = x / lambda + seed;
    const crest = Math.pow(0.5 + 0.5 * Math.sin(u + 0.55 * Math.sin(u)), 2.6); // 偏斜 + 尖化：脊线成刃、坡面缓
    const roll = 0.35 * Math.sin(x / (lambda * 0.37) + seed * 2.3);
    pts.push([x, base - amp * (crest * 0.8 + roll * 0.25)]);
  }
  return pts;
};
const toFill = (pts: [number, number][]) => `M -200 1200 L ${pts.map(([x, y]) => `${x} ${y.toFixed(1)}`).join(' L ')} L 2120 1200 Z`;
const toLine = (pts: [number, number][]) => `M ${pts.map(([x, y]) => `${x} ${y.toFixed(1)}`).join(' L ')}`;

// 风纹：沿沙丘轮廓向下平移的细等高线（越往下越疏、越淡），给近两层沙丘表面质感
const ripples = (pts: [number, number][], n: number, step: number, seed: number) =>
  Array.from({ length: n }, (_, k) => {
    const off = 26 + k * step * (1 + k * 0.12);
    return {
      d: `M ${pts.map(([x, y]) => `${x} ${(y + off + 4 * Math.sin(x / (46 + k * 7) + seed + k)).toFixed(1)}`).join(' L ')}`,
      o: 0.16 * (1 - k / n),
    };
  });

type Layer = { pts: [number, number][]; top: string; bottom: string; rim?: number; blur?: number; push: number; truck: number; rip?: { n: number; step: number } };
const LAYERS: Layer[] = [
  { pts: dune(0.8, 700, 46, 260), top: '#eedcc4', bottom: '#e6cfb2', blur: 1.2, push: 0.015, truck: -6 },
  { pts: dune(2.6, 770, 68, 330), top: '#e2c39f', bottom: '#d6b28b', rim: 0.5, push: 0.03, truck: -14 },
  { pts: dune(4.1, 880, 96, 420), top: '#cfa378', bottom: '#b98b5f', rim: 0.7, push: 0.05, truck: -26, rip: { n: 7, step: 16 } },
  { pts: dune(5.7, 1020, 120, 560), top: '#ad7a4f', bottom: '#8c5d3a', rim: 0.55, blur: 2.4, push: 0.08, truck: -44, rip: { n: 6, step: 22 } },
];
const ORIGIN_Y = 700;

export const LetterspaceMaterialize: React.FC = () => {
  const frame = useCurrentFrame();
  const T = LETTERSPACE_MATERIALIZE_DURATION;

  // 全字符共享同一进度：同时开始、同时完成
  const e = ramp(frame, START, DUR, strokeEase);
  const hot = 1 - ramp(frame, START + DUR - 6, 14, EASE.out);
  const cam = ramp(frame, 0, T, EASE.smooth);
  const sunY = 690 - 24 * ramp(frame, 0, T, EASE.out);
  const dawn = 0.82 + 0.18 * ramp(frame, START + DUR * 0.6, 34, EASE.out); // 结晶收束时日晕再亮一档
  const tag = ramp(frame, 72, 20, EASE.out);

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.62 }} fill={null} intensity={0.6} grain={0.06} vignette={0.22}>
        {/* 天空 */}
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, #e3d2bd 0%, #ecdcc6 38%, #f6e6cd 62%, #f3dfc2 100%)' }} />
        {/* 日晕 + 太阳 */}
        <div style={{
          position: 'absolute', left: 960 - 900, top: sunY - 620, width: 1800, height: 1240, opacity: dawn,
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,247,230,0.95) 0%, rgba(255,236,206,0.55) 22%, rgba(250,222,184,0.18) 48%, rgba(245,215,175,0) 72%)',
        }} />
        <div style={{
          position: 'absolute', left: 960 - 118, top: sunY - 118, width: 236, height: 236, borderRadius: '50%',
          background: 'radial-gradient(circle, #fffefa 0%, #fffaf0 52%, rgba(255,244,226,0.6) 62%, rgba(255,240,218,0.0) 72%)', opacity: dawn,
          boxShadow: '0 0 120px 30px rgba(255,238,205,0.55)',
        }} />
        {/* 高空薄云：三缕极淡的横向云丝缓慢右移，hold 段天空不死 */}
        {[{ y: 150, w: 900, x: 180, o: 0.32, v: 0.35 }, { y: 228, w: 640, x: 1180, o: 0.24, v: 0.5 }, { y: 96, w: 520, x: 1420, o: 0.2, v: 0.25 }].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', left: c.x + frame * c.v, top: c.y, width: c.w, height: 26, borderRadius: 13,
            background: `linear-gradient(90deg, rgba(255,248,236,0) 0%, rgba(255,248,236,${c.o}) 35%, rgba(255,248,236,${c.o * 0.8}) 70%, rgba(255,248,236,0) 100%)`,
            filter: 'blur(8px)',
          }} />
        ))}
        {/* 地平线薄雾 */}
        <div style={{
          position: 'absolute', left: -100, right: -100, top: 640, height: 150,
          background: 'linear-gradient(180deg, rgba(255,246,232,0) 0%, rgba(255,246,232,0.55) 50%, rgba(255,246,232,0) 100%)',
        }} />
        {/* 四层沙丘：远淡近深，推近与横移按层递增（视差） */}
        {LAYERS.map((ly, i) => (
          <svg key={i} width={1920} height={1080} style={{
            position: 'absolute', inset: 0, overflow: 'visible',
            transformOrigin: `960px ${ORIGIN_Y}px`, transform: `translateX(${(ly.truck * cam).toFixed(2)}px) scale(${(1 + ly.push * cam).toFixed(4)})`,
            filter: ly.blur ? `blur(${ly.blur}px)` : undefined,
          }}>
            <defs>
              <linearGradient id={`lm-d${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={ly.top} />
                <stop offset="1" stopColor={ly.bottom} />
              </linearGradient>
            </defs>
            <path d={toFill(ly.pts)} fill={`url(#lm-d${i})`} />
            {ly.rip && ripples(ly.pts, ly.rip.n, ly.rip.step, i * 1.7).map((r, k) => (
              <path key={k} d={r.d} fill="none" stroke={k % 2 ? '#fff1dc' : '#6e4a2c'} strokeWidth={1.4} strokeOpacity={r.o} />
            ))}
            {/* 逆光脊线：太阳在沙丘背后，脊线被勾一道亮边 */}
            {ly.rim && <path d={toLine(ly.pts)} fill="none" stroke="#fff6e6" strokeWidth={2.4} strokeOpacity={ly.rim} />}
            {/* 层间薄雾：每层脚下一抹空气，拉开前后 */}
            {i < 3 && (
              <rect x={-200} y={Math.max(...ly.pts.map((p) => p[1])) - 40} width={2320} height={120} fill="rgba(255,244,228,0.28)" style={{ filter: 'blur(18px)' }} />
            )}
          </svg>
        ))}
        {/* 浮动细沙 */}
        <Dust look={L} count={34} seed={11} drift={0.45} opacity={0.55} color="#fff6e6" />
      </Stage>

      <Wordmark e={e} hot={hot} />

      {/* 副标：由虚到实 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: MARK_CY + 32 * K + 54, textAlign: 'center',
        fontFamily: SERIF, fontStyle: 'italic', fontSize: 44, fontWeight: 400, color: L.ink2, letterSpacing: '0.01em',
        opacity: tag, filter: tag < 0.99 ? `blur(${((1 - tag) * 10).toFixed(2)}px)` : undefined,
        transform: `translateY(${mix(10, 0, tag).toFixed(2)}px)`,
      }}>
        Your day, in better light.
      </div>
      {/* 极淡的暖色压角，把视线收向字标 */}
      <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse 80% 70% at 50% 45%, ${alpha(L.shadow, 0)} 60%, ${alpha(L.shadow, 0.1)} 100%)` }} />
    </AbsoluteFill>
  );
};
