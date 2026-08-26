// A route — freeze one rendered DOM subtree as an editable, script-free fragment.
// Copy into a work, edit CONFIG, then run: node capture-dom-fragment.mjs
// Dependency: puppeteer. The script reports unsupported content instead of hiding it.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const {default: puppeteer} = await import(process.env.SHOTCRAFT_PUPPETEER_MODULE ?? 'puppeteer');

const CONFIG = {
  URL: process.env.SHOTCRAFT_URL ?? 'http://localhost:3000/',
  NAME: process.env.SHOTCRAFT_NAME ?? 'hero-panel',
  SELECTOR: process.env.SHOTCRAFT_SELECTOR ?? '[data-shotcraft="hero-panel"]',
  OUT_DIR: process.env.SHOTCRAFT_OUT_DIR ?? '../../materials/hero-panel',
  VIEWPORT: {width: 1920, height: 1080, deviceScaleFactor: 1},
  SETTLE_MS: 800,
  // Reach the exact storyboard state here before SELECTOR is captured.
  prepare: async (_page) => {},
};

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, CONFIG.OUT_DIR);
const qaDir = path.join(outDir, 'qa');
fs.mkdirSync(qaDir, {recursive: true});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({headless: true});
const page = await browser.newPage();
await page.setViewport(CONFIG.VIEWPORT);
await page.goto(CONFIG.URL, {waitUntil: 'networkidle0', timeout: 120000});
await CONFIG.prepare(page);
await page.evaluate(() => document.fonts.ready).catch(() => {});
await wait(CONFIG.SETTLE_MS);

const target = await page.$(CONFIG.SELECTOR);
if (!target) throw new Error(`A-route target not found: ${CONFIG.SELECTOR}`);
await target.screenshot({path: path.join(qaDir, 'baseline.png')});

const fontFaces = await page.evaluate(() => {
  const faces = [];
  const blockedSheets = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      blockedSheets.push(sheet.href ?? '<inline>');
      continue;
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const style = rule.style;
      const urls = [...style.getPropertyValue('src').matchAll(/url\((['"]?)([^'")]+)\1\)/g)]
        .map((match) => {
          try { return new URL(match[2], sheet.href || location.href).href; } catch { return match[2]; }
        });
      faces.push({
        family: style.getPropertyValue('font-family'),
        weight: style.getPropertyValue('font-weight') || '400',
        fontStyle: style.getPropertyValue('font-style') || 'normal',
        unicodeRange: style.getPropertyValue('unicode-range'),
        display: style.getPropertyValue('font-display'),
        urls,
      });
    }
  }
  return {faces, blockedSheets};
});

const result = await page.evaluate(async (selector) => {
  const root = document.querySelector(selector);
  if (!root) throw new Error(`target disappeared: ${selector}`);

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:absolute;left:-100000px;top:0;width:800px;height:600px;border:0;';
  await new Promise((resolve) => {
    frame.onload = resolve;
    frame.srcdoc = '<!doctype html><html><body></body></html>';
    document.body.appendChild(frame);
  });
  const cleanDocument = frame.contentDocument;
  const cleanWindow = frame.contentWindow;
  const defaults = new Map();
  const defaultStyle = (tag) => {
    if (!defaults.has(tag)) {
      const element = cleanDocument.createElement(tag.includes(':') ? 'div' : tag);
      cleanDocument.body.appendChild(element);
      defaults.set(tag, cleanWindow.getComputedStyle(element));
    }
    return defaults.get(tag);
  };

  const escapeText = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapeAttribute = (value) => escapeText(value).replace(/"/g, '&quot;');
  const skip = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE']);
  const voidTags = new Set(['img', 'input', 'br', 'hr', 'source', 'track', 'area', 'base', 'embed', 'param', 'wbr']);
  const issues = [];
  const resourceUrls = new Set();
  const stats = {elements: 0, textLeaves: 0, images: 0, svg: 0};

  const nodeLabel = (element) => {
    const id = element.id ? `#${element.id}` : '';
    const classes = element.classList.length ? `.${[...element.classList].slice(0, 2).join('.')}` : '';
    return `${element.tagName.toLowerCase()}${id}${classes}`;
  };
  const collectUrls = (value) => {
    for (const match of value.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
      if (/^(data:|blob:|#)/i.test(match[2])) continue;
      try { resourceUrls.add(new URL(match[2], location.href).href); } catch {}
    }
  };
  const pseudoIssue = (element, pseudo) => {
    const style = getComputedStyle(element, pseudo);
    if (style.content && !['none', 'normal', '""', "''"].includes(style.content)) {
      issues.push({type: 'pseudo-element', node: nodeLabel(element), pseudo, content: style.content});
    }
  };

  const walk = (element) => {
    if (skip.has(element.tagName)) return '';
    const computed = getComputedStyle(element);
    if (computed.display === 'none' || computed.visibility === 'hidden') return '';
    stats.elements++;
    pseudoIssue(element, '::before');
    pseudoIssue(element, '::after');
    if (element.shadowRoot) issues.push({type: 'shadow-root', node: nodeLabel(element)});
    if (['CANVAS', 'VIDEO', 'IFRAME', 'OBJECT', 'EMBED'].includes(element.tagName)) {
      issues.push({type: 'non-dom-content', node: nodeLabel(element), tag: element.tagName.toLowerCase()});
    }

    const tag = element.tagName.toLowerCase();
    const isSvg = element.namespaceURI === 'http://www.w3.org/2000/svg';
    if (isSvg) stats.svg++;
    const base = defaultStyle(isSvg ? 'div' : tag);
    const isTextLeaf = element.childElementCount === 0 && (element.textContent ?? '').trim().length > 0;
    if (isTextLeaf) stats.textLeaves++;
    const skipTextSizes = new Set([
      'width', 'height', 'inline-size', 'block-size', 'min-width', 'min-height',
      'min-inline-size', 'min-block-size', 'perspective-origin', 'transform-origin',
    ]);
    let inlineStyle = '';
    for (let i = 0; i < computed.length; i++) {
      const property = computed.item(i);
      if (property.startsWith('--') || property.startsWith('animation') || property.startsWith('transition')) continue;
      if (property === 'cursor' || property.startsWith('-webkit-locale')) continue;
      if (isTextLeaf && skipTextSizes.has(property)) continue;
      const value = computed.getPropertyValue(property);
      if (value === base.getPropertyValue(property)) continue;
      collectUrls(value);
      inlineStyle += `${property}:${value};`;
    }
    for (const side of ['top', 'right', 'bottom', 'left']) {
      if (inlineStyle.includes(`border-${side}-style:`) && !inlineStyle.includes(`border-${side}-style:none`)) {
        inlineStyle += `border-${side}-width:${computed.getPropertyValue(`border-${side}-width`)};`;
      }
    }
    if (inlineStyle.includes('outline-style:') && !inlineStyle.includes('outline-style:none')) {
      inlineStyle += `outline-width:${computed.getPropertyValue('outline-width')};`;
    }
    const lineHeight = Number.parseFloat(computed.lineHeight) || Number.parseFloat(computed.fontSize) * 1.5;
    const rect = element.getBoundingClientRect();
    if (isTextLeaf && rect.height < lineHeight * 1.6 && computed.whiteSpace === 'normal') {
      inlineStyle += 'white-space:nowrap;';
    }

    const allowed = new Set(['id', 'class', 'role', 'alt', 'title', 'aria-label', 'aria-hidden', 'placeholder', 'type']);
    let attributes = '';
    for (const attribute of element.attributes) {
      if (attribute.name === 'style' || attribute.name.startsWith('on')) continue;
      if (!isSvg && !allowed.has(attribute.name)) continue;
      if (/^javascript:/i.test(attribute.value)) continue;
      attributes += ` ${attribute.name}="${escapeAttribute(attribute.value)}"`;
    }
    if (element instanceof HTMLInputElement) {
      if (element.type === 'password') {
        issues.push({type: 'sensitive-input', node: nodeLabel(element), inputType: 'password'});
        attributes += ' value=""';
      } else {
        attributes += ` value="${escapeAttribute(element.value)}"`;
      }
      if (element.checked) attributes += ' checked';
    }
    if (element instanceof HTMLTextAreaElement) {
      // Current value is emitted as text below instead of stale source markup.
    }
    if (element instanceof HTMLImageElement) {
      stats.images++;
      const src = element.currentSrc || element.src;
      if (src) {
        resourceUrls.add(src);
        attributes = attributes.replace(/\s+src=(?:"[^"]*"|'[^']*')/i, '');
        attributes += ` src="${escapeAttribute(src)}"`;
      }
    }

    let inner = '';
    if (element instanceof HTMLTextAreaElement) {
      inner = escapeText(element.value);
    } else {
      for (const child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) inner += escapeText(child.nodeValue ?? '');
        else if (child.nodeType === Node.ELEMENT_NODE) inner += walk(child);
      }
    }
    const open = `<${tag}${attributes} style="${escapeAttribute(inlineStyle)}">`;
    return voidTags.has(tag) ? open.slice(0, -1) + '/>' : `${open}${inner}</${tag}>`;
  };

  const rect = root.getBoundingClientRect();
  let ancestor = root.parentElement;
  let ambientBackground = 'transparent';
  while (ancestor) {
    const background = getComputedStyle(ancestor).backgroundColor;
    if (background && !['transparent', 'rgba(0, 0, 0, 0)'].includes(background)) {
      ambientBackground = background;
      break;
    }
    ancestor = ancestor.parentElement;
  }
  const html = walk(root);
  frame.remove();
  return {
    html,
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height),
    ambientBackground,
    resourceUrls: [...resourceUrls],
    issues,
    stats,
  };
}, CONFIG.SELECTOR);

const browserDataUrl = async (url) => page.evaluate(async (resourceUrl) => {
  const response = await fetch(resourceUrl, {credentials: 'include'});
  if (!response.ok) throw new Error(`${response.status} ${resourceUrl}`);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}, url);

const replacements = new Map();
for (const url of new Set(result.resourceUrls)) {
  try {
    replacements.set(url, await browserDataUrl(url));
  } catch (error) {
    result.issues.push({type: 'resource-fetch', url, message: error.message});
  }
}
let html = result.html;
for (const [url, replacement] of replacements) html = html.split(url).join(replacement);

const fontRules = [];
for (const face of fontFaces.faces) {
  let source = '';
  for (const url of face.urls) {
    try {
      source = await browserDataUrl(url);
      break;
    } catch {}
  }
  if (!source) {
    result.issues.push({type: 'font-fetch', family: face.family, urls: face.urls});
    continue;
  }
  fontRules.push(`@font-face{font-family:${face.family};src:url("${source}");font-weight:${face.weight};font-style:${face.fontStyle};${face.unicodeRange ? `unicode-range:${face.unicodeRange};` : ''}${face.display ? `font-display:${face.display};` : ''}}`);
}
if (fontFaces.blockedSheets.length) {
  result.issues.push({type: 'blocked-stylesheets', urls: fontFaces.blockedSheets});
}
const fontCss = fontRules.join('\n');

const fragment = {
  name: CONFIG.NAME,
  sourceUrl: CONFIG.URL,
  selector: CONFIG.SELECTOR,
  width: result.width,
  height: result.height,
  html,
  fontCss,
  ambientBackground: result.ambientBackground,
  stats: result.stats,
  issues: result.issues,
  route: 'A',
  htmlSafePrecheck: result.issues.length === 0 && !/https?:\/\//i.test(html),
};
fs.writeFileSync(path.join(outDir, 'fragment.json'), JSON.stringify(fragment, null, 2));

const preview = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none';img-src data:;font-src data:;style-src 'unsafe-inline' data:;script-src 'none';connect-src 'none'"><style>${fontCss}html,body{margin:0;width:${result.width}px;height:${result.height}px;overflow:hidden;background:${result.ambientBackground}}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}</style></head><body>${html}</body></html>`;
const previewPath = path.join(outDir, 'fragment.html');
fs.writeFileSync(previewPath, preview, 'utf8');

const offline = await browser.newPage();
await offline.setViewport({width: Math.max(1, result.width), height: Math.max(1, result.height), deviceScaleFactor: 1});
const externalRequests = [];
await offline.setRequestInterception(true);
offline.on('request', (request) => {
  if (/^https?:/i.test(request.url())) {
    externalRequests.push(request.url());
    request.abort();
  } else {
    request.continue();
  }
});
await offline.goto(pathToFileURL(previewPath).href, {waitUntil: 'load', timeout: 120000});
await offline.screenshot({path: path.join(qaDir, 'offline.png')});
await offline.screenshot({path: path.join(qaDir, 'offline-repeat.png')});
const offlineBox = await offline.evaluate(() => {
  const element = document.body.firstElementChild;
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {w: rect.width, h: rect.height};
});
const bboxMaxDriftCssPx = offlineBox
  ? Math.max(Math.abs(offlineBox.w - result.width), Math.abs(offlineBox.h - result.height))
  : Number.POSITIVE_INFINITY;
fs.writeFileSync(path.join(qaDir, 'fidelity.json'), JSON.stringify({
  externalRequests: [...new Set(externalRequests)],
  issues: result.issues,
  bboxMaxDriftCssPx,
  requiresFidelityMeasurement: true,
  expected: {ssimAtLeast: 0.98, bboxDriftCssPxAtMost: 1, deterministicPixelHash: true},
}, null, 2));

await browser.close();
console.log(`A fragment written: ${outDir}`);
console.log(`Next: node verify-html-material.mjs ${outDir}`);
