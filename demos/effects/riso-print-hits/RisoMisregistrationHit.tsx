// 套印错位冲击帧（riso-misregistration-hit）——标题撞停瞬间裂成两份单色"印版"
// （mix-blend-mode: multiply 叠在纸上），像 riso 印刷没对准版；两版反向错位（x 为主 y 少量）
// 做衰减震荡 offset = A·cos(ωt)·exp(-t/τ) 抖两下，帧 72 啪地硬切回套准，带 4f scale 脉冲收束。
//
// 第二轮重设计（双色 riso 演出海报 · 荧光粉 × 蓝）：
// - 配色 custom：再生新闻纸 #f3eee2 + riso 两色油墨——荧光粉 FLUO #ff4fa3 与 蓝 BLUE #1f5fc4。
//   两版套准时 multiply 叠成深紫墨色（同一字形两版重合），错开时一侧粉、一侧蓝的彩边——经典 riso 毛边。
// - 版式：瑞士网格海报（video-shotcraft 的 riso 宣传海报）。左对齐 300px 黑体两行「CRAFT IT / LOUD.」压在右侧
//   一只半调网点大太阳上（粉版，点径随离心距离变小 = 真半调），顶部版记、底部三栏卖点信息（蓝版）。只有标题两版会错，
//   背景元素保持套准（整画面全裂读作故障而非印刷）。
// - 节奏：开场太阳像被墨辊滚上纸（自上而下的擦入 0–16f）、信息栏错峰落位 → 标题 8f ease-in 撞入
//   → 命中同帧裂版 + 整页一记 1.2% 的顿挫 → 44f 衰减震荡 → 72f 硬切套准 + 「ON REGISTER」圆章盖下
//   （圆章中心是单色版镜刻标志——BRAND.md 规定单色印刷用 mono 版，蓝版一色印出）
//   → 44f 干净 hold（极缓推进）。
//
// 时间表（30fps，共 120f）：
//   0–18    预备：纸面、版记第 1 帧就在；太阳墨辊擦入 0–16f；底部信息栏 4–18f 错峰升起
//   20–28   主动作：标题从右画外 ease-in(cubic) 撞入（速度方向性模糊），28f 命中
//   28–71   余波：两版反向衰减震荡（周期 18f、τ 60f，72f 前仍余 ~11px 单版残差）
//   72–76   套准：硬切归零 + 4f scale 1.03→1；圆章 72f 盖下（scale 1.5→1，4f）
//   76–120  hold 44f：相机 smooth 极缓推进 1.000→1.012（~110f 收敛），尾段逐帧近乎相同
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, SpeedBlur, Vignette, bezier, mix, ramp, velocity } from '../../_fixtures/Polish';
import { MARK_PATHS } from '../../_fixtures/Brand';

export const RISO_MISREGISTRATION_HIT_DURATION = 120;

const HIT = 28; // 撞停命中帧
const SNAP = 72; // 套准合一帧
const AX = 20; // 单版 x 错位振幅（两版反向 → 总分离 ~40px；300px 大字下才可感）
const AY = 8; // 单版 y 错位振幅（少量，更像没对准版）
const OMEGA = (2 * Math.PI) / 18; // 震荡周期 18f，44f 内抖两下半
const TAU = 60; // 缓衰减：帧 72 前仍余可见残差，被"啪地"硬切归零

const PAPER = '#f3eee2'; // 再生新闻纸
const FLUO = '#ff4fa3'; // riso 荧光粉版
const BLUE = '#1f5fc4'; // riso 蓝版
const inCubic = bezier(0.55, 0.055, 0.675, 0.19);
const SANS = FONT.sans;

// 单色印版：同字形、可调色、可错位，multiply 叠到纸上
const Plate: React.FC<{ color: string; dx: number; dy: number; scale?: number }> = ({ color, dx, dy, scale = 1 }) => (
  <div style={{
    position: 'absolute', left: 120, top: 250,
    transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${scale})`, transformOrigin: '30% 60%',
    mixBlendMode: 'multiply', color, fontFamily: SANS, fontWeight: 900, fontSize: 300, lineHeight: 0.84,
    letterSpacing: '-0.045em', whiteSpace: 'nowrap',
  }}>
    {/* F 与 T 顶横在 −0.045em 字距下恰好相接，抗锯齿会留一条发丝缝——F 后再收 0.01em 让两笔重叠 */}
    <div>CRA<span style={{ marginRight: '-0.01em' }}>F</span>T IT</div>
    <div>LOUD.</div>
  </div>
);

// 半调网点太阳：粉版，点按网格排布，点径随离心距离缩小（真半调，而非等大点阵）
const SUN_R = 372;
const SUN_STEP = 22;
const SUN_DOTS = (() => {
  const out: { x: number; y: number; r: number }[] = [];
  const n = Math.ceil(SUN_R / SUN_STEP);
  for (let iy = -n; iy <= n; iy++) {
    for (let ix = -n; ix <= n; ix++) {
      // 45° 网角：奇数行错半格
      const x = ix * SUN_STEP + (iy % 2 ? SUN_STEP / 2 : 0);
      const y = iy * SUN_STEP * 0.866;
      const d = Math.hypot(x, y) / SUN_R;
      if (d > 1) continue;
      const tone = 1 - Math.pow(d, 2.4); // 中心实、边缘点径收到 0（轮廓是圆，不是网格的六边形）
      const r = (SUN_STEP / 2) * 1.1 * Math.sqrt(tone);
      if (r > 0.9) out.push({ x, y, r });
    }
  }
  return out;
})();

const Sun: React.FC<{ reveal: number }> = ({ reveal }) => (
  <svg width={SUN_R * 2 + 40} height={SUN_R * 2 + 40} viewBox={`${-SUN_R - 20} ${-SUN_R - 20} ${SUN_R * 2 + 40} ${SUN_R * 2 + 40}`}
    style={{
      position: 'absolute', left: 1090, top: 108, mixBlendMode: 'multiply',
      // 墨辊擦入：自上而下的硬边遮罩（印刷是一次滚过，不是淡入）
      clipPath: `inset(0 0 ${((1 - reveal) * 100).toFixed(2)}% 0)`,
    }}>
    <g fill={FLUO}>
      {SUN_DOTS.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} />)}
    </g>
  </svg>
);

// 套准十字（印刷对位标）：静止布景锚点
const RegMark: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <svg width={40} height={40} viewBox="0 0 40 40" style={{ position: 'absolute', left: x - 20, top: y - 20, mixBlendMode: 'multiply' }}>
    <g fill="none" stroke={BLUE} strokeWidth={1.6} opacity={0.75}>
      <circle cx={20} cy={20} r={9} />
      <path d="M20 1 V39 M1 20 H39" />
    </g>
  </svg>
);

// 圆章：套准那一帧盖下的「ON REGISTER」（蓝版，环形字 + 中心单色镜刻标志；标志反向转回 14° 保持正立）
const Stamp: React.FC<{ s: number; o: number }> = ({ s, o }) => (
  <svg width={300} height={300} viewBox="-130 -130 260 260"
    style={{ position: 'absolute', left: 1480, top: 500, mixBlendMode: 'multiply', opacity: o, transform: `rotate(-14deg) scale(${s.toFixed(4)})` }}>
    <defs>
      <path id="rmh-ring" d="M -88 0 A 88 88 0 1 1 88 0 A 88 88 0 1 1 -88 0" />
    </defs>
    <g fill="none" stroke={BLUE} strokeWidth={5}>
      <circle r={122} />
      <circle r={66} strokeWidth={3} />
    </g>
    <text fill={BLUE} style={{ fontFamily: FONT.mono, fontSize: 28, fontWeight: 700 }}>
      <textPath href="#rmh-ring" textLength={540} lengthAdjust="spacing">ON REGISTER ✶ SHOTCRAFT ✶</textPath>
    </text>
    {/* 标志内容框 x16–120 / y16–112，中心 (68,64)；缩到 ~66px 宽放进内圈 r66 */}
    <g transform="rotate(14) scale(0.64) translate(-68 -64)" fill={BLUE}>
      <path d={MARK_PATHS.frame} />
      <path d={MARK_PATHS.cut} />
    </g>
  </svg>
);

// 撞入位移：右画外 1700px → 0，8f ease-in(cubic)（加速撞停）
const slideAt = (f: number) => mix(1700, 0, ramp(f, 20, HIT - 20, inCubic));

export const RisoMisregistrationHit: React.FC = () => {
  const frame = useCurrentFrame();

  const split = frame >= HIT && frame < SNAP;
  const slideX = frame < HIT ? slideAt(frame) : 0;
  const vx = frame >= 20 && frame < HIT ? velocity(slideAt, frame) : 0;

  // 错位震荡包络：t 自命中起，衰减余弦；帧 72 硬切归零
  const t = frame - HIT;
  const m = split ? Math.cos(OMEGA * t) * Math.exp(-t / TAU) : 0;
  const dx = AX * m;
  const dy = AY * m;

  // 套准脉冲：72f 起 4f scale 1.03 → 1
  const pulse = frame >= SNAP && frame < SNAP + 4 ? 1 + 0.03 * (1 - (frame - SNAP) / 4) : 1;
  // 命中顿挫：整页 1.2% 一帧到位、指数回落（10f 窗口外精确 1）
  const th = frame - HIT;
  const kick = th >= 0 && th < 10 ? 1 + 0.012 * Math.exp(-th / 2.5) : 1;
  // 相机：smooth 极缓推进，110f 收敛
  const cam = 1 + 0.012 * ramp(frame, 0, 110, EASE.smooth);

  // 圆章：72f 盖下，4f 由 1.5 压到 1（ease-out），之后静止
  const sp = ramp(frame, SNAP, 4, EASE.out);
  const stampS = frame < SNAP ? 1.5 : mix(1.5, 1, sp);
  const stampO = frame < SNAP ? 0 : Math.min(1, sp * 2.5);

  const sunReveal = ramp(frame, 0, 16, EASE.swift);
  const info = (i: number) => {
    const p = ramp(frame, 4 + i * 4, 14, EASE.snappy);
    return { opacity: p, transform: `translateY(${((1 - p) * 26).toFixed(2)}px)` };
  };

  return (
    <div style={{ width: 1920, height: 1080, background: PAPER, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${(cam * kick).toFixed(5)})`, transformOrigin: '40% 50%' }}>
        {/* 纸面：中心略亮 + 静态纸纤维（multiply） */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 72% 70% at 42% 44%, #f8f4ea 0%, #f3eee2 58%, #e8e1d1 100%)' }} />
        <Grain opacity={0.11} step={100000} scale={2.4} freq={0.55} blend="multiply" />

        <Sun reveal={sunReveal} />

        {/* 版记：四角套准十字 + 顶栏（蓝版） */}
        <RegMark x={64} y={64} />
        <RegMark x={1856} y={64} />
        <RegMark x={64} y={1016} />
        <RegMark x={1856} y={1016} />
        <div style={{
          position: 'absolute', left: 120, right: 120, top: 104, display: 'flex', justifyContent: 'space-between',
          fontFamily: FONT.mono, fontSize: 26, fontWeight: 600, letterSpacing: '0.12em', color: BLUE, mixBlendMode: 'multiply',
          opacity: ramp(frame, 0, 10, EASE.out),
        }}>
          <span>VIDEO-SHOTCRAFT — Nº 07</span>
          <span>TWO-COLOUR RISO · 1 OF 300</span>
        </div>
        <div style={{ position: 'absolute', left: 120, right: 120, top: 150, height: 4, background: BLUE, mixBlendMode: 'multiply', transformOrigin: '0 50%', transform: `scaleX(${ramp(frame, 0, 18, EASE.snappy).toFixed(4)})` }} />

        {/* 底部三栏演出信息（蓝版） */}
        <div style={{ position: 'absolute', left: 120, right: 120, top: 878, height: 4, background: BLUE, mixBlendMode: 'multiply', transformOrigin: '0 50%', transform: `scaleX(${ramp(frame, 2, 18, EASE.snappy).toFixed(4)})` }} />
        <div style={{ position: 'absolute', left: 120, right: 120, top: 906, display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr', gap: 48, color: BLUE, mixBlendMode: 'multiply' }}>
          {[
            ['SHOT RECIPE CARDS', 'Cinematic product films'],
            ['ONE PROMPT', 'To a finished promo'],
            ['BUILT ON REMOTION', 'For Claude Code & Codex'],
          ].map(([a, b], i) => (
            <div key={i} style={info(i)}>
              <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 850, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{a}</div>
              <div style={{ fontFamily: SANS, fontSize: 32, fontWeight: 450, letterSpacing: '-0.01em', lineHeight: 1.35, marginTop: 6 }}>{b}</div>
            </div>
          ))}
        </div>

        {/* 撞入：两版重合（套准态）整体横飞，带方向性运动模糊 */}
        {frame >= 20 && frame < HIT && (
          <SpeedBlur vx={vx} amount={0.09} max={34}>
            <div style={{ position: 'absolute', inset: 0, transform: `translateX(${slideX.toFixed(1)}px)` }}>
              <Plate color={FLUO} dx={0} dy={0} />
              <Plate color={BLUE} dx={0} dy={0} />
            </div>
          </SpeedBlur>
        )}

        {/* 双版错位：粉版与蓝版反向偏移，multiply 叠出"重影套印"；套准后两版归零重合成深紫 */}
        {frame >= HIT && (
          <>
            <Plate color={FLUO} dx={-dx} dy={dy} scale={pulse} />
            <Plate color={BLUE} dx={dx} dy={-dy} scale={pulse} />
          </>
        )}

        <Stamp s={stampS} o={stampO} />
      </div>

      {/* 油墨颗粒：screen 细噪让墨块带 riso 那种不均匀的白点（静态）+ 暖褐暗角 */}
      <Grain opacity={0.2} step={100000} freq={1.25} blend="screen" />
      <Vignette strength={0.13} inner={0.55} color="#5a4a32" />
    </div>
  );
};
