// 墨渗揭示（ink-bleed-reveal）——水墨转场（轨道遮罩法）。
// 旧景：G.bg 纸底 + 居中 TitleBlock "BEFORE"；新景 FakeDashboard(A) 放进
// SVG <foreignObject>，套 <mask>：中心偏左上 (800,420) 的白圆当轨道遮罩。
// 圆本身套 feTurbulence(baseFrequency 0.02, octaves 3, seed 7 固定) +
// feDisplacementMap（scale 60→160 随帧涨）造须状渗边——filter 只作用在
// mask 形状上，新景内容始终清晰。帧 0–20 hold 旧景；帧 20–98 半径
// 0→1450（Easing.out(quad)）再叠 ±8% 低频正弦扰动（帧 78–98 扰动衰减到 0，
// 洇满全屏）；帧 100–130 摘掉 mask 直接铺新景，真静止 30f。
import React, { useId } from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard, TitleBlock } from '../../_fixtures/Fixtures';

export const InkBleedReveal: React.FC = () => {
  const frame = useCurrentFrame();
  // 滤镜/mask ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bleedId = `inkBleed-${uid}`;
  const maskId = `inkMask-${uid}`;

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
  const wobbleEnv = interpolate(frame, [78, 98], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const r = Math.max(0, baseR * (1 + 0.08 * Math.sin(frame * 0.32) * wobbleEnv));

  // 渗边发散度：displacement scale 60 → 160（边缘越洇越散、指尖分叉越长）
  const dispScale = interpolate(frame, [20, 98], [60, 160], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 帧 100 起 mask 已全白：摘掉 SVG 直接铺新景，确保结尾像素级真静止
  const settled = frame >= 100;

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      {/* 旧景：纸底 + BEFORE 标题 */}
      <div style={{ position: 'absolute', inset: 0, background: G.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TitleBlock text="BEFORE" size={120} />
      </div>

      {settled ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          <FakeDashboard variant="A" />
        </div>
      ) : (
        <svg
          width={1920}
          height={1080}
          viewBox="0 0 1920 1080"
          style={{ position: 'absolute', inset: 0, display: 'block' }}
        >
          <defs>
            {/* filter 只挂在 mask 的圆上——揉的是遮罩边，不是画面内容 */}
            <filter id={bleedId} x="-40%" y="-40%" width="180%" height="180%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="7" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={dispScale} xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
              <rect x="0" y="0" width="1920" height="1080" fill="black" />
              {r > 0.5 && <circle cx={cx} cy={cy} r={r} fill="white" filter={`url(#${bleedId})`} />}
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            <foreignObject x="0" y="0" width="1920" height="1080">
              <FakeDashboard variant="A" />
            </foreignObject>
          </g>
        </svg>
      )}
    </div>
  );
};
