<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/logo-mark-reverse.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/brand/logo-mark.svg">
  <img alt="video-shotcraft logo" src="./assets/brand/logo-mark.svg" width="112" height="112">
</picture>

<h1>video-shotcraft</h1>

[![GitHub stars](https://img.shields.io/github/stars/Vincentwei1021/video-shotcraft)](https://github.com/Vincentwei1021/video-shotcraft/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Vincentwei1021/video-shotcraft)](https://github.com/Vincentwei1021/video-shotcraft/network/members)
[![Gallery](https://img.shields.io/badge/Gallery-在线样片-d3923c)](https://vincentwei1021.github.io/video-shotcraft/)
[![AtomGit Star](https://atomgit.com/VincentWei/video-shotcraft/star/badge.svg)](https://atomgit.com/VincentWei/video-shotcraft)

<a href="https://trendshift.io/repositories/88911?utm_source=trendshift-badge&utm_medium=badge&utm_campaign=badge-trendshift-88911" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/88911/daily?language=TypeScript" alt="Vincentwei1021%2Fvideo-shotcraft | Trendshift" width="250" height="55"/></a>
<a href="https://trendshift.io/repositories/88911?utm_source=trendshift-badge&utm_medium=badge&utm_campaign=badge-trendshift-88911" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/88911/weekly?language=TypeScript" alt="Vincentwei1021%2Fvideo-shotcraft | Trendshift" width="250" height="55"/></a>

**让 agent 帮你制作电影感产品视频的 skill：152 张镜头配方卡 · 209 个样式 · 209 条动态样片 · 已验收成片模板**

[English](README.md) | [中文](README_CN.md) | [日本語](README_JA.md)

</div>

**video-shotcraft** 是一个把 Claude Code / Codex 变成动效工作室的 AI agent skill：
把你的产品交给它，它会用 [Remotion](https://www.remotion.dev/) 完成分镜、动画
和声音设计，产出一支电影感的宣传片 / 营销视频 / 发布视频 / 功能演示——
真实页面截图、2.5D 运镜、节奏卡点和电影级 SFX 全部包含。

🖼️ [**在线 Gallery：浏览全部 209 条动态样片 »**](https://vincentwei1021.github.io/video-shotcraft/)

## ✨ 最近更新

> [!IMPORTANT]
> ### 🔥 2026-08 · 系列新成员：口播版 **video-talkcraft**
> [**video-talkcraft**](https://github.com/Vincentwei1021/video-talkcraft)
> 是本系列的口播视频版：给它一份口播稿 + 一条成品配音，所有动效节拍都钉在
> 人声上——本地对齐字级时间戳（逐字中位误差 20–40 ms）、**78 张动效配方卡**、
> 七层反 PPT 镜头系统（连续相机曲线、视差层、idle/yield 生命周期、呼吸环境层）、
> 硬切字幕、三道 QA 闸门。同一套配方卡 + Remotion 工作流，按口播内容重新调校。
>
> 🎙️ [**项目主页 »**](https://github.com/Vincentwei1021/video-talkcraft) ·
> 🖼️ [**在线浏览 78 条口播动效样片 »**](https://vincentwei1021.github.io/video-talkcraft/)

- 🌟 **2026-08 · 新增 48 张镜头配方卡**——卡库从 104 张扩充到
  **152 卡 / 209 条样片**。由 209 个候选动效经八轮与参考片逐帧比对评审收敛
  而来，按既有类别并入 Gallery：完整配方卡 + 原生 Remotion 组件
  （`demos/<类别>/<卡名>/<组件>.tsx`，归一化进度 t 驱动、逐帧确定性）+
  动态样片。全部模板化：中性占位文案 + 单一可替换 `ACCENT` 强调色变量。
- 🎞️ **2026-08 · 剪映工程导出**——成片交付后可导出为剪映工程草稿：底片按
  镜头切段（可变速/重排/调色），字幕重建为原生文本轨（文字/字号/颜色可
  编辑），SFX/BGM 独立音轨。Mac 剪映 11.2 实测验收，方法见
  [references/jianying-export.md](references/jianying-export.md)。

## 🎬 效果预览

下面这支 38 秒的 Gallery 介绍片，本身就是用这个 skill 制作的——
从分镜、镜头实现到声音设计，全部由 agent 按库内方法论完成：

https://github.com/user-attachments/assets/cba2df8a-4b2e-4247-bace-d0b1dea9c2bd

▶️ [在 YouTube 观看高清版](https://youtu.be/gcVvRM_P3SM)

> 在线浏览全部镜头卡与动态样片：**[Gallery](https://vincentwei1021.github.io/video-shotcraft/)**
> —— 支持搜索、筛选、切换样式和多选复制镜头卡名称。

## 🚀 快速开始

**最直接的方式：把仓库链接丢给你的 agent。**
在 Claude Code / Codex 等 agent 里说：

```text
帮我安装这个 skill：https://github.com/Vincentwei1021/video-shotcraft
```

agent 会克隆仓库并链接到 skills 目录。也可以用 [skills](https://skills.sh/) CLI
或手动安装：

```bash
npx skills add Vincentwei1021/video-shotcraft
```

```bash
git clone https://github.com/Vincentwei1021/video-shotcraft.git
cd video-shotcraft
ln -s "$(pwd)" ~/.claude/skills/video-shotcraft   # Claude Code
# 或
ln -s "$(pwd)" ~/.codex/skills/video-shotcraft    # Codex
```

装好后直接提需求：

```text
用 video-shotcraft 给我的桌面产品做一支宣传片。
用 deck-deal-flyin 和 row-embed 两张镜头卡展示这个功能。
参考 spotlight-hero-card，为这个页面设计一个产品特写镜头。
```

如果没有指定镜头卡，skill 会先介绍现成成片模板并询问是否采用；
也可以先在 [Gallery](https://vincentwei1021.github.io/video-shotcraft/) 里挑好镜头再开始。

## 📼 成片模板：Ink Press（墨压）

skill 内置 **Ink Press（墨压）** 模板——一支已验收的完整宣传片：
36.2 秒、1920×1080、30fps、10 个镜头的纸墨琥珀风，含 2.5D 真实页面运镜、
字卡、转场和配好的电影感 SFX：

https://github.com/user-attachments/assets/4cf5af51-98f3-4af2-8ab2-7267f470513d

▶️ [在 YouTube 观看高清版](https://youtu.be/iShab28B_ak)

使用方式：直接告诉你的 agent——

```text
用 video-shotcraft 的 Ink Press 模板给我的产品做一支宣传片。
```

agent 会替换成目标产品的截图、文案和品牌信息，复现同等质感——
这是最快、质量最有保障的出片路径。

> 后续会持续更新更多模板。

### Headless / CI 注意事项

在无显示器的 Linux 服务器上渲染（实测环境：2 核、Node 22）会遇到三个坑，
都可以一个参数解决：

1. **并发上限** —— 低核机器上 `remotion still/render` 会报
   "Maximum for --concurrency is 2"。解决：加 `--concurrency=1`。
2. **旧版 Headless 被移除** —— 新版 Chrome/Chromium 已删除旧 headless 模式，
   让 Remotion 指向系统 chromium 会启动失败。解决：改用
   chrome-headless-shell 二进制，而不是完整版 Chrome。
3. **CDN 被墙** —— 如果 remotion.media 无法访问，headless-shell 的自动下载
   会失败。解决：用 `--browser-executable=<本地 chrome-headless-shell 路径>`
   指定本地二进制。

加上这三个参数后，内置模板即可正常渲染。

## 📦 项目包含什么

| 内容 | 说明 |
| --- | --- |
| 152 张镜头配方卡 | 记录用途、能量、建议时长、参数、实现要点与已知坑 |
| 209 条动态样片 | 覆盖 209 个样式，可在在线 Gallery 中直接预览、搜索和筛选 |
| Remotion 参考实现 | 每张卡对应经过调校的 TSX demo，包含实际缓动和时序参数 |
| 完整成片模板 | 36.2 秒、1920×1080、30fps、10 镜头的纸墨琥珀风产品宣传片 |
| 组件与素材 | 2.5D 页面相机、字幕、闪切、数字滚动、音效和素材采集脚本 |
| 制作方法论 | 从素材采集、风格定调和分镜，到声音设计、节奏卡点与最终验收 |
| 剪映工程导出 | 成片可装进剪映继续编辑：镜头变速/字幕/音轨全开放（Mac 11.2 实测） |

当前主要面向 Web 与桌面产品宣传片，但镜头卡也可以单独用于功能演示、
品牌短片、发布视频或其他动态设计项目。

## 🗂 项目结构

```text
video-shotcraft/
├── SKILL.md                 # Agent 使用入口与核心制作规则
├── references/
│   ├── pipeline.md          # 完整制作流水线
│   ├── shots/               # 152 张镜头配方卡
│   ├── sequences/           # 可复用的全片结构与桥段模板
│   ├── aesthetic-rules.md   # 视觉验收准则
│   ├── music-beat-sync.md   # BGM 节奏分析与卡点方法
│   ├── sound-design.md      # 声音设计方法与判例
│   └── jianying-export.md   # 剪映工程导出方法
├── demos/                   # 镜头卡的 Remotion 参考实现（同类别目录）
├── gallery/                 # 在线样片画廊的静态站点
├── template/                # 可直接运行的完整成片模板
├── jianying-export/         # 剪映草稿安装模块（Mac 实测 / Windows 未验证）
└── assets/
    ├── lib/                 # 可复制使用的 Remotion 组件
    ├── scripts/             # 页面素材采集脚本
    └── audio/               # 音频资产
        ├── bgm/             # 5 首 BGM 备选
        └── sfx/<类别>/      # 149 个音效，按场景分 16 类
```

完整工作流和实现要求见 [SKILL.md](SKILL.md)、
[制作流水线](references/pipeline.md) 与
[视觉验收准则](references/aesthetic-rules.md)。

## 🔊 音频与素材说明

`assets/audio/` 中的音效可按各自授权条件使用，来源与许可信息见
[ATTRIBUTION.md](assets/audio/ATTRIBUTION.md)。

音效按场景/材质分 16 类（`transition` `impact` `riser` `camera` `ui` `text`
`paper` `film` `light` `data` `scifi` `mech` `glass` `fluid` `crowd` `counter`），
**找音先定类别再挑音色**；类别索引与逐文件用途见
[sound-design.md](references/sound-design.md)。

模板内的产品截图为演示素材。对外发布成片前，请替换为目标产品自己的截图，
并确认其中的数据、客户信息和个人信息是否需要脱敏。

## 🙏 致谢

本库中许多镜头配方源自对优秀官方产品宣传片动效语言的研究学习——包括
**ClickUp、Perplexity、Slack、Notion、Figma、Framer、Bear、Raycast、
Pitch、Miro、Superhuman、Loom** 等产品的宣传片。镜头卡记录的是从零重新
实现的动效技法（时序、缓动、编排）；仓库中不包含上述影片的任何素材、
画面或品牌资产。所有商标归各自所有者所有，上述公司与本项目无关联、
亦未对本项目背书。2026-08 新增 48 张卡的逐批次来源说明见
[references/shots/ATTRIBUTION.md](references/shots/ATTRIBUTION.md)。

特别感谢：

- **[Remotion](https://www.remotion.dev/)** —— 驱动本库全部 demo 与模板的
  React 视频框架。请注意 Remotion 有自己的
  [许可协议](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
  （个人与小团队免费，公司可能需要付费许可）。
- **[Mixkit](https://mixkit.co/)** —— 库内 SFX 与音乐素材的来源
  （免费商用授权）。
- 游戏手感与动画社区的公开方法论（如 Vlambeer 的 screenshake 演讲、
  经典动画时序原则），多张镜头卡受其启发。
- **Claude Code** —— 本库自身的构建、迭代与验收全程由 AI coding agent
  完成，用的正是这个 skill 所传授的工作流。

## 关注我

<p>
  <a href="https://x.com/VincentWei93"><img alt="在 X 关注 Vincent" src="https://img.shields.io/badge/X-Follow_Me-000000?style=for-the-badge&logo=x&logoColor=white"></a>
  <a href="https://www.douyin.com/user/MS4wLjABAAAAK1pkjBxilk2Oi_9h_vFyD-lTAu9CTlvhmOtkosDvvxg"><img alt="在抖音关注 Vincent" src="https://img.shields.io/badge/Douyin-Follow_Me-000000?style=for-the-badge&logo=tiktok&logoColor=white"></a>
  <a href="https://xhslink.cn/m/At9iP2d5C1V"><img alt="在小红书关注 Vincent" src="https://img.shields.io/badge/Red_Note-Follow_Me-FF2442?style=for-the-badge&logo=xiaohongshu&logoColor=white"></a>
</p>

## ⭐ Star 历史

<a href="https://www.star-history.com/?repos=Vincentwei1021%2Fvideo-shotcraft&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&theme=dark&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
  </picture>
</a>
