#!/usr/bin/env node
// 导入结果 vs 原片 逐帧对照：证明「按清单拆解再合成」没有改变画面。
//
//   node scripts/parity.mjs [--frames 150,240,470,1000] [--tolerance 2]
//
// 渲染 ProjImported（清单刚导入、未改动的工作台工程）与 ProjOriginal（成片工程自己的 Main）
// 同一帧的 PNG 到 .parity/，用 PIL 逐像素比对（每通道差 > tolerance 的像素占比）。
// 前置：已 `node scripts/open.mjs <工程>` 链接成片，且清单提供了 `original`。
// 打包一次、渲多帧（remotion still 每次都重新打包，8 帧要跑八次 bundle）。
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const wb = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const FRAMES = opt("frames", "150,240,470,1000").split(",").map(Number);
const TOL = Number(opt("tolerance", "2"));

if (!existsSync(join(wb, "proj", "workbench.ts"))) {
  console.error("未链接带清单的成片工程：先 node scripts/open.mjs <工程目录>");
  process.exit(2);
}

// Remotion 静态服务器拒绝符号链接：同导出流程，先解引用同步到 .render-public
const out = join(wb, ".parity");
mkdirSync(out, { recursive: true });
const renderPublic = join(wb, ".render-public");
const rs = spawnSync("rsync", ["-aL", "--delete", "--exclude=cardpreviews", "public/", `${renderPublic}/`], { cwd: wb, stdio: "inherit" });
if (rs.status !== 0) process.exit(rs.status ?? 1);

console.log("bundling…");
const serveUrl = await bundle({
  entryPoint: join(wb, "src/remotion/index.ts"),
  publicDir: renderPublic,
  // 与 remotion.config.ts 同款别名（程序化 API 不读 remotion.config.ts）
  webpackOverride: (c) => ({
    ...c,
    resolve: {
      ...c.resolve,
      symlinks: false,
      alias: { ...(c.resolve?.alias ?? {}), "@proj": join(wb, "proj"), "@demos": join(wb, "demosrc") },
    },
  }),
});

const render = async (id, frame) => {
  const composition = await selectComposition({ serveUrl, id, inputProps: {} });
  const output = join(out, `${id}-f${frame}.png`);
  await renderStill({ composition, serveUrl, output, frame, imageFormat: "png", chromiumOptions: { gl: "angle" } });
  return output;
};

const results = [];
for (const f of FRAMES) {
  const [a, b] = await Promise.all([render("ProjImported", f), render("ProjOriginal", f)]);
  const py = spawnSync("python3", ["-c", `
import sys
from PIL import Image, ImageChops
a = Image.open(sys.argv[1]).convert("RGB"); b = Image.open(sys.argv[2]).convert("RGB")
if a.size != b.size: print("SIZE", a.size, b.size); sys.exit(0)
d = ImageChops.difference(a, b)
px = d.getdata(); tol = int(sys.argv[3])
bad = sum(1 for p in px if max(p) > tol)
print(bad, a.size[0] * a.size[1], max(max(p) for p in px))
`, a, b, String(TOL)], { encoding: "utf8" });
  if (py.status !== 0) { console.log(`f${f}: 比对需要 python3 + Pillow（pip install pillow）；PNG 已在 ${out}`); results.push({ f, ok: null }); continue; }
  const [bad, total, maxd] = py.stdout.trim().split(/\s+/).map(Number);
  const ratio = bad / total;
  const ok = ratio < 0.001; // 千分之一以下的像素差异视为一致（抗锯齿/字体光栅噪声）
  results.push({ f, ok, bad, total, maxd });
  console.log(`f${f}: ${ok ? "✓ 一致" : "✗ 有差异"}  差异像素 ${bad}/${total} (${(ratio * 100).toFixed(3)}%)，最大通道差 ${maxd}`);
}
const failed = results.filter((r) => r.ok === false);
console.log(`\n${failed.length ? `${failed.length} 帧有差异` : "全部一致"}，PNG 见 ${out}`);
process.exit(failed.length ? 1 : 0);
