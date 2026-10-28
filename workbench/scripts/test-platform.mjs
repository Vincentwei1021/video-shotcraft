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

test("failed asset copy ends the export response, cleans props and permits a retry", t => {
  const dir = fixture(t);
  const broken = path.join(dir, "public/broken.png");
  fs.symlinkSync(path.join(dir, "missing.png"), broken);
  let launches = 0;
  const mocks = {
    vite: { defineConfig: config => config },
    "@vitejs/plugin-react": () => ({}),
    "node:child_process": { spawn: () => {
      launches++;
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
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
  const request = () => {
    const req = Object.assign(new EventEmitter(), { method: "POST", url: "/" });
    const res = { ends: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; },
      end(body) { this.ends++; this.body = JSON.parse(body); } };
    middleware(req, res);
    req.emit("data", JSON.stringify({ project: { name: "Retry export" } }));
    req.emit("end");
    return res;
  };
  const failed = request();
  assert.equal(failed.ends, 1, "the failed POST must finish instead of hanging");
  assert.equal(failed.statusCode, 500);
  assert.equal(failed.headers["Content-Type"], "application/json");
  assert.match(failed.body.error, /素材同步失败/);
  assert.equal(launches, 0);
  assert.deepEqual(fs.readdirSync(path.join(dir, "exports")), []);

  fs.unlinkSync(broken);
  fs.writeFileSync(path.join(dir, "public/asset.txt"), "valid asset");
  const retry = request();
  assert.equal(retry.ends, 1);
  assert.equal(retry.statusCode, 200);
  assert.match(retry.body.id, /^[a-z0-9]+$/);
  assert.equal(launches, 1);
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
