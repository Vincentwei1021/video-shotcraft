// integration-hub-map —— 旧页快翻 180° 落成新中枢页，五个集成同帧弹现、五管同帧齐连，管内持续输送。
//
// 第二轮重设计（极光夜 · 白纸旧页 → 发光中枢）：
// - look = aurora（紫粉暗场）。翻面的"换代"语义做成材质反差：正面是一张白纸式的旧页
//   「Weekly sync — manual export」（手工导出清单，44px 标题，近景可读），翻过来的背面是一块
//   深紫玻璃中枢「Everything, connected.」（64px 标题 + 五行 30px 数据源），新旧一眼两个时代。
// - 生态：五个虚构集成 Tracker / Canvas / Ledger / Inbox / Vault，120px 深色玻璃瓷贴 + 白色线性图标，
//   呈皇冠形围住中枢（左下、左上、正上、右上、右下）；光管由粉（集成端）渐变到紫（中枢端），
//   白热芯 + 生长头火花，接通后彗星脉冲沿 集成→中枢 方向持续输送（各管相位错开）。
// - 判例节奏全部保留：翻面 35f ease-out(cubic) 一口气无停顿（前 ~40% 时间走 80% 角度）；
//   90° 侧棱只闪 2f（4f 归零）；两拍制接入——五瓷贴同帧弹现（第一拍）→ +10f 五管同帧起画、9f 齐长
//   （第二拍）；接通那一帧中枢里五行状态同时由「Waiting」翻成「Live」（同帧，"生态一次到位"）。
// - 相机：一条连续曲线从 2.05× 近景（CSS zoom，文字原生栅格化，Q2）拉远到 1×，无顿点；
//   落定后中枢轻呼吸、背景远景瓷贴做弱视差。
//
// 时间表（30fps，共 150f）：
//   0–14    前摇：近景读旧页，相机已开始缓慢拉远
//   14–49   快翻 180°（~21f 侧棱 2f 闪），同时拉远
//   52      第一拍：五瓷贴同帧弹现（13f，一次过冲）
//   62–71   第二拍：五管同帧生长 9f；71f 管口涟漪 + 五行同时 Live
//   72–96   余波：输送脉冲起、底部统计行逐词升起
//   96–150  hold：持续输送 + 中枢呼吸（画面一直活着），尾帧完整海报
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { EASE, FONT, bezier, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const INTEGRATION_HUB_MAP_DURATION = 150;

const L = LOOKS.aurora;

// 面板（1× 尺寸）；推拉走 CSS zoom（布局级缩放），任意推拉量下文字都原生栅格化（Q2）
const PW = 880, PH = 540;
const CX = 960, CY = 560; // 落定时中枢中心
const PX0 = CX - PW / 2, PX1 = CX + PW / 2, PY0 = CY - PH / 2; // 520 / 1400 / 290

// ───────────── 内容 ─────────────
type App = { name: string; meta: string; glyph: 'tracker' | 'canvas' | 'ledger' | 'inbox' | 'vault' };
const APPS: App[] = [
  { name: 'Tracker', meta: '1,284 issues', glyph: 'tracker' },
  { name: 'Canvas', meta: '312 boards', glyph: 'canvas' },
  { name: 'Ledger', meta: '$4.2M invoiced', glyph: 'ledger' },
  { name: 'Inbox', meta: '18k threads', glyph: 'inbox' },
  { name: 'Vault', meta: '96 GB files', glyph: 'vault' },
];

const Glyph: React.FC<{ kind: App['glyph']; size: number; color: string; sw?: number }> = ({ kind, size, color, sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'tracker' && (<><circle cx={12} cy={12} r={8.5} /><path d="M8.2 12.3l2.6 2.6 5-5.4" /></>)}
    {kind === 'canvas' && (<><rect x={3.5} y={3.5} width={8} height={8} rx={2} /><circle cx={16.5} cy={16.5} r={4} /><path d="M14 4.5l5.5 5.5M19.5 4.5L14 10" /></>)}
    {kind === 'ledger' && (<><path d="M4 20h16" /><path d="M7 16v-5M12 16V6M17 16v-8" /></>)}
    {kind === 'inbox' && (<><rect x={3.5} y={5.5} width={17} height={13} rx={2.5} /><path d="M4 7l8 6 8-6" /></>)}
    {kind === 'vault' && (<><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" /><path d="M12 11v5M9.8 13.8L12 16l2.2-2.2" /></>)}
  </svg>
);

// ───────────── 正面：旧页（白纸，手工导出清单） ─────────────
const STEPS = [
  ['Export issues from Tracker as CSV', true],
  ['Screenshot the Canvas boards', true],
  ['Copy totals from Ledger by hand', false],
  ['Forward the thread from Inbox', false],
  ['Re-upload everything to Vault', false],
] as const;

const FrontPanel: React.FC<{ glow: number }> = ({ glow }) => (
  <div style={{
    width: PW, height: PH, boxSizing: 'border-box', borderRadius: 22, overflow: 'hidden', padding: '44px 52px', fontFamily: FONT.sans,
    background: 'linear-gradient(180deg, #fbf9f6 0%, #f1eee9 100%)',
    boxShadow: `inset 0 1px 0 #fff, 0 40px 90px -24px rgba(0,0,0,0.8), 0 0 ${60 + glow * 90}px ${alpha('#e9dcff', 0.1 + glow * 0.45)}`,
  }}>
    <div style={{ ...type(22, 600, { mono: true }), color: '#9a948c', letterSpacing: '0.1em' }}>DOC · LAST EDITED 9 DAYS AGO</div>
    <div style={{ ...type(46, 720), color: '#1d1a17', marginTop: 14 }}>Weekly sync — manual export</div>
    <div style={{ height: 1, background: 'rgba(30,25,20,0.1)', margin: '26px 0 10px' }} />
    {STEPS.map(([s, done], i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, height: 58, borderBottom: '1px solid rgba(30,25,20,0.06)' }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, boxSizing: 'border-box', border: `2px solid ${done ? '#8f8a83' : '#c9c3ba'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#8f8a83' : 'transparent',
        }}>
          {done && <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
        </div>
        <div style={{ ...type(28, 500), color: done ? '#a39d95' : '#3a352f', textDecoration: done ? 'line-through' : undefined }}>{s}</div>
        <div style={{ marginLeft: 'auto', ...type(22, 600, { mono: true }), color: '#b2aba2' }}>~{[20, 15, 30, 10, 25][i]} min</div>
      </div>
    ))}
  </div>
);

// ───────────── 背面：新中枢（深紫玻璃） ─────────────
const HubPanel: React.FC<{ glow: number; live: number }> = ({ glow, live }) => (
  <div style={{
    width: PW, height: PH, boxSizing: 'border-box', borderRadius: 22, overflow: 'hidden', padding: '40px 50px', fontFamily: FONT.sans, position: 'relative',
    background: `linear-gradient(160deg, #241a3d 0%, #160f28 55%, #120c20 100%)`,
    boxShadow: [
      `inset 0 1px 0 ${alpha('#ffffff', 0.14)}`,
      `inset 0 0 0 1px ${alpha('#c9b4ff', 0.16)}`,
      '0 40px 100px -20px rgba(0,0,0,0.85)',
      `0 0 ${70 + glow * 110}px ${alpha(L.accent, 0.18 + glow * 0.4)}`,
    ].join(', '),
  }}>
    {/* 顶部内光：左上一抹紫、右下一抹粉 */}
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 15% 0%, ${alpha(L.accent, 0.22)} 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 100% 100%, ${alpha(L.accent2, 0.12)} 0%, transparent 70%)` }} />
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: `linear-gradient(140deg, ${L.accent}, ${L.accent2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 18px -4px ${alpha(L.accent2, 0.7)}`,
        }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, border: '3px solid #fff', boxSizing: 'border-box' }} />
        </div>
        <div style={{ ...type(24, 650, { caps: true }), color: L.ink2, letterSpacing: '0.14em' }}>Relay Hub</div>
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px', borderRadius: 20,
          background: alpha(L.accent2, 0.12 * live), border: `1px solid ${alpha(L.accent2, 0.15 + 0.3 * live)}`,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: live > 0.5 ? L.accent2 : L.ink3, boxShadow: live > 0.5 ? `0 0 10px ${L.accent2}` : undefined }} />
          <div style={{ ...type(22, 650, { caps: true }), letterSpacing: '0.12em', color: live > 0.5 ? L.ink : L.ink3 }}>{live > 0.5 ? 'Live' : 'Idle'}</div>
        </div>
      </div>
      <div style={{ ...type(66, 760), color: L.ink, marginTop: 22 }}>Everything, connected.</div>
      <div style={{ marginTop: 24 }}>
        {APPS.map((a, i) => (
          <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 18, height: 58, borderTop: `1px solid ${alpha('#ffffff', 0.06)}` }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: alpha('#ffffff', 0.06), border: `1px solid ${alpha('#ffffff', 0.08)}`,
            }}>
              <Glyph kind={a.glyph} size={22} color={live > 0.5 ? L.ink : L.ink3} />
            </div>
            <div style={{ ...type(30, 620), color: L.ink, width: 170 }}>{a.name}</div>
            <div style={{ ...type(26, 500), color: L.ink3 }}>{a.meta}</div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* 同帧翻成 Live：小条从 0 长满 */}
              <div style={{ width: 80, height: 6, borderRadius: 3, background: alpha('#ffffff', 0.08), overflow: 'hidden' }}>
                <div style={{ width: `${(live * (70 + i * 6)).toFixed(1)}%`, height: '100%', background: `linear-gradient(90deg, ${L.accent2}, ${L.accent})` }} />
              </div>
              <div style={{ ...type(24, 600), color: live > 0.5 ? L.ink2 : L.ink3, width: 92, textAlign: 'right' }}>{live > 0.5 ? 'Synced' : 'Waiting'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ───────────── 集成瓷贴 ─────────────
const Tile: React.FC<{ app: App; on: number }> = ({ app, on }) => (
  <div style={{
    width: 120, height: 120, borderRadius: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
    background: 'linear-gradient(160deg, #2a2142 0%, #171127 100%)',
    boxShadow: [
      `inset 0 1px 0 ${alpha('#ffffff', 0.16)}`,
      `inset 0 0 0 1px ${alpha('#d8c8ff', 0.12 + 0.3 * on)}`,
      '0 20px 40px -12px rgba(0,0,0,0.8)',
      `0 0 ${(16 + on * 46).toFixed(1)}px ${alpha(L.accent2, 0.5 * on)}`,
    ].join(', '),
  }}>
    <Glyph kind={app.glyph} size={58} color={on > 0.5 ? '#ffffff' : L.ink2} sw={1.8} />
  </div>
);

// ───────────── 光管 ─────────────
type Pipe = { icon: [number, number]; path: string; len: number };
const R = 40; // 管线拐角半径
const PIPES: Pipe[] = [
  // 0 Tracker 左下
  { icon: [300, 700], path: `M 362 700 L ${PX0} 700`, len: PX0 - 362 },
  // 1 Canvas 左上
  { icon: [400, 236], path: `M 400 298 L 400 ${430 - R} Q 400 430 ${400 + R} 430 L ${PX0} 430`, len: 0 },
  // 2 Ledger 正上
  { icon: [960, 140], path: `M 960 202 L 960 ${PY0}`, len: PY0 - 202 },
  // 3 Inbox 右上
  { icon: [1520, 236], path: `M 1520 298 L 1520 ${430 - R} Q 1520 430 ${1520 - R} 430 L ${PX1} 430`, len: 0 },
  // 4 Vault 右下
  { icon: [1620, 700], path: `M 1558 700 L ${PX1} 700`, len: 1558 - PX1 },
];
// 带圆角的两管：竖段 + 1/4 圆（≈ πR/2）+ 横段
PIPES[1].len = (430 - R - 298) + (Math.PI * R) / 2 + (PX0 - 400 - R);
PIPES[3].len = PIPES[1].len;

const LABEL_SIDE = ['below', 'left', 'right', 'right', 'below'] as const;

const T_ICON = 52; // 第一拍：五瓷贴同帧
const T_PIPE = 62; // 第二拍：五管同帧（+10f）
const GROW = 9;
const ALL_ON = T_PIPE + GROW;
const FLOW_SPEED = 4.6; // px/f
const FLOW_PERIOD = 80;

// 路径按弧长取点（直线 + 二次曲线），给生长头火花用
const pointAt = (path: string, dist: number): [number, number] => {
  const tok = path.match(/[MLQ]|-?[\d.]+/g)!;
  let i = 0, cx = 0, cy = 0, rest = dist;
  let last: [number, number] = [0, 0];
  while (i < tok.length) {
    const c = tok[i++];
    if (c === 'M') { cx = +tok[i++]; cy = +tok[i++]; last = [cx, cy]; continue; }
    if (c === 'L') {
      const x = +tok[i++], y = +tok[i++];
      const len = Math.hypot(x - cx, y - cy);
      if (rest <= len) { const k = rest / len; return [cx + (x - cx) * k, cy + (y - cy) * k]; }
      rest -= len; cx = x; cy = y; last = [cx, cy]; continue;
    }
    if (c === 'Q') {
      const qx = +tok[i++], qy = +tok[i++], x = +tok[i++], y = +tok[i++];
      let px = cx, py = cy;
      for (let s = 1; s <= 16; s++) {
        const u = s / 16;
        const nx = (1 - u) * (1 - u) * cx + 2 * (1 - u) * u * qx + u * u * x;
        const ny = (1 - u) * (1 - u) * cy + 2 * (1 - u) * u * qy + u * u * y;
        const len = Math.hypot(nx - px, ny - py);
        if (rest <= len) { const k = rest / len; return [px + (nx - px) * k, py + (ny - py) * k]; }
        rest -= len; px = nx; py = ny;
      }
      cx = x; cy = y; last = [cx, cy]; continue;
    }
  }
  return last;
};

// 远景：未接入的"其他 app"幽灵瓷贴，失焦 + 弱视差，给暗场纵深
const hash = (n: number) => { const x = Math.sin(n * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };
const GHOSTS = Array.from({ length: 14 }, (_, i) => ({
  x: [110, 260, 640, 1270, 1700, 1820, 150, 760, 1180, 1560, 60, 1880, 560, 1400][i],
  y: [120, 920, 980, 990, 930, 160, 420, 70, 60, 980, 760, 600, 820, 840][i],
  s: 50 + hash(i) * 50,
  blur: 2 + hash(i + 20) * 6,
  a: 0.25 + hash(i + 40) * 0.35,
}));

const CAM = bezier(0.55, 0, 0.18, 1);

export const IntegrationHubMap: React.FC = () => {
  const frame = useCurrentFrame();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  // 相机：一条连续曲线，2.05× 近景 → 1×，同时从读旧页的位置平移回中心
  const cam = CAM(Math.min(1, Math.max(0, frame / 96)));
  const zoom = 2.05 + (1.0 - 2.05) * cam;
  const panX = 260 * (1 - cam);
  const panY = 170 * (1 - cam);
  // 翻面：35f 快翻尾缓（判例）
  const rotY = interpolate(frame, [14, 49], [0, 180], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  // 侧棱只闪一下：2f 脉冲、4f 归零（~f21 = 90°）
  const bloom = interpolate(frame, [19, 21, 23, 27], [0, 1, 0.25, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const breathe = frame > ALL_ON ? 0.5 + 0.5 * Math.sin((frame - ALL_ON) * 0.12) : 0;
  const panelGlow = bloom * 1.1 + breathe * 0.18 + (frame > ALL_ON ? 0.12 : 0);
  const live = ramp(frame, ALL_ON - 1, 10, EASE.out);
  const mapIn = ramp(frame, 34, 20, EASE.out);
  const bgPar = `translate(${(panX * 0.2).toFixed(2)}px, ${(panY * 0.2).toFixed(2)}px) scale(${(1 + (zoom - 1) * 0.08).toFixed(4)})`;

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.5 }} fill={{ x: 0.12, y: 0.95 }} intensity={0.75} breathe={0.4} grain={0.08} vignette={0.6}>
        {/* 远景幽灵瓷贴 */}
        <div style={{ position: 'absolute', inset: 0, transform: bgPar, opacity: mapIn }}>
          {GHOSTS.map((g, i) => (
            <div key={i} style={{
              position: 'absolute', left: g.x - g.s / 2, top: g.y - g.s / 2, width: g.s, height: g.s, borderRadius: g.s * 0.28,
              background: alpha('#2a2142', g.a * 1.1), border: `1px solid ${alpha('#cdb8ff', g.a * 0.25)}`, filter: `blur(${g.blur.toFixed(1)}px)`,
            }} />
          ))}
        </div>
      </Stage>

      {/* 光管层 */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          {/* 每管一个 userSpaceOnUse 渐变（粉 → 紫，集成端 → 中枢端）；水平/垂直线 bbox=0，不能用 objectBoundingBox */}
          {PIPES.map((p, i) => {
            const nums = p.path.match(/-?[\d.]+/g)!.map(Number);
            return (
              <linearGradient key={i} id={`pg-${uid}-${i}`} gradientUnits="userSpaceOnUse" x1={nums[0]} y1={nums[1]} x2={nums[nums.length - 2]} y2={nums[nums.length - 1]}>
                <stop offset="0%" stopColor={L.accent2} />
                <stop offset="100%" stopColor={L.accent} />
              </linearGradient>
            );
          })}
          <filter id={`glow-${uid}`} filterUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
            <feGaussianBlur stdDeviation="10" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`soft-${uid}`} filterUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        {PIPES.map((p, i) => {
          const grow = interpolate(frame, [T_PIPE, T_PIPE + GROW], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
          if (grow <= 0) return null;
          const on = p.len * grow;
          const pulse = frame > ALL_ON ? 0.86 + 0.14 * Math.sin((frame - ALL_ON) * 0.12 + i) : 1;
          const flowOffset = -((frame - T_PIPE) * FLOW_SPEED + i * 29);
          const flowIn = ramp(frame, ALL_ON, 8, EASE.out);
          const head = pointAt(p.path, on);
          return (
            <g key={i}>
              {/* 管槽：暗色底轨，让管"嵌"在场景里 */}
              <path d={p.path} fill="none" stroke={alpha('#000000', 0.5)} strokeWidth={16} strokeLinecap="round" strokeDasharray={`${on} ${p.len + 80}`} />
              <g filter={`url(#glow-${uid})`}>
                <path d={p.path} fill="none" stroke={`url(#pg-${uid}-${i})`} strokeWidth={11} strokeLinecap="round" strokeDasharray={`${on} ${p.len + 80}`} opacity={0.95 * pulse} />
              </g>
              <path d={p.path} fill="none" stroke="rgba(255,248,255,0.9)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray={`${on} ${p.len + 80}`} opacity={0.75 * pulse} />
              {grow < 1 && (
                <>
                  <circle cx={head[0]} cy={head[1]} r={18} fill={alpha('#ffe6fb', 0.55)} filter={`url(#soft-${uid})`} />
                  <circle cx={head[0]} cy={head[1]} r={5.5} fill="#fff" />
                </>
              )}
              {grow >= 1 && flowIn > 0 && (
                <>
                  <path d={p.path} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={9} strokeLinecap="round"
                    strokeDasharray={`28 ${FLOW_PERIOD - 28}`} strokeDashoffset={flowOffset} opacity={0.4 * flowIn} filter={`url(#soft-${uid})`} />
                  <path d={p.path} fill="none" stroke="#ffffff" strokeWidth={5.5} strokeLinecap="round"
                    strokeDasharray={`7 ${FLOW_PERIOD - 7}`} strokeDashoffset={flowOffset - 21} opacity={0.95 * flowIn} />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* 瓷贴：第一拍同帧弹现（过冲一次），接通后染粉色余光 */}
      {PIPES.map((p, i) => {
        const appear = ramp(frame, T_ICON, 13, EASE.linear);
        if (appear <= 0) return null;
        const pop = EASE.overshoot(appear);
        const on = ramp(frame, ALL_ON - 2, 10, EASE.out) * (frame > ALL_ON ? 0.82 + 0.18 * breathe : 1);
        return (
          <div key={i} style={{
            position: 'absolute', left: p.icon[0] - 60, top: p.icon[1] - 60,
            opacity: Math.min(1, appear * 2.2),
            transform: `translateY(${((1 - pop) * 24).toFixed(2)}px) scale(${(0.7 + 0.3 * pop).toFixed(4)})`,
          }}>
            <Tile app={APPS[i]} on={on} />
            {/* 名字放在不压管线的一侧：下出管的三枚放外侧，横出管的两枚放下方 */}
            <div style={{
              position: 'absolute', ...type(26, 600), color: on > 0.5 ? L.ink : L.ink2, whiteSpace: 'nowrap',
              ...(LABEL_SIDE[i] === 'below' ? { left: -40, right: -40, top: 136, textAlign: 'center' as const }
                : LABEL_SIDE[i] === 'left' ? { right: 142, top: 44, textAlign: 'right' as const } : { left: 142, top: 44 }),
            }}>
              {APPS[i].name}
            </div>
          </div>
        );
      })}

      {/* 中枢：双面卡整体翻转 180°（正面旧页 → 背面新中枢） */}
      <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: `${CX}px ${CY}px` }}>
        <div style={{
          position: 'absolute', left: CX - (PW * zoom) / 2, top: CY - (PH * zoom) / 2, width: PW * zoom, height: PH * zoom,
          transform: `translate(${panX.toFixed(2)}px, ${panY.toFixed(2)}px) rotateY(${rotY.toFixed(3)}deg)`,
          transformStyle: 'preserve-3d',
        }}>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
            <div style={{ zoom }}><FrontPanel glow={panelGlow} /></div>
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <div style={{ zoom }}><HubPanel glow={panelGlow} live={live} /></div>
          </div>
          {/* 侧棱过曝罩：只在 2f 闪里盖白 */}
          {bloom > 0.01 && (
            <div style={{
              position: 'absolute', inset: -6 * zoom, borderRadius: 26 * zoom, background: '#ffffff',
              opacity: Math.min(0.96, bloom * 1.05), filter: `blur(${5 * zoom}px)`,
              transform: rotY > 90 ? 'rotateY(180deg) translateZ(1px)' : 'translateZ(1px)', backfaceVisibility: 'hidden',
            }} />
          )}
        </div>
      </AbsoluteFill>

      {/* 管口涟漪：五管同帧抵达中枢边缘 */}
      {PIPES.map((p, i) => {
        const nums = p.path.match(/-?[\d.]+/g)!.map(Number);
        const [ex, ey] = [nums[nums.length - 2], nums[nums.length - 1]];
        const k = ramp(frame, ALL_ON - 1, 14, EASE.linear);
        if (k <= 0 || k >= 1) return null;
        const r = 6 + EASE.out(k) * 30;
        return (
          <div key={`port${i}`} style={{
            position: 'absolute', left: ex - r, top: ey - r, width: r * 2, height: r * 2, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.9)', opacity: (1 - k) * 0.85, boxShadow: `0 0 14px ${alpha(L.accent2, 0.7)}`,
          }} />
        );
      })}

      {/* 底部统计：接通后逐词升起 */}
      <div style={{ position: 'absolute', top: 884, left: 0, right: 0, textAlign: 'center', ...type(30, 600, { mono: true }), color: L.ink2, letterSpacing: '0.06em' }}>
        <TextReveal text="5 SOURCES  ·  2.4M RECORDS  ·  SYNCED IN REAL TIME" by="word" start={ALL_ON + 6} each={16} gap={2} />
      </div>

      {/* 侧棱瞬闪的全屏眩光：白核 + 紫 / 粉翼，只 2f */}
      {bloom > 0.02 && (
        <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
          <div style={{ position: 'absolute', left: 260, top: 40, width: 1400, height: 1000, opacity: bloom,
            background: 'radial-gradient(closest-side, rgba(255,255,255,0.98), rgba(240,225,255,0.7) 40%, rgba(167,139,250,0.35) 66%, transparent 88%)', filter: 'blur(24px)' }} />
          <div style={{ position: 'absolute', left: 1180, top: 160, width: 700, height: 620, opacity: bloom * 0.85,
            background: `radial-gradient(closest-side, ${alpha(L.accent2, 0.85)}, ${alpha(L.accent2, 0.3)} 60%, transparent 85%)`, filter: 'blur(30px)' }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
