// 标准占位素材包（孵化轮 PLAYBOOK ③）——卡片组 + 假 dashboard 面板 + 标题字块。
// Phase 0 质感升级后：外形几何与导出签名完全不变（Card 填满 w×h、同 padding 盒；
// FakeDashboard 1920×1080、侧栏 220、顶栏 72、A=3×2 网格 pad36/gap28、B=5 行 pad36/gap20；
// TitleBlock 默认 88 号），只把渲染从灰阶骨架条换成克制的出版级产品 UI：发丝线细边、
// 两层软阴影 + 顶部内高光、真实感假内容（指标数字 / sparkline / 首字母头像 / 状态 chip /
// 内联 SVG 图标）、系统字体栈与字重层级。中性暖灰 + 1 个安静的强调色，永远不抢运动的戏。
// 全部内容由 seed 确定性生成（无随机源）。可选 tone="dark" 出同布局深色版（换肤类 demo 用）。
// 依赖仅 react；copy demo 时一并带上本文件并改 import 路径。
import React from 'react';

const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif';
const MONO = '"SF Mono", "JetBrains Mono", Menlo, monospace';

// 调色板：前 10 个键是历史值，demo 大量直接引用，键名与取值永远不改；
// 后面是 Phase 0 新增的精致 UI 令牌，per-demo 自绘元素可直接取用。
export const G = {
  bg: '#ececea',
  panel: '#f7f7f6',
  line: '#dcdcda',
  bar: '#c2c2c0',
  ink: '#2f2f2f',
  mid: '#8f8f8d',
  card: '#ffffff',
  border: '#d8d8d6',
  side: '#3a3a3a',
  sideBar: '#5a5a58',
  // —— 新增令牌 ——
  font: SANS, // 系统无衬线字体栈
  mono: MONO, // 等宽字体栈
  canvas: '#f1f1ef', // dashboard 内容区底色（比 bg 略亮）
  ink1: '#17181c', // 主文字（带一点冷调的近黑，替代纯黑）
  ink2: '#5d5f66', // 次级文字
  ink3: '#9b9da3', // 三级文字 / 占位提示
  fill: '#f3f3f1', // 浅填充（chip / 图标底 / 输入框）
  fill2: '#e7e7e4', // 中填充（图表底色 / 未激活柱）
  hairline: 'rgba(20,22,28,0.08)', // 1px 发丝线颜色（用法：border: `1px solid ${G.hairline}`）
  hairlineStrong: 'rgba(20,22,28,0.13)', // 稍强的发丝线（输入框 / 分隔）
  accent: '#5b63d3', // 唯一强调色：安静的靛蓝
  accentSoft: 'rgba(91,99,211,0.11)', // 强调色浅底（chip / 选中态）
  dark: '#111216', // 带色相的深色场景底（替代 #000）
  darkSurface: '#18191e', // 深色场景里的卡片面
  shadowSm: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 1px 2px rgba(16,18,24,0.06), 0 6px 18px -6px rgba(16,18,24,0.10)',
  shadowMd: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 4px rgba(16,18,24,0.06), 0 16px 40px -12px rgba(16,18,24,0.18)',
  shadowLg: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 4px 10px rgba(16,18,24,0.08), 0 36px 80px -20px rgba(16,18,24,0.30)',
};

type Tone = 'light' | 'dark';

// 内部双主题令牌（light 与 G 新增键一致；dark 为同布局深色版）
const P = {
  light: {
    canvas: 'linear-gradient(180deg, #f4f4f2 0%, #eeeeeb 100%)',
    surface: G.card, raised: '#fafaf9', line: G.hairline, line2: G.hairlineStrong,
    ink: G.ink1, ink2: G.ink2, ink3: G.ink3, fill: G.fill, fill2: G.fill2,
    chart: '#dcdde1', chart2: '#c4c6cc', accent: G.accent, accentSoft: G.accentSoft,
    side: 'linear-gradient(180deg, #1c1d22 0%, #16171b 100%)', sideLine: 'rgba(255,255,255,0.06)',
    sideInk: 'rgba(255,255,255,0.94)', sideInk2: 'rgba(255,255,255,0.56)', sideInk3: 'rgba(255,255,255,0.32)',
    sideFill: 'rgba(255,255,255,0.075)', ring: '#ffffff',
    shadow: G.shadowSm, avatar: ['#e4e4e1', '#d9dade', '#e9e6df', '#dfe1e8'], avatarInk: '#4a4c53',
  },
  dark: {
    canvas: 'linear-gradient(180deg, #121318 0%, #0e0f13 100%)',
    surface: G.darkSurface, raised: '#141519', line: 'rgba(255,255,255,0.07)', line2: 'rgba(255,255,255,0.12)',
    ink: '#ededf0', ink2: '#a3a5ad', ink3: '#6c6e76', fill: 'rgba(255,255,255,0.05)', fill2: 'rgba(255,255,255,0.08)',
    chart: 'rgba(255,255,255,0.10)', chart2: 'rgba(255,255,255,0.18)', accent: '#8088f0', accentSoft: 'rgba(128,136,240,0.16)',
    side: 'linear-gradient(180deg, #0c0d10 0%, #0a0b0e 100%)', sideLine: 'rgba(255,255,255,0.06)',
    sideInk: 'rgba(255,255,255,0.94)', sideInk2: 'rgba(255,255,255,0.52)', sideInk3: 'rgba(255,255,255,0.28)',
    sideFill: 'rgba(255,255,255,0.07)', ring: G.darkSurface,
    shadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.35), 0 8px 24px -8px rgba(0,0,0,0.55)',
    avatar: ['#2b2c33', '#33343b', '#2a2d38', '#30302f'], avatarInk: '#c9cad0',
  },
};
type Pal = typeof P.light;

// —— 确定性小工具 ——
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const pick = <T,>(arr: T[], i: number) => arr[((i % arr.length) + arr.length) % arr.length];
const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// 平滑的伪数据序列：两组正弦 + 趋势 + 微噪，归一化到 [0,1]
const series = (seed: number, n: number, trend = 0.35) => {
  const raw = Array.from({ length: n }, (_, i) =>
    trend * (i / (n - 1)) +
    0.15 * Math.sin(i * 0.52 + seed * 1.7) +
    0.06 * Math.sin(i * 1.35 + seed * 0.6) +
    0.04 * (hash(seed * 31 + i) - 0.5),
  );
  const lo = Math.min(...raw);
  const hi = Math.max(...raw);
  return raw.map((v) => (v - lo) / (hi - lo || 1));
};
// Catmull-Rom → 三次贝塞尔，折线变顺滑曲线
const smooth = (pts: [number, number][]) => {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};

// —— 16×16 线性图标（1.5 描边，圆头圆角）——
const ICONS: Record<string, string[]> = {
  home: ['M2.75 7.25 8 3l5.25 4.25', 'M4.25 6.25v6.5h7.5v-6.5'],
  chart: ['M3 13V9', 'M6.5 13V4.5', 'M10 13V7', 'M13.5 13V3'],
  folder: ['M2.5 4.75c0-.7.55-1.25 1.25-1.25h2.6l1.5 1.5h4.4c.7 0 1.25.55 1.25 1.25v5.5c0 .7-.55 1.25-1.25 1.25h-8.5c-.7 0-1.25-.55-1.25-1.25z'],
  users: ['M6 7.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5z', 'M2 13c.5-2.1 2-3.25 4-3.25S9.5 10.9 10 13', 'M10.5 2.9a2.25 2.25 0 0 1 0 4.2', 'M12 9.9c1 .5 1.7 1.5 2 3.1'],
  file: ['M4.25 2.5h4.5l3 3v7.25c0 .4-.35.75-.75.75h-6.75a.75.75 0 0 1-.75-.75v-9.5c0-.4.35-.75.75-.75z', 'M8.75 2.5v3h3', 'M5.75 9h4.5', 'M5.75 11.25h3'],
  card: ['M3.75 3.75h8.5c.7 0 1.25.55 1.25 1.25v6c0 .7-.55 1.25-1.25 1.25h-8.5c-.7 0-1.25-.55-1.25-1.25v-6c0-.7.55-1.25 1.25-1.25z', 'M2.5 6.75h11', 'M4.75 9.5h2'],
  sliders: ['M3 4.5h5.5', 'M11.5 4.5H13', 'M3 11.5h1.5', 'M7.5 11.5H13', 'M10 3v3', 'M6 10v3'],
  search: ['M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z', 'm10.5 10.5 3 3'],
  bolt: ['M8.75 2 3.75 9h4l-.5 5 5-7h-4z'],
  globe: ['M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z', 'M2.5 8h11', 'M8 2.5c1.6 1.6 2.25 3.5 2.25 5.5S9.6 11.9 8 13.5C6.4 11.9 5.75 10 5.75 8S6.4 4.1 8 2.5z'],
  layers: ['M8 2.5 13.5 5.5 8 8.5 2.5 5.5z', 'm2.5 8.25 5.5 3 5.5-3', 'm2.5 10.75 5.5 3 5.5-3'],
  pulse: ['M2 8.5h2.5l1.5-4 3 8 1.5-4H14'],
  target: ['M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z', 'M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  grid: ['M3 3h4v4H3z', 'M9 3h4v4H9z', 'M3 9h4v4H3z', 'M9 9h4v4H9z'],
  inbox: ['M2.5 9h3l1 1.75h3l1-1.75h3', 'M4.25 3.5h7.5l1.75 5.5v3.25c0 .4-.35.75-.75.75h-9.5a.75.75 0 0 1-.75-.75V9z'],
  arrowUR: ['M5 11 11 5', 'M6 5h5v5'],
  arrowR: ['M3.5 8h9', 'M9 4.5 12.5 8 9 11.5'],
  chevron: ['m6 4 4 4-4 4'],
  clock: ['M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z', 'M8 5v3.25l2.25 1.5'],
  bell: ['M4.5 6.5a3.5 3.5 0 0 1 7 0c0 3 1.25 4.25 1.25 4.25h-9.5S4.5 9.5 4.5 6.5z', 'M6.75 13a1.4 1.4 0 0 0 2.5 0'],
};

const Ic: React.FC<{ name: string; size?: number; color: string; sw?: number }> = ({ name, size = 16, color, sw = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flex: 'none' }}>
    {(ICONS[name] ?? []).map((d, i) => <path key={i} d={d} />)}
  </svg>
);

const More: React.FC<{ color: string; size?: number }> = ({ color, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: 'block', flex: 'none' }}>
    {[3.5, 8, 12.5].map((x) => <circle key={x} cx={x} cy={8} r={1.25} fill={color} />)}
  </svg>
);

const INITIALS = ['AK', 'MR', 'JL', 'SO', 'TN', 'EV', 'DP', 'CW'];
const Avatar: React.FC<{ i: number; size: number; p: Pal; ring?: boolean }> = ({ i, size, p, ring }) => (
  <div style={{
    width: size, height: size, borderRadius: size / 2, flex: 'none', boxSizing: 'border-box',
    background: pick(p.avatar, i), color: p.avatarInk, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.36, fontWeight: 600, letterSpacing: '0.01em',
    boxShadow: ring ? `0 0 0 2px ${p.ring}` : `inset 0 0 0 1px ${p.line}`,
  }}>
    {pick(INITIALS, i)}
  </div>
);

const Chip: React.FC<{ p: Pal; children: React.ReactNode; accent?: boolean; dot?: boolean; size?: number }> = ({ p, children, accent, dot, size = 11.5 }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: size * 0.45, flex: 'none', whiteSpace: 'nowrap',
    padding: `${size * 0.28}px ${size * 0.62}px`, borderRadius: size * 0.55, fontSize: size, fontWeight: 500,
    lineHeight: 1.2, color: accent ? p.accent : p.ink2, background: accent ? p.accentSoft : p.fill,
    boxShadow: accent ? 'none' : `inset 0 0 0 1px ${p.line}`,
  }}>
    {dot && <div style={{ width: size * 0.5, height: size * 0.5, borderRadius: size, background: accent ? p.accent : p.ink3 }} />}
    {children}
  </div>
);

// —— 卡片内容表（seed 决定类型与文案；全部虚构、通用）——
type Kind = 'area' | 'list' | 'bars' | 'progress' | 'heat';
const KINDS: Kind[] = ['area', 'list', 'bars', 'progress', 'heat'];
const COPY: Record<Kind, { title: string; icon: string; value: string; delta?: string; caption: string; chip: string }[]> = {
  area: [
    { title: 'Active users', icon: 'users', value: '24,812', delta: '+12.4%', caption: 'vs. previous 7 days', chip: '7d' },
    { title: 'Sessions', icon: 'pulse', value: '182,340', delta: '+8.1%', caption: 'vs. previous 30 days', chip: '30d' },
    { title: 'API requests', icon: 'bolt', value: '1.20M', delta: '+3.6%', caption: 'p95 latency 148 ms', chip: '24h' },
  ],
  list: [
    { title: 'Top pages', icon: 'globe', value: '', caption: '', chip: 'Live' },
    { title: 'Recent activity', icon: 'inbox', value: '', caption: '', chip: 'Today' },
  ],
  bars: [
    { title: 'Revenue', icon: 'chart', value: '$48.2k', delta: '+6.3%', caption: 'Net volume this month', chip: 'Monthly' },
    { title: 'Orders', icon: 'card', value: '3,912', delta: '+4.8%', caption: 'Across all channels', chip: 'Weekly' },
  ],
  progress: [
    { title: 'Quarterly goals', icon: 'target', value: '68%', caption: 'of Q3 target reached', chip: 'Q3' },
    { title: 'Sprint 24', icon: 'layers', value: '74%', caption: '31 of 42 issues closed', chip: '6d left' },
  ],
  heat: [
    { title: 'Deploys', icon: 'grid', value: '1,284', caption: 'in the last 12 weeks', chip: '12w' },
    { title: 'Activity', icon: 'grid', value: '412', caption: 'events this quarter', chip: 'Q3' },
  ],
};
const PAGES = ['/pricing', '/docs/getting-started', '/changelog', '/blog/release-notes', '/integrations', '/careers'];
const EVENTS = ['merged #482 into main', 'commented on Roadmap', 'deployed v2.14.0', 'opened Billing v2', 'closed 3 issues', 'invited 2 members'];
const GOALS = ['Design system', 'Mobile app', 'Billing v2', 'Docs refresh', 'Search'];

// 卡片设计基准：网格卡 524×454 的内容区（减去 border+padding 20）
const BASE_W = 484;
const BASE_H = 414;
const HEADER = 28;
const GAP = 16;
const METRIC = 64;
const FOOTER = 54;

const Body: React.FC<{ kind: Kind; w: number; h: number; seed: number; p: Pal; id: string }> = ({ kind, w, h, seed, p, id }) => {
  if (kind === 'area') {
    const n = 26;
    const v = series(seed, n, 0.42);
    const prev = series(seed + 11, n, 0.1);
    const yOf = (x: number) => 8 + (1 - x) * (h - 16);
    const pts = v.map((x, i) => [(i / (n - 1)) * (w - 6), yOf(x * 0.82 + 0.1)] as [number, number]);
    const ppts = prev.map((x, i) => [(i / (n - 1)) * (w - 6), yOf(x * 0.5 + 0.12)] as [number, number]);
    const line = smooth(pts);
    const last = pts[n - 1];
    return (
      <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.accent} stopOpacity={0.2} />
            <stop offset="1" stopColor={p.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0.12, 0.5, 0.88].map((t) => (
          <line key={t} x1={0} x2={w} y1={h * t} y2={h * t} stroke={p.line} strokeWidth={1} strokeDasharray="2 5" />
        ))}
        <path d={smooth(ppts)} fill="none" stroke={p.chart2} strokeWidth={1.5} strokeDasharray="3 4" />
        <path d={`${line} L${last[0].toFixed(1)},${h} L0,${h} Z`} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={p.accent} strokeWidth={2.25} strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r={9} fill={p.accent} opacity={0.14} />
        <circle cx={last[0]} cy={last[1]} r={4} fill={p.surface} stroke={p.accent} strokeWidth={2} />
      </svg>
    );
  }
  if (kind === 'bars') {
    const n = Math.max(8, Math.min(24, Math.round(w / 34)));
    const v = series(seed + 3, n, 0.3);
    const labelH = h >= 96 ? 20 : 0;
    const ch = h - labelH;
    const slot = w / n;
    const bw = slot * 0.56;
    const peak = v.indexOf(Math.max(...v));
    const step = Math.ceil(n / 6); // 每 step 根柱一个月份刻度
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (
      <svg width={w} height={h} style={{ display: 'block' }}>
        <line x1={0} x2={w} y1={ch - 0.5} y2={ch - 0.5} stroke={p.line} strokeWidth={1} />
        {v.map((x, i) => {
          const bh = Math.max(4, (0.16 + x * 0.84) * (ch - 6));
          return (
            <rect key={i} x={i * slot + (slot - bw) / 2} y={ch - bh - 1} width={bw} height={bh} rx={Math.min(4, bw / 3)}
              fill={i === peak ? p.accent : p.chart} />
          );
        })}
        {labelH > 0 && v.map((_, i) => (i % step === 0 ? (
          <text key={i} x={i * slot + slot / 2} y={h - 4} textAnchor="middle" fontSize={11} fill={p.ink3} fontFamily={SANS}>
            {MONTHS[(i / step + 7) % 12]}
          </text>
        ) : null))}
      </svg>
    );
  }
  if (kind === 'list') {
    const rowH = 42;
    const rows = Math.max(1, Math.min(6, Math.floor(h / rowH)));
    const pages = seed % 2 === 0;
    return (
      <div style={{ width: w, height: h, display: 'flex', flexDirection: 'column' }}>
        {Array.from({ length: rows }).map((_, i) => {
          const val = Math.round(9000 * Math.pow(0.62, i) * (0.8 + hash(seed * 7 + i) * 0.4));
          const share = Math.pow(0.66, i);
          return (
            <div key={i} style={{
              height: rowH, flex: 'none', display: 'flex', alignItems: 'center', gap: 10, position: 'relative',
              borderTop: i === 0 ? 'none' : `1px solid ${p.line}`, boxSizing: 'border-box',
            }}>
              {pages ? (
                <>
                  <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: `${share * 100}%`, borderRadius: 6, background: i === 0 ? p.accentSoft : p.fill }} />
                  <div style={{ position: 'relative', paddingLeft: 10, fontSize: 13.5, color: p.ink, fontWeight: 500, fontFamily: MONO, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                    {pick(PAGES, i + seed)}
                  </div>
                </>
              ) : (
                <>
                  <Avatar i={i + seed} size={26} p={p} />
                  <div style={{ fontSize: 13.5, color: p.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                    <span style={{ color: p.ink, fontWeight: 600 }}>{pick(INITIALS, i + seed)}</span>{' '}{pick(EVENTS, i + seed)}
                  </div>
                </>
              )}
              <div style={{ position: 'relative', marginLeft: 'auto', paddingRight: 4, fontSize: 13, color: p.ink3, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {pages ? fmt(val) : `${2 + i * 7 + (seed % 5)}m`}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  if (kind === 'progress') {
    const rowH = 46;
    const rows = Math.max(1, Math.min(5, Math.floor(h / rowH)));
    return (
      <div style={{ width: w, height: h, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        {Array.from({ length: rows }).map((_, i) => {
          const pct = Math.round(92 - i * 13 - hash(seed * 3 + i) * 12);
          return (
            <div key={i} style={{ height: rowH, flex: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
              <div style={{ display: 'flex', fontSize: 13, color: p.ink2 }}>
                <span style={{ color: p.ink, fontWeight: 500 }}>{pick(GOALS, i + seed)}</span>
                <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', color: p.ink3 }}>{pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: p.fill2, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: i === 0 ? p.accent : p.chart2 }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  // heat：活动热力格（7 行 × N 列）
  const gap = 5;
  const cell = Math.max(6, Math.min(18, Math.floor((h - gap * 6) / 7)));
  const cols = Math.max(4, Math.floor((w + gap) / (cell + gap)));
  // 克制配色：低档用中性灰，只有高档才上强调色
  const fills = [p.fill2, p.chart, p.accent, p.accent, p.accent];
  const alphas = [1, 1, 0.32, 0.58, 0.9];
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {Array.from({ length: cols * 7 }).map((_, k) => {
        const c = Math.floor(k / 7);
        const r = k % 7;
        const lvl = Math.min(4, Math.floor(Math.pow(hash(seed * 13 + k), 1.7) * 3.3 + (c / cols) * 1.5));
        return (
          <rect key={k} x={c * (cell + gap)} y={r * (cell + gap)} width={cell} height={cell} rx={Math.min(4, cell / 4)}
            fill={fills[lvl]} fillOpacity={alphas[lvl]} />
        );
      })}
    </svg>
  );
};

// 卡片内容（设计坐标 Wd×Hd，外层用 CSS zoom 放到实际尺寸——布局期放大，文字按目标尺寸栅格化）
const CardContent: React.FC<{ Wd: number; Hd: number; seed: number; p: Pal; tone: Tone }> = ({ Wd, Hd, seed, p, tone }) => {
  const kind = pick(KINDS, seed - 1);
  const c = pick(COPY[kind], Math.floor((seed - 1) / KINDS.length));
  const hasMetric = kind !== 'list';
  const wide = Wd > Hd * 2.4;
  const showFooter = !wide && Hd >= 340;
  const id = `fx-area-${tone}-${seed}`;
  const stackH = HEADER + GAP + (hasMetric && !wide ? METRIC + GAP : 0) + (showFooter ? FOOTER : 0);
  const bodyH = wide ? Hd - HEADER - GAP : Hd - stackH;
  const metricW = wide && hasMetric ? Math.min(260, Wd * 0.36) : 0;
  const bodyW = wide && hasMetric ? Wd - metricW - 28 : Wd;
  const metric = hasMetric && (
    <div style={{ flex: 'none', width: metricW || undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 40 }}>
        <div style={{ fontSize: 40, fontWeight: 650, color: p.ink, letterSpacing: '-0.035em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {c.value}
        </div>
        {c.delta && (
          <Chip p={p} accent size={12}>
            <Ic name="arrowUR" size={11} color={p.accent} sw={1.8} />
            {c.delta}
          </Chip>
        )}
      </div>
      <div style={{ marginTop: 9, fontSize: 13, color: p.ink3, lineHeight: '15px', whiteSpace: 'nowrap' }}>{c.caption}</div>
    </div>
  );
  return (
    <div style={{ width: Wd, height: Hd, display: 'flex', flexDirection: 'column', fontFamily: SANS, color: p.ink }}>
      <div style={{ height: HEADER, flex: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: p.fill, boxShadow: `inset 0 0 0 1px ${p.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
        }}>
          <Ic name={c.icon} size={15} color={p.ink2} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{c.title}</div>
        <div style={{ marginLeft: 'auto' }} />
        <Chip p={p} dot={kind === 'list'} accent={kind === 'list'}>{c.chip}</Chip>
        <More color={p.ink3} />
      </div>
      <div style={{ height: GAP, flex: 'none' }} />
      {wide ? (
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', height: bodyH }}>
          {metric}
          {bodyH >= 36 && <Body kind={kind} w={bodyW} h={bodyH} seed={seed} p={p} id={id} />}
        </div>
      ) : (
        <>
          {metric}
          {hasMetric && <div style={{ height: GAP, flex: 'none' }} />}
          {bodyH >= 36 && <Body kind={kind} w={Wd} h={bodyH} seed={seed} p={p} id={id} />}
        </>
      )}
      {showFooter && (
        <div style={{
          marginTop: 'auto', height: FOOTER - 14, flex: 'none', borderTop: `1px solid ${p.line}`,
          display: 'flex', alignItems: 'flex-end', gap: 10, boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex' }}>
            {[0, 1, 2].map((j) => (
              <div key={j} style={{ marginLeft: j ? -4 : 0 }}><Avatar i={seed + j * 3} size={24} p={p} ring /></div>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: p.ink3, lineHeight: '24px', whiteSpace: 'nowrap' }}>Updated {2 + (seed * 7) % 50}m ago</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 500, color: p.ink2, lineHeight: '24px' }}>
            View <Ic name="arrowR" size={13} color={p.ink2} />
          </div>
        </div>
      )}
    </div>
  );
};

export const Card: React.FC<{
  w: number; h: number; seed?: number; style?: React.CSSProperties; tone?: Tone;
}> = ({ w, h, seed = 0, style, tone = 'light' }) => {
  const p = P[tone];
  // w/h 为 0（父级用 style 100% 撑满）时按 dashboard 网格卡 524×454 排内容
  const W = w > 0 ? w : 524;
  const H = h > 0 ? h : 454;
  const pad = typeof style?.padding === 'number' ? style.padding : 19;
  const innerW0 = Math.max(40, W - 2 * (pad + 1));
  const innerH0 = Math.max(40, H - 2 * (pad + 1));
  // 内容缩放系数：按面积等比（几何平均），小卡保底 0.62、大卡封顶 2.4；大卡额外内缩一点留白
  const kOf = (iw: number, ih: number) =>
    Math.min(Math.max(Math.sqrt((iw / BASE_W) * (ih / BASE_H)), 0.62), 2.4, iw / 300, ih / 110);
  const extra = Math.max(0, kOf(innerW0, innerH0) - 1) * 12;
  const innerW = innerW0 - 2 * extra;
  const innerH = innerH0 - 2 * extra;
  const k = kOf(innerW, innerH);
  return (
    <div style={{
      // 外形与旧版一致：w×h、圆角 14、border+padding 合计 20 的内容内缩（2px 灰边 → 1px 发丝线 + 19 padding）
      width: w, height: h, background: p.surface, border: `1px solid ${p.line}`,
      borderRadius: 14, padding: 19, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden',
      boxShadow: p.shadow, ...style,
    }}>
      <div style={{ flex: 'none', margin: extra }}>
        <div style={{ width: innerW / k, height: innerH / k, zoom: k }}>
          <CardContent Wd={innerW / k} Hd={innerH / k} seed={seed} p={p} tone={tone} />
        </div>
      </div>
    </div>
  );
};

const NAV = [
  ['grid', 'Overview'], ['chart', 'Analytics'], ['folder', 'Projects'], ['users', 'Members'],
  ['file', 'Reports'], ['card', 'Billing'], ['sliders', 'Settings'],
];
const ROWS = [
  { icon: 'layers', title: 'Onboarding flow redesign', sub: 'Design · Updated 2h ago', status: 'In review', val: '12,480', unit: 'views', pct: 72, due: 'Due Oct 18' },
  { icon: 'bolt', title: 'Edge cache rollout', sub: 'Platform · Updated 5h ago', status: 'Live', val: '1.2M', unit: 'requests', pct: 100, due: 'Shipped Sep 30' },
  { icon: 'card', title: 'Billing v2 migration', sub: 'Payments · Updated yesterday', status: 'In progress', val: '3,912', unit: 'accounts', pct: 58, due: 'Due Nov 2' },
  { icon: 'globe', title: 'Docs search relaunch', sub: 'Content · Updated 2d ago', status: 'Draft', val: '846', unit: 'queries', pct: 31, due: 'Due Nov 20' },
  { icon: 'pulse', title: 'Realtime alerts', sub: 'Infra · Updated 3d ago', status: 'Planned', val: '214', unit: 'rules', pct: 12, due: 'Due Dec 8' },
];

// 列表行（variant B）：外形同旧版（flex:1、圆角 14、gap 24、内容左缘 28+2）
const ListRow: React.FC<{ i: number; p: Pal }> = ({ i, p }) => {
  const r = ROWS[i % ROWS.length];
  const live = r.status === 'Live';
  const v = series(i * 5 + 2, 18, 0.3);
  const sw = 200;
  const sh = 40;
  const spark = smooth(v.map((x, j) => [(j / 17) * sw, 4 + (1 - x) * (sh - 8)] as [number, number]));
  return (
    <div style={{
      flex: 1, background: p.surface, border: `1px solid ${p.line}`, borderRadius: 14, display: 'flex',
      alignItems: 'center', gap: 24, padding: '0 29px', boxSizing: 'border-box', boxShadow: p.shadow,
      fontFamily: SANS, color: p.ink,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: i === 1 ? p.accentSoft : p.fill, flex: 'none',
        boxShadow: i === 1 ? 'none' : `inset 0 0 0 1px ${p.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ic name={r.icon} size={20} color={i === 1 ? p.accent : p.ink2} />
      </div>
      <div style={{ width: 400, flex: 'none' }}>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>{r.title}</div>
        <div style={{ marginTop: 5, fontSize: 14.5, color: p.ink3, whiteSpace: 'nowrap' }}>{r.sub}</div>
      </div>
      <div style={{ width: 150, flex: 'none', display: 'flex' }}>
        <Chip p={p} dot accent={live} size={13.5}>{r.status}</Chip>
      </div>
      <div style={{ display: 'flex', flex: 'none', width: 90 }}>
        {[0, 1, 2].slice(0, 1 + ((i + 1) % 3)).map((j) => (
          <div key={j} style={{ marginLeft: j ? -5 : 0 }}><Avatar i={i * 2 + j} size={32} p={p} ring /></div>
        ))}
      </div>
      <svg width={sw} height={sh} style={{ display: 'block', flex: 'none', overflow: 'visible' }}>
        <path d={spark} fill="none" stroke={live ? p.accent : p.chart2} strokeWidth={2} strokeLinecap="round" />
      </svg>
      <div style={{ width: 130, flex: 'none', textAlign: 'right' }}>
        <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{r.val}</div>
        <div style={{ marginTop: 3, fontSize: 13, color: p.ink3 }}>{r.unit}</div>
      </div>
      <div style={{ width: 150, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, color: p.ink2, whiteSpace: 'nowrap' }}>
        <Ic name="clock" size={16} color={p.ink3} />
        {r.due}
      </div>
      <div style={{ marginLeft: 'auto', width: 120, flex: 'none' }}>
        <div style={{ display: 'flex', fontSize: 13, color: p.ink3, marginBottom: 8 }}>
          <span>Progress</span>
          <span style={{ marginLeft: 'auto', color: p.ink2, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{r.pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: p.fill2, overflow: 'hidden' }}>
          <div style={{ width: `${r.pct}%`, height: '100%', borderRadius: 3, background: live ? p.accent : p.chart2 }} />
        </div>
      </div>
    </div>
  );
};

// 假 dashboard 面板：A = 3×2 卡片网格，B = 列表行。1920×1080。
// 几何（demo 依赖，勿改）：侧栏 220；顶栏 72；A 卡 524×454 @ x=256/808/1360, y=108/590；
// B 行 1628×171.2 @ y=108+i×191.2，行首 44px 图标块圆心 x=308。
export const FakeDashboard: React.FC<{ variant?: 'A' | 'B'; tone?: Tone }> = ({ variant = 'A', tone = 'light' }) => {
  const p = P[tone];
  const active = variant === 'A' ? 0 : 2; // 侧栏高亮项与顶栏页名一致
  return (
    <div style={{ width: 1920, height: 1080, background: p.canvas, display: 'flex', fontFamily: SANS }}>
      {/* 侧栏 */}
      <div style={{
        width: 220, background: p.side, padding: '28px 22px', boxSizing: 'border-box', display: 'flex',
        flexDirection: 'column', gap: 6, boxShadow: `inset -1px 0 0 ${p.sideLine}`, flex: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flex: 'none', position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(145deg, #3b3d46 0%, #24252b 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 1px rgba(0,0,0,0.25)',
          }}>
            <div style={{ position: 'absolute', left: 11, top: 11, width: 12, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.92)' }} />
            <div style={{ position: 'absolute', left: 17, top: 17, width: 12, height: 12, borderRadius: 6, background: p.accent, opacity: 0.95 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: p.sideInk, letterSpacing: '-0.01em' }}>Workspace</div>
            <div style={{ fontSize: 12, color: p.sideInk3, marginTop: 2 }}>Pro plan</div>
          </div>
        </div>
        {NAV.map(([icon, label], i) => (
          <div key={label} style={{
            height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 11, padding: '0 10px',
            background: i === active ? p.sideFill : 'transparent', color: i === active ? p.sideInk : p.sideInk2,
            fontSize: 14, fontWeight: i === active ? 550 : 450, boxShadow: i === active ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
          }}>
            <Ic name={icon} size={16} color={i === active ? p.sideInk : p.sideInk2} />
            {label}
          </div>
        ))}
        <div style={{ marginTop: 26, padding: '0 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: p.sideInk3 }}>PROJECTS</div>
        {['Atlas', 'Beacon', 'Cobalt'].map((n, i) => (
          <div key={n} style={{ height: 32, display: 'flex', alignItems: 'center', gap: 11, padding: '0 10px', fontSize: 14, color: p.sideInk2 }}>
            <div style={{ width: 8, height: 8, borderRadius: 3, margin: '0 4px', background: i === 0 ? p.accent : `rgba(255,255,255,${0.42 - i * 0.12})` }} />
            {n}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', boxShadow: `inset 0 0 0 1px ${p.sideLine}` }}>
          <div style={{ display: 'flex', fontSize: 12, color: p.sideInk2 }}>
            <span>Usage</span>
            <span style={{ marginLeft: 'auto', color: p.sideInk, fontVariantNumeric: 'tabular-nums' }}>68%</span>
          </div>
          <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ width: '68%', height: '100%', borderRadius: 2, background: 'rgba(255,255,255,0.7)' }} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 顶栏 */}
        <div style={{
          height: 72, background: p.raised, borderBottom: `1px solid ${p.line}`, display: 'flex', alignItems: 'center',
          padding: '0 32px', gap: 20, boxSizing: 'border-box', flex: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, whiteSpace: 'nowrap' }}>
            <span style={{ color: p.ink3 }}>Workspace</span>
            <Ic name="chevron" size={14} color={p.ink3} />
            <span style={{ color: p.ink, fontWeight: 600, letterSpacing: '-0.01em' }}>{variant === 'A' ? 'Overview' : 'Projects'}</span>
          </div>
          <div style={{ display: 'flex', padding: 3, borderRadius: 9, background: p.fill, boxShadow: `inset 0 0 0 1px ${p.line}`, fontSize: 13, marginLeft: 12 }}>
            {['7d', '30d', '90d'].map((t, i) => (
              <div key={t} style={{
                padding: '5px 11px', borderRadius: 6, color: i === 1 ? p.ink : p.ink3, fontWeight: i === 1 ? 550 : 450,
                background: i === 1 ? p.surface : 'transparent', boxShadow: i === 1 ? `0 1px 2px rgba(16,18,24,0.08), inset 0 0 0 1px ${p.line}` : 'none',
              }}>{t}</div>
            ))}
          </div>
          <div style={{
            marginLeft: 'auto', height: 36, width: 320, background: p.surface, border: `1px solid ${p.line2}`, borderRadius: 10,
            boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 9, padding: '0 8px 0 12px', flex: 'none',
            boxShadow: tone === 'light' ? '0 1px 2px rgba(16,18,24,0.04)' : 'none',
          }}>
            <Ic name="search" size={15} color={p.ink3} />
            <span style={{ fontSize: 14, color: p.ink3 }}>Search…</span>
            <span style={{
              marginLeft: 'auto', fontSize: 11.5, fontWeight: 500, color: p.ink3, padding: '2px 6px', borderRadius: 5,
              boxShadow: `inset 0 0 0 1px ${p.line2}`, background: p.fill,
            }}>⌘K</span>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: 18, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(145deg, #3a3c44, #23242a)', color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 600,
            boxShadow: `0 0 0 2px ${p.raised}, 0 0 0 3px ${p.line2}`,
          }}>JL</div>
        </div>
        {variant === 'A' ? (
          <div style={{ flex: 1, padding: 36, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '1fr', gap: 28, boxSizing: 'border-box' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} w={524} h={454} seed={i + 1} tone={tone} style={{ width: '100%', height: '100%' }} />
            ))}
          </div>
        ) : (
          <div style={{ flex: 1, padding: 36, display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <ListRow key={i} i={i} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 标题字块：系统字体栈 + 700 字重 + 随字号的负字距（全大写放松字距），默认 88 号，占位面积与旧版相当
export const TitleBlock: React.FC<{ text: string; size?: number }> = ({ text, size = 88 }) => {
  const caps = /[A-Z]/.test(text) && text === text.toUpperCase();
  return (
    <div style={{
      fontFamily: SANS, fontWeight: 700, fontSize: size, color: G.ink1, lineHeight: 1.12,
      letterSpacing: caps ? '-0.012em' : '-0.032em', fontVariantNumeric: 'tabular-nums',
      fontKerning: 'normal',
    }}>
      {text}
    </div>
  );
};
