// 线条沸腾（line-boil）——手绘动画 line boil 质感：静止线稿在"沸腾段"
// 边缘逐帧微颤，像手绘逐帧描线的抖动。SVG filter feTurbulence(baseFrequency
// 0.015, numOctaves 2, seed = Math.floor(f/3) 每 3 帧阶梯换) + feDisplacementMap
// scale=8（原案 3–6 已按可感性加码）作用于大标题 "ALIVE" 与描边卡整层。
// 结构靠"对比"可感：先静止（干净版）→ 沸腾 → 摘罩回静止；判例：feTurbulence
// 收尾必须整个 filter 移除（沸腾段外根本不渲染 filter 与 SVG def），
// 105f 起逐帧完全相同，真静止 ≥35f。
// 关键帧：0–35 完全静止(boil off) → 35–105 沸腾(boil on, seed 每 3 帧一换)
// → 105 摘罩 → 105–140 真静止(boil off)。
import React, { useId } from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { G, TitleBlock } from '../../_fixtures/Fixtures';

const BOIL_START = 35;
const BOIL_END = 105;
const BOIL_SCALE = 8; // 原案 3–6 已按可感性加码；QA 看不出再加到 12

const CornerTag: React.FC<{ text: string; opacity: number }> = ({ text, opacity }) => (
  <div
    style={{
      position: 'absolute',
      right: 72,
      bottom: 56,
      padding: '10px 22px',
      border: `3px solid ${G.ink}`,
      borderRadius: 999,
      color: G.ink,
      background: G.bg,
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontWeight: 700,
      fontSize: 30,
      letterSpacing: 2,
      opacity,
    }}
  >
    {text}
  </div>
);

export const LineBoil: React.FC = () => {
  const f = useCurrentFrame();
  // 滤镜 ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const boilId = `boil-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const boiling = f >= BOIL_START && f < BOIL_END;
  // seed 每 3 帧阶梯换 → 8~10Hz 的手绘颤动感；帧确定，无随机源
  const seed = Math.floor(f / 3);

  // 角标：boil on 只在沸腾段淡入淡出；boil off 与之互补。
  // 全部过渡在 105f 前完成 → 105–140 逐帧完全相同
  const onOp = interpolate(f, [35, 40, 100, 105], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const offOp = 1 - onOp;

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      {/* 沸腾段才渲染 filter 定义——摘罩即整个 SVG def 消失，收尾天然真静止 */}
      {boiling && (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <filter id={boilId} x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency={0.015}
                numOctaves={2}
                seed={seed}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={BOIL_SCALE}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      )}

      {/* 手法名标签：不入滤镜层，作为静止参照物 */}
      <div style={{ position: 'absolute', left: 120, top: 96 }}>
        <TitleBlock text="LINE BOIL" size={54} />
      </div>

      {/* 被沸腾的整层：大标题 + 描边卡 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 56,
          filter: boiling ? `url(#${boilId})` : undefined,
        }}
      >
        <div
          style={{
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 800,
            fontSize: 170,
            color: G.ink,
            letterSpacing: 4,
            lineHeight: 1,
          }}
        >
          ALIVE
        </div>
        {/* 描边卡：透明底 3px ink 描边 520×300 圆角框 + 几条灰线 */}
        <div
          style={{
            width: 520,
            height: 300,
            border: `3px solid ${G.ink}`,
            borderRadius: 20,
            boxSizing: 'border-box',
            padding: '36px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: 26,
          }}
        >
          <div style={{ height: 16, width: '62%', background: G.mid, borderRadius: 8 }} />
          <div style={{ height: 12, width: '88%', background: G.bar, borderRadius: 6 }} />
          <div style={{ height: 12, width: '74%', background: G.bar, borderRadius: 6 }} />
          <div style={{ height: 12, width: '81%', background: G.bar, borderRadius: 6 }} />
          <div style={{ marginTop: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: 15, border: `3px solid ${G.ink}`, boxSizing: 'border-box' }} />
            <div style={{ height: 12, width: 120, background: G.mid, borderRadius: 6 }} />
          </div>
        </div>
      </div>

      {/* 状态角标：沸腾段 boil on，静止段 boil off */}
      <CornerTag text="boil on" opacity={onOp} />
      <CornerTag text="boil off" opacity={offOp} />
    </div>
  );
};
