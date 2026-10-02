// overhead-tabletop-drop｜上帝视角桌面滑降
// perspective(1600px) 内三张"页面卡"rotateX(62°) 平躺成桌面卡阵。
// 0–55f 相机横向滑过（只动 translateX，缓入缓出）；44–58f 目标卡被"拾起"一点
// （离桌 14px、影子变大变虚——巡视一圈，就选这张）；55–85f 骤降扎入：
// rotateX 62→−1.8 / 世界 scale 1→2.04 / translateX −650→0 三者同跑，零速起步（scale 带
// ~5% 预备回缩：先抬一下机位再扎），85–93f 软回 0° / 2.0 正视满屏 dashboard，目标卡同时
// 落回桌面槽位。全部动画 f=93 结束，收尾真静止 47f。
// 卡片 996×560（落版 scale 2.0 恰满屏 16:9）。Q2：卡片按落版尺寸 1992×1120 布局栅格化、
// 再在平面内 scale(0.5) 摆上桌，扎入满屏时文字是原生分辨率而非 2 倍放大糊字。
// 桌面：暖中性哑光台面 + 发丝网格 + 世界内顶灯光池；屏幕空间远端薄雾 + 暗角 + 颗粒。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FakeDashboard, Card, G } from '../../_fixtures/Fixtures';
import { EASE, Grain, Vignette, bezier, mix, ramp, softShadow } from '../../_fixtures/Polish';

export const OVERHEAD_TABLETOP_DROP_DURATION = 140; // 93f 动作 + 47f 真静止

const CARD_W = 996;
const CARD_H = 560;
const GAP = 140;
const PITCH = CARD_W + GAP; // 1136
const RES = 2; // 卡片按落版倍率布局（1992×1120）后平面内缩回 0.5
const INNER = (CARD_H * RES) / 1080; // 1.037：FakeDashboard 在 2x 卡内铺满

const PAN_END = 55;
const DROP_END = 85;
const SETTLE_END = 93;

// 扎入主曲线：零速起步、快速加速、长减速落位（不从 pan 的静止直接跳到最大速度）
const DIVE = bezier(0.36, 0, 0.12, 1);
// scale 用带预备的同形曲线：先回缩 ~5%（机位微抬）再扎下去
const DIVE_SCALE = bezier(0.45, -0.18, 0.12, 1);

// 单张"页面卡"：平躺在桌面上；lift = 离桌高度（px，沿桌面法线）
const PageCard: React.FC<{ x: number; lift?: number; children: React.ReactNode }> = ({ x, lift = 0, children }) => (
  <div
    style={{
      position: 'absolute',
      left: x - (CARD_W * RES) / 2,
      top: -(CARD_H * RES) / 2,
      width: CARD_W * RES,
      height: CARD_H * RES,
      background: G.card,
      border: `${RES}px solid rgba(20,22,28,0.1)`, // 缩回后即 1px 发丝线
      borderRadius: 14 * RES,
      overflow: 'hidden',
      boxSizing: 'border-box',
      // 桌面上的两层软影（随离桌高度变大变虚）：卡片自身平面上渲染 = 投在桌面上
      boxShadow: softShadow((4 + lift * 1.6) * RES, { strength: 1.15, color: '#2a2a24' }),
      backfaceVisibility: 'hidden',
      transform: `translateZ(${4 + lift}px) scale(${1 / RES})`,
    }}
  >
    <div style={{ width: 1920, height: 1080, zoom: INNER }}>{children}</div>
  </div>
);

export const OverheadTabletopDrop: React.FC = () => {
  const f = useCurrentFrame();

  // 0–55f 横滑：只动 translateX，缓入缓出（角度锁死——巡视归巡视）
  const panX = mix(700, -650, ramp(f, 0, PAN_END, EASE.smooth));

  // 55–85f 骤降：三通道同起同止
  const d = ramp(f, PAN_END, DROP_END - PAN_END, DIVE);
  const ds = ramp(f, PAN_END, DROP_END - PAN_END, DIVE_SCALE);
  // 过冲：到 f85 角度冲到 −1.8°、scale 冲到 2.04（速度在此归零），再 smooth 收回
  const rotX = f < DROP_END
    ? mix(62, -1.8, d)
    : f < 89
      ? mix(-1.8, 0.6, ramp(f, DROP_END, 4, EASE.smooth))
      : mix(0.6, 0, ramp(f, 89, 4, EASE.smooth));
  const scale = f < DROP_END ? mix(1, 2.04, ds) : mix(2.04, 2.0, ramp(f, DROP_END, SETTLE_END - DROP_END, EASE.smooth));
  const tx = f <= PAN_END ? panX : mix(-650, 0, d);

  // 目标卡拾起：pan 将停时离桌 14px，扎入后半程落回槽位（落版严丝合缝）
  const lift = 14 * (ramp(f, 44, 14, EASE.out) - ramp(f, 68, 20, EASE.smooth));
  // 远端薄雾：桌面倾斜越大越重（空气透视，把远处压扁闪烁的网格化进背景）
  const tilt = Math.max(0, Math.min(1, rotX / 62));

  return (
    <AbsoluteFill style={{ background: '#e4e3df', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, perspective: 1600, perspectiveOrigin: '50% 42%' }}>
        {/* 世界原点 = 屏心；先 in-plane scale，再 rotateX，最后 translateX */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            transform: `translateX(${tx}px) rotateX(${rotX}deg) scale(${scale})`,
          }}
        >
          {/* 桌面：暖中性哑光台面 + 发丝网格（细 80 / 粗 400）+ 顶灯光池（落在目标卡一带） */}
          <div
            style={{
              position: 'absolute',
              left: -2800,
              top: -3200, // 远端一直铺到地平线附近，不露"桌子尽头"那条硬边
              width: 5600,
              height: 4100,
              background: [
                'radial-gradient(ellipse 1500px 900px at 2800px 3200px, rgba(255,255,252,0.75) 0%, rgba(255,255,252,0) 70%)',
                'radial-gradient(ellipse 2600px 1300px at 2800px 3200px, rgba(0,0,0,0) 40%, rgba(40,38,30,0.16) 100%)',
                'repeating-linear-gradient(90deg, rgba(30,30,24,0.075) 0px, rgba(30,30,24,0.075) 1px, transparent 1px, transparent 400px)',
                'repeating-linear-gradient(0deg, rgba(30,30,24,0.075) 0px, rgba(30,30,24,0.075) 1px, transparent 1px, transparent 400px)',
                'repeating-linear-gradient(90deg, rgba(30,30,24,0.035) 0px, rgba(30,30,24,0.035) 1px, transparent 1px, transparent 80px)',
                'repeating-linear-gradient(0deg, rgba(30,30,24,0.035) 0px, rgba(30,30,24,0.035) 1px, transparent 1px, transparent 80px)',
                'linear-gradient(180deg, #e6e5e0, #dddcd6)',
              ].join(', '),
              backfaceVisibility: 'hidden',
            }}
          />
          <PageCard x={-PITCH}>
            <FakeDashboard variant="B" />
          </PageCard>
          {/* 目标页：落版满屏 */}
          <PageCard x={0} lift={lift}>
            <FakeDashboard variant="A" />
          </PageCard>
          <PageCard x={PITCH}>
            <div
              style={{
                width: 1920,
                height: 1080,
                background: G.canvas,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Card w={760} h={520} seed={4} />
            </div>
          </PageCard>
        </div>
      </div>
      {/* 屏幕空间：远端（画面上部）薄雾随俯角收起；暗角 + 颗粒统一质感 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(180deg, rgba(236,235,231,${(0.92 * tilt).toFixed(3)}) 0%, rgba(236,235,231,${(0.5 * tilt).toFixed(3)}) 22%, rgba(236,235,231,0) 46%)`,
        }}
      />
      <Vignette strength={0.06 + 0.18 * tilt} inner={0.5} color="#2a2822" />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};
