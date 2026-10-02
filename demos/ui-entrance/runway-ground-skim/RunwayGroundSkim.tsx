// runway-ground-skim v5 —— 源片 clickup-30.mp4 约 46–50s（clickup10 截图 5 张）：
// 用户 v5 意见（逐字）："去掉落地后弹起的效果，然后整个下落的过程快一点"
// 落实：①删除落地压弹——着地即停，零回弹零压缩（判例：掉落感=干脆利落）；
// ②下落整体提速——单卡下落 15→9 帧，全员落定 f45→f33，立起段随之前移；
// ③保留项不动：错峰 3 帧起点、界面位置顺序（行优先左→右）、重力加速
// （距离∝t²）、贴落完成后页面立起转正收尾。
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { Grain } from '../../_fixtures/Polish';

// 镜头本意全长 4s：f0–6 悬空、f6–~25 急雨贴落、f38–94 立起转正、f94–120 正视 hold
export const RUNWAY_GROUND_SKIM_DURATION = 120;

// 质感改版（v7）：
// - 地面改为绝对定位的出版级 Home 页（系统字体栈、2px 发丝线、彩色图标块、Goals 进度区），
//   卡片槽位与 Recent 标签/内容左缘对齐，第二行不再压住 Todo 标题（旧版槽位与流式布局错位）；
//   槽位画极淡虚线框，卡落下即"扣进"真实格位（Q9）；
// - 卡面加彩色图标块 + 头像 + 更新时间，落地后有贴地两层软影；
// - 空中追光 → 落地亮度不再硬切（按离地高度平滑过渡），下落末段按速度加纵向运动模糊；
// - 终态构图修正：旧版立起后页顶被切、页底留 100px 黑带——改为拉远到 z=-1800、锚点 68.5%，
//   整页居中、四周均匀留边。
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif';
const INK = '#1d1e23';
const INK2 = '#5d5f66';
const MID = '#8d8f96';
const LINE = 'rgba(20,22,28,0.09)';
const ACCENT = '#7b68ee'; // ClickUp 系紫

const easeRise = Easing.bezier(0.42, 0, 0.16, 1);

/* mulberry32 带种子（起跳节奏 ≤1.5 帧微差 < 3 帧错峰，顺序不乱） */
const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const CARD_W = 760;
const CARD_H = 184;
const ICON_TINT = ['#7b68ee', '#e5484d', '#f5a524', '#12a594', '#3e63dd', '#d6409f', '#30a46c'];
const INITIALS = ['MK', 'JL', 'AR', 'SN', 'TP', 'EV', 'DO'];
const MiniCardFace: React.FC<{ title: string; sub: string; i: number; lift: number }> = ({ title, sub, i, lift }) => (
  <div style={{
    width: CARD_W, height: CARD_H, border: `2px solid ${LINE}`, borderRadius: 24, padding: '0 36px',
    background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)', display: 'flex', alignItems: 'center', gap: 28,
    boxSizing: 'border-box', fontFamily: FONT,
    // 贴地两层影：落地后（lift≈0）是小而实的接触影 + 低矮环境影；空中由地面软影负责
    boxShadow: lift < 2
      ? 'inset 0 2px 0 rgba(255,255,255,0.9), 0 2px 4px rgba(16,18,24,0.06), 0 14px 30px -12px rgba(16,18,24,0.16)'
      : 'inset 0 2px 0 rgba(255,255,255,0.9)',
  }}>
    <div style={{
      width: 84, height: 84, borderRadius: 22, flexShrink: 0, background: ICON_TINT[i % ICON_TINT.length],
      boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -3px 0 rgba(0,0,0,0.12)', position: 'relative',
    }}>
      <div style={{ position: 'absolute', left: 24, top: 26, width: 36, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.92)' }} />
      <div style={{ position: 'absolute', left: 24, top: 40, width: 26, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.7)' }} />
      <div style={{ position: 'absolute', left: 24, top: 54, width: 32, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.7)' }} />
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: 44, color: INK, fontWeight: 650, whiteSpace: 'nowrap', letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      <div style={{ marginTop: 10, fontSize: 32, color: MID, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>{sub}</span>
      </div>
    </div>
    <div style={{
      width: 64, height: 64, borderRadius: 32, flexShrink: 0, background: 'linear-gradient(145deg, #e9e9ee, #d7d8de)',
      color: '#4a4c53', fontSize: 24, fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 0 4px #fff, 0 0 0 6px rgba(20,22,28,0.08)',
    }}>{INITIALS[i % INITIALS.length]}</div>
  </div>
);

/* 界面位置顺序 = 数组顺序：第一行左→右，再第二行左→右 */
const CARDS: { title: string; sub: string; col: number; row: number }[] = [
  { title: 'Creative Refresh', sub: 'New logo exploration', col: 0, row: 0 },
  { title: 'New Bugs Per Week', sub: 'Bug tracker Dashboard', col: 1, row: 0 },
  { title: 'Tiger Team Roadmap', sub: 'Roadmap Outline', col: 2, row: 0 },
  { title: 'Design System', sub: 'Design Handbook Inspo', col: 3, row: 0 },
  { title: 'Development Sprint Dashboard', sub: 'Dev Team Sprints', col: 0, row: 1 },
  { title: 'CSS Bug Tracker', sub: 'Query Reports', col: 1, row: 1 },
  { title: 'Platform', sub: 'System Health Monitor', col: 2, row: 1 },
];

/* Recent 网格槽位（面板内容坐标）：左缘对齐主区内容左缘 960，两行在 Recent 标签与 Todo 区之间 */
const GRID_X = 960, GRID_Y = 650, COL_GAP = 850, ROW_GAP = 236;
const slotPos = (col: number, row: number) => ({ x: GRID_X + col * COL_GAP, y: GRID_Y + row * ROW_GAP });

const Sq: React.FC<{ c?: string; s?: number }> = ({ c = '#9a9ca3', s = 36 }) => (
  <div style={{ width: s, height: s, border: `5px solid ${c}`, borderRadius: s * 0.28, boxSizing: 'border-box', flexShrink: 0 }} />
);

/* 平躺地面：Home 仪表盘（卡片槽位留空 + 虚线槽位框，由悬浮卡片落入）。主区元素绝对定位，槽位坐标可信 */
const Ground: React.FC<{ lower?: number }> = ({ lower = 1 }) => (
  <div style={{
    width: 4600, height: 2600, background: 'linear-gradient(180deg, #f8f8f7 0%, #f3f3f1 100%)', borderRadius: 60,
    position: 'relative', overflow: 'hidden', fontFamily: FONT, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.6)',
  }}>
    {/* 左侧栏 */}
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 860, borderRight: `2px solid ${LINE}`, padding: '70px 56px 0', background: '#efeff0', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${ACCENT}, #ff6fb1)`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3)' }} />
        <div style={{ fontSize: 56, fontWeight: 760, color: INK, letterSpacing: '-0.02em' }}>ClickUp</div>
      </div>
      <div style={{ height: 50 }} />
      {['Home', 'Inbox', 'Company', 'People & Teams', 'Goals', 'Docs', 'More'].map((t, i) => (
        <div key={t} style={{
          display: 'flex', alignItems: 'center', gap: 30, height: 104, paddingLeft: 30,
          background: i === 0 ? 'rgba(123,104,238,0.12)' : 'transparent', borderRadius: 20,
        }}>
          <Sq c={i === 0 ? ACCENT : '#9a9ca3'} />
          <div style={{ fontSize: 44, color: i === 0 ? INK : INK2, fontWeight: i === 0 ? 650 : 450 }}>{t}</div>
        </div>
      ))}
      <div style={{ height: 60 }} />
      <div style={{ fontSize: 34, letterSpacing: '0.12em', color: MID, fontWeight: 650, paddingLeft: 30 }}>SPACES</div>
      <div style={{ height: 16 }} />
      {['EPD', 'Product roadmap', 'Design', 'Designer handbook', '3.0', 'Design system'].map((t, i) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 30, height: 94, paddingLeft: 30 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: ICON_TINT[(i + 2) % ICON_TINT.length], opacity: 0.85 }} />
          <div style={{ fontSize: 40, color: INK2 }}>{t}</div>
        </div>
      ))}
    </div>
    {/* 主区（左缘 960） */}
    <div style={{ position: 'absolute', left: 960, top: 70, display: 'flex', gap: 110, fontSize: 40, color: MID }}>
      <div>Product analytics</div><div style={{ fontWeight: 700, color: INK }}>ClickUp 3.0</div>
      <div>Widget brainstorm</div><div>Design system</div><div>Design</div>
    </div>
    <div style={{ position: 'absolute', left: 860, right: 0, top: 150, height: 2, background: LINE }} />
    <div style={{ position: 'absolute', left: 960, top: 196, fontSize: 108, fontWeight: 760, color: INK, letterSpacing: '-0.035em', lineHeight: 1 }}>Home</div>
    <div style={{
      position: 'absolute', left: 960, top: 340, display: 'flex', alignItems: 'center', gap: 28, border: `2px solid rgba(20,22,28,0.12)`,
      borderRadius: 24, padding: '0 40px', height: 104, background: '#fff', width: 1400, boxSizing: 'border-box',
      boxShadow: '0 2px 6px rgba(16,18,24,0.04)',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 18, border: '5px solid #9a9ca3', boxSizing: 'border-box' }} />
      <div style={{ fontSize: 40, color: MID }}>Search by app, filetype, or keyword</div>
      <div style={{ marginLeft: 'auto', fontSize: 30, color: MID, padding: '6px 16px', borderRadius: 10, boxShadow: `inset 0 0 0 2px ${LINE}` }}>⌘K</div>
    </div>
    <div style={{ position: 'absolute', left: 960, top: 530, display: 'flex', gap: 70, fontSize: 44 }}>
      <div style={{ color: INK, fontWeight: 700 }}>Recent</div>
      <div style={{ color: MID }}>Favorites</div>
    </div>
    <div style={{ position: 'absolute', left: 960, top: 598, width: 138, height: 6, borderRadius: 3, background: ACCENT }} />
    {/* Recent 槽位：虚线空位框（卡片从空中落入盖住它） */}
    {CARDS.map((c, i) => {
      const s = slotPos(c.col, c.row);
      return (
        <div key={'slot' + i} style={{
          position: 'absolute', left: s.x, top: s.y, width: CARD_W, height: CARD_H, borderRadius: 24,
          border: '3px dashed rgba(20,22,28,0.10)', boxSizing: 'border-box', background: 'rgba(20,22,28,0.012)',
        }} />
      );
    })}
    {/* Todo 区 */}
    <div style={{ position: 'absolute', left: 960, top: 1160, display: 'flex', gap: 70, fontSize: 42 }}>
      <div style={{ color: INK, fontWeight: 700 }}>Todo</div>
      <div style={{ color: MID }}>Comments</div>
      <div style={{ color: MID }}>Done</div>
      <div style={{ color: MID }}>Delegated</div>
    </div>
    <div style={{
      position: 'absolute', left: 960, top: 1260, padding: '14px 36px', background: '#e7e7e6', borderRadius: 14,
      fontSize: 32, letterSpacing: '0.1em', color: '#6f6f75', fontWeight: 650,
    }}>TODAY</div>
    {[['New Bugs Per Week', 'Oct 14', 72], ['Designer handbook', 'Oct 15', 40], ['Mobile screens', 'Oct 17', 18], ['Product roadmap', 'Oct 21', 55]].map(([t, d, pct], i) => (
      <div key={t as string} style={{
        position: 'absolute', left: 960, top: 1370 + i * 116, width: 3340, height: 116, display: 'flex', alignItems: 'center', gap: 34,
        borderBottom: `2px solid ${LINE}`, boxSizing: 'border-box',
      }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: i === 1 ? '#f5a524' : '#e5484d' }} />
        <div style={{ fontSize: 44, color: INK, fontWeight: 550 }}>{t}</div>
        <div style={{ marginLeft: 'auto', fontSize: 34, color: MID, fontVariantNumeric: 'tabular-nums' }}>{d}</div>
        <div style={{ width: 260, height: 14, background: '#e4e4e8', borderRadius: 7, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: ACCENT, opacity: 0.75, borderRadius: 7 }} />
        </div>
      </div>
    ))}
    {/* Goals 区：把页面下半铺满（出版级密度）；低机位时它在近景，压暗压淡不抢落卡的戏，立起时显出 */}
    <div style={{ position: 'absolute', left: 0, top: 1930, width: 4600, height: 670, opacity: lower }}>
    <div style={{ position: 'absolute', left: 960, top: 20, fontSize: 42, color: INK, fontWeight: 700 }}>Goals this quarter</div>
    {[['Ship ClickUp 3.0 beta', 68, '#7b68ee'], ['Cut P1 bug backlog', 44, '#e5484d'], ['Docs search relaunch', 81, '#12a594']].map(([t, pct, c], i) => (
      <div key={t as string} style={{
        position: 'absolute', left: 960 + i * 1130, top: 110, width: 1060, height: 300, borderRadius: 26, background: '#fff',
        border: `2px solid ${LINE}`, boxSizing: 'border-box', padding: '40px 44px',
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.9), 0 2px 4px rgba(16,18,24,0.05)',
      }}>
        <div style={{ fontSize: 38, color: INK2, fontWeight: 550 }}>{t}</div>
        <div style={{ marginTop: 20, fontSize: 88, color: INK, fontWeight: 720, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{pct}%</div>
        <div style={{ marginTop: 22, height: 16, background: '#ececef', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: c as string, borderRadius: 8 }} />
        </div>
      </div>
    ))}
    </div>
  </div>
);

export const RunwayGroundSkim: React.FC = () => {
  const frame = useCurrentFrame();
  const rand = mulberry32(20260718);
  const jit = CARDS.map(() => rand() * 1.2); // ≤1.2 帧微差 < 3 帧错峰，顺序绝不乱

  /* ---- 节奏（掉落提速+着地即停版，118 帧）----
   * f0–6    开场：全员悬空在黑色空域
   * f6–33   掉落：第 i 张起跳 f = 6 + i*3（错峰只差 3 帧），下落 9 帧
   *         ⇒ 9 >> 3，空中同时 3–4 张在落（重叠并行，非串行等待）；
   *         重力加速（距离∝t²），着地即停——零回弹零压缩
   * f38–94  页面立起 + 视角转正（rotateX 66→0，镜头拉远居中）
   * f94–118 终态正视整页 hold */
  // v6（批次 15）：用户意见"下落的时间差多调小一些，不需要一个落下了
  // 再启动第二个"——起点差 3→1.5 帧（9 帧下落窗口重叠度 6 倍，
  // 任意时刻空中 5–6 张同落，几乎齐落带涟漪感）
  const START0 = 6, GAP = 1.5, FALLF = 9;

  const lifts = CARDS.map((c, i) => {
    const t = frame - (START0 + i * GAP + jit[i]);
    const H = 560 + (i % 3) * 160; // 初始悬浮高度错落
    if (t <= 0) return H;
    const p = t / FALLF;
    if (p < 1) return H * (1 - p * p); // 重力加速：下落距离 ∝ t²
    return 0; // 着地即停，无弹起
  });

  /* 立起段进度 */
  const riseP = interpolate(frame, [38, 94], [0, 1], { easing: easeRise, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  /* 镜头：落卡段轻微推进（72→66°），立起段转正（→0°）并拉远居中 */
  const landP = interpolate(frame, [0, 34], [0, 1], { easing: Easing.bezier(0.3, 0.1, 0.6, 0.9), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rx = interpolate(landP, [0, 1], [72, 66]) - 66 * riseP;
  const z = interpolate(landP, [0, 1], [-620, -320]) + riseP * (-1800 - -320);
  const bright = interpolate(frame, [0, 32, 86], [0.32, 0.8, 1.0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  /* 锚点/透视原点随立起归中：终态整页入画、中心≈画面中心 */
  // 终态推导：页心在锚点上方 200px、z=-1800 时缩放 1050/2850≈0.368，锚点放 740px（68.5%）
  // 才能让页心投影到画面中心 540 ⇒ 整页 1693×957 居中、上下各留 ~62px
  const anchorTop = 58 + riseP * 10.5;        // % ：58 → 68.5
  const perspY = 30 + riseP * 20;             // % ：30 → 50

  const cam = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <AbsoluteFill style={{ perspective: 1050, perspectiveOrigin: `50% ${perspY}%`, ...extra }}>
      <div style={{
        position: 'absolute', left: '50%', top: `${anchorTop}%`, width: 0, height: 0,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${z}px) rotateX(${rx}deg)`,
      }}>
        {children}
      </div>
    </AbsoluteFill>
  );

  const scene = (
    <div style={{ position: 'absolute', transformStyle: 'preserve-3d', transform: 'translate(-2300px, -1500px)' }}>
      {/* 地面 */}
      <div style={{ filter: `brightness(${bright})` }}>
        <Ground lower={0.2 + 0.8 * riseP} />
      </div>
      {/* 地面上的软影（z≈0，卡片同形，随悬浮高度变化大小/偏移/浓度） */}
      {CARDS.map((c, i) => {
        const h = lifts[i];
        if (h < 2) return null;
        const s = slotPos(c.col, c.row);
        return (
          <div key={'sh' + i} style={{
            position: 'absolute', left: s.x + 20, top: s.y + 14, width: CARD_W - 40, height: CARD_H - 30,
            transform: `translateZ(1px) translate(${h * 0.08}px, ${h * 0.12}px) scale(${1 + h * 0.0004})`,
            background: 'rgba(10,8,16,0.9)', borderRadius: 24,
            filter: `blur(${10 + h * 0.03}px)`,
            opacity: Math.max(0.12, 0.38 - h * 0.0003),
          }} />
        );
      })}
      {/* 悬空卡片：与地面同向平躺，translateZ 抬高，落回槽位。
          空中时被"追光"打亮（比暗地面亮），落地融入地面亮度 */}
      {CARDS.map((c, i) => {
        const h = lifts[i];
        const s = slotPos(c.col, c.row);
        // 追光：离地 >140px 全额提亮，贴近地面时平滑收回地面亮度（不在着地那一帧硬切）
        const litK = Math.min(1, h / 140);
        const airLit = bright + (Math.max(1.35, bright) - bright) * litK * litK * (3 - 2 * litK);
        // 下落速度（局部 px/帧）→ 纵向运动模糊；卡平躺在 66° 地面上，局部 y≈屏幕纵向
        const tt = frame - (START0 + i * GAP + jit[i]);
        const vel = tt > 0 && tt < FALLF ? (2 * (560 + (i % 3) * 160) * (tt / FALLF)) / FALLF : 0;
        const mb = Math.min(16, vel * 0.07);
        return (
          <div key={'card' + i} style={{
            position: 'absolute', left: s.x, top: s.y, borderRadius: 24,
            transform: `translateZ(${h}px)`,
            filter: `brightness(${airLit.toFixed(3)})${mb > 0.5 ? ` url(#rgs-mb-${i})` : ''}`,
            boxShadow: h > 2 ? `0 0 ${30 + h * 0.05}px rgba(240,235,255,${Math.min(0.3, h * 0.0004)})` : 'none',
          }}>
            {mb > 0.5 && (
              <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
                <filter id={`rgs-mb-${i}`} x="-5%" y="-40%" width="110%" height="180%">
                  <feGaussianBlur stdDeviation={`0 ${mb.toFixed(2)}`} />
                </filter>
              </svg>
            )}
            <MiniCardFace title={c.title} sub={c.sub} i={i} lift={h} />
          </div>
        );
      })}
    </div>
  );

  /* 立起段各氛围层收敛：黑空域压顶/地平线光/近景糊都随转正淡出 */
  const airOp = 1 - riseP;

  return (
    <AbsoluteFill style={{ background: '#07060a' }}>
      {/* 地平线微光（转正后消失） */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 60% 14% at 50% 40%, rgba(190,170,255,${(0.16 + landP * 0.1) * airOp}), transparent 75%)`,
      }} />
      {cam(scene)}
      {/* 近景轻糊（转正后消失） */}
      {airOp > 0.02 && (
        <AbsoluteFill style={{
          filter: 'blur(10px) brightness(0.88)', opacity: airOp,
          WebkitMaskImage: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.7) 84%, black 98%)',
          maskImage: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.7) 84%, black 98%)',
        }}>
          {cam(scene)}
        </AbsoluteFill>
      )}
      {/* 上半空域压黑（随立起淡出） */}
      <AbsoluteFill style={{
        background: 'linear-gradient(180deg, rgba(4,3,8,0.9) 0%, rgba(4,3,8,0.35) 16%, transparent 32%)',
        opacity: airOp, pointerEvents: 'none',
      }} />
      {/* 暗角（转正后减弱不消失） */}
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse 95% 90% at 50% 55%, transparent 50%, rgba(3,2,7,0.55) 85%, rgba(2,1,5,0.88) 100%)',
        opacity: 1 - riseP * 0.55, pointerEvents: 'none',
      }} />
      <Grain opacity={0.06} blend="soft-light" />
    </AbsoluteFill>
  );
};
