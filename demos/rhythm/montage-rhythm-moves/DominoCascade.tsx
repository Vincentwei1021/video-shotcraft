// 多米诺连锁入场（domino-cascade）——Rube Goldberg / OK Go MV：每个元素的入场由上一个的撞击触发。
//
// 第二轮重设计（look = custom「混凝土 · 信号橙」，瑞士网格粗黑体 + 黑色多米诺石板；虚构运营看板 Cairn）：
// - 布景：暖灰混凝土底，四块黑色 KPI 石板（像四张立着的多米诺骨牌）立在地面线上，标题下方一条发丝规线，
//   左侧 280px 空着——观众第一眼就知道"这里少了点什么"。
// - 三级动量链，每级 startFrame = 上一级 impact 帧，方向逐级有出处：
//   ① 标题从画外带 3.5° 歪斜自由落体（ease-in），**右端先着地**（37f），左端 2f 拍平（39f = 撞击一）：
//      全画面竖震 10px（4f 衰减）、规线像蹦床一样下弯回弹、标题压扁回弹、两端扬起细尘。
//   ② 冲击从右端传进地面：一道橙色脉冲沿地面线从右往左跑，依次经过石板 4→3→2→1，每块被顶起
//      抛物线（12f，间隔 5f），弹高逐级**放大** 50→76px（多米诺是能量放大链），空中向左微倾；
//   ③ 最左一块落地（68f = 撞击二）带 -3° 左倾，震 6px，左墙的黑色侧边栏被"弹"进场（ease-out + 一次过冲回弹），
//      导航项比面板晚 2–3f 跟随落位（父先子后）。
// - 速度感：下落 / 横滑段按速度给方向性运动模糊；石板离地越高接触影越小越淡；落地 squash。
//
// 时间表（30fps，共 150f）：
//   0–22    布景：标题的落影先在规线上出现、逐渐变深（预告"有东西要掉下来"）
//   22–37   标题下落 15f；37–39 拍平；39 撞击一
//   41–68   石板 4→1 逐块弹起（41/46/51/56 起跳）；橙色地面脉冲同步右→左
//   68      撞击二；68–80 侧边栏横滑入场（过冲 +14px），80–90 回正；导航项错峰跟随
//   90–150  hold：极缓推镜 1.0→1.015，干净海报
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, SpeedBlur, Vignette, mix, ramp, velocity } from '../../_fixtures/Polish';
import { alpha } from '../../_fixtures/Look';

export const DOMINO_CASCADE_DURATION = 150; // 22f 读布景 + 68f 三级链 + 60f 落定 hold

// 调色：混凝土 + 墨黑石板 + 信号橙
const C = {
  bg: ['#e7e4de', '#dcd8d0', '#cdc8bf'] as const,
  ink: '#121212', ink2: '#57534d', ink3: '#8f8a82',
  slab: '#151515', slab2: '#0d0d0d', onSlab: '#f6f3ee', onSlab2: '#9b968e',
  accent: '#ff5a1f',
};

const h = (n: number) => {
  const s = Math.sin(n * 91.3 + 7.7) * 43758.5453;
  return s - Math.floor(s);
};

// —— 关键帧 ——
const FALL_START = 22;
const CONTACT = 37; // 右端先着地
const IMPACT_1 = 39; // 左端拍平 = 撞击一
const HOP_DELAY = 2; // 冲击从规线传到地面
const HOP_STAGGER = 5;
const HOP_DUR = 12;
const HOP_H = [50, 58, 66, 76]; // 依次起跳的四块（从右往左）——能量放大
const IMPACT_2 = IMPACT_1 + HOP_DELAY + 3 * HOP_STAGGER + HOP_DUR; // 68，最左一块落地
const SIDE_END = IMPACT_2 + 12; // 80 侧边栏到位（过冲点）
const SIDE_SETTLE = SIDE_END + 10; // 90 回正

// —— 几何 ——
const SIDE_W = 280;
const CONTENT_L = SIDE_W + 100; // 380
const CONTENT_R = 1920 - 110; // 1810
const RULE_Y = 470; // 标题规线
const FLOOR = 900; // 石板地面线
const SLAB_H = 330;
const SLAB_GAP = 30;
const SLAB_W = (CONTENT_R - CONTENT_L - 3 * SLAB_GAP) / 4; // 335
const slabX = (i: number) => CONTENT_L + i * (SLAB_W + SLAB_GAP);
const TITLE_FS = 128;
const TITLE_W = 1300; // 标题字宽（左对齐，用于确定右端支点）
const TITLE_TILT = 3.5;

// 撞击震动：4f 衰减序列（幅度递减表现能量损耗）
const shake = (f: number, at: number, amp: number) => {
  if (f < at || f > at + 4) return 0;
  return [amp, -amp * 0.6, amp * 0.3, -amp * 0.12, 0][f - at];
};

// ① 标题：下落位移（相对着地位置）+ 歪斜角
const titleDropAt = (f: number) => mix(-620, 0, ramp(f, FALL_START, CONTACT - FALL_START, (t) => t * t));
const titleRotAt = (f: number) => (f < CONTACT ? TITLE_TILT : mix(TITLE_TILT, 0, ramp(f, CONTACT, IMPACT_1 - CONTACT, (t) => t * t)));

// ② 石板：第 k 个起跳（k=0 是最右一块 i=3）
const hopStart = (i: number) => IMPACT_1 + HOP_DELAY + (3 - i) * HOP_STAGGER;
const slabLift = (f: number, i: number) => {
  const t = Math.min(1, Math.max(0, (f - hopStart(i)) / HOP_DUR));
  return HOP_H[3 - i] * 4 * t * (1 - t);
};

// ③ 侧边栏横移：ease-out 冲到 +14 过冲，再 in-out 回正
const sideXAt = (f: number) => {
  if (f < IMPACT_2) return -SIDE_W - 30;
  if (f < SIDE_END) return mix(-SIDE_W - 30, 14, ramp(f, IMPACT_2, SIDE_END - IMPACT_2, EASE.snappy));
  if (f < SIDE_SETTLE) return mix(14, 0, ramp(f, SIDE_END, SIDE_SETTLE - SIDE_END, EASE.smooth));
  return 0;
};

// —— 内容 ——
type Kpi = { label: string; value: string; delta: string; seed: number };
const KPIS: Kpi[] = [
  { label: 'ORDERS', value: '12,480', delta: '+18%', seed: 1 },
  { label: 'REVENUE', value: '$1.24M', delta: '+9%', seed: 2 },
  { label: 'UPTIME', value: '99.98%', delta: '+0.02', seed: 3 },
  { label: 'NPS', value: '72', delta: '+6', seed: 4 },
];

const spark = (seed: number, w: number, hh: number) => {
  const pts: string[] = [];
  for (let k = 0; k <= 12; k++) {
    const trend = k / 12;
    const y = hh - (0.15 + 0.6 * trend + 0.25 * (h(seed * 31 + k) - 0.5)) * hh;
    pts.push(`${((k / 12) * w).toFixed(1)},${Math.max(2, Math.min(hh - 2, y)).toFixed(1)}`);
  }
  return pts.join(' ');
};

const Slab: React.FC<{ k: Kpi }> = ({ k }) => (
  <div style={{
    width: SLAB_W, height: SLAB_H, borderRadius: 20, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans,
    background: `linear-gradient(180deg, ${C.slab} 0%, ${C.slab2} 100%)`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.09), inset 0 0 0 1px rgba(255,255,255,0.04)',
  }}>
    <div style={{ position: 'absolute', left: 30, top: 30, fontFamily: FONT.mono, fontSize: 24, fontWeight: 500, letterSpacing: '0.14em', color: C.onSlab2 }}>{k.label}</div>
    <div style={{ position: 'absolute', left: 28, top: 96, fontSize: 76, fontWeight: 750, letterSpacing: '-0.045em', color: C.onSlab, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
    <div style={{
      position: 'absolute', left: 30, top: 196, padding: '6px 14px', borderRadius: 999, fontSize: 30, fontWeight: 700,
      color: C.accent, background: alpha(C.accent, 0.13), fontVariantNumeric: 'tabular-nums',
    }}>{k.delta}</div>
    <svg width={SLAB_W - 60} height={56} style={{ position: 'absolute', left: 30, bottom: 26 }}>
      <polyline points={spark(k.seed, SLAB_W - 60, 56)} fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  </div>
);

// 侧边栏图标（1.8px 描边）
const ICON: Record<string, string> = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  flow: 'M4 6h10M4 12h16M4 18h7',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c.6-3.4 3-5 6-5s5.4 1.6 6 5M16 4.5a3.2 3.2 0 0 1 0 6.2M18 15c1.8.6 2.8 2.2 3 5',
  chart: 'M5 20V11M10 20V5M15 20v-7M20 20V9',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
};
const NAV: [string, string][] = [
  ['grid', 'Overview'], ['flow', 'Pipeline'], ['box', 'Orders'], ['users', 'Customers'], ['chart', 'Reports'], ['gear', 'Settings'],
];

const Sidebar: React.FC<{ f: number }> = ({ f }) => (
  <div style={{
    width: SIDE_W, height: 1080, background: 'linear-gradient(180deg, #161616 0%, #0e0e0e 100%)', position: 'relative',
    fontFamily: FONT.sans, boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.06)',
  }}>
    {/* 字标：三块叠石 */}
    <div style={{ position: 'absolute', left: 40, top: 92, display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={40} height={40} viewBox="0 0 40 40">
        <ellipse cx={20} cy={33} rx={15} ry={5.5} fill={C.onSlab} />
        <ellipse cx={20} cy={22} rx={11} ry={5} fill={C.onSlab} opacity={0.7} />
        <ellipse cx={20} cy={11.5} rx={7} ry={4.5} fill={C.accent} />
      </svg>
      <span style={{ fontSize: 34, fontWeight: 750, color: C.onSlab, letterSpacing: '-0.03em' }}>Cairn</span>
    </div>
    {NAV.map(([icon, label], i) => {
      // 导航项晚于面板 2–3f 跟随：按"面板已走过的进度"再延迟一段，落位略软
      const lag = ramp(f, IMPACT_2 + 3 + i * 1.6, 12, EASE.out);
      const sel = i === 0;
      return (
        <div key={label} style={{
          position: 'absolute', left: 24, right: 24, top: 210 + i * 70, height: 58, borderRadius: 14,
          display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px',
          background: sel ? C.accent : 'transparent', color: sel ? '#140600' : 'rgba(255,255,255,0.68)',
          fontSize: 30, fontWeight: sel ? 700 : 500, letterSpacing: '-0.01em',
          transform: `translateX(${mix(-46, 0, lag).toFixed(2)}px)`, opacity: mix(0.2, 1, lag),
        }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={sel ? '#140600' : 'rgba(255,255,255,0.55)'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={ICON[icon]} /></svg>
          {label}
        </div>
      );
    })}
    <div style={{ position: 'absolute', left: 40, bottom: 80, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 22, background: 'linear-gradient(140deg, #ffb08a, #ff5a1f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#140600' }}>AR</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: C.onSlab }}>Ana Ruiz</div>
    </div>
  </div>
);

export const DominoCascade: React.FC = () => {
  const frame = useCurrentFrame();

  // ① 标题
  const drop = titleDropAt(frame);
  const dropV = velocity(titleDropAt, frame);
  const rot = titleRotAt(frame);
  const landed = frame >= IMPACT_1;
  const land = ramp(frame, IMPACT_1, 8, EASE.overshoot);
  const tSy = landed ? mix(0.9, 1, land) : 1;
  const tSx = landed ? mix(1.02, 1, land) : 1;
  // 落影：标题越接近规线越深越窄（0–22f 先淡淡出现）
  const shadowK = ramp(frame, 6, CONTACT - 6, (t) => t * t);

  // 规线蹦床：右端先被压（37–39），撞击一后整体下弯 + 阻尼回弹
  const bowAmp = frame < CONTACT ? 0 : frame < IMPACT_1 ? 6 * (frame - CONTACT + 1) / 2
    : 18 * Math.exp(-(frame - IMPACT_1) / 4.5) * Math.cos((frame - IMPACT_1) * 0.85);
  const bowX = frame < IMPACT_1 ? CONTENT_L + TITLE_W - 120 : CONTENT_L + TITLE_W * 0.55;

  // 两次撞击的全画面竖震
  const shakeY = shake(frame, IMPACT_1, 10) + shake(frame, IMPACT_2, 6);

  // ③ 侧边栏
  const sideX = sideXAt(frame);
  const sideVx = velocity(sideXAt, frame);

  // 地面冲击脉冲：从最右石板中心跑到最左石板左沿（右→左），与起跳同步
  const pulseT = (frame - (IMPACT_1 + HOP_DELAY)) / (IMPACT_2 - (IMPACT_1 + HOP_DELAY));
  const pulseOn = pulseT >= 0 && pulseT <= 1.08;
  const pulseX = mix(slabX(3) + SLAB_W / 2, slabX(0) + 20, Math.min(1, Math.max(0, pulseT)));

  // hold 段极缓推镜
  const cam = mix(1, 1.015, ramp(frame, SIDE_SETTLE, DOMINO_CASCADE_DURATION - SIDE_SETTLE, EASE.smooth));

  // 撞击一扬尘：标题底边两端各 9 粒，向外上方抛出、受重力、14f 淡出
  const dustT = frame - IMPACT_1;

  return (
    <div style={{ width: 1920, height: 1080, overflow: 'hidden', position: 'relative', fontFamily: FONT.sans }}>
      {/* 混凝土底：纵向渐变 + 左上柔光 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 60% 60% at 62% 18%, rgba(255,253,248,0.75) 0%, rgba(255,253,248,0) 70%), linear-gradient(180deg, ${C.bg[0]} 0%, ${C.bg[1]} 55%, ${C.bg[2]} 100%)`,
      }} />

      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${shakeY}px) scale(${cam.toFixed(5)})`, transformOrigin: '1100px 620px' }}>
        {/* 顶部眉题 */}
        <div style={{ position: 'absolute', left: CONTENT_L, top: 118, fontFamily: FONT.mono, fontSize: 26, fontWeight: 500, letterSpacing: '0.16em', color: C.ink2 }}>
          CAIRN · OPS REVIEW · WEEK 42
        </div>
        <div style={{ position: 'absolute', right: 1920 - CONTENT_R, top: 116, display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 600, color: C.ink }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: C.accent }} />Live
        </div>

        {/* 规线（蹦床）+ 标题落影 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <defs>
            <radialGradient id="dcTitleShadow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#1a1612" stopOpacity={0.32} />
              <stop offset="1" stopColor="#1a1612" stopOpacity={0} />
            </radialGradient>
          </defs>
          <ellipse cx={CONTENT_L + TITLE_W / 2} cy={RULE_Y + 6} rx={(TITLE_W / 2) * mix(1.15, 0.92, shadowK)} ry={mix(26, 12, shadowK)}
            fill="url(#dcTitleShadow)" opacity={frame < IMPACT_1 ? shadowK : mix(1, 0.55, ramp(frame, IMPACT_1, 10, EASE.out))} />
          <path d={`M${CONTENT_L},${RULE_Y} Q${bowX},${RULE_Y + bowAmp * 2} ${CONTENT_R},${RULE_Y}`} fill="none" stroke={C.ink} strokeWidth={3} />
        </svg>

        {/* ① 标题：带歪斜自由落体，右端支点先着地，拍平后压扁回弹；下落段竖向运动模糊 */}
        <SpeedBlur vx={0} vy={dropV} amount={0.18} max={18}>
          <div style={{
            position: 'absolute', left: CONTENT_L, width: TITLE_W, top: RULE_Y - TITLE_FS - 14, height: TITLE_FS + 14,
            transformOrigin: '100% 100%', transform: `translateY(${drop.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${tSx.toFixed(4)}, ${tSy.toFixed(4)})`,
            fontSize: TITLE_FS, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: C.ink, whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'flex-end',
          }}>
            Momentum<span style={{ color: C.accent }}>,</span>&nbsp;measured.
          </div>
        </SpeedBlur>

        {/* 撞击一扬尘 */}
        {dustT >= 0 && dustT < 16 && Array.from({ length: 18 }, (_, k) => {
          const side = k < 9 ? -1 : 1;
          const ox = side < 0 ? CONTENT_L + 10 : CONTENT_L + TITLE_W - 30;
          const vx = side * (2 + h(k * 7) * 6);
          const vy = -(2 + h(k * 13) * 5);
          const x = ox + vx * dustT;
          const y = RULE_Y - 4 + vy * dustT + 0.35 * dustT * dustT;
          const s = 4 + h(k * 3) * 7;
          return <div key={k} style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: '50%', background: C.ink3, opacity: (1 - dustT / 16) * 0.7 }} />;
        })}

        {/* 地面线 + 冲击脉冲（橙色亮段右→左） */}
        <div style={{
          position: 'absolute', left: CONTENT_L - 40, width: CONTENT_R - CONTENT_L + 80, top: FLOOR, height: 2, background: alpha(C.ink, 0.22),
        }} />
        {pulseOn && (
          <div style={{
            position: 'absolute', left: pulseX - 140, top: FLOOR - 2, width: 280, height: 6, borderRadius: 3,
            background: `linear-gradient(90deg, ${alpha(C.accent, 0)} 0%, ${C.accent} 30%, ${alpha(C.accent, 0)} 100%)`,
            boxShadow: `0 0 18px ${alpha(C.accent, 0.6)}`, opacity: pulseT > 1 ? Math.max(0, 1 - (pulseT - 1) / 0.08) : 1,
          }} />
        )}

        {/* 地面下的页脚：数据来源一行（辅助信息，≥24px mono） */}
        <div style={{
          position: 'absolute', left: CONTENT_L, top: FLOOR + 44, fontFamily: FONT.mono, fontSize: 24, letterSpacing: '0.08em', color: C.ink3,
          display: 'flex', gap: 40,
        }}>
          <span>SYNCED 19:40</span><span>4 SOURCES</span><span>VS. WEEK 41</span>
        </div>

        {/* ② 石板 + 地面接触影：从右往左逐块弹起，空中向左微倾；最左一块落地带 -3° 左倾 */}
        {KPIS.map((k, i) => {
          const lift = slabLift(frame, i);
          const hmax = HOP_H[3 - i];
          const t = Math.min(1, Math.max(0, (frame - hopStart(i)) / HOP_DUR));
          const landAt = hopStart(i) + HOP_DUR;
          const sq = frame >= landAt && frame < landAt + 5 ? 1 - 0.04 * Math.sin((Math.PI * (frame - landAt + 1)) / 6) : 1;
          let r = -1.6 * Math.sin(Math.PI * t);
          if (i === 0) r = frame < landAt ? mix(0, -3, ramp(frame, landAt - 8, 8, EASE.swift)) : mix(-3, 0, ramp(frame, landAt, SIDE_SETTLE - landAt, EASE.smooth));
          const hh = lift / hmax;
          return (
            <React.Fragment key={k.label}>
              <div style={{
                position: 'absolute', left: slabX(i) + 16, top: FLOOR - 10, width: SLAB_W - 32, height: 22, borderRadius: '50%',
                background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(18,14,10,0.34) 0%, rgba(18,14,10,0) 100%)',
                transform: `scaleX(${(1 - 0.3 * hh).toFixed(4)})`, opacity: 1 - 0.65 * hh,
              }} />
              <div style={{
                position: 'absolute', left: slabX(i), top: FLOOR - SLAB_H, transformOrigin: i === 0 ? '0% 100%' : '50% 100%',
                transform: `translateY(${(-lift).toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${(2 - sq).toFixed(4)}, ${sq.toFixed(4)})`,
                borderRadius: 20, boxShadow: `0 ${(4 + lift * 0.35).toFixed(1)}px ${(14 + lift * 0.8).toFixed(1)}px -6px rgba(20,14,8,${(0.35 - 0.15 * hh).toFixed(3)})`,
              }}>
                <Slab k={k} />
              </div>
            </React.Fragment>
          );
        })}

        {/* ③ 被弹进场的侧边栏：横向运动模糊 + 投在混凝土上的边缘影 */}
        <SpeedBlur vx={sideVx} amount={0.2} max={16}>
          <div style={{
            position: 'absolute', left: -30, top: -30, padding: '30px 0 30px 30px', transform: `translateX(${sideX.toFixed(2)}px)`,
            background: 'linear-gradient(180deg, #161616 0%, #0e0e0e 100%)', // 上下左各多出 30px，震屏 / 推镜时不露边
            boxShadow: '24px 0 60px -24px rgba(20,14,8,0.5)',
          }}>
            <Sidebar f={frame} />
          </div>
        </SpeedBlur>
      </div>

      <Vignette strength={0.18} inner={0.5} color="#2a2118" />
      <Grain opacity={0.07} />
    </div>
  );
};
