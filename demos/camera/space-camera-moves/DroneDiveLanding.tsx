// drone-dive-landing｜无人机俯冲降落（第二轮重设计）
// 手法不变：上帝视角俯看一整页悬停的 dashboard → 猛扎俯冲（越冲越快）→ 气垫式长尾减速，
// 稳稳停在 hero 卡正前方特写。一条行程 p 驱动俯角 / 缩放 / 平移 / 航向，一台相机一次机动。
//
// 设计决定
// - look：lime（石墨底 · 荧光黄绿）。产品是虚构的跑团训练分析「Tempo」：暗场 dashboard，
//   全页只有 hero 卡用荧光绿（本周跑量 412 km 的柱状图），其他卡全是灰阶——俯瞰时一眼就知道要降落在哪。
// - 空间：页面悬停在一块暗色"停机坪"地面上：点阵 + 以 hero 卡为圆心的四圈降落环（俯冲时向外涌开 =
//   速度参照）；页面下方一圈荧光绿气垫光晕，高度越低越收紧越亮，触地时收成贴边的一道轮廓光。
// - 运镜：俯角 62°→0、缩放 0.46→1.95、平移把 hero 卡收到画面中心，外加 FPV 式航向 −16°→0（俯冲中
//   边转边降，落地前改平）。俯冲前 ~3% 上提预备；全程 CameraMotionBlur 卖速度。
// - 落定：周边压暗、hero 卡的目标进度条 0→82% 一笔填满（snappy），数字旁 +18% 徽标弹出（一次过冲）。
// - Q2：页面按落版倍率 2× 布局（CSS zoom）再缩回，终点特写文字是原生分辨率。
//
// 时间表（30fps，共 120f）
//   0–24    上帝视角：页面悬停在停机坪上空（俯角 62°、0.46 倍），航向极缓漂 −18°→−16°；8f 起上提预备（行程倒退 3%）
//   24–50   俯冲 26f：ease-in(cubic) 吃掉 80% 行程，越冲越快（速度峰值在 50f）
//   50–72   气垫 22f：ease-out(poly5) 走完剩下 20%，长尾减速落定；气垫光晕收成轮廓光
//   66–90   落定：周边压暗 → 进度条 0→82%（74–92）→ +18% 徽标弹出（84f）
//   90–120  hold 30f：极缓推近 1→1.012，尾帧是 hero 卡海报
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { LOOKS, alpha, type } from '../../_fixtures/Look';
import { EASE, FONT, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';

export const DRONE_DIVE_LANDING_DURATION = 120;

const L = LOOKS.lime;

// 页面布局（1920×1080 设计坐标）：侧栏 220、顶栏 90、卡区 3×2
const SIDE = 220;
const TOP = 90;
const PAD = 36;
const GAP = 28;
const CW = (1920 - SIDE - PAD * 2 - GAP * 2) / 3; // 524
const CHT = (1080 - TOP - PAD * 2 - GAP) / 2; // 445
const cardBox = (col: number, row: number) => ({ x: SIDE + PAD + col * (CW + GAP), y: TOP + PAD + row * (CHT + GAP), w: CW, h: CHT });
const HERO = cardBox(0, 0);
const HC = { x: HERO.x + HERO.w / 2, y: HERO.y + HERO.h / 2 }; // hero 卡中心，全程 transform-origin 钉在这里

const DIVE_START = 24;
const DIVE_END = 50;
const LAND_END = 72;
const DIVE_SHARE = 0.8;
const PRE_LIFT = 0.03;
const Z = 2; // 页面按落版倍率布局
const S_END = 1.95; // 落版倍率：hero 卡 ≈ 1022×868
const LIFT = 170; // 起始悬停高度（页面 px）

const travel = (frame: number) => {
  const pre = -PRE_LIFT * ramp(frame, 8, DIVE_START - 8, EASE.smooth);
  if (frame < DIVE_START) return pre;
  if (frame < DIVE_END) {
    return interpolate(frame, [DIVE_START, DIVE_END], [-PRE_LIFT, DIVE_SHARE], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic),
    });
  }
  return DIVE_SHARE + interpolate(frame, [DIVE_END, LAND_END], [0, 1 - DIVE_SHARE], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.poly(5)),
  });
};

// ───────────── Tempo 页面 ─────────────

const GRAY = '#2a2e25';
const panel: React.CSSProperties = {
  position: 'absolute', borderRadius: 22, background: `linear-gradient(180deg, ${L.surface2} 0%, ${L.surface} 100%)`,
  boxShadow: `inset 0 0 0 1.5px ${L.line}, inset 0 1.5px 0 rgba(255,255,255,0.05)`, overflow: 'hidden', boxSizing: 'border-box',
};

const BARS = [52, 61, 38, 74, 66, 88, 47];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const HeroCard: React.FC<{ goal: number; badge: number; glow: number }> = ({ goal, badge, glow }) => (
  <div style={{ ...panel, left: HERO.x, top: HERO.y, width: HERO.w, height: HERO.h, padding: '30px 34px',
    boxShadow: `inset 0 0 0 1.5px ${alpha(L.accent, 0.25 + 0.35 * glow)}, inset 0 1.5px 0 rgba(255,255,255,0.08), 0 0 ${40 * glow}px ${alpha(L.accent, 0.25 * glow)}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent, boxShadow: `0 0 12px ${L.accent}` }} />
      <div style={{ ...type(24, 650, { caps: true }), color: L.ink2, letterSpacing: '0.14em' }}>Weekly distance</div>
      <div style={{ marginLeft: 'auto', ...type(20, 600), color: L.ink3 }}>Sep 15 – 21</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 14 }}>
      <div style={{ ...type(112, 800), color: L.ink, letterSpacing: '-0.05em' }}>412</div>
      <div style={{ ...type(40, 650), color: L.ink2 }}>km</div>
      <div style={{
        marginLeft: 14, padding: '6px 14px', borderRadius: 999, background: L.accent, color: L.onAccent, ...type(22, 750),
        opacity: Math.min(1, badge * 2), transform: `scale(${mix(0.6, 1, badge)})`, transformOrigin: '0% 50%',
      }}>+18%</div>
    </div>
    {/* 七天柱状图 */}
    <div style={{ position: 'absolute', left: 34, right: 34, top: 214, height: 120, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
      {BARS.map((b, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: '100%', height: b * 1.1, borderRadius: 8,
            background: i === 5 ? L.accent : alpha(L.accent, 0.32),
            boxShadow: i === 5 ? `0 0 18px ${alpha(L.accent, 0.5)}` : undefined,
          }} />
        </div>
      ))}
    </div>
    <div style={{ position: 'absolute', left: 34, right: 34, top: 342, display: 'flex', gap: 14 }}>
      {DAYS.map((d, i) => <div key={i} style={{ flex: 1, textAlign: 'center', ...type(18, 650), color: i === 5 ? L.ink : L.ink3 }}>{d}</div>)}
    </div>
    {/* 目标进度：落定时一笔填满 */}
    <div style={{ position: 'absolute', left: 34, right: 34, top: 384, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1, height: 10, borderRadius: 5, background: GRAY, overflow: 'hidden' }}>
        <div style={{ width: `${82 * goal}%`, height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${alpha(L.accent, 0.6)}, ${L.accent})`, boxShadow: `0 0 12px ${alpha(L.accent, 0.6)}` }} />
      </div>
      <div style={{ ...type(22, 700), color: L.ink, width: 140, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(82 * goal)}% <span style={{ color: L.ink3, fontWeight: 550 }}>of 500</span>
      </div>
    </div>
  </div>
);

// 灰阶配角卡：标题 + 一种数据形态
const Spark: React.FC<{ w: number; h: number; seed: number }> = ({ w, h, seed }) => {
  const pts = Array.from({ length: 14 }, (_, i) => {
    const v = 0.5 + 0.28 * Math.sin(i * 0.9 + seed) + 0.14 * Math.sin(i * 2.3 + seed * 2);
    return `${(i / 13) * w},${h - v * h}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ position: 'absolute', left: 34, bottom: 40 }}>
      <polyline points={pts} fill="none" stroke={L.ink2} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};
const SideCard: React.FC<{ col: number; row: number; title: string; value: string; kind: 'line' | 'bars' | 'list' | 'ring' | 'heat'; seed: number }> = ({ col, row, title, value, kind, seed }) => {
  const b = cardBox(col, row);
  return (
    <div style={{ ...panel, left: b.x, top: b.y, width: b.w, height: b.h, padding: '30px 34px' }}>
      <div style={{ ...type(24, 650, { caps: true }), color: L.ink3, letterSpacing: '0.14em' }}>{title}</div>
      <div style={{ ...type(64, 760), color: L.ink, marginTop: 14 }}>{value}</div>
      {kind === 'line' && <Spark w={b.w - 68} h={150} seed={seed} />}
      {kind === 'bars' && (
        <div style={{ position: 'absolute', left: 34, right: 34, bottom: 40, height: 150, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          {[30, 55, 90, 70, 40].map((v, i) => <div key={i} style={{ flex: 1, height: `${v}%`, borderRadius: 8, background: i === 2 ? L.ink2 : GRAY }} />)}
        </div>
      )}
      {kind === 'list' && (
        <div style={{ position: 'absolute', left: 34, right: 34, bottom: 34 }}>
          {['Ana R.', 'Leo M.', 'Kai T.'].map((n, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 14, height: 54, borderTop: `1.5px solid ${L.line}` }}>
              <div style={{ width: 30, height: 30, borderRadius: 15, background: GRAY }} />
              <div style={{ ...type(24, 600), color: L.ink2 }}>{n}</div>
              <div style={{ marginLeft: 'auto', ...type(24, 650), color: L.ink2 }}>{[64, 58, 51][i]} km</div>
            </div>
          ))}
        </div>
      )}
      {kind === 'ring' && (
        <svg width={170} height={170} style={{ position: 'absolute', right: 40, bottom: 40 }}>
          <circle cx={85} cy={85} r={68} fill="none" stroke={GRAY} strokeWidth={16} />
          <circle cx={85} cy={85} r={68} fill="none" stroke={L.ink2} strokeWidth={16} strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 68 * 0.71} 999`} transform="rotate(-90 85 85)" />
        </svg>
      )}
      {kind === 'heat' && (
        <div style={{ position: 'absolute', left: 34, right: 34, bottom: 40, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8 }}>
          {Array.from({ length: 30 }, (_, i) => {
            const v = (Math.sin(i * 1.7 + seed) + 1) / 2;
            return <div key={i} style={{ height: 34, borderRadius: 6, background: v > 0.66 ? L.ink2 : v > 0.33 ? '#4a4f42' : GRAY }} />;
          })}
        </div>
      )}
    </div>
  );
};

const TempoPage: React.FC<{ goal: number; badge: number; glow: number }> = ({ goal, badge, glow }) => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', fontFamily: FONT.sans,
    background: `linear-gradient(180deg, #11130f 0%, ${L.bg[1]} 100%)`, boxShadow: `inset 0 0 0 2px ${L.line}` }}>
    {/* 侧栏 */}
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDE, background: '#0e100c', borderRight: `1.5px solid ${L.line}` }}>
      <div style={{ position: 'absolute', left: 36, top: 30, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: L.accent, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 8, top: 15, width: 18, height: 4, borderRadius: 2, background: L.onAccent, transform: 'skewX(-20deg)' }} />
        </div>
        <div style={{ ...type(30, 760), color: L.ink }}>Tempo</div>
      </div>
      {['Overview', 'Athletes', 'Sessions', 'Routes', 'Settings'].map((n, i) => (
        <div key={n} style={{
          position: 'absolute', left: 20, right: 20, top: 120 + i * 62, height: 50, borderRadius: 12, padding: '0 16px',
          display: 'flex', alignItems: 'center', ...type(22, i === 0 ? 700 : 550), color: i === 0 ? L.ink : L.ink3,
          background: i === 0 ? 'rgba(255,255,255,0.05)' : undefined,
        }}>{n}</div>
      ))}
    </div>
    {/* 顶栏 */}
    <div style={{ position: 'absolute', left: SIDE + PAD, right: PAD, top: 0, height: TOP, display: 'flex', alignItems: 'center' }}>
      <div style={{ ...type(30, 700), color: L.ink }}>Good morning, Coach Rae</div>
      <div style={{ marginLeft: 'auto', padding: '10px 22px', borderRadius: 999, boxShadow: `inset 0 0 0 1.5px ${L.line}`, ...type(20, 600), color: L.ink2 }}>Berlin Night Runners · 24 athletes</div>
    </div>
    <HeroCard goal={goal} badge={badge} glow={glow} />
    <SideCard col={1} row={0} title="Avg pace" value="5:12 /km" kind="line" seed={1} />
    <SideCard col={2} row={0} title="HR zones" value="Z2 · 64%" kind="bars" seed={2} />
    <SideCard col={0} row={1} title="Leaderboard" value="Ana R." kind="list" seed={3} />
    <SideCard col={1} row={1} title="Recovery" value="71%" kind="ring" seed={4} />
    <SideCard col={2} row={1} title="Sessions" value="38" kind="heat" seed={5} />
  </div>
);

// ───────────── 停机坪地面 ─────────────
const FLOOR = { x: -3200, y: -2600, w: 8320, h: 6280 };
const FloorPad: React.FC<{ fade: number }> = ({ fade }) => {
  const cx = HC.x - FLOOR.x;
  const cy = HC.y - FLOOR.y;
  return (
    <div style={{
      position: 'absolute', left: FLOOR.x, top: FLOOR.y, width: FLOOR.w, height: FLOOR.h, opacity: fade,
      WebkitMaskImage: `radial-gradient(ellipse 2900px 2400px at ${cx}px ${cy}px, #000 35%, transparent 100%)`,
      maskImage: `radial-gradient(ellipse 2900px 2400px at ${cx}px ${cy}px, #000 35%, transparent 100%)`,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 4px 4px, ${alpha(L.accent, 0.4)} 3px, ${alpha(L.accent, 0)} 4.2px)`,
        backgroundSize: '64px 64px', backgroundPosition: `${cx % 64}px ${cy % 64}px`,
      }} />
      <svg width={FLOOR.w} height={FLOOR.h} style={{ position: 'absolute', inset: 0 }}>
        {[1350, 1750, 2200, 2700].map((r, i) => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={alpha(L.accent, 0.5 - i * 0.09)} strokeWidth={i === 0 ? 10 : 6} strokeDasharray={i % 2 ? '40 28' : undefined} />
        ))}
        {[0, 90, 180, 270].map((a) => {
          const rad = (a * Math.PI) / 180;
          return <line key={a} x1={cx + Math.cos(rad) * 1250} y1={cy + Math.sin(rad) * 1250} x2={cx + Math.cos(rad) * 2850} y2={cy + Math.sin(rad) * 2850} stroke={alpha(L.accent, 0.22)} strokeWidth={5} />;
        })}
      </svg>
    </div>
  );
};

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const p = travel(frame);
  const pc = Math.min(1, Math.max(0, p));
  const push = mix(1, 1.012, ramp(frame, 90, 30, EASE.smooth));

  const rotX = mix(62, 0, p);
  const scale = mix(0.46, S_END, p) * push;
  // 航向：开场极缓漂移，俯冲中随行程改平（FPV 边转边降）
  const yaw = mix(-18, -16, ramp(frame, 0, DIVE_START, EASE.smooth)) * (1 - Math.min(1, Math.max(0, p)));
  // 平移：起点整页居中略偏下；终点 hero 卡中心 = 画面中心
  const tx = mix(960 - HC.x - 180, 960 - HC.x, pc);
  const ty = mix(540 - HC.y + 70, 540 - HC.y, pc);

  const lift = LIFT * Math.pow(1 - pc, 1.3);
  const goal = ramp(frame, 74, 18, EASE.snappy);
  const badge = ramp(frame, 84, 12, EASE.overshoot);
  const glow = ramp(frame, 62, 16, EASE.out);

  return (
    <AbsoluteFill style={{ perspective: 1500 }}>
      <div style={{
        position: 'absolute', width: 1920, height: 1080, transformOrigin: `${HC.x}px ${HC.y}px`, transformStyle: 'preserve-3d',
        transform: `translate(${tx}px, ${ty}px) rotateX(${rotX}deg) rotateZ(${yaw}deg) scale(${scale})`,
      }}>
        <FloorPad fade={1 - 0.6 * pc} />
        {/* 气垫光晕：页面正下方的荧光绿光，高度越低越收紧越亮 */}
        <div style={{
          position: 'absolute', left: -120 + lift * 0.5, top: -120 + lift * 0.5, width: 2160 - lift, height: 1320 - lift, borderRadius: 120,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent, 0.34 + 0.16 * pc)} 40%, ${alpha(L.accent, 0)} 74%)`,
          filter: `blur(${(40 + lift * 0.25).toFixed(1)}px)`, transform: 'translateZ(1px)', opacity: 1 - 0.8 * glow,
        }} />
        {/* 地面接触影 */}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, borderRadius: 26, background: '#000',
          opacity: 0.55 * (1 - pc * 0.6), filter: `blur(${(20 + lift * 0.35).toFixed(1)}px)`,
          transform: `translate3d(${(lift * 0.12).toFixed(1)}px, ${(lift * 0.3).toFixed(1)}px, 2px)`,
        }} />
        {/* 页面本体：悬停 lift 高度；按 2× 布局后缩回 */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `translateZ(${(lift + 8).toFixed(2)}px)` }}>
          <div style={{ width: 1920 * Z, height: 1080 * Z, transform: `scale(${1 / Z})`, transformOrigin: '0 0' }}>
            <div style={{ zoom: Z, width: 1920, height: 1080, position: 'relative' }}>
              <TempoPage goal={goal} badge={badge} glow={glow} />
              {/* 俯瞰时页面受一盏顶光：hero 一侧偏亮，落地后收掉 */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 26, pointerEvents: 'none', mixBlendMode: 'screen', opacity: 1 - pc,
                background: `radial-gradient(ellipse 70% 80% at ${(HC.x / 1920) * 100}% ${(HC.y / 1080) * 100}%, ${alpha(L.accent, 0.1)} 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0) 75%)`,
              }} />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 落定后的焦点：hero 卡外压暗（屏幕空间，hero 已在画面中心）
const Focus: React.FC = () => {
  const frame = useCurrentFrame();
  const k = ramp(frame, 64, 22, EASE.out);
  if (k <= 0) return null;
  const hw = (HERO.w * S_END) / 2;
  const hh = (HERO.h * S_END) / 2;
  return (
    <AbsoluteFill style={{
      pointerEvents: 'none', opacity: k,
      background: `radial-gradient(${hw * 1.5}px ${hh * 1.5}px at 50% 50%, ${alpha(L.bg[2], 0)} 62%, ${alpha(L.bg[2], 0.72)} 100%)`,
    }} />
  );
};

// 运动模糊只在机动段开（静止段多重采样纯属浪费渲染时间，结果与单次渲染一致）
const BLUR_FROM = DIVE_START - 6;
const BLUR_TO = LAND_END - 4;

export const DroneDiveLanding: React.FC = () => {
  const frame = useCurrentFrame();
  const moving = frame >= BLUR_FROM && frame <= BLUR_TO;
  return (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 70% at 50% 45%, #171a13 0%, ${L.bg[1]} 55%, ${L.bg[2]} 100%)` }}>
    {moving ? (
      <CameraMotionBlur shutterAngle={200} samples={8}>
        <Scene />
      </CameraMotionBlur>
    ) : <Scene />}
    <Focus />
    <Vignette strength={0.5} inner={0.45} color={L.shadow} />
    <Grain opacity={0.08} blend="soft-light" />
  </AbsoluteFill>
  );
};
