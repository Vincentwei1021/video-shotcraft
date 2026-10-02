// tape-scroll-fixed-pointer —— 滚带定针（世界动、针不动：数值大小 = 看得见的位移距离）
//
// 第二轮重设计（瓷白精密仪器 · 航电速度带语法）：
// - look = porcelain（冷白 + 钴蓝）。主角是一条贯穿全画高、上下渐隐出画的竖向刻度带（每 10 一刻、每 50 一大刻 +
//   64px 数字），钴蓝读数窗 + 指针缺口钉死在画面中线：窗里是 128px 白色读数，刻度带从窗后滚过。
//   不再是小盒子里的刻度尺——带子本身就是画面的"世界"。
// - 叙事：慢爬顶到旧上限（虚线 "Old limit"（140k） 横在窗口正上方，读数被压在 122 停住）→ 升级生效，
//   旧上限线断开淡出 → 预备回拉一下 → 刻度带冲刺（峰值 ~100px/f，按速度纵向运动模糊）→ 冲过 444 →
//   弹簧刹车回摆到 416 → 落定 420，新上限标记（钴蓝三角 bug）恰好停进指针。
// - 左侧排版：品牌眉题 + 84px 标题 "Rate limit"，落定后第二行 "tripled." 钴蓝升起（结论晚于数据到），
//   再弹出 "▲ 200%" 胶囊 + "140k → 420k" 等宽小结。品牌 Tideway（虚构）。
//
// 时间表（30fps，共 150f）：
//   0–14    预备：舞台、刻度带停在 60、标题第一行升起
//   10–48   慢爬 60→122（swift：起步加速、贴近上限时减速——"顶住了"，上限线正好压在读数窗上沿）
//   48–56   停在上限下；52f 旧上限线断开淡出（升级生效）
//   56–61   预备：回拉 122→117（anticip）
//   61–83   冲刺 117→444（22f，bezier .55,0,.25,1），刻度带按速度纵向模糊
//   83–110  弹簧刹车：444→416→420（~16% 一次可见回摆），110f 后锁死常数
//   96–124  余波："tripled." 升起（98f）、胶囊弹出（108f）、小结淡入（114f）
//   110–150 hold：整体极缓推近 1.0→1.025，尾帧是完整的结论海报
import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, bezier, mix, ramp, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const TAPE_SCROLL_FIXED_POINTER_DURATION = 150;

const L = LOOKS.porcelain;
const PXU = 5; // px / 单位：每 10 单位一刻 = 50px
const CY = 540; // 指针中线（屏幕 y）
const TAPE_X = 1000; // 刻度带左缘
const TAPE_W = 520;
const TICK_R = TAPE_X + TAPE_W - 40; // 刻度右端（向左伸）
const NUM_R = TAPE_X + 310; // 数字右对齐线
const WIN_X = TAPE_X - 30; // 读数窗
const WIN_W = 400;
const WIN_H = 150;
const OLD_LIMIT = 140; // 旧上限 140k ×3 = 新上限 420k（▲200%）
const NEW_LIMIT = 420;

const SPRINT = bezier(0.55, 0, 0.25, 1); // 冲刺：猛加速、长刹车
// 回摆弹簧：444 → 420，回摆到 416（超调 4/24 ≈ 17%）→ 反算阻尼
const SET_STIFF = 140;
const SET_DAMP = (() => {
  const lp = Math.log(4 / 24);
  return 2 * (-lp / Math.sqrt(Math.PI * Math.PI + lp * lp)) * Math.sqrt(SET_STIFF);
})();

// 读数时间线（纯帧函数，全部钳位）
const valueAt = (f: number): number => {
  if (f <= 10) return 60;
  if (f <= 48) return mix(60, 122, ramp(f, 10, 38, EASE.swift));
  if (f <= 56) return 122;
  if (f <= 61) return mix(122, 117, ramp(f, 56, 5, EASE.smooth));
  if (f <= 83) return mix(117, 444, SPRINT((f - 61) / 22));
  if (f >= 110) return NEW_LIMIT;
  return mix(444, NEW_LIMIT, spring({ frame: f - 83, fps: 30, config: { stiffness: SET_STIFF, damping: SET_DAMP, mass: 1 } }));
};

export const TapeScrollFixedPointer: React.FC = () => {
  const frame = useCurrentFrame();
  const v = valueAt(frame);
  const vy = velocity((f) => valueAt(f) * PXU, frame); // 刻度带速度（px/帧）
  const speed = Math.abs(vy);
  const yOf = (u: number) => CY + (v - u) * PXU; // 单位 u 的屏幕 y（大数在上）

  // 刻度（只画视野内的）
  const ticks: React.ReactNode[] = [];
  const uMin = Math.floor((v - 130) / 10) * 10;
  for (let u = Math.max(0, uMin); u <= v + 130; u += 10) {
    const y = yOf(u);
    const major = u % 50 === 0;
    ticks.push(
      <div key={`t${u}`} style={{
        position: 'absolute', left: TICK_R - (major ? 150 : 70), top: y - (major ? 2 : 1), width: major ? 150 : 70, height: major ? 4 : 2,
        borderRadius: 2, background: major ? L.ink : alpha(L.ink, 0.32),
      }} />,
    );
    if (major) {
      // 数字滑到读数窗背后前淡出（不从窗沿露出半截）
      const near = Math.min(1, Math.max(0, (Math.abs(y - CY) - WIN_H / 2 - 36) / 30));
      ticks.push(
        <div key={`n${u}`} style={{ opacity: near,
          position: 'absolute', left: NUM_R - 260, width: 260, top: y - 40, height: 80, lineHeight: '80px', textAlign: 'right',
          ...type(64, 600), letterSpacing: '-0.03em', color: alpha(L.ink, 0.82),
        }}>{u}</div>,
      );
    }
  }

  // 旧上限线：52f 断开淡出（两半各自向外滑开）
  const brk = ramp(frame, 52, 14, EASE.out);
  const oldY = yOf(OLD_LIMIT);
  // 新上限 bug：随带滚动，落定后 bug 与指针重合时亮起
  const newY = yOf(NEW_LIMIT);
  const locked = ramp(frame, 104, 10, EASE.out);

  const head = ramp(frame, 0, 20, EASE.snappy);
  const push = 1 + 0.025 * ramp(frame, 90, 60, EASE.smooth);
  const readBlur = Math.min(6, speed * 0.06);
  const chip = ramp(frame, 108, 14, EASE.overshoot);
  const recap = ramp(frame, 114, 16, EASE.out);
  const glowK = Math.min(1, speed / 60); // 冲刺时读数窗的钴蓝外发光

  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans, overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.68, y: 0.3 }} fill={null} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: '62% 50%' }}>
        {/* ── 世界层：刻度带（整体在动）── */}
        <div style={{
          position: 'absolute', left: TAPE_X, top: 0, width: TAPE_W, height: 1080,
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)',
          maskImage: 'linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)',
        }}>
          {/* 带面：微渐变白 + 左右发丝线 */}
          <div style={{
            position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${alpha('#ffffff', 0.35)} 0%, ${alpha('#ffffff', 0.85)} 60%, ${alpha('#ffffff', 0.6)} 100%)`,
            borderLeft: `1px solid ${L.line}`, borderRight: `1px solid ${L.line}`,
          }} />
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          WebkitMaskImage: 'linear-gradient(180deg, transparent 2%, #000 24%, #000 76%, transparent 98%)',
          maskImage: 'linear-gradient(180deg, transparent 2%, #000 24%, #000 76%, transparent 98%)',
        }}>
          <SpeedBlur vx={0} vy={vy} amount={0.12} max={12}>
            {ticks}
            {/* 旧上限：虚线 + 标签，升级后断开 */}
            {brk < 1 && oldY > -40 && oldY < 1120 && (
              <>
                <div style={{
                  position: 'absolute', left: TAPE_X - 10 - brk * 80, top: oldY - 1.5, width: TAPE_W / 2 + 10, height: 3, opacity: 1 - brk,
                  backgroundImage: `repeating-linear-gradient(90deg, ${L.ink2} 0 14px, transparent 14px 24px)`,
                }} />
                <div style={{
                  position: 'absolute', left: TAPE_X + TAPE_W / 2 + brk * 80, top: oldY - 1.5, width: TAPE_W / 2 - 16, height: 3, opacity: 1 - brk,
                  backgroundImage: `repeating-linear-gradient(90deg, ${L.ink2} 0 14px, transparent 14px 24px)`,
                }} />
                <div style={{
                  position: 'absolute', left: TAPE_X + TAPE_W + 28, top: oldY - 22, opacity: 1 - brk, whiteSpace: 'nowrap',
                  ...type(32, 600, { caps: true }), letterSpacing: '0.1em', color: L.ink2,
                }}>Old limit</div>
              </>
            )}
            {/* 新上限 bug：钴蓝三角，贴在刻度右缘 */}
            {newY > -60 && newY < 1140 && (
              <>
                <svg width={44} height={56} style={{ position: 'absolute', left: TICK_R + 6, top: newY - 28, overflow: 'visible' }}>
                  <path d="M 4 28 L 40 6 L 40 50 Z" fill={L.accent} stroke={L.accent} strokeWidth={6} strokeLinejoin="round" />
                </svg>
                <div style={{
                  position: 'absolute', left: TAPE_X + TAPE_W + 28, top: newY - 22, whiteSpace: 'nowrap',
                  ...type(32, 700, { caps: true }), letterSpacing: '0.1em', color: L.accent,
                  opacity: 0.55 + 0.45 * locked,
                }}>New limit</div>
              </>
            )}
          </SpeedBlur>
        </div>

        {/* ── 固定层：读数窗 + 指针缺口（针不动）── */}
        <div style={{
          position: 'absolute', left: WIN_X, top: CY - WIN_H / 2, width: WIN_W, height: WIN_H, borderRadius: 26,
          background: `linear-gradient(180deg, ${L.accent} 0%, #2448d8 100%)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 24px 50px -16px ${alpha(L.shadow, 0.45)}, 0 4px 10px ${alpha(L.shadow, 0.16)}, 0 0 ${(30 + 50 * glowK).toFixed(1)}px ${alpha(L.accent, 0.18 + 0.32 * glowK)}`,
          overflow: 'hidden', opacity: head,
        }}>
          {/* 窗内读数（冲刺时按速度纵向模糊） */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end',
            paddingRight: 48, paddingTop: 10, boxSizing: 'border-box', color: L.onAccent, whiteSpace: 'nowrap',
          }}>
            <span style={{ ...type(128, 700), letterSpacing: '-0.04em', lineHeight: '140px', filter: readBlur > 0.4 ? `blur(${readBlur.toFixed(2)}px)` : undefined }}>
              {Math.round(v)}
            </span>
            <span style={{ ...type(48, 600), marginLeft: 10, opacity: 0.75 }}>k</span>
          </div>
          {/* 窗面上沿高光 */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '45%', background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0))' }} />
        </div>
        {/* 指针：读数窗右侧伸向刻度的钴蓝细针 + 三角 */}
        <div style={{ position: 'absolute', left: WIN_X + WIN_W - 2, top: CY - 2, width: TICK_R - (WIN_X + WIN_W) + 2, height: 4, background: L.accent, opacity: head, borderRadius: 2 }} />
        <svg width={40} height={44} style={{ position: 'absolute', left: WIN_X + WIN_W - 6, top: CY - 22, overflow: 'visible', opacity: head }}>
          <path d="M 2 4 L 30 22 L 2 40 Z" fill={L.accent} stroke={L.accent} strokeWidth={4} strokeLinejoin="round" />
        </svg>
      </div>

      {/* ── 左侧排版 ── */}
      <div style={{ position: 'absolute', left: 150, top: 300, width: 760 }}>
        <div style={{ ...type(26, 650, { caps: true }), letterSpacing: '0.24em', color: L.accent, opacity: head, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ width: 36, height: 3, background: L.accent, borderRadius: 2 }} />
          Tideway API · requests / min
        </div>
        <div style={{ marginTop: 34, ...type(124, 750), color: L.ink }}>
          <TextReveal text="Rate limit" by="word" variant="rise" start={2} each={18} gap={5} />
        </div>
        <div style={{ ...type(124, 750), color: L.accent, height: 130 }}>
          <TextReveal text="tripled." by="char" variant="rise" start={98} each={14} gap={1.6} />
        </div>
        <div style={{ marginTop: 40, height: 60, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{
            height: 60, padding: '0 24px', borderRadius: 30, display: 'flex', alignItems: 'center', background: alpha(L.accent2, 0.12),
            border: `1px solid ${alpha(L.accent2, 0.35)}`, color: '#00866f', ...type(34, 700), whiteSpace: 'nowrap',
            opacity: Math.min(1, chip * 1.5), transform: `scale(${mix(0.6, 1, chip).toFixed(4)})`, transformOrigin: '0% 50%',
          }}>▲ 200%</div>
          <div style={{ ...type(36, 500, { mono: true }), color: L.ink2, opacity: recap, transform: `translateX(${mix(-16, 0, recap).toFixed(2)}px)`, whiteSpace: 'nowrap' }}>
            140k → 420k
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
