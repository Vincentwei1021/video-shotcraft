// E 式急刹款 whip-brake——真实项目卡排成横向长廊，甩过 7 张卡后在目标卡（card4-hires 高清纹理）
// 前急刹、长尾滑入落位。适合落点是"要读内容"的镜头：长尾给视线一个追上的坡。
//
// 第二轮重设计（暖纸 · 索引长廊 + 机械计数器）：
// - look = paper（暖白纸 · 墨 · 朱红）。画面不再只是一排卡：左上角是**索引计数器**「Nº 02 / 10」，
//   150px 衬线数字是一只机械滚轮——位数跟着长廊位置连续滚动（个位按滚速竖向运动模糊、到 9 进位），
//   甩的时候数字飞转、急刹时越转越慢，最后"咔"地停在 09；运动和排版是同一条曲线。
// - 画面中线上一根固定的朱红"播放头"（顶部三角 + 发丝竖线），长廊底部一条随长廊走的刻度尺
//   （每卡一个大刻度 + 等宽序号，中间细刻度）：甩动时刻度糊成一片，急刹时播放头"卡"进第 09 格。
// - 速率：一条速度曲线 v(u) = V0·e^(−6u/60)·smoothstep(0,3,u) 积分而来——3f 起步、之后单调衰减
//   （前 70% 路程 ≈12f 糊段，后 30% 路程 48f 长尾），全程速度连续不回摆；按瞬时速度做方向性拖影。
// - 落定：目标卡抬起放大到 1.2×（高清纹理，字可读）、阴影变大变虚，两侧卡退到 45% 并轻微后缩；
//   播放头下方浮出该卡的分区名「Efficient Models」。
//
// 时间表（30fps，共 130f）：
//   0–24    起点 hold：第 02 张卡在播放头下，计数器 02
//   24–36   全速甩（糊段，峰值 ~300px/f，计数器飞转）
//   36–84   急刹长尾滑入第 09 格
//   80–98   目标卡抬起 1→1.2、邻卡退暗；分区名 88f 起升起
//   98–130  真静止 hold
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, FONT, ramp, mix, velocity, softShadow, SpeedBlur } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type, SERIF } from '../../_fixtures/Look';

export const WHIPBRAKE_DUR = 130;

const L = LOOKS.paper;
const cards = layout.projects.cards;
// 长廊顺序：目标卡 card4（高清）排在第 9 位，第 10 位是真实的下一张卡
const RAIL = [cards[0], cards[1], cards[2], cards[4], cards[5], cards[6], cards[7], cards[8], null, cards[9]];
const TARGET_I = 8;
const START_I = 1;
const CARD_W = 460;
const GAP = 64;
const PITCH = CARD_W + GAP;
const RAIL_Y = 318;
const CARD_H = 402; // 460 × 312/357
const LEFT0 = 960 - CARD_W / 2 - START_I * PITCH; // 起点：第 02 张卡居中
const END = (TARGET_I - START_I) * PITCH;
const T0 = 24;

// 速度曲线积分表（确定性预计算，步长 0.05f）：起步 3f smoothstep、之后 e^(−6u/60) 衰减
const STEP = 0.05;
const TABLE = (() => {
  const n = Math.round(60 / STEP);
  const vel = (u: number) => {
    const r = Math.min(1, u / 3);
    return Math.exp((-6 * u) / 60) * r * r * (3 - 2 * r);
  };
  const out = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) out[i] = out[i - 1] + ((vel((i - 1) * STEP) + vel(i * STEP)) / 2) * STEP;
  const total = out[n];
  for (let i = 0; i <= n; i++) out[i] /= total;
  return out;
})();
const progress = (u: number) => {
  if (u <= 0) return 0;
  if (u >= 60) return 1;
  const x = u / STEP;
  const i = Math.floor(x);
  return TABLE[i] + (TABLE[i + 1] - TABLE[i]) * (x - i);
};
const dxAt = (f: number) => END * progress(f - T0);
// 计数器值：播放头下的卡序号（连续，1-based）
const indexAt = (f: number) => START_I + 1 + dxAt(f) / PITCH;

// 机械滚轮的一位：竖向数字带，按转速竖向模糊
const DIGIT = 150;
const Wheel: React.FC<{ pos: number; speed: number }> = ({ pos, speed }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = ((pos % 10) + 10) % 10;
  const blur = Math.min(14, speed * DIGIT * 0.2);
  return (
    <span style={{
      display: 'inline-block', width: '0.6em', height: '1em', overflow: 'hidden', position: 'relative', verticalAlign: 'top',
      // 滚筒感：上下缘渐隐（数字从筒里转出来，而不是被硬框切掉）
      WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)',
      maskImage: 'linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)',
    }}>
      {blur > 0.3 && (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <filter id={`wb${id}`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} /></filter>
        </svg>
      )}
      <span style={{
        position: 'absolute', left: 0, top: 0, display: 'flex', flexDirection: 'column', lineHeight: 1,
        transform: `translateY(${(-p).toFixed(4)}em)`, filter: blur > 0.3 ? `url(#wb${id})` : undefined,
      }}>
        {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d, k) => <span key={k} style={{ height: '1em', textAlign: 'center' }}>{d}</span>)}
      </span>
    </span>
  );
};

export const WhipBrakeReal: React.FC = () => {
  const frame = useCurrentFrame();
  const dx = dxAt(frame);
  const v = velocity(dxAt, frame);

  // 计数器：个位连续滚，十位只在个位 9→0 时进位
  const idx = indexAt(frame);
  const ones = idx % 10;
  const tens = Math.floor(idx / 10) + Math.max(0, ones - 9);
  const iv = Math.abs(velocity(indexAt, frame));

  // 落定聚焦
  const lift = ramp(frame, 80, 18, EASE.out);
  const dim = ramp(frame, 82, 16, EASE.out);
  const label = ramp(frame, 88, 16, EASE.snappy);
  const targetScale = mix(1, 1.2, lift);

  const cardStyle = (k: number): React.CSSProperties => ({
    position: 'absolute', left: LEFT0 + k * PITCH, top: RAIL_Y, width: CARD_W, borderRadius: 12,
    boxShadow: softShadow(8, { color: L.shadow, strength: 0.9 }),
    opacity: k === TARGET_I ? 1 : 1 - 0.55 * dim,
    transform: k !== TARGET_I && dim > 0 ? `scale(${(1 - 0.04 * dim).toFixed(4)})` : undefined,
  });

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.25 }} fill={null} />

      {/* 长廊（世界）：卡片 + 刻度尺，整体按相机位移，按速度横向拖影 */}
      <SpeedBlur vx={-v} amount={0.085} max={64}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${(-dx).toFixed(2)}px)` }}>
          {RAIL.map((c, k) => (c ? (
            <Img key={c.file} src={staticFile(`textures/live/${c.file}`)} style={cardStyle(k)} />
          ) : (
            <Img key="target" src={staticFile('textures/live/card4-hires.png')} style={{
              ...cardStyle(k), top: RAIL_Y - 12 * lift, transform: lift > 0 ? `scale(${targetScale.toFixed(4)})` : undefined,
              boxShadow: softShadow(mix(8, 44, lift), { color: L.shadow, strength: 1.3 }), zIndex: 2,
            }} />
          )))}
          {/* 刻度尺：每卡一个大刻度 + 序号，中间 4 根细刻度 */}
          <svg width={LEFT0 + RAIL.length * PITCH + 400} height={200} style={{ position: 'absolute', left: 0, top: 812 }}>
            <line x1={LEFT0 - 300} x2={LEFT0 + RAIL.length * PITCH + 200} y1={0} y2={0} stroke={alpha(L.ink, 0.22)} strokeWidth={1.5} />
            {Array.from({ length: (RAIL.length + 1) * 5 + 6 }, (_, j) => {
              const x = LEFT0 + CARD_W / 2 + (j - 5) * (PITCH / 5);
              const major = j % 5 === 0;
              return <line key={j} x1={x} x2={x} y1={0} y2={major ? 26 : 12} stroke={alpha(L.ink, major ? 0.5 : 0.22)} strokeWidth={major ? 2 : 1.5} />;
            })}
          </svg>
          {RAIL.map((_, k) => (
            <div key={k} style={{
              position: 'absolute', left: LEFT0 + k * PITCH, width: CARD_W, top: 852, textAlign: 'center',
              fontFamily: FONT.mono, fontSize: 32, fontWeight: 500, color: k === TARGET_I ? L.ink : L.ink3,
              opacity: k === TARGET_I ? 1 : 1 - 0.5 * dim,
            }}>
              {String(k + 1).padStart(2, '0')}
            </div>
          ))}
        </div>
      </SpeedBlur>

      {/* 固定播放头：顶部朱红三角 + 发丝竖线（穿过刻度尺） */}
      <svg width={40} height={80} style={{ position: 'absolute', left: 940, top: 770 }}>
        <path d="M6 0 L34 0 L20 18 Z" fill={L.accent} />
        <line x1={20} x2={20} y1={16} y2={70} stroke={L.accent} strokeWidth={2} />
      </svg>
      {/* 落定后：播放头下浮出分区名 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 930, textAlign: 'center', ...type(32, 600, { caps: true }), letterSpacing: '0.16em',
        color: L.accent, opacity: label, transform: `translateY(${((1 - label) * 16).toFixed(2)}px)`,
      }}>
        Efficient Models
      </div>

      {/* 索引计数器 */}
      <div style={{ position: 'absolute', left: 120, top: 70 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...type(30, 600, { caps: true }), color: L.ink2, letterSpacing: '0.18em' }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: L.accent }} />Project index
        </div>
      </div>
      <div style={{ position: 'absolute', left: 1800, top: 64, transform: 'translateX(-100%)', display: 'flex', alignItems: 'flex-start', whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: SERIF, fontSize: 56, fontStyle: 'italic', color: L.ink3, marginRight: 18, marginTop: 30 }}>Nº</span>
        <span style={{ fontFamily: SERIF, fontSize: DIGIT, fontWeight: 600, color: L.ink, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', height: '1em' }}>
          <Wheel pos={tens} speed={0} />
          <Wheel pos={ones} speed={iv} />
        </span>
        <span style={{ fontFamily: SERIF, fontSize: 56, color: L.ink3, marginLeft: 16, marginTop: 84 }}>/ 10</span>
      </div>
    </AbsoluteFill>
  );
};
