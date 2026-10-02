// paper-title-card —— 一句话逐词 letterpress 压印上纸字卡
// 章节转场/价值主张呼吸位：单句文案逐词压印入场（scale 大→1 + blur→0），
// 每句恰一个强调色斜体重点词，强调色下划线 scaleX 收束，尾部整卡淡出。
// 全片多张字卡统一 50–55f；纸底+中心暖光与纸墨风格产品画面同色系。
// 参数化：words/sub/subDigits 可换成目标产品文案；subDigits 走 DigitRoll
// 数字滚动（必须在本卡淡出前落定）。渲染本 demo 前把 text 复制进项目即可。
//
// 质感升级：
// - 压印是"落下→压进纸→回弹"三段：scale 1.28→0.985→1（压过头 1.5% 再回弹），
//   词悬空时投一层随高度收缩的软影，落纸瞬间影子归零、换成 1px 凹印高光（受光在上）。
// - 逐词 stagger 越来越紧（4f→3f 间隔），整句 37f 落定，留出读句子的呼吸。
// - 纸底：暖白渐变 + 中心暖光 + 极弱暖色暗角 + 纤维颗粒；全程极缓推近 1→1.012。
// - 淡出只淡"墨"不淡纸：字/线/副行轻微上浮虚化退场，纸面始终在，交棒不掉黑。
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { Grain, Vignette, ramp, EASE, mix } from '../../_fixtures/Polish';

export const PAPER_TITLE_CARD_DURATION = 55; // ≈1.8s @30fps

const SERIF = '"New York", ui-serif, "Iowan Old Style", Georgia, "Times New Roman", serif';
const MONO = '"SF Mono", ui-monospace, "JetBrains Mono", Menlo, monospace';

const INK = 'oklch(19% 0.012 70)'; // 带暖色相的墨色，替代纯黑
const ACCENT = 'oklch(52% 0.115 65)'; // 琥珀强调色（一句恰一个）
const SUB_INK = 'oklch(47% 0.012 75)';

// 每句恰好一个 accent：功能名/收益词（C2）
const WORDS: { text: string; accent?: boolean }[] = [
  { text: 'All' },
  { text: 'your' },
  { text: 'team’s' },
  { text: 'research,' },
  { text: 'one', accent: true },
  { text: 'place' },
  { text: 'to' },
  { text: 'go.' },
];
const SUB = 'of 31 fetched today';
const SUB_DIGITS = '5';

// 逐词入场时刻：首词 4f，间隔前三词 4f、之后收紧到 3f（越压越快，R2），末词 27f 起压、37f 落定
const DELAYS = [4, 8, 12, 15, 18, 21, 24, 27];
const WORD_DELAY = (i: number) => DELAYS[Math.min(i, DELAYS.length - 1)] + Math.max(0, i - DELAYS.length + 1) * 3;
const WORD_DUR = 10; // 单词压印时长：9f 落纸 + 回弹收敛
const SUB_FONT = 30;
const DIGIT_DUR = 16; // 数字滚动时长：27f 起 → 43f 落定，早于 47f 淡出

// 压印曲线：0→0.72 段强 ease-out 从 1.28 压到 0.985（压进纸面），0.72→1 段柔回到 1
const pressScale = (t: number) => {
  if (t <= 0) return 1.28;
  if (t < 0.72) return mix(1.28, 0.985, Easing.bezier(0.2, 0.75, 0.3, 1)(t / 0.72));
  return mix(0.985, 1, EASE.out((t - 0.72) / 0.28));
};

// 数字滚动列（odometer 风格，复制自 template DigitRoll，数字带双份拼接保证
// 任何目标位都有滚感；tabular-nums 防横向抖）
const DIGITS = '0123456789';
const DigitColumn: React.FC<{ ch: string; delay: number; lineH: number; color: string }> = ({ ch, delay, lineH, color }) => {
  const frame = useCurrentFrame();
  if (ch < '0' || ch > '9') {
    return <span style={{ fontSize: SUB_FONT, lineHeight: `${lineH}px`, color }}>{ch}</span>;
  }
  const target = DIGITS.indexOf(ch);
  const t = interpolate(frame, [delay, delay + DIGIT_DUR], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.8, 0.25, 1),
  });
  const offset = (10 + target) * t * lineH;
  // 滚得快时给竖向拖影（按速度，落定为 0）
  const v = interpolate(frame + 0.5, [delay, delay + DIGIT_DUR], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.8, 0.25, 1) }) -
    interpolate(frame - 0.5, [delay, delay + DIGIT_DUR], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.8, 0.25, 1) });
  const blurPx = Math.min(3, Math.abs(v) * (10 + target) * lineH * 0.06);
  return (
    <span style={{ display: 'inline-block', height: lineH }}>
      <span
        style={{
          display: 'block',
          transform: `translateY(${-offset}px)`,
          filter: blurPx > 0.2 ? `blur(${blurPx.toFixed(2)}px)` : undefined,
        }}
      >
        {(DIGITS + DIGITS).split('').map((d, j) => (
          <span
            key={j}
            style={{
              display: 'block',
              fontSize: SUB_FONT,
              fontWeight: 600,
              lineHeight: `${lineH}px`,
              color,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
};

const DigitRoll: React.FC<{ value: string; delay: number; color: string }> = ({ value, delay, color }) => {
  const lineH = SUB_FONT * 1.2;
  return (
    <span style={{ display: 'inline-flex', overflow: 'hidden', height: lineH, verticalAlign: 'bottom' }}>
      {value.split('').map((c, i) => (
        <DigitColumn key={i} ch={c} delay={delay + i * 4} lineH={lineH} color={color} />
      ))}
    </span>
  );
};

export const PaperTitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const duration = PAPER_TITLE_CARD_DURATION;
  // 尾部 8f 只退"墨"：opacity 1→0 + 上浮 10px + 轻虚化，纸面保留；末帧（54f）恰好退净
  const out = ramp(frame, duration - 9, 8, EASE.swift);
  const inkOpacity = 1 - out;
  // 下划线：末词起压后跟上（收束信号），强 ease-out 从中心展开
  const underline = ramp(frame, 24, 14, EASE.snappy);
  // 副行：句子主体落定后再上来（不和标题抢），digit roll 在淡出前 ≥6f 落定
  const subT = ramp(frame, 26, 12, EASE.out);
  // 全程极缓推近（smooth：起止速度为 0）
  const push = mix(1, 1.012, ramp(frame, 0, duration, EASE.smooth));

  return (
    <AbsoluteFill style={{ backgroundColor: 'oklch(97.2% 0.009 82)', overflow: 'hidden' }}>
      {/* 纸底：竖向微渐变 + 中心暖光 + 暖色暗角 + 纤维颗粒 */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(1150px 760px at 50% 44%, oklch(99.4% 0.013 88 / 0.95), oklch(99% 0.012 88 / 0) 68%), ' +
            'linear-gradient(180deg, oklch(97.8% 0.009 84) 0%, oklch(96.4% 0.010 80) 100%)',
        }}
      />
      <Vignette strength={0.11} inner={0.45} color="#4a3a22" cy={0.46} />
      <Grain opacity={0.05} step={3} freq={0.7} blend="multiply" />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${push.toFixed(5)})`,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: 1500,
            opacity: inkOpacity,
            transform: `translateY(${(-10 * out).toFixed(2)}px)`,
            filter: out > 0.02 ? `blur(${(out * 4).toFixed(2)}px)` : undefined,
          }}
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 116,
              fontWeight: 600,
              lineHeight: 1.14,
              color: INK,
              letterSpacing: '-0.018em',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              columnGap: '0.26em',
            }}
          >
            {WORDS.map((w, i) => {
              const delay = WORD_DELAY(i);
              const t = interpolate(frame, [delay, delay + WORD_DUR], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              // 落纸进度（前 72% 时长）：驱动 blur / opacity / 悬空影
              const land = Easing.bezier(0.2, 0.75, 0.3, 1)(Math.min(1, t / 0.72));
              const lift = 1 - land; // 1=悬空 0=贴纸
              const blur = lift * 7;
              // 悬空软影：离纸越高越大越虚越淡；落纸后换成凹印的 1px 上沿暗/下沿亮
              const shadow =
                lift > 0.01
                  ? `0 ${(lift * 22).toFixed(1)}px ${(lift * 30).toFixed(1)}px rgba(60,40,10,${(0.14 * lift).toFixed(3)})`
                  : `0 1px 0 rgba(255,253,246,0.9), 0 -0.5px 0 rgba(60,40,10,0.18)`;
              return (
                <span
                  key={i}
                  style={{
                    opacity: Math.min(1, land * 1.25),
                    transform: `scale(${pressScale(t).toFixed(4)})`,
                    filter: blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : undefined,
                    textShadow: shadow,
                    display: 'inline-block',
                    fontStyle: w.accent ? 'italic' : 'normal',
                    color: w.accent ? ACCENT : undefined,
                  }}
                >
                  {w.text}
                </span>
              );
            })}
          </div>
          <div
            style={{
              height: 6,
              width: 220,
              margin: '40px auto 0',
              borderRadius: 3,
              background: `linear-gradient(180deg, oklch(58% 0.115 68), ${ACCENT})`,
              boxShadow: '0 1px 0 rgba(255,253,246,0.85)',
              transform: `scaleX(${underline.toFixed(4)})`,
            }}
          />
          <div
            style={{
              fontFamily: MONO,
              fontSize: SUB_FONT,
              letterSpacing: '0.14em',
              color: SUB_INK,
              marginTop: 34,
              opacity: subT,
              transform: `translateY(${((1 - subT) * 10).toFixed(2)}px)`,
              textTransform: 'uppercase',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'baseline',
              gap: '0.5em',
            }}
          >
            <DigitRoll value={SUB_DIGITS} delay={27} color={ACCENT} />
            <span>{SUB}</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
