// needle-sweep-selftest —— 满弧扫针自检（点火仪式：先亮量程，再报真值）
//
// 第二轮重设计（石墨夜 · 豪华座舱仪表）：
// - look = graphite（近单色暗场 + 香槟金点缀）。主角是一组三表座舱仪表：中央大表（R 300）+ 左右小表（R 210，
//   rotateY ±16° 向内环抱，像驾驶舱仪表台），不再是卡片里三只并排的小表。表面是深色同心渐变 + 玻璃月牙反光，
//   发丝线外圈在点火时沿 270° 描出，刻度随指针扫过被"点亮"再回落，红区只占量程末端一小段。
// - 指针：白色锥形针 + 香槟针尖 + 金属轴帽；去程 14f 快起急停甩满全弧（bezier 0.45,0,0.15,1），
//   在满量程"挂" 3f（先亮量程），再以按行程反算阻尼的弹簧回落真值，~7° 一次过冲回摆；高速段画 4 道角向拖影。
// - 读数：盘心下方数字全程跟随指针（自检期是弱灰实时读数，满弧时读到量程上限），落定瞬间转亮白 + 1.1→1 弹出 +
//   香槟单位，读到"它真的在测"。三表从左到右错峰 4f，波浪感。
// - 文案：品牌 Sable（虚构）· 推理集群点火。状态行 "SELF-TEST" 呼吸点 → 全部落定后切到 "All systems nominal" 逐词升起。
//
// 时间表（30fps，共 150f）：
//   0–6     预备：舞台光、三只表的暗轮廓（开场第 1 帧就有东西）
//   4–28    点火：外圈描边（左 4 / 中 8 / 右 12 起，各 16f）、刻度与盘面渐亮
//   16–30   去程：三针错峰 4f（16 / 20 / 24 起）14f 甩满全弧，扫过的刻度依次点亮
//   30–44   满弧挂 3f → 弹簧回落（~10f 到过冲点，~20f 收敛）
//   ~52–66  逐表落定：读数弹出（左 → 中 → 右，"嗒 嗒 嗒"）
//   74–100  状态行切换 + 逐词升起；刻度余辉回落到常态
//   100–150 hold：整组极缓推近 1.0→1.03（光在呼吸），尾帧是完整的仪表台海报
import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const NEEDLE_SWEEP_SELFTEST_DURATION = 150;

const L = LOOKS.graphite;
const GOLD = '#e8c88f'; // 香槟金：针尖、亮弧、单位（唯一点缀色）
const RED = '#ff5a48'; // 红区（功能色，仅量程末端一小段）
const SWEEP = 270; // 表盘总角
const SETTLE_ALL = 66; // 末表落定帧
const SWING = bezier(0.45, 0, 0.15, 1); // 去程：快起急停

type GaugeDef = {
  key: string; cx: number; cy: number; R: number; rotY: number; start: number;
  max: number; target: number; majors: number; minors: number; label: string; unit: string; decimals: number;
};

// 三表：左 温度 / 中 吞吐（主角）/ 右 显存。target = 真值（与量程同单位）
const GAUGES: GaugeDef[] = [
  { key: 'l', cx: 390, cy: 600, R: 222, rotY: 16, start: 16, max: 120, target: 52, majors: 6, minors: 4, label: 'Core temp', unit: '°C', decimals: 0 },
  { key: 'c', cx: 960, cy: 548, R: 322, rotY: 0, start: 20, max: 10, target: 7.8, majors: 10, minors: 5, label: 'Throughput', unit: 'k tok/s', decimals: 1 },
  { key: 'r', cx: 1530, cy: 600, R: 222, rotY: -16, start: 24, max: 100, target: 68, majors: 5, minors: 4, label: 'VRAM', unit: '%', decimals: 0 },
];

// 表盘角 d∈[0,270] → SVG 角 135+d（0=右，顺时针，y 向下）
const pt = (cx: number, cy: number, d: number, r: number): [number, number] => {
  const a = ((135 + d) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const arc = (cx: number, cy: number, d0: number, d1: number, r: number) => {
  const e = Math.max(d0 + 0.01, d1);
  const [x0, y0] = pt(cx, cy, d0, r);
  const [x1, y1] = pt(cx, cy, e, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${e - d0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

// 回程弹簧：按"落过头 7°"反算阻尼比 ζ（超调比 p，ζ = -ln p / √(π² + ln² p)）
const STIFF = 120;
const dampingFor = (travel: number) => {
  const p = Math.min(0.5, 7 / Math.max(1, travel));
  const lp = Math.log(p);
  return 2 * (-lp / Math.sqrt(Math.PI * Math.PI + lp * lp)) * Math.sqrt(STIFF);
};
const GO = 14; // 去程帧
const HANG = 3; // 满弧挂住帧
const LOCK = 40; // 回程起 LOCK 帧后锁死常数（真静止）

const needleAt = (f: number, g: GaugeDef) => {
  const s = g.start;
  const tgt = (g.target / g.max) * SWEEP;
  if (f <= s) return 0;
  if (f <= s + GO) return SWEEP * SWING((f - s) / GO);
  if (f <= s + GO + HANG) return SWEEP;
  if (f >= s + GO + HANG + LOCK) return tgt;
  const k = spring({ frame: f - (s + GO + HANG), fps: 30, config: { stiffness: STIFF, damping: dampingFor(SWEEP - tgt), mass: 1 } });
  return mix(SWEEP, tgt, k);
};
// 落定（读数弹出）帧：回程起 + 18f（过冲回摆已过、肉眼读作停住）
const settleOf = (g: GaugeDef) => g.start + GO + HANG + 18;

const Gauge: React.FC<{ g: GaugeDef; frame: number }> = ({ g, frame }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const { R, start } = g;
  const S = R * 2 + 120; // SVG 画布（留出光晕）
  const C = S / 2;
  const d = needleAt(frame, g);
  const big = R > 250;
  const ign = ramp(frame, start - 12, 16, EASE.out); // 点火：外圈描边进度
  const lightUp = ramp(frame, start - 8, 18, EASE.out); // 盘面 / 刻度亮起
  const dorm = 0.16 + 0.84 * lightUp; // 未点火时刻度以 16% 暗态驻场（开场就看得出是一组仪表）
  const swept = frame <= start + GO + HANG ? d : SWEEP; // 去程扫过的范围
  const afterglow = 1 - ramp(frame, start + GO + HANG, 30, EASE.smooth); // 刻度余辉回落
  const settle = settleOf(g);
  const pop = ramp(frame, settle, 12, EASE.overshoot);
  const live = ramp(frame, settle, 6, EASE.out); // 0 自检弱灰 → 1 亮白
  const redStart = SWEEP * 0.86;

  // 刻度
  const nTicks = g.majors * g.minors;
  const ticks: React.ReactNode[] = [];
  for (let k = 0; k <= nTicks; k++) {
    const dd = (k / nTicks) * SWEEP;
    const major = k % g.minors === 0;
    const red = dd >= redStart - 0.01;
    const [x0, y0] = pt(C, C, dd, R - 16);
    const [x1, y1] = pt(C, C, dd, R - (major ? 44 : 30));
    const hit = swept >= dd - 0.5 ? afterglow : 0; // 被扫过：点亮
    const active = frame > start + GO + HANG && d >= dd - 0.5 ? 0.35 : 0; // 落定后指针以下的刻度略亮
    const op = (red ? 0.55 : major ? 0.34 : 0.16) + (red ? 0.45 : 0.66) * hit + active * (1 - hit);
    ticks.push(
      <line key={k} x1={x0} y1={y0} x2={x1} y2={y1} stroke={red ? RED : '#ffffff'} strokeOpacity={Math.min(1, op) * dorm}
        strokeWidth={major ? (big ? 4 : 3.2) : 1.8} strokeLinecap="round" />,
    );
    if (major) {
      const [lx, ly] = pt(C, C, dd, R - (big ? 76 : 64));
      const v = (k / nTicks) * g.max;
      ticks.push(
        <text key={`t${k}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontFamily={FONT.sans}
          fontSize={big ? 30 : 24} fontWeight={600} fill={red ? RED : '#ffffff'}
          fillOpacity={(red ? 0.85 : 0.42 + 0.5 * hit) * dorm} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(v)}
        </text>,
      );
    }
  }

  // 指针：外圈短针（从盘心读数盘边缘伸到刻度环），局部坐标沿 +x，再 rotate 到 135+deg
  const Rd = R * 0.5; // 盘心读数盘半径
  const n0 = Rd + 10;
  const n1 = R - 18;
  const needle = (deg: number, o: number, k: string, plain = false) => (
    <g key={k} transform={`rotate(${(135 + deg).toFixed(3)} ${C} ${C})`} opacity={o}>
      <path d={`M ${C + n0} ${C - 5.5} L ${C + n1 - 30} ${C - 2.6} L ${C + n1} ${C - 1.2} Q ${C + n1 + 4} ${C} ${C + n1} ${C + 1.2} L ${C + n1 - 30} ${C + 2.6} L ${C + n0} ${C + 5.5} Q ${C + n0 - 4} ${C} ${C + n0} ${C - 5.5} Z`}
        fill={plain ? '#ffffff' : `url(#nd${id})`} />
    </g>
  );
  const dPrev = needleAt(frame - 1, g);
  const dv = d - dPrev; // 角速度（°/帧）
  // 高速段运动拖尾：上一帧角度 → 当前角度之间的扇形（径向渐隐），速度越大越实
  const smearOp = Math.min(1, Math.abs(dv) / 16) * 0.32;
  const smear = Math.abs(dv) > 2 ? (() => {
    const a0 = Math.min(d, dPrev), a1 = Math.max(d, dPrev);
    const [ax, ay] = pt(C, C, a0, n1), [bx, by] = pt(C, C, a1, n1);
    const [cx2, cy2] = pt(C, C, a1, n0), [dx2, dy2] = pt(C, C, a0, n0);
    return (
      <path d={`M ${ax} ${ay} A ${n1} ${n1} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${bx} ${by} L ${cx2} ${cy2} A ${n0} ${n0} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${dx2} ${dy2} Z`}
        fill={`url(#sm${id})`} opacity={smearOp} />
    );
  })() : null;

  // 读数：自检期实时跟随指针（弱灰），落定后亮白弹出
  const val = (d / SWEEP) * g.max;
  const shown = frame >= settle ? g.target : val;
  const num = shown.toFixed(g.decimals);
  const vSize = big ? 148 : 92;

  return (
    <div style={{
      position: 'absolute', left: g.cx - C, top: g.cy - C, width: S, height: S,
      transform: `perspective(2200px) rotateY(${g.rotY}deg)`, transformOrigin: '50% 50%',
    }}>
      <svg width={S} height={S} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <radialGradient id={`face${id}`} cx="50%" cy="42%" r="58%">
            <stop offset="0" stopColor="#24262b" />
            <stop offset="0.7" stopColor="#141518" />
            <stop offset="1" stopColor="#0b0b0d" />
          </radialGradient>
          <radialGradient id={`halo${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0.55" stopColor={GOLD} stopOpacity={0} />
            <stop offset="0.8" stopColor={GOLD} stopOpacity={0.16} />
            <stop offset="1" stopColor={GOLD} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`glass${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.09} />
            <stop offset="0.45" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`nd${id}`} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor="#d9d9d6" />
            <stop offset="0.72" stopColor="#ffffff" />
            <stop offset="0.8" stopColor={GOLD} />
            <stop offset="1" stopColor={GOLD} />
          </linearGradient>
          <radialGradient id={`hub${id}`} cx="38%" cy="32%" r="70%">
            <stop offset="0" stopColor="#5a5c62" />
            <stop offset="0.55" stopColor="#25262a" />
            <stop offset="1" stopColor="#0d0d0f" />
          </radialGradient>
          <filter id={`gl${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={big ? 9 : 7} />
          </filter>
          <radialGradient id={`sm${id}`} gradientUnits="userSpaceOnUse" cx={C} cy={C} r={R}>
            <stop offset="0.55" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="1" stopColor="#ffffff" stopOpacity={1} />
          </radialGradient>
          <radialGradient id={`disc${id}`} cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#1b1c20" />
            <stop offset="1" stopColor="#09090b" />
          </radialGradient>
          <clipPath id={`cl${id}`}><circle cx={C} cy={C} r={R + 4} /></clipPath>
        </defs>
        {/* 点火光晕（盘外一圈香槟色余光，点火时亮起后收敛） */}
        <circle cx={C} cy={C} r={R + 60} fill={`url(#halo${id})`} opacity={lightUp * (0.55 + 0.45 * afterglow)} />
        {/* 盘面 + 玻璃月牙 */}
        <circle cx={C} cy={C} r={R + 4} fill={`url(#face${id})`} opacity={0.6 + 0.4 * lightUp} />
        <g clipPath={`url(#cl${id})`}>
          <ellipse cx={C} cy={C - R * 0.62} rx={R * 0.95} ry={R * 0.55} fill={`url(#glass${id})`} />
        </g>
        {/* 外圈：暗轮廓常驻，点火时发丝线沿 270° 描出 */}
        <circle cx={C} cy={C} r={R + 4} fill="none" stroke="#ffffff" strokeOpacity={0.07} strokeWidth={1.5} />
        <path d={arc(C, C, 0, SWEEP * ign, R + 4)} fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={C} cy={C} r={R - 6} fill="none" stroke="#ffffff" strokeOpacity={0.05 * lightUp} strokeWidth={1} />
        {/* 轨道 + 红区 */}
        <path d={arc(C, C, 0, SWEEP, R - 6)} fill="none" stroke="#ffffff" strokeOpacity={0.06 * lightUp} strokeWidth={6} />
        <path d={arc(C, C, redStart, SWEEP, R - 6)} fill="none" stroke={RED} strokeOpacity={0.7 * lightUp} strokeWidth={6} />
        {/* 指针冲进红区时红区闪亮一下（满量程的"警戒"感），回落即熄 */}
        {d > redStart && (
          <path d={arc(C, C, redStart, SWEEP, R - 6)} fill="none" stroke={RED} strokeOpacity={0.9 * ((d - redStart) / (SWEEP - redStart))} strokeWidth={14} filter={`url(#gl${id})`} />
        )}
        {/* 跟随指针的香槟亮弧 */}
        {d > 0.4 && (
          <>
            <path d={arc(C, C, 0, d, R - 6)} fill="none" stroke={GOLD} strokeOpacity={0.6} strokeWidth={12} filter={`url(#gl${id})`} />
            <path d={arc(C, C, 0, d, R - 6)} fill="none" stroke={GOLD} strokeWidth={6} />
          </>
        )}
        {ticks}
        {/* 指针：拖尾扇形 + 泛光 + 本体 */}
        {smear}
        <g filter={`url(#gl${id})`} opacity={0.55 * lightUp}>{needle(d, 1, 'glow', true)}</g>
        {needle(d, lightUp, 'n')}
        {/* 盘心读数盘：深色凹盘 + 发丝线圈 + 香槟细环（随点火描出） */}
        <circle cx={C} cy={C} r={Rd} fill={`url(#disc${id})`} stroke="#ffffff" strokeOpacity={0.1} strokeWidth={1.2} />
        <path d={arc(C, C, 0, SWEEP * ign, Rd + 7)} fill="none" stroke={GOLD} strokeOpacity={0.35} strokeWidth={1.5} strokeLinecap="round" />
      </svg>
      {/* 读数：盘心读数盘里，数字 + 单位两行 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: C - vSize * 0.62, textAlign: 'center', whiteSpace: 'nowrap',
        transform: `scale(${mix(1.12, 1, pop * live + (1 - live)).toFixed(4)})`, opacity: lightUp,
      }}>
        <div style={{ ...type(vSize, 700), letterSpacing: '-0.04em', color: live > 0.5 ? L.ink : alpha(L.ink, 0.3), textShadow: live > 0.5 ? `0 0 ${(40 * (1 - pop) + 18).toFixed(1)}px ${alpha(GOLD, 0.25)}` : undefined }}>{num}</div>
        <div style={{ ...type(big ? 34 : 30, 600), marginTop: big ? 6 : 4, color: live > 0.5 ? GOLD : alpha(L.ink, 0.22) }}>{g.unit}</div>
      </div>
      {/* 指标名：表盘底部缺口 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: C + R * 0.74, textAlign: 'center',
        ...type(32, 600, { caps: true }), letterSpacing: '0.18em', color: L.ink2, opacity: lightUp,
      }}>
        {g.label}
      </div>
    </div>
  );
};

export const NeedleSweepSelftest: React.FC = () => {
  const frame = useCurrentFrame();
  const push = 1 + 0.03 * ramp(frame, 30, 120, EASE.smooth); // 整组极缓推近
  const head = ramp(frame, 0, 22, EASE.out);
  const done = frame >= SETTLE_ALL + 8;
  const testOp = 1 - ramp(frame, SETTLE_ALL + 2, 8, EASE.exit);
  const pulse = 0.5 + 0.5 * Math.cos((frame / 9) * Math.PI);
  const okDot = ramp(frame, SETTLE_ALL + 8, 10, EASE.overshoot);
  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans, overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={{ x: 0.5, y: 1.05 }} horizon={0.9} intensity={0.9} breathe={0.6} />
      {/* 仪表台：整组一起极缓推近 */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: '50% 52%' }}>
        {GAUGES.map((g) => <Gauge key={g.key} g={g} frame={frame} />)}
      </div>
      {/* 顶部眉题：品牌 · 节点 · 点火 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 84, textAlign: 'center', opacity: head,
        ...type(26, 600, { caps: true }), letterSpacing: '0.34em', color: L.ink2,
      }}>
        <span style={{ color: L.ink }}>Sable</span>
        <span style={{ margin: '0 22px', color: alpha(GOLD, 0.8) }}>/</span>
        Inference node 07
      </div>
      {/* 底部状态行：SELF-TEST 呼吸点 → All systems nominal */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 970, height: 70, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {!done && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: head * testOp, ...type(30, 600, { caps: true }), letterSpacing: '0.3em', color: L.ink2 }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, background: GOLD, opacity: 0.35 + 0.65 * pulse, boxShadow: `0 0 14px ${alpha(GOLD, 0.6 * pulse)}` }} />
            Self-test
          </div>
        )}
        {done && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: GOLD, transform: `scale(${okDot.toFixed(3)})`, boxShadow: `0 0 18px ${alpha(GOLD, 0.7)}` }} />
            <TextReveal text="All systems nominal" by="word" variant="rise" start={SETTLE_ALL + 10} each={16} gap={4}
              style={{ ...type(48, 600), color: L.ink }} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
