// cycle-glass-node-morph — 单主体在对角擦除中缩入机制图，三段循环标签沿弧线依次建立，
// 连续推近时三枚玻璃节点从下方托起并接管原标签，最后诊断标记错峰钉住系统状态。
//
// 第二轮重设计（铜绿夜 · 自主配送机器人的「感知—推理—执行」循环）：
// - look = custom「铜绿夜」：带青绿色相的近黑 + 薄荷青强调色（只给节点 / LED / 激光雷达环）+ 琥珀点缀
//   （只给诊断标记）。两个世界共用一个舞台：开场是夜色街景（城市散景、天际线剪影、地平线青光、
//   滚动车道线），机制场是同色系的"蓝图"——点阵底 + 带刻度环的内容圆。
// - 主体：原创配送机器人（珍珠白车身 + 青色腰线 + 黑色面罩 LED 眼 + 激光雷达桅杆 + 三轮），
//   开场 960px 宽在街上行驶（车道线滚动、轮毂转动、雷达环呼吸），擦除时同一个 DOM 缩入系统中心，
//   轮子随之减速停转——主体始终是同一个对象。
// - 机制图在原生 1920×1080 坐标里排版（不再用小画布放大）：标签 64px（宽机位下屏幕 ≈39px）、
//   玻璃节点 200px（薄荷青发光玻璃：径向体 + 顶部高光椭圆 + 内暗 + 外辉光，标题由白转深色），
//   诊断标记是琥珀三角 + 32px 状态字（360° scan / 42 ms plan / Drive OK）；
//   闭环形成后一颗信号光点沿环路循环（hold 段画面仍在运行）。
//
// 时间表（30fps，共 257f；关键帧与卡片一致）：
//   0–61    街景 hold：机器人行驶、HUD 状态条（Rover 12 · ETA 4 min）
//   62–94   主体 inOutCubic 缩入系统位；66–90 135° 硬边对角擦除（擦除线从画外进、越过对角画外出）
//   66–110  内容圆 0.3→1 长出；84–90 机制标题胶囊落位
//   124/129/134  三段标签七帧闪现（亮灭灭亮暗亮暗→锁定），随后沿弧线滑到宽机位终点
//   127–176 上下两条弧线同步描边生长，箭头随线端行进，176 闭环
//   176–198 连续推近 scale .61→.659→.935→1（单调三次 Hermite，中间不停顿）
//   184/192/200  三枚玻璃节点每隔 8f 从下方托起（overshoot 一次），接管标签
//   208/213/217  诊断标记独立错峰落位；222–256 hold（信号光点循环、刻度环极缓转动）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const CYCLE_GLASS_NODE_MORPH_DURATION = 257;

// 自定义「铜绿夜」——在 graphite 结构上换色
const L = {
  ...LOOKS.graphite,
  bg: ['#0d1918', '#091211', '#050a09'] as [string, string, string],
  light: '#2fb89a',
  line: 'rgba(150,255,225,0.10)',
  ink: '#eefaf6',
  ink2: '#9cb8b1',
  ink3: '#587570',
  accent: '#46e6c0',
  accent2: '#ffb45e',
  shadow: '#010403',
};
const MINT = L.accent;
const AMBER = L.accent2;

const inOutCubic = EASE.smooth;
const outBack = bezier(0.34, 1.56, 0.64, 1);

const seg = (frame: number, a: number, b: number, ease: (t: number) => number = EASE.linear) =>
  ease(Math.min(1, Math.max(0, (frame - a) / Math.max(1, b - a))));

// 推近：经过 4 个关键状态的单调三次 Hermite（共享内点切线，不三次启停）
const smoothCamera = (frame: number, values: readonly number[]) => {
  const frames = [176, 180, 190, 198] as const;
  if (frame <= frames[0]) return values[0];
  if (frame >= frames[3]) return values[3];
  const widths = frames.slice(1).map((v, i) => v - frames[i]);
  const secants = widths.map((w, i) => (values[i + 1] - values[i]) / w);
  const tangents = [secants[0]];
  for (let i = 1; i < values.length - 1; i++) {
    const a = secants[i - 1];
    const b = secants[i];
    if (a * b <= 0) { tangents.push(0); continue; }
    const w1 = 2 * widths[i] + widths[i - 1];
    const w2 = widths[i] + 2 * widths[i - 1];
    tangents.push((w1 + w2) / (w1 / a + w2 / b));
  }
  tangents.push(secants[secants.length - 1]);
  const s = frame <= frames[1] ? 0 : frame <= frames[2] ? 1 : 2;
  const w = widths[s];
  const t = (frame - frames[s]) / w;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * values[s] + (t3 - 2 * t2 + t) * w * tangents[s] + (-2 * t3 + 3 * t2) * values[s + 1] + (t3 - t2) * w * tangents[s + 1];
};

type P2 = readonly [number, number];
const quad = (a: P2, c: P2, b: P2, t: number) => {
  const u = 1 - t;
  return {
    x: u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    y: u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
    angle: (Math.atan2(2 * (u * (c[1] - a[1]) + t * (b[1] - c[1])), 2 * (u * (c[0] - a[0]) + t * (b[0] - c[0]))) * 180) / Math.PI,
  };
};

// 七帧闪现：亮→灭→灭→亮→暗→亮→暗→锁定
const flicker = (frame: number, start: number) => {
  const l = frame - start;
  if (l < 0) return 0;
  if (l === 0 || l === 3 || l === 5) return 1;
  if (l === 1 || l === 2) return 0;
  if (l === 4 || l === 6) return 0.4;
  return 1;
};

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ───────── 机制图几何（组坐标 = 推近完成后的屏幕坐标） ─────────
const O: P2 = [960, 560]; // 机制组缩放中心 = 内容圆心
const DISK_R = 470;
const NODES = [
  { key: 'SENSE', x: 520, y: 610, start: 184, label: 124, status: '360° scan' },
  { key: 'REASON', x: 960, y: 330, start: 192, label: 129, status: '42 ms plan' },
  { key: 'ACT', x: 1400, y: 610, start: 200, label: 134, status: 'Drive OK' },
] as const;
const ARC_TOP = { a: [520, 610] as P2, c: [960, 50] as P2, b: [1400, 610] as P2 };
const ARC_BOT = { a: [1400, 618] as P2, c: [960, 990] as P2, b: [520, 618] as P2 };
const NODE_D = 200;
const arcLength = (a: { a: P2; c: P2; b: P2 }) => {
  let len = 0;
  let prev = quad(a.a, a.c, a.b, 0);
  for (let k = 1; k <= 64; k++) {
    const q = quad(a.a, a.c, a.b, k / 64);
    len += Math.hypot(q.x - prev.x, q.y - prev.y);
    prev = q;
  }
  return len + 2;
};
const ARC_LEN = [arcLength(ARC_TOP), arcLength(ARC_BOT)];

// 主体框（组坐标）：开场 = 街景里的 960px 宽（÷ 宽机位 0.61 换算），终点 = 系统中心 380px 宽
const SUBJ_VB_W = 600;
const SUBJ_VB_H = 400;
const SUBJ_START = { cx: 960, cy: O[1] + (572 - O[1] - 26) / 0.61, w: 960 / 0.61 }; // 26 = 宽机位 camY
const SUBJ_END = { cx: 960, cy: 642, w: 380 };

// ───────── 主体：配送机器人 ─────────
const Rover: React.FC<{ spin: number; lidar: number }> = ({ spin, lidar }) => (
  <svg viewBox={`0 0 ${SUBJ_VB_W} ${SUBJ_VB_H}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
    <defs>
      <linearGradient id="cgBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6f9f8" />
        <stop offset="0.55" stopColor="#dfe7e5" />
        <stop offset="1" stopColor="#b8c4c1" />
      </linearGradient>
      <linearGradient id="cgSkirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2c3a37" />
        <stop offset="1" stopColor="#151d1c" />
      </linearGradient>
      <radialGradient id="cgLed">
        <stop offset="0" stopColor="#eafff9" />
        <stop offset="0.4" stopColor={MINT} />
        <stop offset="1" stopColor={MINT} stopOpacity={0} />
      </radialGradient>
    </defs>
    {/* 激光雷达桅杆 + 雷达帽（青色环随 lidar 呼吸） */}
    <rect x={150} y={44} width={14} height={72} rx={4} fill="#26322f" />
    <rect x={116} y={16} width={82} height={32} rx={11} fill="#18211f" />
    <rect x={122} y={29} width={70} height={5} rx={2.5} fill={MINT} opacity={0.55 + 0.45 * lidar} />
    <ellipse cx={157} cy={31} rx={60} ry={14} fill={MINT} opacity={0.12 * lidar} />
    {/* 车身 */}
    <rect x={40} y={110} width={520} height={200} rx={46} fill="url(#cgBody)" />
    <path d="M86 112 L514 112" stroke="#ffffff" strokeWidth={2} opacity={0.9} />
    <path d="M70 152 L530 152" stroke="#000" strokeOpacity={0.12} strokeWidth={2} />
    <rect x={40} y={232} width={520} height={10} fill={MINT} />
    <rect x={40} y={262} width={520} height={56} rx={22} fill="url(#cgSkirt)" />
    {/* 侧面标识 */}
    <circle cx={104} cy={196} r={15} fill="none" stroke="#2c3a37" strokeWidth={5} />
    <path d="M104 181 A15 15 0 0 1 119 196 L104 196 Z" fill="#2c3a37" />
    <text x={132} y={207} fill="#2c3a37" style={{ fontFamily: FONT.sans, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>R12</text>
    {/* 前面罩 + LED 眼 */}
    <rect x={438} y={160} width={100} height={64} rx={20} fill="#0a1110" />
    {[470, 506].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy={192} r={22} fill="url(#cgLed)" opacity={0.7} />
        <circle cx={cx} cy={192} r={7} fill="#eafff9" />
      </g>
    ))}
    {/* 三轮 */}
    {[132, 300, 468].map((cx, k) => (
      <g key={cx} transform={`translate(${cx} 334)`}>
        <circle r={50} fill="#0a0e0e" />
        <circle r={32} fill="#24302e" stroke="#556662" strokeWidth={2} />
        <g transform={`rotate(${spin + k * 24})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <rect key={a} x={-3} y={-30} width={6} height={22} rx={3} fill="#6f817d" transform={`rotate(${a})`} />
          ))}
        </g>
        <circle r={9} fill="#9fb2ad" />
      </g>
    ))}
  </svg>
);

// 节点图标（40px，深色描边）
const NodeIcon: React.FC<{ kind: string }> = ({ kind }) => (
  <svg width={44} height={44} viewBox="0 0 24 24" style={{ display: 'block' }}>
    {kind === 'SENSE' && (
      <>
        <path d="M2 12 C5.5 5.5 18.5 5.5 22 12 C18.5 18.5 5.5 18.5 2 12 Z" fill="none" stroke="#04241d" strokeWidth={2} strokeLinejoin="round" />
        <circle cx={12} cy={12} r={3.4} fill="#04241d" />
      </>
    )}
    {kind === 'REASON' && <path d="M12 2 C12.8 8.4 15.6 11.2 22 12 C15.6 12.8 12.8 15.6 12 22 C11.2 15.6 8.4 12.8 2 12 C8.4 11.2 11.2 8.4 12 2 Z" fill="#04241d" />}
    {kind === 'ACT' && <path d="M3 12 H19 M13.5 6 L19.5 12 L13.5 18" fill="none" stroke="#04241d" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
);

// 玻璃节点：薄荷青发光玻璃
const GlassNode: React.FC<{ frame: number; start: number; x: number; y: number; label: string }> = ({ frame, start, x, y, label }) => {
  const k = seg(frame, start, start + 8, outBack);
  const op = seg(frame, start, start + 3, EASE.out);
  const lift = 1 - seg(frame, start + 2, start + 14, EASE.out);
  return (
    <div style={{
      position: 'absolute', left: x - NODE_D / 2, top: y - NODE_D / 2, width: NODE_D, height: NODE_D, borderRadius: '50%',
      background: 'radial-gradient(circle at 34% 26%, #c9fff2 0%, #6ff0cf 24%, #22b896 58%, #0c6e5a 88%, #08503f 100%)',
      boxShadow:
        `inset 0 2px 1px rgba(255,255,255,0.7), inset 0 -22px 34px rgba(0,40,30,0.45), 0 0 0 1px ${alpha(MINT, 0.5)}, ` +
        `0 ${(10 + lift * 26).toFixed(1)}px ${(40 + lift * 40).toFixed(1)}px -8px rgba(0,0,0,${(0.65 - lift * 0.2).toFixed(2)}), ` +
        `0 0 ${(60 + 30 * (1 - lift)).toFixed(0)}px ${alpha(MINT, 0.35)}`,
      opacity: op, transform: `translateY(${mix(260, 0, k).toFixed(2)}px) scale(${mix(0.8, 1, k).toFixed(4)})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: 38, right: 38, top: 10, height: 64, borderRadius: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))' }} />
      <NodeIcon kind={label} />
      <div style={{ position: 'relative', ...type(34, 800, { caps: true }), color: '#04241d' }}>{label}</div>
    </div>
  );
};

// 诊断标记：琥珀三角 + 状态字
const Marker: React.FC<{ frame: number; start: number; x: number; y: number; dir: 'right' | 'down' | 'left'; text: string }> = ({ frame, start, x, y, dir, text }) => {
  const k = seg(frame, start, start + 6, outBack);
  const rot = dir === 'right' ? -90 : dir === 'down' ? 0 : 90;
  const off = 30 * (1 - k);
  const dx = dir === 'right' ? -off : dir === 'left' ? off : 0;
  const dy = dir === 'down' ? -off : 0;
  const textStyle: React.CSSProperties = {
    position: 'absolute', whiteSpace: 'nowrap', ...type(32, 650), color: AMBER, opacity: seg(frame, start + 2, start + 10, EASE.out),
  };
  return (
    <>
      <svg width={36} height={32} viewBox="0 0 36 32" style={{
        position: 'absolute', left: x - 18, top: y - 16, overflow: 'visible', opacity: Math.min(1, k * 2),
        transform: `translate(${dx}px, ${dy}px) rotate(${rot + (1 - k) * -24}deg) scale(${mix(0.6, 1, k)})`,
        filter: `drop-shadow(0 0 10px ${alpha(AMBER, 0.55)})`,
      }}>
        <path d="M4 4 L32 4 L18 28 Z" fill={AMBER} stroke={AMBER} strokeWidth={5} strokeLinejoin="round" />
      </svg>
      {dir === 'right' && <div style={{ ...textStyle, right: 1920 - x + 34, top: y - 20, textAlign: 'right' }}>{text}</div>}
      {dir === 'left' && <div style={{ ...textStyle, left: x + 34, top: y - 20 }}>{text}</div>}
      {dir === 'down' && <div style={{ ...textStyle, left: x - 200, width: 400, top: y - 74, textAlign: 'center' }}>{text}</div>}
    </>
  );
};

// ───────── 街景（被擦除的上下文层） ─────────
const BOKEH = Array.from({ length: 34 }, (_, i) => ({
  x: hash(i * 3.3) * 2300,
  y: 180 + hash(i * 7.7) * 480,
  r: 18 + hash(i * 1.9) * 70,
  warm: hash(i * 5.1) > 0.45,
  a: 0.18 + hash(i * 9.4) * 0.4,
  z: 0.4 + hash(i * 2.6) * 0.8,
}));
const TOWERS = Array.from({ length: 30 }, (_, i) => ({ x: i * 82 + hash(i) * 30, w: 56 + hash(i * 4) * 50, h: 60 + hash(i * 6) * 190 }));

const StreetScene: React.FC<{ frame: number; drive: number }> = ({ frame, drive }) => {
  const HZ = 700;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0a1715 0%, #0d2421 52%, #102b27 64%, #060c0b 66%, #050908 100%)' }} />
      {/* 城市散景（远景视差慢移） */}
      {BOKEH.map((b, i) => {
        const x = ((((b.x - drive * 1.2 * b.z) % 2300) + 2300) % 2300) - 190;
        const c = b.warm ? '#ffb45e' : '#46e6c0';
        return <div key={i} style={{ position: 'absolute', left: x - b.r, top: b.y - b.r, width: b.r * 2, height: b.r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(c, b.a)} 0%, ${alpha(c, b.a * 0.4)} 45%, ${alpha(c, 0)} 70%)` }} />;
      })}
      {/* 天际线剪影 */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {TOWERS.map((t, i) => {
          const x = ((((t.x - drive * 2.2) % 2460) + 2460) % 2460) - 200;
          return (
            <g key={i}>
              <rect x={x} y={HZ - t.h} width={t.w} height={t.h} fill="#081210" />
              {Array.from({ length: Math.floor(t.h / 34) }, (_, r) =>
                Array.from({ length: Math.floor(t.w / 22) }, (_, c) =>
                  hash(i * 31 + r * 7 + c) > 0.72 ? <rect key={`${r}-${c}`} x={x + 8 + c * 20} y={HZ - t.h + 12 + r * 32} width={7} height={10} fill="#ffb45e" opacity={0.35 + 0.4 * hash(i + r + c)} /> : null,
                ),
              )}
            </g>
          );
        })}
        <rect x={0} y={HZ - 2} width={1920} height={3} fill={MINT} opacity={0.25} />
      </svg>
      {/* 地平线青光 */}
      <div style={{ position: 'absolute', left: '-10%', right: '-10%', top: HZ - 80, height: 160, background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(MINT, 0.22)}, ${alpha(MINT, 0)} 70%)` }} />
      {/* 路面：反光 + 滚动车道线 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: HZ, bottom: 0, background: `linear-gradient(180deg, ${alpha('#46e6c0', 0.06)}, rgba(0,0,0,0) 40%)` }} />
      {Array.from({ length: 10 }, (_, k) => {
        const x = ((((k * 260 - drive * 16) % 2600) + 2600) % 2600) - 340;
        return <div key={k} style={{ position: 'absolute', left: x, top: 930, width: 150, height: 10, borderRadius: 5, background: 'rgba(230,255,248,0.22)' }} />;
      })}
      {/* HUD 状态条 */}
      <div style={{
        position: 'absolute', left: 96, right: 96, top: 84, height: 104, borderRadius: 26, padding: '0 40px',
        display: 'flex', alignItems: 'center', gap: 26, whiteSpace: 'nowrap',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))',
        border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 24px 60px -20px rgba(0,0,0,0.7)',
      }}>
        <span style={{ width: 16, height: 16, borderRadius: 8, background: MINT, boxShadow: `0 0 0 ${(4 + 4 * (0.5 + 0.5 * Math.sin(frame / 6))).toFixed(1)}px ${alpha(MINT, 0.18)}` }} />
        <span style={{ ...type(44, 750), color: L.ink }}>Rover 12</span>
        <span style={{ ...type(32, 500), color: L.ink2 }}>Autonomous · Live run</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 44 }}>
          <span style={{ ...type(32, 500), color: L.ink2 }}><b style={{ color: L.ink, fontWeight: 700 }}>0.8 km</b> to drop-off</span>
          <span style={{ ...type(32, 500), color: L.ink2 }}>ETA <b style={{ color: L.ink, fontWeight: 700 }}>4 min</b></span>
        </span>
      </div>
    </>
  );
};

export const CycleGlassNodeMorph: React.FC = () => {
  const frame = useCurrentFrame();

  const wipe = seg(frame, 66, 90, inOutCubic);
  const shrink = seg(frame, 62, 94, inOutCubic);
  const disk = seg(frame, 66, 110, EASE.out);
  const title = seg(frame, 84, 90, EASE.out) * (1 - seg(frame, 176, 192, EASE.out));
  const arcs = seg(frame, 127, 176, inOutCubic);
  const cam = smoothCamera(frame, [0.61, 0.659, 0.935, 1]);
  const camY = smoothCamera(frame, [26, 22, 4, 0]); // 宽机位整组略下沉，给标题胶囊让位

  // 行驶：0–62 匀速（机械语义），擦除期间刹停（距离积分随 shrink 递减）
  const drive = frame <= 62 ? frame : 62 + (32 / 2) * (1 - Math.pow(1 - seg(frame, 62, 94), 2));
  const spin = drive * 9;
  const lidar = 0.5 + 0.5 * Math.sin(frame / 7);

  // 组坐标 → 屏幕：O + (0, camY) + cam·(g − O)
  const toScreen = (gx: number, gy: number): [number, number] => [O[0] + cam * (gx - O[0]), O[1] + camY + cam * (gy - O[1])];

  // 擦除：135° 硬边，stop 从 −40% 到 140%（越过两个对角画外）
  const wipeStop = mix(-40, 140, wipe);
  const mask = `linear-gradient(135deg, transparent 0%, transparent ${wipeStop}%, #000 ${wipeStop + 0.15}%, #000 100%)`;

  // 主体框（组坐标）
  const sw = mix(SUBJ_START.w, SUBJ_END.w, shrink);
  const scx = mix(SUBJ_START.cx, SUBJ_END.cx, shrink);
  const scy = mix(SUBJ_START.cy, SUBJ_END.cy, shrink);
  const sh = (sw * SUBJ_VB_H) / SUBJ_VB_W;

  // 内容圆（屏幕坐标，随相机）
  const [dcx, dcy] = toScreen(O[0], O[1]);
  const dr = DISK_R * cam * mix(0.3, 1, disk);

  // 信号光点：闭环后沿 上弧 → 下弧 循环，周期 54f
  const pulseT = frame >= 176 ? ((frame - 176) % 54) / 54 : -1;
  const pulse = pulseT < 0 ? null : pulseT < 0.5 ? quad(ARC_TOP.a, ARC_TOP.c, ARC_TOP.b, pulseT * 2) : quad(ARC_BOT.a, ARC_BOT.c, ARC_BOT.b, (pulseT - 0.5) * 2);
  const pulseOn = seg(frame, 176, 190, EASE.out);

  const tipTop = quad(ARC_TOP.a, ARC_TOP.c, ARC_TOP.b, arcs);
  const tipBot = quad(ARC_BOT.a, ARC_BOT.c, ARC_BOT.b, arcs);

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.42 }} fill={{ x: 0.5, y: 1.05 }} intensity={0.55}>
        {/* 机制场：点阵蓝图底 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <pattern id="cgDots" width={40} height={40} patternUnits="userSpaceOnUse">
              <circle cx={20} cy={20} r={1.6} fill={MINT} opacity={0.18} />
            </pattern>
          </defs>
          <rect width={1920} height={1080} fill="url(#cgDots)" />
        </svg>

        {/* 内容圆：刻度环表盘 */}
        {disk > 0 && (
          <div style={{
            position: 'absolute', left: dcx - dr, top: dcy - dr, width: dr * 2, height: dr * 2, borderRadius: '50%', opacity: disk,
            background: `radial-gradient(circle at 50% 40%, #12302b 0%, #0c201d 60%, #0a1917 100%)`,
            boxShadow: `inset 0 0 0 1.5px ${alpha(MINT, 0.22)}, inset 0 2px 0 rgba(255,255,255,0.05), 0 40px 120px -30px rgba(0,0,0,0.8), 0 0 140px ${alpha(MINT, 0.06)}`,
          }}>
            <svg viewBox="-100 -100 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `rotate(${frame * 0.08}deg)` }}>
              {Array.from({ length: 96 }, (_, i) => {
                const a = (i / 96) * Math.PI * 2;
                const r0 = i % 8 === 0 ? 90 : 93;
                return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * 96} y2={Math.sin(a) * 96} stroke={MINT} strokeOpacity={i % 8 === 0 ? 0.4 : 0.18} strokeWidth={0.4} />;
              })}
              <circle r={78} fill="none" stroke={MINT} strokeOpacity={0.1} strokeWidth={0.3} strokeDasharray="1 2" />
              <circle r={52} fill="none" stroke={MINT} strokeOpacity={0.07} strokeWidth={0.3} />
            </svg>
          </div>
        )}

        {/* 街景：被 135° 硬边擦除揭走 */}
        {wipe < 1 && (
          <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: mask, maskImage: mask }}>
            <StreetScene frame={frame} drive={drive} />
          </div>
        )}
        {/* 擦除前沿：一条青白亮边 */}
        {wipe > 0 && wipe < 1 && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, rgba(220,255,245,0) ${wipeStop - 0.6}%, rgba(220,255,245,0.9) ${wipeStop + 0.08}%, rgba(70,230,192,0.25) ${wipeStop + 0.5}%, rgba(70,230,192,0) ${wipeStop + 2.2}%)`,
          }} />
        )}
      </Stage>

      {/* 机制标题胶囊（屏幕坐标） */}
      {title > 0.01 && (
        <div style={{
          position: 'absolute', left: 960, top: 196, transform: `translate(-50%, ${mix(16, 0, title).toFixed(2)}px)`, opacity: title,
          display: 'flex', alignItems: 'center', gap: 16, padding: '14px 30px', borderRadius: 999,
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${alpha(MINT, 0.3)}`, whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: MINT, boxShadow: `0 0 12px ${alpha(MINT, 0.8)}` }} />
          <span style={{ ...type(32, 700, { caps: true }), letterSpacing: '0.16em', color: L.ink }}>Autonomy loop</span>
        </div>
      )}

      {/* 机制组：推近只作用在这里 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: 1920, height: 1080,
        transform: `translate(0px, ${camY.toFixed(3)}px) scale(${cam.toFixed(5)})`, transformOrigin: `${O[0]}px ${O[1]}px`,
      }}>
        {/* 弧线 + 箭头 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {[ARC_TOP, ARC_BOT].map((a, k) => (
            <path key={k} d={`M${a.a[0]} ${a.a[1]} Q${a.c[0]} ${a.c[1]} ${a.b[0]} ${a.b[1]}`} fill="none" stroke={L.ink2} strokeOpacity={0.75}
              strokeWidth={4} strokeLinecap="round" strokeDasharray={ARC_LEN[k]} strokeDashoffset={ARC_LEN[k] * (1 - arcs)} />
          ))}
          {arcs > 0.02 && [tipTop, tipBot].map((t, k) => (
            <path key={k} d="M-22 -13 L4 0 L-22 13 Z" fill={L.ink} stroke={L.ink} strokeWidth={3} strokeLinejoin="round"
              opacity={seg(arcs, 0.02, 0.08)} transform={`translate(${t.x} ${t.y}) rotate(${t.angle})`} />
          ))}
          {pulse && (
            <g opacity={pulseOn}>
              <circle cx={pulse.x} cy={pulse.y} r={26} fill={MINT} opacity={0.18} />
              <circle cx={pulse.x} cy={pulse.y} r={9} fill="#eafff9" />
            </g>
          )}
        </svg>

        {/* 主体接触影 + 主体 */}
        <div style={{
          position: 'absolute', left: scx - sw * 0.46, top: scy + sh * 0.43, width: sw * 0.92, height: sh * 0.14, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(0,0,0,0.7), rgba(0,0,0,0))',
        }} />
        {/* 街面倒影：只在开场街景里，随缩入淡掉 */}
        {shrink < 1 && (
          <div style={{
            position: 'absolute', left: scx - sw / 2, top: scy - sh / 2 + sh * (2 * 384 / 400), width: sw, height: sh,
            transform: 'scaleY(-1)', transformOrigin: '50% 0%', opacity: 0.16 * (1 - shrink),
            WebkitMaskImage: 'linear-gradient(0deg, #000 0%, transparent 45%)', maskImage: 'linear-gradient(0deg, #000 0%, transparent 45%)',
          }}>
            <Rover spin={spin} lidar={lidar} />
          </div>
        )}
        <div style={{ position: 'absolute', left: scx - sw / 2, top: scy - sh / 2, width: sw, height: sh }}>
          <Rover spin={spin} lidar={lidar} />
        </div>

        {/* 概念标签：七帧闪现 → 沿弧线滑到终点；节点托起时淡出（被节点接管） */}
        {NODES.map((n, i) => {
          const op = flicker(frame, n.label);
          const slide = seg(frame, n.label, 160, EASE.out);
          const take = seg(frame, n.start + 2, n.start + 8, EASE.out);
          const dx = (i - 1) * mix(60, 0, slide);
          const dy = mix(i === 1 ? -40 : 30, 0, slide);
          return (
            <div key={n.key} style={{
              position: 'absolute', left: n.x - 300 + dx, top: n.y - 40 + dy, width: 600, textAlign: 'center',
              ...type(64, 750, { caps: true }), letterSpacing: '0.06em', color: L.ink, opacity: op * (1 - take),
              textShadow: `0 0 30px ${alpha(MINT, 0.25)}`,
            }}>{n.key}</div>
          );
        })}

        {NODES.map((n) => <GlassNode key={n.key} frame={frame} start={n.start} x={n.x} y={n.y} label={n.key} />)}

        <Marker frame={frame} start={208} x={NODES[0].x - 150} y={NODES[0].y} dir="right" text={NODES[0].status} />
        <Marker frame={frame} start={213} x={NODES[1].x} y={NODES[1].y - 150} dir="down" text={NODES[1].status} />
        <Marker frame={frame} start={217} x={NODES[2].x + 150} y={NODES[2].y} dir="left" text={NODES[2].status} />
      </div>
    </AbsoluteFill>
  );
};
