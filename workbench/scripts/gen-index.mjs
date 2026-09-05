#!/usr/bin/env node
// 生成静态索引与本机清单（全部不进库，npm install 的 prepare 钩子与 dev/build/studio 前置钩子都会跑）：
//   src/cards/demo-index.ts   demos/ 镜头卡 demo 组件静态索引（webpack/Vite 双兼容——Remotion CLI 不认 import.meta.glob）
//   src/cards/demoMeta.ts     demo → 中文名 / 画廊分类 / 预览视频（由 gallery/api/library.json + translations.js 生成）
//   src/mediaManifest.ts      public/ 素材清单（成片工程 public/ 经符号链接接入）+ 仓库音效库 / BGM 库
//   src/projMeta.ts           已链接成片工程的元数据
// 同时保证 public/ 下的仓库级链接就位：cardpreviews → gallery/media、sfxlib → assets/audio/sfx、
// bgmlib → assets/audio/bgm、textures/live（demo 纹理兜底 → demos/_textures）。
import {
  existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, symlinkSync, unlinkSync, writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const wb = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(wb, "..");
const banner = "// 自动生成，勿手改：node scripts/gen-index.mjs\n";
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// —— 仓库级链接（相对符号链接，幂等）——
const ensureLink = (linkPath, target) => {
  const abs = join(dirname(linkPath), target);
  if (!existsSync(abs)) return false;
  try {
    const st = lstatSync(linkPath);
    if (st.isSymbolicLink()) unlinkSync(linkPath);
    else return true; // 真实文件/目录（成片工程链接进来的）：不动
  } catch { /* 不存在 */ }
  mkdirSync(dirname(linkPath), { recursive: true });
  symlinkSync(target, linkPath);
  return true;
};
const publicDir = join(wb, "public");
mkdirSync(publicDir, { recursive: true });
ensureLink(join(publicDir, "cardpreviews"), "../../gallery/media");
ensureLink(join(publicDir, "sfxlib"), "../../assets/audio/sfx");
ensureLink(join(publicDir, "bgmlib"), "../../assets/audio/bgm");
// demo 纹理兜底：成片工程自己带 public/textures 时以工程为准（不往工程目录里塞东西）
{
  const tex = join(publicDir, "textures");
  let texIsLink = false;
  try { texIsLink = lstatSync(tex).isSymbolicLink(); } catch { /* 无 */ }
  if (!texIsLink && !existsSync(join(tex, "live"))) ensureLink(join(tex, "live"), "../../../demos/_textures");
}

// —— demo 索引：文件导出 `<Stem>: React.FC`（无必填 props 的组件）即接入 ——
// 时长取值链：导出的 `*_DURATION|*_DUR` 常量（与 assets/scripts/smoke-render-demos.py 同口径，最可靠）
//   → 镜头卡 md「时长:」里的 `NNNf` → 画廊 library.json duration 里的 `NNNf`
//   → 文件内未导出的 `const *DUR*|TOTAL|*END = N` → 缺省 150f（clip 可再裁剪/定格，motion-lab 系卡按 clip 长度归一化）
const DUR_PAT = /export const (\w+_DURATION|\w+_DUR)\s*=/;
const MATERIAL_REQUIRED = new Set(["ClipCardLooping"]); // 需要真实 mp4 素材，无法自动生成
const demosDir = join(wb, "demosrc");
const framesIn = (text) => { const m = text && /(\d{2,4})\s*f\b/.exec(text); return m ? Number(m[1]) : 0; };
const cardMdFrames = (category, slug) => {
  try { const md = readFileSync(join(repo, "references/shots", category, `${slug}.md`), "utf8"); const m = /^时长:\s*(.*)$/m.exec(md); return framesIn(m?.[1]); } catch { return 0; }
};
let libForDur = { cards: [] };
try { libForDur = JSON.parse(readFileSync(join(repo, "gallery/api/library.json"), "utf8")); } catch { /* 下面再报 */ }
const libDurFrames = (slug) => framesIn(libForDur.cards.find((c) => c.name === slug)?.duration);
const demos = [];
const walkDemos = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) { walkDemos(p); continue; }
    if (!e.name.endsWith(".tsx")) continue;
    const stem = e.name.replace(/\.tsx$/, "");
    if (MATERIAL_REQUIRED.has(stem)) continue;
    const src = readFileSync(p, "utf8");
    if (!new RegExp(`export const ${stem}\\s*:\\s*React\\.FC\\s*=`).test(src)) continue;
    const rel = relative(demosDir, p).replace(/\.tsx$/, "");
    const [category, slug] = rel.split("/");
    const m = DUR_PAT.exec(src);
    let durExport = m?.[1];
    let duration = 0;
    let durationSource = "export";
    if (!durExport) {
      duration = cardMdFrames(category, slug); durationSource = "card";
      if (!duration) { duration = libDurFrames(slug); durationSource = "gallery"; }
      if (!duration) {
        const im = /^const ([A-Z][A-Z0-9_]*(?:DUR|TOTAL|_END|FRAMES)[A-Z0-9_]*)\s*=\s*(\d+)\s*;/m.exec(src);
        if (im) { duration = Number(im[2]); durationSource = "inline"; }
      }
      if (!duration) { duration = 150; durationSource = "default"; }
    }
    demos.push({ stem, durExport, duration, durationSource, rel, category, slug });
  }
};
walkDemos(demosDir);
{
  const dupes = demos.map((d) => d.stem).filter((s, i, a) => a.indexOf(s) !== i);
  if (dupes.length) throw new Error(`demo 组件名重复（卡 id 用组件名，必须唯一）：${[...new Set(dupes)].join(", ")}`);
}
writeFileSync(
  join(wb, "src/cards/demo-index.ts"),
  banner +
    'import type React from "react";\n' +
    demos
      .map((d, i) => `import { ${d.stem} as c${i}${d.durExport ? `, ${d.durExport} as d${i}` : ""} } from "@demos/${d.rel}";`)
      .join("\n") +
    `\n\nexport type DemoModule = {
  stem: string;
  slug: string;
  component: React.ComponentType<Record<string, unknown>>;
  duration: number;
  /** 时长来源：export=demo 自己导出 / card=镜头卡 md / gallery=画廊 / inline=文件内常量 / default=缺省 150f */
  durationSource: "export" | "card" | "gallery" | "inline" | "default";
};

export const DEMO_MODULES: DemoModule[] = [
` +
    demos
      .map((d, i) => `  { stem: "${d.stem}", slug: "${d.slug}", component: c${i} as unknown as React.ComponentType<Record<string, unknown>>, duration: ${d.durExport ? `d${i}` : d.duration}, durationSource: "${d.durationSource}" },`)
      .join("\n") +
    "\n];\n",
);

// —— demo 元数据：画廊 library.json（分类 / 一句话 / 式）+ translations.js（中文名）——
let lib = { cards: [], categories: {} };
try { lib = JSON.parse(readFileSync(join(repo, "gallery/api/library.json"), "utf8")); } catch { console.warn("gen-index: 读不到 gallery/api/library.json，demo 用英文名"); }
let i18n = { cardsZh: {}, stylesZh: {} };
try {
  const win = {};
  new Function("window", readFileSync(join(repo, "gallery/translations.js"), "utf8"))(win);
  i18n = win.GALLERY_I18N ?? i18n;
} catch { console.warn("gen-index: 读不到 gallery/translations.js，demo 用英文名"); }
const cardBySlug = new Map(lib.cards.map((c) => [c.name, c]));
const mediaDir = join(repo, "gallery/media");
const filesPerSlug = new Map();
for (const d of demos) filesPerSlug.set(d.slug, (filesPerSlug.get(d.slug) ?? 0) + 1);
const meta = {};
for (const d of demos) {
  const card = cardBySlug.get(d.slug);
  const styles = card?.styles ?? [];
  let style = styles.find((s) => norm(s.key) === norm(d.stem));
  if (!style && styles.length === 1 && filesPerSlug.get(d.slug) === 1) style = styles[0];
  const cardZh = i18n.cardsZh?.[d.slug] ?? d.slug;
  const name = style ? (i18n.stylesZh?.[style.key] ?? style.key) : `${cardZh} · ${d.stem}`;
  const catKey = card?.category ?? d.category;
  const preview = style && existsSync(join(mediaDir, `${style.key}.mp4`)) ? `${style.key}.mp4` : undefined;
  meta[d.stem] = {
    name,
    card: cardZh,
    category: lib.categories?.[catKey]?.zh ?? catKey,
    categoryKey: catKey,
    styleKey: style?.key,
    preview,
    summary: style?.description ?? card?.summary,
  };
}
const catOrder = Object.keys(lib.categories ?? {});
const categories = [...new Set(demos.map((d) => meta[d.stem].categoryKey))]
  .sort((a, b) => (catOrder.indexOf(a) + 1 || 99) - (catOrder.indexOf(b) + 1 || 99))
  .map((k) => lib.categories?.[k]?.zh ?? k);
writeFileSync(
  join(wb, "src/cards/demoMeta.ts"),
  banner +
    "// demo 组件名 → 中文名 / 所属镜头卡 / 画廊分类 / 预览视频（gallery/media 本地已拉取时）/ 一句话\n" +
    `export type DemoMeta = { name: string; card: string; category: string; categoryKey: string; styleKey?: string; preview?: string; summary?: string };\n` +
    `export const DEMO_META: Record<string, DemoMeta> = ${JSON.stringify(meta, null, 2)};\n\n` +
    `/** 画廊分类（中文，按画廊顺序），只含有 demo 的分类 */\nexport const DEMO_CATEGORIES: string[] = ${JSON.stringify(categories)};\n`,
);

// —— 素材清单：扫描 public/（成片工程素材经符号链接接入；cardpreviews / sfxlib / bgmlib 单列）——
const KIND = {
  ".mp4": "video", ".webm": "video", ".mov": "video",
  ".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image", ".gif": "image", ".svg": "image",
  ".wav": "audio", ".mp3": "audio", ".m4a": "audio", ".aac": "audio", ".ogg": "audio", ".flac": "audio",
};
const SKIP_TOP = new Set(["cardpreviews", "sfxlib", "bgmlib"]);
const media = [];
const walk = (dir, rel) => {
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    let st;
    try { st = statSync(p); } catch { continue; } // 断掉的符号链接：跳过（statSync 跟随链接）
    if (st.isDirectory()) { if (!rel && SKIP_TOP.has(e.name)) continue; walk(p, r); }
    else {
      const kind = KIND[extname(e.name).toLowerCase()];
      if (kind) media.push({ file: r, dir: rel, name: e.name, kind });
    }
  }
};
walk(publicDir, "");
const listAudio = (sub) => {
  const out = [];
  const base = join(publicDir, sub);
  if (!existsSync(base)) return out;
  const push = (rel, cat) => {
    const name = rel.split("/").pop();
    if (KIND[extname(name).toLowerCase()] === "audio") out.push({ file: `${sub}/${rel}`, cat, name: name.replace(/\.[^.]+$/, "") });
  };
  for (const e of readdirSync(base, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith(".")) continue;
    let isDir = false;
    try { isDir = statSync(join(base, e.name)).isDirectory(); } catch { continue; }
    if (isDir) {
      for (const f of readdirSync(join(base, e.name)).sort()) if (!f.startsWith(".")) push(`${e.name}/${f}`, e.name);
    } else push(e.name, "");
  }
  return out;
};
const sfxLib = listAudio("sfxlib");
const bgmLib = listAudio("bgmlib");
writeFileSync(
  join(wb, "src/mediaManifest.ts"),
  banner +
    "// 成片工程 public/ 素材清单：按本机 public/ 下的链接扫描生成（不进库）\n" +
    'export type MediaItem = { file: string; dir: string; name: string; kind: "video" | "image" | "audio" };\n' +
    `export const MEDIA_ITEMS: MediaItem[] = ${JSON.stringify(media, null, 2)};\n\n` +
    "/** 仓库音效库 assets/audio/sfx/<类别>/（public/sfxlib 链接） */\n" +
    "export type LibAudio = { file: string; cat: string; name: string };\n" +
    `export const SFX_LIB: LibAudio[] = ${JSON.stringify(sfxLib, null, 2)};\n\n` +
    "/** 仓库 BGM 备选 assets/audio/bgm/（public/bgmlib 链接） */\n" +
    `export const BGM_LIB: LibAudio[] = ${JSON.stringify(bgmLib, null, 2)};\n`,
);

// —— 已链接成片工程元数据 ——
const projLink = join(wb, "proj");
const projLinked = existsSync(projLink);
let projDir = "";
let hasManifest = false;
if (projLinked) {
  try { projDir = dirname(realpathSync(projLink)); } catch { projDir = ""; }
  hasManifest = existsSync(join(projLink, "workbench.ts")) || existsSync(join(projLink, "workbench.tsx"));
}
writeFileSync(
  join(wb, "src/projMeta.ts"),
  banner +
    "// 已链接的成片工程：按本机 proj 链接生成（不进库）\n" +
    `export const PROJ_LINKED = ${projLinked};\n` +
    `/** 成片工程根目录（src/ 的上级；未链接为空） */\nexport const PROJ_DIR = ${JSON.stringify(projDir)};\n` +
    `/** 工程是否提供 src/workbench.ts 清单（没有就只能当素材库用，拆解导入不可用） */\nexport const PROJ_HAS_MANIFEST = ${hasManifest};\n`,
);

const srcCount = demos.reduce((a, d) => ((a[d.durationSource] = (a[d.durationSource] ?? 0) + 1), a), {});
console.log(
  `gen-index: ${demos.length} 张 demo 卡（${Object.values(meta).filter((m) => m.preview).length} 张有预览视频；时长来源 ${JSON.stringify(srcCount)}）` +
    `, ${media.length} 个工程素材, 音效库 ${sfxLib.length} / BGM ${bgmLib.length}` +
    `, 成片工程 ${projLinked ? `${projDir}${hasManifest ? "" : "（无 workbench.ts 清单）"}` : "未链接"}`,
);
