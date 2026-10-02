// command-palette-summon —— 命令面板降临
// ⌘K 一按，整个产品界面压暗、虚化、后退让路；命令面板从上方带过冲弹落，候选行错峰浮现；
// 敲三个字母，列表随每一键实时塌缩收窄，最后首条高亮定格。
//
// 第二轮重设计（深蓝夜 · 开发者工具发布片）：
// - look = midnight（深蓝黑 + 电光蓝）。背景世界换成为镜头做的暗色产品界面「Sable」（部署控制台：
//   侧栏 + 部署列表 + 流量曲线），不再用通用小字 dashboard；唤出时世界后退 4%、压暗、虚化、降饱和。
// - 唤出动机：画面下方一对大键帽 ⌘ K 先浮现、按下（键帽下沉 + 电光蓝底光一闪），面板随之落下。
// - 面板做大做清楚：1100px 宽深色玻璃，输入字 48px、候选 34px、键帽 24px；顶沿内高光 + 发丝线 +
//   落地时背后一次电光蓝泛光（Q4：只给主角一次）。
// - 收窄是挤压不是淡出：查询 "dep" 三键（间隔 12f，真人速度），每一键都有行塌缩（高度→0 后卸载），
//   6 → 4 → 3 → 2，匹配片段电光蓝加粗，结果计数同步跳。面板高度跟着收，顶部锚定、最终落在画面正中。
// - 定格：首条高亮从左扫满（强调色浅底 + 左缘亮条 + 图标块转实色 + ↵ 键帽弹出），光标转常亮，
//   之后只剩极缓推镜（1 → 1.03）让画面活着。
//
// 时间表（30fps，共 160f）：
//   0–8      Sable 界面清晰静置（开场即有画面），⌘ K 键帽浮现（snappy）
//   10–14    按下：键帽下沉 4px、底光一闪
//   12–26    世界让路：scale 1→0.96、亮度压到 ~40%、blur 0→12px（smooth）
//   16–34    面板弹落：-56px → 0，spring damping 14（一次可见过冲）；键帽沉下退场；背后泛光 22f 衰减
//   22–49    6 行候选每 3f 错峰上浮（out，与弹落跨骑——面板落定时列表已在长出来）
//   62/74/86 三次按键 d / e / p，各自 +3f 起行塌缩 10f（swift），条件卸载
//   100–110  首条高亮从左扫满；↵ 键帽弹出；光标 112f 后常亮
//   110–160  hold（推镜 1 → 1.03，极缓）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, ramp, mix } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type, TYPE } from '../../_fixtures/Look';

export const COMMAND_PALETTE_SUMMON_DURATION = 160;

const L = LOOKS.midnight;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

const CAP_IN = 2;
const PRESS = 10;
const RECEDE = 12;
const PANEL_IN = 16;
const ROWS_IN = 22;
const KEYS = [62, 74, 86];
const QUERY = 'dep';
const HL = 100;
const BLINK_END = 112;

const PANEL_W = 1100;
const PANEL_X = (1920 - PANEL_W) / 2;
const PANEL_Y = 300;
const ROW_H = 80;
const ROW_GAP = 4;
const COLLAPSE = 10;

type Icon = 'rocket' | 'list' | 'copy' | 'branch' | 'user' | 'moon';
// exitAt：第几次按键后塌缩（0 = 留到最后）
const ROWS: { title: string; sub: string; icon: Icon; keys: string[]; exitAt: 0 | 1 | 2 | 3 }[] = [
  { title: 'Deploy to production', sub: 'main · 4 commits ahead', icon: 'rocket', keys: ['⌘', '⇧', 'D'], exitAt: 0 },
  { title: 'Open deployments', sub: 'Navigation', icon: 'list', keys: ['G', 'D'], exitAt: 0 },
  { title: 'Delete branch', sub: 'feat/edge-cache', icon: 'branch', keys: ['⌘', '⌫'], exitAt: 3 },
  { title: 'Duplicate project', sub: 'sable-web', icon: 'copy', keys: ['⌘', 'J'], exitAt: 2 },
  { title: 'Invite teammate', sub: 'Workspace', icon: 'user', keys: ['⌘', 'I'], exitAt: 1 },
  { title: 'Switch theme', sub: 'Appearance', icon: 'moon', keys: ['⌘', 'T'], exitAt: 1 },
];

const Glyph: React.FC<{ k: Icon; c: string; s?: number }> = ({ k, c, s = 28 }) => {
  const p = { stroke: c, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24">
      {k === 'rocket' && (<><path d="M12 15.5 8.5 12c1.6-4.6 4.6-7.6 10-8.5-.9 5.4-3.9 8.4-8.5 10" {...p} /><path d="M8.5 12 5 11.5l2.5-3.5 3.5.3M12 15.5l.5 3.5 3.5-2.5-.3-3.5M6.5 17.5c-1 .5-1.8 1.6-2 3 1.4-.2 2.5-1 3-2" {...p} /><circle cx={15} cy={9} r={1.4} {...p} /></>)}
      {k === 'list' && (<><path d="M9 6.5h11M9 12h11M9 17.5h11" {...p} /><circle cx={4.8} cy={6.5} r={1.1} fill={c} /><circle cx={4.8} cy={12} r={1.1} fill={c} /><circle cx={4.8} cy={17.5} r={1.1} fill={c} /></>)}
      {k === 'copy' && (<><rect x={8} y={8} width={12} height={12} rx={2.5} {...p} /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" {...p} /></>)}
      {k === 'branch' && (<><circle cx={6} cy={5.5} r={2} {...p} /><circle cx={6} cy={18.5} r={2} {...p} /><circle cx={18} cy={8} r={2} {...p} /><path d="M6 7.5v9M18 10c0 4-6 3.5-11 7" {...p} /></>)}
      {k === 'user' && (<><circle cx={10} cy={8} r={3.5} {...p} /><path d="M3.5 19.5c.8-3.3 3.4-5 6.5-5s5.7 1.7 6.5 5M18.5 7v6M15.5 10h6" {...p} /></>)}
      {k === 'moon' && (<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" {...p} />)}
    </svg>
  );
};

const Kbd: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 24, style }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: size * 1.7, height: size * 1.7, padding: '0 8px',
    boxSizing: 'border-box', borderRadius: size * 0.4, ...type(size, 600), letterSpacing: 0, color: L.ink2,
    background: 'linear-gradient(180deg, #232c42, #1a2133)', border: `1px solid ${L.line}`,
    boxShadow: '0 1.5px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)', ...style,
  }}>{children}</span>
);

// 标题里与查询匹配的片段（不分大小写，首个出现处）高亮
const MatchTitle: React.FC<{ title: string; q: string; lit: boolean }> = ({ title, q, lit }) => {
  const i = q ? title.toLowerCase().indexOf(q) : -1;
  const base: React.CSSProperties = { ...type(34, 560), color: lit ? '#ffffff' : L.ink, whiteSpace: 'nowrap' };
  if (i < 0) return <span style={base}>{title}</span>;
  return (
    <span style={base}>
      {title.slice(0, i)}
      <span style={{ color: lit ? '#ffffff' : L.accent, fontWeight: 760 }}>{title.slice(i, i + q.length)}</span>
      {title.slice(i + q.length)}
    </span>
  );
};

// 背景世界：Sable 部署控制台（为镜头简化的暗色产品界面）
const SableApp: React.FC = () => {
  const deploys = [
    { name: 'sable-web', env: 'Production', t: '2m ago', ok: true },
    { name: 'edge-worker', env: 'Preview', t: '14m ago', ok: true },
    { name: 'billing-api', env: 'Production', t: '1h ago', ok: false },
    { name: 'docs-site', env: 'Preview', t: '3h ago', ok: true },
  ];
  const pts = Array.from({ length: 24 }, (_, i) => 120 - (Math.sin(i * 0.7) * 26 + Math.sin(i * 0.23) * 40 + i * 2.6));
  const path = pts.map((y, i) => `${i ? 'L' : 'M'}${(i * 940) / 23} ${y}`).join(' ');
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', fontFamily: type(30).fontFamily }}>
      <div style={{ width: 340, background: 'linear-gradient(180deg, #0c1222, #090e1b)', borderRight: `1px solid ${L.line}`, padding: '44px 28px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${L.accent}, ${L.accent2})` }} />
          <span style={{ ...type(32, 720), color: L.ink }}>Sable</span>
        </div>
        {['Overview', 'Deployments', 'Logs', 'Domains', 'Settings'].map((n, i) => (
          <div key={n} style={{
            height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', padding: '0 18px', marginBottom: 6,
            background: i === 1 ? alpha(L.accent, 0.14) : 'transparent', color: i === 1 ? L.ink : L.ink2, ...type(28, i === 1 ? 640 : 500),
          }}>{n}</div>
        ))}
      </div>
      <div style={{ flex: 1, padding: '48px 64px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <span style={{ ...type(60, 720), color: L.ink }}>Deployments</span>
          <span style={{ ...type(30, 500), color: L.ink3 }}>sable-web</span>
          <span style={{ marginLeft: 'auto', height: 52, padding: '0 22px', borderRadius: 14, background: L.accent, color: L.onAccent, display: 'inline-flex', alignItems: 'center', ...type(26, 680) }}>New deploy</span>
        </div>
        <div style={{ marginTop: 40, height: 250, borderRadius: 24, background: L.surface, border: `1px solid ${L.line}`, padding: '28px 36px', boxSizing: 'border-box', position: 'relative' }}>
          <div style={{ ...type(26, 560), color: L.ink2 }}>Requests · last 24h</div>
          <div style={{ ...type(56, 720), color: L.ink, marginTop: 6 }}>18.4M</div>
          <svg width={940} height={150} style={{ position: 'absolute', right: 36, bottom: 20 }} viewBox="0 0 940 150">
            <path d={`${path} L940 150 L0 150 Z`} fill={alpha(L.accent, 0.14)} />
            <path d={path} fill="none" stroke={L.accent} strokeWidth={3} />
          </svg>
        </div>
        <div style={{ marginTop: 28, borderRadius: 24, background: L.surface, border: `1px solid ${L.line}`, overflow: 'hidden' }}>
          {deploys.map((d, i) => (
            <div key={d.name} style={{ height: 88, display: 'flex', alignItems: 'center', padding: '0 36px', gap: 22, borderTop: i ? `1px solid ${L.line}` : undefined }}>
              <span style={{ width: 14, height: 14, borderRadius: 7, background: d.ok ? L.accent2 : '#ff6b6b' }} />
              <span style={{ ...type(30, 620), color: L.ink, width: 320 }}>{d.name}</span>
              <span style={{ ...type(26, 500), color: L.ink2, width: 220 }}>{d.env}</span>
              <span style={{ ...type(26, 500), color: L.ink3, marginLeft: 'auto' }}>{d.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PaletteRow: React.FC<{ i: number; f: number; q: string }> = ({ i, f, q }) => {
  const r = ROWS[i];
  const inStart = ROWS_IN + i * 3;
  const exitStart = r.exitAt ? KEYS[r.exitAt - 1] + 3 : null;
  if (exitStart !== null && f >= exitStart + COLLAPSE) return null; // 塌缩完卸载
  const inP = ramp(f, inStart, 12, EASE.out);
  const keep = exitStart === null ? 1 : 1 - ramp(f, exitStart, COLLAPSE, EASE.swift);
  const hl = i === 0 ? ramp(f, HL, 10, EASE.snappy) : 0;
  const lit = hl > 0.5;
  return (
    <div style={{ height: (ROW_H + ROW_GAP) * keep, overflow: 'hidden', opacity: inP * clamp01(keep * 1.6 - 0.4) }}>
      <div style={{
        position: 'relative', height: ROW_H, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 24, padding: '0 22px 0 18px',
        transform: `translateY(${(1 - inP) * 18}px) scale(${0.97 + 0.03 * keep})`, transformOrigin: '50% 0%', overflow: 'hidden',
      }}>
        {/* 高亮：从左扫满的强调色浅底 + 左缘亮条 */}
        {hl > 0 && (
          <>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: `${hl * 100}%`, borderRadius: 18,
              background: `linear-gradient(90deg, ${alpha(L.accent, 0.3)}, ${alpha(L.accent, 0.16)})`,
              boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.08)}`,
            }} />
            <div style={{ position: 'absolute', left: 0, top: 16, bottom: 16, width: 4, borderRadius: 2, background: L.accent, opacity: hl, boxShadow: `0 0 12px ${L.accent}` }} />
          </>
        )}
        <div style={{
          position: 'relative', width: 56, height: 56, borderRadius: 15, flex: 'none', display: 'grid', placeItems: 'center',
          background: lit ? `linear-gradient(180deg, #7aa2ff, ${L.accent})` : L.surface2,
          border: `1px solid ${lit ? alpha('#ffffff', 0.25) : L.line}`, boxShadow: lit ? `0 6px 18px -6px ${L.accent}` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <Glyph k={r.icon} c={lit ? L.onAccent : L.ink2} />
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <MatchTitle title={r.title} q={q} lit={lit} />
          <span style={{ ...type(26, 500), color: lit ? alpha('#ffffff', 0.7) : L.ink3, whiteSpace: 'nowrap' }}>{r.sub}</span>
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {r.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
          {i === 0 && (
            <Kbd style={{
              marginLeft: 10, color: L.onAccent, background: `linear-gradient(180deg, #8fb0ff, ${L.accent})`, border: `1px solid ${alpha('#ffffff', 0.3)}`,
              opacity: hl, transform: `scale(${0.6 + 0.4 * EASE.overshoot(clamp01((f - HL - 2) / 10))})`,
            }}>↵</Kbd>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommandPaletteSummon: React.FC = () => {
  const f = useCurrentFrame();

  // 世界让路
  const recede = ramp(f, RECEDE, 14, EASE.smooth);
  // 键帽
  const capIn = ramp(f, CAP_IN, 8, EASE.snappy);
  const press = clamp01((f - PRESS) / 2) * (1 - clamp01((f - PRESS - 4) / 5));
  const flash = clamp01((f - PRESS) / 2) * (1 - ramp(f, PRESS + 2, 14, EASE.out));
  const capOut = ramp(f, PANEL_IN + 2, 10, EASE.exit);
  // 面板
  const drop = f < PANEL_IN ? 0 : springAt(f, PANEL_IN, { damping: 14, stiffness: 160 });
  const panelOp = ramp(f, PANEL_IN, 6, EASE.out);
  const bloom = ramp(f, PANEL_IN + 4, 6, EASE.out) * (1 - 0.65 * ramp(f, PANEL_IN + 10, 22, EASE.out));
  // 输入
  const typed = KEYS.filter((k) => f >= k).length;
  const q = QUERY.slice(0, typed);
  const cursorOn = f >= BLINK_END ? true : Math.floor((f - PANEL_IN) / 8) % 2 === 0;
  const count = ROWS.filter((r) => r.exitAt === 0 || r.exitAt > typed).length;
  // 推镜（hold 段极缓）
  const push = mix(1, 1.03, ramp(f, 96, 64, EASE.swift));

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      {/* 世界：清晰 → 后退 + 压暗 + 虚化 + 降饱和 */}
      <AbsoluteFill style={{
        transform: `scale(${1 - 0.04 * recede})`,
        filter: recede > 0.001 ? `blur(${(12 * recede).toFixed(2)}px) brightness(${(1 - 0.58 * recede).toFixed(3)}) saturate(${(1 - 0.35 * recede).toFixed(3)})` : undefined,
      }}>
        <Stage look={L} keyLight={{ x: 0.6, y: -0.05 }} fill={{ x: 0.1, y: 1 }} intensity={0.5} grain={0} vignette={0.35} />
        <SableApp />
      </AbsoluteFill>
      {/* 压暗层：带色相的深蓝，中心略透（面板所在处） */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 60% 62% at 50% 46%, ${alpha('#050914', 0.38 * recede)} 0%, ${alpha('#03050c', 0.72 * recede)} 100%)`,
      }} />
      {/* 面板背后的电光蓝泛光（落地一次，余辉常驻） */}
      <AbsoluteFill style={{
        opacity: bloom,
        background: `radial-gradient(ellipse 42% 36% at 50% 46%, ${alpha(L.light, 0.42)} 0%, ${alpha(L.light, 0)} 70%)`,
      }} />

      {/* ⌘ K 键帽：唤出动机 */}
      {f < PANEL_IN + 14 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 850, display: 'flex', justifyContent: 'center', gap: 22,
          opacity: capIn * (1 - capOut), transform: `translateY(${(1 - capIn) * 30 + capOut * 40}px)`,
        }}>
          {['⌘', 'K'].map((k) => (
            <span key={k} style={{
              width: 120, height: 120, borderRadius: 27, display: 'grid', placeItems: 'center', ...type(56, 600), color: L.ink,
              background: 'linear-gradient(180deg, #2a3450 0%, #1a2238 100%)', border: `1px solid ${alpha('#a0beff', 0.22)}`,
              transform: `translateY(${press * 6}px)`,
              boxShadow: `0 ${8 - press * 6}px 0 #070b16, inset 0 1.5px 0 rgba(255,255,255,0.12), 0 30px 60px -20px rgba(0,0,0,0.8), 0 0 ${60 * flash}px ${alpha(L.accent, 0.7 * flash)}`,
            }}>{k}</span>
          ))}
        </div>
      )}

      {/* 面板 */}
      {f >= PANEL_IN && (
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `50% ${PANEL_Y + 200}px` }}>
          <div style={{
            position: 'absolute', left: PANEL_X, top: PANEL_Y, width: PANEL_W, borderRadius: 30, overflow: 'hidden',
            transform: `translateY(${(1 - drop) * -56}px) scale(${0.965 + 0.035 * drop})`, transformOrigin: '50% 0%', opacity: panelOp,
            background: 'linear-gradient(180deg, rgba(24,32,52,0.97) 0%, rgba(15,21,36,0.97) 100%)',
            border: `1px solid ${alpha('#a8c2ff', 0.16)}`,
            boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.1)}, 0 2px 0 rgba(0,0,0,0.3), 0 50px 120px -30px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,0,0,0.4)`,
          }}>
            {/* 输入行 */}
            <div style={{ height: 112, display: 'flex', alignItems: 'center', gap: 22, padding: '0 32px 0 36px', borderBottom: `1px solid ${L.line}` }}>
              <svg width={36} height={36} viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
                <circle cx={10.5} cy={10.5} r={6.5} stroke={typed ? L.accent : L.ink3} strokeWidth={2} />
                <path d="M15.5 15.5 20 20" stroke={typed ? L.accent : L.ink3} strokeWidth={2} strokeLinecap="round" />
              </svg>
              <div style={{ display: 'flex', alignItems: 'center', ...type(48, 560), color: L.ink }}>
                {q.split('').map((c, k) => {
                  const p = ramp(f, KEYS[k], 4, EASE.out);
                  return <span key={k} style={{ display: 'inline-block', transform: `translateY(${(1 - p) * -6}px)`, opacity: 0.35 + 0.65 * p }}>{c}</span>;
                })}
                <span style={{ display: 'inline-block', width: 4, height: 52, marginLeft: 3, borderRadius: 2, background: L.accent, opacity: cursorOn ? 1 : 0, boxShadow: `0 0 10px ${alpha(L.accent, 0.8)}` }} />
                {typed === 0 && <span style={{ marginLeft: 14, ...type(40, 500), color: L.ink3 }}>Search commands, projects, people…</span>}
              </div>
              <Kbd style={{ marginLeft: 'auto' }}>esc</Kbd>
            </div>
            {/* 分组 + 候选 */}
            <div style={{ padding: '10px 16px 12px' }}>
              <div style={{
                height: 48, display: 'flex', alignItems: 'center', padding: '0 20px', ...type(TYPE.label, 700, { caps: true }), letterSpacing: '0.18em',
                color: L.ink3, opacity: ramp(f, ROWS_IN - 4, 10),
              }}>{typed === 0 ? 'Suggestions' : 'Commands'}</div>
              {ROWS.map((_, i) => <PaletteRow key={i} i={i} f={f} q={q} />)}
            </div>
            {/* 底栏 */}
            <div style={{
              height: 64, borderTop: `1px solid ${L.line}`, background: alpha('#000000', 0.18), display: 'flex', alignItems: 'center', gap: 26,
              padding: '0 32px', ...type(24, 520), color: L.ink3, opacity: ramp(f, ROWS_IN + 10, 10),
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Kbd size={18}>↑</Kbd><Kbd size={18}>↓</Kbd> Navigate</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Kbd size={18}>↵</Kbd> Run</span>
              <span style={{ marginLeft: 'auto', color: L.ink2 }}>
                <span style={{ color: L.ink, fontWeight: 700 }}>{count}</span> {count === 1 ? 'result' : 'results'}
              </span>
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
