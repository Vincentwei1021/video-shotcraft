# ShotCraft Workbench · 动效工作台

> 面向使用者的图文指南（各区域与功能、截图）见 [GUIDE.md](GUIDE.md)；本文是技术说明。

剪映式的成片后期台：多轨时间线 + 素材库（成片单元 / 216 个镜头卡 demo / 音效库 / 背景）+
schema 属性面板 + Remotion 实时预览 + 一键导出。skill 交付成片后由
`scripts/open.mjs` 自动打开，用户不用回到代码里改 tsx 就能挪镜头、改文案、换音效、变速、导出。
移植自 [video-talkcraft/workbench](https://github.com/Vincentwei1021/video-talkcraft)，
数据模型与 UI 同源，卡片来源与成片接入方式按本仓库改造。

方法论与成片接入契约见 [`references/workbench.md`](../references/workbench.md)。

```bash
# 交付后（在 skill 根目录）：链接成片工程 → 生成索引 → 起 dev server → 浏览器打开并自动导入
node workbench/scripts/open.mjs <成片工程目录>

# 单独把玩（不接成片）：
cd workbench && npm install && npm run dev      # http://localhost:5198
```

## 能做什么

- **素材库四 tab**：素材（成片单元 + 工程 public/ 里的图片视频）· 动效库（demos/ 216 个 demo 按画廊
  10 类折叠，有本地样片的循环预览，没样片的卡显示定妆帧、悬停才播放）· 音效（本片音频 + `assets/audio/sfx` 149 个音效按 16 类 +
  5 首 BGM）· 背景（纸底 / 纯白 / 墨黑 / 纸底提亮）。**点击=中屏预览，拖拽到时间轨=添加**
- **时间轨**：多轨道（上层覆盖下层，拖轨道头排序）、拖动、两端裁剪、跨轨、吸附、分割（S）、
  复制（⌘D）、缩放/适配；三栏与时间轨的分隔条都能拖
- **属性面板（schema 驱动）**：成片单元与工作台原生卡的文案 / 颜色 / 字号 / 位置逐项可调；
  通用 clip 属性：起点 / 时长（定格延长）/ 变速 0.25×–4× / 裁入点 / 不透明度 / 缩放 / 位移
- **成片拆解导入**：按工程 `src/workbench.ts` 清单一键拆成 镜头 / 转场 / 字幕 / 叠加层 / 音乐 /
  音效 的多轨工程，落点与原 `<Sequence>` 逐帧一致（`npm run parity` 可证）
- **保存**：自动存 localStorage（800ms 防抖），导出/导入工程 JSON，撤销/重做
- **导出成片**：顶栏「导出成片」→ dev server 内起 Remotion CLI 渲当前工程为 MP4 → `exports/`
- **Remotion Studio**：`npm run studio`（每张卡 Zod schema 自动生成；`ProjImported` / `ProjOriginal` 对照）
- **无损校验**：`npm run parity`——退出码 0 一致 / 1 有差异 / 2 无法比对（缺 python3+Pillow），不假绿

## 接入成片工程

```bash
node scripts/open.mjs <成片工程目录>        # 目录 = 含 package.json 的那层，源码在 src/ 或 remotion/src/
node scripts/open.mjs                     # 沿用上次链接的工程（只重启/复用 dev server）
node scripts/open.mjs <dir> --no-open     # 不弹浏览器
```

做的事：`ln -sfn <工程>/src proj`、把 `<工程>/public/*` 逐项链接进 `public/`、跑 `gen-index`、
起 vite（5198）、打开 `http://localhost:5198/?import=project`（存档不是这一版成片时按清单自动导入，
旧存档进撤销栈；是这一版则保留你的改动）。全部是机器本地符号链接，不进库。

给了工程目录就会重启 dev server（`@proj` 别名在 vite 启动时定死），但只重启本脚本自己起的那个
（`.dev.pid` + 进程命令行核实，pid 被复用不会误杀）；端口被手动 `npm run dev` 占着时直接报错，
请先停掉它或加 `--port`。

工程要提供 `src/workbench.ts` 清单才能拆解导入（写法见 references/workbench.md §2，范例
`template/src/workbench.ts`）；没有清单也能打开，只是素材 tab 没有导入按钮。

## 快捷键

| 键 | 动作 |
|---|---|
| 空格 | 播放 / 暂停 |
| S | 在播放头处分割选中片段 |
| Delete / Backspace | 删除选中片段 |
| ⌘D | 复制选中片段 |
| ⌘Z / ⇧⌘Z | 撤销 / 重做 |
| ← / →（+Shift） | 步进 1 帧（10 帧） |

## 架构

```
src/
  types.ts                数据模型：Project → Track → Clip（时间量单位=帧）
  store.ts                zustand 状态（撤销栈 / 自动保存 / ?import=project 自动导入）
  projectImport.ts        清单 → 多轨工程（镜头/转场/字幕/叠加层/音乐/音效贪心装箱）
  dnd.ts                  素材库 → 时间轨拖拽协议
  preview/Composition.tsx clip → <Sequence> + TimeRemap(Freeze) / 媒体原生通道 / durationProp 注入
  preview/PreviewPanel.tsx Player + 走带 + 素材点击预览
  timeline/               标尺 / 轨道 / clip 拖拽裁剪 / 拖放接收
  panels/                 素材库四 tab / schema 属性面板
  remotion/               Remotion CLI 入口（Studio + 渲染导出 + parity 共用）
  cards/
    types.ts              CardDef / PropField（schema 字段类型）
    manifest.ts           成片工程清单类型 WorkbenchManifest
    registry.ts           注册表：原生卡 + 媒体卡 + 背景卡 + 成片单元卡 + demo 卡
    demoCards.ts          demos/ 全量接入（demo-index.ts + demoMeta.ts 由 gen-index 生成）
    projectCards.ts       清单单元 → 成片单元卡（同 cardId / 同组件共用一张）
    inkpress/             参数化原生卡：字卡 / 解说字幕条 / 暖白闪转场（源出 template 组件）
    text-basic.tsx        通用文字卡
scripts/
  gen-index.mjs           静态索引 + 素材清单 + 仓库级链接（prepare / predev / prebuild / prestudio 自动跑）
  open.mjs                交付后一键打开（链接工程 → gen → dev server → 浏览器）
  parity.mjs              ProjImported vs ProjOriginal 逐帧比对
proj-stub/                未链接成片工程时的降级实现
demosrc -> ../demos       demo 源码（相对符号链接，进库）
public/                   全部由脚本按本机链接生成（不进库）
remotion.config.ts        CLI 打包配置（@proj/@demos 别名 + jpeg/angle/并发 4，与 template 同口径）
vite.config.ts            Vite + 导出渲染 API（POST /api/export → Remotion CLI）
```

## 已知边界

- 同轨允许 clip 重叠（层级用多轨表达）；变速为匀速重映射（无曲线变速）
- 卡片库按 30fps 编排、成片单元按成片 fps；非 30fps 工程里拖卡上轨会换算时长 + 反向变速（媒体卡只换算时长），播放速度不变；按秒计时（spring）的 demo 节奏会偏，面板有提示
- demo 卡 schema 为空：能裁剪 / 变速 / 定格 / 图层变换，不能改文案颜色——要可调参先把 CONFIG 提成 props
- 导出走 dev server（`npm run dev` 时可用）。Remotion 静态服务器拒绝服务符号链接，所以导出前
  自动把 `public/` 解引用同步到 `.render-public/`；命令行手动渲染同理：
  `npx remotion render src/remotion/index.ts Main out.mp4 --props=<{"project":…,"renderExact":true}> --public-dir=.render-public`
- 工程源码以符号链接方式打包进工作台，`react`/`remotion` 解析到工作台的 node_modules
  （remotion 4.0.484 / React 19；已装 `@remotion/motion-blur` `@remotion/three` `three` `@react-three/fiber` `@remotion/google-fonts`）
