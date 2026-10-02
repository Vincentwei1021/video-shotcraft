// 线条沸腾（line-boil）——手绘动画 line boil 质感：静止线稿在"沸腾段"
// 边缘逐帧微颤，像手绘逐帧描线的抖动。SVG filter feTurbulence(baseFrequency
// 0.015, numOctaves 2, seed = Math.floor(f/3) 每 3 帧阶梯换) + feDisplacementMap
// scale=8（原案 3–6 已按可感性加码）作用于大标题与手绘分镜卡整层。
// 结构靠"对比"可感：先静止（干净版）→ 沸腾 → 摘罩回静止；判例：feTurbulence
// 收尾必须整个 filter 移除（沸腾段外根本不渲染 filter 与 SVG def），
// 105f 起逐帧完全相同，真静止 ≥35f。
// 关键帧：0–35 完全静止(boil off) → 35–105 沸腾(boil on, seed 每 3 帧一换)
// → 105 摘罩 → 105–140 真静止(boil off)。
// 宿主：纸墨字卡（暖纸底 + 静态纸纤维），被沸腾的是墨线——标题 + 一张手绘分镜卡（描边/线稿/圈注/箭头）。
import React, { useId } from 'react';
import { useCurrentFrame } from 'remotion';
import { FONT, Grain, Vignette, ramp, tracking } from '../../_fixtures/Polish';

export const LINE_BOIL_DURATION = 140;

const BOIL_START = 35;
const BOIL_END = 105;
const BOIL_SCALE = 8; // 原案 3–6 已按可感性加码；QA 看不出再加到 12

const PAPER = '#f2eee6';
const INK = '#1e1d1b'; // 墨色：带一点暖调的近黑
const INK2 = 'rgba(30,29,27,0.55)';
const RED = '#c8462f'; // 批注朱红（唯一辅助色，只给圈注）

// 手绘分镜卡：全是墨线（描边元素才适合沸腾，实心小元素沸腾读作模糊）
const SketchCard: React.FC = () => (
  <svg width={640} height={330} viewBox="0 0 640 330" style={{ overflow: 'visible' }}>
    <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
      {/* 外框：略不规则的圆角框（手绘起笔处多出一小段） */}
      <path d="M26 14 H612 Q626 14 626 28 V302 Q626 316 612 316 H28 Q14 316 14 302 V30 Q14 16 30 13 L44 12" strokeWidth={3} />
      {/* 左栏：三行手写线稿（轻微弧度） */}
      <path d="M52 118 Q150 114 262 117" strokeWidth={3.5} />
      <path d="M52 152 Q130 149 214 151" strokeWidth={3.5} stroke={INK2} />
      <path d="M52 186 Q140 183 240 186" strokeWidth={3.5} stroke={INK2} />
      {/* 右栏：分镜小画框（取景框 + 对角线 + 人物剪影线） */}
      <rect x={340} y={58} width={238} height={150} rx={6} strokeWidth={3} />
      <path d="M340 58 L578 208 M578 58 L340 208" strokeWidth={1.6} stroke={INK2} />
      <path d="M430 208 Q432 168 459 160 Q486 168 488 208" strokeWidth={2.6} />
      <circle cx={459} cy={140} r={16} strokeWidth={2.6} />
      {/* 箭头：从文字指向画框 */}
      <path d="M268 160 Q300 150 326 132" strokeWidth={2.6} />
      <path d="M314 128 L327 131 L322 144" strokeWidth={2.6} />
      {/* 朱红圈注：绕第一行手写的不闭合椭圆 */}
      <path d="M40 120 Q42 90 156 92 Q276 94 278 118 Q276 142 150 142 Q60 140 48 112" strokeWidth={2.6} stroke={RED} />
      {/* 底栏：分隔线 + 签名圈 + 页码线 */}
      <path d="M52 250 H588" strokeWidth={1.6} stroke={INK2} />
      <circle cx={66} cy={281} r={13} strokeWidth={2.6} />
      <path d="M92 281 Q130 279 176 281" strokeWidth={3} stroke={INK2} />
      <path d="M540 281 H588" strokeWidth={3} />
    </g>
    <text x={52} y={70} fill={INK} style={{ fontFamily: FONT.sans, fontSize: 28, fontWeight: 650, letterSpacing: tracking(28) }}>
      Shot 04 · Title card
    </text>
  </svg>
);

// 状态标：极小的墨点 + 文字，静音预览时说明当前是哪一段（不入滤镜层，作为静止参照物）
const StateTag: React.FC<{ text: string; live: boolean; opacity: number }> = ({ text, live, opacity }) => (
  <div
    style={{
      position: 'absolute', right: 96, bottom: 76, display: 'flex', alignItems: 'center', gap: 12, opacity,
      fontFamily: FONT.mono, fontSize: 24, letterSpacing: '0.04em', color: 'rgba(30,29,27,0.62)',
    }}
  >
    <div
      style={{
        width: 12, height: 12, borderRadius: 6, boxSizing: 'border-box',
        background: live ? RED : 'transparent', border: live ? 'none' : `1.5px solid rgba(30,29,27,0.5)`,
      }}
    />
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

  // 状态标：boiling 只在沸腾段淡入淡出；still 与之互补。
  // 全部过渡在 105f 前完成 → 105–140 逐帧完全相同
  const onOp = ramp(f, 35, 5, (t) => t) * (1 - ramp(f, 100, 5, (t) => t));
  const offOp = 1 - onOp;

  return (
    <div style={{ width: 1920, height: 1080, background: PAPER, position: 'relative', overflow: 'hidden' }}>
      {/* 纸面：中心略亮的暖色渐变 + 静态纸纤维（大尺度颗粒）+ 极轻暗角，全部不随帧变化 */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 70% at 46% 42%, #f7f4ed 0%, #f2eee6 55%, #e9e4d9 100%)',
        }}
      />
      <Grain opacity={0.09} step={100000} scale={2.2} freq={0.55} blend="multiply" />
      <Vignette strength={0.12} inner={0.55} color="#5a4a32" />

      {/* 沸腾段才渲染 filter 定义——摘罩即整个 SVG def 消失，收尾天然真静止 */}
      {boiling && (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <filter id={boilId} x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence type="fractalNoise" baseFrequency={0.015} numOctaves={2} seed={seed} result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={BOIL_SCALE} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
      )}

      {/* 眉题：不入滤镜层，作为静止参照物 */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center',
          fontFamily: FONT.sans, fontSize: 30, fontWeight: 600, letterSpacing: tracking(30, true),
          color: 'rgba(30,29,27,0.5)', textTransform: 'uppercase',
        }}
      >
        Chapter two
      </div>

      {/* 被沸腾的整层：大标题 + 手绘分镜卡 */}
      <div
        style={{
          position: 'absolute', inset: 0, paddingTop: 60,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 54,
          filter: boiling ? `url(#${boilId})` : undefined,
        }}
      >
        <div
          style={{
            fontFamily: FONT.sans, fontWeight: 800, fontSize: 190, color: INK,
            letterSpacing: tracking(190), lineHeight: 0.92,
          }}
        >
          Still alive.
        </div>
        <SketchCard />
      </div>

      <StateTag text="boiling" live opacity={onOp} />
      <StateTag text="still" live={false} opacity={offOp} />
    </div>
  );
};
