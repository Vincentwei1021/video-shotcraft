// 频闪黑帧（strobe-black-frames）——节奏剪辑｜VJ strobe / 剪映闪黑。
// FakeDashboard A 全程缓慢推近蓄张力（scale 1.0→1.05，ease-in quad，越到后段越快）。
// 40–80f 频闪窗：全屏近黑按写死帧号表闪现，每次持续 2f，间隔从 8f 收敛到 3f，
// 窒息感逐渐逼近。最后一闪盖住 79–80，帧 81 掀开时构图已硬切到 scale 1.35 对准
// 第 2 行中间卡（Deploys，零补间一帧到位），叠 2f brightness 0.88 加深脉冲当落锤。
// 关键帧：0–80 推近 1.0→1.05 → 黑闪 [40,48,55,61,66,70,73,76,79]（各 2f）→
// 79–80 全黑 → 帧 81 硬切 scale 1.35（81–82 加深脉冲）→ 83–134 全静止（52f ≥50f）。
// 质感：频闪窗内画面"越闪越憋"——暗角随闪次逐级收紧、对比与压暗同步加码（压强曲线），
// 落锤一帧全部松开，反差即释放；黑帧是带冷调的近黑 + 颗粒（不是死平 #000 色块）；
// 1.35x 落点走 CSS zoom 按目标尺寸栅格化（Q2）；落锤后目标卡亮起 UI 选中态
// （强调色细环 8f ease-out 收紧到位），"就是它"有了落点，82f 后整帧真静止。
// 光敏警示：实战建议配乐渐强使用。
import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';
import { EASE, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';

export const STROBE_BLACK_FRAMES_DURATION = 135; // 推近蓄压 81f + 落锤后 54f（其中真静止 ≥50f）

// punch-in 落点：3×2 网格第 2 行中间卡中心（同 JumpCutPunchIn 几何）
// 侧栏 220 + 内边距 36；卡宽 (1920-220-72-56)/3 ≈ 524.67，卡高 (1080-72-72-28)/2 = 454
const CARD_L = 220 + 36 + 524.67 + 28; // ≈808.67
const CARD_T = 72 + 36 + 454 + 28; // 590
const CARD_W = 524.67;
const CARD_H = 454;
const ORIGIN_X = CARD_L + CARD_W / 2; // ≈1071
const ORIGIN_Y = CARD_T + CARD_H / 2; // 817

// 黑闪帧号表（写死）：间隔 8→7→6→5→4→3→3→3，每次持续 2f（f0 与 f0+1）
const FLASHES = [40, 48, 55, 61, 66, 70, 73, 76, 79];
const SLAM = 81; // 末闪掀开 = 硬切落锤帧
const PUNCH = 1.35;

const isBlack = (f: number): boolean => FLASHES.some((f0) => f >= f0 && f <= f0 + 1);

// 已闪过几次（0–9）：驱动"越闪越憋"的压强
const flashesSoFar = (f: number): number => FLASHES.filter((f0) => f >= f0).length;

// 帧 81 前缓慢推近（ease-in quad 蓄力），81 起零补间硬切 1.35 定住
const pushAt = (f: number): number =>
  f < SLAM ? mix(1.0, 1.05, ramp(f, 0, SLAM - 1, (t) => t * t)) : 1;

// 落锤：81–82 两帧整画面加深脉冲
const pulseAt = (f: number): number => (f >= SLAM && f <= SLAM + 1 ? 0.88 : 1);

export const StrobeBlackFrames: React.FC = () => {
  const frame = useCurrentFrame();
  const black = isBlack(frame);
  const slammed = frame >= SLAM;
  const zoom = slammed ? PUNCH : 1; // 落点倍率走 CSS zoom（布局级，字按目标尺寸栅格化）
  const push = pushAt(frame); // 蓄压推近走 transform（亚像素平滑）

  // 压强 0→1：频闪窗内按已闪次数逐级加码（每闪一次憋紧一档），落锤即归零
  const pressure = slammed ? 0 : flashesSoFar(frame) / FLASHES.length;
  const press = Math.pow(pressure, 0.8);
  const contrast = 1 + 0.1 * press;
  const bright = pulseAt(frame) * (1 - 0.08 * press);
  const filter = bright < 1 || contrast > 1 ? `brightness(${bright.toFixed(3)}) contrast(${contrast.toFixed(3)})` : undefined;

  // 落锤后选中环：8f ease-out 由外扩 1.04 收紧到 1、透明度 0→1（元素层，相机已定）
  const lock = ramp(frame, SLAM, 8, EASE.snappy);
  const ringScale = mix(1.04, 1, lock);

  return (
    <AbsoluteFill style={{ background: G.canvas, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          filter,
          transform: push !== 1 ? `scale(${push.toFixed(5)})` : undefined,
          transformOrigin: `${ORIGIN_X}px ${ORIGIN_Y}px`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            // zoom 连自身 left/top 一起放大：left = O/s − O ⇒ 落点 O 在屏上不动
            left: ORIGIN_X / zoom - ORIGIN_X,
            top: ORIGIN_Y / zoom - ORIGIN_Y,
            width: 1920,
            height: 1080,
            zoom,
          }}
        >
          <FakeDashboard variant="A" />
          {slammed && (
            <div
              style={{
                position: 'absolute',
                left: CARD_L - 5,
                top: CARD_T - 5,
                width: CARD_W + 10,
                height: CARD_H + 10,
                borderRadius: 19,
                border: `1.5px solid rgba(91,99,211,${(0.85 * lock).toFixed(3)})`,
                boxShadow: `0 0 0 5px rgba(91,99,211,${(0.13 * lock).toFixed(3)}), 0 18px 48px -18px rgba(91,99,211,${(0.22 * lock).toFixed(3)})`,
                boxSizing: 'border-box',
                transform: `scale(${ringScale.toFixed(4)})`,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>
      {/* 暗角：平时轻压，频闪窗里随压强收紧（0.12→0.5），落锤后回到 0.16 的特写压角 */}
      <Vignette
        strength={slammed ? 0.16 : mix(0.12, 0.5, press)}
        inner={slammed ? 0.52 : mix(0.5, 0.3, press)}
        color="#0d0e14"
        cx={ORIGIN_X / 1920}
        cy={0.56}
      />
      {/* 颗粒在选中环到位（89f）冻结，落锤后的尾段像素级真静止 */}
      <Freeze frame={SLAM + 8} active={frame >= SLAM + 8}>
        <Grain opacity={0.045 + 0.03 * press} />
      </Freeze>
      {/* 全屏黑闪层：盖住一切，每次 2f；冷调近黑 + 颗粒，避免死平色块 */}
      {black && (
        <AbsoluteFill style={{ background: '#07080b' }}>
          <Grain opacity={0.08} blend="screen" />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
