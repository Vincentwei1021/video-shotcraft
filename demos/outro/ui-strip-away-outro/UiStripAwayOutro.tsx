// ui-strip-away-outro —— framer-ai 33–36.5s · 减法式收尾
//
// 第二轮重设计（「一键之后，一切复杂性蒸发」· 亮编辑器 → 群青虚空）：
// - look = custom「群青」：前半是亮场冷白的建站编辑器 Tessel（为镜头设计：更少元素、更大字，
//   画布里正在编辑一张暖色咖啡品牌落地页 Okra，标题被选中带控制柄）；Publish 是全片唯一的群青
//   #3b4bff。后半是带群青色相的近黑虚空（地平线光带 + 浮尘），按钮成为唯一幸存者。
// - 蒸发 = 逐行解体而不是整块消失：侧栏 12 行、属性面板 6 块、工具条每个图标、画布里的每个区块
//   各自按"外围 → 中心"排队，每个单元 ease-in 加速离场 + 沿离心方向位移 + 轻微上飘（水汽上升）
//   + 0→12px 模糊 + 微缩；透明度近线性（不留半透明残影）。画布底切成 8×5 块镶嵌瓦片（呼应品牌名
//   Tessel），按到屏心的距离从四角向中心逐块收缩、圆角变大、被虚空吸暗——压黑本身也有秩序。
// - 按钮迁移：邻居走光时从右上角滑到屏心（26f 不对称 in-out，按速度加方向拖影），
//   尺寸按布局放大到 2.5×（字边锐利，不用 CSS scale 放大文字），群青光晕随虚空加深增强；
//   到位后标签上卷换成「✓ Live」+ 一次裁进圆角的扫光（全片唯一光效），随后按钮上浮化开，
//   Tessel 字标在同一位置接棒定版。
// - 相机：开场 32f 朝 Publish 极缓推近 4%（观众被引向按钮），点击后 36f 平滑回到 1.0。
//
// 时间表（30fps，共 176f）：
//   0–30    预备：光标弧线滑向 Publish（22f 起 hover 提亮），相机缓推
//   30      点击：按钮压缩脉冲 + 一圈群青涟漪
//   34–72   蒸发：侧栏行(34)→属性块(37)→工具条左段(43)→画布区块(42–56)→工具条中右(50–55)
//   52–85   画布瓦片从四角向屏心逐块收缩（每块 11f），虚空光随之亮起
//   58–84   按钮迁移到屏心，2.5× 放大 + 光晕
//   96–105  标签 Publish → ✓ Live 上卷 + 扫光（98–116）
//   112–124 按钮上浮化开
//   121–160 字标接棒：图形标弹簧落定、Tessel 逐字由虚到实、口号逐词升起、网址淡入
//   160–176 海报 hold（光晕极缓呼吸）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, SpeedBlur, bezier, mix, ramp, velocity } from '../../_fixtures/Polish';
import { Dust, LOOKS, Sheen, Stage, TextReveal, alpha, springAt, type, type Look } from '../../_fixtures/Look';

export const UI_STRIP_AWAY_OUTRO_DURATION = 176;

// ───────────── 配色 ─────────────
// 虚空：带群青色相的近黑（不是纯黑），主光 = 品牌群青
const VOID: Look = {
  ...LOOKS.midnight,
  bg: ['#0b0d22', '#070814', '#03040a'],
  light: '#3346ff',
  accent: '#3b4bff',
  accent2: '#7a5cff',
  ink: '#f3f4ff',
  ink2: '#a6abd0',
  ink3: '#5b6087',
};
const UI = {
  bar: '#fbfbfd',
  panel: '#f5f6f9',
  canvas: '#e7eaf1',
  line: 'rgba(16,22,48,0.09)',
  ink: '#0f1222',
  ink2: '#4f566e',
  ink3: '#959cb2',
  fill: '#eceef4',
  accent: '#3b4bff',
  accentSoft: 'rgba(59,75,255,0.10)',
};
// 画布里被编辑的落地页（客户品牌 Okra：暖奶油 + 深咖 + 陶土）
const OK = { bg: '#f7f0e6', ink: '#1f150e', ink2: '#6b5a4b', accent: '#c4532b', card: '#fffaf3' };
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

// ───────────── 关键帧 ─────────────
const CLICK = 30;
const MIG0 = 58; // 按钮开始迁移
const MIG_DUR = 26;
const LIVE = 96; // 标签换成 Live
const RELEASE = 112; // 按钮化开
const LOGO = 121; // 字标接棒

// Publish 几何：工具条右端（中心）→ 屏心；尺寸按布局放大
const BTN = { w: 192, h: 54, r: 15, font: 23 };
const BTN_FROM = { x: 1796, y: 38 };
const BTN_TO = { x: 960, y: 520 };
const BTN_SCALE = 2.5;

// 相机：朝 Publish 缓推 4.5%，点击后回到 1.0（原点钉在右上，推近时按钮几乎不动）
const CAM_O = { x: 1720, y: 40 };
const camS = (f: number) => 1 + 0.04 * ramp(f, 0, 32, EASE.smooth) - 0.04 * ramp(f, 44, 36, EASE.smooth);

// 蒸发曲线：ease-in 加速（"被抽走"而不是"飘走"）
const vaporEase = bezier(0.5, 0, 0.8, 0.45);
const VAPOR_DUR = 17;

// 两个 hex 颜色按 t 混合
const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(mix((pa >> sh) & 255, (pb >> sh) & 255, t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

// 画布底瓦片：8×5 块，起始帧按到屏心的椭圆距离排（外围先走），52→~74f
const TILE_W = 240;
const TILE_H = 216;
const TILE_DUR = 11;
const TILES = Array.from({ length: 40 }, (_, i) => {
  const c = i % 8, r = Math.floor(i / 8);
  const x = c * TILE_W, y = r * TILE_H;
  const d = Math.hypot((x + TILE_W / 2 - 960) / 960, (y + TILE_H / 2 - 540) / 540) / Math.SQRT2; // 0 屏心 → 1 四角
  const jitter = (((i * 7919) % 13) / 13) * 2.2; // 同一圈内的确定性小错位，避免整圈齐灭
  return { i, x, y, at: 52 + (1 - d) * 20 + jitter };
});

// 一个蒸发单元：绝对定位盒 + 离心方向 (dx,dy) + 起始帧。走完即不再渲染（省模糊开销）
const Vap: React.FC<{
  f: number; at: number; dx: number; dy: number; dist?: number; blur?: number; dur?: number; box: React.CSSProperties; children?: React.ReactNode;
}> = ({ f, at, dx, dy, dist = 120, blur = 12, dur = VAPOR_DUR, box, children }) => {
  const t = ramp(f, at, dur, EASE.linear);
  if (t >= 1) return null;
  const p = vaporEase(t); // 位移/模糊：加速
  const op = 1 - Math.pow(t, 1.15); // 透明度：近线性，不留半透明残影
  const n = Math.hypot(dx, dy) || 1;
  const tx = (dx / n) * dist * p;
  const ty = (dy / n) * dist * p - 26 * p; // 水汽上升
  return (
    <div style={{
      position: 'absolute', boxSizing: 'border-box', ...box,
      opacity: op,
      transform: p > 0 ? `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${(1 - 0.05 * p).toFixed(4)})` : undefined,
      filter: p > 0.01 && blur > 0 ? `blur(${(p * blur).toFixed(2)}px)` : undefined,
    }}>
      {children}
    </div>
  );
};

// ───────────── 图标 ─────────────
const Icon: React.FC<{ d: string; size?: number; color?: string; w?: number }> = ({ d, size = 22, color = UI.ink2, w = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IC = {
  cursor: 'M5 3l13 8-6 1.6L9 19z',
  frame: 'M7 3v18M17 3v18M3 7h18M3 17h18',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  pen: 'M12 19l7-7-3-3-7 7-1 4zM14 7l3 3',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4',
  comp: 'M12 3l4 4-4 4-4-4zM12 13l4 4-4 4-4-4z',
  page: 'M6 3h9l3 3v15H6zM15 3v3h3',
  layer: 'M4 7h16v10H4z',
  textL: 'M6 7V5h12v2M12 5v14',
  group: 'M4 6h7v5H4zM13 6h7v5h-7zM4 13h16v5H4z',
  btn: 'M4 8h16v8H4z',
  play: 'M8 5l11 7-11 7z',
  up: 'M12 19V5M5 12l7-7 7 7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
};

// Tessel 图形标：群青圆角方块里四块镶嵌（两方两扇形）——"拼起来的网站"
const Mark: React.FC<{ size: number; glowA?: number }> = ({ size, glowA = 0 }) => {
  const k = size / 120;
  const tile = (l: number, t: number, r: string, a: number) => (
    <div style={{ position: 'absolute', left: l * k, top: t * k, width: 34 * k, height: 34 * k, borderRadius: r, background: `rgba(255,255,255,${a})` }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: 30 * k, position: 'relative', overflow: 'hidden', flex: 'none',
      background: 'linear-gradient(155deg, #5a68ff 0%, #3b4bff 48%, #2733d6 100%)',
      boxShadow: `inset 0 ${1.5 * k}px 0 rgba(255,255,255,0.35), inset 0 0 0 ${k}px rgba(255,255,255,0.08), 0 ${10 * k}px ${30 * k}px -${8 * k}px rgba(10,14,80,0.6)` +
        (glowA > 0 ? `, 0 0 ${60 * k}px rgba(70,87,255,${glowA.toFixed(3)})` : ''),
    }}>
      {tile(24, 24, `${17 * k}px ${17 * k}px 0 ${17 * k}px`, 0.96)}
      {tile(62, 24, `${6 * k}px`, 0.58)}
      {tile(24, 62, `${6 * k}px`, 0.58)}
      {tile(62, 62, `${17 * k}px 0 ${17 * k}px ${17 * k}px`, 0.96)}
    </div>
  );
};

// ───────────── 编辑器内容 ─────────────
const LAYERS: { ic: keyof typeof IC; name: string; depth: number; sel?: boolean }[] = [
  { ic: 'page', name: 'Home', depth: 0 },
  { ic: 'layer', name: 'Nav', depth: 1 },
  { ic: 'group', name: 'Hero', depth: 1 },
  { ic: 'textL', name: 'Headline', depth: 2, sel: true },
  { ic: 'textL', name: 'Subhead', depth: 2 },
  { ic: 'btn', name: 'Subscribe CTA', depth: 2 },
  { ic: 'image', name: 'Pour-over shot', depth: 2 },
  { ic: 'group', name: 'Features', depth: 1 },
  { ic: 'layer', name: 'Card · Origin', depth: 2 },
  { ic: 'layer', name: 'Card · Roast', depth: 2 },
  { ic: 'layer', name: 'Card · Ritual', depth: 2 },
  { ic: 'layer', name: 'Footer', depth: 1 },
];

const Field: React.FC<{ label: string; value: string; w?: number }> = ({ label, value, w }) => (
  <div style={{
    height: 42, flex: w ? 'none' : 1, width: w, borderRadius: 10, background: UI.fill,
    display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', boxSizing: 'border-box',
    fontFamily: FONT.sans, fontSize: 17, fontVariantNumeric: 'tabular-nums',
  }}>
    {label && <span style={{ color: UI.ink3 }}>{label}</span>}
    <span style={{ color: UI.ink, fontWeight: 500 }}>{value}</span>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: FONT.sans, fontSize: 16, fontWeight: 650, color: UI.ink, marginBottom: 12 }}>{children}</div>
);

// 检查器 6 块（每块是一个蒸发单元）
const INSPECTOR: { h: number; body: React.ReactNode }[] = [
  {
    h: 120, body: (
      <>
        <SectionTitle>Typography</SectionTitle>
        <div style={{ display: 'flex', gap: 8 }}><Field label="" value="Okra Serif" /><Field label="" value="Bold" w={86} /></div>
      </>
    ),
  },
  { h: 62, body: <div style={{ display: 'flex', gap: 8 }}><Field label="Size" value="92" /><Field label="Line" value="0.96" /></div> },
  {
    h: 120, body: (
      <>
        <SectionTitle>Layout</SectionTitle>
        <div style={{ display: 'flex', gap: 8 }}><Field label="W" value="560" /><Field label="H" value="196" /></div>
      </>
    ),
  },
  {
    h: 120, body: (
      <>
        <SectionTitle>Fill</SectionTitle>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: OK.ink, flex: 'none' }} />
          <Field label="" value="1F150E" />
          <Field label="" value="100%" w={74} />
        </div>
      </>
    ),
  },
  {
    h: 120, body: (
      <>
        <SectionTitle>Effects</SectionTitle>
        <div style={{ display: 'flex', gap: 8 }}><Field label="" value="Fade up · 0.4s" /></div>
      </>
    ),
  },
  {
    h: 120, body: (
      <>
        <SectionTitle>Interactions</SectionTitle>
        <div style={{ display: 'flex', gap: 8 }}><Field label="" value="On scroll → Reveal" /></div>
      </>
    ),
  },
];

// 画布里 Okra 落地页的主视觉：日出暖光 + 手冲杯剪影（纯 CSS）
const PourOver: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden',
    background: 'linear-gradient(170deg, #f3c99a 0%, #e59a63 46%, #b8532f 100%)',
  }}>
    <div style={{ position: 'absolute', left: 250, top: 70, width: 210, height: 210, borderRadius: '50%', background: 'radial-gradient(circle, #fff1d8 0%, #ffd9a4 48%, rgba(255,217,164,0) 72%)' }} />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, background: 'linear-gradient(180deg, rgba(90,36,18,0) 0%, rgba(90,36,18,0.55) 100%)' }} />
    {/* 滤杯 + 壶 */}
    <div style={{ position: 'absolute', left: 168, top: 128, width: 150, height: 96, background: '#2a1a12', clipPath: 'polygon(0 0, 100% 0, 66% 100%, 34% 100%)', borderRadius: 6 }} />
    <div style={{ position: 'absolute', left: 150, top: 120, width: 186, height: 16, borderRadius: 8, background: '#3a251a' }} />
    <div style={{ position: 'absolute', left: 150, top: 232, width: 186, height: 150, borderRadius: '40px 40px 34px 34px', background: 'linear-gradient(180deg, rgba(40,24,16,0.88) 0%, #24150e 100%)' }} />
    <div style={{ position: 'absolute', left: 168, top: 250, width: 30, height: 110, borderRadius: 15, background: 'rgba(255,230,200,0.16)' }} />
    <div style={{ position: 'absolute', left: 318, top: 262, width: 70, height: 88, borderRadius: '0 44px 44px 0', border: '14px solid #24150e', borderLeft: 'none', boxSizing: 'border-box' }} />
    <div style={{ position: 'absolute', left: 110, top: 376, width: 266, height: 18, borderRadius: '50%', background: 'rgba(30,14,8,0.5)', filter: 'blur(4px)' }} />
  </div>
);

const FEATURES = [
  { t: 'Single origin', d: 'Traceable to one farm, one harvest.' },
  { t: 'Roasted Monday', d: 'At your door by Thursday, always.' },
  { t: 'Brew guides', d: 'Ratios dialed in for every grind.' },
];

export const UiStripAwayOutro: React.FC = () => {
  const f = useCurrentFrame();

  // 画布底 → 虚空
  const voidT = ramp(f, 52, 28, EASE.smooth); // 虚空光（光晕 / 浮尘）随瓦片走光而亮起

  // ── 光标：x/y 不同缓动走一条腕部弧线，点击时压下，之后退场（主角换人）
  const curX = mix(900, BTN_FROM.x + 22, ramp(f, 2, CLICK - 4, EASE.swift));
  const curY = mix(660, BTN_FROM.y + 8, ramp(f, 2, CLICK - 4, bezier(0.3, 0, 0.12, 1)));
  const curOp = 1 - ramp(f, CLICK + 6, 10, EASE.out);
  const curPress = f >= CLICK - 1 && f < CLICK + 4 ? 0.86 : 1;

  // ── 按钮
  const hover = ramp(f, 22, 8, EASE.out);
  const pressK = f >= CLICK ? Math.sin(Math.PI * ramp(f, CLICK, 9, EASE.linear)) : 0;
  const migEase = bezier(0.62, 0, 0.18, 1); // 起步慢（脱离工具条）→ 中段快 → 软着陆
  const migAt = (fr: number) => ramp(fr, MIG0, MIG_DUR, migEase);
  const mig = migAt(f);
  const bx = mix(BTN_FROM.x, BTN_TO.x, mig);
  const by = mix(BTN_FROM.y, BTN_TO.y, mig);
  const vx = velocity((fr) => mix(BTN_FROM.x, BTN_TO.x, migAt(fr)), f);
  const vy = velocity((fr) => mix(BTN_FROM.y, BTN_TO.y, migAt(fr)), f);
  // 尺寸比位置晚 3f 收敛（跟随）
  const grow = ramp(f, MIG0 + 3, MIG_DUR, EASE.swift);
  const k = mix(1, BTN_SCALE, grow);
  const live = ramp(f, LIVE, 9, EASE.snappy);
  const rel = ramp(f, RELEASE, 12, bezier(0.45, 0, 0.75, 0.4));
  const haloA = mig * voidT * (1 - rel * 0.85);
  const breathe = 1 + 0.03 * Math.sin(f / 16) * ramp(f, 140, 20, EASE.smooth);

  // ── 相机（编辑器 + 按钮 + 光标同一个容器；按钮着陆时相机已回到 1.0）
  const s = camS(f);
  const cam = `translate(${CAM_O.x}px, ${CAM_O.y}px) scale(${s.toFixed(5)}) translate(${-CAM_O.x}px, ${-CAM_O.y}px)`;

  // 点击涟漪（一圈）
  const rip = ramp(f, CLICK + 1, 20, EASE.out);

  // ── 字标接棒
  const markP = springAt(f, LOGO, { damping: 15, stiffness: 140 });

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: VOID.bg[1] }}>
      {/* 共享底：群青虚空（地平线光带 + 浮尘），编辑器底在其上随蒸发褪去 */}
      <Stage look={VOID} keyLight={{ x: 0.5, y: 0.42 }} fill={{ x: 0.82, y: 0.95 }} horizon={0.6} intensity={0.35 + 0.65 * haloA} breathe={0.5}>
        <div style={{ position: 'absolute', inset: 0, opacity: voidT }}>
          <Dust look={VOID} count={34} seed={7} drift={0.22} opacity={0.5} />
        </div>
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: cam, transformOrigin: '0 0' }}>
        {/* 编辑器画布底（点阵）：切成 8×5 块镶嵌瓦片，按"离屏心越远越先走"逐块收缩淡出，
            露出底下的群青虚空——减法有秩序，且不经过整屏发灰的半透明态 */}
        {TILES.map((t) => {
          const lin = ramp(f, t.at, TILE_DUR, EASE.linear);
          if (lin >= 1) return null;
          const q = bezier(0.55, 0, 0.8, 0.4)(lin); // 收缩：加速
          const fade = lin < 0.6 ? 1 : 1 - (lin - 0.6) / 0.4; // 实色收缩到后段才淡出——不出现灰色半透明块
          return (
            <div key={t.i} style={{
              position: 'absolute', left: t.x - 1, top: t.y - 1, width: TILE_W + 2, height: TILE_H + 2, // 1px 互叠，相机缩放下不露缝
              backgroundColor: mixHex(UI.canvas, '#2a3170', q), // 收缩时被虚空吸暗，不露灰块
              backgroundImage: 'radial-gradient(rgba(20,26,60,0.13) 1.2px, transparent 1.6px)',
              backgroundSize: '28px 28px', backgroundPosition: `${1 - t.x}px ${1 - t.y}px`,
              opacity: fade, borderRadius: 40 * q,
              transform: q > 0 ? `translateY(${(-14 * q).toFixed(2)}px) scale(${(1 - 0.7 * q).toFixed(4)})` : undefined,
            }} />
          );
        })}

        {/* ── 画布：Okra 落地页 artboard ── */}
        <Vap f={f} at={42} dx={0} dy={-1} dist={60} box={{ left: 345, top: 98, fontFamily: FONT.sans, fontSize: 16, fontWeight: 500, color: UI.ink3 }}>
          Home — Desktop 1200
        </Vap>
        <Vap f={f} at={52} dx={0} dy={1} dist={90} blur={4} dur={11} box={{ left: 345, top: 128, width: 1200, height: 1000, borderRadius: 18, background: OK.bg, boxShadow: '0 1px 2px rgba(20,24,50,0.08), 0 30px 70px -30px rgba(20,24,60,0.35)' }} />
        {/* 导航 */}
        <Vap f={f} at={45} dx={-0.2} dy={-1} dist={110} box={{ left: 345, top: 128, width: 1200, height: 78, display: 'flex', alignItems: 'center', padding: '0 56px', borderBottom: '1px solid rgba(31,21,14,0.08)' }}>
          <span style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 700, color: OK.ink, letterSpacing: '-0.02em' }}>Okra</span>
          <div style={{ display: 'flex', gap: 34, marginLeft: 70, fontFamily: FONT.sans, fontSize: 18, color: OK.ink2 }}>
            <span>Shop</span><span>Subscribe</span><span>Journal</span>
          </div>
          <div style={{ marginLeft: 'auto', fontFamily: FONT.sans, fontSize: 17, fontWeight: 600, color: OK.ink, padding: '9px 18px', borderRadius: 20, border: '1.5px solid rgba(31,21,14,0.2)' }}>Cart (2)</div>
        </Vap>
        {/* 标题（被选中）*/}
        <Vap f={f} at={56} dx={-0.5} dy={-0.6} dist={140} box={{ left: 401, top: 262, width: 600 }}>
          <div style={{ fontFamily: SERIF, fontSize: 92, fontWeight: 700, lineHeight: 0.98, letterSpacing: '-0.035em', color: OK.ink }}>
            Slow coffee,<br />fast mornings.
          </div>
          {/* 选中框 + 控制柄 + 尺寸标 */}
          <div style={{ position: 'absolute', left: -12, top: -10, right: -2, bottom: -12, border: `2px solid ${UI.accent}` }}>
            {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => (
              <div key={i} style={{ position: 'absolute', left: `calc(${x * 100}% - 7px)`, top: `calc(${y * 100}% - 7px)`, width: 12, height: 12, background: '#fff', border: `2px solid ${UI.accent}`, borderRadius: 2 }} />
            ))}
            <div style={{ position: 'absolute', left: '50%', bottom: -40, transform: 'translateX(-50%)', background: UI.accent, color: '#fff', fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>560 × 196</div>
          </div>
        </Vap>
        <Vap f={f} at={54} dx={-0.7} dy={0.2} dist={120} box={{ left: 401, top: 512, width: 470, fontFamily: FONT.sans, fontSize: 24, lineHeight: 1.4, color: OK.ink2 }}>
          Small-batch roasts, delivered the same week they leave the drum.
        </Vap>
        <Vap f={f} at={53} dx={-0.6} dy={0.6} dist={120} box={{ left: 401, top: 616, height: 60, padding: '0 28px', borderRadius: 30, background: OK.accent, color: '#fff8f0', display: 'flex', alignItems: 'center', fontFamily: FONT.sans, fontSize: 20, fontWeight: 600 }}>
          Start a subscription
        </Vap>
        {/* 主视觉 */}
        <Vap f={f} at={51} dx={1} dy={0.15} dist={160} box={{ left: 1005, top: 240, width: 486, height: 440 }}>
          <PourOver />
        </Vap>
        {/* 特性卡 ×3 */}
        {FEATURES.map((c, i) => (
          <Vap key={c.t} f={f} at={46 + i * 2.5} dx={(i - 1) * 0.6} dy={1} dist={130} box={{
            left: 401 + i * 372, top: 740, width: 344, height: 210, borderRadius: 18, background: OK.card,
            boxShadow: '0 1px 2px rgba(60,30,10,0.06), 0 14px 30px -18px rgba(60,30,10,0.3)', padding: 28,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: i === 1 ? OK.accent : 'rgba(196,83,43,0.14)', marginBottom: 20 }} />
            <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: OK.ink, letterSpacing: '-0.02em' }}>{c.t}</div>
            <div style={{ fontFamily: FONT.sans, fontSize: 18, color: OK.ink2, marginTop: 8, lineHeight: 1.35 }}>{c.d}</div>
          </Vap>
        ))}

        {/* ── 左侧栏：图层（逐行蒸发，最外围最先走）── */}
        <Vap f={f} at={46} dx={-1} dy={0} dist={110} blur={5} box={{ left: 0, top: 76, width: 290, height: 1004, background: UI.panel, borderRight: `1px solid ${UI.line}` }} />
        <Vap f={f} at={34} dx={-1} dy={-0.3} box={{ left: 22, top: 96, display: 'flex', gap: 22, fontFamily: FONT.sans, fontSize: 18, fontWeight: 650 }}>
          <span style={{ color: UI.ink }}>Layers</span><span style={{ color: UI.ink3 }}>Assets</span>
        </Vap>
        {LAYERS.map((r, i) => (
          <Vap key={r.name} f={f} at={34.5 + i * 1.3} dx={-1} dy={-0.15} dist={130} box={{
            left: 12, top: 140 + i * 46, width: 266, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
            paddingLeft: 12 + r.depth * 20, fontFamily: FONT.sans, fontSize: 18, fontWeight: r.sel ? 600 : 450,
            color: r.sel ? UI.accent : UI.ink2, background: r.sel ? UI.accentSoft : 'transparent',
          }}>
            <Icon d={IC[r.ic]} size={18} color={r.sel ? UI.accent : UI.ink3} />
            {r.name}
          </Vap>
        ))}

        {/* ── 右侧属性面板（逐块蒸发）── */}
        <Vap f={f} at={48} dx={1} dy={0} dist={110} blur={5} box={{ left: 1600, top: 76, width: 320, height: 1004, background: UI.panel, borderLeft: `1px solid ${UI.line}` }} />
        {(() => {
          let y = 98;
          return INSPECTOR.map((b, i) => {
            const top = y;
            y += b.h;
            return (
              <Vap key={i} f={f} at={37 + i * 1.7} dx={1} dy={-0.15} dist={130} box={{ left: 1624, top, width: 272 }}>
                {b.body}
              </Vap>
            );
          });
        })()}

        {/* ── 顶部工具条 ── */}
        <Vap f={f} at={55} dx={0} dy={-1} dist={70} blur={5} box={{ left: 0, top: 0, width: 1920, height: 76, background: UI.bar, borderBottom: `1px solid ${UI.line}` }} />
        <Vap f={f} at={43} dx={-0.4} dy={-1} box={{ left: 22, top: 16 }}><Mark size={44} /></Vap>
        {[IC.cursor, IC.frame, IC.text, IC.pen, IC.image, IC.comp].map((d, i) => (
          <Vap key={i} f={f} at={44 + i * 1.1} dx={-0.3 + i * 0.05} dy={-1} dist={100} box={{
            left: 92 + i * 52, top: 15, width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i === 2 ? UI.accentSoft : 'transparent',
          }}>
            <Icon d={d} size={22} color={i === 2 ? UI.accent : UI.ink2} />
          </Vap>
        ))}
        <Vap f={f} at={50} dx={0} dy={-1} dist={90} box={{ left: 760, width: 400, top: 0, height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: FONT.sans, fontSize: 19 }}>
          <span style={{ color: UI.ink3 }}>Okra</span>
          <span style={{ color: UI.ink3 }}>/</span>
          <span style={{ color: UI.ink, fontWeight: 650 }}>Home</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: UI.ink2, padding: '4px 10px', borderRadius: 7, background: UI.fill }}>Draft</span>
        </Vap>
        <Vap f={f} at={52} dx={0.3} dy={-1} dist={90} box={{ left: 1398, top: 19, display: 'flex' }}>
          {[['#f0c9a8', 'MA'], ['#c9d3f5', 'JT'], ['#d8e8d0', 'RK']].map(([c, n], i) => (
            <div key={n} style={{ width: 38, height: 38, borderRadius: 19, marginLeft: i ? -10 : 0, background: c, border: `2.5px solid ${UI.bar}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: '#3a3f52' }}>{n}</div>
          ))}
        </Vap>
        <Vap f={f} at={53.5} dx={0.5} dy={-1} dist={90} box={{
          left: 1530, top: 13, width: 128, height: 50, borderRadius: 14, border: `1.5px solid rgba(16,22,48,0.14)`, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FONT.sans, fontSize: 19, fontWeight: 550, color: UI.ink,
        }}>
          <Icon d={IC.play} size={15} color={UI.ink} w={2.2} /> Preview
        </Vap>

        {/* 点击涟漪 */}
        {rip > 0 && rip < 1 && (
          <div style={{
            position: 'absolute', left: BTN_FROM.x, top: BTN_FROM.y, width: 0, height: 0,
          }}>
            <div style={{
              position: 'absolute', left: -(BTN.w / 2 + 70 * rip), top: -(BTN.h / 2 + 70 * rip), width: BTN.w + 140 * rip, height: BTN.h + 140 * rip,
              borderRadius: BTN.r + 70 * rip, border: `2px solid ${alpha(UI.accent, 0.55 * (1 - rip))}`, boxSizing: 'border-box',
            }} />
          </div>
        )}

        {/* ── Publish：唯一幸存者（最上层）── */}
        {rel < 1 && (
          <SpeedBlur vx={vx} vy={vy} amount={0.22} max={16} style={{ zIndex: 30 }}>
            <div style={{
              position: 'absolute', left: bx, top: by, width: 0, height: 0,
              opacity: 1 - rel, transform: `translateY(${(-46 * rel).toFixed(2)}px) scale(${(1 - 0.07 * pressK) * (1 + 0.08 * rel) * breathe})`,
              filter: rel > 0.01 ? `blur(${(rel * 18).toFixed(2)}px)` : undefined,
            }}>
              {/* 主角光环：同色光盘，随虚空加深 */}
              <div style={{
                position: 'absolute', left: -620, top: -330, width: 1240, height: 660, borderRadius: '50%',
                background: `radial-gradient(ellipse at center, ${alpha('#4657ff', 0.42)} 0%, ${alpha('#4657ff', 0.12)} 38%, ${alpha('#4657ff', 0)} 68%)`,
                opacity: haloA,
              }} />
              {/* 地面反射：压扁的光斑 */}
              <div style={{
                position: 'absolute', left: -330, top: BTN.h * k * 0.5 + 34, width: 660, height: 70, borderRadius: '50%',
                background: `radial-gradient(ellipse at center, ${alpha('#6f7cff', 0.35)} 0%, ${alpha('#6f7cff', 0)} 70%)`,
                opacity: haloA,
              }} />
              <div style={{
                position: 'absolute',
                width: BTN.w * k, height: BTN.h * k, left: (-BTN.w * k) / 2, top: (-BTN.h * k) / 2,
                borderRadius: BTN.r * k, overflow: 'hidden',
                background: `linear-gradient(180deg, ${live > 0.5 ? '#5767ff' : hover > 0 ? `rgb(${Math.round(mix(76, 86, hover))},${Math.round(mix(91, 103, hover))},255)` : '#4c5bff'} 0%, #3343f5 55%, #2a38e0 100%)`,
                boxShadow: `inset 0 ${1.5 * k}px 0 rgba(255,255,255,0.32), inset 0 0 0 1px rgba(255,255,255,0.08), 0 ${2 * k}px ${6 * k}px rgba(20,30,160,0.35), 0 0 ${18 + 50 * mig}px ${alpha('#4a5bff', 0.25 + 0.45 * haloA)}`,
                fontFamily: FONT.sans, fontWeight: 650, fontSize: BTN.font * k, letterSpacing: '-0.01em', color: '#fff',
              }}>
                {/* 标签上卷：Publish → ✓ Live */}
                {[0, 1].map((which) => {
                  const off = which === 0 ? -live : 1 - live;
                  return (
                    <div key={which} style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 * k,
                      transform: `translateY(${(off * 100).toFixed(2)}%)`, opacity: 1 - Math.abs(off) * 0.6,
                    }}>
                      <Icon d={which === 0 ? IC.up : IC.check} size={20 * k} color="#fff" w={2.6} />
                      {which === 0 ? 'Publish' : 'Live'}
                    </div>
                  );
                })}
                <Sheen progress={ramp(f, LIVE + 2, 18, EASE.swift)} strength={0.7} width={0.18} />
              </div>
            </div>
          </SpeedBlur>
        )}

        {/* 光标 */}
        {curOp > 0 && (
          <svg width={34} height={42} viewBox="0 0 14 18" style={{
            position: 'absolute', left: curX, top: curY, opacity: curOp, zIndex: 40,
            transform: `scale(${curPress})`, transformOrigin: '2px 2px', filter: 'drop-shadow(0 3px 6px rgba(16,18,40,0.32))',
          }}>
            <path d="M1 1 L1 15 L4.6 11.6 L7.2 17 L9.4 16 L6.9 10.7 L12 10.7 Z" fill="#0f1222" stroke="#ffffff" strokeWidth={1.1} strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* ── 字标接棒（相机外，屏心定版）── */}
      {f >= LOGO && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateY(-20px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
              <div style={{
                opacity: Math.min(1, markP * 1.5), transform: `translateY(${((1 - markP) * 40).toFixed(2)}px) scale(${(0.7 + 0.3 * markP).toFixed(4)})`,
                filter: markP < 0.98 ? `blur(${((1 - markP) * 10).toFixed(2)}px)` : undefined,
              }}>
                <Mark size={150} glowA={0.35 * ramp(f, LOGO + 6, 20, EASE.out)} />
              </div>
              <div style={{ ...type(196, 720), color: VOID.ink, paddingBottom: 14 }}>
                <TextReveal text="Tessel" by="char" variant="blur" start={LOGO + 5} each={16} gap={2.4} ease={EASE.snappy} />
              </div>
            </div>
            <div style={{ ...type(46, 450), color: VOID.ink2, marginTop: 46 }}>
              <TextReveal text="Publish once. The rest is handled." by="word" variant="rise" start={LOGO + 10} each={14} gap={2.5} ease={EASE.out} />
            </div>
          </div>
          <div style={{
            position: 'absolute', bottom: 96, ...type(32, 500, { mono: true }), letterSpacing: '0.16em', color: VOID.ink3,
            opacity: ramp(f, LOGO + 24, 16, EASE.out),
          }}>
            TESSEL.SITE
          </div>
        </AbsoluteFill>
      )}

      {/* 亮场阶段的极轻颗粒（虚空阶段由 Stage 自带） */}
      <Grain opacity={0.04 * (1 - voidT)} blend="overlay" />
    </AbsoluteFill>
  );
};
