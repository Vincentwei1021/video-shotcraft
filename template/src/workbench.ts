// Workbench manifest — how the film decomposes into editable clips.
//
// The shotcraft workbench (../../workbench, `node scripts/open.mjs <this project>`)
// reads `WORKBENCH` and rebuilds the film as tracks: shots / transitions / captions
// / SFX, each unit exactly where its <Sequence> sits in aifl/Main.tsx. Every table here is
// imported from Main.tsx, so editing the timeline there moves the workbench too —
// there is no second copy of the timing to drift.
//
// Editable properties per unit come from `schema` (text / colour / number / select /
// boolean fields; see workbench/src/cards/types.ts PropField). Scenes that are pure
// constants (SceneOpen, SceneFlyIn …) get no schema: they can be moved, trimmed,
// re-timed and layered, but their inner motion stays as tuned. To open a property,
// lift the constant to a prop with a default and list it in `schema`.
import { createElement, type FC } from 'react';
import {
  AIFL_SHOTS, AIFL_TOTAL, AiflMain, CAPTIONS, FLASH_CUTS, SFX, TITLE_CARDS, parseWords, sfxDuration,
} from './aifl/Main';
import { SceneOpen } from './aifl/live/SceneOpen';
import { SceneFlyIn } from './aifl/live/SceneFlyIn';
import { SceneDetail } from './aifl/live/SceneDetail';
import { ScenePapers } from './aifl/live/ScenePapers';
import { SceneWbr } from './aifl/live/SceneWbr';
import { SceneOutroLive } from './aifl/live/SceneOutroLive';
import { PaperTitleCard } from './aifl/PaperTitleCard';
import { Caption } from './aifl/Caption';
import { FlashCut } from './aifl/FlashCut';

// —— adapters: prop-driven wrappers so the workbench can edit copy without touching the scenes ——
type TitleProps = { text?: string; sub?: string; subDigits?: string; duration?: number };
export const TitleCardUnit: FC<TitleProps> = ({ text = '', sub = '', subDigits = '', duration = 55 }) =>
  createElement(PaperTitleCard, {
    duration,
    words: parseWords(text),
    sub: sub || undefined,
    subDigits: subDigits || undefined,
  });
TitleCardUnit.displayName = 'PaperTitleCard';

type CaptionProps = { text?: string; bottom?: number; duration?: number };
export const CaptionUnit: FC<CaptionProps> = ({ text = '', bottom = 72, duration = 40 }) =>
  createElement(Caption, { text, bottom, duration });
CaptionUnit.displayName = 'Caption';

export const FlashUnit: FC<{ duration?: number }> = ({ duration = 10 }) => createElement(FlashCut, { duration });
FlashUnit.displayName = 'FlashCut';

const TITLE_SCHEMA = [
  { type: 'textarea', key: 'text', label: '文案（*词* = 琥珀强调）', default: '' },
  { type: 'text', key: 'sub', label: '副标（等宽小字）', default: '' },
  { type: 'text', key: 'subDigits', label: '副标滚动数字', default: '' },
] as const;

const CAPTION_SCHEMA = [
  { type: 'text', key: 'text', label: '解说文案', default: '' },
  { type: 'slider', key: 'bottom', label: '底距', default: 72, min: 20, max: 400, step: 2, unit: 'px' },
] as const;

type ShotKey = keyof typeof AIFL_SHOTS;
const scene = (key: ShotKey, label: string, component: FC) => ({
  id: key,
  label,
  from: AIFL_SHOTS[key].from,
  duration: AIFL_SHOTS[key].duration,
  component: component as FC<Record<string, unknown>>,
});
const title = (key: keyof typeof TITLE_CARDS, label: string) => {
  const t = TITLE_CARDS[key] as { text: string; sub?: string; subDigits?: string };
  return {
    id: key,
    label,
    from: AIFL_SHOTS[key].from,
    duration: AIFL_SHOTS[key].duration,
    component: TitleCardUnit as FC<Record<string, unknown>>,
    props: { text: t.text, sub: t.sub ?? '', subDigits: t.subDigits ?? '' },
    schema: [...TITLE_SCHEMA],
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
    scene('morning', 'S1 墨线开场 → 全景 → 主角卡', SceneOpen),
    title('card1', '字卡① one place'),
    scene('table', 'S3 牌堆 → 发牌 → 搜索筛选', SceneFlyIn),
    scene('macro', 'S4 详情页宏观特写', SceneDetail),
    title('card2', '字卡② Paper Radar'),
    scene('chart', 'S6 论文雷达堆叠', ScenePapers),
    title('cardWbr', '字卡③ weekly report'),
    scene('wbr', 'S8 周报自己写自己', SceneWbr),
    title('card3', '字卡④ same page'),
    scene('outro', 'S10 合影组装 → 铅印字标', SceneOutroLive),
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
    props: { text: c.text, bottom: 72 },
    schema: [...CAPTION_SCHEMA],
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
