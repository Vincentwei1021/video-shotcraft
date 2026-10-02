// 文字视频遮罩（text-as-mask）——kinetische typografie
// 深底上超粗大字 "SCALE"，字形内部用 CSS alpha mask 套住 FakeDashboard：
// 0–20f hold 读布景（字 12f 浮现）；20–100f dashboard 在字内平稳 translateX +110→-110（scale 1.4）；
// 100–130f 单段 bezier：mask 层 scale 1→26 放大溢出（内容层用 1/S 反向抵消不畸变），
// 同时无遮罩全屏层淡入接管，dashboard 1.4→1.0 归位；130–150f 全屏静止收尾。
//
// 质感修订：
// - 字内 dashboard 放大到 1.4（原 1.15），笔画里能看到大块图表/数字而不是一片白卡；
//   叠一层随接管淡出的靛紫 multiply 色调，字在暗场上有颜色身份，不再像普通白字
// - 字形加一圈 1.5px 内发丝高光（同一 SVG 字形描边、随遮罩一起放大、接管前淡出）= 玻璃窗口的边
// - 放大走对数插值（scale = 26^e）：每帧放大比例恒定，视觉上匀速"冲进去"，不是先慢后猛地一胀
// - 接管层改在 e≈0.62–0.9 才淡入（此时 L 竖笔已撑满大半画面），去掉原版中段的半透明灰纱
// - 漂移起止加缓（不从静止瞬间跳到匀速，末端自然接上放大）；暗场换成带色相的柔光深底 + 颗粒
// - 调试占位 "TEXT AS MASK" 换成正式副题
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { Backdrop, bezier, EASE, FONT, Grain, ramp } from '../../_fixtures/Polish';

export const TEXT_AS_MASK_DURATION = 150; // hold 20f + 漂移 80f + 放大接管 30f + 静止 20f

const TEXT_ATTRS = `x="960" y="666" font-family="Helvetica, Arial, sans-serif" font-size="360" font-weight="900" letter-spacing="-8" text-anchor="middle"`;
const MASK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><text ${TEXT_ATTRS} fill="white">SCALE</text></svg>`;
const MASK_URL = `url("data:image/svg+xml,${encodeURIComponent(MASK_SVG)}")`;
// mask 放大原点：取字母 L 的竖笔位置（约 61.5% 处），保证放大时原点落在实心笔画内
const ORIGIN = '61.5% 50%';
const MAX_S = 26;
const DASH_S0 = 1.4; // 字内 dashboard 放大量

export const TextAsMask: React.FC = () => {
  const f = useCurrentFrame();
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

  // 字形浮现：12f 淡入 + 0.97→1
  const intro = ramp(f, 0, 14, EASE.out);

  // 结尾撤场进度：100–130f 单段 bezier
  const endT = interpolate(f, [100, 130], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  // dashboard 内容运动：20–100f 平稳漂移（两端轻缓，中段近匀速），100–130f 归位到全屏
  const drift = ramp(f, 20, 80, bezier(0.3, 0, 0.7, 1));
  const driftX = 110 - 220 * drift;
  const dx = f < 100 ? driftX : interpolate(endT, [0, 1], [-110, 0]);
  const dashS = interpolate(endT, [0, 1], [DASH_S0, 1]);

  // mask 层放大（对数插值：每帧放大比例恒定）；内容层反向抵消，dashboard 不跟着几何畸变
  const maskS = Math.pow(MAX_S, endT) * (0.97 + 0.03 * intro);
  // 无遮罩全屏层：L 竖笔撑满大半画面后才淡入补齐字缝
  const cover = interpolate(endT, [0.62, 0.9], [0, 1], clamp);
  // 字内色调与字边高光：接管前退掉
  const tint = 1 - interpolate(endT, [0, 0.6], [0, 1], clamp);
  const rim = 1 - interpolate(endT, [0, 0.3], [0, 1], clamp);
  // 底部副题：浮现于字之后，撤场时淡出
  const captionIn = ramp(f, 8, 16, EASE.out);
  const caption = captionIn * (1 - interpolate(f, [100, 112], [0, 1], { ...clamp, easing: EASE.exit }));

  const dashMotion: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `translateX(${dx}px) scale(${dashS})`,
    transformOrigin: '50% 50%',
  };

  return (
    <AbsoluteFill style={{ background: '#0d0e13', overflow: 'hidden' }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.4 }} accent="#5b63d3" grain={0} vignette={0.55} />
      {/* 字后极淡的强调色地光，让"窗口"浮在暗场上 */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 46% 30% at 50% 50%, rgba(91,99,211,0.16) 0%, rgba(91,99,211,0) 70%)',
          opacity: intro * tint,
        }}
      />
      {/* 遮罩层：wrapper 负责 mask + 放大；inner 用 1/S 反向缩放抵消内容形变 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: intro,
          transform: `scale(${maskS})`,
          transformOrigin: ORIGIN,
          WebkitMaskImage: MASK_URL,
          maskImage: MASK_URL,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskSize: '1920px 1080px',
          maskSize: '1920px 1080px',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 / maskS})`, transformOrigin: ORIGIN }}>
          <div style={dashMotion}>
            <FakeDashboard variant="A" />
          </div>
          {/* 字内色调：靛→紫的 multiply 渐变，字在暗场上有颜色身份 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              mixBlendMode: 'multiply',
              opacity: tint,
              background: 'linear-gradient(115deg, rgba(120,128,235,0.55) 0%, rgba(178,150,240,0.32) 52%, rgba(120,128,235,0.5) 100%)',
            }}
          />
        </div>
        {/* 字边内发丝高光（同字形描边；外半被 mask 裁掉，只留内侧一圈） */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: rim }}>
          <text
            x={960}
            y={666}
            fontFamily="Helvetica, Arial, sans-serif"
            fontSize={360}
            fontWeight={900}
            letterSpacing={-8}
            textAnchor="middle"
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth={3}
          >
            SCALE
          </text>
        </svg>
      </div>

      {/* 接管层：同一运动变换的全屏 dashboard，撤场后段淡入到 1 */}
      {cover > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: cover }}>
          <div style={dashMotion}>
            <FakeDashboard variant="A" />
          </div>
        </div>
      )}

      {/* 底部副题 */}
      <div
        style={{
          position: 'absolute',
          bottom: 150,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: 34,
          letterSpacing: '0.22em',
          color: 'rgba(220,224,240,0.7)',
          opacity: caption,
          transform: `translateY(${(1 - captionIn) * 10}px)`,
        }}
      >
        ONE WORKSPACE FOR EVERY TEAM
      </div>
      {/* 颗粒只给暗场段（接管后是干净的亮场 UI） */}
      <Grain opacity={0.07 * (1 - cover)} blend="soft-light" />
    </AbsoluteFill>
  );
};
