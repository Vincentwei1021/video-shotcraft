// slide-spotlight-pan v2 —— 按用户截图 clickup03 重做：
// 紫色光线贴着 UI 面板边缘泛光（先绕左上角竖缘、再沿顶边横走），
// 聚光头匀速右移，照到处显影、离开处沉暗；面板匀速左滑（相机右摇感）。
// 用户裁决："紫色的光线是贴着ui界面泛光的，聚光的移动是匀速的"。
//
// 质感升级：灰阶骨架换成可信的三列看板（工作区 logo、带图标与徽标的导航、Spaces 色块、
// In progress / In review / Shipped 白底任务卡：标题、进度条、标签、到期、叠放头像）；
// 显影罩从三段线性改为"平台亮区 + S 形衰减"的光池，暗部带紫调；补导出时长（匀速段 132f，
// 插值全部钳位）；暗角 + 颗粒防大面积暗场色带。光线几何、匀速节奏一律不动。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Grain, Vignette } from '../../_fixtures/Polish';

export const SLIDE_SPOTLIGHT_PAN_DURATION = 132; // 面板左滑 + 光头右移的匀速段

const INK = '#1b1c21';
const INK2 = '#5f6068';
const INK3 = '#9a9ba2';
const HAIR = 'rgba(20,22,28,0.08)';
const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif';

const PW = 3000;
const PH = 1400;
const TOP = 150;   // 面板顶边在屏幕座标的 y
const CR = 60;     // 面板圆角
const DUR = 132;   // 光头/面板匀速段的总帧数

const Ic: React.FC<{ d: string[]; c?: string; s?: number }> = ({ d, c = INK2, s = 28 }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const I_HOME = ['M2.75 7.25 8 3l5.25 4.25', 'M4.25 6.25v6.5h7.5v-6.5'];
const I_INBOX = ['M2.5 9h3l1 1.75h3l1-1.75h3', 'M4.25 3.5h7.5l1.75 5.5v3.25c0 .4-.35.75-.75.75h-9.5a.75.75 0 0 1-.75-.75V9z'];
const I_DOC = ['M4.25 2.5h4.5l3 3v7.25c0 .4-.35.75-.75.75h-6.75a.75.75 0 0 1-.75-.75v-9.5c0-.4.35-.75.75-.75z', 'M8.75 2.5v3h3'];
const I_BOARD = ['M3 3h3.5v10H3z', 'M9.5 3H13v6H9.5z'];
const I_CAL = ['M3.5 4h9v8.5h-9z', 'M3.5 7h9', 'M6 2.5V5', 'M10 2.5V5'];

const SideRow: React.FC<{ icon: string[]; label: string; badge?: string; active?: boolean }> = ({ icon, label, badge, active }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 20, height: 60, padding: '0 18px', margin: '0 -18px', borderRadius: 14,
    background: active ? 'rgba(107,91,214,0.1)' : 'transparent', fontSize: 27, fontWeight: active ? 600 : 500, color: active ? '#4b3fb0' : INK2,
  }}>
    <Ic d={icon} c={active ? '#6b5bd6' : INK3} />
    {label}
    {badge && <div style={{ marginLeft: 'auto', fontSize: 21, fontWeight: 650, color: '#fff', background: '#6b5bd6', borderRadius: 999, padding: '3px 14px' }}>{badge}</div>}
  </div>
);
const Space: React.FC<{ color: string; label: string; active?: boolean }> = ({ color, label, active }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 20, height: 56, fontSize: 26, fontWeight: active ? 600 : 500, color: active ? INK : INK2 }}>
    <div style={{ width: 30, height: 30, borderRadius: 8, background: color, flex: 'none' }} />
    {label}
  </div>
);

const AV: Record<string, [string, string]> = {
  MC: ['#efe1dc', '#9a5a48'], LN: ['#dfe6f3', '#4c6496'], PI: ['#e6e2f4', '#6a5aa8'], SO: ['#e0eee6', '#4a7a5e'], JP: ['#f1ead8', '#8a6d2e'],
};
type TaskT = { t: string; tag: string; who: string[]; due: string; prog?: number };

const Task: React.FC<{ task: TaskT; done?: boolean }> = ({ task, done }) => (
  <div style={{
    marginTop: 26, padding: '26px 30px 24px', background: '#ffffff', borderRadius: 20,
    boxShadow: `inset 0 0 0 1.5px ${HAIR}, 0 2px 4px rgba(16,18,24,0.05), 0 12px 28px -14px rgba(16,18,24,0.16)`,
  }}>
    <div style={{ fontSize: 30, fontWeight: 600, color: INK, letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>{task.t}</div>
    {task.prog !== undefined && (
      <div style={{ marginTop: 18, height: 8, borderRadius: 4, background: '#ececea', overflow: 'hidden' }}>
        <div style={{ width: `${task.prog}%`, height: '100%', borderRadius: 4, background: '#6b5bd6' }} />
      </div>
    )}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 550, color: INK2, background: '#f1f1ef', boxShadow: `inset 0 0 0 1.5px ${HAIR}`, borderRadius: 10, padding: '5px 14px' }}>{task.tag}</div>
      <div style={{ fontSize: 22, color: done ? '#4a8a64' : INK3, fontVariantNumeric: 'tabular-nums' }}>{done ? '✓ ' : ''}{task.due}</div>
      <div style={{ marginLeft: 'auto', display: 'flex' }}>
        {task.who.map((w, i) => (
          <div key={i} style={{ marginLeft: i ? -10 : 0, width: 42, height: 42, borderRadius: 21, background: AV[w][0], color: AV[w][1], boxShadow: '0 0 0 3px #fff', fontSize: 17, fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{w}</div>
        ))}
      </div>
    </div>
  </div>
);

const COLS: { name: string; accent: string; tasks: TaskT[]; done?: boolean }[] = [
  { name: 'IN PROGRESS', accent: '#c4a644', tasks: [
    { t: 'Onboarding checklist copy', tag: 'Content', who: ['MC', 'PI'], due: 'Oct 14', prog: 72 },
    { t: 'Pricing page A/B test', tag: 'Growth', who: ['LN'], due: 'Oct 16', prog: 40 },
    { t: 'Docs search relaunch', tag: 'Content', who: ['SO'], due: 'Oct 24', prog: 18 },
  ] },
  { name: 'IN REVIEW', accent: '#6b5bd6', tasks: [
    { t: 'Empty states for Inbox', tag: 'Design', who: ['PI', 'MC'], due: 'Oct 18' },
    { t: 'Launch email sequence', tag: 'Marketing', who: ['JP'], due: 'Oct 21' },
    { t: 'Mobile push opt-in flow', tag: 'Growth', who: ['LN', 'PI'], due: 'Oct 23' },
  ] },
  { name: 'SHIPPED', accent: '#4f8f6f', done: true, tasks: [
    { t: 'Realtime notifications', tag: 'Platform', who: ['SO', 'LN'], due: 'Shipped' },
    { t: 'SSO for enterprise', tag: 'Security', who: ['JP'], due: 'Shipped' },
    { t: 'Dark mode for Docs', tag: 'Design', who: ['MC'], due: 'Shipped' },
  ] },
];

const Col: React.FC<{ c: (typeof COLS)[number]; w: number }> = ({ c, w }) => (
  <div style={{ width: w, flexShrink: 0 }}>
    <div style={{ borderTop: `5px solid ${c.accent}`, paddingTop: 26, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ fontSize: 23, fontWeight: 650, letterSpacing: '0.08em', color: INK2 }}>{c.name}</div>
      <div style={{ fontSize: 21, fontWeight: 600, color: INK3, background: '#ebebe8', borderRadius: 999, padding: '3px 13px', fontVariantNumeric: 'tabular-nums' }}>{c.tasks.length}</div>
      <div style={{ marginLeft: 'auto', fontSize: 30, color: INK3, lineHeight: 1 }}>+</div>
    </div>
    {c.tasks.map((t, i) => <Task key={i} task={t} done={c.done} />)}
  </div>
);

// 超宽面板内容（放大特写级别）：侧栏 + 顶栏 + 三列看板
const WidePanel: React.FC = () => (
  <div style={{
    width: PW, height: PH, background: 'linear-gradient(180deg, #fafaf9 0%, #f2f2f0 100%)',
    display: 'flex', boxSizing: 'border-box', fontFamily: SANS, color: INK,
    borderRadius: `${CR}px ${CR}px 0 0`, overflow: 'hidden',
  }}>
    <div style={{ width: 560, borderRight: `2px solid ${HAIR}`, padding: '52px 48px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 50 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #8b6cf0 0%, #5a46cf 100%)', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.35)', color: '#fff', fontSize: 27, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N</div>
        <div style={{ fontSize: 31, fontWeight: 650, letterSpacing: '-0.02em' }}>Northwind</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SideRow icon={I_HOME} label="Home" />
        <SideRow icon={I_INBOX} label="Inbox" badge="12" />
        <SideRow icon={I_DOC} label="Docs" />
      </div>
      <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '0.09em', color: INK3, margin: '56px 0 20px' }}>SPACES</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Space color="#6b5bd6" label="Product launch" active />
        <Space color="#c4a644" label="Design system" />
        <Space color="#4f8f6f" label="Marketing" />
      </div>
    </div>
    <div style={{ flex: 1, padding: '52px 64px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
        <Ic d={I_BOARD} c="#6b5bd6" s={38} />
        <div style={{ fontSize: 40, fontWeight: 650, letterSpacing: '-0.025em' }}>Product launch</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginLeft: 64, fontSize: 26, fontWeight: 500, color: INK3 }}>
          <span style={{ color: '#4b3fb0', fontWeight: 600 }}>Board</span>
          <span>List</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Ic d={I_CAL} c={INK3} s={24} />Calendar</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 84 }}>
        {COLS.map((c, i) => <Col key={i} c={c} w={620} />)}
      </div>
    </div>
  </div>
);

export const SlideSpotlightPan: React.FC = () => {
  const frame = useCurrentFrame();
  // 面板匀速左滑（相机右摇）——严格 linear
  const slide = interpolate(frame, [0, DUR], [180, -1100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 聚光头在面板本地座标沿顶边匀速右移——严格 linear
  // 起点在左上角竖缘（负值=还在左缘竖直段），随后转过角沿顶边走
  const head = interpolate(frame, [0, DUR], [-360, 2600], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const onTop = Math.max(0, head);            // 顶边段进度
  const cornerT = Math.min(1, Math.max(0, (head + 360) / 360)); // 竖缘段 0→1
  const vertHeadY = TOP + 620 - cornerT * 620; // 左缘光头从下往上爬到角

  // 屏幕座标的光头位置
  const headScreenX = slide + onTop;
  // 光头在竖缘阶段贴着面板左缘
  const leftEdgeX = slide;

  // 竖缘光线强度：角前满、转角后衰减
  const vGlow = head < 0 ? 1 : Math.max(0, 1 - head / 900);
  // 顶边光线强度：转角后满
  const hGlow = Math.min(1, Math.max(0, (head + 120) / 240));

  const grad = (dir: string, c: string) =>
    `linear-gradient(${dir}, rgba(0,0,0,0) 0%, ${c} 42%, ${c} 58%, rgba(0,0,0,0) 100%)`;

  return (
    <AbsoluteFill style={{ background: '#050409', overflow: 'hidden' }}>
      {/* 面板层：聚光范围内显影 */}
      <div style={{ position: 'absolute', left: 0, top: TOP, transform: `translateX(${slide}px)` }}>
        <WidePanel />
        {/* 贴面泛光：光头下方的紫光晕染进 UI 顶部（贴着界面泛光的关键层） */}
        <div style={{
          position: 'absolute', left: onTop - 620, top: -30, width: 1240, height: 380,
          background: 'radial-gradient(ellipse 620px 190px at 50% 0%, rgba(168,95,245,0.5), rgba(140,75,235,0.16) 55%, rgba(0,0,0,0) 78%)',
          filter: 'blur(6px)', opacity: hGlow,
        }} />
        {/* 左缘贴面泛光（竖缘阶段） */}
        <div style={{
          position: 'absolute', left: -30, top: vertHeadY - TOP - 320, width: 340, height: 780,
          background: 'radial-gradient(ellipse 170px 390px at 0% 50%, rgba(168,95,245,0.45), rgba(140,75,235,0.14) 55%, rgba(0,0,0,0) 78%)',
          filter: 'blur(6px)', opacity: vGlow,
        }} />
        {/* 聚光范围外压暗：以光头为中心的显影罩（面板本地座标，跟光头走） */}
        <div style={{
          position: 'absolute', inset: -60,
          // 光池：中心平台亮区 → S 形衰减到沉黑（暗部带一点紫调），替代三段线性的灰雾
          background: `radial-gradient(ellipse 1350px 1000px at ${onTop + 60}px ${(head < 0 ? vertHeadY - TOP : 40) + 260}px, rgba(6,4,14,0) 22%, rgba(6,4,14,0.06) 32%, rgba(6,4,14,0.3) 44%, rgba(6,4,14,0.62) 58%, rgba(6,4,14,0.86) 76%, rgba(5,4,9,0.97) 100%)`,
        }} />
      </div>

      {/* ===== 贴边紫色光线本体（屏幕层，贴着面板边缘） ===== */}
      {/* 顶边横向光线：三层辉光 + 亮芯，中心=光头 */}
      <div style={{ opacity: hGlow }}>
        <div style={{
          position: 'absolute', left: headScreenX - 640, top: TOP - 56, width: 1280, height: 112,
          background: grad('90deg', 'rgba(150,82,238,0.55)'), filter: 'blur(30px)',
        }} />
        <div style={{
          position: 'absolute', left: headScreenX - 470, top: TOP - 17, width: 940, height: 34,
          background: grad('90deg', 'rgba(196,126,255,0.9)'), filter: 'blur(10px)',
        }} />
        <div style={{
          position: 'absolute', left: headScreenX - 330, top: TOP - 8, width: 660, height: 16,
          background: grad('90deg', 'rgba(240,155,235,0.85)'), filter: 'blur(5px)',
        }} />
        <div style={{
          position: 'absolute', left: headScreenX - 300, top: TOP - 3, width: 600, height: 6,
          background: grad('90deg', '#f6e8ff'), filter: 'blur(1.5px)',
        }} />
      </div>
      {/* 左上角竖缘光线（起始阶段，贴面板左缘） */}
      <div style={{ opacity: vGlow }}>
        <div style={{
          position: 'absolute', left: leftEdgeX - 52, top: vertHeadY - 420, width: 104, height: 840,
          background: grad('180deg', 'rgba(150,82,238,0.5)'), filter: 'blur(28px)',
        }} />
        <div style={{
          position: 'absolute', left: leftEdgeX - 14, top: vertHeadY - 330, width: 28, height: 660,
          background: grad('180deg', 'rgba(196,126,255,0.9)'), filter: 'blur(9px)',
        }} />
        <div style={{
          position: 'absolute', left: leftEdgeX - 3, top: vertHeadY - 260, width: 6, height: 520,
          background: grad('180deg', '#f6e8ff'), filter: 'blur(1.5px)',
        }} />
      </div>

      {/* 顶上方黑檐：光带以上纯黑（截图里顶边之上是黑场） */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: 1920, height: TOP - 4,
        background: 'linear-gradient(180deg, #050409 78%, rgba(5,4,9,0) 100%)',
      }} />
      <Vignette strength={0.4} inner={0.5} color="#000000" />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
