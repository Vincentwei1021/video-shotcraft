import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Card } from '../../_fixtures/Fixtures';
import { Backdrop, Grain } from '../../_fixtures/Polish';

// grid-wave-flip〔入场退场〕：3×3 灰背卡片墙沿对角线波前依次 rotateX 翻转 180°，
// 灰背翻成正面内容卡；波浪约一秒扫完全屏，最后一张落定带轻微过冲。
// 结构：hold 20f → delay=(row+col)*6f、每张 14f bezier(0.35,0,0.25,1) → 尾张过冲回弹(~66f) → 静止收尾。
// 质感改版：
// - 修旧版渲染穿帮：依赖 backface-visibility 时 Chromium 在首行/首列把背面也剔掉（开场五张卡"隐身"）；
//   改为按角度显式只画朝外的那一面（<90° 画背面、≥90° 画预转 180° 的正面），确定性无剔除问题；
// - 透视真正共享一个消失点：每格自带 perspective，perspectiveOrigin 换算到整墙中心（旧版 perspective
//   挂在 grid 上、隔了一层未 preserve-3d 的格子，翻转其实是正交的）；
// - 翻面有受光：朝向偏离镜头时按 cos(角度) 压暗，背面是哑光纸感灰卡 + 压印标记，不再是灰块 + 圆点；
// - 阴影改为格位下方独立的地面影，随翻转抬起变大变虚、落定收紧（不再跟着卡面一起转）。
export const GRID_WAVE_FLIP_DURATION = 130;

const COLS = 3;
const ROWS = 3;
const CELL_W = 520;
const CELL_H = 280;
const GAP = 36;
const HOLD = 20; // 开头建立
const STAGGER = 6; // 对角线波前步进
const FLIP = 14; // 单张翻转时长
const WALL_W = COLS * CELL_W + (COLS - 1) * GAP;
const WALL_H = ROWS * CELL_H + (ROWS - 1) * GAP;
const WALL_X = (1920 - WALL_W) / 2;
const WALL_Y = (1080 - WALL_H) / 2;

const flipEase = Easing.bezier(0.35, 0, 0.25, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 单张卡的翻转角度：普通卡 0→180；最后一张（波前最末）过冲到 ~190 再回落 180
const angleAt = (frame: number, row: number, col: number): number => {
  const delay = HOLD + (row + col) * STAGGER;
  const isLast = row === ROWS - 1 && col === COLS - 1;
  if (!isLast) {
    return interpolate(frame, [delay, delay + FLIP], [0, 180], { ...clamp, easing: flipEase });
  }
  // 过冲：14f 冲到 190°，再 8f 弹回 180°
  const main = interpolate(frame, [delay, delay + FLIP], [0, 190], { ...clamp, easing: flipEase });
  const settle = interpolate(frame, [delay + FLIP, delay + FLIP + 8], [0, -10], { ...clamp, easing: Easing.out(Easing.cubic) });
  return main + settle;
};

// 灰背：哑光纸感 + 发丝线 + 压印标记
const CardBack: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 14, boxSizing: 'border-box', overflow: 'hidden',
    background: 'linear-gradient(160deg, #dedcd7 0%, #d1cfca 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 0 0 1px rgba(20,22,28,0.07)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{
      position: 'absolute', inset: 0, opacity: 0.5,
      backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0 2px, rgba(255,255,255,0) 2px 10px)',
    }} />
    <div style={{
      width: 52, height: 52, borderRadius: 15, position: 'relative',
      background: 'linear-gradient(160deg, #cfcdc8, #d9d7d2)',
      boxShadow: 'inset 0 2px 3px rgba(20,22,28,0.16), inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(255,255,255,0.5)',
    }}>
      <div style={{ position: 'absolute', left: 15, top: 15, width: 13, height: 13, borderRadius: 4, background: 'rgba(20,22,28,0.16)' }} />
      <div style={{ position: 'absolute', left: 23, top: 23, width: 13, height: 13, borderRadius: 7, background: 'rgba(20,22,28,0.10)' }} />
    </div>
  </div>
);

export const GridWaveFlip: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <Backdrop tone="light" light={{ x: 0.42, y: 0.1 }} grain={0} vignette={0.16} />
      {/* 地面影层（不随卡旋转） */}
      {Array.from({ length: ROWS * COLS }).map((_, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const a = angleAt(frame, row, col);
        const lift = Math.sin((Math.min(Math.max(a, 0), 180) * Math.PI) / 180);
        return (
          <div key={`sh${i}`} style={{
            position: 'absolute', left: WALL_X + col * (CELL_W + GAP), top: WALL_Y + row * (CELL_H + GAP),
            width: CELL_W, height: CELL_H, borderRadius: 14,
            boxShadow:
              `0 ${(1 + lift * 4).toFixed(1)}px ${(3 + lift * 8).toFixed(1)}px rgba(16,18,24,${(0.08 - lift * 0.04).toFixed(3)}), ` +
              `0 ${(8 + lift * 26).toFixed(1)}px ${(20 + lift * 50).toFixed(1)}px -${(8 + lift * 6).toFixed(1)}px rgba(16,18,24,${(0.12 + lift * 0.14).toFixed(3)})`,
          }} />
        );
      })}
      {Array.from({ length: ROWS * COLS }).map((_, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const x = WALL_X + col * (CELL_W + GAP);
        const y = WALL_Y + row * (CELL_H + GAP);
        const angle = angleAt(frame, row, col);
        const showFront = angle >= 90;
        // 受光：面越侧向镜头越暗（cos），两面分别按自身法线计算
        const facing = Math.abs(Math.cos((angle * Math.PI) / 180));
        const shade = (1 - facing) * 0.5;
        // 高光线：翻到 90°（最薄处）时最亮，位置随角度从上缘扫向下缘
        const glow = Math.max(0, 1 - Math.abs(angle - 90) / 45);
        const glowTop = interpolate(angle, [45, 135], [8, 92], clamp);
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: CELL_W, height: CELL_H,
            // 共享消失点：每格的 perspectiveOrigin 换算到整墙中心；2400px 让边角格的近缘不至于甩出格位
            perspective: 2400,
            perspectiveOrigin: `${WALL_W / 2 - col * (CELL_W + GAP)}px ${WALL_H / 2 - row * (CELL_H + GAP)}px`,
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 14,
              transform: `rotateX(${(showFront ? angle - 180 : angle).toFixed(3)}deg)`,
            }}>
              {showFront ? (
                <div style={{ position: 'absolute', inset: 0, borderRadius: 14 }}>
                  <Card w={CELL_W} h={CELL_H} seed={i + 1} style={{ width: '100%', height: '100%' }} />
                </div>
              ) : (
                <CardBack />
              )}
              {shade > 0.005 && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none',
                  background: `linear-gradient(${showFront ? 0 : 180}deg, rgba(20,22,30,${(shade * 0.6).toFixed(3)}), rgba(20,22,30,${shade.toFixed(3)}))`,
                }} />
              )}
            </div>
            {/* 最薄处高光线：不随卡旋转，贴在格位上随角度纵向移动 */}
            {glow > 0.01 && (
              <div style={{
                position: 'absolute', left: '4%', width: '92%', top: `${glowTop}%`, height: 4, borderRadius: 2,
                background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 100%)',
                boxShadow: '0 0 14px rgba(255,255,255,0.7)', opacity: glow, pointerEvents: 'none',
              }} />
            )}
          </div>
        );
      })}
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
