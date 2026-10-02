// paper-plane-messenger —— 纸飞机信使转场（pitch-app 77–82s 的 2.5D 简化）
// 点击"发送"后镜头拉远脱离窗口 A（写信窗），折纸飞机从发送键里弹出、沿弧线飞行（俯仰跟随切线、转弯倾侧），
// 镜头伴飞穿过多层视差，飞抵窗口 B（收件箱）的新消息槽位落定，新消息行顶开列表，B 放大接管全屏。
//
// 第二轮重设计（夜航 · 深蓝夜空里的一架白纸飞机）：
// - look = midnight（深蓝夜 · 电光蓝 · 青绿点缀）。两扇窗是浮在夜空里的深色玻璃面板（发丝描边 + 顶部内高光），
//   世界里只有一个亮主角：白色纸飞机，身后拖一条由暗到亮的光迹（宽辉光 + 细亮芯，尾端渐隐）。
// - 视差三层换成夜空语汇：远层星点（depth 0.28，闪烁）/ 中层薄云（0.62）/ 近层焦外云絮（1.5，从镜头前掠过）。
// - 窗口为镜头放大排版：A 在贴脸变焦 1.5 时正文 ≈ 39px；B 接管（变焦 2 = 窗宽 960 恰好铺满 1920）后
//   姓名 52px、摘要 44px。发送键点击后变成「Sent ✓」（因果闭环），B 的「1 new」徽标随新行到达点亮。
// - 相机：screen = 960 + (world − camCenter) × zoom × depth；变焦在对数空间插值，三段在切换帧上中心与变焦连续：
//   1.5 贴脸 A → 0.5 拉远伴飞（伴飞中缓推到 0.56）→ 2.0 B 满幅。
//
// 时间表（30fps，共 172f）：
//   0–12    预备：A 贴脸，光标滑向发送键（第 0 帧即完整画面）
//   12–16   点击：按下 3f 压到 0.93 → 过冲回弹 + 扩散圈；按钮文案 → Sent ✓
//   14–46   拉远：变焦 1.5→0.5（smooth），镜头中心开始跟飞机
//   30–106  飞行 76f：起飞加速、落定减速；途中放大 1.8×；光迹随飞
//   96–112  让位：新行 0→96px 提前顶开列表（空槽迎接飞机）
//   102–116 到达：飞机缩进新行头像位 + 一圈强调色涟漪
//   110–142 接管：变焦推到 2.0，B 圆角收到 0、云层与光迹淡出
//   142–172 hold：收件箱海报，新行高亮呼吸
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const PAPER_PLANE_MESSENGER_DURATION = 172;

const L = LOOKS.midnight;

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---- 世界坐标 ----
const AX = 600, AY = 560; // 窗口 A 中心（写信）
const BX = 3500, BY = 600; // 窗口 B 中心（收件箱）
const WIN_W = 960, WIN_H = 540; // 16:9 窗：B 接管时（zoom 2）恰好铺满 1920×1080
const Z_TAKE = 1920 / WIN_W;
const BAR = 52;

const ROW_H = 96;
const LIST_TOP = BY - WIN_H / 2 + BAR + 22 + 76; // 标题栏 + padding + 表头
const SEND = { x: AX + WIN_W / 2 - 38 - 100, y: AY + WIN_H / 2 - 34 - 32 }; // 发送键中心
const P0 = SEND;
const P1 = { x: 1500, y: -170 }; // 高抛
const P2 = { x: 2650, y: 250 }; // 下压
const AVATAR = { x: BX - WIN_W / 2 + 28 + 24 + 28, y: LIST_TOP + ROW_H / 2 }; // 新行头像中心
const P3 = { x: AVATAR.x - 70, y: AVATAR.y };
const bez = (t: number) => {
  const u = 1 - t;
  return {
    x: u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x,
    y: u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y,
  };
};

// ---- 时间轴 ----
const CLICK = 12;
const ZOOM_OUT = [14, 46] as const;
const FLY = [30, 106] as const;
const ARRIVE = 104; // 飞机缩进头像位
const ROW_OPEN = 96; // 新行提前 8f 顶开列表——列表"让出槽位"迎接飞机（预备），飞机进的是空槽
const TAKEOVER = [110, 142] as const;

const FLY_EASE = bezier(0.45, 0.05, 0.25, 1); // 起飞加速、落定减速
const TAKE_EASE = bezier(0.6, 0, 0.15, 1); // 慢起、长尾减速推进 B
const flyT = (f: number) => ramp(f, FLY[0], FLY[1] - FLY[0], FLY_EASE);
const tangentAngle = (t: number) => {
  const a = bez(Math.min(t, 0.988));
  const b = bez(Math.min(t + 0.012, 1));
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
};

// ---- 视差层（确定性）----
type Star = { x: number; y: number; r: number; tw: number };
// 远层 depth 0.28 × 伴飞变焦 0.5 ≈ 0.14：世界里要铺 ~8000px 高才能在拉远时铺满画面（屏外的直接剔除）
const STARS: Star[] = Array.from({ length: 170 }, (_, i) => ({
  x: -5200 + hash(i * 3.1) * 14400, y: -3600 + hash(i * 7.7) * 8400, r: 1.2 + hash(i * 1.3) * hash(i * 1.3) * 3.4, tw: hash(i * 9.1) * 6.28,
}));
type Cloud = { x: number; y: number; w: number; h: number; depth: number; a: number };
const CLOUDS: Cloud[] = [
  { x: 900, y: 980, w: 1500, h: 360, depth: 0.62, a: 0.2 }, { x: 2300, y: -260, w: 1300, h: 300, depth: 0.62, a: 0.14 },
  { x: 3300, y: 1080, w: 1700, h: 380, depth: 0.62, a: 0.18 }, { x: 1700, y: 480, w: 900, h: 220, depth: 0.62, a: 0.1 },
  { x: 4300, y: 160, w: 1400, h: 320, depth: 0.62, a: 0.12 },
  { x: 1500, y: 860, w: 1300, h: 420, depth: 1.5, a: 0.16 }, { x: 2700, y: -120, w: 1200, h: 360, depth: 1.5, a: 0.12 },
  { x: 3500, y: 1180, w: 1500, h: 400, depth: 1.5, a: 0.14 },
];

// ---- 小件 ----
const Avatar: React.FC<{ txt: string; c: string; size?: number }> = ({ txt, c, size = 56 }) => (
  <div style={{
    width: size, height: size, borderRadius: size / 2, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(160deg, ${c}, ${alpha(c, 0.7)})`, color: '#fff', ...type(size * 0.38, 650), letterSpacing: '0.01em',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
  }}>{txt}</div>
);

const PlaneIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
    <path d="M21.5 2.5 10.6 13.4" />
    <path d="M21.5 2.5 14.6 21.5l-4-8.1-8.1-4z" />
  </svg>
);

// 深色玻璃窗：标题栏 + 三点 + 标题
const Glass: React.FC<{ cx: number; cy: number; title: string; radius?: number; lit?: number; children: React.ReactNode }> = ({ cx, cy, title, radius = 22, lit = 0, children }) => (
  <div style={{
    position: 'absolute', left: cx - WIN_W / 2, top: cy - WIN_H / 2, width: WIN_W, height: WIN_H, borderRadius: radius, overflow: 'hidden',
    background: `linear-gradient(180deg, ${alpha('#162042', 0.97)} 0%, ${alpha('#0f1630', 0.97)} 100%)`, fontFamily: FONT.sans,
    boxShadow: `inset 0 0 0 1.5px ${L.line}, inset 0 1.5px 0 rgba(255,255,255,0.10), 0 40px 90px -30px rgba(0,2,10,0.9), 0 0 ${(120 * lit).toFixed(0)}px ${alpha(L.accent, 0.22 * lit)}`,
  }}>
    <div style={{ height: BAR, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', borderBottom: `1px solid ${L.line}`, position: 'relative', background: alpha('#ffffff', 0.02) }}>
      {[0, 1, 2].map((k) => <div key={k} style={{ width: 13, height: 13, borderRadius: 7, background: alpha('#ffffff', 0.16) }} />)}
      <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', ...type(20, 600), color: L.ink2 }}>{title}</div>
    </div>
    {children}
  </div>
);

// 窗口 A：写信
const ComposeWindow: React.FC<{ press: number; ripple: number; sent: number }> = ({ press, ripple, sent }) => {
  const field: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, height: 62, borderBottom: `1px solid ${L.line}` };
  return (
    <Glass cx={AX} cy={AY} title="New message">
      <div style={{ padding: '6px 38px 0' }}>
        <div style={field}>
          <span style={{ ...type(24, 500), color: L.ink3, width: 92 }}>To</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 16px 5px 5px', borderRadius: 22, background: alpha(L.accent, 0.14), boxShadow: `inset 0 0 0 1px ${alpha(L.accent, 0.3)}` }}>
            <Avatar txt="MC" c="#e0567a" size={32} />
            <span style={{ ...type(24, 600), color: L.ink }}>Maya Chen</span>
          </div>
        </div>
        <div style={field}>
          <span style={{ ...type(24, 500), color: L.ink3, width: 92 }}>Subject</span>
          <span style={{ ...type(26, 650), color: L.ink }}>Launch film — final cut</span>
        </div>
        <div style={{ paddingTop: 26, ...type(26, 450), lineHeight: 1.5, color: L.ink2 }}>
          Hi Maya — the final cut is attached.
          <br />Ready to ship it on Friday?
        </div>
      </div>
      <div style={{ position: 'absolute', left: 38, right: 38, bottom: 34, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 14, background: alpha('#ffffff', 0.05), boxShadow: `inset 0 0 0 1px ${L.line}`, ...type(22, 500), color: L.ink2 }}>
          <div style={{ width: 20, height: 24, borderRadius: 4, background: alpha(L.accent2, 0.3), boxShadow: `inset 0 0 0 1.5px ${alpha(L.accent2, 0.6)}` }} />
          launch-final.mov
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          {ripple > 0.01 && ripple < 0.99 && (
            <div style={{
              position: 'absolute', left: '50%', top: '50%', width: 200, height: 64, borderRadius: 18,
              transform: `translate(-50%,-50%) scale(${(1 + ripple * 0.6).toFixed(3)})`,
              boxShadow: `0 0 0 3px ${alpha(L.accent, 0.6 * (1 - ripple))}`,
            }} />
          )}
          <div style={{
            width: 200, height: 64, borderRadius: 18, position: 'relative', overflow: 'hidden',
            background: `linear-gradient(180deg, #7aa2ff, ${L.accent})`, transform: `scale(${press.toFixed(4)})`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 12px 30px -8px ${alpha(L.accent, 0.8)}, 0 0 40px ${alpha(L.accent, 0.35)}`,
          }}>
            {[{ o: 1 - sent, y: -sent * 40, label: 'Send', icon: true }, { o: sent, y: (1 - sent) * 40, label: 'Sent ✓', icon: false }].map((b) => (
              <div key={b.label} style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                opacity: b.o, transform: `translateY(${b.y.toFixed(2)}px)`, ...type(26, 650), color: L.onAccent,
              }}>
                {b.icon && <PlaneIcon size={24} color={L.onAccent} />}
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Glass>
  );
};

// 窗口 B：收件箱（新消息行从 0 高度顶开列表落位）
const INBOX = [
  { a: 'JR', c: '#6b7aa6', name: 'Jonah Reyes', sub: 'Design review notes', time: '9:12' },
  { a: 'PS', c: '#8a6fa6', name: 'Priya Shah', sub: 'Re: onboarding metrics', time: 'Tue' },
  { a: 'LO', c: '#4f8a86', name: 'Leo Okafor', sub: 'Offsite agenda', time: 'Mon' },
];
const Row: React.FC<{ a: string; c: string; name: string; sub: string; time: string; fresh?: boolean; glow?: number; dot?: number }> = ({ a, c, name, sub, time, fresh, glow = 0, dot = 0 }) => (
  <div style={{
    height: ROW_H, display: 'flex', alignItems: 'center', gap: 24, padding: '0 24px', borderRadius: 18, boxSizing: 'border-box',
    background: fresh ? alpha(L.accent, 0.1 + 0.08 * glow) : 'transparent',
    boxShadow: fresh ? `inset 0 0 0 1.5px ${alpha(L.accent, 0.28 + 0.3 * glow)}` : 'none',
  }}>
    <Avatar txt={a} c={c} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ ...type(26, fresh ? 700 : 600), color: fresh ? L.ink : alpha(L.ink, 0.86) }}>{name}</div>
      <div style={{ ...type(22, 450), color: fresh ? L.ink2 : L.ink3, marginTop: 3, whiteSpace: 'nowrap' }}>{sub}</div>
    </div>
    <div style={{ ...type(20, fresh ? 650 : 500), color: fresh ? L.accent : L.ink3 }}>{time}</div>
    {fresh && <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent, transform: `scale(${dot.toFixed(3)})`, boxShadow: `0 0 12px ${L.accent}` }} />}
  </div>
);
const InboxWindow: React.FC<{ arrive: number; glow: number; radius: number; lit: number }> = ({ arrive, glow, radius, lit }) => (
  <Glass cx={BX} cy={BY} title="Inbox — Maya Chen" radius={radius} lit={lit}>
    <div style={{ padding: '22px 28px 0' }}>
      <div style={{ height: 76, display: 'flex', alignItems: 'center', gap: 18, padding: '0 24px' }}>
        <span style={{ ...type(40, 750), color: L.ink }}>Inbox</span>
        <span style={{
          ...type(20, 700), padding: '5px 13px', borderRadius: 14,
          color: arrive > 0.5 ? L.onAccent : L.ink3, background: arrive > 0.5 ? L.accent : alpha('#ffffff', 0.06),
        }}>{arrive > 0.5 ? '1 new' : 'All caught up'}</span>
      </div>
      <div style={{ height: ROW_H * arrive, overflow: 'hidden', opacity: ramp(arrive, 0.25, 0.6, EASE.linear) }}>
        <Row a="AK" c={L.accent} name="Alex Kim" sub="Launch film — final cut attached" time="now" fresh glow={glow} dot={arrive} />
      </div>
      {INBOX.map((r) => (
        <div key={r.a} style={{ borderTop: `1px solid ${L.line}` }}><Row {...r} /></div>
      ))}
    </div>
  </Glass>
);

// 折纸飞机：三块折面（渐变示受光）+ 折痕；外层不旋转的辉光示"夜里唯一的亮物"
const Plane: React.FC<{ x: number; y: number; angle: number; scale: number; bank: number; opacity: number }> = ({ x, y, angle, scale, bank, opacity }) => (
  <div style={{ position: 'absolute', left: x - 90, top: y - 55, width: 180, height: 110, opacity }}>
    <div style={{
      position: 'absolute', left: 90 - 140 * scale, top: 55 - 140 * scale, width: 280 * scale, height: 280 * scale, borderRadius: '50%',
      background: `radial-gradient(circle, ${alpha('#cfe0ff', 0.2)} 0%, ${alpha(L.accent, 0.08)} 35%, ${alpha(L.accent, 0)} 62%)`,
    }} />
    <svg width={180} height={110} viewBox="0 0 180 110" style={{ overflow: 'visible', transform: `rotate(${angle.toFixed(2)}deg) scale(${scale.toFixed(4)}, ${(scale * bank).toFixed(4)})` }}>
      <defs>
        <linearGradient id="ppm-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe7ff" />
        </linearGradient>
        <linearGradient id="ppm-keel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fb2e6" />
          <stop offset="1" stopColor="#6c80c4" />
        </linearGradient>
      </defs>
      <polygon points="176,30 62,66 78,102" fill="url(#ppm-keel)" stroke="rgba(20,30,80,0.3)" strokeWidth={1.2} strokeLinejoin="round" />
      <polygon points="176,30 6,4 62,66" fill="url(#ppm-top)" stroke="rgba(20,30,80,0.2)" strokeWidth={1.2} strokeLinejoin="round" />
      <polygon points="176,30 6,4 50,44" fill="#c9d6fb" stroke="rgba(20,30,80,0.14)" strokeWidth={1} strokeLinejoin="round" />
      <line x1="176" y1="30" x2="62" y2="66" stroke="rgba(20,30,80,0.22)" strokeWidth={1.1} />
    </svg>
  </div>
);

export const PaperPlaneMessenger: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- 飞机 ----
  const tFly = flyT(frame);
  const pos = bez(tFly);
  const angle = tangentAngle(tFly);
  const turn = tangentAngle(flyT(frame + 1)) - tangentAngle(flyT(frame - 1));
  const bank = 1 - Math.min(0.2, Math.abs(turn) * 0.05);
  const boost = interpolate(tFly, [0, 0.22, 0.78, 1], [1, 1.8, 1.8, 1.1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pop = mix(0.3, 1, ramp(frame, FLY[0] - 2, 12, EASE.overshoot));
  const tuck = ramp(frame, ARRIVE - 2, 12, EASE.exit);
  const planeScale = pop * boost * mix(1, 0.3, tuck);
  const planeX = mix(pos.x, AVATAR.x, tuck);
  const planeOpacity = 1 - ramp(frame, ARRIVE + 4, 8, EASE.out);

  // ---- 镜头 ----
  const takeP = ramp(frame, TAKEOVER[0], TAKEOVER[1] - TAKEOVER[0], TAKE_EASE);
  const lz = (a: number, b: number, t: number) => Math.exp(mix(Math.log(a), Math.log(b), t));
  const zOut = lz(1.5, 0.5, ramp(frame, ZOOM_OUT[0], ZOOM_OUT[1] - ZOOM_OUT[0], EASE.smooth));
  const zCruise = mix(1, 0.56 / 0.5, ramp(frame, ZOOM_OUT[1], TAKEOVER[0] - ZOOM_OUT[1], EASE.smooth));
  const z = lz(zOut * zCruise, Z_TAKE, takeP);
  const follow = ramp(frame, ZOOM_OUT[0], 18, EASE.smooth);
  const fx = mix(AX + 120, pos.x, follow);
  const fy = mix(AY, AY + (pos.y - AY) * 0.5, follow);
  const cx = mix(fx, BX, takeP);
  const cy = mix(fy, BY, takeP);
  const sx = (wx: number, d: number) => 960 + (wx - cx) * z * d;
  const sy = (wy: number, d: number) => 540 + (wy - cy) * z * d;

  // ---- 点击 ----
  const press = 1 - 0.07 * ramp(frame, CLICK, 3, EASE.out) + 0.07 * ramp(frame, CLICK + 3, 10, EASE.overshoot);
  const ripple = ramp(frame, CLICK + 2, 16, EASE.out);
  const sent = ramp(frame, CLICK + 4, 10, EASE.snappy);
  const curT = ramp(frame, 0, 11, EASE.out);
  const curX = mix(SEND.x + 260, SEND.x + 30, curT);
  const curY = mix(SEND.y + 190, SEND.y + 8, curT);
  const curOpacity = 1 - ramp(frame, CLICK + 6, 10, EASE.out);
  const curScale = frame >= CLICK && frame < CLICK + 4 ? 0.88 : 1;

  // ---- B 到达 ----
  const arrive = ramp(frame, ROW_OPEN, 16, EASE.snappy);
  const glow = ramp(frame, ARRIVE + 4, 10, EASE.out) * (1 - 0.6 * ramp(frame, ARRIVE + 20, 30, EASE.out)) + 0.12 * Math.max(0, Math.sin((frame - 142) / 9)) * (frame > 142 ? 1 : 0);
  const ring = ramp(frame, ARRIVE + 2, 20, EASE.out);
  const bLit = ramp(frame, FLY[1] - 30, 30, EASE.out) * (1 - takeP);
  const bRadius = mix(22, 0, takeP);

  const fadeFx = 1 - ramp(frame, TAKEOVER[0], 18, EASE.out); // 视差 / 光迹在接管时淡出

  // ---- 光迹（世界坐标）：尾端暗细、头部亮粗 ----
  const TRAIL = 46;
  const tail = Math.max(0, tFly - 0.42);
  const seg: { a: { x: number; y: number }; b: { x: number; y: number }; k: number }[] = [];
  if (tFly > 0.005) {
    for (let i = 0; i < TRAIL; i++) {
      const t0 = mix(tail, tFly, i / TRAIL), t1 = mix(tail, tFly, (i + 1) / TRAIL);
      seg.push({ a: bez(t0), b: bez(t1), k: (i + 1) / TRAIL });
    }
  }
  const trailFade = fadeFx * (1 - ramp(frame, ARRIVE, 14, EASE.out) * 0.7);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.62, y: -0.05 }} fill={{ x: 0.15, y: 1.05 }} breathe={0.5}>
        {/* 远层星点（depth 0.28） */}
        {STARS.map((s, i) => {
          const x = sx(s.x, 0.28), y = sy(s.y, 0.28);
          if (x < -10 || x > 1930 || y < -10 || y > 1090) return null;
          const tw = 0.45 + 0.55 * Math.sin(frame / 11 + s.tw);
          const r = s.r * Math.max(0.8, Math.sqrt(z));
          return <div key={i} style={{ position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: '#dfe8ff', opacity: tw * 0.75 * fadeFx, boxShadow: s.r > 3 ? `0 0 ${(6 * r).toFixed(0)}px ${alpha('#9fb8ff', 0.8)}` : undefined }} />;
        })}
        {/* 中层薄云（depth 0.62） */}
        {CLOUDS.filter((c) => c.depth < 1).map((c, i) => {
          const w = c.w * z * c.depth, h = c.h * z * c.depth;
          return <div key={i} style={{
            position: 'absolute', left: sx(c.x, c.depth) - w / 2, top: sy(c.y, c.depth) - h / 2, width: w, height: h, opacity: fadeFx,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#7f95d6', c.a)} 0%, ${alpha('#5b6fb3', c.a * 0.5)} 45%, ${alpha('#5b6fb3', 0)} 72%)`,
          }} />;
        })}
      </Stage>

      {/* 世界层（depth = 1）：窗口 A / B + 光迹 + 飞机 + 光标 */}
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${(960 - cx * z).toFixed(2)}px, ${(540 - cy * z).toFixed(2)}px) scale(${z.toFixed(5)})` }}>
        <ComposeWindow press={press} ripple={ripple} sent={sent} />
        <InboxWindow arrive={arrive} glow={glow} radius={bRadius} lit={bLit} />
        {/* 到达涟漪：落点一圈强调色光环 */}
        {ring > 0.01 && ring < 0.99 && (
          <div style={{
            position: 'absolute', left: AVATAR.x - 40, top: AVATAR.y - 40, width: 80, height: 80, borderRadius: '50%',
            transform: `scale(${(1 + ring * 2.2).toFixed(3)})`, boxShadow: `0 0 0 3px ${alpha(L.accent, 0.7 * (1 - ring))}`,
          }} />
        )}
        {seg.length > 0 && trailFade > 0.01 && (
          <svg width={10} height={10} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: trailFade }}>
            {seg.map((s, i) => (
              <line key={`g${i}`} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} stroke={L.accent} strokeOpacity={0.14 * s.k * s.k} strokeWidth={4 + 26 * s.k} strokeLinecap="round" />
            ))}
            {seg.map((s, i) => (
              <line key={`c${i}`} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} stroke="#e6eeff" strokeOpacity={0.85 * s.k * s.k} strokeWidth={1.5 + 4.5 * s.k} strokeLinecap="round" />
            ))}
          </svg>
        )}
        {frame >= FLY[0] - 2 && planeOpacity > 0.01 && (
          <Plane x={planeX} y={pos.y} angle={angle} scale={planeScale} bank={bank} opacity={planeOpacity} />
        )}
        {curOpacity > 0.01 && (
          <svg width={30} height={40} viewBox="0 0 26 34" style={{ position: 'absolute', left: curX, top: curY, opacity: curOpacity, transform: `scale(${curScale})`, transformOrigin: '2px 2px', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))' }}>
            <path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill="#ffffff" stroke="#0b1020" strokeWidth={1.6} strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* 近层焦外云絮（depth 1.5，从镜头前掠过） */}
      {CLOUDS.filter((c) => c.depth >= 1).map((c, i) => {
        const w = c.w * z * c.depth, h = c.h * z * c.depth;
        const x = sx(c.x, c.depth), y = sy(c.y, c.depth);
        if (x + w / 2 < 0 || x - w / 2 > 1920 || y + h / 2 < 0 || y - h / 2 > 1080) return null;
        return <div key={i} style={{
          position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: fadeFx,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#a9b9ea', c.a)} 0%, ${alpha('#8093d0', c.a * 0.45)} 40%, ${alpha('#8093d0', 0)} 70%)`,
        }} />;
      })}
    </AbsoluteFill>
  );
};
