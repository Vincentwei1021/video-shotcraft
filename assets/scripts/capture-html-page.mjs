// B route — capture one stable browser state as a self-contained HTML bundle.
// Copy into a work, edit CONFIG, then run: node capture-html-page.mjs
// Dependency: puppeteer. baseline.png is QA truth and is NOT a default video asset.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const {default: puppeteer} = await import(process.env.SHOTCRAFT_PUPPETEER_MODULE ?? 'puppeteer');

const CONFIG = {
  URL: process.env.SHOTCRAFT_URL ?? 'http://localhost:3000/',
  NAME: process.env.SHOTCRAFT_NAME ?? 'home-ready',
  OUT_DIR: process.env.SHOTCRAFT_OUT_DIR ?? '../../materials/home-ready',
  VIEWPORT: {width: 1920, height: 1080, deviceScaleFactor: 1},
  SETTLE_MS: 800,
  COMPUTED_STYLES: [
    'display', 'position', 'z-index', 'overflow', 'opacity', 'transform',
    'background-color', 'color', 'font-family', 'font-size', 'font-weight',
    'line-height', 'letter-spacing', 'border-radius', 'box-shadow',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  ],
  // Reach the exact storyboard state here: click, type, scroll, inject fixtures.
  // Do not put secrets or customer data into the captured page.
  prepare: async (_page) => {},
};

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, CONFIG.OUT_DIR);
const rawDir = path.join(outDir, 'raw');
const qaDir = path.join(outDir, 'qa');
fs.mkdirSync(rawDir, {recursive: true});
fs.mkdirSync(qaDir, {recursive: true});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const settle = async (page) => {
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await wait(CONFIG.SETTLE_MS);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};

const unfoldHeaders = (head) => head.replace(/\r?\n[ \t]+/g, ' ');
const header = (head, name) => {
  const match = unfoldHeaders(head).match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() ?? '';
};
const decodeQuotedPrintable = (value) => {
  const flat = value.replace(/=\r?\n/g, '');
  const bytes = [];
  for (let i = 0; i < flat.length; i++) {
    if (flat[i] === '=' && /^[0-9a-f]{2}$/i.test(flat.slice(i + 1, i + 3))) {
      bytes.push(Number.parseInt(flat.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(flat.charCodeAt(i) & 0xff);
    }
  }
  return Buffer.from(bytes);
};
const dataUrl = ({mime, body}) => `data:${mime};base64,${body.toString('base64')}`;

const parseMhtml = (raw) => {
  const boundary = raw.match(/boundary=(?:"([^"]+)"|([^\s;]+))/i)?.slice(1).find(Boolean);
  if (!boundary) throw new Error('MHTML boundary not found');
  const parts = raw.split(`--${boundary}`).slice(1, -1);
  const resources = new Map();
  let root = null;

  for (const part of parts) {
    const separator = part.search(/\r?\n\r?\n/);
    if (separator < 0) continue;
    const delimiter = part.slice(separator).match(/^\r?\n\r?\n/)?.[0] ?? '\r\n\r\n';
    const head = part.slice(0, separator);
    const payload = part.slice(separator + delimiter.length).replace(/\r?\n$/, '');
    const mime = (header(head, 'Content-Type').split(';')[0] || 'application/octet-stream').trim();
    const encoding = header(head, 'Content-Transfer-Encoding').toLowerCase();
    const location = header(head, 'Content-Location');
    const contentId = header(head, 'Content-ID').replace(/^<|>$/g, '');
    const body = encoding === 'base64'
      ? Buffer.from(payload.replace(/\s+/g, ''), 'base64')
      : encoding === 'quoted-printable'
        ? decodeQuotedPrintable(payload)
        : Buffer.from(payload, 'latin1');
    const resource = {mime, body, location};
    if (!root && mime === 'text/html') root = resource;
    if (location) resources.set(location, resource);
    if (contentId) resources.set(`cid:${contentId}`, resource);
  }
  if (!root) throw new Error('MHTML root HTML not found');
  return {root, resources};
};

const sanitizeHtml = (html) => {
  let clean = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*(["'])?refresh\1?[^>]*>/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(action|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, 'about:blank#blocked-');
  const hardening = [
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob:; style-src \'unsafe-inline\' data:; font-src data:; media-src data: blob:; frame-src data:; connect-src \'none\'; script-src \'none\'; form-action \'none\'; base-uri \'none\'">',
    '<style>*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}video,audio{animation-play-state:paused!important}</style>',
  ].join('');
  clean = /<head\b[^>]*>/i.test(clean)
    ? clean.replace(/<head\b[^>]*>/i, (match) => `${match}${hardening}`)
    : `${hardening}${clean}`;
  return clean;
};

const mhtmlToHtml = (raw) => {
  const {root, resources} = parseMhtml(raw);
  const aliases = [...resources.keys()].sort((a, b) => b.length - a.length);

  // First make CSS resources self-contained, then their data URLs can be put in HTML.
  for (const [key, resource] of resources) {
    if (!/css/i.test(resource.mime)) continue;
    let css = resource.body.toString('utf8');
    css = css.replace(/url\((['"]?)([^'")]+)\1\)/gi, (full, _quote, ref) => {
      if (/^(data:|blob:|#)/i.test(ref)) return full;
      const absolute = (() => {
        try { return new URL(ref, resource.location || root.location).href; } catch { return ref; }
      })();
      const target = resources.get(ref) ?? resources.get(absolute);
      return target ? `url("${dataUrl(target)}")` : full;
    });
    resources.set(key, {...resource, body: Buffer.from(css, 'utf8')});
  }

  let html = root.body.toString('utf8');
  for (const alias of aliases) {
    const resource = resources.get(alias);
    if (!resource) continue;
    const replacement = dataUrl(resource);
    html = html.split(alias).join(replacement);
    html = html.split(alias.replaceAll('&', '&amp;')).join(replacement);
  }
  return sanitizeHtml(html);
};

const browser = await puppeteer.launch({headless: true});
const page = await browser.newPage();
await page.setViewport(CONFIG.VIEWPORT);
await page.goto(CONFIG.URL, {waitUntil: 'networkidle0', timeout: 120000});
await CONFIG.prepare(page);
await settle(page);

const dimensions = await page.evaluate(() => ({
  width: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0),
  height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0),
  title: document.title,
}));
await page.screenshot({path: path.join(qaDir, 'baseline.png'), fullPage: true});

const cdp = await page.createCDPSession();
const [{data: mhtml}, domSnapshot] = await Promise.all([
  cdp.send('Page.captureSnapshot', {format: 'mhtml'}),
  cdp.send('DOMSnapshot.captureSnapshot', {
    computedStyles: CONFIG.COMPUTED_STYLES,
    includePaintOrder: true,
    includeDOMRects: true,
  }),
]);
fs.writeFileSync(path.join(rawDir, 'state.mhtml'), mhtml, 'utf8');
fs.writeFileSync(path.join(rawDir, 'dom-snapshot.json'), JSON.stringify(domSnapshot));

const elements = await page.evaluate(() => {
  const selectorFor = (element) => {
    if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) {
      return `#${CSS.escape(element.id)}`;
    }
    const testId = element.getAttribute('data-testid');
    if (testId) return `[data-testid="${CSS.escape(testId)}"]`;
    const parts = [];
    let current = element;
    while (current && current !== document.documentElement && parts.length < 8) {
      let part = current.tagName.toLowerCase();
      if (current.classList.length) part += `.${[...current.classList].slice(0, 2).map((x) => CSS.escape(x)).join('.')}`;
      const siblings = current.parentElement ? [...current.parentElement.children].filter((x) => x.tagName === current.tagName) : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join(' > ');
  };
  return [...document.querySelectorAll('*')].flatMap((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (rect.width < 1 || rect.height < 1 || style.display === 'none' || style.visibility === 'hidden') return [];
    return [{
      selector: selectorFor(element),
      tag: element.tagName.toLowerCase(),
      text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 160),
      box: {x: rect.x + scrollX, y: rect.y + scrollY, w: rect.width, h: rect.height},
    }];
  }).slice(0, 5000);
});
fs.writeFileSync(path.join(outDir, 'elements.json'), JSON.stringify(elements, null, 2));

const stateHtml = mhtmlToHtml(mhtml);
const statePath = path.join(outDir, 'state.html');
fs.writeFileSync(statePath, stateHtml, 'utf8');

const offline = await browser.newPage();
await offline.setViewport(CONFIG.VIEWPORT);
const externalRequests = [];
const consoleErrors = [];
await offline.setRequestInterception(true);
offline.on('request', (request) => {
  if (/^https?:/i.test(request.url())) {
    externalRequests.push(request.url());
    request.abort();
  } else {
    request.continue();
  }
});
offline.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
await offline.goto(pathToFileURL(statePath).href, {waitUntil: 'load', timeout: 120000});
await settle(offline);
await offline.screenshot({path: path.join(qaDir, 'offline.png'), fullPage: true});
await offline.screenshot({path: path.join(qaDir, 'offline-repeat.png'), fullPage: true});
const offlineBoxes = await offline.evaluate((entries) => entries.map(({selector}) => {
  try {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {x: rect.x + scrollX, y: rect.y + scrollY, w: rect.width, h: rect.height};
  } catch {
    return null;
  }
}), elements.slice(0, 1000));
let bboxMaxDriftCssPx = 0;
let missingElementSelectors = 0;
for (let i = 0; i < offlineBoxes.length; i++) {
  const actual = offlineBoxes[i];
  if (!actual) {
    missingElementSelectors++;
    continue;
  }
  const expected = elements[i].box;
  for (const key of ['x', 'y', 'w', 'h']) {
    bboxMaxDriftCssPx = Math.max(bboxMaxDriftCssPx, Math.abs(actual[key] - expected[key]));
  }
}

const meta = {
  name: CONFIG.NAME,
  sourceUrl: CONFIG.URL,
  title: dimensions.title,
  viewport: CONFIG.VIEWPORT,
  page: {width: dimensions.width, height: dimensions.height},
  capturedAt: new Date().toISOString(),
  route: 'B',
};
const qa = {
  externalRequests: [...new Set(externalRequests)],
  consoleErrors: [...new Set(consoleErrors)],
  bboxMaxDriftCssPx,
  missingElementSelectors,
  requiresFidelityMeasurement: true,
  expected: {ssimAtLeast: 0.98, bboxDriftCssPxAtMost: 1, deterministicPixelHash: true},
  htmlSafePrecheck: externalRequests.length === 0,
};
fs.writeFileSync(path.join(outDir, 'capture-meta.json'), JSON.stringify(meta, null, 2));
fs.writeFileSync(path.join(qaDir, 'fidelity.json'), JSON.stringify(qa, null, 2));

await browser.close();
console.log(`B state bundle written: ${outDir}`);
console.log(`Next: node verify-html-material.mjs ${outDir}`);
