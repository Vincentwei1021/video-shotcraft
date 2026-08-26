#!/usr/bin/env python3
"""Publish an approved showcase submission (run by showcase-publish.yml).

流程：解析投稿 issue 的表单正文 → 下载视频（issue 附件或外部直链）→
ffmpeg 规整成 h264 mp4 + 抽 poster → 转存到 showcase-media release →
更新 release 上的 showcase.json → 触发 deploy-pages 重新部署 → 回帖并关闭
issue。投稿媒体与 showcase.json 全程只存 release 资产，不进 git。

字段解析锚点是 issue form 各字段的 label（GitHub 渲染为 "### <label>"），
与 .github/ISSUE_TEMPLATE/showcase.yml 一一对应，两边必须同步改。

环境变量（workflow 注入）：GH_TOKEN GH_REPO ISSUE_NUMBER ISSUE_BODY
ISSUE_USER ISSUE_CREATED_AT RUN_ID
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

RELEASE_TAG = 'showcase-media'
MAX_BYTES = 300 * 1024 * 1024  # 单支投稿上限 300MB
SHOWCASE_URL = 'https://vincentwei1021.github.io/video-shotcraft/showcase.html'

# 与 showcase.yml 各字段 label 一致
FIELD_TITLE = '作品名'
FIELD_DESC = '一句话介绍'
FIELD_CARDS = '用到的镜头卡（可选）'
FIELD_FILE = '视频文件（≤10MB 直接拖拽上传）'
FIELD_URL = '视频外部链接（大文件用）'
FIELD_X = 'X 账号（可选）'
FIELD_XHS = '小红书（可选）'
FIELD_DY = '抖音（可选）'

ATTACHMENT_RE = re.compile(
    r'https://github\.com/user-attachments/(?:assets/[\w-]+|files/\d+/\S+?)(?=[)\s"\']|$)'
    r'|https://user-images\.githubusercontent\.com/\S+?(?=[)\s"\']|$)')
URL_RE = re.compile(r'https?://\S+?(?=[)\s"\']|$)')


def run(cmd, **kw):
    print('+', ' '.join(str(c) for c in cmd), flush=True)
    return subprocess.run(cmd, check=True, **kw)


def parse_form(body):
    """Issue form 正文按 '### <label>' 切段，值为段内文本。"""
    sections = {}
    current = None
    for line in body.replace('\r\n', '\n').split('\n'):
        if line.startswith('### '):
            current = line[4:].strip()
            sections[current] = []
        elif current is not None:
            sections[current].append(line)
    fields = {}
    for key, lines in sections.items():
        value = '\n'.join(lines).strip()
        fields[key] = '' if value == '_No response_' else value
    return fields


def pick_video_url(fields):
    attachment = ATTACHMENT_RE.search(fields.get(FIELD_FILE, ''))
    if attachment:
        return attachment.group(0)
    external = URL_RE.search(fields.get(FIELD_URL, ''))
    if external:
        return external.group(0)
    sys.exit('投稿里既没有视频附件也没有外部链接，无法发布')


def probe_codec(path):
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
         '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', str(path)],
        capture_output=True, text=True)
    if result.returncode != 0 or not result.stdout.strip():
        sys.exit(f'ffprobe 认不出下载的文件，不是可用的视频：{result.stderr.strip()}')
    return result.stdout.strip().splitlines()[0]


def normalize_video(raw, out_mp4):
    """h264 直接 remux（无损 + faststart），其余编码统一转码成 1080p 内 h264。"""
    codec = probe_codec(raw)
    if codec == 'h264':
        remux = subprocess.run(
            ['ffmpeg', '-y', '-i', str(raw), '-c', 'copy',
             '-movflags', '+faststart', str(out_mp4)])
        if remux.returncode == 0:
            return
    run(['ffmpeg', '-y', '-i', str(raw),
         '-vf', "scale='min(1920,iw)':-2",
         '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast',
         '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
         '-movflags', '+faststart', str(out_mp4)])


def extract_poster(video, poster):
    for seek in ('1', '0'):
        result = subprocess.run(
            ['ffmpeg', '-y', '-ss', seek, '-i', str(video), '-frames:v', '1',
             '-vf', "scale='min(960,iw)':-2", str(poster)])
        if result.returncode == 0 and poster.exists() and poster.stat().st_size > 0:
            return
    sys.exit('无法从视频抽取 poster 帧')


def main():
    env = os.environ
    issue = int(env['ISSUE_NUMBER'])
    fields = parse_form(env.get('ISSUE_BODY', ''))
    title = fields.get(FIELD_TITLE, '').strip()
    description = fields.get(FIELD_DESC, '').strip()
    if not title or not description:
        sys.exit('投稿缺少作品名或介绍，请补全后再加 approved 标签')

    video_url = pick_video_url(fields)
    work = Path(tempfile.mkdtemp(prefix='showcase-'))
    raw = work / 'raw-video'
    # -A 给个浏览器 UA：部分网盘直链对空 UA 返回 403
    run(['curl', '-fSL', '--retry', '3', '--max-time', '600',
         '--max-filesize', str(MAX_BYTES),
         '-A', 'Mozilla/5.0 (video-shotcraft showcase bot)',
         '-o', str(raw), video_url])
    if raw.stat().st_size > MAX_BYTES:
        sys.exit(f'视频超过 {MAX_BYTES // 1024 // 1024}MB 上限')

    mp4 = work / f'showcase-{issue}.mp4'
    poster = work / f'showcase-{issue}.jpg'
    normalize_video(raw, mp4)
    extract_poster(mp4, poster)

    # release 首次投稿时自动创建
    exists = subprocess.run(['gh', 'release', 'view', RELEASE_TAG],
                            capture_output=True)
    if exists.returncode != 0:
        run(['gh', 'release', 'create', RELEASE_TAG,
             '--title', 'Showcase media assets',
             '--notes', 'User-submitted showcase videos + showcase.json '
                        '(published by showcase-publish.yml, not tracked in git).'])

    manifest_path = work / 'showcase.json'
    fetched = subprocess.run(
        ['gh', 'release', 'download', RELEASE_TAG, '--pattern', 'showcase.json',
         '--dir', str(work), '--clobber'], capture_output=True)
    if fetched.returncode == 0 and manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    else:
        manifest = {'items': []}

    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    entry = {
        'id': issue,
        'title': title,
        'description': description,
        'cards': fields.get(FIELD_CARDS, '').strip(),
        'author': {
            'github': env.get('ISSUE_USER', ''),
            'x': fields.get(FIELD_X, '').strip(),
            'xiaohongshu': fields.get(FIELD_XHS, '').strip(),
            'douyin': fields.get(FIELD_DY, '').strip(),
        },
        # ?v= 缓存穿透：重新发布同一 issue 时 Pages CDN 才会取新文件
        'video': f'./showcase-media/showcase-{issue}.mp4?v={env.get("RUN_ID", "0")}',
        'poster': f'./showcase-media/showcase-{issue}.jpg?v={env.get("RUN_ID", "0")}',
        'submittedAt': env.get('ISSUE_CREATED_AT', ''),
        'approvedAt': now,
    }
    manifest['items'] = ([entry]
                         + [item for item in manifest['items'] if item.get('id') != issue])
    manifest['updatedAt'] = now
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    run(['gh', 'release', 'upload', RELEASE_TAG, str(mp4), str(poster),
         str(manifest_path), '--clobber'])
    # GITHUB_TOKEN 的 push 不触发 workflow，但显式 workflow_dispatch 可以
    run(['gh', 'workflow', 'run', 'deploy-pages.yml'])
    run(['gh', 'issue', 'comment', str(issue), '--body',
         f'🎉 已发布！你的作品几分钟后会出现在 [Showcase 页]({SHOWCASE_URL})。\n\n'
         f'需要修改或下架，随时在本 issue 留言或开新 issue。感谢投稿！'])
    run(['gh', 'issue', 'close', str(issue), '--reason', 'completed'])


if __name__ == '__main__':
    main()
