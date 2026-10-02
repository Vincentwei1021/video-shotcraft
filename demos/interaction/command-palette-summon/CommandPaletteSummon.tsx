// command-palette-summon —— 命令面板降临
// FakeDashboard 静置 → 整屏压暗+blur → ⌘K 面板从中心上方 20px 带 overshoot 弹落
// → 5 条候选行错峰浮现 → 模拟输入 2 字母（"i" → "in"）候选 5→3→2 收窄
// → 高亮首条。f=110 后全静止（40f）。光标 f<104 闪烁、之后常亮。
// 改版：候选行换成真实命令名（匹配字符加粗）+ 图标 + 快捷键键帽，输入框有放大镜/占位提示/esc，
// 底部操作提示栏；压暗用带色相的深色 + 背景轻微后退；画面底部先出 ⌘K 键帽按下给唤出动机；
// 面板发丝线 + 内高光 + 飞行级软阴影；高亮用强调色浅底 + 左缘强调条 + ↵ 键帽。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';
import { EASE, FONT, ramp, softShadow, tracking } from '../../_fixtures/Polish';

// 整段：静置 12 → 压暗/弹落 → 候选 32–56 → 两次按键 62/78 → 高亮 94 → 110 后静止 40f
export const COMMAND_PALETTE_SUMMON_DURATION = 150;

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 时间轴
const DIM0 = 12; // 压暗开始（前 12f 初始静置）
const DIM1 = 22;
const PANEL_IN = 18; // 面板开始弹落
const ROWS_START = 32; // 候选行开始错峰浮现
const KEY1 = 62; // 第一个字母
const KEY2 = 78; // 第二个字母（两键间隔 16f，真人速度）
const HL = 94; // 高亮首条
const BLINK_END = 104; // 光标停止闪烁（常亮）

const PANEL_W = 780;
const PANEL_X = (1920 - PANEL_W) / 2;
const PANEL_Y = 290;
const ROW_H = 72;
const ROW_GAP = 8;
const EXIT_DUR = 10;

const QUERY = 'in';

type Icon = 'invite' | 'chart' | 'theme' | 'project' | 'export';
// exitAt: 0=留到最后，1=第一次按键后退出（不含 "i"），2=第二次按键后退出（含 "i" 不含 "in"）
const ROWS: { title: string; icon: Icon; keys: string[]; exitAt: 0 | 1 | 2 }[] = [
  { title: 'Invite people', icon: 'invite', keys: ['⌘', 'I'], exitAt: 0 },
  { title: 'Insert chart', icon: 'chart', keys: ['⌘', '⇧', 'C'], exitAt: 0 },
  { title: 'Switch theme', icon: 'theme', keys: ['⌘', 'T'], exitAt: 2 },
  { title: 'New project', icon: 'project', keys: ['⌘', 'N'], exitAt: 1 },
  { title: 'Export as PDF', icon: 'export', keys: ['⌘', 'E'], exitAt: 1 },
];

const Glyph: React.FC<{ k: Icon; c: string }> = ({ k, c }) => {
  const p = { stroke: c, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <svg width={20} height={20} viewBox="0 0 20 20">
      {k === 'invite' && (<><circle cx={8} cy={7} r={3} {...p} /><path d="M3 16c.6-2.6 2.6-4 5-4s4.4 1.4 5 4M15 6v5M12.5 8.5h5" {...p} /></>)}
      {k === 'chart' && (<><path d="M3 16h14" {...p} /><path d="M6 13V9M10 13V5M14 13v-3" {...p} /></>)}
      {k === 'theme' && (<><circle cx={10} cy={10} r={6} {...p} /><path d="M10 4a6 6 0 0 0 0 12z" fill={c} /></>)}
      {k === 'project' && (<><rect x={3.5} y={4.5} width={13} height={11} rx={2.5} {...p} /><path d="M10 7.5v5M7.5 10h5" {...p} /></>)}
      {k === 'export' && (<><path d="M10 3.5v8M6.8 8.3 10 11.5l3.2-3.2" {...p} /><path d="M4 13.5v1.5A1.5 1.5 0 0 0 5.5 16.5h9a1.5 1.5 0 0 0 1.5-1.5v-1.5" {...p} /></>)}
    </svg>
  );
};

const Kbd: React.FC<{ children: React.ReactNode; size?: number; dark?: boolean; style?: React.CSSProperties }> = ({ children, size = 15, dark, style }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: size * 1.75, height: size * 1.75,
    padding: '0 6px', boxSizing: 'border-box', borderRadius: size * 0.42, fontFamily: FONT.sans, fontSize: size, fontWeight: 560,
    color: dark ? '#f2f3f5' : G.ink2,
    background: dark ? 'linear-gradient(180deg, #34363d, #24262b)' : 'linear-gradient(180deg, #ffffff, #f4f4f2)',
    border: dark ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${G.hairlineStrong}`,
    boxShadow: dark ? '0 1px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' : '0 1px 0 rgba(20,22,28,0.10)',
    ...style,
  }}>{children}</span>
);

// 标题里与查询匹配的前缀加粗（键入后才出现，按已敲字符数）
const MatchTitle: React.FC<{ title: string; typed: number }> = ({ title, typed }) => {
  const q = QUERY.slice(0, typed);
  const hit = q.length > 0 && title.toLowerCase().startsWith(q) ? q.length : 0;
  return (
    <span style={{ fontSize: 24, letterSpacing: tracking(24), color: G.ink1, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {hit > 0 && <span style={{ fontWeight: 720, color: G.ink1 }}>{title.slice(0, hit)}</span>}
      <span style={{ color: hit > 0 ? G.ink2 : G.ink1 }}>{title.slice(hit)}</span>
    </span>
  );
};

const PaletteRow: React.FC<{ i: number; frame: number; typed: number }> = ({ i, frame, typed }) => {
  const { title, icon, keys, exitAt } = ROWS[i];
  const inStart = ROWS_START + i * 4;
  const exitStart = exitAt === 1 ? KEY1 + 3 : exitAt === 2 ? KEY2 + 3 : null;

  if (exitStart !== null && frame >= exitStart + EXIT_DUR) return null; // 条件卸载，非 opacity 0

  const inOp = interpolate(frame, [inStart, inStart + 8], [0, 1], CL);
  const inY = interpolate(frame, [inStart, inStart + 8], [12, 0], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const exitT =
    exitStart === null
      ? 1
      : interpolate(frame, [exitStart, exitStart + EXIT_DUR], [1, 0], {
          easing: Easing.inOut(Easing.cubic),
          ...CL,
        });

  // 高亮首条
  const hl = i === 0 ? ramp(frame, HL, 10, EASE.out) : 0;

  return (
    <div
      style={{
        height: (ROW_H + ROW_GAP) * exitT,
        opacity: inOp * exitT,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: ROW_H,
          borderRadius: 13,
          background: hl > 0 ? `rgba(91,99,211,${(0.085 * hl).toFixed(3)})` : 'transparent',
          boxShadow: hl > 0 ? `inset 3px 0 0 rgba(91,99,211,${hl.toFixed(3)})` : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '0 18px 0 16px',
          boxSizing: 'border-box',
          transform: `translateY(${inY}px)`,
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 11, flex: 'none', display: 'grid', placeItems: 'center',
          background: hl > 0.5 ? 'linear-gradient(180deg, #6c74e0, #5b63d3)' : G.fill,
          border: hl > 0.5 ? '1px solid rgba(91,99,211,0.6)' : `1px solid ${G.hairline}`,
          boxShadow: hl > 0.5 ? 'inset 0 1px 0 rgba(255,255,255,0.3)' : 'inset 0 1px 0 #fff',
        }}>
          <Glyph k={icon} c={hl > 0.5 ? '#fff' : G.ink2} />
        </div>
        <MatchTitle title={title} typed={typed} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
          {keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
          {i === 0 && (
            <Kbd style={{ marginLeft: 8, opacity: hl, color: G.accent, borderColor: 'rgba(91,99,211,0.35)', transform: `scale(${0.85 + 0.15 * hl})` }}>↵</Kbd>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommandPaletteSummon: React.FC = () => {
  const frame = useCurrentFrame();

  // 背景压暗 + blur（带色相的深色，而非中性灰）；背景同时轻微后退
  const dim = interpolate(frame, [DIM0, DIM1], [0, 0.45], CL);
  const blur = interpolate(frame, [DIM0, DIM1], [0, 10], CL);
  const recede = ramp(frame, DIM0, 24, EASE.out);

  // 面板弹落：上方 20px → 过冲 +8px → 落回 0
  const panelY =
    frame < PANEL_IN + 9
      ? interpolate(frame, [PANEL_IN, PANEL_IN + 9], [-20, 8], {
          easing: Easing.out(Easing.cubic),
          ...CL,
        })
      : interpolate(frame, [PANEL_IN + 9, PANEL_IN + 15], [8, 0], {
          easing: Easing.inOut(Easing.cubic),
          ...CL,
        });
  const panelOp = interpolate(frame, [PANEL_IN, PANEL_IN + 7], [0, 1], CL);
  const panelScale = 0.97 + 0.03 * ramp(frame, PANEL_IN, 12, EASE.snappy);

  // 模拟输入：已敲字符数
  const typed = (frame >= KEY1 ? 1 : 0) + (frame >= KEY2 ? 1 : 0);
  // 每次按键字符轻微落座（2f 上浮）
  const keyPop = (k: number) => (k === 0 ? KEY1 : KEY2);
  // 光标闪烁（周期 16f），BLINK_END 后常亮保证收尾静止
  const cursorOn = frame >= BLINK_END ? true : (frame - PANEL_IN) % 16 < 8;

  // ⌘K 唤出键帽：f2 浮现，f10–14 按下，面板落定后退场
  const capIn = ramp(frame, 2, 8, EASE.snappy);
  const capPress = interpolate(frame, [10, 12, 16], [0, 1, 0], CL);
  const capOut = ramp(frame, 18, 9, EASE.exit); // 面板一出现键帽就让位

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <div style={{
        position: 'absolute', inset: 0,
        filter: frame < DIM0 ? undefined : `blur(${blur}px) saturate(${1 - 0.3 * recede})`,
        transform: `scale(${1 - 0.015 * recede})`,
      }}>
        <FakeDashboard variant="A" />
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 70% 70% at 50% 42%, rgba(12,13,18,${(dim * 0.82).toFixed(3)}) 0%, rgba(12,13,18,${Math.min(0.62, dim * 1.3).toFixed(3)}) 100%)`,
      }} />

      {/* ⌘K 键帽：唤出动机 */}
      {frame < 28 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 860, display: 'flex', justifyContent: 'center', gap: 12,
          opacity: capIn * (1 - capOut), transform: `translateY(${(1 - capIn) * 16 + capOut * 10}px)`,
        }}>
          {['⌘', 'K'].map((k) => (
            <Kbd key={k} size={34} dark style={{
              minWidth: 76, height: 76, borderRadius: 16, fontWeight: 600,
              transform: `translateY(${capPress * 4}px)`,
              boxShadow: `0 ${4 - capPress * 3}px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1), ${softShadow(18, { strength: 1.6 })}`,
            }}>{k}</Kbd>
          ))}
        </div>
      )}

      {frame >= PANEL_IN && (
        <div
          style={{
            position: 'absolute',
            left: PANEL_X,
            top: PANEL_Y,
            width: PANEL_W,
            transform: `translateY(${panelY}px) scale(${panelScale})`,
            transformOrigin: '50% 0%',
            opacity: panelOp,
            background: 'linear-gradient(180deg, #ffffff, #fbfbfa)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: `0 0 0 1px rgba(12,13,18,0.10), inset 0 1px 0 #fff, ${softShadow(56, { strength: 1.5, color: '#07080c' })}`,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* 输入框 */}
          <div
            style={{
              height: 84,
              borderBottom: `1px solid ${G.hairline}`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '0 24px 0 28px',
              boxSizing: 'border-box',
            }}
          >
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
              <circle cx={10.5} cy={10.5} r={6.5} stroke={G.ink3} strokeWidth={2} />
              <path d="M15.5 15.5 20 20" stroke={G.ink3} strokeWidth={2} strokeLinecap="round" />
            </svg>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 500, color: G.ink1, letterSpacing: tracking(30) }}>
              {/* 已敲入的字符（每键 3f 轻微落座） */}
              {Array.from({ length: typed }).map((_, c) => {
                const p = ramp(frame, keyPop(c), 4, EASE.out);
                return (
                  <span key={c} style={{ display: 'inline-block', transform: `translateY(${(1 - p) * -4}px)`, opacity: 0.4 + 0.6 * p }}>
                    {QUERY[c]}
                  </span>
                );
              })}
              {/* 光标 */}
              <span style={{ display: 'inline-block', width: 2.5, height: 36, marginLeft: 2, background: G.accent, borderRadius: 2, opacity: cursorOn ? 1 : 0 }} />
              {/* 占位提示：敲第一个字母时卸载 */}
              {typed === 0 && (
                <span style={{ marginLeft: 10, color: G.ink3, fontSize: 26, letterSpacing: tracking(26) }}>Type a command or search…</span>
              )}
            </div>
            <Kbd style={{ marginLeft: 'auto' }}>esc</Kbd>
          </div>
          {/* 分组标题 + 候选行 */}
          <div style={{ padding: '14px 12px 8px' }}>
            <div style={{ height: 30, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 14, fontWeight: 650, color: G.ink3, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: ramp(frame, ROWS_START - 2, 8) }}>
              {typed === 0 ? 'Suggestions' : 'Commands'}
            </div>
            {ROWS.map((_, i) => (
              <PaletteRow key={i} i={i} frame={frame} typed={typed} />
            ))}
          </div>
          {/* 底部操作提示 */}
          <div style={{
            height: 48, borderTop: `1px solid ${G.hairline}`, background: G.fill, display: 'flex', alignItems: 'center', gap: 18,
            padding: '0 24px', fontSize: 15, color: G.ink3, opacity: ramp(frame, ROWS_START + 8, 10),
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Kbd size={13}>↑</Kbd><Kbd size={13}>↓</Kbd> Navigate</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Kbd size={13}>↵</Kbd> Run</span>
            <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
              {typed === 0 ? 5 : typed === 1 ? 3 : 2} results
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
