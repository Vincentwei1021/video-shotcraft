"""AiflPromo（template/ Ink Press 模板 demo 片，1085f @30fps）→ 剪映草稿。

时间线三张表逐条抄自 template/src/aifl/Main.tsx（AIFL_SHOTS / CAPTIONS /
SFX）。底片是 plate 渲染（无字幕无 SFX）：
  npx remotion render src/index.ts AiflPromo out/aifl-plate.mp4 --props='{"plate":true}'

用法：
  .venv/bin/python aifl_promo.py           # 只建到 staging/
  .venv/bin/python aifl_promo.py install   # 建 + macify + 装进剪映草稿库
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import pyJianYingDraft as draft
import mac_draft

FPS = 30
TOTAL_F = 1085
# 渲出成片的音轨整体比视频晚 ~1.28 帧，根因是输出编码链路的 AAC encoder
# priming（48kHz 典型 2048 samples；本片实测：对 aifl-ref.mp4 交叉相关
# click 2032 / impact 2066 samples，elst 未声明裁剪垫头；见
# references/sound-design.md §4.6），不是 <Audio>/Sequence.from 的行为。
# Main.tsx 的 SFX 表未做补偿、成片按此验收，剪映摆位 = from + 1 帧最接近
# 已验收成片的音画关系。换 Remotion 版本/codec/采样率/容器须重测。
AUDIO_LAG_F = 1

NAME = "InkPress-Demo"
STAGING = os.path.join(HERE, "staging")
TEMPLATE = os.path.normpath(os.path.join(HERE, "..", "template"))
PLATE = os.path.join(TEMPLATE, "out", "aifl-plate.mp4")
AUDIO_DIR = os.path.join(TEMPLATE, "public", "audio")


def f2us(f: int) -> int:
    return round(f * 1_000_000 / FPS)


# ── Main.tsx AIFL_SHOTS：(名称, from帧, to帧) ────────────────────────────
SHOTS = [
    ("morning", 0, 220),
    ("card1", 220, 275),
    ("table", 275, 465),
    ("macro", 465, 565),
    ("card2", 565, 620),
    ("chart", 620, 725),
    ("cardWbr", 725, 775),
    ("wbr", 775, 885),
    ("card3", 885, 940),
    ("outro", 940, 1085),
]

# ── Main.tsx CAPTIONS：(文案, from帧, to帧) ──────────────────────────────
CAPTIONS = [
    ("TEN LIVE PROJECTS · FOUR RESEARCHERS", 90, 130),
    ("NEW WORK LANDS ALL WEEK", 318, 362),
    ("SEARCH · FILTER · OPEN", 395, 450),
    ("EVERY QUESTION, TRACKED TO ITS EXPERIMENTS", 477, 545),
    ("THE DAILY PAPER RADAR", 633, 705),
    ("FOUR VOICES, ONE WEEKLY BRIEF", 789, 867),
]

# ── Main.tsx SFX：(from帧, 文件, 音量)；截断帧数按 Sequence duration ─────
SFX = [
    (12, "transition-soft.mp3", 0.4),
    (78, "whoosh-fast.mp3", 0.45),
    (127, "whoosh-big.mp3", 0.5),
    (141, "sparkle.mp3", 0.35),
    (204, "transition-snap.mp3", 0.5),
    (220, "swoosh-quick.mp3", 0.4),
    (277, "transition-soft.mp3", 0.4),
    (308, "whoosh-big.mp3", 0.5),
    (340, "whoosh-fast.mp3", 0.4),
    (356, "whoosh-fast.mp3", 0.32),
    (388, "whoosh-big.mp3", 0.5),
    (401, "keyboard.mp3", 0.4),
    (435, "whoosh-fast.mp3", 0.4),
    (451, "click-camera.mp3", 0.6),
    (455, "swoosh-quick.mp3", 0.35),
    (475, "transition-soft.mp3", 0.45),
    (565, "swoosh-quick.mp3", 0.4),
    (623, "transition-soft.mp3", 0.45),
    (648, "click-camera.mp3", 0.45),
    (725, "swoosh-quick.mp3", 0.4),
    (779, "transition-soft.mp3", 0.4),
    (781, "keyboard.mp3", 0.34),
    (840, "pop.mp3", 0.4),
    (845, "pop.mp3", 0.37),
    (850, "pop.mp3", 0.34),
    (855, "pop.mp3", 0.31),
    (860, "pop.mp3", 0.28),
    (865, "pop.mp3", 0.25),
    (885, "swoosh-quick.mp3", 0.4),
    (945, "riser-cine.mp3", 0.5),
    (980, "impact-cine.mp3", 0.55),
    (1005, "sparkle.mp3", 0.3),
]


def sfx_cap_frames(from_f: int, src: str) -> int:
    # Main.tsx: keyboard 24f（搜索框打字）/ 44f（周报书写），其余 90f 内播完
    if src == "keyboard.mp3":
        return 44 if from_f > 700 else 24
    return 90


# ── 字幕样式（Caption.tsx → 剪映近似换算，Mac 11.2 标定系数） ────────────
# CSS 22px ÷ 10.8 ≈ size 2.0；颜色 oklch(45% 0.006 82) ≈ #575552；
# 垂直位置 bottom:72 → 文字中心 y≈995 → transform_y = 1 − 995/540 ≈ −0.84
CAPTION_STYLE = dict(
    style=draft.TextStyle(size=2.0, color=(0.341, 0.333, 0.322),
                          align=1, letter_spacing=14),
    clip_settings=draft.ClipSettings(transform_y=-0.84),
)


def build() -> str:
    assert os.path.exists(PLATE), f"底片不存在：{PLATE}（先渲 plate）"
    folder = draft.DraftFolder(STAGING)
    script = folder.create_draft(NAME, 1920, 1080, fps=FPS, allow_replace=True)
    script.append_track(draft.TrackSpec(draft.TrackType.video, name="底片"))
    script.append_track(draft.TrackSpec(draft.TrackType.text, name="字幕"))

    # 底片按镜头切段：source=target 同区间，每段可在剪映单独变速/重排
    plate = draft.VideoMaterial(PLATE)
    for _name, f0, f1 in SHOTS:
        rng = draft.Timerange(f2us(f0), f2us(f1) - f2us(f0))
        script.add_segment(draft.VideoSegment(plate, rng, source_timerange=rng),
                           "底片")

    for text, f0, f1 in CAPTIONS:
        rng = draft.Timerange(f2us(f0), f2us(f1) - f2us(f0))
        script.add_segment(draft.TextSegment(text, rng, **CAPTION_STYLE), "字幕")

    # SFX：剪映同轨段不可重叠 → 贪心分道
    sfx_segs = []
    for from_f, src, volume in SFX:
        mat = draft.AudioMaterial(os.path.join(AUDIO_DIR, src))
        start_f = from_f + AUDIO_LAG_F
        dur_us = min(f2us(sfx_cap_frames(from_f, src)), mat.duration,
                     f2us(TOTAL_F) - f2us(start_f))
        sfx_segs.append((f2us(start_f), dur_us, mat, volume))
    lanes, placed = [], []
    for start, dur, mat, volume in sorted(sfx_segs, key=lambda s: s[0]):
        lane = next((i for i, end in enumerate(lanes) if end <= start), len(lanes))
        if lane == len(lanes):
            lanes.append(0)
        lanes[lane] = start + dur
        placed.append((lane, start, dur, mat, volume))
    for i in range(len(lanes)):
        script.append_track(draft.TrackSpec(draft.TrackType.audio, name=f"SFX{i + 1}"))
    for lane, start, dur, mat, volume in placed:
        script.add_segment(
            draft.AudioSegment(mat, draft.Timerange(start, dur), volume=volume),
            f"SFX{lane + 1}")

    script.save()
    n_segs = len(SHOTS) + len(CAPTIONS) + len(placed)
    print(f"staging 草稿已建：{os.path.join(STAGING, NAME)}")
    print(f"  轨道：底片1 + 字幕1 + SFX{len(lanes)}；段：{n_segs}"
          f"（镜头{len(SHOTS)} 字幕{len(CAPTIONS)} SFX{len(placed)}）")
    return os.path.join(STAGING, NAME)


if __name__ == "__main__":
    draft_dir = build()
    if "install" in sys.argv[1:]:
        info = mac_draft.macify(draft_dir, NAME)
        bak = mac_draft.install(draft_dir, NAME, info)
        print(f"已装进剪映草稿库：{NAME}（注册表备份：{bak}）")
