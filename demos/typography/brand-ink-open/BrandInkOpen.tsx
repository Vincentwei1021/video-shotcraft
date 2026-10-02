// brand-ink-open —— 墨线十字准星描画 → 字标逐字 letterpress → 打字机副标
// → 满一秒静止 → 上浮消散。品牌开场第一拍：任何产品画面出现前先立名号。
// 参考实现从 template SceneOpen 帧 0–83 段剥离，self-contained：
// 十字准星 SVG pathLength dashoffset 描画后淡出；字标逐字从大 scale 压到 1 +
// blur→0（入场三件套定式），字底强调色 glint 短划闪过；kicker mono 打字机
// 逐字符 + 强调色块光标周期闪；65–97f 满 1s 静止 hold；退场 7f 上浮+缩+淡。
// 品牌名/副标/强调色可换成目标品牌。
// 质感层（改版）：纸面＝暖色低对比渐变 + 主光 + 暖暗角 + 两层颗粒（细颗粒 + 粗纤维斑）；
// 准星改为绝对定位在字标中心的"套准标"（不再占版面，lockup 真正居中）；
// 压印＝ease-in 加速砸向纸面 + 落地 0.975 微压回弹 + 一瞬墨晕；glint 从逐字群发
// 收成一道跟着压印前沿走的琥珀短划（Q4：一个镜头只给主角一次）。
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { EASE, Grain, Vignette, bezier, ramp } from '../../_fixtures/Polish';

export const BRAND_INK_OPEN_DURATION = 104;

const SERIF = 'ui-serif, "Iowan Old Style", Georgia, "Times New Roman", serif';
const MONO = '"SF Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const INK = 'oklch(18% 0.006 82)';
const AMBER = 'oklch(56% 0.13 65)';
const INK2 = 'oklch(46% 0.008 82)';

const WORDMARK = 'AI Foundation Lab';
const KICKER = 'TEAM RESEARCH CONSOLE';

// 压印节拍：第 i 字 delay = 10 + i·2.8，单字 10f（末字 64.8f 落定 → 65–97f 满 1s hold）
const PRESS_START = 10;
const PRESS_GAP = 2.8;
const PRESS_DUR = 10;
const LAST_DONE = PRESS_START + (WORDMARK.length - 1) * PRESS_GAP + PRESS_DUR;

const pressIn = bezier(0.55, 0, 0.8, 0.35); // 加速砸下：越到纸面越快，落点突然停住
const exitIn = bezier(0.42, 0, 0.7, 0.45); // 退场 ease-in（比 EASE.exit 柔，7f 内看得见离场）
// 字宽估算（em）：只给 glint 前沿定位用，不参与排版
const adv = (ch: string) =>
  ch === ' ' ? 0.26 : 'Iilft'.includes(ch) ? 0.32 : ch === ch.toUpperCase() ? 0.72 : 0.53;
const ADV = WORDMARK.split('').map(adv);
const ADV_SUM = ADV.reduce((a, b) => a + b, 0);

export const BrandInkOpen: React.FC = () => {
  const frame = useCurrentFrame();

  // --- 准星描画（pathLength = 100）：竖 0→9f、横 8→18f，24→34f 淡出，别和字标抢焦点 ---
  const vDraw = 100 * (1 - ramp(frame, 0, 9, EASE.swift));
  const hDraw = 100 * (1 - ramp(frame, 8, 10, EASE.swift));
  const crossFade = 1 - ramp(frame, 24, 10, EASE.out);
  const ringDraw = 100 * (1 - ramp(frame, 4, 14, EASE.out));

  // --- kicker 打字机（28 → ~43），0.7f/字符（装饰小字专用，交互打字要 3f/字符）---
  const perChar = 0.7;
  const kickStart = 28;
  const kickChars = Math.floor(Math.max(0, frame - kickStart) / perChar);
  const kickDone = kickStart + KICKER.length * perChar;
  const cursorOn = (() => {
    if (frame < kickStart) return false;
    if (frame < kickDone) return true;
    if (frame > 95) return false;
    const b = frame - kickDone;
    return Math.floor(b / 2) % 2 === 0;
  })();

  // --- 品牌组 hold 65→97 满 1s，然后 97→104 上浮 40 + 缩 12% + 淡出（ease-in 加速离场）---
  const brandOut = ramp(frame, 97, 7, exitIn);
  const groupY = -brandOut * 40;
  const groupScale = 1 - brandOut * 0.12;

  // --- glint 前沿：跟着"正在压印的那个字"沿基线走，压完即熄 ---
  const pressIdx = (frame - PRESS_START - PRESS_DUR * 0.85) / PRESS_GAP; // 刚落地的字（连续值）
  const cum = (k: number) => {
    const n = Math.max(0, Math.min(WORDMARK.length, k));
    let s = 0;
    for (let i = 0; i < Math.floor(n); i++) s += ADV[i];
    if (n < WORDMARK.length) s += ADV[Math.floor(n)] * (n - Math.floor(n));
    return s / ADV_SUM;
  };
  const glintX = cum(pressIdx + 0.5);
  const glintA =
    interpolate(frame, [PRESS_START + 6, PRESS_START + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) *
    (1 - ramp(frame, LAST_DONE - 2, 7, EASE.out));

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #fbf9f4 0%, #f6f2ea 60%, #f0ebe1 100%)' }}>
      {/* 纸面：左上主光 + 暖暗角 */}
      <AbsoluteFill
        style={{ background: 'radial-gradient(ellipse 60% 65% at 38% 30%, rgba(255,253,248,0.95) 0%, rgba(255,253,248,0) 70%)' }}
      />
      <Vignette strength={0.16} inner={0.42} color="#5a4326" />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            position: 'relative', textAlign: 'center', opacity: 1 - brandOut,
            transform: `translateY(${groupY}px) scale(${groupScale})`,
            filter: brandOut > 0.02 ? `blur(${brandOut * 3}px)` : undefined,
          }}
        >
          {/* wordmark：逐字 letterpress + 一道跟随压印前沿的琥珀 glint */}
          <div
            style={{
              position: 'relative',
              fontFamily: SERIF, fontSize: 132, fontWeight: 600, color: INK,
              letterSpacing: '-0.012em', lineHeight: 1, whiteSpace: 'pre',
              display: 'inline-flex', alignItems: 'flex-end',
            }}
          >
            {/* 套准十字：绝对定位在字标中心，描画后淡出，不占版面 */}
            <svg
              width={150} height={150} viewBox="0 0 150 150"
              style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', opacity: crossFade, overflow: 'visible' }}
            >
              <circle
                cx={75} cy={75} r={30} fill="none" stroke={AMBER} strokeWidth={2} strokeOpacity={0.55}
                pathLength={100} strokeDasharray={100} strokeDashoffset={ringDraw}
                transform="rotate(-90 75 75)"
              />
              <line
                x1={75} y1={4} x2={75} y2={146}
                stroke={AMBER} strokeWidth={3} strokeLinecap="round"
                pathLength={100} strokeDasharray={100} strokeDashoffset={vDraw}
              />
              <line
                x1={4} y1={75} x2={146} y2={75}
                stroke={AMBER} strokeWidth={3} strokeLinecap="round"
                pathLength={100} strokeDasharray={100} strokeDashoffset={hDraw}
              />
            </svg>

            {WORDMARK.split('').map((ch, i) => {
              const delay = PRESS_START + i * PRESS_GAP;
              const p = ramp(frame, delay, PRESS_DUR, pressIn); // 0 悬空 → 1 落到纸面
              const vis = ramp(frame, delay, 5, EASE.out); // 显影先于落地
              // 落地微压：1 → 0.975 → 1（5f），像压印头压进纸里再抬起
              const k = Math.max(0, frame - (delay + PRESS_DUR));
              const squash = k < 5 ? 1 - 0.025 * Math.sin((k / 5) * Math.PI) : 1;
              const sc = (1.6 - 0.6 * p) * squash;
              // 一瞬墨晕：落地时 6px 暖黑晕在 8f 内收掉
              const bloom = k > 0 && k < 8 ? 1 - k / 8 : 0;
              return (
                <span
                  key={i}
                  style={{
                    position: 'relative', display: 'inline-block', opacity: vis,
                    transform: `scale(${sc})`, transformOrigin: 'center bottom',
                    filter: p < 0.999 ? `blur(${(1 - p) * 6}px)` : undefined,
                    textShadow: `0 1px 0 rgba(255,255,255,0.7)${bloom > 0 ? `, 0 0 ${6 * bloom + 2}px rgba(40,28,12,${(0.28 * bloom).toFixed(3)})` : ''}`,
                  }}
                >
                  {ch === ' ' ? ' ' : ch}
                </span>
              );
            })}

            {/* glint：2px 琥珀短划（彗尾渐隐），裁在字标宽度内 */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: -10, height: 3, overflow: 'hidden', opacity: glintA }}>
              <div
                style={{
                  position: 'absolute', top: 0, height: 3, width: 150, borderRadius: 3,
                  left: `calc(${(glintX * 100).toFixed(2)}% - 135px)`,
                  background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${AMBER} 82%, oklch(72% 0.14 70) 100%)`,
                }}
              />
            </div>
          </div>

          {/* mono kicker 打字机 + 琥珀块光标（32px：辅助文字 ≥3% 帧高） */}
          <div
            style={{
              fontFamily: MONO, fontSize: 32, fontWeight: 500, letterSpacing: '0.2em', color: INK2,
              marginTop: 40, textTransform: 'uppercase', height: 36,
              display: 'flex', justifyContent: 'center', alignItems: 'center',
            }}
          >
            {/* 光标占位与文字同宽对齐：整行按"完整 kicker"居中，打字时不左右漂 */}
            <span style={{ position: 'relative', whiteSpace: 'pre' }}>
              <span style={{ visibility: 'hidden' }}>{KICKER}</span>
              <span style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'pre' }}>
                {KICKER.slice(0, kickChars)}
                <span
                  style={{
                    display: 'inline-block', width: 16, height: 30, marginLeft: 2, verticalAlign: '-5px',
                    background: AMBER, opacity: cursorOn ? 0.85 : 0, borderRadius: 1,
                  }}
                />
              </span>
            </span>
          </div>
        </div>
      </AbsoluteFill>

      {/* 纸纤维斑（粗、极淡）+ 细颗粒 */}
      <Grain opacity={0.05} scale={3} freq={0.35} step={104} blend="multiply" />
      <Grain opacity={0.06} step={2} />
    </AbsoluteFill>
  );
};
