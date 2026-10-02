// picker-carousel-feature-cycle — Picker Carousel 功能名吸附轮播（motion-lab 定稿转原生 Remotion）
// 移动端风竖向选择器：焦点药丸不动、内容穿过它，每项停靠 0.45s 且带明显 outQuint
// 减速吸附 + 4–5 帧静止；按到中心距离分层控制 opacity/字号/灰度，落定时药丸做
// scaleY 1→1.06→1 极轻呼吸，左外侧固定方形 AI 徽标。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 质感升级：纸面底加一处柔和顶光 + 极弱暗角颗粒；unicode 杂牌符号换成同一套 1.5 描边线性图标
// （焦点行图标用唯一强调色）；药丸补顶沿内高光 + 两层软影；走位快段给列表纵向速度拖影
// （吸附减速段自动归零）；AI 徽标改深色渐变 + 内高光 + 小星芒。时间轴与参数表数值不变。
// 品牌轮：7 条占位功能名换成 video-shotcraft 的真实功能（镜头配方卡 → 实拍 → 运镜 → 踩点 → 音效 →
// 工作台 → 渲染），图标同套重画；左侧 "AI" 徽标换成深底 app 图标里的「镜刻」标志。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { FONT, Grain, SpeedBlur, Vignette } from '../../_fixtures/Polish';
import { ShotcraftMark } from '../../_fixtures/Brand';

export const PICKER_CAROUSEL_FEATURE_CYCLE_DURATION = 108; // 3600ms @30fps

const PAPER = '#F3F3F1';
const INK = '#111113';
const MID = '#8A8A8F';
const ROW_H = 34; // 单行高度
const ITEMS = [
  'Shot recipe cards',
  'Real page captures',
  '2.5D camera moves',
  'Beat-synced cuts',
  'Film-grade SFX',
  'Motion workbench',
  'Remotion render',
];
const ACCENT = '#5b63d3';
// 16 网格线性图标（与 ITEMS 一一对应）：配方卡 / 截图取景 / 摄影机 / 节拍 / 扬声器 / 调参滑杆 / 渲染播放
const ICONS: string[][] = [
  ['M4 2.5h8c.55 0 1 .45 1 1v9c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1v-9c0-.55.45-1 1-1z', 'M5.75 5.75h4.5', 'M5.75 8h4.5', 'M5.75 10.25h2.5'],
  ['M2.5 5.5v-3h3', 'M10.5 2.5h3v3', 'M13.5 10.5v3h-3', 'M5.5 13.5h-3v-3', 'M5.5 6h5v4h-5z'],
  ['M3.25 5h6c.4 0 .75.35.75.75v4.5c0 .4-.35.75-.75.75h-6c-.4 0-.75-.35-.75-.75v-4.5c0-.4.35-.75.75-.75z', 'M10 7.25 13.5 5.5v5L10 8.75'],
  ['M3 7v2', 'M5.5 4.5v7', 'M8 2.5v11', 'M10.5 5.5v5', 'M13 7v2'],
  ['M2.5 6.25h2.25L8 3.5v9L4.75 9.75H2.5z', 'M10.5 6a2.8 2.8 0 0 1 0 4', 'M12.25 4.25a5.3 5.3 0 0 1 0 7.5'],
  ['M2.5 4.5h11', 'M2.5 11.5h11', 'M5.5 2.5v4', 'M10.5 9.5v4'],
  ['M3.5 3h9c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1h-9c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1z', 'M6.75 6v4l3.25-2z'],
];
const Icon: React.FC<{ d: string[]; color: string }> = ({ d, color }) => (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
    {d.map((p, i) => (
      <path key={i} d={p} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </svg>
);
const STEPS = 5; // 五次吸附推进
const HOLD = 5 / 14; // 每步末段静止占比（≈4–5 帧不动）

export const PickerCarouselFeatureCycle: React.FC = () => {
  const t = useT();

  // 主时间轴：t∈[0.05,0.95] 均分 5 步；步内前 (1-HOLD) 用 outQuint 吸附，末段静止
  const g = seg(t, 0.05, 0.95) * STEPS;
  const step = Math.min(STEPS - 1, Math.floor(g));
  const local = Math.min(1, g - step);
  const mv = E.outQuint(Math.min(1, local / (1 - HOLD)));
  const pos = step + mv;
  // 列表纵向速度（设计 px/帧）：走位快段给一点竖向拖影，减速吸附与静止段自动归零
  const posAt = (tt: number) => {
    const gg = seg(tt, 0.05, 0.95) * STEPS;
    const st = Math.min(STEPS - 1, Math.floor(gg));
    const lo = Math.min(1, gg - st);
    return st + E.outQuint(Math.min(1, lo / (1 - HOLD)));
  };
  const dt = 0.5 / (PICKER_CAROUSEL_FEATURE_CYCLE_DURATION - 1);
  const vy = -(posAt(t + dt) - posAt(t - dt)) * ROW_H;

  // 落定呼吸：吸附完成进入 HOLD 后，药丸 scaleY 1→1.06→1 极轻脉冲
  const land = Math.max(0, (local - (1 - HOLD)) / HOLD);
  const breath = land > 0 ? Math.sin(Math.min(1, land / 0.6) * Math.PI) * 0.06 : 0;

  return (
    <DesignStage bg={PAPER} raster="zoom">
      {/* 纸面底 —— 与原采集页 paper() 容器一致 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          background: `radial-gradient(ellipse 70% 80% at 46% 30%, #f8f8f6 0%, rgba(248,248,246,0) 70%), linear-gradient(180deg, #f4f4f2 0%, ${PAPER} 55%, #eeeeeb 100%)`,
          fontFamily: FONT.sans,
        }}
      >
        {/* 药丸身后的一抹落地光：把"焦点行"从纸面上托起来（只在中心一处） */}
        <div
          style={{
            position: 'absolute',
            left: 240 - 190,
            top: 135 - 40,
            width: 380,
            height: 80,
            background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
            opacity: seg(t, 0, 0.05),
          }}
        />
        {/* 选择器视口：300×(34×5) 居中，整体在开头 5% 内淡入 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 300,
            height: ROW_H * 5,
            transform: 'translate(-50%,-50%)',
            overflow: 'hidden',
            opacity: seg(t, 0, 0.05),
            // 上下各 26% 渐隐：改用 alpha 遮罩（不再叠纸色色块），底色是渐变也不会露出边界带
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 26%, #000 74%, transparent 100%)',
            maskImage: 'linear-gradient(180deg, transparent 0%, #000 26%, #000 74%, transparent 100%)',
          }}
        >
          {/* 焦点药丸：位置不动，仅落定时 scaleY 呼吸。
              原采集页是 content-box，带 1px 边框需显式声明，否则高度差 2px */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: ROW_H * 2,
              height: ROW_H,
              boxSizing: 'content-box',
              borderRadius: 999,
              background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)',
              border: '1px solid #E3E3E6',
              // 顶沿内高光 + 近地实影 + 远地虚影（主光在上）
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 0.5px 1px rgba(16,18,24,.06), 0 3px 9px -2px rgba(16,18,24,.09), 0 10px 22px -10px rgba(16,18,24,.12)',
              transform: `scaleY(${1 + breath})`,
            }}
          />
          {/* 内容列：整列 translateY 穿过焦点药丸；快段带纵向速度拖影 */}
          <SpeedBlur vx={0} vy={vy} amount={0.06} max={0.8}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              transform: `translateY(${ROW_H * 2 - pos * ROW_H}px)`,
            }}
          >
            {ITEMS.map((txt, i) => {
              // 按到中心距离分层：透明度两段线性、字号 17→14、颜色三档灰度
              const d = Math.abs(i - pos);
              const k2 = Math.min(2, d);
              const o = k2 <= 1 ? lerp(k2, 1, 0.55) : lerp(k2 - 1, 0.55, 0.18);
              return (
                <div
                  key={i}
                  style={{
                    height: ROW_H,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontWeight: 600,
                    fontSize: lerp(Math.min(1, d / 2), 17, 14),
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                    color: d < 0.5 ? INK : d < 1.5 ? MID : '#B9B9BE',
                    opacity: o,
                  }}
                >
                  {/* 图标仅在贴近焦点时浮现（d<0.625 内可见），焦点行用唯一强调色 */}
                  <span style={{ opacity: Math.max(0, 1 - d * 1.6), marginTop: 0.5 }}>
                    <Icon d={ICONS[i]} color={ACCENT} />
                  </span>
                  <span>{txt}</span>
                </div>
              );
            })}
          </div>
          </SpeedBlur>
        </div>
        {/* 左外侧固定 app 图标：深色方形圆角里放 video-shotcraft「镜刻」标志（反白版），开头略滞后淡入 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            margin: '-12px 0 0 -186px',
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'linear-gradient(160deg, #2a2b31 0%, #111113 100%)',
            boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.22), 0 0 0 0.5px rgba(0,0,0,0.5), 0 2px 5px -1px rgba(16,18,24,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: seg(t, 0.02, 0.09),
          }}
        >
          <ShotcraftMark size={16} tone="dark" />
        </div>
        <Vignette strength={0.12} inner={0.5} color="#2a2c36" />
        <Grain opacity={0.045} scale={0.25} />
      </div>
    </DesignStage>
  );
};
