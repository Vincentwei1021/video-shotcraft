// vertical-word-roll-blur-cycle — 句尾词竖向滚轮：Built for speed → teams → scale → everyone.
//
// 第二轮重设计（石墨 · 荧光黄绿 · 机械转筒海报）：
// - look = lime。176px / 850 字重的一句大字横贯画面（原版 30px 设计坐标），句干「Built for」纹丝不动，
//   句尾是一只真·3D 转筒：每个词贴在半径 R 的圆柱面上（相邻行 32°），按 (i - p)·θ 计算
//   y / z / rotateX，离中心越远越前缩、越暗；相邻行再按距离叠纵向高斯模糊（SVG 只糊 y 向），
//   转动时按转速再加纵向运动模糊（静止为 0）。
// - 换词曲线保留身份配方：0.7·outQuint + 0.3·outBack（前快后极慢 + 一次微过冲「咔」）。
// - 染色保留：中心词只在 d < 0.42 时才从灰染成荧光黄绿，落定瞬间加一次泛光并衰减；
//   结论词「everyone.」那次的泛光留一点余温。
// - 一条横贯全幅的选取带（两条发丝线 + 极淡黄绿底）钉住中心行，右侧 mono 计数 01→04 同步翻；
//   收尾不再整组淡出（尾帧要是海报）：邻行沿圆柱滚走淡出，只剩「Built for everyone.」+ 副标题。
//
// 时间表（30fps，共 165f）：
//   0–14    句干逐词从线下升起；转筒从上方滚入第一个词（p: -1→0，20f，同配方曲线）
//   20–36   hold「speed」
//   36–54   换词 1 → teams（18f）
//   54–64   hold（节奏开始变密）
//   64–80   换词 2 → scale（16f）
//   80–90   hold
//   90–114  换词 3 → everyone.（24f，结论词更长更重）
//   112–130 邻行滚走淡出、选取带收起；118 起副标题升起
//   130–165 hold：干净海报，极缓推 1→1.02
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const VERTICAL_WORD_ROLL_BLUR_CYCLE_DURATION = 165;

const L = LOOKS.lime;
const WORDS = ['speed', 'teams', 'scale', 'everyone.'];
// 每次换词：起帧 + 时长（第 0 次是开场滚入）
const STEPS: [number, number][] = [[2, 20], [36, 18], [64, 16], [90, 24]];
const COLLAPSE = 112;

const FS = 176;
const ROW = Math.round(FS * 1.12); // 197
const THETA = 32; // 相邻行圆心角（度）
const R = ROW / (2 * Math.tan(((THETA / 2) * Math.PI) / 180)); // 圆柱半径
const REEL_W = FS * 4.45; // 转筒视窗宽 = 最长词 everyone. + 余量
const CY = 520; // 中心行中线 y

const outQuint = (u: number) => 1 - Math.pow(1 - u, 5);
const outBack = (u: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
};
// 转筒位置 p（行）：-1 起，每段窗累加 1；段窗不重叠，不会跳格
const reelAt = (f: number) => {
  let p = -1;
  for (const [s, d] of STEPS) {
    const u = Math.max(0, Math.min(1, (f - s) / d));
    p += 0.7 * outQuint(u) + 0.3 * outBack(u);
  }
  return p;
};
const mixHex = (a: string, b: string, k: number) => {
  const t = Math.max(0, Math.min(1, k));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

export const VerticalWordRollBlurCycle: React.FC = () => {
  const f = useCurrentFrame();
  const p = reelAt(f);
  const speed = Math.abs(reelAt(f + 0.5) - reelAt(f - 0.5)); // 行/帧
  const motionBlur = Math.min(14, speed * ROW * 0.16);
  const collapse = ramp(f, COLLAPSE, 18, EASE.swift);
  const sub = ramp(f, 118, 18, EASE.snappy);
  const cam = mix(1, 1.02, ramp(f, 20, 145, EASE.swift));

  // 落定泛光：每次换词落定（段窗 70% 处）起一次，10f 衰减；结论词留 0.35 余温
  const landGlow = STEPS.slice(1).reduce((g, [s, d], k) => {
    const t0 = s + d * 0.55;
    const up = ramp(f, t0, 4, EASE.out);
    const down = ramp(f, t0 + 4, 16, EASE.out);
    const rest = k === STEPS.length - 2 ? 0.35 : 0;
    return Math.max(g, up * mix(1, rest, down));
  }, 0);

  const idx = Math.max(0, Math.min(WORDS.length - 1, Math.round(p)));
  const band = 1 - collapse;

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.42, y: 0.0 }} fill={{ x: 0.85, y: 0.95 }} horizon={0.9} intensity={0.75} breathe={0.4} />
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `960px ${CY}px`, transform: `scale(${cam.toFixed(4)})` }}>
        {/* 选取带：横贯全幅，钉住中心行 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: CY - ROW / 2, height: ROW, background: alpha(L.accent, 0.035 * band), opacity: ramp(f, 0, 16, EASE.out) }}>
          {[0, ROW].map((y) => (
            <div key={y} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 1, background: alpha(L.ink, 0.12 * band) }} />
          ))}
        </div>
        {/* 眉题 */}
        <div style={{ position: 'absolute', left: 150, top: CY - ROW / 2 - 70, ...type(24, 700, { caps: true }), letterSpacing: '0.24em', color: L.accent, opacity: ramp(f, 4, 14, EASE.out) }}>
          Strata 3.0
        </div>
        {/* 计数：mono 01→04，跟着落定翻 */}
        <div style={{ position: 'absolute', right: 150, top: CY - ROW / 2 - 70, fontFamily: FONT.mono, fontSize: 30, color: L.ink3, opacity: ramp(f, 4, 14, EASE.out) }}>
          <span style={{ color: L.ink }}>{String(idx + 1).padStart(2, '0')}</span> / 04
        </div>

        {/* 句子：句干 + 转筒视窗，整组居中 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: CY - ROW / 2, height: ROW, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {/* 句干：逐词从选取带下沿升起；行盒与转筒行完全同规格（同 lineHeight），基线严格对齐 */}
          <div style={{ ...type(FS, 850), letterSpacing: '-0.045em', lineHeight: `${ROW}px`, height: ROW, color: L.ink, whiteSpace: 'pre', paddingRight: FS * 0.24, display: 'flex' }}>
            {['Built', ' ', 'for'].map((w, i) => {
              const k = ramp(f, i * 3, 16, EASE.snappy);
              return w === ' ' ? <span key={i}>{' '}</span> : (
                <span key={i} style={{ display: 'inline-block', overflow: 'hidden', height: ROW }}>
                  <span style={{ display: 'inline-block', transform: `translateY(${((1 - k) * ROW).toFixed(2)}px)` }}>{w}</span>
                </span>
              );
            })}
          </div>
          <div style={{ position: 'relative', width: REEL_W, height: ROW, perspective: 1500, perspectiveOrigin: '50% 50%' }}>
            {WORDS.map((w, i) => {
              const phi = (i - p) * THETA; // 圆心角
              const d = Math.abs(i - p);
              if (d > 2.4) return null;
              const rad = (phi * Math.PI) / 180;
              const y = R * Math.sin(rad);
              const z = R * Math.cos(rad) - R;
              const blur = Math.min(16, d * 7) + motionBlur;
              const fadeOut = i === WORDS.length - 1 ? 1 : 1 - collapse;
              const op = (d < 1 ? 1 - 0.62 * d : Math.max(0, 0.38 - 0.3 * (d - 1))) * fadeOut;
              if (op <= 0.003) return null;
              const tint = Math.max(0, Math.min(1, 1 - d * 2.4));
              const isCenter = d < 0.5;
              const fid = `vroll-${i}`;
              return (
                <div key={w} style={{
                  position: 'absolute', left: 0, top: 0, height: ROW, width: REEL_W,
                  transform: `translateY(${y.toFixed(2)}px) translateZ(${z.toFixed(2)}px) rotateX(${(-phi).toFixed(3)}deg)`,
                  backfaceVisibility: 'hidden', opacity: op,
                }}>
                  {blur > 0.1 && (
                    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
                      <filter id={fid} x="-5%" y="-60%" width="110%" height="220%" colorInterpolationFilters="sRGB">
                        <feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} />
                      </filter>
                    </svg>
                  )}
                  <div style={{
                    ...type(FS, 850), letterSpacing: '-0.045em', lineHeight: `${ROW}px`, height: ROW, whiteSpace: 'pre',
                    color: mixHex('#7c8370', L.accent, tint),
                    filter: blur > 0.1 ? `url(#${fid})` : undefined,
                    textShadow: isCenter && landGlow > 0.01 ? `0 0 ${(30 * landGlow).toFixed(1)}px ${alpha(L.accent, 0.55 * landGlow)}, 0 0 ${(90 * landGlow).toFixed(1)}px ${alpha(L.accent, 0.3 * landGlow)}` : undefined,
                  }}>
                    {w}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 副标题 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: CY + ROW / 2 + 54, textAlign: 'center', ...type(44, 450), color: L.ink2,
          opacity: sub, transform: `translateY(${((1 - sub) * 22).toFixed(2)}px)`,
        }}>
          One workspace. Every team, every size.
        </div>
      </div>
    </div>
  );
};
