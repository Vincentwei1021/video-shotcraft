// 里程表数字滚动大字报（odometer-digit-roll）——全屏王牌指标：每个数位是一只真圆柱滚筒，从左到右逐位"咔哒"锁定。
//
// 第二轮重设计（午夜蓝 · 精密机械计数窗）：
// - look = midnight（深蓝夜 · 电光蓝）。主角 "99.98%"：340px fw800 tabular，四个可滚数位各装在一只深色玻璃槽里
//   （内凹渐变 + 上沿玻璃反光 + 发丝线框），槽里是一只 10 面圆柱滚筒——数字按圆柱投影排布（y = r·sinθ、
//   纵向压缩 cosθ、越转到背面越暗），邻位数字在槽口上下以压扁的暗影露出一线，读作真机械，而不是平移的字条。
//   小数点与 % 不滚，一直驻场。
// - 运动：0–8f 匀加速到全速 0.85 格/帧；位 i 于 22+i·8f 起 Hermite 减速（初速与满速衔接、无速度折点）冲过目标
//   0.4 格，再 8f 回落咔哒锁定（"哒、哒、哒、哒"）；滚动中按转速给纵向高斯模糊（封顶 14px），数字为次级蓝灰，
//   锁定瞬间转白并有一次 6f 的槽内闪亮。
// - 合计确认（72f）：整排一次快起慢落的"顿挫"（1→1.025→1）、% 转电光蓝、数字背后一团蓝色泛光、下方一条电光细线
//   从中间向两侧拉开（全片唯一一次光效），随后标题与副标题逐词升起。品牌 Parallax Cloud（虚构）。
//
// 时间表（30fps，共 150f）：
//   0–8     预备：槽与驻场字符在场，四位从静止加速（开场第 1 帧就是满画面的计数窗）
//   8–22    全速滚动（悬念：它会停在几？）
//   22–72   逐位减速锁定：位 0/1/2/3 于 46/54/62/70f 停稳（间隔 8f，从左到右）
//   72–86   合计确认：顿挫、泛光、细线拉开、% 变色
//   80–104  标题 "API uptime across 14 regions" 逐词升起，副标题随后
//   104–150 hold：整体极缓推近 1.0→1.025，尾帧是完整的指标海报
import React from 'react';
import { AbsoluteFill, interpolateColors, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const ODOMETER_DIGIT_ROLL_DURATION = 150;

const L = LOOKS.midnight;
const FS = 340; // 数字字号
const FACE = 330; // 圆柱一格的弧长（≈ 行高）
const R_CYL = FACE / (2 * Math.tan(Math.PI / 10)); // 10 面圆柱半径：相邻两格弧长 = FACE
const SLOT_W = 236;
const SLOT_H = 470;
const SLOT_GAP = 16;
const CY = 500; // 槽中线（屏幕 y）
const SPIN = 0.85; // 全速：格/帧
const SPINUP = 8; // 起步加速帧
const DIGITS = [9, 9, 9, 8]; // "99.98" 中可滚的四位（必须是真值的各位）
const DECEL = 16; // 减速段
const BACK = 8; // 过冲回落段
const OVER = 0.4; // 过冲（格）
const decelAt = (i: number) => 22 + i * 8;
const lockAt = (i: number) => decelAt(i) + DECEL + BACK;
const LOCK = lockAt(3); // 72：合计确认

const INK_ROLL = '#6f7fa8'; // 滚动中的次级蓝灰

// 匀加速起步：f<SPINUP 时 p=SPIN·f²/(2·SPINUP)，之后匀速；在 SPINUP 处位置、速度都连续
const PHASE = [0, 3.4, 6.1, 1.7]; // 各位起始相位错开（开场四位不是同一个数字，免得读作复制粘贴）
const spinPos = (f: number, i: number) => {
  const x = Math.max(f, 0);
  return PHASE[i] + (x < SPINUP ? (SPIN * x * x) / (2 * SPINUP) : SPIN * (x - SPINUP / 2));
};
// 三次 Hermite：p0→p1，端点速度 m0/m1（格/帧），dur 帧
const hermite = (t: number, p0: number, p1: number, m0: number, m1: number, dur: number) => {
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * dur * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * dur * m1;
};

// 位 i 的滚筒位置（单位：格，连续值）。纯帧函数，天然确定性。
const posAt = (f: number, i: number): number => {
  const s = decelAt(i);
  const p0 = spinPos(s, i);
  const T = Math.ceil((p0 + 5 - DIGITS[i]) / 10) * 10 + DIGITS[i]; // 至少再转 5 格，落在个位 = 目标数字
  if (f < s) return spinPos(f, i);
  if (f < s + DECEL) return hermite((f - s) / DECEL, p0, T + OVER, SPIN, 0, DECEL);
  if (f < s + DECEL + BACK) return mix(T + OVER, T, ramp(f, s + DECEL, BACK, EASE.swift));
  return T;
};

// 单只滚筒：圆柱投影排布当前位附近 ±2 格
const Drum: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const pos = posAt(frame, i);
  const speed = Math.abs(posAt(frame + 0.5, i) - posAt(frame - 0.5, i)); // 格/帧
  const blur = Math.min(14, speed * FACE * 0.045);
  const lf = lockAt(i);
  const lockK = ramp(frame, lf - 3, 4, EASE.out); // 次级蓝灰 → 白
  const flash = ramp(frame, lf, 2, EASE.out) * (1 - ramp(frame, lf + 2, 10, EASE.out)); // 锁定瞬间槽内闪亮
  const base = interpolateColors(lockK, [0, 1], [INK_ROLL, L.ink]);
  const faces: React.ReactNode[] = [];
  const k0 = Math.floor(pos);
  for (let k = k0 - 2; k <= k0 + 3; k++) {
    const th = (k - pos) * (Math.PI / 5); // 相对正面的角度（正 = 在下方）
    if (Math.abs(th) > Math.PI * 0.46) continue;
    const c = Math.cos(th);
    const y = R_CYL * Math.sin(th);
    const shade = 0.12 + 0.88 * Math.pow(c, 2.2); // 转向背面越暗
    faces.push(
      <div key={k} style={{
        position: 'absolute', left: 0, width: SLOT_W, top: SLOT_H / 2 - FACE / 2, height: FACE, lineHeight: `${FACE}px`, textAlign: 'center',
        ...type(FS, 800), letterSpacing: '0em', color: base, opacity: shade,
        transform: `translateY(${y.toFixed(2)}px) scaleY(${c.toFixed(4)})`,
      }}>{((k % 10) + 10) % 10}</div>,
    );
  }
  return (
    <div style={{
      position: 'relative', width: SLOT_W, height: SLOT_H, borderRadius: 30, overflow: 'hidden',
      background: `linear-gradient(180deg, #02040b 0%, #0b1328 30%, #111b38 50%, #0b1328 70%, #02040b 100%)`,
      boxShadow: `inset 0 0 0 1px ${L.line}, inset 0 18px 30px rgba(0,0,0,0.65), inset 0 -18px 30px rgba(0,0,0,0.65), 0 30px 60px -20px rgba(0,0,0,0.8)`,
    }}>
      {blur > 0.4 && (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id={`b${id}`} x="-10%" y="-30%" width="120%" height="160%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <div style={{ position: 'absolute', inset: 0, filter: blur > 0.4 ? `url(#b${id})` : undefined }}>{faces}</div>
      {/* 锁定闪亮：槽内一层电光蓝 */}
      {flash > 0.01 && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 45% at 50% 50%, ${alpha(L.accent, 0.35 * flash)}, transparent 70%)` }} />}
      {/* 圆柱明暗：上下压暗 + 中线偏上的一道受光 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(180deg, rgba(2,4,11,0.92) 0%, rgba(2,4,11,0.35) 20%, rgba(2,4,11,0) 34%, rgba(255,255,255,0.03) 44%, rgba(2,4,11,0) 60%, rgba(2,4,11,0.35) 80%, rgba(2,4,11,0.92) 100%)`,
      }} />
      {/* 玻璃上沿反光 */}
      <div style={{ position: 'absolute', left: 10, right: 10, top: 6, height: 70, borderRadius: '24px 24px 60% 60%', background: 'linear-gradient(180deg, rgba(200,215,255,0.10), rgba(200,215,255,0))' }} />
    </div>
  );
};

// 不滚动的驻场字符（小数点 / %）：与滚筒正面同一字号、同一行盒，基线对齐；% 按基线缩小
const BASELINE = (FACE - 1.19 * FS) / 2 + 0.95 * FS; // 行盒内基线 y（系统无衬线 ascent≈0.95 / descent≈0.24）
const StaticGlyph: React.FC<{ ch: string; w: number; color: string; scale?: number; ml?: number; shadow?: string }> = ({ ch, w, color, scale = 1, ml = 0, shadow }) => (
  <div style={{ position: 'relative', width: w * scale, height: SLOT_H, marginLeft: ml }}>
    <div style={{
      position: 'absolute', left: 0, width: w, top: SLOT_H / 2 - FACE / 2, height: FACE, lineHeight: `${FACE}px`, textAlign: 'center',
      ...type(FS, 800), letterSpacing: '0em', color, textShadow: shadow,
      transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: `0px ${BASELINE.toFixed(1)}px`,
    }}>{ch}</div>
  </div>
);

export const OdometerDigitRoll: React.FC = () => {
  const frame = useCurrentFrame();
  // 合计确认：一次快起慢落的顿挫（1→1.025→1，16f）
  const pp = (frame - LOCK) / 16;
  const thump = pp > 0 && pp < 1 ? Math.sin(Math.PI * Math.pow(pp, 0.55)) : 0;
  const push = 1 + 0.025 * ramp(frame, 0, 150, EASE.smooth);
  const scale = push * (1 + 0.025 * thump);
  const bloom = ramp(frame, LOCK, 6, EASE.out) * (1 - 0.6 * ramp(frame, LOCK + 6, 40, EASE.swift));
  const rule = ramp(frame, LOCK + 2, 22, EASE.snappy);
  const pct = interpolateColors(ramp(frame, LOCK, 8, EASE.out), [0, 1], [L.ink, L.accent]);
  const head = ramp(frame, 0, 20, EASE.out);
  const sub = ramp(frame, 94, 16, EASE.out);

  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans, overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.0 }} fill={null} horizon={0.72} intensity={0.85} breathe={0.5} />
      {/* 合计确认泛光：数字背后一团电光蓝 */}
      <div style={{
        position: 'absolute', left: 260, right: 260, top: CY - 300, height: 600, opacity: bloom,
        background: `radial-gradient(ellipse 50% 45% at 50% 50%, ${alpha(L.accent, 0.42)} 0%, ${alpha(L.accent, 0)} 70%)`,
      }} />
      {/* 眉题 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20,
        ...type(26, 650, { caps: true }), letterSpacing: '0.3em', color: L.ink2, opacity: head,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: L.accent2, boxShadow: `0 0 12px ${alpha(L.accent2, 0.8)}` }} />
        Parallax Cloud · Q3 reliability
      </div>
      {/* 计数窗主体 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: CY - SLOT_H / 2, height: SLOT_H, display: 'flex', justifyContent: 'center', alignItems: 'center',
        transform: `scale(${scale.toFixed(4)})`, transformOrigin: `50% ${SLOT_H / 2}px`,
      }}>
        <Drum i={0} frame={frame} />
        <div style={{ width: SLOT_GAP }} />
        <Drum i={1} frame={frame} />
        <StaticGlyph ch="." w={96} color={L.ink} />
        <Drum i={2} frame={frame} />
        <div style={{ width: SLOT_GAP }} />
        <Drum i={3} frame={frame} />
        <StaticGlyph ch="%" w={290} color={pct} scale={0.74} ml={14}
          shadow={frame >= LOCK ? `0 0 ${(30 + 40 * bloom).toFixed(1)}px ${alpha(L.accent, 0.45 * Math.max(0.4, bloom))}` : undefined} />
      </div>
      {/* 电光细线：合计确认时从中间向两侧拉开 */}
      <div style={{
        position: 'absolute', left: 960 - 520 * rule, width: 1040 * rule, top: CY + SLOT_H / 2 + 46, height: 2, borderRadius: 1,
        background: `linear-gradient(90deg, ${alpha(L.accent, 0)} 0%, ${L.accent} 30%, #cfe0ff 50%, ${L.accent} 70%, ${alpha(L.accent, 0)} 100%)`,
        boxShadow: `0 0 16px ${alpha(L.accent, 0.8)}`, opacity: rule > 0 ? 1 : 0,
      }} />
      {/* 标题 + 副标题 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: CY + SLOT_H / 2 + 80, textAlign: 'center', ...type(60, 650), color: L.ink }}>
        <TextReveal text="API uptime across 14 regions" by="word" variant="rise" start={80} each={18} gap={3} />
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: CY + SLOT_H / 2 + 162, textAlign: 'center', ...type(34, 500), color: L.ink2,
        opacity: sub, transform: `translateY(${mix(12, 0, sub).toFixed(2)}px)`,
      }}>
        Trailing 90 days · 26 min total downtime
      </div>
    </AbsoluteFill>
  );
};
