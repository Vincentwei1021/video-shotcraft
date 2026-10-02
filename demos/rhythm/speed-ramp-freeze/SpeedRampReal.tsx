// speed-ramp 变速（轮 C）——真实卡片流帧号 remap：快(斜率 2.4) →
// 0.2x 慢速展示窗 → 快。慢速窗中目标卡（card4-hires）清晰滑过屏中。
// blur 联动速率：模糊量按 remap 后的实际速度算，快段糊、慢窗低于门限即裸渲，反差即"凝视感"。
// 质感：速率曲线两处换挡用 smoothstep 过渡（14–16f），源帧号是速率的闭式积分——
// 变速是"踩刹车/踩油门"而不是折线突变；运动模糊改用方向性 SpeedBlur（按速度逐帧计算），
// 去掉 CameraMotionBlur 多重采样把米白页面染黄的色偏；慢窗里目标卡随靠近屏中被"拾起"
// （抬高 18px + 放大 4.5% + 阴影加深），其余卡淡出 30% 让出视线；顶部挂真实页面导航条、
// 导轨上方是页面原生的分组标题，读得出这是产品里的项目流。
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { FONT, Grain, SpeedBlur, Vignette, softShadow, velocity } from '../../_fixtures/Polish';

export const SPEEDRAMP_DUR = 135;

const CARD_W = 540;
const GAP = 56;
const PITCH = CARD_W + GAP;
const RAIL = layout.projects.cards.slice(0, 9);
const TARGET_I = 5;
const RAIL_TOP = 352;
const PX_PER_SRC = 32; // 每个源帧的导轨位移（px）

// 速率曲线：快 2.4 → 慢 0.2 → 快 2.4，两处 smoothstep 过渡
const FAST = 2.4;
const SLOW = 0.2;
const A1 = 30, W1 = 16; // 刹车：30–46f
const A2 = 80, W2 = 14; // 油门：80–94f

// smoothstep 从 a 起、宽 w 的积分（闭式）：0 → w(t³ − t⁴/2) → w/2 + 线性
const intS = (f: number, a: number, w: number) => {
  if (f <= a) return 0;
  if (f >= a + w) return w * 0.5 + (f - a - w);
  const t = (f - a) / w;
  return w * (t * t * t - 0.5 * t * t * t * t);
};

// 源帧号 = 速率的积分（斜率即速率）
const srcAt = (f: number) => {
  const x = Math.max(0, Math.min(SPEEDRAMP_DUR, f));
  return FAST * x + (SLOW - FAST) * intS(x, A1, W1) + (FAST - SLOW) * intS(x, A2, W2);
};

// 慢窗中点（≈62f）时目标卡中心落屏中
const MID = (A1 + W1 / 2 + A2 + W2 / 2) / 2;
const OFFSET = 960 - (TARGET_I * PITCH + CARD_W / 2) + srcAt(MID) * PX_PER_SRC;
const railX = (f: number) => OFFSET - srcAt(f) * PX_PER_SRC;

const PAGE = '#f7f6f1'; // 页面原生米白底

export const SpeedRampReal: React.FC = () => {
  const frame = useCurrentFrame();
  const x0 = railX(frame);
  const v = velocity(railX, frame); // px/帧（负 = 向左）
  // 模糊门限：|v| < 8px/f（慢窗 ≈6.4）完全裸渲；之上按超出量给方向性模糊
  const blurV = Math.sign(v) * Math.max(0, Math.abs(v) - 8);

  // 目标卡"拾起"量：靠近屏中 × 慢速程度
  const tx = x0 + TARGET_I * PITCH + CARD_W / 2;
  const near = Math.max(0, 1 - Math.abs(tx - 960) / 760);
  const slowness = Math.max(0, Math.min(1, (24 - Math.abs(v)) / 16));
  const lift = near * near * (3 - 2 * near) * slowness;

  return (
    <AbsoluteFill style={{ backgroundColor: PAGE, overflow: 'hidden' }}>
      {/* 柔光：页面上方一抹暖白主光，底部轻压 */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 38%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 70%), linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(60,48,30,0.05) 100%)',
        }}
      />

      {/* 导轨上方的分组标题（页面原生样式：小号大写 + 右侧计数，按可读字高放大） */}
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          top: 262,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: FONT.sans,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: '#5f5a50',
        }}
      >
        <span>全部项目</span>
        <span style={{ fontWeight: 500, letterSpacing: '0.02em', color: '#8b8579', fontVariantNumeric: 'tabular-nums' }}>
          显示 10 / 10
        </span>
      </div>

      <SpeedBlur vx={blurV} amount={0.32} max={28}>
        <div style={{ position: 'absolute', left: 0, top: RAIL_TOP, transform: `translateX(${x0.toFixed(2)}px)` }}>
          {Array.from({ length: 16 }).map((_, k) => {
            const c = RAIL[k % RAIL.length];
            const isTarget = k === TARGET_I;
            const l = isTarget ? lift : 0;
            return (
              <Img
                key={k}
                src={staticFile(`textures/live/${isTarget ? 'card4-hires.png' : c.file}`)}
                style={{
                  position: 'absolute',
                  left: k * PITCH,
                  top: 0,
                  width: CARD_W,
                  borderRadius: 14,
                  transform: isTarget ? `translateY(${(-18 * l).toFixed(2)}px) scale(${(1 + 0.045 * l).toFixed(4)})` : undefined,
                  opacity: isTarget ? 1 : 1 - 0.3 * lift,
                  boxShadow: `0 0 0 1px rgba(60,48,30,0.06), ${softShadow(isTarget ? 5 + 27 * l : 5, { color: '#2a2216', strength: 0.9 })}`,
                  zIndex: isTarget ? 2 : 1,
                }}
              />
            );
          })}
        </div>
      </SpeedBlur>

      {/* 真实页面导航条（2x 截图） */}
      <Img
        src={staticFile('textures/live/nav.png')}
        style={{ position: 'absolute', left: 0, top: 0, width: 1920, boxShadow: '0 1px 0 rgba(60,48,30,0.06)' }}
      />

      <Vignette strength={0.14} inner={0.55} color="#3a3022" />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};
