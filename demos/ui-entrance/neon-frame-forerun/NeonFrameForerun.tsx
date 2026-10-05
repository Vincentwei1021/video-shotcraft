// neon-frame-forerun —— 霓虹框先行：框自左缘中点两头奔画圈出位置 → 框内页面由暗转亮 → 组件从 3D 上空带软影错峰贴落
// → 背景霓虹群终段熄灭让位。
//
// 第二轮重设计（极光 · 霓虹隧道里的工作台首页）：
// - look = aurora（紫粉夜）。霓虹框是紫→粉渐变的"灯管"：四层描边叠出辉光（宽软晕 / 中晕 / 色芯 / 白热芯），
//   两颗白热亮头从左缘中点出发，加速—制动地沿上下两路奔跑，在右缘中点相撞闪一下。
// - 背景不再是随机斜框：是同一个框在纵深里的 7 层回声（translateZ 递退、逐层放大），组成一条通往页面的霓虹隧道——
//   框一合拢，隧道由近到远逐层"打火"亮起（荧光管启辉的确定性闪烁）；终段从隧道中段先熄、再向两端熄灭，把亮度让给主角。
// - 页面是"为镜头设计"的 video-shotcraft 工作台首页：只留品牌 / 4 项导航 / 64px 问候 / 3 张大数字卡 / 4 行镜头任务，字号 ≥30px。
//   组件真的在 3D 里悬空（preserve-3d + translateZ 110–170px），面板上落同形软影（越高越大越虚越淡），
//   按"侧栏自上而下 → 主区自上而下"错峰贴落；贴落进程与页面点亮同步推进、晚 ~20f 收尾。
// - 机位：强透视斜置（rotateY -30°）开场，随页面点亮缓和到 -12°（EASE.out 长减速），hold 段继续极缓转 1.5°。
//
// 时间表（30fps，共 140f）：
//   0–2     预备：暗场 + 左缘中点一颗亮点
//   2–22    框奔画 20f（swift：起步快、在右缘中点制动相撞），22 撞点闪光
//   20–44   隧道回声由近到远逐层打火亮起
//   24–84   页面由暗转亮（lit，smooth）
//   30–104  组件贴落：每件 24f 加速下落 + 软着陆，落点 54→104 错峰（先密后疏）
//   0–96    机位缓和（EASE.out）；96–140 极缓续转
//   92–124  隧道中段先熄、两端后熄；框芯线退成发丝，框光并入面板辉光
//   124–140 hold
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const NEON_FRAME_FORERUN_DURATION = 140;

const L = LOOKS.aurora;
const NEON_A = '#b48cff'; // 灯管紫
const NEON_B = '#ff6fb5'; // 灯管粉

// 页面内配色（亮色 UI 放在暗场霓虹里，点亮才有落差）
const INK = '#17141f', INK2 = '#5a5568', INK3 = '#9a95a8';
const HAIR = 'rgba(30,20,50,0.09)';
const ACC = '#7c5cf0';

const PW = 1440;
const PH = 840;
const PAD = 22; // 霓虹框在面板外的距离
const PERSP = 1600;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeFall = bezier(0.55, 0, 0.75, 0.95); // 加速下落、末端略收（软着陆）

// ───────────── 悬浮件：真 3D 抬高 + 面板上的同形软影 ─────────────
// h = 离面板高度（px，translateZ）；lit = 页面亮度（叶子节点上做 brightness，不破坏父级 3D）
const Float: React.FC<{ x: number; y: number; w: number; h: number; lit: number; vis: number; children: React.ReactNode }> = ({ x, y, w, h, lit, vis, children }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, transformStyle: 'preserve-3d' }}>
    {h > 0.5 && (
      <div style={{
        position: 'absolute', left: 0, top: 0, width: w,
        // 主光在左上：影子往右下偏，离得越高偏得越远、越大越虚越淡
        transform: `translate3d(${(h * 0.34).toFixed(2)}px, ${(h * 0.5).toFixed(2)}px, 0.5px) scale(${(1 + h * 0.0011).toFixed(4)})`,
        filter: `brightness(0) blur(${(2 + h * 0.12).toFixed(2)}px)`,
        opacity: (0.42 - h * 0.0016) * lit * vis, pointerEvents: 'none',
      }}>{children}</div>
    )}
    <div style={{ transform: `translateZ(${(h + 1).toFixed(2)}px)`, opacity: vis, filter: lit < 0.995 ? `brightness(${Math.max(0.04, lit).toFixed(3)})` : undefined }}>
      {children}
    </div>
  </div>
);

// ───────────── 页面组件 ─────────────
const Icon: React.FC<{ k: number; c: string; s?: number }> = ({ k, c, s = 30 }) => {
  const p = { fill: 'none', stroke: c, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={s} height={s} viewBox="0 0 20 20">
      {k === 0 && <path d="M3.5 9 L10 3.5 L16.5 9 V16.5 H3.5 Z M8 16.5 V12 H12 V16.5" {...p} />}
      {k === 1 && <path d="M3 11 L5.2 4.5 H14.8 L17 11 V16 H3 Z M3 11 H7.2 L8.3 12.8 H11.7 L12.8 11 H17" {...p} />}
      {k === 2 && <><circle cx={10} cy={10} r={7} {...p} /><path d="M7 10.2 L9.2 12.4 L13.2 8" {...p} /></>}
      {k === 3 && <><circle cx={10} cy={10} r={7} {...p} /><circle cx={10} cy={10} r={3} {...p} /></>}
    </svg>
  );
};

const NAV = ['Home', 'Inbox', 'My shots', 'Renders'];
const STATS: [string, string, string][] = [['Shots today', '6', '2 to tune'], ['Rendering', '3', 'Avg. 4m'], ['Films this week', '24', '+38%']];
const TASKS: [string, string, string, string][] = [
  ['Add shot: crash zoom', '#e5484d', 'Today', 'DW'],
  ['Sync cuts to the beat', '#f5a524', 'In progress', 'MK'],
  ['Capture the pricing page', '#e5484d', 'Blocked', 'JS'],
  ['Render launch film', '#7c5cf0', 'Fri', 'AL'],
];

type Part = { key: string; x: number; y: number; w: number; land: number; H: number; node: React.ReactNode };

// 落点（0..1 归一化到贴落窗口）：侧栏自上而下 → 主区自上而下，先密后疏
const PARTS: Part[] = (() => {
  const parts: Part[] = [];
  parts.push({
    key: 'brand', x: 40, y: 44, w: 280, land: 0.0, H: 150, node: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 品牌：镜刻标志（亮底版）+ video-shotcraft 字标 */}
        <ShotcraftMark size={48} tone="light" />
        <div style={{ fontFamily: BRAND.font, fontSize: 25, fontWeight: 700, color: INK, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{BRAND.name}</div>
      </div>
    ),
  });
  NAV.forEach((n, i) => parts.push({
    key: `nav${i}`, x: 28, y: 160 + i * 76, w: 270, land: 0.08 + i * 0.06, H: 130, node: (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, height: 62, padding: '0 18px', borderRadius: 14,
        background: i === 0 ? '#ffffff' : 'transparent', boxShadow: i === 0 ? `0 0 0 1px ${HAIR}, 0 2px 6px rgba(30,20,60,0.06)` : undefined,
      }}>
        <Icon k={i} c={i === 0 ? ACC : INK2} />
        <div style={{ fontSize: 31, fontWeight: i === 0 ? 650 : 500, color: i === 0 ? INK : INK2, letterSpacing: '-0.01em' }}>{n}</div>
        {i === 1 && <div style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 700, color: '#fff', background: ACC, borderRadius: 13, padding: '3px 11px', fontVariantNumeric: 'tabular-nums' }}>4</div>}
      </div>
    ),
  }));
  parts.push({
    key: 'hello', x: 384, y: 52, w: 960, land: 0.04, H: 170, node: (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 26 }}>
        <div style={{ fontSize: 66, fontWeight: 750, color: INK, letterSpacing: '-0.035em' }}>Good morning, Dana</div>
        <div style={{ fontSize: 30, color: INK3, fontWeight: 500 }}>Tue, Oct 14</div>
      </div>
    ),
  });
  STATS.forEach(([label, v, sub], i) => parts.push({
    key: `stat${i}`, x: 384 + i * 334, y: 176, w: 310, land: 0.2 + i * 0.07, H: 160, node: (
      <div style={{
        height: 188, borderRadius: 22, background: '#ffffff', padding: '24px 28px', boxSizing: 'border-box',
        boxShadow: `0 0 0 1px ${HAIR}, 0 1px 2px rgba(30,20,60,0.05), 0 10px 24px -14px rgba(30,20,60,0.18)`,
      }}>
        <div style={{ fontSize: 26, fontWeight: 550, color: INK2 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 10 }}>
          <div style={{ fontSize: 84, fontWeight: 750, color: i === 2 ? ACC : INK, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: i === 0 ? '#d93f44' : INK3 }}>{sub}</div>
        </div>
      </div>
    ),
  }));
  parts.push({
    key: 'today', x: 388, y: 404, w: 400, land: 0.42, H: 120, node: (
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.14em', color: INK3 }}>TODAY</div>
    ),
  });
  TASKS.forEach(([t, c, status, who], i) => parts.push({
    key: `task${i}`, x: 384, y: 450 + i * 88, w: 978, land: 0.5 + i * 0.12, H: 140, node: (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 22, height: 74, padding: '0 24px', borderRadius: 16, background: '#ffffff',
        boxShadow: `0 0 0 1px ${HAIR}, 0 1px 2px rgba(30,20,60,0.05)`,
      }}>
        <div style={{ width: 26, height: 26, borderRadius: 13, boxShadow: `inset 0 0 0 3px ${c}`, flex: 'none' }} />
        <div style={{ fontSize: 32, fontWeight: 550, color: INK, letterSpacing: '-0.015em' }}>{t}</div>
        <div style={{
          marginLeft: 'auto', fontSize: 24, fontWeight: 650, borderRadius: 10, padding: '5px 14px',
          color: status === 'Blocked' ? '#c2353b' : status === 'Today' ? ACC : INK2,
          background: status === 'Blocked' ? '#fde8e8' : status === 'Today' ? '#efeaff' : '#f1eff4',
        }}>{status}</div>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: ['#e9e3ff', '#ffe6f1', '#e3f0ff', '#fff0dc'][i], color: '#4b4560', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{who}</div>
      </div>
    ),
  }));
  return parts;
})();

// ───────────── 霓虹框几何 ─────────────
const FW = PW + PAD * 2;
const FH = PH + PAD * 2;
// 从左缘中点出发、先向上、顺时针一圈
const FRAME_D = `M 0 ${FH / 2} L 0 0 L ${FW} 0 L ${FW} ${FH} L 0 ${FH} Z`;
const PERIM = 2 * (FW + FH);
// 周长分数 u（从左缘中点顺时针）→ 坐标
const pointAt = (u: number): [number, number] => {
  let s = (((u % 1) + 1) % 1) * PERIM;
  const segs: [number, number, number, number][] = [[0, FH / 2, 0, 0], [0, 0, FW, 0], [FW, 0, FW, FH], [FW, FH, 0, FH], [0, FH, 0, FH / 2]];
  for (const [x1, y1, x2, y2] of segs) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (s <= len) return [x1 + ((x2 - x1) * s) / len, y1 + ((y2 - y1) * s) / len];
    s -= len;
  }
  return [0, FH / 2];
};

// 荧光管启辉 / 熄灭的确定性闪烁：t = 距启动帧的帧数
const STRIKE = [0, 0.7, 0.15, 0.9, 0.35, 1];
const strike = (f: number, on: number) => (f < on ? 0 : f - on >= STRIKE.length ? 1 : STRIKE[Math.floor(f - on)]);
const FADE = [1, 0.3, 0.8, 0.12, 0.4, 0];
const quench = (f: number, off: number) => (f < off ? 1 : f - off >= FADE.length ? 0 : FADE[Math.floor(f - off)]);

// 灯管：四层描边（宽软晕 / 中晕 / 色芯 / 白热芯），不用滤镜，便宜且锐
const Tube: React.FC<{ d: string; grad: string; dash?: string; offset?: number; a: number; core?: number; w?: number }> = ({ d, grad, dash, offset, a, core = 1, w = 1 }) => (
  <g fill="none" strokeLinejoin="miter" strokeDasharray={dash} strokeDashoffset={offset}>
    <path d={d} pathLength={dash ? 1000 : undefined} stroke={grad} strokeWidth={34 * w} opacity={0.07 * a} />
    <path d={d} pathLength={dash ? 1000 : undefined} stroke={grad} strokeWidth={14 * w} opacity={0.18 * a} />
    <path d={d} pathLength={dash ? 1000 : undefined} stroke={grad} strokeWidth={5 * w} opacity={0.9 * a} />
    <path d={d} pathLength={dash ? 1000 : undefined} stroke="#fff6fd" strokeWidth={1.6 * w} opacity={0.85 * a * core} />
  </g>
);

// 隧道回声：k=1..7，z 递退、逐层放大（屏上看是一圈圈更大的同形框）
const ECHO = Array.from({ length: 5 }, (_, i) => {
  const k = i + 1;
  const z = 320 * k;
  const g = 1.13 + 0.2 * k; // 屏上表观尺寸 / 面板
  return { k, z, s: (g * (PERSP + z)) / PERSP, on: 20 + i * 4, off: 94 + [2, 1, 0, 1, 2][i] * 7 + (i % 2) * 2 };
});

export const NeonFrameForerun: React.FC = () => {
  const frame = useCurrentFrame();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const gid = `nff${uid}`;

  // 框奔画：两颗亮头 2→22 帧从左缘中点上下分头跑，在右缘中点相撞
  const trace = ramp(frame, 2, 20, EASE.swift);
  const half = trace * 500; // 每路画了多少（pathLength 1000 的一半）
  const meet = ramp(frame, 21, 14, EASE.out); // 撞点闪光 0→1 衰减
  const flash = frame >= 21 ? (1 - meet) : 0;

  // 页面点亮：框合拢后页面才从黑里浮出（vis），再由暗转亮（lit）
  const vis = ramp(frame, 16, 14, EASE.out);
  const lit = ramp(frame, 24, 60, EASE.smooth);
  // 贴落窗口 30–104：每件 land（0..1）映射到落点帧 54..104，先密后疏
  const landFrame = (u: number) => 54 + EASE.out(u) * 50;
  const liftOf = (p: Part) => {
    const lf = landFrame(p.land);
    const q = clamp01((frame - (lf - 24)) / 24);
    return (1 - easeFall(q)) * p.H;
  };

  // 机位：强透视 → 缓和；hold 段极缓续转
  const settle = ramp(frame, 0, 96, EASE.out);
  const drift = ramp(frame, 90, 50, EASE.smooth);
  const rotY = mix(-30, -12, settle) + 1.5 * drift;
  const rotX = mix(10, 5, settle);
  const rotZ = mix(-7, -2.5, settle);
  const scale = mix(0.8, 0.88, settle) + 0.01 * drift;

  // 框芯线：点亮后退成发丝；框辉光并入面板 rim
  const frameCore = mix(1, 0.35, ramp(frame, 60, 40, EASE.smooth));
  const frameA = 1 - 0.35 * ramp(frame, 96, 30, EASE.smooth);
  const rim = ramp(frame, 40, 40, EASE.out) * (1 + 0.25 * ramp(frame, 100, 30, EASE.smooth));
  const stageI = 0.55 + 0.45 * ramp(frame, 18, 30, EASE.out) - 0.3 * ramp(frame, 96, 30, EASE.smooth);

  const heads = trace < 1 ? [pointAt(trace * 0.5), pointAt(1 - trace * 0.5)] : [];

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.05 }} fill={{ x: 0.85, y: 0.95 }} intensity={stageI} vignette={0.7} />

      <div style={{ position: 'absolute', inset: 0, perspective: PERSP, perspectiveOrigin: '50% 45%' }}>
        <div style={{
          position: 'absolute', left: (1920 - PW) / 2, top: (1080 - PH) / 2, width: PW, height: PH,
          transform: `scale(${scale.toFixed(4)}) rotateY(${rotY.toFixed(3)}deg) rotateX(${rotX.toFixed(3)}deg) rotateZ(${rotZ.toFixed(3)}deg)`,
          transformStyle: 'preserve-3d',
        }}>
          {/* 隧道回声：同形霓虹框在纵深里递退 */}
          {ECHO.map((e) => {
            const a = strike(frame, e.on) * quench(frame, e.off) * (0.42 - e.k * 0.06) * (0.85 + 0.15 * Math.sin(frame / 7 + e.k));
            if (a <= 0.002) return null;
            return (
              <svg key={e.k} width={FW} height={FH} viewBox={`0 0 ${FW} ${FH}`} style={{
                position: 'absolute', left: -PAD, top: -PAD, overflow: 'visible',
                transform: `translateZ(${-e.z}px) scale(${e.s.toFixed(4)})`,
              }}>
                <Tube d={FRAME_D} grad={e.k % 2 ? NEON_A : NEON_B} a={a} core={0.5} w={1.2 + e.k * 0.3} />
              </svg>
            );
          })}

          {/* 面板落地影 + rim 辉光（框光最终并入它） */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 18, transform: 'translateZ(-2px)',
            boxShadow: `0 40px 120px -10px rgba(4,1,12,0.85), -30px -10px 80px 6px ${alpha(NEON_A, 0.32 * rim)}, 30px 30px 90px 10px ${alpha(NEON_B, 0.26 * rim)}`,
            opacity: clamp01(trace * 2),
          }} />

          {/* 面板底板：由暗转亮 */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden', opacity: vis,
            background: 'linear-gradient(180deg, #faf9fc 0%, #f3f1f7 100%)',
            filter: lit < 0.995 ? `brightness(${Math.max(0.03, lit).toFixed(3)})` : undefined,
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 330, background: '#efecf4', boxShadow: `inset -1px 0 0 ${HAIR}` }} />
            {/* 霓虹从左缘把页面点亮：一层自左向右退去的冷紫暗罩 */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(90deg, rgba(40,20,90,0) ${mix(-40, 100, lit)}%, rgba(40,20,90,0.6) ${mix(0, 160, lit)}%)`,
            }} />
          </div>

          {/* 组件：真 3D 悬空 + 同形软影，错峰贴落 */}
          <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
            {PARTS.map((p) => (
              <Float key={p.key} x={p.x} y={p.y} w={p.w} h={liftOf(p)} lit={lit} vis={vis}>{p.node}</Float>
            ))}
          </div>

          {/* 霓虹主框：左缘中点两头奔画 */}
          <svg width={FW} height={FH} viewBox={`0 0 ${FW} ${FH}`} style={{ position: 'absolute', left: -PAD, top: -PAD, overflow: 'visible', transform: 'translateZ(2px)' }}>
            <defs>
              <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={FW} y2={FH}>
                <stop offset="0" stopColor={NEON_A} />
                <stop offset="0.55" stopColor="#e07ae0" />
                <stop offset="1" stopColor={NEON_B} />
              </linearGradient>
              <radialGradient id={`${gid}h`}>
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.25" stopColor="#ffe6fb" stopOpacity={0.9} />
                <stop offset="1" stopColor={NEON_B} stopOpacity={0} />
              </radialGradient>
            </defs>
            {trace > 0 && (
              <>
                <Tube d={FRAME_D} grad={`url(#${gid})`} dash={`${half} 1000`} offset={0} a={frameA} core={frameCore} />
                <Tube d={FRAME_D} grad={`url(#${gid})`} dash={`${half} 1000`} offset={-(1000 - half)} a={frameA} core={frameCore} />
              </>
            )}
            {/* 起跑亮点（第 0 帧就在）与奔跑亮头 */}
            {frame < 3 && <circle cx={0} cy={FH / 2} r={34} fill={`url(#${gid}h)`} />}
            {heads.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={46} fill={`url(#${gid}h)`} />)}
            {/* 右缘中点相撞闪光 */}
            {flash > 0.01 && <circle cx={FW} cy={FH / 2} r={60 + 160 * meet} fill={`url(#${gid}h)`} opacity={flash} />}
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
