// axis-rescale-shock-v2 —— 轴爆表重标 v2（批次 6 "改改再看" 重做）
// 相对 v1 的加码：爆表点冲出卡片顶 80→220px（真的冲进标题字区域）、冲出段折线
// 加粗 10px 且变琥珀；重标瞬间"哗"——旧刻度数字向下飞出淡出、新刻度从上滑入，
// 网格 4→8 根同帧加密；真图表语境：真标题 "Monthly revenue"、真轴刻度
// $25k/$50k/$75k/$100k → $100k/$200k/$300k/$400k、真月份 x 轴、端点弹真值
// 标签 "$340k"；卡片震动 3→8px。收尾 f110 后真静止 40f。
// 帧确定性：数据硬编码，全部 frame 派生，无 Math.random / Date.now。
//
// 质感升级：调试标题换成页面级标题区（爆表段真的插进这行字里）；卡片走发丝线 + 内高光 + 两层软影，
// 柔光背景 + 颗粒；1px 发丝网格、虚线"天花板"在顶破前一拍转琥珀；折线下加淡面积渐变、写入点带头灯；
// 冲顶用"越来越快再轻微过冲"的曲线 + 冲出段柔光，粗细 10→6 平滑收回；卡片震动改为阻尼正弦；
// 刻度/加密网格错峰 2f 入场；端点标记 overshoot 落座 + 一圈涟漪，真值标签带增幅副行。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, Grain, bezier, mix, ramp, softShadow, tracking } from '../../_fixtures/Polish';

export const AXIS_RESCALE_SHOCK_V2_DURATION = 150;

const AMBER = '#d97706'; // 强调色（事件 / 主角）
const AMBER_DEEP = '#b45309';

const CARD_W = 1060;
const CARD_H = 600;
const CX = (1920 - CARD_W) / 2;
const CY = (1080 - CARD_H) / 2 + 60;
const PAD = 52;
const AXIS_W = 96; // 左侧 $ 刻度位
const PLOT_W = CARD_W - PAD * 2 - AXIS_W;
const PLOT_H = 360;
const PLOT_X = PAD + AXIS_W;
const PLOT_Y = 140;

// 历史数据（$k，0–100 量程内温和爬升），最后一点爆表 340
const DATA = [22, 30, 26, 38, 35, 47, 44, 58, 55, 66, 72, 340];
const N = DATA.length;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const IN_END = 14; // f0–14：卡片浮入
const HOLD = 12;
const DRAW_END = HOLD + 34; // f46：历史段画完
const SHOCK_END = DRAW_END + 16; // f62：爆表点冲顶
const BEAT = SHOCK_END + 16; // f78：停半拍（悬在标题区）
const RESCALE_END = BEAT + 12; // f90：重标完成
const MARK_END = RESCALE_END + 8; // f98：端点标记弹出
const VAL_END = MARK_END + 10; // f108：真值标签弹出

// 冲顶曲线：起步慢、越冲越快，到顶轻微过冲后收住（不是匀速、也不是硬停）
const easeShock = bezier(0.62, 0, 0.32, 1.08);

export const AxisRescaleShockV2: React.FC = () => {
  const frame = useCurrentFrame();

  // 量程：0–100 → 0–400，重标 12f
  const rescaleP = ramp(frame, BEAT, RESCALE_END - BEAT, EASE.snappy);
  const range = mix(100, 400, rescaleP);
  const yOf = (v: number): number => PLOT_H - (v / range) * PLOT_H;
  const xOf = (i: number): number => (i / (N - 1)) * PLOT_W;

  const drawT = ramp(frame, HOLD, DRAW_END - HOLD, EASE.swift) * (N - 2);
  const shockT = ramp(frame, DRAW_END + 2, SHOCK_END - DRAW_END - 2, easeShock);

  // 冲顶停位：卡片上沿之上 220px（相对绘图区顶 -(PLOT_Y+220)），真冲进标题字区
  const SHOCK_Y = -(PLOT_Y + 220);

  // 历史段点集
  const pts: Array<[number, number]> = [];
  const upto = Math.min(drawT, N - 2);
  for (let i = 0; i <= Math.floor(upto); i++) pts.push([xOf(i), yOf(DATA[i])]);
  if (upto < N - 2 && upto > Math.floor(upto)) {
    const i = Math.floor(upto);
    const f = upto - i;
    pts.push([mix(xOf(i), xOf(i + 1), f), mix(yOf(DATA[i]), yOf(DATA[i + 1]), f)]);
  }
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = pts.length > 1 ? `M0,${PLOT_H} L${line.replace(/ /g, ' L')} L${pts[pts.length - 1][0].toFixed(2)},${PLOT_H} Z` : '';

  // 爆表段单独一根（琥珀 + 加粗），起点 = 历史最后一点
  let [headX, headY] = pts.length ? pts[pts.length - 1] : [0, PLOT_H];
  let shockSeg = '';
  if (shockT > 0) {
    const x0 = xOf(N - 2);
    const y0 = yOf(DATA[N - 2]);
    const x = mix(x0, xOf(N - 1), Math.min(1, shockT));
    const yEnd = mix(SHOCK_Y, yOf(DATA[N - 1]), rescaleP);
    const y = mix(y0, yEnd, shockT);
    shockSeg = `${x0.toFixed(2)},${y0.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`;
    headX = x;
    headY = y;
  }
  const shockW = mix(10, 6, ramp(frame, BEAT + 2, 14, EASE.out)); // 冲出期 10px，重标后平滑收回 6px
  const shockGlow = shockT > 0 ? 1 - ramp(frame, BEAT, 16, EASE.out) : 0; // 冲出段柔光，只在悬停期

  // 天花板预警：冲顶前 8f 起虚线上沿 + $100k 刻度转琥珀，重标后回归中性
  const warn = ramp(frame, DRAW_END - 2, 10, EASE.out) * (1 - ramp(frame, BEAT, 10, EASE.out));

  // 重标"哗"：旧刻度向下飞出淡出、新刻度从上滑入，逐个错峰 2f
  const OLD_TICKS = ['$25k', '$50k', '$75k', '$100k'];
  const NEW_TICKS = ['$100k', '$200k', '$300k', '$400k'];

  const markS = ramp(frame, RESCALE_END, MARK_END - RESCALE_END + 2, EASE.overshoot);
  const ripple = ramp(frame, RESCALE_END + 2, 18, EASE.out);
  const valS = ramp(frame, MARK_END, VAL_END - MARK_END + 2, EASE.overshoot);
  const valSub = ramp(frame, MARK_END + 4, 10, EASE.out);

  // 顶破瞬间卡片震：阻尼正弦（±8px，10f 收敛），只走 y 轴
  const kf = frame - (SHOCK_END - 3);
  const kick = kf >= 0 && kf < 12 ? 8 * Math.exp(-kf / 3.2) * Math.sin(kf * 1.9) : 0;

  // 卡片 / 标题入场
  const inP = ramp(frame, 0, IN_END, EASE.snappy);
  const headIn = ramp(frame, 2, 14, EASE.out);
  const totalP = ramp(frame, RESCALE_END - 4, 18, EASE.snappy); // 年度合计滚动

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.08 }} />

      {/* 页面标题区：爆表段会冲进这一行 */}
      <div style={{ position: 'absolute', left: CX + 4, top: 96, opacity: headIn, transform: `translateY(${mix(10, 0, headIn)}px)` }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: G.ink3, letterSpacing: tracking(20, true), textTransform: 'uppercase' }}>
          Finance · FY2026
        </div>
        <div style={{ marginTop: 8, fontSize: 64, fontWeight: 700, color: G.ink1, letterSpacing: tracking(64), lineHeight: 1.05 }}>
          Revenue overview
        </div>
      </div>

      {/* 右侧 KPI：爆表段正好冲进这里；重标完成时年度合计从 $493k 翻到 $833k */}
      <div
        style={{
          position: 'absolute',
          right: 1920 - CX - CARD_W - 4,
          top: 96,
          textAlign: 'right',
          opacity: headIn,
          transform: `translateY(${mix(10, 0, headIn)}px)`,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, color: G.ink3, letterSpacing: tracking(20, true), textTransform: 'uppercase' }}>
          FY total
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 64,
            fontWeight: 650,
            lineHeight: 1.05,
            letterSpacing: tracking(64),
            fontVariantNumeric: 'tabular-nums',
            color: totalP > 0.5 ? AMBER_DEEP : G.ink2,
          }}
        >
          ${Math.round(mix(493, 833, totalP))}k
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: CX,
          top: CY,
          width: CARD_W,
          height: CARD_H,
          background: 'linear-gradient(180deg, #ffffff, #fcfcfb)',
          border: `1px solid ${G.hairline}`,
          borderRadius: 20,
          boxSizing: 'border-box',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(mix(4, 18, inP) + Math.abs(kick))}`,
          transform: `translateY(${(mix(24, 0, inP) + kick).toFixed(2)}px)`,
          opacity: inP,
          overflow: 'visible', // 让爆表段真的越出卡片
        }}
      >
        {/* 真卡头 */}
        <div style={{ position: 'absolute', left: PAD, top: 38 }}>
          <div style={{ fontSize: 30, fontWeight: 650, color: G.ink1, letterSpacing: tracking(30) }}>Monthly revenue</div>
          <div style={{ fontSize: 19, fontWeight: 500, color: G.ink3, marginTop: 7 }}>All products · USD</div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: PAD,
            top: 42,
            display: 'flex',
            gap: 4,
            padding: 4,
            borderRadius: 11,
            background: G.fill,
            border: `1px solid ${G.hairline}`,
          }}
        >
          {['6M', '12M', 'YTD'].map((s, i) => (
            <div
              key={s}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 17,
                fontWeight: 600,
                color: i === 1 ? G.ink1 : G.ink3,
                background: i === 1 ? '#ffffff' : 'transparent',
                boxShadow: i === 1 ? '0 1px 2px rgba(16,18,26,0.08), 0 0 0 1px rgba(16,18,26,0.05)' : 'none',
              }}
            >
              {s}
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', left: PLOT_X, top: PLOT_Y, width: PLOT_W, height: PLOT_H }}>
          {/* 基础网格 4 根 + 重标同帧加密出的 4 根（错峰 2f 从左向右展开） */}
          {[1, 2, 3].map((i) => (
            <div key={`g${i}`} style={{ position: 'absolute', left: 0, right: 0, top: (PLOT_H / 4) * i, height: 1, background: G.hairline }} />
          ))}
          {[1, 3, 5, 7].map((i, k) => {
            const d = ramp(frame, BEAT + 1 + k * 2, 10, EASE.snappy);
            return (
              <div
                key={`gd${i}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  width: `${d * 100}%`,
                  top: (PLOT_H / 8) * i,
                  height: 1,
                  background: 'rgba(20,22,28,0.05)',
                }}
              />
            );
          })}
          {/* 基线 */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: PLOT_H, height: 1, background: G.hairlineStrong }} />
          {/* 图表上沿：虚线"天花板"，顶破前转琥珀 */}
          <svg width={PLOT_W} height={4} style={{ position: 'absolute', left: 0, top: -1.5, overflow: 'visible' }}>
            <line
              x1={0}
              x2={PLOT_W}
              y1={1.5}
              y2={1.5}
              stroke={warn > 0.01 ? AMBER : 'rgba(20,22,28,0.22)'}
              strokeOpacity={warn > 0.01 ? 0.35 + warn * 0.6 : 1}
              strokeWidth={1.5 + warn}
              strokeDasharray="6 7"
            />
          </svg>

          {/* 刻度：同一格位，旧值下飞淡出 / 新值上方滑入（自上而下错峰 2f） */}
          {OLD_TICKS.map((v, i) => {
            const y = (PLOT_H / 4) * (3 - i);
            const sw = ramp(frame, BEAT + (3 - i) * 2, 10, EASE.snappy);
            const tickStyle: React.CSSProperties = {
              position: 'absolute',
              inset: 0,
              fontWeight: 500,
              fontSize: 21,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.005em',
            };
            const top = i === 3;
            return (
              <div key={`t${i}`} style={{ position: 'absolute', left: -AXIS_W, top: y - 13, width: AXIS_W - 18, height: 26, overflow: 'visible' }}>
                <div
                  style={{
                    ...tickStyle,
                    color: top && warn > 0.01 ? AMBER_DEEP : G.ink3,
                    fontWeight: top ? mix(500, 650, warn) : 500,
                    opacity: 1 - sw,
                    transform: `translateY(${(sw * 30).toFixed(2)}px)`,
                    filter: sw > 0.02 && sw < 0.98 ? `blur(${(Math.sin(Math.PI * sw) * 1.5).toFixed(2)}px)` : undefined,
                  }}
                >
                  {v}
                </div>
                <div
                  style={{
                    ...tickStyle,
                    color: G.ink2,
                    opacity: sw,
                    transform: `translateY(${((sw - 1) * 30).toFixed(2)}px)`,
                    filter: sw > 0.02 && sw < 0.98 ? `blur(${(Math.sin(Math.PI * sw) * 1.5).toFixed(2)}px)` : undefined,
                  }}
                >
                  {NEW_TICKS[i]}
                </div>
              </div>
            );
          })}
          <div style={{ position: 'absolute', left: -AXIS_W, top: PLOT_H - 13, width: AXIS_W - 18, fontWeight: 500, fontSize: 21, color: G.ink3, textAlign: 'right' }}>
            $0
          </div>

          <svg width={PLOT_W} height={PLOT_H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <defs>
              <linearGradient id="arsArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={G.ink1} stopOpacity={0.09} />
                <stop offset="1" stopColor={G.ink1} stopOpacity={0} />
              </linearGradient>
              <filter id="arsGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="9" />
              </filter>
            </defs>
            {/* 面积渐变（随重标一起被压扁） */}
            {area && <path d={area} fill="url(#arsArea)" />}
            {/* 历史段 */}
            <polyline points={line} fill="none" stroke={G.ink1} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
            {/* 写入点头灯：画线期跟着笔尖走 */}
            {frame >= HOLD && frame < DRAW_END + 2 && pts.length > 0 && (
              <>
                <circle cx={headX} cy={headY} r={14} fill={G.ink1} opacity={0.08} />
                <circle cx={headX} cy={headY} r={6.5} fill="#ffffff" stroke={G.ink1} strokeWidth={3} />
              </>
            )}
            {/* 爆表段：琥珀 + 加粗，冲出期带柔光，重标落回后收敛回常规 */}
            {shockSeg && (
              <>
                {shockGlow > 0.01 && (
                  <polyline points={shockSeg} fill="none" stroke={AMBER} strokeWidth={shockW + 10} strokeLinecap="round" opacity={0.35 * shockGlow} filter="url(#arsGlow)" />
                )}
                <polyline points={shockSeg} fill="none" stroke={AMBER} strokeWidth={shockW} strokeLinejoin="round" strokeLinecap="round" />
              </>
            )}
            {/* 冲顶笔尖：悬停期一颗亮头 */}
            {shockT > 0 && frame < RESCALE_END && (
              <circle cx={headX} cy={headY} r={9} fill="#ffffff" stroke={AMBER} strokeWidth={4} />
            )}
            {/* 端点标记：overshoot 落座 + 一圈涟漪 */}
            {markS > 0 && (
              <>
                {ripple < 1 && (
                  <circle cx={headX} cy={headY} r={mix(14, 46, ripple)} fill="none" stroke={AMBER} strokeWidth={2.5} opacity={0.5 * (1 - ripple)} />
                )}
                <circle cx={headX} cy={headY} r={22 * markS} fill={AMBER} opacity={0.14} />
                <circle cx={headX} cy={headY} r={11 * markS} fill={AMBER} stroke="#ffffff" strokeWidth={3.5 * markS} />
              </>
            )}
          </svg>

          {/* 真值标签 "$340k"（端点左侧弹出，带指向小三角与增幅副行） */}
          {valS > 0 && (
            <div
              style={{
                position: 'absolute',
                left: headX - 214,
                top: headY - 38,
                width: 180,
                height: 76,
                transform: `scale(${valS.toFixed(4)})`,
                transformOrigin: '100% 50%',
                opacity: Math.min(1, valS * 1.6),
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 14,
                  background: `linear-gradient(180deg, ${AMBER}, ${AMBER_DEEP})`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.28), ${softShadow(14, { color: '#5a2a04', strength: 1.2 })}`,
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                <div style={{ fontWeight: 750, fontSize: 32, letterSpacing: tracking(32), fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>$340k</div>
                <div style={{ fontWeight: 600, fontSize: 16, opacity: 0.85 * valSub, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>▲ 372% vs Nov</div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  right: -7,
                  top: 31,
                  width: 14,
                  height: 14,
                  background: AMBER_DEEP,
                  transform: 'rotate(45deg)',
                  borderRadius: 2,
                }}
              />
            </div>
          )}

          {/* x 轴真月份 */}
          {MONTHS.map((m, i) => (
            <div
              key={`m${i}`}
              style={{
                position: 'absolute',
                left: xOf(i) - 30,
                top: PLOT_H + 18,
                width: 60,
                textAlign: 'center',
                fontSize: 18,
                fontWeight: i === N - 1 ? 650 : 500,
                color: i === N - 1 && shockT > 0 ? AMBER_DEEP : G.ink3,
              }}
            >
              {m}
            </div>
          ))}
        </div>
      </div>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};
