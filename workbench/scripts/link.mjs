// 目录链接：Windows 用 junction（无需管理员 / 开发者模式），其他平台照旧符号链接。
import { existsSync, lstatSync, readFileSync, statSync, symlinkSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";

export const linkDir = (target, linkPath) =>
  symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : undefined);

// core.symlinks=false 时 git 把符号链接签出成写着目标路径的普通文件：换回目录链接
export const restoreGitSymlink = (linkPath) => {
  if (!lstatSync(linkPath).isFile()) return false;
  const target = readFileSync(linkPath, "utf8").trim();
  const abs = join(dirname(linkPath), target);
  if (!target || /[\r\n]/.test(target) || !existsSync(abs) || !statSync(abs).isDirectory()) return false;
  unlinkSync(linkPath);
  linkDir(target, linkPath);
  return true;
};
