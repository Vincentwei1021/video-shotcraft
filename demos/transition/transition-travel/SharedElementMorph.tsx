// shared-element-morph〔转场〕：全屏特写卡收缩、位移、长出圆角，严丝合缝飞落进总览网格里它所属的槽位，
// 落座带一次轻过冲。观众感觉是同一个物体被镜头送回原位（FLIP 共享元素转场）。
//
// 第二轮重设计（沙 · 旅行手账 App「Wayfare」）：
// - look = sand。总览页是"收藏的行程"——3×2 张 16:9 风景卡（程序绘制的分层山景：天空渐变 + 太阳 +
//   三层山脊，各卡一套暖调色板），标题直接压在画面上。卡片 16:9 = 画面比例，所以全屏特写**就是这张卡本身**
//   放大 3.64 倍（CSS zoom 布局级放大，Q2 不糊），标题在特写里自然成为 132px 的大标题——内容零重排，同一物体感最强。
// - 叙事：特写页左上「‹ Saved trips」返回键先被按下（缩一下 + 提亮），特写 chrome 淡出，卡片才起飞——
//   "按返回 → 卡片回家"的因果一眼可读。
// - 运动：位置 / 尺寸 / 圆角共用一条物理弹簧进度 p（damping 16 / stiffness 120，≈3.5% 过冲一次回弹）；
//   背景网格随 p 从 1.035 后拉到 1（以槽位中心为原点，p=1 严格对位）；飞行中投影从悬浮级收敛到贴地级。
// - 到家：落座那一帧邻卡被"推"开一下（径向 10px、阻尼振荡两拍内收敛），并由暗转亮、由近及远错峰——
//   网格像被这张卡的落地轻轻撞了一下，"归位"有了重量。
//
// 时间表（30fps，共 140f）：
//   0–22    特写 hold：山景三层极缓视差漂移（画面是活的）
//   22–30   预备：返回键按下（scale 0.92 + 底色提亮）、卡片整体轻吸 0.985
//   28–36   特写 chrome（返回键 / 收藏 / 行程按钮）淡出
//   34–~70  主动作：弹簧 morph，~55f 首次越过 1（落座），~62f 过冲峰 ≈3%，之后回弹收敛
//   55–85   余波：邻卡径向涟漪 + 由近及远提亮
//   80–140  hold：整幅极缓前推 1→1.012，海报定格
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, Grain, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type } from '../../_fixtures/Look';

export const SHARED_ELEMENT_MORPH_DURATION = 140;

const L = LOOKS.sand;
const CW = 528; // 卡宽（16:9）
const CH = 297; // 卡高
const GAP = 40;
const GX = 128; // 网格左缘（3·528 + 2·40 = 1664 → 128–1792）
const GY = 330; // 第一行顶
const R = 22; // 落座圆角
const HERO = 4; // 第二行中列（0-based 索引：行优先）
const slotOf = (i: number) => ({ x: GX + (i % 3) * (CW + GAP), y: GY + Math.floor(i / 3) * (CH + GAP) });
const SLOT = slotOf(HERO); // = (696, 667)
const MORPH = 34;

// 共享进度：物理弹簧（ζ≈0.75：~21f 首次到位、~28f 过冲峰 ≈3%、一次可见回弹）
const progress = (f: number) => (f < MORPH ? 0 : springAt(f, MORPH, { damping: 7.6, stiffness: 26 }));
// 首次越过 1 的帧 = 落座帧（确定性预计算）
const LAND = (() => {
  for (let f = MORPH; f < MORPH + 60; f += 0.25) if (progress(f) >= 1) return f;
  return MORPH + 20;
})();

// ───────────── 程序山景 ─────────────
type Trip = { place: string; country: string; meta: string; sky: [string, string]; sun: string; sunXY: [number, number]; hills: [string, string, string]; seed: number };
const TRIPS: Trip[] = [
  { place: 'Lofoten', country: 'Norway', meta: '9 days · June', sky: ['#cfdce0', '#ece3d4'], sun: '#fff6e6', sunXY: [0.7, 0.42], hills: ['#93a7ae', '#5f7a86', '#2f4553'], seed: 3 },
  { place: 'Atacama', country: 'Chile', meta: '6 days · March', sky: ['#f4c79a', '#f2a978'], sun: '#fff0d8', sunXY: [0.3, 0.5], hills: ['#d68a5d', '#b4623d', '#743621'], seed: 7 },
  { place: 'Hokkaido', country: 'Japan', meta: '8 days · February', sky: ['#dfe4e8', '#efe9e0'], sun: '#ffffff', sunXY: [0.62, 0.36], hills: ['#c4cdd5', '#93a2b0', '#5f7182'], seed: 11 },
  { place: 'Kyoto', country: 'Japan', meta: '5 days · November', sky: ['#f1dcc4', '#ebc6a0'], sun: '#fff3df', sunXY: [0.24, 0.4], hills: ['#c9734c', '#97482f', '#5a2a1d'], seed: 5 },
  { place: 'Dolomites', country: 'Italy', meta: '7 days · September', sky: ['#f3d6b4', '#e8ad84'], sun: '#fff1d6', sunXY: [0.68, 0.4], hills: ['#bd8b6c', '#8c5c48', '#4f3128'], seed: 2 },
  { place: 'Patagonia', country: 'Argentina', meta: '12 days · January', sky: ['#e6d2bf', '#d6a786'], sun: '#fff4e4', sunXY: [0.38, 0.34], hills: ['#9b7b6b', '#6a5560', '#3a3241'], seed: 9 },
];

const ridge = (seed: number, layer: number, base: number, amp: number, drift: number) => {
  const pts: string[] = [];
  const N = 48;
  for (let k = 0; k <= N; k++) {
    const x = (k / N) * CW;
    const u = x / CW + drift;
    const y = base
      - amp * (0.55 * Math.sin(u * (5 + layer) + seed * 1.7 + layer)
        + 0.3 * Math.sin(u * (11 + layer * 3) + seed * 0.9)
        + 0.15 * Math.sin(u * 23 + seed * 2.3 + layer * 4));
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M0,${CH} L${pts.join(' L')} L${CW},${CH} Z`;
};

const TripArt: React.FC<{ t: Trip; frame: number; id: string }> = ({ t, frame, id }) => {
  const d = (k: number) => 0.012 * k * Math.sin(frame / 70 + t.seed); // 三层视差漂移（近层漂得多）
  return (
    <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ position: 'absolute', inset: 0, display: 'block' }}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.sky[0]} />
          <stop offset="1" stopColor={t.sky[1]} />
        </linearGradient>
        <radialGradient id={`${id}u`}>
          <stop offset="0" stopColor={t.sun} stopOpacity={1} />
          <stop offset="0.35" stopColor={t.sun} stopOpacity={0.9} />
          <stop offset="0.4" stopColor={t.sun} stopOpacity={0.35} />
          <stop offset="1" stopColor={t.sun} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.18} />
        </linearGradient>
      </defs>
      <rect width={CW} height={CH} fill={`url(#${id}s)`} />
      <circle cx={t.sunXY[0] * CW} cy={t.sunXY[1] * CH} r={90} fill={`url(#${id}u)`} />
      <path d={ridge(t.seed, 0, CH * 0.62, 34, d(1))} fill={t.hills[0]} opacity={0.85} />
      <path d={ridge(t.seed, 1, CH * 0.76, 30, d(2))} fill={t.hills[1]} />
      <path d={ridge(t.seed, 2, CH * 0.9, 22, d(3))} fill={t.hills[2]} />
      <rect width={CW} height={CH} fill={`url(#${id}h)`} />
    </svg>
  );
};

// 卡片本体：按槽位尺寸排版（全屏时整体 zoom 放大，内容零重排）
const TripCard: React.FC<{ t: Trip; frame: number; id: string }> = ({ t, frame, id }) => (
  <div style={{ position: 'relative', width: CW, height: CH, overflow: 'hidden' }}>
    <TripArt t={t} frame={frame} id={id} />
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(30,18,10,0) 45%, rgba(30,18,10,0.42) 100%)' }} />
    <div style={{ position: 'absolute', left: 26, bottom: 22, color: '#fffaf2' }}>
      <div style={{ ...type(13, 750, { caps: true }), letterSpacing: '0.2em', opacity: 0.85 }}>{t.country}</div>
      <div style={{ ...type(36, 760), letterSpacing: '-0.03em', marginTop: 4, textShadow: '0 1px 12px rgba(40,20,5,0.25)' }}>{t.place}</div>
      <div style={{ ...type(17, 500), marginTop: 6, opacity: 0.85 }}>{t.meta}</div>
    </div>
  </div>
);

// ───────────── 总览页 ─────────────
const Overview: React.FC<{ frame: number; ripple: (i: number) => { dx: number; dy: number; lit: number } }> = ({ frame, ripple }) => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', left: GX, right: 1920 - GX - 3 * CW - 2 * GAP, top: 112, display: 'flex', alignItems: 'flex-end', color: L.ink }}>
      <div>
        <div style={{ ...type(22, 750, { caps: true }), letterSpacing: '0.22em', color: L.accent }}>Wayfare</div>
        <div style={{ ...type(96, 760), letterSpacing: '-0.045em', marginTop: 14 }}>Saved trips</div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
        {['All', 'Upcoming', 'Past'].map((s, i) => (
          <div key={s} style={{
            ...type(28, 600), padding: '12px 26px', borderRadius: 999,
            background: i === 0 ? L.ink : alpha(L.ink, 0.06), color: i === 0 ? L.surface : L.ink2,
          }}>{s}</div>
        ))}
      </div>
    </div>
    {TRIPS.map((t, i) => {
      if (i === HERO) return null;
      const s = slotOf(i);
      const r = ripple(i);
      return (
        <div key={t.place} style={{
          position: 'absolute', left: s.x + r.dx, top: s.y + r.dy, width: CW, height: CH, borderRadius: R, overflow: 'hidden',
          boxShadow: softShadow(4, { color: L.shadow, strength: 1.2 }), opacity: mix(0.5, 1, r.lit),
          filter: r.lit < 0.999 ? `saturate(${mix(0.55, 1, r.lit).toFixed(3)})` : undefined,
        }}>
          <TripCard t={t} frame={frame} id={`sem${i}`} />
        </div>
      );
    })}
  </AbsoluteFill>
);

// 返回键 / 特写 chrome 的小图标
const Chevron: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Heart: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.4 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z" fill="#fffaf2" /></svg>
);

export const SharedElementMorph: React.FC = () => {
  const frame = useCurrentFrame();
  const raw = progress(frame);
  // 过冲段按 0.3 压缩：p 的 3% 过冲换算到卡片尺寸是 8%（全屏→小卡的差值大），压到 ≈2% 一次可见回弹
  const p = raw <= 1 ? raw : 1 + (raw - 1) * 0.3;
  const ps = Math.min(1, Math.max(0, p));

  // 预备：返回键按下 + 卡片整体轻吸（press 0→1→0）
  const press = ramp(frame, 22, 5, EASE.out) * (1 - ramp(frame, 27, 7, EASE.smooth));
  const chrome = 1 - ramp(frame, 28, 8, EASE.exit);
  const inhale = 1 - 0.015 * press;

  // 共享元素几何：全屏 → 槽位，位置 / 尺寸 / 圆角共用 p
  const w = mix(1920, CW, p) * inhale;
  const h = mix(1080, CH, p) * inhale;
  const x = mix(0, SLOT.x, p) + (mix(1920, CW, p) - w) / 2;
  const y = mix(0, SLOT.y, p) + (mix(1080, CH, p) - h) / 2;
  const r = mix(0, R, ps);
  const zoom = w / CW;

  // 背景后拉：1.035 → 1，原点 = 槽位中心（p=1 时严格对位）
  const bgScale = 1 + 0.035 * (1 - ps);

  // 邻卡：落座帧被径向推开（阻尼振荡），并由近及远错峰提亮
  const hc = { x: SLOT.x + CW / 2, y: SLOT.y + CH / 2 };
  const ripple = (i: number) => {
    const s = slotOf(i);
    const dx0 = s.x + CW / 2 - hc.x, dy0 = s.y + CH / 2 - hc.y;
    const dist = Math.hypot(dx0, dy0);
    const delay = dist / 260; // 涟漪传播：越远越晚（帧）
    const tt = frame - LAND - delay;
    const amp = tt < 0 ? 0 : 11 * Math.exp(-tt / 6) * Math.sin(tt / 2.6);
    const lit = ramp(frame, LAND - 4 + delay * 1.6, 14, EASE.out);
    return { dx: (dx0 / dist) * amp, dy: (dy0 / dist) * amp, lit };
  };

  // 落座后整幅极缓前推（相机，包住网格与卡片，不破坏对位）
  const cam = 1 + 0.012 * ramp(frame, 80, 60, EASE.smooth);
  const elev = mix(56, 4, ps);

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: '50% 55%' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${bgScale.toFixed(5)})`, transformOrigin: `${hc.x}px ${hc.y}px` }}>
          <Stage look={L} keyLight={{ x: 0.3, y: 0.05 }} fill={{ x: 0.9, y: 0.95 }} />
          <Overview frame={frame} ripple={ripple} />
        </div>

        {/* 槽位的"地面"：落座前一抹凹陷暗影，提示它要回到哪里 */}
        <div style={{
          position: 'absolute', left: SLOT.x, top: SLOT.y, width: CW, height: CH, borderRadius: R,
          background: alpha(L.ink, 0.06), boxShadow: `inset 0 2px 10px ${alpha(L.shadow, 0.12)}`,
          opacity: ps < 1 ? 1 : 0,
        }} />

        {/* 共享元素 */}
        <div style={{
          position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, overflow: 'hidden',
          boxShadow: p > 0.001 ? softShadow(elev, { color: L.shadow, strength: 1.4 }) : undefined,
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, zoom }}>
            <TripCard t={TRIPS[HERO]} frame={frame} id="semhero" />
          </div>
        </div>

        {/* 特写 chrome：返回键 / 收藏 / 行程按钮（只属于特写页，起飞前淡出） */}
        {chrome > 0 && (
          <AbsoluteFill style={{ opacity: chrome }}>
            <div style={{
              position: 'absolute', left: 96, top: 84, display: 'flex', alignItems: 'center', gap: 10,
              padding: '16px 30px 16px 20px', borderRadius: 999, color: '#fffaf2', ...type(32, 650),
              background: `rgba(255,250,242,${(0.16 + 0.22 * press).toFixed(3)})`,
              border: '1px solid rgba(255,250,242,0.35)', boxShadow: '0 8px 30px rgba(40,20,5,0.18)',
              transform: `scale(${(1 - 0.08 * press).toFixed(4)})`, transformOrigin: '30% 50%',
            }}>
              <Chevron size={34} color="#fffaf2" />
              Saved trips
            </div>
            <div style={{
              position: 'absolute', right: 96, top: 84, width: 72, height: 72, borderRadius: 36,
              background: 'rgba(255,250,242,0.16)', border: '1px solid rgba(255,250,242,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Heart size={34} /></div>
            <div style={{
              position: 'absolute', right: 96, bottom: 88, padding: '22px 40px', borderRadius: 999,
              background: L.accent, color: L.onAccent, ...type(32, 700), boxShadow: '0 14px 40px rgba(120,40,10,0.35)',
            }}>Plan itinerary →</div>
          </AbsoluteFill>
        )}
      </div>
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
