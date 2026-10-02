// 乱码解码字（scramble-decode）——终端黑客感文字入场。
//
// 第二轮重设计（荧光终端 · 解码波前）：
// - look = lime（石墨底 · 荧光黄绿 = 磷光终端）。主角是 176px 等宽粗体标题「ZERO LATENCY」，占画宽 66%；
//   上方一行状态眉题（DECRYPTING → ✓ VERIFIED）、下方 48px 等宽副标题、底部按字分段的进度轨 + 区块地址 + 计数。
//   背景是极淡的、缓慢上滚的十六进制转储（虚化成纹理）+ CRT 扫描线，舞台光从标题后方打出。
// - 手法不变且更强：全员高速跳乱码 → 一道"解码波前"从左向右扫过、逐个锁定真字符。波前是一束竖向荧光光柱，
//   离波前越近的乱码越亮、跳得越快（1f/次 vs 远处 2f/次）、带色差错位；锁定瞬间荧光反色块闪 2f，
//   字形 1.16→1 收回并留一抹衰减的荧光底光。
// - 节奏「慢起—加速—急停」：锁定间隔按曲线 8.3f → 3.4f 越来越快（解码在提速），标题锁完副标题 1f/字高速瀑布解码，
//   全部完成时状态翻成 ✓ VERIFIED、进度轨整条亮起，之后干净 hold。
//
// 时间表（30fps，共 140f）：
//   0–14    乱码自左向右显影（第 1 帧就有终端框、眉题、空进度轨）；14f 前全员乱跳
//   14–72   标题 11 个真字符逐个锁定（间隔 8.3→3.4f，波前光柱随之加速扫过）
//   72–98   副标题 30 字符 1f/字瀑布解码（快—快—快，和标题的"一字一顿"形成对比）
//   98–104  ✓ VERIFIED：状态字翻转、进度轨亮满、区块地址定格
//   104–140 hold（整幅极缓推近 1.00→1.02 贯穿全片）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, glow, type } from '../../_fixtures/Look';

export const SCRAMBLE_DECODE_DURATION = 140;

const L = LOOKS.lime;

const TEXT = 'ZERO LATENCY';
const SUB = 'Inference at the edge in 4 ms.';
const SUB_HI = [25, 29]; // 副标题里强调的「4 ms」区间 [start, end)
// 不含与真字符易混的字形（O/0/Q、I/1/L），免得观众误判"已锁定"
const CHARSET = 'ABCDEFGHJKMNPRSTUVWXYZ2345789#$%&*+=<>/';
const SIZE = 176;
const SLOT = 0.6 * SIZE; // SF Mono / Menlo 的 1ch ≈ 0.6em
const SUB_SIZE = 48;
const LOCK0 = 14; // 第一个字符锁定帧
const LOCK_SPAN = 58; // 第一个到最后一个锁定的跨度
const FLASH = 2;
const SUB0 = 74; // 副标题解码起点（1f/字）
const DONE = 100;

const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const CHARS = TEXT.split('');
const REAL_IDX = CHARS.map((c, i) => (c === ' ' ? -1 : i)).filter((i) => i >= 0);
const REAL = REAL_IDX.length; // 11
// 第 k 个真字符的锁定帧：间隔越来越短（解码提速）
const lockOfReal = (k: number) => LOCK0 + LOCK_SPAN * (1 - Math.pow(1 - k / (REAL - 1), 1.45));
const LOCK = CHARS.map((c, i) => (c === ' ' ? -1 : lockOfReal(REAL_IDX.indexOf(i))));
const ROW_W = CHARS.length * SLOT;
const X0 = 960 - ROW_W / 2;

// 波前位置（槽位，连续）：在相邻锁定帧之间插值，锁完后继续冲出右缘
const headAt = (f: number) => {
  if (f <= LOCK[REAL_IDX[0]]) return REAL_IDX[0] - 0.5 + 0.5 * clamp01((f - LOCK0 + 8) / 8);
  for (let k = 0; k < REAL - 1; k++) {
    const a = LOCK[REAL_IDX[k]], b = LOCK[REAL_IDX[k + 1]];
    if (f < b) return mix(REAL_IDX[k], REAL_IDX[k + 1], EASE.swift((f - a) / (b - a)));
  }
  return REAL_IDX[REAL - 1] + ramp(f, LOCK[REAL_IDX[REAL - 1]], 10, EASE.exit) * 3;
};

const scrambleChar = (seed: number, tick: number) => CHARSET[Math.floor(h(seed * 101 + tick * 7 + 13) * CHARSET.length)];

// 背景十六进制转储（确定性），虚化成纹理
const hexBytes = (r: number, seed: number) =>
  Array.from({ length: 16 }, (_, c) => Math.floor(h(r * 31 + c * 7.7 + seed) * 256).toString(16).toUpperCase().padStart(2, '0')).join(' ');
const HEX_ROWS = Array.from({ length: 36 }, (_, r) =>
  `${(0x7f3a00 + r * 16).toString(16).toUpperCase()}  ${hexBytes(r, 0)}    ${hexBytes(r, 50)}    ${hexBytes(r, 90)}`,
);

export const ScrambleDecode: React.FC = () => {
  const frame = useCurrentFrame();
  const tick = Math.floor(frame / 2);
  const head = headAt(frame);
  const headX = X0 + (head + 0.5) * SLOT;
  const beamOn = clamp01((frame - 4) / 10) * (1 - ramp(frame, LOCK[REAL_IDX[REAL - 1]] + 2, 10, EASE.out));

  let locked = 0;
  REAL_IDX.forEach((i) => { if (frame >= LOCK[i]) locked++; });
  const done = frame >= DONE;
  const doneP = ramp(frame, DONE, 10, EASE.snappy);
  const push = 1 + 0.02 * ramp(frame, 0, SCRAMBLE_DECODE_DURATION, EASE.swift);
  const intro = ramp(frame, 0, 12, EASE.out);
  const addr = done ? 'C0DE' : Math.floor(h(tick * 3.3 + 1) * 65535).toString(16).toUpperCase().padStart(4, '0');

  const label: React.CSSProperties = { ...type(30, 500, { mono: true }), letterSpacing: '0.08em' };

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.mono }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.42 }} fill={{ x: 0.12, y: 0.95 }} intensity={0.5}>
        {/* 十六进制转储：极淡、虚化、缓慢上滚 */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 62% at 50% 48%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,1) 75%)',
          maskImage: 'radial-gradient(ellipse 70% 62% at 50% 48%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,1) 75%)',
        }}>
          <div style={{
            position: 'absolute', left: 60, top: 20 - frame * 0.6, ...type(22, 500, { mono: true }), lineHeight: '34px',
            color: L.accent, opacity: 0.06, filter: 'blur(1.6px)', whiteSpace: 'pre',
          }}>
            {HEX_ROWS.map((r, i) => <div key={i}>{r}</div>)}
          </div>
        </div>
        {/* CRT 扫描线 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.35,
          backgroundImage: `repeating-linear-gradient(180deg, ${alpha('#000000', 0.22)} 0px, ${alpha('#000000', 0.22)} 1px, transparent 1px, transparent 4px)`,
        }} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(4)})`, transformOrigin: '50% 48%' }}>
        {/* 解码波前光柱：竖向荧光，随波前移动；标题区外渐隐 */}
        <div style={{
          position: 'absolute', left: headX - 150, top: 250, width: 300, height: 480, opacity: beamOn,
          background: `radial-gradient(ellipse 34% 50% at 50% 50%, ${alpha(L.accent, 0.2)} 0%, ${alpha(L.accent, 0.06)} 55%, ${alpha(L.accent, 0)} 100%)`,
          mixBlendMode: 'screen',
        }} />
        <div style={{
          position: 'absolute', left: headX - 1.5, top: 330, width: 3, height: 320, opacity: beamOn * 0.7,
          background: `linear-gradient(180deg, ${alpha(L.accent, 0)} 0%, ${alpha(L.accent, 0.9)} 50%, ${alpha(L.accent, 0)} 100%)`,
          boxShadow: `0 0 18px ${alpha(L.accent, 0.6)}`,
        }} />

        {/* 眉题：状态 + 文件 + 算法 */}
        <div style={{ position: 'absolute', left: X0 + 8, top: 312, display: 'flex', gap: 36, alignItems: 'center', opacity: intro }}>
          <span style={{
            ...label, fontWeight: 700, color: done ? L.onAccent : L.ink2,
            background: done ? L.accent : 'transparent', padding: '6px 16px', borderRadius: 6,
            boxShadow: done ? `0 0 ${(30 * (1 - doneP) + 12).toFixed(1)}px ${alpha(L.accent, 0.45)}` : `inset 0 0 0 1.5px ${alpha(L.ink2, 0.35)}`,
            transform: `scale(${done ? mix(1.12, 1, doneP).toFixed(4) : 1})`,
          }}>
            {done ? '✓ VERIFIED' : 'DECRYPTING'}
          </span>
          <span style={{ ...label, color: L.ink3 }}>payload.enc</span>
          <span style={{ ...label, color: L.ink3 }}>AES-256-GCM</span>
        </div>

        {/* 标题：等宽 1ch 槽，跳字不抖 */}
        <div style={{
          position: 'absolute', left: X0, top: 380, display: 'flex',
          ...type(SIZE, 700, { mono: true }), lineHeight: 1.1, letterSpacing: 0,
        }}>
          {CHARS.map((ch, i) => {
            if (ch === ' ') return <span key={i} style={{ display: 'inline-block', width: SLOT }} />;
            const lf = LOCK[i];
            const isLocked = frame >= lf;
            const flashing = isLocked && frame < lf + FLASH;
            const pop = ramp(frame, lf, 7, EASE.snappy);
            const after = isLocked ? 1 - ramp(frame, lf, 18, EASE.out) : 0; // 锁定后底光衰减
            const appear = ramp(frame, i * 0.9, 7, EASE.out);
            const near = Math.max(0, 1 - Math.abs(i - head) / 3.2); // 离波前越近越亮
            const fastTick = near > 0.5 ? frame : tick; // 波前附近跳得更快
            const sc = scrambleChar(i, fastTick);
            const noiseCol = `rgba(${[0, 1, 2].map((k) => Math.round(mix(parseInt(L.ink3.slice(1 + k * 2, 3 + k * 2), 16), parseInt(L.accent.slice(1 + k * 2, 3 + k * 2), 16), near * 0.85))).join(',')},${(appear * (0.42 + 0.48 * near)).toFixed(3)})`;
            const split = near * 5; // 色差错位 px
            const scale = isLocked ? mix(1.16, 1, pop) : 1;
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block', width: SLOT, textAlign: 'center' }}>
                {after > 0.01 && (
                  <span style={{
                    position: 'absolute', left: -10, right: -10, top: '6%', bottom: '4%', borderRadius: 16,
                    background: `radial-gradient(ellipse 60% 58% at 50% 50%, ${alpha(L.accent, 0.34 * after)} 0%, ${alpha(L.accent, 0)} 100%)`,
                  }} />
                )}
                {flashing && (
                  <span style={{
                    position: 'absolute', left: 3, right: 3, top: '9%', bottom: '5%', borderRadius: 8,
                    background: L.accent, boxShadow: `0 0 36px ${alpha(L.accent, 0.7)}`,
                  }} />
                )}
                <span style={{
                  position: 'relative', display: 'inline-block', transform: `scale(${scale.toFixed(4)})`,
                  color: flashing ? L.onAccent : isLocked ? L.ink : noiseCol,
                  textShadow: flashing
                    ? 'none'
                    : isLocked
                      ? (after > 0.02 ? glow(L.accent, 0.9 * after) : 'none')
                      : split > 0.3 ? `${-split}px 0 ${alpha(L.accent, 0.45 * near)}, ${split}px 0 ${alpha('#ffffff', 0.22 * near)}` : 'none',
                }}>
                  {isLocked ? ch : sc}
                </span>
              </span>
            );
          })}
        </div>

        {/* 波前下划线光标：指向下一个待锁字符 */}
        <div style={{
          position: 'absolute', left: X0 + head * SLOT + SLOT * 0.12, top: 380 + SIZE * 1.1 + 6, width: SLOT * 0.76, height: 8, borderRadius: 2,
          background: L.accent, boxShadow: `0 0 20px ${alpha(L.accent, 0.8)}`, opacity: beamOn,
        }} />

        {/* 副标题：1f/字瀑布解码 */}
        <div style={{ position: 'absolute', left: X0 + 8, top: 628, display: 'flex', ...type(SUB_SIZE, 500, { mono: true }), whiteSpace: 'pre' }}>
          {SUB.split('').map((ch, i) => {
            const lf = SUB0 + i * 0.8;
            const on = frame >= SUB0 - 10 + i * 0.3;
            if (!on || ch === ' ') return <span key={i}>{' '}</span>;
            const isLocked = frame >= lf;
            const flashing = isLocked && frame < lf + 1.5;
            const hi = i >= SUB_HI[0] && i < SUB_HI[1];
            return (
              <span key={i} style={{
                display: 'inline-block', width: '0.6em', textAlign: 'center',
                background: flashing ? L.accent : 'transparent',
                color: flashing ? L.onAccent : isLocked ? (hi ? L.accent : L.ink2) : alpha(L.ink3, 0.8),
                textShadow: isLocked && hi ? glow(L.accent, 0.35) : 'none',
                fontWeight: hi ? 700 : 500,
              }}>
                {isLocked ? ch : scrambleChar(i + 40, frame)}
              </span>
            );
          })}
        </div>

        {/* HUD：按字分段的进度轨 + 区块地址 + 计数 */}
        <div style={{ position: 'absolute', left: X0 + 8, top: 800, width: ROW_W - 16, opacity: intro }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {REAL_IDX.map((ci, k) => {
              const on = ramp(frame, LOCK[ci], 5, EASE.snappy);
              return (
                <div key={k} style={{ flex: 1, height: 8, borderRadius: 2, background: alpha(L.ink, 0.08), position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(on * 100).toFixed(1)}%`,
                    background: done ? L.accent : mix(0, 1, on) > 0 ? alpha(L.accent, 0.75) : 'transparent',
                    boxShadow: done ? `0 0 12px ${alpha(L.accent, 0.6 * (1 - doneP) + 0.2)}` : 'none',
                  }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26, ...label }}>
            <span style={{ color: L.ink3 }}>
              BLOCK <span style={{ color: done ? L.accent : L.ink2 }}>0x{addr}</span>
            </span>
            <span style={{ color: L.ink3 }}>
              <span style={{ color: done ? L.ink : L.ink2 }}>{String(locked).padStart(2, '0')}</span>
              {` / ${REAL}`}
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
