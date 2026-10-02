import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, Grain, mix, ramp } from '../../_fixtures/Polish';

// drone-dive-landing：上帝视角俯视整页平躺的 dashboard（近垂直俯角、缩小居中），
// 相机猛扎下来——俯角抬平、页面放大立正，最后一段气垫式长尾减速，
// 稳稳停在 hero 卡正前方特写。FPV 无人机俯冲降落的运镜翻译。
//
// 改版要点：页面不再是悬在空白里的一张薄片——它悬停在一块点阵地面之上
// （地面与页面同处一个 3D 世界，俯冲时点阵向镜头涌来给速度参照），地面上
// 有同形接触影，随"降落"收紧变实；俯冲前有 ~2.5% 的上提预备；落定后
// 周边轻压暗、焦点收到 hero 卡，并留 1.2s 呼吸。
//
// hero 卡 = FakeDashboard A 网格左上格：
// 侧栏 220 + padding 36 = x 256 起，列宽 (1628-56)/3 = 524；
// 顶栏 72 + padding 36 = y 108 起，行高 (936-28)/2 = 454。
// 卡中心 (256+262, 108+227) = (518, 335)，全程 transform-origin 钉在这里。
const HERO = { cx: 518, cy: 335, w: 524, h: 454 };
const DIVE_START = 24; // 开头 24f：上帝视角建立 + 上提预备
const DIVE_END = 49; // 主俯冲段 25f，ease-in(cubic) 越冲越快
const LAND_END = 69; // 气垫段 20f，ease-out(quint) 长尾减速，之后真静止
const DIVE_SHARE = 0.82; // 俯冲段吃掉 82% 行程，剩 18% 留给气垫
const PRE_LIFT = 0.025; // 俯冲前相机上提（行程倒退 2.5%）：大动作前的预备
export const DRONE_DIVE_LANDING_DURATION = 105; // 落定后 hold 36f（1.2s）

// 页面按终点放大倍数布局（CSS zoom），再整体 scale(1/Z) 缩回：
// 3D 合成层按 1.35 倍分辨率栅格化，终点特写的文字不糊（审美准则 Q2）
const Z = 1.35;
const LIFT = 150; // 起始悬停高度（页面局部 px，经世界 scale 后约 60px）

// 一条行程 p：预备（-2.5%）→ 俯冲 → 气垫
const travel = (frame: number) => {
  const pre = -PRE_LIFT * ramp(frame, 4, DIVE_START - 4, EASE.smooth);
  if (frame < DIVE_START) return pre;
  const pDive = interpolate(frame, [DIVE_START, DIVE_END], [-PRE_LIFT, DIVE_SHARE], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  if (frame < DIVE_END) return pDive;
  return (
    DIVE_SHARE +
    interpolate(frame, [DIVE_END, LAND_END], [0, 1 - DIVE_SHARE], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.poly(5)),
    })
  );
};

// 地面点阵：以 hero 为中心铺开的大平面，径向渐隐到远处，不画出硬边
const FLOOR = { x: -2400, y: -1500, w: 6720, h: 3300 };
const floorStyle: React.CSSProperties = {
  position: 'absolute',
  left: FLOOR.x,
  top: FLOOR.y,
  width: FLOOR.w,
  height: FLOOR.h,
  backgroundImage: 'radial-gradient(circle at 3px 3px, rgba(40,44,60,0.34) 2.2px, rgba(40,44,60,0) 3.2px)',
  backgroundSize: '48px 48px',
  backgroundPosition: `${(-FLOOR.x) % 48}px ${(-FLOOR.y) % 48}px`,
  WebkitMaskImage: `radial-gradient(ellipse ${FLOOR.w * 0.36}px ${FLOOR.h * 0.42}px at ${-FLOOR.x + 960}px ${-FLOOR.y + 600}px, #000 30%, transparent 100%)`,
  maskImage: `radial-gradient(ellipse ${FLOOR.w * 0.36}px ${FLOOR.h * 0.42}px at ${-FLOOR.x + 960}px ${-FLOOR.y + 600}px, #000 30%, transparent 100%)`,
};

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const p = travel(frame);

  // 三轴联动，全部由同一条 p 驱动（同一台"相机"的一次连续机动）
  const rotX = mix(72, 0, p); // 俯角抬平
  const scale = mix(0.42, 1.35, p); // 缩小全景 → hero 特写
  // 平移：起点让整页平躺在画面中央；终点 hero 卡中心正对画面中心
  const tx = mix(256, 960 - HERO.cx, p);
  const ty = mix(170, 540 - HERO.cy, p);

  // 降落：悬停高度随行程收到 0（气垫段末尾正好触地）
  const lift = LIFT * Math.pow(1 - Math.min(1, Math.max(0, p)), 1.4);
  // 接触影：高时大而虚、偏下右（主光左上），落地时收干变实
  const shOff = lift * 0.22;
  const shBlur = 22 + lift * 0.42;
  const shOp = interpolate(p, [0, 0.9, 1], [0.16, 0.12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* 相机 = perspective 容器；地面 + 页面同处一个世界，绕 hero 卡中心做 rotateX + scale + translate */}
      <AbsoluteFill style={{ perspective: 1400 }}>
        <div
          style={{
            position: 'absolute',
            width: 1920,
            height: 1080,
            transformOrigin: `${HERO.cx}px ${HERO.cy}px`,
            transform: `translate(${tx}px, ${ty}px) rotateX(${rotX}deg) scale(${scale})`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* 地面点阵（俯冲时向镜头涌来 = 速度参照） */}
          <div style={{ ...floorStyle, opacity: 1 - 0.45 * Math.min(1, Math.max(0, p)) }} />
          {/* 地面接触影：页面同形，随降落收紧 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 1920,
              height: 1080,
              borderRadius: 18,
              background: 'rgba(22,24,34,1)',
              opacity: shOp,
              filter: `blur(${shBlur.toFixed(1)}px)`,
              transform: `translate3d(${(shOff * 0.5).toFixed(1)}px, ${shOff.toFixed(1)}px, 1px) scale(${(1 + lift * 0.0004).toFixed(4)})`,
            }}
          />
          {/* 页面本体：悬停在地面之上 lift 高度 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 1920,
              height: 1080,
              borderRadius: 16,
              overflow: 'hidden',
              transform: `translateZ(${lift.toFixed(2)}px)`,
              boxShadow: '0 0 0 1px rgba(20,22,28,0.10)',
            }}
          >
            <div style={{ width: 1920 * Z, height: 1080 * Z, transform: `scale(${1 / Z})`, transformOrigin: '0 0' }}>
              <div style={{ zoom: Z }}>
                <FakeDashboard variant="A" />
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 落定后的焦点：hero 卡外一圈轻压暗（屏幕空间，hero 已在画面中心），只在静止段出现
const Focus: React.FC = () => {
  const frame = useCurrentFrame();
  const k = ramp(frame, LAND_END - 6, 22, EASE.out);
  if (k <= 0) return null;
  // hero 卡在终点的屏幕尺寸 = 524×454 × 1.35
  const hw = (HERO.w * 1.35) / 2 + 40;
  const hh = (HERO.h * 1.35) / 2 + 40;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: k,
        background: `radial-gradient(${hw * 1.9}px ${hh * 1.9}px at 50% 50%, rgba(14,16,24,0) 48%, rgba(14,16,24,0.13) 100%)`,
      }}
    />
  );
};

export const DroneDiveLanding: React.FC = () => (
  <AbsoluteFill>
    {/* 背景静止，放在动态模糊之外：多重采样叠加大面积渐变会量化出色环 */}
    <Backdrop tone="light" light={{ x: 0.5, y: 0.12 }} grain={0} vignette={0.16} />
    <CameraMotionBlur shutterAngle={220} samples={12}>
      <Scene />
    </CameraMotionBlur>
    <Focus />
    {/* 颗粒放在动态模糊之外：不被多重采样平均掉 */}
    <Grain opacity={0.06} />
  </AbsoluteFill>
);
