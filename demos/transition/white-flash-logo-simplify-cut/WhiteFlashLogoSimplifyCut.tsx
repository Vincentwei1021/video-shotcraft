// white-flash-logo-simplify-cut — White Flash Simplify 冲白降维切换
// （motion-lab 定稿转原生 Remotion）
// 彩色液态质感词标（占位字标）静置后画面 0.2s 冲白（冲白瞬间叠一帧轻微
// blur 做过曝感），紧接扁平渐变版字标从白底淡入 + scale 0.96→1 定格。
// 一次闪白完成"液态质感→扁平字标"的降维切换。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const WHITE_FLASH_LOGO_SIMPLIFY_CUT_DURATION = 108; // 3600ms @30fps

// 该效果依赖的文件级共享量（扁平字标渐变三色 + 占位词标）
const GRAD_A = '#7b3df0';
const GRAD_B = '#5a6cf5';
const GRAD_C = '#22c4e8';
const WORDMARK = 'BRAND';

export const WhiteFlashLogoSimplifyCut: React.FC = () => {
  const t = useT();
  // 液态层：静置期缓慢流动的渐变 + 高光微移
  const flow = t * 100;
  // 冲白瞬间给彩色层一帧过曝 blur
  const flashK = seg(t, 0.34, 0.42, E.inQuad);
  const blurPulse = Math.sin(seg(t, 0.34, 0.46) * Math.PI);
  // 扁平 logo：opacity 0→1 + scale 0.96→1，cubic ease-out
  const lk = seg(t, 0.48, 0.74, E.outCubic);
  return (
    <DesignStage bg="#08070c">
      <div style={{ position: 'absolute', inset: 0, background: '#08070c', overflow: 'hidden' }}>
        {/* 彩色液态词层 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: `900 62px/1 -apple-system,'Helvetica Neue',sans-serif`,
            letterSpacing: 6,
            background: 'linear-gradient(105deg,#ff5fa2 0%,#ff9d4d 22%,#ffe45c 38%,#4de3c1 58%,#4d9bff 76%,#a05cff 100%)',
            backgroundSize: '320% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: 'none',
            backgroundPosition: `${flow}% 0`,
            filter: `blur(${blurPulse * 5}px) brightness(${1 + blurPulse * 1.2})`,
          }}
        >
          {WORDMARK}
        </div>
        {/* 液态高光扫层（贴在字上方的柔光条） */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 220,
            height: 120,
            margin: '-60px 0 0 -110px',
            background: 'radial-gradient(closest-side,rgba(255,255,255,.28),transparent 70%)',
            filter: 'blur(6px)',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
            transform: `translateX(${lerp(t, -30, 30)}px)`,
            opacity: 1 - flashK,
          }}
        />
        {/* 白色全屏层：easeIn 冲入后保持 */}
        <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flashK }} />
        {/* 扁平渐变字标层（渐变色见顶部 GRAD_*） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: lk,
            transform: `scale(${lerp(lk, 0.96, 1)})`,
          }}
        >
          <div
            style={{
              font: `800 58px/1 -apple-system,'Helvetica Neue',sans-serif`,
              letterSpacing: 8,
              background: `linear-gradient(92deg,${GRAD_A} 0%,${GRAD_B} 45%,${GRAD_C} 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {WORDMARK}
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
