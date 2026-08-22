// D 式 黑场字卡（black-card）——前镜收尾淡入黑场，字卡逐词压印出现（paper-title-card
// 的暗场变体），再交棒后镜。章节级分段 + 呼吸位二合一；一支 30s 片 D 式 ≤2 次。
// 参考实现（真实纹理）：A 景 = projects-full 项目板（前镜收尾 20f 淡入黑场），
// 暗底字卡 = "weekly brief, every project linked" 逐词 letterpress（暗底 + 页面底色
// 浅色字，不用强调色当正文字——浅底字卡才不像报错弹窗），等宽小字副行；后镜 =
// wbr-full 周报页从黑场淡入 8f 交棒。节拍：0–20 A 淡出 → 20–28 黑场静 → 28–64 字卡
// 逐词压印 + hold → 64–72 淡入 B 景 → 72–120 B hold。
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';

export const BLACKCARD_DUR = 120;

const A_VIEW_Y = -180;
const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// 暗底字卡的正文用页面底色（浅色），强调色只给重点词
const PAPER_LIGHT = 'oklch(92% 0.01 82)';
const AMBER = 'oklch(68% 0.12 65)';
const DIM = 'oklch(72% 0.01 82)';

const WORDS: { text: string; accent?: boolean }[] = [
  { text: 'Every' },
  { text: 'project,' },
  { text: 'linked' },
  { text: 'to' },
  { text: 'your', accent: true },
  { text: 'weekly' },
  { text: 'report.' },
];

const Scene: React.FC = () => {
  const frame = useCurrentFrame();

  // A 景收尾：0→20 淡出到黑场
  const aOut = interpolate(frame, [0, 20], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.5, 0, 0.4, 1),
  });

  // 字卡：28 起逐词压印（letterpress 配方：scale 大→1 + blur→0）
  const cardOpacity = interpolate(frame, [24, 32], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.7, 0.3, 1),
  });
  const cardOut = interpolate(frame, [58, 66], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.5, 1),
  });

  // 后镜 B 淡入：66→74（字卡 58→66 完全淡出后再交棒）
  const bIn = interpolate(frame, [66, 74], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0c0c10', overflow: 'hidden' }}>
      {/* A 景 */}
      {frame < 24 ? (
        <div style={{ position: 'absolute', opacity: aOut }}>
          <Img
            src={staticFile('textures/live/projects-full.png')}
            style={{ position: 'absolute', left: 0, top: A_VIEW_Y, width: 1920 }}
          />
        </div>
      ) : null}

      {/* 黑场字卡（28–66） */}
      {frame >= 24 && frame < 70 ? (
        <AbsoluteFill
          style={{
            justifyContent: 'center', alignItems: 'center',
            opacity: cardOpacity * (1 - cardOut), pointerEvents: 'none',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 1500 }}>
            <div
              style={{
                fontFamily: SERIF, fontSize: 96, fontWeight: 600, lineHeight: 1.16,
                color: PAPER_LIGHT, letterSpacing: '-0.012em',
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.26em',
              }}
            >
              {WORDS.map((w, i) => {
                const delay = 28 + i * 4;
                const t = interpolate(frame, [delay, delay + 9], [0, 1], {
                  extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.75, 0.3, 1),
                });
                return (
                  <span
                    key={i}
                    style={{
                      opacity: t, transform: `scale(${1.3 - 0.3 * t})`,
                      filter: `blur(${(1 - t) * 7}px)`, display: 'inline-block',
                      fontStyle: w.accent ? 'italic' : 'normal',
                      color: w.accent ? AMBER : undefined,
                    }}
                  >
                    {w.text}
                  </span>
                );
              })}
            </div>
            <div
              style={{
                height: 4, width: 180, margin: '30px auto 0', borderRadius: 2,
                background: AMBER, transform: `scaleX(${interpolate(frame, [40, 52], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1) })})`,
              }}
            />
            <div
              style={{
                fontFamily: MONO, fontSize: 20, letterSpacing: '0.14em', color: DIM,
                marginTop: 26, textTransform: 'uppercase',
                opacity: interpolate(frame, [34, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              }}
            >
              Weekly Brief · 2026-W28
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {/* B 景（66 起淡入） */}
      {frame >= 66 ? (
        <div style={{ position: 'absolute', opacity: bIn }}>
          <Img
            src={staticFile('textures/live/wbr-full.png')}
            style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 }}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const BlackCardTransition: React.FC = () => (
  <Scene />
);
