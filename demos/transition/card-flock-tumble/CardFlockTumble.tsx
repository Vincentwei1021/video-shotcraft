// card-flock-tumble v5 —— 批次 14 按用户意见再改（承 v4）：
// 用户意见（逐字）："首先三个页面不要加模糊效果；然后那个水波扩散一个
// 圆环就够，不是多个；但是效果你截图看看原片的样式，要一样"
// 落实：①三卡全程清晰——翻飞中段 motion blur、收束段 blur 全删；
// ②多圈同心水波删掉，只留一个环；③环样式对照原片密帧（12fps）重做：
//    原片是单个湍流烟雾环——边缘破碎起絮、环身明暗斑块交错、粉紫为主
//    顶部偏奶桃色、出现后减速外扩且全程缓慢长大、衰减极慢（片尾仍在，
//    弥散变淡而非熄灭）、中心无水面光。用 feTurbulence+位移贴图模拟。
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const FONT = '"Avenir Next", Futura, "Helvetica Neue", sans-serif';

// ---------- 时间轴（30fps / 130f） ----------
const WALL_UP = [6, 22] as const; // 墙亮起
const FLIGHT = [10, 54] as const; // 侧棱→翻飞→站定：一条连续样条
const CARD_OUT = [62, 72] as const; // 收束（快！10 帧向中心聚拢）
const RING_T0 = 70; // 波纹环自收束点扩散
const TEXT_T0 = 84; // STRONGER 出现

// ---------- 霓虹描边文字墙（S2：黄左→品红→紫→蓝右） ----------
const ROW_GRADS: [string, string][] = [
  ['#ffe14d', '#5ad0ff'],
  ['#ff5ad0', '#7d8bff'],
  ['#ffb84d', '#b46bff'],
];
const NeonWall: React.FC<{ frame: number }> = ({ frame }) => {
  const up = interpolate(frame, [WALL_UP[0], WALL_UP[1]], [0.12, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const out = interpolate(frame, [CARD_OUT[0], CARD_OUT[1] + 4], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blurOut = interpolate(frame, [CARD_OUT[0], CARD_OUT[1] + 4], [0, 26], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (out <= 0.01) return null;
  const drift = frame * 2.0;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', opacity: up * out, filter: `blur(${blurOut}px)` }}>
      {Array.from({ length: 3 }).map((_, row) => {
        const [cL, cR] = ROW_GRADS[row];
        return (
          <div
            key={row}
            style={{
              position: 'absolute',
              top: -140 + row * 380,
              left: 0,
              whiteSpace: 'nowrap',
              fontFamily: FONT,
              fontWeight: 800,
              fontStyle: 'italic',
              fontSize: 330,
              letterSpacing: 6,
              transform: `translateX(${(row % 2 === 0 ? -1 : 1) * drift - 600}px)`,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                style={{
                  marginRight: 70,
                  color: 'transparent',
                  WebkitTextStroke: `4px ${i % 2 === 0 ? cL : cR}`,
                  filter: `drop-shadow(0 0 18px ${i % 2 === 0 ? cL : cR})`,
                  opacity: 0.6,
                }}
              >
                FASTER
              </span>
            ))}
          </div>
        );
      })}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.72) 85%)' }} />
    </AbsoluteFill>
  );
};

// ---------- ClickUp 风格 UI 卡 ----------
const UiCard: React.FC<{ seed: number; title: string }> = ({ seed, title }) => (
  <div
    style={{
      width: 560,
      height: 400,
      background: '#fbfbfc',
      borderRadius: 14,
      padding: 0,
      boxSizing: 'border-box',
      boxShadow: '0 0 60px rgba(190,140,255,0.3), 0 22px 60px rgba(0,0,0,0.55)',
      display: 'flex',
      overflow: 'hidden',
    }}
  >
    <div style={{ width: 128, background: '#f3f3f6', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 14, height: 14, borderRadius: 4, background: 'linear-gradient(135deg,#7b68ee,#ff5ad0)' }} />
        <div style={{ height: 8, width: 52, background: '#c9c9d2', borderRadius: 4 }} />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ height: 7, width: `${52 + ((i * 31 + seed * 17) % 42)}%`, background: '#d9d9df', borderRadius: 4 }} />
      ))}
    </div>
    <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: '#3a3a44' }}>{title}</div>
      <div style={{ height: 10, width: '58%', background: '#ececf1', borderRadius: 5 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: ['#7b68ee', '#ff5ad0', '#5ad0ff'][(i + seed) % 3], opacity: 0.7 }} />
          <div style={{ height: 8, width: `${78 - ((i * 23 + seed * 29) % 40)}%`, background: '#e8e8ee', borderRadius: 4 }} />
        </div>
      ))}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <div style={{ width: 74, height: 22, background: '#7b68ee', opacity: 0.75, borderRadius: 6 }} />
        <div style={{ width: 46, height: 22, background: '#e4e4ea', borderRadius: 6 }} />
      </div>
    </div>
  </div>
);

// ---------- 单个湍流烟雾环（对照原片密帧重做） ----------
// 原片形态：只有一个环；边缘破碎起絮（湍流位移）、环身明暗斑块交错；
// 粉紫为主、顶部奶桃色；出现后减速外扩且全程缓慢长大；衰减极慢——
// 片尾仍清晰可见（弥散变淡而非熄灭）；中心无水面光、背景纯黑。
const SmokeRing: React.FC<{ frame: number }> = ({ frame }) => {
  // 滤镜/渐变 ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  // hooks 必须在条件 return 之前调用
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const t = frame - RING_T0;
  if (t < 0) return null;
  // 半径：小出现→减速外扩，之后仍缓慢长大（原片全程未停）
  const grow = Easing.out(Easing.cubic)(Math.min(1, t / 52));
  const R = 46 + 330 * grow + Math.max(0, t - 52) * 1.6;
  // 衰减极慢：快速浮现后长期驻留，只轻微变淡弥散
  const op = interpolate(t, [0, 5, 30, 60], [0, 1, 0.92, 0.72], { extrapolateRight: 'clamp' });
  // 环身宽度：随半径同步长大，相对占比略微摊薄（早期 ~R/3）
  const w = R * interpolate(t, [0, 52], [0.36, 0.27], { extrapolateRight: 'clamp' });
  // 湍流位移幅度随环长大而放大（絮块尺寸跟环成比例）
  const disp = 60 + grow * 90;
  const rot = t * 0.35; // 纹理缓慢流动感
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          {/* 破碎絮状边缘：分形噪声位移主体（octaves=4 → 更细的絮丝） */}
          <filter id={`smokeA-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.013 0.016" numOctaves={4} seed={11} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={disp} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* 第二组噪声（不同种子）：亮斑错位层 */}
          <filter id={`smokeB-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.021 0.018" numOctaves={4} seed={37} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={disp * 0.85} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* 第三组噪声：暗斑洞隙层（压出环身明暗交错的黑斑） */}
          <filter id={`smokeC-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.019 0.023" numOctaves={3} seed={73} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={disp * 1.1} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* 顶部奶桃色、下部粉紫的环身渐变（降饱和，对照原片灰粉调） */}
          <linearGradient id={`ringGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsla(28 45% 78% / 0.85)" />
            <stop offset="35%" stopColor="hsla(315 45% 74% / 0.85)" />
            <stop offset="100%" stopColor="hsla(276 42% 66% / 0.85)" />
          </linearGradient>
        </defs>
        <g transform={`rotate(${rot} 960 540)`} opacity={op}>
          {/* 外圈弥散柔光 */}
          <g style={{ filter: `url(#smokeA-${uid})` }}>
            <circle cx={960} cy={540} r={R} fill="none" stroke="hsla(295 40% 68% / 0.26)" strokeWidth={w * 1.9} style={{ filter: 'blur(22px)' }} />
          </g>
          {/* 环身主体（湍流位移 → 破碎絮状边缘；blur 收小保留湍流纹理） */}
          <g style={{ filter: `url(#smokeA-${uid})` }}>
            <circle cx={960} cy={540} r={R} fill="none" stroke={`url(#ringGrad-${uid})`} strokeWidth={w} style={{ filter: 'blur(9px)' }} opacity={0.85} />
          </g>
          {/* 亮斑层：另一组噪声错位叠加 */}
          <g style={{ filter: `url(#smokeB-${uid})` }}>
            <circle cx={960} cy={540} r={R * 0.99} fill="none" stroke="hsla(310 60% 86% / 0.6)" strokeWidth={w * 0.45} style={{ filter: 'blur(6px)' }} />
          </g>
          {/* 暗斑洞隙：第三组噪声轻压环身 → 明暗斑块交错（轻微，勿成迷彩） */}
          <g style={{ filter: `url(#smokeC-${uid})` }}>
            <circle cx={960} cy={540} r={R * 1.005} fill="none" stroke="hsla(262 40% 10% / 0.32)" strokeWidth={w * 0.4} style={{ filter: 'blur(7px)' }} />
          </g>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ---------- 卡片位姿：Catmull-Rom 样条连续插值（真 3D 丝滑转动） ----------
type Pose = { x: number; y: number; rx: number; ry: number; rz: number; s: number };
const POSE_KEYS: (keyof Pose)[] = ['x', 'y', 'rx', 'ry', 'rz', 's'];

// Catmull-Rom（端点重复），保证经过所有关键姿态且导数连续 → 无分段突变
const catmull = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
};
const splinePose = (keys: Pose[], u: number): Pose => {
  // keys.length === 3：两段样条，0.55 处过中间关键帧
  const seg = u < 0.55 ? 0 : 1;
  const lt = seg === 0 ? u / 0.55 : (u - 0.55) / 0.45;
  const out = {} as Pose;
  for (const k of POSE_KEYS) {
    const v0 = keys[Math.max(0, seg - 1)][k];
    const v1 = keys[seg][k];
    const v2 = keys[seg + 1][k];
    const v3 = keys[Math.min(2, seg + 2)][k];
    out[k] = catmull(v0, v1, v2, v3, lt);
  }
  return out;
};

// 三卡（v4 再加码）：间距再收紧（±125/±85 级，三卡大幅重叠成一叠阶梯）
// + 站定再放大（s≈1.5-1.6，对齐截图 3/4 里卡片群占满画面中部）
// k0 侧棱（近 90° 薄边）→ k1 翻飞中段 → k2 阶梯站定
const CARDS: { title: string; k: [Pose, Pose, Pose]; conv: Pose }[] = [
  {
    title: 'Inbox',
    k: [
      { x: -8, y: -16, rx: 9, ry: 88, rz: 12, s: 1.05 },
      { x: -135, y: -92, rx: 16, ry: 44, rz: -8, s: 1.38 },
      { x: -108, y: -76, rx: 4, ry: 13, rz: -2, s: 1.62 },
    ],
    conv: { x: -20, y: -12, rx: 0, ry: 55, rz: 4, s: 0.12 },
  },
  {
    title: 'List view',
    k: [
      { x: 0, y: 0, rx: 8, ry: 89, rz: 12, s: 1.0 },
      { x: -16, y: -7, rx: 13, ry: 38, rz: -7, s: 1.42 },
      { x: -5, y: -2, rx: 3, ry: 11, rz: -2, s: 1.68 },
    ],
    conv: { x: 0, y: 0, rx: 0, ry: 60, rz: 4, s: 0.12 },
  },
  {
    title: 'Home',
    k: [
      { x: 8, y: 16, rx: 7, ry: 90, rz: 12, s: 0.95 },
      { x: 112, y: 78, rx: 11, ry: 34, rz: -6, s: 1.46 },
      { x: 90, y: 70, rx: 2, ry: 9, rz: -1, s: 1.74 },
    ],
    conv: { x: 15, y: 10, rx: 0, ry: 65, rz: 4, s: 0.12 },
  },
];
const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const out = {} as Pose;
  for (const k of POSE_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
};

export const CardFlockTumble: React.FC = () => {
  const frame = useCurrentFrame();
  // 渐变 ID 按实例生成，多实例同场不串引
  const gradId = `strokeGrad-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // STRONGER 巨字
  const st = frame - TEXT_T0;
  const textScale = interpolate(st, [0, 34], [0.6, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const textOpacity = interpolate(st, [0, 12, 34], [0, 0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: '#060509' }}>
      <NeonWall frame={frame} />

      {/* 卡片群 */}
      {frame < CARD_OUT[1] + 2 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1400 }}>
          {CARDS.map((c, i) => {
            let pose: Pose;
            let op = 1;
            // v6（批次 15）：用户意见"三个页面收缩之前不要停住，保持旋转
            // （只不过旋转放慢"——站定后到收缩前 idle 慢转（低角速度连续
            // 漂移，平方缓入避免与样条衔接处顿挫），收缩从漂移后姿态出发
            const idleAt = (f: number) => {
              const t = Math.min(f, CARD_OUT[0]) - FLIGHT[1] * 0.86;
              if (t <= 0) return { ry: 0, rx: 0, rz: 0 };
              const ramp = Math.min(1, t / 14) ** 2;
              return { ry: t * 0.34 * ramp, rx: t * -0.1 * ramp, rz: t * 0.05 * ramp };
            };
            const drift = idleAt(frame);
            if (frame < FLIGHT[0]) {
              pose = c.k[0];
            } else if (frame < CARD_OUT[0]) {
              // 全程一条样条：侧棱→翻飞→站定，导数连续，丝滑 3D 转动
              // （用户意见①：页面全程清晰，翻飞段 motion blur 已删）
              const raw = Math.min(1, (frame - FLIGHT[0]) / (FLIGHT[1] - FLIGHT[0]));
              const u = Easing.out(Easing.cubic)(raw);
              pose = splinePose(c.k, u);
              pose = { ...pose, ry: pose.ry + drift.ry, rx: pose.rx + drift.rx, rz: pose.rz + drift.rz };
            } else {
              // 收束：快！10 帧加速向中心聚拢缩小（收束段 blur 也删，全程清晰）；
              // 透明度前 60% 保持满格，让"吸入中心"的运动清晰可读
              const r = Math.min(1, (frame - CARD_OUT[0]) / (CARD_OUT[1] - CARD_OUT[0]));
              const e = Easing.in(Easing.quad)(r);
              const from = { ...c.k[2], ry: c.k[2].ry + drift.ry, rx: c.k[2].rx + drift.rx, rz: c.k[2].rz + drift.rz };
              pose = lerpPose(from, c.conv, e);
              op = 1 - Easing.in(Easing.cubic)(Math.max(0, (r - 0.55) / 0.45));
            }
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  transform: `translate3d(${pose.x}px, ${pose.y}px, 0) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) scale(${pose.s})`,
                  opacity: op,
                  zIndex: 10 + i,
                }}
              >
                <UiCard seed={i} title={c.title} />
              </div>
            );
          })}
        </AbsoluteFill>
      )}

      {/* 单个湍流烟雾环（对照原片密帧样式） */}
      <SmokeRing frame={frame} />

      {/* STRONGER 巨字横贯全屏（S6） */}
      {st >= 0 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <svg
            width={1920}
            height={560}
            viewBox="0 0 1920 560"
            style={{
              transform: `scale(${textScale})`,
              opacity: textOpacity,
              filter: 'drop-shadow(0 0 26px rgba(190,110,255,0.55))',
              overflow: 'visible',
            }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ffe14d" />
                <stop offset="30%" stopColor="#ff5ad0" />
                <stop offset="60%" stopColor="#b46bff" />
                <stop offset="100%" stopColor="#5ad0ff" />
              </linearGradient>
            </defs>
            <text
              x="960"
              y="360"
              textAnchor="middle"
              fontFamily={FONT}
              fontWeight={800}
              fontStyle="italic"
              fontSize={352}
              letterSpacing={2}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={4.5}
            >
              STRONGER
            </text>
          </svg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
