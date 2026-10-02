// runway-ground-skim —— 低角度掠地机位下 UI 卡片群从空中一阵急雨式贴落（起点微错、空中大量重叠并行、
// 着地即停零回弹），落齐后整页立起、视角转正收尾。源片 clickup-30.mp4 约 46–50s 的镜头设计。
//
// 第二轮重设计（酸柠暗场 · 跑道 · 发布会 KPI 墙）：
// - look = lime（石墨 + 荧光黄绿）：高能镜头，掉落感要"硬"。地面是一张为镜头设计的暗色运营仪表盘
//   （虚构产品 Tidewell「Launch week」）：左侧图标栏 + 72px 标题 + 3×2 张 KPI 卡（84px 大数字），
//   只有主角卡「Signups」是荧光黄绿实底，其余是带色相的深色面板——强调色面积小而关键。
// - 跑道：页面躺在一片向地平线延伸的暗色网格地面上，地平线有一道黄绿光带；机位贴地（rotateX 66°），
//   开场同时向前滑行（dolly），网格朝镜头流动 = 掠地速度感。
// - 急雨：6 张卡悬在 170–310px（×1.5 布局） 的错落高度，被追光打亮（亮度 ×1.3，比地面亮一档，悬空可感）；
//   起跳 = 8 + i·1.6f + 微差（≤0.9f，保序），下落 10f 重力加速（距离 ∝ t²），着地即停零回弹。
//   空中恒有 4–5 张同时在落（重叠并行）。下落末段按速度加纵向模糊，地面投影随高度收紧变实。
// - 立起：全员落定后一拍（4f）页面立起 + 镜头拉远转正（rotateX 66→0，不对称 in-out，后半程很软），
//   跑道网格与地平线光随之淡出，只剩舞台光里一张正视的仪表盘；hold 段 Revenue 折线描出、主角卡数字再跳一档。
// - 清晰度（Q2）：场景按 1.5 倍布局（CSS zoom），终态镜头 z 拉到约 −810，缩回 0.95 倍，正视时字形清晰。
//
// 时间表（30fps，共 126f）：
//   0–8     悬空：6 张卡在黑色空域里被追光打亮，机位贴地向前滑行
//   8–27    急雨贴落（起点差 1.6f、下落 10f，零回弹）
//   27–34   一拍定住（滑行减速到停）
//   34–94   立起转正 + 拉远（60f）
//   80–110  Revenue 折线描出、Signups 数字跳到终值
//   94–126  正视 hold，极缓推近 1.5%
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const RUNWAY_GROUND_SKIM_DURATION = 126;

const L = LOOKS.lime;
const D = 1.5; // 场景布局倍率
const P = 1400; // 透视距离
const PW = 1760; // 仪表盘尺寸（终态屏幕 px）
const PH = 960;

const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

type Kpi = { label: string; value: string; delta: string; mark: string; kind: 'bars' | 'line' | 'ring' | 'spark' };
const KPIS: Kpi[] = [
  { label: 'Signups', value: '48,210', delta: '+18.4%', mark: '▲', kind: 'bars' },
  { label: 'Activation', value: '62.4%', delta: '+5.1 pts', mark: '▲', kind: 'ring' },
  { label: 'Revenue', value: '$1.28M', delta: '+22.7%', mark: '▲', kind: 'line' },
  { label: 'Deploys', value: '214', delta: '+38', mark: '▲', kind: 'bars' },
  { label: 'p95 latency', value: '182 ms', delta: '41 ms faster', mark: '▼', kind: 'spark' },
  { label: 'Open incidents', value: '0', delta: 'all clear', mark: '●', kind: 'spark' },
];
const CW = 500, CH = 330, GX = 152, GY = 196, GAPX = 30, GAPY = 30;
const slot = (i: number) => ({ x: GX + (i % 3) * (CW + GAPX), y: GY + Math.floor(i / 3) * (CH + GAPY) });

// 急雨节奏
const START0 = 8, GAP = 1.6, FALL = 10;
const HEIGHTS = [230, 310, 190, 280, 170, 250];
const startOf = (i: number) => START0 + i * GAP + rand(i + 3) * 0.9;
const liftOf = (f: number, i: number) => {
  const t = (f - startOf(i)) / FALL;
  if (t <= 0) return HEIGHTS[i];
  if (t >= 1) return 0;
  return HEIGHTS[i] * (1 - t * t); // 重力加速：距离 ∝ t²
};

const RISE = bezier(0.5, 0, 0.18, 1);

// ───────────── 卡面图形 ─────────────
const Bars: React.FC<{ hero: boolean; seed: number }> = ({ hero, seed }) => (
  <div style={{ position: 'absolute', left: 36, right: 36, bottom: 34, height: 70, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
    {Array.from({ length: 14 }, (_, k) => {
      const h = 0.25 + 0.75 * (0.35 + 0.65 * (k / 13)) * (0.7 + 0.3 * rand(seed * 9 + k));
      return <div key={k} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 4, background: hero ? alpha(L.onAccent, k === 13 ? 0.95 : 0.32) : k === 13 ? L.accent : alpha(L.ink, 0.16) }} />;
    })}
  </div>
);

const LINE_PTS = [0.62, 0.58, 0.64, 0.55, 0.5, 0.53, 0.44, 0.4, 0.42, 0.33, 0.28, 0.22, 0.16];
const LineChart: React.FC<{ draw: number }> = ({ draw }) => {
  const w = 428, h = 86;
  const d = LINE_PTS.map((v, k) => `${k === 0 ? 'M' : 'L'}${((k / (LINE_PTS.length - 1)) * w).toFixed(1)},${(v * h).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h + 8} style={{ position: 'absolute', left: 36, bottom: 28, overflow: 'visible' }}>
      <defs>
        <linearGradient id="rgsFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={L.accent} stopOpacity={0.28} />
          <stop offset="1" stopColor={L.accent} stopOpacity={0} />
        </linearGradient>
        <clipPath id="rgsClip"><rect x={0} y={-10} width={w * draw} height={h + 20} /></clipPath>
      </defs>
      <g clipPath="url(#rgsClip)">
        <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#rgsFill)" />
        <path d={d} fill="none" stroke={L.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {draw > 0.98 && <circle cx={w} cy={LINE_PTS[LINE_PTS.length - 1] * h} r={7} fill={L.accent} style={{ filter: `drop-shadow(0 0 8px ${alpha(L.accent, 0.9)})` }} />}
    </svg>
  );
};

const Ring: React.FC = () => {
  const r = 40, c = 2 * Math.PI * r;
  return (
    <svg width={100} height={100} style={{ position: 'absolute', right: 36, top: 34 }}>
      <circle cx={50} cy={50} r={r} fill="none" stroke={alpha(L.ink, 0.12)} strokeWidth={10} />
      <circle cx={50} cy={50} r={r} fill="none" stroke={L.accent} strokeWidth={10} strokeLinecap="round"
        strokeDasharray={`${c * 0.624} ${c}`} transform="rotate(-90 50 50)" />
    </svg>
  );
};

const Spark: React.FC<{ seed: number }> = ({ seed }) => {
  const w = 428, h = 50;
  const pts = Array.from({ length: 18 }, (_, k) => 0.3 + 0.5 * rand(seed * 7 + k) * (1 - k / 22));
  const d = pts.map((v, k) => `${k === 0 ? 'M' : 'L'}${((k / 17) * w).toFixed(1)},${(v * h).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} style={{ position: 'absolute', left: 36, bottom: 40 }}>
      <path d={d} fill="none" stroke={alpha(L.ink, 0.35)} strokeWidth={3} strokeLinejoin="round" />
    </svg>
  );
};

const KpiCard: React.FC<{ k: Kpi; i: number; f: number; draw: number }> = ({ k, i, f, draw }) => {
  const hero = i === 0;
  // 主角卡数字：hold 段再跳一档（48,210 → 48,396）
  const bump = ramp(f, 96, 14, EASE.snappy);
  const value = hero ? Math.round(mix(48210, 48396, bump)).toLocaleString('en-US') : k.value;
  return (
    <div style={{
      width: CW, height: CH, borderRadius: 28, position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
      background: hero ? `linear-gradient(160deg, #d4ff4a 0%, ${L.accent} 55%, #a9d81f 100%)` : `linear-gradient(170deg, #1d2118 0%, ${L.surface} 100%)`,
      boxShadow: hero
        ? `inset 0 1px 0 rgba(255,255,255,0.6), 0 0 0 1px rgba(220,255,120,0.4)`
        : `inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 1px ${L.line}`,
      fontFamily: FONT.sans,
    }}>
      <div style={{ position: 'absolute', left: 36, top: 34, ...type(30, 560), color: hero ? alpha(L.onAccent, 0.72) : L.ink2 }}>{k.label}</div>
      <div style={{ position: 'absolute', left: 34, top: 82, ...type(84, 760), color: hero ? L.onAccent : L.ink }}>{value}</div>
      <div style={{
        position: 'absolute', left: 36, top: 186, ...type(26, 650), padding: '6px 14px', borderRadius: 999,
        color: hero ? L.accent : L.accent, background: hero ? L.onAccent : alpha(L.accent, 0.12),
      }}>{k.mark} {k.delta}</div>
      {k.kind === 'bars' && <Bars hero={hero} seed={i + 1} />}
      {k.kind === 'line' && <LineChart draw={draw} />}
      {k.kind === 'ring' && <Ring />}
      {k.kind === 'spark' && <Spark seed={i + 2} />}
    </div>
  );
};

// ───────────── 地面：仪表盘骨架（卡槽留空，等卡落进来） ─────────────
const Board: React.FC<{ slotHint: number }> = ({ slotHint }) => (
  <div style={{
    position: 'absolute', left: 0, top: 0, width: PW, height: PH, borderRadius: 36, overflow: 'hidden',
    background: `linear-gradient(180deg, #11130f 0%, #0c0d0a 100%)`, fontFamily: FONT.sans,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px ${L.line}`,
  }}>
    {/* 左侧图标栏 */}
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 104, borderRight: `1px solid ${L.line}`, background: '#0e100c' }}>
      <div style={{ position: 'absolute', left: 30, top: 34, width: 44, height: 44, borderRadius: 13, background: L.accent, boxShadow: `0 0 22px ${alpha(L.accent, 0.45)}` }} />
      {[0, 1, 2, 3, 4].map((k) => (
        <div key={k} style={{ position: 'absolute', left: 34, top: 140 + k * 76, width: 36, height: 36, borderRadius: 10, border: `3px solid ${k === 0 ? L.ink : L.ink3}`, boxSizing: 'border-box', opacity: k === 0 ? 1 : 0.7 }} />
      ))}
    </div>
    {/* 头部 */}
    <div style={{ position: 'absolute', left: GX, top: 50, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.22em', color: L.ink3 }}>TIDEWELL · OPS</div>
    <div style={{ position: 'absolute', left: GX - 4, top: 84, ...type(72, 760), color: L.ink }}>Launch week</div>
    <div style={{ position: 'absolute', right: 56, top: 92, display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ ...type(28, 560), color: L.ink2, padding: '12px 22px', borderRadius: 14, border: `1px solid ${L.line}`, background: L.surface2 }}>Oct 14 – 20</div>
      <div style={{ display: 'flex' }}>
        {['#e8c9a8', '#a8c2e8', '#c9e8a8'].map((c, k) => (
          <div key={k} style={{ width: 52, height: 52, borderRadius: 26, background: c, marginLeft: k ? -14 : 0, boxShadow: `0 0 0 4px #10120e` }} />
        ))}
      </div>
    </div>
    {/* 卡槽：极淡虚线空位（Q9：卡落进真实格位） */}
    {KPIS.map((_, i) => {
      const s = slot(i);
      return (
        <div key={i} style={{
          position: 'absolute', left: s.x, top: s.y, width: CW, height: CH, borderRadius: 28, boxSizing: 'border-box',
          border: `2px dashed ${alpha(L.accent, 0.12 + 0.18 * slotHint)}`, background: alpha(L.accent, 0.02),
        }} />
      );
    })}
  </div>
);

export const RunwayGroundSkim: React.FC = () => {
  const f = useCurrentFrame();
  const riseP = RISE(Math.min(1, Math.max(0, (f - 34) / 60)));
  const hold = ramp(f, 94, 32, EASE.swift);
  // 掠地滑行：0–30f 页面朝镜头滑近（减速到停），网格同步流动
  const skim = ramp(f, 0, 32, EASE.out);
  const rx = mix(66, 0, riseP);
  // 终态 z：缩放 = P/(P − z) = 0.95/D·(1+1.5%推近)——仪表盘 1672px 宽，四周留 ≥120px 安全边
  const zEnd = -P * (D / (0.95 * (1 + 0.015 * hold)) - 1);
  const z = mix(-1000 + 240 * skim, zEnd, riseP);
  const slide = mix(mix(-420, -60, skim), 0, riseP); // 页面在平面内的纵向位置（负 = 远处）
  const slotHint = ramp(f, 2, 10, EASE.out) * (1 - ramp(f, 26, 8));
  const floorOp = 1 - ramp(f, 40, 40, EASE.smooth);
  const draw = ramp(f, 80, 30, EASE.swift);

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: mix(0.3, 0.12, riseP) }} fill={{ x: 0.85, y: 0.95 }}
        horizon={floorOp > 0.01 ? mix(0.3, 0.18, riseP) : undefined} intensity={mix(0.75, 0.6, riseP)} breathe={0.3} />

      <AbsoluteFill style={{ perspective: P, perspectiveOrigin: `50% ${mix(30, 50, riseP)}%` }}>
        <div style={{
          position: 'absolute', left: 960, top: mix(700, 540, riseP), width: 0, height: 0, transformStyle: 'preserve-3d',
          transform: `translateZ(${z.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) translateY(${slide.toFixed(2)}px)`,
        }}>
          {/* 跑道网格地面：与页面同平面，掠地时朝镜头流动；立起时淡出 */}
          {floorOp > 0.01 && (
            <div style={{
              position: 'absolute', left: -2400, top: -2200, width: 2400, height: 2000, transform: 'scale(2)', transformOrigin: '0 0',
              opacity: floorOp,
              backgroundImage: `linear-gradient(90deg, ${alpha(L.accent, 0.16)} 1px, transparent 1px), linear-gradient(0deg, ${alpha(L.accent, 0.16)} 1px, transparent 1px)`,
              backgroundSize: '80px 80px', backgroundPosition: `0 ${(skim * 160).toFixed(2)}px`,
              WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 55%, #000 30%, transparent 75%)',
              maskImage: 'radial-gradient(ellipse 50% 50% at 50% 55%, #000 30%, transparent 75%)',
            }} />
          )}
          {/* 场景（1.5 倍布局）：仪表盘中心在原点 */}
          <div style={{ position: 'absolute', left: (-PW / 2) * D, top: (-PH / 2) * D, width: PW * D, height: PH * D, transformStyle: 'preserve-3d' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: PW, height: PH, zoom: D, transformStyle: 'preserve-3d' }}>
              {/* 仪表盘落在地面上的大软影 + 底光 */}
              <div style={{ position: 'absolute', left: -40, top: -20, width: PW + 80, height: PH + 80, borderRadius: 60, background: 'rgba(0,0,0,0.6)', filter: 'blur(40px)' }} />
              <Board slotHint={slotHint} />
              {/* 投影：高度越大越虚越淡、偏移越大（主光在后上方），落地即收 */}
              {KPIS.map((_, i) => {
                const h = liftOf(f, i);
                if (h < 1) return null;
                const s = slot(i);
                return (
                  <div key={'sh' + i} style={{
                    position: 'absolute', left: s.x + 16, top: s.y + 20 + h * 0.18, width: CW - 32, height: CH - 24, borderRadius: 28,
                    background: '#000', opacity: Math.max(0.18, 0.7 - h * 0.0009), filter: `blur(${(8 + h * 0.06).toFixed(1)}px)`,
                  }} />
                );
              })}
              {/* 悬空卡：与地面同向平躺，translateZ 抬高，落回槽位 */}
              {KPIS.map((k, i) => {
                const h = liftOf(f, i);
                const s = slot(i);
                const lit = Math.min(1, h / 120);
                const bright = 1 + 0.3 * lit * lit * (3 - 2 * lit);
                const t = (f - startOf(i)) / FALL;
                const vel = t > 0 && t < 1 ? (2 * HEIGHTS[i] * t) / FALL : 0;
                const mb = Math.min(14, vel * 0.08);
                return (
                  <div key={'c' + i} style={{
                    position: 'absolute', left: s.x, top: s.y, width: CW, height: CH,
                    transform: `translateZ(${h.toFixed(2)}px)`,
                    filter: `brightness(${bright.toFixed(3)})${mb > 0.5 ? ` url(#rgs-mb-${i})` : ''}`,
                  }}>
                    {mb > 0.5 && (
                      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
                        <filter id={`rgs-mb-${i}`} x="-5%" y="-40%" width="110%" height="180%">
                          <feGaussianBlur stdDeviation={`0 ${mb.toFixed(2)}`} />
                        </filter>
                      </svg>
                    )}
                    <KpiCard k={k} i={i} f={f} draw={draw} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
      {/* 上半空域压暗（低机位时让悬空卡的追光更显），立起时淡出 */}
      <AbsoluteFill style={{
        pointerEvents: 'none', opacity: 1 - riseP,
        background: `linear-gradient(180deg, ${alpha(L.shadow, 0.75)} 0%, ${alpha(L.shadow, 0.2)} 18%, transparent 34%)`,
      }} />
    </AbsoluteFill>
  );
};
