// versus-slam 对撞开屏：左右两个半屏（78° 斜切边）从画外加速对冲，沿斜缝砰地撞合；
// 撞击帧白闪 + 整机震屏指数衰减 + "VS" 圆章盖章压出，切点就是撞击本身，结尾静止 hold。
//
// 第二轮重设计（瑞士海报 · 对阵比较 "月结要多久"）：
// - look = paper（暖白纸 · 墨 · 朱红），粗黑体海报排版，不用 dashboard。两方 = 两张色块海报：
//   左「THE OLD WAY」墨黑底 + 纸白 340px「14 days」，右「WITH TALLO」朱红底 + 纸白「9 min」——
//   一墨一朱撞在一起，数字本身就是对比结论；说明文字 44px、清单 32px，都按"能读"排。
// - 建立段（0–18f）不是空屏：纸面上一行「How long does it take?」（124px，墨线在字带处留空），
//   斜缝位置一根墨线从中点向两端长出（预示撞线）；两半屏 ease-in(cubic) 10f 对冲，扫过时把设问吞掉。
// - 撞击三件套同帧起跑（28f）：纸白闪 0.85→0 共 3f、整机震屏 16px·e^(−t/1.7)、VS 圆章弹簧压出
//   （damping 12，一次可见过冲）；同帧再发一圈墨色冲击环 + 12 根放射速度线（6f 收）。
//   撞合后斜缝是一道 6px 纸白"切口"，两侧各压窄投影——像两张卡纸被压在一起。
// - 对冲按速度给横向运动模糊（末速 ~360px/帧，封顶 36px）；撞后两侧数字 1.04→1 回弹落座（晚 2f，跟随）。
//
// 时间表（30fps，共 105f）：
//   0–18    建立：设问逐词升起（1–14），斜缝墨线长出
//   18–28   对冲 10f（ease-in cubic：越来越快 = 砸）
//   28      撞击：闪 / 震 / 章 / 冲击环 / 速度线
//   30–44   数字回弹落座；36–60 两侧说明与清单错峰升起（左先右后，4f 错位）
//   54–70   底部结论条「Close the month before lunch.」从下升起，压在斜缝上
//   70–105  hold 35f：整机 1 → 1.015 极缓推进
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, SpeedBlur, mix, ramp, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const VERSUS_SLAM_DURATION = 105;

const P = LOOKS.paper;
const INK = P.ink;
const RED = P.accent;
const PAPER = '#f8f4ec';
const PAD = 120;
const RUSH = 18; // 对冲起
const IMPACT = 28; // 撞击帧

// 斜缝几何：78° 斜边 → 1080 高度上水平偏移 ≈ 230px，中线 x=960 ±115
const SEAM_TOP_X = 1075;
const SEAM_BOT_X = 845;
const SEAM_DEG = (Math.atan2(SEAM_TOP_X - SEAM_BOT_X, 1080) * 180) / Math.PI; // ≈ +12°
// 建立段墨线的留空带（线长 1400，从 y=−160 起；字在 y≈380–560 → 线内 39%–52%）
const SEAM_GAP = 'linear-gradient(180deg, #000 0%, #000 35%, transparent 37.5%, transparent 53%, #000 55.5%, #000 100%)';

// 两半屏对冲：ease-in cubic，10f 从 ±1240px 冲到位
const leftXAt = (f: number) => -1240 * (1 - Math.pow(ramp(f, RUSH, IMPACT - RUSH, EASE.linear), 3));

// 一侧海报
const Side: React.FC<{ side: 'L' | 'R'; f: number }> = ({ side, f }) => {
  const left = side === 'L';
  const fg = PAPER;
  const sub = left ? alpha(PAPER, 0.62) : alpha(INK, 0.82);
  const x0 = left ? PAD : 1190;
  // 撞后数字回弹落座（晚 2f 跟随）
  const settle = springAt(f, IMPACT + 2, { damping: 14, stiffness: 220 });
  const numScale = f < IMPACT ? 1 : mix(1.05, 1, settle);
  const d = left ? 0 : 4;
  const cap = ramp(f, IMPACT + 8 + d, 18, EASE.snappy);
  const list = ramp(f, IMPACT + 14 + d, 18, EASE.snappy);
  const items = left ? ['Export', 'Reconcile', 'Chase', 'Repeat'] : ['Feeds matched', 'Receipts read'];
  return (
    <>
      <div style={{ position: 'absolute', left: x0, top: 140, display: 'flex', alignItems: 'center', gap: 16, ...type(30, 800, { caps: true }), letterSpacing: '0.16em', color: left ? alpha(PAPER, 0.7) : INK }}>
        <span style={{ width: 16, height: 16, background: left ? alpha(PAPER, 0.7) : INK, borderRadius: left ? 0 : 8 }} />
        {left ? 'The old way' : 'With Tallo'}
      </div>
      <div style={{
        position: 'absolute', left: x0 - 14, top: 196, display: 'flex', alignItems: 'baseline', gap: 22,
        transform: `scale(${numScale.toFixed(4)})`, transformOrigin: 'left bottom',
      }}>
        <span style={{ fontFamily: FONT.sans, fontSize: 360, fontWeight: 900, letterSpacing: '-0.07em', lineHeight: 0.9, color: fg, fontVariantNumeric: 'tabular-nums' }}>
          {left ? '14' : '9'}
        </span>
        <span style={{ ...type(96, 800), color: fg }}>{left ? 'days' : 'min'}</span>
      </div>
      <div style={{ position: 'absolute', left: x0, top: 590, width: left ? 640 : 620, ...type(44, 600), lineHeight: 1.18, color: fg, opacity: cap, transform: `translateY(${(1 - cap) * 26}px)` }}>
        {left ? <>Spreadsheets, email threads and three people chasing paper.</> : <>The books close themselves while you sleep.</>}
      </div>
      <div style={{ position: 'absolute', left: x0, top: 800, display: 'flex', gap: 30, width: left ? 680 : 620, opacity: list, transform: `translateY(${(1 - list) * 20}px)` }}>
        {items.map((it, i) => (
          <span key={it} style={{ display: 'flex', alignItems: 'center', gap: 12, ...type(32, 600), color: sub }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 26, color: left ? alpha(PAPER, 0.4) : alpha(INK, 0.55) }}>{left ? `0${i + 1}` : '✓'}</span>
            <span style={{ textDecoration: left ? 'line-through' : undefined, textDecorationThickness: 2 }}>{it}</span>
          </span>
        ))}
      </div>
    </>
  );
};

export const VersusSlam: React.FC = () => {
  const frame = useCurrentFrame();
  const leftX = leftXAt(frame);
  const v = velocity(leftXAt, frame);
  const impacted = frame >= IMPACT;

  // 撞击帧起：整机震屏指数衰减（~5f 收干）
  const since = frame - IMPACT;
  const env = since >= 0 ? 16 * Math.exp(-since / 1.7) : 0;
  const shakeX = env * Math.sin(since * 3.3);
  const shakeY = env * 0.55 * Math.sin(since * 4.2 + 0.8);
  const push = 1 + 0.015 * ramp(frame, IMPACT + 10, 105 - IMPACT - 10, EASE.smooth);

  const flash = impacted ? 0.85 * (1 - ramp(frame, IMPACT, 3, EASE.linear)) : 0;
  const stamp = springAt(frame, IMPACT, { damping: 12, stiffness: 260 });
  const wave = ramp(frame, IMPACT, 16, EASE.out);
  const lines = ramp(frame, IMPACT, 7, EASE.out);

  // 建立段墨线：中点向两端长出，逼近时加粗
  const preGrow = ramp(frame, 2, 14, EASE.snappy);
  const preW = mix(2, 6, ramp(frame, RUSH, IMPACT - RUSH, EASE.exit));
  const verdict = ramp(frame, IMPACT + 26, 18, EASE.snappy);

  const half = (side: 'L' | 'R') => (
    <SpeedBlur vx={side === 'L' ? v : -v} amount={0.1} max={36}>
      <div style={{
        position: 'absolute', inset: 0, transform: `translateX(${(side === 'L' ? leftX : -leftX).toFixed(2)}px)`,
        clipPath: side === 'L'
          ? `polygon(0px 0px, ${SEAM_TOP_X}px 0px, ${SEAM_BOT_X}px 1080px, 0px 1080px)`
          : `polygon(${SEAM_TOP_X}px 0px, 1920px 0px, 1920px 1080px, ${SEAM_BOT_X}px 1080px)`,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: side === 'L'
            ? `radial-gradient(ellipse 70% 80% at 18% 10%, #2a231c 0%, ${INK} 60%, #0e0b08 100%)`
            : `radial-gradient(ellipse 70% 80% at 85% 10%, #f25a3f 0%, ${RED} 55%, #c9341f 100%)`,
        }} />
        <Side side={side} f={frame} />
      </div>
    </SpeedBlur>
  );

  return (
    <AbsoluteFill style={{ background: P.bg[1], overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px) scale(${push.toFixed(5)})` }}>
        {/* 建立段：纸面 + 设问 + 斜缝墨线 */}
        {!impacted && (
          <>
            <Stage look={P} keyLight={{ x: 0.5, y: 0.2 }} fill={null} vignette={0.14} grain={0} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 386, textAlign: 'center' }}>
              <div style={{ ...type(30, 800, { caps: true }), letterSpacing: '0.2em', color: RED, marginBottom: 30 }}>Month-end close</div>
              <div style={{ ...type(124, 880), color: INK }}>
                <TextReveal text="How long does it take?" by="word" variant="rise" start={1} each={14} gap={3} />
              </div>
            </div>
            <div style={{
              position: 'absolute', left: 960 - preW / 2, top: 540 - 700, width: preW, height: 1400, background: INK,
              transform: `rotate(${SEAM_DEG}deg) scaleY(${preGrow.toFixed(4)})`,
              // 设问那一带留空：墨线只在字的上下长出，不划过字
              WebkitMaskImage: SEAM_GAP, maskImage: SEAM_GAP,
            }} />
          </>
        )}

        {half('L')}
        {half('R')}

        {impacted && (
          <>
            {/* 撞合切口：纸白 6px + 两侧窄投影 */}
            <div style={{
              position: 'absolute', left: 960 - 22, top: 540 - 700, width: 44, height: 1400, transform: `rotate(${SEAM_DEG}deg)`,
              background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(10,6,4,0.35) 38%, ${PAPER} 43%, ${PAPER} 57%, rgba(10,6,4,0.35) 62%, rgba(0,0,0,0) 100%)`,
            }} />
            {/* 冲击环 + 放射速度线（单次） */}
            {wave < 1 && (
              <div style={{
                position: 'absolute', left: 960 - mix(130, 640, wave), top: 540 - mix(130, 640, wave),
                width: mix(260, 1280, wave), height: mix(260, 1280, wave), borderRadius: '50%',
                border: `${mix(14, 1, wave).toFixed(2)}px solid ${alpha(PAPER, 0.85 * (1 - wave))}`,
              }} />
            )}
            {lines < 1 && (
              <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
                {Array.from({ length: 12 }, (_, i) => {
                  const a = (i / 12) * Math.PI * 2 + 0.26;
                  const r0 = mix(170, 420, lines);
                  const r1 = mix(260, 720, lines);
                  return (
                    <line key={i} x1={960 + Math.cos(a) * r0} y1={540 + Math.sin(a) * r0} x2={960 + Math.cos(a) * r1} y2={540 + Math.sin(a) * r1}
                      stroke={PAPER} strokeWidth={mix(8, 2, lines)} strokeLinecap="round" opacity={1 - lines} />
                  );
                })}
              </svg>
            )}
            {/* VS 圆章 */}
            <div style={{
              position: 'absolute', left: 960 - 130, top: 540 - 130, width: 260, height: 260, borderRadius: '50%',
              transform: `rotate(${(SEAM_DEG - 8 * (1 - stamp)).toFixed(3)}deg) scale(${mix(1.9, 1, stamp).toFixed(4)})`,
              opacity: Math.min(1, stamp * 4),
              background: PAPER, border: `8px solid ${INK}`, boxSizing: 'border-box',
              boxShadow: `0 4px 0 ${alpha(INK, 0.9)}, 0 30px 60px -12px rgba(10,6,4,0.6)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: `2px solid ${alpha(INK, 0.35)}` }} />
              <span style={{ fontFamily: FONT.sans, fontSize: 124, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.06em', color: INK, marginLeft: -10, marginTop: -4 }}>
                VS
              </span>
            </div>
            {/* 结论条 */}
            <div style={{
              position: 'absolute', left: 960, top: 930, transform: `translate(-50%, ${((1 - verdict) * 40).toFixed(2)}px)`, opacity: verdict,
              height: 84, padding: '0 44px', borderRadius: 42, background: PAPER, display: 'flex', alignItems: 'center', gap: 18, whiteSpace: 'nowrap',
              boxShadow: '0 20px 44px -14px rgba(10,6,4,0.55)', ...type(38, 800), color: INK,
            }}>
              <span style={{ width: 14, height: 14, borderRadius: 7, background: RED }} />
              Close the month before lunch.
            </div>
          </>
        )}
      </div>
      {/* 撞击白闪（不随震屏） */}
      <AbsoluteFill style={{ background: PAPER, opacity: flash, pointerEvents: 'none' }} />
      <Grain opacity={0.06} step={2} blend="overlay" />
    </AbsoluteFill>
  );
};
