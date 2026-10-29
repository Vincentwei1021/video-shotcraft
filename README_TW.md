<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/logo-mark-reverse.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/brand/logo-mark.svg">
  <img alt="video-shotcraft logo" src="./assets/brand/logo-mark.svg" width="96" height="96">
</picture>

# video-shotcraft

[English](README.md) | [简体中文](README_CN.md) | **繁體中文** | [日本語](README_JA.md) | [Русский](README_RU.md)

[![Gallery](https://img.shields.io/badge/Gallery-live%20previews-d3923c)](https://vincentwei1021.github.io/video-shotcraft/)
[![Showcase](https://img.shields.io/badge/Showcase-community%20videos-7c3aed)](https://vincentwei1021.github.io/video-shotcraft/showcase.html)

[![GitHub stars](https://img.shields.io/github/stars/Vincentwei1021/video-shotcraft)](https://github.com/Vincentwei1021/video-shotcraft/stargazers)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-skill-d97757)](SKILL.md)
[![Codex](https://img.shields.io/badge/Codex-skill-10a37f)](SKILL.md)
[![AtomGit Star](https://atomgit.com/VincentWei/video-shotcraft/star/badge.svg)](https://atomgit.com/VincentWei/video-shotcraft)

<a href="https://trendshift.io/repositories/88911?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-88911" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/repositories/88911" alt="Vincentwei1021%2Fvideo-shotcraft | Trendshift" width="250" height="55"/></a>

<img src="./assets/readme/cover.webp" width="100%" alt="六個 Gallery 鏡頭，從左到右、從上到下：graze-face-tour、logo-shrink-wordmark-lockup、panel-grid-moves、product-card-progressive-assemble、space-camera-moves · exploded-view、spotlight-hero-card">

[**▶ 在 Gallery 瀏覽全部 150 個鏡頭**](https://vincentwei1021.github.io/video-shotcraft/) · [**🎬 看 Showcase 成片**](https://vincentwei1021.github.io/video-shotcraft/showcase.html)

</div>

## 它做什麼

對 Claude Code 或 Codex 說一句「給我的產品做一支宣傳片」。agent 會抓取你的真實頁面，從調校好的動效配方庫裡挑鏡頭，
排分鏡，用 [Remotion](https://www.remotion.dev/) 做動畫，按音樂卡點剪輯，配上音效，逐幀檢查，最後交給你一支
可以繼續修改的 MP4。

它不是影片生成模型。每一幀都由程式碼基於你自己的截圖和文案繪製，畫面清晰、品牌準確，也能逐項修改。

**流程**

![8 秒迴圈流程動圖：你的產品 → 抓取真實頁面 → 鏡頭配方卡排分鏡 → Remotion 動畫 → 踩點剪輯與聲音設計 → 渲染與逐幀驗收 → MP4、動效工作臺與剪映工程](assets/readme/workflow.gif)

## 最近更新

> [!IMPORTANT]
> ### 🎬 2026-10 · 鏡頭庫更新
> 全庫 216 個鏡頭經打磨與評審，擇優保留 **124 張卡 / 150 個鏡頭**。
> Gallery 樣片已重新渲染，並統一採用 video-shotcraft 品牌素材。

- **2026-09 · [動效工作臺](#動效工作臺)**：成片交付後，在剪映式的瀏覽器編輯器裡繼續改。
- **2026-08 · 系列新成員 [video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft)**：口播影片版，
  給它口播稿和成品配音，所有動效節拍都釘在人聲上（[78 條口播動效樣片](https://vincentwei1021.github.io/video-talkcraft/)）。
- **2026-08 · 剪映工程匯出**：成片可匯出為可編輯的剪映草稿——底片按鏡頭切段、字幕重建為原生文字軌、
  SFX/BGM 獨立音軌。Mac 剪映 11.2 實測驗收（[方法](references/jianying-export.md)）。

## ❤️ Sponsors

<table>
<tr>
<td align="center" valign="middle" width="25%">
  <a href="https://go.apimart.ai/tw-video-shotcraft"><img src="./assets/readme/sponsors/apimart.png" width="200" alt="APIMart 標誌"></a><br>
  <a href="https://go.apimart.ai/tw-video-shotcraft"><b>APIMart</b></a>
</td>
<td>
  <p>感謝 APIMart 贊助了本專案！APIMart 是專注 AI 圖片/影片生成的低價 API 平臺，GPT-Image-2 低至 $0.006/張，1 美元可出圖 160+ 張。圖片、影片一套非同步 API 通吃，提交任務拿 ID、回撥取結果，跑批萬張不超時、換模型不改程式碼。按量付費、無月費，通過此<a href="https://go.apimart.ai/tw-video-shotcraft">註冊連結</a>註冊即可開用。</p>
</td>
</tr>
<tr>
<td align="center" valign="middle" width="25%">
  <a href="https://www.packyapi.ai/register?aff=l9IZ"><img src="./assets/readme/sponsors/packycode.png" width="200" alt="PackyCode 標誌"></a><br>
  <a href="https://www.packyapi.ai/register?aff=l9IZ"><b>PackyCode</b></a>
</td>
<td>
  <p>PackyCode 是一家穩定、高效的 API 中轉服務商，通過統一域名、統一金鑰接入主流大模型，支援智慧容災切換，並提供專屬 Codex / Claude Code 高速通道。</p>
  <p>新使用者可獲 $1 免費體驗額度，首充享折扣，多分組折扣低至 2 折起。支援人民幣 1:1 充值，無匯率加價及額外充值手續費。</p>
  <p><a href="https://www.packyapi.ai/register?aff=l9IZ">註冊並開始使用 PackyCode →</a></p>
</td>
</tr>
<tr>
<td align="center" valign="middle" width="25%">
  <a href="https://aws.amazon.com/"><img src="./assets/readme/sponsors/aws.svg" width="200" alt="AWS 標誌"></a><br>
  <a href="https://aws.amazon.com/"><b>AWS</b></a>
</td>
<td>
  <p>Amazon Web Services（AWS）提供穩定、可擴充套件的雲端計算服務，涵蓋計算、儲存和 AI。</p>
  <p><a href="https://aws.amazon.com/">瞭解 AWS →</a></p>
</td>
</tr>
</table>

## 安裝

為 Claude Code 和 Codex 調校。最簡單的方式是把倉庫連結丟給你的 agent：

```text
帮我安装这个 skill：https://github.com/Vincentwei1021/video-shotcraft
```

或者用 [skills](https://skills.sh/) CLI：

```bash
npx skills add Vincentwei1021/video-shotcraft
```

或者手動安裝：

```bash
git clone https://github.com/Vincentwei1021/video-shotcraft.git
cd video-shotcraft
ln -s "$(pwd)" ~/.claude/skills/video-shotcraft   # Claude Code
ln -s "$(pwd)" ~/.codex/skills/video-shotcraft    # Codex
```

國內訪問 GitHub 慢的話，可以從 AtomGit 映象克隆：
`git clone https://atomgit.com/VincentWei/video-shotcraft.git`。

## 使用

直接描述你想要的片子就行，不需要命令。

| 你說 | 會發生什麼 |
|---|---|
| `用 video-shotcraft 给我的产品做一支宣传片。` | agent 先介紹 Ink Press 模板並問你是否採用，然後抓取頁面、做片 |
| `用 Ink Press 模板给这个仓库做一支发布片。` | 最快的路徑：把你的截圖、文案和標誌放進已驗收的模板 |
| `用 deck-deal-flyin 和 row-embed 两张镜头卡展示这个功能。` | 你按名字點鏡頭（名字可以直接從 Gallery 複製） |
| `参考 spotlight-hero-card，为这个页面设计一个产品特写镜头。` | 單個鏡頭，按你的產品改編 |

## 鏡頭庫

124 張配方卡，分 10 類，共 150 個鏡頭。可以在 [Gallery](https://vincentwei1021.github.io/video-shotcraft/)
裡搜尋、篩選、複製卡名。

<table>
<tr>
<td align="center" width="50%"><b>開場與品牌</b> · 11 個<br><img src="./assets/readme/examples/opening.webp" width="100%" alt="text-as-mask：透過巨型標題字看到產品介面"><br><sub>text-as-mask：產品從標題字裡透出來</sub></td>
<td align="center" width="50%"><b>運鏡與空間</b> · 13 個<br><img src="./assets/readme/examples/camera.webp" width="100%" alt="exploded-view：頁面 3D 傾斜後構件炸開"><br><sub>exploded-view：頁面傾斜、構件拆開</sub></td>
</tr>
<tr>
<td align="center" width="50%"><b>轉場</b> · 19 個<br><img src="./assets/readme/examples/transition.webp" width="100%" alt="card-flock-tumble：一群卡片翻滾成大標題"><br><sub>card-flock-tumble：卡片群翻滾成標題</sub></td>
<td align="center" width="50%"><b>文字與字卡</b> · 25 個<br><img src="./assets/readme/examples/typography.webp" width="100%" alt="flying-words：功能詞穿過文字隧道"><br><sub>flying-words：文字隧道收成品牌短句</sub></td>
</tr>
<tr>
<td align="center" width="50%"><b>介面登場</b> · 22 個<br><img src="./assets/readme/examples/ui-entrance.webp" width="100%" alt="card-stack：一疊配方卡扇形發牌"><br><sub>card-stack：一疊卡片扇形發牌落位</sub></td>
<td align="center" width="50%"><b>互動演示</b> · 13 個<br><img src="./assets/readme/examples/interaction.webp" width="100%" alt="palette-theme-ripple：換主題時顏色波紋掃過介面"><br><sub>palette-theme-ripple：新主題像波紋掃過介面</sub></td>
</tr>
<tr>
<td align="center" width="50%"><b>資料與指標</b> · 9 個<br><img src="./assets/readme/examples/data.webp" width="100%" alt="axis-rescale-shock：資料衝高，座標軸重新縮放"><br><sub>axis-rescale-shock：資料衝破座標軸</sub></td>
<td align="center" width="50%"><b>光效與強調</b> · 23 個<br><img src="./assets/readme/examples/effects.webp" width="100%" alt="spotlight-sweep：聚光燈掃出標題"><br><sub>spotlight-sweep：舞臺追光找到標題</sub></td>
</tr>
<tr>
<td align="center" width="50%"><b>節奏與蒙太奇</b> · 8 個<br><img src="./assets/readme/examples/rhythm.webp" width="100%" alt="paparazzi-flash：三次閃光切換不同裁切"><br><sub>paparazzi-flash：三次閃光、三種裁切、落在一個數字上</sub></td>
<td align="center" width="50%"><b>收尾</b> · 7 個<br><img src="./assets/readme/examples/outro.webp" width="100%" alt="input-morph-assemble：輸入框變成 logo"><br><sub>input-morph-assemble：聊天輸入框拼成標誌</sub></td>
</tr>
</table>

每張卡在 `references/shots/<类别>/<卡名>.md`，對應的 Remotion 實現在 `demos/<类别>/<卡名>/`
（怎麼接進你的工程見 [demos/README.md](demos/README.md)）。

## 動效工作臺

交付後 skill 會在瀏覽器裡開啟一個剪映式的編輯器（`node workbench/scripts/open.mjs <工程>`）。成片按原始鏡頭
拆成鏡頭 / 轉場 / 字幕 / 音效多軌；選中任意鏡頭可以改文案、字號和顏色，鏡頭可挪、可裁、可變速，鏡頭庫裡的
150 個鏡頭都能直接拖上軌，改完用 Remotion 匯出。預覽與渲染逐幀一致。

![動效工作臺](workbench/docs/overview.png)

[工作臺圖文指南：各區域與功能](workbench/GUIDE.md) · [成片接入契約](references/workbench.md)

## 你會拿到什麼

| 產出 | 說明 |
|---|---|
| 成片 | `MP4`，1920×1080、30fps、h264，含音樂和音效 |
| Remotion 工程 | 整支片的原始碼：每個鏡頭都是一個 React 元件，你或 agent 都能改 |
| 動效工作臺 | 交付後自動開啟：多軌時間線、屬性面板、變速、換鏡頭、匯出（[詳情](#動效工作臺)） |
| 剪映工程 | 可選：可編輯的剪映草稿，鏡頭分段、字幕和音軌都能改 |
| 社交平臺釋出 | 可選，使用者要求時：通過 Upload-Post 把成片發到 TikTok / Instagram / YouTube / LinkedIn / X 等；先確認文案與平臺、dry-run 後再發（[說明](references/publish-upload-post.md)） |

另外還附帶：可複用的 Remotion 元件（2.5D 頁面相機、字幕、閃切、數字滾動）、149 個音效和 5 首 BGM、
頁面素材採集指令碼，以及整套製作方法（素材採集、風格定調、分鏡、聲音設計、節奏卡點、最終驗收），
見 [references/](references/pipeline.md)。

## 作品展示

**投稿你的作品**：用 video-shotcraft 做了片子？用 Showcase 投稿表單
[提交](https://github.com/Vincentwei1021/video-shotcraft/issues/new?template=showcase.yml)，稽核通過後會出現在
[Showcase 頁面](https://vincentwei1021.github.io/video-shotcraft/showcase.html)。

## 環境要求

| 需要 | 用途 |
|---|---|
| Node.js 和 npm | Remotion 渲染、成片模板和動效工作臺 |
| ffmpeg / ffprobe | 抽幀檢查與最終驗收 |
| [uv](https://docs.astral.sh/uv/) | 只在分析 BGM 節拍時用（跑一次性的 Python 指令碼） |
| puppeteer | 只在抓取頁面時用，採集指令碼會按需安裝 |

Remotion 首次渲染時會自動下載自己的無頭 Chrome。已在 macOS 上測試，Linux 參考下面的說明。

<details>
<summary><b>Linux 伺服器 / CI 注意事項</b></summary>

在無顯示器的 Linux 伺服器上渲染（實測環境：2 核、Node 22）會遇到三個坑，各加一個引數就能解決：

1. **併發上限**：低核機器上 `remotion still/render` 會報 "Maximum for --concurrency is 2"。加 `--concurrency=1`。
2. **舊版 headless 被移除**：新版 Chrome/Chromium 刪了舊 headless 模式，讓 Remotion 指向系統 chromium 會啟動失敗。
   改用 chrome-headless-shell 二進位制，不要用完整版 Chrome。
3. **CDN 訪問不了**：remotion.media 訪問不了時（國內常見），headless-shell 自動下載會失敗。
   用 `--browser-executable=<本地 chrome-headless-shell 路径>` 指定本地二進位制。

加上這三個引數後，內建模板即可正常渲染。

</details>

<details>
<summary><b>專案結構</b></summary>

```text
video-shotcraft/
├── SKILL.md                 # Agent 使用入口与核心制作规则
├── references/
│   ├── pipeline.md          # 完整制作流水线
│   ├── shots/               # 124 张镜头配方卡，按功能分 10 类
│   ├── sequences/           # 可复用的全片结构与桥段模板
│   ├── aesthetic-rules.md   # 视觉验收准则
│   ├── music-beat-sync.md   # BGM 节奏分析与卡点方法
│   ├── sound-design.md      # 声音设计方法与判例
│   ├── jianying-export.md   # 剪映工程导出方法
│   ├── publish-upload-post.md # 社交平台发布（可选，Upload-Post API）
│   └── workbench.md         # 动效工作台：成片接入契约 + 可编辑性规则
├── demos/                   # 镜头卡的 Remotion 参考实现（同类别目录）
├── gallery/                 # 在线样片画廊的静态站点
├── template/                # 可直接运行的完整成片模板
├── jianying-export/         # 剪映草稿安装模块（Mac 实测 / Windows 未验证）
├── publish/                 # 社交平台发布脚本（纯标准库 Python）+ 离线单测
├── workbench/               # 交付后的动效工作台（Vite + Remotion Player）
└── assets/
    ├── lib/                 # 可复制使用的 Remotion 组件
    ├── scripts/             # 页面素材采集脚本
    └── audio/               # 音频资产
        ├── bgm/             # 5 首 BGM 备选
        └── sfx/<类别>/      # 149 个音效，按场景分 16 类
```

完整工作流和實現要求見 [SKILL.md](SKILL.md)、[製作流水線](references/pipeline.md) 與
[視覺驗收準則](references/aesthetic-rules.md)。

</details>

## 音訊與素材

音效按場景 / 材質分 16 類（`transition` `impact` `riser` `camera` `ui` `text` `paper` `film` `light` `data`
`scifi` `mech` `glass` `fluid` `crowd` `counter`），找音先定類別再挑音色。類別索引與逐檔案用途見
[sound-design.md](references/sound-design.md)，來源與許可見 [ATTRIBUTION.md](assets/audio/ATTRIBUTION.md)。

模板內的產品截圖為演示素材。對外發布成片前，請替換為你自己產品的截圖，並確認其中的資料、客戶資訊和個人資訊
是否需要脫敏。

## 許可

- 程式碼與文件：[Apache-2.0](LICENSE)。
- `assets/audio/` 下的音訊：各自按其授權使用，見 [ATTRIBUTION.md](assets/audio/ATTRIBUTION.md)。
- [Remotion](https://www.remotion.dev/) 有自己的[許可協議](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)：
  個人與小團隊免費，公司可能需要付費許可。

## 致謝

本庫中許多鏡頭配方源自對優秀官方產品宣傳片動效語言的研究學習，包括 **ClickUp、Perplexity、Slack、Notion、
Figma、Framer、Bear、Raycast、Pitch、Miro、Superhuman、Loom** 等產品的宣傳片。鏡頭卡記錄的是從零重新實現的
動效技法（時序、緩動、編排），倉庫中不包含上述影片的任何素材、畫面或品牌資產。所有商標歸各自所有者所有，
上述公司與本專案無關聯，亦未對本專案背書。

也感謝 **[Remotion](https://www.remotion.dev/)**——驅動本庫全部 demo 與模板的 React 影片框架；
**[Mixkit](https://mixkit.co/)**——庫內音效與音樂素材的來源（免費授權）；遊戲手感與動畫社群的公開方法論，
多張鏡頭卡受其啟發；以及 **Claude Code**——本庫自身的構建、迭代與驗收都由它完成，用的正是這個 skill 教的工作流。

## 關注我

<p>
  <a href="https://x.com/VincentWei93"><img alt="在 X 關注 Vincent" src="https://img.shields.io/badge/X-Follow_Me-000000?style=for-the-badge&logo=x&logoColor=white"></a>
  <a href="https://www.douyin.com/user/MS4wLjABAAAAK1pkjBxilk2Oi_9h_vFyD-lTAu9CTlvhmOtkosDvvxg"><img alt="在抖音關注 Vincent" src="https://img.shields.io/badge/Douyin-Follow_Me-000000?style=for-the-badge&logo=tiktok&logoColor=white"></a>
  <a href="https://xhslink.cn/m/At9iP2d5C1V"><img alt="在小紅書關注 Vincent" src="https://img.shields.io/badge/Red_Note-Follow_Me-FF2442?style=for-the-badge&logo=xiaohongshu&logoColor=white"></a>
</p>

## Star 歷史

<a href="https://www.star-history.com/?repos=Vincentwei1021%2Fvideo-shotcraft&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&theme=dark&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
  </picture>
</a>
