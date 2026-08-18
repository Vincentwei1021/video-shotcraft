#!/usr/bin/env python3
"""smoke-render-demos.py — demo 渲染冒烟测试。

堵住"能编译不能运行"的漏洞：现有 CI 只做 tsc 编译，不验证 demo 能否
真的渲染。本脚本扫描所有带时长导出（`_DURATION` / `_DUR`）的 demo，
自动生成一个临时 Root 注册全部，然后逐个渲染首帧，断言输出文件非空、
渲染不崩。

用法（从仓库根）：
    python3 assets/scripts/smoke-render-demos.py [--subset a,b,c] [--list]

前置条件：
    - template/ 已 `npm install`（remotion 4.0.484）
    - demos/ 用到的 @remotion/motion-blur 已装到 template（CI 里临时装）
    - 需要纹理的 demo：demos/_textures/ 的文件已复制到
      template/public/textures/live/（脚本会自动复制缺失的）
    - 需要素材 mp4 的 demo（如 clipcard-looping）：跳过并报告，不失败

退出码：全通过 0；任一 demo 渲染失败 1（列出失败清单）。
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
TEMPLATE = ROOT / 'template'
TEMPLATE_SRC = TEMPLATE / 'src'
TEXTURES_SRC = ROOT / 'demos' / '_textures'
TEXTURES_DST = TEMPLATE / 'public' / 'textures' / 'live'
DUR_PAT = re.compile(r'export const (\w+_DURATION|\w+_DUR)\s*=')

# demo 需要真实 mp4 素材、无法自动生成的（跳过，脚本只报告）
MATERIAL_REQUIRED = {'ClipCardLooping'}


def find_demos():
    """返回 [(路径, 时长导出名, 组件名)], 按路径排序。"""
    out = []
    for f in sorted((ROOT / 'demos').rglob('*.tsx')):
        src = f.read_text(encoding='utf-8')
        m = DUR_PAT.search(src)
        if not m:
            continue
        durname = m.group(1)
        stem = f.stem
        # 组件导出必须真实存在（`export const <stem>` 且是组件而非常量）。
        # 正则精确匹配，避免文件名出现在注释/字符串里造成的误判。
        if not re.search(rf'export const {re.escape(stem)}\s*:\s*React\.FC\s*=', src):
            continue
        out.append((f, durname, stem))
    return out


def write_smoke_root(demos):
    """生成 template/src/smoke-root.tsx 注册所有 demo。"""
    lines = ["import { Composition, registerRoot } from 'remotion';"]
    regs = []
    for f, durname, stem in demos:
        rel = os.path.relpath(f, TEMPLATE_SRC).replace('.tsx', '')
        lines.append(f"import {{ {stem}, {durname} }} from '{rel}';")
        regs.append(
            f'  <Composition id="{stem}" component={{{stem}}} '
            f'durationInFrames={{{durname}}} fps={{30}} width={{1920}} '
            f'height={{1080}} />'
        )
    lines.append('export const Root: React.FC = () => (<>')
    lines += regs
    lines.append('</>);')
    lines.append('registerRoot(Root);')
    (TEMPLATE_SRC / 'smoke-root.tsx').write_text('\n'.join(lines) + '\n', encoding='utf-8')


def ensure_textures():
    """把 demos/_textures 的图片纹理复制到 template/public/textures/live。
    只复制图片（.png/.jpg/.webp），跳过 layout.json 等数据文件——它们是
    import 进 TS 的，不是运行时纹理。"""
    if not TEXTURES_SRC.exists():
        return 0
    os.makedirs(TEXTURES_DST, exist_ok=True)
    IMG_EXT = {'.png', '.jpg', '.jpeg', '.webp'}
    copied = 0
    for f in TEXTURES_SRC.iterdir():
        if f.is_file() and f.suffix.lower() in IMG_EXT and not (TEXTURES_DST / f.name).exists():
            shutil.copy2(f, TEXTURES_DST / f.name)
            copied += 1
    return copied


def render_one(stem, out_dir):
    """渲染单个 demo 首帧, 返回 (ok, 输出路径或错误信息)。"""
    out = out_dir / f'{stem}.png'
    r = subprocess.run(
        ['npx', 'remotion', 'still', 'src/smoke-root.tsx', stem,
         '--frame=0', str(out), '--log=error'],
        cwd=TEMPLATE,
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        return False, r.stderr[-400:]
    if not out.exists() or out.stat().st_size == 0:
        return False, 'rendered but empty output'
    return True, None


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--subset', help='逗号分隔的组件名, 只渲染这些')
    ap.add_argument('--list', action='store_true', help='只列出可渲染 demo')
    args = ap.parse_args()

    demos = find_demos()
    if args.list:
        for _, _, stem in demos:
            print(stem)
        return 0

    if args.subset:
        wanted = set(args.subset.split(','))
        available = {s for _, _, s in demos}
        unknown = wanted - available
        if unknown:
            print(f'error: subset 含未找到的 demo: {sorted(unknown)}')
            return 1
        demos = [(f, d, s) for f, d, s in demos if s in wanted]

    # 过滤需要素材的 demo
    skip = [(f, d, s) for f, d, s in demos if s in MATERIAL_REQUIRED]
    run = [(f, d, s) for f, d, s in demos if s not in MATERIAL_REQUIRED]

    print(f'扫描到 {len(demos)} 个带时长导出的 demo; '
          f'跳过(需素材) {len(skip)}; 将渲染 {len(run)} 个')
    if skip:
        print(f'  跳过: {", ".join(s for _, _, s in skip)}')

    write_smoke_root(run)
    ensure_textures()

    with tempfile.TemporaryDirectory() as tmp:
        out_dir = Path(tmp)
        failed = []
        for f, durname, stem in run:
            ok, err = render_one(stem, out_dir)
            if ok:
                print(f'  ✓ {stem}')
            else:
                print(f'  ✗ {stem}: {err}')
                failed.append(stem)

    # 清理生成的 smoke-root
    (TEMPLATE_SRC / 'smoke-root.tsx').unlink(missing_ok=True)

    if failed:
        print(f'\n失败 {len(failed)} 个: {failed}')
        return 1
    print(f'\n全部 {len(run)} 个 demo 首帧渲染通过 ✓')
    return 0


if __name__ == '__main__':
    sys.exit(main())
