// C 式 虚焦接力（focus-handoff）——前景滑出焦平面（blur 渐深）同时后景反向收焦入场，
// 焦点当剪辑点。同页面内区块→区块 / 文档长页游览的分段转场。
//
// 第二轮重设计（暖沙 · 浅景深 rack focus）：
// - look = sand（米色 · 赤陶）。不再是两张整页截图叠化，而是把同一张长页（projects-full）的两个区块
//   拆成**两个景深平面**：近平面 A =「01 Agents & Dev Tools」区块（card1/card2 真实卡片纹理），
//   远平面 B =「03 Perception & Sensing」区块（card6/7/8）。开场 B 就在 A 身后——缩小 0.9、虚 14px、
//   降饱和，第 3 张卡从 A 的空槽里透出来：观众第一帧就看见"后面还有一层"，焦点接力才可信。
// - 浅景深语言先立后用：最远处一层整页大虚化做散景底，画面右下角探进一张极虚的近景卡（焦外前景框边），
//   三层视差同向漂移（越近走得越多）。
// - 区块标题做成 112px 大字 + 赤陶色等宽章节号，和自己的平面同焦：A 标题随 A 一起失焦飘走，
//   B 标题随 B 收焦落位（文字比卡片晚 2f，层级跟随）。
// - 接力错峰 3f：A 先离焦（越过焦平面冲向镜头：1→1.08 放大、上飘 80px、虚到 16px、ease-in 淡出），
//   B 晚 3f 收焦（0.9→1、14px→0、饱和度回满、自下 40px 落位）；同帧起跑读作整屏糊掉。
//
// 时间表（30fps，共 120f）：
//   0–28    A 合焦 hold：三层极缓上漂（相机沿长页下移的惯性），前景虚块微动
//   28–48   A 离焦 20f（bezier 0.45,0,0.3,1：慢起、转折处最快）
//   31–55   B 收焦 24f（EASE.swift，A 残影 44f 退净时才真正合焦）；B 标题 36–54 收焦（A 标题 29–42 已上飘离场，两行大字不同时糊叠）
//   55–120  B 合焦 hold：极缓上漂 + 呼吸（1%），内容可读
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, FONT, bezier, ramp, mix, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const FOCUSHANDOFF_DUR = 120;

const L = LOOKS.sand;
const K = 1.42; // 卡片放大系数（纹理是 2x，1.42 仍在下采样区间，字边锐利）
const GAP = 36;
const CARD_W = 357.33 * K; // ≈ 507
const ROW_X = (1920 - (3 * CARD_W + 2 * GAP)) / 2;
const ROW_Y = 404;
const FOCUS_OUT = bezier(0.45, 0, 0.3, 1);

const cards = layout.projects.cards;
const SECTIONS = {
  a: { no: '01', title: 'Agents & Dev Tools', meta: '2 projects', cards: [cards[0], cards[1]] },
  b: { no: '03', title: 'Perception & Sensing', meta: '3 projects', cards: [cards[5], cards[6], cards[7]] },
};

// 一个景深平面：标题行 + 卡片行。标题与卡片共焦，但标题晚 lag 帧（由外部传入独立的 blur/位移）。
const Section: React.FC<{
  s: typeof SECTIONS.a; cardBlur: number; titleBlur: number; y: number; titleY: number; scale: number; opacity: number; titleOpacity: number; sat: number;
}> = ({ s, cardBlur, titleBlur, y, titleY, scale, opacity, titleOpacity, sat }) => (
  <div style={{ position: 'absolute', inset: 0, transform: `translateY(${y.toFixed(2)}px) scale(${scale.toFixed(4)})`, transformOrigin: '50% 58%', opacity }}>
    {/* 标题行 */}
    <div style={{
      position: 'absolute', left: ROW_X, right: ROW_X, top: 150 + titleY - y, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      opacity: titleOpacity, filter: titleBlur > 0.2 ? `blur(${titleBlur.toFixed(2)}px)` : undefined,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 34, fontWeight: 600, color: L.accent }}>{s.no}</span>
          <span style={{ width: 64, height: 2, background: alpha(L.accent, 0.6) }} />
          <span style={{ ...type(32, 500, { caps: true }), color: L.ink2, letterSpacing: '0.14em' }}>Projects</span>
        </div>
        <div style={{ ...type(112, 720), color: L.ink, letterSpacing: '-0.045em', whiteSpace: 'nowrap' }}>{s.title}</div>
      </div>
      <div style={{ ...type(40, 500), color: L.ink2, paddingBottom: 14, fontVariantNumeric: 'tabular-nums' }}>{s.meta}</div>
    </div>
    {/* 卡片行（真实卡片纹理） */}
    <div style={{ position: 'absolute', inset: 0, filter: cardBlur > 0.2 ? `blur(${cardBlur.toFixed(2)}px) saturate(${sat.toFixed(3)})` : sat < 0.995 ? `saturate(${sat.toFixed(3)})` : undefined }}>
      {s.cards.map((c, i) => (
        <Img key={c.file} src={staticFile(`textures/live/${c.file}`)} style={{
          position: 'absolute', left: ROW_X + i * (CARD_W + GAP), top: ROW_Y, width: CARD_W, borderRadius: 12 * K,
          boxShadow: softShadow(18, { color: L.shadow, strength: 1.4 }),
        }} />
      ))}
    </div>
  </div>
);

export const FocusHandoffTransition: React.FC = () => {
  const frame = useCurrentFrame();

  // 全程极缓上漂（相机沿长页下移），越近走得越多
  const drift = -18 * ramp(frame, 0, 120, EASE.linear);

  // ── A：近平面，越过焦平面冲向镜头 ──
  const aF = ramp(frame, 28, 20, FOCUS_OUT);
  const aT = ramp(frame, 30, 20, FOCUS_OUT); // 标题晚 2f
  const aMove = ramp(frame, 28, 22, EASE.swift);
  const aOp = 1 - ramp(frame, 30, 14, EASE.exit);

  // ── B：远平面，错开 3f 收焦落位 ──
  const bF = ramp(frame, 31, 24, EASE.swift); // 收焦后半程最软：A 的残影退净时 B 才真正合焦
  const bT = ramp(frame, 36, 18, EASE.out); // 标题等 A 标题基本离场再收焦（两行大字不同时糊在一起）
  const bMove = ramp(frame, 31, 24, EASE.out);
  const breathe = mix(1, 1.01, ramp(frame, 55, 65, EASE.smooth));

  // 前景虚块：极虚的搜索栏，近 → 视差最大
  const fgY = mix(0, -70, ramp(frame, 26, 30, EASE.swift)) + drift * 2.2;

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.0 }} fill={{ x: 0.9, y: 0.95 }}>
        {/* 最远层：整页大虚化散景底 */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.35, transform: `translateY(${(drift * 0.4 - 60 * aMove * 0.3).toFixed(2)}px)` }}>
          <Img src={staticFile('textures/live/projects-full.png')} style={{
            position: 'absolute', left: -320, top: -500, width: 2560, filter: 'blur(26px) saturate(0.7)',
          }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha(L.bg[0], 0.55)} 0%, ${alpha(L.bg[1], 0.25)} 50%, ${alpha(L.bg[2], 0.6)} 100%)` }} />
      </Stage>

      {/* B：远平面（先画，A 盖在上面） */}
      <Section s={SECTIONS.b}
        cardBlur={(1 - bF) * 14} titleBlur={(1 - bT) * 14}
        y={mix(40, 0, bMove) + drift} titleY={mix(40, 0, bT) + drift}
        scale={mix(0.9, 1, bF) * breathe}
        opacity={1} titleOpacity={ramp(frame, 36, 12, EASE.out)}
        sat={mix(0.55, 1, bF)}
      />
      {/* B 在 A 身后时的空气感：一层与舞台同色的薄雾，随收焦散去 */}
      <div style={{ position: 'absolute', inset: 0, background: alpha(L.bg[1], 0.42 * (1 - bF)), pointerEvents: 'none' }} />

      {/* A：近平面 */}
      {aOp > 0.002 && (
        <Section s={SECTIONS.a}
          cardBlur={aF * 16} titleBlur={aT * 16}
          y={mix(0, -80, aMove) + drift} titleY={mix(0, -150, ramp(frame, 29, 18, EASE.swift)) + drift}
          scale={mix(1, 1.08, aF)}
          opacity={aOp} titleOpacity={1 - ramp(frame, 30, 12, EASE.exit)}
          sat={1}
        />
      )}

      {/* 前景焦外：右下角探进来一张极虚的近景卡片（真实纹理 card10），立住浅景深 */}
      <Img src={staticFile('textures/live/card10.png')} style={{
        position: 'absolute', left: 1490, top: 930 + fgY, width: 357.33 * 1.9, borderRadius: 24, opacity: 0.92,
        filter: 'blur(16px)', boxShadow: softShadow(30, { color: L.shadow, strength: 1.2 }),
      }} />
    </AbsoluteFill>
  );
};
