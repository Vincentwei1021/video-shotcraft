// 批量渲染 demos/ 全部镜头卡（工作台 Root 里 id 为 demo-<Stem> 的合成）为 mp4。
// 一次打包、逐个渲染，适合做改版前后对照或批量刷样片。
//
//   node scripts/render-demos.mjs --out <目录> [--only A,B] [--scale 0.6667] [--concurrency 4]
//                                 [--force] [--bundle <已有打包目录>] [--save-bundle <目录>]
//                                 [--durations <json：{ Stem: 帧数 }>]
//
// - 已存在的 <Stem>.mp4 默认跳过（--force 重渲）；结果写 <out>/render-log.json
// - --save-bundle：打包产物拷到指定目录，之后 --bundle 复用（源码再改也不影响这份快照）
// - --durations：按表覆盖合成时长（改版补了正确时长后，用旧快照按新时长重渲对照）
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, getCompositions } from "@remotion/renderer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i < 0 ? d : args[i + 1];
};
const flag = (k) => args.includes(`--${k}`);

const out = path.resolve(opt("out", "exports/demos"));
const only = opt("only", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const scale = Number(opt("scale", "1"));
const concurrency = Number(opt("concurrency", "4"));
mkdirSync(out, { recursive: true });

const proj = existsSync(path.join(ROOT, "proj", "workbench.ts")) ? "proj" : "proj-stub";
let serveUrl = opt("bundle", "");
if (!serveUrl) {
  console.log("bundling…");
  serveUrl = await bundle({
    entryPoint: path.join(ROOT, "src/remotion/index.ts"),
    publicDir: path.join(ROOT, "public"),
    webpackOverride: (c) => ({
      ...c,
      resolve: {
        ...c.resolve,
        symlinks: false,
        alias: {
          ...(c.resolve?.alias ?? {}),
          "@proj": path.join(ROOT, proj),
          "@demos": path.join(ROOT, "demosrc"),
        },
      },
    }),
  });
  const save = opt("save-bundle", "");
  if (save) {
    cpSync(serveUrl, path.resolve(save), { recursive: true });
    serveUrl = path.resolve(save);
    console.log(`bundle saved → ${serveUrl}`);
  }
}

const chromiumOptions = { gl: "angle" };
const comps = (await getCompositions(serveUrl, { chromiumOptions }))
  .map((c) => c.id)
  .filter((id) => id.startsWith("demo-"))
  .filter((id) => !only.length || only.includes(id.slice(5)));

const durPath = opt("durations", "");
const durations = durPath ? JSON.parse(readFileSync(path.resolve(durPath), "utf8")) : {};
const logPath = path.join(out, "render-log.json");
const log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, "utf8")) : {};
let i = 0;
for (const id of comps) {
  i++;
  const stem = id.slice(5);
  const file = path.join(out, `${stem}.mp4`);
  if (existsSync(file) && !flag("force")) continue;
  const t0 = Date.now();
  try {
    const selected = await selectComposition({ serveUrl, id, chromiumOptions });
    const composition = durations[stem] ? { ...selected, durationInFrames: durations[stem] } : selected;
    await renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      crf: 20,
      imageFormat: "jpeg",
      jpegQuality: 90,
      scale,
      concurrency,
      chromiumOptions,
      outputLocation: file,
      muted: true,
      timeoutInMilliseconds: 120000,
    });
    log[stem] = { ok: true, frames: composition.durationInFrames, ms: Date.now() - t0 };
    console.log(`[${i}/${comps.length}] ${stem} ok ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) {
    log[stem] = { ok: false, error: String(e?.message ?? e).slice(0, 800) };
    console.log(`[${i}/${comps.length}] ${stem} FAILED ${String(e?.message ?? e).slice(0, 200)}`);
  }
  writeFileSync(logPath, JSON.stringify(log, null, 2));
}
const failed = Object.entries(log).filter(([, v]) => !v.ok);
console.log(`done: ${comps.length} comps, ${failed.length} failed`);
