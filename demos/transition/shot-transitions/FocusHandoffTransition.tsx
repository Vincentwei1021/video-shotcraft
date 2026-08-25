// C 式 虚焦接力（focus-handoff）——前景滑出焦平面（blur 渐深）同时后景反向
// 收焦入场，焦点当剪辑点。同页面内区块→区块 / 文档长页游览的分段转场。
// 参考实现（真实纹理）：A/B 都取自**同一张** projects-full 长页——A 景对准
// 上部网格区（cards，y≈180 起），B 景对准**同一页的下半部**（Perception &
// Sensing / Research Infra 区块，y≈900 起），模拟"游览同一长页、区块接力"。
// 节拍：0–24 A hold → 24–40 A 淡出 + blur 0→8px 推出，同时 26–42 B 从 8px→0
// 收焦 + 淡入 + 反向滑入（错开 2f 起跑——同帧起跑读作整屏糊掉）；两景在交叉
// 窗口内互为焦点交换 → 42–120 B hold（真静止）。浅景深语言先立后用。
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';

export const FOCUSHANDOFF_DUR = 120;

const PAGE_H = 1746; // projects-full 的 CSS 高（layout.projects.pageH）
// A 景观察窗：对准上部网格区（viewport 顶对页面 y=180）
const A_VIEW_Y = -180;
// B 景观察窗：同一页面的下半部（viewport 顶对页面 y=900，显示
// Perception & Sensing / Research Infra 区块），viewport 底不超页底
const B_VIEW_Y = -900;

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
      {/* A 景：同一页的上半部（网格区） */}
      <div style={{ position: 'absolute', opacity: 1 - aOut, filter: `blur(${aBlur}px)`, transform: `translateX(${-aDrift}px)` }}>
        <Img
          src={staticFile('textures/live/projects-full.png')}
          style={{ position: 'absolute', left: 0, top: A_VIEW_Y, width: 1920, height: PAGE_H }}
        />
      </div>

      {/* B 景（上层）：同一页的下半部（sections 区），交叉窗口内收焦 */}
      <div style={{ position: 'absolute', opacity: bIn, filter: `blur(${bBlur}px)`, transform: `translateX(${bDrift}px)` }}>
        <Img
          src={staticFile('textures/live/projects-full.png')}
          style={{ position: 'absolute', left: 0, top: B_VIEW_Y, width: 1920, height: PAGE_H }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const FocusHandoffTransition: React.FC = () => (
  <Scene />
);
