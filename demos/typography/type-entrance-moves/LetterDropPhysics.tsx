// 字符坠落堆积（letter-drop-physics）——FallingLetterAnimation。
//
// 第二轮重设计（瑞士海报 · 弹性地平线）：
// - look = paper（暖白纸 · 墨 · 朱红）。不是"纸 + 衬线编辑风"，而是粗黑体瑞士海报：
//   290px Black 字重的「GRAVITY」+ 一枚朱红句号，压在一条 6px 墨色地平线上；四角是海报网格信息
//   （N°07 / 相位指示 FALL·BOUNCE·SETTLE / g = 9.81 m/s²），副标题 64px 落在线下。
// - 手法不变且更强：字符错峰从画外砸落（重力加速 + 按速度竖向拉伸与运动模糊）→ 两次按物理比例衰减的
//   弹跳（高度 22% / 6%，时长 ∝ √h）→ 落地挤压回弹 + 歪斜站定 → 最后一拍全体立正。
// - 新物理细节：地平线是一根"弹性绳"——每次触地它在落点处按阻尼振荡下陷（高斯包络，邻近字符一起被压），
//   字符始终踩在线上；首次触地两侧扬起几团纸灰（确定性粒子，向外 ease-out 散开变淡）。
// - 朱红句号是"最后的笑点"：最晚落、最有弹性（34% / 11% / 3% 三跳），观众等它停下全体才立正。
//
// 时间表（30fps，共 160f）：
//   0–6     海报网格就位（角标、地平线、相位指示），第一帧即有画面
//   6–36    7 个字符起落（起跳间隔 6.9→2.6f，越来越密 = 硬加速 R2）；每字 20f 坠到线上
//   26–86   触地 / 弹跳 / 挤压、地平线下陷振荡、纸灰
//   44–110  朱红句号：44f 起跳 → 64f 触地 → 三跳到 ~108f 停
//   110–122 立正一拍：3f 吸气撑到 1.05 → 9f 全员 rotate→0（overshoot 一次）
//   114–134 副标题逐词升起、注释行淡入
//   134–160 hold（整幅极缓推近 1.00→1.025 贯穿全片，不停死）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, SpeedBlur, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const LETTER_DROP_PHYSICS_DURATION = 160;

const L = LOOKS.paper;

// 确定性伪随机
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const WORD = 'GRAVITY';
const SIZE = 290; // 字号
const TRACK = -0.035; // 字距（em）：粗黑体海报收紧
// 每字字心 x / 字形宽（px，1920 画布实测，SF Pro Black 290px）——只用来给地平线下陷、接触影、纸灰定位；
// 字形排版仍走 flex 自然字宽（换字体时偏几十 px 也只是下陷包络的中心略偏，看不出来）
const CX = [412, 614, 804, 1002, 1136, 1261, 1438];
const GW = [195, 176, 205, 200, 58, 171, 195];
const DOT_CX = 1580;
const DOT_D = 0.21 * SIZE; // 句号直径
const DOT_GAP = 0.06 * SIZE;
const FLOOR_Y = 640; // 地平线（字符基线）
const BASE = Math.round(SIZE * 0.886); // 行盒顶到基线（SF Pro，lineHeight 1）
const ROW_TOP = FLOOR_Y - BASE;
const LINE_W = 6; // 地平线粗细
const LINE_X0 = 120;
const LINE_X1 = 1800;

const PAD = 220; // 运动模糊层外扩（SVG 滤镜区域按盒计算，太紧会裁出硬边）
const DROP = 980; // 下落距离：从画外顶上落下
const T_FALL = 20;
// 弹跳：高度比 hk，时长 = 2·T_FALL·√hk（同一重力下真实比例）
type Bounce = { h: number; d: number };
const bounces = (hs: number[]): Bounce[] => hs.map((k) => ({ h: k, d: 2 * T_FALL * Math.sqrt(k) }));
const B_LETTER = bounces([0.22, 0.06]);
const B_DOT = bounces([0.34, 0.11, 0.03]);
const DOT_START = 44;
const SNAP = 110; // 立正一拍
const SNAP_DUR = 9;

// 字符起跳帧：越来越密
const startOf = (i: number) => 6 + 30 * (1 - Math.pow(1 - i / (WORD.length - 1), 1.6));

const X0 = CX[0] - GW[0] / 2; // 字行左缘（副标题对齐它）

// 纵向位移（相对地面，负 = 在上方）
const dropY = (t: number, bs: Bounce[]): number => {
  if (t <= 0) return -DROP;
  if (t < T_FALL) return -DROP + DROP * (t / T_FALL) ** 2; // 重力加速
  let t0 = T_FALL;
  for (const b of bs) {
    if (t < t0 + b.d) {
      const u = (t - t0) / b.d;
      return -DROP * b.h * 4 * u * (1 - u); // 抛物线
    }
    t0 += b.d;
  }
  return 0;
};
// 触地时刻与强度
const impacts = (bs: Bounce[]): [number, number][] => {
  const out: [number, number][] = [[T_FALL, 1]];
  let t0 = T_FALL;
  for (const b of bs) {
    t0 += b.d;
    out.push([t0, Math.sqrt(b.h) * 1.4]);
  }
  return out;
};
const IMP_LETTER = impacts(B_LETTER);
const IMP_DOT = impacts(B_DOT);
// 触地挤压：每次触地一个阻尼振荡（正 = 压扁）
const squashAt = (t: number, imp: [number, number][]) => {
  let s = 0;
  for (const [t0, k] of imp) {
    const d = t - t0;
    if (d < 0 || d > 18) continue;
    s += k * Math.exp(-d / 2.8) * Math.cos(d * 0.8);
  }
  return s;
};
// 地平线在落点的下陷（px，正 = 向下）：比挤压慢一拍、更软的振荡（绳子的惯性）
const sagAt = (t: number, imp: [number, number][], mass: number) => {
  let s = 0;
  for (const [t0, k] of imp) {
    const d = t - t0;
    if (d < 0 || d > 30) continue;
    s += k * mass * Math.exp(-d / 5) * Math.sin((d + 1.2) * 0.42);
  }
  return s;
};

// 每个物体（7 字 + 句号）在帧 f 的状态
type Body = { cx: number; start: number; bs: Bounce[]; imp: [number, number][]; mass: number; w: number };
const BODIES: Body[] = [
  ...CX.map((cx, i) => ({ cx, start: startOf(i), bs: B_LETTER, imp: IMP_LETTER, mass: 16 + GW[i] * 0.05, w: GW[i] })),
  { cx: DOT_CX, start: DOT_START, bs: B_DOT, imp: IMP_DOT, mass: 10, w: DOT_D },
];
// 地平线在 x 处的下陷：所有物体落点的高斯包络叠加
const floorSag = (x: number, f: number) => {
  let y = 0;
  for (const b of BODIES) {
    const s = sagAt(f - b.start, b.imp, b.mass);
    if (s === 0) continue;
    const u = (x - b.cx) / (b.w * 0.55 + 60);
    y += s * Math.exp(-u * u);
  }
  return y;
};

// 纸灰：首次触地时两侧各扬起 5 团（贴地向外冲、边走边胀、边升边散）
const PUFF_N = 10;
const Puffs: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    {BODIES.map((b, bi) =>
      Array.from({ length: PUFF_N }, (_, k) => {
        const t = frame - b.start - T_FALL;
        if (t < 0 || t > 30) return null;
        const side = k < PUFF_N / 2 ? -1 : 1;
        const r = h(bi * 13 + k * 3.1);
        const p = EASE.out(clamp01(t / 26));
        const x = b.cx + side * (b.w * 0.3 + p * (50 + r * 150));
        const y = FLOOR_Y - 6 - p * (10 + r * 46);
        const rad = mix(10, 34 + r * 30, p) * (bi === 7 ? 0.6 : 1);
        const op = (1 - EASE.swift(clamp01(t / 30))) * (0.13 + 0.1 * r) * clamp01(t / 2);
        return (
          <div key={`${bi}-${k}`} style={{
            position: 'absolute', left: x - rad, top: y - rad, width: rad * 2, height: rad * 2, borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(L.ink3, op)} 0%, ${alpha(L.ink3, op * 0.5)} 35%, ${alpha(L.ink3, 0)} 72%)`,
          }} />
        );
      }),
    )}
  </>
);

const PHASES = ['Fall', 'Bounce', 'Settle'];

export const LetterDropPhysics: React.FC = () => {
  const frame = useCurrentFrame();
  // 立正一拍：吸气撑起 → ease-out 回落；歪角回正带一次过冲
  const inhale = ramp(frame, SNAP - 3, 3, EASE.out);
  const snap = ramp(frame, SNAP, SNAP_DUR, EASE.snappy);
  const snapRot = ramp(frame, SNAP, SNAP_DUR + 3, EASE.overshoot);
  const pulse = 0.05 * inhale * (1 - snap);
  const push = 1 + 0.025 * ramp(frame, 0, LETTER_DROP_PHYSICS_DURATION, EASE.swift);
  const grid = ramp(frame, 0, 14, EASE.out);
  // 相位：首字触地前 = Fall，句号停下前 = Bounce，之后 Settle
  const phase = frame < startOf(0) + T_FALL ? 0 : frame < SNAP ? 1 : 2;

  // 地平线路径
  const pts: string[] = [];
  for (let x = LINE_X0; x <= LINE_X1; x += 8) pts.push(`${x},${(FLOOR_Y + LINE_W / 2 + floorSag(x, frame)).toFixed(2)}`);

  const meta: React.CSSProperties = { ...type(30, 600, { caps: true }), letterSpacing: '0.14em', color: L.ink2 };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.42, y: 0.12 }} fill={{ x: 0.9, y: 0.95 }}>
        {/* 地平线以下的台面：极淡的向下渐深，给"地"一点体积 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: FLOOR_Y, bottom: 0,
          background: `linear-gradient(180deg, ${alpha(L.shadow, 0.05)} 0%, ${alpha(L.shadow, 0.015)} 40%, ${alpha(L.shadow, 0)} 80%)`,
        }} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(4)})`, transformOrigin: `50% ${FLOOR_Y}px` }}>
        {/* 海报网格：四角信息 */}
        <div style={{ position: 'absolute', left: 120, top: 96, display: 'flex', gap: 28, alignItems: 'baseline', opacity: grid }}>
          <span style={{ ...type(30, 700, { mono: true }), color: L.ink }}>N°07</span>
          <span style={{ ...meta }}>Kinetica Physics</span>
        </div>
        <div style={{ position: 'absolute', right: 120, top: 96, display: 'flex', gap: 22, alignItems: 'center', opacity: grid }}>
          {PHASES.map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && <span style={{ width: 34, height: 2, background: L.line }} />}
              <span style={{ ...meta, color: i === phase ? L.accent : i < phase ? L.ink : L.ink3 }}>{`0${i + 1} ${p}`}</span>
            </React.Fragment>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 120, top: 150, width: LINE_X1 - 120, height: 1, background: L.line, opacity: grid }} />

        {/* 左缘高度标尺：刻度是纹理，朱红游标实时读出句号离地高度（它弹跳时游标跟着上下） */}
        {(() => {
          const top = 190;
          const span = FLOOR_Y - top;
          const dotAir = -dropY(frame - DOT_START, B_DOT);
          const my = FLOOR_Y - Math.min(span, dotAir * (span / (DROP * 0.42)));
          const live = frame >= DOT_START + 6 && frame < SNAP + 12;
          const mOp = live ? clamp01((frame - DOT_START - 6) / 6) * (1 - ramp(frame, SNAP, 12, EASE.out)) : 0;
          return (
            <div style={{ position: 'absolute', left: 120, top: 0, opacity: grid }}>
              {Array.from({ length: 12 }, (_, k) => {
                const y = FLOOR_Y - (k * span) / 11;
                const major = k % 5 === 0 || k === 11;
                return <div key={k} style={{ position: 'absolute', left: 0, top: y - 1, width: major ? 28 : 14, height: 2, background: major ? L.ink2 : L.ink3, opacity: major ? 0.7 : 0.45 }} />;
              })}
              <div style={{ position: 'absolute', left: 0, top: top, width: 2, height: span, background: L.line }} />
              {[5, 11].map((k) => (
                <span key={k} style={{ position: 'absolute', left: 40, top: FLOOR_Y - (k * span) / 11 - 14, ...type(24, 500, { mono: true }), color: L.ink3 }}>
                  {k === 11 ? 'h₀' : '½'}
                </span>
              ))}
              <div style={{
                position: 'absolute', left: -6, top: my - 7, width: 0, height: 0, opacity: mOp,
                borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: `12px solid ${L.accent}`,
              }} />
              <div style={{ position: 'absolute', left: 8, top: my - 1, width: 40, height: 2, background: L.accent, opacity: mOp }} />
            </div>
          );
        })()}

        {/* 接触影：离地越高越大越虚越淡 */}
        {BODIES.map((b, i) => {
          const t = frame - b.start;
          const air = -dropY(t, b.bs);
          const lift = clamp01(air / 500);
          const op = (t < 0 ? 0 : 0.22) * (1 - lift * 0.9) * clamp01((t + 4) / 10);
          const sag = floorSag(b.cx, frame);
          return (
            <div key={`sh${i}`} style={{
              position: 'absolute', left: b.cx - b.w * 0.45, top: FLOOR_Y + LINE_W + sag - 4, width: b.w * 0.9, height: 16,
              borderRadius: '50%', background: L.shadow, opacity: op,
              transform: `scaleX(${mix(0.85, 1.4, lift).toFixed(3)})`, filter: `blur(${mix(6, 22, lift).toFixed(1)}px)`,
            }} />
          );
        })}

        {/* 弹性地平线 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: grid }}>
          <polyline points={pts.join(' ')} fill="none" stroke={L.ink} strokeWidth={LINE_W} strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <Puffs frame={frame} />

        {/* 字行：flex 按自然字宽排槽位，槽内只做 transform */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: ROW_TOP, height: SIZE,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          ...type(SIZE, 900), letterSpacing: `${TRACK}em`, lineHeight: 1, color: L.ink,
        }}>
          {[...WORD.split(''), '.'].map((ch, i) => {
            const b = BODIES[i];
            const isDot = ch === '.';
            const t = frame - b.start;
            const y = dropY(t, b.bs) + floorSag(b.cx, frame);
            const vy = dropY(t + 0.5, b.bs) - dropY(t - 0.5, b.bs);
            // 落地歪到 seed 小角度（±5°），立正一拍归零；句号不歪
            const tiltTarget = isDot ? 0 : (h(i + 3) - 0.5) * 10;
            const landP = EASE.out(clamp01((t - T_FALL) / 6));
            const rot = tiltTarget * landP * (1 - snapRot);
            // 歪着站 = 一个底角着地：按歪角把字抬起 sin|θ|·半字宽，底角贴线不穿线
            const lift = -Math.sin((Math.abs(rot) * Math.PI) / 180) * b.w * 0.5;
            const fast = t < T_FALL;
            const stretch = Math.min(1, Math.abs(vy) / 90) * (isDot ? 0.22 : 0.14) * (fast ? 1 : 0.5);
            const sq = squashAt(t, b.imp) * (isDot ? 1.3 : 1);
            const sy = (1 + stretch) * (1 - 0.18 * sq) + pulse;
            const sx = (1 - stretch * 0.5) * (1 + 0.14 * sq) + pulse;
            const op = clamp01((t + 1) / 3);
            const glyph = isDot ? (
              <div style={{
                position: 'absolute', left: PAD + DOT_GAP, top: PAD + BASE - DOT_D, width: DOT_D, height: DOT_D, borderRadius: '50%',
                background: `radial-gradient(circle at 36% 30%, #f2664f 0%, ${L.accent} 55%, #b92f1d 100%)`,
                transform: `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`, transformOrigin: '50% 100%',
              }} />
            ) : (
              <div style={{
                position: 'absolute', left: PAD, right: PAD, top: PAD, bottom: PAD, textAlign: 'center',
                transform: `rotate(${rot.toFixed(3)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`,
                transformOrigin: `50% ${BASE}px`,
              }}>
                {ch}
              </div>
            );
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block', opacity: op }}>
                {/* 占位：撑出自然字宽（句号用固定宽） */}
                {isDot ? (
                  <span style={{ display: 'inline-block', width: DOT_GAP + DOT_D, height: SIZE }} />
                ) : (
                  <span style={{ visibility: 'hidden' }}>{ch}</span>
                )}
                <div style={{
                  position: 'absolute', left: -PAD, right: -PAD, top: -PAD, bottom: -PAD,
                  transform: `translateY(${(y + lift).toFixed(2)}px)`,
                }}>
                  <SpeedBlur vx={0} vy={vy} amount={fast ? 0.2 : 0.08} max={22}>{glyph}</SpeedBlur>
                </div>
              </span>
            );
          })}
        </div>

        {/* 线下：副标题 + 注释 */}
        <div style={{ position: 'absolute', left: X0, top: FLOOR_Y + 72, ...type(64, 650), color: L.ink }}>
          <TextReveal text="Everything lands somewhere." by="word" variant="rise" start={SNAP + 4} each={16} gap={3} />
        </div>
        <div style={{
          position: 'absolute', left: X0, top: FLOOR_Y + 168, ...type(32, 500), color: L.ink2,
          opacity: ramp(frame, SNAP + 14, 16, EASE.out), transform: `translateY(${((1 - ramp(frame, SNAP + 14, 16, EASE.out)) * 10).toFixed(2)}px)`,
        }}>
          Real mass, real bounce — for every element on screen.
        </div>
        <div style={{ position: 'absolute', right: 120, bottom: 96, display: 'flex', gap: 40, opacity: grid }}>
          <span style={{ ...type(30, 500, { mono: true }), color: L.ink2 }}>g = 9.81 m/s²</span>
          <span style={{ ...type(30, 500, { mono: true }), color: L.ink3 }}>e = 0.47</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
