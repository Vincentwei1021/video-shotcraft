// typing-code-block — Code Block Reveal 代码块揭示（motion-lab 定稿转原生 Remotion）
// 同一段语法高亮代码的两种 reveal 对照：左侧逐行淡入上浮（行级 stagger），
// 右侧逐字符打字但保持 token 着色，当前字符位以方块底色块提示光标。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, seg, useT } from '../../_fixtures/Motion';

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

// 代码面板容器：左右两块共用的外框 + 顶部小标签
const Panel: React.FC<{ x: number; label: string; children: React.ReactNode }> = ({
  x,
  label,
  children,
}) => (
  <div
    style={{
      position: 'absolute',
      left: `${x}%`,
      top: '14%',
      width: '45%',
      height: '72%',
      background: '#10121a',
      border: '1px solid #1c2030',
      borderRadius: 8,
      padding: '10px 12px',
      boxSizing: 'border-box',
      fontFamily: '"SF Mono",Menlo,monospace',
      fontSize: 12,
      lineHeight: 1.9,
    }}
  >
    <div style={{ fontSize: 8, letterSpacing: 2, color: '#4a5270', marginBottom: 6 }}>{label}</div>
    {children}
  </div>
);

export const TypingCodeBlock: React.FC = () => {
  const t = useT();
  // 右侧打字进度：t∈[0.08,0.9] 线性推进到全部字符
  const typed = Math.floor(seg(t, 0.08, 0.9) * FLAT.length);
  return (
    <DesignStage bg="#0a0b10">
      {/* 左：逐行淡入上浮（行级 stagger） */}
      <Panel x={3.5} label="LINE FADE-IN">
        {LINES.map((line, i) => {
          const k = seg(t, 0.08 + i * 0.14, 0.08 + i * 0.14 + 0.3, E.outCubic);
          return (
            <div key={i} style={{ opacity: k, transform: `translateY(${(1 - k) * 8}px)` }}>
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
      <Panel x={51.5} label="CHAR TYPING">
        {LINES.map((_, row) => (
          <div key={row} style={{ minHeight: '1.9em' }}>
            {FLAT.map((c, i) =>
              c.row === row ? (
                <span
                  key={i}
                  style={{
                    color: c.color,
                    // 光标位字符以底色块形式提示（保持可见）
                    opacity: i < typed || i === typed ? 1 : 0,
                    background: i === typed && typed < FLAT.length ? '#3a4468' : 'transparent',
                  }}
                >
                  {c.ch}
                </span>
              ) : null,
            )}
          </div>
        ))}
      </Panel>
    </DesignStage>
  );
};
