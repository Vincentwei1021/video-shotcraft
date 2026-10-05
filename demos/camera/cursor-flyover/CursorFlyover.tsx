// cursor-flyover — 光标导游的四站巡览（第二轮重设计）
// 手法不变：整页俯瞰 → 相机依次飞到四个功能区特写，光标同步到位指点、点击并留下涟漪，界面即时响应。
//
// 设计决定
// - look：porcelain（冷白 + 钴蓝，SaaS 交互演示）。产品是 video-shotcraft 的工作台总览，按 1:1 原生排版画在
//   2400×1500 的世界画布上（不再是 480×270 设计坐标放大），俯瞰 0.66x 是全貌、特写 1.3x 字号 ≥40px 可读。
// - 只留讲清手法的四个模块，每个都有一次"点了就有反应"的交互：
//   ① Frames rendered：分段控件点 90D → 大数字换档（旧值上滑淡出、新值从线下升起）+ 12 根柱子错峰弹到新高度
//   ② Shot previews：点曲线上的数据点 → 引导线下落、数据点放大、tooltip 过冲弹出
//   ③ Release flags：点开关 → 滑块弹簧滑过去、轨道染钴蓝、灰度进度条 0→25% 走起
//   ④ Top shots：点第二行 → 行底染色 + 左侧强调条 + 勾选框描出对勾
//   最后相机拉回俯瞰，四处状态同时在场——尾帧是一张"巡览结束"的全家福海报。
// - 光标是"手"，相机是"眼"：光标先走（swift 16f，一条轻弧），相机晚 2f 起步、晚 6f 落定（smooth 20f），
//   光标在目标上"瞄"一拍再按下（3f 缩到 0.84，过冲回弹）；途中相机额外拉远 ~8% 再推回（hop），
//   按屏幕速度加方向性运动模糊。光标逐帧按 1/s 反缩放，屏幕上恒为 40px。
//
// 时间表（30fps，240f = 8s）
//   0–22     俯瞰：整台 0.62→0.66 缓推落定，光标在画面中央
//   22–66    第 1 站：22 光标起步 / 24–44 相机飞行 / 44 按下 / 46 起界面响应 / 停留到 66
//   66–110   第 2 站（同结构，各 +44f）
//   110–154  第 3 站
//   154–198  第 4 站
//   198–222  拉回俯瞰（smooth 24f），四处状态同框
//   222–239  hold：极缓推近 1%
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, bezier, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const CURSOR_FLYOVER_DURATION = 240; // 8s @30fps

const L = LOOKS.porcelain;
const ACC = L.accent;
const UP = '#0f9d76'; // 正向涨幅（accent2 压暗一档，白底上够对比）

// ───────── 世界布局（px） ─────────
const WW = 2400, WH = 1500;
const MOD = {
  rev: { x: 60, y: 150, w: 1120, h: 640 },
  users: { x: 1220, y: 150, w: 1120, h: 640 },
  flags: { x: 1220, y: 830, w: 1120, h: 640 },
  accts: { x: 60, y: 830, w: 1120, h: 640 },
};
const center = (m: { x: number; y: number; w: number; h: number }) => ({ x: m.x + m.w / 2, y: m.y + m.h / 2 });

// 折线：12 点，第 9 点是点击目标（模块内坐标）
const CH = { x: 64, y: 190, w: 992, h: 360 };
const LY = [0.62, 0.55, 0.58, 0.46, 0.5, 0.4, 0.44, 0.33, 0.37, 0.24, 0.3, 0.18];
const ptX = (i: number) => CH.x + (i / (LY.length - 1)) * CH.w;
const ptY = (i: number) => CH.y + LY[i] * CH.h;
const HOT = 9;

// 四个点击目标（世界坐标）
const TARGETS = [
  { x: MOD.rev.x + MOD.rev.w - 40 - 60, y: MOD.rev.y + 40 + 30 }, // 90D 分段
  { x: MOD.users.x + ptX(HOT), y: MOD.users.y + ptY(HOT) }, // 数据点
  { x: MOD.flags.x + MOD.flags.w - 64 - 46, y: MOD.flags.y + 196 + 31 }, // 第一行开关
  { x: MOD.accts.x + 100, y: MOD.accts.y + 196 + 104 + 50 }, // 第二行勾选框
];
const CAMS = [
  { x: WW / 2, y: WH / 2 + 30, s: 0.66 },
  { ...center(MOD.rev), s: 1.3 },
  { ...center(MOD.users), s: 1.3 },
  { ...center(MOD.flags), s: 1.3 },
  { ...center(MOD.accts), s: 1.3 },
];
const LEG0 = 22; // 第 1 站光标起步
const LEG = 44; // 每站周期
const legStart = (k: number) => LEG0 + k * LEG;
const clickAt = (k: number) => legStart(k) + 22;
const BACK = 198; // 拉回俯瞰
const CAM_EASE = bezier(0.55, 0, 0.18, 1); // 起步干脆、落位很软

// 相机（帧的纯函数，可取小数帧）
const camAt = (f: number) => {
  let { x, y, s } = CAMS[0];
  s *= mix(0.94, 1, ramp(f, 0, 22, EASE.snappy));
  let hop = 0;
  for (let k = 0; k < 4; k++) {
    const u = ramp(f, legStart(k) + 2, 20, CAM_EASE);
    const to = CAMS[k + 1];
    x = mix(x, to.x, u); y = mix(y, to.y, u); s = mix(s, to.s, u);
    if (k > 0 && u > 0 && u < 1) hop = 0.08 * Math.sin(Math.PI * u);
  }
  const b = ramp(f, BACK, 24, EASE.smooth);
  x = mix(x, CAMS[0].x, b); y = mix(y, CAMS[0].y, b); s = mix(s, CAMS[0].s, b);
  s *= (1 - hop) * (1 + 0.01 * ramp(f, 222, 18, EASE.smooth));
  return { x, y, s };
};

// 光标（世界坐标）：先于相机出发，轻弧线
const cursorAt = (f: number) => {
  let x = WW / 2 + 40, y = WH / 2 + 80;
  for (let k = 0; k < 4; k++) {
    const u = ramp(f, legStart(k), 16, EASE.swift);
    const to = TARGETS[k];
    const dx = to.x - x, dy = to.y - y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const bow = Math.sin(Math.PI * u) * Math.min(90, len * 0.12);
    const nx = mix(x, to.x, u) + (-dy / len) * bow;
    const ny = mix(y, to.y, u) + (dx / len) * bow;
    x = nx; y = ny;
  }
  return { x, y };
};

// 点击后的界面响应进度
const resp = (f: number, k: number, dur = 16, ease = EASE.snappy) => ramp(f, clickAt(k) + 2, dur, ease);

// ───────── 模块外壳 ─────────
const Module: React.FC<{ m: { x: number; y: number; w: number; h: number }; title: string; meta: string; active: number; children: React.ReactNode }> = ({ m, title, meta, active, children }) => (
  <div style={{
    position: 'absolute', left: m.x, top: m.y, width: m.w, height: m.h, borderRadius: 28, background: L.surface, overflow: 'hidden',
    border: `1.5px solid ${active > 0.01 ? alpha(ACC, 0.18 * active) : L.line}`,
    boxShadow: `inset 0 1.5px 0 #ffffff, ${softShadow(6 + 14 * active, { color: L.shadow, strength: 0.9 })}`,
  }}>
    <div style={{ position: 'absolute', left: 64, top: 56, ...type(34, 650), color: L.ink }}>{title}</div>
    <div style={{ position: 'absolute', left: 64, top: 104, ...type(26, 500), color: L.ink3 }}>{meta}</div>
    {children}
  </div>
);

// ① Revenue
const REV_BARS_A = [0.42, 0.5, 0.46, 0.58, 0.52, 0.6, 0.55, 0.64, 0.6, 0.7, 0.66, 0.74];
const REV_BARS_B = [0.3, 0.38, 0.45, 0.42, 0.55, 0.62, 0.58, 0.7, 0.76, 0.82, 0.88, 0.96];
const Revenue: React.FC<{ f: number }> = ({ f }) => {
  const r = resp(f, 0);
  const seg = ['7D', '30D', '90D'];
  const sel = ramp(f, clickAt(0), 8, EASE.snappy); // 分段滑块 30D → 90D
  return (
    <Module m={MOD.rev} title="Frames rendered" meta={sel > 0.5 ? 'Last 90 days' : 'Last 30 days'} active={r}>
      {/* 分段控件：滑块平移 */}
      <div style={{ position: 'absolute', right: 40, top: 40, width: 360, height: 60, borderRadius: 16, background: L.surface2, border: `1.5px solid ${L.line}` }}>
        <div style={{ position: 'absolute', top: 5, left: 5 + mix(118, 236, sel), width: 114, height: 47, borderRadius: 12, background: '#ffffff', boxShadow: softShadow(3, { color: L.shadow }) }} />
        {seg.map((s, i) => (
          <div key={s} style={{
            position: 'absolute', top: 0, left: 5 + i * 118, width: 114, height: 57, display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...type(26, 650), color: (i === 1 && sel < 0.5) || (i === 2 && sel >= 0.5) ? L.ink : L.ink3,
          }}>{s}</div>
        ))}
      </div>
      {/* 大数字换档 */}
      <div style={{ position: 'absolute', left: 60, top: 168, height: 170, width: 700, overflow: 'hidden' }}>
        {[{ v: '2.48M', p: -r }, { v: '7.31M', p: 1 - r }].map(({ v, p }, i) => (
          <div key={i} style={{
            position: 'absolute', left: 0, top: 0, ...type(150, 720), color: L.ink,
            transform: `translateY(${(p * 150).toFixed(1)}px)`, opacity: 1 - Math.abs(p) * 0.9,
          }}>{v}</div>
        ))}
      </div>
      <div style={{
        position: 'absolute', right: 64, top: 236, height: 52, padding: '0 20px', borderRadius: 26, display: 'flex', alignItems: 'center', gap: 8,
        background: alpha(UP, 0.1), color: UP, ...type(30, 700),
      }}>▲ {r > 0.5 ? '24.6%' : '18.2%'}</div>
      {/* 柱子：点击后错峰弹到新高度 */}
      <div style={{ position: 'absolute', left: 64, right: 64, bottom: 64, height: 200, display: 'flex', alignItems: 'flex-end', gap: 18 }}>
        {REV_BARS_A.map((a, i) => {
          const sp = f < clickAt(0) + 2 ? 0 : springAt(f, clickAt(0) + 2 + i * 1.4, { damping: 15, stiffness: 190 });
          const h = mix(a, REV_BARS_B[i], sp);
          const last = i === REV_BARS_A.length - 1;
          return (
            <div key={i} style={{
              flex: 1, height: `${(h * 100).toFixed(2)}%`, borderRadius: 10,
              background: last ? `linear-gradient(180deg, ${ACC}, #5c80ff)` : alpha(ACC, 0.14 + 0.1 * r * (i / 11)),
            }} />
          );
        })}
      </div>
    </Module>
  );
};

// ② Active users
const smoothPath = (pts: [number, number][]) => {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};
const PTS = LY.map((_, i) => [ptX(i), ptY(i)] as [number, number]);
const LINE = smoothPath(PTS);
const Users: React.FC<{ f: number }> = ({ f }) => {
  const r = resp(f, 1);
  const tip = f < clickAt(1) + 2 ? 0 : springAt(f, clickAt(1) + 2, { damping: 14, stiffness: 210 });
  const guide = resp(f, 1, 12, EASE.snappy);
  const hx = ptX(HOT), hy = ptY(HOT);
  const base = CH.y + CH.h;
  return (
    <Module m={MOD.users} title="Shot previews" meta="Weekly · Sep" active={r}>
      <div style={{ position: 'absolute', right: 64, top: 56, ...type(34, 700), color: L.ink }}>48.2k</div>
      <svg width={MOD.users.w} height={MOD.users.h} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <linearGradient id="cf2-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={ACC} stopOpacity={0.2} />
            <stop offset="1" stopColor={ACC} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((k) => (
          <line key={k} x1={CH.x} x2={CH.x + CH.w} y1={CH.y + (k * CH.h) / 3} y2={CH.y + (k * CH.h) / 3} stroke={L.line} strokeWidth={1.5} />
        ))}
        <path d={`${LINE} L${CH.x + CH.w},${base} L${CH.x},${base} Z`} fill="url(#cf2-area)" />
        <path d={LINE} fill="none" stroke={ACC} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        {/* 引导线自上而下落到底 */}
        <line x1={hx} x2={hx} y1={hy} y2={hy + (base - hy) * guide} stroke={ACC} strokeWidth={2} strokeDasharray="6 6" opacity={0.8} />
        <circle cx={hx} cy={hy} r={9 + 7 * tip} fill="#ffffff" stroke={ACC} strokeWidth={5} />
        {['Sep 1', 'Sep 8', 'Sep 15', 'Sep 22', 'Sep 29'].map((m, i) => (
          <text key={m} x={CH.x + (i * CH.w) / 4} y={base + 48} fill={L.ink3} fontSize={24} fontFamily={FONT.sans} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>{m}</text>
        ))}
      </svg>
      {/* tooltip：过冲弹出 */}
      <div style={{
        position: 'absolute', left: hx - 150, top: hy - 168, width: 300, height: 124, borderRadius: 20, padding: '20px 26px', boxSizing: 'border-box',
        background: L.ink, color: '#ffffff', boxShadow: softShadow(24, { color: L.shadow, strength: 1.4 }),
        opacity: Math.min(1, tip * 2), transform: `translateY(${((1 - tip) * 16).toFixed(1)}px) scale(${(0.86 + 0.14 * tip).toFixed(3)})`, transformOrigin: '50% 100%',
      }}>
        <div style={{ ...type(22, 600), letterSpacing: '0.06em', color: alpha('#ffffff', 0.6), textTransform: 'uppercase' }}>Sep 22</div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ ...type(46, 720) }}>51,204</span>
          <span style={{ ...type(26, 700), color: '#5ee0b8' }}>+12%</span>
        </div>
      </div>
    </Module>
  );
};

// ③ Release flags
const FLAGS = [
  { n: 'Beat-synced cuts', d: 'Snap every cut to the music grid' },
  { n: 'Film-grade SFX', d: 'Layer whooshes and hits per shot' },
  { n: 'JianYing export', d: 'Open the edit as a JianYing draft' },
];
const Toggle: React.FC<{ on: number }> = ({ on }) => (
  <div style={{ position: 'relative', width: 92, height: 54, borderRadius: 27, background: on > 0.5 ? ACC : '#d5dbe6' }}>
    <div style={{ position: 'absolute', inset: 0, borderRadius: 27, background: ACC, opacity: Math.min(1, Math.max(0, on)) }} />
    <div style={{ position: 'absolute', top: 5, left: 5 + 38 * on, width: 44, height: 44, borderRadius: 22, background: '#ffffff', boxShadow: '0 2px 6px rgba(12,26,58,0.25)' }} />
  </div>
);
const Flags: React.FC<{ f: number }> = ({ f }) => {
  const on = f < clickAt(2) + 1 ? 0 : springAt(f, clickAt(2) + 1, { damping: 16, stiffness: 240 });
  const roll = resp(f, 2, 26, EASE.out);
  return (
    <Module m={MOD.flags} title="Release · v4.2" meta="Feature flags" active={resp(f, 2)}>
      {FLAGS.map((fl, i) => {
        const first = i === 0;
        const v = first ? on : i === 1 ? 1 : 0;
        return (
          <div key={fl.n} style={{ position: 'absolute', left: 64, right: 64, top: 196 + i * 140, height: first ? 132 : 100, borderTop: i ? `1.5px solid ${L.line}` : undefined }}>
            <div style={{ position: 'absolute', left: 0, top: i ? 22 : 6, ...type(36, 650), color: L.ink }}>{fl.n}</div>
            <div style={{ position: 'absolute', left: 0, top: i ? 70 : 54, ...type(26, 450), color: L.ink3 }}>{fl.d}</div>
            <div style={{ position: 'absolute', right: 0, top: i ? 22 : 4 }}><Toggle on={v} /></div>
            {first && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: 104, display: 'flex', alignItems: 'center', gap: 18, opacity: Math.min(1, roll * 3) }}>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: L.surface2, overflow: 'hidden' }}>
                  <div style={{ width: `${(roll * 25).toFixed(2)}%`, height: '100%', borderRadius: 4, background: ACC }} />
                </div>
                <div style={{ ...type(24, 650), color: ACC, width: 210, textAlign: 'right' }}>Rolling out · {Math.round(roll * 25)}%</div>
              </div>
            )}
          </div>
        );
      })}
    </Module>
  );
};

// ④ Top shots（镜头卡 · 分类 · 本月渲染次数）
const ACCTS = [
  { n: 'Crash zoom', p: 'Camera', v: '4,280' },
  { n: 'Cursor flyover', p: 'Camera', v: '3,125' },
  { n: 'Text as mask', p: 'Opening', v: '1,890' },
  { n: 'Logo sting', p: 'Outro', v: '941' },
];
const Accounts: React.FC<{ f: number }> = ({ f }) => {
  const r = resp(f, 3, 14);
  const tick = resp(f, 3, 12, EASE.out);
  return (
    <Module m={MOD.accts} title="Top shots" meta="By renders this month" active={r}>
      {ACCTS.map((a, i) => {
        const sel = i === 1 ? r : 0;
        return (
          <div key={a.n} style={{
            position: 'absolute', left: 40, right: 40, top: 196 + i * 104, height: 100, borderRadius: 18,
            background: sel > 0 ? alpha(ACC, 0.08 * sel) : 'transparent',
            borderTop: i && sel < 0.01 && i !== 2 ? `1.5px solid ${L.line}` : '1.5px solid transparent',
          }}>
            <div style={{ position: 'absolute', left: 0, top: 22, width: 6, height: 56, borderRadius: 3, background: ACC, transform: `scaleY(${sel.toFixed(3)})` }} />
            {/* 勾选框 */}
            <div style={{
              position: 'absolute', left: 42, top: 32, width: 36, height: 36, borderRadius: 10, boxSizing: 'border-box',
              border: `2.5px solid ${sel > 0.3 ? ACC : '#c4cbd8'}`, background: sel > 0.3 ? ACC : '#ffffff',
            }}>
              {i === 1 && (
                <svg width={36} height={36} viewBox="0 0 36 36" style={{ position: 'absolute', left: -2.5, top: -2.5 }}>
                  <path d="M10 18.5 L15.5 24 L26 12.5" fill="none" stroke="#ffffff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={26} strokeDashoffset={26 * (1 - tick)} />
                </svg>
              )}
            </div>
            <div style={{ position: 'absolute', left: 112, top: 28, ...type(36, sel > 0.5 ? 700 : 560), color: L.ink }}>{a.n}</div>
            <div style={{ position: 'absolute', left: 600, top: 30, height: 40, padding: '0 16px', borderRadius: 20, display: 'flex', alignItems: 'center', background: L.surface2, ...type(24, 600), color: L.ink2 }}>{a.p}</div>
            <div style={{ position: 'absolute', right: 32, top: 28, ...type(36, 650), color: L.ink }}>{a.v}</div>
          </div>
        );
      })}
    </Module>
  );
};

// 光标：macOS 式箭头（黑芯白边 + 两层影），屏幕恒为 40px
const Cursor: React.FC<{ press: number }> = ({ press }) => (
  <svg viewBox="0 0 24 24" width={40} height={40} style={{
    position: 'absolute', left: -3, top: -2, overflow: 'visible',
    filter: 'drop-shadow(0 2px 2px rgba(12,26,58,0.35)) drop-shadow(0 8px 12px rgba(12,26,58,0.25))',
    transform: `scale(${(1 - 0.16 * press).toFixed(3)})`, transformOrigin: '3px 2px',
  }}>
    <path d="M4.5 2.5 L4.5 19.2 L8.9 15 L11.9 21.6 L14.9 20.3 L11.9 13.8 L18.2 13.4 Z" fill="#0d1324" stroke="#ffffff" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

export const CursorFlyover: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  const scr = (f: number) => {
    const c = camAt(f);
    return { x: 960 - c.x * c.s, y: 540 - c.y * c.s };
  };
  const a = scr(frame + 0.5), b = scr(frame - 0.5);
  const cur = cursorAt(frame);
  const cx = 960 + (cur.x - cam.x) * cam.s;
  const cy = 540 + (cur.y - cam.y) * cam.s;
  // 按下：每站 clickAt 前 1.5f 压下、之后过冲回弹
  let press = 0;
  let ripple = -1;
  for (let k = 0; k < 4; k++) {
    const pf = frame - clickAt(k);
    if (pf > -2 && pf < 8) press = Math.max(press, pf < 1 ? ramp(pf, -2, 3, EASE.swift) : 1 - ramp(pf, 1, 6, EASE.overshoot));
    if (pf >= 0 && pf < 18) ripple = pf / 18;
  }
  const intro = ramp(frame, 0, 14, EASE.out);
  return (
    <AbsoluteFill style={{ background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: -0.1 }} fill={{ x: 0.1, y: 1 }} />
      <SpeedBlur vx={a.x - b.x} vy={a.y - b.y} amount={0.09} max={8}>
        <div style={{
          position: 'absolute', left: 0, top: 0, width: WW, height: WH, transformOrigin: '0 0',
          transform: `translate(${(960 - cam.x * cam.s).toFixed(2)}px, ${(540 - cam.y * cam.s).toFixed(2)}px) scale(${cam.s.toFixed(5)})`,
          opacity: intro,
        }}>
          {/* 应用窗口底板 */}
          <div style={{
            position: 'absolute', left: -40, top: -30, width: WW + 80, height: WH + 60, borderRadius: 48,
            background: `linear-gradient(180deg, #f4f7fb, #edf1f7)`, border: `1.5px solid ${L.line}`,
            boxShadow: `inset 0 2px 0 #ffffff, ${softShadow(40, { color: L.shadow, strength: 1.2 })}`,
          }} />
          {/* 顶栏 */}
          <div style={{ position: 'absolute', left: 60, top: 36, right: 60, height: 76, display: 'flex', alignItems: 'center' }}>
            <ShotcraftMark size={60} tone="light" />
            <div style={{ marginLeft: 18, fontFamily: BRAND.font, fontSize: 38, fontWeight: 700, letterSpacing: '0.03em', lineHeight: 1, color: BRAND.ink }}>{BRAND.name}</div>
            <div style={{ marginLeft: 72, display: 'flex', gap: 14 }}>
              {['Overview', 'Shots', 'Renders', 'Releases'].map((t, i) => (
                <div key={t} style={{ height: 56, padding: '0 26px', borderRadius: 16, display: 'flex', alignItems: 'center', ...type(28, i ? 520 : 650), color: i ? L.ink3 : L.ink, background: i ? 'transparent' : '#ffffff', boxShadow: i ? undefined : softShadow(3, { color: L.shadow }) }}>{t}</div>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ height: 56, width: 360, borderRadius: 16, background: '#ffffff', border: `1.5px solid ${L.line}`, display: 'flex', alignItems: 'center', padding: '0 22px', boxSizing: 'border-box', ...type(26, 450), color: L.ink3 }}>Search shots  ⌘K</div>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: 'linear-gradient(135deg, #ffd2a8, #ff9f7a)', border: '3px solid #ffffff', boxShadow: softShadow(3, { color: L.shadow }) }} />
            </div>
          </div>
          <Revenue f={frame} />
          <Users f={frame} />
          <Flags f={frame} />
          <Accounts f={frame} />
        </div>
      </SpeedBlur>
      {/* 点击涟漪 + 光标（屏幕空间，恒定尺寸） */}
      {ripple >= 0 && (
        <div style={{
          position: 'absolute', left: cx - 40, top: cy - 40, width: 80, height: 80, borderRadius: 40,
          border: `3px solid ${alpha(ACC, (1 - ripple) * 0.9)}`, background: alpha(ACC, (1 - ripple) * 0.12),
          transform: `scale(${(0.3 + EASE.out(ripple) * 1.2).toFixed(3)})`,
        }} />
      )}
      <div style={{ position: 'absolute', left: cx, top: cy, opacity: intro }}>
        <Cursor press={press} />
      </div>
    </AbsoluteFill>
  );
};
