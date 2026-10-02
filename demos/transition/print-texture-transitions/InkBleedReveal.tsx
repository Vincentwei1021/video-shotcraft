// 墨渗揭示（ink-bleed-reveal）——水墨转场（轨道遮罩法）。
// 旧景：暖白纸面上的章节扉页（等宽小字章号 + 衬线大标题 + 细线 + 副题），纸纹静态颗粒；
// 新景 FakeDashboard(A) 放进 SVG <foreignObject>，套 <mask>：落墨点 (800,420) 的白圆当轨道遮罩。
// 墨的三层（自外向内）：①湿晕——纸被水洇湿的一圈极淡暗环（大半径、重羽化）；
// ②墨边——深靛墨色的须状渗边，半径领先新景 20–42px：外沿半透明重羽化、内芯浓，读作"湿墨"；
// ③新景——在墨边后面"显影"出来，内容始终清晰，scale 1.035→1 轻收（显影感）。
// 三层遮罩圆共用 feTurbulence(baseFrequency 0.02, octaves 3, seed 7 固定) + feDisplacementMap
// （scale 60→160 随帧涨）造须状渗边——filter 只揉遮罩形状，不揉画面。
// 节拍：0–14 hold 旧景 → 14–22 墨滴落点（小墨点过冲落下）→ 20–98 半径 0→1450
// （Easing.out(quad)）叠 ±8% 低频正弦扰动（帧 78–98 衰减到 0，洇满全屏）→
// 100–130 摘掉 mask 直接铺新景，真静止 30f。
import React, { useId } from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { EASE, FONT, ramp, mix, Grain } from '../../_fixtures/Polish';

export const INK_BLEED_REVEAL_DURATION = 130;

const SERIF = 'ui-serif, "New York", "Iowan Old Style", Georgia, "Times New Roman", serif';
const PAPER = '#f3efe6'; // 暖白纸
const INK = '#1a1c29'; // 带一点靛的墨色（不用纯黑）
const PAPER_INK = '#2a2620'; // 印在纸上的字色

// 旧景：章节扉页（纸 + 印刷字）
const PaperPage: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 70% at 42% 38%, #f8f5ee 0%, ${PAPER} 55%, #e9e4d8 100%)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{ textAlign: 'center', color: PAPER_INK }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.32em', color: '#8a8173', marginBottom: 34 }}>
        CHAPTER 02
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 112, fontWeight: 500, lineHeight: 1.04, letterSpacing: '-0.025em' }}>
        Measuring what
        <br />
        <span style={{ fontStyle: 'italic' }}>matters</span>
      </div>
      <div style={{ width: 120, height: 1.5, background: '#b7ab97', margin: '44px auto 30px' }} />
      <div style={{ fontFamily: SERIF, fontSize: 34, color: '#6f675a', letterSpacing: '-0.005em' }}>
        One dashboard for every signal your team ships.
      </div>
    </div>
    {/* 纸纹：静态颗粒（step 极大 = 不换帧，静止段像素恒定） */}
    <Grain opacity={0.07} step={100000} freq={0.9} blend="multiply" />
  </div>
);

export const InkBleedReveal: React.FC = () => {
  const frame = useCurrentFrame();
  // 滤镜/mask ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bleedId = `inkBleed-${uid}`;
  const featherId = `inkFeather-${uid}`;
  const haloId = `inkHalo-${uid}`;
  const maskNew = `inkMaskNew-${uid}`;
  const maskInk = `inkMaskInk-${uid}`;
  const maskHalo = `inkMaskHalo-${uid}`;

  // 墨滴落点：画面中心偏左上
  const cx = 800;
  const cy = 420;

  // 基础半径：帧 20–98，0 → 1450px（最远角 ~1300px + 渗边位移余量 150px）
  const baseR = interpolate(frame, [20, 98], [0, 1450], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // ±8% 低频正弦扰动 = 快慢不匀的洇开；帧 78–98 幅度衰减到 0，保证吃满后能真静止
  const wobbleEnv = interpolate(frame, [78, 98], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const r = Math.max(0, baseR * (1 + 0.08 * Math.sin(frame * 0.32) * wobbleEnv));
  // 墨边领先量：起笔时窄（20px）、洇开中段最宽（~42px）——墨在纸上先跑、画面后显
  const lead = 20 + 22 * Math.sin(Math.PI * ramp(frame, 20, 78, EASE.linear));
  const rInk = r > 0.5 ? r + lead : 0; // 墨边外沿（半透明、羽化重）
  const rCore = r > 0.5 ? r + lead * 0.45 : 0; // 墨芯（浓、羽化轻）
  // 湿晕：比墨边再外扩 ~110px，极淡
  const rHalo = r > 0.5 ? r + lead + 110 : 0;

  // 渗边发散度：displacement scale 60 → 160（边缘越洇越散、指尖分叉越长）
  const dispScale = interpolate(frame, [20, 98], [60, 160], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // 墨滴：14–22f 一个小墨点过冲落下，随后被洇开的墨边吞没
  const drop = ramp(frame, 14, 8, EASE.overshoot);
  const dropR = 16 * drop;

  // 新景显影：scale 1.035 → 1（20–100f，ease-out），摘罩前必须精确回到 1
  const develop = mix(1.035, 1, ramp(frame, 20, 80, EASE.out));

  // 帧 100 起 mask 已全白：摘掉 SVG 直接铺新景，确保结尾像素级真静止
  const settled = frame >= 100;

  return (
    <div style={{ width: 1920, height: 1080, background: PAPER, position: 'relative', overflow: 'hidden' }}>
      {!settled && <PaperPage />}

      {settled ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          <FakeDashboard variant="A" />
        </div>
      ) : (
        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, display: 'block' }}>
          <defs>
            {/* filter 只挂在 mask 的圆上——揉的是遮罩边，不是画面内容 */}
            <filter id={bleedId} x="-40%" y="-40%" width="180%" height="180%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="7" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={dispScale} xChannelSelector="R" yChannelSelector="G" />
            </filter>
            {/* 墨边：同一套须状位移 + 1.6px 羽化 = 湿墨的软边 */}
            <filter id={featherId} x="-40%" y="-40%" width="180%" height="180%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="7" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={dispScale * 1.08} xChannelSelector="R" yChannelSelector="G" result="d" />
              <feGaussianBlur in="d" stdDeviation="3.2" />
            </filter>
            <filter id={`${featherId}c`} x="-40%" y="-40%" width="180%" height="180%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="7" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={dispScale * 1.03} xChannelSelector="R" yChannelSelector="G" result="d" />
              <feGaussianBlur in="d" stdDeviation="1" />
            </filter>
            {/* 湿晕：重羽化，只留一圈若有若无的暗 */}
            <filter id={haloId} x="-40%" y="-40%" width="180%" height="180%">
              <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={dispScale * 1.3} xChannelSelector="R" yChannelSelector="G" result="d" />
              <feGaussianBlur in="d" stdDeviation="34" />
            </filter>
            <mask id={maskHalo} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
              <rect x="0" y="0" width="1920" height="1080" fill="black" />
              {rHalo > 0 && <circle cx={cx} cy={cy} r={rHalo} fill="white" filter={`url(#${haloId})`} />}
            </mask>
            <mask id={maskInk} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
              <rect x="0" y="0" width="1920" height="1080" fill="black" />
              {rInk > 0 && <circle cx={cx} cy={cy} r={rInk} fill="white" filter={`url(#${featherId})`} />}
              {dropR > 0.5 && <circle cx={cx} cy={cy} r={dropR} fill="white" />}
            </mask>
            <mask id={`${maskInk}c`} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
              <rect x="0" y="0" width="1920" height="1080" fill="black" />
              {rCore > 0 && <circle cx={cx} cy={cy} r={rCore} fill="white" filter={`url(#${featherId}c)`} />}
              {dropR > 0.5 && <circle cx={cx} cy={cy} r={dropR * 0.86} fill="white" />}
            </mask>
            <mask id={maskNew} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
              <rect x="0" y="0" width="1920" height="1080" fill="black" />
              {r > 0.5 && <circle cx={cx} cy={cy} r={r} fill="white" filter={`url(#${bleedId})`} />}
            </mask>
          </defs>
          {/* ① 湿晕 */}
          <rect x="0" y="0" width="1920" height="1080" fill="#5a4e3a" opacity={0.12} mask={`url(#${maskHalo})`} />
          {/* ② 墨边（含落点墨滴） */}
          <rect x="0" y="0" width="1920" height="1080" fill={INK} opacity={0.42} mask={`url(#${maskInk})`} />
          <rect x="0" y="0" width="1920" height="1080" fill={INK} opacity={0.86} mask={`url(#${maskInk}c)`} />
          {/* ③ 新景显影 */}
          <g mask={`url(#${maskNew})`}>
            <foreignObject x="0" y="0" width="1920" height="1080">
              <div style={{ width: 1920, height: 1080, transform: `scale(${develop})`, transformOrigin: `${cx}px ${cy}px` }}>
                <FakeDashboard variant="A" />
              </div>
            </foreignObject>
          </g>
        </svg>
      )}
    </div>
  );
};
