// 立方体空间翻转（cube-rotate）——cube transition 转场自实现。
// FakeDashboard A / B 各按 0.82 布局缩放（CSS zoom，按目标尺寸排版 → 3D 里文字不糊），
// 当立方体相邻两面：perspective 1400px，面宽 W=1920*0.82，两面各 rotateY(面角)
// translateZ(W/2)，场景整体先 translateZ(-W/2) 再 rotateY(θ)（把正面拉回 z=0，
// 保证 hold 时精确 0.82 尺度）。
// 体块感三件事：①明暗——按面法线与正面的夹角做兰伯特式压暗（正对 1 → 侧转 90° 0.55），
// 远离镜头的一侧再多压一档；共享棱是凸角，转动时亮起一条 1px 受光细棱；
// ②重量——θ 曲线先回拉 ~1.4°（预备）再转、到位后过冲 ~1.4° 回落（落定）；
// 转动中相机轻退 6%（凸角迎向镜头时不出框），立方体下有随投影宽度变化的地面软影；
// ③速度——按棱上线速度挂横向运动模糊，静止为 0（filter 条件挂载，收尾逐帧完全相同）。
// 关键帧：0–30 静止展示 A → 30–68 θ 0→-90° 翻转 → 68–140 B 真静止 72f。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { bezier, ramp, velocity, SpeedBlur, Backdrop } from '../../_fixtures/Polish';

export const CUBE_ROTATE_DURATION = 140;

const S = 0.82;
const W = 1920 * S; // 面宽 = 立方体棱长
const H = 1080 * S;
const LEFT = (1920 - W) / 2;
const TOP = (1080 - H) / 2 - 14; // 略高于几何中心，给地面软影留位置

// 翻转曲线：先回拉 ~1.6%（≈1.4°）再加速转、到位过冲 ~1.6% 回落
const TURN = bezier(0.6, -0.18, 0.2, 1.18);
const thetaAt = (f: number) => -90 * ramp(f, 30, 38, TURN);

// 单个立方体面：W×H 视口内放 0.82 布局的整幅 dashboard + 明暗层
const Face: React.FC<{
  variant: 'A' | 'B';
  rot: number; // 面自身的 rotateY（A=0，B=90）
  normal: number; // 面法线相对镜头的当前角度（deg，0 = 正对）
  edgeGlow: number; // 共享棱高光 0–1
  edgeSide: 'right' | 'left'; // 共享棱在本面的哪条竖边
}> = ({ variant, rot, normal, edgeGlow, edgeSide }) => {
  const c = Math.cos((Math.min(90, Math.abs(normal)) * Math.PI) / 180);
  const shade = 1 - (0.55 + 0.45 * c); // 0（正对）→ 0.45（侧转 90°）
  // 远离镜头的一侧：A 转向左 → 左缘远；B 从右侧转入 → 右缘远（= 非共享棱一侧）
  const farSide = edgeSide === 'right' ? 'left' : 'right';
  return (
    <div style={{
      position: 'absolute', width: W, height: H, overflow: 'hidden',
      backfaceVisibility: 'hidden',
      transform: `rotateY(${rot}deg) translateZ(${W / 2}px)`,
    }}>
      <div style={{ width: 1920, height: 1080, zoom: S }}>
        <FakeDashboard variant={variant} />
      </div>
      {/* 面的发丝外缘：亮场里让体块轮廓立得住 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 0 1px rgba(20,22,28,0.10)' }} />
      {shade > 0.003 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(to ${farSide}, rgba(12,13,18,${(shade * 0.75).toFixed(3)}) 0%, rgba(12,13,18,${Math.min(0.62, shade * 1.25).toFixed(3)}) 100%)`,
        }} />
      )}
      {edgeGlow > 0.01 && (
        <div style={{
          position: 'absolute', top: 0, [edgeSide]: 0, width: 2, height: H, opacity: edgeGlow,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.6))',
        }} />
      )}
    </div>
  );
};

export const CubeRotate: React.FC = () => {
  const frame = useCurrentFrame();
  const theta = thetaAt(frame);
  const p = Math.min(1, Math.max(0, -theta / 90)); // 翻转进度（可微越界，钳给明暗用）
  const mid = Math.sin(p * Math.PI); // 0→1→0，45° 时最大

  // 相机轻退：凸角迎向镜头时整体 1 → 0.94 → 1，平滑起止
  const dolly = 1 - 0.06 * mid;
  // 棱上线速度（px/帧）→ 横向运动模糊
  const omega = (velocity(thetaAt, frame) * Math.PI) / 180;
  const vx = omega * (W / 2);

  // 地面软影：宽度随投影宽度（正对 W → 45° 约 1.41W 再回 W）
  const shadowW = W * (1 + 0.36 * mid) * dolly;

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.42, y: 0.12 }} accent="#5b63d3" grain={0} vignette={0.2} />
      {/* 地面软影：近地小而实 + 远地大而虚 */}
      <div style={{
        position: 'absolute', left: 960 - shadowW / 2, top: TOP + H * dolly + (H * (1 - dolly)) / 2 - 18,
        width: shadowW, height: 64, borderRadius: '50%',
        background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(20,22,32,0.30), rgba(20,22,32,0.10) 55%, rgba(20,22,32,0) 100%)',
        filter: 'blur(10px)',
      }} />
      <div style={{
        position: 'absolute', left: 960 - (shadowW * 0.96) / 2, top: TOP + H * dolly + (H * (1 - dolly)) / 2 - 4,
        width: shadowW * 0.96, height: 14, borderRadius: '50%',
        background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(20,22,32,0.28), rgba(20,22,32,0) 100%)',
        filter: 'blur(3px)',
      }} />
      <SpeedBlur vx={vx} amount={0.035} max={3.5}>
        <div style={{
          position: 'absolute', left: LEFT, top: TOP, width: W, height: H,
          perspective: 1400, transform: `scale(${dolly})`, transformOrigin: '50% 50%',
        }}>
          <div style={{
            position: 'absolute', inset: 0, transformStyle: 'preserve-3d',
            transform: `translateZ(${-W / 2}px) rotateY(${theta}deg)`,
          }}>
            {/* 面 A：正面出发，绕左而去；共享棱在其右边 */}
            <Face variant="A" rot={0} normal={theta} edgeGlow={mid} edgeSide="right" />
            {/* 面 B：从 +90° 侧面转进来；共享棱在其左边 */}
            <Face variant="B" rot={90} normal={theta + 90} edgeGlow={mid} edgeSide="left" />
          </div>
        </div>
      </SpeedBlur>
    </div>
  );
};
