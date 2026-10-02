// paper-title-card —— 一句话逐词 letterpress 压印上纸字卡
// 章节转场/价值主张呼吸位：单句文案逐词压印入场（scale 大→压过头→回弹 + blur→0），
// 每句恰一个强调色斜体重点词，强调色短划线 scaleX 收束，mono 副行带数字滚动。
//
// 第二轮重设计（活版印刷打样稿）：
// - look = paper（暖白纸 · 墨 · 朱红）。画面是一张印刷厂的打样稿：四角裁切标记、顶部套准靶、底部版权行
//   （mono 小字，纹理层），中央两行 136px 衬线大字居中——古典居中版式，而非杂志式左对齐。
// - 压印质感：墨层过一道确定性"上墨不均"滤镜（高频噪声 → 墨浓度 0.8–1 斑驳）；落纸后 1px 凹印（下沿受光、
//   上沿压暗）；每个词落纸那 6f 纸面在词下方出现一圈"受压暗晕"再回弹——纸被压了一下的物理反馈。
// - 双色套印（节奏的核心）：第一版"墨"逐词压印，间隔 4f → 3f 越压越快（R2），强调词的位置先留空；
//   停 6f 后第二版"朱红"单独压下强调词「one」（压力更重：1.38× 起压、暗晕更大），同版的短划线、套准靶红圈、
//   副行数字一起出现，并从 (9,−6)px 的套准偏移 12f 内"对版"归零——打样稿上的套准标记因此有了戏。
// - 副行 mono 32px + DigitRoll 44→60f 落定；hold 20f。
// - 常量 FADE_OUT（默认 false）：成片里当转场字卡用时改 true，尾部 8f 只淡出"墨"、纸面保留交棒。
//
// 时间表（30fps，共 80f）：
//   0–16   纸面、裁切标记生长、套准靶与版权行淡入（第 1 帧就有纸与标记）
//   4–34   第一版（墨）：7 个词逐词压印（每词 10f：前 72% 压到 0.985，余下回弹到 1），「one」处留空
//   34–46  第二版（朱红）：「one」重压 12f + 套准偏移对版归零；36–50 短划线从中心展开
//   44–60  副行升起，数字滚动到 5
//   60–80  hold 20f（极缓推进 1→1.015）
import React, { useId } from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha } from '../../_fixtures/Look';

export const PAPER_TITLE_CARD_DURATION = 80; // ≈2.7s @30fps

const L = LOOKS.paper;
const SERIF = '"New York", ui-serif, "Iowan Old Style", Georgia, "Times New Roman", serif';
const MONO = FONT.mono;
const SIZE = 136;

// 每句恰好一个 accent：功能名/收益词（C2）；br = 该词后换行
const WORDS: { text: string; accent?: boolean; br?: boolean }[] = [
  { text: 'All' },
  { text: 'your' },
  { text: 'team’s' },
  { text: 'research,', br: true },
  { text: 'one', accent: true },
  { text: 'place' },
  { text: 'to' },
  { text: 'go.' },
];
const SUB = 'of 31 papers fetched today';
const SUB_DIGITS = '5';
const SUB_FONT = 32;
// 成片里当转场字卡用时改 true：尾部 8f 只淡出"墨"（字/线/副行），纸面保留交棒；单独展示时尾帧保留完整海报
const FADE_OUT = false;

// 逐词入场时刻：首词 4f，前三个间隔 4f、之后收紧到 3f（越压越快）
// 双色套印：第一版（墨）逐词压印，强调词留空；第二版（朱红）在 RED_AT 单独压下，并从套准偏移里"对版"归位
const DELAYS = [4, 8, 12, 15, -1, 18, 21, 24]; // -1 = 第二版（朱红）
const WORD_DUR = 10;
const RED_AT = 34;
const RED_DUR = 12;
const REG = { x: 9, y: -6 }; // 第二版初始套准偏移（px），12f 内对齐归零
const DIGIT_DUR = 16;

// 压印曲线：0→0.72 段强 ease-out 从 1.28 压到 0.985（压进纸面），0.72→1 段柔回到 1
const pressScale = (t: number) => {
  if (t <= 0) return 1.28;
  if (t < 0.72) return mix(1.28, 0.985, Easing.bezier(0.2, 0.75, 0.3, 1)(t / 0.72));
  return mix(0.985, 1, EASE.out((t - 0.72) / 0.28));
};

// 数字滚动列（odometer）：双份 0–9 拼接保证任何目标位都有滚感；滚快时竖向拖影
const DIGITS = '0123456789';
const DIGIT_EASE = Easing.bezier(0.25, 0.8, 0.25, 1);
const DigitColumn: React.FC<{ ch: string; delay: number; lineH: number; color: string }> = ({ ch, delay, lineH, color }) => {
  const frame = useCurrentFrame();
  const target = DIGITS.indexOf(ch);
  const pos = (f: number) => interpolate(f, [delay, delay + DIGIT_DUR], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: DIGIT_EASE });
  const offset = (10 + target) * pos(frame) * lineH;
  const blurPx = Math.min(3, Math.abs(pos(frame + 0.5) - pos(frame - 0.5)) * (10 + target) * lineH * 0.06);
  return (
    <span style={{ display: 'inline-block', height: lineH }}>
      <span style={{ display: 'block', transform: `translateY(${-offset}px)`, filter: blurPx > 0.2 ? `blur(${blurPx.toFixed(2)}px)` : undefined }}>
        {(DIGITS + DIGITS).split('').map((d, j) => (
          <span key={j} style={{ display: 'block', fontSize: SUB_FONT, fontWeight: 700, lineHeight: `${lineH}px`, color, fontVariantNumeric: 'tabular-nums' }}>{d}</span>
        ))}
      </span>
    </span>
  );
};

// 裁切标记：角上一对 L 形发丝线（随 p 生长）
const CropMark: React.FC<{ x: number; y: number; sx: 1 | -1; sy: 1 | -1; p: number }> = ({ x, y, sx, sy, p }) => {
  const len = 64 * p;
  const c = alpha(L.ink, 0.55);
  return (
    <>
      <div style={{ position: 'absolute', left: sx > 0 ? x - 24 - len : x + 24, top: y, width: len, height: 1.5, background: c }} />
      <div style={{ position: 'absolute', left: x, top: sy > 0 ? y - 24 - len : y + 24, width: 1.5, height: len, background: c }} />
    </>
  );
};

export const PaperTitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const duration = PAPER_TITLE_CARD_DURATION;
  const out = FADE_OUT ? ramp(frame, duration - 9, 8, EASE.swift) : 0;
  const marks = ramp(frame, 0, 16, EASE.snappy);
  const meta = ramp(frame, 6, 14, EASE.out);
  const underline = ramp(frame, RED_AT + 2, 14, EASE.snappy);
  const subT = ramp(frame, 44, 12, EASE.out);
  // 第二版对版：偏移从 REG 收敛到 0（EASE.out），红色元素（强调词 / 短划线 / 套准靶红圈）共用
  const reg = 1 - ramp(frame, RED_AT + 3, 12, EASE.out);
  const regT = `translate(${(REG.x * reg).toFixed(2)}px, ${(REG.y * reg).toFixed(2)}px)`;
  const redIn = ramp(frame, RED_AT, 6, EASE.out);
  const push = mix(1, 1.015, ramp(frame, 0, duration, EASE.swift));

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.4 }} fill={null} grain={0.06} vignette={0.22}>
        {/* 纸纤维：沿纸纹方向拉长的低频噪声，multiply 进纸面（静态） */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.08 }}>
          <filter id={`fib${uid}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.07" numOctaves={3} seed={4} />
            <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.47  0 0 0 0 0.36  0 0 0 -1.1 0.9" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#fib${uid})`} />
        </svg>
      </Stage>

      {/* 上墨不均：高频噪声 → 墨浓度 0.8–1 斑驳（作用在墨层上，确定性） */}
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <filter id={`ink${uid}`} x="-5%" y="-10%" width="110%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={11} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0.74" result="dens" />
          <feComposite in="SourceGraphic" in2="dens" operator="in" />
        </filter>
      </svg>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})` }}>
        {/* 打样稿标记：四角裁切线、顶部套准靶、底部版权行（纹理层小字） */}
        <CropMark x={190} y={150} sx={1} sy={1} p={marks} />
        <CropMark x={1730} y={150} sx={-1} sy={1} p={marks} />
        <CropMark x={190} y={930} sx={1} sy={-1} p={marks} />
        <CropMark x={1730} y={930} sx={-1} sy={-1} p={marks} />
        <svg width={60} height={60} viewBox="-30 -30 60 60" style={{ position: 'absolute', left: 930, top: 58, opacity: meta }}>
          <circle r={14 * marks} fill="none" stroke={alpha(L.ink, 0.5)} strokeWidth={1.5} />
          <line x1={-24} y1={0} x2={24} y2={0} stroke={alpha(L.ink, 0.5)} strokeWidth={1.5} />
          <line x1={0} y1={-24} x2={0} y2={24} stroke={alpha(L.ink, 0.5)} strokeWidth={1.5} />
        </svg>
        {/* 套准靶的朱红版：随第二版压下出现，偏移归零即"对准" */}
        <svg width={60} height={60} viewBox="-30 -30 60 60" style={{ position: 'absolute', left: 930, top: 58, opacity: redIn * 0.85, transform: regT, mixBlendMode: 'multiply' }}>
          <circle r={14} fill="none" stroke={L.accent} strokeWidth={1.5} />
          <line x1={-24} y1={0} x2={24} y2={0} stroke={L.accent} strokeWidth={1.5} />
          <line x1={0} y1={-24} x2={0} y2={24} stroke={L.accent} strokeWidth={1.5} />
        </svg>
        <div style={{ position: 'absolute', left: 236, right: 236, top: 972, display: 'flex', justifyContent: 'space-between', opacity: meta * 0.9, fontFamily: MONO, fontSize: 22, letterSpacing: '0.18em', color: L.ink3 }}>
          <span>LUMEN RADAR — CHAPTER 02</span>
          <span>PROOF 02 / 04</span>
        </div>

        {/* 主体：两行衬线压印 + 朱红短划线 + mono 副行 */}
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{
            textAlign: 'center', marginTop: -30,
            opacity: 1 - out, transform: `translateY(${(-10 * out).toFixed(2)}px)`, filter: out > 0.02 ? `blur(${(out * 4).toFixed(2)}px)` : undefined,
          }}>
            <div style={{
              fontFamily: SERIF, fontSize: SIZE, fontWeight: 600, lineHeight: 1.12, color: L.ink, letterSpacing: '-0.022em',
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.24em', width: 1640,
            }}>
              {WORDS.map((w, i) => {
                const red = DELAYS[i] < 0;
                const delay = red ? RED_AT : DELAYS[i];
                const dur = red ? RED_DUR : WORD_DUR;
                const t = interpolate(frame, [delay, delay + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                const land = Easing.bezier(0.2, 0.75, 0.3, 1)(Math.min(1, t / 0.72));
                const lift = 1 - land; // 1=悬空 0=贴纸
                const blur = lift * 7;
                // 受压暗晕：落纸瞬间（t≈0.72）在词下方鼓起一圈暗晕，6f 内回弹消散
                const dent = Math.max(0, 1 - Math.abs(frame - (delay + dur * 0.72)) / (red ? 6 : 4)) * (red ? 1.5 : 1);
                const shadow = lift > 0.01
                  ? `0 ${(lift * 24).toFixed(1)}px ${(lift * 32).toFixed(1)}px rgba(60,40,10,${(0.16 * lift).toFixed(3)})`
                  : `0 1.5px 0 rgba(255,253,246,0.95), 0 -1px 0 rgba(60,40,10,0.22)`;
                return (
                  <React.Fragment key={i}>
                    <span style={{ position: 'relative', display: 'inline-block' }}>
                      {dent > 0 && (
                        <span aria-hidden style={{
                          position: 'absolute', left: '-12%', right: '-12%', top: '10%', bottom: '-6%', borderRadius: '50%',
                          background: `radial-gradient(closest-side, rgba(70,48,20,${(0.13 * dent).toFixed(3)}), rgba(70,48,20,0) 100%)`,
                        }} />
                      )}
                      <span style={{
                        display: 'inline-block', position: 'relative',
                        opacity: Math.min(1, land * 1.25),
                        transform: `${red ? regT + ' ' : ''}scale(${(red ? mix(1, pressScale(t), 1.35) : pressScale(t)).toFixed(4)})`,
                        filter: blur > 0.15 ? `blur(${blur.toFixed(2)}px) url(#ink${uid})` : `url(#ink${uid})`,
                        textShadow: shadow,
                        fontStyle: w.accent ? 'italic' : 'normal',
                        color: w.accent ? L.accent : undefined,
                      }}>
                        {w.text}
                      </span>
                    </span>
                    {w.br && <span style={{ flexBasis: '100%', height: 0 }} />}
                  </React.Fragment>
                );
              })}
            </div>
            <div style={{
              height: 6, width: 200, margin: '44px auto 0', borderRadius: 3, background: L.accent,
              boxShadow: '0 1.5px 0 rgba(255,253,246,0.9)', transform: `${regT} scaleX(${underline.toFixed(4)})`,
            }} />
            <div style={{
              fontFamily: MONO, fontSize: SUB_FONT, letterSpacing: '0.14em', color: L.ink2, marginTop: 36, textTransform: 'uppercase',
              opacity: subT, transform: `translateY(${((1 - subT) * 12).toFixed(2)}px)`,
              display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '0.55em',
            }}>
              <span style={{ display: 'inline-flex', overflow: 'hidden', height: SUB_FONT * 1.2, verticalAlign: 'bottom' }}>
                {SUB_DIGITS.split('').map((c, i) => <DigitColumn key={i} ch={c} delay={44 + i * 4} lineH={SUB_FONT * 1.2} color={L.accent} />)}
              </span>
              <span>{SUB}</span>
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
