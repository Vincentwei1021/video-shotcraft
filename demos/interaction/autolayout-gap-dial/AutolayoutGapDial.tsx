// autolayout-gap-dial —— framer-ai 4.5–5.5s
// 间距拨盘驱动布局：一个 gap 数值同帧驱动整排导航块的位置、测量线、徽章与读数。
//
// 第二轮重设计（石墨暗场 · 设计工具检查器海报）：
// - look = graphite（近单色暗场）。设计工具的"选择白 + 测量金"两色语义：框选描边/手柄用近白，
//   间距测量线/徽章/拨盘指针用 accent2 香槟金——画面里只有"被拨动的那个数"是有颜色的。
// - 主角是"数"：顶部 196px 超大 tabular 读数（GAP 眉题 + 数值 + px 单位），下面一把 760px 拨盘刻度尺，
//   刻度随 gap 横向滚过中心金针；拨动时读数由白转金、松手后回白——数值就是缰绳。
// - 布局主体：一排 120px 高的导航块（虚构站点 Plinth 的顶部导航），占画宽 ~64–86%；激活项白底黑字，
//   其余是带色相深灰面板 + 发丝线 + 顶部内高光；块按自身速度做横向运动模糊（外侧块位移最大，拖影最长）。
// - 节奏「预备—拉开—屏息—回弹」：开场先把 gap 往里收一点（anticip 预备，12→6），再 swift 不对称曲线
//   拉到 104；hold 一拍屏息；松手后欠阻尼弹簧过冲到比起点更紧再回稳（过冲段 ×0.45 压缩，gap 永不为负）。
//
// 时间表（30fps，共 150f）：
//   0–20    入场：舞台光 + 点阵画布；导航块错峰上浮（父先到）、框选描边从外侧收拢、8 手柄 2f 错峰弹出
//   6–22    读数入场：眉题字距收拢、数值从线下升起、刻度尺淡入
//   22–32   预备：gap 12→6（anticip，观众先看到"往回收"再看到"冲出去"）
//   32–66   主动作：gap 6→104（34f swift），读数逐 2 跳、转金；测量线与徽章实时拉长
//   66–86   屏息 hold 20f：相机极缓推近（总 +2.5%），金色读数停在 104
//   86–118  回弹：spring(damping 9, stiffness 80) 104→~7→12，~118f 落定，读数回白
//   118–150 落定 hold：完整海报（读数 12 + 收紧的导航条），相机继续极缓推进
import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring } from 'remotion';
import { EASE, FONT, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type } from '../../_fixtures/Look';

export const AUTOLAYOUT_GAP_DIAL_DURATION = 150;

const L = LOOKS.graphite;
const FPS = 30;
const SEL = 'rgba(244,244,242,0.92)'; // 选择白：框选描边 / 手柄
const GOLD = L.accent2; // 测量金：间距线 / 徽章 / 指针 / 拨动中的读数

const LABELS = ['Product', 'Pricing', 'Customers', 'Changelog', 'Careers'];
const BLOCK_WIDTHS = [252, 206, 278, 268, 220]; // 不等宽才像真导航
const BLOCK_H = 120;
const ROW_Y = 684; // 行中心
const G_REST = 12;
const G_PRE = 6; // 预备回收值
const G_MAX = 104;

const PRE_START = 22;
const PRE_END = 32;
const GROW_END = 66;
const HOLD_END = 86;
// damping 9 的原始过冲 ≈18%×106px 会把 gap 拉成负数；过冲段 ×0.45 → 最紧约 6px，仍"比起点更紧再回稳"
const OVERSHOOT_K = 0.45;

// 同一个 gap 参数派生全部几何（块位置、测量线、徽章、读数、刻度尺）
const gapAt = (f: number) => {
  if (f < PRE_END) return G_REST + (G_PRE - G_REST) * ramp(f, PRE_START, PRE_END - PRE_START, EASE.swift);
  if (f < HOLD_END) return G_PRE + (G_MAX - G_PRE) * ramp(f, PRE_END, GROW_END - PRE_END, EASE.swift);
  const s = spring({ frame: f - HOLD_END, fps: FPS, config: { damping: 9, stiffness: 80, mass: 1.1 } });
  const s2 = s > 1 ? 1 + (s - 1) * OVERSHOOT_K : s;
  return G_MAX + (G_REST - G_MAX) * s2;
};

// 两个 hex 颜色按 t 混合
const mixHex = (a: string, b: string, t: number) => {
  const pa = a.match(/[0-9a-f]{2}/gi)!.map((h) => parseInt(h, 16));
  const pb = b.match(/[0-9a-f]{2}/gi)!.map((h) => parseInt(h, 16));
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${pa.slice(0, 3).map((x, i) => Math.round(x + (pb[i] - x) * k)).join(',')})`;
};

const rowLayout = (gap: number) => {
  const total = BLOCK_WIDTHS.reduce((a, b) => a + b, 0) + gap * (BLOCK_WIDTHS.length - 1);
  const startX = (1920 - total) / 2;
  const xs: number[] = [];
  let acc = startX;
  for (const w of BLOCK_WIDTHS) {
    xs.push(acc);
    acc += w + gap;
  }
  return { total, startX, xs };
};

const IconAutoLayout: React.FC<{ c: string; size?: number }> = ({ c, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x={1} y={3} width={3.4} height={8} rx={1} fill={c} />
    <rect x={5.3} y={3} width={3.4} height={8} rx={1} fill={c} opacity={0.7} />
    <rect x={9.6} y={3} width={3.4} height={8} rx={1} fill={c} opacity={0.45} />
  </svg>
);

// 拨盘刻度尺：每 1 单位 = UNIT px，中心金针读当前 gap
const RULER_W = 760;
const UNIT = 6.5;
const Ruler: React.FC<{ gap: number; op: number; hot: number }> = ({ gap, op, hot }) => {
  const ticks: React.ReactNode[] = [];
  for (let u = -60; u <= 180; u += 2) {
    const x = RULER_W / 2 + (u - gap) * UNIT;
    if (x < -10 || x > RULER_W + 10) continue;
    const major = u % 10 === 0;
    const edge = Math.max(0, Math.min(1, Math.min(x, RULER_W - x) / 150)); // 两端淡出
    const near = Math.abs(x - RULER_W / 2);
    ticks.push(
      <div key={u} style={{
        position: 'absolute', left: x - 1, bottom: 0, width: 2, height: major ? 30 : 14, borderRadius: 1,
        background: u < 0 ? alpha(L.ink, 0.08) : major ? alpha(L.ink, 0.5) : alpha(L.ink, 0.22), opacity: edge,
      }} />,
    );
    if (major && u >= 0) {
      ticks.push(
        <div key={`l${u}`} style={{
          position: 'absolute', left: x, bottom: 40, transform: 'translateX(-50%)',
          ...type(22, 500, { mono: true }), color: L.ink3,
          opacity: edge * Math.min(1, Math.max(0, (near - 18) / 22)), // 靠近指针的数字让位
        }}>{u}</div>,
      );
    }
  }
  return (
    <div style={{ position: 'absolute', left: 960 - RULER_W / 2, top: 414, width: RULER_W, height: 76, opacity: op }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>{ticks}</div>
      {/* 基线 */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, background: `linear-gradient(90deg, transparent, ${alpha(L.ink, 0.18)} 20%, ${alpha(L.ink, 0.18)} 80%, transparent)` }} />
      {/* 金针：拨动时泛光 */}
      <div style={{
        position: 'absolute', left: RULER_W / 2 - 1.5, bottom: -6, width: 3, height: 50, borderRadius: 2, background: GOLD,
        boxShadow: `0 0 ${8 + hot * 14}px ${alpha(GOLD, 0.35 + hot * 0.4)}`,
      }} />
      <div style={{
        position: 'absolute', left: RULER_W / 2 - 8, bottom: 44, width: 0, height: 0,
        borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: `10px solid ${GOLD}`,
      }} />
    </div>
  );
};

export const AutolayoutGapDial: React.FC = () => {
  const frame = useCurrentFrame();

  const gap = gapAt(frame);
  const gapShown = Math.max(0, Math.round(gap / 2) * 2); // 逐格跳数（步进 2 = 拨盘咔哒的颗粒）
  const v = gapAt(frame + 0.5) - gapAt(frame - 0.5); // gap 速度（px/帧）
  const moving = Math.min(1, Math.abs(v) / 1.2);
  // 拨动热度：读数白→金，带 ~6f 余温（松手回稳后慢慢褪回白）
  let hot = 0;
  for (let k = 0; k <= 6; k++) hot = Math.max(hot, Math.min(1, Math.abs(gapAt(frame - k + 0.5) - gapAt(frame - k - 0.5)) / 1.5) * (1 - k / 7));
  // 跳数脉冲：相位由数值本身驱动（每跨一个步进格脉冲一次）× 速度门限
  const tickPulse = 1 + 0.06 * Math.abs(Math.sin((Math.PI * gap) / 2)) * moving;

  const { total, startX, xs } = rowLayout(gap);

  // 相机：整段极缓推近（smooth，起止无速度突变）
  const cam = 1 + 0.025 * ramp(frame, 0, AUTOLAYOUT_GAP_DIAL_DURATION, EASE.smooth);

  // 框选描边：spring 从外侧 26px 收拢
  const selIn = springAt(frame, 4, { damping: 16, stiffness: 140 });
  const pad = 30;
  const grow = (1 - selIn) * 26;
  const selX = startX - pad - grow;
  const selW = total + pad * 2 + grow * 2;
  const selY = ROW_Y - BLOCK_H / 2 - pad - grow;
  const selH = BLOCK_H + pad * 2 + grow * 2;

  const measOp = ramp(frame, 14, 10, EASE.out);
  const eyebrow = ramp(frame, 4, 18, EASE.snappy);
  const numIn = ramp(frame, 8, 18, EASE.snappy);
  const rulerIn = ramp(frame, 12, 16, EASE.out);

  // 读数颜色：白 ↔ 金
  const numColor = mixHex(L.ink, GOLD, hot);

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.0 }} fill={{ x: 0.5, y: 1.05 }} horizon={0.62} breathe={0.4}>
        {/* 画布点阵：围绕导航条清楚、四周隐去 */}
        <AbsoluteFill style={{
          backgroundImage: `radial-gradient(${alpha(L.ink, 0.13)} 1.4px, transparent 1.7px)`,
          backgroundSize: '36px 36px', backgroundPosition: '6px 16px',
          WebkitMaskImage: 'radial-gradient(ellipse 52% 40% at 50% 62%, #000 20%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 52% 40% at 50% 62%, #000 20%, transparent 100%)',
        }} />
        {/* 导航条落脚的光池：条子"站"在画布上 */}
        <div style={{
          position: 'absolute', left: 260, right: 260, top: ROW_Y + 40, height: 200,
          background: `radial-gradient(ellipse 50% 50% at 50% 30%, ${alpha(L.light, 0.1)} 0%, transparent 70%)`,
        }} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: '50% 52%' }}>
        {/* ── 读数：眉题 + 超大数值 + 单位 ── */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
          opacity: eyebrow, letterSpacing: `${(0.28 + (1 - eyebrow) * 0.4).toFixed(3)}em`,
          ...type(22, 600, { caps: true }), color: L.ink2,
        }}>
          <IconAutoLayout c={L.ink2} />
          <span style={{ letterSpacing: 'inherit' }}>Auto layout · Gap</span>
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 186, height: 220, overflow: 'hidden',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 18,
            transform: `translateY(${((1 - numIn) * 105).toFixed(2)}%)`,
          }}>
            <span style={{
              ...type(196, 300), letterSpacing: '-0.05em', color: numColor, display: 'inline-block',
              minWidth: '1.9em', textAlign: 'right', transform: `scale(${tickPulse})`, transformOrigin: '100% 80%',
              textShadow: hot > 0.05 ? `0 0 ${(40 * hot).toFixed(1)}px ${alpha(GOLD, 0.35 * hot)}` : undefined,
            }}>{gapShown}</span>
            <span style={{ ...type(60, 500), color: L.ink3, width: '1.9em' }}>px</span>
          </div>
        </div>
        <Ruler gap={gap} op={rulerIn} hot={hot} />

        {/* ── 导航块（Plinth 站点顶部导航） ── */}
        {BLOCK_WIDTHS.map((w, i) => {
          const inP = ramp(frame, 1 + i * 2, 16, EASE.snappy);
          const active = i === 0;
          const vx = (i - 2) * v; // 块速度 = (i−2)·dgap/dt：外侧块位移最大
          const blur = Math.min(9, Math.abs(vx) * 0.5);
          const fid = `nb${i}`;
          const dy = (1 - inP) * 34;
          return (
            <div key={i} style={{
              position: 'absolute', left: xs[i], top: ROW_Y - BLOCK_H / 2, width: w, height: BLOCK_H,
              opacity: inP, transform: `translateY(${dy.toFixed(2)}px)`,
            }}>
              {blur > 0.5 && (
                <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
                  <filter id={fid} x="-20%" y="-10%" width="140%" height="120%" colorInterpolationFilters="sRGB">
                    <feGaussianBlur stdDeviation={`${blur.toFixed(2)} 0`} />
                  </filter>
                </svg>
              )}
              <div style={{
                position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 24,
                background: active ? 'linear-gradient(180deg, #fbfbf8, #e6e6e1)' : 'linear-gradient(180deg, #212327, #17181b)',
                border: active ? '1px solid rgba(255,255,255,0.7)' : `1px solid ${alpha('#ffffff', 0.09)}`,
                boxShadow: active
                  ? `inset 0 1px 0 rgba(255,255,255,1), inset 0 -2px 0 rgba(0,0,0,0.08), ${softShadow(18, { color: '#000000', strength: 2.4 })}`
                  : `inset 0 1px 0 ${alpha('#ffffff', 0.08)}, ${softShadow(12, { color: '#000000', strength: 2.4 })}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
                filter: blur > 0.5 ? `url(#${fid})` : undefined,
              }}>
                {active && <div style={{ width: 12, height: 12, borderRadius: 99, background: '#111214' }} />}
                <span style={{ ...type(36, active ? 650 : 520), color: active ? '#0d0e10' : alpha(L.ink, 0.86) }}>{LABELS[i]}</span>
              </div>
            </div>
          );
        })}

        {/* ── 框选描边 + 8 手柄 + 图层名 ── */}
        <div style={{
          position: 'absolute', left: selX, top: selY, width: selW, height: selH, boxSizing: 'border-box',
          border: `2px solid ${SEL}`, borderRadius: 6, opacity: Math.min(1, selIn * 1.4),
        }}>
          <div style={{
            position: 'absolute', left: -2, top: -50, display: 'flex', alignItems: 'center', gap: 10,
            ...type(26, 560), color: SEL, whiteSpace: 'nowrap',
          }}>
            <IconAutoLayout c={SEL} size={20} />
            Nav links
            <span style={{ ...type(22, 500, { mono: true }), color: L.ink3, marginLeft: 8 }}>
              {Math.round(total)} × {BLOCK_H}
            </span>
          </div>
          {[[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]].map(([hx, hy], i) => {
            const hp = springAt(frame, 7 + i * 1.2, { damping: 13, stiffness: 240 });
            return (
              <div key={i} style={{
                position: 'absolute', left: `${hx * 100}%`, top: `${hy * 100}%`, width: 16, height: 16, marginLeft: -8, marginTop: -8,
                background: L.bg[1], border: `2px solid ${SEL}`, borderRadius: 3, boxSizing: 'border-box', transform: `scale(${hp})`,
              }} />
            );
          })}
        </div>

        {/* ── 间距标注：延长线 ×2 + 测量线 + 徽章（全部由 gap 实时重算） ── */}
        {xs.slice(0, -1).map((x, i) => {
          const gx = x + BLOCK_WIDTHS[i];
          const cy = ROW_Y + BLOCK_H / 2 + 74;
          const extTop = ROW_Y + BLOCK_H / 2 + 34;
          const span = Math.max(0, gap);
          const bp = ramp(frame, 14 + i * 2, 12, EASE.snappy);
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, opacity: measOp }}>
              {[gx, gx + gap].map((lx, k) => (
                <div key={k} style={{
                  position: 'absolute', left: lx - 0.75, top: extTop, width: 1.5, height: 58,
                  backgroundImage: `linear-gradient(${GOLD} 55%, transparent 55%)`, backgroundSize: '1.5px 7px', opacity: 0.7,
                }} />
              ))}
              <div style={{ position: 'absolute', left: gx, top: cy - 1, width: span, height: 2, background: GOLD, boxShadow: `0 0 10px ${alpha(GOLD, 0.4)}` }} />
              <div style={{ position: 'absolute', left: gx - 1, top: cy - 8, width: 2, height: 16, background: GOLD }} />
              <div style={{ position: 'absolute', left: gx + gap - 1, top: cy - 8, width: 2, height: 16, background: GOLD }} />
              <div style={{
                position: 'absolute', left: gx + gap / 2, top: cy + 20,
                transform: `translateX(-50%) translateY(${((1 - bp) * 10).toFixed(1)}px) scale(${(tickPulse * (0.7 + 0.3 * bp)).toFixed(3)})`,
                opacity: bp, minWidth: 64, textAlign: 'center', boxSizing: 'border-box', padding: '6px 14px', borderRadius: 10,
                background: GOLD, color: L.onAccent, ...type(28, 700), lineHeight: 1.1,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 6px 18px -6px ${alpha(GOLD, 0.6)}`,
              }}>{gapShown}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
