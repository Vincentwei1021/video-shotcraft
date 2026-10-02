// mosaic-reframe — Mosaic Reframe 三段布局重排（motion-lab 定稿转原生 Remotion）
// 12 张图片瓦片在三种排版间连续变形：4x3 规则网格 → 带一块 2x2 大图的 feature
// mosaic → 对角线瀑布串（每片 -15°+i*3° 递增旋转）。位置与宽高各自独立插值，
// 每片按 index 微 stagger，smoothstep 缓动，段间留 hold。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 质感层：瓦片换成"像图片"的内容——SVG 程序插画（日落 / 山脊 / 海浪 / 几何四式轮换，
// viewBox + slice 相当于 object-fit: cover，宽高插值时不变形不露底）+ 底部压暗 scrim 上的标题与元信息；
// 换位途中瓦片按段进度 sin 包络抬起（阴影变大变虚 + 微放大 2.5%），落位时贴回；
// 背景换成带冷色主光的暗场 + 暗角 + 颗粒。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const MOSAIC_REFRAME_DURATION = 180; // 6000ms @30fps

// smoothstep：段内缓动（原配方即用它替代 E 表）
const smooth = (x: number) => x * x * (3 - 2 * x);

type Box = { x: number; y: number; w: number; h: number; rot: number };
const KEYS = ['x', 'y', 'w', 'h', 'rot'] as const;

// 累加式关键帧插值：各段进度独立过 ease 后按差值叠加，天然支持窗间 hold
const acc = (t: number, base: Box, kfs: { at: [number, number]; to: Box }[], ease: (x: number) => number): Box => {
  const out: Box = { ...base };
  let prev = base;
  for (const kf of kfs) {
    const u = seg(t, kf.at[0], kf.at[1], ease);
    for (const k of KEYS) out[k] += u * (kf.to[k] - prev[k]);
    prev = kf.to;
  }
  return out;
};

// ---- layout A: 4x3 规则网格 ----
const gw = (92 - 3 * 2) / 4, gh = (92 - 2 * 2) / 3;
const A: Box[] = Array.from({ length: 12 }, (_, i) => {
  const c = i % 4, r = (i / 4) | 0;
  return { x: 4 + c * (gw + 2), y: 4 + r * (gh + 2), w: gw, h: gh, rot: 0 };
});

// ---- layout B: feature mosaic（6x4 单元格，t0 占 3x2）----
const uw = (92 - 5 * 1.2) / 6, uh = (92 - 3 * 1.2) / 4;
const SLOTS: [number, number, number, number][] = [
  [0, 0, 3, 2], [3, 0, 1, 1], [4, 0, 1, 1], [5, 0, 1, 1], [3, 1, 2, 1], [5, 1, 1, 1],
  [0, 2, 1, 1], [1, 2, 2, 1], [3, 2, 1, 2], [4, 2, 2, 1], [0, 3, 3, 1], [4, 3, 2, 1],
];
const B: Box[] = SLOTS.map(([c, r, cw, rh]) => ({
  x: 4 + c * (uw + 1.2), y: 4 + r * (uh + 1.2),
  w: cw * uw + (cw - 1) * 1.2, h: rh * uh + (rh - 1) * 1.2, rot: 0,
}));

// ---- layout C: 对角线瀑布串 ----
const C: Box[] = Array.from({ length: 12 }, (_, i) => ({
  x: 1 + i * 6.4, y: -7 + i * 7.6, w: 23, h: 27, rot: -15 + i * 3,
}));

// 瓦片标题与元信息（相册 / 模板库语境）
const TITLES = [
  ['Golden hour', 'Featured · 24 photos'], ['Ridge line', '12 photos'], ['Tidepool', '9 photos'], ['Form study', '16 photos'],
  ['Dusk drive', '31 photos'], ['Alpine', '8 photos'], ['Low tide', '14 photos'], ['Shapes', '6 photos'],
  ['Night run', '22 photos'], ['Summit', '11 photos'], ['Coastline', '19 photos'], ['Grid', '7 photos'],
];

// 程序插画：viewBox 160×100，preserveAspectRatio slice ≈ object-fit: cover
const Art: React.FC<{ i: number; hue: number }> = ({ i, hue }) => {
  const kind = i % 4;
  const sky = `art-sky-${i}`;
  const h2 = hue + 26;
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, display: 'block' }}>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue},62%,${kind === 0 ? 58 : 46}%)`} />
          <stop offset="100%" stopColor={`hsl(${h2},64%,${kind === 0 ? 30 : 18}%)`} />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#${sky})`} />
      {kind === 0 && (
        <>
          <circle cx="104" cy="58" r="22" fill={`hsl(${hue + 40},95%,78%)`} opacity="0.95" />
          <circle cx="104" cy="58" r="34" fill={`hsl(${hue + 40},95%,78%)`} opacity="0.14" />
          <rect y="64" width="160" height="36" fill={`hsl(${h2},55%,14%)`} />
          {[70, 76, 83].map((y, k) => (
            <rect key={k} x={78 + k * 6} y={y} width={52 - k * 12} height="1.4" rx="0.7" fill={`hsl(${hue + 40},95%,78%)`} opacity={0.5 - k * 0.13} />
          ))}
        </>
      )}
      {kind === 1 && (
        <>
          <circle cx="40" cy="26" r="7" fill={`hsl(${hue + 50},90%,88%)`} opacity="0.85" />
          <polygon points="0,78 34,40 58,62 86,30 122,66 160,44 160,100 0,100" fill={`hsl(${h2},45%,26%)`} />
          <polygon points="86,30 78,40 90,38 96,44" fill={`hsl(${hue},40%,80%)`} opacity="0.55" />
          <polygon points="0,88 40,64 76,80 116,58 160,76 160,100 0,100" fill={`hsl(${h2},50%,12%)`} />
        </>
      )}
      {kind === 2 && (
        <>
          {[0, 1, 2, 3, 4].map((k) => (
            <path key={k} d={`M0 ${52 + k * 10} Q 40 ${44 + k * 10} 80 ${52 + k * 10} T 160 ${52 + k * 10} V100 H0Z`}
              fill={`hsl(${hue + k * 4},${58 - k * 4}%,${40 - k * 6}%)`} opacity={0.9} />
          ))}
          <circle cx="126" cy="24" r="9" fill={`hsl(${hue + 40},90%,86%)`} opacity="0.8" />
        </>
      )}
      {kind === 3 && (
        <>
          <circle cx="58" cy="46" r="34" fill={`hsl(${hue + 40},85%,66%)`} opacity="0.85" />
          <rect x="70" y="28" width="62" height="62" rx="4" fill={`hsl(${h2},60%,22%)`} opacity="0.9" transform="rotate(12 101 59)" />
          <circle cx="118" cy="30" r="6" fill="#fff" opacity="0.7" />
        </>
      )}
      {/* 底部压暗 scrim：给标题的可读底 */}
      <rect y="55" width="160" height="45" fill="url(#mosaic-scrim)" />
    </svg>
  );
};

export const MosaicReframe: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: '#0a0b10' }}>
      <DesignStage bg="#0a0b10" raster="zoom">
        {/* 暗场：顶部偏左一处冷色主光 */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(70% 80% at 36% 6%, #1a1e2c 0%, #0d0f16 55%, #08090d 100%)' }} />
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <defs>
            <linearGradient id="mosaic-scrim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#05060a" stopOpacity={0} />
              <stop offset="100%" stopColor="#05060a" stopOpacity={0.62} />
            </linearGradient>
          </defs>
        </svg>
        {A.map((base, i) => {
          const hue = 198 + i * 13;
          const st = i * 0.007; // ≈ index*2 帧微 stagger
          const w1: [number, number] = [0.26 + st, 0.42 + st];
          const w2: [number, number] = [0.62 + st, 0.80 + st];
          const v = acc(t, base, [
            { at: w1, to: B[i] }, // A → B
            { at: w2, to: C[i] }, // hold 后 B → C
          ], smooth);
          const pop = seg(t, i * 0.012, i * 0.012 + 0.14, E.outCubic); // 开场逐片浮现
          // 换位抬起：两段各自的 sin 包络（落位即贴回）
          const lift = Math.max(Math.sin(Math.PI * seg(t, ...w1)), Math.sin(Math.PI * seg(t, ...w2)));
          const [title, meta] = TITLES[i];
          const big = i === 0;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                borderRadius: 7,
                overflow: 'hidden',
                background: `hsl(${hue + 26},60%,16%)`,
                boxShadow:
                  `0 ${(1 + lift * 2).toFixed(2)}px ${(3 + lift * 3).toFixed(2)}px rgba(0,0,0,${(0.35 - lift * 0.1).toFixed(3)}), ` +
                  `0 ${(8 + lift * 10).toFixed(2)}px ${(22 + lift * 22).toFixed(2)}px -4px rgba(0,0,0,${(0.42 + lift * 0.14).toFixed(3)}), ` +
                  `inset 0 0 0 0.5px hsla(${hue},70%,80%,.22), inset 0 0.5px 0 rgba(255,255,255,.22)`,
                left: `${v.x}%`,
                top: `${v.y}%`,
                width: `${v.w}%`,
                height: `${v.h}%`,
                transform: `rotate(${v.rot}deg) scale(${(lerp(pop, 0.82, 1) * (1 + lift * 0.025)).toFixed(4)})`,
                opacity: pop,
                zIndex: 10 + (i === 0 ? 5 : 0),
                fontFamily: FONT.sans,
              }}
            >
              <Art i={i} hue={hue} />
              {/* 左上类型角标（只给少数片，别全贴） */}
              {(i === 0 || i === 4 || i === 9) && (
                <div style={{
                  position: 'absolute', left: 7, top: 7, height: 10, padding: '0 5px', borderRadius: 5,
                  background: 'rgba(10,11,16,0.45)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.92)', fontSize: 5.2, fontWeight: 650, letterSpacing: '0.06em',
                  display: 'flex', alignItems: 'center',
                }}>{i === 0 ? 'FEATURED' : 'NEW'}</div>
              )}
              {/* 标题 + 元信息（固定字号，宽高插值时不缩放） */}
              <div style={{ position: 'absolute', left: 8, right: 8, bottom: 7 }}>
                <div style={{
                  fontSize: big ? 10 : 7, fontWeight: 650, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.15,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 0.5px 2px rgba(0,0,0,0.35)',
                }}>{title}</div>
                <div style={{ marginTop: 1.5, fontSize: big ? 6 : 5, color: 'rgba(255,255,255,0.66)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{meta}</div>
              </div>
            </div>
          );
        })}
      </DesignStage>
      <Vignette strength={0.4} inner={0.5} color="#020306" />
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
