# -*- coding: utf-8 -*-
"""redskill-lite 打包脚本：先全量校验，全部通过才产出 dist/redskill-lite.zip。

任一校验失败即报错退出（非零退出码），绝不产出会被平台拒收的 zip。
用法：python redskill/build.py  （Windows 下用 python；脚本无第三方依赖）
"""
import re
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIST = HERE / 'dist'
ZIP_PATH = DIST / 'redskill-lite.zip'
GH_BASE = 'https://github.com/Vincentwei1021/video-shotcraft'

# zip 收录范围：SKILL.md + references/ 下的 .md/.txt
# 仓库侧文件（README.md / build.py / dist/）不进 zip
ALLOWED_EXTS = {'.md', '.txt'}
# 平台体积上限（保守值）
MAX_ZIP_BYTES = 5 * 1024 * 1024

# 包外目录前缀（这些路径的文件不在本包内）
EXTERNAL_DIRS = re.compile(
    r'(?:^|[\s`(\[\'「【])(?:demos|assets|template|gallery|workbench|'
    r'jianying-export|publish)(?:/|\\)')

# 可执行命令行（代码块或行内）：命令 + 指向包外资源的路径，或 cd 包外目录，
# 或仓库级 npm 命令 —— 且行内没有"完整工程/外链"说明
CMD = re.compile(r'^\s*(?:\$\s+)?(?:python3?|node|npx)\b')
CMD_EXT = re.compile(r'(?:demos|assets|template|gallery|workbench|'
                     r'jianying-export|publish)/')
CD_EXT = re.compile(r'^\s*(?:\$\s+)?cd\s+'
                    r'(?:demos|assets|template|gallery|workbench|'
                    r'jianying-export|publish)\b')
NPM_REPO = re.compile(r'^\s*(?:\$\s+)?npm\s+(?:test|ci|install|run)\b')
EXT_NOTE = re.compile(r'(完整工程|github\.com/Vincentwei1021|gitcode\.com/'
                      r'VincentWei|在完整工程执行|本包不含)')

# 包内相对引用（references/...），需真实存在
PACK_REF = re.compile(r'`references/[A-Za-z0-9_.\-/]+`')

errors = []


def fail(msg: str) -> None:
    errors.append(msg)


def check_collect_files():
    """校验 1：白名单——zip 收录的只有 .md/.txt，SKILL.md 必须存在。"""
    if not (HERE / 'SKILL.md').is_file():
        fail('缺少 redskill/SKILL.md')
    refs = HERE / 'references'
    if not refs.is_dir():
        fail('缺少 redskill/references/ 目录')
        return []
    files = []
    for p in sorted(refs.rglob('*')):
        if p.is_dir():
            continue
        ext = p.suffix.lower()
        if ext not in ALLOWED_EXTS:
            fail(f'白名单外文件：references/{p.relative_to(refs).as_posix()}'
                 f'（.{ext} 不在 .md/.txt 白名单）')
            continue
        files.append(p)
    # references 根下的 .md 也允许，SKILL.md 计入
    all_md = [HERE / 'SKILL.md'] + files
    return all_md


def check_encoding(files):
    """校验 2：UTF-8 无 BOM、LF，且 UTF-8 可解码。"""
    for p in files:
        raw = p.read_bytes()
        rel = p.relative_to(HERE).as_posix()
        if raw.startswith(b'\xef\xbb\xbf'):
            fail(f'{rel} 含 UTF-8 BOM')
        if b'\r' in raw:
            fail(f'{rel} 含 CR（须统一 LF）')
        try:
            raw.decode('utf-8')
        except UnicodeDecodeError as e:
            fail(f'{rel} 非 UTF-8：{e}')


def check_exec_residual(files):
    """校验 3：执行式残留——正文不得让人执行包里不存在的脚本/工程。

    判定：命令行（python/node/npx + 包外路径；cd 包外目录；仓库级 npm）且
    行内没有"完整工程/外链/本包不含"说明。
    """
    for p in files:
        rel = p.relative_to(HERE).as_posix()
        in_code = False
        for i, ln in enumerate(p.read_text(encoding='utf-8').split('\n'), 1):
            s = ln.strip()
            if s.startswith('```') or s.startswith('~~~'):
                in_code = not in_code
                continue
            if not in_code:
                continue
            hit = ((CMD.match(ln) and (CMD_EXT.search(ln) or
                                       'smoke-render-demos' in ln or
                                       'test_sfx_source' in ln or
                                       'upload_post' in ln or
                                       'sfx-source' in ln))
                   or CD_EXT.match(ln) or NPM_REPO.match(ln))
            if hit and not EXT_NOTE.search(ln):
                fail(f'{rel}:{i} 执行式残留（指向包外资源且未注明完整工程）：'
                     f'{s[:80]}')


def check_pack_refs(files):
    """校验 4：引用一致性——包内 references/... 相对引用必须真实存在。"""
    for p in files:
        rel = p.relative_to(HERE).as_posix()
        for m in PACK_REF.finditer(p.read_text(encoding='utf-8')):
            ref = m.group(0).strip('`')
            target = HERE / ref
            if not target.exists():
                fail(f'{rel} 引用了包内不存在的文件：{ref}')


def check_external_links(files):
    """校验 5：外链格式——完整工程链接必须指向真实仓库。"""
    pat = re.compile(r'\]\((https?://[^)]+)\)')
    for p in files:
        rel = p.relative_to(HERE).as_posix()
        for m in pat.finditer(p.read_text(encoding='utf-8')):
            url = m.group(1)
            if url.startswith(GH_BASE):
                # blob/tree 路径的合法性仅做格式校验（非空、无空格）
                rest = url[len(GH_BASE):]
                if rest and ' ' in rest:
                    fail(f'{rel} 外链含空格：{url}')


def build_zip(files):
    """校验通过后打包：zip 根直接是 SKILL.md 与 references/，无外层文件夹。"""
    DIST.mkdir(exist_ok=True)
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zf:
        for p in files:
            arcname = p.relative_to(HERE).as_posix()
            zf.write(p, arcname)
    # 打包后校验体积与根结构
    size = ZIP_PATH.stat().st_size
    if size > MAX_ZIP_BYTES:
        fail(f'zip 体积超限：{size} > {MAX_ZIP_BYTES} 字节')
        ZIP_PATH.unlink()
        return 0
    with zipfile.ZipFile(ZIP_PATH) as zf:
        names = zf.namelist()
        top = {n.split('/')[0] for n in names}
        if 'SKILL.md' not in names:
            fail('zip 根目录缺少 SKILL.md')
        if not all(n == 'SKILL.md' or n.startswith('references/') for n in names):
            fail(f'zip 根目录混入其他内容：{sorted(top)}')
        if top - {'SKILL.md', 'references'}:
            fail(f'zip 出现外层文件夹/多余顶层项：{sorted(top)}')
    return size


def main() -> int:
    print('== redskill-lite build ==')
    files = check_collect_files()
    check_encoding(files)
    check_exec_residual(files)
    check_pack_refs(files)
    check_external_links(files)
    if errors:
        print(f'\n校验失败（{len(errors)} 项），不产出 zip：')
        for e in errors:
            print('  - ' + e)
        return 1
    print(f'校验通过：{len(files)} 个文件（SKILL.md + '
          f'{len(files) - 1} 个 references）')
    size = build_zip(files)
    if errors:
        print(f'\n打包失败（{len(errors)} 项）：')
        for e in errors:
            print('  - ' + e)
        return 1
    print(f'产出：{ZIP_PATH}（{size} 字节，'
          f'{size / 1024:.1f} KB，{len(files)} 个文件）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
