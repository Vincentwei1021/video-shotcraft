// picker-carousel-feature-cycle — Picker Carousel 功能名吸附轮播（motion-lab 定稿转原生 Remotion）
// 移动端风竖向选择器：焦点药丸不动、内容穿过它，每项停靠 0.45s 且带明显 outQuint
// 减速吸附 + 4–5 帧静止；按到中心距离分层控制 opacity/字号/灰度，落定时药丸做
// scaleY 1→1.06→1 极轻呼吸，左外侧固定方形 AI 徽标。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 质感升级：纸面底加一处柔和顶光 + 极弱暗角颗粒；unicode 杂牌符号换成同一套 1.5 描边线性图标
// （焦点行图标用唯一强调色）；药丸补顶沿内高光 + 两层软影；走位快段给列表纵向速度拖影
// （吸附减速段自动归零）；AI 徽标改深色渐变 + 内高光 + 小星芒。时间轴与参数表数值不变。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { FONT, Grain, SpeedBlur, Vignette } from '../../_fixtures/Polish';

export const PICKER_CAROUSEL_FEATURE_CYCLE_DURATION = 108; // 3600ms @30fps

const PAPER = '#F3F3F1';
const INK = '#111113';
const MID = '#8A8A8F';
const ROW_H = 34; // 单行高度
const ITEMS = [
  'Data Cleanup',
  'Direct Message',
  'Smart Segments',
  'Batch Actions',
  'Reward Program',
  'Automated Flows',
  'Variant Testing',
];
const ACCENT = '#5b63d3';
// 16 网格线性图标（与 ITEMS 一一对应）：清理 / 私信 / 分群 / 批量 / 奖励 / 自动流 / 对照实验
const ICONS: string[][] = [
  ['M3 13 9.5 6.5', 'M10.5 2.5v2', 'M13.5 5.5h-2', 'M12.6 3.4l-1.3 1.3', 'M7.5 4.5 8 3l.5 1.5L10 5l-1.5.5L8 7l-.5-1.5L6 5z'],
  ['M3 4.75c0-.7.55-1.25 1.25-1.25h7.5c.7 0 1.25.55 1.25 1.25v5c0 .7-.55 1.25-1.25 1.25H7.5L4.5 13v-2h-.25C3.55 11 3 10.45 3 9.75z'],
  ['M8 2.75a5.25 5.25 0 1 0 5.25 5.25H8z', 'M10 2.9A5.3 5.3 0 0 1 13.1 6H10z'],
  ['M8 2.5 13.5 5.5 8 8.5 2.5 5.5z', 'm2.5 8.25 5.5 3 5.5-3', 'm2.5 10.75 5.5 3 5.5-3'],
  ['m8 2.5 1.7 3.45 3.8.55-2.75 2.7.65 3.8L8 11.2 4.6 13l.65-3.8L2.5 6.5l3.8-.55z'],
  ['M8.75 2 3.75 9h4l-.5 5 5-7h-4z'],
  ['M6.25 2.5h3.5', 'M6.75 2.5v3.75L3.4 12.1c-.4.7.1 1.4.9 1.4h7.4c.8 0 1.3-.7.9-1.4L9.25 6.25V2.5', 'M5 9.5h6'],
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
        {/* 左外侧固定 AI 徽标：黑底白字方形圆角，开头略滞后淡入 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            margin: '-11px 0 0 -186px',
            width: 26,
            height: 22,
            borderRadius: 6,
            background: 'linear-gradient(160deg, #2a2b31 0%, #111113 100%)',
            boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.22), 0 0 0 0.5px rgba(0,0,0,0.5), 0 2px 5px -1px rgba(16,18,24,0.25)',
            color: '#fff',
            gap: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 10,
            lineHeight: 1,
            letterSpacing: 0.3,
            opacity: seg(t, 0.02, 0.09),
          }}
        >
          <svg width={5} height={5} viewBox="0 0 10 10" style={{ display: 'block', marginTop: -3 }}>
            <path d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8z" fill="#a9afff" />
          </svg>
          AI
        </div>
        <Vignette strength={0.12} inner={0.5} color="#2a2c36" />
        <Grain opacity={0.045} scale={0.25} />
      </div>
    </DesignStage>
  );
};
