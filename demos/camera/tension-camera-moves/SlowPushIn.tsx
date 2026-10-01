// 慢推压迫（slow-push-in）——studiobinder camera movements。
// 景 A（帧 0–120）：深色底 + 白色大数字 "10x"，scale 用 Easing.in(Easing.quad)
// 从 1.00 匀加速推到 1.14——前 2 秒几乎不可察，后段明显可感；同时四角径向
// 暗角 opacity 0→0.5 同步加深，构成压迫感的第二来源。
// 帧 120 无任何过渡硬切景 B：满屏亮色 FakeDashboard(A) 真静止 30f——
// 暗→亮的大反差让"切"这一拍才响。
//
// 改版要点：景 A 从平灰底改为带色相的深场（顶光 + 冷靛余光 + 颗粒）；
// 推近分三层视差——数字 1.00→1.14（本体曲线）、副标/刻度线略慢、背景光斑
// 只推 1.03，深度靠层间差读出；数字换系统字体 + 负字距 + 竖向金属渐变，
// "x" 降一档字重与亮度，副标小字放开字距。顶光随推近收窄（光圈收拢）。
import React from 'react';
import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { FONT, Grain, mix } from '../../_fixtures/Polish';

export const SLOW_PUSH_IN_DURATION = 150; // 120f 慢推 + 30f 亮景静止

const CUT = 120; // 硬切帧

export const SlowPushIn: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- 景 B：帧 120 起，满屏亮面板，完全静止 ----
  if (frame >= CUT) {
    return <FakeDashboard variant="A" />;
  }

  // ---- 景 A：0–120f 慢推 ----
  // 匀加速推近：Easing.in(quad)——前段几乎不可察，后段可感
  const k = interpolate(frame, [0, CUT], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = mix(1.0, 1.14, k); // 主体（数字）
  const scaleSub = mix(1.0, 1.11, k); // 副标层略慢：前后景分离
  const scaleBg = mix(1.0, 1.03, k); // 背景光斑几乎不动：远景
  // 暗角同步加深：压迫感的第二来源
  const vignette = mix(0, 0.5, k);
  // 顶光随推近收窄、略压暗：光圈收拢的积压感
  const lightW = mix(62, 46, k);
  const lightA = mix(0.22, 0.16, k);

  return (
    <AbsoluteFill style={{ background: '#0b0c11', overflow: 'hidden', fontFamily: FONT.sans }}>
      {/* 背景：深色纵向渐变 + 顶光 + 一抹冷靛余光（远景，只推 1.03） */}
      <AbsoluteFill style={{ transform: `scale(${scaleBg})` }}>
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, #14161d 0%, #0d0e13 55%, #09090d 100%)' }} />
        <AbsoluteFill
          style={{
            background:
              `radial-gradient(ellipse ${lightW}% 70% at 50% 30%, rgba(170,178,220,${lightA}) 0%, rgba(170,178,220,0) 70%), ` +
              'radial-gradient(ellipse 50% 40% at 50% 82%, rgba(91,99,211,0.10) 0%, rgba(91,99,211,0) 75%)',
          }}
        />
      </AbsoluteFill>

      {/* 主体：大数字（推 1.14，本卡的推近曲线本体） */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${scale})`,
          transformOrigin: '50% 50%',
        }}
      >
        <div
          style={{
            marginTop: -96,
            fontSize: 340,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.055em',
            fontVariantNumeric: 'tabular-nums',
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          <span
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f1f2f6 52%, #b9bccb 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              // 负字距会让末字形溢出 span 盒，background-clip 会把它切掉：右侧补内边距再用负外边距抵消
              paddingRight: '0.08em',
              marginRight: '-0.08em',
              filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.45))',
            }}
          >
            10
          </span>
          <span style={{ fontSize: '0.72em', fontWeight: 300, color: 'rgba(214,218,236,0.6)', marginLeft: '0.05em' }}>x</span>
        </div>
      </AbsoluteFill>

      {/* 副标层：刻度线 + 小字（推 1.11，比数字慢一档） */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${scaleSub})`,
          transformOrigin: '50% 50%',
        }}
      >
        <div style={{ marginTop: 300, display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ width: 64, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.35))' }} />
          <div
            style={{
              fontSize: 38,
              fontWeight: 500,
              letterSpacing: '0.22em',
              color: 'rgba(226,229,240,0.66)',
              whiteSpace: 'nowrap',
            }}
          >
            FASTER THAN BASELINE
          </div>
          <div style={{ width: 64, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.35), rgba(255,255,255,0))' }} />
        </div>
      </AbsoluteFill>

      {/* 暗角层：四角径向渐变，随推近同步加深（带色相的深色，不用纯黑） */}
      <AbsoluteFill
        style={{
          opacity: vignette,
          background: 'radial-gradient(ellipse 62% 55% at 50% 50%, rgba(4,5,9,0) 45%, rgba(4,5,9,0.96) 100%)',
          pointerEvents: 'none',
        }}
      />
      <Grain opacity={0.09} blend="soft-light" />
    </AbsoluteFill>
  );
};
