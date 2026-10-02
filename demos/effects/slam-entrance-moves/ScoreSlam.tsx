// 比分砸落入场（score-slam）——ESPN 比分弹窗 slam。
// KPI 卡从 scale 2.5 / rotate 5° / y-80 高空加速砸落屏心，落点帧同时触发
// 三件套：冲击波圆环扩散消散、8 块碎屑 seeded 抛物线飞散、
// 整画面震屏指数衰减。砸落带 3% 压缩过冲回弹落定。
// 关键帧：0–8 环境 hold → 8–14 砸落（Easing.in(quad)，scale 2.5→0.97，
// rotate 5→0，y -80→0）→ 14 落点帧触发环/尘/震 → 14–22 过冲回弹 0.97→1 →
// 14–28 圆环 60→860px 直径 → 14–30 碎屑飞散 → 14–19 震屏 18px 衰减
// → 30–135 全静止（≥45f，无逐帧噪声层）。
//
// 质感升级：去掉调试标题；背景虚化 dashboard 随砸落压暗一层 scrim（聚光到 KPI 卡）；
// 卡片换成出版级 KPI 面板（发丝线 + 内高光 + 随高度变化的两层阴影、系统字体 tabular 数字、
// 增长 chip + 迷你柱状 sparkline），高空段按"离镜头距离"给景深虚化，落地即清；
// 圆环从 6px 实黑线改成白色细亮环 + 柔辉两层，越扩越细；黑方块尘点改成带翻转与投影的
// 浅色碎屑 + 一圈拉长的细火花；震屏偏竖向（自上而下砸）。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';
import { FONT, Grain, Vignette, innerHighlight } from '../../_fixtures/Polish';

export const SCORE_SLAM_DURATION = 135; // 30f 动作与余波 + 105f 静止 hold

// 库规伪随机
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const IMPACT = 14; // 落点帧
const CX = 960;
const CY = 540;
const CARD_W = 580;
const CARD_H = 300;

// 迷你柱状 sparkline（确定性）：最后一根是本季，强调色
const BARS = Array.from({ length: 9 }, (_, i) => 0.2 + 0.55 * (i / 8) ** 1.6 + 0.12 * h(i + 5));

// 碎屑（8 块）与火花（12 条）
const DEBRIS = Array.from({ length: 8 }, (_, i) => ({
  ang: (i / 8) * Math.PI * 2 + (h(i + 3) - 0.5) * 0.7,
  dist: 160 + h(i + 11) * 160, // 160–320px
  size: 18 + h(i + 23) * 12, // 18–30px
  spin: (h(i + 31) - 0.5) * 540,
  ratio: 0.55 + h(i + 41) * 0.45,
}));
const SPARKS = Array.from({ length: 12 }, (_, i) => ({
  ang: (i / 12) * Math.PI * 2 + (h(i + 61) - 0.5) * 0.5,
  dist: 260 + h(i + 71) * 220,
  len: 26 + h(i + 81) * 30,
}));

export const ScoreSlam: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 卡片砸落：8–14 加速下砸到 0.97（压缩过冲），14–22 回弹到 1 ——
  const slamScale =
    frame < IMPACT
      ? interpolate(frame, [8, IMPACT], [2.5, 0.97], { ...CLAMP, easing: Easing.in(Easing.quad) })
      : interpolate(frame, [IMPACT, 22], [0.97, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const slamRot = interpolate(frame, [8, IMPACT], [5, 0], { ...CLAMP, easing: Easing.in(Easing.quad) });
  const slamY = interpolate(frame, [8, IMPACT], [-80, 0], { ...CLAMP, easing: Easing.in(Easing.quad) });
  const cardOp = interpolate(frame, [8, 11], [0, 1], CLAMP);
  // 离镜头越近越虚（景深），落地清晰；阴影随高度：高处大而淡，落地小而实
  const height01 = interpolate(slamScale, [1, 2.5], [0, 1], CLAMP);
  const dof = height01 * 5;
  const cardShadow =
    `${innerHighlight(0.9)}, ` +
    `0 ${(1 + height01 * 10).toFixed(2)}px ${(3 + height01 * 16).toFixed(2)}px rgba(12,14,22,${(0.14 - height01 * 0.08).toFixed(3)}), ` +
    `0 ${(18 + height01 * 70).toFixed(2)}px ${(44 + height01 * 120).toFixed(2)}px -14px rgba(12,14,22,${(0.34 - height01 * 0.12).toFixed(3)})`;

  // —— 背景 scrim：砸落途中压暗，把视线收到卡上 ——
  const scrim = interpolate(frame, [6, IMPACT], [0, 1], { ...CLAMP, easing: Easing.out(Easing.quad) });

  // —— 震屏：落点帧起 5f，18px 指数衰减，偏竖向，19f 后严格归零 ——
  let shakeX = 0;
  let shakeY = 0;
  if (frame >= IMPACT && frame < IMPACT + 5) {
    const t = frame - IMPACT;
    const amp = 18 * Math.exp(-t * 0.9);
    shakeX = amp * 0.45 * (h(frame * 7 + 1) * 2 - 1);
    shakeY = amp * (t === 0 ? 1 : h(frame * 13 + 2) * 2 - 1); // 第一帧向下砸
  }

  // —— 冲击波圆环：14f 内直径 60→860；扩散 out-cubic，不透明度走线性帧时间（解耦）——
  const ringT = interpolate(frame, [IMPACT, IMPACT + 14], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const ringD = interpolate(ringT, [0, 1], [60, 860]);
  const ringTLin = interpolate(frame, [IMPACT, IMPACT + 14], [0, 1], CLAMP);
  const ringOp = interpolate(ringTLin, [0, 0.65, 1], [0.95, 0.6, 0]);
  const ringW = interpolate(ringT, [0, 1], [7, 1.4]); // 越扩越细
  const ringOn = frame >= IMPACT && frame < IMPACT + 14;

  // —— 碎屑：seeded 角度抛物线飞散，16f 减速缩小消失；火花更快更远、10f 内灭 ——
  const dustT = interpolate(frame, [IMPACT, IMPACT + 16], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const dustTLin = interpolate(frame, [IMPACT, IMPACT + 16], [0, 1], CLAMP);
  const dustOn = frame >= IMPACT && frame < IMPACT + 16;
  const sparkT = interpolate(frame, [IMPACT, IMPACT + 10], [0, 1], { ...CLAMP, easing: Easing.out(Easing.poly(4)) });
  const sparkLin = interpolate(frame, [IMPACT, IMPACT + 10], [0, 1], CLAMP);
  const sparkOn = frame >= IMPACT && frame < IMPACT + 10;

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      {/* 震屏容器：整画面一起抖（四周多留 40px，抖动不露边） */}
      <div style={{ position: 'absolute', inset: -40, transform: `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px)` }}>
        <div style={{ position: 'absolute', inset: 40 }}>
          {/* 虚化 dashboard 环境底 + 砸落时压暗的 scrim */}
          <div style={{ position: 'absolute', left: 0, top: 0, filter: 'blur(9px)', transform: 'scale(1.06)', transformOrigin: '50% 50%' }}>
            <FakeDashboard variant="B" />
          </div>
          <div
            style={{
              position: 'absolute',
              inset: -40,
              background: `radial-gradient(ellipse 60% 60% at 50% 50%, rgba(18,20,28,${(0.18 * scrim).toFixed(3)}) 0%, rgba(14,15,22,${(0.46 * scrim).toFixed(3)}) 100%)`,
            }}
          />

          {/* ② 碎屑：浅色卡片碎片，翻转（scaleY=|cos|）+ 自旋 + 小投影 */}
          {dustOn &&
            DEBRIS.map((d, i) => {
              const dx = Math.cos(d.ang) * d.dist * dustT;
              const dy = Math.sin(d.ang) * d.dist * dustT + 90 * dustT * dustT; // 先飞出再下坠
              const s = d.size * (1 - 0.75 * dustTLin);
              const op = interpolate(dustTLin, [0, 0.75, 1], [1, 0.8, 0]);
              const flip = Math.abs(Math.cos(dustTLin * Math.PI * 1.5 + i));
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: CX + dx - s / 2,
                    top: CY + CARD_H / 2 - 20 + dy - (s * d.ratio) / 2,
                    width: s,
                    height: s * d.ratio,
                    borderRadius: 3,
                    background: flip > 0.5 ? '#fbfbfa' : '#d9dade',
                    boxShadow: '0 0 0 1px rgba(20,22,28,0.08), 0 4px 10px -2px rgba(10,12,20,0.35)',
                    opacity: op,
                    transform: `rotate(${(d.spin * dustT).toFixed(2)}deg) scaleY(${Math.max(0.15, flip).toFixed(3)})`,
                  }}
                />
              );
            })}

          {/* 火花：沿径向拉长的细亮线，越飞越短 */}
          {sparkOn &&
            SPARKS.map((s, i) => {
              const r = 70 + s.dist * sparkT;
              const len = s.len * (1 - sparkLin) + 4;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: CX + Math.cos(s.ang) * r - len / 2,
                    top: CY + Math.sin(s.ang) * r - 1.5,
                    width: len,
                    height: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, rgba(255,255,255,0), #ffffff)',
                    transform: `rotate(${((s.ang * 180) / Math.PI).toFixed(2)}deg)`,
                    opacity: 1 - sparkLin,
                    boxShadow: '0 0 6px rgba(255,255,255,0.6)',
                  }}
                />
              );
            })}

          {/* ① 冲击波圆环：柔辉 + 细亮环 */}
          {ringOn && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: CX - ringD / 2,
                  top: CY - ringD / 2,
                  width: ringD,
                  height: ringD,
                  borderRadius: '50%',
                  boxShadow: `0 0 ${(18 + ringT * 30).toFixed(1)}px ${(4 + ringT * 6).toFixed(1)}px rgba(255,255,255,0.35), inset 0 0 ${(18 + ringT * 30).toFixed(1)}px rgba(255,255,255,0.25)`,
                  opacity: ringOp,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: CX - ringD / 2,
                  top: CY - ringD / 2,
                  width: ringD,
                  height: ringD,
                  borderRadius: '50%',
                  border: `${ringW.toFixed(2)}px solid rgba(255,255,255,0.95)`,
                  boxSizing: 'border-box',
                  opacity: ringOp,
                }}
              />
            </>
          )}

          {/* KPI 卡本体 */}
          {frame >= 8 && (
            <div
              style={{
                position: 'absolute',
                left: CX - CARD_W / 2,
                top: CY - CARD_H / 2,
                width: CARD_W,
                height: CARD_H,
                boxSizing: 'border-box',
                padding: '28px 34px 24px',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)',
                border: `1px solid ${G.hairline}`,
                borderRadius: 22,
                boxShadow: cardShadow,
                fontFamily: FONT.sans,
                color: G.ink1,
                opacity: cardOp,
                transform: `translateY(${slamY.toFixed(2)}px) rotate(${slamRot.toFixed(3)}deg) scale(${slamScale.toFixed(4)})`,
                transformOrigin: '50% 50%',
                filter: dof > 0.3 ? `blur(${dof.toFixed(2)}px)` : undefined,
              }}
            >
              {/* 顶行：图标 + 指标名 + 时间 chip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: G.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke={G.accent} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12.5 6 8.5l2.5 2.5L14 5" />
                    <path d="M10 5h4v4" />
                  </svg>
                </div>
                <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>Revenue growth</div>
                <div style={{ marginLeft: 'auto', padding: '5px 11px', borderRadius: 999, background: G.fill, border: `1px solid ${G.hairline}`, fontSize: 14, fontWeight: 500, color: G.ink2 }}>
                  Q3 2026
                </div>
              </div>
              {/* 大数字 + 增长 chip */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: 22 }}>
                <div style={{ fontSize: 108, fontWeight: 750, letterSpacing: '-0.045em', lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>
                  +247<span style={{ fontWeight: 600, color: G.ink2 }}>%</span>
                </div>
                {/* 迷你柱状 sparkline：本季最高、强调色 */}
                <svg width={116} height={70} style={{ marginLeft: 'auto', display: 'block', flex: 'none', marginBottom: 4 }}>
                  {BARS.map((v, i) => (
                    <rect key={i} x={i * 13.4} y={70 - v * 70} width={9} height={v * 70} rx={2.5} fill={i === BARS.length - 1 ? G.accent : '#dcdde1'} />
                  ))}
                </svg>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${G.hairline}`, gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: G.ink3, letterSpacing: '0.12em' }}>QUARTERLY GROWTH</div>
                <div style={{ marginLeft: 'auto', fontSize: 15, color: G.ink3, fontVariantNumeric: 'tabular-nums' }}>vs. Q2 · $1.84M</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Vignette strength={0.28} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
