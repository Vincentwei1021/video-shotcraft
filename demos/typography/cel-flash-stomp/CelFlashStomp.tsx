// 底色闪砸字（cel-flash-stomp）——stomp-typography 逐词节拍砸字 ×
// background-cel-flash 纯色底闪的组合变异。三个大词逐拍硬切占满屏，
// 每词像图章一样歪着砸落（scale 1.18→0.98→1 弹落 + 交替 ±2.5° rotate）；
// 词落定帧起背景层每 2f 在 G.bg 与加深灰之间闪切——文字层独立在上纹丝
// 不动，只闪背景是本组合命门（动漫必杀技字卡感）。第三词闪加倍且对比拉大。
// 关键帧：0 "SHIP" 硬切入(rot+2.5°) → 0–6 弹落 → 6–11 背景闪(#cfcfca, 2f 交替×6f)
// → 30 "FASTER" 硬切(rot−2.5°) → 30–36 弹落 → 36–41 背景闪
// → 60 "TODAY" 硬切(rot 0°) → 60–66 弹落 → 66–73 背景闪加倍(8f, #c4c4c0)
// + 66–80 底部标签条淡入 → 80–144 全静止(≥45f, 无逐帧噪声层)。
// 质感层（改版）：去掉调试标题；词放大到 340px 真正"占满屏"、系统 Display 字栈 900；
// 砸落段给"高度"——随离地高度变化的投影（远而虚 → 落地贴实）+ 两层缩放残影做冲击模糊，
// 歪角从 1.6× 收到 1×；底闪两色各带极弱中心亮的径向（仍是无物的"空气"）；
// 标签条换成出版级内容（品牌标 + 版本信息 + 域名），14f 淡入并上移 24px。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { EASE, FONT, Grain, ramp } from '../../_fixtures/Polish';

export const CEL_FLASH_STOMP_DURATION = 144; // 3 词 × 30f + 末词收尾静止

type Word = {
  text: string;
  start: number; // 硬切入场帧
  end: number; // 显示到此帧前（下一词硬切）
  rot: number; // 图章歪斜角
  flashLen: number; // 落定后背景闪总帧数
  flashDark: string; // 闪切的加深灰
};

const LAND = 6; // 入场弹落时长：start+6 落定，同帧起闪
const WORDS: Word[] = [
  { text: 'SHIP', start: 0, end: 30, rot: 2.5, flashLen: 6, flashDark: '#cfcfca' },
  { text: 'FASTER', start: 30, end: 60, rot: -2.5, flashLen: 6, flashDark: '#cfcfca' },
  { text: 'TODAY', start: 60, end: 9999, rot: 0, flashLen: 8, flashDark: '#c4c4c0' },
];

// 纯色底 → 同色相极弱径向（中心略亮 3%），只是"空气"的明暗，不含任何内容
const air = (c: string, k: number) =>
  `radial-gradient(ellipse 75% 80% at 50% 46%, ${c} 0%, ${c} 35%, color-mix(in srgb, ${c} ${100 - k}%, #6b6b66) 100%)`;

export const CelFlashStomp: React.FC = () => {
  const frame = useCurrentFrame();
  const word = WORDS.find((w) => frame >= w.start && frame < w.end)!;
  const t = frame - word.start;

  // 弹落：scale 1.18 → 0.98(2% 过冲) → 1，6f 内完成，poly(5) 出缓
  const scale =
    t < 4
      ? interpolate(t, [0, 4], [1.18, 0.98], {
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.poly(5)),
        })
      : interpolate(t, [4, LAND], [0.98, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.quad),
        });
  // 离地高度 h：1 = 刚出现（悬在镜头前）→ 0 = 落到纸面（第 4f 触底）
  const h = interpolate(t, [0, 4], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  // 歪角也一起"砸正"：起手多歪 60%，触底即到位
  const rot = word.rot * (1 + 0.6 * h);

  // 背景闪：落定帧(start+LAND)起，每 2f 在加深灰与 G.bg 间交替，共 flashLen 帧
  const ft = t - LAND;
  const flashing = ft >= 0 && ft < word.flashLen;
  const bgColor = flashing && Math.floor(ft / 2) % 2 === 0 ? word.flashDark : G.bg;

  // 第三词落定同帧起底部标签条淡入（66–80）+ 上移 24px
  const labelP = ramp(frame, 66, 14, EASE.out);

  // 投影随高度：近地小而实（落定后保留极淡接触影）、离地大而虚
  const shadow =
    `0 ${(1 + h * 34).toFixed(1)}px ${(1.5 + h * 60).toFixed(1)}px rgba(20,20,18,${(0.06 + h * 0.12).toFixed(3)})`;

  const wordStyle: React.CSSProperties = {
    fontFamily: FONT.sans,
    fontWeight: 900,
    fontSize: 340,
    lineHeight: 1,
    color: G.ink1,
    letterSpacing: '-0.045em',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ width: 1920, height: 1080, background: air(bgColor, 7), position: 'relative', overflow: 'hidden' }}>
      {/* 文字层独立在背景之上：背景闪切时它纹丝不动 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 40,
        }}
      >
        <div style={{ position: 'relative', transform: `rotate(${rot}deg)` }}>
          {/* 冲击残影：两层更大的淡拷贝随下砸收拢，只在 0–4f 存在（落地后整词完全锐利） */}
          {h > 0.02 &&
            [1.1, 1.22].map((k, i) => (
              <div
                key={i}
                style={{
                  ...wordStyle,
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  opacity: h * (i === 0 ? 0.22 : 0.1),
                  transform: `scale(${scale * (1 + (k - 1) * h)})`,
                  filter: `blur(${(3 + i * 4) * h}px)`,
                }}
              >
                {word.text}
              </div>
            ))}
          <div
            style={{
              ...wordStyle,
              position: 'relative',
              transform: `scale(${scale})`,
              textShadow: shadow,
              filter: h > 0.02 ? `blur(${(h * 2.4).toFixed(2)}px)` : undefined,
            }}
          >
            {word.text}
          </div>
        </div>
      </div>
      {/* 底部标签条：第三词落定同帧淡入 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 96,
          background: 'linear-gradient(180deg, #1b1c21 0%, #141519 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
          opacity: labelP,
          transform: `translateY(${(1 - labelP) * 24}px)`,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '0 120px',
          boxSizing: 'border-box',
          fontFamily: FONT.sans,
        }}
      >
        <div
          style={{
            width: 44, height: 44, borderRadius: 11, background: 'linear-gradient(180deg, #6f77e6 0%, #545cc9 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width={22} height={22} viewBox="0 0 22 22">
            <path d="M4 12.5 L9 17 L18 5" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.94)', fontSize: 32, fontWeight: 600, letterSpacing: '-0.01em' }}>Release 4.2</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 32, fontWeight: 400 }}>Available now for every team</div>
        <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.62)', fontSize: 32, fontFamily: FONT.mono, letterSpacing: '0.01em' }}>
          shipkit.dev
        </div>
      </div>
      {/* 静态颗粒（step 极大 = 整段同一张纹理）：只为压掉径向渐变的色带，不引入逐帧噪声 */}
      <Grain opacity={0.05} step={100000} />
    </div>
  );
};
