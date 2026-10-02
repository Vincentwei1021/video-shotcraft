// research-card-stack-scroll — Research Stack 论文卡叠压滚流（motion-lab 定稿转原生 Remotion）
// 深色论文卡沿微微向右下的轴线连续飞入并叠压在中心：入场是 translateY(-40)+scale 0.94→1
// 的 6 帧短促 spring，落位带 1 帧压缩；只有最上一张全清晰渲染标题+作者+摘要，
// 下方卡按 depth 递增 blur/变暗只露顶部标题条，背景浅灰横向 grid 同步移动做速度参照。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const RESEARCH_CARD_STACK_SCROLL_DURATION = 144; // 4800ms @30fps

const ORANGE = '#FF6A1F';
const ORANGE_SOFT = '#FF8A44';
const INK = '#1A1A1A';
const FONT = '-apple-system,system-ui,"SF Pro Text","PingFang SC",sans-serif';

// 原 setup 里的 stage.clientWidth/clientHeight 分支——原渲染 stage 恒为 480×270
const W = 480;
const H = 270;
const F = 144; // recipe 帧总数（f = t·F）
const PER = 12; // 每 12 帧进一张卡
const GAP = 30; // 叠压后每张卡的下移间距
const XOFF = 9; // 滚流时的右移量

// 逻辑画布 420×250 → 实际 stage 的等比缩放
const LW = 420;
const LH = 250;
const S = Math.min(W / LW, H / LH);

const TITLES = [
  'Sparse Attention Mechanisms for Long-Context Reasoning',
  'Retrieval Drift in Multi-Hop Agent Pipelines',
  'Latent Caching Reduces Tool-Call Latency by 41%',
  'On the Calibration of Preference Reward Models',
  'Grid-Aligned Motion Priors for UI Animation',
  'Cheap Verifiers Beat Expensive Samplers',
  'Structured Decoding Without Grammar Loss',
  'Depth-Ordered Compositing for Live Interfaces',
  'Token-Budget Routing in Agent Fleets',
  'Contrastive Layouts for Document Understanding',
  'Fast Approximate Re-Ranking at Query Time',
  'Signal Propagation in Deep Residual Agents',
  'A Note on Deterministic Replay of Motion',
];
const CW = 296;
const CH = 96;

export const ResearchCardStackScroll: React.FC = () => {
  const t = useT();
  const f = t * F;
  const focus = Math.floor(f / PER); // 只有最上一张卡渲染正文
  return (
    <DesignStage bg="#FAFAFA">
      {/* 背景横向 grid：随滚流同步下移做速度参照 */}
      <div
        style={{
          position: 'absolute',
          inset: -40,
          backgroundImage: 'linear-gradient(rgba(0,0,0,.055) 1px,transparent 1px)',
          backgroundSize: '100% 24px',
          transform: `translateY(${((f / PER) * GAP * S) % 24}px)`,
        }}
      />
      {/* 逻辑画布 track：中心锚点 + 等比缩放 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 0,
          height: 0,
          transformOrigin: '0 0',
          transform: `scale(${S})`,
        }}
      >
        {TITLES.map((tt, i) => {
          const e = f - i * PER; // 该卡的本地帧
          const p = seg(Math.max(0, Math.min(1, (e + 6) / 6)), 0, 1, E.outCubic); // 6 帧入场
          const drift = (Math.max(0, e) / PER) * GAP; // 叠压后随流下移
          const squash = e >= 0 && e < 1.6 ? 0.97 : 1; // 落位 1 帧压缩
          const y = lerp(p, -40, 0) + drift;
          const x = (Math.max(0, e) / PER) * XOFF;
          const depth = Math.min(1, drift / (GAP * 3)); // depth 递增 blur + 变暗
          const opacity =
            e < -6 ? 0 : Math.min(1, (e + 6) / 2) * (1 - Math.max(0, (drift - GAP * 3.2) / (GAP * 1.6)));
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: -CW / 2,
                top: -CH / 2 - 14,
                width: CW,
                height: CH,
                background: INK,
                borderRadius: 11,
                overflow: 'hidden',
                fontFamily: FONT,
                zIndex: i,
                opacity,
                boxShadow: '0 14px 34px rgba(0,0,0,.22)',
                border: '1px solid #2A2A2A',
                boxSizing: 'border-box',
                transform: `translate(${x}px,${y}px) scale(${lerp(p, 0.94, 1)},${lerp(p, 0.94, 1) * squash})`,
                filter: `blur(${(depth * 4).toFixed(2)}px) brightness(${(1 - depth * 0.25).toFixed(3)})`,
              }}
            >
              {/* 左侧色条：每 4 张一根橙色 */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 3,
                  height: '100%',
                  background: i % 4 === 1 ? ORANGE : '#2E2E2E',
                }}
              />
              {/* 标题条：所有卡都渲染 */}
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  top: 11,
                  width: 264,
                  font: `650 9.5px/1.35 ${FONT}`,
                  color: '#F0F0F0',
                }}
              >
                {tt}
              </div>
              {/* 正文（作者 + 摘要骨架线）：只有 focus 卡可见 */}
              <div style={{ position: 'absolute', left: 14, top: 40, width: 266, opacity: i === focus ? 1 : 0 }}>
                <div style={{ font: `500 8px/1 ${FONT}`, color: ORANGE_SOFT, letterSpacing: '.3px' }}>
                  {`A. Author, B. Writer, C. Reader · preprint:24${10 + i}.0${i % 9}${i % 7}`}
                </div>
                {[0, 1, 2, 3].map((k) => (
                  <div
                    key={k}
                    style={{
                      marginTop: k ? 5 : 9,
                      width: `${100 - k * 11 - rand(i * 5 + k) * 12}%`,
                      height: 4,
                      borderRadius: 2,
                      background: '#3A3A3A',
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </DesignStage>
  );
};
