#!/usr/bin/env python3
"""Re-sync gallery/source/*.md copies and library.json text fields from references/shots/ cards.

Run from repo root after editing any card:  python3 gallery/sync-from-cards.py
"""
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'references' / 'shots'
SOURCE = ROOT / 'gallery' / 'source'
LIB = ROOT / 'gallery' / 'api' / 'library.json'

# Variants with a recipe/sample but no reusable demo source get 'reference-only'
# here so the workflow does not recommend them by default. Currently empty:
# every style has demo source.
STYLE_STATUS = {}


def parse_card(path):
    text = path.read_text(encoding='utf-8')
    m = re.match(r'^---\n(.*?)\n---\n', text, re.S)
    fm = {}
    if m:
        for line in m.group(1).splitlines():
            if ':' in line:
                k, v = line.split(':', 1)
                fm[k.strip()] = v.strip()
    im = re.search(r'^## 意图\n(.*?)(?=\n## )', text, re.S | re.M)
    intention = re.sub(r'\s*\n\s*', ' ', im.group(1).strip()) if im else None
    return fm, intention


# 功能类别（目录名 → 中/英标签）；references/shots/<类别>/<卡名>.md
CATEGORIES = {
    'opening': {'zh': '开场与品牌', 'en': 'Opening & Brand'},
    'typography': {'zh': '文字与字卡', 'en': 'Typography & Title Cards'},
    'ui-entrance': {'zh': '界面登场与陈列', 'en': 'UI Entrance & Showcase'},
    'camera': {'zh': '运镜与空间', 'en': 'Camera & Space'},
    'data': {'zh': '数据与指标', 'en': 'Data & Metrics'},
    'interaction': {'zh': '交互与功能演示', 'en': 'Interaction & Feature Demo'},
    'transition': {'zh': '转场', 'en': 'Transitions'},
    'rhythm': {'zh': '节奏与蒙太奇', 'en': 'Rhythm & Montage'},
    'effects': {'zh': '光效与强调', 'en': 'Light & Emphasis'},
    'outro': {'zh': '收尾', 'en': 'Outro'},
}


def main():
    cards = {p.stem: p for p in SHOTS.glob('*/*.md')}
    card_category = {p.stem: p.parent.name for p in SHOTS.glob('*/*.md')}
    unknown = sorted(set(card_category.values()) - set(CATEGORIES))
    if unknown:
        raise SystemExit(f'unknown category folders: {unknown} (add to CATEGORIES)')

    # 1. refresh gallery/source copies (drop copies whose card no longer exists).
    # A copy that differs from its card means the card was edited since the last
    # sync — bump that card's updatedAt so stats.newest / sitemap lastmod move.
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    touched = set()
    for old in SOURCE.glob('*.md'):
        if old.stem not in cards:
            old.unlink()
            print(f'removed stale copy: {old.name}')
    for name, p in cards.items():
        copy = SOURCE / p.name
        if not copy.exists() or copy.read_bytes() != p.read_bytes():
            touched.add(name)
        shutil.copyfile(p, copy)

    # 2. refresh library.json text fields
    lib = json.loads(LIB.read_text(encoding='utf-8'))
    missing = []
    for card in lib['cards']:
        p = cards.get(card['name'])
        if not p:
            missing.append(card['name'])
            continue
        fm, intention = parse_card(p)
        if fm.get('一句话'):
            card['summary'] = fm['一句话']
        if fm.get('适用'):
            card['use'] = fm['适用']
        if fm.get('时长'):
            card['duration'] = fm['时长']
        if fm.get('能量'):
            card['energy'] = fm['能量']
        if intention:
            card['intention'] = intention
        card['category'] = card_category[card['name']]
        # 多类别标签：frontmatter 的「标签:」列出这张卡也成立的其他类别；
        # 目录名永远是主类别（分组归属），标签只扩大筛选命中面
        extra = [t.strip() for t in re.split(r'[,，、\s]+', fm.get('标签', '')) if t.strip()]
        bad = [t for t in extra if t not in CATEGORIES]
        if bad:
            raise SystemExit(f"{card['name']}: unknown 标签 {bad} (must be CATEGORIES keys)")
        card['tags'] = [card['category']] + [t for t in extra if t != card['category']]
        card['source'] = f"references/shots/{card['category']}/{card['name']}.md"
        if card['name'] in touched:
            card['updatedAt'] = now
        # 新卡首次入 library.json 时打 addedAt（NEW 徽标的数据源，之后不再变；
        # 徽标显示窗口见 app.js 的 NEW_WINDOW_MS）
        card.setdefault('addedAt', now)
        if len(card.get('styles', [])) == 1:
            card['styles'][0]['description'] = card['summary']
        for style in card.get('styles', []):
            status = STYLE_STATUS.get((card['name'], style['key']))
            if status:
                style['implementationStatus'] = status
            else:
                style.pop('implementationStatus', None)
    lib['categories'] = CATEGORIES
    # All 视图直接按 cards 顺序平铺渲染，这里就是排序的唯一权威
    lib['cards'].sort(key=lambda card: card['name'])

    # stats are the single source of truth every page and llms.txt reads;
    # recompute from the cards rather than trusting whatever was there
    styles = [style for card in lib['cards'] for style in card['styles']]
    lib['stats']['cardCount'] = len(lib['cards'])
    lib['stats']['styleCount'] = len(styles)
    lib['stats']['previewCount'] = sum(1 for style in styles if style.get('media'))
    lib['stats']['mediaCount'] = lib['stats']['previewCount']
    lib['stats']['newest'] = max(card['updatedAt'] for card in lib['cards'])
    LIB.write_text(json.dumps(lib, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f"synced {len(lib['cards'])} cards ({lib['stats']['styleCount']} styles, "
          f"{lib['stats']['previewCount']} previews); missing card files: {missing or 'none'}")
    if missing:
        # 卡的 md 已删但 library.json 还留着条目 = Gallery 会渲染一张
        # source 链接指向虚空的卡；硬失败让删卡 PR 在 CI 就暴露
        raise SystemExit(f'orphan library.json entries (card md deleted): {missing}')


if __name__ == '__main__':
    main()
