// terminal-3d —— 三个终端窗散布 3D 空间，相机窗间飞行（途中拉远），每到一窗打字机敲命令、结果逐行吐出。
// 手法不变：窗口姿态表 → 相机逆变换；两段飞行各带一个正弦拉远鼓包；离焦窗虚化；飞行中不打字。
//
// 第二轮重设计（设计决定）
// - look = lime（石墨暗场 · 荧光黄绿）：终端是技术感，单一强调色只给提示符、✓ 与最后的 LIVE 地址。
// - 内容编成一条完整的"三步上线"：虚构 CLI「forge」——01 init 脚手架 → 02 test 跑测试（计数 + 进度格）
//   → 03 deploy 上线，最后一行 ● LIVE orbit.forge.run 是全片唯一的泛光（Q4）。
// - 窗口按镜头重做：1240×700 的真实尺寸布局（相机落定时 1:1 栅格化，文字不糊，Q2），命令 46px、
//   输出 34px 等宽（≥ 辅助字 32px，Q11）；标题栏写步骤号与路径，不再是通用 "~/workspace — zsh"。
// - 空间：窗口沿一条弧线前后错落、各自偏转；每站相机不正对，留 8–10° 侧视（读得清且有体积）；
//   地面是按相机矩阵逐线投影的 SVG 透视网格（线宽恒定不闪），焦点窗下方地面有一摊黄绿反光；
//   每窗背后立一枚 560px 描边步骤号，飞行时与窗口产生视差。
// - 打字有人手节奏：每字 1–2f 的确定性抖动、敲完停 2f 再"回车"；输出是终端式的快速打印（3f 淡入 +
//   左移 10px 收回、行距 4f），状态位先转 braille 小菊花再落成 ✓。
//
// 时间表（30fps，246f）
//   0–24    开场：相机从拉远 260px 推近落定第一窗（out 曲线），窗口第 0 帧即在画面
//   8–27    敲 `forge init orbit`（16 字）→ 29 回车 → 31–48 四行输出（菊花 → ✓）
//   48–62   hold 读秒
//   62–92   飞行 1→2（30f，swift 不对称 in-out + sin 拉远 820px；按横向屏速加方向性模糊）
//   94–113  敲 `forge test --watch` → 115 回车 → 进度格 + 计数 0→128（20f，out）→ 三行 PASS → ✓ 汇总
//   140–152 hold
//   152–182 飞行 2→3
//   184–203 敲 `forge deploy --prod` → 205 回车 → 三行检查 → 220 ● LIVE 地址弹出 + 泛光
//   222–246 hold：相机极缓推近 2%，尾帧是"已上线"的海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, alpha, glow } from '../../_fixtures/Look';

export const TERMINAL_3D_DURATION = 246;

const L = LOOKS.lime;
// 舞台主光降饱和成橄榄灰绿：荧光色只留给提示符 / ✓ / LIVE，背景不被染成一片绿
const STAGE = { ...L, light: '#56613f', accent2: '#3a4a1c' };
const MONO = FONT.mono;
const W = 1180; // 窗口布局尺寸（= 落定时屏幕尺寸）
const H = 620;
const PERSP = 1800; // 场景透视距离
const FLOOR_Y = 500; // 地面高度（世界坐标，y 向下）

// ───────────── 窗口姿态表（世界坐标，px / 度）+ 每站相机侧视角 ─────────────
type Pose = { x: number; y: number; z: number; ry: number };
const POSES: Pose[] = [
  { x: -1500, y: -30, z: -220, ry: 24 },
  { x: 0, y: 30, z: 260, ry: -14 },
  { x: 1520, y: -40, z: -160, ry: 28 },
];
const VIEW = [9, -8, 10]; // 每站相机相对窗口的侧视角（度）
const TILT = -4; // 相机微俯（rotateX，度）

// 站点时序：每站 [到站帧, 打字起点]；飞行区间
const FLY = [[62, 92], [152, 182]] as const;
const TYPE_AT = [8, 94, 184];
const PULL_PEAK = 1250; // 飞行中拉远量（峰值处画面缩到 ~0.6，三窗同框）

// 确定性伪随机
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ───────────── 相机 ─────────────
// s = 连续站点参数（0..2），pull = 拉远量
const camAt = (f: number) => {
  let s = 0;
  let pull = 260 * (1 - ramp(f, 0, 24, EASE.out)); // 开场推近
  FLY.forEach(([a, b], i) => {
    const u = ramp(f, a, b - a, EASE.swift);
    s += u;
    const raw = Math.min(1, Math.max(0, (f - a) / (b - a)));
    pull += Math.sin(Math.PI * Math.pow(raw, 0.85)) * PULL_PEAK * (i === 0 ? 1 : 1.05);
  });
  pull -= 36 * ramp(f, 222, 24, EASE.smooth); // 尾段极缓推近 ~2%
  const i0 = Math.min(1, Math.floor(s));
  const k = s - i0;
  const a = POSES[i0], b = POSES[i0 + 1];
  const pose: Pose = { x: mix(a.x, b.x, k), y: mix(a.y, b.y, k), z: mix(a.z, b.z, k), ry: mix(a.ry, b.ry, k) };
  const view = mix(VIEW[i0], VIEW[i0 + 1], k);
  return { s, pull, pose, yaw: view - pose.ry };
};

// 与 world 的 CSS transform 完全同构的投影：translateZ(-pull) rotateX(TILT) rotateY(yaw) translate(-pose)
const project = (cam: ReturnType<typeof camAt>, p: [number, number, number]) => {
  const x0 = p[0] - cam.pose.x, y0 = p[1] - cam.pose.y, z0 = p[2] - cam.pose.z;
  const ty = (cam.yaw * Math.PI) / 180, tx = (TILT * Math.PI) / 180;
  const x1 = x0 * Math.cos(ty) + z0 * Math.sin(ty);
  const z1 = -x0 * Math.sin(ty) + z0 * Math.cos(ty);
  const y2 = y0 * Math.cos(tx) - z1 * Math.sin(tx);
  const z2 = y0 * Math.sin(tx) + z1 * Math.cos(tx) - cam.pull;
  return { x: x1, y: y2, z: z2 };
};
const toScreen = (q: { x: number; y: number; z: number }) => {
  const k = PERSP / (PERSP - q.z);
  return { x: 960 + q.x * k, y: 540 + q.y * k, k };
};

// ───────────── 透视地面（SVG，逐线投影；近处亮、远处隐入暗场） ─────────────
const Floor: React.FC<{ cam: ReturnType<typeof camAt>; frame: number }> = ({ cam }) => {
  const segs: React.ReactNode[] = [];
  const CELL = 240;
  const near = PERSP - 120;
  const line = (a: [number, number, number], b: [number, number, number], key: string) => {
    const N = 8;
    for (let j = 0; j < N; j++) {
      const pa = project(cam, [mix(a[0], b[0], j / N), a[1], mix(a[2], b[2], j / N)]);
      const pb = project(cam, [mix(a[0], b[0], (j + 1) / N), a[1], mix(a[2], b[2], (j + 1) / N)]);
      if (pa.z > near || pb.z > near) continue;
      const depth = PERSP - (pa.z + pb.z) / 2; // 到相机的距离
      const op = Math.max(0, Math.min(1, 1.25 - depth / 4200));
      if (op < 0.02) continue;
      const sa = toScreen(pa), sb = toScreen(pb);
      segs.push(<line key={`${key}${j}`} x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y} strokeOpacity={op * op} />);
    }
  };
  for (let i = -14; i <= 14; i++) line([i * CELL, FLOOR_Y, -3600], [i * CELL, FLOOR_Y, 2400], `c${i}`);
  for (let j = -15; j <= 10; j++) line([-3400, FLOOR_Y, j * CELL], [3400, FLOOR_Y, j * CELL], `r${j}`);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <g stroke={alpha(L.accent, 0.34)} strokeWidth={1.4}>{segs}</g>
    </svg>
  );
};

// 焦点窗下方的地面反光（投影到窗口脚下）
const FloorPool: React.FC<{ cam: ReturnType<typeof camAt>; i: number; on: number }> = ({ cam, i, on }) => {
  if (on < 0.02) return null;
  const p = POSES[i];
  const q = project(cam, [p.x, FLOOR_Y, p.z]);
  if (q.z > PERSP - 200) return null;
  const s = toScreen(q);
  const w = 1500 * s.k, h = 260 * s.k;
  return (
    <div style={{
      position: 'absolute', left: s.x - w / 2, top: s.y - h / 2, width: w, height: h, borderRadius: '50%',
      background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent, 0.26 * on)} 0%, ${alpha(L.accent, 0.08 * on)} 45%, ${alpha(L.accent, 0)} 72%)`,
    }} />
  );
};

// 焦点窗背后的背光（投影到窗心，屏幕空间）：把暗色窗体从暗场里剥离出来
const BackLight: React.FC<{ cam: ReturnType<typeof camAt>; i: number; on: number }> = ({ cam, i, on }) => {
  if (on < 0.02) return null;
  const p = POSES[i];
  const q = project(cam, [p.x, p.y - 60, p.z - 300]);
  if (q.z > PERSP - 200) return null;
  const s = toScreen(q);
  const w = 2500 * s.k, h = 1250 * s.k;
  return (
    <div style={{
      position: 'absolute', left: s.x - w / 2, top: s.y - h / 2, width: w, height: h, borderRadius: '50%',
      background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#d8e4b8', 0.3 * on)} 0%, ${alpha('#a8b878', 0.11 * on)} 46%, ${alpha('#9fb06a', 0)} 72%)`,
    }} />
  );
};

// ───────────── 终端内容 ─────────────
type Seg = [string, string]; // [文本, 颜色]
type Line = { mark?: 'spin' | 'pass'; segs: Seg[]; at: number; big?: boolean };
const C = { key: L.ink3, val: L.ink, dim: L.ink2, ok: L.accent };

type Win = { step: string; name: string; path: string; cmd: string; lines: Line[] };
const WINS: Win[] = [
  {
    step: '01', name: 'scaffold', path: '~/orbit', cmd: 'forge init orbit',
    lines: [
      { mark: 'spin', at: 0, segs: [['template   ', C.key], ['edge-starter', C.val]] },
      { mark: 'spin', at: 4, segs: [['packages   ', C.key], ['214 installed', C.val], [' · 3.1s', C.dim]] },
      { mark: 'spin', at: 8, segs: [['git        ', C.key], ['initialized on ', C.dim], ['main', C.val]] },
      { mark: 'pass', at: 14, segs: [['ready      ', C.ok], ['cd orbit && forge dev', C.val]] },
    ],
  },
  {
    step: '02', name: 'test', path: '~/orbit', cmd: 'forge test --watch',
    lines: [
      { at: 0, segs: [] }, // 进度格 + 计数（特殊绘制）
      { at: 10, segs: [['PASS ', C.ok], [' api/routes        ', C.val], ['42', C.dim]] },
      { at: 14, segs: [['PASS ', C.ok], [' ui/components     ', C.val], ['61', C.dim]] },
      { at: 18, segs: [['PASS ', C.ok], [' edge/runtime      ', C.val], ['25', C.dim]] },
      { mark: 'pass', at: 24, segs: [['128 passed', C.ok], ['  ·  coverage ', C.dim], ['94.2%', C.val]] },
    ],
  },
  {
    step: '03', name: 'deploy', path: '~/orbit', cmd: 'forge deploy --prod',
    lines: [
      { mark: 'spin', at: 0, segs: [['build      ', C.key], ['1.8s', C.val], [' · 312 kB', C.dim]] },
      { mark: 'spin', at: 4, segs: [['regions    ', C.key], ['18 edge locations', C.val]] },
      { mark: 'spin', at: 8, segs: [['checks     ', C.key], ['all passing', C.val]] },
      { at: 15, big: true, segs: [] }, // ● LIVE 地址（特殊绘制）
    ],
  },
];

// 每字打字节奏：基础 1.15f/字 + 确定性抖动；返回第 k 字出现的帧偏移
const charTimes = (cmd: string, seed: number) => {
  const out: number[] = [];
  let t = 0;
  for (let k = 0; k < cmd.length; k++) {
    out.push(t);
    const c = cmd[k];
    t += 0.75 + rand(seed * 31 + k) * 0.9 + (c === ' ' ? 0.6 : 0);
  }
  return { out, end: t };
};
const TYPING = WINS.map((w, i) => charTimes(w.cmd, i + 3));
const enterAt = (i: number) => TYPE_AT[i] + TYPING[i].end + 2; // 敲完停 2f 再回车
const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const Mark: React.FC<{ kind: 'spin' | 'pass'; t: number }> = ({ kind, t }) => {
  const done = kind === 'pass' || t > 6;
  return (
    <span style={{ display: 'inline-block', width: '1.6em', color: done ? C.ok : C.dim }}>
      {done ? '✓' : SPIN[Math.floor(t * 1.5) % SPIN.length]}
    </span>
  );
};

const Terminal: React.FC<{ i: number; frame: number; focus: number }> = ({ i, frame, focus }) => {
  const w = WINS[i];
  const t0 = TYPE_AT[i];
  const tf = frame - t0;
  const n = TYPING[i].out.filter((x) => x <= tf).length;
  const typing = tf >= 0 && n < w.cmd.length;
  const ent = enterAt(i);
  const caretOn = typing || Math.floor((frame - (tf < 0 ? 0 : t0 + TYPING[i].end)) / 8) % 2 === 0;
  const out0 = ent + 2;
  const lineIn = (at: number) => ramp(frame, out0 + at, 6, EASE.snappy);

  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden',
      background: `linear-gradient(180deg, #20241b 0%, #181b14 30%, #111309 100%)`,
      boxShadow: `inset 0 0 0 1.5px ${alpha('#e8ffc0', 0.1 + 0.08 * focus)}, inset 0 2px 0 ${alpha('#ffffff', 0.08 + 0.1 * focus)}`,
      fontFamily: MONO,
    }}>
      {/* 标题栏：三灯（降饱和）+ 步骤号 / 名称 + 路径 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, right: 0, height: 72, display: 'flex', alignItems: 'center',
        padding: '0 30px', gap: 14, borderBottom: `1.5px solid ${alpha('#e8ffc0', 0.07)}`,
        background: `linear-gradient(180deg, ${alpha('#ffffff', 0.035)}, ${alpha('#ffffff', 0)})`,
      }}>
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ width: 16, height: 16, borderRadius: 8, background: alpha(L.ink, 0.16), boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.12)}` }} />
        ))}
        <div style={{ marginLeft: 22, fontSize: 24, fontWeight: 700, color: L.accent, letterSpacing: '0.04em' }}>{w.step}</div>
        <div style={{ fontSize: 24, fontWeight: 500, color: L.ink2, letterSpacing: '0.02em' }}>{w.name}</div>
        <div style={{ marginLeft: 'auto', fontSize: 22, color: L.ink3 }}>{w.path} — zsh</div>
      </div>

      {/* 命令行：常驻提示符 + 已打出字符 + 紧贴的块光标 */}
      <div style={{ position: 'absolute', left: 56, top: 124, fontSize: 52, fontWeight: 600, color: L.ink, whiteSpace: 'pre', lineHeight: 1 }}>
        <span style={{ color: L.accent }}>❯ </span>
        {w.cmd.slice(0, Math.max(0, n))}
        {frame < ent + 1 && (
          <span style={{
            display: 'inline-block', width: '0.58em', height: '1.08em', marginLeft: 4, verticalAlign: '-0.16em',
            borderRadius: 3, background: L.accent, opacity: caretOn ? 0.95 : 0,
          }} />
        )}
      </div>

      {/* 输出 */}
      <div style={{ position: 'absolute', left: 56, right: 56, top: 220 }}>
        {w.lines.map((ln, k) => {
          const p = lineIn(ln.at);
          if (p <= 0) return null;
          const lt = frame - (out0 + ln.at);
          const style: React.CSSProperties = {
            position: 'absolute', left: 0, top: k * 70, fontSize: 38, fontWeight: 500, whiteSpace: 'pre', lineHeight: 1,
            opacity: Math.min(1, p * 1.8), transform: `translateX(${((1 - p) * -10).toFixed(2)}px)`,
          };
          if (i === 1 && k === 0) {
            // 进度格 + 计数（20f out 曲线）
            const c = ramp(frame, out0, 20, EASE.out);
            const N = 24;
            return (
              <div key={k} style={{ ...style, display: 'flex', alignItems: 'center', gap: 22 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {Array.from({ length: N }, (_, j) => (
                    <div key={j} style={{
                      width: 17, height: 34, borderRadius: 3,
                      background: j < Math.round(c * N) ? L.accent : alpha(L.ink, 0.1),
                    }} />
                  ))}
                </div>
                <span style={{ color: L.ink, fontVariantNumeric: 'tabular-nums' }}>{String(Math.round(c * 128)).padStart(3, ' ')}</span>
                <span style={{ color: L.ink3 }}>/ 128</span>
              </div>
            );
          }
          if (ln.big) {
            // ● LIVE 地址：全片唯一泛光（Q4）
            const pop = ramp(frame, out0 + ln.at, 14, EASE.overshoot);
            const g = ramp(frame, out0 + ln.at, 26, EASE.out);
            const pulse = 0.55 + 0.45 * Math.cos(Math.max(0, lt) / 6);
            return (
              <div key={k} style={{
                ...style, top: k * 70 + 16, display: 'flex', alignItems: 'center', gap: 26,
                transform: `translateX(${((1 - p) * -10).toFixed(2)}px) scale(${mix(0.94, 1, pop).toFixed(4)})`, transformOrigin: 'left center',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14, height: 56, padding: '0 22px', borderRadius: 12,
                  background: L.accent, color: L.onAccent, fontSize: 30, fontWeight: 800, letterSpacing: '0.08em',
                  boxShadow: `0 0 ${(40 * g).toFixed(1)}px ${alpha(L.accent, 0.45 * g)}`,
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: 7, background: L.onAccent, opacity: 0.4 + 0.6 * pulse }} />
                  LIVE
                </div>
                <span style={{ fontSize: 52, fontWeight: 700, color: L.accent, letterSpacing: '-0.01em', textShadow: glow(L.accent, 0.55 * g) }}>
                  orbit.forge.run
                </span>
              </div>
            );
          }
          return (
            <div key={k} style={style}>
              {ln.mark && <Mark kind={ln.mark} t={lt} />}
              {!ln.mark && <span style={{ display: 'inline-block', width: '0em' }} />}
              {ln.segs.map(([s, c], j) => <span key={j} style={{ color: c }}>{s}</span>)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ───────────── 主组件 ─────────────
export const Terminal3D: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  const v = cam.pose;

  // 横向屏速（px/帧）：相机目标在屏幕上的位移速度 → 方向性模糊，只在飞行段生效
  const a = camAt(frame - 0.5), b = camAt(frame + 0.5);
  const kS = PERSP / (PERSP + cam.pull);
  const vx = -(b.pose.x - a.pose.x) * kS;
  const vy = -(b.pose.y - a.pose.y) * kS;

  const world = `translateZ(${(-cam.pull).toFixed(2)}px) rotateX(${TILT}deg) rotateY(${cam.yaw.toFixed(3)}deg) translate3d(${(-v.x).toFixed(2)}px,${(-v.y).toFixed(2)}px,${(-v.z).toFixed(2)}px)`;

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={STAGE} keyLight={{ x: 0.36, y: -0.06 }} fill={{ x: 0.82, y: 1.0 }} horizon={0.47} intensity={1} breathe={0.4}>
        <Floor cam={cam} frame={frame} />
        {[0, 1, 2].map((i) => (
          <BackLight key={`b${i}`} cam={cam} i={i} on={Math.max(0, 1 - Math.abs(cam.s - i))} />
        ))}
        {[0, 1, 2].map((i) => (
          <FloorPool key={i} cam={cam} i={i} on={Math.max(0, 1 - Math.abs(cam.s - i))} />
        ))}
        <Dust look={L} count={36} seed={5} drift={0.35} opacity={0.45} />
      </Stage>
      <SpeedBlur vx={vx} vy={vy} amount={0.14} max={10}>
        <div style={{ position: 'absolute', inset: 0, perspective: PERSP, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 960, top: 540, width: 0, height: 0, transformStyle: 'preserve-3d', transform: world }}>
            {POSES.map((p, i) => {
              // 景深：离当前站越远越虚；拉远时景深变深（全景三窗都要看得出是终端），离焦量随拉远收窄
              const wide = Math.min(1, Math.max(0, cam.pull / PULL_PEAK));
              const focus = Math.min(1, Math.max(0, 1 - Math.abs(cam.s - i) * 1.25) + wide * 0.45);
              const blur = (1 - focus) * 3;
              return (
                <React.Fragment key={i}>
                  {/* 背后的描边步骤号（与窗口同朝向，位于窗后左上） */}
                  <div style={{
                    position: 'absolute', left: -W / 2 - 120, top: -H / 2 - 270, whiteSpace: 'nowrap',
                    transform: `translate3d(${p.x}px,${p.y}px,${p.z - 380}px) rotateY(${p.ry}deg)`,
                    fontFamily: FONT.sans, fontSize: 560, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.05em',
                    color: 'transparent', WebkitTextStroke: `2px ${alpha(L.accent, 0.07 + 0.3 * focus)}`,
                  }}>{WINS[i].step}</div>
                  {/* 窗口 */}
                  <div style={{
                    position: 'absolute', left: -W / 2, top: -H / 2, width: W, height: H,
                    transform: `translate3d(${p.x}px,${p.y}px,${p.z}px) rotateY(${p.ry}deg)`,
                    borderRadius: 22,
                    boxShadow: `0 50px 120px ${alpha('#000000', 0.7)}, 0 0 0 1px ${alpha('#000000', 0.4)}, 0 0 90px ${alpha(L.accent, 0.07 * focus)}`,
                    filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px) brightness(${(0.62 + 0.38 * focus).toFixed(3)})` : undefined,
                    opacity: 0.72 + 0.28 * focus,
                  }}>
                    <Terminal i={i} frame={frame} focus={focus} />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </SpeedBlur>
    </AbsoluteFill>
  );
};
