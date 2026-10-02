// outline-word-fill — Outline→Solid Fill 空心字辉光填充（motion-lab 定稿转原生 Remotion）
// 空心 "Faster"（细灰描边、中等字重）从约 3.2 倍巨大尺寸急缓收缩落位居中；
// 背后巨大虚线圆随后从画外持续收缩到字周围并缓慢自转，两侧水平虚线从画框边缘向内伸向圆；
// 描边先微微增亮，随即实心白色一帧内瞬间点亮（无慢扫），带一闪即逝的微辉光后定格纯白。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 质感层（改版）：描边收到 0.6px（成片约 2.4px，真正的"制图细线"）；3.2× 急缩段按 scale 速度
// 给瞬时失焦（停稳归零）；虚线圆加四个随圆自转的套准刻度，点亮那一帧圆与水平线同步"锁定"
// 增亮后回落（与字的辉光同一条 flash 曲线）；底换带冷色相的近黑 + 中心极弱主光 + 暗角 + 颗粒，
// 微尘改圆形柔点。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';
import { Grain, Vignette } from '../../_fixtures/Polish';

export const OUTLINE_WORD_FILL_DURATION = 75; // 2500ms @30fps

// 背景微尘：位置/尺寸/透明度全部种子驱动，跨帧静止
const DUST = Array.from({ length: 14 }, (_, i) => ({
  size: 0.6 + rand(i * 7 + 2) * 0.8,
  opacity: 0.06 + rand(i + 55) * 0.14,
  left: `${rand(i + 13) * 100}%`,
  top: `${rand(i + 29) * 100}%`,
}));

export const OutlineWordFill: React.FC = () => {
  const t = useT();
  // 空心字从 ~3.2x 急缓收缩落位（原片 4.83→5.15s）
  const born = seg(t, 0.05, 0.14, E.outCubic);
  const zoom = seg(t, 0.05, 0.19, E.outCubic);
  // 描边临近点亮前微微增亮（6.4→6.55s）
  const bright = seg(t, 0.66, 0.73, E.outQuad);
  const gv = Math.round(lerp(bright, 86, 145));
  // 虚线圆：字落位后出现，从画外一路收缩到字周围（5.1→6.6s）
  const cin = seg(t, 0.16, 0.3, E.outQuad);
  const shrink = seg(t, 0.16, 0.76, E.outCubic);
  // 水平虚线从画框边缘向内伸向圆（5.9→6.5s）
  const ext = seg(t, 0.5, 0.72, E.outCubic);
  // 实心白一帧内瞬间点亮（原片 6.54→6.56s 硬切，无慢扫）
  const pop = seg(t, 0.742, 0.762);
  // 一闪即逝的微辉光，随后定格纯白
  const flash = pop * (1 - seg(t, 0.762, 0.86, E.outQuad));
  // 急缩段的瞬时失焦：scale 每帧变化量（中心差分）→ blur（缩放前单位，峰值约 0.66/帧）
  const DT = 1 / (OUTLINE_WORD_FILL_DURATION - 1);
  const sAt = (x: number) => lerp(seg(x, 0.05, 0.19, E.outCubic), 3.2, 1);
  const zoomBlur = Math.min(0.8, Math.abs(sAt(t + DT / 2) - sAt(t - DT / 2)));
  // 点亮"锁定"：圆与水平线在 pop 那一下同步增亮，随 flash 回落
  const lock = flash;
  const lineC = `rgb(${Math.round(lerp(lock, 125, 205))},${Math.round(lerp(lock, 131, 210))},${Math.round(lerp(lock, 142, 222))})`;
  // 注：原 effect.js 背景为 #050505，但样片 mp4 经 x264 编码后底色实测为 rgb(3,3,3)
  // （暗部量化损失），此处按样片实际电平取 #030303 保证帧一致性。
  return (
    <>
    {/* 底：带冷色相的近黑 + 中心极弱主光（合成分辨率下画，避免缩放容器里的色带） */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 55% 60% at 50% 50%, #12141a 0%, #08090c 55%, #040405 100%)',
      }}
    />
    <DesignStage bg="transparent">
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* 背景微尘 */}
        {DUST.map(({ size, opacity, left, top }, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,0.4) 55%, rgba(255,255,255,0) 100%)',
              opacity,
              left,
              top,
            }}
          />
        ))}
        {/* 虚线大圆（SVG，从画外收缩落位 + 缓慢自转）+ 左右水平虚线 */}
        <svg
          viewBox="-240 -135 480 270"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <g transform={`scale(${lerp(shrink, 2.8, 1)}) rotate(${t * 18})`}>
            <circle
              cx={0}
              cy={0}
              r={88}
              fill="none"
              stroke={lineC}
              strokeWidth={0.75}
              strokeDasharray="6 8"
              opacity={cin * lerp(lock, 0.85, 1)}
            />
            {/* 四个套准刻度（随圆自转）：制图语汇，让"瞄准"读得更明确 */}
            {[0, 90, 180, 270].map((a) => (
              <line
                key={a}
                x1={0}
                y1={-92}
                x2={0}
                y2={-84}
                stroke={lineC}
                strokeWidth={0.75}
                strokeLinecap="round"
                transform={`rotate(${a})`}
                opacity={cin * 0.9}
              />
            ))}
          </g>
          <line
            y1={0}
            y2={0}
            x1={-240}
            x2={-240 + ext * 144}
            stroke={lineC}
            strokeWidth={0.75}
            strokeDasharray="5 7"
            opacity={ext}
          />
          <line
            y1={0}
            y2={0}
            x1={240}
            x2={240 - ext * 144}
            stroke={lineC}
            strokeWidth={0.75}
            strokeDasharray="5 7"
            opacity={ext}
          />
        </svg>
        {/* 双层文字（中等字重，占画宽约三成）：底层描边、顶层实心白 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            // 空心字必须用静态字体：SF（可变字体）字形内部有重叠轮廓，text-stroke 会把 a/e 的内部交叠线描出来
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            fontSize: 48,
            fontWeight: 500,
            letterSpacing: 0.5,
            lineHeight: 1,
            opacity: born,
            transform: `translate(-50%,-53%) scale(${lerp(zoom, 3.2, 1)})`,
          }}
        >
          <div
            style={{
              color: 'transparent',
              WebkitTextStroke: `0.6px rgb(${gv - 4},${gv},${gv + 10})`,
              opacity: 1 - pop,
              filter: zoomBlur > 0.02 ? `blur(${zoomBlur.toFixed(3)}px)` : undefined,
            }}
          >
            Faster
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              color: '#fff',
              opacity: pop,
              textShadow:
                flash > 0.01 ? `0 0 ${flash * 16}px rgba(255,255,255,${flash * 0.45})` : 'none',
            }}
          >
            Faster
          </div>
        </div>
      </div>
    </DesignStage>
    <Vignette strength={0.5} inner={0.42} color="#000000" cy={0.5} />
    <Grain opacity={0.08} blend="soft-light" />
    </>
  );
};
