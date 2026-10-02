// value-stagger-gradient — Value Stagger 数值梯度：stagger 不只错开时间，还把属性值在 N 个元素上铺成梯度。
// 16 根柱入场时 delay = stagger(时间)，同时高度 / 色相 / 行程 / 模糊都是 stagger([from, to]) 的数值梯度；
// 第二拍换 from:'center'，脉冲幅度以中心为原点重新铺开。
//
// 第二轮重设计（酸柠石墨 · 信号频谱）：
// - look = lime（石墨底 · 荧光黄绿）。主角是一排占画宽 83% 的 16 根大柱（宽 62 / 步距 100 / 最高 560px），
//   色相梯度 80°→30°（荧光黄绿 → 琥珀 → 橙，热度式色带，不经过刺眼的纯绿），落在带地平线光带的镜面地板上，有倒影与底部泛光。
// - 让"值"看得见：每根柱头上一枚 32px 等宽数值标签，就是 stagger 给它的那个值——拍一显示高度 92 → 32
//   （随柱升起计数），换拍时标签从中心向两端逐个滚换成脉冲幅度 +06 … +42 … +06。观众读到的数字本身就是梯度。
// - 代码字幕升级成画面主标题：44px 语法着色等宽代码 + 眉题拍号（01 / 02），换拍时旧句上卷退出、新句自下滚入。
// - 第二拍原点可视化：中心柱脚下亮起一枚原点三角，地板上一道光沿基线从中心向两端跑，前沿与脉冲波前同一函数驱动。
//
// 时间表（30fps，共 165f）：
//   0–14    预备：舞台光、基线与 16 个索引刻度、代码字幕与眉题逐字淡入（第 1 帧就有基线）
//   8–67    拍一：首柱先起，间隔 2.2f/根（总 33f），单柱 26f expo-out；行程 184→56px、模糊 30→8px 也是梯度
//   67–84   hold：读终态斜坡（高度标签已全部落定）
//   80–92   换拍：字幕上卷交换 10f；标签从中心起逐个滚换（按 distC 错峰 12f）
//   86–124  拍二：from:'center' 脉冲，中心先起、传播到端点 12f，单柱 26f；幅度 42% → 6%
//   124–165 hold：全画面锁定（只剩相机 1.000→1.025 的极缓推进，到 150f 收住）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, alpha } from '../../_fixtures/Look';

export const VALUE_STAGGER_GRADIENT_DURATION = 165;

const L = LOOKS.lime;

// 数值梯度 util（等价 anime.js stagger([a,b]) 的 value 模式）
const staggerVal = (i: number, n: number, a: number, b: number, ease?: (x: number) => number) => {
  let k = n <= 1 ? 0 : i / (n - 1);
  if (ease) k = ease(k);
  return a + (b - a) * k;
};

const N = 16;
const C = (N - 1) / 2;
const PITCH = 100; // 柱步距
const BAR_W = 62;
const BASE_Y = 868; // 基线
const X0 = 960 - (PITCH * N) / 2; // 160

// 拍一节拍
const B1 = 8; // 首柱起跳
const B1_GAP = 2.2; // 时间错峰（帧/根）
const B1_DUR = 26; // 单柱行程
// 换拍
const SWITCH = 80; // 字幕交换起点
// 拍二节拍
const B2 = 86; // 中心柱脉冲起跳
const B2_SPREAD = 12; // 中心 → 端点传播延迟
const B2_DUR = 26;

const BARS = Array.from({ length: N }, (_, i) => ({
  i,
  x: X0 + i * PITCH + (PITCH - BAR_W) / 2,
  hue: staggerVal(i, N, 80, 30), // 数值梯度：色相（荧光黄绿 → 琥珀 → 橙）
  hDesign: Math.round(staggerVal(i, N, 92, 32)), // 数值梯度：高度（设计值，标签显示它）
  hMax: staggerVal(i, N, 560, 195), // 同一条梯度换算到像素
  y0: staggerVal(i, N, 184, 56), // 行程也是梯度
  b0: staggerVal(i, N, 30, 8), // 模糊量梯度
  distC: Math.abs(i - C) / C,
}));
// 脉冲幅度梯度：以中心为原点，中心 42% → 端点 6%（= stagger([.06, .42], { from: 'center' })）
const amp = (distC: number) => 0.06 + (0.42 - 0.06) * (1 - distC);

const barIn = (f: number, i: number) => ramp(f, B1 + i * B1_GAP, B1_DUR, EASE.snappy);
const pulseW = (f: number, distC: number) => ramp(f, B2 + distC * B2_SPREAD, B2_DUR, EASE.linear);
const pulseOf = (f: number, distC: number) => Math.sin(pulseW(f, distC) * Math.PI);

// ───────────── 代码字幕（语法着色） ─────────────
type Tok = [string, string];
const KEY = L.ink2;
const FN = L.accent;
const NUM = '#f6f8f0';
const STR = '#ffb070';
const PUN = alpha(L.ink2, 0.62);
const LINE1: Tok[] = [
  ['height', KEY], [': ', PUN], ['stagger', FN], ['([', PUN], ['92', NUM], [', ', PUN], ['32', NUM], ['])', PUN],
  ['   hue', KEY], [': ', PUN], ['stagger', FN], ['([', PUN], ['80', NUM], [', ', PUN], ['30', NUM], ['])', PUN],
];
const LINE2: Tok[] = [
  ['pulse', KEY], [': ', PUN], ['stagger', FN], ['([', PUN], ['.06', NUM], [', ', PUN], ['.42', NUM], ['], { ', PUN],
  ['from', KEY], [': ', PUN], ["'center'", STR], [' })', PUN],
];

const CodeLine: React.FC<{ toks: Tok[]; frame: number; start: number; out: number }> = ({ toks, frame, start, out }) => {
  // 入：逐 token 自下滚入（1.2f 错峰）；出：整句上卷退出
  const o = ramp(frame, out, 10, EASE.exit);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', transform: `translateY(${(-o * 64).toFixed(2)}px)`, opacity: 1 - o }}>
      {toks.map(([s, c], k) => {
        const p = ramp(frame, start + k * 1.2, 14, EASE.snappy);
        return (
          <span key={k} style={{ display: 'inline-block', color: c, transform: `translateY(${((1 - p) * 60).toFixed(2)}px)`, opacity: p }}>{s}</span>
        );
      })}
    </div>
  );
};

// 柱头标签：拍一显示高度设计值（随柱升起计数），换拍后滚换成脉冲幅度
const Label: React.FC<{ frame: number; i: number; top: number; distC: number; hDesign: number }> = ({ frame, i, top, distC, hDesign }) => {
  const e = barIn(frame, i);
  const count = Math.round(hDesign * e);
  const sw = ramp(frame, SWITCH + 2 + distC * 12, 10, EASE.swift); // 中心先换
  const ampV = Math.round(amp(distC) * 100);
  const pulse = pulseOf(frame, distC);
  const tag = (txt: string, color: string, y: number, op: number) => (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', color, opacity: op, transform: `translateY(${y.toFixed(2)}px)` }}>{txt}</div>
  );
  return (
    <div style={{
      position: 'absolute', left: X0 + i * PITCH, width: PITCH, top: top - 58, height: 40, overflow: 'hidden',
      fontFamily: FONT.mono, fontSize: 32, fontWeight: 600, lineHeight: '40px', fontVariantNumeric: 'tabular-nums',
      opacity: ramp(frame, B1 + i * B1_GAP + 4, 10, EASE.out),
    }}>
      {tag(String(count).padStart(2, '0'), alpha(L.ink, 0.9), -sw * 40, 1 - sw)}
      {tag(`+${String(ampV).padStart(2, '0')}`, alpha(L.accent, 0.8 + 0.2 * pulse), (1 - sw) * 40, sw)}
    </div>
  );
};

export const ValueStaggerGradient: React.FC = () => {
  const frame = useCurrentFrame();

  // 相机：全程极缓推进 1.000 → 1.025（150f 收住），对准柱群中心
  const cam = 1 + 0.025 * ramp(frame, 0, 150, EASE.smooth);
  const intro = ramp(frame, 0, 14, EASE.out);
  const sw = ramp(frame, SWITCH, 10, EASE.smooth);
  // 原点三角 + 地板光：换拍后中心亮起；光沿基线向两端跑（前沿 = 脉冲波前）
  const origin = ramp(frame, SWITCH + 4, 10, EASE.overshoot);
  const front = (frame - B2) / B2_SPREAD; // 归一化 distC 前沿
  const runOn = frame >= B2 && frame < B2 + B2_SPREAD + 20;
  const runFade = 1 - ramp(frame, B2 + B2_SPREAD, 18, EASE.out);
  const frontX = Math.max(0, Math.min(1, front)) * (C * PITCH);
  // 拍二总能量（舞台底光跟随）
  const energy = pulseOf(frame, 0);
  const allIn = ramp(frame, B1 + 15, 50, EASE.out);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.36, y: -0.06 }} fill={null} horizon={BASE_Y / 1080} intensity={0.55 + 0.15 * allIn + 0.2 * energy}>
        <Dust look={L} count={22} seed={7} drift={0.18} opacity={0.35} />
        {/* 柱群背后一团跟随梯度的底光（左黄绿 → 右琥珀） */}
        <div style={{
          position: 'absolute', left: 120, right: 120, top: 420, height: 560,
          background: `radial-gradient(ellipse 50% 60% at 30% 70%, hsla(78,95%,55%,${(0.1 * allIn + 0.08 * energy).toFixed(3)}), transparent 70%), radial-gradient(ellipse 50% 60% at 72% 75%, hsla(34,95%,55%,${(0.07 * allIn + 0.06 * energy).toFixed(3)}), transparent 70%)`,
        }} />
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: `960px ${BASE_Y - 200}px` }}>
        {/* 水平参考线（纹理）：值刻度 100 / 75 / 50 / 25 */}
        {[1, 0.75, 0.5, 0.25].map((k, j) => (
          <React.Fragment key={j}>
            <div style={{ position: 'absolute', left: X0, width: PITCH * N, top: BASE_Y - 560 * k, height: 1, background: alpha(L.ink, 0.05), opacity: intro }} />
            <div style={{ position: 'absolute', left: X0 - 64, top: BASE_Y - 560 * k - 11, fontFamily: FONT.mono, fontSize: 18, color: L.ink3, opacity: intro * 0.8 }}>
              {Math.round(92 * k)}
            </div>
          </React.Fragment>
        ))}

        {/* 镜面地板：倒影（翻转渐隐） */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: BASE_Y + 2, height: 220, overflow: 'hidden' }}>
          {BARS.map(({ i, x, hue, hMax, y0, distC }) => {
            const e = barIn(frame, i);
            const p = pulseOf(frame, distC);
            const h = hMax * e * (1 + p * amp(distC));
            return (
              <div key={i} style={{
                position: 'absolute', left: x, top: (1 - e) * y0 * 0.35, width: BAR_W, height: h * 0.4, borderRadius: 10,
                background: `linear-gradient(180deg, hsla(${hue},85%,52%,${(0.26 + 0.2 * p).toFixed(3)}), hsla(${hue},85%,40%,0))`,
                opacity: e, filter: 'blur(3px)',
              }} />
            );
          })}
        </div>

        {/* 基线 + 索引刻度 */}
        <div style={{
          position: 'absolute', left: X0 - 20, width: PITCH * N + 40, top: BASE_Y, height: 2,
          background: `linear-gradient(90deg, ${alpha(L.ink, 0)}, ${alpha(L.ink, 0.22)} 12%, ${alpha(L.ink, 0.22)} 88%, ${alpha(L.ink, 0)})`,
          transform: `scaleX(${ramp(frame, 0, 16, EASE.snappy).toFixed(4)})`,
        }} />
        {BARS.map(({ i }) => (
          <div key={`t${i}`} style={{
            position: 'absolute', left: X0 + i * PITCH, width: PITCH, top: BASE_Y + 22, textAlign: 'center',
            fontFamily: FONT.mono, fontSize: 20, color: L.ink3, letterSpacing: '0.04em',
            opacity: ramp(frame, 2 + i * 0.6, 10, EASE.out) * 0.85,
          }}>{String(i).padStart(2, '0')}</div>
        ))}

        {/* 柱体：裹在基线以上的裁切层里——行程位移读作"从地板槽里升起"，不会穿出基线 */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: BASE_Y, overflow: 'hidden' }}>
        {BARS.map(({ i, x, hue, hMax, y0, b0, distC }) => {
          const e = barIn(frame, i);
          const p = pulseOf(frame, distC);
          const h = hMax * e * (1 + p * amp(distC));
          const blur = (1 - e) * b0;
          const lift = (1 - e) * y0;
          return (
            <div key={i} style={{
              position: 'absolute', left: x, top: BASE_Y - h + lift, width: BAR_W, height: h, borderRadius: '12px 12px 4px 4px',
              background: `linear-gradient(180deg, hsl(${hue},96%,${(70 + 3 * p).toFixed(1)}%) 0%, hsl(${hue},90%,${(54 + 4 * p).toFixed(1)}%) 38%, hsl(${hue},78%,30%) 100%)`,
              boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.6), inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 ${(28 + 40 * p).toFixed(1)}px hsla(${hue},95%,55%,${(0.16 + 0.34 * p).toFixed(3)})`,
              opacity: Math.min(1, e * 1.4),
              filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
              overflow: 'hidden',
            }}>
              {/* 左侧受光条 + 顶部热点 */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '38%', background: 'linear-gradient(90deg, rgba(255,255,255,0.22), rgba(255,255,255,0))' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 60, background: `linear-gradient(180deg, rgba(255,255,255,${(0.16 + 0.12 * p).toFixed(3)}), rgba(255,255,255,0))` }} />
            </div>
          );
        })}
        </div>

        {/* 柱头数值标签 */}
        {BARS.map(({ i, hMax, distC, hDesign }) => {
          const e = barIn(frame, i);
          const p = pulseOf(frame, distC);
          const top = BASE_Y - hMax * e * (1 + p * amp(distC)) + (1 - e) * BARS[i].y0;
          return <Label key={`l${i}`} frame={frame} i={i} top={top} distC={distC} hDesign={hDesign} />;
        })}

        {/* 第二拍原点：中心脚下的三角 + 沿基线向两端跑的光 */}
        <div style={{
          position: 'absolute', left: 960 - 14, top: BASE_Y + 58, width: 28, height: 22,
          opacity: Math.min(1, origin), transform: `translateY(${((1 - origin) * 16).toFixed(2)}px)`,
        }}>
          <svg width={28} height={22} viewBox="0 0 28 22"><path d="M14 2 L26 20 L2 20 Z" fill={L.accent} /></svg>
        </div>
        <div style={{
          position: 'absolute', left: 960 - 140, width: 280, top: BASE_Y + 86, textAlign: 'center',
          fontFamily: FONT.mono, fontSize: 22, color: L.accent, letterSpacing: '0.12em', opacity: ramp(frame, SWITCH + 8, 10, EASE.out),
        }}>FROM CENTER</div>
        {runOn && (
          <>
            {[-1, 1].map((s) => (
              <div key={s} style={{
                position: 'absolute', top: BASE_Y - 1, height: 4, borderRadius: 2,
                left: s < 0 ? 960 - frontX : 960, width: frontX,
                background: s < 0
                  ? `linear-gradient(90deg, ${L.accent}, ${alpha(L.accent, 0)})`
                  : `linear-gradient(270deg, ${L.accent}, ${alpha(L.accent, 0)})`,
                boxShadow: `0 0 18px ${alpha(L.accent, 0.6)}`, opacity: runFade,
              }} />
            ))}
          </>
        )}

        {/* 代码字幕：眉题拍号 + 44px 等宽代码 */}
        <div style={{ position: 'absolute', left: X0, top: 96, width: 1600, height: 150 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: 30, overflow: 'hidden', width: 900, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.14em', fontWeight: 600 }}>
            <div style={{ position: 'absolute', top: 0, color: L.accent, opacity: intro * (1 - sw), transform: `translateY(${(-sw * 30).toFixed(2)}px)` }}>
              01 <span style={{ color: L.ink3 }}>—</span> <span style={{ color: L.ink2 }}>TIME + VALUE · FROM FIRST</span>
            </div>
            <div style={{ position: 'absolute', top: 0, color: L.accent, opacity: sw, transform: `translateY(${((1 - sw) * 30).toFixed(2)}px)` }}>
              02 <span style={{ color: L.ink3 }}>—</span> <span style={{ color: L.ink2 }}>SAME RECIPE · FROM CENTER</span>
            </div>
          </div>
          <div style={{ position: 'absolute', left: 0, top: 46, height: 76, width: 1600, overflow: 'hidden', fontFamily: FONT.mono, fontSize: 44, lineHeight: '64px', fontWeight: 500 }}>
            <CodeLine toks={LINE1} frame={frame} start={2} out={SWITCH} />
            <CodeLine toks={LINE2} frame={frame} start={SWITCH + 4} out={9999} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
