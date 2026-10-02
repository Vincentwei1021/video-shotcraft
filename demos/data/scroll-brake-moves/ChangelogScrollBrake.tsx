// changelog-scroll-brake —— Changelog 长卷急刹（基本款 A）
//
// 第二轮重设计（深蓝夜 · 瑞士网格发布账本）：
// - look = midnight。左栏是固定的"读数区"：品牌字标 + 大号「Changelog」+ 一枚随滚动翻动的日期读数
//   （读的是此刻压在读线上的那一条的日期，高速段按速度竖向糊、急刹后落成强调色「Today」）。
//   右侧 1160px 宽的长卷是整年 2026 的发布记录（版本号 / 标题 / 类型点，三档行高错落），
//   画面纵向正中有一根固定的"读线"（左缘带刻度标记），长卷急刹就是把 v4.0 那一条精准停在读线上。
// - 手法：translateY 扫 ~5000px，快起步 + 长尾指数式减速（bezier .45,0,.06,1），起步前 10f 先向下
//   回拉 26px 作预备；纵向方向性运动模糊由速度差分驱动（停稳即清零）；急刹后目标行弹簧抬升
//   （scale 1.04、damping 15 一次可见回弹）+ 强调色描边与泛光 + 一次裁进圆角的扫光，其余行退暗 0.38。
// - 主角卡 v4.0「Live Canvas」是唯一的大字（64px）+ 一行说明 + LAUNCH 徽标；落定后整幅极缓推近 2%。
//
// 时间表（30fps，共 150f）：
//   0–10    预备：长卷停在一年之初，向下回拉 26px（蓄力）
//   10–64   冲刺 + 刹车（54f）：~6f 拉满速，长尾减速，日期读数飞速翻动
//   64      急刹停位（v4.0 中线 = 读线）
//   64–80   抬升：目标行弹簧抬起、描边/泛光点亮；其余行 12f 退暗；读线标记点亮
//   72–96   余波：说明逐词升起、LAUNCH 徽标弹出、扫光一次（78–100）、读数落成 Today
//   96–150  hold：整幅 1→1.02 极缓推近，泛光呼吸
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, bezier, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Sheen, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const CHANGELOG_SCROLL_BRAKE_DURATION = 150;

const L = LOOKS.midnight;

// ── 时间轴 ──
const PRE0 = 0; // 预备回拉起点
const SCROLL0 = 10; // 冲刺起点
const SCROLL1 = 64; // 急刹停位帧
const LIFT = 64; // 目标行抬升弹簧起跳 = 急刹帧

// ── 版式 ──
const LIST_X = 664;
const LIST_W = 1136; // 右缘 1800（安全边距 120）
const GAP = 14;
const READ_Y = 540; // 读线（画面纵向正中）
const TARGET = 38;
const N = 46;
const TARGET_H = 212;

// 三档行高错落（全由 i 决定，帧确定）
const rowH = (i: number) => (i === TARGET ? TARGET_H : [96, 118, 96, 140, 118][(i * 3) % 5]);
const rowY: number[] = [];
{
  let y = 0;
  for (let i = 0; i < N; i++) {
    rowY.push(y);
    y += rowH(i) + GAP;
  }
}
const START_T = 150; // 起始：长卷顶在页眉线下
const END_T = READ_Y - (rowY[TARGET] + TARGET_H / 2); // 目标行中线落在读线上

// 快起步（~6f 到峰速）+ 长尾指数式减速；前 10f 先向下回拉 26px 再冲出（预备）
const BRAKE_EASE = bezier(0.45, 0, 0.06, 1);
const scrollAt = (f: number): number => {
  if (f < SCROLL0) return START_T + 26 * Math.sin(Math.PI * Math.min(1, Math.max(0, (f - PRE0) / (SCROLL0 - PRE0))));
  return mix(START_T, END_T, BRAKE_EASE(Math.min(1, (f - SCROLL0) / (SCROLL1 - SCROLL0))));
};

// ── 假内容：2026 年一整年的发布记录（自上而下时间递增），停点后是路线图 ──
const TITLES = [
  'Keyboard-first command bar', 'Faster full-text search', 'Duplicate notification fix', 'Custom fields on tasks',
  'Dark mode for the editor', 'Bulk edit in table view', 'Timezone drift in sprints', 'Threaded comments',
  'Saved views and filters', 'Pull request linking', 'Import from spreadsheets', 'Drag handles on touch',
  'Project templates', 'Inline image resize', 'Audit log export', 'Sub-task progress rings',
  'Stale cache on reconnect', 'Roadmap zoom levels', 'Single sign-on for teams', 'Markdown tables',
  'Cold start 2× faster', 'Emoji picker focus', 'Triage inbox', 'Webhooks v2', 'Granular permissions',
  'Offline drafts', 'Cursor jump on paste', 'Calendar view', 'Workspace analytics', 'Recurring tasks',
  'Guest access', 'Time tracking', 'Board swimlanes', 'Mentions in docs', 'Bulk archive', 'Smart due dates',
  'Rich link previews', 'Faster board loading',
];
const PLANNED = ['Public API v3', 'Mobile offline mode', 'Native desktop app', 'Data residency (EU)', 'Custom dashboards', 'Portfolio view', 'Approvals'];
const KIND = [
  { name: 'New', dot: L.accent },
  { name: 'Improved', dot: L.accent2 },
  { name: 'Fixed', dot: L.ink3 },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const dateOf = (i: number) => {
  if (i === TARGET) return 'Today';
  if (i > TARGET) return 'Q4';
  const m = Math.min(8, Math.floor((i / TARGET) * 9));
  const d = 2 + ((i * 7) % 26);
  return `${MONTHS[m]} ${String(d).padStart(2, '0')}`;
};
const kindOf = (i: number) => (/fix|drift|jump|stale|focus|duplicate/i.test(TITLES[i % TITLES.length]) ? KIND[2] : KIND[(i * 5) % 2]);

// 此刻压在读线上的行（给左栏日期读数用）
const rowAtLine = (T: number) => {
  const y = READ_Y - T;
  for (let i = 0; i < N; i++) if (y < rowY[i] + rowH(i) + GAP / 2) return i;
  return N - 1;
};

const Row: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const h = rowH(i);
  const later = i > TARGET;
  const k = kindOf(i);
  const tall = h >= 118;
  const dim = ramp(frame, LIFT + 2, 12, EASE.out);
  const desc = ['Rolled out to every workspace.', 'Up to 3× faster on large boards.', 'Available on all plans.', 'Live for web, desktop and mobile.'][i % 4];
  return (
    <div
      style={{
        position: 'absolute', left: 0, top: rowY[i], width: LIST_W, height: h, boxSizing: 'border-box',
        borderRadius: 18, padding: '0 36px', display: 'flex', alignItems: 'center', gap: 30,
        background: later ? 'transparent' : `linear-gradient(180deg, ${alpha('#1a2440', 0.92)} 0%, ${alpha(L.surface, 0.92)} 100%)`,
        border: later ? `1.5px dashed ${alpha(L.ink3, 0.45)}` : `1px solid ${L.line}`,
        boxShadow: later ? 'none' : `inset 0 1px 0 ${alpha('#ffffff', 0.05)}, 0 10px 24px -14px ${alpha(L.shadow, 0.9)}`,
        opacity: 1 - 0.62 * dim,
        filter: dim > 0.02 ? `blur(${(1.6 * dim).toFixed(2)}px)` : undefined, // 退暗 = 退到景深后面
      }}
    >
      <div style={{ width: 132, flexShrink: 0, fontFamily: FONT.mono, fontSize: 30, fontWeight: 500, color: L.ink3 }}>
        {later ? '—' : `v3.${String(i + 2).padStart(2, '0')}`}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...type(38, 600), color: later ? L.ink3 : L.ink, whiteSpace: 'nowrap' }}>
          {later ? PLANNED[(i - TARGET - 1) % PLANNED.length] : TITLES[i % TITLES.length]}
        </div>
        {tall && !later && (
          <div style={{ ...type(30, 400), color: L.ink2, marginTop: 8, whiteSpace: 'nowrap' }}>{desc}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, width: 170 }}>
        <div style={{ width: 10, height: 10, borderRadius: 5, background: later ? 'transparent' : k.dot, border: later ? `2px solid ${L.ink3}` : 'none' }} />
        <div style={{ ...type(28, 500), color: L.ink2 }}>{later ? 'Planned' : k.name}</div>
      </div>
      <div style={{ width: 110, flexShrink: 0, textAlign: 'right', ...type(30, 500), color: L.ink3 }}>{dateOf(i)}</div>
    </div>
  );
};

// 主角：v4.0 Live Canvas
const HeroRow: React.FC<{ frame: number }> = ({ frame }) => {
  const s = frame < LIFT ? 0 : springAt(frame, LIFT, { damping: 15, stiffness: 190 });
  const lit = ramp(frame, LIFT, 10, EASE.out);
  const badge = frame < LIFT + 10 ? 0 : springAt(frame, LIFT + 10, { damping: 14, stiffness: 260 });
  const sheen = ramp(frame, LIFT + 14, 22, EASE.swift);
  return (
    <div
      style={{
        position: 'absolute', left: 0, top: rowY[TARGET], width: LIST_W, height: TARGET_H, zIndex: 3,
        transform: `scale(${(1 + 0.04 * s).toFixed(4)}) translateY(${(-6 * s).toFixed(2)}px)`,
      }}
    >
      {/* 背后泛光（只给主角） */}
      <div style={{
        position: 'absolute', inset: -60, borderRadius: 80, opacity: lit * (0.9 + 0.1 * Math.sin(frame / 14)),
        background: `radial-gradient(ellipse 60% 55% at 50% 50%, ${alpha(L.accent, 0.32)} 0%, ${alpha(L.accent, 0)} 70%)`,
      }} />
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden', boxSizing: 'border-box',
          padding: '0 40px', display: 'flex', alignItems: 'center', gap: 34,
          background: `linear-gradient(180deg, ${mixHex('#1a2440', '#1d2b55', lit)} 0%, ${mixHex(L.surface, '#141d3a', lit)} 100%)`,
          border: `1px solid ${L.line}`,
          boxShadow:
            `inset 0 1px 0 ${alpha('#ffffff', 0.05 + 0.1 * lit)}, 0 0 0 ${(2 * lit).toFixed(2)}px ${alpha(L.accent, 0.95 * lit)}, ` +
            `0 ${(10 + 30 * s).toFixed(1)}px ${(24 + 50 * s).toFixed(1)}px -12px ${alpha(L.shadow, 0.95)}`,
        }}
      >
        <div style={{ width: 132, flexShrink: 0 }}>
          <div style={{
            display: 'inline-block', padding: '8px 16px', borderRadius: 12, fontFamily: FONT.mono, fontSize: 32, fontWeight: 700,
            color: mixHex(L.ink3, L.onAccent, lit), background: alpha(L.accent, lit),
          }}>
            v4.0
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...type(64, 750), color: L.ink, whiteSpace: 'nowrap' }}>Live Canvas</div>
          <div style={{ ...type(32, 400), color: L.ink2, marginTop: 14, whiteSpace: 'nowrap' }}>
            {frame < LIFT + 6 ? (
              <span style={{ opacity: 0 }}>Draw, comment and ship together — in real time.</span>
            ) : (
              <TextReveal text="Draw, comment and ship together — in real time." by="word" variant="blur" start={LIFT + 6} each={14} gap={2} />
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14, flexShrink: 0 }}>
          <div style={{
            ...type(24, 750, { caps: true }), letterSpacing: '0.14em', padding: '10px 18px', borderRadius: 999,
            background: L.accent, color: L.onAccent, opacity: Math.min(1, badge * 1.5),
            transform: `scale(${(0.6 + 0.4 * badge).toFixed(4)})`, transformOrigin: '100% 50%',
          }}>
            Launch
          </div>
          <div style={{ ...type(30, 500), color: L.ink2 }}>Oct 02</div>
        </div>
        <Sheen progress={sheen} color="#d6e2ff" strength={0.75} width={0.16} />
      </div>
    </div>
  );
};

// 两个 hex 之间插值 → hex（给描边/底色随点亮渐变）
const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

// 列表上下渐隐
const LIST_MASK = 'linear-gradient(180deg, transparent 90px, #000 220px, #000 860px, transparent 1030px)';

export const ChangelogScrollBrake: React.FC = () => {
  const frame = useCurrentFrame();
  const T = scrollAt(frame);
  const v = scrollAt(frame + 0.5) - scrollAt(frame - 0.5); // px/f，向上为负
  const speed = Math.abs(v);
  const lit = ramp(frame, LIFT, 10, EASE.out);
  const push = 1 + 0.02 * ramp(frame, 90, 60, EASE.smooth);

  // 左栏读数：读线上那条的日期；高速段按速度纵向糊
  const cur = rowAtLine(T);
  const readout = frame >= SCROLL1 ? 'Today' : dateOf(Math.min(cur, TARGET - 1));
  const roBlur = Math.min(14, speed * 0.05);
  const land = frame < SCROLL1 ? 0 : springAt(frame, SCROLL1, { damping: 16, stiffness: 220 });
  const headIn = ramp(frame, 0, 16, EASE.snappy);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans, background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.66, y: 0.5 }} fill={{ x: 0.08, y: 0.95 }} intensity={0.8 + 0.25 * lit} breathe={0.4}>
        <Dust look={L} count={26} seed={4} drift={0.15} opacity={0.35} />
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '62% 50%' }}>
        {/* 读线：固定在画面正中，左缘刻度标记；急刹后点亮 */}
        <div style={{
          position: 'absolute', left: LIST_X - 64, top: READ_Y - 1, width: 40, height: 2, borderRadius: 1,
          background: mixHex('#3a4664', L.accent, lit), boxShadow: lit > 0 ? `0 0 ${(16 * lit).toFixed(1)}px ${alpha(L.accent, 0.8 * lit)}` : 'none',
        }} />
        {Array.from({ length: 13 }, (_, k) => (
          <div key={k} style={{
            position: 'absolute', left: LIST_X - 44, top: READ_Y - 1 + (k - 6) * 32, width: k === 6 ? 0 : 14, height: 2,
            background: alpha(L.ink3, 0.5 - Math.abs(k - 6) * 0.07),
          }} />
        ))}

        {/* 长卷：整体上掠，速度段纵向模糊 */}
        <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: LIST_MASK, maskImage: LIST_MASK }}>
          <SpeedBlur vx={0} vy={v} amount={0.1} max={26}>
            <div style={{ position: 'absolute', left: LIST_X, top: 0, width: LIST_W, transform: `translateY(${T.toFixed(2)}px)` }}>
              {Array.from({ length: N }, (_, i) => (i === TARGET ? null : <Row key={i} i={i} frame={frame} />))}
              <HeroRow frame={frame} />
            </div>
          </SpeedBlur>
        </div>

        {/* 左栏：品牌 + 标题 + 日期读数 */}
        <div style={{ position: 'absolute', left: 120, top: 150, width: 460, opacity: headIn, transform: `translateY(${((1 - headIn) * 18).toFixed(2)}px)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${L.accent2}, ${L.accent})`, boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.35)}` }} />
            <div style={{ ...type(32, 700), color: L.ink }}>Quarry</div>
          </div>
          <div style={{ ...type(96, 800), color: L.ink, marginTop: 40 }}>Changelog</div>
          <div style={{ ...type(34, 450), color: L.ink2, marginTop: 18 }}>212 releases in 2026</div>
        </div>

        <div style={{ position: 'absolute', left: 120, top: READ_Y - 92, width: 480 }}>
          <div style={{ ...type(24, 650, { caps: true }), letterSpacing: '0.16em', color: L.ink3 }}>Shipped</div>
          <div style={{
            ...type(120, 800), marginTop: 10, whiteSpace: 'nowrap',
            color: frame >= SCROLL1 ? L.accent : L.ink,
            filter: roBlur > 0.4 ? `blur(${roBlur.toFixed(1)}px)` : undefined,
            transform: `translateY(${(frame >= SCROLL1 ? (1 - land) * 26 : 0).toFixed(2)}px)`,
            textShadow: frame >= SCROLL1 ? `0 0 40px ${alpha(L.accent, 0.45 * lit)}` : undefined,
          }}>
            {readout}
          </div>
          <div style={{ ...type(32, 450), color: L.ink2, marginTop: 14, opacity: ramp(frame, SCROLL1 + 8, 14, EASE.out) }}>
            Oct 2, 2026 · v4.0
          </div>
        </div>
      </div>
    </div>
  );
};
