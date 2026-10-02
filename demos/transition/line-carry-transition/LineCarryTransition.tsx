// line-carry-transition｜线条接力横移转场（Catch Me If You Can 片头式图形接力）
// 场景 A 的进度条走满 → 末端延伸成长线冲出卡缘 → 镜头跟线横移 1920px → 线在移动中直角拐弯围出
// 场景 B 的画框，框闭合、画框里的海报长出来。全程一条线、没有切。
//
// 第二轮重设计（沙色制图 · Saul Bass 平面海报）：
// - look = sand（米色纸 + 墨 + 赤陶）。线是 8px 墨色硬线、方头直角，笔头是全片唯一的赤陶色点——
//   观众的眼睛只需要追这一个点。
// - 叙事：A = 印刷工作室 App 的「导出海报」进度卡（160px 百分比随线计数，走满 = 线出发的理由）；
//   B = 线围出的 720×480 画框里长出那张海报（赤陶太阳 + 海军蓝山丘 + 粗黑体字），左侧是展签式标题，
//   线的水平段在 B 里刚好成了展签下的基线。
// - 世界宽 3840（A 左半 / B 右半），一条折线 path 全程 dashoffset 生长：
//   M 336,760 → H 2880（画框左下角）→ V 280 → H 3600 → V 760 → H 2880 闭合，总长 4944。
// - 命门：横移段 drawn = 1144 + cam，线生长与镜头同速，笔头钉在画面 x≈1480 直到拐角；
//   每段交接处速度连续（进度条 ease-out 到零 → 冲出段两端零速 → 镜头 in-out 起步 → 收框 in-out）。
// - 横移时世界内容（卡、点阵、展签）按镜头速度做水平运动模糊；线与笔头在模糊层外，始终锐利。
//
// 时间表（30fps，共 190f）：
//   0–4     A 进度卡静置（第 0 帧即在画面里），空轨道
//   4–40    进度条 0→100%（36f ease-out），百分比与 MB 同步计数
//   40–46   满格停一拍：状态变「Ready to print」，对勾弹出（弹簧）
//   46–56   冲出段：线从条尾冲出卡缘到画面 x=1480（两端零速）
//   56–112  镜头左移 1920px（56f smooth in-out），线同速延伸；~92f 线到画框左下角、开始向上拐
//   100–126 B 展签标题逐行升起（框外，可以先到）
//   112–136 收框：线走完上边、右边、底边闭合（24f in-out）；136–142 笔头消散并卸载
//   136–166 框内海报：底色铺开 → 太阳升起 → 山丘错峰 → 海报字升起
//   166–190 hold 24f
// 线下的制图刻度（1200–2760，每 120px 一格）在线经过后才出现，给横移中段一个速度参照。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, mix, ramp, softShadow, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, TYPE, alpha, springAt, stagger, type } from '../../_fixtures/Look';

export const LINE_CARRY_TRANSITION_DURATION = 190;

const L = LOOKS.sand;
const LINE_Y = 760;
const X0 = 336; // 进度条起点（卡内左边距）
const BAR = 648; // 进度条长度
const TIP_X = 1480; // 横移时笔头钉住的屏幕 x
const FX0 = 2880, FX1 = 3600, FY0 = 280; // B 画框（底边 = LINE_Y）
const SEGS: Array<[number, number, number, number]> = [
  [X0, LINE_Y, FX0, LINE_Y],
  [FX0, LINE_Y, FX0, FY0],
  [FX0, FY0, FX1, FY0],
  [FX1, FY0, FX1, LINE_Y],
  [FX1, LINE_Y, FX0, LINE_Y],
];
const lens = SEGS.map(([a, b, c, d]) => Math.hypot(c - a, d - b));
const TOTAL = lens.reduce((s, x) => s + x, 0); // 4944
const PATH = `M ${X0} ${LINE_Y} H ${FX0} V ${FY0} H ${FX1} V ${LINE_Y} H ${FX0}`;

const PAN0 = 56, PAN1 = 112;
const camAt = (f: number) => 1920 * ramp(f, PAN0, PAN1 - PAN0, EASE.smooth);
const LEAD = TIP_X - X0; // 横移段：drawn = LEAD + cam
const drawnAt = (f: number) => {
  if (f < 46) return BAR * ramp(f, 4, 36, EASE.out);
  if (f < PAN0) return mix(BAR, LEAD, ramp(f, 46, 10, EASE.swift));
  if (f < PAN1) return LEAD + camAt(f);
  return mix(LEAD + 1920, TOTAL, ramp(f, PAN1, 24, EASE.smooth));
};
const tipAt = (d: number): [number, number] => {
  let r = Math.max(0, Math.min(d, TOTAL));
  for (let i = 0; i < SEGS.length; i++) {
    const [a, b, c, e] = SEGS[i];
    if (r <= lens[i]) {
      const t = r / lens[i];
      return [a + (c - a) * t, b + (e - b) * t];
    }
    r -= lens[i];
  }
  return [FX0, LINE_Y];
};

const NAVY = L.accent2;
const CREAM = '#f7eedf';

// 平面海报（Saul Bass 式剪纸）：赤陶太阳 + 海军蓝山丘 + 粗黑体字；p = 各层入场进度
const Poster: React.FC<{ w: number; h: number; f: number; mini?: boolean }> = ({ w, h, f, mini }) => {
  const sun = mini ? 1 : ramp(f, 140, 22, EASE.snappy);
  const hill = (i: number) => (mini ? 1 : ramp(f, 146 + stagger(i, 2, 6, EASE.out), 20, EASE.snappy));
  const txt = mini ? 1 : ramp(f, 152, 18, EASE.snappy);
  const k = w / 720;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: CREAM }}>
      <svg width={w} height={h} viewBox="0 0 720 480" style={{ position: 'absolute', inset: 0 }}>
        <circle cx={468} cy={mix(480, 226, sun)} r={142} fill={L.accent} />
        {/* 海军蓝山丘与太阳叠印（multiply = 孔版印刷的套色叠印） */}
        <path d={`M 250 480 Q 540 ${mix(620, 250, hill(0))} 830 480 Z`} fill={NAVY} style={{ mixBlendMode: 'multiply' }} />
        <path d={`M -60 480 Q 150 ${mix(600, 300, hill(1))} 420 480 Z`} fill={L.ink} />
        <rect x={0} y={420} width={720} height={60} fill={L.ink} opacity={hill(1)} />
      </svg>
      {!mini && (
        <div style={{ position: 'absolute', left: 44 * k, top: 38 * k, overflow: 'hidden' }}>
          <div style={{ transform: `translateY(${((1 - txt) * 110).toFixed(2)}%)`, ...type(72, 900), color: L.ink, lineHeight: 0.9, letterSpacing: '-0.035em' }}>
            SUNDAY<br />MARKET
          </div>
        </div>
      )}
      {!mini && (
        <div style={{ position: 'absolute', left: 44, bottom: 14, ...type(22, 600, { mono: true }), color: CREAM, opacity: txt, letterSpacing: '0.08em' }}>
          06.10 — RIVER HALL
        </div>
      )}
    </div>
  );
};

// 场景 A：导出进度卡（760×500 @ 280,300；进度条轨道在卡内 y=760）
const ExportCard: React.FC<{ pct: number; f: number }> = ({ pct, f }) => {
  const done = pct >= 99.95;
  const check = springAt(f, 40, { damping: 14, stiffness: 220 });
  return (
    <div style={{
      position: 'absolute', left: 280, top: 300, width: 760, height: 500, boxSizing: 'border-box', padding: '48px 56px',
      background: `linear-gradient(180deg, ${L.surface}, #f8f1e6)`, borderRadius: 28,
      boxShadow: `inset 0 1px 0 #fff, inset 0 0 0 1px ${L.line}, ${softShadow(22, { color: L.shadow, strength: 0.9 })}`,
      fontFamily: FONT.sans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        <div style={{ position: 'relative', width: 120, height: 80, borderRadius: 8, overflow: 'hidden', boxShadow: `0 0 0 1px ${L.line}`, flex: 'none' }}>
          <Poster w={120} h={80} f={f} mini />
        </div>
        <div>
          <div style={{ ...type(38, 680), color: L.ink }}>sunday-market.pdf</div>
          <div style={{ ...type(28, 500), color: L.ink3, marginTop: 8 }}>A2 · 300 dpi · 3 inks</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 56, right: 56, top: 236, display: 'flex', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...type(30, 600), color: done ? L.accent : L.ink3 }}>
            {done && (
              <svg width={30} height={30} viewBox="0 0 30 30" style={{ transform: `scale(${check.toFixed(3)})` }}>
                <circle cx={15} cy={15} r={15} fill={L.accent} />
                <path d="M8.5 15.5 13 20l8.5-9" stroke="#fff" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {done ? 'Ready to print' : 'Exporting…'}
          </div>
          <div style={{ ...type(170, 780), color: L.ink, marginTop: 4 }}>
            {Math.round(pct)}<span style={{ ...type(TYPE.h3, 650), color: L.ink3, marginLeft: 6 }}>%</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', ...type(28, 500, { mono: true }), color: L.ink3, paddingBottom: 34 }}>
          {(pct * 0.48).toFixed(1)} / 48 MB
        </div>
      </div>
      {/* 进度条轨道（墨色填充即 path 本体） */}
      <div style={{ position: 'absolute', left: X0 - 280, top: LINE_Y - 300 - 4, width: BAR, height: 8, background: alpha(L.ink, 0.1) }} />
    </div>
  );
};

export const LineCarryTransition: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const drawn = drawnAt(f);
  const vx = -velocity(camAt, f);
  const pct = Math.min(100, (Math.min(drawn, BAR) / BAR) * 100);
  const [tx, ty] = tipAt(drawn);
  const tipO = 1 - ramp(f, 136, 6, EASE.linear);
  const closed = f >= 136;
  const fillIn = ramp(f, 134, 10, EASE.out); // 框内底色
  const world: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: 3840, height: 1080, transform: `translateX(${(-cam).toFixed(2)}px)` };
  const capIn = (k: number) => ramp(f, 100 + k * 6, 20, EASE.snappy);

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      {/* 共享舞台（屏幕空间，像摄影棚里的固定灯） */}
      <Stage look={L} keyLight={{ x: 0.28, y: 0.02 }} fill={{ x: 0.9, y: 0.95 }} />

      {/* 世界内容：随镜头横移，快段水平模糊 */}
      <SpeedBlur vx={vx} amount={0.28} max={16}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div style={world}>
            {/* 制图点阵：给眼睛一个速度参照，上下渐隐 */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `radial-gradient(circle, ${alpha(L.ink, 0.13)} 1.7px, ${alpha(L.ink, 0)} 2.3px)`,
              backgroundSize: '60px 60px', backgroundPosition: '6px 10px',
              WebkitMaskImage: 'linear-gradient(180deg, transparent 6%, #000 28%, #000 80%, transparent 97%)',
              maskImage: 'linear-gradient(180deg, transparent 6%, #000 28%, #000 80%, transparent 97%)',
            }} />
            {/* A 眉题 */}
            <div style={{ position: 'absolute', left: 280, top: 214, display: 'flex', gap: 18, alignItems: 'baseline', ...type(TYPE.label + 4, 700, { caps: true }), letterSpacing: '0.24em' }}>
              <span style={{ color: L.accent }}>01</span><span style={{ color: L.ink2 }}>Export</span>
            </div>
            <ExportCard pct={pct} f={f} />
            {/* B 展签：框外标题，镜头到位前后逐行升起 */}
            <div style={{ position: 'absolute', left: 2080, top: 300, width: 720 }}>
              <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', ...type(TYPE.label + 4, 700, { caps: true }), letterSpacing: '0.24em', opacity: capIn(0) }}>
                <span style={{ color: L.accent }}>02</span><span style={{ color: L.ink2 }}>Print</span>
              </div>
              <div style={{ ...type(TYPE.h1, 820), color: L.ink, marginTop: 26 }}>
                {['Sunday', 'Market.'].map((t, k) => (
                  <div key={t} style={{ overflow: 'hidden', padding: '0.04em 0 0.14em', margin: '-0.04em 0 -0.14em' }}>
                    <div style={{ transform: `translateY(${((1 - capIn(k + 0.5)) * 115).toFixed(2)}%)` }}>{t}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...type(TYPE.small, 500), color: L.ink2, marginTop: 30, opacity: capIn(2.2) }}>
                A2 risograph · three inks · 40 copies
              </div>
            </div>
            {/* B 画框内：框闭合后才长出海报 */}
            {closed && (
              <div style={{
                position: 'absolute', left: FX0, top: FY0, width: FX1 - FX0, height: LINE_Y - FY0, opacity: fillIn,
                boxShadow: softShadow(26 * fillIn, { color: L.shadow, strength: 0.8 }),
              }}>
                <Poster w={FX1 - FX0} h={LINE_Y - FY0} f={f} />
              </div>
            )}
          </div>
        </div>
      </SpeedBlur>

      {/* 一条线全程 evolve（模糊层外，始终锐利） */}
      <div style={world}>
        <svg width={3840} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {/* 制图刻度：线经过后才出现在线下（横移中段的速度参照 + 尺规感），主刻度标距离 */}
          {Array.from({ length: 14 }, (_, i) => {
            const x = 1200 + i * 120;
            const on = ramp(X0 + drawn, x, 40, EASE.out);
            if (on <= 0) return null;
            const major = i % 4 === 0;
            return (
              <g key={i} opacity={on}>
                <line x1={x} x2={x} y1={LINE_Y + 10} y2={LINE_Y + (major ? 34 : 20)} stroke={alpha(L.ink, major ? 0.55 : 0.3)} strokeWidth={2} />
                {major && (
                  <text x={x + 8} y={LINE_Y + 62} fill={alpha(L.ink, 0.42)} style={{ ...type(22, 600, { mono: true }) }}>{`${(i / 4 + 1) * 12} cm`}</text>
                )}
              </g>
            );
          })}
          <path d={PATH} fill="none" stroke={L.ink} strokeWidth={8} strokeLinecap="square" strokeLinejoin="miter"
            strokeDasharray={`${drawn.toFixed(2)} ${TOTAL + 20}`} />
          {tipO > 0.001 && (
            <g opacity={tipO}>
              <circle cx={tx} cy={ty} r={30} fill={L.accent} opacity={0.16} />
              <circle cx={tx} cy={ty} r={14} fill={L.accent} />
            </g>
          )}
        </svg>
      </div>
    </AbsoluteFill>
  );
};
