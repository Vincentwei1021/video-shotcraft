// Polish 质感工具件（Phase 0）——给 demo 做"成品感"收尾的小工具：贝塞尔缓动、
// 胶片颗粒、暗角、两层软阴影 / 发丝线 / 内高光、按速度计算的方向性运动模糊、
// 柔光渐变背景。全部是 props / frame 的纯函数，确定性渲染（无 Math.random / Date）。
// 依赖仅 remotion + react；可选共享件——copy demo 时一并带上并改 import 路径。
import React from 'react';
import { useCurrentFrame } from 'remotion';

// ───────────────────────── 缓动 ─────────────────────────

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// cubic-bezier(x1,y1,x2,y2) → (t)=>number，与 CSS 同义；Newton-Raphson 求解，失败退二分。
// x1/x2 须在 [0,1]；y 可越界（做预备/过冲）。输入 t 自动钳到 [0,1]。
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  if (x1 === y1 && x2 === y2) return (t: number) => clamp01(t);
  const ax = 1 - 3 * x2 + 3 * x1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 1 - 3 * y2 + 3 * y1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number) => ((ay * u + by) * u + cy) * u;
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  const solve = (x: number) => {
    let u = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(u) - x;
      if (Math.abs(err) < 1e-7) return u;
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0, hi = 1;
    u = x;
    for (let i = 0; i < 40; i++) {
      const v = sx(u);
      if (Math.abs(v - x) < 1e-7) break;
      if (v < x) lo = u; else hi = u;
      u = (lo + hi) / 2;
    }
    return u;
  };
  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : sy(solve(t)));
};

// 命名缓动预设（入场 snappy / 换位 smooth / 出场 exit / 预备 anticip / 过冲 overshoot）
export const EASE = {
  snappy: bezier(0.16, 1, 0.3, 1), // 强 ease-out（≈ expo-out）：入场、急推落定
  out: bezier(0.22, 1, 0.36, 1), // 柔一点的 ease-out（≈ quint-out）：次要元素入场、跟随
  smooth: bezier(0.65, 0, 0.35, 1), // 对称 in-out：换位、相机平移
  swift: bezier(0.4, 0, 0.2, 1), // 不对称 in-out（起步稍快、落点很软）：通用位移
  exit: bezier(0.7, 0, 0.84, 0), // 强 ease-in（≈ quart-in）：出场、甩出画外
  anticip: bezier(0.5, -0.32, 0.25, 1), // 先反向回拉 ~5% 再冲出：大动作前的预备
  overshoot: bezier(0.34, 1.45, 0.64, 1), // 冲过头 ~8% 再回落：弹出、落座
  linear: (t: number) => clamp01(t),
};

// 分段进度：frame 在 [start, start+dur] 内归一化 → 缓动，越界钳位（所有动效的时间轴原语）
export const ramp = (frame: number, start: number, dur: number, ease: (t: number) => number = EASE.snappy) =>
  ease(clamp01((frame - start) / Math.max(1e-6, dur)));

// 线性混合 a→b（t 不钳位，配合 overshoot/anticip 的越界值使用）
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// 数值速度（每帧位移）：中心差分 f(frame+0.5) - f(frame-0.5)。给 SpeedBlur 喂速度用
export const velocity = (f: (frame: number) => number, frame: number) => f(frame + 0.5) - f(frame - 0.5);

// ───────────────────────── 字体 ─────────────────────────

export const FONT = {
  sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif',
  mono: '"SF Mono", "JetBrains Mono", Menlo, monospace',
};

// 按字号给字距（em）：大标题收紧、正文微收、小字放开；caps=true（全大写）整体放松一档
export const tracking = (size: number, caps = false) => {
  const base = size >= 96 ? -0.04 : size >= 56 ? -0.03 : size >= 28 ? -0.02 : size >= 16 ? -0.008 : 0.01;
  return `${(base + (caps ? 0.03 : 0)).toFixed(3)}em`;
};

// ───────────────────────── 表面材质 ─────────────────────────

const rgb = (hex: string) => {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(f, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};
const r1 = (x: number) => Math.round(x * 10) / 10;

// 两层软阴影：近地接触影（小而实，随抬高变淡）+ 远地环境影（大而虚，随抬高变大变深）。
// elevation ≈ 物体离地像素（0 贴地 / 4 卡片静置 / 16 悬浮 / 48+ 飞起）；color 用带色相的深色。
export const softShadow = (elevation: number, opts: { color?: string; strength?: number } = {}) => {
  const e = Math.max(0, elevation);
  const c = rgb(opts.color ?? '#10121a');
  const s = opts.strength ?? 1;
  const contactA = (0.12 * s) / (1 + e / 24);
  const ambientA = (0.08 + (Math.min(e, 64) / 64) * 0.22) * s;
  return `0 ${r1(0.5 + e * 0.06)}px ${r1(1 + e * 0.18)}px rgba(${c},${contactA.toFixed(3)}), ` +
    `0 ${r1(e * 0.55)}px ${r1(e * 1.3)}px ${r1(-e * 0.22)}px rgba(${c},${ambientA.toFixed(3)})`;
};

// 1px 发丝线 border 值（用法：border: hairline()）；深色场景 tone='dark' 用白色低透明度
export const hairline = (alpha = 0.08, tone: 'light' | 'dark' = 'light') =>
  `1px solid ${tone === 'light' ? `rgba(20,22,28,${alpha})` : `rgba(255,255,255,${alpha})`}`;

// 顶部 1px 内高光（box-shadow 片段，和 softShadow 用逗号拼接）：让面板有"受光的上沿"
export const innerHighlight = (alpha = 0.8) => `inset 0 1px 0 rgba(255,255,255,${alpha})`;

// 精致面板一把梭：背景 + 发丝线 + 圆角 + 内高光 + 两层软阴影（返回 style 对象，可再展开覆盖）
export const surface = (opts: { tone?: 'light' | 'dark'; elevation?: number; radius?: number; background?: string } = {}): React.CSSProperties => {
  const tone = opts.tone ?? 'light';
  const dark = tone === 'dark';
  return {
    background: opts.background ?? (dark ? '#18191e' : '#ffffff'),
    border: hairline(0.08, tone),
    borderRadius: opts.radius ?? 14,
    boxShadow: `${innerHighlight(dark ? 0.06 : 0.85)}, ${softShadow(opts.elevation ?? 4, { strength: dark ? 2.6 : 1, color: dark ? '#000000' : '#10121a' })}`,
  };
};

// ───────────────────────── 叠层 ─────────────────────────

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 颗粒贴图缓存：6 个 feTurbulence 种子各一张无缝 data-URI 小图，Chrome 只栅格化一次
const grainCache = new Map<string, string>();
const grainTile = (variant: number, tile: number, freq: number) => {
  const key = `${variant}|${tile}|${freq}`;
  const hit = grainCache.get(key);
  if (hit) return hit;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}'>` +
    `<filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' seed='${variant * 17 + 3}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1'/>` +
    `<feComponentTransfer><feFuncR type='linear' slope='2.4' intercept='-0.7'/><feFuncG type='linear' slope='2.4' intercept='-0.7'/>` +
    `<feFuncB type='linear' slope='2.4' intercept='-0.7'/></feComponentTransfer></filter>` +
    `<rect width='100%' height='100%' filter='url(#g)'/></svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  grainCache.set(key, url);
  return url;
};

// 胶片颗粒：铺满父级（absolute inset 0）的灰度噪点层，每 step 帧换一次纹理与偏移（确定性）。
// 亮场 opacity 0.04–0.08、暗场 0.06–0.12；blend 默认 overlay（暗场可试 'soft-light' / 'screen'）。
// 用途：大面积渐变防色带、给平面 UI 一点胶片质感。放在要覆盖的内容之后（上层）。
export const Grain: React.FC<{
  opacity?: number; step?: number; scale?: number; freq?: number;
  blend?: React.CSSProperties['mixBlendMode']; style?: React.CSSProperties;
}> = ({ opacity = 0.06, step = 2, scale = 1, freq = 0.85, blend = 'overlay', style }) => {
  const frame = useCurrentFrame();
  const k = Math.floor(frame / Math.max(1, step));
  const tile = 256;
  const ox = Math.floor(hash(k * 3 + 1) * tile);
  const oy = Math.floor(hash(k * 7 + 2) * tile);
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', opacity, mixBlendMode: blend,
      backgroundImage: grainTile(k % 6, tile, freq), backgroundSize: `${tile * scale}px ${tile * scale}px`,
      backgroundPosition: `${ox}px ${oy}px`, ...style,
    }} />
  );
};

// 暗角：铺满父级的径向渐变压边。strength = 四角最大不透明度（0.2 轻 / 0.4 中 / 0.6 重），
// inner = 完全透明的中心半径比例（0–1），color 用带色相的深色而非纯黑；cx/cy 可偏移光心（0–1）。
export const Vignette: React.FC<{
  strength?: number; inner?: number; color?: string; cx?: number; cy?: number; style?: React.CSSProperties;
}> = ({ strength = 0.35, inner = 0.5, color = '#0b0c12', cx = 0.5, cy = 0.46, style }) => {
  const c = rgb(color);
  const mid = inner + (1 - inner) * 0.55;
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: `radial-gradient(ellipse 72% 72% at ${cx * 100}% ${cy * 100}%, rgba(${c},0) ${inner * 100}%, ` +
        `rgba(${c},${(strength * 0.32).toFixed(3)}) ${(mid * 100).toFixed(1)}%, rgba(${c},${strength.toFixed(3)}) 100%), ` +
        `radial-gradient(ellipse 100% 100% at ${cx * 100}% ${cy * 100}%, rgba(${c},0) 60%, rgba(${c},${(strength * 0.6).toFixed(3)}) 100%)`,
      ...style,
    }} />
  );
};

// 方向性运动模糊：把运动物体包进来，按速度（px/帧）沿运动方向做高斯拖影；速度≈0 时不加滤镜（零开销）。
// 原理：外层旋转到运动方向 → SVG feGaussianBlur 只在本地 x 轴模糊 → 内层反向旋转复位，任意方向都对。
// 本身是 absolute inset 0 的铺满层（子元素请自行绝对定位）；amount = 每 1px/帧 速度给多少模糊（默认 0.45），
// max 封顶。用 velocity() 由位置函数求速度；只在快速段生效，别全程常驻。
export const SpeedBlur: React.FC<{
  vx: number; vy?: number; amount?: number; max?: number; children: React.ReactNode; style?: React.CSSProperties;
}> = ({ vx, vy = 0, amount = 0.45, max = 36, children, style }) => {
  const rid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const speed = Math.hypot(vx, vy);
  const sd = Math.min(max, speed * amount);
  const fill: React.CSSProperties = { position: 'absolute', inset: 0 };
  if (sd < 0.35) return <div style={{ ...fill, ...style }}>{children}</div>;
  const deg = (Math.atan2(vy, vx) * 180) / Math.PI;
  const id = `speedblur-${rid}`;
  return (
    <div style={{ ...fill, ...style }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${sd.toFixed(2)} 0`} edgeMode="none" />
        </filter>
      </svg>
      <div style={{ ...fill, transform: `rotate(${deg}deg)`, filter: `url(#${id})` }}>
        <div style={{ ...fill, transform: `rotate(${-deg}deg)` }}>{children}</div>
      </div>
    </div>
  );
};

// 柔光背景：低对比纵向渐变 + 一处柔和主光斑（+ 可选强调色余光）+ 暗角 + 颗粒，替代死平纯色底。
// tone 亮/暗；light = 主光位置（0–1，默认左上偏中）；accent 给一抹极淡的色相余光；drift>0 时光斑缓慢漂移（px 幅度）。
export const Backdrop: React.FC<{
  tone?: 'light' | 'dark'; light?: { x: number; y: number }; accent?: string;
  grain?: number; vignette?: number; drift?: number; style?: React.CSSProperties;
}> = ({ tone = 'light', light = { x: 0.32, y: 0.18 }, accent, grain, vignette, drift = 0, style }) => {
  const frame = useCurrentFrame();
  const dark = tone === 'dark';
  const dx = drift * Math.sin(frame / 90);
  const dy = drift * 0.6 * Math.cos(frame / 110);
  const base = dark
    ? 'linear-gradient(180deg, #13151b 0%, #0c0d11 55%, #08090c 100%)'
    : 'linear-gradient(180deg, #f6f6f4 0%, #efefec 55%, #e8e8e4 100%)';
  const glow = dark ? 'rgba(150,160,200,0.16)' : 'rgba(255,255,255,0.95)';
  const lx = `calc(${light.x * 100}% + ${dx.toFixed(2)}px)`;
  const ly = `calc(${light.y * 100}% + ${dy.toFixed(2)}px)`;
  const tint = accent
    ? `radial-gradient(ellipse 55% 60% at ${(1 - light.x) * 100}% ${(1 - light.y * 0.4) * 100}%, rgba(${rgb(accent)},${dark ? 0.14 : 0.07}) 0%, rgba(${rgb(accent)},0) 70%), `
    : '';
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: base, ...style }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `${tint}radial-gradient(ellipse 62% 70% at ${lx} ${ly}, ${glow} 0%, rgba(255,255,255,0) 72%)`,
      }} />
      <Vignette strength={vignette ?? (dark ? 0.5 : 0.14)} color={dark ? '#000000' : '#2a2c36'} inner={0.45} />
      {(grain ?? (dark ? 0.08 : 0.05)) > 0 && (
        <Grain opacity={grain ?? (dark ? 0.08 : 0.05)} blend={dark ? 'soft-light' : 'overlay'} />
      )}
    </div>
  );
};
