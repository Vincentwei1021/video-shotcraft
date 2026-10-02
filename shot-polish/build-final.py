#!/usr/bin/env python3
"""build-final.py — 生成最终确认页 shot-polish/final.html（品牌替换轮之后，按决策落版的终版逐镜头确认）。

数据源：
  shot-polish/decisions.json          对照页的逐镜头决策（before / v1 / after / drop）
  workbench/src/cards/demo-index.ts   当前 demo 清单（gen-index 生成）
  workbench/src/cards/demoMeta.ts     中英文名 / 分类（gen-index 生成）
  shot-polish/final-notes/<Stem>.json 品牌替换说明（品牌轮 agent 写）
  shot-polish/{before,after-v1,after}/<Stem>.mp4  选定版本改品牌前的渲染
  shot-polish/final/<Stem>.mp4        终版渲染

用法（仓库根）：python3 shot-polish/build-final.py
预览：cd shot-polish && python3 serve.py → http://localhost:8765/final.html
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from importlib import import_module  # noqa: E402

bc = import_module('build-compare')

PREV_DIR = {'before': 'before', 'v1': 'after-v1', 'after': 'after'}


def main():
    meta = bc.load_meta()
    dec = json.loads((HERE / 'decisions.json').read_text(encoding='utf-8'))
    picks = {d['stem']: d for d in dec['decisions']}
    items = []
    for d in bc.load_index():
        s = d['stem']
        m = meta.get(s, {})
        pick = picks.get(s, {}).get('pick', 'after')
        note_p = HERE / 'final-notes' / f'{s}.json'
        note = json.loads(note_p.read_text(encoding='utf-8')) if note_p.exists() else {}
        prev = HERE / PREV_DIR[pick] / f'{s}.mp4'
        fin = HERE / 'final' / f'{s}.mp4'
        items.append({
            **d, 'name': m.get('name', s), 'nameEn': m.get('nameEn', s), 'pick': pick,
            'prev': f'{PREV_DIR[pick]}/{s}.mp4' if prev.exists() else None,
            'final': f'final/{s}.mp4' if fin.exists() else None,
            'fPrev': bc.probe_frames(prev), 'fFinal': bc.probe_frames(fin),
            'changed': note.get('changed'), 'brand': note.get('brand', []), 'brandEn': note.get('brandEn', []),
        })
    items.sort(key=lambda x: (bc.CAT_ORDER.index(x['cat']) if x['cat'] in bc.CAT_ORDER else 99, x['card'], x['stem']))
    kept_cards = {i['card'] for i in items}
    dropped = []
    for s, d in sorted(picks.items()):
        if d.get('pick') != 'drop':
            continue
        parts = d['path'].split('/')
        dropped.append({'stem': s, 'name': d.get('name', s), 'cat': parts[1], 'card': parts[2],
                        'cardGone': parts[2] not in kept_cards,
                        'v2': f'after/{s}.mp4' if (HERE / 'after' / f'{s}.mp4').exists() else None})
    dropped.sort(key=lambda x: (bc.CAT_ORDER.index(x['cat']) if x['cat'] in bc.CAT_ORDER else 99, x['card'], x['stem']))
    data = {'items': items, 'dropped': dropped, 'cats': [{'key': c, 'en': bc.CAT_EN[c]} for c in bc.CAT_ORDER]}
    html = (HERE / 'final.template.html').read_text(encoding='utf-8')
    html = html.replace('/*__DATA__*/null', json.dumps(data, ensure_ascii=False))
    (HERE / 'final.html').write_text(html, encoding='utf-8')
    print(f"final.html: {len(items)} kept ({sum(1 for i in items if i['final'])} rendered, "
          f"{sum(1 for i in items if i['changed'])} rebranded), {len(dropped)} dropped "
          f"({len({x['card'] for x in dropped if x['cardGone']})} whole cards)")


if __name__ == '__main__':
    main()
