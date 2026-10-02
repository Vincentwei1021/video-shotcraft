// card-footage-cadence｜字卡穿插节奏
//
// 第二轮重设计（「克莱因蓝字卡 × 暗场日历」· custom look）：
// UI 镜头与字卡像对话一样接拍硬切——画面做一件事，字卡说一个词，再回到画面接着做。
// - UI 段：为镜头设计的暗场周视图日历「Plover」（虚构产品，不再用通用小字 dashboard）：
//   左栏月历 + 日历分组，主区周一到周五 × 9:00–17:00 网格，事件块带色条与时间；
//   三段裁切各讲一件事，全部走 CSS zoom 按目标尺寸栅格化（Q2，1.7x / 2.2x 下字边锐利）：
//     A 全景（ease-in 推近，光标驶向周二的 Design review）
//     B 1.7x 裁切：光标把 Design review 从周二 10:00 拖到周四 14:00（拾起 + 原位虚线残影）
//     C 2.2x 裁切：事件落位弹一下，「Everyone's free · invites sent」提示条弹出
// - 字卡段：满版克莱因蓝 + 瑞士网格排版——左对齐 280px 粗黑体单词（Plan. / Move. / Done.）、
//   左上页码 01—03、右上产品名、横贯发丝线；第三张反白（米白底 + 蓝字）做高潮变奏。
//   字卡只在前 5f 做 1.05→1 落定微缩，其余全静——字卡的"静"对 UI 段的"动"，质感对比即节奏。
// - 全部硬切（条件挂载，零过渡）。收尾全景：拖好的周视图 + 提示条，极缓推近后真静止。
//
// 时间表（30fps，共 165f）：
//   0–16    UI A 全景，推近 1→1.07（ease-in，越推越快撞进字卡）
//   16–26   字卡 01 Plan.
//   26–40   UI B 拖拽（26–38 拖动，ease-in-out）
//   40–50   字卡 02 Move.
//   50–62   UI C 落位弹跳 + 提示条
//   62–72   字卡 03 Done.（反白）
//   72–120  收尾全景，极缓推近 1→1.03（out-cubic）
//   120–165 真静止 45f
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, mix, ramp } from '../../_fixtures/Polish';
import { alpha, springAt, type } from '../../_fixtures/Look';

export const CARD_FOOTAGE_CADENCE_DURATION = 165;

// custom look：字卡克莱因蓝 + UI 暗场（带蓝色相的石墨）
const KLEIN = '#1f2fe0';
const CREAM = '#f3efe4';
const UI = {
  bg: '#0d0f15',
  side: '#0a0c11',
  line: 'rgba(170,185,255,0.10)',
  ink: '#eef0f7',
  ink2: '#a2a8ba',
  ink3: '#5c6275',
  blue: '#5470ff',
  violet: '#a083ff',
  amber: '#ffb74d',
  teal: '#35c9b0',
};

// ───────────── 周视图几何 ─────────────
const GX = 450; // 网格左缘（左侧是时间刻度）
const COL = (1880 - GX) / 5; // 288
const GY = 210; // 9:00 的 y
const ROW = 92; // 每小时
const slotX = (day: number) => GX + day * COL + 8;
const slotY = (h: number) => GY + (h - 9) * ROW + 4;

type Ev = { day: number; h: number; dur: number; title: string; time: string; color: string };
const EVENTS: Ev[] = [
  { day: 0, h: 9, dur: 0.75, title: 'Standup', time: '9:00', color: UI.teal },
  { day: 0, h: 11, dur: 2, title: 'Roadmap sync', time: '11:00 – 1:00', color: UI.violet },
  { day: 1, h: 14, dur: 1, title: '1:1 · Maya', time: '2:00 – 3:00', color: UI.amber },
  { day: 1, h: 9, dur: 0.75, title: 'Standup', time: '9:00', color: UI.teal },
  { day: 2, h: 9.5, dur: 3, title: 'Focus · Build', time: '9:30 – 12:30', color: UI.blue },
  { day: 2, h: 15, dur: 1, title: 'Hiring loop', time: '3:00 – 4:00', color: UI.violet },
  { day: 3, h: 9, dur: 0.75, title: 'Standup', time: '9:00', color: UI.teal },
  { day: 3, h: 11, dur: 1.5, title: 'Vendor call', time: '11:00 – 12:30', color: UI.amber },
  { day: 4, h: 9, dur: 0.75, title: 'Standup', time: '9:00', color: UI.teal },
  { day: 4, h: 13, dur: 2, title: 'Launch prep', time: '1:00 – 3:00', color: UI.amber },
];
// 被拖动的事件：周二 10:00 → 周四 14:00
const DRAG = { from: { day: 1, h: 10 }, to: { day: 3, h: 14 }, dur: 1.5, title: 'Design review', color: UI.blue };

const EventBlock: React.FC<{ x: number; y: number; dur: number; title: string; time: string; color: string; style?: React.CSSProperties }> = ({
  x, y, dur, title, time, color, style,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: COL - 16,
      height: dur * ROW - 8,
      borderRadius: 14,
      background: `linear-gradient(180deg, ${alpha(color, 0.24)} 0%, ${alpha(color, 0.16)} 100%), ${UI.bg}`, // 底下垫实色：网格线不透出
      boxShadow: `inset 4px 0 0 ${color}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      padding: '12px 16px 0 22px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      ...style,
    }}
  >
    <div style={{ ...type(25, 650), color: UI.ink, whiteSpace: 'nowrap' }}>{title}</div>
    {dur >= 1 && <div style={{ ...type(21, 500), color: alpha(UI.ink, 0.6), marginTop: 2, whiteSpace: 'nowrap' }}>{time}</div>}
  </div>
);

const Cursor: React.FC<{ x: number; y: number; grab?: boolean }> = ({ x, y, grab }) => (
  <svg width={44} height={52} viewBox="0 0 24 28" style={{ position: 'absolute', left: x, top: y, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.55))', transform: `scale(${grab ? 0.92 : 1})` }}>
    <path d="M2 2 L2 22 L7.5 17 L11 25 L14.5 23.5 L11 15.8 L18.5 15.8 Z" fill="#ffffff" stroke="#0b0d12" strokeWidth={1.3} strokeLinejoin="round" />
  </svg>
);

// 日历 App（1920×1080 布局；drag 0→1 拖动进度，land 落位弹簧，toast 提示条，cursor 光标位置）
const PloverApp: React.FC<{ drag: number; land: number; toast: number; cursor?: { x: number; y: number; grab?: boolean } | null }> = ({
  drag, land, toast, cursor,
}) => {
  const fx = slotX(DRAG.from.day), fy = slotY(DRAG.from.h);
  const tx = slotX(DRAG.to.day), ty = slotY(DRAG.to.h);
  const dx = mix(fx, tx, drag), dy = mix(fy, ty, drag);
  const lifting = drag > 0 && drag < 1;
  const lift = Math.sin(Math.PI * drag); // 拖动中抬起
  const bounce = land > 0 ? 1 + 0.06 * Math.sin(Math.PI * Math.min(1, land)) * (1 - Math.min(1, land)) : 1;
  return (
    <AbsoluteFill style={{ background: UI.bg, fontFamily: FONT.sans }}>
      {/* 左栏 */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 340, background: UI.side, borderRight: `1px solid ${UI.line}` }}>
        <div style={{ position: 'absolute', left: 48, top: 52, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: KLEIN, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' }} />
          <span style={{ ...type(34, 750), color: UI.ink }}>Plover</span>
        </div>
        <div style={{ position: 'absolute', left: 48, top: 150, ...type(24, 650), color: UI.ink2 }}>October</div>
        <div style={{ position: 'absolute', left: 48, top: 196, display: 'grid', gridTemplateColumns: 'repeat(7, 34px)', rowGap: 14, ...type(19, 500), color: UI.ink3 }}>
          {Array.from({ length: 35 }, (_, i) => {
            const d = i - 1;
            const wk = d >= 13 && d <= 17;
            return (
              <span key={i} style={{ textAlign: 'center', color: wk ? UI.ink : undefined, fontWeight: d === 14 ? 800 : undefined }}>
                {d >= 1 && d <= 31 ? d : ''}
              </span>
            );
          })}
        </div>
        <div style={{ position: 'absolute', left: 48, top: 420, ...type(22, 650, { caps: true }), letterSpacing: '0.14em', color: UI.ink3 }}>Calendars</div>
        {[
          ['Product', UI.blue],
          ['Team', UI.teal],
          ['Hiring', UI.violet],
          ['Partners', UI.amber],
        ].map(([n, c], i) => (
          <div key={n} style={{ position: 'absolute', left: 48, top: 470 + i * 56, display: 'flex', alignItems: 'center', gap: 16, ...type(28, 550), color: UI.ink2 }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, background: c }} />
            {n}
          </div>
        ))}
      </div>
      {/* 顶栏 */}
      <div style={{ position: 'absolute', left: 390, top: 46, display: 'flex', alignItems: 'baseline', gap: 22 }}>
        <span style={{ ...type(54, 750), color: UI.ink }}>Oct 14 – 18</span>
        <span style={{ ...type(24, 600, { mono: true }), color: UI.ink3 }}>WEEK 42</span>
      </div>
      <div style={{ position: 'absolute', right: 40, top: 48, display: 'flex', gap: 14 }}>
        <div style={{ padding: '12px 24px', borderRadius: 14, border: `1px solid ${UI.line}`, ...type(26, 600), color: UI.ink2 }}>Today</div>
        <div style={{ padding: '12px 24px', borderRadius: 14, background: KLEIN, ...type(26, 650), color: '#fff' }}>+ New event</div>
      </div>
      {/* 星期表头 */}
      {['Mon 14', 'Tue 15', 'Wed 16', 'Thu 17', 'Fri 18'].map((d, i) => (
        <div key={d} style={{ position: 'absolute', left: GX + i * COL + 12, top: 150, ...type(26, i === 0 ? 700 : 550), color: i === 0 ? UI.ink : UI.ink2 }}>
          {d}
        </div>
      ))}
      {/* 网格线与时间刻度 */}
      {Array.from({ length: 10 }, (_, i) => (
        <React.Fragment key={i}>
          <div style={{ position: 'absolute', left: GX, right: 40, top: GY + i * ROW, height: 1, background: UI.line }} />
          {i < 9 && (
            <div style={{ position: 'absolute', left: 370, top: GY + i * ROW - 12, ...type(21, 500, { mono: true }), color: UI.ink3 }}>
              {String(9 + i > 12 ? 9 + i - 12 : 9 + i).padStart(2, ' ')}
              {9 + i >= 12 ? 'p' : 'a'}
            </div>
          )}
        </React.Fragment>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: GX + i * COL, top: GY, width: 1, height: 9 * ROW, background: UI.line }} />
      ))}
      {/* 事件 */}
      {EVENTS.map((e, i) => (
        <EventBlock key={i} x={slotX(e.day)} y={slotY(e.h)} dur={e.dur} title={e.title} time={e.time} color={e.color} />
      ))}
      {/* 拖动中：原位虚线残影 + 目标格提示 */}
      {lifting && (
        <>
          <div style={{ position: 'absolute', left: fx, top: fy, width: COL - 16, height: DRAG.dur * ROW - 8, borderRadius: 14, border: `2px dashed ${alpha(UI.blue, 0.45)}`, boxSizing: 'border-box' }} />
          <div style={{ position: 'absolute', left: tx, top: ty, width: COL - 16, height: DRAG.dur * ROW - 8, borderRadius: 14, background: alpha(UI.blue, 0.08 * drag), boxSizing: 'border-box' }} />
        </>
      )}
      <EventBlock
        x={dx}
        y={dy}
        dur={DRAG.dur}
        title={DRAG.title}
        time={drag >= 1 ? 'Thu · 2:00 – 3:30' : 'Tue · 10:00 – 11:30'}
        color={DRAG.color}
        style={{
          background: `linear-gradient(180deg, ${alpha(UI.blue, 0.5)} 0%, ${alpha(UI.blue, 0.36)} 100%), ${UI.bg}`,
          transform: `scale(${((1 + 0.04 * lift) * bounce).toFixed(4)}) rotate(${(-1.5 * lift).toFixed(2)}deg)`,
          boxShadow: `inset 4px 0 0 ${UI.blue}, inset 0 1px 0 rgba(255,255,255,0.12), 0 ${(4 + 30 * lift).toFixed(0)}px ${(10 + 50 * lift).toFixed(0)}px -10px rgba(0,0,0,0.7)`,
          zIndex: 3,
        }}
      />
      {/* 提示条 */}
      {toast > 0.001 && (
        <div
          style={{
            position: 'absolute',
            left: tx - 20,
            top: ty + DRAG.dur * ROW + 10,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 24px',
            borderRadius: 18,
            background: '#f4f5fa',
            color: '#10131c',
            ...type(26, 650),
            whiteSpace: 'nowrap',
            boxShadow: '0 20px 40px -12px rgba(0,0,0,0.6)',
            transform: `translateY(${mix(18, 0, toast).toFixed(2)}px) scale(${mix(0.9, 1, toast).toFixed(4)})`,
            transformOrigin: '20% 0%',
            opacity: Math.min(1, toast * 1.4),
            zIndex: 4,
          }}
        >
          <span style={{ width: 30, height: 30, borderRadius: 15, background: '#22b07d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...type(18, 800) }}>✓</span>
          Everyone's free · invites sent
        </div>
      )}
      {cursor && <Cursor x={cursor.x} y={cursor.y} grab={cursor.grab} />}
    </AbsoluteFill>
  );
};

// UI 镜头：zoom 走 CSS zoom 并把对焦点推到屏幕中心；段内微动走外层 transform
const UiShot: React.FC<{ zoom?: number; cx?: number; cy?: number; transform?: string; children: React.ReactNode }> = ({
  zoom = 1, cx = 960, cy = 540, transform, children,
}) => (
  <AbsoluteFill style={{ overflow: 'hidden', background: UI.bg }}>
    <AbsoluteFill style={{ transform, transformOrigin: '50% 50%' }}>
      <div style={{ position: 'absolute', left: 960 / zoom - cx, top: 540 / zoom - cy, width: 1920, height: 1080, zoom }}>{children}</div>
    </AbsoluteFill>
    {/* 镜头暗角（静态） */}
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)' }} />
  </AbsoluteFill>
);

// 字卡：满版克莱因蓝（第三张反白），瑞士网格；前 5f 1.05→1 落定，其余全静
const TitleCard: React.FC<{ word: string; idx: number; local: number; invert?: boolean; note: string }> = ({ word, idx, local, invert, note }) => {
  const s = mix(1.05, 1, ramp(local, 0, 5, EASE.out));
  const bg = invert ? CREAM : KLEIN;
  const fg = invert ? KLEIN : CREAM;
  return (
    <AbsoluteFill style={{ background: bg, fontFamily: FONT.sans, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 30% 40%, ${alpha('#ffffff', invert ? 0.35 : 0.1)} 0%, rgba(255,255,255,0) 70%)` }} />
      <div style={{ position: 'absolute', left: 140, top: 110, ...type(26, 700, { mono: true }), letterSpacing: '0.2em', color: alpha(fg, 0.75) }}>
        0{idx} — 03
      </div>
      <div style={{ position: 'absolute', right: 140, top: 110, ...type(26, 700, { mono: true }), letterSpacing: '0.2em', color: alpha(fg, 0.75) }}>PLOVER</div>
      <div style={{ position: 'absolute', left: 140, right: 140, top: 780, height: 2, background: alpha(fg, 0.35) }} />
      <div style={{ position: 'absolute', left: 140, top: 812, ...type(36, 500), color: alpha(fg, 0.8) }}>{note}</div>
      <div
        style={{
          position: 'absolute',
          left: 128,
          top: 420,
          transform: `scale(${s.toFixed(4)})`,
          transformOrigin: '0% 100%',
          ...type(300, 820),
          letterSpacing: '-0.055em',
          lineHeight: 1,
          color: fg,
        }}
      >
        {word}
      </div>
      <Grain opacity={0.08} blend="overlay" />
    </AbsoluteFill>
  );
};

export const CardFootageCadence: React.FC = () => {
  const frame = useCurrentFrame();

  // 段1 0–16：UI A 全景推近（ease-in），光标驶向周二的 Design review
  if (frame < 16) {
    const s = mix(1, 1.07, ramp(frame, 0, 16, EASE.exit));
    const c = ramp(frame, 0, 16, EASE.swift);
    return (
      <UiShot transform={`scale(${s.toFixed(4)})`}>
        <PloverApp drag={0} land={0} toast={0} cursor={{ x: mix(1300, slotX(1) + 220, c), y: mix(820, slotY(10) + 96, c) }} />
      </UiShot>
    );
  }

  // 段2 16–26：字卡 Plan.
  if (frame < 26) return <TitleCard word="Plan." idx={1} local={frame - 16} note="Your whole week, on one screen." />;

  // 段3 26–40：UI B 1.7x 裁切，拖动 Design review（26–38），裁切窗口跟着轻移
  if (frame < 40) {
    const d = ramp(frame, 26, 12, EASE.smooth);
    const fx = slotX(DRAG.from.day), fy = slotY(DRAG.from.h);
    const tx = slotX(DRAG.to.day), ty = slotY(DRAG.to.h);
    const pan = mix(40, -40, ramp(frame, 26, 14, EASE.swift));
    return (
      <UiShot zoom={1.7} cx={1160} cy={500} transform={`translateX(${pan.toFixed(2)}px)`}>
        <PloverApp drag={d} land={0} toast={0} cursor={{ x: mix(fx, tx, d) + 220, y: mix(fy, ty, d) + 96, grab: d > 0 && d < 1 }} />
      </UiShot>
    );
  }

  // 段4 40–50：字卡 Move.
  if (frame < 50) return <TitleCard word="Move." idx={2} local={frame - 40} note="Drag it. Everyone else follows." />;

  // 段5 50–62：UI C 2.2x 裁切，落位弹一下 + 提示条弹出，缓推
  if (frame < 62) {
    const land = ramp(frame, 50, 8, EASE.linear);
    const toast = springAt(frame, 52, { damping: 15, stiffness: 220 });
    const s = mix(1, 1.05, ramp(frame, 50, 12, EASE.linear));
    return (
      <UiShot zoom={2.2} cx={slotX(3) + 170} cy={slotY(14) + 110} transform={`scale(${s.toFixed(4)})`}>
        <PloverApp drag={1} land={land} toast={toast} cursor={{ x: slotX(3) + 226, y: slotY(14) + 100 }} />
      </UiShot>
    );
  }

  // 段6 62–72：字卡 Done.（反白）
  if (frame < 72) return <TitleCard word="Done." idx={3} local={frame - 62} invert note="Rescheduled in one move." />;

  // 段7 72–165：收尾全景。72–120 极缓推近（out-cubic），之后 transform 恒定 = 真静止
  const s = mix(1, 1.03, ramp(frame, 72, 48, EASE.out));
  return (
    <UiShot transform={`scale(${s.toFixed(4)})`}>
      <PloverApp drag={1} land={1} toast={1} cursor={null} />
    </UiShot>
  );
};
