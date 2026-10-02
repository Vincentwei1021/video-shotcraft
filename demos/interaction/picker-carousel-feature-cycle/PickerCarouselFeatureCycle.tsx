// picker-carousel-feature-cycle —— 竖向选择器功能名吸附轮播
// 焦点药丸不动、内容穿过它；每项 outQuint 急减速吸附后真的静止几帧，按到中心距离分层衰减。
//
// 第二轮重设计（瓷白 · 滚筒选择器「Juniper」）：
// - look = porcelain（冷白 · 钴蓝）。左栏固定：108px 钴蓝 AI 徽章（原片左外侧的方形 AI 标的放大版）+
//   「One assistant. / Every job.」90px 标题；右栏主角是一只 980px 宽的滚筒选择器（占画宽 51%），
//   行高 128、焦点行 78px 粗体，行沿圆柱排布（rotateX 每行 19°，iOS 式滚筒的立体感），
//   透明度 / 字号 / 灰度三通道按到中心距离连续衰减，上下 alpha 遮罩自然消隐；滚筒装在一块极淡的瓷白玻璃立板里。
//   左栏标题下的副句随每次吸附换成焦点项"替你做了什么"的一句（走位前半旧句沉出、后半新句升起）。
// - 焦点药丸是固定层（零位移），落定才做 scaleY 1→1.04→1 的轻呼吸；焦点行左侧 72px 钴蓝图标块只在
//   贴近中心时浮现，药丸右端一枚快捷键键帽在每次吸附落定后浮起——每一拍都有"选中了"的奖励。
// - 走位快段给整列纵向速度拖影（吸附减速段自动归零）。
//
// 时间表（30fps，共 140f）：
//   0–18    入场：舞台光；徽章弹簧弹出、标题逐行升起、滚筒各行从 +40px 错峰升起
//   18–118  五拍吸附：每拍 20f = 走位 13f（outQuint）+ 静止 7f（HOLD 命门）
//   118–140 落定 hold 22f：停在「Automate flows」，键帽 ⌘6 在位，极缓 1% 推进
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

const L = LOOKS.porcelain;

export const PICKER_CAROUSEL_FEATURE_CYCLE_DURATION = 140;

const START = 18; // 第一拍起跳
const STEP = 20; // 每拍帧数
const MOVE = 13; // 走位帧数（其余 7f 静止 = HOLD 段）
const STEPS = 5;

const ROW_H = 128;
const DEG = 19; // 每行在圆柱上相隔的角度
const R = ROW_H / ((DEG * Math.PI) / 180); // 圆柱半径（使焦点附近行距 ≈ ROW_H）

// 每项一句"它替你做了什么"：左栏副句随每次吸附换成焦点项的那一句
const DESCS = [
  'Dedupes 40,000 records before lunch.',
  'Writes back in your voice, not a bot’s.',
  'Finds the customers worth a call.',
  'Edits a thousand rows in one pass.',
  'Thanks your best customers on time.',
  'Runs the busywork while you sleep.',
  'Ships the winner, retires the rest.',
];
const ITEMS = ['Clean up data', 'Draft replies', 'Smart segments', 'Batch actions', 'Reward program', 'Automate flows', 'Test variants'];
// 24 网格线性图标（与 ITEMS 一一对应）
const ICONS = [
  'M4 20 14 10M15 3v3M21 9h-3M19.5 4.5l-2 2M11 6.5l.8-2 .8 2 2 .8-2 .8-.8 2-.8-2-2-.8z',
  'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z',
  'M12 4a8 8 0 1 0 8 8h-8zM15 3.6A8 8 0 0 1 20.4 9H15z',
  'M12 3.5 20.5 8 12 12.5 3.5 8zM3.5 12l8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5',
  'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  'M13 2.5 5.5 13h6l-1 8.5L18.5 11h-6z',
  'M9 3.5h6M10 3.5v5.5l-5 8.6c-.6 1.1.2 2.4 1.4 2.4h11.2c1.2 0 2-1.3 1.4-2.4L14 9V3.5M7.5 14.5h9',
];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const outQuint = (x: number) => 1 - Math.pow(1 - clamp01(x), 5);

// 主时间轴：pos = 当前焦点索引（连续）；land = 本拍静止段进度（0 = 还在走、>0 = 已吸附）
const posAt = (f: number) => {
  const g = (f - START) / STEP;
  if (g <= 0) return 0;
  if (g >= STEPS) return STEPS;
  const step = Math.floor(g);
  const local = (f - START - step * STEP) / MOVE;
  return step + outQuint(local);
};
const landAt = (f: number) => {
  if (f < START) return f >= 8 ? 1 : 0; // 第一拍之前：初始项视为已落定
  const g = (f - START) / STEP;
  if (g >= STEPS) return 1;
  const into = f - START - Math.floor(g) * STEP - MOVE;
  return into < 0 ? 0 : clamp01(into / (STEP - MOVE));
};

const hexRGB = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerpColor = (a: string, b: string, t: number) => {
  const pa = hexRGB(a), pb = hexRGB(b);
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp01(t))).join(',')})`;
};

const Icon: React.FC<{ d: string; size: number; color: string }> = ({ d, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
    <path d={d} stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 画面几何
const PICK = { x: 760, w: 980, cy: 540 };

export const PickerCarouselFeatureCycle: React.FC = () => {
  const frame = useCurrentFrame();
  const pos = posAt(frame);
  const vy = -(posAt(frame + 0.5) - posAt(frame - 0.5)) * ROW_H;

  // 落定呼吸：只在静止段内（吸附完成）做一次 scaleY 1→1.04→1
  const g = (frame - START) / STEP;
  const settled = landAt(frame);
  const breath = frame >= START + MOVE ? Math.sin(clamp01(settled / 0.7) * Math.PI) * 0.04 : 0;
  // 键帽：每拍落定后浮起，走位时沉下
  const kbdOn = frame < START ? ramp(frame, 8, 8, EASE.out) : g >= STEPS ? 1 : ramp(landAt(frame), 0, 0.5, EASE.out);
  const kbdIdx = frame < START + MOVE * 0.5 ? 0 : Math.round(pos);

  const enter = ramp(frame, 0, 16, EASE.out);
  // 副句切换：走位前半段旧句下沉淡出，后半段新句升起（与吸附同拍）
  const gs = (frame - START) / STEP;
  const inMove = gs > 0 && gs < STEPS && frame - START - Math.floor(gs) * STEP < MOVE;
  const m = inMove ? (frame - START - Math.floor(gs) * STEP) / MOVE : 1;
  const descIdx = gs <= 0 ? 0 : gs >= STEPS ? STEPS : Math.floor(gs) + (m < 0.45 ? 0 : 1);
  const descA = inMove ? (m < 0.45 ? 1 - EASE.exit(m / 0.45) : EASE.out((m - 0.45) / 0.55)) : 1;
  const descY = inMove ? (m < 0.45 ? 14 * EASE.exit(m / 0.45) : -14 * (1 - EASE.out((m - 0.45) / 0.55))) : 0;
  const badge = springAt(frame, 2, { damping: 14, stiffness: 160 });
  const cam = 1 + 0.01 * ramp(frame, START + STEPS * STEP - 10, 32, EASE.smooth);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[1], fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.62, y: 0.12 }} fill={{ x: 0.08, y: 0.95 }} />
      {/* 滚筒身后的一抹钴蓝冷光：把焦点行从瓷白里托起来 */}
      <div style={{
        position: 'absolute', left: PICK.x - 120, top: PICK.cy - 260, width: PICK.w + 240, height: 520, opacity: enter,
        background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent, 0.1)} 0%, ${alpha(L.accent, 0)} 70%)`,
      }} />

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(4)})`, transformOrigin: '60% 50%' }}>
        {/* —— 左栏：AI 徽章 + 标题（固定不动）—— */}
        <div style={{ position: 'absolute', left: 124, top: 540 - 230, width: 600 }}>
          <div style={{
            width: 108, height: 108, borderRadius: 32, transform: `scale(${badge.toFixed(4)})`, transformOrigin: '30% 70%',
            background: `linear-gradient(150deg, #5b7dff 0%, ${L.accent} 55%, #1f3fd6 100%)`,
            boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.45), inset 0 -6px 14px rgba(10,20,90,0.35), 0 4px 10px ${alpha(L.accent, 0.25)}, 0 22px 40px -14px ${alpha(L.accent, 0.55)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#fff',
          }}>
            <svg width={30} height={30} viewBox="0 0 10 10" style={{ marginTop: -14 }}><path d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8z" fill="#ffffff" /></svg>
            <span style={{ ...type(46, 760), letterSpacing: '-0.02em' }}>AI</span>
          </div>
          <div style={{ marginTop: 44, ...type(32, 650, { caps: true }), letterSpacing: '0.14em', color: L.accent, opacity: ramp(frame, 4, 12, EASE.out) }}>
            Juniper
          </div>
          <div style={{ marginTop: 18, ...type(90, 760), letterSpacing: '-0.045em', color: L.ink }}>
            <TextReveal text={'One assistant.\nEvery job.'} by="line" variant="rise" start={6} each={18} gap={6} />
          </div>
          <div style={{
            marginTop: 34, height: 50, ...type(38, 450), color: L.ink2, whiteSpace: 'nowrap',
            opacity: descA * ramp(frame, 12, 12, EASE.out), transform: `translateY(${descY.toFixed(2)}px)`,
          }}>
            {DESCS[descIdx]}
          </div>
        </div>

        {/* 滚筒视窗：一块极淡的瓷白玻璃立板，让选择器是个"物件"而不是飘在空中的字 */}
        <div style={{
          position: 'absolute', left: PICK.x - 34, top: PICK.cy - 380, width: PICK.w + 68, height: 760, borderRadius: 56,
          background: `linear-gradient(180deg, ${alpha('#ffffff', 0.62)} 0%, ${alpha('#ffffff', 0.28)} 50%, ${alpha('#ffffff', 0.5)} 100%)`,
          border: `1px solid ${alpha('#ffffff', 0.9)}`,
          boxShadow: `inset 0 0 0 1px ${L.line}, 0 2px 6px ${alpha(L.shadow, 0.04)}, 0 40px 80px -40px ${alpha(L.shadow, 0.22)}`,
          opacity: enter, transform: `translateY(${((1 - enter) * 24).toFixed(2)}px)`,
        }} />
        {/* —— 右栏：滚筒选择器 —— */}
        <div style={{
          position: 'absolute', left: PICK.x, top: PICK.cy - 360, width: PICK.w, height: 720,
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 24%, #000 76%, transparent 100%)',
          maskImage: 'linear-gradient(180deg, transparent 0%, #000 24%, #000 76%, transparent 100%)',
        }}>
          {/* 焦点药丸：固定层，零位移；落定时 scaleY 轻呼吸 */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 360 - ROW_H / 2 - 6, height: ROW_H + 12, borderRadius: 999,
            background: `linear-gradient(180deg, #ffffff 0%, ${L.surface2} 100%)`,
            border: `1px solid ${L.line}`,
            boxShadow: `inset 0 1.5px 0 #ffffff, 0 1px 2px ${alpha(L.shadow, 0.06)}, 0 10px 24px -8px ${alpha(L.shadow, 0.14)}, 0 34px 60px -30px ${alpha(L.accent, 0.35)}`,
            transform: `scaleY(${(1 + breath).toFixed(4)})`, opacity: enter,
          }}>
            {/* 快捷键键帽：落定浮起 */}
            <div style={{
              position: 'absolute', right: 34, top: '50%', marginTop: -32, height: 64, minWidth: 92, padding: '0 16px', boxSizing: 'border-box',
              borderRadius: 16, background: L.surface2, boxShadow: `inset 0 0 0 1px ${L.line}, 0 2px 0 ${alpha(L.shadow, 0.08)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', ...type(32, 600), color: L.ink2,
              opacity: kbdOn, transform: `translateY(${((1 - kbdOn) * 10).toFixed(2)}px) scaleY(${(1 / (1 + breath)).toFixed(4)})`,
            }}>
              ⌘{kbdIdx + 1}
            </div>
          </div>

          {/* 内容列：沿圆柱排布，整列穿过焦点药丸；快段带纵向速度拖影 */}
          <SpeedBlur vx={0} vy={vy} amount={0.05} max={5}>
            <div style={{ position: 'absolute', inset: 0, perspective: 2600, perspectiveOrigin: '32% 50%' }}>
              {ITEMS.map((txt, i) => {
                const rel = i - pos;
                const d = Math.abs(rel);
                if (d > 3.4) return null;
                const th = (rel * DEG * Math.PI) / 180;
                const y = R * Math.sin(th);
                const z = R * (Math.cos(th) - 1);
                const k2 = Math.min(2, d);
                const o = k2 <= 1 ? mix(1, 0.55, k2) : mix(0.55, 0.16, k2 - 1);
                const fs = mix(78, 56, Math.min(1, d / 2));
                const color = d < 1 ? lerpColor(L.ink, L.ink2, d) : lerpColor(L.ink2, L.ink3, d - 1);
                const iconA = Math.max(0, 1 - d * 1.7);
                const rowIn = ramp(frame, 2 + Math.abs(i - 0) * 2.5, 16, EASE.snappy);
                return (
                  <div key={i} style={{
                    position: 'absolute', left: 0, right: 0, top: 360 - ROW_H / 2, height: ROW_H,
                    display: 'flex', alignItems: 'center', paddingLeft: 40,
                    transform: `translateY(${(y + (1 - rowIn) * 40).toFixed(2)}px) translateZ(${z.toFixed(2)}px) rotateX(${(-rel * DEG).toFixed(2)}deg)`,
                    opacity: o * rowIn,
                  }}>
                    {/* 图标块：仅贴近焦点时浮现，宽度同步收拢让文字回流 */}
                    <div style={{
                      width: 72 * iconA + 0.01, height: 72, marginRight: 28 * iconA, flex: 'none', overflow: 'hidden', borderRadius: 20,
                      opacity: iconA, transform: `scale(${(0.6 + 0.4 * iconA).toFixed(3)})`,
                      background: `linear-gradient(150deg, #5b7dff 0%, ${L.accent} 70%)`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 18px -8px ${alpha(L.accent, 0.7)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon d={ICONS[i]} size={38} color="#ffffff" />
                    </div>
                    <span style={{ ...type(fs, d < 0.5 ? 740 : 620), letterSpacing: '-0.035em', color, whiteSpace: 'nowrap' }}>{txt}</span>
                  </div>
                );
              })}
            </div>
          </SpeedBlur>
        </div>

      </div>
    </div>
  );
};
