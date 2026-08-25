# demos/ — 镜头卡参考实现源码

多数镜头卡会在“参考实现”中指向本目录；必须先读卡片，再按其明确路径定位准确的
demo 文件，不能只凭卡名假设目录结构。这里的组件是调校过的 Remotion 实现——
**用卡先读准确源码**（SKILL.md 理念 5）。

使用方式：copy 需要的 .tsx 进你的 Remotion 项目（30fps / 1920×1080），
注册成 Composition 即可跑。两类共享依赖：

- `_fixtures/Fixtures.tsx` — 灰阶假 UI 场景件（FakeDashboard/Card/TitleBlock/G 调色板）。
  多数 demo import 它；copy demo 时把 import 路径改成你项目里的位置。
- `_fixtures/PageCam2D.tsx` — 2.5D 页面相机（与 template 的 PageCam 同款坐标数学，
  self-contained，仅依赖 remotion）。给"真实纹理"类 demo（spotlight-hero-card /
  type-and-filter / deck-deal-flyin / row-embed / list-stack-press /
  document-typewriter-reveal / outro-group-photo-launch）复用。copy 这些 demo 时
  一并带上并改 import 路径。
- `_textures/` — 少数"真实素材版" demo（crash-zoom-punch / depth-layer-moves /
  speed-ramp-freeze / shot-transitions / page-waterfall-wall 以及本批补全的
  spotlight-hero-card / type-and-filter / deck-deal-flyin / row-embed /
  list-stack-press / document-typewriter-reveal / outro-group-photo-launch）用到的
  整页截图与 `live-layout.json`。这些 demo 里的 `staticFile('textures/live/xxx.png')`
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

## 真实视频素材（ClipCard，assets/lib/ClipCard.tsx）

库内 152 张镜头卡原本都假设主体是 DOM/SVG 生成物或页面截图，没有一张能
直接承载真实 mp4 素材。`assets/lib/ClipCard` 补上这个形态：把一段视频包进
圆角"卡片"，让为矩形卡元素调校过的运镜骨架（spotlight-hero-card /
magician-card-flourish / neon-frame-orbit-drop / quad-split-parallel-scenes）
原样驱动真实 footage。copy `assets/lib/ClipCard.tsx` 进项目即可用。

```tsx
import { ClipCard } from './assets/lib/ClipCard';

// 素材放 public/clips/demo.mp4；素材短于镜头时传 loopDurationInFrames 开启
// 交叉淡化循环（OffthreadVideo 无 loop prop，播完会冻结）
<ClipCard src="clips/demo.mp4" size={560} caption="AI generated"
  loopDurationInFrames={60} durationInFrames={120} />
```

| 参数 | 默认 | 说明 |
|------|------|------|
| `src` | 必填 | public/ 下视频路径（staticFile 解析） |
| `caption` / `captionSize` | 无 / 17 | 卡片下方 mono 副行；小卡片/远机位 captionSize 提到 ≥32px（Q11） |
| `size` / `radius` | 560 / 20 | 卡片边长（方形素材）/ 圆角 |
| `muted` | true | `false` 时循环交叉淡化音频互补，不叠双全量音轨 |
| `startFrom` | 0 | 从视频第几帧开始播（修剪） |
| `loopDurationInFrames` | 无 | 视频可播放长度（合成帧）→ 开启循环 |
| `loopCrossfadeInFrames` | 8 | 循环层重叠淡化帧数 |
| `durationInFrames` | Composition 时长 | 包围 shot 时长——**务必传**，否则短 shot 嵌长工程会生成不可见层 |

已知坑：
- `durationInFrames` 不传时层数按 Composition 总时长算（短 shot 长工程问题）。
- `startFrom` ≥ 可播放长度、或 step < crossfade 时自动回退单层播放（不循环）。
- 循环素材建议 30fps、方形（运镜骨架按方形卡片标定）。

参考 demo：`demos/ui-entrance/clipcard-looping/ClipCardLooping.tsx`
（回归三场景：muted=false 循环、startFrom>0+循环、短 Sequence 长 Composition）。

## 测试与验证

1. **类型编译**（`pr-checks.yml` verify job）：`find demos -name '*.tsx'`
   全部走 `tsc --noEmit --strict`。新增 demo 必须能通过严格编译。
2. **渲染冒烟**（`assets/scripts/smoke-render-demos.py`）：扫描所有带时长
   导出（`_DURATION` / `_DUR`）的 demo，自动生成 `template/src/smoke-root.tsx`
   注册全部，逐个 `remotion still` 渲染首帧，断言输出非空、进程不崩——
   堵住"能编译不能运行"的 demo（如 composition id 非法、运行时 import
   缺失、纹理缺失）。本地跑全量：

   ```bash
   # 需要 template 依赖 + motion-blur（CI 里临时装）
   cd template && npm ci && npm i --no-save "@remotion/motion-blur@$(node -p "require('./package.json').dependencies.remotion")"
   cd .. && python3 assets/scripts/smoke-render-demos.py        # 全量
   python3 assets/scripts/smoke-render-demos.py --subset BlurSlide,Scramble  # 子集
   python3 assets/scripts/smoke-render-demos.py --list          # 列出可渲染 demo
   ```

   `--subset` 指向不存在/未找到的 demo 时脚本退出码为 1（明确报错）。
   需要真实 mp4 素材的 demo（如 ClipCardLooping 用 `public/clips/`）会被跳过
   并在输出里报告，不阻塞全量。
