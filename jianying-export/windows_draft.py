"""Windows 版剪映草稿安装模块。

⚠️ 未在 Windows 真机验证——按 pyJianYingDraft 官方支持路径实现（上游在
剪映专业版 5.9 与 10.8 实测通过生成方向的全部功能）。首次使用先跑一个
最小草稿验证（参考 references/jianying-export.md 的冒烟测试一节）。

Windows 版比 Mac 版（mac_draft.py）简单得多，三个 Mac 坑都不存在：
- 入口文件名就是 draft_content.json（pyJianYingDraft 原生输出，无需改名）；
- 没有 root_meta_info.json 注册表，剪映自行扫描草稿根目录——新草稿不出现
  时进入再退出任一已有草稿，或重启剪映刷新列表；
- 非沙盒应用，可引用任意绝对路径的媒体。bundle_media 仍默认开启：草稿
  自包含后可整目录迁移，也避免原始素材被移动后报"媒体丢失"。

新版剪映打开明文草稿后同样会升级保存——单向转换，重导出即重装覆盖。
"""

import json
import os
import shutil
import subprocess
import time


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


def _unique_name(name: str, used: set) -> str:
    """在 used 集合内生成唯一文件名（循环递增后缀，不会二次碰撞）。"""
    if name not in used:
        return name
    stem, ext = os.path.splitext(name)
    i = 2
    while f"{stem}-{i}{ext}" in used:
        i += 1
    return f"{stem}-{i}{ext}"


def bundle_media(draft_dir: str, draft_name: str, draft_root: str) -> None:
    """把所有媒体拷进草稿目录 Resources/ 并改写素材路径。"""
    content_path = os.path.join(draft_dir, "draft_content.json")
    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)

    res_dir = os.path.join(draft_dir, "Resources")
    os.makedirs(res_dir, exist_ok=True)
    final_base = os.path.join(draft_root, draft_name, "Resources")
    mapping: dict[str, str] = {}
    used: set[str] = set()
    for kind in ("videos", "audios"):
        for m in content["materials"].get(kind, []):
            src = m["path"]
            if src not in mapping:
                name = _unique_name(os.path.basename(src), used)
                used.add(name)
                shutil.copy2(src, os.path.join(res_dir, name))
                mapping[src] = os.path.join(final_base, name)
            m["path"] = mapping[src]

    with open(content_path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False)


def install(draft_dir: str, draft_name: str, draft_root: str | None = None,
            bundle: bool = True) -> str:
    """把 pyJianYingDraft 生成的草稿目录装进 Windows 剪映草稿库。

    旧草稿改名保留而非直接删除，安装成功后才清理；失败时旧草稿复位、
    新草稿退回暂存目录。
    """
    if jianying_running():
        raise RuntimeError("剪映正在运行，请先完全退出再执行")
    root = draft_root or default_draft_root()
    target = _validate_draft_name(draft_name, root)
    if bundle:
        bundle_media(draft_dir, draft_name, root)
    old = None
    if os.path.exists(target):
        old = f"{target}.replaced-{time.strftime('%Y%m%d-%H%M%S')}"
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
        shutil.rmtree(old, ignore_errors=True)
    return target


def uninstall(draft_name: str, draft_root: str | None = None) -> None:
    """删除指定草稿。先改名为临时目录再删：删除中途失败只留下明确命名的
    残留，目标名立即可复用，提示手动清理。"""
    if jianying_running():
        raise RuntimeError("剪映正在运行，请先完全退出再执行")
    target = _validate_draft_name(draft_name,
                                  draft_root or default_draft_root())
    if not os.path.exists(target):
        return
    tmp = f"{target}.uninstall-{time.strftime('%Y%m%d-%H%M%S')}"
    os.rename(target, tmp)
    try:
        shutil.rmtree(tmp)
    except OSError as e:
        print(f"[warn] 残留目录删除失败，请手动清理：{tmp}（{e}）")
