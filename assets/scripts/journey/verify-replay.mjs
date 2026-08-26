// verify-replay.mjs — 快照离线回放验收：每个 captures-html/*.html 断网加载并截图
// 产物 out/qa/replay/<slot>.png，与 out/qa/htmlmat/<slot>.png（采集时活页截图）对照。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const here = path.dirname(fileURLToPath(import.meta.url));
const work = path.resolve(here, '..');
const HTML_DIR = path.join(work, 'public', 'captures-html');
const OUT = path.join(work, 'out', 'qa', 'replay');
fs.mkdirSync(OUT, { recursive: true });

const only = process.argv[2];
const files = fs.readdirSync(HTML_DIR).filter((f) => f.endsWith('.html') && (!only || f === `${only}.html`));

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.setOfflineMode(true);

for (const f of files) {
  const slot = f.replace(/\.html$/, '');
  await page.goto(pathToFileURL(path.join(HTML_DIR, f)).href, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: path.join(OUT, `${slot}.png`) });
  console.log('replay ok:', slot);
}
await browser.close();
