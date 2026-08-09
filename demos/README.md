# demos/ — 镜头卡参考实现源码

多数镜头卡会在“参考实现”中指向本目录；必须先读卡片，再按其明确路径定位准确的
demo 文件，不能只凭卡名假设目录结构。这里的组件是调校过的 Remotion 实现——
**用卡先读准确源码**（SKILL.md 理念 5）。

使用方式：copy 需要的 .tsx 进你的 Remotion 项目（30fps / 1920×1080），
注册成 Composition 即可跑。两类共享依赖：

- `_fixtures/Fixtures.tsx` — 灰阶假 UI 场景件（FakeDashboard/Card/TitleBlock/G 调色板）。
  多数 demo import 它；copy demo 时把 import 路径改成你项目里的位置。
- `_textures/` — 少数"真实素材版" demo（crash-zoom-punch / depth-layer-moves /
  speed-ramp-freeze / shot-transitions / page-waterfall-wall）用到的整页截图与
  `live-layout.json`。这些 demo 里的 `staticFile('textures/live/xxx.png')`
  要求把 `_textures/` 下的同名文件复制到你项目的 `public/textures/live/`
  （page-waterfall-wall 例外：它写的是 `textures/xxx.png`，放 `public/textures/`）。

个别 demo 用到 `@remotion/motion-blur`（CameraMotionBlur），需
`npm i @remotion/motion-blur`。名单（8 个文件 / 6 张卡）：

- `camera/crash-zoom-punch/CrashZoomReal.tsx`、`CrashImpactReal.tsx`
- `camera/space-camera-moves/DroneDiveLanding.tsx`
- `opening/magician-card-flourish/MagicianCardFlourish.tsx`
- `rhythm/speed-ramp-freeze/SpeedRampReal.tsx`
- `transition/shot-transitions/WhipPanReal.tsx`、`WhipBrakeReal.tsx`
- `transition/transition-hidden-cut/InvisibleCut.tsx`

## Motion 系 demo（2026-08 并入的 48 张卡）

这批卡的参考实现与其他 demo 同为原生 Remotion .tsx 组件，用法一致：
copy 进项目注册 Composition 即可。差异只有两点：

- 共享依赖是 `_fixtures/Motion.tsx`（不是 Fixtures.tsx）：E 缓动表 / seg /
  lerp / 确定性 rand / useT / DesignStage。copy demo 时一并带上并改 import 路径。
- 画面用 `<DesignStage>` 的 480×270 设计坐标作画、等比放大到合成分辨率；
  卡片参数表数值都在此坐标系下标定，改合成分辨率不需要动参数。
  个别文字密集的 demo 用 `raster="zoom"`（布局期放大，小字号字形按目标尺寸
  光栅化，更清晰）；默认 transform scale 是合成期放大，两者 API 相同。

每个组件同时 `export const <卡名大写蛇形>_DURATION`（30fps 帧数），注册
Composition 时直接用：

```tsx
import { BlurSlide, BLUR_SLIDE_DURATION } from './blur-slide/BlurSlide';
<Composition id="BlurSlide" component={BlurSlide}
  durationInFrames={BLUR_SLIDE_DURATION} fps={30} width={1920} height={1080} />
```

动画全部由归一化 t（useT()）驱动计算，无真随机，逐帧确定性渲染。
三个文字密集组件例外（glass-pill-dictation-typing / chip-grid-single-select-blackout /
pill-chip-slot-cycle-handled）：挂载时用 useLayoutEffect 实测一次文字宽度
（之后恒定，单次渲染内仍逐帧确定），因此其布局随渲染环境的字体而变——
跨平台若字体回退不同，宽度会整体漂移；组件内已备兜底估算值，介意的话
可把实测值写死。每个组件都经过与原样片 mp4 的全帧 SSIM 比对验收
（mean≥0.97 / min≥0.93 或有注释说明的编码噪声豁免）。
