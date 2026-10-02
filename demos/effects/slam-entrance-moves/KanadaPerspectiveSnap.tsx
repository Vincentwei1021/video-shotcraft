// 金田透视急停（kanada-perspective-snap）——金田伊功式夸张透视入场。
// 一张卡片以鱼眼级夸张透视姿态高速甩入画面中心：容器 perspective 300→1500px
// （短焦→长焦，透视畸变随之收敛），卡片 rotate3d(0.5,1,0.1) 58°→0 +
// scale 1.7→1 + translateX -700→0，近角冲出画面感。落定瞬间"啪"地弹平：
// rotateY 过冲 +5° 再 4f 回 0；同时 6px 震屏 2f 衰减，拉长斜影收为正常投影。
// 关键帧：0–18 透视甩入（out cubic）→ 14–18 rotateY 过冲至 +5° →
// 18–22 回弹归 0 + 震屏衰减 + 阴影收正 → 22–130 全静止（≥45f）。
//
// 质感升级：去掉调试标题与 3px 灰虚线框，换成柔光底上一块浅浅凹进去的落点槽（落定后隐去）；
// 甩入的常驻 blur(2px)（落定那帧突然摘掉）换成按 translateX 速度计算的水平 SpeedBlur，
// 速度归零自然清晰；身后拖 5 条动漫速度线，随减速收短淡出；filter drop-shadow 换成
// 两层 box-shadow 斜影（近地实影 + 远地长虚影），落定收成静置卡片的软投影。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Card } from '../../_fixtures/Fixtures';
import { Backdrop, Grain, SpeedBlur, innerHighlight } from '../../_fixtures/Polish';

export const KANADA_PERSPECTIVE_SNAP_DURATION = 130; // 22f 动作 + 108f 静止 hold

// 确定性伪随机（震屏抖动用）
const h = (n: number): number => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const CARD_W = 660; // 主角卡放大一档（原 520×340），落定后文字够读
const CARD_H = 430;
const CX = (1920 - CARD_W) / 2; // 630
const CY = (1080 - CARD_H) / 2; // 325

// 甩入主通道（out cubic：先猛后缓，急停感）
const progAt = (f: number) => interpolate(f, [0, 18], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
const txAt = (f: number) => interpolate(progAt(f), [0, 1], [-700, 0]);

// 速度线：相对卡片中心的纵向位置、长度系数、粗细（确定性）
const STREAKS = [
  { y: -160, len: 1.0, w: 2 },
  { y: -80, len: 0.7, w: 1.5 },
  { y: 8, len: 1.15, w: 2.5 },
  { y: 92, len: 0.8, w: 1.5 },
  { y: 170, len: 0.95, w: 2 },
];

export const KanadaPerspectiveSnap: React.FC = () => {
  const frame = useCurrentFrame();

  const p = progAt(frame);
  const persp = interpolate(p, [0, 1], [300, 1500]); // 短焦鱼眼→长焦收平
  const angle3d = interpolate(p, [0, 1], [58, 0]); // rotate3d(0.5,1,0.1)
  const scale = interpolate(p, [0, 1], [1.7, 1]);
  const tx = txAt(frame);
  const vx = frame < 18 ? txAt(frame + 0.5) - txAt(frame - 0.5) : 0; // px/帧

  // rotateY 过冲通道：14–18f 冲到 +5°，18–22f "啪"地回 0
  const rotY =
    frame < 18
      ? interpolate(frame, [14, 18], [0, 5], CLAMP)
      : interpolate(frame, [18, 22], [5, 0], { ...CLAMP, easing: Easing.out(Easing.cubic) });

  // 落定震屏：18f 起 6px，2f 内衰减到 0（21f 后恒为 0，保证真静止）
  const shakeAmp = frame >= 18 ? interpolate(frame, [18, 21], [6, 0], CLAMP) : 0;
  const shakeX = shakeAmp * (h(frame * 7 + 1) * 2 - 1);
  const shakeY = shakeAmp * (h(frame * 13 + 2) * 2 - 1);

  // 阴影：飞行期拉长斜影（大偏移大模糊）→ 落定收为正常投影（18–22f 收拢）
  const shOff =
    frame < 18
      ? interpolate(p, [0, 1], [1, 0.35])
      : interpolate(frame, [18, 22], [0.35, 0], { ...CLAMP, easing: Easing.out(Easing.quad) });
  const shX = interpolate(shOff, [0, 1], [0, 70]);
  const shY = interpolate(shOff, [0, 1], [16, 56]);
  const shBlur = interpolate(shOff, [0, 1], [44, 64]);
  const shAlpha = interpolate(shOff, [0, 1], [0.2, 0.26]);
  const cardShadow =
    `${innerHighlight(0.85)}, ` +
    `0 ${(1.5 + shOff * 6).toFixed(2)}px ${(3 + shOff * 10).toFixed(2)}px rgba(16,18,26,${(0.08 - shOff * 0.05).toFixed(3)}), ` +
    `${shX.toFixed(2)}px ${shY.toFixed(2)}px ${shBlur.toFixed(2)}px -12px rgba(16,18,26,${shAlpha.toFixed(3)})`;

  // 速度线：跟着卡片左缘，长度 ∝ 速度，减速到 ~4px/帧时已淡没
  const streakA = interpolate(Math.abs(vx), [4, 40], [0, 1], CLAMP);
  // 落点槽：开场就在，卡片盖上后 18–30f 隐去
  const slotO = interpolate(frame, [18, 30], [1, 0], CLAMP);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* 柔光底在震屏层之外（无特征的底跟着抖只会露边） */}
      <Backdrop tone="light" light={{ x: 0.5, y: 0.3 }} accent="#5b63d3" grain={0} />
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px)` }}>
        {/* 落点槽：浅浅凹进去的圆角槽 + 1px 发丝虚线，给"甩到哪"一个参照 */}
        <div
          style={{
            position: 'absolute',
            left: CX - 20,
            top: CY - 20,
            width: CARD_W + 40,
            height: CARD_H + 40,
            borderRadius: 24,
            background: 'rgba(20,22,30,0.025)',
            boxShadow: 'inset 0 2px 6px rgba(16,18,26,0.07), inset 0 0 0 1px rgba(20,22,28,0.05)',
            opacity: slotO,
          }}
        >
          <div style={{ position: 'absolute', inset: 8, borderRadius: 17, border: '1.5px dashed rgba(20,22,28,0.14)' }} />
        </div>

        {/* 速度线（卡片身后，水平拖尾） */}
        {streakA > 0.001 &&
          STREAKS.map((s, i) => {
            const len = Math.min(900, Math.abs(vx) * 7 * s.len);
            const x1 = CX + tx + 40; // 卡片左缘内侧一点开始向后拖
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x1 - len,
                  top: CY + CARD_H / 2 + s.y - s.w / 2,
                  width: len,
                  height: s.w,
                  borderRadius: s.w,
                  background: 'linear-gradient(90deg, rgba(23,24,28,0) 0%, rgba(23,24,28,0.16) 70%, rgba(23,24,28,0.28) 100%)',
                  opacity: streakA,
                }}
              />
            );
          })}

        {/* 透视容器：perspective 随落定从鱼眼收敛到长焦；SpeedBlur 沿 x 拖影，速度归零自动摘滤镜 */}
        <SpeedBlur vx={vx} amount={0.16} max={22}>
          <div style={{ position: 'absolute', left: CX, top: CY, perspective: `${persp.toFixed(2)}px`, perspectiveOrigin: '30% 50%' }}>
            <div
              style={{
                transform: `translateX(${tx.toFixed(2)}px) scale(${scale.toFixed(4)}) rotate3d(0.5, 1, 0.1, ${angle3d.toFixed(3)}deg) rotateY(${rotY.toFixed(3)}deg)`,
                transformOrigin: '20% 50%',
              }}
            >
              <Card w={CARD_W} h={CARD_H} seed={3} style={{ boxShadow: cardShadow }} />
            </div>
          </div>
        </SpeedBlur>
      </div>
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
