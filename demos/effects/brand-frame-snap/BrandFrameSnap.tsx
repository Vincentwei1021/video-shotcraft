// brand-frame-snap —— figma-devmode 0:28–0:32 (brand-frame-snap) + 0:43–0:47 (frame-color-flip)
// 一圈粗品牌色画框先于内容长出包住全屏 → 产品窗口落进框内 → 光标点下模式开关 →
// 画框整圈钴蓝→橘红同帧硬翻色，窗口布局同帧 Design→Dev 换版，框带角标同帧换字。
//
// 第二轮重设计（瓷白工作室 · 双模式设计工具「Tessel」）：
// - look = porcelain（冷白舞台）。画框是唯一的强色：Design = 钴蓝 #2F55FF、Dev = 橘红 #FF5B1F——
//   色相对冲 + 明度差，翻了一眼就知道"换挡"；窗内 UI 全是中性墨色，强调色只跟着模式走（蓝段不出现橘，橘段不出现蓝）。
// - 主体是为镜头设计的设计工具窗口（1560×864，原生像素布局不缩放）：左图层栏 / 中画布（一张大字号定价卡，
//   选中的是 "Start free trial" 按钮）/ 右检查器。翻色同帧：右栏由浅色属性面板换成深色代码面板（CSS），
//   左栏由图层树换成资产与 token，画布上的蓝色选框换成橘色标注线。版式整体换脸，"模式切换"砸实。
// - 动机：光标从画布滑向标题栏的 Design | Dev 开关、按下（预备缩 0.9）→ 松开那一帧翻色。
// - 框带 60px，模式角标 32px 粗体全大写（要读的字 ≥32px），右上角是产品字标。
//
// 时间表（30fps，共 140f）：
//   0–18    预备：画框从 0 长到 60px（snappy，2 帧内就有框）；角标 6f 起从框带下沿升入
//   10–40   主动作：窗口从框下沿 660px 弹簧落进框内（damping 15）+ 18° 前倾回正，按速度纵向模糊，阴影随高度收紧
//   36–52   跟随：按钮选框描边（8 个手柄错峰弹出）+ 尺寸胶囊 440 × 76
//   56–80   光标从画布滑向 Dev 开关（不对称 in-out）；80–84 按下
//   84      翻色帧：画框色 / 窗口版式 / 角标文字 / 开关态 同帧硬切 + 3 帧径向白闪 + 框厚阻尼弹跳
//   86–104  余波：标注线逐条画出（3f 错峰）、数值胶囊过冲弹出
//   104–140 hold：内容区极缓推近 2%，干净落定
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt } from '../../_fixtures/Look';

export const BRAND_FRAME_SNAP_DURATION = 140;

const L = LOOKS.porcelain;
const BLUE = '#2F55FF'; // Design 模式品牌色
const ORANGE = '#FF5B1F'; // Dev 模式品牌色
const FLIP = 84; // 同帧硬翻色
const BAND = 60; // 画框厚度
const WIN_W = 1560;
const WIN_H = 864;
const BAR_H = 64; // 窗口标题栏
const LEFT_W = 300;
const RIGHT_W = 400;
const INK = '#14161f';
const MONO = FONT.mono;

// 窗口内坐标（相对窗口左上）：画布区与定价卡、按钮
const CANVAS_X = LEFT_W;
const CANVAS_W = WIN_W - LEFT_W - RIGHT_W; // 860
const BODY_H = WIN_H - BAR_H; // 800
const CARD_W = 468;
const CARD_H = 600;
const CARD_X = CANVAS_X + (CANVAS_W - CARD_W) / 2;
const CARD_Y = BAR_H + (BODY_H - CARD_H) / 2 + 12;
const BTN_W = 404;
const BTN_H = 76;
const BTN_X = CARD_X + 32;
const BTN_Y = CARD_Y + CARD_H - 32 - BTN_H;
// 标题栏模式开关里 "Dev" 段的中心（光标目标）
const TOG_W = 230;
const TOG_X = WIN_W - 24 - TOG_W;
const DEV_CX = TOG_X + TOG_W * 0.75;
const DEV_CY = BAR_H / 2;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// ───────── 小图标 ─────────
const ModeIcon: React.FC<{ dev: boolean; size: number; color: string }> = ({ dev, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {dev ? (
      <>
        <path d="M5.2 4 1.6 8l3.6 4" />
        <path d="M10.8 4 14.4 8l-3.6 4" />
        <path d="M9.2 2.6 6.8 13.4" />
      </>
    ) : (
      <>
        <path d="M8 1.6 12.8 7 8 14.4 3.2 7z" />
        <path d="M8 14.4V8.6" />
        <circle cx="8" cy="7.6" r="1.1" />
      </>
    )}
  </svg>
);

const Check: React.FC = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="#eef0f5" />
    <path d="M7.4 12.4l3 3 6.2-6.6" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 光标（白描边黑芯，中性色，不参与颜色编码）
const Cursor: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <svg width={44} height={44} viewBox="0 0 24 24" style={{
    position: 'absolute', left: x - 7, top: y - 4, transform: `scale(${1 - 0.12 * press})`, transformOrigin: '7px 4px',
    filter: 'drop-shadow(0 4px 8px rgba(12,20,40,0.28))',
  }}>
    <path d="M5 3.2 19 12l-6.4 1.3L9.4 19.6z" fill={INK} stroke="#ffffff" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

// ───────── 窗口：标题栏 ─────────
const TitleBar: React.FC<{ dev: boolean; color: string }> = ({ dev, color }) => (
  <div style={{
    position: 'absolute', left: 0, top: 0, width: WIN_W, height: BAR_H, boxSizing: 'border-box',
    background: 'linear-gradient(180deg,#fbfcfe 0%,#f3f5f9 100%)', borderBottom: '1px solid rgba(15,30,60,0.08)',
    display: 'flex', alignItems: 'center', padding: '0 24px', gap: 10, fontFamily: FONT.sans,
  }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: '#d9dde5', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.12)' }} />
    ))}
    <div style={{ marginLeft: 22, display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, color: L.ink2, letterSpacing: '-0.01em' }}>
      <span style={{ color: L.ink3 }}>Checkout</span>
      <span style={{ color: L.ink3 }}>/</span>
      <span style={{ color: L.ink, fontWeight: 600 }}>Pricing card</span>
    </div>
    {/* 模式开关：active 段 = 当前模式色（翻色帧同步换） */}
    <div style={{
      position: 'absolute', left: TOG_X, top: (BAR_H - 44) / 2, width: TOG_W, height: 44, borderRadius: 12,
      background: '#e9ecf2', boxShadow: 'inset 0 1px 2px rgba(15,30,60,0.08)', display: 'flex', padding: 4, boxSizing: 'border-box',
    }}>
      {(['Design', 'Dev'] as const).map((m, i) => {
        const on = (i === 1) === dev;
        return (
          <div key={m} style={{
            flex: 1, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: on ? color : 'transparent', color: on ? '#fff' : L.ink2, fontSize: 21, fontWeight: 650,
            boxShadow: on ? `inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 6px ${alpha(color, 0.35)}` : 'none',
          }}>
            <ModeIcon dev={i === 1} size={17} color={on ? '#fff' : L.ink3} />
            {m}
          </div>
        );
      })}
    </div>
  </div>
);

// ───────── 左栏 ─────────
const PanelHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: L.ink3, margin: '0 0 14px' }}>{children}</div>
);

const LeftPanel: React.FC<{ dev: boolean; color: string }> = ({ dev, color }) => (
  <div style={{
    position: 'absolute', left: 0, top: BAR_H, width: LEFT_W, height: BODY_H, boxSizing: 'border-box', padding: '28px 22px',
    background: '#fafbfd', borderRight: '1px solid rgba(15,30,60,0.07)', fontFamily: FONT.sans,
  }}>
    {!dev ? (
      <>
        <PanelHead>Layers</PanelHead>
        {[
          ['Pricing card', 0, false], ['Header', 1, false], ['Price', 1, false], ['Features', 1, false],
          ['Start free trial', 1, true], ['Footnote', 1, false],
        ].map(([n, d, sel]) => (
          <div key={n as string} style={{
            height: 46, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 12 + (d as number) * 22, borderRadius: 10,
            background: sel ? alpha(color, 0.1) : 'transparent', color: sel ? color : L.ink2, fontSize: 20, fontWeight: sel ? 650 : 500,
          }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.6px solid ${sel ? color : L.ink3}` }} />
            {n as string}
          </div>
        ))}
      </>
    ) : (
      <>
        <PanelHead>Tokens</PanelHead>
        {[
          ['color/ink-900', INK], ['color/paper', '#ffffff'], ['radius/lg', null], ['space/8', null], ['type/label-lg', null],
        ].map(([n, sw]) => (
          <div key={n as string} style={{ height: 46, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 12, fontFamily: MONO, fontSize: 18, color: L.ink2 }}>
            <div style={{
              width: 18, height: 18, borderRadius: sw ? 5 : 3, background: (sw as string) ?? 'transparent',
              border: sw ? '1px solid rgba(15,30,60,0.18)' : `1.6px dashed ${L.ink3}`,
            }} />
            {n as string}
          </div>
        ))}
        <div style={{ height: 22 }} />
        <PanelHead>Assets</PanelHead>
        {['cta-arrow.svg', 'check.svg'].map((n) => (
          <div key={n} style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontFamily: MONO, fontSize: 18, color: L.ink2 }}>
            {n}
            <span style={{ fontFamily: FONT.sans, fontSize: 16, fontWeight: 650, color }}>Export</span>
          </div>
        ))}
      </>
    )}
  </div>
);

// ───────── 右栏：Design = 浅色检查器；Dev = 深色代码面板 ─────────
const Field: React.FC<{ k: string; v: string; w?: number }> = ({ k, v, w = 150 }) => (
  <div style={{ width: w, height: 48, borderRadius: 10, background: '#f1f3f7', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', boxSizing: 'border-box', fontSize: 20 }}>
    <span style={{ color: L.ink3, fontWeight: 600 }}>{k}</span>
    <span style={{ color: L.ink, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
  </div>
);

const CODE: Array<Array<[string, 'c' | 'p' | 'v' | 's' | 'k']>> = [
  [['/* Button · Primary */', 'c']],
  [['.cta', 'k'], [' {', 'p']],
  [['  height', 's'], [': ', 'p'], ['76px', 'v'], [';', 'p']],
  [['  padding', 's'], [': ', 'p'], ['0 32px', 'v'], [';', 'p']],
  [['  border-radius', 's'], [': ', 'p'], ['20px', 'v'], [';', 'p']],
  [['  background', 's'], [': ', 'p'], ['#14161F', 'v'], [';', 'p']],
  [['  font-weight', 's'], [': ', 'p'], ['650', 'v'], [';', 'p']],
  [['  gap', 's'], [': ', 'p'], ['12px', 'v'], [';', 'p']],
  [['}', 'p']],
];

const RightPanel: React.FC<{ dev: boolean; color: string }> = ({ dev, color }) =>
  !dev ? (
    <div style={{
      position: 'absolute', right: 0, top: BAR_H, width: RIGHT_W, height: BODY_H, boxSizing: 'border-box', padding: '28px 26px',
      background: '#ffffff', borderLeft: '1px solid rgba(15,30,60,0.07)', fontFamily: FONT.sans,
    }}>
      <PanelHead>Frame</PanelHead>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}><Field k="W" v="404" w={168} /><Field k="H" v="76" w={168} /></div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 34 }}><Field k="R" v="20" w={168} /><Field k="↔" v="12" w={168} /></div>
      <PanelHead>Fill</PanelHead>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 48, marginBottom: 34, fontSize: 20, color: L.ink, fontWeight: 600 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: INK }} />
        14161F
        <span style={{ marginLeft: 'auto', color: L.ink3 }}>100%</span>
      </div>
      <PanelHead>Auto layout</PanelHead>
      <div style={{ display: 'flex', gap: 12 }}>
        {['→', '↓', '⤢'].map((g, i) => (
          <div key={g} style={{
            width: 64, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            background: i === 0 ? alpha(color, 0.12) : '#f1f3f7', color: i === 0 ? color : L.ink3, fontWeight: 700,
          }}>{g}</div>
        ))}
      </div>
      <div style={{ height: 34 }} />
      <PanelHead>Effects</PanelHead>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 48, fontSize: 20, color: L.ink, fontWeight: 600 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fff', boxShadow: '0 3px 8px rgba(12,20,40,0.3), 0 0 0 1px rgba(15,30,60,0.08)' }} />
        Drop shadow
        <span style={{ marginLeft: 'auto', color: L.ink3 }}>22%</span>
      </div>
      <div style={{ height: 34 }} />
      <PanelHead>Prototype</PanelHead>
      <div style={{ height: 48, borderRadius: 10, background: '#f1f3f7', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', fontSize: 20, color: L.ink2, fontWeight: 550 }}>
        On tap <span style={{ color: L.ink3 }}>→</span> <span style={{ color: L.ink, fontWeight: 650 }}>Checkout</span>
      </div>
    </div>
  ) : (
    <div style={{
      position: 'absolute', right: 0, top: BAR_H, width: RIGHT_W, height: BODY_H, boxSizing: 'border-box',
      background: 'linear-gradient(180deg,#16181f 0%,#111318 100%)', fontFamily: MONO,
    }}>
      <div style={{ display: 'flex', gap: 26, height: 64, alignItems: 'center', padding: '0 26px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontFamily: FONT.sans, fontSize: 20, fontWeight: 650 }}>
        {['CSS', 'SwiftUI', 'Compose'].map((t, i) => (
          <span key={t} style={{ color: i === 0 ? '#fff' : 'rgba(255,255,255,0.38)', borderBottom: i === 0 ? `3px solid ${color}` : 'none', padding: '20px 0 17px' }}>{t}</span>
        ))}
      </div>
      <div style={{ padding: '26px 26px', fontSize: 21, lineHeight: '42px' }}>
        {CODE.map((ln, i) => (
          <div key={i} style={{ whiteSpace: 'pre', display: 'flex' }}>
            <span style={{ width: 34, color: 'rgba(255,255,255,0.2)' }}>{i + 1}</span>
            {ln.map(([s, k], j) => (
              <span key={j} style={{
                color: k === 'c' ? 'rgba(255,255,255,0.34)' : k === 'k' ? '#ffffff' : k === 's' ? '#c9ced9' : k === 'v' ? color : 'rgba(255,255,255,0.5)',
                fontWeight: k === 'k' ? 700 : 400,
              }}>{s}</span>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        position: 'absolute', left: 26, right: 26, bottom: 26, height: 56, borderRadius: 12, background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: FONT.sans, fontSize: 21, fontWeight: 700, color: '#fff',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28)',
      }}>Copy code</div>
    </div>
  );

// ───────── 画布与定价卡 ─────────
const PricingCard: React.FC = () => (
  <div style={{
    position: 'absolute', left: CARD_X, top: CARD_Y, width: CARD_W, height: CARD_H, borderRadius: 28, background: '#ffffff',
    boxSizing: 'border-box', padding: 32, fontFamily: FONT.sans, color: INK,
    boxShadow: `0 0 0 1px rgba(15,30,60,0.06), ${softShadow(18, { color: '#0c1a3a', strength: 0.9 })}`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 22, fontWeight: 750, letterSpacing: '0.14em' }}>PRO</span>
      <span style={{ fontSize: 18, fontWeight: 650, color: L.ink2, background: '#f1f3f7', padding: '7px 14px', borderRadius: 99 }}>Most popular</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 30 }}>
      <span style={{ fontSize: 124, fontWeight: 800, letterSpacing: '-0.055em', lineHeight: 0.9 }}>$24</span>
      <span style={{ fontSize: 26, color: L.ink2, fontWeight: 500 }}>/ month</span>
    </div>
    <div style={{ fontSize: 22, color: L.ink2, marginTop: 14 }}>Everything a growing team needs.</div>
    <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {['Unlimited projects', 'Shared libraries', 'Priority support'].map((s) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 24, fontWeight: 550 }}><Check />{s}</div>
      ))}
    </div>
    <div style={{
      position: 'absolute', left: 32, bottom: 32, width: BTN_W, height: BTN_H, borderRadius: 20,
      background: 'linear-gradient(180deg,#22252f 0%,#14161f 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 14px rgba(12,20,40,0.22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#fff', fontSize: 28, fontWeight: 650, letterSpacing: '-0.01em',
    }}>
      Start free trial
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </div>
  </div>
);

// Design 模式：按钮选框 + 8 个手柄（错峰弹出）+ 尺寸胶囊
const Selection: React.FC<{ f: number; color: string }> = ({ f, color }) => {
  const draw = ramp(f, 36, 12, EASE.snappy);
  const pad = 6;
  const x = BTN_X - pad, y = BTN_Y - pad, w = BTN_W + pad * 2, h = BTN_H + pad * 2;
  const per = 2 * (w + h);
  const hs = [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]];
  const pill = springAt(f, 46, { damping: 15, stiffness: 200 });
  return (
    <>
      <svg width={WIN_W} height={WIN_H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <rect x={x} y={y} width={w} height={h} rx={24} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${per} ${per}`} strokeDashoffset={per * (1 - draw)} />
      </svg>
      {hs.map(([u, v], i) => {
        const p = springAt(f, 40 + i * 1.2, { damping: 14, stiffness: 260 });
        return (
          <div key={i} style={{
            position: 'absolute', left: x + u * w - 8, top: y + v * h - 8, width: 16, height: 16, borderRadius: 4, background: '#fff',
            border: `3px solid ${color}`, boxSizing: 'border-box', transform: `scale(${p})`,
          }} />
        );
      })}
      <div style={{
        position: 'absolute', left: x + w / 2, top: y + h + 16, transform: `translateX(-50%) scale(${pill})`, transformOrigin: '50% 0',
        background: color, color: '#fff', fontFamily: FONT.sans, fontSize: 21, fontWeight: 700, padding: '7px 14px', borderRadius: 9,
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', boxShadow: `0 4px 12px ${alpha(color, 0.35)}`,
      }}>404 × 76</div>
    </>
  );
};

// Dev 模式：橘色标注线（逐条画出）+ 数值胶囊（过冲弹出）
const Redlines: React.FC<{ f: number; color: string }> = ({ f, color }) => {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; label: string; lx: number; ly: number }> = [
    // 按钮宽度（按钮上方）
    { x1: BTN_X, y1: BTN_Y - 22, x2: BTN_X + BTN_W, y2: BTN_Y - 22, label: '404', lx: BTN_X + BTN_W / 2, ly: BTN_Y - 22 },
    // 按钮高度（卡片右侧外）
    { x1: CARD_X + CARD_W + 28, y1: BTN_Y, x2: CARD_X + CARD_W + 28, y2: BTN_Y + BTN_H, label: '76', lx: CARD_X + CARD_W + 28, ly: BTN_Y + BTN_H / 2 },
    // 卡片内边距（按钮左侧）
    { x1: CARD_X, y1: BTN_Y + BTN_H / 2, x2: BTN_X, y2: BTN_Y + BTN_H / 2, label: '32', lx: CARD_X - 34, ly: BTN_Y + BTN_H / 2 },
    // 按钮距卡底
    { x1: BTN_X + BTN_W * 0.78, y1: BTN_Y + BTN_H, x2: BTN_X + BTN_W * 0.78, y2: CARD_Y + CARD_H, label: '32', lx: BTN_X + BTN_W * 0.78 + 34, ly: BTN_Y + BTN_H + 16 },
  ];
  return (
    <>
      {/* 按钮外框：橘色虚线（Dev 模式的"被检查"态） */}
      <div style={{
        position: 'absolute', left: BTN_X - 1, top: BTN_Y - 1, width: BTN_W + 2, height: BTN_H + 2, borderRadius: 21,
        border: `2px dashed ${color}`, boxSizing: 'border-box',
      }} />
      <svg width={WIN_W} height={WIN_H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {lines.map((l, i) => {
          const p = ramp(f, FLIP + 2 + i * 3, 9, EASE.snappy);
          const cx = (l.x1 + l.x2) / 2, cy = (l.y1 + l.y2) / 2;
          const x1 = mix(cx, l.x1, p), y1 = mix(cy, l.y1, p), x2 = mix(cx, l.x2, p), y2 = mix(cy, l.y2, p);
          const vert = l.x1 === l.x2;
          return (
            <g key={i} stroke={color} strokeWidth={2.5} strokeLinecap="round" opacity={p > 0 ? 1 : 0}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
              {vert ? (
                <>
                  <line x1={x1 - 9} y1={y1} x2={x1 + 9} y2={y1} />
                  <line x1={x2 - 9} y1={y2} x2={x2 + 9} y2={y2} />
                </>
              ) : (
                <>
                  <line x1={x1} y1={y1 - 9} x2={x1} y2={y1 + 9} />
                  <line x1={x2} y1={y2 - 9} x2={x2} y2={y2 + 9} />
                </>
              )}
            </g>
          );
        })}
      </svg>
      {lines.map((l, i) => {
        const s = springAt(f, FLIP + 6 + i * 3, { damping: 13, stiffness: 240 });
        return (
          <div key={i} style={{
            position: 'absolute', left: l.lx, top: l.ly, transform: `translate(-50%,-50%) scale(${s})`,
            background: color, color: '#fff', fontFamily: FONT.sans, fontSize: 21, fontWeight: 750, padding: '5px 11px', borderRadius: 8,
            fontVariantNumeric: 'tabular-nums', boxShadow: `0 4px 10px ${alpha(color, 0.35)}`,
          }}>{l.label}</div>
        );
      })}
    </>
  );
};

export const BrandFrameSnap: React.FC = () => {
  const f = useCurrentFrame();
  const dev = f >= FLIP;
  const color = dev ? ORANGE : BLUE;

  // 1) 画框先立：0 → 60px（snappy，第 2 帧就有可见框）
  const grow = ramp(f, -1, 19, EASE.snappy);
  // 翻色帧：3 帧径向白闪 + 框厚阻尼弹跳（"挡位卡进去"的机械回馈）
  const since = f - FLIP;
  const flash = since >= 0 && since < 3 ? 0.6 - since * 0.2 : 0;
  const bounce = since >= 0 ? Math.exp(-since * 0.24) * Math.cos(since * 0.95) * 12 : 0;
  const band = BAND * grow + bounce;

  // 2) 窗口落进框内：弹簧 y 660 → 0、前倾 18° → 0、scale 0.88 → 1
  const dropAt = (fr: number) => springAt(fr, 10, { damping: 15, stiffness: 115 });
  const yAt = (fr: number) => mix(660, 0, dropAt(fr));
  const d = dropAt(f);
  const winY = yAt(f);
  const vy = f >= 10 ? yAt(f + 0.5) - yAt(f - 0.5) : 0;
  const tilt = mix(18, 0, d);
  const winS = mix(0.88, 1, d);
  const elev = mix(70, 22, clamp01(d));

  // 3) 光标：56–80 从画布右下滑向 Dev 开关；80–84 按下，84 松开（=翻色帧）
  const cT = ramp(f, 56, 24, EASE.swift);
  const cx = mix(CARD_X + CARD_W + 120, DEV_CX, cT);
  const cy = mix(CARD_Y + CARD_H - 40, DEV_CY + 6, cT) - Math.sin(cT * Math.PI) * 60; // 轻微弧线，不走直线
  const press = f >= 80 && f < FLIP ? ramp(f, 80, 3, EASE.out) : f >= FLIP ? 1 - ramp(f, FLIP, 6, EASE.out) : 0;
  const cursorOp = ramp(f, 54, 6, EASE.out) * (1 - ramp(f, FLIP + 16, 10, EASE.exit));

  // 4) 内容区极缓推近（从窗口落定后起，smooth 无速度突变）
  // 翻色帧换挡顿挫：内容整体 1 → 1.012 → 1（8f 阻尼），与框厚弹跳同帧
  const punch = since >= 0 ? Math.exp(-since * 0.35) * Math.sin(Math.min(Math.PI, since * 0.9) + 0.0001) * 0.012 : 0;
  const push = mix(1, 1.02, ramp(f, 40, 100, EASE.smooth)) + punch;

  const labelIn = ramp(f, 6, 14, EASE.snappy);
  const inner = Math.max(0, band);

  return (
    <div style={{ width: 1920, height: 1080, background: '#0c1020', position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      {/* 框内内容区：瓷白舞台（带当前模式色的极淡地光，同帧翻） */}
      <div style={{ position: 'absolute', inset: inner, overflow: 'hidden', borderRadius: 22 }}>
        <Stage look={L} keyLight={{ x: 0.5, y: 0.0 }} fill={null} vignette={0.07} intensity={1.15}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 70% 40% at 50% 104%, ${alpha(color, 0.16)} 0%, ${alpha(color, 0)} 70%)`,
          }} />
        </Stage>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '50% 52%' }}>
          <SpeedBlur vx={0} vy={vy} amount={0.28} max={14}>
            <div style={{ position: 'absolute', inset: 0, perspective: 2400, perspectiveOrigin: '50% 30%' }}>
              <div style={{
                position: 'absolute', left: '50%', top: '50%', width: WIN_W, height: WIN_H,
                marginLeft: -WIN_W / 2, marginTop: -WIN_H / 2 + 6,
                transform: `translateY(${winY.toFixed(2)}px) rotateX(${tilt.toFixed(2)}deg) scale(${winS.toFixed(4)})`,
                transformOrigin: '50% 100%', opacity: clamp01(d * 5),
                borderRadius: 18, overflow: 'hidden', background: '#eef1f6',
                boxShadow: `0 0 0 1px rgba(15,30,60,0.10), inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(elev, { color: '#0c1a3a', strength: 1.3 })}`,
              }}>
                {/* 画布：点阵 */}
                <div style={{
                  position: 'absolute', left: CANVAS_X, top: BAR_H, width: CANVAS_W, height: BODY_H,
                  backgroundImage: 'radial-gradient(circle, rgba(15,30,60,0.13) 1.2px, transparent 1.5px)', backgroundSize: '28px 28px',
                }} />
                <div style={{ position: 'absolute', left: CARD_X, top: CARD_Y - 38, fontSize: 19, fontWeight: 600, color: L.ink3 }}>Pricing card · 468 × 600</div>
                <PricingCard />
                {!dev ? <Selection f={f} color={color} /> : <Redlines f={f} color={color} />}
                <LeftPanel dev={dev} color={color} />
                <RightPanel dev={dev} color={color} />
                <TitleBar dev={dev} color={color} />
                {cursorOp > 0.01 && (
                  <div style={{ position: 'absolute', inset: 0, opacity: cursorOp }}>
                    <Cursor x={cx} y={cy} press={press} />
                  </div>
                )}
              </div>
            </div>
          </SpeedBlur>
        </div>
        {/* 画框内缘：内凹阴影 = 卡纸厚度 */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 22, pointerEvents: 'none',
          boxShadow: 'inset 0 0 0 1px rgba(10,16,40,0.10), inset 0 4px 14px rgba(10,16,40,0.18)',
        }} />
      </div>

      {/* 品牌色画框：4 条实体色带，翻色 = 同帧换 background */}
      {([
        { left: 0, top: 0, right: 0, height: inner },
        { left: 0, bottom: 0, right: 0, height: inner },
        { left: 0, top: 0, bottom: 0, width: inner },
        { right: 0, top: 0, bottom: 0, width: inner },
      ] as React.CSSProperties[]).map((pos, i) => (
        <div key={i} style={{ position: 'absolute', background: color, ...pos }} />
      ))}
      {/* 色带受光薄釉：顶亮底暗（与舞台主光同向）；内圆角处补色，让框是"一整块挖了洞的板" */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.10) 100%)',
        clipPath: `polygon(0 0,100% 0,100% 100%,0 100%,0 0,${inner}px ${inner}px,${inner}px calc(100% - ${inner}px),calc(100% - ${inner}px) calc(100% - ${inner}px),calc(100% - ${inner}px) ${inner}px,${inner}px ${inner}px)`,
      }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* 内圆角：四个角的色块（框带是直角板，洞口是圆角） */}
        <path fillRule="evenodd" fill={color}
          d={`M${inner} ${inner}H${1920 - inner}V${1080 - inner}H${inner}Z M${inner} ${inner + 22}A22 22 0 0 1 ${inner + 22} ${inner}H${1920 - inner - 22}A22 22 0 0 1 ${1920 - inner} ${inner + 22}V${1080 - inner - 22}A22 22 0 0 1 ${1920 - inner - 22} ${1080 - inner}H${inner + 22}A22 22 0 0 1 ${inner} ${1080 - inner - 22}Z`} />
      </svg>

      {/* 框带角标：左上模式名（32px 粗体全大写），右上产品字标；翻色帧同帧换字 */}
      <div style={{
        position: 'absolute', left: 66, top: 0, height: inner, display: 'flex', alignItems: 'center', gap: 14,
        fontWeight: 800, fontSize: 30, letterSpacing: '0.16em', color: '#fff', whiteSpace: 'nowrap',
        opacity: labelIn, transform: `translateY(${((1 - labelIn) * 16).toFixed(2)}px)`,
      }}>
        <ModeIcon dev={dev} size={28} color="#ffffff" />
        {dev ? 'DEV MODE' : 'DESIGN'}
      </div>
      <div style={{
        position: 'absolute', right: 66, top: 0, height: inner, display: 'flex', alignItems: 'center', gap: 12,
        fontWeight: 750, fontSize: 30, letterSpacing: '-0.02em', color: '#fff', whiteSpace: 'nowrap',
        opacity: labelIn * 0.92, transform: `translateY(${((1 - labelIn) * 16).toFixed(2)}px)`,
      }}>
        <svg width={28} height={28} viewBox="0 0 24 24"><path d="M3 3h8v8H3zM13 13h8v8h-8z" fill="#fff" /><path d="M13 3h8v8h-8zM3 13h8v8H3z" fill="rgba(255,255,255,0.45)" /></svg>
        tessel
      </div>

      {/* 翻色白闪：从画框向内的径向闪（框带处最亮、中心约 1/3） */}
      {flash > 0 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: flash,
          background: 'radial-gradient(ellipse 75% 75% at 50% 50%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,1) 100%)',
        }} />
      )}
    </div>
  );
};
