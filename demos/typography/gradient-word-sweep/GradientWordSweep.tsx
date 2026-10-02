// gradient-word-sweep —— 标语里的关键词被渐变彩光从左到右快速扫过"充能"：波前最亮、向后衰减到稳态，
// 填满后字符间跳起细紫红闪电，整词稳态泛光呼吸。
//
// 第二轮重设计（发布会口号海报 · 霓虹充能）：
// - look = aurora（紫粉夜）。左对齐版式：眉题 mono 小字 → 230px / 800 的巨字「Supercharged」→ 76px 白色正文
//   「performance with rock-solid reliability.」→ 底部发丝线 + 页脚。关键词是画面唯一的彩色。
// - 手法强化："通电"前关键词是没上电的暗灰（ink 28%），正文是纯白——充能前后的明暗差让"只有它通了电"一眼可读；
//   充能前 4f 有一次"吸气"预备（词微缩、再暗一档），扫充 18f，波前白热亮核 + 34% 词宽尾迹增亮，
//   扫满那一帧词身一次弹簧踢（+2.4%，damping 13 一次回弹）+ 泛光峰值，随后衰减到稳态。
// - 环境随充能被点亮：舞台主光（紫）从 0.35 → 1.0 强度，词后方大柔光同步亮起——"整个房间被它照亮"。
// - 闪电：6 次排期，弧线从一个字母顶跳到另一个字母顶（不是随机折线），紫红三层细描边，每次 3–4f 带两拍闪烁。
//
// 时间表（30fps，共 105f）：
//   0–20   入场：眉题升起；关键词按字符遮罩升起（暗灰，未通电）；正文逐词升起 6–24
//   20–24  预备：关键词"吸气"——scale 1→0.988、亮度再降一档
//   24–42  扫充 18f（EASE.out：起步快、收尾略缓），波前最亮、尾迹向后衰减
//   42     充满：弹簧踢 + 泛光峰值，42–58 衰减到稳态；舞台主光同步亮起
//   46–86  6 次排期闪电（同屏 ≤1 道，间隔 ≥4f）
//   50–66  底部发丝线生长、页脚淡入
//   86–105 hold 19f：稳态泛光呼吸 + 全程极缓推近 1→1.03
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const GRADIENT_WORD_SWEEP_DURATION = 105;

const L = LOOKS.aurora;
const LEFT = 150;
const RIGHT = 1770;
const WORD = 'Supercharged';
const SIZE = 230;
const WORD_TOP = 372 - 35; // 关键词行盒顶
const WORD_W = 1440; // 关键词实测宽（闪电坐标用，SF 800 / -0.045em）
// 行高 1.3：行盒必须包住降部（p/g），background-clip:text 的渐变只画在盒内，盒太矮降部会露出底下的暗灰字
const LH = 1.3;
const WORD_H = SIZE * LH;
const TOP_OFF = SIZE * (LH - 1) / 2; // 字母顶相对行盒顶的额外偏移

const ENTER = 2;
const BREATH = 20; // 吸气预备
const FILL_START = 24;
const FILL_END = 42; // 18f 快扫
const GRAD = 'linear-gradient(92deg, #5cc8ff 0%, #8f74ff 30%, #e16bff 52%, #ff6fb5 72%, #ffbf6b 100%)';

// ───────── 闪电：字母顶之间的跳弧（确定性） ─────────
const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// 各字母顶部的大致 x（占词宽比例）与顶高（px，相对行盒顶）：升部字母（h/d）更高
const TOPS: [number, number][] = [
  [0.04, 40], [0.13, 78], [0.22, 78], [0.3, 78], [0.38, 78], [0.47, 78],
  [0.535, 36], [0.6, 78], [0.68, 78], [0.75, 78], [0.82, 78], [0.94, 36],
];
const bolt = (a: number, b: number, seed: number, lift: number) => {
  const r = mulberry32(seed);
  const xa = TOPS[a][0], ya = TOPS[a][1] + TOP_OFF;
  const xb = TOPS[b][0], yb = TOPS[b][1] + TOP_OFF;
  const x0 = xa * WORD_W, x1 = xb * WORD_W;
  const n = 9 + Math.floor(r() * 4);
  let d = `M ${x0.toFixed(1)} ${(ya + 6).toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t + (r() - 0.5) * 18;
    const y = ya + (yb - ya) * t - Math.sin(t * Math.PI) * lift + (r() - 0.5) * 22 + (i === n ? 6 : 0);
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
};
// 排期：[起始帧, 寿命, 起字母, 止字母, 拱高]
const FLASHES: { at: number; life: number; d: string }[] = (
  [
    [46, 4, 1, 4, 46], [53, 3, 6, 9, 38], [61, 4, 3, 6, 54], [68, 3, 8, 11, 34], [76, 4, 0, 2, 30], [83, 3, 5, 8, 42],
  ] as const
).map(([at, life, a, b, lift], k) => ({ at, life, d: bolt(a, b, 7100 + k * 37, lift) }));

// 带模糊的辉光层放进四周外扩 PAD 的盒子里再做 mask，模糊溢出不会被切成矩形"方框光"
const PAD = 120;
const at = (x: number) => `calc(${PAD}px + (100% - ${PAD * 2}px) * ${(Math.max(-30, Math.min(130, x)) / 100).toFixed(4)})`;
const Halo: React.FC<{ mask?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ mask, style, children }) => (
  <span aria-hidden style={{
    position: 'absolute', left: -PAD, top: -PAD, right: -PAD, bottom: -PAD, padding: PAD, pointerEvents: 'none',
    ...(mask ? { WebkitMaskImage: mask, maskImage: mask } : {}), ...style,
  }}>
    <span style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}>{children}</span>
  </span>
);

export const GradientWordSweep: React.FC = () => {
  const frame = useCurrentFrame();

  // 扫充进度（EASE.out：开头就快，收尾略缓——像能量灌满时的阻尼）
  const p = ramp(frame, FILL_START, FILL_END - FILL_START, EASE.out);
  const pPct = p * 100;
  const charged = ramp(frame, FILL_START, 26, EASE.out); // 环境光跟随充能（比扫充略慢收敛）
  // 吸气预备：20–24 微缩 + 再暗，扫充开始后弹回
  const inhale = ramp(frame, BREATH, 4, EASE.swift) * (1 - ramp(frame, FILL_START, 8, EASE.out));
  // 充满踢：弹簧（damping 13 → 一次可见回弹）驱动 scale 冲量
  const kickS = springAt(frame, FILL_END, { damping: 13, stiffness: 210 });
  const kick = frame < FILL_END ? 0 : Math.sin(Math.min(1, kickS) * Math.PI) * (1 - ramp(frame, FILL_END, 22, EASE.out));
  const wordScale = 1 - inhale * 0.012 + kick * 0.024;
  // 泛光：充能推高 → 充满峰值 → 衰减到稳态；稳态带极缓呼吸
  const peak = ramp(frame, FILL_END - 4, 4, EASE.out) * (1 - ramp(frame, FILL_END, 18, EASE.out));
  const active = FLASHES.filter((f) => frame >= f.at && frame < f.at + f.life);
  const boltBoost = active.length ? 0.22 : 0;
  const breathe = 0.94 + 0.06 * Math.sin(frame / 7.5);
  const glowLvl = p * breathe + peak * 0.55 + boltBoost;

  // 波前尾迹（刚点亮的字最亮，向后衰减）与白热亮核，扫满后 10f 淡出到稳态
  const trailFade = 1 - ramp(frame, FILL_END, 10, EASE.out);
  const TRAIL = 34;
  const trailMask = `linear-gradient(90deg, transparent 0%, transparent ${at(pPct - TRAIL)}, rgba(0,0,0,0.92) ${at(pPct - 3)}, rgba(0,0,0,0.92) ${at(pPct + 0.5)}, transparent ${at(pPct + 5)})`;
  const headMask = `linear-gradient(90deg, transparent 0%, transparent ${at(pPct - 9)}, #000 ${at(pPct - 3)}, #000 ${at(pPct - 0.5)}, transparent ${at(pPct + 2)})`;
  const softMask = (soft: number) =>
    p >= 1 ? undefined : `linear-gradient(90deg, #000 0%, #000 ${at(pPct - soft)}, transparent ${at(pPct + soft * 0.6)})`;

  // 关键词整词升起（16f，snappy；所有层共用一个 transform，不会错位）
  const rise = ramp(frame, ENTER, 16, EASE.snappy);
  const push = 1 + 0.03 * ramp(frame, 0, GRADIENT_WORD_SWEEP_DURATION, EASE.swift);
  const rule = ramp(frame, 50, 22, EASE.snappy);
  const meta = ramp(frame, 56, 16, EASE.out);

  const wordFont: React.CSSProperties = { ...type(SIZE, 800), letterSpacing: '-0.045em', lineHeight: LH, whiteSpace: 'nowrap' };
  const gradText: React.CSSProperties = {
    position: 'absolute', inset: 0, backgroundImage: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
  };

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.42, y: 0.36 }} fill={{ x: 0.92, y: 0.96 }} intensity={0.35 + 0.65 * charged} grain={0.09}>
        <Dust look={L} count={26} seed={5} drift={0.18} opacity={0.35 + 0.35 * charged} />
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '40% 45%' }}>
        {/* 词后方大柔光：随充能亮起（预模糊的渐变椭圆，不对文字做全屏 blur） */}
        <div style={{
          position: 'absolute', left: LEFT - 120, top: WORD_TOP - 130, width: WORD_W + 240, height: WORD_H + 260, borderRadius: '50%',
          background: `radial-gradient(closest-side, ${alpha('#b07bff', 0.5)}, ${alpha('#ff6fb5', 0.18)} 58%, transparent 100%)`,
          opacity: Math.min(1, 0.5 * glowLvl),
          WebkitMaskImage: p < 1 ? `linear-gradient(90deg, #000 ${pPct - 10}%, transparent ${pPct + 25}%)` : undefined,
        }} />

        {/* 眉题 */}
        <div style={{ position: 'absolute', left: LEFT + 8, top: 296, ...type(30, 600, { mono: true }), letterSpacing: '0.22em', color: L.ink2 }}>
          <TextReveal text="LUMEN ENGINE 5" by="word" start={ENTER} each={16} gap={4} />
          <span style={{ display: 'inline-block', width: 22 * ramp(frame, ENTER + 8, 14), height: 2, background: L.accent2, margin: '0 22px', verticalAlign: 'middle' }} />
          <span style={{ opacity: ramp(frame, ENTER + 12, 14, EASE.out), color: L.ink3 }}>RUNTIME</span>
        </div>

        {/* 关键词：未通电暗灰 → 渐变充能 */}
        <div style={{ position: 'absolute', left: LEFT, top: WORD_TOP, ...wordFont, transform: `scale(${wordScale.toFixed(5)})`, transformOrigin: '0% 60%' }}>
          <span style={{
            position: 'relative', display: 'inline-block',
            transform: `translateY(${((1 - rise) * 0.55).toFixed(4)}em)`, opacity: Math.min(1, rise * 1.6),
            filter: rise < 0.98 ? `blur(${((1 - rise) * 16).toFixed(2)}px)` : undefined,
          }}>
            {/* 底：没上电的暗灰字（与各辉光层同一字形排版，保证逐像素对齐） */}
            <span style={{ color: alpha(L.ink, 0.26 - inhale * 0.06) }}>{WORD}</span>
            {/* 环境大柔光 / 中晕 / 近核（四周外扩的 Halo 盒里做软边 mask） */}
            <Halo mask={softMask(16)} style={{ opacity: Math.min(1, 0.5 * glowLvl) }}>
              <span style={{ ...gradText, filter: 'blur(60px) saturate(1.5)', transform: 'scale(1.04)' }}>{WORD}</span>
            </Halo>
            <Halo mask={softMask(10)} style={{ opacity: Math.min(1, 0.45 * glowLvl) }}>
              <span style={{ ...gradText, filter: 'blur(22px) saturate(1.4) brightness(1.15)' }}>{WORD}</span>
            </Halo>
            <Halo mask={softMask(6)} style={{ opacity: Math.min(1, 0.4 * glowLvl) }}>
              <span style={{ ...gradText, filter: 'blur(5px) brightness(1.2)' }}>{WORD}</span>
            </Halo>
            {/* 清晰渐变本体：前沿 clipPath 硬裁即"已充能"边界 */}
            {p > 0 && (
              <span aria-hidden style={{ ...gradText, clipPath: `inset(-30% ${(100 - pPct).toFixed(3)}% -30% 0)` }}>{WORD}</span>
            )}
            {/* 波前尾迹增亮 */}
            {p > 0 && trailFade > 0.01 && (
              <Halo mask={trailMask} style={{ opacity: 0.95 * trailFade }}>
                <span style={{ ...gradText, filter: 'blur(10px) saturate(1.7) brightness(1.8)' }}>{WORD}</span>
              </Halo>
            )}
            {/* 波前白热亮核：字形本身过曝（不是独立光点） */}
            {p > 0 && p < 1 && (
              <Halo mask={headMask}>
                <span style={{ position: 'absolute', inset: 0, color: '#fff', textShadow: `0 0 26px ${alpha('#ffffff', 0.85)}, 0 0 70px ${alpha('#d9a6ff', 0.8)}` }}>{WORD}</span>
              </Halo>
            )}
            {/* 字母顶之间的跳弧闪电：紫红三层细描边，寿命内两拍闪烁 */}
            <svg aria-hidden width={WORD_W} height={WORD_H} viewBox={`0 0 ${WORD_W} ${WORD_H}`}
              style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
              {active.map((f) => {
                const k = frame - f.at;
                const o = (k % 2 === 0 ? 1 : 0.55) * (1 - k / (f.life + 1));
                return (
                  <g key={f.at} opacity={o}>
                    <path d={f.d} fill="none" stroke="rgba(222,64,200,0.75)" strokeWidth={8} strokeLinejoin="miter" style={{ filter: 'blur(7px)' }} />
                    <path d={f.d} fill="none" stroke="rgba(240,120,225,0.9)" strokeWidth={2.6} strokeLinejoin="miter" style={{ filter: 'blur(1.4px)' }} />
                    <path d={f.d} fill="none" stroke="#ffe0f6" strokeWidth={1.4} strokeLinejoin="miter" />
                  </g>
                );
              })}
            </svg>
          </span>
        </div>

        {/* 正文：纯白、静止（只有关键词通电） */}
        <div style={{ position: 'absolute', left: LEFT + 6, top: WORD_TOP + TOP_OFF + SIZE + 40, ...type(76, 600), letterSpacing: '-0.03em', color: L.ink }}>
          <TextReveal text="performance with rock-solid reliability." by="word" variant="rise" start={6} each={18} gap={3} />
        </div>

        {/* 底部发丝线 + 页脚 */}
        <div style={{ position: 'absolute', left: LEFT, top: 912, width: (RIGHT - LEFT) * rule, height: 1.5, background: alpha(L.ink, 0.22) }} />
        <div style={{ position: 'absolute', left: LEFT, top: 940, opacity: meta, transform: `translateY(${(1 - meta) * 10}px)`, ...type(32, 500), color: L.ink2 }}>
          3.4× faster cold starts. Zero config.
        </div>
        <div style={{ position: 'absolute', right: 1920 - RIGHT, top: 940, opacity: meta, transform: `translateY(${(1 - meta) * 10}px)`, ...type(30, 600, { mono: true }), color: L.accent, letterSpacing: '0.08em' }}>
          lumen.dev/engine
        </div>
      </div>
    </div>
  );
};
