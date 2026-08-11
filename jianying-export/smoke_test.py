#!/usr/bin/env python3
"""烟雾测试：验证 Mac 版剪映（11.x）能否打开程序化生成的明文草稿。

原理：Mac 版剪映草稿入口是 draft_info.json（Windows 叫 draft_content.json），
新版保存时加密，但保留了读明文老草稿的兼容路径（本机 2024 年的草稿仍是明文
且可打开）。本脚本用 pyJianYingDraft 生成 5.9 格式草稿，改名并补齐 Mac 字段
后装进草稿库，最后把草稿注册进 root_meta_info.json（修改前自动备份）。

用法：
    .venv/bin/python smoke_test.py            # 生成 + 安装
    .venv/bin/python smoke_test.py --restore  # 回滚：删草稿并还原注册表备份
"""

import json
import os
import shutil
import subprocess
import sys
import time
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
STAGING = os.path.join(HERE, "staging")

DRAFT_NAME = "vs-smoke-test"
DRAFT_ROOT = os.path.expanduser(
    "~/Movies/JianyingPro/User Data/Projects/com.lveditor.draft")
ROOT_META = os.path.join(DRAFT_ROOT, "root_meta_info.json")
ROOT_META_BAK = os.path.join(DRAFT_ROOT, "root_meta_info.json.vs-smoke-bak")
# 本机一个仍为明文的老草稿，用来抄 device_id / hard_disk_id（平台指纹字段）
DONOR_DRAFT = os.path.join(DRAFT_ROOT, "2月8日")

VIDEO = os.path.join(REPO, "template/out/shotcraft-promo.mp4")
AUDIO = os.path.join(REPO, "assets/audio/sfx/transition/air-whoosh-powerful.mp3")


def die(msg: str) -> None:
    print(f"[abort] {msg}")
    sys.exit(1)


def jianying_running() -> bool:
    out = subprocess.run(["pgrep", "-fl", "-i", "JianyingPro"],
                         capture_output=True, text=True).stdout
    return bool(out.strip())


def generate() -> str:
    """用 pyJianYingDraft 在 staging 生成最小草稿，返回草稿目录。"""
    import pyJianYingDraft as draft
    from pyJianYingDraft import trange

    folder = draft.DraftFolder(STAGING)
    script = folder.create_draft(DRAFT_NAME, 1920, 1080, fps=30,
                                 allow_replace=True)
    script.append_track(draft.TrackSpec(draft.TrackType.video))
    script.append_track(draft.TrackSpec(draft.TrackType.audio))
    script.append_track(draft.TrackSpec(draft.TrackType.text))

    script.add_segment(draft.VideoSegment(VIDEO, trange("0s", "6s")))
    script.add_segment(draft.AudioSegment(AUDIO, trange("1s", "1.8s"),
                                          volume=0.6))
    script.add_segment(draft.TextSegment(
        "SMOKE TEST 烟雾测试", trange("0s", "4s"),
        style=draft.TextStyle(size=12.0, color=(0.9, 0.6, 0.2), align=1)))
    script.save()
    return os.path.join(STAGING, DRAFT_NAME)


def macify(draft_dir: str) -> dict:
    """把 5.9/Windows 格式草稿补成 Mac 版认识的样子，返回注册所需信息。"""
    content_path = os.path.join(draft_dir, "draft_content.json")
    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)

    # 平台字段：Mac 版草稿标 os=mac 并带机器指纹，从本机明文老草稿抄
    platform = {"os": "mac", "app_version": "5.4.0"}
    donor_info = os.path.join(DONOR_DRAFT, "draft_info.json")
    if os.path.exists(donor_info):
        try:
            with open(donor_info, encoding="utf-8") as f:
                donor = json.load(f).get("platform", {})
            if isinstance(donor, dict) and "device_id" in donor:
                platform = {k: donor[k] for k in
                            ("os", "app_version", "device_id", "hard_disk_id",
                             "mac_address") if k in donor}
        except (json.JSONDecodeError, OSError):
            pass  # 老草稿已被剪映加密/迁移时退回默认值
    for key in ("platform", "last_modified_platform"):
        content[key] = {**content[key], **platform}

    # Mac 版入口文件名是 draft_info.json；draft_content.json 留着给 Windows 工具
    info_path = os.path.join(draft_dir, "draft_info.json")
    for p in (content_path, info_path):
        with open(p, "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False)

    # 补齐 meta 里 Mac 版有而生成版缺的字段
    meta_path = os.path.join(draft_dir, "draft_meta_info.json")
    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)
    now_us = int(time.time() * 1_000_000)

    # 素材登记：Mac 版靠 meta 的 draft_materials(type 0) 管理媒体池，缺record
    # 就会弹"媒体丢失，请重新链接"（实测 2025-08）。按老草稿 schema 补齐。
    records = []
    for kind, metetype in (("videos", "video"), ("audios", "music")):
        for m in content["materials"].get(kind, []):
            records.append({
                "create_time": now_us // 1_000_000,
                "duration": m["duration"],
                "extra_info": (m.get("material_name") or m.get("name")
                               or os.path.basename(m["path"])),
                "file_Path": m["path"],
                "height": m.get("height", 0),
                "id": str(uuid.uuid4()),
                "import_time": now_us // 1_000_000,
                "import_time_ms": now_us,
                "item_source": 1,
                "md5": "",
                "metetype": metetype,
                "roughcut_time_range": {"duration": -1, "start": -1},
                "sub_time_range": {"duration": -1, "start": -1},
                "type": 0,
                "width": m.get("width", 0),
            })
    for group in meta.get("draft_materials", []):
        if group.get("type") == 0:
            group["value"] = records
    fold_path = os.path.join(DRAFT_ROOT, DRAFT_NAME)
    materials_size = sum(os.path.getsize(p) for p in (VIDEO, AUDIO))
    meta.update({
        "draft_fold_path": fold_path,
        "draft_root_path": DRAFT_ROOT,
        "draft_name": DRAFT_NAME,
        "tm_draft_create": now_us,
        "tm_draft_modified": now_us,
        "tm_duration": content["duration"],
        "draft_timeline_materials_size_": materials_size,
    })
    meta.pop("draft_is_ai_translate", None)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False)

    # 封面（缺封面时草稿列表可能显示异常），从视频第一帧抽
    cover = os.path.join(draft_dir, "draft_cover.jpg")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", VIDEO,
                    "-frames:v", "1", cover], check=False)

    return {
        "draft_id": meta.get("draft_id") or str(uuid.uuid4()).upper(),
        "fold_path": fold_path,
        "duration": content["duration"],
        "materials_size": materials_size,
        "tm": now_us,
    }


def registry_entry(info: dict) -> dict:
    """按本机 root_meta_info.json 实测 schema 构造注册条目。"""
    return {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cloud_last_action_download": False,
        "draft_cloud_purchase_info": "",
        "draft_cloud_template_id": "",
        "draft_cloud_tutorial_info": "",
        "draft_cloud_videocut_purchase_info": "",
        "draft_cover": os.path.join(info["fold_path"], "draft_cover.jpg"),
        "draft_fold_path": info["fold_path"],
        "draft_id": info["draft_id"],
        "draft_is_ai_shorts": False,
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_is_pippit_draft": False,
        "draft_is_web_article_video": False,
        "draft_json_file": os.path.join(info["fold_path"], "draft_info.json"),
        "draft_name": DRAFT_NAME,
        "draft_new_version": "",
        "draft_root_path": DRAFT_ROOT,
        "draft_timeline_materials_size": info["materials_size"],
        "draft_type": "",
        "draft_web_article_video_enter_from": "",
        "pippit_avatar_url": "",
        "pippit_extra_info": "",
        "pippit_id": "",
        "pippit_user_name": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_cloud_completed": "",
        "tm_draft_cloud_entry_id": -1,
        "tm_draft_cloud_modified": 0,
        "tm_draft_cloud_parent_entry_id": -1,
        "tm_draft_cloud_space_id": -1,
        "tm_draft_cloud_user_id": -1,
        "tm_draft_create": info["tm"],
        "tm_draft_modified": info["tm"],
        "tm_draft_removed": 0,
        "tm_duration": info["duration"],
    }


def install(draft_dir: str, info: dict) -> None:
    target = os.path.join(DRAFT_ROOT, DRAFT_NAME)
    if os.path.exists(target):
        shutil.rmtree(target)
    shutil.move(draft_dir, target)

    if not os.path.exists(ROOT_META_BAK):
        shutil.copy2(ROOT_META, ROOT_META_BAK)
    with open(ROOT_META, encoding="utf-8") as f:
        root = json.load(f)
    root["all_draft_store"] = (
        [e for e in root["all_draft_store"] if e.get("draft_name") != DRAFT_NAME])
    root["all_draft_store"].insert(0, registry_entry(info))
    with open(ROOT_META, "w", encoding="utf-8") as f:
        json.dump(root, f, ensure_ascii=False)


def restore() -> None:
    if os.path.exists(ROOT_META_BAK):
        shutil.copy2(ROOT_META_BAK, ROOT_META)
        os.remove(ROOT_META_BAK)
        print("[ok] 注册表已还原")
    target = os.path.join(DRAFT_ROOT, DRAFT_NAME)
    if os.path.exists(target):
        shutil.rmtree(target)
        print("[ok] 测试草稿已删除")


def main() -> None:
    if jianying_running():
        die("剪映正在运行，请先完全退出（Cmd+Q）再执行，否则注册表会被覆盖")
    if "--restore" in sys.argv:
        restore()
        return
    for p in (VIDEO, AUDIO, DRAFT_ROOT):
        if not os.path.exists(p):
            die(f"缺少：{p}")
    draft_dir = generate()
    info = macify(draft_dir)
    install(draft_dir, info)
    print(f"[ok] 草稿已安装：{os.path.join(DRAFT_ROOT, DRAFT_NAME)}")
    print(f"[ok] 注册表备份：{ROOT_META_BAK}")
    print("现在打开剪映，检查草稿列表里的 vs-smoke-test：")
    print("  1. 能否正常打开（不报“内容已损坏”）")
    print("  2. 视频/音频/文字三条轨道是否都在")
    print("  3. 文字能否直接改内容、字号、颜色")


if __name__ == "__main__":
    main()
