// 底色闪砸字（cel-flash-stomp）——stomp-typography 逐词节拍砸字 ×
// background-cel-flash 纯色底闪的组合变异。三个大词逐拍硬切占满屏，
// 每词像图章一样歪着砸落；词落定帧起背景层在两色间每 2f 闪切——文字层独立在上纹丝
// 不动，只闪背景是本组合命门（动漫必杀技字卡感）。第三词闪加倍且对比拉大。
//
// 第二轮重设计（余烬夜 · 立体压字海报）：
// - look = ember（暖黑 · 橙 · 金）。词是 Avenir Next Condensed Heavy Italic 全大写，按词定字号
//   铺满画宽 62–72%（SHIP 560 / FASTER 470 / TODAY 520px）；字面奶白 + 向右下 18 层逐像素
//   挤出的赤褐→深褐立体厚度（像实体铅字/图章），落在暗底上有体积、闪到橙底上依然读得清——
//   所以闪切时文字一个像素都不用改。
// - 底闪：静息底是带主光的暖黑舞台；落定帧起整块"空气"在 余烬橙 ↔ 暖黑 间每 2f 交替
//   （前两词 6f；末词 8f 且橙更亮、暗更深 = 对比拉大）。闪的层里只有纯色 + 极弱中心亮，无任何内容。
// - 砸落：硬切入场即 1.32× 悬空（离地投影大而虚 + 两层缩放残影 = 冲击模糊），ease-out(poly5)
//   4f 砸到 0.97，再 2f 回到 1（一次可见过冲）；歪角从 1.6× 砸正到 ±3°/0°。落地后整词完全锐利。
// - 节拍"越来越紧"：SHIP 30f → FASTER 26f → TODAY（第三拍提前 4f，像鼓点加速推进）。
// - 词外的定位元素（文字层，不闪）：左上 01/03 拍号随词换、右上版本号；末词落定后底部
//   一行发布信息逐块升起（橙色版本胶囊 + 40px 文案 + 域名），整组极缓推近 1.5% 收成海报。
//
// 时间表（30fps，共 140f）：
//   0–6     SHIP 硬切砸落（第 0 帧即在画面里），6–12 底闪 ×3
//   30–36   FASTER 硬切砸落，36–42 底闪
//   56–62   TODAY 硬切砸落，62–70 底闪加倍（8f）
//   70–90   发布信息逐块升起（与末闪结束同帧起，不会被闪没）
//   90–140  hold 50f（重拳双倍 hold）：极缓推近 + 主光呼吸，无逐帧噪声
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EASE, FONT, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha } from '../../_fixtures/Look';

export const CEL_FLASH_STOMP_DURATION = 140; // 3 词逐拍 + 末词收尾静止 ≥45f

const L = LOOKS.ember;
const COND = '"Avenir Next Condensed", "DIN Condensed", "Arial Narrow", "Helvetica Neue", sans-serif';

type Word = {
  text: string;
  start: number; // 硬切入场帧
  end: number; // 显示到此帧前（下一词硬切）
  rot: number; // 图章歪斜角
  size: number; // 字号：按词长铺满画宽
  flashLen: number; // 落定后背景闪总帧数
  hot: string; // 闪切的亮色
  deep: string; // 闪切的暗色
};

const LAND = 6; // 入场弹落时长：start+6 落定，同帧起闪
const WORDS: Word[] = [
  { text: 'SHIP', start: 0, end: 30, rot: 3, size: 560, flashLen: 6, hot: '#ff6b2c', deep: '#140a06' },
  { text: 'FASTER', start: 30, end: 56, rot: -3, size: 470, flashLen: 6, hot: '#ff6b2c', deep: '#140a06' },
  { text: 'TODAY', start: 56, end: 9999, rot: 0, size: 520, flashLen: 8, hot: '#ff7a33', deep: '#050201' },
];
const FINAL = WORDS[2].start + LAND + WORDS[2].flashLen; // 70：末闪结束帧

// 挤出厚度：18 层 1px 斜向硬阴影，再加一层落地接触影
// 侧面由受光的赤褐渐暗到深褐：暗底上也读得出厚度，橙底上读作深色描边
const EXTRUDE = Array.from({ length: 18 }, (_, k) => {
  const d = k + 1;
  const m = k / 17;
  const r = Math.round(150 - 112 * m), g = Math.round(64 - 48 * m), b = Math.round(28 - 18 * m);
  return `${(d * 0.8).toFixed(1)}px ${d}px 0 rgb(${r},${g},${b})`;
}).join(', ');

export const CelFlashStomp: React.FC = () => {
  const frame = useCurrentFrame();
  const wi = WORDS.findIndex((w) => frame >= w.start && frame < w.end);
  const word = WORDS[wi];
  const t = frame - word.start;

  // 弹落：1.32 → 0.97（4f，poly5 出缓）→ 1（2f）
  const scale =
    t < 4
      ? interpolate(t, [0, 4], [1.32, 0.97], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.poly(5)) })
      : interpolate(t, [4, LAND], [0.97, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  // 离地高度 h：1 = 刚出现（悬在镜头前）→ 0 = 第 4f 触底
  const h = interpolate(t, [0, 4], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const rot = word.rot * (1 + 0.6 * h);

  // 背景闪：落定帧起每 2f 在 hot / deep 间交替，共 flashLen 帧；之外是静息舞台
  const ft = t - LAND;
  const flashing = ft >= 0 && ft < word.flashLen;
  const flashColor = flashing ? (Math.floor(ft / 2) % 2 === 0 ? word.hot : word.deep) : null;

  // 收尾：发布信息升起 + 整组极缓推近
  const push = 1 + 0.015 * ramp(frame, FINAL, 140 - FINAL, EASE.smooth);
  const info = (k: number) => ramp(frame, FINAL + k * 4, 16, EASE.snappy);

  // 离地投影：大而虚 → 贴实
  const lift = `0 ${(30 + h * 60).toFixed(0)}px ${(30 + h * 90).toFixed(0)}px ${alpha('#000000', 0.45 + h * 0.15)}`;

  const wordStyle: React.CSSProperties = {
    fontFamily: COND, fontWeight: 800, fontStyle: 'italic', fontSize: word.size, lineHeight: 0.86,
    letterSpacing: '-0.01em', whiteSpace: 'nowrap', color: '#fff3e6', textTransform: 'uppercase',
  };

  return (
    <AbsoluteFill>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.18 }} fill={{ x: 0.5, y: 1.05 }} breathe={0.5} vignette={0.5}>
        {/* 闪的"空气"：纯色 + 极弱中心亮，层里没有任何内容元素 */}
        {flashColor && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 70% 75% at 50% 45%, ${flashColor} 0%, ${flashColor} 40%, color-mix(in srgb, ${flashColor} 86%, #000) 100%)`,
          }} />
        )}
      </Stage>

      {/* 文字层：背景闪切时纹丝不动 */}
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        {/* 拍号 / 版本号（随词换，不动） */}
        <div style={{
          position: 'absolute', left: 120, top: 96, display: 'flex', alignItems: 'baseline', gap: 14,
          fontFamily: FONT.mono, fontSize: 32, letterSpacing: '0.12em', color: '#fff3e6', fontVariantNumeric: 'tabular-nums',
        }}>
          <span style={{ fontWeight: 700 }}>{String(wi + 1).padStart(2, '0')}</span>
          <span style={{ opacity: 0.45 }}>/ 03</span>
        </div>
        <div style={{
          position: 'absolute', right: 120, top: 100, fontFamily: FONT.sans, fontSize: 28, fontWeight: 700,
          letterSpacing: '0.22em', color: alpha('#fff3e6', 0.6),
        }}>
          HALYARD 4.2
        </div>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
          <div style={{ position: 'relative', transform: `rotate(${rot.toFixed(3)}deg)` }}>
            {/* 冲击残影：两层更大的淡拷贝随下砸收拢，只在 0–4f 存在 */}
            {h > 0.02 && [1.12, 1.26].map((k, i) => (
              <div key={i} style={{
                ...wordStyle, position: 'absolute', left: 0, top: 0,
                opacity: h * (i === 0 ? 0.28 : 0.12), color: i === 0 ? '#fff3e6' : L.accent2,
                transform: `scale(${(scale * (1 + (k - 1) * h)).toFixed(4)})`,
                filter: `blur(${((4 + i * 6) * h).toFixed(1)}px)`,
              }}>
                {word.text}
              </div>
            ))}
            <div style={{
              ...wordStyle, position: 'relative', transform: `scale(${scale.toFixed(4)})`,
              textShadow: `${EXTRUDE}, ${lift}`,
              filter: h > 0.02 ? `blur(${(h * 3).toFixed(2)}px)` : undefined,
            }}>
              {word.text}
            </div>
          </div>
        </div>

        {/* 发布信息：末闪结束同帧起逐块升起 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 108, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28,
          fontFamily: FONT.sans,
        }}>
          <div style={{
            opacity: info(0), transform: `translateY(${(1 - info(0)) * 30}px)`,
            padding: '10px 22px', borderRadius: 999, background: L.accent, color: L.onAccent,
            fontSize: 32, fontWeight: 800, letterSpacing: '0.02em', boxShadow: `0 10px 30px ${alpha(L.accent, 0.35)}`,
          }}>
            v4.2
          </div>
          <div style={{ opacity: info(1), transform: `translateY(${(1 - info(1)) * 30}px)`, color: '#fff3e6', fontSize: 40, fontWeight: 650, letterSpacing: '-0.015em' }}>
            Deploys in under a second, for every team.
          </div>
          <div style={{
            opacity: info(2) * 0.6, transform: `translateY(${(1 - info(2)) * 30}px)`, color: '#fff3e6',
            fontFamily: FONT.mono, fontSize: 32, letterSpacing: '0.04em', paddingLeft: 28, borderLeft: `1px solid ${alpha('#fff3e6', 0.25)}`,
          }}>
            halyard.build
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
