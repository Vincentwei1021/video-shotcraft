#!/usr/bin/env python3
"""把 synapse-promo-v2 导出为 Mac 剪映工程。

分层方案（与用户确认的可编辑范围一致）：
- 视频轨：无字幕无声底片（plate.mp4，由 --props plate:true 渲出）按 10 个
  镜头边界切段——每段可在剪映里单独变速/重排/调色；
- 文本轨 x2：7 段双语字幕（中文/英文各一轨）重建为剪映原生文本，内容、
  字号、颜色全可编辑；字号和位置是首版近似值，可在剪映里微调；
- 音频轨 x2：8 个 SFX 按 Root.tsx 钉帧表摆放（峰值对拍；剪映按位播放，
  不需要 Remotion 的 4 帧起播补偿）+ BGM 一段；
- S1 英文标语与 S12 logo 收束是品牌动效，保持烘焙在底片里。

时间线数据与 synapse-promo-v2/src/theme.ts、Root.tsx 逐项对应，
拍号网格 beatF 在此精确复算。

用法：
    .venv/bin/python export_synapse_v2.py              # 生成 + 安装
    .venv/bin/python export_synapse_v2.py --uninstall  # 移除该草稿
"""

import os
import sys

import pyJianYingDraft as draft

import mac_draft

DRAFT_NAME = "synapse-promo-v2"
HERE = os.path.dirname(os.path.abspath(__file__))
STAGING = os.path.join(HERE, "staging")
V2 = os.path.expanduser("~/personal/synapse-promo-v2")
PLATE = os.path.join(V2, "out", "plate.mp4")
SFX_DIR = os.path.join(V2, "public", "audio", "sfx")
BGM = os.path.join(V2, "public", "audio", "bgm.mp3")

# ---- 拍号网格与镜头表（=== src/theme.ts）----
FPS = 30
BEAT0, BEAT_T = 0.0538, 0.47609
TOTAL_F = 997


def beatF(n: float) -> int:
    return round((BEAT0 + n * BEAT_T) * FPS)


def f2us(f: float) -> int:
    return round(f * 1_000_000 / FPS)


SHOTS = [  # (镜头名, from 帧, to 帧)
    ("s1_wave", 0, beatF(8)),
    ("s2_ring", beatF(8), 163),
    ("sm_card", 163, beatF(16)),  # 起飞帧钉 5.735s 真实瞬态，非整拍
    ("s3_stack", beatF(16), beatF(24)),
    ("s4_bezier", beatF(24), beatF(32)),
    ("s6_hatch", beatF(32), beatF(40)),
    ("s7_doc", beatF(40), beatF(46)),
    ("s8_picker", beatF(46), beatF(52)),
    ("s10_pills", beatF(52), beatF(60)),
    ("s12_logo", beatF(60), TOTAL_F),
]

# ---- 字幕表（=== 各镜头的 BilingualCap；s2+sm 同文案合并为一段）----
CAPTIONS = [  # (中文, 英文, from 帧, to 帧)
    ("你的全部研究资产", "Projects · Papers · Experiments · Agents",
     beatF(8), beatF(16)),
    ("研究记忆持久沉淀", "Research memory, persisted", beatF(16), beatF(24)),
    ("所有上下文，汇入研究记忆", "One research memory", beatF(24), beatF(32)),
    ("全生命周期，实时可观测", "Full lifecycle, fully observable",
     beatF(32), beatF(40)),
    ("报告自动生成", "Reports, generated", beatF(40), beatF(46)),
    ("管理研究每一步", "Every stage, orchestrated", beatF(46), beatF(52)),
    ("一站式科研工作台", "Experiments · Observability · Papers · Compute",
     beatF(52), beatF(60)),
]

# ---- SFX 钉帧表（=== Root.tsx；start = beatF(n) - peak，无 4 帧补偿）----
SFX = [  # (文件, 目标拍, 文件内峰值秒, 音量)
    ("bass-hit-short.mp3", 4, 0.14, 0.45),
    ("riser-cine.mp3", 8, 1.12, 0.28),
    ("impact-deep-whoosh.mp3", 12.04, 0.5, 0.5),
    ("switch-tap.mp3", 16, 0.02, 0.45),
    ("impact-cine-big.mp3", 28, 2.0, 0.5),
    ("pop.mp3", 46, 0.04, 0.4),
    ("stardust-swish.mp3", 60, 0.98, 0.5),
    ("sparkle.mp3", 64, 1.18, 0.6),
]
BGM_VOLUME = 0.72

# ---- 字幕样式（近似 BilingualCap：底部居中白底 scrim，中文大英文小）----
INK = (0.173, 0.173, 0.173)  # #2C2C2C
ZH_STYLE = dict(
    style=draft.TextStyle(size=15.0, bold=True, color=INK, align=1),
    background=draft.TextBackground(color="#FFFFFF", alpha=0.82,
                                    round_radius=0.35),
    clip_settings=draft.ClipSettings(transform_y=-0.70),
)
EN_STYLE = dict(
    style=draft.TextStyle(size=10.0, color=INK, alpha=0.65, align=1),
    background=draft.TextBackground(color="#FFFFFF", alpha=0.82,
                                    round_radius=0.35),
    clip_settings=draft.ClipSettings(transform_y=-0.84),
)


def build() -> str:
    folder = draft.DraftFolder(STAGING)
    script = folder.create_draft(DRAFT_NAME, 1920, 1080, fps=FPS,
                                 allow_replace=True)
    script.append_track(draft.TrackSpec(draft.TrackType.video, name="底片"))
    script.append_track(draft.TrackSpec(draft.TrackType.audio, name="BGM"))
    script.append_track(draft.TrackSpec(draft.TrackType.text, name="字幕EN"))
    script.append_track(draft.TrackSpec(draft.TrackType.text, name="字幕ZH"))

    plate = draft.VideoMaterial(PLATE)
    for _name, f0, f1 in SHOTS:
        # 起点/终点各自取整再相减：起点+时长分别取整会产生 1µs 级缝隙/重叠
        rng = draft.Timerange(f2us(f0), f2us(f1) - f2us(f0))
        script.add_segment(
            draft.VideoSegment(plate, rng, source_timerange=rng), "底片")

    # SFX：Remotion 里重叠音频自动混音，剪映同轨不允许重叠 → 贪心分道
    sfx_segs = []
    for file, beat, peak_sec, volume in SFX:
        mat = draft.AudioMaterial(os.path.join(SFX_DIR, file))
        start_f = max(0, beatF(beat) - round(peak_sec * FPS))
        # 与 Root.tsx 一致：impact 留 3.2s 混响尾，其余 2.5s 截断
        dur_us = min(f2us(96 if file.startswith("impact") else 75),
                     mat.duration, f2us(TOTAL_F - start_f))
        sfx_segs.append((f2us(start_f), dur_us, mat, volume))
    lanes: list[int] = []  # 每道当前占用到的结束时间
    placed = []
    for start, dur, mat, volume in sorted(sfx_segs):
        lane = next((i for i, end in enumerate(lanes) if end <= start),
                    len(lanes))
        if lane == len(lanes):
            lanes.append(0)
        lanes[lane] = start + dur
        placed.append((lane, start, dur, mat, volume))
    for i in range(len(lanes)):
        script.append_track(draft.TrackSpec(draft.TrackType.audio,
                                            name=f"SFX{i + 1}"))
    for lane, start, dur, mat, volume in placed:
        script.add_segment(
            draft.AudioSegment(mat, draft.Timerange(start, dur),
                               volume=volume), f"SFX{lane + 1}")

    bgm = draft.AudioMaterial(BGM)
    script.add_segment(
        draft.AudioSegment(bgm,
                           draft.Timerange(0, min(bgm.duration, f2us(TOTAL_F))),
                           volume=BGM_VOLUME), "BGM")

    for zh, en, f0, f1 in CAPTIONS:
        rng = draft.Timerange(f2us(f0), f2us(f1) - f2us(f0))
        script.add_segment(draft.TextSegment(zh, rng, **ZH_STYLE), "字幕ZH")
        script.add_segment(draft.TextSegment(en, rng, **EN_STYLE), "字幕EN")

    script.save()
    return os.path.join(STAGING, DRAFT_NAME)


def main() -> None:
    if "--uninstall" in sys.argv:
        mac_draft.uninstall(DRAFT_NAME)
        print(f"[ok] 已移除草稿 {DRAFT_NAME}")
        return
    for p in (PLATE, BGM, SFX_DIR):
        if not os.path.exists(p):
            print(f"[abort] 缺少 {p}（plate.mp4 需要先渲：npx remotion render "
                  "src/index.ts SynapsePromo out/plate.mp4 "
                  "--props='{\"bgm\":false,\"plate\":true}'）")
            sys.exit(1)
    draft_dir = build()
    info = mac_draft.macify(draft_dir, DRAFT_NAME)
    bak = mac_draft.install(draft_dir, DRAFT_NAME, info)
    total_s = f2us(TOTAL_F) / 1_000_000
    print(f"[ok] 草稿已安装：{info['fold_path']}")
    print(f"[ok] 时长 {total_s:.2f}s · 10 段底片 · {len(CAPTIONS)} 段双语字幕 · "
          f"{len(SFX)} 个 SFX + BGM")
    print(f"[ok] 注册表备份：{bak}")


if __name__ == "__main__":
    main()
