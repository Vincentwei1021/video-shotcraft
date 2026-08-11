"""Mac 版剪映明文草稿安装模块（11.2 实测通过，2025-08）。

pyJianYingDraft 按 Windows 5.9 格式生成草稿；本模块补齐 Mac 版差异后装进
草稿库。三个差异点（均为本机逆向实测结论，见 smoke_test.py）：

1. 入口文件名是 draft_info.json（Windows 叫 draft_content.json）；
2. platform 字段要标 os=mac 并带机器指纹（从本机明文老草稿抄）；
3. draft_meta_info.json 的 draft_materials(type 0) 必须登记所有媒体文件，
   否则打开时弹"媒体丢失，请重新链接"；媒体放外部绝对路径即可。

新版剪映打开明文草稿后会自动升级并加密保存——单向转换，属预期行为。
"""

import json
import os
import shutil
import subprocess
import time
import uuid

DRAFT_ROOT = os.path.expanduser(
    "~/Movies/JianyingPro/User Data/Projects/com.lveditor.draft")
ROOT_META = os.path.join(DRAFT_ROOT, "root_meta_info.json")
# 本机一个仍为明文的老草稿，用来抄 device_id / hard_disk_id（平台指纹字段）
DONOR_DRAFT = os.path.join(DRAFT_ROOT, "2月8日")


def jianying_running() -> bool:
    out = subprocess.run(["pgrep", "-fl", "-i", "JianyingPro"],
                         capture_output=True, text=True).stdout
    return bool(out.strip())


def _mac_platform() -> dict:
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
    return platform


def _material_records(content: dict, now_us: int) -> list[dict]:
    """从 draft_content 的 materials 反推 Mac 版媒体池登记记录。"""
    records = []
    for kind, metetype in (("videos", None), ("audios", "music")):
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
                # 图片素材在 videos 组里 type=photo，登记也要跟着标 photo
                "metetype": metetype or ("photo" if m.get("type") == "photo"
                                         else "video"),
                "roughcut_time_range": {"duration": -1, "start": -1},
                "sub_time_range": {"duration": -1, "start": -1},
                "type": 0,
                "width": m.get("width", 0),
            })
    return records


def macify(draft_dir: str, draft_name: str) -> dict:
    """把 5.9/Windows 格式草稿补成 Mac 版认识的样子，返回注册所需信息。"""
    content_path = os.path.join(draft_dir, "draft_content.json")
    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)

    platform = _mac_platform()
    for key in ("platform", "last_modified_platform"):
        content[key] = {**content[key], **platform}

    # Mac 版入口文件名是 draft_info.json；draft_content.json 留着给 Windows 工具
    for p in (content_path, os.path.join(draft_dir, "draft_info.json")):
        with open(p, "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False)

    now_us = int(time.time() * 1_000_000)
    records = _material_records(content, now_us)
    materials_size = 0
    for path in {r["file_Path"] for r in records}:
        if os.path.exists(path):
            materials_size += os.path.getsize(path)

    meta_path = os.path.join(draft_dir, "draft_meta_info.json")
    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)
    fold_path = os.path.join(DRAFT_ROOT, draft_name)
    meta.update({
        "draft_fold_path": fold_path,
        "draft_root_path": DRAFT_ROOT,
        "draft_name": draft_name,
        "tm_draft_create": now_us,
        "tm_draft_modified": now_us,
        "tm_duration": content["duration"],
        "draft_timeline_materials_size_": materials_size,
    })
    meta.pop("draft_is_ai_translate", None)
    for group in meta.get("draft_materials", []):
        if group.get("type") == 0:
            group["value"] = records
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False)

    # 封面：从第一个视频素材抽首帧（缺封面时草稿列表显示异常）
    videos = content["materials"].get("videos", [])
    if videos:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                        "-i", videos[0]["path"], "-frames:v", "1",
                        os.path.join(draft_dir, "draft_cover.jpg")],
                       check=False)

    return {
        "draft_id": meta.get("draft_id") or str(uuid.uuid4()).upper(),
        "fold_path": fold_path,
        "duration": content["duration"],
        "materials_size": materials_size,
        "tm": now_us,
    }


def _registry_entry(info: dict, draft_name: str) -> dict:
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
        "draft_name": draft_name,
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


def _backup_registry() -> str:
    bak = ROOT_META + time.strftime(".%Y%m%d-%H%M%S.bak")
    shutil.copy2(ROOT_META, bak)
    return bak


def install(draft_dir: str, draft_name: str, info: dict) -> str:
    """把 macify 过的草稿目录装进草稿库并注册，返回注册表备份路径。"""
    if jianying_running():
        raise RuntimeError("剪映正在运行，请先完全退出（Cmd+Q）再执行")
    target = os.path.join(DRAFT_ROOT, draft_name)
    if os.path.exists(target):
        shutil.rmtree(target)
    shutil.move(draft_dir, target)

    bak = _backup_registry()
    with open(ROOT_META, encoding="utf-8") as f:
        root = json.load(f)
    root["all_draft_store"] = [e for e in root["all_draft_store"]
                               if e.get("draft_name") != draft_name]
    root["all_draft_store"].insert(0, _registry_entry(info, draft_name))
    with open(ROOT_META, "w", encoding="utf-8") as f:
        json.dump(root, f, ensure_ascii=False)
    return bak


def uninstall(draft_name: str) -> None:
    """删除指定草稿并从注册表移除（只动该条目，不回滚其他改动）。"""
    if jianying_running():
        raise RuntimeError("剪映正在运行，请先完全退出（Cmd+Q）再执行")
    _backup_registry()
    with open(ROOT_META, encoding="utf-8") as f:
        root = json.load(f)
    root["all_draft_store"] = [e for e in root["all_draft_store"]
                               if e.get("draft_name") != draft_name]
    with open(ROOT_META, "w", encoding="utf-8") as f:
        json.dump(root, f, ensure_ascii=False)
    target = os.path.join(DRAFT_ROOT, draft_name)
    if os.path.exists(target):
        shutil.rmtree(target)
