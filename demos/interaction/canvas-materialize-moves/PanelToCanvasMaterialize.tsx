// panel-to-canvas-materialize —— miro-promo 84–92s
// 侧面板表格行复选框自动逐个打勾 → 按钮按下 → 三行内容飞出面板、
// 物化成画布上三张独立卡片落位（行→卡跨容器形态迁移，尺寸/形状插值）。
// 改版：面板做成真实的"研究笔记"列表（6 行，勾选其中 3 行），起飞点与行槽像素级对齐；
// 行/卡两套出版级假内容交叉淡化；飞行段随弧线抬高阴影 + 按速度的方向性运动模糊；
// 按钮计数随勾选 1→2→3 递增，光标走弧线；柔光画布 + 画布工具条。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, SpeedBlur, mix, ramp, softShadow, tracking } from '../../_fixtures/Polish';

// 整段：打勾 12/22/32 → 按钮 46 → 起飞 54/60/66（各 34f）→ 末卡 ~100 落定 → 静止 30f
export const PANEL_TO_CANVAS_MATERIALIZE_DURATION = 130;

const PANEL_X = 1210;
const PANEL_Y = 90;
const PANEL_W = 620;
const PANEL_H = 900;
const PANEL_PAD = 28;
const ROW_H = 92; // 行距（行高 80 + 间隙 12）
const ROWS_TOP = 262; // 面板内第一行的画面 y（与面板内布局同一常量，起飞零跳变）

// 行 → 卡的目标位（画布左侧区域）
const TARGETS = [
  { x: 150, y: 150, rot: -2 },
  { x: 480, y: 420, rot: 1.5 },
  { x: 180, y: 660, rot: 2 },
];
const CARD_W = 480;
const CARD_H = 240;

const CHECK_FRAMES = [12, 22, 32]; // 三个复选框打勾时刻
const BUTTON_FRAME = 46; // 按钮按下
const FLY_START = [54, 60, 66]; // 三行错峰起飞
const FLY_DUR = 34;

type Item = { title: string; tag: string; dot: string; owner: string; name: string; excerpt: string; meta: string };
const ITEMS: Item[] = [
  { title: 'Onboarding drop-off interviews', tag: 'Interview', dot: '#5b63d3', owner: 'AL', name: 'Ana Lee', excerpt: '5 of 8 users stalled at workspace setup; templates were the most-cited fix.', meta: '8 quotes' },
  { title: 'Competitor teardown', tag: 'Market', dot: '#8b8f99', owner: 'DS', name: 'Dev Shah', excerpt: '', meta: '' },
  { title: 'Pricing page heatmap', tag: 'Analytics', dot: '#3a9d8f', owner: 'JR', name: 'Jon Reyes', excerpt: 'Annual toggle gets 3× the clicks of the plan cards.', meta: '2 charts' },
  { title: 'Churn survey — Q3', tag: 'Survey', dot: '#c9873a', owner: 'MK', name: 'Mia Kato', excerpt: 'Top reason to leave: "too many tools to set up" (41%).', meta: '214 replies' },
  { title: 'Support ticket themes', tag: 'Support', dot: '#8b8f99', owner: 'AL', name: 'Ana Lee', excerpt: '', meta: '' },
  { title: 'Mobile usability notes', tag: 'Interview', dot: '#8b8f99', owner: 'JR', name: 'Jon Reyes', excerpt: '', meta: '' },
];
// 被勾选、要飞出的行槽（不连续，读作"挑选"而非"全选"）
const SLOTS = [0, 2, 3];
const PICKED = SLOTS.map((s) => ITEMS[s]);
const slotOf = (idx: number) => SLOTS[idx];

const Avatar: React.FC<{ s: string; size?: number; hue?: number }> = ({ s, size = 26, hue = 0 }) => (
  <div style={{
    width: size, height: size, borderRadius: 99, flex: 'none', display: 'grid', placeItems: 'center',
    background: ['linear-gradient(180deg,#8d93e6,#6a71d6)', 'linear-gradient(180deg,#73c1b4,#3a9d8f)', 'linear-gradient(180deg,#e2b47b,#c9873a)', 'linear-gradient(180deg,#a5a9b2,#80848e)'][hue % 4],
    color: '#fff', fontSize: size * 0.4, fontWeight: 650, letterSpacing: '0.01em',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
  }}>{s}</div>
);

const CheckBox: React.FC<{ frame: number; at: number; fps: number }> = ({ frame, at, fps }) => {
  const checked = frame >= at;
  const pop = spring({ frame: frame - at, fps, config: { damping: 10, stiffness: 260 } });
  const draw = EASE.out(ramp(frame, at + 1, 7, EASE.linear));
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 7, flex: 'none', boxSizing: 'border-box',
      border: checked ? 'none' : `1.5px solid ${G.hairlineStrong}`,
      background: checked ? `linear-gradient(180deg, #6c74e0, ${G.accent})` : '#fff',
      boxShadow: checked ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 6px -2px rgba(91,99,211,0.6)' : 'inset 0 1px 1px rgba(16,18,24,0.06)',
      transform: checked ? `scale(${0.8 + 0.2 * pop})` : 'scale(1)',
      display: 'grid', placeItems: 'center',
    }}>
      {checked && (
        <svg width="16" height="16" viewBox="0 0 18 18">
          <path d="M3.5 9.5 L7.3 13 L14.5 5" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        </svg>
      )}
    </div>
  );
};

// 行形态内容（面板内的行与飞行中的行共用，保证起飞同形）
const RowContent: React.FC<{ item: Item; hue: number; check: React.ReactNode }> = ({ item, hue, check }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px' }}>
    {check}
    <span style={{ fontSize: 21, fontWeight: 560, color: G.ink1, letterSpacing: tracking(21), whiteSpace: 'nowrap', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {item.title}
    </span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, color: G.ink2, padding: '4px 9px', borderRadius: 99, background: G.fill, border: `1px solid ${G.hairline}` }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: item.dot }} />
      {item.tag}
    </span>
    <Avatar s={item.owner} hue={hue} />
  </div>
);

export const PanelToCanvasMaterialize: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const btnPress = interpolate(frame, [BUTTON_FRAME, BUTTON_FRAME + 3, BUTTON_FRAME + 9], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const nChecked = CHECK_FRAMES.filter((f) => frame >= f).length;
  const sceneIn = ramp(frame, 0, 14, EASE.snappy);

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.3, y: 0.25 }} accent={G.accent} grain={0} />
      {/* 画布点阵底（中心清晰、边缘隐去） */}
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(20,22,28,0.12) 1.6px, transparent 1.8px)',
          backgroundSize: '40px 40px',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 75% at 40% 50%, #000 35%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 70% 75% at 40% 50%, #000 35%, transparent 100%)',
        }}
      />

      {/* 画布工具条：告诉观众左边是一块白板 */}
      <div style={{
        position: 'absolute', left: 48, top: 40, height: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 0 12px',
        borderRadius: 14, background: 'rgba(255,255,255,0.86)', border: `1px solid ${G.hairline}`,
        boxShadow: `inset 0 1px 0 #fff, ${softShadow(6)}`, opacity: sceneIn,
      }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(180deg,#2a2c33,#17181c)', display: 'grid', placeItems: 'center' }}>
          <svg width={16} height={16} viewBox="0 0 16 16"><rect x={2} y={2} width={5} height={5} rx={1.5} fill="#fff" /><rect x={9} y={2} width={5} height={5} rx={1.5} fill="#fff" opacity={0.6} /><rect x={2} y={9} width={5} height={5} rx={1.5} fill="#fff" opacity={0.6} /><rect x={9} y={9} width={5} height={5} rx={1.5} fill="#fff" opacity={0.35} /></svg>
        </div>
        <span style={{ fontSize: 18, fontWeight: 620, color: G.ink1, letterSpacing: tracking(18) }}>Q3 Research board</span>
        <span style={{ width: 1, height: 22, background: G.hairlineStrong }} />
        <div style={{ display: 'flex' }}>
          {['AL', 'JR', 'MK'].map((s, i) => (
            <div key={s} style={{ marginLeft: i ? -7 : 0, borderRadius: 99, boxShadow: '0 0 0 2px #fff' }}><Avatar s={s} size={24} hue={i} /></div>
          ))}
        </div>
      </div>

      {/* 侧面板 */}
      <div
        style={{
          position: 'absolute',
          left: PANEL_X,
          top: PANEL_Y,
          width: PANEL_W,
          height: PANEL_H,
          background: 'linear-gradient(180deg, #fbfbfa, #f6f6f4)',
          border: `1px solid ${G.hairline}`,
          borderRadius: 22,
          boxShadow: `inset 0 1px 0 #fff, ${softShadow(22)}`,
          boxSizing: 'border-box',
          opacity: sceneIn,
          transform: `translateX(${(1 - sceneIn) * 30}px)`,
        }}
      >
        {/* 面板标题 */}
        <div style={{ position: 'absolute', left: PANEL_PAD, top: PANEL_PAD, right: PANEL_PAD }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 27, fontWeight: 680, color: G.ink1, letterSpacing: tracking(27) }}>Research notes</span>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: G.ink3 }}>Synced 2m ago</span>
          </div>
          <div style={{ fontSize: 17, color: G.ink2, marginTop: 8 }}>6 items · pick notes to place on the board</div>
        </div>
        {/* 表头 */}
        <div style={{
          position: 'absolute', left: PANEL_PAD, right: PANEL_PAD, top: ROWS_TOP - PANEL_Y - 46, height: 34,
          display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 13, fontWeight: 650, color: G.ink3,
          letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${G.hairline}`,
        }}>
          <span style={{ width: 42 }} />
          <span>Title</span>
          <span style={{ marginLeft: 'auto' }}>Tag · Owner</span>
        </div>
        {/* 行槽位（行飞走后留白） */}
        {ITEMS.map((item, slot) => (
          <RowSlot key={slot} slot={slot} item={item} frame={frame} fps={fps} />
        ))}
        {/* 面板底部按钮：计数随勾选递增 */}
        <div
          style={{
            position: 'absolute',
            left: PANEL_PAD,
            bottom: PANEL_PAD,
            right: PANEL_PAD,
            height: 64,
            borderRadius: 16,
            background: nChecked > 0 ? 'linear-gradient(180deg, #2a2c33, #17181c)' : G.fill2,
            boxShadow: nChecked > 0 ? `inset 0 1px 0 rgba(255,255,255,0.12), ${softShadow(6 - btnPress * 5, { strength: 1.4 })}` : 'none',
            transform: `scale(${1 - btnPress * 0.04})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            overflow: 'hidden',
          }}
        >
          {/* 按下涟漪（裁进按钮圆角） */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%', width: 560, height: 560, marginLeft: -280, marginTop: -280, borderRadius: 999,
            background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 60%)',
            transform: `scale(${ramp(frame, BUTTON_FRAME, 14, EASE.out)})`,
            opacity: interpolate(frame, [BUTTON_FRAME, BUTTON_FRAME + 4, BUTTON_FRAME + 16], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }} />
          <span style={{ fontWeight: 640, fontSize: 22, color: nChecked > 0 ? '#f4f5f7' : G.ink3, letterSpacing: tracking(22) }}>
            Add to canvas
          </span>
          <span style={{
            minWidth: 30, height: 30, borderRadius: 99, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums', color: '#fff', background: nChecked > 0 ? G.accent : G.ink3,
            transform: `scale(${1 + 0.18 * CHECK_FRAMES.reduce((m, f) => Math.max(m, interpolate(frame, [f, f + 3, f + 10], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })), 0)})`,
          }}>{nChecked}</span>
        </div>
      </div>

      {/* 飞行中/落位的三张卡（行→卡形态插值） */}
      {[0, 1, 2].map((i) => (
        <FlyingCard key={i} idx={i} frame={frame} fps={fps} />
      ))}

      {/* 光标 */}
      <Cursor frame={frame} />
    </AbsoluteFill>
  );
};

// 面板内的一行：复选框自动打勾；起飞后槽位塌陷成虚线留白
const RowSlot: React.FC<{ slot: number; item: Item; frame: number; fps: number }> = ({ slot, item, frame, fps }) => {
  const idx = SLOTS.indexOf(slot);
  const picked = idx >= 0;
  const checkF = picked ? CHECK_FRAMES[idx] : 1e6;
  const flyF = picked ? FLY_START[idx] : 1e6;
  const flown = frame >= flyF;
  const sel = picked ? ramp(frame, checkF, 8, EASE.out) : 0;
  const ghost = ramp(frame, flyF + 6, 10, EASE.out);

  return (
    <div
      style={{
        position: 'absolute',
        left: PANEL_PAD,
        right: PANEL_PAD,
        top: ROWS_TOP - PANEL_Y + slot * ROW_H,
        height: ROW_H - 12,
        borderRadius: 14,
        boxSizing: 'border-box',
        border: flown ? `1.5px dashed rgba(20,22,28,0.14)` : `1px solid ${sel > 0 ? `rgba(91,99,211,${0.1 + 0.2 * sel})` : G.hairline}`,
        background: flown ? 'rgba(20,22,28,0.015)' : sel > 0 ? `linear-gradient(180deg, #ffffff, rgba(244,245,255,${sel}))` : '#fff',
        boxShadow: flown ? 'none' : `inset 0 1px 0 #fff, ${softShadow(2)}`,
      }}
    >
      {!flown && <RowContent item={item} hue={slot} check={<CheckBox frame={frame} at={checkF} fps={fps} />} />}
      {flown && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 16, color: G.ink3, opacity: ghost,
        }}>
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none"><path d="M10 3H4.5A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5V6M8 8l5-5M9.5 3H13v3.5" stroke={G.ink3} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" /></svg>
          On canvas
        </div>
      )}
    </div>
  );
};

// 飞行几何（位置走二次贝塞尔，中点上抬 170px）——单独成函数，便于求速度喂运动模糊
const flight = (idx: number, f: number, fps: number) => {
  const t = spring({ frame: f - FLY_START[idx], fps, config: { damping: 16, stiffness: 60 }, durationInFrames: FLY_DUR });
  const sx = PANEL_X + PANEL_PAD;
  const sy = ROWS_TOP + slotOf(idx) * ROW_H;
  const tgt = TARGETS[idx];
  const mx = (sx + tgt.x) / 2;
  const my = Math.min(sy, tgt.y) - 170;
  const u = t;
  const x = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * tgt.x;
  const y = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * tgt.y;
  return { u, x, y };
};

// 行→卡：位置沿贝塞尔弧线飞、尺寸/圆角/内容布局同步插值
const FlyingCard: React.FC<{ idx: number; frame: number; fps: number }> = ({ idx, frame, fps }) => {
  const flyF = FLY_START[idx];
  if (frame < flyF) return null;

  const { u, x, y } = flight(idx, frame, fps);
  const a = flight(idx, frame - 0.5, fps);
  const b = flight(idx, frame + 0.5, fps);
  const vx = b.x - a.x;
  const vy = b.y - a.y;

  const item = PICKED[idx];
  const sw = PANEL_W - PANEL_PAD * 2;
  const sh = ROW_H - 12;
  const tgt = TARGETS[idx];
  const uc = Math.min(1, Math.max(0, u));

  const w = sw + (CARD_W - sw) * u;
  const h = sh + (CARD_H - sh) * u;
  const rot = tgt.rot * u;
  const radius = 14 + 4 * uc;
  // 离地高度：弧线中段最高（48），落定回到静置 6
  const lift = Math.sin(Math.PI * uc) * 42 + 6 * uc + 2 * (1 - uc);
  const pop = 1 + 0.035 * Math.sin(Math.PI * uc);
  // 行内容(单行水平) → 卡内容(标题+摘要+footer) 交叉淡化（rowOp 灭于 0.45 前、cardOp 亮于其后）
  const rowOp = Math.max(0, Math.min(1, 1 - u * 2.2));
  const cardOp = Math.max(0, Math.min(1, (u - 0.45) / 0.55));

  return (
    <SpeedBlur vx={vx} vy={vy} amount={0.1} max={4.5} style={{ zIndex: 10 + idx }}>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          background: 'linear-gradient(180deg, #ffffff, #fbfbfa)',
          border: `1px solid ${G.hairline}`,
          borderRadius: radius,
          boxShadow: `inset 0 1px 0 #fff, ${softShadow(lift)}`,
          transform: `rotate(${rot}deg) scale(${pop})`,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* 行形态内容（与面板行同一组件，起飞同形） */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: sw, height: sh, opacity: rowOp }}>
          <RowContent item={item} hue={slotOf(idx)} check={<CheckBox frame={999} at={0} fps={fps} />} />
        </div>
        {/* 卡形态内容（按终态 480×240 排版，卡长大时逐步露出，不重排） */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H, padding: '22px 24px 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', opacity: cardOp }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, color: G.ink2, letterSpacing: '0.02em' }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: item.dot }} />
            {item.tag}
            <span style={{ marginLeft: 'auto', color: G.ink3, fontWeight: 500 }}>{item.meta}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 26, fontWeight: 680, color: G.ink1, letterSpacing: tracking(26), lineHeight: 1.18 }}>{item.title}</div>
          <div style={{ marginTop: 8, fontSize: 17, color: G.ink2, lineHeight: 1.42, letterSpacing: tracking(17) }}>{item.excerpt}</div>
          <div style={{ marginTop: 'auto', display: 'flex', gap: 9, alignItems: 'center' }}>
            <Avatar s={item.owner} size={26} hue={slotOf(idx)} />
            <span style={{ fontSize: 15, color: G.ink2, fontWeight: 540 }}>{item.name}</span>
          </div>
        </div>
      </div>
    </SpeedBlur>
  );
};

const Cursor: React.FC<{ frame: number }> = ({ frame }) => {
  // 光标：从画面中部沿一条轻弧线移到按钮上，减速停稳后按下
  const bx = PANEL_X + PANEL_W / 2 + 150; // 停在计数徽章右侧，不挡按钮文字
  const by = PANEL_Y + PANEL_H - 66;
  const p = ramp(frame, 8, BUTTON_FRAME - 12, EASE.swift);
  const x = mix(900, bx, p);
  const y = mix(560, by, p) - Math.sin(Math.PI * p) * 70; // 弧线：中段略上拱
  const press = interpolate(frame, [BUTTON_FRAME, BUTTON_FRAME + 3, BUTTON_FRAME + 8], [1, 0.82, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const show = ramp(frame, 4, 8, EASE.out);
  return (
    <svg
      width={40}
      height={44}
      viewBox="0 0 20 22"
      style={{
        position: 'absolute', left: x, top: y, transform: `scale(${press})`, transformOrigin: '4px 2px', zIndex: 40, opacity: show,
        filter: 'drop-shadow(0 2px 3px rgba(16,18,24,0.28))',
      }}
    >
      <path d="M2 1 L2 17 L6.5 13.2 L9.4 20 L12.4 18.7 L9.5 12 L15 11.6 Z" fill={G.ink1} stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
};
