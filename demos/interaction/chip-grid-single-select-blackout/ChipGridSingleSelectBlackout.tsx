// chip-grid-single-select-blackout —— Single Select 1 帧灰闪单选反黑
// 五个选项 chip 3+2 居中排布错峰入场；光标点下：先插 1 帧灰色按压块，紧接 5 帧线性反黑（白字）+ 1→1.04→1 极轻回弹，
// 其余 chip 淡到 18% 但位置锁死；约 1.5s 后余项归零，黑 chip 上移收窄回中线，下方升起结算价格。
//
// 第二轮重设计（瓷白 · 结账页的一次"决定"）：
// - look = porcelain（冷白 · 墨蓝黑 · 钴蓝）。按 1080p 原生排版重写（不再用 480×270 设计坐标放大）：
//   眉题 + 84px 问句「How would you like to pay?」、96px 高的实体 chip（36px 字，发丝线 + 顶部内高光 + 两层软阴影），
//   主体占画宽 ~62%。虚构产品 Tessel 的 Pro 方案结账。
// - 选中两级状态拆开演（本卡命门，参数不变）：56f 单帧灰闪（:active）→ 57–62f 线性反黑（:selected，不加缓动）
//   + sin 回弹 0.04；其余 chip 只降不透明度、transform 恒为 none。新增一只光标从右下走弧线点中它，因果更明确。
// - 黑 chip 被选中后底下亮起一圈极淡的钴蓝落地光（只给主角一次）；收束时上移 + 缩到 0.88 + 横向回中线，
//   阴影随抬升变深变大（离地更高）。
// - 结果段换成大字结算：现价「$34.44」180px tabular + 「/mo」，原价「$42.00」先出现再被一道划线划掉、退灰，
//   钴蓝「Save 18%」胶囊最后 overshoot 弹出——结尾是一张完整的价格海报。
//
// 时间表（30fps，共 165f）：
//   0–14    眉题字距收拢、问句逐词升起
//   8–28    5 个 chip 错峰升起（3f 间隔，snappy）
//   26–54   读题：光标从右下入画、swift 弧线移向「Annual billing」（相机极缓推近 1.5%）
//   56      单帧灰闪（按下）
//   57–62   线性反黑 5f；57–66 回弹；57–66 余项降到 18%（outQuad），位置锁死
//   66–101  选中态 hold ~1.2s（落地光呼吸）；光标 70f 起淡出
//   101–119 收束：余项 101–110 归零；黑 chip 上移 / 缩 0.88 / 回中线（18f smooth in-out）
//   108–134 结算：原价升起 → 118f 划线 → 现价升起（rise）→ 128f Save 18% 弹出
//   134–165 落定 hold 31f
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const CHIP_GRID_SINGLE_SELECT_BLACKOUT_DURATION = 165;

const L = LOOKS.porcelain;
const INK = '#0b1020'; // 反黑目标：墨蓝黑（不用纯 #000）

const NAMES = ['Annual billing', 'Monthly billing', 'Two-year commitment', 'Student', 'Nonprofit rate'];
const WIDTHS = [346, 364, 476, 236, 330]; // chip 固定宽（按 36px 字测得 + 左右 44 内边距）——几何确定，不用运行时测量
const TI = 0; // 选中项
const CHIP_H = 96;
const GAP = 22;
const ROW_Y = [452, 570]; // 两行 chip 的顶
const FS = 56; // 灰闪帧
const COLLAPSE = 101; // 收束起点（选中后 ~1.5s）
const COLLAPSE_DUR = 18;
const TARGET_Y = 330; // 收束后黑 chip 中心 y
const TARGET_S = 0.88; // 收窄到 0.88（字仍 ≈32px，满足辅助字下限）

// 3+2 居中排布的 chip 左上角（位置全程锁死）
const chipPos = (i: number) => {
  const row = i < 3 ? 0 : 1;
  const ids = row === 0 ? [0, 1, 2] : [3, 4];
  const total = ids.reduce((a, k) => a + WIDTHS[k], 0) + GAP * (ids.length - 1);
  let x = (1920 - total) / 2;
  for (const k of ids) {
    if (k === i) break;
    x += WIDTHS[k] + GAP;
  }
  return { x, y: ROW_Y[row] };
};

const lin = (f: number, a: number, b: number) => Math.max(0, Math.min(1, (f - a) / (b - a)));
const outQuad = (t: number) => 1 - (1 - t) * (1 - t);
const h2r = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const mixC = (p: number, a: string, b: string) => {
  const A = h2r(a), B = h2r(b), q = Math.max(0, Math.min(1, p));
  return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * q)).join(',')})`;
};

const Cursor: React.FC<{ frame: number }> = ({ frame }) => {
  const p0 = chipPos(TI);
  const tx = p0.x + WIDTHS[TI] * 0.62, ty = p0.y + CHIP_H * 0.58;
  const p = ramp(frame, 26, FS - 2 - 26, EASE.swift);
  const x = mix(1500, tx, p);
  const y = mix(960, ty, p) - Math.sin(Math.PI * p) * 60;
  const press = frame >= FS - 1 && frame < FS + 6 ? 1 - 0.16 * Math.sin((Math.PI * (frame - FS + 1)) / 7) : 1;
  const show = ramp(frame, 24, 8, EASE.out) * (1 - ramp(frame, 70, 12, EASE.out));
  return (
    <svg width={46} height={50} viewBox="0 0 20 22" style={{
      position: 'absolute', left: x, top: y, transform: `scale(${press.toFixed(3)})`, transformOrigin: '4px 2px', opacity: show,
      filter: `drop-shadow(0 3px 5px ${alpha(L.shadow, 0.28)})`,
    }}>
      <path d="M2 1 L2 17 L6.5 13.2 L9.4 20 L12.4 18.7 L9.5 12 L15 11.6 Z" fill={L.ink} stroke="#ffffff" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
};

export const ChipGridSingleSelectBlackout: React.FC = () => {
  const frame = useCurrentFrame();

  // ── 选中两级状态 ──
  const flash = frame === FS ? 1 : 0; // 就一帧
  const bk = lin(frame, FS + 1, FS + 6); // 线性反黑 5f（故意不缓动）
  const pr = lin(frame, FS + 1, FS + 10);
  const pulse = 1 + Math.sin(pr * Math.PI) * 0.04 * (pr > 0 ? 1 : 0);
  const fade = outQuad(lin(frame, FS + 1, FS + 10));
  const gone = outQuad(lin(frame, COLLAPSE, COLLAPSE + 9));
  const lift = ramp(frame, COLLAPSE, COLLAPSE_DUR, EASE.smooth);

  const p0 = chipPos(TI);
  const c0x = p0.x + WIDTHS[TI] / 2, c0y = p0.y + CHIP_H / 2;
  const dx = (960 - c0x) * lift, dy = (TARGET_Y - c0y) * lift;

  // 相机：读题段极缓推近，收束后回正
  const cam = 1 + 0.015 * ramp(frame, 20, 60, EASE.smooth) - 0.015 * ramp(frame, COLLAPSE, 30, EASE.smooth);

  // 问句随收束让位（上移淡出），把舞台让给结果
  const titleOut = ramp(frame, COLLAPSE - 4, 16, EASE.exit);

  // ── 结算 ──
  const oldIn = ramp(frame, 108, 14, EASE.snappy);
  const strike = ramp(frame, 118, 8, EASE.swift);
  const saveIn = ramp(frame, 128, 14, EASE.overshoot);

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.12 }} fill={null} />

      <AbsoluteFill style={{ transform: `scale(${cam.toFixed(4)})`, transformOrigin: '50% 50%' }}>
        {/* 眉题 + 问句 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 168, textAlign: 'center', opacity: 1 - titleOut, transform: `translateY(${(-30 * titleOut).toFixed(2)}px)` }}>
          <div style={{
            ...type(22, 650, { caps: true }), color: L.accent,
            letterSpacing: `${(0.24 + 0.3 * (1 - ramp(frame, 0, 18, EASE.snappy))).toFixed(3)}em`, opacity: ramp(frame, 0, 10, EASE.out),
          }}>Tessel Pro · Billing cycle</div>
          <div style={{ marginTop: 22 }}>
            <TextReveal text="How would you like to pay?" by="word" variant="rise" start={3} each={16} gap={2.5}
              style={{ ...type(84, 700), color: L.ink }} />
          </div>
        </div>

        {/* chip */}
        {NAMES.map((n, i) => {
          const { x, y } = chipPos(i);
          const inP = ramp(frame, 8 + i * 3, 16, EASE.snappy);
          const sel = i === TI;
          if (!sel) {
            const op = inP * mix(1, 0.18, fade) * (1 - gone);
            return (
              <div key={i} style={{
                position: 'absolute', left: x, top: y + (1 - inP) * 30, width: WIDTHS[i], height: CHIP_H, boxSizing: 'border-box',
                borderRadius: CHIP_H / 2, background: `linear-gradient(180deg, #ffffff, ${L.surface2})`,
                border: `1px solid ${L.line}`, boxShadow: `inset 0 1px 0 #ffffff, ${softShadow(6, { color: L.shadow, strength: 1.1 })}`,
                display: 'grid', placeItems: 'center', opacity: op, transform: 'none',
                ...type(36, 560), color: L.ink,
              }}>{n}</div>
            );
          }
          const elev = 6 + 10 * bk + 26 * lift;
          return (
            <div key={i} style={{
              position: 'absolute', left: x, top: y + (1 - inP) * 30, width: WIDTHS[i], height: CHIP_H, opacity: inP,
              transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${(pulse * mix(1, TARGET_S, lift)).toFixed(4)})`,
            }}>
              {/* 落地光：选中后在 chip 下方亮起，只给主角一次 */}
              <div style={{
                position: 'absolute', left: -120, right: -120, top: CHIP_H * 0.35, height: CHIP_H * 1.3,
                background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent, 0.2 * bk * (1 - 0.5 * lift))} 0%, transparent 70%)`,
                filter: 'blur(6px)',
              }} />
              <div style={{
                position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: CHIP_H / 2, overflow: 'hidden',
                background: bk > 0 ? `linear-gradient(180deg, ${mixC(bk, '#ffffff', '#1d2438')}, ${mixC(bk, '#f3f6fb', INK)})` : `linear-gradient(180deg, #ffffff, ${L.surface2})`,
                border: `1px solid ${bk > 0 ? alpha(INK, 0.1 + 0.9 * bk) : L.line}`,
                boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 1 - 0.85 * bk)}, ${softShadow(elev, { color: L.shadow, strength: 1.1 + 0.9 * bk })}`,
                display: 'grid', placeItems: 'center', ...type(36, 600), color: mixC(bk, L.ink, '#ffffff'),
              }}>
                {/* 按压灰块：1 帧 */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(120,128,146,0.5)', opacity: flash }} />
                <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <svg width={30} height={30} viewBox="0 0 18 18" style={{ marginLeft: -12 * bk, width: 30 * bk, opacity: bk }}>
                    <path d="M3.5 9.5 L7.3 13 L14.5 5" stroke="#ffffff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {n}
                </span>
              </div>
            </div>
          );
        })}

        {/* ── 结算：原价划掉 → 现价 → Save 18% ── */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 452, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 44 }}>
          <div style={{ height: 82, overflow: 'hidden', marginBottom: 0 }}>
            <div style={{ position: 'relative', transform: `translateY(${((1 - oldIn) * 110).toFixed(1)}%)`, ...type(60, 500), color: mixC(strike, L.ink2, L.ink3) }}>
              $42.00
              <div style={{
                position: 'absolute', left: -4, top: '54%', height: 4, borderRadius: 2, background: L.ink3,
                width: `calc(${(strike * 100).toFixed(1)}% + ${(8 * strike).toFixed(1)}px)`,
              }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <TextReveal text="$34.44" by="char" variant="rise" start={116} each={14} gap={1.2}
              style={{ ...type(180, 750), letterSpacing: '-0.05em', color: L.ink }} />
            <span style={{ ...type(48, 500), color: L.ink2, opacity: ramp(frame, 124, 10, EASE.out) }}>/mo</span>
          </div>
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 690, display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            padding: '12px 26px', borderRadius: 99, background: L.accent, color: L.onAccent, ...type(32, 650),
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 10px 26px -10px ${alpha(L.accent, 0.8)}`,
            opacity: Math.min(1, saveIn * 1.5), transform: `translateY(${((1 - saveIn) * 16).toFixed(2)}px) scale(${(0.8 + 0.2 * saveIn).toFixed(3)})`,
          }}>Save 18% · billed $413.28 yearly</div>
        </div>

        <Cursor frame={frame} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
