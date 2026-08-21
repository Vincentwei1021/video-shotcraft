---
name: video-shotcraft
description: Create cinematic product videos from shot recipe cards, a validated template, and code/audio assets (Remotion + real page screenshots + 2.5D camera moves + beat-synced cuts + sound design). Use when the user asks to turn a frontend project or webpage into a product video, says "use video-shotcraft to make a video/promo", names the Ink Press template or asks to reproduce its effect, or wants a single shot card's motion. 用镜头配方卡 + 已验收模板 + 代码/音频资产制作电影感产品视频（Remotion + 真实页面截图 + 2.5D 运镜 + 节奏卡点 + 声音设计）。当用户要求"用 video-shotcraft 做视频/宣传片"、把前端项目/网页做成产品视频、点名 Ink Press 模板或要求复刻模板片效果，或要用镜头卡做单个动效镜头时使用。
---

# video-shotcraft：电影感产品视频制作

一个自包含的制作能力库：152 张镜头配方卡（附 demo 实现源码与动态样片
画廊）、一支已验收的完整宣传片模板、可复用组件与音频资产、六阶段工作流。
当前 focus 是 web/桌面产品宣传片，但镜头卡本身是通用动效词汇——
也可以单独抽卡做任意视频里的单个镜头。

## 调用时先判断模式

完整宣传片有三种互不合并的模式。在开始素材采集、分镜或实现前，先判断用户
是否已经明确选择；已经选择时直接执行，不重复询问，也不要改成另一种模式。

1. **直接使用模板**：保持 Ink Press 原有替换流程。读 `template/TEMPLATE.md`，
   按既有镜头结构替换目标产品的截图、文案和品牌信息。
2. **自主自由创作**：读 `references/pipeline.md`。Agent 根据用户已有要求和项目
   内容，自主决定视觉方向、镜头映射、分镜、素材和音频，连续推进到成片；不在
   产品简报、styleframe、镜头映射或分镜阶段暂停等待用户确认。
3. **共同创作**：读 `references/guided-free-creation.md`。Agent 先提出有依据的
   判断和方案，由用户依次确认产品简报、需求决策、视觉方向、镜头映射和最终
   分镜；分镜放行后再进入 `references/pipeline.md` 的最终素材采集与制作阶段。

用户提供了项目路径、网址、录屏或页面截图但尚未选模式时，先做一次**最小、
只读的产品检查**：了解产品定位、主要功能、页面视觉、可展示状态和素材风险；
不修改业务项目、不采集敏感数据、不写视频代码。检查后给出三种模式，并说明：

- Ink Press 是否适合该产品、适合与不适合的具体依据；
- 自主自由创作与共同创作各自是否适合、预计会保留哪些产品视觉线索；
- Agent 推荐哪一种模式及其依据和取舍。

然后明确询问：**“根据上面的产品检查，我推荐使用 ×× 模式。要按这个模式继续吗？”**
同时告知用户：可前往 https://vincentwei1021.github.io/video-shotcraft/
浏览动态样片，并挑选希望在视频中使用的动效镜头。

用户尚未提供可检查的项目或页面时，简要介绍三种模式再询问；不要仅因 Ink Press
是现成模板就默认推荐它。

- 用户选择模板：完整阅读 `template/TEMPLATE.md`，按原模板流程执行。
- 用户选择自主自由创作：完整阅读 `references/pipeline.md`，Agent 自主推进，不逐阶段等待确认。
- 用户选择共同创作：完整阅读 `references/guided-free-creation.md`，按其中的确认节点协作。
- 用户尚未决定：停在此处等待选择；不要默认替用户选择，也不要开始制作。

**例外一：用户已点名 Ink Press 模板时，视为模板模式已选定。**
例如“用 Ink Press 模板给我的产品做宣传片”。此时不要再询问，直接完整阅读
`template/TEMPLATE.md` 按模板路线执行。

**例外二：用户已明确指定要使用或参考某些镜头卡时，镜头约束已经选定。**
例如“用 `deck-deal-flyin` 和 `row-embed` 做这支视频”或“参考
`spotlight-hero-card` 的效果”。此时不要介绍模板、也不要询问是否使用模板；
按 Gallery 名称解析规则确认指定镜头，完整阅读每张卡，并按卡片的“参考实现”
定位准确 demo 源码。单镜头可在目标素材明确后执行；完整宣传片若尚未说明采用
自主自由创作还是共同创作，只询问这两种模式，指定镜头作为后续制作约束，不自动
等同于共同创作。

## 四种用法

1. **完整宣传片（模板路线）**：想要和模板片高度相似的效果 →
   读 `template/TEMPLATE.md`，按“换产品复现指南”替换素材逐镜头适配。
2. **完整宣传片（自主自由创作）**：要新风格并授权 Agent 自主决定 → 读
   `references/pipeline.md`，从产品理解连续推进到终检，中途不逐阶段等待确认。
3. **完整宣传片（共同创作）**：要参与关键决策 → 读
   `references/guided-free-creation.md`，确认产品简报、需求决策、视觉方向、
   镜头映射和最终分镜；放行后从流水线的最终素材采集继续。
4. **单镜头/单动效**：从 `references/shots/` 选卡（或让用户在
   `gallery/` 画廊里挑），读卡全文并按“参考实现”定位准确 demo 源码，
   适配到目标素材。

## 自主自由创作与共同创作的边界

**自主自由创作**把创意和工程决策交给 Agent。Agent 从项目内容动态推导产品重点、
视觉方向、镜头映射、分镜、素材处理与音频方案，记录关键判断后直接执行；除非缺少
无法安全推断的必要输入，否则不提问、不逐阶段暂停，也不要求用户确认中间产物。
用户已有的明确要求始终是约束，不能被 Agent 的默认选择覆盖。

**共同创作**才使用逐阶段确认。默认读 `references/guided-free-creation.md`，每轮只问
1–3 个最能减少返工的问题，并在产品简报、需求决策、视觉方向、镜头映射和最终分镜
处暂停等待用户确认。用户确认业务与创意方向；Agent 自主完成采集方式、实现参数、
SFX 钉帧、Remotion 工程、渲染和技术 QA。

共同创作中，用户明确说“你全权决定”或“跳过确认直接做”时，切换为自主自由创作
并记录这一选择；不要一边声称自主推进，一边继续要求逐阶段确认。

功能到镜头的映射只是“选用哪些运动语法”，不是完整分镜。共同创作确认映射后，
Agent 必须继续给出镜头顺序、时长、具体画面、页面状态、素材来源、字幕、转场和
SFX；只有完整分镜确认后才进入最终素材采集。用户从 Gallery 复制镜头名时，只需
提供卡名或“卡名 · 样式名”，Agent 负责读取本地配方卡和 demo 源码。

## 核心理念

1. **复刻既有页面必须用真实截图；手搓 UI 限非复刻场景，且质量与表达
   明确性是硬门槛。** 表现产品真实页面时第一步就起本地 dev server，
   用无头浏览器截全页 2x 纹理 + 元素级抠图 + layout.json 坐标表。
   非复刻场景（抽象开场/品牌段/独立展示组件）允许手搓 UI，但达不到
   出版级质感或观众看不懂它表达什么，就回截图路线。页面数据按风险处理：
   公开演示数据只有在产品简报明确确认后才可保留；客户、个人、内部、密钥、
   实时或其他敏感数据必须用虚构或脱敏内容，且在采集前冻结。

2. **整支视频的视觉语言必须从产品自身生长，不能另造一套不相干的
   “宣传片皮肤”。** 做 styleframe 前，先从产品/网站的设计系统、源码或
   computed styles 中提取并写入设计 spec：字体家族与字重、字号层级、
   行高/字距，栅格、间距、对齐、信息密度与圆角，以及背景/表面/正文/
   强调/状态色、渐变和材质。片中所有标题、字幕、数字、字卡、版式、
   转场、粒子、光效和其他动效配色都必须复用或克制扩展这套 tokens，
   同时匹配产品的调性、品味和质感。走模板或镜头卡路线时，只继承其
   镜头结构、运动语法、节奏和已调参数；字体、排版、配色与材质必须按
   目标产品重新蒙皮。若因叙事需要偏离产品视觉，共同创作先说明理由并让用户
   确认；自主自由创作把理由与取舍写入设计 spec 后继续。

3. **电影感来自运镜、光影、节奏与声音的配合，不来自炫技动画。**
   被反复认可的是：单主角完整动作弧（聚光→推近→悬浮→归位）、
   物理隐喻驱动的加速度（发牌）、侧斜机位 orbit 环绕特写、
   riser→impact→sparkle 的声音句式。批量元素入场靠运动本身，
   不靠逐个发光——装饰性 glint/泛光群发即廉价，单点高质量光效可做。

4. **每个镜头只讲一个动效；关键信息落定后必须呼吸。**
   一种动画手法（飞入/堆叠/翻页）全片只当一次主角，重复镜头、重复
   tagline 一律删。节奏偏好是单向的：历史反馈全部指向"放慢/停留"，
   从未有一次"太慢了"——品牌字标落定 hold ≥1s、批量动效收尾留 0.5s
   静止、开场主体动作给足 3s。排时间线时预先给 hold/rest 留帧预算。

5. **强节奏 BGM 的片子，所有转场和动效必须卡在拍上。**
   用户已选好音乐 → 开工前先做节奏分析（librosa 网格拟合求真实
   BPM/相位 + kick/snare/hihat 三分类鼓点定位），网格按瞬态覆盖率
   验收通过后才分镜；时间线用拍号 `beatF(n)` 写，稀疏重音钉真实
   瞬态而非网格插值点，渲后从成片抽音轨回测切点误差 ≤3f。
   方法论见 `references/music-beat-sync.md`。
   配了 BGM 的片子终渲固定交付两版：带 BGM 版 + 无 BGM 版（保留 SFX），
   靠 `bgm` inputProp 从同一时间线渲出，方便用户后期自配音乐。

6. **用镜头卡动效必须先解析 Gallery 索引并读准确的 demo 实现代码。**
   先用 `gallery/api/library.json` 校验卡名与 `style-key`，再按卡片文档的
   “参考实现”定位具体 TSX。配方卡给的是语义和参数表，准确的 demo 源码
   才是调校过的参数真相（缓动、时值
   配比、摘罩时机、已知坑的规避写法）。允许适配性改动，但卡上
   "已知坑/命门"标注的参数不得降档——质量标准只升不降。凭卡名和
   理解新写＝放弃全部调校积累。

7. **共同创作把廉价确认物前置，自主自由创作把同样的判断留作执行记录。**
   产品简报→需求到执行决策表→文字方向→styleframe→镜头映射→分镜的顺序不变；
   共同创作逐级交给用户确认，自主自由创作由 Agent 自主选定并连续推进。两种模式
   都不应在方向未定时进入逐镜头实现。

8. **验收贯穿全程 + 交付前独立审查。** 阶段 5 起每个镜头用
   `npx remotion still` 出静帧自检、每轮修改后整片渲染 + ffmpeg
   抽帧回看；交付前必须派一个干净上下文的 subagent 做独立终检。审查输入
   包含成片、关键帧、产品简报、需求到执行决策表、当前模式确认或记录的视觉方向/styleframe、功能到镜头映射、
   Gallery 卡名/变体、准确 demo TSX、Gallery 参考样片/抽帧、最终分镜、选中的镜头卡和
   审美准则；按 `references/final-review.md`
   同时检查方案一致性、功能完整性、镜头还原度、视觉/音频技术质量和数据安全，
   逐条出带帧号证据的报告。制作者对自己的产出有确认偏差，首检永远不能交给用户。

9. **确定性渲染**：禁 `Date.now()`/`Math.random()`，一切伪随机固定
   种子（mulberry32/哈希，seed 从 index 派生），逐帧可复现。

## 工作流

自主自由创作按 `references/pipeline.md` 从阶段 0 连续执行，不逐阶段等待用户确认。
共同创作先按 `references/guided-free-creation.md` 完成阶段 0–3 的产品理解、视觉方向、
镜头映射和分镜确认，再从流水线阶段 4 的最终素材采集继续，不得重复提问或重新设计。
阶段 2–3 扫 `references/shots/` 各卡 frontmatter 按能量曲线选镜头；阶段 5–7 持续
对照 `references/aesthetic-rules.md` 自检；阶段 6 读
`references/sound-design.md`；卡点片全程贴 `references/music-beat-sync.md`。

所有模式成片交付后，默认询问用户一次是否需要同时导出**剪映工程文件**
（可在剪映里改字幕内容/字号/颜色、分镜头变速/重排、调整或替换音频）；
用户需要或直接点名导出时，读 `references/jianying-export.md` 执行。

## 何时读哪个文件

| 时机 | 读 |
|------|----|
| 项目启动且模式未定 | 最小只读检查，然后提供三种完整宣传片模式并推荐 |
| 自主自由创作 | pipeline.md（Agent 自主完成阶段 0–7，不逐阶段等待确认） |
| 共同创作 | guided-free-creation.md（确认阶段 0–3），再从 pipeline.md 阶段 4 继续 |
| 用户已选 BGM | music-beat-sync.md（先分析再分镜） |
| 走模板路线 | template/TEMPLATE.md 全文 |
| 分镜设计 | sequences/ 桥段模板（全片骨架先填空）；shots/ 全部 frontmatter；选中的卡读全文 |
| 逐镜头实现 | 该镜头卡全文 + 按“参考实现”定位的准确 demo 源码全文 + assets/lib/ 对应组件 |
| 声音设计 | sound-design.md + assets/audio/ |
| 验收 | final-review.md + aesthetic-rules.md 全文过 checklist（独立 subagent 执行） |
| 成片交付后（剪映工程导出） | jianying-export.md + `jianying-export/` 平台模块 |

## 资产使用方式

- `assets/lib/` 组件 **copy 进新项目**后自由修改（不 import 本库）。
  清单：PageCam（2.5D 页面相机——一切"真实页面"镜头的地基）、ClipCard（把外部
  视频素材 mp4 包成可被镜头卡运镜骨架驱动的"卡片主角"，含 OffthreadVideo
  交叉淡化循环——素材短于镜头时无缝续播）、DigitRoll、
  FlashCut、Caption、FlatPanel、VerticalTicker（3D 无限滚动墙）、
  helpers(rand/shake/camera/motion)。FlatPanel 与 helpers/camera 需要
  `three` + `@react-three/fiber` + `@remotion/three` 依赖，其余仅需 remotion。
- `assets/scripts/capture-template.mjs` 复制后改顶部 CONFIG（BASE/路由/选择器）。
- `assets/audio/` 音效直接复制使用（免费商用授权，见 audio/ATTRIBUTION.md）：
  `audio/bgm/` 是节奏感强的 BGM 备选；`audio/sfx/<类别>/` 149 个音效按场景分 16 类
  （transition impact riser camera ui text paper film light data scifi mech
  glass fluid crowd counter），找音先进类别目录，清单见 sound-design.md。
  词汇表 sparkle 的目录名是 `light/`（无 `sparkle/`）；S1 禁音色不禁动作——
  画面真有点击/开关就该配拟音，但 `ui/` 里一半是合成反馈音（tone/bleep/
  notification）需逐个试听、不可整目录放行（名单见 sound-design 3.3）；
  长样本与轻音素材各有名单需特殊处理（sound-design 4.1）。
- `demos/` 各卡实现源码：多数为自包含灰阶 demo（部分 import
  `demos/_fixtures/Fixtures.tsx` 的假 UI 场景件，个别 import
  `demos/_textures/` 的真实页面纹理），copy 进 Remotion 项目即可跑；
  个别 demo 用到 `@remotion/motion-blur`（CameraMotionBlur），需
  `npm i @remotion/motion-blur`，名单见 `demos/README.md`。
- `template/` 完整可渲染工程：`npm install && npx remotion render
  src/index.ts AiflPromo out/promo.mp4`。
- `jianying-export/` 剪映工程导出模块：`mac_draft.py`（Mac 剪映 11.2
  实测通过）、`windows_draft.py`（按上游支持路径实现，未真机验证）、
  `smoke_test.py`（新环境先跑的最小冒烟测试）。流程、时间线提取与建轨
  方法见 `references/jianying-export.md`；需 venv + `pip install
  pyJianYingDraft`。
- `gallery/` 静态画廊：优先直接给用户在线版
  https://vincentwei1021.github.io/video-shotcraft/library.html ；
  本地跑则先 `gallery/fetch-media.sh` 拉样片（mp4 不在 git 里），再
  `cd gallery && python3 -m http.server 4178`。152 卡 209 条动态样片
  可浏览/搜索/多选复制卡名——适合让用户看着样片挑镜头。
