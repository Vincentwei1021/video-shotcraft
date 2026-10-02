// color-block-step-wipe —— 纯色矩形按 steps() 离散阶跃吞屏转场
// 源：notion-ai 1.5–3.5s（蓝块中央阶跃生长）+ 26–27s（红块右下角斜向吃屏，携带页面卡）
// 核心语法：无缓动、逐帧硬跳的块状生长，像素游戏手感。
// 质感层（不碰阶跃语法）：被吞的是一页出版级文档（标题 / 正文 / 提示框 / 卡片），
// 色块是同色相微渐变 + 颗粒的"有材质的纯色"；每一跳的落地帧色块提亮一档（1 帧打击帧，
// 依旧离散）；徽章是带发丝线与两层软阴影的奶油色圆章；携带卡用飞行高度的软阴影。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';
import { FONT, tracking, softShadow, hairline, innerHighlight, Grain, Backdrop } from '../../_fixtures/Polish';

// demo 合计 150f：A 0–77f（生长 44f + 徽章 + hold）/ B 78–149f（3 跳 30f + 42f hold）
export const COLOR_BLOCK_STEP_WIPE_DURATION = 150;

const BLUE = '#2383e2';
const BLUE_HI = '#3a93ea'; // 打击帧（每跳落地那 1 帧）
const RED = '#e8503a';
const RED_HI = '#f0644f';

// 离散阶跃：frame 越过阈值瞬间跳到新值，无插值
const stepVal = (frame: number, steps: Array<[number, number]>): number => {
  let v = steps[0][1];
  for (const [f, val] of steps) {
    if (frame >= f) v = val;
  }
  return v;
};
// 是否正处于某一跳的落地帧（阶跃阈值当帧）
const onHit = (frame: number, hits: number[]) => hits.includes(frame);

// 色块材质：同色相上亮下沉的微渐变（hi→base→略深），硬边不羽化
const blockFill = (base: string, hi: string, hit: boolean) =>
  hit ? hi : `linear-gradient(165deg, ${hi} 0%, ${base} 45%, ${base} 100%)`;

// 蓝底上的圆形 AI 表情徽章：奶油色圆章 + 发丝线 + 顶部内高光 + 两层软阴影（蓝调）
const AiBadge: React.FC<{ scale: number; opacity: number }> = ({ scale, opacity }) => (
  <div
    style={{
      width: 170,
      height: 170,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 38% 30%, #fffaf2 0%, #fbf1e2 70%, #f3e6d2 100%)',
      border: hairline(0.1),
      boxSizing: 'border-box',
      opacity,
      transform: `scale(${scale})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `${innerHighlight(0.9)}, ${softShadow(28, { color: '#0b3a78', strength: 1.6 })}`,
    }}
  >
    <svg width={110} height={110} viewBox="0 0 110 110">
      <g stroke={G.ink1} strokeLinecap="round" fill="none">
        <path d="M25 30 Q34 23 44 28" strokeWidth={5.5} />
        <path d="M66 28 Q76 23 85 30" strokeWidth={5.5} />
        <path d="M33 68 Q55 86 77 68" strokeWidth={6.5} />
      </g>
      <ellipse cx={36} cy={46} rx={7} ry={8.5} fill={G.ink1} />
      <ellipse cx={74} cy={46} rx={7} ry={8.5} fill={G.ink1} />
      <circle cx={38.5} cy={43} r={2.2} fill="#fffaf2" />
      <circle cx={76.5} cy={43} r={2.2} fill="#fffaf2" />
    </svg>
  </div>
);

// 被吞的文档页（Notion 式原生排版）：标题 / 元信息 / 正文 / 提示框 / 两张卡
const PARAS = [
  'Every launch starts as a page. Draft the brief, assign owners, and let the team comment inline instead of chasing threads.',
  'This quarter we are consolidating release notes, the pricing refresh and the onboarding rewrite into a single plan.',
];
const DocPage: React.FC<{ title: string; icon: string; cards?: boolean }> = ({ title, icon, cards = true }) => (
  <AbsoluteFill>
    <Backdrop tone="light" light={{ x: 0.3, y: 0.1 }} grain={0} vignette={0.08} />
    <div style={{ position: 'absolute', left: 160, top: 96, right: 160, fontFamily: FONT.sans, color: G.ink1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, color: G.ink3 }}>
        <span>Workspace</span><span>/</span><span>Launches</span><span>/</span><span style={{ color: G.ink2 }}>{title}</span>
      </div>
      <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: G.fill2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34, fontWeight: 700, color: G.ink2, boxShadow: `inset 0 0 0 1px ${G.hairline}`,
        }}>{icon}</div>
        <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: tracking(60), lineHeight: 1 }}>{title}</div>
      </div>
      <div style={{ marginTop: 22, display: 'flex', gap: 28, fontSize: 19, color: G.ink3 }}>
        <span>Owner <b style={{ color: G.ink2, fontWeight: 600 }}>Jamie Lee</b></span>
        <span>Status <b style={{ color: G.accent, fontWeight: 600 }}>In review</b></span>
        <span>Updated 2h ago</span>
      </div>
      <div style={{ marginTop: 34, maxWidth: 1180 }}>
        {PARAS.map((t, i) => (
          <div key={i} style={{ fontSize: 26, lineHeight: 1.5, color: G.ink2, marginBottom: 16, letterSpacing: tracking(26) }}>{t}</div>
        ))}
      </div>
      <div style={{
        marginTop: 12, maxWidth: 1180, padding: '18px 24px', borderRadius: 12, background: G.fill, border: hairline(0.07),
        fontSize: 22, color: G.ink2, display: 'flex', gap: 14, alignItems: 'center',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: G.accent }} />
        Ship date locked for Nov 12 — design freeze is this Friday.
      </div>
      {cards && (
        <div style={{ display: 'flex', gap: 32, marginTop: 36 }}>
          <Card w={420} h={280} seed={2} />
          <Card w={420} h={280} seed={5} />
        </div>
      )}
    </div>
  </AbsoluteFill>
);

export const ColorBlockStepWipe: React.FC = () => {
  const frame = useCurrentFrame();

  // ---------- 场景 A（0–77f）：蓝块中央阶跃生长 ----------
  if (frame < 78) {
    // [宽, 高] 逐级硬跳：小条 → 长条 → 半屏色带 → 全屏
    const w = stepVal(frame, [
      [0, 0],
      [8, 280],
      [16, 820],
      [24, 1340],
      [32, 1920],
      [44, 1920],
    ]);
    const h = stepVal(frame, [
      [0, 0],
      [8, 96],
      [16, 96],
      [24, 320],
      [32, 580],
      [44, 1080],
    ]);
    // 徽章：全屏接管后阶跃弹出（同样离散，两跳到位）
    const badgeScale = stepVal(frame, [
      [0, 0],
      [52, 0.55],
      [58, 1.12],
      [63, 1],
    ]);
    const badgeOpacity = frame >= 52 ? 1 : 0;
    const hit = onHit(frame, [8, 16, 24, 32, 44]);
    return (
      <AbsoluteFill style={{ background: G.bg, alignItems: 'center', justifyContent: 'center' }}>
        <DocPage title="Launch plan" icon="L" />
        {w > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 960 - w / 2,
              top: 540 - h / 2,
              width: w,
              height: h,
              background: blockFill(BLUE, BLUE_HI, hit),
              overflow: 'hidden',
            }}
          >
            <Grain opacity={0.07} />
          </div>
        )}
        <AiBadge scale={badgeScale} opacity={badgeOpacity} />
      </AbsoluteFill>
    );
  }

  // ---------- 场景 B（78–149f）：红块从右下角斜向阶跃吃屏，携带页面卡 ----------
  // p 控制对角线推进量：p=0 无，p=200 全覆盖
  const p = stepVal(frame, [
    [78, 0],
    [84, 42],
    [96, 106],
    [108, 200],
  ]);
  // 卡片随色块逐跳前进（同样离散跳位）
  const cardPos = stepVal(frame, [
    [78, 0],
    [84, 1],
    [96, 2],
    [108, 3],
  ]);
  const cardXY: Array<[number, number]> = [
    [2100, 1180], // 画外
    [1480, 800],
    [980, 560],
    [560, 350],
  ];
  const [cx, cy] = cardXY[cardPos];
  const clip =
    p <= 0
      ? 'polygon(100% 100%, 100% 100%, 100% 100%)'
      : `polygon(${100 - p}% 100%, 100% ${100 - p}%, 100% 100%)`;
  const hit = onHit(frame, [84, 96, 108]);

  return (
    <AbsoluteFill>
      <DocPage title="Pricing refresh" icon="P" />
      <AbsoluteFill style={{ background: blockFill(RED, RED_HI, hit), clipPath: clip }}>
        <Grain opacity={0.07} />
      </AbsoluteFill>
      {p > 0 && (
        <div
          style={{
            position: 'absolute',
            left: cx - 210,
            top: cy - 145,
            transform: 'rotate(-4deg)',
            boxShadow: softShadow(56, { color: '#5a130a', strength: 1.5 }),
            borderRadius: 14,
          }}
        >
          <Card w={420} h={290} seed={7} style={{ boxShadow: innerHighlight(0.9) }} />
        </div>
      )}
    </AbsoluteFill>
  );
};
