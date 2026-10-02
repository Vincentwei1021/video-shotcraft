import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

// bento-light-up：暗场里 3×2 bento 墙压暗待命，随节拍逐格"通电"——
// 一颗彗星流光沿格子边框跑一圈，格内内容随即提亮上浮；六格全亮后镜头缓推收住。
//
// 第二轮重设计（极光夜 · 平台发布会功能墙）：
// - look = aurora（紫黑底 · 薰衣草紫 · 点缀玫粉）。墙占画宽 90%：两行宽窄互补（688/492/492 ↔ 492/492/688），
//   上方 100px 主标题。虚构平台「Basalt」——每格只讲一件事、配一个大字主角（38s / 212 / 99.99% /
//   分支图形 / SOC 2 / 84ms），要读的字 ≥32px，不再是满屏小字 dashboard 卡。
// - 点亮顺序走"蛇形"：上排左→右、下排右→左，彗星从靠近上一格的那个角起跑，光像一根电线在墙上走完一圈。
// - 彗星：亮芯（白→玫粉）+ 三层递减拖尾（薰衣草紫）+ 高斯辉光，绕一圈后拖尾追上头部自然收掉，
//   身后留一圈 1.5px 细边（退火到常亮弱边）。内容在彗星跑过半圈时接力：从压暗 0.12 → 1、上浮 22px 带一次过冲，
//   主角数字/图形晚 3f 再亮（主次拖拽）。
// - 房间随通电变亮：舞台主光强度按已点亮格数爬升；全亮后 30f 缓推 0.972→1，之后真静止。
//
// 时间表（30fps，共 150f）：
//   0–20    建立：暗墙已在原位（第 1 帧可见），标题逐词升起
//   18–84   六格蛇形点亮，间隔 12f（等距 = 庄重，不学发牌加速）；每格彗星 12f、内容 +6f 起 12f
//   84–100  余波：末格内容落定、细边退火、房间光爬到满
//   98–128  缓推 0.972 → 1（smooth，落点即设计版式）
//   128–150 静止收尾 22f
export const BENTO_LIGHT_UP_DURATION = 150;

const L = LOOKS.aurora;
const FIRST = 18; // 首格激活帧
const GAP = 12; // 格间节拍（等距）
const COMET = 12; // 彗星一圈
const MARGIN = 96;
const GUT = 28;
const CELL_H = 330;
const TOP = 292;
const RX = 24;
const NARROW = (1920 - MARGIN * 2 - GUT * 2) / 3.4; // ≈ 491.8
const WIDE = NARROW * 1.4; // ≈ 688.5
const ROWS = [
  [WIDE, NARROW, NARROW],
  [NARROW, NARROW, WIDE],
];
type CellGeo = { x: number; y: number; w: number; order: number; startCorner: 'tl' | 'tr' };
// 蛇形点亮：上排 0→2，下排从右往左 5→3（下排的彗星从右上角起跑，接住上一格）
const CELLS: CellGeo[] = ROWS.flatMap((row, r) => {
  let x = MARGIN;
  return row.map((w, c) => {
    const g: CellGeo = { x, y: TOP + r * (CELL_H + GUT), w, order: r === 0 ? c : 5 - c, startCorner: r === 0 ? 'tl' : 'tr' };
    x += w + GUT;
    return g;
  });
});

const startOf = (order: number) => FIRST + order * GAP;

// ───────────── 格内容 ─────────────
const label = (txt: string): React.ReactNode => (
  <div style={{ ...type(32, 560), color: L.ink2 }}>{txt}</div>
);
const IconChip: React.FC<{ on: number; children: React.ReactNode }> = ({ on, children }) => (
  <div style={{
    width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center',
    background: `linear-gradient(180deg, ${alpha(L.accent, 0.1 + 0.16 * on)}, ${alpha(L.accent, 0.04 + 0.08 * on)})`,
    boxShadow: `inset 0 0 0 1px ${alpha(L.accent, 0.12 + 0.3 * on)}, inset 0 1px 0 rgba(255,255,255,0.12)`,
  }}>{children}</div>
);
// 主角字：白 → 薰衣草的竖向渐变字（点亮后渐变底色加深）
const heroText = (on: number): React.CSSProperties => ({
  backgroundImage: `linear-gradient(180deg, #ffffff 10%, ${alpha('#cbb8ff', 0.6 + 0.4 * on)} 100%)`,
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
});

const Content: React.FC<{ k: number; hero: number }> = ({ k, hero }) => {
  const ac = alpha(L.accent, 0.35 + 0.65 * hero);
  const pad: React.CSSProperties = { position: 'absolute', inset: 0, padding: '34px 38px', boxSizing: 'border-box' };
  const head = (icon: React.ReactNode, txt: string, right?: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <IconChip on={hero}>{icon}</IconChip>
      {label(txt)}
      <div style={{ marginLeft: 'auto' }}>{right}</div>
    </div>
  );
  const big = (txt: string, size: number, extra: React.CSSProperties = {}) => (
    <div style={{ ...type(size, 720), ...heroText(hero), position: 'absolute', left: 38, bottom: 30, ...extra }}>{txt}</div>
  );
  const svgI = (d: string) => (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={ac} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
  if (k === 0) {
    // Deploys：大数字 + 构建耗时柱（越来越短，末柱强调）
    const bars = [86, 80, 82, 71, 66, 62, 58, 52, 49, 44, 41, 38];
    return (
      <div style={pad}>
        {head(svgI('M5 15l4-4 3 3 7-7M14 7h5v5'), 'Deploys', (
          <div style={{ ...type(24, 640, { caps: true }), color: L.accent2, padding: '8px 16px', borderRadius: 99, background: alpha(L.accent2, 0.1 * hero + 0.03), boxShadow: `inset 0 0 0 1px ${alpha(L.accent2, 0.3 * hero + 0.05)}` }}>3.1× faster</div>
        ))}
        {big('38s', 140)}
        <div style={{ position: 'absolute', left: 290, bottom: 46, ...type(32, 500), color: L.ink3 }}>median, commit → live</div>
        <div style={{ position: 'absolute', right: 38, top: 112, width: 300, height: 100, display: 'flex', alignItems: 'flex-end', gap: 9 }}>
          {bars.map((b, j) => {
            const grow = Math.min(1, Math.max(0, hero * 1.6 - j * 0.05));
            return <div key={j} style={{ flex: 1, height: b * EASE.out(grow) + 4, borderRadius: 4, background: j === bars.length - 1 ? L.accent : alpha(L.ink, 0.16) }} />;
          })}
        </div>
      </div>
    );
  }
  if (k === 1) {
    // Edge：212 个区域 + 经纬线小地球
    return (
      <div style={pad}>
        {head(svgI('M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'), 'Edge network')}
        <svg width={170} height={170} viewBox="0 0 170 170" style={{ position: 'absolute', right: 26, top: 96, opacity: 0.25 + 0.75 * hero }}>
          {[0, 1, 2, 3].map((j) => <ellipse key={j} cx={85} cy={85} rx={78 - j * 0} ry={78 - j * 22} fill="none" stroke={alpha(L.accent, 0.35)} strokeWidth={1.2} />)}
          {[0, 1, 2].map((j) => <ellipse key={`v${j}`} cx={85} cy={85} rx={78 - j * 30} ry={78} fill="none" stroke={alpha(L.accent, 0.25)} strokeWidth={1.2} />)}
          {[[40, 60], [120, 52], [96, 110], [58, 118], [132, 96]].map(([x, y], j) => (
            <circle key={`d${j}`} cx={x} cy={y} r={4.5} fill={j === 1 ? L.accent2 : L.accent} opacity={Math.min(1, Math.max(0, hero * 2 - j * 0.2))} />
          ))}
        </svg>
        {big('212', 140)}
        <div style={{ position: 'absolute', left: 38, bottom: 182, ...type(32, 500), color: L.ink3 }}>regions, one deploy</div>
      </div>
    );
  }
  if (k === 2) {
    // Uptime：99.99% + 30 天状态条
    return (
      <div style={pad}>
        {head(svgI('M4 12h4l2-5 4 10 2-5h4'), 'Uptime', <div style={{ ...type(24, 640, { caps: true }), color: L.ink3 }}>12 mo</div>)}
        <div style={{ position: 'absolute', left: 38, right: 38, top: 118, display: 'flex', gap: 5 }}>
          {Array.from({ length: 30 }, (_, j) => (
            <div key={j} style={{ flex: 1, height: 40, borderRadius: 3, background: j === 17 ? alpha(L.accent2, 0.35 + 0.5 * hero) : alpha(L.accent, 0.12 + 0.5 * hero * Math.min(1, Math.max(0, hero * 1.5 - j * 0.015))) }} />
          ))}
        </div>
        {big('99.99%', 112)}
      </div>
    );
  }
  if (k === 3) {
    // Previews：分支图形 + 一句话
    return (
      <div style={pad}>
        {head(svgI('M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9c0 6-12 3-12 9'), 'Previews')}
        <div style={{ position: 'absolute', left: 38, right: 38, top: 120, ...type(46, 680), color: L.ink, lineHeight: 1.12 }}>
          Every branch gets its own URL.
        </div>
        <div style={{
          position: 'absolute', left: 38, bottom: 34, ...type(30, 500, { mono: true }), color: alpha(L.accent, 0.5 + 0.5 * hero),
          padding: '8px 14px', borderRadius: 10, background: alpha(L.accent, 0.06 + 0.06 * hero), boxShadow: `inset 0 0 0 1px ${alpha(L.accent, 0.18)}`,
        }}>pr-482.basalt.app</div>
      </div>
    );
  }
  if (k === 4) {
    // Security：盾牌 + SOC 2
    return (
      <div style={pad}>
        {head(svgI('M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zM9 12l2 2 4-4'), 'Security')}
        <svg width={150} height={170} viewBox="0 0 24 27" style={{ position: 'absolute', right: 34, top: 110, opacity: 0.3 + 0.7 * hero }}>
          <defs>
            <linearGradient id="bentoShield" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={L.accent} stopOpacity={0.32} />
              <stop offset="1" stopColor={L.accent} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <path d="M12 1.5l9.5 3.8v7.6c0 6-4 10.2-9.5 12.6C6.5 23.1 2.5 18.9 2.5 12.9V5.3z" fill="url(#bentoShield)" stroke={alpha(L.accent, 0.7)} strokeWidth={0.5} />
          <path d="M7.6 13.4l3 3 6-6.4" fill="none" stroke={L.ink} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - EASE.out(Math.min(1, Math.max(0, hero * 1.4 - 0.3)))} />
        </svg>
        <div style={{ position: 'absolute', left: 38, top: 132, ...type(64, 720), ...heroText(hero) }}>SOC 2</div>
        <div style={{ position: 'absolute', left: 38, top: 206, ...type(40, 560), color: L.ink2 }}>Type II certified</div>
        <div style={{ position: 'absolute', left: 38, bottom: 36, ...type(32, 500), color: L.ink3 }}>Encrypted at rest</div>
      </div>
    );
  }
  // k === 5 Observability：84ms + 延迟曲线（描线 + 末端亮点）
  const pts = [62, 58, 66, 54, 57, 48, 52, 40, 44, 34, 38, 28, 30, 22];
  const cw = 250, chH = 130;
  const d = pts.map((v, j) => `${j ? 'L' : 'M'}${((j / (pts.length - 1)) * cw).toFixed(1)},${(chH - v * 1.7).toFixed(1)}`).join(' ');
  const draw = EASE.out(Math.min(1, hero * 1.15));
  return (
    <div style={pad}>
      {head(svgI('M3 3v18h18M7 15l4-4 3 3 5-6'), 'p95 latency', (
        <div style={{ ...type(24, 640, { caps: true }), color: L.ink3 }}>live</div>
      ))}
      {big('84ms', 132)}
      <div style={{ position: 'absolute', left: 38, top: 112, ...type(32, 500), color: L.ink3 }}>down 41% this quarter</div>
      <svg width={cw + 20} height={chH + 20} style={{ position: 'absolute', right: 30, top: 150, overflow: 'visible' }}>
        <defs>
          <linearGradient id="bentoArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={L.accent} stopOpacity={0.28 * hero} />
            <stop offset="1" stopColor={L.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${d} L${cw},${chH} L0,${chH} Z`} fill="url(#bentoArea)" />
        <path d={d} fill="none" stroke={L.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        <circle cx={cw} cy={chH - 22 * 1.7} r={7} fill={L.accent2} opacity={ramp(draw, 0.9, 0.1, EASE.linear)} />
        <circle cx={cw} cy={chH - 22 * 1.7} r={16} fill="none" stroke={L.accent2} strokeOpacity={0.4} opacity={ramp(draw, 0.9, 0.1, EASE.linear)} />
      </svg>
    </div>
  );
};

// 圆角矩形周长上 frac(0–1，从上边左端 (rx,0) 顺时针) 处的坐标——给彗星头部的泛光点定位
const pointOnRRect = (w: number, h: number, r: number, frac: number) => {
  const a = (Math.PI / 2) * r;
  const segs = [w - 2 * r, a, h - 2 * r, a, w - 2 * r, a, h - 2 * r, a];
  const total = segs.reduce((s, v) => s + v, 0);
  let d = (((frac % 1) + 1) % 1) * total;
  let k = 0;
  while (k < 7 && d > segs[k]) { d -= segs[k]; k++; }
  const t = segs[k] ? d / segs[k] : 0;
  const arc = (cx: number, cy: number, a0: number) => [cx + r * Math.cos(a0 + t * Math.PI / 2), cy + r * Math.sin(a0 + t * Math.PI / 2)];
  switch (k) {
    case 0: return [r + d, 0];
    case 1: return arc(w - r, r, -Math.PI / 2);
    case 2: return [w, r + d];
    case 3: return arc(w - r, h - r, 0);
    case 4: return [w - r - d, h];
    case 5: return arc(r, h - r, Math.PI / 2);
    case 6: return [0, h - r - d];
    default: return arc(r, r, Math.PI);
  }
};

// ───────────── 单格 ─────────────
const Cell: React.FC<{ g: CellGeo; k: number; frame: number }> = ({ g, k, frame }) => {
  const { x, y, w, order, startCorner } = g;
  const start = startOf(order);
  const h = CELL_H;
  // 彗星：头部沿 pathLength=100 从起跑角走 0 → 100+TAIL（拖尾追上头部、自然收掉）
  const TAIL = 26;
  const run = ramp(frame, start, COMET, EASE.smooth);
  const head = run * (100 + TAIL);
  const per = 2 * (w + h);
  const startOff = startCorner === 'tl' ? 0 : ((w - 2 * RX) / per) * 100 + 2; // 右上角
  const trail = Math.min(100, head); // 身后留下的细边
  const anneal = ramp(frame, start + COMET, 22, EASE.out); // 细边退火
  // 内容接力：彗星过半圈（+6f）起 12f 提亮，上浮带一次过冲；主角晚 3f
  const lit = ramp(frame, start + 6, 12, EASE.snappy);
  const rise = ramp(frame, start + 6, 14, EASE.overshoot);
  const hero = ramp(frame, start + 9, 16, EASE.out);
  const spill = Math.sin(Math.min(1, Math.max(0, (frame - start - 4) / 26)) * Math.PI); // 通电瞬间的一抹内光
  const id = `bento${k}`;
  const cometOn = frame >= start && run < 1;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
      {/* 卡体：暗态就在原位，点亮后底色微提、内容上浮 */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: RX, overflow: 'hidden',
        background: `linear-gradient(180deg, #1d1636 0%, ${L.surface} 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,${(0.04 + 0.06 * lit).toFixed(3)}), inset 0 0 0 1px ${alpha('#c8aaff', 0.06 + 0.04 * lit)}, 0 30px 60px -24px ${alpha(L.shadow, 0.9)}`,
        filter: `brightness(${(0.55 + 0.45 * lit).toFixed(3)})`,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(70% 90% at ${startCorner === 'tl' ? '0%' : '100%'} 0%, ${alpha(L.accent, 0.22 * spill + 0.06 * lit)}, ${alpha(L.accent, 0)} 70%)`,
        }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.12 + 0.88 * lit, transform: `translateY(${((1 - rise) * 22).toFixed(2)}px)`, filter: lit < 0.98 ? `saturate(${lit.toFixed(3)})` : undefined }}>
          <Content k={k} hero={hero} />
        </div>
      </div>
      {/* 边框光：留下的细边 + 彗星 */}
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
        <defs>
          <filter id={`${id}g`} x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation={5} /></filter>
        </defs>
        {head > 0 && (
          <rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={RX} fill="none" stroke={L.accent} strokeWidth={1.5}
            pathLength={100} strokeDasharray={`${trail} ${100 - trail + 0.01}`} strokeDashoffset={-startOff}
            opacity={mix(0.85, 0.28, anneal)} />
        )}
        {cometOn && [
          { t: TAIL, wdt: 7, c: L.accent, o: 0.55, blur: true },
          { t: TAIL, wdt: 2.5, c: L.accent, o: 0.45 },
          { t: TAIL * 0.55, wdt: 3, c: '#e6d9ff', o: 0.75 },
          { t: TAIL * 0.18, wdt: 4, c: '#fff4fb', o: 1 },
          { t: TAIL * 0.18, wdt: 12, c: L.accent2, o: 0.6, blur: true },
        ].map((s, j) => (
          <rect key={j} x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={RX} fill="none" stroke={s.c} strokeWidth={s.wdt} strokeLinecap="round"
            pathLength={100} strokeDasharray={`${s.t} ${100 - s.t}`} strokeDashoffset={-(startOff + head - s.t)}
            opacity={s.o * (head > 100 ? Math.max(0, 1 - (head - 100) / TAIL) * 0.6 + 0.4 : 1)} filter={s.blur ? `url(#${id}g)` : undefined} />
        ))}
      </svg>
      {/* 彗星头部泛光点（只在跑圈时存在） */}
      {cometOn && head < 100 + TAIL * 0.3 && (() => {
        const [hx, hy] = pointOnRRect(w, h, RX, (startOff + Math.min(head, 100)) / 100);
        const o = head > 100 ? 1 - (head - 100) / (TAIL * 0.3) : Math.min(1, head / 6);
        return (
          <div style={{
            position: 'absolute', left: hx - 60, top: hy - 60, width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none',
            background: `radial-gradient(circle, rgba(255,240,250,${(0.95 * o).toFixed(3)}) 0%, ${alpha(L.accent2, 0.55 * o)} 12%, ${alpha(L.accent, 0.22 * o)} 32%, ${alpha(L.accent, 0)} 62%)`,
            mixBlendMode: 'screen',
          }} />
        );
      })()}
    </div>
  );
};

export const BentoLightUp: React.FC = () => {
  const frame = useCurrentFrame();
  // 房间随通电变亮：按已点亮格数（连续值）爬升
  const litSum = CELLS.reduce((s, g) => s + ramp(frame, startOf(g.order) + 6, 14, EASE.out), 0) / CELLS.length;
  // 全亮后缓推 0.972 → 1（落点 = 设计版式，安全边距 96px），之后真静止
  const push = 0.972 + 0.028 * ramp(frame, 98, 30, EASE.smooth);
  const intro = ramp(frame, 0, 12, EASE.out);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: -0.05 }} fill={{ x: 0.88, y: 1.0 }} intensity={0.45 + 0.6 * litSum}>
        <Dust look={L} count={26} seed={11} drift={0.15} opacity={0.25 + 0.3 * litSum} />
        {/* 墙后地面一抹紫光，随全亮升起 */}
        <div style={{ position: 'absolute', left: '10%', right: '10%', top: '62%', height: '50%', background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent, 0.16 * litSum)}, ${alpha(L.accent, 0)} 70%)` }} />
      </Stage>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '960px 600px' }}>
        <div style={{ position: 'absolute', left: MARGIN, top: 96 }}>
          <div style={{ ...type(22, 700, { caps: true }), letterSpacing: '0.22em', color: L.accent, opacity: intro }}>Basalt platform</div>
          <div style={{ marginTop: 22, ...type(100, 720), color: L.ink, whiteSpace: 'nowrap' }}>
            <TextReveal text="Everything ships from here." by="word" variant="rise" start={2} each={18} gap={3} />
          </div>
        </div>
        {CELLS.map((g, k) => <Cell key={k} g={g} k={k} frame={frame} />)}
      </div>
    </AbsoluteFill>
  );
};
