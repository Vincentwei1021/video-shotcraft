// 升降臂拉升揭示（crane-rise-reveal）——crane shot。
// 世界 = FakeDashboard(B) 五行列表。相机 transform-origin 左上，联动公式：
// translate = 屏幕中心 - 对准点*scale（对准点始终落在屏幕中心）。
// 帧 0–20 hold 在底行特写（scale 3.2，取景下缘贴住页面底边——不露页外空底），
//   hold 内相机极轻地"吸一口气"（+1.5% 推近，ease-in-out 收到零速）= 起吊前的预备；
// 帧 20–120 scale→1 + 对准点 → (960,540)，同一条不对称缓动 p 驱动：
//   起步 ~19f 加速（不从静止瞬间跳到最高速）、随后长尾减速临顶缓停——升降臂手感；
// 视野上缘每越过一行顶边，该行深色脉冲一拍（4f 起 18f 落）读作"涌入"；
// 快速段（前 ~45f）包 CameraMotionBlur，慢速段不包（免得抹软文字）；帧 120–150 满幅真静止。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';
import { bezier, ramp, mix, EASE, Grain, Vignette } from '../../_fixtures/Polish';

export const CRANE_RISE_REVEAL_DURATION = 150; // 特写 hold 20f + 拉升 100f + 满幅静止 30f

const HOLD = 20; // 开场特写 hold
const MOVE_END = 120; // 运镜结束，此后真静止
const BLUR_END = 62; // 运动模糊只包快速段（速度降到峰值 ~35% 以下即撤）
// 升降臂曲线：零速起步、~19% 处到峰速（≈2.3× 平均速度，接近原 out(quad) 的 2×），
// 然后一路长尾减速到零（不对称 in-out）；半程已走完 79% 行程 = "起步有劲、临顶缓停"
const crane = bezier(0.2, 0, 0.25, 1);

// FakeDashboard(B) 行几何：侧栏 220 + 内容 padding 36，header 72，5 行 gap 20
const ROW_LEFT = 220 + 36;
const ROW_W = 1920 - ROW_LEFT - 36;
const ROW_H = (1080 - 72 - 72 - 4 * 20) / 5; // 171.2
const rowTop = (i: number) => 72 + 36 + i * (ROW_H + 20);

const S0 = 3.2;
const BREATH = 0.015; // hold 段的预备推近量（比例）
const S_PEAK = S0 * (1 + BREATH);
// 起点对准最底行：x 让行首图标/标题落在画面左半，y 让取景下缘恰好贴住页面底边（1080）
const F0 = { x: 540, y: 1080 - 540 / S_PEAK };
const F1 = { x: 960, y: 540 }; // 终点对准整页中心
// 取景框下缘 fy+540/s 是 p 的凸函数、两端都 = 1080 → 全程不露页外空底

const camAt = (frame: number) => {
  const breath = ramp(frame, 0, HOLD, EASE.smooth); // 0→1，两端零速
  const e = crane(Math.min(1, Math.max(0, (frame - HOLD) / (MOVE_END - HOLD))));
  const s0 = S0 * (1 + BREATH * breath);
  const s = mix(s0, 1, e);
  const fx = mix(F0.x, F1.x, e);
  // hold 段推近时对准点同步下移，保持下缘贴底
  const fy0 = 1080 - 540 / s0;
  const fy = mix(fy0, F1.y, e);
  return { s, tx: 960 - fx * s, ty: 540 - fy * s, visTop: fy - 540 / s };
};

// 每行脉冲触发帧：视野上缘首次越过该行顶边（底行开场已在画内 → 运动一起步即触发）
const triggers = Array.from({ length: 5 }, (_, i) => {
  for (let f = HOLD; f <= MOVE_END; f++) {
    if (camAt(f).visTop <= rowTop(i) + 1) return f;
  }
  return MOVE_END;
});

// 相机层：world 坐标系 → 屏幕（页面与脉冲层共用同一台相机）
const Cam: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { s, tx, ty } = camAt(frame);
  return (
    <div
      style={{
        position: 'absolute',
        width: 1920,
        height: 1080,
        transformOrigin: '0 0',
        transform: `translate(${tx}px, ${ty}px) scale(${s})`,
      }}
    >
      {children}
    </div>
  );
};

const Page: React.FC = () => (
  <AbsoluteFill style={{ background: G.canvas, overflow: 'hidden' }}>
    <Cam>
      <FakeDashboard variant="B" />
    </Cam>
  </AbsoluteFill>
);

// 行脉冲层不进 CameraMotionBlur：半透明色块被多重采样叠加会出现条带伪影，且平涂色块模糊与否看不出
const Pulses: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Cam>
        {triggers.map((t, i) => {
          // 白卡上提亮不可见、加深才可感：洗一拍带强调色相的"选中态"深色（左浓右淡，像从行首掠过），
          // 同步一圈强调色细描边——读作"这一行刚被选中/进来"，比纯灰块干净
          const op = interpolate(frame, [t, t + 4, t + 22], [0, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: EASE.out,
          });
          if (op <= 0.001) return null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: ROW_LEFT,
                top: rowTop(i),
                width: ROW_W,
                height: ROW_H,
                borderRadius: 14,
                opacity: op,
                background:
                  'linear-gradient(90deg, rgba(60,66,150,0.16) 0%, rgba(60,66,150,0.09) 50%, rgba(60,66,150,0.05) 100%)',
                boxShadow: 'inset 0 0 0 1.5px rgba(91,99,211,0.5)',
              }}
            />
          );
        })}
      </Cam>
    </AbsoluteFill>
  );
};

export const CraneRiseReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const fast = frame > HOLD && frame < BLUR_END;
  // 暗角随相机拉开而收淡：特写时压边聚焦那一行，满幅时几乎无暗角、页面干净
  const vig = interpolate(frame, [HOLD, MOVE_END], [0.16, 0.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.swift,
  });
  return (
    <AbsoluteFill style={{ background: G.canvas, overflow: 'hidden' }}>
      {fast ? (
        <CameraMotionBlur shutterAngle={130} samples={10}>
          <Page />
        </CameraMotionBlur>
      ) : (
        <Page />
      )}
      <Pulses />
      <Vignette strength={vig} inner={0.55} color="#1a1c24" />
      <Grain opacity={0.035} />
    </AbsoluteFill>
  );
};
