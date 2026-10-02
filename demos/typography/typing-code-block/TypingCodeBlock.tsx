// typing-code-block — 代码块揭示对照：同一段语法高亮代码，左「整行浮出」、右「逐键敲入（保色）」
//
// 第二轮重设计（极光紫夜 · 发布会对照镜）：
// - look = aurora（紫黑舞台 + 顶部紫光 + 右下粉色余光 + 稀疏浮尘）。两块同规格 820×500 编辑器
//   玻璃面板并排占画宽 88%，代码 40px 等宽（原版 12px 设计坐标放大后仍偏小），行高 70，
//   语法色重配到极光色系（关键字紫 / 函数粉 / 字符串薄荷 / 标点灰紫 / 注释暗紫）。
// - 面板上方 40px 大标签「01 Line by line / 02 Keystroke」交代手法；面板下方各一条揭示时间线：
//   左侧 4 段刻度随每行落定点亮，右侧连续进度条 + 「42 / 71 keys」计数，两侧都走秒表——把两种节奏差画出来。
// - 左：4 行按 9f 错峰，每行 20f snappy 上浮 14px + 6px→0 去虚（克制位移，代码不是卡片）。
// - 右：逐字符打字，token 色在 setup 期写进每个 span，打到只翻可见性；确定性 1/2f 真人间隔、
//   行尾顿 4f；光标是垫在下一个字符下的紫色发光方块（字反白），当前行整行淡高亮、行号随开打点亮。
//   打完状态栏 Typing… → Saved，面板一次扫光（Q4：只给主角一次）。
// - 相机全程 1→1.025 极缓推。
//
// 时间表（30fps，共 165f）：
//   0–16    预备：面板 snappy 上浮入场（右晚 3f），标签字距收拢
//   16–63   左侧 4 行错峰浮出（16/25/34/43 起，各 20f）→ 左侧时间线四段点亮
//   18–131  右侧逐键敲入 71 字符（均 ~1.45f/字 + 行尾顿）
//   131–134 Saved；134–156 右面板扫光
//   134–165 hold：两块完整代码并排，尾帧是选型海报
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Sheen, Stage, alpha, glow, type } from '../../_fixtures/Look';

export const TYPING_CODE_BLOCK_DURATION = 165;

const L = LOOKS.aurora;
const MONO = FONT.mono;

// token 配色（极光色系）：关键字 / 标识 / 函数 / 字符串 / 标点 / 注释
const K = '#b69cff';
const ID = '#f1ecff';
const FN = '#ff8fc8';
const ST = '#8ff0c8';
const PU = '#9a90bb';
const CM = '#6f6590';
const LINES: [string, string][][] = [
  [['const ', K], ['app', ID], [' = ', PU], ['nova', FN], ['()', PU]],
  [['app', ID], ['.', PU], ['use', FN], ['(', PU], ['edge', FN], ['())', PU]],
  [['app', ID], ['.', PU], ['route', FN], ['(', PU], ["'/ship'", ST], [', ', PU], ['go', ID], [')', PU]],
  [['// ready in 38ms', CM]],
];

// 右侧逐字符扁平序列（setup 期就带好 token 色 + 行号）
const FLAT: { ch: string; color: string; row: number }[] = [];
LINES.forEach((line, row) => {
  for (const [txt, color] of line) for (const ch of txt) FLAT.push({ ch, color, row });
});
const rnd = (n: number) => {
  const x = Math.sin(n * 78.233 + 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
// 每字符出现帧：确定性 1/2f 间隔（均 ~1.45f），换行顿 4f
const TYPE_START = 18;
const AT: number[] = [];
FLAT.reduce((acc, c, i) => {
  const next = acc + (i > 0 && FLAT[i - 1].row !== c.row ? 4 : 0);
  AT[i] = next;
  return next + (rnd(i) < 0.55 ? 1 : 2);
}, TYPE_START);
const TYPE_END = AT[AT.length - 1];
const SAVED = TYPE_END + 3;
const ROW_FIRST = LINES.map((_, row) => FLAT.findIndex((c) => c.row === row));

// 左侧行级错峰
const LINE_START = 16;
const LINE_GAP = 9;
const LINE_DUR = 20;

// 面板几何
const PW = 820;
const PH = 500;
const PTOP = 262;
const GAP = 56;
const PL = [(1920 - PW * 2 - GAP) / 2, (1920 - PW * 2 - GAP) / 2 + PW + GAP];
const BAR = 64;
const STATUS = 52;
const FS = 40;
const LH = 70;
const GUTTER = 92;

const Panel: React.FC<{ x: number; enter: number; status: React.ReactNode; sheen?: number; children: React.ReactNode }> = ({ x, enter, status, sheen = 0, children }) => (
  <div style={{
    position: 'absolute', left: x, top: PTOP, width: PW, height: PH, borderRadius: 24, overflow: 'hidden',
    opacity: Math.min(1, enter * 1.4), transform: `translateY(${((1 - enter) * 40).toFixed(2)}px)`,
    background: `linear-gradient(180deg, ${alpha('#221a3a', 0.94)} 0%, ${alpha('#140f26', 0.96)} 100%)`,
    border: `1px solid ${alpha('#d6c4ff', 0.14)}`,
    boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.08)}, 0 2px 4px ${alpha(L.shadow, 0.6)}, 0 46px 90px -30px ${alpha(L.shadow, 1)}, 0 0 80px -20px ${alpha(L.light, 0.25)}`,
  }}>
    {/* 标题栏 */}
    <div style={{ height: BAR, display: 'flex', alignItems: 'center', gap: 12, padding: '0 26px', borderBottom: `1px solid ${alpha('#000000', 0.35)}`, background: alpha('#ffffff', 0.025) }}>
      {['#ef7a8c', '#e9b86a', '#86c99a'].map((c) => <div key={c} style={{ width: 15, height: 15, borderRadius: 8, background: c, opacity: 0.7 }} />)}
      <div style={{ marginLeft: 18, ...type(24, 500), color: L.ink2 }}>server.ts</div>
    </div>
    <div style={{ paddingTop: 38, fontFamily: MONO, fontSize: FS, lineHeight: `${LH}px` }}>{children}</div>
    {/* 状态栏 */}
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, height: STATUS, display: 'flex', alignItems: 'center', gap: 26, padding: '0 26px',
      borderTop: `1px solid ${alpha('#ffffff', 0.05)}`, background: alpha('#ffffff', 0.02), ...type(22, 500), color: L.ink3,
    }}>
      <span>TypeScript</span><span>UTF-8</span><span style={{ marginLeft: 'auto' }}>{status}</span>
    </div>
    <Sheen progress={sheen} color="#e9dcff" strength={0.5} width={0.18} />
  </div>
);

const LineNo: React.FC<{ n: number; on: number }> = ({ n, on }) => (
  <span style={{ display: 'inline-block', width: GUTTER, paddingRight: 28, boxSizing: 'border-box', textAlign: 'right', fontSize: 28, color: mixA(on), fontVariantNumeric: 'tabular-nums' }}>{n}</span>
);
const mixA = (on: number) => alpha(L.ink2, mix(0.22, 0.7, on));

export const TypingCodeBlock: React.FC = () => {
  const f = useCurrentFrame();
  const typed = AT.filter((a) => f >= a).length;
  const done = typed >= FLAT.length;
  const curRow = done ? -1 : FLAT[typed].row;
  const enterL = ramp(f, 0, 18, EASE.snappy);
  const enterR = ramp(f, 3, 18, EASE.snappy);
  const cam = mix(1, 1.025, ramp(f, 0, TYPING_CODE_BLOCK_DURATION, EASE.swift));
  const lineK = (i: number) => ramp(f, LINE_START + i * LINE_GAP, LINE_DUR, EASE.snappy);
  const leftDone = lineK(3) > 0.98;
  const savedP = ramp(f, SAVED, 8, EASE.out);
  const label = ramp(f, 2, 20, EASE.snappy);

  const Label: React.FC<{ x: number; n: string; text: string }> = ({ x, n, text }) => (
    <div style={{ position: 'absolute', left: x + 6, top: PTOP - 86, display: 'flex', alignItems: 'baseline', gap: 22, opacity: label }}>
      <span style={{ fontFamily: MONO, fontSize: 30, color: L.accent }}>{n}</span>
      <span style={{ ...type(44, 650), color: L.ink, letterSpacing: `${(-0.02 + (1 - label) * 0.12).toFixed(3)}em` }}>{text}</span>
    </div>
  );

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: -0.02 }} fill={{ x: 0.86, y: 0.98 }} horizon={0.93} breathe={0.5}>
        <Dust look={L} count={18} seed={4} drift={0.18} opacity={0.35} />
      </Stage>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '960px 540px', transform: `scale(${cam.toFixed(4)})` }}>
        <Label x={PL[0]} n="01" text="Line by line" />
        <Label x={PL[1]} n="02" text="Keystroke" />

        {/* 左：整行浮出 */}
        <Panel x={PL[0]} enter={enterL} status={leftDone ? 'Ln 4, Col 17' : 'Ln 1, Col 1'}>
          {LINES.map((line, i) => {
            const k = lineK(i);
            return (
              <div key={i} style={{ whiteSpace: 'pre', opacity: k, transform: `translateY(${((1 - k) * 14).toFixed(2)}px)`, filter: k < 0.99 ? `blur(${((1 - k) * 6).toFixed(2)}px)` : undefined }}>
                <LineNo n={i + 1} on={k} />
                {line.map(([txt, color], j) => <span key={j} style={{ color }}>{txt}</span>)}
              </div>
            );
          })}
        </Panel>

        {/* 右：逐键敲入（保色）+ 方块光标 */}
        <Panel
          x={PL[1]} enter={enterR} sheen={ramp(f, SAVED + 3, 22, EASE.swift)}
          status={done
            ? <span style={{ color: ST, opacity: mix(0.4, 1, savedP) }}>✓ Saved</span>
            : <span style={{ color: L.ink2 }}>● Typing…</span>}
        >
          {LINES.map((_, row) => (
            <div key={row} style={{ minHeight: LH, whiteSpace: 'pre', position: 'relative' }}>
              {row === curRow && <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: LH, background: alpha('#ffffff', 0.04), borderLeft: `3px solid ${alpha(L.accent, 0.7)}` }} />}
              <span style={{ position: 'relative' }}>
                <LineNo n={row + 1} on={typed > ROW_FIRST[row] ? 1 : 0} />
                {FLAT.map((c, i) => {
                  if (c.row !== row) return null;
                  const isCur = i === typed && !done;
                  return (
                    <span key={i} style={{
                      color: isCur ? L.onAccent : c.color, opacity: i < typed || isCur ? 1 : 0,
                      background: isCur ? L.accent : undefined, borderRadius: isCur ? 4 : 0,
                      boxShadow: isCur ? `0 0 18px ${alpha(L.accent, 0.7)}, 0 0 4px ${alpha(L.accent, 0.9)}` : undefined,
                    }}>{c.ch}</span>
                  );
                })}
              </span>
            </div>
          ))}
        </Panel>

        {/* 揭示时间线：左 4 段刻度 / 右连续进度 */}
        <div style={{ position: 'absolute', left: PL[0], top: PTOP + PH + 52, width: PW, opacity: label }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {LINES.map((_, i) => {
              const k = lineK(i);
              return (
                <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: alpha('#ffffff', 0.07), overflow: 'hidden' }}>
                  <div style={{ width: `${k * 100}%`, height: '100%', background: L.accent, boxShadow: glow(L.accent, 0.5) }} />
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 18, display: 'flex', ...type(32, 500), color: L.ink2 }}>
            <span>4 lines</span>
            <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 30, color: leftDone ? L.ink : L.ink3 }}>{(Math.max(0, Math.min(f, LINE_START + 3 * LINE_GAP + LINE_DUR) - LINE_START) / 30).toFixed(1)}s</span>
          </div>
        </div>
        <div style={{ position: 'absolute', left: PL[1], top: PTOP + PH + 52, width: PW, opacity: label }}>
          <div style={{ height: 6, borderRadius: 3, background: alpha('#ffffff', 0.07), overflow: 'hidden' }}>
            <div style={{ width: `${(typed / FLAT.length) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${L.accent}, ${L.accent2})`, boxShadow: glow(L.accent2, 0.5) }} />
          </div>
          <div style={{ marginTop: 18, display: 'flex', ...type(32, 500), color: L.ink2 }}>
            <span><span style={{ fontVariantNumeric: 'tabular-nums', color: done ? L.ink2 : L.ink }}>{String(typed).padStart(2, '0')}</span> / {FLAT.length} keys</span>
            <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 30, color: done ? L.ink : L.ink3 }}>
              {(Math.max(0, Math.min(f, TYPE_END) - TYPE_START) / 30).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
