// 套印节拍泵（riso-beat-pump）——beat-punch-in（卡点顿推）× riso-misregistration-hit（套印错位）的
// 组合节奏。节拍帧 [30,54,78,102]（每 24f 一拍 = 75 BPM），每命中帧：
// ① 整画面 scale 一帧瞬跳 1.08（无渐入），14f 内按 exp(-t/3) 指数衰减回 1；
// ② 标题两份单色印版 multiply 反向错位，初始错位逐拍加码 5/9/14/20px（总分离 10/18/28/40px），
//    12f 衰减余弦震荡收敛套准——"越打越狠"；
// ③ 节拍格被打亮、右侧巨型拍号换数字。
//
// 第二轮重设计（riso 唱片封套 · 荧光橙 × 青绿）：
// - 配色 custom：暖白再生纸 #f4efe4 + riso 两色——荧光橙 ORANGE #ff6a2b 与 青绿 TEAL #00808a；
//   两版套准时 multiply 叠成近黑的墨绿，错开时一侧橙边、一侧青边。
// - 版式：唱片 B 面封套。左侧标题逐拍"盖"上一个词：ONE / MORE / TIME, / LOUDER.——每一拍既是
//   画面冲击也是一句话的推进；右侧 720px 半调网点巨型拍号 1→4（橙版，网点 + 浅平网底）；
//   底部四格步进音序器（命中格被橙版填满，播放头在拍前 6f 加速扑向下一格，正好在鼓点上落地）。
// - 作用域：scale 泵作用整画面（纸面一起被顿推），错版只作用标题（整画面全裂读作故障而非印刷）。
//
// 时间表（30fps，共 140f）：
//   0–29    预备：版线展开 0–18f、四个空节拍格错峰浮现 6–20f、播放头 18–30f 带预备回拉滑进第 1 格
//   30–115  四拍：每拍新词盖上 + 整页泵 + 标题错版（逐拍加码）+ 拍号换数 + 节拍格填色；
//           拍间 24f：前 12f 错版收敛、中段静、末 6f 播放头加速扑向下一格（拍前蓄力）
//   116–139 真静止 24f（泵与错版窗口外精确归 1/0；纸纤维与油墨颗粒都是静态纹理）
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';

export const RISO_BEAT_PUMP_DURATION = 140;

const HITS = [30, 54, 78, 102]; // 节拍命中帧
const AMP = [5, 9, 14, 20]; // 每拍单版初始错位（px），逐拍加码
const WORDS = ['ONE', 'MORE', 'TIME,', 'LOUDER.'];
const PUMP_WIN = 14; // scale 泵窗口：14f 后精确归 1（保证结尾真静止）
const SPLIT_WIN = 12; // 错位窗口：12f 后精确归 0

const PAPER = '#f4efe4';
const ORANGE = '#ff6a2b'; // riso 荧光橙版
const TEAL = '#00808a'; // riso 青绿版
const SANS = FONT.sans;

// 标题印版：已命中的词逐行排出（未命中的行不渲染，版面位置固定）
const TitlePlate: React.FC<{ color: string; dx: number; dy: number; shown: number }> = ({ color, dx, dy, shown }) => (
  <div style={{
    position: 'absolute', left: 116, top: 178, transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`,
    mixBlendMode: 'multiply', color, fontFamily: SANS, fontWeight: 900, fontSize: 196, lineHeight: 0.86,
    letterSpacing: '-0.045em', whiteSpace: 'nowrap',
  }}>
    {WORDS.map((w, i) => (
      <div key={i} style={{ visibility: i < shown ? 'visible' : 'hidden' }}>{w}</div>
    ))}
  </div>
);

// 巨型拍号：橙版半调网点 + 浅平网底（background-clip:text）
// 拍前（n=0）只露出第 1 拍的空心描边"幽灵"，预告即将到来的数字
const BeatNumeral: React.FC<{ n: number }> = ({ n }) => (
  <div style={{
    position: 'absolute', right: 110, top: 150, width: 640, height: 700, mixBlendMode: 'multiply',
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: n > 0 ? 1 : 0.28,
  }}>
    <div style={{
      fontFamily: SANS, fontWeight: 900, fontSize: 720, lineHeight: 1, letterSpacing: '-0.06em', padding: '0 40px',
      // 网点 + 一层 22% 平网底色（riso 常见的"网 + 平"双层）；不用 text-stroke：可变字体字形的重叠轮廓会被描出来
      backgroundImage: n > 0 ? `radial-gradient(circle, ${ORANGE} 0 4.6px, transparent 5.2px), linear-gradient(${ORANGE}38, ${ORANGE}38)` : undefined,
      backgroundSize: '13px 13px, 100% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
      WebkitTextStroke: n > 0 ? undefined : `2.5px ${ORANGE}`, fontVariantNumeric: 'tabular-nums',
    }}>
      {Math.max(1, n)}
    </div>
  </div>
);

const RegMark: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <svg width={40} height={40} viewBox="0 0 40 40" style={{ position: 'absolute', left: x - 20, top: y - 20, mixBlendMode: 'multiply' }}>
    <g fill="none" stroke={TEAL} strokeWidth={1.6} opacity={0.8}>
      <circle cx={20} cy={20} r={9} />
      <path d="M20 1 V39 M1 20 H39" />
    </g>
  </svg>
);

// 播放头 x（格序号，连续值）：18–30f 带预备回拉滑进第 1 格（0），之后每拍前 6f ease-in 加速扑向下一格
const headAt = (f: number) => {
  let x = mix(-0.9, 0, ramp(f, 18, 12, EASE.anticip));
  for (let i = 1; i < HITS.length; i++) x += ramp(f, HITS[i] - 6, 6, EASE.exit);
  return x;
};

const CELL_W = 400;
const CELL_GAP = 20;

export const RisoBeatPump: React.FC = () => {
  const frame = useCurrentFrame();

  let beatIdx = -1;
  for (let i = 0; i < HITS.length; i++) if (frame >= HITS[i]) beatIdx = i;
  const t = beatIdx >= 0 ? frame - HITS[beatIdx] : Infinity;

  // ① 整画面泵：命中帧一帧到位 1.08，指数衰减回 1
  const pump = t < PUMP_WIN ? 1 + 0.08 * Math.exp(-t / 3) : 1;
  // ② 标题错位：衰减余弦（周期 6f 抖两下），窗口外精确 0 = 套准
  const m = t < SPLIT_WIN ? Math.cos((2 * Math.PI * t) / 6) * Math.exp(-t / 3) : 0;
  const dx = beatIdx >= 0 ? AMP[beatIdx] * m : 0;
  const dy = dx * 0.45;

  const head = headAt(frame);
  const rule = (d: number) => ramp(frame, d, 18, EASE.snappy);

  return (
    <div style={{ width: 1920, height: 1080, background: PAPER, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${pump.toFixed(5)})`, transformOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 72% 70% at 40% 42%, #f9f5ec 0%, #f4efe4 58%, #e9e2d3 100%)' }} />
        <Grain opacity={0.11} step={100000} scale={2.4} freq={0.55} blend="multiply" />

        <RegMark x={64} y={64} />
        <RegMark x={1856} y={64} />
        <RegMark x={64} y={1016} />
        <RegMark x={1856} y={1016} />

        {/* 顶栏（青绿版） */}
        <div style={{
          position: 'absolute', left: 120, right: 120, top: 100, display: 'flex', justifyContent: 'space-between',
          fontFamily: FONT.mono, fontSize: 26, fontWeight: 600, letterSpacing: '0.12em', color: TEAL, mixBlendMode: 'multiply',
          opacity: ramp(frame, 0, 10, EASE.out),
        }}>
          <span>HALFTONE RECORDS — SIDE B</span>
          <span>75 BPM · 4/4</span>
        </div>
        <div style={{ position: 'absolute', left: 120, right: 120, top: 146, height: 4, background: TEAL, mixBlendMode: 'multiply', transformOrigin: '0 50%', transform: `scaleX(${rule(0).toFixed(4)})` }} />

        <BeatNumeral n={beatIdx + 1} />

        {/* 标题：双版常驻，套准时重合成墨绿，命中时反向错开 */}
        <TitlePlate color={ORANGE} dx={-dx} dy={dy} shown={beatIdx + 1} />
        <TitlePlate color={TEAL} dx={dx} dy={-dy} shown={beatIdx + 1} />

        {/* 底部四格步进音序器（青绿版框 + 橙版填色）+ 播放头 */}
        <div style={{ position: 'absolute', left: 120, top: 878, width: 4 * CELL_W + 3 * CELL_GAP, height: 96 }}>
          {HITS.map((hit, i) => {
            const appear = ramp(frame, 6 + i * 4, 12, EASE.snappy);
            const d = frame - hit;
            const on = d >= 0;
            return (
              <div key={i} style={{
                position: 'absolute', left: i * (CELL_W + CELL_GAP), top: 0, width: CELL_W, height: 96, boxSizing: 'border-box',
                border: `3px solid ${TEAL}`, borderRadius: 6, mixBlendMode: 'multiply', opacity: appear,
                transform: `translateY(${((1 - appear) * 20).toFixed(2)}px)`,
                background: on ? ORANGE : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px',
                fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, letterSpacing: '0.1em', color: TEAL,
              }}>
                <span style={{ opacity: on ? 1 : 0.6 }}>BEAT {i + 1}</span>
                <span style={{ fontFamily: SANS, fontSize: 40, fontWeight: 850, letterSpacing: '-0.02em', opacity: on ? 1 : 0.3 }}>{WORDS[i].replace(/[.,]/g, '')}</span>
              </div>
            );
          })}
          {/* 播放头：青绿竖条，扑到格左缘 */}
          <div style={{
            position: 'absolute', top: -18, height: 132, width: 8, borderRadius: 4, background: TEAL, mixBlendMode: 'multiply',
            left: head * (CELL_W + CELL_GAP) - 4, opacity: ramp(frame, 16, 6, EASE.out),
          }} />
        </div>
      </div>

      {/* 油墨颗粒（静态）+ 暖褐暗角：不随泵缩放，像镜头外的一层 */}
      <Grain opacity={0.2} step={100000} freq={1.25} blend="screen" />
      <Vignette strength={0.13} inner={0.55} color="#5a4a32" />
    </div>
  );
};
