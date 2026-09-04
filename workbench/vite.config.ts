import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// @proj = 外部成片工程源码（本机经 workbench/proj 符号链接接入，不进库；scripts/open.mjs 负责链接）。
// 未链接时自动落到 proj-stub 降级实现：工程可构建可运行，素材 tab 显示接入提示。
// @demos = 仓库 demos/（相对符号链接 demosrc，进库）——158 张镜头卡的 demo 源码直接当动效库。
// preserveSymlinks 让两者按虚拟路径解析，其 'react'/'remotion' 裸导入
// 落到本工程 node_modules（避免双实例）；src/proj.d.ts 让 tsc 不检查外部源码。
const root = fileURLToPath(new URL(".", import.meta.url));
// 工程链接了但没写 src/workbench.ts 清单时也回退到 stub（工作台只 import @proj/workbench 这一个模块）
const proj = existsSync(path.join(root, "proj", "workbench.ts")) ? "proj" : "proj-stub";

/** 导出成片：dev server 内起 Remotion CLI 渲染，
 *  前端 POST /api/export 提交工程 JSON，轮询 GET /api/export/:id 取进度。 */
type ExportJob = {
  status: "running" | "done" | "error";
  progress: number; // 0..1
  output: string; // 相对 workbench 的输出路径
  lastLine: string;
  logTail: string[];
};

const renderExportPlugin = (): Plugin => {
  const jobs = new Map<string, ExportJob>();
  const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

  return {
    name: "wb-render-export",
    configureServer(server) {
      // 每个任务结束（成功/失败/同步失败）都即时删除 props 文件；启动时清掉历史残留
      const exportsDir = path.join(root, "exports");
      if (existsSync(exportsDir)) {
        for (const f of readdirSync(exportsDir)) {
          if (/^\.props-[a-z0-9]+\.json$/.test(f)) rmSync(path.join(exportsDir, f), { force: true });
        }
      }
      server.middlewares.use("/api/export", (req, res) => {
        const send = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        const sub = (req.url ?? "/").split("?")[0];

        // POST /api/export —— 提交渲染
        if (req.method === "POST" && (sub === "/" || sub === "")) {
          if ([...jobs.values()].some((j) => j.status === "running")) {
            send(409, { error: "已有渲染在进行中" });
            return;
          }
          let raw = "";
          req.on("data", (c) => (raw += c));
          req.on("end", () => {
            let project: { name?: string };
            try {
              project = JSON.parse(raw).project;
              if (!project) throw new Error("no project");
            } catch {
              send(400, { error: "缺少工程 JSON" });
              return;
            }
            const id = Date.now().toString(36);
            const outDir = path.join(root, "exports");
            mkdirSync(outDir, { recursive: true });
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
            const safeName =
              (project.name ?? "工程").replace(/[^\w一-龥·-]+/g, "_").slice(0, 40) || "工程";
            const output = `exports/${safeName}-${stamp}.mp4`;
            const propsFile = path.join(outDir, `.props-${id}.json`);
            writeFileSync(propsFile, JSON.stringify({ project, renderExact: true }));
            const dropProps = () => rmSync(propsFile, { force: true });

            const job: ExportJob = {
              status: "running",
              progress: 0,
              output,
              lastLine: "同步素材…",
              logTail: [],
            };
            jobs.set(id, job);

            const onChunk = (buf: Buffer) => {
              const lines = stripAnsi(buf.toString()).split(/[\r\n]+/).filter((l) => l.trim());
              for (const line of lines) {
                job.lastLine = line.trim();
                job.logTail = [...job.logTail, line.trim()].slice(-40);
                // Remotion CLI 进度形如 "Rendered 123/5544"，取最后一处 a/b
                const m = [...line.matchAll(/(\d+)\/(\d+)/g)].pop();
                if (m && Number(m[2]) > 0) job.progress = Number(m[1]) / Number(m[2]);
              }
            };

            // Remotion 静态服务器默认拒绝服务符号链接（lstat 到 symlink 一律 404），
            // 而 public/ 下全是指向成片工程 / 仓库素材库的符号链接——渲染前先解引用同步成
            // 真实文件目录，再用 --public-dir 指过去。cardpreviews 仅 UI 用，排除。
            const renderPublic = path.join(root, ".render-public");
            const rsync = spawn(
              "rsync",
              ["-aL", "--delete", "--exclude=cardpreviews", "public/", `${renderPublic}/`],
              { cwd: root },
            );
            rsync.stderr.on("data", onChunk);
            rsync.on("close", (rc) => {
              if (rc !== 0) {
                dropProps();
                job.status = "error";
                job.lastLine = `素材同步失败（rsync 退出码 ${rc}）：${job.lastLine}`;
                return;
              }
              const bin = path.join(root, "node_modules", ".bin", "remotion");
              const child = spawn(
                bin,
                [
                  "render",
                  "src/remotion/index.ts",
                  "Main",
                  output,
                  `--props=${propsFile}`,
                  `--public-dir=${renderPublic}`,
                ],
                { cwd: root },
              );
              child.stdout.on("data", onChunk);
              child.stderr.on("data", onChunk);
              child.on("close", (code) => {
                dropProps(); // Remotion CLI 启动时已读完 props，成功失败都不再需要
                job.status = code === 0 ? "done" : "error";
                if (code === 0) job.progress = 1;
                else {
                  // 把最有信息量的错误行顶到 UI（否则 lastLine 常是堆栈尾行）
                  const err = job.logTail.find((l) => l.includes("Error"));
                  if (err) job.lastLine = err;
                }
              });
            });
            send(200, { id });
          });
          return;
        }

        // GET /api/export/:id —— 查进度
        const m = sub.match(/^\/([a-z0-9]+)(\/reveal)?$/);
        const job = m ? jobs.get(m[1]) : undefined;
        if (!job) {
          send(404, { error: "任务不存在" });
          return;
        }
        // POST /api/export/:id/reveal —— Finder 里显示成片
        if (req.method === "POST" && m![2]) {
          if (process.platform === "darwin") spawn("open", ["-R", path.join(root, job.output)]);
          send(200, { ok: true });
          return;
        }
        send(200, job);
      });
    },
  };
};

export default defineConfig({
  plugins: [react(), renderExportPlugin()],
  // 5198：与 video-talkcraft 的工作台（5199）错开，两边可同时开
  server: { port: 5198, strictPort: true },
  resolve: {
    preserveSymlinks: true,
    alias: { "@proj": path.join(root, proj), "@demos": path.join(root, "demosrc") },
  },
  // 外部工程 / demo 源码经符号链接进来，依赖预构建要认得它们的裸导入
  optimizeDeps: { include: ["react", "react-dom", "remotion", "@remotion/motion-blur"] },
});
