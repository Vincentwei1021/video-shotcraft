// 描边生长圈注（draw-svg-trace）——DrawSVG 惯用的入场退场。
// 屏心 560×380 卡片位置先空着，一条墨色 4px 描边沿圆角矩形轮廓跑一整圈
// 把轮廓"画"出来（rect pathLength=1，dasharray=1，dashoffset 1→0）；
// 线头叠一段 0.045 长的粗短 dash 当"笔头"跑在最前。闭合瞬间轮廓闪一次
// 加深加粗，卡片内容 8f 淡入，描边淡出换成卡片自身 border；随后标题重点词下划线
// 再来一次短版描边生长（第二用法）。
// 关键帧：0–8 空场 hold → 8–48 轮廓描边生长 40f（inOut cubic）→
// 48–56 闪黑加粗（48–50 上 50–56 回）+ 内容 8f 淡入 →
// 54–64 描边淡出 / 自身 border 淡入 → 68–86 下划线短版生长 → 86–126 真静止 40f。
// 质感层（改版）：去掉调试标题；柔光纸面底 + 颗粒；笔头改为"渐细三段 dash + 圆形笔尖"，
// 笔尖按圆角矩形弧长参数精确定位、带一点落影；卡片内容换成出版级指标卡（真实文案 +
// 柱图 + 署名行），闭合后自上而下 2f 错峰上色，卡片同时从贴地升到静置高度（阴影长出来）。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, ramp, softShadow } from '../../_fixtures/Polish';

export const DRAW_SVG_TRACE_DURATION = 126; // 描边 40f + 交棒 16f + 下划线 18f + 真静止 40f

const CW = 560;
const CH = 380;
const CX = (1920 - CW) / 2; // 680
const CY = (1080 - CH) / 2; // 350
const RX = 14; // 与卡片圆角一致（交棒不错型）
const PEN = 0.045; // 笔头 dash 长度（占整圈比例）
const INK = '#17181c'; // 带冷调的墨色（替代 #2f2f2f 灰黑）

// 圆角矩形轮廓上弧长比例 u∈[0,1] 的点（与 SVG <rect> 的路径起点/方向一致：
// 从上边 (x+rx, y) 出发顺时针）。用于把圆形笔尖钉在描边前沿。
const rrPoint = (u: number, x: number, y: number, w: number, h: number, r: number) => {
  const sx = w - 2 * r, sy = h - 2 * r, arc = (Math.PI * r) / 2;
  const L = 2 * sx + 2 * sy + 4 * arc;
  let s = ((u % 1) + 1) % 1 * L;
  const segs: Array<[number, (k: number) => [number, number]]> = [
    [sx, (k) => [x + r + k * sx, y]],
    [arc, (k) => [x + w - r + r * Math.sin(k * Math.PI / 2), y + r - r * Math.cos(k * Math.PI / 2)]],
    [sy, (k) => [x + w, y + r + k * sy]],
    [arc, (k) => [x + w - r + r * Math.cos(k * Math.PI / 2), y + h - r + r * Math.sin(k * Math.PI / 2)]],
    [sx, (k) => [x + w - r - k * sx, y + h]],
    [arc, (k) => [x + r - r * Math.sin(k * Math.PI / 2), y + h - r + r * Math.cos(k * Math.PI / 2)]],
    [sy, (k) => [x, y + h - r - k * sy]],
    [arc, (k) => [x + r - r * Math.cos(k * Math.PI / 2), y + r - r * Math.sin(k * Math.PI / 2)]],
  ];
  for (const [len, f] of segs) {
    if (s <= len) return f(len > 0 ? s / len : 0);
    s -= len;
  }
  return [x + r, y] as [number, number];
};

// 指标卡柱图数据（确定性）
const BARS = [38, 44, 41, 52, 49, 58, 63, 61, 70, 76, 74, 86];

export const DrawSvgTrace: React.FC = () => {
  const frame = useCurrentFrame();

  // 轮廓描边进度：8–48，40f，inOut cubic
  const p = interpolate(frame, [8, 48], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  // 闭合闪烁：48–50 冲到峰值，50–56 回落。峰值 = 纯黑 + 4→8px 加粗
  const flashUp = interpolate(frame, [48, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const flashDown = interpolate(frame, [50, 56], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const flash = frame < 50 ? flashUp : flashDown;
  const strokeW = 4 + flash * 4;
  const strokeColor = flash > 0.5 ? '#000000' : INK;

  // 内容淡入：48 起，各元素自上而下 2f 错峰、每个 8f（ease-out）
  const contentIn = (k: number) => ramp(frame, 48 + k * 2, 8, EASE.out);

  // 描边淡出 / 卡片自身 border 淡入：54–64
  const traceOp = interpolate(frame, [54, 64], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const borderOp = 1 - traceOp;
  // 卡片"升起"：随内容上色从贴地（0）升到静置高度（6）
  const lift = ramp(frame, 48, 18, EASE.out);

  // 笔头：短 dash 覆盖 [p-PEN, p]，只在描边期可见（起收 2f 淡入淡出，不硬切）
  const penOp = interpolate(p, [0, 0.02, 0.97, 0.995], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const [nx, ny] = rrPoint(p, 1, 1, CW - 2, CH - 2, RX);

  // 第二用法：标题重点词下划线短版生长 68–86（18f，out cubic）
  const up = interpolate(frame, [68, 86], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const upenOp = interpolate(up, [0, 0.04, 0.92, 0.99], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const rise = (k: number): React.CSSProperties => ({
    opacity: contentIn(k),
    transform: `translateY(${((1 - contentIn(k)) * 8).toFixed(2)}px)`,
  });

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.3 }} grain={0.05} vignette={0.14} />

      {/* 卡片底面：闭合后与内容同步上色、阴影随升起长出 */}
      <div
        style={{
          position: 'absolute',
          left: CX,
          top: CY,
          width: CW,
          height: CH,
          borderRadius: RX,
          background: G.card,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(lift * 10, { strength: 0.9 })}`,
          opacity: contentIn(0),
        }}
      />

      {/* 卡片内容：出版级指标卡（标签 / 标题 + 重点词 / 正文 / 柱图 / 署名行） */}
      <div
        style={{
          position: 'absolute',
          left: CX,
          top: CY,
          width: CW,
          height: CH,
          padding: '30px 34px 28px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...rise(0) }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: G.accent }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: G.ink2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Quarterly review
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 15, color: G.ink3, fontVariantNumeric: 'tabular-nums' }}>Jul – Sep 2026</div>
        </div>
        <div style={{ marginTop: 16, fontSize: 36, fontWeight: 700, color: G.ink1, letterSpacing: '-0.025em', lineHeight: 1.12, ...rise(1) }}>
          Revenue grew{' '}
          <span style={{ position: 'relative', display: 'inline-block' }}>
            38%
            {/* 第二用法：重点词下划线短版描边生长（画完常驻） */}
            {up > 0.001 && (
              <svg
                width="100%"
                height={10}
                style={{ position: 'absolute', left: 0, bottom: -9, overflow: 'visible' }}
              >
                <line
                  x1="0%" y1={5} x2="100%" y2={5}
                  stroke={INK} strokeWidth={4} pathLength={1}
                  strokeDasharray="1" strokeDashoffset={1 - up} strokeLinecap="round"
                />
                {upenOp > 0 && (
                  <line
                    x1="0%" y1={5} x2="100%" y2={5}
                    stroke={INK} strokeWidth={7} pathLength={1} opacity={upenOp}
                    strokeDasharray={`${PEN * 2} ${1 - PEN * 2}`} strokeDashoffset={PEN * 2 - up} strokeLinecap="round"
                  />
                )}
              </svg>
            )}
          </span>{' '}
          in Q3
        </div>
        <div style={{ marginTop: 14, fontSize: 18, lineHeight: 1.45, color: G.ink2, letterSpacing: '-0.005em', maxWidth: 470, ...rise(2) }}>
          Self-serve upgrades and the new annual plan drove most of the lift, led by teams of 10–50 seats.
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', gap: 7, height: 104, ...rise(3) }}>
          {BARS.map((v, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${v}%`,
                borderRadius: 4,
                background: i >= 9 ? G.accent : G.fill2,
                opacity: i >= 9 ? 0.55 + (i - 9) * 0.22 : 1,
              }}
            />
          ))}
        </div>
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, ...rise(4) }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 17, background: 'linear-gradient(140deg, #7d84ea, #5b63d3)',
              color: '#fff', fontSize: 13, fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            MR
          </div>
          <div style={{ fontSize: 15, color: G.ink1, fontWeight: 600 }}>Maya Reyes</div>
          <div style={{ fontSize: 15, color: G.ink3 }}>· Finance · updated 2h ago</div>
        </div>
      </div>

      {/* 卡片自身 border：描边淡出时接棒（1px 发丝线） */}
      <div
        style={{
          position: 'absolute',
          left: CX,
          top: CY,
          width: CW,
          height: CH,
          borderRadius: RX,
          border: `1px solid ${G.hairlineStrong}`,
          boxSizing: 'border-box',
          opacity: borderOp,
        }}
      />

      {/* 描边生长层：主线 4px + 渐细笔头（三段 dash）+ 圆形笔尖 */}
      {traceOp > 0.001 && (
        <svg
          width={CW}
          height={CH}
          style={{ position: 'absolute', left: CX, top: CY, overflow: 'visible', opacity: traceOp }}
        >
          <rect
            x={1}
            y={1}
            width={CW - 2}
            height={CH - 2}
            rx={RX}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeW}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - p}
            strokeLinecap="round"
          />
          {penOp > 0 &&
            [
              { len: PEN, w: 5.2 },
              { len: PEN * 0.6, w: 6.4 },
              { len: PEN * 0.28, w: 7.6 },
            ].map(({ len, w }, k) => (
              <rect
                key={k}
                x={1}
                y={1}
                width={CW - 2}
                height={CH - 2}
                rx={RX}
                fill="none"
                stroke={INK}
                strokeWidth={w}
                opacity={penOp}
                pathLength={1}
                strokeDasharray={`${len} ${1 - len}`}
                strokeDashoffset={len - p}
                strokeLinecap="round"
              />
            ))}
          {penOp > 0 && (
            <g opacity={penOp}>
              {/* 笔尖：实心墨点 + 一点落影，读作"有一支笔在画" */}
              <circle cx={nx + 0.8} cy={ny + 2.2} r={6.5} fill="rgba(16,18,26,0.18)" />
              <circle cx={nx} cy={ny} r={5.2} fill={INK} />
              <circle cx={nx - 1.6} cy={ny - 1.8} r={1.4} fill="rgba(255,255,255,0.35)" />
            </g>
          )}
        </svg>
      )}
    </div>
  );
};
