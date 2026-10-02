// 字形漂移合拢（letterform-drift-assembly）——Stranger Things 片头式入场。
//
// 第二轮重设计（ember · 暗场片头字卡 · 虚构剧集「NOCTURNE」）：
// - look = ember（暖黑 · 余烬橙 · 金）。主角是 200px 衬线粗体全大写的空心描边字：描边是余烬橙，
//   发光用 drop-shadow 沿描边走（不是整块字形的晕）——这就是片头式的"霓虹描边字"。
// - 漂移从纵深来：每个字从镜头前方（scale 1.7–2.7、出画 420–840px、±10° 歪斜）带大虚焦缓慢漂回字面，
//   位移 / 缩放 / 虚焦 / 不透明度共用一条长尾 ease-out 的 p——到了就是实的，不会"到了还糊着"。
//   顺序不是左到右，而是种子乱序 + 先疏后密的错峰（越来越快地合拢，最后两三个字几乎一起落）。
// - 锁定：每个字落位那一刻描边加粗亮成金色、字腔闪一下金、发光冲高再回落（12f 脉冲），之后字腔灌进一层极暗的橙褐填充。
// - 合体之后：上下两根发光细杠从词心向两侧展开（片头的标志性横杠），下方副标题字距收拢浮现；
//   余烬浮尘全程缓慢上飘，hold 段整画面极缓推近 2%（漂移时镜头不动）。
//
// 时间表（30fps，共 170f）：
//   0       第 1 帧：8 个虚焦大字已在画面四周（不是空帧）
//   0–96    漂移合拢：每字 64f 行程，起点按 EASE.out 分布在 0–32f（先疏后密）
//   ~64–96  逐字锁定脉冲（10f）
//   98–122  上下横杠从中心展开（snappy 24f）+ 整词一次泛光
//   112–134 副标题字距收拢浮现
//   120–170 hold：极缓推近 2%，余烬上飘
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, bezier, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, SERIF, Stage, alpha, stagger, type } from '../../_fixtures/Look';

export const LETTERFORM_DRIFT_ASSEMBLY_DURATION = 170;

const L = LOOKS.ember;
const GOLD = L.accent2;
const h = (n: number) => {
  const s = Math.sin(n * 127.3 + 11.7) * 43758.5453;
  return s - Math.floor(s);
};

const WORD = 'NOCTURNE';
const N = WORD.length;
const FS = 200;
const TRAVEL = 64; // 每字漂移行程
const SPAN = 32; // 起点分布跨度
const DRIFT_EASE = bezier(0.3, 0.22, 0.14, 1); // 匀而长的 ease-out：全程都在漂，最后 1/4 极慢地"吸"进字面
// 种子乱序：落位顺序（不是左到右）
const ORDER = [3, 6, 0, 5, 2, 7, 1, 4];
const BAR_AT = 98;

const Letter: React.FC<{ ch: string; i: number; frame: number }> = ({ ch, i, frame }) => {
  const rank = ORDER.indexOf(i);
  const start = stagger(rank, N, SPAN, EASE.out); // 先疏后密
  const lock = start + TRAVEL;
  const p = ramp(frame, start - 22, TRAVEL + 22, DRIFT_EASE); // 提前 22f "起跑" → 第 1 帧已在画面里
  const q = 1 - p;
  // 起始向量：从词心向外 + 种子扰动
  const side = i - (N - 1) / 2;
  const ang = Math.atan2((h(i + 3) - 0.5) * 2.2, side === 0 ? 0.3 : side) + (h(i + 9) - 0.5) * 0.8;
  const mag = 420 + h(i + 21) * 420;
  const dx = Math.cos(ang) * mag * q;
  const dy = Math.sin(ang) * mag * q * 0.85;
  const sc = 1 + (0.7 + h(i + 41) * 1.0) * q; // 从镜头前方来：大 → 1
  const rot = (h(i + 61) - 0.5) * 20 * q;
  const blur = 22 * q * q + 2 * q;
  const op = Math.min(1, 0.5 + 0.5 * p * 1.2);
  // 锁定脉冲：lock → lock+10，快起慢落
  const k = frame - lock;
  const pulse = k < 0 || k > 12 ? 0 : k < 3 ? k / 3 : 1 - EASE.out((k - 3) / 9);
  const settled = frame >= lock;
  const fill = settled ? ramp(frame, lock, 18, EASE.out) : 0;
  const strokeC = pulse > 0 ? mixHex(L.accent, GOLD, pulse) : L.accent;
  const g = 0.55 + 1.9 * pulse;
  return (
    <span style={{
      display: 'inline-block', position: 'relative',
      transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`,
      opacity: op,
      filter: `${blur > 0.3 ? `blur(${blur.toFixed(2)}px) ` : ''}drop-shadow(0 0 ${(6 * g).toFixed(1)}px ${alpha(L.accent, 0.9)}) drop-shadow(0 0 ${(26 * g).toFixed(1)}px ${alpha(L.accent, 0.55)})`,
      color: pulse > 0 ? alpha(GOLD, 0.22 * pulse + 0.0) : alpha('#3a0f04', 0.85 * fill),
      WebkitTextStroke: `${(3.2 + 2 * pulse).toFixed(2)}px ${strokeC}`,
      padding: '0 0.012em',
    }}>
      {ch}
    </span>
  );
};

// 两色混合（脉冲时描边 橙→金）
const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((o) => parseInt(a.slice(o, o + 2), 16));
  const pb = [1, 3, 5].map((o) => parseInt(b.slice(o, o + 2), 16));
  return `rgb(${pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(',')})`;
};

export const LetterformDriftAssembly: React.FC = () => {
  const frame = useCurrentFrame();
  const bar = ramp(frame, BAR_AT, 24, EASE.snappy);
  const flare = ramp(frame, BAR_AT, 6, EASE.out) * (1 - ramp(frame, BAR_AT + 6, 30, EASE.out));
  const sub = ramp(frame, 112, 22, EASE.out);
  const push = 1 + 0.02 * ramp(frame, 118, 52, EASE.swift);
  const barW = 1540;
  const Bar: React.FC<{ y: number }> = ({ y }) => (
    <div style={{
      position: 'absolute', left: 960 - (barW / 2) * bar, top: y, width: barW * bar, height: 5, borderRadius: 3,
      background: `linear-gradient(90deg, ${alpha(L.accent, 0)} 0%, ${L.accent} 12%, ${mixHex(L.accent, GOLD, 0.35)} 50%, ${L.accent} 88%, ${alpha(L.accent, 0)} 100%)`,
      boxShadow: `0 0 12px ${alpha(L.accent, 0.8)}, 0 0 40px ${alpha(L.accent, 0.45)}`,
      opacity: bar > 0.001 ? 1 : 0,
    }} />
  );
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.5 }} fill={{ x: 0.5, y: 1.05 }} intensity={0.75 + 0.25 * ramp(frame, 60, 50, EASE.out)} breathe={0.5}>
        <Dust look={L} count={46} seed={7} drift={0.35} opacity={0.55} color={L.accent} />
      </Stage>
      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})` }}>
        {/* 词后的一次泛光（横杠展开时） */}
        <div style={{
          position: 'absolute', left: 260, right: 260, top: 390, height: 300, borderRadius: '50%',
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent, 0.32)} 0%, ${alpha(L.accent, 0)} 70%)`,
          opacity: 0.35 + 0.65 * flare,
        }} />
        <Bar y={418} />
        <Bar y={644} />
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 430, display: 'flex', justifyContent: 'center',
          fontFamily: SERIF, fontWeight: 800, fontSize: FS, lineHeight: 1, letterSpacing: '-0.01em',
        }}>
          {WORD.split('').map((c, i) => <Letter key={i} ch={c} i={i} frame={frame} />)}
        </div>
        {/* 副标题 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 696, textAlign: 'center', ...type(34, 600, { caps: true }),
          letterSpacing: `${(0.62 - 0.22 * sub).toFixed(3)}em`, paddingLeft: '0.4em', color: L.ink2, opacity: sub,
          filter: sub < 1 ? `blur(${((1 - sub) * 6).toFixed(2)}px)` : undefined,
        }}>
          A new series <span style={{ color: L.accent }}>·</span> Fridays
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
