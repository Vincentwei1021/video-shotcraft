// C 式 虚焦接力（focus-handoff）——前景滑出焦平面（blur 渐深）同时后景反向
// 收焦入场，焦点当剪辑点。同页面内区块→区块 / 文档长页游览的分段转场。
// 参考实现（真实纹理）：A/B 都取自**同一张** projects-full 长页——A 景对准
// 上部网格区（cards，y≈180 起），B 景对准**同一页的下半部**（Perception &
// Sensing / Research Infra 区块，y≈900 起），模拟"游览同一长页、区块接力"。
// 浅景深语言先立后用：从第 0 帧起画面上下缘就是焦外（同一纹理叠一层 3.5px 虚化副本，
// 用渐变遮罩只露上下 18% 的带），观众先认识"这台镜头景深很浅"，接力时焦点整体移走才可信。
// 运动方向按页面真实空间：B 在 A 的下方 → 两景都向上走（相机沿长页下移），不对撞。
// 节拍：0–24 A hold → 24–42 A 失焦 0→10px + 上移 70px + 呼吸放大 1.5% + 淡出，
// 27–44 B 错开 3f 起跑：10px→0 收焦 + 自下 70px 上移落位 + 呼吸 1.02→1 + 淡入
// （同帧起跑读作整屏糊掉）→ 44–120 B hold（真静止）。
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, bezier, ramp, mix, Vignette } from '../../_fixtures/Polish';

export const FOCUSHANDOFF_DUR = 120;

const PAGE_H = 1746; // projects-full 的 CSS 高（layout.projects.pageH）
// A 景观察窗：对准上部网格区（viewport 顶对页面 y=180）
const A_VIEW_Y = -180;
// B 景观察窗：同一页面的下半部（viewport 顶对页面 y=900），viewport 底不超页底
const B_VIEW_Y = -900;
const DRIFT = 70; // 两景同向上移量（px）
const FOCUS = bezier(0.45, 0, 0.3, 1); // 失焦：慢起、转折处最快
const EDGE_MASK = 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 82%, #000 100%)';

// 一景 = 清晰页面 + 上下缘焦外副本（浅景深常驻）
const PageLayer: React.FC<{ viewY: number }> = ({ viewY }) => {
  const img = (
    <Img
      src={staticFile('textures/live/projects-full.png')}
      style={{ position: 'absolute', left: 0, top: viewY, width: 1920, height: PAGE_H }}
    />
  );
  return (
    <>
      {img}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', filter: 'blur(3.5px)',
        WebkitMaskImage: EDGE_MASK, maskImage: EDGE_MASK,
      }}>
        {img}
      </div>
    </>
  );
};

const Scene: React.FC = () => {
  const frame = useCurrentFrame();

  // A 景：24→42 失焦 + 上移 + 呼吸放大；淡出 26→40（ease-in，越往后走得越快）
  const aF = ramp(frame, 24, 18, FOCUS);
  const aBlur = aF * 10;
  const aY = -DRIFT * ramp(frame, 24, 18, EASE.smooth);
  const aScale = 1 + 0.015 * aF;
  const aOpacity = 1 - ramp(frame, 26, 14, EASE.exit);

  // B 景：27→44 收焦（错开 3f 起跑），自下而上落位，呼吸 1.02→1；淡入 27→37（快）
  const bF = ramp(frame, 27, 17, EASE.out);
  const bBlur = (1 - bF) * 10;
  const bY = DRIFT * (1 - ramp(frame, 27, 17, EASE.snappy));
  const bScale = mix(1.02, 1, bF);
  const bOpacity = ramp(frame, 27, 10, EASE.out);
  const bSettled = frame >= 44;

  return (
    <AbsoluteFill style={{ backgroundColor: '#f9f6f1', overflow: 'hidden' }}>
      {/* A 景：同一页的上半部（网格区） */}
      {aOpacity > 0.001 && (
        <div style={{
          position: 'absolute', inset: 0, opacity: aOpacity, transformOrigin: '50% 50%',
          filter: aBlur > 0.05 ? `blur(${aBlur.toFixed(2)}px)` : undefined,
          transform: aF > 0 ? `translateY(${aY.toFixed(2)}px) scale(${aScale.toFixed(4)})` : undefined,
        }}>
          <PageLayer viewY={A_VIEW_Y} />
        </div>
      )}

      {/* B 景（上层）：同一页的下半部（sections 区），交叉窗口内收焦 */}
      {frame >= 27 && (
        <div style={{
          position: 'absolute', inset: 0, opacity: bOpacity, transformOrigin: '50% 50%',
          filter: !bSettled && bBlur > 0.05 ? `blur(${bBlur.toFixed(2)}px)` : undefined,
          transform: !bSettled ? `translateY(${bY.toFixed(2)}px) scale(${bScale.toFixed(4)})` : undefined,
        }}>
          <PageLayer viewY={B_VIEW_Y} />
        </div>
      )}

      {/* 镜头暗角：极轻，给"透过镜头看"的空间感 */}
      <Vignette strength={0.12} inner={0.55} color="#3a3328" />
    </AbsoluteFill>
  );
};

export const FocusHandoffTransition: React.FC = () => (
  <Scene />
);
