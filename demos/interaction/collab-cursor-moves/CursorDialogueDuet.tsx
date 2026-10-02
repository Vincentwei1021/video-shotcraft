// cursor-dialogue-duet —— figma-devmode 0:16–0:20
// 纯暗场上 Designer(蓝)/Developer(绿) 两枚具名光标做"对话式"双人舞：
// 相互靠近 → 绕位交换 → 名牌一亮一暗交接 → 一枚放大成巨箭头当转场。
// 改版：轨迹改成首尾相接的连续函数（原版绕位起点有 40px 跳变与回退）；绕位以两者中点为圆心、
// 上下分弧同步交换，弧中段外扩到 R≈270；"灯光交接"做成真的光——一盏柔光跟着说话的人，
// 交接时从蓝滑到绿；快速段按速度加方向性运动模糊；巨箭头终点重新标定，末帧整屏遮挡（真正可藏切点）。
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Backdrop, FONT, SpeedBlur } from '../../_fixtures/Polish';

export const CURSOR_DIALOGUE_DUET_DURATION = 140;

const BLUE = '#4C8DF6';
const GREEN = '#2FBF71';
const DARK = '#0e0f13';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeInCubic = (t: number) => t * t * t;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// 三次贝塞尔单段位移
type P = [number, number];
const bez = (t: number, p0: P, c1: P, c2: P, p3: P): P => {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1];
  return [x, y];
};

const CX = 960;
const CY = 520;
const R = 270;
// 对话位：两者在 56–60f 停在中点两侧（近似对称），绕位从这里无缝起步
const D_TALK: P = [CX - 150, CY + 10];
const G_TALK: P = [CX + 170, CY - 40]; // 绿在右上、蓝在左下：两者名牌与光标互不遮挡
const MID: P = [(D_TALK[0] + G_TALK[0]) / 2, (D_TALK[1] + G_TALK[1]) / 2];
const R0 = Math.hypot(G_TALK[0] - MID[0], G_TALK[1] - MID[1]); // 起止半径 ≈162
const A0 = Math.atan2(D_TALK[1] - MID[1], D_TALK[0] - MID[0]); // Designer 起始角（≈π+）
// 巨箭头终点（光标尖端的画面坐标）：按 110× 标定——箭头三角主体（左缘白描边出画、斜边在右上角之外、
// 尾部缺口在画面下方之外）恰好盖满整幅 1920×1080，末段 134–139f 是干净的整屏遮挡帧
const BLOW_TO: P = [-380, -2690];
const SCALE0 = 2.8;
const SCALE1 = 110;

// 两枚光标的位置是 frame 的连续函数（便于求速度喂运动模糊）
const designerAt = (f: number): P => {
  // 入场：画外左 → 左位（easeOut 24f）
  let p = bez(easeOutCubic(clamp01(f / 24)), [-140, 260], [300, 300], [520, 620], [CX - R, CY]);
  // 靠近：向 Developer 探身（26–56）
  if (f > 26) {
    const t = easeInOutCubic(clamp01((f - 26) / 30));
    p = bez(t, [CX - R, CY], [CX - R + 120, CY - 150], [CX - 160, CY - 110], D_TALK);
  }
  // 绕位：上半弧经顶部换到右侧（60–98），半径中段外扩
  if (f > 60) {
    const t = easeInOutCubic(clamp01((f - 60) / 38));
    const a = A0 + t * Math.PI; // 顺时针经上方（屏幕 y 向下，故角度增大走上弧）
    // 半径中段外扩到 R，纵向压扁到 0.62（扁弧）；首尾 r=R0、不压扁 → 与对话位精确衔接
    const r = R0 + (R - R0) * Math.sin(Math.PI * t);
    p = [MID[0] + Math.cos(a) * r, MID[1] + Math.sin(a) * r * (1 - 0.38 * Math.sin(Math.PI * t))];
  }
  // 退场：加速甩出画面右下（104–128，easeIn）
  if (f > 104) {
    const t = easeInCubic(clamp01((f - 104) / 24));
    const end = designerAt(104);
    p = [interpolate(t, [0, 1], [end[0], 2260]), interpolate(t, [0, 1], [end[1], 1300])];
  }
  return p;
};

const developerAt = (f: number): P => {
  // 入场：画外右下 → 右位（easeOut 24f，晚 4f）
  let p = bez(easeOutCubic(clamp01((f - 4) / 24)), [2080, 820], [1700, 760], [1420, 420], [CX + R, CY]);
  // 回应：微微后仰再前倾，最后探到对话位（30–58）
  if (f > 30) {
    const t = easeInOutCubic(clamp01((f - 30) / 28));
    const lean = Math.sin(t * Math.PI) * 60; // 后仰
    p = [interpolate(t, [0, 1], [CX + R, G_TALK[0]]) + lean, interpolate(t, [0, 1], [CY, G_TALK[1]]) - Math.sin(t * Math.PI * 2) * 36];
  }
  // 绕位：下半弧换到左侧（60–98）
  if (f > 60) {
    const t = easeInOutCubic(clamp01((f - 60) / 38));
    const a = A0 + Math.PI + t * Math.PI;
    const r = R0 + (R - R0) * Math.sin(Math.PI * t);
    p = [MID[0] + Math.cos(a) * r, MID[1] + Math.sin(a) * r * (1 - 0.38 * Math.sin(Math.PI * t))];
  }
  // 终场：冲向镜头并放大成巨箭头（100–134，easeIn）
  if (f > 100) {
    const blow = easeInCubic(clamp01((f - 100) / 34));
    const start = developerAt(100);
    p = [interpolate(blow, [0, 1], [start[0], BLOW_TO[0]]), interpolate(blow, [0, 1], [start[1], BLOW_TO[1]])];
  }
  return p;
};

// 速度（px/帧），带 10px/帧 死区：慢速靠近/后仰不糊，只有绕位快段与甩出才出拖影
const vel = (fn: (f: number) => P, f: number): P => {
  const a = fn(f - 0.5);
  const b = fn(f + 0.5);
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const sp = Math.hypot(vx, vy);
  const k = sp > 1e-6 ? Math.max(0, sp - 10) / sp : 0;
  return [vx * k, vy * k];
};

const Cursor: React.FC<{
  x: number; y: number; scale: number; color: string; name: string; id: string;
  badgeLit: number; // 0 压暗 1 点亮
  badgeOpacity?: number;
}> = ({ x, y, scale, color, name, id, badgeLit, badgeOpacity = 1 }) => (
  <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
    <svg width={42} height={62} viewBox="0 0 13.5 20" style={{
      display: 'block', overflow: 'visible',
      filter: scale < 6 ? `drop-shadow(0 0.6px 0.8px rgba(0,0,0,0.55)) drop-shadow(0 0 ${2.5 * badgeLit}px ${color}66)` : undefined,
    }}>
      <defs>
        <linearGradient id={`cg-${id}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={1} />
          <stop offset="1" stopColor={color} stopOpacity={0.86} />
        </linearGradient>
      </defs>
      <path
        d="M0.5 0.5 L0.5 17.2 L4.7 13.4 L7.3 19.5 L10 18.3 L7.4 12.3 L13 12.3 Z"
        fill={`url(#cg-${id})`} stroke="#ffffff" strokeWidth={1.1} strokeLinejoin="round"
      />
    </svg>
    <div style={{
      position: 'absolute', left: 34, top: 56, whiteSpace: 'nowrap',
      background: color, color: '#fff', borderRadius: 9, padding: '5px 13px 6px',
      fontFamily: FONT.sans, fontWeight: 650, fontSize: 16, letterSpacing: '0.005em',
      opacity: badgeOpacity * (0.28 + 0.72 * badgeLit),
      filter: `saturate(${0.35 + 0.65 * badgeLit})`,
      boxShadow: `inset 0 0.5px 0 rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.4)` +
        (badgeLit > 0.6 ? `, 0 0 ${18 * badgeLit}px ${color}99` : ''),
    }}>
      {name}
    </div>
  </div>
);

export const CursorDialogueDuet: React.FC = () => {
  const f = useCurrentFrame();

  const [dx, dy] = designerAt(f);
  const [gx, gy] = developerAt(f);
  const dv = vel(designerAt, f);
  const gv = vel(developerAt, f);

  const blow = easeInCubic(clamp01((f - 100) / 34));
  const gScale = SCALE0 + blow * (SCALE1 - SCALE0);

  // ---------- 名牌灯光交接 ----------
  // 前半 Designer 点亮，绕位中段(70–84)交接给 Developer
  const handoff = easeInOutCubic(clamp01((f - 70) / 14));
  const dLit = f < 24 ? easeOutCubic(clamp01(f / 24)) : 1 - handoff;
  const gLit = handoff;
  const dBadgeIn = easeOutCubic(clamp01((f - 12) / 14));
  const gBadgeIn = easeOutCubic(clamp01((f - 18) / 14));

  // 对话"脉冲"——靠近对话时轻微缩放呼吸
  const dPulse = f > 26 && f < 60 ? 1 + Math.sin((f - 26) * 0.5) * 0.05 : 1;

  // 说话人的光：一盏柔光跟着点亮的那枚光标（光心偏到光标身体中部），交接时从蓝滑到绿
  const lx = dx * dLit + gx * gLit + 60;
  const ly = dy * dLit + gy * gLit + 90;
  const lightOut = 1 - clamp01((f - 104) / 16); // 巨箭头起飞后收光
  const fadeD = f > 104 ? 1 - easeInCubic(clamp01((f - 104) / 18)) : 1;

  return (
    <div style={{ width: 1920, height: 1080, background: DARK, position: 'relative', overflow: 'hidden' }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.45 }} grain={0.09} vignette={0.6} />
      {/* 说话人的柔光池 */}
      <div style={{
        position: 'absolute', inset: 0, opacity: lightOut,
        background:
          `radial-gradient(circle 520px at ${lx}px ${ly}px, rgba(76,141,246,${(0.13 * dLit).toFixed(3)}) 0%, rgba(76,141,246,0) 70%), ` +
          `radial-gradient(circle 520px at ${lx}px ${ly}px, rgba(47,191,113,${(0.12 * gLit).toFixed(3)}) 0%, rgba(47,191,113,0) 70%), ` +
          `radial-gradient(circle 300px at ${lx}px ${ly}px, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 70%)`,
      }} />
      {f <= 132 && (
        <SpeedBlur vx={dv[0]} vy={dv[1]} amount={0.12} max={9}>
          <Cursor x={dx} y={dy} scale={SCALE0 * dPulse} color={BLUE} name="Designer" id="d"
            badgeLit={dLit} badgeOpacity={dBadgeIn * fadeD} />
        </SpeedBlur>
      )}
      <SpeedBlur vx={f > 100 ? 0 : gv[0]} vy={f > 100 ? 0 : gv[1]} amount={0.12} max={9}>
        <Cursor x={gx} y={gy} scale={gScale} color={GREEN} name="Developer" id="g"
          badgeLit={gLit} badgeOpacity={gBadgeIn * (1 - clamp01((f - 102) / 12))} />
      </SpeedBlur>
    </div>
  );
};
