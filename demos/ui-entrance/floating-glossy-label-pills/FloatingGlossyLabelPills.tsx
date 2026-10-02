// floating-glossy-label-pills — Glossy Pills Carousel 高光胶囊横滑走廊（motion-lab 定稿转原生 Remotion）
// 白底四角强调色雾霭，四块浅色 dashboard mockup（三栏定价卡 / 折线图仪表盘 /
// 服务状态表格 / 表单+开关列表）横向排队，各顶一枚高光强调色胶囊标签；
// 轨道环形循环，任一拍居中面板左右都露出相邻面板边缘。开场有上一拍收尾余量
// （偏左 11px 缓归位），随后轨道三拍向右换位（t≈0.20/0.483/0.688，inOutCubic，
// 第一拍带长尾）——居中者放大清晰，两侧缩至 0.62、下沉变淡微模糊；t≈0.717 黑色
// 描白边光标右上硬现，减速斜滑向左下，t≈0.90 停在末位胶囊右端。
// 整卡唯一色相来源是 ACCENT 及其深浅档，按项目品牌色替换即换肤。
// 设计坐标 480×270（DesignStage 等比放大，raster=zoom 让小字按目标分辨率栅格化），参数表数值以此坐标系标定。
// 质感层（改版）：面板内容从灰条骨架换成出版级假 UI（真实文案 + 数字 + 图表，仍是可整块换截图的占位）；
// 面板 1.5px 色边换成发丝线 + 内高光 + 随离心高度变化的两层软阴影；胶囊固定宽度、裁进圆角的
// 玻璃高光；换位时整条轨道按速度加横向运动模糊，胶囊比面板晚约 2f 落定（跟随）；
// 光标换成矢量 macOS 指针，抵达后末位胶囊有一次轻微 hover 提亮。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DesignStage, E, lerp, rand, seg } from '../../_fixtures/Motion';
import { FONT, Grain, SpeedBlur, Vignette, mix, ramp, softShadow, velocity } from '../../_fixtures/Polish';

export const FLOATING_GLOSSY_LABEL_PILLS_DURATION = 120; // 4000ms @30fps
const LAST = FLOATING_GLOSSY_LABEL_PILLS_DURATION - 1; // useT 口径：末帧 t=1

// ── 模板强调色：实际使用时按项目品牌色替换这一组变量 ──
const ACCENT = '#5b63d3'; // 与 fixture 一致的安静靛蓝
const ACCENT_LIGHT = '#868ce0', ACCENT_DEEP = '#3a3f98';
const A_RGB = '91,99,211', AL_RGB = '134,140,224', AD_RGB = '58,63,152';
const F = FONT.sans;

// 逐帧实测（480×270 裁切系）：
//   居中面板 x 105-357（W≈252）、top=75，下缘正好压住画面底 → 真高 H≈195
//   邻位（静止）面板 x -70..86（缩到 0.62）、top=126 → 缩放 + 下沉 51px
//   相邻两块中心距 SP≈232
// 内部 UI 按 330×255 的内容坐标书写，再整体等比 scale 到 252×195
const CW = 330, CH = 255, CS = 252 / CW;
const W = Math.round(CW * CS), H = Math.round(CH * CS), SP = 232;
const PANEL_TOP = 75;
const PILL_W = 104, PILL_H = 24; // 胶囊固定宽度：换文案不改宽，光标终点不用重标

// ── 假 UI 零件（内容坐标 330×255；1 单位 ≈ 3px 成片像素） ──
const INK = '#1b1d24', INK2 = '#626670', INK3 = '#a2a5ad', FILL = '#f3f4f6', LINE = 'rgba(20,22,28,0.08)';
const HAIR = 0.45; // 内容坐标里的发丝线宽（≈1.3px 成片像素）

// 骨架条：只给正文段落用（读不到的"纹理"），默认圆角 min(h/2, 3)
const Skel: React.FC<{ x: number; y: number; w: number; h: number; col: string; r?: number }> = ({ x, y, w, h, col, r }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r === undefined ? Math.min(h / 2, 3) : r, background: col }} />
);

// 文字：小字放开字距、大字收紧，数字等宽
const Txt: React.FC<{ x: number; y: number; s: number; w?: number; c?: string; children: React.ReactNode; ls?: number; right?: boolean }> = ({
  x, y, s, w = 500, c = INK, children, ls, right,
}) => (
  <div
    style={{
      position: 'absolute', top: y, ...(right ? { right: x } : { left: x }), fontSize: s, fontWeight: w, color: c, lineHeight: 1,
      letterSpacing: `${ls ?? (s >= 12 ? -0.03 : s >= 8 ? -0.012 : 0.01)}em`, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
    }}
  >
    {children}
  </div>
);

// 发丝线卡片底
const Box: React.FC<{ x: number; y: number; w: number; h: number; children?: React.ReactNode; bg?: string }> = ({ x, y, w, h, children, bg = '#fff' }) => (
  <div
    style={{
      position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 6, background: bg,
      boxShadow: `0 0 0 ${HAIR}px ${LINE}, 0 1px 2px rgba(16,18,24,0.04)`,
    }}
  >
    {children}
  </div>
);

// 窗口顶栏：品牌方块 + 产品名 + 搜索框 + 头像
const Topbar: React.FC = () => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 18, background: '#fff', boxShadow: `0 ${HAIR}px 0 ${LINE}`, zIndex: 1 }}>
    <div style={{ position: 'absolute', left: 8, top: 5, width: 8, height: 8, borderRadius: 2.5, background: `linear-gradient(160deg, ${ACCENT_LIGHT}, ${ACCENT})` }} />
    <Txt x={20} y={6} s={6} w={650}>Northwind</Txt>
    <div style={{ position: 'absolute', left: 120, top: 4.5, width: 90, height: 9, borderRadius: 4.5, background: FILL, boxShadow: `inset 0 0 0 ${HAIR}px ${LINE}` }}>
      <Txt x={6} y={2.3} s={4.4} c={INK3}>Search…</Txt>
    </div>
    <div style={{ position: 'absolute', right: 8, top: 4, width: 10, height: 10, borderRadius: '50%', background: '#e5e3dd' }}>
      <Txt x={2.2} y={3} s={4} w={650} c="#5a5650">JL</Txt>
    </div>
  </div>
);

// 左侧导航：一条高亮项（随页面不同）
const NAV = ['Overview', 'Pricing', 'Analytics', 'Status', 'Customers', 'Billing', 'Settings'];
const Sidebar: React.FC<{ active: number }> = ({ active }) => (
  <div style={{ position: 'absolute', left: 0, top: 18, width: 70, height: 'calc(100% - 18px)', background: '#f8f8f9', boxShadow: `${HAIR}px 0 0 ${LINE}` }}>
    <Txt x={9} y={9} s={4.2} w={600} c={INK3} ls={0.08}>WORKSPACE</Txt>
    {NAV.map((n, i) => (
      <div key={n} style={{ position: 'absolute', left: 5, top: 19 + i * 13, width: 60, height: 10, borderRadius: 3, background: i === active ? `rgba(${A_RGB},0.10)` : 'transparent' }}>
        <div style={{ position: 'absolute', left: 4, top: 3, width: 4, height: 4, borderRadius: 1.2, background: i === active ? ACCENT : '#c9cbd1' }} />
        <Txt x={12} y={2.6} s={5} w={i === active ? 650 : 500} c={i === active ? ACCENT_DEEP : INK2}>{n}</Txt>
      </div>
    ))}
  </div>
);

// 1) 三栏定价卡（居中标题 + 三张卡：档位名 / 价格大字 / 权益清单 / 按钮）
const TIERS = [
  { n: 'Starter', p: '$12', f: ['3 projects', 'Basic reports', 'Email support', '1 GB storage'] },
  { n: 'Team', p: '$36', f: ['Unlimited projects', 'Live dashboards', 'Priority support', 'SSO & roles'] },
  { n: 'Scale', p: '$84', f: ['Everything in Team', 'Audit log', 'Dedicated CSM', 'Custom SLA'] },
];
const BCards: React.FC = () => (
  <>
    <Topbar />
    <Txt x={0} y={30} s={11} w={700}><span style={{ position: 'absolute', left: CW / 2, transform: 'translateX(-50%)' }}>Simple, usage-based pricing</span></Txt>
    <Txt x={0} y={46} s={5.2} c={INK2}><span style={{ position: 'absolute', left: CW / 2, transform: 'translateX(-50%)' }}>Start free for 14 days · cancel anytime</span></Txt>
    {TIERS.map((tier, i) => {
      const hot = i === 1;
      return (
        <Box key={i} x={16 + i * 104} y={62} w={92} h={176} bg={hot ? '#fbfbff' : '#fff'}>
          {hot && <div style={{ position: 'absolute', inset: 0, borderRadius: 6, boxShadow: `inset 0 0 0 0.8px rgba(${A_RGB},0.55)` }} />}
          <Txt x={10} y={12} s={6} w={650} c={hot ? ACCENT_DEEP : INK2}>{tier.n}</Txt>
          {hot && (
            <div style={{ position: 'absolute', right: 8, top: 10, width: 26, height: 9, borderRadius: 4.5, background: `rgba(${A_RGB},0.12)` }}>
              <Txt x={0} y={2.4} s={4.2} w={650} c={ACCENT_DEEP}><span style={{ position: 'absolute', left: 13, transform: 'translateX(-50%)' }}>Popular</span></Txt>
            </div>
          )}
          <Txt x={10} y={26} s={17} w={700}>{tier.p}</Txt>
          <Txt x={44} y={36} s={5} c={INK3}>/ month</Txt>
          <div style={{ position: 'absolute', left: 10, right: 10, top: 52, height: HAIR, background: LINE }} />
          {tier.f.map((f, k) => (
            <React.Fragment key={k}>
              <svg viewBox="0 0 10 10" style={{ position: 'absolute', left: 10, top: 61 + k * 14, width: 5.5, height: 5.5 }}>
                <path d="M2 5.2 L4.2 7.4 L8.2 2.8" fill="none" stroke={hot ? ACCENT : '#8f939c'} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <Txt x={19} y={61.5 + k * 14} s={5} c={INK2}>{f}</Txt>
            </React.Fragment>
          ))}
          <Skel x={10} y={122} w={60} h={3} col="#eceef1" />
          <Skel x={10} y={129} w={44} h={3} col="#eceef1" />
          <div
            style={{
              position: 'absolute', left: 10, top: 146, width: 72, height: 17, borderRadius: 5,
              background: hot ? `linear-gradient(180deg, ${ACCENT_LIGHT} -40%, ${ACCENT} 100%)` : '#fff',
              boxShadow: hot ? `inset 0 0.6px 0 rgba(255,255,255,0.4), 0 2px 5px rgba(${AD_RGB},0.25)` : `inset 0 0 0 ${HAIR}px rgba(20,22,28,0.16)`,
            }}
          >
            <Txt x={0} y={5.6} s={5.4} w={650} c={hot ? '#fff' : INK}><span style={{ position: 'absolute', left: 36, transform: 'translateX(-50%)' }}>Choose {tier.n}</span></Txt>
          </div>
        </Box>
      );
    })}
  </>
);

// 2) 仪表盘（四枚指标卡 + 折线图）
const KPIS = [
  { k: 'Revenue', v: '$48.2k', d: '+12.4%' },
  { k: 'Active users', v: '3,904', d: '+5.1%' },
  { k: 'Conversion', v: '4.8%', d: '+0.6%' },
  { k: 'Churn', v: '1.7%', d: '−0.3%' },
];
const BDash: React.FC = () => (
  <>
    <Topbar />
    <Sidebar active={2} />
    <Txt x={84} y={27} s={9} w={700}>Analytics</Txt>
    <Txt x={14} y={29} s={4.6} c={INK3} right>Last 30 days</Txt>
    {KPIS.map((m, i) => (
      <Box key={i} x={84 + i * 59} y={43} w={54} h={36}>
        <Txt x={6} y={6} s={4.4} c={INK3}>{m.k}</Txt>
        <Txt x={6} y={15} s={9.5} w={700}>{m.v}</Txt>
        <Txt x={6} y={28} s={4.2} w={600} c="#1f9d61">{m.d}</Txt>
      </Box>
    ))}
    <Box x={84} y={87} w={232} h={150}>
      <Txt x={8} y={8} s={5.6} w={650}>Weekly revenue</Txt>
      <Txt x={8} y={8} s={4.6} c={INK3} right>USD</Txt>
      <svg viewBox="0 0 232 150" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="fglp-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`rgb(${A_RGB})`} stopOpacity={0.22} />
            <stop offset="1" stopColor={`rgb(${A_RGB})`} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[40, 70, 100, 130].map((y) => (
          <line key={y} x1={8} x2={224} y1={y} y2={y} stroke="rgba(20,22,28,0.06)" strokeWidth={0.5} />
        ))}
        <path d="M8 116 C 40 112, 56 62, 84 64 S 128 120, 152 112 S 196 44, 224 50 L224 130 L8 130 Z" fill="url(#fglp-area)" />
        <path d="M8 116 C 40 112, 56 62, 84 64 S 128 120, 152 112 S 196 44, 224 50" fill="none" stroke={ACCENT} strokeWidth={1.6} strokeLinecap="round" />
        <circle cx={224} cy={50} r={2.6} fill="#fff" stroke={ACCENT} strokeWidth={1.3} />
      </svg>
      {['W1', 'W2', 'W3', 'W4', 'W5'].map((w, i) => (
        <Txt key={w} x={12 + i * 50} y={138} s={4.2} c={INK3}>{w}</Txt>
      ))}
    </Box>
  </>
);

// 3) 服务状态表格（小统计 + 多行 + 状态 chip；状态色是保留的功能色）
const SERVICES = ['api-gateway', 'auth-service', 'billing-worker', 'search-index', 'media-cdn', 'notifications', 'analytics-etl'];
const BTable: React.FC = () => (
  <>
    <Topbar />
    <Sidebar active={3} />
    <Txt x={84} y={27} s={9} w={700}>System status</Txt>
    {[['Uptime', '99.98%'], ['Latency', '182 ms'], ['Incidents', '2'], ['Deploys', '14']].map(([k, v], i) => (
      <Box key={i} x={84 + i * 59} y={43} w={54} h={24}>
        <Txt x={6} y={5} s={4.2} c={INK3}>{k}</Txt>
        <Txt x={6} y={12.5} s={7.2} w={700}>{v}</Txt>
      </Box>
    ))}
    <Txt x={84} y={77} s={4.2} w={600} c={INK3} ls={0.08}>SERVICE</Txt>
    <Txt x={256} y={77} s={4.2} w={600} c={INK3} ls={0.08}>STATE</Txt>
    {SERVICES.map((s, i) => {
      const bad = i % 3 === 1;
      return (
        <div key={i} style={{ position: 'absolute', left: 84, top: 86 + i * 21, width: 232, height: 21, boxShadow: `0 -${HAIR}px 0 ${LINE}` }}>
          <div style={{ position: 'absolute', left: 0, top: 7.5, width: 6, height: 6, borderRadius: 1.6, background: FILL, boxShadow: `inset 0 0 0 ${HAIR}px ${LINE}` }} />
          <Txt x={10} y={8} s={5.2} w={550}>{s}</Txt>
          <Skel x={98} y={9.5} w={40 + rand(i + 21) * 34} h={2.6} col="#e9ebef" />
          <div style={{ position: 'absolute', left: 172, top: 5.5, width: 44, height: 10, borderRadius: 5, background: bad ? '#fbe9e7' : '#e4f5ea' }}>
            <div style={{ position: 'absolute', left: 5, top: 3.5, width: 3, height: 3, borderRadius: '50%', background: bad ? '#d9534f' : '#28a862' }} />
            <Txt x={11} y={2.8} s={4.4} w={600} c={bad ? '#b23b37' : '#1d7e48'}>{bad ? 'Degraded' : 'Healthy'}</Txt>
          </div>
        </div>
      );
    })}
  </>
);

// 4) 表单 + 开关列表（左侧字段框与主按钮，右侧成员行 + 开关；开关蓝是保留的功能色）
const MEMBERS = [['AK', 'Ava Kim', 'Admin'], ['MR', 'Mateo Ruiz', 'Editor'], ['SN', 'Sara Nilsen', 'Viewer'], ['JO', 'Jun Ota', 'Editor']];
const BForm: React.FC = () => (
  <>
    <Topbar />
    <Sidebar active={6} />
    <Txt x={84} y={27} s={9} w={700}>Workspace settings</Txt>
    <Txt x={84} y={41} s={4.6} c={INK3}>Profile and access for Northwind</Txt>
    {[['Workspace name', 'Northwind Labs'], ['Billing email', 'ops@northwind.io'], ['Region', 'EU · Frankfurt']].map(([k, v], i) => (
      <React.Fragment key={i}>
        <Txt x={84} y={55 + i * 27} s={4.6} w={600} c={INK2}>{k}</Txt>
        <div style={{ position: 'absolute', left: 84, top: 62 + i * 27, width: 120, height: 14, borderRadius: 4, background: '#fff', boxShadow: `inset 0 0 0 ${HAIR}px rgba(20,22,28,0.16)` }}>
          <Txt x={5} y={4.6} s={5} c={INK}>{v}</Txt>
        </div>
      </React.Fragment>
    ))}
    <div style={{ position: 'absolute', left: 84, top: 143, width: 120, height: 16, borderRadius: 5, background: 'linear-gradient(180deg, #2b2d33, #1b1c20)', boxShadow: 'inset 0 0.6px 0 rgba(255,255,255,0.14), 0 2px 5px rgba(16,18,24,0.2)' }}>
      <Txt x={0} y={5.4} s={5.4} w={650} c="#fff"><span style={{ position: 'absolute', left: 60, transform: 'translateX(-50%)' }}>Save changes</span></Txt>
    </div>
    <Txt x={84} y={172} s={5} w={650}>Danger zone</Txt>
    {[0, 1, 2].map((i) => (
      <Skel key={i} x={84} y={182 + i * 8} w={[118, 96, 108][i]} h={2.6} col="#e9ebef" />
    ))}
    <Txt x={218} y={55} s={4.6} w={600} c={INK2}>Members</Txt>
    <Txt x={218} y={160} s={4.6} w={600} c={INK2}>Notifications</Txt>
    {MEMBERS.map(([ini, n, role], i) => {
      const on = i % 2 === 0;
      return (
        <div key={i} style={{ position: 'absolute', left: 218, top: 64 + i * 22 + (i > 1 ? 0 : 0), width: 100, height: 20 }}>
          <div style={{ position: 'absolute', left: 0, top: 3, width: 13, height: 13, borderRadius: '50%', background: ['#e4e2dc', '#dfe1e8', '#e8e4ea', '#dde6e2'][i] }}>
            <Txt x={2.6} y={4.6} s={4.2} w={650} c="#55575e">{ini}</Txt>
          </div>
          <Txt x={18} y={3.5} s={5} w={600}>{n}</Txt>
          <Txt x={18} y={11} s={4.2} c={INK3}>{role}</Txt>
          <div style={{ position: 'absolute', right: 0, top: 5, width: 18, height: 10, borderRadius: 6, background: on ? '#2f7de1' : '#d9dbe0', boxShadow: 'inset 0 0.5px 1px rgba(0,0,0,0.12)' }}>
            <div style={{ position: 'absolute', top: 1.5, ...(on ? { right: 1.5 } : { left: 1.5 }), width: 7, height: 7, borderRadius: '50%', background: '#fff', boxShadow: '0 0.6px 1.2px rgba(0,0,0,0.25)' }} />
          </div>
        </div>
      );
    })}
    {['Weekly digest', 'Incident alerts'].map((n, i) => (
      <React.Fragment key={n}>
        <Txt x={218} y={172 + i * 14} s={5} c={INK}>{n}</Txt>
        <div style={{ position: 'absolute', left: 300, top: 171 + i * 14, width: 18, height: 10, borderRadius: 6, background: i ? '#d9dbe0' : '#2f7de1' }}>
          <div style={{ position: 'absolute', top: 1.5, ...(i ? { left: 1.5 } : { right: 1.5 }), width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
        </div>
      </React.Fragment>
    ))}
  </>
);

// 四组：胶囊 + mockup 横向排队（i 越大越靠左，滑入中央越晚），轨道循环
const GROUPS: { txt: string; Body: React.FC }[] = [
  { txt: 'Pricing', Body: BCards },
  { txt: 'Analytics', Body: BDash },
  { txt: 'Status', Body: BTable },
  { txt: 'Settings', Body: BForm },
];

// 雾块静态参数（位置 / 颜色）
const FOGS = [
  { left: '68%', top: '8%', rgb: AD_RGB },
  { left: '4%', top: '60%', rgb: A_RGB },
  { left: '40%', top: '82%', rgb: AL_RGB },
];

// 轨道三拍：起点 t≈0.20 / 0.483 / 0.688，inOutCubic 缓起→中段冲→缓收；
// 第一拍明显更慢且带长尾（到 t≈0.48 才完全收住），后两拍干脆些。
const BEATS = [
  { b: 0.200, d: 0.185, tail: 0.28 }, // 第 1 位 → 第 2 位
  { b: 0.483, d: 0.150, tail: 0 },    // 第 2 位 → 第 3 位
  { b: 0.688, d: 0.150, tail: 0 },    // 第 3 位 → 第 4 位
];

// 轨道位置（设计 px）作为帧的纯函数——速度模糊与胶囊跟随都要在相邻帧求值
const trackAt = (frame: number) => {
  const t = Math.min(1, Math.max(0, frame / LAST));
  // 开场有上一拍的收尾余量：t=0 时轨道偏左 11px，t≈0.19 归位
  let x = -11 * (1 - seg(t, 0, 0.19, E.outQuart));
  for (const B of BEATS) {
    const p = B.tail
      ? 0.85 * seg(t, B.b, B.b + B.d, E.inOutCubic) + 0.15 * seg(t, B.b, B.b + B.tail, E.outCubic)
      : seg(t, B.b, B.b + B.d, E.inOutCubic);
    x += p * SP;
  }
  return x;
};

const N = GROUPS.length, RING = N * SP;
const ringPos = (x: number) => ((x % RING) + RING * 1.5) % RING - RING / 2;

// macOS 指针（tip 在 (0,0)，SVG 内 1 单位 = 设计 px）
const Cursor: React.FC = () => (
  <svg width={13} height={19} viewBox="0 0 13 19" style={{ position: 'absolute', left: -1, top: -1, overflow: 'visible', filter: 'drop-shadow(0 1.2px 1.4px rgba(10,12,20,0.35))' }}>
    <path d="M1 1 L1 15.2 L4.4 12 L6.9 17.6 L9.3 16.6 L6.9 11.1 L11.6 11.1 Z" fill="#111216" stroke="#fff" strokeWidth={1.1} strokeLinejoin="round" />
  </svg>
);

export const FloatingGlossyLabelPills: React.FC = () => {
  const frame = useCurrentFrame();
  const t = Math.min(1, frame / LAST);
  const trackX = trackAt(frame);
  // 胶囊跟随：比面板晚 ~2f（混入 3f 前的轨道位置），换位收尾时最后落定
  const pillTrack = mix(trackX, trackAt(frame - 3), 0.28);
  // 整条轨道的横向速度（设计 px/帧）→ 运动模糊；静止时为 0
  const vx = velocity(trackAt, frame);
  // 光标：t≈0.717 于右上（x≈403,y≈36）一帧硬现，减速斜滑向左下，
  // t≈0.90 抵达末位胶囊右端（x≈283,y≈44，压在胶囊右缘内侧）后几乎静止
  const cp = seg(t, 0.717, 0.90, E.outQuart);
  // 光标到位前后 6f 末位胶囊 hover 提亮
  const hover = ramp(frame, Math.round(0.86 * LAST), 8, E.outCubic);
  return (
    <DesignStage bg="#f7f7f8" raster="zoom">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          background: `radial-gradient(55% 75% at 106% 42%, rgba(${A_RGB},.20), transparent 70%),
      radial-gradient(42% 50% at -6% 88%, rgba(${AD_RGB},.16), transparent 70%),
      radial-gradient(48% 40% at 12% -10%, rgba(${AL_RGB},.22), transparent 70%),
      radial-gradient(60% 50% at 50% 30%, #ffffff, rgba(255,255,255,0) 80%),
      linear-gradient(180deg, #f8f8fa 0%, #efeff3 100%)`,
        }}
      >
        {/* 漂移雾块 */}
        {FOGS.map(({ left, top, rgb }, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left,
              top,
              width: 240,
              height: 160,
              borderRadius: '50%',
              filter: 'blur(50px)',
              background: `rgba(${rgb},.10)`,
              transform: `translate(${Math.sin(t * Math.PI * 2 * 0.5 + i * 2.1) * 18}px,${Math.cos(t * Math.PI * 2 * 0.4 + i) * 12}px)`,
            }}
          />
        ))}
        {/* 面板脚下的一抹地面暗影：把整条走廊"放"在桌面上 */}
        <div style={{ position: 'absolute', left: 40, right: 40, top: 236, height: 60, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(${AD_RGB},0.10), rgba(${AD_RGB},0))` }} />

        <SpeedBlur vx={vx} amount={0.12} max={2.6}>
          {GROUPS.map(({ txt, Body }, i) => {
            // 环形轨道：面板绕 4 位循环，保证任一拍都有左右邻居各露一截在画面边缘
            const wx = ringPos(trackX - i * SP);
            const d = Math.min(1, Math.abs(wx) / SP); // 0=正居中，1=已到邻位
            const close = 1 - d;
            const sc = lerp(close, 0.62, 1); // 邻位实测缩到 0.62
            // 胶囊用跟随轨道单独求离心量（晚落定 ~2f）
            const pwx = ringPos(pillTrack - i * SP);
            const pd = Math.min(1, Math.abs(pwx) / SP);
            const psc = lerp(1 - pd, 0.62, 1);
            const isLast = i === N - 1;
            const hv = isLast ? hover : 0;
            // 离心越远越"低"：居中面板悬浮 18px，邻位贴近桌面 6px
            const elev = mix(18, 6, d);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  width: W,
                  height: 270,
                  marginLeft: -W / 2,
                  // 邻位（d=1）必须仍清楚可见 —— 原片左右两侧始终露出相邻面板边缘
                  opacity: lerp(Math.min(1, close * 2.4), 0.78, 1),
                  filter: d > 0.01 ? `blur(${(d * 1.3).toFixed(2)}px)` : undefined,
                  zIndex: close > 0.5 ? 2 : 1,
                }}
              >
                {/* 面板：等比缩小 + 顶边随 d 线性下沉（斜率 ≈80px） */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: PANEL_TOP,
                    width: W,
                    height: H,
                    borderRadius: 8,
                    transformOrigin: '50% 0',
                    background: '#fff',
                    boxShadow: `0 0 0 0.3px rgba(20,22,28,0.14), ${softShadow(elev, { color: '#1c2040', strength: 1.1 })}`,
                    transform: `translateX(${wx.toFixed(3)}px) translateY(${(d * 80).toFixed(3)}px) scale(${sc.toFixed(4)})`,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: CW,
                      height: CH,
                      borderRadius: 8 / CS,
                      background: '#fff',
                      overflow: 'hidden',
                      transform: `scale(${CS})`,
                      transformOrigin: '0 0',
                      fontFamily: F,
                    }}
                  >
                    <Body />
                    {/* 顶部 1px 受光沿 */}
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 8 / CS, boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.9)', pointerEvents: 'none' }} />
                  </div>
                </div>
                {/* 胶囊：实测中心 y 从 45（居中）沉到 102（邻位），比面板沉得更多，
                    离心时贴近面板顶边 —— 单独一条更陡的下沉曲线 */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 33 - PILL_H / 2,
                    width: PILL_W,
                    height: PILL_H,
                    marginLeft: -PILL_W / 2,
                    transformOrigin: '50% 50%',
                    borderRadius: 999,
                    overflow: 'hidden',
                    background: `linear-gradient(180deg,${ACCENT_LIGHT} 0%,${ACCENT} 52%,${ACCENT_DEEP} 100%)`,
                    boxShadow: `inset 0 0.5px 0 rgba(255,255,255,.7), inset 0 -2px 4px rgba(${AD_RGB},.55), 0 0 0 0.3px rgba(${AD_RGB},.6),
            0 ${mix(1.5, 2.2, hv)}px 3px rgba(${AD_RGB},.28), 0 ${mix(9, 12, hv)}px ${mix(20, 26, hv)}px -4px rgba(${AD_RGB},${mix(0.38, 0.48, hv)})`,
                    transform: `translateX(${(pwx).toFixed(3)}px) translateY(${(pd * 92 - hv * 1.2).toFixed(3)}px) scale(${psc.toFixed(4)})`,
                    filter: hv > 0 ? `brightness(${(1 + hv * 0.08).toFixed(3)})` : undefined,
                  }}
                >
                  {/* 玻璃高光：上半部椭圆反光，裁在胶囊圆角内 */}
                  <div
                    style={{
                      position: 'absolute', left: 6, right: 6, top: 1.2, height: '46%', borderRadius: 999,
                      background: 'linear-gradient(180deg,rgba(255,255,255,.42),rgba(255,255,255,.02))',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      font: `650 12.5px ${F}`, letterSpacing: '-0.01em', color: '#fff', textShadow: `0 0.6px 0.8px rgba(${AD_RGB},.6)`,
                    }}
                  >
                    {txt}
                  </div>
                </div>
              </div>
            );
          })}
        </SpeedBlur>

        {/* 黑色描白边光标（结尾划向末位胶囊，macOS 指针样式） */}
        <div
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            opacity: seg(t, 0.717, 0.725),
            zIndex: 5,
            left: lerp(cp, 403, 283),
            top: lerp(cp, 36, 41),
          }}
        >
          <Cursor />
        </div>
        <Vignette strength={0.12} inner={0.5} color="#2a2c40" />
        <Grain opacity={0.04} scale={0.25} />
      </div>
    </DesignStage>
  );
};
