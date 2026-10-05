// axis-rescale-shock-v2 —— 轴爆表重标：折线正常爬升，新值顶破图表上沿冲进标题区，
// 停半拍，y 轴"哗"地重标（旧刻度飞出 / 新刻度滑入 / 网格加密 / 旧线压扁成地平线），新值落回 + 弹真值标签。
//
// 第二轮重设计（沙色瑞士海报 · 渲染月报）：
// - look = sand（米色纸 + 墨黑 + 赤陶）。不再是"卡片里的小图表"，而是整张画面就是一页瑞士网格财务海报：
//   左上 120px 粗黑体标题「Monthly renders」、右上同字号年度合计 KPI，下面是满版图表（1540×540 绘图区），
//   3px 墨黑基线 + 3px "天花板"粗规线 + 发丝网格，历史面积用 45° 斜线排线（印刷感），月份/刻度 32px。
// - 主角是赤陶色爆表段：Dec 新值从 Nov 起跳，越冲越快顶破天花板规线（规线在穿透点裂开、两片碎屑弹飞），
//   一路冲进右上角的 KPI 数字里（KPI 被撞得一颤），悬停半拍带柔光——"装不下"字面化。
// - 重标：14f 内旧刻度 25k–100k 向下飞出、新刻度 100k–400k 从上滑入，网格 4→8 根从左展开，
//   旧折线与斜线面积被压扁成地平线；爆表点落回 340k，弹出赤陶真值标签，KPI 滚到 833k。
// - 品牌轮：眉题换成 video-shotcraft 标志 + 字标，内容从财务营收换成渲染量（数值与版式不变）。
//
// 时间表（30fps，共 168f）：
//   0–20    规线从左画出、标题逐词升起、刻度/月份淡入（第 1 帧已有纸面与规线起点）
//   14–56   历史段 Jan→Nov 写入（42f，不对称 in-out），笔尖带墨点
//   50–62   预警：天花板规线与 100k 刻度转赤陶，Nov 点一圈脉冲（预备）
//   62–76   爆表 14f：越冲越快（ease-in 主导）顶破规线（~69f 穿透：裂口 + 碎屑 + 图表震 10px）→ 冲进 KPI
//   76–94   悬停 18f：笔尖亮头 + 柔光，KPI 被撞后阻尼回位
//   94–108  重标 14f（expo-out）：刻度换、网格密、旧线压扁、端点落回
//   106–126 端点标记 overshoot 落座 + 真值标签弹出；KPI 493k → 833k
//   126–168 hold 42f：只有极缓推镜（1 → 1.018）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const AXIS_RESCALE_SHOCK_V2_DURATION = 168;

const L = LOOKS.sand;
const ACC = L.accent; // 赤陶：只给爆表段 / 事件
const INK = L.ink;

// 版式网格
const M = 96;
const X0 = 268; // 绘图区左
const X1 = 1800; // 绘图区右（Dec）
const PW = X1 - X0;
const CEIL = 362; // 天花板规线
const BASE = 902; // 基线
const PH = BASE - CEIL;
const SHOCK_TOP = CEIL - 226; // 冲出天花板 226px，扎进标题行

const DATA = [22, 30, 26, 38, 35, 47, 44, 58, 55, 66, 72, 340];
const N = DATA.length;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DRAW0 = 14;
const DRAW1 = 56;
const WARN = 50;
const SHOCK0 = 62;
const SHOCK1 = 76;
const BEAT = 94;
const RESCALE1 = 108;
const MARK = 106;

// 冲顶：起步慢、越冲越快，到顶微过冲
const easeShock = bezier(0.7, 0, 0.36, 1.06);

const xOf = (i: number) => X0 + (i / (N - 1)) * PW;

export const AxisRescaleShockV2: React.FC = () => {
  const frame = useCurrentFrame();

  const rescaleP = ramp(frame, BEAT, RESCALE1 - BEAT, EASE.snappy);
  const range = mix(100, 400, rescaleP);
  const yOf = (v: number) => BASE - (v / range) * PH;

  // 历史段写入
  const drawT = ramp(frame, DRAW0, DRAW1 - DRAW0, EASE.swift) * (N - 2);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= Math.floor(drawT); i++) pts.push([xOf(i), yOf(DATA[i])]);
  if (drawT < N - 2 && drawT > Math.floor(drawT)) {
    const i = Math.floor(drawT);
    const f = drawT - i;
    pts.push([mix(xOf(i), xOf(i + 1), f), mix(yOf(DATA[i]), yOf(DATA[i + 1]), f)]);
  }
  const lineD = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

  // 爆表段
  const shockT = ramp(frame, SHOCK0, SHOCK1 - SHOCK0, easeShock);
  const nx = xOf(N - 2);
  const ny = yOf(DATA[N - 2]);
  const topY = mix(SHOCK_TOP, yOf(DATA[N - 1]), rescaleP);
  const hx = mix(nx, X1, Math.min(1, shockT));
  const hy = mix(ny, topY, shockT);
  const shockOn = frame >= SHOCK0;

  // 面积（含爆表段）
  const all: Array<[number, number]> = shockOn ? [...pts, [hx, hy]] : pts;
  const areaD = all.length > 1
    ? `M${all[0][0]},${BASE} ` + all.map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(' ') + ` L${all[all.length - 1][0].toFixed(2)},${BASE} Z`
    : '';

  // 穿透天花板：线段与 y=CEIL 的交点
  const crossX = nx + ((ny - CEIL) / (ny - SHOCK_TOP)) * (X1 - nx);
  const pierced = shockOn && hy <= CEIL + 0.5 && rescaleP < 0.02;
  // 穿透帧（求一次）：shockT 使 hy 过 CEIL 的帧
  let PIERCE = SHOCK1;
  for (let f = SHOCK0; f <= SHOCK1; f += 0.25) {
    if (mix(ny, SHOCK_TOP, ramp(f, SHOCK0, SHOCK1 - SHOCK0, easeShock)) <= CEIL) { PIERCE = f; break; }
  }
  const sinceP = frame - PIERCE;
  const crack = sinceP >= 0 ? ramp(frame, PIERCE, 8, EASE.snappy) * (1 - ramp(frame, BEAT, 14, EASE.smooth)) : 0;

  // 图表震：阻尼正弦，穿透帧起 12f
  const kick = sinceP >= 0 && sinceP < 14 ? 10 * Math.exp(-sinceP / 3.4) * Math.sin(sinceP * 1.8) : 0;
  // KPI 被撞：冲到顶（SHOCK1）时向上一颤
  const sinceTop = frame - (SHOCK1 - 2);
  const kpiKick = sinceTop >= 0 && sinceTop < 16 ? -14 * Math.exp(-sinceTop / 3.8) * Math.cos(sinceTop * 1.5) : 0;

  const warn = ramp(frame, WARN, 10, EASE.out) * (1 - ramp(frame, BEAT, 12, EASE.out));
  const hang = shockOn ? ramp(frame, SHOCK1 - 4, 8, EASE.out) * (1 - ramp(frame, BEAT, 14, EASE.out)) : 0;
  const shockW = mix(12, 7, ramp(frame, BEAT, 16, EASE.out));

  const markS = ramp(frame, MARK, 12, EASE.overshoot);
  const ripple = ramp(frame, MARK + 2, 20, EASE.out);
  const valS = ramp(frame, MARK + 4, 14, EASE.overshoot);
  const totalP = ramp(frame, MARK + 2, 20, EASE.snappy);

  const rule = (d: number) => ramp(frame, d, 20, EASE.snappy);
  const cam = mix(1, 1.018, ramp(frame, 0, AXIS_RESCALE_SHOCK_V2_DURATION, EASE.smooth));

  const OLD = ['25k', '50k', '75k', '100k'];
  const NEW = ['100k', '200k', '300k', '400k'];
  const tickY = (i: number) => BASE - ((i + 1) / 4) * PH;

  // 碎屑（两片规线残段从穿透点弹飞）
  const shard = (k: number) => {
    if (sinceP < 0 || sinceP > 32) return null;
    const t = sinceP / 32;
    const dir = k % 2 === 0 ? -1 : 1;
    const sp = [1, 0.75, 0.55][k];
    const x = crossX + dir * (18 + 190 * sp * EASE.out(t));
    const y = CEIL - (170 - k * 40) * EASE.out(t) + 300 * t * t;
    const w = [40, 30, 18][k];
    return (
      <rect key={k} x={x - w / 2} y={y - 2} width={w} height={4} fill={ACC} opacity={1 - EASE.exit(t)}
        transform={`rotate(${dir * (240 - k * 50) * t} ${x} ${y})`} />
    );
  };

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.0 }} fill={{ x: 0.95, y: 0.95 }} />

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam})`, transformOrigin: '60% 45%' }}>
        {/* 标题行 */}
        <div style={{ position: 'absolute', left: M, top: 92, display: 'flex', alignItems: 'center', gap: 12, ...type(32, 650, { caps: true }), color: L.ink2, opacity: ramp(frame, 0, 12, EASE.out) }}>
          <ShotcraftMark size={38} tone="light" style={{ marginTop: -2 }} />
          <span style={{ fontFamily: BRAND.font, fontWeight: 700, textTransform: 'none', letterSpacing: '0.03em', color: INK }}>{BRAND.name}</span>
          <span><span style={{ color: L.ink3 }}>·</span> Renders <span style={{ color: L.ink3 }}>· FY2026</span></span>
        </div>
        <div style={{ position: 'absolute', left: M - 6, top: 140, ...type(124, 850), color: INK }}>
          <TextReveal text="Monthly renders" by="word" variant="rise" start={2} each={18} gap={5} />
        </div>

        {/* 右上 KPI：爆表段会冲进这里 */}
        <div style={{ position: 'absolute', right: 1920 - 1824, top: 92, textAlign: 'right', opacity: ramp(frame, 6, 14, EASE.out) }}>
          <div style={{ ...type(32, 650, { caps: true }), color: totalP > 0.5 ? ACC : L.ink2 }}>FY total</div>
        </div>
        <div style={{
          position: 'absolute', right: 1920 - 1824, top: 140, ...type(124, 850), textAlign: 'right',
          color: totalP > 0.5 ? ACC : INK, transform: `translateY(${kpiKick.toFixed(2)}px)`, opacity: ramp(frame, 8, 14, EASE.out),
        }}>
          {Math.round(mix(493, 833, totalP))}k
        </div>

        {/* 图表组（震动只作用在这里） */}
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${kick.toFixed(2)}px)` }}>
          {/* 刻度 */}
          <div style={{ position: 'absolute', left: M, top: BASE - 48, width: 200, ...type(32, 500), color: L.ink2, opacity: rule(4) }}>0</div>
          {OLD.map((v, i) => {
            const sw = ramp(frame, BEAT + (3 - i) * 2, 12, EASE.snappy);
            const top = i === 3;
            return (
              <div key={i} style={{ position: 'absolute', left: M, top: tickY(i) - 48, width: 200, height: 40, opacity: rule(4 + i * 2) }}>
                <div style={{
                  position: 'absolute', inset: 0, ...type(32, top ? mix(500, 750, warn) : 500),
                  color: top && warn > 0.02 ? ACC : L.ink2, opacity: 1 - sw, transform: `translateY(${(sw * 46).toFixed(2)}px)`,
                  filter: sw > 0.02 && sw < 0.98 ? `blur(${(Math.sin(Math.PI * sw) * 3).toFixed(2)}px)` : undefined,
                }}>{v}</div>
                <div style={{
                  position: 'absolute', inset: 0, ...type(32, 500), color: L.ink2,
                  opacity: sw, transform: `translateY(${((sw - 1) * 46).toFixed(2)}px)`,
                  filter: sw > 0.02 && sw < 0.98 ? `blur(${(Math.sin(Math.PI * sw) * 3).toFixed(2)}px)` : undefined,
                }}>{NEW[i]}</div>
              </div>
            );
          })}

          {/* 月份 */}
          {MONTHS.map((m, i) => (
            <div key={m} style={{
              position: 'absolute', left: xOf(i) - 50, top: BASE + 22, width: 100, textAlign: 'center',
              ...type(32, i === N - 1 && shockOn ? 750 : 500), color: i === N - 1 && shockOn ? ACC : L.ink2,
              opacity: ramp(frame, 6 + i, 12, EASE.out),
            }}>{m}</div>
          ))}

          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <defs>
              <pattern id="arsHatch" width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={12} stroke={INK} strokeOpacity={0.16} strokeWidth={2} />
              </pattern>
              <filter id="arsGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="10" />
              </filter>
            </defs>

            {/* 网格：基础 3 根 + 重标加密 4 根 */}
            {[0, 1, 2].map((i) => (
              <line key={`g${i}`} x1={M} x2={mix(M, 1824, rule(2 + i * 2))} y1={tickY(i)} y2={tickY(i)} stroke={INK} strokeOpacity={0.14} strokeWidth={1.5} />
            ))}
            {[0, 1, 2, 3].map((k) => {
              const d = ramp(frame, BEAT + 1 + k * 2, 12, EASE.snappy);
              const y = BASE - ((2 * k + 1) / 8) * PH;
              return d > 0 ? <line key={`d${k}`} x1={M} x2={mix(M, 1824, d)} y1={y} y2={y} stroke={INK} strokeOpacity={0.08} strokeWidth={1.5} strokeDasharray="2 8" /> : null;
            })}

            {/* 面积：45° 排线 */}
            {areaD && <path d={areaD} fill="url(#arsHatch)" />}

            {/* 基线 */}
            <line x1={M} x2={mix(M, 1824, rule(0))} y1={BASE} y2={BASE} stroke={INK} strokeWidth={3} />

            {/* 天花板规线：预警转赤陶，被穿透处裂开 */}
            {(() => {
              const c = warn > 0.02 ? ACC : INK;
              const xr = mix(M, 1824, rule(2));
              const gap = 26 * crack;
              const op = 0.85 + 0.15 * warn;
              if (crack <= 0.001) return <line x1={M} x2={xr} y1={CEIL} y2={CEIL} stroke={c} strokeOpacity={op} strokeWidth={3} />;
              return (
                <>
                  <line x1={M} x2={crossX - gap} y1={CEIL} y2={CEIL} stroke={c} strokeOpacity={op} strokeWidth={3} />
                  <line x1={crossX + gap} x2={xr} y1={CEIL} y2={CEIL} stroke={c} strokeOpacity={op} strokeWidth={3} />
                </>
              );
            })()}
            {shard(0)}
            {shard(1)}
            {shard(2)}

            {/* 历史折线 */}
            {lineD && <path d={lineD} fill="none" stroke={INK} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />}
            {/* 历史段数据点 */}
            {pts.map(([x, y], i) => (i < pts.length - (drawT < N - 2 ? 1 : 0) ? <circle key={i} cx={x} cy={y} r={6} fill={L.bg[0]} stroke={INK} strokeWidth={3.5} /> : null))}
            {/* 写入笔尖 */}
            {frame >= DRAW0 && frame < DRAW1 + 1 && pts.length > 0 && (
              <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={9} fill={INK} />
            )}
            {/* 预警脉冲：Nov 点 */}
            {frame >= WARN && frame < SHOCK0 + 6 && (() => {
              const t = ramp(frame, WARN, 16, EASE.out);
              return <circle cx={nx} cy={ny} r={mix(10, 46, t)} fill="none" stroke={ACC} strokeWidth={3} opacity={0.7 * (1 - t)} />;
            })()}

            {/* 爆表段 */}
            {shockOn && (
              <>
                {hang > 0.01 && <line x1={nx} y1={ny} x2={hx} y2={hy} stroke={ACC} strokeWidth={shockW + 16} strokeLinecap="round" opacity={0.35 * hang} filter="url(#arsGlow)" />}
                <line x1={nx} y1={ny} x2={hx} y2={hy} stroke={ACC} strokeWidth={shockW} strokeLinecap="round" />
                {markS <= 0 && <circle cx={hx} cy={hy} r={12} fill={L.bg[0]} stroke={ACC} strokeWidth={5} />}
              </>
            )}
            {pierced && sinceP < 10 && (
              <circle cx={crossX} cy={CEIL} r={mix(8, 70, ramp(frame, PIERCE, 10, EASE.out))} fill="none" stroke={ACC} strokeWidth={2.5}
                opacity={0.8 * (1 - ramp(frame, PIERCE, 10, EASE.out))} />
            )}

            {/* 端点标记 */}
            {markS > 0 && (
              <>
                {ripple < 1 && <circle cx={hx} cy={hy} r={mix(16, 64, ripple)} fill="none" stroke={ACC} strokeWidth={3} opacity={0.6 * (1 - ripple)} />}
                <circle cx={hx} cy={hy} r={15 * markS} fill={ACC} stroke={L.bg[0]} strokeWidth={5 * markS} />
              </>
            )}
          </svg>

          {/* 真值标签 */}
          {valS > 0 && (
            <div style={{
              position: 'absolute', left: hx - 40 - 330, top: hy - 70, width: 330, height: 140,
              transform: `scale(${valS.toFixed(4)})`, transformOrigin: '100% 50%', opacity: Math.min(1, valS * 1.6),
            }}>
              <div style={{
                position: 'absolute', inset: 0, background: ACC, borderRadius: 6, color: L.onAccent,
                display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 30,
                boxShadow: `0 18px 40px -12px ${alpha(L.shadow, 0.45)}`,
              }}>
                <div style={{ ...type(76, 850) }}>340k</div>
                <div style={{ ...type(32, 600), opacity: 0.9 * ramp(frame, MARK + 10, 10, EASE.out), marginTop: 4 }}>▲ 372% vs Nov</div>
              </div>
              <div style={{ position: 'absolute', right: -10, top: 60, width: 20, height: 20, background: ACC, transform: 'rotate(45deg)' }} />
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
