// 套印节拍泵（riso-beat-pump）——beat-punch-in（卡点顿推）× riso-misregistration-hit
// （套印错位）的组合节奏。节拍帧 [30,54,78,102]（每 24f 一拍），每命中帧：
// ① 整画面 scale 一帧瞬跳 1.08（无渐入），14f 内按 exp(-t/3) 指数衰减回 1；
// ② 标题裂成 朱红专色版 / 深墨版 双色印版 multiply 错位，初始错位逐拍加码 4/7/11/16px
//    （每版反向 → 总分离 8/14/22/32px），12f 衰减余弦震荡收敛套准；
// ③ 底部对应节拍刻度圈闪深（8f 缩放脉冲 1.8→1）并常驻实心。
// 结构：0–29f hold；30–115f 四拍；116–139f 真静止（纸纤维与油墨颗粒都是静态纹理）。
// 版面是一张双色 riso 海报：纸面 + 套准十字 + 版记，标题下一排三张印刷鼓件卡（半调网点图形）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FONT, Grain, Vignette, tracking } from '../../_fixtures/Polish';

export const RISO_BEAT_PUMP_DURATION = 140;

const HITS = [30, 54, 78, 102]; // 节拍命中帧
const AMP = [4, 7, 11, 16]; // 每拍单版初始错位（px），逐拍加码
const PUMP_WIN = 14; // scale 泵窗口：14f 后精确归 1（保证结尾真静止）
const SPLIT_WIN = 12; // 错位窗口：12f 后精确归 0（余量 <0.4px，硬切套准）

const PAPER = '#f1ece2'; // riso 再生纸
const INK = '#1f1d22'; // 深墨版
const SPOT = '#e0492f'; // 朱红专色版（替代原浅灰版）
const INK_SOFT = 'rgba(31,29,34,0.62)';

// 单色印版：同字形可调色副本，multiply 叠到纸上
const Plate: React.FC<{ color: string; dx: number; dy: number }> = ({ color, dx, dy }) => (
  <div
    style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`, mixBlendMode: 'multiply',
    }}
  >
    <div
      style={{
        fontFamily: FONT.sans, fontWeight: 900, fontSize: 176, color, letterSpacing: '-0.028em', // 900 字重下 tracking() 的 −0.04em 会让字母粘连
        lineHeight: 1, whiteSpace: 'nowrap',
      }}
    >
      On the beat.
    </div>
  </div>
);

const RegMark: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <svg width={44} height={44} viewBox="0 0 44 44" style={{ position: 'absolute', left: x - 22, top: y - 22, mixBlendMode: 'multiply' }}>
    <g fill="none" stroke={INK} strokeWidth={1.4} opacity={0.7}>
      <circle cx={22} cy={22} r={10} />
      <path d="M22 2 V42 M2 22 H42" />
    </g>
  </svg>
);

// 半调网点：专色圆点阵，用作卡内图形的"印刷"填充
const halftone = (size: number) =>
  `radial-gradient(circle, ${SPOT} ${(size * 0.36).toFixed(1)}px, transparent ${(size * 0.36 + 0.8).toFixed(1)}px) 0 0 / ${size}px ${size}px`;

const TRACKS = [
  { no: '01', name: 'Kick', shape: 'circle' },
  { no: '02', name: 'Snare', shape: 'tri' },
  { no: '03', name: 'Hi-hat', shape: 'square' },
];

// 印刷鼓件卡：1.5px 墨线框 + 版号/名称 + 半调网点图形 + 墨线波形
const TrackCard: React.FC<{ i: number }> = ({ i }) => {
  const tr = TRACKS[i];
  const clip =
    tr.shape === 'circle' ? 'circle(50% at 50% 50%)' : tr.shape === 'tri' ? 'polygon(50% 4%, 96% 96%, 4% 96%)' : 'inset(6% round 10px)';
  const wave = Array.from({ length: 24 }, (_, k) => {
    const a = Math.abs(Math.sin(k * (0.9 + i * 0.37) + i)) * (k % (3 + i) === 0 ? 1 : 0.45);
    return `M${k * 7} ${20 - a * 16} V${20 + a * 16}`;
  }).join(' ');
  return (
    <div
      style={{
        position: 'relative', width: 340, height: 200, boxSizing: 'border-box', borderRadius: 14,
        border: `1.5px solid ${INK}`, mixBlendMode: 'multiply', padding: '22px 24px', fontFamily: FONT.mono, color: INK,
      }}
    >
      <div style={{ fontSize: 22, letterSpacing: '0.06em', color: INK_SOFT }}>{tr.no}</div>
      <div style={{ marginTop: 6, fontFamily: FONT.sans, fontSize: 40, fontWeight: 800, letterSpacing: tracking(40) }}>{tr.name}</div>
      <svg width={168} height={40} style={{ position: 'absolute', left: 24, bottom: 22 }}>
        <path d={wave} stroke={INK} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      </svg>
      <div style={{ position: 'absolute', right: 26, top: 40, width: 120, height: 120, background: halftone(9), clipPath: clip }} />
    </div>
  );
};

export const RisoBeatPump: React.FC = () => {
  const frame = useCurrentFrame();

  // 找最近一次已命中的节拍（24f 间隔 > 14f 窗口，永远只有一拍在作用）
  let beatIdx = -1;
  for (let i = 0; i < HITS.length; i++) {
    if (frame >= HITS[i]) beatIdx = i;
  }
  const t = beatIdx >= 0 ? frame - HITS[beatIdx] : Infinity;

  // ① 整画面泵：命中帧一帧到位 1.08（t=0 即满值，无渐入），指数衰减回 1
  const pump = t < PUMP_WIN ? 1 + 0.08 * Math.exp(-t / 3) : 1;

  // ② 标题错位：衰减余弦震荡（周期 6f 抖两下），窗口外精确 0 = 套准
  const split = t < SPLIT_WIN;
  const m = split ? Math.cos((2 * Math.PI * t) / 6) * Math.exp(-t / 3) : 0;
  const dx = beatIdx >= 0 ? AMP[beatIdx] * m : 0;
  const dy = dx * 0.45; // y 少量，更像没对准版

  return (
    <div style={{ width: 1920, height: 1080, background: PAPER, position: 'relative', overflow: 'hidden' }}>
      {/* 整画面容器：scale 泵作用在全部内容上（纸面一起被"顿推"） */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${pump})`, transformOrigin: 'center center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 70% at 50% 44%, #f6f2ea 0%, #f1ece2 60%, #e7e0d2 100%)' }} />
        <Grain opacity={0.1} step={100000} scale={2.4} freq={0.55} blend="multiply" />

        {/* 版面：套准十字 + 版记 */}
        <RegMark x={96} y={96} />
        <RegMark x={1824} y={96} />
        <RegMark x={96} y={984} />
        <RegMark x={1824} y={984} />
        <div style={{ position: 'absolute', left: 150, top: 82, fontFamily: FONT.mono, fontSize: 24, letterSpacing: '0.06em', color: INK_SOFT }}>
          SIDE A — 75 BPM
        </div>
        <div style={{ position: 'absolute', right: 150, top: 82, fontFamily: FONT.mono, fontSize: 24, letterSpacing: '0.06em', color: INK_SOFT }}>
          4 / 4
        </div>

        {/* 标题区：双版常驻，套准时两版归零重合，命中时反向错开 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 120, height: 420 }}>
          <Plate color={SPOT} dx={-dx} dy={dy} />
          <Plate color={INK} dx={dx} dy={-dy} />
        </div>

        {/* 底下一排 3 张印刷鼓件卡 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 590, display: 'flex', justifyContent: 'center', gap: 40 }}>
          {[0, 1, 2].map((i) => (
            <TrackCard key={i} i={i} />
          ))}
        </div>

        {/* 节拍刻度：命中即闪深（8f 缩放脉冲 1.8→1）并常驻实心；下方拍号 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 880, display: 'flex', justifyContent: 'center', gap: 72 }}>
          {HITS.map((hit, i) => {
            const d = frame - hit;
            const on = d >= 0;
            const s = on && d < 8 ? 1 + 0.8 * (1 - d / 8) : 1;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 26, height: 26, borderRadius: 13, boxSizing: 'border-box', transform: `scale(${s})`,
                    border: `2px solid ${on ? INK : 'rgba(31,29,34,0.35)'}`, background: on ? (d < 3 ? SPOT : INK) : 'transparent',
                    mixBlendMode: 'multiply',
                  }}
                />
                <div style={{ fontFamily: FONT.mono, fontSize: 22, color: on ? INK : 'rgba(31,29,34,0.4)', letterSpacing: '0.04em' }}>{i + 1}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 油墨颗粒（静态）+ 暖褐暗角：不随泵缩放，像镜头外的一层 */}
      <Grain opacity={0.16} step={100000} freq={1.25} blend="screen" />
      <Vignette strength={0.14} inner={0.55} color="#5a4a32" />
    </div>
  );
};
