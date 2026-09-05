# 动效工作台：成片交付后的可视化微调

`workbench/` 是一个剪映式的浏览器工作台（多轨时间线 + 素材库 + 属性面板 + Remotion
实时预览 + 一键导出），从系列姊妹项目 video-talkcraft 的 `workbench/` 移植而来。
skill 渲出成片后**主动打开它**，用户不用回到代码里改 tsx 就能：挪一个镜头、拉长一段
停留、改一句字卡文案、换一个音效、给某段变速，改完直接导出 MP4。

**触发时机**：任何模式下成片交付后，先跑下面的命令把工作台打开并告知用户地址，再说
「交付收尾」的 1-2-3（见 `SKILL.md`）。不要等用户问。

```bash
# 在 skill 根目录执行；<成片工程目录> = 含 package.json / remotion.config.ts 的那一层
node workbench/scripts/open.mjs <成片工程目录>
# → 链接工程 src/ 与 public/ → 生成索引 → 起 dev server（5198）→ 浏览器打开并自动导入成片
```

首次会自动 `npm install`（一次性，约 1 分钟）。dev server 后台常驻，`kill $(cat workbench/.dev.pid)` 停。
两个 skill 的工作台端口错开（talkcraft 5199 / shotcraft 5198），可同时开。

## 1. 三层可编辑度：什么能改、代码要满足什么

工作台把片子拆成 clip（Project → Track → Clip），每个 clip 有三层可编辑面：

| 层 | 用户能改什么 | 对动效代码的要求 |
|---|---|---|
| **时间与图层**（所有 clip 都有） | 起点 / 时长（超出原长尾帧定格）/ 变速 0.25×–4× / 裁入点 / 不透明度 / 缩放 / 位移 / 换轨 / 隐藏整层 | 组件是 `useCurrentFrame()` 的纯函数、tween 全部 clamp、无 `Date.now`/`Math.random`——本 skill 第 9 条铁律已保证。**现有 demo（218 个里 216 个自动接入，见 §4）与全部成片镜头无需改动**即可上轨 |
| **内容与样式**（属性面板） | 文案 / 颜色 / 字号 / 位置 / 开关 / 枚举，逐项可视化调 | 组件把语境级参数暴露为**带默认值的 props**，并给出 `schema`（字段列表，见 §3）。demo 里的顶部 `CONFIG` 常量不改就不可调——只能动时间/图层 |
| **拆解导入**（把成片一键拆成多轨） | 每个镜头 / 转场 / 字幕 / 音效各成一段，单独挪、删、复制 | 成片工程提供 `src/workbench.ts` 清单（§2），时间表与 Main.tsx **同源**，导入后不改任何东西渲出来就是原片 |

这和 talkcraft 的做法一一对应：talkcraft 把 79 张模板卡逐张复制成 `gen/*.tsx`
（CONFIG → props + schema，「节奏命门」保持 FIXED），成片则靠 `@kbsrc` 符号链接进工程、
按 `SHOTS`/`SFX_CUES`/`WIPE_TIMES` 表拆解，逐镜参数化靠为每个镜头手写 `kscene-sNN` 卡。
shotcraft 这边的差别：demo 组件 216 个全部**原样接入**（不做逐张参数化复制，避免维护两份），
成片的逐镜可编辑性由**清单里的 `schema`** 声明——所以「未来的片子能不能逐属性改」
取决于制作时是否按 §3 写镜头组件，而不是事后改工作台。

## 2. 成片工程接入清单 `src/workbench.ts`

导出一个 `WORKBENCH` 常量，结构（TypeScript 类型在 `workbench/src/cards/manifest.ts`，工程
文件不需要 import，结构兼容即可）：

```ts
export const WORKBENCH = {
  name: 'Ink Press · AIFL promo',
  fps: 30, width: 1920, height: 1080,
  total: AIFL_TOTAL,                 // 成片总帧数
  background: '#f2eee6',             // Main 最外层 AbsoluteFill 的底色
  revision: undefined,               // 可选版本号；不给则按清单内容哈希判「是不是同一版成片」
  shots: [                           // 镜头：from/duration 与 <Sequence> 一一对应（绝对帧）
    { id: 'morning', label: 'S1 墨线开场', from: 0, duration: 220, component: SceneOpen },
    { id: 'card1', label: '字卡①', from: 220, duration: 55,
      component: TitleCardUnit,                     // 吃 props 的组件
      props: { text: 'All your team’s research, *one* place to go.' },  // 成片里的实际值
      schema: [{ type: 'textarea', key: 'text', label: '文案', default: '' }],
      durationProp: 'duration',                     // 把 clip 时长注入这个 prop（尾部淡出跟着走）
      cardId: 'title-card', cardName: '字卡' },     // 四张字卡共用一张卡
    …
  ],
  transitions: [...],                // 转场层（闪白 / 光条），结构同上
  captions: [...],                   // 字幕 / 解说条
  overlays: [...],                   // 全片常驻叠加层（网格 / 暗角）
  sfx: SFX.map(s => ({ from: s.from, duration: 90, src: `audio/${s.src}`, volume: s.volume })),
  bgm: [{ from: 0, duration: TOTAL, src: 'audio/bgm.mp3', volume: 0.34 }],
  order: ['transitions', 'captions', 'overlays'],   // 叠加层 z 序（上→下），缺省即此
  original: AiflMain,                // 原合成，供 parity 对照
};
```

**范例的参数化程度**：模板六个场景 + 字卡 + 解说条全部导出 `*_DEFAULTS`（文案 / 字号 / 色板）并以带默认值
的 props 读取，清单 schema 直接引用同一对象——属性面板里改的就是屏幕上的值，缓动 / 时值 / 相机键不暴露。
demo 里的场景常量（`CONFIG` / 顶部 `const`）照这个模式提成 `DEFAULTS + Partial<typeof DEFAULTS>` 即可接入。

**同源原则**：清单里的每张表都从 Main.tsx `import`（`SHOTS` / `CAPTIONS` / `SFX` / 字卡文案表），
不要手抄第二份。范例：`template/src/workbench.ts` + `template/src/aifl/Main.tsx`
（`AIFL_SHOTS` / `TITLE_CARDS` / `CAPTIONS` / `SFX` / `FLASH_CUTS` / `sfxDuration` 全部 `export`，
渲染与清单同一份数据）。

**版本判据**：`?import=project` 打开时，存档的 `source` 与 `manifestKey(清单)` 不同才重新导入。key = 名字 + 总帧数 + `revision`，
未写 `revision` 时用清单内容哈希（时间表 / label / props / 单元→卡的分组拓扑 / 组件 displayName / 音效表）——改了镜头位置、文案、
音效或换了组件即视为新版本；旧存档压进撤销栈，⌘Z 可找回。

**分组规则**：同一 `cardId`（或同一 `component` 引用）的单元共用一张「成片单元卡」，
素材库里只出现一次，可以再拖一份上轨；`label` 是时间轨上的显示名。卡 id 为
`proj:<kind>:<cardId|首个单元 id>`；显式 `cardId` 与另一组的首个单元 id 撞名（或单元 id 重复）时，
后出现的组加 `~2` 后缀并在控制台警告——请给单元换 id 或写显式 `cardId`，别依赖后缀。

**素材路径**：`sfx[].src` 等一律相对工程 `public/`（工作台把工程 `public/*` 链接进自己的
`public/`）。字幕/字卡文案里的 `*词*` 记法是 Ink Press 字卡的强调词 DSL（`parseWords`），
其他工程可以自定 DSL，只要 props 是字符串/数字/布尔就能进属性面板。

## 3. 制作新片时怎么写镜头（让它"未来可编辑"）

在 pipeline 阶段 5 实现每个镜头时：

1. **语境级参数 → props（带默认值）**：文案、颜色、字号、位置、开关、数据（多条用逐行
   文本 DSL）。**节奏命门保持常量**（弹入时长、错峰间隔、缓动曲线、相机路径）——它们决定
   动效品相，暴露出去反而容易调坏。这与 talkcraft 的「FIXED / 开放」分界一致。
2. **`duration`/`dur` 类 prop 要真的用**（出场淡出按它算），清单里声明 `durationProp`，
   clip 拉长后淡出会跟着挪而不是定格在原时长处。
3. **时间表只写一份**：`timeline.ts`/`Main.tsx` 里的 `SHOTS` 是唯一事实源，SFX 钉帧、字幕
   表、转场点都从它派生并 `export`；`workbench.ts` 只 import + 补 component/schema。
4. **纯函数、确定性**：不读 `useVideoConfig().durationInFrames` 做绝对时间假设（motion-lab
   系 `useT()` 归一化是例外且被工作台正确处理：clip 拉长=动画放慢）。
5. 交付前跑一次 `npm run parity`（§5）确认拆解无损。
6. **实时预览得跑得动**：Player 是实时合成，不像渲染那样每帧等栅格化完成再截图。铺满巨型平面
   （几千 px 见方）的程序渐变 / `backdrop-filter` 放在 PageCam 这类每帧改 `zoom` 的 3D 层里，
   Chrome 栅格化跟不上就整块时有时无——Ink Press 模板 S3 的金属桌面曾因此在预览里疯狂闪，
   其余镜头全片 0 次异常（用 CDP screencast 逐帧测亮度脉冲得出）。这类纯装饰的重绘内容用
   `getRemotionEnvironment().isRendering` 分流：渲染走原效果，预览用纯色 / 更轻的替身，几何
   与时序不变（`SceneFlyIn.tsx` 的 `METAL_PREVIEW` 是范例）。parity 只比渲染结果，所以仍成立。

schema 字段类型：`text` / `textarea` / `number`（min/max/step/unit）/ `slider` / `color` /
`select`（options）/ `boolean`，定义在 `workbench/src/cards/types.ts`。

## 4. 动效库（demos/）在工作台里的形态

`scripts/gen-index.mjs` 扫 `demos/<类别>/<卡>/<组件>.tsx`，凡导出 `<组件>: React.FC`（无必填
props）即接入为一张卡（218 个 tsx 里接入 216 个：`ClipCardLooping` 需要真实 mp4 素材、
`page-waterfall-wall/VerticalTicker` 是辅助组件，两者跳过），中文名/分类/一句话取自画廊 `library.json` + `translations.js`，
预览用 `gallery/media/<style>.mp4`（先 `gallery/fetch-media.sh` 拉取，否则用 Player 实时循环）。
时长取值链：demo 导出的 `*_DURATION|*_DUR` → 镜头卡 md「时长:」的 `NNNf` → 文件内
`const *DUR*` → 缺省 150f；来源写在 `DEMO_MODULES[].durationSource`，clip 上轨后随时可裁。
demo 全部 schema 为空（时间/图层可编辑，属性不可编辑）——要逐属性调参就按 §3 把 CONFIG
提成 props，加 `export const schema`… 目前不自动读取，属于后续扩展点。

工作台自带 4 张参数化原生卡：通用文字、Ink Press 字卡、解说字幕条、暖白闪转场
（`workbench/src/cards/inkpress/`，源出 template 组件，动效逐字同式，文案/颜色/字号开放）。

## 5. 导出、Studio 与无损校验

- **导出成片**：顶栏「导出成片」→ dev server 内起 Remotion CLI 渲当前工程（`workbench/exports/`）。
  渲染前会把 `public/` 解引用同步到 `.render-public/`（Remotion 静态服务器拒绝服务符号链接）。
  `remotion.config.ts` 与 template 同口径：jpeg 帧、ANGLE GL、并发 4。
- **Remotion Studio**：`cd workbench && npm run studio`——`Main`（贴工程 JSON）、`ProjImported`
  （刚导入的成片）、`ProjOriginal`（原合成）+ 每张卡一个合成（schema 自动转 Zod，官方 Inspector 调参）。
- **无损校验**：`npm run parity -- --frames 150,240,470,1000` 渲 `ProjImported` 与 `ProjOriginal`
  同帧 PNG 逐像素比对（需 python3 + Pillow），差异像素 < 0.1% 视为一致。退出码 0 一致 / 1 有差异 /
  2 无法得出结论（缺 Pillow、比对未执行）——不会假绿。改过清单或 Main.tsx 的时间表后跑一次。

## 6. 已知边界

- 同轨允许 clip 重叠（层级用多轨表达）；变速为匀速重映射（无曲线变速）。
- 卡片库（demo / 原生卡）按 30fps 编排（`CARD_FPS`），成片单元卡按成片清单的 fps（`CardDef.sourceFps`）；
  工程 fps 不同时，拖卡上轨按 `clipDefaultsFor` 换算时长并反向变速，播放速度不变；媒体卡
  （视频 / 音频 / 图片，`timing: "realtime"`）只换算时长、不变速。Freeze 不改 `useVideoConfig().fps`，
  卡内若用 `spring({fps})` 等按秒计时，非 30fps 工程里节奏会偏移——属性面板会提示，成片单元不受影响
  （帧率与工程一致）。时间码 / 片段秒数 / 预览余量都按工程 fps 计。
- `open.mjs` 只重启自己启动的 dev server（`.dev.pid` + 进程命令行核实）；端口被手动起的 server
  占着时报错退出，因为 `@proj` 别名在 vite 启动时定死、刷新不会换工程。
- 音频 clip 导入时截到成片总长（原片里超出合成尾部的 `<Sequence>` 本就被截）。
- demo 卡需要的灰阶纹理（`textures/live/*.png`）：工程自己带 `public/textures` 时以工程为准，
  否则工作台兜底链接 `demos/_textures`；工程纹理与 demo 纹理同名不同图时 demo 预览会"换皮"。
- 工程 `src/` 被以符号链接方式打包进工作台，`react`/`remotion` 落到工作台的 node_modules
  （remotion 4.0.484 / React 19）；工程若用了 `@remotion/three`、`three`、`@remotion/motion-blur`、
  `@remotion/google-fonts` 以外的包，先在 `workbench/` 里装同版本。
- 与剪映导出（`jianying-export.md`）的分工：剪映给"外部剪辑软件里继续剪"的用户；工作台给
  "在本机浏览器里改几处就出片"的用户，且能改镜头内部的参数化属性（剪映只能整段变速）。
