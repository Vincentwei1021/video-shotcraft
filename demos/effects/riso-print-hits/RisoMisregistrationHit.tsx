// 套印错位冲击帧（riso-misregistration-hit）——标题撞停瞬间裂成两份单色"印版"
// （朱红专色版 + 深墨版，mix-blend-mode: multiply 叠在纸上），像 riso 印刷没对准版；
// 两版反向错位（x 为主 y 少量）做衰减震荡 offset = A*cos(ωt)*exp(-t/τ) 抖两下，
// 帧 72 啪地硬切回套准（两版归零重合），带 4f scale 1.03→1 脉冲收束。
// 结构：0–19f 空场 hold（纸面 + 套准十字 + 底部印刷线与版记）；20–28f 标题从右画外
// Easing.in(cubic) 撞入屏心（帧 28 命中，飞行段横向运动模糊）；28–71f 双版错位震荡；
// 72–75f 套准脉冲；76–119f 真静止 44f（纸纤维与油墨颗粒都是静态纹理）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FONT, Grain, SpeedBlur, Vignette, bezier, mix, ramp, velocity } from '../../_fixtures/Polish';

export const RISO_MISREGISTRATION_HIT_DURATION = 120;

const HIT = 28; // 撞停命中帧
const SNAP = 72; // 套准合一帧
const AX = 16; // 单版 x 错位振幅（两版反向 → 总分离 ~32px，肉眼明显）
const AY = 7; // 单版 y 错位振幅（少量，更像没对准版）
const OMEGA = (2 * Math.PI) / 18; // 震荡周期 18f，44f 内抖两下半
const TAU = 60; // 缓衰减：帧 72 前仍余 ~14px 总分离，被"啪地"硬切归零

const PAPER = '#f1ece2'; // riso 再生纸
const INK = '#1f1d22'; // 深墨版（带一点暖紫的近黑）
const SPOT = '#e0492f'; // 朱红专色版（riso Bright Red 一系，替代原浅灰版：同为浅版，纸上更像油墨）
const inCubic = bezier(0.55, 0.055, 0.675, 0.19);

const TITLE = 'Hit print.';

// 单色印版：同字形、可调色、可错位，multiply 叠到纸上
const Plate: React.FC<{ color: string; dx: number; dy: number; scale?: number }> = ({ color, dx, dy, scale = 1 }) => (
  <div
    style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${scale})`, mixBlendMode: 'multiply',
    }}
  >
    <div
      style={{
        fontFamily: FONT.sans, fontWeight: 900, fontSize: 230, color, letterSpacing: '-0.03em', // 900 字重下 tracking() 的 −0.04em 会让字母粘连
        lineHeight: 1, whiteSpace: 'nowrap', marginTop: -40,
      }}
    >
      {TITLE}
    </div>
  </div>
);

// 套准十字（印刷对位标）：静止布景锚点
const RegMark: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <svg width={44} height={44} viewBox="0 0 44 44" style={{ position: 'absolute', left: x - 22, top: y - 22, mixBlendMode: 'multiply' }}>
    <g fill="none" stroke={INK} strokeWidth={1.4} opacity={0.7}>
      <circle cx={22} cy={22} r={10} />
      <path d="M22 2 V42 M2 22 H42" />
    </g>
  </svg>
);

// 撞入位移：右画外 1400px → 0，8f Easing.in(cubic)（加速撞停）
const slideAt = (f: number) => mix(1400, 0, ramp(f, 20, HIT - 20, inCubic));

export const RisoMisregistrationHit: React.FC = () => {
  const frame = useCurrentFrame();

  const split = frame >= HIT && frame < SNAP; // 双版错位震荡
  const slideX = frame < HIT ? slideAt(frame) : 0;
  // 飞行段横向运动模糊（速度取中心差分，撞停帧起为 0）
  const vx = frame >= 20 && frame < HIT ? velocity(slideAt, frame) : 0;

  // 错位震荡包络：t 自命中起，衰减余弦（帧 72 前仍有可见残余，硬切归零成"啪"）
  const t = frame - HIT;
  const m = split ? Math.cos(OMEGA * t) * Math.exp(-t / TAU) : 0;
  const dx = AX * m;
  const dy = AY * m;

  // 套准合一脉冲：帧 72 起 4f scale 1.03 → 1，之后精确 1（保证结尾真静止）
  const pulse = frame >= SNAP && frame < SNAP + 4 ? 1 + 0.03 * (1 - (frame - SNAP) / 4) : 1;

  return (
    <div style={{ width: 1920, height: 1080, background: PAPER, position: 'relative', overflow: 'hidden' }}>
      {/* 纸面：中心略亮 + 静态纸纤维（multiply）+ 暖褐暗角 */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 70% at 50% 44%, #f6f2ea 0%, #f1ece2 60%, #e7e0d2 100%)' }} />
      <Grain opacity={0.1} step={100000} scale={2.4} freq={0.55} blend="multiply" />

      {/* 版面：四角套准十字 + 左上版记 + 底部印刷线与说明（全程静止的布景锚点） */}
      <RegMark x={96} y={96} />
      <RegMark x={1824} y={96} />
      <RegMark x={96} y={984} />
      <RegMark x={1824} y={984} />
      <div style={{ position: 'absolute', left: 150, top: 82, fontFamily: FONT.mono, fontSize: 24, letterSpacing: '0.06em', color: 'rgba(31,29,34,0.62)' }}>
        ISSUE 07 — TWO-COLOUR RISO
      </div>
      <div style={{ position: 'absolute', left: 510, top: 760, width: 900, height: 3, background: INK, opacity: 0.85, mixBlendMode: 'multiply' }} />
      <div
        style={{
          position: 'absolute', left: 510, top: 784, width: 900, display: 'flex', fontFamily: FONT.mono, fontSize: 24,
          letterSpacing: '0.04em', color: 'rgba(31,29,34,0.62)',
        }}
      >
        <span>INK · VERMILION</span>
        <span style={{ marginLeft: 'auto' }}>120 LPI</span>
      </div>

      {/* 撞入：两版重合（套准态）整体横飞，带方向性运动模糊 */}
      {frame >= 20 && frame < HIT && (
        <SpeedBlur vx={vx} amount={0.09} max={30}>
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${slideX.toFixed(1)}px)` }}>
            <Plate color={SPOT} dx={0} dy={0} />
            <Plate color={INK} dx={0} dy={0} />
          </div>
        </SpeedBlur>
      )}

      {/* 双版错位：朱红版与深墨版反向偏移，multiply 叠加出"重影套印"；套准后两版归零重合 */}
      {frame >= HIT && (
        <>
          <Plate color={SPOT} dx={-dx} dy={dy} scale={pulse} />
          <Plate color={INK} dx={dx} dy={-dy} scale={pulse} />
        </>
      )}

      {/* 油墨颗粒：screen 叠一层细噪，让墨块像 riso 那样带一点不均匀的白点（静态） */}
      <Grain opacity={0.16} step={100000} freq={1.25} blend="screen" />
      <Vignette strength={0.14} inner={0.55} color="#5a4a32" />
    </div>
  );
};
