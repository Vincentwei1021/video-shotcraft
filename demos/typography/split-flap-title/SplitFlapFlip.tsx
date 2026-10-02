import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

// split-flap-flip：机场翻牌字。每字符一个上下两半的机械翻牌格，翻过若干乱码后咔哒停在目标字，左→右级联成波。
//
// 第二轮重设计（余烬 · 夜间出发大屏）：
// - look = ember（暖黑 · 橙）。主体是一整块出发大屏：石墨暖黑外壳（上沿高光 + 内凹槽 + 落地暖光），
//   抬头一行「◆ DEPARTURES」+ 本地时间；第 1 行是 128×176 的大翻牌格「SHIP FASTER」（字 132px，占画宽 ~75%）；
//   第 2 行是 60×84 小翻牌格的航班信息「RELEASE 4.0」+ 状态「BOARDING」（状态字是强调橙）。
// - 翻牌更像真机械：开场所有格是空白叶片（先认出"这是块翻牌屏"）；每格翻牌次数不同（3–6 次，
//   离目标越"远"翻得越多），单次 4f 两段式（上半叶 Easing.in 重力掉落 + 明暗变化，下半叶拍下回亮），
//   落定一记 6px 下沉回弹咔哒。级联 3f/格，大行先翻、小行在大行过半时接着翻（两层节奏叠成波）。
// - 收尾：状态 BOARDING 全部落定后，状态格背光一次暖橙泛光，状态灯之后缓慢呼吸（hold 段不死）。
//
// 时间表（30fps，共 150f）：
//   0–14    建立：大屏外壳、抬头、空白叶片（第 1 帧即完整画面）
//   14–72   大行级联：3f/格，每格 3–6 次 × 4f，最后一格 ~66f 落定，+6f 咔哒
//   44–101  小行级联：2f/格，每格 3–4 次 × 3f；状态组 68f 起接着翻
//   ~101    状态格一次暖橙泛光，状态灯亮起后缓慢呼吸
//   101–150 hold：全程极缓推近 1→1.045 + 机位 4°→1.2° 俯角缓收（smooth）
export const SPLIT_FLAP_FLIP_DURATION = 150;

const L = LOOKS.ember;
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const HERO = 'SHIP FASTER';
const SUB_L = 'RELEASE 4.0';
const SUB_R = 'BOARDING';

type Size = { w: number; h: number; fs: number; r: number; gap: number; space: number };
const BIG: Size = { w: 128, h: 176, fs: 132, r: 12, gap: 10, space: 54 };
const SMALL: Size = { w: 60, h: 84, fs: 60, r: 7, gap: 6, space: 30 };

const rnd = (a: number) => {
  const x = Math.sin(a * 127.3) * 43758.5453;
  return x - Math.floor(x);
};
const garble = (seed: number, k: number) => CHARSET[Math.floor(rnd(seed * 7.13 + k * 3.71 + 1) * CHARSET.length)];

const INK = '#f6ebdd'; // 象牙白字
// 叶片：上半叶顶部受光略亮 → 铰链处略暗；下半叶铰链处略亮 → 底部更暗（主光在上）
const TOP_BG = 'linear-gradient(180deg, #2f2621 0%, #241d19 100%)';
const BOT_BG = 'linear-gradient(180deg, #261f1b 0%, #1a1512 100%)';

const Half: React.FC<{ ch: string; part: 'top' | 'bottom'; s: Size; color: string; shade?: number }> = ({ ch, part, s, color, shade = 0 }) => (
  <div style={{
    position: 'absolute', left: 0, top: part === 'top' ? 0 : s.h / 2, width: s.w, height: s.h / 2, overflow: 'hidden',
    background: part === 'top' ? TOP_BG : BOT_BG,
    borderRadius: part === 'top' ? `${s.r}px ${s.r}px 0 0` : `0 0 ${s.r}px ${s.r}px`,
    boxShadow: part === 'top'
      ? 'inset 0 1px 0 rgba(255,225,200,0.10), inset 0 -1px 0 rgba(0,0,0,0.5)'
      : 'inset 0 1px 0 rgba(255,225,200,0.05), inset 0 -1px 0 rgba(0,0,0,0.35)',
  }}>
    <div style={{
      position: 'absolute', left: 0, top: part === 'top' ? 0 : -s.h / 2, width: s.w, height: s.h,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT.sans, fontWeight: 700, fontSize: s.fs, letterSpacing: '-0.02em', color, fontVariantNumeric: 'tabular-nums',
    }}>
      {ch}
    </div>
    {shade > 0.005 && <div style={{ position: 'absolute', inset: 0, background: `rgba(8,4,2,${shade.toFixed(3)})` }} />}
  </div>
);

// 一个翻牌格：seq = [首态, …乱码…, 目标]，start 起翻帧，flip 单次时长
const FlapCell: React.FC<{ seq: string[]; start: number; flip: number; s: Size; frame: number; color: string; glowK?: number }> = ({
  seq, start, flip, s, frame, color, glowK = 0,
}) => {
  const n = seq.length - 1;
  const local = frame - start;
  const done = local >= n * flip;
  const target = seq[n];

  // 落定咔哒：下沉 → 过冲 → 归零（按格高比例，大格 6px）
  const dip = s.h * 0.034;
  const clickY = done
    ? interpolate(local - n * flip, [0, 2, 4, 7], [0, dip, -dip * 0.25, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) })
    : 0;

  let topCh = seq[0];
  let botCh = seq[0];
  let botShade = 0;
  let leaf: React.ReactNode = null;
  if (done) {
    topCh = target;
    botCh = target;
  } else if (local > 0) {
    const k = Math.min(n - 1, Math.floor(local / flip));
    const from = seq[k];
    const to = seq[k + 1];
    const x = (local - k * flip) / flip;
    const p = Easing.in(Easing.quad)(x); // 重力：越掉越快
    topCh = to;
    botCh = from;
    const mb = 1.4 * x * (s.h / 176);
    if (p < 0.5) {
      botShade = 0.45 * p * 2;
      leaf = (
        <div style={{
          position: 'absolute', inset: 0, transform: `rotateX(${(-p * 2 * 90).toFixed(2)}deg)`, transformOrigin: `center ${s.h / 2}px`,
          backfaceVisibility: 'hidden', zIndex: 2,
          filter: `brightness(${(1 - p * 2 * 0.5).toFixed(3)})${mb > 0.3 ? ` blur(${(mb * 0.6).toFixed(2)}px)` : ''}`,
        }}>
          <Half ch={from} part="top" s={s} color={color} />
        </div>
      );
    } else {
      botShade = 0.45 * (1 - (p - 0.5) * 2);
      leaf = (
        <div style={{
          position: 'absolute', inset: 0, transform: `rotateX(${(90 - (p - 0.5) * 2 * 90).toFixed(2)}deg)`, transformOrigin: `center ${s.h / 2}px`,
          backfaceVisibility: 'hidden', zIndex: 2,
          filter: `brightness(${(0.5 + (p - 0.5) * 2 * 0.5).toFixed(3)})${mb > 0.3 ? ` blur(${mb.toFixed(2)}px)` : ''}`,
        }}>
          <Half ch={to} part="bottom" s={s} color={color} />
        </div>
      );
    }
  }

  return (
    <div style={{
      position: 'relative', width: s.w, height: s.h, flex: 'none', transform: `translateY(${clickY.toFixed(2)}px)`,
      perspective: s.h * 2.6, borderRadius: s.r,
      boxShadow: `0 1px 0 rgba(255,220,190,0.05), 0 2px 3px rgba(0,0,0,0.5), 0 ${s.h * 0.06}px ${s.h * 0.1}px -${s.h * 0.04}px rgba(0,0,0,0.6)` +
        (glowK > 0.01 ? `, 0 0 ${(s.h * 0.5 * glowK).toFixed(1)}px ${alpha(L.accent, 0.45 * glowK)}` : ''),
    }}>
      <Half ch={topCh} part="top" s={s} color={color} />
      <Half ch={botCh} part="bottom" s={s} color={color} shade={botShade} />
      {leaf}
      {/* 中缝铰链 */}
      <div style={{
        position: 'absolute', left: 0, top: s.h / 2 - 1.5, width: s.w, height: 3, zIndex: 3,
        background: 'linear-gradient(180deg, #0a0605 0%, #0a0605 66%, rgba(255,220,190,0.07) 100%)',
      }} />
      {/* 转轴销钉 */}
      {[-3, s.w - 3].map((x) => (
        <div key={x} style={{
          position: 'absolute', left: x, top: s.h / 2 - s.h * 0.045, width: 6, height: s.h * 0.09, borderRadius: 2, zIndex: 4,
          background: 'linear-gradient(180deg, #4d4038 0%, #241c18 100%)', boxShadow: '0 1px 1px rgba(0,0,0,0.6)',
        }} />
      ))}
    </div>
  );
};

// 一行翻牌：text 的每个非空格字符一个格；flips(i) 每格翻牌次数
const FlapRow: React.FC<{
  text: string; s: Size; frame: number; start: number; stagger: number; flip: number; seed: number;
  flips: (i: number) => number; color?: string; glowK?: number;
}> = ({ text, s, frame, start, stagger, flip, seed, flips, color = INK, glowK }) => {
  let i = 0;
  return (
    <div style={{ display: 'flex', gap: s.gap, alignItems: 'center' }}>
      {[...text].map((ch, idx) => {
        if (ch === ' ') return <div key={idx} style={{ width: s.space, flex: 'none' }} />;
        const j = i++;
        const nf = flips(j);
        // 首态空白叶片 → (nf-1) 个乱码 → 目标字
        const seq = [' ', ...Array.from({ length: nf - 1 }, (_, k) => garble(seed + j, k)), ch];
        return <FlapCell key={idx} seq={seq} start={start + j * stagger} flip={flip} s={s} frame={frame} color={color} glowK={glowK} />;
      })}
    </div>
  );
};

const rowWidth = (text: string, s: Size) =>
  [...text].reduce((w, ch) => w + (ch === ' ' ? s.space : s.w), 0) + (text.length - 1) * s.gap;

const HERO_START = 14;
const SUB_START = 44;
const STATUS_START = SUB_START + 10 * 2 + 4; // 状态组在航班号 10 格之后接着级联（68f）
const STATUS_DONE = STATUS_START + 7 * 2 + 4 * 3 + 7; // 末格翻完 + 咔哒（~101f）

export const SplitFlapFlip: React.FC = () => {
  const frame = useCurrentFrame();
  const push = mix(1, 1.045, ramp(frame, 0, SPLIT_FLAP_FLIP_DURATION, EASE.smooth));
  const tilt = mix(4, 1.2, ramp(frame, 0, SPLIT_FLAP_FLIP_DURATION, EASE.smooth));
  const boardIn = ramp(frame, 0, 12, EASE.out);
  const statusGlow = ramp(frame, STATUS_DONE, 8, EASE.out) * (1 - 0.6 * ramp(frame, STATUS_DONE + 8, 30, EASE.out));
  const lamp = frame < STATUS_DONE ? 0.25 : 0.7 + 0.3 * Math.sin((frame - STATUS_DONE) / 6);

  const BOARD_W = 1640;
  const PAD_X = (BOARD_W - rowWidth(HERO, BIG)) / 2;
  const label: React.CSSProperties = { ...type(24, 650, { caps: true }), letterSpacing: '0.2em', color: L.ink3 };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={null} intensity={0.9}>
        {/* 大屏下方的暖色地面反光 */}
        <div style={{
          position: 'absolute', left: 260, right: 260, top: 830, height: 220,
          background: `radial-gradient(ellipse 50% 50% at 50% 20%, ${alpha(L.accent, 0.1 + 0.08 * statusGlow)} 0%, ${alpha(L.accent, 0)} 70%)`,
        }} />
      </Stage>

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', perspective: 2400 }}>
        <div style={{ transform: `scale(${push.toFixed(5)}) rotateX(${tilt.toFixed(3)}deg)`, transformOrigin: '50% 60%', opacity: boardIn }}>
          {/* 大屏外壳 */}
          <div style={{
            width: BOARD_W, padding: `30px ${PAD_X}px 46px`, boxSizing: 'border-box', borderRadius: 28,
            background: 'linear-gradient(180deg, #1d1612 0%, #130e0b 100%)',
            border: '1px solid rgba(255,210,180,0.07)',
            boxShadow:
              'inset 0 1px 0 rgba(255,220,190,0.12), inset 0 0 0 8px rgba(0,0,0,0.22), ' +
              `0 3px 6px rgba(0,0,0,0.5), 0 50px 90px -30px rgba(0,0,0,0.85), 0 40px 120px -40px ${alpha(L.accent, 0.22)}`,
          }}>
            {/* 抬头 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 22, marginBottom: 30, borderBottom: `1px solid ${L.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 14, height: 14, background: L.accent, transform: 'rotate(45deg)', borderRadius: 2 }} />
                <span style={{ ...type(34, 800, { caps: true }), letterSpacing: '0.16em', color: L.ink }}>Departures</span>
              </div>
              <span style={{ ...type(32, 600, { mono: true }), color: L.ink2 }}>
                LOCAL&nbsp;&nbsp;<span style={{ color: L.ink }}>09:41</span>
              </span>
            </div>

            <div style={{ ...label, marginBottom: 14 }}>Destination</div>
            <FlapRow text={HERO} s={BIG} frame={frame} start={HERO_START} stagger={3} flip={4} seed={11} flips={(i) => 3 + Math.floor(rnd(i * 2.3 + 5) * 4)} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
              <div>
                <div style={{ ...label, marginBottom: 12 }}>Flight</div>
                <FlapRow text={SUB_L} s={SMALL} frame={frame} start={SUB_START} stagger={2} flip={3} seed={41} flips={(i) => 3 + (i % 2)} />
              </div>
              <div>
                <div style={{ ...label, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 99, background: L.accent, opacity: lamp, boxShadow: `0 0 ${(14 * lamp).toFixed(1)}px ${alpha(L.accent, 0.9)}` }} />
                  Status
                </div>
                <FlapRow text={SUB_R} s={SMALL} frame={frame} start={STATUS_START} stagger={2} flip={3} seed={77} flips={() => 4} color="#ff8a4c" glowK={statusGlow} />
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
