# redskill-lite：video-shotcraft 小红书 skill 精简版（只讲方法）

`redskill/` 是 video-shotcraft 面向 skill 平台（小红书 RedSkill 等）的**精简版方法包**：
只保留方法论与 124 张镜头配方卡，**不含任何渲染代码、模板工程、脚本与音像素材**，
平台侧只收 .md/.txt 的纯文档 skill。

## 目录结构

```
redskill/
├── SKILL.md          # 包入口：以仓库根 SKILL.md 为底重写（方法版，外链化引用）
├── references/       # 全量复制仓库 references/ 的 136 个 .md，最小改写（见下）
├── README.md         # 本文件（仓库侧说明，不进 zip）
├── build.py          # 校验 + 打包脚本（仓库侧，不进 zip）
└── dist/             # 打包产物（入库，可直接上传）
    └── redskill-lite.zip
```

## 与完整工程的关系

- 完整工程（出片所需）：<https://github.com/Vincentwei1021/video-shotcraft>
  （GitCode 镜像：<https://gitcode.com/VincentWei/video-shotcraft>）
- 在线画廊（可直接浏览）：<https://vincentwei1021.github.io/video-shotcraft/library.html>
- 安装完整工程：`git clone` 后 `cd template && npm install && npx remotion render src/index.ts AiflPromo out/promo.mp4`

## 裁剪说明（改写规则）

1. **诚实边界**：SKILL.md 开头明确写本版"只讲方法"——不含 Remotion/TSX 渲染代码、
   demo 源码、Ink Press 模板工程、组件库、采集/音效/发布脚本与音像素材，**无法直接
   出片**；出片需取完整工程执行。
2. **references/ 全量复制**自仓库 `references/`（136 个 .md，含 124 张镜头卡、
   方法论文档、sequences 桥段模板与 shots/ATTRIBUTION.md），保持原层级，
   统一 LF + UTF-8 无 BOM。
3. **最小改写，不动技术内容**：
   - 镜头卡：技术内容（参数表、已知坑、时值配比等）原样保留；仅把指向
     `demos/`、`template/` 等包外路径的"参考实现"改为带 GitHub 外链的说明性引用
     （`[完整工程 demos/...](https://github.com/.../blob/main/...)`）。
   - 方法论文档（pipeline / sfx-sourcing / workbench 等 11 个）：在标题后加
     "精简版说明"声明块；正文中所有指向包外目录/文件的路径同样外链化；代码块内
     依赖包外资源的命令行尾加注 `# 在完整工程执行（本包不含）`。
   - SKILL.md：保留触发条件、输入、三种创作模式、方法论步骤、核心理念、工作流、
     失败处理、许可署名；所有"运行 / 复制 demos、template、assets/scripts 里的
     代码"改为说明性外链引用，引用路径与包内实际内容一致。
4. **不进包**：代码、脚本、图片、音频、.gitignore、无扩展名 LICENSE 一律不进 zip。
   README.md / build.py / dist/ 也不进 zip。

## 上传步骤

1. `python redskill/build.py`（Windows 下 `python`；脚本先全量校验，任一不满足即
   报错退出、不产出 zip）。
2. 取 `redskill/dist/redskill-lite.zip`，在 skill 平台上传页手动上传。
3. 平台规则：zip 解压后**根目录直接是 SKILL.md**（无外层文件夹）；仅 .md/.txt；
   LF + UTF-8 无 BOM。build.py 已按此校验。

## 常见拒收原因（build.py 均已针对性校验）

| 拒收原因 | 校验项 |
|---|---|
| zip 根目录套了外层文件夹 | 根目录结构校验：SKILL.md 必须在 zip 根 |
| 混入代码/脚本/图片/音频 | 白名单：仅 .md/.txt |
| BOM / CRLF 编码行尾问题 | 逐文件检测 UTF-8 无 BOM、LF |
| 包体积超限 | zip ≤ 5MB |
| 正文让人执行包里不存在的脚本 | 执行式残留扫描：包内 md 不得出现指向包外路径的可执行命令 |
| 引用包内不存在的文件 | 引用一致性：包内相对 `references/...` 引用必须真实存在 |

## 合规提醒

- 渲染引擎 Remotion 有[独立许可](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)，
  个人与小团队免费、公司可能需要付费——包内 SKILL.md 已如实注明。
- Freesound 音效按下载时详情页许可使用（默认 CC0，署名素材按 CC BY 标注）；
  BGM 授权见完整工程 `assets/audio/ATTRIBUTION.md`。
- 复刻产品页面时敏感数据必须脱敏/虚构并在采集前冻结（方法论文档有完整规则）。
- 成片归用户所有，免费商用、不强制署名；@ 作者纯自愿。

## 重建

改了 `redskill/SKILL.md` 或 `redskill/references/` 后，重跑
`python redskill/build.py` 重新校验并产出 zip。不要手改 dist 里的 zip。
