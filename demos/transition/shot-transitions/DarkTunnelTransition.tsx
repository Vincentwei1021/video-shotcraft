// B 式 穿暗场直航（dark-tunnel）——相机顺运动方向推出前景 → 纯暗场滑行几帧 →
// 后景从景深迎面放大而来，一条 take 不切。高能量→高能量的场景跳转主力转场。
// 参考实现（真实纹理）：A 景 = projects-full 全满项目板，B 景 = wbr-full 周报页。
// 一条 take 的命门是"只有一台相机"：A、暗场尘流、B 全部由同一条相机行程 cam(f) 驱动
// （A 在世界 x=0、B 在世界 x=D），速度曲线天然连续——前镜推出时一路加速、暗场里达到
// 峰值（~660px/f）、迎入 B 时一路减速长尾落定，中途不回摆、不停顿。
// A 推出时同时被"推近"（scale 1→1.18）并压暗；B 从 0.62 + 失焦 10px 迎面放大收焦；
// 暗场段：带色相深底 + 中心冷光 + 暗角 + 颗粒，三层视差尘流按速度拉成拖影
// （"still moving"可感，不是纯黑死帧）；两景按速度挂横向运动模糊，静止时为 0。
// 节拍：0–26 A hold → 26–37 推出（11f）→ 37–41 暗场滑行（5f）→ 42–56 B 迎入减速（14f）
// → 56–120 B hold（真静止）。
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { bezier, ramp, mix, velocity, SpeedBlur, Grain, Vignette } from '../../_fixtures/Polish';

export const DARKTUNNEL_DUR = 120;

// 两景都以 cards 网格区为观察窗；A 景顶对 y=180，B 景（wbr）顶对 y=0
const A_VIEW_Y = -180;
const D = 6400; // 世界里 A→B 的距离（决定暗场滑行 ~5f）
const TRAVEL = bezier(0.55, 0, 0.2, 1); // 加速推出 → 峰值 → 长尾减速迎入
const camAt = (f: number) => D * TRAVEL((f - 26) / 30);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
// B 迎入进度：相机距 B 1800px 内从 0→1（驱动放大与收焦）
const bApproach = (cam: number) => clamp01((cam - (D - 1800)) / 1800);

// 尘流：确定性 index 派生（渲染必须可复现），三层 depth 视差
const DUST = Array.from({ length: 54 }, (_, i) => {
  const h = (n: number) => {
    const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const depth = [0.55, 0.85, 1.25][i % 3];
  return { wx: 1200 + h(1) * (D + 600), y: 120 + h(2) * 840, depth, a: 0.25 + h(3) * 0.4, s: 1.4 + h(4) * 1.6 };
});

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  const v = velocity(camAt, frame); // 相机速度 px/f（>0 向右）

  // A：屏幕空间向左 = 相机向右；同时被推近、压暗
  const aPush = clamp01(cam / 1920);
  const aScale = 1 + 0.18 * aPush;
  const aDim = 0.55 * aPush;

  // B：世界 x=D，迎面放大收焦
  const k = bApproach(cam);
  const bScale = mix(0.62, 1, k);
  const bBlur = (1 - k) * 10;
  const bX = D - cam;

  // 暗场氛围：A 开始推出才亮起，B 落定后由 B 完全覆盖
  const tunnel = ramp(frame, 28, 8);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0b0c10', overflow: 'hidden' }}>
      {/* 暗场：带色相深底 + 中心冷光 + 暗角 + 颗粒 */}
      <AbsoluteFill style={{
        opacity: tunnel,
        background: 'radial-gradient(ellipse 52% 48% at 50% 46%, rgba(64,70,96,0.55) 0%, rgba(26,28,38,0.5) 50%, rgba(11,12,16,0) 100%)',
      }} />
      {/* 尘流：世界固定、随相机向左掠过；拖影长度 = 速度 × depth */}
      {tunnel > 0.01 && DUST.map((d, i) => {
        const x = d.wx - cam * d.depth;
        const len = Math.max(d.s * 2, Math.abs(v) * d.depth * 0.55);
        if (x + len < -20 || x > 1940) return null;
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: d.y, width: len, height: d.s * d.depth, borderRadius: 4,
            opacity: d.a * tunnel * (d.depth > 1 ? 0.8 : 1),
            background: 'linear-gradient(90deg, rgba(170,180,210,0.9), rgba(170,180,210,0))',
            filter: d.depth > 1 ? 'blur(1.5px)' : undefined,
          }} />
        );
      })}
      <Vignette strength={0.6} inner={0.35} color="#030405" style={{ opacity: tunnel }} />
      <Grain opacity={0.09 * tunnel} blend="soft-light" />

      {/* A 景（推出段） */}
      {frame < 40 ? (
        <SpeedBlur vx={-v} amount={0.06} max={40}>
          <div style={{
            position: 'absolute', inset: 0, transform: `translateX(${-cam}px) scale(${aScale})`, transformOrigin: '50% 45%',
            boxShadow: aPush > 0 ? '0 40px 120px rgba(0,0,0,0.55)' : undefined, overflow: 'hidden',
          }}>
            <Img
              src={staticFile('textures/live/projects-full.png')}
              style={{ position: 'absolute', left: 0, top: A_VIEW_Y, width: 1920 }}
            />
            {aDim > 0.002 && <div style={{ position: 'absolute', inset: 0, background: `rgba(9,10,14,${aDim.toFixed(3)})` }} />}
          </div>
        </SpeedBlur>
      ) : null}

      {/* B 景：同一相机行程迎入 + 放大 + 收焦 */}
      {frame >= 38 ? (
        <SpeedBlur vx={-v} amount={0.06} max={40}>
          <div
            style={{
              position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, overflow: 'hidden',
              transform: bX > 0.05 || k < 1 ? `translateX(${bX}px) scale(${bScale})` : undefined,
              filter: bBlur > 0.05 ? `blur(${bBlur.toFixed(2)}px)` : undefined,
              transformOrigin: '50% 45%', boxShadow: k < 1 ? '0 40px 120px rgba(0,0,0,0.55)' : undefined,
            }}
          >
            <Img
              src={staticFile('textures/live/wbr-full.png')}
              style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 }}
            />
            {k < 1 && <div style={{ position: 'absolute', inset: 0, background: `rgba(9,10,14,${(0.5 * (1 - k)).toFixed(3)})` }} />}
          </div>
        </SpeedBlur>
      ) : null}
    </AbsoluteFill>
  );
};

export const DarkTunnelTransition: React.FC = () => (
  <Scene />
);
