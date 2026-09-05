#!/usr/bin/env node
// 导入结果 vs 原片 逐帧对照：证明「按清单拆解再合成」没有改变画面。
//
//   node scripts/parity.mjs [--frames 150,240,470,1000] [--tolerance 2]
//
// 渲染 ProjImported（清单刚导入、未改动的工作台工程）与 ProjOriginal（成片工程自己的 Main）
// 同一帧的 PNG 到 .parity/，用 PIL 逐像素比对（每通道差 > tolerance 的像素占比）。
// 前置：已 `node scripts/open.mjs <工程>` 链接成片，清单提供了 `original`，本机有 python3 + Pillow。
// 打包一次、渲多帧（remotion still 每次都重新打包，8 帧要跑八次 bundle）。
// 退出码：0 全部一致；1 有帧存在差异；2 无法得出结论（前置缺失 / 比对未执行）——绝不假绿。
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
// 比对依赖先检查，别渲完一堆帧才发现比不了
{
  const r = spawnSync("python3", ["-c", "import PIL"], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error("parity 需要 python3 + Pillow 做像素比对：pip install pillow（或 python3 -m pip install pillow）");
    process.exit(2);
  }
}

// Remotion 静态服务器拒绝符号链接：同导出流程，先解引用同步到 .render-public
const out = join(wb, ".parity");
mkdirSync(out, { recursive: true });
const renderPublic = join(wb, ".render-public");
const rs = spawnSync("rsync", ["-aL", "--delete", "--exclude=cardpreviews", "public/", `${renderPublic}/`], { cwd: wb, stdio: "inherit" });
if (rs.status !== 0) process.exit(2);

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

const PY_DIFF = `
import sys
from PIL import Image, ImageChops
a = Image.open(sys.argv[1]).convert("RGB"); b = Image.open(sys.argv[2]).convert("RGB")
if a.size != b.size:
    print("SIZE", a.size, b.size); sys.exit(3)
d = ImageChops.difference(a, b)
px = d.getdata(); tol = int(sys.argv[3])
bad = sum(1 for p in px if max(p) > tol)
print(bad, a.size[0] * a.size[1], max(max(p) for p in px))
`;

const results = []; // { f, verdict: "same" | "diff" | "inconclusive", detail }
for (const f of FRAMES) {
  const [a, b] = await Promise.all([render("ProjImported", f), render("ProjOriginal", f)]);
  const py = spawnSync("python3", ["-c", PY_DIFF, a, b, String(TOL)], { encoding: "utf8" });
  if (py.status !== 0) {
    const detail = (py.stdout + py.stderr).trim().split("\n").pop() ?? "";
    results.push({ f, verdict: "inconclusive", detail });
    console.log(`f${f}: ? 比对未完成（${detail || `python 退出码 ${py.status}`}）`);
    continue;
  }
  const [bad, total, maxd] = py.stdout.trim().split(/\s+/).map(Number);
  if (![bad, total, maxd].every(Number.isFinite) || total <= 0) {
    results.push({ f, verdict: "inconclusive", detail: `比对输出不可解析：${py.stdout.trim()}` });
    console.log(`f${f}: ? 比对输出不可解析`);
    continue;
  }
  const ratio = bad / total;
  const same = ratio < 0.001; // 千分之一以下的像素差异视为一致（抗锯齿/字体光栅噪声）
  results.push({ f, verdict: same ? "same" : "diff", detail: `${bad}/${total}` });
  console.log(`f${f}: ${same ? "✓ 一致" : "✗ 有差异"}  差异像素 ${bad}/${total} (${(ratio * 100).toFixed(3)}%)，最大通道差 ${maxd}`);
}

const diff = results.filter((r) => r.verdict === "diff");
const inconclusive = results.filter((r) => r.verdict === "inconclusive");
if (inconclusive.length) {
  console.log(`\n${inconclusive.length}/${results.length} 帧未能比对，结论不成立（不是"一致"）。PNG 见 ${out}`);
  process.exit(2);
}
if (diff.length) {
  console.log(`\n${diff.length}/${results.length} 帧有差异，PNG 见 ${out}`);
  process.exit(1);
}
console.log(`\n${results.length} 帧全部一致，PNG 见 ${out}`);
