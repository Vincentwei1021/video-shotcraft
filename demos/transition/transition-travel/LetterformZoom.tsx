import React, { useId } from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';

// letterform-zoom〔转场〕：巨型标题 "DASH" 字腔透出新页面，镜头急速推进
// 字母 A 的三角字腔，洞被撑满全屏的瞬间新页面接管，残余笔画滑出画外。
// 结构：底层 FakeDashboard B 静置全屏（微 dolly）；上层"米灰盖板"用
// SVG <mask>（白底 + 黑字）在字形处挖洞——洞里即透出 B；对盖板整组做
// transform-origin 对准 A 字腔中心的指数 scale 1→28（60f，前 20f 慢
// 后 40f 陡）。scale 过临界值后盖板快速退场 = 撤掉 mask，B 全屏接管。

const FS = 560; // 标题字号
// A 字腔（三角洞）中心：Helvetica Bold 度量估算——
// "DASH" 总宽 ≈ 2.833em，居中起点 x≈167，A 占 571–975 → 腔心 x≈773；
// 基线 y=741（大写居中），腔心约在基线上方 0.42em → y≈508。
const ORIGIN = { x: 773, y: 508 };
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
  const scale = Math.pow(ZOOM_MAX, t); // 指数推进：等比的"穿越"速度感

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
      {/* 新页面：先只在字腔里透出，接管后全屏（110–140f 静止收尾） */}
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
            filter: blurCss > 0.02 ? `blur(${blurCss}px)` : undefined,
          }}
        >
          <svg
            width={1920}
            height={1080}
            viewBox="0 0 1920 1080"
            style={{ position: 'absolute', inset: 0, display: 'block' }}
          >
            <defs>
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
            <rect width={1920} height={1080} fill={G.bg} mask={`url(#${cutId})`} />
            {/* 字缘细描边：让"洞"的轮廓在米灰上读得清 */}
            <text
              x={960}
              y={BASELINE}
              textAnchor="middle"
              fill="none"
              stroke={G.ink}
              strokeWidth={3}
              opacity={0.3}
              style={titleFont}
            >
              DASH
            </text>
          </svg>
          {/* 副标灰条：随盖板一起被甩出画外，强化"页面元素残余"感 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 812,
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <div style={{ width: 240, height: 16, background: G.bar, borderRadius: 8 }} />
            <div style={{ width: 130, height: 16, background: G.line, borderRadius: 8 }} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
