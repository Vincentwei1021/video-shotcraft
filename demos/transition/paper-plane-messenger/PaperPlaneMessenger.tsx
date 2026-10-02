// paper-plane-messenger —— pitch-app 77–82s（2.5D 简化）
// 点击"发送"后镜头拉远脱离窗口 A（写信窗），折纸飞机从发送键里弹出、沿弧线飞行
// （俯仰角跟随切线，转弯时轻微倾侧），身后留一条虚线航迹；镜头伴飞穿过三层视差道具
// （远景光点 / 中景消息气泡 / 近景焦外光环），飞抵窗口 B（收件箱）的新消息槽位落定，
// 新消息行顶开列表"到达"，窗口 B 放大接管全屏。发送语义实体化成转场信使。
// 相机：screen = 960 + (world − camCenter) × zoom × depth；变焦在对数空间插值
// （推拉的体感速度均匀），三段在切换帧上中心与变焦都连续。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import {
  EASE, FONT, bezier, ramp, mix, tracking, softShadow, hairline, innerHighlight, Backdrop,
} from '../../_fixtures/Polish';

export const PAPER_PLANE_MESSENGER_DURATION = 150;

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---- 世界坐标 ----
const AX = 520, AY = 560; // 窗口 A 中心（写信）
const BX = 3200, BY = 600; // 窗口 B 中心（收件箱）
const WIN_W = 760, WIN_H = 428; // 16:9 窗：B 接管时恰好铺满 1920×1080
const Z_TAKE = 1920 / WIN_W; // ≈2.53，B 窗满幅
const BAR = 44; // 窗口标题栏高

// 新消息行的世界坐标（飞机落点 = 新行头像位）
const ROW_H = 72;
const ROW_TOP = BY - WIN_H / 2 + BAR + 18 + 54; // 标题栏 + padding + "Inbox" 表头
const P0 = { x: AX + WIN_W / 2 - 92, y: AY + WIN_H / 2 - 44 }; // A 的发送键
const P1 = { x: 1300, y: -60 }; // 高抛
const P2 = { x: 2300, y: 330 }; // 下压
const P3 = { x: BX - WIN_W / 2 - 30, y: ROW_TOP + ROW_H / 2 }; // B 新行左侧门前
const bez = (t: number) => {
  const u = 1 - t;
  return {
    x: u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x,
    y: u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y,
  };
};

// ---- 时间轴（150f）----
const CLICK = 12; // 点击发送
const ZOOM_OUT = [14, 42] as const; // 镜头拉远
const FLY = [32, 100] as const; // 飞行 68f
const ARRIVE = 100; // 新消息行顶开列表
const TAKEOVER = [102, 132] as const; // 窗口 B 接管（132–150 落定静止）

const FLY_EASE = bezier(0.45, 0.05, 0.25, 1); // 起飞加速、落定减速
const TAKE_EASE = bezier(0.6, 0, 0.15, 1); // 慢起、长尾减速推进 B
const flyT = (f: number) => ramp(f, FLY[0], FLY[1] - FLY[0], FLY_EASE);
const tangentAngle = (t: number) => {
  const a = bez(Math.min(t, 0.988));
  const b = bez(Math.min(t + 0.012, 1));
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
};

// 视差道具，depth: 0.45 远（光点）/ 0.75 中（消息气泡）/ 1.35 近（焦外光环）
type Prop = { x: number; y: number; size: number; depth: number; drift: number; kind: 'dot' | 'bubble' | 'ring'; tint: number };
const PROPS: Prop[] = (() => {
  const rng = mulberry32(42);
  const out: Prop[] = [];
  const spec: [number, Prop['kind'], number, number][] = [
    [0.45, 'dot', 9, 0], [0.75, 'bubble', 7, 0], [1.35, 'ring', 4, 0],
  ];
  for (const [depth, kind, n] of spec) {
    for (let i = 0; i < n; i++) {
      out.push({
        x: 300 + rng() * 3200,
        y: -200 + rng() * 1400,
        size: kind === 'dot' ? 22 + rng() * 40 : kind === 'bubble' ? 92 + rng() * 60 : 240 + rng() * 180,
        depth, kind, drift: rng() * Math.PI * 2, tint: rng(),
      });
    }
  }
  return out;
})();

const ACCENT = G.accent;

const Avatar: React.FC<{ txt: string; hue: string; size?: number }> = ({ txt, hue, size = 36 }) => (
  <div style={{
    width: size, height: size, borderRadius: size / 2, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: hue, color: '#fff', fontSize: size * 0.36, fontWeight: 600, letterSpacing: '0.01em',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(20,22,28,0.06)',
  }}>{txt}</div>
);

const PlaneIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round">
    <path d="M21.5 2.5 10.6 13.4" />
    <path d="M21.5 2.5 14.6 21.5l-4-8.1-8.1-4z" />
  </svg>
);

// 窗口外壳：标题栏 + 圆点 + 标题
const WindowShell: React.FC<{ cx: number; cy: number; title: string; radius?: number; children: React.ReactNode }> = ({ cx, cy, title, radius = 16, children }) => (
  <div style={{
    position: 'absolute', left: cx - WIN_W / 2, top: cy - WIN_H / 2, width: WIN_W, height: WIN_H,
    borderRadius: radius, background: '#ffffff', border: hairline(0.09), boxSizing: 'border-box', overflow: 'hidden',
    boxShadow: `${innerHighlight(0.9)}, ${softShadow(30, { color: '#141626', strength: 0.9 })}`, fontFamily: FONT.sans,
  }}>
    <div style={{
      height: BAR, background: 'linear-gradient(180deg, #fbfbfa, #f4f4f2)', borderBottom: hairline(0.07),
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', boxSizing: 'border-box', position: 'relative',
    }}>
      {['#ee6a5f', '#f5bf4f', '#61c454'].map((c) => (
        <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c, opacity: 0.85, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.12)' }} />
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 13, fontWeight: 600, color: G.ink2, letterSpacing: '-0.005em' }}>{title}</div>
    </div>
    {children}
  </div>
);

// 窗口 A：写信窗（收件人 / 主题 / 正文 / 发送键）
const ComposeWindow: React.FC<{ press: number; ripple: number }> = ({ press, ripple }) => {
  const field: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, height: 44, borderBottom: hairline(0.07), fontSize: 15 };
  return (
    <WindowShell cx={AX} cy={AY} title="New message">
      <div style={{ padding: '4px 26px 0' }}>
        <div style={field}>
          <span style={{ color: G.ink3, width: 58 }}>To</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 4px 4px', borderRadius: 16, background: G.fill, boxShadow: `inset 0 0 0 1px ${G.hairline}` }}>
            <Avatar txt="MC" hue="#7b83e0" size={24} />
            <span style={{ color: G.ink1, fontWeight: 500, fontSize: 14 }}>Maya Chen</span>
          </div>
        </div>
        <div style={field}>
          <span style={{ color: G.ink3, width: 58 }}>Subject</span>
          <span style={{ color: G.ink1, fontWeight: 600, letterSpacing: tracking(15) }}>Q3 launch plan</span>
        </div>
        <div style={{ paddingTop: 16, fontSize: 15, lineHeight: 1.6, color: G.ink2 }}>
          Hi Maya — the final deck and rollout timeline are attached.
          <br />Can you review the pricing section before Friday?
          <div style={{ marginTop: 14, color: G.ink3 }}>— Alex</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 26, right: 26, bottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, background: G.fill, boxShadow: `inset 0 0 0 1px ${G.hairline}`, fontSize: 13, color: G.ink2 }}>
          <div style={{ width: 14, height: 17, borderRadius: 3, background: '#e1e3f6', boxShadow: `inset 0 0 0 1px rgba(91,99,211,0.25)` }} />
          launch-plan.pdf
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          {ripple > 0.01 && ripple < 0.99 && (
            <div style={{
              position: 'absolute', left: '50%', top: '50%', width: 150, height: 52, borderRadius: 14,
              transform: `translate(-50%,-50%) scale(${1 + ripple * 0.55})`,
              boxShadow: `0 0 0 2px rgba(91,99,211,${(0.45 * (1 - ripple)).toFixed(3)})`,
            }} />
          )}
          <div style={{
            width: 150, height: 52, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: `linear-gradient(180deg, #6a72e0, ${ACCENT})`, color: '#fff', fontSize: 17, fontWeight: 600, letterSpacing: '-0.005em',
            transform: `scale(${press})`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.28), 0 1px 2px rgba(40,44,120,0.25), 0 ${8 * press - 2}px 18px -6px rgba(60,66,170,0.45)`,
          }}>
            <PlaneIcon size={18} color="#fff" />
            Send
          </div>
        </div>
      </div>
    </WindowShell>
  );
};

// 窗口 B：收件箱（新消息行从 0 高度顶开列表落位）
const INBOX = [
  { a: 'JR', hue: '#9aa0b4', name: 'Jonah Reyes', sub: 'Design review notes', time: '9:12' },
  { a: 'PS', hue: '#b49a8c', name: 'Priya Shah', sub: 'Re: onboarding metrics', time: 'Tue' },
  { a: 'LO', hue: '#8cab9c', name: 'Leo Okafor', sub: 'Offsite agenda', time: 'Mon' },
];
const InboxWindow: React.FC<{ arrive: number; glow: number; radius: number }> = ({ arrive, glow, radius }) => {
  const Row: React.FC<{ a: string; hue: string; name: string; sub: string; time: string; fresh?: boolean }> = ({ a, hue, name, sub, time, fresh }) => (
    <div style={{
      height: ROW_H, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', borderRadius: 12, boxSizing: 'border-box',
      background: fresh ? `rgba(91,99,211,${(0.06 + 0.08 * glow).toFixed(3)})` : 'transparent',
      boxShadow: fresh ? `inset 0 0 0 1px rgba(91,99,211,${(0.14 + 0.16 * glow).toFixed(3)})` : 'none',
    }}>
      <Avatar txt={a} hue={hue} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: fresh ? 650 : 550, color: G.ink1, letterSpacing: tracking(15) }}>{name}</div>
        <div style={{ fontSize: 13.5, color: fresh ? G.ink2 : G.ink3, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ fontSize: 12.5, color: fresh ? ACCENT : G.ink3, fontWeight: fresh ? 600 : 450, fontVariantNumeric: 'tabular-nums' }}>{time}</div>
      {fresh && <div style={{ width: 9, height: 9, borderRadius: 5, background: ACCENT, transform: `scale(${mix(0, 1, arrive)})`, boxShadow: '0 0 0 3px rgba(91,99,211,0.16)' }} />}
    </div>
  );
  return (
    <WindowShell cx={BX} cy={BY} title="Inbox — Maya Chen" radius={radius}>
      <div style={{ padding: '18px 22px 0' }}>
        <div style={{ height: 54, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: G.ink1, letterSpacing: tracking(24) }}>Inbox</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: ACCENT, background: G.accentSoft, padding: '3px 9px', borderRadius: 10, fontVariantNumeric: 'tabular-nums' }}>
            {arrive > 0.5 ? '1 new' : 'All read'}
          </span>
        </div>
        {/* 新行：高度 0→ROW_H 顶开下方旧行（真实槽位，非悬浮） */}
        <div style={{ height: ROW_H * arrive, overflow: 'hidden', opacity: ramp(arrive, 0.3, 0.7, EASE.linear) }}>
          <Row a="AK" hue="#6a72e0" name="Alex Kim" sub="Q3 launch plan — final deck attached" time="now" fresh />
        </div>
        {INBOX.map((r) => (
          <div key={r.a} style={{ borderTop: hairline(0.06) }}><Row {...r} /></div>
        ))}
      </div>
    </WindowShell>
  );
};

// 折纸飞机：三块折面（渐变示受光）+ 折痕线 + 发丝描边；外层不旋转的 drop-shadow 示离地高度
const Plane: React.FC<{ x: number; y: number; angle: number; scale: number; bank: number; opacity: number; lift: number }> = ({ x, y, angle, scale, bank, opacity, lift }) => (
  <div style={{
    position: 'absolute', left: x - 90, top: y - 55, width: 180, height: 110, opacity,
    filter: `drop-shadow(0 ${(10 + 26 * lift).toFixed(1)}px ${(8 + 14 * lift).toFixed(1)}px rgba(24,26,52,${(0.22 - 0.08 * lift).toFixed(3)}))`,
  }}>
    <svg width={180} height={110} viewBox="0 0 180 110" style={{ overflow: 'visible', transform: `rotate(${angle}deg) scale(${scale}, ${scale * bank})` }}>
      <defs>
        <linearGradient id="ppm-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eceef7" />
        </linearGradient>
        <linearGradient id="ppm-keel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9cde6" />
          <stop offset="1" stopColor="#a9aed3" />
        </linearGradient>
      </defs>
      <polygon points="176,30 62,66 78,102" fill="url(#ppm-keel)" stroke="rgba(40,44,90,0.22)" strokeWidth={1.2} strokeLinejoin="round" />
      <polygon points="176,30 6,4 62,66" fill="url(#ppm-top)" stroke="rgba(40,44,90,0.18)" strokeWidth={1.2} strokeLinejoin="round" />
      <polygon points="176,30 6,4 50,44" fill="#e3e6f3" stroke="rgba(40,44,90,0.12)" strokeWidth={1} strokeLinejoin="round" />
      <line x1="176" y1="30" x2="62" y2="66" stroke="rgba(40,44,90,0.18)" strokeWidth={1.1} />
    </svg>
  </div>
);

export const PaperPlaneMessenger: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- 飞机 ----
  const tFly = flyT(frame);
  const pos = bez(tFly);
  const angle = tangentAngle(tFly);
  // 倾侧：转弯角速度越大，机身越"侧"（纵向压扁 ≤18%）
  const turn = tangentAngle(flyT(frame + 1)) - tangentAngle(flyT(frame - 1));
  const bank = 1 - Math.min(0.18, Math.abs(turn) * 0.05);
  const flightBoost = interpolate(tFly, [0, 0.25, 0.75, 1], [1, 1.7, 1.7, 1.1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // 从发送键里弹出（过冲一次），落定后缩进新消息行
  const pop = mix(0.3, 1, ramp(frame, FLY[0] - 2, 12, EASE.overshoot));
  const tuck = ramp(frame, ARRIVE - 2, 12, EASE.exit);
  const planeScale = pop * flightBoost * mix(1, 0.35, tuck);
  // 落定后滑进新消息行的头像位（消息"进槽"），而不是停在门外原地消失
  const AVATAR_X = BX - WIN_W / 2 + 22 + 16 + 18;
  const planeX = mix(pos.x, AVATAR_X, tuck);
  const planeOpacity = 1 - ramp(frame, ARRIVE + 2, 8, EASE.out);
  const lift = Math.sin(Math.PI * tFly); // 离地高度感（阴影越远越虚）

  // ---- 镜头 ----
  const takeP = ramp(frame, TAKEOVER[0], TAKEOVER[1] - TAKEOVER[0], TAKE_EASE);
  // 变焦（对数空间）：1.55 贴脸 A → 0.62 拉远伴飞 → 0.66 伴飞中缓推 → 2.53 B 满幅
  const lz = (a: number, b: number, t: number) => Math.exp(mix(Math.log(a), Math.log(b), t));
  const zOut = lz(1.55, 0.62, ramp(frame, ZOOM_OUT[0], ZOOM_OUT[1] - ZOOM_OUT[0], EASE.smooth));
  const zCruise = mix(1, 0.66 / 0.62, ramp(frame, ZOOM_OUT[1], TAKEOVER[0] - ZOOM_OUT[1], EASE.smooth));
  const zPre = zOut * zCruise;
  const z = lz(zPre, Z_TAKE, takeP);
  // 中心：A → 跟飞机（纵向只跟 55%，让飞机在画内起伏）→ B
  const follow = ramp(frame, ZOOM_OUT[0], 16, EASE.smooth);
  const fx = mix(AX, pos.x, follow);
  const fy = mix(AY, AY + (pos.y - AY) * 0.55, follow);
  const cx = mix(fx, BX, takeP);
  const cy = mix(fy, BY, takeP);

  const camX = (wx: number, d: number) => 960 + (wx - cx) * z * d;
  const camY = (wy: number, d: number) => 540 + (wy - cy) * z * d;

  // ---- 点击 ----
  // 按下 3f 压到 0.93 → 松开过冲回弹到 1
  const press = 1 - 0.07 * ramp(frame, CLICK, 3, EASE.out) + 0.07 * ramp(frame, CLICK + 3, 10, EASE.overshoot);
  const ripple = ramp(frame, CLICK + 2, 16, EASE.out);
  // 光标：0–11 滑到发送键，点击后随拉远淡出
  const curT = ramp(frame, 0, 11, EASE.out);
  const curX = mix(P0.x + 230, P0.x + 18, curT);
  const curY = mix(P0.y + 170, P0.y + 12, curT);
  const curOpacity = 1 - ramp(frame, CLICK + 6, 10, EASE.out);
  const curScale = frame >= CLICK && frame < CLICK + 4 ? 0.88 : 1;

  // ---- B 到达 ----
  const arrive = ramp(frame, ARRIVE, 14, EASE.snappy);
  const glow = ramp(frame, ARRIVE + 4, 10, EASE.out) * (1 - ramp(frame, ARRIVE + 16, 24, EASE.out));
  const bRadius = mix(16, 0, takeP);

  // ---- 航迹虚线（世界坐标）----
  const trailN = 64;
  const trailPts: string[] = [];
  for (let i = 0; i <= trailN; i++) {
    const q = bez((tFly * i) / trailN);
    trailPts.push(`${q.x.toFixed(1)},${q.y.toFixed(1)}`);
  }
  const trailOpacity = (frame >= FLY[0] ? 1 : 0) * (1 - ramp(frame, TAKEOVER[0] - 4, 18, EASE.out));

  const propFade = 1 - ramp(frame, TAKEOVER[0], 18, EASE.out);

  const renderProp = (p: Prop, i: number) => {
    const wob = Math.sin(frame * 0.035 + p.drift) * (p.depth > 1 ? 18 : 12);
    const x = camX(p.x, p.depth) + wob;
    const y = camY(p.y, p.depth) + Math.cos(frame * 0.03 + p.drift) * (p.depth > 1 ? 14 : 9);
    const s = p.size * z * p.depth;
    if (x < -s || x > 1920 + s || y < -s || y > 1080 + s) return null;
    if (p.kind === 'dot') {
      return (
        <div key={i} style={{
          position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: '50%',
          opacity: 0.55 * propFade, filter: 'blur(2px)',
          background: p.tint > 0.6 ? 'radial-gradient(circle at 40% 35%, #d9dcf5, #c2c7ea)' : 'radial-gradient(circle at 40% 35%, #ffffff, #dedfe6)',
        }} />
      );
    }
    if (p.kind === 'bubble') {
      return (
        <div key={i} style={{
          position: 'absolute', left: x - s / 2, top: y - s * 0.32, width: s, height: s * 0.64, borderRadius: s * 0.16,
          opacity: 0.9 * propFade, background: 'rgba(255,255,255,0.92)', boxSizing: 'border-box',
          border: hairline(0.07), boxShadow: `${innerHighlight(0.9)}, ${softShadow(14 * z)}`,
          padding: `${s * 0.14}px ${s * 0.14}px`, display: 'flex', flexDirection: 'column', gap: s * 0.09,
        }}>
          <div style={{ height: s * 0.07, width: '70%', borderRadius: s, background: p.tint > 0.5 ? 'rgba(91,99,211,0.35)' : '#d6d7dd' }} />
          <div style={{ height: s * 0.07, width: '45%', borderRadius: s, background: '#e3e4e8' }} />
        </div>
      );
    }
    // 近景：焦外光斑（实心软盘 + 亮边，像镜头前掠过的散景），不抢飞机视线
    return (
      <div key={i} style={{
        position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: '50%', boxSizing: 'border-box',
        opacity: 0.5 * propFade, filter: 'blur(12px)',
        background: p.tint > 0.5
          ? 'radial-gradient(circle at 50% 50%, rgba(196,200,240,0.22) 0%, rgba(196,200,240,0.32) 62%, rgba(176,182,232,0.55) 78%, rgba(176,182,232,0) 100%)'
          : 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.45) 62%, rgba(236,236,242,0.7) 78%, rgba(236,236,242,0) 100%)',
      }} />
    );
  };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.3, y: 0.16 }} accent={ACCENT} grain={0.04} vignette={0.16} drift={10} />

      {/* 视差道具：远层 / 中层（世界层之下） */}
      {PROPS.filter((p) => p.depth < 1).map(renderProp)}

      {/* 世界层（depth=1）：窗口 A / B + 航迹 + 飞机 + 光标 */}
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${960 - cx * z}px, ${540 - cy * z}px) scale(${z})` }}>
        <ComposeWindow press={press} ripple={ripple} />
        <InboxWindow arrive={arrive} glow={glow} radius={bRadius} />
        {trailOpacity > 0.01 && tFly > 0.01 && (
          <svg width={3600} height={1400} viewBox="0 -300 3600 1400" style={{ position: 'absolute', left: 0, top: -300, overflow: 'visible', opacity: trailOpacity }}>
            <polyline points={trailPts.join(' ')} fill="none" stroke="rgba(91,99,211,0.5)" strokeWidth={4.2} strokeDasharray="2.5 17" strokeLinecap="round" />
          </svg>
        )}
        {frame >= FLY[0] - 2 && planeOpacity > 0.01 && (
          <Plane x={planeX} y={pos.y} angle={angle} scale={planeScale} bank={bank} opacity={planeOpacity} lift={lift} />
        )}
        {curOpacity > 0.01 && (
          <svg width={26} height={34} viewBox="0 0 26 34" style={{ position: 'absolute', left: curX, top: curY, opacity: curOpacity, transform: `scale(${curScale})`, transformOrigin: '2px 2px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))' }}>
            <path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill="#17181c" stroke="#ffffff" strokeWidth={1.8} strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* 近景道具（世界层之上，焦外大件） */}
      {PROPS.filter((p) => p.depth >= 1).map(renderProp)}
    </AbsoluteFill>
  );
};
