// journey.mjs — 全流程采集的步进驱动器。接管 browser-daemon 的常驻 Chrome，
// 每个子命令做一小步，便于逐步核对不熟悉的产品 UI。
//
// 子命令：
//   goto <url> [settleSec]        导航
//   text                          当前 URL + 页面文本摘要
//   shot <name>                   快速 QA 截图 → out/recon/<name>.png
//   click "<text>" [settleSec]    点击首个文本匹配的 button/a/[role=button]
//   clicksel "<css>" [settleSec]  点击选择器
//   type "<css>" "<text>"         聚焦并键入（触发 React onChange）
//   press <Key> [settleSec]       键盘按键（Enter 等）
//   upload "<css>" <file>         file input 上传
//   scroll <y>                    滚动到 y
//   eval "<js>"                   逃生舱：页面内执行 JS 并打印返回值
//   snap <slot>                   MHTML 快照 → public/captures-html/<slot>.html
//                                 + rect 元数据 meta/<slot>.json + QA png + 重生成 materials.gen.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { mhtmlToHtml } from './lib/mhtml.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const work = path.resolve(here, '..');
const OUT_HTML = path.join(work, 'public', 'captures-html');
const OUT_META = path.join(OUT_HTML, 'meta');
const OUT_QA = path.join(work, 'out', 'qa', 'htmlmat');
const OUT_RECON = path.join(work, 'out', 'recon');
for (const d of [OUT_HTML, OUT_META, OUT_QA, OUT_RECON]) fs.mkdirSync(d, { recursive: true });

const ws = fs.readFileSync(path.join(work, 'out', 'browser-ws.txt'), 'utf8').trim();
const browser = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null });

// 复用最后一个非空 tab；没有就开一个
const pages = await browser.pages();
let page = pages.filter((p) => !p.url().startsWith('devtools')).pop();
if (!page || page.url() === 'about:blank') {
  page = page || (await browser.newPage());
}
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const [cmd, a1, a2] = process.argv.slice(2);
const settle = Number(a2 ?? process.argv[4] ?? 2.5);

const pageText = async () => ({
  url: page.url(),
  text: await page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 700)),
});

if (cmd === 'goto') {
  await page.goto(a1, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await Promise.race([
    page.evaluate(() => document.fonts.ready).catch(() => {}),
    sleep(5),
  ]);
  await sleep(Number(a2 ?? 3));
  console.log(JSON.stringify(await pageText(), null, 2));
} else if (cmd === 'text') {
  console.log(JSON.stringify(await pageText(), null, 2));
} else if (cmd === 'shot') {
  const p = path.join(OUT_RECON, `${a1}.png`);
  await page.screenshot({ path: p });
  console.log('shot →', p);
} else if (cmd === 'click') {
  const clicked = await page.evaluate((needle) => {
    const els = [...document.querySelectorAll('button,a,[role=button],[role=menuitem],[role=tab],li,label,span,div')];
    const match = els.filter((el) => {
      const own = (el.innerText || '').trim().replace(/\s+/g, ' ');
      if (!own || own.length > 80) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      return own.toLowerCase().includes(needle.toLowerCase());
    });
    // 最内层的匹配（文本最短者）最可能是真按钮
    match.sort((x, y) => (x.innerText || '').length - (y.innerText || '').length);
    const el = match[0];
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { text: (el.innerText || '').trim().slice(0, 60), x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, a1);
  if (!clicked) { console.log('NO MATCH:', a1); process.exit(1); }
  await page.mouse.click(clicked.x, clicked.y);
  await sleep(settle);
  console.log('clicked:', JSON.stringify(clicked.text));
  console.log(JSON.stringify(await pageText(), null, 2));
} else if (cmd === 'clicksel') {
  await page.$eval(a1, (el) => { el.scrollIntoView({ block: 'center' }); });
  const box = await (await page.$(a1)).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(settle);
  console.log(JSON.stringify(await pageText(), null, 2));
} else if (cmd === 'type') {
  await page.click(a1);
  await page.type(a1, a2, { delay: 20 });
  await sleep(0.5);
  console.log('typed into', a1);
} else if (cmd === 'press') {
  await page.keyboard.press(a1);
  await sleep(settle);
  console.log(JSON.stringify(await pageText(), null, 2));
} else if (cmd === 'upload') {
  const input = await page.$(a1);
  if (!input) { console.log('NO INPUT:', a1); process.exit(1); }
  await input.uploadFile(path.resolve(work, a2));
  await sleep(2);
  console.log('uploaded:', a2);
  console.log(JSON.stringify(await pageText(), null, 2));
} else if (cmd === 'scroll') {
  await page.evaluate((y) => window.scrollTo(0, Number(y)), a1);
  await sleep(1);
  console.log('scrolled to', a1);
} else if (cmd === 'eval') {
  const v = await page.evaluate((code) => new Function(`return (${code})`)(), a1);
  console.log(JSON.stringify(v, null, 2)?.slice(0, 3000));
} else if (cmd === 'snap') {
  const slot = a1;
  // 快照前统一回到页顶，状态确定
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(0.8);
  // rect 采集：页面坐标系（含滚动偏移），供光标/zoom 编排瞄准
  const meta = await page.evaluate(() => {
    const els = [];
    const seen = new Set();
    for (const el of document.querySelectorAll('button,a,input,textarea,select,[role=button],[role=tab],[data-testid],h1,h2,h3,th,td:first-child,label')) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.width > 1900) continue;
      const text = (el.innerText || el.placeholder || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      const key = `${el.tagName}|${text}|${Math.round(r.x)}|${Math.round(r.y)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      els.push({
        tag: el.tagName.toLowerCase(),
        text,
        testid: el.getAttribute('data-testid') || undefined,
        x: Math.round(r.x + window.scrollX),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }
    return {
      url: location.href,
      pageW: Math.max(document.documentElement.scrollWidth, 1920),
      pageH: Math.max(document.documentElement.scrollHeight, 1080),
      els,
    };
  });
  const cdp = await page.createCDPSession();
  const { data: mhtml } = await cdp.send('Page.captureSnapshot', { format: 'mhtml' });
  const html = mhtmlToHtml(mhtml);
  fs.writeFileSync(path.join(OUT_HTML, `${slot}.html`), html);
  fs.writeFileSync(path.join(OUT_META, `${slot}.json`), JSON.stringify({ slot, ...meta }, null, 2));
  await page.screenshot({ path: path.join(OUT_QA, `${slot}.png`) });
  // 重生成 Remotion 侧素材元数据模块
  const metas = {};
  for (const f of fs.readdirSync(OUT_META).filter((f) => f.endsWith('.json')).sort()) {
    const m = JSON.parse(fs.readFileSync(path.join(OUT_META, f), 'utf8'));
    metas[m.slot] = { pageW: m.pageW, pageH: m.pageH, els: m.els };
  }
  const gen = `// materials.gen.ts — journey.mjs snap 自动生成，勿手改\n` +
    `export type MatEl = { tag: string; text: string; testid?: string; x: number; y: number; w: number; h: number };\n` +
    `export type MatMeta = { pageW: number; pageH: number; els: MatEl[] };\n` +
    `export const MATERIALS: Record<string, MatMeta> = ${JSON.stringify(metas, null, 2)};\n`;
  fs.mkdirSync(path.join(work, 'src', 'film'), { recursive: true });
  fs.writeFileSync(path.join(work, 'src', 'film', 'materials.gen.ts'), gen);
  console.log(`snap[${slot}] html=${(Buffer.byteLength(html) / 1048576).toFixed(2)}MB page=${meta.pageW}x${meta.pageH} els=${meta.els.length}`);
} else {
  console.log('unknown cmd');
  process.exit(1);
}

browser.disconnect();
