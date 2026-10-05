// 卡拉OK填色随读（karaoke-fill-sync）——旁白读到哪个词，哪个词就从左到右被填亮。
// 两行居中标语 "FRAME MOTION / CRAFT SHOTS"（video-shotcraft 短句 Frame motion. Craft the shot. 的四词版），
// 每个词双层同文本叠放：底层低透明墨色未读字，
// 上层用 mask 按词内进度线性揭开（逐词独立叠层，揭开百分比即词内进度，无需量测词宽；
// 揭开前沿是 ±4% 的柔边而不是硬切口）。正在读的词填强调色，读完 10f 内退成主墨色——
// 强调色只属于"此刻"。词级时间表模拟语速：FRAME 20–38、MOTION 42–75（长词慢读）、
// CRAFT 85–103、SHOTS 107–130，词间停顿（换气）。
// 读指：正在填的词底下 8px 强调色圆角下划线，右缘跟随填充前沿；读完从左往右收掉（6f），不留线。
// 底部一条旁白波形作静音预览的参照：词内起伏、换气处回落，已播部分着色。
// 0–19f hold；130–149f 真静止（最后的退色 / 收线在 f140 前完成）。
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, ramp, tracking } from '../../_fixtures/Polish';

export const KARAOKE_FILL_SYNC_DURATION = 150;

type Word = { text: string; start: number; end: number };

const LINES: Word[][] = [
  [
    { text: 'FRAME', start: 20, end: 38 },
    { text: 'MOTION', start: 42, end: 75 },
  ],
  [
    { text: 'CRAFT', start: 85, end: 103 },
    { text: 'SHOTS', start: 107, end: 130 },
  ],
];
const ALL = LINES.flat();
const SIZE = 150;
const FEATHER = 4; // 揭开前沿柔边（%）
const ACC = [91, 99, 211]; // G.accent
const INK = [23, 24, 28]; // G.ink1

const rgbMix = (a: number[], b: number[], k: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;

const KaraokeWord: React.FC<{ word: Word; frame: number }> = ({ word, frame }) => {
  // 词内 linear 填充进度，clamp 保证读完保持（跟语速，不加缓动）
  const p = interpolate(frame, [word.start, word.end], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const edge = p * (100 + FEATHER * 2) - FEATHER; // 柔边中心（%），p=0/1 时完全藏 / 完全露
  const mask = `linear-gradient(90deg, #000 ${(edge - FEATHER).toFixed(2)}%, transparent ${(edge + FEATHER).toFixed(2)}%)`;
  const settle = ramp(frame, word.end, 10, EASE.out); // 读完退成主墨色
  const fillColor = rgbMix(ACC, INK, settle);
  // 读指：读中跟随前沿，读完 6f 从左往右收掉
  const retract = ramp(frame, word.end, 6, EASE.swift);
  const showLine = frame >= word.start && retract < 1;
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {/* 底层：低透明墨色未读字 */}
      <span style={{ color: 'rgba(23,24,28,0.13)' }}>{word.text}</span>
      {/* 上层：按进度从左到右柔边揭开 */}
      {p > 0 && (
        <span style={{
          position: 'absolute', inset: 0, color: fillColor,
          WebkitMaskImage: mask, maskImage: mask,
        }}>
          {word.text}
        </span>
      )}
      {/* 读指下划线：右缘跟随填充前沿，读完从左收 */}
      {showLine && (
        <span style={{
          position: 'absolute', bottom: -6, height: 8, borderRadius: 4,
          left: `${(retract * p * 100).toFixed(2)}%`,
          width: `${(Math.max(0, p - retract * p) * 100).toFixed(2)}%`,
          background: G.accent, boxShadow: '0 2px 10px rgba(91,99,211,0.35)',
        }} />
      )}
    </span>
  );
};

// 旁白波形：48 根竖条，按"此刻是否在读词"给包络，确定性哈希给起伏
const BARS = 48;
const WAVE_W = 560;
const WAVE_T0 = 14;
const WAVE_T1 = 136;
const h = (n: number) => {
  const s = Math.sin(n * 91.7 + 13.1) * 43758.5453;
  return s - Math.floor(s);
};
const speechAt = (f: number) => {
  let e = 0.06;
  for (const w of ALL) {
    const fadeIn = ramp(f, w.start - 2, 3, EASE.out);
    const fadeOut = 1 - ramp(f, w.end - 2, 4, EASE.out);
    e = Math.max(e, fadeIn * fadeOut);
  }
  return e;
};

export const KaraokeFillSync: React.FC = () => {
  const frame = useCurrentFrame();
  const playhead = (frame - WAVE_T0) / (WAVE_T1 - WAVE_T0);
  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.22 }} accent="#5b63d3" />

      {/* 标语：两行居中 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, bottom: 60,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontSize: SIZE, fontWeight: 800, letterSpacing: tracking(SIZE, true), lineHeight: 1.18,
      }}>
        {LINES.map((words, li) => (
          <div key={li} style={{ display: 'flex', gap: 56 }}>
            {words.map((w) => (
              <KaraokeWord key={w.text} word={w} frame={frame} />
            ))}
          </div>
        ))}
      </div>

      {/* 旁白波形：已播部分强调色，未播部分淡墨 */}
      <div style={{
        position: 'absolute', left: 960 - WAVE_W / 2, top: 860, width: WAVE_W, height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {Array.from({ length: BARS }, (_, i) => {
          const u = i / (BARS - 1);
          const at = WAVE_T0 + u * (WAVE_T1 - WAVE_T0); // 这根条对应的旁白时刻
          const env = speechAt(at);
          const amp = 0.12 + env * (0.35 + 0.65 * h(i * 3 + 1));
          const played = u <= playhead;
          return (
            <div key={i} style={{
              width: 4, height: `${(amp * 100).toFixed(1)}%`, borderRadius: 2,
              background: played ? G.accent : 'rgba(23,24,28,0.16)',
              opacity: played ? 0.9 : 1,
            }} />
          );
        })}
      </div>
    </div>
  );
};
