// 乱码解码字（scramble-decode）——终端黑客感文字入场。
// 暗色终端场：标题 "DECODE SPEED" 每字符先高速跳随机字母/数字（每 2f 换一个，seed hash 取字符），
// 从左到右逐个锁定：第 i 个字符在帧 20+i*6 锁定为真字符，锁定瞬间该字符反色闪
// （浅色圆角块深字 2f）随即恢复，字形 6f 从 1.14 收回 1 并带一抹衰减的强调色底光。
// 未锁定字符按到解码头的距离分亮度（头附近亮、远处暗），读出"扫描波前"；
// 解码头下方一道强调色短下划线跟着走。底部 HUD：细进度轨 + 平滑推进的强调色填充 + 计数。
// 关键帧：0–20f 全员乱跳（0–10f 自左向右渐显）→ 20–86f 逐个锁定 → 87–130f 完全静止收尾。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Backdrop, EASE, FONT, mix, ramp } from '../../_fixtures/Polish';

export const SCRAMBLE_DECODE_DURATION = 130;

const TEXT = 'DECODE SPEED';
const CHARSET = 'ABCDEF0123456789#$%&';
const LOCK_START = 20; // 第 0 个字符锁定帧
const LOCK_STEP = 6; // 相邻字符锁定间隔
const FLASH_LEN = 2; // 锁定反色闪持续帧数

const SIZE = 132; // 标题字号（等宽，每字固定 1ch 槽宽）
const INK = '#eef0f6'; // 锁定字色（带冷调的近白）
const NOISE = [150, 158, 196]; // 乱码字色 RGB（冷灰蓝）
const ACCENT = '#7d86f0'; // 暗场里提亮一档的靛蓝强调色
const BAR_W = 920;

// 帧确定伪随机
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const CHARS = TEXT.split('');
const REAL = CHARS.filter((c) => c !== ' ').length; // 11 个真字符
const lockOf = (i: number) => LOCK_START + i * LOCK_STEP;

export const ScrambleDecode: React.FC = () => {
  const frame = useCurrentFrame();
  const tick = Math.floor(frame / 2); // 每 2 帧换一个伪随机字符

  // 已锁定真字符数（离散，给计数）+ 平滑进度（给进度条）
  let locked = 0;
  let smooth = 0;
  CHARS.forEach((c, i) => {
    if (c === ' ') return;
    if (frame >= lockOf(i)) locked++;
    smooth += ramp(frame, lockOf(i) - 1, 7, EASE.snappy);
  });
  const done = locked === REAL;
  const prog = smooth / REAL;
  // 解码头：下一个待锁字符的槽位（含空格槽，按帧连续推进）
  const headPos = Math.min(CHARS.length - 1, Math.max(0, (frame - LOCK_START) / LOCK_STEP));
  const headFade = 1 - ramp(frame, lockOf(CHARS.length - 1), 8, EASE.out);
  const hud = ramp(frame, 2, 16, EASE.out);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.mono }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.34 }} accent="#5b63d3" vignette={0.55} grain={0.09} />

      {/* 标题行：等宽 1ch 槽，跳字不抖 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 404, display: 'flex', justifyContent: 'center',
        fontSize: SIZE, fontWeight: 700, lineHeight: 1.12, letterSpacing: 0,
      }}>
        {CHARS.map((ch, i) => {
          if (ch === ' ') return <span key={i} style={{ display: 'inline-block', width: '0.62ch' }} />;
          const lf = lockOf(i);
          const isLocked = frame >= lf;
          const flashing = isLocked && frame < lf + FLASH_LEN;
          const pop = ramp(frame, lf, 6, EASE.snappy); // 锁定后字形收回
          const glow = isLocked ? 1 - ramp(frame, lf, 14, EASE.out) : 0; // 锁定底光衰减
          // 乱码亮度：0–10f 自左向右渐显；离解码头越近越亮
          const appear = ramp(frame, i * 0.7, 8, EASE.out);
          const dist = Math.abs(i - headPos);
          const near = Math.max(0, 1 - dist / 4);
          const noiseA = appear * (0.3 + 0.45 * near);
          const scramble = CHARSET[Math.floor(h(i * 101 + tick * 7 + 13) * CHARSET.length)];
          const scale = isLocked ? mix(1.14, 1, pop) : 1;
          return (
            <span key={i} style={{ position: 'relative', display: 'inline-block', width: '1ch', textAlign: 'center' }}>
              {/* 锁定底光：强调色柔光，14f 衰减 */}
              {glow > 0.01 && (
                <span style={{
                  position: 'absolute', left: '-0.1ch', right: '-0.1ch', top: '8%', bottom: '8%', borderRadius: 14,
                  background: `radial-gradient(ellipse 60% 60% at 50% 50%, rgba(125,134,240,${(0.42 * glow).toFixed(3)}) 0%, rgba(125,134,240,0) 100%)`,
                }} />
              )}
              {/* 反色闪：浅色圆角块 2f */}
              {flashing && (
                <span style={{
                  position: 'absolute', left: '0.02ch', right: '0.02ch', top: '10%', bottom: '8%', borderRadius: 8,
                  background: INK, boxShadow: '0 0 28px rgba(160,168,255,0.45)',
                }} />
              )}
              <span style={{
                position: 'relative', display: 'inline-block',
                transform: `scale(${scale.toFixed(4)})`,
                color: flashing ? '#0d0f15' : isLocked ? INK : `rgba(${NOISE.join(',')},${noiseA.toFixed(3)})`,
                textShadow: isLocked && !flashing ? `0 0 ${(24 * glow).toFixed(1)}px rgba(150,158,255,${(0.6 * glow).toFixed(3)})` : 'none',
              }}>
                {isLocked ? ch : scramble}
              </span>
            </span>
          );
        })}
      </div>

      {/* 解码头下划线：在槽位间连续滑动，指向下一个待锁字符 */}
      {(() => {
        const slot = 0.602 * SIZE; // Menlo / SF Mono 的 1ch ≈ 0.6em
        const widths = CHARS.map((c) => (c === ' ' ? 0.62 * slot : slot));
        const lefts = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b, 0));
        const x0 = 960 - widths.reduce((a, b) => a + b, 0) / 2;
        // 头停在"下一个待锁"的真字符下；每次锁定后 4f 先快后慢跳到下一格（跳过空格槽）
        const nextReal = (i: number) => { let j = i + 1; while (j < CHARS.length - 1 && CHARS[j] === ' ') j++; return Math.min(CHARS.length - 1, j); };
        let x = x0;
        if (headPos > 0 || frame >= LOCK_START) {
          const k = Math.floor(headPos);
          const fr = CHARS[k] === ' ' ? 1 : ramp(frame, lockOf(k), 4, EASE.snappy); // 空格槽不停留
          x = x0 + mix(lefts[k], lefts[nextReal(k)], fr);
        }
        return (
          <div style={{
            position: 'absolute', left: x + slot * 0.14, top: 404 + SIZE * 1.12 + 4, width: slot * 0.72, height: 5, borderRadius: 3,
            background: ACCENT, boxShadow: `0 0 16px ${ACCENT}`, opacity: hud * headFade,
          }} />
        );
      })()}

      {/* HUD：状态 + 进度轨 + 计数 */}
      <div style={{ position: 'absolute', left: 960 - BAR_W / 2, top: 676, width: BAR_W, opacity: hud }}>
        <div style={{ position: 'relative', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(prog * 100).toFixed(2)}%`, borderRadius: 2,
            background: `linear-gradient(90deg, rgba(125,134,240,0.35) 0%, ${ACCENT} 85%, #c9cdff 100%)`,
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 22,
          fontSize: 32, fontWeight: 500, letterSpacing: '0.12em', fontVariantNumeric: 'tabular-nums',
        }}>
          <span style={{ color: done ? INK : 'rgba(170,176,210,0.62)' }}>
            <span style={{ color: ACCENT, marginRight: 18 }}>{done ? '●' : '○'}</span>
            {done ? 'DECODED' : 'DECODING'}
          </span>
          <span style={{ color: 'rgba(170,176,210,0.62)' }}>
            <span style={{ color: done ? INK : 'rgba(220,224,240,0.85)' }}>{String(locked).padStart(2, '0')}</span>
            {` / ${REAL}`}
          </span>
        </div>
      </div>
    </div>
  );
};
