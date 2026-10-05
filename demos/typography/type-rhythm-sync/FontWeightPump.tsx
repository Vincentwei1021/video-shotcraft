// 字重脉冲（font-weight-pump）——标题笔画随节拍变粗又弹回，像文字跟着低音鼓蹦迪。
//
// 第二轮重设计（夜店海报 · 回声字栈）：
// - look = aurora（深紫夜 · 紫粉霓虹）。主角是 250px 的「LOUDER」：静止时是 250 字重的细体、字与字之间空着
//   （每个字钉在按 900 字重排好的槽位里），鼓点一到笔画瞬间撑满槽位变成实心黑体，再幂衰减弹回细体——
//   "缝隙一拍一合"本身就是节拍。字不位移、不重排，只有属性在动。
// - 节奏递进（128 BPM，14f 一拍，两小节 + 一记 drop）：
//   第 1 小节只有主字脉冲；第 2 小节上下各长出一行描边回声字，比主字晚 2f 跟着脉冲、并被冲击推开（跟随）；
//   第 9 拍 drop：主字冲到 900 后不再回细，而是落定在 780 字重、填上紫→粉渐变，回声推开后归位，
//   一道横向光带扫过（Q4：只给主角一次）——结尾帧是一张完整的海报。
// - 回弹按"中间先收、两边后收"错开（衰减窗 9f → 13f），读作冲击从中间向两侧散开；
//   每小节第 1 拍是重音：额外 scaleX +6%，染粉色。底部 8+1 格步进音序器作静音参照（亮哪格 = 第几拍）。
// - 不做整画面逐拍泵 / 抖动（节拍性抖动判例）：只有字、字后柔光和音序器格子随拍动。
//
// 时间表（30fps，共 165f）：
//   0–15    预备：细体 LOUDER、音序器空格、眉题（video-shotcraft 标志 + 字标）就位，字后光极缓呼吸
//   16–58   第 1 小节 4 拍（16/30/44/58），每拍 9–13f 衰减窗，拍距 14f > 衰减窗
//   64–72   回声行淡入、上下拉开
//   72–114  第 2 小节 4 拍，回声晚 2f 跟拍、被推开 26px
//   128     drop：900 字重 + 渐变 + 光带，~12f 内回落到 780 定格；副标题（video-shotcraft 卖点）逐词升起
//   140–165 hold
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const FONT_WEIGHT_PUMP_DURATION = 165;

const L = LOOKS.aurora;

const BEATS = [16, 30, 44, 58, 72, 86, 100, 114];
const DROP = 128;
const DOWN = new Set([0, 4]); // 每小节第 1 拍重音
const TEXT = 'LOUDER';
const SIZE = 240;
const CY = 505; // 主字行中心（略高于画面中心，给下方副标题与音序器让位）
const W_REST = 250; // 静止字重（细）
const W_PEAK = 900;
const W_FINAL = 780; // drop 后定格字重
const DECAY = 9; // 中心字衰减窗
const SPREAD = 1.6; // 每离中心一字，衰减窗多 1.6f
const ECHO_IN = 64;
const ECHO_DY = 0.85 * SIZE; // 回声行距
const LAG = 2; // 回声比主字晚 2f

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mixRgb = (a: string, b: string, k: number) => {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
};

// 命中后幂衰减包络：t=0 → 1，t>=decay → 精确 0
const envAt = (frame: number, beat: number, decay: number) => {
  const t = frame - beat;
  if (t < 0 || t >= decay) return 0;
  return Math.pow(1 - t / decay, 0.8);
};
// 某帧最大包络 + 拍序号（拍距 14f > 最长衰减窗 13f，同一时刻只有一个活跃拍）
const pulse = (frame: number, decay: number) => {
  let env = 0;
  let beat = -1;
  BEATS.forEach((b, i) => {
    const e = envAt(frame, b, decay);
    if (e > env) { env = e; beat = i; }
  });
  return { env, beat };
};
// drop：冲到 1 再回落到定格值（0→1 的 0.75 ≈ 780 字重）
const dropEnv = (frame: number, decay: number) => {
  const t = frame - DROP;
  if (t < 0) return 0;
  const fin = (W_FINAL - W_REST) / (W_PEAK - W_REST);
  return fin + (1 - fin) * Math.pow(1 - clamp01(t / (decay + 4)), 1.4);
};

const CHARS = TEXT.split('');
const CENTER = (CHARS.length - 1) / 2;
const GRAD = (i: number) => mixRgb(L.accent, L.accent2, i / (CHARS.length - 1)); // drop 后的紫→粉渐变（逐字取色）

// 一行字：每个字钉在 900 字重槽位里原位变粗
const Row: React.FC<{ frame: number; lag?: number; outline?: boolean; opacity?: number }> = ({ frame, lag = 0, outline = false, opacity = 1 }) => {
  const f = frame - lag;
  const drop = clamp01(f - DROP + 1) > 0;
  return (
    <div style={{ display: 'flex', whiteSpace: 'pre', ...type(SIZE, W_REST), letterSpacing: '-0.01em', lineHeight: 1, opacity }}>
      {CHARS.map((ch, i) => {
        const decay = DECAY + Math.max(0, Math.abs(i - CENTER) - 0.5) * SPREAD;
        const { env: e0, beat } = pulse(f, decay);
        const de = dropEnv(f, decay);
        const e = Math.max(e0, de);
        const weight = Math.round(W_REST + (W_PEAK - W_REST) * e);
        const down = beat >= 0 && DOWN.has(beat);
        const hitCol = down ? L.accent2 : L.accent;
        const tint = drop ? 1 : Math.min(1, e0 * 1.25);
        const col = drop ? GRAD(i) : mixRgb(L.ink, hitCol === L.accent2 ? L.accent2 : '#c9b8ff', tint);
        const shine = drop ? 0.35 + 0.65 * Math.pow(1 - clamp01((f - DROP) / 24), 2) : e0;
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ visibility: 'hidden', fontWeight: W_PEAK }}>{ch}</span>
            <span style={{
              position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', fontWeight: weight,
              color: outline ? 'transparent' : col,
              WebkitTextStroke: outline ? `2px ${alpha(drop ? L.accent : L.ink, 0.55)}` : undefined,
              textShadow: !outline && shine > 0.05
                ? `0 0 ${(18 * shine).toFixed(1)}px ${alpha(drop ? GRAD(i) : hitCol, 0.5 * shine)}, 0 0 ${(70 * shine).toFixed(1)}px ${alpha(drop ? GRAD(i) : hitCol, 0.35 * shine)}`
                : 'none',
            }}>
              {ch}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export const FontWeightPump: React.FC = () => {
  const frame = useCurrentFrame();
  const { env, beat } = pulse(frame, DECAY);
  const dEnv = frame >= DROP ? Math.pow(1 - clamp01((frame - DROP) / 16), 1.2) : 0;
  const down = beat >= 0 && DOWN.has(beat);
  const scaleX = 1 + 0.06 * (down ? env : 0) + 0.08 * dEnv; // 重音拍 / drop 横向撑开（transform 不改排版）
  const intro = ramp(frame, 0, 12, EASE.out);
  // 回声：64f 起淡入并拉开；每拍晚 2f 被推开 26px；drop 推开 60px 后归位
  const echoIn = ramp(frame, ECHO_IN, 10, EASE.snappy);
  const { env: eEnv } = pulse(frame - LAG, DECAY + 2);
  const eDrop = frame >= DROP + LAG ? Math.pow(1 - clamp01((frame - DROP - LAG) / 18), 1.6) : 0;
  const echoPush = mix(-40, 0, echoIn) + 26 * eEnv * echoIn + 60 * eDrop;
  const breathe = 0.5 + 0.5 * Math.sin(frame / 9);
  const glowA = 0.1 + 0.05 * breathe * (1 - clamp01(frame / 16)) + 0.3 * env * (down ? 1.3 : 1) + 0.4 * dEnv + (frame >= DROP ? 0.12 : 0);
  // 横向光带：drop 时从左扫到右一次
  const streak = ramp(frame, DROP, 16, EASE.out);
  const bar = frame >= BEATS[4] ? 2 : 1;

  const label: React.CSSProperties = { ...type(30, 600, { caps: true }), letterSpacing: '0.16em' };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.5 }} fill={{ x: 0.85, y: 0.15 }} intensity={0.7} />

      {/* 字后柔光：随拍明暗，只在标题身后 */}
      <div style={{
        position: 'absolute', left: 260, right: 260, top: CY - 240, height: 480, borderRadius: '50%',
        background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(down || frame >= DROP ? L.accent2 : L.accent, Math.min(0.6, glowA))} 0%, ${alpha(L.accent, 0)} 100%)`,
        mixBlendMode: 'screen',
      }} />

      {/* 眉题 */}
      <div style={{ position: 'absolute', left: 120, top: 92, display: 'flex', alignItems: 'center', gap: 14, opacity: intro }}>
        <ShotcraftMark size={46} tone="dark" />
        {/* 字标全小写，不走眉题的 caps 样式 */}
        <span style={{ ...type(30, 700), fontFamily: BRAND.font, letterSpacing: '0.03em', color: L.ink }}>{BRAND.name}</span>
      </div>
      <div style={{ position: 'absolute', right: 120, top: 96, ...label, color: L.ink2, opacity: intro, fontVariantNumeric: 'tabular-nums' }}>
        128 BPM <span style={{ color: L.ink3, marginLeft: 18 }}>{`BAR ${bar} / 2`}</span>
      </div>

      {/* 回声行（描边）：上下各一行 */}
      {[-1, 1].map((s) => (
        <div key={s} style={{
          position: 'absolute', left: 0, right: 0, top: CY - SIZE / 2 + s * (ECHO_DY + echoPush), display: 'flex', justifyContent: 'center',
          opacity: echoIn, transform: `scaleX(${(1 + (scaleX - 1) * 0.5).toFixed(4)})`,
        }}>
          <Row frame={frame} lag={LAG} outline opacity={0.75} />
        </div>
      ))}

      {/* 主字 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: CY - SIZE / 2, display: 'flex', justifyContent: 'center',
        transform: `scaleX(${scaleX.toFixed(4)})`,
      }}>
        <Row frame={frame} />
      </div>

      {/* drop 光带：一次，横穿主字 */}
      {streak > 0 && streak < 1 && (
        <div style={{
          position: 'absolute', left: mix(-600, 1920, streak), top: CY - 4, width: 600, height: 6, borderRadius: 3,
          background: `linear-gradient(90deg, ${alpha('#ffffff', 0)} 0%, ${alpha('#ffffff', 0.9)} 70%, ${alpha('#ffffff', 0)} 100%)`,
          boxShadow: `0 0 30px ${alpha(L.accent2, 0.8)}`, opacity: 1 - streak * 0.6, mixBlendMode: 'screen',
        }} />
      )}

      {/* 副标题：drop 后逐词升起 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 850, textAlign: 'center', ...type(40, 500), color: L.ink2 }}>
        <TextReveal text="Beat-synced cuts, right on the drop." by="word" variant="rise" start={DROP + 8} each={14} gap={2.5} />
      </div>

      {/* 步进音序器：8 拍 + drop */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 944, display: 'flex', justifyContent: 'center', gap: 16, opacity: intro }}>
        {[...BEATS, DROP].map((b, i) => {
          const isDrop = i === BEATS.length;
          const e = isDrop ? dEnv : envAt(frame, b, DECAY);
          const passed = frame >= b;
          const dn = DOWN.has(i) || isDrop;
          const col = dn ? L.accent2 : L.accent;
          return (
            <div key={i} style={{
              width: isDrop ? 132 : 54, height: 54, borderRadius: 12, position: 'relative', marginLeft: i === 4 || isDrop ? 22 : 0,
              background: alpha(L.ink, 0.05), boxShadow: `inset 0 0 0 1.5px ${alpha(dn ? L.accent2 : L.ink, dn ? 0.35 : 0.14)}`,
              transform: `scale(${(1 + 0.12 * e).toFixed(3)})`,
            }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 12, background: col,
                opacity: e > 0.02 ? Math.max(isDrop ? 0.9 : 0, 0.35 + 0.65 * e) : passed ? (isDrop ? 0.9 : 0.28) : 0,
                boxShadow: e > 0.02 ? `0 0 ${(30 * e).toFixed(1)}px ${alpha(col, 0.8)}` : 'none',
              }} />
              {isDrop && (
                <span style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...type(22, 800, { caps: true }), letterSpacing: '0.2em', color: passed ? L.onAccent : L.ink3,
                }}>
                  Drop
                </span>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
