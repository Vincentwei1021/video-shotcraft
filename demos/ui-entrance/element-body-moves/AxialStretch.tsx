// axial-stretch —— 轴向拉伸速度感（糖稀拉丝 → 撞停压扁 → 弹回收正）
//
// 第二轮重设计（石墨夜跑 · 赛后数据三连）：
// - look = lime（石墨底 · 荧光黄绿）：速度 / 运动数据的语义。主角是三块 540×470 的大号数据砖
//   「PACE 4:12 / DISTANCE 21.1 / HEART 152」，168px 粗黑数字，从右外一块接一块横冲进三个预留空槽。
// - 手法本身（保留并加强）：拉伸只由「位置差分速度」驱动——v<2px/f 不拉，≥140px/f 满拉（scaleX 2.2 /
//   scaleY 0.72），锚点在运动后缘（右缘），所以前缘被速度"抻"出去，减速时自己缩回；
//   落点不是软着陆：飞行曲线末端仍保留 ~12px/f 的余速 → 撞停一瞬切到「压扁」（以撞击面左缘为锚，
//   scaleX 0.86 / scaleY 1.08），再由一个 damping 14 的弹簧弹回（一次可见过冲）。
// - 跟随：砖块里的内容晚一拍——撞停时内容因惯性继续前冲 ~18px 再被弹簧拉回；
//   图表在落定后才逐条画出（子元素比底板晚 6–10f），槽位边缘一圈荧光绿 ping 把"落位"钉住。
// - 每块砖的飞行距离统一为 2000px（各自从 target+2000 起飞），三块拉丝强度一致；
//   起飞间隔 10f → 8f，越来越快（R2）。
//
// 时间表（30fps，共 130f）：
//   0–20    预备：舞台光、三个空槽、标题逐词升起
//   12–36   砖 1 飞行（24f），36f 撞停 → 压扁弹回 ~48f
//   22–46   砖 2 飞行，46f 撞停
//   30–54   砖 3 飞行，54f 撞停，~66f 全部收正
//   42–92   余波：图表逐条画出、对比行淡入、计数徽章 1/3→3/3
//   60–130  hold：极缓推镜 1→1.02（呼吸），尾段 ~30f 完全静止的海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, bezier, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const AXIAL_STRETCH_DURATION = 130;

const L = LOOKS.lime;

// ───────────── 版式 ─────────────
const TILE_W = 540;
const TILE_H = 470;
const GAP = 36;
const ROW_X0 = (1920 - (3 * TILE_W + 2 * GAP)) / 2; // 114
const ROW_Y = 440;
const RADIUS = 30;

// ───────────── 运动参数 ─────────────
const STARTS = [12, 22, 30]; // 起飞帧：间隔 10f → 8f，越来越快
const FLIGHT = 24; // 飞行帧数
const TRAVEL = 2000; // 每块都从 target + 2000 起飞（拉丝强度一致）
const VEL_MIN = 2; // px/f 以下不拉伸
const VEL_REF = 140; // px/f 达到即满拉伸
const STRETCH_X = 1.2; // scaleX 峰值 2.2
const SQUISH_Y = 0.28; // scaleY 谷值 0.72
// 飞行曲线：in-out，中段速度峰值 ~2× 平均（满拉 ~6f），末端斜率 0.15 → 撞停时仍有 ~12px/f 余速
const flightEase = bezier(0.55, 0, 0.6, 0.94);

const posAt = (f: number, i: number) => {
  const target = ROW_X0 + i * (TILE_W + GAP);
  return target + TRAVEL * (1 - flightEase((f - STARTS[i]) / FLIGHT));
};
const landAt = (i: number) => STARTS[i] + FLIGHT;

// 撞停弹簧：0 → 1（过冲一次），驱动压扁回弹与内容惯性
const impact = (f: number, i: number) => (f < landAt(i) ? 0 : springAt(f, landAt(i), { damping: 14, stiffness: 300 }));

// ───────────── 内容 ─────────────
type TileData = {
  label: string; value: string; unit: string; delta: string; deltaRest: string;
  icon: 'pace' | 'route' | 'heart';
};
const TILES: TileData[] = [
  { label: 'Avg pace', value: '4:12', unit: '/km', delta: '−8s', deltaRest: 'vs last week', icon: 'pace' },
  { label: 'Distance', value: '21.1', unit: 'km', delta: '+3.4', deltaRest: 'longest this year', icon: 'route' },
  { label: 'Heart rate', value: '152', unit: 'bpm', delta: 'Z3', deltaRest: 'steady aerobic', icon: 'heart' },
];

// 21 段配速（越低越快，最后两段冲刺）
const SPLITS = [0.62, 0.58, 0.6, 0.55, 0.57, 0.54, 0.56, 0.52, 0.55, 0.5, 0.53, 0.49, 0.51, 0.47, 0.5, 0.46, 0.48, 0.44, 0.45, 0.36, 0.3];

const Icon: React.FC<{ kind: TileData['icon'] }> = ({ kind }) => (
  <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={L.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'pace' && (<><circle cx={12} cy={13} r={8} /><path d="M12 13l3.5-3.5M10 2.5h4" /></>)}
    {kind === 'route' && (<><circle cx={6} cy={18} r={2.2} /><circle cx={18} cy={6} r={2.2} /><path d="M8 18h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16" /></>)}
    {kind === 'heart' && <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z" />}
  </svg>
);

// 图表：落定后才画（draw 0→1）
const Chart: React.FC<{ kind: TileData['icon']; draw: number }> = ({ kind, draw }) => {
  const W = TILE_W - 88, H = 104;
  if (kind === 'pace') {
    const bw = W / SPLITS.length;
    return (
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        {SPLITS.map((v, k) => {
          const p = ramp(draw * (SPLITS.length + 6), k, 6, EASE.snappy);
          const h = (1 - v) * H * 1.35 * p;
          const hot = k >= SPLITS.length - 2;
          return <rect key={k} x={k * bw + 2} y={H - h} width={bw - 5} height={h} rx={3} fill={hot ? L.accent : alpha(L.ink, 0.16)} />;
        })}
      </svg>
    );
  }
  if (kind === 'route') {
    // 累计距离曲线 + 本年最远的终点
    const pts = Array.from({ length: 41 }, (_, k) => {
      const t = k / 40;
      return [t * W, H - 8 - (H - 22) * (t * 0.92 + 0.05 * Math.sin(t * 9))] as const;
    });
    const d = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const len = W * 1.25;
    const [ex, ey] = pts[40];
    return (
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke={alpha(L.ink, 0.12)} strokeWidth={2} />
        <path d={d} fill="none" stroke={L.accent} strokeWidth={5} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
        <circle cx={ex} cy={ey} r={9 * ramp(draw, 0.85, 0.15, EASE.overshoot)} fill={L.accent} />
      </svg>
    );
  }
  // 心率：一段 ECG 式折线
  const seg = [0, 0, 0.1, -0.15, 0.95, -0.55, 0.12, 0, 0.18, 0.05, 0];
  const pts: [number, number][] = [];
  for (let b = 0; b < 3; b++) seg.forEach((v, k) => pts.push([(b * seg.length + k) * (W / (3 * seg.length - 1)), H / 2 + 6 - v * H * 0.4]));
  const d = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const len = W * 2.6;
  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      <path d={d} fill="none" stroke={L.accent} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
    </svg>
  );
};

const TileFace: React.FC<{ d: TileData; draw: number; deltaIn: number }> = ({ d, draw, deltaIn }) => (
  <div style={{ position: 'absolute', inset: 0, padding: '40px 44px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <Icon kind={d.icon} />
      <div style={{ ...type(26, 650, { caps: true }), color: L.ink2, letterSpacing: '0.12em' }}>{d.label}</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 26 }}>
      <div style={{ ...type(168, 800), color: L.ink, letterSpacing: '-0.055em', lineHeight: 0.9 }}>{d.value}</div>
      <div style={{ ...type(44, 600), color: L.ink2 }}>{d.unit}</div>
    </div>
    <div style={{ marginTop: 'auto' }}>
      <Chart kind={d.icon} draw={draw} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 22, opacity: deltaIn, transform: `translateY(${((1 - deltaIn) * 10).toFixed(2)}px)` }}>
        <span style={{ ...type(32, 750), color: L.accent }}>{d.delta}</span>
        <span style={{ ...type(30, 500), color: L.ink2 }}>{d.deltaRest}</span>
      </div>
    </div>
  </div>
);

// ───────────── 飞砖 ─────────────
const FlyTile: React.FC<{ i: number; frame: number; mirror?: boolean }> = ({ i, frame, mirror }) => {
  const x = posAt(frame, i);
  // 速度 = 位置差分（不拿缓动进度近似；低于阈值自动收正）
  const v = Math.abs(posAt(frame, i) - posAt(frame - 1, i));
  const landed = frame >= landAt(i);
  const s = landed ? 0 : Math.min(1, Math.max(0, (v - VEL_MIN) / (VEL_REF - VEL_MIN)));
  const st = 1 + STRETCH_X * s; // 拉伸（锚点 = 右缘 / 运动后缘）
  const sy = 1 - SQUISH_Y * s;
  const k = impact(frame, i); // 0 → 1（过冲）
  const sqx = landed ? 1 - 0.14 * (1 - k) : 1; // 压扁（锚点 = 左缘 / 撞击面）
  const sqy = landed ? 1 + 0.08 * (1 - k) : 1;
  // 用 left 偏移实现两种锚点：拉伸时右缘固定 → 左缘前移 W(st-1)
  const left = x - TILE_W * (st - 1);
  const scaleX = st * sqx;
  const scaleY = sy * sqy;
  // 内容惯性：撞停瞬间继续前冲（向左）再被弹回
  const inner = landed ? -18 * (1 - k) : 0;
  const draw = ramp(frame, landAt(i) + 8, 30, EASE.out);
  const deltaIn = ramp(frame, landAt(i) + 22, 16, EASE.snappy);
  const elev = 6 + 34 * s; // 飞得快 = 离面高
  if (left > 1960) return null;
  return (
    <>
      {/* 接触影：独立椭圆，随拉伸一起被抻长 */}
      {!mirror && <div style={{
        position: 'absolute', left, top: ROW_Y + TILE_H - 30, width: TILE_W, height: 70,
        transform: `scaleX(${scaleX.toFixed(4)})`, transformOrigin: '0 50%',
        background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#000000', 0.7 - 0.35 * s)} 0%, ${alpha('#000000', 0)} 70%)`,
        filter: `blur(${(8 + elev * 0.4).toFixed(1)}px)`, opacity: 0.9,
      }} />}
      <div style={{
        position: 'absolute', left, top: ROW_Y, width: TILE_W, height: TILE_H, borderRadius: RADIUS, overflow: 'hidden',
        transform: `scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`, transformOrigin: '0 50%',
        background: `linear-gradient(180deg, #1e2119 0%, #15170f 100%)`,
        border: `1px solid ${alpha('#e8ffc0', 0.12)}`, boxSizing: 'border-box',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 ${(elev * 0.5).toFixed(1)}px ${(elev * 1.6).toFixed(1)}px rgba(0,0,0,0.55)`,
      }}>
        {/* 受光顶沿：左上一抹荧光绿余光 */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 60% at 18% 0%, ${alpha(L.accent, 0.08)} 0%, ${alpha(L.accent, 0)} 70%)` }} />
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${inner.toFixed(2)}px)` }}>
          <TileFace d={TILES[i]} draw={draw} deltaIn={deltaIn} />
        </div>
      </div>
    </>
  );
};

// ───────────── 主体 ─────────────
export const AxialStretch: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = 1 + 0.02 * ramp(frame, 56, 74, EASE.smooth);
  const landedCount = [0, 1, 2].filter((i) => frame >= landAt(i)).length;
  const badgeBump = Math.max(...[0, 1, 2].map((i) => {
    const p = (frame - landAt(i)) / 10;
    return p > 0 && p < 1 ? Math.sin(Math.PI * p) : 0;
  }));
  const slotsIn = ramp(frame, 0, 14, EASE.out);

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: -0.12 }} fill={{ x: 0.9, y: 1.05 }} horizon={0.88} intensity={0.5} breathe={0.3} grain={0.08}>
        <Dust look={L} count={26} seed={4} drift={-0.6} opacity={0.35} />
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: '50% 60%' }}>
        {/* 标题区 */}
        <div style={{ position: 'absolute', left: ROW_X0, top: 150, ...type(26, 600, { mono: true }), color: L.ink3, letterSpacing: '0.08em', opacity: ramp(frame, 0, 16, EASE.out) }}>
          SAT 06:42 · LONG RUN · RIVERSIDE LOOP
        </div>
        <div style={{ position: 'absolute', left: ROW_X0, top: 200, ...type(104, 800), color: L.ink, whiteSpace: 'nowrap' }}>
          <TextReveal text="Half marathon," by="word" start={0} each={18} gap={4} />{' '}
          <TextReveal text="done." by="word" start={8} each={18} style={{ color: L.accent }} />
        </div>
        {/* 计数徽章：每落一块 +1，落位那一下鼓一下 */}
        <div style={{
          position: 'absolute', right: ROW_X0, top: 236, display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 22px', borderRadius: 40, border: `1px solid ${L.line}`, background: alpha(L.surface2, 0.8),
          transform: `scale(${(1 + 0.08 * badgeBump).toFixed(4)})`, opacity: slotsIn,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: landedCount === 3 ? L.accent : L.ink3, boxShadow: landedCount === 3 ? `0 0 14px ${alpha(L.accent, 0.8)}` : undefined }} />
          <div style={{ ...type(30, 650), color: L.ink }}>
            {landedCount}<span style={{ color: L.ink3 }}> / 3 synced</span>
          </div>
        </div>

        {/* 空槽：真实落位（内凹 + 发丝线 + 幽灵标签），撞停瞬间边缘泛起荧光绿 ping */}
        {[0, 1, 2].map((i) => {
          const land = landAt(i);
          const ping = ramp(frame, land, 18, EASE.out);
          const pingOp = frame >= land ? 1 - ping : 0;
          return (
            <div key={`slot${i}`} style={{
              position: 'absolute', left: ROW_X0 + i * (TILE_W + GAP), top: ROW_Y, width: TILE_W, height: TILE_H, borderRadius: RADIUS,
              background: alpha('#000000', 0.22), border: `1.5px dashed ${alpha(L.ink, 0.17)}`, boxSizing: 'border-box',
              boxShadow: `inset 0 3px 14px rgba(0,0,0,0.45)${pingOp > 0 ? `, 0 0 0 ${(2 + ping * 16).toFixed(2)}px ${alpha(L.accent, 0.45 * pingOp)}` : ''}`,
              opacity: slotsIn,
            }}>
              <div style={{ position: 'absolute', left: 44, top: 44, ...type(26, 650, { caps: true }), letterSpacing: '0.12em', color: L.ink3, opacity: frame < land - 4 ? 0.7 : 0 }}>
                {TILES[i].label}
              </div>
            </div>
          );
        })}

        {/* 地面倒影：沿槽底翻转、向下渐隐（只有 ~10% 亮度，给"桌面"一个实在的反光面） */}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, opacity: 0.08,
          transform: `translateY(${2 * (ROW_Y + TILE_H) + 16}px) scaleY(-1)`, transformOrigin: '0 0',
          WebkitMaskImage: `linear-gradient(180deg, transparent ${ROW_Y + TILE_H - 100}px, #000 ${ROW_Y + TILE_H}px)`,
        }}>
          {[0, 1, 2].map((i) => <FlyTile key={i} i={i} frame={frame} mirror />)}
        </div>
        {[0, 1, 2].map((i) => <FlyTile key={i} i={i} frame={frame} />)}
      </div>
    </AbsoluteFill>
  );
};
