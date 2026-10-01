# 镜头质感升级 · 执行简报（每个参与改版的 agent 必读）

目标：把 `demos/` 下 216 个镜头 demo 的**动效与质感提升到专业动效师水准**，
但**不替换镜头要表达的内容**。改完每个镜头都要能和改版前的视频并排对照、一眼看出提升。

## 1. 什么不能动（内容契约）

- **镜头的意图与叙事不变**：卡片 md（`references/shots/<类>/<卡>.md`）的「一句话 / 意图 /
  动效核心」描述的那件事必须还在——同一个主角、同一组节拍（入场→动作→落定）、同一种手法
  （crash zoom 还是 crash zoom，打字机还是打字机）。不许把它改成另一个镜头。
- **时长按镜头本意**：已导出的 `*_DURATION` / `*_DUR` 常量保持原值。**没有导出时长常量的 demo 要补一个**
  （`export const <STEM_UPPER_SNAKE>_DURATION = N;`，gen-index 会优先读它）：工作台目前对这类 demo 靠猜——
  「default」一律 150f，「inline」是从源码里抓的第一个数字，常常是错的（如 MagicianCardFlourish 被猜成 12f、
  ClonerDepthEcho 10f，渲染出来只有半截）。N 取镜头本意的完整时长：先看 demo 自身时间轴（Sequence/常量/
  注释），再看卡片 md「时长」。查当前推断值：`grep '"<Stem>"' workbench/src/cards/demo-index.ts`。
  改版后整段动作必须在 N 帧内演完、尾段有落定。不要为了加戏随意拉长已正确的时长。
- **导出签名不变**：`export const <Stem>: React.FC`、时长常量名、其他被别处 import 的导出
  （`grep -rn "<导出名>" demos template workbench/src assets` 确认）保持原样。
- **md 里写死的关键节拍尽量保留**（如「6f 急推」「BURST 早于到位 0.04」）。如果你确实改了
  md 参数表/动效核心里写明的数值，必须同步改 md 对应句子（只改受影响的数值/描述，不重写卡片）。
- **不改 `_fixtures/`、`_textures/`、`template/`、`workbench/src/`、`gallery/`**。共享件由主控
  统一维护；需要共享 helper 时，在你自己的 demo 文件里写局部函数。可以 import
  `_fixtures/Polish.tsx`（若存在，Phase 0 新增的质感工具件）。
- 确定性渲染铁律：禁 `Math.random()` / `Date.now()`，一切伪随机用固定种子；所有 interpolate
  都要 clamp；组件是 `useCurrentFrame()` 的纯函数。
- 不新增 npm 依赖。可用：remotion、@remotion/motion-blur、@remotion/three + three（已在用的卡）、
  @remotion/google-fonts（**慎用**：demo 会被 copy 进只装了 remotion 的工程，能用系统字体栈就别用）。

## 2. 「专业动效师水准」具体指什么（逐条自查）

先读 `references/aesthetic-rules.md` 的 Q 节（Q1–Q11）与 R2/R3，这是本仓库的判例式审美准则，优先级最高。
在此之上按下面的清单打磨：

**运动（motion）**
- 无线性运动（除非刻意的机械/匀速语义）。入场用强 ease-out（expo/quint 或 cubic-bezier(0.16,1,0.3,1) 级），
  出场用 ease-in，换位用不对称 in-out；弹簧要有物理感（合适的阻尼，过冲 ≤ 一次可见回弹）。
- 重叠与跟随（overlap / follow-through）：组内元素错峰（stagger 也要有缓动分布，不是等差），
  子元素比父元素晚 2–4 帧落定；大动作前有轻微预备（anticipation）。
- 速度感来自加速度与运动模糊：快速位移/缩放/旋转时给方向性模糊或拖影（按速度量计算，静止时为 0），
  不要全片常驻模糊。CameraMotionBlur 代价大，只给真正需要的镜头。
- 落定要「落」：到位后有 settle（微小回弹或阻尼收敛），关键信息落定后留呼吸时间（R1）。
- 镜头要稳（Q3）：不加手持抖动；相机运动用平滑曲线，避免起止处速度突变。

**质感（look）**
- 层次与深度：前中后景分层，背景不要死平——低对比渐变、柔和光斑、轻微暗角；用视差、景深（模糊远景）、
  随高度变化的分层阴影（近地小而实 + 远地大而虚，两层 box-shadow）表现空间。
- 材质：卡片/面板用细边（1px rgba 发丝线）、顶部内高光、微渐变，不用 2px 实色灰边；大面积纯色渐变加
  极弱噪点/颗粒防色带（确定性噪点，见 Polish.tsx 或用 SVG feTurbulence 固定 seed）。
- 光：一处主光方向统一（高光、阴影方向一致）；光效遵守 Q4（只给主角、一次、裁进圆角）。
- 色彩：有克制的配色系统（中性色 + 1 个强调色 + 必要时 1 个辅助色），避免纯 #000 / #fff 大面积、
  避免高饱和彩虹堆砌；暗场用带色相的深色（如 #0b0d12 而非 #000）。
- 字体排版：系统字体栈 `-apple-system, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif`
  （等宽 `"SF Mono", "JetBrains Mono", Menlo, monospace`）；标题负字距、小字正字距、字重层级分明；
  数字用 `fontVariantNumeric: 'tabular-nums'` 防抖动；要读的字满足 Q11 字高。
  调试性质的占位标题（如把卡名大写打在画面上方）要换成像样的内容或去掉。
- 占位内容出版级（Q10）：灰色骨架条可以升级为真实感的假内容（产品名、指标、人名缩写头像、图标、
  sparkline），但别喧宾夺主，主角始终是这张卡要演示的运动。
- 清晰度：3D/放大镜头里的文字不能糊（Q2，用 CSS zoom 或按目标尺寸布局，不靠 transform 放大位图）；
  1px 线在缩放后不能闪烁。

**构图（composition）**
- 主体在安全区内、视觉重心明确；留白有意图；元素对齐到网格。
- 每一帧暂停都要「能当海报」：没有半截穿帮、没有空白死帧、没有元素意外出画。
- 结尾帧干净、落定（工作台会定格尾帧）。

## 3. 工作流程（每个 demo）

1. 读卡片 md 与 demo 源码（含它 import 的 fixture），弄清意图与节拍。
2. 看「改版前」：`shot-polish/before/<Stem>.mp4` 已渲染好。出联系表：
   `python3 shot-polish/sheet.py shot-polish/before/<Stem>.mp4 /tmp/<Stem>.before.jpg 8` 然后 Read 图片。
   需要细看某帧：`ffmpeg -v error -y -ss <秒> -i <mp4> -frames:v 1 /tmp/x.jpg`。
   先写下 3–6 条具体的「粗糙点」诊断（例如：线性位移、平灰背景、2px 灰边、字体回退、
   入场同时弹出无错峰、尾段 2 秒死帧、文字糊、光效溢出圆角）。
3. 改代码。优先做提升最明显的几项，不要为改而改；保持代码可读、注释风格与原文件一致
   （中文注释，说明关键常量的用意）。
4. 自检渲染（在 `workbench/` 目录下执行，会只打包你指定的 demo）：
   `node scripts/check-demo.mjs <类>/<卡>/<Stem>.tsx [--frames 30,90]`
   产物在 `shot-polish/after/<Stem>.mp4`、`<Stem>.sheet.jpg`（8 帧联系表）、`<Stem>.f<N>.jpg`（全尺寸单帧）。
   **必须 Read 联系表和至少 1–2 张全尺寸关键帧亲眼看**，和改版前对比；文字/细线要看全尺寸帧。
   有问题继续迭代，直到你能明确说出「比改版前好在哪」。渲染失败要修好。
5. 类型检查（与 CI 同口径 strict）：在仓库根执行 `shot-polish/tsc-demos.sh <类>/<卡>`（可给多个目录），
   输出 `tsc OK` 才算过。已知误报：`ClipCardLooping.tsx` 找不到 `assets/lib/ClipCard`（符号链接路径所致，忽略）。

## 4. 并发约束

- 你只改分配给你的 demo 目录（`demos/<类>/<卡>/`）和对应卡片 md。别的 agent 在同时改其他目录。
- 不要 git commit / push / 切分支；不要 `git checkout` / `git stash` / `git reset` 任何文件。主控统一提交。
- 渲染并发：check-demo.mjs 默认 `--concurrency 3`，不要调高。
- 不要删除 `shot-polish/before/`。

## 5. 改版说明（对照页数据源，必写）

每个 demo 完成后写 `shot-polish/notes/<Stem>.json`（UTF-8，对照页 index.html 直接展示）：

```json
{
  "stem": "CounterConfetti",
  "issues": ["改版前的粗糙点，一句一条，3–6 条，具体到现象"],
  "changes": ["改了什么，一句一条，3–6 条，具体到手法与数值"],
  "issuesEn": ["same in English"],
  "changesEn": ["same in English"],
  "mdChanged": false
}
```

## 6. 交付汇报（最终回复）

按 demo 逐条：`<Stem>`：改了什么（3–5 条要点，具体到手法）、是否改动了 md、自检结论（渲染 OK / tsc OK）、
任何没解决的问题。最后一行列出你改动的全部文件路径。
