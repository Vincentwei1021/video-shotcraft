// morph-from-primitive｜原型变形——正圆先"吸一口气"（anticipation），随即就地长成圆角卡片，内容再落进来。
//
// 第二轮重设计（石墨暗场 · "会听的光球长成一张会议纪要卡"）：
// - look = graphite（近单色暗场，白为主光、香槟金 accent2 只给勾号与已播放的声波）。
// - 原型不再是一根细线圈，而是一颗发光的"聆听"光球：白-香槟渐变的实心发光盘 + 亮边，盘内 7 根声波柱
//   在开场轻轻跳（它在听）。圆本身就是光源——舞台光、地面反光的亮度都跟着光球走。
// - 呼吸拍：缓吸气鼓到 1.14（光更亮、声波更高）→ 7f 干脆呼气压到 0.94（预备下蹲）→ 变形。
// - 变形：同构 path（M + 8 段 cubic）逐数值插值，但 x 与 y 分开计时——横向先长（31f 起）、纵向晚 3f 跟上，
//   像先被拉宽再撑开，生长有重量；两轴各带 ~2% 过冲收住。变形中途只有轮廓与光在变（卡片坑：别叠别的动画）。
// - 实体化：轮廓落定后，发光的"光盘"填充褪成带色相的深色卡面，亮边退成发丝线 + 顶部受光沿，外发光换成两层软阴影；
//   一道扫光走过卡面（Q4：全片只此一次，裁在圆角里）。
// - 内容：AI 纪要卡「Onboarding v2 is a go.」——眉题 / 80px 标题逐词升起 / 三条决议逐条落位（香槟勾）/
//   声波条从左到右长出、已播部分点亮。光球缩成卡片左上的小图标（同一个圆，前后呼应）。
//
// 时间表（30fps，共 150f）：
//   0–10    静置：光球亮着、声波轻跳（首帧画面就有主角）
//   10–24   吸气 1→1.14（INHALE 缓鼓），光变强
//   24–31   呼气 1.14→0.94（干脆），声波收起
//   31–55   横向变形 24f；34–58 纵向变形 24f（晚 3f）；31–44 尺度 0.94→1 回正
//   54–70   实体化：光盘→卡面，亮边→发丝线，外发光→软阴影；60–82 扫光一次
//   60–100  内容：眉题 60 → 标题逐词 64 → 决议 78/84/90 → 声波 86–110
//   100–150 hold：整体极缓推近 1→1.025（40–150f），光呼吸
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Sheen, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const MORPH_FROM_PRIMITIVE_DURATION = 150;

const L = LOOKS.graphite;
const GOLD = L.accent2; // 香槟金：勾号 / 已播放声波 / 光球暖芯

const CX = 960;
const CY = 540;
const R = 165; // 原型圆半径
const RECT_W = 1120; // 目标卡片（画宽 58%）
const RECT_H = 640;
const RECT_R = 48;

// ───────────── 同构 path：M + 8 段 cubic（4 直边段 + 4 圆角段），圆与圆角矩形共用锚点拓扑 ─────────────
// 圆角矩形锚点（中心坐标系，顺时针，从右边上端点起）：右边上→右边下→底边右→底边左→左边下→左边上→顶边左→顶边右
const hw = RECT_W / 2;
const hh = RECT_H / 2;
const iw = hw - RECT_R;
const ihh = hh - RECT_R;
const KAPPA = 0.5522847498;

type P = [number, number];
type Seg = [number, number, number, number, number, number]; // c1x c1y c2x c2y x y

const line = (a: P, b: P): Seg => [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3, a[0] + ((b[0] - a[0]) * 2) / 3, a[1] + ((b[1] - a[1]) * 2) / 3, b[0], b[1]];
// 90° 圆角弧 a → b（弧心 c）
const corner = (a: P, b: P, c: P): Seg => [a[0] + KAPPA * (b[0] - c[0]), a[1] + KAPPA * (b[1] - c[1]), b[0] + KAPPA * (a[0] - c[0]), b[1] + KAPPA * (a[1] - c[1]), b[0], b[1]];

const RA: P[] = [[hw, -ihh], [hw, ihh], [iw, hh], [-iw, hh], [-hw, ihh], [-hw, -ihh], [-iw, -hh], [iw, -hh]];
const RC: P[] = [[iw, ihh], [-iw, ihh], [-iw, -ihh], [iw, -ihh]];
const rectSegs: Seg[] = [
  line(RA[0], RA[1]), corner(RA[1], RA[2], RC[0]), line(RA[2], RA[3]), corner(RA[3], RA[4], RC[1]),
  line(RA[4], RA[5]), corner(RA[5], RA[6], RC[2]), line(RA[6], RA[7]), corner(RA[7], RA[0], RC[3]),
];

// 圆：锚点取矩形锚点的同方位角（保证 t=0 是标准正圆、中途无自交），段间精确弧 k = 4/3·tan(Δθ/4)
const ANG = RA.map(([x, y]) => Math.atan2(y, x));
const CA: P[] = ANG.map((a) => [R * Math.cos(a), R * Math.sin(a)]);
const circSegs: Seg[] = ANG.map((a1, i) => {
  let a2 = ANG[(i + 1) % 8];
  if (a2 <= a1) a2 += Math.PI * 2;
  const k = (4 / 3) * Math.tan((a2 - a1) / 4);
  const p1 = CA[i];
  const p2 = CA[(i + 1) % 8];
  return [p1[0] - k * R * Math.sin(a1), p1[1] + k * R * Math.cos(a1), p2[0] + k * R * Math.sin(a2), p2[1] - k * R * Math.cos(a2), p2[0], p2[1]];
});

const f2 = (n: number) => n.toFixed(2);
// 两轴分开插值：tx 管所有 x 坐标、ty 管所有 y 坐标（横向先长、纵向跟上）
const morphPath = (tx: number, ty: number, s: number) => {
  const X = (cx: number, rx: number) => f2(CX + mix(cx, rx, tx) * s);
  const Y = (cy: number, ry: number) => f2(CY + mix(cy, ry, ty) * s);
  let d = `M ${X(CA[0][0], RA[0][0])} ${Y(CA[0][1], RA[0][1])}`;
  for (let i = 0; i < 8; i++) {
    const a = circSegs[i];
    const b = rectSegs[i];
    d += ` C ${X(a[0], b[0])} ${Y(a[1], b[1])} ${X(a[2], b[2])} ${Y(a[3], b[3])} ${X(a[4], b[4])} ${Y(a[5], b[5])}`;
  }
  return d + ' Z';
};

// ───────────── 曲线 ─────────────
const INHALE = bezier(0.33, 0, 0.2, 1); // 吸气：缓缓鼓起、顶点软
const EXHALE = bezier(0.55, 0, 0.35, 1); // 呼气：回落更干脆，直接压成预备
const MORPH = bezier(0.6, 0, 0.25, 1.07); // 起步慢、中段生长、尾段 ~2% 过冲回收
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// 声波（确定性）：光球里 7 根、卡片里 56 根
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const WAVE = Array.from({ length: 56 }, (_, i) => 0.18 + 0.82 * Math.pow(Math.abs(Math.sin(i * 0.37) * 0.6 + Math.sin(i * 1.13 + 1) * 0.4), 1.2) * (0.55 + 0.45 * hash(i)));

const DECISIONS = ['Ship to 10% of new teams on Monday', 'Dana owns the empty-state copy', 'Revisit the pricing step after week one'];

const Check: React.FC<{ p: number }> = ({ p }) => (
  <svg width={40} height={40} viewBox="0 0 40 40" style={{ flex: 'none' }}>
    <circle cx={20} cy={20} r={18} fill={alpha(GOLD, 0.14 * p)} stroke={alpha(GOLD, 0.55 * p)} strokeWidth={1.5} />
    <path d="M12.5 20.5 L17.8 25.5 L27.5 14.5" fill="none" stroke={GOLD} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
      pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
  </svg>
);

export const MorphFromPrimitive: React.FC = () => {
  const frame = useCurrentFrame();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, ''); // SVG id 按实例生成，多实例同场不串引
  const id = (k: string) => `mfp${uid}${k}`;

  // 呼吸：吸气 10–24 到 1.14，呼气 24–31 压到 0.94，变形开始后 31–44 回正到 1
  const breath =
    frame < 24 ? mix(1, 1.14, INHALE(clamp01((frame - 10) / 14)))
      : frame < 31 ? mix(1.14, 0.94, EXHALE(clamp01((frame - 24) / 7)))
        : mix(0.94, 1, ramp(frame, 31, 13, EASE.out));
  const tx = MORPH(clamp01((frame - 31) / 24));
  const ty = MORPH(clamp01((frame - 34) / 24));
  const shape = Math.min(1, (tx + ty) / 2);

  // 光球亮度：吸气时更亮，变形中逐渐收（光变成面）
  const inhale = INHALE(clamp01((frame - 10) / 14)) * (1 - EXHALE(clamp01((frame - 24) / 7)));
  const glowAmt = (0.75 + 0.35 * inhale) * (1 - 0.65 * shape);
  const solid = ramp(frame, 54, 16, EASE.out); // 实体化
  const luminous = (1 - solid) * (1 - 0.6 * shape); // 光盘填充的亮度

  const d = morphPath(tx, ty, breath);
  const orbR = R * 1.06 * breath * (1 + 1.6 * shape); // 光的半径：变形中向外晕开

  // 开场声波：跳动幅度随吸气增大，呼气时收起
  const barsOn = 1 - ramp(frame, 22, 8, EASE.exit);
  // 整体极缓推近（hold 段让画面活着）
  const push = mix(1, 1.025, ramp(frame, 40, 110, EASE.smooth));

  // 内容
  const eyebrow = ramp(frame, 60, 16, EASE.out);
  const iconIn = ramp(frame, 58, 18, EASE.snappy);
  const row = (k: number) => ramp(frame, 78 + k * 6, 18, EASE.snappy);
  const waveGrow = (i: number) => ramp(frame, 86 + (i / WAVE.length) * 16, 10, EASE.out);
  const played = ramp(frame, 96, 54, EASE.swift) * 0.38; // 播放头缓慢前进（hold 段的微动）

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[2], fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.0 }} fill={{ x: 0.5, y: 1.05 }} intensity={0.75 + 0.35 * glowAmt} breathe={0.6} vignette={0.6}>
        {/* 光球打在舞台上的一团暖光（随光球亮度） */}
        <div style={{
          position: 'absolute', left: CX - 700, top: CY - 520, width: 1400, height: 1040,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#fff3df', 0.16 * glowAmt + 0.04)} 0%, ${alpha('#fff3df', 0)} 70%)`,
        }} />
        {/* 地面反光带：主体下方一条极淡的横向光 */}
        <div style={{
          position: 'absolute', left: 260, right: 260, top: CY + RECT_H / 2 + 40, height: 120,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#ffffff', 0.07 + 0.05 * glowAmt)} 0%, rgba(255,255,255,0) 70%)`,
        }} />
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: `${CX}px ${CY}px` }}>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            {/* 光盘填充：固定圆心的径向光（userSpace，不随形状拉伸）——变形时光保持圆形向外晕开、变暗，
                深色卡面从光的边缘"长"出来，而不是把光球压扁成一块米色 */}
            <radialGradient id={id('orb')} gradientUnits="userSpaceOnUse" cx={CX} cy={CY - 10} r={orbR}>
              <stop offset="0" stopColor="#fffaf2" />
              <stop offset="0.5" stopColor="#f2dcae" stopOpacity={1 - 0.3 * shape} />
              <stop offset="0.82" stopColor="#c9a46a" stopOpacity={1 - 0.75 * shape} />
              <stop offset="1" stopColor="#c9a46a" stopOpacity={0} />
            </radialGradient>
            <linearGradient id={id('face')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#202125" />
              <stop offset="1" stopColor="#141517" />
            </linearGradient>
            <linearGradient id={id('rim')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity={1} />
              <stop offset="1" stopColor="#ffffff" stopOpacity={0.35} />
            </linearGradient>
            <filter id={id('glow')} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation={34} />
            </filter>
            <linearGradient id={id('top')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity={0.07} />
              <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
            <clipPath id={id('clip')}><path d={d} /></clipPath>
          </defs>

          {/* 外发光（光球阶段）→ 实体化后换成软阴影 */}
          <path d={d} fill="#fff1d6" opacity={0.55 * glowAmt * (1 - solid)} filter={`url(#${id('glow')})`} />
          <path d={d} fill="#000" opacity={0.55 * solid}
            style={{ filter: `drop-shadow(0 40px 60px rgba(0,0,0,${(0.7 * solid).toFixed(3)})) drop-shadow(0 6px 12px rgba(0,0,0,${(0.5 * solid).toFixed(3)}))` }} />

          {/* 卡面（深色）在下，光盘填充在上逐渐褪去 */}
          <path d={d} fill={`url(#${id('face')})`} />
          <path d={d} fill={`url(#${id('orb')})`} opacity={luminous} />

          {/* 卡面顶部受光沿（实体化后） */}
          <g clipPath={`url(#${id('clip')})`} opacity={solid}>
            <rect x={CX - hw} y={CY - hh} width={RECT_W} height={240} fill={`url(#${id('top')})`} />
          </g>

          {/* 亮边：光球阶段粗亮 → 发丝线 */}
          <path d={d} fill="none" stroke={`url(#${id('rim')})`} strokeWidth={mix(3, 1.2, solid)} opacity={mix(0.95, 0.22, solid)} strokeLinejoin="round" />

          {/* 光球里的声波（它在听） */}
          {barsOn > 0.01 && (
            <g opacity={barsOn}>
              {Array.from({ length: 7 }, (_, i) => {
                const amp = 0.35 + 0.65 * Math.abs(Math.sin(frame / 4.2 + i * 1.7)) * (0.6 + 0.4 * Math.sin(frame / 9 + i));
                const h = (26 + 70 * amp * (0.7 + 0.5 * inhale) * (1 - Math.abs(i - 3) / 5)) * breath;
                return <rect key={i} x={CX + (i - 3) * 22 * breath - 5} y={CY - h / 2} width={10} height={h} rx={5} fill="#3a2e1c" opacity={0.78} />;
              })}
            </g>
          )}
        </svg>

        {/* 扫光：只此一次，裁进卡片圆角 */}
        <div style={{ position: 'absolute', left: CX - hw, top: CY - hh, width: RECT_W, height: RECT_H, borderRadius: RECT_R, overflow: 'hidden', pointerEvents: 'none' }}>
          <Sheen progress={ramp(frame, 60, 24, EASE.swift)} strength={0.22} width={0.18} />
        </div>

        {/* 卡片内容 */}
        <div style={{
          position: 'absolute', left: CX - hw, top: CY - hh, width: RECT_W, height: RECT_H, boxSizing: 'border-box',
          padding: '68px 76px 64px', display: 'flex', flexDirection: 'column', color: L.ink,
        }}>
          {/* 眉题行：小光球图标（就是那颗圆）+ 标签 + 时长 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: eyebrow, transform: `translateY(${((1 - eyebrow) * 12).toFixed(2)}px)` }}>
            <div style={{
              width: 44, height: 44, borderRadius: 22, flex: 'none',
              background: 'radial-gradient(circle at 50% 40%, #fffaf0 0%, #f1dcb4 45%, #8a7350 100%)',
              boxShadow: `0 0 ${(24 * iconIn).toFixed(1)}px ${alpha('#fff1d6', 0.45)}`,
              transform: `scale(${mix(0.4, 1, EASE.overshoot(clamp01((frame - 58) / 16))).toFixed(3)})`,
            }} />
            <div style={{ ...type(24, 650, { caps: true }), letterSpacing: '0.16em', color: L.ink2 }}>AI Recap · Design review</div>
            <div style={{ marginLeft: 'auto', ...type(30, 500, { mono: true }), color: L.ink3 }}>32:14</div>
          </div>

          {/* 标题：逐词从线下升起 */}
          <div style={{ ...type(80, 700), color: L.ink, marginTop: 34 }}>
            <TextReveal text="Onboarding v2 is a go." by="word" variant="rise" start={64} each={20} gap={4} ease={EASE.snappy} />
          </div>

          {/* 三条决议 */}
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {DECISIONS.map((t, k) => {
              const p = row(k);
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: clamp01(p * 1.6), transform: `translateY(${((1 - p) * 22).toFixed(2)}px)` }}>
                  <Check p={ramp(frame, 82 + k * 6, 14, EASE.out)} />
                  <div style={{ ...type(36, 500), color: k === 0 ? L.ink : L.ink2 }}>{t}</div>
                </div>
              );
            })}
          </div>

          {/* 声波条 + 播放头 */}
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ flex: 1, height: 56, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {WAVE.map((h, i) => {
                const g = waveGrow(i);
                const on = i / WAVE.length < played;
                return (
                  <div key={i} style={{
                    width: 6, height: Math.max(4, h * 56 * g), borderRadius: 3,
                    background: on ? GOLD : alpha(L.ink, 0.22), opacity: g,
                  }} />
                );
              })}
            </div>
            <div style={{ ...type(30, 500, { mono: true }), color: L.ink2, opacity: ramp(frame, 96, 14, EASE.out) }}>
              {`${String(Math.floor((played * 1934) / 60)).padStart(2, '0')}:${String(Math.floor(played * 1934) % 60).padStart(2, '0')}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
