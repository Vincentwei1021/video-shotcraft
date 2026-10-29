# sound-design — 声音设计

声音是时间线级资产：集中管理 SFX 钉帧表，场景组件不内嵌音频。
新制作与换音统一从 **Freesound** 搜索、下载，操作见 [sfx-sourcing.md](sfx-sourcing.md)。
仓库不再维护共享 SFX 库；模板的历史音频只用于原样预览与回归验证。

## 1. 方法

1. 分镜阶段记下动作、材质、时长和音色；画面时间线锁定后再精确钉 SFX。
   用户已指定 BGM 的卡点片仍先按 [music-beat-sync.md](music-beat-sync.md) 分析再分镜。
2. 先铺 BGM 定能量骨架，再钉画面独有动作。强鼓点本身已有节拍，不给每拍重复加 impact。
3. SFX 按片种与真实声源选：whoosh（运镜）、impact（落地）、riser（铺垫）、
   sparkle（光效）、transition（转场），有辨识度的动作另配真实拟音。
4. 候选在成片语境中试听。下载量、评分、描述、波形是筛选证据，不能被写成“已经听过”。
5. 下载到当前工程 `public/audio/sfx/`，随文件保留 `audio-manifest.json` 与
   `FREESOUND-CREDITS.md`；Remotion 只读这些固定本地文件，渲染时不联网找音。
6. 声音时间表从 `SHOTS` 派生并供工作台复用；时间线变更后逐条复核，最终按
   [final-review.md](final-review.md) 的 A 项验收。

## 2. BGM 选型与混音

Freesound 路线负责 SFX。BGM 保留用户指定音乐或 `assets/audio/bgm/` 的备选，
授权见 `assets/audio/ATTRIBUTION.md`，不能把 SFX 许可套到音乐上。

- 音乐能量应匹配片子结构。产品宣传片可优先试鼓点清楚的电子底；用户的调性要求优先。
  候选曲垫进成片试听，避免只因“欢快/好听”选择与产品气质不符的音乐。
- 音量按素材实测给。模板中 0.34 的 BGM、0.2–0.6 的 SFX 只是历史参考，
  `volume` 是乘法系数，不是目标响度。多轨叠加后检查削波和人声/SFX 是否被掩盖。
- 用 `interpolate` 做首尾淡入淡出；有配音时在说话段压低音乐。
- BGM `<Audio>` 单独受 `bgm` inputProp（默认 true）控制；配 BGM 的片子从同一
  时间线交付带 BGM / 无 BGM（保留 SFX）两版。跨平台无 BGM 渲染使用
  `--props=props-nobgm.json`，文件内容 `{"bgm":false}`。

## 3. 音色与选材

### 3.1 从画面组织搜索词

完整选材规则和 CLI 在 [sfx-sourcing.md](sfx-sourcing.md)。先明确声源、质感、
攻击长度和尾音，再查 Freesound；不要只用 `click` 或 `impact` 这类宽泛词。

| 画面 | 查询示例 | 筛选重点 |
|---|---|---|
| 卡片飞入 / 运镜 | `short soft whoosh` | 攻击峰位置、无过长拖尾 |
| 纸卡滑入 / 翻页 | `dry paper slide` / `single page turn` | 真实纸声、单次动作 |
| 开关 / 轻点 | `mechanical switch click` | 短促物理质感，避免提示音 |
| 字标落地 | `short cinematic impact` | 重量感、低频不盖住 BGM |
| 打字 | `computer keyboard typing` | 节奏密度、段落长度、底噪 |
| 组装与余韵 | `cinematic riser` / `subtle shimmer` | 渐强能否抵达落点、尾音是否自然 |

### 3.2 连发候选先检查重复

两个名称或两个 Freesound ID 可能对应相同声音。用清单的 SHA-256 发现相同文件，
再试听确认音色差异；不同编码的同一录音可能哈希不同。不能把同一声音的改名副本
当成双样本交替。不要下载整库，只取当前动作需要的候选。

### 3.3 UI 动作仍要逐个判断音色

S1 禁的是游戏式合成提示音质感，不是点击动作。真实开关、快门、玻璃、纸张拟音可用；
`confirmation tone`、`bleep`、`notification` 往往是合成反馈，不能因为搜索词匹配
就入选。片子刻意表现“系统提示”时可以使用，在设计记录中说明叙事理由。

录音描述有明确声源与设备是有用线索；`made with my mouth`、`built-in mic`
可能不适合干净的产品片。设备名字不能保证质量，仍需结合片中试听。

## 4. 对齐技巧

### 4.1 钉帧、时长和音量

- 中央注册表保持 `{ from, src, volume }[]`，可扩展 `durationInFrames`；
  每条注释对应动作，渲染层用 `<Sequence>` 挂载。工作台从同一张表派生轨道。
- 以下载文件的 `analysis` 为准，不能把网页列出的原文件时长/采样率当成预览文件实测。
  `get` 自动分析；处理或换文件后再运行 `analyze`，更新清单和哈希。
- 动作声显式设置播放窗口，特别是 >5s 的键盘、环境与机械长样本。
  Sequence 裁剪贴动作时长；底噪铺满对应段落；impact 的自然混响可越过落点，避免硬截。
- 峰值低于 -12dB 的轻音素材先考虑换更干净的候选，或预处理后重新分析。
  必要时可用 >1 增益，但预览与渲染的行为可能不同，以成片实测防削波。
- 工具给出 10ms 窗口的 RMS 能量峰、sample peak 和整体 RMS，**不是 LUFS 或 true peak**。
  多次敲击或渐强素材需人工选择语义落点，不能机械地把全文件最大峰当作每个动作的落点。

### 4.2 连发防机枪感

双样本交替、音量阶梯递减（如 0.40→0.25）、间隔跟随动画加速。
密到无法逐个听清时收成 swoosh 或淡出，不让多个长尾叠成噪声。

### 4.3 riser→impact→sparkle：镜头收束句式

组装铺垫起 riser，主体落地钉 impact，余韵配 sparkle。按镜头实际落点确定
三者间隔，从 Freesound 选匹配的三个声源；不沿用模板文件名或绝对帧号。
是否使用该句式服从分镜，不强行给所有结尾套同一种声音。

### 4.4 画面返工后的复核

镜头时长、顺序或动作峰值变了，复核对应声音窗口和其后所有钉点；
只调整画面而不检查声音会导致错位。选材可以提前，精确钉帧在时间线锁定后做。

### 4.5 相对 shot 起点钉帧

写 `SHOTS.<shot>.from + offset`，卡点片写 `beatF(n)`；新项目不写裸绝对帧号。
镜头起点变化时 SFX 自动跟随，但镜头内部动作变化后仍需复核。

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
