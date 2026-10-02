// cloner-depth-echo —— 克隆纵队
// 一张主卡瞬间"复印"出 7 个克隆体沿 Z 轴向后等距排开（间隔 120px、
// opacity 100%→20% 衰减、整队 16° rotateY 侧视），12f 错峰弹出；停 25f；
// 全部克隆加速吸回本体合一（10f ease-in），合体瞬间本体弹 1.08x。
// 收尾 f83 后真静止 37f（全片 120f）。全部 frame 派生。
// 质感层（改版）：去掉调试标题，柔光浅底 + 地面接触影；复印前主卡先"按压"一下（预备），
// 克隆体按序弹出时实例计数 chip 从 ×1 数到 ×8；吸回段按速度给沿运动方向的拖影模糊；
// 合体后计数停在 ×8（"一个 = 很多"），主卡落定呼吸。
import React from 'react';
import { useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { Card } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, ramp, softShadow } from '../../_fixtures/Polish';

export const CLONER_DEPTH_ECHO_DURATION = 120; // 4s：入场 → 排开 → 停 → 吸回 → 弹 → 静止 37f

const FPS = 30;
const N = 7; // 克隆数
const GAP_Z = 120;

const SPREAD_START = 18; // 排开起始帧
const HOLD_END = 18 + 12 + 25; // f55：停留结束
const MERGE_DUR = 10; // 吸回时长
const ACCENT = '#5b63d3';

// 第 idx 个克隆的排开进度（spring，错峰 1.6f/个）
const spreadOf = (frame: number, idx: number) =>
  spring({
    frame: frame - SPREAD_START - (idx - 1) * 1.6,
    fps: FPS,
    config: { damping: 14, stiffness: 160, mass: 0.8 },
    durationInFrames: 16,
  });
const mergeOf = (frame: number) =>
  interpolate(frame, [HOLD_END, HOLD_END + MERGE_DUR], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const ClonerDepthEcho: React.FC = () => {
  const frame = useCurrentFrame();

  // 吸回进度（全体同步，ease-in 加速）
  const merge = mergeOf(frame);

  // 合体瞬间本体弹一下
  const popS = spring({
    frame: frame - (HOLD_END + MERGE_DUR),
    fps: FPS,
    config: { damping: 11, stiffness: 200, mass: 0.7 },
    durationInFrames: 18,
  });
  const pop = frame >= HOLD_END + MERGE_DUR ? Math.sin(popS * Math.PI) : 0;
  // 复印前的按压预备：f10→18 压到 0.965，排开起点 spring 释放回 1
  const press = ramp(frame, 10, 8, EASE.swift) * (1 - ramp(frame, SPREAD_START, 10, EASE.overshoot));
  const heroScale = (1 - 0.035 * press) * (1 + 0.08 * pop);
  // 主卡入场：f0→16 自下 24px 浮起 + 淡入
  const enter = ramp(frame, 0, 16, EASE.out);

  // 实例计数：每个克隆过半弹出即 +1；合体后保持 ×8
  let count = 1;
  for (let idx = 1; idx <= N; idx++) if (spreadOf(frame, idx) > 0.5) count++;
  if (frame >= HOLD_END) count = N + 1;
  const tick = (() => {
    // 计数每跳一次给 chip 一个小脉冲；合体时再给一次
    let last = -99;
    for (let idx = 1; idx <= N; idx++) {
      const f0 = SPREAD_START + (idx - 1) * 1.6 + 3;
      if (frame >= f0) last = f0;
    }
    if (frame >= HOLD_END + MERGE_DUR) last = HOLD_END + MERGE_DUR;
    return Math.max(0, 1 - (frame - last) / 6);
  })();
  const chipIn = ramp(frame, SPREAD_START - 2, 10, EASE.overshoot);

  return (
    <div style={{ width: 1920, height: 1080, overflow: 'hidden', position: 'relative', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.56, y: 0.26 }} accent={ACCENT} grain={0.05} vignette={0.16} />

      {/* 地面接触影：主卡下方，克隆排开时随纵队向右上拉长变淡 */}
      <div
        style={{
          position: 'absolute',
          left: 980 - 400,
          top: 540 + 270,
          width: 800,
          height: 70,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(24,26,40,0.20) 0%, rgba(24,26,40,0) 70%)',
          opacity: enter,
          transform: `scale(${(1 + 0.04 * pop).toFixed(4)})`,
        }}
      />

      {/* 取景：整组放大 1.22（以纵队排开后的重心为中心），主体占画面更足 */}
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(1.22)', transformOrigin: '1000px 540px' }}>
      <div style={{ position: 'absolute', inset: 0, perspective: 1600, perspectiveOrigin: '58% 46%' }}>
        <div
          style={{
            position: 'absolute',
            left: 960 - 260,
            top: 540 - 170 + 40,
            transformStyle: 'preserve-3d',
            transform: 'rotateY(16deg)',
          }}
        >
          {/* 克隆队列：从后往前渲染保证遮挡正确 */}
          {Array.from({ length: N }, (_, k) => N - k).map((idx) => {
            // idx 1..N，idx 越大越靠后
            const spread = spreadOf(frame, idx);
            const p = spread * (1 - merge);
            const z = -GAP_Z * idx * p;
            // 斜向错位让纵队肉眼可见（像侧看一列纵队）
            const dx = 64 * idx * p;
            const dy = -34 * idx * p;
            const op = (1 - (idx / N) * 0.8) * spread * (1 - merge);
            if (op <= 0.005) return null;
            // 吸回段的拖影：位移速度（px/帧）→ 沿 (64,−34) 方向的近似方向模糊
            const pPrev = spreadOf(frame - 0.5, idx) * (1 - mergeOf(frame - 0.5));
            const pNext = spreadOf(frame + 0.5, idx) * (1 - mergeOf(frame + 0.5));
            const v = Math.abs(pNext - pPrev) * 72 * idx;
            const sd = Math.min(14, v * 0.22);
            const fid = `cde-blur-${idx}`;
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, ${z.toFixed(2)}px)`,
                  opacity: op,
                  filter: sd > 0.4 ? `url(#${fid})` : undefined,
                }}
              >
                {sd > 0.4 && (
                  <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
                    <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation={`${(sd * 0.88).toFixed(2)} ${(sd * 0.47).toFixed(2)}`} />
                    </filter>
                  </svg>
                )}
                <Card w={520} h={340} seed={3} style={{ boxShadow: softShadow(10, { strength: 0.7 }) }} />
                {/* 克隆体染一层随纵深加深的强调色：浅底上半透明白卡会"消失"，染色让纵队读得出 */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 14,
                    background: `rgba(91,99,211,${(0.05 + 0.13 * (idx / N)).toFixed(3)})`,
                    border: `1px solid rgba(91,99,211,${(0.12 + 0.2 * (idx / N)).toFixed(3)})`,
                  }}
                />
              </div>
            );
          })}
          {/* 本体 */}
          <div
            style={{
              position: 'absolute',
              transform: `translateZ(0px) translateY(${((1 - enter) * 24).toFixed(2)}px) scale(${heroScale.toFixed(4)})`,
              opacity: enter,
            }}
          >
            <Card
              w={520}
              h={340}
              seed={3}
              style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(14 + 10 * pop)}` }}
            />
            {/* 实例计数 chip：钉在主卡右上角外沿，跟随主卡缩放 */}
            <div
              style={{
                position: 'absolute',
                right: -34,
                top: -36,
                height: 58,
                minWidth: 100,
                padding: '0 18px',
                borderRadius: 29,
                background: `linear-gradient(180deg, #6b73e0 0%, ${ACCENT} 100%)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), ${softShadow(8, { color: '#2a2f8a', strength: 1.2 })}`,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                fontSize: 32,
                fontWeight: 650,
                letterSpacing: '-0.01em',
                fontVariantNumeric: 'tabular-nums',
                transform: `scale(${(chipIn * (1 + 0.1 * tick)).toFixed(4)})`,
                transformOrigin: '70% 50%',
                opacity: Math.min(1, chipIn * 1.5),
              }}
            >
              <span style={{ opacity: 0.72, fontWeight: 500 }}>×</span>
              {count}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
