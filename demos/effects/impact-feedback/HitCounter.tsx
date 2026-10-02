import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';
import { EASE, FONT, SpeedBlur, Vignette, Grain, bezier, mix, ramp, softShadow, innerHighlight, tracking } from '../../_fixtures/Polish';

// hit-counter 连招计数：三张功能卡接连砸入槽位，每次命中 = 全局顿帧 2f
// + 落点伤害数字上浮渐隐 + 右上角 ×N 计数跳字（脉冲/倾斜逐次加码）。
// 组合：hitstop + damage-number-pop + combo-counter。
// 质感：凹陷槽位 + 随离地高度变化的两层投影 + 下落段竖向运动模糊与拉伸，
// 触地 = 压扁回弹 + 冲击描边环 + 两侧碎屑线；顿帧期间只有闪白用真实帧驱动。

// —— 时间结构（动画时间 t 空间）——
// 0–19 建立 hold；卡 i 于 t = HIT-10 → HIT ease-in 砸落；HIT = 30/60/90；
// 每命中后真实帧多出 2f 顿帧，末卡效果收完后（~110）静止 hold 到 150。
export const HIT_COUNTER_DURATION = 150;
const HITS_T = [30, 60, 90]; // 命中时刻（重映射后的动画时间）
const STOP = 2; // 每次顿帧帧数
// 真实命中帧 = 动画命中时刻 + 前面累计的顿帧
const HITS_REAL = HITS_T.map((h, i) => h + i * STOP);

const SLOT_W = 440;
const SLOT_H = 300;
const SLOT_Y = 430;
const SLOT_XS = [460, 960, 1460].map((cx) => cx - SLOT_W / 2); // 以画面中线对称排布
const DROP_FROM = -520;
const inQuad = bezier(0.55, 0.085, 0.68, 0.53); // md：命中前 10f ease-in(quad) 砸落

const DMG_TEXT = ['+1.2k', '+2.4k', '+4.8k'];
const PULSE = [1.3, 1.45, 1.6]; // 计数器脉冲峰值，逐次递增
const TILT = [-2, -4, -6]; // 计数器倾斜，逐次递增并保持
// 逐击升温：墨 → 靛（主强调色）→ 暖橙（唯一辅助色），伤害数字与计数器同步
const HEAT = [G.ink1, G.accent, '#f0643c'];
const HEAT_SOFT = ['rgba(23,24,28,0.16)', 'rgba(91,99,211,0.30)', 'rgba(240,100,60,0.36)'];

const FEATURES = [
  { icon: 'sync', name: 'Realtime sync', desc: 'Edits land on every device in 40 ms', stat: '1.2k teams', spark: [3, 4, 4, 6, 5, 7, 9] },
  { icon: 'bolt', name: 'Edge cache', desc: 'Static pages served from 280 cities', stat: '2.4k sites', spark: [2, 3, 5, 4, 6, 8, 9] },
  { icon: 'spark', name: 'AI summaries', desc: 'Every thread distilled to three lines', stat: '4.8k docs', spark: [1, 2, 2, 4, 6, 7, 10] },
];

// 内联图标（1.6px 描边，与 fixture 图标同族）
const Icon: React.FC<{ name: string; color: string }> = ({ name, color }) => {
  const sw = { fill: 'none', stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={26} height={26} viewBox="0 0 24 24">
      {name === 'sync' && (
        <>
          <path d="M20 11a8 8 0 0 0-14.3-4.6L4 8" {...sw} />
          <path d="M4 4v4h4" {...sw} />
          <path d="M4 13a8 8 0 0 0 14.3 4.6L20 16" {...sw} />
          <path d="M20 20v-4h-4" {...sw} />
        </>
      )}
      {name === 'bolt' && <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" {...sw} />}
      {name === 'spark' && (
        <>
          <path d="M12 3l1.9 5.6L19.5 10.5 13.9 12.4 12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" {...sw} />
          <path d="M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z" {...sw} />
        </>
      )}
    </svg>
  );
};

// 功能卡：出版级假内容（图标 tile + New chip + 名称 + 一句话 + 采用量 sparkline）
const FeatureCard: React.FC<{ i: number; elev: number }> = ({ i, elev }) => {
  const f = FEATURES[i];
  const max = Math.max(...f.spark);
  const pts = f.spark.map((v, k) => `${(k / (f.spark.length - 1)) * 120},${34 - (v / max) * 30}`).join(' ');
  return (
    <div
      style={{
        width: SLOT_W, height: SLOT_H, boxSizing: 'border-box', borderRadius: 20, padding: '30px 32px 28px',
        background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)', border: `1px solid ${G.hairline}`,
        boxShadow: `${innerHighlight(0.9)}, ${softShadow(elev)}`,
        display: 'flex', flexDirection: 'column', fontFamily: FONT.sans, color: G.ink1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            width: 52, height: 52, borderRadius: 14, background: G.accentSoft, display: 'flex',
            alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(91,99,211,0.14)',
          }}
        >
          <Icon name={f.icon} color={G.accent} />
        </div>
        <div
          style={{
            marginLeft: 'auto', padding: '6px 12px', borderRadius: 999, fontSize: 15, fontWeight: 600,
            color: G.ink2, background: G.fill, boxShadow: `inset 0 0 0 1px ${G.hairline}`, letterSpacing: '0.01em',
          }}
        >
          New
        </div>
      </div>
      <div style={{ marginTop: 26, fontSize: 36, fontWeight: 650, letterSpacing: tracking(36), lineHeight: 1.05 }}>{f.name}</div>
      <div style={{ marginTop: 10, fontSize: 19, color: G.ink2, lineHeight: 1.35, letterSpacing: '-0.005em' }}>{f.desc}</div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', paddingTop: 16, borderTop: `1px solid ${G.hairline}` }}>
        <div style={{ fontSize: 17, color: G.ink3 }}>
          Adopted by <span style={{ color: G.ink1, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{f.stat}</span>
        </div>
        <svg width={120} height={36} style={{ marginLeft: 'auto', overflow: 'visible' }}>
          <polyline points={pts} fill="none" stroke={G.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={120} cy={34 - 30} r={3.5} fill={G.accent} />
        </svg>
      </div>
    </div>
  );
};

// 卡的下落位置（动画时间 t 的函数，给 velocity 求速度）
const dropY = (t: number, hit: number) => mix(DROP_FROM, SLOT_Y, ramp(t, hit - 10, 10, inQuad));

export const HitCounter: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 全局帧 remap：每个真实命中帧起冻结 2f（全画面顿帧）——
  const remap = (fr: number) => {
    let t = fr;
    for (const h of HITS_REAL) t -= Math.min(Math.max(fr - h, 0), STOP);
    return t;
  };
  const t = remap(frame);

  const count = HITS_T.filter((h) => t >= h).length; // 当前连击数

  // —— 计数器（右上角 ×N）——
  let counterScale = 1;
  let counterRot = 0;
  let counterSize = 84;
  if (count > 0) {
    const i = count - 1;
    const since = t - HITS_T[i];
    counterScale = 1 + (PULSE[i] - 1) * Math.exp(-since / 2.4); // 脉冲后指数回落
    counterRot = TILT[i]; // 倾斜保持，越打越斜
    counterSize = 84 + i * 14; // 字号逐次加大
  }
  // 跳字：换数字的同一帧数字向上蹦 0.14em 再 6f 落回（与脉冲同源，顿帧期间停在最高点）
  const stamp = count > 0 ? 1 - ramp(t, HITS_T[count - 1], 6, EASE.out) : 0;
  const heat = count > 0 ? HEAT[count - 1] : '#2a2c33';
  const heatSoft = count > 0 ? HEAT_SOFT[count - 1] : 'rgba(0,0,0,0)';

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden', fontFamily: FONT.sans }}>
      {/* 背景 dashboard：失焦 + 暖灰 scrim 退到远景，突出前景连招 */}
      <div style={{ position: 'absolute', inset: -30, filter: 'blur(9px) saturate(0.85)' }}>
        <div style={{ position: 'absolute', left: 30, top: 30 }}>
          <FakeDashboard variant="B" />
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(240,240,237,0.78) 0%, rgba(236,236,233,0.86) 100%)' }} />
      <Vignette strength={0.18} inner={0.5} color="#2a2c36" />

      {/* 三个凹陷槽位（全程可见，建立期先立预期）：内阴影 + 1px 虚线发丝描边 */}
      {SLOT_XS.map((x, i) => {
        // 卡越接近，槽底的落影越实（离地高度 → 接触影）
        const near = ramp(t, HITS_T[i] - 10, 10, inQuad);
        return (
          <div key={`slot-${i}`}>
            <div
              style={{
                position: 'absolute', left: x, top: SLOT_Y, width: SLOT_W, height: SLOT_H, borderRadius: 20,
                boxSizing: 'border-box', border: '1.5px dashed rgba(20,22,28,0.16)',
                background: 'rgba(20,22,28,0.035)', boxShadow: 'inset 0 2px 6px rgba(16,18,24,0.07), 0 1px 0 rgba(255,255,255,0.7)',
              }}
            />
            {near > 0 && t < HITS_T[i] && (
              <div
                style={{
                  position: 'absolute', left: x + 30 - (1 - near) * 30, top: SLOT_Y + 40, width: SLOT_W - 60 + (1 - near) * 60,
                  height: SLOT_H - 40, borderRadius: 24, background: 'rgba(16,18,24,0.5)',
                  filter: `blur(${mix(40, 14, near).toFixed(1)}px)`, opacity: mix(0.05, 0.4, near),
                }}
              />
            )}
          </div>
        );
      })}

      {/* 三张功能卡：各隔 30f，命中前 10f ease-in 加速砸落 */}
      {HITS_T.map((hit, i) => {
        if (t < hit - 10) return null;
        const y = dropY(t, hit);
        const vy = t < hit ? dropY(t + 0.5, hit) - dropY(t - 0.5, hit) : 0; // 顿帧期间 t 不变 → 速度归零
        const speed = Math.min(1, vy / 190);
        const s = t - hit;
        // 下落拉伸（随速度）→ 触地压扁（指数回落，顿帧期间停在最扁处）
        const squash = s >= 0 ? 0.06 * Math.exp(-s / 1.5) : 0;
        const sy = 1 + speed * 0.05 - squash;
        const sx = 1 - speed * 0.02 + squash * 0.5;
        const elev = s >= 0 ? 4 : mix(4, 56, (SLOT_Y - y) / (SLOT_Y - DROP_FROM));
        // 闪白：命中真实帧起的 2f 顿帧亮、再 3f 退（真实帧驱动——冻结期间也要发生）
        const df = frame - HITS_REAL[i];
        const flash = df >= 0 && df < STOP + 3 ? (df < STOP ? 0.55 : 0.55 * (1 - (df - STOP + 1) / 4)) : 0;
        return (
          <SpeedBlur key={`card-${i}`} vx={0} vy={vy} amount={0.11} max={22}>
            <div
              style={{
                position: 'absolute', left: SLOT_XS[i], top: y,
                transform: `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`, transformOrigin: 'bottom center',
              }}
            >
              <FeatureCard i={i} elev={elev} />
              {flash > 0 && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: '#ffffff', opacity: flash }} />
              )}
            </div>
          </SpeedBlur>
        );
      })}

      {/* 触地冲击：描边环外扩 + 两侧碎屑线（动画时间驱动，顿帧期间一起冻住） */}
      {HITS_T.map((hit, i) => {
        const s = t - hit;
        if (s < 0 || s > 14) return null;
        const ring = ramp(t, hit, 12, EASE.out);
        const grow = mix(0, 34, ring);
        const debris = ramp(t, hit, 10, EASE.snappy);
        const x0 = SLOT_XS[i];
        const bottom = SLOT_Y + SLOT_H;
        return (
          <React.Fragment key={`fx-${i}`}>
            <div
              style={{
                position: 'absolute', left: x0 - grow, top: SLOT_Y - grow * 0.6, width: SLOT_W + grow * 2, height: SLOT_H + grow * 1.6,
                borderRadius: 20 + grow * 0.6, boxSizing: 'border-box', border: `${mix(3, 1, ring).toFixed(2)}px solid ${HEAT[i]}`,
                opacity: (1 - ring) * 0.55,
              }}
            />
            <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              {[-1, 1].flatMap((side) =>
                [0, 1, 2].map((k) => {
                  const ang = ((side < 0 ? 180 : 0) + side * -(12 + k * 16)) * (Math.PI / 180);
                  const ox = side < 0 ? x0 + 6 : x0 + SLOT_W - 6;
                  const r0 = mix(8, 60 + k * 14, debris);
                  const r1 = mix(20, 84 + k * 18, Math.min(1, debris * 1.25));
                  return (
                    <line
                      key={`${side}-${k}`}
                      x1={ox + Math.cos(ang) * r0} y1={bottom + Math.sin(ang) * r0}
                      x2={ox + Math.cos(ang) * r1} y2={bottom + Math.sin(ang) * r1}
                      stroke={HEAT[i]} strokeWidth={mix(4, 1.5, debris)} strokeLinecap="round"
                      opacity={Math.min(1, debris * 5) * (1 - debris) * 0.9}
                    />
                  );
                }),
              )}
            </svg>
          </React.Fragment>
        );
      })}

      {/* 伤害数字：命中帧起 scale 1.4→1、上浮 60px、12f 渐隐 */}
      {HITS_T.map((hit, i) => {
        const s = t - hit;
        if (s < 0 || s > 14) return null;
        const scale = mix(1.4, 1, ramp(t, hit, 5, EASE.snappy));
        const rise = mix(0, -60, ramp(t, hit, 12, EASE.out));
        const opacity = s < 4 ? 1 : 1 - ramp(t, hit + 4, 8, EASE.swift);
        return (
          <div
            key={`dmg-${i}`}
            style={{
              position: 'absolute', left: SLOT_XS[i] + SLOT_W / 2, top: SLOT_Y - 104 + rise,
              transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'center bottom', opacity,
              fontSize: 78, fontWeight: 800, letterSpacing: tracking(78), lineHeight: 1, color: HEAT[i],
              fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
              textShadow: `0 2px 0 rgba(255,255,255,0.9), 0 10px 26px ${HEAT_SOFT[i]}`,
            }}
          >
            {DMG_TEXT[i]}
          </div>
        );
      })}

      {/* 右上角连击计数器：跳字 + 递增脉冲 + 递增倾斜 */}
      <div
        style={{
          position: 'absolute', right: 140, top: 96,
          transform: `scale(${counterScale}) rotate(${counterRot}deg)`, transformOrigin: 'center center',
          opacity: count === 0 ? 0.42 : 1,
        }}
      >
        <div
          style={{
            position: 'relative', borderRadius: 22, padding: '14px 30px 18px', minWidth: 120,
            background: 'linear-gradient(180deg, #23242b 0%, #16171c 100%)',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(0,0,0,0.3), 0 18px 44px -10px ${heatSoft}, ${softShadow(18, { strength: 1.4 })}`,
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 650, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.5)' }}>COMBO</div>
          <div style={{ position: 'relative', height: counterSize * 1.02, overflow: 'hidden' }}>
            <div
              style={{
                transform: `translateY(${(-stamp * 0.14 * counterSize).toFixed(1)}px)`,
                fontSize: counterSize, fontWeight: 800, lineHeight: 1.02, letterSpacing: tracking(counterSize),
                fontVariantNumeric: 'tabular-nums', color: count === 0 ? 'rgba(255,255,255,0.7)' : '#fff', whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: count === 0 ? 'rgba(255,255,255,0.45)' : heat === G.ink1 ? 'rgba(255,255,255,0.6)' : heat }}>×</span>
              {count}
            </div>
          </div>
          {/* 逐击加码的热度条：底部 3px 色条，越打越满 */}
          <div style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${(count / 3) * 100}%`, background: count ? heat === G.ink1 ? 'rgba(255,255,255,0.55)' : heat : 'transparent' }} />
        </div>
      </div>

      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
