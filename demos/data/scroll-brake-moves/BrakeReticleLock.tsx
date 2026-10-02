// 组合：长卷急刹 × 准星咬合（brake-reticle-lock）
// changelog 长列表从下往上高速掠过（加速冲刺→9f 猛减速带 30px 超调回弹），
// 急刹帧（BRAKE=59）同帧四个 L 形角标从画外四个方向飞入，back-out 超调咬合
// 锁定停点条目四角；条目同步高亮 + 右侧弹出小标签。
// 组合命门：角标咬合帧与列表急刹帧必须同帧共振（都在 f=59 起跳），错开即退化。
// 关键帧：0–12 初始静置 → 12–50 加速冲刺（速度段 blur）→ 50–59 猛减速超调 →
// 59 急刹+角标飞入 → 59–72 咬合回弹/高亮/标签 → 75–150 真静止 75f。
// 帧确定，无随机源。
//
// 质感升级：灰骨架行换成真实感 changelog（类型图标 / 标题 / 说明 / 版本 / 日期，时间自上而下递增），
// 停点 v2.41 出版级内容；顶栏骨架换成真实应用顶栏；各向同性 blur 换成沿滚动方向的纵向 SpeedBlur；
// 角标从 8px 墨色粗角换成 6px 强调色圆头 L 角，飞入段按自身速度给方向性运动模糊；停点行加强调色描边 +
// 抬升阴影，其余行退暗 0.38；标签 0.6→1 弹出并带脉冲点；柔光亮场 + 上下渐隐 + 颗粒。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, FONT, Grain, SpeedBlur, innerHighlight, softShadow, tracking } from '../../_fixtures/Polish';

const SCROLL_START = 12;
const BRAKE = 59;
const DUR = 150;
export const BRAKE_RETICLE_LOCK_DURATION = DUR;

const PITCH = 156; // 行高 120 + 间距 36
const ROW_H = 120;
const TARGET_ROW = 30;
const FINAL_SCROLL = TARGET_ROW * PITCH - 480; // 停点条目 top 落在屏幕 y=480
const LIST_X = 360;
const LIST_W = 1200;

// 滚动位置：12–50 加速冲刺（sin-in，越滚越快）→ 50–59 猛减速冲过头 30px →
// 59–63 回弹落定。59 帧为急刹帧（首次停住/反向）。
const scrollAt = (f: number): number => {
  if (f <= SCROLL_START) return 0;
  if (f <= 50) {
    return interpolate(f, [SCROLL_START, 50], [0, FINAL_SCROLL - 430], {
      easing: Easing.in(Easing.sin),
    });
  }
  if (f <= BRAKE) {
    return interpolate(f, [50, BRAKE], [FINAL_SCROLL - 430, FINAL_SCROLL + 30], {
      easing: Easing.out(Easing.cubic),
    });
  }
  return interpolate(f, [BRAKE, BRAKE + 4], [FINAL_SCROLL + 30, FINAL_SCROLL], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
};

// ── 假内容：时间自上而下递增的发布记录，第 30 行 = v2.41 ──
const TITLES = [
  'Keyboard shortcuts for every view', 'Faster search indexing', 'Duplicate notifications', 'Custom fields on issues',
  'Dark mode for the editor', 'Bulk edit in table view', 'Timezone drift in cycles', 'Slack thread sync', 'Saved filters',
  'GitHub PR linking', 'Improved import from Jira', 'Drag handle on Safari', 'Project templates', 'Inline image resize',
  'Audit log export', 'Sub-issue progress bars', 'Stale cache on reconnect', 'Roadmap zoom levels', 'SAML single sign-on',
  'Markdown tables', 'Faster cold start', 'Emoji picker focus', 'Triage inbox', 'Webhooks v2', 'Granular permissions',
  'Offline drafts', 'Cursor jump on paste', 'Calendar view', 'Workspace analytics', 'Command menu search',
  'Realtime collaboration', 'Public API v3', 'Mobile offline mode', 'AI triage suggestions', 'Custom dashboards',
  'Data residency (EU)', 'Guest access', 'Time tracking',
];
const DESCS = [
  'Rolled out to all workspaces.', 'Now 3× faster on large teams.', 'Fixed for desktop and web.', 'Available on every plan.',
];
// 类型：图标色 + 字形
const KIND = [
  { name: 'Feature', tint: 'rgba(91,99,211,0.12)', ink: '#4a51b8', glyph: '✦' },
  { name: 'Improved', tint: 'rgba(22,150,110,0.12)', ink: '#137a5a', glyph: '↗' },
  { name: 'Fix', tint: 'rgba(20,22,28,0.06)', ink: '#5d5f66', glyph: '✓' },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

const Row: React.FC<{ i: number; highlight: number; dim: number }> = ({ i, highlight, dim }) => {
  const isTarget = i === TARGET_ROW;
  const k = KIND[isTarget ? 0 : (i * 7) % 3];
  const later = i > TARGET_ROW;
  return (
    <div
      style={{
        position: 'absolute',
        top: i * PITCH,
        left: 0,
        width: LIST_W,
        height: ROW_H,
        background: '#ffffff',
        border: `1px solid ${G.hairline}`,
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 26,
        padding: '0 32px',
        boxSizing: 'border-box',
        boxShadow:
          `${innerHighlight(0.9)}, ${softShadow(3 + 20 * highlight, { strength: 1 + 0.6 * highlight })}` +
          (highlight > 0 ? `, 0 0 0 ${(2 * highlight).toFixed(2)}px rgba(91,99,211,${(0.85 * highlight).toFixed(3)})` : ''),
        opacity: 1 - 0.62 * dim,
        fontFamily: FONT.sans,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          flexShrink: 0,
          borderRadius: 14,
          background: isTarget ? `linear-gradient(180deg, #7178e6, ${G.accent})` : k.tint,
          color: isTarget ? '#fff' : k.ink,
          display: 'grid',
          placeItems: 'center',
          fontSize: 26,
          fontWeight: 700,
          boxShadow: isTarget ? 'inset 0 1px 0 rgba(255,255,255,0.35)' : 'none',
        }}
      >
        {k.glyph}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isTarget ? 36 : 30, fontWeight: isTarget ? 700 : 600, color: later ? G.ink3 : G.ink1, letterSpacing: tracking(30), whiteSpace: 'nowrap' }}>
          {TITLES[i % TITLES.length]}
        </div>
        <div style={{ marginTop: 6, fontSize: 24, color: G.ink2, whiteSpace: 'nowrap' }}>
          {isTarget ? 'Live cursors and presence in every doc.' : later ? 'Planned for Q4.' : DESCS[i % DESCS.length]}
        </div>
      </div>
      <div style={{ flexShrink: 0, fontFamily: FONT.mono, fontSize: 22, color: G.ink3, fontVariantNumeric: 'tabular-nums' }}>
        {later ? '—' : `v2.${11 + i}`}
      </div>
      <div style={{ flexShrink: 0, width: 96, textAlign: 'right', fontSize: 22, color: G.ink3, fontVariantNumeric: 'tabular-nums' }}>
        {isTarget ? 'Today' : later ? 'Q4' : `${MONTHS[Math.floor((i / TARGET_ROW) * 9)]} ${1 + ((i * 11) % 27)}`}
      </div>
    </div>
  );
};

// L 形角标：两条圆头强调色边组成的直角
const Corner: React.FC<{ flip: [number, number]; style: React.CSSProperties }> = ({ flip, style }) => (
  <div style={{ position: 'absolute', width: 46, height: 46, transform: `scale(${flip[0]}, ${flip[1]})`, ...style }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 46, height: 6, background: G.accent, borderRadius: 3 }} />
    <div style={{ position: 'absolute', left: 0, top: 0, width: 6, height: 46, background: G.accent, borderRadius: 3 }} />
  </div>
);

// 角标咬合进度（back-out 超调）
const lockAt = (f: number) =>
  interpolate(f, [BRAKE, BRAKE + 9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(2.4)),
  });

// 列表上下渐隐（顶栏下方 / 画面底部）
const LIST_MASK = 'linear-gradient(180deg, transparent 72px, #000 170px, #000 960px, transparent 1080px)';

export const BrakeReticleLock: React.FC = () => {
  const f = useCurrentFrame();
  const scroll = scrollAt(f);

  // 速度段纵向模糊：由相邻帧位移决定（px/f），冲刺段拉成色带，刹停即清晰
  const v = scroll - scrollAt(Math.max(0, f - 1));

  // 急刹帧起：高亮 0→1（6f），其余行退暗（12f）
  const highlight = interpolate(f, [BRAKE, BRAKE + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dim = interpolate(f, [BRAKE + 2, BRAKE + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // 停点条目屏幕坐标（落定后 top=480）
  const rowTopAt = (fr: number) => TARGET_ROW * PITCH - scrollAt(fr);
  const GAP = 10; // 咬合位：角外扩 10px
  const rect = (fr: number) => ({ x: LIST_X - GAP, y: rowTopAt(fr) - GAP, w: LIST_W + GAP * 2, h: ROW_H + GAP * 2 });

  const corners: Array<{ ax: 0 | 1; ay: 0 | 1; fromX: number; fromY: number; flip: [number, number] }> = [
    { ax: 0, ay: 0, fromX: -620, fromY: -320, flip: [1, 1] },
    { ax: 1, ay: 0, fromX: 620, fromY: -320, flip: [-1, 1] },
    { ax: 0, ay: 1, fromX: -620, fromY: 320, flip: [1, -1] },
    { ax: 1, ay: 1, fromX: 620, fromY: 320, flip: [-1, -1] },
  ];
  const cornerPos = (c: (typeof corners)[number], fr: number) => {
    const r = rect(fr);
    const fly = 1 - lockAt(fr); // 1=画外 0=咬合到位
    return { x: r.x + c.ax * r.w - 23 + c.fromX * fly, y: r.y + c.ay * r.h - 23 + c.fromY * fly };
  };

  // 小标签：63f 从条目右侧弹出（超调）
  const tagT = interpolate(f, [BRAKE + 4, BRAKE + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(2.6)),
  });
  const tagOp = interpolate(f, [BRAKE + 4, BRAKE + 7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const r = rect(f);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.25 }} vignette={0.16} grain={0} />

      {/* changelog 长列表：整体上掠，速度段纵向模糊 */}
      <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: LIST_MASK, maskImage: LIST_MASK }}>
        <SpeedBlur vx={0} vy={v} amount={0.15} max={32}>
          <div style={{ position: 'absolute', left: LIST_X, top: 0, width: LIST_W, height: 1080 }}>
            <div style={{ position: 'absolute', top: -scroll, left: 0, width: LIST_W, height: 40 * PITCH }}>
              {Array.from({ length: 38 }).map((_, i) => (
                <Row key={i} i={i} highlight={i === TARGET_ROW ? highlight : 0} dim={i === TARGET_ROW ? 0 : dim} />
              ))}
            </div>
          </div>
        </SpeedBlur>
      </div>

      {/* 顶栏（不随滚动） */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 72,
          background: 'rgba(250,250,249,0.92)',
          borderBottom: `1px solid ${G.hairline}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          gap: 16,
          boxSizing: 'border-box',
          zIndex: 3,
        }}
      >
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, #7178e6, ${G.accent})` }} />
        <div style={{ fontSize: 24, fontWeight: 700, color: G.ink1, letterSpacing: tracking(24) }}>Acme</div>
        <div style={{ fontSize: 24, color: G.ink3 }}>/</div>
        <div style={{ fontSize: 24, fontWeight: 550, color: G.ink2 }}>Changelog</div>
        <div
          style={{
            marginLeft: 'auto',
            width: 38,
            height: 38,
            borderRadius: 19,
            background: '#e4e5ea',
            color: G.ink2,
            fontSize: 15,
            fontWeight: 700,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          JL
        </div>
      </div>

      {/* 准星角标：急刹帧同帧挂载（组合命门：与刹停同帧共振）；飞入段方向性运动模糊 */}
      {f >= BRAKE &&
        corners.map((c, i) => {
          const p = cornerPos(c, f);
          const q = cornerPos(c, f - 1);
          return (
            <SpeedBlur key={i} vx={p.x - q.x} vy={p.y - q.y} amount={0.1} max={18}>
              <Corner
                flip={c.flip}
                style={{ left: p.x, top: p.y, opacity: Math.min(1, lockAt(f) * 3 + 0.35) }}
              />
            </SpeedBlur>
          );
        })}

      {/* 旁弹小标签 */}
      {f >= BRAKE + 4 && (
        <div
          style={{
            position: 'absolute',
            left: r.x + r.w + 28,
            top: r.y + r.h / 2 - 28,
            height: 56,
            transform: `scale(${(0.6 + 0.4 * tagT).toFixed(4)})`,
            transformOrigin: 'left center',
            opacity: tagOp,
            padding: '0 24px 0 22px',
            borderRadius: 28,
            background: G.ink1,
            boxShadow: softShadow(12, { strength: 1.4 }),
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontWeight: 650,
            fontSize: 26,
            letterSpacing: tracking(26),
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: 5, background: '#67d17c', boxShadow: '0 0 0 4px rgba(103,209,124,0.22)' }} />
          Just shipped
        </div>
      )}
      <Grain opacity={0.05} />
    </div>
  );
};
