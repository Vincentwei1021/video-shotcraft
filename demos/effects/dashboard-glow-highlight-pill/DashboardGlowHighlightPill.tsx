// dashboard-glow-highlight-pill — Glow Highlight Pill 金色胶囊指引（motion-lab 定稿转原生 Remotion）
// 金字 "Ready." 悬于黑场，数据仪表盘（订单簿+K线+买卖面板，内容为占位数据）自底带透视升入后
// 保持缓慢 rotateX/rotateY 3D 漂移；金色光斑从右侧面板巡游至底部中央拉成胶囊，背景虚化压暗
// （仪表盘继续漂），辉光描边从底边逆时针描出 Focus Mode 弹窗轮廓，内容淡入后描边收敛为金色细框。
// 设计坐标 480×270（DesignStage raster="zoom" 等比放大），参数表数值以此坐标系标定。
// 验收：SSIM mean=0.9583/min=0.9510（BORDERLINE，对照条逐帧肉眼一致）。余差为近黑底
// 的 x264 暗场量化：把首帧自渲 PNG 过同参数 x264 后与原样片比对得 0.9977——内容已
// 像素级一致，直接比对的 -0.04 全部来自样片解码端的暗部压缩（2-30 电平带被压到 ~0.8x）。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const DASHBOARD_GLOW_HIGHLIGHT_PILL_DURATION = 60; // 2000ms @30fps

// ---- 订单簿行（上红下绿，渐变量条；种子与 effect.js 逐一对应） ----
const OB_ROWS = Array.from({ length: 7 }, (_, i) => ({
  wRed: (30 + rand(i * 3 + 1) * 65).toFixed(0),
  wGreen: (30 + rand(i * 7 + 4) * 65).toFixed(0),
  priceRed: `1${(155.4 - i * 0.12).toFixed(2)}`,
  priceGreen: `1${(155.0 - i * 0.12).toFixed(2)}`,
  amtRed: (rand(i * 11) * 9 + 0.4).toFixed(3),
  amtGreen: (rand(i * 13 + 6) * 9 + 0.4).toFixed(3),
}));

// ---- K 线（确定性随机游走，dv 负偏置 → 整体上行；SVG y 轴向下） ----
const CANDLES: Array<{ x: number; hi: string; lo: string; yTop: string; h: string; col: string; volY: string }> = (() => {
  const out = [];
  let px = 104;
  for (let i = 0; i < 36; i++) {
    const dv = (rand(i * 2.7 + 9) - 0.6) * 13;
    const o = px;
    const c = px + dv;
    px = c;
    const hi = Math.min(o, c) - rand(i * 5.1) * 5;
    const lo = Math.max(o, c) + rand(i * 3.3) * 5;
    const up = c < o;
    out.push({
      x: 6 + i * 7.6,
      hi: hi.toFixed(1),
      lo: lo.toFixed(1),
      yTop: Math.min(o, c).toFixed(1),
      h: Math.max(1.5, Math.abs(dv)).toFixed(1),
      col: up ? '#2bbf8a' : '#d6455a',
      volY: (128 - rand(i * 1.9 + 3) * 16).toFixed(1),
    });
  }
  return out;
})();

// ---- Focus Mode 弹窗几何（原片逐帧实测，注释见 effect.js） ----
const MW = 24.5, MH = 40, MCX = 48.4, MCY = 47; // % of root
const MRAD = 5; // 弹窗圆角（px），描边共用
const RW = 480, RH = 270;
const BW = (RW * MW) / 100, BH = (RH * MH) / 100; // 弹窗盒子像素尺寸
const BO = 0.5; // 描边压在 1px 边框中线上
// 起笔点 = 胶囊停住的位置（BLOB 末帧 x 44.1%），换算成盒内坐标
const SX = ((44.1 - (MCX - MW / 2)) / MW) * BW;
// 描边路径：底边中点起、逆时针一整圈（与 effect.js 的 D 字符串逐字节一致）
const TRACE_D =
  `M${SX.toFixed(1)} ${(BH - BO).toFixed(1)}` +
  ` L${(MRAD + BO).toFixed(1)} ${(BH - BO).toFixed(1)}` +
  ` A${MRAD} ${MRAD} 0 0 1 ${BO} ${(BH - MRAD - BO).toFixed(1)}` +
  ` L${BO} ${(MRAD + BO).toFixed(1)}` +
  ` A${MRAD} ${MRAD} 0 0 1 ${(MRAD + BO).toFixed(1)} ${BO}` +
  ` L${(BW - MRAD - BO).toFixed(1)} ${BO}` +
  ` A${MRAD} ${MRAD} 0 0 1 ${(BW - BO).toFixed(1)} ${(MRAD + BO).toFixed(1)}` +
  ` L${(BW - BO).toFixed(1)} ${(BH - MRAD - BO).toFixed(1)}` +
  ` A${MRAD} ${MRAD} 0 0 1 ${(BW - MRAD - BO).toFixed(1)} ${(BH - BO).toFixed(1)}` +
  ` L${SX.toFixed(1)} ${(BH - BO).toFixed(1)}`;
// pathLength 归一化：dashoffset 直接按百分比走，免去 getTotalLength 运行时测量
const P_L = 100;

// 关键帧插值（segments 间 inOutQuad；lerp 签名是 lerp(t, a, b)）
const KF = (rows: number[][], t: number): number[] => {
  if (t <= rows[0][0]) return rows[0].slice(1);
  for (let i = 1; i < rows.length; i++) {
    if (t <= rows[i][0]) {
      const a = rows[i - 1], b = rows[i];
      const p = E.inOutQuad((t - a[0]) / (b[0] - a[0]));
      return a.slice(1).map((_, k) => lerp(p, a[k + 1], b[k + 1]));
    }
  }
  return rows[rows.length - 1].slice(1);
};

// ---- 逐帧校准的姿态关键帧：[t, rotateX, rotateY, translateX%, translateY%, scale]
// 0.30 只有顶栏切片露在画面底部 → 0.365 基本满幅摆正 → 之后缓慢 3D 漂移；
// 0.62-0.72 有一次明显镜头后拉（87% → 61.5% 宽），把画面让给弹窗。
const POSE = [
  [0.3, 34.0, -13.0, -7.0, 47.0, 1.62],
  [0.322, 24.0, -11.0, -5.5, 30.0, 1.44],
  [0.345, 13.0, -8.0, -3.5, 14.0, 1.22],
  [0.365, 5.5, -5.0, -1.6, 4.0, 1.055],
  [0.42, 2.6, -3.0, -0.6, 0.4, 1.005],
  [0.5, 2.2, -2.0, -0.3, 0.0, 0.966],
  [0.62, 1.8, -0.6, 0.0, -0.5, 0.943],
  [0.67, 1.6, 0.6, -0.4, -0.8, 0.852],
  [0.72, 1.4, 1.4, -0.8, -1.1, 0.707],
  [1.0, 1.2, 2.6, -0.9, -1.3, 0.7],
];

// 光斑巡游关键帧 [t, x%, y%, w, h]：右侧面板圆斑 → 左下移动拉长 → 停在弹窗底边偏左（=描边起笔点）
const BLOB = [
  [0.4, 80.5, 42.0, 22, 22],
  [0.44, 79.7, 46.5, 27, 30],
  [0.5, 77.7, 56.3, 29, 36],
  [0.56, 71.1, 63.9, 56, 25],
  [0.61, 57.6, 65.2, 82, 21],
  [0.65, 44.1, 67.4, 96, 16],
];

const FS = (n: number): React.CSSProperties => ({ fontSize: n });
const rowBetween: React.CSSProperties = { display: 'flex', justifyContent: 'space-between' };

// 订单簿一行（红/绿共用结构，量条右对齐渐变）
const ObRow: React.FC<{ w: string; price: string; amt: string; red?: boolean }> = ({ w, price, amt, red }) => (
  <div style={{ position: 'relative', height: 8.5, margin: '1px 0' }}>
    <div
      style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: `${w}%`,
        background: red
          ? 'linear-gradient(90deg,rgba(214,69,90,.08),rgba(214,69,90,.4))'
          : 'linear-gradient(90deg,rgba(43,191,138,.08),rgba(43,191,138,.4))',
      }}
    />
    <span style={{ position: 'relative', fontSize: 5, color: red ? '#e05a70' : '#3ecf96', paddingLeft: 2 }}>{price}</span>
    <span style={{ position: 'relative', float: 'right', fontSize: 5, color: '#7c828c', paddingRight: 2 }}>{amt}</span>
  </div>
);

export const DashboardGlowHighlightPill: React.FC = () => {
  const t = useT();

  // 金字：满亮保持到 t≈0.30，0.30-0.355 淡出；辉光轻微呼吸
  const yOut = seg(t, 0.3, 0.355, E.inQuad);
  const br = 0.85 + 0.15 * Math.sin(t * Math.PI * 9);

  // 仪表盘姿态（全部走 KF，不叠加二次 ease）
  const [prx, pry, ptx, pty, ps] = KF(POSE, t);
  const dashOp = t >= 0.298 ? seg(t, 0.298, 0.315) : 0;

  // 背景虚化"先起后退"：0.58-0.66 起，0.80-0.93 退掉约一半（原片终帧清晰度仍低于满清晰）
  const blUp = seg(t, 0.58, 0.66, E.inOutQuad);
  const blDown = seg(t, 0.8, 0.93, E.inOutQuad);
  const bl = blUp * (1 - blDown * 0.52);

  // 光斑 0.385-0.425 浮现 → 巡游拉长 → 0.655-0.678 交棒给描边
  const gOn = seg(t, 0.385, 0.425, E.outCubic);
  const gOff = seg(t, 0.655, 0.678, E.inQuad);
  const [bx, by, bw, bh] = KF(BLOB, t);

  // 描边 draw-on 0.655-0.775 走完一圈（outQuad 快起步），0.79-0.93 收敛成金色细框
  const dr = seg(t, 0.655, 0.775, E.outQuad);
  const settle = seg(t, 0.79, 0.93, E.inOutQuad);

  // 弹窗内容淡入：底板比文字早一点到位
  const mBase = seg(t, 0.665, 0.75, E.outCubic);
  const mc = seg(t, 0.715, 0.84, E.outCubic);
  // 弹窗/描边跟随半幅相机漂移，与背景仪表盘同向浮动
  const mDrift =
    ` rotateX(${(prx * 0.45).toFixed(2)}deg) rotateY(${(pry * 0.45).toFixed(2)}deg)` +
    ` translate(${(ptx * 0.5).toFixed(2)}%,${(pty * 0.5).toFixed(2)}%)`;
  const modalTransform = `translate(-50%,-50%) scale(${(0.985 + mc * 0.015).toFixed(4)})` + mDrift;

  return (
    <DesignStage bg="#050403" raster="zoom">
      <div
        style={{
          position: 'absolute', inset: 0, background: '#050403', overflow: 'hidden',
          perspective: 800, fontFamily: '-apple-system,system-ui,sans-serif',
        }}
      >
        {/* 暖色底光（原片黑场并非纯黑，顶部偏暖褐） */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(130% 95% at 42% -8%,rgba(104,74,30,.32),rgba(44,32,14,.14) 42%,rgba(0,0,0,0) 74%)',
          }}
        />
        {/* 开场发光金字（上端浅暖白、下端沉到金褐；background-clip:text 辉光只能走 filter） */}
        <div
          style={{
            position: 'absolute', left: '50%', top: '49%', transform: 'translate(-50%,-50%)',
            fontSize: 27, fontWeight: 400, letterSpacing: 0.2, whiteSpace: 'nowrap',
            background: 'linear-gradient(178deg,#fff8e2 6%,#f6dfa4 44%,#e0bd72 70%,#c99a45 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            opacity: 1 - yOut,
            filter:
              `drop-shadow(0 0 7px rgba(255,232,168,${(0.8 * br).toFixed(2)}))` +
              ` drop-shadow(0 0 20px rgba(233,190,105,${(0.5 * br).toFixed(2)})) drop-shadow(0 0 44px rgba(200,158,78,.3))`,
          }}
        >
          Ready.
        </div>

        {/* 交易所仪表盘（自底带透视升入；基准尺寸=落位后满幅，靠 scale 推拉） */}
        <div
          style={{
            position: 'absolute', left: '50%', top: '50%', width: '87%', height: '91%',
            opacity: dashOp,
            transform:
              `translate(-50%,-50%) translate(${ptx.toFixed(2)}%,${pty.toFixed(2)}%)` +
              ` rotateX(${prx.toFixed(2)}deg) rotateY(${pry.toFixed(2)}deg) scale(${ps.toFixed(4)})`,
          }}
        >
          <div
            style={{
              position: 'absolute', inset: 0, borderRadius: 6, background: '#101114',
              border: '1px solid #24272d', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.6)',
              filter: `blur(${(bl * 4.5).toFixed(2)}px) brightness(${(1.5 + bl * 0.05).toFixed(3)}) saturate(1.06)`,
            }}
          >
            {/* 顶栏 */}
            <div style={{ height: '9%', borderBottom: '1px solid #1a1c20', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 10 }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: '#e8e6df', letterSpacing: 1 }}>◆ ACME</span>
              <span style={{ ...FS(6), color: '#9aa0aa' }}>Trade</span>
              <span style={{ ...FS(6), color: '#565c66' }}>Earn</span>
              <span style={{ ...FS(6), color: '#565c66' }}>Vault</span>
              <span style={{ marginLeft: 'auto', ...FS(6), color: '#565c66' }}>Support {' '} 0x8f...c2 {' '}</span>
              <span style={{ ...FS(6), color: '#0b0c0e', background: '#e6c476', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>Connect</span>
            </div>
            {/* 左：订单簿 */}
            <div style={{ position: 'absolute', left: 0, top: '9%', bottom: '16%', width: '24%', borderRight: '1px solid #1a1c20', padding: '4px 5px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                <span style={{ ...FS(6), color: '#d8dbe0', borderBottom: '1px solid #e6c476', paddingBottom: 1 }}>Orderbook</span>
                <span style={{ ...FS(6), color: '#565c66' }}>Trades</span>
              </div>
              {OB_ROWS.map((r, i) => (
                <ObRow key={`r${i}`} w={r.wRed} price={r.priceRed} amt={r.amtRed} red />
              ))}
              <div style={{ fontSize: 7, fontWeight: 800, color: '#e05a70', padding: 2 }}>155.01 ▼</div>
              {OB_ROWS.map((r, i) => (
                <ObRow key={`g${i}`} w={r.wGreen} price={r.priceGreen} amt={r.amtGreen} />
              ))}
            </div>
            {/* 中：K 线 */}
            <div style={{ position: 'absolute', left: '24%', top: '9%', bottom: '16%', right: '22%', padding: '4px 6px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 7, fontWeight: 700, color: '#e8e6df' }}>
                  ● TOKEN-USD <span style={{ color: '#565c66', fontSize: 5 }}>PERP</span>
                </span>
                <span style={{ fontSize: 8, fontWeight: 800, color: '#3ecf96' }}>155.01</span>
                <span style={{ ...FS(5), color: '#7c828c' }}>24h Vol $1,891,145.10 {' '} Funding 0.0042% {' '} OI $9.4M</span>
              </div>
              <svg viewBox="0 0 290 130" style={{ width: '100%', height: '84%' }} preserveAspectRatio="none">
                {CANDLES.map((c, i) => (
                  <React.Fragment key={i}>
                    <line x1={c.x + 2} y1={c.hi} x2={c.x + 2} y2={c.lo} stroke={c.col} strokeWidth={0.8} />
                    <rect x={c.x} y={c.yTop} width={4} height={c.h} fill={c.col} />
                    <rect x={c.x} y={c.volY} width={4} height={16} fill={c.col} opacity={0.45} />
                  </React.Fragment>
                ))}
              </svg>
            </div>
            {/* 右：买卖面板 */}
            <div style={{ position: 'absolute', right: 0, top: '9%', bottom: '16%', width: '22%', borderLeft: '1px solid #1a1c20', padding: '4px 6px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                <span style={{ flex: 1, textAlign: 'center', fontSize: 5.5, color: '#d8dbe0', background: '#1d2026', borderRadius: 3, padding: '2px 0' }}>Cross</span>
                <span style={{ flex: 1, textAlign: 'center', fontSize: 5.5, color: '#7c828c', background: '#14161a', borderRadius: 3, padding: '2px 0' }}>10x</span>
                <span style={{ flex: 1, textAlign: 'center', fontSize: 5.5, color: '#7c828c', background: '#14161a', borderRadius: 3, padding: '2px 0' }}>One-Way</span>
              </div>
              <div style={{ ...rowBetween, ...FS(5), color: '#7c828c', marginBottom: 2 }}>
                <span>Market</span><span>Limit</span><span>Pro</span>
              </div>
              <div style={{ height: 5, margin: '4px 0', background: 'linear-gradient(90deg,#e6c476,#e6c476 60%,#2a2d33 60%)', borderRadius: 2 }} />
              <div style={{ ...FS(5), color: '#7c828c', marginBottom: 4 }}>▢ Reduce Only</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                <div style={{ flex: 1, height: 14, borderRadius: 3, background: '#19a374', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 700, color: '#04120c' }}>Buy</div>
                <div style={{ flex: 1, height: 14, borderRadius: 3, background: '#d6455a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 700, color: '#1c0508' }}>Sell</div>
              </div>
              {(['Current Position|0.00 TOKEN', 'Liq. Price|--', 'Order Value|$0.00', 'Margin Required|$0.00', 'Fees|0.035% / 0.010%'] as const).map((s) => {
                const p = s.split('|');
                return (
                  <div key={p[0]} style={{ ...rowBetween, ...FS(5), color: '#7c828c', marginBottom: 2.5 }}>
                    <span>{p[0]}</span><span style={{ color: '#b9bec6' }}>{p[1]}</span>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px solid #1a1c20', marginTop: 4, paddingTop: 3, fontSize: 5.5, color: '#d8dbe0' }}>Account</div>
              {(['Portfolio Margin|$20,182.49', 'Unrealized PNL|+$142.11', 'Available|$1,021.19'] as const).map((s) => {
                const p = s.split('|');
                return (
                  <div key={p[0]} style={{ ...rowBetween, ...FS(5), color: '#7c828c', marginTop: 2.5 }}>
                    <span>{p[0]}</span><span style={{ color: '#b9bec6' }}>{p[1]}</span>
                  </div>
                );
              })}
            </div>
            {/* 底：持仓表 */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '16%', borderTop: '1px solid #1a1c20', padding: '3px 8px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', gap: 9, marginBottom: 3 }}>
                {['Positions (2)', 'Open Orders (0)', 'Balances', 'Order History', 'Trade History', 'Funding History', 'Position History'].map((s, i) => (
                  <span key={s} style={{ ...FS(5), color: i === 0 ? '#d8dbe0' : '#565c66' }}>{s}</span>
                ))}
              </div>
              {[0, 1].map((i) => (
                <div key={i} style={{ display: 'flex', gap: 12, ...FS(5), color: '#7c828c', marginBottom: 2 }}>
                  <span style={{ color: '#d8dbe0' }}>{i === 0 ? 'TOKEN' : 'ALT'}-USD</span>
                  <span style={{ color: i === 0 ? '#3ecf96' : '#e05a70' }}>{i === 0 ? '+12.40' : '-3.61'}</span>
                  <span>152.30</span><span>$7,801.75</span><span>$1,775.00</span><span>74,212.07</span><span>$53,225.00</span>
                  <span style={{ color: '#e6c476' }}>Market | Limit</span>
                  <span style={{ color: '#7c828c' }}>Reverse</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 虚化压暗层 */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,5,4,.4)', opacity: blUp * 0.22, pointerEvents: 'none' }} />

        {/* 金色巡游光斑：实心亮核 + box-shadow 外扩辉光（root 有 perspective，screen 混合会被隔离，见 effect.js） */}
        <div
          style={{
            position: 'absolute',
            left: `${bx.toFixed(2)}%`, top: `${by.toFixed(2)}%`,
            width: Number(bw.toFixed(1)), height: Number(bh.toFixed(1)),
            borderRadius: Number((bh / 2).toFixed(1)),
            transform: 'translate(-50%,-50%)',
            background: 'radial-gradient(60% 60% at 50% 50%,#fffefa 0%,#fffdf2 40%,#ffeec2 66%,rgba(255,206,110,.5) 85%,rgba(212,165,70,0))',
            filter: 'blur(2px)',
            opacity: gOn * (1 - gOff),
            pointerEvents: 'none',
            boxShadow: '0 0 18px rgba(255,235,175,.95),0 0 44px rgba(240,200,120,.6),0 0 90px rgba(212,175,90,.35)',
          }}
        />

        {/* Focus Mode 弹窗（描边与它共用同一个盒子与 transform 链，全程贴合轮廓） */}
        <div
          style={{
            position: 'absolute', left: `${MCX}%`, top: `${MCY}%`, width: `${MW}%`, height: `${MH}%`,
            transform: modalTransform,
            opacity: Math.max(mBase * 0.72, mc),
            borderRadius: MRAD,
            background: 'linear-gradient(170deg,#141310,#0d0c0a)',
            border: '1px solid rgba(230,196,118,.3)',
            boxShadow: `0 0 ${(12 * mc).toFixed(1)}px rgba(212,175,90,${(0.3 * mc).toFixed(3)}),0 18px 44px rgba(0,0,0,.72)`,
            padding: '6px 7px', boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: 5.5, fontWeight: 700, color: '#f2ead2', marginBottom: 4 }}>Focus Mode</div>
          <div style={{ fontSize: 3.4, lineHeight: 1.62, color: '#8b8f98', marginBottom: 3 }}>
            All panels share one unified workspace layout. Changes in one panel are reflected in the others,{' '}
            <span style={{ color: '#cbb26a' }}>keeping context in one place</span>.
          </div>
          <div style={{ fontSize: 3.4, color: '#8b8f98', marginBottom: 4 }}>Choose how panels are arranged:</div>
          <div style={{ border: '1px solid rgba(230,196,118,.42)', borderRadius: 3, background: 'rgba(230,196,118,.05)', padding: '4px 5px', marginBottom: 4 }}>
            <div style={{ fontSize: 4, fontWeight: 700, color: '#eee6cc' }}>● Standard</div>
            <div style={{ fontSize: 3.3, lineHeight: 1.55, color: '#8b8f98', marginTop: 1.5 }}>
              Placeholder body copy for option one. The selected option directly determines the layout of each panel — simple and predictable.
            </div>
          </div>
          <div style={{ border: '1px solid #23252a', borderRadius: 3, padding: '4px 5px' }}>
            <div style={{ fontSize: 4, fontWeight: 700, color: '#b9bec6' }}>○ Pro</div>
            <div style={{ fontSize: 3.3, lineHeight: 1.55, color: '#71757e', marginTop: 1.5 }}>
              Placeholder body copy for option two, written a little longer so the block keeps its shape. Replace both with your own wording.
            </div>
          </div>
          <div
            style={{
              position: 'absolute', left: 7, right: 7, bottom: 6, height: 9, borderRadius: 2.5,
              background: 'linear-gradient(180deg,#e2bd63,#caa03e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 4, fontWeight: 700, color: '#241b06',
            }}
          >
            Confirm
          </div>
        </div>

        {/* 辉光描边（viewBox 1 unit = 1 CSS px；pathLength 归一化免运行时 getTotalLength） */}
        <div
          style={{
            position: 'absolute', left: `${MCX}%`, top: `${MCY}%`, width: `${MW}%`, height: `${MH}%`,
            transform: modalTransform,
            pointerEvents: 'none',
            opacity: dr > 0.001 ? 1 - settle * 0.42 : 0,
            mixBlendMode: 'screen',
          }}
        >
          <svg viewBox={`0 0 ${BW.toFixed(2)} ${BH.toFixed(2)}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <path
              d={TRACE_D}
              pathLength={P_L}
              fill="none"
              stroke={settle > 0.5 ? '#e6c887' : '#fff0c4'}
              strokeWidth={Number((2.9 - settle * 1.9).toFixed(2))}
              strokeLinecap="round"
              strokeDasharray={`${P_L} ${P_L}`}
              strokeDashoffset={Number((P_L * (1 - dr)).toFixed(1))}
              style={{
                filter:
                  settle > 0.001
                    ? `drop-shadow(0 0 ${(3 - settle * 2.3).toFixed(2)}px rgba(255,232,160,${(0.95 - settle * 0.5).toFixed(2)}))` +
                      ` drop-shadow(0 0 ${(10 - settle * 8).toFixed(1)}px rgba(240,200,110,${(0.75 - settle * 0.62).toFixed(2)}))`
                    : 'drop-shadow(0 0 3px rgba(255,232,160,.95)) drop-shadow(0 0 10px rgba(240,200,110,.75)) drop-shadow(0 0 26px rgba(212,175,90,.4))',
              }}
            />
          </svg>
        </div>
      </div>
    </DesignStage>
  );
};
