// glow-wake-sleep-panel v3 —— 扫光方向改为从左向右（用户裁决）：
// 聚光灯从左向右"扫过"斜置面板；一条带辉光的紫色光线贴着 UI 顶边/边框/
// logo 划过，光到即亮、光走即暗，尾段沉回黑暗（右缘残留蓝紫）。
//
// 质感升级：灰阶骨架换成可信的看板界面（工作区 logo / 导航带图标与未读徽标 / Spaces 色块 /
// In review · Shipped 两列白底任务卡：标题、标签、到期、头像）；显影罩从单段线性（整圈照成灰）
// 改为"平台亮区 + S 形衰减"的光池，暗部带一点紫调；logo 描光从套住整块的大矩形改成贴着
// 工作区图标的圆角描边 + 辉光；补导出时长；暗角 + 颗粒防大面积暗场渐变色带。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Grain, Vignette } from '../../_fixtures/Polish';

export const GLOW_WAKE_SLEEP_PANEL_DURATION = 140; // 4–120f 扫过 + 100–130f 沉回黑暗 + 右缘残光收尾

const W = 1250;
const H = 860;
const R = 26;

const INK = '#1b1c21';
const INK2 = '#5f6068';
const INK3 = '#9a9ba2';
const HAIR = 'rgba(20,22,28,0.08)';
const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif';

// 16×16 线性小图标
const Ic: React.FC<{ d: string[]; c?: string; s?: number }> = ({ d, c = INK2, s = 17 }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const I_HOME = ['M2.75 7.25 8 3l5.25 4.25', 'M4.25 6.25v6.5h7.5v-6.5'];
const I_INBOX = ['M2.5 9h3l1 1.75h3l1-1.75h3', 'M4.25 3.5h7.5l1.75 5.5v3.25c0 .4-.35.75-.75.75h-9.5a.75.75 0 0 1-.75-.75V9z'];
const I_DOC = ['M4.25 2.5h4.5l3 3v7.25c0 .4-.35.75-.75.75h-6.75a.75.75 0 0 1-.75-.75v-9.5c0-.4.35-.75.75-.75z', 'M8.75 2.5v3h3'];
const I_CHART = ['M3 13V9', 'M6.5 13V4.5', 'M10 13V7', 'M13.5 13V3'];
const I_BOARD = ['M3 3h3.5v10H3z', 'M9.5 3H13v6H9.5z'];

const NavRow: React.FC<{ icon: string[]; label: string; badge?: string; active?: boolean }> = ({ icon, label, badge, active }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12, height: 34, padding: '0 10px', margin: '0 -10px', borderRadius: 9,
    background: active ? 'rgba(107,91,214,0.1)' : 'transparent', color: active ? '#4b3fb0' : INK2, fontSize: 16, fontWeight: active ? 600 : 500,
  }}>
    <Ic d={icon} c={active ? '#6b5bd6' : INK3} />
    {label}
    {badge && <div style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, color: '#fff', background: '#6b5bd6', borderRadius: 999, padding: '2px 8px' }}>{badge}</div>}
  </div>
);
const SpaceRow: React.FC<{ color: string; label: string; active?: boolean }> = ({ color, label, active }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 32, fontSize: 15.5, color: active ? INK : INK2, fontWeight: active ? 600 : 500 }}>
    <div style={{ width: 18, height: 18, borderRadius: 5, background: color, opacity: active ? 1 : 0.85, flex: 'none' }} />
    {label}
  </div>
);

const TASKS = [
  [
    { t: 'Onboarding checklist copy', tag: 'Content', who: 'MC', due: 'Oct 14' },
    { t: 'Pricing page A/B test', tag: 'Growth', who: 'LN', due: 'Oct 16' },
    { t: 'Empty states for Inbox', tag: 'Design', who: 'PI', due: 'Oct 18' },
    { t: 'Launch email sequence', tag: 'Marketing', who: 'JP', due: 'Oct 21' },
  ],
  [
    { t: 'Realtime notifications', tag: 'Platform', who: 'SO', due: 'Shipped' },
    { t: 'Dark mode for Docs', tag: 'Design', who: 'MC', due: 'Shipped' },
    { t: 'SSO for enterprise', tag: 'Security', who: 'JP', due: 'Shipped' },
    { t: 'Usage-based billing', tag: 'Payments', who: 'LN', due: 'Shipped' },
  ],
];
const AV: Record<string, [string, string]> = {
  MC: ['#efe1dc', '#9a5a48'], LN: ['#dfe6f3', '#4c6496'], PI: ['#e6e2f4', '#6a5aa8'], SO: ['#e0eee6', '#4a7a5e'], JP: ['#f1ead8', '#8a6d2e'],
};

const TaskCard: React.FC<{ t: string; tag: string; who: string; due: string; done: boolean }> = ({ t, tag, who, due, done }) => (
  <div style={{
    marginTop: 14, padding: '14px 16px 13px', background: '#ffffff', borderRadius: 12,
    boxShadow: `inset 0 0 0 1px ${HAIR}, 0 1px 2px rgba(16,18,24,0.05), 0 6px 14px -8px rgba(16,18,24,0.14)`,
  }}>
    <div style={{ fontSize: 16.5, fontWeight: 600, color: INK, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{t}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11 }}>
      <div style={{ fontSize: 12.5, fontWeight: 550, color: INK2, background: '#f1f1ef', boxShadow: `inset 0 0 0 1px ${HAIR}`, borderRadius: 6, padding: '3px 8px' }}>{tag}</div>
      <div style={{ fontSize: 13, color: done ? '#4a8a64' : INK3, display: 'flex', alignItems: 'center', gap: 5 }}>
        {done && <Ic d={['m3.5 8.5 3 3 6-7']} c="#4a8a64" s={13} />}
        {due}
      </div>
      <div style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: 12, background: AV[who][0], color: AV[who][1], fontSize: 10.5, fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{who}</div>
    </div>
  </div>
);

// 斜置面板（ClickUp 布局形：侧栏 + In review / Shipped 两列看板）
const Panel: React.FC = () => (
  <div style={{
    width: W, height: H, background: 'linear-gradient(180deg, #fafaf9 0%, #f3f3f1 100%)', borderRadius: R,
    display: 'flex', overflow: 'hidden', boxSizing: 'border-box', fontFamily: SANS, color: INK,
  }}>
    <div style={{ width: 300, borderRight: `1.5px solid ${HAIR}`, padding: '30px 28px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.45)' }}>
      {/* logo：工作区图标 + 名称（光经过时描光的对象） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #8b6cf0 0%, #5a46cf 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)', color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N</div>
        <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: '-0.015em' }}>Northwind</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <NavRow icon={I_HOME} label="Home" />
        <NavRow icon={I_INBOX} label="Inbox" badge="12" />
        <NavRow icon={I_DOC} label="Docs" />
        <NavRow icon={I_CHART} label="Dashboards" />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.09em', color: INK3, margin: '34px 0 12px' }}>SPACES</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SpaceRow color="#6b5bd6" label="Product launch" active />
        <SpaceRow color="#c4a644" label="Design system" />
        <SpaceRow color="#4f8f6f" label="Marketing" />
        <SpaceRow color="#d0745a" label="Engineering" />
      </div>
    </div>
    <div style={{ flex: 1, padding: '30px 36px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Ic d={I_BOARD} c="#6b5bd6" s={22} />
        <div style={{ fontSize: 23, fontWeight: 650, letterSpacing: '-0.02em' }}>Product launch</div>
        <div style={{ display: 'flex', gap: 22, marginLeft: 40, fontSize: 15.5, color: INK3, fontWeight: 500 }}>
          <span style={{ color: '#4b3fb0', fontWeight: 600 }}>Board</span>
          <span>List</span>
          <span>Calendar</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 44 }}>
        {[0, 1].map((col) => (
          <div key={col} style={{ flex: 1 }}>
            <div style={{ borderTop: `3px solid ${col === 0 ? '#c4a644' : '#6b5bd6'}`, paddingTop: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13.5, fontWeight: 650, letterSpacing: '0.08em', color: INK2 }}>{col === 0 ? 'IN REVIEW' : 'SHIPPED'}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: INK3, background: '#ebebe8', borderRadius: 999, padding: '2px 8px', fontVariantNumeric: 'tabular-nums' }}>4</div>
            </div>
            {TASKS[col].map((tk, i) => <TaskCard key={i} {...tk} done={col === 1} />)}
            <div style={{ marginTop: 14, height: 40, borderRadius: 12, border: '1.5px dashed rgba(20,22,28,0.12)', display: 'flex', alignItems: 'center', paddingLeft: 16, fontSize: 14.5, color: INK3, fontWeight: 500 }}>+ New task</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 贴边紫色光线（多层辉光：宽糊层+中层+亮芯），水平段，中心在 cx
const EdgeStreak: React.FC<{ cx: number; y: number; len: number; opacity: number; vertical?: boolean }> =
  ({ cx, y, len, opacity, vertical = false }) => {
    const long = { position: 'absolute' as const, left: 0, top: 0, opacity };
    const grad = (c: string) => vertical
      ? `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${c} 45%, ${c} 55%, rgba(0,0,0,0) 100%)`
      : `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${c} 45%, ${c} 55%, rgba(0,0,0,0) 100%)`;
    if (vertical) {
      return (
        <div style={long}>
          <div style={{ position: 'absolute', left: y - 30, top: cx - len / 2, width: 60, height: len, background: grad('rgba(147,80,235,0.55)'), filter: 'blur(26px)' }} />
          <div style={{ position: 'absolute', left: y - 11, top: cx - len / 2, width: 22, height: len, background: grad('rgba(190,120,255,0.85)'), filter: 'blur(9px)' }} />
          <div style={{ position: 'absolute', left: y - 2.5, top: cx - len * 0.4, width: 5, height: len * 0.8, background: grad('#f0deff'), filter: 'blur(1.4px)' }} />
        </div>
      );
    }
    return (
      <div style={long}>
        <div style={{ position: 'absolute', left: cx - len / 2, top: y - 34, width: len, height: 68, background: grad('rgba(150,82,238,0.60)'), filter: 'blur(26px)' }} />
        <div style={{ position: 'absolute', left: cx - len / 2, top: y - 12, width: len, height: 24, background: grad('rgba(196,126,255,0.9)'), filter: 'blur(9px)' }} />
        <div style={{ position: 'absolute', left: cx - len * 0.4, top: y - 3, width: len * 0.8, height: 6, background: grad('#f4e4ff'), filter: 'blur(1.6px)' }} />
        {/* 粉色偏移层：截图里光带紫中带粉 */}
        <div style={{ position: 'absolute', left: cx - len * 0.3, top: y - 7, width: len * 0.6, height: 12, background: grad('rgba(240,150,230,0.75)'), filter: 'blur(5px)' }} />
      </div>
    );
  };

export const GlowWakeSleepPanel: React.FC = () => {
  const frame = useCurrentFrame();

  // 聚光沿面板顶边从左向右匀速扫过（面板本地座标）
  const sx = interpolate(frame, [4, 120], [-260, W + 260], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const sy = 150; // 聚光照在面板上部

  // 全局明暗包络：醒 → 展示 → 睡
  const env = interpolate(frame, [0, 16, 100, 130], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // 尾段右缘残光：最后只剩右缘一线蓝紫
  const rightNear = Math.max(0, Math.min(1, (sx - (W - 420)) / 420));
  const tailBlue = interpolate(frame, [100, 116, 132], [0, 0.8, 0.25], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // logo 描光：聚光经过 logo（本地 x≈60）时点亮
  const logoGlow = Math.exp(-((sx - 60) ** 2) / (2 * 230 ** 2)) * env;

  // 摄影机慢漂移：面板随扫光从左上往右下走（对应扫光方向）
  const drift = interpolate(frame, [0, 132], [-150, 150]);
  const driftY = interpolate(frame, [0, 132], [-36, 36]);

  return (
    <AbsoluteFill style={{ background: '#040308', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, perspective: 1700, perspectiveOrigin: '46% 40%' }}>
        <div style={{
          position: 'absolute', left: 400, top: 150,
          transform: `translate(${drift}px, ${driftY}px) scale(1.05) rotateY(-13deg) rotateX(9deg) rotateZ(-17deg)`,
          transformStyle: 'preserve-3d',
        }}>
          {/* 聚光环境雾光：跟随光头，泛在面板后黑场 */}
          <div style={{
            position: 'absolute', left: sx - 520, top: -300, width: 1040, height: 700,
            background: 'radial-gradient(ellipse at 50% 55%, rgba(110,62,205,0.42), rgba(110,62,205,0) 65%)',
            filter: 'blur(34px)', opacity: env,
          }} />
          {/* 后层重影面板（截图④⑤双层） */}
          <div style={{ position: 'absolute', left: -46, top: 34 }}>
            <div style={{ position: 'relative', filter: 'brightness(0.92)' }}>
              <Panel />
              {/* 重影面板同样受聚光范围控制 */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: R,
                background: `radial-gradient(circle 680px at ${sx - 46}px ${sy + 34}px, rgba(5,3,12,${1 - 0.45 * env}) 0%, rgba(5,3,12,${1 - 0.3 * env}) 30%, rgba(5,3,12,${1 - 0.14 * env}) 55%, rgba(5,3,12,0.99) 88%)`,
              }} />
            </div>
          </div>
          {/* 面板本体：聚光范围内显影，范围外沉黑 */}
          <div style={{ position: 'relative' }}>
            <Panel />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: R,
              // 光池衰减：中心 ~22% 内是平台亮区，之后按 S 形压暗（替代单段线性——那会把整圈照成灰）
              background: `radial-gradient(circle 640px at ${sx}px ${sy}px, rgba(5,3,12,${0.12 * (1 - env)}) 0%, rgba(5,3,12,${0.12 * (1 - env) + 0.03 * env}) 22%, rgba(5,3,12,${1 - 0.84 * env}) 42%, rgba(5,3,12,${1 - 0.5 * env}) 60%, rgba(5,3,12,${1 - 0.14 * env}) 78%, rgba(5,3,12,0.985) 92%)`,
            }} />
            {/* 尾段右缘蓝紫残光罩 */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: R,
              background: 'linear-gradient(260deg, rgba(120,130,235,0.30) 0%, rgba(120,130,235,0) 16%)',
              opacity: tailBlue,
            }} />
          </div>
          {/* 贴顶边划过的紫色光线（本体） */}
          <EdgeStreak cx={sx} y={-2} len={980} opacity={env} />
          {/* 右缘竖直光线：聚光接近右侧时点亮，尾段转蓝紫 */}
          <EdgeStreak cx={260} y={W + 2} len={620} opacity={Math.max(rightNear * env, tailBlue * 0.9)} vertical />
          {/* logo 一圈描光（截图⑤：光经过 logo 时） */}
          <div style={{
            position: 'absolute', left: 28, top: 30, width: 30, height: 30, borderRadius: 8,
            boxShadow: '0 0 0 1.5px rgba(232,206,255,0.95), 0 0 22px 9px rgba(196,126,255,0.85), 0 0 64px 24px rgba(150,82,238,0.5)',
            opacity: logoGlow,
          }} />
          {/* 光头本体眩光：贴着顶边的亮团 */}
          <div style={{
            position: 'absolute', left: sx - 190, top: -84, width: 380, height: 170,
            background: 'radial-gradient(ellipse, rgba(236,205,255,0.95), rgba(180,110,250,0.35) 45%, rgba(0,0,0,0) 72%)',
            filter: 'blur(12px)', opacity: env * 0.95,
          }} />
        </div>
      </div>
      <Vignette strength={0.5} inner={0.45} color="#000000" />
      <Grain opacity={0.09} blend="soft-light" />
    </AbsoluteFill>
  );
};
