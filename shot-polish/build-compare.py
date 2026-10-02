#!/usr/bin/env python3
"""build-compare.py — 生成镜头改版前后对照页 shot-polish/index.html。

数据源：
  workbench/src/cards/demo-index.ts   demo 清单（stem → demos/ 相对路径，gen-index 生成）
  workbench/src/cards/demoMeta.ts     中英文名 / 分类 / 一句话（gen-index 生成）
  shot-polish/notes/<Stem>.json       每个 demo 的改版说明（改版 agent 写）
  shot-polish/before/<Stem>.mp4       原版渲染
  shot-polish/after-v1/<Stem>.mp4     第一轮（保守打磨）渲染
  shot-polish/after/<Stem>.mp4        第二轮（重设计）渲染

用法（仓库根）：python3 shot-polish/build-compare.py
预览：cd shot-polish && python3 -m http.server 8765 → http://localhost:8765/
"""
import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CARDS = ROOT / 'workbench' / 'src' / 'cards'

CAT_ORDER = ['opening', 'camera', 'transition', 'typography', 'ui-entrance',
             'interaction', 'data', 'effects', 'rhythm', 'outro']
CAT_EN = {'opening': 'Opening', 'camera': 'Camera & Space', 'transition': 'Transition',
          'typography': 'Typography', 'ui-entrance': 'UI Entrance', 'interaction': 'Interaction',
          'data': 'Data', 'effects': 'Effects', 'rhythm': 'Rhythm', 'outro': 'Outro'}


def load_meta():
    src = (CARDS / 'demoMeta.ts').read_text(encoding='utf-8')
    body = src[src.index('DEMO_META'):]
    body = body[body.index('{'):]
    end = body.index('\n};')
    return json.loads(body[:end + 2])


def load_index():
    src = (CARDS / 'demo-index.ts').read_text(encoding='utf-8')
    out = []
    for m in re.finditer(r'import \{ (\w+) as c\d+[^}]*\} from "@demos/([^"]+)"', src):
        stem, rel = m.group(1), m.group(2)
        out.append({'stem': stem, 'path': f'demos/{rel}.tsx', 'cat': rel.split('/')[0],
                    'card': rel.split('/')[1]})
    return out


def probe_frames(p):
    if not p.exists():
        return None
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                              'stream=nb_frames', '-of', 'csv=p=0', str(p)], capture_output=True, text=True)
        return int(out.stdout.strip().strip(',').split(',')[0])
    except ValueError:
        return None


def main():
    meta = load_meta()
    items = []
    for d in load_index():
        m = meta.get(d['stem'], {})
        note_p = HERE / 'notes' / f"{d['stem']}.json"
        note = json.loads(note_p.read_text(encoding='utf-8')) if note_p.exists() else {}
        before = HERE / 'before' / f"{d['stem']}.mp4"
        v1 = HERE / 'after-v1' / f"{d['stem']}.mp4"
        after = HERE / 'after' / f"{d['stem']}.mp4"
        items.append({
            **d,
            'name': m.get('name', d['stem']),
            'nameEn': m.get('nameEn', d['stem']),
            'summary': m.get('summary', ''),
            'summaryEn': m.get('summaryEn', ''),
            'before': f"before/{d['stem']}.mp4" if before.exists() else None,
            'v1': f"after-v1/{d['stem']}.mp4" if v1.exists() else None,
            'after': f"after/{d['stem']}.mp4" if after.exists() else None,
            'fBefore': probe_frames(before), 'fV1': probe_frames(v1), 'fAfter': probe_frames(after),
            'issues': note.get('issues', []), 'changes': note.get('changes', []),
            'issuesEn': note.get('issuesEn', []), 'changesEn': note.get('changesEn', []),
        })
    items.sort(key=lambda x: (CAT_ORDER.index(x['cat']) if x['cat'] in CAT_ORDER else 99, x['card'], x['stem']))
    data = {'items': items, 'cats': [{'key': c, 'en': CAT_EN[c]} for c in CAT_ORDER]}
    html = (HERE / 'compare.template.html').read_text(encoding='utf-8')
    html = html.replace('/*__DATA__*/null', json.dumps(data, ensure_ascii=False))
    (HERE / 'index.html').write_text(html, encoding='utf-8')
    done = sum(1 for i in items if i['after'] and i['before'])
    print(f'index.html: {len(items)} demos, {done} with before+after, '
          f"{sum(1 for i in items if i['changes'])} with notes")


if __name__ == '__main__':
    main()
