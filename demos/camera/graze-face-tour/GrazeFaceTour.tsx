// graze-face-tour｜大倾角贴面游走特写（第二轮重设计）
// 手法不变：镜头贴着 UI 表面低飞掠过（侧栏树 / 任务列表 / 标题区当地形），页面文字初始悬浮在
// 界面上空、向界面投同形软影，镜头经过时先后加速贴落回界面，影子随高度收敛消失。
//
// 设计决定
// - look：sand（米色 · 赤陶）。整张 UI 是一片被低角度暖阳斜照的"地形"：掠射光让悬浮的文字投出
//   长长的、方向一致的影子（低角度光从左侧来，影朝右拖）——影子越长越说明它飞得高，空间关系一眼成立。
// - 一镜到底：旧版三段交叉淡化接力 → 一条真正连续的上行长镜。相机焦点沿一条曲线从侧栏下部
//   （SPACES 树）飞向右上的任务列表和大标题，航向 −10°→−20° 边飞边右转，俯角 64°→54° 末段略抬，
//   落在大标题「Launch plan」上——尾帧就是一张有纵深的海报。
// - 真 3D 悬浮：文字 / 图标 / 徽标按 translateZ 沿界面法线抬起（不是 2D 假位移），影子画在界面上
//   （z≈0），偏移 = 高度 × 0.75 沿光的方位角，高处大而虚而淡、贴近时收紧变实，落地时与本体重合消失。
// - 错峰贴落：每个元素的落地时刻 = 相机焦点"前方距离"降到阈值的那一帧（预先按相机路径扫出来），
//   所以先经过的先落、下落过程彼此重叠并行；下落曲线加速 + 软着陆（easeFall，无回弹）。
// - 景深：远端用暖色空气雾 + backdrop 模糊带（只一层全屏 backdrop，不重复渲染整页）。
//
// 时间表（30fps，共 165f）
//   0–12    开场：近处侧栏的几行已在半空（第 1 帧就有悬浮 + 长影），相机已在飞（缓起）
//   0–132   连续上行：前 25% 缓起、中段匀速巡航、末 30% 缓落（无刹停）；沿途 ~60 个元素依次贴落
//   110–138 末段：大标题与副标题最后落地（标题 h=220，最重的一下）
//   138–165 hold：相机余速 → 0、光的呼吸，尾帧海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { LOOKS, alpha, type } from '../../_fixtures/Look';
import { EASE, FONT, Grain, Vignette, bezier, mix, ramp } from '../../_fixtures/Polish';

export const GRAZE_FACE_TOUR_DURATION = 165;

const L = LOOKS.sand;
const CW = 3800; // 画布（界面）尺寸
const CH = 3600;
const SIDE_W = 900;
const ACC = L.accent;

const easeFall = bezier(0.5, 0.05, 0.6, 1); // 加速下落、末端软着陆
const FALL = 22; // 每个元素的下落时长（帧）
const LAND_AHEAD = 120; // 焦点前方这个距离内的元素必须已落地（画布 px）——落地点在画面中部的清晰带里
const SUN = { x: 0.9, y: 0.43 }; // 影子方向（画布坐标单位向量 ≈ 低角度光从左侧来，影朝右拖）
const SHADOW_K = 0.75; // 影长 = 高度 × SHADOW_K（光的仰角 ≈ 53°）

// ───────────── 相机 ─────────────
// 焦点（画面锚点所看的画布坐标）沿三次贝塞尔曲线移动；cruise 给出"缓起—巡航—缓落"的行程
const P0 = { x: 780, y: 2420 }, P1 = { x: 820, y: 1800 }, P2 = { x: 1300, y: 1250 }, P3 = { x: 1500, y: 880 };
const bez = (a: number, b: number, c: number, d: number, u: number) =>
  (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * c + u ** 3 * d;
const MOVE_END = 140;
const cruise = (f: number) => {
  const u = Math.min(1, Math.max(0, f / MOVE_END));
  const A = 0.25, B = 0.3; // 缓起 / 缓落占比
  const v = 1 / (1 - A / 2 - B / 2); // 巡航速度（归一化）
  if (u < A) return (v * u * u) / (2 * A);
  if (u > 1 - B) return 1 - (v * (1 - u) ** 2) / (2 * B);
  return v * (u - A / 2);
};
type Cam = { fx: number; fy: number; rz: number; rx: number; s: number };
const camAt = (f: number): Cam => {
  const u = cruise(f);
  return {
    fx: bez(P0.x, P1.x, P2.x, P3.x, u),
    fy: bez(P0.y, P1.y, P2.y, P3.y, u),
    rz: mix(-10, -20, EASE.smooth(u)),
    rx: mix(64, 54, EASE.smooth(Math.max(0, (u - 0.55) / 0.45))),
    s: mix(1, 1.06, EASE.smooth(u)),
  };
};
// 焦点前方距离：元素在相机前进方向上领先焦点多少（画布 px）
const aheadOf = (c: Cam, x: number, y: number) => {
  const t = (-c.rz * Math.PI) / 180; // 前进方向 = 画布"向上"顺时针转 t
  return (x - c.fx) * Math.sin(t) + (y - c.fy) * -Math.cos(t);
};
// 预先扫描：每个锚点第一次进入"必须已落地"区的帧
const landFrame = (x: number, y: number) => {
  for (let f = 0; f <= MOVE_END; f++) if (aheadOf(camAt(f), x, y) < LAND_AHEAD) return f;
  return MOVE_END;
};

// ───────────── 悬浮单元 ─────────────
// x,y = 画布左上；ax/ay = 锚点（用于算落地时刻，默认左上 + 偏移）；H = 起始高度
type FloatSpec = { x: number; y: number; w: number; h: number; H?: number; key: string; node: React.ReactNode };

const Float: React.FC<{ spec: FloatSpec; frame: number; order: number }> = ({ spec, frame, order }) => {
  const H = spec.H ?? 150;
  // 落地帧：按相机路径扫出，最早 10f（开场先让观众看见悬浮 + 长影），最晚 MOVE_END
  const land = Math.max(10 + (order % 5) * 1.5, landFrame(spec.x + spec.w * 0.3, spec.y + spec.h * 0.5));
  const q = ramp(frame, land - FALL, FALL, easeFall);
  const z = H * (1 - q);
  const box: React.CSSProperties = { position: 'absolute', left: spec.x, top: spec.y, width: spec.w, height: spec.h };
  return (
    <>
      {z > 1 && (
        <div style={{
          ...box, transform: `translate3d(${(SUN.x * z * SHADOW_K).toFixed(1)}px, ${(SUN.y * z * SHADOW_K).toFixed(1)}px, 0.5px)`,
          // 高处影大而虚而淡，贴近时收紧变实（接触影），落地瞬间与本体重合消失
          filter: `brightness(0) blur(${(2 + z * 0.12).toFixed(1)}px)`, opacity: 0.24 * (1 - 0.7 * Math.min(1, z / H)) * Math.min(1, z / 6),
        }}>{spec.node}</div>
      )}
      <div style={{ ...box, transform: `translateZ(${z.toFixed(2)}px)` }}>{spec.node}</div>
    </>
  );
};

// ───────────── 界面内容（画布坐标） ─────────────
const T = (s: number, w: number, c: string, extra: React.CSSProperties = {}): React.CSSProperties => ({
  ...type(s, w), color: c, whiteSpace: 'nowrap', ...extra,
});
const Ico: React.FC<{ d: string; c?: string; s?: number }> = ({ d, c = L.ink3, s = 60 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
    <path d={d} />
  </svg>
);
const IC = {
  home: 'M4 11l8-6.5 8 6.5M6.5 9.5V19h11V9.5',
  inbox: 'M4 13.5l2.5-8h11l2.5 8v5H4zM4 13.5h4.5l1.2 2h4.6l1.2-2H20',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  target: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  chevR: 'M9.5 6l6 6-6 6',
  chevD: 'M6 9.5l6 6 6-6',
  doc: 'M7 3h7l4 4v14H7zM14 3v4h4',
};

const row = (gap = 32): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap, height: '100%' });

const buildFloats = (): FloatSpec[] => {
  const out: FloatSpec[] = [];
  // 侧栏：品牌 + 导航
  out.push({ key: 'logo', x: 90, y: 110, w: 700, h: 120, H: 170, node: (
    <div style={row(28)}>
      <div style={{ width: 92, height: 92, borderRadius: 26, background: `linear-gradient(140deg, #d8744a, ${ACC})`, boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.3)' }} />
      <div style={T(84, 780, L.ink)}>Orchard</div>
    </div>) });
  [['home', 'Home', ''], ['inbox', 'Inbox', ''], ['check', 'My tasks', ''], ['target', 'Goals', '']].forEach(([ic, n, c], i) => {
    out.push({ key: `nav${i}`, x: 110, y: 330 + i * 140, w: 700, h: 110, node: (
      <div style={row(34)}>
        <Ico d={IC[ic as keyof typeof IC]} c={L.ink2} />
        <div style={T(64, 560, L.ink2)}>{n}</div>
        {c && <div style={{ marginLeft: 'auto', marginRight: 30, ...T(48, 650, L.ink3) }}>{c}</div>}
      </div>) });
  });
  out.push({ key: 'spaces', x: 120, y: 960, w: 600, h: 70, H: 120, node: <div style={T(46, 700, L.ink3, { letterSpacing: '0.16em' })}>SPACES</div> });
  const tree: [number, string, 'r' | 'd' | 'doc', string?][] = [
    [0, 'Product', 'r', '#6f8f72'], [0, 'Design', 'd', '#c4552d'], [1, 'Design system', 'doc'], [1, 'Brand refresh', 'doc'],
    [1, 'Launch plan', 'doc'], [1, 'Research', 'doc'], [0, 'Growth', 'r', '#3d5a80'], [0, 'Support', 'r', '#b48a3c'],
    [0, 'Hiring', 'r', '#8a6fa8'], [0, 'Archive', 'r', '#9c8f80'],
  ];
  tree.forEach(([dep, n, kind, hue], i) => {
    const sel = n === 'Launch plan';
    out.push({ key: `tree${i}`, x: 100 + dep * 110, y: 1080 + i * 150, w: 760 - dep * 110, h: 120, node: (
      <div style={row(30)}>
        {kind === 'r' && <Ico d={IC.chevR} c={L.ink3} s={50} />}
        {kind === 'd' && <Ico d={IC.chevD} c={L.ink2} s={50} />}
        {kind === 'doc' && <Ico d={IC.doc} c={sel ? ACC : L.ink3} s={56} />}
        {hue && <div style={{ width: 64, height: 64, borderRadius: 18, background: hue, ...T(36, 750, '#fff8f0'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n[0]}</div>}
        <div style={T(62, sel ? 700 : 560, sel ? ACC : L.ink)}>{n}</div>
      </div>) });
  });
  out.push({ key: 'me', x: 110, y: 2700, w: 740, h: 130, H: 160, node: (
    <div style={row(30)}>
      <div style={{ width: 104, height: 104, borderRadius: 52, background: 'linear-gradient(140deg, #e3a27f, #a8573a)', border: `6px solid ${L.surface}` }} />
      <div><div style={T(58, 650, L.ink)}>Mira Chen</div><div style={T(44, 500, L.ink3)}>Product lead</div></div>
    </div>) });
  // 顶栏：面包屑 + 标签
  out.push({ key: 'crumb', x: SIDE_W + 110, y: 60, w: 1400, h: 90, node: (
    <div style={row(24)}><div style={T(54, 550, L.ink3)}>Design</div><Ico d={IC.chevR} c={L.ink3} s={44} /><div style={T(54, 650, L.ink)}>Launch plan</div></div>) });
  ['Overview', 'Board', 'Timeline', 'Docs'].forEach((n, i) => {
    out.push({ key: `tab${i}`, x: SIDE_W + 110 + [0, 360, 640, 1010][i], y: 190, w: 320, h: 90, node: (
      <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
        <div style={T(56, i === 0 ? 700 : 550, i === 0 ? L.ink : L.ink3)}>{n}</div>
        {i === 0 && <div style={{ position: 'absolute', left: 0, width: 250, bottom: -8, height: 7, borderRadius: 4, background: ACC }} />}
      </div>) });
  });
  out.push({ key: 'share', x: 3080, y: 150, w: 520, h: 130, H: 180, node: (
    <div style={row(22)}>
      {['#c4552d', '#3d5a80', '#6f8f72'].map((c, i) => <div key={c} style={{ width: 84, height: 84, borderRadius: 42, background: c, border: `6px solid ${L.surface}`, marginLeft: i ? -34 : 0 }} />)}
      <div style={{ marginLeft: 24, padding: '22px 48px', borderRadius: 999, background: L.ink, ...T(50, 650, L.surface) }}>Share</div>
    </div>) });
  // 标题区
  out.push({ key: 'title', x: SIDE_W + 110, y: 380, w: 2000, h: 240, H: 230, node: <div style={T(220, 800, L.ink, { letterSpacing: '-0.045em', lineHeight: 1 })}>Launch plan</div> });
  out.push({ key: 'sub', x: SIDE_W + 120, y: 650, w: 2000, h: 90, H: 180, node: (
    <div style={row(30)}>
      <div style={{ padding: '10px 28px', borderRadius: 999, background: alpha(ACC, 0.12), ...T(48, 700, ACC) }}>Q4 launch</div>
      <div style={T(56, 500, L.ink2)}>12 tasks · 7 done · Due Nov 12</div>
    </div>) });
  // 任务列表
  out.push({ key: 'head', x: SIDE_W + 120, y: 960, w: 2700, h: 70, H: 120, node: (
    <div style={{ ...row(0), ...T(40, 700, L.ink3, { letterSpacing: '0.14em' }) }}>
      <div style={{ width: 1360 }}>TASK</div><div style={{ width: 420 }}>OWNER</div><div style={{ width: 560 }}>STATUS</div><div>DUE</div>
    </div>) });
  const TASKS: [string, string, 'Done' | 'In review' | 'In progress' | 'Todo', string][] = [
    ['Finalize pricing page', '#c4552d', 'Done', 'Oct 28'],
    ['Record the launch film', '#3d5a80', 'In review', 'Nov 2'],
    ['Write press kit', '#6f8f72', 'In progress', 'Nov 4'],
    ['Send beta invites', '#b48a3c', 'Done', 'Nov 5'],
    ['Changelog 3.0', '#8a6fa8', 'In progress', 'Nov 6'],
    ['Support macros', '#3d5a80', 'Todo', 'Nov 8'],
    ['Partner briefing', '#c4552d', 'Todo', 'Nov 10'],
    ['Launch day runbook', '#6f8f72', 'Todo', 'Nov 12'],
  ];
  TASKS.forEach(([n, who, st, due], i) => {
    const y = 1080 + i * 220;
    const pill: Record<string, [string, string]> = {
      Done: [alpha(L.accent2, 0.14), L.accent2], 'In review': [ACC, '#fff8f0'], 'In progress': [alpha(ACC, 0.12), ACC], Todo: [alpha(L.ink, 0.06), L.ink2],
    };
    out.push({ key: `tn${i}`, x: SIDE_W + 120, y: y + 50, w: 1300, h: 110, node: (
      <div style={row(36)}>
        <div style={{ width: 62, height: 62, borderRadius: 18, border: `6px solid ${st === 'Done' ? L.accent2 : alpha(L.ink, 0.25)}`, background: st === 'Done' ? L.accent2 : 'transparent', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {st === 'Done' && <Ico d={IC.check} c="#fff8f0" s={40} />}
        </div>
        <div style={T(72, 600, st === 'Done' ? L.ink3 : L.ink, st === 'Done' ? { textDecoration: 'line-through', textDecorationThickness: 4 } : {})}>{n}</div>
      </div>) });
    out.push({ key: `tw${i}`, x: SIDE_W + 1480, y: y + 50, w: 380, h: 110, node: (
      <div style={row(22)}><div style={{ width: 88, height: 88, borderRadius: 44, background: who, border: `6px solid ${L.surface}` }} /></div>) });
    out.push({ key: `ts${i}`, x: SIDE_W + 1900, y: y + 60, w: 520, h: 96, node: (
      <div style={{ display: 'inline-flex', alignItems: 'center', height: '100%', padding: '0 40px', borderRadius: 999, background: pill[st][0], ...T(48, 700, pill[st][1]) }}>{st}</div>) });
    out.push({ key: `td${i}`, x: SIDE_W + 2460, y: y + 60, w: 340, h: 96, node: <div style={{ ...row(0), ...T(56, 600, due === 'Nov 12' ? ACC : L.ink2) }}>{due}</div> });
  });
  return out;
};
const FLOATS = buildFloats();

// 界面底面（不悬浮）：侧栏底、行分隔线、选中行底色、进度条
const Surface: React.FC = () => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: CW, height: CH, background: L.surface, borderRadius: 60, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: SIDE_W, height: CH, background: L.surface2, borderRight: `4px solid ${L.line}` }} />
    <div style={{ position: 'absolute', left: SIDE_W, top: 300, right: 0, height: 4, background: L.line }} />
    {/* 选中树行底色：Launch plan */}
    <div style={{ position: 'absolute', left: 150, top: 1080 + 4 * 150 - 6, width: 700, height: 132, borderRadius: 28, background: alpha(ACC, 0.1) }} />
    {/* 进度条 */}
    <div style={{ position: 'absolute', left: SIDE_W + 120, top: 800, width: 2600, height: 22, borderRadius: 11, background: alpha(L.ink, 0.07) }}>
      <div style={{ width: '58%', height: '100%', borderRadius: 11, background: `linear-gradient(90deg, ${alpha(ACC, 0.7)}, ${ACC})` }} />
    </div>
    {Array.from({ length: 9 }, (_, i) => (
      <div key={i} style={{ position: 'absolute', left: SIDE_W + 120, top: 1060 + i * 220, width: 2680, height: 4, background: L.line }} />
    ))}
    {/* 受光：暖阳从左上斜照，画布上一层大面积明暗过渡 */}
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(125deg, ${alpha('#fff3df', 0.55)} 0%, ${alpha('#fff3df', 0)} 45%, ${alpha(L.shadow, 0.06)} 100%)` }} />
  </div>
);

export const GrazeFaceTour: React.FC = () => {
  const frame = useCurrentFrame();
  const c = camAt(frame);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: `linear-gradient(180deg, ${L.bg[0]} 0%, ${L.bg[1]} 60%, ${L.bg[2]} 100%)` }}>
      <AbsoluteFill style={{ perspective: 1150, perspectiveOrigin: '50% 30%' }}>
        <div style={{
          position: 'absolute', left: 960, top: 640, width: 0, height: 0, transformStyle: 'preserve-3d',
          transform: `scale(${c.s}) rotateX(${c.rx}deg) rotateZ(${c.rz}deg) translate(${-c.fx}px, ${-c.fy}px)`,
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: CW, height: CH, transformStyle: 'preserve-3d', fontFamily: FONT.sans }}>
            <Surface />
            {FLOATS.map((s, i) => <Float key={s.key} spec={s} frame={frame} order={i} />)}
          </div>
        </div>
      </AbsoluteFill>

      {/* 景深：远端（画面上部）一条 backdrop 模糊带 + 暖色空气雾；近端底边轻微虚化 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 520, pointerEvents: 'none',
        backdropFilter: 'blur(9px)', WebkitBackdropFilter: 'blur(9px)',
        WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 30%, transparent 100%)', maskImage: 'linear-gradient(180deg, #000 0%, #000 30%, transparent 100%)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 260, pointerEvents: 'none',
        backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
        WebkitMaskImage: 'linear-gradient(0deg, #000 0%, transparent 100%)', maskImage: 'linear-gradient(0deg, #000 0%, transparent 100%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(180deg, ${alpha(L.bg[0], 0.85)} 0%, ${alpha(L.bg[0], 0.45)} 16%, ${alpha(L.bg[0], 0)} 40%)`,
      }} />
      {/* 低角度暖阳：左上一团光晕 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'soft-light',
        background: `radial-gradient(ellipse 60% 55% at 12% 6%, ${alpha('#ffd9a8', 0.55 + 0.08 * Math.sin(frame / 30))} 0%, ${alpha('#ffd9a8', 0)} 70%)`,
      }} />
      <Vignette strength={0.22} inner={0.45} color={L.shadow} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
