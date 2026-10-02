// ring-diagram-annotation-reveal —— 全屏主体被圆窗收束成同心环图解，再整组左移缩小、为右栏标题与注释让位
//
// 第二轮重设计（深蓝夜 · 聚变堆芯图解）：
// - look = midnight（深蓝 · 电光蓝 · 青色点缀）。图解讲一件真东西：一台虚构的紧凑型聚变试验堆「Ardent-1」。
//   主体 = 等离子体：开场整屏都是它（白热核心 + 青蓝环形等离子带 + 两层反向旋转的湍流丝缕，feTurbulence 只栅格化一次），观众先"身处其中"；
//   圆窗收束的同时等离子体被拉远缩小（两层速度不同 → 有纵深），最后被关进一个 230px 的圆——"装进瓶子里的恒星"。
// - 机制三层几何（仍是三层独立几何，命门不变）：
//   细环 r290 + 72 道刻度（仪表感）从 3.8× 收到 1×；外环 = 24 块超导线圈（内沿被等离子体照亮的青色轮廓光），
//   顺时针逐块"咔"入位后整环匀速慢转（机械语义，只有外环转）；12 支向心箭头 = 磁场压力，
//   顺时针错峰从线圈内沿长向细环（线端与箭头头同一进度），全部落定那一刻等离子体被"挤"一下（弹簧 0.95）。
// - 让位：整组（等离子体 + 三层几何共用一个 transform）中心 x 960→600、scale 1→0.8，swift 不对称 in-out；
//   右栏四个词块「Twelve / coils. / One / star.」逐块从遮罩下升起（错峰 3f），青色注释条自左裁切揭出，
//   二级说明两行落入。右栏不进同一 transform（不会跟着缩小漂走）。
//
// 时间表（30fps，共 200f）：
//   0–10    主体全屏：等离子体 3.6× 铺满画面，纤维慢转（开场第 1 帧就有画面）
//   10–50   圆窗半径 1150→230（snappy）；等离子体 3.6→1（out，晚 2f 起、晚 6f 收 → 两层深度）
//   18–60   细环 3.8→1 + 刻度；30–52 线圈 24 块顺时针入位（每块 8f）；29 起外环匀速慢转（至片尾共 ~50°）
//   36–58   12 支箭头顺时针长出（每支 10f、间隔 0.9f）；58 等离子体受压弹簧
//   58–90   图解 hold（读结构：只有外环慢转、等离子体呼吸）
//   90–134  整组左移缩小（swift）
//   112–137 四个词块升起（每块 16f、错峰 3f，两行间隔 6f）；126–152 注释条揭出；140–156 二级说明落入
//   156–200 hold：最终海报（只有外环慢转）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const RING_DIAGRAM_ANNOTATION_REVEAL_DURATION = 200;

const L = LOOKS.midnight;
const CY = 540;
const CORE_R = 230; // 圆窗终点半径（刚好包住等离子体）
const THIN_R = 290; // 细环
const COIL_R = 400; // 线圈环中线
const COIL_W = 30; // 线圈厚度
const ARROW_TAIL = 378; // 箭头尾（线圈内沿）
const ARROW_TIP = 306; // 箭头尖（细环刻度外）
const BOX = 1000; // 图解容器（SVG 坐标 0..1000，圆心 500）
const COL_X = 1030; // 右栏左对齐线

// 等离子体湍流纹理：feTurbulence 噪声 → 单色 + 高对比 alpha（只剩丝缕），做成 data-URI 小图，
// Chrome 只栅格化一次；逐帧只旋转这张图（便宜），两层反向旋转叠出"翻滚"的等离子体。
const noiseCache = new Map<string, string>();
const plasmaNoise = (seed: number, freq: number, rgb: [number, number, number]) => {
  const key = `${seed}|${freq}|${rgb.join(',')}`;
  const hit = noiseCache.get(key);
  if (hit) return hit;
  const [r, g, b] = rgb.map((v) => (v / 255).toFixed(3));
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='1000' height='1000'>` +
    `<filter id='n' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='4' seed='${seed}'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  3.2 0 0 0 -1.35'/>` +
    `</filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  noiseCache.set(key, url);
  return url;
};

// 等离子体：铺满父级（BOX×BOX）的多层渐变 + 两层湍流；frame 驱动旋转与呼吸
const Plasma: React.FC<{ frame: number }> = ({ frame }) => {
  const ringMask = 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.25) 0%, #000 14%, #000 36%, transparent 49%)';
  const breathe = 1 + 0.025 * Math.sin(frame / 11);
  const swirl = (seed: number, freq: number, rgb: [number, number, number], deg: number, sc: number, op: number) => (
    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', mixBlendMode: 'screen', opacity: op, WebkitMaskImage: ringMask, maskImage: ringMask }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: plasmaNoise(seed, freq, rgb), backgroundSize: '100% 100%', transform: `rotate(${deg.toFixed(2)}deg) scale(${sc})` }} />
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* 主体辉光：白热核心 → 青 → 电光蓝 → 深蓝 */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `radial-gradient(circle at 50% 50%, #ffffff 0%, #e6fbff 4%, #8fe9ff 10%, ${alpha('#3f8cff', 0.9)} 19%, ${alpha('#2a4fd6', 0.7)} 29%, ${alpha('#16245e', 0.6)} 40%, ${alpha('#0d1c52', 0)} 62%)`,
        transform: `scale(${breathe.toFixed(4)})`,
      }} />
      {/* 两层反向旋转的湍流丝缕（青 / 蓝紫） */}
      {swirl(11, 0.0085, [170, 245, 255], frame * 0.75, 1.15, 0.95)}
      {swirl(37, 0.014, [120, 135, 255], -frame * 0.5 + 40, 1.3, 0.8)}
      {/* 环形等离子带（俯视的托卡马克环） */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%', mixBlendMode: 'screen',
        background: `radial-gradient(circle at 50% 50%, ${alpha('#7ff0ff', 0)} 12%, ${alpha('#7ff0ff', 0.42)} 17%, ${alpha('#4b8dff', 0.25)} 21%, ${alpha('#4b8dff', 0)} 29%)`,
      }} />
    </div>
  );
};

export const RingDiagramAnnotationReveal: React.FC = () => {
  const frame = useCurrentFrame();

  // ── 圆窗收束 + 等离子体拉远 ──
  const aperture = ramp(frame, 10, 40, EASE.snappy);
  const apR = mix(1150, CORE_R, aperture);
  const pull = ramp(frame, 12, 44, EASE.out);
  const plasmaScale = mix(3.6, 1, pull); // 3.6×：等离子体外缘在画面四角之外，开场真正铺满
  // 箭头落定 → 等离子体被挤一下：1 → 0.95 → 1（12f 阻尼脉冲，无二次回弹）
  const squeeze = frame < 58 ? 1 : 1 - 0.05 * Math.sin(Math.min(1, (frame - 58) / 12) * Math.PI) * Math.exp(-(frame - 58) / 14);

  // ── 机制几何 ──
  const ringK = ramp(frame, 18, 42, EASE.snappy);
  const ringScale = mix(3.8, 1, ringK);
  const coilRot = frame < 29 ? 0 : (frame - 29) * 0.29; // 匀速慢转（机械），~50° 到片尾
  const ticksIn = ramp(frame, 34, 18, EASE.out);

  // ── 让位：整组左移缩小 ──
  const lay = ramp(frame, 90, 44, EASE.swift);
  const gx = mix(960, 600, lay);
  const gs = mix(1, 0.8, lay);

  // 箭头：顺时针错峰；线端与箭头头共用同一进度
  const arrows = Array.from({ length: 12 }, (_, i) => {
    const a = ((-90 + i * 30) * Math.PI) / 180;
    const k = ramp(frame, 36 + i * 0.9, 10, EASE.snappy);
    const r = mix(ARROW_TAIL, ARROW_TIP, k);
    return { a, k, r };
  });

  // 线圈 24 块：顺时针逐块入位
  const SEG = 24;
  const segSpan = (360 / SEG) * 0.64;
  const arc = (r: number, a0: number, a1: number) => {
    const p0 = [500 + r * Math.cos((a0 * Math.PI) / 180), 500 + r * Math.sin((a0 * Math.PI) / 180)];
    const p1 = [500 + r * Math.cos((a1 * Math.PI) / 180), 500 + r * Math.sin((a1 * Math.PI) / 180)];
    return `M${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A${r} ${r} 0 0 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`;
  };

  const rimOp = ramp(frame, 40, 12, EASE.out); // 圆窗边缘的发光轮廓（收束落定后亮起）

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.32, y: 0.5 }} fill={{ x: 0.9, y: 0.15 }} breathe={0.3} vignette={0.6}>
        <Dust look={L} count={36} seed={7} drift={0.18} opacity={0.45} />
      </Stage>

      {/* ── 图解整组（共用一个 transform） ── */}
      <div style={{
        position: 'absolute', left: gx - BOX / 2, top: CY - BOX / 2, width: BOX, height: BOX,
        transform: `scale(${gs.toFixed(4)})`, transformOrigin: '50% 50%',
      }}>
        {/* 背后一圈柔光：等离子体照亮周围空间 */}
        <div style={{
          position: 'absolute', left: -200, top: -200, width: BOX + 400, height: BOX + 400, borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha('#3f7bff', 0.22)} 0%, ${alpha('#3f7bff', 0.08)} 30%, ${alpha('#3f7bff', 0)} 60%)`,
          opacity: aperture,
        }} />

        {/* 等离子体：被圆窗裁切（圆窗以组中心为圆心，组缩放时一起缩） */}
        <div style={{
          position: 'absolute', left: -1500, top: -1500, width: BOX + 3000, height: BOX + 3000,
          clipPath: `circle(${apR.toFixed(1)}px at 50% 50%)`,
        }}>
          <div style={{ position: 'absolute', inset: 0, background: '#0d1c52' }} />
          <div style={{
            position: 'absolute', left: 1500, top: 1500, width: BOX, height: BOX,
            transform: `scale(${(plasmaScale * squeeze).toFixed(4)})`,
          }}>
            <Plasma frame={frame} />
          </div>
        </div>

        {/* 圆窗边缘轮廓光 */}
        <svg width={BOX} height={BOX} viewBox={`0 0 ${BOX} ${BOX}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <circle cx={500} cy={500} r={CORE_R * squeeze} fill="none" stroke={alpha('#9feaff', 0.7 * rimOp)} strokeWidth={2} style={{ filter: `drop-shadow(0 0 10px ${alpha('#5fd8ff', 0.7)})` }} />

          {/* 细环 + 72 道刻度：3.8× → 1× */}
          <g transform={`translate(500 500) scale(${ringScale.toFixed(4)}) translate(-500 -500)`} opacity={ringK}>
            <circle cx={500} cy={500} r={THIN_R} fill="none" stroke={alpha('#dbe6ff', 0.55)} strokeWidth={2 / ringScale} />
            {Array.from({ length: 72 }).map((_, i) => {
              const a = (i * 5 * Math.PI) / 180;
              const long = i % 6 === 0;
              const r1 = THIN_R + 4, r2 = THIN_R + (long ? 16 : 9);
              return (
                <line key={i} x1={500 + r1 * Math.cos(a)} y1={500 + r1 * Math.sin(a)} x2={500 + r2 * Math.cos(a)} y2={500 + r2 * Math.sin(a)}
                  stroke={alpha('#dbe6ff', (long ? 0.5 : 0.28) * ticksIn)} strokeWidth={1.5 / ringScale} />
              );
            })}
          </g>

          {/* 线圈环：24 块超导线圈，顺时针逐块入位；整环匀速慢转（只有它转） */}
          <g transform={`rotate(${coilRot.toFixed(3)} 500 500)`}>
            {Array.from({ length: SEG }).map((_, i) => {
              const k = ramp(frame, 30 + i * 0.6, 8, EASE.snappy);
              if (k <= 0) return null;
              const mid = -90 + i * (360 / SEG) + (360 / SEG) / 2;
              const a0 = mid - segSpan / 2, a1 = mid + segSpan / 2;
              const r = COIL_R + (1 - k) * 34; // 从外侧收进来"咔"入位
              return (
                <g key={i} opacity={k}>
                  <path d={arc(r, a0, a1)} fill="none" stroke="#1d2f62" strokeWidth={COIL_W} />
                  <path d={arc(r + COIL_W / 2 - 1, a0, a1)} fill="none" stroke={alpha('#a9c2ff', 0.4)} strokeWidth={1.5} />
                  {/* 内沿被等离子体照亮：青色轮廓光 */}
                  <path d={arc(r - COIL_W / 2 + 1.5, a0, a1)} fill="none" stroke={alpha('#7ff0ff', 0.75)} strokeWidth={2.5}
                    style={{ filter: `drop-shadow(0 0 6px ${alpha('#5fd8ff', 0.6)})` }} />
                </g>
              );
            })}
          </g>

          {/* 12 支向心箭头：磁场压力（不跟外环转） */}
          {arrows.map(({ a, k, r }, i) => {
            if (k <= 0) return null;
            const ca = Math.cos(a), sa = Math.sin(a);
            const tx = 500 + r * ca, ty = 500 + r * sa;
            const head = 16;
            // 箭头头：尖朝圆心
            const bx = tx + ca * head, by = ty + sa * head;
            const px = -sa * head * 0.55, py = ca * head * 0.55;
            return (
              <g key={i} opacity={Math.min(1, k * 3)}>
                <line x1={500 + ARROW_TAIL * ca} y1={500 + ARROW_TAIL * sa} x2={bx} y2={by} stroke={L.accent} strokeWidth={3} strokeLinecap="round" />
                <path d={`M${tx.toFixed(2)} ${ty.toFixed(2)} L${(bx + px).toFixed(2)} ${(by + py).toFixed(2)} L${(bx - px).toFixed(2)} ${(by - py).toFixed(2)} Z`} fill={L.accent}
                  style={{ filter: `drop-shadow(0 0 6px ${alpha(L.accent, 0.8)})` }} />
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── 右栏（独立定位，不跟图解缩放） ── */}
      <div style={{ position: 'absolute', left: COL_X, top: 250, width: 800 }}>
        <div style={{ opacity: ramp(frame, 108, 12, EASE.out), transform: `translateY(${mix(10, 0, ramp(frame, 108, 14, EASE.snappy)).toFixed(1)}px)` }}>
          <span style={{ ...type(26, 600, { mono: true }), letterSpacing: '0.16em', color: L.ink3 }}>FIG. 1 — MAGNETIC CONFINEMENT</span>
        </div>
        <div style={{ marginTop: 26 }}>
          <div>
            <TextReveal text="Twelve coils." by="word" variant="rise" start={112} each={16} gap={3} ease={EASE.snappy}
              style={{ ...type(112, 780), letterSpacing: '-0.045em', color: L.ink }} />
          </div>
          <div>
            <TextReveal text="One star." by="word" variant="rise" start={118} each={16} gap={3} ease={EASE.snappy}
              style={{ ...type(112, 780), letterSpacing: '-0.045em', color: L.ink }}
              unitStyle={(i) => (i === 1 ? { backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #9feaff 60%, #5b8cff 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : {})} />
          </div>
        </div>
        {/* 注释条：自左裁切揭出（不压扁文字） */}
        <div style={{
          marginTop: 44, display: 'inline-flex', alignItems: 'center', gap: 16, height: 64, padding: '0 26px',
          background: L.accent2, borderRadius: 6,
          clipPath: `inset(0 ${((1 - ramp(frame, 126, 26, EASE.snappy)) * 100).toFixed(2)}% 0 0 round 6px)`,
        }}>
          <span style={{ ...type(28, 700, { mono: true }), letterSpacing: '0.1em', color: L.onAccent }}>ARDENT-1</span>
          <span style={{ width: 2, height: 26, background: alpha(L.onAccent, 0.35) }} />
          <span style={{ ...type(28, 600, { mono: true }), letterSpacing: '0.08em', color: L.onAccent }}>COMPACT FUSION PILOT</span>
        </div>
        <div style={{
          marginTop: 30, width: 720,
          opacity: ramp(frame, 140, 12, EASE.out), transform: `translateY(${mix(-14, 0, ramp(frame, 140, 16, EASE.snappy)).toFixed(1)}px)`,
        }}>
          <span style={{ ...type(38, 450), color: L.ink2, lineHeight: 1.4 }}>
            Superconducting magnets hold 150-million-degree plasma in a stable ring — ten times hotter than the Sun’s core.
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
