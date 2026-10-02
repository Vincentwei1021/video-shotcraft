// flyline-arc —— 飞线连接：一条发光弧线从 A 卡"打"到 B 卡，亮头领跑、渐隐光尾，落点脉冲点亮，再接力打到 C。
//
// 第二轮重设计（余烬归因图 · 熔铜飞线）：
// - look = ember（暖黑 · 熔橙 · 金）。不再是压暗的六格 dashboard，而是一张为镜头设计的"归因图"：
//   三张 560×320 的指标卡（活动访问 → 结账转化 → 周收入），卡边有连接端口，飞线从端口打到端口——
//   读作"这个活动带动了转化、转化带来了收入"，飞线第一次有了因果。左上一组 64px 标题交代语境。
// - 飞线 = 熔铜：白热芯 + 橙色两层辉光，亮头领跑带彗尾；头部一路掉落金色火星（按重力下坠、16f 熄灭），
//   这是 ember 的材质语言，也让"打过去"有速度与温度。生长曲线不对称 in-out（起步蓄力、中段最快、
//   进端口前减速），不是匀速描线。
// - 落点：端口闪一圈冲击环 + 卡片描边脉冲提亮 + 卡片被"撞"得沿来向位移 10px 再弹簧回位；
//   同帧数字从旧值滚到新值（+0% → +31%、$1.21M → $1.84M），增量胶囊弹出——数据在"被点亮"。
// - 余波：连好的线降成暗铜色常驻，上面有小光包沿线缓慢流动（hold 段画面不死，也强调方向）。
// - 镜头：全程 1→1.035 极缓推进，焦点从 A 漂向 C。
//
// 时间表（30fps，共 150f）：
//   0–18    卡片错峰升起（A 0f / C 4f / B 8f），标题逐词升起；A 端口 14f 亮起
//   20–46   线 1 A→B 生长（26f，蓄力-加速-减速）
//   46–72   B 落点：冲击环 14f、描边脉冲 6f 起 / 14f 消散、卡片受撞回弹、数字滚动 22f
//   62–86   线 2 B→C 接力
//   86–112  C 落点：同上
//   112–150 hold：线上光包流动，镜头极缓推进到落定
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const FLYLINE_ARC_DURATION = 150; // 5s

const L = LOOKS.ember;
const HOT = '#fff1de'; // 白热芯
const ORANGE = L.accent;
const GOLD = L.accent2;

type Pt = { x: number; y: number };
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};
const hs = (n: number) => {
  const x = Math.sin(n * 91.345 + 47.853) * 43758.5453;
  return x - Math.floor(x);
};
const grow = bezier(0.5, 0, 0.2, 1); // 生长：起步蓄力、中段最快、进端口前减速

// ───────────── 卡片 ─────────────
type CardDef = {
  x: number; y: number; label: string; glyph: string; sub: string;
  from: number; to: number; fmt: (v: number) => string; delta: string; litAt: number; inAt: number;
  hitDir: Pt; // 被撞方向（单位向量）
};
const CW = 560, CH = 320;
const CARDS: CardDef[] = [
  { x: 120, y: 420, label: 'Autumn drop', glyph: 'M6 15 L12 4 L18 15 Z', sub: 'campaign visits · 7d', from: 48.2, to: 48.2, fmt: (v) => `${v.toFixed(1)}k`, delta: '▲ 18%', litAt: 14, inAt: 0, hitDir: { x: 0, y: 0 } },
  { x: 1240, y: 640, label: 'Checkout', glyph: 'M4 6 H20 L18 15 H7 Z M8 19 h0.01 M17 19 h0.01', sub: 'conversion rate', from: 0, to: 31, fmt: (v) => `+${Math.round(v)}%`, delta: '▲ 31%', litAt: 46, inAt: 8, hitDir: { x: 0.1, y: 1 } },
  { x: 840, y: 84, label: 'Revenue', glyph: 'M12 3 V21 M17 7 C 17 5 15 4 12 4 C 9 4 7 5.5 7 7.5 C 7 12 17 10 17 15.5 C 17 18 15 19.5 12 19.5 C 9 19.5 7 18 7 16', sub: 'weekly, all regions', from: 1.21, to: 1.84, fmt: (v) => `$${v.toFixed(2)}M`, delta: '▲ 52%', litAt: 86, inAt: 4, hitDir: { x: -1, y: 0 } },
];

// 端口
const PA: Pt = { x: CARDS[0].x + CW, y: CARDS[0].y + 120 }; // A 右沿
const PB_IN: Pt = { x: CARDS[1].x + 130, y: CARDS[1].y }; // B 上沿左
const PB_OUT: Pt = { x: CARDS[1].x + 430, y: CARDS[1].y }; // B 上沿右
const PC_IN: Pt = { x: CARDS[2].x + CW, y: CARDS[2].y + 190 }; // C 右沿

const LINES = [
  // 线 1：A 右沿起飞，抛物线越过画面中部，竖直扎进 B 上沿
  { start: 20, dur: 26, p0: PA, p1: { x: 940, y: 396 }, p2: { x: PB_IN.x - 30, y: 372 }, p3: PB_IN, seed: 1 },
  // 线 2：B 上沿竖直起飞，弯向左上，水平进入 C 右沿
  { start: 62, dur: 24, p0: PB_OUT, p1: { x: PB_OUT.x + 20, y: 420 }, p2: { x: 1600, y: PC_IN.y }, p3: PC_IN, seed: 2 },
];

const N = 90;

const Flyline: React.FC<{ f: number; ln: typeof LINES[number] }> = ({ f, ln }) => {
  const { start, dur, p0, p1, p2, p3, seed } = ln;
  if (f < start) return null;
  const e = grow(Math.min(1, (f - start) / dur));
  const growing = f < start + dur;
  const settle = ramp(f, start + dur, 14, EASE.out); // 到达后线体从"热"降到"暗铜"
  const pts: Pt[] = [];
  const n = Math.max(2, Math.ceil(e * N) + 1);
  for (let i = 0; i < n; i++) pts.push(bez(p0, p1, p2, p3, Math.min(i / N, e)));
  const head = bez(p0, p1, p2, p3, e);
  pts[pts.length - 1] = head;
  const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // 亮头暗尾：分段 opacity 随离头距离衰减；到达后整体降到 0.42 的暗铜常驻
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const k = Math.min(i / N, e) / Math.max(e, 0.001);
    const hot = 0.18 + 0.82 * k ** 2.2;
    const op = mix(hot, 0.42, settle);
    segs.push(<line key={i} x1={pts[i].x} y1={pts[i].y} x2={pts[i + 1].x} y2={pts[i + 1].y} stroke={HOT} strokeWidth={3.2} strokeLinecap="butt" strokeOpacity={op} />);
  }
  const comet = pts.slice(Math.max(0, pts.length - 10)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // 火星：生长期每帧从头部掉一颗，按重力下坠、16f 熄灭
  const embers = [];
  for (let k = start; k <= Math.min(f, start + dur); k++) {
    for (let j = 0; j < 2; j++) {
      const age = f - k - j * 0.5;
      if (age < 0 || age > 18) continue;
      const id = seed * 1000 + k * 2 + j;
      const at = bez(p0, p1, p2, p3, grow(Math.min(1, (k + j * 0.5 - start) / dur)));
      const r = hs(id);
      const vx = (r - 0.5) * 4;
      const vy = -1.2 - 2 * hs(id + 0.37);
      const x = at.x + vx * age;
      const y = at.y + vy * age + 0.17 * age * age;
      const life = 1 - age / 18;
      embers.push(<circle key={id} cx={x} cy={y} r={2 + 2.8 * life * (0.4 + 0.6 * hs(id + 0.71))} fill={r > 0.45 ? GOLD : ORANGE} opacity={life} />);
    }
  }

  // 光包：到达后沿线流动（hold 段的"数据在流"）
  const packets = [];
  if (!growing) {
    const a = ramp(f, start + dur + 8, 12, EASE.out);
    for (let k = 0; k < 2; k++) {
      const u = (((f - start - dur) / 50 + k / 2) % 1 + 1) % 1;
      const fade = Math.sin(Math.PI * u);
      const trail = Array.from({ length: 7 }, (_, q) => bez(p0, p1, p2, p3, Math.max(0, u - q * 0.012)));
      packets.push(
        <polyline key={k} points={trail.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} fill="none" stroke={HOT}
          strokeWidth={4} strokeLinecap="round" opacity={a * fade * 0.9} style={{ filter: `drop-shadow(0 0 6px ${ORANGE})` }} />,
      );
    }
  }

  return (
    <g>
      <polyline points={poly} fill="none" stroke={ORANGE} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={mix(0.12, 0.06, settle)} />
      <polyline points={poly} fill="none" stroke={ORANGE} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={mix(0.4, 0.22, settle)} />
      {segs}
      {embers}
      {growing && (
        <g>
          <polyline points={comet} fill="none" stroke={HOT} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.6} />
          <circle cx={head.x} cy={head.y} r={46} fill="url(#flyHeadHalo)" />
          <circle cx={head.x} cy={head.y} r={8} fill="#ffffff" />
        </g>
      )}
      {packets}
    </g>
  );
};

// 端口：小圆环 + 亮芯；litAt 后点亮，落点一圈冲击环
const Port: React.FC<{ f: number; p: Pt; litAt: number; inAt: number; impact?: boolean }> = ({ f, p, litAt, inAt, impact }) => {
  const lit = ramp(f, litAt, 8, EASE.out);
  const show = ramp(f, inAt + 4, 14, EASE.out); // 随所在卡片一起出现
  const dy = (1 - ramp(f, inAt, 20, EASE.snappy)) * 36;
  const ring = impact ? ramp(f, litAt, 16, EASE.linear) : 1;
  return (
    <g opacity={show} transform={`translate(0 ${dy.toFixed(2)})`}>
      <circle cx={p.x} cy={p.y} r={11} fill={L.bg[1]} stroke={lit > 0 ? ORANGE : L.ink3} strokeWidth={2.5} strokeOpacity={0.4 + 0.6 * lit} />
      <circle cx={p.x} cy={p.y} r={4.5 * lit} fill={HOT} />
      {lit > 0 && <circle cx={p.x} cy={p.y} r={24} fill={alpha(ORANGE, 0.18 * lit)} />}
      {impact && ring > 0 && ring < 1 && (
        <circle cx={p.x} cy={p.y} r={mix(12, 110, EASE.snappy(ring))} fill="none" stroke={HOT} strokeWidth={mix(5, 0.8, ring)} opacity={0.85 * (1 - ring)} />
      )}
    </g>
  );
};

const Spark: React.FC<{ seed: number; lit: number }> = ({ seed, lit }) => {
  const P = Array.from({ length: 14 }, (_, i) => 0.3 + 0.12 * Math.sin(i * 0.9 + seed) + (i / 13) * 0.5 * (0.4 + 0.6 * lit) + 0.06 * Math.sin(i * 2.3 + seed * 3));
  const w = 170, hh = 64;
  const d = P.map((v, i) => `${i ? 'L' : 'M'}${((i / 13) * w).toFixed(1)},${(hh - v * hh).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={hh} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke={lit > 0.5 ? ORANGE : L.ink3} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const MetricCard: React.FC<{ f: number; c: CardDef; i: number }> = ({ f, c, i }) => {
  const enter = ramp(f, c.inAt, 20, EASE.snappy);
  const lit = i === 0 ? ramp(f, c.litAt, 10, EASE.out) : ramp(f, c.litAt, 8, EASE.out);
  // 描边脉冲：6f 起升 → 14f 消散到残余 0.3
  const pulse = f < c.litAt ? 0 : f <= c.litAt + 6 ? ramp(f, c.litAt, 6, EASE.out) : mix(1, 0.3, ramp(f, c.litAt + 6, 14, EASE.out));
  // 受撞：沿来向位移 10px，再弹簧回位
  const hit = i > 0 && f >= c.litAt ? (1 - springAt(f, c.litAt, { damping: 12, stiffness: 240 })) * Math.min(1, (f - c.litAt) / 2) : 0;
  const hx = c.hitDir.x * 10 * hit, hy = c.hitDir.y * 10 * hit;
  // 数值滚动
  const v = i === 0 ? c.to : mix(c.from, c.to, ramp(f, c.litAt, 22, EASE.snappy));
  const pill = i === 0 ? 1 : f >= c.litAt + 4 ? springAt(f, c.litAt + 4, { damping: 13, stiffness: 220 }) : 0;
  const dim = 0.45 + 0.55 * lit;

  return (
    <div style={{
      position: 'absolute', left: c.x, top: c.y, width: CW, height: CH, borderRadius: 30, boxSizing: 'border-box',
      transform: `translate(${hx.toFixed(2)}px, ${(hy + (1 - enter) * 36).toFixed(2)}px)`, opacity: enter,
      background: `linear-gradient(180deg, ${alpha('#2a1b13', 0.96)} 0%, ${alpha(L.surface, 0.96)} 100%)`,
      boxShadow: `inset 0 0 0 1px ${alpha(ORANGE, 0.1 + 0.55 * pulse)}, inset 0 1.5px 0 rgba(255,230,210,0.08), ` +
        `0 0 ${(60 * pulse).toFixed(1)}px ${alpha(ORANGE, 0.35 * pulse)}, 0 40px 80px -30px rgba(0,0,0,0.9)`,
      padding: '34px 38px', fontFamily: FONT.sans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: dim }}>
        <div style={{
          width: 52, height: 52, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: lit > 0.5 ? alpha(ORANGE, 0.16) : 'rgba(255,255,255,0.05)', boxShadow: `inset 0 0 0 1px ${alpha(lit > 0.5 ? ORANGE : '#ffffff', 0.18)}`,
        }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={lit > 0.5 ? '#ffb48a' : L.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={c.glyph} /></svg>
        </div>
        <div style={{ ...type(34, 600), color: L.ink }}>{c.label}</div>
        <div style={{
          marginLeft: 'auto', padding: '8px 16px', borderRadius: 22, ...type(28, 650), color: L.onAccent,
          background: `linear-gradient(180deg, #ff8a52 0%, ${ORANGE} 100%)`, transform: `scale(${pill})`, opacity: Math.min(1, pill * 2),
        }}>{c.delta}</div>
      </div>
      <div style={{ position: 'absolute', left: 38, bottom: 34 }}>
        <div style={{ ...type(104, 700), letterSpacing: '-0.045em', color: lit > 0.5 ? L.ink : L.ink2, opacity: dim, lineHeight: 1 }}>{c.fmt(v)}</div>
        <div style={{ ...type(30, 450), color: L.ink3, marginTop: 14 }}>{c.sub}</div>
      </div>
      <div style={{ position: 'absolute', right: 38, bottom: 46, opacity: 0.5 + 0.5 * lit }}>
        <Spark seed={i * 2 + 1} lit={ramp(f, c.litAt, 22, EASE.snappy)} />
      </div>
    </div>
  );
};

export const FlylineArc: React.FC = () => {
  const f = useCurrentFrame();
  const cam = 1 + 0.035 * ramp(f, 0, 140, EASE.smooth);
  const fx = mix(700, 1100, ramp(f, 0, 140, EASE.smooth));

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.05 }} fill={{ x: 0.85, y: 0.95 }} breathe={0.4}>
        {/* 细点阵台面 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.55,
          backgroundImage: `radial-gradient(circle, ${alpha('#ffd9bf', 0.1)} 1.2px, transparent 1.6px)`, backgroundSize: '44px 44px',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 55%, #000 25%, transparent 90%)', maskImage: 'radial-gradient(ellipse 75% 70% at 50% 55%, #000 25%, transparent 90%)',
        }} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${fx}px 540px` }}>
        {/* 标题 */}
        <div style={{ position: 'absolute', left: 124, top: 120 }}>
          <div style={{ ...type(24, 700, { caps: true }), letterSpacing: '0.18em', color: ORANGE, opacity: ramp(f, 2, 14, EASE.out) }}>Solder · Attribution</div>
          <div style={{ marginTop: 18, width: 600 }}>
            <TextReveal text={'Where this week’s\nlift came from'} by="line" variant="rise" start={4} each={20} gap={6} style={{ ...type(64, 700), color: L.ink }} />
          </div>
        </div>

        {CARDS.map((c, i) => <MetricCard key={i} f={f} c={c} i={i} />)}

        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <radialGradient id="flyHeadHalo">
              <stop offset="0%" stopColor={alpha('#ffffff', 0.75)} />
              <stop offset="28%" stopColor={alpha('#ffb07a', 0.4)} />
              <stop offset="100%" stopColor={alpha(ORANGE, 0)} />
            </radialGradient>
          </defs>
          {LINES.map((ln, i) => <Flyline key={i} f={f} ln={ln} />)}
          <Port f={f} p={PA} litAt={14} inAt={CARDS[0].inAt} />
          <Port f={f} p={PB_IN} litAt={46} inAt={CARDS[1].inAt} impact />
          <Port f={f} p={PB_OUT} litAt={58} inAt={CARDS[1].inAt} />
          <Port f={f} p={PC_IN} litAt={86} inAt={CARDS[2].inAt} impact />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
