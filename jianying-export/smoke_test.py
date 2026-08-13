#!/usr/bin/env python3
"""烟雾测试：验证本机 Mac 剪映能否打开程序化生成的明文草稿。

新机器或新剪映版本先跑这个，确认打开无"内容已损坏"、无"媒体丢失"、
无"暂无访问权限"，再做正片导出（references/jianying-export.md）。

生成一个最小三轨草稿（ffmpeg 合成的 6s 测试视频 + 库内音效 + 一条文字），
走 mac_draft 的完整安装链路（macify 适配 / 媒体打包进 Resources/ /
注册表注册）——测的就是正片会用的那条路径。

用法：
    .venv/bin/python smoke_test.py            # 生成 + 安装
    .venv/bin/python smoke_test.py --restore  # 删除测试草稿（含注册表条目）
"""

import os
import subprocess
import sys

import pyJianYingDraft as draft
from pyJianYingDraft import trange

import mac_draft

DRAFT_NAME = "vs-smoke-test"
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
STAGING = os.path.join(HERE, "staging")
# 音效用 git 内资产；视频不依赖渲染产物（template/out 不进 git），现场合成
AUDIO = os.path.join(REPO, "assets/audio/sfx/transition/air-whoosh-powerful.mp3")
TEST_CLIP = os.path.join(STAGING, "smoke-clip.mp4")


def make_clip() -> None:
    os.makedirs(STAGING, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "testsrc2=duration=6:size=1920x1080:rate=30",
         "-pix_fmt", "yuv420p", TEST_CLIP], check=True)


def build() -> str:
    folder = draft.DraftFolder(STAGING)
    script = folder.create_draft(DRAFT_NAME, 1920, 1080, fps=30,
                                 allow_replace=True)
    script.append_track(draft.TrackSpec(draft.TrackType.video))
    script.append_track(draft.TrackSpec(draft.TrackType.audio))
    script.append_track(draft.TrackSpec(draft.TrackType.text))

    script.add_segment(draft.VideoSegment(TEST_CLIP, trange("0s", "6s")))
    mat = draft.AudioMaterial(AUDIO)
    script.add_segment(draft.AudioSegment(
        mat, draft.Timerange(1_000_000, min(mat.duration, 1_500_000)),
        volume=0.6))
    script.add_segment(draft.TextSegment(
        "SMOKE TEST 烟雾测试", trange("0s", "4s"),
        style=draft.TextStyle(size=6.0, color=(0.9, 0.6, 0.2), align=1)))
    script.save()
    return os.path.join(STAGING, DRAFT_NAME)


def main() -> None:
    if "--restore" in sys.argv:
        mac_draft.uninstall(DRAFT_NAME)
        print(f"[ok] 已移除测试草稿 {DRAFT_NAME}")
        return
    if not os.path.exists(AUDIO):
        print(f"[abort] 缺少音效资产：{AUDIO}")
        sys.exit(1)
    make_clip()
    draft_dir = build()
    info = mac_draft.macify(draft_dir, DRAFT_NAME)
    bak = mac_draft.install(draft_dir, DRAFT_NAME, info)
    print(f"[ok] 草稿已安装：{info['fold_path']}")
    print(f"[ok] 注册表备份：{bak}")
    print("现在打开剪映，检查草稿列表里的 vs-smoke-test：")
    print("  1. 能否正常打开（不报“内容已损坏”/“媒体丢失”/“暂无访问权限”）")
    print("  2. 视频/音频/文字三条轨道是否都在")
    print("  3. 文字能否直接改内容、字号、颜色")


if __name__ == "__main__":
    main()
