// bezier-source-converge-merge — Bezier Converge 多源曲线汇流吞并（motion-lab 定稿转原生 Remotion）
// 左侧四个来源节点各由一条细贝塞尔曲线连向右侧同一汇聚点：曲线先由左向右 draw-on，
// 节点沿自己的曲线滑向汇聚点并三段式加速缩小（像被吸进去），强调色数据包小圆持续沿
// 路径滑行，吞并完成后曲线从左端反向擦除，只留 video-shotcraft 镜刻标志 + 逐词加深字幕。
// 设计坐标 480×270（DesignStage 等比放大），440×240 定尺画布居中排版。
// 质感层（改版）：柔光浅底 + 颗粒；来源节点换成受光白瓷圆片 + 灰阶线性图标（页面截图/镜头卡/代码/声音四种素材）；
// 曲线用灰→墨渐变描边；数据包是带彗尾的实心强调色点；汇聚点是 video-shotcraft 标志（亮底版）+ 接收涟漪；
// 擦除阶段相机平移把徽标收到画面正中，结尾构图居中落定。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, EASE, FONT, softShadow } from '../../_fixtures/Polish';
import { ShotcraftMark } from '../../_fixtures/Brand';

export const BEZIER_SOURCE_CONVERGE_MERGE_DURATION = 168; // 5600ms @30fps

// ---- 本卡共享量（浅灰瑞士极简系配色，与 Phase 0 fixture 令牌协调） ----
const SANS = FONT.sans;
const TXT = '#17181c'; // 主文字近黑（带冷调）
const DIM = '#c4c6cc'; // 浅灰占位字
const LINE = 'rgba(20,22,28,0.09)'; // 发丝描边
const ACCENT = '#5b63d3'; // 唯一强调色（与 fixture G.accent 一致）
const ACCENT_HI = '#7d84ea';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const h2r = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// 颜色插值：mix(p,'#C9C9CE','#111')
const mix = (p: number, a: string, b: string) => {
  const A = h2r(a), B = h2r(b), q = clamp01(p);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * q)},${Math.round(A[1] + (B[1] - A[1]) * q)},${Math.round(A[2] + (B[2] - A[2]) * q)})`;
};

const XC = 332, YC = 120; // 汇聚点

// 四路素材来源（灰阶分层，仅用于区分四路）：页面截图 / 镜头配方卡 / 代码 / 声音——汇进同一支片子
const SRCS = [
  { y: 36, icon: 'shot', c: '#2a2c33' },
  { y: 92, icon: 'card', c: '#4b4e57' },
  { y: 148, icon: 'code', c: '#6d7079' },
  { y: 204, icon: 'wave', c: '#8f929c' },
];

// 线性图标（24 视框）
const ICON: Record<string, React.ReactNode> = {
  // 页面截图：浏览器窗口
  shot: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.4" />
      <path d="M3.5 9h17" />
      <path d="M6.2 7h.01M8.4 7h.01" />
    </>
  ),
  // 镜头配方卡：一叠卡片
  card: (
    <>
      <rect x="6.5" y="7.5" width="12" height="13" rx="2.2" />
      <path d="M9.5 4.5h7.8c1.2 0 2.2 1 2.2 2.2v9.8" />
      <path d="M9.3 12h6.4M9.3 15.5h4" />
    </>
  ),
  // 代码
  code: (
    <>
      <path d="M8.5 7 3.8 12l4.7 5M15.5 7l4.7 5-4.7 5" />
      <path d="M13.2 5.5 10.8 18.5" />
    </>
  ),
  // 声音：声波
  wave: <path d="M4 12h.01M7.4 9.2v5.6M10.6 5.8v12.4M13.8 8.4v7.2M17 10.4v3.2M20 12h.01" />,
};

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
  // 节点静止位置 x=74 恰是直线段终点（弧长 96），直接标定 f0 = 96/len——
  // 原 40 步扫描精度只有 1/40，四个节点驻留位会左右错开 4–16px，排不成一列
  const f0 = LINE_LEN / len;
  return { len, pointAt, f0 };
};

const GEOMS = SRCS.map((s) => mkPathGeom(s.y));

// 结尾字幕（逐词加深语法，只用到 show + inn 两态）
const CAP_WORDS = 'From screenshot to showreel'.split(' ');
const CAP_ST = 0.78 / CAP_WORDS.length;
const CAP_WIN = CAP_ST * 1.5;

// 汇聚点：白瓷圆片 + video-shotcraft 镜刻标志（亮底版）
const BADGE_SIZE = 46; // 汇聚点白瓷圆片直径（= 接收涟漪的起始直径），略大于 44 的来源节点
const MARK_SIZE = 34; // 标志 viewBox 128 内实形约占 81%，34 → 实形 ≈28，四周留足安全空间

// 数据包彗尾：沿路径向后取 TAIL 个采样点，间隔 TAIL_GAP（路径比例），透明度与尺寸递减
const TAIL = 9;
const TAIL_GAP = 0.0055;

// 结尾相机平移：擦除同时把画布左移 SHIFT，让徽标落到画面正中（画布左缘 20 + XC = 352 → 240）
const SHIFT = 352 - 240;

export const BezierSourceConvergeMerge: React.FC = () => {
  const t = useT();
  const conv = seg(t, 0.34, 0.74, E.inOutCubic);            // 汇聚主进度
  const erase = seg(t, 0.78, 0.9, E.outQuad);               // 从起点擦除
  const pkCycle = (seg(t, 0.1, 0.74, E.linear) * 2) % 1;    // 数据包循环（t=1 时整数周期）
  const pan = seg(t, 0.76, 0.93, EASE.smooth);              // 结尾居中平移（与擦除并行）

  // 徽标呼吸：入场淡入 + 吞并完成瞬间 outBack 顶起再回落
  const bp = seg(t, 0.16, 0.26, E.outCubic);
  const badgeScale = lerp(bp, 0.7, 1) * (1 + seg(t, 0.7, 0.78, E.outBack) * 0.12 - seg(t, 0.78, 0.86, E.outQuad) * 0.12);
  // 接收涟漪：吞并时刻（0.72）一圈细环扩散淡出，只发一次
  const ripple = seg(t, 0.72, 0.86, EASE.out);
  const capShow = seg(t, 0.84, 0.9, EASE.out);
  const capInn = seg(t, 0.84, 0.95);

  return (
    <AbsoluteFill>
      <Backdrop tone="light" light={{ x: 0.62, y: 0.3 }} accent={ACCENT} grain={0.05} vignette={0.12} />
      <DesignStage bg="transparent">
        {/* 页面 + 440×240 定尺画布（居中） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            fontFamily: SANS,
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 440,
              height: 240,
              margin: '-120px 0 0 -220px',
              transform: `translateX(${(-pan * SHIFT).toFixed(2)}px)`,
            }}
          >
            {/* 四条贝塞尔曲线：dashoffset 正向 draw-on，erase 阶段反向擦除 */}
            <svg width={440} height={240} viewBox="0 0 440 240" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              <defs>
                {/* 描边从浅灰过渡到近黑：来源端轻、汇聚端重，读出"流向" */}
                <linearGradient id="bscm-stroke" gradientUnits="userSpaceOnUse" x1={-22} y1={0} x2={XC} y2={0}>
                  <stop offset="0" stopColor="#b8bac2" />
                  <stop offset="0.45" stopColor="#7c7f89" />
                  <stop offset="1" stopColor="#2a2c33" />
                </linearGradient>
              </defs>
              {SRCS.map((s, i) => {
                const { len } = GEOMS[i];
                const draw = seg(t, 0.04 + i * 0.045, 0.04 + i * 0.045 + 0.17, E.outQuad);
                const off = erase > 0 ? -erase * len : len * (1 - draw);
                return (
                  <path
                    key={i}
                    d={`M -22,${s.y} L 74,${s.y} C 186,${s.y} 214,${YC} ${XC},${YC}`}
                    fill="none"
                    stroke="url(#bscm-stroke)"
                    strokeWidth={0.9}
                    strokeLinecap="round"
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
                // 入场：轻微过冲弹出（≈8%），比原 outCubic 多一下"落座"
                const appear = seg(t, 0.02 + i * 0.04, 0.02 + i * 0.04 + 0.1, EASE.overshoot);
                const appearOp = seg(t, 0.02 + i * 0.04, 0.02 + i * 0.04 + 0.06, EASE.out);
                // 数据包（相位偏移，恒定尺寸）+ 彗尾
                const ph = (pkCycle + i * 0.13) % 1;
                const pkOn = seg(t, 0.1, 0.16) * (1 - seg(t, 0.7, 0.76));
                const pkOp = pkOn * (1 - Math.abs(ph - 0.5) * 0.6);
                const k = size / 44; // 节点内部元素按尺寸等比
                return (
                  <React.Fragment key={i}>
                    {/* 彗尾：从尾到头画，头部最亮 */}
                    {pkOp > 0.01 &&
                      Array.from({ length: TAIL }, (_, j) => TAIL - j).map((j) => {
                        const pj = ph - j * TAIL_GAP;
                        if (pj < 0) return null;
                        const q = pointAt(len * (f0 + (1 - f0) * pj));
                        const r = 2.6 * (1 - j / (TAIL + 1));
                        return (
                          <div
                            key={`tail${j}`}
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              width: r * 2,
                              height: r * 2,
                              borderRadius: '50%',
                              background: ACCENT,
                              transform: `translate(${(q.x - r).toFixed(2)}px,${(q.y - r).toFixed(2)}px)`,
                              opacity: (pkOp * 0.38 * (1 - j / (TAIL + 1))).toFixed(3),
                            }}
                          />
                        );
                      })}
                    {pkOp > 0.01 && (() => {
                      const q = pointAt(len * (f0 + (1 - f0) * ph));
                      return (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: `radial-gradient(circle at 35% 35%, ${ACCENT_HI}, ${ACCENT})`,
                            boxShadow: '0 0 0 1.5px rgba(91,99,211,0.16), 0 1px 3px rgba(91,99,211,0.45)',
                            transform: `translate(${(q.x - 3).toFixed(2)}px,${(q.y - 3).toFixed(2)}px)`,
                            opacity: pkOp.toFixed(3),
                          }}
                        />
                      );
                    })()}
                    {/* 来源节点：白瓷圆片（顶部受光渐变 + 发丝线 + 内高光 + 两层软阴影） */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        borderRadius: '50%',
                        background: 'linear-gradient(180deg, #ffffff 0%, #f6f6f4 100%)',
                        border: `0.5px solid ${LINE}`,
                        boxSizing: 'border-box',
                        boxShadow: `inset 0 0.5px 0 rgba(255,255,255,1), ${softShadow(2 + 4 * k, { strength: 0.8 })}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: s.c,
                        willChange: 'transform',
                        width: Math.max(0.1, size),
                        height: Math.max(0.1, size),
                        transform: `translate(${(pt.x - size / 2).toFixed(2)}px,${(pt.y - size / 2).toFixed(2)}px) scale(${appear.toFixed(3)})`,
                        opacity: (appearOp * (tt > 0.92 ? clamp01((1 - tt) / 0.08) : 1)).toFixed(3),
                      }}
                    >
                      <svg
                        width={Math.max(0.1, size * 0.46)}
                        height={Math.max(0.1, size * 0.46)}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {ICON[s.icon]}
                      </svg>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* 接收涟漪：一圈强调色细环，从徽标边缘扩到 2.1 倍并淡出 */}
            <div
              style={{
                position: 'absolute',
                left: XC - BADGE_SIZE / 2,
                top: YC - BADGE_SIZE / 2,
                width: BADGE_SIZE,
                height: BADGE_SIZE,
                borderRadius: '50%',
                border: `0.75px solid ${ACCENT}`,
                boxSizing: 'border-box',
                transform: `scale(${lerp(ripple, 1, 2.1)})`,
                opacity: ripple > 0 && ripple < 1 ? (1 - ripple) * 0.55 : 0,
              }}
            />

            {/* 汇聚点：白瓷圆片（与来源节点同材质，盖住曲线与数据包的汇入端）托着 video-shotcraft 镜刻标志（亮底版，
                标志本身不加渐变/投影）；进场与接收脉冲沿用原徽标的 scale */}
            <div
              style={{
                position: 'absolute',
                width: BADGE_SIZE,
                height: BADGE_SIZE,
                left: XC - BADGE_SIZE / 2,
                top: YC - BADGE_SIZE / 2,
                borderRadius: '50%',
                background: 'linear-gradient(180deg, #ffffff 0%, #f6f6f4 100%)',
                border: `0.5px solid ${LINE}`,
                boxSizing: 'border-box',
                boxShadow: `inset 0 0.5px 0 rgba(255,255,255,1), ${softShadow(8, { strength: 1 })}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: bp,
                transform: `scale(${badgeScale})`,
              }}
            >
              <ShotcraftMark size={MARK_SIZE} tone="light" />
            </div>

            {/* 结尾字幕：逐词加深（浅灰占位 → 近黑），居中于徽标下方，随 show 淡入上浮 */}
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                left: XC - 120,
                width: 240,
                top: YC + 36,
                opacity: capShow,
                transform: `translateY(${((1 - capShow) * 4).toFixed(2)}px)`,
              }}
            >
              {CAP_WORDS.map((w, i) => {
                const q = clamp01((capInn - i * CAP_ST) / CAP_WIN);
                return (
                  <span
                    key={i}
                    style={{
                      font: `600 13px/1.25 ${SANS}`,
                      color: mix(q, DIM, TXT),
                      letterSpacing: (-0.012 - 0.02 * (1 - q)).toFixed(4) + 'em',
                      marginRight: i === CAP_WORDS.length - 1 ? 0 : 4,
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
    </AbsoluteFill>
  );
};
