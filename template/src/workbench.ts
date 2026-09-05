// Workbench manifest — how the film decomposes into editable clips.
//
// The shotcraft workbench (../../workbench, `node scripts/open.mjs <this project>`)
// reads `WORKBENCH` and rebuilds the film as tracks: shots / transitions / captions
// / SFX, each unit exactly where its <Sequence> sits in aifl/Main.tsx. Every table here is
// imported from Main.tsx, so editing the timeline there moves the workbench too —
// there is no second copy of the timing to drift.
//
// Editable properties per unit come from `schema` (text / colour / number / select /
// boolean fields; see workbench/src/cards/types.ts PropField). Each scene exports its
// `*_DEFAULTS` (copy, sizes, palette) and reads them as props with defaults, so the
// schema defaults below are the same object the scene renders with — the inspector
// shows exactly what is on screen, and an untouched import renders the original film.
// Motion timing (cues, eases, camera keys) is deliberately NOT exposed.
import { createElement, type FC } from 'react';
import {
  AIFL_SHOTS, AIFL_TOTAL, AiflMain, CAPTIONS, FLASH_CUTS, SFX, TITLE_CARDS, parseWords, sfxDuration,
} from './aifl/Main';
import { SceneOpen, SCENE_OPEN_DEFAULTS } from './aifl/live/SceneOpen';
import { SceneFlyIn, SCENE_FLYIN_DEFAULTS } from './aifl/live/SceneFlyIn';
import { SceneDetail, SCENE_DETAIL_DEFAULTS } from './aifl/live/SceneDetail';
import { ScenePapers, SCENE_PAPERS_DEFAULTS } from './aifl/live/ScenePapers';
import { SceneWbr, SCENE_WBR_DEFAULTS } from './aifl/live/SceneWbr';
import { SceneOutroLive, SCENE_OUTRO_DEFAULTS } from './aifl/live/SceneOutroLive';
import { PaperTitleCard, TITLE_CARD_DEFAULTS } from './aifl/PaperTitleCard';
import { Caption, CAPTION_DEFAULTS } from './aifl/Caption';
import { FlashCut } from './aifl/FlashCut';

// —— schema field helpers (plain data; shape = workbench PropField) ——
type Field = Record<string, unknown> & { type: string; key: string; label: string; default: unknown };
const text = (key: string, label: string, def: string): Field => ({ type: 'text', key, label, default: def });
const textarea = (key: string, label: string, def: string): Field => ({ type: 'textarea', key, label, default: def });
const color = (key: string, label: string, def: string): Field => ({ type: 'color', key, label, default: def });
const size = (key: string, label: string, def: number, min: number, max: number): Field => ({
  type: 'slider', key, label, default: def, min, max, step: 1, unit: 'px',
});

// —— adapters: prop-driven wrappers so the workbench can edit copy without touching the scenes ——
type TitleProps = Partial<typeof TITLE_CARD_DEFAULTS> & { text?: string; sub?: string; subDigits?: string; duration?: number };
export const TitleCardUnit: FC<TitleProps> = ({ text = '', sub = '', subDigits = '', duration = 55, ...style }) =>
  createElement(PaperTitleCard, {
    duration,
    words: parseWords(text),
    sub: sub || undefined,
    subDigits: subDigits || undefined,
    ...style,
  });
TitleCardUnit.displayName = 'PaperTitleCard';

type CaptionProps = Partial<typeof CAPTION_DEFAULTS> & { text?: string; bottom?: number; duration?: number };
export const CaptionUnit: FC<CaptionProps> = ({ text = '', bottom = 72, duration = 40, ...style }) =>
  createElement(Caption, { text, bottom, duration, ...style });
CaptionUnit.displayName = 'Caption';

export const FlashUnit: FC<{ duration?: number }> = ({ duration = 10 }) => createElement(FlashCut, { duration });
FlashUnit.displayName = 'FlashCut';

// —— schemas: one per parametrized component; defaults come straight from the *_DEFAULTS objects ——
const D = {
  open: SCENE_OPEN_DEFAULTS,
  flyin: SCENE_FLYIN_DEFAULTS,
  detail: SCENE_DETAIL_DEFAULTS,
  papers: SCENE_PAPERS_DEFAULTS,
  wbr: SCENE_WBR_DEFAULTS,
  outro: SCENE_OUTRO_DEFAULTS,
  title: TITLE_CARD_DEFAULTS,
  caption: CAPTION_DEFAULTS,
};

const SCHEMAS = {
  open: [
    text('wordmark', '字标', D.open.wordmark),
    size('wordmarkSize', '字标字号', D.open.wordmarkSize, 60, 200),
    text('kicker', '眉题（打字机）', D.open.kicker),
    size('kickerSize', '眉题字号', D.open.kickerSize, 14, 48),
    text('noteLine1', '悬浮批注 · 上行', D.open.noteLine1),
    text('noteLine2', '悬浮批注 · 下行（斜体+高亮）', D.open.noteLine2),
    size('noteSize', '批注字号', D.open.noteSize, 20, 64),
    color('ink', '墨色', D.open.ink),
    color('amber', '琥珀强调色', D.open.amber),
    color('muted', '灰墨（眉题）', D.open.muted),
    color('paper', '纸底', D.open.paper),
  ],
  flyin: [
    text('query', '搜索框输入的词', D.flyin.query),
    color('accent', '琥珀强调色（光标 / 点击涟漪 / 选中框）', D.flyin.accent),
  ],
  detail: [color('accent', '嵌入接缝色', D.detail.accent)],
  papers: [
    text('title', '右上角标题', D.papers.title),
    text('subtitle', '右上角副标', D.papers.subtitle),
    size('counterSize', '计数器字号', D.papers.counterSize, 48, 160),
    color('amber', '琥珀强调色', D.papers.amber),
    color('muted', '灰墨', D.papers.muted),
  ],
  wbr: [
    text('kicker', '右上角眉题', D.wbr.kicker),
    size('kickerSize', '眉题字号', D.wbr.kickerSize, 14, 48),
    textarea('pastWeeks', '左栏往期周报（每行：周|日期|标题）', D.wbr.pastWeeks),
    color('amber', '琥珀强调色', D.wbr.amber),
    color('muted', '灰墨', D.wbr.muted),
  ],
  outro: [
    text('wordmark', '字标', D.outro.wordmark),
    size('wordmarkSize', '字标字号', D.outro.wordmarkSize, 60, 220),
    text('tagline', '副标', D.outro.tagline),
    size('taglineSize', '副标字号', D.outro.taglineSize, 14, 48),
    color('ink', '墨色', D.outro.ink),
    color('amber', '琥珀强调色', D.outro.amber),
    color('muted', '灰墨', D.outro.muted),
  ],
  title: [
    textarea('text', '文案（*词* = 琥珀强调）', ''),
    text('sub', '副标（等宽小字）', ''),
    text('subDigits', '副标滚动数字', ''),
    size('fontSize', '字号', D.title.fontSize, 60, 160),
    color('ink', '墨色', D.title.ink),
    color('accent', '强调色', D.title.accent),
    color('muted', '副标灰墨', D.title.muted),
    color('paper', '纸底', D.title.paper),
  ],
  caption: [
    text('text', '解说文案', ''),
    { type: 'slider', key: 'bottom', label: '底距', default: 72, min: 20, max: 400, step: 2, unit: 'px' } as Field,
    size('fontSize', '字号', D.caption.fontSize, 14, 48),
    color('color', '文字色', D.caption.color),
    color('accent', '方点色', D.caption.accent),
  ],
};

type ShotKey = keyof typeof AIFL_SHOTS;
const scene = <T extends Record<string, unknown>>(
  key: ShotKey, label: string, component: FC<Partial<T>>, defaults: T, schema: Field[],
) => ({
  id: key,
  label,
  from: AIFL_SHOTS[key].from,
  duration: AIFL_SHOTS[key].duration,
  component: component as FC<Record<string, unknown>>,
  props: { ...defaults },
  schema,
});
const title = (key: keyof typeof TITLE_CARDS, label: string) => {
  const t = TITLE_CARDS[key] as { text: string; sub?: string; subDigits?: string };
  return {
    id: key,
    label,
    from: AIFL_SHOTS[key].from,
    duration: AIFL_SHOTS[key].duration,
    component: TitleCardUnit as FC<Record<string, unknown>>,
    props: { text: t.text, sub: t.sub ?? '', subDigits: t.subDigits ?? '', ...D.title },
    schema: SCHEMAS.title,
    durationProp: 'duration',
    cardId: 'title-card',
    cardName: '字卡 · Ink Press',
    accent: '#b5651d',
  };
};

export const WORKBENCH = {
  name: 'Ink Press · AIFL promo',
  fps: 30,
  width: 1920,
  height: 1080,
  total: AIFL_TOTAL,
  background: '#f2eee6',
  shots: [
    scene('morning', 'S1 墨线开场 → 全景 → 主角卡', SceneOpen, D.open, SCHEMAS.open),
    title('card1', '字卡① one place'),
    scene('table', 'S3 牌堆 → 发牌 → 搜索筛选', SceneFlyIn, D.flyin, SCHEMAS.flyin),
    scene('macro', 'S4 详情页宏观特写', SceneDetail, D.detail, SCHEMAS.detail),
    title('card2', '字卡② Paper Radar'),
    scene('chart', 'S6 论文雷达堆叠', ScenePapers, D.papers, SCHEMAS.papers),
    title('cardWbr', '字卡③ weekly report'),
    scene('wbr', 'S8 周报自己写自己', SceneWbr, D.wbr, SCHEMAS.wbr),
    title('card3', '字卡④ same page'),
    scene('outro', 'S10 合影组装 → 铅印字标', SceneOutroLive, D.outro, SCHEMAS.outro),
  ],
  transitions: FLASH_CUTS.map((cut, i) => ({
    id: `flash-${i + 1}`,
    label: `闪白 @${cut}f`,
    from: cut - 5,
    duration: 10,
    component: FlashUnit as FC<Record<string, unknown>>,
    durationProp: 'duration',
    cardId: 'flash-cut',
    cardName: '暖白闪转场',
  })),
  captions: CAPTIONS.map((c, i) => ({
    id: `caption-${i + 1}`,
    label: c.text,
    from: c.from,
    duration: c.duration,
    component: CaptionUnit as FC<Record<string, unknown>>,
    props: { text: c.text, bottom: 72, ...D.caption },
    schema: SCHEMAS.caption,
    durationProp: 'duration',
    cardId: 'caption',
    cardName: '解说字幕条',
  })),
  sfx: SFX.map((s) => ({
    from: s.from,
    duration: sfxDuration(s),
    src: `audio/${s.src}`,
    volume: s.volume,
  })),
  // z-order of the overlay layers, top → bottom (flash cuts sit above the captions in Main.tsx)
  order: ['transitions', 'captions', 'overlays'] as const,
  // the untouched film, registered in the workbench Studio as `ProjOriginal` for frame-by-frame comparison
  original: AiflMain as FC<Record<string, unknown>>,
};
