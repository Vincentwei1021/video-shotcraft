// sheen-sweep-retry —— 单点扫光（高标准重试）
// 深墨主角卡居中，一道 115° 高光带在 40–68f 从左外扫到右外，仅此一次。
// 约束：单点(只扫主角卡)、圆角裁剪(overflow hidden)、扫前扫后完全静止。
// 质感：高光带 = 宽柔光(0.10) + 窄亮芯(峰值 0.32) 两层；卡面暗纹（细斜线 guilloche）
// 平时几乎不可见，只在光带经过处被"照出来"；卡的上沿发丝线在光带经过时同步亮一下。
// 扫光层条件挂载，68f 后整层卸载 → 68–140 逐帧完全相同（静态颗粒）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FONT, Grain, Vignette, bezier, mix, ramp, softShadow, tracking } from '../../_fixtures/Polish';

export const SHEEN_SWEEP_RETRY_DURATION = 140; // 40f 静止 → 28f 扫光 → 72f 真静止

const CARD_W = 760;
const CARD_H = 420;
const SHEEN_W = CARD_W * 1.6; // 1216
const SWEEP_START = 40;
const SWEEP_END = 68;
const inOutCubic = bezier(0.645, 0.045, 0.355, 1);

// 卡面暗纹：细斜线（与光带同向的 115° 反向交叉），平时 0.035，光带处 mask 提到 ~0.2
const PATTERN =
  'repeating-linear-gradient(25deg, rgba(255,255,255,0.9) 0px, rgba(255,255,255,0.9) 1px, transparent 1px, transparent 9px)';

const Logo: React.FC = () => (
  <div
    style={{
      width: 44, height: 44, borderRadius: 12, position: 'relative', overflow: 'hidden', flex: 'none',
      background: 'linear-gradient(145deg, #3b3d46 0%, #24252b 100%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 1px rgba(0,0,0,0.3)',
    }}
  >
    <div style={{ position: 'absolute', left: 12, top: 12, width: 13, height: 13, borderRadius: 4, background: 'rgba(255,255,255,0.92)' }} />
    <div style={{ position: 'absolute', left: 19, top: 19, width: 13, height: 13, borderRadius: 7, background: '#8088f0' }} />
  </div>
);

export const SheenSweepRetry: React.FC = () => {
  const frame = useCurrentFrame();

  // 扫光：40–68f，从卡左外扫到卡右外，inOut(cubic)，只一次
  const sweepActive = frame >= SWEEP_START && frame <= SWEEP_END;
  const p = ramp(frame, SWEEP_START, SWEEP_END - SWEEP_START, inOutCubic);
  // 光带中心从卡左外 300px 走到卡右外 300px（带的可见半宽 ~195px，起止都完全在卡外）：
  // 比"整条 1216px 带从头到尾"少走 600px，inOut 的匀速中段正好落在卡面上 ≈10f，看得清
  const x = mix(-300 - SHEEN_W / 2, CARD_W + 300 - SHEEN_W / 2, p);
  // 光带中心在卡面上的横坐标（渐变 50% 处，115° 带在卡中线高度的位置）
  const bandX = x + SHEEN_W * 0.5;
  // 115° 渐变线长 = W·sin115 + H·cos(180−115) ≈ 866px，卡心在线上 433 处；卡中线上横坐标 X ↔ 线上 433+(X−380)·sin115
  const S = Math.sin((115 * Math.PI) / 180); // 0.906
  const C = Math.cos((65 * Math.PI) / 180); // 0.423
  const along = (CARD_W * S + CARD_H * C) / 2 + (bandX - CARD_W / 2) * S;
  const bandMask = `linear-gradient(115deg, transparent ${(along - 230).toFixed(1)}px, #000 ${along.toFixed(1)}px, transparent ${(along + 230).toFixed(1)}px)`;
  // 光带等值线与竖直方向夹 25°：卡上沿（高出中线 H/2）处光带中心右移 (H/2)·cos65/sin115
  const topX = bandX + ((CARD_H / 2) * C) / S;

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #f3f3f1 0%, #ebebe8 60%, #e4e4e0 100%)',
        fontFamily: FONT.sans,
      }}
    >
      {/* 柔光底：左上主光（与卡的上沿高光、扫光方向一致） */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 66% at 38% 22%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%)',
        }}
      />
      {/* 卡下的地面接触影：贴地小而实 */}
      <div
        style={{
          position: 'absolute', left: 960 - CARD_W * 0.42, top: 540 + CARD_H / 2 - 18, width: CARD_W * 0.84, height: 40,
          borderRadius: '50%', background: 'rgba(16,18,26,0.35)', filter: 'blur(22px)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 960 - CARD_W / 2,
          top: 540 - CARD_H / 2,
          width: CARD_W,
          height: CARD_H,
          borderRadius: 28,
          overflow: 'hidden', // 圆角裁剪：高光带被卡的圆角裁住
          background: 'linear-gradient(150deg, #2a2c35 0%, #1a1b21 46%, #111216 100%)',
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.14), ${softShadow(36, { strength: 1.5 })}`,
          boxSizing: 'border-box',
          padding: '48px 56px 46px',
          display: 'flex',
          flexDirection: 'column',
          color: '#f5f5f3',
        }}
      >
        {/* 暗纹底：常驻极弱 */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: PATTERN, opacity: 0.03 }} />
        {/* 卡面左上的受光：静态，主光方向 */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 70% 80% at 18% 0%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 60%)',
          }}
        />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo />
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: tracking(24) }}>Workspace</div>
          <div
            style={{
              marginLeft: 'auto', padding: '7px 14px', borderRadius: 999, fontSize: 17, fontWeight: 600,
              color: 'rgba(245,245,243,0.72)', background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
              letterSpacing: '0.02em',
            }}
          >
            Annual plan
          </div>
        </div>

        <div style={{ position: 'relative', marginTop: 'auto' }}>
          <div style={{ fontSize: 132, fontWeight: 800, lineHeight: 0.92, letterSpacing: tracking(132, true) }}>PRO</div>
          <div style={{ marginTop: 22, display: 'flex', alignItems: 'baseline', gap: 18 }}>
            <div style={{ fontSize: 30, fontWeight: 500, color: 'rgba(245,245,243,0.66)', letterSpacing: tracking(30) }}>
              Unlimited projects · Priority support
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 30, fontWeight: 650, fontVariantNumeric: 'tabular-nums', letterSpacing: tracking(30) }}>
              $24<span style={{ fontSize: 20, fontWeight: 500, color: 'rgba(245,245,243,0.5)' }}> /seat</span>
            </div>
          </div>
        </div>

        {/* 高光带：条件挂载，扫完即摘罩，收尾真静止 */}
        {sweepActive && (
          <>
            {/* 光带经过处暗纹被照亮（同一条 115° 渐变当遮罩） */}
            <div
              style={{
                position: 'absolute', inset: 0, backgroundImage: PATTERN, opacity: 0.16,
                WebkitMaskImage: bandMask, maskImage: bandMask,
              }}
            />
            {/* 宽柔光 + 窄亮芯（峰值 0.32），screen 叠在深墨上 */}
            <div
              style={{
                position: 'absolute', top: 0, left: 0, width: SHEEN_W, height: CARD_H,
                transform: `translateX(${x}px)`, pointerEvents: 'none', mixBlendMode: 'screen',
                background:
                  'linear-gradient(115deg, transparent 34%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0.10) 47%, rgba(255,255,255,0.32) 50%, rgba(255,255,255,0.10) 53%, rgba(255,255,255,0.05) 58%, transparent 66%)',
              }}
            />
            {/* 上沿发丝线受光：光带经过时那一段上沿亮起 */}
            <div
              style={{
                position: 'absolute', left: 0, top: 0, right: 0, height: 1.5,
                background: `linear-gradient(90deg, transparent ${(topX - 150).toFixed(1)}px, rgba(255,255,255,0.6) ${topX.toFixed(1)}px, transparent ${(topX + 150).toFixed(1)}px)`,
              }}
            />
          </>
        )}
      </div>

      <Vignette strength={0.16} inner={0.5} color="#2a2c36" />
      <Grain opacity={0.045} step={100000} />
    </div>
  );
};
