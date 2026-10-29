# Freesound 音效选材

新制作与换音直接从 [Freesound](https://freesound.org) 获取 SFX，不再使用共享本地音效库。
用户指定的音源仍优先。BGM 沿用独立选曲流程，见 [sound-design.md](sound-design.md) §2。
本模块负责选材、下载与来源记录；钉帧、混音、输出偏移补偿继续按 sound-design 执行。

## 1. 把画面写成声音需求

每个 cue 记录：对应镜头/动作、声源或材质、目标时长、攻击/尾音、音色和许可要求。
例如纸卡滑入：`paper slide`，0.2–0.8s，干燥、单次、无长尾、CC0。
以声源匹配为先，再比较时长、录音描述与热度；不要只搜索抽象情绪或宽泛的 `click`。

- 单击/滑动不要选混有多个动作的长段录音，除非能明确裁出所需动作。
- 下载量与评分人数用于辅助排序，不能替代匹配度；大量评分的 4.4 分通常比 6 人评出的
  4.9 分更有参考性。推荐时引用实际数据，缺失值保留未知，不能编造。
- 上传者描述提供声源、设备、处理方式线索；优先清晰且匹配的实际声源。
  名牌设备不保证质量，口技或内置麦克风也不自动意味着不可用，按项目质感判断。
- UI 动作的拟音与合成提示音分开判断，遵守 aesthetic-rules S1/S4。

## 2. 搜索

脚本独立实现，Python 3.9+ 标准库，无需 Freesound API key；下载/分析需 ffmpeg、ffprobe。
从 skill 根目录执行；路径含空格时加引号。安装在其他位置时用脚本绝对路径。

```bash
python3 assets/scripts/sfx-source.py search "paper slide" --max-duration 1 --limit 5 --output /path/to/video/audio-search.json
python3 assets/scripts/sfx-source.py search "short cinematic impact" --license by --max-duration 3 --pages 2
```

输出 JSON 含 ID、标题、作者、素材页、预览地址、描述、时长、下载量、评分和人数。
保留搜索相关性顺序，并在本地再次过滤许可与时长。`--pages` 最多 3 页，先缩窄关键词，
不以抓取更多页面代替选材。搜索输出只用于比较，不作为下载时的许可凭据。

许可默认 `cc0`；`by` 允许 CC0 和 CC BY。商用产品片不接受 BY-NC、Sampling+ 或未知许可。
用户愿意接受署名时可用 `--license by`，无需对每条声音重复询问。

## 3. 下载到当前视频工程

把 ID 换成本次搜索返回的候选；`get` 也支持已知 ID，不依赖全局缓存。

```bash
python3 assets/scripts/sfx-source.py get fs:12345 fs:67890 --out-dir /path/to/video/public/audio/sfx
```

需要 CC BY 时在 `get` 上同样传 `--license by`。下载前重新读取各素材的详情页、
核对实际许可 URL 与版本，再有界并发下载。不会修改网络代理，也不会自动切换其他音源。

产物：

- `fs-<id>.mp3`：Freesound 的高质量 **有损 MP3 预览**，不是上传者的原始 WAV。
- `audio-manifest.json`：来源、作者、素材页、许可 URL/版本、预览标记、下载时间、
  SHA-256、修改记录与实际音频分析。
- `FREESOUND-CREDITS.md`：可随工程交付的来源与署名清单；CC BY 条目需进入发布页说明
  或成片署名，不能仅留在工程文件中。剪辑、变速、归一化等改动需补写 `changes`。

重复下载会核对文件哈希，不覆盖自行修改或来源不明的同名文件。每个输出目录同一时间
只运行一个 `get`。部分下载失败时成功项仍保留清单，命令退出非零；根据逐条结果只重试失败 ID。
无匹配候选时调整查询；网站超时/限流/页面结构变化时停止该来源的自动调用，说明具体问题。
可给出素材页供人工下载，再按同样字段记录来源；不能用 HTML 错误页冒充音频。

原音质或无损处理有明确要求时，从素材页走 Freesound 支持的登录/下载流程取得原文件；
不能把预览转 WAV 后标成“原始无损素材”。记录真实文件种类、地址、哈希并重新分析。

## 4. 分析、试听与接入

`get` 自动用 ffprobe 与 ffmpeg 解码验收，记录实际格式/采样率/声道、时长、sample peak、
整体 RMS、10ms RMS 能量峰和相对峰值 -40dB 的活动区间。这些不是 LUFS、true peak 或精确动作起点。
多个动作的录音需要选择正确的峰值，不能直接将全文件最大峰用于所有 cue。

单独分析处理后的文件：

```bash
python3 assets/scripts/sfx-source.py analyze /path/to/video/public/audio/sfx/fs-12345.mp3 --output /path/to/video/audio-analysis.json
```

处理后更新 manifest 的文件名、SHA-256、`analysis` 和 `changes`；原文件与处理后文件的
峰值时间分开记录。浏览器试听或把候选垫入片段检查音色、底噪、尾音与音乐的关系。
工具只有元数据/测量能力时，明确写“未试听”，不要将下载数、波形或 ffmpeg 分析描述成听感。
自主创作可基于证据选定并继续；用户要求听候选时给素材页或支持的本地音频预览。

随后将固定文件接入中央 SFX 表，`from` 从 `SHOTS`/`beatF` 派生，并根据
sound-design §4.6 补偿音源峰值与输出偏移。下载文件必须随工程保存，不能只引用远程 URL。
工作台显示工程音频；新增下载后重新运行 `node workbench/scripts/open.mjs <工程目录>` 更新索引。

## 5. 模板与交付

`template/public/audio/` 的历史文件保留供原样运行与验证，不作为新项目的选材池。
用模板为新产品制作时，沿用 SFX 的动作语义和钉帧结构，从 Freesound 选音后重新测量、对齐；
用户明确要求复现原声音时保留该要求，并按模板授权记录核实音源。
共享 SFX 目录移除前的完整记录可从 Git 历史查询，BGM 授权仍在 `assets/audio/ATTRIBUTION.md`。

交付音频文件、manifest、署名清单和 SFX 时间表。终检见 [final-review.md](final-review.md) A10。

选材方法参考 [vibe-motion/sound](https://github.com/vibe-motion/sound)（查阅版本 `01f81d6`）；
本仓库的 CLI 为独立实现，未引入其脚本或个人 Clash 配置。
