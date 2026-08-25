// D 式 黑场字卡（black-card）——前镜收尾淡入黑场，字卡逐词压印出现（paper-title-card
// 的暗场变体），再交棒后镜。章节级分段 + 呼吸位二合一；一支 30s 片 D 式 ≤2 次。
// 参考实现（真实纹理）：A 景 = projects-full 项目板（前镜收尾 **8f** 淡入黑场，
// 符合定义 6–10 帧）；暗底字卡 = "weekly brief, every project linked" 逐词 letterpress
// （暗底 + 页面底色浅色字，不用强调色当正文字——浅底字卡才不像报错弹窗），等宽小字
// 副行；完整标题落定后 **hold ~15 帧** 再退场，避免"最后一个字刚出现就淡出"；
// 后镜 = wbr-full 周报页从黑场淡入 8f 交棒。
// 节拍：0–8 A 淡出 → 8–20 黑场静 → 20–47 字卡逐词压印 → 47–62 完整标题 hold →
// 62–70 字卡退场 → 70–78 淡入 B 景 → 78–120 B hold。
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

  // A 景收尾：0→8 淡出到黑场（定义要求 6–10 帧，此处 8）
  const aOut = interpolate(frame, [0, 8], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.5, 0, 0.4, 1),
  });

  // 字卡：20 起逐词压印（delay=20+i·3，最后词 i=6 delay=38 完成 47）
  const cardOpacity = interpolate(frame, [18, 26], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.7, 0.3, 1),
  });
  // 完整标题 47f 落定，hold 到 62 再退场（保留 ~15 帧完整展示）
  const cardOut = interpolate(frame, [62, 70], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.5, 1),
  });

  // 后镜 B 淡入：70→78（字卡 62→70 完全淡出后再交棒）
  const bIn = interpolate(frame, [70, 78], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0c0c10', overflow: 'hidden' }}>
      {/* A 景 */}
      {frame < 14 ? (
        <div style={{ position: 'absolute', opacity: aOut }}>
          <Img
            src={staticFile('textures/live/projects-full.png')}
            style={{ position: 'absolute', left: 0, top: A_VIEW_Y, width: 1920 }}
          />
        </div>
      ) : null}

      {/* 黑场字卡（18–74） */}
      {frame >= 18 && frame < 74 ? (
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
                const delay = 20 + i * 3;
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
                background: AMBER, transform: `scaleX(${interpolate(frame, [32, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1) })})`,
              }}
            />
            <div
              style={{
                fontFamily: MONO, fontSize: 20, letterSpacing: '0.14em', color: DIM,
                marginTop: 26, textTransform: 'uppercase',
                opacity: interpolate(frame, [26, 36], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              }}
            >
              Weekly Brief · 2026-W28
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {/* B 景（70 起淡入） */}
      {frame >= 70 ? (
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
