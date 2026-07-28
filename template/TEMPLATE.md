# template/ — 成片模板 Ink Press：纸墨晨读风产品宣传片（36.2s）

一支已验收的完整宣传片工程，作为"极度相似复现"的模板：换一个 web/桌面
产品的截图素材，按本文档逐镜头替换适配，即可得到同等质感的成片。

- 规格：1920×1080 @ 30fps，1085 帧（36.2s），SFX-only（无 BGM 版）
- 风格：纸墨琥珀（纸底 `#f2eee6`，墨字，衬线大标题，琥珀强调色）
- 跑起来：`npm install && npx remotion studio src/index.ts`（预览）
  / `npx remotion render src/index.ts AiflPromo out/promo.mp4`（渲染）
- 验收静帧：`npx remotion still src/index.ts AiflPromo out/qa/f150.png --frame=150`

## 一、片子结构（src/aifl/Main.tsx 的 AIFL_SHOTS）

能量骨架：品牌开场（低）→ 功能段×3 与字卡呼吸位交替（中高/低）→
结尾组装推到全片峰值。两处 wordmark 时刻（开场、收尾）落定后 hold 满 1s。

| # | 帧区间 | 时长 | 场景文件 | 内容 | 对应镜头卡 |
|---|--------|------|----------|------|-----------|
| 1 | 0–220 | 7.3s | live/SceneOpen.tsx | 墨线描画+字标压印开场 → dashboard 全景 → 聚光主角卡（悬浮+光束扫+归位） | brand-ink-open / spotlight-hero-card（高清栅格化技法见审美准则 Q2） |
| 2 | 220–275 | 1.8s | PaperTitleCard.tsx | 字卡①"All your team's research, one place to go." | paper-title-card |
| 3 | 275–465 | 6.3s | live/SceneFlyIn.tsx | 牌堆特写环绕 → 发牌飞入网格 → 滚动 → 搜索打字 → 筛选 → 点击推近 | deck-deal-flyin / type-and-filter |
| 4 | 465–565 | 3.3s | live/SceneDetail.tsx | 详情页宏观特写，行元素逐条嵌入 | row-embed |
| 5 | 565–620 | 1.8s | PaperTitleCard.tsx | 字卡②"Paper Radar…"（含 DigitRoll 数字子标） | paper-title-card |
| 6 | 620–725 | 3.5s | live/ScenePapers.tsx | 论文雷达列表堆叠压入 + 计数器落定 | list-stack-press |
| 7 | 725–775 | 1.7s | PaperTitleCard.tsx | 字卡③"Every project, linked to your weekly report." | paper-title-card |
| 8 | 775–885 | 3.7s | live/SceneWbr.tsx | 周报页"自己写自己"打字机揭示 + 历史周报逐条 pop 入侧栏 | document-typewriter-reveal |
| 9 | 885–940 | 1.8s | PaperTitleCard.tsx | 字卡④"The whole team, on the same page." | paper-title-card |
| 10 | 940–1085 | 4.8s | live/SceneOutroLive.tsx | 虚焦 → 元素合影组装 → 铅印字标砸落（riser→impact→sparkle）→ 1s hold | outro-group-photo-launch |

叠加层（全部在 Main.tsx 里声明式管理）：
- **CAPTIONS**：底部通栏解说字幕 6 条（绝对帧号表），压在功能段上，字卡/outro 段不加
- **FlashCut**：暖白闪转场 4 处，`from = 切点 − 5`，两侧各 5f 跨骑接缝
- **SFX 钉帧表**：30+ 条 `{from, src, volume}`，逐条注释对应画面动作；
  keyboard 长样本按语境用 Sequence duration 截断（24f/44f）

## 二、共用地基组件

| 文件 | 作用 | 关键点 |
|------|------|--------|
| live/PageCam.tsx | 2.5D 页面相机——一切"真实页面"镜头的地基 | 整页截图 + 关键帧 `{frame,cx,cy,zoom,rotX/Y/Z,persp}` 插值运镜；children 按页面 CSS px 定位（与 layout.json 同坐标系）；**3D 模式用 CSS `zoom` 做布局级放大**（transform scale 会先降采样再放大导致文字糊——根治法详见审美准则 Q2）；可选 dof 顶部渐变糊带 |
| PaperTitleCard.tsx | 字卡呼吸位 | 衬线大字逐词入场，accent 词琥珀色；可挂 DigitRoll 数字子标 |
| FlashCut.tsx | 暖白闪转场 | 只盖硬切两侧 10f，不当装饰光效 |
| Caption.tsx | 底部通栏解说 | 等宽小字+字距，入出场各带轻推 |
| DigitRoll.tsx | 里程表数字滚动 | 逐位滚动落定 |
| live-layout.json | 页面元素坐标表 | 每元素 `{x,y,w,h}`（整页 CSS px 坐标系）+ 每页 pageH；场景代码 import 它决定飞行目标位/遮罩位置 |

## 三、素材清单（public/）

- `textures/live/*.png` — 整页 2x 截图（projects-full / detail-full / papers-full /
  wbr-full）、元素切片（card1–10、paper1–5、float-*、nav）、空板
  （projects-empty）、高清特写卡（card4-hires，4x 单独截）
- `audio/*.mp3` — 本片用到的 11 个 SFX（Mixkit，授权见 ../assets/audio/ATTRIBUTION.md）

> 注意：本模板的截图素材来自一个内部研究管理工具（数据为虚构演示数据）。
> 对外分发成片前，务必整套替换为目标产品自己的截图。

## 四、换产品复现指南（保质量的最短路径）

1. **采集素材**（具体采集方法见 ../references/pipeline.md 阶段 4；模板路线只借用
   采集方法，不执行自由创作的阶段 0–3）：
   复制 `../assets/scripts/capture-template.mjs` 进目标产品项目，改 BASE_URL
   与选择器，产出三件套——整页 2x 截图、元素透明底切片、layout.json。
   素材命名对齐本模板（projects-full/detail-full/…），可直接覆盖 public/。
2. **换 layout 坐标**：用新 layout.json 替换 `src/aifl/live-layout.json`。
   场景代码里所有飞行目标位/遮罩位/悬浮件位置都从它读，坐标换了动画跟着走。
3. **逐镜头适配**（顺序照第 1 节表）：
   - 每镜头**先读对应镜头卡全文 + 场景源码**，理解参数含义再改；
   - 必改项：PageCam 的 keys（cx/cy/zoom 按新页面构图重定）、
     元素切片文件名、卡片数量/槽位循环、文案；
   - 不要动的：缓动曲线、时长配比、hold 帧预算、SFX 钉帧结构——
     这些是质感所在，改了等于重做调校。
4. **文案**：PaperTitleCard 的 words 数组、CAPTIONS 表、outro 品牌名/tagline。
5. **验收**：每改完一个镜头 `npx remotion still` 出静帧自检（每镜头至少
   入场中/动作峰值/落定后三帧）；全改完整片渲染 + ffmpeg 抽帧回看；
   最后对照 ../references/aesthetic-rules.md 过 checklist。
6. **时长伸缩**：加/删镜头时整体平移 AIFL_SHOTS 的 from（它是单一事实源），
   CAPTIONS/SFX/FlashCut 的绝对帧号表跟着平移——建议先把新时间线定稿再动
   SFX 表（画面每动一次钉帧表全体重排）。

## 五、质感清单（复现时的硬指标）

- 文字在 3D/放大下必须锐利：2x 整页纹理 + PageCam 布局级 zoom +
  被特写元素 4x 单独截图，三件缺一不可
- 落定后必呼吸：字标 hold ≥30f，批量动效收尾 ≥15f 静止
- 一种动画手法全片只当一次主角
- 飞入元素必须落进页面真实槽位（layout.json 坐标），不悬空
- SFX 用电影系词汇（whoosh/impact/riser/sparkle/transition），
  禁游戏 UI 音色；结尾固定句式 riser→impact→sparkle
- 复现片若加了 BGM，终渲固定交付两版：带 BGM 版 + 无 BGM 版（保留 SFX），
  BGM `<Audio>` 用 `bgm` inputProp 包住，从同一时间线渲出无 BGM 版：
  `--props=props-nobgm.json`（内容 `{"bgm":false}`；Windows 内联 JSON
  会被 shell 剥引号，走文件）
- 确定性渲染：无 Math.random/Date.now，一切伪随机用固定种子
