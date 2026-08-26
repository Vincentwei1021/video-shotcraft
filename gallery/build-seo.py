#!/usr/bin/env python3
"""Regenerate SEO artifacts for the gallery static site.

Run from repo root after cards or library.json change:
    python3 gallery/build-seo.py

Outputs:
- static pre-rendered card list injected into library.html between
  <!-- seo:cards:start --> and <!-- seo:cards:end --> markers
  (replaced by app.js at runtime; exists so crawlers see the full list without JS)
- sitemap.xml
- llms.txt
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = 'https://vincentwei1021.github.io/video-shotcraft'
REPO = 'https://github.com/Vincentwei1021/video-shotcraft'

lib = json.loads((HERE / 'api' / 'library.json').read_text(encoding='utf-8'))

# English one-liners live in translations.js (cardsEn map)
src = (HERE / 'translations.js').read_text(encoding='utf-8')
seg = src[src.index('cardsEn'):]
seg = seg[:seg.index('},')]
cards_en = dict(re.findall(r"'([a-z0-9-]+)':\s*'((?:[^'\\]|\\.)*)'", seg))


def esc(text):
    return (text.replace('&', '&amp;').replace('<', '&lt;')
            .replace('>', '&gt;').replace('"', '&quot;'))


def en_desc(card):
    raw = cards_en.get(card['name'], '')
    return raw.replace("\\'", "'")


# 1. static card list in index.html
items = []
for card in lib['cards']:
    styles = ', '.join(style['key'] for style in card['styles'])
    desc = en_desc(card)
    items.append(
        f'      <article class="shot-card" id="{esc(card["name"])}">\n'
        f'        <h3>{esc(card["name"])}</h3>\n'
        f'        <p>{esc(desc)}</p>\n'
        f'        <p>Styles: {esc(styles)}</p>\n'
        f'      </article>'
    )
static_block = (
    '<!-- seo:cards:start -->\n'
    + '\n'.join(items)
    + '\n    <!-- seo:cards:end -->'
)

index_path = HERE / 'library.html'
html = index_path.read_text(encoding='utf-8')
pattern = re.compile(
    r'(<section class="library" id="library"[^>]*>).*?(</section>)', re.S)
html_new = pattern.sub(
    lambda m: f'{m.group(1)}\n    {static_block}\n    {m.group(2)}', html, count=1)
index_path.write_text(html_new, encoding='utf-8')


# 1b. rewrite hardcoded counts in both pages' head/meta/JSON-LD and the
# landing hero. Runtime JS corrects the visible stats, but crawlers, social
# cards and no-JS readers see these literals, so they must not drift.
CARDS = lib['stats']['cardCount']
STYLES = lib['stats']['styleCount']
PREVIEWS = lib['stats']['previewCount']
COUNT_PATTERNS = [
    (r'\b\d+ shot recipe cards\b', f'{CARDS} shot recipe cards'),
    (r'\b\d+ cinematic shot recipes\b', f'{CARDS} cinematic shot recipes'),
    (r'\b\d+ 张镜头配方卡', f'{CARDS} 张镜头配方卡'),
    (r'\b\d+ styles\b', f'{STYLES} styles'),
    (r'\b\d+ motion previews\b', f'{PREVIEWS} motion previews'),
]
for page in ('index.html', 'library.html'):
    path = HERE / page
    text = path.read_text(encoding='utf-8')
    for pat, repl in COUNT_PATTERNS:
        text = re.sub(pat, repl, text)
    # landing hero h1 and its zh/en L10N strings carry the card count too
    text = re.sub(r'(<strong id="statCards">)\d+(</strong>)', rf'\g<1>{CARDS}\g<2>', text)
    text = re.sub(r'(<strong id="statStyles">)\d+(</strong>)', rf'\g<1>{STYLES}\g<2>', text)
    text = re.sub(r'(<strong id="statSamples">)\d+(</strong>)', rf'\g<1>{PREVIEWS}\g<2>', text)
    text = re.sub(r'(<dd id="cardCount">)\d+(</dd>)', rf'\g<1>{CARDS}\g<2>', text)
    text = re.sub(r'(<dd id="styleCount">)\d+(</dd>)', rf'\g<1>{STYLES}\g<2>', text)
    text = re.sub(r'(<dd id="previewCount">)\d+(</dd>)', rf'\g<1>{PREVIEWS}\g<2>', text)
    path.write_text(text, encoding='utf-8')
print(f'normalized counts to {CARDS} cards / {STYLES} styles / {PREVIEWS} previews')

# 2. sitemap.xml
newest = lib['stats']['newest'][:10]
(HERE / 'sitemap.xml').write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    f'  <url><loc>{SITE}/</loc><lastmod>{newest}</lastmod></url>\n'
    f'  <url><loc>{SITE}/library.html</loc><lastmod>{newest}</lastmod></url>\n'
    f'  <url><loc>{SITE}/showcase.html</loc><lastmod>{newest}</lastmod></url>\n'
    '</urlset>\n', encoding='utf-8')

# 3. llms.txt
lines = [
    '# video-shotcraft',
    '',
    '> video-shotcraft is an AI agent skill for Claude Code and Codex that crafts '
    'cinematic product promo videos with Remotion. It ships '
    f'{lib["stats"]["cardCount"]} shot recipe cards covering '
    f'{lib["stats"]["styleCount"]} styles with {lib["stats"]["previewCount"]} motion '
    'previews, reusable Remotion components, SFX assets, a six-stage production '
    'methodology, and a production-ready 36.2-second promo template (Ink Press).',
    '',
    'Each shot recipe card documents a motion technique: purpose, energy level, '
    'suggested duration, tuned parameters, implementation notes, and known pitfalls, '
    'paired with a tuned Remotion (TSX) reference implementation.',
    '',
    '## Docs',
    '',
    f'- [README]({REPO}#readme): what the skill does, quick start, showcase videos',
    f'- [SKILL.md]({REPO}/blob/main/SKILL.md): agent entry point and core production rules',
    f'- [Production pipeline]({REPO}/blob/main/references/pipeline.md): six-stage workflow',
    f'- [Ink Press template]({REPO}/blob/main/template/TEMPLATE.md): complete 36.2s promo template',
    f'- [Gallery landing]({SITE}/): what the skill is, categories overview',
    f'- [Shot library]({SITE}/library.html): browse all shot cards and motion previews',
    '',
    '## Shot recipe cards',
    '',
]
cat_labels = lib.get('categories', {})
by_cat = {}
for card in lib['cards']:
    by_cat.setdefault(card.get('category', 'other'), []).append(card)
for cat_key in ['opening', 'typography', 'ui-entrance', 'camera', 'data',
                'interaction', 'transition', 'rhythm', 'effects', 'outro']:
    if cat_key not in by_cat:
        continue
    label = cat_labels.get(cat_key, {}).get('en', cat_key)
    lines.append(f'### {label}')
    lines.append('')
    for card in by_cat[cat_key]:
        desc = en_desc(card)
        lines.append(f'- [{card["name"]}]({SITE}/library.html#{card["name"]}): {desc}')
    lines.append('')
lines.append('')
(HERE / 'llms.txt').write_text('\n'.join(lines), encoding='utf-8')

print(f'prerendered {len(items)} cards into library.html; wrote sitemap.xml, llms.txt')
