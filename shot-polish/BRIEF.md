# 镜头重设计 · 第二轮执行简报（每个参与改版的 agent 必读）

## 0. 这一轮要什么

第一轮（`shot-polish/after-v1/`）只做了「保守打磨」：保留原几何、原配色、原节奏，加了阴影/颗粒/缓动。
结果干净但平淡——浅灰底 + 同一个靛蓝、字小、构图空、节奏没变。用户的反馈：

> 我希望从**节奏、运动曲线、画面效果、配色、设计、排版**上都有**大幅度**的改进；
> **可以不用遵从原始视频，只用遵从原始视频对应的大致的镜头设计**就行。

所以这一轮是**重新设计**，不是打磨。标准：把每个镜头当成要放进顶级产品发布片（Apple keynote、
Linear / Stripe / Vercel / Arc 的 launch film）或动效师作品集 reel 的一个镜头来做。
暂停任意一帧都应该像一张设计过的海报；播放时节奏有张有弛、运动有重量。
**和 before、after-v1 并排时，提升必须一眼可见、而且是大幅度的。** 只加了点阴影和颗粒的改动不合格。

## 1. 保留什么、放开什么

**只保留「大致的镜头设计」**——即卡片 md 的「一句话 / 意图」所说的那个手法本身：
crash zoom 仍是急推、clock wipe 仍是钟表式扫转场、split text stagger 仍是逐字错峰入场、
counter confetti 仍是计数到头放彩屑。手法的识别度必须更强，不能变成另一个手法。

**全部可以重做**：
- 配色（换 look）、背景、光、材质；
- 版式与构图（主体大小、位置、网格、留白）；
- 内容与文案（产品名、数字、标题、UI 内容——编更好的；只用虚构品牌，不出现真实公司/产品名）；
- 字体排版（字号、字重、字距、层级、中英混排）；
- 节奏与时长（`*_DURATION` 的**值**可以改，常量**名**不变）；运动曲线、错峰、弹簧、相机路径；
- 可以不再用 `_fixtures/Fixtures.tsx` 的 FakeDashboard / Card / TitleBlock，自己搭为镜头量身定做的画面
  （它们是通用小字 dashboard，大多数镜头里读不清、也不好看）。
- 文案语言：原镜头是英文就用英文、中文就用中文；占位/调试文字（如把卡名大写打在角落）一律删掉或换成内容。

**仍然不能动**：
- 导出签名：`export const <Stem>: React.FC`、时长常量名、其他被别处 import 的导出
  （`grep -rn "<导出名>" demos template workbench/src assets` 确认）。组件不接收必需 props。
- `demos/_fixtures/`、`demos/_textures/`、`template/`、`workbench/src/`、`gallery/` 不改。需要共享 helper 就在自己
  的 demo 文件里写局部函数。
- 用真实截图纹理（`staticFile('textures/...')`）的镜头：截图代表"产品既有页面"（Q1），纹理本身保留，
  但运镜、调色、光、背景舞台、节奏、配套的字和元素都可以重做。
- 确定性渲染铁律：禁 `Math.random()` / `Date.now()`；伪随机用固定种子；interpolate 全部 clamp；组件是帧的纯函数。
- 不新增 npm 依赖（可用 remotion、@remotion/motion-blur、@remotion/three + three（已在用的卡）；
  `@remotion/google-fonts` 不用——demo 会被 copy 进只装 remotion 的工程，用系统字体栈）。

## 2. 工具箱：`demos/_fixtures/Look.tsx`（新）+ `Polish.tsx`

先读这两个文件（都很短）。`import { ... } from '../../_fixtures/Look'`（按层级调整相对路径）。

- `LOOKS`：8 套完整调色板，一个镜头选一套——
  暗场 `midnight`（深蓝·电光蓝，科技/AI/数据）、`aurora`（紫粉，发布/品牌/魔法）、`ember`（暖黑·橙，冲击/速度）、
  `graphite`（近单色，电影感/克制/高级）、`lime`（石墨·荧光黄绿，运动/数据冲击/节奏）；
  亮场 `paper`（暖白纸·墨·朱红，编辑排版/文字）、`porcelain`（冷白·钴蓝，SaaS UI/交互演示）、`sand`（米色·赤陶，温暖/生活方式）。
  每套含 bg/light/surface/surface2/line/ink/ink2/ink3/accent/accent2/onAccent/shadow。
  **强调色只给主角和关键信息**；accent2 只做点缀。可以在 look 基础上微调，但别回到灰底靛蓝。
- `<Stage look keyLight fill horizon breathe>`：有主光、余光、可选地平线光带、暗角、颗粒的舞台底。
- `<GridFloor>` 透视网格地面、`<Dust>` 确定性浮尘散景、`<Sheen>` 单次扫光（Q4：只给主角一次，裁进圆角）。
- `TYPE` 字号阶梯（mega 260 / display 180 / h1 120 / h2 84 / h3 60 / body 40 / small 32 / label 22）与
  `type(size, weight, {caps, serif, mono})` 一行出标题样式；`SERIF` 衬线栈（编辑感镜头做大衬线标题很好看）。
- `<TextReveal text by="char|word|line" variant="rise|blur|drop|scale|track" start each gap ease out>`：逐字/词/行揭示。
- `stagger(i, n, span, ease)` 错峰分布、`springAt(frame, start, {damping, stiffness})` 物理弹簧、`glow()` / `glowFilter()` 泛光。
- `Polish.tsx`：`EASE`（snappy/out/smooth/swift/exit/anticip/overshoot）、`ramp`、`mix`、`velocity`、`SpeedBlur`、
  `softShadow`、`surface`、`Grain`、`Vignette`。

工具箱是起点不是天花板。镜头需要什么就自己写（局部函数）：SVG 路径动画、遮罩、渐变描边、粒子、
3D 变换、景深、色差、光晕等都可以。

## 3. 专业动效的标准（逐条自查）

**节奏（rhythm）**
- 先写一张**时间表**（注释写在组件顶部）：预备 → 主动作 → 跟随/余波 → 落定 hold。每拍几帧、为什么。
- 有对比：快-慢-快、密-疏。主动作果断（入场 10–20f、大位移 18–32f），关键信息落定后 hold ≥ 20–30f（R1），
  尾段 hold 15–30f 干净落定（工作台会定格尾帧）。第一帧不要是空白死帧：开场 3 帧内画面里就该有东西
  （舞台光、一个元素的起始态），除非镜头本意就是从黑起。
- 禁止长时间什么都不动的死帧（>1s 无任何运动）；hold 段可以有极缓的相机推进（1–3%）或光的呼吸让画面活着——
  但不加手持抖动（Q3）。
- 批量元素入场：错峰按曲线分布（`stagger` + EASE），越来越快或先密后疏，挂物理隐喻（R2）。

**运动曲线（motion）**
- 每个动作按语义选曲线：入场强 ease-out（snappy/expo）、出场 ease-in（exit）、换位不对称 in-out、
  大动作前预备（anticip）、落座过冲 ≤ 一次可见回弹（overshoot / spring damping 14–20）。不出现线性运动（机械/匀速语义除外）。
- 重叠与跟随：父先动、子晚 2–4 帧；位置先到、缩放/旋转/阴影晚一点收敛；文字行比底板晚一拍。
- 速度感：快速位移/缩放/旋转时按速度加方向性模糊（`SpeedBlur` 或按速度算 blur），静止为 0。
- 相机：平滑、起止无速度突变；推/拉/环绕都要有明确目标与落点。

**画面效果（look）**
- 一个镜头一个 look，暗场优先考虑（多数产品发布片是暗场 + 光），但按镜头意图选，亮场做好同样高级。
  **同一批次里的镜头不要都用同一个 look**，整个库要有变化：选之前跑
  `grep -ho '"look": "[a-z]*"' shot-polish/notes/*.json | sort | uniq -c` 看全库已用分布，在贴合镜头意图的前提下优先用得少的。
  风格也要有变化：文字类镜头不要都做成「纸 + 衬线编辑风」，UI 类不要都做成「紫色玻璃」——同类镜头之间换手法
  （瑞士网格 / 粗黑体海报 / 等宽技术感 / 霓虹 / 电影字幕 / 杂志 / 产品发布会 / 数据仪表……）。
- 空间与层次：前/中/后景分层、视差、景深（远景模糊 + 降对比）、两层软阴影、主光方向统一。
- 光：主角有光（轮廓光、底光、泛光、扫光其一），背景有光斑/地平线光带/浮尘，不是死平底色。光效遵守 Q4。
- 材质：面板发丝线细边、顶部内高光、微渐变；暗场面板用带色相的深色 + 低透明度白描边；可做玻璃（backdrop 模糊感
  用叠层渐变模拟）。大面积渐变上叠 Grain 防色带。

**配色（color）**
- 中性色 + 1 强调色 + 至多 1 点缀色；强调色面积小而关键。暗场用带色相的深色，不用纯 #000；亮场不用纯 #fff 大面积。

**设计与排版（design & typography）**
- **字要大、要有层级**：主标题 ≥ h1（120px），关键数字可以 mega/display；要读的辅助字 ≥ 32px（Q11）。
  1080p 画面里 14–20px 的小字只能当"纹理"（虚化/降亮），不能当内容。
- 标题负字距、全大写小字放宽字距、字重对比（900 vs 400）、数字 tabular-nums；可用衬线大标题做编辑感，
  或 mono 做技术感。中英文混排注意基线和字重。
- 构图：主体占画面要有分量（UI 主体一般占画宽 50–75%），安全边距 ≥ 96px，对齐网格，视觉重心明确，留白有意图。
- UI 类镜头：做"为镜头设计的 UI"——更少元素、更大字、更强对比、只保留讲清手法所需的信息；
  仍然像真实产品（真实感的文案、图标、数据），出版级（Q10）。
- 结尾帧是一张完整的海报。

**转场/多页叠放**：两页共用一个背景（只画一个 `Stage`），否则接缝和暗角叠加会露馅；主角放在 `Stage` 外层，
`Stage` 的 children 只放背景装饰。

**清晰度**：3D/放大镜头文字不能糊（Q2：放大走 CSS zoom 或按目标尺寸布局）；细线缩放后不闪。

**性能**：单镜头渲染（check-demo 1920×1080）尽量 < 90s。整屏 `filter: blur()` 每帧变化很贵，能用渐变/预模糊/
小尺寸元素模拟就别全屏实时模糊；粒子数量适度。

## 4. 工作流程（每个 demo）

1. 读卡片 md（`references/shots/<类>/<卡>.md`）与 demo 源码，抓住「大致的镜头设计」是什么。
2. 看 before（原版）与 after-v1（第一轮）：
   `python3 shot-polish/sheet.py shot-polish/before/<Stem>.mp4 /tmp/<Stem>.before.jpg 8`，Read 图片；
   v1 联系表现成：`shot-polish/after-v1/<Stem>.sheet.jpg`。单帧：`ffmpeg -v error -y -ss <秒> -i <mp4> -frames:v 1 /tmp/x.jpg`。
3. **先做设计决定再写代码**（写进组件顶部注释）：选哪个 look、主体是什么、构图、时间表、关键曲线、
   要编的内容/文案。问自己：顶级动效师拿到这个手法会怎么拍？
4. 重写代码。保持可读，中文注释说明关键常量的用意（与仓库风格一致）。
5. 自检渲染（在 `workbench/` 目录下）：`node scripts/check-demo.mjs <类>/<卡>/<Stem>.tsx --frames 20,60,100`
   产物在 `shot-polish/after/<Stem>.mp4`、`.sheet.jpg`（8 帧联系表）、`.f<N>.jpg`（全尺寸）。
   **必须 Read 联系表和 2–3 张全尺寸关键帧**（主动作中段、落定帧、尾帧），和 before / v1 对比。
   至少迭代两轮：第一轮做出来后挑出 3 个最弱的地方再改。直到你能确信"这个镜头放进发布片不丢人"。
6. 类型检查（仓库根）：`shot-polish/tsc-demos.sh <类>/<卡>` 输出 `tsc OK` 才算过（已知误报：ClipCardLooping 找不到
   `assets/lib/ClipCard`，忽略）。
7. 改了时长、颜色、关键数值或画面描述的，同步改卡片 md 里受影响的句子：frontmatter / 「时长:」行的帧数、
   参数表数值、「动效核心」里写死的帧号或颜色描述。重设计让原来的实测数值整体失效时，动效核心 / 参数表 / 坑
   这几节可以按新实现大幅重写；「一句话」若写了具体画面（如"灰色卡片"）可以改成新画面，但手法含义不变。
   保留卡片的整体结构，frontmatter 格式不能坏（gallery 同步脚本要解析）。一张卡 md 对应多个 demo、而其中有的 demo
   不归你时，只改写和你的 demo 相关的句子。

## 5. 并发约束

- 只改分配给你的 demo 目录（`demos/<类>/<卡>/`）和对应卡片 md。别的 agent 在同时改其他目录。
- 不要 git commit / push / 切分支；不要 `git checkout` / `git stash` / `git reset` 任何文件。主控统一提交。
- check-demo.mjs 保持默认 `--concurrency 3`，不要调高；不要同时开多个渲染进程。
- 不要删除 `shot-polish/before/`、`shot-polish/after-v1/`。

## 6. 改版说明（对照页数据源，必写）

每个 demo 完成后**覆盖写**（`look` 写你用的 LOOKS 名，自定义配色写 `custom`） `shot-polish/notes/<Stem>.json`（UTF-8）。对照页对比的是 **原版 vs 本轮**，所以
issues 写原版的问题，changes 写本轮相对原版的改动：

```json
{
  "stem": "CounterConfetti",
  "issues": ["原版的问题，一句一条，3–5 条，具体到现象"],
  "changes": ["本轮改了什么，一句一条，4–6 条，具体到设计决定与手法（look、版式、时间表、曲线、效果）"],
  "issuesEn": ["same in English"],
  "changesEn": ["same in English"],
  "look": "ember",
  "mdChanged": true
}
```

## 7. 交付汇报（最终回复，简洁）

按 demo 逐条：`<Stem>`：look / 新时长 / 3–4 条关键改动、md 是否改动、渲染 OK / tsc OK、遗留问题。
最后一行列出你改动的全部文件路径。
