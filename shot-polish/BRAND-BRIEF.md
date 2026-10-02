# 品牌替换轮执行简报（第三轮，每个参与的 agent 必读）

## 0. 背景与目标

前两轮改版后，用户在对照页（原版 / 第一版 / 第二版 / 去掉）逐镜头做了选择，见 `shot-polish/decisions.json`。
仓库里的 demo **已经切换成用户选定的版本**（原版取自 `main`、第一版取自 `d16a3df`、第二版是当前 HEAD 上的实现），
被「去掉」的 66 个 demo 已删除。用户这一轮的要求：

> 根据我选择的镜头，把里面出现的 logo / 品牌名都换成 video-shotcraft；如果合适，文本换成对 video-shotcraft 的夸赞或者宣传。

所以本轮**只换内容，不改设计**：用户是看着画面选的版本，镜头手法、运动曲线、节奏、时长、配色、版式、构图都按选定版本保留。

## 1. 品牌件：`demos/_fixtures/Brand.tsx`（先读，很短）+ `assets/brand/BRAND.md`（规范）

- `BRAND`：`name: 'video-shotcraft'`、`short: 'Shotcraft'`、`repo`、品牌色 `amber #D3923C` / `ink #171714` / `paper #F5F3EE` / `slate`、字标字体 `font`。
- `<ShotcraftMark size tone="dark|light" frameProgress cutProgress>`：「镜刻」标志——开口取景框 + 琥珀斜切。
  `MARK_PATHS.frame / .cut` 两段路径可单独拿去做动画（框先描出、斜切后划入，或描边路径动画、遮罩揭示等）。
- `<ShotcraftWordmark size tone mark>`：标志 + `video-shotcraft` 字标横排。
- `PITCH.en / PITCH.zh`：品牌短句 motto（**Frame motion. Craft the shot. / 把运动，刻成镜头。**）、taglines、features、praise、works。
  写口号 / 标题 / 评价时从这里挑，或按同一口径改写（可以改写得更贴镜头，但别编与事实不符的东西）。
- 规范要点：字标**全小写** `video-shotcraft`（不做全大写科技字标，眉题小字里的 caps 标签不算字标）；标志不变形、不改斜切角度、
  标志本身不加发光 / 渐变 / 描边 / 投影，琥珀斜切不换色（暗底用 `tone="dark"` 反白版，亮底用 `tone="light"`）。
  标志周围的舞台光、标志的入场动画（缩放 / 翻转 / 描出 / 揭示）可以照常做。
- import 路径：`import { BRAND, ShotcraftMark, ShotcraftWordmark, PITCH } from '../../_fixtures/Brand';`（按层级调整）。
- `_fixtures/Fixtures.tsx` 的 FakeDashboard 已由主控改好（侧栏标志 + video-shotcraft 名字），用它的 demo 不用管。

## 2. 要换什么

**必须换（logo / 品牌名）**：
- 虚构品牌名、产品名、公司名、App 名（Lumen、Stride、Northwind、Acme、Orbit…），以及残留的真实公司 / 产品名；
- 占位 logo：几何图形 logo、字母 logo、logo 方块、品牌徽章、App 图标里代表"这个产品"的那个；
- 品牌字标 / 收尾 lockup / 片尾署名 / 水印；
- 品牌相关的 URL、域名、@handle、邮箱（换成 `BRAND.repo` 或直接去掉，别编 `shotcraft.com` 之类不存在的域名）。
- 换法：画面里的 logo 位置换成 `<ShotcraftMark>`（或用 `MARK_PATHS` 自己画、自己做动画）；字标换成 `<ShotcraftWordmark>` 或
  `BRAND.name` 文本；镜头手法本身就是"某个东西变成 logo / logo 出场"的（logo sting、UI 变品牌、图标翻成 logo…），
  终点 logo 就是 video-shotcraft 标志——手法要保持成立，必要时按新标志的形状重算路径 / 遮罩 / 落点。

**合适就换（文案 → 夸赞 / 宣传 video-shotcraft）**：
- 标题、口号、副标题、hero 文案、片尾 CTA、评价 / testimonial、通知 / toast、聊天气泡里的宣传性句子 → 换成 video-shotcraft 的宣传
  （motto / taglines / features / praise）。一个镜头一个主信息，别把 PITCH 全堆上去。
- 画面在演示"一个产品的 UI"（dashboard、编辑器、命令面板、聊天、表单、列表）时：产品就是 video-shotcraft——
  App 名换掉；UI 内容如果顺手就换成 video-shotcraft 的世界（镜头配方卡、分镜、渲染队列、时间线、工作台、样片画廊、
  `Render launch film`、`Add shot: crash zoom`……），让画面讲的是这个产品；内容换了反而别扭、或数据本身就是镜头主角
  （比如纯数据图表的数值）的，保持原样即可。
- **不合适的别硬换**：纯抽象 / 纯光效 / 无字的镜头；文字本身是手法道具、换了会破坏手法的（例如按特定字母形状做的遮罩 / 变焦、
  按手量字宽做的对位）——要换就连同测量一起改对并渲染验证，改不对就保留原文。
- 语言：原镜头英文就写英文，中文就写中文；文案长度尽量与原文相近（版式是按原长度设计的）。
- 不写会过时 / 不实的数字：卡片数、star 数、用户数、"#1"之类别写进画面；UI 里的演示数据（渲染次数、帧数、时长）可以是合理的示意值。

## 3. 不能动

- 镜头手法、时间表、运动曲线、时长（`*_DURATION` 的值不变）、配色 look、构图与主体尺寸——只为容纳新文字做最小的版式微调。
- 导出签名：`export const <Stem>: React.FC`、时长常量名与值、其他被别处 import 的导出。
- `demos/_fixtures/`（含 Brand.tsx、Fixtures.tsx）、`demos/_textures/`、`template/`、`workbench/src/`、`gallery/` 不改。
- 真实截图纹理（`staticFile('textures/...')`）里的字改不了，保留；它周围我们自己画的 logo / 文案照常换。
- 确定性渲染铁律：禁 `Math.random()` / `Date.now()`；interpolate 全部 clamp。
- 不新增 npm 依赖、不用 `@remotion/google-fonts`。

## 4. 卡片 md（按分配时给的说明处理）

- md 里提到被替换的品牌名 / 文案的句子同步改（如"Lumen 字标落定" → "video-shotcraft 字标落定"）。
- **多式卡里有被去掉的式**（分配说明会列出）：删掉 md 里这些式的行 / 段落 / 参数 / 坑 / 参考实现路径，把"六式""四式"这类计数、
  一句话、选型表、意图里的列举都改成剩下的式；剩下的式按原有字母顺序重新编号（A/B/C…），正文里对式字母的引用一起改。
  frontmatter 格式不能坏（`gallery/sync-from-cards.py` 要解析）。
- **多式卡里各式选了不同版本**（分配说明会标）：md 当前是第二版的文字；选了第一版 / 原版的那一式，把它的描述（做法、参数、坑、
  时长帧数）改回与选定版本实现一致——参考 `git show d16a3df:<md路径>`（第一版的 md）/ `git show main:<md路径>`（原版的 md），
  并以该 demo 当前源码为准核对数值。
- 整卡回退到第一版 / 原版的 md 主控已经回退好了，只需处理品牌相关句子。

## 5. 工作流程（每个 demo）

1. 读 demo 源码与卡片 md，列出画面里所有 logo / 品牌名 / 文案，逐条决定换不换、换成什么。
2. 改代码。中文注释风格与周围一致。
3. 渲染自检（在 `workbench/` 下）：`node scripts/check-demo.mjs <类>/<卡>/<Stem>.tsx --out ../shot-polish/final --frames <2–3 个关键帧>`
   ——**必须加 `--out ../shot-polish/final`**（`shot-polish/after/` 是第二版的对照存档，不能覆盖）。
   Read 联系表 `shot-polish/final/<Stem>.sheet.jpg` 和关键帧，确认：新文字没溢出 / 没被裁 / 没和别的元素打架，标志清晰、比例正确、
   手法依然成立。和改前对比（改前渲染：原版 `shot-polish/before/<Stem>.mp4`、第一版 `shot-polish/after-v1/<Stem>.mp4`、
   第二版 `shot-polish/after/<Stem>.mp4`，联系表用 `python3 shot-polish/sheet.py <mp4> /tmp/<Stem>.prev.jpg 8` 生成）。
   完全没改的 demo 不用渲染。
4. 类型检查（仓库根）：`shot-polish/tsc-demos.sh <类>/<卡>` 输出 `tsc OK`（ClipCardLooping 的 `assets/lib/ClipCard` 误报忽略）。

## 6. 并发约束

- 只改分配给你的 demo 文件和对应卡片 md；别的 agent 在同时改其他目录。
- 不要 git commit / push / 切分支；不要 `git checkout` / `git stash` / `git reset` / `git restore` 任何文件（`git show <rev>:<path>` 只读查看可以）。
- check-demo.mjs 保持默认 `--concurrency 3`，一次只开一个渲染进程。

## 7. 改动说明（最终确认页的数据源，必写）

每个分配给你的 demo（包括没改的）写 `shot-polish/final-notes/<Stem>.json`（UTF-8，覆盖写）：

```json
{
  "stem": "LogoStingButton",
  "changed": true,
  "brand": ["改了什么，一句一条，1–4 条：原来的什么 → 换成什么（logo / 品牌名 / 文案原文 → 新文案）"],
  "brandEn": ["same in English"],
  "styleKey": "logo-sting-button",
  "mdChanged": true
}
```

没改的写 `"changed": false`，`brand` 里一句说明为什么不用换（如"纯光效镜头，画面无文字与 logo"）。
`styleKey` 只有多式卡需要填（这个 demo 在画廊里对应的式 key，即 `gallery/api/library.json` 该卡 `styles[].key`；单式卡留空字符串）。

## 8. 交付汇报（最终回复，简洁）

逐 demo 一行：`<Stem>`：换了什么 / 渲染 OK / tsc OK / 遗留问题。多式卡额外列出：画廊里应删掉的式 key、每个保留 demo 对应的式 key。
最后一行列出改动的全部文件路径。
