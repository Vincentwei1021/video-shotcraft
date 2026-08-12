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


def bundle_media(draft_dir: str, draft_name: str, draft_root: str) -> None:
    """把所有媒体拷进草稿目录 Resources/ 并改写素材路径（含 meta 登记）。"""
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
                name = os.path.basename(src)
                if name in used:  # 不同目录同名文件防碰撞
                    name = f"{len(used)}-{name}"
                used.add(name)
                shutil.copy2(src, os.path.join(res_dir, name))
                mapping[src] = os.path.join(final_base, name)
            m["path"] = mapping[src]

    with open(content_path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False)


def install(draft_dir: str, draft_name: str, draft_root: str | None = None,
            bundle: bool = True) -> str:
    """把 pyJianYingDraft 生成的草稿目录装进 Windows 剪映草稿库。"""
    if jianying_running():
        raise RuntimeError("剪映正在运行，请先完全退出再执行")
    root = draft_root or default_draft_root()
    if bundle:
        bundle_media(draft_dir, draft_name, root)
    target = os.path.join(root, draft_name)
    if os.path.exists(target):
        shutil.rmtree(target)
    shutil.move(draft_dir, target)
    return target


def uninstall(draft_name: str, draft_root: str | None = None) -> None:
    if jianying_running():
        raise RuntimeError("剪映正在运行，请先完全退出再执行")
    target = os.path.join(draft_root or default_draft_root(), draft_name)
    if os.path.exists(target):
        shutil.rmtree(target)
