// page-waterfall-wall —— 页面瀑布墙：真实页面截图切片排成 3 列，在后仰墙面上差速反向无限滚动，
// 外层镜头缓推，做"内容多到流不完"的一览。
// 质感层（改版）：
// · 素材只用卡片级切片（card1–10，列间不复用）；原先混入的整页空白截图 projects-empty 与
//   2032×88 的搜索条细长切片在墙里读作空白卡 / 碎条，已去掉
// · 3 列 420px 列宽、整墙收进画内（原 560 列宽 × 1.2 两侧列被画框切掉一半，左右列文字透视歪斜严重）
// · 墙的放大与缓推改走 CSS zoom（布局级缩放），切片文字按显示尺寸栅格化（Q2），不再被放大发软
// · 纯色 #101014 + 实色渐变遮罩换成：冷调暗场柔光底（墙后一团微弱靛蓝余光）+ 上下羽化
//   （渐变取底色上下缘的实际色）+ 顶部远端轻微压暗（空气透视）+ 暗角 + 颗粒
// · 切片卡加发丝线与顶部受光沿，投影改两层（接触影 + 环境影）
// 素材路径统一读 textures/live/（与工作台 / 模板 public 一致）。
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop, Grain } from '../../_fixtures/Polish';
import { VerticalTicker, TickerColumn } from './VerticalTicker';

export const PAGE_WATERFALL_WALL_DURATION = 150; // 5s（无限循环体，按段落需要裁）

const BG = '#0d0e13';
const ZOOM = 1.2; // 补透视收缩的底值（配方 scale 1.2）
const PUSH = 0.06; // 镜头缓推 1→1.06

const shot = (file: string) => (
  <div
    style={{
      position: 'relative',
      borderRadius: 20,
      overflow: 'hidden',
      background: '#fefcf9',
      boxShadow: '0 2px 4px rgba(0,0,0,0.35), 0 22px 48px -12px rgba(0,0,0,0.6)',
    }}
  >
    <Img src={staticFile(`textures/live/${file}`)} style={{ width: '100%', display: 'block' }} />
    {/* 发丝线 + 顶部受光沿（裁在圆角内） */}
    <div
      style={{
        position: 'absolute', inset: 0, borderRadius: 20, pointerEvents: 'none',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
    />
  </div>
);

// 3 列差速反向（配方卡参数：loop 12/9/14s，中列反向）；10 张卡片切片 4/3/3 分配，列间不复用
export const buildColumns = (loops: [number, number, number]): TickerColumn[] => [
  {
    items: ['card1.png', 'card2.png', 'card3.png', 'card10.png'].map(shot),
    durationInSeconds: loops[0],
    direction: -1,
  },
  {
    items: ['card4.png', 'card5.png', 'card6.png'].map(shot),
    durationInSeconds: loops[1],
    direction: 1,
  },
  {
    items: ['card7.png', 'card8.png', 'card9.png'].map(shot),
    durationInSeconds: loops[2],
    direction: -1,
  },
];

// 上下羽化：渐变色取暗场底在上 / 下缘的实际色（远端顶部羽化更长），行软进软出
const FADE_TOP = 'linear-gradient(to bottom, #111319 0%, rgba(17,19,25,0.85) 10%, rgba(17,19,25,0) 30%)';
const FADE_BOTTOM = 'linear-gradient(to top, #08090c 0%, rgba(8,9,12,0.8) 8%, rgba(8,9,12,0) 22%)';

const Wall: React.FC<{ loops: [number, number, number]; zoom: number }> = ({ loops, zoom }) => (
  <AbsoluteFill>
    {/* zoom 让墙按显示尺寸布局与栅格化；内部 1920/zoom 宽的 css 画布居中排 3 列 */}
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920 / zoom, height: 1080 / zoom, zoom }}>
      <VerticalTicker columns={buildColumns(loops)} backgroundColor="transparent" maskHeight={0} scale={1} columnWidth={420} gap={26} />
    </div>
    {/* 空气透视：墙的远端（画面上部）轻微压暗 */}
    <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(13,14,19,0.5) 0%, rgba(13,14,19,0) 50%)', pointerEvents: 'none' }} />
    <AbsoluteFill style={{ background: FADE_TOP, pointerEvents: 'none' }} />
    <AbsoluteFill style={{ background: FADE_BOTTOM, pointerEvents: 'none' }} />
  </AbsoluteFill>
);

export const PageWaterfallWall: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // 镜头缓推寄生在外层，墙自身循环、镜头单向（线性铺满全镜，配方定义）
  const push = interpolate(frame, [0, durationInFrames], [1, 1 + PUSH], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.42 }} accent="#5b63d3" grain={0} vignette={0} />
      <Wall loops={[12, 9, 14]} zoom={ZOOM * push} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(5,6,10,0) 55%, rgba(5,6,10,0.55) 100%)', pointerEvents: 'none' }} />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};

// 接缝自检用：短 loop（3s=90f）、无镜头推，f0 与 f90 应逐像素一致
export const SeamTest: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BG }}>
    <Wall loops={[3, 3, 3]} zoom={ZOOM} />
  </AbsoluteFill>
);
