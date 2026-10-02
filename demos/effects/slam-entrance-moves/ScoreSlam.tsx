// 比分砸落入场（score-slam）——体育转播比分弹窗式 slam：比分卡从镜头前 2.6 倍大小加速砸到屏心，
// 落点帧同帧起爆三件套（冲击环 + 碎片火花 + 震屏），砸落带一次压缩过冲回弹落定。
//
// 第二轮重设计（石墨夜场 · 杯赛终场比分）：
// - look = graphite（近单色暗场，香槟金点缀）。舞台是夜场球场：画面顶缘四盏泛光灯 0–7f 依次"啪"地亮起
//   （带下射光锥与雾），远处看台是一层虚化暖色光点。主角是一张 1240×400 的终场比分卡：
//   两队徽章 + 队名（主队 Shotcraft 用 video-shotcraft 标志作队徽，客队 Keyframes）、220px 粗体 tabular 比分「3 – 2」、
//   顶部金色「FULL TIME · 90+4′」签、底部赛事信息行。
// - 节奏「悬 — 砸 — 炸 — 落 — 读」：0–9f 卡片悬在镜头前（2.75→2.6、虚化 10px、上提蓄力）→
//   9–15f 六帧 ease-in 加速砸落（scale 2.6→0.965、rotate 5°→0、虚化归零）→ 15f 落点帧：
//   冲击环（白芯 + 金辉，扩散 out-cubic、消散线性解耦）+ 14 片玻璃/金箔碎片抛物线飞散 + 16 道火花 +
//   竖向偏置震屏 18px 指数衰减 5f + 2f 白闪 → 15–26f 弹簧回弹到 1。
// - 跟随：两个比分数字晚 3f / 6f 各自"二次落地"（1.16→1 弹簧），胜方数字下划金线擦出；
//   FULL TIME 签从卡顶滑出；之后标题「Shotcraft lifts the Cup.」逐词升起、副句（评价语）淡入。
//
// 时间表（30fps，共 135f）：
//   0–9     预备：泛光灯依次亮起；比分卡悬在镜头前虚化、缓慢上提
//   9–15    砸落（主动作 6f，ease-in）
//   15–31   落点三件套：环 16f / 碎片 20f / 火花 10f / 震屏 5f / 白闪 2f
//   15–26   卡片压缩回弹；18f、21f 比分数字二次落地；24f FULL TIME 签滑出；28f 胜方金线
//   36–64   标题逐词升起 + 副句淡入
//   64–135  hold：泛光灯极缓呼吸、推镜 1→1.02，余波全部归零
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, springAt } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const SCORE_SLAM_DURATION = 135;

const L = LOOKS.graphite;
const GOLD = L.accent2;
const IMPACT = 15; // 落点帧
const SLAM0 = 9; // 砸落起点
const CW = 1240;
const CH = 400;
const CX = 960;
const CY = 500; // 卡片中心
const EASE_IN_QUAD = bezier(0.55, 0.085, 0.68, 0.53);

const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 碎片：多边形玻璃 / 金箔片，抛物线（先飞出再下坠）+ 自旋 + 翻面
const SHARDS = Array.from({ length: 14 }, (_, i) => {
  const ang = (i / 14) * Math.PI * 2 + (rnd(i + 3) - 0.5) * 0.5;
  return {
    ang, dist: 280 + rnd(i + 11) * 300, size: 22 + rnd(i + 23) * 26, spin: (rnd(i + 31) - 0.5) * 620,
    gold: i % 3 === 0, poly: [0, 1, 2, 3].map((k) => `${(50 + Math.cos(k * 1.7 + i) * (30 + rnd(i * 4 + k) * 20)).toFixed(0)}% ${(50 + Math.sin(k * 1.7 + i) * (30 + rnd(i * 5 + k) * 20)).toFixed(0)}%`).join(', '),
  };
});
const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  ang: (i / 16) * Math.PI * 2 + (rnd(i + 61) - 0.5) * 0.4, dist: 360 + rnd(i + 71) * 320, len: 40 + rnd(i + 81) * 50,
}));
const LIGHTS = [250, 600, 1320, 1670];

const Crest: React.FC<{ code: React.ReactNode; filled: boolean }> = ({ code, filled }) => (
  <div style={{
    width: 108, height: 108, borderRadius: 54, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: filled ? 'linear-gradient(180deg, #f6f5f1, #cfcdc6)' : 'transparent',
    border: filled ? 'none' : `3px solid ${alpha(L.ink, 0.55)}`,
    boxShadow: filled ? `0 8px 20px -8px #000, inset 0 -3px 0 ${alpha('#000', 0.12)}` : 'none',
    font: `850 30px ${FONT.sans}`, letterSpacing: '0.02em', color: filled ? '#141416' : L.ink,
  }}>
    {code}
  </div>
);

export const ScoreSlam: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 卡片：0–9 悬停蓄力（2.75→2.6、上提），9–15 加速砸落到 0.965，15 起弹簧回 1 ——
  const hover = ramp(frame, 0, SLAM0, EASE.smooth);
  const drop = ramp(frame, SLAM0, IMPACT - SLAM0, EASE_IN_QUAD);
  const preScale = mix(2.75, 2.6, hover);
  const settle = springAt(frame, IMPACT, { damping: 14, stiffness: 260 });
  const scale = frame < IMPACT ? mix(preScale, 0.965, drop) : mix(0.965, 1, settle);
  const rot = mix(5, 0, drop);
  const dy = frame < IMPACT ? mix(-40 - 30 * hover, 0, drop) : 0;
  const cardOp = ramp(frame, 0, 6, EASE.out) * mix(0.6, 1, drop); // 悬停期半透，背后泛光灯亮起看得见
  const height01 = Math.min(1, Math.max(0, (scale - 1) / 1.75));
  const dof = height01 * 10; // 离镜头越近越虚
  const cardShadow =
    `0 ${(2 + height01 * 14).toFixed(1)}px ${(6 + height01 * 24).toFixed(1)}px ${alpha('#000', 0.5 - height01 * 0.25)}, ` +
    `0 ${(40 + height01 * 80).toFixed(1)}px ${(90 + height01 * 120).toFixed(1)}px -20px ${alpha('#000', 0.85 - height01 * 0.3)}, ` +
    `inset 0 1px 0 ${alpha('#ffffff', 0.14)}, inset 0 0 0 1px ${alpha('#ffffff', 0.09)}`;

  // —— 震屏：落点帧起 5f，18px 指数衰减，偏竖向（第一帧向下砸）——
  let shakeX = 0;
  let shakeY = 0;
  if (frame >= IMPACT && frame < IMPACT + 5) {
    const t = frame - IMPACT;
    const amp = 18 * Math.exp(-t * 0.85);
    shakeX = amp * 0.4 * (rnd(frame * 7 + 1) * 2 - 1);
    shakeY = amp * (t === 0 ? 1 : rnd(frame * 13 + 2) * 2 - 1);
  }
  const flash = frame >= IMPACT && frame < IMPACT + 3 ? [0.22, 0.12, 0.04][frame - IMPACT] : 0;

  // —— 冲击环：扩散 out-cubic，消散走线性帧时间（解耦，否则刚扩开就淡没）——
  const ringT = ramp(frame, IMPACT, 16, EASE.snappy);
  const ringLin = ramp(frame, IMPACT, 16, EASE.linear);
  const ringOn = frame >= IMPACT && frame < IMPACT + 16;
  const ringD = mix(120, 1500, ringT);
  const ringOp = ringLin < 0.6 ? mix(1, 0.65, ringLin / 0.6) : mix(0.65, 0, (ringLin - 0.6) / 0.4);
  const ringW = mix(9, 1.5, ringT);

  // —— 碎片 20f / 火花 10f ——
  const shT = ramp(frame, IMPACT, 20, EASE.out);
  const shLin = ramp(frame, IMPACT, 20, EASE.linear);
  const shOn = frame >= IMPACT && frame < IMPACT + 20;
  const spT = ramp(frame, IMPACT, 10, bezier(0.1, 0.9, 0.2, 1));
  const spLin = ramp(frame, IMPACT, 10, EASE.linear);
  const spOn = frame >= IMPACT && frame < IMPACT + 10;

  // —— 跟随：比分数字二次落地、FULL TIME 签、胜方金线 ——
  const digitPop = (start: number) => (frame < start ? 0 : springAt(frame, start, { damping: 13, stiffness: 300 }));
  const d1 = digitPop(IMPACT + 3);
  const d2 = digitPop(IMPACT + 6);
  const tag = ramp(frame, IMPACT + 9, 12, EASE.snappy);
  const underline = ramp(frame, IMPACT + 13, 14, EASE.snappy);

  const push = 1 + 0.02 * ramp(frame, IMPACT, 120, EASE.swift);
  const breathe = 0.92 + 0.08 * Math.sin(frame / 22);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: -0.05 }} fill={null} intensity={0.8} horizon={0.8}>
        {/* 远处看台：虚化暖色光点 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 640, height: 440, filter: 'blur(3px)' }}>
          <Dust look={L} count={60} seed={7} drift={0.08} opacity={0.55} color="#f2d9a8" />
        </div>
      </Stage>

      {/* 泛光灯：0–7f 依次亮起（亮 → 闪暗 → 亮），下射光锥 + 雾 */}
      {LIGHTS.map((x, i) => {
        const t0 = i * 2;
        const on = frame < t0 ? 0 : frame < t0 + 1 ? 1 : frame < t0 + 2 ? 0.35 : 1;
        const o = on * breathe;
        return (
          <React.Fragment key={i}>
            <div style={{
              position: 'absolute', left: x - 380, top: -40, width: 760, height: 1100, opacity: o,
              background: `radial-gradient(ellipse 34% 100% at 50% 0%, ${alpha('#fff4dc', 0.13)} 0%, ${alpha('#fff4dc', 0.05)} 45%, ${alpha('#fff4dc', 0)} 80%)`,
            }} />
            <div style={{
              position: 'absolute', left: x - 160, top: -150, width: 320, height: 300, borderRadius: '50%', opacity: o,
              background: `radial-gradient(circle, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#fff1d2', 0.45)} 18%, ${alpha('#fff1d2', 0)} 66%)`,
            }} />
          </React.Fragment>
        );
      })}

      <div style={{ position: 'absolute', inset: -40, transform: `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px)` }}>
        <div style={{ position: 'absolute', inset: 40, transform: `scale(${push.toFixed(5)})` }}>
          {/* 冲击环：柔辉（金）+ 白芯细环 */}
          {ringOn && (
            <>
              <div style={{
                position: 'absolute', left: CX - ringD / 2, top: CY - ringD / 2, width: ringD, height: ringD, borderRadius: '50%', opacity: ringOp,
                boxShadow: `0 0 ${(30 + ringT * 40).toFixed(0)}px ${(6 + ringT * 8).toFixed(0)}px ${alpha(GOLD, 0.35)}, inset 0 0 ${(30 + ringT * 40).toFixed(0)}px ${alpha(GOLD, 0.22)}`,
              }} />
              <div style={{
                position: 'absolute', left: CX - ringD / 2, top: CY - ringD / 2, width: ringD, height: ringD, borderRadius: '50%', opacity: ringOp,
                border: `${ringW.toFixed(2)}px solid ${alpha('#fffaf0', 0.95)}`, boxSizing: 'border-box',
              }} />
            </>
          )}

          {/* 火花：沿径向拉长的细亮线 */}
          {spOn && SPARKS.map((s, i) => {
            const r = 160 + s.dist * spT;
            const len = s.len * (1 - spLin) + 6;
            return (
              <div key={i} style={{
                position: 'absolute', left: CX + Math.cos(s.ang) * r - len / 2, top: CY + Math.sin(s.ang) * r * 0.8 - 2, width: len, height: 4, borderRadius: 2,
                background: `linear-gradient(90deg, ${alpha('#fff3d6', 0)}, #fffaf0)`, transform: `rotate(${((s.ang * 180) / Math.PI).toFixed(1)}deg)`,
                opacity: 1 - spLin, boxShadow: `0 0 10px ${alpha(GOLD, 0.8)}`,
              }} />
            );
          })}

          {/* 比分卡 */}
          <div style={{
            position: 'absolute', left: CX - CW / 2, top: CY - CH / 2, width: CW, height: CH, borderRadius: 34,
            background: `linear-gradient(180deg, #1f2024 0%, ${L.surface} 100%)`, boxShadow: cardShadow, opacity: cardOp,
            transform: `translateY(${dy.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`,
            filter: dof > 0.4 ? `blur(${dof.toFixed(2)}px)` : undefined, fontFamily: FONT.sans, color: L.ink,
          }}>
            {/* 顶缘金色发丝光 */}
            <div style={{ position: 'absolute', left: 120, right: 120, top: 0, height: 2, background: `linear-gradient(90deg, ${alpha(GOLD, 0)}, ${alpha(GOLD, 0.8)}, ${alpha(GOLD, 0)})` }} />
            {/* FULL TIME 签：从卡顶滑出 */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: -26, display: 'flex', justifyContent: 'center', overflow: 'hidden', height: 60 }}>
              <div style={{
                height: 52, padding: '0 24px', borderRadius: 26, background: GOLD, color: '#17130a', display: 'flex', alignItems: 'center',
                font: `800 24px ${FONT.mono}`, letterSpacing: '0.12em', transform: `translateY(${mix(64, 0, tag).toFixed(2)}px)`,
                boxShadow: `0 10px 30px -10px ${alpha(GOLD, 0.8)}`,
              }}>
                FULL TIME · 90+4′
              </div>
            </div>
            {/* 主队 */}
            <div style={{ position: 'absolute', left: 70, top: 88, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: 220 }}>
              <Crest code={<ShotcraftMark size={64} tone="light" />} filled />
              <div style={{ font: `750 44px ${FONT.sans}`, letterSpacing: '-0.03em' }}>{BRAND.short}</div>
            </div>
            {/* 客队 */}
            <div style={{ position: 'absolute', right: 70, top: 88, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: 220 }}>
              <Crest code="KEY" filled={false} />
              <div style={{ font: `750 44px ${FONT.sans}`, letterSpacing: '-0.03em', color: L.ink2, whiteSpace: 'nowrap' }}>Keyframes</div>
            </div>
            {/* 比分 */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 58, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 56, font: `860 220px ${FONT.sans}`, letterSpacing: '-0.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              <div style={{ position: 'relative', transform: `scale(${mix(1.16, 1, d1).toFixed(4)})` }}>
                3
                <div style={{ position: 'absolute', left: 6, right: 6, bottom: -6, height: 8, borderRadius: 4, background: GOLD, transformOrigin: '0 50%', transform: `scaleX(${underline.toFixed(4)})`, boxShadow: `0 0 18px ${alpha(GOLD, 0.6)}` }} />
              </div>
              <div style={{ width: 54, height: 12, borderRadius: 6, background: alpha(L.ink, 0.35) }} />
              <div style={{ transform: `scale(${mix(1.16, 1, d2).toFixed(4)})`, color: L.ink2 }}>2</div>
            </div>
            {/* 赛事信息行 */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center', font: `600 26px ${FONT.mono}`, letterSpacing: '0.14em', color: L.ink3 }}>
              MOTION CUP FINAL · BUILT ON REMOTION
            </div>
          </div>

          {/* 碎片（画在卡上方，像从撞击面崩出） */}
          {shOn && SHARDS.map((d, i) => {
            const dx = Math.cos(d.ang) * d.dist * shT;
            const dyy = Math.sin(d.ang) * d.dist * 0.75 * shT + 260 * shLin * shLin; // 先飞出再下坠
            const s = d.size * (1 - 0.55 * shLin);
            const flip = Math.abs(Math.cos(shLin * Math.PI * 1.6 + i));
            return (
              <div key={i} style={{
                position: 'absolute', left: CX + Math.cos(d.ang) * 300 + dx - s / 2, top: CY + Math.sin(d.ang) * 120 + dyy - s / 2, width: s, height: s,
                clipPath: `polygon(${d.poly})`,
                background: d.gold ? `linear-gradient(135deg, #8a6a2a, ${GOLD} 45%, #fff3cf 55%, #9c7a34)` : `linear-gradient(135deg, ${alpha('#ffffff', 0.9)}, ${alpha('#c9ccd4', 0.55)})`,
                opacity: shLin < 0.7 ? 1 : 1 - (shLin - 0.7) / 0.3,
                transform: `rotate(${(d.spin * shT).toFixed(1)}deg) scaleY(${Math.max(0.15, flip).toFixed(3)})`,
                filter: i % 4 === 0 ? 'blur(2px)' : undefined,
              }} />
            );
          })}

          {/* 标题 + 副句 */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: CY + CH / 2 + 92, textAlign: 'center', font: `800 84px ${FONT.sans}`, letterSpacing: '-0.04em', color: L.ink, lineHeight: 1 }}>
            <TextReveal text="Shotcraft lifts the" by="word" variant="rise" start={36} each={16} gap={4} />
            <span style={{ color: GOLD }}>
              <TextReveal text=" Cup." by="word" variant="rise" start={48} each={16} gap={4} />
            </span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: CY + CH / 2 + 200, textAlign: 'center', font: `500 36px ${FONT.sans}`, color: L.ink2, letterSpacing: '-0.01em', opacity: ramp(frame, 52, 14, EASE.out), transform: `translateY(${mix(12, 0, ramp(frame, 52, 16, EASE.out)).toFixed(2)}px)` }}>
            Camera moves I would have keyframed for a week.
          </div>
        </div>
      </div>

      {/* 落点白闪 */}
      {flash > 0 && <div style={{ position: 'absolute', inset: 0, background: '#fffaf0', opacity: flash, mixBlendMode: 'screen' }} />}
    </AbsoluteFill>
  );
};
