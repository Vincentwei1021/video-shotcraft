import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const wb = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// Execute the actual CLI/plugin with the project's compiler. Only expensive
// rendering/process launches and Vite registration are stubbed; file operations
// use isolated real directories so cleanup and failed asset copies are exercised.
function compile(file, fixture) {
  const source = fs.readFileSync(path.join(wb, file), "utf8")
    .replace(/^#![^\n]*\n/, "")
    .replaceAll("import.meta.url", JSON.stringify(pathToFileURL(path.join(fixture, file)).href));
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
}

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shotcraft-platform-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "public"));
  fs.mkdirSync(path.join(dir, "proj"));
  fs.writeFileSync(path.join(dir, "proj/workbench.ts"), "export const WORKBENCH = {};");
  return dir;
}

function exportHarness(t) {
  const dir = fixture(t);
  const children = [];
  const mocks = {
    vite: { defineConfig: config => config },
    "@vitejs/plugin-react": () => ({}),
    "node:child_process": { spawn: () => {
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      children.push(child);
      return child;
    } },
  };
  const mod = { exports: {} };
  new Function("require", "module", "exports", compile("vite.config.ts", dir))(
    id => Object.hasOwn(mocks, id) ? mocks[id] : require(id), mod, mod.exports,
  );
  let middleware;
  const plugin = mod.exports.default.plugins.find(p => p.name === "wb-render-export");
  plugin.configureServer({ middlewares: { use: (route, handler) => {
    assert.equal(route, "/api/export");
    middleware = handler;
  } } });
  const request = (method = "POST", url = "/", raw = JSON.stringify({ project: { name: "Retry export" } })) => {
    const req = Object.assign(new EventEmitter(), { method, url });
    const res = { ends: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; },
      end(body) { this.ends++; this.body = JSON.parse(body); } };
    middleware(req, res);
    if (method === "POST") {
      req.emit("data", raw);
      req.emit("end");
    }
    return res;
  };
  const props = () => fs.existsSync(path.join(dir, "exports"))
    ? fs.readdirSync(path.join(dir, "exports")).filter(name => name.startsWith(".props-"))
    : [];
  return { dir, children, request, props };
}

test("failed asset copy ends the export response, cleans props and permits a retry", t => {
  const { dir, children, request } = exportHarness(t);
  const broken = path.join(dir, "public/broken.png");
  try {
    fs.symlinkSync(path.join(dir, "missing.png"), broken);
  } catch (error) {
    if (process.platform === "win32" && error.code === "EPERM") return t.skip("file symlinks need Developer Mode on Windows");
    throw error;
  }
  const failed = request();
  assert.equal(failed.ends, 1, "the failed POST must finish instead of hanging");
  assert.equal(failed.statusCode, 500);
  assert.equal(failed.headers["Content-Type"], "application/json");
  assert.equal(failed.body.error.code, "syncFailed");
  assert.match(failed.body.error.details, /ENOENT.*broken\.png/);
  assert.equal(children.length, 0);
  assert.deepEqual(fs.readdirSync(path.join(dir, "exports")), []);

  fs.unlinkSync(broken);
  fs.writeFileSync(path.join(dir, "public/asset.txt"), "valid asset");
  const retry = request();
  assert.equal(retry.ends, 1);
  assert.equal(retry.statusCode, 200);
  assert.match(retry.body.id, /^[a-z0-9]+$/);
  assert.equal(children.length, 1);
});

test("export rejects missing or malformed JSON and unknown jobs", t => {
  const { request, children, props } = exportHarness(t);
  for (const raw of ["", "{}", '{"project":']) {
    const response = request("POST", "/", raw);
    assert.equal(response.ends, 1);
    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, { error: { code: "invalidProject" } });
  }
  const missing = request("GET", "/unknown");
  assert.equal(missing.ends, 1);
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(missing.body, { error: { code: "notFound" } });
  assert.equal(children.length, 0);
  assert.deepEqual(props(), []);
});

test("a running render rejects another export without launching it", t => {
  const { request, children, props } = exportHarness(t);
  const started = request();
  assert.equal(started.statusCode, 200);
  assert.equal(props().length, 1);
  const conflict = request();
  assert.equal(conflict.ends, 1);
  assert.equal(conflict.statusCode, 409);
  assert.deepEqual(conflict.body, { error: { code: "alreadyRunning" } });
  assert.equal(children.length, 1);
  assert.equal(request("GET", `/${started.body.id}`).body.status, "running");
});

test("spawn error survives close, cleans props and permits a retry", t => {
  const { request, children, props } = exportHarness(t);
  const started = request();
  assert.equal(started.statusCode, 200);
  assert.equal(props().length, 1);
  const message = "spawn node ENOENT";
  children[0].emit("error", Object.assign(new Error(message), { code: "ENOENT" }));
  const failed = request("GET", `/${started.body.id}`);
  assert.equal(failed.statusCode, 200);
  assert.equal(failed.body.status, "error");
  assert.deepEqual(failed.body.error, { code: "spawnFailed", details: message });
  assert.equal(failed.body.lastLine, message);
  assert.deepEqual(props(), []);
  children[0].emit("close", -2);
  assert.deepEqual(request("GET", `/${started.body.id}`).body, failed.body);
  assert.deepEqual(props(), []);
  const retry = request();
  assert.equal(retry.statusCode, 200);
  assert.equal(children.length, 2);
  assert.equal(props().length, 1);
  children[1].emit("close", 0);
  assert.deepEqual(props(), []);
});

test("nonzero render exit keeps the informative Error line instead of later stack lines", t => {
  const { request, children, props } = exportHarness(t);
  const started = request();
  const diagnostic = "Error: Could not load missing.png";
  children[0].stdout.emit("data", Buffer.from("Rendered 2/10\n"));
  children[0].stderr.emit("data", Buffer.from(`\x1b[31m${diagnostic}\x1b[0m\n`));
  children[0].stderr.emit("data", Buffer.from("    at render (renderer.js:12:3)\n    at main (cli.js:7:2)\n"));
  children[0].emit("close", 1);
  const failed = request("GET", `/${started.body.id}`);
  assert.equal(failed.statusCode, 200);
  assert.equal(failed.body.status, "error");
  assert.equal(failed.body.progress, 0.2);
  assert.equal(failed.body.lastLine, diagnostic);
  assert.deepEqual(failed.body.error, { code: "renderFailed", details: diagnostic });
  assert.deepEqual(props(), []);
});

test("zero render exit completes progress without an error and cleans props", t => {
  const { request, children, props } = exportHarness(t);
  const started = request();
  children[0].stdout.emit("data", Buffer.from("Rendered 2/10\n"));
  children[0].emit("close", 0);
  const done = request("GET", `/${started.body.id}`);
  assert.equal(done.statusCode, 200);
  assert.equal(done.body.status, "done");
  assert.equal(done.body.progress, 1);
  assert.equal(Object.hasOwn(done.body, "error"), false);
  assert.deepEqual(props(), []);
});

for (const [platform, type] of [["win32", "junction"], ["darwin", undefined], ["linux", undefined]]) {
  test(`linkDir creates a ${type ?? "default"} link on ${platform}`, t => {
    const dir = fixture(t);
    const calls = [];
    const mod = { exports: {} };
    new Function("require", "module", "exports", "process", compile("scripts/link.mjs", dir))(
      id => id === "node:fs" ? { ...fs, symlinkSync: (...args) => calls.push(args) } : require(id), mod, mod.exports, { platform },
    );
    mod.exports.linkDir("../target", "link");
    assert.deepEqual(calls, [["../target", "link", type]]);
  });
}

test("a demosrc checked out as a plain file becomes a working directory link", async t => {
  const dir = fixture(t);
  fs.mkdirSync(path.join(dir, "demos/intro"), { recursive: true });
  fs.writeFileSync(path.join(dir, "demos/intro/Card.tsx"), "export {};");
  fs.mkdirSync(path.join(dir, "wb"));
  const demosrc = path.join(dir, "wb/demosrc");
  fs.writeFileSync(demosrc, "../demos");
  const { restoreGitSymlink } = await import(pathToFileURL(path.join(wb, "scripts/link.mjs")).href);
  assert.equal(restoreGitSymlink(demosrc), true);
  assert.ok(fs.lstatSync(demosrc).isSymbolicLink());
  assert.deepEqual(fs.readdirSync(path.join(demosrc, "intro")), ["Card.tsx"]);
  assert.equal(restoreGitSymlink(demosrc), false, "an existing link is left alone");
  fs.unlinkSync(demosrc);
  fs.writeFileSync(demosrc, "../missing");
  assert.equal(restoreGitSymlink(demosrc), false, "a file that does not name a directory is left alone");
  assert.ok(fs.lstatSync(demosrc).isFile());
});

for (const [platform, available] of [["win32", "python"], ["win32", "python3"], ["linux", "python"]]) {
  test(`parity reuses ${available} for every comparison on ${platform}`, async t => {
    const result = await runParity(t, platform, available);
    assert.equal(result.exitCode, 0);
    assert.equal(result.renders, 4);
    assert.equal(result.comparisons.length, 2);
    assert.ok(result.comparisons.every(call => call.command === available));
  });
}

test("parity exits before rendering if neither interpreter has Pillow", async t => {
  const result = await runParity(t, "win32", null);
  assert.equal(result.exitCode, 2);
  assert.equal(result.bundles, 0);
  assert.equal(result.renders, 0);
  assert.equal(result.comparisons.length, 0);
});

async function runParity(t, platform, available) {
  const dir = fixture(t);
  const result = { exitCode: 0, bundles: 0, renders: 0, comparisons: [] };
  class Exit extends Error { constructor(code) { super(); this.code = code; } }
  const mocks = {
    "@remotion/bundler": { bundle: async () => { result.bundles++; return "fixture"; } },
    "@remotion/renderer": {
      selectComposition: async ({ id }) => ({ id }),
      renderStill: async () => { result.renders++; },
    },
    "node:child_process": { spawnSync: (command, args) => {
      const probe = args[1] === "import PIL";
      if (!probe) result.comparisons.push({ command, args });
      if (command !== available) return { status: 1, stdout: "", stderr: "unavailable" };
      return { status: 0, stdout: probe ? "" : "0 100 0\n", stderr: "" };
    } },
  };
  const mod = { exports: {} };
  try {
    await new AsyncFunction("require", "module", "exports", "process", "console", compile("scripts/parity.mjs", dir))(
      id => Object.hasOwn(mocks, id) ? mocks[id] : require(id), mod, mod.exports,
      { platform, argv: ["node", "parity.mjs", "--frames", "1,2"], exit: code => { throw new Exit(code); } },
      { log() {}, error() {} },
    );
  } catch (error) {
    if (!(error instanceof Exit)) throw error;
    result.exitCode = error.code;
  }
  return result;
}
