// 逐字遮罩裂升（split-text-stagger）——GSAP SplitText 惯用入场。
// 标题 "MOTION SYSTEM" 按字符拆 span，每字外包 overflow:hidden 的行高盒，
// 内层从 translateY(115%) 升到 0，各 14f Easing.out(cubic)，带 10% 过冲
// 再 6f 回落（原案 6% 过冲，按可感性红线加码到 10%）。delay = 字符索引×2f。
// 底部基线细线在首字起跳同帧从左向右生长，暗示裁切线存在。
// 关键帧：0–12 空场 hold → 12 首字起跳 + 基线开始生长 → 每字 12+i*2 起跳，
// 14f 升至 -10% 过冲 → 再 6f 回落归 0 → 末字(索引12)于 56f 落定 →
// 56–130 全静止（74f ≥ 40f，无逐帧噪声层）。
//
// 质感升级：去掉调试标题；柔光 Backdrop；系统 SF 栈 700、字号 120→136；
// 升起快速段按每字竖向速度加 y 向运动模糊（静止为 0）；基线改强调色、宽度与文字行严格等宽，
// 生长用强 ease-out；补导出时长 130f（原工作台按 56f 推断，末字刚落定就切走）。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT as PFONT, ramp } from '../../_fixtures/Polish';

export const SPLIT_TEXT_STAGGER_DURATION = 130;

const TEXT = 'MOTION SYSTEM';
const START = 12; // 首字起跳帧
const RISE = 14; // 升起时长
const SETTLE = 6; // 过冲回落时长
const OVERSHOOT = -10; // 过冲到 -10%（原案 6%，加码）
const FONT = 136;
const LINE_H = 1.05; // span 行高（translateY 百分比以此为基准）

// 单字符纵向位移（%）：115 → -10（out cubic）→ 0（out quad），帧确定
const charY = (f: number, idx: number): number => {
  const t0 = START + idx * 2;
  if (f < t0 + RISE) {
    return interpolate(f, [t0, t0 + RISE], [115, OVERSHOOT], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
  }
  return interpolate(f, [t0 + RISE, t0 + RISE + SETTLE], [OVERSHOOT, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
};

export const SplitTextStagger: React.FC = () => {
  const frame = useCurrentFrame();
  const chars = TEXT.split('');
  // 基线：首字起跳同帧开始，从左向右生长到 100%
  const lineW = ramp(frame, START, 30, EASE.snappy) * 100;

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.42, y: 0.3 }} accent="#5b63d3" grain={0.045} vignette={0.12} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 行容器：基线与文字行同宽 */}
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex' }}>
            {chars.map((c, i) => {
              const y = charY(frame, i);
              // 竖向速度（px/帧）→ y 向模糊
              const vy = Math.abs(charY(frame + 0.5, i) - charY(frame - 0.5, i)) * FONT * LINE_H * 0.01;
              const blur = Math.min(10, vy * 0.32);
              const id = `sts-vb-${i}`;
              return (
                <div
                  key={i}
                  style={{
                    // 遮罩盒：上方留 0.3em 头部空间容纳过冲，底边即裁切线
                    overflow: 'hidden',
                    height: FONT * 1.35,
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  {blur > 0.3 && (
                    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
                      <filter id={id} x="-10%" y="-50%" width="120%" height="200%">
                        <feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} />
                      </filter>
                    </svg>
                  )}
                  <span
                    style={{
                      display: 'inline-block',
                      fontFamily: PFONT.sans,
                      fontWeight: 700,
                      fontSize: FONT,
                      lineHeight: LINE_H,
                      color: G.ink1,
                      letterSpacing: '-0.015em',
                      transform: `translateY(${y.toFixed(3)}%)`,
                      filter: blur > 0.3 ? `url(#${id})` : undefined,
                    }}
                  >
                    {c === ' ' ? '\u00a0' : c}
                  </span>
                </div>
              );
            })}
          </div>
          {/* 基线细线：宽度从 0 生长到全文宽（强调色，暗示裁切线） */}
          <div style={{ marginTop: 12, height: 3, display: 'flex' }}>
            <div
              style={{
                height: 3,
                width: `${lineW.toFixed(3)}%`,
                borderRadius: 2,
                background: `linear-gradient(90deg, ${G.accent}, #7c83e6)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
