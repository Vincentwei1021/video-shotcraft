// bezier-source-converge-merge — Bezier Converge 多源曲线汇流吞并（motion-lab 定稿转原生 Remotion）
// 左侧四个来源节点各由一条细黑贝塞尔曲线连向右侧同一汇聚点：曲线先由左向右 draw-on，
// 节点沿自己的曲线滑向汇聚点并三段式加速缩小（像被吸进去），强调色数据包小圆持续沿
// 路径滑行，吞并完成后曲线从左端反向擦除，只留圆形徽标 + 逐词加深字幕。
// 设计坐标 480×270（DesignStage 等比放大），440×240 定尺画布居中排版。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const BEZIER_SOURCE_CONVERGE_MERGE_DURATION = 168; // 5600ms @30fps

// ---- 本卡共享量（浅灰瑞士极简系配色 / 字体，与 effect.js 一致） ----
const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
const BG = '#F1F1F3'; // 页面浅灰
const TXT = '#111111'; // 正文黑
const DIM = '#C9C9CE'; // 浅灰占位字
const LINE = '#E6E6EA'; // 描边
const ACCENT = '#3B82F6';
const ACCENT_WASH = 'rgba(59,130,246,.12)';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const h2r = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// 颜色插值：mix(p,'#C9C9CE','#111')
const mix = (p: number, a: string, b: string) => {
  const A = h2r(a), B = h2r(b), q = clamp01(p);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * q)},${Math.round(A[1] + (B[1] - A[1]) * q)},${Math.round(A[2] + (B[2] - A[2]) * q)})`;
};

const XC = 332, YC = 120; // 汇聚点

// 中性来源节点占位（灰阶分层，仅用于区分四路来源）
const SRCS = [
  { y: 36, tag: 'S1', c: '#111111' },
  { y: 92, tag: 'S2', c: '#4A4A50' },
  { y: 148, tag: 'S3', c: '#7A7A82' },
  { y: 204, tag: 'S4', c: '#A3A3AA' },
];

type Pt = { x: number; y: number };

// 手写 cubic bezier 采样：P0=(74,y0) P1=(186,y0) P2=(214,YC) P3=(XC,YC)
const cubic = (y0: number, u: number): Pt => {
  const v = 1 - u;
  return {
    x: v * v * v * 74 + 3 * v * v * u * 186 + 3 * v * u * u * 214 + u * u * u * XC,
    y: v * v * v * y0 + 3 * v * v * u * y0 + 3 * v * u * u * YC + u * u * u * YC,
  };
};

// 路径几何 = 直线段 M -22,y L 74,y（定长 96）+ 上述 cubic。等价 getTotalLength /
// getPointAtLength：cubic 段建累积弧长表（1600 段折线，误差远低于 0.01px），
// 二分反查弧长→参数 u；纯模块级预计算，无 DOM 依赖，确定性渲染。
const SAMPLES = 1600;
const LINE_LEN = 96;
const mkPathGeom = (y0: number) => {
  const cum: number[] = [0];
  let px = 74, py = y0, acc = 0;
  for (let k = 1; k <= SAMPLES; k++) {
    const p = cubic(y0, k / SAMPLES);
    acc += Math.hypot(p.x - px, p.y - py);
    cum.push(acc);
    px = p.x; py = p.y;
  }
  const len = LINE_LEN + acc;
  const pointAt = (s: number): Pt => {
    const sc = Math.max(0, Math.min(len, s));
    if (sc <= LINE_LEN) return { x: -22 + sc, y: y0 };
    const target = sc - LINE_LEN;
    let lo = 0, hi = SAMPLES;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1; else hi = mid;
    }
    const i = Math.max(1, lo);
    const s0 = cum[i - 1], s1 = cum[i];
    const u = (i - 1 + (s1 > s0 ? (target - s0) / (s1 - s0) : 0)) / SAMPLES;
    return cubic(y0, u);
  };
  // 求节点静止位置对应的路径 frac（x ≈ 74），与 effect.js prime() 同算法
  let f0 = 0.2;
  for (let k = 1; k <= 40; k++) {
    const q = k / 40;
    if (pointAt(len * q).x >= 74) { f0 = q; break; }
  }
  return { len, pointAt, f0 };
};

const GEOMS = SRCS.map((s) => mkPathGeom(s.y));

// 结尾字幕（逐词加深语法，只用到 show + inn 两态）
const CAP_WORDS = 'Four sources unified'.split(' ');
const CAP_ST = 0.78 / CAP_WORDS.length;
const CAP_WIN = CAP_ST * 1.5;

// 白底圆形徽标（内含四角星，中性占位标记），size=34
const BADGE_SIZE = 34;
const BADGE_SVG = Number((BADGE_SIZE * 0.52).toFixed(1));

export const BezierSourceConvergeMerge: React.FC = () => {
  const t = useT();
  const conv = seg(t, 0.34, 0.74, E.inOutCubic);            // 汇聚主进度
  const erase = seg(t, 0.78, 0.9, E.outQuad);               // 从起点擦除
  const pkCycle = (seg(t, 0.1, 0.74, E.linear) * 2) % 1;    // 数据包循环（t=1 时整数周期）

  // 徽标呼吸：入场淡入 + 吞并完成瞬间 outBack 顶起再回落
  const bp = seg(t, 0.16, 0.26, E.outCubic);
  const badgeScale = lerp(bp, 0.7, 1) * (1 + seg(t, 0.7, 0.78, E.outBack) * 0.12 - seg(t, 0.78, 0.86, E.outQuad) * 0.12);
  const capShow = seg(t, 0.84, 0.9);
  const capInn = seg(t, 0.84, 1);

  return (
    <DesignStage bg={BG}>
      {/* 页面 + 440×240 定尺画布（居中） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: BG,
          overflow: 'hidden',
          fontFamily: SANS,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 440, height: 240, margin: '-120px 0 0 -220px' }}>
          {/* 四条贝塞尔曲线：dashoffset 正向 draw-on，erase 阶段反向擦除 */}
          <svg width={440} height={240} viewBox="0 0 440 240" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            {SRCS.map((s, i) => {
              const { len } = GEOMS[i];
              const draw = seg(t, 0.04 + i * 0.045, 0.04 + i * 0.045 + 0.17, E.outQuad);
              const off = erase > 0 ? -erase * len : len * (1 - draw);
              return (
                <path
                  key={i}
                  d={`M -22,${s.y} L 74,${s.y} C 186,${s.y} 214,${YC} ${XC},${YC}`}
                  fill="none"
                  stroke={TXT}
                  strokeWidth={1.2}
                  strokeDasharray={len}
                  strokeDashoffset={off.toFixed(1)}
                  opacity={(draw * (1 - clamp01((erase - 0.85) / 0.15))).toFixed(3)}
                />
              );
            })}
          </svg>

          {/* 来源节点 + 数据包层 */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: 440, height: 240 }}>
            {SRCS.map((s, i) => {
              const { len, pointAt, f0 } = GEOMS[i];
              // 节点沿路径滑向汇聚点，三段式缩小（44→15→0，像被吸进去）
              const tt = conv;
              const frac = f0 + (1 - f0) * tt;
              const pt = pointAt(len * frac);
              const size = tt < 0.75 ? lerp(tt / 0.75, 44, 15) : lerp((tt - 0.75) / 0.25, 15, 0);
              const appear = seg(t, 0.02 + i * 0.04, 0.02 + i * 0.04 + 0.1, E.outCubic);
              // 数据包（相位偏移，恒定尺寸）
              const pf = f0 + (1 - f0) * ((pkCycle + i * 0.13) % 1);
              const q = pointAt(len * pf);
              const pkOn = seg(t, 0.1, 0.16) * (1 - seg(t, 0.7, 0.76));
              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      borderRadius: '50%',
                      background: '#fff',
                      border: `1px solid ${LINE}`,
                      boxSizing: 'border-box',
                      boxShadow: '0 3px 12px rgba(0,0,0,.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      lineHeight: 1,
                      fontFamily: SANS,
                      color: s.c,
                      letterSpacing: 0.3,
                      willChange: 'transform',
                      width: Math.max(0.1, size),
                      height: Math.max(0.1, size),
                      transform: `translate(${(pt.x - size / 2).toFixed(2)}px,${(pt.y - size / 2).toFixed(2)}px) scale(${appear.toFixed(3)})`,
                      fontSize: `${Math.max(4, size * 0.26).toFixed(1)}px`,
                      opacity: (appear * (tt > 0.92 ? clamp01((1 - tt) / 0.08) : 1)).toFixed(3),
                    }}
                  >
                    {s.tag}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      border: `1.5px solid ${ACCENT}`,
                      boxSizing: 'border-box',
                      background: ACCENT_WASH,
                      transform: `translate(${(q.x - 3.5).toFixed(2)}px,${(q.y - 3.5).toFixed(2)}px)`,
                      opacity: (pkOn * (1 - Math.abs(((pkCycle + i * 0.13) % 1) - 0.5) * 0.6)).toFixed(3),
                    }}
                  />
                </React.Fragment>
              );
            })}
          </div>

          {/* 汇聚点徽标（白底圆 + 四角星） */}
          <div
            style={{
              position: 'absolute',
              width: BADGE_SIZE,
              height: BADGE_SIZE,
              borderRadius: '50%',
              background: '#fff',
              border: `1px solid ${LINE}`,
              boxSizing: 'border-box',
              boxShadow: '0 2px 10px rgba(0,0,0,.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              left: XC - 17,
              top: YC - 17,
              opacity: bp,
              transform: `scale(${badgeScale})`,
            }}
          >
            <svg width={BADGE_SVG} height={BADGE_SVG} viewBox="0 0 24 24">
              <path d="M12 0.8 L14.3 9.7 L23.2 12 L14.3 14.3 L12 23.2 L9.7 14.3 L0.8 12 L9.7 9.7 Z" fill={TXT} />
            </svg>
          </div>

          {/* 结尾字幕：逐词加深（浅灰占位 → 黑），整行透明度随 show 淡入 */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'baseline',
              whiteSpace: 'nowrap',
              left: XC - 60,
              top: YC + 30,
              opacity: capShow,
            }}
          >
            {CAP_WORDS.map((w, i) => {
              const q = clamp01((capInn - i * CAP_ST) / CAP_WIN);
              return (
                <span
                  key={i}
                  style={{
                    font: `600 12px/1.25 ${SANS}`,
                    color: mix(q, DIM, TXT),
                    letterSpacing: (-0.03 * (1 - q)).toFixed(4) + 'em',
                    marginRight: i === CAP_WORDS.length - 1 ? 0 : 4.5,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
