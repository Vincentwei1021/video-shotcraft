// glitch-displace｜噪声置换撕裂——整页被切成 16 条不等高横条，各条在 ±70px 内高速左右错位抖动，
// 抖动最猛时硬切到下一页，再抖几帧归位。条带系撕裂：每条内容完整，读作"信号跳变"而不是"页面碎了"。
//
// 第二轮重设计（暗场发布控制台 · "上线那一下"）：
// - look = midnight（深蓝夜 · 电光蓝 · 青绿点缀），等宽技术感版式。A/B 是同一块发布控制台的两态：
//   A「Rolling out Halo 4.0」进度卡在 99%、18 个区域格亮了 17 个、日志在滚；
//   B「Halo 4.0 is live.」18/18 全亮青绿、p95 延迟大数字、三项上线指标。两页网格完全一致，
//   撕裂扫过时读作"系统状态瞬间跳变"——故障语义正好服务"上线切换"。
// - 撕裂的专业讲究：条带不等高（最窄约最宽 1/3）；按条分"能量"（约两成不动、三成满幅、其余轻颤），
//   位移值过一道指数推向两端；重影改成双色剪影（同一页内容的青绿 / 电光蓝单色副本，±12px 错开、screen 叠加），
//   挂在条带里随条一起错位——比灰阶明暗重影更"信号"；错位条上沿 1px 亮线 = 撕口切边；
//   撕裂期另有 2 根全宽扫描亮线逐帧跳位 + 信号颗粒；切点帧曝光抬升 + 整屏 1.6% 冲击放大掩护硬切。
// - 预备：30–31f 两条细条先轻颤 ±12px（前兆），进度条同时卡在 99%——观众先"感到不对"。
// - 页面底是每页自带的不透明渐变 + 点阵（条带必须不透明才不叠影）；暗角和颗粒只在最上层画一次。
//
// 时间表（30fps，共 135f）：
//   0–40    A 态：进度 86%→99%（ease-out 越走越慢），区域格逐个点亮，日志三行错峰升起；整屏极缓推进
//   30–31   前兆 2f
//   44–60   撕裂 16f：44–47 out-cubic 冲起 → 平台 → 54 硬切 B（藏在满幅抖动里）→ 54–60 线性消散归位
//   60      摘罩：条带 / 重影 / 扫描线全部条件卸载，直出裸 B
//   58–100  余波：区域格一道青绿波从左到右扫过（stagger）、p95 从 58→41ms 计数、三项指标错峰升起
//   100–135 hold 35f：整屏推进收尾，Live 信号点每 40f 一次脉冲
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, ramp } from '../../_fixtures/Polish';
import { LOOKS, alpha, glow, type } from '../../_fixtures/Look';

export const GLITCH_DISPLACE_DURATION = 135; // A 44 + 撕裂 16 + 余波/静止 75

const M = LOOKS.midnight;
const W = 1920;
const H = 1080;
const PAD = 120; // 安全边
const STRIPS = 16;
const AMP = 70; // 峰值条带错位（一眼可见的撕裂档）
const GHOST = 12; // 双色剪影错位 px
const PRE = [30, 31]; // 前兆帧
const TEAR_IN = 44;
const CUT = 54; // 硬切：满幅抖动中
const TEAR_OUT = 60; // 摘罩
const CELLS = 18;

// 库内标准伪随机
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

// 16 条不等高条带：权重 0.45–1.35 归一化到 1080，最后一条吃掉余数
const BANDS = (() => {
  const w = Array.from({ length: STRIPS }, (_, i) => 0.45 + h(i * 13 + 5) * 0.9);
  const sum = w.reduce((a, b) => a + b, 0);
  let top = 0;
  return w.map((wi, i) => {
    const hh = i === STRIPS - 1 ? H - top : Math.round((wi / sum) * H);
    const band = { top, h: hh };
    top += hh;
    return band;
  });
})();

// 每条的「能量」：约两成静止、三成满幅、其余轻颤（固定，不随帧变）
const ENERGY = BANDS.map((_, i) => {
  const r = h(i * 7 + 101);
  return r < 0.2 ? 0 : r > 0.68 ? 1 : 0.18 + r * 0.35;
});

// ───────────── 页面（A / B 两态同网格） ─────────────
// tint 给定时只画内容剪影（单色、透明底），用作撕裂重影
type Tone = { bg: boolean; ink: string; ink2: string; ink3: string; accent: string; teal: string; line: string; cell: string };
const toneOf = (tint?: string): Tone =>
  tint
    ? { bg: false, ink: tint, ink2: tint, ink3: tint, accent: tint, teal: tint, line: tint, cell: 'transparent' }
    : { bg: true, ink: M.ink, ink2: M.ink2, ink3: M.ink3, accent: M.accent, teal: M.accent2, line: M.line, cell: M.surface2 };

const LOGS = [
  { mark: '✓', region: 'eu-west-2', state: 'healthy', ms: '38 ms' },
  { mark: '✓', region: 'ap-south-1', state: 'healthy', ms: '44 ms' },
  { mark: '◌', region: 'us-east-1', state: 'draining traffic…', ms: '' },
];
const STATS = [
  { v: '99.99%', l: 'uptime during rollout' },
  { v: '0', l: 'failed requests' },
  { v: '2m 14s', l: 'global propagation' },
];

// 曲线数据（0–1，越大越高）
const TRAFFIC = [0.02, 0.03, 0.05, 0.08, 0.14, 0.22, 0.33, 0.45, 0.58, 0.7, 0.8, 0.88, 0.93, 0.96, 0.98];
const LATENCY = [0.92, 0.9, 0.86, 0.88, 0.8, 0.72, 0.66, 0.56, 0.5, 0.42, 0.36, 0.3, 0.27, 0.25, 0.24];
const CH = { x: 820, y: 318, w: 560, h: 220 };
const linePath = (v: number[]) =>
  v.map((y, i) => `${i ? 'L' : 'M'} ${((i / (v.length - 1)) * CH.w).toFixed(1)} ${((1 - y) * CH.h).toFixed(1)}`).join(' ');

const Chart: React.FC<{ live: boolean; f: number; prog: number; T: Tone }> = ({ live, f, prog, T }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const v = live ? LATENCY : TRAFFIC;
  const c = live ? T.teal : T.accent;
  // A 画到进度处；B 切后 24f 从左画满
  const drawn = live ? 0.35 + 0.65 * ramp(f, CUT + 2, 24, EASE.out) : 0.25 + 0.75 * ((prog - 0.86) / 0.13);
  const d = linePath(v);
  const n = v.length - 1;
  const xi = drawn * n;
  const i0 = Math.min(n - 1, Math.floor(xi));
  const yEnd = v[i0] + (v[i0 + 1] - v[i0]) * (xi - i0);
  const ex = drawn * CH.w;
  const ey = (1 - yEnd) * CH.h;
  return (
    <svg width={CH.w + 40} height={CH.h + 40} viewBox={`-20 -20 ${CH.w + 40} ${CH.h + 40}`} style={{ position: 'absolute', left: CH.x - 20, top: CH.y - 20, overflow: 'visible' }}>
      <defs>
        <linearGradient id={`ga${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity={T.bg ? 0.32 : 0} />
          <stop offset="1" stopColor={c} stopOpacity={0} />
        </linearGradient>
        <clipPath id={`gc${id}`}><rect x={-20} y={-20} width={ex + 20} height={CH.h + 40} /></clipPath>
      </defs>
      {[0, 0.5, 1].map((g) => (
        <line key={g} x1={0} x2={CH.w} y1={g * CH.h} y2={g * CH.h} stroke={T.bg ? alpha(M.ink2, 0.14) : T.line} strokeWidth={1.5} strokeDasharray="4 8" />
      ))}
      <g clipPath={`url(#gc${id})`}>
        <path d={`${d} L ${CH.w} ${CH.h} L 0 ${CH.h} Z`} fill={`url(#ga${id})`} />
        <path d={d} fill="none" stroke={c} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
      </g>
      <circle cx={ex} cy={ey} r={9} fill={T.bg ? M.ink : c} stroke={c} strokeWidth={4} />
      {T.bg && <circle cx={ex} cy={ey} r={22} fill={alpha(c, 0.18)} />}
    </svg>
  );
};

const Page: React.FC<{ s: 'A' | 'B'; f: number; tint?: string }> = ({ s, f, tint }) => {
  const T = toneOf(tint);
  const live = s === 'B';
  // A：进度 86 → 99（ease-out 越走越慢，卡在 99）
  const prog = 0.86 + 0.13 * ramp(f, 0, 40, EASE.out);
  const lit = live ? CELLS : Math.min(CELLS - 1, Math.floor(prog * CELLS + 0.4));
  // B：p95 58 → 41ms
  const p95 = Math.round(58 - 17 * ramp(f, CUT + 4, 30, EASE.out));
  const ping = live ? ((f - CUT) % 40) / 40 : 0;
  const markC = live ? T.teal : T.accent;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {T.bg && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${M.bg[0]} 0%, ${M.bg[1]} 55%, ${M.bg[2]} 100%)` }} />
          {/* 主光：A 冷灰蓝、B 电光蓝通电 */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 62% 70% at 22% 18%, ${alpha(live ? M.light : '#3a4a72', live ? 0.42 : 0.3)} 0%, ${alpha(M.light, 0)} 70%), ` +
              `radial-gradient(ellipse 60% 34% at 70% 104%, ${alpha(live ? M.accent2 : '#2a3a60', live ? 0.2 : 0.14)} 0%, rgba(0,0,0,0) 72%)`,
          }} />
          {/* 点阵：静止的背景纹理，条带错位时连背景也读得出撕裂 */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.55,
            backgroundImage: `radial-gradient(circle, ${alpha(M.ink2, 0.16)} 1.4px, rgba(0,0,0,0) 1.8px)`,
            backgroundSize: '40px 40px', backgroundPosition: '20px 20px',
          }} />
        </>
      )}

      {/* 顶栏 */}
      <div style={{ position: 'absolute', left: PAD, top: 76, display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg width={44} height={44} viewBox="0 0 44 44">
          <circle cx={22} cy={22} r={18} fill="none" stroke={T.ink} strokeWidth={3.5} />
          <circle cx={22} cy={22} r={7} fill={markC} />
        </svg>
        <span style={{ ...type(38, 700), color: T.ink }}>Halo</span>
        <span style={{ ...type(34, 450), color: T.ink3 }}>/</span>
        <span style={{ ...type(34, 500), color: T.ink2 }}>Releases</span>
      </div>
      <div style={{
        position: 'absolute', right: PAD, top: 70, height: 58, padding: '0 26px', borderRadius: 29, display: 'flex', alignItems: 'center',
        border: `1.5px solid ${T.bg ? alpha(markC, 0.45) : T.line}`, background: T.bg ? alpha(markC, 0.1) : 'transparent',
        fontFamily: FONT.mono, fontSize: 30, fontWeight: 600, color: markC, gap: 18,
      }}>
        <span style={{ position: 'relative', width: 14, height: 14 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: 7, background: markC }} />
          {live && T.bg && (
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 7, border: `2px solid ${markC}`,
              transform: `scale(${1 + ping * 1.5})`, opacity: (1 - ping) * 0.8,
            }} />
          )}
        </span>
        {live ? 'LIVE · prod' : 'DEPLOYING · prod'}
      </div>

      {/* 眉题 + 主标题 */}
      <div style={{ position: 'absolute', left: PAD, top: 248, fontFamily: FONT.mono, fontSize: 30, fontWeight: 600, letterSpacing: '0.06em', color: markC }}>
        {live ? 'RELEASE 4.0.0 · 18 OF 18 REGIONS' : 'RELEASE 4.0.0 · BUILD 2047'}
      </div>
      <div style={{ position: 'absolute', left: PAD - 6, top: 298, ...type(132, 720), color: T.ink }}>
        {live ? 'Halo 4.0' : 'Rolling out'}
        <br />
        <span style={{ color: live ? T.ink : T.ink2 }}>
          {live ? <>is <span style={{ color: T.teal, textShadow: T.bg ? glow(M.accent2, 0.5) : undefined }}>live.</span></> : 'Halo 4.0'}
        </span>
      </div>

      {/* 中区曲线：A 流量切换爬升（随进度画出）/ B 延迟下探；填满标题与大数字之间的空当 */}
      <Chart live={live} f={f} prog={prog} T={T} />

      {/* 右侧大数字：A 进度 / B p95 延迟 */}
      <div style={{ position: 'absolute', right: PAD, top: 300, textAlign: 'right' }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 196, fontWeight: 600, letterSpacing: '-0.05em', lineHeight: 1, color: T.ink, fontVariantNumeric: 'tabular-nums' }}>
          {live ? <>{p95}<span style={{ fontSize: 84, color: T.ink2, letterSpacing: '-0.02em' }}>ms</span></> : <>{Math.floor(prog * 100)}<span style={{ fontSize: 84, color: T.ink2 }}>%</span></>}
        </div>
        <div style={{ ...type(34, 500), color: T.ink2, marginTop: 14 }}>{live ? 'p95 latency, global' : 'traffic shifted'}</div>
      </div>

      {/* 18 区域格 */}
      <div style={{ position: 'absolute', left: PAD, right: PAD, top: 628, display: 'flex', gap: 12 }}>
        {Array.from({ length: CELLS }, (_, i) => {
          const on = i < lit;
          const waiting = !live && i === lit;
          // B：一道青绿波从左扫到右
          const wave = live ? ramp(f, CUT + 6 + i * 1.3, 6, EASE.out) * (1 - ramp(f, CUT + 12 + i * 1.3, 16, EASE.out)) : 0;
          const c = live ? T.teal : T.accent;
          const blink = waiting ? 0.35 + 0.35 * Math.sin(f / 3.2) : 0;
          return (
            <div key={i} style={{
              flex: 1, height: 84, borderRadius: 12, boxSizing: 'border-box',
              background: T.bg ? (on ? `linear-gradient(180deg, ${alpha(c, 0.95)} 0%, ${alpha(c, 0.72)} 100%)` : T.cell) : on ? c : 'transparent',
              border: on ? 'none' : `1.5px solid ${T.bg ? alpha(M.accent, 0.18 + blink) : T.line}`,
              boxShadow: T.bg && on ? `inset 0 1px 0 rgba(255,255,255,0.35), 0 0 ${18 + wave * 40}px ${alpha(c, 0.25 + wave * 0.5)}` : undefined,
              filter: wave > 0.01 ? `brightness(${1 + wave * 0.6})` : undefined,
            }} />
          );
        })}
      </div>

      {/* 下部：A 日志 / B 三项指标 */}
      {!live ? (
        <div style={{ position: 'absolute', left: PAD, right: PAD, top: 772 }}>
          {LOGS.map((l, i) => {
            const k = ramp(f, 4 + i * 9, 14, EASE.snappy);
            return (
              <div key={i} style={{
                display: 'flex', gap: 28, height: 52, alignItems: 'center', fontFamily: FONT.mono, fontSize: 32, fontWeight: 500,
                color: T.ink2, opacity: k, transform: `translateY(${(1 - k) * 18}px)`,
              }}>
                <span style={{ width: 30, color: l.mark === '✓' ? T.accent : T.ink3 }}>{l.mark}</span>
                <span style={{ width: 300, color: T.ink }}>{l.region}</span>
                <span style={{ flex: 1, color: l.ms ? T.ink2 : T.ink3 }}>{l.state}</span>
                <span style={{ color: T.ink3 }}>{l.ms}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ position: 'absolute', left: PAD, right: PAD, top: 790, display: 'flex', gap: 48 }}>
          {STATS.map((st, i) => {
            const k = ramp(f, CUT + 10 + i * 5, 20, EASE.snappy);
            return (
              <div key={i} style={{ flex: 1, borderTop: `2px solid ${T.bg ? alpha(M.accent2, 0.5) : T.line}`, paddingTop: 22, opacity: k, transform: `translateY(${(1 - k) * 26}px)` }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 72, fontWeight: 600, letterSpacing: '-0.04em', color: T.ink, lineHeight: 1 }}>{st.v}</div>
                <div style={{ ...type(32, 500), color: T.ink2, marginTop: 12 }}>{st.l}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 页脚：纹理小字 */}
      <div style={{
        position: 'absolute', left: PAD, right: PAD, bottom: 64, display: 'flex', justifyContent: 'space-between',
        fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.08em', color: T.ink3, opacity: 0.8,
      }}>
        <span>EDGE-RUNNER 4.0.0 · SHA 9F3C2E1</span>
        <span>{live ? 'ROLLOUT COMPLETE' : 'CANARY → GLOBAL'}</span>
      </div>
    </div>
  );
};

export const GlitchDisplace: React.FC = () => {
  const frame = useCurrentFrame();
  const s: 'A' | 'B' = frame >= CUT ? 'B' : 'A';
  const precursor = PRE.includes(frame);
  const tearing = frame >= TEAR_IN && frame < TEAR_OUT;

  // 整屏极缓推进 1 → 1.018（对称 in-out，起止无速度突变）+ 切点冲击放大 1.6%（5f 收回）
  const push = 1 + 0.018 * ramp(frame, 0, 135, EASE.smooth);
  const kick = frame >= CUT ? 0.016 * (1 - ramp(frame, CUT, 6, EASE.out)) : 0.006 * ramp(frame, TEAR_IN, CUT - TEAR_IN, EASE.exit);
  const zoom = push + kick;

  // 幅度包络：44–47 out-cubic 冲起 → 平台 → 54–60 线性消散
  const rise = ramp(frame, TEAR_IN, 3, (t) => 1 - Math.pow(1 - t, 3));
  const decay = 1 - ramp(frame, CUT, TEAR_OUT - CUT, EASE.linear);
  const env = tearing ? Math.min(rise, decay) : 0;
  const exposure = frame === CUT ? 1.28 : frame === CUT + 1 ? 1.12 : 1;

  const strips = BANDS.map((b, i) => {
    let dx = 0;
    if (precursor) {
      dx = i === 5 || i === 12 ? (h(i * 31 + frame * 7) > 0.5 ? 12 : -12) : 0;
    } else if (tearing) {
      const r = h(i * 31 + frame * 7) * 2 - 1;
      dx = Math.sign(r) * Math.pow(Math.abs(r), 0.6) * AMP * ENERGY[i] * env;
    }
    return { ...b, dx, ghost: tearing ? Math.min(1, Math.abs(dx) / 36) * env : 0 };
  });
  const active = precursor || tearing;

  // 扫描亮线：撕裂期每帧 2 根随机高度的全宽细线
  const scans = tearing
    ? [0, 1].map((k) => ({ y: Math.floor(h(frame * 13 + k * 71) * H), a: (0.25 + 0.55 * h(frame * 5 + k)) * env, w: 1 + Math.floor(h(frame + k * 9) * 3) }))
    : [];

  return (
    <AbsoluteFill style={{ background: M.bg[2], overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, transform: `scale(${zoom.toFixed(5)})`,
        filter: exposure > 1 ? `brightness(${exposure})` : undefined,
      }}>
        {/* 底：完整页（静止条直接露出它；摘罩后只剩它） */}
        <Page s={s} f={frame} />

        {active &&
          strips.map((st, i) =>
            Math.abs(st.dx) < 0.5 ? null : (
              <div key={i} style={{ position: 'absolute', top: st.top, left: 0, width: W, height: st.h, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: -st.top, width: W, height: H, transform: `translateX(${st.dx.toFixed(1)}px)` }}>
                  <Page s={s} f={frame} />
                  {st.ghost > 0.04 && (
                    <>
                      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${GHOST}px)`, opacity: 0.55 * st.ghost, mixBlendMode: 'screen' }}>
                        <Page s={s} f={frame} tint={M.accent2} />
                      </div>
                      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-GHOST}px)`, opacity: 0.6 * st.ghost, mixBlendMode: 'screen' }}>
                        <Page s={s} f={frame} tint={M.accent} />
                      </div>
                    </>
                  )}
                </div>
                {/* 撕口切边：上沿亮线、下沿暗线 */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1.5, background: alpha('#dfe8ff', 0.5), opacity: Math.max(0, Math.min(1, (Math.abs(st.dx) - 25) / 30)) }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'linear-gradient(180deg, rgba(0,2,10,0) 0%, rgba(0,2,10,0.75) 100%)', opacity: Math.min(1, Math.abs(st.dx) / 30) }} />
              </div>
            ),
          )}

        {scans.map((sc, k) => (
          <div key={k} style={{
            position: 'absolute', left: 0, right: 0, top: sc.y, height: sc.w,
            background: `linear-gradient(90deg, ${alpha(M.accent2, 0)} 0%, ${alpha(M.accent2, sc.a)} 30%, ${alpha('#ffffff', sc.a)} 60%, ${alpha(M.accent, 0)} 100%)`,
            boxShadow: `0 0 12px ${alpha(M.accent2, sc.a * 0.6)}`,
          }} />
        ))}
      </div>

      <Vignette strength={0.5} color={M.shadow} inner={0.45} />
      <Grain opacity={0.08 + 0.14 * env} step={tearing ? 1 : 2} blend="soft-light" />
    </AbsoluteFill>
  );
};
