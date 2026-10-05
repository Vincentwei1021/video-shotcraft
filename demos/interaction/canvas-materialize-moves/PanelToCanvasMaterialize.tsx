// panel-to-canvas-materialize —— miro-promo 84–92s
// 侧面板列表行逐个打勾 → 按钮按下 → 三行沿上抛弧线错峰飞出面板、跨容器变形成画布上的三张卡（行→卡形态迁移）。
//
// 第二轮重设计（沙色暖场 · 研究洞察上墙）：
// - look = sand（米色纸面 · 赤陶强调 · 藏青点缀）。产品即 video-shotcraft：右侧「Shot recipes」面板列着 5 张镜头配方卡
//   （32px 行标题、分类标签与挑卡人），左侧是一块开放的分镜板（标志 + 衬线大标题「Launch film」+ 淡点阵画布）。
// - 动作链有因果：光标逐个点三个复选框（赤陶色勾 spring 弹出、勾线描出）→ 移到「Add 3 to board」按下 →
//   三行先"拔起"（预备：放大 2% + 阴影加深 4f）再沿二次贝塞尔上抛弧线飞向画布，错峰 6f。
// - 形态迁移（本式命门）：位置走弧线先到，宽高 / 圆角晚 3f 收敛（父先子后）；行内容在 u<0.4 淡出、卡内容 u>0.5 淡入，
//   中段两态绝不同显；飞行中按速度做方向性运动模糊，阴影随弧线抬高变大变虚，落地 4f 压扁回弹 + 接触影收紧。
// - 行槽不复原：飞走的行塌成赤陶虚线留白「On board」，"迁移"不是"复制"。
// - 相机：起飞后整体极缓推近（总 2.5%）；落定后板头计数「3 shots pinned」升起，hold 成海报。
//
// 时间表（30fps，共 150f）：
//   0–18    面板从右滑入（snappy）、5 行错峰；板头衬线标题逐词升起
//   14/24/34 光标依次点中三个复选框（勾 spring damping 11，勾线 7f 描出），按钮计数 1→2→3
//   48      光标到按钮，52f 按下（scale 0.94 → 回弹）
//   56/62/68 三行拔起 4f → 起飞 40f（spring damping 17，弧线中点上抬 220px）
//   ~104–112 三卡依次落地（压扁回弹、倾角 −2.5/1.8/−1.2°），行槽塌成虚线
//   112–150 hold：板头「3 shots pinned」计数升起，相机极缓推进
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, SERIF, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const PANEL_TO_CANVAS_MATERIALIZE_DURATION = 150;

const L = LOOKS.sand;
const ACC = L.accent; // 赤陶
const NAVY = L.accent2; // 藏青（点缀：标签）

// ── 面板几何 ──
const PANEL_X = 1164;
const PANEL_Y = 96;
const PANEL_W = 656;
const PANEL_H = 888;
const ROW_X = PANEL_X + 24;
const ROW_W = PANEL_W - 48;
const ROW_H = 104;
const ROW_STEP = 116;
const ROWS_TOP = 262; // 第一行的画面 y（面板内布局与飞行起点共用，起飞零跳变）

// ── 卡片落位（画布左区）──
const CARD_W = 486;
const CARD_H = 300;
const TARGETS = [
  { x: 116, y: 268, rot: -2.5 },
  { x: 636, y: 306, rot: 1.8 },
  { x: 330, y: 640, rot: -1.2 },
];

const CHECK_AT = [14, 24, 34];
const PRESS = 52;
const LIFT_AT = [56, 62, 68];
const LIFT = 4; // 拔起预备帧
const FLY_DUR = 40;

type Item = { title: string; tag: string; who: string; name: string; quote: string; meta: string };
const ITEMS: Item[] = [
  // 镜头配方卡（库里真有的卡名）；quote = 挑卡人的备注，meta = 示意时长
  { title: 'Crash zoom punch-in', tag: 'Camera', who: 'AO', name: 'Ama Owusu', quote: '“Lands right on the beat drop.”', meta: '24 frames' },
  { title: 'Text as mask opener', tag: 'Opening', who: 'LB', name: 'Lars Berg', quote: '', meta: '' },
  { title: 'Cursor flyover tour', tag: 'Interaction', who: 'PS', name: 'Priya Sethi', quote: '“Reads like a real screen take.”', meta: '96 frames' },
  { title: 'Chart axis rescale shock', tag: 'Data', who: 'TM', name: 'Tomás Mena', quote: 'Rescales on the cut, holds two beats.', meta: '72 frames' },
  { title: 'Grain dissolve outro', tag: 'Outro', who: 'AO', name: 'Ama Owusu', quote: '', meta: '' },
];
const SLOTS = [0, 2, 3]; // 被勾选的行（不连续：读作"挑选"而非"全选"）
const AV = ['#c4552d', '#3d5a80', '#7c6a4f', '#9a5b3f'];

const rowY = (slot: number) => ROWS_TOP + slot * ROW_STEP;

// 飞行进度（spring，可能短暂 >1）
const flyU = (f: number, k: number) => springAt(f, LIFT_AT[k] + LIFT, { damping: 17, stiffness: 95, mass: 0.9 });

// 飞行几何：位置走二次贝塞尔（中点上抬），尺寸晚 3f 收敛
const flyGeom = (f: number, k: number) => {
  const slot = SLOTS[k];
  const u = flyU(f, k);
  const us = flyU(f - 3, k); // 尺寸晚 3f
  const t = TARGETS[k];
  const sx = ROW_X + ROW_W / 2, sy = rowY(slot) + ROW_H / 2;
  const ex = t.x + CARD_W / 2, ey = t.y + CARD_H / 2;
  const cx = (sx + ex) / 2, cy = Math.min(sy, ey) - 220;
  const q = Math.min(1, Math.max(0, u));
  const bx = (1 - q) * (1 - q) * sx + 2 * (1 - q) * q * cx + q * q * ex + (u - q) * (ex - cx) * 0.6;
  const by = (1 - q) * (1 - q) * sy + 2 * (1 - q) * q * cy + q * q * ey + (u - q) * (ey - cy) * 0.6;
  const w = mix(ROW_W, CARD_W, us);
  const h = mix(ROW_H, CARD_H, us);
  return { u, us, cx: bx, cy: by, w, h, rot: t.rot * u, arc: Math.sin(Math.PI * q) };
};

const Avatar: React.FC<{ s: string; c: string; size?: number }> = ({ s, c, size = 44 }) => (
  <div style={{
    width: size, height: size, borderRadius: 99, flex: 'none', display: 'grid', placeItems: 'center',
    background: `linear-gradient(180deg, ${alpha(c, 0.85)}, ${c})`, color: '#fff8f0',
    ...type(size * 0.38, 650), letterSpacing: '0.02em', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
  }}>{s}</div>
);

const Tag: React.FC<{ s: string }> = ({ s }) => (
  <span style={{
    ...type(20, 650, { caps: true }), color: NAVY, padding: '6px 12px', borderRadius: 99,
    background: alpha(NAVY, 0.09), border: `1px solid ${alpha(NAVY, 0.16)}`, whiteSpace: 'nowrap',
  }}>{s}</span>
);

const CheckBox: React.FC<{ frame: number; at: number | null }> = ({ frame, at }) => {
  const checked = at !== null && frame >= at;
  const pop = at === null ? 0 : springAt(frame, at, { damping: 11, stiffness: 300 });
  const draw = at === null ? 0 : ramp(frame, at + 1, 7, EASE.out);
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10, flex: 'none', boxSizing: 'border-box',
      border: checked ? 'none' : `2px solid ${alpha(L.ink, 0.22)}`,
      background: checked ? `linear-gradient(180deg, #d4673e, ${ACC})` : L.surface,
      boxShadow: checked ? `inset 0 1px 0 rgba(255,255,255,0.3), 0 3px 8px -3px ${alpha(ACC, 0.7)}` : `inset 0 1px 2px ${alpha(L.shadow, 0.08)}`,
      transform: checked ? `scale(${(0.75 + 0.25 * pop).toFixed(3)})` : undefined,
      display: 'grid', placeItems: 'center',
    }}>
      {checked && (
        <svg width="22" height="22" viewBox="0 0 18 18">
          <path d="M3.5 9.5 L7.3 13 L14.5 5" stroke="#fff8f0" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        </svg>
      )}
    </div>
  );
};

// 行形态内容（面板内的行与飞行中的行共用，保证起飞同形）
const RowContent: React.FC<{ item: Item; hue: string; check: React.ReactNode }> = ({ item, hue, check }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: ROW_W, height: ROW_H, display: 'flex', alignItems: 'center', gap: 22, padding: '0 24px', boxSizing: 'border-box' }}>
    {check}
    <span style={{ ...type(32, 600), color: L.ink, whiteSpace: 'nowrap', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
    <Avatar s={item.who} c={hue} size={40} />
  </div>
);

// 卡形态内容（按卡终态尺寸布局，飞行中由外框裁切）
const CardContent: React.FC<{ item: Item; hue: string }> = ({ item, hue }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H, padding: '26px 30px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Tag s={item.tag} />
      <span style={{ marginLeft: 'auto', ...type(20, 500), color: L.ink3 }}>{item.meta}</span>
    </div>
    <div style={{ marginTop: 18, fontFamily: SERIF, fontSize: 38, fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.02em', color: L.ink }}>{item.title}</div>
    <div style={{ marginTop: 12, ...type(24, 450), lineHeight: 1.3, color: L.ink2 }}>{item.quote}</div>
    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
      <Avatar s={item.who} c={hue} size={36} />
      <span style={{ ...type(22, 560), color: L.ink2 }}>{item.name}</span>
    </div>
  </div>
);

const Cursor: React.FC<{ frame: number }> = ({ frame }) => {
  // 光标路径：入画 → 三个复选框 → 按钮；段间 swift 缓动 + 轻弧线，点击时缩一下
  const cb = (slot: number) => ({ x: ROW_X + 24 + 18 + 6, y: rowY(slot) + ROW_H / 2 + 6 });
  const btn = { x: PANEL_X + PANEL_W / 2 + 190, y: PANEL_Y + PANEL_H - 70 };
  const keys = [
    { f: 4, ...{ x: 860, y: 760 } },
    { f: CHECK_AT[0] - 1, ...cb(SLOTS[0]) },
    { f: CHECK_AT[1] - 1, ...cb(SLOTS[1]) },
    { f: CHECK_AT[2] - 1, ...cb(SLOTS[2]) },
    { f: PRESS - 2, ...btn },
  ];
  let x = keys[0].x, y = keys[0].y;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    const p = ramp(frame, a.f + 1, b.f - a.f - 1, EASE.swift);
    if (frame >= a.f) {
      x = mix(a.x, b.x, p);
      y = mix(a.y, b.y, p) - Math.sin(Math.PI * p) * 26;
    }
  }
  const clicks = [...CHECK_AT, PRESS];
  let press = 1;
  for (const c of clicks) if (frame >= c - 1 && frame < c + 6) press = Math.min(press, 1 - 0.16 * Math.sin((Math.PI * (frame - c + 1)) / 7));
  const show = ramp(frame, 3, 8, EASE.out) * (1 - ramp(frame, PRESS + 26, 10, EASE.out));
  return (
    <svg width={44} height={48} viewBox="0 0 20 22" style={{
      position: 'absolute', left: x, top: y, transform: `scale(${press.toFixed(3)})`, transformOrigin: '4px 2px', opacity: show,
      filter: `drop-shadow(0 3px 4px ${alpha(L.shadow, 0.3)})`,
    }}>
      <path d="M2 1 L2 17 L6.5 13.2 L9.4 20 L12.4 18.7 L9.5 12 L15 11.6 Z" fill={L.ink} stroke="#fff8f0" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
};

export const PanelToCanvasMaterialize: React.FC = () => {
  const frame = useCurrentFrame();

  const panelIn = ramp(frame, 0, 18, EASE.snappy);
  const checkedCount = CHECK_AT.filter((c) => frame >= c).length;
  const btnPress = frame < PRESS ? 0 : ramp(frame, PRESS, 3, EASE.out) * (1 - ramp(frame, PRESS + 3, 9, EASE.out));
  const btnReady = ramp(frame, CHECK_AT[0], 8, EASE.out);
  const landed = (k: number) => flyU(frame, k) > 0.96;
  const doneCount = [0, 1, 2].filter((k) => frame >= LIFT_AT[k] + LIFT + 30).length;

  // 相机：起飞后极缓左移 + 推近，跟着内容看向画布
  const camP = ramp(frame, LIFT_AT[0], 94, EASE.smooth);
  const camS = 1 + 0.025 * camP;

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.1 }} fill={{ x: 0.9, y: 0.9 }}>
        {/* 画布点阵（板区） */}
        <AbsoluteFill style={{
          backgroundImage: `radial-gradient(${alpha(L.ink, 0.13)} 1.5px, transparent 1.8px)`,
          backgroundSize: '38px 38px', backgroundPosition: '10px 14px',
          WebkitMaskImage: 'radial-gradient(ellipse 46% 60% at 30% 56%, #000 30%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 46% 60% at 30% 56%, #000 30%, transparent 100%)',
        }} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${camS.toFixed(4)})`, transformOrigin: '52% 50%' }}>
        {/* ── 板头 ── */}
        <div style={{ position: 'absolute', left: 120, top: 92 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: ramp(frame, 2, 12, EASE.out) }}>
            <ShotcraftMark size={34} tone="light" />
            <span style={{ ...type(26, 680), letterSpacing: '0.01em', color: L.ink }}>{BRAND.name}</span>
            <span style={{ ...type(22, 650, { caps: true }), letterSpacing: '0.2em', color: ACC }}>· Storyboard</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 26 }}>
            <TextReveal text="Launch film" by="word" variant="rise" start={4} each={18} gap={5}
              style={{ fontFamily: SERIF, fontSize: 84, fontWeight: 600, letterSpacing: '-0.03em', color: L.ink, lineHeight: 1 }} />
            <div style={{ height: 44, overflow: 'hidden' }}>
              <div style={{
                ...type(32, 500), color: L.ink2, whiteSpace: 'nowrap',
                transform: `translateY(${((1 - ramp(frame, LIFT_AT[0] + LIFT + 30, 14, EASE.snappy)) * 110).toFixed(1)}%)`,
              }}>
                <span style={{ color: ACC, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{Math.max(1, doneCount)}</span> shot{doneCount === 1 ? '' : 's'} pinned
              </div>
            </div>
          </div>
        </div>

        {/* ── 右侧面板 ── */}
        <div style={{
          position: 'absolute', left: PANEL_X, top: PANEL_Y, width: PANEL_W, height: PANEL_H, boxSizing: 'border-box',
          borderRadius: 30, background: `linear-gradient(180deg, ${L.surface}, #f7f0e6)`,
          border: `1px solid ${L.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(30, { color: L.shadow, strength: 1.3 })}`,
          transform: `translateX(${((1 - panelIn) * 160).toFixed(2)}px)`, opacity: panelIn,
        }}>
          <div style={{ position: 'absolute', left: 32, top: 34, right: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ ...type(44, 700), color: L.ink }}>Shot recipes</span>
              <span style={{ marginLeft: 'auto', ...type(24, 500), color: L.ink3 }}>5 suggested</span>
            </div>
            <div style={{ marginTop: 14, ...type(26, 450), color: L.ink2 }}>Pick the shots for this cut.</div>
          </div>
          {/* 按钮 */}
          <div style={{
            position: 'absolute', left: 24, right: 24, bottom: 24, height: 92, borderRadius: 20,
            background: `linear-gradient(180deg, #2c241b, ${L.ink})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), ${softShadow(10 - 6 * btnPress, { color: L.shadow, strength: 1.6 })}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            opacity: 0.35 + 0.65 * btnReady, transform: `scale(${(1 - 0.04 * btnPress).toFixed(4)})`,
          }}>
            <span style={{ ...type(32, 620), color: '#fff8f0' }}>Add to board</span>
            <span style={{
              minWidth: 44, height: 44, borderRadius: 22, display: 'grid', placeItems: 'center', background: ACC,
              ...type(26, 700), color: '#fff8f0', transform: `scale(${(1 + 0.12 * Math.max(0, 1 - Math.min(...CHECK_AT.map((c) => Math.abs(frame - c - 2))) / 4)).toFixed(3)})`,
            }}>{checkedCount}</span>
          </div>
        </div>

        {/* ── 面板行（未飞走的 / 塌陷成虚线留白的） ── */}
        {ITEMS.map((item, slot) => {
          const k = SLOTS.indexOf(slot);
          const inP = ramp(frame, 6 + slot * 2.5, 16, EASE.snappy);
          const y = rowY(slot);
          const gone = k >= 0 && frame >= LIFT_AT[k] + LIFT;
          const ghost = k >= 0 ? ramp(frame, LIFT_AT[k] + LIFT + 4, 10, EASE.out) : 0;
          return (
            <div key={slot} style={{
              position: 'absolute', left: ROW_X, top: y, width: ROW_W, height: ROW_H,
              opacity: inP, transform: `translateX(${((1 - panelIn) * 160 + (1 - inP) * 40).toFixed(2)}px)`,
            }}>
              {k >= 0 && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 18, border: `2px dashed ${alpha(ACC, 0.45)}`, boxSizing: 'border-box',
                  background: alpha(ACC, 0.04), opacity: ghost, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  ...type(24, 600), color: alpha(ACC, 0.85),
                }}>
                  <svg width={22} height={22} viewBox="0 0 18 18"><path d="M3.5 9.5 L7.3 13 L14.5 5" stroke={ACC} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  On board
                </div>
              )}
              {!gone && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden',
                  background: k >= 0 && frame >= CHECK_AT[k] ? `linear-gradient(180deg, #fffaf3, ${L.surface})` : L.surface2,
                  border: `1px solid ${k >= 0 && frame >= CHECK_AT[k] ? alpha(ACC, 0.35) : L.line}`,
                  boxShadow: k >= 0 && frame >= CHECK_AT[k] ? `0 0 0 3px ${alpha(ACC, 0.08)}` : undefined,
                }}>
                  <RowContent item={item} hue={AV[slot % 4]} check={<CheckBox frame={frame} at={k >= 0 ? CHECK_AT[k] : null} />} />
                </div>
              )}
            </div>
          );
        })}

        {/* ── 飞行 / 落定的卡 ── */}
        {SLOTS.map((slot, k) => {
          const liftStart = LIFT_AT[k];
          if (frame < liftStart) return null;
          const item = ITEMS[slot];
          const pre = ramp(frame, liftStart, LIFT, EASE.out); // 拔起预备
          const g = flyGeom(frame, k);
          const flying = frame >= liftStart + LIFT;
          // 速度（px/帧）→ 方向性模糊
          const g0 = flyGeom(frame - 0.5, k), g1 = flyGeom(frame + 0.5, k);
          const vx = flying ? g1.cx - g0.cx : 0, vy = flying ? g1.cy - g0.cy : 0;
          // 落地压扁：u 首次越过 1 附近给一个 4f 的 scaleY 0.97 回弹
          const landF = liftStart + LIFT + 22;
          const squash = 1 - 0.03 * Math.sin(Math.PI * Math.min(1, Math.max(0, (frame - landF) / 6)));
          const rowOp = 1 - ramp(g.us, 0.08, 0.32, EASE.linear);
          const cardOp = ramp(g.us, 0.5, 0.3, EASE.linear);
          const elev = flying ? 8 + 46 * g.arc + (landed(k) ? 0 : 6) : 4 + 10 * pre;
          const radius = mix(18, 24, Math.min(1, g.us));
          const w = flying ? g.w : ROW_W * (1 + 0.02 * pre);
          const h = flying ? g.h : ROW_H * (1 + 0.02 * pre);
          const cx = flying ? g.cx : ROW_X + ROW_W / 2;
          const cy = flying ? g.cy : rowY(slot) + ROW_H / 2;
          return (
            <SpeedBlur key={slot} vx={vx} vy={vy} amount={0.32} max={14}>
              <div style={{
                position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h,
                transform: `rotate(${(flying ? g.rot : 0).toFixed(3)}deg) scaleY(${squash.toFixed(4)})`, transformOrigin: '50% 100%',
                borderRadius: radius, overflow: 'hidden', boxSizing: 'border-box',
                background: `linear-gradient(180deg, #fffaf3, ${L.surface})`,
                border: `1px solid ${alpha(ACC, 0.35 * (1 - cardOp))}`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.95), ${softShadow(elev, { color: L.shadow, strength: 1.5 })}`,
              }}>
                {/* 赤陶顶线：卡形态的身份标记 */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 6, background: ACC, opacity: cardOp }} />
                <div style={{ position: 'absolute', inset: 0, opacity: rowOp }}>
                  <RowContent item={item} hue={AV[slot % 4]} check={<CheckBox frame={frame} at={CHECK_AT[k]} />} />
                </div>
                <div style={{ position: 'absolute', inset: 0, opacity: cardOp }}>
                  <CardContent item={item} hue={AV[slot % 4]} />
                </div>
              </div>
            </SpeedBlur>
          );
        })}

        <Cursor frame={frame} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
