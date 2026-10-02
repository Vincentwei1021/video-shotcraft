// 残像分身（smear-multiples）——smear frame 多重残像。
// 卡片高速横移时身后拖 4 个"可数"的半透明完整分身（各取当前帧减 k*2 帧
// 时刻的位置，同一条插值函数换帧号求值，天然帧确定），与运动模糊的连续糊
// 相区别。分身仅在本体速度 >25px/f 时可见（速度 = 相邻帧位置差）。
// 关键帧：0–17 左槽 hold → 17–25 预备回拉 14px → 25–37 横移 900px（inOut cubic，带 3% 过冲）→
// 35–38 分身延迟收缩至 0 合拢进本体 + opacity 归零 → 37–43 过冲回弹 → 43–90 全静止（47f）。
// 质感：按卡片 md 建议走"深底浅卡"——冷调深色柔光底让 0.09 那档分身也读得开；
// 两个槽位是内凹浅槽 + 列名（In review → Shipped），横移有了"从哪到哪"的语义，落位时目标列名亮起；
// 本体按离地高度给两层软阴影（起飞抬到 28、落位贴回 4），分身是去阴影的干净副本（叠影不发脏）；
// 发射前 8f 预备回拉（anticipation），落位后有完整 1.5s 呼吸。
import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Card } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, mix, ramp, softShadow, tracking } from '../../_fixtures/Polish';

export const SMEAR_MULTIPLES_DURATION = 90; // hold 17f + 预备 8f + 横移 12f + 回弹 6f + 真静止 47f

const X0 = 200; // 左槽卡片左边缘
const X1 = 1160; // 右槽卡片左边缘（横移 960px，两槽关于画面中线对称）
const OVER = 29; // 3% 过冲
const PRE = 14; // 预备回拉
const Y = 392; // 卡片顶边
const CW = 560;
const CH = 372;

const PRE_START = 17;
const LAUNCH = 25;
const ARRIVE = 37;
const SETTLE = 43;

// 本体位置：17–25 预备回拉，25–37 高速横移到过冲点，37–43 回弹落座，之后恒定 → 帧确定
const posAt = (f: number): number => {
  if (f < LAUNCH) {
    return X0 - PRE * ramp(f, PRE_START, LAUNCH - PRE_START, EASE.smooth);
  }
  if (f < ARRIVE) {
    return interpolate(f, [LAUNCH, ARRIVE], [X0 - PRE, X1 + OVER], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    });
  }
  return interpolate(f, [ARRIVE, SETTLE], [X1 + OVER, X1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
};

// 槽位：深底上的内凹浅槽 + 列名
const Slot: React.FC<{ x: number; label: string; count: string; lit: number }> = ({ x, label, count, lit }) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: x - 16,
        top: Y - 16,
        width: CW + 32,
        height: CH + 32,
        borderRadius: 24,
        background: 'rgba(255,255,255,0.025)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: x - 4,
        top: Y - 82,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontFamily: FONT.sans,
        fontSize: 32,
        fontWeight: 600,
        letterSpacing: tracking(32),
        color: `rgba(236,238,246,${mix(0.5, 0.92, lit).toFixed(3)})`,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          background: lit > 0 ? `rgba(124,132,240,${mix(0.35, 1, lit).toFixed(3)})` : 'rgba(255,255,255,0.22)',
          boxShadow: lit > 0 ? `0 0 ${(12 * lit).toFixed(1)}px rgba(124,132,240,${(0.6 * lit).toFixed(3)})` : undefined,
        }}
      />
      {label}
      <span
        style={{
          fontSize: 26,
          fontWeight: 500,
          color: 'rgba(236,238,246,0.42)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </span>
    </div>
  </>
);

export const SmearMultiples: React.FC = () => {
  const frame = useCurrentFrame();
  const bodyX = posAt(frame);
  // 本体速度 = 相邻帧位置差；>25px/f 才渲染分身
  const speed = Math.abs(posAt(frame) - posAt(frame - 1));
  const speedGate = interpolate(speed, [25, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // 落位合拢：35–38 三帧内分身延迟收缩到 0（位置滑向本体）+ 不透明度归零
  const cv = interpolate(frame, [35, 38], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const convergeFade = frame >= 35 ? 1 - cv : 0;

  const ghostOps = [0.45, 0.3, 0.18, 0.09];

  // 离地高度：发射抬起 28 → 落位 6f 内贴回 4（跟随主运动晚 2f 落定）
  const lift = ramp(frame, LAUNCH - 2, 6, EASE.out) * (1 - ramp(frame, ARRIVE, 8, EASE.out));
  const elev = 4 + 24 * lift;

  // 目标列名在本体落座时亮起（10f ease-out），计数 0 → 1
  const landed = ramp(frame, ARRIVE + 1, 10, EASE.out);
  const arrivedCount = frame >= ARRIVE + 1;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* 背景颗粒在落位贴回（51f）后冻结：尾段像素级真静止 */}
      <Freeze frame={ARRIVE + 14} active={frame >= ARRIVE + 14}>
        <Backdrop tone="dark" light={{ x: 0.5, y: 0.22 }} accent="#5b63d3" grain={0.08} vignette={0.55} />
      </Freeze>
      <Slot x={X0} label="In review" count={arrivedCount ? '2' : '3'} lit={0} />
      <Slot x={X1} label="Shipped" count={arrivedCount ? '6' : '5'} lit={landed} />
      {/* 4 个分身：第 k 个取 frame - k*2 帧时刻的位置；合拢期延迟×(1-cv) 收缩到 0 */}
      {ghostOps.map((baseOp, i) => {
        const k = i + 1;
        const gx = posAt(frame - k * 2 * (1 - cv));
        // 间距门限：与前一个副本相距 <36px 时淡出（起步段几个分身挤在原地会叠成乱码，"可数"失效）
        const prev = k === 1 ? bodyX : posAt(frame - (k - 1) * 2 * (1 - cv));
        const sepGate = interpolate(Math.abs(prev - gx), [36, 90], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const op = baseOp * Math.max(speedGate * sepGate, convergeFade);
        if (op <= 0.001) return null;
        return (
          <div key={k} style={{ position: 'absolute', left: gx, top: Y, opacity: op }}>
            <Card w={CW} h={CH} seed={5} style={{ boxShadow: 'none' }} />
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: bodyX, top: Y - 6 * lift }}>
        <Card
          w={CW}
          h={CH}
          seed={5}
          style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(elev, { color: '#000000', strength: 2.2 })}` }}
        />
      </div>
    </AbsoluteFill>
  );
};
