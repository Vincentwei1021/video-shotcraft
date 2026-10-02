// comic-panel-split｜漫画分格并列 —— 同一主体，三个机位，咔咔咔三格定格，末格斜边吃屏。
//
// 第二轮重设计（墨黑 · 朱砂红 · 漫画分格的夜间镜头发布）：
// - look = custom「漫画墨」：带红相的墨黑底（不是纯黑）+ 奶油纸色缝线 + 一种朱砂红强调（镜头的红圈 / 对焦指示 /
//   标题里的一个词）。分格的漫画语言靠三样东西撑：12° 斜缝（奶油纸芯 + 墨边）、格角的漫画旁白框、
//   末格弹入时的一圈速度线。
// - 主体 = 虚构定焦镜头「SAROS 35mm f/1.2」，全部用 SVG 矢量画（铝筒、橡胶对焦环、距离刻度、红圈、
//   镜名环形字、镀膜反光、11 片光圈叶片），所以三格的 0.68x / 2.3x / 2.2x 机位都是矢量重绘、字边锐利。
//   三格 = 同一支镜头的三个机位：① 3/4 侧拍全身（看得见筒身体积）② 对焦环特写（数字在转——手动对焦）
//   ③ 镜片微距（光圈叶片在收——f/1.2 → f/2）。保活不是缓推，而是"镜头本身在工作"。
// - 末格吃屏后成为结尾海报：镜片微距铺右半屏，左侧大标题「See in / the dark.」逐行升起。
//
// 时间表（30fps，共 156f）：
//   0–20    全屏 3/4 侧拍（缓推 1→1.04），镜头已在画面里，不从空白起
//   20/24/28 三刀斜缝依次劈下（每刀 3f 从上到下画出），同帧对应格硬切弹入（5f scale 1.07→1 + 白闪）
//            —— 4f 一拍，"咔、咔、咔"，比原版 2f 更读得清
//   27/31/35 三个旁白框逐个盖章（overshoot，-2° 歪斜）
//   35–64   定格 29f：① 极缓推 ② 对焦环转 26°（距离数字滑过红色指示）③ 光圈叶片收拢
//   64–80   末格斜边吃屏：2f 反向回拉（anticip）后 14f 扫过全屏，镜片机位同步滑到海报构图；缝线按速度横向拖影
//   82–106  标题两行 rise 升起，副标题 blur 入
//   106–156 hold：光圈极缓回开 + 1.5% 推近，最后干净落定
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, SpeedBlur, Vignette, mix, ramp, velocity } from '../../_fixtures/Polish';
import { TextReveal, alpha, type } from '../../_fixtures/Look';

export const COMIC_PANEL_SPLIT_DURATION = 156;

// ───────────── 配色（custom 漫画墨）─────────────
const C = {
  ink: '#0b0607', // 墨（缝线边、旁白框描边）
  bg0: '#1c0c0f', bg1: '#0f0708', bg2: '#070304', // 带红相的墨黑舞台
  cream: '#f3eadb', // 纸芯 / 刻字 / 标题
  cream2: '#b9ab9a', cream3: '#6e625a',
  red: '#ff3346', // 朱砂红：红圈、对焦指示、标题一个词
  metal0: '#09090b', metal1: '#1b1b1f', metal2: '#34333a', // 阳极氧化黑铝
};

// ───────────── 时间 ─────────────
const SPLIT = 20; // 第一刀
const BEAT = 4; // 逐格间隔
const POP = 5;
const CAP = 7; // 旁白框比格子晚 7f
const HOLD0 = SPLIT + 2 * BEAT + POP + 2; // 35：三格全部落定
const EXP0 = 64; // 吃屏起
const EXP_DUR = 16; // 含 2f 预备
const EXP1 = EXP0 + EXP_DUR; // 80
const TITLE = 82;

// ───────────── 斜缝几何（12°：tan12°×1080 ≈ 230）─────────────
const SLANT = 230;
const B1 = 750; // 缝 1 顶端 x
const B2 = 1405; // 缝 2 顶端 x
const HALF = 9; // 缝半宽（纸芯 + 墨边）

// ───────────── 机位：屏幕 = c + s·(p − f)，世界坐标原点 = 镜头光轴 ─────────────
type Cam = { fx: number; fy: number; cx: number; cy: number; s: number };
const CAM_OPEN: Cam = { fx: -90, fy: 0, cx: 1040, cy: 560, s: 1.12 }; // 开场全屏 3/4 侧拍
const CAM1: Cam = { fx: -90, fy: 0, cx: 360, cy: 590, s: 0.68 }; // ① 全身
const CAM2: Cam = { fx: 0, fy: -240, cx: 1010, cy: 300, s: 2.3 }; // ② 对焦环顶部
const CAM3: Cam = { fx: 0, fy: 0, cx: 1640, cy: 540, s: 2.2 }; // ③ 镜片
const CAM_END: Cam = { fx: 0, fy: 0, cx: 1360, cy: 540, s: 2.45 }; // 海报：镜片铺右半屏
const camT = (c: Cam) => `translate(${(c.cx - c.s * c.fx).toFixed(2)} ${(c.cy - c.s * c.fy).toFixed(2)}) scale(${c.s.toFixed(4)})`;

// 吃屏进度：2f 反向回拉 + 14f 扫屏（snappy，起步猛、落点稳）
const expandAt = (f: number) => {
  if (f < EXP0) return 0;
  const pre = ramp(f, EXP0, 2, EASE.out);
  const go = ramp(f, EXP0 + 2, EXP_DUR - 2, EASE.snappy);
  return -0.03 * pre * (1 - go) + go;
};
const edgeAt = (f: number) => mix(B2 + 5, -SLANT - 40, expandAt(f)); // 第三格左斜边顶端 x
const cam3At = (f: number): Cam => {
  const e = Math.max(0, expandAt(f));
  const hold = ramp(f, HOLD0, EXP0 - HOLD0, EASE.smooth);
  return {
    fx: 0, fy: 0, cy: 540,
    cx: mix(CAM3.cx, CAM_END.cx, e),
    s: mix(CAM3.s + hold * 0.06, CAM_END.s, e) * (1 + 0.015 * ramp(f, EXP1, 76, EASE.smooth)),
  };
};
const cam3X = (f: number) => { const c = cam3At(f); return c.cx; };

// 光圈：0 = 全开 f/1.2，1 = 收到 f/2；定格期收拢，海报 hold 期回开一半
const apertureAt = (f: number) =>
  ramp(f, HOLD0 - 2, 30, EASE.swift) * (1 - 0.55 * ramp(f, 100, 50, EASE.smooth));
// 对焦环旋转（度）：定格期转一段 = 手动对焦
const focusAt = (f: number) => -18 + 26 * ramp(f, HOLD0 - 4, 30, EASE.swift);

// ───────────── 镜头（SVG 矢量，世界坐标）─────────────
const R = 300; // 外筒半径
const DIST = ['0.3', '0.5', '0.7', '1', '2', '5', '∞'];

const Lens: React.FC<{ id: string; tilt?: number; focus: number; aperture: number }> = ({ id, tilt = 0, focus, aperture }) => {
  const th = (tilt * Math.PI) / 180;
  const cs = Math.cos(th);
  const len = 400 * Math.sin(th); // 筒身投影长度（向左）
  const g = (n: string) => `${n}${id}`;
  // 光圈开口：11 边形，半径 128（全开）→ 74（f/2）
  const open = mix(128, 74, aperture);
  const blades = 11;
  const rot = aperture * 18; // 收光圈时叶片整体转
  const poly = Array.from({ length: blades }, (_, i) => {
    const a = ((i / blades) * 360 + rot) * (Math.PI / 180);
    return [open * Math.cos(a), open * Math.sin(a)];
  });
  const holePath = poly.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('') + 'Z';
  const ridges: React.ReactNode[] = [];
  if (tilt > 0) {
    for (let k = -84; k <= 84; k += 5) {
      const ph = (k * Math.PI) / 180;
      const y = R * Math.sin(ph);
      const xo = -R * cs * Math.cos(ph);
      ridges.push(
        <line key={k} x1={xo - len * 0.32} y1={y} x2={xo - len * 0.7} y2={y}
          stroke={k % 10 === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.55)'} strokeWidth={2.2} />,
      );
    }
  }
  const arc = (x: number) => `M${x},${-R} A${R * cs},${R} 0 0 0 ${x},${R}`;
  return (
    <g>
      <defs>
        <linearGradient id={g('side')} x1="0" y1={-R} x2="0" y2={R} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={C.metal0} />
          <stop offset="0.16" stopColor="#4a464e" />
          <stop offset="0.3" stopColor={C.metal1} />
          <stop offset="0.72" stopColor={C.metal0} />
          <stop offset="0.9" stopColor="#3a1a1e" />
          <stop offset="1" stopColor={C.metal0} />
        </linearGradient>
        <radialGradient id={g('lip')} cx="-0.25" cy="-0.35" r="1.2">
          <stop offset="0" stopColor="#4b4950" />
          <stop offset="0.5" stopColor={C.metal1} />
          <stop offset="1" stopColor={C.metal0} />
        </radialGradient>
        <radialGradient id={g('glass')} cx="0.42" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#1a1430" />
          <stop offset="0.55" stopColor="#0a0a18" />
          <stop offset="1" stopColor="#020206" />
        </radialGradient>
        <radialGradient id={g('deep')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2a0c1c" />
          <stop offset="0.6" stopColor="#0c0612" />
          <stop offset="1" stopColor="#040306" />
        </radialGradient>
        <filter id={g('soft')} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        <filter id={g('soft2')} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12" /></filter>
        <clipPath id={g('iris')}><circle r={152} /></clipPath>
        <path id={g('name')} d="M -186,0 A 186,186 0 1 1 186,0 A 186,186 0 1 1 -186,0" />
      </defs>
      {tilt > 0 && (
        <g>
          {/* 筒身：后端椭圆 + 侧带（顶部一道轮廓高光、底部一抹红色环境反光）*/}
          <ellipse cx={-len} cy={0} rx={R * cs} ry={R} fill={`url(#${g('side')})`} />
          <rect x={-len} y={-R} width={len} height={2 * R} fill={`url(#${g('side')})`} />
          <ellipse cx={-len} cy={0} rx={R * cs * 0.9} ry={R * 0.9} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={6} />
          {ridges}
          {[0.3, 0.72, 0.84].map((t) => (
            <path key={t} d={arc(-len * t)} fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth={4} transform={`translate(${-R * cs * 0} 0)`} />
          ))}
          <path d={arc(-len * 0.88)} fill="none" stroke={C.red} strokeWidth={5} />
        </g>
      )}
      <g transform={`scale(${cs.toFixed(4)} 1)`}>
        {/* 外筒唇 */}
        <circle r={R} fill={`url(#${g('lip')})`} />
        <circle r={R - 1} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={2} />
        {/* 对焦环：橡胶纹 + 距离刻度带（随 focus 转）*/}
        <g transform={`rotate(${focus.toFixed(2)})`}>
          <circle r={275} fill="none" stroke="#141417" strokeWidth={28} />
          {Array.from({ length: 120 }, (_, i) => (
            <line key={i} x1={0} y1={-288} x2={0} y2={-263} stroke={i % 2 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.08)'}
              strokeWidth={3} transform={`rotate(${i * 3})`} />
          ))}
          <circle r={260} fill="#101013" />
          <circle r={260} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
          {DIST.map((d, i) => {
            const a = -66 + i * 22;
            return (
              <g key={d} transform={`rotate(${a})`}>
                <line x1={0} y1={-259} x2={0} y2={-251} stroke={C.cream} strokeWidth={2.4} />
                <text x={0} y={-240} textAnchor="middle" dominantBaseline="central" fill={d === '∞' ? C.red : C.cream}
                  style={{ font: `650 ${d === '∞' ? 24 : 18}px ${FONT.sans}`, fontVariantNumeric: 'tabular-nums' }}>{d}</text>
              </g>
            );
          })}
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`m${i}`} x1={0} y1={-259} x2={0} y2={-254} stroke={C.cream2} strokeWidth={1.4} transform={`rotate(${-66 + i * 11 + 5.5})`} />
          ))}
        </g>
        {/* 固定指示线（红色三角）*/}
        <path d="M -9,-300 L 9,-300 L 0,-287 Z" fill={C.red} />
        <circle r={226} fill="#0d0d10" />
        <circle r={223} fill="none" stroke={C.red} strokeWidth={5} />
        {/* 镜名环 */}
        <circle r={219} fill="#111014" />
        <text fill={C.cream2} style={{ font: `600 15px ${FONT.sans}`, letterSpacing: '0.32em' }}>
          <textPath href={`#${g('name')}`} startOffset="2%">SAROS 35mm 1:1.2 ASPH · ⌀ 62 · MADE FOR NIGHT · SAROS 35mm 1:1.2 ASPH</textPath>
        </text>
        <circle r={170} fill="#060508" />
        {/* 前镜片 */}
        <circle r={164} fill={`url(#${g('glass')})`} />
        {/* 光圈叶片：11 片，每片按朝向主光（左上）给明暗，像真的金属叶片 */}
        <g clipPath={`url(#${g('iris')})`}>
          <circle r={152} fill="#0b0a0e" />
          {poly.map((p, i) => {
            const q = poly[(i + 1) % blades];
            const a0 = Math.atan2(p[1], p[0]) + 1.05, a1 = Math.atan2(q[1], q[0]) + 1.05;
            const mid = (a0 + a1) / 2;
            const lit = 0.5 + 0.5 * Math.cos(mid - (-2.3));
            const v = Math.round(10 + lit * 30);
            return (
              <path key={i} d={`M${p[0]},${p[1]} L${q[0]},${q[1]} L${200 * Math.cos(a1)},${200 * Math.sin(a1)} L${200 * Math.cos(a0)},${200 * Math.sin(a0)} Z`}
                fill={`rgb(${v},${v - 2},${v + 4})`} stroke="rgba(255,255,255,0.10)" strokeWidth={1.4} />
            );
          })}
        </g>
        {/* 开口里的后组：深处的红色余辉 + 两圈后镜片反光 */}
        <path d={holePath} fill={`url(#${g('deep')})`} />
        <circle r={open * 0.55} fill="none" stroke="rgba(255,80,120,0.22)" strokeWidth={3} />
        <circle r={open * 0.3} fill="none" stroke="rgba(120,255,200,0.16)" strokeWidth={2} />
        {/* 镀膜反光：品红 / 青绿两道月牙 + 白色高光，叠在玻璃上（只在镜片圆内）*/}
        <g filter={`url(#${g('soft')})`}>
          <path d="M -120,-60 A 135,135 0 0 1 20,-132" fill="none" stroke="rgba(255,70,170,0.55)" strokeWidth={10} strokeLinecap="round" />
          <path d="M 70,110 A 130,130 0 0 0 128,20" fill="none" stroke="rgba(90,255,190,0.4)" strokeWidth={8} strokeLinecap="round" />
        </g>
        <path d="M -98,-88 A 132,132 0 0 1 -30,-124" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={5} strokeLinecap="round" />
        <rect x={-40} y={-150} width={120} height={46} rx={20} fill="rgba(255,255,255,0.07)" transform="rotate(28)" filter={`url(#${g('soft')})`} />
        <circle cx={-62} cy={-60} r={9} fill="rgba(255,255,255,0.7)" filter={`url(#${g('soft')})`} />
        <circle r={164} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
      </g>
    </g>
  );
};

// ───────────── 背景：带红相的墨黑 + 半调网点（漫画印刷感）─────────────
const PanelBg: React.FC<{ lx: number; ly: number; k?: number }> = ({ lx, ly, k = 1 }) => (
  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${C.bg0} 0%, ${C.bg1} 55%, ${C.bg2} 100%)` }}>
    <div style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(ellipse 46% 56% at ${lx}px ${ly}px, ${alpha(C.red, 0.34 * k)} 0%, ${alpha(C.red, 0.08 * k)} 45%, ${alpha(C.red, 0)} 75%)`,
    }} />
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: `radial-gradient(circle, ${alpha(C.red, 0.5)} 1.7px, transparent 2.3px)`, backgroundSize: '13px 13px',
      WebkitMaskImage: `radial-gradient(ellipse 60% 70% at ${lx}px ${ly}px, rgba(0,0,0,0.0) 20%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0) 100%)`,
      maskImage: `radial-gradient(ellipse 60% 70% at ${lx}px ${ly}px, rgba(0,0,0,0.0) 20%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0) 100%)`,
      opacity: 0.6 * k,
    }} />
  </div>
);

// 一格的镜头层（铺满 1920×1080 的 SVG，靠机位取景）
const Shot: React.FC<{ id: string; cam: Cam; tilt?: number; focus: number; aperture: number }> = ({ id, cam, tilt, focus, aperture }) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
    <g transform={camT(cam)}>
      {/* 镜头下的接触影 */}
      <ellipse cx={tilt ? -120 : 0} cy={R + 40} rx={R * 1.3} ry={50} fill="rgba(0,0,0,0.6)" filter="blur(20px)" />
      <Lens id={id} tilt={tilt} focus={focus} aperture={aperture} />
    </g>
  </svg>
);

// 漫画旁白框：奶油底 + 墨描边 + 硬投影，盖章式弹入
const Caption: React.FC<{ f: number; at: number; x: number; y: number; kicker: string; text: string; tilt: number; anchor?: 'left' | 'right' }> = ({
  f, at, x, y, kicker, text, tilt, anchor = 'left',
}) => {
  if (f < at) return null;
  const p = ramp(f, at, 9, EASE.overshoot);
  return (
    <div style={{
      position: 'absolute', top: y, [anchor]: x, transform: `rotate(${tilt}deg) scale(${mix(1.25, 1, p).toFixed(3)})`,
      transformOrigin: anchor === 'left' ? '0% 0%' : '100% 0%', opacity: Math.min(1, ramp(f, at, 3, EASE.linear)),
      background: C.cream, border: `4px solid ${C.ink}`, boxShadow: `7px 7px 0 ${C.ink}`, padding: '14px 22px 16px',
    }}>
      <div style={{ ...type(22, 800, { caps: true }), color: C.red, letterSpacing: '0.16em' }}>{kicker}</div>
      <div style={{ ...type(40, 850), color: C.ink, marginTop: 6, whiteSpace: 'nowrap' }}>{text}</div>
    </div>
  );
};

// 速度线：末格弹入一下（漫画"冲击"），从镜片中心放射、快速淡出
const SpeedLines: React.FC<{ f: number; at: number; cx: number; cy: number }> = ({ f, at, cx, cy }) => {
  const t = (f - at) / 12;
  if (t < 0 || t > 1) return null;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: 1 - EASE.out(t) }}>
      {Array.from({ length: 40 }, (_, i) => {
        const h = Math.sin(i * 91.7) * 43758.5;
        const r = h - Math.floor(h);
        const a = (i / 40) * Math.PI * 2 + r * 0.1;
        const r0 = 470 + r * 160 + t * 120;
        return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * 1300} y2={cy + Math.sin(a) * 1300}
          stroke={i % 3 ? C.cream : C.red} strokeWidth={2 + r * 4} strokeOpacity={0.5} />;
      })}
    </svg>
  );
};

const Headline: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: 'absolute', left: 120, top: 300, color: C.cream }}>
    <div style={{ ...type(26, 750, { caps: true }), letterSpacing: '0.3em', color: C.red, opacity: ramp(f, TITLE - 2, 10, EASE.out) }}>Saros Optics · 35mm</div>
    <div style={{ ...type(150, 850), marginTop: 26, lineHeight: 0.98 }}>
      <TextReveal text={'See in\nthe dark.'} by="line" variant="rise" start={TITLE} each={20} gap={6}
        unitStyle={(i) => (i === 1 ? { color: C.cream } : {})} />
    </div>
    <div style={{ ...type(38, 500), color: C.cream2, marginTop: 34, maxWidth: 640 }}>
      <TextReveal text="f/1.2 · eleven blades · focus by hand" by="word" variant="blur" start={TITLE + 14} each={14} gap={3} />
    </div>
  </div>
);

export const ComicPanelSplit: React.FC = () => {
  const f = useCurrentFrame();
  const focus = focusAt(f);
  const aperture = apertureAt(f);

  // ===== 海报：吃屏完成后摘罩，只剩镜片机位 + 标题 =====
  if (f >= EXP1) {
    return (
      <AbsoluteFill style={{ background: C.bg2, overflow: 'hidden' }}>
        <PanelBg lx={CAM_END.cx} ly={540} />
        <Shot id="end" cam={cam3At(f)} focus={focus} aperture={aperture} />
        {/* 左侧压暗，给标题让出干净的墨底 */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${alpha(C.bg2, 0.92)} 0%, ${alpha(C.bg2, 0.6)} 34%, ${alpha(C.bg2, 0)} 52%)` }} />
        <Headline f={f} />
        <Vignette strength={0.5} inner={0.45} color="#050102" />
        <Grain opacity={0.08} blend="soft-light" />
      </AbsoluteFill>
    );
  }

  // ===== 开场：全屏 3/4 侧拍 =====
  if (f < SPLIT) {
    const push = ramp(f, 0, SPLIT, EASE.linear);
    return (
      <AbsoluteFill style={{ background: C.bg2, overflow: 'hidden' }}>
        <PanelBg lx={1100} ly={520} />
        <Shot id="open" cam={{ ...CAM_OPEN, s: CAM_OPEN.s * (1 + 0.04 * push) }} tilt={38} focus={focus} aperture={aperture} />
        <Vignette strength={0.5} inner={0.45} color="#050102" />
        <Grain opacity={0.08} blend="soft-light" />
      </AbsoluteFill>
    );
  }

  // ===== 分格 + 吃屏 =====
  const hold = ramp(f, HOLD0, EXP0 - HOLD0, EASE.smooth);
  const e = edgeAt(f);
  const seamV = velocity(edgeAt, f);
  const contentV = velocity(cam3X, f);
  const cut = (k: number) => SPLIT + k * BEAT;

  const panels = [
    { clip: `polygon(0px 0px, ${B1 - HALF}px 0px, ${B1 - SLANT - HALF}px 1080px, 0px 1080px)`, ox: 330,
      bg: { lx: 380, ly: 560 }, shot: <Shot id="p1" cam={{ ...CAM1, s: CAM1.s * (1 + 0.035 * hold) }} tilt={38} focus={focus} aperture={aperture} /> },
    { clip: `polygon(${B1 + HALF}px 0px, ${B2 - HALF}px 0px, ${B2 - SLANT - HALF}px 1080px, ${B1 - SLANT + HALF}px 1080px)`, ox: 962,
      bg: { lx: 1000, ly: 900 }, shot: <Shot id="p2" cam={{ ...CAM2, s: CAM2.s * (1 + 0.03 * hold) }} focus={focus} aperture={aperture} /> },
    { clip: `polygon(${e + HALF}px 0px, 1920px 0px, 1920px 1080px, ${e - SLANT + HALF}px 1080px)`, ox: 1610,
      bg: { lx: 1640, ly: 540 }, shot: <Shot id="p3" cam={cam3At(f)} focus={focus} aperture={aperture} /> },
  ];

  // 一刀斜缝：3f 从上到下劈出（纸芯 + 墨边 + 一层柔影）
  const seam = (x: number, at: number, key: string) => {
    const d = ramp(f, at - 1, 3, EASE.out);
    if (d <= 0) return null;
    const y2 = -20 + 1120 * d;
    const x2 = x - SLANT * ((y2 + 20) / 1080);
    return (
      <g key={key}>
        <line x1={x + 4} y1={-20} x2={x2 + 4} y2={y2} stroke="rgba(0,0,0,0.55)" strokeWidth={34} filter="url(#seamSoft)" />
        <line x1={x} y1={-20} x2={x2} y2={y2} stroke={C.ink} strokeWidth={2 * HALF + 2} />
        <line x1={x} y1={-20} x2={x2} y2={y2} stroke={C.cream} strokeWidth={2 * HALF - 7} />
      </g>
    );
  };
  const capOut = 1 - ramp(f, EXP0 + 1, 6, EASE.exit);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      {/* 被劈开的原画面：未弹入的区域仍是压暗的开场全景，读作"一刀刀把这张图切成格" */}
      {f < cut(2) + 2 && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <PanelBg lx={1100} ly={520} />
          <Shot id="under" cam={{ ...CAM_OPEN, s: CAM_OPEN.s * 1.04 }} tilt={38} focus={focus} aperture={aperture} />
          <div style={{ position: 'absolute', inset: 0, background: C.ink, opacity: 0.72 }} />
        </div>
      )}
      {panels.map((p, i) => {
        if (f < cut(i)) return null; // 硬切：未到拍点不渲染
        const pop = ramp(f, cut(i), POP, EASE.snappy);
        const flash = 1 - ramp(f, cut(i), 4, EASE.out);
        return (
          <div key={i} style={{
            position: 'absolute', inset: 0, overflow: 'hidden', clipPath: p.clip, zIndex: i === 2 ? 3 : 1,
            transform: `scale(${mix(1.07, 1, pop).toFixed(4)})`, transformOrigin: `${p.ox}px 540px`,
          }}>
            <PanelBg lx={p.bg.lx} ly={p.bg.ly} />
            {i === 2 ? <SpeedBlur vx={contentV} amount={0.14} max={20}>{p.shot}</SpeedBlur> : p.shot}
            {i === 2 && <SpeedLines f={f} at={cut(2)} cx={CAM3.cx} cy={540} />}
            {flash > 0.01 && <div style={{ position: 'absolute', inset: 0, background: C.cream, opacity: 0.55 * flash }} />}
            {/* 旁白框活在格子里：被末格吃屏时一起被盖掉（末格自己的框在吃屏起点淡出）*/}
            {i === 0 && <Caption f={f} at={cut(0) + CAP} x={88} y={96} kicker="Saros 35" text="The night lens." tilt={-2} />}
            {i === 1 && <Caption f={f} at={cut(1) + CAP} x={800} y={810} kicker="Focus by hand" text="0.3 m → ∞" tilt={1.5} />}
            {i === 2 && <div style={{ position: 'absolute', inset: 0, opacity: capOut }}>
              <Caption f={f} at={cut(2) + CAP} x={92} y={96} kicker="Wide open" text="f/1.2" tilt={-1.5} anchor="right" />
            </div>}
          </div>
        );
      })}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
        <defs><filter id="seamSoft" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="8" /></filter></defs>
        {e > B1 + HALF && seam(B1, cut(1), 's1')}
      </svg>
      <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
        <SpeedBlur vx={seamV} amount={0.1} max={18}>
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            {f < EXP0 ? seam(B2, cut(2), 's2') : seam(e, cut(2), 's2')}
          </svg>
        </SpeedBlur>
      </div>
      <Vignette strength={0.5} inner={0.45} color="#050102" style={{ zIndex: 7 }} />
      <Grain opacity={0.08} blend="soft-light" style={{ zIndex: 8 }} />
    </AbsoluteFill>
  );
};
