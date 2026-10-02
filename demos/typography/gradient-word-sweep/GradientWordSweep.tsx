// gradient-word-sweep v3 —— 批次 12 按用户意见微调（v2 结构保留）：
// 1) 闪电偏紫红色 + 线宽调细（约减半）；
// 2) 整体泛光强度略降（各辉光层 opacity 下调）；
// 3) 波前尾迹梯度：刚被点亮的字符辉光最强，随扫过距离衰减到稳态
//    （trailing-window 增亮层，填充结束后淡出到稳态呼吸）。
// 质感层（改版 v4）：
// a) 修"方框光"：辉光层的 mask/clip 原先裁在文字盒上，模糊溢出盒外被一刀切成矩形——
//    改为所有带模糊的层都放进四周外扩 PAD 的 Halo 盒里，mask 色标用 calc 换算回文字坐标；
// b) 闪电从 36 次随机事件收成 7 次排期（间隔 ≥9f、同屏 ≤1 道），末次 ~92f 熄灭，尾段留呼吸；
// c) 入场改两行错峰 blur-slide；整段极缓推近 1→1.025；黑底换带色相的近黑 + 暗角 + 颗粒。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { EASE, Grain, Vignette, ramp } from '../../_fixtures/Polish';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const FONT = '"Avenir Next", Futura, "Helvetica Neue", sans-serif';
// 截图 5：S 偏蓝青 → 中段紫 → 粉 → 尾部琥珀
const GRAD = 'linear-gradient(92deg, #59c2ff 0%, #9d6bff 32%, #ff6ed4 62%, #ffc46b 100%)';

export const GRADIENT_WORD_SWEEP_DURATION = 105;

const FILL_START = 12;
const FILL_END = 30; // 18 帧 ≈ 0.6s，快扫
const LIGHT_START = FILL_END + 3;

// ---------- 种子化噪声与闪电 ----------
const rand = mulberry32(20260718);
const FLICKER: number[] = Array.from({ length: 160 }, () => rand());

type Bolt = { d: string; long: boolean };
const makeLongBolt = (r: () => number): Bolt => {
  // 词上方勾连长弧：横跨若干字符，锯齿折线
  const x0 = 30 + r() * 220;
  const x1 = x0 + 160 + r() * 320;
  const yBase = 38 + r() * 42;
  const n = 7 + Math.floor(r() * 4);
  let d = `M ${x0.toFixed(1)} ${(yBase + 26 + r() * 20).toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n + (r() - 0.5) * 22;
    const arch = Math.sin((i / n) * Math.PI) * -22; // 中段拱起
    const y = yBase + arch + (r() - 0.5) * 30 + (i === n ? 30 + r() * 18 : 0);
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return { d, long: true };
};
const makeShortBolt = (r: () => number): Bolt => {
  // 字符之间的短勾连：竖向小锯齿
  const x = 60 + r() * 540;
  const y0 = 72 + r() * 24;
  const y1 = y0 + 55 + r() * 45;
  const n = 4 + Math.floor(r() * 3);
  let d = `M ${x.toFixed(1)} ${y0.toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    const xx = x + (r() - 0.5) * 30;
    d += ` L ${xx.toFixed(1)} ${y.toFixed(1)}`;
  }
  return { d, long: false };
};

const BOLTS: Bolt[] = Array.from({ length: 16 }, (_, i) =>
  i % 3 === 0 ? makeShortBolt(rand) : makeLongBolt(rand),
);
// 闪烁事件：排期而非随机——稀疏零星（同屏 ≤1 道、间隔 ≥9f），末次约 92f 熄灭，留出落定呼吸
type Flash = { at: number; life: number; bolt: number };
const FLASH_AT = [2, 12, 22, 33, 43, 52, 56];
const FLASHES: Flash[] = FLASH_AT.map((d, k) => ({
  at: LIGHT_START + d,
  life: k === FLASH_AT.length - 1 ? 3 : 3 + Math.floor(rand() * 2),
  bolt: (k * 5 + 1) % BOLTS.length,
}));

// 外扩盒：带模糊的辉光层放进四周外扩 PAD 的盒子，mask 不再把溢出的光切成矩形
const PAD = 90;
// 文字坐标里的百分比 x → 外扩盒里的 mask 色标
const at = (x: number) => `calc(${PAD}px + (100% - ${PAD * 2}px) * ${(Math.max(-20, Math.min(120, x)) / 100).toFixed(4)})`;
const Halo: React.FC<{ mask?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ mask, style, children }) => (
  <span
    aria-hidden
    style={{
      position: 'absolute',
      left: -PAD,
      top: -PAD,
      right: -PAD,
      bottom: -PAD,
      padding: PAD,
      ...(mask ? { WebkitMaskImage: mask, maskImage: mask } : {}),
      ...style,
    }}
  >
    <span style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}>{children}</span>
  </span>
);

export const GradientWordSweep: React.FC = () => {
  const frame = useCurrentFrame();

  // 入场：两行错峰 blur-slide（第二行晚 4f），同一条 snappy 进度驱动 y/blur/opacity
  const enter1 = ramp(frame, 0, 14, EASE.snappy);
  const enter2 = ramp(frame, 4, 14, EASE.snappy);
  const lineIn = (e: number): React.CSSProperties => ({
    opacity: e,
    transform: `translateY(${(1 - e) * 36}px)`,
    filter: e < 0.999 ? `blur(${((1 - e) * 10).toFixed(2)}px)` : undefined,
  });
  // 整段极缓推近（smooth，起止速度为 0）
  const push = 1 + 0.025 * ramp(frame, 0, 104, EASE.smooth);

  // 快速填充进度
  const p = interpolate(frame, [FILL_START, FILL_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const pPct = p * 100;
  const filling = frame >= FILL_START && frame <= FILL_END + 4;
  const headFade = interpolate(frame, [FILL_END, FILL_END + 6], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 波前尾迹：刚点亮字符最亮，向后衰减；填充结束后整体淡出到稳态
  const trailFade = interpolate(frame, [FILL_END, FILL_END + 10], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const TRAIL = 34; // 尾迹长度（% 宽度）
  const trailMask =
    `linear-gradient(90deg, transparent 0%, transparent ${at(pPct - TRAIL)}, ` +
    `rgba(0,0,0,0.9) ${at(pPct - 3)}, rgba(0,0,0,0.9) ${at(pPct + 1)}, ` +
    `transparent ${at(pPct + 6)})`;
  // 填充头亮核：只露波前 ~10% 词宽，两侧软边（原 clipPath 硬裁 → 方框）
  const headMask =
    `linear-gradient(90deg, transparent 0%, transparent ${at(pPct - 12)}, #000 ${at(pPct - 6)}, ` +
    `#000 ${at(pPct - 1)}, transparent ${at(pPct + 2)})`;

  const noise = FLICKER[Math.min(frame, FLICKER.length - 1)];
  // 当前帧活跃闪电
  const active = FLASHES.filter((f) => frame >= f.at && frame < f.at + f.life);
  const boltBoost = active.length > 0 ? 0.35 : 0;
  // 辉光呼吸：填满后带噪声微闪 + 闪电时增亮
  const glowLvl =
    interpolate(frame, [FILL_START, FILL_END], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    (0.82 + 0.18 * noise) +
    boltBoost;

  // 软边遮罩：辉光层的填充边缘不生硬
  const softMask = (soft: number): string | undefined =>
    p >= 1
      ? undefined
      : `linear-gradient(90deg, #000 0%, #000 ${at(pPct - soft)}, transparent ${at(pPct + soft * 0.6)})`;

  const lineStyle: React.CSSProperties = {
    fontFamily: FONT,
    fontWeight: 700,
    fontStyle: 'italic',
    fontSize: 92,
    letterSpacing: -1,
    lineHeight: 1.28,
    color: '#ffffff',
    whiteSpace: 'nowrap',
  };

  const gradText: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage: GRAD,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse 70% 70% at 50% 48%, #0d0b14 0%, #07060a 60%, #040405 100%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push})` }}>
        {/* 词后方环境泛光（大半径，随充能增强） */}
        <div
          style={{
            position: 'absolute',
            left: 500,
            top: 340,
            width: 820,
            height: 320,
            borderRadius: '50%',
            background:
              'radial-gradient(closest-side, rgba(180,110,255,0.6), rgba(255,110,212,0.25) 55%, transparent 78%)',
            filter: 'blur(38px)',
            opacity: 0.55 * glowLvl,
          }}
        />
      </div>
      <div style={{ textAlign: 'center', transform: `scale(${push})` }}>
        <div style={{ ...lineStyle, ...lineIn(enter1) }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span>Supercharged</span>
            {/* AE 式辉光：大半径柔光层（最糊） */}
            <Halo mask={softMask(14)} style={{ opacity: 0.55 * glowLvl }}>
              <span style={{ ...gradText, filter: 'blur(46px) saturate(1.6)', transform: 'scale(1.05)' }}>Supercharged</span>
            </Halo>
            {/* 中晕层 */}
            <Halo mask={softMask(10)} style={{ opacity: 0.62 * glowLvl }}>
              <span style={{ ...gradText, filter: 'blur(18px) saturate(1.4) brightness(1.15)' }}>Supercharged</span>
            </Halo>
            {/* 近核柔光 */}
            <Halo mask={softMask(7)} style={{ opacity: 0.72 * Math.min(1, glowLvl + 0.1) }}>
              <span style={{ ...gradText, filter: 'blur(6px) brightness(1.25)' }}>Supercharged</span>
            </Halo>
            {/* 清晰渐变本体（无模糊，clipPath 硬裁即渐变前沿） */}
            <span
              aria-hidden
              style={{
                ...gradText,
                clipPath: `inset(-25% ${100 - pPct}% -25% 0)`,
              }}
            >
              Supercharged
            </span>
            {/* 波前尾迹增亮：刚点亮字符辉光最强，向后衰减到稳态 */}
            {trailFade > 0.01 && (
              <Halo mask={trailMask} style={{ opacity: 0.95 * trailFade }}>
                <span style={{ ...gradText, filter: 'blur(9px) saturate(1.7) brightness(1.7)' }}>Supercharged</span>
              </Halo>
            )}
            {/* 填充头字符过曝亮核（字符形状，非独立光点；仅填充期间；软边 mask 不再出方框） */}
            {filling && p < 1 && (
              <Halo mask={headMask} style={{ opacity: 0.9 * headFade }}>
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    color: '#fff',
                    filter: 'blur(3px)',
                    textShadow: '0 0 22px rgba(255,255,255,0.9), 0 0 55px rgba(216,150,255,0.8)',
                  }}
                >
                  Supercharged
                </span>
              </Halo>
            )}
            {/* 勾连闪电：填充完成后，按排期在字符之间/词上方闪现 */}
            <svg
              aria-hidden
              viewBox="0 0 700 240"
              style={{
                position: 'absolute',
                left: -25,
                top: -62,
                width: 700,
                height: 240,
                overflow: 'visible',
                pointerEvents: 'none',
              }}
            >
              {active.map((f, i) => {
                const b = BOLTS[f.bolt];
                const decay = 1 - (frame - f.at) / f.life;
                return (
                  <g key={`${f.at}-${i}`} opacity={Math.min(1, 1.1 * decay)}>
                    <path
                      d={b.d}
                      fill="none"
                      stroke="rgba(216,60,190,0.65)"
                      strokeWidth={b.long ? 6 : 4.5}
                      strokeLinejoin="miter"
                      style={{ filter: 'blur(6px)' }}
                    />
                    <path
                      d={b.d}
                      fill="none"
                      stroke="rgba(235,110,215,0.9)"
                      strokeWidth={b.long ? 2.4 : 1.9}
                      strokeLinejoin="miter"
                      style={{ filter: 'blur(1.5px)' }}
                    />
                    <path
                      d={b.d}
                      fill="none"
                      stroke="#ffd8f2"
                      strokeWidth={b.long ? 1.4 : 1.1}
                      strokeLinejoin="miter"
                    />
                  </g>
                );
              })}
            </svg>
          </span>{' '}
          <span>performance</span>
        </div>
        <div style={{ ...lineStyle, ...lineIn(enter2) }}>with rock-solid reliability</div>
      </div>
      <Vignette strength={0.5} inner={0.45} color="#000000" />
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
