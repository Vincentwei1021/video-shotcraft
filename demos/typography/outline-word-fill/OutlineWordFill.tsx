// outline-word-fill — Outline→Solid Fill 空心字瞬时点亮
// 空心词从约 3.2 倍急缓收缩落位居中；背后虚线大圆从画外持续收缩到字周围并缓慢自转，两侧水平虚线从画框
// 边缘向内伸向圆（"瞄准"）；描边先预热增亮，随即实心字一帧内硬切点亮（无慢扫），一闪辉光后定格。
//
// 第二轮重设计（制图 HUD · 白热点亮）：
// - look = ember（暖黑 · 橙）。原生 1920 坐标重写（不再走 480×270 DesignStage）：220px / 500 的 Helvetica Neue
//   空心字（2px 暖灰描边），r=410 虚线圆 + 内圈 72 格刻度环（每 30° 一根长刻度，反向慢转）+ 四个套准刻度，两侧水平虚线带 mono 读数
//   「BEFORE 38 ms」/「AFTER 4 ms」——把"更快"讲成一组前后对比数据，瞄准的过程就有了内容。
// - 点亮：第 54 帧硬切成白热实心字（#fff5ee），同帧圆与水平线"锁定"成橙色、右侧读数 4 ms 变橙；
//   辉光（白 + 橙两层）8f 衰完；一道冲击环从圆边外扩 14f 消散（只此一次）；舞台主光同步脉冲一下再回落。
// - 主圈自转在点亮那一刻刹停（"锁定"），内圈刻度环继续反向慢转。
// - 曲线：字急缩 11f（EASE.snappy，按 scale 速度给瞬时失焦）、圆慢收 44f（EASE.out，全片最慢的呼吸），
//   快慢对比是这张卡的节奏；水平线 18f ease-out 内伸，停在圆边外 28px。
// - 空心字必须用静态字体（Helvetica Neue）：SF 可变字体字形内部有重叠轮廓，text-stroke 会描出 a/e 内部交叠线。
//
// 时间表（30fps，共 90f）：
//   0–2    舞台光与浮尘已在（第 1 帧不空）
//   2–13   空心字 3.2→1 急缩（2–8 淡入）
//   8–52   虚线圆 2.8→1 慢收 + 自转（8–18 淡入）
//   28–46  两侧水平虚线内伸、读数淡入
//   44–53  描边预热：暖灰 → 亮橙白
//   54     硬切点亮 + 锁定（主圈刹停）；54–62 辉光衰减；54–68 冲击环
//   56–70  眉题 / 副行在圆内升起
//   70–90  hold 20f（极缓推进 1.5%）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const OUTLINE_WORD_FILL_DURATION = 90; // 3.0s @30fps

const L = LOOKS.ember;
const CX = 960;
const CY = 540;
const R = 410; // 虚线圆半径
const WORD = 'Faster';
const SIZE = 220;
const POP = 54; // 硬切点亮帧
const STATIC_SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const lerpColor = (a: [number, number, number], b: [number, number, number], t: number) =>
  `rgb(${Math.round(mix(a[0], b[0], t))},${Math.round(mix(a[1], b[1], t))},${Math.round(mix(a[2], b[2], t))})`;
const GREY: [number, number, number] = [138, 118, 104]; // 暖灰描边 / 制图线
const HOT: [number, number, number] = [255, 196, 150]; // 预热后的亮橙白
const ORANGE: [number, number, number] = [255, 107, 44];

const wordScaleAt = (f: number) => mix(3.2, 1, ramp(f, 2, 11, EASE.snappy));

export const OutlineWordFill: React.FC = () => {
  const frame = useCurrentFrame();

  const born = ramp(frame, 2, 6, EASE.out);
  const ws = wordScaleAt(frame);
  const zoomBlur = Math.min(6, Math.abs(wordScaleAt(frame + 0.5) - wordScaleAt(frame - 0.5)) * 9);
  const cin = ramp(frame, 8, 10, EASE.out);
  const shrink = ramp(frame, 8, 44, EASE.out);
  const ext = ramp(frame, 28, 18, EASE.out);
  const warm = ramp(frame, 44, 9, EASE.swift);
  const lit = frame >= POP ? 1 : 0; // 硬切：不存在中间态
  const flash = lit * (1 - ramp(frame, POP, 8, EASE.out));
  const lock = lit * (0.55 + 0.45 * flash); // 锁定后保持一半橙色
  const shock = ramp(frame, POP, 14, EASE.out);
  // 主圈自转到点亮那一刻"锁死"（再滑 6° 刹停）；内圈刻度环继续反向慢转，hold 段画面仍在呼吸
  const rot = 0.22 * Math.min(frame, POP) + (frame > POP ? 6 * ramp(frame, POP, 14, EASE.out) : 0);
  const rotIn = -0.14 * frame;
  const sub = (d: number) => ramp(frame, 56 + d, 14, EASE.snappy);
  const push = 1 + 0.015 * ramp(frame, 0, OUTLINE_WORD_FILL_DURATION, EASE.swift);

  const strokeC = lerpColor(GREY, HOT, warm);
  const lineC = lit ? lerpColor([150, 120, 100], ORANGE, lock) : lerpColor(GREY, [150, 120, 100], warm);
  const lineEnd = CX - R - 28; // 水平线停在圆边外 28px

  return (
    <AbsoluteFill style={{ background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.5 }} fill={{ x: 0.5, y: 1.1 }} intensity={0.45 + 0.5 * flash + 0.15 * lit} grain={0.09} vignette={0.6}>
        <Dust look={L} count={22} seed={3} drift={0.12} opacity={0.4} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})` }}>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
          {/* 冲击环：点亮那一下从圆边外扩消散（只此一次） */}
          {lit > 0 && shock < 1 && (
            <circle cx={CX} cy={CY} r={R + shock * 160} fill="none" stroke={alpha('#ff8a4c', 0.55 * (1 - shock))} strokeWidth={2 + 10 * (1 - shock)} />
          )}
          <g transform={`translate(${CX} ${CY}) scale(${mix(2.8, 1, shrink).toFixed(5)})`} opacity={cin}>
            {/* 主虚线圆（自转） */}
            <g transform={`rotate(${rot.toFixed(3)})`}>
              <circle r={R} fill="none" stroke={lineC} strokeWidth={2} strokeDasharray="22 18" />
              {[0, 90, 180, 270].map((a) => (
                <line key={a} x1={0} y1={-R - 22} x2={0} y2={-R + 10} stroke={lineC} strokeWidth={2.5} strokeLinecap="round" transform={`rotate(${a})`} />
              ))}
            </g>
            {/* 内圈刻度环（反向慢转，降亮：纹理层） */}
            <g transform={`rotate(${rotIn.toFixed(3)})`}>
              <circle r={R - 34} fill="none" stroke={lineC} strokeWidth={1} opacity={0.35} />
              {Array.from({ length: 72 }, (_, i) => {
                const major = i % 6 === 0;
                return (
                  <line key={i} x1={0} y1={-(R - 34)} x2={0} y2={-(R - (major ? 58 : 44))} stroke={lineC}
                    strokeWidth={major ? 2 : 1.2} opacity={major ? 0.7 : 0.32} transform={`rotate(${i * 5})`} />
                );
              })}
            </g>
          </g>
          {/* 两侧水平虚线：从画框边缘内伸到圆边外 */}
          <line x1={0} y1={CY} x2={lineEnd * ext} y2={CY} stroke={lineC} strokeWidth={2} strokeDasharray="14 12" opacity={ext} />
          <line x1={1920} y1={CY} x2={1920 - lineEnd * ext} y2={CY} stroke={lineC} strokeWidth={2} strokeDasharray="14 12" opacity={ext} />
          {/* 线端准星点 */}
          <circle cx={lineEnd * ext} cy={CY} r={5} fill={lineC} opacity={ext} />
          <circle cx={1920 - lineEnd * ext} cy={CY} r={5} fill={lineC} opacity={ext} />
        </svg>

        {/* 读数：水平线上方，左 = 旧值（弱），右 = 新值（点亮时变橙） */}
        <div style={{ position: 'absolute', left: 120, top: CY - 74, opacity: ext, transform: `translateX(${((1 - ext) * -30).toFixed(2)}px)`, ...type(30, 500, { mono: true }), letterSpacing: '0.12em', color: L.ink3 }}>
          BEFORE <span style={{ color: L.ink2 }}>38 ms</span>
        </div>
        <div style={{ position: 'absolute', right: 120, top: CY - 74, opacity: ext, transform: `translateX(${((1 - ext) * 30).toFixed(2)}px)`, ...type(30, 500, { mono: true }), letterSpacing: '0.12em', color: L.ink3, textAlign: 'right' }}>
          AFTER <span style={{ color: lit ? L.accent : L.ink2, textShadow: lit && flash > 0.02 ? `0 0 ${(18 * flash).toFixed(1)}px ${alpha(L.accent, 0.8)}` : undefined }}>4 ms</span>
        </div>

        {/* 眉题 / 副行：圆内、字上下 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: CY - 196, textAlign: 'center', opacity: sub(0), transform: `translateY(${((1 - sub(0)) * 16).toFixed(2)}px)`, ...type(28, 600, { mono: true }), letterSpacing: '0.32em', color: L.ink2 }}>
          LUMEN RUNTIME 3
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: CY + 128, textAlign: 'center', opacity: sub(3), transform: `translateY(${((1 - sub(3)) * 16).toFixed(2)}px)`, ...type(40, 450), letterSpacing: '-0.01em', color: L.ink2 }}>
          Every cold start. Every region.
        </div>

        {/* 双层字：底层空心描边、顶层白热实心（硬切） */}
        <div style={{
          position: 'absolute', left: CX, top: CY, fontFamily: STATIC_SANS, fontSize: SIZE, fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1,
          opacity: born, transform: `translate(-50%, -54%) scale(${ws.toFixed(5)})`, whiteSpace: 'nowrap',
        }}>
          <div style={{
            color: 'transparent', WebkitTextStroke: `2px ${strokeC}`, opacity: 1 - lit,
            filter: zoomBlur > 0.05 ? `blur(${(zoomBlur / ws).toFixed(2)}px)` : warm > 0.01 ? `drop-shadow(0 0 ${(10 * warm).toFixed(1)}px ${alpha('#ff9a5c', 0.5 * warm)})` : undefined,
          }}>
            {WORD}
          </div>
          <div style={{
            position: 'absolute', inset: 0, color: '#fff5ee', opacity: lit,
            textShadow: flash > 0.01 ? `0 0 ${(14 * flash).toFixed(1)}px rgba(255,255,255,${(0.7 * flash).toFixed(3)}), 0 0 ${(60 * flash).toFixed(1)}px ${alpha(L.accent, 0.65 * flash)}` : `0 0 40px ${alpha(L.accent, 0.18)}`,
          }}>
            {WORD}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
