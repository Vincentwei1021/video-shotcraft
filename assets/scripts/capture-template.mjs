// capture-template.mjs — raster fallback 三件套采集模板
// 仅在 references/html-material-gate.md 记录 A/B 门控失败证据后使用；
// baseline QA 截图不能因为现成可用就直接进入视频。
//
// 产出三件套（宣传片 3D 页面平面的全部素材来源）：
//   1. 每个路由的全页 2x 截图（deviceScaleFactor: 2，供 3D 场景贴图不糊）
//   2. per-element cutout（元素级 PNG，含 omitBackground 透明抠图，供"浮起的 UI 芯片"）
//   3. layout.json（每个元素在整页坐标系里的 bbox，供动画按真实版式定位）
//
// 用法：
//   node capture-template.mjs
//
// 前置条件（三条都是硬前提）：
//   1. 目标产品在本地跑起来（CONFIG.BASE 可访问）；
//   2. npm i puppeteer（本脚本唯一依赖）；
//   3. 【红线】假数据先注入 —— 截图前页面必须已填充"虚构但真实感"的演示数据。
//      空库/lorem ipsum 截出来的图直接废片；真实客户数据则不能出片。
//      先做数据注入（seed 脚本 / fixture 环境），确认页面肉眼可看后再跑本脚本。
//
// 改造指南：只改下面的 CONFIG。每个 page 条目 = 一个路由；
// boxes 只记坐标（进 layout.json），cutouts 记坐标 + 存元素 PNG。

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ======================================================================
// CONFIG — 按目标产品修改（下面的值是假想的 "acme-crm" 产品示例）
// ======================================================================
const CONFIG = {
  // 目标产品本地地址（先把产品跑起来）
  BASE: 'http://localhost:3000',

  // 截图与 layout.json 的输出目录（相对本脚本所在目录；通常指向
  // Remotion 项目的 public/textures/live，供 staticFile() 引用）
  OUT_DIR: '../../public/textures/live',
  LAYOUT_JSON: '../../src/live-layout.json',

  // 视口：1920x1080 @2x 是 3D 页面平面贴图的经验值
  VIEWPORT: { width: 1920, height: 1080, deviceScaleFactor: 2 },

  // 每页导航完成后的额外静置毫秒数（等字体/异步数据；见 settle()）
  SETTLE_MS: 600,

  // 路由清单：每条 = 一个要采集的页面
  PAGES: [
    {
      name: 'home',                 // layout.json 里的 key，也是全页截图文件名前缀
      path: '/',                    // 相对 BASE 的路由
      // waitMs: 1500,              // 可选：本页额外等待（如实时协作数据同步）
      // 只记坐标不出图的元素（进 layout.<name>.boxes.<key>）
      boxes: [
        // all: true → 记所有匹配元素的 bbox 数组；否则只记第一个
        { key: 'sections', selector: 'main h2', all: true },
      ],
      // 元素级截图（cutout PNG + bbox）。omitBackground: true 出透明底，
      // 用于要"浮"在页面平面上方、自带材质合成的 UI 芯片
      cutouts: [
        { name: 'nav', selector: 'header, [role="banner"]' },
        { name: 'card', selector: 'article', all: true, max: 12 },       // card1.png, card2.png…
        { name: 'float-search', selector: 'input', parent: true, omitBackground: true },
        { name: 'float-filter', selector: 'main button', omitBackground: true },
      ],
      // 可选：把某些元素设为 visibility:hidden 后再截一张全页图，
      // 作为"元素飞入"镜头的空底板（<name>-empty.png）
      hideForEmptyPlate: 'article',
    },
    {
      name: 'detail',
      // 详情页路由写死一条演示数据的 id（假想示例；换成你产品里
      // 注入的假数据实体 id）
      path: '/customers/demo-0001',
      boxes: [
        { key: 'rows', selector: 'table tbody tr, [role="row"]', all: true, max: 8 },
      ],
      cutouts: [],
      // 可选：截图前在页面里执行的交互（如点开某个 tab），
      // 返回后额外等 interactWaitMs 再补一张 <name>-after.png 全页图
      interact: () => {
        const tab = [...document.querySelectorAll('button, [role="tab"], a')]
          .find((e) => /订单/.test(e.textContent ?? ''));
        if (tab) { tab.click(); return true; }
        return false;
      },
      interactWaitMs: 800,
    },
    {
      name: 'reports',
      path: '/reports/weekly',
      waitMs: 1500, // 例：等编辑器/协作文档内容同步进来
      boxes: [
        { key: 'paras', selector: '.ProseMirror > p', all: true },
      ],
      cutouts: [],
    },
  ],
};
// ======================================================================
// 以下为通用采集逻辑，一般无需修改
// ======================================================================

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, CONFIG.OUT_DIR);
const layoutPath = path.resolve(here, CONFIG.LAYOUT_JSON);
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(layoutPath), { recursive: true });

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport(CONFIG.VIEWPORT);

// 等字体加载完再静置片刻——避免截到 FOUT/骨架屏
const settle = async () => {
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, CONFIG.SETTLE_MS));
};

// 元素 bbox 换算到整页坐标系（fullPage 截图的坐标系）
const pageBox = (el) =>
  el.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height };
  });

const layout = { pageW: CONFIG.VIEWPORT.width };

for (const pg of CONFIG.PAGES) {
  await page.goto(`${CONFIG.BASE}${pg.path}`, { waitUntil: 'networkidle0' });
  await settle();
  if (pg.waitMs) await new Promise((r) => setTimeout(r, pg.waitMs));

  const entry = { pageH: await page.evaluate(() => document.documentElement.scrollHeight) };
  layout[pg.name] = entry;

  // ---- 1. 全页 2x 截图 ----
  await page.screenshot({ path: `${outDir}/${pg.name}-full.png`, fullPage: true });
  console.log(`captured ${pg.name}-full`, entry.pageH);

  // ---- 2. boxes：只记坐标 ----
  entry.boxes = {};
  for (const b of pg.boxes ?? []) {
    const els = await page.$$(b.selector);
    const picked = b.all ? els.slice(0, b.max ?? els.length) : els.slice(0, 1);
    const boxes = [];
    for (const el of picked) boxes.push(await pageBox(el));
    entry.boxes[b.key] = b.all ? boxes : boxes[0] ?? null;
    console.log(`  boxes.${b.key}:`, boxes.length);
  }

  // ---- 3. cutouts：元素 PNG + bbox ----
  entry.cutouts = [];
  for (const c of pg.cutouts ?? []) {
    let els = await page.$$(c.selector);
    if (c.parent) {
      // 取匹配元素的父容器（如 input 的圆角外壳）
      const parents = [];
      for (const el of els) {
        const h = await el.evaluateHandle((e) => e.parentElement);
        const p = h.asElement();
        if (p) parents.push(p);
      }
      els = parents;
    }
    const picked = c.all ? els.slice(0, c.max ?? els.length) : els.slice(0, 1);
    for (let i = 0; i < picked.length; i++) {
      const file = c.all ? `${c.name}${i + 1}.png` : `${c.name}.png`;
      const bb = await pageBox(picked[i]);
      try {
        await picked[i].screenshot({
          path: `${outDir}/${file}`,
          omitBackground: !!c.omitBackground,
        });
      } catch (e) {
        console.log(`  cutout miss ${file}:`, e.message);
        continue;
      }
      entry.cutouts.push({ file, ...bb });
      console.log(`  captured ${file}`, bb);
    }
    if (picked.length === 0) console.log(`  cutout miss ${c.name} (no match: ${c.selector})`);
  }

  // ---- 4. 页内交互后的补充全页图（可选） ----
  if (pg.interact) {
    const did = await page.evaluate(pg.interact);
    if (did) {
      await new Promise((r) => setTimeout(r, pg.interactWaitMs ?? 800));
      await page.screenshot({ path: `${outDir}/${pg.name}-after.png`, fullPage: true });
      entry.afterPageH = await page.evaluate(() => document.documentElement.scrollHeight);
      console.log(`captured ${pg.name}-after`);
    }
  }

  // ---- 5. 空底板（可选）：隐藏元素后再截一张，供飞入镜头 ----
  if (pg.hideForEmptyPlate) {
    await page.evaluate((sel) => {
      document.querySelectorAll(sel).forEach((el) => { el.style.visibility = 'hidden'; });
    }, pg.hideForEmptyPlate);
    await page.screenshot({ path: `${outDir}/${pg.name}-empty.png`, fullPage: true });
    console.log(`captured ${pg.name}-empty`);
    // 复原，避免影响同页后续步骤（当前实现里本步骤已是该页最后一步）
    await page.evaluate((sel) => {
      document.querySelectorAll(sel).forEach((el) => { el.style.visibility = ''; });
    }, pg.hideForEmptyPlate);
  }
}

fs.writeFileSync(layoutPath, JSON.stringify(layout, null, 1));
console.log('wrote', layoutPath);
await browser.close();
