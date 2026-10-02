// before-after-slider-scrub —— 前后对比拉杆
// 同一画面"处理前 / 处理后"两版叠放，竖分割杆先猛甩后慢扫，杆过处新版"显影"揭出。
//
// 第二轮重设计（石墨暗场 · AI 超分辨率发布镜头）：
// - look = graphite（近单色暗场，白为强调、香槟金点缀）——让照片本身成为画面里唯一的色彩。
// - 主体：虚构影像产品「Kaleo Enhance」的一张 1400×788 作品图——程序化绘制的暮色雪山湖景
//   （四层山脊 + 夕阳 + 星空 + 湖面倒影 + 前景松林），细节密度高：星点、受光山脊描边、
//   水面碎金、松针剪影——正是"处理前"会丢掉的东西。
//   before = 同一张图做成可信的低质原片：14px 马赛克（SVG 像素化滤镜）+ 降饱和 + 低对比 + 高感光噪点；
//   after = 原图清晰版。两版同布局同机位，对比只在"画质"上。
// - 分割杆：2px 白线 + 柔光，84px 白色圆钮带双箭头；杆的 after 一侧有一条随速度变亮的"显影"光带
//   （刚揭开的那一窄条像在定影液里刚浮现），快甩时手柄横向拉伸 + 方向性运动模糊。
// - 版式：顶栏左 Kaleo 字标 + Enhance，右「Super Resolution 4×」；图内左上 After / 右上 Before 胶囊
//   各自长在自己那一层，被分割线一起裁切。
//
// 时间表（30fps，共 165f）：
//   0–16    入场：图与顶栏已在画面（第 1 帧有内容），杆从中点向上下画出、手柄弹出；顶栏逐词浮现
//   16–22   预备：杆向左回拉 8% → 5.5%（蓄力）
//   22–34   快甩 12f：5.5% → 78%（expo-out），手柄拉伸 + 模糊，显影光带最亮
//   34–48   回弹 14f：78% → 70%（不对称 in-out）
//   48–68   停顿 20f：看清 after
//   68–122  慢扫 54f：70% → 40%（约快甩速度的 1/5，"证明变在哪"）
//   122–165 定格 43f：杆停 40%，只有极缓相机推进（1.000 → 1.025 全程）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, mix, ramp, softShadow, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const BEFORE_AFTER_SLIDER_SCRUB_DURATION = 165;

const L = LOOKS.graphite;

// 图框（画面坐标）
const IW = 1400;
const IH = 788;
const IX = (1920 - IW) / 2;
const IY = 196;

// 时间轴
const DRAW = 2; // 杆开始画出
const PRE = 16; // 预备回拉
const T0 = 22; // 快甩起点
const FLING = 34; // 快甩到顶
const SETTLE = 48; // 回弹落定
const HOLD = 68; // 停顿结束
const SCRUB = 122; // 慢扫结束

// 杆位置（图宽 %）
const posAt = (f: number): number => {
  if (f < T0) return mix(8, 5.5, ramp(f, PRE, T0 - PRE, EASE.smooth));
  if (f < FLING) return mix(5.5, 78, ramp(f, T0, FLING - T0, EASE.snappy));
  if (f < SETTLE) return mix(78, 70, ramp(f, FLING, SETTLE - FLING, EASE.swift));
  if (f < HOLD) return 70;
  return mix(70, 40, ramp(f, HOLD, SCRUB - HOLD, EASE.smooth));
};

// ───────────── 程序化湖景 ─────────────
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const ridgeN = (t: number) => {
  const s = 1 - Math.abs(Math.sin(t));
  return s * s;
};
const WATER = 548; // 水线（图内 y）

// 山脊：base 水线、h 高度、f 频率、seed 相位；valley 让中段（夕阳处）低下去
const ridgePts = (h: number, f: number, seed: number, valley: number) => {
  const pts: [number, number][] = [];
  for (let x = -10; x <= IW + 10; x += 6) {
    const u = x / IW;
    const n = 0.64 * ridgeN(x * f + seed) + 0.26 * ridgeN(x * f * 2.3 + seed * 1.7) + 0.1 * ridgeN(x * f * 4.7 + seed * 3.1);
    const dip = 1 - valley * Math.exp(-Math.pow((u - 0.33) / 0.15, 2));
    pts.push([x, WATER - h * (0.25 + 0.75 * n) * dip]);
  }
  return pts;
};
const toArea = (pts: [number, number][]) =>
  `M${pts[0][0]},${WATER + 2} ` + pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ` L${pts[pts.length - 1][0]},${WATER + 2} Z`;
const toLine = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

const RIDGES = [
  { pts: ridgePts(250, 0.0062, 1.3, 0.35), top: '#d9a7a6', bot: '#b88a98', rim: 0.55 },
  { pts: ridgePts(196, 0.0089, 4.1, 0.55), top: '#8b6e8f', bot: '#6f5a7d', rim: 0.75 },
  { pts: ridgePts(150, 0.0121, 7.7, 0.7), top: '#43395a', bot: '#352e4b', rim: 0.9 },
  { pts: ridgePts(84, 0.0173, 2.9, 0.85), top: '#211d31', bot: '#1a1727', rim: 1 },
];

const STARS = Array.from({ length: 110 }, (_, i) => ({
  x: hash(i * 3.1 + 1) * IW,
  y: hash(i * 5.7 + 2) * 300,
  r: 0.6 + hash(i * 9.3 + 3) * 1.5,
  a: 0.35 + hash(i * 2.2 + 4) * 0.65,
}));

// 前景松林：两岸一排三角叠层松树剪影
const PINES = Array.from({ length: 34 }, (_, i) => {
  const left = i < 17;
  const k = left ? i : i - 17;
  const x = left ? -20 + k * 26 + hash(i) * 14 : IW + 20 - k * 25 - hash(i + 9) * 14;
  const base = 812 - (left ? k : k) * 7 - hash(i * 3) * 18;
  const h = 150 - k * 6 + hash(i * 7) * 60;
  return { x, base, h: Math.max(40, h), w: 0.3 + hash(i * 11) * 0.08 };
});
const pinePath = (x: number, base: number, h: number, w: number) => {
  let d = '';
  const tiers = 5;
  for (let t = 0; t < tiers; t++) {
    const y0 = base - (h * t) / tiers;
    const y1 = base - h * ((t + 1.6) / tiers);
    const half = h * w * (1 - t / (tiers + 1));
    d += `M${(x - half).toFixed(1)},${y0.toFixed(1)} L${x.toFixed(1)},${y1.toFixed(1)} L${(x + half).toFixed(1)},${y0.toFixed(1)} Z `;
  }
  return d + `M${x - 2},${base} L${x - 2},${base - h * 0.2} L${x + 2},${base - h * 0.2} L${x + 2},${base} Z`;
};
const PINE_D = PINES.map((p) => pinePath(p.x, p.base, p.h, p.w)).join(' ');

const SUN = { x: IW * 0.33, y: WATER - 34, r: 40 };
const GLITTER = Array.from({ length: 46 }, (_, i) => {
  const t = i / 45;
  const y = WATER + 8 + t * t * 230;
  const w = (10 + hash(i * 4.4) * 60) * (0.5 + t * 1.6);
  return { y, w, x: SUN.x + (hash(i * 6.6) - 0.5) * (30 + t * 140), a: (1 - t) * (0.35 + hash(i) * 0.6) };
});

const Landscape: React.FC<{ id: string }> = ({ id }) => (
  <svg width={IW} height={IH} viewBox={`0 0 ${IW} ${IH}`} style={{ position: 'absolute', inset: 0, display: 'block' }}>
    <defs>
      <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2={WATER} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#141a36" />
        <stop offset="0.38" stopColor="#3a3566" />
        <stop offset="0.7" stopColor="#b8657e" />
        <stop offset="0.9" stopColor="#f2a477" />
        <stop offset="1" stopColor="#ffd39a" />
      </linearGradient>
      <radialGradient id={`sun${id}`} cx={SUN.x} cy={SUN.y} r={420} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fff1cf" stopOpacity="0.95" />
        <stop offset="0.12" stopColor="#ffc98a" stopOpacity="0.55" />
        <stop offset="0.45" stopColor="#f28b6e" stopOpacity="0.16" />
        <stop offset="1" stopColor="#f28b6e" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`water${id}`} x1="0" y1={WATER} x2="0" y2={IH} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#e39a7c" stopOpacity="0.55" />
        <stop offset="0.3" stopColor="#4a3c62" stopOpacity="0.7" />
        <stop offset="1" stopColor="#0d0f1e" stopOpacity="0.95" />
      </linearGradient>
      {RIDGES.map((r, i) => (
        <linearGradient key={i} id={`r${i}${id}`} x1="0" y1={WATER - 260} x2="0" y2={WATER} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={r.top} />
          <stop offset="1" stopColor={r.bot} />
        </linearGradient>
      ))}
      <linearGradient id={`mist${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3c2a8" stopOpacity="0" />
        <stop offset="1" stopColor="#f3c2a8" stopOpacity="0.42" />
      </linearGradient>
      <linearGradient id={`rim${id}`} x1="0" y1="0" x2={IW} y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffd9a8" stopOpacity="0" />
        <stop offset="0.33" stopColor="#ffe6bf" stopOpacity="1" />
        <stop offset="1" stopColor="#ffd9a8" stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect width={IW} height={WATER + 2} fill={`url(#sky${id})`} />
    {STARS.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff6e6" opacity={s.a * (1 - s.y / 330)} />
    ))}
    <circle cx={SUN.x} cy={SUN.y} r={420} fill={`url(#sun${id})`} />
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill="#fff4d8" />
    {/* 山脊（远→近）+ 受光描边 */}
    {RIDGES.map((r, i) => (
      <g key={i}>
        <path d={toArea(r.pts)} fill={`url(#r${i}${id})`} />
        <path d={toLine(r.pts)} fill="none" stroke={`url(#rim${id})`} strokeWidth={1.6} opacity={r.rim * 0.7} />
        {i < RIDGES.length - 1 && <rect y={WATER - 90 + i * 14} width={IW} height={92 - i * 14} fill={`url(#mist${id})`} opacity={0.75 - i * 0.18} />}
      </g>
    ))}
    {/* 湖面：倒影（山脊镜像）+ 水体渐变 + 碎金 + 涟漪线 */}
    <g transform={`translate(0 ${WATER * 2}) scale(1 -1)`} opacity={0.5}>
      <rect y={WATER - 300} width={IW} height={300} fill={`url(#sky${id})`} />
      {RIDGES.map((r, i) => <path key={i} d={toArea(r.pts)} fill={`url(#r${i}${id})`} />)}
    </g>
    <rect y={WATER} width={IW} height={IH - WATER} fill={`url(#water${id})`} />
    {GLITTER.map((g, i) => (
      <rect key={i} x={g.x - g.w / 2} y={g.y} width={g.w} height={1.6 + (g.y - WATER) / 120} rx={1} fill="#ffe2b0" opacity={g.a} />
    ))}
    {Array.from({ length: 18 }, (_, i) => {
      const y = WATER + 14 + Math.pow(i / 17, 1.6) * 250;
      return <line key={i} x1={0} x2={IW} y1={y} y2={y} stroke="#ffffff" strokeOpacity={0.035 + 0.02 * hash(i)} strokeWidth={1} />;
    })}
    <path d={PINE_D} fill="#07080f" />
  </svg>
);

// 图内角标胶囊
const Tag: React.FC<{ label: string; sub: string; side: 'left' | 'right'; lit?: boolean }> = ({ label, sub, side, lit }) => (
  <div style={{
    position: 'absolute', top: 30, [side]: 30, height: 60, padding: '0 24px 0 20px', display: 'flex', alignItems: 'center', gap: 14,
    borderRadius: 30, background: lit ? 'rgba(12,12,16,0.62)' : 'rgba(40,40,44,0.55)',
    border: `1px solid ${alpha('#ffffff', lit ? 0.18 : 0.1)}`, boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.12)}, 0 10px 30px rgba(0,0,0,0.35)`,
    whiteSpace: 'nowrap',
  }}>
    <span style={{ width: 11, height: 11, borderRadius: 6, background: lit ? L.accent2 : '#7c7d82', boxShadow: lit ? `0 0 12px ${alpha(L.accent2, 0.8)}` : 'none' }} />
    <span style={{ ...type(32, 700, { caps: true }), color: lit ? '#ffffff' : '#c9cacd' }}>{label}</span>
    <span style={{ ...type(32, 450), color: lit ? alpha('#ffffff', 0.72) : '#a2a3a8' }}>{sub}</span>
  </div>
);

export const BeforeAfterSliderScrub: React.FC = () => {
  const frame = useCurrentFrame();
  const p = posAt(frame);
  const x = (p / 100) * IW; // 图内坐标

  const vx = velocity((f) => (posAt(f) / 100) * IW, frame);
  const speed = Math.abs(vx);
  const sp = Math.min(speed / 120, 1);
  const squish = 1 + sp * 0.2;

  // 入场：杆从中点向上下画出、手柄弹出
  const draw = ramp(frame, DRAW, 14, EASE.snappy);
  const knob = springAt(frame, DRAW + 4, { damping: 15, stiffness: 190 });

  // 相机：全程极缓推进 + 入场时图从 0.975 落到 1
  const cam = mix(1, 1.025, ramp(frame, 0, BEFORE_AFTER_SLIDER_SCRUB_DURATION, EASE.smooth)) * mix(0.975, 1, ramp(frame, 0, 26, EASE.snappy));
  const intro = ramp(frame, 0, 14, EASE.out);

  // 显影光带：基础 0.25，快甩时冲到 1
  const develop = 0.25 + 0.75 * sp;

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={{ x: 0.5, y: 1.05 }} intensity={0.75} />

      {/* 像素化滤镜：14px 马赛克（before 用） */}
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <filter id="baPixelate" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feFlood x="5" y="5" width="2" height="2" />
          <feComposite width="12" height="12" />
          <feTile result="grid" />
          <feComposite in="SourceGraphic" in2="grid" operator="in" />
          <feMorphology operator="dilate" radius="6" />
        </filter>
      </svg>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam})`, transformOrigin: '50% 54%' }}>
        {/* 顶栏 */}
        <div style={{ position: 'absolute', left: IX, top: 96, width: IW, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: intro }}>
            <svg width={44} height={44} viewBox="0 0 44 44">
              <circle cx={22} cy={22} r={19} fill="none" stroke="#ffffff" strokeWidth={3} />
              <path d="M22 3 A19 19 0 0 1 41 22 L22 22 Z" fill={L.accent2} />
            </svg>
            <span style={{ ...type(44, 750), color: L.ink }}>
              <TextReveal text="Kaleo" start={0} by="char" variant="blur" each={14} gap={1.5} />
            </span>
            <span style={{ ...type(44, 380), color: L.ink2 }}>
              <TextReveal text="Enhance" start={6} by="char" variant="blur" each={14} gap={1.5} />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: ramp(frame, 8, 16, EASE.out) }}>
            <span style={{ ...type(32, 500), color: L.ink2 }}>Super Resolution</span>
            <span style={{
              ...type(32, 700), fontFamily: FONT.mono, letterSpacing: '-0.02em', color: L.onAccent, background: L.ink,
              padding: '4px 14px', borderRadius: 10,
            }}>4×</span>
          </div>
        </div>

        {/* 图框 */}
        <div style={{
          position: 'absolute', left: IX, top: IY, width: IW, height: IH, borderRadius: 22, overflow: 'hidden',
          boxShadow: `0 0 0 1px ${alpha('#ffffff', 0.1)}, 0 40px 90px -20px rgba(0,0,0,0.75), 0 12px 30px rgba(0,0,0,0.5)`,
          background: '#0b0b10',
        }}>
          {/* before：马赛克 + 降饱和 + 低对比 + 噪点 */}
          <div style={{ position: 'absolute', inset: 0, filter: 'url(#baPixelate) saturate(0.5) contrast(0.74) brightness(0.9) sepia(0.12)' }}>
            <Landscape id="b" />
          </div>
          <div style={{
            position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.55,
            backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px)`,
          }} />
          <BeforeNoise frame={frame} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(110,120,105,0.10), rgba(70,80,70,0.14))', mixBlendMode: 'screen' }} />
          <Tag label="Before" sub="540p · ISO 12800" side="right" />

          {/* after：清晰版，杆左侧揭出 */}
          <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${IW - x}px 0 0)` }}>
            <Landscape id="a" />
            {/* 显影光带：刚揭开的一窄条更亮，像刚在定影液里浮现 */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: x - 220, width: 220, mixBlendMode: 'screen',
              background: `linear-gradient(90deg, rgba(255,236,205,0), rgba(255,236,205,${(0.2 * develop).toFixed(3)}))`,
            }} />
            <Tag label="After" sub="4K · denoised" side="left" lit />
          </div>

          {/* 分割杆 + 手柄 */}
          <SpeedBlur vx={vx} amount={0.11} max={16}>
            <div style={{
              position: 'absolute', left: x - 1, top: IH / 2 - (IH / 2) * draw, width: 2, height: IH * draw,
              background: '#ffffff', boxShadow: `0 0 18px ${alpha('#ffffff', 0.35 + 0.4 * sp)}, 0 0 2px rgba(0,0,0,0.4)`,
            }} />
            <div style={{
              position: 'absolute', left: x - 42, top: IH / 2 - 42, width: 84, height: 84, borderRadius: 42, boxSizing: 'border-box',
              background: 'linear-gradient(180deg, #ffffff, #e9e9ec)', border: '1px solid rgba(0,0,0,0.12)',
              boxShadow: `inset 0 1px 0 #ffffff, ${softShadow(16 + sp * 20, { color: '#000000', strength: 2.2 })}`,
              transform: `scale(${knob * squish}, ${knob})`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={40} height={22} viewBox="0 0 40 22" style={{ display: 'block' }}>
                <path d="M12 3 L4 11 L12 19" fill="none" stroke="#1b1c20" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M28 3 L36 11 L28 19" fill="none" stroke="#1b1c20" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </SpeedBlur>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// before 层的高感光噪点：彩色粗颗粒，每 2 帧换一次偏移（确定性）
const BeforeNoise: React.FC<{ frame: number }> = ({ frame }) => {
  const k = Math.floor(frame / 2);
  const ox = Math.floor(hash(k * 3 + 1) * 200);
  const oy = Math.floor(hash(k * 7 + 2) * 200);
  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: 0.32, mixBlendMode: 'overlay',
      backgroundImage: NOISE_URL, backgroundSize: '200px 200px', backgroundPosition: `${ox}px ${oy}px`,
    }} />
  );
};
const NOISE_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n' x='0' y='0' width='100%' height='100%'>` +
  `<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7' stitchTiles='stitch'/>` +
  `<feComponentTransfer><feFuncR type='linear' slope='2.2' intercept='-0.6'/><feFuncG type='linear' slope='2.2' intercept='-0.6'/>` +
  `<feFuncB type='linear' slope='2.2' intercept='-0.6'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;
