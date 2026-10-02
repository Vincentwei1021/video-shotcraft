// scanline-assemble-flyin — 扫描装配组件飞入：开场只有一张蓝图画板（网格 + 虚线槽位），一条扫描线自上而下
// 匀速掠过；扫描线走到哪个槽位，该处组件就从画外飞入、过冲贴合进槽，落位瞬间四角闪出咬合角标——扫完整页恰好装完。
//
// 第二轮重设计（午夜蓝图 · AI 生成落地页）：
// - look = midnight（深蓝 · 电光蓝 · 青）。画面是一张 1640×860 的蓝图画板：120px 主网格 + 24px 细网格、
//   画板尺寸标注、每个组件的虚线槽位（带「NAV 1640×96」类小标）——第 1 帧就有完整的"施工图"，不是空黑屏。
// - 扫描线是施工进度条：电光蓝光芯 + 身后被"刷出来"的页面底色（扫过之处蓝图变成真实页面表面）+ 网格余晖。
// - 七个组件为镜头设计：video-shotcraft 的落地页——导航（镜刻标志 + 字标）、徽章、120px 两行 H1「Shoot the / launch film.」
//  （渐变强调词）、正文、CTA、样片镜头卡（程序化银河：确定性星点 + 银河带 + 山脊剪影）、三项数据。各自从所在方位的画外飞入：
//   位移 380–900px、±2–7° 起始旋转，EASE.overshoot 过冲贴合；飞行中按速度沿方向 SpeedBlur，落定清零。
// - 落定后：槽位虚线消失、四角咬合角标 2→12f 闪现收掉；全部装完后蓝图网格退到 30%、银河卡亮起，
//   状态行停表「BUILT IN 2.9 s」。全程 1.000→1.03 极缓推镜。
//
// 时间表（30fps，共 156f）：
//   0–8     蓝图画板 + 槽位在场，状态行亮起
//   8–92    扫描线匀速 −20→880（84f）；组件在扫描线越过槽位下缘时落位（飞行 14f 提前起飞，≥4f 间隔）：
//           NAV ~19f · BADGE ~29f · H1 ~54f · BODY ~66f · MEDIA ~75f · CTA ~79f · STATS ~87f
//   92–104  扫描线淡出；蓝图退场；银河卡亮起；状态行停表
//   104–156 hold：完整落地页海报，极缓推镜
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, glow } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const SCANLINE_ASSEMBLE_FLYIN_DURATION = 156;

const L = LOOKS.midnight;
const MONO = FONT.mono;
const AX = 140; // 画板（帧坐标）
const AY = 150;
const AW = 1640;
const AH = 860;

// 扫描线（画板坐标）：严格匀速
const SCAN0 = 8;
const SCAN1 = 92;
const Y0 = -20;
const Y1 = 880;
const scanY = (f: number) => Y0 + (Y1 - Y0) * Math.min(1, Math.max(0, (f - SCAN0) / (SCAN1 - SCAN0)));
const frameAtY = (y: number) => SCAN0 + ((y - Y0) / (Y1 - Y0)) * (SCAN1 - SCAN0);
const FLIGHT = 14; // 飞行帧数（提前起飞，落位 = 扫描线越过槽位下缘）

// ───────────── 组件飞入方案：box = 槽位（画板坐标），from = 画外起点位移，rot = 起始旋转 ─────────────
type Plan = { key: string; name: string; box: [number, number, number, number]; from: [number, number]; rot: number; land: number };
const PLAN: Plan[] = (() => {
  const ps: Plan[] = [
    { key: 'nav', name: 'NAV', box: [0, 0, AW, 96], from: [0, -260], rot: 0, land: 0 },
    { key: 'badge', name: 'BADGE', box: [72, 150, 372, 56], from: [-620, -60], rot: -7, land: 0 },
    { key: 'h1', name: 'H1', box: [72, 228, 820, 250], from: [-980, 90], rot: -4, land: 0 },
    { key: 'body', name: 'BODY', box: [72, 508, 760, 96], from: [-860, 220], rot: -2, land: 0 },
    { key: 'media', name: 'MEDIA', box: [940, 140, 628, 560], from: [900, 80], rot: 6, land: 0 },
    { key: 'cta', name: 'CTA', box: [72, 640, 560, 76], from: [-120, 460], rot: 3, land: 0 },
    { key: 'stats', name: 'STATS', box: [72, 752, 1496, 80], from: [140, 420], rot: -2, land: 0 },
  ];
  let prev = -99;
  for (const p of [...ps].sort((a, b) => a.box[1] + a.box[3] - (b.box[1] + b.box[3]))) {
    p.land = Math.max(frameAtY(p.box[1] + p.box[3]), prev + 4);
    prev = p.land;
  }
  return ps;
})();
const P = Object.fromEntries(PLAN.map((p) => [p.key, p])) as Record<string, Plan>;
const LAST_LAND = Math.max(...PLAN.map((p) => p.land));

// 位姿（帧的纯函数，便于中心差分求速度）
const poseAt = (p: Plan, f: number) => {
  const a = ramp(f, p.land - FLIGHT, FLIGHT, EASE.overshoot); // 0→1，过冲 ~8% 再回落
  return { a, x: mix(p.from[0], 0, a), y: mix(p.from[1], 0, a), r: mix(p.rot, 0, a) };
};

// ───────────── 确定性伪随机 ─────────────
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const STARS = Array.from({ length: 150 }, (_, i) => ({
  x: rnd(i * 3.1) * 628, y: rnd(i * 7.7 + 2) * 430, s: 0.8 + rnd(i * 5.3 + 9) ** 3 * 3.2, a: 0.35 + rnd(i * 2.9 + 4) * 0.65,
}));
// 银河带里的密集微星：沿 −32° 带轴分布，离轴距离取近似高斯（三个均匀数求和）
const BAND = Array.from({ length: 320 }, (_, i) => {
  const u = rnd(i * 4.3 + 17) * 900 - 140;
  const off = (rnd(i * 1.7 + 3) + rnd(i * 2.3 + 5) + rnd(i * 3.7 + 7) - 1.5) * 70;
  const ang = (-32 * Math.PI) / 180;
  return { x: 336 + (u - 380) * Math.cos(ang) - off * Math.sin(ang), y: 222 + (u - 380) * Math.sin(ang) + off * Math.cos(ang), s: 0.5 + rnd(i * 6.1) * 1.1, a: 0.25 + rnd(i * 8.3) * 0.55 };
});

// ───────────── 组件内容 ─────────────
const Nav: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 72px', borderBottom: `1px solid ${L.line}`, fontFamily: FONT.sans }}>
    {/* 镜刻标志（暗底反白版；svg 四周 16/128 留白，左移 7px 让可见框对齐 72）+ 字标 */}
    <ShotcraftMark size={56} tone="dark" style={{ marginLeft: -7 }} />
    <div style={{ marginLeft: 10, font: `700 32px ${BRAND.font}`, letterSpacing: '0.01em', color: L.ink, whiteSpace: 'nowrap' }}>{BRAND.name}</div>
    <div style={{ marginLeft: 'auto', display: 'flex', gap: 44, font: `550 26px ${FONT.sans}`, color: L.ink2 }}>
      <span>Recipes</span>
      <span>Gallery</span>
      <span>Docs</span>
    </div>
    <div style={{ marginLeft: 48, height: 52, padding: '0 26px', borderRadius: 26, background: alpha(L.ink, 0.08), border: `1px solid ${alpha(L.ink, 0.16)}`, display: 'flex', alignItems: 'center', font: `650 24px ${FONT.sans}`, color: L.ink }}>
      Get the skill
    </div>
  </div>
);

const Badge: React.FC = () => (
  <div style={{ position: 'absolute', left: 0, top: 0, height: 56, padding: '0 24px 0 18px', borderRadius: 28, display: 'flex', alignItems: 'center', gap: 14, background: alpha(L.accent2, 0.1), border: `1px solid ${alpha(L.accent2, 0.35)}`, font: `600 26px ${FONT.sans}`, color: L.ink, whiteSpace: 'nowrap' }}>
    <span style={{ padding: '4px 10px', borderRadius: 8, background: L.accent2, color: L.onAccent, font: `750 20px ${MONO}`, letterSpacing: '0.06em' }}>NEW</span>
    Motion workbench
  </div>
);

const H1: React.FC = () => (
  <div style={{ position: 'absolute', left: -4, top: 0, font: `820 120px ${FONT.sans}`, letterSpacing: '-0.048em', lineHeight: 1.02, color: L.ink, whiteSpace: 'nowrap' }}>
    Shoot the
    <br />
    <span style={{ backgroundImage: `linear-gradient(90deg, ${L.accent} 0%, #9db8ff 55%, ${L.accent2} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>launch film.</span>
  </div>
);

const Body: React.FC = () => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: 760, font: `450 34px ${FONT.sans}`, lineHeight: 1.36, color: L.ink2, letterSpacing: '-0.012em' }}>
    One prompt to a finished promo. Your agent lines up every cut for you.
  </div>
);

const Cta: React.FC = () => (
  <div style={{ position: 'absolute', left: 0, top: 0, display: 'flex', alignItems: 'center', gap: 34, fontFamily: FONT.sans }}>
    <div style={{ height: 76, padding: '0 38px', borderRadius: 38, background: `linear-gradient(180deg, #7aa2ff 0%, ${L.accent} 100%)`, color: L.onAccent, display: 'flex', alignItems: 'center', font: `700 30px ${FONT.sans}`, letterSpacing: '-0.01em', boxShadow: `0 14px 34px -12px ${alpha(L.accent, 0.8)}, inset 0 1px 0 rgba(255,255,255,0.45)` }}>
      Start shooting
    </div>
    <div style={{ font: `600 30px ${FONT.sans}`, color: L.ink, display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width={30} height={30} viewBox="0 0 30 30"><circle cx={15} cy={15} r={13.5} fill="none" stroke={L.ink2} strokeWidth={2} /><path d="M12 9.5 L20.5 15 L12 20.5 Z" fill={L.ink} /></svg>
      Watch the film
    </div>
  </div>
);

const Media: React.FC<{ lit: number }> = ({ lit }) => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', background: 'linear-gradient(180deg, #070b1d 0%, #111a44 48%, #2a1d4a 74%, #0b0a18 100%)', boxShadow: `inset 0 0 0 1px ${alpha('#b4c6ff', 0.14)}, inset 0 1px 0 ${alpha('#ffffff', 0.12)}` }}>
    {/* 银河带：斜向椭圆光 + 暖色核心 + 暗尘带 */}
    <div style={{ position: 'absolute', left: -120, top: 30, width: 880, height: 300, transform: 'rotate(-32deg)', borderRadius: '50%', background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(196,210,255,${(0.32 + 0.22 * lit).toFixed(3)}) 0%, rgba(150,170,255,0.12) 45%, rgba(150,170,255,0) 72%)` }} />
    <div style={{ position: 'absolute', left: 140, top: 150, width: 380, height: 150, transform: 'rotate(-32deg)', borderRadius: '50%', background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,206,170,${(0.28 + 0.25 * lit).toFixed(3)}) 0%, rgba(255,170,140,0) 70%)` }} />
    <div style={{ position: 'absolute', left: 40, top: 150, width: 640, height: 46, transform: 'rotate(-32deg)', borderRadius: '50%', background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(8,8,24,0.5) 0%, rgba(8,8,24,0) 70%)' }} />
    <svg width={628} height={560} style={{ position: 'absolute', left: 0, top: 0 }}>
      {BAND.map((s, i) => (
        <circle key={`b${i}`} cx={s.x} cy={s.y} r={s.s} fill={i % 5 ? '#e6ecff' : '#ffd9c2'} opacity={s.a * (0.7 + 0.3 * lit)} />
      ))}
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#ffffff" opacity={s.a * (0.75 + 0.25 * lit)} />
      ))}
      {/* 山脊剪影 + 轮廓光 */}
      <path d="M0 470 L70 430 L120 446 L190 392 L250 428 L320 380 L380 420 L440 398 L520 440 L580 418 L628 436 L628 560 L0 560 Z" fill="#05060f" />
      <path d="M0 470 L70 430 L120 446 L190 392 L250 428 L320 380 L380 420 L440 398 L520 440 L580 418 L628 436" fill="none" stroke={alpha('#9db8ff', 0.35)} strokeWidth={1.5} />
    </svg>
    <div style={{ position: 'absolute', left: 26, bottom: 24, padding: '8px 14px', borderRadius: 10, background: alpha('#0b1226', 0.7), border: `1px solid ${L.line}`, font: `600 22px ${MONO}`, color: L.ink2 }}>
      SHOT 04 · 2.5D push-in · 120f
    </div>
  </div>
);

const Stats: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, borderTop: `1px solid ${L.line}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 18, paddingRight: 24 }}>
    {[
      ['1', 'prompt to a promo'],
      ['30 fps', 'Remotion render'],
      ['0', 'keyframes by hand'],
    ].map(([n, l], i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <span style={{ font: `780 52px ${FONT.sans}`, letterSpacing: '-0.04em', color: i === 0 ? L.accent : L.ink, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
        <span style={{ font: `500 26px ${FONT.sans}`, color: L.ink2 }}>{l}</span>
      </div>
    ))}
  </div>
);

// 落位咬合角标：槽位外扩 10px、臂长 22px 的电光蓝 L 角
const SnapTicks: React.FC<{ w: number; h: number; o: number; g: number }> = ({ w, h, o, g }) => {
  if (o <= 0.01) return null;
  const a = 22;
  const d = [
    `M${-g} ${-g + a}V${-g}H${-g + a}`,
    `M${w + g - a} ${-g}H${w + g}V${-g + a}`,
    `M${w + g} ${h + g - a}V${h + g}H${w + g - a}`,
    `M${-g + a} ${h + g}H${-g}V${h + g - a}`,
  ].join('');
  return (
    <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o, filter: `drop-shadow(0 0 6px ${alpha(L.accent, 0.9)})` }}>
      <path d={d} fill="none" stroke="#a9c1ff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const ScanlineAssembleFlyin: React.FC = () => {
  const frame = useCurrentFrame();
  const ly = scanY(frame);
  const lineOn = ramp(frame, SCAN0 - 5, 6, EASE.out) * (1 - ramp(frame, SCAN1, 10, EASE.exit));
  const done = ramp(frame, LAST_LAND + 4, 12, EASE.out);
  const placed = PLAN.filter((p) => frame >= p.land).length;
  const push = 1 + 0.03 * ramp(frame, 0, SCANLINE_ASSEMBLE_FLYIN_DURATION, EASE.swift);
  const clock = Math.min(frame, LAST_LAND + 4) / 30; // 停表：装完那一刻定格
  const lit = ramp(frame, LAST_LAND + 2, 20, EASE.out);
  const blueprint = mix(1, 0.3, done);

  const Fly: React.FC<{ p: Plan; children: React.ReactNode }> = ({ p, children }) => {
    const pose = poseAt(p, frame);
    const start = p.land - FLIGHT;
    if (frame < start) return null;
    const v0 = poseAt(p, frame - 0.5);
    const v1 = poseAt(p, frame + 0.5);
    const moving = frame < p.land + 4;
    const [bx, by, bw, bh] = p.box;
    const tick = ramp(frame, p.land + 1, 3, EASE.out) * (1 - ramp(frame, p.land + 5, 9, EASE.out));
    const tickGap = 10 + 10 * (1 - ramp(frame, p.land + 1, 6, EASE.snappy)); // 角标从外 20px 咬进 10px
    return (
      <SpeedBlur vx={moving ? v1.x - v0.x : 0} vy={moving ? v1.y - v0.y : 0} amount={0.32} max={18}>
        <div style={{
          position: 'absolute', left: bx, top: by, width: bw, height: bh,
          opacity: ramp(frame, start, 4, EASE.out),
          transform: `translate(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px) rotate(${pose.r.toFixed(3)}deg)`,
        }}>
          {children}
          {p.key !== 'nav' && <SnapTicks w={bw} h={bh} o={tick} g={tickGap} />}
        </div>
      </SpeedBlur>
    );
  };

  // 网格（帧坐标全屏）：24px 细网格 + 120px 主网格，蓝图色
  const grid = (c: string, cm: string) =>
    `repeating-linear-gradient(0deg, ${cm} 0 1.5px, transparent 1.5px 120px), repeating-linear-gradient(90deg, ${cm} 0 1.5px, transparent 1.5px 120px), ` +
    `repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, ${c} 0 1px, transparent 1px 24px)`;
  const lyF = AY + ly; // 扫描线帧坐标

  return (
    <AbsoluteFill>
      <Stage look={L} keyLight={{ x: 0.62, y: 0.0 }} fill={{ x: 0.1, y: 0.95 }} intensity={0.85} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 52%' }}>
        {/* ── 蓝图网格（装完后退到 30%）+ 扫描线身后被照亮的一段 ── */}
        <div style={{ position: 'absolute', inset: -40, opacity: blueprint, background: grid(alpha('#8fb0ff', 0.045), alpha('#8fb0ff', 0.085)), backgroundPosition: '20px 30px' }} />
        {lineOn > 0.01 && (
          <div style={{
            position: 'absolute', inset: -40, opacity: lineOn, background: grid(alpha(L.accent, 0.22), alpha('#a9c1ff', 0.4)), backgroundPosition: '20px 30px',
            WebkitMaskImage: `linear-gradient(180deg, transparent ${lyF - 180 + 40}px, #000 ${lyF + 40}px, transparent ${lyF + 42}px)`,
            maskImage: `linear-gradient(180deg, transparent ${lyF - 180 + 40}px, #000 ${lyF + 40}px, transparent ${lyF + 42}px)`,
          }} />
        )}

        {/* ── 状态行（画板上方）── */}
        <div style={{ position: 'absolute', left: AX, top: 66, width: AW, height: 48, display: 'flex', alignItems: 'center', font: `600 30px ${MONO}`, color: L.ink, opacity: ramp(frame, 0, 10, EASE.out) }}>
          <span style={{ color: done > 0.5 ? L.accent2 : L.accent, letterSpacing: '0.06em', textShadow: done > 0.5 ? glow(L.accent2, 0.5) : 'none' }}>
            {done > 0.5 ? '✓ BUILT' : '▸ BUILDING'}
          </span>
          <span style={{ marginLeft: 18, color: L.ink3, fontWeight: 500 }}>video-shotcraft / index</span>
          <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
            <span style={{ color: L.ink3, fontWeight: 500 }}>BLOCKS </span>
            <span style={{ color: placed === PLAN.length ? L.accent2 : L.ink }}>{String(placed).padStart(2, '0')}</span>
            <span style={{ color: L.ink3 }}> / {String(PLAN.length).padStart(2, '0')}</span>
            <span style={{ color: L.ink3, fontWeight: 500, marginLeft: 34 }}>{clock.toFixed(1)} s</span>
          </span>
        </div>

        {/* ── 画板 ── */}
        <div style={{ position: 'absolute', left: AX, top: AY, width: AW, height: AH }}>
          {/* 页面表面：扫描线扫过之处由蓝图"刷"成页面底色 */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 28,
            background: `linear-gradient(180deg, ${alpha('#101a36', 0.96)} 0%, ${alpha('#0b1328', 0.96)} 100%)`,
            boxShadow: `0 40px 120px -40px ${alpha('#000208', 0.9)}, inset 0 0 0 1px ${alpha('#a9c1ff', 0.12)}, inset 0 1px 0 ${alpha('#ffffff', 0.08)}`,
            WebkitMaskImage: `linear-gradient(180deg, #000 ${ly - 30}px, transparent ${ly + 2}px)`,
            maskImage: `linear-gradient(180deg, #000 ${ly - 30}px, transparent ${ly + 2}px)`,
          }} />
          {/* 画板外框 + 尺寸标注（蓝图元素，装完后退场） */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 28, border: `1.5px dashed ${alpha('#a9c1ff', 0.3)}`, opacity: blueprint }} />
          <div style={{ position: 'absolute', left: 0, top: -30, width: AW, display: 'flex', alignItems: 'center', gap: 14, opacity: blueprint * 0.9, font: `500 20px ${MONO}`, color: alpha('#a9c1ff', 0.55) }}>
            <div style={{ flex: 1, height: 1, background: alpha('#a9c1ff', 0.3) }} />1640<div style={{ flex: 1, height: 1, background: alpha('#a9c1ff', 0.3) }} />
          </div>
          {/* 槽位：虚线框 + 小标（纹理），组件落位时消失 */}
          {PLAN.map((p) => {
            const [bx, by, bw, bh] = p.box;
            const o = (1 - ramp(frame, p.land - 2, 4, EASE.out)) * blueprint;
            if (o <= 0.01) return null;
            return (
              <div key={p.key} style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, opacity: o, borderRadius: 12, border: `1.5px dashed ${alpha('#a9c1ff', 0.5)}`, background: alpha('#5b8cff', 0.06) }}>
                <div style={{ position: 'absolute', left: 14, top: 10, font: `600 18px ${MONO}`, color: alpha('#a9c1ff', 0.75), letterSpacing: '0.08em' }}>
                  {p.name} <span style={{ opacity: 0.6 }}>{bw}×{bh}</span>
                </div>
              </div>
            );
          })}

          {/* 组件 */}
          <Fly p={P.nav}><Nav /></Fly>
          <Fly p={P.badge}><Badge /></Fly>
          <Fly p={P.h1}><H1 /></Fly>
          <Fly p={P.body}><Body /></Fly>
          <Fly p={P.media}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 26, boxShadow: `0 30px 80px -30px ${alpha('#000208', 0.95)}, 0 0 ${(60 * lit).toFixed(1)}px ${alpha(L.accent, 0.22 * lit)}` }} />
            <Media lit={lit} />
          </Fly>
          <Fly p={P.cta}><Cta /></Fly>
          <Fly p={P.stats}><Stats /></Fly>

          {/* 扫描线：光芯 + 柔辉 + 两端渐隐（画板宽 + 两侧各出 60px） */}
          {lineOn > 0.01 && (
            <div style={{
              position: 'absolute', left: -60, width: AW + 120, top: ly - 2, height: 4, opacity: lineOn,
              background: 'linear-gradient(90deg, transparent 0%, #dfe8ff 8%, #ffffff 50%, #dfe8ff 92%, transparent 100%)',
              boxShadow: `0 0 12px ${alpha(L.accent, 0.95)}, 0 0 36px ${alpha(L.accent, 0.6)}, 0 0 90px ${alpha(L.accent, 0.35)}`,
            }} />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
