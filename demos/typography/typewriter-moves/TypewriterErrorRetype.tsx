// typewriter-error-retype｜打字机误删重打——犹豫 · 否定 · 宣言的三幕改口
//
// 第二轮重设计（暖白纸 · 打字机字模海报）：
// - look = paper（暖白纸 · 墨 · 朱红色带）。两行 124px 等宽大字左对齐在 x=216 的版心：
//   第一行「Kestrel is」（400 字重、次级墨）是不变的句干，第二行是改口的戏台（700 字重、主墨）。
// - 打字机字模质感：每个字符固定 0.6em 槽位（不重排），按字符序号给确定性的 ±2px 落点偏差、
//   ±0.6° 微倾和 0.86–1 的墨色浓淡（色带受力不均）；字落下 3f 由 1.06 压回 1（字锤一击）。
// - 三幕：①2f/字敲出「a dashboard」→ ②停 20f，朱红竖光标 5f 方波闪两下（犹豫）→ 一道朱红删除线
//   6f 划过（否定的决定）→ 1.5f/字退格，删除线随字一起缩短 → ③1.5f/字零犹豫敲出
//   「your command center.」，句号是朱红。打完光标闪两下熄灭，粗朱红底线 snappy 划在
//   「command center」下，副标题从下方升起。
// - 左侧一道朱红页边线 + 眉题上沿发丝线（打字纸的格），相机全程 1→1.04 极缓推（不抖）。
//
// 时间表（30fps，共 185f）：
//   0–6     预备：纸面、页边线、光标已在第一行闪
//   6–25    敲「Kestrel is」（10 字，均 ~2f）
//   25–31   换行（光标跳到第二行）
//   31–53   敲「a dashboard」（11 字，均 ~2f，词首顿 4f）
//   53–73   犹豫 20f：光标闪两下
//   73–79   删除线划过
//   81–96   退格 11 字（1.5f/字）
//   99–128  重打「your command center.」（20 字，1.5f/字，零犹豫）
//   128–148 光标完稿闪两下后熄灭；130–144 底线划出；138–156 副标题升起
//   156–185 hold：极缓推，尾帧是完整的标语海报
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const TYPEWRITER_ERROR_RETYPE_DURATION = 185;

const L = LOOKS.paper;

const LINE1 = 'Kestrel is';
const WRONG = 'a dashboard';
const RIGHT = 'your command center.';

const SIZE = 124;
const CW = SIZE * 0.6; // 等宽槽宽 74.4
const LEFT = 216; // 版心左缘（第二行 20 字 = 1488px，左右留白对称）
const LH = 156; // 行距
const Y1 = 356; // 第一行顶
const Y2 = Y1 + LH; // 第二行顶

// 逐字出现帧（确定性真人间隔）
const timesFrom = (start: number, gaps: number[]) => {
  const at: number[] = [];
  gaps.reduce((acc, g, i) => ((at[i] = acc), acc + g), start);
  return at;
};
const AT1 = timesFrom(6, [2, 2, 2, 1, 2, 2, 4, 2, 2, 0]); // Kestrel is
const NEWLINE = 27; // 光标跳到第二行
const AT2 = timesFrom(31, [4, 2, 2, 1, 2, 2, 2, 2, 2, 2, 0]); // a dashboard（首字前已顿）
const TYPED_WRONG = AT2[AT2.length - 1]; // f52
const PAUSE_END = TYPED_WRONG + 21; // f73
const STRIKE = PAUSE_END; // 删除线 6f
const DEL_START = 81; // 退格 1.5f/字
const RE_START = 99; // 重打 1.5f/字
const AT3 = RIGHT.split('').map((_, i) => RE_START + Math.floor(i * 1.5));
const DONE = AT3[AT3.length - 1]; // f127
const CURSOR_OFF = DONE + 21; // 两次 10f 闪烁后熄灭
const UNDER = DONE + 3; // 底线
const SUB = DONE + 11; // 副标题

// 字模偏差：按（行, 序号）确定，和帧无关
const rnd = (n: number) => {
  const x = Math.sin(n * 91.7 + 13.3) * 43758.5453;
  return x - Math.floor(x);
};

const Glyph: React.FC<{ ch: string; at: number; frame: number; seed: number; weight: number; color: string }> = ({ ch, at, frame, seed, weight, color }) => {
  const strike = ramp(frame, at, 3, EASE.out); // 字锤一击：1.06 → 1
  const dy = (rnd(seed) - 0.5) * 4;
  const rot = (rnd(seed + 7) - 0.5) * 1.2;
  const ink = 0.86 + rnd(seed + 3) * 0.14;
  return (
    <span style={{
      display: 'inline-block', width: CW, textAlign: 'center', color, opacity: ink,
      fontWeight: weight, transform: `translateY(${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${mix(1.06, 1, strike).toFixed(4)})`,
      textShadow: `0 0 0.6px ${alpha(L.ink, 0.5)}`, // 墨微微洇开
    }}>
      {ch === ' ' ? ' ' : ch}
    </span>
  );
};

export const TypewriterErrorRetype: React.FC = () => {
  const f = useCurrentFrame();

  // —— 字符状态（帧确定、无插值）——
  const n1 = AT1.filter((a) => f >= a).length;
  const typedWrong = AT2.filter((a) => f >= a).length;
  const removed = f < DEL_START ? 0 : Math.min(WRONG.length, Math.floor((f - DEL_START) / 1.5) + 1);
  const nWrong = typedWrong - removed;
  const nRight = AT3.filter((a) => f >= a).length;

  // —— 光标：打字/删除常亮；犹豫段 5f 方波闪两下；完稿 5f 方波闪两下后熄灭 ——
  let cursorOn = true;
  if (f >= CURSOR_OFF) cursorOn = false;
  else if (f > DONE) cursorOn = Math.floor((f - DONE - 1) / 5) % 2 === 1;
  else if (f >= TYPED_WRONG + 1 && f < STRIKE) cursorOn = Math.floor((f - TYPED_WRONG - 1) / 5) % 2 === 1;
  const onLine2 = f >= NEWLINE;
  const col = !onLine2 ? n1 : nRight > 0 ? nRight : nWrong;
  const curX = LEFT + col * CW + 4;
  const curY = onLine2 ? Y2 : Y1;

  // —— 删除线：6f 划过，随退格同步缩短 ——
  const strikeP = ramp(f, STRIKE, 6, EASE.snappy);
  const strikeW = Math.min(WRONG.length * CW * strikeP, Math.max(0, nWrong) * CW);

  const under = ramp(f, UNDER, 14, EASE.snappy);
  const sub = ramp(f, SUB, 18, EASE.snappy);
  const cam = mix(1, 1.04, ramp(f, 0, TYPEWRITER_ERROR_RETYPE_DURATION, EASE.swift));
  const margin = ramp(f, 0, 14, EASE.out);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.12 }} fill={{ x: 0.9, y: 0.95 }} />
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${LEFT + 700}px ${Y2}px`, transform: `scale(${cam.toFixed(4)})` }}>
        {/* 打字纸的页边线（朱红）+ 眉题上方一道发丝线 */}
        <div style={{ position: 'absolute', left: LEFT - 56, top: Y1 - 84, width: 2, height: (Y2 - Y1 + SIZE + 210) * margin, background: alpha(L.accent, 0.5) }} />
        <div style={{ position: 'absolute', left: LEFT - 56, top: Y1 - 84, width: 1560 * margin, height: 1, background: alpha(L.ink, 0.12) }} />
        {/* 眉题 */}
        <div style={{ position: 'absolute', left: LEFT + 4, top: Y1 - 56, ...type(24, 650, { caps: true }), letterSpacing: '0.22em', color: L.ink3, opacity: margin }}>
          Launch copy&nbsp;&nbsp;·&nbsp;&nbsp;draft 3
        </div>

        {/* 第一行：句干 */}
        <div style={{ position: 'absolute', left: LEFT, top: Y1, height: SIZE * 1.2, display: 'flex', alignItems: 'center', fontFamily: FONT.mono, fontSize: SIZE, whiteSpace: 'pre' }}>
          {Array.from(LINE1).slice(0, n1).map((c, i) => <Glyph key={i} ch={c} at={AT1[i]} frame={f} seed={i + 1} weight={400} color={L.ink2} />)}
        </div>
        {/* 第二行：改口的戏台 */}
        <div style={{ position: 'absolute', left: LEFT, top: Y2, height: SIZE * 1.2, display: 'flex', alignItems: 'center', fontFamily: FONT.mono, fontSize: SIZE, whiteSpace: 'pre' }}>
          {nRight === 0
            ? Array.from(WRONG).slice(0, Math.max(0, nWrong)).map((c, i) => <Glyph key={`w${i}`} ch={c} at={AT2[i]} frame={f} seed={40 + i} weight={700} color={L.ink} />)
            : Array.from(RIGHT).slice(0, nRight).map((c, i) => (
              <Glyph key={`r${i}`} ch={c} at={AT3[i]} frame={f} seed={80 + i} weight={700} color={c === '.' ? L.accent : L.ink} />
            ))}
        </div>
        {/* 删除线 */}
        {strikeW > 0.5 && nRight === 0 && (
          <div style={{ position: 'absolute', left: LEFT - 6, top: Y2 + SIZE * 0.62, width: strikeW + 12, height: 8, borderRadius: 4, background: L.accent, transform: 'rotate(-1.2deg)', transformOrigin: 'left center' }} />
        )}
        {/* 底线：只划在宣言词下 */}
        {under > 0 && (
          <div style={{ position: 'absolute', left: LEFT + 5 * CW + 6, top: Y2 + SIZE * 1.12, width: (14 * CW - 12) * under, height: 12, borderRadius: 2, background: L.accent }} />
        )}
        {/* 光标：朱红竖条，条件挂载 */}
        {cursorOn && (
          <div style={{ position: 'absolute', left: curX, top: curY + SIZE * 0.14, width: 10, height: SIZE * 0.98, borderRadius: 2, background: L.accent }} />
        )}
        {/* 副标题 */}
        <div style={{
          position: 'absolute', left: LEFT + 4, top: Y2 + SIZE * 1.12 + 62, ...type(40, 450), color: L.ink2,
          opacity: sub, transform: `translateY(${((1 - sub) * 22).toFixed(2)}px)`,
        }}>
          One place to plan, ship and watch every launch.
        </div>
      </div>
    </div>
  );
};
