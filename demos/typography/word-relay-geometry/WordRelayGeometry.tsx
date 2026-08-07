// word-relay-geometry — Word Relay Geometry 利益词几何接力（motion-lab 定稿转原生 Remotion）
// 三个利益词接力：Faster（虚线大圆）→ Better（三实线圆相扣）→ Stronger（金属 sheen
// 从左扫到右变纯白）。旧词与几何淡出缩小，新词描边→填充进场，圆路径带 trim 生长感；
// 背景漂浮微尘粒子。设计坐标 480×270（DesignStage 等比放大），参数以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const WORD_RELAY_GEOMETRY_DURATION = 180; // 6000ms @30fps

const CIRC_R = 78;

// 微尘粒子（20 个，种子与原 effect.js 完全一致）
const PARTS = Array.from({ length: 20 }, (_, i) => ({
  size: 1 + rand(i * 3) * 1.4,
  x: rand(i) * 100,
  ph: rand(i + 40),
  sp: 0.5 + rand(i + 80) * 0.8,
}));

// 每个词一段 slot：几何配置 + 时段（in 0.07 + hold + out 0.05）
type Geom = { x: number; r: number; dash?: boolean; d?: number };
const SLOTS: { label: string; geom: Geom[]; t0: number; t1: number }[] = [
  { label: 'Faster', geom: [{ x: 0, r: CIRC_R + 22, dash: true }], t0: 0.0, t1: 0.36 },
  {
    label: 'Better',
    geom: [
      { x: -110, r: 62, d: 0 },
      { x: 0, r: 62, d: 0.06 },
      { x: 110, r: 62, d: 0.12 },
    ],
    t0: 0.32,
    t1: 0.68,
  },
  { label: 'Stronger', geom: [], t0: 0.64, t1: 1.0 },
];

export const WordRelayGeometry: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#07080c">
      {/* 微尘粒子：缓慢上浮 loop + 呼吸闪烁 */}
      {PARTS.map((p, i) => {
        const y = (1 - ((t * p.sp + p.ph) % 1)) * 110 - 5;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: '#fff',
              left: `${p.x}%`,
              top: `${y}%`,
              opacity: 0.12 + 0.18 * Math.sin((t * 3 + p.ph) * Math.PI * 2) ** 2,
            }}
          />
        );
      })}

      {SLOTS.map(({ label, geom, t0, t1 }, i) => {
        const isLast = i === SLOTS.length - 1;
        const tin = seg(t, t0, t0 + 0.07, E.outCubic);
        const tout = isLast ? 0 : seg(t, t1 - 0.05, t1, E.inQuad);
        const alive = tin > 0 && tout < 1;

        // Faster/Better：outline→fill 左起 clip 揭示
        const fillp = seg(t, t0 + 0.06, t0 + 0.18, E.inOutCubic);
        // Stronger：描边→sheen 扫光→收纯白
        const sh = seg(t, t0 + 0.05, t0 + 0.2, E.outQuad); // 出现（描边→sheen）
        const sweep = seg(t, t0 + 0.08, t0 + 0.26, E.inOutCubic); // 扫光位置
        const white = seg(t, t0 + 0.27, t0 + 0.34, E.outQuad); // 收为纯白

        return (
          <div key={label} style={{ position: 'absolute', inset: 0, opacity: alive ? tin * (1 - tout) : 0 }}>
            <svg
              viewBox="-240 -135 480 270"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              {geom.map((g, k) => {
                if (g.dash) {
                  // 虚线大圆：整体从 0.4 生长到 1 并持续慢转
                  const grow = seg(t, t0 + 0.01, t0 + 0.14, E.outCubic);
                  return (
                    <circle
                      key={k}
                      cx={g.x}
                      cy={0}
                      r={g.r}
                      fill="none"
                      stroke="#565e78"
                      strokeWidth={1.1}
                      strokeDasharray="5 7"
                      opacity={grow * (1 - tout)}
                      transform={`rotate(${-90 + t * 30}) scale(${lerp(grow, 0.4, 1)})`}
                    />
                  );
                }
                // 实线圆：pathLength 归一化 trim 生长 / 出场反向消隐
                const trim =
                  seg(t, t0 + 0.02 + (g.d || 0), t0 + 0.14 + (g.d || 0), E.outCubic) -
                  seg(t, t1 - 0.06, t1, E.inQuad) * (isLast ? 0 : 1);
                return (
                  <circle
                    key={k}
                    cx={g.x}
                    cy={0}
                    r={g.r}
                    fill="none"
                    stroke="#565e78"
                    strokeWidth={1.1}
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset={1 - Math.max(0, trim)}
                    transform="rotate(-90)"
                  />
                );
              })}
            </svg>
            {/* 词组：outline 打底，fill/sheen 绝对层叠 */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%,-52%) scale(${lerp(tout, 1, 0.86)})`,
                fontFamily: '-apple-system,"Helvetica Neue",sans-serif',
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              <div
                style={{
                  color: 'transparent',
                  WebkitTextStroke: '1px #6a7186',
                  opacity: isLast ? 1 - sh : 1 - fillp * 0.75,
                }}
              >
                {label}
              </div>
              {isLast ? (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      color: '#fff',
                      opacity: white,
                      textShadow: `0 0 ${white * 18}px rgba(255,255,255,.3)`,
                    }}
                  >
                    {label}
                  </div>
                  {/* 金属 sheen：渐变 background-clip 文字，背景位从右扫到左 */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      color: 'transparent',
                      backgroundImage:
                        'linear-gradient(100deg,#585f72 0%,#8d95aa 38%,#ffffff 50%,#8d95aa 62%,#585f72 100%)',
                      backgroundSize: '280% 100%',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      opacity: sh * (1 - white),
                      backgroundPosition: `${lerp(sweep, 100, 0)}% 0`,
                    }}
                  >
                    {label}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    color: '#fff',
                    clipPath: `inset(-20% ${(1 - fillp) * 100}% -20% 0)`,
                  }}
                >
                  {label}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </DesignStage>
  );
};
