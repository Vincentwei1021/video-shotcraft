// smash-cut｜猛切（喧闹→死寂）
// 0–41f 轰鸣段：5 张 Card 多方向高速飞掠冲镜（穿屏 translate + scale 1.5→3
// 冲脸 + 微 rotate，各卡错峰跑两轮，第二轮更快=整体仍在加速），背景
// FakeDashboard A 以 ease-in 持续加速推近 1→1.55 并滚动 rotate 1.8°——
// 切点前一刻动势最猛。42f 一帧硬切 variant B 整齐静止全景，无一物在动，
// 停满 93f（>50f）。反差即手法本体。总 135f。
// 质感：飞卡的模糊改为沿各自飞行方向的方向性运动模糊（速度门控：按瞬时速度逐帧算，
// 慢时清、快时拖），不再是各向同性的整体糊；飞卡阴影随冲脸程度从悬浮加到飞行级；
// 背景轻糊之外再叠一层随动势收紧的暗角与轻微提对比，切点前画面"憋到最满"；
// 死寂段是干净的 B 全景 + 固定轻暗角（静态层，无颗粒、无任何随帧变化），帧函数级真静止。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card, FakeDashboard } from '../../_fixtures/Fixtures';
import { Grain, Vignette, softShadow } from '../../_fixtures/Polish';

export const SMASH_CUT_DURATION = 135; // 轰鸣 42f + 死寂 93f

const CUT = 42; // 硬切帧：>=42 全静止

// 每张飞卡：两轮 pass，第二轮更短（更快），ease-in 让每一程都在加速。
// from/to 为屏幕外起终点（中心系坐标），飞行中 scale 1.5→3 冲脸。
type Fly = {
  from: [number, number];
  to: [number, number];
  rot: [number, number]; // 微旋转 起→终
  seed: number;
  w: number;
  h: number;
};

const FLIES: Fly[] = [
  { from: [-1400, -120], to: [1400, 60], rot: [-6, 5], seed: 1, w: 440, h: 290 },
  { from: [1400, 180], to: [-1400, -100], rot: [7, -4], seed: 2, w: 400, h: 260 },
  { from: [-300, -900], to: [200, 900], rot: [-3, 8], seed: 3, w: 460, h: 300 },
  { from: [-1300, 800], to: [1300, -750], rot: [5, -7], seed: 4, w: 420, h: 280 },
  { from: [1350, -780], to: [-1350, 820], rot: [-8, 4], seed: 5, w: 480, h: 310 },
];

// 卡 i 的第 k 轮：start = i*4 + k*20，时长 16 / 12（第二轮更快）。
// card4 第二轮 36–48f 在切点 42f 被硬切截断——正中"绝不减速迎接切点"。
const passWindow = (i: number, k: number): [number, number] => {
  const start = i * 4 + k * 20;
  const dur = k === 0 ? 16 : 12;
  return [start, start + dur];
};

// ease-in 进度（quad）：全程加速，越接近终点越快
const progress = (frame: number, s: number, e: number) =>
  interpolate(frame, [s, e], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });

const FlyCard: React.FC<{ fly: Fly; i: number; frame: number }> = ({ fly, i, frame }) => {
  // 滤镜 ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  // 找当前活跃的 pass（两轮）
  let active: [number, number] | null = null;
  for (let k = 0; k < 2; k++) {
    const [s, e] = passWindow(i, k);
    if (frame >= s && frame < e) {
      active = [s, e];
      break;
    }
  }
  if (!active) return null;
  const [s, e] = active;
  const p = progress(frame, s, e);
  const x = fly.from[0] + (fly.to[0] - fly.from[0]) * p;
  const y = fly.from[1] + (fly.to[1] - fly.from[1]) * p;
  const rot = fly.rot[0] + (fly.rot[1] - fly.rot[0]) * p;
  const scale = 1.5 + 1.5 * p; // 1.5 → 3 冲脸

  // 瞬时速度（px/帧，中心差分）→ 沿飞行方向的模糊：门控起点 20px/f，封顶 18（卡片本地坐标）
  const dp = progress(frame + 0.5, s, e) - progress(frame - 0.5, s, e);
  const vx = (fly.to[0] - fly.from[0]) * dp;
  const vy = (fly.to[1] - fly.from[1]) * dp;
  const speed = Math.hypot(vx, vy);
  const sd = Math.min(18, Math.max(0, speed - 20) * 0.12) / scale; // 先 blur 后 scale，按倍率折回
  const dir = (Math.atan2(vy, vx) * 180) / Math.PI;
  const fid = `smash-blur-${i}-${uid}`;

  return (
    <div
      style={{
        position: 'absolute',
        left: 960 - fly.w / 2,
        top: 540 - fly.h / 2,
        width: fly.w,
        height: fly.h,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
      }}
    >
      {sd > 0.3 && (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id={fid} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${sd.toFixed(2)} 0`} edgeMode="none" />
          </filter>
        </svg>
      )}
      {/* 旋到飞行方向 → 只沿本地 x 轴模糊 → 反向旋回，再叠卡自身的微旋转 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `rotate(${dir}deg)`,
          filter: sd > 0.3 ? `url(#${fid})` : undefined,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: `rotate(${-dir + rot}deg)` }}>
          <Card
            w={fly.w}
            h={fly.h}
            seed={fly.seed}
            style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(16 + 32 * p, { strength: 1.4 })}` }}
          />
        </div>
      </div>
    </div>
  );
};

export const SmashCut: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 死寂段：42f 起 variant B 整齐静止全景，无任何动画属性（静态暗角为固定值）——
  if (frame >= CUT) {
    return (
      <AbsoluteFill style={{ background: G.canvas }}>
        <FakeDashboard variant="B" />
        <Vignette strength={0.12} inner={0.55} color="#1a1c24" />
      </AbsoluteFill>
    );
  }

  // —— 轰鸣段：背景 ease-in 加速推近 + 滚动，切点前 3f 仍在加速 ——
  const k = interpolate(frame, [0, CUT], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  const bgScale = 1 + 0.55 * k;
  const bgRot = 1.8 * k;

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${bgScale}) rotate(${bgRot}deg)`,
          transformOrigin: '50% 50%',
          filter: `blur(1.5px) contrast(${(1 + 0.08 * k).toFixed(3)})`, // 背景轻糊衬前景飞卡；动势越猛对比越硬
        }}
      >
        <FakeDashboard variant="A" />
      </div>
      {/* 动势暗角：0.18 → 0.46 随推近收紧，把能量往画面中心挤 */}
      <Vignette strength={0.18 + 0.28 * k} inner={0.5 - 0.15 * k} color="#12131a" />
      {FLIES.map((fly, i) => (
        <FlyCard key={i} fly={fly} i={i} frame={frame} />
      ))}
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
