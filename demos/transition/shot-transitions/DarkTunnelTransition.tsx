// B 式 穿暗场直航（dark-tunnel）——相机顺运动方向推出前景 → 纯暗场滑行几帧 →
// 后景从景深迎面放大而来，一条 take 不切。高能量→高能量的场景跳转主力转场。
// 参考实现（真实纹理）：A 景 = projects-full 全满项目板（前镜收尾段），
// 推出 10f 相机向右（前景在屏幕空间向左滑出画）；暗场段保留微渐变尘点让
// "still moving" 可感，不纯黑死场；B 景 = wbr-full 周报页从 scale ~0.6 + blur
// 起步、10f 放大收焦入场。出与入同向（相机向右推出 → B 景从右缘迎来、
// 屏幕空间同样向左），速度曲线连续。
// 节拍：0–26 A hold → 26–36 推出（前景左移出画，暗场 32f 起淡入压住尾巴，
// 不留纯黑死帧）→ 40–42 暗场满 → 42–52 B 放大入场 → 52–120 B hold（真静止）。
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';

export const DARKTUNNEL_DUR = 120;

// 两景都以 cards 网格区为观察窗；A 景顶对 y=180，B 景（wbr）顶对 y=0
const A_VIEW_Y = -180;
const A_W = 1920;

const Scene: React.FC = () => {
  const frame = useCurrentFrame();

  // A 景推出：26→36，相机向右推 = 前景在屏幕空间向左平移出画。
  // 屏幕空间方向必须与 B 景一致（都向左）：之前写成 0→+1920（内容向右）
  // 与 B 景 +960→0（向左）对撞，读作两条片子硬拼。
  const pushX = interpolate(frame, [26, 36], [0, -A_W], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.2, 1),
  });

  // 暗场：32→40 从 0→1（进入暗场），42→50 1→0（让 B 景迎入可见）。
  // 淡入必须压着 A 段推出的尾巴（f34–35 A 景已基本出画）——从 f36 才起
  // 会先漏 2f 纯黑死帧；不纯黑——保留微渐变 + 尘点，让"still moving"可感
  const tunnelVis = interpolate(frame, [32, 40, 42, 50], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.6, 1),
  });

  // B 景迎面放大入场：42→52，从 scale 0.6 + blur 起步收焦，同时沿
  // 与 A 相同的运动轴（X 向右）继续移动——出与入同向、速度连续，
  // 读作"穿过暗场直航"而不是两景各自动自己的。
  const bIn = interpolate(frame, [42, 52], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const bScale = 0.6 + 0.4 * bIn;
  const bBlur = (1 - bIn) * 12;
  // 从右缘滑入（+960→0），屏幕空间向左——与 A 段前景向左出画同向，
  // 相机就是一路向右的一条 take。
  const bShiftX = (1 - bIn) * 960;

  // 尘点：确定性 index 派生（渲染必须可复现）。相机一路向右，
  // 世界固定的尘点在屏幕空间向左掠过——漂移方向必须与两景同向
  const DUST = Array.from({ length: 4 }, (_, i) => ({
    x: 780 + i * 320,
    y: 300 + ((i * 137) % 480),
    drift: 6 + (i % 3) * 4, // px/frame，缓慢漂移表示"still moving"
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: '#0d0d10', overflow: 'hidden' }}>
      {/* A 景（推出段） */}
      {frame < 42 ? (
        <div style={{ position: 'absolute', transform: `translateX(${pushX}px)` }}>
          <Img
            src={staticFile('textures/live/projects-full.png')}
            style={{ position: 'absolute', left: 0, top: A_VIEW_Y, width: A_W }}
          />
        </div>
      ) : null}

      {/* 暗场：微渐变 + 尘点，非纯黑死场 */}
      {frame >= 32 && frame < 50 ? (
        <AbsoluteFill style={{ opacity: tunnelVis, pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(900px 500px at 50% 45%, rgba(40,42,50,0.9), rgba(12,12,16,1) 70%)',
            }}
          />
          {DUST.map((d, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', left: d.x - frame * d.drift, top: d.y,
                width: 2, height: 2, borderRadius: '50%',
                background: 'rgba(120,125,140,0.35)',
              }}
            />
          ))}
        </AbsoluteFill>
      ) : null}

      {/* B 景：沿 A 的运动轴继续向右滑入（自左缘）+ 迎面放大 + 收焦 */}
      {frame >= 42 ? (
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: 1920, height: 1080,
            transform: `translateX(${bShiftX}px) scale(${bScale})`, filter: `blur(${bBlur}px)`,
            transformOrigin: '50% 45%',
          }}
        >
          <Img
            src={staticFile('textures/live/wbr-full.png')}
            style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 }}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const DarkTunnelTransition: React.FC = () => (
  <Scene />
);
