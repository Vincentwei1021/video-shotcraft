// 逐字遮罩裂升（split-text-stagger）——GSAP SplitText 惯用入场：标题按行装进 overflow:hidden 的遮罩盒，
// 每个字符从遮罩底边（裁切线）下方升起，带一次可见过冲后落座。
//
// 第二轮重设计（编辑排版海报）：
// - look = paper（暖白纸 · 墨 · 朱红）。画面是一页杂志扉页：上下两条发丝线框出版心，左上 / 右上眉题，
//   左栏两行巨字标题「Motion / System.」——第一行无衬线 900、第二行衬线斜体 400，字重与字体双重对比；
//   右栏一段 40px 正文说明，句号用朱红（全画面唯一的强调色）。
// - 手法强化：每行的遮罩底边画成一条可见的墨色裁切线，比字符早 4f 从左向右生长（预备），字从线下升起；
//   字符用物理弹簧（damping 15 → 约 11% 过冲、一次可见回弹）而不是两段插值，旋转晚 3f 收敛（跟随）；
//   升起快段按每字竖向速度加 y 向运动模糊，静止为 0。
// - 错峰间隔 3.8f → 1.8f 匀速收紧（越升越快，像琴键被一路扫过），第二行与第一行重叠起跳。
//
// 时间表（30fps，共 135f）：
//   0–22   预备：上下版心线从左生长、眉题升起（开场第 1 帧就有线在长）
//   8–20   第一行裁切线生长；12 起「Motion」6 字错峰 14f 升起（每字弹簧 ~20f 落座）
//   24–36  第二行裁切线；28 起「System」6 字错峰 14f 升起
//   46     朱红句号单独落位（更软的弹簧 damping 11，最后一个音符）
//   52–70  右栏正文逐行升起、页脚元信息淡入
//   70–135 hold 65f：整版极缓推进 2.5%，主光呼吸（R1，工作台定格尾帧）
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const SPLIT_TEXT_STAGGER_DURATION = 135;

const L = LOOKS.paper;
const LEFT = 150; // 版心左边距
const RIGHT = 1770; // 版心右边
const SIZE = 300; // 巨字字号
const RISE_FROM = 1.12; // 起始位移（em）：完全藏在裁切线下
const LINE1 = { text: 'Motion', start: 12, top: 236 };
const LINE2 = { text: 'System', start: 28, top: 536 };
const DOT_START = 46; // 朱红句号起跳帧
const DOT_BOTTOM = 52; // 句号离遮罩底的高度（px，对齐衬线基线）
const SPAN = 14; // 每行字符错峰总跨度

// 错峰：间隔从 ~3.8f 匀速收紧到 ~1.8f（越扫越快，像手指一路滑过琴键），总跨度 SPAN
const cadence = (i: number, n: number) => {
  const t = n <= 1 ? 0 : i / (n - 1);
  return (t + 0.35 * t * (1 - t)) * SPAN;
};

// 单字符升起：弹簧 0→1 映射 RISE_FROM em → 0；旋转晚 3f 收敛
const charMotion = (f: number, start: number, damping = 15) => {
  const p = springAt(f, start, { damping, stiffness: 150 });
  const r = springAt(f, start + 3, { damping: 18, stiffness: 140 });
  return { y: (1 - p) * RISE_FROM, rot: (1 - r) * 7 };
};

// 一行标题：遮罩盒 + 可见裁切线 + 逐字升起
const MaskLine: React.FC<{
  text: string; start: number; top: number; font: React.CSSProperties; extra?: React.ReactNode; lineW: number;
}> = ({ text, start, top, font, extra, lineW }) => {
  const frame = useCurrentFrame();
  const chars = Array.from(text);
  const lineP = ramp(frame, start - 4, 22, EASE.snappy);
  return (
    <div style={{ position: 'absolute', left: LEFT, top, width: lineW }}>
      {/* 遮罩盒：上方留足头部空间容纳过冲，底边 = 裁切线 */}
      <div style={{ overflow: 'hidden', paddingTop: 40, marginTop: -40, height: SIZE * 0.98, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', whiteSpace: 'pre', ...font }}>
          {chars.map((c, i) => {
            const s = start + cadence(i, chars.length);
            const m = charMotion(frame, s);
            const vy = Math.abs(charMotion(frame + 0.5, s).y - charMotion(frame - 0.5, s).y) * SIZE; // px/帧
            const blur = Math.min(14, vy * 0.22);
            return <Glyph key={i} ch={c} y={m.y} rot={m.rot} blur={blur} />;
          })}
          {extra}
        </div>
      </div>
      {/* 裁切线：比字符早 4f 生长，落定后保留为版式里的墨线 */}
      <div style={{ height: 2, width: `${(lineP * 100).toFixed(2)}%`, background: alpha(L.ink, 0.85), marginTop: 6 }} />
    </div>
  );
};

// 单字：translateY + 绕左下角微旋 + 竖向模糊（SVG 只在 y 轴模糊，静止时不挂滤镜）
const Glyph: React.FC<{ ch: string; y: number; rot: number; blur: number; color?: string }> = ({ ch, y, rot, blur, color }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const on = blur > 0.35;
  return (
    <span style={{ display: 'inline-block', position: 'relative' }}>
      {on && (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id={`v${id}`} x="-20%" y="-60%" width="140%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <span style={{
        display: 'inline-block', color, transformOrigin: '0% 100%',
        transform: `translateY(${y.toFixed(4)}em) rotate(${rot.toFixed(3)}deg)`,
        filter: on ? `url(#v${id})` : undefined,
      }}>
        {ch}
      </span>
    </span>
  );
};

// 右上角"规格图"：把字符用的那条弹簧曲线画出来（发丝坐标 + 墨线曲线 + 朱红游标），与第一行同步生长——
// 版面上给观众看"刚才那一下"的运动曲线，填满右上留白，也让手法本身成为设计元素。
const PLOT = { x: 1262, y: 196, w: 508, h: 236, frames: 34 };
const SpringPlot: React.FC = () => {
  const frame = useCurrentFrame();
  const t = Math.max(0, Math.min(PLOT.frames, frame - LINE1.start));
  const pt = (f: number) => {
    const v = springAt(f, 0, { damping: 15, stiffness: 150 });
    return [PLOT.x + (f / PLOT.frames) * PLOT.w, PLOT.y + PLOT.h - v * PLOT.h * 0.78] as const;
  };
  const pts: string[] = [];
  for (let f = 0; f <= t + 1e-6; f += 0.5) pts.push(pt(f).map((n) => n.toFixed(1)).join(','));
  const [hx, hy] = pt(t);
  const axis = ramp(frame, 4, 24, EASE.snappy);
  const lab = ramp(frame, 40, 16, EASE.out);
  const target = PLOT.y + PLOT.h * 0.22;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {/* 坐标：底轴 + 终值虚线 */}
        <line x1={PLOT.x} y1={PLOT.y + PLOT.h} x2={PLOT.x + PLOT.w * axis} y2={PLOT.y + PLOT.h} stroke={alpha(L.ink, 0.35)} strokeWidth={1.5} />
        <line x1={PLOT.x} y1={target} x2={PLOT.x + PLOT.w * axis} y2={target} stroke={alpha(L.ink, 0.25)} strokeWidth={1.5} strokeDasharray="4 8" />
        {pts.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke={L.ink} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />}
        {t > 0 && <circle cx={hx} cy={hy} r={9} fill={L.accent} />}
      </svg>
      <div style={{ position: 'absolute', left: PLOT.x, top: PLOT.y + PLOT.h + 18, opacity: lab, ...type(26, 500, { mono: true }), color: L.ink2, letterSpacing: '0.02em' }}>
        spring · 11% overshoot
      </div>
    </>
  );
};

export const SplitTextStagger: React.FC = () => {
  const frame = useCurrentFrame();
  // 整版极缓推进：全程 1 → 1.025，swift 起止无速度突变
  const push = 1 + 0.025 * ramp(frame, 0, 135, EASE.swift);
  const rule = (d: number) => ramp(frame, d, 26, EASE.snappy);
  const dot = charMotion(frame, DOT_START, 11);
  const dotV = Math.abs(charMotion(frame + 0.5, DOT_START, 11).y - charMotion(frame - 0.5, DOT_START, 11).y) * SIZE;
  const meta = ramp(frame, 60, 18, EASE.out);

  const sans = { ...type(SIZE, 900), letterSpacing: '-0.055em', lineHeight: 0.98, color: L.ink };
  const serif = { ...type(SIZE, 400, { serif: true }), fontStyle: 'italic' as const, letterSpacing: '-0.03em', lineHeight: 0.98, color: L.ink };

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.18 }} fill={{ x: 0.9, y: 0.95 }} breathe={0.6} grain={0.06} vignette={0.2}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '38% 52%' }}>
          {/* 版心上沿：发丝线 + 眉题 */}
          <div style={{ position: 'absolute', left: LEFT, top: 118, width: (RIGHT - LEFT) * rule(0), height: 1.5, background: alpha(L.ink, 0.5) }} />
          <div style={{ position: 'absolute', left: LEFT, top: 70, ...type(30, 650, { caps: true }), letterSpacing: '0.2em', color: L.ink }}>
            <TextReveal text="Introducing" by="word" start={6} each={18} />
          </div>
          <div style={{ position: 'absolute', right: 1920 - RIGHT, top: 70, ...type(30, 500, { caps: true }), letterSpacing: '0.2em', color: L.ink2 }}>
            <TextReveal text="Kinetic 4 — Chapter 02" by="word" start={10} each={18} gap={3} />
          </div>

          {/* 两行巨字标题 */}
          <MaskLine text={LINE1.text} start={LINE1.start} top={LINE1.top} font={sans} lineW={1010} />
          <MaskLine
            text={LINE2.text} start={LINE2.start} top={LINE2.top} font={serif} lineW={1010}
            extra={
              // 朱红句号：画成正圆（斜体句号字形是歪的菱形），同一遮罩里最后升起
              <span style={{ display: 'inline-block', position: 'relative', width: 62, alignSelf: 'stretch' }}>
                <span style={{
                  position: 'absolute', left: 6, bottom: DOT_BOTTOM, width: 46, height: 46, borderRadius: '50%', background: L.accent,
                  transform: `translateY(${dot.y.toFixed(4)}em) scaleY(${(1 + Math.min(0.35, dotV * 0.004)).toFixed(3)})`, transformOrigin: '50% 100%',
                }} />
              </span>
            }
          />

          <SpringPlot />

          {/* 右栏正文：逐行从线下升起（与标题同一手法的小号回声） */}
          <div style={{ position: 'absolute', left: 1250, top: 604, width: 520, ...type(40, 450), lineHeight: 1.32, color: L.ink2 }}>
            <TextReveal
              text={'One timing scale, one\neasing set, one type ramp —\nshared by every screen\nwe ship.'}
              by="line" variant="rise" start={52} each={20} gap={4}
            />
          </div>
          <div style={{ position: 'absolute', left: 1250, top: 548, width: 64 * ramp(frame, 50, 20, EASE.snappy), height: 6, background: L.accent }} />

          {/* 版心下沿：发丝线 + 页脚 */}
          <div style={{ position: 'absolute', left: LEFT, top: 952, width: (RIGHT - LEFT) * rule(4), height: 1.5, background: alpha(L.ink, 0.5) }} />
          <div style={{ position: 'absolute', left: LEFT, top: 976, opacity: meta, transform: `translateY(${(1 - meta) * 10}px)`, ...type(30, 500), color: L.ink2 }}>
            The Kinetic design language
          </div>
          <div style={{ position: 'absolute', right: 1920 - RIGHT, top: 976, opacity: meta, transform: `translateY(${(1 - meta) * 10}px)`, ...type(30, 600, { mono: true }), color: L.ink }}>
            02 / 12
          </div>
        </div>
      </Stage>
    </div>
  );
};
