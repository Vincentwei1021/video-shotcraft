# HTML material gate — A / B / B+A / raster 决策与验收

用于最终分镜放行后的页面素材采集。目标不是消灭截图文件，而是让截图退出默认
视频素材角色：每个页面状态仍采 baseline PNG 做视觉真值；只有 HTML 路线有明确
失败证据时，PNG/录屏才允许进入成片。

## 四种结果

| 结果 | 素材 | 适用镜头 |
|---|---|---|
| B | 整页 MHTML 派生的脚本禁用离线 HTML | 整页展示、页面级推拉/旋转/滚动/裁切 |
| A | 一个目标 DOM 子树的冻结 HTML + computed styles + 字体/资源 | 逐元素入场、改文案/数字、重排、透明悬浮、深度特写 |
| B+A | B 作真实页面背景，A 作独立 hero/行/卡片层 | 页面仍在场，同时元素脱离页面做戏后归位 |
| raster fallback | 真实截图或录屏 | HTML 无法保真/确定重放的已验证内容；不是便捷选项 |

A/B 是逐镜头、逐页面状态门控，不是整支片只能选一种。B 是标准 DOM 页面的默认
起点；分镜出现元素级动作时升级到 A 或 B+A。

## 门控输入：先读分镜动作，不先看现成素材

给每镜回答下面五个问题，并写进 `shot-material-plan.md`：

1. 观众看的是整个页面，还是页面内一个独立元素？
2. 元素是否需要独立移动、逐个入场、脱离 stacking context 或飞到页面外？
3. 是否要修改文字、数字、输入值、主题或显隐状态？
4. 是否有大倍率文字特写，或 4K+ 下必须保持 DOM/SVG 锐度？
5. 页面是否含 Canvas/WebGL/video/跨域 iframe/复杂原生控件等非标准 DOM 内容？

门控顺序：

```text
真实页面镜头
  ├─ 只做页面级运镜，内部不改       → B candidate
  ├─ 只要独立组件/元素              → A candidate
  ├─ 页面背景 + 独立元素共同出现     → B+A candidate
  └─ 非 DOM 内容或 HTML 验收失败     → 先试另一 HTML 路线，再 raster fallback
```

只要问题 2–4 任一为“是”，就不能用“复制整页 iframe 再 clip”冒充元素层；选择 A，
需要保留页面背景时选择 B+A。

## 技术资格门

### B candidate

优先 B 的页面应满足：

- 浏览器能稳定到达明确状态，viewport/theme/locale/数据可冻结；
- 页面主要由标准 DOM/CSS/字体/图片/SVG 构成；
- 镜头不需要父层逐个操纵 iframe 内部元素；
- MHTML 可完整捕获关键资源，派生 HTML 能断网加载；
- script、事件和 CSS 动画被剥离后，目标状态仍成立。

### A candidate

优先 A 的目标应满足：

- 有稳定 selector 或可复核的目标定位方式；
- 目标视觉主要来自自身及可冻结祖先变量，不依赖持续运行的业务脚本；
- computed styles、字体、图片、SVG 和当前表单值可冻结；
- `::before`/`::after`、背景资源、Shadow DOM 等特殊内容已被物化或被门控识别；
- 逐帧动画可以只由 Remotion frame 决定。

### 直接进入 fallback 评估的信号

- Canvas/WebGL 中的关键画面；
- 必须保留动态视频帧或实时流；
- 无法访问内容的跨域 iframe；
- 浏览器原生控件或插件界面无法复制；
- 登录/回执类取证镜头要求原始像素状态；
- A、B 均经过针对性修复仍无法通过保真或确定性门。

这些信号只允许对应区域降级，不自动把整页、整镜头都改成截图。能用 B 的背景和
A 的 DOM 区域继续保留 HTML。

## 采集单位：Page State，而不是 URL

同一个 URL 的菜单关闭、菜单展开、填写完成、提交中和结果态是不同素材状态。
每个状态固定：

- viewport、DPR、theme、locale、timezone；
- 演示数据、日期、随机种子和滚动位置；
- 字体加载完成；
- 必要交互已经执行；
- DOM 到达 quiet window。

复杂状态可用 Puppeteer 操作；TesterArmy 式自然语言浏览器代理只负责“到达状态”，
不能替代 A/B 采集器。

## State Bundle

建议每个页面状态输出：

```text
materials/<state>/
  raw/
    state.mhtml              # 保真原档，不进入 public/ 和交付包
    dom-snapshot.json        # DOM/layout/paint/computed-style sidecar
  qa/
    baseline.png             # 在线视觉真值，不默认进入视频
    offline.png              # state.html 离线重放
    fidelity.json            # SSIM/bbox/请求/console/hash
  capture-meta.json          # URL/state/viewport/DPR/theme/locale/hash/时间

public/materials/<state>/
  state.html                 # B：脚本禁用、资源内联、零网络的派生文件

src/materials/<state>/
  elements.json              # selector/bbox/text/样式/安全分类
  fragments/<name>.json      # A：html/尺寸/fontCss/资源/issues
```

MHTML 是内部原档，可能包含隐藏 DOM、内部 URL 或预加载数据，不得直接放进
`public/` 或随成片分发。

## B 操作路线

1. 复制 `assets/scripts/capture-html-page.mjs` 到 work，配置 URL、状态准备函数、
   viewport 和输出目录。
2. 在同一稳定状态附近采 baseline、`Page.captureSnapshot` MHTML、
   `DOMSnapshot.captureSnapshot` 和 elements manifest。
3. 将 MHTML 资源内联为 data URL；删除 script、inline event、meta refresh、表单
   提交和外网能力；禁 CSS animation/transition。
4. 断网重放生成 offline PNG，完成下面的验收门。
5. 运行 `node assets/scripts/verify-html-material.mjs <material-dir>`；只有退出码 0
   且 `fidelity.json.htmlSafe=true` 才进入制作。
6. 复制 `assets/lib/HtmlPageCam.tsx` 进 Remotion 工程，用 `state.html` 做页面平面。

不要直接使用 `page.content()`/outerHTML：它不携带外部 CSS、字体、图片、Shadow
DOM 和足够的运行时状态。不要在 Remotion 中加载真实线上应用。

## A 操作路线

1. 复制 `assets/scripts/capture-dom-fragment.mjs`，配置 URL、状态准备函数和 selector。
2. 在干净隔离 iframe 中取得各 tag 的默认样式；递归遍历目标子树，把真实
   `getComputedStyle()` 与默认值的差异内联。
3. 同步冻结字体、图片、CSS 背景资源、SVG 属性和表单当前值；移除 script、事件、
   animation/transition。伪元素等无法物化内容写入 `issues`，不得静默忽略。
4. 生成目标 baseline 与离线 fragment 重放图，完成下面的验收门。
5. 运行同一个 `verify-html-material.mjs`；只有 `htmlSafe=true` 才进入制作。
6. 复制 `assets/lib/FrozenHtmlFragment.tsx`；通过 ref 查询内部行/卡片，让所有样式和
   文本变化成为 frame 的纯函数。不要把素材手工改画成近似 JSX。

A 是自动冻结浏览器真实 DOM，不是人工照着页面重写 HTML。

## 三道验收门

### 1. 保真门

- B：同 viewport 离线图对 baseline 的 SSIM ≥0.98；
- A：目标区块离线图对 baseline 的 SSIM ≥0.98；
- 关键元素 bbox 漂移 ≤1 CSS px；
- 字体、图片、SVG、背景资源和当前输入值无缺失；
- 不能只写“肉眼差不多”，必须保留图片和指标。

### 2. 离线与安全门

- 离线重放外网请求为 0；
- script、inline event、`javascript:`、meta refresh、表单提交能力为 0；
- iframe 默认 `sandbox=""`，不允许脚本、同源、表单和导航权限；
- bundle 不含 cookie/localStorage/sessionStorage/IndexedDB/auth header；
- 客户名、邮件、token、内部 URL、source map、隐藏 DOM 和预加载 JSON 完成扫描；
- 原始 MHTML 不进入 public 和交付包。

### 3. 确定性门

- CSS animation/transition/caret/autoplay 已冻结；
- 同一个 Remotion 帧连续渲染两次，像素 hash 完全一致；
- 禁 `Date.now()`、无参 `new Date()`、`Math.random()`；
- A 的所有 DOM mutation 只由 frame 和固定输入决定，任意 seek 后结果相同。

三道门全部通过才标记 `html-safe`。

## 失败处理与停止条件

1. 根据 QA 证据做一次针对性修复并重采，例如补字体、重写资源、物化伪元素。
2. 同类失败再次出现时，评估另一 HTML 粒度：B 失败但只需一个区块则试 A；A 的
   祖先依赖过重则试 B；需要两者则 B+A。
3. 两条 HTML 路线均失败或内容属于明确非 DOM 边界，记录证据后只对必要区域使用
   raster fallback。不要无限重试，也不要无证据提前降级。

## `shot-material-plan.md` 最小字段

```markdown
| shot | 页面状态 | 分镜动作需求 | candidate | 技术风险 | QA | final | fallback 证据 |
|---|---|---|---|---|---|---|---|
| S03 | dashboard-ready | 整页推近，不改内部元素 | B | webfont | pass | B | — |
| S04 | results-open | 行逐条飞入并改数字 | B+A | ::before | pass | B+A | — |
| S07 | canvas-playing | 图形持续运动 | A/B 不支持 Canvas | fail | video | canvas diff |
```

`candidate` 在采集前由分镜决定；`final` 只能在 QA 后填写。成片的每个 raster UI
都必须能回到本表的一条失败证据。

## 已验证效果与边界

- B 在 tester.army 1440×900 实验中：普通 `page.content()` 离线 SSIM 0.151；
  MHTML 1.000；MHTML 派生普通 HTML 0.992，可进入 Remotion 做整页卡片运镜。
- A 在 tsenta FIND 面板实验中冻结 67 个真实 DOM 元素，实现逐行入场、局部辉光、
  文字改写和 550% 推近，断网重放通过。
- 这是标准 DOM 页面可行性证据，不是所有网页自动通过的承诺；门控与 fallback
  正是用来守住未覆盖边界。
