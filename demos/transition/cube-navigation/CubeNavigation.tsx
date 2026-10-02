// cube-navigation — 立方体逐面导航：六个模块贴在同一个立方体的六面，相机在「正面特写读内容」与
// 「拉远等轴看棱角」之间交替步进，每面按法线朝向实时算明暗。
//
// 第二轮重设计（石墨暗场 · 产品发布会陈列）：
// - look = graphite（近单色暗场）。舞台不抢色，六面各持一个色相（面身份）——蓝 / 紫 / 玫红 / 青 / 绿 / 琥珀，
//   都压成同一明度的"深色釉面"，强调色只在各自面内的主数据上。
// - 不再用 480×270 设计坐标放大：直接按 1920 成片坐标搭，立方体边长 760px，特写时屏幕放大 ≈1.1×，
//   面上文字按接近原生尺寸栅格化（Q2），整面完整入画——不再"特写时上下出画"。
// - 构图：立方体中心放在画面 58% 处；左侧是模块索引栏（六个模块名 + 序号），当前面高亮并跟着相机换面，
//   观众始终知道"我在整体的哪一面"；收尾在索引栏上方升起大标题，成一张发布会海报。
// - 相机：每次换面是一条"拉远+转向 → 到等轴顶点悬停 → 转向+推近"的弧（两段 in-out 首尾零速，顶点自然悬停），
//   拉远时推拉先走 3f、推近时转向先走、推拉后到 4f（重叠），不同步机械地一起走。
//
// 时间表（30fps，共 240f）：
//   0–18    正面特写 Overview（第 0 帧即在画面里），折线 0–26f 描出、数字计数
//   18–44   拉远 + 转向到等轴 A（26f），44–48 顶点悬停
//   48–72   转向 + 推近到右面 Revenue（24f）
//   72–98   读 Revenue（26f），柱子 74–96 错峰长起
//   98–124  拉远到等轴 B；124–128 悬停；128–152 推近到背面 Timeline
//   152–178 读 Timeline（26f），里程碑逐条点亮
//   178–208 拉远到收尾等轴（更远、更高），208–240 hold；194–224 左上大标题逐行升起
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TYPE, alpha, stagger, type } from '../../_fixtures/Look';

export const CUBE_NAVIGATION_DURATION = 240;

const L = LOOKS.graphite;
const S = 760; // 立方体边长（成片坐标）
const H = S / 2;
const P = 2600; // 透视距离（P/S ≈ 3.4：棱角清楚又不畸变）
const CX = 1114; // 立方体中心（画面 58%）
const CY = 540;

type FaceKind = 'overview' | 'revenue' | 'timeline' | 'assets' | 'settings' | 'export';
const FACES: { n: string; tr: string; nm: [number, number, number]; hue: number; kind: FaceKind; meta: string }[] = [
  { n: 'Overview', tr: `translateZ(${H}px)`, nm: [0, 0, 1], hue: 218, kind: 'overview', meta: 'Last 30 days' },
  { n: 'Revenue', tr: `rotateY(90deg) translateZ(${H}px)`, nm: [1, 0, 0], hue: 262, kind: 'revenue', meta: 'This month' },
  { n: 'Timeline', tr: `rotateY(180deg) translateZ(${H}px)`, nm: [0, 0, -1], hue: 336, kind: 'timeline', meta: 'Q4 plan' },
  { n: 'Assets', tr: `rotateY(-90deg) translateZ(${H}px)`, nm: [-1, 0, 0], hue: 188, kind: 'assets', meta: '4 files' },
  { n: 'Settings', tr: `rotateX(90deg) translateZ(${H}px)`, nm: [0, -1, 0], hue: 152, kind: 'settings', meta: 'Workspace' },
  { n: 'Export', tr: `rotateX(-90deg) translateZ(${H}px)`, nm: [0, 1, 0], hue: 36, kind: 'export', meta: 'Share' },
];

// 相机姿态：d = rig 的 translateZ（越大越近）。特写 d=-140（正面屏幕放大 ≈1.1×），等轴 d≈-2000（≈0.56×）
type Cam = { rx: number; ry: number; d: number };
const CLOSE = -140;
const POSES: Cam[] = [
  { rx: 0, ry: 0, d: CLOSE }, // Overview 特写
  { rx: -24, ry: -42, d: -2000 }, // 等轴 A
  { rx: 0, ry: -90, d: CLOSE }, // Revenue 特写
  { rx: -24, ry: -138, d: -2000 }, // 等轴 B
  { rx: 0, ry: -180, d: CLOSE }, // Timeline 特写
  { rx: -27, ry: -222, d: -2250 }, // 收尾等轴（更远更高）
];
// 每段 [起, 止] 帧
const MOVES: [number, number][] = [[18, 44], [48, 72], [98, 124], [128, 152], [178, 208]];
const MOVE_EASE = bezier(0.62, 0, 0.3, 1); // 起步柔、落点更柔的 in-out
const LAG = 4; // 推拉相对转向的错峰（帧）

const camAt = (f: number): Cam => {
  const out: Cam = { ...POSES[0] };
  MOVES.forEach(([a, b], i) => {
    const from = POSES[i], to = POSES[i + 1];
    const pullOut = to.d < from.d;
    // 拉远：推拉先走、转向晚 3f；推近：转向先走、推拉晚 LAG 帧
    const dA = pullOut ? a : a + LAG, rA = pullOut ? a + 3 : a;
    const ud = ramp(f, dA, b - a, MOVE_EASE);
    const ur = ramp(f, rA, b - a - (pullOut ? 3 : 0), MOVE_EASE);
    out.d += ud * (to.d - from.d);
    out.rx += ur * (to.rx - from.rx);
    out.ry += ur * (to.ry - from.ry);
  });
  // 全程极缓的匀速漂移（转向 -0.018°/f + 推近 0.25px/f）：hold 段也活着，特写带一点点侧角，不加抖动
  out.ry += -0.018 * f;
  out.d += 0.25 * f;
  return out;
};

const RAD = Math.PI / 180;

// ───── 面配色：同明度深釉面 + 该面强调色 ─────
const ink = (h: number, a = 0.96) => `hsla(${h},30%,96%,${a})`;
const sub = (h: number, a = 0.62) => `hsla(${h},30%,80%,${a})`;
const acc = (h: number, a = 1) => `hsla(${h},90%,70%,${a})`;
const tile = (h: number): React.CSSProperties => ({
  background: `hsla(${h},40%,70%,0.07)`, boxShadow: `inset 0 0 0 1.5px hsla(${h},60%,80%,0.12)`, borderRadius: 20,
});

const FaceBody: React.FC<{ kind: FaceKind; h: number; f: number }> = ({ kind, h, f }) => {
  if (kind === 'overview') {
    const pts = [0.22, 0.34, 0.3, 0.46, 0.42, 0.55, 0.5, 0.66, 0.62, 0.84];
    const W = 632, CH = 170;
    const draw = ramp(f, 0, 26, EASE.out);
    const line = pts.map((v, i) => `${(i / 9) * W},${(1 - v) * CH}`).join(' ');
    const n = Math.round(mix(19.2, 24.8, ramp(f, 0, 22, EASE.snappy)) * 10) / 10;
    return (
      <>
        <div style={{ ...type(160, 760), color: ink(h) }}>{n.toFixed(1)}k</div>
        <div style={{ marginTop: 14, display: 'flex', gap: 16, alignItems: 'center', ...type(32, 500), color: sub(h) }}>
          weekly active users <span style={{ color: acc(h), fontWeight: 650 }}>▲ 12.4%</span>
        </div>
        <svg width={W} height={CH + 10} style={{ marginTop: 36, display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="cn-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={acc(h)} stopOpacity={0.32} />
              <stop offset="100%" stopColor={acc(h)} stopOpacity={0} />
            </linearGradient>
            <clipPath id="cn-draw"><rect x={-10} y={-20} width={(W + 20) * draw} height={CH + 40} /></clipPath>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={W} y1={g * CH} y2={g * CH} stroke={sub(h, 0.12)} strokeWidth={1.5} />)}
          <g clipPath="url(#cn-draw)">
            <polygon points={`0,${CH} ${line} ${W},${CH}`} fill="url(#cn-area)" />
            <polyline points={line} fill="none" stroke={acc(h)} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {draw > 0.98 && <circle cx={W} cy={(1 - 0.84) * CH} r={10} fill={ink(h)} stroke={acc(h)} strokeWidth={4} />}
        </svg>
        <div style={{ marginTop: 34, display: 'flex', gap: 22 }}>
          {[['Sessions', '182k'], ['Retention', '64%'], ['NPS', '71']].map(([k, val]) => (
            <div key={k} style={{ ...tile(h), flex: 1, padding: '18px 24px' }}>
              <div style={{ ...type(24, 500), color: sub(h) }}>{k}</div>
              <div style={{ ...type(46, 700), color: ink(h), marginTop: 6 }}>{val}</div>
            </div>
          ))}
        </div>
      </>
    );
  }
  if (kind === 'revenue') {
    const bars = [0.36, 0.5, 0.44, 0.62, 0.56, 0.86, 0.7];
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <div style={{ ...type(150, 760), color: ink(h) }}>$48.2k</div>
        </div>
        <div style={{ marginTop: 14, ...type(32, 500), color: sub(h) }}>net revenue <span style={{ color: acc(h), fontWeight: 650 }}>+6.3%</span></div>
        <div style={{ marginTop: 44, display: 'flex', alignItems: 'flex-end', gap: 22, height: 220, borderBottom: `2px solid ${sub(h, 0.2)}` }}>
          {bars.map((v, i) => {
            const g = ramp(f, 74 + stagger(i, 7, 12, EASE.out), 16, EASE.snappy);
            return (
              <div key={i} style={{
                flex: 1, height: `${(v * (0.12 + 0.88 * g) * 100).toFixed(2)}%`, borderRadius: '12px 12px 3px 3px',
                background: i === 5 ? `linear-gradient(180deg, ${acc(h)}, hsla(${h},70%,52%,1))` : `hsla(${h},50%,72%,0.2)`,
                boxShadow: i === 5 ? `0 0 30px hsla(${h},90%,65%,0.35)` : undefined,
              }} />
            );
          })}
        </div>
        <div style={{ marginTop: 14, display: 'flex', ...type(24, 500), color: sub(h, 0.5) }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} style={{ flex: 1, textAlign: 'center', color: i === 5 ? acc(h) : undefined }}>{d}</span>)}
        </div>
      </>
    );
  }
  if (kind === 'timeline') {
    const ms = [['Design freeze', 'Oct 18', 1], ['Beta · 500 teams', 'Oct 30', 1], ['Pricing live', 'Nov 12', 0.5], ['GA launch', 'Dec 2', 0]] as const;
    return (
      <div style={{ position: 'relative', paddingLeft: 64, marginTop: 6 }}>
        <div style={{ position: 'absolute', left: 15, top: 20, bottom: 70, width: 3, background: sub(h, 0.2), borderRadius: 2 }} />
        {ms.map(([t, d, s], i) => {
          const on = ramp(f, 154 + i * 5, 12, EASE.out);
          return (
            <div key={i} style={{ position: 'relative', height: 126 }}>
              <div style={{
                position: 'absolute', left: -64, top: 10, width: 34, height: 34, borderRadius: 17, boxSizing: 'border-box',
                background: s === 1 ? acc(h) : 'transparent', border: `4px solid ${s ? acc(h) : sub(h, 0.4)}`,
                boxShadow: s === 0.5 ? `0 0 ${(10 + 18 * on).toFixed(1)}px ${acc(h, 0.8)}` : 'none',
              }} />
              <div style={{ ...type(50, 680), color: s === 0 ? sub(h, 0.7) : ink(h) }}>{t}</div>
              <div style={{ marginTop: 8, ...type(28, 500), color: s === 0.5 ? acc(h) : sub(h, 0.55) }}>{d}{s === 0.5 ? '  ·  next up' : ''}</div>
            </div>
          );
        })}
      </div>
    );
  }
  if (kind === 'assets') {
    const files = [['Launch-film.mp4', '248 MB', 'MP4'], ['Brand-kit.fig', '36 MB', 'FIG'], ['Pricing-v3.pdf', '2.1 MB', 'PDF'], ['Hero-shots.zip', '512 MB', 'ZIP']];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 8 }}>
        {files.map(([n, sz, ext], i) => (
          <div key={i} style={{ ...tile(h), display: 'flex', alignItems: 'center', gap: 24, padding: '22px 26px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 16, background: i === 0 ? acc(h, 0.9) : `hsla(${h},50%,70%,0.16)`,
              color: i === 0 ? `hsl(${h},50%,12%)` : ink(h, 0.8), ...type(20, 800), display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{ext}</div>
            <div style={{ flex: 1, ...type(34, 600), color: ink(h) }}>{n}</div>
            <div style={{ ...type(26, 500), color: sub(h, 0.55) }}>{sz}</div>
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'settings') {
    const rows = [['Two-factor auth', true], ['Public share links', false], ['Weekly digest', true], ['Beta features', true]] as const;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
        {rows.map(([n, on], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', height: 132, borderBottom: i < 3 ? `2px solid ${sub(h, 0.12)}` : 'none' }}>
            <div style={{ flex: 1, ...type(40, 600), color: ink(h) }}>{n}</div>
            <div style={{ width: 96, height: 54, borderRadius: 27, background: on ? acc(h) : `hsla(${h},30%,70%,0.18)`, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 6, left: on ? 48 : 6, width: 42, height: 42, borderRadius: 21, background: '#fff' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <>
      <div style={{ ...type(TYPE.h3, 720), color: ink(h) }}>Q4 board report</div>
      <div style={{ marginTop: 14, ...type(30, 500), color: sub(h) }}>12 pages · updated 2h ago</div>
      <div style={{ marginTop: 50, display: 'flex', gap: 22 }}>
        {['PDF', 'CSV', 'MP4'].map((x, i) => (
          <div key={x} style={{
            ...tile(h), flex: 1, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', ...type(40, 700),
            color: i === 0 ? ink(h) : sub(h, 0.8), boxShadow: i === 0 ? `inset 0 0 0 3px ${acc(h, 0.8)}` : tile(h).boxShadow,
          }}>{x}</div>
        ))}
      </div>
      <div style={{
        marginTop: 50, height: 110, borderRadius: 24, background: `linear-gradient(180deg, ${acc(h)}, hsla(${h},80%,56%,1))`,
        color: `hsl(${h},60%,10%)`, ...type(40, 760), display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>Export report</div>
    </>
  );
};

// 当前面（索引栏高亮）：随转向在相邻面之间连续过渡（0 Overview → 1 Revenue → 2 Timeline）
const faceIndexAt = (ry: number) => Math.min(2, Math.max(0, -ry / 90));

export const CubeNavigation: React.FC = () => {
  const f = useCurrentFrame();
  const v = camAt(f);
  const cy = Math.cos(v.ry * RAD), sy = Math.sin(v.ry * RAD);
  const cx = Math.cos(v.rx * RAD), sx = Math.sin(v.rx * RAD);
  const fi = faceIndexAt(v.ry);
  const hueNow = FACES[Math.floor(fi)].hue + (FACES[Math.min(2, Math.floor(fi) + 1)].hue - FACES[Math.floor(fi)].hue) * (fi - Math.floor(fi));
  const iso = Math.min(1, Math.max(0, (CLOSE - v.d) / (CLOSE + 2000))); // 0 特写 / 1 等轴
  const titleIn = (k: number) => ramp(f, 194 + k * 6, 22, EASE.snappy);

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: CX / 1920, y: -0.08 }} fill={{ x: 0.08, y: 0.95 }} intensity={0.8} breathe={0.3}>
        {/* 面色相余光：跟着当前面换色，等轴时更明显 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 34% 46% at ${(CX / 1920) * 100}% 56%, hsla(${hueNow.toFixed(1)},70%,55%,${(0.07 + 0.08 * iso).toFixed(3)}), hsla(${hueNow.toFixed(1)},70%,50%,0) 70%)`,
        }} />
        <Dust look={L} count={26} seed={7} drift={0.18} opacity={0.35} />
      </Stage>

      {/* 立方体 */}
      <div style={{ position: 'absolute', inset: 0, perspective: P, perspectiveOrigin: `${CX}px ${CY}px` }}>
        <div style={{
          position: 'absolute', left: CX, top: CY, width: 0, height: 0, transformStyle: 'preserve-3d',
          transform: `translateZ(${v.d.toFixed(2)}px) rotateX(${v.rx.toFixed(3)}deg) rotateY(${v.ry.toFixed(3)}deg)`,
        }}>
          {/* 地面：接触影 + 当前面色相的落地光（水平圆盘，等轴俯视才看得见） */}
          <div style={{
            position: 'absolute', left: -900, top: -900, width: 1800, height: 1800, borderRadius: '50%',
            transform: `translateY(${H + 2}px) rotateX(90deg)`,
            background: `radial-gradient(circle, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 30%, rgba(0,0,0,0) 52%), radial-gradient(circle, hsla(${hueNow.toFixed(1)},80%,60%,0.16) 0%, hsla(${hueNow.toFixed(1)},80%,55%,0) 62%)`,
          }} />
          {FACES.map((fc, i) => {
            const [nx, ny, nz] = fc.nm;
            const z1 = -nx * sy + nz * cy, y1 = ny;
            const z2 = y1 * sx + z1 * cx;
            const lit = Math.max(0, z2);
            if (lit <= 0.001) return null; // 背光面不画（backface 本就看不见），省栅格
            return (
              <div key={fc.n} style={{
                position: 'absolute', left: -H, top: -H, width: S, height: S, transform: fc.tr, backfaceVisibility: 'hidden',
                borderRadius: 18, overflow: 'hidden', boxSizing: 'border-box',
                background: `linear-gradient(160deg, hsl(${fc.hue},34%,20%) 0%, hsl(${fc.hue},38%,12%) 60%, hsl(${fc.hue},40%,9%) 100%)`,
                boxShadow: `inset 0 0 0 2px hsla(${fc.hue},60%,78%,0.22), inset 0 2px 0 hsla(${fc.hue},80%,92%,0.3)`,
                filter: `brightness(${(0.42 + lit * 0.66).toFixed(3)}) saturate(${(0.75 + lit * 0.35).toFixed(2)})`,
              }}>
                {/* 左上受光：越正对越亮 */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: `radial-gradient(110% 80% at 15% 0%, hsla(${fc.hue},80%,82%,${(0.05 + lit * 0.1).toFixed(3)}), hsla(${fc.hue},80%,80%,0) 62%)`,
                }} />
                <div style={{ position: 'absolute', left: 64, right: 64, top: 58, bottom: 56 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 44 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: acc(fc.hue), boxShadow: `0 0 16px ${acc(fc.hue, 0.6)}` }} />
                    <div style={{ ...type(28, 700, { caps: true }), letterSpacing: '0.18em', color: acc(fc.hue, 0.95) }}>{fc.n}</div>
                    <div style={{ marginLeft: 'auto', ...type(26, 500), color: sub(fc.hue, 0.5) }}>{fc.meta}</div>
                  </div>
                  <FaceBody kind={fc.kind} h={fc.hue} f={f} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 左侧模块索引栏：当前面高亮，跟相机换面 */}
      <div style={{ position: 'absolute', left: 120, top: 500, width: 380 }}>
        <div style={{ ...type(TYPE.label, 700, { caps: true }), letterSpacing: '0.24em', color: L.ink3, marginBottom: 26, opacity: ramp(f, 0, 14, EASE.out) }}>
          Orbit · Modules
        </div>
        <div style={{ position: 'relative' }}>
          {/* 高亮条：竖向连续滑动 */}
          <div style={{
            position: 'absolute', left: -24, top: fi * 58 + 6, width: 4, height: 40, borderRadius: 2,
            background: `hsl(${hueNow.toFixed(1)},90%,70%)`, boxShadow: `0 0 14px hsla(${hueNow.toFixed(1)},90%,65%,0.7)`,
          }} />
          {FACES.map((fc, i) => {
            const on = Math.max(0, 1 - Math.abs(fi - i));
            const p = ramp(f, 2 + i * 2, 16, EASE.snappy);
            return (
              <div key={fc.n} style={{
                height: 58, display: 'flex', alignItems: 'center', gap: 22, opacity: p, transform: `translateX(${((1 - p) * -18).toFixed(2)}px)`,
              }}>
                <span style={{ ...type(24, 600, { mono: true }), color: on > 0.5 ? acc(fc.hue) : L.ink3, width: 34 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ ...type(36, on > 0.5 ? 700 : 500), color: `rgba(244,244,242,${(0.34 + 0.66 * on).toFixed(3)})` }}>{fc.n}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 收尾大标题（左上） */}
      <div style={{ position: 'absolute', left: 120, top: 150, ...type(TYPE.h2, 760), color: L.ink }}>
        {['Six views.', 'One workspace.'].map((t, k) => (
          <div key={t} style={{ overflow: 'hidden', padding: '0.04em 0 0.14em', margin: '-0.04em 0 -0.14em' }}>
            <div style={{ transform: `translateY(${((1 - titleIn(k)) * 115).toFixed(2)}%)`, color: k === 1 ? L.ink2 : L.ink }}>{t}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
