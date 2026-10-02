// cursor-performance-punch-in —— 光标拟人表演 + 点击跟随推近
// 放大光标沿贝塞尔曲线从左下画外滑入（末端甩腕过冲）→ 悬停按钮微亮响应 →
// 点击：按钮下陷 + 涟漪扩散 + 整画布以点击点为原点推近 1→1.4 → 停 → 缓退回。
// 推近"有去有回"区别 crash-zoom。收尾真静止 ≥35f。
// 质感升级：Deploy 从"浮在 Revenue 卡上、盖住 +6.3% 的灰块"改为 Deploys 卡头部里的真实主按钮
// （嵌在 12w chip 左侧槽位，推近后落在画面中右偏下的舒服位置）；macOS 式黑芯白边光标 + 速度倾斜 + 方向性运动模糊；涟漪换成强调色细环 +
// 按钮内一次裁进圆角的按压光；点击后按钮讲完因果：Deploying…（转圈）→ Deployed ✓，再静止收尾。
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';
import { EASE, FONT, SpeedBlur, mix, ramp, velocity } from '../../_fixtures/Polish';

// 时间轴（30fps，共 150f）
const T = {
  cursorInEnd: 30, // 0–30f 光标贝塞尔滑入（f24 过冲峰值，f24–30 拐回落定）
  click: 40,       // 30–40f 悬停响应 10f；f40 点击
  punchEnd: 52,    // 40–52f 推近 1→1.4（强 ease-out）
  holdEnd: 72,     // 52–72f 停 20f
  backEnd: 90,     // 72–90f 缓退回 1.0（对称 in-out）
  done: 76,        // 76–84f 按钮状态 Deploying… → Deployed ✓（退镜途中落定）
  total: 150,      // 90–150f 真静止 60f
};
export const CURSOR_PERFORMANCE_PUNCH_IN_DURATION = T.total;

// 按钮与点击点（画布坐标）：Deploys 卡（x808–1332, y590）头部行内、12w chip 左侧 14px 的操作槽位
const BTN = { x: 1084, y: 603, w: 152, h: 42 };
const CLICK = { x: 1166, y: 628 };

// 光标贝塞尔路径：从左下画外滑入（最快的起步段在画外），先沉后扬，曲线有性格
const P0 = { x: -60, y: 1180 };
const P1 = { x: 620, y: 1150 };
const P2 = { x: 1460, y: 900 };
const P3 = { x: CLICK.x, y: CLICK.y };
const bez = (t: number) => {
  const u = 1 - t;
  return {
    x: u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x,
    y: u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y,
  };
};
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const inOutQuad = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
// 路径参数 t(frame)：f24 过冲到 1.05（沿切线甩过按钮），f24–30 拐回 1.0
const pathT = (f: number) =>
  f < 24 ? 1.05 * outCubic(clamp01(f / 24)) : mix(1.05, 1, inOutQuad(clamp01((f - 24) / (T.cursorInEnd - 24))));

// macOS 式指针：黑芯 + 白描边 + 两层投影（近实远虚），尖端在 (x, y)
const Cursor: React.FC<{ x: number; y: number; rot: number }> = ({ x, y, rot }) => (
  <svg
    width={56}
    height={56}
    viewBox="0 0 28 28"
    style={{
      position: 'absolute',
      left: x - 4,
      top: y - 2,
      transformOrigin: '4px 2px',
      transform: `rotate(${rot.toFixed(2)}deg)`,
      filter: 'drop-shadow(0 1px 1px rgba(10,12,18,0.35)) drop-shadow(0 6px 10px rgba(10,12,18,0.28))',
    }}
  >
    <path
      d="M2 1 L2 23 L8 17.5 L11.5 25 L15.5 23.2 L12 15.8 L20 15 Z"
      fill="#15161a"
      stroke="#ffffff"
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
  </svg>
);

// 状态图标（16 网格线性图标，1.6 描边）
const Glyph: React.FC<{ d: string[]; size: number; color: string; style?: React.CSSProperties }> = ({ d, size, color, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'block', ...style }}>
    {d.map((p, i) => (
      <path key={i} d={p} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </svg>
);
const ICON_UP = ['M8 3.25 13 12.5H3z']; // 三角（部署）
const ICON_CHECK = ['m3.5 8.4 2.9 2.85L12.5 5'];

export const CursorPerformancePunchIn: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 光标：路径 + 速度（喂运动模糊与倾斜）——
  const curAt = (f: number) => bez(pathT(f));
  const cur = curAt(frame);
  const vx = velocity((f) => curAt(f).x, frame);
  const vy = velocity((f) => curAt(f).y, frame);
  // 甩腕倾斜：横向速度越大越往前倾（≤9°），停下即回正
  const rot = Math.max(-9, Math.min(9, vx * 0.06));
  // 点击帧光标随按钮微沉 3px（f40–42 下，f42–46 回）
  const dip = interpolate(frame, [T.click, T.click + 2, T.click + 6], [0, 3, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // —— 悬停响应：f30–34 按钮提亮（深底提亮可见）+ 微放大 ——
  const lift = ramp(frame, T.cursorInEnd, 4, EASE.out);
  const hoverScale = 1 + 0.05 * lift;

  // —— 点击下陷：f40–42 scale→0.94，f42–46 弹回（带一点过冲收住）——
  const press =
    frame < T.click + 2
      ? mix(1, 0.94, ramp(frame, T.click, 2, EASE.swift))
      : mix(0.94, 1, ramp(frame, T.click + 2, 4, EASE.overshoot));
  const pressGlow = interpolate(frame, [T.click, T.click + 2, T.click + 14], [0, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // —— 推近有去有回：40–52f 1→1.4（强 ease-out）；72–90f 1.4→1（对称 in-out）——
  const zoom =
    frame < T.holdEnd
      ? mix(1, 1.4, ramp(frame, T.click, T.punchEnd - T.click, EASE.snappy))
      : mix(1.4, 1, ramp(frame, T.holdEnd, T.backEnd - T.holdEnd, EASE.smooth));

  // —— 涟漪：扩散 out-cubic（40–62f，直径 60→380），消散线性（40–66f）帧时间解耦 ——
  const rippleAlive = frame >= T.click && frame < T.click + 26;
  const rippleD = mix(60, 380, ramp(frame, T.click, 22, (x) => outCubic(x)));
  const rippleOp = interpolate(frame, [T.click, T.click + 26], [0.9, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const rippleBw = interpolate(frame, [T.click, T.click + 22], [5, 1.5], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // —— 按钮状态：Deploy → Deploying…（f44–50 交叉）→ Deployed ✓（f76–84）——
  const sBusy = ramp(frame, T.click + 4, 6, EASE.out) * (1 - ramp(frame, T.done, 6, EASE.exit));
  const sIdle = 1 - ramp(frame, T.click + 3, 5, EASE.exit);
  const sDone = ramp(frame, T.done + 3, 7, EASE.snappy);
  const spin = (frame - T.click) * 16; // 转圈只在 Deploying 段可见，之后整段卸载

  // 按钮面：深色主按钮，悬停提亮（#1d1e24 → #3c3e47），完成态转为带色相的深绿
  const base = [29 + 31 * lift, 30 + 32 * lift, 36 + 35 * lift];
  const doneRGB = [22, 64, 48];
  const face = base.map((v, i) => Math.round(mix(v, doneRGB[i], sDone)));
  const faceCss = `rgb(${face[0]},${face[1]},${face[2]})`;

  const label = (o: number, dy: number, node: React.ReactNode) => (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: o, transform: `translateY(${dy.toFixed(2)}px)`,
    }}>{node}</div>
  );

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, overflow: 'hidden', position: 'relative' }}>
      {/* 整画布以点击点为原点推近 */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `scale(${zoom})`,
        transformOrigin: `${CLICK.x}px ${CLICK.y}px`,
      }}>
        <FakeDashboard variant="A" />

        {/* 顶栏主按钮 Deploy（嵌在顶栏槽位里，与搜索框同排同高线） */}
        <div style={{
          position: 'absolute', left: BTN.x, top: BTN.y, width: BTN.w, height: BTN.h,
          borderRadius: 11, overflow: 'hidden',
          background: `linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%), ${faceCss}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,${0.16 + 0.06 * lift}), 0 0 0 1px rgba(10,12,18,0.55), ` +
            `0 ${1 + 3 * lift}px ${2 + 6 * lift}px rgba(16,18,24,${0.16 + 0.06 * lift}), 0 ${6 + 8 * lift}px ${14 + 14 * lift}px -6px rgba(16,18,24,${0.22 + 0.1 * lift})`,
          transform: `scale(${hoverScale * press})`,
          fontFamily: FONT.sans, fontWeight: 600, fontSize: 18, color: '#ffffff', letterSpacing: '-0.005em',
        }}>
          {/* 按压光：点击点处一团柔光，只这一次，裁在按钮圆角里 */}
          <div style={{
            position: 'absolute', inset: 0, opacity: pressGlow,
            background: `radial-gradient(circle at ${CLICK.x - BTN.x}px ${CLICK.y - BTN.y}px, rgba(160,168,255,0.55) 0%, rgba(160,168,255,0) 62%)`,
          }} />
          {sIdle > 0.001 && label(sIdle, -6 * (1 - sIdle), <>
            <Glyph d={ICON_UP} size={15} color="rgba(255,255,255,0.92)" />
            <span>Deploy</span>
          </>)}
          {sBusy > 0.001 && label(sBusy, 6 * (1 - sBusy) - 6 * ramp(frame, T.done, 6, EASE.exit), <>
             <svg width={16} height={16} viewBox="0 0 18 18" style={{ display: 'block', transform: `rotate(${spin}deg)` }}>
              <circle cx={9} cy={9} r={7} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2} />
              <path d="M9 2a7 7 0 0 1 7 7" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.86)' }}>Deploying…</span>
          </>)}
          {sDone > 0.001 && label(sDone, 6 * (1 - sDone), <>
            <Glyph d={ICON_CHECK} size={16} color="#7ee2b0" />
            <span>Deployed</span>
          </>)}
        </div>

        {/* 涟漪圆环：强调色细环 + 极淡内填，条件挂载，f66 后摘除 */}
        {rippleAlive && (
          <div style={{
            position: 'absolute',
            left: CLICK.x - rippleD / 2, top: CLICK.y - rippleD / 2,
            width: rippleD, height: rippleD, borderRadius: '50%', boxSizing: 'border-box',
            border: `${rippleBw}px solid ${G.accent}`,
            background: `radial-gradient(circle, rgba(91,99,211,0) 55%, rgba(91,99,211,0.10) 100%)`,
            opacity: rippleOp,
          }} />
        )}

        {/* 放大光标（随画布一起被推近，钉在按钮上）；快速段按速度沿路径方向拖影 */}
        <SpeedBlur vx={vx} vy={vy} amount={0.09} max={10}>
          <Cursor x={cur.x} y={cur.y + dip} rot={rot} />
        </SpeedBlur>
      </div>
    </div>
  );
};
