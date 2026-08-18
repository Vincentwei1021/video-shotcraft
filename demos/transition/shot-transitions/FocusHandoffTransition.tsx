// C 式 虚焦接力（focus-handoff）——前景滑出焦平面（blur 渐深）同时后景反向
// 收焦入场，焦点当剪辑点。同页面内区块→区块 / 文档长页游览的分段转场。
// 参考实现（真实纹理）：A 景 = projects-full 全满项目板，B 景 = wbr-full 周报页
// （同页不同区块的游览感）。节拍：0–24 A hold → 24–40 A 淡出 + blur 0→8px 推出，
// 同时 26–42 B 从 8px→0 收焦 + 淡入 + 反向滑入（错开 2f 起跑——同帧起跑读作
// 整屏糊掉）；两景在交叉窗口内互为焦点交换 → 42–120 B hold（真静止）。
// 浅景深语言先立后用：B 景收焦完成前只做焦点交换，不叠其他运动。
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';

export const FOCUSHANDOFF_DUR = 120;

const A_VIEW_Y = -180;

const Scene: React.FC = () => {
  const frame = useCurrentFrame();

  // A 景：24→40 淡出 + blur 加深 + 略推出（前景滑出焦平面）
  const aOut = interpolate(frame, [24, 40], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.3, 1),
  });
  const aBlur = aOut * 8;
  const aDrift = aOut * 60; // 轻微左移，读作"滑出"而非原地淡

  // B 景：26→42 收焦入场（错开 2f 起跑），8px→0 + 淡入 + 反向滑入
  const bIn = interpolate(frame, [26, 42], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const bBlur = (1 - bIn) * 8;
  const bDrift = (1 - bIn) * -50; // 反向（从右滑入）

  return (
    <AbsoluteFill style={{ backgroundColor: '#faf7f2', overflow: 'hidden' }}>
      {/* A 景 */}
      <div style={{ position: 'absolute', opacity: 1 - aOut, filter: `blur(${aBlur}px)`, transform: `translateX(${-aDrift}px)` }}>
        <Img
          src={staticFile('textures/live/projects-full.png')}
          style={{ position: 'absolute', left: 0, top: A_VIEW_Y, width: 1920 }}
        />
      </div>

      {/* B 景（上层，交叉窗口内收焦） */}
      <div style={{ position: 'absolute', opacity: bIn, filter: `blur(${bBlur}px)`, transform: `translateX(${bDrift}px)` }}>
        <Img
          src={staticFile('textures/live/wbr-full.png')}
          style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const FocusHandoffTransition: React.FC = () => (
  <Scene />
);
