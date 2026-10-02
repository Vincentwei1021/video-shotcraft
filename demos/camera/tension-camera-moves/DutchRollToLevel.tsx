// 斜角滚正（dutch-roll-to-level）——痛点段整帧斜着悬，解决方案一拍带单次过冲滚回水平。
//
// 第二轮重设计（porcelain · 冷白 + 钴蓝，痛点红只作状态语义色）：
// - 主体是一块为镜头设计的事故面板（1320×700，占画宽 69%）：api-gateway 的 p99 延迟 168px 大数字、
//   一条实时延迟曲线、三格状态。痛点段：数字 2,840 ms 红、曲线在 SLO 虚线上方锯齿乱跳（实时滚动）、
//   状态「Major outage」红点脉冲。
// - "世界"是一张坐标纸：面板下面铺满一层细网格（比画面大一圈，旋转不露边）。-10° 时网格和画框明显
//   错位——观众不用读字就知道"歪了"；滚正后网格与画框严丝合缝，"世界被扶正"是字面意义的。
// - 滚正一拍（66f）：先往斜里再压 0.6°（6f 预备）→ 13f 冲过 0 到 +1.2° → 11f 收回 0（单次过冲）。
//   跟随与重叠：父（整帧）先转，子晚 2–4f——大数字 4f 后开始回落到 184 ms（与曲线愈合同步） 并由红转墨，
//   曲线从左到右一个波次"愈合"到 SLO 线下（每点错峰 0.3f），延迟跌破 SLO 的那一帧状态胶囊带过冲换成「Operational」，
//   标题句先 ease-in 上移出场、再逐词升起新句。
// - 情绪光：斜置期屏幕空间叠一层暖红暗角（不适感），滚正后随之散去，换成冷白顶光。
//
// 时间表（30fps，共 150f）：
//   0–60    斜置 -10° + ±0.8° 长周期漂移 + 2px 纵漂；曲线实时乱跳、状态点脉冲（读痛点 2s）
//   60–66   预备：再压 0.6°
//   66–79   滚正冲过头到 +1.2°（snappy）；scale 1.08→1.00 同步
//   79–90   收回 0（smooth），90f 完全水平
//   68–96   内容跟随：数字回落 / 曲线愈合 / 状态切换 / 新标题
//   96–150  hold：极缓推近 1.00→1.015，干净落定
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, ramp, mix } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const DUTCH_ROLL_TO_LEVEL_DURATION = 150;

const L = LOOKS.porcelain;
const RED = '#e5484d'; // 痛点语义色（只在斜置段出现）
const ROLL = 66; // 滚正起拍
const OVER = ROLL + 13; // 过冲顶点
const LEVEL = 90; // 完全归位
const WIND = 6; // 预备帧数

const PANEL = { w: 1320, h: 700, x: 300, y: 262 };
const CHART = { w: 660, h: 300 };
const N = 56; // 曲线采样点

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// 平滑噪声（确定性）
const noise = (x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return mix(hash(i), hash(i + 1), u);
};

// 延迟 → 图表 y（平方根刻度，低值区不被压扁）
const lerpHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((sh) => Math.round(mix((pa >> sh) & 255, (pb >> sh) & 255, Math.min(1, Math.max(0, t)))));
  return `rgb(${c.join(',')})`;
};
const yOf = (ms: number) => CHART.h * (1 - Math.sqrt(Math.min(3200, Math.max(0, ms)) / 3200));

// 痛点值：实时滚动的锯齿（两层噪声 + 尖峰）
const painMs = (j: number, f: number) => {
  const x = j * 0.42 + f * 0.22;
  const spike = Math.pow(noise(x * 1.7 + 9), 3) * 1500;
  return 900 + noise(x) * 1100 + spike;
};
// 健康值：贴着 180ms 的平缓起伏
const okMs = (j: number, f: number) => 168 + 26 * Math.sin(j * 0.35 + f * 0.04) + 14 * noise(j * 0.8 + 3);

const latencyAt = (f: number) => {
  // 2,840 附近实时抖动 → 滚正后 expo 回落到 184
  const live = 2840 + Math.round((noise(f * 0.18) - 0.5) * 120);
  const k = ramp(f, ROLL + 4, 28, EASE.out); // 与曲线愈合波次同步（波次 ROLL+4 → ROLL+34）
  return Math.round(mix(live, 184, k));
};

// 状态切换帧 = 延迟第一次跌破 SLO 的那一帧（状态与数字不互相矛盾）
const CHIP_AT = (() => {
  for (let f = ROLL; f < 150; f++) if (latencyAt(f) < 400) return f;
  return ROLL + 20;
})();

const Chip: React.FC<{ ok: number; f: number }> = ({ ok, f }) => {
  // ok：0 痛点 / 1 已恢复；换态时带一次过冲
  const pop = ok > 0 && ok < 1 ? 1 + 0.08 * Math.sin(ok * Math.PI) : 1;
  const pulse = 0.5 + 0.5 * Math.sin(f / 4);
  const col = ok < 0.5 ? RED : L.accent2;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 22px 12px 18px', borderRadius: 999,
      background: alpha(col, 0.1), boxShadow: `inset 0 0 0 1.5px ${alpha(col, 0.28)}`, transform: `scale(${pop})`,
    }}>
      <div style={{ position: 'relative', width: 14, height: 14 }}>
        {ok < 0.5 && <div style={{ position: 'absolute', inset: -8 * pulse, borderRadius: 99, background: alpha(RED, 0.25 * (1 - pulse)) }} />}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 7, background: col }} />
      </div>
      <div style={{ ...type(30, 650), color: ok < 0.5 ? '#b4232a' : '#007d6c' }}>{ok < 0.5 ? 'Major outage' : 'Operational'}</div>
    </div>
  );
};

export const DutchRollToLevel: React.FC = () => {
  const f = useCurrentFrame();

  // —— 相机滚转 ——
  const driftT = Math.min(f, ROLL);
  const driftFade = 1 - ramp(f, ROLL, 8, EASE.out);
  const driftRot = Math.sin(driftT * 0.035) * 0.8 * driftFade;
  const driftY = Math.sin(driftT * 0.05) * 2 * driftFade;
  const wind = -0.6 * ramp(f, ROLL - WIND, WIND, EASE.smooth);
  const baseRot =
    f < ROLL ? -10 + wind
      : f < OVER ? mix(-10.6, 1.2, ramp(f, ROLL, OVER - ROLL, EASE.snappy))
        : mix(1.2, 0, ramp(f, OVER, LEVEL - OVER, EASE.smooth));
  const rot = baseRot + driftRot;
  const scale = mix(1.08, 1, ramp(f, ROLL, LEVEL - ROLL, EASE.swift)) * mix(1, 1.015, ramp(f, LEVEL + 6, 150 - LEVEL - 6, EASE.smooth));

  // —— 内容跟随 ——
  const ms = latencyAt(f);
  const heal = ramp(f, ROLL + 4, 28, EASE.out); // 红 → 墨（与数字同曲线）
  const chipK = ramp(f, CHIP_AT, 10, EASE.out);
  const unease = 1 - ramp(f, ROLL, LEVEL - ROLL, EASE.smooth);
  const oldOut = ramp(f, ROLL, 8, EASE.exit);

  // 曲线：每点愈合进度从左到右错峰
  const hks = Array.from({ length: N }, (_, j) => ramp(f, ROLL + 4 + j * 0.3, 14, EASE.snappy));
  const pts = hks.map((hk, j) => {
    const v = mix(painMs(j, Math.min(f, ROLL + 4 + j * 0.3)), okMs(j, f), hk);
    return [(j / (N - 1)) * CHART.w, yOf(v)] as const;
  });
  // 痛点残影：滚正那一刻的曲线留成一道淡红虚影（"刚才有多糟"的证词）
  const ghost = Array.from({ length: N }, (_, j) => `${j ? 'L' : 'M'}${((j / (N - 1)) * CHART.w).toFixed(1)} ${yOf(painMs(j, ROLL + 4 + j * 0.3)).toFixed(1)}`).join(' ');
  const ghostA = 0.22 * ramp(f, ROLL + 10, 16, EASE.out);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${CHART.w} ${CHART.h} L0 ${CHART.h} Z`;
  const lastHk = hks[N - 1];
  const lineCol = lerpHex(RED, L.accent, lastHk); // 末端圆点与面积色跟着最后一点走
  const sloY = yOf(400);
  const underSlo = ms < 400;

  const errRate = mix(12.4, 0.02, heal);
  const regions = heal > 0.75 ? 3 : heal > 0.4 ? 2 : 1;

  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans, overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.0 }} fill={{ x: 0.85, y: 0.95 }} />

      {/* —— 世界（整帧滚转）—— */}
      <div style={{
        position: 'absolute', inset: 0, transformOrigin: '50% 52%',
        transform: `translateY(${driftY.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`,
      }}>
        {/* 坐标纸：比画面大一圈，旋转不露边；中心实、四周淡 */}
        <div style={{
          position: 'absolute', left: -360, top: -360, right: -360, bottom: -360,
          backgroundImage:
            `linear-gradient(${alpha(L.ink, 0.07)} 1.5px, transparent 1.5px), linear-gradient(90deg, ${alpha(L.ink, 0.07)} 1.5px, transparent 1.5px),` +
            `linear-gradient(${alpha(L.ink, 0.035)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(L.ink, 0.035)} 1px, transparent 1px)`,
          backgroundSize: '160px 160px, 160px 160px, 40px 40px, 40px 40px',
          backgroundPosition: '-1px -1px, -1px -1px, -1px -1px, -1px -1px',
          WebkitMaskImage: 'radial-gradient(ellipse 50% 52% at 50% 50%, #000 30%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 50% 52% at 50% 50%, #000 30%, transparent 100%)',
        }} />

        {/* 标题句：旧句出场 / 新句逐词升起 */}
        <div style={{ position: 'absolute', left: PANEL.x + 4, top: PANEL.y - 112, height: 80, width: PANEL.w }}>
          {oldOut < 1 && (
            <div style={{ position: 'absolute', inset: 0, ...type(64, 700), color: L.ink, opacity: 1 - oldOut, transform: `translateY(${(-24 * oldOut).toFixed(1)}px)` }}>
              Checkout is timing out.
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, ...type(64, 700), color: L.ink }}>
            <TextReveal text="Rolled back in one click." by="word" variant="rise" start={ROLL + 8} each={16} gap={3} />
          </div>
        </div>

        {/* 面板 */}
        <div style={{
          position: 'absolute', left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, boxSizing: 'border-box',
          borderRadius: 28, background: `linear-gradient(180deg, #ffffff 0%, ${L.surface2} 100%)`,
          border: `1px solid ${L.line}`,
          boxShadow: `inset 0 1px 0 #fff, 0 2px 4px ${alpha(L.shadow, 0.06)}, 0 40px 90px -20px ${alpha(L.shadow, 0.28)}`,
          padding: '40px 56px', overflow: 'hidden',
        }}>
          {/* 头部 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: L.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={30} height={30} viewBox="0 0 30 30">
                <path d="M5 9 H25 M5 15 H25 M5 21 H25" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" />
                <circle cx={10} cy={9} r={2.6} fill={L.accent} />
                <circle cx={19} cy={15} r={2.6} fill="#fff" />
                <circle cx={13} cy={21} r={2.6} fill="#fff" />
              </svg>
            </div>
            <div style={{ ...type(40, 700), color: L.ink }}>api-gateway</div>
            <div style={{ ...type(40, 450), color: L.ink3 }}>/ production</div>
            <div style={{ marginLeft: 'auto' }}><Chip ok={chipK} f={f} /></div>
          </div>
          <div style={{ height: 1, background: L.line, margin: '34px -56px 0' }} />

          <div style={{ display: 'flex', marginTop: 40, gap: 64 }}>
            {/* 左：大数字 */}
            <div style={{ width: 480 }}>
              <div style={{ ...type(24, 650, { caps: true }), letterSpacing: '0.16em', color: L.ink3 }}>p99 latency</div>
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 10 }}>
                <div style={{ ...type(168, 750), letterSpacing: '-0.05em', color: heal < 1 ? `color-mix(in srgb, ${RED} ${(100 - heal * 100).toFixed(1)}%, ${L.ink})` : L.ink }}>
                  {ms.toLocaleString('en-US')}
                </div>
                <div style={{ ...type(56, 600), color: L.ink3, marginLeft: 12 }}>ms</div>
              </div>
              <div style={{
                marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 12,
                background: alpha(!underSlo ? RED : L.accent2, 0.1), color: !underSlo ? '#b4232a' : '#007d6c', ...type(30, 600),
              }}>
                {!underSlo ? `▲ ${(ms / 400).toFixed(1)}× over SLO` : '▼ Back under SLO'}
              </div>
            </div>
            {/* 右：曲线 */}
            <div style={{ position: 'relative', width: CHART.w, height: CHART.h, marginTop: 6 }}>
              {[100, 1000, 3000].map((v) => (
                <div key={v} style={{ position: 'absolute', left: 0, right: 0, top: yOf(v), height: 1, background: L.line }} />
              ))}
              <svg width={CHART.w} height={CHART.h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                <defs>
                  <linearGradient id="drlArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={lineCol} stopOpacity={0.18} />
                    <stop offset="1" stopColor={lineCol} stopOpacity={0} />
                  </linearGradient>
                  {/* 描边按每点愈合进度着色：愈合波次从左到右，红 → 钴蓝 */}
                  <linearGradient id="drlStroke" x1="0" y1="0" x2={CHART.w} y2="0" gradientUnits="userSpaceOnUse">
                    {hks.map((hk, j) => <stop key={j} offset={j / (N - 1)} stopColor={lerpHex(RED, L.accent, hk)} />)}
                  </linearGradient>
                </defs>
                <path d={area} fill="url(#drlArea)" />
                <line x1={0} x2={CHART.w} y1={sloY} y2={sloY} stroke={L.ink2} strokeWidth={2} strokeDasharray="8 8" opacity={0.6} />
                {ghostA > 0.001 && <path d={ghost} fill="none" stroke={RED} strokeWidth={2.5} strokeLinejoin="round" opacity={ghostA} />}
                <path d={line} fill="none" stroke="url(#drlStroke)" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={pts[N - 1][0]} cy={pts[N - 1][1]} r={8} fill={lineCol} stroke="#fff" strokeWidth={3} />
              </svg>
              <div style={{ position: 'absolute', left: 0, top: sloY - 34, ...type(22, 600, { caps: true }), letterSpacing: '0.12em', color: L.ink3 }}>SLO 400 ms</div>
            </div>
          </div>

          {/* 底部三格 */}
          <div style={{ position: 'absolute', left: 56, right: 56, bottom: 40, display: 'flex', gap: 20 }}>
            {[
              ['Error rate', `${errRate.toFixed(errRate < 1 ? 2 : 1)}%`, heal < 0.5],
              ['Requests', '48.2k/s', false],
              ['Regions healthy', `${regions} / 3`, regions < 3],
            ].map(([k, v, bad]) => (
              <div key={k as string} style={{
                flex: 1, padding: '20px 26px', borderRadius: 18, background: L.surface2, boxShadow: `inset 0 0 0 1px ${L.line}`,
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              }}>
                <div style={{ ...type(28, 500), color: L.ink2 }}>{k as string}</div>
                <div style={{ ...type(40, 700), color: bad ? '#b4232a' : L.ink }}>{v as string}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 斜置期不适感：暖红暗角（屏幕空间，不随画面转），滚正时散去 */}
      {unease > 0.001 && (
        <AbsoluteFill style={{
          pointerEvents: 'none', opacity: unease,
          background: `radial-gradient(ellipse 72% 70% at 50% 50%, ${alpha('#7a2a1c', 0)} 48%, ${alpha('#7a2a1c', 0.2)} 100%)`,
        }} />
      )}
    </AbsoluteFill>
  );
};
