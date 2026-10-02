// 三级跳切推近（jump-cut-punch-in）——节奏剪辑｜戈达尔跳切 / 纪录片 punch-in。
//
// 第二轮重设计（暖黑 · 事故回放取证）：
// - look = ember。主体是一张铺满画面的「结账接口 p99 延迟 · 24 小时」折线图（虚构监控产品 Pyrite Observe），
//   全天平稳的暖灰细线里只有 03:12 一根橙色尖峰——全片唯一的强调色。
// - 手法：同一 origin（钉在尖峰 + 注释的组合中心）三挡零补间硬切 1.0× → 1.6× → 2.6×。每一跳都"多给一层信息"
//   （语义缩放）：1.0× 只看到一个脉冲红点 "有东西"；1.6× 亮出异常时段色带 + 标签 "再近点"；
//   2.6× 露出逐个采样点 + 读数注释卡 "就是它"。挡位倍率走 CSS zoom（布局级缩放，2.6× 字边与线条仍锐，Q2）。
// - 镜头外 HUD（不随缩放）：四角取景框、左上 REPLAY 时间码逐帧走、右上大号倍率读数 1.0× / 1.6× / 2.6×——
//   观众不用猜"是不是丢帧"，倍率读数本身就是跳切的 tick；每跳 2f 整画面压暗脉冲 + 读数 pop。
//
// 时间表（30fps，共 150f）：
//   0–26    预备：网格、坐标、标题已在；折线 26f 从左向右画出（ease-out），~13f 画到尖峰时红点 ping
//   0–40    1.0× 全景，挡内 1.2% in-out 漂移（活镜头）
//   40      硬切 1.6×（40–41 压暗 0.8）；异常色带 10f 由中间向两侧展开、标签升起
//   80      硬切 2.6×（80–81 压暗 0.8）；采样点 6f 错峰点亮 → 引线 84–96 画出 → 注释卡 88–104 升起、数值滚到 2,140
//   104–150 hold 46f：末挡 1.5% ease-out 极缓推进到 140f 后定住
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, glowFilter, type } from '../../_fixtures/Look';

export const JUMP_CUT_PUNCH_IN_DURATION = 150; // 40f 全景 + 40f 中景 + 70f 末挡（含 46f hold）

const L = LOOKS.ember;

// ───────────── 图表几何（1920×1080 基准坐标，随 zoom 一起放大） ─────────────
const CX0 = 160;
const CX1 = 1760;
const CY_BOT = 800; // 0 ms 基线
const PX_PER_MS = 0.128; // 3000 ms 满量程 ≈ 384px（按 2.6× 末挡构图反推：尖峰 ×2.6 后正好占画面高 60%）
const N = 289; // 24h × 5min 采样 + 1
const SPIKE = 110; // 18:00 起第 110 个采样 = 03:10（尖峰顶点）
const xAt = (i: number) => CX0 + ((CX1 - CX0) * i) / (N - 1);
const yAt = (ms: number) => CY_BOT - ms * PX_PER_MS;

const hash = (n: number) => {
  const x = Math.sin(n * 91.345 + 47.853) * 43758.5453;
  return x - Math.floor(x);
};
// 尖峰形状：3 个采样冲上去、7 个采样衰减回来（真实事故的"急升缓降"）
const SPIKE_SHAPE: Record<number, number> = { [-2]: 460, [-1]: 1240, 0: 2140, 1: 1780, 2: 1290, 3: 900, 4: 640, 5: 450, 6: 330 };
const msAt = (i: number) => {
  const d = i - SPIKE;
  if (SPIKE_SHAPE[d] !== undefined) return SPIKE_SHAPE[d];
  // 平稳段：日内起伏（白天高、凌晨低）+ 采样噪声
  const day = 190 + 46 * Math.sin(((i - 40) / (N - 1)) * Math.PI * 2) + 18 * Math.sin(i / 7.3);
  return day + (hash(i) - 0.5) * 44;
};
const PTS = Array.from({ length: N }, (_, i) => [xAt(i), yAt(msAt(i))] as const);
const LINE_D = PTS.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const SPIKE_D = PTS.slice(SPIKE - 3, SPIKE + 8).map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const AREA_D = `${LINE_D} L${CX1} ${CY_BOT} L${CX0} ${CY_BOT} Z`;
const PEAK_X = xAt(SPIKE);
const PEAK_Y = yAt(2140);

// ───────────── 跳切 ─────────────
// origin 按末挡构图反推：screen = O + (base − O)·2.6，令尖峰落在屏上 (620, 220)、基线落在 ≈865
const ORIGIN_X = 865;
const ORIGIN_Y = 717;
const J1 = 40;
const J2 = 80;
const STEPS = [1.0, 1.6, 2.6]; // 挡差 ≥1.5×，否则读作画面抖了一下
const stepAt = (f: number) => (f < J1 ? 0 : f < J2 ? 1 : 2);
const driftAt = (f: number) => {
  const st = stepAt(f);
  if (st === 0) return mix(1, 1.012, ramp(f, 0, J1, EASE.smooth));
  if (st === 1) return mix(1, 1.012, ramp(f, J1, J2 - J1, EASE.smooth));
  return mix(1, 1.015, ramp(f, J2, 60, EASE.out));
};
const pulseAt = (f: number) => ((f >= J1 && f <= J1 + 1) || (f >= J2 && f <= J2 + 1) ? 0.8 : 1);

const HOURS = ['18:00', '21:00', '00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00'];
const GRID_MS = [500, 1000, 1500, 2000, 2500, 3000];
const SLO = 800; // SLO 阈值线

// 时间码：回放从 03:09:58:00 起逐帧走（30fps）
const timecode = (f: number) => {
  const total = (3 * 3600 + 9 * 60 + 58) * 30 + f;
  const ff = total % 30;
  const s = Math.floor(total / 30);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(ff)}`;
};

// 四角取景框
const Corners: React.FC<{ inset: number; len: number; color: string }> = ({ inset, len, color }) => (
  <>
    {[0, 1, 2, 3].map((k) => {
      const right = k % 2 === 1;
      const bottom = k >= 2;
      return (
        <div key={k} style={{
          position: 'absolute', width: len, height: len,
          left: right ? undefined : inset, right: right ? inset : undefined,
          top: bottom ? undefined : inset, bottom: bottom ? inset : undefined,
          borderLeft: right ? undefined : `2px solid ${color}`, borderRight: right ? `2px solid ${color}` : undefined,
          borderTop: bottom ? undefined : `2px solid ${color}`, borderBottom: bottom ? `2px solid ${color}` : undefined,
        }} />
      );
    })}
  </>
);

export const JumpCutPunchIn: React.FC = () => {
  const frame = useCurrentFrame();
  const st = stepAt(frame);
  const s = STEPS[st];
  const drift = driftAt(frame);
  const b = pulseAt(frame);

  // 折线画出：0–26f ease-out（pathLength 归一化）
  const draw = ramp(frame, 0, 26, EASE.out);
  const spikeDrawn = draw >= (PEAK_X - CX0) / (CX1 - CX0);
  // 1.0× 层：红点在尖峰画出的那一帧 ping 一次（扩散环 18f）
  const pingStart = 13;
  const ping = ramp(frame, pingStart, 18, EASE.out);
  // 1.6× 层：异常色带由中间展开 + 标签
  const band = ramp(frame, J1, 10, EASE.snappy);
  const bandLabel = ramp(frame, J1 + 4, 12, EASE.snappy);
  // 2.6× 层：采样点错峰点亮、引线、注释卡、数值滚动
  const lead = ramp(frame, J2 + 4, 12, EASE.out);
  const card = ramp(frame, J2 + 8, 16, EASE.snappy);
  const valueT = ramp(frame, J2 + 8, 18, EASE.snappy);
  const value = Math.round(2140 * valueT);

  // 倍率读数 pop：每跳 6f 内 1.18 → 1
  const lastJump = st === 0 ? -100 : st === 1 ? J1 : J2;
  const pop = mix(1.18, 1, ramp(frame, lastJump, 7, EASE.out));

  // 卡片在 2.6× 下的基准几何（屏上 ×2.6）
  const CARD_L = 825;
  const CARD_T = 537;

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.42, y: 0.22 }} fill={{ x: 0.9, y: 0.95 }} vignette={[0.45, 0.55, 0.62][st]} />

      {/* ───── 被跳切的画面：外层 transform 做挡内漂移，内层 zoom 做挡位 ───── */}
      <div style={{
        position: 'absolute', inset: 0,
        filter: b < 1 ? `brightness(${b})` : undefined,
        transform: `scale(${drift.toFixed(5)})`, transformOrigin: `${ORIGIN_X}px ${ORIGIN_Y}px`,
      }}>
        <div style={{
          position: 'absolute', width: 1920, height: 1080, zoom: s,
          // zoom 连自身 left/top 一起放大：left = O/s − O ⇒ origin 在屏上不动（同 origin 跳切）
          left: ORIGIN_X / s - ORIGIN_X, top: ORIGIN_Y / s - ORIGIN_Y,
        }}>
          {/* 标题区 */}
          <div style={{ position: 'absolute', left: CX0, top: 150 }}>
            <div style={{ ...type(22, 600, { caps: true }), color: L.accent, letterSpacing: '0.18em' }}>Checkout API · us-east-2</div>
            <div style={{ ...type(64, 700), color: L.ink, marginTop: 14 }}>p99 latency, last 24 hours</div>
          </div>
          <div style={{ position: 'absolute', right: 1920 - CX1, top: 182, textAlign: 'right' }}>
            <div style={{ ...type(22, 600, { caps: true }), color: L.ink3, letterSpacing: '0.14em' }}>Median</div>
            <div style={{ ...type(44, 600), color: L.ink2, marginTop: 6 }}>212 ms</div>
          </div>

          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <defs>
              <linearGradient id="jcpArea" x1="0" y1={yAt(600)} x2="0" y2={CY_BOT} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={L.ink} stopOpacity={0.09} />
                <stop offset="1" stopColor={L.ink} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="jcpSpikeFill" x1="0" y1={PEAK_Y} x2="0" y2={CY_BOT} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={L.accent} stopOpacity={0.4} />
                <stop offset="1" stopColor={L.accent} stopOpacity={0} />
              </linearGradient>
              <clipPath id="jcpDraw">
                <rect x={CX0 - 10} y={0} width={(CX1 - CX0) * draw + 10} height={1080} />
              </clipPath>
            </defs>

            {/* 网格 + 纵轴刻度（1.0× 下是纹理，2.6× 下可读） */}
            {GRID_MS.map((ms) => (
              <g key={ms}>
                <line x1={CX0} x2={CX1} y1={yAt(ms)} y2={yAt(ms)} stroke={alpha(L.ink, 0.07)} strokeWidth={1} />
                <text x={CX0 + 6} y={yAt(ms) - 8} fill={L.ink3} fontSize={15} fontFamily={FONT.mono}>{ms.toLocaleString('en-US')} ms</text>
              </g>
            ))}
            <line x1={CX0} x2={CX1} y1={CY_BOT} y2={CY_BOT} stroke={alpha(L.ink, 0.22)} strokeWidth={1.2} />
            {/* SLO 阈值虚线：1.0× 下是一道细纹理，2.6× 下成为右半画面的结构线 */}
            <line x1={CX0} x2={CX1} y1={yAt(SLO)} y2={yAt(SLO)} stroke={alpha(L.accent2, 0.5)} strokeWidth={1.2} strokeDasharray="6 6" />
            <text x={1225} y={yAt(SLO) - 10} fill={L.accent2} fontSize={14} fontFamily={FONT.mono} textAnchor="end" letterSpacing="0.08em">SLO 800 ms</text>
            {HOURS.map((h, i) => {
              const x = CX0 + ((CX1 - CX0) * i) / 8;
              return (
                <g key={i}>
                  <line x1={x} x2={x} y1={CY_BOT} y2={CY_BOT + 10} stroke={alpha(L.ink, 0.3)} strokeWidth={1.2} />
                  <text x={x} y={CY_BOT + 38} fill={L.ink3} opacity={st === 2 ? 0 : 1} fontSize={20} fontFamily={FONT.mono} textAnchor="middle">{h}</text>
                </g>
              );
            })}

            {/* 1.6× 层：异常时段色带（02:55–03:45） */}
            {st >= 1 && (
              <g>
                <rect
                  x={mix(PEAK_X, xAt(SPIKE - 3), band)} y={yAt(2900)}
                  width={mix(0, xAt(SPIKE + 7) - xAt(SPIKE - 3), band)} height={CY_BOT - yAt(2900)}
                  fill={alpha(L.accent, 0.08)}
                />
                <line x1={xAt(SPIKE - 3)} x2={xAt(SPIKE - 3)} y1={yAt(2900)} y2={CY_BOT} stroke={alpha(L.accent, 0.45 * band)} strokeWidth={1} strokeDasharray="4 4" />
                <line x1={xAt(SPIKE + 7)} x2={xAt(SPIKE + 7)} y1={yAt(2900)} y2={CY_BOT} stroke={alpha(L.accent, 0.45 * band)} strokeWidth={1} strokeDasharray="4 4" />
              </g>
            )}

            <g clipPath="url(#jcpDraw)">
              <path d={AREA_D} fill="url(#jcpArea)" />
              <path d={LINE_D} fill="none" stroke={L.ink2} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {/* 尖峰段：强调色 + 填充 + 泛光（全片唯一的橙） */}
              <path d={`${SPIKE_D} L${xAt(SPIKE + 7)} ${CY_BOT} L${xAt(SPIKE - 3)} ${CY_BOT} Z`} fill="url(#jcpSpikeFill)" />
              <path d={SPIKE_D} fill="none" stroke={L.accent} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" style={{ filter: glowFilter(L.accent, 0.7) }} />
            </g>

            {/* 1.0× 层：红点 + 一次扩散 ping */}
            {spikeDrawn && st === 0 && (
              <g>
                <circle cx={PEAK_X} cy={PEAK_Y} r={mix(8, 46, ping)} fill="none" stroke={L.accent} strokeWidth={2} opacity={1 - ping} />
                <circle cx={PEAK_X} cy={PEAK_Y} r={7} fill={L.accent} />
              </g>
            )}

            {/* 2.6× 层：逐个采样点（6f 错峰点亮） */}
            {st === 2 &&
              Array.from({ length: 11 }, (_, k) => {
                const i = SPIKE - 4 + k;
                const p = ramp(frame, J2 + 1 + Math.abs(i - SPIKE) * 0.8, 6, EASE.overshoot);
                const hot = i >= SPIKE - 2 && i <= SPIKE + 5;
                return (
                  <circle key={i} cx={PTS[i][0]} cy={PTS[i][1]} r={(i === SPIKE ? 5 : 3.2) * p}
                    fill={hot ? L.accent : L.ink2} stroke={L.bg[2]} strokeWidth={1.2} />
                );
              })}
            {st === 2 && (
              <path
                d={`M${PEAK_X + 6} ${PEAK_Y + 3} L${CARD_L - 12} ${CARD_T + 22} L${CARD_L} ${CARD_T + 22}`}
                fill="none" stroke={L.accent} strokeWidth={1.4} pathLength={1} strokeDasharray={`${lead} 1`}
              />
            )}
          </svg>

          {/* 1.6× 层：色带标签 */}
          {st >= 1 && (
            <div style={{
              position: 'absolute', left: xAt(SPIKE - 3), top: yAt(2900) - 30,
              ...type(16, 700, { caps: true }), letterSpacing: '0.16em', color: L.accent,
              opacity: bandLabel * (st === 2 ? 0 : 1), transform: `translateY(${mix(8, 0, bandLabel)}px)`,
            }}>
              Anomaly · 02:55–03:45
            </div>
          )}

          {/* 2.6× 层：读数注释卡（基准 230×116 → 屏上 ≈600×300） */}
          {st === 2 && (
            <div style={{
              position: 'absolute', left: CARD_L, top: CARD_T, width: 236, padding: '12px 14px 13px',
              borderRadius: 8, background: alpha(L.surface2, 0.92), border: `1px solid ${alpha(L.accent, 0.45)}`,
              boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.06)}, 0 12px 30px -10px ${alpha(L.shadow, 0.9)}, 0 0 24px -6px ${alpha(L.accent, 0.35)}`,
              opacity: card, transform: `translateY(${mix(10, 0, card)}px)`,
            }}>
              <div style={{ ...type(10, 700, { caps: true }), letterSpacing: '0.18em', color: L.accent }}>p99 · 03:10:00</div>
              <div style={{ ...type(46, 800), color: L.ink, marginTop: 4, letterSpacing: '-0.035em' }}>
                {value.toLocaleString('en-US')}<span style={{ fontSize: 22, fontWeight: 600, color: L.ink2, marginLeft: 5, letterSpacing: 0 }}>ms</span>
              </div>
              <div style={{ ...type(13, 500), color: L.ink2, marginTop: 4 }}>
                <span style={{ color: L.accent, fontWeight: 700 }}>10.1×</span> baseline · pool exhausted
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───── HUD（镜头外，不随缩放） ───── */}
      <Corners inset={56} len={40} color={alpha(L.ink, 0.5)} />
      <div style={{ position: 'absolute', left: 104, top: 70, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: L.accent, boxShadow: `0 0 14px ${alpha(L.accent, 0.8)}`, opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0.35 }} />
        <div style={{ ...type(26, 700, { caps: true }), letterSpacing: '0.2em', color: L.ink }}>Replay</div>
        <div style={{ ...type(30, 500, { mono: true }), color: L.ink2 }}>{timecode(frame)}</div>
      </div>
      <div style={{ position: 'absolute', right: 104, top: 52, display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <div style={{ ...type(22, 600, { caps: true }), letterSpacing: '0.2em', color: L.ink3 }}>Zoom</div>
        <div style={{
          ...type(60, 700, { mono: true }), color: st === 2 ? L.accent : L.ink, letterSpacing: '-0.02em',
          transform: `scale(${pop.toFixed(4)})`, transformOrigin: '100% 60%',
        }}>
          {s.toFixed(1)}×
        </div>
      </div>
      <div style={{ position: 'absolute', left: 104, bottom: 72, ...type(24, 600, { caps: true }), letterSpacing: '0.2em', color: L.ink3 }}>
        Pyrite Observe · Incident 4471
      </div>
      <div style={{ position: 'absolute', right: 104, bottom: 72, display: 'flex', gap: 10 }}>
        {STEPS.map((_, k) => (
          <div key={k} style={{ width: 44, height: 6, borderRadius: 3, background: k <= st ? (k === 2 ? L.accent : L.ink) : alpha(L.ink, 0.18) }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
