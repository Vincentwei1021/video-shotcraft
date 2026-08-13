# 剪映工程导出：成片 → 可编辑的剪映草稿

把 Remotion 时间线导出为剪映（CapCut 国内版）工程文件，用户可在剪映里
继续改字幕内容/字号/颜色、对每个镜头变速/重排/调色、调整或替换 SFX 与
BGM。镜头内部动效（逐帧程序渲染）超出剪映的素材+关键帧模型，只能烘焙。

**触发时机**：任何模式下成片交付后，默认询问用户一次："是否需要同时生成
剪映工程文件（可在剪映里改字幕、变速、换音频）？" 用户要求时执行本文档
流程；用户明确点名"导出剪映工程"时直接执行，不再询问。

**平台前提**：Mac 版剪映专业版 11.2 实测通过（`jianying-export/mac_draft.py`）；
Windows 版按上游支持路径实现但未真机验证（`windows_draft.py`），首次使用
先做冒烟测试（见 §6）。剪映打开明文草稿后会升级加密保存——**单向转换**，
要改就改导出脚本重装（幂等覆盖），不要试图读回剪映改过的草稿。

## 1. 分层原则：什么可编辑、什么烘焙

| 层 | 剪映里的形态 | 可编辑度 |
|---|---|---|
| 镜头内动效（运镜/粒子/3D/逐元素编排） | 烘焙进底片 | 仅整段变速/调色 |
| 镜头边界 | 底片按镜头切段（同一文件不同 source_timerange） | 变速/重排/删减 |
| 屏幕空间字幕/解说 | 剪映原生文本轨 | 内容/字号/颜色全开 |
| SFX / BGM | 剪映音频轨（带音量） | 全开 |
| 用户点名的独立元素（logo/计数等） | 可选：画中画图层 | 位置/大小/透明度 |

品牌动效时刻（标题贴位、logo lockup 等定制编排的文字）默认烘焙——拆成
剪映文本会丢掉调校过的入场动画；用户明确要求可编辑时才拆，并说明代价。

## 2. plate 底片渲染

给 Remotion 项目加一个 `plate` inputProp，渲一版**无字幕、无 SFX、无 BGM**
的干净底片。字幕组件用 `getInputProps()` 网关（不必层层传 prop）：

```tsx
// 字幕组件顶部
import { getInputProps } from 'remotion';
const { plate } = getInputProps() as { plate?: boolean };
if (plate) return null;
```

```tsx
// Root 里音频统一 gating
{bgm && !plate && <Audio src={staticFile('audio/bgm.mp3')} volume={0.72} />}
{!plate && SFX.map(...)}
```

```bash
npx remotion render src/index.ts <CompId> out/plate.mp4 \
  --props='{"bgm":false,"plate":true}'
```

渲后抽帧对比原片同帧（ffmpeg -ss）：确认字幕已剥离、其余视觉逐帧一致。

## 3. 时间线数据提取

从 Remotion 工程的常量表（`theme.ts` 的 SHOTS / Main.tsx 的 CAPTIONS、
SFX 表）提取三张表，**拍号网格在 Python 里精确复算**，不要抄注释里的
约数帧号：

```python
FPS = 30
BEAT0, BEAT_T = 0.0538, 0.47609        # 与 theme.ts 完全一致
def beatF(n): return round((BEAT0 + n * BEAT_T) * FPS)
def f2us(f): return round(f * 1_000_000 / FPS)   # 帧 → 微秒
```

- **镜头表** `(名称, from帧, to帧)`：抄 SHOTS 定义（含钉真实瞬态的非整拍
  边界）。
- **字幕表** `(中文, 英文, from帧, to帧)`：抄各镜头字幕组件的实参；
  **相邻镜头同文案合并为一段**（原片的跨镜头延续）。
- **SFX 表** `(文件, 目标拍, 峰值秒, 音量)`：抄 Root 的钉帧表。剪映按
  摆放位置播放，**不要带上 Remotion 的 4 帧起播补偿**（那是 Remotion
  渲染管线的 quirk）：`start_f = beatF(拍) - round(峰值秒 * FPS)`。
  长样本的显式截断时长（如 impact 留混响尾）照抄。

**微秒边界铁律**：相邻段的 Timerange 必须"起点/终点各自取整再相减"
（`Timerange(f2us(f0), f2us(f1) - f2us(f0))`）。起点和时长分别取整会产生
1µs 级缝隙/重叠，pyJianYingDraft 直接报 SegmentOverlap。

## 4. 建轨（pyJianYingDraft 0.3.x）

环境：`python3.11 -m venv .venv && pip install pyJianYingDraft`，
封面抽帧需要 ffmpeg。建轨骨架（synapse-promo-v2 验收版蒸馏）：

```python
import pyJianYingDraft as draft

folder = draft.DraftFolder(STAGING)          # 先建到暂存目录，装库是独立步骤
script = folder.create_draft(NAME, 1920, 1080, fps=FPS, allow_replace=True)
script.append_track(draft.TrackSpec(draft.TrackType.video, name="底片"))
script.append_track(draft.TrackSpec(draft.TrackType.audio, name="BGM"))
script.append_track(draft.TrackSpec(draft.TrackType.text, name="字幕EN"))
script.append_track(draft.TrackSpec(draft.TrackType.text, name="字幕ZH"))

# 底片切段：source=target 同区间 → 每段可在剪映单独变速/重排
plate = draft.VideoMaterial(PLATE)
for _name, f0, f1 in SHOTS:
    rng = draft.Timerange(f2us(f0), f2us(f1) - f2us(f0))
    script.add_segment(draft.VideoSegment(plate, rng, source_timerange=rng),
                       "底片")

# SFX：Remotion 重叠音频自动混音，剪映同轨段不可重叠 → 贪心分道
sfx_segs = []
for file, beat, peak_sec, volume in SFX:
    mat = draft.AudioMaterial(os.path.join(SFX_DIR, file))
    start_f = max(0, beatF(beat) - round(peak_sec * FPS))
    dur_us = min(f2us(截断帧数), mat.duration, f2us(TOTAL_F - start_f))
    sfx_segs.append((f2us(start_f), dur_us, mat, volume))
lanes, placed = [], []
for start, dur, mat, volume in sorted(sfx_segs):
    lane = next((i for i, end in enumerate(lanes) if end <= start), len(lanes))
    if lane == len(lanes): lanes.append(0)
    lanes[lane] = start + dur
    placed.append((lane, start, dur, mat, volume))
for i in range(len(lanes)):
    script.append_track(draft.TrackSpec(draft.TrackType.audio, name=f"SFX{i+1}"))
for lane, start, dur, mat, volume in placed:
    script.add_segment(draft.AudioSegment(mat, draft.Timerange(start, dur),
                                          volume=volume), f"SFX{lane+1}")

# BGM 一段（音量照抄 Root）
bgm = draft.AudioMaterial(BGM)
script.add_segment(draft.AudioSegment(
    bgm, draft.Timerange(0, min(bgm.duration, f2us(TOTAL_F))), volume=0.72),
    "BGM")

# 双语字幕拆两轨：一个文本段只能一种字号，中文大英文小必须分开
for zh, en, f0, f1 in CAPTIONS:
    rng = draft.Timerange(f2us(f0), f2us(f1) - f2us(f0))
    script.add_segment(draft.TextSegment(zh, rng, **ZH_STYLE), "字幕ZH")
    script.add_segment(draft.TextSegment(en, rng, **EN_STYLE), "字幕EN")
script.save()
```

**字幕样式换算**（Mac 11.2 实测标定）：

- 剪映 `TextStyle(size=…)` 单位 ≈ **画布高度百分比**：size 15 渲出
  ≈150px @1080p。CSS 像素字号 ÷ 10.8 ≈ 剪映 size（64px → 6.0）。
- `ClipSettings(transform_y=t)` 按半高归一，`屏幕y = 540 × (1 − t)`：
  底部字幕区 t ≈ −0.70（y≈915）/ −0.825（y≈985）。
- scrim 底用 `TextBackground(color="#FFFFFF", alpha=0.82, round_radius=0.35)`；
  颜色是 0–1 浮点三元组（#2C2C2C → (0.173,)*3）。
- 字体不指定则用剪映默认；导出后提醒用户可在剪映里换字体微调——字号/
  位置是近似值，用户反馈后调参重装收敛。

## 5. 装进剪映草稿库

```python
import mac_draft                      # Mac；Windows 用 windows_draft
info = mac_draft.macify(draft_dir, DRAFT_NAME)   # Mac 三坑适配+媒体打包
bak = mac_draft.install(draft_dir, DRAFT_NAME, info)
```

Mac 版三个坑（mac_draft.py 已全部处理，改模块前必读其 docstring）：
入口文件名 `draft_info.json`；meta 的 `draft_materials(type 0)` 必须登记
全部媒体（否则弹"媒体丢失"）；沙盒应用只能访问 `~/Movies`，媒体必须打包
进草稿 `Resources/`（否则"暂无访问权限"）。

Mac 版 platform 需要本机设备指纹（device_id 等），模块自动从草稿库里仍为
明文的老草稿抄取。**全新机器往往没有明文老草稿，此时 macify 会明确报错
中止**（无指纹草稿能否被剪映加载未经实测）——按报错提示传 `donor_draft`
或实验性传 `allow_missing_fingerprint=True`，并把实测结果反馈回模块注释。

Windows 版：`windows_draft.install(draft_dir, DRAFT_NAME)`，无注册表，
列表不刷新就重启剪映。

**安装前必须让用户完全退出剪映**（Cmd+Q；osascript quit 会被剪映忽略，
不要强杀）。安装脚本已内置运行检测。卸载：`mac_draft.uninstall(名称)`。

## 6. 验收

1. 脚本自检：读装好的 `draft_info.json` 核对轨道数/段数/时长，媒体登记
   逐条 `os.path.exists` 且路径都在草稿目录内。
2. 用户端三查：整片播放连贯、SFX 卡拍；双击字幕改文字/字号/颜色；
   任选一段底片变速。
3. 新机器/新剪映版本首次使用：先跑 `jianying-export/smoke_test.py`
   （最小三轨草稿注入），确认打开无"内容已损坏"、无"媒体丢失"再做正片。
4. 交付时说明：剪映保存后草稿被加密（单向）；想改字幕方案/镜头切分，
   回导出脚本改参数重装。
5. **隐私**：Mac 版草稿的 platform 字段含本机设备标识（device_id/
   hard_disk_id/mac_address）。自包含草稿目录**不要直接分发给他人**——
   对外只交付渲出的成片；确要给别人可编辑工程，在对方机器上重新导出。
