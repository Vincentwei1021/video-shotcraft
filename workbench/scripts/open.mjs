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
//
// dev server 管理：本脚本起的 server 记 pid 到 .dev.pid。@proj 别名在 vite 配置加载时定死，
// 所以「给了工程目录 = 重新链接」必须重启 server——只重启身份核实过的自家进程；端口被别的
// server（如手动 npm run dev）占着时直接报错，不会假装"刷新即可"。
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readlinkSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync,
} from "node:fs";
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
const die = (s, code = 1) => { console.error(`[workbench] ${s}`); process.exit(code); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// —— 1. 定位成片工程 ——
const relink = !!positional[0];
let projectDir = relink ? resolve(positional[0]) : null;
const projLink = join(wb, "proj");
if (!relink) {
  if (!isLink(projLink)) die("用法：node scripts/open.mjs <成片工程目录>（首次必须给目录）", 2);
  projectDir = dirname(resolve(wb, readlinkSync(projLink)));
  if (existsSync(join(projectDir, "..", "package.json")) && !existsSync(join(projectDir, "package.json"))) projectDir = dirname(projectDir);
  log(`沿用上次链接的工程：${projectDir}`);
} else {
  if (!existsSync(projectDir)) die(`工程目录不存在：${projectDir}`, 2);
  const candidates = [join(projectDir, "src"), join(projectDir, "remotion", "src")];
  const srcDir = candidates.find((d) => existsSync(d) && readdirSync(d).some((f) => /^(Root|index|entry|workbench)\.tsx?$/.test(f)));
  if (!srcDir) die(`在 ${projectDir} 下找不到 Remotion 源码目录（src/ 或 remotion/src/ 需含 Root.tsx / index.ts）`, 2);
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

// —— 4. dev server ——
const url = `http://localhost:${PORT}/`;
const alive = async () => { try { const r = await fetch(url, { signal: AbortSignal.timeout(1500) }); return r.ok; } catch { return false; } };
const viteBin = join(wb, "node_modules", "vite", "bin", "vite.js");
const pidFile = join(wb, ".dev.pid");
const readPid = () => { try { const n = Number(readFileSync(pidFile, "utf8").trim()); return Number.isInteger(n) && n > 1 ? n : null; } catch { return null; } };
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
/** 进程身份核实：命令行必须是本工作台的 vite 且带同一端口——pid 会被系统复用，光"活着"不算 */
const isOurVite = (pid) => {
  if (process.platform === "win32") return false; // 无 ps；宁可不杀
  const r = spawnSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf8" });
  if (r.status !== 0) return false;
  const cmd = r.stdout.trim();
  return cmd.includes(viteBin) && cmd.includes(`--port ${PORT}`);
};

let managed = null; // 自家 server 的 pid（身份核实过）
{
  const pid = readPid();
  if (pid !== null) {
    if (!pidAlive(pid)) { unlinkSync(pidFile); log(`.dev.pid 里的进程 ${pid} 已不在，清理`); }
    else if (!isOurVite(pid)) { unlinkSync(pidFile); log(`.dev.pid 里的进程 ${pid} 不是本工作台的 vite（pid 可能被复用），忽略并清理`); }
    else managed = pid;
  }
}

if (relink) {
  // 重新链接：@proj 别名在 vite 配置加载时定死，只重启自家 server
  if (managed) {
    try { process.kill(managed); log(`重启 dev server（旧 pid ${managed}）`); } catch { /* 刚退出 */ }
    unlinkSync(pidFile);
    const t0 = Date.now();
    while ((await alive()) && Date.now() - t0 < 10_000) await sleep(300);
  }
  if (await alive()) {
    die(
      `端口 ${PORT} 上有一个不是本脚本启动的 dev server（如手动 npm run dev）。` +
        `@proj 别名在它启动时已定死，刷新不会加载新工程——请先停掉它再重跑，或加 --port <其他端口>。`,
    );
  }
}

if (await alive()) {
  log(`dev server 已在 ${url} 运行（索引已重新生成，浏览器刷新即可）`);
} else {
  const logFile = join(wb, ".dev.log");
  const fd = openSync(logFile, "a");
  const child = spawn(process.execPath, [viteBin, "--port", String(PORT), "--strictPort"], {
    cwd: wb, detached: true, stdio: ["ignore", fd, fd],
  });
  child.unref();
  writeFileSync(pidFile, String(child.pid));
  log(`启动 dev server（pid ${child.pid}，日志 ${logFile}）…`);
  const t0 = Date.now();
  while (!(await alive())) {
    if (Date.now() - t0 > 90_000) die(`dev server 90s 内没起来，看 ${logFile}`);
    if (!pidAlive(child.pid)) die(`dev server 启动即退出（端口 ${PORT} 被占？），看 ${logFile}`);
    await sleep(500);
  }
  log(`dev server 就绪：${url}`);
}

// —— 5. 打开浏览器（?import=project：存档不是这一版成片时按清单自动导入）——
const openUrl = url + (flag("no-import") ? "" : "?import=project");
if (!flag("no-open")) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [openUrl], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).unref();
}
console.log(`\n工作台：${openUrl}\n停止 dev server：kill $(cat ${pidFile})\n`);
