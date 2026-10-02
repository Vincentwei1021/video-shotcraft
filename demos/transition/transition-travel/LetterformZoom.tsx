import React, { useId } from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';
import { EASE, FONT, Grain, ramp, tracking } from '../../_fixtures/Polish';

// letterform-zoom〔转场〕：巨型标题 "DASH" 字形洞透出新页面，镜头急速推进
// 字母 A 的横梁洞，洞被撑满全屏的瞬间新页面接管，残余笔画滑出画外。
// 结构：底层 FakeDashboard B 静置全屏（微 dolly）；上层"米灰盖板"用
// SVG <mask>（白底 + 黑字）在字形处挖洞——洞里即透出 B；对盖板整组做
// transform-origin 对准 A 横梁洞中心的指数 scale 1→28（60f，前 20f 慢
// 后 40f 陡）。scale 过临界值后盖板快速退场 = 撤掉 mask，B 全屏接管。
//
// 质感升级：
// - 盖板从平涂米灰改为暗场章节字卡（径向渐变 #1d1e25→#0a0b0e，自带暗角），
//   字形洞里透出的亮页面成了画面里最亮的东西——"洞里有东西"一眼可读；
// - 盖板带一层随 scale 补偿的 drop-shadow：板子的影子落进字洞、压在页面上，
//   读作"厚盖板悬在页面之上"，穿洞时有真实的纵深；字缘一圈 2px 冷白受光边（同样按 scale 补偿线宽）；
// - 副标灰条换成真正的章节副标（32px 大写字距 eyebrow + 强调色圆点），随盖板一起被甩出画外；
// - 推进前 12–25f 先微微后吸 1.5%（预备），再进入原指数推进；全片叠极弱颗粒。
export const LETTERFORM_ZOOM_DURATION = 140; // 0–25 hold · 25–85 推进 · 85–110 落定 · 110–140 静止

const FS = 560; // 标题字号
// 推进锚点 = A 横梁（字形笔画 = 洞）中心，按渲染帧实测：横梁 y 586–652、
// 该高度 A 占 x 629–928 → (778, 619)。旧版锚在三角字腔（腔内是盖板不是洞），
// 推到底撑满画面的是一块盖板三角、再淡掉，读不出"穿洞"；横梁高 66px×28≈1850 > 1080，
// 推到底真正是洞撑满全屏。换字体/换词后须重新实测。
const ORIGIN = { x: 778, y: 619 };
const BASELINE = 741;
const ZOOM_MAX = 28;

const titleFont: React.CSSProperties = {
  fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
  fontWeight: 900,
  fontSize: FS,
};

export const LetterformZoom: React.FC = () => {
  const frame = useCurrentFrame();
  // mask ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const cutId = `lfz-cut-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // 0–25f 建立 hold；25–85f 推进。慢起 bezier 叠指数尺度 = 前段慢、后段陡
  const t = interpolate(frame, [25, 85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.6, 0, 0.85, 0.5),
  });
  // 预备：12–25f 后吸 1.5%，25–31f 释放（叠在指数推进上，推进开始后迅速归零）
  const inhale = ramp(frame, 12, 13, EASE.smooth) * (1 - ramp(frame, 25, 6, EASE.out));
  const scale = Math.pow(ZOOM_MAX, t) * (1 - 0.015 * inhale); // 指数推进：等比的"穿越"速度感

  // scale 过临界值（洞已撑满画面中部）→ 盖板残余笔画边外飞边撤场（撤 mask）
  const plateOpacity = interpolate(scale, [15, 24], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 速度模糊：期望视觉模糊量随推进升高；CSS filter 会被 transform 放大，
  // 故除以 scale 补偿
  const visBlur = interpolate(t, [0, 0.45, 1], [0, 1.5, 16], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blurCss = visBlur / scale;

  // 新页面微 dolly：推进期跟着轻推 1→1.1，接管后 25f 内落定回 1（收势）
  const bScale =
    frame < 85
      ? interpolate(t, [0, 1], [1, 1.1])
      : interpolate(frame, [85, 110], [1.1, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      {/* 新页面：先只在字形洞里透出，接管后全屏（110–140f 静止收尾） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${bScale})`,
          transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`,
        }}
      >
        <FakeDashboard variant="B" />
      </div>

      {/* 米灰盖板（字形挖洞）+ 字缘描边 + 副标灰条：整组指数推进后飞出画外 */}
      {plateOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`,
            opacity: plateOpacity,
            filter: `drop-shadow(0 ${(10 / scale).toFixed(3)}px ${(22 / scale).toFixed(3)}px rgba(4,5,8,0.6))${
              blurCss > 0.02 ? ` blur(${blurCss.toFixed(3)}px)` : ''
            }`,
          }}
        >
          <svg
            width={1920}
            height={1080}
            viewBox="0 0 1920 1080"
            style={{ position: 'absolute', inset: 0, display: 'block' }}
          >
            <defs>
              <radialGradient id={`${cutId}-g`} cx="50%" cy="44%" r="75%">
                <stop offset="0%" stopColor="#1d1e25" />
                <stop offset="55%" stopColor="#121318" />
                <stop offset="100%" stopColor="#0a0b0e" />
              </radialGradient>
              <mask id={cutId}>
                <rect width={1920} height={1080} fill="#fff" />
                <text
                  x={960}
                  y={BASELINE}
                  textAnchor="middle"
                  fill="#000"
                  style={titleFont}
                >
                  DASH
                </text>
              </mask>
            </defs>
            <rect width={1920} height={1080} fill={`url(#${cutId}-g)`} mask={`url(#${cutId})`} />
            {/* 字缘受光边：冷白细线勾出盖板厚度的切口（线宽按 scale 补偿，推进中不变粗） */}
            <text
              x={960}
              y={BASELINE}
              textAnchor="middle"
              fill="none"
              stroke="#e8ebff"
              strokeWidth={2 / scale}
              opacity={0.28}
              style={titleFont}
            >
              DASH
            </text>
          </svg>
          {/* 章节副标：随盖板一起被甩出画外，强化"页面元素残余"感 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 806,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 18,
              fontFamily: FONT.sans,
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: tracking(32, true),
              textTransform: 'uppercase',
              color: 'rgba(236,238,248,0.62)',
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 6, background: G.accent, boxShadow: `0 0 16px ${G.accent}` }} />
            <span>Chapter 02</span>
            <span style={{ color: 'rgba(236,238,248,0.28)' }}>/</span>
            <span style={{ color: 'rgba(236,238,248,0.9)' }}>Live dashboards</span>
          </div>
        </div>
      )}
      <Grain opacity={0.05} step={2} />
    </AbsoluteFill>
  );
};
