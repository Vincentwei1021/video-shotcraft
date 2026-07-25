// capture-template.mjs — 把真实产品页面变成宣传片素材的三件套采集脚本模板
// 通用页面截图管线模板：BASE/输出目录/路由/选择器全部提升为 CONFIG
//
// 产出三件套（宣传片 3D 页面平面的全部素材来源）：
//   1. 每个路由的全页 2x 截图（deviceScaleFactor: 2，供 3D 场景贴图不糊）
//   2. per-element cutout（元素级 PNG，含 omitBackground 透明抠图，供"浮起的 UI 芯片"）
//   3. layout.json（每个元素在整页坐标系里的 bbox，供动画按真实版式定位）
//
// 用法：
//   node capture-template.mjs
//
// 前置条件（四条都是硬前提）：
//   1. 目标产品在本地跑起来（CONFIG.BASE 可访问）；
//   2. npm i puppeteer（本脚本唯一依赖）；
//   3. 【红线】假数据先注入 —— 截图前页面必须已填充"虚构但真实感"的演示数据。
//      空库/lorem ipsum 截出来的图直接废片；真实客户数据则不能出片。
//      先做数据注入（seed 脚本 / fixture 环境），确认页面肉眼可看后再跑本脚本。
//   4. 【两处静默废片】先填 CONFIG.FORCE_REVEAL 与 CONFIG.ASSERT_FONTS。
//      这两处的共同点是**不报错、只出错素材**：滚动显现的页面截出大面积空白，
//      webfont 没生效的页面截出 fallback 字体。两者都要等到成片才发现，代价最高。
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
  //
  // ⚠ 本脚本是被 copy 进各自项目用的，所以这两个相对路径的落点取决于你把它放在哪。
  //   落点必须解析到 **Remotion 项目** 的 public/，不能落进被采集站点的静态部署根
  //   （Cloudflare Pages/Workers、Vercel、Astro/Vite 的 public/ 都是部署根）——
  //   几十 MB 纹理会跟着下次发布推上生产 CDN。跑之前先 `node -e` 打一下 resolve 结果。
  OUT_DIR: '../../public/textures/live',
  LAYOUT_JSON: '../../src/live-layout.json',

  // 视口：1920x1080 @2x 是 3D 页面平面贴图的经验值
  VIEWPORT: { width: 1920, height: 1080, deviceScaleFactor: 2 },

  // 每页导航完成后的额外静置毫秒数（等字体/异步数据；见 settle()）
  SETTLE_MS: 600,

  // 强制滚动显现。现代营销页普遍用 IntersectionObserver 在滚动到视口时才显现内容
  // （`.reveal{opacity:0}` → 加 `.in`）。无头浏览器不滚动，这些元素永远不显现，
  // 截出来是大面积空白，而脚本一声不响。设为 null 关闭。
  // selector 按你页面的实际写法改；常见还有 [data-aos]、.animate-on-scroll、.fade-in。
  FORCE_REVEAL: {
    selector: '.reveal',
    shownClass: 'in',
  },

  // 字体生效断言。列出页面关键字体的**族名**（不是整个 font stack）。
  // 空数组跳过；填了就在每页 settle 后硬校验，不通过直接抛错——见 assertFonts()。
  ASSERT_FONTS: [], // 例：['Inter', 'Fraunces']

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

// 强制滚动显现：把 IntersectionObserver 才会加的 class 直接加上，并用 !important
// 覆盖初始态、暂停动画。必须在截图前做，且要在 settle 的等待之前——显现会触发
// 布局与字体使用，两者都需要时间落定。
const forceReveal = async () => {
  if (!CONFIG.FORCE_REVEAL) return 0;
  return page.evaluate(({ selector, shownClass }) => {
    const els = document.querySelectorAll(selector);
    els.forEach((el) => el.classList.add(shownClass));
    const style = document.createElement('style');
    style.textContent =
      `${selector}{opacity:1!important;transform:none!important;transition:none!important}` +
      '*{animation-play-state:paused!important}';
    document.head.appendChild(style);
    return els.length;
  }, CONFIG.FORCE_REVEAL);
};

// 字体生效断言。
//
// `document.fonts.ready` 只保证"当前没有待完成的字体加载"，**不保证字体文件被请求过**：
// <link> 只下载 CSS，字面要等页面上真有元素用到该 family 才发起请求。若此刻还没有元素
// 用它，ready 立刻 resolve，随后的测量与截图静默落到 fallback 字体上。
//
// 也不能用 `document.fonts.check()` 判断 —— 它答的是"能不能用这个 family"，不是
// "加载了没有 / 生效了没有"，两个方向都实测翻过车：
//   假阳性：只写了 <link> 谁都没用过时报 true（字体文件根本还没请求）；
//   假阴性：Google Fonts 的可变字体（如 `opsz 9..144` + `ital`）明明在渲染却报 false。
//
// 可靠做法是量宽度：把 family 单独用一次，和一个**必然不存在**的族名比。字体没解析时
// canvas 会退到默认字体，与不存在的族名测出同一宽度 → 宽度相等即未生效。
const assertFonts = async () => {
  if (!CONFIG.ASSERT_FONTS?.length) return;
  const failed = await page.evaluate(async (families) => {
    // 先强制用字，否则字体文件可能根本没被请求
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:64px';
    probe.textContent = 'AaBbGg0123';
    document.body.appendChild(probe);

    const bad = [];
    const c = document.createElement('canvas').getContext('2d');
    for (const family of families) {
      probe.style.fontFamily = `'${family}'`;
      try {
        await document.fonts.load(`64px '${family}'`);
      } catch {
        /* load 失败也走下面的宽度判定，不在这里下结论 */
      }
      c.font = `64px '${family}'`;
      const applied = c.measureText(probe.textContent).width;
      c.font = "64px '__definitely_no_such_font__'";
      const fallback = c.measureText(probe.textContent).width;
      if (Math.abs(applied - fallback) < 0.5) bad.push(family);
    }
    probe.remove();
    return bad;
  }, CONFIG.ASSERT_FONTS);

  if (failed.length) {
    throw new Error(
      `字体未生效：${failed.join(' / ')}\n` +
        '  素材会用 fallback 字体截出来，而且不会有任何报错。检查页面是否真的引入了该字体，\n' +
        '  以及 CONFIG.ASSERT_FONTS 里的族名拼写是否与 CSS 一致。',
    );
  }
};

// 等字体加载完再静置片刻——避免截到 FOUT/骨架屏
const settle = async () => {
  const revealed = await forceReveal();
  if (revealed) console.log(`  forceReveal: ${revealed} 个元素`);
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, CONFIG.SETTLE_MS));
  await assertFonts();
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
