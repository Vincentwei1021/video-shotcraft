import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, bezier, mix, ramp, tracking } from '../../_fixtures/Polish';

// spotlight-sweep-reveal: 聚光灯摆动扫字
// 暗场里标题两行常驻 opacity 0.07；亮版同文本用 radial-gradient mask，
// 光斑 x 按 sin 摆动扫两个来回（周期 55f），第二个来回振幅阻尼收拢 → f110 恰好以零速度停在中心
//（避免纯 sin 在中心最快时急刹），f110 后全字提亮定格（out-cubic），
// 光斑/光锥线性消散并在 f>=125 条件卸载，125–160 真静止 35f。
// 光的质感：灯头在画外正上方，光锥 = 柔边体积光（SVG 渐变 + 高斯柔边）+ 光束里缓慢漂浮的尘埃，
// 墙上光斑是暖白椭圆（暖色温 vs 冷调暗场），字被照到的部分带一点向外的晕。

export const SPOTLIGHT_SWEEP_REVEAL_DURATION = 160;

const INKW = '#f6f4ef';
const WARM = '255,244,228'; // 灯光暖白

const CX = 960;
const CY = 540;
const AMP = 560; // 摆动幅度
const PERIOD = 55; // 单个来回帧数
const SWEEP_END = 110; // 两个来回结束
const REVEAL_END = 125; // 提亮完成，之后真静止
const LAMP_Y = -120; // 灯头（画外正上方）
const outCubic = bezier(0.215, 0.61, 0.355, 1);

const rnd = (i: number) => {
  const s = Math.sin(i * 91.7 + 13.1) * 43758.5453;
  return s - Math.floor(s);
};

const textStyle: React.CSSProperties = {
  fontFamily: FONT.sans,
  fontSize: 150,
  fontWeight: 800,
  lineHeight: 1.06,
  letterSpacing: tracking(150),
  color: INKW,
  textAlign: 'center',
  whiteSpace: 'pre',
};

const TitleText: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
    <div style={{ ...textStyle, ...style }}>{'Your best work,\nin the spotlight.'}</div>
  </AbsoluteFill>
);

// 光斑横坐标：前 55f 满幅摆动；第二个来回振幅按 smooth 包络收到 0（x 与 x' 在 f110 同时归零）
const spotX = (f: number) => {
  const sf = Math.min(f, SWEEP_END);
  const env = 1 - ramp(sf, PERIOD * 0.5, SWEEP_END - PERIOD * 0.5, EASE.smooth);
  return CX + AMP * Math.sin((2 * Math.PI * sf) / PERIOD) * env;
};

export const SpotlightSweepReveal: React.FC = () => {
  const f = useCurrentFrame();

  const x = spotX(f);

  // 全字提亮（扩散感 out-cubic）
  const brighten = ramp(f, SWEEP_END, REVEAL_END - SWEEP_END, outCubic);
  // 光斑/光锥消散（线性）
  const fadeOut = 1 - ramp(f, SWEEP_END, REVEAL_END - SWEEP_END, EASE.linear);
  const sweepAlive = f < REVEAL_END; // 条件卸载，保证末段真静止

  const maskGrad = `radial-gradient(circle 380px at ${x.toFixed(1)}px ${CY}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 45%, rgba(0,0,0,0) 100%)`;

  // 光锥几何：灯头窄口 → 墙上光斑的左右切点（略低于字心，像从上方斜打）
  const topHalf = 46;
  const poolHalf = 400;
  const cone = `${CX - topHalf},${LAMP_Y} ${CX + topHalf},${LAMP_Y} ${x + poolHalf},${CY + 300} ${x - poolHalf},${CY + 300}`;

  // 光束尘埃：48 粒，沿光锥轴向分布、缓慢上浮 + 横向微漂（确定性）
  const motes = Array.from({ length: 48 }, (_, i) => {
    const u = rnd(i); // 沿轴向 0..1
    const v = rnd(i + 100) - 0.5; // 横向 −0.5..0.5
    const drift = ((f * (0.4 + rnd(i + 200) * 0.6)) % 140) / 140;
    const uu = (u + 1 - drift * 0.35) % 1;
    const yy = mix(LAMP_Y + 80, CY + 260, uu);
    const half = mix(topHalf, poolHalf, (yy - LAMP_Y) / (CY + 300 - LAMP_Y));
    const axisX = mix(CX, x, (yy - LAMP_Y) / (CY + 300 - LAMP_Y));
    const xx = axisX + v * half * 1.7 + Math.sin(f / 23 + i) * 6;
    const r = 0.8 + rnd(i + 300) * 1.6;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(f / (11 + rnd(i + 400) * 9) + i));
    return { xx, yy, r, a: (0.18 + rnd(i + 500) * 0.4) * tw };
  });

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #17181d 0%, #101115 60%, #0b0c0f 100%)' }}>
      {/* 暗版文字常驻 */}
      <AbsoluteFill style={{ opacity: 0.07 }}>
        <TitleText />
      </AbsoluteFill>

      {sweepAlive && (
        <AbsoluteFill style={{ opacity: fadeOut }}>
          {/* 光锥：柔边体积光（近灯头亮、往下渐淡）+ 光束里的尘埃 */}
          <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="ssr-beam" x1="0" y1={LAMP_Y} x2="0" y2={CY + 300} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={`rgb(${WARM})`} stopOpacity="0.20" />
                <stop offset="0.6" stopColor={`rgb(${WARM})`} stopOpacity="0.07" />
                <stop offset="1" stopColor={`rgb(${WARM})`} stopOpacity="0" />
              </linearGradient>
              <filter id="ssr-soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="16" />
              </filter>
              <clipPath id="ssr-clip">
                <polygon points={cone} />
              </clipPath>
            </defs>
            <polygon points={cone} fill="url(#ssr-beam)" filter="url(#ssr-soft)" />
            <g clipPath="url(#ssr-clip)">
              {motes.map((m, i) => (
                <circle key={i} cx={m.xx} cy={m.yy} r={m.r} fill={`rgb(${WARM})`} opacity={m.a} />
              ))}
            </g>
          </svg>
          {/* 落在暗墙上的暖白光斑：横向略扁的椭圆，硬一点的芯 + 很长的软边 */}
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse 470px 420px at ${x.toFixed(1)}px ${CY}px, rgba(${WARM},0.20) 0%, rgba(${WARM},0.10) 45%, rgba(${WARM},0.03) 75%, rgba(${WARM},0) 100%)`,
            }}
          />
          {/* 亮版文字，按帧移动的 radial mask；底下垫一层同遮罩的柔晕，被照亮的字边微微溢光 */}
          <AbsoluteFill style={{ WebkitMaskImage: maskGrad, maskImage: maskGrad }}>
            <TitleText style={{ filter: 'blur(14px)', opacity: 0.45 }} />
            <TitleText />
          </AbsoluteFill>
          {/* 灯头口的亮点（画外上沿漏下来的一点光） */}
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse 260px 120px at ${CX}px 0px, rgba(${WARM},0.22) 0%, rgba(${WARM},0) 100%)`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* 全亮定格层 */}
      <AbsoluteFill style={{ opacity: brighten }}>
        <TitleText />
      </AbsoluteFill>

      <Vignette strength={0.6} inner={0.4} color="#000000" />
      <Grain opacity={0.08} step={100000} blend="soft-light" />
    </AbsoluteFill>
  );
};
