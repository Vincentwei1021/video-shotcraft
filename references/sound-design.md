# sound-design — 声音设计

来源：模板片（`template/`）声音设计实战。准则编号 S1–S4 见 `references/aesthetic-rules.md`。

模板片的声音全部集中在一个文件里管理（`template/src/aifl/Main.tsx`：`SFX[]` 钉帧表），场景组件不含任何音频代码——声音是时间线级资产，不是镜头级资产。

## 目录

- 方法
- BGM 选型
- SFX 词汇表
- 对齐技巧

---

## 1. 方法

**顺序：画面结构基本锁定 → 先铺 BGM 定能量骨架 → 逐拍钉 SFX。**

1. **BGM 先行，定能量骨架。** 一条 BGM 全片铺底，音量包络用 `interpolate` 做首尾淡入淡出（模板片 `[0, 30, TOTAL-50, TOTAL] → [0, 0.34, 0.34, 0]`，即 1s 淡入、1.7s 淡出）。BGM 音量压在 0.34 左右给 SFX 留 headroom。曲子的能量曲线要和分镜表的能量曲线对得上（低开 → 中段推进 → outro 峰值），候选曲必须垫进成片试听——单听曲子无法判断气质（S1）。BGM 的 `<Audio>` 用布尔 inputProp（如 `bgm`，默认 `true`）包住挂载，SFX 不受该开关影响——配了 BGM 的片子终渲交付固定出两版成片，无 BGM 版从同一时间线渲出：`npx remotion render … --props=props-nobgm.json`（文件内容 `{"bgm":false}`；Windows shell 会剥掉内联 JSON 的双引号，走文件最稳，macOS/Linux 也可内联 `--props='{"bgm":false}'`）。
2. **词汇表按"片种"选，不按"事件"选（S1）。** 产品宣传片的 SFX 词汇 = whoosh(运镜) / impact(落地) / riser(铺垫) / sparkle(光效，目录 `light/`) / transition(转场)，禁用游戏音包**音色**（合成器 pluck/bloop、卡通弹跳）。模板片第一版按 UI 事件语义选音（click/drop/confirmation），用户一耳朵判死刑"太像游戏了"。
   **禁的是音色不是动作**：画面真有点击/开关/碎裂就该配它的拟音（模板片自己用 `click-camera.mp3` 并给了全片最高响度 0.6）；但 `sfx/ui/` 需逐个试听——里面既有真实开关拟音也有合成反馈音，后者正属本条排除的质感（取舍表见 3.3）；`sfx/glass/` 是真实碎裂材质音。判别问句见 aesthetic-rules S1。
3. **SFX 逐拍钉帧、声明式表集中管理（S2）。** SFX 是 `{ from, src, volume }[]` 数组，逐条注释对应的画面动作（"hero card: whoosh up on the pop"），渲染时每条包一个 `<Sequence from={s.from}>`。杜绝凭感觉铺音效。
4. **通用音之外留"贴画面定制"槽位。** 词汇表定稿后，有辨识度的画面动作仍会要专属拟音（打字揭示配键盘声、逐周落入配 pop）——泛用 swoosh 盖不住这些动作（S4）。

时机教训：模板片的音频工作直到画面改了约 30 轮之后才开始（收尾最后几轮）；有一次把换 BGM 和画面重做混在同一轮改动里，画面随后继续改，SFX 全表报废重钉。**声音永远排在画面锁定之后**（S3），细节见第 4 节。

---

## 2. BGM 选型

### 演进：三易其稿（34 分钟）

| 稿 | 曲目 | 来源/授权 | 被换原因 |
|---|---|---|---|
| v1 | Kevin MacLeod – *Inspired*（暖色 ambient 钢琴底）；同批还下了备选 *Deliberate Thought*，从未引用 | incompetech，CC-BY | 用户："BGM换个更有节奏感，更激情欢快的"——钢琴 ambient 不够激情 |
| v2 | Kevin MacLeod – *Life of Riley*（欢快 folk-pop） | incompetech，CC-BY | 用户："这个配乐和音效都太像游戏了。你帮我找那种鼓点强的，节奏感强的"——欢快≠宣传片气质 |
| v3（定稿） | Mixkit tech-house 鼓底（`bgm-tech-house.mp3`），音量升至 0.34 | Mixkit license | 未再被换，沿用至成片 |

v1→v2 只隔 22 分钟就又被否——说明选曲时根本没在成片语境里听。**候选曲必须垫进成片试听后再定**（S1 自检项）。

### 选型判据（从用户原话反推）

- **鼓点强、节奏感强**，优先电子底（tech-house 类）；"好听/欢快"不是判据。
- 气质基准是"典型的产品宣传视频"——闭眼只听音轨，应像产品发布会预告，不像手机游戏（S1）。
- 能量曲线能托住全片结构：平稳鼓底适合叠 SFX 层次，旋律太抢的曲子会和拟音打架。

### 免费授权来源清单

| 来源 | 授权 | 适用 | 备注 |
|---|---|---|---|
| [Mixkit](https://mixkit.co/) | Mixkit License（免费商用、免署名） | BGM + 电影系 SFX（whoosh/impact/riser/sparkle）+ 各类拟音 | 模板片定稿的 BGM 和 SFX 主力来源；批量下载后 metadata 常被抹掉，**下载时就记录曲名/URL**，否则事后无法反查（模板片 `bgm-tech-house.mp3` 已无法逐曲对回 Mixkit 曲库，商用前需复核） |
| [incompetech](https://incompetech.com/)（Kevin MacLeod） | CC-BY 4.0（需署名） | BGM，曲库大、按情绪筛选 | 模板片 v1/v2 出处；注意 CC-BY 的署名义务 |
| [Kenney](https://kenney.nl/assets)（音包） | CC0 | 游戏类项目 | **产品宣传片禁用**（S1）——模板片引入后被整批删除，仅列此供授权档案参考 |

---

## 3. SFX 词汇表

### 3.0 目录结构与找音路径

```
assets/audio/
  bgm/                5 首  BGM 备选（tech-house 鼓底 + house/hip-hop）
  sfx/<类别>/       149 个  按场景/材质分 16 类
```

**找音先定类别，再挑音色**——按要配的画面动作查下表，进对应目录试听。

S1 词汇表的五个词到目录的对应关系（**`sparkle` 的目录名是 `light/`，库里没有 `sparkle/` 目录**）：

| 词汇表 | whoosh | impact | riser | sparkle | transition |
|---|---|---|---|---|---|
| 目录 | `transition/` | `impact/` | `riser/` | **`light/`** | `transition/` |

whoosh 与 transition 同在 `transition/`（运镜与转场的音色本就重叠）；其余 11 个类别是词汇表之外的**拟音层**（S4 的"贴画面定制"槽位）。

| 类别 | 数量 | 装什么 | 什么时候进这个目录 |
|---|---|---|---|
| `transition/` | 23 | whoosh / sweep / swoosh / 风 | 运镜、场景切换、元素飞入飞走 |
| `impact/` | 14 | impact / thud / stomp / bass hit | 落地钉点、重拍、slam |
| `riser/` | 1 | 上升铺垫 | 进 finale / 大镜头前的能量铺垫 |
| `camera/` | 10 | 快门、镜头、变焦 | 拍照感、crash zoom、对焦、iris |
| `ui/` | 18 | 点击、开关、通知、pop | UI 反馈、主题切换、列表落入 |
| `text/` | 13 | 打字机、键盘、书写 | 打字揭示、描线、下划线 |
| `paper/` | 10 | 纸、翻页、印刷 | 翻页转场、撕裂、纸艺、riso |
| `film/` | 8 | 放映机、胶片、磁带、黑胶 | 预告片语法、胶片串、回带变速 |
| `light/` | 10 | sparkle、光效 | 扫光、点亮、余韵闪光 |
| `data/` | 13 | glitch、电流、数据 | HUD、流式输出、骨架屏、故障 |
| `scifi/` | 5 | 科技、太空、底噪 | 太空运镜、系统底噪（长样本铺底） |
| `mech/` | 8 | 机械、工业、锁 | 部件组装、锁定、形变 |
| `glass/` | 4 | 玻璃、碎裂 | 碎裂转场、硬切冲击 |
| `fluid/` | 5 | 墨水、水、流体、颗粒 | 墨开场、颗粒填充、气泡 |
| `crowd/` | 3 | 人群、掌声、呼吸、心跳 | 合影收尾、发布会感、张力 |
| `counter/` | 4 | 计数器、仪表、钟、倒计时 | 数字滚动、读数、时间轴 |

逐文件的时长 / 峰值 / 建议钉点见 `assets/audio/AUDITION-2026-07-27.md`；授权与 URL 见 `assets/audio/ATTRIBUTION.md`。

注意：类别是**找音的索引，不是配音的判据**。选音仍按第 2 节的片种词汇纪律走——`glass/` `crowd/` `fluid/` 这类材质音是"贴画面定制"槽位（S4），泛用转场仍优先 `transition/` `impact/`。

### 3.1 基础层：模板片实际使用的 14 个

下表是模板片定稿用的一批，**"典型钉帧位置"是本仓库唯一有实战帧号的声音数据**，复用时取其相对语义而非绝对数值（30fps、全片 1085f）。时长来自 ffprobe。路径列给出重构后的位置。

| 文件 | 所在目录 | 时长 | 用途场景 | 典型钉帧位置（模板片） | 来源与授权 |
|---|---|---|---|---|---|
| `bgm-tech-house.mp3` | `bgm/` | 288.7s | 整片鼓底 BGM，tech-house 电子 | 全片铺底，音量包络 0→0.34→0.34→0 | Mixkit（无法逐曲反查，商用前复核） |
| `transition-soft.mp3` | `sfx/transition/` | 1.27s | 柔转场：品牌落定、场景切入 | f12 / f277 / f475 / f623 / f779（每次进新场景一发） | Mixkit |
| `whoosh-fast.mp3` | `sfx/transition/` | 1.76s | 快速运镜、批量元素飞走 | f78 brand→dashboard、f340/356 发牌加速、f435 筛选网格飞走 | Mixkit |
| `whoosh-big.mp3` | `sfx/transition/` | 2.32s | 大幅度运镜：弹起、拉远、回摆 | f127 hero 卡弹起、f308 orbit 拉远、f388 swoosh 回搜索栏 | Mixkit |
| `sparkle.mp3` | `sfx/light/` | 4.55s | 光效 reveal：扫描光束、收尾闪光 | f141 hero 卡光束、f1005 结尾 rule 闪光 | Mixkit |
| `transition-snap.mp3` | `sfx/transition/` | 0.57s | 短促落定/贴回原位的 snap | f204 hero 卡 impact reseat | Mixkit |
| `swoosh-quick.mp3` | `sfx/transition/` | 0.78s | 字卡出场统一音、轻推镜 | f220/565/725/885 四张 title card、f455 点击后 push-in | Mixkit |
| `keyboard.mp3` | `sfx/text/` | 19.6s | 真实键盘打字拟音（长样本，按段落裁剪用） | f401 搜索框输入（截 24f）、f781 周报页"自己写出来"（截 44f） | Mixkit |
| `click-camera.mp3` | `sfx/camera/` | 0.35s | 点击确认/快门感（全片最响 vol 0.6） | f451 点击卡片进详情、f648 papers 计数落定 | Mixkit |
| `riser-cine.mp3` | `sfx/riser/` | 4.81s | 电影系上升铺垫，进 finale | f945 outro 合影组装段起 | Mixkit |
| `impact-cine.mp3` | **已从库中删除** | 4.06s | 电影系重音钉点（vol 0.55 全片 SFX 峰值） | f980 字标 stamp 落地 | Mixkit |
| `pop.mp3` | `sfx/ui/` | 0.48s | 列表条目逐个落入的短促 pop | f840–865 周报周列表 6 连发，每 5f 一发、音量 0.40→0.25 阶梯递减 | **来源待考** |
| `impact-transition.mp3` | `sfx/impact/` | 4.87s | **死资产：全片未被引用**，与定稿 SFX 同批下载的备用 impact | 无 | Mixkit（同批），未接线 |
| `typewriter.mp3` | **已从库中删除** | 0.22s | **死资产：全片未被引用**。文档页揭示实际用的是 `keyboard.mp3` 截 44f，此文件下了没接线 | 无 | **来源待考** |

小结：12/14 在片中实际发声；2 个死资产（`impact-transition.mp3` 保留在库中、`typewriter.mp3` 已删）；来源待考的 `pop.mp3` 仍在库中。

**两个已删文件的处理（2026-07-27 筛选）**：

- `impact-cine.mp3` 已从 `assets/audio/` 删除，但**模板片照常渲染**——Remotion 读的是 `template/public/audio/` 的独立副本（`staticFile('audio/...')`），那份仍在，`Main.tsx:86` 无需改动。新项目要复刻 outro 三拍句式时，用 `sfx/impact/impact-deep-whoosh.mp3` 代替：它与原 `impact-cine.mp3` **字节完全相同**（md5 `ce27fd2f`，见 3.2），是同一个 Mixkit 素材 Cinematic whoosh deep impact。
- `typewriter.mp3` 已删（本就是死资产，打字揭示实际用 `keyboard.mp3` 截帧）。要单击拟音改用 `sfx/text/typewriter-hit-single.mp3` 或 `typewriter-hit-hard.mp3`。

### 3.2 同素材重名：4 对文件字节完全相同

2026-07-27 全库 md5 比对发现，基础层与第一批扩充里有 4 对是**同一个 Mixkit 素材下了两次、存成两个名字**：

| 一对 | 实际是同一个素材 | 现状 |
|---|---|---|
| `transition/transition-soft` = `transition/air-zoom-vacuum` | Air zoom vacuum | 两侧都在 |
| `transition/swoosh-quick` = `transition/sweep-fast-small` | Fast small sweep transition | 两侧都在 |
| `impact/impact-transition` = `impact/impact-epic-trailer` | Movie trailer epic impact | 两侧都在 |
| `impact/impact-cine` = `impact/impact-deep-whoosh` | Cinematic whoosh deep impact | `impact-cine` 已删，留 `impact-deep-whoosh` |

**这几对不能用来做 4.2 的"双样本交替"**——字节相同，交替等于没换音，机枪感照旧。
真要双样本，从同类别里挑音色近但不同的文件（如 `text/typewriter-hit-hard` + `text/typewriter-hit-soft`）。

教训：库里出现同素材重名，是"批量下载后凭文件名判断有没有重复"的必然结果。**新增音效入库时先跑一遍 md5 去重**，别信名字：
```bash
find assets/audio -name '*.mp3' -exec md5 -r {} \; | sort | awk '{print $1}' | uniq -d
```

比对的副产品是补回了 7 个基础层文件的原始 URL（见 `ATTRIBUTION.md`），这批原本因批量下载丢 metadata 而无法反查。

### 3.3 `ui/` 目录必须逐个试听，不能整目录放行

`ui/` 是全库唯一**内部质感分裂**的类别：既有真实物件拟音，也有合成 UI 反馈音——而后者正是 S1 要排除的东西。看 Mixkit 原名最省事（`tone` / `bleep` / `alert` / `notification` 是合成音的强信号）：

| 文件 | Mixkit 原名 | 质感 |
|---|---|---|
| `switch-light` | Light switch sound | ✅ 真实电灯开关 |
| `switch-tap` | On or off light switch tap | ✅ 真实电灯开关 |
| `switch-click-quick` | Quick switch click | ✅ 真实开关 |
| `pop` | （来源待考） | ✅ 模板片定稿用过（周报周列表 6 连发） |
| `hitech-touch-magnet` | Hi-tech touch with magnet | ⚠️ 磁吸质感，偏合成但有物理感，按片子调性定 |
| `chime-crystal` | Crystal chime | ⚠️ 水晶风铃，属光效/装饰音而非 UI 反馈，也可归 `light/` 用法 |
| `pop-electric` | Electric pop | ⚠️ 电子 pop，连发场景可用，单发略合成 |
| `ui-select-click` | Select click | ⚠️ 界面点击，比下面几个干净 |
| `ui-click-tone` | Cool interface click tone | ❌ 合成 tone |
| `ui-confirm-bleep` | High tech bleep confirmation | ❌ 合成 bleep |
| `ui-confirm-tone` | Confirmation tone | ❌ 合成 tone |
| `ui-tone-quick` | Digital quick tone | ❌ 合成 tone |
| `ui-success-soft` | Success software tone | ❌ 合成 tone（"success" 语义正是 S1 判例否掉的那类） |
| `ui-notify-tech` | Technology notification | ❌ 通知音 |
| `ui-message-pop` | Message pop alert | ❌ 通知音 |
| `ui-popup-dry` | Dry pop up notification alert | ❌ 通知音 |
| `ui-option-select` | Interface option select | ❌ 合成界面音 |
| `ui-select-modern` | Modern technology select | ❌ 合成界面音 |

用法：
- ✅ 一档可直接用作交互动作的拟音（`theme-switch-moves` 的开关、`segmented-thumb-hero` 的档位切换）。
- ⚠️ 一档**必须在成片语境里试听**再决定，别单听。
- ❌ 一档默认不用于产品宣传片。**例外**：片子刻意要"系统在说话"的叙事（HUD 播报、AI 确认回执、报错演示），此时它是有意的风格选择——按 aesthetic-rules 使用方式，有意违反准则要写进项目说明文档。

同样的逐个试听纪律适用于 `data/` 与 `scifi/`（合成音天然多），只是那两类的用途本就是"数字/科技质感"，不像 `ui/` 会被误当成通用交互拟音。

## 4. 对齐技巧

### 4.1 钉帧方法

- **声明式中央注册表**：`SFX: { from, src, volume }[]`，每条注释对应的画面动作；渲染层遍历数组，每条包 `<Sequence from={s.from}>`。帧号表与分镜表（`AIFL_SHOTS`）放同一文件对照（S2）。
- **长样本靠 Sequence 截断，不剪音频文件**：`keyboard.mp3`（19.6s 原素材）按语境给 `durationInFrames` 24f 或 44f；其余统一 90f 让 ≤3s 素材自然播完。音频时长与画面动作严格等长（S4）。**库里 21 个文件长于 5s，必须显式给 `durationInFrames`**，照 90f 默认值会拖到动作结束后还在响（见下表）。
- **音量分层**：BGM 0.34 打底，SFX 常规区间 0.2–0.6——点击确认 0.6 最响、pop 连发尾音 0.25 最轻，用响度表达"这一拍多重要"（曾出现的 0.14 出自已删除的 v2 pluck 连发串，不属于定稿区间）。**但 0.2–0.6 的前提是素材峰值接近 0dB**：`volume` 是乘法系数不是目标音量，库里 7 个本身录得轻的文件（峰值 <-12dB）即便给到 1.0 仍可能被 BGM 盖住——首选换素材或预归一化，必要时可给 >1 的增益（Remotion 支持，但预览会钳到 1.0，须以渲染产物验峰）。名单与三条出路见下。钉完以渲染产物试听，不要只信数字。

#### 需要显式截断的长样本（>5s，21 个）

| 文件 | 时长 | 用法 |
|---|---|---|
| `scifi/scifi-computer-ambience` | 23.5s | 底噪，整段铺一个镜头 |
| `film/projector-spin-antique` | 21.7s | 底噪/循环，按段落截 |
| `text/keyboard` | 19.6s | 打字段落，模板片截 24f / 44f |
| `text/write-blackboard` | 13.9s | 描线段落，按笔画时长截 |
| `mech/mech-robotic-futuristic` | 9.6s | 组装/形变全程 |
| `camera/camera-autofocus` | 9.6s | 对焦，一般只用前 10–20f |
| `paper/paper-book-browse-fast` | 9.3s | 连续翻页，按页数截 |
| `scifi/space-intro-futuristic` | 8.1s | 开场铺垫 |
| `light/light-spell` | 8.0s | 点亮全程 |
| `impact/impact-cine-big` | 7.9s | 落地，含长尾混响，截尾会显得干 |
| `scifi/tech-hum-futuristic` | 6.0s | 底噪 |
| `transition/wing-flutter` `swoosh-slow` `wind-pass-vibrate` | 5.0–5.7s | 运镜，贴运镜时长 |
| `paper/paper-wind-blow` | 5.5s | 纸张飞散全程 |
| `mech/metal-drop-scifi-small` | 5.5s | 落定，含尾音 |
| `light/light-aura` `light-transition-magic` | 5.1–5.5s | 光效余韵 |
| `impact/impact-movie-epic` | 5.1s | 落地，含长尾 |
| `data/power-up-electronic` | 5.0s | 启动/点亮全程 |
| `crowd/applause-rhythmic-loop` | 5.0s | 可循环掌声 |

判据：**底噪/循环类**（ambience、hum、projector）按镜头时长铺；**动作类**按动作时长截；**带长尾混响的 impact**（`impact-cine-big` `impact-movie-epic` `metal-drop-scifi-small`）让尾音自然衰减，硬截会显得干。

#### 本身录得轻的文件（峰值 <-12dB，7 个）

**先算清一件事：`volume` 是乘法系数，不是目标音量。** `volume={1}` 只是"原样播放"——素材本身 -24.6dB，给 1.0 之后还是 -24.6dB。而 BGM 峰值贴近 0dB、按 0.34 铺底约 -9.4dB，所以 `data-load-os` 即便给到上限 1.0 仍比 BGM 低 15dB，**照样被鼓底盖住**。把音量"封顶在 1.0"是无效建议。

| 文件 | 峰值 | 比 BGM(-9.4dB) 低 | 要压过 BGM（约 -6dB）需 |
|---|---|---|---|
| `data/data-load-os` | -24.6dB | -15.2dB | ~8.5x |
| `text/pencil-write-short` | -22.7dB | -13.3dB | ~6.8x |
| `text/write-fast` | -20.0dB | -10.6dB | ~5.0x |
| `transition/wing-flutter` | -17.9dB | -8.5dB | ~3.9x |
| `camera/ui-zoom-in` | -14.3dB | -4.9dB | ~2.6x |
| `counter/clock-knob-spin` | -14.0dB | -4.6dB | ~2.5x |
| `counter/clock-tick-single` | -13.9dB | -4.5dB | ~2.5x |

三条出路，按优先级：

1. **换素材（首选）**。同类别里找峰值贴近 0dB 的替代——`data/` 有 12 个别的选择、`counter/` 有 3 个、`text/` 有 12 个。轻音素材抬增益会同时抬底噪，换一个录得好的比救一个省事。
2. **预归一化**（要保留这个音色时）。用 ffmpeg 归一化后再入库，一次处理干净，钉帧时就能用常规 0.2–0.6 区间：
   ```bash
   ffmpeg -i in.mp3 -af "loudnorm=I=-16:TP=-1.5" out.mp3   # 或 -af "volume=8.5"
   ```
3. **`volume` 给大于 1 的增益**。Remotion **允许** `volume>1` 并真实放大——本仓库实测：`data-load-os` 给 `volume={4}` 输出 -12.7dB、给 `{16}` 输出 -0.7dB（即 4x≈+12dB、16x≈+24dB，符合 20·log₁₀ 的换算）。校验过 Remotion 源码：`validateMediaProps` 只拦 `volume<0`，不拦 >1；Web Audio 路径把值直接写进 `gainNode.gain`，不做钳制。
   两个前提必须知道：
   - **预览会钳到 1.0**，`Math.min(volume, 1)` 只出现在传统 `<audio>.volume` 回退路径（Safari／禁用 Web Audio 时）。也就是说**预览听到的可能比成片轻**，必须以渲染产物为准判断。
   - **抬增益会一起抬底噪，且可能削波**。渲染后必查峰值，`max_volume` 逼近 0.0dB 就要回退增益或改走第 1/2 条：
     ```bash
     ffmpeg -hide_banner -i out.mp4 -af volumedetect -f null /dev/null 2>&1 | grep max_volume
     ```

反过来：库里多数文件峰值贴近 0dB，给 0.6 就已经是"全片最响那一拍"的量级。新增音效入库时顺手记一下峰值：

```bash
ffmpeg -hide_banner -i <file>.mp3 -af volumedetect -f null /dev/null 2>&1 | grep max_volume
```

### 4.2 变调与防机枪感

**本仓库实证无 playbackRate 变调**（模板片全仓 `grep playbackRate` 零命中）。同类元素连发防机枪感靠三招组合（S2），不靠变调：

1. **双样本交替**：连发用两个近似样本轮流（模板片 deck-deal 8 连发 pluck_002/pluck_001 交替）。
2. **音量阶梯递减**：沿序列线性衰减做"距离感"——定稿 pop 6 连发 0.40/0.37/0.34/0.31/0.28/0.25。
3. **间隔跟随动画曲线加速**：连发间隔贴画面加速节拍收缩（8f→3f）；密到糊成一片时**主动让声音淡出成一条 swoosh**，不逐个配音——耳朵和眼睛一样，分辨不出糊掉的个体。

目标听感：连发段落是"数得出来的节奏"，不是机械复读（S2 自检项）。

### 4.3 riser→impact：镜头收束句式

大镜头（尤其 outro）的固定三拍：

```
riser-cine（组装/铺垫段起） → 约 35f 后 impact-deep-whoosh（主体 stamp 落地，全片响度峰值） → 25f 后 sparkle（余韵光效）
```

模板片 f945→f980→f1005，是定稿声音方向确立后唯一从未改动的段落句式（模板片里中间那拍的文件名叫 `impact-cine.mp3`，已从库中删除；库里等价文件是字节相同的 `impact-deep-whoosh.mp3`，见 3.1）——能量铺垫、钉点、余韵三件套一次成型。其它可复用的小句式：场景切换 = `transition-soft` 一发；字卡出场 = `swoosh-quick` 统一音；点击确认 = `click-camera`（给全片最高 SFX 响度）。

### 4.4 返工教训：三次重钉的顺序账

模板片 SFX 全表重钉了三次，其中**两次纯属画面返工的连带成本**（S3）：

| 次 | 起因 | 性质 |
|---|---|---|
| 1 | 音色方向错误（游戏音包→电影系词汇） | 声音自身的返工，难免 |
| 2 | 画面时间线变更（总长 1020→1085），全表 from 值平移 | **画面没锁就钉音的连带成本** |
| 3 | 周报段画面加动画，该段 SFX 重写 | 同上（局部） |

规则化：**声音在画面锁定后做；任何改变镜头时长/顺序的修改，收尾动作固定包含"全表 SFX 帧号重对"**（S3）。反面案例：有一次把换 BGM 和 deck-deal 画面重做塞进同一 commit，画面随后又改，音效白钉。

### 4.5 钉帧一律相对 shot 起点，而非绝对帧（硬规则）

模板片的 SFX 表钉**绝对帧号**，单文件数组便于整表平移（第 2 次重钉一个 diff 完成），但绝对帧意味着零结构复用——任何一个镜头改时长，其后所有条目全部失效。

做法：钉帧写成 `SHOTS.<shot>.from + offset`（相对该镜头起点的偏移；卡点片写 `beatF(n)`，见 music-beat-sync.md）。这样镜头内部节拍不变时，改前面镜头的时长只需分镜表更新一处，SFX 自动跟随——绝大部分重钉可免除。新项目起手即按相对钉帧写，绝不写裸数字帧号。

### 4.6 音画对齐补两项偏移（硬规则）

设计意图是"音源峰值落在目标拍帧上"，从意图到成片隔着两项偏移，都
不补时会叠加——本仓库实测最重一击晚了 0.27s，明显读作音画不同步；
卡点片里差 2–3 帧就足以让观众听不出"这一下是跟着鼓的"，合理的卡点
动效被读作无端抖动（S5 判例）。统一公式（浮点计算，最后一步取整）：

```
Sequence.from = 目标峰值帧 − 音源峰值滞后帧 − 输出音轨偏移帧
```

**偏移一：最终输出音轨偏移（逐渲染管线实测）。**
渲出成片的整条音轨相对视频有一个固定滞后。根因在**输出编码/封装
链路**，不是 `<Audio>` 或 `Sequence.from` 的行为：AAC 编码器有
encoder priming（头部垫入的预热样本），48kHz 下典型值 2048 samples
= 1.28f@30fps。本仓库 AiflPromo 实测 click 滞后 2032 samples、
impact 2066 samples（≈1.27–1.29f），与 priming 指纹吻合；且渲染品
（aifl-ref.mp4）音轨的 edit list（elst media time=0）未声明裁剪这段
垫头，解码后就体现为真实偏移。Remotion 官方跟踪同族问题：
remotion-dev/remotion#7099。

- **按管线记录，不按"片"**：偏移由 Remotion 版本 + 音频 codec +
  sample rate + 容器四要素决定，实测值随四要素一起记档；四要素不变
  可复用，换任何一样必须重测。priming 量级依编码器而异（ffmpeg 内置
  aac ≈1024、fdk-aac 2048、Apple ≈2112 samples），不能预设常数。
- promo-ink 时代实测过 **4f**（≈133ms/6400 samples），量级远超
  priming 所能解释、根因未验证——仅作为"旧常数不可跨管线搬运"的
  警示数据保留，不作机制陈述。

实测方法（渲后做，同管线量准一次通用）：

```bash
ffmpeg -i out/promo.mp4 -vn -acodec pcm_s16le /tmp/render-audio.wav
```

拿 2–3 个尖锐 SFX 的**原文件**对渲出音轨做归一化交叉相关（numpy
`np.correlate` 即可），峰值位置减去设计帧号就是偏移量；多个探针
残差一致才算量准，只测一个点可能撞上音源自身的峰值滞后。

**偏移二：音源自身的峰值滞后（逐文件量）。**
很多素材的能量峰不在文件头（渐强攻击、前置气口），按文件头对齐等于
晚到。实测例：brush-write 2f、paper-slide 10f、ink-char 深达 24f。
峰值位置用音频能量包络定位，新音效入库时随 max_volume 一并记录
（见 4.1；与 music-beat-sync §4 "素材按内部峰值对齐，不按文件头
对齐"同一条原则）。

渲染层实现——SFX 表保持 §4.1 的 `{ from, src, volume }` schema 不变，
三项拆分发生在 `from` 的计算表达式里（审计链完整，绝不逐条手改帧号）：

```tsx
// 本管线实测：Remotion 4.x + AAC 48kHz mp4，2026-08-23，click/impact 双探针交叉相关
const OUTPUT_AUDIO_OFFSET_F = 1.28;
const PEAK_F: Record<string, number> = { 'impact-deep-whoosh.mp3': 2 /* 逐文件实测 */ };
const sfxFrom = (targetPeakF: number, src: string) =>
  Math.max(0, Math.round(targetPeakF - (PEAK_F[src] ?? 0) - OUTPUT_AUDIO_OFFSET_F));
// 表内写法：{ from: sfxFrom(SHOTS.outro.from + 35, 'impact-deep-whoosh.mp3'), src: …, volume: 0.55 }
```

两个边界注意：
- **durationInFrames 不加偏移**：窗口整体前移后起止点在听感上一起
  归位；给截断型音效（显式 durationInFrames 裁长样本的）加长窗口，
  会多播出本该裁掉的内容。
- `Math.max(0, …)` 兜底意味着片头约 2f 内的钉点无法完成全部补偿，
  残差记进验收表；片头重音尽量不要设计在前 2 帧。

BGM 侧同理但记账位置不同：源音乐网格常量 `SOURCE_BEAT0` 保持分析
真值不动，输出偏移单独设常量参与 `beatT` 换算，见 music-beat-sync
§5b——两处共用同一套交叉相关实测法。

验收：补偿后重渲，对 2–3 个探针重跑交叉相关，残差 ≤0.5f 为合格。
