// 单卡快速渲染自检：只打包指定的 demo（不拉起整个工作台索引），渲成 mp4 + 联系表。
//
//   node scripts/check-demo.mjs <demos 下的相对路径.tsx> [...更多] [--out <目录>]
//        [--frames 12,40,88] [--sheet 8] [--scale 1] [--concurrency 3] [--no-video]
//
// 例：node scripts/check-demo.mjs camera/crash-zoom-punch/CrashZoomReal.tsx --frames 10,20
// 产物（默认 ../shot-polish/after/）：
//   <Stem>.mp4           整段渲染（1920×1080 h264）
//   <Stem>.sheet.jpg     均匀取 --sheet 帧（默认 8）拼的联系表（4 列，按时间顺序，帧号见终端输出）
//   <Stem>.f<N>.jpg      --frames 指定帧的全尺寸单帧
// 时长：demo 导出的 *_DURATION / *_DUR 优先，否则取 demo-index.ts 里 gen-index 的推断值。
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i < 0 ? d : args[i + 1];
};
const flag = (k) => args.includes(`--${k}`);
const valued = new Set(["out", "frames", "sheet", "scale", "concurrency"]);
const files = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && valued.has(args[i - 1].slice(2))));
if (!files.length) {
  console.error("usage: node scripts/check-demo.mjs <category/card/Stem.tsx> [...]");
  process.exit(2);
}
const out = path.resolve(opt("out", path.join(ROOT, "..", "shot-polish", "after")));
const stills = opt("frames", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number);
const sheetN = Number(opt("sheet", "8"));
const scale = Number(opt("scale", "1"));
const concurrency = Number(opt("concurrency", "3"));
mkdirSync(out, { recursive: true });

const indexSrc = existsSync(path.join(ROOT, "src/cards/demo-index.ts"))
  ? readFileSync(path.join(ROOT, "src/cards/demo-index.ts"), "utf8")
  : "";
const demos = files.map((f) => {
  const rel = f.replace(/^.*?demos\//, "").replace(/\.tsx$/, "");
  const stem = path.basename(rel);
  if (!existsSync(path.join(ROOT, "..", "demos", `${rel}.tsx`))) throw new Error(`not found: demos/${rel}.tsx`);
  const m = indexSrc.match(new RegExp(`stem: "${stem}"[^\\n]*?duration: (\\d+)`));
  return { rel, stem, fallback: m ? Number(m[1]) : 150 };
});

const tag = demos.map((d) => d.stem).join("_").slice(0, 60) + "_" + process.pid;
const dir = path.join(ROOT, ".check", tag);
mkdirSync(dir, { recursive: true });
writeFileSync(
  path.join(dir, "index.tsx"),
  `import React from "react";
import { Composition, registerRoot } from "remotion";
${demos.map((d, i) => `import * as M${i} from "@demos/${d.rel}";`).join("\n")}
const dur = (m: Record<string, unknown>, fb: number) => {
  const k = Object.keys(m).find((k) => /_(DURATION|DUR)$/.test(k) && typeof m[k] === "number");
  return Math.max(2, Math.round(k ? (m[k] as number) : fb));
};
const Root: React.FC = () => (
  <>
${demos
  .map(
    (d, i) =>
      `    <Composition id="${d.stem}" component={(M${i} as Record<string, unknown>)["${d.stem}"] as React.FC} durationInFrames={dur(M${i} as Record<string, unknown>, ${d.fallback})} fps={30} width={1920} height={1080} />`,
  )
  .join("\n")}
  </>
);
registerRoot(Root);
`,
);

let serveUrl = "";
try {
  serveUrl = await bundle({
    entryPoint: path.join(dir, "index.tsx"),
    publicDir: path.join(ROOT, "public"),
    // 每次入口路径都不同，webpack 持久缓存永远命中不了，只会在 node_modules/.cache 里堆积（实测 19GB）
    enableCaching: false,
    webpackOverride: (c) => ({
      ...c,
      resolve: {
        ...c.resolve,
        symlinks: false,
        alias: { ...(c.resolve?.alias ?? {}), "@demos": path.join(ROOT, "demosrc") },
      },
    }),
  });
  const chromiumOptions = { gl: "angle" };
  for (const d of demos) {
    const composition = await selectComposition({ serveUrl, id: d.stem, chromiumOptions });
    const n = composition.durationInFrames;
    for (const f of stills) {
      await renderStill({
        serveUrl,
        composition,
        frame: Math.min(n - 1, f),
        output: path.join(out, `${d.stem}.f${f}.jpg`),
        imageFormat: "jpeg",
        jpegQuality: 92,
        chromiumOptions,
      });
    }
    if (!flag("no-video")) {
      const mp4 = path.join(out, `${d.stem}.mp4`);
      const t0 = Date.now();
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
        outputLocation: mp4,
        muted: true,
        timeoutInMilliseconds: 120000,
      });
      // 联系表：均匀取 sheetN 帧，4 列
      const picks = Array.from({ length: sheetN }, (_, k) => Math.round(((k + 0.5) * n) / sheetN));
      const sel = picks.map((p) => `eq(n\\,${p})`).join("+");
      execFileSync("ffmpeg", [
        "-v", "error", "-y", "-i", mp4,
        "-vf", `select='${sel}',scale=480:-1,tile=4x${Math.ceil(sheetN / 4)}`,
        "-frames:v", "1", "-vsync", "0", path.join(out, `${d.stem}.sheet.jpg`),
      ]);
      console.log(`${d.stem}: ${n}f → ${mp4} (${((Date.now() - t0) / 1000).toFixed(1)}s), sheet frames ${picks.join(",")}`);
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
  // 打包产物落在系统临时目录，每次 ~20MB，不清会把磁盘吃满
  if (serveUrl) rmSync(serveUrl, { recursive: true, force: true });
}
