// cursor-performance-punch-in —— 光标拟人表演 + 点击跟随推近（有去有回）
//
// 第二轮重设计（暖沙 · 旅宿预订「Ombra」）：
// - look = sand（米色 · 赤陶）。主体是一块为镜头设计的预订卡（1500×800，占画宽 78%）：
//   左半是程序绘制的辛特拉山丘插画（层叠山脊 + 夕阳 + 柏树 + 一座小别墅，大气透视逐层降对比），
//   右半是 84px 标题「Quinta do Vale」、130px 价格「€486」与一颗 560×112 的深墨色主按钮「Reserve」。
//   暖沙亮场里深墨按钮是唯一的深色块——悬停提亮在深底上才看得见（卡片判例）。
// - 光标是 76px macOS 式黑芯白边指针：三次贝塞尔从左下画外滑入，末端沿切线甩过按钮再拐回（甩腕），
//   按横向速度前倾 ≤9° + 方向性运动模糊；点击时随按钮下沉。
// - 点击：按钮下陷 + 一次裁进圆角的赤陶按压光 + 赤陶细环涟漪（扩散 out-cubic / 消散线性解耦），
//   相机以点击点为原点 14f expo-out 推近 1→1.42；停 24f 期间按钮讲完因果（Holding your dates… 转圈 →
//   Reserved ✓ 面色转赤陶）；再 20f 对称 in-out 退回，退到位时底部一枚确认条弹簧升起，把结果交代完。
//
// 时间表（30fps，共 150f）：
//   0–16    预备：舞台光、卡片由 0.97 浮起落定，右栏文字逐行升起（4–26f）
//   10–42   光标贝塞尔滑入（f36 过冲峰值 1.05，36–42 拐回落定）
//   42–48   悬停：按钮提亮 + 放大 4%
//   50      点击；50–64 推近 1→1.42（expo-out）
//   64–88   停 24f：Holding your dates…（54f 起）→ Reserved ✓（80f）
//   88–108  缓退回 1.0（对称 in-out）
//   104–122 确认条弹簧升起；122–150 hold（极缓 1.5% 推进让画面活着），尾帧是完整海报
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { EASE, FONT, SpeedBlur, mix, ramp, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type } from '../../_fixtures/Look';

const L = LOOKS.sand;

const T = {
  cursorIn: 10,
  cursorOver: 36, // 过冲峰值
  cursorInEnd: 42,
  click: 50,
  punchEnd: 64,
  busy: 54,
  done: 80,
  holdEnd: 88,
  backEnd: 108,
  toast: 104,
  total: 150,
};
export const CURSOR_PERFORMANCE_PUNCH_IN_DURATION = T.total;

// 卡片几何（画布坐标）
const CARD = { x: 210, y: 92, w: 1500, h: 790 };
const ART = { x: CARD.x + 28, y: CARD.y + 28, w: 700, h: CARD.h - 56 };
const COL_X = ART.x + ART.w + 84; // 右栏左缘
const BTN = { x: COL_X, y: CARD.y + 590, w: 560, h: 112 };
const CLICK = { x: BTN.x + 430, y: BTN.y + 62 };

// 光标贝塞尔：从左下画外起步（最快段在画外），先沉后扬，有性格
const P0 = { x: 120, y: 1240 };
const P1 = { x: 700, y: 1180 };
const P2 = { x: 1500, y: 1060 };
const P3 = CLICK;
const bez = (t: number) => {
  const u = 1 - t;
  return {
    x: u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x,
    y: u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y,
  };
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
// 路径参数：f36 过冲到 1.05（沿切线甩过按钮），36–42 拐回 1.0
const pathT = (f: number) =>
  f < T.cursorOver
    ? 1.05 * outCubic(clamp01((f - T.cursorIn) / (T.cursorOver - T.cursorIn)))
    : mix(1.05, 1, EASE.swift(clamp01((f - T.cursorOver) / (T.cursorInEnd - T.cursorOver))));

// 相机：点击推近（expo-out）→ 停 → 对称退回；全程叠一层极缓推进 1→1.015
const zoomAt = (f: number) =>
  f < T.holdEnd
    ? mix(1, 1.42, ramp(f, T.click, T.punchEnd - T.click, EASE.snappy))
    : mix(1.42, 1, ramp(f, T.holdEnd, T.backEnd - T.holdEnd, EASE.smooth));

// —— 山丘插画（确定性路径）——
const ridge = (w: number, h: number, base: number, amp: number, f1: number, f2: number, ph: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const x = (i / 48) * w;
    const y = base - amp * (0.62 * Math.sin((x / w) * Math.PI * f1 + ph) + 0.38 * Math.sin((x / w) * Math.PI * f2 + ph * 1.7));
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
};

const Landscape: React.FC<{ frame: number }> = ({ frame }) => {
  const { w, h } = ART;
  // 插画内部极缓视差：远景几乎不动，近景随时间轻移（像在窗前看风景）
  const drift = (k: number) => (frame * 0.06 * k).toFixed(2);
  const layers = [
    { base: h * 0.52, amp: 34, f1: 2.2, f2: 5.1, ph: 0.4, c: '#d7b9a0', k: 0.2 },
    { base: h * 0.6, amp: 46, f1: 1.6, f2: 4.3, ph: 2.1, c: '#b99a7c', k: 0.5 },
    { base: h * 0.7, amp: 52, f1: 1.3, f2: 3.7, ph: 4.0, c: '#8f7a5c', k: 0.9 },
    { base: h * 0.82, amp: 44, f1: 1.1, f2: 3.1, ph: 1.2, c: '#5f5a3f', k: 1.4 },
    { base: h * 0.94, amp: 30, f1: 0.9, f2: 2.6, ph: 3.3, c: '#3b3a28', k: 2.0 },
  ];
  // 柏树：落在第 4 层山脊附近的一排细长椭圆
  const cypress = [0.12, 0.17, 0.205, 0.66, 0.7, 0.735, 0.77];
  const yOn = (x: number, l: (typeof layers)[number]) =>
    l.base - l.amp * (0.62 * Math.sin((x / w) * Math.PI * l.f1 + l.ph) + 0.38 * Math.sin((x / w) * Math.PI * l.f2 + l.ph * 1.7));
  const villaX = w * 0.43;
  const villaY = yOn(villaX, layers[2]);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="omb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2a07c" />
          <stop offset="0.45" stopColor="#f3d2b2" />
          <stop offset="0.75" stopColor="#f6e2cc" />
        </linearGradient>
        <radialGradient id="omb-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3e0" />
          <stop offset="0.55" stopColor="#ffe2c2" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd9b5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="omb-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e2cc" stopOpacity="0" />
          <stop offset="0.45" stopColor="#f6e2cc" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f6e2cc" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="url(#omb-sky)" />
      <circle cx={w * 0.64} cy={h * 0.4} r={190} fill="url(#omb-sun)" />
      <circle cx={w * 0.64} cy={h * 0.4} r={58} fill="#fff4e4" opacity={0.95} />
      {/* 远处三只飞鸟：随时间极缓滑行，给静止插画一点生命 */}
      {[[0.28, 0.24, 1], [0.34, 0.2, 0.8], [0.39, 0.26, 0.65]].map(([bx, by, k], i) => (
        <path key={i}
          d={`M${(bx * w + frame * 0.35).toFixed(1)} ${(by * h).toFixed(1)} q ${9 * k} ${-7 * k} ${18 * k} 0 q ${9 * k} ${-7 * k} ${18 * k} 0`}
          stroke="#8a5a40" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.55} />
      ))}
      {layers.map((l, i) => (
        <g key={i} transform={`translate(${drift(-l.k)},0)`}>
          <path d={ridge(w + 40, h, l.base, l.amp, l.f1, l.f2, l.ph)} fill={l.c} transform="translate(-20,0)" />
          {/* 每层山脊下方一道雾带：大气透视 */}
          {i < 4 && <rect x={-20} y={l.base - 10} width={w + 40} height={90} fill="url(#omb-haze)" opacity={0.45} />}
          {i === 2 && (
            <g transform={`translate(${villaX - 30},${villaY - 40})`}>
              <rect x={0} y={14} width={60} height={30} fill="#f4e6d3" />
              <path d="M-6 16 L30 -4 L66 16 Z" fill="#b5532f" />
              <rect x={10} y={24} width={9} height={11} fill="#8f7a5c" />
              <rect x={40} y={24} width={9} height={11} fill="#8f7a5c" />
            </g>
          )}
          {i === 3 && cypress.map((cx, j) => {
            const x = cx * w;
            const tall = 70 + ((j * 37) % 5) * 12;
            return <ellipse key={j} cx={x} cy={yOn(x, l) - tall / 2 + 10} rx={11 + (j % 2) * 2} ry={tall / 2} fill="#4a4a30" />;
          })}
        </g>
      ))}
    </svg>
  );
};

// macOS 式指针：黑芯 + 白描边 + 两层投影，尖端在 (x, y)
const Cursor: React.FC<{ x: number; y: number; rot: number }> = ({ x, y, rot }) => (
  <svg
    width={76}
    height={76}
    viewBox="0 0 28 28"
    style={{
      position: 'absolute', left: x - 5.4, top: y - 2.7, transformOrigin: '5.4px 2.7px',
      transform: `rotate(${rot.toFixed(2)}deg)`,
      filter: `drop-shadow(0 1.5px 1.5px ${alpha(L.shadow, 0.35)}) drop-shadow(0 10px 14px ${alpha(L.shadow, 0.28)})`,
    }}
  >
    <path d="M2 1 L2 23 L8 17.5 L11.5 25 L15.5 23.2 L12 15.8 L20 15 Z" fill="#1a140e" stroke="#ffffff" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

const Glyph: React.FC<{ d: string; size: number; color: string; w?: number }> = ({ d, size, color, w = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
    <path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICON_ARROW = 'M5 12h13M13 6l6 6-6 6';
const ICON_CHECK = 'M5 12.5l4.5 4.5L19 7.5';

export const CursorPerformancePunchIn: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 卡片入场 ——
  const cardIn = ramp(frame, 0, 18, EASE.out);
  const rise = (i: number) => ramp(frame, 4 + i * 4, 18, EASE.snappy);

  // —— 光标 ——
  // 点击讲完后手离开：退镜途中光标向右下让开 150/16px，让「Reserved」露出来（人点完按钮会挪开鼠标）
  const curAt = (f: number) => {
    const p = bez(pathT(f));
    const away = ramp(f, T.holdEnd + 4, 22, EASE.swift);
    return { x: p.x + 150 * away, y: p.y + 16 * away };
  };
  const cur = curAt(frame);
  const vx = velocity((f) => curAt(f).x, frame);
  const vy = velocity((f) => curAt(f).y, frame);
  const rot = Math.max(-9, Math.min(9, vx * 0.05));
  const dip = interpolate(frame, [T.click, T.click + 2, T.click + 7], [0, 4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const curOpacity = frame < T.cursorIn ? 0 : 1;

  // —— 悬停 / 按下 ——
  const lift = ramp(frame, T.cursorInEnd, 6, EASE.out);
  const press =
    frame < T.click + 2 ? mix(1, 0.94, ramp(frame, T.click, 2, EASE.swift)) : mix(0.94, 1, ramp(frame, T.click + 2, 6, EASE.overshoot));
  const hoverScale = 1 + 0.04 * lift;
  const pressGlow = interpolate(frame, [T.click, T.click + 2, T.click + 16], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // —— 相机 ——
  const breathe = 1 + 0.015 * ramp(frame, 0, T.total, EASE.smooth);
  const zoom = zoomAt(frame);

  // —— 涟漪：扩散 out-cubic 24f（直径 80→520），消散线性 28f，解耦 ——
  const rippleOn = frame >= T.click && frame < T.click + 28;
  const rippleD = mix(80, 520, ramp(frame, T.click, 24, outCubic));
  const rippleOp = interpolate(frame, [T.click, T.click + 28], [0.85, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rippleBw = interpolate(frame, [T.click, T.click + 24], [6, 1.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // —— 按钮状态 ——
  const sIdle = 1 - ramp(frame, T.busy - 2, 6, EASE.exit);
  const sBusy = ramp(frame, T.busy + 2, 8, EASE.out) * (1 - ramp(frame, T.done - 4, 5, EASE.exit));
  const sDone = ramp(frame, T.done + 1, 8, EASE.snappy);
  const doneBump = frame >= T.done + 2 ? 1 + 0.035 * Math.sin(clamp01((frame - T.done - 2) / 10) * Math.PI) : 1;
  const spin = (frame - T.busy) * 14;

  // 按钮面：深墨 #221a12 → 悬停 #4a3a2c → 完成态赤陶
  const mixRGB = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(mix(v, b[i], t)));
  const idleRGB = mixRGB([34, 26, 18], [74, 58, 44], lift);
  const face = mixRGB(idleRGB, [196, 85, 45], sDone);
  const faceCss = `rgb(${face.join(',')})`;

  // —— 确认条 ——
  const toast = frame < T.toast ? 0 : springAt(frame, T.toast, { damping: 17, stiffness: 150 });
  // 价格行在完成后让位：小字变成 "Confirmed for Sep 14"
  const conf = ramp(frame, T.done + 6, 12, EASE.out);

  const label = (o: number, dy: number, node: React.ReactNode) =>
    o <= 0.001 ? null : (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
        opacity: o, transform: `translateY(${dy.toFixed(2)}px)`,
      }}>{node}</div>
    );

  const line = (i: number, node: React.ReactNode, style: React.CSSProperties = {}) => {
    const p = rise(i);
    return (
      <div style={{ opacity: p, transform: `translateY(${((1 - p) * 26).toFixed(2)}px)`, ...style }}>{node}</div>
    );
  };

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.28, y: 0.04 }} fill={{ x: 0.9, y: 0.95 }} />

      {/* 相机层：点击点为原点推近；外层再叠一层以画面中心为原点的极缓推进 */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${breathe.toFixed(4)})`, transformOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom.toFixed(4)})`, transformOrigin: `${CLICK.x}px ${CLICK.y}px` }}>
          {/* 卡片落地影（独立层，随卡片浮起变化） */}
          <div style={{
            position: 'absolute', left: CARD.x + 60, top: CARD.y + CARD.h - 40, width: CARD.w - 120, height: 80,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.shadow, 0.28)} 0%, ${alpha(L.shadow, 0)} 70%)`,
            filter: 'blur(18px)', opacity: cardIn,
          }} />
          {/* 预订卡 */}
          <div style={{
            position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: 40,
            background: `linear-gradient(180deg, #fdf9f3 0%, ${L.surface} 100%)`,
            border: `1px solid ${L.line}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 4px ${alpha(L.shadow, 0.06)}, 0 30px 70px -24px ${alpha(L.shadow, 0.32)}`,
            opacity: cardIn, transform: `translateY(${((1 - cardIn) * 30).toFixed(2)}px) scale(${mix(0.97, 1, cardIn).toFixed(4)})`,
            transformOrigin: '50% 60%', overflow: 'hidden',
          }}>
            {/* 插画 */}
            <div style={{
              position: 'absolute', left: ART.x - CARD.x, top: ART.y - CARD.y, width: ART.w, height: ART.h, borderRadius: 26, overflow: 'hidden',
              boxShadow: `inset 0 0 0 1px ${alpha(L.shadow, 0.08)}`,
            }}>
              <Landscape frame={frame} />
              {/* 插画角标：评分胶囊 */}
              <div style={{
                position: 'absolute', left: 30, top: 30, padding: '12px 22px', borderRadius: 999,
                background: 'rgba(253,249,243,0.88)', display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: `0 6px 18px -8px ${alpha(L.shadow, 0.4)}`,
                ...type(28, 650), color: L.ink,
              }}>
                <svg width={24} height={24} viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill={L.accent} /></svg>
                4.97 · Guest favourite
              </div>
            </div>

            {/* 右栏 */}
            <div style={{ position: 'absolute', left: COL_X - CARD.x, top: 70, width: CARD.x + CARD.w - COL_X - 70, fontFamily: FONT.sans, color: L.ink }}>
              {line(0, <div style={{ ...type(26, 700, { caps: true }), letterSpacing: '0.16em', color: L.accent }}>Sintra · Portugal</div>)}
              {line(1, <div style={{ ...type(92, 760), marginTop: 22, letterSpacing: '-0.045em' }}>Quinta do Vale</div>)}
              {line(2, <div style={{ ...type(36, 450), color: L.ink2, marginTop: 22 }}>3 nights · Sep 14 – 17 · 2 guests</div>)}
              {line(3, <div style={{ height: 1, background: L.line, marginTop: 52, marginBottom: 40 }} />)}
              {line(3, (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
                  <span style={{ ...type(132, 760), letterSpacing: '-0.05em' }}>€486</span>
                  <span style={{ position: 'relative', ...type(34, 500), color: L.ink2 }}>
                    <span style={{ opacity: 1 - conf }}>total · taxes in</span>
                    <span style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', color: L.accent, opacity: conf, transform: `translateY(${((1 - conf) * 12).toFixed(2)}px)` }}>
                      due at check-in
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* 主按钮 Reserve */}
            <div style={{
              position: 'absolute', left: BTN.x - CARD.x, top: BTN.y - CARD.y, width: BTN.w, height: BTN.h,
              borderRadius: BTN.h / 2, overflow: 'hidden',
              background: `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 55%), ${faceCss}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,${0.18 + 0.08 * lift}), 0 ${2 + 3 * lift}px ${4 + 6 * lift}px ${alpha(L.shadow, 0.2)}, ` +
                `0 ${14 + 10 * lift}px ${30 + 16 * lift}px -12px ${alpha(sDone > 0.5 ? L.accent : L.shadow, 0.45 + 0.1 * lift)}`,
              transform: `scale(${(hoverScale * press * doneBump).toFixed(4)})`,
              opacity: rise(4), fontFamily: FONT.sans, color: '#fff8f0',
            }}>
              {/* 按压光：点击点一团赤陶柔光，只此一次，裁在圆角里 */}
              <div style={{
                position: 'absolute', inset: 0, opacity: pressGlow,
                background: `radial-gradient(circle at ${CLICK.x - BTN.x}px ${CLICK.y - BTN.y}px, ${alpha('#ff9a6e', 0.6)} 0%, ${alpha('#ff9a6e', 0)} 64%)`,
              }} />
              {label(sIdle, -10 * (1 - sIdle), <>
                <span style={{ ...type(42, 650), letterSpacing: '-0.02em' }}>Reserve</span>
                <Glyph d={ICON_ARROW} size={36} color="#fff8f0" w={2.4} />
              </>)}
              {label(sBusy, 10 * (1 - ramp(frame, T.busy + 2, 8, EASE.out)) - 10 * ramp(frame, T.done - 4, 5, EASE.exit), <>
                <svg width={34} height={34} viewBox="0 0 20 20" style={{ display: 'block', transform: `rotate(${spin}deg)` }}>
                  <circle cx={10} cy={10} r={7.5} fill="none" stroke="rgba(255,248,240,0.25)" strokeWidth={2.2} />
                  <path d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5" fill="none" stroke="#fff8f0" strokeWidth={2.2} strokeLinecap="round" />
                </svg>
                <span style={{ ...type(38, 560), color: 'rgba(255,248,240,0.9)' }}>Holding your dates…</span>
              </>)}
              {label(sDone, 10 * (1 - sDone), <>
                <Glyph d={ICON_CHECK} size={38} color="#fff8f0" w={2.8} />
                <span style={{ ...type(42, 680), letterSpacing: '-0.02em' }}>Reserved</span>
              </>)}
            </div>
            {/* 按钮下方小字 */}
            <div style={{
              position: 'absolute', left: BTN.x - CARD.x, top: BTN.y - CARD.y + BTN.h + 22, width: BTN.w, textAlign: 'center',
              ...type(28, 450), color: L.ink3, opacity: rise(5),
            }}>
              Free cancellation until Sep 7
            </div>
          </div>

          {/* 涟漪：赤陶细环，压在按钮之上，圆心锁点击点 */}
          {rippleOn && (
            <div style={{
              position: 'absolute', left: CLICK.x - rippleD / 2, top: CLICK.y - rippleD / 2, width: rippleD, height: rippleD,
              borderRadius: '50%', boxSizing: 'border-box', border: `${rippleBw}px solid ${L.accent}`,
              background: `radial-gradient(circle, ${alpha(L.accent, 0)} 55%, ${alpha(L.accent, 0.12)} 100%)`, opacity: rippleOp,
            }} />
          )}

          {/* 光标与按钮同在相机层，推近不漂移 */}
          <div style={{ position: 'absolute', inset: 0, opacity: curOpacity }}>
            <SpeedBlur vx={vx} vy={vy} amount={0.08} max={10}>
              <Cursor x={cur.x} y={cur.y + dip} rot={rot} />
            </SpeedBlur>
          </div>
        </div>
      </div>

      {/* 确认条：退镜到位时从底部弹簧升起（在相机层外，不随推近缩放） */}
      {toast > 0.001 && (
        <div style={{
          position: 'absolute', left: 960 - 470, top: 924, width: 940, height: 78,
          transform: `translateY(${((1 - toast) * 120).toFixed(2)}px)`, opacity: clamp01(toast * 1.6),
          borderRadius: 39, background: L.ink, display: 'flex', alignItems: 'center', gap: 18, padding: '0 34px', boxSizing: 'border-box',
          boxShadow: `0 18px 40px -16px ${alpha(L.shadow, 0.6)}`, fontFamily: FONT.sans,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: L.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Glyph d={ICON_CHECK} size={26} color="#fff8f0" w={3} />
          </div>
          <span style={{ ...type(32, 620), color: '#fbf6ef', whiteSpace: 'nowrap' }}>Sep 14 – 17 is yours.</span>
          <span style={{ ...type(30, 450), color: alpha('#fbf6ef', 0.6), whiteSpace: 'nowrap', marginLeft: 'auto' }}>Confirmation OMB-2741</span>
        </div>
      )}
    </div>
  );
};
