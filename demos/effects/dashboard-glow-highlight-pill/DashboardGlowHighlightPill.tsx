// dashboard-glow-highlight-pill —— Glow Highlight Pill 金色胶囊指引
// 金字悬于黑场 → 交易仪表盘自底带透视升入并持续 3D 漂移 → 一团香槟金光斑从右上的 Focus 按钮
// 被"拾起"、沿弧线向左下巡游并拉成胶囊 → 胶囊在弹窗底边一分为二，两道光头沿轮廓左右包抄、
// 在顶边中点汇合 → 描边收敛成金色细框，弹窗内容逐层落定。三段是同一束光的连续变形。
//
// 第二轮重设计（黑金 · 交易终端「Sextant」）：
// - look = graphite（近单色暗场）+ 香槟金（accent2 #e4c58a 家族）作唯一强调色：仪表盘的 K 线做成象牙白实体 /
//   灰色空心的单色蜡烛，涨跌不再用红绿抢色，整幅画面里只有光和弹窗是金的。
// - 开场标题改为 140px 衬线金字「Trade with focus.」逐字由宽收紧 + 呼吸泛光；仪表盘按 1600×900 原生像素
//   布局（不再是 480×270 设计坐标放大），K 线、自选、下单栏都是为镜头设计的大字号 UI。
// - 光斑走二次贝塞尔弧（起点 = Focus 按钮，终点 = 弹窗底边中点），形状随切线方向拉伸成彗星，末端水平成胶囊；
//   描边改为"一分为二、双向包抄、顶边汇合"（汇合点一次小闪），比原版单向绕圈快一倍、更对称。
// - 弹窗 760×500：52px 标题 / 26px 正文 / 双选项卡（Focus 选中，金色单选）/ 金色确认按钮，出版级可读。
//
// 时间表（30fps，共 136f）：
//   0–22    预备：舞台暖光 + 金字逐字由虚到实、字距收拢、轻微上浮（0.8f 错峰），第 1 帧就有字
//   20–53   主动作①：金字 20–34 上浮淡出（exit）；仪表盘 27 起 rotateX 40°→4°、y 560→0 透视升入（snappy 26f），之后持续 yaw 漂移
//   46–56   Focus 按钮被点亮（光被拾起）
//   52–78   主动作②：光斑沿弧线巡游（smooth in-out 26f），由圆斑拉成彗星再压成水平胶囊；仪表盘同步虚化压暗、后拉到 0.93
//   78–100  主动作③：胶囊一分为二，双光头沿弹窗轮廓包抄（snappy 22f），100f 顶边汇合小闪
//   82–112  跟随：弹窗底板先到（82），标题 / 正文 / 选项 / 按钮逐层升起（3–4f 错峰）
//   100–116 余波：描边收敛——笔宽 4→1.5px、暖白→香槟金、辉光撤到常驻细框
//   116–136 hold：仪表盘继续极缓漂移，弹窗静止，干净落定
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, SERIF, Stage, alpha, glowFilter } from '../../_fixtures/Look';

export const DASHBOARD_GLOW_HIGHLIGHT_PILL_DURATION = 136;

const L = { ...LOOKS.graphite, light: '#b89a62' }; // 石墨底，主光偏暖（黑金调）
const GOLD = '#e6c785';
const GOLD_HI = '#fff4da';
const GOLD_DEEP = '#b48a43';
const IVORY = '#ecebe5';

// 仪表盘基准盒（屏幕居中，原生像素）
const DW = 1600;
const DH = 900;
// 弹窗几何（屏幕坐标）
const MW = 760;
const MH = 500;
const MX = 960 - MW / 2;
const MY = 572 - MH / 2;
const MR = 26; // 圆角
// 光斑弧线：Focus 按钮 → 弹窗底边中点
const P0 = { x: 1650, y: 142 };
const PC = { x: 1560, y: 800 };
const P2 = { x: 960, y: MY + MH };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const hash = (n: number) => {
  const x = Math.sin(n * 91.7 + 13.1) * 43758.5453;
  return x - Math.floor(x);
};

// ───────── 数据（确定性） ─────────
const CANDLES = (() => {
  const out: Array<{ o: number; c: number; h: number; l: number; v: number }> = [];
  let p = 52;
  for (let i = 0; i < 46; i++) {
    const drift = 0.9 + Math.sin(i / 6) * 1.4;
    const d = (hash(i * 3.1) - 0.38) * 7 + drift * 0.6;
    const o = p, c = p + d;
    p = c;
    out.push({ o, c, h: Math.max(o, c) + hash(i * 5.7) * 3.2, l: Math.min(o, c) - hash(i * 2.3) * 3.2, v: 0.25 + hash(i * 7.9) * 0.75 });
  }
  return out;
})();
const WATCH: Array<[string, string, string, boolean]> = [
  ['AURA', '3,482.16', '+2.41%', true],
  ['KITE', '18.04', '−0.82%', false],
  ['ONYX', '1,204.55', '+1.10%', true],
  ['VELA', '0.6421', '+5.93%', true],
  ['MOSS', '92.17', '−0.31%', false],
  ['TIDE', '7.882', '+0.46%', true],
];

// ───────── 仪表盘 ─────────
const Dashboard: React.FC<{ focusLit: number }> = ({ focusLit }) => {
  const chartW = DW - 340 - 380;
  const chartH = 470;
  const lo = Math.min(...CANDLES.map((c) => c.l)), hi = Math.max(...CANDLES.map((c) => c.h));
  const y = (v: number) => 20 + (1 - (v - lo) / (hi - lo)) * (chartH - 130);
  const step = (chartW - 60) / CANDLES.length;
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden', fontFamily: FONT.sans, color: IVORY,
      background: 'linear-gradient(180deg,#17171a 0%,#121214 100%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(255,255,255,0.07)',
    }}>
      {/* 顶栏 */}
      <div style={{ height: 76, display: 'flex', alignItems: 'center', padding: '0 30px', gap: 34, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 27, fontWeight: 750, letterSpacing: '-0.02em' }}>
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={2}><path d="M3 21 A18 18 0 0 1 21 3" /><path d="M3 21 21 3" /><circle cx="3" cy="21" r="1.6" fill={GOLD} /></svg>
          Sextant
        </div>
        {['Markets', 'Portfolio', 'Earn'].map((n, i) => (
          <span key={n} style={{ fontSize: 22, fontWeight: 550, color: i === 0 ? IVORY : '#6f7177' }}>{n}</span>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 20, color: '#6f7177', fontFamily: FONT.mono }}>0x8f…c2</div>
        {/* Focus 按钮：光从这里被拾起 */}
        <div style={{
          height: 44, padding: '0 20px', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 10, fontSize: 21, fontWeight: 650,
          color: focusLit > 0.05 ? '#1a1407' : GOLD, border: `1.5px solid ${alpha(GOLD, 0.6)}`,
          background: `rgba(230,199,133,${(0.95 * focusLit).toFixed(3)})`,
          boxShadow: `0 0 ${(30 * focusLit).toFixed(1)}px ${alpha(GOLD, 0.7 * focusLit)}`,
        }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" /></svg>
          Focus
        </div>
      </div>
      {/* 自选 */}
      <div style={{ position: 'absolute', left: 0, top: 76, bottom: 0, width: 340, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '22px 26px', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.14em', color: '#6f7177', marginBottom: 14 }}>WATCHLIST</div>
        {WATCH.map(([s, p, ch, up], i) => (
          <div key={s} style={{
            height: 78, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: '0 14px', margin: '0 -14px',
            background: i === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
          }}>
            <div>
              <div style={{ fontSize: 23, fontWeight: 700 }}>{s}</div>
              <div style={{ fontSize: 17, color: '#6f7177', marginTop: 2 }}>/ USD</div>
            </div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{p}</div>
              <div style={{ fontSize: 17, color: up ? '#c9c7bf' : '#77797f', marginTop: 2 }}>{ch}</div>
            </div>
          </div>
        ))}
      </div>
      {/* 主图 */}
      <div style={{ position: 'absolute', left: 340, top: 76, width: chartW, height: DH - 76 - 170, padding: '26px 32px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <span style={{ fontSize: 26, fontWeight: 700 }}>AURA / USD</span>
          <span style={{ fontSize: 18, color: '#6f7177', fontWeight: 600, letterSpacing: '0.1em' }}>PERP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.035em' }}>3,482.16</span>
          <span style={{ fontSize: 24, fontWeight: 650, color: GOLD }}>+2.41%</span>
          <span style={{ fontSize: 20, color: '#6f7177' }}>24h vol 1.89B</span>
        </div>
        <svg width={chartW - 64} height={chartH} style={{ position: 'absolute', left: 32, top: 150 }}>
          {[0, 1, 2, 3].map((k) => (
            <line key={k} x1={0} x2={chartW - 64} y1={30 + k * 95} y2={30 + k * 95} stroke="rgba(255,255,255,0.05)" />
          ))}
          {CANDLES.map((c, i) => {
            const x = 10 + i * step;
            const up = c.c >= c.o;
            const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
            return (
              <g key={i}>
                <line x1={x + step * 0.3} x2={x + step * 0.3} y1={y(c.h)} y2={y(c.l)} stroke={up ? '#cfcdc6' : '#5c5e64'} strokeWidth={1.6} />
                <rect x={x} y={top} width={step * 0.6} height={Math.max(2, bot - top)} rx={1.5}
                  fill={up ? '#dedcd4' : '#141416'} stroke={up ? 'none' : '#6a6c72'} strokeWidth={1.6} />
                <rect x={x} y={chartH - 10 - c.v * 70} width={step * 0.6} height={c.v * 70} rx={1.5} fill={up ? 'rgba(222,220,212,0.22)' : 'rgba(255,255,255,0.08)'} />
              </g>
            );
          })}
        </svg>
      </div>
      {/* 下单栏 */}
      <div style={{ position: 'absolute', right: 0, top: 76, bottom: 0, width: 380, borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '26px 28px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', height: 54, borderRadius: 14, background: '#1d1d21', padding: 5, boxSizing: 'border-box', marginBottom: 24 }}>
          {['Buy', 'Sell'].map((s, i) => (
            <div key={s} style={{
              flex: 1, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700,
              background: i === 0 ? IVORY : 'transparent', color: i === 0 ? '#121214' : '#77797f',
            }}>{s}</div>
          ))}
        </div>
        {[['Price', '3,482.16'], ['Amount', '0.50 AURA'], ['Total', '1,741.08']].map(([k, v]) => (
          <div key={k} style={{ height: 66, borderRadius: 14, background: '#1b1b1e', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontSize: 21 }}>
            <span style={{ color: '#77797f' }}>{k}</span><span style={{ fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
          </div>
        ))}
        <div style={{ height: 6, borderRadius: 3, background: '#26262a', margin: '22px 0 30px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', borderRadius: 3, background: '#9a988f' }} />
          <div style={{ position: 'absolute', left: '50%', top: -8, width: 22, height: 22, marginLeft: -11, borderRadius: 11, background: IVORY }} />
        </div>
        <div style={{ height: 64, borderRadius: 14, background: IVORY, color: '#121214', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, fontWeight: 750 }}>Place order</div>
      </div>
      {/* 持仓 */}
      <div style={{ position: 'absolute', left: 340, right: 380, bottom: 0, height: 170, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 32px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: 30, fontSize: 19, fontWeight: 600, marginBottom: 16 }}>
          {['Positions 2', 'Orders 0', 'History'].map((s, i) => <span key={s} style={{ color: i === 0 ? IVORY : '#5f6167' }}>{s}</span>)}
        </div>
        {[['AURA-PERP', 'Long 2.0×', '+$412.80'], ['ONYX-PERP', 'Short 1.5×', '−$38.12']].map(([a, b, c], i) => (
          <div key={a} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: '#8b8d93', height: 40, alignItems: 'center', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: IVORY, fontWeight: 650, width: 180 }}>{a}</span><span style={{ width: 160 }}>{b}</span>
            <span style={{ color: i === 0 ? GOLD : '#8b8d93', fontWeight: 650 }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ───────── 描边几何：圆角矩形的半周（底边中点 → 左下角 → 左边 → 左上角 → 顶边中点） ─────────
const HALF = (MW / 2 - MR) + (Math.PI / 2) * MR + (MH - 2 * MR) + (Math.PI / 2) * MR + (MW / 2 - MR);
const halfPoint = (s: number): { x: number; y: number } => {
  // 盒内坐标，左半周；s ∈ [0, HALF]
  const a = MW / 2 - MR, arc = (Math.PI / 2) * MR, b = MH - 2 * MR;
  if (s <= a) return { x: MW / 2 - s, y: MH };
  s -= a;
  if (s <= arc) { const t = s / MR; return { x: MR - Math.sin(t) * MR, y: MH - MR + Math.cos(t) * MR }; }
  s -= arc;
  if (s <= b) return { x: 0, y: MH - MR - s };
  s -= b;
  if (s <= arc) { const t = s / MR; return { x: MR - Math.cos(t) * MR, y: MR - Math.sin(t) * MR }; }
  s -= arc;
  return { x: MR + Math.min(s, a), y: 0 };
};
const LEFT_D = `M${MW / 2} ${MH} H${MR} A${MR} ${MR} 0 0 1 0 ${MH - MR} V${MR} A${MR} ${MR} 0 0 1 ${MR} 0 H${MW / 2}`;
const RIGHT_D = `M${MW / 2} ${MH} H${MW - MR} A${MR} ${MR} 0 0 0 ${MW} ${MH - MR} V${MR} A${MR} ${MR} 0 0 0 ${MW - MR} 0 H${MW / 2}`;

// 二次贝塞尔：位置与切线
const bez = (t: number) => ({
  x: (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * PC.x + t * t * P2.x,
  y: (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * PC.y + t * t * P2.y,
});
const bezTan = (t: number) => ({
  x: 2 * (1 - t) * (PC.x - P0.x) + 2 * t * (P2.x - PC.x),
  y: 2 * (1 - t) * (PC.y - P0.y) + 2 * t * (P2.y - PC.y),
});

const Rise: React.FC<{ f: number; at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ f, at, children, style }) => {
  const p = ramp(f, at, 16, EASE.snappy);
  return <div style={{ opacity: p, transform: `translateY(${((1 - p) * 22).toFixed(2)}px)`, ...style }}>{children}</div>;
};

export const DashboardGlowHighlightPill: React.FC = () => {
  const f = useCurrentFrame();

  // ① 金字：逐字字距收拢，24–40 上浮淡出
  const titleOut = ramp(f, 20, 14, EASE.exit);
  const breathe = 0.85 + 0.15 * Math.sin(f / 6);
  const title = 'Trade with focus.';

  // ② 仪表盘升入：rotateX 40°→4°、y 560→0、scale 1.12→1（snappy 24f），之后 yaw 持续漂移
  const rise = ramp(f, 27, 26, EASE.snappy);
  const settleX = ramp(f, 40, 96, EASE.smooth);
  const rx = mix(40, 4, rise) - settleX * 2;
  const ry = mix(-9, 4, ramp(f, 24, 112, EASE.smooth));
  const pull = ramp(f, 58, 34, EASE.smooth); // 后拉让位给弹窗
  const ds = mix(1.12, 1, rise) * mix(1, 0.93, pull) * mix(1, 1.012, ramp(f, 100, 36, EASE.smooth));
  const dy = mix(560, 0, rise);
  const dashOp = ramp(f, 27, 8, EASE.out);
  const blur = 7 * ramp(f, 58, 22, EASE.smooth) * (1 - 0.35 * ramp(f, 104, 20, EASE.smooth));
  const dim = 0.5 * ramp(f, 58, 22, EASE.smooth);

  // ③ Focus 按钮被点亮（光被拾起），光斑离开后余辉回落
  const focusLit = ramp(f, 46, 8, EASE.out) * (1 - 0.6 * ramp(f, 60, 16, EASE.out));

  // ④ 光斑巡游：52–78 沿弧线；形状随切线拉伸，末端压成水平胶囊
  const tp = ramp(f, 52, 26, EASE.smooth);
  const pos = bez(tp);
  const tan = bezTan(Math.min(0.999, Math.max(0.001, tp)));
  const speed = Math.hypot(bez(ramp(f + 0.5, 52, 26, EASE.smooth)).x - bez(ramp(f - 0.5, 52, 26, EASE.smooth)).x,
    bez(ramp(f + 0.5, 52, 26, EASE.smooth)).y - bez(ramp(f - 0.5, 52, 26, EASE.smooth)).y);
  const ang = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;
  const endFlat = ramp(f, 70, 8, EASE.out); // 末端压平成胶囊
  const blobW = mix(34 + speed * 1.1, 230, endFlat);
  const blobH = mix(34 - Math.min(10, speed * 0.18), 18, endFlat);
  const blobAng = mix(ang, 180, endFlat);
  const blobOn = ramp(f, 48, 6, EASE.out) * (1 - ramp(f, 78, 6, EASE.exit));

  // ⑤ 双向描边：78–100 从底边中点左右包抄到顶边中点；100–116 收敛成金色细框
  const draw = ramp(f, 78, 22, EASE.snappy);
  const settle = ramp(f, 100, 16, EASE.smooth);
  const meet = f >= 99 ? Math.exp(-(f - 99) * 0.28) * (1 - settle * 0.4) : 0; // 汇合闪
  const sw = mix(4, 1.5, settle);
  const strokeCol = `rgb(${Math.round(mix(255, 230, settle))},${Math.round(mix(244, 199, settle))},${Math.round(mix(218, 133, settle))})`;
  const head = halfPoint(HALF * draw);
  const headOn = draw > 0 && draw < 1 ? 1 : 0;

  // ⑥ 弹窗：底板 82 起先到，内容逐层升起
  const base = ramp(f, 82, 14, EASE.out);
  // 弹窗随相机半幅漂移（与仪表盘同向，幅度更小）
  const mdx = ry * 1.6, mdy = (rx - 2) * -0.8;

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[2], fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.42, y: -0.05 }} fill={{ x: 0.7, y: 1.05 }} intensity={0.9} breathe={0.4} />

      {/* 仪表盘 */}
      <div style={{ position: 'absolute', inset: 0, perspective: 2200, perspectiveOrigin: '50% 40%' }}>
        <div style={{
          position: 'absolute', left: 960 - DW / 2, top: 548 - DH / 2, width: DW, height: DH, opacity: dashOp,
          transform: `translateY(${dy.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${ds.toFixed(4)})`,
          transformOrigin: '50% 60%',
          filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px) brightness(${(1 - dim * 0.6).toFixed(3)})` : undefined,
          boxShadow: '0 40px 120px rgba(0,0,0,0.6)', borderRadius: 22,
        }}>
          <Dashboard focusLit={focusLit} />
        </div>
      </div>
      {/* 压暗层：给弹窗腾出对比 */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 60% at 50% 54%, rgba(8,8,9,${(dim * 0.55).toFixed(3)}) 0%, rgba(8,8,9,${dim.toFixed(3)}) 100%)` }} />

      {/* 开场金字 */}
      {titleOut < 1 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center',
          opacity: 1 - titleOut, transform: `translateY(${(-titleOut * 140).toFixed(2)}px) scale(${(1 - titleOut * 0.06).toFixed(4)})`,
          filter: `${glowFilter(GOLD, 0.55 * breathe)}`,
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.32em', color: alpha(GOLD, 0.8 * ramp(f, 4, 14, EASE.out)), marginBottom: 34 }}>INTRODUCING FOCUS MODE</div>
          <div style={{ fontFamily: SERIF, fontSize: 150, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, whiteSpace: 'nowrap' }}>
            {Array.from(title).map((ch, i) => {
              const p = ramp(f, i * 0.8 - 1, 20, EASE.snappy);
              return (
                <span key={i} style={{
                  display: 'inline-block', whiteSpace: 'pre', opacity: Math.min(1, p * 1.4), marginRight: `${((1 - p) * 0.1).toFixed(3)}em`,
                  transform: `translateY(${((1 - p) * 0.18).toFixed(3)}em)`, filter: p < 1 ? `blur(${((1 - p) * 10).toFixed(2)}px)` : undefined,
                  backgroundImage: `linear-gradient(178deg, ${GOLD_HI} 10%, ${GOLD} 55%, ${GOLD_DEEP} 100%)`,
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                }}>{ch}</span>
              );
            })}
          </div>
        </div>
      )}

      {/* 巡游光斑：实心亮核 + 外扩辉光，沿切线拉伸 */}
      {blobOn > 0.005 && (
        <div style={{
          position: 'absolute', left: pos.x, top: pos.y, width: blobW + 220, height: blobH + 150,
          transform: `translate(-50%,-50%) rotate(${blobAng.toFixed(2)}deg)`, opacity: blobOn,
          background: `radial-gradient(closest-side, ${alpha(GOLD, 0.55)} 0%, ${alpha(GOLD_DEEP, 0.22)} 45%, ${alpha(GOLD_DEEP, 0)} 100%)`,
        }} />
      )}
      {blobOn > 0.005 && (
        <div style={{
          position: 'absolute', left: pos.x, top: pos.y, width: blobW, height: blobH, borderRadius: blobH,
          transform: `translate(-50%,-50%) rotate(${blobAng.toFixed(2)}deg)`, opacity: blobOn,
          background: '#fffaf0',
          filter: 'blur(1.5px)',
          boxShadow: `0 0 10px 3px ${alpha(GOLD_HI, 0.95)}, 0 0 34px 8px ${alpha(GOLD, 0.75)}`,
        }} />
      )}

      {/* 弹窗 + 描边（共用同一个盒子与漂移） */}
      <div style={{ position: 'absolute', left: MX, top: MY, width: MW, height: MH, transform: `translate(${mdx.toFixed(2)}px, ${mdy.toFixed(2)}px)` }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: MR, opacity: base, overflow: 'hidden',
          background: 'linear-gradient(170deg, rgba(34,32,28,0.96) 0%, rgba(20,19,17,0.97) 60%, rgba(16,15,14,0.98) 100%)',
          boxShadow: `inset 0 1px 0 rgba(255,240,205,0.10), 0 30px 80px rgba(0,0,0,0.7), 0 0 ${(70 * settle).toFixed(1)}px ${alpha(GOLD, 0.16 * settle)}`,
          padding: '44px 48px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
        }}>
          {/* 顶部内光：金色微光从上沿洒下（裁进圆角） */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 200, background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${alpha(GOLD, 0.12)} 0%, ${alpha(GOLD, 0)} 70%)` }} />
          <Rise f={f} at={86}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 19, fontWeight: 700, letterSpacing: '0.2em', color: GOLD }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={2.2}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill={GOLD} /></svg>
              NEW
            </div>
            <div style={{ fontSize: 54, fontWeight: 700, letterSpacing: '-0.035em', color: '#f6f1e4', marginTop: 14 }}>Focus Mode</div>
          </Rise>
          <Rise f={f} at={90}>
            <div style={{ fontSize: 25, lineHeight: 1.45, color: '#a9a69d', marginTop: 12 }}>One chart. One ticket. Everything else steps back.</div>
          </Rise>
          <div style={{ display: 'flex', gap: 18, marginTop: 30 }}>
            {([['Standard', 'Full workspace', false], ['Focus', 'Chart + order only', true]] as const).map(([t, d, on], i) => (
              <Rise key={t} f={f} at={94 + i * 3} style={{ flex: 1 }}>
                <div style={{
                  height: 112, borderRadius: 18, padding: '20px 22px', boxSizing: 'border-box',
                  border: `1.5px solid ${on ? alpha(GOLD, 0.75) : 'rgba(255,255,255,0.09)'}`,
                  background: on ? `linear-gradient(180deg, ${alpha(GOLD, 0.12)}, ${alpha(GOLD, 0.04)})` : 'rgba(255,255,255,0.02)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 27, fontWeight: 700, color: on ? '#f6f1e4' : '#a9a69d' }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 11, boxSizing: 'border-box', border: `2px solid ${on ? GOLD : '#5f5d58'}`,
                      background: on ? `radial-gradient(circle, ${GOLD} 0 40%, transparent 46%)` : 'transparent',
                    }} />
                    {t}
                  </div>
                  <div style={{ fontSize: 21, color: on ? '#bdb7a8' : '#75736d', marginTop: 10, paddingLeft: 34 }}>{d}</div>
                </div>
              </Rise>
            ))}
          </div>
          <Rise f={f} at={101} style={{ marginTop: 'auto' }}>
            <div style={{
              height: 70, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(180deg, #f0d596 0%, ${GOLD} 45%, #c9a35a 100%)`, color: '#1d1608', fontSize: 26, fontWeight: 750,
              boxShadow: 'inset 0 1px 0 rgba(255,250,230,0.6), 0 8px 24px rgba(0,0,0,0.4)',
            }}>Enter Focus</div>
          </Rise>
        </div>

        {/* 双向辉光描边 */}
        {draw > 0 && (
          <svg width={MW} height={MH} viewBox={`0 0 ${MW} ${MH}`} style={{
            position: 'absolute', left: 0, top: 0, overflow: 'visible',
            filter: `drop-shadow(0 0 ${mix(4, 1.5, settle).toFixed(2)}px ${alpha(GOLD_HI, mix(0.95, 0.5, settle))}) drop-shadow(0 0 ${mix(16, 6, settle).toFixed(1)}px ${alpha(GOLD, mix(0.8, 0.25, settle))})`,
          }}>
            {[LEFT_D, RIGHT_D].map((d, i) => (
              <path key={i} d={d} pathLength={100} fill="none" stroke={strokeCol} strokeWidth={sw} strokeLinecap="round"
                strokeDasharray="100 100" strokeDashoffset={100 * (1 - draw)} />
            ))}
          </svg>
        )}
        {/* 光头：两枚亮点跟着描边头跑 */}
        {headOn > 0 && [head.x, MW - head.x].map((x, i) => (
          <div key={i} style={{
            position: 'absolute', left: x - 22, top: head.y - 22, width: 44, height: 44, borderRadius: 22,
            background: `radial-gradient(circle, #fffdf6 0%, ${alpha(GOLD_HI, 0.85)} 22%, ${alpha(GOLD, 0)} 70%)`,
          }} />
        ))}
        {/* 顶边汇合闪 */}
        {meet > 0.01 && (
          <div style={{
            position: 'absolute', left: MW / 2 - 140, top: -40, width: 280, height: 80, opacity: meet,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#fffdf6', 0.95)} 0%, ${alpha(GOLD, 0.5)} 30%, ${alpha(GOLD, 0)} 70%)`,
          }} />
        )}
      </div>
      {/* 顶层收边：暖黑暗角 + 颗粒（压在仪表盘之上，黑金场防色带） */}
      <Vignette strength={0.5} inner={0.42} color="#050403" />
      <Grain opacity={0.08} blend="soft-light" />
    </div>
  );
};
