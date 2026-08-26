// lib/mhtml.mjs — MHTML → 单文件自包含 HTML（移植自 tsenta-promo-v2/scripts/capture-html-material.mjs，已验证）
// 子资源转 data URL、剥 script、禁动画、文本脱敏。

const decodeQP = (s) =>
  s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

// 脱敏：公开素材不得含任何邮箱明文。量词加上限，避免在长字符串上退化。
export const sanitizeText = (text) =>
  text.replace(/[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,128}\.[A-Za-z]{2,12}/g, 'youart.demo@example.com');

export const mhtmlToHtml = (raw) => {
  const boundaryMatch = raw.match(/boundary="([^"]+)"/);
  if (!boundaryMatch) throw new Error('no multipart boundary');
  const parts = raw.split('--' + boundaryMatch[1]).slice(1, -1);
  const resources = new Map();
  let rootHtml = null;
  for (const part of parts) {
    const sep = part.indexOf('\r\n\r\n');
    if (sep < 0) continue;
    const head = part.slice(0, sep);
    const body = part.slice(sep + 4);
    const mime = (head.match(/Content-Type:\s*([^\r\n;]+)/i) || [])[1]?.trim() || 'application/octet-stream';
    const enc = (head.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i) || [])[1]?.trim().toLowerCase() || '';
    const loc = (head.match(/Content-Location:\s*([^\r\n]+)/i) || [])[1]?.trim();
    let buf;
    if (enc === 'base64') buf = Buffer.from(body.replace(/\s+/g, ''), 'base64');
    else if (enc === 'quoted-printable') buf = Buffer.from(decodeQP(body), 'latin1');
    else buf = Buffer.from(body, 'latin1');
    if (mime === 'text/html' && rootHtml === null) { rootHtml = buf.toString('utf8'); continue; }
    if (loc) resources.set(loc, { mime, buf });
  }
  if (!rootHtml) throw new Error('no text/html root in mhtml');
  // 脱敏必须在资源内嵌之前做：内嵌后的 base64 字符几乎全落在邮箱正则的
  // 字符类里，无界量词会在兆级字符串上灾难性回溯（实测挂死）。
  rootHtml = sanitizeText(rootHtml);

  const toDataUrl = (r) => `data:${r.mime};base64,${r.buf.toString('base64')}`;
  const inlineCssUrls = (cssText, baseLoc) =>
    cssText.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, _q, ref) => {
      if (ref.startsWith('data:')) return m;
      let abs;
      try { abs = new URL(ref, baseLoc).href; } catch { return m; }
      const r = resources.get(abs);
      return r ? `url(${toDataUrl(r)})` : m;
    });
  for (let pass = 0; pass < 2; pass++) {
    for (const [loc, r] of resources) {
      if (!/css/.test(r.mime)) continue;
      const cssText = pass === 0 ? sanitizeText(r.buf.toString('utf8')) : r.buf.toString('utf8');
      resources.set(loc, { mime: 'text/css', buf: Buffer.from(inlineCssUrls(cssText, loc), 'utf8') });
    }
  }
  let html = rootHtml;
  for (const loc of [...resources.keys()].sort((a, b) => b.length - a.length)) {
    const dataUrl = toDataUrl(resources.get(loc));
    if (html.includes(loc)) html = html.split(loc).join(dataUrl);
    const escaped = loc.replace(/&/g, '&amp;');
    if (escaped !== loc && html.includes(escaped)) html = html.split(escaped).join(dataUrl);
  }
  // 确定性：剥 script、禁动画与光标；隐藏滚动条（成片里不能出现浏览器滚动条）
  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  html = html.replace(
    /<\/head>/i,
    '<style>*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important;}html{overflow:hidden !important;}::-webkit-scrollbar{display:none !important;}</style></head>'
  );
  return html;
};
