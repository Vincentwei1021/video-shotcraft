// line-unfold-panel —— 一线展面（Jarvis/FUI 母题）
// 暗底。入场两拍：3px 细线从中点向两侧极快抽出（5f）→ 定宽后纵向
// 撑开成 Card 面板（9f，out 缓动）→ 内容延迟淡入。
// 静置展示后反向退场：压扁成线（7f）→ 线缩成点 → 熄灭，像老 CRT 关机。
// f0–12 空场静置；入场 f12–34；持面板至 f78；退场 f78–95；末静止 25f（120f）。
//
// 质感升级：去掉画面上方的调试标题；面板换深色出版级 Card（发丝线 + 内高光 + 深色两层阴影），
// 撑开改为"真实尺寸 + overflow 揭示"而非 scaleY 压扁（圆角与 1px 边全程不变形、不闪）；
// 线阶段是白芯 + 冷色辉光 + 两端抽线时的亮点火花；撑开时细线分裂成上下两条发光边沿着面板
// 边缘推开、随内容点亮淡去；收成点时末点有一次小闪再熄灭；背景为带色相的暗场 + 点阵 + 暗角 + 颗粒。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Card } from '../../_fixtures/Fixtures';
import { Backdrop, Grain, softShadow } from '../../_fixtures/Polish';

export const LINE_UNFOLD_PANEL_DURATION = 120; // 4s：入场 + 持面板 + CRT 关机 + 末静止

const PANEL_W = 760;
const PANEL_H = 460;
const CX = 960;
const CY = 540;
const LINE_H = 3; // 线阶段厚度
const GLOW = '150,176,255'; // 冷色辉光（只用于线/边/点这几处"电"的部分）

// —— 入场时间表 ——
const T0 = 12; // 点亮起点
const LINE_END = T0 + 5; // 线抽出完成 f17
const UNFOLD_END = LINE_END + 9; // 面板撑开完成 f26
const CONTENT_END = UNFOLD_END + 8; // 内容淡入完成 f34

// —— 退场时间表 ——
const OUT0 = 78; // 开始压扁
const COLLAPSE_END = OUT0 + 7; // 压成线 f85
const SHRINK_END = COLLAPSE_END + 6; // 线缩成点 f91
const OFF = SHRINK_END + 4; // 点熄灭 f95

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const LineUnfoldPanel: React.FC = () => {
  const frame = useCurrentFrame();

  // 入场：宽度（线抽出）快进快停，入场后保持满宽
  const inSX = interpolate(frame, [T0, LINE_END], [0.004, 1], { easing: Easing.out(Easing.poly(4)), ...clamp });
  // 入场：高度（纵向撑开），线阶段压在 3px
  const inSY = interpolate(frame, [LINE_END, UNFOLD_END], [LINE_H / PANEL_H, 1], { easing: Easing.out(Easing.cubic), ...clamp });
  // 内容淡入（面板撑开过半才开始）
  const contentOp = interpolate(frame, [UNFOLD_END - 3, CONTENT_END], [0, 1], { easing: Easing.out(Easing.quad), ...clamp });

  // 退场：先压 Y 回线，再缩 X 回点
  const outSY = interpolate(frame, [OUT0, COLLAPSE_END], [1, LINE_H / PANEL_H], { easing: Easing.in(Easing.cubic), ...clamp });
  const outSX = interpolate(frame, [COLLAPSE_END, SHRINK_END], [1, 0.004], { easing: Easing.in(Easing.poly(4)), ...clamp });
  // 内容在压扁前先撤
  const contentOutOp = interpolate(frame, [OUT0 - 4, OUT0 + 2], [1, 0], clamp);

  const sx = frame < OUT0 ? inSX : outSX;
  const sy = frame < OUT0 ? inSY : outSY;
  const w = Math.max(2, PANEL_W * sx);
  const h = Math.max(LINE_H, PANEL_H * sy);

  // 末点熄灭：opacity 快落；熄灭前一次小闪（线缩成点的瞬间能量集中）。f >= OFF 后条件卸载 → 真静止
  const dotOp = interpolate(frame, [SHRINK_END, OFF], [1, 0], { easing: Easing.in(Easing.quad), ...clamp });
  const dotFlare = interpolate(frame, [SHRINK_END - 2, SHRINK_END, OFF], [0, 1, 0], clamp);

  const alive = frame >= T0 && frame < OFF;
  // 面板阶段（高度足够）显示卡片；线/点阶段显示发光条
  const isPanel = sy > 0.15;
  // 线阶段亮度：抽线时最亮，撑开时余辉跟着边沿走；退场压成线后重新亮起
  const lineHot = frame < OUT0 ? 1 - interpolate(frame, [LINE_END, UNFOLD_END], [0, 1], clamp) : interpolate(frame, [OUT0 + 3, COLLAPSE_END], [0, 1], clamp);
  // 撑开期的上下发光边（线一分为二推向面板上下沿，内容点亮后淡去；退场时反向汇拢）
  const edgeOp =
    frame < OUT0
      ? interpolate(frame, [LINE_END, LINE_END + 1, UNFOLD_END, CONTENT_END], [0, 1, 0.75, 0], clamp)
      : interpolate(frame, [OUT0, OUT0 + 2, COLLAPSE_END], [0, 0.8, 1], clamp);
  // 抽线两端的火花：只在 x 方向高速段出现
  const spark = interpolate(frame, [T0, T0 + 1, LINE_END, LINE_END + 2], [0, 1, 0.6, 0], clamp);

  const bar = (y: number, op: number, key: string) => (
    <div key={key} style={{
      position: 'absolute', left: CX - w / 2, top: y - 1, width: w, height: 2, borderRadius: 1, opacity: op,
      background: `linear-gradient(90deg, rgba(${GLOW},0) 0%, #ffffff 12%, #ffffff 88%, rgba(${GLOW},0) 100%)`,
      boxShadow: `0 0 10px rgba(${GLOW},0.85), 0 0 28px rgba(${GLOW},0.45)`,
    }} />
  );

  return (
    <div style={{ width: 1920, height: 1080, overflow: 'hidden', position: 'relative', background: '#0d0e12' }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.38 }} accent="#6c7cff" grain={0} vignette={0.55} />
      {/* FUI 台面：极淡点阵（中心可见、四周隐去） */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1.2px)',
        backgroundSize: '32px 32px', backgroundPosition: '16px 12px',
        WebkitMaskImage: 'radial-gradient(ellipse 55% 60% at 50% 50%, #000 20%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 55% 60% at 50% 50%, #000 20%, transparent 100%)',
      }} />

      {alive && (
        <>
          {isPanel ? (
            // 面板阶段：外框按真实尺寸变高（圆角/发丝线不变形），内容固定居中、被 overflow 揭示
            <div style={{
              position: 'absolute', left: CX - w / 2, top: CY - h / 2, width: w, height: h,
              borderRadius: 14, overflow: 'hidden', opacity: dotOp,
              boxShadow: `${softShadow(28, { color: '#000000', strength: 2.4 })}, 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px rgba(${GLOW},${(0.10 * (1 - contentOp) + 0.05).toFixed(3)})`,
            }}>
              <div style={{ position: 'absolute', left: (w - PANEL_W) / 2, top: (h - PANEL_H) / 2 }}>
                <Card w={PANEL_W} h={PANEL_H} seed={3} tone="dark" />
                {/* 内容层单独控 opacity：盖一层暗面板模拟"内容未亮" */}
                <div style={{
                  position: 'absolute', inset: 1, borderRadius: 13, background: 'linear-gradient(180deg,#1b1c22,#16171c)',
                  opacity: 1 - Math.min(contentOp, contentOutOp),
                }} />
              </div>
            </div>
          ) : (
            // 线/点阶段：白芯 + 冷色辉光（宽度真实变化，不靠 scale 压扁）
            <div style={{
              position: 'absolute', left: CX - w / 2, top: CY - h / 2, width: w, height: h, borderRadius: h,
              background: '#ffffff', opacity: dotOp,
              boxShadow: `0 0 ${12 + 18 * dotFlare}px rgba(${GLOW},${(0.7 + 0.3 * lineHot).toFixed(2)}), 0 0 ${48 + 60 * dotFlare}px rgba(${GLOW},0.45)`,
            }} />
          )}
          {/* 上下发光边：撑开时从中线分裂推开，退场时反向汇拢 */}
          {isPanel && edgeOp > 0.01 && [bar(CY - h / 2 + 1, edgeOp, 't'), bar(CY + h / 2 - 1, edgeOp, 'b')]}
          {/* 抽线两端火花 */}
          {spark > 0.01 && [-1, 1].map((s) => (
            <div key={s} style={{
              position: 'absolute', left: CX + (s * w) / 2 - 7, top: CY - 7, width: 14, height: 14, borderRadius: 7,
              background: `radial-gradient(circle, #ffffff 0%, rgba(${GLOW},0.9) 35%, rgba(${GLOW},0) 70%)`,
              opacity: spark, transform: 'scaleX(2.4)',
            }} />
          ))}
          {/* 末点小闪 */}
          {dotFlare > 0.01 && (
            <div style={{
              position: 'absolute', left: CX - 40, top: CY - 40, width: 80, height: 80, borderRadius: 40,
              background: `radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(${GLOW},0.5) 18%, rgba(${GLOW},0) 60%)`,
              opacity: dotFlare,
            }} />
          )}
        </>
      )}
      <Grain opacity={0.09} blend="soft-light" />
    </div>
  );
};
