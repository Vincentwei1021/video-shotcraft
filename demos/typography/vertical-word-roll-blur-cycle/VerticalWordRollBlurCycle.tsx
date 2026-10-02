// vertical-word-roll-blur-cycle — Word Roll 竖向词条滚轮（motion-lab 定稿转原生 Remotion）
// 标语后半词用竖向滚轮循环 Apps→Teams→Data→Everyone：中心词清晰上色，相邻行浅灰带
// 垂直 blur（滚轮景深），每步 outQuint 前快后慢带轻微过冲，落定瞬间中心词从灰染成强调色。
// 质感：blur 改为真·纵向高斯（SVG feGaussianBlur 只在 y 向，横向笔画不糊），转动时再按滚轮
// 速度叠一层纵向运动模糊（静止为 0）；离中心越远的行按滚筒曲面轻微压扁；视窗上下沿柔边渐隐，
// 不再是硬裁切；底景柔光 + 颗粒。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, FONT, Grain } from '../../_fixtures/Polish';

export const VERTICAL_WORD_ROLL_BLUR_CYCLE_DURATION = 150; // 5000ms @30fps

const ROW = 44;
const WORDS = ['Apps', 'Teams', 'Data', 'Everyone'];
// 3 次换词，每次 0.11（≈0.55s）
const STEPS = [0.16, 0.36, 0.56];

const ACCENT = '#5b63d3';
const ACCENT_DIM = '#B9B9BE';
const INK = '#17181c';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
// 十六进制颜色按 k 混合（与原 effect.js 的 mixHex 等价）
const mixHex = (a: string, b: string, k: number) => {
  k = clamp01(k);
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

// 滚轮进度 p：每步 0.7·outQuint + 0.3·outBack（前快后极慢 + 轻微过冲回落）
const reelAt = (t: number) => {
  let p = 0;
  for (const s of STEPS) {
    const u = seg(t, s, s + 0.11);
    p += 0.7 * E.outQuint(u) + 0.3 * E.outBack(u);
  }
  return p;
};
const DT = 0.5 / (VERTICAL_WORD_ROLL_BLUR_CYCLE_DURATION - 1); // 半帧对应的 t

export const VerticalWordRollBlurCycle: React.FC = () => {
  const t = useT();
  const p = reelAt(t);
  // 滚轮速度（行/帧）→ 纵向运动模糊（设计 px），静止时为 0
  const speed = Math.abs(reelAt(t + DT) - reelAt(t - DT));
  const motionBlur = Math.min(4, speed * ROW * 0.22);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
    <DesignStage bg="#F4F4F2">
      <Backdrop tone="light" light={{ x: 0.5, y: 0.3 }} accent={ACCENT} vignette={0.12} grain={0} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT.sans,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            // 结束整组淡出
            opacity: 1 - seg(t, 0.9, 0.985) * 0.999,
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: INK,
              letterSpacing: -0.5,
            }}
          >
            Built for
          </div>
          {/* 三行高的视窗，滚轮列在其中滑动，中心行 = 第二行；上下沿柔边渐隐 */}
          <div
            style={{
              position: 'relative',
              height: ROW * 3,
              width: 190,
              overflow: 'hidden',
              WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 26%, #000 74%, transparent 100%)',
              maskImage: 'linear-gradient(180deg, transparent 0%, #000 26%, #000 74%, transparent 100%)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translateY(${ROW - p * ROW}px)`,
              }}
            >
              {WORDS.map((w, i) => {
                const d = Math.abs(i - p);
                // 相邻行纵向 blur：距中心 1 行内线性 0→3px，更远 3→5px；转动时叠运动模糊
                const blur = (d < 1 ? 3 * d : 3 + 2 * Math.min(d - 1, 1)) + motionBlur;
                const op = d < 1 ? 1 - 0.65 * d : Math.max(0.1, 0.35 - 0.23 * (d - 1));
                // 滚筒曲面：离中心越远越扁（最多 14%）
                const squash = 1 - 0.14 * Math.min(1, d / 1.4);
                const fid = `vroll-${i}`;
                return (
                  <div key={w} style={{ position: 'relative', height: ROW }}>
                    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
                      <filter id={fid} x="-10%" y="-120%" width="120%" height="340%" colorInterpolationFilters="sRGB">
                        <feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} />
                      </filter>
                    </svg>
                    <div
                      style={{
                        height: ROW,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 30,
                        fontWeight: 800,
                        letterSpacing: -0.5,
                        filter: blur > 0.05 ? `url(#${fid})` : undefined,
                        opacity: op,
                        transform: `scaleY(${squash.toFixed(4)})`,
                        // 落定染色：中心词灰→强调色（d 越小越彩）
                        color: mixHex(ACCENT_DIM, ACCENT, clamp01(1 - d * 2.4)),
                      }}
                    >
                      {w}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DesignStage>
    {/* 颗粒放在设计坐标容器外，按成片像素取样，不随 4× 放大变粗 */}
    <Grain opacity={0.05} />
    </div>
  );
};
