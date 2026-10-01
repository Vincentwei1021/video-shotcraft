import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';
import { EASE, FONT, Grain, mix, ramp, softShadow } from '../../_fixtures/Polish';

// 斜角滚正（dutch-roll-to-level）：呈现痛点时整帧带 -10° 斜角悬着（叠极缓慢
// 正弦漂移防止读作静态歪图），帧 70 解决方案的一拍整帧带单次过冲滚回水平
// （-10° → +1.2° → 0），同时警示条淡出、干净卡浮现——"世界被扶正"打在节拍上。
// 帧 0–70 斜置漂移（64–70 再蓄 0.6° 预备）/ 70–84 滚正冲过头 / 84–94 收回 0 / 94–150 真静止。
//
// 改版要点：警示条与解决卡换成真实内容的状态 toast（失败构建 → 全部通过），
// 出场 ease-in 上移、入场 snappy 上浮 + 图标过冲弹出 + 文字 2f 错峰；
// 斜置期叠一层暖色压暗暗角（不适感），扶正后随滚正一起散去（释然）。

export const DUTCH_ROLL_TO_LEVEL_DURATION = 150;

const ROLL = 70; // 滚正起拍
const LEVEL = 94; // 完全归位帧
const WIND = 6; // 滚正前的蓄力帧数（再往斜里压 0.6°）

const BANNER = { left: 560, top: 108, w: 800, h: 112 };

const AlertIcon: React.FC = () => (
  <svg width={40} height={40} viewBox="0 0 40 40">
    <circle cx={20} cy={20} r={19} fill="rgba(240,88,72,0.16)" />
    <path d="M20 10 L31 29 H9 Z" fill="none" stroke="#ff7a68" strokeWidth={2.6} strokeLinejoin="round" />
    <path d="M20 17 V22.5" stroke="#ff7a68" strokeWidth={2.6} strokeLinecap="round" />
    <circle cx={20} cy={26.2} r={1.5} fill="#ff7a68" />
  </svg>
);

const CheckIcon: React.FC<{ draw: number }> = ({ draw }) => (
  <svg width={40} height={40} viewBox="0 0 40 40">
    <circle cx={20} cy={20} r={19} fill="rgba(47,163,107,0.13)" />
    <circle cx={20} cy={20} r={12.5} fill="#2fa36b" />
    <path
      d="M14.5 20.4 L18.4 24.2 L25.8 16.4"
      fill="none"
      stroke="#fff"
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={18}
      strokeDashoffset={18 * (1 - draw)}
    />
  </svg>
);

export const DutchRollToLevel: React.FC = () => {
  const f = useCurrentFrame();

  // —— 斜置期的缓慢漂移（帧 70 前）：±0.8° 长周期正弦 + 2px 纵漂 ——
  const driftT = Math.min(f, ROLL);
  const driftRot = Math.sin(driftT * 0.035) * 0.8;
  const driftY = Math.sin(driftT * 0.05) * 2;
  // 滚正期间漂移随进度淡出
  const driftFade = interpolate(f, [ROLL, ROLL + 6], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // —— 预备：滚正前 6f 再往斜里压 0.6°（拧紧的手劲）——
  const wind = -0.6 * ramp(f, ROLL - WIND, WIND, EASE.smooth);
  // —— 滚正：-10.6° 用 14f 冲过 0 到 +1.2°，再 10f 收回 0（单次过冲不振荡） ——
  const baseRot =
    f < ROLL
      ? -10 + wind
      : f < ROLL + 14
        ? interpolate(f, [ROLL, ROLL + 14], [-10.6, 1.2], {
            easing: Easing.out(Easing.cubic),
          })
        : interpolate(f, [ROLL + 14, LEVEL], [1.2, 0], {
            extrapolateRight: 'clamp',
            easing: Easing.inOut(Easing.quad),
          });

  const rot = baseRot + driftRot * driftFade;
  const y = driftY * driftFade;

  // scale 1.15（防旋转露边）→ 滚正同步收到 1.08
  const scale = interpolate(f, [ROLL, LEVEL], [1.15, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  // —— 警示条（痛点）：滚正一拍 ease-in 上移淡出；解决卡 snappy 上浮接替 ——
  const outK = ramp(f, ROLL, 8, EASE.exit); // 8f 收走，与解决卡只重叠 2f，避免深浅两卡叠成灰
  const inK = ramp(f, ROLL + 6, 18, EASE.snappy);
  const iconK = ramp(f, ROLL + 8, 14, EASE.overshoot); // 图标晚 2f、带过冲弹出
  const checkDraw = ramp(f, ROLL + 12, 12, EASE.out); // 勾线描出
  const t1 = ramp(f, ROLL + 10, 14, EASE.out); // 标题
  const t2 = ramp(f, ROLL + 12, 14, EASE.out); // 副标（再晚 2f）
  const chipK = ramp(f, ROLL + 15, 14, EASE.out);

  // 不适感：暖色压暗暗角，滚正时随之散去
  const unease = 1 - ramp(f, ROLL, LEVEL - ROLL, EASE.smooth);

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden', fontFamily: FONT.sans }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${y}px) rotate(${rot}deg) scale(${scale})`,
          transformOrigin: '50% 50%',
        }}
      >
        <FakeDashboard variant="B" />

        {/* 痛点警示条：深色 toast 压在页面上方（斜着更显歪） */}
        {outK < 1 && (
          <div
            style={{
              position: 'absolute',
              left: BANNER.left,
              top: BANNER.top,
              width: BANNER.w,
              height: BANNER.h,
              opacity: 1 - outK,
              transform: `translateY(${mix(0, -18, outK)}px) scale(${mix(1, 0.985, outK)})`,
              background: 'linear-gradient(180deg, #23242b 0%, #1a1b21 100%)',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), ${softShadow(22, { color: '#08090c', strength: 1.8 })}`,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '0 26px 0 24px',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#f05848' }} />
            <AlertIcon />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 650, color: '#f4f4f6', letterSpacing: '-0.015em' }}>Build failing on main</div>
              <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.56)', fontVariantNumeric: 'tabular-nums' }}>
                3 checks failed · 12 deploys blocked
              </div>
            </div>
            <div
              style={{
                marginLeft: 'auto',
                fontSize: 17,
                fontWeight: 600,
                color: '#ffb1a6',
                padding: '9px 16px',
                borderRadius: 10,
                background: 'rgba(240,88,72,0.14)',
                boxShadow: 'inset 0 0 0 1px rgba(240,88,72,0.32)',
              }}
            >
              View logs
            </div>
          </div>
        )}

        {/* 解决方案：干净的成功 toast 随滚正浮现在同一位置 */}
        {inK > 0 && (
          <div
            style={{
              position: 'absolute',
              left: BANNER.left,
              top: BANNER.top,
              width: BANNER.w,
              height: BANNER.h,
              opacity: Math.min(1, inK * 1.4),
              transform: `translateY(${mix(16, 0, inK)}px) scale(${mix(0.975, 1, inK)})`,
              background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)',
              borderRadius: 16,
              border: `1px solid ${G.hairline}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(mix(30, 14, inK))}`,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '0 26px 0 24px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ transform: `scale(${iconK})`, opacity: Math.min(1, iconK * 2) }}>
              <CheckIcon draw={checkDraw} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 26, fontWeight: 650, color: G.ink1, letterSpacing: '-0.015em', opacity: t1, transform: `translateY(${mix(6, 0, t1)}px)` }}>
                All checks passing
              </div>
              <div style={{ fontSize: 18, color: G.ink2, fontVariantNumeric: 'tabular-nums', opacity: t2, transform: `translateY(${mix(6, 0, t2)}px)` }}>
                main · deploy #1284 shipped 2m ago
              </div>
            </div>
            <div
              style={{
                marginLeft: 'auto',
                fontSize: 17,
                fontWeight: 600,
                color: '#23865a',
                padding: '9px 16px',
                borderRadius: 10,
                background: 'rgba(47,163,107,0.11)',
                boxShadow: 'inset 0 0 0 1px rgba(47,163,107,0.24)',
                opacity: chipK,
                transform: `translateX(${mix(8, 0, chipK)}px)`,
              }}
            >
              Healthy
            </div>
          </div>
        )}
      </div>

      {/* 斜置期的不适感：暖色压暗暗角 + 轻微去饱和感（屏幕空间，不随画面转） */}
      {unease > 0.001 && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            opacity: unease,
            background: 'radial-gradient(ellipse 70% 70% at 50% 46%, rgba(60,30,24,0) 50%, rgba(60,30,24,0.26) 100%)',
          }}
        />
      )}
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};
