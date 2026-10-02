// autolayout-gap-dial —— framer-ai 4.5–5.5s
// 一排导航链接块带框选描边 + 间距标注徽章，徽章数字逐格跳动，
// 链接块被参数实时推开（flex gap 插值），标注线跟随。
// demo 放大做：间距从紧(12)拉到松(110)，再弹簧回弹归位。
// 改版：顶部"GAP 读数"做成设计工具的 Auto layout 检查器（数值框 + 拨盘刻度尺），
// 链接块换成真实导航文案，框选/测量用设计工具母语配色（选择蓝 + 间距粉），细线、软阴影、柔光底。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, ramp, softShadow, tracking } from '../../_fixtures/Polish';

export const AUTOLAYOUT_GAP_DIAL_DURATION = 120;

const FPS = 30;
const BLOCK_WIDTHS = [230, 190, 265, 210, 245];
const LABELS = ['Overview', 'Pricing', 'Customers', 'Changelog', 'Templates'];
const BLOCK_H = 100;
const ROW_Y = 590; // 行中心
const G_MIN = 12;
const G_MAX = 110;

const GROW_START = 14;
const GROW_END = 52; // 去程 38f inOut cubic
const HOLD_END = 66; // hold 14f
// 弹簧过冲段压缩系数：damping 9 原始过冲 ≈18%·98px 会把 gap 拉成负数（块互相重叠、徽章读 0），
// 过冲部分 ×0.45 → 最紧约 4px：仍"缩到比起点更紧再回稳"，但永不穿帮
const OVERSHOOT_K = 0.45;

const SEL = '#2f7cf6'; // 选择蓝（框选描边/手柄/图层名）
const MEASURE = '#ef4f7d'; // 间距粉（测量线/徽章）

// 同一个 gap 参数派生全部几何（块位置、测量线、徽章、读数、刻度尺）
const gapAt = (f: number) => {
  if (f < HOLD_END) {
    return interpolate(f, [GROW_START, GROW_END], [G_MIN, G_MAX], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    });
  }
  const s = spring({ frame: f - HOLD_END, fps: FPS, config: { damping: 9, stiffness: 80, mass: 1.1 } });
  const s2 = s > 1 ? 1 + (s - 1) * OVERSHOOT_K : s;
  return G_MAX + (G_MIN - G_MAX) * s2;
};

// 设计工具小图标（内联 SVG，确定性）
const IconArrowRight: React.FC<{ c: string }> = ({ c }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <path d="M3 9h11M10 5l4 4-4 4" stroke={c} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconArrowDown: React.FC<{ c: string }> = ({ c }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <path d="M9 3v11M5 10l4 4 4-4" stroke={c} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconGap: React.FC<{ c: string }> = ({ c }) => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <rect x={2.5} y={4} width={4} height={12} rx={1.2} stroke={c} strokeWidth={1.5} />
    <rect x={13.5} y={4} width={4} height={12} rx={1.2} stroke={c} strokeWidth={1.5} />
    <path d="M8.5 10h3" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
  </svg>
);
const IconAutoLayout: React.FC<{ c: string; size?: number }> = ({ c, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x={1} y={3} width={3.4} height={8} rx={1} fill={c} />
    <rect x={5.3} y={3} width={3.4} height={8} rx={1} fill={c} opacity={0.7} />
    <rect x={9.6} y={3} width={3.4} height={8} rx={1} fill={c} opacity={0.45} />
  </svg>
);

export const AutolayoutGapDial: React.FC = () => {
  const frame = useCurrentFrame();

  const gap = gapAt(frame);
  const gapShown = Math.round(gap / 2) * 2; // 徽章逐格跳数（步进 2）
  const v = gapAt(frame + 0.5) - gapAt(frame - 0.5); // gap 速度（px/帧）

  // 跳数脉冲：相位由数值本身驱动（每跨一个步进格脉冲一次）× 速度门限——静止时为 1，拨动时逐格"咔哒"
  const tickPulse = 1 + 0.1 * Math.abs(Math.sin((Math.PI * gap) / 2)) * Math.min(1, Math.abs(v) / 1.2);

  // 布局：居中排布
  const total = BLOCK_WIDTHS.reduce((a, b) => a + b, 0) + gap * (BLOCK_WIDTHS.length - 1);
  const startX = (1920 - total) / 2;
  const xs: number[] = [];
  let acc = startX;
  for (const w of BLOCK_WIDTHS) {
    xs.push(acc);
    acc += w + gap;
  }

  // 框选描边入场（spring 收拢到位）+ 手柄晚 2–4f 依次弹出
  const selIn = spring({ frame: frame - 2, fps: FPS, config: { damping: 14, stiffness: 130 } });
  const pad = 26;
  const grow = (1 - selIn) * 18; // 入场时描边从外侧 18px 收拢
  const selX = startX - pad - grow;
  const selW = total + pad * 2 + grow * 2;
  const selY = ROW_Y - BLOCK_H / 2 - pad - grow;
  const selH = BLOCK_H + pad * 2 + grow * 2;

  // 标注淡入 8–16f
  const badgeOp = interpolate(frame, [8, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 检查器面板入场
  const panelIn = ramp(frame, 0, 16, EASE.snappy);

  // 拨盘刻度尺：每 1 单位 = 6px，中心指针读当前 gap
  const RULER_W = 392; // 与数值框同宽、同中心
  const UNIT = 6;
  const ticks: React.ReactNode[] = [];
  for (let u = -40; u <= 160; u += 2) {
    const x = RULER_W / 2 + (u - gap) * UNIT;
    if (x < -10 || x > RULER_W + 10) continue;
    const major = u % 10 === 0;
    const edge = Math.min(1, Math.min(x, RULER_W - x) / 70); // 两端淡出
    ticks.push(
      <div key={u} style={{
        position: 'absolute', left: x - 0.75, bottom: 0, width: 1.5, height: major ? 18 : 9, borderRadius: 1,
        background: u < 0 ? 'rgba(20,22,28,0.12)' : major ? G.ink2 : G.ink3, opacity: Math.max(0, edge),
      }} />,
    );
    if (major && u >= 0) {
      ticks.push(
        <div key={`l${u}`} style={{
          position: 'absolute', left: x, bottom: 24, transform: 'translateX(-50%)', fontSize: 13, color: G.ink3,
          fontVariantNumeric: 'tabular-nums',
          // 靠近中心指针的刻度数字让位（不和指针叠字）
          opacity: Math.max(0, edge) * Math.min(1, Math.max(0, (Math.abs(x - RULER_W / 2) - 10) / 16)),
        }}>{u}</div>,
      );
    }
  }

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.3 }} accent={SEL} grain={0} />
      {/* 画布点阵：中心清楚、四周隐去 */}
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(20,22,28,0.13) 1.6px, transparent 1.8px)',
          backgroundSize: '40px 40px',
          backgroundPosition: '20px 10px',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 62% at 50% 52%, #000 30%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 60% 62% at 50% 52%, #000 30%, transparent 100%)',
        }}
      />

      {/* Auto layout 检查器：顶部读数块（GAP 数值框 + 拨盘刻度尺），与布局同源同帧 */}
      <div style={{
        position: 'absolute', left: 960 - 270, top: 168, width: 540, height: 196, boxSizing: 'border-box',
        borderRadius: 18, background: 'linear-gradient(180deg, #ffffff, #fbfbfa)',
        border: `1px solid ${G.hairline}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(18)}`,
        padding: '20px 24px 0',
        opacity: panelIn, transform: `translateY(${(1 - panelIn) * -14}px)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 30 }}>
          <span style={{ fontSize: 19, fontWeight: 650, color: G.ink1, letterSpacing: tracking(19) }}>Auto layout</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, padding: 3, borderRadius: 9, background: G.fill, border: `1px solid ${G.hairline}` }}>
            <div style={{ width: 32, height: 26, borderRadius: 6, display: 'grid', placeItems: 'center', background: '#fff', boxShadow: '0 1px 2px rgba(16,18,24,0.12)' }}>
              <IconArrowRight c={G.ink1} />
            </div>
            <div style={{ width: 32, height: 26, borderRadius: 6, display: 'grid', placeItems: 'center' }}>
              <IconArrowDown c={G.ink3} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
          <IconGap c={G.ink2} />
          <span style={{ fontSize: 17, color: G.ink2, fontWeight: 520, width: 52 }}>Gap</span>
          <div style={{
            flex: 1, height: 58, borderRadius: 12, position: 'relative', boxSizing: 'border-box',
            background: '#fff', border: `1.5px solid ${SEL}`,
            boxShadow: `0 0 0 4px rgba(47,124,246,0.12)`,
            display: 'flex', alignItems: 'center', padding: '0 18px',
          }}>
            <span style={{
              display: 'inline-block', fontSize: 40, fontWeight: 680, color: G.ink1, fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em', transform: `scale(${tickPulse})`, transformOrigin: 'left center',
            }}>{gapShown}</span>
            <span style={{ fontSize: 18, color: G.ink3, marginLeft: 6, marginTop: 8 }}>px</span>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: G.ink3, letterSpacing: '0.02em' }}>Fixed</span>
          </div>
        </div>
        {/* 拨盘刻度尺 */}
        <div style={{ position: 'relative', height: 50, marginTop: 10, marginLeft: 100, width: RULER_W, overflow: 'hidden' }}>
          {ticks}
          <div style={{ position: 'absolute', left: RULER_W / 2 - 1, bottom: 0, width: 2, height: 26, borderRadius: 1, background: SEL }} />
          <div style={{
            position: 'absolute', left: RULER_W / 2 - 5, bottom: 24, width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${SEL}`,
          }} />
        </div>
      </div>

      {/* 链接块（真实导航文案；入场 0–12f 错峰上浮） */}
      {BLOCK_WIDTHS.map((w, i) => {
        const inP = ramp(frame, i * 1.6, 12, EASE.out);
        const active = i === 0;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: xs[i],
              top: ROW_Y - BLOCK_H / 2,
              width: w,
              height: BLOCK_H,
              boxSizing: 'border-box',
              borderRadius: 18,
              background: active ? 'linear-gradient(180deg, #23252c, #17181c)' : 'linear-gradient(180deg, #ffffff, #fafaf9)',
              border: active ? '1px solid rgba(255,255,255,0.06)' : `1px solid ${G.hairline}`,
              boxShadow: active
                ? `inset 0 1px 0 rgba(255,255,255,0.10), ${softShadow(6, { strength: 1.6 })}`
                : `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(4)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              opacity: inP,
              transform: `translateY(${(1 - inP) * 14}px)`,
            }}
          >
            {active && <div style={{ width: 9, height: 9, borderRadius: 99, background: '#7ad08f', boxShadow: '0 0 0 3px rgba(122,208,143,0.18)' }} />}
            <span style={{
              fontSize: 30, fontWeight: active ? 620 : 560, color: active ? '#f4f5f7' : G.ink1,
              letterSpacing: tracking(30),
            }}>{LABELS[i]}</span>
          </div>
        );
      })}

      {/* 框选描边 + 8 手柄 + 图层名 */}
      <div
        style={{
          position: 'absolute',
          left: selX,
          top: selY,
          width: selW,
          height: selH,
          border: `2px solid ${SEL}`,
          borderRadius: 4,
          opacity: Math.min(1, selIn * 1.4),
          boxSizing: 'border-box',
        }}
      >
        <div style={{
          position: 'absolute', left: -2, top: -36, display: 'flex', alignItems: 'center', gap: 7,
          color: SEL, fontSize: 18, fontWeight: 600, letterSpacing: '0.005em', whiteSpace: 'nowrap',
        }}>
          <IconAutoLayout c={SEL} />
          Nav links
        </div>
        {[
          [0, 0], [0.5, 0], [1, 0],
          [0, 0.5], [1, 0.5],
          [0, 1], [0.5, 1], [1, 1],
        ].map(([hx, hy], i) => {
          const hp = spring({ frame: frame - 4 - i * 0.6, fps: FPS, config: { damping: 12, stiffness: 220 } });
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${hx * 100}%`,
                top: `${hy * 100}%`,
                width: 14,
                height: 14,
                marginLeft: -7,
                marginTop: -7,
                background: '#fff',
                border: `2px solid ${SEL}`,
                borderRadius: 3,
                boxSizing: 'border-box',
                boxShadow: '0 1px 2px rgba(16,18,24,0.18)',
                transform: `scale(${hp})`,
              }}
            />
          );
        })}
      </div>

      {/* 间距标注：竖直延长线 ×2 + 水平测量线 + 跟随徽章（全部由 gap 实时重算） */}
      {xs.slice(0, -1).map((x, i) => {
        const gx = x + BLOCK_WIDTHS[i]; // 缝隙左缘
        const cy = ROW_Y + BLOCK_H / 2 + 56;
        const extTop = ROW_Y + BLOCK_H / 2 + 6;
        const span = Math.max(0, gap);
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, opacity: badgeOp }}>
            {/* 竖直延长线（虚线） */}
            {[gx, gx + gap].map((lx, k) => (
              <div key={k} style={{
                position: 'absolute', left: lx - 0.75, top: extTop, width: 1.5, height: 62,
                backgroundImage: `linear-gradient(${MEASURE} 55%, transparent 55%)`, backgroundSize: '1.5px 6px', opacity: 0.75,
              }} />
            ))}
            {/* 水平测量线 + 端刺 */}
            <div style={{ position: 'absolute', left: gx, top: cy - 1, width: span, height: 2, background: MEASURE }} />
            <div style={{ position: 'absolute', left: gx - 0.75, top: cy - 6, width: 1.5, height: 12, background: MEASURE }} />
            <div style={{ position: 'absolute', left: gx + gap - 0.75, top: cy - 6, width: 1.5, height: 12, background: MEASURE }} />
            {/* 徽章（钉缝隙中心） */}
            <div
              style={{
                position: 'absolute',
                left: gx + gap / 2,
                top: cy + 16,
                transform: `translateX(-50%) scale(${tickPulse})`,
                minWidth: 58,
                textAlign: 'center',
                boxSizing: 'border-box',
                padding: '5px 12px',
                borderRadius: 9,
                background: MEASURE,
                color: '#fff',
                fontWeight: 650,
                fontSize: 23,
                fontVariantNumeric: 'tabular-nums',
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px -3px rgba(239,79,125,0.45)`,
              }}
            >
              {gapShown}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
