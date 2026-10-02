import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { EASE, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';

// beat-cut-accelerando：六个不同构图按 16→12→8→6→4 帧递减间隔全屏硬切，
// 加速逼近，最后一切戛然定格回主画面并 1→1.06 慢推收住。
// 真硬切：frame 落在哪个区间就渲染哪个视图，无任何过渡帧。
// 质感：每个视图都对准真实内容（同一产品的卡片区 / 单卡 / 列表行），放大走 CSS zoom
// 让 Chromium 按放大后的尺寸栅格化（Q2，特写字不糊）；段内有一口"越切越快"的微推，
// 让定格不死、也让加速感从切点延伸到画面内部；暗角 + 颗粒统一成片质感。

export const BEAT_CUT_ACCELERANDO_DURATION = 130; // 建立 49f + 五连切 46f + 定格 hold 35f

// 一个视图 = FakeDashboard 变体 + 缩放 + 对焦点（画面上要被推到屏幕中心的点）
type View = { variant: 'A' | 'B'; scale: number; cx: number; cy: number };

const VIEWS: View[] = [
  { variant: 'A', scale: 1, cx: 960, cy: 540 }, //    v0 全景（建立）
  { variant: 'A', scale: 1.8, cx: 1346, cy: 336 }, // v1 卡片区：Top pages + Revenue 两卡
  { variant: 'A', scale: 2.6, cx: 520, cy: 316 }, //  v2 单卡特写：Active users 指标 + 曲线
  { variant: 'B', scale: 1, cx: 960, cy: 540 }, //    v3 列表页全景
  { variant: 'B', scale: 1.9, cx: 1180, cy: 400 }, // v4 列表行区：前两行
  { variant: 'B', scale: 2.8, cx: 590, cy: 385 }, //  v5 单行特写：Edge cache rollout · Live
];

// 每段起始帧：建立 49f，然后间隔 16→12→8→6→4，末段（回主画面）hold 35f
// 0–48 v0 | 49–64 v1 | 65–76 v2 | 77–84 v3 | 85–90 v4 | 91–94 v5 | 95–129 定格
const CUTS = [0, 49, 65, 77, 85, 91, 95];
const FINAL = 95; // 最后一切：戛然定格回主画面

// 段内微推速率（每帧 scale 增量）：随切点加密逐段加快，让"加速"在画面内部也成立
const DRIFT = [0, 0.0016, 0.0022, 0.003, 0.0038, 0.0048];

// 视图：基础倍率走 CSS zoom（布局级放大，字按目标尺寸光栅化）；段内微推走 transform（亚像素平滑）
const ViewShot: React.FC<{ view: View; push: number }> = ({ view, push }) => {
  const s = view.scale;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transformOrigin: '960px 540px',
        transform: `scale(${push})`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          // zoom 会连自身 left/top 一起放大：left = 960/s − cx ⇒ 焦点落在屏幕 x=960
          left: 960 / s - view.cx,
          top: 540 / s - view.cy,
          width: 1920,
          height: 1080,
          zoom: s,
        }}
      >
        <FakeDashboard variant={view.variant} />
      </div>
    </div>
  );
};

export const BeatCutAccelerando: React.FC = () => {
  const frame = useCurrentFrame();

  // 当前落在哪个区间（末段 = 主画面 v0）
  let seg = 0;
  for (let i = 0; i < CUTS.length; i++) {
    if (frame >= CUTS[i]) seg = i;
  }
  const isFinal = seg === CUTS.length - 1;
  const view = isFinal ? VIEWS[0] : VIEWS[seg];

  let push: number;
  if (isFinal) {
    // 末段慢推：scale 1 → 1.06，ease-out 推 20f 后静止（结尾真静止 15f）
    push = mix(1, 1.06, ramp(frame, FINAL, 20, EASE.out));
  } else if (seg === 0) {
    // 建立段：49f 极缓推近 1→1.02（in-out，起止无速度突变），先让观众认清"这是谁"
    push = mix(1, 1.02, ramp(frame, 0, 49, EASE.smooth));
  } else {
    // 五连切：每段从 1 起推，速率逐段加快
    push = 1 + DRIFT[seg] * (frame - CUTS[seg]);
  }

  // 每次硬切的 1f 快门感：亮度 +5% + 叠 6% 白层（是"咔"不是闪光灯）
  const isCutFrame = CUTS.some((c, i) => i > 0 && frame === c);

  return (
    <AbsoluteFill style={{ background: '#f1f1ef', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, filter: isCutFrame ? 'brightness(1.05)' : undefined }}>
        <ViewShot view={view} push={push} />
      </div>
      {/* 镜头暗角：越近的特写压得越重一点，把视线收向焦点 */}
      <Vignette strength={0.12 + 0.05 * Math.min(1, (view.scale - 1) / 1.8)} inner={0.55} color="#1a1c24" />
      <Grain opacity={0.045} />
      {/* 切帧再叠一层极薄白闪，保证肉眼可感 */}
      {isCutFrame && <AbsoluteFill style={{ background: '#ffffff', opacity: 0.06 }} />}
    </AbsoluteFill>
  );
};
