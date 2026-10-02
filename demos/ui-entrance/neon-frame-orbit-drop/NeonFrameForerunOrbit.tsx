// neon-frame-orbit-drop —— 霓虹框先行描框，镜头绕页面从左侧弧线环绕到右侧，页面全部组件**同帧**从空中贴合。
//
// 第二轮重设计（午夜蓝 · 悬浮仪表盘的环绕揭幕）：
// - look = midnight（深蓝夜 · 电光蓝 + 青）。与姊妹镜 neon-frame-forerun（紫粉霓虹隧道 + 亮色工作台）刻意拉开：
//   这里是暗色玻璃质的数据仪表盘「Signal」，霓虹是蓝→青的冷光。
// - 真 3D 场景：面板、悬空组件、地面网格、背景竖直光柱都在同一个 preserve-3d 世界里，镜头一转，
//   光柱（远）、面板（中）、悬空组件（近）三层视差同时出现——环绕不再只是"一块板在转"。
// - 命门（卡片判例）：全部组件同帧离地、同帧下落、同帧贴合，零错峰。开场组件就悬在 150–210px 高处，
//   镜头环绕的前半程让观众看清"层"，环绕行程正中全体加速落下；贴合那一帧霓虹框闪一次（全片唯一的"咔"），
//   收尾时图表折线描出、背景光柱让位熄灭。
// - 版式为镜头设计：120px 主数字 + 面积图、三张 KPI、渠道条形榜、目标环——字号 ≥26px，主信息 ≥56px。
//
// 时间表（30fps，共 150f）：
//   0–14    描框 14f（左缘中点两头奔画），面板 6–30 由暗转亮
//   0–124   环绕：rotateY +36° → −24°（smooth 不对称 in-out，起止无速度突变），中段略推近
//   0–52    组件悬空（150–210px，同帧），随环绕呈现分层视差
//   52–76   全体同帧贴落 24f（加速下落 + 软着陆）；76 贴合帧：霓虹框闪光 + 面板辉光脉冲
//   18–60   面积图折线在悬空中描出（悬空段画面就完整）；76 后终点光点呼吸
//   96–128  背景光柱由中间向两边熄灭让位
//   124–150 hold 26f
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha } from '../../_fixtures/Look';

export const NEON_FRAME_FORERUN_ORBIT_DURATION = 150;

const L = LOOKS.midnight;
const NEON_A = '#4f7dff'; // 电光蓝
const NEON_B = '#38e1d2'; // 青

// 面板内（暗色玻璃 UI）
const INK = '#eef3ff', INK2 = '#9aa8c7', INK3 = '#5f6d8c';
const CARD = 'linear-gradient(180deg, #17213a 0%, #121a2e 100%)';
const HAIR = 'rgba(150,180,255,0.14)';

const PW = 1440;
const PH = 840;
const PAD = 22;
const PERSP = 1700;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeFall = bezier(0.55, 0, 0.75, 0.95); // 加速下落、末端略收

const DROP0 = 52; // 全体起落帧
const DROP_DUR = 24; // 全体贴合 = 76

// ───────────── 悬浮件：真 3D 抬高 + 同形软影 ─────────────
const Float: React.FC<{ x: number; y: number; w: number; h: number; children: React.ReactNode }> = ({ x, y, w, h, children }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, transformStyle: 'preserve-3d' }}>
    {h > 0.5 && (
      <div style={{
        position: 'absolute', left: 0, top: 0, width: w,
        transform: `translate3d(${(h * 0.12).toFixed(2)}px, ${(h * 0.42).toFixed(2)}px, 0.5px) scale(${(1 + h * 0.001).toFixed(4)})`,
        filter: `brightness(0) blur(${(3 + h * 0.11).toFixed(2)}px)`,
        opacity: 0.75 - h * 0.0022, pointerEvents: 'none',
      }}>{children}</div>
    )}
    <div style={{ transform: `translateZ(${(h + 1).toFixed(2)}px)` }}>{children}</div>
  </div>
);

const card = (h: number, extra?: React.CSSProperties): React.CSSProperties => ({
  height: h, borderRadius: 24, background: CARD, boxSizing: 'border-box',
  boxShadow: `inset 0 0 0 1px ${HAIR}, inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 40px -20px rgba(0,0,0,0.8)`,
  ...extra,
});

// 面积图数据（确定性）
const SERIES = [0.22, 0.3, 0.27, 0.38, 0.35, 0.46, 0.43, 0.52, 0.5, 0.61, 0.58, 0.7, 0.68, 0.79, 0.86];
const CH_W = 780, CH_H = 170;
const chartPts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * CH_W, CH_H - v * CH_H] as const);
const CHART_D = chartPts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

const Chart: React.FC<{ draw: number; id: string; pulse: number }> = ({ draw, id, pulse }) => {
  const [ex, ey] = chartPts[chartPts.length - 1];
  return (
    <svg width={CH_W} height={CH_H + 10} viewBox={`0 -5 ${CH_W} ${CH_H + 10}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={NEON_A} stopOpacity={0.38} />
          <stop offset="1" stopColor={NEON_A} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={NEON_A} />
          <stop offset="1" stopColor={NEON_B} />
        </linearGradient>
        <clipPath id={`${id}c`}><rect x={-10} y={-10} width={(CH_W + 20) * draw} height={CH_H + 30} /></clipPath>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={CH_W} y1={CH_H * g} y2={CH_H * g} stroke={HAIR} strokeWidth={1.5} strokeDasharray="4 8" />)}
      <g clipPath={`url(#${id}c)`}>
        <path d={`${CHART_D} L ${CH_W} ${CH_H} L 0 ${CH_H} Z`} fill={`url(#${id}a)`} />
        <path d={CHART_D} fill="none" stroke={`url(#${id}l)`} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
      </g>
      {draw > 0.98 && (
        <g>
          <circle cx={ex} cy={ey} r={14 + 16 * pulse} fill={alpha(NEON_B, 0.3 * (1 - pulse))} />
          <circle cx={ex} cy={ey} r={8} fill={NEON_B} stroke="#0d1426" strokeWidth={3} />
        </g>
      )}
    </svg>
  );
};

type Part = { key: string; x: number; y: number; w: number; H: number; node: (f: number, id: string) => React.ReactNode };

const KPIS: [string, string, string, boolean][] = [['Active users', '128.4k', '+9.1%', true], ['Conversion', '6.2%', '+0.8 pt', true], ['Churn', '1.9%', '−0.3 pt', true]];
const CHANNELS: [string, number, string][] = [['Organic search', 0.86, '$1.94M'], ['Partners', 0.58, '$1.31M'], ['Paid social', 0.34, '$0.77M']];

const PARTS: Part[] = [
  {
    key: 'top', x: 44, y: 34, w: 1352, H: 180, node: () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, height: 64 }}>
        <svg width={44} height={44} viewBox="0 0 44 44">
          <rect width={44} height={44} rx={13} fill={NEON_A} />
          <path d="M10 27 L17 20 L23 25 L34 14" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ fontSize: 34, fontWeight: 750, color: INK, letterSpacing: '-0.02em', marginRight: 28 }}>Signal</div>
        {['Overview', 'Funnels', 'Cohorts'].map((t, i) => (
          <div key={t} style={{
            fontSize: 28, fontWeight: i === 0 ? 650 : 500, color: i === 0 ? INK : INK2, padding: '8px 22px', borderRadius: 14,
            background: i === 0 ? 'rgba(91,140,255,0.16)' : 'transparent', boxShadow: i === 0 ? `inset 0 0 0 1px rgba(91,140,255,0.35)` : undefined,
          }}>{t}</div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 26, fontWeight: 550, color: INK2, padding: '9px 20px', borderRadius: 14, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>Last 30 days</div>
      </div>
    ),
  },
  {
    key: 'hero', x: 44, y: 128, w: 856, H: 210, node: (f, id) => (
      <div style={card(430, { padding: '34px 38px 0' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 30, fontWeight: 550, color: INK2 }}>Net revenue</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#06231f', background: NEON_B, borderRadius: 10, padding: '3px 12px' }}>+18.4%</div>
        </div>
        <div style={{ fontSize: 124, fontWeight: 760, color: INK, letterSpacing: '-0.045em', lineHeight: 1.02, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>$4.82M</div>
        <div style={{ marginTop: 22 }}><Chart draw={ramp(f, 18, 42, EASE.swift)} id={id} pulse={f < 60 ? 0 : ((f - 60) % 36) / 36} /></div>
      </div>
    ),
  },
  ...KPIS.map(([label, v, d], i): Part => ({
    key: `kpi${i}`, x: 928, y: 128 + i * 148, w: 468, H: 190 - i * 10, node: () => (
      <div style={card(130, { padding: '22px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'center' })}>
        <div style={{ fontSize: 26, fontWeight: 550, color: INK2 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 2 }}>
          <div style={{ fontSize: 58, fontWeight: 740, color: INK, letterSpacing: '-0.035em', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
          <div style={{ fontSize: 24, fontWeight: 650, color: NEON_B }}>{d}</div>
        </div>
      </div>
    ),
  })),
  {
    key: 'channels', x: 44, y: 584, w: 856, H: 170, node: () => (
      <div style={card(222, { padding: '26px 38px' })}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.12em', color: INK3 }}>TOP CHANNELS</div>
        {CHANNELS.map(([n, w, v], i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: i ? 14 : 18 }}>
            <div style={{ width: 230, fontSize: 28, fontWeight: 550, color: INK }}>{n}</div>
            <div style={{ flex: 1, height: 14, borderRadius: 7, background: 'rgba(150,180,255,0.1)' }}>
              <div style={{ width: `${w * 100}%`, height: '100%', borderRadius: 7, background: `linear-gradient(90deg, ${NEON_A}, ${i === 0 ? NEON_B : '#7aa0ff'})` }} />
            </div>
            <div style={{ width: 130, textAlign: 'right', fontSize: 28, fontWeight: 650, color: INK, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'goal', x: 928, y: 584, w: 468, H: 200, node: () => {
      const r = 64, c = 2 * Math.PI * r;
      return (
        <div style={card(222, { padding: '0 34px', display: 'flex', alignItems: 'center', gap: 30 })}>
          <svg width={160} height={160} viewBox="0 0 160 160" style={{ flex: 'none' }}>
            <circle cx={80} cy={80} r={r} fill="none" stroke="rgba(150,180,255,0.12)" strokeWidth={14} />
            <circle cx={80} cy={80} r={r} fill="none" stroke={NEON_B} strokeWidth={14} strokeLinecap="round"
              strokeDasharray={`${c * 0.72} ${c}`} transform="rotate(-90 80 80)" />
            <text x={80} y={92} textAnchor="middle" fontSize={36} fontWeight={750} fill={INK} fontFamily={FONT.sans}>72%</text>
          </svg>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.12em', color: INK3 }}>Q4 GOAL</div>
            <div style={{ fontSize: 40, fontWeight: 720, color: INK, letterSpacing: '-0.02em', marginTop: 6 }}>$6.7M</div>
          </div>
        </div>
      );
    },
  },
];

// ───────────── 霓虹框 ─────────────
const FW = PW + PAD * 2;
const FH = PH + PAD * 2;
const FRAME_D = `M 0 ${FH / 2} L 0 0 L ${FW} 0 L ${FW} ${FH} L 0 ${FH} Z`;
const PERIM = 2 * (FW + FH);
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
const Tube: React.FC<{ d: string; grad: string; dash?: string; offset?: number; a: number; core?: number }> = ({ d, grad, dash, offset, a, core = 1 }) => (
  <g fill="none" strokeDasharray={dash} strokeDashoffset={offset}>
    <path d={d} pathLength={dash ? 1000 : undefined} stroke={grad} strokeWidth={36} opacity={0.07 * a} />
    <path d={d} pathLength={dash ? 1000 : undefined} stroke={grad} strokeWidth={14} opacity={0.2 * a} />
    <path d={d} pathLength={dash ? 1000 : undefined} stroke={grad} strokeWidth={5} opacity={0.92 * a} />
    <path d={d} pathLength={dash ? 1000 : undefined} stroke="#f2fbff" strokeWidth={1.6} opacity={0.85 * a * core} />
  </g>
);

// 背景竖直光柱：3D 世界里不同纵深（面板坐标系：x 相对面板左缘，z 负 = 更远）
const PILLARS = [
  { x: -1500, z: -500, h: 1900, c: NEON_A }, { x: -900, z: -1300, h: 2300, c: NEON_B }, { x: -380, z: -650, h: 1900, c: NEON_A },
  { x: 560, z: -1600, h: 2600, c: NEON_B }, { x: 1000, z: -1000, h: 2200, c: NEON_A }, { x: 1820, z: -650, h: 1900, c: NEON_B },
  { x: 2400, z: -1300, h: 2300, c: NEON_A }, { x: 2950, z: -500, h: 1900, c: NEON_B },
].map((p, i) => ({ ...p, off: 96 + Math.abs(i - 3.5) * 5 })); // 中间先熄、两端后熄

export const NeonFrameForerunOrbit: React.FC = () => {
  const frame = useCurrentFrame();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const gid = `nfo${uid}`;

  // 描框 0–14
  const trace = ramp(frame, 0, 14, EASE.swift);
  const half = trace * 500;
  const lit = ramp(frame, 6, 24, EASE.out);

  // 环绕：+36° → −24°，不对称 in-out（起步柔、落点更软）
  const orbit = ramp(frame, 0, 124, bezier(0.45, 0.05, 0.3, 1));
  const rotY = mix(36, -24, orbit);
  const rotX = mix(9, 5, orbit);
  const scale = mix(0.74, 0.86, orbit) + 0.03 * Math.sin(orbit * Math.PI);

  // 全体同帧贴落
  const q = clamp01((frame - DROP0) / DROP_DUR);
  const fall = 1 - easeFall(q);
  const LAND = DROP0 + DROP_DUR;
  const impact = frame >= LAND ? 1 - ramp(frame, LAND, 20, EASE.out) : 0; // 贴合帧闪光衰减

  const frameCore = mix(1, 0.4, ramp(frame, 100, 30, EASE.smooth));
  const rim = lit * (0.7 + 0.6 * impact);
  const heads = trace < 1 ? [pointAt(trace * 0.5), pointAt(1 - trace * 0.5)] : [];
  const stageI = 0.7 + 0.3 * lit - 0.3 * ramp(frame, 96, 32, EASE.smooth);

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.0 }} fill={{ x: 0.5, y: 1.0 }} intensity={stageI} vignette={0.65} />

      {/* 屏幕空间横向补偿：rotateY 让近侧变大、重心偏向近侧，按角度反向平移让面板始终居中构图 */}
      <div style={{ position: 'absolute', inset: 0, perspective: PERSP, perspectiveOrigin: '50% 42%', transform: `translateX(${(rotY * 5).toFixed(2)}px)` }}>
        <div style={{
          position: 'absolute', left: (1920 - PW) / 2, top: (1080 - PH) / 2 - 20, width: PW, height: PH,
          transform: `scale(${scale.toFixed(4)}) rotateX(${rotX.toFixed(3)}deg) rotateY(${rotY.toFixed(3)}deg)`,
          transformStyle: 'preserve-3d',
        }}>
          {/* 背景光柱（远景，随环绕产生强视差），终段由中间向两边熄灭 */}
          {PILLARS.map((p, i) => {
            const on = ramp(frame, 4 + i * 1.5, 14, EASE.out) * (1 - ramp(frame, p.off, 14, EASE.exit));
            if (on <= 0.003) return null;
            const breathe = 0.85 + 0.15 * Math.sin(frame / 9 + i * 1.3);
            return (
              <div key={i} style={{
                position: 'absolute', left: p.x, top: PH / 2 - p.h / 2, width: 14, height: p.h, borderRadius: 7,
                transform: `translateZ(${p.z}px)`, opacity: on * breathe * 0.9,
                background: `linear-gradient(180deg, ${alpha(p.c, 0)} 0%, ${p.c} 30%, #e9f6ff 55%, ${p.c} 75%, ${alpha(p.c, 0)} 100%)`,
                boxShadow: `0 0 30px 6px ${alpha(p.c, 0.45)}, 0 0 120px 30px ${alpha(p.c, 0.16)}`,
              }} />
            );
          })}

          {/* 地面：反光的透视网格（面板下方 160px） */}
          <div style={{
            position: 'absolute', left: PW / 2 - 2400, top: PH + 160 - 2400, width: 4800, height: 4800,
            transform: 'rotateX(90deg)', opacity: 0.8 * lit,
            backgroundImage: `linear-gradient(${alpha(NEON_A, 0.35)} 2px, transparent 2px), linear-gradient(90deg, ${alpha(NEON_A, 0.35)} 2px, transparent 2px)`,
            backgroundSize: '160px 160px', backgroundPosition: 'center center',
            WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 0%, rgba(0,0,0,0.5) 18%, transparent 40%)',
          }} />
          {/* 地面上面板的倒影光斑 */}
          <div style={{
            position: 'absolute', left: -200, top: PH + 160 - 600, width: PW + 400, height: 1200, transform: 'rotateX(90deg)',
            background: `radial-gradient(ellipse 45% 40% at 50% 50%, ${alpha(NEON_A, 0.35 * rim)} 0%, transparent 70%)`,
          }} />

          {/* 面板落地影 + rim 辉光（贴合帧脉冲） */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 26, transform: 'translateZ(-2px)',
            boxShadow: `0 50px 120px -10px rgba(0,2,10,0.9), 0 0 90px 10px ${alpha(NEON_A, 0.3 * rim)}, 0 30px 100px 20px ${alpha(NEON_B, 0.16 * rim)}`,
          }} />

          {/* 面板底板（暗色玻璃） */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', opacity: clamp01((trace - 0.3) * 2.5),
            background: 'linear-gradient(160deg, #111a2f 0%, #0b1222 60%, #0a101d 100%)',
            boxShadow: `inset 0 0 0 1px ${HAIR}, inset 0 1px 0 rgba(255,255,255,0.1)`,
            filter: lit < 0.995 ? `brightness(${Math.max(0.15, lit).toFixed(3)})` : undefined,
          }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 50% at 30% 0%, ${alpha(NEON_A, 0.14)} 0%, transparent 70%)` }} />
          </div>

          {/* 组件：全体同帧悬空 / 下落 / 贴合 */}
          <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
            {PARTS.map((p) => (
              <Float key={p.key} x={p.x} y={p.y} w={p.w} h={fall * p.H}>
                <div style={{ opacity: clamp01((frame - 6) / 14) }}>{p.node(frame, `${gid}${p.key}`)}</div>
              </Float>
            ))}
          </div>

          {/* 霓虹主框 */}
          <svg width={FW} height={FH} viewBox={`0 0 ${FW} ${FH}`} style={{ position: 'absolute', left: -PAD, top: -PAD, overflow: 'visible', transform: 'translateZ(2px)' }}>
            <defs>
              <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={FW} y2={FH}>
                <stop offset="0" stopColor={NEON_A} />
                <stop offset="1" stopColor={NEON_B} />
              </linearGradient>
              <radialGradient id={`${gid}h`}>
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.25" stopColor="#dffcff" stopOpacity={0.9} />
                <stop offset="1" stopColor={NEON_B} stopOpacity={0} />
              </radialGradient>
            </defs>
            {trace > 0 && (
              <>
                <Tube d={FRAME_D} grad={`url(#${gid})`} dash={`${half} 1000`} offset={0} a={1 + 0.6 * impact} core={frameCore} />
                <Tube d={FRAME_D} grad={`url(#${gid})`} dash={`${half} 1000`} offset={-(1000 - half)} a={1 + 0.6 * impact} core={frameCore} />
              </>
            )}
            {/* 贴合帧闪光：整圈灯管过曝一下再回落（全片唯一的"咔"） */}
            {impact > 0.01 && (
              <g fill="none" opacity={impact}>
                <path d={FRAME_D} stroke={NEON_B} strokeWidth={60} opacity={0.12} />
                <path d={FRAME_D} stroke="#e8fbff" strokeWidth={9} opacity={0.75} />
              </g>
            )}
            {frame < 2 && <circle cx={0} cy={FH / 2} r={34} fill={`url(#${gid}h)`} />}
            {heads.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={46} fill={`url(#${gid}h)`} />)}
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
