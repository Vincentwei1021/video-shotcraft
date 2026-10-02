// E 式基本款 whip-pan——真实整页冻结纹理（demos/_textures/）。
// 世界：projects-full 顶部 section（A 景）与同页底部 section（B 景）横向并排
// ——模拟"功能段之间的区块交棒"，相机 8f 甩 2880px（峰值 ~780px/f），只在甩动段糊。
// 运动模糊：方向性高斯拖影按瞬时速度计算（SpeedBlur，sd ≈ 0.085 × 速度，封顶 64px），
// 起止帧速度低→几乎不糊、中段峰值→糊到不可辨，借糊帧换景；静止段不挂任何 filter。
// （旧版 CameraMotionBlur 20 次子帧叠加：8bit 累加让整片偏黄、静止帧也被染色，且拖影是
// 一格一格的回波而非连续涂抹——这里用单次方向模糊替代，颜色与静帧完全一致。）
// 节拍：0–35 A hold → 35–43 甩（糊）→ 43–120 B hold（真静止）。
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { velocity, SpeedBlur } from '../../_fixtures/Polish';

export const WHIPPAN_DUR = 120;

const SWING = 2880; // 1.5 屏
// 观察窗都对准 cards 网格区（页面空间 y≈247 起），viewport 顶对 y=180
const VIEW_Y = -180;

const dxAt = (f: number) =>
  interpolate(f, [35, 43], [0, SWING], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.6, 0, 0.4, 1),
  });

export const WhipPanReal: React.FC = () => {
  const frame = useCurrentFrame();
  const dx = dxAt(frame);
  const v = velocity(dxAt, frame); // px/f（相机向右 → 画面向左）
  return (
    <AbsoluteFill style={{ backgroundColor: '#f9f6f1', overflow: 'hidden' }}>
      <SpeedBlur vx={-v} amount={0.085} max={64}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${-dx}px)` }}>
          {/* A 景：项目板全满 */}
          <Img
            src={staticFile('textures/live/projects-full.png')}
            style={{ position: 'absolute', left: 0, top: VIEW_Y, width: 1920 }}
          />
          {/* 缝隙纸色空场 960px——甩动中段一晃而过，全糊 */}
          {/* B 景：同页底部 section（PERCEPTION & SENSING 区），换景可辨且内容饱满 */}
          <Img
            src={staticFile('textures/live/projects-full.png')}
            style={{ position: 'absolute', left: SWING, top: -666, width: 1920 }}
          />
        </div>
      </SpeedBlur>
    </AbsoluteFill>
  );
};
