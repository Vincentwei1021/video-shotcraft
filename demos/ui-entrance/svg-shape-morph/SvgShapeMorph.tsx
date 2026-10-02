// svg-shape-morph — 一条闭合轮廓平滑变形为另一条再变回：两形状在极坐标下重采样到相同点数（140），
// 逐点只插半径（角度恒定 → 中间态永不自交），变形中段叠 scale 呼吸、缓慢自转与色相漂移。
//
// 第二轮重设计（极光暗场 · 等高线流体 · 有重量的形变）：
// - look = aurora（紫粉极光）。主体不再是一条描边，而是一组 6 圈"等高线"嵌套轮廓：外圈是有体积的
//   玻璃流体（受光渐变填充 + 外辉光 + 渐变描边），内 5 圈按深度依次滞后 3f 跟随形变、并带一点逐圈扭转——
//   "里面的流体慢半拍"从一圈柔光扩成一整套跟随层次，形变像液体在晃，而不是矢量插值。
// - 同一性可视化：外圈轮廓上均匀挂 35 颗采样点（每 4 个取 1），它们只沿径向滑动、从不生成或消失——
//   观众看得见"这一直是同一条线"。
// - 运动曲线：A→B、B→A 都是「预备收缩 → 冲过头 3% → 弹簧回落」（anticip + overshoot），形变有重量；
//   中间 B 静置 26f、两端 A 静置，只留极缓的呼吸；色相与形态绑定（A 冷紫 258° → B 品红 322°），是形态的读数。
// - 版式：主体居右（中心 1040,520，基半径 300），左下一组小型字标：mono 眉题「03 LOBES · 140 PTS」里的数字随形态翻牌 03 ⇄ 05，
//   64px 标题「Same 140 points. / A new form.」——把"等点数 morph"的技术意图写成一句文案。
//
// 时间表（30fps，共 168f）：
//   0–16    出场：6 圈轮廓由内向外错峰绽开（scale 0.86→1 + 淡入），采样点随外圈亮起
//   18–58   A→B：预备收缩（~6f）→ 主形变（snappy 段）→ 冲过 3% → 弹簧回落；内圈逐圈滞后 3f
//   58–90   B 静置（呼吸），眉题翻成「05」
//   90–130  B→A（同一套曲线）
//   130–168 A 静置收尾，眉题翻回「03」，标题常驻
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const SVG_SHAPE_MORPH_DURATION = 168;

const L = LOOKS.aurora;
const CX = 1040;
const CY = 520;
const N = 140;
const BASE = 300;
const RINGS = 6; // 等高线圈数（0 = 外圈）
const LAG = 3; // 每圈滞后帧数

// 两个形状：三瓣 / 五瓣，各带一层高频扰动做"有机"细节
const rA = (th: number) => BASE * (1 + 0.3 * Math.cos(th * 3) + 0.05 * Math.sin(th * 7 + 0.8));
const rB = (th: number) => BASE * (1 + 0.26 * Math.sin(th * 5 + 1.2) + 0.06 * Math.cos(th * 2));
const RAD_A: number[] = [];
const RAD_B: number[] = [];
for (let i = 0; i < N; i++) {
  const th = (i / N) * Math.PI * 2;
  RAD_A.push(rA(th));
  RAD_B.push(rB(th));
}

// 形变曲线：先反向收缩 ~6%、再冲过 ~3%，由弹簧式回落吸收（一条 bezier 同时带预备与过冲）
const MORPH = bezier(0.55, -0.22, 0.3, 1.18);
const morphAt = (f: number) => MORPH(Math.min(1, Math.max(0, (f - 18) / 40))) - MORPH(Math.min(1, Math.max(0, (f - 90) / 40)));
// 两次形变各自的"进行度"（0→1→0 的钟形），驱动呼吸、光与扭转
const busyAt = (f: number) => Math.sin(Math.PI * ramp(f, 18, 40, EASE.linear)) + Math.sin(Math.PI * ramp(f, 90, 40, EASE.linear));

const pointsAt = (m: number, k: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const r = mix(RAD_A[i], RAD_B[i], m) * k;
    pts.push([CX + Math.cos(th) * r, CY + Math.sin(th) * r]);
  }
  return pts;
};
// 闭合 Catmull-Rom → 三次贝塞尔
const pathOf = (pts: [number, number][]) => {
  const P = (j: number) => pts[(j + N) % N];
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ` +
      `${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
};

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h.toFixed(1)},${s}%,${l}%,${a})`;

export const SvgShapeMorph: React.FC = () => {
  const f = useCurrentFrame();
  const m = morphAt(f);
  const busy = busyAt(f);
  const hue = mix(258, 322, Math.min(1, Math.max(0, m)));
  const breath = 1 + 0.035 * busy + 0.008 * Math.sin(f / 16);
  const rot = Math.sin((f / 168) * Math.PI * 2) * 4;
  const outerPts = pointsAt(m, 1);
  const dOuter = pathOf(outerPts);
  const g = `translate(${CX},${CY}) scale(${breath.toFixed(5)}) rotate(${rot.toFixed(3)}) translate(${-CX},${-CY})`;
  // 眉题翻牌：形态过半时换数字
  const show05 = ramp(f, 40, 10, EASE.snappy) - ramp(f, 112, 10, EASE.snappy);

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.54, y: 0.12 }} fill={{ x: 0.86, y: 0.92 }} breathe={0.5}>
        {/* 形体照亮空间：随色相的环境光 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 34% 44% at ${(CX / 19.2).toFixed(2)}% ${(CY / 10.8).toFixed(2)}%, ${hsl(hue, 80, 55, 0.2 + 0.05 * busy)}, ${hsl(hue, 80, 40, 0)} 72%)`,
        }} />
        <Dust look={L} count={34} seed={5} drift={0.15} opacity={0.45} color={hsl(hue, 90, 80)} />
      </Stage>

      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="ssm-bloom" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation={50} /></filter>
          <filter id="ssm-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={2.2} /></filter>
          <radialGradient id="ssm-fill" cx={CX - BASE * 0.4} cy={CY - BASE * 0.5} r={BASE * 1.7} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={hsl(hue + 10, 90, 78)} stopOpacity={0.42} />
            <stop offset="0.5" stopColor={hsl(hue, 80, 52)} stopOpacity={0.18} />
            <stop offset="1" stopColor={hsl(hue - 14, 75, 30)} stopOpacity={0.1} />
          </radialGradient>
          <linearGradient id="ssm-rim" x1={CX - BASE} y1={CY - BASE} x2={CX + BASE} y2={CY + BASE} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={hsl(hue + 14, 100, 90)} />
            <stop offset="0.5" stopColor={hsl(hue, 90, 70)} />
            <stop offset="1" stopColor={hsl(hue - 18, 85, 58)} />
          </linearGradient>
          <clipPath id="ssm-clip"><path d={dOuter} /></clipPath>
        </defs>
        <g transform={g}>
          {/* 外辉光 */}
          <path d={dOuter} fill={hsl(hue, 85, 58, 0.26 + 0.08 * busy)} filter="url(#ssm-bloom)" opacity={ramp(f, 0, 16, EASE.out)} />
          {/* 玻璃体积 */}
          <path d={dOuter} fill="url(#ssm-fill)" opacity={ramp(f, 0, 14, EASE.out)} />
          {/* 内圈等高线：由内向外错峰绽开，逐圈滞后 + 扭转，裁在外圈内 */}
          <g clipPath="url(#ssm-clip)">
            {Array.from({ length: RINGS - 1 }, (_, jj) => {
              const j = RINGS - 1 - jj; // 先画最内圈
              const mj = morphAt(f - j * LAG);
              const k = 1 - j * 0.15;
              const born = ramp(f, (RINGS - 1 - j) * 2, 14, EASE.snappy);
              const twist = (busyAt(f - j * LAG) * j * 2.2).toFixed(3);
              const hj = hue + j * 9;
              return (
                <path key={j} d={pathOf(pointsAt(mj, k * mix(0.86, 1, born)))}
                  transform={`rotate(${twist} ${CX} ${CY})`}
                  fill={j === RINGS - 1 ? hsl(hj, 95, 76, 0.22) : 'none'}
                  stroke={hsl(hj, 95, 78, 0.5 - j * 0.06)} strokeWidth={3.2 - j * 0.3}
                  opacity={born} filter={j >= 3 ? 'url(#ssm-soft)' : undefined} />
              );
            })}
            {/* 内沿高光 */}
            <path d={dOuter} fill="none" strokeWidth={10} stroke="rgba(255,255,255,0.18)" />
          </g>
          {/* 外圈主描边 */}
          <path d={dOuter} fill="none" strokeWidth={6} strokeLinejoin="round" stroke="url(#ssm-rim)" opacity={ramp(f, 2, 14, EASE.out)}
            style={{ filter: `drop-shadow(0 0 10px ${hsl(hue, 95, 70, 0.7)})` }} />
          {/* 采样点：35 颗，只沿径向滑动——同一条线的证据 */}
          {outerPts.filter((_, i) => i % 4 === 0).map(([x, y], i) => {
            const on = ramp(f, 8 + (i / 35) * 10, 8, EASE.out);
            return <circle key={i} cx={x} cy={y} r={4.5} fill="#ffffff" opacity={0.85 * on} style={{ filter: `drop-shadow(0 0 6px ${hsl(hue, 100, 80, 0.9)})` }} />;
          })}
        </g>
      </svg>

      {/* 左下字标 */}
      <div style={{ position: 'absolute', left: 128, top: 790 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT.mono, fontSize: 24, letterSpacing: '0.18em', color: L.ink2, opacity: ramp(f, 6, 14, EASE.out) }}>
          <span style={{ display: 'inline-block', height: 30, overflow: 'hidden', verticalAlign: 'top' }}>
            <span style={{ display: 'block', transform: `translateY(${(show05 * -30).toFixed(2)}px)` }}>
              <span style={{ display: 'block', height: 30, color: hsl(258, 90, 80) }}>03</span>
              <span style={{ display: 'block', height: 30, color: hsl(322, 90, 78) }}>05</span>
            </span>
          </span>
          <span>LOBES</span>
          <span style={{ color: L.ink3 }}>· 140 PTS · ONE CONTOUR</span>
        </div>
        <div style={{ marginTop: 22, ...type(64, 680), color: L.ink }}>
          <TextReveal text="Same 140 points." by="word" variant="rise" start={10} each={16} gap={4} />
        </div>
        <div style={{ marginTop: 4, ...type(64, 680), color: L.ink2 }}>
          <TextReveal text="A new form." by="word" variant="rise" start={22} each={16} gap={4} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
