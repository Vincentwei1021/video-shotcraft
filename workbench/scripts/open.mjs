#!/usr/bin/env node
// 交付后一键打开工作台：链接成片工程 → 生成索引 → 起 dev server → 浏览器打开并自动导入。
//
//   node scripts/open.mjs <成片工程目录> [--port 5198] [--no-open] [--no-import]
//   node scripts/open.mjs                # 不给目录：沿用上次链接的工程
//
// 成片工程目录 = 含 package.json / remotion.config.ts 的那一层，源码在 <目录>/src（或 <目录>/remotion/src）。
// 工程要提供 src/workbench.ts 清单（结构见 references/workbench.md）才能拆解导入；没有清单也能打开，
// 只是素材 tab 没有「导入成片」按钮。
// 链接全是机器本地符号链接（workbench/proj、workbench/public/*），不进库。
import { spawn, spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readlinkSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const wb = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (k) => args.includes(`--${k}`);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const PORT = Number(opt("port", "5198"));
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1] === "--port"));

const isLink = (p) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };
const rmLink = (p) => { if (isLink(p)) unlinkSync(p); };
const log = (s) => console.log(`[workbench] ${s}`);

// —— 1. 定位成片工程 ——
let projectDir = positional[0] ? resolve(positional[0]) : null;
const projLink = join(wb, "proj");
if (!projectDir) {
  if (!isLink(projLink)) { console.error("用法：node scripts/open.mjs <成片工程目录>（首次必须给目录）"); process.exit(2); }
  projectDir = dirname(resolve(wb, readlinkSync(projLink)));
  if (existsSync(join(projectDir, "..", "package.json")) && !existsSync(join(projectDir, "package.json"))) projectDir = dirname(projectDir);
  log(`沿用上次链接的工程：${projectDir}`);
} else {
  if (!existsSync(projectDir)) { console.error(`工程目录不存在：${projectDir}`); process.exit(2); }
  const candidates = [join(projectDir, "src"), join(projectDir, "remotion", "src")];
  const srcDir = candidates.find((d) => existsSync(d) && readdirSync(d).some((f) => /^(Root|index|entry|workbench)\.tsx?$/.test(f)));
  if (!srcDir) { console.error(`在 ${projectDir} 下找不到 Remotion 源码目录（src/ 或 remotion/src/ 需含 Root.tsx / index.ts）`); process.exit(2); }
  const projRoot = dirname(srcDir); // package.json / public 所在层
  const publicSrc = join(projRoot, "public");

  // —— 2. 链接 src → proj，public/* → public/* ——
  rmLink(projLink);
  symlinkSync(srcDir, projLink);
  const pub = join(wb, "public");
  mkdirSync(pub, { recursive: true });
  // 清掉上一部片留下的链接（只删符号链接和我们建的 textures/ 兜底目录，不碰真实文件）
  for (const e of readdirSync(pub)) {
    const p = join(pub, e);
    if (isLink(p)) unlinkSync(p);
    else if (e === "textures" && !isLink(p)) {
      const inner = readdirSync(p);
      if (inner.every((f) => isLink(join(p, f)))) { for (const f of inner) unlinkSync(join(p, f)); rmdirSync(p); }
    }
  }
  let n = 0;
  if (existsSync(publicSrc)) {
    for (const e of readdirSync(publicSrc)) {
      if (e.startsWith(".")) continue;
      symlinkSync(join(publicSrc, e), join(pub, e));
      n++;
    }
  }
  log(`已链接 ${srcDir} → proj，public/ ${n} 项`);
  const manifest = ["workbench.ts", "workbench.tsx"].some((f) => existsSync(join(srcDir, f)));
  if (!manifest) log("⚠ 工程没有 src/workbench.ts 清单：能打开工作台，但无法拆解导入这部片（写法见 references/workbench.md）");
}

// —— 3. 依赖与索引 ——
if (!existsSync(join(wb, "node_modules"))) {
  log("首次使用，安装依赖…");
  const r = spawnSync("npm", ["install", "--ignore-scripts"], { cwd: wb, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
{
  const r = spawnSync(process.execPath, [join(wb, "scripts", "gen-index.mjs")], { cwd: wb, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// —— 4. dev server（已在跑就复用；否则后台起一个）——
const url = `http://localhost:${PORT}/`;
const alive = async () => { try { const r = await fetch(url, { signal: AbortSignal.timeout(1500) }); return r.ok; } catch { return false; } };
// 给了工程目录 = 重新链接：@proj 别名在 vite 配置加载时定死，必须重启我们自己起的 server
if (positional[0] && existsSync(join(wb, ".dev.pid"))) {
  const pid = Number(readFileSync(join(wb, ".dev.pid"), "utf8"));
  try { process.kill(pid); log(`重启 dev server（旧 pid ${pid}）`); } catch { /* 已不在 */ }
  const t0 = Date.now();
  while ((await alive()) && Date.now() - t0 < 10_000) await new Promise((r) => setTimeout(r, 300));
}
if (await alive()) {
  log(`dev server 已在 ${url} 运行（索引已重新生成，浏览器刷新即可）`);
} else {
  const logFile = join(wb, ".dev.log");
  const fd = openSync(logFile, "a");
  const child = spawn(process.execPath, [join(wb, "node_modules", "vite", "bin", "vite.js"), "--port", String(PORT), "--strictPort"], {
    cwd: wb, detached: true, stdio: ["ignore", fd, fd],
  });
  child.unref();
  writeFileSync(join(wb, ".dev.pid"), String(child.pid));
  log(`启动 dev server（pid ${child.pid}，日志 ${logFile}）…`);
  const t0 = Date.now();
  while (!(await alive())) {
    if (Date.now() - t0 > 90_000) { console.error(`dev server 90s 内没起来，看 ${logFile}`); process.exit(1); }
    await new Promise((r) => setTimeout(r, 500));
  }
  log(`dev server 就绪：${url}`);
}

// —— 5. 打开浏览器（?import=project：存档不是这部片时按清单自动导入）——
const openUrl = url + (flag("no-import") ? "" : "?import=project");
if (!flag("no-open")) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [openUrl], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).unref();
}
console.log(`\n工作台：${openUrl}\n停止 dev server：kill $(cat ${join(wb, ".dev.pid")})\n`);
