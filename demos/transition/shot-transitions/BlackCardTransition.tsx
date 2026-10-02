// D 式 黑场字卡（black-card）——前镜收尾淡入黑场，字卡逐词压印出现（paper-title-card
// 的暗场变体），再交棒后镜。章节级分段 + 呼吸位二合一；一支 30s 片 D 式 ≤2 次。
// 参考实现（真实纹理）：A 景 = projects-full 项目板（前镜收尾 **9f** 淡入黑场，带着前镜的
// 推进惯性继续轻推 2.5%，不是原地熄灯）；暗场不是死黑——带色相的深底 + 一团极淡的暖光 +
// 暗角 + 颗粒；暗底字卡 = "Every project, linked to your weekly report." 逐词压印
// （暗底 + 页面底色浅色字，强调色只给重点词——浅底字卡才不像报错弹窗），词间错峰按缓动分布
// （前紧后松，最后一词落得最从容），等宽副行 28px；完整标题落定后 **hold 30 帧（1s，R1）**
// 再上浮淡出；后镜 = wbr-full 周报页在字卡退净后从黑场淡入 10f 并从 1.03 轻收落定。
// 节拍：0–9 A 淡出 → 9–14 黑场静 → 14–44 字卡逐词压印 → 44–74 完整标题 hold →
// 74–82 字卡上浮退场 → 82–92 淡入 B 景（scale 1.03→1 至 98f）→ 98–120 B 真静止。
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, ramp, mix, Grain, Vignette } from '../../_fixtures/Polish';

export const BLACKCARD_DUR = 120;

const A_VIEW_Y = -180;
const SERIF = 'ui-serif, "New York", "Iowan Old Style", Georgia, "Times New Roman", serif';

// 暗底字卡的正文用页面底色（浅色），强调色只给重点词
const PAPER_LIGHT = 'oklch(92% 0.01 82)';
const AMBER = 'oklch(70% 0.12 65)';
const DIM = 'oklch(66% 0.012 82)';
const NIGHT = '#0d0e12'; // 带色相的深底（不用 #000）

const WORDS: { text: string; accent?: boolean }[] = [
  { text: 'Every' },
  { text: 'project,' },
  { text: 'linked' },
  { text: 'to' },
  { text: 'your', accent: true },
  { text: 'weekly' },
  { text: 'report.' },
];
// 逐词起跑帧：14 → 32，前紧后松（缓动分布而非等差）
const STAGGER = bezier(0.25, 0.1, 0.55, 1);
const wordStart = (i: number) => 14 + 18 * (1 - STAGGER(1 - i / (WORDS.length - 1)));
const WORD_DUR = 12;

const Scene: React.FC = () => {
  const frame = useCurrentFrame();

  // A 景收尾：0→9 淡入黑场，同时延续前镜推进惯性轻推 2.5%
  const aOut = 1 - ramp(frame, 0, 9, bezier(0.5, 0, 0.4, 1));
  const aPush = mix(1, 1.025, ramp(frame, 0, 12, EASE.out));

  // 暗场氛围：暖光团在 6→20f 缓缓亮起（之后保持，不闪）
  const glow = ramp(frame, 6, 14, EASE.out);

  // 字卡退场：74→82 上浮 14px + 淡出 + 微糊（ease-in 出场）
  const cardOut = ramp(frame, 74, 8, EASE.exit);

  // 后镜 B：82→92 淡入（字卡完全退净后再交棒，不叠化），82→98 从 1.03 轻收到 1
  const bIn = ramp(frame, 82, 10, bezier(0.3, 0, 0.2, 1));
  const bScale = mix(1.03, 1, ramp(frame, 82, 16, EASE.out));

  const ruleP = ramp(frame, 30, 14, EASE.snappy);
  const subP = ramp(frame, 32, 14, EASE.out);

  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, overflow: 'hidden' }}>
      {/* 暗场：深底 + 字卡背后一团极淡的暖光 + 暗角 + 颗粒（still alive，不是死黑） */}
      <AbsoluteFill style={{
        opacity: glow,
        background: 'radial-gradient(ellipse 46% 40% at 50% 47%, rgba(150,128,100,0.13) 0%, rgba(150,128,100,0.04) 55%, rgba(150,128,100,0) 100%)',
      }} />
      <Vignette strength={0.55} inner={0.4} color="#050608" />
      <Grain opacity={0.08} blend="soft-light" />

      {/* A 景 */}
      {frame < 12 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: aOut, transform: `scale(${aPush})`, transformOrigin: '50% 45%' }}>
          <Img
            src={staticFile('textures/live/projects-full.png')}
            style={{ position: 'absolute', left: 0, top: A_VIEW_Y, width: 1920 }}
          />
        </div>
      ) : null}

      {/* 黑场字卡（14–82） */}
      {frame >= 14 && frame < 83 ? (
        <AbsoluteFill
          style={{
            justifyContent: 'center', alignItems: 'center', pointerEvents: 'none',
            opacity: 1 - cardOut, transform: `translateY(${-14 * cardOut}px)`,
            filter: cardOut > 0.01 ? `blur(${(cardOut * 4).toFixed(2)}px)` : undefined,
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 1500 }}>
            <div
              style={{
                fontFamily: SERIF, fontSize: 96, fontWeight: 600, lineHeight: 1.16,
                color: PAPER_LIGHT, letterSpacing: '-0.018em',
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.26em',
                textShadow: '0 0 40px rgba(255,236,210,0.06)',
              }}
            >
              {WORDS.map((w, i) => {
                const d = wordStart(i);
                const t = ramp(frame, d, WORD_DUR, EASE.snappy); // 压印：快落、软停
                const o = ramp(frame, d, WORD_DUR * 0.55, EASE.out);
                return (
                  <span
                    key={i}
                    style={{
                      opacity: o, transform: `translateY(${((1 - t) * 0.12).toFixed(3)}em) scale(${mix(1.14, 1, t).toFixed(4)})`,
                      filter: t < 0.995 ? `blur(${((1 - t) * 6).toFixed(2)}px)` : undefined, display: 'inline-block',
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
                height: 2, width: 168, margin: '34px auto 0', borderRadius: 1,
                background: `linear-gradient(90deg, rgba(0,0,0,0), ${AMBER} 22%, ${AMBER} 78%, rgba(0,0,0,0))`,
                transform: `scaleX(${ruleP})`,
              }}
            />
            <div
              style={{
                fontFamily: FONT.mono, fontSize: 28, letterSpacing: '0.18em', color: DIM,
                marginTop: 28, textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums',
                opacity: subP, transform: `translateY(${(1 - subP) * 8}px)`,
              }}
            >
              Weekly Brief · 2026-W28
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {/* B 景（82 起淡入，轻收落定） */}
      {frame >= 82 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: bIn, transform: bScale > 1.0001 ? `scale(${bScale})` : undefined, transformOrigin: '50% 45%' }}>
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
