"""Mac 版剪映明文草稿安装模块（11.2 实测通过，2025-08）。

pyJianYingDraft 按 Windows 5.9 格式生成草稿；本模块补齐 Mac 版差异后装进
草稿库。三个差异点（均为本机逆向实测结论，见 smoke_test.py）：

1. 入口文件名是 draft_info.json（Windows 叫 draft_content.json）；
2. platform 字段要标 os=mac 并带机器指纹（从本机明文老草稿自动扫描获取）；
3. draft_meta_info.json 的 draft_materials(type 0) 必须登记所有媒体，且
   剪映是沙盒应用（com.lemon.lvpro），媒体必须打包进草稿 Resources/，
   否则报"暂无访问权限"。

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


def jianying_running() -> bool:
    out = subprocess.run(["pgrep", "-fl", "-i", "JianyingPro"],
                         capture_output=True, text=True).stdout
    return bool(out.strip())


def _validate_draft_name(draft_name: str) -> str:
    """校验草稿名并返回解析后的目标路径。

    install/uninstall 会对目标路径 rmtree/rename，草稿名含路径分隔符或
    `..` 时会逃逸草稿根目录（任意目录删除），必须拒绝。
    """
    if (not draft_name or draft_name in (".", "..")
            or "/" in draft_name or "\\" in draft_name
            or os.path.isabs(draft_name)):
        raise ValueError(
            f"非法草稿名 {draft_name!r}：不能为空、含路径分隔符或为绝对路径")
    target = os.path.realpath(os.path.join(DRAFT_ROOT, draft_name))
    if os.path.dirname(target) != os.path.realpath(DRAFT_ROOT):
        raise ValueError(f"草稿名 {draft_name!r} 解析后逃逸草稿根目录：{target}")
    return os.path.join(DRAFT_ROOT, draft_name)


def _write_json_atomic(path: str, obj: dict) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    os.replace(tmp, path)


def _load_platform(draft_dir: str) -> dict | None:
    """从一个明文草稿读 platform 机器指纹；读不到返回 None。"""
    try:
        with open(os.path.join(draft_dir, "draft_info.json"),
                  encoding="utf-8") as f:
            platform = json.load(f).get("platform", {})
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return None
    if isinstance(platform, dict) and platform.get("device_id") \
            and platform.get("os") == "mac":
        return {k: platform[k] for k in
                ("os", "app_version", "device_id", "hard_disk_id",
                 "mac_address") if k in platform}
    return None


def _mac_platform(donor_draft: str | None = None) -> dict:
    """取 Mac 平台指纹：显式 donor > 自动扫描草稿库里的明文老草稿。

    剪映 6+ 的草稿保存后加密，但更早创建、未再打开过的草稿仍是明文，
    可从中抄本机 device_id / hard_disk_id。
    """
    if donor_draft:
        platform = _load_platform(donor_draft)
        if platform is None:
            raise ValueError(
                f"指定的 donor 草稿不可用（非明文或缺 device_id）：{donor_draft}")
        return platform
    try:
        entries = sorted(os.listdir(DRAFT_ROOT))
    except OSError:
        entries = []
    for name in entries:
        platform = _load_platform(os.path.join(DRAFT_ROOT, name))
        if platform:
            return platform
    print("[warn] 草稿库中未找到明文老草稿，platform 将缺少机器指纹"
          "（device_id 等）——此情形未经实测，若剪映拒载请用 donor_draft "
          "参数指定一个明文草稿")
    return {"os": "mac", "app_version": "5.4.0"}


def _bundle_media(content: dict, draft_dir: str, draft_name: str) -> int:
    """把所有媒体拷进草稿目录 Resources/ 并改写素材路径，返回总字节数。

    剪映 Mac 版是沙盒应用（com.lemon.lvpro），只能访问 ~/Movies（容器软链）
    和用户经文件选择器授权过的路径；引用草稿目录外的媒体会报"暂无访问权限"
    （实测 2025-08）。打包进草稿目录一劳永逸，草稿也因此自包含。
    """
    res_dir = os.path.join(draft_dir, "Resources")
    os.makedirs(res_dir, exist_ok=True)
    final_base = os.path.join(DRAFT_ROOT, draft_name, "Resources")
    mapping: dict[str, str] = {}
    used: set[str] = set()
    total_size = 0
    for kind in ("videos", "audios"):
        for m in content["materials"].get(kind, []):
            src = m["path"]
            if src not in mapping:
                name = os.path.basename(src)
                if name in used:  # 不同目录同名文件防碰撞
                    name = f"{len(used)}-{name}"
                used.add(name)
                shutil.copy2(src, os.path.join(res_dir, name))
                total_size += os.path.getsize(src)
                mapping[src] = os.path.join(final_base, name)
            m["path"] = mapping[src]
    return total_size


def _material_records(content: dict, now_us: int) -> list[dict]:
    """从 draft_content 的 materials 反推 Mac 版媒体池登记记录。

    缺登记时打开草稿会弹"媒体丢失，请重新链接"（实测 2025-08）。"""
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


def macify(draft_dir: str, draft_name: str, bundle_media: bool = True,
           donor_draft: str | None = None) -> dict:
    """把 5.9/Windows 格式草稿补成 Mac 版认识的样子，返回注册所需信息。"""
    _validate_draft_name(draft_name)
    content_path = os.path.join(draft_dir, "draft_content.json")
    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)

    bundled_size = None
    if bundle_media:
        bundled_size = _bundle_media(content, draft_dir, draft_name)

    platform = _mac_platform(donor_draft)
    for key in ("platform", "last_modified_platform"):
        content[key] = {**content[key], **platform}

    # Mac 版入口文件名是 draft_info.json；draft_content.json 留着给 Windows 工具
    for p in (content_path, os.path.join(draft_dir, "draft_info.json")):
        with open(p, "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False)

    now_us = int(time.time() * 1_000_000)
    records = _material_records(content, now_us)
    if bundled_size is not None:
        materials_size = bundled_size
    else:  # 未打包：素材路径就是原位置，直接量
        materials_size = sum(
            os.path.getsize(p) for p in {r["file_Path"] for r in records}
            if os.path.exists(p))

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

    # 封面：从第一个视频素材抽首帧（缺封面时草稿列表显示异常）。
    # 打包模式下素材路径已指向安装后的最终位置，抽帧要用暂存目录里的副本
    videos = content["materials"].get("videos", [])
    if videos:
        cover_src = videos[0]["path"]
        if bundle_media:
            cover_src = os.path.join(draft_dir, "Resources",
                                     os.path.basename(cover_src))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                        "-i", cover_src, "-frames:v", "1",
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
    """把 macify 过的草稿目录装进草稿库并注册，返回注册表备份路径。

    顺序保证可回滚：先解析注册表并备份（未动现场就失败），旧草稿改名
    保留而非直接删除，注册表原子写入；任何一步失败都恢复旧草稿和注册表，
    新草稿退回暂存目录。
    """
    if jianying_running():
        raise RuntimeError("剪映正在运行，请先完全退出（Cmd+Q）再执行")
    target = _validate_draft_name(draft_name)

    # 1) 先读并解析注册表——JSON 损坏时在动任何现场之前就失败
    with open(ROOT_META, encoding="utf-8") as f:
        root = json.load(f)
    # 2) 备份注册表
    bak = _backup_registry()
    # 3) 旧草稿改名保留，成功后才清理
    old = None
    if os.path.exists(target):
        old = f"{target}.replaced-{time.strftime('%Y%m%d-%H%M%S')}"
        os.rename(target, old)
    try:
        shutil.move(draft_dir, target)
        root["all_draft_store"] = [e for e in root["all_draft_store"]
                                   if e.get("draft_name") != draft_name]
        root["all_draft_store"].insert(0, _registry_entry(info, draft_name))
        _write_json_atomic(ROOT_META, root)
    except BaseException:
        try:  # 回滚：新草稿退回暂存目录，旧草稿与注册表复位
            if os.path.exists(target):
                if os.path.exists(draft_dir):
                    shutil.rmtree(target, ignore_errors=True)
                else:
                    shutil.move(target, draft_dir)
            if old and os.path.exists(old):
                os.rename(old, target)
            shutil.copy2(bak, ROOT_META)
        finally:
            raise
    if old:
        shutil.rmtree(old, ignore_errors=True)
    return bak


def uninstall(draft_name: str) -> None:
    """删除指定草稿并从注册表移除（只动该条目，不回滚其他改动）。"""
    if jianying_running():
        raise RuntimeError("剪映正在运行，请先完全退出（Cmd+Q）再执行")
    target = _validate_draft_name(draft_name)
    with open(ROOT_META, encoding="utf-8") as f:
        root = json.load(f)
    _backup_registry()
    root["all_draft_store"] = [e for e in root["all_draft_store"]
                               if e.get("draft_name") != draft_name]
    _write_json_atomic(ROOT_META, root)
    if os.path.exists(target):
        shutil.rmtree(target)
