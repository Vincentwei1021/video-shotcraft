// Project public assets: links normally, tracked copies for Windows file EPERM.
import { createHash } from "node:crypto";
import {
  constants, copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  readlinkSync, rmdirSync, statSync, symlinkSync, unlinkSync, writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { linkDir } from "./link.mjs";

const inspect = p => {
  try { return lstatSync(p); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
};
const safeName = name => typeof name === "string" && name.length > 0
  && !name.startsWith(".") && !/[\\/:]/.test(name);
const fingerprint = p => {
  const st = inspect(p);
  if (!st?.isFile()) return null; // Never follow a replacement symlink.
  return {
    dev: st.dev, ino: st.ino, size: st.size, mtimeMs: st.mtimeMs,
    ctimeMs: st.ctimeMs, birthtimeMs: st.birthtimeMs,
    sha256: createHash("sha256").update(readFileSync(p)).digest("hex"),
  };
};
const unchanged = (p, saved) => {
  const current = fingerprint(p);
  return current && Object.keys(current).every(k => current[k] === saved[k]);
};

// Bookkeeping stays outside public/ so it is not served or exported. It records
// identity + content, not just names: a changed/replaced copy becomes user-owned.
export function syncProjectPublic(publicSrc, pub, manifest, log = () => {}) {
  mkdirSync(pub, { recursive: true });
  const manifestStat = inspect(manifest);
  if (manifestStat && !manifestStat.isFile()) throw new Error("Public copy manifest must be a regular file: " + manifest);
  const previous = manifestStat ? JSON.parse(readFileSync(manifest, "utf8")) : { version: 1, copies: [] };
  if (previous.version !== 1 || !Array.isArray(previous.copies)
      || previous.copies.some(c => !safeName(c?.name) || !c.fingerprint || typeof c.fingerprint !== "object")) {
    throw new Error("Invalid public copy manifest; refusing cleanup: " + manifest);
  }
  const removable = new Set(previous.copies
    .filter(c => unchanged(join(pub, c.name), c.fingerprint)).map(c => c.name));
  const names = inspect(publicSrc) ? readdirSync(publicSrc).filter(e => !e.startsWith(".")) : [];
  const fallbackTextures = join(pub, "textures");
  const live = join(fallbackTextures, "live");
  // Recognize only gen-index's exact, empty-after-cleanup texture fallback.
  const isFallbackTextures = inspect(fallbackTextures)?.isDirectory()
    && readdirSync(fallbackTextures).length === 1
    && inspect(live)?.isSymbolicLink()
    && resolve(fallbackTextures, readlinkSync(live)) === resolve(pub, "../../demos/_textures");

  // Fail before removing any previous assets when a real user file would collide.
  for (const name of names) {
    const dest = join(pub, name);
    const st = inspect(dest);
    if (st && !st.isSymbolicLink() && !removable.has(name)
        && !(name === "textures" && isFallbackTextures)) {
      throw new Error("Preserving existing public/" + name + "; move or rename this local file/directory before linking the project.");
    }
  }

  for (const name of removable) unlinkSync(join(pub, name));
  const copies = [];
  const save = () => writeFileSync(manifest, JSON.stringify({ version: 1, copies }, null, 2) + "\n");
  save(); // Forget missing/changed copies; never claim them again.
  for (const name of readdirSync(pub)) {
    const dest = join(pub, name);
    if (inspect(dest)?.isSymbolicLink()) unlinkSync(dest);
  }
  if (isFallbackTextures) { unlinkSync(live); rmdirSync(fallbackTextures); }

  let linked = 0;
  for (const name of names) {
    const from = join(publicSrc, name);
    const dest = join(pub, name);
    if (statSync(from).isDirectory()) linkDir(from, dest);
    else {
      try { symlinkSync(from, dest); }
      catch (error) {
        if (process.platform !== "win32" || error.code !== "EPERM") throw error;
        // Exclusive creation: even a collision after preflight cannot overwrite.
        copyFileSync(from, dest, constants.COPYFILE_EXCL);
        copies.push({ name, fingerprint: fingerprint(dest) });
        save(); // Keep ownership even if a later asset fails.
        log("已复制 public/" + name + "（Windows 文件符号链接不可用；源文件更新后请重新运行 open.mjs <工程目录>）");
      }
    }
    linked++;
  }
  return linked;
}
