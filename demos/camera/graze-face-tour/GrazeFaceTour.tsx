// graze-face-tour v3 —— 源片 clickup-30.mp4 约 28.5–33s：
// 相机大倾角贴着 UI 表面游走特写，三段接力：侧栏树 → 顶部 tab 条 → 列表行。
// v2（用户意见）：页面文字初始悬浮在界面上空（3D 抬高），空中时在 UI 面上
// 投模糊同形软影；随镜头推进先后落贴回界面，影子随高度收敛消失。
// v3 质感升级：
// - 灰阶骨架 UI（Helvetica 回退、5px 粗边框图标、CSS 三角）→ 出版级浅色产品 UI：系统字体栈、
//   字重层级、统一线性 SVG 图标、3px 发丝线（界面按 ~2.7x 排版，等效 1px）、单一靛紫强调色
//   （选中行 / List 视图 / 徽标），与霓虹缘光同色系。
// - 品牌轮：界面就是 video-shotcraft 的工作区——侧栏标志 + 字标、活动 tab 的标志图标，
//   树 / 卡片 / 任务行的内容换成镜头配方卡、分镜、渲染队列（行数与文字长度按原版保持）。
// - 运镜不再"段段刹停"：中段匀速巡航、首段缓起、末段缓落，交叉淡化窗口里相机继续外推
//   （旧版淡化期 t 被钳住 = 每次接力都有 7f 静止），并带 ±1° 的缓慢滚转，持续"低飞"。
// - 同形软影改纯色压暗（不再是灰字重影），落地瞬间收成贴地接触影；背景霓虹框改发光描边、
//   随相机反向视差漂移；暗角改带色相的深色，不再把亮面 UI 压成脏灰；加暗场颗粒。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FONT, Grain, Vignette, bezier } from '../../_fixtures/Polish';
import { ShotcraftMark, ShotcraftWordmark } from '../../_fixtures/Brand';

export const GRAZE_FACE_TOUR_DURATION = 150; // 三段 × 50f

const INK = '#17181c';
const INK2 = '#5d6068';
const INK3 = '#9a9ca5';
const LINE = 'rgba(20,22,28,0.085)';
const SURF = '#f8f8f9';
const SIDE = '#f2f2f4';
const ACC = '#7457f5';
const ACC_SOFT = 'rgba(116,87,245,0.11)';
const SANS = FONT.sans;

const easeFall = bezier(0.5, 0.05, 0.6, 1); // 加速下落、末端软着陆

/* ---------- 悬浮 + 同形软影 ----------
 * h=悬浮高度(px)。文字整体向上（屏幕上-左）抬起，原位置留一份纯色压暗的同形投影：
 * 高处影大、糊、淡、偏移远；h→0 时收成贴地接触影并消失。 */
const FloatWrap: React.FC<{ h: number; children: React.ReactNode }> = ({ h, children }) => (
  <div style={{ position: 'relative' }}>
    {h > 1.5 && (
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translate(${h * 0.22}px, ${h * 0.42}px) scale(${1 + h * 0.0011})`,
        filter: `brightness(0) blur(${2 + h * 0.09}px)`,
        opacity: Math.min(0.22, 0.08 + h * 0.0026),
        pointerEvents: 'none',
      }}>{children}</div>
    )}
    <div style={{ transform: `translate(${-h * 0.34}px, ${-h * 0.78}px)` }}>{children}</div>
  </div>
);

/* 每行的悬浮高度：land = 该行贴回完成的段内时刻(0..1)，之前从 H 高度加速落下 */
const liftOf = (t: number, land: number, H = 120) => {
  const FALL = 0.34;
  const p = Math.min(1, Math.max(0, (t - (land - FALL)) / FALL));
  return (1 - easeFall(p)) * H;
};

/* ---------- 线性图标（24 视框，界面按 ~2.7x 排版，描边 1.7 ≈ 屏幕 4px） ---------- */
type IconName = 'doc' | 'folder' | 'more' | 'chevR' | 'chevD' | 'home' | 'inbox' | 'building' | 'users'
  | 'target' | 'search' | 'list' | 'grid' | 'square' | 'dot';
const PATHS: Record<IconName, string> = {
  doc: 'M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h6M9.5 15.5h6',
  folder: 'M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  chevR: 'M9.5 6l6 6-6 6',
  chevD: 'M6 9.5l6 6 6-6',
  home: 'M4 11l8-6.5 8 6.5M6.5 9.5V19h11V9.5',
  inbox: 'M4 13.5l2.5-8h11l2.5 8v5H4zM4 13.5h4.5l1.2 2h4.6l1.2-2H20',
  building: 'M5 20V5.5h9V20M14 9.5h5V20M8 9h3M8 12.5h3M8 16h3M3.5 20h17',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M17.5 14a5 5 0 0 1 3 5',
  target: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  list: 'M8.5 6.5h11M8.5 12h11M8.5 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01',
  grid: 'M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z',
  square: 'M5 5h14v14H5z',
  dot: 'M12 12h.01',
};
const Icon: React.FC<{ name: IconName; size?: number; color?: string; sw?: number; dashed?: boolean }> = ({
  name, size = 50, color = INK3, sw = 1.7, dashed,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={name === 'more' || name === 'dot' ? 3.2 : sw}
    strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? '2.6 2.4' : undefined} style={{ flex: 'none' }}>
    <path d={PATHS[name]} />
  </svg>
);

/* 空间徽标：低饱和色块 + 字母 */
const SpaceChip: React.FC<{ letter: string; hue: string }> = ({ letter, hue }) => (
  <div style={{
    width: 60, height: 60, borderRadius: 16, background: hue, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: SANS, fontWeight: 700, fontSize: 32, color: '#fff', letterSpacing: '-0.02em',
    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25)',
  }}>{letter}</div>
);

type RowIcon = 'tri' | 'triOpen' | 'doc' | 'folder' | 'dash' | undefined;

const TreeRow: React.FC<{
  depth: number; label: string; icon?: RowIcon; chip?: string; count?: string; size?: number;
}> = ({ depth, label, icon, chip, count, size = 56 }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 26, paddingLeft: 40 + depth * 90,
    height: size * 2.1,
  }}>
    {icon === 'tri' && <Icon name="chevR" size={44} color={INK3} />}
    {icon === 'triOpen' && <Icon name="chevD" size={44} color={INK2} />}
    {icon === 'doc' && <Icon name="doc" color={INK3} />}
    {icon === 'folder' && <Icon name="folder" color={INK3} />}
    {icon === 'dash' && <Icon name="square" color={INK3} dashed />}
    {chip && <SpaceChip letter={chip} hue={{ O: '#8a7cf0', C: '#4fb39a', T: '#e39a5b' }[chip] ?? '#9a9ca5'} />}
    <div style={{ fontFamily: SANS, fontSize: size, color: INK, fontWeight: 500, letterSpacing: '-0.012em' }}>{label}</div>
    {count && (
      <div style={{
        marginLeft: 'auto', marginRight: 80, fontFamily: SANS, fontSize: size * 0.78, color: INK3, fontWeight: 500,
        fontVariantNumeric: 'tabular-nums',
      }}>{count}</div>
    )}
  </div>
);

const RecentCard: React.FC<{ title: string; sub: string; meta: string; w?: number }> = ({ title, sub, meta, w = 880 }) => (
  <div style={{
    width: w, border: `3px solid ${LINE}`, borderRadius: 26, padding: '34px 42px',
    display: 'flex', flexDirection: 'column', gap: 14, background: '#fff', boxSizing: 'border-box',
    boxShadow: '0 3px 6px rgba(16,18,24,0.04), 0 18px 40px -14px rgba(16,18,24,0.12)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
      <Icon name="doc" size={52} color={INK2} />
      <div style={{ fontFamily: SANS, fontSize: 50, color: INK, fontWeight: 650, letterSpacing: '-0.02em' }}>{title}</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingLeft: 74, fontFamily: SANS, fontSize: 38, color: INK3 }}>
      <span style={{ color: INK2 }}>{sub}</span>
      <span>·</span>
      <span>{meta}</span>
    </div>
  </div>
);

const Tabs: React.FC<{ items: string[]; size: number }> = ({ items, size }) => (
  <div style={{ display: 'flex', gap: 80, fontFamily: SANS, fontSize: size, letterSpacing: '-0.012em' }}>
    {items.map((it, i) => (
      <div key={it} style={{ position: 'relative', color: i === 0 ? INK : INK3, fontWeight: i === 0 ? 650 : 500 }}>
        {it}
        {i === 0 && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -22, height: 5, borderRadius: 3, background: ACC }} />}
      </div>
    ))}
  </div>
);

const ViewSwitch: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '20px 40px', background: ACC_SOFT, borderRadius: 18,
      border: '3px solid rgba(116,87,245,0.22)', fontFamily: SANS, fontSize: size, color: ACC, fontWeight: 650,
    }}><Icon name="list" size={size * 0.95} color={ACC} />List</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: SANS, fontSize: size, color: INK3, fontWeight: 500 }}>
      <Icon name="grid" size={size * 0.95} color={INK3} />Gallery
    </div>
  </div>
);

/* 场景 A：侧栏 SPACES 树 + 右侧 Recent 卡
 * 树行/卡片按镜头行进方向（自上而下）先后从空中落贴回界面 */
const SceneTree: React.FC<{ t?: number }> = ({ t = 1 }) => {
  const L = (i: number, n = 14) => liftOf(t, 0.22 + (i / n) * 0.62, 130);
  const rows: [number, string, RowIcon, string | undefined, string | undefined][] = [
    [0, 'Shot recipes', 'doc', undefined, undefined],
    [0, 'Storyboards', 'doc', undefined, undefined],
    [0, 'Renders', 'doc', undefined, undefined],
    [0, 'More', 'dash', undefined, undefined],
    [0, 'Opening', 'tri', 'O', undefined],
    [0, 'Camera moves', 'tri', 'C', undefined],
    [0, 'Transitions', 'triOpen', 'T', undefined],
    [1, 'Recipe handbook', 'doc', undefined, undefined],
    [1, 'Whip pans', 'folder', undefined, undefined],
    [1, 'Match cuts', 'folder', undefined, undefined],
    [2, 'Match cuts', 'doc', undefined, undefined],
    [2, 'Takes', 'dash', undefined, '56'],
    [2, 'Demos', 'dash', undefined, '8'],
    [2, 'Frames', 'dash', undefined, '256'],
  ];
  return (
    <div style={{ width: 2900, height: 2400, background: SURF, display: 'flex' }}>
      <div style={{ width: 1500, borderRight: `3px solid ${LINE}`, paddingTop: 60, background: SIDE }}>
        {rows.slice(0, 4).map((r, i) => (
          <FloatWrap key={r[1] + i} h={L(i)}>
            <TreeRow depth={r[0]} label={r[1]} icon={r[2]} chip={r[3]} count={r[4]} />
          </FloatWrap>
        ))}
        <div style={{ height: 90 }} />
        <FloatWrap h={L(4)}>
          <div style={{ paddingLeft: 48, fontFamily: SANS, fontSize: 40, letterSpacing: '0.14em', color: INK3, fontWeight: 650 }}>SPACES</div>
        </FloatWrap>
        <div style={{ height: 30 }} />
        {rows.slice(4).map((r, i) => (
          <FloatWrap key={r[1] + i} h={L(i + 4.6)}>
            <TreeRow depth={r[0]} label={r[1]} icon={r[2]} chip={r[3]} count={r[4]} />
          </FloatWrap>
        ))}
      </div>
      <div style={{ flex: 1, paddingTop: 100, paddingLeft: 110 }}>
        <FloatWrap h={liftOf(t, 0.3, 150)}>
          <Tabs items={['Recent', 'Favorites']} size={52} />
        </FloatWrap>
        <div style={{ height: 70 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
          <FloatWrap h={liftOf(t, 0.42, 170)}>
            <RecentCard title="Launch film" sub="Storyboard v3" meta="Edited 2h ago" />
          </FloatWrap>
          <FloatWrap h={liftOf(t, 0.55, 170)}>
            <RecentCard title="Add shot · crash zoom" sub="Camera moves" meta="Yesterday" />
          </FloatWrap>
        </div>
        <div style={{ height: 110 }} />
        <FloatWrap h={liftOf(t, 0.68, 150)}>
          <Tabs items={['Todo', 'Comments', 'Done']} size={50} />
        </FloatWrap>
        <div style={{ height: 60 }} />
        <FloatWrap h={liftOf(t, 0.8, 150)}>
          <ViewSwitch size={46} />
        </FloatWrap>
      </div>
    </div>
  );
};

/* 场景 B：顶部 tab 条 + 左上侧栏导航
 * tab 条、video-shotcraft 字标、Home 行、侧栏项先后从空中贴落 */
const NAV: [IconName, string][] = [['inbox', 'Inbox'], ['building', 'Company'], ['users', 'People & Teams'], ['target', 'Goals'], ['doc', 'Docs']];
const SceneTopNav: React.FC<{ t?: number }> = ({ t = 1 }) => (
  <div style={{ width: 3000, height: 2100, background: SURF, borderRadius: 48 }}>
    <div style={{
      height: 150, borderBottom: `3px solid ${LINE}`, display: 'flex', alignItems: 'center',
      gap: 110, paddingLeft: 90, fontFamily: SANS, fontSize: 52, color: INK, background: SIDE, borderRadius: '48px 48px 0 0',
    }}>
      {['Shot recipe cards', 'Launch film', 'Beat-synced cuts', 'Render queue'].map((tb, i) => (
        <FloatWrap key={tb} h={liftOf(t, 0.2 + i * 0.1, 140)}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 22, fontWeight: i === 1 ? 650 : 500, color: i === 1 ? INK : INK2,
            letterSpacing: '-0.012em', opacity: i > 1 ? 0.8 : 1,
            ...(i === 1 ? { background: '#fff', padding: '18px 34px', borderRadius: 18, border: `3px solid ${LINE}`, boxShadow: '0 6px 16px -8px rgba(16,18,24,0.18)' } : {}),
          }}>
            {i === 1
              ? <ShotcraftMark size={40} tone="light" />
              : <Icon name="doc" size={44} color={INK3} />}
            {tb}
          </div>
        </FloatWrap>
      ))}
    </div>
    <div style={{ display: 'flex' }}>
      <div style={{ width: 1250, padding: '70px 70px 0', background: SIDE, height: 1950, boxSizing: 'border-box', borderBottomLeftRadius: 48 }}>
        <FloatWrap h={liftOf(t, 0.34, 150)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <ShotcraftWordmark size={56} tone="light" markScale={1.5} gap={24} />
            <div style={{
              marginLeft: 'auto', width: 120, height: 84, border: `3px solid ${LINE}`, borderRadius: 22, background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon name="search" size={44} color={INK2} /></div>
          </div>
        </FloatWrap>
        <div style={{ height: 60 }} />
        <FloatWrap h={liftOf(t, 0.46, 160)}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 30, background: ACC_SOFT,
            border: '3px solid rgba(116,87,245,0.2)', borderRadius: 24, padding: '28px 40px',
          }}>
            <Icon name="home" size={54} color={ACC} sw={1.9} />
            <div style={{ fontFamily: SANS, fontSize: 54, color: INK, fontWeight: 650, letterSpacing: '-0.015em' }}>Home</div>
            <div style={{
              marginLeft: 'auto', minWidth: 62, height: 62, borderRadius: 31, background: ACC,
              color: '#fff', fontFamily: SANS, fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>3</div>
          </div>
        </FloatWrap>
        {NAV.map(([ic, tb], i) => (
          <FloatWrap key={tb} h={liftOf(t, 0.55 + i * 0.08, 140)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 30, height: 128, paddingLeft: 40 }}>
              <Icon name={ic} size={52} color={INK3} />
              <div style={{ fontFamily: SANS, fontSize: 52, color: INK2, fontWeight: 500, letterSpacing: '-0.012em' }}>{tb}</div>
            </div>
          </FloatWrap>
        ))}
      </div>
      <div style={{ flex: 1, borderLeft: `3px solid ${LINE}`, padding: '70px 90px 0' }}>
        <FloatWrap h={liftOf(t, 0.4, 150)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 30, color: INK3, fontFamily: SANS, fontSize: 48 }}>
            <Icon name="chevR" size={44} color={INK3} />
            <Icon name="home" size={46} color={INK3} />
            <div style={{ color: INK2, fontWeight: 500 }}>Home</div>
          </div>
        </FloatWrap>
        <div style={{ height: 80 }} />
        <FloatWrap h={liftOf(t, 0.58, 180)}>
          <div style={{ fontFamily: SANS, fontSize: 128, fontWeight: 750, color: INK, letterSpacing: '-0.04em', lineHeight: 1 }}>Home</div>
        </FloatWrap>
        <div style={{ height: 80 }} />
        <FloatWrap h={liftOf(t, 0.74, 160)}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 30, border: `3px solid ${LINE}`,
            borderRadius: 26, padding: '32px 44px', background: '#fff', width: 1100, boxSizing: 'border-box',
            boxShadow: '0 3px 6px rgba(16,18,24,0.04), 0 18px 40px -14px rgba(16,18,24,0.14)',
          }}>
            <Icon name="search" size={50} color={INK3} />
            <div style={{ fontFamily: SANS, fontSize: 46, color: INK3 }}>Search shots, recipes…</div>
            <div style={{
              marginLeft: 'auto', padding: '8px 18px', borderRadius: 12, border: `3px solid ${LINE}`,
              fontFamily: FONT.mono, fontSize: 34, color: INK3,
            }}>⌘K</div>
          </div>
        </FloatWrap>
      </div>
    </div>
  </div>
);

/* 场景 C：列表行（TODAY / TASK NAME 区）——Todo 头/TODAY 徽章/任务行自上而下先后贴落 */
const TASKS = [
  { n: 'Render launch film', who: '#8a7cf0', due: 'Today', p: 0.72 },
  { n: 'Add shot: crash zoom', who: '#4fb39a', due: 'Today', p: 0.45 },
  { n: 'Beat-sync the cuts', who: '#e39a5b', due: 'Tomorrow', p: 0.3 },
  { n: 'Export JianYing draft', who: '#6aa6e8', due: 'Fri', p: 0.86 },
];
const SceneListRows: React.FC<{ t?: number }> = ({ t = 1 }) => (
  <div style={{ width: 2900, height: 2200, background: SURF, paddingTop: 60 }}>
    <FloatWrap h={liftOf(t, 0.22, 150)}>
      <div style={{ paddingLeft: 120 }}><Tabs items={['Todo', 'Comments', 'Done', 'Delegated']} size={52} /></div>
    </FloatWrap>
    <div style={{ height: 66 }} />
    <FloatWrap h={liftOf(t, 0.32, 150)}>
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 120 }}>
        <ViewSwitch size={48} />
        <div style={{ marginLeft: 500, display: 'flex', gap: 70, color: INK3, fontFamily: SANS, fontSize: 44, fontWeight: 500 }}>
          <div>Filter</div><div>Group</div><div>Sort</div>
        </div>
      </div>
    </FloatWrap>
    <div style={{ height: 40, borderBottom: `3px solid ${LINE}`, marginLeft: 120, marginRight: 120 }} />
    <div style={{ height: 60 }} />
    <FloatWrap h={liftOf(t, 0.44, 160)}>
      <div style={{
        marginLeft: 120, display: 'inline-flex', alignItems: 'center', gap: 16, padding: '18px 40px', background: ACC_SOFT,
        borderRadius: 16, fontFamily: SANS, fontSize: 40, letterSpacing: '0.12em', color: ACC, fontWeight: 700,
      }}><Icon name="chevD" size={38} color={ACC} sw={2.2} />TODAY</div>
    </FloatWrap>
    <div style={{ height: 60 }} />
    <FloatWrap h={liftOf(t, 0.54, 150)}>
      <div style={{ display: 'flex', paddingLeft: 120, paddingRight: 120, fontFamily: SANS, fontSize: 38, letterSpacing: '0.12em', color: INK3, fontWeight: 600 }}>
        <div>TASK NAME</div>
        <div style={{ marginLeft: 'auto', width: 520 }}>PROGRESS</div>
        <div style={{ width: 260, textAlign: 'right' }}>DUE</div>
      </div>
    </FloatWrap>
    <div style={{ height: 30 }} />
    {TASKS.map((tk, i) => (
      <FloatWrap key={tk.n} h={liftOf(t, 0.62 + i * 0.09, 160)}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 40, height: 170, marginLeft: 120, marginRight: 120,
          borderBottom: `3px solid ${LINE}`,
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, border: `4px solid ${i === 0 ? ACC : 'rgba(20,22,28,0.22)'}`, background: i === 0 ? ACC_SOFT : 'transparent', boxSizing: 'border-box' }} />
          <div style={{ fontFamily: SANS, fontSize: 56, color: INK, fontWeight: 550, letterSpacing: '-0.015em' }}>{tk.n}</div>
          <div style={{ marginLeft: 'auto', width: 64, height: 64, borderRadius: 32, background: tk.who, border: '5px solid #fff', boxShadow: '0 0 0 3px rgba(20,22,28,0.06)' }} />
          <div style={{ width: 400, height: 16, borderRadius: 8, background: 'rgba(20,22,28,0.07)', overflow: 'hidden' }}>
            <div style={{ width: `${tk.p * 100}%`, height: '100%', borderRadius: 8, background: i === 0 ? ACC : 'rgba(20,22,28,0.28)' }} />
          </div>
          <div style={{ width: 220, textAlign: 'right', fontFamily: SANS, fontSize: 44, color: tk.due === 'Today' ? ACC : INK3, fontWeight: 550 }}>{tk.due}</div>
          <Icon name="more" size={50} color={INK3} />
        </div>
      </FloatWrap>
    ))}
  </div>
);

/* ---------- 3D 摄影 ---------- */

type Cam = {
  rx: number; ry: number; rz: number; scale: number;
  x: [number, number]; y: [number, number];
};

// 巡航曲线：首段缓起（前 30% 二次加速接匀速）、末段缓落、中段匀速；u 超出 [0,1]（交叉淡化
// 窗口）时按端点斜率线性外推，相机在淡化里继续飞，接力处不再刹停
const cruise = (u: number, first: boolean, last: boolean) => {
  const A = 0.3;
  const k = 1 / (1 - (first ? A / 2 : 0) - (last ? A / 2 : 0));
  const inPart = (x: number) => (x < A ? (x * x) / (2 * A) : x - A / 2);
  if (first && u <= A) return k * inPart(Math.max(0, u));
  if (last && u >= 1 - A) return 1 - k * inPart(Math.max(0, 1 - u));
  return first ? k * inPart(u) : k * u;
};

const Plane: React.FC<{
  cam: Cam; p: number; edge?: 'left' | 'top'; children: React.ReactNode;
}> = ({ cam, p, edge = 'left', children }) => {
  const x = cam.x[0] + (cam.x[1] - cam.x[0]) * p;
  const y = cam.y[0] + (cam.y[1] - cam.y[0]) * p;
  const roll = cam.rz + (p - 0.5) * 2; // ±1° 缓慢滚转
  return (
    <AbsoluteFill style={{ perspective: 1050, perspectiveOrigin: '50% 46%' }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: 0, height: 0,
        transformStyle: 'preserve-3d',
        transform: `scale(${cam.scale}) rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) rotateZ(${roll}deg)`,
      }}>
        <div style={{ position: 'absolute', transform: `translate3d(${x}px, ${y}px, 0)` }}>
          <div style={{ position: 'relative', transform: 'translate(-50%, -50%)' }}>
            {/* 屏幕边缘霓虹缘光：外晕 + 贴边细亮线 */}
            {edge === 'left' ? (
              <>
                <div style={{
                  position: 'absolute', left: -80, top: -40, width: 120, height: '104%',
                  background: 'linear-gradient(185deg, #ff7ab8, #a46cff 55%, #6a4dff)',
                  filter: 'blur(70px)', opacity: 0.85,
                }} />
                <div style={{
                  position: 'absolute', left: -7, top: 0, width: 6, height: '100%', borderRadius: 3,
                  background: 'linear-gradient(180deg, #ffc2de, #b99bff)', filter: 'blur(2px)', opacity: 0.95,
                }} />
              </>
            ) : (
              <>
                <div style={{
                  position: 'absolute', left: -40, top: -80, width: '104%', height: 120,
                  background: 'linear-gradient(90deg, #ff7ab8, #a46cff 55%, #6a4dff)',
                  filter: 'blur(70px)', opacity: 0.8,
                }} />
                <div style={{
                  position: 'absolute', left: 48, top: -7, width: 'calc(100% - 96px)', height: 6, borderRadius: 3,
                  background: 'linear-gradient(90deg, #ffc2de, #b99bff)', filter: 'blur(2px)', opacity: 0.9,
                }} />
              </>
            )}
            {children}
            {/* 远端压暗：贴面透视里远处渐暗（比 v2 轻，亮面不发脏） */}
            <div style={{
              position: 'absolute', inset: 0,
              background: edge === 'left'
                ? 'linear-gradient(105deg, rgba(8,6,18,0) 34%, rgba(8,6,18,0.22) 75%, rgba(8,6,18,0.5) 100%)'
                : 'linear-gradient(175deg, rgba(8,6,18,0) 38%, rgba(8,6,18,0.2) 80%, rgba(8,6,18,0.45) 100%)',
              pointerEvents: 'none',
            }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 背景霓虹框（暗场道具）：发光细描边，随镜头行进反向视差漂移 */
const NeonRects: React.FC<{ drift: number }> = ({ drift }) => {
  const box = (c: string, a: number): React.CSSProperties => ({
    position: 'absolute', borderRadius: 32, border: `3px solid ${c}`, opacity: a,
    boxShadow: `0 0 24px ${c}, inset 0 0 18px ${c}`, filter: 'blur(3px)',
  });
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div style={{ ...box('#b04dff', 0.42), left: -140 + drift * 60, top: 240, width: 620, height: 380 }} />
      <div style={{ ...box('#ff4da8', 0.32), left: 60 + drift * 36, top: 700, width: 420, height: 260 }} />
      <div style={{ ...box('#7b4dff', 0.3), right: -180 - drift * 44, top: -80, width: 560, height: 340 }} />
    </AbsoluteFill>
  );
};

// 平移目标以内容坐标 (cx,cy) 给出：translate = (W/2-cx, H/2-cy)
const SEGS: { cam: Cam; edge: 'left' | 'top'; render: (t: number) => React.ReactNode }[] = [
  {
    // 侧栏树：从树顶（SPACES 附近）贴面滑到树底（Components/Patterns/Tokens）
    cam: { rx: 12, ry: 30, rz: -6, scale: 0.95, x: [1450 - 950, 1450 - 880], y: [1200 - 1050, 1200 - 1850] },
    edge: 'left', render: (t) => <SceneTree t={t} />,
  },
  {
    // 顶栏 tab 条 → 右区 Home 大标题
    cam: { rx: 20, ry: -20, rz: 6, scale: 0.95, x: [1500 - 800, 1500 - 2000], y: [1050 - 350, 1050 - 800] },
    edge: 'top', render: (t) => <SceneTopNav t={t} />,
  },
  {
    // 列表行：沿 TASK NAME 行右扫
    cam: { rx: 14, ry: 28, rz: -5, scale: 1.05, x: [1450 - 900, 1450 - 680], y: [1100 - 620, 1100 - 1240] },
    edge: 'left', render: (t) => <SceneListRows t={t} />,
  },
];

const SEG_LEN = 50; // 每段 50 帧，总 150
const FADE = 7;

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#07060c' }}>
      {SEGS.map((s, i) => {
        const start = i * SEG_LEN;
        const local = frame - start;
        if (local < -FADE || local > SEG_LEN + FADE) return null;
        const u = local / SEG_LEN; // 不钳：淡化窗口里相机继续外推
        const t = Math.min(1, Math.max(0, u)); // 内容（贴落进度）照旧钳位
        const p = cruise(u, i === 0, i === SEGS.length - 1);
        // 相邻段交叉淡化：后段在边界前 [-FADE,0] 淡入、前段在 [SEG_LEN-FADE, SEG_LEN] 淡出，边界帧无纯黑
        const fadeIn = i === 0 ? 1 : Math.min(1, Math.max(0, (local + FADE) / FADE));
        const fadeOut = i === SEGS.length - 1 ? 1 : Math.min(1, Math.max(0, (SEG_LEN - local) / FADE));
        return (
          <AbsoluteFill key={i} style={{ opacity: Math.min(fadeIn, fadeOut) }}>
            <NeonRects drift={p} />
            <Plane cam={s.cam} p={p} edge={s.edge}>{s.render(t)}</Plane>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

export const GrazeFaceTour: React.FC = () => {
  const frame = useCurrentFrame();
  // 浅景深焦点带：焦点椭圆随段落平滑移动（段间 10f 过渡，不跳）
  const FX = [44, 40, 46];
  const FY = [46, 40, 50];
  const k1 = Math.min(1, Math.max(0, (frame - SEG_LEN + 5) / 10));
  const k2 = Math.min(1, Math.max(0, (frame - 2 * SEG_LEN + 5) / 10));
  const kk = k1 + k2; // 0→1→2：段 A→B→C 的焦点
  const lerpArr = (a: number[]) => (kk <= 1 ? a[0] + (a[1] - a[0]) * kk : a[1] + (a[2] - a[1]) * (kk - 1));
  const focusX = lerpArr(FX);
  const focusY = lerpArr(FY);
  return (
    <AbsoluteFill style={{ background: '#07060c' }}>
      <Stage />
      {/* 屏幕空间浅景深：焦点带外整体模糊 */}
      <AbsoluteFill style={{
        filter: 'blur(15px)',
        WebkitMaskImage: `radial-gradient(ellipse 58% 52% at ${focusX}% ${focusY}%, transparent 34%, rgba(0,0,0,0.85) 72%, black 92%)`,
        maskImage: `radial-gradient(ellipse 58% 52% at ${focusX}% ${focusY}%, transparent 34%, rgba(0,0,0,0.85) 72%, black 92%)`,
      }}>
        <Stage />
      </AbsoluteFill>
      {/* 带色相的暗角（不再把亮面压成灰）+ 暗场颗粒 */}
      <Vignette strength={0.62} inner={0.42} color="#06040e" cx={focusX / 100} cy={focusY / 100} />
      <Grain opacity={0.06} blend="soft-light" />
    </AbsoluteFill>
  );
};
