// counter-confetti — 大数字冲刺计数到终值，到位前一拍彩纸炸开（庆祝比结果先到半拍）。
//
// 第二轮重设计（暖黑香槟夜 · 机械计数器）：
// - look = ember（暖黑 · 橙 · 金）。主角是一只 268px 的七位机械滚轮计数器「1,000,000」：每一位是一条
//   竖向数字带，低位转得飞快（按转速竖向运动模糊）、高位按真实进位规则只在下一位 9→0 时被带着翻一格；
//   未到的高位是暗色"幽灵零"（开场第 1 帧画面里就有 0,000,000 的空槽，计数从右往左把它点亮）。
// - 节奏「快—慢—停—咔」：8–64f 指数减速冲到 0,999,999（低位越转越慢、观众在等）→ 2f 停顿 →
//   66f 六位同时 9→0、最高位 0→1，一记物理弹簧进位（damping 18，~8% 一次可见过冲）——这是全片的"咔哒"。
// - 抢拍：彩纸在进位弹簧起跳的同一帧（66f）从左右下角两门礼炮射出，数字 ~6f 后才落定；
//   彩纸是香槟金箔 / 余烬橙 / 奶白三色（不再是 8 色彩虹），金箔随翻转角变亮变暗（金属反光），
//   带线性空气阻力 + 重力（顶点在画面上 1/4、下落趋于终速）+ 下落飘摆 + 远中近三层景深。
// - 落定：数字整体弹一下（1→1.05→1）、背后一次金色泛光 + 横向光带（Q4：只给主角一次），
//   眉题「MILESTONE」字距收拢早就位，副标题逐词从线下升起。
//
// 时间表（30fps，共 172f）：
//   0–14    预备：舞台光、幽灵零 0,000,000、眉题字距由宽收紧
//   8–64    计数冲刺（56f，expo-out）；数字整体 0.92→1 缓推（蓄力）
//   64–66   停顿 2f（0,999,999）
//   66–76   进位：弹簧 9→0 / 0→1，~72f 落定；66f 礼炮抢拍
//   70–100  余波：数字弹跳、金色泛光衰减、副标题逐词升起（82f 起）
//   100–172 hold：彩纸飘落出画（~160f 前清空），最后 ~12f 干净海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const COUNTER_CONFETTI_DURATION = 172;

const L = LOOKS.ember;
const COUNT0 = 8; // 起数帧
const COUNT1 = 64; // 冲到 0,999,999 的帧
const LOCK = 66; // 进位弹簧起跳（= 礼炮帧，抢拍）
const SIZE = 268; // 数字字号
const DIGIT_W = 0.64; // 每位步进（em，tabular；字形本身略宽，靠 clip-path 只裁上下不裁左右）
const COMMA_W = 0.3;
const COLS = 7;

// ───────────── 计数器 ─────────────
// 冲刺值：0 → 999,999（expo-out：前 1/4 时间跑完九成）
const baseValue = (f: number) => 999999 * ramp(f, COUNT0, COUNT1 - COUNT0, EASE.snappy);
// 进位弹簧 0→1（过冲到 ~1.08）
const lockAt = (f: number) => (f < LOCK ? 0 : springAt(f, LOCK, { damping: 18, stiffness: 220 }));

// 第 k 位（0 = 个位）的数字带位置：真实机械进位——个位连续转，高位只在低位全为 9 时被带着翻一格
const columnPos = (f: number, k: number) => {
  const v = baseValue(f);
  const p10 = Math.pow(10, k);
  const r = lockAt(f);
  if (k === COLS - 1) return r; // 最高位：只在进位时 0→1
  let pos: number;
  if (k === 0) pos = v % 10;
  else {
    const d = Math.floor(v / p10) % 10;
    const lower = v % p10;
    pos = d + Math.min(1, Math.max(0, lower - (p10 - 1)));
  }
  return pos + r; // 进位：9 → 10（带上显示 0），过冲时略越过
};

// 第 k 位是否已"有效"（高位前导零为幽灵态）：0 → 1
const significance = (f: number, k: number) => {
  if (k === 0) return 1;
  if (k === COLS - 1) return Math.min(1, lockAt(f));
  const v = baseValue(f);
  const p10 = Math.pow(10, k);
  if (v >= p10) return 1;
  return Math.min(1, Math.max(0, v - (p10 - 1)));
};

const STRIP = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1'];

const DigitColumn: React.FC<{ k: number; frame: number }> = ({ k, frame }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const pos = columnPos(frame, k);
  const speed = Math.abs(columnPos(frame + 0.5, k) - columnPos(frame - 0.5, k)); // 位/帧
  const blur = Math.min(20, speed * SIZE * 0.08);
  const spinFade = 1 - 0.4 * Math.min(1, Math.max(0, (speed - 0.5) / 2)); // 转得越快越虚（滚轮里只剩残影）
  const sig = significance(frame, k);
  const shown = ((pos % 10) + 10) % 10 + (pos >= 10 ? 10 : 0); // 进位过冲时用带尾部的 0/1
  return (
    <div style={{
      position: 'relative', width: `${DIGIT_W}em`, height: '1.3em', clipPath: 'inset(0 -0.2em)',
      // 圆柱感：窗口上下渐隐；上 12% 全透明，藏住上一格数字的底部
      WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, transparent 12%, #000 19%, #000 80%, transparent 92%)',
    }}>
      {blur > 0.4 && (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id={`d${id}`} x="-10%" y="-20%" width="120%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <div style={{
        position: 'absolute', left: 0, top: '0.15em', width: '100%',
        transform: `translateY(${(-shown).toFixed(4)}em)`, opacity: spinFade,
        filter: blur > 0.4 ? `url(#d${id})` : undefined,
      }}>
        {STRIP.map((c, i) => (
          <div key={i} style={{ height: '1em', lineHeight: 1, textAlign: 'center', position: 'relative' }}>
            {/* 幽灵零：暗色空槽 */}
            <span style={{ position: 'absolute', inset: 0, color: alpha(L.ink3, 0.55), opacity: 1 - sig }}>{c}</span>
            <span style={{
              position: 'absolute', inset: 0, opacity: sig,
              backgroundImage: `linear-gradient(180deg, #fffaf2 18%, #ffd9a0 62%, #f0a24f 100%)`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Comma: React.FC<{ on: number }> = ({ on }) => (
  <div style={{ width: `${COMMA_W}em`, height: '1.3em', position: 'relative' }}>
    <span style={{ position: 'absolute', left: '-0.02em', top: '0.15em', lineHeight: 1, color: alpha(L.ink3, 0.55), opacity: 1 - on }}>,</span>
    <span style={{ position: 'absolute', left: '-0.02em', top: '0.15em', lineHeight: 1, color: '#ffd9a0', opacity: on }}>,</span>
  </div>
);

// ───────────── 彩纸 ─────────────
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const DRAG = 2.1; // 线性空气阻力（1/s）
type Kind = 'foil' | 'ember' | 'cream';
const BITS = Array.from({ length: 120 }, (_, i) => {
  const side = i % 2 ? 1 : -1;
  const r = (k: number) => rand(i * 13.7 + k);
  const kind: Kind = r(1) < 0.55 ? 'foil' : r(1) < 0.8 ? 'ember' : 'cream';
  const depth = r(2) < 0.28 ? 0 : r(2) > 0.86 ? 2 : 1; // 远 / 焦平面 / 近
  const strip = r(3) < 0.35; // 细长条 vs 方片
  const w = strip ? 8 + r(4) * 5 : 14 + r(4) * 8;
  return {
    side, kind, depth,
    w, h: strip ? 30 + r(5) * 18 : w * (0.7 + r(5) * 0.4),
    x0: side * (780 + r(6) * 60), y0: 600 + r(7) * 40, // 左右下角礼炮口（相对屏心，画外）
    vx: -side * (420 + r(8) * 1500), vy: -(1900 + r(9) * 1100),
    g: 1000 + r(10) * 320,
    spin: (r(11) - 0.5) * 900, flip: 6 + r(12) * 10, phase: r(13) * 6.28,
    sway: 14 + r(14) * 26, swayW: 3 + r(15) * 2.5,
    delay: r(16) * 0.12, // 秒
  };
});
const ballistic = (p0: number, v0: number, g: number, t: number) => {
  const e = (1 - Math.exp(-DRAG * t)) / DRAG;
  return p0 + (g / DRAG) * t + (v0 - g / DRAG) * e;
};

const Confetti: React.FC<{ frame: number; layer: 'back' | 'front' }> = ({ frame, layer }) => (
  <>
    {BITS.map((b, i) => {
      if ((layer === 'front') !== (b.depth === 2)) return null;
      const t = (frame - LOCK) / 30 - b.delay;
      if (t <= 0) return null;
      const fall = Math.min(1, Math.max(0, (t - 0.55) / 0.6));
      const x = ballistic(b.x0, b.vx, 0, t) + Math.sin(t * b.swayW + b.phase) * b.sway * fall;
      const y = ballistic(b.y0, b.vy, b.g, t);
      if (y > 660) return null; // 落出画外即卸载
      const flip = Math.cos(t * b.flip + b.phase); // -1..1：朝向镜头的程度
      const face = Math.abs(flip);
      const dS = b.depth === 0 ? 0.55 : b.depth === 2 ? 1.7 : 1;
      const dBlur = b.depth === 0 ? 1.2 : b.depth === 2 ? 5 : 0;
      const dDim = b.depth === 0 ? 0.55 : 1;
      let bg: string;
      if (b.kind === 'foil') {
        // 金箔：正对镜头时高光掠过（亮带位置随翻转相位走）
        const hl = 30 + 40 * (0.5 + 0.5 * Math.sin(t * b.flip * 0.5 + b.phase));
        bg = `linear-gradient(135deg, #8a5a1c 0%, #e9b45a ${hl - 25}%, #fff3cf ${hl}%, #e9b45a ${hl + 25}%, #8a5a1c 100%)`;
      } else bg = b.kind === 'ember' ? L.accent : '#fff1dc';
      const shade = (0.45 + 0.55 * face) * dDim;
      return (
        <div key={i} style={{
          position: 'absolute', left: 960, top: 540, width: b.w * dS, height: b.h * dS, marginLeft: (-b.w * dS) / 2, marginTop: (-b.h * dS) / 2,
          background: bg, borderRadius: 2,
          filter: `brightness(${shade.toFixed(3)})${dBlur ? ` blur(${dBlur}px)` : ''}`,
          opacity: Math.min(1, t * 10),
          transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(b.spin * t).toFixed(1)}deg) scaleY(${Math.max(0.06, face).toFixed(3)})`,
        }} />
      );
    })}
  </>
);

// ───────────── 主体 ─────────────
export const CounterConfetti: React.FC = () => {
  const frame = useCurrentFrame();
  // 数字整体：计数期 0.92→1 缓推蓄力；落定弹一下（弹簧速度驱动的 1→1.05→1）
  const build = 0.92 + 0.08 * ramp(frame, 0, COUNT1, EASE.swift);
  // 落定弹跳：进位落座后（+4f）一次快起慢落的鼓包
  const pp = (frame - LOCK - 4) / 18;
  const pop = pp > 0 && pp < 1 ? Math.sin(Math.PI * Math.pow(pp, 0.55)) : 0;
  const scale = build * (1 + 0.05 * pop);
  const flash = ramp(frame, LOCK + 3, 4, EASE.out) * (1 - ramp(frame, LOCK + 7, 34, EASE.out));
  const bloom = 0.35 + 0.65 * ramp(frame, LOCK + 3, 10, EASE.out) - 0.35 * ramp(frame, LOCK + 20, 60, EASE.swift);
  const label = ramp(frame, 0, 26, EASE.snappy);
  const rule = ramp(frame, 4, 30, EASE.snappy);
  const commaOn = (k: number) => significance(frame, k);

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.42 }} fill={{ x: 0.5, y: 1.05 }} horizon={0.86} intensity={0.85} breathe={0.4} grain={0.09} vignette={0.62}>
        {/* 数字背后的金色泛光（落定瞬间提亮，随后缓慢回落） */}
        <div style={{
          position: 'absolute', left: 960 - 900, top: 470 - 380, width: 1800, height: 760, opacity: bloom,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent2, 0.22)} 0%, ${alpha(L.accent, 0.08)} 45%, ${alpha(L.accent, 0)} 72%)`,
        }} />
        {/* 落定横向光带：一次，只给主角 */}
        {flash > 0.01 && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 470 - 70, height: 140, opacity: flash,
            background: `radial-gradient(ellipse 48% 22% at 50% 50%, rgba(255,240,210,0.75) 0%, ${alpha(L.accent2, 0.25)} 40%, ${alpha(L.accent2, 0)} 100%)`,
            mixBlendMode: 'screen',
          }} />
        )}

        <Confetti frame={frame} layer="back" />

        {/* 眉题：字距由宽收紧 + 两侧发丝线 */}
        <div style={{ position: 'absolute', top: 214, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28 }}>
          <div style={{ width: 120 * rule, height: 1.5, background: alpha(L.accent2, 0.6) }} />
          <div style={{ ...type(30, 650, { caps: true }), color: L.accent2, opacity: label, letterSpacing: `${(0.62 - 0.32 * label).toFixed(3)}em`, marginRight: `-${(0.62 - 0.32 * label).toFixed(3)}em` }}>
            Milestone
          </div>
          <div style={{ width: 120 * rule, height: 1.5, background: alpha(L.accent2, 0.6) }} />
        </div>

        {/* 机械计数器 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 470 - SIZE * 0.65, display: 'flex', justifyContent: 'center',
          transform: `scale(${scale.toFixed(5)})`, transformOrigin: '50% 50%',
          fontFamily: type(SIZE, 800).fontFamily, fontSize: SIZE, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
          filter: `drop-shadow(0 0 ${(18 + 30 * flash).toFixed(1)}px ${alpha(L.accent, 0.25 + 0.3 * flash)})`,
        }}>
          {Array.from({ length: COLS }, (_, j) => {
            const k = COLS - 1 - j; // 从最高位往右排
            return (
              <React.Fragment key={k}>
                <DigitColumn k={k} frame={frame} />
                {(k === 6 || k === 3) && <Comma on={commaOn(k)} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* 副标题：逐词从线下升起 */}
        <div style={{ position: 'absolute', top: 770, left: 0, right: 0, textAlign: 'center', ...type(64, 600), color: L.ink }}>
          <TextReveal text="teams now build on" by="word" start={LOCK + 14} each={18} gap={3} />{' '}
          <TextReveal text="Lumen." by="word" start={LOCK + 26} each={18} style={{ color: L.accent }} />
        </div>
        <div style={{ position: 'absolute', top: 868, left: 0, right: 0, textAlign: 'center', ...type(32, 500), color: L.ink2, opacity: ramp(frame, LOCK + 34, 20, EASE.out) }}>
          Thank you for building with us.
        </div>

        <Confetti frame={frame} layer="front" />
      </Stage>
    </AbsoluteFill>
  );
};
