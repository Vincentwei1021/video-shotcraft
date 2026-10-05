#!/usr/bin/env python3
"""assemble-media.py — 从 gallery-media release 把样片 mp4 组装进一个目录。

release 上样片有两种存法，可以并存：
  gallery-media.zip   批量更新时整包上传（一次请求换掉一大批样片）
  <style-key>.mp4     日常单个更新时逐个上传
组装规则：先解压 zip；再下载两类单个 mp4——上传时间晚于 zip 的（单独补传的新样片，覆盖包里的版本），
以及 zip 里没有的（包可以只装一部分）。zip 之前上传、且已被 zip 收录的旧单文件自动作废。
release 上没有 zip 时退化为下载全部单个 mp4（旧行为）。单个 mp4 只下 library.json 用到的
（release 上去掉的式留下的旧文件不再拉）。

用法：python3 gallery/assemble-media.py <目标目录> [--repo owner/name]
deploy-pages.yml、pr-checks.yml、fetch-media.sh 共用；需要已登录的 gh（CI 里用 GH_TOKEN）。
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import zipfile

ZIP = 'gallery-media.zip'
LIB = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'api', 'library.json')


def wanted_names():
    lib = json.load(open(LIB, encoding='utf-8'))
    out = set()
    for card in lib['cards']:
        for style in card['styles']:
            media = style.get('media')
            url = media.get('url') if isinstance(media, dict) else media
            if url:
                out.add(url.split('?')[0].rstrip('/').split('/')[-1])
    return out


def gh(*args, **kw):
    return subprocess.run(['gh', *args], check=True, text=True, capture_output=True, **kw).stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dest')
    ap.add_argument('--repo', default=os.environ.get('GITHUB_REPOSITORY', 'Vincentwei1021/video-shotcraft'))
    a = ap.parse_args()
    os.makedirs(a.dest, exist_ok=True)
    assets = json.loads(gh('release', 'view', 'gallery-media', '--repo', a.repo, '--json', 'assets'))['assets']
    zipped = next((x for x in assets if x['name'] == ZIP), None)
    wanted = wanted_names()
    singles = [x for x in assets if x['name'].endswith('.mp4') and x['name'] in wanted]
    from_zip, in_zip = 0, set()
    if zipped:
        with tempfile.TemporaryDirectory() as tmp:
            gh('release', 'download', 'gallery-media', '--repo', a.repo, '--dir', tmp, '--pattern', ZIP)
            with zipfile.ZipFile(os.path.join(tmp, ZIP)) as z:
                for info in z.infolist():
                    name = os.path.basename(info.filename)
                    if not name.endswith('.mp4'):
                        continue
                    with z.open(info) as src, open(os.path.join(a.dest, name), 'wb') as dst:
                        dst.write(src.read())
                    from_zip += 1
                    in_zip.add(name)
        # ISO 8601 UTC 时间串可以直接按字符串比较先后
        singles = [x for x in singles if x['updatedAt'] > zipped['updatedAt'] or x['name'] not in in_zip]
    if singles:
        args = ['release', 'download', 'gallery-media', '--repo', a.repo, '--dir', a.dest, '--clobber']
        for x in singles:
            args += ['--pattern', x['name']]
        gh(*args)
    print(f'{a.dest}: {from_zip} previews from {ZIP if zipped else "(no zip)"}, '
          f'{len(singles)} single mp4 asset(s){" (newer than the zip or not in it)" if zipped else ""}')


if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as e:
        sys.exit(f'gh failed: {" ".join(e.cmd)}\n{e.stderr}')
