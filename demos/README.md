# demos/ — 镜头卡参考实现源码

多数镜头卡会在“参考实现”中指向本目录；必须先读卡片，再按其明确路径定位准确的
demo 文件，不能只凭卡名假设目录结构。这里的组件是调校过的 Remotion 实现——
**用卡先读准确源码**（SKILL.md 理念 5）。

使用方式：copy 需要的 .tsx 进你的 Remotion 项目（30fps / 1920×1080），
注册成 Composition 即可跑。每个组件都 `export const <Stem>: React.FC` 并同时导出
`<大写蛇形>_DURATION`（30fps 帧数），注册时直接用：

```tsx
import { BlurSlide, BLUR_SLIDE_DURATION } from './blur-slide/BlurSlide';
<Composition id="BlurSlide" component={BlurSlide}
  durationInFrames={BLUR_SLIDE_DURATION} fps={30} width={1920} height={1080} />
```

动画全部是帧的纯函数（无真随机 / 无 Date），逐帧确定性渲染。2026-10 全库做过两轮改版对照，
每个镜头由作者在原版 / 第一版（质感打磨）/ 第二版（成片级重设计）里择一落版，并去掉了 66 个镜头
（决策记录 `shot-polish/decisions.json`）。随后做了品牌替换：画面里出现的 logo / 品牌名统一是
video-shotcraft，合适的文案换成它的宣传语——拿去给自己的产品用时，把 `Brand.tsx` 的件换成你的标志与文案即可。

共享依赖（copy demo 时把用到的一并带上并改 import 路径）：

- `_fixtures/Brand.tsx` — video-shotcraft 品牌件：「镜刻」标志 `<ShotcraftMark>`（可分段描出）、字标
  `<ShotcraftWordmark>`、品牌色 `BRAND`、宣传文案库 `PITCH`（规范见 `assets/brand/BRAND.md`）。仅依赖 react。
- `_fixtures/Look.tsx` — 第二轮的视觉系统：8 套调色板 `LOOKS`（暗场 midnight / aurora / ember / graphite / lime，
  亮场 paper / porcelain / sand）、字号阶梯 `TYPE` 与 `type()`、带主光/余光/地平线光带/暗角/颗粒的
  舞台 `<Stage>`、透视网格地面 `<GridFloor>`、确定性浮尘 `<Dust>`、单次扫光 `<Sheen>`、
  逐字/词/行揭示 `<TextReveal>`、`stagger` / `springAt` / `glow`。第二版 demo 都 import 它；依赖 `./Polish`。
- `_fixtures/Polish.tsx` — 质感工具件：贝塞尔缓动 `EASE` / `ramp` / `mix` / `velocity`、按速度的方向性模糊
  `SpeedBlur`、`softShadow` / `hairline` / `surface` 材质 helper、`Grain` / `Vignette` / `Backdrop`。仅依赖 remotion + react。
- `_fixtures/Fixtures.tsx` — 假 UI 场景件（FakeDashboard / Card / TitleBlock / G 调色板），侧栏/顶栏是
  video-shotcraft 标志与名字（依赖 `./Brand`）。第一版 / 原版落版的 demo 里有二十来个在用。
- `_fixtures/Motion.tsx` — 480×270 设计坐标的 `DesignStage` + E 缓动表 / seg / lerp / rand / useT。
  原版 / 第一版落版的 Motion 系 demo 在用（fracture、bezier-source-converge-merge、radial-wave 等十几个）。
- `_fixtures/PageCam2D.tsx` — 2.5D 页面相机（与 template 的 PageCam 同款坐标数学，self-contained）。
  spotlight-hero-card / type-and-filter / row-embed / list-stack-press / outro-group-photo-launch 在用。
- `_textures/` — 真实页面截图与 `live-layout.json`。用到 `staticFile('textures/live/xxx.png')` 的 demo
  （crash-zoom-punch 两式 / depth-layer-moves / shot-transitions 急刹甩镜 / speed-ramp-freeze 定格标注 /
  spotlight-hero-card / type-and-filter / deck-deal-flyin / row-embed / list-stack-press /
  document-typewriter-reveal / page-waterfall-wall / outro-group-photo-launch）要求把 `_textures/` 下的同名文件
  复制到你项目的 `public/textures/live/`。截图代表"产品既有页面"（审美准则 Q1）；页头站名已改成
  video-shotcraft 标志 + 字标（周报页标题为 Shotcraft Weekly），其余页面内容未动。

个别 demo 用到 `@remotion/motion-blur`（CameraMotionBlur），需
`npm i @remotion/motion-blur`。名单（4 个文件 / 4 张卡）：

- `camera/space-camera-moves/DroneDiveLanding.tsx`
- `opening/crane-rise-reveal/CraneRiseReveal.tsx`
- `opening/fracture/Fracture.tsx`
- `opening/magician-card-flourish/MagicianCardFlourish.tsx`

其余快速运动一律用按速度量自算的方向模糊（`SpeedBlur` 或局部实现）——CameraMotionBlur 多重采样
代价高，且在近静止帧会把画面整体染灰/染黄。

字体：只用系统字体栈（SF / Helvetica Neue / Iowan Old Style / Avenir Next Condensed / Futura 等 macOS 自带字），
不依赖 `@remotion/google-fonts`。少数 demo 按本机 SF Pro 实测写死了字宽 / 字心坐标（如 letter-drop-physics、
letterform-zoom、beat-step-list-theme-cycle、pill-chip-slot-cycle-handled），换字体或字号要按注释重测；
可变字重动画（font-weight-pump）依赖系统可变字体，没有时退化为阶梯字重。

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
   python3 assets/scripts/smoke-render-demos.py --subset BlurSlide,GlitchCycle  # 子集
   python3 assets/scripts/smoke-render-demos.py --list          # 列出可渲染 demo
   ```

   `--subset` 指向不存在/未找到的 demo 时脚本退出码为 1（明确报错）。
   需要真实 mp4 素材的 demo（如 ClipCardLooping 用 `public/clips/`）会被跳过
   并在输出里报告，不阻塞全量。
