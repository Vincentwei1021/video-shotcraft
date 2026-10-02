// 字重脉冲（font-weight-pump）——标题笔画随节拍变粗又弹回，像文字跟着低音鼓蹦迪。
// 节拍每 20f 一拍：帧 30/50/70/90/110 命中。命中瞬间字重 400→900、-webkit-text-stroke 0→6px
// 跳满，随后 10f 幂衰减 (1-t/10)^0.8 连续弹回（SF Pro 可变字重，按 env 连续插值）。
// 字不动、属性动：每个字符钉在按常规字重排好的槽位里原位变粗，整行不重排不晃动；
// 全员同帧命中（命中帧必须与鼓点同帧），回弹按"中间先收、两边后收"错开：衰减窗中心 9f → 边缘 12f，
// 读作冲击从中间向两侧散开的跟随（follow-through）。
// 第 3、5 拍（帧 70/110）为重音：整行额外 scaleX 1→1.08 同衰减，字色向强调色染一下。
// 底部 5 个节拍点作节拍参照：命中哪拍哪个点亮起放大，已过的拍保留暗亮。
// 结构：0–29f 静止 hold；30–121f 五拍脉冲；122–139f 真静止收尾（末拍 110+12=122 起无残留）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Backdrop, FONT } from '../../_fixtures/Polish';

export const FONT_WEIGHT_PUMP_DURATION = 140;

const BEATS = [30, 50, 70, 90, 110];
const ACCENTS = new Set([2, 4]); // 第 3、5 拍重音
const DECAY = 10; // 衰减帧数（整行 / 节拍点）
const TEXT = 'PUMP IT UP';
const SIZE = 168;
const SPREAD = 0.75; // 每离中心一字，回弹窗多 0.75f（中心 9f → 边缘 12f）
const INK = '#eef0f6';
const ACCENT = [139, 147, 255]; // 暗场强调色（靛蓝提亮）

// 命中后幂衰减包络：t=0 → 1，t>=decay → 精确 0（保证结尾真静止）
const envAt = (frame: number, beat: number, decay = DECAY) => {
  const t = frame - beat;
  if (t < 0 || t >= decay) return 0;
  return Math.pow(1 - t / decay, 0.8);
};

// 某帧的最大包络及拍序号（拍距 20f > 最长衰减 12f，只可能有一个活跃拍）
const pulse = (frame: number, decay = DECAY) => {
  let env = 0;
  let beat = -1;
  BEATS.forEach((b, i) => {
    const e = envAt(frame, b, decay);
    if (e > env) {
      env = e;
      beat = i;
    }
  });
  return { env, beat };
};

const CHARS = TEXT.split('');
const CENTER = (CHARS.length - 1) / 2;

export const FontWeightPump: React.FC = () => {
  const frame = useCurrentFrame();
  const { env, beat } = pulse(frame);
  const accent = beat >= 0 && ACCENTS.has(beat);
  const scaleX = accent ? 1 + 0.08 * env : 1; // 重音拍变宽一挡（transform 不改排版）

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.4 }} accent="#5b63d3" vignette={0.55} grain={0.09} />

      {/* 字后柔光：随包络呼吸，只在标题身后一小片，不动整画面 */}
      <div style={{
        position: 'absolute', left: 360, right: 360, top: 330, height: 360, borderRadius: '50%',
        background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(${ACCENT.join(',')},${(0.05 + 0.13 * env * (accent ? 1.4 : 1)).toFixed(3)}) 0%, rgba(${ACCENT.join(',')},0) 100%)`,
      }} />

      {/* 标题行：按常规字重排槽位，叠层字原位变粗 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: 1920, height: 1080,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex', whiteSpace: 'pre', fontSize: SIZE, lineHeight: 1,
          letterSpacing: '0.07em', transform: `scaleX(${scaleX.toFixed(4)})`, transformOrigin: 'center center',
        }}>
          {CHARS.map((ch, i) => {
            const decay = 9 + Math.max(0, Math.abs(i - CENTER) - 0.5) * SPREAD;
            const { env: e, beat: b } = pulse(frame, decay);
            const weight = Math.round(400 + 500 * e); // 可变字重连续插值
            const stroke = 6 * e; // 笔画再撑一圈
            const tint = b >= 0 && ACCENTS.has(b) ? Math.min(1, e * 1.3) : 0;
            const col = `rgb(${[238, 240, 246].map((c, k) => Math.round(c + (ACCENT[k] - c) * tint)).join(',')})`;
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
                {/* 占位：常规字重撑出槽宽，脉冲时整行不重排 */}
                <span style={{ visibility: 'hidden', fontWeight: 400 }}>{ch}</span>
                <span style={{
                  position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
                  fontWeight: weight, color: e > 0 ? col : INK,
                  WebkitTextStroke: stroke > 0.05 ? `${stroke.toFixed(2)}px ${col}` : undefined,
                  textShadow: e > 0.05 ? `0 0 ${(30 * e).toFixed(1)}px rgba(${ACCENT.join(',')},${(0.35 * e).toFixed(3)})` : 'none',
                }}>
                  {ch}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* 底部节拍点：命中哪拍哪个点亮起放大；已过的拍保留暗亮，读出"走到第几拍" */}
      <div style={{
        position: 'absolute', left: 0, top: 800, width: 1920,
        display: 'flex', justifyContent: 'center', gap: 44, alignItems: 'center',
      }}>
        {BEATS.map((b, i) => {
          const e = envAt(frame, b);
          const passed = frame >= b;
          const big = ACCENTS.has(i);
          const sz = big ? 22 : 16;
          return (
            <div key={i} style={{
              width: sz, height: sz, borderRadius: sz / 2, position: 'relative',
              background: 'rgba(255,255,255,0.10)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
              transform: `scale(${(1 + 0.7 * e).toFixed(3)})`,
            }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: sz / 2,
                background: e > 0.02 ? `rgb(${ACCENT.join(',')})` : INK,
                opacity: e > 0.02 ? 1 : passed ? 0.32 : 0,
                boxShadow: e > 0.02 ? `0 0 ${(22 * e).toFixed(1)}px rgba(${ACCENT.join(',')},0.8)` : 'none',
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
