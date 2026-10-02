// morph-from-primitive｜原型变形
// 正圆呼吸一拍(anticipation) → path d 逐数值插值变形成 520×300 圆角矩形卡片轮廓
// → 卡片内容淡入。全部帧驱动、确定性。
// 质感层（改版）：柔光底 + 颗粒替代平灰底；描边改 2.5px 近黑圆头描边；呼吸拍改为
// 吸气缓、呼气稍快的不对称曲线；变形尾段带 ~2% 的轻微过冲收住（落定"扣住"而非停住）；
// 轮廓落定后才"实体化"——白色卡面 + 两层软阴影随内容一起起来，描边退成发丝线；
// 灰条内容换成出版级卡片内容（标题 / 说明 / 进度 / 头像组），逐行 2f 错峰上浮淡入。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, FONT, bezier } from '../../_fixtures/Polish';

export const MORPH_FROM_PRIMITIVE_DURATION = 140; // 0–10 静置｜10–30 呼吸｜30–54 变形｜56–70 内容｜70–140 静止

const CX = 960;
const CY = 540;
const R = 130;
const RECT_W = 520;
const RECT_H = 300;
const RECT_R = 20;

// ---- 同构 path：M + 8 段 cubic（4 直边段 + 4 圆角段），圆与圆角矩形共用锚点拓扑 ----
// 圆角矩形锚点（中心坐标系，顺时针，从右边上端点起）：
// A0(hw,-ihh) 右边上 → A1(hw,ihh) 右边下 → A2(iw,hh) 底边右 → A3(-iw,hh) 底边左
// → A4(-hw,ihh) 左边下 → A5(-hw,-ihh) 左边上 → A6(-iw,-hh) 顶边左 → A7(iw,-hh) 顶边右 → A0
const hw = RECT_W / 2; // 260
const hh = RECT_H / 2; // 150
const iw = hw - RECT_R; // 240
const ihh = hh - RECT_R; // 130
const KAPPA = 0.5522847498;

type Seg = [number, number, number, number, number, number]; // c1x c1y c2x c2y x y
type Shape = { start: [number, number]; segs: Seg[] };

const line = (from: [number, number], to: [number, number]): Seg => [
  from[0] + (to[0] - from[0]) / 3,
  from[1] + (to[1] - from[1]) / 3,
  from[0] + ((to[0] - from[0]) * 2) / 3,
  from[1] + ((to[1] - from[1]) * 2) / 3,
  to[0],
  to[1],
];
// 90° 圆角弧 from → to（弧心 c）：c1 = from + k·(to−c)，c2 = to + k·(from−c)
const corner = (
  from: [number, number],
  to: [number, number],
  c: [number, number]
): Seg => [
  from[0] + KAPPA * (to[0] - c[0]),
  from[1] + KAPPA * (to[1] - c[1]),
  to[0] + KAPPA * (from[0] - c[0]),
  to[1] + KAPPA * (from[1] - c[1]),
  to[0],
  to[1],
];

const rectAnchors: [number, number][] = [
  [hw, -ihh],
  [hw, ihh],
  [iw, hh],
  [-iw, hh],
  [-hw, ihh],
  [-hw, -ihh],
  [-iw, -hh],
  [iw, -hh],
];
const cornerCenters: [number, number][] = [
  [iw, ihh], // A1→A2 右下
  [-iw, ihh], // A3→A4 左下
  [-iw, -ihh], // A5→A6 左上
  [iw, -ihh], // A7→A0 右上
];

const rectShape: Shape = {
  start: rectAnchors[0],
  segs: [
    line(rectAnchors[0], rectAnchors[1]),
    corner(rectAnchors[1], rectAnchors[2], cornerCenters[0]),
    line(rectAnchors[2], rectAnchors[3]),
    corner(rectAnchors[3], rectAnchors[4], cornerCenters[1]),
    line(rectAnchors[4], rectAnchors[5]),
    corner(rectAnchors[5], rectAnchors[6], cornerCenters[2]),
    line(rectAnchors[6], rectAnchors[7]),
    corner(rectAnchors[7], rectAnchors[0], cornerCenters[3]),
  ],
};

// 圆：锚点取矩形锚点的同方位角，段间用精确弧公式 k = 4/3·tan(Δθ/4)
const angles = rectAnchors.map(([x, y]) => Math.atan2(y, x));
const circAnchors: [number, number][] = angles.map((a) => [
  R * Math.cos(a),
  R * Math.sin(a),
]);
const arcSeg = (i: number): Seg => {
  const a1 = angles[i];
  let a2 = angles[(i + 1) % 8];
  if (a2 <= a1) a2 += Math.PI * 2;
  const k = (4 / 3) * Math.tan((a2 - a1) / 4);
  const p1 = circAnchors[i];
  const p2 = circAnchors[(i + 1) % 8];
  return [
    p1[0] - k * R * Math.sin(a1),
    p1[1] + k * R * Math.cos(a1),
    p2[0] + k * R * Math.sin(a2 % (Math.PI * 2)),
    p2[1] - k * R * Math.cos(a2 % (Math.PI * 2)),
    p2[0],
    p2[1],
  ];
};
const circShape: Shape = {
  start: circAnchors[0],
  segs: [0, 1, 2, 3, 4, 5, 6, 7].map(arcSeg),
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const f2 = (n: number) => n.toFixed(2);

const morphPath = (t: number): string => {
  const sx = lerp(circShape.start[0], rectShape.start[0], t);
  const sy = lerp(circShape.start[1], rectShape.start[1], t);
  let d = `M ${f2(CX + sx)} ${f2(CY + sy)}`;
  for (let i = 0; i < 8; i++) {
    const a = circShape.segs[i];
    const b = rectShape.segs[i];
    const v = a.map((n, j) => lerp(n, b[j], t));
    d += ` C ${f2(CX + v[0])} ${f2(CY + v[1])} ${f2(CX + v[2])} ${f2(
      CY + v[3]
    )} ${f2(CX + v[4])} ${f2(CY + v[5])}`;
  }
  return d + ' Z';
};

// ---- 时间轴（30fps，总 140f）----
// 0–10 静置圆 | 10–30 呼吸一拍 scale 1→1.12→1 | 30–54 变形 24f
// | 54–66 卡面实体化 | 56–70 内容逐行淡入（2f 错峰，各 12f）| 70–140 真静止
const INHALE = bezier(0.33, 0, 0.2, 1); // 吸气：缓缓鼓起，顶点软
const EXHALE = bezier(0.5, 0, 0.3, 1); // 呼气：回落更干脆，直接接变形
const MORPH = bezier(0.62, 0, 0.28, 1.06); // 起步慢、中段生长、尾段 ~2% 过冲回收
const STAGGER = 2;

const AVATARS = [
  { ini: 'MK', bg: '#e6e3dc' },
  { ini: 'JS', bg: '#dfe2ea' },
  { ini: 'AL', bg: '#e9e4ea' },
];

export const MorphFromPrimitive: React.FC = () => {
  const frame = useCurrentFrame();

  const breath =
    frame < 20
      ? 1 + 0.12 * INHALE(Math.min(1, Math.max(0, (frame - 10) / 10)))
      : 1.12 - 0.12 * EXHALE(Math.min(1, Math.max(0, (frame - 20) / 10)));

  const t = MORPH(Math.min(1, Math.max(0, (frame - 30) / 24)));

  // 轮廓落定后实体化：卡面填白、阴影抬起、描边退为发丝线
  const solid = interpolate(frame, [54, 66], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const row = (k: number) =>
    interpolate(frame, [56 + k * STAGGER, 68 + k * STAGGER], [0, 1], {
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  const rowStyle = (k: number): React.CSSProperties => ({
    opacity: row(k),
    transform: `translateY(${((1 - row(k)) * 8).toFixed(2)}px)`,
  });

  const d = morphPath(t);
  // 描边：近黑 2.5px → 实体化后退成 1px 发丝线色
  const strokeA = 0.92 - 0.8 * solid;
  const strokeW = 2.5 - 1.5 * solid;

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.34 }} />
      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        <g transform={`translate(${CX} ${CY}) scale(${breath.toFixed(5)}) translate(${-CX} ${-CY})`}>
          {/* 卡面：只在轮廓落定后填起，阴影随实体化抬高 */}
          {solid > 0 && (
            <path
              d={d}
              fill="#ffffff"
              opacity={solid}
              style={{ filter: `drop-shadow(0 ${(1 + solid * 1.5).toFixed(2)}px ${(2 + solid * 3).toFixed(2)}px rgba(16,18,26,${(0.08 * solid).toFixed(3)})) drop-shadow(0 ${(solid * 22).toFixed(2)}px ${(solid * 34).toFixed(2)}px rgba(16,18,26,${(0.14 * solid).toFixed(3)}))` }}
            />
          )}
          <path
            d={d}
            fill="none"
            stroke={`rgba(23,24,28,${strokeA.toFixed(3)})`}
            strokeWidth={strokeW}
            strokeLinejoin="round"
          />
        </g>
      </svg>
      {/* 卡片内容：变形完成后逐行淡入 */}
      <div
        style={{
          position: 'absolute',
          left: CX - RECT_W / 2,
          top: CY - RECT_H / 2,
          width: RECT_W,
          height: RECT_H,
          boxSizing: 'border-box',
          padding: '32px 36px 30px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: FONT.sans,
          color: G.ink1,
        }}
      >
        <div style={{ ...rowStyle(0), display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 10, background: `linear-gradient(160deg, #7a81e6, ${G.accent})`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(91,99,211,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width={16} height={16} viewBox="0 0 16 16">
              <path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Q4 Launch plan</div>
            <div style={{ fontSize: 14, color: G.ink3, marginTop: 4, letterSpacing: '0' }}>Product · Updated just now</div>
          </div>
          <div
            style={{
              marginLeft: 'auto', alignSelf: 'flex-start', fontSize: 13, fontWeight: 600, color: G.accent,
              background: G.accentSoft, borderRadius: 999, padding: '5px 11px',
            }}
          >
            On track
          </div>
        </div>
        <div style={{ ...rowStyle(1), fontSize: 16, lineHeight: 1.5, color: G.ink2, marginTop: 22 }}>
          Beta opens to 2,400 waitlist teams on Nov 4. Pricing page and onboarding emails are in review.
        </div>
        <div style={{ ...rowStyle(2), marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: G.ink2, fontWeight: 550 }}>
            <span>Milestones</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: G.ink1 }}>7 / 10</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: G.fill2, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: '70%', height: '100%', borderRadius: 3, background: `linear-gradient(90deg, #8a90ea, ${G.accent})` }} />
          </div>
        </div>
        <div style={{ ...rowStyle(3), display: 'flex', alignItems: 'center', marginTop: 20 }}>
          {AVATARS.map((a, i) => (
            <div
              key={a.ini}
              style={{
                width: 32, height: 32, borderRadius: 16, background: a.bg, marginLeft: i ? -8 : 0, position: 'relative', zIndex: AVATARS.length - i,
                boxShadow: '0 0 0 2.5px #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11.5, fontWeight: 650, color: '#4a4c53', letterSpacing: '0.02em',
              }}
            >
              {a.ini}
            </div>
          ))}
          <div style={{ fontSize: 13.5, color: G.ink3, marginLeft: 12 }}>+4 collaborators</div>
          <div style={{ marginLeft: 'auto', fontSize: 13.5, color: G.ink2, fontVariantNumeric: 'tabular-nums' }}>Due Nov 4</div>
        </div>
      </div>
    </div>
  );
};
