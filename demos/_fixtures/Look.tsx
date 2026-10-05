// Look 视觉系统（第二轮改版）——给 demo 一套"成片级"的美术方向：调色板 LOOKS、字号阶梯 TYPE、
// 有光源与空间感的舞台 <Stage>、逐字/逐词/逐行揭示 <TextReveal>、错峰分布 stagger、
// 泛光 glow、单次扫光 <Sheen>、确定性粒子 <Dust>、透视网格地面 <GridFloor>。
// 全部是 props / frame 的纯函数，确定性渲染（无 Math.random / Date）。依赖 remotion + react + ./Polish。
// 可选共享件——copy demo 时连同 Polish.tsx 一并带上并改 import 路径。
import React from 'react';
import { spring, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, tracking } from './Polish';

// ───────────────────────── 调色板 ─────────────────────────
// 每个 look = 一套完整的明暗、表面、文字、强调色与光色。一个镜头只用一个 look；
// 强调色只给主角/关键信息，accent2 只做点缀（≤ 画面 5%）。

export type LookName = 'midnight' | 'aurora' | 'ember' | 'graphite' | 'lime' | 'paper' | 'porcelain' | 'sand';

export type Look = {
  name: LookName;
  dark: boolean;
  bg: [string, string, string]; // 舞台纵向渐变：顶 / 中 / 底
  light: string; // 主光颜色（舞台光斑）
  surface: string; // 面板底色
  surface2: string; // 面板内次级底色 / 输入框
  line: string; // 发丝线
  ink: string; // 主文字
  ink2: string; // 次级文字
  ink3: string; // 弱文字 / 刻度
  accent: string;
  accent2: string;
  onAccent: string; // 强调色上的文字
  shadow: string; // 阴影色（带色相）
};

export const LOOKS: Record<LookName, Look> = {
  // 深蓝夜：科技产品、AI、数据——冷静、电光蓝
  midnight: {
    name: 'midnight', dark: true, bg: ['#0d1426', '#090d1a', '#05070e'], light: '#3d63ff',
    surface: '#111827', surface2: '#172036', line: 'rgba(160,190,255,0.12)',
    ink: '#f2f5ff', ink2: '#a9b4d0', ink3: '#5d6883', accent: '#5b8cff', accent2: '#3ee6d0', onAccent: '#050816', shadow: '#000208',
  },
  // 极光：发布、品牌、魔法感——紫粉渐变光
  aurora: {
    name: 'aurora', dark: true, bg: ['#140d24', '#0b0816', '#06040c'], light: '#8b5cf6',
    surface: '#151024', surface2: '#1e1733', line: 'rgba(200,170,255,0.13)',
    ink: '#f7f2ff', ink2: '#b9acd6', ink3: '#6a5f86', accent: '#a78bfa', accent2: '#f472b6', onAccent: '#0b0616', shadow: '#030108',
  },
  // 余烬：冲击、速度、能量——暖黑 + 橙
  ember: {
    name: 'ember', dark: true, bg: ['#1c100a', '#100906', '#070403'], light: '#ff6a2a',
    surface: '#1a120e', surface2: '#251913', line: 'rgba(255,190,150,0.12)',
    ink: '#fff5ee', ink2: '#d4b6a4', ink3: '#7d6455', accent: '#ff6b2c', accent2: '#ffc24b', onAccent: '#140802', shadow: '#050100',
  },
  // 石墨：电影感、克制、高级——近单色暗场，白为强调
  graphite: {
    name: 'graphite', dark: true, bg: ['#17181b', '#0e0f11', '#08080a'], light: '#c8ccd6',
    surface: '#16171a', surface2: '#1e2024', line: 'rgba(255,255,255,0.09)',
    ink: '#f4f4f2', ink2: '#a3a5ab', ink3: '#5c5f66', accent: '#ffffff', accent2: '#e4c58a', onAccent: '#0a0a0b', shadow: '#000000',
  },
  // 酸柠：运动、数据冲击、节奏——石墨底 + 荧光黄绿
  lime: {
    name: 'lime', dark: true, bg: ['#141612', '#0c0d0b', '#070806'], light: '#b8ff3a',
    surface: '#141611', surface2: '#1c1f18', line: 'rgba(220,255,170,0.11)',
    ink: '#f6f8f0', ink2: '#aab09e', ink3: '#5f6556', accent: '#c6f432', accent2: '#ffffff', onAccent: '#0b0d06', shadow: '#000000',
  },
  // 纸：编辑排版、文字、人文——暖白纸 + 墨 + 朱红
  paper: {
    name: 'paper', dark: false, bg: ['#f6f2ea', '#f0ebe1', '#e7e0d3'], light: '#fffaf0',
    surface: '#fffdf8', surface2: '#f4efe5', line: 'rgba(40,30,20,0.12)',
    ink: '#17130f', ink2: '#5e554b', ink3: '#9b9184', accent: '#e5432d', accent2: '#1f5c4a', onAccent: '#fffaf3', shadow: '#2a1d10',
  },
  // 瓷白：SaaS 产品界面、交互演示——冷白 + 钴蓝
  porcelain: {
    name: 'porcelain', dark: false, bg: ['#f7f9fc', '#eef2f8', '#e3e9f2'], light: '#ffffff',
    surface: '#ffffff', surface2: '#f3f6fb', line: 'rgba(15,30,60,0.10)',
    ink: '#0d1324', ink2: '#4c566e', ink3: '#8d96ab', accent: '#2f5bff', accent2: '#00b39a', onAccent: '#ffffff', shadow: '#0c1a3a',
  },
  // 沙：温暖、生活方式、柔和——米色 + 赤陶
  sand: {
    name: 'sand', dark: false, bg: ['#efe6da', '#e8ddce', '#ddd0bd'], light: '#fff6e8',
    surface: '#fbf6ef', surface2: '#f1e9de', line: 'rgba(70,45,20,0.12)',
    ink: '#221a12', ink2: '#6d5d4c', ink3: '#a4927d', accent: '#c4552d', accent2: '#3d5a80', onAccent: '#fff8f0', shadow: '#3a2410',
  },
};

// hex → "r,g,b"，配 rgba(${rgbOf(c)},a) 用
export const rgbOf = (hex: string) => {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(f, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};
export const alpha = (hex: string, a: number) => `rgba(${rgbOf(hex)},${a})`;

// ───────────────────────── 字体与字号阶梯 ─────────────────────────
// 1080p 成片的字号档（px）。要读的文字 ≥ body（Q11：辅助 ≥32px、叙事字幕 ≥56px）；
// 画面主标题至少 h1。label 只用于刻度/角标这类"纹理"小字。

export const TYPE = { mega: 260, display: 180, h1: 120, h2: 84, h3: 60, body: 40, small: 32, label: 22 } as const;

export const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, "Songti SC", Georgia, serif';

// 一行写出标题样式：字号 + 字重 + 按字号的字距 + 行高
export const type = (size: number, weight = 650, opts: { caps?: boolean; serif?: boolean; mono?: boolean } = {}): React.CSSProperties => ({
  fontFamily: opts.mono ? FONT.mono : opts.serif ? SERIF : FONT.sans,
  fontSize: size,
  fontWeight: weight,
  letterSpacing: opts.mono ? '0em' : tracking(size, opts.caps),
  lineHeight: size >= 90 ? 0.94 : size >= 50 ? 1.05 : 1.3,
  textTransform: opts.caps ? 'uppercase' : undefined,
  fontVariantNumeric: 'tabular-nums',
});

// ───────────────────────── 时间 ─────────────────────────

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// n 个元素的错峰起点：总跨度 span 帧，按 ease 分布（EASE.exit = 越来越快、EASE.out = 先密后疏、linear = 等差）
export const stagger = (i: number, n: number, span: number, ease: (t: number) => number = EASE.linear) =>
  n <= 1 ? 0 : ease(i / (n - 1)) * span;

// 物理弹簧（30fps）：start 帧起跳；damping 低 = 回弹多（12 活泼 / 18 利落 / 26 无回弹）
export const springAt = (frame: number, start: number, opts: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  spring({ frame: frame - start, fps: 30, config: { damping: opts.damping ?? 18, stiffness: opts.stiffness ?? 170, mass: opts.mass ?? 1 } });

// ───────────────────────── 光 ─────────────────────────

// 泛光：给文字 / 发光元素的 text-shadow 或 drop-shadow 串（strength 0–1；只给主角）
export const glow = (color: string, strength = 0.6) =>
  `0 0 ${(6 * strength).toFixed(1)}px ${alpha(color, 0.55 * strength)}, 0 0 ${(24 * strength).toFixed(1)}px ${alpha(color, 0.45 * strength)}, 0 0 ${(70 * strength).toFixed(1)}px ${alpha(color, 0.3 * strength)}`;

export const glowFilter = (color: string, strength = 0.6) =>
  `drop-shadow(0 0 ${(8 * strength).toFixed(1)}px ${alpha(color, 0.6 * strength)}) drop-shadow(0 0 ${(30 * strength).toFixed(1)}px ${alpha(color, 0.35 * strength)})`;

// 舞台：带色相的纵向渐变 + 主光斑 + 强调色余光 + 可选地平线光带 + 暗角 + 颗粒。
// keyLight = 主光位置（0–1）；fill = 余光位置；horizon = 地平线光带高度（0–1，不给则无）；
// breathe = 光斑随时间极缓的明暗呼吸（0–1）。
// children 画在暗角/颗粒之下，只放背景装饰（GridFloor / Dust / 远景）；主角放在 Stage 外面（之后），免得被暗角压暗。
// 多页叠放的镜头（擦除/转场）只画一个 Stage 做共享底，别每页各画一个——暗角和颗粒会叠两遍、接缝处露馅。
export const Stage: React.FC<{
  look: Look; keyLight?: { x: number; y: number }; fill?: { x: number; y: number } | null;
  horizon?: number; intensity?: number; breathe?: number; grain?: number; vignette?: number;
  children?: React.ReactNode; style?: React.CSSProperties;
}> = ({ look, keyLight = { x: 0.5, y: 0.08 }, fill = { x: 0.85, y: 0.9 }, horizon, intensity = 1, breathe = 0, grain, vignette, children, style }) => {
  const frame = useCurrentFrame();
  const b = 1 + breathe * 0.12 * Math.sin(frame / 38);
  const [t, m, btm] = look.bg;
  const k = look.dark ? 0.55 * intensity * b : 0.9 * intensity;
  const f = look.dark ? 0.22 * intensity : 0.1 * intensity;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: `linear-gradient(180deg, ${t} 0%, ${m} 52%, ${btm} 100%)`, ...style }}>
      <div style={{
        position: 'absolute', inset: 0,
        background:
          `radial-gradient(ellipse 58% 62% at ${keyLight.x * 100}% ${keyLight.y * 100}%, ${alpha(look.light, Math.min(1, k))} 0%, ${alpha(look.light, 0)} 70%)` +
          (fill ? `, radial-gradient(ellipse 50% 46% at ${fill.x * 100}% ${fill.y * 100}%, ${alpha(look.accent2, f)} 0%, ${alpha(look.accent2, 0)} 72%)` : ''),
        mixBlendMode: look.dark ? 'screen' : 'normal',
      }} />
      {horizon !== undefined && (
        <div style={{
          position: 'absolute', left: '-10%', right: '-10%', top: `${horizon * 100 - 9}%`, height: '18%',
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(look.light, look.dark ? 0.28 * intensity : 0.5)} 0%, ${alpha(look.light, 0)} 70%)`,
          filter: 'blur(10px)',
        }} />
      )}
      {children}
      <Vignette strength={vignette ?? (look.dark ? 0.55 : 0.16)} color={look.shadow} inner={0.42} />
      {(grain ?? (look.dark ? 0.09 : 0.05)) > 0 && (
        <Grain opacity={grain ?? (look.dark ? 0.09 : 0.05)} blend={look.dark ? 'soft-light' : 'overlay'} />
      )}
    </div>
  );
};

// 透视网格地面：地平线 horizon（0–1 帧高）以下铺一张向消失点收拢的网格（SVG 按透视公式直接算线，
// 线宽恒定不闪），近处亮、远处隐入地平线。scroll = 网格朝镜头滚动的距离（格数，随帧递增 = 前进感）。
export const GridFloor: React.FC<{ look: Look; horizon?: number; cell?: number; scroll?: number; opacity?: number; color?: string }> = ({
  look, horizon = 0.62, cell = 1, scroll = 0, opacity = 0.5, color,
}) => {
  const W = 1920, H = 1080, hy = horizon * H, cam = (H - hy) * 1.1, focal = 1;
  const c = color ?? (look.dark ? look.accent : look.ink);
  const rows: number[] = [];
  const off = ((scroll % 1) + 1) % 1;
  for (let i = 0; i < 40; i++) {
    const z = (0.9 + i - off) * cell;
    if (z > 0.2) rows.push(hy + (cam * focal) / z);
  }
  const cols = Array.from({ length: 41 }, (_, i) => (i - 20) * cell);
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      <defs>
        <linearGradient id={`gf${id}`} x1="0" y1={hy} x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={c} stopOpacity={0} />
          <stop offset="0.35" stopColor={c} stopOpacity={look.dark ? 0.45 : 0.22} />
          <stop offset="1" stopColor={c} stopOpacity={look.dark ? 0.8 : 0.35} />
        </linearGradient>
      </defs>
      <g stroke={`url(#gf${id})`} strokeWidth={1.5} fill="none">
        {rows.filter((y) => y <= H + 2).map((y, i) => <line key={`r${i}`} x1={0} y1={y} x2={W} y2={y} />)}
        {cols.map((xw, i) => {
          const zNear = 0.25;
          return <line key={`c${i}`} x1={W / 2 + (xw * W * 0.18) / zNear} y1={hy + cam / zNear} x2={W / 2} y2={hy} />;
        })}
      </g>
    </svg>
  );
};

const hash = (n: number) => {
  const x = Math.sin(n * 91.345 + 47.853) * 43758.5453;
  return x - Math.floor(x);
};

// 确定性浮尘 / 散景：count 个柔光点在画面里缓慢漂移（速度 drift px/帧），远小近大近虚。
// 只做氛围底层，别抢主角；暗场用。
export const Dust: React.FC<{ look: Look; count?: number; seed?: number; drift?: number; opacity?: number; color?: string }> = ({
  look, count = 40, seed = 1, drift = 0.25, opacity = 0.7, color,
}) => {
  const frame = useCurrentFrame();
  const c = color ?? look.light;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity }}>
      {Array.from({ length: count }, (_, i) => {
        const z = hash(seed * 31 + i * 7.1);
        const size = 2 + z * z * 16;
        const x = (((hash(seed * 13 + i * 3.7) * 2120 + frame * drift * (0.4 + z)) % 2120) + 2120) % 2120 - 100;
        const y = hash(seed * 17 + i * 5.3) * 1080 - frame * drift * 0.3 * (0.5 + z);
        const tw = 0.5 + 0.5 * Math.sin(frame / (14 + z * 20) + i);
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: ((y % 1180) + 1180) % 1180 - 50, width: size, height: size, borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(c, 0.9)} 0%, ${alpha(c, 0)} 70%)`,
            opacity: (0.25 + 0.75 * tw) * (0.3 + z * 0.7), filter: z > 0.7 ? `blur(${((z - 0.7) * 10).toFixed(1)}px)` : undefined,
          }} />
        );
      })}
    </div>
  );
};

// 单次扫光：铺满父级（父级需 overflow:hidden + 圆角，Q4 裁进边界）的一道斜向高光，
// progress 0→1 从左扫到右；只给主角一次。
export const Sheen: React.FC<{ progress: number; color?: string; width?: number; angle?: number; strength?: number }> = ({
  progress, color = '#ffffff', width = 0.22, angle = 18, strength = 0.35,
}) => {
  if (progress <= 0 || progress >= 1) return null;
  const p = -width + (1 + 2 * width) * progress;
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'soft-light',
      background: `linear-gradient(${90 + angle}deg, transparent ${(p - width) * 100}%, ${alpha(color, strength)} ${p * 100}%, transparent ${(p + width) * 100}%)`,
    }} />
  );
};

// ───────────────────────── 文字揭示 ─────────────────────────
// 把一段文字拆成字 / 词 / 行，逐个按 variant 揭示：
//   rise  —— 从下方遮罩里升起（经典"字从线下冒出"，最稳重）
//   blur  —— 由虚到实 + 轻微上浮（柔和、高级）
//   drop  —— 从上方落下带轻微过冲（活泼）
//   scale —— 由大缩到位 + 淡入（冲击、口号）
//   track —— 字距由宽收紧（品牌字标）
// start 起始帧、each 每个单元的动画时长、gap 单元间隔（帧）、ease 缓动。
// 返回 inline-block 行内结构，外层自己定位 / 排版。

type RevealVariant = 'rise' | 'blur' | 'drop' | 'scale' | 'track';

export const TextReveal: React.FC<{
  text: string; start?: number; by?: 'char' | 'word' | 'line'; variant?: RevealVariant;
  each?: number; gap?: number; ease?: (t: number) => number; style?: React.CSSProperties; unitStyle?: (i: number) => React.CSSProperties;
  out?: { start: number; dur?: number };
}> = ({ text, start = 0, by = 'char', variant = 'rise', each = 18, gap, ease = EASE.snappy, style, unitStyle, out }) => {
  const frame = useCurrentFrame();
  const units = by === 'line' ? text.split('\n') : by === 'word' ? text.split(/(\s+)/) : Array.from(text);
  const g = gap ?? (by === 'char' ? 1.6 : by === 'word' ? 4 : 7);
  let k = 0;
  const outT = out ? clamp01((frame - out.start) / (out.dur ?? 12)) : 0;
  const outE = EASE.exit(outT);
  return (
    <span style={{ display: by === 'line' ? 'block' : 'inline', whiteSpace: 'pre', ...style }}>
      {units.map((u, i) => {
        if (by !== 'line' && /^\s+$/.test(u)) return <span key={i}>{u}</span>;
        const idx = k++;
        const p = ease(clamp01((frame - start - idx * g) / each));
        const inner: React.CSSProperties = { display: 'inline-block', willChange: 'transform' };
        if (variant === 'rise') {
          // 位移 = 105% 字高 + 0.3em（盖过遮罩框的上下留白），未升起的字形不会从框底露出
          inner.transform = `translateY(calc(${((1 - p) * 105 - outE * 105).toFixed(2)}% + ${((1 - p) * 0.3 - outE * 0.3).toFixed(3)}em))`;
        } else if (variant === 'blur') {
          inner.opacity = p * (1 - outE);
          inner.filter = `blur(${((1 - p) * 14 + outE * 10).toFixed(2)}px)`;
          inner.transform = `translateY(${((1 - p) * 0.25 - outE * 0.15).toFixed(3)}em)`;
        } else if (variant === 'drop') {
          const s = clamp01((frame - start - idx * g) / each);
          inner.opacity = clamp01(s * 3) * (1 - outE);
          inner.transform = `translateY(${((1 - EASE.overshoot(s)) * -0.6).toFixed(3)}em)`;
        } else if (variant === 'scale') {
          inner.opacity = clamp01(p * 2) * (1 - outE);
          inner.transform = `scale(${(1 + (1 - p) * 0.6 + outE * 0.2).toFixed(3)})`;
          inner.filter = p < 1 ? `blur(${((1 - p) * 8).toFixed(2)}px)` : undefined;
        } else {
          inner.opacity = p * (1 - outE);
          inner.marginRight = `${((1 - p) * 0.5).toFixed(3)}em`;
        }
        const clip = variant === 'rise';
        const body = <span style={{ ...inner, ...(unitStyle ? unitStyle(idx) : null) }}>{u}</span>;
        return clip ? (
          <span key={i} style={{ display: by === 'line' ? 'block' : 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0.06em 0.02em 0.22em', margin: '-0.06em -0.02em -0.22em' }}>
            {body}
          </span>
        ) : (
          <React.Fragment key={i}>{body}</React.Fragment>
        );
      })}
    </span>
  );
};
