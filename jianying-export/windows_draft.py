"""Windows 版剪映草稿安装模块。

⚠️ 未在 Windows 真机验证——按 pyJianYingDraft 官方支持路径实现（上游在
剪映专业版 5.9 与 10.8 实测通过生成方向的全部功能）。首次使用先跑一个
最小草稿验证（参考 references/jianying-export.md 的冒烟测试一节）。

Windows 版比 Mac 版（mac_draft.py）简单得多，三个 Mac 坑都不存在：
- 入口文件名就是 draft_content.json（pyJianYingDraft 原生输出，无需改名）；
- 没有 root_meta_info.json 注册表，剪映自行扫描草稿根目录——新草稿不出现
  时进入再退出任一已有草稿，或重启剪映刷新列表；替换/卸载的待删目录放在
  草稿根的 .vs-export-trash/ 下（嵌套一层，扫描不会认成幽灵草稿）；
- 非沙盒应用，可引用任意绝对路径的媒体。bundle_media 仍默认开启：草稿
  自包含后可整目录迁移，也避免原始素材被移动后报"媒体丢失"。

新版剪映打开明文草稿后同样会升级保存——单向转换，重导出即重装覆盖。
"""

import json
import os
import shutil
import subprocess
import time
import unicodedata


def default_draft_root() -> str:
    """剪映专业版 Windows 默认草稿根目录；用户改过草稿位置时以剪映
    `全局设置-草稿位置` 里的实际路径为准，作为参数传入 install()。"""
    for candidate in (
        os.path.expandvars(
            r"%LOCALAPPDATA%\JianyingPro\User Data\Projects\com.lveditor.draft"),
        os.path.expanduser(r"~\JianyingPro Drafts"),
    ):
        if os.path.isdir(candidate):
            return candidate
    raise FileNotFoundError(
        "未找到剪映草稿根目录，请在剪映`全局设置-草稿位置`查询后显式传入")


def jianying_running() -> bool:
    out = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq JianyingPro.exe", "/NH"],
        capture_output=True, text=True).stdout
    return "JianyingPro" in out


def _validate_draft_name(draft_name: str, root: str) -> str:
    """校验草稿名并返回目标路径。

    install/uninstall 会对目标路径 rmtree/rename，草稿名含路径分隔符、
    盘符或 `..` 时会逃逸草稿根目录（任意目录删除），必须拒绝。
    """
    if (not draft_name or draft_name in (".", "..")
            or "/" in draft_name or "\\" in draft_name or ":" in draft_name
            or os.path.isabs(draft_name)):
        raise ValueError(
            f"非法草稿名 {draft_name!r}：不能为空、含路径分隔符或为绝对路径")
    target = os.path.realpath(os.path.join(root, draft_name))
    if os.path.dirname(target) != os.path.realpath(root):
        raise ValueError(f"草稿名 {draft_name!r} 解析后逃逸草稿根目录：{target}")
    return os.path.join(root, draft_name)


def _write_json_atomic(path: str, obj: dict) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    os.replace(tmp, path)


def _trash_dir(root: str) -> str:
    """替换/卸载的待删目录统一放这里。剪映按 <草稿根>/<目录>/
    draft_content.json 识别草稿，嵌套一层不会被扫成幽灵草稿；
    同一文件系统内 rename 保持原子。"""
    d = os.path.join(root, ".vs-export-trash")
    os.makedirs(d, exist_ok=True)
    return d


def _name_key(name: str) -> str:
    """文件名占用键：Unicode 规范化 + casefold。NTFS 默认不区分大小写，
    clip.mp4 与 CLIP.mp4 是同一个文件。"""
    return unicodedata.normalize("NFC", name).casefold()


def _unique_name(name: str, used_keys: set) -> str:
    """生成占用键唯一的文件名（循环递增后缀，不会二次碰撞）。"""
    if _name_key(name) not in used_keys:
        return name
    stem, ext = os.path.splitext(name)
    i = 2
    while _name_key(f"{stem}-{i}{ext}") in used_keys:
        i += 1
    return f"{stem}-{i}{ext}"


def bundle_media(draft_dir: str, draft_name: str, draft_root: str) -> None:
    """把所有媒体拷进草稿目录 Resources/ 并改写素材路径（原子写回）。"""
    content_path = os.path.join(draft_dir, "draft_content.json")
    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)

    res_dir = os.path.join(draft_dir, "Resources")
    os.makedirs(res_dir, exist_ok=True)
    final_base = os.path.join(draft_root, draft_name, "Resources")
    mapping: dict[str, str] = {}
    used_keys: set[str] = set()
    for kind in ("videos", "audios"):
        for m in content["materials"].get(kind, []):
            src = m["path"]
            if src.startswith(final_base + os.sep):
                # 重试场景：路径已是最终位置——暂存副本还在就视为已打包
                local = os.path.join(res_dir, os.path.basename(src))
                if not os.path.exists(local):
                    raise FileNotFoundError(
                        f"素材指向未安装的最终位置且暂存副本缺失：{src}")
                used_keys.add(_name_key(os.path.basename(src)))
                continue
            if src not in mapping:
                name = _unique_name(os.path.basename(src), used_keys)
                used_keys.add(_name_key(name))
                shutil.copy2(src, os.path.join(res_dir, name))
                mapping[src] = os.path.join(final_base, name)
            m["path"] = mapping[src]

    _write_json_atomic(content_path, content)


def install(draft_dir: str, draft_name: str, draft_root: str | None = None,
            bundle: bool = True) -> str:
    """把 pyJianYingDraft 生成的草稿目录装进 Windows 剪映草稿库。

    旧草稿先移入回收目录保留，安装成功后才清理；失败时旧草稿复位、
    新草稿退回暂存目录。清理失败会提示路径而不是静默吞掉。
    """
    if jianying_running():
        raise RuntimeError("剪映正在运行，请先完全退出再执行")
    root = draft_root or default_draft_root()
    target = _validate_draft_name(draft_name, root)
    if bundle:
        bundle_media(draft_dir, draft_name, root)
    old = None
    if os.path.exists(target):
        old = os.path.join(
            _trash_dir(root),
            f"{draft_name}.replaced-{time.strftime('%Y%m%d-%H%M%S')}")
        os.rename(target, old)
    try:
        shutil.move(draft_dir, target)
    except BaseException:
        try:  # 回滚：新草稿退回暂存目录，旧草稿复位
            if os.path.exists(target):
                if os.path.exists(draft_dir):
                    shutil.rmtree(target, ignore_errors=True)
                else:
                    shutil.move(target, draft_dir)
            if old and os.path.exists(old):
                os.rename(old, target)
        finally:
            raise
    if old:
        try:
            shutil.rmtree(old)
        except OSError as e:
            print(f"[warn] 旧草稿副本删除失败（位于回收目录，不会被剪映"
                  f"扫描到），请手动清理：{old}（{e}）")
    return target


def uninstall(draft_name: str, draft_root: str | None = None) -> None:
    """删除指定草稿。先移入回收目录再删：删除中途失败的残留不会被剪映
    扫描成幽灵草稿，目标名立即可复用，提示手动清理。"""
    if jianying_running():
        raise RuntimeError("剪映正在运行，请先完全退出再执行")
    root = draft_root or default_draft_root()
    target = _validate_draft_name(draft_name, root)
    if not os.path.exists(target):
        return
    tmp = os.path.join(
        _trash_dir(root),
        f"{draft_name}.uninstall-{time.strftime('%Y%m%d-%H%M%S')}")
    os.rename(target, tmp)
    try:
        shutil.rmtree(tmp)
    except OSError as e:
        print(f"[warn] 残留在回收目录（不会被剪映扫描到），"
              f"请手动清理：{tmp}（{e}）")
