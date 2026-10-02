// page-waterfall-wall —— 页面瀑布墙：真实页面卡片截图排成 3 列，在后仰的 3D 墙面上差速反向无限滚动，
// 镜头缓推，做"内容多到流不完"的一览。
//
// 第二轮重设计（暖纸 · 编辑部式的"项目墙"海报）：
// - look = paper（暖白纸 · 墨 · 朱红），和卡片截图本身的暖白底同一色温——墙像一面钉满项目卡的展墙，不再是黑底里漂着的白块。
//   亮场靠两层暖色软阴影和"空气透视"（墙的远端渐隐进纸色雾里）出纵深。
// - 构图不再是满屏居中墙：墙斜置在画面右侧 ~65%（rotateY 后退 + rotateX 后仰 + 轻微 rotateZ），朝画面右上方远去；
//   左侧留给一组粗黑体大标题「Every project. / Still moving.」（120px，"moving." 用朱红）+ 眉题 + 一行数据，暂停即海报。
// - 节奏：开场墙以 ~4 倍巡航速度"冲"进来（指数衰减到巡航速，快速段按速度加竖向运动模糊），标题随墙减速逐行升起落定；
//   之后墙按巡航速度持续流动（三列差速 + 中列反向是视差命门），镜头全程缓推 + 极缓转角，hold 段画面一直在动。
// - 素材：10 张真实卡片截图（Q1，textures/live/card1–10），三列 4/3/3 分配、列间不复用；文字只作"看得出是真页面"的纹理。
// - 无缝循环：每列按卡片真实宽高比算出单副本周期，translateY 对周期取模（两份副本首尾相接，不跳帧）。
//
// 时间表（30fps，共 150f）：
//   0–36    墙冲入：滚速从巡航的 ~4 倍按 τ=11f 指数衰减到巡航（0–16f 有竖向运动模糊）
//   6–20    眉题淡入；10–40 三行标题逐行升起（rise，6f 间隔）；40–56 数据行
//   0–150   镜头：墙 translateZ 0→110 缓推、rotateY −33°→−28°（smooth，起止无速度突变）
//   56–150  hold：墙巡航流动 + 缓推继续，标题静置
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const PAGE_WATERFALL_WALL_DURATION = 150; // 5s（无限循环体，按段落需要裁）

const L = LOOKS.paper;
const COL_W = 420;
const GAP = 30;
const RADIUS = 14; // 截图自带圆角 ≈ 22/716 × 420

// 卡片截图与原始尺寸（宽高比决定每张在列里的高度，循环周期按它算）
const TEX: Record<string, [number, number]> = {
  'card1.png': [714, 576], 'card2.png': [716, 576], 'card3.png': [714, 624], 'card10.png': [716, 624],
  'card4.png': [716, 624], 'card5.png': [714, 624], 'card6.png': [714, 624],
  'card7.png': [716, 624], 'card8.png': [714, 624], 'card9.png': [714, 624],
};
const itemH = (f: string) => (COL_W * TEX[f][1]) / TEX[f][0];

type Col = { files: string[]; speed: number; phase: number };
// 巡航速度（px/帧，正 = 向上流）：相邻列差 ≥25%，中列反向
const COLS: Col[] = [
  { files: ['card1.png', 'card2.png', 'card3.png', 'card10.png'], speed: 1.9, phase: 120 },
  { files: ['card4.png', 'card5.png', 'card6.png'], speed: -1.35, phase: 300 },
  { files: ['card7.png', 'card8.png', 'card9.png'], speed: 2.5, phase: 40 },
];
const period = (c: Col) => c.files.reduce((s, f) => s + itemH(f) + GAP, 0);

// 冲入：滚动距离 = 巡航 v·f + 额外冲量 boost·v·τ·(1 − e^(−f/τ))（开场速度 = (1+boost)·v，平滑衰减到 v）
const TAU = 11;
const BOOST = 3;
const travel = (f: number, v: number) => v * f + BOOST * v * TAU * (1 - Math.exp(-f / TAU));
const speedAt = (f: number, v: number) => v * (1 + BOOST * Math.exp(-f / TAU));

const Shot: React.FC<{ file: string }> = ({ file }) => (
  <div style={{
    position: 'relative', width: COL_W, height: itemH(file), borderRadius: RADIUS, overflow: 'hidden', marginBottom: GAP,
    background: '#fdfbf7',
    boxShadow: `0 1px 2px ${alpha(L.shadow, 0.1)}, 0 18px 40px -16px ${alpha(L.shadow, 0.32)}, 0 50px 90px -40px ${alpha(L.shadow, 0.25)}`,
  }}>
    <Img src={staticFile(`textures/live/${file}`)} style={{ width: '100%', height: '100%', display: 'block' }} />
    {/* 顶部受光沿（裁在圆角内） */}
    <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)', pointerEvents: 'none' }} />
  </div>
);

const Column: React.FC<{ col: Col; frame: number; idx: number; rush: boolean }> = ({ col, frame, idx, rush }) => {
  const P = period(col);
  const d = (rush ? travel(frame, col.speed) : col.speed * frame) + col.phase;
  const y = -((((d % P) + P) % P)); // 0 → −P 循环
  const v = Math.abs(rush ? speedAt(frame, col.speed) : col.speed);
  const sd = rush ? Math.max(0, (v - 3) * 0.9) : 0; // 快速段竖向运动模糊，巡航时为 0
  const fid = `pww-blur-${idx}`;
  return (
    <div style={{ width: COL_W, height: '100%', position: 'relative' }}>
      {sd > 0.3 && (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id={fid} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`0 ${sd.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${y.toFixed(2)}px)`, filter: sd > 0.3 ? `url(#${fid})` : undefined }}>
        {[0, 1, 2].flatMap((k) => col.files.map((f) => <Shot key={`${k}-${f}`} file={f} />))}
      </div>
    </div>
  );
};

const WALL_W = COL_W * 3 + GAP * 2;
const WALL_H = 1900;

const Wall: React.FC<{ frame: number; push: number; yaw: number; rush?: boolean }> = ({ frame, push, yaw, rush = true }) => (
  <div style={{ position: 'absolute', inset: 0, perspective: 1700, perspectiveOrigin: '30% 46%' }}>
    <div style={{
      position: 'absolute', left: 1380 - WALL_W / 2, top: 540 - WALL_H / 2, width: WALL_W, height: WALL_H,
      transform: `translateZ(${push.toFixed(2)}px) rotateY(${yaw.toFixed(3)}deg) rotateX(16deg) rotateZ(5deg)`,
      // 上下羽化：墙的两端软进软出
      WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 16%, #000 80%, transparent 97%)',
    }}>
      <div style={{ display: 'flex', gap: GAP, height: '100%', overflow: 'hidden' }}>
        {COLS.map((c, i) => <Column key={i} col={c} frame={frame} idx={i} rush={rush} />)}
      </div>
      {/* 空气透视：墙的远端（右侧）渐隐进纸色雾 */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${alpha(L.bg[1], 0)} 25%, ${alpha(L.bg[1], 0.55)} 100%)`, pointerEvents: 'none' }} />
    </div>
  </div>
);

export const PageWaterfallWall: React.FC = () => {
  const frame = useCurrentFrame();
  // 镜头：缓推 + 极缓转角（寄生在墙外层，墙自身循环、镜头单向）
  const cam = ramp(frame, 0, 150, EASE.smooth);
  const push = mix(0, 110, cam);
  const yaw = mix(-33, -28, cam);

  const eyebrow = ramp(frame, 6, 14, EASE.out);
  const stat = ramp(frame, 40, 16, EASE.out);

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.22, y: 0.1 }} fill={{ x: 0.9, y: 0.95 }} vignette={0.22} grain={0} />
      <Wall frame={frame} push={push} yaw={yaw} />

      {/* 左侧纸色渐隐：给标题让出一块干净的底 */}
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${L.bg[0]} 0%, ${alpha(L.bg[0], 0.95)} 30%, ${alpha(L.bg[0], 0)} 50%)`, pointerEvents: 'none' }} />

      {/* 标题组 */}
      <div style={{ position: 'absolute', left: 128, top: 300, width: 720, color: L.ink }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: eyebrow, transform: `translateY(${((1 - eyebrow) * 10).toFixed(2)}px)` }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent, boxShadow: `0 0 0 6px ${alpha(L.accent, 0.14)}` }} />
          <div style={{ ...type(24, 700, { caps: true }), letterSpacing: '0.18em', color: L.ink2 }}>Lab index · Live</div>
        </div>
        <div style={{ ...type(116, 820), marginTop: 30, lineHeight: 0.98 }}>
          <TextReveal text={'Every\nproject.\nStill moving.'} by="line" variant="rise" start={10} each={22} gap={6} ease={EASE.snappy}
            unitStyle={(i) => (i === 2 ? { color: L.accent } : {})} />
        </div>
        <div style={{ marginTop: 40, display: 'flex', gap: 34, opacity: stat, transform: `translateY(${((1 - stat) * 14).toFixed(2)}px)` }}>
          {[['214', 'active'], ['38', 'shipped this quarter']].map(([n, t]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ ...type(40, 760), color: L.ink }}>{n}</span>
              <span style={{ ...type(32, 500), color: L.ink2 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      {/* 暖色压边 + 颗粒放最上层，墙和字一起压一层纸感 */}
      <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'multiply', background: `radial-gradient(ellipse 80% 80% at 60% 50%, transparent 55%, ${alpha(L.shadow, 0.12)} 100%)` }} />
      <Grain opacity={0.05} blend="overlay" />
    </AbsoluteFill>
  );
};

// 接缝自检用：去掉冲入与镜头，墙按巡航速度流动；任一列在其周期整数倍帧上应与 0 帧逐像素一致
export const SeamTest: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: L.bg[1] }}>
      <Wall frame={frame} push={0} yaw={-24} rush={false} />
    </AbsoluteFill>
  );
};
