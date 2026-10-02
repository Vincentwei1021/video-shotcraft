// 组合：长卷急刹 × 准星咬合（brake-reticle-lock）
//
// 第二轮重设计（暖沙纸面 · 对焦框咬合）：
// - look = sand（米色 · 赤陶）。一份亮场的「Release notes」长卷：每条是一张奶白卡（左侧 56px 粗黑版本号 +
//   标题 + 一句说明 + 日期），从下往上高速掠过；急刹停在 5.0「Inbox Autopilot」那一张上。
// - 组合命门不变：急刹帧 BRAKE=58 同帧四个赤陶 L 角（10px 粗、84px 长、圆头）从画外四角飞入，
//   back-out 超调咬合在卡片四角外 14px —— 像相机对焦框"咔"地锁住；同帧整幅做一记 1.6% 的冲击推（impact，
//   非抖动）。被锁住的卡 6f 内由奶白翻成墨色（反白是最强的"选中"），其余卡退暗 0.38 + 轻虚化。
// - 角标咬合后卡片右侧的「● Today」原地换成一枚赤陶「NOW SHIPPING」页签（back(2.6) 弹出），说明逐词浮现。
//
// 时间表（30fps，共 150f）：
//   0–12    静置：长卷停在年初，页眉就位
//   12–48   加速冲刺（sin-in，越滚越快）；纵向方向性模糊按速度拉成色带
//   48–58   猛减速冲过头 34px（cubic-out）
//   58      急刹帧 = 角标起跳帧 = 冲击推（严格同帧）
//   58–64   回弹落定；角标 9f back-out 咬合；卡片 6f 反白
//   62–90   页签弹出、其余卡退暗、说明逐词浮现
//   90–150  hold：角标极缓呼吸（±1.5px 外扩）、整幅 1.5% 极缓推近
import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

const SCROLL_START = 12;
const BRAKE = 58;
const DUR = 150;
export const BRAKE_RETICLE_LOCK_DURATION = DUR;

const L = LOOKS.sand;

const ROW_H = 132;
const PITCH = 164; // 行高 132 + 间距 32
const TARGET_ROW = 30;
const ROW_TOP = 474; // 停点卡 top（卡中线 = 540，画面正中）
const FINAL_SCROLL = TARGET_ROW * PITCH - ROW_TOP;
const LIST_W = 1180;
const LIST_X = (1920 - LIST_W) / 2;
const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 滚动位置：12–48 加速冲刺 → 48–58 猛减速冲过头 34px → 58–64 回弹落定（58 = 急刹帧，首次反向）
const scrollAt = (f: number): number => {
  if (f <= SCROLL_START) return 0;
  if (f <= 48) return interpolate(f, [SCROLL_START, 48], [0, FINAL_SCROLL - 520], { easing: Easing.in(Easing.sin), ...CL });
  if (f <= BRAKE) return interpolate(f, [48, BRAKE], [FINAL_SCROLL - 520, FINAL_SCROLL + 34], { easing: Easing.out(Easing.cubic), ...CL });
  return interpolate(f, [BRAKE, BRAKE + 6], [FINAL_SCROLL + 34, FINAL_SCROLL], { easing: EASE.swift, ...CL });
};

// ── 假内容：时间自上而下递增的发布记录，第 30 张 = 5.0 ──
const TITLES = [
  'Snooze with natural language', 'Faster search across folders', 'Read receipts, opt-in', 'Shared drafts',
  'Calendar holds from email', 'Bulk unsubscribe', 'Split inbox by sender', 'Offline mode on iPad',
  'Smart reminders', 'Send later, by time zone', 'Attachment previews', 'Keyboard shortcut sheet',
  'Signatures per alias', 'Thread summaries', 'Undo send, 30 seconds', 'Pinned conversations',
  'Quiet hours', 'Faster cold start', 'Label colors', 'Rules from any message', 'Inline translations',
  'Contact cards', 'Team inboxes', 'Follow-up nudges', 'Dark mode refresh', 'Unified search filters',
  'Large file links', 'Delegated access', 'Focus filters', 'Scheduled digests', 'Inbox Autopilot',
  'Voice replies', 'Shared labels', 'Desktop widgets', 'Encrypted vaults', 'Read-later queue', 'Mail merge',
  'Custom swipe actions',
];
const DESCS = ['Rolled out to every account.', 'Twice as fast on large inboxes.', 'Now on web, desktop and mobile.', 'Included in every plan.'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const TINT = ['#c4552d', '#3d5a80', '#8a7a64'];

const Row: React.FC<{ i: number; dim: number }> = ({ i, dim }) => {
  const later = i > TARGET_ROW;
  return (
    <div
      style={{
        position: 'absolute', top: i * PITCH, left: 0, width: LIST_W, height: ROW_H, boxSizing: 'border-box',
        borderRadius: 22, padding: '0 44px', display: 'flex', alignItems: 'center', gap: 40,
        background: later ? alpha(L.surface, 0.45) : L.surface,
        border: later ? `2px dashed ${alpha(L.ink3, 0.5)}` : `1px solid ${L.line}`,
        boxShadow: later ? 'none' : `inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px ${alpha(L.shadow, 0.1)}, 0 14px 30px -18px ${alpha(L.shadow, 0.35)}`,
        opacity: 1 - 0.62 * dim,
        filter: dim > 0.02 ? `blur(${(1.4 * dim).toFixed(2)}px)` : undefined,
      }}
    >
      <div style={{ width: 128, flexShrink: 0, ...type(56, 850), color: later ? L.ink3 : L.ink }}>
        {later ? '—' : `4.${String(i + 12)}`}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...type(40, 650), color: later ? L.ink3 : L.ink, whiteSpace: 'nowrap' }}>{TITLES[i % TITLES.length]}</div>
        <div style={{ ...type(30, 400), color: L.ink2, marginTop: 8, whiteSpace: 'nowrap' }}>{later ? 'Planned for winter.' : DESCS[i % DESCS.length]}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ width: 12, height: 12, borderRadius: 3, background: later ? 'transparent' : TINT[(i * 7) % 3], border: later ? `2px solid ${L.ink3}` : 'none' }} />
        <div style={{ ...type(30, 500), color: L.ink3, width: 104, textAlign: 'right' }}>
          {later ? 'Soon' : `${MONTHS[Math.floor((i / TARGET_ROW) * 9)]} ${1 + ((i * 11) % 27)}`}
        </div>
      </div>
    </div>
  );
};

// 主角卡：5.0 Inbox Autopilot —— 急刹帧起 6f 内由奶白翻成墨色
const HeroRow: React.FC<{ inv: number; frame: number }> = ({ inv, frame }) => {
  const c = (a: string, b: string) => mixHex(a, b, inv);
  const tagT = interpolate(frame, [BRAKE + 6, BRAKE + 15], [0, 1], { ...CL, easing: Easing.out(Easing.back(2.6)) });
  const tagOp = interpolate(frame, [BRAKE + 6, BRAKE + 9], [0, 1], CL);
  return (
    <div
      style={{
        position: 'absolute', top: TARGET_ROW * PITCH, left: 0, width: LIST_W, height: ROW_H, boxSizing: 'border-box',
        borderRadius: 22, padding: '0 44px', display: 'flex', alignItems: 'center', gap: 40, zIndex: 2,
        background: `linear-gradient(180deg, ${c(L.surface, '#2d241a')} 0%, ${c(L.surface, '#1d160f')} 100%)`,
        border: `1px solid ${inv > 0.5 ? 'rgba(255,240,220,0.12)' : L.line}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,${(0.9 - 0.8 * inv).toFixed(2)}), 0 2px 4px ${alpha(L.shadow, 0.12 + 0.1 * inv)}, 0 ${(14 + 22 * inv).toFixed(1)}px ${(30 + 40 * inv).toFixed(1)}px -16px ${alpha(L.shadow, 0.35 + 0.35 * inv)}`,
      }}
    >
      <div style={{ width: 128, flexShrink: 0, ...type(56, 850), color: c(L.ink, L.accent) }}>5.0</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...type(44, 750), color: c(L.ink, '#fff8f0'), whiteSpace: 'nowrap' }}>Inbox Autopilot</div>
        <div style={{ ...type(30, 400), color: c(L.ink2, '#cdbba6'), marginTop: 8, whiteSpace: 'nowrap' }}>
          {frame < BRAKE + 10 ? (
            <span style={{ opacity: 1 - inv }}>Your inbox, triaged before you wake up.</span>
          ) : (
            <TextReveal text="Your inbox, triaged before you wake up." by="word" variant="blur" start={BRAKE + 10} each={12} gap={2.2} />
          )}
        </div>
      </div>
      {/* 右侧：滚动中是「● Today」，咬合后原地弹出 NOW SHIPPING 页签（back 2.6） */}
      <div style={{ position: 'relative', width: 300, height: 56, flexShrink: 0 }}>
        <div style={{ position: 'absolute', right: 0, top: 0, height: 56, display: 'flex', alignItems: 'center', gap: 16, opacity: 1 - interpolate(frame, [BRAKE + 2, BRAKE + 6], [0, 1], CL) }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent }} />
          <div style={{ ...type(30, 600), color: c(L.ink3, '#fff8f0') }}>Today</div>
        </div>
        {tagOp > 0 && (
          <div style={{
            position: 'absolute', right: 0, top: 0, height: 56, padding: '0 24px 0 22px', borderRadius: 14,
            display: 'flex', alignItems: 'center', gap: 14, background: L.accent, color: L.onAccent,
            boxShadow: `0 10px 24px -10px ${alpha(L.accent, 0.8)}, inset 0 1px 0 rgba(255,255,255,0.25)`,
            opacity: tagOp, transform: `scale(${(0.55 + 0.45 * tagT).toFixed(4)})`, transformOrigin: '100% 50%',
            ...type(26, 750, { caps: true }), letterSpacing: '0.14em', whiteSpace: 'nowrap',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: L.onAccent, opacity: 0.6 + 0.4 * Math.sin(frame / 5) }} />
            Now shipping
          </div>
        )}
      </div>
    </div>
  );
};

const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

// L 形角标：两条圆头赤陶粗边组成的直角（flip 决定朝向）
const ARM = 84;
const THICK = 10;
const Corner: React.FC<{ flip: [number, number]; style: React.CSSProperties }> = ({ flip, style }) => (
  <div style={{ position: 'absolute', width: ARM, height: ARM, transform: `scale(${flip[0]}, ${flip[1]})`, ...style }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: ARM, height: THICK, background: L.accent, borderRadius: THICK / 2 }} />
    <div style={{ position: 'absolute', left: 0, top: 0, width: THICK, height: ARM, background: L.accent, borderRadius: THICK / 2 }} />
  </div>
);

// 角标咬合进度（back-out 超调，9f）
const lockAt = (f: number) => interpolate(f, [BRAKE, BRAKE + 9], [0, 1], { ...CL, easing: Easing.out(Easing.back(2.4)) });

const LIST_MASK = 'linear-gradient(180deg, transparent 120px, #000 230px, #000 900px, transparent 1040px)';

export const BrakeReticleLock: React.FC = () => {
  const f = useCurrentFrame();
  const scroll = scrollAt(f);
  const v = scroll - scrollAt(Math.max(0, f - 1)); // px/f，冲刺段拉成色带，刹停即清晰

  const inv = interpolate(f, [BRAKE, BRAKE + 6], [0, 1], { ...CL, easing: EASE.out });
  const dim = interpolate(f, [BRAKE + 2, BRAKE + 16], [0, 1], { ...CL, easing: Easing.out(Easing.cubic) });

  // 冲击推：急刹帧整幅 +1.6%，8f 内回落；之后 1.5% 极缓推近
  const kick = f < BRAKE ? 0 : Math.exp(-(f - BRAKE) / 4) * 0.016;
  const push = 1 + kick + 0.015 * ramp(f, 90, 60, EASE.smooth);

  // 停点卡屏幕矩形 + 角标咬合位（外扩 14px；hold 段极缓呼吸）
  const rowTopAt = (fr: number) => TARGET_ROW * PITCH - scrollAt(fr);
  const breathe = f > BRAKE + 30 ? 1.5 * Math.sin((f - BRAKE - 30) / 9) : 0;
  const PAD = 14 + breathe;
  const rect = (fr: number) => ({ x: LIST_X - PAD, y: rowTopAt(fr) - PAD, w: LIST_W + PAD * 2, h: ROW_H + PAD * 2 });

  const corners: Array<{ ax: 0 | 1; ay: 0 | 1; fromX: number; fromY: number; flip: [number, number] }> = [
    { ax: 0, ay: 0, fromX: -620, fromY: -320, flip: [1, 1] },
    { ax: 1, ay: 0, fromX: 620, fromY: -320, flip: [-1, 1] },
    { ax: 0, ay: 1, fromX: -620, fromY: 320, flip: [1, -1] },
    { ax: 1, ay: 1, fromX: 620, fromY: 320, flip: [-1, -1] },
  ];
  const cornerPos = (c: (typeof corners)[number], fr: number) => {
    const r = rect(fr);
    const fly0 = 1 - lockAt(fr); // 1=画外 0=咬合
    const fly = fly0 < 0 ? fly0 * 0.12 : fly0; // back 超调越过咬合位时只往里"咬"一小口（≤ 12px），不压进卡片
    return {
      x: r.x + c.ax * r.w - (c.ax ? ARM : 0) + c.fromX * fly,
      y: r.y + c.ay * r.h - (c.ay ? ARM : 0) + c.fromY * fly,
    };
  };

  const headIn = ramp(f, 0, 14, EASE.snappy);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans, background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.42 }} fill={{ x: 0.9, y: 0.9 }} />

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 50%' }}>
        {/* 长卷：整体上掠，速度段纵向模糊 */}
        <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: LIST_MASK, maskImage: LIST_MASK }}>
          <SpeedBlur vx={0} vy={v} amount={0.13} max={32}>
            <div style={{ position: 'absolute', left: LIST_X, top: 0, width: LIST_W, height: 1080 }}>
              <div style={{ position: 'absolute', top: -scroll, left: 0, width: LIST_W }}>
                {Array.from({ length: 38 }, (_, i) =>
                  i === TARGET_ROW ? <HeroRow key={i} inv={inv} frame={f} /> : <Row key={i} i={i} dim={dim} />,
                )}
              </div>
            </div>
          </SpeedBlur>
        </div>

        {/* 准星角标：急刹帧同帧挂载（组合命门）；飞入段方向性运动模糊 */}
        {f >= BRAKE &&
          corners.map((c, i) => {
            const p = cornerPos(c, f);
            const q = cornerPos(c, f - 1);
            return (
              <SpeedBlur key={i} vx={p.x - q.x} vy={p.y - q.y} amount={0.12} max={22}>
                <Corner flip={c.flip} style={{ left: p.x, top: p.y, opacity: Math.min(1, lockAt(f) * 3 + 0.4), filter: `drop-shadow(0 6px 10px ${alpha(L.accent, 0.3)})` }} />
              </SpeedBlur>
            );
          })}

      </div>

      {/* 页眉（不随滚动，不随推近） */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 120, padding: '0 120px', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 20, opacity: headIn,
        background: `linear-gradient(180deg, ${L.bg[0]} 55%, ${alpha(L.bg[0], 0)} 100%)`,
      }}>
        <svg width={40} height={40} viewBox="0 0 40 40">
          <circle cx={20} cy={20} r={18} fill={L.ink} />
          <path d="M10 16 L15 27 L20 18 L25 27 L30 16" stroke={L.bg[0]} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ ...type(34, 750), color: L.ink }}>Wren</div>
        <div style={{ ...type(34, 400), color: L.ink3 }}>/</div>
        <div style={{ ...type(34, 500), color: L.ink2 }}>Release notes</div>
        <div style={{ marginLeft: 'auto', ...type(32, 500), color: L.ink3 }}>2026</div>
      </div>
    </div>
  );
};
