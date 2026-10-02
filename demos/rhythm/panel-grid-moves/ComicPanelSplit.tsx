// comic-panel-split｜漫画分格并列
// FakeDashboard A 全屏 20f → 咔咔咔切成 3 个斜线分格
// （12° 斜边，10px 白缝 + 墨线描边），逐格 2f 间隔弹入（3f scale 1.06→1
// + 加深脉冲）。三格 = 同页面三机位：全景 1x / Active users 卡曲线特写 1.9x /
// 24,812 指标特写 2.6x。定格 18f 各格缓慢微推近保持活 → 第三格斜边框 12f out-cubic
// 扩张吃掉全屏成为下一镜特写。57f 起摘罩（特写直出、分格结构与缝线
// 全部卸载），57–150f 真静止 93f ≥ 40f。帧确定，无随机源。
// 质感：不再叠一块浮在卡片上的 KPI 白板（会盖住新 dashboard 左上卡的曲线）——
// 数字特写直接对准页面自己的 Active users 指标；三格机位都对准同一张卡（层层逼近）。
// 缝线下垫一层柔影让分格像印在纸上的格子；扩张段第三格内容与缝线按速度挂横向运动模糊；
// 未弹入的区域是暖白纸色 + 颗粒而不是纯白死区；摘罩后的特写走 CSS zoom 按 2.6x 栅格化。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { EASE, Grain, SpeedBlur, Vignette, bezier, mix, ramp, velocity } from '../../_fixtures/Polish';

export const COMIC_PANEL_SPLIT_DURATION = 150; // 全屏 20f + 分格 25f + 扩张 12f + 真静止 93f

const SPLIT = 20;              // 全屏 A 结束、开始分格
const POP = 3;                 // 每格弹入 3f
const STAGGER = 2;             // 逐格 2f 间隔
const HOLD_END = 45;           // 27f 弹完 + 定格 18f
const EXPAND_END = 57;         // 第三格 12f 扩张结束
// 57–150 真静止 93f

// 斜边 12°：tan(12°)×1080 ≈ 230，顶边比底边右移 230
// 缝 10px（水平半宽 5px）
// 边界1：顶 750 / 底 520；边界2：顶 1405 / 底 1175
const PAPER = '#f3f2ee';
const INK = '#2f2f2f';
const outCubic = bezier(0.33, 1, 0.68, 1); // 扩张走 out-cubic：起步猛、尾段收得干净

// 机位 = 页面坐标里的焦点 F 落到屏幕 C，倍率 S：screen = C + S·(p − F)
type Cam = { fx: number; fy: number; cx: number; cy: number; s: number };
// 三格机位（焦点都在 Active users 卡上：卡片曲线 / 24,812 指标）
const CAM1: Cam = { fx: 960, fy: 540, cx: 960, cy: 540, s: 1 };       // 全景 1x
const CAM2: Cam = { fx: 610, fy: 352, cx: 962, cy: 540, s: 1.9 };     // 卡片曲线特写 1.9x
const CAM3: Cam = { fx: 362, fy: 300, cx: 1607, cy: 540, s: 2.6 };    // 指标特写 2.6x（格中心，数字在格上三分之一）
// 扩张终点 = 摘罩后的满屏特写：焦点右移到 x=590，2.6x 下视口左缘恰好切在侧栏外（不露半截导航）
const CAM_END: Cam = { fx: 590, fy: 300, cx: 960, cy: 540, s: 2.6 };

const camTransform = (c: Cam) => `translate(${c.cx - c.s * c.fx}px, ${c.cy - c.s * c.fy}px) scale(${c.s})`;

// 第三格机位：定格期微推（+8%），扩张期焦点 / 屏幕位置一起插值到 CAM_END，推近增量退掉
const cam3At = (frame: number): Cam => {
  const push = ramp(frame, SPLIT + 2 * STAGGER + POP, HOLD_END - (SPLIT + 2 * STAGGER + POP), EASE.smooth);
  const ex = ramp(frame, HOLD_END, EXPAND_END - HOLD_END, outCubic);
  return {
    fx: mix(CAM3.fx, CAM_END.fx, ex), fy: mix(CAM3.fy, CAM_END.fy, ex),
    cx: mix(CAM3.cx, CAM_END.cx, ex), cy: CAM3.cy,
    s: 2.6 + push * 0.08 * (1 - ex),
  };
};
const cam3X = (frame: number) => { const c = cam3At(frame); return c.cx - c.s * c.fx; };

// 第三格左斜边（= 边界2 吃屏轨迹）
const e3TopAt = (frame: number) => mix(1410, -60, ramp(frame, HOLD_END, EXPAND_END - HOLD_END, outCubic));

export const ComicPanelSplit: React.FC = () => {
  const frame = useCurrentFrame();

  // ===== 摘罩：扩张完成后特写直出（CSS zoom 栅格化），分格结构 / 缝线全部卸载 =====
  if (frame >= EXPAND_END) {
    const s = CAM_END.s;
    return (
      <AbsoluteFill style={{ background: PAPER, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 1920, height: 1080, zoom: s,
          left: CAM_END.cx / s - CAM_END.fx, top: CAM_END.cy / s - CAM_END.fy,
        }}>
          <FakeDashboard variant="A" />
        </div>
        <Vignette strength={0.14} inner={0.55} color="#1a1c24" />
        <Grain opacity={0.045} />
      </AbsoluteFill>
    );
  }

  // ===== 阶段 1：全屏 A =====
  if (frame < SPLIT) {
    return (
      <AbsoluteFill style={{ background: PAPER }}>
        <FakeDashboard variant="A" />
        <Vignette strength={0.12} inner={0.55} color="#1a1c24" />
        <Grain opacity={0.045} />
      </AbsoluteFill>
    );
  }

  // ===== 阶段 2/3：分格 + 第三格扩张 =====
  // 定格期微推近（27–45f，in-out 缓推，扩张起点速度归零）
  const push = ramp(frame, SPLIT + 2 * STAGGER + POP, HOLD_END - (SPLIT + 2 * STAGGER + POP), EASE.smooth);
  const e3Top = e3TopAt(frame);
  const e3Bot = e3Top - 230;
  const seamV = velocity(e3TopAt, frame);
  const contentV = velocity(cam3X, frame);

  const panels = [
    { // 全景 1x
      clip: 'polygon(0px 0px, 745px 0px, 515px 1080px, 0px 1080px)',
      centroidX: 315, cam: { ...CAM1, s: 1 + push * 0.03 }, z: 1, vx: 0,
    },
    { // 卡片曲线特写 1.9x
      clip: 'polygon(755px 0px, 1400px 0px, 1170px 1080px, 525px 1080px)',
      centroidX: 962, cam: { ...CAM2, s: 1.9 + push * 0.055 }, z: 1, vx: 0,
    },
    { // 指标特写 2.6x，扩张时焦点从格中心搬到屏中心
      clip: `polygon(${e3Top}px 0px, 1920px 0px, 1920px 1080px, ${e3Bot}px 1080px)`,
      centroidX: 1607, cam: cam3At(frame), z: 3, vx: contentV,
    },
  ];

  // 缝线透明度：边界1 随第 2 格弹入出现、扩张期被吃前淡出；
  // 边界2 随第 3 格弹入出现、扩张末 4f 淡出
  const cl = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  const seam1O = Math.min(
    interpolate(frame, [SPLIT + STAGGER, SPLIT + STAGGER + 2], [0, 1], cl),
    interpolate(frame, [HOLD_END, HOLD_END + 3], [1, 0], cl),
  );
  const seam2O = Math.min(
    interpolate(frame, [SPLIT + 2 * STAGGER, SPLIT + 2 * STAGGER + 2], [0, 1], cl),
    interpolate(frame, [EXPAND_END - 4, EXPAND_END], [1, 0], cl),
  );

  // 斜缝：柔影垫底（纸面压痕）+ 墨线 16 + 白核 10 → 两侧各 3px 墨边
  const seam = (x1: number, x2: number, key: string) => (
    <g key={key}>
      <line x1={x1} y1={-10} x2={x2} y2={1090} stroke="rgba(16,18,26,0.22)" strokeWidth={34} filter="url(#seamSoft)" />
      <line x1={x1} y1={-10} x2={x2} y2={1090} stroke={INK} strokeWidth={16} />
      <line x1={x1} y1={-10} x2={x2} y2={1090} stroke="#ffffff" strokeWidth={10} />
    </g>
  );

  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {panels.map((p, i) => {
        const start = SPLIT + i * STAGGER;
        if (frame < start) return null; // 未弹入不渲染
        // 弹入：3f scale 1.06→1（强 ease-out）+ 加深脉冲
        const pop = ramp(frame, start, POP, EASE.snappy);
        const popScale = 1.06 - 0.06 * pop;
        const pulse = 0.3 * (1 - pop);
        return (
          <div key={i} style={{
            position: 'absolute', inset: 0, zIndex: p.z, overflow: 'hidden',
            clipPath: p.clip,
            transform: `scale(${popScale})`,
            transformOrigin: `${p.centroidX}px 540px`,
          }}>
            <SpeedBlur vx={p.vx} amount={0.12} max={22}>
              <div style={{
                position: 'absolute', left: 0, top: 0, width: 1920, height: 1080,
                transform: camTransform(p.cam), transformOrigin: '0 0',
              }}>
                <FakeDashboard variant="A" />
              </div>
            </SpeedBlur>
            {pulse > 0.005 && (
              <div style={{ position: 'absolute', inset: 0, background: `rgba(16,18,26,${pulse})` }} />
            )}
          </div>
        );
      })}
      {(seam1O > 0.005 || seam2O > 0.005) && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
          <SpeedBlur vx={seamV} amount={0.08} max={16}>
            <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <filter id="seamSoft" x="-50%" y="-10%" width="200%" height="120%">
                  <feGaussianBlur stdDeviation="7" />
                </filter>
              </defs>
              {seam1O > 0.005 && <g opacity={seam1O}>{seam(750, 520, 's1')}</g>}
              {seam2O > 0.005 && <g opacity={seam2O}>{seam(e3Top - 5, e3Bot - 5, 's2')}</g>}
            </svg>
          </SpeedBlur>
        </div>
      )}
      <Vignette strength={0.12} inner={0.55} color="#1a1c24" style={{ zIndex: 6 }} />
      <Grain opacity={0.05} style={{ zIndex: 7 }} />
    </AbsoluteFill>
  );
};
