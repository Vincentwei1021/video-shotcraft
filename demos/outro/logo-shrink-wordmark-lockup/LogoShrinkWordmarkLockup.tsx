// logo-shrink-wordmark-lockup — 满屏切口大环收束成图标并刹车过冲，图标让位，字标逐字滑入完成 lockup，标语押尾
//
// 第二轮重设计（珍珠母 · 虹彩能量环 → 标准态图标）：
// - look = aurora（紫粉极光暗场）。虚构品牌 Nacre（珍珠母）。开场第 1 帧就是一枚直径 ~1240px、
//   粗 ~100px 的虹彩切口双弧环（紫 → 粉 → 冰蓝渐变描边 + 宽泛光），边缓转边以"先慢后猛、最后硬刹"的
//   曲线坍缩到直径 ~150px 的图标——整个能量收进一个点。
// - 清晰度：环不用 transform 放大，每帧直接按目标半径在 1920×1080 SVG 里画（Q2），细边不糊；
//   描边粗细随半径次线性缩放（大时不至于变成一堵墙）。高速段画 3 圈按速度衰减的半径残影 = 径向运动模糊。
// - 演出态 → 标准态：收束最后 1/3 缺口愈合、虹彩交叉到奶白实环；落位瞬间一次弹簧刹车（~6% 过冲），
//   放一圈细冲击波（只一次），环心"珍珠"弹出——图标从此是标准态。
// - lockup：图标 smooth 左移让位，字标 NACRE（190px）逐字从图标方向滑出（遮罩内 translateX + 对焦），
//   标语 LIGHT IN EVERY LAYER（32px 宽字距，强调粉）最后整行升起——层级低一档，不逐字。
//
// 时间表（30fps，共 138f）：
//   0–6     大环满屏缓转（第 1 帧即有画面），泛光呼吸
//   6–34    收束 28f（慢起 → 猛冲 → 硬刹）；18–34 缺口愈合 + 虹彩 → 奶白
//   34–46   弹簧刹车过冲 + 冲击波；36f 珍珠弹出
//   46–62   图标左移让位（smooth）
//   54–74   字标 5 字母逐个滑入（错峰 3f）
//   82–96   标语整行升起
//   96–138  hold 42f：极缓推镜 1.5% + 光的呼吸
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, ramp, mix } from '../../_fixtures/Polish';
import { LOOKS, Stage, Dust, alpha, springAt, type } from '../../_fixtures/Look';

export const LOGO_SHRINK_WORDMARK_LOCKUP_DURATION = 138;

const L = LOOKS.aurora;
const CX = 960;
const CY = 520;
const R0 = 620; // 开场环半径（直径 1240，上下出画）
const R1 = 62; // 图标环半径
const WORDMARK = 'NACRE';
const SHIFT = -318; // 图标让位后的 x 偏移（lockup 整体居中）
const WORD_SIZE = 190;
const COLLAPSE = bezier(0.62, 0, 0.18, 1); // 先慢后猛、最后硬刹
const WORD_X = CX + SHIFT + R1 + 12 + 58; // 字标左缘 = 图标右缘 + 间距
const WORD_W = 600; // 字标约宽（光带的铺展宽度，按字均分给每个字的背景偏移）
const wordStyle: React.CSSProperties = {
  fontFamily: FONT.sans, fontWeight: 680, fontSize: WORD_SIZE, lineHeight: 1, letterSpacing: '-0.035em',
  color: '#f6f1ff', whiteSpace: 'nowrap',
};

// 收束：半径（含弹簧刹车过冲）
const radiusAt = (f: number) => {
  const k = ramp(f, 6, 28, COLLAPSE);
  // 刹车：到位瞬间胀 ~7% 再回落（一次可见过冲，像急停时的惯性）
  const brake = 0.07 * Math.sin(Math.PI * ramp(f, 33, 12, EASE.out));
  return mix(R0, R1, k) * (1 + brake);
};
const spinAt = (f: number) => -40 - 210 * ramp(f, 0, 36, EASE.out);
// 描边粗细：随半径次线性
const strokeAt = (r: number) => 24 * Math.pow(r / R1, 0.6);

const arc = (r: number, a0: number, a1: number) => {
  const p = (a: number) => [CX + r * Math.cos((a * Math.PI) / 180), CY + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

// 双弧切口环：gap = 每个缺口角度（0 = 闭合）
const SplitRing: React.FC<{ r: number; spin: number; gap: number; stroke: string; width: number; opacity?: number; filter?: string }> = ({
  r, spin, gap, stroke, width, opacity = 1, filter,
}) => {
  if (gap < 0.4) {
    return <circle cx={CX} cy={CY} r={r} fill="none" stroke={stroke} strokeWidth={width} opacity={opacity} filter={filter} />;
  }
  const h = gap / 2;
  return (
    <g opacity={opacity} filter={filter} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round">
      <path d={arc(r, spin + h, spin + 180 - h)} />
      <path d={arc(r, spin + 180 + h, spin + 360 - h)} />
    </g>
  );
};

export const LogoShrinkWordmarkLockup: React.FC = () => {
  const f = useCurrentFrame();
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');

  const r = radiusAt(f);
  const spin = spinAt(f);
  const heal = ramp(f, 18, 16, EASE.smooth); // 缺口愈合 + 虹彩 → 奶白
  const gap = mix(30, 0, heal);
  const w = strokeAt(r);
  const speed = Math.abs(radiusAt(f) - radiusAt(f - 1)); // px/帧
  const trail = Math.min(1, speed / 40);
  const shift = SHIFT * ramp(f, 46, 16, EASE.swift);
  const pearl = f < 36 ? 0 : springAt(f, 36, { damping: 12, stiffness: 240 });
  const wave = ramp(f, 34, 20, EASE.out);
  const tag = ramp(f, 82, 14, EASE.snappy);
  const push = mix(1, 1.015, ramp(f, 46, 92, EASE.smooth));
  const sheen = ramp(f, 84, 22, EASE.swift);
  const band = `linear-gradient(105deg, transparent ${(sheen * 140 - 40).toFixed(1)}%, rgba(214,243,255,0.95) ${(sheen * 140 - 26).toFixed(1)}%, rgba(244,114,182,0.9) ${(sheen * 140 - 16).toFixed(1)}%, transparent ${(sheen * 140 - 4).toFixed(1)}%)`;
  // 能量光晕：开场罩住大环，随收束坍缩，落位后回落成图标背后的微光
  const haloR = mix(900, 420, ramp(f, 6, 30, COLLAPSE));
  const haloA = 0.6 - 0.22 * ramp(f, 34, 24, EASE.out) + 0.04 * Math.sin(f / 20);

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.3 }} fill={{ x: 0.82, y: 0.9 }} intensity={0.8} breathe={0.5}>
        <Dust look={L} count={36} seed={7} drift={0.3} opacity={0.45} color={L.accent} />
      </Stage>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: `${CX}px ${CY}px` }}>
        {/* 能量光晕 */}
        <div style={{
          position: 'absolute', left: CX + shift * 0.55 - haloR, top: CY - haloR, width: haloR * 2, height: haloR * 2, borderRadius: '50%',
          opacity: haloA,
          background: `radial-gradient(circle, ${alpha(L.accent, 0.42)} 0%, ${alpha(L.accent2, 0.14)} 40%, ${alpha(L.accent, 0)} 70%)`,
        }} />
        <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <linearGradient id={`ir${id}`} gradientUnits="userSpaceOnUse" x1={CX - r} y1={CY - r} x2={CX + r} y2={CY + r}
              gradientTransform={`rotate(${(spin * 1.6).toFixed(2)} ${CX} ${CY})`}>
              <stop offset="0" stopColor="#7c5cff" />
              <stop offset="0.38" stopColor="#f472b6" />
              <stop offset="0.68" stopColor="#d6f3ff" />
              <stop offset="1" stopColor="#a78bfa" />
            </linearGradient>
            <linearGradient id={`pr${id}`} x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0" stopColor="#fffaff" />
              <stop offset="1" stopColor="#e6dcf5" />
            </linearGradient>
            <radialGradient id={`pe${id}`} cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#fde7ff" />
              <stop offset="0.45" stopColor="#f472b6" />
              <stop offset="1" stopColor="#7c5cff" />
            </radialGradient>
            <filter id={`gl${id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={(10 + w * 0.35).toFixed(2)} />
            </filter>
          </defs>
          <g transform={`translate(${shift.toFixed(2)} 0)`}>
            {/* 冲击波：刹车那一下一圈细环扩散消散 */}
            {wave > 0 && wave < 1 && (
              <circle cx={CX} cy={CY} r={mix(R1 + 14, R1 + 260, wave)} fill="none"
                stroke={alpha('#f2e8ff', 0.6 * (1 - wave))} strokeWidth={mix(3, 0.6, wave)} />
            )}
            {/* 径向残影：上 1/3、2/3、1 帧的半径（只在高速段） */}
            {trail > 0.03 && [1, 2, 3].map((k) => {
              const rr = radiusAt(f - k * 0.34);
              return <SplitRing key={k} r={rr} spin={spinAt(f - k * 0.34)} gap={gap} stroke={`url(#ir${id})`} width={strokeAt(rr)} opacity={(0.3 - k * 0.07) * trail * (1 - heal)} />;
            })}
            {/* 演出态：虹彩泛光 + 虹彩芯 */}
            {heal < 0.999 && (
              <>
                <SplitRing r={r} spin={spin} gap={gap} stroke={`url(#ir${id})`} width={w * 1.5} opacity={0.75 * (1 - heal)} filter={`url(#gl${id})`} />
                <SplitRing r={r} spin={spin} gap={gap} stroke={`url(#ir${id})`} width={w} opacity={1 - heal * 0.6} />
              </>
            )}
            {/* 标准态：奶白实环 + 珍珠 */}
            {heal > 0.001 && <SplitRing r={r} spin={spin} gap={gap} stroke={`url(#pr${id})`} width={w} opacity={heal} />}
            {pearl > 0.001 && (
              <>
                {/* 珍珠：虹彩渐变 + 左上一点高光，演出态的颜色被"收"进了图标心里 */}
                <circle cx={CX + 8} cy={CY - 8} r={Math.max(0, 30 * pearl)} fill={`url(#ir${id})`} opacity={0.3} filter={`url(#gl${id})`} />
                <circle cx={CX + 8} cy={CY - 8} r={Math.max(0, 19 * pearl)} fill={`url(#pe${id})`} />
                <circle cx={CX + 2} cy={CY - 14} r={Math.max(0, 5 * pearl)} fill="#ffffff" opacity={0.85} />
              </>
            )}
          </g>
        </svg>

        {/* 字标：从图标方向逐字滑出（容器 overflow 裁切 = 从图标后面"抽"出来 + 对焦），图标让位时才开始 */}
        <div style={{
          position: 'absolute', left: WORD_X, top: CY - WORD_SIZE * 0.55, height: WORD_SIZE * 1.1,
          display: 'flex', alignItems: 'center', overflow: 'hidden', paddingRight: 30,
        }}>
          {Array.from(WORDMARK).map((ch, i) => {
            const p = ramp(f, 54 + i * 3, 16, EASE.snappy);
            return (
              <span key={i} style={{
                display: 'inline-block', ...wordStyle,
                opacity: Math.min(1, p * 1.8),
                transform: `translateX(${mix(-120 - i * 18, 0, p).toFixed(2)}px)`,
                filter: p < 0.999 ? `blur(${mix(10, 0, p).toFixed(2)}px)` : undefined,
              }}>{ch}</span>
            );
          })}
        </div>
        {/* 珍珠光泽：字标全部落定后一道虹彩光带扫过（只给主角一次，裁进字形 = background-clip:text） */}
        {sheen > 0 && sheen < 1 && (
          <div style={{
            position: 'absolute', left: WORD_X, top: CY - WORD_SIZE * 0.55, height: WORD_SIZE * 1.1,
            display: 'flex', alignItems: 'center', paddingRight: 30, pointerEvents: 'none',
          }}>
            {/* 与字标同结构逐字排（逐字 span 没有字偶距，整串排会和下层错开几 px） */}
            {Array.from(WORDMARK).map((ch, i) => (
              <span key={i} style={{
                display: 'inline-block', ...wordStyle, color: 'transparent', WebkitBackgroundClip: 'text', backgroundClip: 'text',
                backgroundImage: band, backgroundSize: `${WORD_W}px 100%`, backgroundPosition: `${-i * WORD_W / WORDMARK.length}px 0`,
              }}>{ch}</span>
            ))}
          </div>
        )}

        {/* 标语：整行升起（强调粉，宽字距） */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: CY + 168, textAlign: 'center',
          ...type(32, 600, { caps: true }), letterSpacing: '0.44em', color: L.accent2,
          opacity: tag, transform: `translateY(${mix(18, 0, tag).toFixed(2)}px)`,
        }}>
          Light in every layer
        </div>
      </div>
    </AbsoluteFill>
  );
};
