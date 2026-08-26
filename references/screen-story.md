# screen-story — 录屏演绎：实操走查镜头的默认语言

把"真实体验产品流程"拍成 Recordly / Screen Studio 式的精修录屏：壁纸相框里一块
浏览器屏幕，合成光标走完真实旅程，点击出涟漪、界面给反馈、相机自动推近，全部
逐帧确定性渲染。首个完整实证：`works/tsenta-promo-v3`（60s，31 个状态快照）。

**默认规则：分镜中凡属"实操走查"性质的镜头（注册/上传/点按钮/填表/提交/看结果
这类第一人称使用过程），一律默认采用本语言呈现——合成光标 + 点击动效 + 状态
反馈；不再用静态素材配运镜硬撑。** 非走查镜头（品牌段、抽象开场、数据展示）
不受此约束。

## 与 html-material-gate 的关系

- 本路线是 gate 中 **B 路线的"多状态旅程版"**：一次登录会话里沿真实流程连续
  采集 N 个 Page State，每个状态一份 MHTML 派生的单文件 HTML + 元素 rect 元数据。
  脱敏、剥 script、禁 CSS 动画、离线回放 QA 与 gate 同规格。
- **一处有意豁免**：gate 要求素材 iframe 加 `sandbox=""`；本路线的 HtmlSnap
  **不加 sandbox**——逐帧 DOM 驱动（打字/滚动/点亮/动画复刻）必须同源访问
  `contentDocument`。安全由素材侧保证：script 已剥、资源全内联零网络、仅在
  本地渲染管线内加载。除此以外三道验收门照走。

## 采集：journey 旅程式采集器

copy `assets/scripts/journey/` 整目录内容到 work 的 `scripts/`：

| 文件 | 职责 |
|---|---|
| `browser-daemon.mjs` | 常驻无头 Chrome（持久 userDataDir，跨脚本保持登录态），后台启动 |
| `journey.mjs` | 步进 CLI：`goto/text/shot/click/clicksel/type/press/upload/scroll/eval/snap` |
| `mailtm.mjs` | mail.tm 临时邮箱（`create/poll`），全自动注册收验证码 |
| `verify-replay.mjs` | 全部快照断网回放截图，与采集时活页截图对照 |
| `lib/mhtml.mjs` | MHTML→单文件 HTML + 邮箱脱敏 + 剥 script/禁动画（已验证实现，勿重写） |

工作方式是**人驱步进**而非一把梭脚本：每一步一条命令，看 `text`/`shot` 输出
确认状态再走下一步——陌生产品 UI 必然有意外（隐藏 checkbox、同名按钮的不可见
副本、React 不认 `element.click()` 要用真实坐标 `page.mouse.click`）。

`snap <slot>` 一次产出三件东西：

1. `public/captures-html/<slot>.html` — 素材本体
2. `public/captures-html/meta/<slot>.json` — 页面尺寸 + 全部可交互元素的文本与
   rect（**光标/相机编排的瞄准数据**），并自动重生成 `src/film/materials.gen.ts`
3. `out/qa/htmlmat/<slot>.png` — 采集时活页截图（QA 基准）

### 采集纪律（实操走查特有）

- **先开产品的安全门再动手**：产品若有自动提交类能力（如 Auto-approve），启动
  任何申请/发送流程前先在设置里关掉、开启人工复核（tsenta 实测默认 Auto-approve
  **On**，这一步救过一次）。
- 对外提交只打**明确标注的沙箱/测试目标**，一次性、留证据；虚构侧写用保留数据
  （555 号段电话、example.com 邮箱、Demo University 一类）。
- 临时邮箱/账号密码只落 `out/`（gitignore），不进版本库不进素材。
- **快照污染三清**：临时故障横幅（采集前 DOM 移除）、hover 提示浮层、新手引导
  coachmark（driver.js 的 `.driver-popover/.driver-overlay`）——后两类渲染时用
  HtmlSnap 的 `patchCss` 隐藏。
- 完整服务端影响写进 work 的 `docs/CAPTURE-LOG.md`（格式沿用 tsenta-promo-v2/v3）。

## 组件族：copy `assets/lib/screen-story/` 整目录到 work 的 `src/film/`

| 文件 | 职责 |
|---|---|
| `ScreenStage.tsx` | 舞台：macOS 壁纸 + 圆角窗口 + 地址栏 + 卡片缩放相机 + 光标层 + 素材硬切 |
| `HtmlSnap.tsx` | 快照 iframe 渲染器：`patchCss`（一次性补丁样式）+ `drive`（逐帧 DOM 驱动）|
| `Cursor.tsx` | 光标：E.glide 插值移动、按压回弹、品牌色涟漪（**锚定点击帧位置**）|
| `camera.ts` | 页面坐标系相机：keyframe 插值 + 视野 clamp + `findEl(slot, 文本)` 瞄准 |
| `choreo.ts` | `Shot` 编排 DSL：`.cut/.cam/.camHold/.cur/.curHold/.click` 链式写镜头 |
| `drives.ts` | 驱动器库：`typeInto/scrollInner/enableButtonAfter/growMatchRings/revealHighlights/hideByText/compose` |
| `motion.ts` | `progress/lerp/drift/keyframes` |
| `tokens.ts` | ⚠ 示例调色板，须按目标产品重新蒙皮（保留 E 缓动结构）|

最小场景写法：

```tsx
const shot = new Shot('dashboardMain', { cx: 960, cy: 512, z: 1.02 })
  .cam(70, { cx: 330, cy: 505, z: 1.6 })          // 相机 70 帧内缓推特写
  .cur(20, at(700, 700))                           // 光标入场
  .cur(60, findEl('dashboardMain', 'Apply'))       // 移到按钮（rect 元数据瞄准）
  .click(72, { cut: 'nextState', cutDelay: 10 });  // 点击→涟漪→切下一状态

<ScreenStage frame={frame} cuts={shot.cuts} camera={shot.camKeys}
  cursor={shot.curKeys} clicks={shot.clicks} url="app.example.com" />
```

## 背景与缩放模型（Recordly 语义，2026-08-26 定版）

- **背景默认 = 本库自带的 macOS Tahoe 壁纸**（用户 2026-08-26 指定为永久默认）：
  copy `assets/wallpapers/tahoe-light.jpg` 到 work 的 `public/wallpaper-tahoe.jpg`，
  ScreenStage 默认 prop 即指向它。品牌段/CTA 传 `wallpaper={null}` 用产品渐变。
  想换其他 macOS 壁纸时可从采集机 `/System/Library/Desktop Pictures/*.heic`
  用 `sips -s format jpeg --resampleWidth 2400` 转出，但没有明确要求就用 Tahoe。
- **卡片缩放模型**：页面内容始终整页适配窗口（不做窗口内平移）；相机
  `{cx, cy, z}` 的语义是**绕页面锚点把整个窗口连壳带内容放大 z 倍**——
  等价实现 `translate((1-z)·anchor) scale(z)`，锚点在画布上保持不动。
- **三档取景刻度**（默认窗口=画布宽 67%，内容 1280×720）：
  z≈1.0–1.25 桌面上的窗口（大边距，scenic）；z≈1.4–1.6 阅读时刻
  （近满屏，锚点偏侧时留一条壁纸边，正是 Recordly 1.5x 的观感）；
  z≥1.7 英雄特写（出血画布）。**换窗口尺寸必须重标定全片 z**：
  内容放大率 = (窗宽/页宽)·z，读文字的时刻放大率要 ≥0.9。
- 窗口样式：圆角 16、白 28% 描边、双层深投影（壁纸上要压得住）。

## 编排军规（历次用户反馈的固化，不得降档）

1. **只拍产品特点**。注册表单、运营问卷、多步信息填写这类"谁家都一样"的流程
   直接省略或一笔带过；片长留给匹配/生成/复核/提交/追踪等真卖点。
2. **点击必须有可见反馈**。每个 click 要么切状态快照，要么用 drive 点亮 UI
   （按钮变实、选项选中）。"涟漪出现但页面纹丝不动"是硬伤。优先选用自带
   选中态的快照做素材。
3. **相机要柔**。相机 easing 用 `E.soft`（对称缓起缓停），过渡 ≥30 帧；光标用
   `E.glide`；手持呼吸 ≤1.2px。禁止快起慢停的"甩镜头"。
4. **音效克制**。点击 SFX 只配动作型按钮（提交/继续/抓取类），聚焦、悬停只出
   涟漪不出声；音色用自然鼠标轻击（media-use resolve "soft natural mouse
   click"），音量 ≤0.35；全片点击音 10 次上下为宜。
5. **资产矢量化**。logo/lockup 不用 PNG——mark 从快照里提取 SVG path，字标用
   产品同款字体（随工程冻结）原生重排。
6. 涟漪必须锚定**点击帧**的光标位置（`keyframes(keys, clickFrame)`），跨状态
   切换残留是真实录屏手感，保留。

## DOM 驱动动画：原站动画的手写复刻

快照禁 CSS 动画、剥 JS——**动画过程丢失、终点状态保留**。复刻原则：

- **默认手写，且只在需要动画的地方写**。判断口诀：*"用标准缓动手写它，观众能
  看出不对吗？"* 淡入/生长/滚动等通用运动答案是"看不出"→ 手写（95% 情形）。
- 判错可事后补救（成片回看不对再改），不做运动轨迹录制、不为此加管线。
- 驱动器写法四步配方：**选择器找到目标 → 首帧扫描把终点真值缓存进 dataset
  （幂等）→ 进度 t = clamp((f − 起始) / 时长) → 每帧从头写全量样式**。
  一切状态都是帧号的纯函数，双向 seek 安全。
- **头号坑**：快照常含隐藏的重复元素（diff 副本、响应式副本，rect 0×0 且文档
  序靠前）——标记目标时必须过滤 `getBoundingClientRect().width`，否则错峰序号
  被幽灵占满，可见元素排不进场景。
- 现成参考：`typeInto`（打字机）、`scrollInner`（容器内滚）、`enableButtonAfter`
  （按钮点亮，setProperty+important 压 Tailwind disabled 态）、`growMatchRings`
  （SVG 环 dashoffset 生长 + 数字滚动，跨场景用 `ringsEmpty` 清零待命防跳变）、
  `revealHighlights`（高亮错峰淡入）。后三个是按 tsenta DOM 写的示例，新产品
  照配方重写匹配逻辑。

## 验收追加项（在 final-review 通用清单之上）

- 每个点击帧前后抽帧：有涟漪、有按压回弹、且 UI 有可见反馈；
- 全片点击 SFX 计数与音量合规（动作型才有声）；
- 相机无 <30f 的急促移动；素材切换处无"动画重置跳变"（清零待命是否到位）；
- 快照无冻结浮层/引导/故障横幅残留；
- 尾板 lockup 放大 2× 仍锐利（矢量验证）；
- 打字/滚动/自定义驱动器逐帧 seek 往返一致（确定性门）。
