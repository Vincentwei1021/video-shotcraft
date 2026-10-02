// scramble — 乱码锁定：每个字符先高速跳乱码（种子驱动、可复现），再从左到右逐个"咬定"真字符。
//
// 第二轮重设计（酸柠 · 终端技术海报）：
// - look = lime（石墨黑 · 荧光黄绿）。主体是两行 168px 等宽粗体大标题「AUTOPILOT / NOW ONLINE」，
//   左对齐占画宽 ~55%；上方一行 HUD 抬头（系统名 / 构建号 / 节点），下方一条解算进度条 + 百分比，
//   右侧一列暗淡、虚化的十六进制流作纹理（Q11：纹理不当内容读）。叠一层极淡扫描线做终端屏感。
// - 锁定"咬定"的画面体：被锁的字下面先亮起一块荧光反色块（字变深色），4f 内块退去、字落回白；
//   锁定前沿的字是荧光色乱码 + 底部光标条（解算头），其余乱码暗色闪烁。结论词 ONLINE 锁定后保持荧光色。
// - 锁定顺序不是等分：按 in-out 曲线铺开（起步慢 → 中段快 → 收尾慢），叠 ≤3f 种子抖动——"算得越来越顺，最后几位要多算一会"。
//
// 时间表（30fps，共 130f）：
//   0–4     预备：HUD、进度条空槽、标题位是暗色占位点「·」（第 1 帧就有画面）
//   4–14    启动：乱码从左到右 0.5f/字 依次点亮开始跳（每 2 帧重掷一次）
//   14–26   全员乱码 hold（"开始运算"），进度 0%
//   26–84   锁定扫过 19 个字（in-out 铺开 + 抖动）：每字反色块满格 2f + 4f 退去；进度条与百分比同步
//   84–96   收尾：进度条满格变"ONLINE"状态、状态灯一次泛光
//   96–130  hold：全程极缓推近 1→1.04，十六进制流减速停住
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, glow, stagger, type } from '../../_fixtures/Look';

export const SCRAMBLE_DURATION = 130;

const L = LOOKS.lime;
const LINES = ['AUTOPILOT', 'NOW ONLINE'];
const ACCENT_WORD = { line: 1, from: 4 }; // ONLINE（第 2 行第 4 位起）锁定后保持荧光色
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\';
const FS = 168;
const CELL = 0.62; // 等宽槽宽（em）：乱码换字时整行不抽动
const LEFT = 168;
const TOP = 352;

const BOOT = 4; // 乱码启动
const LOCK0 = 26; // 首字锁定
const LOCK_SPAN = 54; // 锁定铺开跨度
const FLASH = 5; // 反色块：满格 2f + 退去 4f
const LOCK_EASE = bezier(0.36, 0, 0.6, 1); // 起步慢 → 中段快 → 收尾慢

const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 按阅读顺序给每个非空格字符编号
type Cell = { ch: string; line: number; col: number; k: number };
const CELLS: Cell[] = [];
{
  let k = 0;
  LINES.forEach((t, line) => [...t].forEach((ch, col) => CELLS.push({ ch, line, col, k: ch === ' ' ? -1 : k++ })));
}
const N = CELLS.filter((c) => c.k >= 0).length;
const lockAt = (k: number) => LOCK0 + stagger(k, N, LOCK_SPAN, LOCK_EASE) + Math.round(rand(k * 7.3) * 3);
const bootAt = (k: number) => BOOT + k * 0.5;
const LAST_LOCK = Math.max(...CELLS.filter((c) => c.k >= 0).map((c) => lockAt(c.k)));

// 右侧十六进制流（纹理）
const HEX = '0123456789ABCDEF';
const hexRow = (seed: number) =>
  `${Array.from({ length: 4 }, (_, j) => HEX[Math.floor(rand(seed * 3.1 + j) * 16)]).join('')}  ` +
  Array.from({ length: 4 }, (_, j) => HEX[Math.floor(rand(seed * 5.7 + j) * 16)] + HEX[Math.floor(rand(seed * 9.3 + j) * 16)]).join(' ');

export const Scramble: React.FC = () => {
  const frame = useCurrentFrame();
  const bucket = Math.floor(frame / 2);

  let locked = 0;
  let front = -1;
  for (const c of CELLS) {
    if (c.k < 0) continue;
    if (frame >= lockAt(c.k)) locked++;
    else if (front < 0) front = c.k;
  }
  const pct = locked / N;
  const done = ramp(frame, LAST_LOCK + 2, 10, EASE.snappy);
  const statusBloom = ramp(frame, LAST_LOCK + 2, 6, EASE.out) * (1 - ramp(frame, LAST_LOCK + 8, 26, EASE.out));
  const push = mix(1, 1.04, ramp(frame, 0, SCRAMBLE_DURATION, EASE.smooth));
  const hexScroll = (() => {
    // 累计位移（速度随帧衰减）：近似积分
    let y = 0;
    for (let f = 0; f < frame; f += 1) y += 2.2 * (1 - ramp(f, LAST_LOCK - 6, 30, EASE.out));
    return y;
  })();

  const renderCell = (c: Cell, key: number) => {
    const slot: React.CSSProperties = {
      display: 'inline-block', width: `${CELL}em`, textAlign: 'center', position: 'relative',
    };
    if (c.k < 0) return <span key={key} style={slot}>{' '}</span>;
    const la = lockAt(c.k);
    const isAccent = c.line === ACCENT_WORD.line && c.col >= ACCENT_WORD.from;
    if (frame < bootAt(c.k)) {
      // 占位点
      return <span key={key} style={{ ...slot, color: alpha(L.ink3, 0.5) }}>·</span>;
    }
    if (frame < la) {
      const g = POOL[Math.floor(rand(c.k * 131 + bucket) * POOL.length)];
      const isFront = c.k === front && frame >= LOCK0 - 6;
      const isNext = c.k === front + 1 && frame >= LOCK0 - 6;
      const flick = 0.38 + 0.4 * rand(c.k * 53 + bucket * 3 + 11);
      return (
        <span key={key} style={{
          ...slot,
          color: isFront ? L.accent : isNext ? alpha(L.accent, 0.55) : alpha(L.ink2, flick),
          textShadow: isFront ? glow(L.accent, 0.5) : undefined,
        }}>
          {g}
          {isFront && (
            <span style={{ position: 'absolute', left: '6%', right: '6%', bottom: '-0.02em', height: '0.06em', background: L.accent, boxShadow: `0 0 16px ${alpha(L.accent, 0.8)}` }} />
          )}
        </span>
      );
    }
    // 已锁定：荧光反色块 FLASH 帧内退去，字由深色回到白 / 荧光
    const blockA = 1 - ramp(frame, la + 2, FLASH - 1, EASE.linear); // 满格亮 2f，再 4f 线性退去
    const settle = ramp(frame, la, 6, EASE.snappy);
    const finalColor = isAccent ? L.accent : L.ink;
    return (
      <span key={key} style={{ ...slot, color: blockA > 0.5 ? L.onAccent : finalColor, transform: `translateY(${((1 - settle) * -0.04).toFixed(3)}em)` }}>
        {blockA > 0.01 && (
          <span style={{
            position: 'absolute', left: '2%', right: '2%', top: '0.04em', bottom: '0.02em', background: L.accent, opacity: blockA,
            boxShadow: `0 0 ${(40 * blockA).toFixed(1)}px ${alpha(L.accent, 0.6 * blockA)}`, zIndex: -1,
          }} />
        )}
        <span style={{ position: 'relative', textShadow: isAccent && blockA < 0.5 ? glow(L.accent, 0.35) : undefined }}>{c.ch}</span>
      </span>
    );
  };

  const hud: React.CSSProperties = { ...type(26, 500, { mono: true }), letterSpacing: '0.08em', color: L.ink3 };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.42 }} fill={{ x: 0.9, y: 0.1 }} intensity={0.55} vignette={0.6}>
        {/* 标题背后的低亮荧光底光：随解算进度增亮 */}
        <div style={{
          position: 'absolute', left: LEFT - 200, top: TOP - 120, width: 1500, height: 560,
          background: `radial-gradient(ellipse 50% 50% at 45% 50%, ${alpha(L.accent, 0.05 + 0.08 * pct)} 0%, ${alpha(L.accent, 0)} 70%)`,
        }} />
        {/* 右侧十六进制流：纹理，暗 + 虚 */}
        <div style={{
          position: 'absolute', left: 1430, top: 0, bottom: 0, width: 420, overflow: 'hidden', filter: 'blur(2.2px)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 4%, #000 26%, #000 74%, transparent 96%)',
        }}>
          <div style={{ position: 'absolute', left: 0, top: -(hexScroll % 34) - 34 }}>
            {Array.from({ length: 36 }, (_, r) => {
              const row = r + Math.floor(hexScroll / 34);
              return (
                <div key={r} style={{ ...type(20, 500, { mono: true }), height: 34, lineHeight: '34px', color: alpha(L.ink2, 0.1 + 0.1 * rand(row * 1.7)), whiteSpace: 'pre' }}>
                  {hexRow(row)}
                </div>
              );
            })}
          </div>
        </div>
        {/* 扫描线 */}
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0.16) 3px, rgba(0,0,0,0.16) 4px)', opacity: 0.5 }} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})`, transformOrigin: '35% 50%' }}>
        {/* HUD 抬头 */}
        <div style={{ position: 'absolute', left: LEFT, top: TOP - 92, width: 1180, display: 'flex', justifyContent: 'space-between', ...hud }}>
          <span><span style={{ color: L.accent }}>■</span>&nbsp;&nbsp;ORBIT/OS&nbsp;&nbsp;·&nbsp;&nbsp;BUILD 4.2.0</span>
          <span>NODE 07&nbsp;&nbsp;·&nbsp;&nbsp;T+00:{String(Math.floor(frame / 30)).padStart(2, '0')}.{String(Math.floor(((frame % 30) / 30) * 100)).padStart(2, '0')}</span>
        </div>
        <div style={{ position: 'absolute', left: LEFT, top: TOP - 46, width: 1180, height: 1, background: L.line }} />

        {/* 主标题：两行等宽大字 */}
        <div style={{ position: 'absolute', left: LEFT - FS * 0.04, top: TOP, ...type(FS, 700, { mono: true }), letterSpacing: 0, lineHeight: 1.08, whiteSpace: 'pre', isolation: 'isolate' }}>
          {LINES.map((t, li) => (
            <div key={li}>{CELLS.filter((c) => c.line === li).map((c, j) => renderCell(c, li * 100 + j))}</div>
          ))}
        </div>

        {/* 解算进度条 + 状态 */}
        <div style={{ position: 'absolute', left: LEFT, top: TOP + FS * 2.16 + 52, width: 1180 }}>
          <div style={{ position: 'relative', height: 6, background: alpha(L.ink, 0.08), borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(pct * 100).toFixed(2)}%`, background: L.accent, boxShadow: `0 0 18px ${alpha(L.accent, 0.7)}` }} />
          </div>
          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...type(34, 600, { mono: true }), letterSpacing: '0.04em' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 16, color: done > 0.5 ? L.ink : L.ink2 }}>
              <span style={{
                width: 16, height: 16, borderRadius: 99, background: done > 0.5 ? L.accent : alpha(L.ink2, 0.4 + 0.4 * (bucket % 2)),
                boxShadow: done > 0.5 ? `0 0 ${(12 + 30 * statusBloom).toFixed(1)}px ${alpha(L.accent, 0.6 + 0.4 * statusBloom)}` : undefined,
              }} />
              {done > 0.5 ? 'Link established' : frame < LOCK0 ? 'Handshake…' : 'Decrypting…'}
            </span>
            <span style={{ color: done > 0.5 ? L.accent : L.ink, fontVariantNumeric: 'tabular-nums' }}>
              {String(Math.round(pct * 100)).padStart(3, ' ')}%
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
