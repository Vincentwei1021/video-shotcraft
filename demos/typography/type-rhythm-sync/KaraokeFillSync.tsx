// 卡拉OK填色随读（karaoke-fill-sync）——旁白读到哪个词，哪个词就从左到右被填亮。
//
// 第二轮重设计（发布会开场 · 余烬引信）：
// - look = ember（暖黑 · 橙 · 金）。舞台是发布会开场的大字幕：176px 左对齐两行「Ship faster. / Break nothing.」，
//   左上眉题、左下讲者署名条（头像 + 姓名 + 职位）、右下旁白波形与时间码——画面交代"这是有人在念的字幕"。
// - 手法不变且更强：每个词双层同文本叠放——底层是 13% 透明的未读字；上层用 background-clip:text 的横向渐变
//   按词内进度揭开，渐变前沿是一道烧红的"引信"（金白热边 → 橙色已读区），像火沿着笔画烧过去；
//   正在读的词带一层同形泛光，读完 14f 内冷却成奶白主墨色（强调色只属于"此刻"）。
//   词下 6px 橙色读指跟着前沿走，读完从左往右收掉。
// - 节奏跟语速：短词快读、长词慢读，词间留换气，行间停一拍（换气 16f）；末词读完后干净 hold。
//   词级时间表：Ship 16–30 / faster. 34–62 / Break 78–94 / nothing. 98–126。
// - 背景：主光从字后左上打来，几粒余烬火星极缓上飘（只做氛围）；整幅 1.00→1.03 极缓推近。
//
// 时间表（30fps，共 160f）：
//   0–15    预备：未读字幕（13% 墨）、眉题、讲者条、波形就位
//   16–62   第 1 行逐词填色（引信烧过）
//   62–78   行间换气（16f，波形回落）
//   78–126  第 2 行逐词填色
//   126–140 末词冷却成主墨色、读指收线
//   140–160 hold
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { EASE, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const KARAOKE_FILL_SYNC_DURATION = 160;

const L = LOOKS.ember;

type Word = { text: string; start: number; end: number };

const LINES: Word[][] = [
  [
    { text: 'Ship', start: 16, end: 30 },
    { text: 'faster.', start: 34, end: 62 },
  ],
  [
    { text: 'Break', start: 78, end: 94 },
    { text: 'nothing.', start: 98, end: 126 },
  ],
];
const ALL = LINES.flat();
const SIZE = 176;
const LEFT = 160;
const HOT = '#ffe2a8'; // 引信热边（金白）
const COOL = 14; // 读完冷却帧数

const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mixRgb = (a: string, b: string, k: number) => {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
};

const h = (n: number) => {
  const s = Math.sin(n * 91.7 + 13.1) * 43758.5453;
  return s - Math.floor(s);
};

const KaraokeWord: React.FC<{ word: Word; frame: number }> = ({ word, frame }) => {
  // 词内 linear 填充进度（跟语速，不加缓动），clamp 保证读完保持
  const p = interpolate(frame, [word.start, word.end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cool = ramp(frame, word.end, COOL, EASE.out); // 读完冷却
  const active = frame >= word.start && cool < 1;
  // 前沿位置（%）：p=0 / 1 时完全藏 / 完全露（多走 8% 让热边整个出词）
  const e = p * 112 - 6;
  const fill = mixRgb(L.accent, L.ink, cool);
  const hot = mixRgb(HOT, L.ink, cool);
  const grad = `linear-gradient(90deg, ${fill} 0%, ${fill} ${(e - 9).toFixed(2)}%, ${hot} ${(e - 1.5).toFixed(2)}%, ${alpha(HOT, 0)} ${(e + 1.5).toFixed(2)}%)`;
  const clipText: React.CSSProperties = {
    position: 'absolute', inset: 0, backgroundImage: grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
  };
  const bloom = active ? (1 - cool) * Math.min(1, p * 4) : 0;
  const retract = ramp(frame, word.end, 8, EASE.swift);
  const showLine = frame >= word.start && retract < 1;
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginRight: '0.24em' }}>
      {/* 底层：未读字 */}
      <span style={{ color: alpha(L.ink, 0.13) }}>{word.text}</span>
      {/* 泛光：上层同形虚化，只在读中 */}
      {bloom > 0.01 && (
        <span style={{ ...clipText, filter: 'blur(16px)', opacity: 0.75 * bloom }}>{word.text}</span>
      )}
      {/* 上层：按进度揭开，前沿是热边 */}
      {p > 0 && <span style={clipText}>{word.text}</span>}
      {/* 引信火星：前沿每 ~2.5f 迸出一粒，向上飘散、2–3f 内变暗（确定性） */}
      {Array.from({ length: Math.ceil((word.end - word.start) / 2.5) }, (_, k) => {
        const ts = word.start + k * 2.5;
        const age = frame - ts;
        if (age < 0 || age > 16) return null;
        const r1 = h(word.start * 7 + k * 13.1), r2 = h(word.start * 3 + k * 5.7);
        const ex = interpolate(ts, [word.start, word.end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * 112 - 6;
        const u = age / 16;
        const dx = (r1 - 0.25) * 90 * u;
        const dy = -(70 + r2 * 130) * u + 60 * u * u; // 上抛 + 微重力
        const sz = 4 + r2 * 5;
        return (
          <span key={`s${k}`} style={{
            position: 'absolute', left: `${ex.toFixed(2)}%`, top: `${(18 + r1 * 40).toFixed(1)}%`, width: sz, height: sz, borderRadius: '50%',
            transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`, background: HOT,
            boxShadow: `0 0 8px ${alpha(L.accent2, 0.9)}, 0 0 16px ${alpha(L.accent, 0.6)}`, opacity: (1 - u) * (1 - u),
          }} />
        );
      })}
      {/* 读指 */}
      {showLine && (
        <span style={{
          position: 'absolute', bottom: -10, height: 6, borderRadius: 3,
          left: `${(retract * p * 100).toFixed(2)}%`,
          width: `${(Math.max(0, p - retract * p) * 100).toFixed(2)}%`,
          background: `linear-gradient(90deg, ${L.accent} 0%, ${HOT} 100%)`, boxShadow: `0 0 16px ${alpha(L.accent, 0.7)}`,
        }} />
      )}
    </span>
  );
};

// 旁白波形：按"此刻是否在读词"给包络，确定性哈希给起伏
const BARS = 72;
const WAVE_X = 1060;
const WAVE_W = 700;
const WAVE_T0 = 10;
const WAVE_T1 = 140;
const speechAt = (f: number) => {
  let e = 0.05;
  for (const w of ALL) e = Math.max(e, ramp(f, w.start - 2, 3, EASE.out) * (1 - ramp(f, w.end - 2, 4, EASE.out)));
  return e;
};
const tc = (f: number) => `00:${String(14 + Math.floor(f / 30)).padStart(2, '0')}`;

export const KaraokeFillSync: React.FC = () => {
  const frame = useCurrentFrame();
  const playhead = Math.min(1, Math.max(0, (frame - WAVE_T0) / (WAVE_T1 - WAVE_T0)));
  const push = 1 + 0.03 * ramp(frame, 0, KARAOKE_FILL_SYNC_DURATION, EASE.swift);
  const intro = ramp(frame, 0, 12, EASE.out);
  const label: React.CSSProperties = { ...type(30, 600, { caps: true }), letterSpacing: '0.16em' };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.32 }} fill={{ x: 0.9, y: 0.92 }} intensity={0.8}>
        <Dust look={L} count={22} seed={4} drift={0.35} opacity={0.4} color={L.accent2} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(4)})`, transformOrigin: `${LEFT}px 460px` }}>
        {/* 眉题 */}
        <div style={{ position: 'absolute', left: LEFT + 6, top: 196, ...label, color: L.ink3, opacity: intro, display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: L.accent, boxShadow: `0 0 12px ${alpha(L.accent, 0.8)}` }} />
          <span>Ferrum Keynote <span style={{ color: L.ink2 }}>— Opening</span></span>
        </div>

        {/* 大字幕：两行左对齐 */}
        <div style={{ position: 'absolute', left: LEFT, top: 262, ...type(SIZE, 760), lineHeight: 1.08, whiteSpace: 'nowrap' }}>
          {LINES.map((words, li) => (
            <div key={li}>
              {words.map((w) => <KaraokeWord key={w.text} word={w} frame={frame} />)}
            </div>
          ))}
        </div>
      </AbsoluteFill>

      {/* 讲者署名条 */}
      <div style={{ position: 'absolute', left: LEFT + 6, top: 836, display: 'flex', alignItems: 'center', gap: 26, opacity: intro }}>
        <div style={{
          width: 76, height: 76, borderRadius: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(140deg, ${L.accent2} 0%, ${L.accent} 100%)`, ...type(30, 750), color: L.onAccent,
          boxShadow: `0 0 0 3px ${alpha(L.bg[1], 1)}, 0 0 0 5px ${alpha(L.accent, 0.5)}`,
        }}>
          MO
        </div>
        <div>
          <div style={{ ...type(36, 650), color: L.ink }}>Maya Okafor</div>
          <div style={{ ...type(30, 450), color: L.ink2, marginTop: 6 }}>Head of Platform, Ferrum</div>
        </div>
      </div>

      {/* 旁白波形 + 时间码：已播部分着橙色 */}
      <div style={{ position: 'absolute', left: WAVE_X, top: 836, width: WAVE_W, height: 76, opacity: intro }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {Array.from({ length: BARS }, (_, i) => {
            const u = i / (BARS - 1);
            const at = WAVE_T0 + u * (WAVE_T1 - WAVE_T0);
            const env = speechAt(at);
            const amp = 0.1 + env * (0.3 + 0.7 * h(i * 3 + 1));
            const played = u <= playhead;
            return (
              <div key={i} style={{
                width: 5, height: `${(amp * 100).toFixed(1)}%`, borderRadius: 3,
                background: played ? L.accent : alpha(L.ink, 0.16),
                boxShadow: played && env > 0.5 ? `0 0 8px ${alpha(L.accent, 0.45)}` : 'none',
              }} />
            );
          })}
        </div>
        <div style={{ position: 'absolute', left: playhead * WAVE_W - 1, top: -10, width: 2, height: 96, background: L.ink, opacity: 0.85 }} />
        <div style={{ position: 'absolute', right: 0, top: 96, ...type(26, 500, { mono: true }), color: L.ink3 }}>
          <span style={{ color: L.ink2 }}>{tc(frame)}</span> / 00:19
        </div>
      </div>
    </AbsoluteFill>
  );
};
