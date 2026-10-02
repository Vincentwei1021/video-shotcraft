// 线条沸腾（line-boil）——手绘动画 line boil 质感：静止线稿在"沸腾段"边缘每 3 帧被"重描"一次，
// 像手绘逐帧描线的抖动。SVG filter feTurbulence(baseFrequency 0.015, numOctaves 2,
// seed = Math.floor(f/3) 每 3 帧阶梯换) + feDisplacementMap scale=8 作用于"手绘层"整层。
// 判例：沸腾段外整个 filter 与 SVG def 根本不渲染（条件挂载），不是 opacity 到 0——收尾天然真静止。
//
// 第二轮重设计（蓝图 · 工业设计手稿）：
// - look = midnight（底色提成"蓝晒纸"深钴蓝 #0f2858，线是蓝图白，唯一强调色是琥珀黄圈注）。
//   画面是一张工业设计概念稿：右侧一只手绘圆柱音箱（三分之二透视、网罩弧线、顶部旋钮、
//   明暗排线、尺寸线、中轴构造虚线），左侧大标题「Start / rough.」（实心白 + 描边空心字，字重对比）。
//   被沸腾的是"手画的东西"——标题与线稿；眉题、副标题、状态标、蓝图网格不进滤镜，是静止参照物。
// - 每条线稿画两遍（主线 + 偏 1.5px 的淡色复描），静止时也是手稿感，不是矢量图标。
// - 宿主入场：线稿按顺序"被画出来"（stroke-dashoffset 描线，错峰先密后疏），标题从线下升起；
//   入场完成后才起沸腾（卡片 md：宿主入场完成后再起沸腾）。
// - 状态标做成画面里的东西：左下「● LIVE SKETCH」→ 摘罩那一帧换成「✓ INKED」，不是调试胶囊。
//
// 时间表（30fps，共 150f）：
//   0–8     预备：蓝图网格、舞台光在第 1 帧就在；眉题字距收拢
//   4–40    主动作：标题逐行升起（4–30f），线稿按「构造线 → 轮廓 → 网罩/排线 → 尺寸 → 圈注」逐条描出（6–44f）
//   40–112  沸腾段 72f（seed 每 3 帧一换 = 10fps 手翻书）；相机全程极缓推进 1.000→1.022
//   112     摘罩：filter 与 defs 一起卸载，轮廓"啪"地归位；状态标同帧切换
//   112–150 真静止 38f（相机推进按 smooth 曲线在 ~140f 收敛到 0 速度，最后 10f 逐帧完全相同）
import React, { useId } from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type, type Look } from '../../_fixtures/Look';

export const LINE_BOIL_DURATION = 150;

const BOIL_START = 40;
const BOIL_END = 112;
const BOIL_SCALE = 8; // 大字标题档；>12 读作故障扭曲

// 蓝晒纸：在 midnight 基础上把底提亮成钴蓝（蓝图），线色是带一点蓝的白
const L: Look = { ...LOOKS.midnight, bg: ['#123067', '#0e2754', '#0a1c3e'], light: '#4f86ff' };
const LINE = '#e9f1ff';
const LINE2 = 'rgba(214,228,255,0.55)';
const LINE3 = 'rgba(190,210,255,0.28)';
const AMBER = '#ffbf47'; // 唯一强调色：圈注

// ───────────── 线稿 ─────────────
// 每条线：d、线宽、颜色、描线顺序 o、是否虚线（构造线）
type Stroke = { d: string; w: number; c: string; o: number; dash?: boolean; ghost?: boolean };

// 音箱几何（SVG 局部坐标 0..780 × 0..760）：中轴 x=390，顶椭圆 y=170，底椭圆 y=590，rx=210 ry=58
const CX = 390, TOP = 170, BOT = 590, RX = 210, RY = 58;
const arcFront = (y: number, rx = RX, ry = RY) => `M${CX - rx} ${y} Q${CX} ${y + ry * 2} ${CX + rx} ${y}`;
const arcBack = (y: number, rx = RX, ry = RY) => `M${CX - rx} ${y} Q${CX} ${y - ry * 2} ${CX + rx} ${y}`;

const STROKES: Stroke[] = [
  // 构造线（最先画、最淡）：中轴、地平线
  { d: `M${CX} 40 V720`, w: 1.6, c: LINE3, o: 0, dash: true },
  { d: `M40 ${BOT + 70} H740`, w: 1.6, c: LINE3, o: 0, dash: true },
  // 机身轮廓：顶椭圆（前后两半）、两侧母线（起笔出头一点 = 手画）、底部前弧
  { d: arcBack(TOP), w: 3.4, c: LINE, o: 1, ghost: true },
  { d: arcFront(TOP), w: 3.4, c: LINE, o: 1.2, ghost: true },
  { d: `M${CX - RX} ${TOP - 14} L${CX - RX} ${BOT + 6}`, w: 3.4, c: LINE, o: 2, ghost: true },
  { d: `M${CX + RX} ${TOP - 10} L${CX + RX} ${BOT + 8}`, w: 3.4, c: LINE, o: 2.2, ghost: true },
  { d: arcFront(BOT), w: 3.4, c: LINE, o: 3, ghost: true },
  { d: arcBack(BOT), w: 1.6, c: LINE3, o: 3.2, dash: true },
  // 顶部：灯环 + 旋钮
  { d: `${arcBack(TOP, 150, 40)} ${arcFront(TOP, 150, 40).replace('M', 'L')}`, w: 2, c: LINE2, o: 4 },
  { d: `${arcBack(TOP - 6, 58, 16)} ${arcFront(TOP - 6, 58, 16).replace('M', 'L')}`, w: 3, c: LINE, o: 4.4, ghost: true },
  { d: `M${CX - 58} ${TOP - 6} V${TOP + 12} M${CX + 58} ${TOP - 6} V${TOP + 12}`, w: 3, c: LINE, o: 4.6 },
  { d: arcFront(TOP + 12, 58, 16), w: 3, c: LINE, o: 4.8 },
  // 网罩上下两道接缝（顺着圆柱曲率的弧线）
  { d: arcFront(TOP + 52, RX - 2, RY - 1), w: 2.2, c: LINE2, o: 5 },
  { d: arcFront(BOT - 46, RX - 2, RY - 1), w: 2.2, c: LINE2, o: 5.3 },
  // 明暗排线：右侧背光面的斜线
  ...Array.from({ length: 10 }, (_, i): Stroke => {
    const y = TOP + 90 + i * 30;
    return { d: `M${CX + RX - 34} ${y + 40} L${CX + RX - 6} ${y}`, w: 1.6, c: LINE2, o: 7 + i * 0.15 };
  }),
  // 尺寸线：右侧高度 + 两端短横 + 箭头
  { d: `M${CX + RX + 54} ${TOP} V${BOT}`, w: 2, c: LINE2, o: 8 },
  { d: `M${CX + RX + 38} ${TOP} H${CX + RX + 70} M${CX + RX + 38} ${BOT} H${CX + RX + 70}`, w: 2, c: LINE2, o: 8.2 },
  { d: `M${CX + RX + 46} ${TOP + 16} L${CX + RX + 54} ${TOP + 2} L${CX + RX + 62} ${TOP + 16} M${CX + RX + 46} ${BOT - 16} L${CX + RX + 54} ${BOT - 2} L${CX + RX + 62} ${BOT - 16}`, w: 2, c: LINE2, o: 8.4 },
  // 地面投影：底部右后方两道短弧
  { d: `M${CX - 120} ${BOT + 96} Q${CX + 60} ${BOT + 118} ${CX + 250} ${BOT + 74}`, w: 2, c: LINE3, o: 9 },
  // 琥珀圈注：绕旋钮的不闭合椭圆 + 引线（最后画 = 设计师的"就是这里"）
  { d: `M${CX - 96} ${TOP - 4} Q${CX - 96} ${TOP - 66} ${CX + 6} ${TOP - 64} Q${CX + 104} ${TOP - 60} ${CX + 100} ${TOP + 2} Q${CX + 92} ${TOP + 52} ${CX - 8} ${TOP + 50} Q${CX - 92} ${TOP + 44} ${CX - 84} ${TOP - 22}`, w: 3.2, c: AMBER, o: 10 },
  { d: `M${CX + 98} ${TOP - 38} Q${CX + 170} ${TOP - 96} ${CX + 236} ${TOP - 104}`, w: 2.6, c: AMBER, o: 10.6 },
];
const MAX_O = 10.6;

// 网罩孔点阵：7 行 × 13 列，θ ∈ [−64°, 64°]，x = CX + R·sinθ、y 落在前弧上，横向半径 ∝ cosθ
const GRILLE = Array.from({ length: 7 * 13 }, (_, i) => {
  const row = Math.floor(i / 13), col = i % 13;
  const th = ((col - 6) / 6) * (64 * Math.PI) / 180;
  return { row, x: CX + (RX - 10) * Math.sin(th), y: TOP + 94 + row * 40 + (RY - 6) * Math.cos(th), rx: 1.2 + 5 * Math.cos(th) };
});

// 描线：pathLength=1 归一化，dashoffset 1→0；虚线构造线用遮罩式 dash（先画实线段再按 dash 显示会乱，这里改为 opacity 淡入）
const Sketch: React.FC<{ f: number }> = ({ f }) => (
  <svg width={780} height={760} viewBox="0 0 780 760" style={{ overflow: 'visible' }}>
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {STROKES.map((s, i) => {
        const t0 = 6 + (s.o / MAX_O) * 26; // 轮廓先、细节后，约 26f 内描完
        const p = ramp(f, t0, s.dash ? 10 : 12, EASE.swift);
        if (p <= 0) return null;
        if (s.dash) {
          return <path key={i} d={s.d} stroke={s.c} strokeWidth={s.w} strokeDasharray="10 12" opacity={p} />;
        }
        return (
          <g key={i}>
            {s.ghost && (
              <path d={s.d} pathLength={1} stroke={s.c} strokeWidth={s.w * 0.45} opacity={0.38}
                strokeDasharray="1 2" strokeDashoffset={1 - ramp(f, t0 + 2, 12, EASE.swift)} transform="translate(2.2,-1.6)" />
            )}
            <path d={s.d} pathLength={1} stroke={s.c} strokeWidth={s.w} strokeDasharray="1 2" strokeDashoffset={1 - p} />
          </g>
        );
      })}
    </g>
    {/* 网罩孔：沿圆柱表面的椭圆点阵（越靠两侧越扁 = 透视缩短），逐行淡入 */}
    <g fill="none" stroke={LINE2} strokeWidth={1.7}>
      {GRILLE.map((g, i) => {
        const p = ramp(f, 16 + g.row * 1.6, 8, EASE.out);
        return p > 0 ? <ellipse key={i} cx={g.x} cy={g.y} rx={g.rx} ry={4.8} opacity={p} /> : null;
      })}
    </g>
    {/* 图注：等宽大写制图字（画进线稿层 = 也会沸腾，像手写标注） */}
    <g style={{ fontFamily: FONT.mono, fontWeight: 600 }}>
      <text x={CX + RX + 84} y={(TOP + BOT) / 2 + 10} fill={LINE2} fontSize={30} opacity={ramp(f, 26, 10, EASE.out)}>180</text>
      <text x={CX + 248} y={TOP - 96} fill={AMBER} fontSize={30} letterSpacing="0.06em" opacity={ramp(f, 36, 8, EASE.out)}>ONE KNOB.</text>
      <text x={60} y={BOT + 128} fill={LINE3} fontSize={24} letterSpacing="0.08em" opacity={ramp(f, 30, 10, EASE.out)}>FIG. 02 — 3/4 VIEW</text>
    </g>
  </svg>
);

// 蓝图网格：主格 120 / 次格 24，静态（不进滤镜）
const Blueprint: React.FC = () => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
    <defs>
      <pattern id="lb-minor" width={24} height={24} patternUnits="userSpaceOnUse">
        <path d="M24 0 V24 H0" fill="none" stroke="rgba(170,200,255,0.06)" strokeWidth={1} />
      </pattern>
      <pattern id="lb-major" width={120} height={120} patternUnits="userSpaceOnUse" x={0} y={0}>
        <rect width={120} height={120} fill="url(#lb-minor)" />
        <path d="M120 0 V120 H0" fill="none" stroke="rgba(170,200,255,0.12)" strokeWidth={1.2} />
      </pattern>
    </defs>
    <rect width={1920} height={1080} fill="url(#lb-major)" />
    {/* 图框：内缩 48px 的双线框 + 右下标题栏 */}
    <rect x={48} y={48} width={1824} height={984} fill="none" stroke="rgba(200,220,255,0.18)" strokeWidth={1.5} />
    <rect x={56} y={56} width={1808} height={968} fill="none" stroke="rgba(200,220,255,0.08)" strokeWidth={1} />
  </svg>
);

export const LineBoil: React.FC = () => {
  const f = useCurrentFrame();
  const boilId = `boil-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const boiling = f >= BOIL_START && f < BOIL_END;
  const seed = Math.floor(f / 3);

  // 相机：极缓推进，smooth 曲线 0→140f 收敛（尾 10f 逐帧相同）
  const cam = 1 + 0.022 * ramp(f, 0, 140, EASE.smooth);
  const ebT = ramp(f, 0, 22, EASE.snappy);
  const inked = f >= BOIL_END;

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.62, y: 0.12 }} fill={{ x: 0.1, y: 0.95 }} intensity={0.8} vignette={0.5} grain={0.08}>
        <Blueprint />
      </Stage>

      {boiling && (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <filter id={boilId} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency={0.015} numOctaves={2} seed={seed} result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={BOIL_SCALE} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
      )}

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: '58% 50%' }}>
        {/* 眉题（静止参照物，不进滤镜） */}
        <div style={{
          position: 'absolute', left: 140, top: 236, fontFamily: FONT.mono, fontSize: 26, fontWeight: 600,
          letterSpacing: `${(0.32 - 0.18 * ebT).toFixed(3)}em`, color: alpha(LINE, 0.62), opacity: ebT, textTransform: 'uppercase',
        }}>
          Pellam · Concept 02
        </div>

        {/* 手绘层：标题 + 线稿，整层沸腾 */}
        <div style={{ position: 'absolute', inset: 0, filter: boiling ? `url(#${boilId})` : undefined }}>
          <div style={{ position: 'absolute', left: 132, top: 300, color: LINE }}>
            <div style={{ ...type(200, 820), letterSpacing: '-0.045em' }}>
              <TextReveal text="Start" by="line" variant="rise" start={4} each={20} />
            </div>
            <div style={{
              ...type(200, 820), letterSpacing: '-0.045em', marginTop: 4,
              color: 'transparent', WebkitTextStroke: `3.2px ${LINE}`,
            }}>
              <TextReveal text="rough." by="line" variant="rise" start={10} each={20} />
            </div>
          </div>
          <div style={{ position: 'absolute', left: 980, top: 150 }}>
            <Sketch f={f} />
          </div>
        </div>

        {/* 副标题（静止参照物） */}
        <div style={{
          position: 'absolute', left: 140, top: 758, width: 640, ...type(38, 450), lineHeight: 1.35, color: alpha(LINE, 0.72),
          opacity: ramp(f, 20, 14, EASE.out), transform: `translateY(${(1 - ramp(f, 20, 18, EASE.snappy)) * 18}px)`,
        }}>
          Every speaker we ship began as a pencil line on a Tuesday.
        </div>

        {/* 状态标：沸腾中 = 琥珀实点「LIVE SKETCH」；摘罩同帧 = 「✓ INKED」 */}
        <div style={{
          position: 'absolute', left: 140, top: 900, display: 'flex', alignItems: 'center', gap: 16,
          fontFamily: FONT.mono, fontSize: 26, fontWeight: 600, letterSpacing: '0.12em',
          opacity: ramp(f, 30, 10, EASE.out), color: inked ? LINE : alpha(LINE, 0.75),
        }}>
          {inked ? (
            <svg width={26} height={26} viewBox="0 0 26 26">
              <circle cx={13} cy={13} r={12} fill={LINE} />
              <path d="M7.5 13.5 L11.5 17 L18.5 9.5" fill="none" stroke={L.bg[1]} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <div style={{
              width: 18, height: 18, borderRadius: 9, margin: 4, boxSizing: 'border-box',
              background: boiling ? AMBER : 'transparent', border: boiling ? 'none' : `2px solid ${alpha(LINE, 0.5)}`,
              boxShadow: boiling ? `0 0 14px ${alpha(AMBER, 0.8)}` : undefined,
            }} />
          )}
          {inked ? 'INKED' : boiling ? 'LIVE SKETCH' : 'DRAFTING'}
        </div>
      </div>
    </div>
  );
};
