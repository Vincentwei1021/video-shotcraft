// corner-spotlight-reveal（C 角落匀速显影）—— 黑场里一束光从左上角匀速扩张，把界面逐步"点亮"，
// 照到的显影、照不到的沉黑，最终全屏亮起：光即转场。
//
// 第二轮重设计（日出 · 晨间简报）：
// - look = sand（米色 · 赤陶）。光被重新解释为"日出"：光源在画外左上角（太阳刚出地平线），
//   照亮的是一款晨间日程 app「Aubade」的今日简报——大字问候「Good morning, Ines.」、日出弧线小组件、
//   今日四项日程（其中一块赤陶色专注时段）。整屏是为镜头设计的 UI：主标题 128px，要读的字 ≥32px。
// - 命门不动：显影半径全程严格 linear（不缓动），104f 时恰好盖满最远角，亮度采样全程平滑爬升。
// - 光的身份：光前沿羽化带挂一圈 screen 叠加的杏粉色辉边（黑处是暖光、亮处自然消失）+ 角落几道
//   极淡的丁达尔光柱（随光一起长、全亮后淡出）；被照亮的区域先带一层"晨光"暖色调（multiply），
//   随时间褪成正常日光——光不只是显影，也是色温从黎明走到白天。
// - 光到即醒：每块内容在光前沿扫过它的瞬间轻轻上浮 18px 落座（按到光心的距离自动错峰，
//   左上先醒、右下后醒，物理上就是光走的顺序）。
// - 相机：开场 1.12 倍贴着左上角，0–112f 缓出拉到 1.0 后静止（钳位）；hold 段太阳点沿日出弧线升起、
//   角落日晕极缓呼吸，画面不死。
//
// 时间表（30fps，共 150f）：
//   0       第 1 帧：左上角已有一团暖光照出 logo 一角（不是空黑）
//   0–104   显影半径 linear 扩张（主动作），内容随光前沿逐块醒来
//   0–112   相机 1.12→1.0 缓出拉开
//   84–120  辉边 / 光柱淡出，晨光暖调褪尽
//   104–150 全亮 hold：日出弧上的太阳点 100–132f 升到 6:42 位置，日晕呼吸
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { EASE, FONT, Grain, ramp } from '../../_fixtures/Polish';
import { LOOKS, alpha, type } from '../../_fixtures/Look';

export const CORNER_SPOTLIGHT_REVEAL_DURATION = 150; // 104f 匀速扩张 + 46f 全亮停留

const L = LOOKS.sand;
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const VOID = '#0c0907'; // 未被照到的夜：带暖色相的近黑，不用纯黑
const SUN = '#ffd6a0'; // 光色：日出的杏金
const RIM = '#ff9a7a'; // 光前沿辉边：杏粉

// 光：光心在画外左上（太阳刚露头），linear 微移；显影平台半径 linear 扩张
const EXPAND = 104;
const lightAt = (f: number) => {
  const cx = interpolate(f, [0, EXPAND], [-60, 110], CLAMP);
  const cy = interpolate(f, [0, EXPAND], [-70, 30], CLAMP);
  const rIn = interpolate(f, [0, EXPAND], [190, 2120], CLAMP); // 最远角 (1920,1080) 距终点光心 ≈2085
  const feather = 110 + rIn * 0.3; // 羽化带随光变大而变宽（远光更散）
  return { cx, cy, rIn, feather };
};

// 光前沿扫过 (x,y) 的醒来进度 0→1（按距离自动错峰）
const wakeAt = (f: number, x: number, y: number) => {
  const { cx, cy, rIn, feather } = lightAt(f);
  const d = Math.hypot(x - cx, y - cy);
  return EASE.snappy(Math.min(1, Math.max(0, (rIn + feather * 0.35 - d) / 220)));
};

const Wake: React.FC<{ x: number; y: number; f: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, f, children, style }) => {
  const p = wakeAt(f, x, y);
  return <div style={{ ...style, transform: `translateY(${((1 - p) * 18).toFixed(2)}px)` }}>{children}</div>;
};

// 小太阳标（logo）
const SunMark: React.FC<{ s?: number; c?: string }> = ({ s = 44, c = L.accent }) => (
  <svg width={s} height={s} viewBox="0 0 44 44" fill="none" style={{ flex: 'none' }}>
    <path d="M8 30a14 14 0 0 1 28 0" stroke={c} strokeWidth={4} strokeLinecap="round" />
    <path d="M4 36h36" stroke={c} strokeWidth={4} strokeLinecap="round" />
    {[-60, -30, 0, 30, 60].map((a) => {
      const r = (a - 90) * (Math.PI / 180);
      return <line key={a} x1={22 + Math.cos(r) * 19} y1={30 + Math.sin(r) * 19} x2={22 + Math.cos(r) * 24} y2={30 + Math.sin(r) * 24} stroke={c} strokeWidth={3.5} strokeLinecap="round" />;
    })}
  </svg>
);

const AGENDA = [
  { t: '08:30', title: 'Riverside run', sub: '45 min · 7.2 km easy', bar: '#c9a27a' },
  { t: '09:30', title: 'Design crit — Onboarding', sub: 'Studio 2 · with Mateo, Aya', bar: L.accent2 },
  { t: '11:00', title: 'Focus · Q3 narrative', sub: 'Until 13:00 · notifications off', bar: L.accent, focus: true },
  { t: '15:30', title: '1:1 with Mateo', sub: '30 min · Corner café', bar: '#b9aa95' },
];

// 日出弧组件：地平线 + 半圆轨迹 + 太阳点（sunT 0→1 = 从地平线升到 6:42 的晨间弧位）
const SunArc: React.FC<{ sunT: number }> = ({ sunT }) => {
  const W = 360, H = 200, cx = W / 2, cy = 176, r = 150;
  const aSun = Math.PI * (1 - 0.32 * sunT);
  const sx = cx + Math.cos(aSun) * r, sy = cy - Math.sin(aSun) * r;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id="aubSun">
          <stop offset="0" stopColor={L.accent} stopOpacity={0.5} />
          <stop offset="1" stopColor={L.accent} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="aubSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={L.accent} stopOpacity={0} />
          <stop offset="1" stopColor={L.accent} stopOpacity={0.14} />
        </linearGradient>
      </defs>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill="url(#aubSky)" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} stroke={alpha(L.ink, 0.22)} strokeWidth={3} strokeDasharray="1 11" strokeLinecap="round" fill="none" />
      {sunT > 0.001 && <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)}`} stroke={L.accent} strokeWidth={5} strokeLinecap="round" fill="none" />}
      <line x1={0} y1={cy} x2={W} y2={cy} stroke={alpha(L.ink, 0.3)} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={sx} cy={sy} r={44} fill="url(#aubSun)" />
      <circle cx={sx} cy={sy} r={14} fill={L.accent} />
    </svg>
  );
};

// 今日简报界面（1920×1080 设计坐标）
const Briefing: React.FC<{ f: number }> = ({ f }) => {
  const sunT = ramp(f, 98, 34, EASE.out);
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT.sans, color: L.ink,
      background: `radial-gradient(ellipse 70% 80% at 12% 8%, #f8f0e4 0%, ${L.bg[0]} 46%, ${L.bg[2]} 100%)` }}>
      {/* 顶栏 */}
      <Wake f={f} x={200} y={100} style={{ position: 'absolute', left: 150, top: 92, display: 'flex', alignItems: 'center', gap: 16 }}>
        <SunMark />
        <div style={{ ...type(36, 700), letterSpacing: '-0.02em' }}>Aubade</div>
      </Wake>
      <Wake f={f} x={1600} y={110} style={{ position: 'absolute', right: 150, top: 96, display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ ...type(24, 650, { caps: true }), letterSpacing: '0.16em', color: L.ink3 }}>Thursday · 14 March</div>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: alpha(L.accent, 0.14), boxShadow: `inset 0 0 0 2px ${alpha(L.accent, 0.35)}`, color: L.accent, ...type(22, 700), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>IR</div>
      </Wake>

      {/* 左：问候 */}
      <Wake f={f} x={420} y={330} style={{ position: 'absolute', left: 146, top: 238 }}>
        <div style={{ ...type(128, 760), letterSpacing: '-0.045em', lineHeight: 0.98 }}>Good morning,</div>
        <div style={{ ...type(128, 760), letterSpacing: '-0.045em', lineHeight: 0.98 }}>
          Ines<span style={{ color: L.accent }}>.</span>
        </div>
      </Wake>
      <Wake f={f} x={420} y={560} style={{ position: 'absolute', left: 150, top: 528, width: 760, ...type(40, 450), color: L.ink2, lineHeight: 1.3 }}>
        Three meetings and one long focus block. The day starts clear.
      </Wake>

      {/* 左下：日出弧 */}
      <Wake f={f} x={460} y={800} style={{ position: 'absolute', left: 150, top: 676, width: 760, height: 300, borderRadius: 36,
        background: alpha('#fffaf2', 0.72), boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px ${alpha(L.shadow, 0.08)}, 0 24px 48px -24px ${alpha(L.shadow, 0.28)}`,
        border: `1.5px solid ${L.line}`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 44, top: 40 }}>
          <div style={{ ...type(22, 650, { caps: true }), letterSpacing: '0.16em', color: L.ink3 }}>Sunrise</div>
          <div style={{ ...type(96, 720), letterSpacing: '-0.045em', marginTop: 10 }}>6:42</div>
          <div style={{ ...type(30, 500), color: L.ink2, marginTop: 18 }}>12° clear · sets 18:51</div>
        </div>
        <div style={{ position: 'absolute', right: 34, bottom: 34 }}>
          <SunArc sunT={sunT} />
        </div>
      </Wake>

      {/* 右：今日日程 */}
      <Wake f={f} x={1380} y={420} style={{ position: 'absolute', left: 1010, top: 236, width: 760, height: 740, borderRadius: 40,
        background: alpha('#fffaf2', 0.82), border: `1.5px solid ${L.line}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 4px ${alpha(L.shadow, 0.06)}, 0 40px 80px -40px ${alpha(L.shadow, 0.35)}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '44px 48px 20px' }}>
          <div style={{ ...type(54, 740), letterSpacing: '-0.035em' }}>Today</div>
          <div style={{ ...type(30, 500), color: L.ink3 }}>4 events</div>
        </div>
        {AGENDA.map((a, i) => {
          const y = 236 + 140 + i * 152; // 行中心（屏幕坐标，给醒来错峰用）
          return (
            <Wake key={i} f={f} x={1300} y={y} style={{ margin: '0 28px', height: 140, borderRadius: 26, display: 'flex', alignItems: 'center', gap: 26, padding: '0 22px',
              background: a.focus ? L.accent : 'transparent', color: a.focus ? L.onAccent : L.ink,
              boxShadow: a.focus ? `0 18px 36px -18px ${alpha(L.accent, 0.7)}, inset 0 1px 0 rgba(255,255,255,0.25)` : undefined,
              borderBottom: a.focus || i === AGENDA.length - 1 || AGENDA[i + 1]?.focus ? undefined : `1.5px solid ${L.line}` }}>
              <div style={{ width: 112, fontFamily: FONT.mono, fontSize: 32, fontWeight: 600, color: a.focus ? alpha(L.onAccent, 0.85) : L.ink2, fontVariantNumeric: 'tabular-nums' }}>{a.t}</div>
              <div style={{ width: 6, height: 76, borderRadius: 3, background: a.focus ? alpha(L.onAccent, 0.7) : a.bar }} />
              <div>
                <div style={{ ...type(40, 650), letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{a.title}</div>
                <div style={{ ...type(30, 450), color: a.focus ? alpha(L.onAccent, 0.8) : L.ink3, marginTop: 6, whiteSpace: 'nowrap' }}>{a.sub}</div>
              </div>
            </Wake>
          );
        })}
      </Wake>

      {/* 晨光暖调：被照亮处先偏橙粉，随时间褪成日光（multiply 只压色不提亮） */}
      <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'multiply', pointerEvents: 'none',
        background: 'linear-gradient(135deg, #ffb27a 0%, #ff9f8a 45%, #e9b9a6 100%)',
        opacity: interpolate(f, [0, 30, 118], [0.5, 0.42, 0.07], CLAMP) }} />
    </div>
  );
};

export const CornerSpotlightReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { cx, cy, rIn, feather } = lightAt(frame);
  const R = rIn + feather;
  const pIn = (rIn / R) * 100;
  const pMid = ((rIn + feather * 0.42) / R) * 100;

  // 显影罩：平台全亮 → 羽化带 S 形衰减 → 沉黑（屏幕坐标，不随相机缩放）
  const mask = `radial-gradient(circle ${R.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, #fff ${pIn.toFixed(2)}%, rgba(255,255,255,0.78) ${(pIn + (pMid - pIn) * 0.45).toFixed(2)}%, rgba(255,255,255,0.4) ${pMid.toFixed(2)}%, rgba(255,255,255,0.1) ${(pMid + (100 - pMid) * 0.55).toFixed(2)}%, rgba(255,255,255,0) 100%)`;

  // 光前沿辉边：峰值挂在羽化带中段（黑处是暖光、亮处被 screen 吃掉）；全亮后淡出
  const rimA = interpolate(frame, [0, 6, 88, 110], [0.7, 1, 1, 0], CLAMP);
  const rim = `radial-gradient(circle ${R.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, ${alpha(RIM, 0)} ${(pIn * 0.92).toFixed(2)}%, ${alpha(RIM, 0.75)} ${pMid.toFixed(2)}%, ${alpha('#ff7a8a', 0.16)} ${(pMid + (100 - pMid) * 0.5).toFixed(2)}%, ${alpha('#ff7a8a', 0)} 100%), radial-gradient(circle ${R.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, ${alpha('#ffd2a8', 0)} ${(pIn + (pMid - pIn) * 0.55).toFixed(2)}%, ${alpha('#ffd2a8', 0.55)} ${(pMid + (100 - pMid) * 0.08).toFixed(2)}%, ${alpha('#ffd2a8', 0)} ${(pMid + (100 - pMid) * 0.3).toFixed(2)}%)`;

  // 丁达尔光柱：角落放射的几道极淡光束，只活在光照范围内，随光扩张一起长，全亮后淡出
  const rayA = interpolate(frame, [0, 10, 80, 116], [0.5, 1, 0.8, 0], CLAMP);
  const rays = `repeating-conic-gradient(from ${(96 + frame * 0.05).toFixed(2)}deg at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, ${alpha(SUN, 0)} 0deg, ${alpha(SUN, 0.5)} 3deg, ${alpha(SUN, 0)} 7deg, ${alpha(SUN, 0)} 13deg, ${alpha(SUN, 0.3)} 15deg, ${alpha(SUN, 0)} 19deg)`;
  const rayMask = `radial-gradient(circle ${(R * 1.5).toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.5) ${(pIn * 0.5).toFixed(2)}%, #fff ${(pMid / 1.5).toFixed(2)}%, rgba(255,255,255,0.35) ${(100 / 1.5).toFixed(2)}%, rgba(255,255,255,0) 100%)`;

  // 相机：贴着左上角 1.12 → 1.0 缓出收住（钳位，之后静止）
  const cam = ramp(frame, 0, 112, EASE.out);
  const scale = 1.12 - 0.12 * cam;

  // 日晕：角落太阳本体，hold 段极缓呼吸
  const breathe = 1 + 0.06 * Math.sin(frame / 22);

  return (
    <AbsoluteFill style={{ background: VOID, overflow: 'hidden' }}>
      {/* 夜色底：未照到的地方不是死黑，是带暖色相的深夜 */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 60% at 0% 0%, ${alpha('#3a1f12', 0.6)} 0%, rgba(0,0,0,0) 70%)` }} />
      {/* 被光显影的界面层：罩在屏幕坐标，内层随相机缩放 */}
      <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
        <AbsoluteFill style={{ transform: `scale(${scale.toFixed(4)})`, transformOrigin: '4% 4%' }}>
          <Briefing f={frame} />
        </AbsoluteFill>
      </AbsoluteFill>
      {/* 光柱 */}
      <AbsoluteFill style={{ background: rays, WebkitMaskImage: rayMask, maskImage: rayMask, mixBlendMode: 'screen', opacity: rayA * 0.4 }} />
      {/* 光前沿辉边 */}
      <AbsoluteFill style={{ background: rim, mixBlendMode: 'screen', opacity: rimA }} />
      {/* 角落日晕（太阳本体在画外，只露出一团暖光） */}
      <div style={{
        position: 'absolute', left: cx - 520 * breathe, top: cy - 520 * breathe, width: 1040 * breathe, height: 1040 * breathe, borderRadius: '50%',
        background: `radial-gradient(closest-side, ${alpha('#fff4e2', 0.9)} 0%, ${alpha(SUN, 0.42)} 32%, ${alpha(SUN, 0)} 100%)`,
        mixBlendMode: 'screen', opacity: interpolate(frame, [0, 104, 150], [0.95, 0.62, 0.58], CLAMP), pointerEvents: 'none',
      }} />
      {/* 暗角 + 颗粒（大面积渐变防色带） */}
      <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse 85% 85% at 30% 25%, rgba(0,0,0,0) 55%, ${alpha(L.shadow, 0.22)} 100%)` }} />
      <Grain opacity={0.05} blend="overlay" />
    </AbsoluteFill>
  );
};
