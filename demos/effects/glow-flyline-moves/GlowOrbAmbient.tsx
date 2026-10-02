// glow-orb-ambient｜暗场光斑呼吸
// 近黑底上三团大光斑（radial-gradient + blur100）用 seed hash 驱动
// 多正弦叠加做有机漂移；中央深色描边卡的边缘辉光随最近光斑距离呼吸。
// 0–20f 光斑淡入，中段正常速度漂移，90–120f 缓动收敛到静止，末 30f 真静止。
//
// 质感升级：底色换带冷色相的近黑 + 极淡点阵台面；光斑由三团同色灰改为"靛蓝主光 + 淡紫 + 冷白"
// 的克制色对（明度关系与峰值不变）；中央卡换成出版级深色卡（图标、标题、实时指标、sparkline、
// 成员头像），边缘辉光除了原有的外扩 box-shadow，再加一道朝向最近光斑的定向轮廓光
// （发丝线宽、角度随光斑位置转动、只在受光一侧亮），卡片真正"认识"光斑；暗角 + 颗粒防色带。
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const GLOW_ORB_AMBIENT_DURATION = 150; // ~5s：淡入 → 漂移 → 90–120f 收敛 → 末 30f 真静止

// 库内标准伪随机（帧确定）
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const W = 1920;
const H = 1080;
const CX = W / 2;
const CY = H / 2;
const CARD_W = 560;
const CARD_H = 330;

type Orb = {
  size: number;      // 直径 500–700
  peak: number;      // 亮度峰值
  rgb: string;       // 光色（克制色对：靛蓝主光 / 淡紫 / 冷白）
  bx: number; by: number; // 基准中心
  p1: number; p2: number; // 两个正弦周期 90–140f
  ax1: number; ax2: number; ay1: number; ay2: number; // 振幅（合计 ≥240px）
  seed: number;
};

const ORBS: Orb[] = [
  { size: 680, peak: 0.32, rgb: '128,138,255', bx: 600, by: 400, p1: 96, p2: 134, ax1: 170, ax2: 115, ay1: 160, ay2: 120, seed: 1 },
  { size: 580, peak: 0.22, rgb: '178,150,245', bx: 1360, by: 560, p1: 110, p2: 92, ax1: 160, ax2: 120, ay1: 175, ay2: 105, seed: 2 },
  { size: 500, peak: 0.18, rgb: '215,222,242', bx: 940, by: 860, p1: 128, p2: 98, ax1: 150, ax2: 125, ay1: 145, ay2: 118, seed: 3 },
];

const TAU = Math.PI * 2;

const orbPos = (o: Orb, t: number) => {
  const f1 = h(o.seed * 7 + 1) * TAU;
  const f2 = h(o.seed * 7 + 2) * TAU;
  const f3 = h(o.seed * 7 + 3) * TAU;
  const f4 = h(o.seed * 7 + 4) * TAU;
  const x = o.bx + o.ax1 * Math.sin((TAU * t) / o.p1 + f1) + o.ax2 * Math.sin((TAU * t) / o.p2 + f2);
  const y = o.by + o.ay1 * Math.sin((TAU * t) / o.p2 + f3) + o.ay2 * Math.sin((TAU * t) / o.p1 + f4);
  return { x, y };
};

// 中央卡 sparkline（确定性）
const SPARK = Array.from({ length: 24 }, (_, i) => 0.45 + 0.22 * Math.sin(i * 0.55 + 0.8) + 0.12 * Math.sin(i * 1.3) + 0.012 * i);
// Catmull-Rom → 三次贝塞尔，折线变顺滑曲线
const sparkPath = (w: number, hh: number) => {
  const lo = Math.min(...SPARK), hi = Math.max(...SPARK);
  const P = SPARK.map((v, i) => [(i / (SPARK.length - 1)) * w, hh - ((v - lo) / (hi - lo)) * hh]);
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ` +
      `${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};

export const GlowOrbAmbient: React.FC = () => {
  const f = useCurrentFrame();

  // 有效时间：0–90f 匀速，90–120f 用 out-sine 减速收敛（起始斜率≈0.94，近似连续），
  // f≥120 clamp 恒定 => 末 30f 所有位置/阴影完全静止。
  const t =
    f <= 90
      ? f
      : 90 + interpolate(f, [90, 120], [0, 18], { easing: Easing.out(Easing.sin), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // 淡入 0–20f（在末 30f 之前早已结束）
  const fadeIn = interpolate(f, [0, 20], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 卡片自身淡入稍晚 4f（氛围先到、主体后到）
  const cardIn = interpolate(f, [4, 24], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const positions = ORBS.map((o) => orbPos(o, t));

  // 卡缘呼吸：最近光斑距离 -> 辉光强度（按光斑峰值加权取最大）；记下主导光斑做定向轮廓光
  let glow = 0;
  let lead = 0;
  ORBS.forEach((o, i) => {
    const d = Math.hypot(positions[i].x - CX, positions[i].y - CY);
    const p = interpolate(d, [180, 720], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const g = p * (o.peak / 0.32);
    if (g > glow) {
      glow = g;
      lead = i;
    }
  });
  const shadowBlur = 28 * glow;
  const shadowSpread = 10 * glow;
  const shadowAlpha = 0.25 * glow;
  const leadRgb = ORBS[lead].rgb;
  // 轮廓光朝向：卡中心 → 主导光斑（CSS linear-gradient 角度：0deg 朝上、顺时针）
  const lp = positions[lead];
  const ang = (Math.atan2(lp.x - CX, -(lp.y - CY)) * 180) / Math.PI;
  // 渐变起点（0%）要落在朝光一侧 → 渐变方向取反向
  const gAng = (ang + 180).toFixed(1);

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg,#0e0f14 0%,#0a0b0f 100%)', overflow: 'hidden' }}>
      {/* 极淡点阵台面（中心可见、四周隐去） */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.45,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1.2px)', backgroundSize: '36px 36px',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 62% at 50% 50%, #000 15%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 60% 62% at 50% 50%, #000 15%, transparent 100%)',
      }} />
      {ORBS.map((o, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: positions[i].x - o.size / 2, top: positions[i].y - o.size / 2,
            width: o.size, height: o.size, borderRadius: '50%',
            background: `radial-gradient(circle, rgba(${o.rgb},${o.peak}) 0%, rgba(${o.rgb},${o.peak * 0.5}) 42%, rgba(${o.rgb},0) 70%)`,
            filter: 'blur(100px)', opacity: fadeIn,
          }}
        />
      ))}

      {/* 中央深色卡 */}
      <div style={{
        position: 'absolute', left: CX - CARD_W / 2, top: CY - CARD_H / 2, width: CARD_W, height: CARD_H, borderRadius: 18,
        opacity: cardIn, transform: `translateY(${(1 - cardIn) * 10}px)`,
        boxShadow:
          `0 0 ${shadowBlur.toFixed(1)}px ${shadowSpread.toFixed(1)}px rgba(${leadRgb},${shadowAlpha.toFixed(3)}), ` +
          '0 2px 4px rgba(0,0,0,0.45), 0 30px 60px -20px rgba(0,0,0,0.75)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(30,31,38,0.92) 0%, rgba(20,21,26,0.94) 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.075), inset 0 1px 0 rgba(255,255,255,0.07)',
          padding: '30px 32px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontFamily: FONT.sans,
        }}>
          {/* 卡面上的受光余晖：主导光斑方向一侧微亮 */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.6 * glow,
            background: `linear-gradient(${gAng}deg, rgba(${leadRgb},0.10) 0%, rgba(${leadRgb},0) 55%)`,
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(128,136,240,0.14)', boxShadow: 'inset 0 0 0 1px rgba(128,136,240,0.25)',
            }}>
              <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#9aa1ff" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 8.5h2.5L6.5 4l3 8 2-3.5H14" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 600, color: '#ededf0', letterSpacing: '-0.01em' }}>Realtime sync</div>
              <div style={{ fontSize: 14, color: '#7d808a', marginTop: 3 }}>All regions · last 24h</div>
            </div>
            <div style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, color: '#b5b9ff',
              padding: '5px 10px', borderRadius: 999, background: 'rgba(128,136,240,0.12)', boxShadow: 'inset 0 0 0 1px rgba(128,136,240,0.22)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: '#9aa1ff', boxShadow: '0 0 6px rgba(154,161,255,0.9)' }} />
              Live
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 'auto', position: 'relative' }}>
            <div>
              <div style={{ fontSize: 54, fontWeight: 650, color: '#f2f2f5', letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                99.98<span style={{ fontSize: 30, color: '#9a9ca6', marginLeft: 2 }}>%</span>
              </div>
              <div style={{ fontSize: 14, color: '#7d808a', marginTop: 10 }}>Uptime · 1.2M events synced</div>
            </div>
            <svg width={200} height={62} style={{ marginLeft: 'auto', overflow: 'visible' }}>
              <defs>
                <linearGradient id="goa-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(128,136,240,0.28)" />
                  <stop offset="100%" stopColor="rgba(128,136,240,0)" />
                </linearGradient>
              </defs>
              <path d={`${sparkPath(200, 56)} L200,62 L0,62 Z`} fill="url(#goa-fill)" transform="translate(0,3)" />
              <path d={sparkPath(200, 56)} fill="none" stroke="#9aa1ff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" transform="translate(0,3)" />
            </svg>
          </div>
        </div>
        {/* 定向轮廓光：发丝线宽的渐变边，只在朝向主导光斑的一侧亮（mask 镂空出 1px 边） */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 18, padding: 1.2, boxSizing: 'border-box', pointerEvents: 'none',
          background: `linear-gradient(${gAng}deg, rgba(${leadRgb},${(0.15 + 0.75 * glow).toFixed(3)}) 0%, rgba(255,255,255,${(0.10 * glow).toFixed(3)}) 35%, rgba(255,255,255,0) 60%)`,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }} />
      </div>

      <Vignette strength={0.55} inner={0.4} color="#030408" />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
