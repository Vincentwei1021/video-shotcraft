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
import { EASE, Grain, Vignette } from '../../_fixtures/Polish';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const FONT = '"Avenir Next", Futura, "Helvetica Neue", sans-serif';

// ---------- 时间轴（30fps / 135f = md「全段 4.5s」；巨字 118f 到位后留 ~0.6s 驻留） ----------
export const CARD_FLOCK_TUMBLE_DURATION = 135;
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

// ---------- ClickUp 风格 UI 卡（出版级假内容：侧栏导航 + 三种页面——收件箱 / 任务列表 / 首页） ----------
// 卡片在 3D 里放大到 1.6–1.74 倍：按 CARD_ZOOM 布局级放大（CSS zoom，按目标尺寸栅格化），
// 外层再 scale(s / CARD_ZOOM) 缩回——文字不再是 560 宽位图被放大的糊字（Q2）。
const CARD_ZOOM = 1.75;
const UI = {
  sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif',
  ink: '#1b1b24', ink2: '#5f6070', ink3: '#9c9cab', line: 'rgba(24,22,40,0.08)', fill: '#f4f4f8',
  violet: '#7b68ee', pink: '#ff5ad0', sky: '#4cb8f0', mint: '#3cc9a0', amber: '#f2a93b',
};
const AV_COLORS = [UI.violet, UI.pink, UI.sky, UI.mint, UI.amber];
const Av: React.FC<{ t: string; i: number; size?: number }> = ({ t, i, size = 22 }) => (
  <div style={{
    width: size, height: size, borderRadius: size / 2, flex: 'none', background: AV_COLORS[i % AV_COLORS.length],
    color: '#fff', fontSize: size * 0.4, fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 0 1.5px #fff', letterSpacing: '0.02em',
  }}>{t}</div>
);
const Chip: React.FC<{ c: string; children: React.ReactNode }> = ({ c, children }) => (
  <div style={{
    height: 18, padding: '0 7px', borderRadius: 5, fontSize: 9.5, fontWeight: 600, display: 'flex', alignItems: 'center',
    gap: 4, color: c, background: `${c}1c`, whiteSpace: 'nowrap', flex: 'none',
  }}>
    <div style={{ width: 5, height: 5, borderRadius: 3, background: c }} />{children}
  </div>
);
const NAV = ['Home', 'Inbox', 'List view', 'Docs', 'Dashboards', 'Goals'];
const INBOX = [
  ['AK', 'Ana Kim', 'Moved “Pricing page” to Review', '2m'],
  ['MR', 'Marco Ruiz', 'Can we ship the onboarding fix today?', '9m'],
  ['JL', 'Jamie Lee', 'Assigned you “Q4 launch checklist”', '24m'],
  ['SO', 'Sam Ortiz', 'Left a comment on Sprint 14', '1h'],
  ['TN', 'Tara Nair', 'Approved the design system update', '2h'],
];
const TASKS: [string, string, string][] = [
  ['Finalize launch email', 'Done', UI.mint],
  ['QA checkout flow', 'In progress', UI.violet],
  ['Update API docs', 'In progress', UI.violet],
  ['Record product demo', 'To do', UI.amber],
  ['Localize pricing page', 'To do', UI.amber],
  ['Plan retro', 'Backlog', '#9c9cab'],
];
const PageBody: React.FC<{ seed: number }> = ({ seed }) => {
  if (seed === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {INBOX.map(([t, n, m, ago], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44, borderBottom: `1px solid ${UI.line}` }}>
            <Av t={t} i={i} size={26} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: UI.ink }}>{n}</div>
              <div style={{ fontSize: 10.5, color: UI.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m}</div>
            </div>
            <div style={{ fontSize: 9.5, color: UI.ink3, fontVariantNumeric: 'tabular-nums' }}>{ago}</div>
            {i < 2 && <div style={{ width: 6, height: 6, borderRadius: 3, background: UI.violet }} />}
          </div>
        ))}
      </div>
    );
  }
  if (seed === 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 9, fontWeight: 600, color: UI.ink3, letterSpacing: '0.06em', height: 22, alignItems: 'center', borderBottom: `1px solid ${UI.line}` }}>
          <span style={{ flex: 1, paddingLeft: 24 }}>TASK</span><span style={{ width: 92 }}>STATUS</span><span style={{ width: 28 }} />
        </div>
        {TASKS.map(([name, st, c], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', height: 37, borderBottom: `1px solid ${UI.line}` }}>
            <div style={{
              width: 13, height: 13, borderRadius: 7, marginRight: 11, flex: 'none',
              border: st === 'Done' ? 'none' : `1.5px solid ${UI.ink3}`, background: st === 'Done' ? UI.mint : 'transparent',
            }} />
            <div style={{ flex: 1, fontSize: 11.5, fontWeight: 500, color: st === 'Done' ? UI.ink3 : UI.ink, whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ width: 92 }}><Chip c={c}>{st}</Chip></div>
            <Av t={INBOX[(i + 2) % 5][0]} i={i + 2} size={20} />
          </div>
        ))}
      </div>
    );
  }
  const bars = [0.42, 0.66, 0.5, 0.82, 0.58, 0.94, 0.72];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: UI.fill, borderRadius: 9, padding: '10px 12px', boxShadow: `inset 0 0 0 1px ${UI.line}` }}>
          <div style={{ fontSize: 9.5, color: UI.ink3, fontWeight: 600 }}>Due this week</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: UI.ink, letterSpacing: '-0.03em', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>12</div>
          <div style={{ fontSize: 9.5, color: UI.mint, fontWeight: 600 }}>4 ahead of plan</div>
        </div>
        <div style={{ flex: 1.4, background: UI.fill, borderRadius: 9, padding: '10px 12px', boxShadow: `inset 0 0 0 1px ${UI.line}` }}>
          <div style={{ fontSize: 9.5, color: UI.ink3, fontWeight: 600 }}>Velocity</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 50, marginTop: 6 }}>
            {bars.map((h, i) => (
              <div key={i} style={{
                flex: 1, height: `${h * 100}%`, borderRadius: 3,
                background: i === 5 ? `linear-gradient(180deg, ${UI.pink}, ${UI.violet})` : 'rgba(123,104,238,0.22)',
              }} />
            ))}
          </div>
        </div>
      </div>
      {TASKS.slice(1, 4).map(([name, st, c], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 26 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: c }} />
          <div style={{ flex: 1, fontSize: 11.5, fontWeight: 500, color: UI.ink }}>{name}</div>
          <Chip c={c}>{st}</Chip>
        </div>
      ))}
    </div>
  );
};
const UiCard: React.FC<{ seed: number; title: string }> = ({ seed, title }) => (
  <div
    style={{
      width: 560,
      height: 400,
      background: 'linear-gradient(180deg, #ffffff 0%, #fafafd 100%)',
      borderRadius: 14,
      boxSizing: 'border-box',
      // 霓虹场的紫色环境辉光 + 落地暗影 + 顶部受光内高光 + 1px 发丝外框
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 0 0 1px rgba(200,180,255,0.35), 0 0 60px rgba(190,140,255,0.28), 0 22px 60px rgba(0,0,0,0.55)',
      display: 'flex',
      overflow: 'hidden',
      fontFamily: UI.sans,
    }}
  >
    <div style={{ width: 128, background: '#f3f3f7', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 3, borderRight: `1px solid ${UI.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 4px 10px' }}>
        <div style={{ width: 16, height: 16, borderRadius: 5, background: `linear-gradient(135deg, ${UI.violet}, ${UI.pink})` }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: UI.ink }}>Northwind</div>
      </div>
      {NAV.map((n, i) => {
        const on = n === title;
        return (
          <div key={n} style={{
            display: 'flex', alignItems: 'center', gap: 7, height: 24, padding: '0 6px', borderRadius: 6,
            background: on ? 'rgba(123,104,238,0.12)' : 'transparent', color: on ? UI.violet : UI.ink2,
            fontSize: 10.5, fontWeight: on ? 600 : 500,
          }}>
            <div style={{ width: 9, height: 9, borderRadius: i % 2 ? 5 : 2.5, border: `1.5px solid ${on ? UI.violet : UI.ink3}` }} />
            {n}
          </div>
        );
      })}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
        <Av t="JL" i={2} size={18} />
        <div style={{ fontSize: 9.5, color: UI.ink2 }}>Jamie Lee</div>
      </div>
    </div>
    <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 24, color: UI.ink, letterSpacing: '-0.025em' }}>{title}</div>
        <div style={{ marginLeft: 'auto', display: 'flex' }}>
          {[0, 1, 2].map((j) => <div key={j} style={{ marginLeft: j ? -5 : 0 }}><Av t={INBOX[(j + seed) % 5][0]} i={j + seed} size={20} /></div>)}
        </div>
        <div style={{
          height: 22, padding: '0 9px', borderRadius: 6, background: UI.violet, color: '#fff', fontSize: 10, fontWeight: 600,
          display: 'flex', alignItems: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
        }}>+ New</div>
      </div>
      <div style={{ fontSize: 10.5, color: UI.ink3, marginTop: -6 }}>
        {seed === 0 ? '5 unread · Today' : seed === 1 ? 'Sprint 14 · 6 tasks' : 'Good morning, Jamie'}
      </div>
      <PageBody seed={seed} />
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
  // 穿环而出：强 ease-out 冲到位后继续极缓长大（不停在死帧上）
  const textScale = interpolate(st, [0, 34], [0.72, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.snappy,
  }) + Math.max(0, st - 34) * 0.0009;
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
                  transform: `translate3d(${pose.x}px, ${pose.y}px, 0) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) scale(${pose.s / CARD_ZOOM})`,
                  opacity: op,
                  zIndex: 10 + i,
                }}
              >
                <div style={{ zoom: CARD_ZOOM, position: 'relative' }}>
                  <UiCard seed={i} title={c.title} />
                  {/* 叠层景深：后排卡压暗一档，读出前后层次 */}
                  {i < 2 && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: '#140f24', opacity: i === 0 ? 0.16 : 0.08, pointerEvents: 'none' }} />
                  )}
                </div>
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
              <filter id={`${gradId}-bloom`} x="-10%" y="-30%" width="120%" height="160%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation={9} />
              </filter>
            </defs>
            {/* 霓虹管三层：外层柔辉（粗描边 + 模糊）→ 渐变管身 → 白热芯（细描边） */}
            {[
              { w: 16, op: 0.42, blur: 16, stroke: `url(#${gradId})` },
              { w: 4.5, op: 1, blur: 0, stroke: `url(#${gradId})` },
              { w: 1.4, op: 0.7, blur: 0, stroke: '#fff4fb' },
            ].map((l, k) => (
              <text
                key={k}
                x="960"
                y="360"
                textAnchor="middle"
                fontFamily={FONT}
                fontWeight={800}
                fontStyle="italic"
                fontSize={352}
                letterSpacing={2}
                fill="none"
                stroke={l.stroke}
                strokeWidth={l.w}
                strokeLinejoin="round"
                opacity={l.op}
                filter={l.blur ? `url(#${gradId}-bloom)` : undefined}
              >
                STRONGER
              </text>
            ))}
          </svg>
        </AbsoluteFill>
      )}
      {/* 暗场胶片质感：带紫调的暗角 + 颗粒（不碰卡片清晰度） */}
      <Vignette strength={0.45} inner={0.5} color="#05030a" />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
