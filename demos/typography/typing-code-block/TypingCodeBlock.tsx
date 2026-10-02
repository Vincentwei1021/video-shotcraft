// typing-code-block — Code Block Reveal 代码块揭示（motion-lab 定稿转原生 Remotion）
// 同一段语法高亮代码的两种 reveal 对照：左侧逐行淡入上浮（行级 stagger），
// 右侧逐字符打字但保持 token 着色，当前字符位以方块底色块提示光标。
// 两块面板做成同规格的编辑器窗口：标题栏（窗控 + 文件名页签 + 手法标签）、行号槽、
// 底部状态栏；右侧当前行有淡高亮、行号随该行开打才亮起，打完状态栏由 Typing… 变 Saved。
// 设计坐标 480×270（DesignStage 等比放大，raster='zoom' 按目标尺寸栅格化，小字不糊），
// 参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, seg, useT } from '../../_fixtures/Motion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const TYPING_CODE_BLOCK_DURATION = 138; // 4600ms @30fps

// token 配色：关键字/标识符/函数/字符串/标点/注释
const K = '#c792ea';
const ID = '#e8eaf0';
const FN = '#82aaff';
const ST = '#c3e88d';
const PU = '#89ddff';
const CM = '#546e7a';
// 每行是 [text, color] token 序列
const LINES: [string, string][][] = [
  [['const ', K], ['app', ID], [' = ', PU], ['createApp', FN], ['();', ID]],
  [['app', ID], ['.', PU], ['use', FN], ['(', ID], ['router', ID], [');', ID]],
  [['app', ID], ['.', PU], ['mount', FN], ['(', ID], ["'#root'", ST], [');', ID]],
  [['// ready', CM]],
];
// 右侧打字用的逐字符扁平序列（保留 token 颜色 + 行号）
const FLAT: { ch: string; color: string; row: number }[] = [];
LINES.forEach((line, row) => {
  for (const [txt, color] of line) for (const ch of txt) FLAT.push({ ch, color, row });
});
// 每行首字符在 FLAT 中的序号（行号亮起用）
const ROW_FIRST = LINES.map((_, row) => FLAT.findIndex((c) => c.row === row));

const GUTTER = 22; // 行号槽宽
const BAR_H = 18; // 标题栏高
const STATUS_H = 14; // 状态栏高

// 编辑器窗口：左右两块共用的外框（同规格 45%×72%）
const Panel: React.FC<{
  x: number;
  label: string;
  status: React.ReactNode;
  children: React.ReactNode;
}> = ({ x, label, status, children }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x}%`,
      top: '14%',
      width: '45%',
      height: '72%',
      borderRadius: 8,
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #12141d 0%, #0e1017 100%)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      boxShadow:
        'inset 0 0.5px 0 rgba(255,255,255,0.07), 0 1px 2px rgba(0,0,0,0.4), 0 14px 30px -8px rgba(0,0,0,0.65)',
      boxSizing: 'border-box',
      fontFamily: '"SF Mono",Menlo,monospace',
    }}
  >
    {/* 标题栏：窗控 + 文件名页签 + 手法标签 */}
    <div
      style={{
        height: BAR_H,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '0 7px',
        background: 'linear-gradient(180deg, #191c27 0%, #151721 100%)',
        borderBottom: '0.5px solid rgba(0,0,0,0.5)',
        boxShadow: 'inset 0 -0.5px 0 rgba(255,255,255,0.03)',
      }}
    >
      {['#ec6a5e', '#e8b84a', '#5fc35b'].map((c) => (
        <div key={c} style={{ width: 4.5, height: 4.5, borderRadius: 3, background: c, opacity: 0.85 }} />
      ))}
      <div
        style={{
          marginLeft: 8,
          height: BAR_H,
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
          background: '#12141d',
          borderLeft: '0.5px solid rgba(255,255,255,0.05)',
          borderRight: '0.5px solid rgba(255,255,255,0.05)',
          fontSize: 8,
          color: '#c4c8d6',
          fontFamily: FONT.sans,
          fontWeight: 500,
        }}
      >
        main.ts
      </div>
      <div
        style={{
          marginLeft: 'auto',
          fontSize: 8,
          letterSpacing: 0.6,
          color: '#7d86c9',
          fontFamily: FONT.sans,
          fontWeight: 600,
          padding: '1.5px 5px',
          borderRadius: 4,
          background: 'rgba(125,134,240,0.12)',
          border: '0.5px solid rgba(125,134,240,0.22)',
        }}
      >
        {label}
      </div>
    </div>
    {/* 代码区 */}
    <div style={{ padding: '8px 0 0 0', fontSize: 12, lineHeight: 1.9 }}>{children}</div>
    {/* 状态栏 */}
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: STATUS_H,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 8px',
        borderTop: '0.5px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.015)',
        fontSize: 6.5,
        color: '#5d6480',
        fontFamily: FONT.sans,
      }}
    >
      <span>TypeScript</span>
      <span>UTF-8</span>
      <span style={{ marginLeft: 'auto' }}>{status}</span>
    </div>
  </div>
);

// 行号
const LineNo: React.FC<{ n: number; on: number }> = ({ n, on }) => (
  <span
    style={{
      display: 'inline-block',
      width: GUTTER,
      paddingRight: 8,
      boxSizing: 'border-box',
      textAlign: 'right',
      color: '#3c4360',
      opacity: on,
      fontVariantNumeric: 'tabular-nums',
    }}
  >
    {n}
  </span>
);

export const TypingCodeBlock: React.FC = () => {
  const t = useT();
  // 右侧打字进度：t∈[0.08,0.9] 线性推进到全部字符
  const typed = Math.floor(seg(t, 0.08, 0.9) * FLAT.length);
  const done = typed >= FLAT.length;
  const curRow = done ? -1 : FLAT[typed].row;
  const leftDone = seg(t, 0.08 + 3 * 0.14 + 0.3, 0.08 + 3 * 0.14 + 0.32);
  return (
    <DesignStage bg="#08090d" raster="zoom">
      {/* 背景：上方一处冷色柔光 + 暗角 + 颗粒，替代死平黑底 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 60% at 50% 18%, rgba(110,120,190,0.16) 0%, rgba(110,120,190,0) 70%), linear-gradient(180deg, #0d0f15 0%, #08090d 100%)',
        }}
      />
      <Vignette strength={0.5} color="#000000" />
      {/* 左：逐行淡入上浮（行级 stagger），上浮同时 1.2px→0 去虚 */}
      <Panel x={3.5} label="LINE FADE-IN" status={leftDone > 0 ? 'Ln 4, Col 9' : 'Ln 1, Col 1'}>
        {LINES.map((line, i) => {
          const k = seg(t, 0.08 + i * 0.14, 0.08 + i * 0.14 + 0.3, E.outCubic);
          return (
            <div
              key={i}
              style={{
                whiteSpace: 'pre',
                opacity: k,
                transform: `translateY(${(1 - k) * 8}px)`,
                filter: k < 1 ? `blur(${((1 - k) * 1.2).toFixed(2)}px)` : undefined,
              }}
            >
              <LineNo n={i + 1} on={1} />
              {line.map(([txt, color], j) => (
                <span key={j} style={{ color }}>
                  {txt}
                </span>
              ))}
            </div>
          );
        })}
      </Panel>
      {/* 右：逐字符打字（保色），当前字符位带方块光标底色 */}
      <Panel
        x={51.5}
        label="CHAR TYPING"
        status={done ? <span style={{ color: '#7fd1a3' }}>● Saved</span> : <span>● Typing…</span>}
      >
        {LINES.map((_, row) => (
          <div
            key={row}
            style={{
              minHeight: '1.9em',
              whiteSpace: 'pre',
              // 当前行淡高亮（编辑器语感），打完撤掉
              background: row === curRow ? 'rgba(255,255,255,0.035)' : 'transparent',
            }}
          >
            <LineNo n={row + 1} on={typed >= ROW_FIRST[row] ? 1 : 0.35} />
            {FLAT.map((c, i) =>
              c.row === row ? (
                <span
                  key={i}
                  style={{
                    color: c.color,
                    // 光标位字符以底色块形式提示（保持可见）
                    opacity: i < typed || i === typed ? 1 : 0,
                    background: i === typed && typed < FLAT.length ? '#3a4468' : 'transparent',
                    borderRadius: i === typed ? 1 : 0,
                  }}
                >
                  {c.ch}
                </span>
              ) : null,
            )}
          </div>
        ))}
      </Panel>
      <Grain opacity={0.06} scale={0.25} blend="soft-light" />
    </DesignStage>
  );
};
