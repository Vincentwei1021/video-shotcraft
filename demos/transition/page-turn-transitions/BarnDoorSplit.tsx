// 对开门裂幕（barn-door-split-reveal）——剪映"开门式"转场。
// FakeDashboard A 从画面正中垂直裂成左右两半：两个 960×1080 overflow:hidden
// 容器各装一份完整 A（右半内层 translateX(-960) 对位拼合），同时向外加速滑
// 出画外，露出底层 FakeDashboard B 从 scale 1.06 轻推到 1.0 迎上来。
// 门是"有厚度的实体板"：内缘一条受光切面（1px 高光 + 渐变厚度带）+ 投在 B 上的
// 大而虚的落影；B 在门缝里先是被遮的暗面，门走远后才完全受光。
// 关键帧：0–14 静止展示 A → 14–24 中缝发丝裂纹自中点向上下描出（预告裂点）→
// 22–30 裂缝微张 0→8px（预备，ease-in）→ 30–50 两半各 translateX ∓980
// （Easing.in cubic 加速"让位"，按速度挂横向运动模糊）→ 30–58 底层 B
// scale 1.06→1.0 + 受光 0.8→1 → 58–130 全静止（72f）。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';
import { EASE, ramp, mix, velocity, SpeedBlur } from '../../_fixtures/Polish';

export const BARN_DOOR_SPLIT_DURATION = 130;

// 两半外滑位移：30–50f，0 → 980px，ease-in 加速离场（"让位"而非"被推走"）
const slideAt = (f: number) =>
  interpolate(f, [30, 50], [0, 980], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
// 裂缝预张：22–30f 0→8px（每扇各让 4px），ease-in 接上滑出的加速度
const gapAt = (f: number) => 8 * ramp(f, 22, 8, EASE.exit);
// 单扇门的总外移量
const doorAt = (f: number) => gapAt(f) / 2 + slideAt(f);

export const BarnDoorSplit: React.FC = () => {
  const frame = useCurrentFrame();

  const door = doorAt(frame);
  const vx = velocity(doorAt, frame); // px/帧，喂运动模糊
  const open = ramp(frame, 22, 28, EASE.out); // 门开度 0→1（驱动落影 / 门缝暗面）

  // 底层 B：30–58f 从 1.06 轻推到 1.0 迎上来；同时从门缝里的阴影中受光
  const bP = ramp(frame, 30, 28, EASE.out);
  const bScale = mix(1.06, 1.0, bP);
  const bShade = mix(0.26, 0, ramp(frame, 26, 30, EASE.out)) * (frame >= 22 ? 1 : 0);

  // 裂纹描出：14–24f 自画面中点向上下延伸（scaleY 0→1），30f 后随门分开而隐去
  const crack = ramp(frame, 14, 10, EASE.snappy);
  const crackAlpha = frame < 14 ? 0 : 1 - ramp(frame, 30, 6, EASE.out);

  // 门内缘：受光切面 + 投在 B 上的落影（随门一起走）
  const Edge: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
    const toward = side === 'right' ? 'to left' : 'to right';
    return (
      <div style={{ position: 'absolute', top: 0, [side]: 0, width: 7, height: 1080 }}>
        {/* 厚度带：板材切面从亮到暗 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(${toward}, #c9cad0 0%, #e6e6ea 45%, rgba(230,230,234,0) 100%)`,
        }} />
        {/* 1px 受光棱 */}
        <div style={{ position: 'absolute', top: 0, [side]: 0, width: 1, height: 1080, background: 'rgba(255,255,255,0.95)' }} />
      </div>
    );
  };
  // 落影：在门外侧（B 上），大而虚，门开度越大越实
  const castShadow = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute', top: 0, width: 140, height: 1080, pointerEvents: 'none',
    opacity: open * 0.9,
    ...(side === 'left'
      ? { left: 960 - door, background: 'linear-gradient(to right, rgba(16,18,26,0.30), rgba(16,18,26,0.10) 35%, rgba(16,18,26,0))' }
      : { left: 960 + door - 140, background: 'linear-gradient(to left, rgba(16,18,26,0.30), rgba(16,18,26,0.10) 35%, rgba(16,18,26,0))' }),
  });

  const doorsGone = frame >= 51;

  return (
    <div style={{ width: 1920, height: 1080, background: G.dark, position: 'relative', overflow: 'hidden' }}>
      {/* 底层 FakeDashboard B：scale 1.06 → 1.0 迎上来 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: 1920, height: 1080,
        transform: `scale(${bScale})`, transformOrigin: '50% 50%',
      }}>
        <FakeDashboard variant="B" />
      </div>
      {/* 门缝里的遮挡暗面：中间最暗、向两侧门边变淡，门走远后消散 */}
      {bShade > 0.002 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: bShade / 0.26,
          background: `radial-gradient(ellipse ${Math.max(10, door * 1.4)}px 140% at 50% 50%, rgba(14,15,20,0.26), rgba(14,15,20,0.16) 60%, rgba(14,15,20,0.10))`,
        }} />
      )}

      {!doorsGone && (
        <>
          <div style={castShadow('left')} />
          <div style={castShadow('right')} />
          <SpeedBlur vx={-vx} amount={0.06} max={18}>
            {/* 左门：960×1080 视口，装完整 A 的左半 */}
            <div style={{
              position: 'absolute', left: 0, top: 0, width: 960, height: 1080, overflow: 'hidden',
              transform: `translateX(${-door}px)`,
            }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 }}>
                <FakeDashboard variant="A" />
              </div>
              {frame >= 22 && <Edge side="right" />}
            </div>
          </SpeedBlur>
          <SpeedBlur vx={vx} amount={0.06} max={18}>
            {/* 右门：960×1080 视口，内层 translateX(-960) 对位拼合 */}
            <div style={{
              position: 'absolute', left: 960, top: 0, width: 960, height: 1080, overflow: 'hidden',
              transform: `translateX(${door}px)`,
            }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: 'translateX(-960px)' }}>
                <FakeDashboard variant="A" />
              </div>
              {frame >= 22 && <Edge side="left" />}
            </div>
          </SpeedBlur>
        </>
      )}

      {/* 裂点预告：发丝裂纹自中点向上下描出，两侧带极淡的阴影晕 */}
      {crackAlpha > 0.01 && (
        <div style={{
          position: 'absolute', left: 960 - 0.5, top: 0, width: 1, height: 1080, opacity: crackAlpha,
          transform: `scaleY(${crack})`, transformOrigin: '50% 50%',
          background: 'linear-gradient(to bottom, rgba(23,24,28,0) 0%, rgba(23,24,28,0.75) 18%, rgba(23,24,28,0.9) 50%, rgba(23,24,28,0.75) 82%, rgba(23,24,28,0) 100%)',
          boxShadow: '0 0 6px 1px rgba(23,24,28,0.18)',
        }} />
      )}
    </div>
  );
};
