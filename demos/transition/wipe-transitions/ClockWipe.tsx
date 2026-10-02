// clock-wipe｜时钟扫描擦除——B 页套一张以屏心为圆心、角度逐帧张开的扇形 clip-path，
// 一根雷达指针从 12 点顺时针扫一圈，扫过处换成新页。
//
// 第二轮重设计（暗场 NOC 大屏，"一扫就刷新"）：
// - look = midnight（深蓝夜 · 电光蓝 · 青绿点缀）。A 页是同一块网络运维大屏的"过期"态：整体去饱和、
//   数字发灰、状态胶囊写 "Synced 6 days ago"；B 页是"实时"态：电光蓝主光、数字提亮、绿色利好变化、"Live"。
//   两页版式完全一致，只有数据和色温不同——擦除边界扫过时读作"这一屏数据被刷新了"，语义比换 dashboard 更强。
// - 构图围绕擦除圆心设计：屏心是一只 500px 的吞吐量表盘（刻度一圈 60 格 = 表面），指针从表盘外沿伸出
//   而不是压在中心数字上；左右各两块大字指标卡（84px 数值 / 32px 标签），四角留 ≥120px 安全边。
// - 指针"给表盘充能"：B 页表盘弧长 = min(扫过角度, 78%)，指针扫到 281° 时弧停住、端点亮起，
//   扫描本身就是数据刷新的动作。指针身后拖 55° 电光蓝余辉扇（刚刷新的区域还亮着）。
// - 指针运动：前 6f 匀加速起转（不是突然以全速出现），之后恒速 8°/帧——雷达是机械语义，恒速；
//   扫满 360° 摘罩后指针惯性再走 ~40° 并淡出（跟随），不在 12 点硬停。
//
// 时间表（30fps，共 150f）：
//   0–24    A 页（过期态）静置，整屏极缓推进；14–24 12 点处表盘外沿亮起一粒起始光点（预备）
//   24–72   指针扫一圈（48f）：6f 加速 + 42f 恒速；B 页扇形张开，表盘弧随指针充能
//   72      扫满摘罩：B 直出、无 clip-path；指针惯性越过 12 点 72–84 淡出、余辉同步褪去
//   68–96   余波：B 页电光蓝泛光"通电"亮起、Live 胶囊信号点扩一圈脉冲、增长标签从下升起
//   96–150  hold 54f：整屏推进收尾 + 浮尘，实时时钟秒数跳动（画面活着但无新信息）
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Look, Stage, alpha, glow, type } from '../../_fixtures/Look';

export const CLOCK_WIPE_DURATION = 150;

const LIVE = LOOKS.midnight;
// 过期态：同一套 midnight 去饱和、压暗——光换成灰蓝、强调色退成弱文字色
const STALE: Look = { ...LIVE, light: '#2a3346', accent: '#5d6883', accent2: '#5d6883', ink: '#aab3c8', ink2: '#6f7a93' };

const CX = 960;
const CY = 540;
const R = 1400; // 大于中心到角的距离 ~1101，扇形完全盖角
const SEGS = 90; // 顶点数固定且够密，避免锯齿跳变
const DIAL_R = 250; // 表盘半径（指针从这里伸出）
const SWEEP0 = 24; // 起扫帧
const ACC = 6; // 起转加速帧数
const SPEED = 8; // 恒速（°/帧）：3·8 + 42·8 = 360
const SWEEP_END = SWEEP0 + ACC + (360 - (SPEED * ACC) / 2) / SPEED; // = 72
const TRAIL = 55; // 余辉扇角度
const FILL = 0.78; // 表盘终值 78%

// 指针角度：前 ACC 帧匀加速，之后恒速；扫满后继续惯性滑行（只给淡出的指针用）
const angleAt = (f: number) => {
  const t = f - SWEEP0;
  if (t <= 0) return 0;
  if (t < ACC) return (SPEED * t * t) / (2 * ACC);
  const a = (SPEED * ACC) / 2 + SPEED * (t - ACC);
  if (a <= 360) return a;
  // 扫满后：速度按 ease-out 衰减滑行 ~40°
  const over = f - SWEEP_END;
  return 360 + 40 * EASE.out(Math.min(1, over / 12));
};

const polar = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
};

const fanClip = (theta: number): string => {
  const pts: string[] = [`${CX}px ${CY}px`];
  for (let i = 0; i <= SEGS; i++) {
    const [x, y] = polar((theta * i) / SEGS, R);
    pts.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
  }
  return `polygon(${pts.join(', ')})`;
};

// 圆弧路径（12 点起顺时针 deg 度）
const arcPath = (r: number, deg: number) => {
  const d = Math.max(0.01, Math.min(359.99, deg));
  const [x0, y0] = polar(0, r);
  const [x1, y1] = polar(d, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${d > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

// ───────────── 数据（两态同版式，数值不同） ─────────────
const SPARK_A = [0.52, 0.55, 0.5, 0.58, 0.54, 0.6, 0.57, 0.62, 0.58, 0.6, 0.63, 0.61];
const SPARK_B = [0.7, 0.66, 0.6, 0.52, 0.47, 0.4, 0.34, 0.3, 0.24, 0.2, 0.17, 0.14];
const BARS_A = [0.62, 0.7, 0.55, 0.8, 0.66, 0.74, 0.6, 0.86, 0.7, 0.78, 0.68, 0.82];
const BARS_B = [0.46, 0.38, 0.3, 0.24, 0.2, 0.17, 0.15, 0.13, 0.12, 0.11, 0.1, 0.1];
const AREA_A = [0.3, 0.32, 0.31, 0.34, 0.33, 0.35, 0.34, 0.36, 0.35, 0.37, 0.36, 0.38];
const AREA_B = [0.3, 0.36, 0.42, 0.4, 0.5, 0.56, 0.6, 0.66, 0.72, 0.76, 0.84, 0.92];

const sparkPath = (vals: number[], w: number, h: number) =>
  vals.map((v, i) => `${i ? 'L' : 'M'} ${((i / (vals.length - 1)) * w).toFixed(1)} ${((1 - v) * h).toFixed(1)}`).join(' ');

// ───────────── 页面 ─────────────
const Tile: React.FC<{ look: Look; x: number; y: number; label: string; value: string; unit: string; note: string; good?: boolean; children: React.ReactNode }> = ({
  look, x, y, label, value, unit, note, good, children,
}) => (
  <div style={{
    position: 'absolute', left: x, top: y, width: 500, height: 312, borderRadius: 30, padding: '34px 38px', boxSizing: 'border-box',
    background: `linear-gradient(180deg, ${alpha(look.surface2, 0.92)} 0%, ${alpha(look.surface, 0.9)} 100%)`,
    border: `1px solid ${look.line}`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 6px rgba(0,2,8,0.5), 0 40px 80px -30px rgba(0,2,8,0.85)`,
    overflow: 'hidden',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ ...type(32, 550), color: look.ink2 }}>{label}</div>
      <div style={{ ...type(28, 600), color: good ? look.accent2 : look.ink3 }}>{note}</div>
    </div>
    <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <span style={{ ...type(88, 700), color: look.ink }}>{value}</span>
      <span style={{ ...type(36, 550), color: look.ink2 }}>{unit}</span>
    </div>
    <div style={{ position: 'absolute', left: 38, right: 38, bottom: 34, height: 78 }}>{children}</div>
  </div>
);

const Page: React.FC<{ live: boolean; theta: number; frame: number }> = ({ live, theta, frame }) => {
  const L = live ? LIVE : STALE;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const arcDeg = live ? Math.min(theta, FILL * 360) : 0.64 * 360;
  const capOn = live && theta >= FILL * 360;
  const capPulse = live ? ramp(frame, SWEEP0 + (FILL * 360) / SPEED, 4, EASE.out) * (1 - ramp(frame, SWEEP0 + (FILL * 360) / SPEED + 4, 26, EASE.out)) : 0;
  const [ex, ey] = polar(arcDeg, DIAL_R);
  const secs = 31 + Math.floor(frame / 30);
  const ping = live ? ramp(frame, SWEEP_END + 4, 22, EASE.out) : 0;
  const tagIn = live ? ramp(frame, SWEEP_END + 8, 18, EASE.snappy) : 1;
  const bloom = ramp(frame, SWEEP_END - 4, 26, EASE.out);
  const spark = live ? SPARK_B : SPARK_A;
  const bars = live ? BARS_B : BARS_A;
  const area = live ? AREA_B : AREA_A;

  return (
    // 两页共用过期态的舞台底（扫描期新旧背景完全一致，12 点起始边不出现硬接缝）；
    // B 页的电光蓝泛光在扫满后才"通电"亮起（余波），扫描中的新鲜感交给指针余辉
    <Stage look={STALE} keyLight={{ x: 0.5, y: 0.5 }} fill={null} intensity={0.55} grain={0.07} vignette={0.6}>
      {live && (
        <div style={{
          position: 'absolute', inset: 0, opacity: bloom,
          background: `radial-gradient(ellipse 46% 60% at 50% 50%, ${alpha(L.light, 0.3)} 0%, ${alpha(L.light, 0)} 70%), radial-gradient(ellipse 50% 30% at 50% 108%, ${alpha(L.accent2, 0.16)} 0%, ${alpha(L.accent2, 0)} 70%)`,
        }} />
      )}
      {live && <Dust look={L} count={26} seed={7} drift={0.18} opacity={0.35 * bloom} />}

      {/* 顶栏：品牌 + 视图名 + 同步状态 */}
      <div style={{ position: 'absolute', left: 120, top: 70, display: 'flex', alignItems: 'center', gap: 22 }}>
        <svg width={44} height={44} viewBox="0 0 44 44">
          <circle cx={22} cy={22} r={19} fill="none" stroke={L.ink} strokeWidth={3} />
          <path d="M22 3 A19 19 0 0 1 41 22 L22 22 Z" fill={L.accent} />
        </svg>
        <span style={{ ...type(38, 700), color: L.ink }}>Halcyon</span>
        <span style={{ ...type(34, 450), color: L.ink3, marginLeft: 6 }}>/</span>
        <span style={{ ...type(34, 500), color: L.ink2 }}>Edge Network</span>
      </div>
      <div style={{
        position: 'absolute', right: 120, top: 62, height: 60, padding: '0 26px', borderRadius: 30, display: 'flex', alignItems: 'center', gap: 14,
        background: live ? alpha(L.accent2, 0.1) : alpha(L.ink3, 0.12), border: `1px solid ${live ? alpha(L.accent2, 0.35) : alpha(L.ink3, 0.3)}`,
      }}>
        <span style={{ position: 'relative', width: 14, height: 14 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: 7, background: live ? L.accent2 : 'transparent', border: live ? 'none' : `2px solid ${L.ink3}`, boxSizing: 'border-box' }} />
          {ping > 0 && ping < 1 && (
            <span style={{ position: 'absolute', inset: 0, borderRadius: 7, border: `2px solid ${L.accent2}`, transform: `scale(${1 + ping * 2.6})`, opacity: 1 - ping }} />
          )}
        </span>
        <span style={{ ...type(30, 600, { mono: true }), color: live ? L.accent2 : L.ink2 }}>
          {live ? `Live · 12:04:${String(secs).padStart(2, '0')}` : 'Synced 6 days ago'}
        </span>
      </div>

      {/* 左列 */}
      <Tile look={L} x={120} y={232} label="p95 latency" value={live ? '41' : '182'} unit="ms" note={live ? '−77%' : '—'} good={live}>
        <svg width={424} height={78} style={{ overflow: 'visible' }}>
          <path d={sparkPath(spark, 424, 78)} fill="none" stroke={live ? L.accent : L.ink3} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Tile>
      <Tile look={L} x={120} y={576} label="Error rate" value={live ? '0.03' : '0.92'} unit="%" note={live ? '−0.89 pt' : '—'} good={live}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: '100%' }}>
          {bars.map((b, i) => (
            <div key={i} style={{ flex: 1, height: `${Math.max(6, b * 100)}%`, borderRadius: 4, background: live ? alpha(L.accent, 0.35 + (i === 11 ? 0.65 : 0)) : alpha(L.ink3, 0.55) }} />
          ))}
        </div>
      </Tile>

      {/* 右列 */}
      <Tile look={L} x={1300} y={232} label="Regions online" value={live ? '18' : '14'} unit="/ 18" note={live ? 'All healthy' : '4 unknown'} good={live}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 12, height: '100%', alignContent: 'end' }}>
          {Array.from({ length: 18 }, (_, i) => {
            const on = live || i < 14;
            return <div key={i} style={{ height: 28, borderRadius: 8, background: on ? (live ? L.accent2 : alpha(L.ink3, 0.6)) : 'transparent', border: on ? 'none' : `2px dashed ${alpha(L.ink3, 0.6)}`, boxSizing: 'border-box', opacity: live ? 0.55 + 0.45 * ((i * 7) % 5) / 4 : 1 }} />;
          })}
        </div>
      </Tile>
      <Tile look={L} x={1300} y={576} label="Active sessions" value={live ? '1.24' : '0.41'} unit="M" note={live ? '+202%' : '—'} good={live}>
        <svg width={424} height={78} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={`ar${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={live ? L.accent : L.ink3} stopOpacity={0.45} />
              <stop offset="1" stopColor={live ? L.accent : L.ink3} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${sparkPath(area, 424, 78)} L 424 78 L 0 78 Z`} fill={`url(#ar${uid})`} />
          <path d={sparkPath(area, 424, 78)} fill="none" stroke={live ? L.accent : L.ink3} strokeWidth={4} strokeLinecap="round" />
        </svg>
      </Tile>

      {/* 中心表盘：刻度圈 + 轨道 + 数值弧 + 中心数字 */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id={`dial${uid}`} x1={CX - DIAL_R} y1={CY - DIAL_R} x2={CX + DIAL_R} y2={CY + DIAL_R} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={live ? L.accent2 : L.ink3} />
            <stop offset="1" stopColor={live ? L.accent : L.ink3} />
          </linearGradient>
          <radialGradient id={`face${uid}`} cx={CX} cy={CY} r={DIAL_R + 40} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={L.surface2} stopOpacity={0.95} />
            <stop offset="0.85" stopColor={L.surface} stopOpacity={0.95} />
            <stop offset="1" stopColor={L.surface} stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={DIAL_R + 40} fill={`url(#face${uid})`} />
        {Array.from({ length: 60 }, (_, i) => {
          const major = i % 5 === 0;
          const [x0, y0] = polar(i * 6, DIAL_R + 30);
          const [x1, y1] = polar(i * 6, DIAL_R + (major ? 58 : 44));
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={major ? alpha(L.ink, live ? 0.7 : 0.4) : alpha(L.ink2, 0.35)} strokeWidth={major ? 3 : 2} strokeLinecap="round" />;
        })}
        <circle cx={CX} cy={CY} r={DIAL_R} fill="none" stroke={alpha(L.ink3, 0.35)} strokeWidth={16} />
        <path d={arcPath(DIAL_R, arcDeg)} fill="none" stroke={`url(#dial${uid})`} strokeWidth={16} strokeLinecap="round"
          style={live ? { filter: `drop-shadow(0 0 12px ${alpha(L.accent, 0.6)})` } : undefined} />
        {capOn && (
          <>
            <circle cx={ex} cy={ey} r={22 + capPulse * 18} fill={alpha(L.accent, 0.25 * (0.4 + capPulse))} />
            <circle cx={ex} cy={ey} r={12} fill="#ffffff" />
          </>
        )}
      </svg>
      <div style={{ position: 'absolute', left: CX - 230, width: 460, top: CY - 136, textAlign: 'center' }}>
        <div style={{ ...type(30, 600, { caps: true }), letterSpacing: '0.18em', color: L.ink2 }}>Throughput</div>
        <div style={{ ...type(168, 750), color: L.ink, marginTop: 10, textShadow: live ? glow(L.accent, 0.5) : undefined }}>{live ? '2.94' : '1.86'}</div>
        <div style={{ ...type(32, 500), color: L.ink2, marginTop: 8 }}>M requests / sec</div>
      </div>
      {/* 增长标签：B 页扫完后从下升起 */}
      <div style={{
        position: 'absolute', left: CX - 150, width: 300, top: CY + DIAL_R + 92, height: 58, borderRadius: 29, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: live ? alpha(L.accent2, 0.12) : 'transparent', border: `1px solid ${live ? alpha(L.accent2, 0.4) : alpha(L.ink3, 0.3)}`,
        opacity: tagIn, transform: `translateY(${((1 - tagIn) * 24).toFixed(2)}px)`,
      }}>
        <span style={{ ...type(32, 650), color: live ? L.accent2 : L.ink3 }}>{live ? '▲ 58% vs last week' : 'No recent data'}</span>
      </div>
    </Stage>
  );
};

export const ClockWipe: React.FC = () => {
  const frame = useCurrentFrame();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const theta = Math.min(360, angleAt(frame));
  const hand = angleAt(frame); // 指针（扫满后继续滑行）
  const sweeping = frame >= SWEEP0 && frame < SWEEP_END;
  const wipeDone = frame >= SWEEP_END;
  const handFade = 1 - ramp(frame, SWEEP_END, 12, EASE.out);
  const handOn = frame >= SWEEP0 && frame < SWEEP_END + 12;
  const pre = ramp(frame, 14, 10, EASE.overshoot) * (frame < SWEEP0 + 4 ? 1 : 0); // 12 点起始光点
  const push = 1 + 0.03 * ramp(frame, 0, CLOCK_WIPE_DURATION, EASE.swift);
  const trail = Math.min(TRAIL, theta) * handFade;
  const [ix, iy] = polar(hand, DIAL_R);
  const [ox, oy] = polar(hand, R);
  const [px, py] = polar(0, DIAL_R);

  return (
    <AbsoluteFill style={{ background: LIVE.bg[2], overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})`, transformOrigin: `${CX}px ${CY}px` }}>
        {/* 底层：A 页（过期态）。擦完后卸载 */}
        {!wipeDone && <Page live={false} theta={0} frame={frame} />}
        {/* 上层：B 页（实时态）。扫描期挂扇形 clip-path，扫满后摘罩直出 */}
        {frame >= SWEEP0 && (
          <AbsoluteFill style={sweeping ? { clipPath: fanClip(theta) } : undefined}>
            <Page live theta={theta} frame={frame} />
          </AbsoluteFill>
        )}

        {/* 余辉扇：铺在指针身后刚扫过的 B 侧（screen 叠加，刚刷新的区域还亮着） */}
        {handOn && trail > 0.5 && (
          <AbsoluteFill style={{
            mixBlendMode: 'screen', pointerEvents: 'none',
            background: `conic-gradient(from ${(hand - trail).toFixed(2)}deg at ${CX}px ${CY}px, ${alpha(LIVE.accent, 0)} 0deg, ${alpha(LIVE.accent, 0.4 * handFade)} ${trail.toFixed(2)}deg, ${alpha(LIVE.accent, 0)} ${trail.toFixed(2)}deg)`,
            WebkitMaskImage: `radial-gradient(circle at ${CX}px ${CY}px, transparent ${DIAL_R - 8}px, black ${DIAL_R + 40}px)`,
          }} />
        )}

        {/* 指针：从表盘外沿伸出，白核 + 电光蓝光晕（多层宽线叠出泛光，不用逐帧大面积 blur），外端渐隐 */}
        {handOn && (
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: handFade, pointerEvents: 'none', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`hf${uid}`} gradientUnits="userSpaceOnUse" x1={ix} y1={iy} x2={ox} y2={oy}>
                <stop offset="0" stopColor="#ffffff" stopOpacity={1} />
                <stop offset="0.45" stopColor="#ffffff" stopOpacity={0.85} />
                <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`hg${uid}`} gradientUnits="userSpaceOnUse" x1={ix} y1={iy} x2={ox} y2={oy}>
                <stop offset="0" stopColor={LIVE.accent} stopOpacity={0.55} />
                <stop offset="1" stopColor={LIVE.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <line x1={ix} y1={iy} x2={ox} y2={oy} stroke={`url(#hg${uid})`} strokeWidth={30} strokeLinecap="round" opacity={0.35} />
            <line x1={ix} y1={iy} x2={ox} y2={oy} stroke={`url(#hg${uid})`} strokeWidth={12} strokeLinecap="round" opacity={0.8} />
            <line x1={ix} y1={iy} x2={ox} y2={oy} stroke={`url(#hf${uid})`} strokeWidth={3.5} strokeLinecap="round" />
            {/* 表盘内：一根细分界线标出新旧数字的切口 */}
            <line x1={CX} y1={CY} x2={ix} y2={iy} stroke={alpha('#ffffff', 0.35)} strokeWidth={1.5} />
            {/* 指针根部亮点（压在表盘轨道上） */}
            <circle cx={ix} cy={iy} r={26} fill={alpha(LIVE.accent, 0.3)} />
            <circle cx={ix} cy={iy} r={11} fill="#ffffff" />
          </svg>
        )}

        {/* 预备：12 点表盘外沿的起始光点，过冲弹出，起扫后被指针根部接管 */}
        {pre > 0 && frame < SWEEP0 + 4 && (
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
            <circle cx={px} cy={py} r={26 * pre} fill={alpha(LIVE.accent, 0.3)} />
            <circle cx={px} cy={py} r={11 * pre} fill="#ffffff" />
          </svg>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
