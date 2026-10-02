// 多米诺连锁入场（domino-cascade）——Rube Goldberg / OK Go MV。
// 三级动量链，每级 startFrame = 上一级 impact 帧：
// ① 帧 36–51 页面标题从画外顶 ease-in(cubic) 砸落上半屏，
//    impact 帧 51 全画面竖向震一拍（4f 衰减）+ 标题落地压扁回弹；
// ② 帧 51 起下方 4 张卡片被震得依次（隔 5f）向上弹 60px 抛物线落回（12f），
//    末卡落地帧 78 = 第二次撞击（再震一拍 + 末卡向左歪 3° 给出横向动量）；
// ③ 帧 78–100 左侧深色侧边栏被横向撞滑进场，ease-out 带过冲回弹；帧 100–150 全体真静止。
// 质感：柔光背景 + 地面接触影（卡片离地越高影子越小越淡）、落地 squash、
// 砸落 / 撞滑段按速度给方向性运动模糊；侧边栏是完整导航（logo / 图标 / 选中态），
// 标题换成像样的页面标题（眉题 + 主标题），不再是卡名大写占位。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Card, G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, SpeedBlur, mix, ramp, softShadow, tracking, velocity } from '../../_fixtures/Polish';

export const DOMINO_CASCADE_DURATION = 150; // 36f 读布景 + 64f 三级链 + 50f 真静止

const easeInCubic = Easing.in(Easing.cubic);

// —— 关键帧 ——
const TITLE_START = 36; // 砸落开始（前 36f hold 读布景）
const IMPACT_1 = 51; // 标题落地 = 第一次撞击
const CARD_STAGGER = 5;
const CARD_DUR = 12;
const IMPACT_2 = IMPACT_1 + 3 * CARD_STAGGER + CARD_DUR; // 78，末卡落地
const SIDE_END = IMPACT_2 + 14; // 92 侧边栏到位（过冲点）
const SIDE_SETTLE = SIDE_END + 8; // 100 回弹结束，此后真静止

// 撞击震动：一拍，4f 内衰减归零（幅度递减表现能量损耗）
const shake = (f: number, at: number, amp: number) => {
  if (f < at || f > at + 4) return 0;
  const seq = [amp, -amp * 0.6, amp * 0.3, -amp * 0.12, 0];
  return seq[f - at];
};

// 卡片行几何：内容中心 1080（给左侧 240 侧边栏留出位置）
const CARD_W = 340;
const CARD_H = 220;
const GAP = 40;
const ROW_W = 4 * CARD_W + 3 * GAP; // 1480
const ROW_LEFT = 1080 - ROW_W / 2; // 340
const CARD_TOP = 700; // 卡片底边 920，落在地板线上
const FLOOR = CARD_TOP + CARD_H; // 920

const TITLE_LAND = 240; // 标题落点（top）

// ① 标题位置（frame 的函数，供速度求导）
const titleTopAt = (f: number) =>
  interpolate(f, [TITLE_START, IMPACT_1], [-300, TITLE_LAND], {
    easing: easeInCubic, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

// ② 卡片弹跳高度：抛物线 4t(1-t)，依次隔 5f
const cardLift = (f: number, i: number) => {
  const s = IMPACT_1 + i * CARD_STAGGER;
  const t = Math.min(1, Math.max(0, (f - s) / CARD_DUR));
  return 60 * 4 * t * (1 - t);
};

// ③ 侧边栏横移：带初速滑入（ease-out 冲到 +12 ≈ 5% 过冲）+ 阻尼回正
const sideXAt = (f: number) => {
  if (f < IMPACT_2) return -260;
  if (f < SIDE_END) return -260 + 272 * Easing.out(Easing.cubic)((f - IMPACT_2) / (SIDE_END - IMPACT_2));
  if (f < SIDE_SETTLE) return 12 * (1 - Easing.inOut(Easing.quad)((f - SIDE_END) / (SIDE_SETTLE - SIDE_END)));
  return 0;
};

// 侧边栏图标（内联 SVG，1.5px 描边）
const ICON: Record<string, string> = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  chart: 'M5 20V11M10 20V5M15 20v-7M20 20V9',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c.6-3.4 3-5 6-5s5.4 1.6 6 5M16 4.5a3.2 3.2 0 0 1 0 6.2M18 15c1.8.6 2.8 2.2 3 5',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4',
};
const NAV: [string, string][] = [
  ['grid', 'Overview'], ['chart', 'Analytics'], ['folder', 'Projects'],
  ['users', 'Members'], ['file', 'Reports'], ['sliders', 'Settings'],
];
const Icon: React.FC<{ d: string; color: string }> = ({ d, color }) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Sidebar: React.FC = () => (
  <div style={{
    width: 240, height: 1080, background: 'linear-gradient(180deg, #1b1c21 0%, #141519 100%)',
    padding: '30px 22px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 6,
    fontFamily: FONT.sans, boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.06)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11, position: 'relative', overflow: 'hidden', flex: 'none',
        background: 'linear-gradient(145deg, #3b3d46 0%, #24252b 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 1px rgba(0,0,0,0.25)',
      }}>
        <div style={{ position: 'absolute', left: 11, top: 11, width: 13, height: 13, borderRadius: 4, background: 'rgba(255,255,255,0.92)' }} />
        <div style={{ position: 'absolute', left: 18, top: 18, width: 13, height: 13, borderRadius: 7, background: G.accent }} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#f2f2f4', letterSpacing: '-0.01em' }}>Workspace</div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>Pro plan</div>
      </div>
    </div>
    {NAV.map(([icon, label], i) => (
      <div key={label} style={{
        height: 38, borderRadius: 9, display: 'flex', alignItems: 'center', gap: 12, padding: '0 11px',
        background: i === 0 ? 'rgba(255,255,255,0.08)' : 'transparent',
        boxShadow: i === 0 ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
        color: i === 0 ? '#f2f2f4' : 'rgba(255,255,255,0.58)', fontSize: 15, fontWeight: i === 0 ? 550 : 450,
      }}>
        <Icon d={ICON[icon]} color={i === 0 ? '#f2f2f4' : 'rgba(255,255,255,0.5)'} />
        {label}
      </div>
    ))}
    <div style={{ marginTop: 'auto', padding: 13, borderRadius: 11, background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', fontSize: 12.5, color: 'rgba(255,255,255,0.58)' }}>
        <span>Usage</span>
        <span style={{ marginLeft: 'auto', color: '#f2f2f4', fontVariantNumeric: 'tabular-nums' }}>68%</span>
      </div>
      <div style={{ marginTop: 9, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ width: '68%', height: '100%', borderRadius: 2, background: 'rgba(255,255,255,0.72)' }} />
      </div>
    </div>
  </div>
);

export const DominoCascade: React.FC = () => {
  const frame = useCurrentFrame();

  const titleTop = titleTopAt(frame);
  const titleVy = velocity(titleTopAt, frame);
  // 落地压扁：撞击帧 scaleY 0.9 / scaleX 1.03，6f 内过冲回正（底边为原点）
  const land = ramp(frame, IMPACT_1, 7, EASE.overshoot);
  const landed = frame >= IMPACT_1;
  const tSy = landed ? mix(0.9, 1, land) : 1;
  const tSx = landed ? mix(1.03, 1, land) : 1;

  // 两次撞击的全画面竖向震动
  const shakeY = shake(frame, IMPACT_1, 10) + shake(frame, IMPACT_2, 6);

  // 末卡落地时向左歪 3°（横向动量的可见出处），随后缓回正
  const lastCardRot = frame < IMPACT_2
    ? mix(0, -3, ramp(frame, IMPACT_2 - 9, 9, EASE.swift))
    : mix(-3, 0, ramp(frame, IMPACT_2, SIDE_END - IMPACT_2, EASE.smooth));

  const sideX = sideXAt(frame);
  const sideVx = velocity(sideXAt, frame);

  return (
    <div style={{ width: 1920, height: 1080, overflow: 'hidden', position: 'relative', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.56, y: 0.2 }} accent={G.accent} vignette={0.16} />
      {/* 全画面震动容器 */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${shakeY}px)` }}>
        {/* 地面：发丝线 + 向下渐隐的地面影，卡片落点 */}
        <div style={{
          position: 'absolute', left: ROW_LEFT - 90, top: FLOOR, width: ROW_W + 180, height: 140,
          background: 'linear-gradient(180deg, rgba(20,22,28,0.05) 0%, rgba(20,22,28,0) 100%)',
          borderTop: '1px solid rgba(20,22,28,0.10)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%)',
          maskImage: 'linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%)',
        }} />

        {/* ① 砸落的页面标题：下落段按速度竖向模糊 */}
        <SpeedBlur vx={0} vy={titleVy} amount={0.2} max={16}>
          <div style={{
            position: 'absolute', left: 240, width: 1680, top: titleTop, display: 'flex', flexDirection: 'column',
            alignItems: 'center', transformOrigin: '50% 100%', transform: `scale(${tSx}, ${tSy})`,
          }}>
            <div style={{
              fontSize: 32, fontWeight: 600, color: G.accent, letterSpacing: tracking(32, true), textTransform: 'uppercase',
              marginBottom: 18,
            }}>Q3 product review</div>
            <div style={{
              fontSize: 120, fontWeight: 700, color: G.ink1, letterSpacing: tracking(120), lineHeight: 1.02,
            }}>Everything, connected.</div>
          </div>
        </SpeedBlur>

        {/* ② 被震弹起的 4 张卡片 + 地面接触影 */}
        {[0, 1, 2, 3].map((i) => {
          const lift = cardLift(frame, i);
          const landAt = IMPACT_1 + i * CARD_STAGGER + CARD_DUR;
          // 落地 squash：落地后 4f 内 scaleY 0.965 → 1（正弦一拍，底边为原点）
          const sq = frame >= landAt && frame < landAt + 4 ? 1 - 0.035 * Math.sin((Math.PI * (frame - landAt + 1)) / 5) : 1;
          const h = lift / 60; // 0–1 离地高度
          return (
            <React.Fragment key={i}>
              <div style={{
                position: 'absolute', left: ROW_LEFT + i * (CARD_W + GAP) + 18, top: FLOOR - 9, width: CARD_W - 36, height: 18,
                borderRadius: '50%', background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(16,18,26,0.22) 0%, rgba(16,18,26,0) 100%)',
                transform: `scaleX(${1 - 0.28 * h})`, opacity: 1 - 0.6 * h,
              }} />
              <div style={{
                position: 'absolute', left: ROW_LEFT + i * (CARD_W + GAP), top: CARD_TOP,
                transform: `translateY(${-lift}px)${i === 3 ? ` rotate(${lastCardRot}deg)` : ''} scale(${2 - sq}, ${sq})`,
                transformOrigin: '50% 100%',
                borderRadius: 14, boxShadow: softShadow(4 + lift * 0.4),
              }}>
                <Card w={CARD_W} h={CARD_H} seed={i + 2} />
              </div>
            </React.Fragment>
          );
        })}

        {/* ③ 被撞滑进场的侧边栏：横向运动模糊 + 投到画布上的边缘影 */}
        <SpeedBlur vx={sideVx} amount={0.22} max={14}>
          <div style={{
            position: 'absolute', left: 0, top: 0, transform: `translateX(${sideX}px)`,
            boxShadow: '1px 0 0 rgba(0,0,0,0.25), 18px 0 48px -18px rgba(12,14,20,0.35)',
          }}>
            <Sidebar />
          </div>
        </SpeedBlur>
      </div>
    </div>
  );
};
