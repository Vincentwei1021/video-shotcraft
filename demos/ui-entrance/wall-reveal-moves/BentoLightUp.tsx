import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Card } from '../../_fixtures/Fixtures';
import { BRAND, PITCH, ShotcraftMark } from '../../_fixtures/Brand';
import { Backdrop, FONT, Grain } from '../../_fixtures/Polish';

// bento-light-up：暗场里 3×2 bento 墙压暗待命，随节拍逐格点亮——
// 边框流光先描一圈（琥珀），格内内容随后提亮上浮弹出；六格全亮后整体微推收住。
// 节拍：0–20 建立(hold) → 每格间隔 12f 依次激活(描边 8f + 内容弹出 8f)
//       → ~96f 全亮 → 96–121 scale 1→1.04 缓推 → 121–150 静止收尾。
// 质感改版：
// - 真 bento：两行宽窄互补（600/420/420 ↔ 420/420/600），不再是六张等大格子；
// - 卡面用暗色出版级 Card（tone=dark），暗场品牌段里不再"白卡亮瞎"，点亮读作通电而非换色；
// - 流光描边改为"彗星"：亮头 + 渐隐尾的描边段跑一圈后收成常亮细边，辉光只在描边上（不外溢成方框）；
// - 标题改为眉标 + 主标题的字阶；暗场柔光底（暖色余光）+ 暗角 + 颗粒。
// 品牌：眉标 = video-shotcraft 标志 + 小写字标（琥珀），主标题 = PITCH 口号「Every shot, tuned in one place.」。
export const BENTO_LIGHT_UP_DURATION = 150;

const AMBER = '#e8b45e';
const FIRST = 20; // 首格激活帧
const GAP = 12; // 格间节拍
const CELL_H = 330;
const GUT = 44;
const U = 480; // 宽窄格基准：宽 1.25U=600，窄 0.875U=420，每行 1440 + 2 道沟（宽窄差再大，卡内字阶会明显不一）
const ROW_W = U * 3 + GUT * 2;
const LEFT = (1920 - ROW_W) / 2;
const TOP = (1080 - (CELL_H * 2 + GUT)) / 2 + 44;
const WIDTHS = [
  [1.25, 0.875, 0.875],
  [0.875, 0.875, 1.25],
];
const CELLS = WIDTHS.flatMap((row, r) => {
  let x = LEFT;
  return row.map((k) => {
    const w = k * U;
    const c = { x, y: TOP + r * (CELL_H + GUT), w };
    x += w + GUT;
    return c;
  });
});

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const Cell: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const start = FIRST + i * GAP;
  const { x, y, w } = CELLS[i];

  // ① 边框流光：彗星段（长 22% 周长）沿 pathLength=100 跑一圈，8f；随后整圈细边常亮
  const draw = interpolate(frame, [start, start + 8], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  // 描完后流光退火：琥珀亮边 → 弱化成常亮细边
  const strokeFade = interpolate(frame, [start + 12, start + 26], [1, 0.4], { ...clamp, easing: Easing.out(Easing.quad) });
  const ring = interpolate(frame, [start + 2, start + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });

  // ② 内容提亮 + 上浮弹出：描边过半后接力，8f 弹出（back-out 带一点过冲）
  const lit = interpolate(frame, [start + 6, start + 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const rise = interpolate(frame, [start + 6, start + 14], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 1.4, 0.5, 1) });
  const opacity = 0.18 + 0.82 * lit;
  const ty = 20 * (1 - rise);
  // seed 正弦哈希做每格微差（点亮瞬间的辉光强度略有随机感）
  const jitter = Math.abs((Math.sin(i * 127.3) * 43758.5453) % 1);
  const pulse = lit * (1 - lit) * 4; // 点亮中段最亮的辉光脉冲
  const head = 100 * draw; // 彗星头位置（周长百分比）
  const TAIL = 22;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: CELL_H }}>
      {/* 暗态卡 + 点亮后的内容（同一张卡，靠 opacity/translateY 提亮浮出） */}
      <div style={{ opacity, transform: `translateY(${ty.toFixed(2)}px)`, borderRadius: 14 }}>
        <Card w={w} h={CELL_H} seed={i + 1} tone="dark" />
        {/* 点亮瞬间卡内一层暖光（裁在圆角内，脉冲后归零） */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none',
          background: `radial-gradient(90% 70% at 50% 0%, rgba(232,180,94,${(0.16 * pulse * (0.8 + jitter * 0.4)).toFixed(3)}), rgba(232,180,94,0) 70%)`,
        }} />
      </div>
      {/* 边框流光：SVG rect 描边 */}
      {draw > 0 && (
        <svg width={w} height={CELL_H} viewBox={`0 0 ${w} ${CELL_H}`} style={{ position: 'absolute', left: 0, top: ty, overflow: 'visible' }}>
          <defs>
            <filter id={`blu-glow-${i}`} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={4 + jitter * 2} />
            </filter>
          </defs>
          {/* 常亮细边：随彗星走过逐段出现，退火后保持 */}
          <rect
            x={0.75} y={0.75} width={w - 1.5} height={CELL_H - 1.5} rx={14} fill="none"
            stroke={AMBER} strokeWidth={1.5} pathLength={100} strokeDasharray={100} strokeDashoffset={100 * (1 - draw)}
            opacity={ring * strokeFade}
          />
          {/* 彗星：辉光层 + 亮芯层，跑完一圈后随退火淡去 */}
          {[0, 1].map((k) => (
            <rect
              key={k}
              x={1.5} y={1.5} width={w - 3} height={CELL_H - 3} rx={14} fill="none"
              stroke={k ? '#ffe3ae' : AMBER}
              strokeWidth={k ? 2.5 : 6}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${TAIL} ${100 - TAIL}`}
              strokeDashoffset={TAIL - head}
              opacity={(1 - interpolate(frame, [start + 8, start + 16], [0, 1], clamp)) * (k ? 1 : 0.8)}
              filter={k ? undefined : `url(#blu-glow-${i})`}
            />
          ))}
        </svg>
      )}
    </div>
  );
};

export const BentoLightUp: React.FC = () => {
  const frame = useCurrentFrame();

  // ③ 六格全亮(~96f)后整体缓推 scale 1→1.04，25f 收住，之后真静止
  const push = interpolate(frame, [96, 121], [1, 1.04], { ...clamp, easing: Easing.bezier(0.33, 0, 0.2, 1) });

  // 标题随首格点亮微微提亮，交代场景
  const titleLit = interpolate(frame, [FIRST, FIRST + 20], [0.25, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  // 全亮后地面暖光稍起
  const allLit = interpolate(frame, [FIRST + 5 * GAP + 6, FIRST + 5 * GAP + 30], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.1 }} accent={AMBER} grain={0} vignette={0.55} />
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse 50% 40% at 50% 62%, rgba(232,180,94,0.10), rgba(232,180,94,0) 70%)',
        opacity: 0.3 + 0.7 * allLit,
      }} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '960px 540px' }}>
        <div style={{ position: 'absolute', left: LEFT, top: TOP - 132, fontFamily: FONT.sans, opacity: titleLit }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 18 }}>
            <ShotcraftMark size={24} tone="dark" />
            <span style={{ fontFamily: BRAND.font, fontSize: 17, fontWeight: 700, letterSpacing: '0.03em', color: AMBER, opacity: 0.9, lineHeight: 1 }}>{BRAND.name}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 56, fontWeight: 700, letterSpacing: '-0.03em', color: '#f1efe9', lineHeight: 1 }}>
            {PITCH.en.taglines[2]}
          </div>
        </div>
        {CELLS.map((_, i) => (
          <Cell key={i} i={i} frame={frame} />
        ))}
      </div>
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
