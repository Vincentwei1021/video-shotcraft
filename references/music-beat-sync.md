# music-beat-sync — BGM 节奏分析与卡点方法论

强节奏 BGM 的片子，**所有转场和关键动效必须落在拍上**。本文档给出从
"拿到一首曲子"到"成片切点误差 ≤3 帧"的完整可复现流程。实测：一支
70s、18 镜、131.97 BPM 的强鼓点宣传片按此法制作，渲后回测全部切点
误差 ≤2.2f（感知阈值约 3f）。

## 目录

- 何时启用
- 节拍网格测定
- 鼓点分类与能量结构
- 网格验收与产物
- 用拍号编排时间线
- 渲后回测
- 工具备忘

## 0. 何时启用

阶段 0 先检查用户是否已指定音乐。
- 已选好 → 走本文档：先分析节奏，再让分镜的每个切点/动效锚到拍号
- 未选 → BGM 选型放到阶段 6（见 pipeline.md），此时动效时间线按
  内容节奏排，不强行卡点

**铁律：音乐先行。** 网格没验收通过之前不设计分镜；时长对不上时改
时间参数，不删改用户文案。分析全程用浮点秒记录时刻，**换算成帧只发生
在进 Remotion 的最后一步**（提前取整会让误差在管线里滚雪球）。

## 1. 节拍网格测定（不要相信 beat_track 的 tempo 标量）

用 `uv run --with librosa --with scipy --python 3.11` 跑一次性脚本：

```python
import numpy as np, librosa

y, sr = librosa.load("bgm.mp3", sr=None, mono=True)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, tightness=400, units="time")

# 关键一步：对 beat 序列做最小二乘等距网格拟合，求真实 BPM 与相位。
# beat_track 返回的 tempo 标量可能偏差 2%+（实测 129.2 vs 真值 131.97），
# 但它输出的 beat 时刻序列本身是好的——用整个序列拟合直线 t_i = t0 + i*T：
i = np.arange(len(beats))
A = np.vstack([i, np.ones_like(i)]).T
(T, t0), *_ = np.linalg.lstsq(A, beats, rcond=None)
bpm = 60.0 / T
residual = beats - (t0 + i * T)
print(f"BPM={bpm:.2f}  t0={t0:.4f}s  T={T:.5f}s  残差±{np.abs(residual).max()*1000:.0f}ms")
```

验收标准：残差 ≤ ±15ms（半帧内）说明曲子是机器鼓点、网格可信；
残差大说明有变速段，需要分段拟合。

**半倍/双倍歧义必查**：beat 检测常在 2x/0.5x 之间跳（70 BPM 报成
140）。判据不是听感，是下一节的鼓点数据——正确的网格下 kick 应该
主要落在整数拍；如果 kick 一半落拍一半落半拍，多半是网格快了一倍。
拿 0.5x/1x/2x 三个候选按 §3 的指标各算一遍分数，选覆盖率最高的。

**复杂曲先分离鼓 stem**：人声/贝斯厚的编曲会把鼓的攻击埋掉，
beat_track 和 onset 都会漂。轻量方案 `librosa.effects.hpss` 取打击
成分；重方案 Demucs 分离整条鼓轨（见 §6），之后所有鼓点检测都在
鼓 stem 上做，不在全混音上做。

## 2. 鼓点分类与能量结构（决定什么钉在哪一拍）

### 2a. 三分类瞬态检测

不同鼓件驱动不同类型的动效，分频段各测一遍（在鼓 stem 或 hpss
打击成分上）：

| 类别 | 频段 | 驱动的动效 |
|------|------|-----------|
| kick | 40–160 Hz | 冲击 / slam / 骤缩——画面"被砸"的一拍 |
| snare | 150–500 Hz 体 + 1–3 kHz 打击面（两者都要有） | 替换 / 闪切 / 构图切换——"换一件事"的一拍 |
| hihat | 6–14 kHz | 微动密度——hihat 密的段落微动效可以密，稀的段落必须收 |

```python
from scipy.signal import butter, sosfilt
def band_env(y, sr, lo, hi):
    sos = butter(4, [lo, hi], btype="band", fs=sr, output="sos")
    env = librosa.onset.onset_strength(y=sosfilt(sos, y), sr=sr)
    return env, librosa.times_like(env, sr=sr)

kick_env, times = band_env(y, sr, 40, 160)
# 把每个整数拍位置的 env 能量列出来，排序找最强 hit：
for n in range(int((times[-1]-t0)/T)):
    t = t0 + n*T
    e = kick_env[np.argmin(np.abs(times - t))]
    # 记录 (拍号 n, 能量 e)，取 top 若干作为"大 slam 候选拍"
```

命中记成 `{t 秒, s 强度, k 类别}` 的列表存档，设计分镜时按类别取用。

### 2b. RMS 能量曲线与结构表

`librosa.feature.rms` 拉全曲能量曲线，配合鼓点密度切出段落边界。
产出两样东西进设计 spec：

- **音乐结构表**：能量从第几拍起满、breakdown/静默段在第几拍——
  分镜的能量曲线要贴着它排（breakdown 处放品牌呼吸位是天然结构），
  高能段镜头可以多层动效并行，低能段收到 1–2 层
- **最强 hit 拍号清单**：全片 2–3 个最大 slam（开题/高潮/收尾）
  必须钉在这些拍上

**易错点（实测踩过）**：最大 slam 钉在了 b52.5（两拍之间）而最强
kick 在整数拍 b52 上，渲后回测偏差 +5.75f。强鼓点曲的重音几乎总在
整数拍上，半拍钉点必须有 env 数据支持，不能凭听感。

## 3. 网格验收与产物（先验收，后分镜）

拿候选网格（含 0.5x/1x/2x）逐一对齐最近的真实鼓点瞬态，算四个指标：

| 指标 | 含义 | 门槛 |
|------|------|------|
| match | 网格拍命中真实瞬态的比例 | ≥98% |
| mean_abs_ms | 平均绝对对齐误差 | <10ms |
| drift | 残差对时间做线性回归的斜率（漂移） | 全曲累计 <5ms |
| 首拍有效性 | 网格第 0 拍是否落在真实的音乐攻击上 | 必须 |

按分数选出获胜网格，把**所有候选和获胜理由**写进分析产物留档。
拿不准时给候选网格各合成一条 click 轨叠回原曲听一遍，但最终以
指标定夺，不以听感定夺。

分析产物随项目留档（是每一个切点的审计链）：

```text
analysis/
  beat_data.json    # bpm, t0, T, beats[], hits[{t,s,k}], rms[], sections[]
  grid_drift.json   # 各候选网格的 match/误差/漂移 与获胜理由
  click_*.wav       # 候选 click 轨（可选，听感复核用）
```

`beat_data.json` 里的时刻永远是浮点秒、不预取整；下游只依赖
`bpm / beats / hits / rms / sections` 这几个字段名。

## 4. 时间线用拍号写，不用帧号写

Remotion 项目里把网格常量化，一切镜头边界/动效关键帧用 `beatF()` 表达：

```ts
export const FPS = 30;
export const BEAT0 = 0.2244;   // t0，秒
export const BEAT_INT = 0.45465; // T，秒
export const beatT = (n: number) => BEAT0 + n * BEAT_INT;          // 拍→秒
export const beatF = (n: number) => Math.round(beatT(n) * FPS);    // 拍→帧

export const SHOTS = {
  s0_open:  { from: 0,        to: beatF(8) },
  s1_slam:  { from: beatF(8), to: beatF(16) },
  // …每个镜头边界都是 beatF(整数拍)；镜头内部动效用局部拍：
};
export const localBeat = (shot: {from: number}, n: number) => beatF(n) - shot.from;
```

好处：换曲/换段落时改两个常量全片重排；SFX 钉帧表也写 `beatF(n)`，
与画面共用同一事实源，永不错位。

**锚点绑定规则**（哪些用网格、哪些用真实瞬态）：

- 密集规则切点（每拍/每两拍一切）→ 用获胜网格的 `beatF(n)`
- 稀疏重音、孤立定格 → **钉真实瞬态**，不用网格插值点（网格在稀疏
  处的微小漂移会被单个重音放大成可感偏差）
- 结尾定格 → 最后一个真实瞬态 + RMS 静默确认（防止钉在余韵尾巴上）
- 视频素材/SFX 按**内部峰值**对齐，不按文件头对齐：
  `素材起始 = 目标拍时刻 − (峰值时刻 − 裁剪偏移)`；峰值用音频能量
  包络或 FFmpeg 帧差定位

设计规矩：
- 镜头时长以拍为单位（4/8 拍一镜），加速段可用半拍/四分之一拍阶梯
  （如 CUT_BEATS = [48, 49.5, 50.5, 51, 51.25] 的收敛逼近）
- 每拍一动作的步进类镜头（清单逐项、马赛克逐格）直接 map 拍号
- BGM 鼓点已密时 SFX 克制：只钉画面独有动作，大 slam 只给 2–3 处，
  其余让位给 BGM 的鼓
- 结构性运动（形变/运镜/位姿）用连续帧函数；冲击事件（出现/替换/
  闪/骤缩）在选定的那一帧上开关。多层动效同帧命中构成重音；要错
  开只错 1–2 帧且必须是设计意图，不允许来自取整的意外错位

## 5. 渲后回测（闭环，必做）

### 5a. 两种误差分开报，不混为一谈

- **音频真值误差**：设计切点秒值 vs 真实瞬态秒值的距离，验的是
  分析管线；门槛：平均 <5ms，全部 ±33ms 内，90% 在 ±15ms 内
- **视觉量化误差**：秒值换算到最近可渲染帧引入的取整误差，验的是
  帧率够不够；`beatF()` 取整那一步的误差就是它，逐锚点记录

最近帧取整的误差上限由 FPS 决定：30fps 是 ±16.7ms、60fps 是
±8.3ms、120fps 是 ±4.2ms。**30fps 交付不要声称 <5ms 的视觉精度**；
量化误差报表超出容忍时升帧率，而不是去改音频分析。

### 5b. 渲出成片抽音轨回测

```bash
ffmpeg -i out/promo.mp4 -vn -acodec pcm_s16le /tmp/render-audio.wav
```

对渲出音轨重跑第 1 步的网格拟合（BGM 从视频里量，不从源文件量——
这样连音频编码/对齐偏移一起验），然后逐一对比：
**设计切点帧号 vs 最近测得拍的帧号**，输出误差表。

| 判定 | 误差 |
|------|------|
| 合格 | ≤3f（感知阈值） |
| 理想 | ≤1.5f |
| 必修 | >3f 的任何切点 |

误差超标的钉点回第 4 步改拍号或帧偏移，重渲再测，直到全表合格。

## 6. 工具备忘

- librosa 不在系统 python：`uv run --with librosa --with scipy --python 3.11 script.py`
- 只有人声/复杂编曲的曲子 beat_track 会漂：先用 `librosa.effects.hpss`
  分离打击成分再测；仍不干净时上 Demucs 分离鼓轨——
  `uvx --from demucs demucs --two-stems=drums -n htdemucs bgm.mp3 -o analysis/`，
  之后 §1/§2 全部在 `drums.wav` 上跑
- BPM 拿不稳（多方法交叉验证）：madmom 的 RNN+DBN 和 Essentia 的
  RhythmExtractor2013 可作 librosa 之外的第二、第三票；三者对不齐时
  回 §3 用瞬态覆盖率投票，不猜
- 变速曲（DJ 转场、accelerando）：先用 librosa 局部 tempogram
  （约 5s 窗）确认变速点，再按能量段分段拟合，各段各自 t0/T
