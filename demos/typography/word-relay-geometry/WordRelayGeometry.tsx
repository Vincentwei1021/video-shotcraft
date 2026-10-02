// word-relay-geometry — Word Relay Geometry 利益词几何接力（motion-lab 定稿转原生 Remotion）
// 三个利益词接力：Faster（虚线大圆）→ Better（三实线圆相扣）→ Stronger（金属 sheen
// 从左扫到右变纯白）。旧词与几何淡出缩小（0.86，带 3px 退焦），新词从 1.06 去虚推近到位、
// 描边→填充进场（填充前沿是柔边而不是硬切口）；圆路径带 trim 生长感，生长中笔头有一粒亮点。
// 背景：中心一处冷色柔光 + 暗角 + 颗粒；漂浮微尘分远近两层（远的更大更虚更淡）。
// 修正：三实线圆按 md 沿 x 轴 −110/0/110 横排（旧版 rotate(-90) 绕原点转，把三圆竖排推出了画面）。
// 收尾：Stronger 的扫光 / 收白提前收束（f164 前收白完成），结论词落定后 hold ≈16f。
// 设计坐标 480×270（DesignStage 等比放大），参数以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';
import { Grain } from '../../_fixtures/Polish';

export const WORD_RELAY_GEOMETRY_DURATION = 180; // 6000ms @30fps

const CIRC_R = 78;
const GEO = '#5a6280'; // 几何线色（比描边暗一档）
const OUTLINE = '#6a7186';

// 微尘粒子（20 个，种子与原 effect.js 完全一致）；按种子分远近两层
const PARTS = Array.from({ length: 20 }, (_, i) => ({
  size: 1 + rand(i * 3) * 1.4,
  x: rand(i) * 100,
  ph: rand(i + 40),
  sp: 0.5 + rand(i + 80) * 0.8,
  far: rand(i + 120) < 0.4,
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

const FEATHER = 6; // 填充揭示前沿柔边（%）

export const WordRelayGeometry: React.FC = () => {
  const t = useT();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <DesignStage bg="#07080c">
        {/* 底景：中心冷色柔光 + 四角压暗 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 46% 52% at 50% 50%, rgba(92,104,150,0.16) 0%, rgba(92,104,150,0) 72%), radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
          }}
        />
        {/* 微尘粒子：缓慢上浮 loop + 呼吸闪烁；远层更大更虚更淡 */}
        {PARTS.map((p, i) => {
          const y = (1 - ((t * p.sp + p.ph) % 1)) * 110 - 5;
          const sz = p.far ? p.size * 1.8 : p.size;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: sz,
                height: sz,
                borderRadius: '50%',
                background: '#dfe4ff',
                left: `${p.x}%`,
                top: `${y}%`,
                filter: p.far ? 'blur(0.8px)' : undefined,
                opacity: (0.12 + 0.18 * Math.sin((t * 3 + p.ph) * Math.PI * 2) ** 2) * (p.far ? 0.6 : 1),
              }}
            />
          );
        })}

        {SLOTS.map(({ label, geom, t0, t1 }, i) => {
          const isLast = i === SLOTS.length - 1;
          const tin = seg(t, t0, t0 + 0.07, E.outCubic);
          const tout = isLast ? 0 : seg(t, t1 - 0.05, t1, E.inQuad);
          const alive = tin > 0 && tout < 1;
          if (!alive) return null;

          // Faster/Better：outline→fill 左起柔边揭示
          const fillp = seg(t, t0 + 0.06, t0 + 0.18, E.inOutCubic);
          // Stronger：描边→sheen 扫光→收纯白（较原版各提前，留出落定 hold）
          const sh = seg(t, t0 + 0.05, t0 + 0.17, E.outQuad); // 出现（描边→sheen）
          const sweep = seg(t, t0 + 0.07, t0 + 0.21, E.inOutCubic); // 扫光位置
          const white = seg(t, t0 + 0.21, t0 + 0.27, E.outQuad); // 收为纯白
          // 进出场的景深：进场 1.06→1 去虚，出场 1→0.86 退焦
          const scale = lerp(tout, 1, 0.86) * lerp(tin, 1.06, 1);
          const defocus = (1 - tin) * 2 + tout * 3;
          const edge = fillp * (100 + FEATHER * 2) - FEATHER;
          const mask = `linear-gradient(90deg, #000 ${(edge - FEATHER).toFixed(2)}%, transparent ${(edge + FEATHER).toFixed(2)}%)`;

          return (
            <div key={label} style={{ position: 'absolute', inset: 0, opacity: tin * (1 - tout) }}>
              <svg
                viewBox="-240 -135 480 270"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
              >
                <defs>
                  <filter id={`geo-glow-${i}`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="1.6" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <g filter={`url(#geo-glow-${i})`}>
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
                          stroke={GEO}
                          strokeWidth={1.1}
                          strokeDasharray="5 7"
                          opacity={grow * (1 - tout)}
                          transform={`rotate(${-90 + t * 30}) scale(${lerp(grow, 0.4, 1)})`}
                        />
                      );
                    }
                    // 实线圆：pathLength 归一化 trim 生长 / 出场反向消隐；12 点起笔（绕自身圆心转 -90°）
                    const grow = seg(t, t0 + 0.02 + (g.d || 0), t0 + 0.14 + (g.d || 0), E.outCubic);
                    const trim = grow - seg(t, t1 - 0.06, t1, E.inQuad) * (isLast ? 0 : 1);
                    const tr = Math.max(0, trim);
                    // 笔头亮点：只在生长中出现，长满即熄
                    const tip = tr > 0.001 && grow < 1 ? 1 - seg(grow, 0.85, 1) : 0;
                    const a = -Math.PI / 2 + tr * Math.PI * 2;
                    return (
                      <g key={k}>
                        <circle
                          cx={g.x}
                          cy={0}
                          r={g.r}
                          fill="none"
                          stroke={GEO}
                          strokeWidth={1.1}
                          pathLength={1}
                          strokeDasharray="1"
                          strokeDashoffset={1 - tr}
                          transform={`rotate(-90 ${g.x} 0)`}
                        />
                        {tip > 0 && (
                          <circle cx={g.x + Math.cos(a) * g.r} cy={Math.sin(a) * g.r} r={1.5} fill="#c9d0ff" opacity={tip} />
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
              {/* 词组：outline 打底，fill/sheen 绝对层叠 */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%,-52%) scale(${scale.toFixed(4)})`,
                  filter: defocus > 0.03 ? `blur(${defocus.toFixed(2)}px)` : undefined,
                  // 描边层要求字形轮廓无重叠：SF Pro 可变字体描边会露出笔画内部交叠线，这里固定用静态字库
                  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                  fontSize: 56,
                  fontWeight: 800,
                  letterSpacing: -1.2,
                  lineHeight: 1,
                }}
              >
                <div
                  style={{
                    color: 'transparent',
                    WebkitTextStroke: `1px ${OUTLINE}`,
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
                        textShadow: `0 0 ${white * 18}px rgba(220,226,255,.3)`,
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
                  fillp > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        color: '#fff',
                        WebkitMaskImage: mask,
                        maskImage: mask,
                      }}
                    >
                      {label}
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </DesignStage>
      {/* 颗粒放在设计坐标容器外，按成片像素取样 */}
      <Grain opacity={0.08} blend="soft-light" />
    </div>
  );
};
