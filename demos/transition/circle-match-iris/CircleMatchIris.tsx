// 圆心匹配光圈切(match-cut × iris-reveal 组合):
// 帧 0–30:景 A(列表面板)hold,第 2 行 44px 圆形项目图标做两次脉冲 + 扩散光环提示"看这里";
// 帧 30–75:景 B 以 clip-path: circle(r at CX CY) 从 22px 炸开到 2100px(inOut cubic),
//   景 B 是深色圆环图表页,圆环半径同步从 22px 长到 170px——在光圈吃满全屏前就"接住"图标的圆;
// 帧 45–100:圆环描边 sweep 到 78%,中央大数字随之计数;帧 100–140 全属性静止收尾(40f)。
// 命门:两景的圆严格同心——CX/CY 写死为 FakeDashboard B 第 2 行图标块的屏幕坐标常量。
// 质感层:锚点换成真圆的项目图标(强调色渐变 + 白色闪电,语义 = 这个项目 → 这个项目的指标);
// 光圈边缘带一圈细受光环 + 圈外落影(新景"压"在旧页之上);景 B 是带光斑的暗场,
// 圆环用强调色渐变弧 + 弧头柔光,右侧是真实的项目页(标题 / 说明 / 三枚指标卡)。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';
import { EASE, ramp, mix, FONT, tracking, hairline, innerHighlight, Backdrop } from '../../_fixtures/Polish';

export const CIRCLE_MATCH_IRIS_DURATION = 140;

// FakeDashboard variant B 第 2 行左侧 44px 图标块的圆心(手算自 fixture 布局)
const CX = 308;
const CY = 384.8;

const ACC = '#7c84f4'; // 暗场里的强调色(与 fixture 的 #5b63d3 同色相、提亮一档)
const ACC_DEEP = '#5b63d3';

const REGIONS = [
  ['FRA', 0.91], ['IAD', 0.86], ['SFO', 0.83], ['NRT', 0.79], ['SIN', 0.72], ['GRU', 0.64],
] as const;

const STATS = [
  { k: 'Requests served', v: '1.2M', d: '+18% wk' },
  { k: 'p95 latency', v: '148 ms', d: '−32 ms' },
  { k: 'Regions live', v: '14 / 18', d: '4 queued' },
];

export const CircleMatchIris: React.FC = () => {
  const f = useCurrentFrame();

  // ---- 景 A:图标脉冲(帧 0–30,两次 1→1.15:5f 弹起 + 10f 回落) ----
  const pulse = (s: number) => ramp(f, s, 5, EASE.snappy) - ramp(f, s + 5, 10, EASE.out);
  const scale = 1 + 0.15 * (pulse(0) + pulse(15));
  // 两道扩散光环(ease-out 外扩、边扩边淡)
  const waves = [0, 14].map((start) => {
    const p = ramp(f, start, 18, EASE.out);
    return { r: 22 + p * 46, o: f < start + 18 && f >= start ? 0.75 * (1 - p) : 0, w: mix(3, 1, p) };
  });

  // ---- 光圈:景 B 从同一圆心炸开 ----
  const irisR = interpolate(f, [30, 75], [22, 2100], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // ---- 景 B 圆环:半径从 22 长到 170,"接住"图标的圆 ----
  const growP = ramp(f, 30, 40, Easing.inOut(Easing.cubic));
  const ringR = mix(22, 170, growP);
  const ringW = mix(12, 36, growP);
  // 描边 sweep 到 78%
  const sweep = interpolate(f, [45, 100], [0, 0.78], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const circ = 2 * Math.PI * ringR;
  const num = Math.round(sweep * 100);
  const numOpacity = ramp(f, 66, 18, EASE.out);
  // 页面家具只做淡入(md:圈内新景别再叠入场动效),三档错峰
  const furn = (k: number) => ramp(f, 60 + k * 5, 20, EASE.out);
  // 弧头位置(柔光点跟着笔尖走)
  const headA = -Math.PI / 2 + sweep * Math.PI * 2;
  const hx = CX + Math.cos(headA) * ringR;
  const hy = CY + Math.sin(headA) * ringR;
  // 光圈边缘受光环:开圈时最亮,吃满屏前淡掉
  const rimO = f >= 30 ? interpolate(irisR, [22, 120, 1200, 1900], [0, 0.9, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: G.bg }}>
      {/* ===== 景 A:列表面板 ===== */}
      <FakeDashboard variant="B" />
      {/* 白色补丁盖住 fixture 自带的圆角方块,再叠真圆的项目图标 */}
      <div style={{ position: 'absolute', left: CX - 24, top: CY - 24, width: 48, height: 48, background: G.card }} />
      <div style={{
        position: 'absolute', left: CX - 22, top: CY - 22, width: 44, height: 44, borderRadius: 22,
        background: `linear-gradient(150deg, ${ACC} 0%, ${ACC_DEEP} 100%)`,
        boxShadow: `${innerHighlight(0.35)}, 0 1px 2px rgba(40,44,120,0.25), 0 ${4 + (scale - 1) * 40}px ${10 + (scale - 1) * 60}px -4px rgba(60,66,180,${0.25 + (scale - 1) * 1.6})`,
        transform: `scale(${scale.toFixed(4)})`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={28} height={28} viewBox="0 0 16 16"><path d="M8.75 2 3.75 9h4l-.5 5 5-7h-4z" fill="#fff" /></svg>
      </div>
      {/* 脉冲扩散光环 */}
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
        {waves.map((w, i) => (
          <circle key={i} cx={CX} cy={CY} r={w.r} fill="none" stroke={ACC_DEEP} strokeWidth={w.w} opacity={w.o} />
        ))}
      </svg>

      {f >= 30 && (
        <>
          {/* 圈外落影:新景压在旧页之上(半径跟光圈,边缘 70px 柔化) */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(circle at ${CX}px ${CY}px, rgba(14,16,30,0) ${irisR}px, rgba(14,16,30,0.22) ${irisR + 1}px, rgba(14,16,30,0) ${irisR + 70}px)`,
          }} />
          {/* ===== 景 B:深色圆环图表页,从同一圆心以光圈长出 ===== */}
          <div style={{
            position: 'absolute', left: 0, top: 0, width: 1920, height: 1080,
            clipPath: `circle(${irisR}px at ${CX}px ${CY}px)`,
          }}>
            <Backdrop tone="dark" light={{ x: CX / 1920, y: CY / 1080 }} accent={ACC} />
            {/* 圆环 donut:圆心与图标严格同点 */}
            <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              <defs>
                <linearGradient id="cmi-arc" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a6acff" />
                  <stop offset="100%" stopColor={ACC_DEEP} />
                </linearGradient>
                <radialGradient id="cmi-head">
                  <stop offset="0%" stopColor="#c9ccff" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#c9ccff" stopOpacity={0} />
                </radialGradient>
              </defs>
              {/* 底轨 */}
              <circle cx={CX} cy={CY} r={ringR} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={ringW} />
              {/* sweep 弧,从正上方起 */}
              <circle
                cx={CX} cy={CY} r={ringR} fill="none" stroke="url(#cmi-arc)"
                strokeWidth={ringW} strokeLinecap="round"
                strokeDasharray={`${sweep * circ} ${circ}`}
                transform={`rotate(-90 ${CX} ${CY})`}
              />
              {/* 弧头柔光 */}
              {sweep > 0.01 && <circle cx={hx} cy={hy} r={ringW * 1.3} fill="url(#cmi-head)" />}
            </svg>
            {/* 中央大数字(随 sweep 同步计数) */}
            <div style={{
              position: 'absolute', left: CX - 150, top: CY - 80, width: 300, height: 160,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              opacity: numOpacity, fontFamily: FONT.sans,
            }}>
              <div style={{ fontWeight: 700, fontSize: 92, color: '#f1f1f4', letterSpacing: tracking(92), lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {num}<span style={{ fontSize: 52, fontWeight: 600, color: 'rgba(241,241,244,0.6)', marginLeft: 2 }}>%</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 22, fontWeight: 500, color: 'rgba(241,241,244,0.56)', letterSpacing: tracking(22) }}>cache hit rate</div>
            </div>
            {/* 右侧页面家具:项目页标题 + 说明 + 三枚指标卡,证明这是一整页 */}
            <div style={{ position: 'absolute', left: 680, top: 236, display: 'flex', flexDirection: 'column', fontFamily: FONT.sans }}>
              <div style={{ opacity: furn(0), display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  height: 34, padding: '0 14px', borderRadius: 17, display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(124,132,244,0.16)', color: '#b9bdff', fontSize: 18, fontWeight: 600,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: '#8ee0b0', boxShadow: '0 0 8px rgba(142,224,176,0.7)' }} />
                  Live · Platform
                </div>
              </div>
              <div style={{ opacity: furn(0), marginTop: 20, fontSize: 64, fontWeight: 700, color: '#f3f3f6', letterSpacing: tracking(64), lineHeight: 1.04 }}>
                Edge cache rollout
              </div>
              <div style={{ opacity: furn(1), marginTop: 18, fontSize: 30, color: 'rgba(243,243,246,0.58)', letterSpacing: tracking(30), lineHeight: 1.35, maxWidth: 820 }}>
                Static assets now resolve at the nearest edge. Origin load is down by a third since launch.
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 52, opacity: furn(2) }}>
                {STATS.map((s, i) => (
                  <div key={i} style={{
                    width: 256, height: 158, borderRadius: 16, padding: '22px 24px', boxSizing: 'border-box',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.035))',
                    border: hairline(0.09, 'dark'), boxShadow: `${innerHighlight(0.07)}, 0 18px 40px -16px rgba(0,0,0,0.6)`,
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ fontSize: 19, fontWeight: 500, color: 'rgba(243,243,246,0.55)', letterSpacing: tracking(19) }}>{s.k}</div>
                    <div style={{ marginTop: 'auto', fontSize: 42, fontWeight: 650, color: '#f3f3f6', letterSpacing: tracking(42), lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                    <div style={{ marginTop: 10, fontSize: 18, fontWeight: 500, color: i === 2 ? 'rgba(243,243,246,0.45)' : '#8ee0b0', fontVariantNumeric: 'tabular-nums' }}>{s.d}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* 下方分区面板:各区域命中率,把整页版式撑满 */}
            <div style={{
              position: 'absolute', left: 120, top: 760, width: 1376, height: 152, borderRadius: 18, boxSizing: 'border-box',
              padding: '26px 32px', opacity: furn(3), fontFamily: FONT.sans,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))',
              border: hairline(0.08, 'dark'), boxShadow: `${innerHighlight(0.06)}, 0 24px 50px -20px rgba(0,0,0,0.6)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#ececf1', letterSpacing: tracking(22) }}>Hit rate by region</div>
                <div style={{ marginLeft: 'auto', fontSize: 18, color: 'rgba(243,243,246,0.45)' }}>Last 7 days</div>
              </div>
              <div style={{ display: 'flex', gap: 28, marginTop: 30 }}>
                {REGIONS.map(([code, v], i) => (
                  <div key={code} style={{ flex: 1 }}>
                    <div style={{ display: 'flex', fontSize: 19, fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontFamily: FONT.mono, fontWeight: 600, color: 'rgba(243,243,246,0.7)', letterSpacing: '0.04em' }}>{code}</span>
                      <span style={{ marginLeft: 'auto', color: '#f3f3f6', fontWeight: 600 }}>{Math.round(v * 100)}%</span>
                    </div>
                    <div style={{ marginTop: 14, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <div style={{ width: `${v * 100}%`, height: '100%', borderRadius: 4, background: i === 0 ? `linear-gradient(90deg, ${ACC_DEEP}, #a6acff)` : 'rgba(166,172,255,0.42)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* 光圈边缘细受光环 */}
          {rimO > 0.01 && (
            <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
              <circle cx={CX} cy={CY} r={irisR} fill="none" stroke="#c9ccff" strokeWidth={1.5} opacity={rimO} />
            </svg>
          )}
        </>
      )}
    </div>
  );
};
