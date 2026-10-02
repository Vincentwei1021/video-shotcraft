// spotlight-sweep-reveal —— 聚光扫字：暗场里几乎不可见的标题，被一盏摆动的追光扫亮，光到哪哪亮。
//
// 第二轮重设计（剧场首演夜 · 天鹅绒幕布）：
// - look = custom「velvet」：酒红黑天鹅绒幕布 + 钨丝暖白追光 + 香槟金点缀（库里没有的剧场色）。
//   标题换成 220px 衬线「Opening night.」（roman + italic 混排，剧院海报感），虚构票务产品 Balcony。
// - 光是物理的：灯头在画外正上方；追光像钟摆——光斑沿一条下凹的弧线摆（中心最低），两个来回后阻尼收拢，
//   x 与速度同时归零停在正中（不是纯 sin 急刹）。光斑照到哪里，哪里的字（亮版副本 + 柔晕）和
//   幕布褶皱（亮版天鹅绒）一起被揭开——暗场里常驻的只有 0.07 的字影和几乎看不见的幕布。
// - 开灯有"钨丝预热"闪两下（确定性闪烁表）；停稳后光圈像追光灯的 iris 一样张开铺满整行标题 =
//   全亮定格（扩散 out-cubic、光锥消散 linear，解耦判例），之后留一层顶光暖幕 + 光束里的浮尘让 hold 活着。
// - 空间：幕布（远景，褶皱竖纹）→ 标题（中景）→ 舞台台口地板（近景，台沿高光 + 地面光斑反射）。
//
// 时间表（30fps，共 170f）：
//   0–4     暗场：幕布与字影几乎不可见（第一帧就有台沿与顶光余光）
//   4–10    开灯：钨丝预热闪烁两下后稳定
//   8–121   主动作：追光从左侧起摆，两个半来回（周期 50f），后 1.5 个来回阻尼收拢，121f 停在正中
//   121–141 iris 张开：光圈 360→1080px（out-cubic），标题全亮；光锥 20f 线性收成柔和顶光
//   128–152 跟随：眉题字距收拢、副标题与品牌行淡入上浮
//   152–170 hold：顶光暖幕 + 浮尘缓漂，干净海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, bezier, mix, ramp } from '../../_fixtures/Polish';
import { SERIF, alpha, type } from '../../_fixtures/Look';

export const SPOTLIGHT_SWEEP_REVEAL_DURATION = 170;

// 自定义 look「velvet」
const V = {
  bg0: '#1a0a0d', bg1: '#0f0507', bg2: '#070203',
  velvet: '#5a1622', velvetDeep: '#22080c',
  warm: '#ffe6c2', // 钨丝暖白
  ink: '#f8efe2',
  gold: '#e3bd7f',
  ink2: '#c9b39d',
};

const CX = 960;
const CY = 470; // 标题中线
const AMP = 600; // 摆幅
const PERIOD = 50;
const SWING0 = 8; // 起摆
const SWING_END = SWING0 + PERIOD * 2.25; // 121：θ 从 -π/2 走到 4π，sin=0 落在正中
const IRIS_END = SWING_END + 20; // 141
const LAMP_Y = -160;
const FLOOR_Y = 868; // 台沿
const R0 = 360; // 摆动期光圈半径
const outCubic = bezier(0.215, 0.61, 0.355, 1);

const rnd = (i: number) => {
  const s = Math.sin(i * 91.7 + 13.1) * 43758.5453;
  return s - Math.floor(s);
};

// 光斑位置：钟摆。θ 从 -π/2（最左）起，第一来回满幅，之后包络 smooth 收到 0（x 与速度同时归零）
const spotAt = (f: number) => {
  const sf = Math.min(Math.max(f, SWING0), SWING_END);
  const th = -Math.PI / 2 + (2 * Math.PI * (sf - SWING0)) / PERIOD;
  const env = 1 - ramp(sf, SWING0 + PERIOD * 0.75, SWING_END - SWING0 - PERIOD * 0.75, EASE.smooth);
  const u = Math.sin(th) * env; // -1..1
  return { x: CX + AMP * u, y: CY + 26 - 44 * u * u }; // 下凹弧：中心最低
};

// 钨丝预热闪烁（4–10f）
const FLICKER = [0, 0.55, 0.15, 0.8, 0.45, 1];
const lampOn = (f: number) => (f < 4 ? 0 : f >= 10 ? 1 : FLICKER[Math.min(5, f - 4)]);

const Title: React.FC<{ color: string; style?: React.CSSProperties }> = ({ color, style }) => (
  <div
    style={{
      position: 'absolute', left: 0, right: 0, top: CY - 130, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}
  >
    <div style={{ fontFamily: SERIF, fontSize: 220, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1, color, whiteSpace: 'nowrap' }}>
      Opening <span style={{ fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.02em' }}>night.</span>
    </div>
  </div>
);

// 天鹅绒幕布：不等宽竖褶（三组周期叠加）+ 顶部挂杆暗、下摆略亮
const CURTAIN =
  `repeating-linear-gradient(90deg, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0) 46px, rgba(255,210,200,0.10) 70px, rgba(0,0,0,0) 96px, rgba(0,0,0,0.55) 132px),` +
  `repeating-linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0.3) 210px, rgba(0,0,0,0) 330px),` +
  `linear-gradient(180deg, ${V.velvetDeep} 0%, ${V.velvet} 55%, #43101a 100%)`;

const Curtain: React.FC<{ opacity: number; style?: React.CSSProperties }> = ({ opacity, style }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: FLOOR_Y, backgroundImage: CURTAIN, opacity, ...style }} />
);

export const SpotlightSweepReveal: React.FC = () => {
  const f = useCurrentFrame();
  const on = lampOn(f);
  const { x, y } = spotAt(f);

  // iris 张开 + 全亮（扩散 out-cubic）；光锥收成柔和顶光（linear）
  const iris = ramp(f, SWING_END, IRIS_END - SWING_END, outCubic);
  const coneFade = 1 - 0.7 * ramp(f, SWING_END, IRIS_END - SWING_END, EASE.linear);
  const radius = mix(R0, 1080, iris);
  const ry = mix(R0 * 0.92, 480, iris);
  const breathe = 1 + 0.04 * Math.sin(f / 17) * ramp(f, IRIS_END, 20, EASE.smooth);

  const spotMask = `radial-gradient(ellipse ${radius.toFixed(1)}px ${ry.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, #000 0%, rgba(0,0,0,0.92) 42%, rgba(0,0,0,0.35) 72%, transparent 100%)`;
  const maskStyle: React.CSSProperties = { WebkitMaskImage: spotMask, maskImage: spotMask };

  // 光锥：灯头窄口 → 光斑左右切点
  const topHalf = 40;
  const poolHalf = mix(R0 * 1.05, 1300, iris);
  const coneBottom = y + mix(R0 * 0.8, 420, iris);
  const cone = `${CX - topHalf},${LAMP_Y} ${CX + topHalf},${LAMP_Y} ${x + poolHalf},${coneBottom} ${x - poolHalf},${coneBottom}`;

  // 光束浮尘：沿光锥轴向分布，缓慢上浮 + 横漂（确定性）
  const motes = Array.from({ length: 56 }, (_, i) => {
    const u = rnd(i);
    const v = rnd(i + 100) - 0.5;
    const drift = ((f * (0.35 + rnd(i + 200) * 0.5)) % 160) / 160;
    const uu = (u + 1 - drift * 0.4) % 1;
    const yy = mix(LAMP_Y + 120, coneBottom - 40, uu);
    const k = (yy - LAMP_Y) / (coneBottom - LAMP_Y);
    const half = mix(topHalf, poolHalf, k);
    const axisX = mix(CX, x, k);
    const xx = axisX + v * half * 1.6 + Math.sin(f / 23 + i) * 7;
    const r = 0.9 + rnd(i + 300) * 1.8;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(f / (11 + rnd(i + 400) * 9) + i));
    return { xx, yy, r, a: (0.16 + rnd(i + 500) * 0.4) * tw };
  });

  const kicker = ramp(f, SWING_END + 7, 22, EASE.snappy);
  const sub = ramp(f, SWING_END + 13, 22, EASE.snappy);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${V.bg0} 0%, ${V.bg1} 60%, ${V.bg2} 100%)`, overflow: 'hidden', fontFamily: FONT.sans }}>
      {/* 远景：幕布常驻极暗 */}
      <Curtain opacity={0.16} />
      {/* 顶光余光：灯头口漏下来的一点暖光（常驻，第一帧就有） */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 30% 22% at 50% 0%, ${alpha(V.warm, 0.1)} 0%, ${alpha(V.warm, 0)} 100%)` }} />

      {/* 幕布被照亮的部分：亮版幕布，随光斑遮罩 */}
      <div style={{ position: 'absolute', inset: 0, opacity: on * breathe, ...maskStyle }}>
        <Curtain opacity={0.95} />
        {/* 暖光染色 */}
        <div style={{ position: 'absolute', inset: 0, background: alpha('#ff9a6a', 0.08), mixBlendMode: 'screen' }} />
      </div>

      {/* 台口地板：近景 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: FLOOR_Y, bottom: 0, background: 'linear-gradient(180deg, #1c0d0c 0%, #0b0505 100%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: FLOOR_Y, height: 2, background: `linear-gradient(90deg, transparent, ${alpha(V.warm, 0.14)}, transparent)` }} />
      {/* 地面光斑：追光落到台面的那一小块 */}
      <div
        style={{
          position: 'absolute', inset: 0, opacity: on * coneFade * 0.9,
          background: `radial-gradient(ellipse ${(poolHalf * 0.9).toFixed(0)}px 70px at ${x.toFixed(1)}px ${FLOOR_Y + 60}px, ${alpha(V.warm, 0.22)} 0%, ${alpha(V.warm, 0.06)} 55%, ${alpha(V.warm, 0)} 100%)`,
        }}
      />

      {/* 字影：暗场里常驻的 0.07 */}
      <Title color={V.ink} style={{ opacity: 0.07 }} />

      {/* 光锥：柔边体积光 + 浮尘 */}
      <div style={{ position: 'absolute', inset: 0, opacity: on * coneFade }}>
        <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="ssr-beam" x1="0" y1={LAMP_Y} x2="0" y2={coneBottom} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={V.warm} stopOpacity="0.26" />
              <stop offset="0.6" stopColor={V.warm} stopOpacity="0.07" />
              <stop offset="1" stopColor={V.warm} stopOpacity="0" />
            </linearGradient>
            <filter id="ssr-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            <clipPath id="ssr-clip">
              <polygon points={cone} />
            </clipPath>
          </defs>
          <polygon points={cone} fill="url(#ssr-beam)" filter="url(#ssr-soft)" />
          <g clipPath="url(#ssr-clip)">
            {motes.map((m, i) => (
              <circle key={i} cx={m.xx} cy={m.yy} r={m.r} fill={V.warm} opacity={m.a} />
            ))}
          </g>
        </svg>
      </div>

      {/* 墙上光斑：暖白椭圆，硬一点的芯 + 长软边 */}
      <div
        style={{
          position: 'absolute', inset: 0, opacity: on * mix(1, 0.55, iris) * breathe,
          background: `radial-gradient(ellipse ${(radius * 1.2).toFixed(0)}px ${(ry * 1.1).toFixed(0)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, ${alpha(V.warm, 0.16)} 0%, ${alpha(V.warm, 0.07)} 48%, ${alpha(V.warm, 0)} 100%)`,
          mixBlendMode: 'screen',
        }}
      />

      {/* 亮版标题：随光斑遮罩；底下垫一层同遮罩柔晕（被照亮的字边微溢光） */}
      <div style={{ position: 'absolute', inset: 0, opacity: on, ...maskStyle }}>
        <Title color={V.warm} style={{ filter: 'blur(16px)', opacity: 0.5 }} />
        <Title color={V.ink} />
      </div>

      {/* 眉题 + 副标题（全亮后入场） */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: CY - 210, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22,
          opacity: kicker, ...type(24, 650, { caps: true }), letterSpacing: `${mix(0.62, 0.36, kicker).toFixed(3)}em`, color: V.gold,
        }}
      >
        <span style={{ width: mix(0, 70, kicker), height: 1, background: alpha(V.gold, 0.6) }} />
        Friday · 8 pm · Row F
        <span style={{ width: mix(0, 70, kicker), height: 1, background: alpha(V.gold, 0.6) }} />
      </div>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: CY + 170, textAlign: 'center',
          opacity: sub, transform: `translateY(${mix(18, 0, sub).toFixed(1)}px)`,
        }}
      >
        <div style={{ ...type(44, 450), color: V.ink2 }}>
          Every seat in the house, one tap away.
        </div>
        <div style={{ marginTop: 22, ...type(30, 700), letterSpacing: '0.02em', color: V.ink, opacity: ramp(f, SWING_END + 22, 18, EASE.out) }}>
          <span style={{ color: V.gold }}>◆</span> Balcony
        </div>
      </div>

      <Vignette strength={0.62} inner={0.36} color="#050102" />
      <Grain opacity={0.09} blend="soft-light" />
    </AbsoluteFill>
  );
};
