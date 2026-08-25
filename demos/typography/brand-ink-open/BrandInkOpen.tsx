// brand-ink-open —— 墨线十字准星描画 → 字标逐字 letterpress → 打字机副标
// → 满一秒静止 → 上浮消散。品牌开场第一拍：任何产品画面出现前先立名号。
// 参考实现从 template SceneOpen 帧 0–83 段剥离，self-contained：
// 十字准星 SVG pathLength dashoffset 描画后淡出；字标逐字从大 scale 压到 1 +
// blur→0（入场三件套定式），字底强调色 glint 短划闪过；kicker mono 打字机
// 逐字符 + 强调色块光标周期闪；46–76f 整整 1s 静止 hold；退场 7f 上浮+缩+淡。
// 品牌名/副标/强调色可换成目标品牌。
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';

export const BRAND_INK_OPEN_DURATION = 104;

const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const INK = 'oklch(18% 0.006 82)';
const AMBER = 'oklch(52% 0.115 65)';
const INK2 = 'oklch(50% 0.006 82)';

const WORDMARK = 'AI Foundation Lab';
const KICKER = 'TEAM RESEARCH CONSOLE';

export const BrandInkOpen: React.FC = () => {
  const frame = useCurrentFrame();

  // --- crosshair draw-on (SVG pathLength = 100): vertical 0→9f, horizontal
  // 8→18f, then fades 24→34f so it doesn't fight the wordmark ---
  const vDraw = interpolate(frame, [0, 9], [100, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const hDraw = interpolate(frame, [8, 18], [100, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.linear,
  });
  const crossFade = interpolate(frame, [24, 34], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // --- kicker typewriter (28 → ~43), 0.7 frames per char (decorative small
  // text only — real interaction typing should be 3f/char, see type-and-filter) ---
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

  // --- brand group rests fully-on for ~1s (wordmark completes ~67f; the last
  // glyph is done at 10+15*3+12=67), then dissolves out (97 → 104): lift +
  // shrink + fade. This leaves a clean ~30-frame hold of the COMPLETE title
  // (67→97), per the card's "完整标题停留 ~30 帧" requirement. ---
  const brandOut = interpolate(frame, [97, 104], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.5, 1),
  });
  const brandOpacity = 1 - brandOut;
  const groupY = -brandOut * 40;
  const groupScale = 1 - brandOut * 0.12;

  return (
    <AbsoluteFill style={{ backgroundColor: '#faf7f2', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', opacity: brandOpacity, transform: `translateY(${groupY}px) scale(${groupScale})` }}>
        {/* crosshair drawn by an invisible amber pen */}
        <svg width={64} height={64} viewBox="0 0 64 64" style={{ display: 'block', margin: '0 auto 34px', opacity: crossFade }}>
          <line
            x1={32} y1={2} x2={32} y2={62}
            stroke={AMBER} strokeWidth={5} strokeLinecap="round"
            pathLength={100} strokeDasharray={100} strokeDashoffset={vDraw}
          />
          <line
            x1={2} y1={32} x2={62} y2={32}
            stroke={AMBER} strokeWidth={5} strokeLinecap="round"
            pathLength={100} strokeDasharray={100} strokeDashoffset={hDraw}
          />
        </svg>

        {/* wordmark: glyph-by-glyph letterpress with amber under-glint */}
        <div
          style={{
            fontFamily: SERIF, fontSize: 132, fontWeight: 600, color: INK,
            letterSpacing: '-0.01em', lineHeight: 1, whiteSpace: 'pre',
            display: 'inline-flex', alignItems: 'flex-end',
          }}
        >
          {WORDMARK.split('').map((ch, i) => {
            const delay = 10 + i * 3;
            const t = interpolate(frame, [delay, delay + 12], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.7, 0.25, 1),
            });
            const glintCenter = delay + 12;
            const glint = interpolate(frame, [glintCenter - 4, glintCenter, glintCenter + 4], [0, 1, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            return (
              <span
                key={i}
                style={{
                  position: 'relative', display: 'inline-block', opacity: t,
                  transform: `scale(${1.6 - 0.6 * t})`, transformOrigin: 'center bottom',
                  filter: `blur(${(1 - t) * 6}px)`,
                }}
              >
                {ch === ' ' ? ' ' : ch}
                <span
                  style={{
                    position: 'absolute', left: '50%', bottom: -6, transform: 'translateX(-50%)',
                    width: `${glint * 100}%`, height: 2, background: AMBER, opacity: glint, borderRadius: 2,
                  }}
                />
              </span>
            );
          })}
        </div>

        {/* mono kicker typewriter + amber block cursor */}
        <div
          style={{
            fontFamily: MONO, fontSize: 26, letterSpacing: '0.14em', color: INK2,
            marginTop: 30, textTransform: 'uppercase', height: 30,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}
        >
          <span style={{ whiteSpace: 'pre' }}>{KICKER.slice(0, kickChars)}</span>
          <span
            style={{
              display: 'inline-block', width: 14, height: 24, marginLeft: 4,
              background: AMBER, opacity: cursorOn ? 0.85 : 0,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
