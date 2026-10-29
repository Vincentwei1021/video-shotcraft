import { create } from "zustand";
import { DEMO_CATEGORY_EN, DEMO_TEXT_RU } from "./cards/demoMeta";
import type { CardDef } from "./cards/types";

/** 工作台界面语言。English 是默认；中文、Русский 可选。
 *  localStorage 记住选择；顶栏下拉框切换。语言只影响展示，不改写工程数据。
 *
 *  两类文案两套机制：
 *  - 界面 chrome（按钮 / 提示 / 弹窗 / 面板标题）：`t(key)` 查 STRINGS 表，键名稳定，两种语言都必须有。
 *  - 内容标签（卡片名 / schema 字段名 / 分类 / 轨道名 / 成片清单里的镜头标签）：卡片和清单里照原文写，
 *    展示时 `tx(text)` 按 LABELS 词典翻译；查不到就原样显示。清单是成片工程自己写的，不强求双语。
 *    demo 卡的英文名 / 英文摘要由 gen-index 直接从画廊数据生成（nameEn / summaryEn），俄文由 workbench/i18n/ru/*.json 生成（DEMO_TEXT_RU）。 */
export type Locale = "en" | "zh" | "ru";
export const LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
  { id: "ru", label: "Русский" },
];
const STORAGE_KEY = "shotcraft-workbench-locale";

const readSaved = (): Locale => {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return v === "zh" || v === "ru" ? v : "en";
  } catch {
    return "en";
  }
};
/** 只由工作台 App 调用（useEffect）：Remotion Studio / 渲染 bundle 也会加载本模块，不能在这里改页面 */
export const applyLocaleToDocument = (l: Locale) => {
  document.documentElement.lang = l === "zh" ? "zh-CN" : l;
  document.title = STRINGS[l]["app.title"];
};

export const useLocale = create<{ locale: Locale; setLocale: (l: Locale) => void }>((set) => ({
  locale: readSaved(),
  setLocale: (l) => {
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* 隐私模式等：只在本次会话生效 */ }
    set({ locale: l });
  },
}));

// —— 界面 chrome ——
const EN = {
  "app.title": "ShotCraft Workbench · Motion Workbench",
  "lang.title": "Interface language",

  "undo": "↩ Undo",
  "undo.title": "Undo (⌘Z)",
  "redo": "↪ Redo",
  "redo.title": "Redo (⇧⌘Z)",
  "export.film": "Export video",
  "export.title": "Render the current project to MP4 with Remotion (saved to workbench/exports/)",
  "export.running": "Exporting {pct}%",
  "export.done": "✓ Exported · Show file",
  "export.revealTitle": "Show the exported MP4 in Finder",
  "export.again": "Export again",
  "export.failedRetry": "Export failed · Retry",
  "export.startFailed": "Export failed to start",
  "exportJson": "Export JSON",
  "import": "Import",
  "import.invalid": "Import failed: not a valid project JSON",
  "reset": "Reset demo",
  "reset.confirm": "Reset to the demo project? Current content will be replaced (undoable).",
  "split.library": "Drag to resize the library",
  "split.inspector": "Drag to resize the properties panel",
  "split.timeline": "Drag to resize the timeline",

  "tl.split": "✂ Split",
  "tl.split.title": "Split the selected clip at the playhead (S)",
  "tl.dup": "⧉ Duplicate",
  "tl.dup.title": "Duplicate the selected clip (⌘D)",
  "tl.del": "🗑 Delete",
  "tl.del.title": "Delete the selected clip (Delete)",
  "tl.addTrack": "＋ Track",
  "tl.addTrack.title": "Add a track (on top)",
  "tl.fit": "⤢ Fit",
  "tl.fit.title": "Zoom to fit all content",
  "tl.zoom": "Zoom",
  "tl.reorder.title": "Drag up or down to reorder tracks (upper tracks cover lower ones)",
  "tl.showTrack": "Show track",
  "tl.hideTrack": "Hide track",
  "tl.deleteTrack": "Delete track",
  "tl.deleteTrack.confirm": "Delete track “{name}” and its {n} clips?",

  "insp.title": "Properties",
  "insp.empty1": "Select a clip on the timeline",
  "insp.empty2": "to edit its text, colors,",
  "insp.empty3": "animation timing, speed and layer.",
  "insp.shortcuts1": "Shortcuts: Space play · S split",
  "insp.shortcuts2": "Delete remove · ⌘Z undo · ⌘D duplicate",
  "insp.contentStyle": "Content & style",
  "insp.timing": "Timing & speed",
  "insp.start": "Start",
  "insp.duration": "Duration",
  "insp.speed": "Speed",
  "insp.inPoint": "In point",
  "insp.restore": "↺ Original duration",
  "insp.restore.title": "Restore the card’s original duration (scaled by the current speed)",
  "insp.fpsMismatch":
    "This card is timed at {src}fps and the project runs at {fps}fps: its duration was converted and speed set to {ratio}× to keep the rhythm. If the card times itself with useVideoConfig().fps (spring etc.), timing still drifts by {inv}×.",
  "insp.layer": "Layer",
  "insp.opacity": "Opacity",
  "insp.scale": "Scale",
  "insp.x": "Offset X",
  "insp.y": "Offset Y",
  "insp.deleteClip": "Delete clip",

  "lib.tab.media": "Media",
  "lib.tab.cards": "Motion",
  "lib.tab.sfx": "Sound",
  "lib.tab.themes": "Themes",
  "lib.cellHint": "Click to preview, drag onto the timeline",
  "lib.tunable": " · tunable",
  "lib.importFilm": "⇣ Import film: {name}",
  "lib.importFilm.title":
    "Split the film by its src/workbench.ts manifest into shot / transition / caption / overlay / SFX / music tracks (undoable)\n{dir}",
  "lib.linkedNoManifest":
    "Linked {dir}, but the project has no src/workbench.ts manifest, so it can’t be split for import (see references/workbench.md)",
  "lib.notLinked": "No film project linked. In workbench/ run: node scripts/open.mjs <project dir>",
  "lib.filmUnits": "Film units (add another copy)",
  "lib.mediaFiles": "Media files (project public/)",
  "lib.video": "Video",
  "lib.image": "Image",
  "lib.projectAudio": "Project audio (public/)",
  "lib.usedIn": "Used ×{n}",
  "lib.unused": "Unused",
  "lib.bgm": "BGM options (assets/audio/bgm)",
  "lib.freesound": "Find sounds on Freesound ↗",
  "lib.freesoundHint": "Ask the agent to download selected sounds into this film. They appear under Project audio after reopening the workbench.",
  "lib.foot.themes": "Theme switches are undoable · saved with the project",
  "lib.foot.cards": "{n} motion cards ({m} tunable)",
  "lib.foot.sfx": " · project audio {n}",
  "lib.foot.units": " · film units {n}",
  "lib.foot.hint": "Click to preview · drag onto the timeline",

  "prev.audioCard": "🔊 Audio card",
  "prev.tag": "Preview",
  "prev.dragHint": "Drag media onto the timeline to add it",
  "prev.back": "✕ Back to project",
  "prev.toStart": "Go to start",
  "prev.playPause": "Play / Pause (Space)",
  "prev.loop": "Loop",

  "theme.aria": "Film theme",
  "theme.presets": "Presets",
  "theme.hint": "Pick a style, then adjust the colors.",
  "theme.none": "This project provides no themes yet.",
  "theme.mine": "My themes",
  "theme.delete.aria": "Delete {name}",
  "theme.deleted": "Deleted “{name}”",
  "theme.applied": "Applied “{name}”",
  "theme.editor": "Replace colors",
  "theme.reset": "Reset preset",
  "theme.name.aria": "Palette name",
  "theme.name.placeholder": "Palette name (optional)",
  "theme.save": "Save palette",
  "theme.import": "Import palette",
  "theme.export": "Export palette",
  "theme.file.aria": "Import palette file",
  "theme.limit": "50 palettes saved. Delete unused ones first.",
  "theme.saved": "Saved “{name}” (this browser only).",
  "theme.saveFailed": "Save failed: browser storage is unavailable. Export the palette as a backup.",
  "theme.exported": "Palette exported as JSON.",
  "theme.tooBig": "Palette file must be under 64 KB.",
  "theme.imported": "Imported and applied. Click “Save palette” to add it to My themes.",
  "theme.importFailed": "Import failed.",
  "theme.customized": "Customized · ",
  "theme.clickHint": "Click a swatch or type a HEX · ",
  "theme.switchResets": "switching presets resets the palette",
  "theme.note": "Applies to preview and export, undoable. Per-clip color edits take precedence.",
  "theme.paperNote": "The paper theme keeps its original screenshots. Pick another preset to edit the full palette.",
  "theme.noPalette": "Shown here once the project provides an editable palette.",
  "theme.pick.aria": "{label} color picker",
  "theme.hex.aria": "{label} hex value",
  "theme.field.page": "Background",
  "theme.field.surface": "Card",
  "theme.field.text": "Text",
  "theme.field.muted": "Secondary text",
  "theme.field.accent": "Accent",
  "theme.field.field": "Light fill",
  "theme.field.border": "Border",

  "palette.custom": "Custom",
  "palette.needTheme": "Select a theme that supports palettes first.",
  "palette.tooBig": "Palette file is too large; choose a JSON under 64 KB.",
  "palette.badJson": "The file is not valid JSON.",
  "palette.badFormat": "Palette file format is invalid.",
  "palette.badVersion": "Choose a palette JSON exported by ShotCraft (version 1).",
  "palette.badTheme": "This project doesn’t support the palette’s base theme.",
  "palette.noColors": "The palette has no colors field.",
  "palette.badColors": "All color fields are required and must use #RRGGBB.",

  "track.transitions": "Transitions",
  "track.captions": "Captions",
  "track.overlays": "Overlays",
  "track.shots": "Shots",
  "track.music": "Music",
  "track.sfx": "SFX",
  "track.background": "Background",
  "track.new": "Track {n}",

  "demo.name": "Untitled project",
} as const;

export type StringKey = keyof typeof EN;

const ZH: Record<StringKey, string> = {
  "app.title": "ShotCraft Workbench · 动效工作台",
  "lang.title": "界面语言",

  "undo": "↩ 撤销",
  "undo.title": "撤销（⌘Z）",
  "redo": "↪ 重做",
  "redo.title": "重做（⇧⌘Z）",
  "export.film": "导出成片",
  "export.title": "用 Remotion 渲染当前工程为 MP4（输出到 workbench/exports/）",
  "export.running": "导出中 {pct}%",
  "export.done": "✓ 已导出 · 显示文件",
  "export.revealTitle": "在 Finder 中显示导出的 MP4",
  "export.again": "再次导出",
  "export.failedRetry": "导出失败 · 重试",
  "export.startFailed": "导出启动失败",
  "exportJson": "导出 JSON",
  "import": "导入",
  "import.invalid": "导入失败：不是合法的工程 JSON",
  "reset": "重置示例",
  "reset.confirm": "重置为演示工程？当前内容会被覆盖（可撤销）。",
  "split.library": "拖拽调整素材库宽度",
  "split.inspector": "拖拽调整属性面板宽度",
  "split.timeline": "拖拽调整时间轨高度",

  "tl.split": "✂ 分割",
  "tl.split.title": "在播放头处分割选中片段（S）",
  "tl.dup": "⧉ 复制",
  "tl.dup.title": "复制选中片段（⌘D）",
  "tl.del": "🗑 删除",
  "tl.del.title": "删除选中片段（Delete）",
  "tl.addTrack": "＋ 轨道",
  "tl.addTrack.title": "新增一条轨道（加在最上层）",
  "tl.fit": "⤢ 适配",
  "tl.fit.title": "缩放到适配全部内容",
  "tl.zoom": "缩放",
  "tl.reorder.title": "按住上下拖动调整轨道层序（上层盖住下层）",
  "tl.showTrack": "显示轨道",
  "tl.hideTrack": "隐藏轨道",
  "tl.deleteTrack": "删除轨道",
  "tl.deleteTrack.confirm": "删除轨道「{name}」及其 {n} 个片段？",

  "insp.title": "属性",
  "insp.empty1": "选中时间轨上的片段后，",
  "insp.empty2": "在这里调整它的文字、颜色、",
  "insp.empty3": "动画节奏、变速与图层属性。",
  "insp.shortcuts1": "快捷键：空格 播放 · S 分割",
  "insp.shortcuts2": "Delete 删除 · ⌘Z 撤销 · ⌘D 复制",
  "insp.contentStyle": "内容与样式",
  "insp.timing": "时间与变速",
  "insp.start": "起点",
  "insp.duration": "时长",
  "insp.speed": "变速",
  "insp.inPoint": "裁入点",
  "insp.restore": "↺ 恢复原始时长",
  "insp.restore.title": "时长恢复为卡片原始时长（按当前变速换算）",
  "insp.fpsMismatch":
    "此卡按 {src}fps 编排，工程 {fps}fps：上轨时已换算时长并以 {ratio}× 变速保持节奏。卡内若按 useVideoConfig().fps 计时（spring 等），节奏仍会偏 {inv}×。",
  "insp.layer": "图层",
  "insp.opacity": "不透明度",
  "insp.scale": "缩放",
  "insp.x": "位移 X",
  "insp.y": "位移 Y",
  "insp.deleteClip": "删除片段",

  "lib.tab.media": "素材",
  "lib.tab.cards": "动效库",
  "lib.tab.sfx": "音效",
  "lib.tab.themes": "主题",
  "lib.cellHint": "点击预览，拖到时间轨添加",
  "lib.tunable": " · 可调参",
  "lib.importFilm": "⇣ 导入成片：{name}",
  "lib.importFilm.title": "把成片按 src/workbench.ts 清单拆成镜头 / 转场 / 字幕 / 叠加层 / 音效 / 音乐的多轨工程（可撤销）\n{dir}",
  "lib.linkedNoManifest": "已链接 {dir}，但工程没有 src/workbench.ts 清单，无法拆解导入（写法见 references/workbench.md）",
  "lib.notLinked": "未接入成片工程。在 workbench/ 目录运行：node scripts/open.mjs <成片工程目录>",
  "lib.filmUnits": "成片单元（可再加一份）",
  "lib.mediaFiles": "素材文件（工程 public/）",
  "lib.video": "视频",
  "lib.image": "图片",
  "lib.projectAudio": "本片音频（工程 public/）",
  "lib.usedIn": "片中×{n}",
  "lib.unused": "未用",
  "lib.bgm": "BGM 备选（assets/audio/bgm）",
  "lib.freesound": "到 Freesound 找音效 ↗",
  "lib.freesoundHint": "让 Agent 把选中的声音下载到本片。重新打开工作台后，即可在本片音频中试听和添加。",
  "lib.foot.themes": "切换主题可撤销 · 随工程自动保存",
  "lib.foot.cards": "动效 {n} 卡（{m} 张可调参）",
  "lib.foot.sfx": " · 本片音频 {n}",
  "lib.foot.units": " · 成片单元 {n}",
  "lib.foot.hint": "点击预览 · 拖拽到时间轨添加",

  "prev.audioCard": "🔊 音频卡",
  "prev.tag": "素材预览",
  "prev.dragHint": "拖拽素材到时间轨即可添加",
  "prev.back": "✕ 返回工程",
  "prev.toStart": "回到开头",
  "prev.playPause": "播放/暂停（空格）",
  "prev.loop": "循环",

  "theme.aria": "影片主题",
  "theme.presets": "预设主题",
  "theme.hint": "选择一套风格，再调整配色。",
  "theme.none": "当前工程尚未提供主题。",
  "theme.mine": "我的主题",
  "theme.delete.aria": "删除 {name}",
  "theme.deleted": "已删除「{name}」",
  "theme.applied": "已应用「{name}」",
  "theme.editor": "替换配色",
  "theme.reset": "恢复预设",
  "theme.name.aria": "配色名称",
  "theme.name.placeholder": "配色名称（可选）",
  "theme.save": "保存配色",
  "theme.import": "导入配色",
  "theme.export": "导出配色",
  "theme.file.aria": "导入配色文件",
  "theme.limit": "已保存 50 套配色，请先删除不再使用的主题。",
  "theme.saved": "已保存「{name}」，仅保存在此浏览器。",
  "theme.saveFailed": "保存失败：浏览器存储不可用，请导出配色备份。",
  "theme.exported": "配色已导出为 JSON。",
  "theme.tooBig": "配色文件不能超过 64 KB。",
  "theme.imported": "已导入并应用，点击「保存配色」可加入我的主题。",
  "theme.importFailed": "导入失败。",
  "theme.customized": "已自定义 · ",
  "theme.clickHint": "点击色块或输入 HEX · ",
  "theme.switchResets": "切换预设会重置配色",
  "theme.note": "同步预览与导出，可撤销。单独调整过的镜头颜色优先保留。",
  "theme.paperNote": "纸质主题保留原始截图质感。选择其他预设后，可调整整套配色。",
  "theme.noPalette": "工程提供可编辑配色后，会在这里显示。",
  "theme.pick.aria": "{label}取色",
  "theme.hex.aria": "{label}色值",
  "theme.field.page": "背景",
  "theme.field.surface": "卡片",
  "theme.field.text": "文字",
  "theme.field.muted": "次要文字",
  "theme.field.accent": "强调色",
  "theme.field.field": "浅色填充",
  "theme.field.border": "边框",

  "palette.custom": "自定义",
  "palette.needTheme": "请先选择支持配色的主题。",
  "palette.tooBig": "配色文件过大，请选择小于 64 KB 的 JSON。",
  "palette.badJson": "文件不是有效的 JSON。",
  "palette.badFormat": "配色文件格式不正确。",
  "palette.badVersion": "请选择 ShotCraft 导出的配色 JSON（版本 1）。",
  "palette.badTheme": "当前工程不支持这份配色的基础主题。",
  "palette.noColors": "配色缺少颜色字段。",
  "palette.badColors": "颜色字段必须完整，并使用 #RRGGBB 格式。",

  "track.transitions": "转场",
  "track.captions": "字幕",
  "track.overlays": "叠加层",
  "track.shots": "镜头",
  "track.music": "音乐",
  "track.sfx": "音效",
  "track.background": "背景",
  "track.new": "轨道 {n}",

  "demo.name": "未命名工程",
};

const RU: Record<StringKey, string> = {
  "app.title": "ShotCraft Workbench · Монтажный стол",
  "lang.title": "Язык интерфейса",

  "undo": "↩ Отменить",
  "undo.title": "Отменить (⌘Z)",
  "redo": "↪ Повторить",
  "redo.title": "Повторить (⇧⌘Z)",
  "export.film": "Экспорт видео",
  "export.title": "Отрендерить текущий проект в MP4 через Remotion (папка workbench/exports/)",
  "export.running": "Экспорт {pct}%",
  "export.done": "✓ Экспортировано · Показать файл",
  "export.revealTitle": "Показать экспортированный MP4 в Finder",
  "export.again": "Экспортировать ещё раз",
  "export.failedRetry": "Ошибка экспорта · Повторить",
  "export.startFailed": "Не удалось начать экспорт",
  "exportJson": "Экспорт JSON",
  "import": "Импорт",
  "import.invalid": "Не удалось импортировать: файл не является корректным JSON проекта",
  "reset": "Сбросить пример",
  "reset.confirm": "Сбросить до демонстрационного проекта? Текущее содержимое будет заменено (можно отменить).",
  "split.library": "Перетащите, чтобы изменить ширину библиотеки",
  "split.inspector": "Перетащите, чтобы изменить ширину панели свойств",
  "split.timeline": "Перетащите, чтобы изменить высоту таймлайна",

  "tl.split": "✂ Разделить",
  "tl.split.title": "Разделить выбранный клип по указателю воспроизведения (S)",
  "tl.dup": "⧉ Дублировать",
  "tl.dup.title": "Дублировать выбранный клип (⌘D)",
  "tl.del": "🗑 Удалить",
  "tl.del.title": "Удалить выбранный клип (Delete)",
  "tl.addTrack": "＋ Дорожка",
  "tl.addTrack.title": "Добавить дорожку (сверху)",
  "tl.fit": "⤢ Вписать",
  "tl.fit.title": "Уместить всё содержимое",
  "tl.zoom": "Масштаб",
  "tl.reorder.title": "Перетащите вверх или вниз, чтобы изменить порядок дорожек (верхние перекрывают нижние)",
  "tl.showTrack": "Показать дорожку",
  "tl.hideTrack": "Скрыть дорожку",
  "tl.deleteTrack": "Удалить дорожку",
  "tl.deleteTrack.confirm": "Удалить дорожку «{name}» и её клипы ({n})?",

  "insp.title": "Свойства",
  "insp.empty1": "Выберите клип на таймлайне,",
  "insp.empty2": "чтобы настроить текст, цвета,",
  "insp.empty3": "ритм анимации, скорость и слой.",
  "insp.shortcuts1": "Клавиши: Пробел — воспроизведение · S — разделить",
  "insp.shortcuts2": "Delete — удалить · ⌘Z — отменить · ⌘D — дублировать",
  "insp.contentStyle": "Содержимое и стиль",
  "insp.timing": "Время и скорость",
  "insp.start": "Начало",
  "insp.duration": "Длительность",
  "insp.speed": "Скорость",
  "insp.inPoint": "Точка входа",
  "insp.restore": "↺ Исходная длительность",
  "insp.restore.title": "Вернуть исходную длительность карточки (с учётом текущей скорости)",
  "insp.fpsMismatch":
    "Карточка рассчитана на {src} fps, а проект — на {fps} fps: длительность пересчитана, скорость {ratio}× сохраняет темп. Если карточка считает время через useVideoConfig().fps (spring и т. п.), темп всё равно смещается в {inv}×.",
  "insp.layer": "Слой",
  "insp.opacity": "Непрозрачность",
  "insp.scale": "Масштаб",
  "insp.x": "Смещение X",
  "insp.y": "Смещение Y",
  "insp.deleteClip": "Удалить клип",

  "lib.tab.media": "Медиа",
  "lib.tab.cards": "Анимация",
  "lib.tab.sfx": "Звук",
  "lib.tab.themes": "Темы",
  "lib.cellHint": "Нажмите для предпросмотра, перетащите на таймлайн",
  "lib.tunable": " · настраиваемая",
  "lib.importFilm": "⇣ Импортировать видео: {name}",
  "lib.importFilm.title":
    "Разобрать видео по манифесту src/workbench.ts на дорожки: планы / переходы / субтитры / слои / SFX / музыка (можно отменить)\n{dir}",
  "lib.linkedNoManifest":
    "Проект {dir} подключён, но в нём нет манифеста src/workbench.ts, поэтому разобрать его для импорта нельзя (см. references/workbench.md)",
  "lib.notLinked": "Видеопроект не подключён. В каталоге workbench/ выполните: node scripts/open.mjs <каталог проекта>",
  "lib.filmUnits": "Элементы видео (добавить ещё экземпляр)",
  "lib.mediaFiles": "Медиафайлы (public/ проекта)",
  "lib.video": "Видео",
  "lib.image": "Изображение",
  "lib.projectAudio": "Аудио проекта (public/)",
  "lib.usedIn": "В видео ×{n}",
  "lib.unused": "Не используется",
  "lib.bgm": "Варианты BGM (assets/audio/bgm)",
  "lib.freesound": "Найти звуки на Freesound ↗",
  "lib.freesoundHint": "Попросите агента загрузить выбранные звуки в проект. После повторного открытия они появятся в аудио проекта.",
  "lib.foot.themes": "Смену темы можно отменить · сохраняется вместе с проектом",
  "lib.foot.cards": "Анимаций: {n} (настраиваемых: {m})",
  "lib.foot.sfx": " · аудио проекта: {n}",
  "lib.foot.units": " · элементов видео: {n}",
  "lib.foot.hint": "Нажмите для предпросмотра · перетащите на таймлайн",

  "prev.audioCard": "🔊 Аудиокарточка",
  "prev.tag": "Предпросмотр",
  "prev.dragHint": "Перетащите медиа на таймлайн, чтобы добавить",
  "prev.back": "✕ Вернуться к проекту",
  "prev.toStart": "В начало",
  "prev.playPause": "Воспроизвести / пауза (Пробел)",
  "prev.loop": "Повтор",

  "theme.aria": "Тема видео",
  "theme.presets": "Готовые темы",
  "theme.hint": "Выберите стиль, затем настройте цвета.",
  "theme.none": "В этом проекте пока нет тем.",
  "theme.mine": "Мои темы",
  "theme.delete.aria": "Удалить {name}",
  "theme.deleted": "Удалена тема «{name}»",
  "theme.applied": "Применена тема «{name}»",
  "theme.editor": "Заменить палитру",
  "theme.reset": "Сбросить тему",
  "theme.name.aria": "Название палитры",
  "theme.name.placeholder": "Название палитры (необязательно)",
  "theme.save": "Сохранить палитру",
  "theme.import": "Импортировать палитру",
  "theme.export": "Экспортировать палитру",
  "theme.file.aria": "Импортировать файл палитры",
  "theme.limit": "Сохранено 50 палитр. Сначала удалите неиспользуемые.",
  "theme.saved": "Палитра «{name}» сохранена (только в этом браузере).",
  "theme.saveFailed": "Не удалось сохранить: хранилище браузера недоступно. Экспортируйте палитру как резервную копию.",
  "theme.exported": "Палитра экспортирована в JSON.",
  "theme.tooBig": "Файл палитры должен быть меньше 64 КБ.",
  "theme.imported": "Импортировано и применено. Нажмите «Сохранить палитру», чтобы добавить её в «Мои темы».",
  "theme.importFailed": "Не удалось импортировать.",
  "theme.customized": "Изменено · ",
  "theme.clickHint": "Нажмите на цвет или введите HEX · ",
  "theme.switchResets": "смена темы сбрасывает палитру",
  "theme.note": "Применяется к предпросмотру и экспорту, можно отменить. Цвета, настроенные в отдельных клипах, сохраняются.",
  "theme.paperNote": "Бумажная тема сохраняет фактуру исходных снимков. Выберите другую тему, чтобы настроить всю палитру.",
  "theme.noPalette": "Появится здесь, когда проект предоставит настраиваемую палитру.",
  "theme.pick.aria": "{label}: выбор цвета",
  "theme.hex.aria": "{label}: HEX-значение",
  "theme.field.page": "Фон",
  "theme.field.surface": "Карточка",
  "theme.field.text": "Текст",
  "theme.field.muted": "Вторичный текст",
  "theme.field.accent": "Акцент",
  "theme.field.field": "Светлая заливка",
  "theme.field.border": "Граница",

  "palette.custom": "Своя",
  "palette.needTheme": "Сначала выберите тему с поддержкой палитр.",
  "palette.tooBig": "Файл палитры слишком большой; выберите JSON меньше 64 КБ.",
  "palette.badJson": "Файл содержит некорректный JSON.",
  "palette.badFormat": "Неверный формат файла палитры.",
  "palette.badVersion": "Выберите JSON палитры, экспортированный из ShotCraft (версия 1).",
  "palette.badTheme": "Этот проект не поддерживает базовую тему палитры.",
  "palette.noColors": "В палитре нет поля colors.",
  "palette.badColors": "Нужны все цвета в формате #RRGGBB.",

  "track.transitions": "Переходы",
  "track.captions": "Субтитры",
  "track.overlays": "Слои",
  "track.shots": "Планы",
  "track.music": "Музыка",
  "track.sfx": "SFX",
  "track.background": "Фон",
  "track.new": "Дорожка {n}",

  "demo.name": "Проект без названия",
};

export const STRINGS: Record<Locale, Record<StringKey, string>> = { en: EN, zh: ZH, ru: RU };

const fill = (s: string, params?: Record<string, string | number>) =>
  params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;

/** 界面文案（非组件代码也能用：读当前语言，不订阅） */
export const t = (key: StringKey, params?: Record<string, string | number>): string =>
  fill(STRINGS[useLocale.getState().locale][key] ?? EN[key], params);

/** 组件里用：订阅语言变化，切换后重渲染 */
export const useT = () => {
  useLocale((s) => s.locale);
  return t;
};

// —— 内容标签词典（zh → en）——
// 键是卡片 / 清单里写的原文；" · " 分隔的复合标签按段翻译。改卡片文案时同步这里，查不到会原样显示（中文），一眼能看出漏了。
const LABELS_ZH_EN: Record<string, string> = {
  // 分类
  "工作台": "Workbench",
  "成片单元": "Film units",
  "音频": "Audio",
  "素材": "Media",
  "背景": "Background",
  "动效库": "Motion library",
  // 轨道 / 单元种类
  "转场": "Transitions",
  "字幕": "Captions",
  "叠加层": "Overlays",
  "镜头": "Shots",
  "音乐": "Music",
  "音效": "SFX",
  "轨道": "Track",
  "组件": "Component",
  // 工作台原生卡
  "通用文字": "Basic text",
  "视频素材": "Video clip",
  "图片素材": "Image",
  "纸底": "Paper",
  "暖白": "Warm white",
  "纯白": "Pure white",
  "墨黑": "Ink black",
  "中心提亮": "Center glow",
  "字卡": "Title card",
  "解说字幕条": "Caption strip",
  "暖白闪转场": "Warm flash cut",
  "衬线大字逐词压印入场，*词* 标琥珀斜体强调，下划线生长；尾 8 帧淡出": "Large serif title presses in word by word, *word* gets amber italic emphasis, underline grows; fades out over the last 8 frames",
  "底部通栏等宽解说条，琥珀方点引导；透明底，叠在任何镜头上": "Full-width monospace caption bar at the bottom with an amber square bullet; transparent background, layers over any shot",
  "放在硬切点前 5 帧、跨骑两侧各 5 帧；只盖接缝，不当装饰光效": "Place 5 frames before a hard cut, straddling 5 frames on each side; it only hides the seam, not a decorative light effect",
  // schema 字段 / 选项
  "底色": "Fill color",
  "亮斑强度": "Glow strength",
  "文字内容": "Text",
  "字号": "Font size",
  "文字颜色": "Text color",
  "字重": "Weight",
  "常规 400": "Regular 400",
  "半粗 600": "Semibold 600",
  "加粗 700": "Bold 700",
  "特粗 900": "Black 900",
  "字距": "Letter spacing",
  "对齐": "Align",
  "左对齐": "Left",
  "居中": "Center",
  "右对齐": "Right",
  "入场动画": "Entrance",
  "淡入上浮": "Fade up",
  "砸出": "Slam",
  "遮罩揭示": "Mask reveal",
  "打字机": "Typewriter",
  "纯淡入": "Fade",
  "无": "None",
  "入场延迟": "Delay",
  "动画时长": "Animation duration",
  "背景色": "Background color",
  "透明背景": "Transparent background",
  "文件（public/ 下）": "File (under public/)",
  "适配": "Fit",
  "完整显示": "Contain",
  "铺满裁切": "Cover",
  "静音": "Muted",
  "音量": "Volume",
  "文案（*词* = 强调）": "Copy (*word* = accent)",
  "文案（*词* = 琥珀强调）": "Copy (*word* = amber accent)",
  "副标（等宽小字）": "Subtitle (mono)",
  "副标滚动数字": "Subtitle digits",
  "墨色": "Ink",
  "强调色": "Accent",
  "琥珀强调色": "Amber accent",
  "下划线宽": "Underline width",
  "文案": "Copy",
  "解说文案": "Caption copy",
  "底距": "Bottom offset",
  "文字色": "Text color",
  "方点色": "Dot color",
  "全大写": "Uppercase",
  "峰值不透明度": "Peak opacity",
  "暖白色": "Warm white",
  // 模板成片清单（template/src/workbench.ts）的字段与镜头标签
  "字标": "Wordmark",
  "字标字号": "Wordmark size",
  "眉题（打字机）": "Kicker (typewriter)",
  "眉题字号": "Kicker size",
  "悬浮批注": "Floating note",
  "上行": "line 1",
  "下行（斜体+高亮）": "line 2 (italic + highlight)",
  "批注字号": "Note size",
  "灰墨（眉题）": "Muted ink (kicker)",
  "灰墨": "Muted ink",
  "副标灰墨": "Subtitle muted ink",
  "搜索框输入的词": "Search query",
  "琥珀强调色（光标 / 点击涟漪 / 选中框）": "Amber accent (cursor / ripple / selection)",
  "嵌入接缝色": "Seam color",
  "右上角标题": "Top-right title",
  "右上角副标": "Top-right subtitle",
  "右上角眉题": "Top-right kicker",
  "计数器字号": "Counter size",
  "左栏往期周报（每行：周|日期|标题）": "Past weeks (one per line: week|date|title)",
  "副标": "Subtitle",
  "副标字号": "Subtitle size",
  "S1 墨线开场 → 全景 → 主角卡": "S1 Ink line open → wide → hero card",
  "字卡① one place": "Title ① one place",
  "S3 牌堆 → 发牌 → 搜索筛选": "S3 Pile → deal → search & filter",
  "S4 详情页宏观特写": "S4 Detail page macro",
  "字卡② Paper Radar": "Title ② Paper Radar",
  "S6 论文雷达堆叠": "S6 Paper radar stack",
  "字卡③ weekly report": "Title ③ weekly report",
  "S8 周报自己写自己": "S8 Weekly report writes itself",
  "字卡④ same page": "Title ④ same page",
  "S10 合影组装 → 铅印字标": "S10 Group shot → letterpress wordmark",
  // 主题预设名的中文半段（英文半段就是英文名，见 themeLabel）
  "纸质": "Paper",
  "现代浅色": "Modern light",
  "暗黑": "Midnight",
  "清新鼠尾草": "Sage",
  "珊瑚点缀": "Coral",
  "柔和鸢尾": "Iris",
  "深海蓝": "Deep ocean",
  "黑曜紫": "Obsidian violet",
  "复古牛皮纸": "Vintage kraft",
  ...DEMO_CATEGORY_EN,
};
const LABELS_ZH_RU: Record<string, string> = {
  "工作台": "Встроенные",
  "成片单元": "Элементы видео",
  "音频": "Аудио",
  "素材": "Медиа",
  "背景": "Фон",
  "动效库": "Библиотека анимации",
  "转场": "Переходы",
  "字幕": "Субтитры",
  "叠加层": "Слои",
  "镜头": "Планы",
  "音乐": "Музыка",
  "音效": "SFX",
  "轨道": "Дорожка",
  "组件": "Компонент",
  "通用文字": "Текст",
  "视频素材": "Видеоклип",
  "图片素材": "Изображение",
  "纸底": "Бумага",
  "暖白": "Тёплый белый",
  "纯白": "Чистый белый",
  "墨黑": "Чернильный чёрный",
  "中心提亮": "Свечение в центре",
  "字卡": "Титр",
  "解说字幕条": "Полоса субтитров",
  "暖白闪转场": "Тёплая вспышка-переход",
  "衬线大字逐词压印入场，*词* 标琥珀斜体强调，下划线生长；尾 8 帧淡出": "Крупный антиквенный титр впечатывается по словам, *слово* выделяется янтарным курсивом, растёт подчёркивание; последние 8 кадров — затухание",
  "底部通栏等宽解说条，琥珀方点引导；透明底，叠在任何镜头上": "Полоса пояснений моноширинным шрифтом во всю ширину внизу, с янтарным квадратным маркером; прозрачный фон, ложится поверх любого плана",
  "放在硬切点前 5 帧、跨骑两侧各 5 帧；只盖接缝，不当装饰光效": "Ставится за 5 кадров до жёсткой склейки и захватывает по 5 кадров с каждой стороны; только прячет шов, а не служит декоративным световым эффектом",
  "底色": "Цвет заливки",
  "亮斑强度": "Сила свечения",
  "文字内容": "Текст",
  "字号": "Размер шрифта",
  "文字颜色": "Цвет текста",
  "字重": "Насыщенность",
  "常规 400": "Обычный 400",
  "半粗 600": "Полужирный 600",
  "加粗 700": "Жирный 700",
  "特粗 900": "Сверхжирный 900",
  "字距": "Межбуквенный интервал",
  "对齐": "Выравнивание",
  "左对齐": "По левому краю",
  "居中": "По центру",
  "右对齐": "По правому краю",
  "入场动画": "Анимация появления",
  "淡入上浮": "Появление снизу",
  "砸出": "Удар",
  "遮罩揭示": "Раскрытие маской",
  "打字机": "Печатная машинка",
  "纯淡入": "Проявление",
  "无": "Нет",
  "入场延迟": "Задержка",
  "动画时长": "Длительность анимации",
  "背景色": "Цвет фона",
  "透明背景": "Прозрачный фон",
  "文件（public/ 下）": "Файл (в public/)",
  "适配": "Вписывание",
  "完整显示": "Целиком",
  "铺满裁切": "Заполнить с обрезкой",
  "静音": "Без звука",
  "音量": "Громкость",
  "文案（*词* = 强调）": "Текст (*слово* = акцент)",
  "文案（*词* = 琥珀强调）": "Текст (*слово* = янтарный акцент)",
  "副标（等宽小字）": "Подзаголовок (моноширинный)",
  "副标滚动数字": "Цифры подзаголовка",
  "墨色": "Чернила",
  "强调色": "Акцент",
  "琥珀强调色": "Янтарный акцент",
  "下划线宽": "Ширина подчёркивания",
  "文案": "Текст",
  "解说文案": "Текст субтитров",
  "底距": "Отступ снизу",
  "文字色": "Цвет текста",
  "方点色": "Цвет маркера",
  "全大写": "Заглавными",
  "峰值不透明度": "Пиковая непрозрачность",
  "暖白色": "Тёплый белый",
  "字标": "Логотип",
  "字标字号": "Размер логотипа",
  "眉题（打字机）": "Надзаголовок (печатная машинка)",
  "眉题字号": "Размер надзаголовка",
  "悬浮批注": "Плавающая пометка",
  "上行": "строка 1",
  "下行（斜体+高亮）": "строка 2 (курсив + выделение)",
  "批注字号": "Размер пометки",
  "灰墨（眉题）": "Серые чернила (надзаголовок)",
  "灰墨": "Серые чернила",
  "副标灰墨": "Серые чернила подзаголовка",
  "搜索框输入的词": "Поисковый запрос",
  "琥珀强调色（光标 / 点击涟漪 / 选中框）": "Янтарный акцент (курсор / волна клика / выделение)",
  "嵌入接缝色": "Цвет шва",
  "右上角标题": "Заголовок справа вверху",
  "右上角副标": "Подзаголовок справа вверху",
  "右上角眉题": "Надзаголовок справа вверху",
  "计数器字号": "Размер счётчика",
  "左栏往期周报（每行：周|日期|标题）": "Прошлые недели (по строке: неделя|дата|заголовок)",
  "副标": "Подзаголовок",
  "副标字号": "Размер подзаголовка",
  "S1 墨线开场 → 全景 → 主角卡": "S1 Чернильная линия → общий план → главная карточка",
  "字卡① one place": "Титр ① one place",
  "S3 牌堆 → 发牌 → 搜索筛选": "S3 Стопка → раздача → поиск и фильтр",
  "S4 详情页宏观特写": "S4 Макроплан страницы деталей",
  "字卡② Paper Radar": "Титр ② Paper Radar",
  "S6 论文雷达堆叠": "S6 Стопка Paper Radar",
  "字卡③ weekly report": "Титр ③ weekly report",
  "S8 周报自己写自己": "S8 Отчёт пишет себя сам",
  "字卡④ same page": "Титр ④ same page",
  "S10 合影组装 → 铅印字标": "S10 Общее фото → логотип высокой печатью",
  "纸质": "Бумага",
  "现代浅色": "Современная светлая",
  "暗黑": "Полночь",
  "清新鼠尾草": "Шалфей",
  "珊瑚点缀": "Коралл",
  "柔和鸢尾": "Ирис",
  "深海蓝": "Глубокий океан",
  "黑曜紫": "Обсидиановый фиолетовый",
  "复古牛皮纸": "Винтажный крафт",
  ...DEMO_TEXT_RU,
};
const TO_ZH: Record<string, string> = {};
for (const dict of [LABELS_ZH_RU, LABELS_ZH_EN])
  for (const [zh, other] of Object.entries(dict)) TO_ZH[other] = zh;
const FROM_ZH: Record<Exclude<Locale, "zh">, Record<string, string>> = { en: LABELS_ZH_EN, ru: LABELS_ZH_RU };
/** 任意语言的已知标签 → 目标语言；查不到返回 undefined */
const lookup = (s: string, to: Locale): string | undefined => {
  const zh = s in LABELS_ZH_EN || s in LABELS_ZH_RU ? s : TO_ZH[s];
  if (!zh) return undefined;
  return to === "zh" ? zh : FROM_ZH[to][zh] ?? zh;
};
// 带数字的标签：「轨道 3」「音效 2」「Track 3」「Дорожка 3」→ 前缀查词典、数字照抄；闪白转场标签单独一条
const FLASH: Record<Locale, string> = { zh: "闪白 @$1f", en: "Flash @$1f", ru: "Вспышка @$1f" };
const FLASH_RE = /^(?:闪白|Flash|Вспышка) @(\d+)f$/;
const NUMBERED = /^(.*\S) (\d+)$/;

const translateSegment = (s: string, to: Locale): string => {
  const hit = lookup(s, to);
  if (hit) return hit;
  if (FLASH_RE.test(s)) return s.replace(FLASH_RE, FLASH[to]);
  const m = NUMBERED.exec(s);
  const prefix = m && lookup(m[1], to);
  if (prefix) return `${prefix} ${m[2]}`;
  return s;
};

/** 内容标签按当前语言展示：中 / 英 / 俄任一已知写法 → 当前语言；查不到原样返回。" · " 复合标签逐段翻译。 */
export const tx = (s: string | undefined | null): string => {
  if (!s) return "";
  const to = useLocale.getState().locale;
  const whole = translateSegment(s, to);
  if (whole !== s || !s.includes(" · ")) return whole;
  return s.split(" · ").map((seg) => translateSegment(seg, to)).join(" · ");
};
export const useTx = () => {
  useLocale((s) => s.locale);
  return tx;
};

/** 卡片名 / 摘要：demo 卡有画廊生成的英文（nameEn / summaryEn）与俄文（DEMO_TEXT_RU），其余走词典 */
export const cardName = (card: Pick<CardDef, "name" | "nameEn">): string => {
  const l = useLocale.getState().locale;
  if (l === "en" && card.nameEn) return card.nameEn;
  return tx(card.name);
};
export const cardSummary = (card: Pick<CardDef, "summary" | "summaryEn">): string | undefined => {
  const l = useLocale.getState().locale;
  if (l === "en") return card.summaryEn ?? (card.summary ? tx(card.summary) : undefined);
  if (l === "ru") return card.summary ? (DEMO_TEXT_RU[card.summary] ?? card.summaryEn ?? tx(card.summary)) : undefined;
  return card.summary;
};

/** 主题预设名写成「中文 · English」：中文界面取前半，英文界面取后半，俄文按中文半段查词典；单段名走词典 */
export const themeLabel = (label: string): string => {
  const parts = label.split(" · ");
  if (parts.length === 2) {
    const l = useLocale.getState().locale;
    if (l === "ru") return LABELS_ZH_RU[parts[0]] ?? parts[1];
    return l === "zh" ? parts[0] : parts[1];
  }
  return tx(label);
};
