// letterspace-materialize v3 —— 按批次 11 用户意见修正（截图 superhuman，4 张）：
// ① 字形比例改宽：v2 竖长（60x100），对照终态截图字高≈50/字宽≈58（宽高比≈1.15），
//    v3 重绘全部骨架字形到 78x64 视框（字面 58x54），方正略宽 + 细笔画 + 大字距；
// ② 所有字母同时开始同时完成：去掉 v2 的逐字错峰（PER/jitter），全字符同一帧起笔、
//    pathLength 归一保证不同笔画长度的字母在同一帧齐收（截图 2/3 的全行并行半截态）。
// v4 质感：底景从"三块模糊色块"重做为暮色湖景——分层天空渐变 + 两层程序山脊（大气透视：远淡近深）
//    + 宽幅地平线霞光（铺出画外，不露光带两端）+ 水面（天光倒影 + 缓慢漂移的细波光）+ 字标水面倒影；
//    颗粒防渐变色带；背景极缓推近 3%（远山/近山不同速，微视差），字标本身不位移。
// 品牌轮：SUPERHUMAN → video-shotcraft（全小写字标），字形库换成 13 个几何小写骨架字形（见 GLYPHS），
//    描画节奏、同步齐收、底景与时长不变。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { bezier, ramp, EASE, Grain, Vignette } from '../../_fixtures/Polish';

// 品牌轮：字标换成 video-shotcraft（品牌规范要求全小写），骨架字形重绘为几何小写单线体。
// 统一 64 高视框：基线 y=59、x 高 y=22、升部 y=5（与原大写字面同高），每个字形有自己的宽度 w；
// 渲染时整体 ×GLYPH_SCALE 放大（小写 x 高比大写矮，放大后与原 SUPERHUMAN 字标同等存在感、整行宽度相近），
// 笔画宽度反向缩放，屏幕上仍是 5.5px 细线。子笔画顺序 = 描画顺序。
const GLYPHS: Record<string, { w: number; d: string }> = {
  v: { w: 42, d: 'M 4 22 L 21 59 L 38 22' },
  i: { w: 14, d: 'M 7 22 L 7 59 M 7 9.5 L 7 10' },
  d: { w: 46, d: 'M 41.5 40.5 A 18.5 18.5 0 0 0 4.5 40.5 A 18.5 18.5 0 0 0 41.5 40.5 M 41.5 5 L 41.5 59' },
  e: { w: 46, d: 'M 4.5 40.5 L 41.5 40.5 A 18.5 18.5 0 1 0 37.2 52.4' },
  o: { w: 46, d: 'M 23 22 A 18.5 18.5 0 0 0 23 59 A 18.5 18.5 0 0 0 23 22' },
  '-': { w: 28, d: 'M 5 41 L 23 41' },
  s: { w: 39, d: 'M 32.6 27.5 C 26.4 21.3, 7.9 20.6, 6.2 28.9 C 4.6 36.4, 14.1 38.4, 19.7 39.8 C 25.8 41.2, 34.8 43.9, 33.1 51.5 C 31.4 59, 9.6 60.4, 4 52.8' },
  h: { w: 41, d: 'M 5 5 L 5 59 M 5 38 C 5 27, 12 22, 20.5 22 C 30 22, 36 27, 36 37 L 36 59' },
  t: { w: 26, d: 'M 12 8 L 12 59 M 3 22 L 23 22' },
  c: { w: 42, d: 'M 37.2 28.6 A 18.5 18.5 0 1 0 37.2 52.4' },
  r: { w: 28, d: 'M 5 22 L 5 59 M 5 38 C 5 27, 13 22, 24 23' },
  a: { w: 46, d: 'M 41.5 40.5 A 18.5 18.5 0 0 0 4.5 40.5 A 18.5 18.5 0 0 0 41.5 40.5 M 41.5 22 L 41.5 59' },
  f: { w: 26, d: 'M 23 7 C 17 4, 11 6, 11 14 L 11 59 M 3 22 L 22 22' },
};

const WORD = 'video-shotcraft';
const GLYPH_SCALE = 1.3; // 视框 → 屏幕放大倍数
const GLYPH_H = 64 * GLYPH_SCALE; // 字行高（屏幕 px）
const TRACK = 30; // 字距（屏幕 px）：大字距是本卡身份
const START = 16;   // 全字符统一起画帧（无错峰）
const DUR = 52;     // 全字符统一画完帧数（pathLength 归一→同帧齐收）
export const LETTERSPACE_MATERIALIZE_DURATION = 105; // 静置 16f + 描画 52f + 终态 hold 37f（>1s，R1）

const HORIZON = 640; // 水天线 y
const MARK_Y = 470; // 字标中心 y（落在霞光区，水天线之上）
// 描画曲线：起笔缓、中段快、收笔略长（手写的落笔→行笔→收笔）
const strokeEase = bezier(0.5, 0, 0.3, 1);

// 程序山脊：若干正弦叠加的确定性轮廓（无随机源）
const ridge = (seed: number, base: number, amp: number) => {
  const pts: string[] = [];
  for (let x = -60; x <= 1980; x += 20) {
    const y =
      base -
      amp * (0.55 * Math.sin(x / 233 + seed) + 0.3 * Math.sin(x / 97 + seed * 2.1) + 0.15 * Math.sin(x / 41 + seed * 3.7) + 0.6);
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return `M -60 ${HORIZON + 2} L ${pts.join(' L ')} L 1980 ${HORIZON + 2} Z`;
};
const FAR_RIDGE = ridge(1.3, HORIZON, 70);
const NEAR_RIDGE = ridge(4.1, HORIZON + 2, 34);

// 水面细波光：确定性的若干条横向短亮线，缓慢左右漂移
const GLINTS = Array.from({ length: 22 }, (_, i) => {
  const s = Math.sin(i * 91.7) * 43758.5453;
  const r = s - Math.floor(s);
  const s2 = Math.sin(i * 47.3 + 5) * 24634.6345;
  const r2 = s2 - Math.floor(s2);
  const depth = (i + 0.5) / 22; // 0 = 近水天线，1 = 近画面底
  return {
    y: HORIZON + 8 + depth * depth * 400,
    x: 960 + (r - 0.5) * (500 + depth * 1100),
    w: 40 + r2 * 120 + depth * 160,
    a: 0.05 + (1 - depth) * 0.12,
    ph: r * 6.28,
  };
});

const Word: React.FC<{ e: number; glowAmt: number }> = ({ e, glowAmt }) => (
  <div style={{ display: 'flex', gap: TRACK, alignItems: 'center' }}>
    {WORD.split('').map((ch, li) => {
      const g = GLYPHS[ch];
      return (
        <svg key={li} width={g.w * GLYPH_SCALE} height={GLYPH_H} viewBox={`0 0 ${g.w} 64`} style={{ overflow: 'visible', display: 'block' }}>
          {e > 0 && (
            <path
              d={g.d}
              fill="none"
              stroke="#f6f3fa"
              strokeWidth={5.5 / GLYPH_SCALE}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - e}
              style={{
                filter: `drop-shadow(0 0 ${(5 + glowAmt * 10) / GLYPH_SCALE}px rgba(245,225,240,${0.3 + glowAmt * 0.38}))`,
              }}
            />
          )}
        </svg>
      );
    })}
  </div>
);

export const LetterspaceMaterialize: React.FC = () => {
  const frame = useCurrentFrame();

  // 全字符共享同一进度：同时开始、同时完成
  const e = ramp(frame, START, DUR, strokeEase);
  // 画完瞬间轻微提亮回落（结晶收束）——全字符同帧发生；收笔前 30% 逐渐蓄亮
  const rise = ramp(frame, START + DUR * 0.7, DUR * 0.3, EASE.swift);
  const fall = 1 - ramp(frame, START + DUR, 14, EASE.out);
  const glowAmt = e >= 1 ? fall : rise;

  // 背景极缓推近：远山 1→1.02，近景/水面 1→1.035（微视差）；字标不动
  const push = ramp(frame, 0, LETTERSPACE_MATERIALIZE_DURATION, EASE.smooth);
  const sFar = 1 + 0.02 * push;
  const sNear = 1 + 0.035 * push;
  // 霞光随结晶微微升亮（字标"点亮"了天边）
  const dawn = 0.85 + 0.15 * ramp(frame, START + DUR * 0.5, DUR, EASE.out);

  return (
    <AbsoluteFill style={{ background: '#120f24', overflow: 'hidden' }}>
      {/* 天空 + 远山（远层） */}
      <AbsoluteFill style={{ transform: `scale(${sFar})`, transformOrigin: `50% ${HORIZON}px` }}>
        <AbsoluteFill
          style={{
            background:
              `linear-gradient(180deg, #17153a 0%, #24204f 24%, #3a2f63 42%, #5f4270 53%, #8a5878 ${((HORIZON - 14) / 1080) * 100}%, #1c1838 ${(HORIZON / 1080) * 100}%, #0b0a17 100%)`,
          }}
        />
        {/* 宽幅地平线霞光：椭圆铺出画外，两端无断口 */}
        <div
          style={{
            position: 'absolute', left: -480, right: -480, top: HORIZON - 260, height: 520, opacity: dawn,
            background: 'radial-gradient(ellipse 50% 50% at 54% 50%, rgba(246,168,170,0.42) 0%, rgba(214,130,160,0.2) 35%, rgba(140,100,170,0.06) 65%, rgba(0,0,0,0) 80%)',
          }}
        />
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="lm-far" x1="0" y1={HORIZON - 120} x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#5a4473" />
              <stop offset="1" stopColor="#3e3260" />
            </linearGradient>
          </defs>
          {/* 远山：偏亮、偏霞色（大气透视） */}
          <path d={FAR_RIDGE} fill="url(#lm-far)" opacity={0.75} style={{ filter: 'blur(1.2px)' }} />
        </svg>
      </AbsoluteFill>

      {/* 近山 + 水面（近层，推得更快） */}
      <AbsoluteFill style={{ transform: `scale(${sNear})`, transformOrigin: `50% ${HORIZON}px` }}>
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <path d={NEAR_RIDGE} fill="#271f43" />
        </svg>
        {/* 水面：天光倒影（霞光在水里拉长变淡）+ 渐深到画面底 */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: HORIZON, bottom: 0,
            background:
              'radial-gradient(ellipse 46% 40% at 54% 0%, rgba(230,150,165,0.22) 0%, rgba(150,105,160,0.08) 50%, rgba(0,0,0,0) 80%), ' +
              'linear-gradient(180deg, #2a2346 0%, #18142e 30%, #0d0b1a 100%)',
          }}
        />
        {/* 水天线一道极细亮边 */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: HORIZON - 1, height: 2,
            background: 'linear-gradient(90deg, rgba(255,200,210,0) 8%, rgba(255,200,210,0.35) 54%, rgba(255,200,210,0) 92%)',
          }}
        />
        {/* 细波光：缓慢漂移 */}
        {GLINTS.map((g, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', top: g.y, height: 1.5, borderRadius: 1, width: g.w,
              left: g.x - g.w / 2 + Math.sin(frame / 38 + g.ph) * 14,
              background: `linear-gradient(90deg, rgba(255,215,225,0), rgba(255,215,225,${(g.a * (0.75 + 0.25 * Math.sin(frame / 23 + g.ph))).toFixed(3)}), rgba(255,215,225,0))`,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* 字标水面倒影：以水天线为轴镜像，低透明 + 轻虚 + 向下渐隐 */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 2 * HORIZON - MARK_Y - GLYPH_H / 2, height: GLYPH_H,
          display: 'flex', justifyContent: 'center',
          transform: 'scaleY(-1)', opacity: 0.12, filter: 'blur(2.4px)',
          WebkitMaskImage: 'linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.2) 100%)',
          maskImage: 'linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.2) 100%)',
        }}
      >
        <Word e={e} glowAmt={glowAmt * 0.5} />
      </div>

      {/* 大字距字标：全字符并行连续描画 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: MARK_Y - GLYPH_H / 2, height: GLYPH_H, display: 'flex', justifyContent: 'center' }}>
        <Word e={e} glowAmt={glowAmt} />
      </div>

      <Vignette strength={0.45} inner={0.5} color="#05040c" cy={0.5} />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
