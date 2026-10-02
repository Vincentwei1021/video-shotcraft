// grid-flash-mosaic —— 九宫格闪切
// 深色墙 → f25 起 3×3 网格按十六分音符(每 2f)逐格啪啪硬入(顺序 h(i) 打乱)，
// 每格 = 同一产品 dashboard 的不同区域裁切（亮 / 暗两套皮肤交错）；入格 3f scale 1.18→1 + 2f 加深脉冲。
// 填满后停 14f(整墙微呼吸 1.008) → 中心格 14f Easing.in(cubic) 放大吞掉全屏
// 成为满屏页面。收尾真静止 ≥40f。
// 质感：格子落在带色相的深色墙上（12px 暗缝 + 3px 深色描边分格），裁切全部对准真实模块
// （指标卡 / 列表行 / 柱状图 / 热力图），亮暗皮肤棋盘交错让墙有节奏；吞屏时其余格同步压暗
// 退后，给中心格让出纵深；吞屏完成后摘罩，满屏页面走 CSS zoom 直出（字边锐利、描边彻底卸载）。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, Grain, Vignette, ramp } from '../../_fixtures/Polish';

export const GRID_FLASH_MOSAIC_DURATION = 140; // 铺垫 25f + 填墙 19f + 呼吸 14f + 吞屏 14f + 真静止 68f

const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const CELL_W = 600;
const CELL_H = 340;
const GAP = 12;
const BORDER = 3;
const GRID_X = (1920 - (CELL_W * 3 + GAP * 2)) / 2; // 48
const GRID_Y = (1080 - (CELL_H * 3 + GAP * 2)) / 2; // 18
const INK = '#0e0f13'; // 描边：与暗缝同色系的深墨

const FILL_START = 25; // 第一格落下
const STEP = 2; // 十六分音符：每 2f 一格
// 打乱顺序：索引按 h(i+1) 排序
const ORDER = Array.from({ length: 9 }, (_, i) => i).sort((a, b) => h(a + 1) - h(b + 1));
const RANK: number[] = [];
ORDER.forEach((cell, k) => (RANK[cell] = k));

const LAST_IN = FILL_START + 8 * STEP + 3; // 最后一格入格动画结束 f44
const HOLD_END = LAST_IN + 14; // 整墙呼吸段结束 f58
const ZOOM_DUR = 14;
const ZOOM_END = HOLD_END + ZOOM_DUR; // f72，之后真静止

// 中心格内是整页 FakeDashboard 缩小版(0.3125)，放大后正好成为满屏页面
const MINI_SCALE = CELL_W / 1920; // 0.3125
// 3.2 恰好铺满；加到 3.28 让格子的深色描边完全滑出画外，收尾满屏页面干净
const ZOOM_SCALE = 3.28;
const MINI_TOP = (CELL_H - 1080 * MINI_SCALE) / 2;

// 摘罩后的满屏页面几何：与吞屏终帧逐像素一致（缩略页原点经 3.28 绕屏心放大后的位置）
const MINI_OX = GRID_X + CELL_W + GAP + BORDER;
const MINI_OY = GRID_Y + CELL_H + GAP + BORDER + MINI_TOP;
const END_SCALE = MINI_SCALE * ZOOM_SCALE;
const END_X = 960 + ZOOM_SCALE * (MINI_OX - 960);
const END_Y = 540 + ZOOM_SCALE * (MINI_OY - 540);

// 非中心格：FakeDashboard 裁切（页面坐标里取景框左上角 x/y + 变体 + 皮肤），对准真实模块；
// 指标卡裁切左右各留 35px 让卡片居中（卡宽 524 / 格内宽 594）
type Crop = { x: number; y: number; v: 'A' | 'B'; tone: 'light' | 'dark' };
const CROPS: Array<Crop | null> = [
  { x: 221, y: 88, v: 'A', tone: 'light' }, //   Active users 指标 + 曲线
  { x: 250, y: 280, v: 'B', tone: 'dark' }, //   列表行：Edge cache rollout / Billing v2
  { x: 1325, y: 88, v: 'A', tone: 'light' }, //  Revenue 柱状图
  { x: 221, y: 570, v: 'A', tone: 'dark' }, //   Quarterly goals 进度
  null, //                                       中心格(单独处理)
  { x: 1325, y: 570, v: 'A', tone: 'light' }, // Sessions 曲线
  { x: 1000, y: 92, v: 'B', tone: 'light' }, //  列表行：sparkline + 数值
  { x: 773, y: 570, v: 'A', tone: 'dark' }, //   Deploys 热力图
  { x: 1320, y: 470, v: 'B', tone: 'light' }, // 列表行：截止日 + 进度条
];

const CellContent: React.FC<{ i: number }> = ({ i }) => {
  if (i === 4) {
    // 中心格：整页 dashboard 缩到格内
    return (
      <div style={{ position: 'absolute', left: 0, top: MINI_TOP, transform: `scale(${MINI_SCALE})`, transformOrigin: 'top left' }}>
        <FakeDashboard variant="A" />
      </div>
    );
  }
  const crop = CROPS[i] as Crop;
  // 裁切片：整页 dashboard 以不同偏移塞进格子(相当于 backgroundPosition 各异)
  return (
    <div style={{ position: 'absolute', left: -crop.x, top: -crop.y }}>
      <FakeDashboard variant={crop.v} tone={crop.tone} />
    </div>
  );
};

export const GridFlashMosaic: React.FC = () => {
  const f = useCurrentFrame();

  // ===== 摘罩：吞屏完成后满屏页面直出（CSS zoom 栅格化），网格结构全部卸载 =====
  if (f >= ZOOM_END) {
    return (
      <div style={{ width: 1920, height: 1080, background: '#0f1014', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', zoom: END_SCALE, left: END_X / END_SCALE, top: END_Y / END_SCALE, width: 1920, height: 1080 }}>
          <FakeDashboard variant="A" />
        </div>
        <Vignette strength={0.12} inner={0.55} color="#1a1c24" />
        <Grain opacity={0.045} />
      </div>
    );
  }

  // 整墙微呼吸：仅在填满后的 14f 停顿段，一个正弦来回 1→1.008→1
  const breath = f >= LAST_IN && f < HOLD_END ? 1 + 0.008 * Math.sin((Math.PI * (f - LAST_IN)) / 14) : 1;

  // 中心格放大：14f Easing.in(cubic)，吞掉全屏
  const zoom = interpolate(f, [HOLD_END, ZOOM_END], [1, ZOOM_SCALE], {
    easing: Easing.in(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // 其余格随吞屏压暗退后
  const recede = ramp(f, HOLD_END, ZOOM_DUR, EASE.swift);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.42 }} vignette={0.55} grain={0} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${breath})`, transformOrigin: '960px 540px' }}>
        {Array.from({ length: 9 }).map((_, i) => {
          const start = FILL_START + RANK[i] * STEP;
          if (f < start) return null; // 硬入：未到拍点不渲染，无淡化
          const row = Math.floor(i / 3);
          const col = i % 3;
          // 入格 3f scale 1.18→1（强 ease-out：第一帧就砸到位附近，"啪"）
          const popScale = 1.18 - 0.18 * ramp(f, start, 3, EASE.snappy);
          // 2f 加深脉冲
          const darken = interpolate(f, [start, start + 2], [0.45, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const isCenter = i === 4;
          const cellScale = isCenter ? popScale * zoom : popScale;
          const dim = isCenter ? 0 : 0.42 * recede;
          const shade = Math.max(darken, dim);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: GRID_X + col * (CELL_W + GAP),
                top: GRID_Y + row * (CELL_H + GAP),
                width: CELL_W,
                height: CELL_H,
                overflow: 'hidden',
                borderRadius: 4,
                background: CROPS[i]?.tone === 'dark' ? '#16171c' : '#f1f1ef',
                border: `${BORDER}px solid ${INK}`,
                boxSizing: 'border-box',
                transform: `scale(${cellScale})`,
                transformOrigin: 'center',
                zIndex: isCenter ? 10 : 1,
                boxShadow: isCenter && zoom > 1.001 ? '0 30px 80px -20px rgba(0,0,0,0.6)' : '0 10px 30px -14px rgba(0,0,0,0.5)',
              }}
            >
              <CellContent i={i} />
              {shade > 0.001 && <div style={{ position: 'absolute', inset: 0, background: '#0b0c10', opacity: shade }} />}
            </div>
          );
        })}
      </div>
      <Grain opacity={0.07} blend="soft-light" />
    </div>
  );
};
