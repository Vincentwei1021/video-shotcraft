// white-flash-logo-simplify-cut — White Flash Simplify 冲白降维切换
// （motion-lab 定稿转原生 Remotion）
// 彩色液态质感词标（占位字标）静置后画面 0.2s 冲白（冲白瞬间叠一帧轻微
// blur 做过曝感），紧接扁平渐变版字标从白底淡入 + scale 0.96→1 定格。
// 一次闪白完成"液态质感→扁平字标"的降维切换。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
//
// 质感升级：
// - 柔光扫掠层原是一块盖在字上方的径向光斑，光晕溢出字形、在黑底上糊成一团白雾（Q4 光溢出）；
//   改为用 background-clip:text 裁进字形内部的高光带（与液态渐变同层叠加），只亮在字面上；
// - 液态字下垫一层同色渐变的柔和 bloom（模糊副本 0.38），字像在发光而不是贴在黑上；
//   静置期字标随流光极缓推近 1→1.025，冲白脉冲时再前冲一点，"被光吞掉"更主动；
// - 暗场改为带色相的深色渐变 + 字后一抹冷紫余光 + 颗粒，不再是平涂 #08070c；
// - 白层仍"冲入后保持"，但峰值纯白之后 0.42–0.56 曝光回落到暖白纸面（#fbfbf9→#f1f1ee 渐变 + 轻暗角 + 颗粒），
//   大面积不再是死白，冲白的"过曝"与定妆的"纸面"有了区分；
// - 扁平字标入场加 1.2px→0 的对焦模糊与字距 9.5→8 收拢，落定更"咔"；DesignStage 改用 zoom 栅格化，字缘锐利。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Grain, Vignette } from '../../_fixtures/Polish';

export const WHITE_FLASH_LOGO_SIMPLIFY_CUT_DURATION = 108; // 3600ms @30fps

// 该效果依赖的文件级共享量（扁平字标渐变三色 + 占位词标）
const GRAD_A = '#7b3df0';
const GRAD_B = '#5a6cf5';
const GRAD_C = '#22c4e8';
const WORDMARK = 'BRAND';

const LIQUID = 'linear-gradient(105deg,#ff5fa2 0%,#ff9d4d 22%,#ffe45c 38%,#4de3c1 58%,#4d9bff 76%,#a05cff 100%)';
const LIQUID_FONT = `900 62px/1 -apple-system,'SF Pro Display','Helvetica Neue',sans-serif`;

const centered: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const WhiteFlashLogoSimplifyCut: React.FC = () => {
  const t = useT();
  // 液态层：静置期缓慢流动的渐变 + 高光微移
  const flow = t * 100;
  // 冲白瞬间给彩色层一帧过曝 blur
  const flashK = seg(t, 0.34, 0.42, E.inQuad);
  const blurPulse = Math.sin(seg(t, 0.34, 0.46) * Math.PI);
  // 扁平 logo：opacity 0→1 + scale 0.96→1，cubic ease-out
  const lk = seg(t, 0.48, 0.74, E.outCubic);
  // 峰值纯白 → 曝光回落到暖白纸面
  const paperK = seg(t, 0.42, 0.56, E.inOutCubic);
  // 静置期极缓推近 + 冲白脉冲前冲
  const liquidScale = 1 + 0.025 * seg(t, 0, 0.34, E.inOutQuad) + 0.03 * blurPulse;
  // 字内高光带：随 t 自左向右扫过字面（裁进字形，只亮在字上）
  const sheenX = lerp(t / 0.34, -40, 130);
  const sheen = `linear-gradient(100deg, rgba(255,255,255,0) ${sheenX - 18}%, rgba(255,255,255,0.55) ${sheenX}%, rgba(255,255,255,0) ${sheenX + 18}%)`;
  const liquidFilter = `blur(${(blurPulse * 5).toFixed(2)}px) brightness(${(1 + blurPulse * 1.2).toFixed(3)})`;

  return (
    <AbsoluteFill style={{ background: '#0a0a10' }}>
      {/* 暗场：带色相的深色渐变 + 字后冷紫余光 */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 46% 40% at 50% 50%, rgba(120,92,220,0.20) 0%, rgba(120,92,220,0) 70%), ' +
            'linear-gradient(180deg, #121119 0%, #0b0b11 60%, #07070b 100%)',
        }}
      />
      <Vignette strength={0.55} inner={0.4} color="#000000" />
      <DesignStage bg="transparent" raster="zoom">
        {/* 液态字 bloom：同色渐变的模糊副本，字像在发光 */}
        <div
          style={{
            ...centered,
            transform: `scale(${liquidScale.toFixed(4)})`,
            opacity: 0.38 * (1 - flashK),
          }}
        >
          <div
            style={{
              font: LIQUID_FONT,
              letterSpacing: 6,
              background: LIQUID,
              backgroundSize: '320% 100%',
              backgroundPosition: `${flow}% 0`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'blur(9px)',
            }}
          >
            {WORDMARK}
          </div>
        </div>
        {/* 彩色液态词层：液态渐变 + 裁进字形的高光带（两层背景同被 clip 到字形） */}
        <div style={{ ...centered, transform: `scale(${liquidScale.toFixed(4)})` }}>
          <div
            style={{
              font: LIQUID_FONT,
              letterSpacing: 6,
              backgroundImage: `${sheen}, ${LIQUID}`,
              backgroundSize: '100% 100%, 320% 100%',
              backgroundPosition: `0 0, ${flow}% 0`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: liquidFilter,
            }}
          >
            {WORDMARK}
          </div>
        </div>
      </DesignStage>

      {/* 白色全屏层：easeIn 冲入后保持；峰值纯白，随后曝光回落成暖白纸面 */}
      <AbsoluteFill style={{ background: '#ffffff', opacity: flashK }} />
      {paperK > 0 && (
        <AbsoluteFill style={{ opacity: paperK }}>
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, #fbfbf9 0%, #f5f5f2 55%, #efefeb 100%)' }} />
          <Vignette strength={0.08} inner={0.55} color="#2a2c36" />
          <Grain opacity={0.035} step={2} />
        </AbsoluteFill>
      )}

      {/* 扁平渐变字标层（渐变色见顶部 GRAD_*） */}
      <DesignStage bg="transparent" raster="zoom">
        <div
          style={{
            ...centered,
            flexDirection: 'column',
            opacity: lk,
            transform: `scale(${lerp(lk, 0.96, 1).toFixed(4)})`,
          }}
        >
          <div
            style={{
              font: `800 58px/1 -apple-system,'SF Pro Display','Helvetica Neue',sans-serif`,
              letterSpacing: lerp(lk, 9.5, 8),
              background: `linear-gradient(92deg,${GRAD_A} 0%,${GRAD_B} 45%,${GRAD_C} 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: lk < 1 ? `blur(${((1 - lk) * 0.3).toFixed(3)}px)` : undefined,
            }}
          >
            {WORDMARK}
          </div>
        </div>
      </DesignStage>
      {/* 暗场颗粒（冲白后被白层盖住） */}
      {flashK < 1 && <Grain opacity={0.08 * (1 - flashK)} step={2} blend="soft-light" />}
    </AbsoluteFill>
  );
};
