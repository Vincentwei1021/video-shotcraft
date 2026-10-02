// stroke-segment-build —— 断笔成字（《异形》式）：标题拆成十几段互不相连的笔画，乱序逐段点亮，
// 前 70% 读不出字，最后几段"钥匙段"落位的瞬间意义"啪"地成立。
//
// 第二轮重设计（极光夜 · 霓虹灯牌）：
// - look = aurora。"SHIP" 重画成 400px 高的单线几何字（S 用两段反向弧，P 有圆弧碗），拆成 16 根
//   互不相连的霓虹灯管（灯管之间留电极缝），挂在一面深紫墙上。每根灯管"点亮"是霓虹起辉：
//   亮—灭—亮—半亮—亮 的 7f 抖闪，之后以 0.58 亮度稳住；揭晓前整块灯牌处于"半亮碎片"态。
// - 节奏「疏 → 密 → 屏息 → 一、二、三 → 轰」：前 13 段的起点按 ease-out 分布（间隔 9f 越来越密到 3f），
//   然后 14f 屏息（只有灯管电流的微弱嗡动），最后 3 根钥匙段（S 脊、H 横、P 碗底）以 7f/6f 的拍子落下，
//   末段落位帧整块灯牌电流涌起：全部灯管 0.58→1 并冲到 1.25 再回落、灯牌自身的宽泛光涌起一次、墙面与地面被照亮。
// - 空间：墙面的环境光 = 已点亮灯管数（物理：灯越多墙越亮）；下方是一块光亮地面，倒映灯牌下半截
//   （模糊 + 渐隐）+ 一条地面光带；整个镜头 1→1.035 极缓推近。
// - 揭晓后才浮出副题（不提前泄底）：video-shotcraft 字标（全小写）● ONE PROMPT, ONE FILM。
//
// 时间表（30fps，共 165f）：
//   0–12    暗墙 + 极淡的墙面光（开场不是死黑）
//   12–72   前 13 段乱序点亮，间隔 9f → 3f（越来越快）
//   72–86   屏息 14f：什么都不新增，只有灯管嗡动
//   86/93/99 三根钥匙段：S 脊 → H 横 → P 碗底
//   105     末段起辉完毕 = 揭晓：电流涌起 + 泛光 + 墙/地亮起
//   113–129 副题升起
//   129–165 hold：灯牌稳定发光，镜头极缓推近
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { EASE, FONT, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, stagger } from '../../_fixtures/Look';
import { BRAND } from '../../_fixtures/Brand';

export const STROKE_SEGMENT_BUILD_DURATION = 165;

const L = LOOKS.aurora;
const TUBE = '#ff5cab'; // 灯管本色（霓虹粉）
const GLOW = L.accent2; // 泛光
const CORE = '#fff2f8'; // 白热芯

// —— 字形：每字 260×400，字间 70；单线几何字，笔画线宽 30 ——
const LW = 260;
const LH = 400;
const ADV = LW + 70;
const WORD_W = ADV * 3 + LW; // 1250
const OX = (1920 - WORD_W) / 2;
const OY = 190;
const SW = 30;

type Seg = { d: string; key?: boolean };
const at = (k: number) => (x: number) => x + ADV * k;
const S = at(0);
const H = at(1);
const I = at(2);
const P = at(3);
const SEGS: Seg[] = [
  // S —— 6 段（两段反向弧拆开）
  { d: `M ${S(228)} 92 C ${S(214)} 44 ${S(176)} 20 ${S(130)} 20` }, // 0 顶钩
  { d: `M ${S(130)} 20 C ${S(72)} 20 ${S(34)} 54 ${S(34)} 104` }, // 1 左上弧
  { d: `M ${S(34)} 104 C ${S(34)} 156 ${S(78)} 178 ${S(130)} 196` }, // 2 上脊
  { d: `M ${S(130)} 196 C ${S(186)} 214 ${S(228)} 240 ${S(228)} 296`, key: true }, // 3 下脊（钥匙）
  { d: `M ${S(228)} 296 C ${S(228)} 348 ${S(186)} 380 ${S(130)} 380` }, // 4 右下弧
  { d: `M ${S(130)} 380 C ${S(80)} 380 ${S(42)} 356 ${S(30)} 306` }, // 5 尾钩
  // H —— 4 段
  { d: `M ${H(34)} 20 L ${H(34)} 196` }, // 6 左竖上
  { d: `M ${H(34)} 204 L ${H(34)} 380` }, // 7 左竖下
  { d: `M ${H(226)} 20 L ${H(226)} 380` }, // 8 右竖
  { d: `M ${H(58)} 200 L ${H(202)} 200`, key: true }, // 9 中横（钥匙）
  // I —— 2 段
  { d: `M ${I(130)} 20 L ${I(130)} 196` }, // 10 上
  { d: `M ${I(130)} 204 L ${I(130)} 380` }, // 11 下
  // P —— 4 段
  { d: `M ${P(34)} 20 L ${P(34)} 196` }, // 12 竖上
  { d: `M ${P(34)} 204 L ${P(34)} 380` }, // 13 竖下
  { d: `M ${P(58)} 20 L ${P(140)} 20 C ${P(196)} 20 ${P(228)} 56 ${P(228)} 108` }, // 14 碗顶
  { d: `M ${P(228)} 108 C ${P(228)} 160 ${P(196)} 196 ${P(140)} 196 L ${P(58)} 196`, key: true }, // 15 碗底（钥匙）
];

// 乱序表：前 13 段跨字乱跳（读不出），钥匙段（S 下脊 / H 中横 / P 碗底）压到最后
const ORDER = [14, 5, 8, 10, 0, 13, 6, 1, 11, 4, 12, 7, 2, 3, 9, 15];
const FIRST = 12;
const SPAN = 60; // 前 13 段起点分布在 12–72
const KEY_AT = [86, 93, 99]; // 屏息 14f 后的三拍
const STRIKE = 7; // 单根起辉时长
const REVEAL = KEY_AT[2] + 6; // 105
const startOf = (rank: number) => (rank < 13 ? FIRST + stagger(rank, 13, SPAN, EASE.out) : KEY_AT[rank - 13]);

// 霓虹起辉：亮—灭—亮—半亮—亮 → 稳在 0.58（揭晓后到 1）
const strike = (f: number, s: number) =>
  interpolate(f, [s, s + 1, s + 2, s + 3, s + 4, s + 5, s + STRIKE], [0, 1, 0.12, 0.95, 0.4, 1, 0.58], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// 确定性"电流嗡动"：极小的亮度起伏（每根相位不同）
const hum = (f: number, i: number) => 1 + 0.035 * Math.sin(f * 0.9 + i * 2.3) * Math.sin(f * 0.37 + i);

// 揭晓的"泛光一次"不另画光斑，而是让灯牌自己的宽泛光随电流涌起一下（形状就是字，Q4 只给主角）
const Sign: React.FC<{ frame: number; surge: number; reveal: number; idPrefix: string }> = ({ frame, surge, reveal, idPrefix }) => {
  const lit = SEGS.map((seg, i) => {
    const s = startOf(ORDER.indexOf(i));
    if (frame < s) return null; // 未亮段不渲染（真静止 / 不泄底）
    const b = strike(frame, s);
    const settled = frame >= s + STRIKE;
    const level = settled ? 0.58 + 0.42 * reveal : b;
    return { i, d: seg.d, b: level * (settled ? hum(frame, i) : 1) * (1 + 0.25 * surge) };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
  // 电极缝：每根灯管两端各留 4% 不画
  const dash = { pathLength: 1, strokeDasharray: '0.92 1', strokeDashoffset: -0.04 } as const;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <defs>
        <filter id={`${idPrefix}w`} x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="22" /></filter>
        <filter id={`${idPrefix}n`} x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <g transform={`translate(${OX} ${OY})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* 宽泛光（墙上的光晕） */}
        <g filter={`url(#${idPrefix}w)`}>
          {lit.map((g) => <path key={g.i} d={g.d} stroke={GLOW} strokeWidth={SW + 46} opacity={Math.min(1, 0.4 * g.b + 0.4 * surge)} {...dash} />)}
        </g>
        {/* 近泛光（灯管周围的辉） */}
        <g filter={`url(#${idPrefix}n)`}>
          {lit.map((g) => <path key={g.i} d={g.d} stroke={TUBE} strokeWidth={SW + 12} opacity={Math.min(1, 0.75 * g.b)} {...dash} />)}
        </g>
        {/* 灯管本体 + 白热芯 */}
        {lit.map((g) => <path key={g.i} d={g.d} stroke={TUBE} strokeWidth={SW} opacity={Math.min(1, 0.35 + 0.65 * g.b)} {...dash} />)}
        {lit.map((g) => <path key={g.i} d={g.d} stroke={CORE} strokeWidth={SW * 0.32} opacity={Math.min(1, g.b)} {...dash} />)}
      </g>
    </svg>
  );
};

export const StrokeSegmentBuild: React.FC = () => {
  const frame = useCurrentFrame();
  const litCount = ORDER.reduce((n, _, rank) => n + (frame >= startOf(rank) + 1 ? 1 : 0), 0);
  // 揭晓：灯管 0.72 → 1；电流涌起（冲到 1.25 再回落）
  const reveal = ramp(frame, REVEAL, 8, EASE.snappy);
  const surge = interpolate(frame, [REVEAL, REVEAL + 3, REVEAL + 22], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
  const pulse = 1 + 0.02 * surge;
  const ambient = 0.12 + 0.5 * (litCount / SEGS.length) + 0.35 * reveal + 0.3 * surge; // 墙面受光
  const push = 1 + 0.035 * ramp(frame, 0, STROKE_SEGMENT_BUILD_DURATION, EASE.smooth);
  const kicker = ramp(frame, REVEAL + 8, 16, EASE.out);

  const FLOOR = 780; // 墙与地面交线
  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: '50% 45%' }}>
        <Stage look={L} keyLight={{ x: 0.5, y: 0.0 }} fill={null} intensity={0.35} vignette={0.7}>
          {/* 墙面：灯牌照亮的一团粉紫光（随点亮数增长） */}
          <div style={{
            position: 'absolute', left: 160, top: -40, width: 1600, height: 960, opacity: Math.min(1, ambient),
            background: `radial-gradient(ellipse 50% 46% at 50% 46%, ${alpha(GLOW, 0.28)} 0%, ${alpha(L.light, 0.12)} 45%, ${alpha(L.light, 0)} 72%)`,
          }} />
          {/* 地面：更深一档 + 交线处一条受光带 */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: FLOOR, bottom: 0, background: `linear-gradient(180deg, ${alpha('#05030a', 0.55)} 0%, ${alpha('#05030a', 0.85)} 100%)` }} />
          <div style={{
            position: 'absolute', left: 260, width: 1400, top: FLOOR - 40, height: 120, opacity: Math.min(1, ambient * 0.9),
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(GLOW, 0.3)} 0%, ${alpha(GLOW, 0)} 70%)`,
          }} />
        </Stage>

        {/* 地面倒影：灯牌沿地面交线镜像、模糊、渐隐 */}
        <div style={{
          position: 'absolute', inset: 0, transform: `translateY(${2 * FLOOR}px) scaleY(-1)`, transformOrigin: '0 0', opacity: 0.42,
          filter: 'blur(5px)', // 遮罩在镜像前的本地坐标里：本地 y≥FLOOR 会翻到墙上，必须全透明；越往上（离地越远）越淡
          WebkitMaskImage: `linear-gradient(180deg, transparent ${FLOOR - 340}px, rgba(0,0,0,0.9) ${FLOOR - 40}px, #000 ${FLOOR - 1}px, transparent ${FLOOR}px)`,
        }}>
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${pulse})`, transformOrigin: `960px ${OY + LH / 2}px` }}>
            <Sign frame={frame} surge={surge} reveal={reveal} idPrefix="ssbr" />
          </div>
        </div>

        {/* 灯牌 */}
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${pulse})`, transformOrigin: `960px ${OY + LH / 2}px` }}>
          <Sign frame={frame} surge={surge} reveal={reveal} idPrefix="ssb" />
        </div>

        {/* 揭晓后的副题：只在落位之后出现 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: OY + LH + 62, textAlign: 'center', fontFamily: FONT.sans,
          fontSize: 32, fontWeight: 600, letterSpacing: '0.34em', color: L.ink2, opacity: kicker,
          transform: `translateY(${((1 - kicker) * 14).toFixed(2)}px)`,
        }}>
          {/* 字标按品牌规范全小写、收窄字距；后半句沿用原副题的宽字距大写 */}
          <span style={{ fontFamily: BRAND.font, fontWeight: 700, letterSpacing: '0.06em', color: L.ink }}>{BRAND.name}</span>
          <span style={{ color: TUBE, margin: '0 0.5em 0 0.8em' }}>●</span> ONE PROMPT, ONE FILM
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
