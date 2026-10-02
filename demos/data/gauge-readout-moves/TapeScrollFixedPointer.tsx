// tape-scroll-fixed-pointer —— 滚带定针
// 取景窗+琥珀三角指针钉死在画面正中，竖向长刻度带（0–500，每 50 一大格）
// 从窗后滚过："世界动、针不动"。先慢速爬（f12–55 读数 60→140 缓涨），
// 然后一次大跳变：刻度带冲刺 ~23f（峰值 ~50px/f）冲过 420 到 442，
// spring 刹车回摆一次（442→415→420）落定。窗内读数同步。f104 后真静止 36f。
// 帧确定性：value(frame) 纯函数分段全 clamp，带偏移 = value 线性映射。
//
// 质感升级：与同卡 NeedleSweep 统一为暗场仪表语境（深色柔光背景 + 颗粒）；刻度带做成内凹的深色
// 滚筒（上下边缘渐隐 + 内阴影），白色刻度 / tabular 数字；取景窗是琥珀发丝框 + 淡琥珀玻璃 + 柔光，
// 指针为圆角发光三角；调试标题换成左侧标题区，右侧读数卡带指标名、单位与落定后弹出的增幅胶囊。
// 运动：慢爬从静止柔起步、末速与冲刺段首速对齐（Hermite），冲刺→刹车→回摆连成一条速度连续的曲线
// （弹簧阻尼按"回摆到 415"反算），冲刺段刻度带与读数按速度做纵向运动模糊，停下即清晰。
import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame } from 'remotion';
import { Backdrop, EASE, FONT, Grain, SpeedBlur, mix, ramp, softShadow, tracking, velocity } from '../../_fixtures/Polish';

export const TAPE_SCROLL_FIXED_POINTER_DURATION = 140; // f104 落定 + 36f 真静止

const AMBER = '#f59e0b';
const AMBER_HI = '#fbbf24';
const INK1 = '#f3f4f7';
const INK3 = '#737885';

const PXU = 3; // px per unit：500 量程 → 1500px 长带
const CENTER_Y = 590; // 取景窗中线（屏幕坐标）
const TAPE_X = 830; // 刻度带左缘
const TAPE_W = 260;
const TAPE_TOP = 180;
const TAPE_H = 830;

// 三次 Hermite：p0→p1，端点速度 m0/m1（单位/帧），dur 帧
const hermite = (t: number, p0: number, p1: number, m0: number, m1: number, dur: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * dur * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * dur * m1;
};

const CRAWL_V = 80 / 43; // 慢爬巡航速度（≈1.86 单位/帧 ≈ 5.6px/f）
// 回摆弹簧：442 → 420，回摆到 415（超调 5/22 ≈ 23%）→ ζ ≈ 0.43
const SETTLE_STIFF = 150;
const SETTLE_DAMP = (() => {
  const lp = Math.log(5 / 22);
  return 2 * (-lp / Math.sqrt(Math.PI * Math.PI + lp * lp)) * Math.sqrt(SETTLE_STIFF);
})();

// 读数时间线：静置→慢爬（柔起步）→冲刺(到 442 速度归零)→弹簧回摆(415)→落定 420→真静止
const valueAt = (frame: number): number => {
  if (frame <= 12) return 60;
  if (frame <= 55) {
    // 前 10f 从静止加速到巡航速度（速度线性上升），之后匀速巡航（机械爬升语义）
    const f = frame - 12;
    const acc = 10;
    const x = f <= acc ? (CRAWL_V * f * f) / (2 * acc) : (CRAWL_V * acc) / 2 + CRAWL_V * (f - acc);
    const total = (CRAWL_V * acc) / 2 + CRAWL_V * (43 - acc);
    return mix(60, 140, x / total);
  }
  if (frame <= 78) {
    const v0 = (80 / ((CRAWL_V * 10) / 2 + CRAWL_V * 33)) * CRAWL_V; // 慢爬末速（按归一化换算）
    return hermite((frame - 55) / 23, 140, 442, v0, 0, 23); // 冲刺段，峰值 ~20 单位/帧 ≈ 60px/f
  }
  if (frame >= 104) return 420;
  const k = spring({ frame: frame - 78, fps: 30, config: { stiffness: SETTLE_STIFF, damping: SETTLE_DAMP, mass: 1 } });
  return mix(442, 420, k);
};

export const TapeScrollFixedPointer: React.FC = () => {
  const frame = useCurrentFrame();
  const v = valueAt(frame);
  const vy = velocity((f) => valueAt(f) * PXU, frame); // 刻度带速度（px/帧，向下为正）

  // 刻度带：数值大在上。单位 u 的屏幕 y = CENTER_Y + (v - u) * PXU
  const yOf = (u: number): number => CENTER_Y + (v - u) * PXU;

  const ticks: React.ReactNode[] = [];
  for (let u = 0; u <= 500; u += 10) {
    const y = yOf(u) - TAPE_TOP; // 带内坐标
    if (y < -40 || y > TAPE_H + 40) continue; // 视野外裁剪
    const major = u % 50 === 0;
    ticks.push(
      <div
        key={u}
        style={{
          position: 'absolute',
          top: y - (major ? 1.5 : 1),
          right: 18,
          width: major ? 84 : 42,
          height: major ? 3 : 2,
          background: major ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
          borderRadius: 2,
        }}
      />,
    );
    if (major) {
      ticks.push(
        <div
          key={`n${u}`}
          style={{
            position: 'absolute',
            top: y - 20,
            right: 120,
            width: 100,
            fontFamily: FONT.sans,
            fontWeight: 600,
            fontSize: 34,
            lineHeight: '40px',
            color: 'rgba(255,255,255,0.78)',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
          }}
        >
          {u}
        </div>,
      );
    }
  }

  const inP = ramp(frame, 0, 12, EASE.snappy);
  const done = ramp(frame, 100, 10, EASE.overshoot); // 落定后增幅胶囊
  const readBlur = Math.min(3, Math.abs(vy) * 0.05);

  return (
    <AbsoluteFill style={{ background: '#0c0d11', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.3 }} grain={0} />

      {/* 左侧标题区 */}
      <div style={{ position: 'absolute', left: 200, top: CENTER_Y - 76, width: 520, opacity: inP, transform: `translateY(${mix(10, 0, inP)}px)` }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: INK3, letterSpacing: tracking(20, true), textTransform: 'uppercase' }}>
          Capacity · us-east-1
        </div>
        <div style={{ marginTop: 10, fontSize: 60, fontWeight: 700, color: INK1, letterSpacing: tracking(60), lineHeight: 1.05 }}>
          Rate limit
        </div>
        <div style={{ marginTop: 14, fontSize: 22, fontWeight: 500, color: INK3 }}>Plan upgrade applied</div>
      </div>

      {/* 刻度带容器（世界层：整体在动）——内凹深色滚筒 */}
      <div
        style={{
          position: 'absolute',
          left: TAPE_X,
          top: TAPE_TOP,
          width: TAPE_W,
          height: TAPE_H,
          background: 'linear-gradient(90deg, #0f1014 0%, #17181d 50%, #121317 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18,
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: `inset 0 2px 10px rgba(0,0,0,0.6), ${softShadow(30, { color: '#000000', strength: 2 })}`,
          opacity: inP,
        }}
      >
        <SpeedBlur vx={0} vy={vy} amount={0.22} max={12}>
          <div style={{ position: 'absolute', inset: 0 }}>{ticks}</div>
        </SpeedBlur>
        {/* 滚筒弧度：上下边缘渐隐到面板色 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(14,15,19,0.96) 0%, rgba(14,15,19,0) 24%, rgba(14,15,19,0) 76%, rgba(14,15,19,0.96) 100%)',
          }}
        />
      </div>

      {/* 固定层：取景窗 + 琥珀三角指针（针不动） */}
      <div
        style={{
          position: 'absolute',
          left: TAPE_X - 12,
          top: CENTER_Y - 44,
          width: TAPE_W + 24,
          height: 88,
          border: `2px solid ${AMBER}`,
          borderRadius: 14,
          boxShadow: `0 0 0 4px rgba(245,158,11,0.10), 0 0 28px rgba(245,158,11,0.22), inset 0 1px 0 rgba(255,255,255,0.12)`,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, rgba(245,158,11,0.10), rgba(245,158,11,0.04))',
          opacity: inP,
        }}
      />
      <svg
        width={56}
        height={60}
        style={{ position: 'absolute', left: TAPE_X - 70, top: CENTER_Y - 30, overflow: 'visible', opacity: inP, filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.45))' }}
      >
        <path d="M8 8 L48 30 L8 52 Z" fill={AMBER} stroke={AMBER} strokeWidth={8} strokeLinejoin="round" />
      </svg>

      {/* 同步读数卡 */}
      <div
        style={{
          position: 'absolute',
          left: TAPE_X + TAPE_W + 70,
          top: CENTER_Y - 104,
          width: 420,
          height: 208,
          background: 'linear-gradient(180deg, #1b1d23, #15161b)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 22,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), ${softShadow(28, { color: '#000000', strength: 2 })}`,
          padding: '28px 36px',
          boxSizing: 'border-box',
          opacity: inP,
          transform: `translateY(${mix(14, 0, inP)}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: INK3, letterSpacing: tracking(20, true), textTransform: 'uppercase' }}>
            Requests / min
          </div>
          <div
            style={{
              padding: '4px 11px',
              borderRadius: 99,
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.28)',
              color: '#6ee7b7',
              fontSize: 17,
              fontWeight: 650,
              fontVariantNumeric: 'tabular-nums',
              opacity: Math.min(1, done * 1.4),
              transform: `scale(${mix(0.6, 1, done).toFixed(4)})`,
              transformOrigin: '100% 50%',
            }}
          >
            ▲ 200%
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 104,
              color: AMBER_HI,
              letterSpacing: tracking(104),
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 30px rgba(245,158,11,0.25)',
            }}
          >
            <span style={{ display: 'inline-block', filter: readBlur > 0.2 ? `blur(${readBlur.toFixed(2)}px)` : undefined }}>{Math.round(v)}</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: INK3 }}>k</div>
        </div>
      </div>
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
