// browser-daemon.mjs — 常驻无头 Chrome（持久 userDataDir，跨脚本保持登录态）
// 启动后把 ws endpoint 写进 out/browser-ws.txt，保持进程存活。
// 用法：node scripts/browser-daemon.mjs   （建议 run_in_background）
// 各步骤脚本用 puppeteer.connect({ browserWSEndpoint }) 接管。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const here = path.dirname(fileURLToPath(import.meta.url));
const work = path.resolve(here, '..');
const userDataDir = path.join(work, 'out', 'chrome-profile');
fs.mkdirSync(userDataDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  userDataDir,
  defaultViewport: null,
  args: ['--window-size=1920,1200', '--lang=en-US'],
});
const ws = browser.wsEndpoint();
fs.writeFileSync(path.join(work, 'out', 'browser-ws.txt'), ws);
console.log('browser up:', ws);
// 保活；SIGTERM 时优雅关闭
process.on('SIGTERM', async () => { await browser.close(); process.exit(0); });
process.on('SIGINT', async () => { await browser.close(); process.exit(0); });
setInterval(() => {}, 1 << 30);
