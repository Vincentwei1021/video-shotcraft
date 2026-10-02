// 功能卡 3D 翻面揭示（card-flip-reveal）——Apple bento 翻转段。
// 横排 3 张功能卡逐张错峰沿 Y 轴翻 180°（perspective 1200px，双面结构
// backface-visibility hidden），背面揭出该功能的大号结论数字 + 一行标签。翻转先加速后
// 弹性落定（末端过冲 +12° 回 180°）；翻到侧棱（90°）附近闪过一道随角度
// 移动的加深灰高光带（白底用加深而非提亮）。
// 质感层：翻转中卡片离桌抬起（sin 包络放大 5%），地面影子不随卡旋转——宽度跟投影宽度
// |cos θ| 收放、抬起时变大变虚；背面标签比数字晚 4f 落定（跟随）。柔光背景 + 真实标题替换调试占位。
// 关键帧（卡 i 起点 = 18 + i*10，i = 0/1/2）：
//   0–18 hold → 卡0: 18–36 翻至 192° → 36–44 回弹落 180° →
//   卡1: 28–46–54，卡2: 38–56–64 → 64–145 三卡全静止（81f ≥ 40f）。
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';
import { bezier, ramp, mix, FONT, tracking, hairline, innerHighlight, Backdrop } from '../../_fixtures/Polish';

export const CARD_FLIP_REVEAL_DURATION = 145;

const CW = 440;
const CH = 300;
const GAP = 60;
const X0 = (1920 - (CW * 3 + GAP * 2)) / 2; // 240
const Y = (1080 - CH) / 2 + 40; // 430：给上方标题让出一点
const FLIP_START = 18;
const STAGGER = 10;
const FLIP_DUR = 18;
const SETTLE = 8;
const OVERSHOOT = 12; // 末端过冲角度（原案 8°，肉眼存疑加码到 12°）

const flipEase = bezier(0.55, 0, 0.3, 1);
const settleEase = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 5); // = Easing.out(poly(5))

// 正面 = 功能界面（Card seed），背面 = 它带来的结论（语义成对）
const RESULTS = [
  { seed: 1, topic: 'Active users', value: '4.9×', label: 'weekly actives since launch' },
  { seed: 2, topic: 'Top pages', value: '−38%', label: 'bounce on landing pages' },
  { seed: 5, topic: 'Deploys', value: '99.9%', label: 'deploy success rate' },
];

// 卡 i 在帧 f 的翻转角：0 → 192（先加速后减速）→ 180（弹性落定），帧确定
const angleAt = (f: number, i: number): number => {
  const s = FLIP_START + i * STAGGER;
  if (f < s + FLIP_DUR) return mix(0, 180 + OVERSHOOT, ramp(f, s, FLIP_DUR, flipEase));
  return mix(180 + OVERSHOOT, 180, ramp(f, s + FLIP_DUR, SETTLE, settleEase));
};

// 随角度移动的加深高光带：位置从卡左外扫到右外，强度在 90°（侧棱）达峰
const Sheen: React.FC<{ angle: number }> = ({ angle }) => {
  const pos = interpolate(angle, [35, 145], [-25, 115], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const op = Math.max(0, 1 - Math.abs(angle - 90) / 55);
  if (op <= 0.004) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 14,
        pointerEvents: 'none',
        opacity: op,
        background: `linear-gradient(105deg, rgba(16,18,26,0) ${pos - 14}%, rgba(16,18,26,0.32) ${pos}%, rgba(16,18,26,0) ${pos + 14}%)`,
      }}
    />
  );
};

const FlipCard: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const angle = angleAt(frame, i);
  const r = RESULTS[i];
  const s = FLIP_START + i * STAGGER;
  // 离桌抬起：0°/180° 贴桌，90° 最高（过冲段 sin<0 时按 0 处理）
  const lift = Math.max(0, Math.sin((Math.min(angle, 180) * Math.PI) / 180));
  const cardScale = 1 + 0.05 * lift;
  // 地面影子：宽度跟投影宽度，抬起越高越大越虚
  const projW = Math.max(0.06, Math.abs(Math.cos((angle * Math.PI) / 180)));
  // 背面标签：比数字晚 4f 起、12f 落定
  const labelP = ramp(frame, s + FLIP_DUR - 4, 14);
  return (
    <div style={{ position: 'absolute', left: X0 + i * (CW + GAP), top: Y, width: CW, height: CH }}>
      {/* 地面影子（不参与 3D 旋转）：近地接触影随抬起淡出，远地环境影随抬起变大变虚下移 */}
      <div style={{ position: 'absolute', inset: 0, transform: `scaleX(${projW.toFixed(4)})` }}>
        <div style={{
          position: 'absolute', left: 2, right: 2, top: 2, bottom: -1, borderRadius: 14,
          background: `rgba(16,18,26,${(0.16 * (1 - lift)).toFixed(3)})`, filter: 'blur(2px)',
        }} />
        <div style={{
          position: 'absolute', left: 14 + lift * 10, right: 14 + lift * 10, top: 10, bottom: 0, borderRadius: 18,
          background: `rgba(16,18,26,${(0.1 + lift * 0.06).toFixed(3)})`,
          filter: `blur(${(12 + lift * 26).toFixed(1)}px)`,
          transform: `translateY(${(8 + lift * 34).toFixed(1)}px)`,
        }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, perspective: 1200 }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: `scale(${cardScale.toFixed(4)}) rotateY(${angle.toFixed(3)}deg)`,
          }}
        >
          {/* 正面：功能卡 */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
            <Card w={CW} h={CH} seed={r.seed} style={{ boxShadow: innerHighlight(0.9) }} />
            <Sheen angle={angle} />
          </div>
          {/* 背面：结论卡（预先转 180°，翻满后正读） */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(180deg, #ffffff 0%, #fafaf8 100%)',
              border: hairline(0.09),
              borderRadius: 14,
              boxSizing: 'border-box',
              boxShadow: innerHighlight(0.95),
              padding: '28px 34px 30px',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: FONT.sans,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 9, height: 9, borderRadius: 5, background: G.accent }} />
              <div style={{ fontSize: 21, fontWeight: 550, color: G.ink2, letterSpacing: tracking(21) }}>{r.topic}</div>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <div style={{
                fontSize: 104, fontWeight: 700, color: G.ink1, letterSpacing: tracking(104), lineHeight: 0.96,
                fontVariantNumeric: 'tabular-nums',
              }}>{r.value}</div>
              <div style={{
                marginTop: 14, fontSize: 32, fontWeight: 500, color: G.ink2, letterSpacing: tracking(32), lineHeight: 1.1,
                whiteSpace: 'nowrap', opacity: labelP, transform: `translateY(${((1 - labelP) * 10).toFixed(2)}px)`,
              }}>{r.label}</div>
            </div>
            <Sheen angle={angle} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const CardFlipReveal: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.12 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 196, textAlign: 'center', fontFamily: FONT.sans }}>
        <div style={{ fontSize: 26, fontWeight: 600, color: G.accent, letterSpacing: tracking(26, true), textTransform: 'uppercase' }}>
          Launch results
        </div>
        <div style={{ marginTop: 14, fontSize: 60, fontWeight: 700, color: G.ink1, letterSpacing: tracking(60), lineHeight: 1.05 }}>
          Three features, three outcomes.
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <FlipCard key={i} i={i} frame={frame} />
      ))}
    </div>
  );
};
