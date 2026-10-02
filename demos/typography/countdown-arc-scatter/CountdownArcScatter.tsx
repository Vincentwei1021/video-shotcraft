// countdown-arc-scatter — 表盘数字扫过：等大数字沿大弧切向排布，整盘扫过 96° 后急停，
// "5" 停在弧顶随即平移落位成标题首字符，其余数字带 blur 原地散去，标题逐词模糊淡入、末词转强调色。
//
// 第二轮重设计（瑞士网格 · 纸面仪表）：
// - look = paper（暖白纸 · 墨 · 朱红）。按 1920×1080 原生作画（不再 480×270 放大）：
//   表盘半径 700px、圆心在画面下方（960,1150），弧顶在 y=450，可视角窗 ±70° 让整条弧横跨画面 ~70%；
//   9 个数字 112px Helvetica 粗体 tabular、切向排布，像刻在一只巨大的纸面仪表上。
// - 盘面层次：数字内侧一圈随盘同速转的细刻度（每 4° 一根、数字位加长）+ 外侧一道静止的发丝弧与
//   朱红读数标（盘面散去后以 35% 留在海报上，标题像是从仪表上读出来的）；
//   朱红指针以 0.35 倍差速回正（"盘 vs 指针"），是扫动段唯一的强调色。
// - 扫动：先 5f 反向蓄力 3°（anticipation），再一记物理弹簧扫 99°→0°（damping 12 / stiffness 60，
//   ~2° 一次可见过冲后急停，像真表针）；快速段每个数字按切向速度做方向性运动模糊。
// - 落位："5" 在回弹落定的同一刻起飞（不留静置），20f 不对称 in-out 平移 + 112→150px 放大到
//   标题首字符槽；其余数字原地失焦淡出（不位移，不和 "5" 抢戏），刻度/指针同步退场。
// - 标题「5 min to install」150px，逐词 blur 淡入（窗重叠 = 一句话），末词 install 转朱红是全片
//   唯一的颜色事件；下方 mono 40px 命令行 `$ npx halyard init` 补一句产品事实。
// - 瑞士网格框：顶部发丝线 + 左右两枚标签（SETUP TIME / HALYARD CLI 4.2），全程 0.6% 极缓推近。
//
// 时间表（30fps，共 100f）：
//   0–5     预备：盘面已在画面里（第 0 帧有数字/刻度），反向蓄力 3°
//   5–34    扫动：弹簧 99°→0°，~24f 冲过 0°（≈−2°）、~34f 落定
//   28–44   其余数字 / 刻度 / 指针失焦淡出（早于 "5" 起飞 4f 先让路）
//   32–52   "5" 平移 + 放大落位
//   42–66   标题三词逐词模糊淡入（"5" 落进一句正在成形的话）；64–76 install → 朱红
//   62–78   命令行升起
//   78–100  hold 22f
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, ramp, mix } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt } from '../../_fixtures/Look';

export const COUNTDOWN_ARC_SCATTER_DURATION = 100;

const L = LOOKS.paper;
const GROT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const NUMS = [45, 35, 28, 22, 17, 10, 5, 4, 3]; // 递减不等距 = 真量程；"5" 在 i=6
const HERO = 6;
const SP = 24; // 相邻数字角距
const R = 700; // 数字所在半径
const CX = 960;
const CY = 1150; // 圆心：弧顶 y = 450
const NUM_SIZE = 112;
const TITLE_SIZE = 150;
const ARC = 800; // 外侧发丝弧半径（弧顶 y = 350）
const SLOT_EM = 0.6; // "5" 的固定槽宽（em）：飞行的 5 与标题槽中心严格对齐
const TITLE_Y = 600;
const WORDS: { text: string; win: [number, number] }[] = [
  { text: 'min', win: [42, 56] },
  { text: 'to', win: [46, 60] },
  { text: 'install', win: [50, 66] },
];
const GAP_EM = 0.24;
// 标题总宽估算（Helvetica Neue Bold 字宽，-0.03em 字距）：只用于整行居中
const TITLE_EM = SLOT_EM + GAP_EM * 3 + 1.69 + 0.88 + 2.68;
const TITLE_X0 = CX - (TITLE_EM * TITLE_SIZE) / 2;
const SLOT_CX = TITLE_X0 + (SLOT_EM * TITLE_SIZE) / 2;

// 盘面转角：0–5 反向蓄力 +3°，5 起弹簧扫到 0（~2° 过冲）
const rotAt = (f: number) => {
  const pre = 96 + 3 * ramp(f, 0, 5, EASE.swift);
  if (f <= 5) return pre;
  return 99 * (1 - springAt(f, 5, { damping: 12, stiffness: 60 }));
};
const HAND0 = 32;
const handAt = (f: number) => ramp(f, HAND0, 20, EASE.swift);
const outAt = (f: number) => ramp(f, 28, 16, EASE.swift);

const deg = Math.PI / 180;
const polar = (a: number, r: number) => ({ x: CX + Math.sin(a * deg) * r, y: CY - Math.cos(a * deg) * r });
const windowOp = (pa: number) => Math.min(1, Math.max(0, (70 - Math.abs(pa)) / 22)); // 弧两端按角度淡入淡出

// 第 i 个数字：中心位置 / 自转 / 透明度 / 字号
const numState = (i: number, f: number) => {
  const pa = (i - HERO) * SP + rotAt(f);
  const p = polar(pa, R);
  let { x, y } = p;
  let rSelf = pa;
  let op = windowOp(pa);
  let size = NUM_SIZE;
  if (i === HERO) {
    const h = handAt(f);
    x = mix(x, SLOT_CX, h);
    y = mix(y, TITLE_Y, h);
    rSelf *= 1 - h;
    size = mix(NUM_SIZE, TITLE_SIZE, h);
    op = Math.max(op, h);
  } else {
    op *= 1 - outAt(f);
  }
  return { x, y, rSelf, op, size };
};

const TICKS = Array.from({ length: 61 }, (_, k) => (k - 30) * 4 - 48); // 盘面角 −168°..+72°（覆盖扫动全程）

export const CountdownArcScatter: React.FC = () => {
  const frame = useCurrentFrame();
  const rot = rotAt(frame);
  const out = outAt(frame);
  const push = 1 + 0.006 * ramp(frame, 0, 100, EASE.smooth);
  const frameIn = ramp(frame, 0, 14, EASE.out);
  const tint = ramp(frame, 64, 12, EASE.swift); // install → 朱红
  const cmd = ramp(frame, 62, 16, EASE.snappy);

  return (
    <AbsoluteFill>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.3 }} fill={null} vignette={0.14} grain={0.05} />

      {/* 瑞士网格框：顶部发丝线 + 标签 */}
      <div style={{ position: 'absolute', left: 120, right: 120, top: 150, height: 1.5, background: alpha(L.ink, 0.5), transform: `scaleX(${frameIn})`, transformOrigin: 'left' }} />
      {[
        { text: 'SETUP TIME', side: 'left' as const },
        { text: 'HALYARD CLI 4.2', side: 'right' as const },
      ].map((l) => (
        <div key={l.text} style={{
          position: 'absolute', top: 104, [l.side]: 120, fontFamily: GROT, fontSize: 28, fontWeight: 700,
          letterSpacing: '0.14em', color: L.ink, opacity: frameIn,
        }}>
          {l.text}
        </div>
      ))}

      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: '50% 50%' }}>
        {/* 盘面：随盘转的细刻度 + 静止发丝弧 + 0.35 倍差速的朱红指针 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: 1 - out }}>
          {TICKS.map((a, k) => {
            const pa = a + rot;
            const op = windowOp(pa);
            if (op <= 0) return null;
            const major = ((a % SP) + SP) % SP === 0;
            const p0 = polar(pa, major ? 584 : 600);
            const p1 = polar(pa, 620);
            return (
              <line key={k} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y}
                stroke={L.ink} strokeOpacity={op * (major ? 0.7 : 0.28)} strokeWidth={major ? 3 : 1.5} strokeLinecap="round" />
            );
          })}
          {(() => {
            const a = rot * 0.35;
            const p0 = polar(a, 490), p1 = polar(a, 566);
            return <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={L.accent} strokeWidth={6} strokeLinecap="round" />;
          })()}
        </svg>

        {/* 外侧静止发丝弧 + 朱红读数标：盘面散去后仍以 35% 留在海报上，作"仪表读数"的记忆 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: (1 - out * 0.65) * frameIn }}>
          <path
            d={`M ${polar(-70, ARC).x} ${polar(-70, ARC).y} A ${ARC} ${ARC} 0 0 1 ${polar(70, ARC).x} ${polar(70, ARC).y}`}
            fill="none" stroke={alpha(L.ink, 0.3)} strokeWidth={1.5}
          />
          <path d={`M ${CX - 13} ${CY - ARC + 8} L ${CX + 13} ${CY - ARC + 8} L ${CX} ${CY - ARC + 30} Z`} fill={L.accent} />
        </svg>

        {/* 数字 */}
        {NUMS.map((n, i) => {
          const s = numState(i, frame);
          if (s.op <= 0.002) return null;
          const a = numState(i, frame - 0.5);
          const b = numState(i, frame + 0.5);
          const isHero = i === HERO;
          const blurOut = isHero ? 0 : out * 6;
          const B = 360; // 局部盒：方向性运动模糊只作用在数字附近
          return (
            <div key={i} style={{ position: 'absolute', left: s.x - B / 2, top: s.y - B / 2, width: B, height: B }}>
              <SpeedBlur vx={b.x - a.x} vy={b.y - a.y} amount={0.16} max={14}>
                <div style={{
                  position: 'absolute', left: B / 2, top: B / 2, width: `${SLOT_EM}em`, textAlign: 'center',
                  fontFamily: GROT, fontWeight: 700, fontSize: s.size, lineHeight: 1, letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums', color: L.ink, opacity: s.op,
                  transform: `translate(-50%,-50%) rotate(${s.rSelf.toFixed(3)}deg)`,
                  filter: blurOut > 0.05 ? `blur(${blurOut.toFixed(2)}px)` : undefined,
                  whiteSpace: 'nowrap',
                }}>
                  {n}
                </div>
              </SpeedBlur>
            </div>
          );
        })}

        {/* 标题：首槽留给飞来的 "5"，其余三词逐词模糊淡入 */}
        <div style={{
          position: 'absolute', left: TITLE_X0, top: TITLE_Y, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center',
          fontFamily: GROT, fontWeight: 700, fontSize: TITLE_SIZE, lineHeight: 1, letterSpacing: '-0.03em', color: L.ink, whiteSpace: 'nowrap',
        }}>
          <span style={{ display: 'inline-block', width: `${SLOT_EM}em` }} />
          {WORDS.map((w, k) => {
            const p = ramp(frame, w.win[0], w.win[1] - w.win[0], EASE.out);
            const last = k === WORDS.length - 1;
            return (
              <span key={k} style={{
                display: 'inline-block', marginLeft: `${GAP_EM}em`, opacity: p,
                transform: `translateY(${((1 - p) * 0.12).toFixed(3)}em)`,
                filter: p < 0.999 ? `blur(${((1 - p) * 10).toFixed(2)}px)` : undefined,
                color: last ? `color-mix(in srgb, ${L.accent} ${(tint * 100).toFixed(1)}%, ${L.ink})` : undefined,
              }}>
                {w.text}
              </span>
            );
          })}
        </div>

        {/* 命令行 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: TITLE_Y + 130, display: 'flex', justifyContent: 'center',
          opacity: cmd, transform: `translateY(${(1 - cmd) * 24}px)`,
        }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 40, color: L.ink2, letterSpacing: '0.01em', padding: '14px 30px',
            border: `1.5px solid ${alpha(L.ink, 0.18)}`, borderRadius: 12, background: alpha('#ffffff', 0.35),
          }}>
            <span style={{ color: L.accent }}>$</span> npx halyard init
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
