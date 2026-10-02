// marker-underline-title —— 大标题落定后，斜体关键词下方一道马克笔下划线从左到右快速描画
// （变宽笔形 / 起笔墨团 / 收笔上挑 / 干笔毛边 / 左低右高跟斜体字势）。对标 notion-ai.mp4 2.3–3.6s。
//
// 第二轮重设计（粗黑体海报 · 人手一笔）：
// - look = sand（米色纸 · 墨 · 赤陶）。整版是一张粗黑体海报：左上眉题 → 250px / 800、行距 1.02 的两行巨字
//   「Meet the new / Lumen AI.」占满画宽 → 下方 40px 正文 + 深色 CTA 胶囊。机打的粗黑体和一笔手绘赤陶马克笔
//   形成材质反差——马克笔是画面唯一的强调色，也是唯一"人手"的东西。
// - 笔触：多边形笔形（中段最宽 ~0.14em、起笔一团墨、收笔收细并上挑一下），multiply 叠在字上（真马克笔是后画的，
//   墨色字压不掉、纸色处染成赤陶）；干笔滤镜 = 低频位移毛边 + 沿笔向拉长的高频镂空飞白。
// - 运笔曲线：10f、起笔最快、收笔略缓（EASE.out 的手劲），揭示前沿是圆头笔尖而不是直切；
//   画完 8f 内墨色"干"一档（湿墨更深更亮 → 干后略浅，multiply 透明度 0.96→0.86），给落笔一个余波。
// - 标题按词遮罩升起（第二行晚 6f），落定后停 6f 再起笔——划线是"看完标题后的强调"。
//
// 时间表（30fps，共 84f）：
//   0–20   眉题短线生长 + 眉题字升起；标题 6 个词按词遮罩升起（2–26，第二行从 8 起）
//   26–32  停一拍（让标题读完）
//   32–42  马克笔 10f 一笔划过（左低右高）
//   42–50  墨干：颜色与浓度回落一档
//   44–62  正文逐行升起、CTA 胶囊弹入（damping 16 一次回弹）
//   62–84  hold 22f；全程极缓推进 1→1.02
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const MARKER_UNDERLINE_TITLE_DURATION = 84; // 标题 26f 落定 → f32–42 划线 → 墨干 → 正文 → 静止 22f

const L = LOOKS.sand;
const LEFT = 150;
const SIZE = 250;
const DRAW_START = 32;
const DRAW_DUR = 10; // 原片实测节奏；>14f 读作进度条
const MARKER = '#c24e27'; // 赤陶马克笔（sand.accent 略加饱和，multiply 后不发灰）

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// 马克笔笔形（SVG 坐标 LEN×H）：中轴左低右高 + 缓波；宽度 起笔墨团 → 中段饱满 → 收笔收细上挑
const LEN = 440;
const H = 90;
// 中轴高度（不含随机抖动）：揭示窗的圆头笔尖要沿它走
const midAt = (t: number) => 62 - t * 30 + Math.sin(t * Math.PI) * 4 - Math.max(0, t - 0.9) * 90;
const buildStroke = (seed: number) => {
  const rand = mulberry32(seed);
  const N = 56;
  const wob = Array.from({ length: N + 1 }, () => rand() - 0.5);
  const top: string[] = [];
  const bot: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = 6 + t * (LEN - 12);
    // 中轴：左低右高（跟斜体字势）+ 低频缓波 + 收笔最后 10% 轻轻上挑
    const mid = midAt(t) + wob[i] * 1.4;
    // 宽度：起笔墨团（t<0.05 圆鼓）→ 中段 ~40（≈0.16em）→ 收笔收尖
    const blob = Math.exp(-((t - 0.025) ** 2) / 0.0015) * 12;
    const w = Math.max(3, 34 + Math.sin(t * Math.PI) * 9 + blob - Math.max(0, t - 0.82) * 120 + wob[i] * 3);
    // 起笔圆头：前 4% 宽度按圆弧从 0 张开（不是平切）
    const cap = t < 0.04 ? Math.sqrt(1 - ((0.04 - t) / 0.04) ** 2) : 1;
    const wc = Math.max(2, w * cap);
    top.push(`${x.toFixed(1)},${(mid - wc / 2).toFixed(1)}`);
    bot.push(`${x.toFixed(1)},${(mid + wc / 2).toFixed(1)}`);
  }
  return `M${top.join('L')}L${bot.reverse().join('L')}Z`;
};
const PATH = buildStroke(77);

const Marker: React.FC = () => {
  const frame = useCurrentFrame();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const draw = ramp(frame, DRAW_START, DRAW_DUR, EASE.out);
  const dry = ramp(frame, DRAW_START + DRAW_DUR, 8, EASE.out);
  const head = draw * (LEN + 20);
  if (draw <= 0) return null;
  return (
    <svg
      width="112%" height={H} viewBox={`0 0 ${LEN} ${H}`} preserveAspectRatio="none"
      style={{ position: 'absolute', left: '-5%', bottom: -34, overflow: 'visible', mixBlendMode: 'multiply', pointerEvents: 'none' }}
    >
      <defs>
        {/* 揭示窗：矩形 + 圆头前沿（笔尖），不是直切 */}
        <clipPath id={`r${uid}`}>
          <rect x={-20} y={-40} width={Math.max(0, head - 24)} height={H + 80} />
          <circle cx={head - 24} cy={midAt(Math.min(1, Math.max(0, (head - 30) / LEN)))} r={draw < 1 ? 28 : 0} />
        </clipPath>
        {/* 干笔肌理：低频位移 → 毛糙边；沿笔向拉长的高频噪声阈值 → 飞白镂空（固定 seed，确定性） */}
        <filter id={`d${uid}`} x="-5%" y="-40%" width="110%" height="180%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.08 0.45" numOctaves={2} seed={7} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale={4} xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.03 0.8" numOctaves={2} seed={19} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -16 13" result="holes" />
          <feComposite in="rough" in2="holes" operator="in" />
        </filter>
      </defs>
      <g clipPath={`url(#r${uid})`}>
        <path d={PATH} fill={MARKER} fillOpacity={0.96 - dry * 0.1} filter={`url(#d${uid})`} />
      </g>
    </svg>
  );
};

export const MarkerUnderlineTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const push = 1 + 0.02 * ramp(frame, 0, MARKER_UNDERLINE_TITLE_DURATION, EASE.swift);
  const tick = ramp(frame, 0, 18, EASE.snappy);
  const cta = springAt(frame, 54, { damping: 16, stiffness: 190 });
  const title: React.CSSProperties = { ...type(SIZE, 800), letterSpacing: '-0.055em', lineHeight: 1.02, color: L.ink, whiteSpace: 'nowrap' };

  return (
    <AbsoluteFill style={{ background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.2 }} fill={{ x: 0.95, y: 0.9 }} grain={0.06} vignette={0.2} breathe={0.4} />
      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})`, transformOrigin: '30% 45%' }}>
        {/* 眉题 */}
        <div style={{ position: 'absolute', left: LEFT, top: 168, display: 'flex', alignItems: 'center', gap: 22, ...type(30, 700, { caps: true }), letterSpacing: '0.18em', color: L.ink }}>
          <span style={{ display: 'inline-block', width: 56 * tick, height: 4, background: L.ink }} />
          <TextReveal text="Lumen AI" by="word" start={2} each={16} gap={3} />
          <span style={{ color: L.ink3, fontWeight: 500 }}>
            <TextReveal text="Spring release" by="word" start={6} each={16} gap={3} />
          </span>
        </div>

        {/* 两行巨字：按词遮罩升起 */}
        <div style={{ position: 'absolute', left: LEFT - 12, top: 226, ...title }}>
          <div>
            <TextReveal text="Meet the" by="word" variant="rise" start={2} each={20} gap={5} ease={EASE.snappy} />{' '}
            <span style={{ position: 'relative', display: 'inline-block', fontStyle: 'italic', fontWeight: 800, paddingRight: '0.04em' }}>
              <TextReveal text="new" by="word" variant="rise" start={12} each={20} />
              <Marker />
            </span>
          </div>
          <div>
            <TextReveal text="Lumen AI." by="word" variant="rise" start={8} each={20} gap={5} ease={EASE.snappy} />
          </div>
        </div>

        {/* 正文 + CTA */}
        <div style={{ position: 'absolute', left: LEFT, top: 812, width: 900, ...type(40, 450), lineHeight: 1.3, color: L.ink2 }}>
          <TextReveal text={'Writes, plans and answers —\ninside every doc you already have.'} by="line" variant="rise" start={44} each={18} gap={4} />
        </div>
        <div style={{
          position: 'absolute', right: 150, top: 834, padding: '24px 40px', borderRadius: 999, background: L.ink, color: L.bg[0],
          ...type(34, 650), letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 18,
          opacity: Math.min(1, cta * 2), transform: `translateY(${((1 - cta) * 30).toFixed(2)}px) scale(${(0.9 + 0.1 * cta).toFixed(4)})`,
          boxShadow: `0 18px 40px -18px ${alpha(L.shadow, 0.6)}, 0 2px 6px ${alpha(L.shadow, 0.2)}`,
        }}>
          Try it free <span style={{ color: '#f0a07c' }}>→</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
